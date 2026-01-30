import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List resources
router.get('/', (req, res) => {
  const { type, domain } = req.query
  let sql = 'SELECT * FROM resources WHERE 1=1'
  const params = []

  if (type) {
    sql += ' AND type = ?'
    params.push(type)
  }
  if (domain) {
    sql += ' AND domain = ?'
    params.push(domain)
  }

  sql += ' ORDER BY name ASC'

  try {
    const resources = db().prepare(sql).all(...params)
    res.json(resources)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single resource
router.get('/:id', (req, res) => {
  try {
    const resource = db().prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id)
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' })
    }
    res.json(resource)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create resource
router.post('/', (req, res) => {
  const { name, type, domain, description, content, location, tags, area_id, version, update_frequency } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO resources (name, type, domain, description, content, location, tags, area_id, version, update_frequency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name, type, domain, description, content, location,
      tags ? JSON.stringify(tags) : null,
      area_id, version, update_frequency
    )

    const resource = db().prepare('SELECT * FROM resources WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(resource)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update resource
router.put('/:id', (req, res) => {
  const { name, type, domain, description, content, location, tags, area_id, version, update_frequency } = req.body

  try {
    db().prepare(`
      UPDATE resources SET
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        domain = ?,
        description = COALESCE(?, description),
        content = ?,
        location = ?,
        tags = ?,
        area_id = ?,
        version = ?,
        last_updated = CURRENT_DATE,
        update_frequency = COALESCE(?, update_frequency)
      WHERE id = ?
    `).run(
      name, type, domain, description, content, location,
      tags ? JSON.stringify(tags) : null,
      area_id, version, update_frequency,
      req.params.id
    )

    const resource = db().prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id)
    res.json(resource)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete resource
router.delete('/:id', (req, res) => {
  try {
    const result = db().prepare('DELETE FROM resources WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Resource not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
