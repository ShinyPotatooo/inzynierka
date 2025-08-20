// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: './config.env' });

const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;
const ENV = process.env.NODE_ENV || 'development';
const isDev = ENV !== 'production';

// jeśli kiedyś ruszy za proxy (np. nginx), poprawne IP do limiterów
app.set('trust proxy', 1);

// CORS
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());

// Security & body parsers
app.use(
  helmet({
    // dev-friendly; jak chcesz pełny CSP — dołóż osobno
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(morgan(isDev ? 'dev' : 'combined'));

/* ---------------------------
   Rate limitery
   - osobny dla /products/options (autosugestia)
   - ogólny dla reszty /api
---------------------------- */
const optionsLimiter = rateLimit({
  windowMs: 15 * 1000, // 15s okno
  max: isDev ? 500 : 120, // sporo zapytań w dev; w prod 120/15s
  standardHeaders: true,  // RateLimit-*, Retry-After
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,                       // 60s
  max: isDev ? 1000 : 300,                   // luźniej w dev
  standardHeaders: true,
  legacyHeaders: false,
  // nie limituj ścieżki autosugestii tutaj (ma swój limiter powyżej)
  skip: (req) => req.path.startsWith('/products/options'),
});

// Uwaga: ważna kolejność – najpierw konkretny limiter, potem ogólny
app.use('/api/products/options', optionsLimiter);
app.use('/api', apiLimiter);

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
  res.json({ success: true, message: 'API działa' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Nie znaleziono trasy' });
});

// Globalny handler błędów – spójne JSON-y
// (jeśli gdzieś zrobisz next(err), to tu trafi)
app.use((err, _req, res, _next) => {
  console.error('🔥 Global error:', err);
  const status = err.status || 500;
  const msg =
    err.message ||
    err?.response?.data?.error ||
    (status === 429
      ? 'Za dużo zapytań — spróbuj ponownie za chwilę.'
      : 'Internal server error');

  res
    .status(status)
    .json({ success: false, error: msg });
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
