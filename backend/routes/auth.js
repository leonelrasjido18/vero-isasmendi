const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.active && user.role !== 'admin') {
      return res.status(403).json({ error: 'Tu cuenta está desactivada. Contactá a tu coach.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        plan_type: user.plan_type || 'both'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Verify token
router.get('/verify', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, active, plan_type FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }
  res.json({ user: { ...user, plan_type: user.plan_type || 'both' } });
});

module.exports = router;
