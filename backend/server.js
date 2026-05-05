require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const routineRoutes = require('./routes/routines');
const mealRoutes = require('./routes/meals');
const imageRoutes = require('./routes/images');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/images', imageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏋️ Servidor corriendo en http://localhost:${PORT}`);
});
