#!/bin/bash
# ============================================================
#  ISP MANAGEMENT SYSTEM - AUTO INSTALLER
#  Ubuntu 20.04 / 22.04 LTS
# ============================================================
set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

INSTALL_DIR="/opt/isp-system"
DB_NAME="isp_system"; DB_USER="isp_admin"
DB_PASS=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
APP_SECRET=$(openssl rand -base64 32)
NODE_VERSION="20"

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
info()  { echo -e "${BLUE}[i]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step()  { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"; }

print_banner() {
  echo -e "${CYAN}${BOLD}"
  echo "  ██╗███████╗██████╗     ███╗   ███╗ ██████╗ ███╗  "
  echo "  ██║██╔════╝██╔══██╗   ████╗ ████║██╔════╝ ████╗ "
  echo "  ██║███████╗██████╔╝   ██╔████╔██║██║  ███╗██╔██╗ "
  echo "  ██║╚════██║██╔═══╝    ██║╚██╔╝██║██║   ██║██║╚██╗"
  echo "  ██║███████║██║        ██║ ╚═╝ ██║╚██████╔╝██║ ╚██"
  echo -e "  ╚═╝╚══════╝╚═╝        ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ${NC}"
  echo -e "\n  ${BOLD}ISP Management System v1.0${NC} | Ubuntu Installer"
  echo -e "  ${YELLOW}Mikrotik • ACS GeNIe • PPPoE • Payment • WhatsApp${NC}\n"
}

check_root() {
  [ "$EUID" -ne 0 ] && error "Jalankan: sudo bash install.sh"
  grep -qi "ubuntu" /etc/os-release || error "Hanya Ubuntu 20.04/22.04"
  log "Ubuntu OS verified"
}

get_ip() {
  SERVER_IP=$(hostname -I | awk '{print $1}')
  info "IP Server: ${SERVER_IP}"
}

collect_config() {
  step "Konfigurasi Sistem"
  read -p "Domain/IP publik [${SERVER_IP}]: " APP_DOMAIN; APP_DOMAIN=${APP_DOMAIN:-$SERVER_IP}
  read -p "Port backend [3000]: " APP_PORT; APP_PORT=${APP_PORT:-3000}
  read -p "Email admin: " ADMIN_EMAIL
  read -s -p "Password admin: " ADMIN_PASS; echo ""
  echo ""
  echo -e "${YELLOW}--- Mikrotik ---${NC}"
  read -p "IP Mikrotik: " MIKROTIK_IP
  read -p "User Mikrotik [admin]: " MIKROTIK_USER; MIKROTIK_USER=${MIKROTIK_USER:-admin}
  read -s -p "Pass Mikrotik: " MIKROTIK_PASS; echo ""
  echo ""
  echo -e "${YELLOW}--- Payment Gateway ---${NC}"
  read -p "Midtrans Server Key: " MIDTRANS_KEY
  read -p "Midtrans Client Key: " MIDTRANS_CLIENT
  read -p "Xendit Secret Key: " XENDIT_KEY
  echo ""
  echo -e "${YELLOW}--- WhatsApp Fonnte ---${NC}"
  read -p "Fonnte Token: " FONNTE_TOKEN
  echo ""
  echo -e "${YELLOW}--- Google Maps ---${NC}"
  read -p "Google Maps API Key: " GMAPS_KEY
}

install_deps() {
  step "Install Dependensi"
  apt-get update -qq
  apt-get install -y -qq curl wget git unzip build-essential \
    nginx certbot python3-certbot-nginx \
    postgresql postgresql-contrib redis-server ufw htop net-tools
  log "Semua dependensi terinstall"
}

install_node() {
  step "Install Node.js ${NODE_VERSION}"
  command -v node &>/dev/null || {
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - 2>/dev/null
    apt-get install -y nodejs 2>/dev/null
  }
  npm install -g pm2 2>/dev/null
  log "Node.js $(node -v) + PM2 siap"
}

setup_db() {
  step "Setup PostgreSQL + Redis"
  systemctl start postgresql && systemctl enable postgresql
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
  systemctl start redis-server && systemctl enable redis-server
  log "Database siap"
}

