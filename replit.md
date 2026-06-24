# X-Ray AI Lung Diagnosis Assistant

A deep CNN-powered web app that analyzes chest X-ray images to detect lung conditions — healthy, pneumonia, tuberculosis, or COVID — with confidence scores and clinical explanations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the Node.js API server (port 5000)
- `bash /home/runner/workspace/python-backend/start.sh` — run the Python ML backend (port 8090)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (for Node.js API; not needed by ML backend)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifacts/xray-frontend)
- ML Backend: Python FastAPI + TensorFlow/Keras (python-backend/)
- Node.js API: Express 5 (artifacts/api-server) — not used by main app
- DB: PostgreSQL + Drizzle ORM (not currently used)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/xray-frontend/` — React Vite frontend at `/`
- `python-backend/app.py` — FastAPI ML inference server at `/ml-api`
- `python-backend/start.sh` — startup script for Python backend
- `project_bundle/` — ML model files (keras model, sample images, class names)
- `project_bundle/sample_images/` — 45 sample X-rays across 4 classes

## Architecture decisions

- Python FastAPI backend at `/ml-api` path serves the TensorFlow model — kept separate from the Node.js API server since ML inference requires Python
- Frontend uses raw `fetch` to call `/ml-api/*` (no codegen needed, Python backend is not in OpenAPI spec)
- Model input shape is 128×128 RGB (verified from loaded Keras model)
- 4 output classes: healthy, pneumonia, tuberculosis, covid
- Sample images are served directly from the bundle, fetched and displayed in a filterable gallery

## Product

- Drag-and-drop or click-to-upload chest X-ray analysis
- Filterable sample gallery (45 real X-rays across 4 classes)
- Results panel: diagnosis badge, confidence percentage, animated probability bars, clinical description, recommendation
- About page: model performance stats, class explanations, architecture info

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Python backend must use `/home/runner/workspace/.pythonlibs/bin/python3` — standard `python3` / `pip3` not on PATH
- Model image size is 128×128 (NOT 150×150 as stated in the requirements.txt comments)
- The `bash python-backend/start.sh` workflow command must use absolute path (`bash /home/runner/workspace/python-backend/start.sh`) since workflow CWD may differ
- pip install requires `--break-system-packages` flag on this Nix environment

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
