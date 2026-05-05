const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all students (admin only)
router.get('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const students = db.prepare(
      'SELECT id, name, email, phone, active, plan_type, notes, created_at FROM users WHERE role = ? ORDER BY name'
    ).all('student');
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Get single student
router.get('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    // Students can only view their own profile
    if (req.user.role === 'student' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const student = db.prepare(
      'SELECT id, name, email, phone, active, plan_type, notes, created_at FROM users WHERE id = ? AND role = ?'
    ).get(id, 'student');

    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    res.json(student);
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Create student (admin only)
router.post('/', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, email, password, phone, notes, plan_type } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const result = db.prepare(`
      INSERT INTO users (name, email, password, role, phone, notes, plan_type, active)
      VALUES (?, ?, ?, 'student', ?, ?, ?, 1)
    `).run(name, email, hashedPassword, phone || null, notes || null, plan_type || 'both');

    const student = db.prepare(
      'SELECT id, name, email, phone, active, plan_type, notes, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json(student);
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Update student (admin only)
router.put('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, notes, password, plan_type } = req.body;
    console.log('[UPDATE STUDENT] plan_type recibido:', plan_type, '| body keys:', Object.keys(req.body));


    const student = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(id, 'student');
    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    if (email && email !== student.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existing) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
    }

    const VALID_PLAN_TYPES = ['both', 'routine', 'meal'];
    const resolvedPlanType = (plan_type && VALID_PLAN_TYPES.includes(plan_type))
      ? plan_type
      : (student.plan_type || 'both');

    let query = 'UPDATE users SET name = ?, email = ?, phone = ?, notes = ?, plan_type = ?, updated_at = CURRENT_TIMESTAMP';
    let params = [name || student.name, email || student.email, phone ?? student.phone, notes ?? student.notes, resolvedPlanType];

    if (password) {
      query += ', password = ?';
      params.push(bcrypt.hashSync(password, 10));
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.prepare(query).run(...params);

    const updated = db.prepare(
      'SELECT id, name, email, phone, active, plan_type, notes, created_at FROM users WHERE id = ?'
    ).get(id);

    res.json(updated);
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Toggle active status (admin only)
router.patch('/:id/toggle-active', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const student = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(id, 'student');
    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    const newActive = student.active ? 0 : 1;
    db.prepare('UPDATE users SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newActive, id);

    res.json({ id: parseInt(id), active: newActive });
  } catch (error) {
    console.error('Toggle active error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Delete student (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const student = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(id, 'student');
    if (!student) {
      return res.status(404).json({ error: 'Alumno no encontrado' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'Alumno eliminado correctamente' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
