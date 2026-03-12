const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');

// Routes
const authRoutes       = require('./routes/auth');
const customerRoutes   = require('./routes/customers');
const mikrotikRoutes   = require('./routes/mikrotik');
const packageRoutes    = require('./routes/packages');
const paymentRoutes    = require('./routes/payment');
const invoiceRoutes    = require('./routes/invoices');
const whatsappRoutes   = require('./routes/whatsapp');
const acsRoutes        = require('./routes/acs');
const mapRoutes        = require('./routes/maps');
const dashboardRoutes  = require('./routes/dashboard');
const settingsRoutes   = require('./routes/settings');
const publicRoutes     = require('./routes/public');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// ── Middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api/', limiter);

// Make io accessible in routes
app.set('io', io);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/mikrotik',  mikrotikRoutes);
app.use('/api/packages',  packageRoutes);
app.use('/api/payment',   paymentRoutes);
app.use('/api/invoices',  invoiceRoutes);
app.use('/api/whatsapp',  whatsappRoutes);
app.use('/api/acs',       acsRoutes);
app.use('/api/maps',      mapRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings',  settingsRoutes);
app.use('/api/public',    publicRoutes);   // No auth: cek tagihan, etc

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── WebSocket ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on('subscribe:dashboard', () => socket.join('dashboard'));
  socket.on('subscribe:mikrotik',  () => socket.join('mikrotik'));
  socket.on('disconnect', () => console.log(`[WS] Disconnected: ${socket.id}`));
});

// Push live stats every 5s
setInterval(async () => {
  try {
    const MikrotikService = require('./services/mikrotikService');
    const stats = await MikrotikService.getLiveStats();
    io.to('dashboard').emit('live:stats', stats);
  } catch {}
}, 5000);

// ── Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();
  await connectRedis();
  server.listen(PORT, () => {
    console.log(`\n🚀 NexaISP Backend running on port ${PORT}`);
    console.log(`   ENV : ${process.env.NODE_ENV}`);
    console.log(`   DB  : ${process.env.DB_NAME}`);
  });
})();

module.exports = { app, io };
