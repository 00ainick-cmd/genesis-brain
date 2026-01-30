#!/bin/bash
# GENESIS AWS Deployment Script
# Run this on your EC2 server (3.145.171.79)

set -e

echo "🎮 GENESIS AWS Deployment"
echo "========================="

# Configuration
GENESIS_DIR="/home/ubuntu/genesis"
NODE_VERSION="20"

# 1. Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node --version)"

# 2. Create GENESIS directory
echo "📁 Setting up GENESIS directory..."
mkdir -p $GENESIS_DIR
cd $GENESIS_DIR

# 3. Clone or update the repo (if using git)
# For now, we'll assume files are uploaded via scp

# 4. Install backend dependencies
echo "📦 Installing backend dependencies..."
cd $GENESIS_DIR/backend
npm install --production

# 5. Install frontend dependencies and build
echo "📦 Building frontend..."
cd $GENESIS_DIR/frontend
npm install
npm run build

# 6. Create systemd service for GENESIS
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/genesis.service > /dev/null <<EOF
[Unit]
Description=GENESIS Productivity System
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$GENESIS_DIR/backend
Environment=NODE_ENV=production
Environment=PORT=4000
Environment=GENESIS_API_KEY=\${GENESIS_API_KEY}
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 7. Enable and start service
echo "🚀 Starting GENESIS service..."
sudo systemctl daemon-reload
sudo systemctl enable genesis
sudo systemctl start genesis

# 8. Configure nginx (if installed) to proxy GENESIS
if command -v nginx &> /dev/null; then
    echo "🔧 Configuring nginx..."
    sudo tee /etc/nginx/sites-available/genesis > /dev/null <<EOF
server {
    listen 80;
    server_name genesis.yourdomain.com;  # Update this

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    location / {
        root $GENESIS_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
    sudo ln -sf /etc/nginx/sites-available/genesis /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
fi

echo ""
echo "✅ GENESIS deployed!"
echo ""
echo "📋 Next steps:"
echo "1. Set your API key: sudo systemctl set-environment GENESIS_API_KEY=your-secret-key"
echo "2. Restart: sudo systemctl restart genesis"
echo "3. Check status: sudo systemctl status genesis"
echo "4. View logs: sudo journalctl -u genesis -f"
echo ""
echo "🔗 GENESIS API: http://localhost:4000/api"
