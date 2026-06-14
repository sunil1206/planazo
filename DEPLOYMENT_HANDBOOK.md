# Multi-Site Production Deployment Handbook
## A Real-World Engineering Case Study

**Project:** Planazo (wedding-tech SaaS) on DigitalOcean
**Stack:** Django + DRF · FastAPI · Celery · Next.js 16 · PostgreSQL · Redis · Traefik
**Audience:** Junior developers, interns, DevOps learners, future maintainers
**Author:** Engineering Team
**Version:** 1.0
**Last updated:** May 2026

---

## Table of Contents

1. [How to Read This Handbook](#1-how-to-read-this-handbook)
2. [Architecture Overview](#2-architecture-overview)
3. [Initial Server Inspection](#3-initial-server-inspection)
4. [Server Bootstrap (Root Phase)](#4-server-bootstrap-root-phase)
5. [Deploy User & SSH Hardening](#5-deploy-user--ssh-hardening)
6. [GitHub SSH Deploy Keys](#6-github-ssh-deploy-keys)
7. [Docker & Docker Compose Setup](#7-docker--docker-compose-setup)
8. [Multi-Project Deployment Strategy](#8-multi-project-deployment-strategy)
9. [Reverse Proxy: Traefik (with NGINX Comparison)](#9-reverse-proxy-traefik-with-nginx-comparison)
10. [SSL with Let's Encrypt](#10-ssl-with-lets-encrypt)
11. [Real Problems We Faced (Troubleshooting Case Studies)](#11-real-problems-we-faced)
12. [Security Best Practices](#12-security-best-practices)
13. [Production Maintenance Guide](#13-production-maintenance-guide)
14. [Appendix A: Full Configuration Files](#14-appendix-a-full-configuration-files)
15. [Appendix B: Troubleshooting Cheat Sheet](#15-appendix-b-troubleshooting-cheat-sheet)
16. [Appendix C: Command Reference](#16-appendix-c-command-reference)
17. [Appendix D: Deployment Checklist](#17-appendix-d-deployment-checklist)
18. [Appendix E: Maintenance Checklist](#18-appendix-e-maintenance-checklist)

---

## 1. How to Read This Handbook

Every section follows the same shape:

- **Concept** — what the topic is and why it matters
- **Architecture diagrams** — ASCII visuals where helpful
- **Commands** — exact bash with line-by-line explanation
- **Real story** — what actually happened in our deployment
- **Key Takeaways** — bullet points to remember
- **Common Mistakes** — pitfalls observed in the wild
- **Interview Questions** — typical questions you'll be asked
- **Real World Relevance** — why this matters in industry

If you're new to DevOps, read top-to-bottom. If you're maintaining a live system, jump to [Section 11 (Troubleshooting)](#11-real-problems-we-faced) and [Section 13 (Maintenance)](#13-production-maintenance-guide).

---

## 2. Architecture Overview

### 2.1 The Big Picture

The Planazo platform is a multi-service application running on a single DigitalOcean droplet. Multiple subdomains share one server and one IP address. A reverse proxy decides which container receives each incoming request.

```
                                    INTERNET
                                       │
                                       ▼
                          ┌──────────────────────────┐
                          │  DNS (Namecheap → DO)    │
                          │  planazo.in     → 139.x  │
                          │  www.planazo.in → 139.x  │
                          │  api.planazo.in → 139.x  │
                          │  ai.planazo.in  → 139.x  │
                          └──────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────┐
│  DigitalOcean Droplet  (139.59.94.133)                       │
│  Ubuntu 24.04 LTS · 2 vCPU · 2 GB RAM · 50 GB SSD · BLR1     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  ufw firewall: allow 22, 80, 443 only                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Traefik (reverse proxy)        :80, :443              │  │
│  │  - Auto-discovers Docker labels via socket-proxy       │  │
│  │  - Issues Let's Encrypt certs via TLS-ALPN challenge   │  │
│  │  - Routes Host() rules to internal containers          │  │
│  └────────────────────────────────────────────────────────┘  │
│            │            │              │           │         │
│            ▼            ▼              ▼           ▼         │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Next.js    │ │  Django     │ │ FastAPI  │ │  Celery  │   │
│  │  frontend   │ │  +Gunicorn  │ │ +Uvicorn │ │  worker  │   │
│  │  :3000      │ │  :8000      │ │ :8001    │ │  (no HTTP)│  │
│  └─────────────┘ └─────────────┘ └──────────┘ └──────────┘   │
│                          │              │           │        │
│                          ▼              ▼           ▼        │
│              ┌──────────────────────────────────────────┐    │
│              │  Docker network: traefik_proxy           │    │
│              │  (all containers can talk by name)       │    │
│              └──────────────────────────────────────────┘    │
│                          │                          │        │
│                          ▼                          ▼        │
│              ┌──────────────────┐        ┌──────────────────┐│
│              │  postgres        │        │  redis           ││
│              │  :5432 (internal)│        │  :6379 (internal)││
│              │  Volume: pgdata  │        │  Volume: redisdata│
│              └──────────────────┘        └──────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Why Multiple Sites On One Droplet?

Two patterns exist for hosting multiple web apps:

**Pattern A — One droplet per app.** Each project gets its own server. Clean isolation, expensive, easy to manage individually.

**Pattern B — Multiple apps per droplet behind a reverse proxy.** Shared resources, cheaper, more complex. This is what we did.

The reverse proxy is the key. Without it, you'd have port conflicts (only one process can bind `:443`), no way to issue separate SSL certs per domain, and no way for `planazo.in` and `goscan.in` to coexist on the same IP.

### 2.3 The Reverse Proxy Pattern

```
Public traffic                    Internal containers
─────────────                     ───────────────────
:443 ── Host:planazo.in    ──►  frontend:3000
:443 ── Host:api.planazo.in ──► django:8000
:443 ── Host:ai.planazo.in  ──► fastapi:8001
:443 ── Host:goscan.in      ──► goscan-frontend:3000   (future site 2)
```

Traefik listens on the only public ports (80 and 443). It inspects the HTTP `Host:` header (or TLS SNI on HTTPS) and forwards the request to the correct internal container.

### 2.4 Request Lifecycle

A user types `https://planazo.in/invite/sarah-and-john` in their browser. Here's what happens:

```
 ┌─────────────────────────────────────────────────────────────────┐
 │ 1. BROWSER                                                      │
 │    - Resolves planazo.in via DNS → 139.59.94.133                │
 │    - Opens TCP connection to 139.59.94.133:443                  │
 │    - Performs TLS handshake (offers SNI = planazo.in)           │
 └────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ 2. UBUNTU KERNEL / UFW FIREWALL                                 │
 │    - Checks: is destination port 443 allowed? Yes (ufw rule)    │
 │    - Forwards to Docker's published port                        │
 └────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ 3. DOCKER PORT MAPPING                                          │
 │    - Maps host :443 → traefik container :443                    │
 └────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ 4. TRAEFIK                                                      │
 │    - Reads SNI: planazo.in                                      │
 │    - Looks up routers: finds Host(`planazo.in`) → frontend:3000 │
 │    - Terminates TLS (presents Let's Encrypt cert)               │
 │    - Forwards plain HTTP to frontend container on port 3000     │
 └────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │ 5. NEXT.JS FRONTEND CONTAINER                                   │
 │    - Receives GET /invite/sarah-and-john                        │
 │    - Renders the page (server-side)                             │
 │    - May call api.planazo.in/api/invitations/sarah-and-john     │
 │      → triggers a sibling request through Traefik to Django     │
 │    - Returns HTML + assets                                      │
 └────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
                       Back to the user
```

### 2.5 Why This Architecture

- **Single IP, multiple domains** — saves cost
- **Centralised SSL management** — Traefik handles all certs
- **Container isolation** — each service has its own filesystem, process tree, network namespace
- **Easy horizontal addition** — to add a new site, add a new compose file with new labels; Traefik auto-discovers
- **Production-grade** — same pattern as Vercel, Netlify, and most container platforms

### Key Takeaways

- The reverse proxy is the entry point. It owns 80/443 and nothing else does.
- Containers communicate over a private Docker network using **service names**, not IPs.
- DNS is the world's pointer; the reverse proxy is the building's directory.

### Common Mistakes

- Publishing container ports directly (`-p 3000:3000`) bypasses Traefik and creates conflicts.
- Forgetting to add containers to the shared `traefik_proxy` network — labels are useless without the network.
- Letting application servers handle TLS — terminate SSL at the proxy, run apps on plain HTTP internally.

### Interview Questions

- *"How would you host two web apps on one server?"* — Reverse proxy + Docker networks + Host-based routing.
- *"What's the difference between a forward proxy and a reverse proxy?"* — Forward proxies sit in front of clients; reverse proxies sit in front of servers.
- *"Explain how SNI works."* — TLS extension that lets the server choose which cert to present based on the requested hostname.

### Real World Relevance

This is the same architecture used by Heroku's routing layer, AWS ALB target groups, Kubernetes Ingress controllers, and Cloudflare's edge. Once you understand reverse proxying with Traefik or NGINX, the cloud abstractions feel familiar.

---

## 3. Initial Server Inspection

Before deploying anything new, inspect what's already there. Skipping this step is how junior engineers accidentally bring down production.

### 3.1 Checking Open Ports

```bash
sudo ss -tulpn
```

**Explanation:**

| Token | Meaning |
|---|---|
| `ss` | "socket statistics" — modern replacement for `netstat` |
| `-t` | show TCP sockets |
| `-u` | show UDP sockets |
| `-l` | only listening sockets (servers waiting for connections) |
| `-p` | show the process owning each socket |
| `-n` | numeric output (skip DNS resolution — faster) |

**Why we ran it:** We wanted to know what was already listening on 80, 443, and other common ports. If a previous deployment had an NGINX running on 80, our new Traefik container couldn't bind to it.

Expected output on a fresh droplet:

```
Netid State   Local Address:Port   Process
tcp   LISTEN  0.0.0.0:22           sshd
tcp   LISTEN  0.0.0.0:80           docker-proxy  (Traefik via Docker)
tcp   LISTEN  0.0.0.0:443          docker-proxy  (Traefik via Docker)
```

If anything else is listed, ask questions before deploying.

### 3.2 Checking System Resources

```bash
free -h
df -h /
uptime
nproc
```

**Explanation:**

- `free -h` — RAM usage; `-h` makes it human-readable (1.7Gi vs 1782656).
- `df -h /` — disk usage on root partition.
- `uptime` — load average and how long the system has been running.
- `nproc` — number of logical CPU cores.

**Why we ran it:** We had a 2 GB droplet with limited room. Knowing how much RAM and disk was free helped us budget memory across containers.

### 3.3 Checking Running Containers

```bash
docker ps
docker ps -a
docker network ls
docker volume ls
```

| Command | Purpose |
|---|---|
| `docker ps` | running containers only |
| `docker ps -a` | including stopped/exited ones |
| `docker network ls` | all Docker networks |
| `docker volume ls` | all named volumes (persistent storage) |

**Why we ran it:** Before deploying our shared infra (Traefik, Postgres, Redis), we needed to know what was already there. Stopped containers with leftover names would conflict (`name "postgres" is already in use`).

### 3.4 Checking Docker Daemon

```bash
docker version
docker info
sudo systemctl status docker --no-pager | head -15
```

**Why we ran it:** Our first big bug was a Docker API version mismatch between Traefik and a snap-installed Docker. `docker version` showed `API version: 1.24` instead of 1.40+ — instantly confirmed the snap issue.

### 3.5 Checking the Firewall

```bash
sudo ufw status verbose
```

Output should show:

```
Status: active
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

If 80 or 443 is missing, Traefik can't accept traffic — and the failure mode is "browser refuses to connect" with no log trace anywhere helpful.

### Key Takeaways

- Inspect before you deploy. Five minutes of `ss`, `docker ps`, and `ufw status` saves hours of debugging.
- Document the baseline state in a runbook so future engineers know what "normal" looks like.

### Common Mistakes

- Running `docker ps` and not `docker ps -a` — missing stopped containers that will conflict.
- Assuming `:80` is free because no NGINX is running — Apache, Caddy, or stray docker-proxy processes may have grabbed it.

### Interview Questions

- *"How do you find which process is using a port?"* — `sudo ss -tulpn | grep :PORT` or `sudo lsof -i :PORT`.
- *"What's the difference between `netstat` and `ss`?"* — `ss` reads kernel sockets directly via netlink; faster and more accurate on modern Linux.

### Real World Relevance

Inspection is the first move in any "the production server is acting weird" investigation. Senior engineers reach for `ss`, `docker ps`, `journalctl` before they reach for code changes.

---

## 4. Server Bootstrap (Root Phase)

A fresh droplet is unsafe. SSH is open to the world, no firewall, no fail2ban, default `root` user. The bootstrap phase hardens it before any application traffic touches it.

### 4.1 Logging in as Root

```bash
ssh root@139.59.94.133
```

DigitalOcean accepts the SSH key you uploaded at droplet creation. If you used a password (not recommended), they email it. We always recommend SSH keys — passwords get brute-forced within minutes of provisioning.

### 4.2 Setting Hostname

```bash
hostnamectl set-hostname planazo-prod
grep -qxF "127.0.1.1 planazo-prod" /etc/hosts || echo "127.0.1.1 planazo-prod" >> /etc/hosts
```

**Why:** Hostname appears in logs (`journalctl`, syslog), monitoring tools, prompts. Naming it `planazo-prod` (rather than the default random one) makes debugging easier later.

### 4.3 Setting Timezone

```bash
timedatectl set-timezone Asia/Kolkata
```

**Why:** Logs become much easier to read when timestamps match your team's local time. Servers in UTC require constant mental arithmetic during incident response.

### 4.4 Updating the System

```bash
apt-get update                          # refresh package metadata
DEBIAN_FRONTEND=noninteractive apt-get -y upgrade   # apply security updates
```

`DEBIAN_FRONTEND=noninteractive` suppresses interactive prompts (e.g., "do you want to keep your old config?"). Without it, the upgrade might hang waiting for a keypress.

### 4.5 Installing Core Packages

```bash
apt-get install -y \
  ca-certificates curl gnupg lsb-release \
  ufw fail2ban unattended-upgrades \
  htop iotop ncdu git vim tmux jq unzip rsync \
  python3-pip dnsutils
```

| Package | What it does |
|---|---|
| `ca-certificates` | trusted CA certs for HTTPS |
| `curl` | HTTP client; used everywhere |
| `gnupg` | GPG; required for verifying apt repo signing keys |
| `ufw` | uncomplicated firewall (front-end for iptables) |
| `fail2ban` | bans IPs after repeated failed logins |
| `unattended-upgrades` | applies security patches automatically |
| `htop` | interactive process viewer |
| `iotop` | shows per-process disk I/O |
| `ncdu` | finds large files/dirs with a UI |
| `git` | version control |
| `tmux` | persistent terminal sessions (survives SSH drops) |
| `jq` | JSON parsing in shell |
| `dnsutils` | provides `dig` and `nslookup` |

**Why all of them upfront?** Every one of these is needed during deploys or incidents. Installing them after an outage when the apt mirror is slow is painful — better to install them all at bootstrap.

### 4.6 Adding Swap

```bash
fallocate -l 4G /swapfile          # create 4 GB file
chmod 600 /swapfile                # secure permissions
mkswap /swapfile                   # format as swap
swapon /swapfile                   # enable now
echo '/swapfile none swap sw 0 0' >> /etc/fstab    # persist across reboots
sysctl vm.swappiness=10            # prefer RAM, fall back to swap reluctantly
```

**Why:** A 2 GB droplet has zero room for memory spikes. Adding 4 GB of swap means the kernel can survive a temporary memory pressure event (e.g., a frontend build spike) without OOM-killing your containers.

**vm.swappiness=10** tells the kernel: use swap only when really necessary. The default 60 is too aggressive for low-RAM servers running latency-sensitive containers.

### 4.7 Enabling Automatic Security Updates

```bash
dpkg-reconfigure -plow unattended-upgrades
```

`-plow` accepts the defaults non-interactively. The result is `/etc/apt/apt.conf.d/50unattended-upgrades` which by default applies Ubuntu security patches every day at 06:00.

**Trade-off:** Auto-updates can occasionally break things. For production, set `Unattended-Upgrade::Automatic-Reboot "false";` so the box doesn't reboot in the middle of the night.

### 4.8 Configuring the Firewall

```bash
ufw default deny incoming           # block everything by default
ufw default allow outgoing          # allow outbound (e.g., apt update)
ufw allow OpenSSH                   # 22/tcp
ufw allow 80/tcp                    # HTTP for Let's Encrypt + redirect
ufw allow 443/tcp                   # HTTPS
ufw --force enable                  # enable without prompt
ufw status verbose
```

**Why deny-by-default:** Defense in depth. If you forget to disable a service, the firewall blocks it anyway.

**Why allow 80?** Let's Encrypt's HTTP-01 challenge uses port 80. Even though all real traffic should be 443, the proxy needs 80 to handle ACME challenges and redirect HTTP→HTTPS.

### 4.9 Setting Up fail2ban

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

- `maxretry = 4` — ban after 4 failed logins
- `bantime = 1h` — ban duration
- `findtime = 10m` — count failures over a 10-minute sliding window

**Why:** Within minutes of a public IP being live, you'll see SSH brute-force attempts in the logs. fail2ban turns those into automatic IP bans.

### Key Takeaways

- A fresh server is dangerous. Bootstrap hardens it.
- Firewall first, application second.
- Swap is cheap insurance for low-RAM hosts.

### Common Mistakes

- Forgetting to enable ufw after configuring rules (`ufw --force enable`).
- Disabling root login before testing the non-root user works — locking yourself out.
- Skipping fail2ban because "I have key-based auth" — fail2ban also slows scanners hitting other services.

### Interview Questions

- *"How do you harden a fresh Linux server?"* — Update OS, configure firewall, add swap, install fail2ban, create non-root user, disable password auth, enable automatic security updates.
- *"What's the difference between iptables and ufw?"* — ufw is a higher-level frontend; under the hood it generates iptables rules.

### Real World Relevance

These exact steps map to "production-readiness checklists" used at startups when provisioning new infrastructure. Cloud-init scripts at companies like Stripe, Vercel, and many YC startups encode these patterns.

---

## 5. Deploy User & SSH Hardening

### 5.1 Why Not Use Root?

Running as `root` is dangerous for three reasons:

1. **Mistakes are catastrophic.** `rm -rf /tmp/myapp` typed as `rm -rf / tmp/myapp` deletes everything.
2. **Compromise is total.** If a key is leaked, attackers own everything.
3. **Audit trail is broken.** Every action is recorded as "root", not "Sunil".

Convention: bootstrap as `root`, then create a dedicated deploy user.

### 5.2 Creating the Deploy User

```bash
adduser --disabled-password --gecos "" planazo
```

| Flag | Meaning |
|---|---|
| `--disabled-password` | no password; only SSH key login |
| `--gecos ""` | skip the "full name / phone" questionnaire |

**Why disabled-password:** Passwords get cracked. Key-only login is strictly more secure when keys are stored properly.

### 5.3 Adding Sudo Privilege

```bash
usermod -aG sudo planazo
```

- `-a` — append (don't remove existing groups)
- `-G sudo` — add to the `sudo` group

Then optionally allow passwordless sudo (useful for automation):

```bash
echo "planazo ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/planazo
chmod 440 /etc/sudoers.d/planazo
```

`NOPASSWD:ALL` means `sudo` won't prompt for a password. Convenient but trades security for ease. For multi-engineer teams, prefer password-required sudo.

### 5.4 Copying the SSH Key

```bash
mkdir -p /home/planazo/.ssh
cp /root/.ssh/authorized_keys /home/planazo/.ssh/authorized_keys
chown -R planazo:planazo /home/planazo/.ssh
chmod 700 /home/planazo/.ssh
chmod 600 /home/planazo/.ssh/authorized_keys
```

**The permission rules matter.** SSH refuses to authenticate if:
- `~/.ssh` is more permissive than `700` (only owner can rwx)
- `~/.ssh/authorized_keys` is more permissive than `600` (only owner can rw)

If permissions are wrong, the SSH error you get is **"Permission denied (publickey,password)"** — misleading, because the key is correct, the perms are wrong.

### 5.5 Testing Before Locking Root

**Open a second terminal.** Don't close your root SSH session yet — if the new user setup is broken, you'll be locked out.

```bash
ssh planazo@139.59.94.133
sudo whoami     # should print "root"
exit
```

If this works, move on. If not, debug from the still-open root session.

### 5.6 Disabling Root Login

```bash
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl restart ssh
```

**sed explained:**

- `-i` — edit the file in place
- `s/PATTERN/REPLACEMENT/` — substitute
- `^#\?PermitRootLogin.*` — match the line at the start (possibly commented `#`), then anything to end of line

After this:
- Root cannot log in via SSH at all
- Passwords cannot be used for SSH
- Only SSH public keys work

### Key Takeaways

- Never deploy as root. Always create a deploy user.
- SSH perms must be exact: `.ssh` is 700, `authorized_keys` is 600.
- Test new user works BEFORE locking root.

### Common Mistakes

- Locking root before testing the new user → locked out, droplet rebuild required.
- Adding the wrong key to `authorized_keys` (multiple keys exist on dev machines).
- Pasting keys with line breaks or trailing whitespace — SSH will silently reject them.

### Interview Questions

- *"What does `chmod 600 ~/.ssh/authorized_keys` mean and why?"* — Owner can read/write; nobody else can touch it. SSH refuses to use the file if anyone else can read it.
- *"How would you set up passwordless SSH to a server?"* — Generate ed25519 keypair, copy public key to server's `authorized_keys`, ensure perms are right, test.

### Real World Relevance

This is the same workflow used by every cloud provider's "deploy user" pattern, Ansible, and tools like Salt and Puppet. The security model — separate humans from automation, key-based only, no root SSH — is the industry standard.

---

## 6. GitHub SSH Deploy Keys

### 6.1 Why a Deploy Key

Three options for cloning a repo on a server:

1. **HTTPS with personal access token** — token in `~/.gitconfig` or environment; rotates regularly.
2. **HTTPS public** — only works for public repos; can't push.
3. **SSH deploy key** — one keypair per server, read-only by default, no expiry.

We chose #3. Deploy keys are server-scoped: if the server is compromised, the attacker can only read this one repo (not your whole GitHub).

### 6.2 Generating the Key

```bash
ssh-keygen -t ed25519 -C "planazo-droplet-deploy" -f ~/.ssh/id_ed25519 -N ""
```

| Flag | Meaning |
|---|---|
| `-t ed25519` | algorithm: ed25519 (modern, fast, secure) |
| `-C "comment"` | comment in the public key for identification |
| `-f path` | output filename |
| `-N ""` | empty passphrase (required for unattended pulls) |

**Why ed25519 over RSA:**

- Smaller keys (~70 bytes vs 372 for RSA 3072)
- Faster signing
- Resistant to certain timing attacks
- No "key length" debate

RSA is still acceptable; just specify a high bit count (`-b 4096`). Ed25519 is the default for new keys at most companies.

### 6.3 Adding to GitHub

Read the public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Copy the entire line. On GitHub:

1. Repository → Settings → Deploy keys → Add deploy key
2. Title: `planazo-droplet`
3. Key: paste
4. Allow write access: **unchecked** (read-only)

Deploy keys are repo-scoped. A key added to `repo-a` can read `repo-a` only. If you need access to two repos, add the same public key to both, or use separate keys per repo.

### 6.4 Testing GitHub Auth

```bash
ssh -T git@github.com
```

`-T` disables pseudo-tty allocation (we're not running an interactive shell). GitHub responds with:

```
Hi <repo>! You've successfully authenticated, but GitHub does not provide shell access.
```

That's the success message. Now `git clone git@github.com:user/repo.git` works.

### 6.5 Common SSH Errors

**`Permission denied (publickey)`** — the key isn't accepted. Causes:

- Wrong key on GitHub
- File perms wrong on `~/.ssh/id_ed25519` (must be 600)
- `~/.ssh` perms wrong (must be 700)
- SSH agent has wrong key loaded (`ssh-add -l` to check)

**`Host key verification failed`** — GitHub's host key isn't in `known_hosts`. Run `ssh -T git@github.com` once and type `yes` when prompted, or pre-populate:

```bash
ssh-keyscan github.com >> ~/.ssh/known_hosts
```

### Key Takeaways

- Deploy keys are read-only, server-scoped GitHub authentication.
- Ed25519 is the modern default; RSA 3072+ is also acceptable.
- SSH perms (`700`/`600`) matter as much as the keys themselves.

### Common Mistakes

- Adding the **private** key to GitHub instead of the public key.
- Forgetting `-N ""` and generating a passphrased key, then unattended pulls fail.
- Adding the same key to multiple repos when separate keys would limit blast radius.

### Interview Questions

- *"What's the difference between a deploy key and a personal access token?"* — Deploy key: SSH-based, server-scoped, no expiry. PAT: HTTPS-based, account-scoped, has expiry and granular scopes.
- *"Why ed25519 over RSA?"* — Smaller, faster, modern crypto, no key-length argument.

### Real World Relevance

Every CI/CD setup uses some form of this — GitHub Actions uses ephemeral tokens, Jenkins uses SSH deploy keys, GitLab uses CI/CD variables. The mental model is the same: bot identity, scoped access, rotatable.

---

## 7. Docker & Docker Compose Setup

### 7.1 What Docker Actually Is

A common misconception is that containers are "lightweight VMs." They're not.

**Virtual Machines:**

```
┌────────────────────────────┐
│  Guest application         │
│  Guest OS (kernel + libs)  │ ← full Linux kernel per VM
│  Hypervisor                │
│  Host OS                   │
│  Hardware                  │
└────────────────────────────┘
```

**Containers:**

```
┌────────────────────────────┐
│  App A    │  App B          │
│  libs     │  libs           │  ← separate filesystems
│  ───────  │  ───────        │
│  Host OS kernel             │  ← shared by all containers
│  Hardware                   │
└────────────────────────────┘
```

Containers share the host kernel. They get isolated **namespaces** (PID, network, mount, UTS, IPC, user) and **cgroups** (resource limits). The host sees containerized processes as just processes; the containers think they're alone.

### 7.2 Installing Docker (The Right Way)

We hit a real bug with **snap-installed Docker** — snap's Docker bundles an old client that couldn't talk to modern Traefik. Don't use snap Docker. Use the official Docker apt repository.

```bash
# Remove any snap or old apt Docker
sudo snap remove --purge docker 2>/dev/null
sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# Add Docker's GPG signing key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the Docker apt repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose v2
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

**Why each piece:**

| Package | What it provides |
|---|---|
| `docker-ce` | Docker Engine daemon (`dockerd`) |
| `docker-ce-cli` | the `docker` command-line tool |
| `containerd.io` | low-level container runtime that Docker uses internally |
| `docker-buildx-plugin` | extended build features (multi-arch, etc.) |
| `docker-compose-plugin` | `docker compose` subcommand (v2; Python `docker-compose` v1 is deprecated) |

### 7.3 Adding the User to the Docker Group

```bash
sudo usermod -aG docker planazo
exit                  # log out
ssh planazo@...       # log back in for group to take effect
docker ps             # should work without sudo
```

**Why:** Without docker group membership, every Docker command needs `sudo`. With it, the user can issue Docker commands. Trade-off: docker group is effectively root (you can mount `/` into a container and read anything).

### 7.4 Configuring Log Rotation

```bash
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" }
}
EOF
sudo systemctl restart docker
```

**Why:** Default Docker logs are unbounded. A chatty container can fill a 50 GB disk in hours. This config caps each container's logs at 5 rotated files of 10 MB each → 50 MB per container maximum.

### 7.5 Docker Core Concepts

#### Images vs Containers

- **Image** — read-only filesystem template. Like a class definition.
- **Container** — running instance of an image. Like an object instance.

You can have many containers from one image. Each container has its own writable layer.

#### Volumes

Containers are ephemeral. Data inside dies with the container. To persist data, use volumes:

```yaml
services:
  postgres:
    volumes:
      - pgdata:/var/lib/postgresql/data    # named volume

volumes:
  pgdata:                                  # declared at top level
```

**Named volumes** live in `/var/lib/docker/volumes/<name>`. Docker manages them. Survive container deletion.

**Bind mounts** map a host path into the container:

```yaml
volumes:
  - ./media:/app/media           # host:./media → container:/app/media
```

Use bind mounts when you need direct host access (e.g., editing source code during development). Use named volumes for production data (DBs, uploads).

#### Networks

By default, Docker puts every container on the `bridge` network. Containers can reach each other by name.

```yaml
networks:
  - traefik_proxy

networks:
  traefik_proxy:
    external: true                 # network already exists, don't create
```

Custom networks give you:
- DNS-based discovery (`http://postgres:5432` works)
- Isolation (containers on different networks can't see each other)
- Easier security boundaries

### 7.6 Why docker compose?

Without compose, deploying a multi-container app means a wall of `docker run` commands. With compose, it's a YAML file:

```yaml
services:
  django:
    image: planazo-django
    env_file: .env.production
    networks:
      - traefik_proxy
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
```

Then `docker compose up -d` brings it all up. The YAML is version-controlled, reproducible, and self-documenting.

### Key Takeaways

- Containers ≠ VMs; they share the host kernel.
- Use official Docker apt repo, never snap.
- Volumes persist data; bind mounts share host paths.
- Compose is the production way to run multi-service stacks.

### Common Mistakes

- Storing DB data inside a container's writable layer — data lost on restart.
- Mounting `/var/run/docker.sock` into a container that doesn't need it (security risk).
- Using `latest` tag for images — non-reproducible builds.

### Interview Questions

- *"What's the difference between a Docker image and container?"* — Image is the template, container is the running instance.
- *"How do containers communicate?"* — Through Docker networks, using service names as DNS.
- *"What's the difference between a volume and a bind mount?"* — Volumes are managed by Docker; bind mounts are explicit host paths.

### Real World Relevance

Every modern cloud platform (Kubernetes, ECS, Cloud Run, App Service) uses container images as the deployment artifact. Docker fluency is now table-stakes for backend, DevOps, and SRE roles.

---

## 8. Multi-Project Deployment Strategy

### 8.1 The Port Problem

Only one process can bind to a given (IP, port) pair at a time. If both Planazo's frontend and the future site 2's frontend tried to bind `:443`, the second would fail with `Address already in use`.

The solution is to put each app on a **different internal port** (3000, 3001, ...) and let the reverse proxy bind the public ports (80, 443). The proxy decides which app gets each request based on the Host header.

### 8.2 Folder Layout for Multi-Site Hosting

```
~/infra/
  traefik/
    docker-compose.yml          # the reverse proxy
    acme/                       # cert storage
  postgres/
    docker-compose.yml          # shared Postgres
    init/                       # SQL run on first boot (creates other DBs)
  redis/
    docker-compose.yml          # shared Redis

~/apps/
  planazo/
    docker-compose.prod.yml     # Planazo stack with Traefik labels
    .env.production
  goscan/
    docker-compose.prod.yml     # future site 2
    .env.production
```

The `~/infra/` directory contains shared services. Each app under `~/apps/` joins the same `traefik_proxy` network so Traefik can discover them.

### 8.3 The Shared Network

```bash
docker network create traefik_proxy
```

Every compose file declares it as `external`:

```yaml
networks:
  traefik_proxy:
    external: true
```

This way, Traefik can see Planazo's containers, and goscan's containers, and Postgres, all on the same logical network — but they're isolated from anything else.

### 8.4 Shared vs Per-Site Databases

Two database strategies:

**Shared Postgres, multiple databases:**

```
postgres container
├── DB: planazo  (used by Planazo)
└── DB: goscan   (used by goscan)
```

Pros: less RAM, single backup target, single tuning surface.
Cons: noisy-neighbor risk (one site's heavy query slows the other).

**One Postgres per site:**

Pros: total isolation, easier per-site scaling.
Cons: more RAM, more maintenance.

On a 2 GB droplet, shared Postgres is mandatory. On 8 GB+, either pattern works.

### 8.5 Container Memory Limits

When sharing a small droplet, set memory limits so one runaway container doesn't OOM-kill the others:

```yaml
services:
  django:
    deploy:
      resources:
        limits:
          memory: 350M
```

**Important lesson learned:** memory limits are double-edged. We initially set frontend's limit to 400 MB. Next.js dev mode happened to use ~400 MB at boot, immediately hitting the limit and causing terrible performance. Either remove limits and trust the kernel (with swap), or set limits generously based on actual measured usage.

### Key Takeaways

- Reverse proxy + Docker networks + private DNS solves multi-tenant hosting on one box.
- Shared infra (DB, cache) is fine for low-traffic sites on small droplets.
- Memory limits prevent runaway sites from killing the whole droplet.

### Common Mistakes

- Exposing app ports publicly (`-p 3000:3000`) — bypasses the proxy, creates conflicts.
- Forgetting to add a container to the shared network.
- Setting memory limits too tight, then debugging "slow site" for hours.

### Interview Questions

- *"How would you host 10 small Django sites cost-effectively?"* — One droplet, Traefik reverse proxy, shared Postgres with separate databases, Docker network.
- *"What's the noisy-neighbor problem in shared hosting?"* — One tenant's resource usage degrades another's. Mitigations: resource limits, separate processes, separate hosts at scale.

### Real World Relevance

Heroku, Render, Railway, Vercel — all multi-tenant. Their entire business is solving exactly this problem at scale.

---

## 9. Reverse Proxy: Traefik (with NGINX Comparison)

### 9.1 Why Traefik

We had two main options:

**NGINX** — battle-tested, configuration via `.conf` files, manual SSL with Certbot.

**Traefik** — modern, configuration via container labels, auto SSL with Let's Encrypt built in.

We chose Traefik because:

1. **Zero config file editing per new site.** Add labels to the compose file → Traefik picks it up. With NGINX you'd edit `/etc/nginx/sites-enabled/` for every site.
2. **Auto SSL out of the box.** No separate Certbot run, no cron job for renewal.
3. **Docker-native.** It discovers containers by listening to Docker's event stream.

NGINX is still the right answer for many scenarios — especially if you have non-Docker apps, complex caching, or existing NGINX expertise.

### 9.2 The Traefik Compose

```yaml
services:
  socket-proxy:
    image: tecnativa/docker-socket-proxy:latest
    container_name: socket-proxy
    restart: unless-stopped
    environment:
      - CONTAINERS=1
      - NETWORKS=1
      - SERVICES=1
      - TASKS=1
      - POST=0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - traefik_proxy

  traefik:
    image: traefik:latest
    container_name: traefik
    restart: unless-stopped
    depends_on:
      - socket-proxy
    command:
      - --providers.docker=true
      - --providers.docker.endpoint=tcp://socket-proxy:2375
      - --providers.docker.exposedByDefault=false
      - --providers.docker.network=traefik_proxy
      - --entrypoints.web.address=:80
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.le.acme.email=ops@example.com
      - --certificatesresolvers.le.acme.storage=/acme/acme.json
      - --certificatesresolvers.le.acme.tlschallenge=true
      - --log.level=INFO
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./acme:/acme
    networks:
      - traefik_proxy

networks:
  traefik_proxy:
    external: true
```

### 9.3 The socket-proxy Sidecar

Modern Traefik versions need to talk to Docker. Two ways:

1. **Mount the socket directly** — `/var/run/docker.sock:/var/run/docker.sock:ro`. Simple but Traefik gets full Docker control (security risk).
2. **Go through a socket-proxy** — restrict what Traefik can do. Only allow read-only access to containers/networks/services. This is what we did.

The socket-proxy lets Traefik:
- List containers (`CONTAINERS=1`)
- List networks (`NETWORKS=1`)
- See services and tasks

But denies dangerous operations like creating containers or executing commands (`POST=0`).

### 9.4 Configuration Flags Explained

```
--providers.docker=true
```
Enable the Docker provider — Traefik will look at container labels for routing config.

```
--providers.docker.endpoint=tcp://socket-proxy:2375
```
Connect to the socket-proxy via TCP (not the raw socket). The socket-proxy translates and forwards.

```
--providers.docker.exposedByDefault=false
```
A container is NOT routed by Traefik unless it has `traefik.enable=true`. Safer default — accidental exposure is impossible.

```
--entrypoints.web.address=:80
--entrypoints.web.http.redirections.entrypoint.to=websecure
--entrypoints.web.http.redirections.entrypoint.scheme=https
```
Listen on port 80, redirect everything to the `websecure` entrypoint (HTTPS).

```
--entrypoints.websecure.address=:443
```
Listen on port 443.

```
--certificatesresolvers.le.acme.email=...
--certificatesresolvers.le.acme.storage=/acme/acme.json
--certificatesresolvers.le.acme.tlschallenge=true
```
Configure ACME (Let's Encrypt). Email is required for renewal notifications. Storage path persists certs across restarts. `tlschallenge` uses TLS-ALPN — fast and doesn't need port 80.

### 9.5 How a Container Tells Traefik About Itself

Inside the application's compose file:

```yaml
services:
  frontend:
    image: my-frontend
    expose:
      - "3000"
    networks:
      - traefik_proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_proxy
      - traefik.http.routers.planazo.rule=Host(`planazo.in`) || Host(`www.planazo.in`)
      - traefik.http.routers.planazo.entrypoints=websecure
      - traefik.http.routers.planazo.tls.certresolver=le
      - traefik.http.services.planazo.loadbalancer.server.port=3000
```

**Label by label:**

| Label | Purpose |
|---|---|
| `traefik.enable=true` | this container should be routed |
| `traefik.docker.network=traefik_proxy` | which network to use for connections |
| `traefik.http.routers.<name>.rule` | match condition (Host, Path, Headers...) |
| `traefik.http.routers.<name>.entrypoints` | which entrypoint (web=80, websecure=443) |
| `traefik.http.routers.<name>.tls.certresolver` | which cert resolver issues the cert |
| `traefik.http.services.<name>.loadbalancer.server.port` | which container port to forward to |

The `<name>` is arbitrary — it groups related labels but doesn't appear elsewhere.

### 9.6 Equivalent NGINX Configuration

For comparison, here's what the same routing would look like in NGINX:

```nginx
# /etc/nginx/sites-enabled/planazo

upstream planazo_frontend {
    server 127.0.0.1:3000;
}

upstream planazo_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name planazo.in www.planazo.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name planazo.in www.planazo.in;

    ssl_certificate     /etc/letsencrypt/live/planazo.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/planazo.in/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://planazo_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";

        proxy_read_timeout   60s;
        proxy_send_timeout   60s;
        proxy_connect_timeout 5s;
    }
}

server {
    listen 443 ssl http2;
    server_name api.planazo.in;

    ssl_certificate     /etc/letsencrypt/live/api.planazo.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.planazo.in/privkey.pem;

    location / {
        proxy_pass http://planazo_api;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Why the headers matter:**

- `Host` — passes the original Host header so the backend knows which domain was requested.
- `X-Real-IP` — actual client IP (since the connection is proxied, `remote_addr` is the proxy).
- `X-Forwarded-For` — chain of proxies the request traversed.
- `X-Forwarded-Proto` — `http` or `https`; tells the backend whether the original was secure.
- `Upgrade` / `Connection` — WebSocket support.

Modern NGINX nit: `listen 443 ssl http2;` is deprecated in NGINX ≥ 1.25. Use `listen 443 ssl;` plus a separate `http2 on;` directive.

### 9.7 The Architectural Decision

In a fresh project today, Traefik is the easier choice — declarative, auto-SSL, Docker-native. In a legacy environment with existing NGINX, stick with NGINX and use Certbot.

### Key Takeaways

- A reverse proxy is the entry point. Apps don't expose public ports.
- Traefik uses labels; NGINX uses config files; the principle is identical.
- Always terminate SSL at the proxy, run apps over plain HTTP internally.

### Common Mistakes

- Forgetting `--providers.docker.exposedByDefault=false` — every container without `traefik.enable=false` gets accidentally exposed.
- Putting Traefik on the wrong network — it can see Docker but can't reach the app containers.
- Mounting Docker socket without read-only or socket-proxy → containers can break out and own the host.

### Interview Questions

- *"What's a reverse proxy?"* — A server that accepts client requests and forwards them to one of several backend services based on routing rules.
- *"What's the X-Forwarded-For header?"* — A standard way for a proxy to record the original client IP so the backend can see it.

### Real World Relevance

Same patterns power AWS ALB, GCP Cloud Load Balancing, NGINX Plus, HAProxy, Envoy. Once you understand reverse proxying, every load balancer feels familiar.

---

## 10. SSL with Let's Encrypt

### 10.1 Why HTTPS

- **Privacy.** TLS encrypts everything between browser and server.
- **Trust.** Padlock in the address bar; users won't enter passwords on HTTP.
- **SEO.** Google ranks HTTPS sites higher.
- **Required for modern APIs.** Browsers block mixed content; service workers, HTTP/2, and other features require HTTPS.

### 10.2 What Let's Encrypt Does

Let's Encrypt is a free certificate authority. They issue domain-validated (DV) certificates good for 90 days. Renewal is automatic if your client is set up right.

Two challenge types:

**HTTP-01** — Let's Encrypt makes an HTTP request to your domain at `/.well-known/acme-challenge/<token>`. Your server returns the expected response. Proves you control the domain.

**TLS-ALPN-01** — Let's Encrypt opens a TLS connection on :443 with a special ALPN ID. Your server presents a self-signed cert during the handshake containing the proof token. Doesn't need :80 to be free for HTTP requests.

We use TLS-ALPN-01 with Traefik because it works even when Traefik is fully consuming :80 for redirects.

### 10.3 The Full SSL Flow

```
 1. Browser  ──HTTPS──►  Traefik :443
 2. Traefik sees no cert yet → triggers ACME
 3. Traefik tells Let's Encrypt: "I want a cert for planazo.in"
 4. Let's Encrypt: "Prove it. Respond on :443 with this token via TLS-ALPN"
 5. Traefik temporarily serves the token on :443 for ALPN connections
 6. Let's Encrypt connects → sees token → issues cert
 7. Traefik stores cert in /acme/acme.json
 8. Future requests get the real cert
 9. ~60 days later, Traefik auto-renews
```

### 10.4 Configuring Auto-SSL in Traefik

The lines we already saw in section 9.2:

```yaml
- --certificatesresolvers.le.acme.email=ops@example.com
- --certificatesresolvers.le.acme.storage=/acme/acme.json
- --certificatesresolvers.le.acme.tlschallenge=true
```

And in each container's labels:

```yaml
- traefik.http.routers.<name>.tls.certresolver=le
```

That's it. No Certbot, no cron, no manual renewal.

### 10.5 If You Were Using Certbot Instead

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d planazo.in -d www.planazo.in \
  --email ops@example.com --agree-tos --no-eff-email --redirect

sudo systemctl status snap.certbot.renew.timer
```

Certbot would:
1. Validate domain ownership via HTTP-01 (placing a file in `/var/www/html/.well-known/`)
2. Obtain certs
3. Edit NGINX config to add `ssl_certificate` lines
4. Set up a systemd timer for renewal

### 10.6 Common SSL Errors

**"NET::ERR_CERT_AUTHORITY_INVALID"** — Browser doesn't trust the cert. Causes:

- Traefik's default self-signed cert is being served (real cert wasn't issued yet)
- DNS doesn't resolve to your server, so Let's Encrypt can't validate

**"NET::ERR_CERT_DATE_INVALID"** — Cert expired. Should never happen with auto-renewal; if it does, check Traefik logs.

**"Too many failed authorizations"** — Let's Encrypt rate-limits failed validations (5 per hour per identifier). If you keep failing, wait an hour.

**"DNS problem: NXDOMAIN looking up ..."** — Your DNS record doesn't exist yet. Add it, wait for propagation.

**"Timeout during connect (likely firewall problem)"** — Let's Encrypt couldn't reach your server. Either firewall blocks 80/443, or DNS points elsewhere.

### 10.7 HSTS and Browser Caching

Once a browser sees `Strict-Transport-Security: max-age=...`, it remembers to only ever use HTTPS for that domain. This is great for security but creates a bootstrapping problem during deploys:

- If you accidentally serve a self-signed cert once, browsers cache the rejection
- The browser then refuses to load that domain even after you fix the real cert

Recovery: `chrome://net-internals/#hsts` → Delete domain security policies for the affected domains, or use an incognito window.

### Key Takeaways

- Let's Encrypt + Traefik = automatic, free, auto-renewing SSL.
- TLS-ALPN-01 is preferred when the proxy already owns :443.
- HSTS is great in production but bites you during initial setup.

### Common Mistakes

- Configuring Traefik for ACME but forgetting `traefik.enable=true` on the app — Traefik never tries to get a cert.
- Hitting Let's Encrypt rate limits by repeatedly triggering failures.
- Not understanding HSTS — browser caches self-signed reject, then user complains they "can't load the site" after a fix.

### Interview Questions

- *"How does HTTPS work?"* — Asymmetric key exchange (RSA/ECDHE), symmetric session key, TLS handshake, encrypted traffic.
- *"What's Let's Encrypt's challenge process?"* — Server proves domain ownership by responding to HTTP or TLS challenge issued by Let's Encrypt's ACME servers.

### Real World Relevance

99% of new SSL deployments use Let's Encrypt. Knowing how it works, including the rate limits and failure modes, is essential.

---

## 11. Real Problems We Faced

This section documents actual issues from our deployment session. Each is a case study in debugging methodology.

### 11.1 Case: "Permission denied (publickey)" When SSHing as New User

**Symptoms:** After creating `planazo` user and copying `authorized_keys`, `ssh planazo@<ip>` prompted for a password instead of logging in.

**Root cause:** Two issues combined:
1. The user typed `planaazo` (three `a`s) — typo
2. The `authorized_keys` permissions might have been off

**Debugging approach:**

```bash
ssh -v planazo@139.59.94.133
```

The verbose output showed:

```
Offering public key: ~/.ssh/id_ed25519
Authentications that can continue: publickey,password
```

This pattern — key offered, then "publickey,password" — means the key was rejected. The fallback to password is what made it look like SSH wanted a password.

**Fix:**

1. Type the username correctly
2. Verify `~/.ssh/authorized_keys` contains the right public key
3. Ensure perms: `chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys`

**Prevention:** Always test the new user's SSH login from a separate terminal before disabling root login.

**How engineers think about it:** When SSH fails, run with `-v` (or `-vv`, `-vvv`). The handshake log shows exactly where it broke — key offer, server response, fallback. The error messages alone are misleading.

---

### 11.2 Case: Django Module Not Found ("config")

**Symptoms:** Gunicorn refused to boot:

```
ModuleNotFoundError: No module named 'config'
```

The compose file ran `gunicorn config.wsgi:application` but Python couldn't find a `config` package.

**Root cause:** Our docker-compose template assumed the Django project module was named `config`. The actual project used `core` as the module name (file at `backend/core/wsgi.py`, not `backend/config/wsgi.py`).

**Debugging approach:**

```bash
find backend -maxdepth 3 -name "wsgi.py" -not -path "*/migrations/*"
# Output: backend/core/wsgi.py
```

That single command revealed the actual module name.

**Fix:**

```bash
sed -i 's|gunicorn config.wsgi:application|gunicorn core.wsgi:application|' docker-compose.prod.yml
sed -i 's|celery -A config worker|celery -A core worker|' docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d --force-recreate django celery
```

**Prevention:** Read the project's `manage.py` first — it has a `DJANGO_SETTINGS_MODULE` reference that tells you the module name immediately.

**Lesson:** Templates are starting points, not absolutes. Always confirm template assumptions against the actual codebase.

---

### 11.3 Case: Empty SECRET_KEY in .env.production

**Symptoms:** Django booted briefly, then crashed:

```
django.core.exceptions.ImproperlyConfigured: The SECRET_KEY setting must not be empty.
```

**Root cause:** Our setup script generated a Django secret using a Python one-liner that contained `!` characters. In Bash, `!` triggers history expansion (`!command` runs a previous command). The shell parser failed silently, the variable got set to empty, and the `.env.production` file ended up with `DJANGO_SECRET_KEY=` (empty).

**Debugging approach:**

```bash
grep -E "^SECRET_KEY|^DJANGO_SECRET_KEY" .env.production
# Output:
#   DJANGO_SECRET_KEY=
#   SECRET_KEY=
```

Empty values confirmed.

**Fix:**

```bash
set +H                       # disable history expansion for this shell
DJANGO_SECRET=$(openssl rand -base64 64 | tr -d '\n=/+')
sed -i "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${DJANGO_SECRET}|" .env.production
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=${DJANGO_SECRET}|" .env.production
```

**Prevention:**

- Use `openssl rand` (no special chars) instead of Python with `!@#$`.
- Or `set +H` before any command that might trigger history expansion.
- Always verify the env file's contents after writing.

**Lesson:** Bash is full of subtle metacharacter pitfalls. When generating secrets in shell, use alphanumeric-only outputs.

---

### 11.4 Case: env_file Path Doubled

**Symptoms:**

```
env file /home/planazo/apps/wedding-project/.env.production.production not found
```

**Root cause:** A `sed` command meant to change `.env` to `.env.production` ran twice (or matched too broadly) and ended up doubling the suffix.

**Debugging approach:**

```bash
grep "env_file:" docker-compose.prod.yml
# Output:
#   env_file: .env.production.production
```

**Fix:**

```bash
sed -i 's|\.env\.production\.production|.env.production|g' docker-compose.prod.yml
```

**Prevention:** Use precise sed patterns (`^env_file: \.env$` not `\.env`). Run `git diff` after sed edits before applying them.

**Lesson:** Sed is powerful and dangerous. Always sanity-check after substitution.

---

### 11.5 Case: Markdown URL Injected Into YAML

**Symptoms:** Traefik returned `404` for `https://www.planazo.in` despite routers being configured. Logs showed:

```
rule="Host(`planazo.in`) || Host(`[www.planazo.in](https://www.planazo.in)`)"
```

The Host rule contained markdown link syntax.

**Root cause:** Chat interfaces (including ours) auto-linkify URLs into `[text](url)` markdown when typed. When you copy-paste from chat into a terminal, the markdown comes along. When it lands inside Host() backticks, the parser sees garbage and silently drops the router.

**Debugging approach:**

1. `grep "planazo.rule" docker-compose.prod.yml` — saw the markdown clearly
2. Realized the chat→terminal copy was the source
3. Multiple attempts with sed kept getting re-mangled when running commands from chat

**Fix:** Write the YAML via Python with backticks built from `chr(96)`:

```python
import pathlib
bt = chr(96)
clean = f"      - traefik.http.routers.planazo.rule=Host({bt}planazo.in{bt}) || Host({bt}www.planazo.in{bt})"
# write line into file
```

The Python source itself contains no markdown URL syntax — `chr(96)` becomes a backtick at runtime, so chat can't pre-mangle it.

**Prevention:**

- Wrap hostnames in backticks (` `code` `) in chat to keep them as code spans, not links.
- For YAML containing special characters, use Python scripts written to a file, then executed.

**Lesson:** The toolchain matters. Chat→clipboard→terminal is not lossless. For high-fidelity transfers, use a file-based intermediate.

---

### 11.6 Case: Docker API Version Mismatch ("1.24 is too old")

**Symptoms:** Traefik couldn't talk to Docker:

```
ERR Failed to retrieve information of the docker client and server host
error="Error response from daemon: client version 1.24 is too old.
Minimum supported API version is 1.40"
```

This kept Traefik from discovering any container labels — every route returned 404.

**Root cause:** Docker had been installed via snap. Snap's Docker bundles its own client (and an older one). Modern Traefik tried to talk to it via Docker SDK and got rejected because the negotiated API version was below the daemon's minimum.

**Debugging approach:**

```bash
which docker
docker version
snap list | grep docker      # confirmed snap docker
sudo dpkg -l | grep docker   # no apt docker
```

**Fix:** Remove snap, install official Docker:

```bash
sudo snap remove --purge docker
sudo apt-get remove -y docker docker-engine docker.io containerd runc
sudo systemctl stop docker docker.socket containerd
sudo rm -rf /var/lib/docker /var/lib/containerd  # wipe state

# Install from Docker's official repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

Then add `socket-proxy` as a sidecar so Traefik talks through a known-good API version interface.

**Prevention:** Never install Docker via snap on Ubuntu. Use the official apt repo or download.docker.com.

**Lesson:** "It's installed" isn't enough — confirm WHERE it's installed from. `which`, `dpkg -l`, and `snap list` reveal the source.

---

### 11.7 Case: Containerd State Corruption After Reinstall

**Symptoms:** After purging and reinstalling Docker:

```
failed to lease content: rpc error: code = NotFound
desc = blob sha256:16bc17c64a573... blob not found
```

Images wouldn't pull, builds failed, containers wouldn't start.

**Root cause:** Containerd kept its content store at `/var/lib/containerd`. When we removed `/var/lib/docker` but containerd's snapshotter state had stale references, the new daemon tried to "find" blobs that no longer existed.

**Debugging approach:**

```bash
sudo systemctl status containerd
ls /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots
# directory missing
```

**Fix:**

```bash
sudo systemctl stop docker docker.socket containerd
sudo rm -rf /var/lib/docker /var/lib/containerd
sudo systemctl start containerd
sleep 2
sudo systemctl start docker
docker pull hello-world && docker run --rm hello-world
```

**Prevention:** When uninstalling Docker, remove BOTH `/var/lib/docker` and `/var/lib/containerd`. Or, ideally, don't reinstall in production — fix forward.

**Lesson:** Compound systems like Docker+containerd have shared state. Partial cleanups create inconsistent states.

---

### 11.8 Case: DNS Pointing to Namecheap Parking IP

**Symptoms:** Browser showed `ERR_CONNECTION_REFUSED` for `planazo.in` even though the server was fully running.

**Root cause:** Domain was registered at Namecheap. Namecheap's default DNS returned `198.54.117.242` (their parking page server) until the user added custom A records or changed nameservers.

**Debugging approach:**

```bash
dig +short planazo.in @1.1.1.1
# Output: 198.54.117.242    ← Namecheap parking, not droplet
```

The droplet's IP was `139.59.94.133`. The DNS clearly wasn't pointing there.

**Fix:** Either:

**Option A** — Add A records at Namecheap's Advanced DNS:

| Type | Host | Value |
|---|---|---|
| A | @ | 139.59.94.133 |
| A | www | 139.59.94.133 |
| A | api | 139.59.94.133 |
| A | ai | 139.59.94.133 |

**Option B** — Change Namecheap nameservers to DigitalOcean's:

```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

Option A propagates faster (~10–30 min vs hours for nameserver changes).

**Prevention:** Set up DNS BEFORE deploying. Use `dig +short <domain> @1.1.1.1` to verify it resolves to your droplet before bringing the stack up.

**Lesson:** No amount of server-side work fixes a DNS misconfiguration. Always verify DNS as step zero.

---

### 11.9 Case: Frontend in Dev Mode Hogging RAM

**Symptoms:** `docker stats` showed:

```
wedding-project-frontend-1   72.74%   399.9MiB / 400MiB   99.97%
```

The frontend container was pinned at 99.97% memory and 72% CPU even when idle.

**Root cause:** The Dockerfile's `CMD` ran `npm run dev` (i.e., `next dev --webpack`), which keeps the dev server, hot reload, and bundler all in memory. Dev mode is for development; it's hostile to production resource limits.

**Debugging approach:**

```bash
docker exec wedding-project-frontend-1 ps -ef
# saw: node next dev --webpack

docker compose logs frontend --tail 20
# saw: > planazo-frontend@0.1.0 dev
```

**Fix:**

In the compose, override the container command to build then start in production mode:

```yaml
services:
  frontend:
    working_dir: /app
    command: sh -c "npm run build && NODE_ENV=production npm run start -- -p 3000 -H 0.0.0.0"
    environment:
      - NODE_ENV=production
```

After this, frontend memory dropped to ~200 MB, CPU dropped to <5% idle.

**Better long-term fix:** Use a multi-stage Dockerfile that does `npm run build` at IMAGE build time, then the runtime container just runs `npm start`. Avoids the build cost on every container restart.

**Prevention:** Always confirm Dockerfile CMD is production-appropriate. `npm run dev` should never run in production.

**Lesson:** Resource usage is a fingerprint. A container pinned at its limit is rarely the limit's fault — it's the workload's fault. Look at what's actually running.

---

### 11.10 Case: Let's Encrypt Rate Limit

**Symptoms:** SSL issuance kept failing:

```
acme: error: 429 :: urn:ietf:params:acme:error:rateLimited ::
too many failed authorizations (5) for "ai.planazo.in" in the last 1h0m0s,
retry after 2026-05-20 07:25:20 UTC
```

**Root cause:** While debugging the markdown URL issue in Traefik, we triggered repeated cert requests that all failed (because the bad rule made Traefik unable to actually serve the challenge). Let's Encrypt's rate limit kicks in after 5 failed validations per hostname per hour.

**Debugging approach:**

```bash
docker logs traefik 2>&1 | grep -iE "rateLimited|acme.*error"
```

**Fix:** Wait for the timestamp the error mentions (10 minutes typically), then:

1. Fix the underlying issue (the markdown URL)
2. Reset Traefik's ACME state to retry from scratch:

```bash
sudo truncate -s 0 ~/infra/traefik/acme/acme.json
sudo chmod 600 ~/infra/traefik/acme/acme.json
docker compose -f ~/infra/traefik/docker-compose.yml down
docker compose -f ~/infra/traefik/docker-compose.yml up -d
```

3. After rate limit expires, trigger fresh requests with `curl -I https://<domain>`

**Prevention:**

- For testing, use Let's Encrypt's **staging** environment (`--certificatesresolvers.le.acme.caServer=https://acme-staging-v02.api.letsencrypt.org/directory`) which has much higher rate limits and issues untrusted certs.
- Fix configuration mistakes via curl-from-the-server BEFORE hitting public DNS.

**Lesson:** Let's Encrypt rate limits are real. Use staging during testing. In production, ensure DNS is right and the proxy is healthy before requesting certs.

---

### Engineer's Debugging Methodology

Patterns we used across all these cases:

1. **Read the actual error.** Not the symptom, the cause. Stack traces start from the bottom.
2. **Verify each layer.** Browser → DNS → Firewall → Docker → Proxy → App. Test each independently with `dig`, `curl`, `docker exec`.
3. **Bypass when stuck.** `curl --resolve domain:443:droplet_ip` bypasses DNS to test the stack directly.
4. **Inspect, don't assume.** `docker inspect`, `docker exec ... env`, `cat file` — the truth is in the artifact, not your mental model.
5. **Smallest change first.** Don't redeploy when you can `docker restart`. Don't restart when you can `docker exec`.

---

## 12. Security Best Practices

### 12.1 Firewall (ufw)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

Defense in depth — even if a container misconfigures itself, the firewall still blocks unsolicited traffic.

### 12.2 SSH Hardening

- No root login
- No password auth
- Public key only (ed25519 preferred)
- fail2ban on for SSH (and any other public service)
- Consider non-standard SSH port + port knocking for high-security setups

### 12.3 Docker Security

- Never mount `/var/run/docker.sock` into untrusted containers — equivalent to root on host
- Use socket-proxy when a container needs read-only Docker info (e.g., Traefik)
- Set memory limits to prevent OOM cascades
- Pin image versions in production (`traefik:v3.1` not `traefik:latest` for reproducibility)
- Scan images periodically: `docker scout cves <image>`

### 12.4 Environment Variables and Secrets

- Never commit `.env.production` to git
- Use file perms: `chmod 600 .env.production`
- For high-security: use Docker secrets (`secrets:` in compose) or external secret managers (HashiCorp Vault, AWS Secrets Manager)
- Don't pass secrets via `-e` flag on `docker run` — they show up in `ps`

### 12.5 Postgres

- Strong password (we used `Xo@linus`; for production use 24+ random chars)
- Don't expose `:5432` publicly (we don't — it's only on `traefik_proxy` network)
- Run with non-default credentials (don't ship with `postgres/postgres`)
- Enable connection limits (`max_connections=50` for low-RAM hosts)

### 12.6 NGINX/Traefik Security Headers

Recommended response headers:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
```

In Traefik you add these via middleware:

```yaml
- traefik.http.middlewares.security.headers.stsSeconds=31536000
- traefik.http.middlewares.security.headers.stsIncludeSubdomains=true
- traefik.http.middlewares.security.headers.contentTypeNosniff=true
- traefik.http.middlewares.security.headers.frameDeny=true
- traefik.http.routers.planazo.middlewares=security@docker
```

### 12.7 Rate Limiting

Per-IP request rate limit in Traefik:

```yaml
- traefik.http.middlewares.ratelimit.ratelimit.average=100
- traefik.http.middlewares.ratelimit.ratelimit.burst=50
- traefik.http.routers.planazo.middlewares=ratelimit@docker
```

Allow 100 requests/second average, burst to 50, per source IP.

### 12.8 Backups

```bash
# Daily Postgres backup
docker exec postgres pg_dumpall -U planazo_db > /backups/pg_$(date +%F).sql
# rotate: keep last 14
find /backups -name "pg_*.sql" -mtime +14 -delete
```

Add to root's crontab:

```
0 3 * * * /usr/local/bin/pg-backup.sh
```

For real backups, ship them off-box (S3, B2, another droplet). A backup on the same droplet that catches fire isn't a backup.

### Key Takeaways

- Security is layered. Firewall, SSH, app, DB, headers — each is a barrier.
- Secrets stay out of git, ideally out of env files for high-security setups.
- Backups must leave the box.

### Common Mistakes

- Disabling the firewall "temporarily" and forgetting.
- Committing `.env` to git accidentally.
- Backing up to the same disk being backed up.

### Interview Questions

- *"How do you secure SSH on a production server?"* — Key-only auth, fail2ban, disable root login, non-default port for added obscurity.
- *"How would you store database passwords?"* — Env files with perms 600, ideally a secret manager, never in code.

### Real World Relevance

Every breach post-mortem you read involves at least one of: exposed `.env`, weak DB password, unpatched OS, unprotected admin port. These basics matter.

---

## 13. Production Maintenance Guide

### 13.1 Daily Checks

```bash
# Are all containers healthy?
docker ps --format 'table {{.Names}}\t{{.Status}}'

# System pressure
free -h
df -h /
uptime

# Anything weird in the last 6 hours?
journalctl --since "6 hours ago" -p err
```

### 13.2 Checking Application Logs

```bash
# Tail one service
docker compose -f ~/apps/wedding-project/docker-compose.prod.yml logs -f django

# Last 100 lines from all services
docker compose -f ~/apps/wedding-project/docker-compose.prod.yml logs --tail 100

# Across multiple services with timestamps
docker compose -f ~/apps/wedding-project/docker-compose.prod.yml logs -t --since 30m
```

### 13.3 Updating the Deployment

```bash
cd ~/apps/wedding-project
git pull origin production
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec django python manage.py migrate
```

Order matters:
1. Pull new code
2. Rebuild images (so new code lands in the image)
3. Up `-d` recreates containers using the new images
4. Run migrations LAST so the new code is what handles requests when the DB is ready

### 13.4 Rollback Strategy

```bash
cd ~/apps/wedding-project
git log --oneline -5             # find the last known-good commit
git checkout <commit-sha>        # check it out
docker compose -f docker-compose.prod.yml up -d --build
```

For database migrations that need rolling back:

```bash
docker compose -f docker-compose.prod.yml exec django python manage.py migrate <app> <previous_migration>
```

### 13.5 Disk Cleanup

```bash
# Remove stopped containers, unused networks, dangling images
docker system prune -f

# Remove ALL unused images (more aggressive)
docker system prune -af

# Remove unused volumes (be careful — may contain DB data)
docker volume ls
docker volume prune     # interactive

# What's taking up disk?
sudo ncdu /
```

### 13.6 SSL Renewal

With Traefik, renewal is automatic. Verify it's working:

```bash
docker logs traefik 2>&1 | grep -iE "renew" | tail
```

If you switch to Certbot/NGINX:

```bash
sudo certbot renew --dry-run
sudo systemctl status snap.certbot.renew.timer
```

### 13.7 Monitoring

Light-touch monitoring stack:

- **Uptime checks** — Healthchecks.io, BetterUptime, UptimeRobot (free tiers)
- **Logs** — `docker logs` for now; ship to a log aggregator (Loki, Datadog) when scale demands
- **Metrics** — cAdvisor + Prometheus + Grafana for container metrics
- **Alerts** — Email or Slack from your uptime checker

### 13.8 Common Maintenance Tasks

| Task | Command |
|---|---|
| Restart a single service | `docker compose -f <file> restart <service>` |
| Recreate after env change | `docker compose -f <file> up -d --force-recreate <service>` |
| Run a one-off Django command | `docker compose -f <file> exec django python manage.py <cmd>` |
| Open Postgres shell | `docker exec -it postgres psql -U planazo_db` |
| Open Redis shell | `docker exec -it redis redis-cli` |
| Check container memory | `docker stats --no-stream` |
| See env vars in container | `docker exec <name> env | grep ...` |

### Key Takeaways

- Maintenance is a discipline, not a panic response.
- Document recurring procedures so anyone can run them.
- Automate the routine; only humans handle the exceptional.

### Common Mistakes

- Letting logs fill the disk (no log rotation).
- Forgetting to run migrations after a deploy.
- Rolling back code without rolling back DB schema.

### Interview Questions

- *"How do you deploy a code update with zero downtime?"* — Blue-green deploys, rolling restarts, health checks during reload.
- *"How do you back up a Postgres database in production?"* — `pg_dump` daily, ship off-host, periodic restore tests.

### Real World Relevance

You'll do maintenance more often than deployment. Owning runbooks for these tasks is what separates production-ready engineers from build-and-ship-and-forget engineers.

---

## 14. Appendix A: Full Configuration Files

### `~/infra/traefik/docker-compose.yml`

```yaml
services:
  socket-proxy:
    image: tecnativa/docker-socket-proxy:latest
    container_name: socket-proxy
    restart: unless-stopped
    environment:
      - CONTAINERS=1
      - NETWORKS=1
      - SERVICES=1
      - TASKS=1
      - POST=0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - traefik_proxy

  traefik:
    image: traefik:latest
    container_name: traefik
    restart: unless-stopped
    depends_on:
      - socket-proxy
    command:
      - --providers.docker=true
      - --providers.docker.endpoint=tcp://socket-proxy:2375
      - --providers.docker.exposedByDefault=false
      - --providers.docker.network=traefik_proxy
      - --entrypoints.web.address=:80
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --entrypoints.web.http.redirections.entrypoint.scheme=https
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.le.acme.email=ops@example.com
      - --certificatesresolvers.le.acme.storage=/acme/acme.json
      - --certificatesresolvers.le.acme.tlschallenge=true
      - --log.level=INFO
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./acme:/acme
    networks:
      - traefik_proxy

networks:
  traefik_proxy:
    external: true
```

### `~/infra/postgres/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: planazo_db
      POSTGRES_PASSWORD: <strong-password>
      POSTGRES_DB: planazo
    command:
      - postgres
      - -c
      - shared_buffers=256MB
      - -c
      - effective_cache_size=768MB
      - -c
      - work_mem=8MB
      - -c
      - max_connections=80
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d:ro
    networks:
      - traefik_proxy
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U planazo_db"]
      interval: 30s
      timeout: 5s
      retries: 5

volumes:
  pgdata:

networks:
  traefik_proxy:
    external: true
```

### `~/infra/postgres/init/01-create-databases.sql`

```sql
CREATE DATABASE goscan OWNER planazo_db;
GRANT ALL PRIVILEGES ON DATABASE goscan TO planazo_db;
```

### `~/infra/redis/docker-compose.yml`

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    command:
      - redis-server
      - --maxmemory
      - 200mb
      - --maxmemory-policy
      - allkeys-lru
      - --save
      - ""
    volumes:
      - redisdata:/data
    networks:
      - traefik_proxy

volumes:
  redisdata:

networks:
  traefik_proxy:
    external: true
```

### `~/apps/planazo/docker-compose.prod.yml`

```yaml
services:
  django:
    build:
      context: ./backend
    image: wedding-project-django
    container_name: wedding-project-django-1
    restart: unless-stopped
    env_file: .env.production
    command: gunicorn core.wsgi:application --bind 0.0.0.0:8000 --workers 3 --threads 2 --max-requests 500 --max-requests-jitter 50 --timeout 90
    volumes:
      - media:/app/media
      - static:/app/staticfiles
    expose:
      - "8000"
    networks:
      - traefik_proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_proxy
      - traefik.http.routers.planazo-api.rule=Host(`api.planazo.in`)
      - traefik.http.routers.planazo-api.entrypoints=websecure
      - traefik.http.routers.planazo-api.tls.certresolver=le
      - traefik.http.services.planazo-api.loadbalancer.server.port=8000

  celery:
    build:
      context: ./backend
    image: wedding-project-celery
    container_name: wedding-project-celery-1
    restart: unless-stopped
    env_file: .env.production
    command: celery -A core worker -l info --concurrency=2 --max-tasks-per-child=100
    volumes:
      - media:/app/media
    networks:
      - traefik_proxy
    depends_on:
      - django

  fastapi:
    build:
      context: ./fastapi
    image: wedding-project-fastapi
    container_name: wedding-project-fastapi-1
    restart: unless-stopped
    env_file: .env.production
    command: uvicorn main:app --host 0.0.0.0 --port 8001 --workers 1
    expose:
      - "8001"
    networks:
      - traefik_proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_proxy
      - traefik.http.routers.planazo-ai.rule=Host(`ai.planazo.in`)
      - traefik.http.routers.planazo-ai.entrypoints=websecure
      - traefik.http.routers.planazo-ai.tls.certresolver=le
      - traefik.http.services.planazo-ai.loadbalancer.server.port=8001

  frontend:
    build:
      context: ./frontend
      args:
        NEXT_PUBLIC_API_URL: https://api.planazo.in
        NEXT_PUBLIC_FASTAPI_URL: https://ai.planazo.in
        NEXT_PUBLIC_SITE_URL: https://planazo.in
        NODE_ENV: production
    image: wedding-project-frontend
    container_name: wedding-project-frontend-1
    restart: unless-stopped
    env_file: .env.production
    environment:
      - NODE_ENV=production
    working_dir: /app
    command: sh -c "npm run build && NODE_ENV=production npm run start -- -p 3000 -H 0.0.0.0"
    expose:
      - "3000"
    networks:
      - traefik_proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_proxy
      - traefik.http.routers.planazo.rule=Host(`planazo.in`) || Host(`www.planazo.in`)
      - traefik.http.routers.planazo.entrypoints=websecure
      - traefik.http.routers.planazo.tls.certresolver=le
      - traefik.http.services.planazo.loadbalancer.server.port=3000

volumes:
  media:
  static:

networks:
  traefik_proxy:
    external: true
```

### Equivalent NGINX config (for the NGINX path)

```nginx
# /etc/nginx/sites-available/planazo.conf

upstream planazo_frontend  { server 127.0.0.1:3000; }
upstream planazo_api       { server 127.0.0.1:8000; }
upstream planazo_ai        { server 127.0.0.1:8001; }

# HTTP → HTTPS redirect for all domains
server {
    listen 80;
    server_name planazo.in www.planazo.in api.planazo.in ai.planazo.in;
    return 301 https://$host$request_uri;
}

# Public site
server {
    listen 443 ssl;
    http2 on;
    server_name planazo.in www.planazo.in;

    ssl_certificate     /etc/letsencrypt/live/planazo.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/planazo.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://planazo_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 60s;
    }
}

# API
server {
    listen 443 ssl;
    http2 on;
    server_name api.planazo.in;

    ssl_certificate     /etc/letsencrypt/live/api.planazo.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.planazo.in/privkey.pem;

    location / {
        proxy_pass http://planazo_api;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# AI / FastAPI
server {
    listen 443 ssl;
    http2 on;
    server_name ai.planazo.in;

    ssl_certificate     /etc/letsencrypt/live/ai.planazo.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.planazo.in/privkey.pem;

    location / {
        proxy_pass http://planazo_ai;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 15. Appendix B: Troubleshooting Cheat Sheet

| Symptom | First check | Likely cause | Fix |
|---|---|---|---|
| `ERR_CONNECTION_REFUSED` in browser | `dig +short <domain> @1.1.1.1` | DNS not pointing here | Update A records at registrar |
| `ERR_CERT_AUTHORITY_INVALID` | `docker logs traefik | grep -i acme` | Self-signed cert (real not issued) | Wait for issuance / clear HSTS |
| `Permission denied (publickey)` | `ssh -v` to see key offer | Wrong key, perms, or username | `chmod 700`/`600`, retry |
| `ModuleNotFoundError` in Django | `find backend -name wsgi.py` | Wrong module name in gunicorn cmd | Update compose command |
| Empty `SECRET_KEY` error | `grep ^SECRET .env.production` | Generation failed silently | Regenerate with `openssl rand` |
| `client version 1.24 is too old` | `which docker; snap list | grep docker` | Snap docker installed | Remove snap, install from apt |
| `blob not found` on docker pull | `ls /var/lib/containerd/...` | Corrupted containerd state | Wipe & reinstall containerd |
| Traefik returns 404 for known host | `docker inspect <container> | grep traefik` | Labels not on container | Add labels + force-recreate |
| Container at memory limit | `docker stats` shows `MemPerc 99%` | Insufficient limit or runaway process | Raise limit or fix workload |
| Let's Encrypt 429 rate limit | `docker logs traefik | grep rateLimited` | Too many failed attempts | Wait for window, fix cause first |

---

## 16. Appendix C: Command Reference

### Linux / Server

```bash
ss -tulpn                      # listening sockets
ps auxf                        # process tree
free -h                        # memory
df -h /                        # disk
uptime                         # load
journalctl -u <service> -f     # follow systemd logs
sudo ufw status verbose        # firewall rules
fail2ban-client status sshd    # banned IPs
```

### Docker

```bash
docker ps                                          # running containers
docker ps -a                                       # all containers
docker logs -f <name>                              # follow logs
docker exec -it <name> sh                          # shell into container
docker stats --no-stream                           # resource usage snapshot
docker inspect <name>                              # full container metadata
docker network ls                                  # networks
docker volume ls                                   # volumes
docker system prune -f                             # cleanup
docker system df                                   # disk usage by docker
```

### Docker Compose

```bash
docker compose -f <file> up -d                     # bring up
docker compose -f <file> down                      # stop and remove
docker compose -f <file> ps                        # status
docker compose -f <file> logs --tail 50 <service>  # logs
docker compose -f <file> restart <service>         # restart one service
docker compose -f <file> up -d --force-recreate    # recreate all
docker compose -f <file> build                     # rebuild images
docker compose -f <file> exec <service> <command>  # run command
docker compose -f <file> config                    # print resolved config
```

### Git on Server

```bash
cd ~/apps/planazo
git status
git log --oneline -5
git pull origin production
git checkout <sha>             # rollback
```

### DNS

```bash
dig +short <domain> @1.1.1.1   # ask Cloudflare
dig +short <domain> @8.8.8.8   # ask Google
nslookup -type=NS <domain>     # which nameservers serve this
host -a <domain>               # all record types
```

### SSL

```bash
echo | openssl s_client -connect <domain>:443 -servername <domain> 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates
```

### Postgres

```bash
docker exec -it postgres psql -U planazo_db -d planazo
\l                             # list databases
\du                            # list users
\dt                            # list tables in current db
\q                             # quit

# Backup
docker exec postgres pg_dump -U planazo_db planazo > backup.sql
# Restore
docker exec -i postgres psql -U planazo_db planazo < backup.sql
```

### Traefik

```bash
docker logs traefik --tail 50 | grep -iE "router|certificate|error"
docker exec traefik traefik version
```

---

## 17. Appendix D: Deployment Checklist

### Before deploying a new site

- [ ] Domain registered, DNS access available
- [ ] Repo's deploy key on GitHub
- [ ] Site's tech stack identified (frameworks, build commands, env vars expected)
- [ ] Database name decided (and pre-created in shared Postgres if needed)
- [ ] Memory budget calculated (does it fit in remaining RAM?)
- [ ] Subdomains decided (app, api, etc.)
- [ ] DNS A records added → wait for propagation
- [ ] `dig +short <domain> @1.1.1.1` returns droplet IP

### During deployment

- [ ] Clone repo to `~/apps/<name>/`
- [ ] Write `.env.production` with strong secrets (chmod 600)
- [ ] Write `docker-compose.prod.yml` with Traefik labels and memory limits
- [ ] Confirm host rule contains no markdown syntax
- [ ] `docker compose build`
- [ ] `docker compose up -d`
- [ ] Watch logs: `docker compose logs -f`
- [ ] Run one-time setup (migrate, collectstatic, createsuperuser)
- [ ] Confirm `docker compose ps` shows all containers `Up`
- [ ] Check `docker stats` — no container at memory limit

### After deployment

- [ ] Trigger SSL: `curl -I https://<domain>`
- [ ] Verify cert: `docker logs traefik | grep "certificate obtained"`
- [ ] Smoke test in browser: home, login, key features
- [ ] Document in shared runbook
- [ ] Add to monitoring (uptime check on home page)
- [ ] Confirm backups include the new site's data

---

## 18. Appendix E: Maintenance Checklist

### Daily

- [ ] `docker ps` — all containers healthy
- [ ] `free -h && df -h /` — no resource exhaustion
- [ ] Check uptime monitor — no recent incidents
- [ ] Glance at error logs: `docker compose logs --since 24h | grep -iE "error|exception"`

### Weekly

- [ ] Backups verified — restore one to a scratch DB and confirm data
- [ ] OS patches: `sudo apt list --upgradable`
- [ ] Docker image scan: `docker scout cves <image>` for each
- [ ] Review fail2ban bans: `sudo fail2ban-client status sshd`
- [ ] Disk cleanup: `docker system prune -f`

### Monthly

- [ ] Apply pending OS updates: `sudo apt update && sudo apt upgrade`
- [ ] Update Docker images: `docker compose pull && docker compose up -d`
- [ ] Verify SSL renewal happened (Traefik logs)
- [ ] Review access logs for suspicious traffic
- [ ] Test rollback procedure on a non-prod environment

### Quarterly

- [ ] Rotate secrets (DB passwords, API keys)
- [ ] Review user list (`cat /etc/passwd`) — remove ex-employees
- [ ] Review GitHub deploy keys — remove unused
- [ ] Capacity planning — current RAM/CPU/disk vs trajectory
- [ ] Disaster recovery drill — provision a fresh droplet from scratch and restore

---

## Final Notes

This handbook represents one team's deployment journey — including every mistake. Reading the troubleshooting section in particular is more valuable than memorising clean documentation. Production teaches by inflicting reality, and the cases in [Section 11](#11-real-problems-we-faced) are the kinds of issues you'll face on every real deployment.

If you're new to DevOps, the most important advice from this document:

1. **Test the change you can undo before the change you can't.** A reversible deploy is a safe one.
2. **Read the actual error.** Most outages have a clear root cause in the logs; people just don't look.
3. **Verify each layer.** Browser → DNS → firewall → proxy → app → DB. Bisect.
4. **Document as you go.** The handbook you write during deployment is the runbook future-you will thank you for at 3 AM.

— Engineering Team
