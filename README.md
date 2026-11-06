# DeepVerify — Deepfake Face Verification Platform

A full-stack web platform for the capstone hybrid deepfake detector. Upload a face
image and get a **verdict**, a **confidence score**, and a **Grad-CAM explanation**,
with user accounts and per-user scan history.

## Architecture

```
┌──────────────────────────┐      HTTP/JSON      ┌──────────────────────────┐
│  Next.js frontend (:3000) │  ───────────────▶   │  FastAPI backend (:8000) │
│  • auth (signup/login)    │   image ─▶          │  • hybrid model          │
│  • detector dashboard     │   ◀── verdict +     │    (ConvNeXt + CLIP)      │
│  • scan history + stats   │       Grad-CAM      │  • Grad-CAM               │
│  • SQLite (node:sqlite)   │                     │  • /predict, /health     │
└──────────────────────────┘                     └──────────────────────────┘
```

- **Backend** (`backend/`): Python + FastAPI, serves the trained hybrid model
  (ConvNeXt-Tiny + frozen CLIP ViT-L/14 + fusion head) and computes Grad-CAM.
- **Frontend** (`frontend/`): Next.js (App Router, TypeScript, Tailwind). Handles
  authentication, the dashboard, and scan history. Auth is a signed-JWT cookie
  (jose) with bcrypt password hashing; data is stored in SQLite via Node's built-in
  `node:sqlite` (file `frontend/data.db`).

## Prerequisites

- Python 3.12 with PyTorch (CUDA recommended), timm, transformers — see
  `backend/requirements.txt`. (CLIP ViT-L/14 downloads from HuggingFace on first run.)
- Node.js 20+ (developed on Node 26) and npm.
- The exported model weights in `backend/export/`: `convnext_tiny.pt`,
  `hybrid_head.pt`, `model_config.json`.

## Running (two terminals)

**1. Backend (model server):**
```bash
python -m uvicorn main:app --app-dir backend --port 8000
```
Wait for `Model ready.` (loads CLIP on startup).

**2. Frontend:**
```bash
cd frontend
npm install        # first time only
npm run dev
```
Open http://localhost:3000 — sign up, then analyze images.

## Environment variables (`frontend/.env.local`)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL of the FastAPI backend | `http://localhost:8000` |
| `AUTH_SECRET` | Secret for signing session JWTs (set a strong value) | dev fallback |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Production build

```bash
cd frontend
npm run build && npm run start
```

## Deployment notes

- **Frontend** deploys to any Node host (e.g. Vercel). For a multi-instance or
  serverless host, migrate the SQLite store to a managed database (the data layer is
  isolated in `src/lib/db.ts`, so only that file changes).
- **Backend** needs a host with enough RAM/disk for CLIP ViT-L/14 (~1.7 GB); a GPU
  gives sub-second inference, CPU is several seconds per image. Set the frontend's
  `NEXT_PUBLIC_API_URL` to the deployed backend URL and update the backend CORS
  origins in `backend/main.py`.

## Notes / limitations

The model is trained on the 140k Real/Fake Faces dataset (real FFHQ-style photos vs.
StyleGAN fakes) and is most reliable on that distribution; it may not generalise to
other generators (diffusion, face-swap). Verdicts are advisory and are always paired
with a confidence score and a Grad-CAM explanation.
