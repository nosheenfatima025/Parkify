import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:3000/api";
const FLASK_URL = "http://localhost:5000";
const avatarColors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

export default function EntryExitLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, inside: 0, completed: 0, overstay: 0, revenue: 0 });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ show: false, msg: "", error: false });
  const [detailLog, setDetailLog] = useState(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [entryPlate, setEntryPlate] = useState("");
  const [entryVehicleInfo, setEntryVehicleInfo] = useState(null);
  const [exitPlate, setExitPlate] = useState("");
  const [exitPreview, setExitPreview] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [tickerText, setTickerText] = useState("Loading activity...");
  const clockRef = useRef(null);
  const [clock, setClock] = useState("");

  const [entryMode, setEntryMode] = useState("manual");
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const PER_PAGE = 10;

  const showToast = (msg, error = false) => {
    setToast({ show: true, msg, error });
    setTimeout(() => setToast({ show: false, msg: "", error: false }), 3500);
  };

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem("parkify_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [logsRes, vehiclesRes] = await Promise.all([
        fetch(`${API}/parking/logs`, { headers }),
        fetch(`${API}/vehicles/all`, { headers })
      ]);
      const logsData = await logsRes.json();
      const vehiclesData = await vehiclesRes.json();
      const logsArr = Array.isArray(logsData) ? logsData : [];
      const vehiclesArr = Array.isArray(vehiclesData) ? vehiclesData : [];
      setLogs(logsArr);
      setVehicles(vehiclesArr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayLogs = logsArr.filter(l => new Date(l.entryTime) >= today);
      const inside = logsArr.filter(l => !l.exitTime);
      const completed = logsArr.filter(l => l.exitTime);
      const overstay = inside.filter(l => (Date.now() - new Date(l.entryTime)) / 3600000 > 12);
      const revenue = todayLogs.filter(l => l.exitTime).reduce((s, l) => s + (l.amount || 0), 0);
      setStats({ total: todayLogs.length, inside: inside.length, completed: completed.length, overstay: overstay.length, revenue });
      const recent = logsArr.slice(0, 8);
      if (recent.length > 0) {
        setTickerText(recent.map(l => {
          const plate = l.vehicleId?.plateNumber || "Unknown";
          const name = l.userId?.name || "Unknown";
          return l.exitTime ? `🚙 ${plate} — ${name} exited` : `🚗 ${plate} — ${name} entered`;
        }).join("  ·  "));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    clockRef.current = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(clockRef.current);
  }, []);

  useEffect(() => {
    let data = [...logs];
    const q = search.toLowerCase();
    if (q) data = data.filter(l =>
      l.vehicleId?.plateNumber?.toLowerCase().includes(q) ||
      l.userId?.name?.toLowerCase().includes(q)
    );
    if (statusFilter) data = data.filter(l => getStatus(l) === statusFilter);
    if (dateFilter) data = data.filter(l => new Date(l.entryTime).toISOString().slice(0, 10) === dateFilter);
    if (activeTab === "inside") data = data.filter(l => !l.exitTime);
    else if (activeTab === "completed") data = data.filter(l => !!l.exitTime);
    else if (activeTab === "overstay") data = data.filter(l => !l.exitTime && (Date.now() - new Date(l.entryTime)) / 3600000 > 12);
    setFiltered(data);
    setCurrentPage(1);
  }, [search, statusFilter, dateFilter, activeTab, logs]);

  const getStatus = (log) => {
    if (log.exitTime) return "Completed";
    if ((Date.now() - new Date(log.entryTime)) / 3600000 > 12) return "Overstay";
    return "Inside";
  };

  const getDuration = (log) => {
    const end = log.exitTime ? new Date(log.exitTime) : new Date();
    const mins = Math.floor((end - new Date(log.entryTime)) / 60000);
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const initials = (name) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";

  // ✅ FIXED: dash aur space dono ignore karke compare karo
  useEffect(() => {
    if (!entryPlate) { setEntryVehicleInfo(null); return; }
    const normalized = entryPlate.toUpperCase().replace(/[-\s]/g, '');
    const v = vehicles.find(v =>
      v.plateNumber?.toUpperCase().replace(/[-\s]/g, '') === normalized
    );
    setEntryVehicleInfo(v || null);
  }, [entryPlate, vehicles]);

  useEffect(() => {
    if (!exitPlate) { setExitPreview(null); return; }
    const log = logs.find(l => l.vehicleId?.plateNumber === exitPlate && !l.exitTime);
    if (!log) { setExitPreview(null); return; }
    const hrs = Math.max((Date.now() - new Date(log.entryTime)) / 3600000, 0.5);
    const fee = Math.round(hrs * 50);
    setExitPreview({ log, fee, duration: getDuration(log) });
  }, [exitPlate, logs]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      showToast("❌ Camera access denied!", true);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    canvas.toBlob(blob => {
      setCapturedImage(blob);
      stopCamera();
      detectPlate(blob);
    }, "image/jpeg");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCapturedImage(file);
    detectPlate(file);
  };

  const detectPlate = async (imageBlob) => {
    setDetecting(true);
    setDetectionResult(null);
    try {
      const formData = new FormData();
      formData.append("image", imageBlob, "plate.jpg");
      const res = await fetch(`${FLASK_URL}/detect`, {
        method: "POST",
        headers: { "ngrok-skip-browser-warning": "true" },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.plate) {
        setDetectionResult({ success: true, plate: data.plate, confidence: data.confidence });
        setEntryPlate(data.plate);
        showToast(`✅ Plate detected: ${data.plate} (${data.confidence}% confidence)`);
      } else {
        setDetectionResult({ success: false });
        showToast("⚠️ Plate not detected. Enter manually.", true);
      }
    } catch {
      setDetectionResult({ success: false });
      showToast("❌ Detection failed. Flask service not running!", true);
    } finally {
      setDetecting(false);
    }
  };

  const closeEntryModal = () => {
    stopCamera();
    setShowEntryModal(false);
    setEntryPlate("");
    setEntryMode("manual");
    setCapturedImage(null);
    setDetectionResult(null);
  };

  useEffect(() => {
    if (entryMode === "camera" && showEntryModal) {
      setTimeout(() => startCamera(), 300);
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryMode, showEntryModal]);

  const handleEntry = async () => {
    if (!entryPlate) { showToast("Please enter a plate number", true); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/parking/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateNumber: entryPlate.toUpperCase().replace(/-/g, ' ').trim(), qrCode: entryVehicleInfo?.qrCode || "MANUAL" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(`✅ ${entryPlate.toUpperCase()} — Entry recorded successfully!`);
      closeEntryModal();
      fetchAll();
    } catch (err) {
      showToast("❌ " + err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExit = async () => {
    if (!exitPlate) { showToast("Please select a vehicle", true); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/parking/exit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plateNumber: exitPlate })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(`✅ ${exitPlate} — Exit recorded. Rs.${data.payment?.amount || exitPreview?.fee} deducted!`);
      setShowExitModal(false);
      setExitPlate("");
      fetchAll();
    } catch (err) {
      showToast("❌ " + err.message, true);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const cardStyle = { background: "white", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.04)", overflow: "hidden" };
  const plateStyle = { background: "#fffbeb", border: "1.5px solid #fcd34d", color: "#92400e", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: ".78rem", padding: ".22rem .6rem", borderRadius: "6px", letterSpacing: "1.5px", display: "inline-block" };

  const statusBadge = (status) => {
    const cfg = { Completed: ["#d1fae5", "#065f46"], Inside: ["#dbeafe", "#1e40af"], Overstay: ["#fee2e2", "#991b1b"] };
    const [bg, color] = cfg[status] || ["#f1f5f9", "#64748b"];
    return <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".28rem .7rem", borderRadius: "20px", fontSize: ".74rem", fontWeight: 700, background: bg, color }}>{status}</span>;
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: "16px" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "48px", height: "48px", border: "4px solid #ccfbf1", borderTop: "4px solid #0d9488", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ color: "#0d9488", fontWeight: 600 }}>Loading Entry/Exit Logs...</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes livePulse { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,.6); } 50% { box-shadow: 0 0 0 8px rgba(16,185,129,0); } }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
      `}</style>

      <div style={{ background: "#0d9488", height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>Entry / Exit Logs</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: ".8rem", color: "#64748b", marginBottom: ".4rem" }}>Dashboard <span style={{ color: "#0d9488", fontWeight: 600 }}>› Entry / Exit Logs</span></div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>Entry / Exit Logs</h1>
          <p style={{ color: "#64748b", fontSize: ".9rem", marginTop: ".25rem" }}>Track all vehicle movements, durations and parking fees</p>
        </div>
        <div style={{ display: "flex", gap: ".75rem" }}>
          <button onClick={() => setShowEntryModal(true)} style={{ background: "#0d9488", color: "white", border: "none", padding: ".7rem 1.4rem", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 12px rgba(13,148,136,.25)" }}>🚗 Record Entry</button>
          <button onClick={() => setShowExitModal(true)} style={{ background: "#ef4444", color: "white", border: "none", padding: ".7rem 1.4rem", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 12px rgba(239,68,68,.25)" }}>🚪 Record Exit</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { icon: "📋", val: stats.total, label: "Total Logs Today", bg: "#ccfbf1" },
          { icon: "🟢", val: stats.inside, label: "Currently Inside", bg: "#d1fae5" },
          { icon: "✅", val: stats.completed, label: "Completed Sessions", bg: "#dbeafe" },
          { icon: "⏰", val: stats.overstay, label: "Overstayed", bg: "#fef3c7" },
          { icon: "💰", val: `Rs.${stats.revenue.toLocaleString()}`, label: "Revenue Today", bg: "#ede9fe" },
        ].map((s, i) => (
          <div key={i} style={{ ...cardStyle, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: ".9rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.4rem", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: ".2rem" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)", borderRadius: "12px", padding: ".85rem 1.4rem", display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", overflow: "hidden" }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", animation: "livePulse 1.4s infinite", flexShrink: 0 }} />
        <span style={{ color: "#10b981", fontWeight: 700, fontSize: ".82rem", letterSpacing: ".5px", textTransform: "uppercase", flexShrink: 0 }}>Live</span>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <span style={{ color: "rgba(255,255,255,.8)", fontSize: ".85rem", whiteSpace: "nowrap", animation: "ticker 22s linear infinite", display: "inline-block" }}>{tickerText}</span>
        </div>
        <span style={{ color: "rgba(255,255,255,.5)", fontSize: ".78rem", flexShrink: 0 }}>{clock}</span>
      </div>

      <div style={{ display: "flex", gap: ".35rem", background: "#f1f5f9", borderRadius: "10px", padding: ".3rem", marginBottom: "1.25rem", width: "fit-content" }}>
        {[["all", "All Logs"], ["inside", "Currently Inside"], ["completed", "Completed"], ["overstay", "Overstay"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={{ padding: ".5rem 1.2rem", borderRadius: "8px", border: "none", fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: ".85rem", cursor: "pointer", background: activeTab === key ? "white" : "transparent", color: activeTab === key ? "#0d9488" : "#64748b", boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,.1)" : "none", transition: "all .2s" }}>{label}</button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: ".85rem", marginBottom: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,.05)", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <span style={{ position: "absolute", left: ".9rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate or owner…" style={{ width: "100%", padding: ".62rem 1rem .62rem 2.4rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans, sans-serif", fontSize: ".9rem", outline: "none", background: "#fafafa", boxSizing: "border-box" }} />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: ".6rem .85rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans, sans-serif", fontSize: ".85rem", outline: "none", background: "#fafafa", cursor: "pointer" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: ".62rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans, sans-serif", fontSize: ".85rem", outline: "none", background: "#fafafa", cursor: "pointer" }}>
          <option value="">All Status</option>
          <option>Completed</option>
          <option>Inside</option>
          <option>Overstay</option>
        </select>
        <button onClick={fetchAll} style={{ background: "#0d9488", color: "white", border: "none", padding: ".62rem 1rem", borderRadius: "9px", fontWeight: 600, cursor: "pointer", fontSize: ".85rem" }}>🔄 Refresh</button>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
            Session Logs
            <span style={{ background: "#ccfbf1", color: "#0f766e", fontSize: ".75rem", fontWeight: 700, padding: ".15rem .55rem", borderRadius: "20px" }}>{filtered.length} logs</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#94a3b8" }}>
            <div style={{ fontSize: "3rem" }}>📋</div>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, marginTop: ".6rem", color: "#0f172a" }}>No logs found</h3>
            <p style={{ fontSize: ".85rem", marginTop: ".3rem" }}>{logs.length === 0 ? "Abhi tak koi vehicle entry/exit nahi hui. 'Record Entry' se shuru karein." : "Filters change karein."}</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Log ID", "Number Plate", "Owner", "Entry Time", "Exit Time", "Duration", "Fee", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: ".75rem 1.1rem", textAlign: "left", fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((log, i) => {
                  const color = avatarColors[i % avatarColors.length];
                  const plate = log.vehicleId?.plateNumber || "Unknown";
                  const name = log.userId?.name || "Unknown";
                  const status = getStatus(log);
                  const entryT = new Date(log.entryTime);
                  const exitT = log.exitTime ? new Date(log.exitTime) : null;
                  const logNum = `LOG-${log._id?.slice(-6).toUpperCase()}`;
                  return (
                    <tr key={log._id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafcff"}
                      onMouseLeave={e => e.currentTarget.style.background = "white"}>
                      <td style={{ padding: ".85rem 1.1rem" }}><span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, color: "#64748b", fontSize: ".78rem" }}>{logNum}</span></td>
                      <td style={{ padding: ".85rem 1.1rem" }}><span style={plateStyle}>{plate}</span></td>
                      <td style={{ padding: ".85rem 1.1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: ".78rem", flexShrink: 0 }}>{initials(name)}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: ".86rem" }}>{name}</div>
                            <div style={{ fontSize: ".73rem", color: "#64748b" }}>Vehicle Owner</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: ".85rem 1.1rem" }}>
                        <div style={{ fontWeight: 700, fontSize: ".86rem" }}>
                          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", marginRight: "4px" }} />
                          {entryT.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{ fontSize: ".73rem", color: "#64748b" }}>{entryT.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </td>
                      <td style={{ padding: ".85rem 1.1rem" }}>
                        {exitT ? (
                          <>
                            <div style={{ fontWeight: 700, fontSize: ".86rem" }}>
                              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", marginRight: "4px" }} />
                              {exitT.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div style={{ fontSize: ".73rem", color: "#64748b" }}>{exitT.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</div>
                          </>
                        ) : (
                          <span style={{ fontSize: ".8rem", color: "#f59e0b", fontWeight: 600 }}>
                            <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", marginRight: "4px", animation: "blink 1s infinite" }} />
                            Still Inside
                          </span>
                        )}
                      </td>
                      <td style={{ padding: ".85rem 1.1rem" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", background: "#f1f5f9", fontSize: ".8rem", fontWeight: 600, padding: ".25rem .65rem", borderRadius: "20px" }}>⏱ {getDuration(log)}</span>
                      </td>
                      <td style={{ padding: ".85rem 1.1rem" }}>
                        {log.exitTime ? <span style={{ fontWeight: 700, fontSize: ".9rem", color: "#0f766e" }}>Rs.{log.amount || 0}</span> : <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: ".8rem" }}>Pending…</span>}
                      </td>
                      <td style={{ padding: ".85rem 1.1rem" }}>{statusBadge(status)}</td>
                      <td style={{ padding: ".85rem 1.1rem", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: ".35rem", justifyContent: "center" }}>
                          <button onClick={() => setDetailLog(log)} title="View Details" style={{ width: "30px", height: "30px", borderRadius: "7px", border: "none", background: "#eff6ff", color: "#3b82f6", cursor: "pointer", fontSize: ".82rem" }}>👁</button>
                          {!log.exitTime && (
                            <button onClick={() => { setExitPlate(plate); setShowExitModal(true); }} title="Record Exit" style={{ width: "30px", height: "30px", borderRadius: "7px", border: "none", background: "#d1fae5", color: "#065f46", cursor: "pointer", fontSize: ".82rem" }}>🚪</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.4rem", borderTop: "1px solid #e2e8f0", fontSize: ".82rem", color: "#64748b" }}>
            <span>Showing {((currentPage - 1) * PER_PAGE) + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}</span>
            <div style={{ display: "flex", gap: ".3rem" }}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ width: "30px", height: "30px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600 }}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} style={{ width: "30px", height: "30px", borderRadius: "7px", border: `1.5px solid ${currentPage === i + 1 ? "#0d9488" : "#e2e8f0"}`, background: currentPage === i + 1 ? "#0d9488" : "white", color: currentPage === i + 1 ? "white" : "#0f172a", cursor: "pointer", fontWeight: 600 }}>{i + 1}</button>
              ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ width: "30px", height: "30px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600 }}>›</button>
            </div>
          </div>
        )}
      </div>

      {showEntryModal && (
        <div onClick={e => e.target === e.currentTarget && closeEntryModal()} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "480px", boxShadow: "0 25px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "1.3rem 1.6rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>🚗 Record Vehicle Entry</h2>
              <button onClick={closeEntryModal} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "1rem 1.6rem .5rem" }}>
              <div style={{ display: "flex", gap: ".5rem", background: "#f1f5f9", borderRadius: "10px", padding: ".3rem" }}>
                {[["manual", "✏️ Manual"], ["camera", "📷 Camera"], ["upload", "🖼️ Upload"]].map(([mode, label]) => (
                  <button key={mode} onClick={() => { setEntryMode(mode); setCapturedImage(null); setDetectionResult(null); setEntryPlate(""); }}
                    style={{ flex: 1, padding: ".5rem", borderRadius: "8px", border: "none", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", background: entryMode === mode ? "white" : "transparent", color: entryMode === mode ? "#0d9488" : "#64748b", boxShadow: entryMode === mode ? "0 1px 4px rgba(0,0,0,.1)" : "none" }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: "1rem 1.6rem" }}>
              {entryMode === "manual" && (
                <>
                  <label style={{ display: "block", fontSize: ".8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: ".4rem" }}>Number Plate *</label>
                  <input value={entryPlate} onChange={e => setEntryPlate(e.target.value.toUpperCase())} placeholder="e.g. ABC-1234" autoFocus
                    style={{ width: "100%", padding: ".7rem 1rem", border: "1.5px solid #fcd34d", borderRadius: "9px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "2px", outline: "none", boxSizing: "border-box", background: "#fffbeb", color: "#92400e" }} />
                </>
              )}
              {entryMode === "camera" && (
                <div>
                  {!capturedImage ? (
                    <>
                      <div style={{ borderRadius: "12px", overflow: "hidden", background: "#000", position: "relative", marginBottom: ".75rem" }}>
                        <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxHeight: "260px", objectFit: "cover", display: "block" }} />
                        {!cameraStream && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: ".9rem" }}>📷 Camera starting...</div>}
                      </div>
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                      <button onClick={capturePhoto} disabled={!cameraStream} style={{ width: "100%", padding: ".75rem", background: cameraStream ? "#0d9488" : "#94a3b8", color: "white", border: "none", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: ".95rem", cursor: cameraStream ? "pointer" : "not-allowed" }}>📸 Capture & Detect Plate</button>
                    </>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      {detecting && <div style={{ padding: "1rem", color: "#0d9488", fontWeight: 600 }}><div style={{ width: "32px", height: "32px", border: "3px solid #ccfbf1", borderTop: "3px solid #0d9488", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto .5rem" }} />Detecting plate...</div>}
                      {detectionResult && (
                        <div style={{ background: detectionResult.success ? "#f0fdf4" : "#fef2f2", borderRadius: "10px", padding: ".85rem", border: `1px solid ${detectionResult.success ? "#bbf7d0" : "#fecaca"}`, marginBottom: ".75rem" }}>
                          {detectionResult.success ? (<><div style={{ fontWeight: 700, color: "#065f46" }}>✅ Plate Detected!</div><div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#92400e", letterSpacing: "2px", margin: ".3rem 0" }}>{detectionResult.plate}</div><div style={{ fontSize: ".78rem", color: "#047857" }}>Confidence: {detectionResult.confidence}%</div></>) : <div style={{ fontWeight: 700, color: "#991b1b" }}>⚠️ Plate not detected. Enter manually below.</div>}
                        </div>
                      )}
                      <button onClick={() => { setCapturedImage(null); setDetectionResult(null); startCamera(); }} style={{ padding: ".5rem 1rem", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: ".85rem" }}>🔄 Retake</button>
                    </div>
                  )}
                </div>
              )}
              {entryMode === "upload" && (
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                  {!capturedImage ? (
                    <div onClick={() => fileInputRef.current?.click()} style={{ border: "2px dashed #cbd5e1", borderRadius: "12px", padding: "2rem", textAlign: "center", cursor: "pointer", background: "#fafafa" }}>
                      <div style={{ fontSize: "2.5rem" }}>🖼️</div>
                      <div style={{ fontWeight: 600, color: "#0d9488", marginTop: ".5rem" }}>Click to upload plate image</div>
                      <div style={{ fontSize: ".8rem", color: "#94a3b8", marginTop: ".25rem" }}>JPG, PNG supported</div>
                    </div>
                  ) : (
                    <div>
                      {detecting && <div style={{ padding: "1rem", textAlign: "center", color: "#0d9488", fontWeight: 600 }}><div style={{ width: "32px", height: "32px", border: "3px solid #ccfbf1", borderTop: "3px solid #0d9488", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto .5rem" }} />Detecting plate...</div>}
                      {detectionResult && (
                        <div style={{ background: detectionResult.success ? "#f0fdf4" : "#fef2f2", borderRadius: "10px", padding: ".85rem", border: `1px solid ${detectionResult.success ? "#bbf7d0" : "#fecaca"}`, marginBottom: ".75rem" }}>
                          {detectionResult.success ? (<><div style={{ fontWeight: 700, color: "#065f46" }}>✅ Plate Detected!</div><div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.3rem", color: "#92400e", letterSpacing: "2px", margin: ".3rem 0" }}>{detectionResult.plate}</div><div style={{ fontSize: ".78rem", color: "#047857" }}>Confidence: {detectionResult.confidence}%</div></>) : <div style={{ fontWeight: 700, color: "#991b1b" }}>⚠️ Plate not detected. Enter manually below.</div>}
                        </div>
                      )}
                      <button onClick={() => { setCapturedImage(null); setDetectionResult(null); fileInputRef.current.value = ""; }} style={{ padding: ".5rem 1rem", background: "#f1f5f9", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: ".85rem" }}>🔄 Upload Again</button>
                    </div>
                  )}
                </div>
              )}
              {entryMode !== "manual" && (
                <div style={{ marginTop: ".75rem" }}>
                  <label style={{ display: "block", fontSize: ".8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: ".4rem" }}>{detectionResult?.success ? "Detected Plate (editable)" : "Enter Plate Manually"}</label>
                  <input value={entryPlate} onChange={e => setEntryPlate(e.target.value.toUpperCase())} placeholder="e.g. ABC-1234"
                    style={{ width: "100%", padding: ".7rem 1rem", border: "1.5px solid #fcd34d", borderRadius: "9px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1.1rem", letterSpacing: "2px", outline: "none", boxSizing: "border-box", background: "#fffbeb", color: "#92400e" }} />
                </div>
              )}
              {entryPlate.length >= 3 && (
                <div style={{ marginTop: ".75rem", background: entryVehicleInfo ? "#f0fdf4" : "#fef2f2", borderRadius: "10px", padding: ".85rem 1rem", border: `1px solid ${entryVehicleInfo ? "#bbf7d0" : "#fecaca"}` }}>
                  {entryVehicleInfo ? (
                    <><div style={{ fontWeight: 700, color: "#065f46", fontSize: ".8rem" }}>✅ Vehicle Found in System</div><div style={{ fontSize: ".82rem", color: "#047857", marginTop: ".25rem" }}>{entryVehicleInfo.userId?.name || "Unknown"} · {entryVehicleInfo.plateNumber}</div></>
                  ) : (
                    <div style={{ fontWeight: 700, color: "#991b1b", fontSize: ".8rem" }}>⚠️ This plate is not registered in the system!</div>
                  )}
                </div>
              )}
            </div>
            <div style={{ padding: ".75rem 1.6rem 1.4rem", display: "flex", gap: ".75rem" }}>
              <button onClick={closeEntryModal} style={{ flex: 1, background: "#f1f5f9", border: "none", padding: ".75rem", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleEntry} disabled={actionLoading || !entryPlate} style={{ flex: 2, background: actionLoading || !entryPlate ? "#94a3b8" : "#0d9488", color: "white", border: "none", padding: ".75rem", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, cursor: actionLoading || !entryPlate ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(13,148,136,.25)" }}>
                {actionLoading ? "⏳ Recording..." : "✅ Record Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExitModal && (
        <div onClick={e => e.target === e.currentTarget && (setShowExitModal(false), setExitPlate(""))} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "420px", boxShadow: "0 25px 60px rgba(0,0,0,.2)" }}>
            <div style={{ padding: "1.3rem 1.6rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>🚪 Record Vehicle Exit</h2>
              <button onClick={() => { setShowExitModal(false); setExitPlate(""); }} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "1.4rem 1.6rem" }}>
              <label style={{ display: "block", fontSize: ".8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: ".4rem" }}>Select Vehicle Inside</label>
              <select value={exitPlate} onChange={e => setExitPlate(e.target.value)} style={{ width: "100%", padding: ".7rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans, sans-serif", fontSize: ".92rem", outline: "none", background: "white", cursor: "pointer" }}>
                <option value="">-- Select vehicle inside --</option>
                {logs.filter(l => !l.exitTime).map(l => (
                  <option key={l._id} value={l.vehicleId?.plateNumber}>{l.vehicleId?.plateNumber} — {l.userId?.name} ({getDuration(l)})</option>
                ))}
              </select>
              {exitPreview && (
                <div style={{ marginTop: ".75rem", background: "#fef2f2", borderRadius: "10px", padding: ".85rem 1rem", border: "1px solid #fecaca" }}>
                  <div style={{ fontSize: ".82rem", color: "#991b1b", lineHeight: 1.7 }}>
                    <strong>{exitPreview.log.userId?.name}</strong><br />
                    Duration: {exitPreview.duration} &nbsp;|&nbsp; Fee: <strong>Rs.{exitPreview.fee}</strong>
                  </div>
                </div>
              )}
            </div>
            <div style={{ padding: ".75rem 1.6rem 1.4rem", display: "flex", gap: ".75rem" }}>
              <button onClick={() => { setShowExitModal(false); setExitPlate(""); }} style={{ flex: 1, background: "#f1f5f9", border: "none", padding: ".75rem", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleExit} disabled={actionLoading} style={{ flex: 2, background: actionLoading ? "#94a3b8" : "#ef4444", color: "white", border: "none", padding: ".75rem", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 12px rgba(239,68,68,.25)" }}>
                {actionLoading ? "⏳ Processing..." : "🚪 Record Exit & Deduct Fee"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailLog && (
        <div onClick={e => e.target === e.currentTarget && setDetailLog(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "1.3rem 1.6rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
              <h2 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>Session Details</h2>
              <button onClick={() => setDetailLog(null)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "1.4rem 1.6rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".8rem", marginBottom: "1.2rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>{initials(detailLog.userId?.name || "?")}</div>
                <div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: "1rem" }}>{detailLog.userId?.name || "Unknown"}</div>
                  <div style={{ fontSize: ".78rem", color: "#64748b" }}>Vehicle Owner</div>
                </div>
                <span style={{ ...plateStyle, marginLeft: "auto" }}>{detailLog.vehicleId?.plateNumber || "Unknown"}</span>
              </div>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: ".65rem" }}>Session Info</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: "1.25rem" }}>
                {[["Status", statusBadge(getStatus(detailLog))], ["Duration", `⏱ ${getDuration(detailLog)}`], ["Rate", "Rs.50/hr"], ["Log ID", detailLog._id?.slice(-8).toUpperCase()]].map(([lbl, val], i) => (
                  <div key={i} style={{ background: "#f8fafc", borderRadius: "10px", padding: ".75rem 1rem" }}>
                    <div style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".3px" }}>{lbl}</div>
                    <div style={{ fontWeight: 700, fontSize: ".92rem", marginTop: ".2rem" }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: ".65rem" }}>Timeline</div>
              <div style={{ position: "relative", paddingLeft: "1.5rem", borderLeft: "2px solid #e2e8f0", marginBottom: "1rem" }}>
                {[
                  { dot: "#10b981", title: "Vehicle Entered", time: new Date(detailLog.entryTime) },
                  { dot: detailLog.exitTime ? "#ef4444" : "#f59e0b", title: detailLog.exitTime ? "Vehicle Exited" : "Still Inside (Exit Pending)", time: detailLog.exitTime ? new Date(detailLog.exitTime) : null }
                ].map((item, i) => (
                  <div key={i} style={{ position: "relative", paddingBottom: i === 0 ? "1rem" : 0 }}>
                    <div style={{ position: "absolute", left: "-1.6rem", top: ".2rem", width: "14px", height: "14px", borderRadius: "50%", background: item.dot, border: "2px solid white", boxShadow: `0 0 0 3px ${item.dot}33` }} />
                    <div style={{ fontWeight: 700, fontSize: ".88rem" }}>{item.title}</div>
                    <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: "2px" }}>{item.time ? `${item.time.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} · ${item.time.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}` : "Not exited yet"}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "linear-gradient(135deg, #0d9488, #0f766e)", borderRadius: "12px", padding: "1.1rem 1.3rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".8rem", fontWeight: 600 }}>Total Fee</div>
                  <div style={{ color: "rgba(255,255,255,.6)", fontSize: ".75rem", marginTop: "2px" }}>Rs.50/hr · {getDuration(detailLog)}</div>
                </div>
                <div style={{ color: "white", fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: "1.4rem" }}>{detailLog.exitTime ? `Rs.${detailLog.amount || 0}` : "Pending"}</div>
              </div>
              {!detailLog.exitTime && (
                <button onClick={() => { setDetailLog(null); setExitPlate(detailLog.vehicleId?.plateNumber); setShowExitModal(true); }} style={{ width: "100%", marginTop: ".75rem", background: "#ef4444", color: "white", border: "none", padding: ".75rem", borderRadius: "10px", fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer" }}>🚪 Record Exit Now</button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: toast.error ? "#ef4444" : "#0d9488", color: "white", padding: ".85rem 1.4rem", borderRadius: "12px", fontWeight: 600, fontSize: ".88rem", boxShadow: "0 8px 24px rgba(0,0,0,.2)", zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}