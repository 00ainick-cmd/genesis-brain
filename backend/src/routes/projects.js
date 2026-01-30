import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List projects
router.get('/', (req, res) => {
  const { status, domain } = req.query

  let sql = `
    SELECT p.*,
      (SELECT COUNT(*) FROM actions WHERE project_id = p.id AND status != 'done') as action_count,
      (SELECT COUNT(*) FROM actions WHERE project_id = p.id AND status = 'done') as completed_count
    FROM projects p
    WHERE 1=1
  `
  const params = []

  if (status) {
    sql += ' AND p.status = ?'
    params.push(status)
  }

  if (domain) {
    sql += ' AND p.domain = ?'
    params.push(domain)
  }

  sql += ' ORDER BY p.priority DESC, p.target_date ASC NULLS LAST, p.created_at DESC'

  try {
    const projects = db().prepare(sql).all(...params)
    // Calculate progress
    const projectsWithProgress = projects.map(p => ({
      ...p,
      progress: p.action_count + p.completed_count > 0
        ? Math.round((p.completed_count / (p.action_count + p.completed_count)) * 100)
        : 0
    }))
    res.json(projectsWithProgress)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get single project
router.get('/:id', (req, res) => {
  try {
    const project = db().prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM actions WHERE project_id = p.id AND status != 'done') as action_count,
        (SELECT COUNT(*) FROM actions WHERE project_id = p.id AND status = 'done') as completed_count
      FROM projects p
      WHERE p.id = ?
    `).get(req.params.id)

    if (!project) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json(project)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get project actions
router.get('/:id/actions', (req, res) => {
  try {
    const actions = db().prepare(`
      SELECT * FROM actions WHERE project_id = ?
      ORDER BY status = 'done' ASC, due_date ASC NULLS LAST
    `).all(req.params.id)
    res.json(actions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create project
router.post('/', (req, res) => {
  const {
    name, status, outcome, success_criteria,
    area_id, domain, target_date, priority, notes
  } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const result = db().prepare(`
      INSERT INTO projects (
        name, status, outcome, success_criteria,
        area_id, domain, target_date, priority, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      status || 'active',
      outcome,
      success_criteria ? JSON.stringify(success_criteria) : null,
      area_id,
      domain,
      target_date,
      priority || 'normal',
      notes
    )

    const project = db().prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(project)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update project
router.put('/:id', (req, res) => {
  const {
    name, status, outcome, success_criteria,
    area_id, domain, target_date, blocked, blocker_note, priority, notes
  } = req.body

  try {
    const existing = db().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' })
    }

    // Handle completion
    const completedAt = status === 'completed' && existing.status !== 'completed'
      ? new Date().toISOString()
      : existing.completed_at

    db().prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        status = COALESCE(?, status),
        outcome = COALESCE(?, outcome),
        success_criteria = ?,
        area_id = ?,
        domain = ?,
        target_date = ?,
        blocked = ?,
        blocker_note = ?,
        priority = COALESCE(?, priority),
        notes = ?,
        completed_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      status,
      outcome,
      success_criteria ? JSON.stringify(success_criteria) : existing.success_criteria,
      area_id,
      domain,
      target_date,
      blocked ? 1 : 0,
      blocker_note,
      priority,
      notes,
      completedAt,
      req.params.id
    )

    const project = db().prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
    res.json(project)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete project
router.delete('/:id', (req, res) => {
  try {
    const result = db().prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Project not found' })
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
