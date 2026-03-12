// services/whatsappService.js - Fonnte WhatsApp API
const axios = require('axios');
const { query } = require('../config/database');

const FONNTE_URL = 'https://api.fonnte.com/send';

const getToken = async () => {
  const { rows } = await query("SELECT value FROM settings WHERE key='fonnte_token'");
  return rows[0]?.value || '';
};

const getTemplate = async (key) => {
  const { rows } = await query(`SELECT value FROM settings WHERE key=$1`, [key]);
  return rows[0]?.value || '';
};

const fillTemplate = (template, data) => {
  return template.replace(/\{(\w+)\}/g, (_, k) => data[k] || '');
};

// ── Send single message ───────────────────────────────────
const send = async (phone, message, customerId = null, type = 'custom') => {
  const token = await getToken();
  if (!token) throw new Error('Fonnte token belum dikonfigurasi');

  // Format phone: must start with 62
  phone = phone.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '62' + phone.slice(1);
  if (!phone.startsWith('62')) phone = '62' + phone;

  let fonnte_id = null, status = 'pending', response = null;

  try {
    const { data } = await axios.post(FONNTE_URL, {
      target:  phone,
      message: message,
    }, {
      headers: { Authorization: token }
    });
    fonnte_id = data.id || null;
    status = data.status ? 'sent' : 'failed';
    response = data;
  } catch (e) {
    status = 'failed';
    response = { error: e.message };
  }

  // Log to DB
  await query(`
    INSERT INTO wa_logs (customer_id, phone, type, message, status, fonnte_id, response)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [customerId, phone, type, message, status, fonnte_id, JSON.stringify(response)]);

  return { success: status === 'sent', phone, status, fonnte_id };
};

// ── Bulk send ─────────────────────────────────────────────
const sendBulk = async (targets) => {
  const results = [];
  for (const t of targets) {
    try {
      const res = await send(t.phone, t.message, t.customerId, t.type);
      results.push(res);
      await sleep(1000); // rate limit
    } catch (e) {
      results.push({ success: false, phone: t.phone, error: e.message });
    }
  }
  return results;
};

// ── Template-based sends ──────────────────────────────────
const sendFromTemplate = async (templateKey, customer, extraData = {}) => {
  const template = await getTemplate(templateKey);
  if (!template) return;
  const message = fillTemplate(template, { ...customer, ...extraData });
  return send(customer.whatsapp || customer.phone, message, customer.id, templateKey);
};

// ── Invoice notification ──────────────────────────────────
const sendInvoiceNotification = async (invoiceId) => {
  const { rows } = await query(`
    SELECT inv.*, c.name, c.phone, c.whatsapp, c.id as cust_id
    FROM invoices inv JOIN customers c ON inv.customer_id = c.id
    WHERE inv.id = $1
  `, [invoiceId]);
  if (!rows.length) throw new Error('Invoice not found');
  const inv = rows[0];

  // Create payment link
  const PaymentService = require('./paymentService');
  let paymentLink = '';
  try {
    const pm = await PaymentService.createPaymentLink(invoiceId, 'midtrans');
    paymentLink = pm.payment_url;
  } catch {}

  const template = await getTemplate('wa_invoice_template');
  const message = fillTemplate(template, {
    name:     inv.name,
    amount:   formatRupiah(inv.total),
    due_date: formatDate(inv.due_date),
    invoice_no: inv.invoice_no,
    link:     paymentLink,
  });

  return send(inv.whatsapp || inv.phone, message, inv.cust_id, 'invoice');
};

// ── Isolation notification ────────────────────────────────
const sendIsolationNotification = async (customerId, reason) => {
  const { rows } = await query('SELECT * FROM customers WHERE id=$1', [customerId]);
  if (!rows.length) return;
  return sendFromTemplate('wa_isolir_template', rows[0], { reason });
};

// ── Blast to multiple customers ───────────────────────────
const blastMessage = async (filters, message) => {
  let sql = `SELECT id, name, phone, whatsapp, status FROM customers WHERE 1=1`;
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    sql += ` AND status=$${params.length}`;
  }
  if (filters.package_id) {
    params.push(filters.package_id);
    sql += ` AND package_id=$${params.length}`;
  }

  const { rows } = await query(sql, params);
  const targets = rows.map(c => ({
    phone:      c.whatsapp || c.phone,
    message:    fillTemplate(message, c),
    customerId: c.id,
    type:       'blast',
  }));

  return sendBulk(targets);
};

// ── Helpers ───────────────────────────────────────────────
const formatRupiah = (n) => 'Rp ' + parseInt(n).toLocaleString('id-ID');
const formatDate   = (d) => new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
const sleep        = (ms) => new Promise(r => setTimeout(r, ms));

module.exports = { send, sendBulk, sendFromTemplate, sendInvoiceNotification, sendIsolationNotification, blastMessage };


// ══════════════════════════════════════════════════════════
// services/invoiceService.js  (included here for brevity)
// ══════════════════════════════════════════════════════════
const generateInvoices = async () => {
  // Called by cron: every day at 00:01
  const today = new Date();
  const { rows: customers } = await query(`
    SELECT c.*, p.price, p.name as pkg_name
    FROM customers c JOIN packages p ON c.package_id = p.id
    WHERE c.status IN ('active','isolated')
    AND EXTRACT(DAY FROM NOW()) = c.billing_date
  `);

  const { rows: cfg } = await query("SELECT value FROM settings WHERE key='invoice_due_days'");
  const dueDays = parseInt(cfg[0]?.value || 10);

  let created = 0;
  for (const cust of customers) {
    // Check if invoice already exists this month
    const { rows: exist } = await query(`
      SELECT id FROM invoices
      WHERE customer_id=$1 AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM NOW())
      AND EXTRACT(YEAR FROM created_at)=EXTRACT(YEAR FROM NOW())
      AND type='monthly'
    `, [cust.id]);
    if (exist.length) continue;

    const { rows: taxRow } = await query("SELECT value FROM settings WHERE key='tax_percent'");
    const taxPct = parseFloat(taxRow[0]?.value || 11) / 100;
    const tax    = Math.round(cust.price * taxPct);
    const total  = cust.price + tax;
    const dueDate = new Date(today); dueDate.setDate(today.getDate() + dueDays);

    const invNo = `INV-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`;

    const { rows: [inv] } = await query(`
      INSERT INTO invoices (invoice_no, customer_id, amount, tax, total, type, due_date, period_start, period_end)
      VALUES ($1,$2,$3,$4,$5,'monthly',$6,$7,$8) RETURNING id
    `, [invNo, cust.id, cust.price, tax, total, dueDate,
        new Date(today.getFullYear(), today.getMonth(), 1),
        new Date(today.getFullYear(), today.getMonth()+1, 0)]);

    // Send WA notification
    try {
      await sendInvoiceNotification(inv.id);
    } catch {}
    created++;
  }

  return { generated: created };
};

const autoIsolate = async () => {
  const { rows: cfg } = await query("SELECT value FROM settings WHERE key='auto_isolate_days'");
  const days = parseInt(cfg[0]?.value || 7);

  const { rows: overdue } = await query(`
    SELECT DISTINCT c.id, c.username, c.mikrotik_id, c.phone, c.whatsapp, c.name
    FROM invoices inv JOIN customers c ON inv.customer_id=c.id
    WHERE inv.status='unpaid'
    AND inv.due_date < NOW() - INTERVAL '${days} days'
    AND c.status='active'
  `);

  const MikrotikService = require('./mikrotikService');
  let isolated = 0;
  for (const cust of overdue) {
    try {
      await MikrotikService.isolateCustomer(cust.mikrotik_id, cust.username, 'Tagihan jatuh tempo');
      await query(`UPDATE customers SET status='isolated', isolation_reason='Auto-isolir: tagihan jatuh tempo' WHERE id=$1`, [cust.id]);
      await sendIsolationNotification(cust.id, 'tagihan telah melewati batas waktu pembayaran');
      isolated++;
    } catch {}
  }
  return { isolated };
};

module.exports.generateInvoices = generateInvoices;
module.exports.autoIsolate       = autoIsolate;
