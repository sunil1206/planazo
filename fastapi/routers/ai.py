"""
AI face-recognition endpoints.
Uses InsightFace (buffalo_l model) for 512-dim embeddings and cosine matching.
Falls back gracefully when the model is not yet downloaded or InsightFace is
not installed, returning a 503 instead of a 500 so callers can retry later.
"""
import os
import io
import json
import logging
import numpy as np
from functools import lru_cache
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ── InsightFace singleton ─────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_face_app():
    """
    Load InsightFace FaceAnalysis once and cache it.
    Raises ImportError when insightface/onnxruntime not installed.
    Raises RuntimeError when the model weights aren't downloaded yet.
    """
    try:
        import insightface
        import cv2  # noqa: F401 — verify opencv available
    except ImportError as e:
        raise ImportError(f"InsightFace or OpenCV not installed: {e}") from e

    app = insightface.app.FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"],
    )
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def _load_image_array(content: bytes):
    """Decode image bytes → numpy BGR array (OpenCV format)."""
    import cv2
    nparr = np.frombuffer(content, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image. Ensure it is a valid JPEG/PNG/WEBP.")
    return img


def cosine_sim(a, b) -> float:
    a, b = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(a) * np.linalg.norm(b) + 1e-8
    return float(np.dot(a, b) / denom)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/face-embed")
async def extract_face_embedding(file: UploadFile = File(...)):
    """
    Extract a 512-dim face embedding from an uploaded image.
    Returns { embedding: [...], face_count: N }
    Used by gallery image processing pipeline.
    """
    # Validate content-type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image.")

    try:
        face_app = get_face_app()
    except ImportError as e:
        raise HTTPException(503, f"Face recognition unavailable: {e}. "
                                 "Contact admin to install insightface.")
    except Exception as e:
        raise HTTPException(503, f"Face recognition model not ready: {e}. "
                                 "Model may still be downloading — retry in 60s.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 20 MB).")

    try:
        img = _load_image_array(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    faces = face_app.get(img)
    if not faces:
        raise HTTPException(400, "No face detected in the image. "
                                 "Please use a clear, well-lit photo.")

    embedding = faces[0].embedding.tolist()
    return JSONResponse({
        "embedding":   embedding,
        "face_count":  len(faces),
        "model":       "buffalo_l",
        "dims":        len(embedding),
    })


@router.post("/selfie-match")
async def selfie_match(
    file: UploadFile = File(...),
    website_slug: str = Query(default="", description="Wedding website slug"),
):
    """
    Upload a guest selfie → returns matched gallery image IDs.

    Workflow:
      1. Extract selfie embedding with InsightFace.
      2. Query the Django Postgres DB for all gallery images belonging to the
         given wedding website that already have a face_embedding stored.
      3. Compute cosine similarity and return IDs above the 0.40 threshold.

    Falls back to the Django / Celery async flow if this endpoint fails —
    the frontend polls `/api/gallery/selfie/{id}/` for status.
    """
    if not website_slug:
        raise HTTPException(400, "website_slug is required.")

    try:
        face_app = get_face_app()
    except ImportError as e:
        raise HTTPException(503, f"Face recognition unavailable: {e}.")
    except Exception as e:
        raise HTTPException(503, f"Face recognition model not ready: {e}. Retry in 60s.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 20 MB).")

    try:
        img = _load_image_array(content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    faces = face_app.get(img)
    if not faces:
        raise HTTPException(400, "No face detected in selfie. "
                                 "Please use a clear front-facing photo in good lighting.")

    selfie_emb = faces[0].embedding

    # ── Query DB for gallery embeddings ──────────────────────────────────────
    try:
        import psycopg2

        conn = psycopg2.connect(
            dbname=os.environ.get("DB_NAME",     "snapshare"),
            user=os.environ.get("DB_USER",       "snapshare"),
            password=os.environ.get("DB_PASSWORD","snapshare123"),
            host=os.environ.get("DB_HOST",       "postgres"),
            port=os.environ.get("DB_PORT",       "5432"),
        )
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT gi.id, gi.face_embedding, gi.picture
                FROM   gallery_images gi
                JOIN   couple_websites cw ON gi.website_id = cw.id
                WHERE  cw.slug = %s
                  AND  gi.face_embedding IS NOT NULL
            """, (website_slug,))
            rows = cur.fetchall()
        finally:
            conn.close()
    except Exception as e:
        logger.error("DB connection failed in selfie-match: %s", e)
        raise HTTPException(503, f"Database unavailable: {e}")

    THRESHOLD = 0.40
    matched = []
    for image_id, emb_json, picture in rows:
        if emb_json is None:
            continue
        emb = emb_json if isinstance(emb_json, list) else json.loads(emb_json)
        sim = cosine_sim(selfie_emb, emb)
        if sim >= THRESHOLD:
            matched.append({
                "id":         image_id,
                "similarity": round(sim, 3),
                "picture":    picture,
            })

    matched.sort(key=lambda x: x["similarity"], reverse=True)
    return JSONResponse({
        "matched":       matched,
        "count":         len(matched),
        "threshold":     THRESHOLD,
        "website_slug":  website_slug,
    })


@router.get("/health")
async def ai_health():
    """Quick check — is InsightFace loaded and ready?"""
    try:
        get_face_app()
        return JSONResponse({"status": "ok", "model": "buffalo_l", "ready": True})
    except ImportError as e:
        return JSONResponse({"status": "error", "ready": False,
                             "detail": str(e)}, status_code=503)
    except Exception as e:
        return JSONResponse({"status": "loading", "ready": False,
                             "detail": str(e)}, status_code=503)
