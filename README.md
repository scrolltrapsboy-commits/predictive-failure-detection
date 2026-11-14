# Project 18 — Predictive Failure Detection (combined Render deployment)

This repository combines the React dashboard and the FastAPI Mark 24 inference backend into **one Render Web Service**. The dashboard and API share the same origin, so you do not need a second frontend service or a manually configured API URL.

## Deploy to Render

1. Extract this ZIP and push the **contents** to a GitHub repository.
2. In Render, choose **New + → Blueprint** and connect that repository (or create a Web Service using its Dockerfile).
3. Render detects `Dockerfile`; the Docker build compiles the React app, installs the Python dependencies, and packages both trained model files.
4. Deploy. Open the Render service URL. The dashboard is served at `/`; API health is at `/health`; API documentation is at `/docs`.

No `VITE_API_BASE_URL` setting is required. The frontend calls `/api/...` on the same Render service. The `CORS_ORIGINS` setting is not needed for same-origin use; if you later host the frontend separately, replace it with the exact frontend origin(s).

## Local development

Backend:
```bash
python -m venv .venv
# activate the environment, then:
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend (in another terminal):
```bash
npm install
npm run dev
```
For a split local setup, create `.env.local` with `VITE_API_BASE_URL=http://localhost:8000`.

## Model files

Keep both files in `models/`:
- `mark24_isolation_forest_package.joblib`
- `mark24_random_forest_package.joblib`

The API loads these original trusted model packages at startup. Do not remove them from the repository/image.

## Important
- This is a synthetic-data university prototype. It does not connect to a physical CAN bus and is not validated for real vehicle diagnostics.
- Render's free instances may spin down when idle; the first request after sleep can take longer.
- The Docker image includes both model files, so allow the build and deployment to complete before opening the dashboard.
