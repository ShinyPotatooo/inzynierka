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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());

// Security & body parsers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use(morgan(isDev ? 'dev' : 'combined'));

/* ---------------------------
   Rate limitery
---------------------------- */
const optionsLimiter = rateLimit({
  windowMs: 15 * 1000,
  max: isDev ? 500 : 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const notificationsPollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1200 : 240,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.path.startsWith('/products/options') ||
    req.path.startsWith('/notifications/unread/count'),
});

// Ważna kolejność – najpierw konkretne limitery, potem ogólny
app.use('/api/products/options', optionsLimiter);
app.use('/api/notifications/unread/count', notificationsPollLimiter);
app.use('/api', apiLimiter);

/* ---------------------------
   Routes
---------------------------- */
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const productRoutes = require('./routes/products');
const notificationsRoutes = require('./routes/notifications'); // ⬅️

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/notifications', notificationsRoutes); // ⬅️

// Health
app.get('/api', (_req, res) => {
  res.json({ success: true, message: 'API działa' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Nie znaleziono trasy' });
});

// Globalny handler błędów
app.use((err, _req, res, _next) => {
  console.error('🔥 Global error:', err);
  const status = err.status || 500;
  const msg =
    err.message ||
    err?.response?.data?.error ||
    (status === 429
      ? 'Za dużo zapytań — spróbuj ponownie za chwilę.'
      : 'Internal server error');

  res.status(status).json({ success: false, error: msg });
});

async function start() {
  try {
    // 1) tylko handshake z DB — BEZ sync({ alter:true })
    await sequelize.authenticate();
    console.log('✅ Połączono z DB');

    // Jeśli naprawdę potrzebujesz sync, rób zwykły, kontrolowany flagą:
    // if (process.env.DB_SYNC === 'true') {
    //   await sequelize.sync(); // bez alter
    // }

    app.listen(PORT, () => {
      console.log(`🚀 Backend: http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Błąd uruchomienia serwera:', err);
    process.exit(1);
  }
}

start();




