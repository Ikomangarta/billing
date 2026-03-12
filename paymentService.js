// services/paymentService.js
const axios = require('axios');
const { query } = require('../config/database');

// ── Helpers ───────────────────────────────────────────────
const getSettings = async (keys) => {
  const { rows } = await query(`SELECT key, value FROM settings WHERE key = ANY($1)`, [keys]);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
};

// ══════════════════════════════════════════════════════════
//  MIDTRANS
// ══════════════════════════════════════════════════════════
const midtransCreate = async (invoice, customer) => {
  const cfg = await getSettings(['midtrans_server_key','midtrans_client_key','midtrans_mode','isp_name']);
  const isProduction = cfg.midtrans_mode === 'production';
  const baseURL = isProduction
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const payload = {
    transaction_details: {
      order_id:     invoice.invoice_no,
      gross_amount: invoice.total,
    },
    customer_details: {
      first_name: customer.name,
      email:      customer.email || '',
      phone:      customer.phone,
    },
    item_details: [{
      id:       'internet-' + invoice.id,
      price:    invoice.total,
      quantity: 1,
      name:     `Tagihan Internet ${cfg.isp_name}`,
    }],
    callbacks: {
      finish: `${process.env.APP_DOMAIN}/payment/finish`,
    },
  };

  const auth = Buffer.from(cfg.midtrans_server_key + ':').toString('base64');
  const { data } = await axios.post(baseURL, payload, {
    headers: { Authorization: 'Basic ' + auth, 'Content-Type': 'application/json' }
  });

  // Save payment record
  await query(`
    INSERT INTO payments (invoice_id, customer_id, amount, gateway, gateway_trx_id, status, payload)
    VALUES ($1, $2, $3, 'midtrans', $4, 'pending', $5)
  `, [invoice.id, customer.id, invoice.total, invoice.invoice_no, JSON.stringify(data)]);

  return {
    gateway:    'midtrans',
    token:      data.token,
    payment_url: data.redirect_url,
    order_id:   invoice.invoice_no,
    client_key: cfg.midtrans_client_key,
    is_production: isProduction,
  };
};

const midtransCallback = async (notification) => {
  const cfg = await getSettings(['midtrans_server_key']);
  const { order_id, transaction_status, fraud_status, gross_amount } = notification;

  const isSuccess = (transaction_status === 'capture' && fraud_status === 'accept')
    || transaction_status === 'settlement';
  const isFailed  = ['cancel','deny','expire'].includes(transaction_status);

  const status = isSuccess ? 'paid' : isFailed ? 'cancelled' : 'pending';

  if (isSuccess) {
    await query(`UPDATE invoices SET status='paid', paid_at=NOW(), payment_method='midtrans' WHERE invoice_no=$1`, [order_id]);
    await query(`UPDATE payments SET status='paid', paid_at=NOW() WHERE gateway_trx_id=$1`, [order_id]);
    // Trigger: auto-restore if was isolated
    await autoRestoreAfterPayment(order_id);
  } else if (isFailed) {
    await query(`UPDATE payments SET status='failed' WHERE gateway_trx_id=$1`, [order_id]);
  }

  return { order_id, status };
};

// ══════════════════════════════════════════════════════════
//  XENDIT
// ══════════════════════════════════════════════════════════
const xenditCreate = async (invoice, customer) => {
  const cfg = await getSettings(['xendit_secret_key','isp_name']);
  const baseURL = 'https://api.xendit.co/v2/invoices';

  const payload = {
    external_id:      invoice.invoice_no,
    amount:           invoice.total,
    payer_email:      customer.email || 'noemail@nexaisp.local',
    description:      `Tagihan Internet ${cfg.isp_name} - ${customer.name}`,
    customer: {
      given_names:  customer.name,
      email:        customer.email || '',
      mobile_number: customer.phone,
    },
    customer_notification_preference: {
      invoice_created:  ['whatsapp','email'],
      invoice_reminder: ['whatsapp'],
      invoice_paid:     ['whatsapp','email'],
    },
    success_redirect_url: `${process.env.APP_DOMAIN}/payment/success`,
    failure_redirect_url: `${process.env.APP_DOMAIN}/payment/failed`,
    currency: 'IDR',
    items: [{
      name:     `Tagihan Internet ${cfg.isp_name}`,
      quantity: 1,
      price:    invoice.total,
    }],
  };

  const { data } = await axios.post(baseURL, payload, {
    auth: { username: cfg.xendit_secret_key, password: '' }
  });

  await query(`
    INSERT INTO payments (invoice_id, customer_id, amount, gateway, gateway_trx_id, status, payload)
    VALUES ($1, $2, $3, 'xendit', $4, 'pending', $5)
  `, [invoice.id, customer.id, invoice.total, data.id, JSON.stringify(data)]);

  return {
    gateway:     'xendit',
    invoice_id:  data.id,
    payment_url: data.invoice_url,
    expiry_date: data.expiry_date,
    order_id:    invoice.invoice_no,
  };
};

const xenditCallback = async (body, callbackToken) => {
  const cfg = await getSettings(['xendit_callback_token']);
  if (cfg.xendit_callback_token && callbackToken !== cfg.xendit_callback_token) {
    throw new Error('Invalid callback token');
  }

  const { external_id, status, payment_method } = body;

  if (status === 'PAID') {
    await query(`UPDATE invoices SET status='paid', paid_at=NOW(), payment_method=$1 WHERE invoice_no=$2`,
      [payment_method || 'xendit', external_id]);
    await query(`UPDATE payments SET status='paid', paid_at=NOW() WHERE gateway_trx_id=(SELECT id::text FROM payments WHERE invoice_id=(SELECT id FROM invoices WHERE invoice_no=$1) LIMIT 1)`,
      [external_id]);
    await autoRestoreAfterPayment(external_id);
  }

  return { external_id, status };
};

// ── Auto restore after payment ────────────────────────────
const autoRestoreAfterPayment = async (invoiceNo) => {
  try {
    const { rows } = await query(`
      SELECT c.*, p.profile_mk, inv.id as inv_id
      FROM invoices inv
      JOIN customers c ON inv.customer_id = c.id
      JOIN packages p ON c.package_id = p.id
      WHERE inv.invoice_no = $1 AND c.status = 'isolated'
    `, [invoiceNo]);

    if (!rows.length) return;
    const customer = rows[0];

    const MikrotikService = require('./mikrotikService');
    await MikrotikService.restoreCustomer(customer.mikrotik_id, customer.username, customer.profile_mk);
    await query(`UPDATE customers SET status='active', isolation_reason=NULL WHERE id=$1`, [customer.id]);

    const WaService = require('./whatsappService');
    await WaService.sendFromTemplate('wa_aktivasi_template', customer);
  } catch (e) {
    console.error('[AUTO-RESTORE] Error:', e.message);
  }
};

// ── Unified create ────────────────────────────────────────
const createPaymentLink = async (invoiceId, gateway = 'midtrans') => {
  const { rows: invRows } = await query(`
    SELECT inv.*, c.name, c.email, c.phone, c.id as cust_id
    FROM invoices inv JOIN customers c ON inv.customer_id = c.id
    WHERE inv.id = $1
  `, [invoiceId]);

  if (!invRows.length) throw new Error('Invoice not found');
  const inv = invRows[0];
  const customer = { id: inv.cust_id, name: inv.name, email: inv.email, phone: inv.phone };

  if (gateway === 'xendit')   return xenditCreate(inv, customer);
  return midtransCreate(inv, customer);
};

module.exports = { createPaymentLink, midtransCallback, xenditCallback };
