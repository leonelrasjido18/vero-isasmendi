const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get daily log for a user on a specific date (Format: YYYY-MM-DD)
router.get('/user/:userId/date/:date', authMiddleware, (req, res) => {
  try {
    const { userId, date } = req.params;

    // Students can only view their own
    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const log = db.prepare(
      'SELECT * FROM daily_logs WHERE user_id = ? AND date = ?'
    ).get(userId, date);

    if (!log) {
      // Return a default blank log object so the client has a consistent structure
      return res.json({
        user_id: parseInt(userId),
        date: date,
        workout_completed: 0,
        workout_feedback: '',
        exercise_logs: '{}',
        meal_feedback: ''
      });
    }

    res.json(log);
  } catch (error) {
    console.error('Get daily log error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Save or update daily log
router.post('/user/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const { date, workout_completed, workout_feedback, exercise_logs, meal_feedback } = req.body;

    if (!date) return res.status(400).json({ error: 'Fecha es requerida' });

    // Students can only write their own logs
    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const exLogsStr = typeof exercise_logs === 'object' ? JSON.stringify(exercise_logs) : (exercise_logs || '{}');

    // UPSERT
    const existing = db.prepare('SELECT id FROM daily_logs WHERE user_id = ? AND date = ?').get(userId, date);
    if (existing) {
      db.prepare(`
        UPDATE daily_logs
        SET workout_completed = ?, workout_feedback = ?, exercise_logs = ?, meal_feedback = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        workout_completed !== undefined ? (workout_completed ? 1 : 0) : 0,
        workout_feedback ?? null,
        exLogsStr,
        meal_feedback ?? null,
        existing.id
      );
      const updated = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(existing.id);
      return res.json(updated);
    }

    const result = db.prepare(`
      INSERT INTO daily_logs (user_id, date, workout_completed, workout_feedback, exercise_logs, meal_feedback)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      date,
      workout_completed ? 1 : 0,
      workout_feedback || null,
      exLogsStr,
      meal_feedback || null
    );

    const log = db.prepare('SELECT * FROM daily_logs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(log);
  } catch (error) {
    console.error('Save daily log error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
