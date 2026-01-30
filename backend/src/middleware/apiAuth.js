// API Authentication Middleware for Clawdbot and external integrations
// Uses a simple API key authentication

const GENESIS_API_KEY = process.env.GENESIS_API_KEY

export function apiKeyAuth(req, res, next) {
  // Skip auth for health checks
  if (req.path === '/api/health') {
    return next()
  }

  // Check for API key in header or query param
  const apiKey = req.headers['x-genesis-api-key'] ||
                 req.headers['authorization']?.replace('Bearer ', '') ||
                 req.query.api_key

  // If no API key is configured, allow all requests (dev mode)
  if (!GENESIS_API_KEY) {
    console.warn('⚠️  No GENESIS_API_KEY set - running in open mode')
    return next()
  }

  // Validate API key
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      hint: 'Include X-Genesis-API-Key header or ?api_key= query param'
    })
  }

  if (apiKey !== GENESIS_API_KEY) {
    return res.status(403).json({
      error: 'Invalid API key'
    })
  }

  next()
}

// Middleware to identify the client (Clawdbot, web, etc.)
export function identifyClient(req, res, next) {
  const clientId = req.headers['x-client-id'] || 'web'
  const clientVersion = req.headers['x-client-version'] || 'unknown'

  req.client = {
    id: clientId,
    version: clientVersion,
    isClawdbot: clientId === 'clawdbot',
    isTelegram: clientId === 'telegram'
  }

  next()
}

export default { apiKeyAuth, identifyClient }
