import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ── Mock data ──────────────────────────────────────────────
const mockCustomers = [
  { id:1, customer_no:"CUST-0001", name:"Budi Santoso", phone:"08123456789", whatsapp:"08123456789", address:"Jl. Merdeka No.1, Jakarta", status:"active", package_name:"Paket 20Mbps", speed_down:20, speed_up:10, ip_address:"192.168.1.100", username:"budi.santoso", lat:-6.2088, lng:106.8456, billing_date:1, balance:0 },
  { id:2, customer_no:"CUST-0002", name:"Siti Rahayu", phone:"08234567890", whatsapp:"08234567890", address:"Jl. Sudirman No.5, Jakarta", status:"isolated", package_name:"Paket 50Mbps", speed_down:50, speed_up:25, ip_address:"", username:"siti.rahayu", lat:-6.2200, lng:106.8350, billing_date:5, balance:0 },
  { id:3, customer_no:"CUST-0003", name:"Ahmad Fauzi", phone:"08345678901", whatsapp:"08345678901", address:"Jl. Thamrin No.10, Jakarta", status:"active", package_name:"Paket 100Mbps", speed_down:100, speed_up:50, ip_address:"192.168.1.102", username:"ahmad.fauzi", lat:-6.1944, lng:106.8229, billing_date:10, balance:0 },
  { id:4, customer_no:"CUST-0004", name:"Dewi Lestari", phone:"08456789012", whatsapp:"08456789012", address:"Jl. Gatot Subroto No.20", status:"suspended", package_name:"Paket 10Mbps", speed_down:10, speed_up:5, ip_address:"", username:"dewi.lestari", lat:-6.2297, lng:106.8100, billing_date:15, balance:0 },
  { id:5, customer_no:"CUST-0005", name:"Rizky Firmansyah", phone:"08567890123", whatsapp:"08567890123", address:"Jl. Kuningan No.8", status:"active", package_name:"Paket 50Mbps", speed_down:50, speed_up:25, ip_address:"10.10.1.50", username:"rizky.firmansyah", lat:-6.2400, lng:106.8300, billing_date:20, balance:0 },
];

const mockInvoices = [
  { id:1, invoice_no:"INV-202407-0001", customer_name:"Budi Santoso", customer_no:"CUST-0001", total:220000, amount:198000, tax:22000, status:"unpaid", due_date:"2024-08-10", period:"Juli 2024" },
  { id:2, invoice_no:"INV-202407-0002", customer_name:"Siti Rahayu", customer_no:"CUST-0002", total:495000, amount:450000, tax:45000, status:"overdue", due_date:"2024-07-20", period:"Juli 2024" },
  { id:3, invoice_no:"INV-202407-0003", customer_name:"Ahmad Fauzi", customer_no:"CUST-0003", total:990000, amount:900000, tax:90000, status:"paid", due_date:"2024-08-01", period:"Juli 2024" },
  { id:4, invoice_no:"INV-202407-0004", customer_name:"Rizky Firmansyah", customer_no:"CUST-0005", total:495000, amount:450000, tax:45000, status:"unpaid", due_date:"2024-08-20", period:"Juli 2024" },
];

const mockPackages = [
  { id:1, name:"Paket 10Mbps", speed_down:10, speed_up:5, price:110000, type:"pppoe", profile_mk:"10M", is_active:true },
  { id:2, name:"Paket 20Mbps", speed_down:20, speed_up:10, price:198000, type:"pppoe", profile_mk:"20M", is_active:true },
  { id:3, name:"Paket 50Mbps", speed_down:50, speed_up:25, price:450000, type:"pppoe", profile_mk:"50M", is_active:true },
  { id:4, name:"Paket 100Mbps", speed_down:100, speed_up:50, price:900000, type:"pppoe", profile_mk:"100M", is_active:true },
  { id:5, name:"Paket Static IP", speed_down:20, speed_up:10, price:275000, type:"static", profile_mk:"20M-STATIC", is_active:true },
];

const mockMikrotik = [
  { id:1, name:"MK-Core-01", host:"192.168.88.1", port:8728, username:"admin", location:"NOC Utama", status:"online", last_check:"2 menit lalu" },
  { id:2, name:"MK-Distribution-02", host:"10.0.0.1", port:8728, username:"admin", location:"Area Selatan", status:"online", last_check:"1 menit lalu" },
  { id:3, name:"MK-Edge-03", host:"10.0.1.1", port:8728, username:"admin", location:"Area Timur", status:"offline", last_check:"15 menit lalu" },
];

const mockAcsDevices = [
  { id:1, device_id:"ZTE-F670L-AABBCC", serial_number:"ZTEGAABBCC001", model:"ZTE F670L", manufacturer:"ZTE", firmware:"V9.0.20P4T26", ip_address:"192.168.1.1", status:"online", customer_name:"Budi Santoso", last_seen:"1 menit lalu" },
  { id:2, device_id:"HUAWEI-EG8145V5-112233", serial_number:"HWTC112233", model:"EG8145V5", manufacturer:"Huawei", firmware:"V3.0R20C10SPC900", ip_address:"10.0.0.50", status:"online", customer_name:"Ahmad Fauzi", last_seen:"3 menit lalu" },
  { id:3, device_id:"FIBERHOME-AN5506-DDEEFF", serial_number:"FH20DDEEFF", model:"AN5506-04-FA", manufacturer:"FiberHome", firmware:"RP2722", ip_address:"10.0.0.51", status:"offline", customer_name:"Siti Rahayu", last_seen:"45 menit lalu" },
];

const revenueData = [
  { month:"Jan", revenue:12500000, expense:8000000 },
  { month:"Feb", revenue:15000000, expense:9000000 },
  { month:"Mar", revenue:14200000, expense:8500000 },
  { month:"Apr", revenue:18000000, expense:10000000 },
  { month:"Mei", revenue:17500000, expense:9800000 },
  { month:"Jun", revenue:21000000, expense:11000000 },
  { month:"Jul", revenue:24500000, expense:12000000 },
];

const fmt = (n) => 'Rp ' + parseInt(n||0).toLocaleString('id-ID');

