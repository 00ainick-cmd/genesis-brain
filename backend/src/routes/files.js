// File References API
// Stores file metadata/references (actual files live on disk or S3)

import { Router } from 'express'
import { getDb } from '../db/init.js'

const db = () => getDb()
const router = Router()

// Initialize file_references table if not exists
const initTable = () => {
  try {
    db().prepare(`
      CREATE TABLE IF NOT EXISTS file_references (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT,
        path TEXT,
        url TEXT,
        size INTEGER,
        mime_type TEXT,
        domain TEXT,
        related_type TEXT,
        related_id INTEGER,
        tags TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run()
  } catch (e) {
    // Table might already exist
  }
}

// List file references
router.get('/', (req, res) => {
  initTable()
  const { domain, related_type, related_id, type } = req.query

  let sql = 'SELECT * FROM file_references WHERE 1=1'
  const params = []

  if (domain) {
    sql += ' AND domain = ?'
    params.push(domain)
  }
  if (related_type) {
    sql += ' AND related_type = ?'
    params.push(related_type)
  }
  if (related_id) {
    sql += ' AND related_id = ?'
    params.push(related_id)
  }
  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }

  sql += ' ORDER BY created_at DESC'

  try {
    const files = db().prepare(sql).all(...params)
    res.json(files)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create file reference
router.post('/', (req, res) => {
  initTable()
  const { name, type, path, url, size, mime_type, domain, related_type, related_id, tags, notes } = req.body

  if (!name) {
    return res.status(400).json({ error: 'name is required' })
  }

  if (!path && !url) {
    return res.status(400).json({ error: 'Either path or url is required' })
  }

  try {
    db().prepare(`
      INSERT INTO file_references (name, type, path, url, size, mime_type, domain, related_type, related_id, tags, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      name, type || null, path || null, url || null, size || null, mime_type || null,
      domain || null, related_type || null, related_id || null,
      tags ? JSON.stringify(tags) : null, notes || null
    )

    const file = db().prepare('SELECT * FROM file_references ORDER BY id DESC LIMIT 1').get()
    res.status(201).json(file)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single file reference
router.get('/:id', (req, res) => {
  initTable()
  try {
    const file = db().prepare('SELECT * FROM file_references WHERE id = ?').get(req.params.id)
    if (!file) {
      return res.status(404).json({ error: 'File reference not found' })
    }
    res.json(file)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update file reference
router.put('/:id', (req, res) => {
  initTable()
  const { name, type, path, url, size, mime_type, domain, related_type, related_id, tags, notes } = req.body

  try {
    const existing = db().prepare('SELECT * FROM file_references WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'File reference not found' })
    }

    db().prepare(`
      UPDATE file_references SET
        name = COALESCE(?, name),
        type = ?,
        path = ?,
        url = ?,
        size = ?,
        mime_type = ?,
        domain = ?,
        related_type = ?,
        related_id = ?,
        tags = ?,
        notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name, type, path, url, size, mime_type, domain, related_type, related_id,
      tags ? JSON.stringify(tags) : existing.tags, notes,
      req.params.id
    )

    const file = db().prepare('SELECT * FROM file_references WHERE id = ?').get(req.params.id)
    res.json(file)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete file reference
router.delete('/:id', (req, res) => {
  initTable()
  try {
    const existing = db().prepare('SELECT * FROM file_references WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'File reference not found' })
    }

    db().prepare('DELETE FROM file_references WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: 'File reference deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
