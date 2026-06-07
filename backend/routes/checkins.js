const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const checkinsUploadDir = path.join(__dirname, '..', 'uploads', 'checkins');
if (!fs.existsSync(checkinsUploadDir)) {
  fs.mkdirSync(checkinsUploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.params.userId || req.user.id;
    const userDir = path.join(checkinsUploadDir, userId.toString());
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i;
    const ext = allowed.test(path.extname(file.originalname));
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
    }
  }
});

const uploadFields = upload.fields([
  { name: 'photo_front', maxCount: 1 },
  { name: 'photo_side', maxCount: 1 },
  { name: 'photo_back', maxCount: 1 }
]);

// Upload photos endpoint
router.post('/upload/:userId', authMiddleware, uploadFields, (req, res) => {
  try {
    const { userId } = req.params;
    // Security check
    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const files = req.files || {};
    const response = {};

    if (files.photo_front && files.photo_front[0]) {
      response.photo_front = files.photo_front[0].filename;
    }
    if (files.photo_side && files.photo_side[0]) {
      response.photo_side = files.photo_side[0].filename;
    }
    if (files.photo_back && files.photo_back[0]) {
      response.photo_back = files.photo_back[0].filename;
    }

    res.json(response);
  } catch (error) {
    console.error('Checkin photos upload error:', error);
    res.status(500).json({ error: 'Error al subir fotos' });
  }
});

// Get all checkins for a user
router.get('/user/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const checkins = db.prepare(
      'SELECT * FROM checkins WHERE user_id = ? ORDER BY date DESC'
    ).all(userId);

    res.json(checkins);
  } catch (error) {
    console.error('Get checkins error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Create or update a checkin
router.post('/user/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;
    const { date, weight, waist, hip, thigh, photo_front, photo_side, photo_back, notes } = req.body;

    if (!date) return res.status(400).json({ error: 'Fecha es requerida' });

    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const existing = db.prepare('SELECT id FROM checkins WHERE user_id = ? AND date = ?').get(userId, date);

    if (existing) {
      const prev = db.prepare('SELECT * FROM checkins WHERE id = ?').get(existing.id);

      db.prepare(`
        UPDATE checkins
        SET weight = ?, waist = ?, hip = ?, thigh = ?, photo_front = ?, photo_side = ?, photo_back = ?, notes = ?
        WHERE id = ?
      `).run(
        weight !== undefined ? weight : prev.weight,
        waist !== undefined ? waist : prev.waist,
        hip !== undefined ? hip : prev.hip,
        thigh !== undefined ? thigh : prev.thigh,
        photo_front !== undefined ? photo_front : prev.photo_front,
        photo_side !== undefined ? photo_side : prev.photo_side,
        photo_back !== undefined ? photo_back : prev.photo_back,
        notes !== undefined ? notes : prev.notes,
        existing.id
      );

      const updated = db.prepare('SELECT * FROM checkins WHERE id = ?').get(existing.id);
      return res.json(updated);
    }

    const result = db.prepare(`
      INSERT INTO checkins (user_id, date, weight, waist, hip, thigh, photo_front, photo_side, photo_back, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      date,
      weight || null,
      waist || null,
      hip || null,
      thigh || null,
      photo_front || null,
      photo_side || null,
      photo_back || null,
      notes || null
    );

    const checkin = db.prepare('SELECT * FROM checkins WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(checkin);
  } catch (error) {
    console.error('Save checkin error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
