# Build the React dashboard, then serve it from the Python FastAPI service.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py simulator.py feature_engineering.py model_loader.py ./
COPY models ./models
COPY --from=frontend-build /app/dist ./dist
EXPOSE 10000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
