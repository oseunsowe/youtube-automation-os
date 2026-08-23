# Deploying to a VPS (e.g. Hostinger KVM)

This covers running the always-on production stack (`n8n` + `worker`) on a VPS instead of a Codespace, once you've verified the pipeline works. Everything here uses the same `docker-compose.yml` already in the repo — nothing VPS-specific to build.

## 1. Provision the VPS

Pick a plan sized for Chromium (Remotion) + ffmpeg rendering running alongside n8n — see the recommendation in chat; KVM 4 (4 vCPU / 16GB / 200GB) is the comfortable sweet spot, KVM 2 works for lighter/occasional use. Choose an **Ubuntu 22.04 or 24.04** image (Docker installs cleanest there).

## 2. Initial server setup

SSH in as root (or your provisioned user), then:

```bash
apt update && apt upgrade -y

# Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Create a non-root user to run things (optional but recommended)
adduser deploy
usermod -aG docker deploy
su - deploy
```

## 3. Get the code onto the server

The repo is private, so authenticate first:

```bash
# Option A: GitHub CLI (simplest)
sudo apt install gh -y
gh auth login
gh repo clone oseunsowe/youtube-automation-os
cd youtube-automation-os

# Option B: a fine-grained GitHub Personal Access Token
git clone https://<token>@github.com/oseunsowe/youtube-automation-os.git
cd youtube-automation-os
```

## 4. Configure secrets

```bash
cp .env.example .env
nano .env   # fill in real values -- see "API keys" below and docs/API_KEYS.md
```

## 5. Bring the stack up

```bash
docker compose up -d --build
docker compose logs -f    # watch it start; Ctrl+C to stop watching (containers keep running)
```

`n8n` listens on `5678`, `worker` on `4000`. Both have `restart: unless-stopped`, so they come back after a reboot or crash automatically (Docker's own daemon starts on boot via `systemctl enable docker` above).

## 6. Put n8n behind HTTPS with a real domain

Running n8n on `http://your-vps-ip:5678` works for testing, but you want HTTPS for anything real (n8n's own security warnings, and cleaner OAuth redirect handling). Point a domain/subdomain (e.g. `n8n.yourdomain.com`) at the VPS's IP, then put a reverse proxy in front:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Nginx site config (`/etc/nginx/sites-available/n8n`):
```nginx
server {
    listen 80;
    server_name n8n.yourdomain.com;
    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo certbot --nginx -d n8n.yourdomain.com   # free Let's Encrypt cert, auto-renews
```

Then update `docker-compose.yml`'s `n8n` service environment to match the real domain (`N8N_HOST=n8n.yourdomain.com`, `N8N_PROTOCOL=https`, `WEBHOOK_URL=https://n8n.yourdomain.com/`), and `docker compose up -d` again to apply.

**Don't put the `worker` service (port 4000) behind the reverse proxy or open it to the internet at all** — only `n8n` needs to be reachable by you; `n8n`'s HTTP Request nodes reach `worker` over the internal Docker network (`http://worker:4000`), never from outside. If you want extra safety, remove the `"4000:4000"` line from `docker-compose.yml`'s `worker` service entirely once you've confirmed things work, and only re-add it temporarily if you need to `curl` it directly for debugging.

## 7. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp   # nginx / HTTPS
sudo ufw enable
```
Leave `5678` and `4000` **closed** to the public internet — nginx on 443 is the only path to n8n.

## 8. Backups

Two things are worth backing up periodically: n8n's workflow/credential data (`n8n_data` Docker volume) and rendered output (`worker_data` volume, plus `.env`). A simple cron job:

```bash
0 3 * * * docker run --rm -v youtube-automation-os_n8n_data:/data -v /home/deploy/backups:/backup alpine tar czf /backup/n8n-$(date +\%F).tar.gz -C /data .
```
Ship `/home/deploy/backups` off-box (rclone to R2/S3/Google Drive, or Hostinger's own backup feature if included in your plan) rather than trusting a single disk.

## 9. Day-to-day

```bash
docker compose logs -f worker     # tail worker logs
docker compose restart worker     # after pulling code changes
git pull && docker compose up -d --build   # deploy new code
```

See `docs/QUICKSTART.md` for importing the n8n workflows and running the acceptance test once the stack is up.
