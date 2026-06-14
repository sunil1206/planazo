#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  deploy.sh — Pull latest code and restart production containers
#  Run this on the server: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

COMPOSE="docker compose -f docker-compose.prod.yml"

echo ""
echo "▶  Pulling latest code from production branch..."
git pull origin production

echo ""
echo "▶  Building and restarting containers..."
$COMPOSE up -d --build

echo ""
echo "▶  Running database migrations..."
$COMPOSE exec -T django python manage.py migrate --noinput

echo ""
echo "▶  Collecting static files..."
$COMPOSE exec -T django python manage.py collectstatic --noinput

echo ""
echo "▶  Container status:"
$COMPOSE ps

echo ""
echo "✅  Deployment complete → https://linuslearning.in"
