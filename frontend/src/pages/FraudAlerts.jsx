import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// const API = "https://fyp-dun-two.vercel.app/api";
const API = "http://localhost:3000/api";

const severityIcons = { critical: "🚨", high: "⚠️", medium: "🔍", low: "ℹ️" };
const typeIcons = { "QR Mismatch": "🔄", "Unknown Plate": "🚫", "Repeated Attempt": "🔁", "Overstay": "⏰", "Blacklisted Vehicle": "⛔", "Cloned QR": "📵", "Manual Flag": "🚩", "balance": "💸", "manual": "🚩" };

export default function FraudAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stats, setStats] = useState({ critical: 0, high: 0, medium: 0, resolved: 0, total: 0 });
  const [detailAlert, setDetailAlert] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
  const [actionLoading, setActionLoading] = useState(null);
  const [manualForm, setManualForm] = useState({ plate: "", type: "", severity: "high", desc: "" });
  const [addLoading, setAddLoading] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API}/fraud/all`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setAlerts(arr);

      const active = arr.filter(a => !a.resolved);
      setStats({
        critical: active.filter(a => a.severity === "critical").length,
        high: active.filter(a => a.severity === "high").length,
        medium: active.filter(a => a.severity === "medium").length,
        resolved: arr.filter(a => a.resolved).length,
        total: arr.length
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let data = [...alerts];
    const q = search.toLowerCase();
    if (q) data = data.filter(a =>
      a.plateNumber?.toLowerCase().includes(q) ||
      a.alertType?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
    if (typeFilter) data = data.filter(a => a.alertType === typeFilter);
    if (activeTab === "resolved") data = data.filter(a => a.resolved);
    else if (activeTab === "all") data = data.filter(a => !a.resolved);
    else data = data.filter(a => !a.resolved && a.severity === activeTab);
    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFiltered(data);
  }, [alerts, search, typeFilter, activeTab]);

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso);
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  };

  const formatDT = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })} · ${d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}`;
  };

  const handleResolve = async (id) => {
    setActionLoading(id);
    try {
      const res = await fetch(`${API}/fraud/${id}/resolve`, { method: "PUT" });
      if (!res.ok) throw new Error("Failed");
      showToast("✅ Alert marked as resolved");
      fetchAlerts();
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (id) => {
    setActionLoading(id + "_d");
    try {
      const res = await fetch(`${API}/fraud/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      showToast("🗑️ Alert dismissed");
      fetchAlerts();
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllResolved = async () => {
    try {
      await fetch(`${API}/fraud/resolve-all`, { method: "PUT" });
      showToast("✅ All alerts marked as resolved");
      fetchAlerts();
    } catch (err) {
      showToast("❌ " + err.message, "error");
    }
  };

  const handleAddManual = async () => {
    if (!manualForm.plate) { showToast("⚠️ Please enter a plate number", "error"); return; }
    if (!manualForm.type) { showToast("⚠️ Please select an alert type", "error"); return; }
    setAddLoading(true);
    try {
      const res = await fetch(`${API}/fraud/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber: manualForm.plate.toUpperCase(),
          alertType: manualForm.type,
          severity: manualForm.severity,
          description: manualForm.desc || `${manualForm.type} — ${manualForm.plate.toUpperCase()}`
        })
      });
      if (!res.ok) throw new Error("Failed to add alert");
      showToast(`🚨 Alert added for ${manualForm.plate.toUpperCase()}`);
      setManualForm({ plate: "", type: "", severity: "high", desc: "" });
      fetchAlerts();
    } catch (err) {
      showToast("❌ " + err.message, "error");
    } finally {
      setAddLoading(false);
    }
  };

  const getSevColor = (sev) => ({
    critical: ["#fee2e2", "#991b1b", "#dc2626"],
    high: ["#fef3c7", "#92400e", "#f59e0b"],
    medium: ["#ede9fe", "#6d28d9", "#8b5cf6"],
    low: ["#dbeafe", "#1e40af", "#3b82f6"],
    resolved: ["#d1fae5", "#065f46", "#10b981"]
  }[sev] || ["#f1f5f9", "#64748b", "#94a3b8"]);

  const plateStyle = { background: "#fffbeb", border: "1.5px solid #fcd34d", color: "#92400e", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".74rem", padding: ".2rem .55rem", borderRadius: "6px", letterSpacing: "1px", display: "inline-block" };
  const card = { background: "white", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04)" };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: "16px" }}>
      <div style={{ width: "48px", height: "48px", border: "4px solid #fee2e2", borderTop: "4px solid #ef4444", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={{ color: "#ef4444", fontWeight: 600 }}>Loading Fraud Alerts...</p>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#0f172a" }}>

      {/* TOPBAR */}
      <div style={{ background: "#0d9488", height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white", display: "flex", alignItems: "center", gap: ".75rem" }}>
          {stats.critical > 0 && <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "critPulse 1.2s infinite" }}></span>}
          <style>{`@keyframes critPulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.6)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}`}</style>
          Fraud Alerts
          {stats.critical > 0 && <span style={{ background: "#ef4444", color: "white", fontSize: ".7rem", fontWeight: 800, padding: ".15rem .45rem", borderRadius: "10px" }}>{stats.critical} CRITICAL</span>}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
          <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Logout</button>
        </div>
      </div>

      {/* PAGE HEADER */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: ".8rem", color: "#64748b", marginBottom: ".4rem" }}>Dashboard <span style={{ color: "#0d9488", fontWeight: 600 }}>› Fraud Alerts</span></div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>Fraud Alerts</h1>
          <p style={{ color: "#64748b", fontSize: ".9rem", marginTop: ".25rem" }}>Monitor suspicious activity, QR mismatches and unauthorized entry attempts</p>
        </div>
        <div style={{ display: "flex", gap: ".75rem" }}>
          <button onClick={handleMarkAllResolved}
            style={{ background: "white", color: "#64748b", border: "1.5px solid #e2e8f0", padding: ".65rem 1.2rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: ".5rem" }}>
            ✅ Mark All Resolved
          </button>
          <button onClick={fetchAlerts}
            style={{ background: "#0d9488", color: "white", border: "none", padding: ".65rem 1.2rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer" }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
        {[
          { icon: "🚨", val: stats.critical, label: "Critical Alerts", bg: "#fee2e2" },
          { icon: "⚠️", val: stats.high, label: "High Priority", bg: "#fef3c7" },
          { icon: "🔍", val: stats.medium, label: "Medium Priority", bg: "#ede9fe" },
          { icon: "✅", val: stats.resolved, label: "Resolved", bg: "#d1fae5" },
          { icon: "📋", val: stats.total, label: "Total All Time", bg: "#ccfbf1" },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: "1.1rem 1.25rem", display: "flex", alignItems: "center", gap: ".9rem" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: ".2rem" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CRITICAL BANNER */}
      {stats.critical > 0 && (
        <div style={{ background: "linear-gradient(135deg,#7f1d1d,#991b1b)", borderRadius: "14px", padding: "1.1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "1.6rem", animation: "shake .5s infinite alternate" }}>🚨</span>
          <style>{`@keyframes shake{0%{transform:rotate(-5deg)}100%{transform:rotate(5deg)}}`}</style>
          <div style={{ flex: 1 }}>
            <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".95rem" }}>
              {stats.critical} Critical Alert{stats.critical > 1 ? "s" : ""} Require Immediate Attention
            </div>
            <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".8rem", marginTop: "3px" }}>
              Review and resolve the critical alerts listed below.
            </div>
          </div>
          <button onClick={() => setActiveTab("critical")}
            style={{ background: "rgba(255,255,255,.15)", color: "white", border: "1px solid rgba(255,255,255,.3)", padding: ".45rem 1rem", borderRadius: "8px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
            View Critical →
          </button>
        </div>
      )}

      {/* MANUAL ADD FORM */}
      <div style={{ ...card, padding: "1.25rem 1.4rem", marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
          🚨 Manually Add Fraud Alert
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: ".75rem", alignItems: "end" }}>
          {[
            {
              label: "Number Plate", el: <input value={manualForm.plate} onChange={e => setManualForm({ ...manualForm, plate: e.target.value.toUpperCase() })} placeholder="e.g. ABC-1234"
                style={{ width: "100%", padding: ".62rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa", boxSizing: "border-box" }} />
            },
            {
              label: "Alert Type", el: <select value={manualForm.type} onChange={e => setManualForm({ ...manualForm, type: e.target.value })}
                style={{ width: "100%", padding: ".62rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa" }}>
                <option value="">-- Select Type --</option>
                {["QR Mismatch", "Unknown Plate", "Repeated Attempt", "Overstay", "Blacklisted Vehicle", "Cloned QR", "Manual Flag"].map(t => <option key={t}>{t}</option>)}
              </select>
            },
            {
              label: "Severity", el: <select value={manualForm.severity} onChange={e => setManualForm({ ...manualForm, severity: e.target.value })}
                style={{ width: "100%", padding: ".62rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa" }}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            },
          ].map(({ label, el }, i) => (
            <div key={i}>
              <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: ".3rem" }}>{label}</div>
              {el}
            </div>
          ))}
          <button onClick={handleAddManual} disabled={addLoading}
            style={{ background: addLoading ? "#94a3b8" : "#ef4444", color: "white", border: "none", padding: ".65rem 1.2rem", borderRadius: "9px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem", cursor: addLoading ? "not-allowed" : "pointer", whiteSpace: "nowrap", height: "42px" }}>
            {addLoading ? "⏳" : "🚨 Add Alert"}
          </button>
        </div>
        <div style={{ marginTop: ".75rem" }}>
          <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: ".3rem" }}>Description (Optional)</div>
          <input value={manualForm.desc} onChange={e => setManualForm({ ...manualForm, desc: e.target.value })} placeholder="Brief description of the suspicious activity..."
            style={{ width: "100%", padding: ".62rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: ".35rem", background: "#f1f5f9", borderRadius: "10px", padding: ".3rem", marginBottom: "1.25rem", width: "fit-content" }}>
        {[
          ["all", "All Alerts", alerts.filter(a => !a.resolved).length],
          ["critical", "Critical", stats.critical],
          ["high", "High", stats.high],
          ["medium", "Medium", stats.medium],
          ["resolved", "Resolved", stats.resolved],
        ].map(([key, label, cnt]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            style={{ padding: ".48rem 1.2rem", borderRadius: "8px", border: "none", fontFamily: "DM Sans,sans-serif", fontWeight: 600, fontSize: ".85rem", cursor: "pointer", background: activeTab === key ? "white" : "transparent", color: activeTab === key ? "#0f172a" : "#64748b", boxShadow: activeTab === key ? "0 1px 4px rgba(0,0,0,.1)" : "none", display: "flex", alignItems: "center", gap: ".4rem" }}>
            {label}
            <span style={{ background: activeTab === key ? "#ef4444" : "#e2e8f0", color: activeTab === key ? "white" : "#64748b", fontSize: ".7rem", fontWeight: 800, padding: ".1rem .4rem", borderRadius: "10px" }}>{cnt}</span>
          </button>
        ))}
      </div>

      {/* TOOLBAR */}
      <div style={{ ...card, padding: ".9rem 1.25rem", display: "flex", alignItems: "center", gap: ".85rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
          <span style={{ position: "absolute", left: ".9rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by plate, type, or description…"
            style={{ width: "100%", padding: ".6rem 1rem .6rem 2.4rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa", boxSizing: "border-box" }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: ".6rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".83rem", outline: "none", background: "#fafafa", cursor: "pointer" }}>
          <option value="">All Types</option>
          {["QR Mismatch", "Unknown Plate", "Repeated Attempt", "Overstay", "Blacklisted Vehicle", "Cloned QR", "Manual Flag"].map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* ALERTS LIST */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", background: "white", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
          <div style={{ fontSize: "3.5rem" }}>🛡️</div>
          <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.1rem", marginTop: ".75rem" }}>
            {alerts.length === 0 ? "No Fraud Alerts" : "No Alerts Found"}
          </h3>
          <p style={{ color: "#64748b", fontSize: ".88rem", marginTop: ".35rem" }}>
            {alerts.length === 0
              ? "All clear! Any suspicious activity will appear here automatically. QR mismatches are detected in real time."
              : "No alerts match your current filters. Try adjusting the search or tab."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
          {filtered.map(a => {
            const sev = a.resolved ? "resolved" : (a.severity || "high");
            const [bgC, textC, borderC] = getSevColor(sev);
            const isNew = !a.resolved && (Date.now() - new Date(a.createdAt)) / 3600000 < 1;
            const icon = severityIcons[sev] || "⚠️";
            const tIcon = typeIcons[a.alertType] || "⚠️";

            return (
              <div key={a._id} style={{ ...card, borderLeft: `5px solid ${borderC}`, overflow: "hidden" }}>
                <div style={{ padding: "1.1rem 1.4rem", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: bgC, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.15rem", flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: ".65rem", flexWrap: "wrap", marginBottom: ".35rem" }}>
                      <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem" }}>
                        {a.alertType} — {a.plateNumber || "Unknown"}
                      </span>
                      <span style={{ fontSize: ".68rem", fontWeight: 800, padding: ".2rem .55rem", borderRadius: "10px", textTransform: "uppercase", letterSpacing: ".5px", background: bgC, color: textC }}>{sev}</span>
                      {isNew && <span style={{ background: "#ef4444", color: "white", fontSize: ".65rem", fontWeight: 800, padding: ".15rem .45rem", borderRadius: "8px", animation: "blinkBg 1s infinite" }}>NEW</span>}
                      <style>{`@keyframes blinkBg{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
                    </div>
                    <div style={{ fontSize: ".85rem", color: "#64748b", lineHeight: 1.5, marginBottom: ".6rem" }}>
                      {a.description || `${a.alertType} detected for ${a.plateNumber || "unknown vehicle"}.`}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: ".78rem", color: "#64748b" }}>{tIcon} {a.alertType}</span>
                      {a.plateNumber && <span style={{ fontSize: ".78rem", color: "#64748b" }}>🚗 <span style={plateStyle}>{a.plateNumber}</span></span>}
                      <span style={{ fontSize: ".78rem", color: "#64748b" }}>🕐 {formatDT(a.createdAt)} ({timeAgo(a.createdAt)})</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: ".5rem", flexShrink: 0 }}>
                    <button onClick={() => setDetailAlert(a)}
                      style={{ padding: ".4rem .9rem", borderRadius: "8px", border: "none", background: "#dbeafe", color: "#1e40af", fontFamily: "DM Sans,sans-serif", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                      Details
                    </button>
                    {!a.resolved ? (
                      <>
                        <button onClick={() => handleResolve(a._id)} disabled={actionLoading === a._id}
                          style={{ padding: ".4rem .9rem", borderRadius: "8px", border: "none", background: "#d1fae5", color: "#065f46", fontFamily: "DM Sans,sans-serif", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                          {actionLoading === a._id ? "⏳" : "✅ Resolve"}
                        </button>
                        <button onClick={() => handleDismiss(a._id)} disabled={actionLoading === a._id + "_d"}
                          style={{ padding: ".4rem .9rem", borderRadius: "8px", border: "none", background: "#fee2e2", color: "#991b1b", fontFamily: "DM Sans,sans-serif", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                          🗑️ Dismiss
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleDismiss(a._id)}
                        style={{ padding: ".4rem .9rem", borderRadius: "8px", border: "none", background: "#f1f5f9", color: "#64748b", fontFamily: "DM Sans,sans-serif", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                        🗑️ Remove
                      </button>
                    )}
                  </div>
                </div>
                {a.resolved && (
                  <div style={{ background: "#f0fdf4", borderTop: "1px solid #bbf7d0", padding: ".5rem 1.4rem", fontSize: ".78rem", color: "#065f46", fontWeight: 600 }}>
                    ✅ Resolved — {a.resolvedAt ? new Date(a.resolvedAt).toLocaleString("en-PK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Admin"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailAlert && (
        <div onClick={e => e.target === e.currentTarget && setDetailAlert(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "520px", boxShadow: "0 25px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "1.3rem 1.6rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
              <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>Alert Details</h2>
              <button onClick={() => setDetailAlert(null)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: "1.5rem 1.6rem" }}>
              {(() => {
                const a = detailAlert;
                const sev = a.resolved ? "resolved" : (a.severity || "high");
                const [bgC, textC] = getSevColor(sev);
                const icon = severityIcons[sev] || "⚠️";
                return (
                  <>
                    <div style={{ background: bgC, borderRadius: "10px", padding: ".85rem 1.1rem", marginBottom: "1.2rem", display: "flex", alignItems: "center", gap: ".75rem" }}>
                      <span style={{ fontSize: "1.3rem" }}>{icon}</span>
                      <div>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem", color: textC }}>{a.alertType} — {a.plateNumber}</div>
                        <div style={{ fontSize: ".75rem", color: textC, opacity: .7, marginTop: "2px" }}>{formatDT(a.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem", marginBottom: "1.1rem" }}>
                      {[
                        ["Severity", <span style={{ fontSize: ".68rem", fontWeight: 800, padding: ".2rem .55rem", borderRadius: "10px", background: bgC, color: textC, textTransform: "uppercase" }}>{sev}</span>],
                        ["Number Plate", <span style={plateStyle}>{a.plateNumber || "—"}</span>],
                        ["Alert Type", a.alertType],
                        ["Status", a.resolved ? <span style={{ color: "#10b981" }}>✅ Resolved</span> : <span style={{ color: "#ef4444" }}>🔴 Active</span>],
                        ["Alert ID", a._id?.slice(-8).toUpperCase()],
                        ["Reported", timeAgo(a.createdAt)],
                      ].map(([lbl, val], i) => (
                        <div key={i} style={{ background: "#f8fafc", borderRadius: "10px", padding: ".75rem 1rem" }}>
                          <div style={{ fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px" }}>{lbl}</div>
                          <div style={{ fontWeight: 700, fontSize: ".9rem", marginTop: ".25rem" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: "10px", padding: ".9rem 1rem", fontSize: ".85rem", color: "#64748b", lineHeight: 1.6, marginBottom: "1rem" }}>
                      {a.description || `${a.alertType} detected for ${a.plateNumber || "unknown vehicle"}.`}
                    </div>
                    {!a.resolved && (
                      <div style={{ display: "flex", gap: ".75rem" }}>
                        <button onClick={() => { handleResolve(a._id); setDetailAlert(null); }}
                          style={{ flex: 1, padding: ".75rem", borderRadius: "10px", border: "none", background: "#10b981", color: "white", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem", cursor: "pointer" }}>
                          ✅ Mark Resolved
                        </button>
                        <button onClick={() => { handleDismiss(a._id); setDetailAlert(null); }}
                          style={{ flex: 1, padding: ".75rem", borderRadius: "10px", border: "none", background: "#ef4444", color: "white", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem", cursor: "pointer" }}>
                          🗑️ Dismiss Alert
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.show && (
        <div style={{ position: "fixed", top: "80px", right: "2rem", background: toast.type === "error" ? "#ef4444" : "#10b981", color: "white", padding: ".85rem 1.4rem", borderRadius: "12px", fontWeight: 600, fontSize: ".88rem", boxShadow: "0 8px 24px rgba(0,0,0,.2)", zIndex: 999, display: "flex", alignItems: "center", gap: ".6rem" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
