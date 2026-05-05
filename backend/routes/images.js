const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadsDir, req.params.userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
    }
  }
});

// Get images for a user
router.get('/user/:userId', authMiddleware, (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.role === 'student' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const images = db.prepare(
      'SELECT * FROM reference_images WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);

    res.json(images);
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Upload image (admin only)
router.post('/user/:userId', authMiddleware, adminMiddleware, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó imagen' });
    }

    const { userId } = req.params;
    const { description } = req.body;

    const result = db.prepare(`
      INSERT INTO reference_images (user_id, filename, original_name, description)
      VALUES (?, ?, ?, ?)
    `).run(userId, req.file.filename, req.file.originalname, description || null);

    const image = db.prepare('SELECT * FROM reference_images WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(image);
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Delete image (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    const image = db.prepare('SELECT * FROM reference_images WHERE id = ?').get(id);
    if (!image) {
      return res.status(404).json({ error: 'Imagen no encontrada' });
    }

    // Delete file from disk
    const filePath = path.join(uploadsDir, image.user_id.toString(), image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    db.prepare('DELETE FROM reference_images WHERE id = ?').run(id);
    res.json({ message: 'Imagen eliminada' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
