import { Router } from 'express'
import { getDb } from '../db/init.js'
const db = () => getDb()

const router = Router()

// Mission Control dashboard data
router.get('/mission-control', (req, res) => {
  try {
    const inbox = db().prepare(`
      SELECT COUNT(*) as count FROM inbox WHERE processed_at IS NULL
    `).get().count

    const nextActions = db().prepare(`
      SELECT COUNT(*) as count FROM actions WHERE status = 'next'
    `).get().count

    const activeProjects = db().prepare(`
      SELECT COUNT(*) as count FROM projects WHERE status = 'active'
    `).get().count

    const completedToday = db().prepare(`
      SELECT COUNT(*) as count FROM actions
      WHERE status = 'done' AND DATE(completed_at) = DATE('now')
    `).get().count

    const waitingFor = db().prepare(`
      SELECT COUNT(*) as count FROM actions WHERE status = 'waiting'
    `).get().count

    const overdueActions = db().prepare(`
      SELECT COUNT(*) as count FROM actions
      WHERE due_date < DATE('now') AND status NOT IN ('done', 'someday')
    `).get().count

    res.json({
      inbox,
      nextActions,
      activeProjects,
      completedToday,
      waitingFor,
      overdueActions
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Velocity metrics
router.get('/velocity', (req, res) => {
  try {
    const thisWeek = db().prepare(`
      SELECT COUNT(*) as count FROM actions
      WHERE status = 'done'
      AND completed_at >= DATE('now', '-7 days')
    `).get().count

    const lastWeek = db().prepare(`
      SELECT COUNT(*) as count FROM actions
      WHERE status = 'done'
      AND completed_at >= DATE('now', '-14 days')
      AND completed_at < DATE('now', '-7 days')
    `).get().count

    const today = db().prepare(`
      SELECT COUNT(*) as count FROM actions
      WHERE status = 'done'
      AND DATE(completed_at) = DATE('now')
    `).get().count

    // Calculate streak (consecutive days with at least 1 completion)
    const recentDays = db().prepare(`
      SELECT DISTINCT DATE(completed_at) as date
      FROM actions
      WHERE status = 'done'
      AND completed_at >= DATE('now', '-30 days')
      ORDER BY date DESC
    `).all()

    let streak = 0
    const todayStr = new Date().toISOString().split('T')[0]
    let checkDate = new Date()

    // If we have completions today, start counting from today
    // Otherwise, start from yesterday
    if (recentDays.length > 0 && recentDays[0].date === todayStr) {
      streak = 1
      checkDate.setDate(checkDate.getDate() - 1)
    }

    for (const day of recentDays) {
      const dayStr = checkDate.toISOString().split('T')[0]
      if (day.date === dayStr) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (day.date < dayStr) {
        break
      }
    }

    // Daily breakdown for the week
    const dailyBreakdown = db().prepare(`
      SELECT DATE(completed_at) as date, COUNT(*) as count
      FROM actions
      WHERE status = 'done' AND completed_at >= DATE('now', '-7 days')
      GROUP BY DATE(completed_at)
      ORDER BY date
    `).all()

    res.json({
      thisWeek,
      lastWeek,
      today,
      streak,
      dailyBreakdown,
      trend: thisWeek - lastWeek
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Weekly review data
router.get('/weekly-review', (req, res) => {
  try {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // Actions completed this week
    const actionsCompleted = db().prepare(`
      SELECT COUNT(*) as count FROM actions
      WHERE status = 'done' AND completed_at >= ?
    `).get(weekStartStr).count

    // Projects completed
    const projectsCompleted = db().prepare(`
      SELECT COUNT(*) as count FROM projects
      WHERE status = 'completed' AND completed_at >= ?
    `).get(weekStartStr).count

    // Inbox items processed
    const inboxProcessed = db().prepare(`
      SELECT COUNT(*) as count FROM inbox
      WHERE processed_at >= ?
    `).get(weekStartStr).count

    // Projects without next actions
    const stuckProjects = db().prepare(`
      SELECT p.* FROM projects p
      WHERE p.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM actions a WHERE a.project_id = p.id AND a.status = 'next')
    `).all()

    // Stale waiting items
    const staleWaiting = db().prepare(`
      SELECT *, julianday('now') - julianday(created_at) as days_waiting
      FROM actions
      WHERE status = 'waiting'
      AND julianday('now') - julianday(created_at) > 7
    `).all()

    res.json({
      weekOf: weekStartStr,
      actionsCompleted,
      projectsCompleted,
      inboxProcessed,
      stuckProjects,
      staleWaiting
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
