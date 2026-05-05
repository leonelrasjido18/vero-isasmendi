const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Multer for meal images
const uploadsDir = path.join(__dirname, '..', 'uploads', 'meals');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Upload meal reference image
router.post('/upload-image/:userId', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se proporcionó imagen' });
  res.json({ filename: req.file.filename });
});

// Get meal plans for a user (by day, date or all)
router.get('/user/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const { day, date } = req.query;

    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    let plans;
    if (date) {
      plans = db.prepare(
        'SELECT * FROM meal_plans WHERE user_id = ? AND date = ? ORDER BY id'
      ).all(userId, date);
    } else if (day !== undefined) {
      plans = db.prepare(
        'SELECT * FROM meal_plans WHERE user_id = ? AND day_of_week = ? AND date IS NULL ORDER BY id'
      ).all(userId, day);
    } else {
      plans = db.prepare(
        'SELECT * FROM meal_plans WHERE user_id = ? ORDER BY date DESC, day_of_week, id'
      ).all(userId);
    }

    plans = plans.map(p => ({
      ...p,
      meals: JSON.parse(p.meals || '[]')
    }));

    res.json(plans);
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Create/Update meal plan
router.post('/user/:userId', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const { day_of_week, date, meals, notes } = req.body;

    if (date === undefined && day_of_week === undefined) {
      return res.status(400).json({ error: 'Día o fecha son requeridos' });
    }

    let existing;
    if (date) {
      existing = db.prepare(
        'SELECT id FROM meal_plans WHERE user_id = ? AND date = ?'
      ).get(userId, date);
    } else {
      existing = db.prepare(
        'SELECT id FROM meal_plans WHERE user_id = ? AND day_of_week = ? AND date IS NULL'
      ).get(userId, day_of_week);
    }

    if (existing) {
      db.prepare(`
        UPDATE meal_plans SET meals = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(meals || []), notes || null, existing.id);

      const updated = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(existing.id);
      return res.json({ ...updated, meals: JSON.parse(updated.meals) });
    }

    const result = db.prepare(`
      INSERT INTO meal_plans (user_id, day_of_week, date, meals, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, day_of_week ?? null, date || null, JSON.stringify(meals || []), notes || null);

    const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ ...plan, meals: JSON.parse(plan.meals) });
  } catch (error) {
    console.error('Create meal plan error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Update a specific meal plan
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { meals, notes } = req.body;

    const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    db.prepare(`
      UPDATE meal_plans SET meals = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(meals || JSON.parse(plan.meals)),
      notes ?? plan.notes,
      id
    );

    const updated = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id);
    res.json({ ...updated, meals: JSON.parse(updated.meals) });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Delete meal plan
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const plan = db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan no encontrado' });
    }

    db.prepare('DELETE FROM meal_plans WHERE id = ?').run(id);
    res.json({ message: 'Plan eliminado' });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
