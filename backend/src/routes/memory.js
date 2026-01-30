// AI Memory API
// For Ace (and other AI assistants) to store/retrieve decisions, preferences, context

import { Router } from 'express'
import { getDb } from '../db/init.js'

const db = () => getDb()
const router = Router()

// List memories
router.get('/', (req, res) => {
  const { type, domain, status, limit = 50 } = req.query

  let sql = 'SELECT * FROM ai_memory WHERE 1=1'
  const params = []

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }
  if (domain) {
    sql += ' AND domain = ?'
    params.push(domain)
  }
  if (status) {
    sql += ' AND status = ?'
    params.push(status)
  } else {
    sql += ' AND status = "active"'
  }

  sql += ' ORDER BY times_referenced DESC, created_at DESC LIMIT ?'
  params.push(parseInt(limit))

  try {
    const memories = db().prepare(sql).all(...params)
    res.json(memories)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create memory
router.post('/', (req, res) => {
  const { title, type, domain, content, confidence, expires_at } = req.body

  if (!title || !type || !content) {
    return res.status(400).json({ error: 'title, type, and content are required' })
  }

  // Valid types: preference, decision, context, fact, pattern, feedback
  const validTypes = ['preference', 'decision', 'context', 'fact', 'pattern', 'feedback', 'workflow', 'style']
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` })
  }

  try {
    db().prepare(`
      INSERT INTO ai_memory (title, type, domain, content, confidence, expires_at, status, times_referenced, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', 0, datetime('now'))
    `).run(title, type, domain || null, content, confidence || 'inferred', expires_at || null)

    const memory = db().prepare('SELECT * FROM ai_memory ORDER BY id DESC LIMIT 1').get()
    res.status(201).json(memory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single memory
router.get('/:id', (req, res) => {
  try {
    const memory = db().prepare('SELECT * FROM ai_memory WHERE id = ?').get(req.params.id)
    if (!memory) {
      return res.status(404).json({ error: 'Memory not found' })
    }

    // Increment reference count
    db().prepare(`
      UPDATE ai_memory SET times_referenced = times_referenced + 1, last_referenced = datetime('now')
      WHERE id = ?
    `).run(req.params.id)

    res.json(memory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update memory
router.put('/:id', (req, res) => {
  const { title, type, domain, content, confidence, status, expires_at } = req.body

  try {
    const existing = db().prepare('SELECT * FROM ai_memory WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' })
    }

    db().prepare(`
      UPDATE ai_memory SET
        title = COALESCE(?, title),
        type = COALESCE(?, type),
        domain = ?,
        content = COALESCE(?, content),
        confidence = COALESCE(?, confidence),
        status = COALESCE(?, status),
        expires_at = ?
      WHERE id = ?
    `).run(title, type, domain, content, confidence, status, expires_at, req.params.id)

    const memory = db().prepare('SELECT * FROM ai_memory WHERE id = ?').get(req.params.id)
    res.json(memory)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Archive memory (soft delete)
router.delete('/:id', (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM ai_memory WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Memory not found' })
    }

    db().prepare('UPDATE ai_memory SET status = "archived" WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: 'Memory archived' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Search memories
router.get('/search/:query', (req, res) => {
  const { query } = req.params
  const { type, domain } = req.query

  let sql = `SELECT * FROM ai_memory WHERE status = 'active' AND (title LIKE ? OR content LIKE ?)`
  const params = [`%${query}%`, `%${query}%`]

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }
  if (domain) {
    sql += ' AND domain = ?'
    params.push(domain)
  }

  sql += ' ORDER BY times_referenced DESC LIMIT 20'

  try {
    const memories = db().prepare(sql).all(...params)
    res.json(memories)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Quick capture - shorthand for creating common memory types
router.post('/capture', (req, res) => {
  const { type, text, domain } = req.body

  if (!text) {
    return res.status(400).json({ error: 'text is required' })
  }

  // Auto-detect type if not provided
  let memoryType = type || 'fact'
  let title = text.substring(0, 100)
  let content = text

  // If text starts with certain patterns, auto-classify
  if (text.toLowerCase().startsWith('nick prefers') || text.toLowerCase().startsWith('i prefer')) {
    memoryType = 'preference'
    title = text.replace(/^(nick prefers|i prefer)\s*/i, '').substring(0, 100)
  } else if (text.toLowerCase().startsWith('decided') || text.toLowerCase().startsWith('we decided')) {
    memoryType = 'decision'
    title = text.replace(/^(decided|we decided)\s*/i, '').substring(0, 100)
  } else if (text.toLowerCase().includes('workflow') || text.toLowerCase().includes('process')) {
    memoryType = 'workflow'
  }

  try {
    db().prepare(`
      INSERT INTO ai_memory (title, type, domain, content, confidence, status, times_referenced, created_at)
      VALUES (?, ?, ?, ?, 'inferred', 'active', 0, datetime('now'))
    `).run(title, memoryType, domain || null, content)

    const memory = db().prepare('SELECT * FROM ai_memory ORDER BY id DESC LIMIT 1').get()
    res.status(201).json({
      success: true,
      message: `✅ Stored as ${memoryType}: "${title}"`,
      memory
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get memories by type (for AI context loading)
router.get('/context/:domain', (req, res) => {
  const { domain } = req.params

  try {
    const preferences = db().prepare(`
      SELECT * FROM ai_memory WHERE type = 'preference' AND (domain = ? OR domain IS NULL) AND status = 'active'
      ORDER BY times_referenced DESC LIMIT 10
    `).all(domain)

    const decisions = db().prepare(`
      SELECT * FROM ai_memory WHERE type = 'decision' AND (domain = ? OR domain IS NULL) AND status = 'active'
      ORDER BY created_at DESC LIMIT 10
    `).all(domain)

    const workflows = db().prepare(`
      SELECT * FROM ai_memory WHERE type = 'workflow' AND (domain = ? OR domain IS NULL) AND status = 'active'
      ORDER BY times_referenced DESC LIMIT 5
    `).all(domain)

    const recent = db().prepare(`
      SELECT * FROM ai_memory WHERE (domain = ? OR domain IS NULL) AND status = 'active'
      ORDER BY last_referenced DESC LIMIT 10
    `).all(domain)

    res.json({
      preferences,
      decisions,
      workflows,
      recent,
      summary: {
        totalPreferences: preferences.length,
        totalDecisions: decisions.length,
        totalWorkflows: workflows.length
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
