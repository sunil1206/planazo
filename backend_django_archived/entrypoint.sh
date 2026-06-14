#!/bin/sh
set -e

# ── Wait for postgres ─────────────────────────────────────────────────────────
echo "==> Waiting for postgres..."
until python -c "
import os, sys
import psycopg2
try:
    psycopg2.connect(
        host=os.environ.get('DB_HOST', 'postgres'),
        port=os.environ.get('DB_PORT', '5432'),
        dbname=os.environ.get('DB_NAME', 'snapshare'),
        user=os.environ.get('DB_USER', 'snapshare'),
        password=os.environ.get('DB_PASSWORD', 'snapshare123'),
    )
    print('postgres is ready')
except psycopg2.OperationalError as e:
    print(f'postgres not ready: {e}')
    sys.exit(1)
"; do
  echo "   ...retrying in 2s"
  sleep 2
done

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Resolving any migration conflicts (safe no-op if none)..."
python manage.py makemigrations --merge --no-input 2>/dev/null || true

echo "==> Running migrations..."
python manage.py migrate --noinput

echo "==> Creating test users (skips if already exist)..."
python manage.py create_test_users || true

echo "==> Starting gunicorn..."
exec gunicorn core.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
