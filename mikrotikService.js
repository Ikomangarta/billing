// services/mikrotikService.js
// RouterOS API via node-routeros
const RouterOSAPI = require('node-routeros').RouterOSAPI;
const { query } = require('../config/database');

class MikrotikService {
  constructor() { this._connections = new Map(); }

  // ── Connection Pool ───────────────────────────────────
  async getConn(deviceId) {
    if (this._connections.has(deviceId)) {
      const c = this._connections.get(deviceId);
      try { await c.write('/system/identity/print'); return c; } catch {}
    }
    const { rows } = await query('SELECT * FROM mikrotik_devices WHERE id=$1', [deviceId]);
    if (!rows.length) throw new Error('Mikrotik device not found');
    const dev = rows[0];
    const conn = new RouterOSAPI({
      host: dev.host, port: dev.port,
      user: dev.username, password: dev.password,
      timeout: 10000
    });
    await conn.connect();
    this._connections.set(deviceId, conn);
    return conn;
  }

  async disconnect(deviceId) {
    if (this._connections.has(deviceId)) {
      try { this._connections.get(deviceId).close(); } catch {}
      this._connections.delete(deviceId);
    }
  }

  // ── Device Info ───────────────────────────────────────
  async getIdentity(deviceId) {
    const c = await this.getConn(deviceId);
    const res = await c.write('/system/identity/print');
    return res[0]?.name || 'Unknown';
  }

  async getSystemResource(deviceId) {
    const c = await this.getConn(deviceId);
    const [res] = await c.write('/system/resource/print');
    return {
      uptime:       res.uptime,
      version:      res.version,
      cpu_load:     parseInt(res['cpu-load']),
      free_memory:  parseInt(res['free-memory']),
      total_memory: parseInt(res['total-memory']),
      free_hdd:     parseInt(res['free-hdd-space']),
      total_hdd:    parseInt(res['total-hdd-space']),
      board_name:   res['board-name'],
      platform:     res.platform,
    };
  }

  async getLiveStats() {
    try {
      const { rows: devices } = await query("SELECT id FROM mikrotik_devices WHERE status='online' LIMIT 1");
      if (!devices.length) return { online: 0, offline: 0, traffic_in: 0, traffic_out: 0 };
      const c = await this.getConn(devices[0].id);
      const ifaces = await c.write('/interface/print');
      let rx = 0, tx = 0;
      ifaces.forEach(i => { rx += parseInt(i['rx-byte']||0); tx += parseInt(i['tx-byte']||0); });
      const secrets = await c.write('/ppp/secret/print');
      const active  = await c.write('/ppp/active/print');
      return {
        total_users: secrets.length,
        online_users: active.length,
        traffic_in: rx,
        traffic_out: tx,
        timestamp: new Date()
      };
    } catch { return { online: 0, offline: 0, traffic_in: 0, traffic_out: 0 }; }
  }

  // ── PPPoE Secrets ─────────────────────────────────────
  async getPPPoESecrets(deviceId) {
    const c = await this.getConn(deviceId);
    return c.write('/ppp/secret/print');
  }

  async addPPPoESecret(deviceId, { username, password, profile, comment, ip_address, service = 'pppoe' }) {
    const c = await this.getConn(deviceId);
    const params = [
      '=name=' + username,
      '=password=' + password,
      '=service=' + service,
      '=profile=' + profile,
    ];
    if (comment)    params.push('=comment=' + comment);
    if (ip_address) params.push('=remote-address=' + ip_address);
    await c.write('/ppp/secret/add', params);
    return { success: true };
  }

  async updatePPPoESecret(deviceId, username, updates) {
    const c = await this.getConn(deviceId);
    const secrets = await c.write('/ppp/secret/print', ['?name=' + username]);
    if (!secrets.length) throw new Error('Secret not found: ' + username);
    const id = secrets[0]['.id'];
    const params = ['=.id=' + id];
    if (updates.password) params.push('=password=' + updates.password);
    if (updates.profile)  params.push('=profile=' + updates.profile);
    if (updates.ip_address) params.push('=remote-address=' + updates.ip_address);
    await c.write('/ppp/secret/set', params);
    return { success: true };
  }

  async deletePPPoESecret(deviceId, username) {
    const c = await this.getConn(deviceId);
    const secrets = await c.write('/ppp/secret/print', ['?name=' + username]);
    if (!secrets.length) return { success: true, msg: 'Not found, skipped' };
    await c.write('/ppp/secret/remove', ['=.id=' + secrets[0]['.id']]);
    return { success: true };
  }

