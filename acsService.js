// services/acsService.js - GenieACS REST API Integration
const axios = require('axios');
const { query } = require('../config/database');

const getAcsClient = async () => {
  const { rows } = await query(
    "SELECT key, value FROM settings WHERE key IN ('genieacs_url','genieacs_user','genieacs_pass')"
  );
  const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const baseURL = cfg.genieacs_url || 'http://localhost:7557';
  return axios.create({
    baseURL,
    auth: cfg.genieacs_user
      ? { username: cfg.genieacs_user, password: cfg.genieacs_pass || '' }
      : undefined,
    timeout: 15000,
  });
};

// ── List all devices ──────────────────────────────────────
const getDevices = async (filter = '') => {
  const client = await getAcsClient();
  const params = { limit: 200 };
  if (filter) params.query = filter;
  const { data } = await client.get('/devices', { params });
  return data;
};

// ── Get single device ─────────────────────────────────────
const getDevice = async (deviceId) => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  const { data } = await client.get(`/devices/${encoded}`);
  return data;
};

// ── Get device parameters ─────────────────────────────────
const getDeviceParams = async (deviceId, projection = '') => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  const params = {};
  if (projection) params.projection = projection;
  const { data } = await client.get(`/devices/${encoded}`, { params });
  return data;
};

// ── Reboot device ─────────────────────────────────────────
const rebootDevice = async (deviceId) => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  await client.post('/devices/' + encoded + '/tasks', [{
    name: 'reboot'
  }], { params: { timeout: 30 } });
  return { success: true, action: 'reboot', deviceId };
};

// ── Factory reset ─────────────────────────────────────────
const factoryReset = async (deviceId) => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  await client.post('/devices/' + encoded + '/tasks', [{
    name: 'factoryReset'
  }], { params: { timeout: 30 } });
  return { success: true, action: 'factoryReset', deviceId };
};

// ── Set parameter value ───────────────────────────────────
const setParameter = async (deviceId, paramName, paramValue, paramType = 'xsd:string') => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  await client.post('/devices/' + encoded + '/tasks', [{
    name: 'setParameterValues',
    parameterValues: [[paramName, paramValue, paramType]]
  }], { params: { timeout: 30 } });
  return { success: true, param: paramName, value: paramValue };
};

// ── Get parameter value ───────────────────────────────────
const getParameter = async (deviceId, paramName) => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  await client.post('/devices/' + encoded + '/tasks', [{
    name: 'getParameterValues',
    parameterNames: [paramName]
  }], { params: { timeout: 30 } });
  return { success: true, param: paramName };
};

// ── WiFi Configuration ────────────────────────────────────
const setWifi = async (deviceId, { ssid, password, band = '2.4GHz' }) => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  const prefix = band === '5GHz'
    ? 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2'
    : 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1';

  await client.post('/devices/' + encoded + '/tasks', [{
    name: 'setParameterValues',
    parameterValues: [
      [`${prefix}.SSID`, ssid, 'xsd:string'],
      [`${prefix}.PreSharedKey.1.KeyPassphrase`, password, 'xsd:string'],
      [`${prefix}.Enable`, 'true', 'xsd:boolean'],
    ]
  }], { params: { timeout: 30 } });

  return { success: true, ssid, band };
};

// ── PPPoE Configuration on CPE ────────────────────────────
const configurePPPoE = async (deviceId, { username, password }) => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  const prefix = 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1';

  await client.post('/devices/' + encoded + '/tasks', [{
    name: 'setParameterValues',
    parameterValues: [
      [`${prefix}.Username`, username, 'xsd:string'],
      [`${prefix}.Password`, password, 'xsd:string'],
      [`${prefix}.ConnectionType`, 'PPPoE_Bridged', 'xsd:string'],
      [`${prefix}.Enable`, 'true', 'xsd:boolean'],
    ]
  }], { params: { timeout: 60 } });

  return { success: true, username };
};

// ── Sync devices to DB ────────────────────────────────────
const syncDevicesToDB = async () => {
  const devices = await getDevices();
  let synced = 0;

  for (const dev of devices) {
    const deviceId = dev['_id'] || dev.DeviceID;
    const sn = dev['InternetGatewayDevice.DeviceInfo.SerialNumber']?._value
      || dev['Device.DeviceInfo.SerialNumber']?._value || '';
    const mac = dev['InternetGatewayDevice.WANDevice.1.WANCommonInterfaceConfig.1.MACAddress']?._value || '';
    const model = dev['InternetGatewayDevice.DeviceInfo.ModelName']?._value
      || dev['Device.DeviceInfo.ModelName']?._value || '';
    const manufacturer = dev['InternetGatewayDevice.DeviceInfo.Manufacturer']?._value || '';
    const firmware = dev['InternetGatewayDevice.DeviceInfo.SoftwareVersion']?._value || '';
    const ip = dev['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANIPConnection.1.ExternalIPAddress']?._value || '';
    const lastSeen = dev['_lastInform'] ? new Date(dev['_lastInform']) : null;

    await query(`
      INSERT INTO acs_devices (device_id, serial_number, mac_address, model, manufacturer, firmware, ip_address, last_seen, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'online')
      ON CONFLICT (device_id) DO UPDATE SET
        serial_number=$2, mac_address=$3, model=$4, manufacturer=$5,
        firmware=$6, ip_address=$7, last_seen=$8, status='online'
    `, [deviceId, sn, mac, model, manufacturer, firmware, ip, lastSeen]);
    synced++;
  }

  return { synced };
};

// ── Get tasks ─────────────────────────────────────────────
const getTasks = async (deviceId) => {
  const client = await getAcsClient();
  const encoded = encodeURIComponent(deviceId);
  const { data } = await client.get(`/tasks?query={"device":"${deviceId}"}`);
  return data;
};

module.exports = {
  getDevices, getDevice, getDeviceParams,
  rebootDevice, factoryReset,
  setParameter, getParameter,
  setWifi, configurePPPoE,
  syncDevicesToDB, getTasks,
};
