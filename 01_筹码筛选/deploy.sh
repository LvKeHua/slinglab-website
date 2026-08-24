#!/bin/bash
# 筹码筛选 - Deploy Script
# Usage: bash deploy.sh

set -e

VPS_IP="192.255.193.128"
VPS_USER="root"
# 请在执行前设置: export VPS_PASS="your_password"
: "${VPS_PASS:?需要设置 VPS_PASS 环境变量}"
REMOTE_DIR="/opt/screener"

echo "=== Deploying Crypto Screener ==="

# 1. Create remote directory
echo "[1/6] Creating remote directory..."
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "mkdir -p $REMOTE_DIR/{backend,frontend,data,deploy}"

# 2. Copy project files
echo "[2/6] Copying project files..."
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r "$(dirname "$0")/backend" "$VPS_USER@$VPS_IP:$REMOTE_DIR/"
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r "$(dirname "$0")/frontend" "$VPS_USER@$VPS_IP:$REMOTE_DIR/"
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no "$(dirname "$0")/requirements.txt" "$VPS_USER@$VPS_IP:$REMOTE_DIR/"

# 3. Install Python dependencies
echo "[3/6] Installing Python dependencies..."
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "cd $REMOTE_DIR && pip3 install -r requirements.txt"

# 4. Setup systemd service
echo "[4/6] Setting up systemd service..."
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "cp $REMOTE_DIR/deploy/screener.service /etc/systemd/system/screener.service && systemctl daemon-reload && systemctl enable screener && systemctl restart screener"

# 5. Configure nginx
echo "[5/6] Configuring nginx..."
# Read current nginx config, add screener location before the last closing brace
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "grep -q 'location /screener/' /etc/nginx/sites-available/runnerxbt || sed -i '/^server {/a\    # Screener module\n    location /screener/ {\n        proxy_pass http://127.0.0.1:8001/;\n        proxy_set_header Host \$host;\n        proxy_set_header X-Real-IP \$remote_addr;\n        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto \$scheme;\n    }\n' /etc/nginx/sites-available/runnerxbt && systemctl reload nginx"

# 6. Update landing page
echo "[6/6] Updating landing page..."
LANDING="/opt/runnerxbt/landing/index.html"
sshpass -p "$VPS_PASS" ssh "$VPS_USER@$VPS_IP" "if [ -f $LANDING ]; then grep -q 'screener' $LANDING || sed -i 's|<a href=\"/r|\n    <a href=\"/screener/\" class=\"nav-link\">筹码筛选</a>\n    <a href=\"/r|' $LANDING; fi"

echo ""
echo "=== Deploy complete! ==="
echo "Service: https://app.slinglab.xyz/screener/"
echo "Status: systemctl status screener"
echo "Logs: journalctl -u screener -f"
