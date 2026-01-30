import { Router } from 'express'
import { getDb } from '../db/init.js'

const router = Router()

// Helper to get database
const db = () => getDb()

// Check authentication status
router.get('/status', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated })
})

// Login
router.post('/login', (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password required' })
  }

  // Get stored password
  const setting = db().prepare('SELECT value FROM settings WHERE key = ?').get('password')
  const storedPassword = setting?.value || 'changeme'

  if (password === storedPassword) {
    req.session.authenticated = true
    res.json({ success: true })
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' })
  }
})

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' })
    }
    res.json({ success: true })
  })
})

// Change password
router.post('/change-password', (req, res) => {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords required' })
  }

  const setting = db().prepare('SELECT value FROM settings WHERE key = ?').get('password')
  const storedPassword = setting?.value || 'changeme'

  if (currentPassword !== storedPassword) {
    return res.status(401).json({ error: 'Current password incorrect' })
  }

  db().prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?')
    .run(newPassword, 'password')

  res.json({ success: true })
})

export default router
