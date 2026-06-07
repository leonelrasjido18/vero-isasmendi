const express = require('express');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all exercises (accessible by students and admin)
router.get('/', authMiddleware, (req, res) => {
  try {
    const exercises = db.prepare('SELECT * FROM exercises ORDER BY name').all();
    res.json(exercises);
  } catch (error) {
    console.error('Get exercises error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Create or update exercise (admin only)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id, name, video_url, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre es requerido' });

    if (id) {
      db.prepare(`
        UPDATE exercises SET name = ?, video_url = ?, description = ?
        WHERE id = ?
      `).run(name, video_url || null, description || null, id);
      const updated = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);
      return res.json(updated);
    }

    // Check if name is unique
    const existing = db.prepare('SELECT id FROM exercises WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un ejercicio con ese nombre' });
    }

    const result = db.prepare(`
      INSERT INTO exercises (name, video_url, description)
      VALUES (?, ?, ?)
    `).run(name, video_url || null, description || null);

    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(exercise);
  } catch (error) {
    console.error('Create exercise error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Delete exercise (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const exercise = db.prepare('SELECT id FROM exercises WHERE id = ?').get(id);
    if (!exercise) return res.status(404).json({ error: 'Ejercicio no encontrado' });

    db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
    res.json({ message: 'Ejercicio eliminado' });
  } catch (error) {
    console.error('Delete exercise error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
