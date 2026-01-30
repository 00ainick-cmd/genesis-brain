import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List inbox items
router.get('/', (req, res) => {
  try {
    const items = db().prepare(`
      SELECT * FROM inbox
      WHERE processed_at IS NULL
      ORDER BY created_at DESC
    `).all()
    res.json(items)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Add to inbox
router.post('/', (req, res) => {
  const { raw_input, source } = req.body

  if (!raw_input) {
    return res.status(400).json({ error: 'raw_input is required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO inbox (raw_input, source)
      VALUES (?, ?)
    `).run(raw_input, source || 'manual')

    const item = db().prepare('SELECT * FROM inbox WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(item)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Process inbox item (manual)
router.post('/:id/process', (req, res) => {
  const { processed_to, ai_notes } = req.body

  try {
    db().prepare(`
      UPDATE inbox SET
        processed_at = CURRENT_TIMESTAMP,
        processed_to = ?,
        ai_notes = ?
      WHERE id = ?
    `).run(processed_to || 'action', ai_notes, req.params.id)

    const item = db().prepare('SELECT * FROM inbox WHERE id = ?').get(req.params.id)
    res.json(item)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete inbox item
router.delete('/:id', (req, res) => {
  try {
    const result = db().prepare('DELETE FROM inbox WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
