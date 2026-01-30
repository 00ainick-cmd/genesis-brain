# GENESIS AWS Deployment Guide

Deploy GENESIS to your EC2 server (3.145.171.79) for Clawdbot integration.

## Quick Deploy

### 1. Upload to EC2

```bash
# From your local machine (where genesis-deploy.tar.gz is)
scp genesis-deploy.tar.gz ubuntu@3.145.171.79:~/
```

### 2. SSH into EC2 and Extract

```bash
ssh ubuntu@3.145.171.79

# Extract
mkdir -p ~/genesis
cd ~/genesis
tar -xzvf ~/genesis-deploy.tar.gz

# Install dependencies
cd backend
npm install --production
```

### 3. Set Environment Variables

```bash
# Add to ~/.bashrc or create /etc/genesis.env
export GENESIS_API_KEY="4a0a644e6fa274fd014fdb64c06682f4579cc2b7630cc50c86cf1d57c835ae58"
export PORT=4000
export NODE_ENV=production
```

### 4. Run GENESIS

**Option A: Direct (for testing)**
```bash
cd ~/genesis/backend
node src/index.js
```

**Option B: Using PM2 (recommended)**
```bash
# Install PM2
npm install -g pm2

# Start GENESIS
cd ~/genesis/backend
pm2 start src/index.js --name genesis

# Auto-start on boot
pm2 startup
pm2 save
```

**Option C: Systemd Service**
```bash
# Run the setup script
chmod +x ~/genesis/deploy/aws-setup.sh
~/genesis/deploy/aws-setup.sh
```

### 5. Verify

```bash
# Test the API
curl http://localhost:4000/api/health
curl -H "X-Genesis-API-Key: 4a0a644e6fa274fd014fdb64c06682f4579cc2b7630cc50c86cf1d57c835ae58" \
     http://localhost:4000/api/v1/clawdbot/dashboard
```

---

## Clawdbot Integration

### Add GENESIS commands to Clawdbot

1. Copy `clawdbot-integration.js` to your Clawdbot directory:
```bash
cp ~/genesis/deploy/clawdbot-integration.js ~/clawdbot/
```

2. Add environment variables to Clawdbot:
```bash
# In your Clawdbot .env or startup script
export GENESIS_URL="http://localhost:4000"
export GENESIS_API_KEY="4a0a644e6fa274fd014fdb64c06682f4579cc2b7630cc50c86cf1d57c835ae58"
```

3. Update your Clawdbot message handler:
```javascript
const genesis = require('./clawdbot-integration');

// In your message handler:
bot.on('message', async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;

  // Check for GENESIS commands first
  const handled = await genesis.handleGenesisCommand(text, (message, opts) => {
    bot.sendMessage(chatId, message, opts);
  });

  if (handled) return;

  // ... your other handlers
});
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/add <text>` | Quick capture to inbox |
| `/status` or `/g` | Dashboard summary |
| `/next` | List next actions |
| `/done <id>` | Complete an action |
| `/projects` | List active projects |
| `/inbox` | Show inbox items |
| `/ping` | Health check |

### Example Usage

```
You: /add Call John about the proposal
Bot: 📥 Added to inbox: "Call John about the proposal"

You: /status
Bot: 🎮 GENESIS Dashboard
     📥 Inbox: 5
     ⚡ Next Actions: 10
     ⏳ Waiting: 1
     📁 Active Projects: 7

     Top Actions:
     1. 🔥 Build CAET Pro scenario-based exam questions
     2. ⚡ Update aea.net/convention with sponsor logos
     ...

You: /done 3
Bot: ✅ Completed: "Update aea.net/convention with sponsor logos"
```

---

## API Reference

Base URL: `http://localhost:4000/api/v1/clawdbot`

All endpoints require header: `X-Genesis-API-Key: <your-key>`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/capture` | Add to inbox |
| GET | `/dashboard` | Get stats |
| GET | `/actions` | List actions |
| POST | `/actions/:id/complete` | Complete action |
| POST | `/actions/:id/status` | Update status |
| GET | `/projects` | List projects |
| GET | `/inbox` | Get inbox items |
| POST | `/inbox/:id/process` | Process inbox |
| GET | `/health` | Health check |

---

## Troubleshooting

**GENESIS won't start:**
```bash
# Check logs
pm2 logs genesis
# or
journalctl -u genesis -f
```

**API returns 403:**
- Verify GENESIS_API_KEY is set correctly
- Check header: `X-Genesis-API-Key`

**Clawdbot can't connect:**
```bash
# Make sure GENESIS is running
curl http://localhost:4000/api/health

# Check firewall
sudo ufw status
```

---

## Security Notes

1. Keep your API key secret
2. Consider using HTTPS with nginx reverse proxy
3. Restrict API access to localhost if Clawdbot runs on same server
4. Rotate API key periodically

---

Generated: $(date)
API Key: 4a0a644e6fa274fd014fdb64c06682f4579cc2b7630cc50c86cf1d57c835ae58
