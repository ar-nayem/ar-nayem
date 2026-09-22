#!/usr/bin/env bash
# One-command deploy/update for the printing order site.
#
# Run this ON THE VPS (over SSH), not from your laptop:
#   curl -fsSL https://raw.githubusercontent.com/ar-nayem/ar-nayem/claude/printing-order-site-t0i1so/printing-app/deploy.sh -o deploy.sh
#   bash deploy.sh
#
# Safe to re-run: it pulls the latest code and restarts the app. It never
# touches nginx, certbot, or anything belonging to your other projects on
# this box — those stay entirely manual (printed at the end) since they're
# shared, harder-to-reverse system config.
set -euo pipefail

REPO_URL="https://github.com/ar-nayem/ar-nayem.git"
BRANCH="claude/printing-order-site-t0i1so"
APP_DIR="${APP_DIR:-$HOME/printing-app-src}"
DOMAIN="${DOMAIN:-print.arnayem.top}"
PORT="${PORT:-3000}"
PM2_NAME="printing-app"

log() { echo -e "\n→ $*"; }

command -v node >/dev/null || { echo "node not found. Install Node 20+ first (e.g. via nvm), then re-run."; exit 1; }
command -v npm >/dev/null || { echo "npm not found alongside node — check your Node install."; exit 1; }
NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node $(node -v) found, but this app needs Node 20+. Install a newer Node first."
  exit 1
fi

log "Using Node $(node -v), app dir: $APP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  log "Existing checkout found — pulling latest..."
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$BRANCH"
else
  log "Cloning $REPO_URL ($BRANCH)..."
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR/printing-app"

if [ ! -f .env ]; then
  log "No .env yet — creating one."
  ABS_DB_PATH="$(pwd)/prisma/prod.db"
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [ -z "${ADMIN_PASSWORD:-}" ]; then
    read -srp "Pick a dashboard admin password (printing.../dashboard login): " ADMIN_PASSWORD
    echo
  fi
  cat > .env <<ENVEOF
DATABASE_URL="file:${ABS_DB_PATH}"
ADMIN_PASSWORD="${ADMIN_PASSWORD}"
SESSION_SECRET="${SESSION_SECRET}"
ENVEOF
  echo "✓ .env created. Dashboard password: ${ADMIN_PASSWORD}"
else
  log ".env already exists — leaving it as is."
fi

log "Installing dependencies..."
npm ci --legacy-peer-deps

log "Applying database migrations..."
npx prisma migrate deploy

log "Building..."
npm run build

command -v pm2 >/dev/null || { log "Installing pm2 globally..."; npm install -g pm2; }

if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  log "Restarting existing pm2 process '$PM2_NAME'..."
  pm2 restart "$PM2_NAME"
else
  log "Starting new pm2 process '$PM2_NAME' on port $PORT..."
  pm2 start npm --name "$PM2_NAME" --cwd "$(pwd)" -- start -- -p "$PORT"
fi
pm2 save

NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_CONF_STAGED="./nginx-${DOMAIN}.conf"
cat > "$NGINX_CONF_STAGED" <<NGINXEOF
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 100m;
    }
}
NGINXEOF

echo
echo "================================================================"
echo "  App is running: http://127.0.0.1:${PORT}  (pm2 process '${PM2_NAME}')"
echo "================================================================"
echo
if [ -f "$NGINX_CONF" ]; then
  echo "nginx already has a config at $NGINX_CONF — left untouched."
  echo "(compare it against ${NGINX_CONF_STAGED} if you changed the port/domain above)"
else
  echo "One nginx config generated at:"
  echo "  ${APP_DIR}/printing-app/${NGINX_CONF_STAGED}"
  echo
  echo "Not applied automatically — this touches shared system config on a box"
  echo "running your other sites, so review it yourself, then:"
  echo
  echo "  sudo cp ${APP_DIR}/printing-app/${NGINX_CONF_STAGED} ${NGINX_CONF}"
  echo "  sudo ln -s ${NGINX_CONF} /etc/nginx/sites-enabled/"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
  echo "  sudo certbot --nginx -d ${DOMAIN}"
  echo
  echo "DNS for ${DOMAIN} already resolves to this server, so certbot should"
  echo "just work once nginx is serving it on port 80."
fi
