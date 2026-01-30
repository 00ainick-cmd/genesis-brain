import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// List weekly reviews
router.get('/', (req, res) => {
  const { limit = 10 } = req.query

  try {
    const reviews = db().prepare(`
      SELECT * FROM weekly_reviews
      ORDER BY week_of DESC
      LIMIT ?
    `).all(parseInt(limit))
    res.json(reviews)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get current week's review (or create placeholder)
router.get('/current', (req, res) => {
  try {
    // Get Monday of current week
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(monday.getDate() - monday.getDay() + 1)
    const weekOf = monday.toISOString().split('T')[0]

    let review = db().prepare(`
      SELECT * FROM weekly_reviews WHERE week_of = ?
    `).get(weekOf)

    if (!review) {
      // Create a placeholder for this week
      const result = db().prepare(`
        INSERT INTO weekly_reviews (week_of) VALUES (?)
      `).run(weekOf)

      review = db().prepare(`
        SELECT * FROM weekly_reviews WHERE id = ?
      `).get(result.lastInsertRowid)
    }

    res.json(review)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Create/update weekly review
router.post('/', (req, res) => {
  const {
    week_of, actions_completed, projects_completed, inbox_processed,
    metrics_by_domain, key_wins, blockers_hit, next_week_focus, ai_summary
  } = req.body

  if (!week_of) {
    return res.status(400).json({ error: 'week_of is required' })
  }

  try {
    // Check if review exists
    const existing = db().prepare(`
      SELECT * FROM weekly_reviews WHERE week_of = ?
    `).get(week_of)

    if (existing) {
      // Update
      db().prepare(`
        UPDATE weekly_reviews SET
          actions_completed = COALESCE(?, actions_completed),
          projects_completed = COALESCE(?, projects_completed),
          inbox_processed = COALESCE(?, inbox_processed),
          metrics_by_domain = ?,
          key_wins = ?,
          blockers_hit = ?,
          next_week_focus = ?,
          ai_summary = ?,
          completed_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE week_of = ?
      `).run(
        actions_completed, projects_completed, inbox_processed,
        metrics_by_domain ? JSON.stringify(metrics_by_domain) : existing.metrics_by_domain,
        key_wins, blockers_hit, next_week_focus, ai_summary,
        next_week_focus, // If next_week_focus is set, mark as complete
        week_of
      )

      const review = db().prepare('SELECT * FROM weekly_reviews WHERE week_of = ?').get(week_of)
      res.json(review)
    } else {
      // Create new
      const result = db().prepare(`
        INSERT INTO weekly_reviews (
          week_of, actions_completed, projects_completed, inbox_processed,
          metrics_by_domain, key_wins, blockers_hit, next_week_focus, ai_summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        week_of, actions_completed, projects_completed, inbox_processed,
        metrics_by_domain ? JSON.stringify(metrics_by_domain) : null,
        key_wins, blockers_hit, next_week_focus, ai_summary
      )

      const review = db().prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(result.lastInsertRowid)
      res.status(201).json(review)
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get specific review
router.get('/:id', (req, res) => {
  try {
    const review = db().prepare('SELECT * FROM weekly_reviews WHERE id = ?').get(req.params.id)
    if (!review) {
      return res.status(404).json({ error: 'Review not found' })
    }
    res.json(review)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
