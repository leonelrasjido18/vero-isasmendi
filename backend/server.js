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
const exerciseRoutes = require('./routes/exercises');
const checkinRoutes = require('./routes/checkins');
const logRoutes = require('./routes/logs');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/logs', logRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🏋️ Servidor corriendo en http://localhost:${PORT}`);
});
