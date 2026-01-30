import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List areas
router.get('/', (req, res) => {
  try {
    const areas = db().prepare('SELECT * FROM areas ORDER BY name ASC').all()
    res.json(areas)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single area
router.get('/:id', (req, res) => {
  try {
    const area = db().prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id)
    if (!area) {
      return res.status(404).json({ error: 'Area not found' })
    }
    res.json(area)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create area
router.post('/', (req, res) => {
  const { name, icon, domain, description, standard, responsibilities, review_frequency } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO areas (name, icon, domain, description, standard, responsibilities, review_frequency)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, icon, domain, description, standard,
      responsibilities ? JSON.stringify(responsibilities) : null,
      review_frequency || 'monthly'
    )

    const area = db().prepare('SELECT * FROM areas WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(area)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update area
router.put('/:id', (req, res) => {
  const { name, icon, domain, description, standard, responsibilities, health, last_review, review_notes, review_frequency } = req.body

  try {
    db().prepare(`
      UPDATE areas SET
        name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        domain = ?,
        description = COALESCE(?, description),
        standard = COALESCE(?, standard),
        responsibilities = ?,
        health = COALESCE(?, health),
        last_review = ?,
        review_notes = ?,
        review_frequency = COALESCE(?, review_frequency),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name, icon, domain, description, standard,
      responsibilities ? JSON.stringify(responsibilities) : null,
      health, last_review, review_notes, review_frequency,
      req.params.id
    )

    const area = db().prepare('SELECT * FROM areas WHERE id = ?').get(req.params.id)
    res.json(area)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete area
router.delete('/:id', (req, res) => {
  try {
    const result = db().prepare('DELETE FROM areas WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Area not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
