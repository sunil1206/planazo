import os, uuid, shutil
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from PIL import Image as PILImage, ExifTags
import io

router = APIRouter()

MEDIA_ROOT  = os.environ.get("MEDIA_ROOT", "/app/media")
ALLOWED     = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_MB = 15


def strip_exif(img: PILImage.Image) -> PILImage.Image:
    """Remove EXIF data from image (privacy)."""
    data = list(img.getdata())
    clean = PILImage.new(img.mode, img.size)
    clean.putdata(data)
    return clean


def save_local(content: bytes, subpath: str, filename: str) -> str:
    """Save bytes to MEDIA_ROOT/subpath/filename. Returns relative path."""
    dest_dir = os.path.join(MEDIA_ROOT, subpath)
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, filename)
    with open(dest, "wb") as f:
        f.write(content)
    return os.path.join(subpath, filename)


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image → save to local MEDIA_ROOT → return relative path.
    Thumbnails generated async by Celery (triggered from Django task).
    """
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Only JPEG, PNG, WebP allowed.")

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File too large. Max {MAX_SIZE_MB}MB.")

    # Open + strip EXIF
    img = PILImage.open(io.BytesIO(content))
    img = strip_exif(img)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    filename  = f"{uuid.uuid4().hex}.jpg"
    buf       = io.BytesIO()
    img.save(buf, "JPEG", quality=87, optimize=True)
    relative  = save_local(buf.getvalue(), "gallery/originals", filename)

    return JSONResponse({
        "path":     relative,
        "filename": filename,
        "url":      f"/media/{relative}",
    })


@router.post("/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """Remove background using rembg. Returns PNG with transparent BG."""
    try:
        from rembg import remove as rembg_remove
    except ImportError:
        raise HTTPException(500, "rembg not installed.")

    content    = await file.read()
    result_png = rembg_remove(content)
    filename   = f"nobg_{uuid.uuid4().hex}.png"
    relative   = save_local(result_png, "processed/bg_removed", filename)

    return JSONResponse({
        "path": relative,
        "url":  f"/media/{relative}",
    })


@router.post("/watermark")
async def add_watermark(file: UploadFile = File(...)):
    """
    Overlay a watermark logo on the image.
    Logo should be at MEDIA_ROOT/watermark/logo.png
    """
    content      = await file.read()
    img          = PILImage.open(io.BytesIO(content)).convert("RGBA")
    logo_path    = os.path.join(MEDIA_ROOT, "watermark", "logo.png")

    if os.path.exists(logo_path):
        logo = PILImage.open(logo_path).convert("RGBA")
        # Scale logo to 20% of image width
        ratio      = img.width * 0.20 / logo.width
        new_size   = (int(logo.width * ratio), int(logo.height * ratio))
        logo       = logo.resize(new_size, PILImage.LANCZOS)
        # Position: bottom-right with padding
        pos        = (img.width - logo.width - 20, img.height - logo.height - 20)
        overlay    = PILImage.new("RGBA", img.size, (0, 0, 0, 0))
        overlay.paste(logo, pos, logo)
        # Blend at 40% opacity
        img = PILImage.alpha_composite(img, overlay)

    img    = img.convert("RGB")
    buf    = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    filename = f"wm_{uuid.uuid4().hex}.jpg"
    relative = save_local(buf.getvalue(), "processed/watermarked", filename)

    return JSONResponse({"path": relative, "url": f"/media/{relative}"})
