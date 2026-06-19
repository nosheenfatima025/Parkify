import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// const API = "https://fyp-dun-two.vercel.app/api";
const API = "http://localhost:3000/api";
const COLOR_MAP = {
    car: ["#0d9488", "#ccfbf1"],
    motorcycle: ["#3b82f6", "#dbeafe"],
    suv: ["#8b5cf6", "#ede9fe"],
    truck: ["#f59e0b", "#fef3c7"],
    rickshaw: ["#10b981", "#d1fae5"],
    monthly: ["#ec4899", "#fce7f3"],
};

export default function ParkingRates() {
    const navigate = useNavigate();
    const [rates, setRates] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
    const [editModal, setEditModal] = useState(null); // rate object being edited
    const [addModal, setAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [calcResult, setCalcResult] = useState(null);
    const [calcHours, setCalcHours] = useState("");
    const [calcMins, setCalcMins] = useState("");
    const [calcType, setCalcType] = useState("");

    // Quick edit form
    const [qForm, setQForm] = useState({ type: "", hourly: "", minCharge: "", dailyMax: "", monthly: "", grace: "" });

    // Add new form
    const [aForm, setAForm] = useState({ type: "", label: "", icon: "🚗", hourly: "", minCharge: "", dailyMax: "", monthly: "", grace: "" });

    const showToast = (msg, type = "success") => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
    };

    const fetchData = async () => {
        try {
            const [rRes, hRes] = await Promise.all([
                fetch(`${API}/rates`),
                fetch(`${API}/rates/history/all`)
            ]);
            setRates(await rRes.json());
            setHistory(await hRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleToggle = async (rate, val) => {
        try {
            const res = await fetch(`${API}/rates/${rate.type}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: val })
            });
            if (!res.ok) throw new Error("Failed");
            showToast(`${val ? "✅" : "⛔"} ${rate.label} rate ${val ? "enabled" : "disabled"}`);
            fetchData();
        } catch (err) { showToast("❌ " + err.message, "error"); }
    };

    const handleSaveEdit = async () => {
        if (!editModal) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/rates/${editModal.type}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hourly: Number(editModal.hourly),
                    minCharge: Number(editModal.minCharge),
                    dailyMax: Number(editModal.dailyMax),
                    monthly: Number(editModal.monthly),
                    grace: Number(editModal.grace),
                })
            });
            if (!res.ok) throw new Error("Failed");
            showToast(`✅ ${editModal.label} rate updated successfully`);
            setEditModal(null);
            fetchData();
        } catch (err) { showToast("❌ " + err.message, "error"); }
        finally { setSaving(false); }
    };

    const handleQuickSave = async () => {
        if (!qForm.type || !qForm.hourly) { showToast("⚠️ Please fill required fields", "error"); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API}/rates/${qForm.type}`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hourly: Number(qForm.hourly),
                    minCharge: Number(qForm.minCharge) || 0,
                    dailyMax: Number(qForm.dailyMax) || 0,
                    monthly: Number(qForm.monthly) || 0,
                    grace: Number(qForm.grace) || 0,
                })
            });
            if (!res.ok) throw new Error("Failed");
            showToast(`✅ Rate saved for ${qForm.type}`);
            setQForm({ type: "", hourly: "", minCharge: "", dailyMax: "", monthly: "", grace: "" });
            fetchData();
        } catch (err) { showToast("❌ " + err.message, "error"); }
        finally { setSaving(false); }
    };

    const handleAddNew = async () => {
        if (!aForm.type || !aForm.label || !aForm.hourly) { showToast("⚠️ Fill all required fields", "error"); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API}/rates`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...aForm, hourly: Number(aForm.hourly), minCharge: Number(aForm.minCharge) || 0, dailyMax: Number(aForm.dailyMax) || 0, monthly: Number(aForm.monthly) || 0, grace: Number(aForm.grace) || 0, colorClass: aForm.type })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            showToast(`✅ New rate plan added: ${aForm.label}`);
            setAddModal(false);
            setAForm({ type: "", label: "", icon: "🚗", hourly: "", minCharge: "", dailyMax: "", monthly: "", grace: "" });
            fetchData();
        } catch (err) { showToast("❌ " + err.message, "error"); }
        finally { setSaving(false); }
    };

    const calculate = () => {
        const rateObj = rates.find(r => r.type === calcType);
        if (!rateObj) { showToast("⚠️ Select a vehicle type", "error"); return; }
        const h = parseFloat(calcHours) || 0;
        const m = parseInt(calcMins) || 0;
        if (h === 0 && m === 0) { showToast("⚠️ Enter duration", "error"); return; }
        const totalHrs = h + m / 60;
        const raw = rateObj.hourly * totalHrs;
        const fee = Math.max(rateObj.minCharge || 0, Math.round(raw));
        setCalcResult({ duration: `${h}h ${m}m`, rate: rateObj.hourly, raw: Math.round(raw), fee, minApplied: fee > Math.round(raw), label: rateObj.label });
    };

    const stats = {
        active: rates.filter(r => r.enabled).length,
        minRate: rates.length ? Math.min(...rates.filter(r => r.hourly).map(r => r.hourly)) : 0,
        maxRate: rates.length ? Math.max(...rates.filter(r => r.hourly).map(r => r.hourly)) : 0,
        avgRate: rates.length ? Math.round(rates.filter(r => r.hourly).reduce((s, r) => s + r.hourly, 0) / rates.filter(r => r.hourly).length) : 0,
    };

    const inputStyle = { width: "100%", padding: ".62rem 1rem .62rem 2.3rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa", boxSizing: "border-box" };
    const labelStyle = { fontSize: ".72rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".35px", display: "block", marginBottom: ".38rem" };
    const card = { background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04)", overflow: "hidden" };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid #ccfbf1", borderTop: "4px solid #0d9488", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: "#0d9488", fontWeight: 600 }}>Loading Parking Rates...</p>
        </div>
    );

    return (
        <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#0f172a" }}>

            {/* TOPBAR */}
            <div style={{ background: "#0d9488", height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>Parking Rates</span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
                    <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Logout</button>
                </div>
            </div>

            {/* PAGE HEADER */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <div style={{ fontSize: ".8rem", color: "#64748b", marginBottom: ".4rem" }}>Dashboard <span style={{ color: "#0d9488", fontWeight: 600 }}>› Parking Rates</span></div>
                    <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>Parking Rates</h1>
                    <p style={{ color: "#64748b", fontSize: ".9rem", marginTop: ".25rem" }}>Configure hourly rates, special pricing and billing rules for all vehicle types</p>
                </div>
                <div style={{ display: "flex", gap: ".75rem" }}>
                    <button onClick={() => setAddModal(true)}
                        style={{ background: "white", color: "#0d9488", border: "1.5px solid #0d9488", padding: ".65rem 1.2rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer" }}>
                        ➕ Add New Rate
                    </button>
                    <button onClick={fetchData}
                        style={{ background: "#0d9488", color: "white", border: "none", padding: ".65rem 1.2rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(13,148,136,.25)" }}>
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
                {[
                    { icon: "⚙️", val: stats.active, label: "Active Rate Plans", bg: "#ccfbf1" },
                    { icon: "💰", val: `Rs.${stats.minRate}/hr`, label: "Lowest Rate", bg: "#d1fae5" },
                    { icon: "📈", val: `Rs.${stats.maxRate}/hr`, label: "Highest Rate", bg: "#fef3c7" },
                    { icon: "📊", val: `Rs.${stats.avgRate}/hr`, label: "Average Rate", bg: "#ede9fe" },
                ].map((s, i) => (
                    <div key={i} style={{ ...card, padding: "1.1rem 1.3rem", display: "flex", alignItems: "center", gap: ".9rem" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.35rem", lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: ".2rem" }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* TWO COL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "1.25rem" }}>

                {/* LEFT — RATE CARDS */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignContent: "start" }}>
                    {rates.map((r, i) => {
                        const [accent, light] = COLOR_MAP[r.colorClass] || ["#0d9488", "#ccfbf1"];
                        return (
                            <div key={r.type} style={{ ...card, borderTop: `4px solid ${accent}`, transition: "transform .2s,box-shadow .2s" }}
                                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,.1)"; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04)"; }}>

                                {/* Card Head */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.3rem .8rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                                        <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{r.icon}</div>
                                        <div>
                                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".95rem" }}>{r.label}</div>
                                            <div style={{ fontSize: ".74rem", color: "#64748b", marginTop: "2px" }}>{r.hourly ? "Hourly billing" : "Fixed monthly"}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                                        <span style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b" }}>{r.enabled ? "ON" : "OFF"}</span>
                                        <div style={{ position: "relative", width: "38px", height: "22px", cursor: "pointer" }} onClick={() => handleToggle(r, !r.enabled)}>
                                            <div style={{ position: "absolute", inset: 0, borderRadius: "22px", background: r.enabled ? "#0d9488" : "#cbd5e1", transition: ".3s" }}></div>
                                            <div style={{ position: "absolute", top: "3px", left: r.enabled ? "19px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: ".3s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ height: "1px", background: "#f1f5f9", margin: "0 1.3rem" }}></div>

                                {/* Card Body */}
                                <div style={{ padding: "1rem 1.3rem" }}>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: ".3rem", marginBottom: ".85rem" }}>
                                        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.6rem" }}>
                                            {r.hourly ? `Rs.${r.hourly}` : `Rs.${r.monthly}`}
                                        </span>
                                        <span style={{ fontSize: ".82rem", color: "#64748b", fontWeight: 600 }}>{r.hourly ? "/ hour" : "/ month"}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem", marginBottom: ".9rem" }}>
                                        {[
                                            ["Min Charge", r.minCharge ? `Rs.${r.minCharge}` : "—"],
                                            ["Daily Max", r.dailyMax ? `Rs.${r.dailyMax}` : "—"],
                                            ["Monthly Pass", `Rs.${r.monthly}`],
                                            ["Grace Period", `${r.grace} min`],
                                        ].map(([lbl, val]) => (
                                            <div key={lbl} style={{ background: "#f8fafc", borderRadius: "9px", padding: ".5rem .75rem" }}>
                                                <div style={{ fontSize: ".68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".3px" }}>{lbl}</div>
                                                <div style={{ fontWeight: 700, fontSize: ".85rem", marginTop: ".15rem" }}>{val}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: "flex", gap: ".5rem" }}>
                                        <button onClick={() => setEditModal({ ...r })}
                                            style={{ flex: 1, padding: ".5rem", borderRadius: "8px", border: "none", background: "#eff6ff", color: "#3b82f6", fontFamily: "DM Sans,sans-serif", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                                            ✏️ Edit Rate
                                        </button>
                                        <button onClick={() => { setQForm({ type: r.type, hourly: r.hourly || "", minCharge: r.minCharge || "", dailyMax: r.dailyMax || "", monthly: r.monthly || "", grace: r.grace || "" }); }}
                                            style={{ flex: 1, padding: ".5rem", borderRadius: "8px", border: "none", background: "#f8fafc", color: "#64748b", fontFamily: "DM Sans,sans-serif", fontWeight: 700, fontSize: ".78rem", cursor: "pointer" }}>
                                            ⚡ Quick Edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {rates.length === 0 && (
                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "3rem", background: "white", borderRadius: "16px" }}>
                            <div style={{ fontSize: "3rem" }}>⚙️</div>
                            <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, marginTop: ".75rem" }}>No rates configured</h3>
                            <p style={{ color: "#64748b", fontSize: ".88rem", marginTop: ".35rem" }}>Add rate plans using the button above.</p>
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* QUICK EDIT FORM */}
                    <div style={card}>
                        <div style={{ padding: "1.1rem 1.4rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem" }}>✏️ Quick Edit Rate</span>
                            <span style={{ fontSize: ".72rem", color: "#64748b", fontWeight: 600 }}>Click 'Quick Edit' on a card to pre-fill</span>
                        </div>
                        <div style={{ padding: "1.3rem 1.4rem", display: "flex", flexDirection: "column", gap: ".9rem" }}>
                            <div>
                                <label style={labelStyle}>Vehicle Type <span style={{ color: "#ef4444" }}>*</span></label>
                                <select value={qForm.type} onChange={e => setQForm({ ...qForm, type: e.target.value })}
                                    style={{ width: "100%", padding: ".62rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa" }}>
                                    <option value="">— Select Type —</option>
                                    {rates.map(r => <option key={r.type} value={r.type}>{r.icon} {r.label}</option>)}
                                </select>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                                {[
                                    ["Hourly Rate (Rs.) *", "💵", "hourly", "e.g. 50"],
                                    ["Min. Charge (Rs.)", "🔖", "minCharge", "e.g. 10"],
                                    ["Daily Max (Rs.)", "📆", "dailyMax", "e.g. 400"],
                                    ["Monthly Pass (Rs.)", "🗓️", "monthly", "e.g. 2400"],
                                ].map(([lbl, icon, key, ph]) => (
                                    <div key={key}>
                                        <label style={labelStyle}>{lbl}</label>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)", fontSize: ".88rem" }}>{icon}</span>
                                            <input type="number" value={qForm[key]} onChange={e => setQForm({ ...qForm, [key]: e.target.value })} placeholder={ph}
                                                style={inputStyle} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label style={labelStyle}>Grace Period (minutes)</label>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>⏱️</span>
                                    <input type="number" value={qForm.grace} onChange={e => setQForm({ ...qForm, grace: e.target.value })} placeholder="e.g. 15" min="0" max="60" style={inputStyle} />
                                </div>
                            </div>

                            {/* Live preview */}
                            {qForm.type && qForm.hourly > 0 && (
                                <div style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)", borderRadius: "12px", padding: "1rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".75rem", fontWeight: 600 }}>Estimated — 2 hour stay</div>
                                        <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>Rs. {qForm.hourly * 2}</div>
                                        <div style={{ color: "rgba(255,255,255,.55)", fontSize: ".7rem", marginTop: "2px" }}>{qForm.type} · 2 hrs</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <div style={{ color: "rgba(255,255,255,.7)", fontSize: ".75rem", fontWeight: 600 }}>Per Hour</div>
                                        <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>Rs.{qForm.hourly}</div>
                                    </div>
                                </div>
                            )}

                            <button onClick={handleQuickSave} disabled={saving}
                                style={{ background: saving ? "#94a3b8" : "linear-gradient(135deg,#0d9488,#0f766e)", color: "white", border: "none", padding: ".78rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".9rem", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(13,148,136,.3)" }}>
                                {saving ? "⏳ Saving..." : "💾 Save Rate"}
                            </button>
                        </div>
                    </div>

                    {/* FEE CALCULATOR */}
                    <div style={card}>
                        <div style={{ padding: "1.1rem 1.4rem .9rem", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem" }}>🧮 Fee Calculator</span>
                        </div>
                        <div style={{ padding: "1.3rem 1.4rem", display: "flex", flexDirection: "column", gap: ".85rem" }}>
                            <select value={calcType} onChange={e => setCalcType(e.target.value)}
                                style={{ width: "100%", padding: ".6rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".85rem", outline: "none", background: "#fafafa", cursor: "pointer" }}>
                                <option value="">— Select Vehicle Type —</option>
                                {rates.filter(r => r.hourly).map(r => <option key={r.type} value={r.type}>{r.icon} {r.label} (Rs.{r.hourly}/hr)</option>)}
                            </select>
                            <div style={{ display: "flex", alignItems: "center", gap: ".65rem" }}>
                                <input type="number" value={calcHours} onChange={e => setCalcHours(e.target.value)} placeholder="Hours" min="0"
                                    style={{ flex: 1, padding: ".6rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa" }} />
                                <span style={{ fontSize: ".85rem", color: "#64748b", fontWeight: 600 }}>hrs</span>
                                <input type="number" value={calcMins} onChange={e => setCalcMins(e.target.value)} placeholder="Mins" min="0" max="59"
                                    style={{ flex: 1, padding: ".6rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa" }} />
                                <span style={{ fontSize: ".85rem", color: "#64748b", fontWeight: 600 }}>min</span>
                                <button onClick={calculate}
                                    style={{ background: "#0d9488", color: "white", border: "none", padding: ".6rem 1.1rem", borderRadius: "9px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".82rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                                    Calculate
                                </button>
                            </div>

                            {calcResult && (
                                <div style={{ background: "#f0fdfa", border: "1.5px solid #ccfbf1", borderRadius: "10px", padding: ".85rem 1.1rem" }}>
                                    <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: ".5rem" }}>Fee Breakdown</div>
                                    {[
                                        ["Duration", calcResult.duration],
                                        ["Vehicle", calcResult.label],
                                        ["Rate", `Rs.${calcResult.rate}/hr`],
                                        ["Base Fee", `Rs.${calcResult.raw}`],
                                        ...(calcResult.minApplied ? [["Min. Charge Applied", `Rs.${calcResult.fee}`]] : []),
                                    ].map(([lbl, val]) => (
                                        <div key={lbl} style={{ display: "flex", justifyContent: "space-between", fontSize: ".83rem", marginBottom: ".35rem" }}>
                                            <span style={{ color: "#64748b" }}>{lbl}</span>
                                            <span style={{ fontWeight: 700, color: "#0f766e" }}>{val}</span>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: ".55rem", paddingTop: ".55rem", borderTop: "1px solid #ccfbf1" }}>
                                        <span style={{ fontWeight: 700, fontSize: ".88rem" }}>Total Fee</span>
                                        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1rem", color: "#0d9488" }}>Rs. {calcResult.fee}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RATE CHANGE HISTORY */}
                    <div style={card}>
                        <div style={{ padding: "1.1rem 1.4rem .9rem", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem" }}>🕐 Rate Change History</span>
                        </div>
                        <div style={{ padding: ".9rem 1.4rem" }}>
                            {history.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                                    <div style={{ fontSize: "2rem" }}>📋</div>
                                    <p style={{ fontSize: ".85rem", marginTop: ".5rem" }}>No changes recorded yet. Rate changes will appear here.</p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                                    {history.slice(0, 6).map(h => {
                                        const changed = h.newHourly !== h.oldHourly;
                                        const up = h.newHourly > h.oldHourly;
                                        return (
                                            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".65rem .85rem", background: "#f8fafc", borderRadius: "10px" }}>
                                                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".85rem", flexShrink: 0 }}>{h.icon}</div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: ".82rem" }}>{h.label} Rate Updated</div>
                                                    <div style={{ fontSize: ".72rem", color: "#64748b", marginTop: "1px" }}>
                                                        {new Date(h.changedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })} · {h.changedBy}
                                                    </div>
                                                </div>
                                                {changed ? (
                                                    <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".82rem", color: up ? "#10b981" : "#ef4444" }}>
                                                        {up ? "↑" : "↓"} Rs.{h.oldHourly} → Rs.{h.newHourly}
                                                    </span>
                                                ) : (
                                                    <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".82rem", color: "#64748b" }}>Updated</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT MODAL */}
            {editModal && (
                <div onClick={e => e.target === e.currentTarget && setEditModal(null)}
                    style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
                        <div style={{ padding: "1.3rem 1.6rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                            <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>Edit — {editModal.label} Rate</h2>
                            <button onClick={() => setEditModal(null)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer" }}>✕</button>
                        </div>
                        <div style={{ padding: "1.5rem 1.6rem", display: "flex", flexDirection: "column", gap: ".9rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                                {[
                                    ["Hourly Rate (Rs.)", "💵", "hourly"],
                                    ["Min. Charge (Rs.)", "🔖", "minCharge"],
                                    ["Daily Max (Rs.)", "📆", "dailyMax"],
                                    ["Monthly Pass (Rs.)", "🗓️", "monthly"],
                                ].map(([lbl, icon, key]) => (
                                    <div key={key}>
                                        <label style={labelStyle}>{lbl}</label>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>{icon}</span>
                                            <input type="number" value={editModal[key] || ""} onChange={e => setEditModal({ ...editModal, [key]: e.target.value })}
                                                style={inputStyle} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label style={labelStyle}>Grace Period (minutes)</label>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>⏱️</span>
                                    <input type="number" value={editModal.grace || ""} onChange={e => setEditModal({ ...editModal, grace: e.target.value })} min="0" max="60" style={inputStyle} />
                                </div>
                            </div>
                            <button onClick={handleSaveEdit} disabled={saving}
                                style={{ background: saving ? "#94a3b8" : "linear-gradient(135deg,#0d9488,#0f766e)", color: "white", border: "none", padding: ".8rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".9rem", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(13,148,136,.3)" }}>
                                {saving ? "⏳ Saving..." : "💾 Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD NEW MODAL */}
            {addModal && (
                <div onClick={e => e.target === e.currentTarget && setAddModal(false)}
                    style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "500px", boxShadow: "0 25px 60px rgba(0,0,0,.2)", maxHeight: "90vh", overflowY: "auto" }}>
                        <div style={{ padding: "1.3rem 1.6rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                            <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>➕ Add New Rate Plan</h2>
                            <button onClick={() => setAddModal(false)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer" }}>✕</button>
                        </div>
                        <div style={{ padding: "1.5rem 1.6rem", display: "flex", flexDirection: "column", gap: ".9rem" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                                <div>
                                    <label style={labelStyle}>Type Key <span style={{ color: "#ef4444" }}>*</span></label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>🔑</span>
                                        <input value={aForm.type} onChange={e => setAForm({ ...aForm, type: e.target.value.toLowerCase().replace(/\s/g, "-") })} placeholder="e.g. bike" style={inputStyle} />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Display Label <span style={{ color: "#ef4444" }}>*</span></label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>🏷️</span>
                                        <input value={aForm.label} onChange={e => setAForm({ ...aForm, label: e.target.value })} placeholder="e.g. Bicycle" style={inputStyle} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                                {[
                                    ["Hourly Rate (Rs.) *", "💵", "hourly", "e.g. 20"],
                                    ["Min. Charge (Rs.)", "🔖", "minCharge", "e.g. 5"],
                                    ["Daily Max (Rs.)", "📆", "dailyMax", "e.g. 160"],
                                    ["Monthly Pass (Rs.)", "🗓️", "monthly", "e.g. 1000"],
                                ].map(([lbl, icon, key, ph]) => (
                                    <div key={key}>
                                        <label style={labelStyle}>{lbl}</label>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>{icon}</span>
                                            <input type="number" value={aForm[key]} onChange={e => setAForm({ ...aForm, [key]: e.target.value })} placeholder={ph} style={inputStyle} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label style={labelStyle}>Grace Period (minutes)</label>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>⏱️</span>
                                    <input type="number" value={aForm.grace} onChange={e => setAForm({ ...aForm, grace: e.target.value })} placeholder="e.g. 10" min="0" style={inputStyle} />
                                </div>
                            </div>
                            <button onClick={handleAddNew} disabled={saving}
                                style={{ background: saving ? "#94a3b8" : "linear-gradient(135deg,#0d9488,#0f766e)", color: "white", border: "none", padding: ".8rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".9rem", cursor: saving ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(13,148,136,.3)" }}>
                                {saving ? "⏳ Adding..." : "➕ Add Rate Plan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast.show && (
                <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: toast.type === "error" ? "#ef4444" : "#10b981", color: "white", padding: ".85rem 1.4rem", borderRadius: "12px", fontWeight: 600, fontSize: ".88rem", boxShadow: "0 8px 24px rgba(0,0,0,.2)", zIndex: 999 }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