// ══════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════
export default function App() {
  const [page, setPage]         = useState("dashboard");
  const [role, setRole]         = useState("admin");
  const [sidebar, setSidebar]   = useState(true);
  const [notif, setNotif]       = useState(false);
  const [modal, setModal]       = useState(null); // { type, data }
  const [toast, setToast]       = useState(null);
  const [ticker, setTicker]     = useState(0);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    const t = setInterval(() => setTicker(x => x+1), 3000);
    return () => clearInterval(t);
  }, []);

  const showToast = useCallback((msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const adminNav = [
    { id:"dashboard",  icon:"⬡", label:"Dashboard" },
    { id:"customers",  icon:"◈", label:"Pelanggan" },
    { id:"mikrotik",   icon:"⬙", label:"Mikrotik" },
    { id:"packages",   icon:"◇", label:"Paket" },
    { id:"invoices",   icon:"◎", label:"Invoice" },
    { id:"payment",    icon:"◉", label:"Pembayaran" },
    { id:"whatsapp",   icon:"⬟", label:"WhatsApp" },
    { id:"acs",        icon:"⬡", label:"ACS / ONU" },
    { id:"maps",       icon:"◈", label:"Peta Jaringan" },
    { id:"settings",   icon:"⚙", label:"Pengaturan" },
  ];

  const clientNav = [
    { id:"dashboard",  icon:"⬡", label:"Beranda" },
    { id:"cek",        icon:"◎", label:"Cek Tagihan" },
    { id:"myinvoices", icon:"◇", label:"Invoice Saya" },
  ];

  const nav = role === "admin" ? adminNav : clientNav;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#080D1A", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#D8DCE8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1E2A40;border-radius:3px}
        .nav-btn{display:flex;align-items:center;gap:11px;padding:10px 14px;border-radius:9px;cursor:pointer;border:none;background:none;width:100%;text-align:left;font-size:13px;font-weight:500;color:#6B7490;transition:all .15s}
        .nav-btn:hover{background:#0F1828;color:#D8DCE8}
        .nav-btn.on{background:linear-gradient(135deg,#0B1F35,#0A2D4A);color:#00CFAA;border:1px solid rgba(0,207,170,.18)}
        .card{background:#0C1422;border:1px solid #162035;border-radius:13px;padding:18px}
        .badge{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.5px}
        .btn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:12px;font-weight:600;transition:all .15s;font-family:inherit}
        .btn-g{background:linear-gradient(135deg,#00CFAA,#00A88A);color:#000}
        .btn-g:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,207,170,.3)}
        .btn-o{background:transparent;color:#6B7490;border:1px solid #162035}
        .btn-o:hover{border-color:#00CFAA;color:#00CFAA}
        .btn-r{background:rgba(255,88,88,.12);color:#ff5858;border:1px solid rgba(255,88,88,.2)}
        .btn-r:hover{background:rgba(255,88,88,.22)}
        .btn-y{background:rgba(255,207,64,.1);color:#FFCF40;border:1px solid rgba(255,207,64,.2)}
        .tr{display:grid;padding:11px 16px;border-bottom:1px solid #162035;align-items:center;transition:background .15s;cursor:pointer}
        .tr:hover{background:#0F1828}
        .th{font-size:10px;color:#6B7490;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
        input,select,textarea{background:#0C1422;border:1px solid #162035;color:#D8DCE8;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;transition:border .15s;width:100%}
        input:focus,select:focus,textarea:focus{border-color:#00CFAA}
        .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center}
        .modal{background:#0C1422;border:1px solid #162035;border-radius:16px;padding:28px;width:560px;max-height:85vh;overflow-y:auto;position:relative}
        .fade{animation:fi .3s ease}
        @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .pulse{animation:p 1.8s infinite}
        @keyframes p{0%,100%{opacity:1}50%{opacity:.4}}
        .dot{width:7px;height:7px;border-radius:50%;display:inline-block}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, right:20, zIndex:999, background: toast.type==="success"?"#00CFAA":toast.type==="error"?"#ff5858":"#FFCF40", color:"#000", padding:"12px 20px", borderRadius:10, fontSize:13, fontWeight:600, boxShadow:"0 8px 30px rgba(0,0,0,.4)" }}>
          {toast.type==="success"?"✓ ":toast.type==="error"?"✗ ":"! "}{toast.msg}
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width:sidebar?225:56, background:"#060A14", borderRight:"1px solid #162035", display:"flex", flexDirection:"column", transition:"width .25s", overflow:"hidden", flexShrink:0, zIndex:10 }}>
        <div style={{ padding:"18px 14px", borderBottom:"1px solid #162035" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#00CFAA,#0057FF)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>⬡</div>
            {sidebar && <div>
              <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace", color:"#E8ECF5" }}>NexaISP</div>
              <div style={{ fontSize:9, color:"#00CFAA", fontWeight:700, letterSpacing:1 }}>ISP MANAGEMENT</div>
            </div>}
          </div>
        </div>

        {sidebar && (
          <div style={{ padding:"10px 12px", borderBottom:"1px solid #162035" }}>
            <div style={{ display:"flex", background:"#0C1422", borderRadius:7, padding:3, gap:2 }}>
              {["admin","client"].map(r => (
                <button key={r} onClick={() => { setRole(r); setPage("dashboard"); }}
                  style={{ flex:1, padding:"5px", borderRadius:5, border:"none", cursor:"pointer", fontSize:10, fontWeight:700, background:role===r?"linear-gradient(135deg,#00CFAA,#00A88A)":"transparent", color:role===r?"#000":"#6B7490", transition:"all .15s", textTransform:"uppercase", letterSpacing:.5 }}>
                  {r === "admin" ? "Admin" : "Klien"}
                </button>
              ))}
            </div>
          </div>
        )}

        <nav style={{ flex:1, padding:"10px 6px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
          {nav.map(item => (
            <button key={item.id} className={`nav-btn ${page===item.id?"on":""}`} onClick={() => setPage(item.id)}>
              <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
              {sidebar && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div style={{ padding:"12px 14px", borderTop:"1px solid #162035" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:"linear-gradient(135deg,#0057FF,#00CFAA)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, flexShrink:0 }}>A</div>
            {sidebar && <div style={{ overflow:"hidden" }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#D8DCE8", whiteSpace:"nowrap" }}>Admin Utama</div>
              <div style={{ fontSize:9, color:"#6B7490" }}>superadmin</div>
            </div>}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ height:56, background:"#060A14", borderBottom:"1px solid #162035", display:"flex", alignItems:"center", padding:"0 20px", gap:12, flexShrink:0 }}>
          <button onClick={() => setSidebar(!sidebar)} style={{ background:"none", border:"none", color:"#6B7490", cursor:"pointer", fontSize:16 }}>☰</button>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari pelanggan, no.invoice..." style={{ width:260 }} />
          <div style={{ flex:1 }} />
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(0,207,170,.08)", border:"1px solid rgba(0,207,170,.15)", padding:"5px 12px", borderRadius:20 }}>
            <span className="dot pulse" style={{ background:"#00CFAA" }}></span>
            <span style={{ fontSize:11, color:"#00CFAA", fontWeight:700 }}>LIVE</span>
          </div>
          <button onClick={() => setNotif(!notif)} style={{ position:"relative", background:"none", border:"none", color:"#6B7490", cursor:"pointer", fontSize:16 }}>
            🔔
            <span style={{ position:"absolute", top:-3, right:-3, width:14, height:14, background:"#ff5858", borderRadius:"50%", fontSize:8, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700 }}>3</span>
          </button>
          {notif && (
            <div style={{ position:"absolute", top:50, right:60, width:290, background:"#0C1422", border:"1px solid #162035", borderRadius:12, zIndex:100 }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid #162035", fontSize:12, fontWeight:700 }}>Notifikasi</div>
              {[
                { icon:"🚨", msg:"CUST-0002 sudah 7 hari belum bayar", t:"5m" },
                { icon:"✅", msg:"Invoice INV-202407-0003 dibayar", t:"2j" },
                { icon:"⚠️", msg:"MK-Edge-03 offline terdeteksi", t:"15m" },
              ].map((n,i) => (
                <div key={i} style={{ padding:"10px 14px", borderBottom:"1px solid #162035", display:"flex", gap:10, alignItems:"flex-start" }}>
                  <span>{n.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:"#D8DCE8" }}>{n.msg}</div>
                    <div style={{ fontSize:10, color:"#6B7490", marginTop:2 }}>{n.t} lalu</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:22 }} className="fade" key={page}>

          {/* ══ DASHBOARD ══ */}
          {page === "dashboard" && <Dashboard ticker={ticker} role={role} setPage={setPage} />}

          {/* ══ CUSTOMERS ══ */}
          {page === "customers" && <Customers customers={mockCustomers} setModal={setModal} showToast={showToast} />}

          {/* ══ MIKROTIK ══ */}
          {page === "mikrotik" && <MikrotikPage devices={mockMikrotik} setModal={setModal} showToast={showToast} />}

          {/* ══ PACKAGES ══ */}
          {page === "packages" && <PackagesPage packages={mockPackages} setModal={setModal} showToast={showToast} />}

          {/* ══ INVOICES ══ */}
          {page === "invoices" && <InvoicesPage invoices={mockInvoices} setModal={setModal} showToast={showToast} />}

          {/* ══ PAYMENT ══ */}
          {page === "payment" && <PaymentPage showToast={showToast} />}

          {/* ══ WHATSAPP ══ */}
          {page === "whatsapp" && <WhatsAppPage showToast={showToast} />}

          {/* ══ ACS ══ */}
          {page === "acs" && <ACSPage devices={mockAcsDevices} setModal={setModal} showToast={showToast} />}

          {/* ══ MAPS ══ */}
          {page === "maps" && <MapsPage customers={mockCustomers} />}

          {/* ══ SETTINGS ══ */}
          {page === "settings" && <SettingsPage showToast={showToast} />}

          {/* ══ CEK TAGIHAN (public) ══ */}
          {page === "cek" && <CekTagihan />}
          {page === "myinvoices" && <MyInvoices invoices={mockInvoices} />}
        </div>
      </div>

      {/* Modals */}
      {modal && <Modal modal={modal} setModal={setModal} showToast={showToast} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════
function Dashboard({ ticker, role, setPage }) {
  const kpis = [
    { label:"Total Pelanggan", val: 247 + (ticker%3), sub:"+5 bulan ini", color:"#00CFAA", icon:"👥" },
    { label:"Pelanggan Aktif", val: 231, sub:"93.5% aktif", color:"#0057FF", icon:"✅" },
    { label:"Invoice Belum Bayar", val: fmt(715000), sub:"3 invoice tertunda", color:"#FFCF40", icon:"📄" },
    { label:"Pendapatan Bulan Ini", val: fmt(24500000), sub:"+16% vs bulan lalu", color:"#00CFAA", icon:"💰" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Dashboard {role==="admin"?"Admin":"Pelanggan"}</h1>
          <p style={{ fontSize:12, color:"#6B7490", marginTop:2 }}>Kamis, 25 Juli 2024</p>
        </div>
        <button className="btn btn-g">+ Pelanggan Baru</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {kpis.map((k,i) => (
          <div key={i} className="card" style={{ cursor:"default" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:20 }}>{k.icon}</span>
              <span style={{ fontSize:9, color:"#00CFAA", background:"rgba(0,207,170,.1)", padding:"2px 7px", borderRadius:20, fontWeight:700 }}>↑</span>
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:k.color, fontFamily:"'Space Mono',monospace" }}>{k.val}</div>
            <div style={{ fontSize:11, color:"#6B7490", marginTop:3 }}>{k.label}</div>
            <div style={{ fontSize:10, color:"#00CFAA", marginTop:5 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12 }}>
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <div><div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5" }}>Pendapatan 2024</div><div style={{ fontSize:10, color:"#6B7490" }}>7 bulan terakhir</div></div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00CFAA" stopOpacity={.2}/><stop offset="95%" stopColor="#00CFAA" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#162035" />
              <XAxis dataKey="month" stroke="#6B7490" fontSize={10} />
              <YAxis stroke="#6B7490" fontSize={9} tickFormatter={v=>`${v/1000000}jt`} />
              <Tooltip contentStyle={{ background:"#0C1422", border:"1px solid #162035", borderRadius:8, fontSize:11 }} formatter={v=>[fmt(v),""]} />
              <Area type="monotone" dataKey="revenue" stroke="#00CFAA" fill="url(#rg)" strokeWidth={2} name="Pendapatan" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5", marginBottom:12 }}>Status Pelanggan</div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={[{name:"Aktif",value:231},{name:"Isolir",value:10},{name:"Suspend",value:6}]} cx="50%" cy="50%" innerRadius={40} outerRadius:={62} paddingAngle={3} dataKey="value">
                {["#00CFAA","#FFCF40","#ff5858"].map((c,i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip contentStyle={{ background:"#0C1422", border:"1px solid #162035", borderRadius:8, fontSize:11 }} />
            </PieChart>
          </ResponsiveContainer>
          {[["Aktif","231","#00CFAA"],["Isolir","10","#FFCF40"],["Suspend","6","#ff5858"]].map(([l,v,c],i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"4px 0", borderBottom:"1px solid #162035" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span className="dot" style={{ background:c }}></span>
                <span style={{ color:"#6B7490" }}>{l}</span>
              </div>
              <span style={{ color:"#E8ECF5", fontWeight:700 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5", marginBottom:14 }}>Aksi Cepat</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {[
            { label:"+ Pelanggan Baru", color:"btn-g" },
            { label:"📄 Buat Invoice", color:"btn-o" },
            { label:"📱 Blast WhatsApp", color:"btn-o" },
            { label:"🔒 Auto Isolir", color:"btn-r" },
            { label:"🔄 Sync Mikrotik", color:"btn-o" },
            { label:"📊 Laporan Bulan Ini", color:"btn-o" },
          ].map((a,i)=>(
            <button key={i} className={`btn ${a.color}`} style={{ fontSize:12 }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  CUSTOMERS
// ══════════════════════════════════════════════════════════
function Customers({ customers, setModal, showToast }) {
  const statusColor = { active:"#00CFAA", isolated:"#FFCF40", suspended:"#ff5858", terminated:"#6B7490", pending:"#0057FF" };
  const statusLabel = { active:"Aktif", isolated:"Isolir", suspended:"Suspend", terminated:"Berhenti", pending:"Pending" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Manajemen Pelanggan</h1><p style={{ fontSize:12, color:"#6B7490" }}>{customers.length} pelanggan terdaftar</p></div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-o">📥 Ekspor CSV</button>
          <button className="btn btn-g" onClick={()=>setModal({type:"addCustomer"})}>+ Tambah Pelanggan</button>
        </div>
      </div>

      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid #162035", display:"flex", gap:10 }}>
          <input placeholder="Cari nama, no.pelanggan, telepon..." style={{ width:280 }} />
          <select style={{ width:140 }}><option>Semua Status</option><option>Aktif</option><option>Isolir</option><option>Suspend</option></select>
          <select style={{ width:160 }}><option>Semua Paket</option>{mockPackages.map(p=><option key={p.id}>{p.name}</option>)}</select>
        </div>

        <div className="tr th" style={{ gridTemplateColumns:"1.5fr 1.2fr 1fr 1fr 1fr 120px" }}>
          {["Pelanggan","Username / IP","Paket","Status","Billing","Aksi"].map(h=><span key={h}>{h}</span>)}
        </div>

        {customers.map(c=>(
          <div key={c.id} className="tr" style={{ gridTemplateColumns:"1.5fr 1.2fr 1fr 1fr 1fr 120px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#0057FF,#00CFAA)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:12, flexShrink:0 }}>{c.name[0]}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5" }}>{c.name}</div>
                <div style={{ fontSize:10, color:"#6B7490" }}>{c.customer_no} · {c.phone}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"#00CFAA" }}>{c.username}</div>
              <div style={{ fontSize:10, color:"#6B7490" }}>{c.ip_address || "DHCP"}</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:"#D8DCE8" }}>{c.package_name}</div>
              <div style={{ fontSize:10, color:"#6B7490" }}>{c.speed_down}/{c.speed_up} Mbps</div>
            </div>
            <span className="badge" style={{ background:`rgba(${c.status==="active"?"0,207,170":c.status==="isolated"?"255,207,64":"255,88,88"},.12)`, color:statusColor[c.status]||"#6B7490" }}>{statusLabel[c.status]||c.status}</span>
            <div style={{ fontSize:11, color:"#6B7490" }}>Tgl {c.billing_date}</div>
            <div style={{ display:"flex", gap:4 }}>
              <button className="btn btn-o" style={{ padding:"4px 8px", fontSize:10 }} onClick={()=>setModal({type:"editCustomer",data:c})}>Edit</button>
              {c.status==="active" && <button className="btn btn-r" style={{ padding:"4px 8px", fontSize:10 }} onClick={()=>{ setModal({type:"isolate",data:c}); }}>Isolir</button>}
              {c.status==="isolated" && <button className="btn btn-y" style={{ padding:"4px 8px", fontSize:10 }}>Restore</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MIKROTIK
// ══════════════════════════════════════════════════════════
function MikrotikPage({ devices, setModal, showToast }) {
  const [activeDevice, setActiveDevice] = useState(null);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Manajemen Mikrotik</h1><p style={{ fontSize:12, color:"#6B7490" }}>RouterOS API Management</p></div>
        <button className="btn btn-g" onClick={()=>setModal({type:"addMikrotik"})}>+ Tambah Device</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {devices.map(d=>(
          <div key={d.id} className="card" style={{ cursor:"pointer", border:activeDevice===d.id?"1px solid #00CFAA":"1px solid #162035" }} onClick={()=>setActiveDevice(activeDevice===d.id?null:d.id)}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ width:36, height:36, background:"linear-gradient(135deg,#0A1F3A,#0A2D4A)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⬙</div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span className="dot pulse" style={{ background:d.status==="online"?"#00CFAA":"#ff5858" }}></span>
                <span style={{ fontSize:10, color:d.status==="online"?"#00CFAA":"#ff5858", fontWeight:700 }}>{d.status.toUpperCase()}</span>
              </div>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#E8ECF5" }}>{d.name}</div>
            <div style={{ fontSize:11, color:"#6B7490", marginTop:3, fontFamily:"'Space Mono',monospace" }}>{d.host}:{d.port}</div>
            <div style={{ fontSize:10, color:"#6B7490", marginTop:2 }}>{d.location}</div>
            <div style={{ fontSize:9, color:"#6B7490", marginTop:6 }}>Cek terakhir: {d.last_check}</div>
            {activeDevice===d.id && (
              <div style={{ marginTop:14, display:"flex", gap:6, flexWrap:"wrap" }}>
                {["PPPoE Secrets","Active Sessions","Profil","IP Pool","Interface","Ping"].map(a=>(
                  <button key={a} className="btn btn-o" style={{ padding:"4px 8px", fontSize:10 }} onClick={e=>{e.stopPropagation();showToast(`Memuat ${a}...`)}}>{a}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* PPPoE Section */}
      <div className="card">
        <div style={{ fontSize:14, fontWeight:600, color:"#E8ECF5", marginBottom:14 }}>PPPoE Active Sessions</div>
        <div className="tr th" style={{ gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr" }}>
          {["Username","IP Address","Uptime","Download","Upload"].map(h=><span key={h}>{h}</span>)}
        </div>
        {mockCustomers.filter(c=>c.status==="active").map(c=>(
          <div key={c.id} className="tr" style={{ gridTemplateColumns:"1.5fr 1fr 1fr 1fr 1fr" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:"#00CFAA" }}>{c.username}</div>
            <div style={{ fontSize:12, color:"#D8DCE8" }}>{c.ip_address||"10.0.0."+Math.floor(Math.random()*200+10)}</div>
            <div style={{ fontSize:11, color:"#6B7490" }}>{Math.floor(Math.random()*48)+1}h {Math.floor(Math.random()*59)}m</div>
            <div style={{ fontSize:11, color:"#00CFAA" }}>{(Math.random()*c.speed_down).toFixed(1)} Mbps</div>
            <div style={{ fontSize:11, color:"#0057FF" }}>{(Math.random()*c.speed_up).toFixed(1)} Mbps</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PACKAGES
// ══════════════════════════════════════════════════════════
function PackagesPage({ packages, setModal, showToast }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Profil Paket</h1><p style={{ fontSize:12, color:"#6B7490" }}>PPPoE, Static IP, Hotspot</p></div>
        <button className="btn btn-g" onClick={()=>setModal({type:"addPackage"})}>+ Tambah Paket</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
        {packages.map(p=>(
          <div key={p.id} className="card">
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <span className="badge" style={{ background:"rgba(0,87,255,.12)", color:"#4488FF", fontSize:9 }}>{p.type.toUpperCase()}</span>
              <span style={{ width:8, height:8, borderRadius:"50%", background:p.is_active?"#00CFAA":"#ff5858", display:"inline-block" }}></span>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:"#E8ECF5", marginBottom:4 }}>{p.name}</div>
            <div style={{ fontSize:22, fontWeight:700, color:"#00CFAA", fontFamily:"'Space Mono',monospace", marginBottom:6 }}>{fmt(p.price)}<span style={{ fontSize:11, color:"#6B7490", fontFamily:"'DM Sans',sans-serif" }}>/bln</span></div>
            <div style={{ display:"flex", gap:12, marginBottom:12 }}>
              <div style={{ fontSize:11, color:"#6B7490" }}>↓ <span style={{ color:"#E8ECF5", fontWeight:600 }}>{p.speed_down} Mbps</span></div>
              <div style={{ fontSize:11, color:"#6B7490" }}>↑ <span style={{ color:"#E8ECF5", fontWeight:600 }}>{p.speed_up} Mbps</span></div>
            </div>
            <div style={{ fontSize:10, color:"#6B7490", fontFamily:"'Space Mono',monospace", marginBottom:12 }}>Profile MK: {p.profile_mk}</div>
            <div style={{ display:"flex", gap:6 }}>
              <button className="btn btn-o" style={{ flex:1, padding:"6px", fontSize:11 }}>Edit</button>
              <button className="btn btn-o" style={{ flex:1, padding:"6px", fontSize:11 }}>Sync MK</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  INVOICES
// ══════════════════════════════════════════════════════════
function InvoicesPage({ invoices, setModal, showToast }) {
  const sc = { paid:"#00CFAA", unpaid:"#FFCF40", overdue:"#ff5858", cancelled:"#6B7490" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Manajemen Invoice</h1></div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-o" onClick={()=>showToast("Generating invoice bulanan...")}>🔄 Generate Bulanan</button>
          <button className="btn btn-g" onClick={()=>setModal({type:"addInvoice"})}>+ Buat Invoice</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { l:"Total Tagihan", v:fmt(invoices.reduce((s,i)=>s+i.total,0)), c:"#0057FF" },
          { l:"Sudah Bayar", v:fmt(invoices.filter(i=>i.status==="paid").reduce((s,i)=>s+i.total,0)), c:"#00CFAA" },
          { l:"Belum Bayar", v:fmt(invoices.filter(i=>i.status==="unpaid").reduce((s,i)=>s+i.total,0)), c:"#FFCF40" },
          { l:"Jatuh Tempo", v:fmt(invoices.filter(i=>i.status==="overdue").reduce((s,i)=>s+i.total,0)), c:"#ff5858" },
        ].map((m,i)=>(
          <div key={i} className="card">
            <div style={{ fontSize:10, color:"#6B7490", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>{m.l}</div>
            <div style={{ fontSize:20, fontWeight:700, color:m.c, fontFamily:"'Space Mono',monospace" }}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        <div className="tr th" style={{ gridTemplateColumns:"1.5fr 1.8fr 1fr 1fr 1fr 100px", background:"#060A14" }}>
          {["No. Invoice","Pelanggan","Total","Jatuh Tempo","Status","Aksi"].map(h=><span key={h}>{h}</span>)}
        </div>
        {invoices.map(inv=>(
          <div key={inv.id} className="tr" style={{ gridTemplateColumns:"1.5fr 1.8fr 1fr 1fr 1fr 100px" }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"#E8ECF5" }}>{inv.invoice_no}</div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#E8ECF5" }}>{inv.customer_name}</div>
              <div style={{ fontSize:10, color:"#6B7490" }}>{inv.customer_no}</div>
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:"#00CFAA", fontFamily:"'Space Mono',monospace" }}>{fmt(inv.total)}</div>
            <div style={{ fontSize:11, color:"#6B7490" }}>{inv.due_date}</div>
            <span className="badge" style={{ background:`rgba(${inv.status==="paid"?"0,207,170":inv.status==="unpaid"?"255,207,64":"255,88,88"},.12)`, color:sc[inv.status]||"#6B7490" }}>{inv.status.toUpperCase()}</span>
            <div style={{ display:"flex", gap:4 }}>
              <button className="btn btn-o" style={{ padding:"4px 8px", fontSize:10 }}>Lihat</button>
              {inv.status!=="paid" && <button className="btn btn-g" style={{ padding:"4px 8px", fontSize:10 }} onClick={()=>showToast("Link pembayaran dibuat!")}>Bayar</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  PAYMENT
// ══════════════════════════════════════════════════════════
function PaymentPage({ showToast }) {
  const [gw, setGw] = useState("midtrans");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Payment Gateway</h1><p style={{ fontSize:12, color:"#6B7490" }}>Midtrans & Xendit Integration</p></div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {/* Midtrans */}
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, background:"linear-gradient(135deg,#003088,#0055FF)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:12, color:"#fff" }}>MT</div>
              <div><div style={{ fontSize:14, fontWeight:700, color:"#E8ECF5" }}>Midtrans</div><div style={{ fontSize:10, color:"#6B7490" }}>Snap Payment Gateway</div></div>
            </div>
            <span className="badge" style={{ background:"rgba(0,207,170,.12)", color:"#00CFAA" }}>AKTIF</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>SERVER KEY</label><input type="password" defaultValue="SB-Mid-server-xxxxx" /></div>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>CLIENT KEY</label><input type="password" defaultValue="SB-Mid-client-xxxxx" /></div>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>MODE</label>
              <select><option>Sandbox (Testing)</option><option>Production</option></select>
            </div>
            <button className="btn btn-g" style={{ marginTop:4 }} onClick={()=>showToast("Konfigurasi Midtrans tersimpan!")}>Simpan Konfigurasi</button>
          </div>
        </div>

        {/* Xendit */}
        <div className="card">
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, background:"linear-gradient(135deg,#003366,#0066CC)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:12, color:"#fff" }}>XD</div>
              <div><div style={{ fontSize:14, fontWeight:700, color:"#E8ECF5" }}>Xendit</div><div style={{ fontSize:10, color:"#6B7490" }}>Invoice & E-Wallet Gateway</div></div>
            </div>
            <span className="badge" style={{ background:"rgba(255,207,64,.12)", color:"#FFCF40" }}>TESTING</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>SECRET KEY</label><input type="password" defaultValue="xnd_development_xxxxx" /></div>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>CALLBACK TOKEN</label><input type="password" defaultValue="" placeholder="Isi callback verification token" /></div>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>WEBHOOK URL</label><input readOnly value="https://yourdomain.com/api/payment/xendit/callback" style={{ fontSize:11, color:"#6B7490" }} /></div>
            <button className="btn btn-g" style={{ marginTop:4 }} onClick={()=>showToast("Konfigurasi Xendit tersimpan!")}>Simpan Konfigurasi</button>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div style={{ fontSize:14, fontWeight:600, color:"#E8ECF5", marginBottom:14 }}>Transaksi Terbaru</div>
        {[
          { trx:"MID-202407001", name:"Ahmad Fauzi", amount:990000, gw:"Midtrans", method:"Bank Transfer BCA", status:"paid", time:"2j lalu" },
          { trx:"XND-202407002", name:"Budi Santoso", amount:220000, gw:"Xendit", method:"OVO", status:"pending", time:"30m lalu" },
          { trx:"MID-202407003", name:"Rizky Firmansyah", amount:495000, gw:"Midtrans", method:"GoPay", status:"paid", time:"1h lalu" },
        ].map((t,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #162035" }}>
            <div>
              <div style={{ fontSize:12, fontFamily:"'Space Mono',monospace", color:"#D8DCE8" }}>{t.trx}</div>
              <div style={{ fontSize:11, color:"#6B7490" }}>{t.name} · {t.method} · {t.gw}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#00CFAA", fontFamily:"'Space Mono',monospace" }}>{fmt(t.amount)}</div>
              <span className="badge" style={{ background:t.status==="paid"?"rgba(0,207,170,.12)":"rgba(255,207,64,.12)", color:t.status==="paid"?"#00CFAA":"#FFCF40" }}>{t.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  WHATSAPP
// ══════════════════════════════════════════════════════════
function WhatsAppPage({ showToast }) {
  const [blastMsg, setBlastMsg] = useState("Halo {name}, tagihan internet Anda sebesar {amount} jatuh tempo {due_date}. Bayar sekarang: {link}");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>WhatsApp Gateway</h1><p style={{ fontSize:12, color:"#6B7490" }}>Via Fonnte API</p></div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div className="card">
          <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5", marginBottom:14 }}>Konfigurasi Fonnte</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>FONNTE TOKEN</label><input type="password" placeholder="Masukkan token Fonnte Anda" /></div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-g" style={{ flex:1 }} onClick={()=>showToast("Token tersimpan!")}>Simpan Token</button>
              <button className="btn btn-o" style={{ flex:1 }} onClick={()=>showToast("Test WhatsApp terkirim!")}>Test Kirim</button>
            </div>
          </div>
          <div style={{ marginTop:16, padding:"10px 14px", background:"rgba(0,207,170,.06)", border:"1px solid rgba(0,207,170,.15)", borderRadius:9 }}>
            <div style={{ fontSize:11, color:"#00CFAA", fontWeight:600, marginBottom:4 }}>Status Koneksi</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span className="dot pulse" style={{ background:"#00CFAA" }}></span>
              <span style={{ fontSize:11, color:"#D8DCE8" }}>Terhubung · Kuota: 985/1000 pesan</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5", marginBottom:14 }}>Kirim Pesan Manual</div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>NOMOR TUJUAN</label><input placeholder="628xxxxxxxxxx" /></div>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>PESAN</label><textarea rows={3} placeholder="Ketik pesan..." style={{ resize:"none" }} /></div>
            <button className="btn btn-g" onClick={()=>showToast("Pesan WhatsApp terkirim!")}>📱 Kirim Sekarang</button>
          </div>
        </div>
      </div>

      {/* Blast */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5", marginBottom:14 }}>Blast Pesan ke Pelanggan</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>TARGET PELANGGAN</label><select><option>Semua Pelanggan Aktif</option><option>Pelanggan Terisolir</option><option>Invoice Belum Bayar</option><option>Invoice Jatuh Tempo</option></select></div>
            <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>TEMPLATE PESAN</label>
              <textarea rows={5} value={blastMsg} onChange={e=>setBlastMsg(e.target.value)} style={{ resize:"none", fontSize:12 }} />
            </div>
            <div style={{ fontSize:10, color:"#6B7490" }}>Variabel: {"{name}"}, {"{amount}"}, {"{due_date}"}, {"{invoice_no}"}, {"{link}"}, {"{package}"}</div>
            <button className="btn btn-g" onClick={()=>showToast("Blast ke 231 pelanggan berhasil dijadwalkan!")}>🚀 Blast ke 231 Pelanggan</button>
          </div>
          <div>
            <div style={{ fontSize:11, color:"#6B7490", marginBottom:10 }}>Preview Pesan:</div>
            <div style={{ background:"#060A14", border:"1px solid #162035", borderRadius:9, padding:14, fontSize:12, color:"#D8DCE8", whiteSpace:"pre-wrap", lineHeight:1.6 }}>
              {blastMsg.replace("{name}","Budi Santoso").replace("{amount}","Rp 220.000").replace("{due_date}","10 Agustus 2024").replace("{invoice_no}","INV-202407-0001").replace("{link}","https://bayar.nexaisp.id/inv001")}
            </div>
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="card">
        <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5", marginBottom:12 }}>Log WhatsApp Terbaru</div>
        {[
          { name:"Budi Santoso", phone:"08123456789", type:"invoice", status:"sent", time:"2j" },
          { name:"Siti Rahayu", phone:"08234567890", type:"isolasi", status:"sent", time:"3j" },
          { name:"Ahmad Fauzi", phone:"08345678901", type:"invoice", status:"failed", time:"5j" },
        ].map((l,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid #162035" }}>
            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
              <span>{l.type==="invoice"?"📄":"🔒"}</span>
              <div>
                <div style={{ fontSize:12, color:"#D8DCE8" }}>{l.name}</div>
                <div style={{ fontSize:10, color:"#6B7490" }}>{l.phone} · {l.type} · {l.time} lalu</div>
              </div>
            </div>
            <span className="badge" style={{ background:l.status==="sent"?"rgba(0,207,170,.12)":"rgba(255,88,88,.12)", color:l.status==="sent"?"#00CFAA":"#ff5858" }}>{l.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  ACS
// ══════════════════════════════════════════════════════════
function ACSPage({ devices, setModal, showToast }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>ACS / GenieACS</h1><p style={{ fontSize:12, color:"#6B7490" }}>TR-069 Device Management</p></div>
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn btn-o" onClick={()=>showToast("Sinkronisasi perangkat...")}>🔄 Sync Devices</button>
          <button className="btn btn-g" onClick={()=>setModal({type:"acsConfig"})}>⚙ Konfigurasi ACS</button>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[
          { l:"Total ONU/CPE", v:devices.length, c:"#0057FF" },
          { l:"Online", v:devices.filter(d=>d.status==="online").length, c:"#00CFAA" },
          { l:"Offline", v:devices.filter(d=>d.status==="offline").length, c:"#ff5858" },
        ].map((m,i)=>(
          <div key={i} className="card">
            <div style={{ fontSize:10, color:"#6B7490", marginBottom:6 }}>{m.l}</div>
            <div style={{ fontSize:28, fontWeight:700, color:m.c, fontFamily:"'Space Mono',monospace" }}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        <div className="tr th" style={{ gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 120px", background:"#060A14" }}>
          {["Perangkat","Serial / MAC","Firmware","IP","Status","Aksi"].map(h=><span key={h}>{h}</span>)}
        </div>
        {devices.map(d=>(
          <div key={d.id} className="tr" style={{ gridTemplateColumns:"2fr 1.5fr 1fr 1fr 1fr 120px" }}>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:"#E8ECF5" }}>{d.model}</div>
              <div style={{ fontSize:10, color:"#6B7490" }}>{d.manufacturer} · {d.customer_name}</div>
            </div>
            <div>
              <div style={{ fontSize:10, fontFamily:"'Space Mono',monospace", color:"#D8DCE8" }}>{d.serial_number}</div>
            </div>
            <div style={{ fontSize:10, color:"#6B7490" }}>{d.firmware}</div>
            <div style={{ fontSize:11, fontFamily:"'Space Mono',monospace", color:"#0057FF" }}>{d.ip_address}</div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <span className="dot" style={{ background:d.status==="online"?"#00CFAA":"#ff5858" }}></span>
              <span style={{ fontSize:10, color:d.status==="online"?"#00CFAA":"#ff5858" }}>{d.status}</span>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              <button className="btn btn-o" style={{ padding:"4px 7px", fontSize:9 }} onClick={()=>showToast("Reboot dikirim!")}>Reboot</button>
              <button className="btn btn-o" style={{ padding:"4px 7px", fontSize:9 }} onClick={()=>setModal({type:"acsDevice",data:d})}>Detail</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAPS
// ══════════════════════════════════════════════════════════
function MapsPage({ customers }) {
  const statusColor = { active:"#00CFAA", isolated:"#FFCF40", suspended:"#ff5858" };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Peta Jaringan</h1><p style={{ fontSize:12, color:"#6B7490" }}>Sebaran pelanggan & infrastruktur</p></div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
        {/* Map placeholder */}
        <div className="card" style={{ height:450, position:"relative", overflow:"hidden", padding:0 }}>
          <div style={{ width:"100%", height:"100%", background:"linear-gradient(145deg,#060D1F,#0A1628)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
            {/* Simulated map grid */}
            <svg width="100%" height="100%" style={{ position:"absolute", opacity:.15 }}>
              {Array.from({length:20}).map((_,i)=><line key={`h${i}`} x1="0" y1={i*25} x2="100%" y2={i*25} stroke="#00CFAA" strokeWidth=".5"/>)}
              {Array.from({length:30}).map((_,i)=><line key={`v${i}`} x1={i*30} y1="0" x2={i*30} y2="100%" stroke="#00CFAA" strokeWidth=".5"/>)}
            </svg>
            {/* Customer pins */}
            {customers.map((c,i) => (
              <div key={c.id} style={{ position:"absolute", left:`${20+i*14}%`, top:`${25+i*8}%`, cursor:"pointer" }} title={c.name}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:statusColor[c.status]||"#6B7490", border:"2px solid #060A14", boxShadow:`0 0 8px ${statusColor[c.status]||"#6B7490"}` }}></div>
                <div style={{ fontSize:8, color:"#D8DCE8", marginTop:2, background:"rgba(6,10,20,.8)", padding:"1px 4px", borderRadius:3, whiteSpace:"nowrap" }}>{c.name.split(" ")[0]}</div>
              </div>
            ))}
            <div style={{ zIndex:1, textAlign:"center" }}>
              <div style={{ fontSize:30, marginBottom:8 }}>🗺️</div>
              <div style={{ fontSize:13, color:"#6B7490" }}>Peta interaktif akan tampil</div>
              <div style={{ fontSize:11, color:"#6B7490", marginTop:4 }}>Konfigurasi Google Maps API Key di Pengaturan</div>
              <button style={{ marginTop:12, background:"rgba(0,207,170,.1)", border:"1px solid rgba(0,207,170,.2)", color:"#00CFAA", padding:"7px 14px", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 }}>Set API Key</button>
            </div>
          </div>
        </div>

        {/* Customer list */}
        <div className="card" style={{ overflow:"auto", maxHeight:450 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#E8ECF5", marginBottom:12 }}>Pelanggan di Peta</div>
          {customers.map(c=>(
            <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #162035", cursor:"pointer" }}>
              <span className="dot" style={{ background:statusColor[c.status]||"#6B7490", flexShrink:0 }}></span>
              <div style={{ flex:1, overflow:"hidden" }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#E8ECF5", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</div>
                <div style={{ fontSize:10, color:"#6B7490", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.address}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════════
function SettingsPage({ showToast }) {
  const [tab, setTab] = useState("isp");
  const tabs = [
    { id:"isp", label:"Profil ISP" },
    { id:"mikrotik", label:"Mikrotik" },
    { id:"payment", label:"Payment" },
    { id:"whatsapp", label:"WhatsApp" },
    { id:"acs", label:"GenieACS" },
    { id:"billing", label:"Billing" },
    { id:"notif", label:"Notifikasi" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div><h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Pengaturan Sistem</h1></div>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr", gap:14 }}>
        <div className="card" style={{ display:"flex", flexDirection:"column", gap:3, padding:10 }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ padding:"9px 12px", borderRadius:7, border:"none", background:tab===t.id?"linear-gradient(135deg,#0B1F35,#0A2D4A)":"transparent", color:tab===t.id?"#00CFAA":"#6B7490", cursor:"pointer", textAlign:"left", fontSize:12, fontWeight:500, transition:"all .15s" }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="card">
          {tab === "isp" && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#E8ECF5", marginBottom:18 }}>Profil ISP</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { l:"Nama ISP", v:"NexaISP", k:"isp_name" },
                  { l:"Email", v:"info@nexaisp.id", k:"isp_email" },
                  { l:"Telepon", v:"+62 21 5000 1234", k:"isp_phone" },
                  { l:"Website", v:"https://nexaisp.id", k:"isp_website" },
                ].map(f=>(
                  <div key={f.k}><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>{f.l.toUpperCase()}</label><input defaultValue={f.v} /></div>
                ))}
                <div style={{ gridColumn:"span 2" }}><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>ALAMAT</label><textarea rows={2} defaultValue="Jl. Sudirman No.123, Jakarta" style={{ resize:"none" }} /></div>
              </div>
              <button className="btn btn-g" style={{ marginTop:16 }} onClick={()=>showToast("Profil ISP tersimpan!")}>Simpan Perubahan</button>
            </div>
          )}
          {tab === "billing" && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#E8ECF5", marginBottom:18 }}>Konfigurasi Billing</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { l:"Jatuh Tempo Invoice (hari setelah generate)", k:"invoice_due_days", v:"10", t:"number" },
                  { l:"Auto-isolir setelah (hari jatuh tempo)", k:"auto_isolate_days", v:"7", t:"number" },
                  { l:"Pajak PPN (%)", k:"tax_percent", v:"11", t:"number" },
                  { l:"Jam Generate Invoice", k:"invoice_time", v:"00:01", t:"time" },
                ].map(f=>(
                  <div key={f.k} style={{ display:"grid", gridTemplateColumns:"1fr 200px", alignItems:"center", gap:12 }}>
                    <label style={{ fontSize:12, color:"#D8DCE8" }}>{f.l}</label>
                    <input type={f.t} defaultValue={f.v} style={{ width:"auto" }} />
                  </div>
                ))}
              </div>
              <button className="btn btn-g" style={{ marginTop:16 }} onClick={()=>showToast("Konfigurasi billing tersimpan!")}>Simpan</button>
            </div>
          )}
          {tab === "acs" && (
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#E8ECF5", marginBottom:18 }}>GenieACS Configuration</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { l:"GenieACS URL", v:"http://localhost:7557", k:"acs_url" },
                  { l:"Username", v:"admin", k:"acs_user" },
                  { l:"Password", v:"", k:"acs_pass", t:"password" },
                ].map(f=>(
                  <div key={f.k}><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>{f.l.toUpperCase()}</label><input type={f.t||"text"} defaultValue={f.v} placeholder={f.l} /></div>
                ))}
                <div style={{ display:"flex", gap:8, marginTop:4 }}>
                  <button className="btn btn-g" style={{ flex:1 }} onClick={()=>showToast("Konfigurasi ACS tersimpan!")}>Simpan</button>
                  <button className="btn btn-o" style={{ flex:1 }} onClick={()=>showToast("Koneksi ACS berhasil!")}>Test Koneksi</button>
                </div>
              </div>
            </div>
          )}
          {!["isp","billing","acs"].includes(tab) && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:"#6B7490", fontSize:13 }}>Konfigurasi {tabs.find(t=>t.id===tab)?.label} — tersedia di instalasi penuh</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  CEK TAGIHAN (PUBLIC)
// ══════════════════════════════════════════════════════════
function CekTagihan() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCek = () => {
    if (!q.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const found = mockCustomers.find(c => c.customer_no===q.trim() || c.phone===q.trim() || c.username===q.trim());
      if (found) {
        const invs = mockInvoices.filter(i => i.customer_name===found.name && i.status!=="paid");
        setResult({ customer: found, invoices: invs, total: invs.reduce((s,i)=>s+i.total,0) });
      } else {
        setResult({ notFound: true });
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ fontSize:32, marginBottom:10 }}>📋</div>
        <h1 style={{ fontSize:22, fontWeight:700, color:"#E8ECF5" }}>Cek Status Tagihan</h1>
        <p style={{ fontSize:13, color:"#6B7490", marginTop:6 }}>Masukkan nomor pelanggan, nomor telepon, atau username</p>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleCek()} placeholder="CUST-0001 / 0812xxxxxx / username" style={{ flex:1, padding:"12px 16px", fontSize:14 }} />
        <button className="btn btn-g" style={{ padding:"12px 24px", fontSize:14 }} onClick={handleCek} disabled={loading}>
          {loading ? "⏳" : "🔍 Cek"}
        </button>
      </div>

      {result && !result.notFound && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }} className="fade">
          <div className="card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#E8ECF5" }}>{result.customer.name}</div>
              <div style={{ fontSize:11, color:"#6B7490", marginTop:3 }}>{result.customer.customer_no} · {result.customer.package_name}</div>
            </div>
            <span className="badge" style={{ background:result.customer.status==="active"?"rgba(0,207,170,.12)":"rgba(255,207,64,.12)", color:result.customer.status==="active"?"#00CFAA":"#FFCF40", fontSize:11 }}>
              {result.customer.status==="active"?"✅ Aktif":"⚠️ Diisolir"}
            </span>
          </div>

          {result.invoices.length === 0 ? (
            <div className="card" style={{ textAlign:"center", color:"#00CFAA", fontSize:14, padding:24 }}>✅ Tidak ada tagihan yang belum dibayar!</div>
          ) : (
            <>
              <div style={{ fontSize:12, color:"#6B7490", fontWeight:600 }}>TAGIHAN BELUM DIBAYAR</div>
              {result.invoices.map(inv=>(
                <div key={inv.id} className="card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:13, fontFamily:"'Space Mono',monospace", color:"#E8ECF5" }}>{inv.invoice_no}</div>
                    <div style={{ fontSize:11, color:"#6B7490", marginTop:3 }}>{inv.period} · Jatuh tempo: {inv.due_date}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:16, fontWeight:700, color:"#00CFAA", fontFamily:"'Space Mono',monospace" }}>{fmt(inv.total)}</div>
                    <button className="btn btn-g" style={{ marginTop:6, fontSize:11, padding:"5px 12px" }}>💳 Bayar Sekarang</button>
                  </div>
                </div>
              ))}
              <div className="card" style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:13, fontWeight:600, color:"#D8DCE8" }}>Total yang harus dibayar</span>
                <span style={{ fontSize:16, fontWeight:700, color:"#FFCF40", fontFamily:"'Space Mono',monospace" }}>{fmt(result.total)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {result?.notFound && (
        <div className="card" style={{ textAlign:"center", color:"#ff5858", fontSize:14, padding:24 }}>❌ Pelanggan tidak ditemukan. Periksa kembali nomor yang dimasukkan.</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MY INVOICES (client view)
// ══════════════════════════════════════════════════════════
function MyInvoices({ invoices }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <h1 style={{ fontSize:20, fontWeight:700, color:"#E8ECF5" }}>Invoice Saya</h1>
      {invoices.slice(0,3).map(inv=>(
        <div key={inv.id} className="card" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, fontFamily:"'Space Mono',monospace", color:"#E8ECF5" }}>{inv.invoice_no}</div>
            <div style={{ fontSize:11, color:"#6B7490", marginTop:4 }}>{inv.period} · Jatuh tempo {inv.due_date}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#00CFAA", fontFamily:"'Space Mono',monospace" }}>{fmt(inv.total)}</div>
            <span className="badge" style={{ background:inv.status==="paid"?"rgba(0,207,170,.12)":"rgba(255,207,64,.12)", color:inv.status==="paid"?"#00CFAA":"#FFCF40" }}>{inv.status==="paid"?"Lunas":"Belum Bayar"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MODAL
// ══════════════════════════════════════════════════════════
function Modal({ modal, setModal, showToast }) {
  const close = () => setModal(null);
  const save = (msg) => { showToast(msg); close(); };

  return (
    <div className="modal-bg" onClick={close}>
      <div className="modal fade" onClick={e=>e.stopPropagation()}>
        <button onClick={close} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", color:"#6B7490", cursor:"pointer", fontSize:20 }}>×</button>

        {modal.type === "addCustomer" && (
          <>
            <div style={{ fontSize:16, fontWeight:700, color:"#E8ECF5", marginBottom:20 }}>Tambah Pelanggan Baru</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["Nama Lengkap","text",""],["No. Telepon","tel",""],["WhatsApp","tel","(jika berbeda)"],["Email","email",""],["Alamat Lengkap","text",""],["Username PPPoE","text",""],["Password PPPoE","password",""],["Static IP (kosong=DHCP)","text",""],].map(([l,t,p])=>(
                <div key={l}><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>{l.toUpperCase()}</label><input type={t} placeholder={p} /></div>
              ))}
              <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>PAKET</label><select>{mockPackages.map(p=><option key={p.id}>{p.name}</option>)}</select></div>
              <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>MIKROTIK DEVICE</label><select>{mockMikrotik.map(m=><option key={m.id}>{m.name}</option>)}</select></div>
              <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>TANGGAL BILLING</label><input type="number" min="1" max="28" defaultValue="1" /></div>
              <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>TANGGAL INSTALASI</label><input type="date" /></div>
            </div>
            <div style={{ marginTop:16, display:"flex", gap:8 }}>
              <button className="btn btn-g" style={{ flex:1 }} onClick={()=>save("Pelanggan baru berhasil ditambahkan & PPPoE dibuat di Mikrotik!")}>✓ Simpan & Buat PPPoE</button>
              <button className="btn btn-o" onClick={close}>Batal</button>
            </div>
          </>
        )}

        {modal.type === "isolate" && (
          <>
            <div style={{ fontSize:16, fontWeight:700, color:"#ff5858", marginBottom:6 }}>🔒 Isolir Pelanggan</div>
            <div style={{ fontSize:13, color:"#6B7490", marginBottom:20 }}>Pelanggan: <span style={{ color:"#E8ECF5", fontWeight:600 }}>{modal.data?.name}</span></div>
            <div style={{ marginBottom:12 }}><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>ALASAN ISOLIR</label>
              <select><option>Tagihan jatuh tempo</option><option>Permintaan pelanggan</option><option>Pelanggaran penggunaan</option><option>Lainnya</option></select>
            </div>
            <div style={{ marginBottom:16 }}><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>CATATAN</label><textarea rows={2} placeholder="Catatan tambahan..." style={{ resize:"none" }} /></div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn btn-r" style={{ flex:1 }} onClick={()=>save("Pelanggan berhasil diisolir & WhatsApp notifikasi terkirim!")}>🔒 Isolir Sekarang</button>
              <button className="btn btn-o" onClick={close}>Batal</button>
            </div>
          </>
        )}

        {modal.type === "addPackage" && (
          <>
            <div style={{ fontSize:16, fontWeight:700, color:"#E8ECF5", marginBottom:20 }}>Tambah Paket Baru</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[["Nama Paket","text"],["Harga/Bulan (Rp)","number"],["Kecepatan Download (Mbps)","number"],["Kecepatan Upload (Mbps)","number"],["Nama Profile Mikrotik","text"],["Burst Limit (opsional)","text"]].map(([l,t])=>(
                <div key={l}><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>{l.toUpperCase()}</label><input type={t} /></div>
              ))}
              <div><label style={{ fontSize:10, color:"#6B7490", display:"block", marginBottom:4 }}>TIPE</label><select><option>pppoe</option><option>static</option><option>hotspot</option></select></div>
            </div>
            <div style={{ marginTop:16, display:"flex", gap:8 }}>
              <button className="btn btn-g" style={{ flex:1 }} onClick={()=>save("Paket baru disimpan & profile dibuat di Mikrotik!")}>✓ Simpan & Sync Mikrotik</button>
              <button className="btn btn-o" onClick={close}>Batal</button>
            </div>
          </>
        )}

        {modal.type === "acsDevice" && (
          <>
            <div style={{ fontSize:16, fontWeight:700, color:"#E8ECF5", marginBottom:20 }}>Detail ONU/CPE</div>
            {modal.data && Object.entries({ "Model":modal.data.model, "Manufacturer":modal.data.manufacturer, "Serial Number":modal.data.serial_number, "Firmware":modal.data.firmware, "IP Address":modal.data.ip_address, "Pelanggan":modal.data.customer_name, "Terakhir Dilihat":modal.data.last_seen }).map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderBottom:"1px solid #162035", fontSize:12 }}>
                <span style={{ color:"#6B7490" }}>{k}</span>
                <span style={{ color:"#E8ECF5", fontWeight:600, fontFamily:k.includes("Serial")||k.includes("IP")?"'Space Mono',monospace":"inherit" }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop:16, display:"flex", gap:8, flexWrap:"wrap" }}>
              {["🔄 Reboot","⚡ Factory Reset","📶 Set WiFi","🔧 Set PPPoE","📋 Get Parameters"].map(a=>(
                <button key={a} className="btn btn-o" style={{ fontSize:11 }} onClick={()=>save(`${a.split(" ")[1]} command dikirim!`)}>{a}</button>
              ))}
            </div>
          </>
        )}

        {["addMikrotik","addInvoice","acsConfig","editCustomer"].includes(modal.type) && (
          <div style={{ textAlign:"center", padding:20, color:"#6B7490" }}>
            <div style={{ fontSize:24, marginBottom:12 }}>🔧</div>
            <div style={{ fontSize:14, color:"#E8ECF5", marginBottom:8 }}>Form {modal.type}</div>
            <div style={{ fontSize:12 }}>Tersedia di versi instalasi penuh</div>
            <button className="btn btn-o" style={{ marginTop:16 }} onClick={close}>Tutup</button>
          </div>
        )}
      </div>
    </div>
  );
}