  // ── Active Sessions ───────────────────────────────────
  async getActiveSessions(deviceId) {
    const c = await this.getConn(deviceId);
    return c.write('/ppp/active/print');
  }

  async kickSession(deviceId, username) {
    const c = await this.getConn(deviceId);
    const sessions = await c.write('/ppp/active/print', ['?name=' + username]);
    if (!sessions.length) return { success: true, msg: 'No active session' };
    await c.write('/ppp/active/remove', ['=.id=' + sessions[0]['.id']]);
    return { success: true };
  }

  // ── Isolation / Suspend ───────────────────────────────
  async isolateCustomer(deviceId, username, reason = '') {
    const c = await this.getConn(deviceId);
    // Method: change profile to "ISOLIR" (disable access)
    const secrets = await c.write('/ppp/secret/print', ['?name=' + username]);
    if (!secrets.length) throw new Error('User not found in Mikrotik');
    const id = secrets[0]['.id'];
    await c.write('/ppp/secret/set', ['=.id=' + id, '=profile=ISOLIR', '=comment=ISOLIR: ' + reason]);
    // Kick active session
    await this.kickSession(deviceId, username);
    return { success: true };
  }

  async restoreCustomer(deviceId, username, profile) {
    const c = await this.getConn(deviceId);
    const secrets = await c.write('/ppp/secret/print', ['?name=' + username]);
    if (!secrets.length) throw new Error('User not found in Mikrotik');
    const id = secrets[0]['.id'];
    await c.write('/ppp/secret/set', ['=.id=' + id, '=profile=' + profile, '=comment=']);
    return { success: true };
  }

  // ── IP Pool ───────────────────────────────────────────
  async getIPPools(deviceId) {
    const c = await this.getConn(deviceId);
    return c.write('/ip/pool/print');
  }

  // ── Address List (Static IP) ──────────────────────────
  async getAddressList(deviceId) {
    const c = await this.getConn(deviceId);
    return c.write('/ip/address/print');
  }

  async addStaticIP(deviceId, { address, interface: iface, comment }) {
    const c = await this.getConn(deviceId);
    await c.write('/ip/address/add', [
      '=address=' + address,
      '=interface=' + iface,
      '=comment=' + (comment || ''),
    ]);
    return { success: true };
  }

  // ── Profiles ──────────────────────────────────────────
  async getProfiles(deviceId) {
    const c = await this.getConn(deviceId);
    return c.write('/ppp/profile/print');
  }

  async addProfile(deviceId, { name, rate_limit, local_address, remote_address }) {
    const c = await this.getConn(deviceId);
    await c.write('/ppp/profile/add', [
      '=name=' + name,
      '=rate-limit=' + rate_limit,       // e.g. "10M/10M"
      '=local-address=' + (local_address || ''),
      '=remote-address=' + (remote_address || ''),
    ]);
    return { success: true };
  }

  async ensureIsolirProfile(deviceId) {
    const c = await this.getConn(deviceId);
    const profiles = await c.write('/ppp/profile/print', ['?name=ISOLIR']);
    if (!profiles.length) {
      await c.write('/ppp/profile/add', [
        '=name=ISOLIR',
        '=rate-limit=1k/1k',
        '=comment=Auto-created by NexaISP',
      ]);
    }
    return { success: true };
  }

  // ── Interfaces / Traffic ──────────────────────────────
  async getInterfaces(deviceId) {
    const c = await this.getConn(deviceId);
    return c.write('/interface/print');
  }

  async getInterfaceTraffic(deviceId, interfaceName) {
    const c = await this.getConn(deviceId);
    return c.write('/interface/monitor-traffic', [
      '=interface=' + interfaceName,
      '=once=',
    ]);
  }

  // ── Device Check ─────────────────────────────────────
  async pingDevice(deviceId) {
    try {
      await this.getConn(deviceId);
      await query("UPDATE mikrotik_devices SET status='online', last_check=NOW() WHERE id=$1", [deviceId]);
      return { online: true };
    } catch (e) {
      await query("UPDATE mikrotik_devices SET status='offline', last_check=NOW() WHERE id=$1", [deviceId]);
      return { online: false, error: e.message };
    }
  }
}

module.exports = new MikrotikService();