create_env() {
  step "Konfigurasi .env"
  mkdir -p ${INSTALL_DIR}/backend
  cat > ${INSTALL_DIR}/backend/.env << EOF
NODE_ENV=production
PORT=${APP_PORT}
APP_URL=http://${APP_DOMAIN}
JWT_SECRET=${APP_SECRET}
DB_HOST=localhost
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
REDIS_URL=redis://localhost:6379
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASS=${ADMIN_PASS}
MIKROTIK_IP=${MIKROTIK_IP}
MIKROTIK_USER=${MIKROTIK_USER}
MIKROTIK_PASS=${MIKROTIK_PASS}
MIKROTIK_PORT=8728
MIDTRANS_KEY=${MIDTRANS_KEY}
MIDTRANS_CLIENT=${MIDTRANS_CLIENT}
MIDTRANS_MODE=production
XENDIT_KEY=${XENDIT_KEY}
FONNTE_TOKEN=${FONNTE_TOKEN}
FONNTE_URL=https://api.fonnte.com/send
ACS_URL=http://${APP_DOMAIN}:7547
GMAPS_KEY=${GMAPS_KEY}
EOF
  chmod 600 ${INSTALL_DIR}/backend/.env
  log ".env dibuat"
}

install_app() {
  step "Install Aplikasi"
  cp -r /tmp/isp-system/* ${INSTALL_DIR}/ 2>/dev/null || true
  cd ${INSTALL_DIR}/backend && npm install --silent 2>/dev/null
  cd ${INSTALL_DIR}/frontend && npm install --silent && npm run build --silent 2>/dev/null
  log "Aplikasi terinstall"
}

setup_nginx() {
  step "Konfigurasi Nginx"
  cat > /etc/nginx/sites-available/isp-system << EOF
server {
    listen 80;
    server_name ${APP_DOMAIN};
    location / {
        root ${INSTALL_DIR}/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
    location /api { proxy_pass http://localhost:${APP_PORT}; proxy_set_header Host \$host; proxy_set_header X-Real-IP \$remote_addr; }
    location /ws  { proxy_pass http://localhost:${APP_PORT}; proxy_http_version 1.1; proxy_set_header Upgrade \$http_upgrade; proxy_set_header Connection "Upgrade"; }
    location /webhook { proxy_pass http://localhost:${APP_PORT}; }
    location /acs { proxy_pass http://localhost:7547; }
    client_max_body_size 50M;
}
EOF
  ln -sf /etc/nginx/sites-available/isp-system /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  log "Nginx siap"
}

setup_pm2() {
  step "PM2 Process Manager"
  mkdir -p /var/log/isp-system
  cat > ${INSTALL_DIR}/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    { name: 'isp-backend',   script: './backend/src/app.js',              cwd: '/opt/isp-system', instances: 'max', exec_mode: 'cluster' },
    { name: 'isp-scheduler', script: './backend/src/services/scheduler.js', cwd: '/opt/isp-system', instances: 1 }
  ]
}
EOF
  cd ${INSTALL_DIR}
  pm2 start ecosystem.config.js 2>/dev/null || true
  pm2 save 2>/dev/null || true
  pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash 2>/dev/null || true
  log "PM2 running"
}

setup_firewall() {
  ufw --force enable 2>/dev/null
  for port in 22 80 443 7547; do ufw allow ${port}/tcp 2>/dev/null; done
  log "Firewall aktif"
}

print_summary() {
  step "✅ INSTALASI SELESAI"
  echo -e "${GREEN}${BOLD}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║   ISP SYSTEM BERHASIL DIINSTALL! 🎉     ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo -e "${NC}"
  echo -e "  ${BOLD}Dashboard Admin:${NC}   http://${APP_DOMAIN}/admin"
  echo -e "  ${BOLD}Portal Klien:${NC}      http://${APP_DOMAIN}"
  echo -e "  ${BOLD}Cek Tagihan:${NC}       http://${APP_DOMAIN}/cek-tagihan"
  echo -e "  ${BOLD}ACS GeNIe:${NC}         http://${APP_DOMAIN}:7547"
  echo -e "  ${BOLD}Email Admin:${NC}       ${ADMIN_EMAIL}"
  echo ""
  echo -e "  ${YELLOW}DB Password: ${DB_PASS}${NC}"
  echo -e "  ${YELLOW}Tersimpan di: /root/isp-credentials.txt${NC}"
  echo ""
  echo -e "  ${CYAN}pm2 status${NC}           → cek proses"
  echo -e "  ${CYAN}pm2 logs isp-backend${NC} → lihat logs"
  echo -e "  ${CYAN}pm2 restart all${NC}      → restart"
  cat > /root/isp-credentials.txt << CREDS
ISP SYSTEM - CREDENTIALS
URL: http://${APP_DOMAIN}
Admin: ${ADMIN_EMAIL} / ${ADMIN_PASS}
DB: ${DB_NAME} / ${DB_USER} / ${DB_PASS}
CREDS
  chmod 600 /root/isp-credentials.txt
}

print_banner; check_root; get_ip; collect_config
install_deps; install_node; setup_db; create_env
setup_nginx; setup_pm2; setup_firewall; print_summary
