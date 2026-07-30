# Planazo — DigitalOcean Deploy, Step by Step

Grounded in `DEPLOYMENT_HANDBOOK.md` and the actual production files already in the repo (`docker-compose.prod.yml`, `nginx/planazo.conf`, `app/core/config.py`). Domain assumed: `planazo.in`. Replace with your real domain/IP where noted.

Do these in order. Don't skip the "test before locking root" step — that's the one that saves you from a droplet rebuild.

---

## 0. Before you start

- Create the droplet in the DigitalOcean dashboard: Ubuntu 22.04 LTS, at least 2 GB RAM / 4 GB swap will be added below, add your SSH public key at creation time (don't use password auth).
- Point your domain's DNS: an `A` record for `planazo.in` and `www.planazo.in` → the droplet's IP. DNS propagation can take a few minutes to a few hours — do this now so it's ready by the time you need it (step 8).
- Have ready: Razorpay live keys, Resend API key, Google OAuth client ID/secret, a strong Postgres password. You'll paste these into `.env.production` in step 6.
- Your `main` branch is currently NOT what you want deployed yet — everything from this session's fixes lives on the `backend` branch. Merge `backend` → `main` on GitHub (PR review, then merge) before step 9, since the deploy script always does `git pull origin main`.

---

## 1. Root bootstrap (SSH in as root — one time only)

```bash
ssh root@YOUR_DROPLET_IP
```

Hostname + timezone:
```bash
hostnamectl set-hostname planazo-prod
grep -qxF "127.0.1.1 planazo-prod" /etc/hosts || echo "127.0.1.1 planazo-prod" >> /etc/hosts
timedatectl set-timezone Asia/Kolkata
```

Update + core packages:
```bash
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
apt-get install -y \
  ca-certificates curl gnupg lsb-release \
  ufw fail2ban unattended-upgrades \
  htop iotop ncdu git vim tmux jq unzip rsync \
  python3-pip dnsutils
```

Swap (cheap insurance on a low-RAM droplet):
```bash
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
```

Auto security updates:
```bash
dpkg-reconfigure -plow unattended-upgrades
```

Firewall — only SSH, HTTP, HTTPS:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose
```

fail2ban for SSH brute-force protection:
```bash
cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
maxretry = 4
bantime = 1h
findtime = 10m
EOF
systemctl enable --now fail2ban
```

---

## 2. Create the `planazo` deploy user (stop using root after this)

```bash
adduser --disabled-password --gecos "" planazo
usermod -aG sudo planazo
echo "planazo ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/planazo
chmod 440 /etc/sudoers.d/planazo

mkdir -p /home/planazo/.ssh
cp /root/.ssh/authorized_keys /home/planazo/.ssh/authorized_keys
chown -R planazo:planazo /home/planazo/.ssh
chmod 700 /home/planazo/.ssh
chmod 600 /home/planazo/.ssh/authorized_keys
```

**Test in a second terminal — do not close the root session yet:**
```bash
ssh planazo@YOUR_DROPLET_IP
sudo whoami     # should print "root"
exit
```

Only once that works, lock root SSH out:
```bash
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart ssh
```

From here on, **every command below is run as `planazo`**, not root.

```bash
ssh planazo@YOUR_DROPLET_IP
```

---

## 3. GitHub deploy key (so the droplet can clone the repo)

```bash
ssh-keygen -t ed25519 -C "planazo-droplet-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

On GitHub: your `planazo` repo → **Settings → Deploy keys → Add deploy key** → paste the public key → leave "Allow write access" **unchecked**.

Test it:
```bash
ssh -T git@github.com
```
You should see "You've successfully authenticated, but GitHub does not provide shell access."

---

## 4. Install Docker (official repo, not snap)

```bash
sudo snap remove --purge docker 2>/dev/null
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker planazo
```

Log out and back in for the group change to apply, then confirm:
```bash
exit
ssh planazo@YOUR_DROPLET_IP
docker ps    # should work without sudo
```

Cap container log growth:
```bash
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" }
}
EOF
sudo systemctl restart docker
```

---

## 5. Clone the repo

```bash
mkdir -p ~/apps
cd ~/apps
git clone git@github.com:sunil1206/planazo.git
cd planazo
git checkout main     # confirm this is the branch you merged backend → main into
```

---

## 6. Create `.env.production`

This repo's `.env.example` is stale (left over from the old Django backend) — don't copy it. `docker-compose.prod.yml` reads variables two ways: `${VAR}` substitution directly in the YAML (DB_NAME, DB_PASSWORD, GOOGLE_CLIENT_ID) comes from a file literally named `.env` in this directory, and each container's runtime settings come from `env_file: .env.production`. The deploy step handles this by copying one file to the other (`cp .env.production .env`), so put everything in `.env.production`:

```bash
nano .env.production
```

```bash
# ── Core ──────────────────────────────────────────────────────────────
DEBUG=False
ENVIRONMENT=production

# ── Database (must match what the postgres service uses) ─────────────
DB_NAME=planazo
DB_USER=planazo
DB_PASSWORD=REPLACE_WITH_A_STRONG_RANDOM_PASSWORD
DATABASE_URL=postgresql+asyncpg://planazo:REPLACE_WITH_A_STRONG_RANDOM_PASSWORD@postgres:5432/planazo

# ── Auth ──────────────────────────────────────────────────────────────
SECRET_KEY=REPLACE_run_openssl_rand_hex_32
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=30

# ── Google OAuth ──────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your-real-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-real-client-secret

# ── Redis / Celery ────────────────────────────────────────────────────
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# ── CORS / Frontend ───────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://planazo.in,https://www.planazo.in
FRONTEND_URL=https://planazo.in

# ── Media — IMPORTANT: default is /app/media, but the api/celery
# containers only have the media_files volume mounted at /workspace/media
# (see docker-compose.prod.yml). Leaving this at the default silently
# writes uploads to a non-persisted path that nginx can't see.
MEDIA_ROOT=/workspace/media
MEDIA_URL=/media/

# ── Email (Resend) ────────────────────────────────────────────────────
RESEND_API_KEY=re_your_real_key
EMAIL_FROM=no-reply@planazo.in

# ── Razorpay ──────────────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_real_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# ── Sentry (optional but recommended) ────────────────────────────────
SENTRY_DSN=

# ── Storage (leave local unless you've set up R2/S3) ─────────────────
STORAGE_BACKEND=local
```

Generate the secret key instead of guessing one:
```bash
openssl rand -hex 32
```

Lock the file down (it holds every production secret):
```bash
chmod 600 .env.production
```

---

## 7. First-time SSL certificate (before anything binds to :80/:443)

The production `nginx` container terminates SSL itself, reading certs mounted read-only from `/etc/letsencrypt` on the host — there's no host-level nginx here for certbot's `--nginx` plugin to edit. So certs have to be obtained *before* the compose stack claims ports 80/443:

```bash
sudo apt-get install -y certbot
sudo certbot certonly --standalone \
  -d planazo.in -d www.planazo.in \
  --email YOUR_EMAIL --agree-tos --no-eff-email
```

This only works if DNS for both records already resolves to this droplet (step 0) and nothing else is listening on port 80 yet. Confirm the certs landed:
```bash
sudo ls /etc/letsencrypt/live/planazo.in/
```

Set up renewal — since the docker `nginx` container will own port 80/443 going forward, certbot's own renewal needs to briefly free the port:
```bash
echo '#!/bin/bash
cd /home/planazo/apps/planazo
docker compose -f docker-compose.prod.yml stop nginx
certbot renew --standalone --quiet
docker compose -f docker-compose.prod.yml start nginx
' | sudo tee /etc/cron.monthly/certbot-renew > /dev/null
sudo chmod +x /etc/cron.monthly/certbot-renew
```

(Monthly is comfortably inside the 90-day cert lifetime; adjust to weekly via `/etc/cron.weekly/` if you'd rather not think about it.)

---

## 8. Bring up the stack

```bash
cd ~/apps/planazo
cp .env.production .env
docker compose -f docker-compose.prod.yml up -d --build
```

This builds and starts: `postgres`, `redis`, `api` (FastAPI, port 8000 internal), `celery` (worker), `fastapi` (legacy AI/image microservice, port 8001 internal), `frontend` (Vite build served by its own nginx, port 80 internal), and the outer `nginx` (SSL termination, the only thing bound to 80/443 on the host).

Watch it come up:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

The frontend build (`npm run build` inside `frontend/Dockerfile.prod`) couldn't be verified in the sandbox used to build these fixes (a native Vite/rolldown crash there, likely sandbox-specific) — this is the point where it actually gets tested for real. If `docker compose ... logs frontend` shows a build failure, that's the first thing to look at; everything else in this stack doesn't depend on it succeeding.

---

## 9. Run the database migration

`Base.metadata.create_all()` creates all tables on first boot automatically (see `app/main.py`'s lifespan hook) — but it only adds missing *tables*, never missing *columns* on tables that already exist. This matters here because `app/models/user.py` just gained a `token_version` column (for the refresh-token revocation fix), and Alembic migration `0002` is what adds it:

```bash
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head
```

On a genuinely fresh database this is a no-op safety net (the table doesn't exist yet, so `create_all()` already included the column) — but it's mandatory on any database that's ever been migrated before, and costs nothing to run every deploy. It's already wired into `.github/workflows/deploy.yml`'s auto-deploy step, so future `git push`-triggered deploys handle it automatically.

---

## 10. Verify

```bash
curl -I https://planazo.in                  # frontend, expect 200
curl https://planazo.in/health               # expect {"status":"ok",...}
curl -I https://planazo.in/api/docs          # should 404 in prod (docs disabled when DEBUG=False) — expected
docker compose -f docker-compose.prod.yml ps # all services "healthy" / "Up"
```

Register a test account through the real frontend, confirm login, logout, and refresh all work (this exercises the new `token_version` revocation path end-to-end).

---

## 11. GitHub Actions auto-deploy (so future `git push` to `main` deploys itself)

`.github/workflows/deploy.yml` SSHes in and runs `git pull origin main && ... up -d --build && alembic upgrade head` automatically on every push to `main`. It needs three repo secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `EC2_HOST` | the droplet's IP (name is legacy — infra is DigitalOcean, not AWS) |
| `EC2_USER` | `planazo` — **not** `root`; the script runs no `sudo`, so it needs to already be in the `docker` group |
| `EC2_SSH_KEY` | the **private** key matching a public key in `planazo`'s `~/.ssh/authorized_keys` — generate a dedicated one (`ssh-keygen -t ed25519 -f ~/.ssh/gh_actions_deploy -N ""` on your machine, append the `.pub` to the droplet's `authorized_keys`, paste the private key into this secret) |

Once those are set, merging to `main` deploys automatically — the CI job also now runs the full `pytest` suite first and blocks the deploy if anything fails.

---

## Quick reference for later

```bash
# Logs
docker compose -f docker-compose.prod.yml logs -f <service>

# Restart one service after an env change
docker compose -f docker-compose.prod.yml up -d --force-recreate <service>

# Manual redeploy (mirrors what CI does)
cd ~/apps/planazo
git pull origin main
cp .env.production .env
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

# Postgres shell
docker exec -it $(docker compose -f docker-compose.prod.yml ps -q postgres) psql -U planazo

# Disk cleanup
docker system prune -af --volumes   # careful — wipes stopped containers/unused volumes
```
