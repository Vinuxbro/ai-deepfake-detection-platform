"""FastAPI model server for the deepfake verification dashboard.

Endpoints:
  GET  /health         -> {status, device, model_loaded}
  POST /predict        -> multipart image -> {verdict, confidence, probs, gradcam_png(base64)}

Run:
    cd C:/CapstoneWebApp/backend
    python -m uvicorn main:app --reload --port 8000
The Next.js frontend calls http://localhost:8000.
"""
import base64
import io
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image

from model import HybridDetector, DEVICE

EXPORT_DIR = Path(__file__).resolve().parent / "export"

app = FastAPI(title="Deepfake Verification API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"], allow_headers=["*"],
)

detector = None


@app.on_event("startup")
def load_model():
    global detector
    if (EXPORT_DIR / "model_config.json").exists():
        print(f"Loading hybrid detector on {DEVICE} ...")
        detector = HybridDetector(EXPORT_DIR)
        print("Model ready.")
    else:
        print(f"[warn] No export files in {EXPORT_DIR} yet. "
              "Drop convnext_tiny.pt, hybrid_head.pt, model_config.json there and restart.")


@app.get("/")
def index():
    """Simple built-in test page (served same-origin, so no CORS needed)."""
    return FileResponse(Path(__file__).resolve().parent / "test.html")


@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE, "model_loaded": detector is not None}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if detector is None:
        raise HTTPException(503, "Model not loaded — add export files and restart the server.")
    try:
        img = Image.open(io.BytesIO(await file.read()))
    except Exception:
        raise HTTPException(400, "Invalid image file.")

    out = detector.predict(img)

    # encode the Grad-CAM overlay as a base64 PNG for the browser
    buf = io.BytesIO()
    Image.fromarray(out["gradcam"]).save(buf, format="PNG")
    gradcam_b64 = base64.b64encode(buf.getvalue()).decode()

    return {
        "verdict": out["verdict"],
        "confidence": out["confidence"],
        "probs": out["probs"],
        "gradcam_png": f"data:image/png;base64,{gradcam_b64}",
    }
