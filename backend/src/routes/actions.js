import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List actions with filters
router.get('/', (req, res) => {
  const { status, context, project_id, area_id, urgent } = req.query

  let sql = `
    SELECT a.*, p.name as project_name
    FROM actions a
    LEFT JOIN projects p ON a.project_id = p.id
    WHERE 1=1
  `
  const params = []

  if (status) {
    sql += ' AND a.status = ?'
    params.push(status)
  }

  if (context) {
    sql += ' AND a.context LIKE ?'
    params.push(`%${context}%`)
  }

  if (project_id) {
    sql += ' AND a.project_id = ?'
    params.push(project_id)
  }

  if (area_id) {
    sql += ' AND a.area_id = ?'
    params.push(area_id)
  }

  if (urgent === 'true') {
    sql += ` AND (
      a.due_date <= date('now', '+2 days')
      OR a.status = 'next'
    )`
  }

  sql += ' ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC'

  try {
    const actions = db().prepare(sql).all(...params)
    res.json(actions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single action
router.get('/:id', (req, res) => {
  try {
    const action = db().prepare(`
      SELECT a.*, p.name as project_name
      FROM actions a
      LEFT JOIN projects p ON a.project_id = p.id
      WHERE a.id = ?
    `).get(req.params.id)

    if (!action) {
      return res.status(404).json({ error: 'Action not found' })
    }
    res.json(action)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create action
router.post('/', (req, res) => {
  const {
    title, status, context, energy, time_estimate,
    project_id, area_id, waiting_on, delegated_to,
    due_date, scheduled_date, source, ai_notes
  } = req.body

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO actions (
        title, status, context, energy, time_estimate,
        project_id, area_id, waiting_on, delegated_to,
        due_date, scheduled_date, source, ai_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      status || 'inbox',
      context ? JSON.stringify(context) : null,
      energy,
      time_estimate,
      project_id,
      area_id,
      waiting_on,
      delegated_to,
      due_date,
      scheduled_date,
      source,
      ai_notes
    )

    const action = db().prepare('SELECT * FROM actions WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(action)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update action
router.put('/:id', (req, res) => {
  const {
    title, status, context, energy, time_estimate,
    project_id, area_id, waiting_on, delegated_to,
    due_date, scheduled_date, ai_notes
  } = req.body

  try {
    const existing = db().prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Action not found' })
    }

    db().prepare(`
      UPDATE actions SET
        title = COALESCE(?, title),
        status = COALESCE(?, status),
        context = COALESCE(?, context),
        energy = COALESCE(?, energy),
        time_estimate = COALESCE(?, time_estimate),
        project_id = ?,
        area_id = ?,
        waiting_on = ?,
        delegated_to = ?,
        due_date = ?,
        scheduled_date = ?,
        ai_notes = COALESCE(?, ai_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      status,
      context ? JSON.stringify(context) : null,
      energy,
      time_estimate,
      project_id,
      area_id,
      waiting_on,
      delegated_to,
      due_date,
      scheduled_date,
      ai_notes,
      req.params.id
    )

    const action = db().prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id)
    res.json(action)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Complete action
router.post('/:id/complete', (req, res) => {
  try {
    const existing = db().prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Action not found' })
    }

    db().prepare(`
      UPDATE actions SET
        status = 'done',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id)

    const action = db().prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id)
    res.json(action)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Defer action
router.post('/:id/defer', (req, res) => {
  const { to_status, scheduled_date } = req.body

  try {
    db().prepare(`
      UPDATE actions SET
        status = ?,
        scheduled_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(to_status || 'someday', scheduled_date, req.params.id)

    const action = db().prepare('SELECT * FROM actions WHERE id = ?').get(req.params.id)
    res.json(action)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete action
router.delete('/:id', (req, res) => {
  try {
    const result = db().prepare('DELETE FROM actions WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Action not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
