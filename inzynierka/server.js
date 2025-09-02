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

/* ---------------------------------
   Ustawienia podstawowe
---------------------------------- */

// poprawne IP za proxy (na przyszłość)
app.set('trust proxy', 1);

// w DEV wyłączamy ETag -> unik 304 na JSON dla 🔔
if (isDev) app.set('etag', false);

// CORS (front na http://localhost:3000)
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

/* ---------------------------------
   Rate limitery
---------------------------------- */
const skipOptions = (req) => req.method === 'OPTIONS';

const optionsLimiter = rateLimit({
  windowMs: 15 * 1000,
  max: ENV !== 'production' ? 500 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
});

const notificationsPollLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: ENV !== 'production' ? 1200 : 240,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: ENV !== 'production' ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    skipOptions(req) ||
    req.path.startsWith('/products/options') ||
    req.path.startsWith('/notifications/unread/count'),
});

// Ważna kolejność – najpierw konkretne limitery, potem ogólny
app.use('/api/products/options', optionsLimiter);
app.use('/api/notifications/unread/count', notificationsPollLimiter);
app.use('/api', apiLimiter);

/* ---------------------------------
   Routes
---------------------------------- */
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const inventoryRoutes = require('./routes/inventory');
const productRoutes = require('./routes/products');
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/notifications', notificationsRoutes);

// Healthcheck
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

/* ---------------------------------
   Start/stop serwera
---------------------------------- */
let server = null;
let shuttingDown = false;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Połączono z DB');

    server = app.listen(PORT, () => {
      console.log(`🚀 Backend: http://localhost:${PORT}`);
    });

    // 🔧 Szybsze zwalnianie gniazda przy restartach (nodemon)
    // - wyłączamy keep-alive (połączenia nie wiszą)
    // - krótszy timeout na nagłówki
    server.keepAliveTimeout = 0;
    server.headersTimeout = 5000;

    // loguj, nie zabijaj procesu — nodemon zrobi swoje
    server.on('error', (err) => {
      if (err?.code === 'EADDRINUSE') {
        console.error('⚠️  Port zajęty (EADDRINUSE). Poprzednia instancja jeszcze zamyka gniazdo...');
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (err) {
    console.error('❌ Błąd uruchomienia serwera:', err);
  }
}

async function closeGracefully(reason = 'shutdown') {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`🛑 Zamykam serwer... (${reason})`);
  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('🔌 HTTP zamknięty.');
    }
  } catch (e) {
    console.error('Błąd zamykania HTTP:', e);
  }

  try {
    console.log('🔌 Zamykanie połączenia z DB...');
    await sequelize.close();
    console.log('✅ DB zamknięta.');
  } catch (e) {
    console.error('Błąd zamykania DB:', e);
  }
}

// Sygnały z nodemon (Windows: SIGINT)
['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((sig) => {
  process.on(sig, async () => {
    await closeGracefully(sig);
    process.exit(0);
  });
});

// awaryjnie
process.on('unhandledRejection', (err) => {
  console.error('UnhandledRejection:', err);
});
process.on('uncaughtException', async (err) => {
  console.error('UncaughtException:', err);
  await closeGracefully('uncaughtException');
  process.exit(1);
});

start();
