const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get routines for a user (by day, date or all)
router.get('/user/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const { day, date } = req.query;

    // Students can only view their own
    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    let routines;
    if (date) {
      routines = db.prepare(
        'SELECT * FROM routines WHERE user_id = ? AND date = ? ORDER BY id'
      ).all(userId, date);
    } else if (day !== undefined) {
      routines = db.prepare(
        'SELECT * FROM routines WHERE user_id = ? AND day_of_week = ? AND date IS NULL ORDER BY id'
      ).all(userId, day);
    } else {
      routines = db.prepare(
        'SELECT * FROM routines WHERE user_id = ? ORDER BY date DESC, day_of_week, id'
      ).all(userId);
    }

    // Parse exercises JSON
    routines = routines.map(r => ({
      ...r,
      exercises: JSON.parse(r.exercises || '[]')
    }));

    res.json(routines);
  } catch (error) {
    console.error('Get routines error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Create/Update routine for a user (admin only)
router.post('/user/:userId', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const { day_of_week, date, title, exercises, notes } = req.body;

    if (date === undefined && day_of_week === undefined) {
      return res.status(400).json({ error: 'Día o fecha son requeridos' });
    }
    if (!title) return res.status(400).json({ error: 'Título es requerido' });

    // Check if routine exists for this specific date or day
    let existing;
    if (date) {
      existing = db.prepare(
        'SELECT id FROM routines WHERE user_id = ? AND date = ?'
      ).get(userId, date);
    } else {
      existing = db.prepare(
        'SELECT id FROM routines WHERE user_id = ? AND day_of_week = ? AND date IS NULL'
      ).get(userId, day_of_week);
    }

    if (existing) {
      db.prepare(`
        UPDATE routines SET title = ?, exercises = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, JSON.stringify(exercises || []), notes || null, existing.id);

      const updated = db.prepare('SELECT * FROM routines WHERE id = ?').get(existing.id);
      return res.json({ ...updated, exercises: JSON.parse(updated.exercises) });
    }

    const result = db.prepare(`
      INSERT INTO routines (user_id, day_of_week, date, title, exercises, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, day_of_week ?? null, date || null, title, JSON.stringify(exercises || []), notes || null);

    const routine = db.prepare('SELECT * FROM routines WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...routine, exercises: JSON.parse(routine.exercises) });
  } catch (error) {
    console.error('Create routine error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Update a specific routine
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { title, exercises, notes } = req.body;

    const routine = db.prepare('SELECT * FROM routines WHERE id = ?').get(id);
    if (!routine) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    db.prepare(`
      UPDATE routines SET title = ?, exercises = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || routine.title,
      JSON.stringify(exercises || JSON.parse(routine.exercises)),
      notes ?? routine.notes,
      id
    );

    const updated = db.prepare('SELECT * FROM routines WHERE id = ?').get(id);
    res.json({ ...updated, exercises: JSON.parse(updated.exercises) });
  } catch (error) {
    console.error('Update routine error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Delete routine
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const routine = db.prepare('SELECT * FROM routines WHERE id = ?').get(id);
    if (!routine) {
      return res.status(404).json({ error: 'Rutina no encontrada' });
    }

    db.prepare('DELETE FROM routines WHERE id = ?').run(id);
    res.json({ message: 'Rutina eliminada' });
  } catch (error) {
    console.error('Delete routine error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Get all routine templates (admin only)
router.get('/templates/all', authMiddleware, adminMiddleware, (req, res) => {
  try {
    let templates = db.prepare('SELECT * FROM routine_templates ORDER BY title').all();
    templates = templates.map(t => ({
      ...t,
      exercises: JSON.parse(t.exercises || '[]')
    }));
    res.json(templates);
  } catch (error) {
    console.error('Get routine templates error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Create or update routine template (admin only)
router.post('/templates', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id, title, exercises, notes } = req.body;
    if (!title) return res.status(400).json({ error: 'Título es requerido' });

    if (id) {
      db.prepare(`
        UPDATE routine_templates SET title = ?, exercises = ?, notes = ?
        WHERE id = ?
      `).run(title, JSON.stringify(exercises || []), notes || null, id);
      const updated = db.prepare('SELECT * FROM routine_templates WHERE id = ?').get(id);
      return res.json({ ...updated, exercises: JSON.parse(updated.exercises) });
    }

    const result = db.prepare(`
      INSERT INTO routine_templates (title, exercises, notes)
      VALUES (?, ?, ?)
    `).run(title, JSON.stringify(exercises || []), notes || null);
    const template = db.prepare('SELECT * FROM routine_templates WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...template, exercises: JSON.parse(template.exercises) });
  } catch (error) {
    console.error('Create routine template error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Delete routine template (admin only)
router.delete('/templates/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const template = db.prepare('SELECT id FROM routine_templates WHERE id = ?').get(id);
    if (!template) return res.status(404).json({ error: 'Plantilla no encontrada' });

    db.prepare('DELETE FROM routine_templates WHERE id = ?').run(id);
    res.json({ message: 'Plantilla eliminada' });
  } catch (error) {
    console.error('Delete routine template error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
