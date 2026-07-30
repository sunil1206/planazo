FROM python:3.12-slim

# System deps for psycopg2, opencv, insightface
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc g++ libgl1 libglib2.0-0 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# NOTE: build context for this Dockerfile must be the REPO ROOT, not app/ —
# app/routers/storage.py, gallery_v2.py, and photographer.py all import the
# top-level `services/` package (services/storage.py), which lives as a
# sibling of app/, not inside it. A context of ./app can never see it, which
# is why the image used to crash-loop with "ModuleNotFoundError: No module
# named 'services'" even though it worked fine on a laptop (the dev compose
# file papers over this with a `./services:/workspace/services` volume mount
# that only exists at runtime, not at build time).
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app /workspace/app
COPY services /workspace/services

ENV PYTHONPATH=/workspace
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
