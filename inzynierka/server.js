// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });

const { sequelize, User } = require('./models'); // 👈 pojedynczy import

const app = express();
const PORT = process.env.PORT || 3001;
const ENV = process.env.NODE_ENV || 'development';

// CORS
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// Security & body parsers
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(ENV === 'development' ? 'dev' : 'combined'));

// Rate limiter
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// Routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const productRoutes = require('./routes/products');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/products', productRoutes);

// Health / base
app.get('/api', (_req, res) => {
  res.json({ message: 'API działa' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Nie znaleziono trasy' });
});

// Start
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Połączono z DB');

    await sequelize.sync({ alter: true });

    app.listen(PORT, () => {
      console.log(`🚀 Backend: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Błąd uruchomienia serwera:', err);
    process.exit(1);
  }
}

start();



