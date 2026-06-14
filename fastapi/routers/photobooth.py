import os, uuid, json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Header, HTTPException
from fastapi.responses import JSONResponse

router  = APIRouter()
# Active WebSocket connections: {session_token: [ws, ...]}
_connections: dict = {}


@router.websocket("/connect/{session_token}")
async def photobooth_ws(websocket: WebSocket, session_token: str):
    """
    Photobooth device connects here via WebSocket.
    Sends photos as binary frames.
    """
    await websocket.accept()
    _connections.setdefault(session_token, []).append(websocket)
    try:
        while True:
            data = await websocket.receive_bytes()
            # Save photo and broadcast to all connected clients for this session
            filename = f"{uuid.uuid4().hex}.jpg"
            media    = os.environ.get("MEDIA_ROOT", "/app/media")
            dest_dir = os.path.join(media, "photobooth", session_token)
            os.makedirs(dest_dir, exist_ok=True)
            with open(os.path.join(dest_dir, filename), "wb") as f:
                f.write(data)

            url = f"/media/photobooth/{session_token}/{filename}"
            msg = json.dumps({"event": "new_photo", "url": url})

            # Notify all viewers on this session
            for ws in list(_connections.get(session_token, [])):
                try:
                    await ws.send_text(msg)
                except Exception:
                    pass

    except WebSocketDisconnect:
        _connections.get(session_token, []).remove(websocket)


@router.post("/upload/{session_token}")
async def photobooth_http_upload(
    session_token: str,
    file: UploadFile = File(...),
    x_api_key: str = Header(default=""),
):
    """
    HTTP fallback upload for photobooths that can't use WebSocket.
    """
    # TODO: verify x_api_key against PhotoboothDevice.api_key in DB
    content  = await file.read()
    filename = f"{uuid.uuid4().hex}.jpg"
    media    = os.environ.get("MEDIA_ROOT", "/app/media")
    dest_dir = os.path.join(media, "photobooth", session_token)
    os.makedirs(dest_dir, exist_ok=True)

    with open(os.path.join(dest_dir, filename), "wb") as f:
        f.write(content)

    url = f"/media/photobooth/{session_token}/{filename}"
    return JSONResponse({"url": url, "filename": filename})
