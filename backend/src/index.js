import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import session from 'express-session'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
dotenv.config()

// Import routes
import authRoutes from './routes/auth.js'
import inboxRoutes from './routes/inbox.js'
import actionsRoutes from './routes/actions.js'
import projectsRoutes from './routes/projects.js'
import areasRoutes from './routes/areas.js'
import resourcesRoutes from './routes/resources.js'
import aiRoutes from './routes/ai.js'
import caetRoutes from './routes/caet.js'
import genealogyRoutes from './routes/genealogy.js'
import dashboardRoutes from './routes/dashboard.js'
import weeklyReviewRoutes from './routes/weeklyReview.js'
import clawdbotRoutes from './routes/clawdbot.js'
import filesRoutes from './routes/files.js'
import memoryRoutes from './routes/memory.js'

// Import middleware
import { apiKeyAuth, identifyClient } from './middleware/apiAuth.js'

// Initialize database
import { initDatabase } from './db/init.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for dev
}))
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true
}))
app.use(morgan('dev'))
app.use(express.json())

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'genesis-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}))

// API Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/inbox', inboxRoutes)
app.use('/api/v1/actions', actionsRoutes)
app.use('/api/v1/projects', projectsRoutes)
app.use('/api/v1/areas', areasRoutes)
app.use('/api/v1/resources', resourcesRoutes)
app.use('/api/v1/ai', aiRoutes)
app.use('/api/v1/caet', caetRoutes)
app.use('/api/v1/genealogy', genealogyRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/weekly-reviews', weeklyReviewRoutes)

// Clawdbot API routes (protected with API key)
app.use('/api/v1/clawdbot', apiKeyAuth, identifyClient, clawdbotRoutes)

// File references API
app.use('/api/v1/files', filesRoutes)

// AI Memory API (for Ace and other AI assistants)
app.use('/api/v1/memory', memoryRoutes)

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: 'GENESIS API',
    version: '1.0.0',
    status: 'running',
    frontend: 'http://localhost:5173',
    docs: {
      health: '/api/health',
      auth: '/api/v1/auth',
      inbox: '/api/v1/inbox',
      actions: '/api/v1/actions',
      projects: '/api/v1/projects',
      areas: '/api/v1/areas',
      resources: '/api/v1/resources',
      ai: '/api/v1/ai',
      dashboard: '/api/v1/dashboard',
      clawdbot: '/api/v1/clawdbot (API key required)',
      files: '/api/v1/files',
      memory: '/api/v1/memory'
    }
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Initialize database and start server
async function start() {
  try {
    await initDatabase()

    app.listen(PORT, () => {
      console.log(`
  ╔════════════════════════════════════════╗
  ║           GENESIS Backend              ║
  ║     Running on http://localhost:${PORT}    ║
  ╚════════════════════════════════════════╝
      `)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()

export default app
