import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// const API = "https://fyp-dun-two.vercel.app/api";
const API = "http://localhost:3000/api";
export default function RegisterVehicle() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("manual"); // manual | scan
    const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", plateNumber: "" });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
    const [registeredVehicle, setRegisteredVehicle] = useState(null);
    const [recentRegistrations, setRecentRegistrations] = useState([]);
    const [stats, setStats] = useState({ today: 0, total: 0, pending: 0 });
    const pollRef = useRef(null);

    // Fetch recent registrations (real-time polling)
    const fetchRecent = async () => {
        try {
            const res = await fetch(`${API}/vehicles/all`);
            const data = await res.json();
            const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRecentRegistrations(sorted.slice(0, 5));

            const today = new Date(); today.setHours(0, 0, 0, 0);
            const todayCount = sorted.filter(v => new Date(v.createdAt) >= today).length;
            setStats({ today: todayCount, total: sorted.length, pending: 0 });
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRecent();
        // Poll every 5 seconds — mobile app se register hone par auto-update
        pollRef.current = setInterval(fetchRecent, 5000);
        return () => clearInterval(pollRef.current);
    }, []);

    const showToast = (msg, type = "success") => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 4000);
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Owner name is required";
        if (!/^0[0-9]{10}$/.test(form.phone)) e.phone = "Enter valid 11-digit number";
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter valid email";
        if (!form.plateNumber.trim() || form.plateNumber.length < 4) e.plateNumber = "Enter valid plate number";
        if (!form.password || form.password.length < 6) e.password = "Password min 6 characters";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    phone: form.phone,
                    email: form.email || `${form.phone}@parkify.com`,
                    password: form.password,
                    plateNumber: form.plateNumber.toUpperCase()
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Registration failed");

            setRegisteredVehicle(data);
            showToast("🎉 Vehicle registered successfully! QR code generated.");
            setForm({ name: "", phone: "", email: "", password: "", plateNumber: "" });
            setErrors({});
            fetchRecent();
        } catch (err) {
            showToast("❌ " + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = (field) => ({
        width: "100%", padding: ".7rem 1rem", border: `1.5px solid ${errors[field] ? "#ef4444" : "#cbd5e1"}`,
        borderRadius: "10px", fontFamily: "DM Sans,sans-serif", fontSize: ".95rem",
        outline: "none", background: "#fafafa", boxSizing: "border-box",
        transition: "all .2s"
    });

    const plateInputStyle = {
        ...inputStyle("plateNumber"),
        fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.1rem",
        letterSpacing: "3px", textTransform: "uppercase",
        background: "#fffbeb", borderColor: errors.plateNumber ? "#ef4444" : "#f59e0b", color: "#92400e"
    };

    const labelStyle = {
        fontSize: ".82rem", fontWeight: 600, color: "#0f172a",
        letterSpacing: ".3px", textTransform: "uppercase", marginBottom: ".3rem", display: "block"
    };

    return (
        <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#0f172a" }}>

            {/* TOPBAR */}
            <div style={{ background: "#0d9488", height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>Register Vehicle</span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
                    <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Logout</button>
                </div>
            </div>

            {/* BREADCRUMB */}
            <div style={{ fontSize: ".8rem", color: "#64748b", marginBottom: "1rem" }}>
                Dashboard <span style={{ color: "#0d9488", fontWeight: 600 }}>› Register Vehicle</span>
            </div>

            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
                {[
                    { icon: "🚗", val: stats.total, label: "Total Registered", bg: "#ccfbf1" },
                    { icon: "📅", val: stats.today, label: "Registered Today", bg: "#d1fae5" },
                    { icon: "📱", val: "Auto", label: "Mobile App Sync", bg: "#dbeafe" },
                ].map((s, i) => (
                    <div key={i} style={{ background: "white", borderRadius: "14px", padding: "1.2rem 1.4rem", display: "flex", alignItems: "center", gap: "1rem", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.05)" }}>
                        <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>{s.icon}</div>
                        <div>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.5rem", lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: ".2rem" }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "1.5rem" }}>

                {/* LEFT — FORM */}
                <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,.06),0 4px 20px rgba(13,148,136,.08)", padding: "2rem 2.5rem" }}>

                    {/* TABS */}
                    <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.75rem", background: "#f1f5f9", borderRadius: "10px", padding: ".3rem" }}>
                        {[
                            { key: "manual", label: "✏️ Manual Entry", sub: "Admin fills form" },
                            { key: "mobile", label: "📱 Mobile App", sub: "Auto from app" }
                        ].map(t => (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                style={{ flex: 1, padding: ".6rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".85rem", background: activeTab === t.key ? "white" : "transparent", color: activeTab === t.key ? "#0d9488" : "#64748b", boxShadow: activeTab === t.key ? "0 1px 4px rgba(0,0,0,.1)" : "none", transition: "all .2s" }}>
                                {t.label}
                                <div style={{ fontSize: ".7rem", fontWeight: 400, color: activeTab === t.key ? "#64748b" : "#94a3b8", marginTop: "2px" }}>{t.sub}</div>
                            </button>
                        ))}
                    </div>

                    {activeTab === "manual" ? (
                        <>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: ".6rem" }}>
                                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0d9488", display: "inline-block" }}></span>
                                Vehicle & Owner Information
                            </div>

                            {/* OWNER SECTION */}
                            <div style={{ fontSize: ".8rem", fontFamily: "Syne,sans-serif", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".6rem" }}>
                                Owner Details
                                <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
                                <div>
                                    <label style={labelStyle}>Owner Name <span style={{ color: "#ef4444" }}>*</span></label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>👤</span>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                            placeholder="e.g. Ali Hassan"
                                            style={{ ...inputStyle("name"), paddingLeft: "2.5rem" }} />
                                    </div>
                                    {errors.name && <div style={{ fontSize: ".78rem", color: "#ef4444", marginTop: ".2rem" }}>{errors.name}</div>}
                                </div>

                                <div>
                                    <label style={labelStyle}>Contact Number <span style={{ color: "#ef4444" }}>*</span></label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>📞</span>
                                        <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                            placeholder="03001234567" maxLength={11}
                                            style={{ ...inputStyle("phone"), paddingLeft: "2.5rem" }} />
                                    </div>
                                    {errors.phone && <div style={{ fontSize: ".78rem", color: "#ef4444", marginTop: ".2rem" }}>{errors.phone}</div>}
                                </div>

                                <div style={{ gridColumn: "1/-1" }}>
                                    <label style={labelStyle}>Email Address <span style={{ color: "#64748b", fontWeight: 400, textTransform: "none" }}>(Optional)</span></label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>✉️</span>
                                        <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                            placeholder="e.g. ali@email.com" type="email"
                                            style={{ ...inputStyle("email"), paddingLeft: "2.5rem" }} />
                                    </div>
                                    {errors.email && <div style={{ fontSize: ".78rem", color: "#ef4444", marginTop: ".2rem" }}>{errors.email}</div>}
                                </div>

                                <div style={{ gridColumn: "1/-1" }}>
                                    <label style={labelStyle}>Password <span style={{ color: "#ef4444" }}>*</span></label>
                                    <div style={{ position: "relative" }}>
                                        <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>🔒</span>
                                        <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                            placeholder="Min 6 characters" type="password"
                                            style={{ ...inputStyle("password"), paddingLeft: "2.5rem" }} />
                                    </div>
                                    {errors.password && <div style={{ fontSize: ".78rem", color: "#ef4444", marginTop: ".2rem" }}>{errors.password}</div>}
                                </div>
                            </div>

                            {/* VEHICLE SECTION */}
                            <div style={{ fontSize: ".8rem", fontFamily: "Syne,sans-serif", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".6rem" }}>
                                Vehicle Details
                                <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }}></div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem 1.5rem" }}>
                                <div style={{ gridColumn: "1/-1" }}>
                                    <label style={labelStyle}>Number Plate <span style={{ color: "#ef4444" }}>*</span></label>
                                    <input value={form.plateNumber}
                                        onChange={e => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })}
                                        placeholder="ABC-1234" maxLength={10}
                                        style={plateInputStyle} />
                                    <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: ".2rem" }}>Format: ABC-1234 · Auto UPPERCASE</div>
                                    {errors.plateNumber && <div style={{ fontSize: ".78rem", color: "#ef4444", marginTop: ".2rem" }}>{errors.plateNumber}</div>}
                                </div>
                            </div>

                            {/* WALLET */}
                            <div style={{ background: "linear-gradient(135deg,#0d9488,#0f766e)", borderRadius: "12px", padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", margin: "1.5rem 0" }}>
                                <span style={{ fontSize: "2rem" }}>💰</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".95rem" }}>Initial Wallet Balance</div>
                                    <div style={{ color: "rgba(255,255,255,.75)", fontSize: ".8rem", marginTop: "2px" }}>Wallet starts at Rs. 0 — user can top up via mobile app</div>
                                </div>
                                <div style={{ background: "rgba(255,255,255,.15)", borderRadius: "8px", padding: ".4rem .9rem", color: "white", fontWeight: 700, fontSize: "1rem" }}>Rs. 0</div>
                            </div>

                            {/* SUCCESS QR */}
                            {registeredVehicle && (
                                <div style={{ background: "#f0fdfa", border: "2px dashed #0d9488", borderRadius: "12px", padding: "1.5rem", textAlign: "center", marginBottom: "1.5rem" }}>
                                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, color: "#0d9488", marginBottom: ".75rem" }}>✅ Vehicle Registered Successfully!</div>
                                    {registeredVehicle.qrCode ? (
                                        <img src={registeredVehicle.qrCode} alt="QR Code" style={{ width: "130px", height: "130px", borderRadius: "8px", border: "2px solid #0d9488" }} />
                                    ) : (
                                        <div style={{ fontSize: "4rem" }}>📱</div>
                                    )}
                                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "3px", color: "#0f766e", marginTop: ".5rem" }}>
                                        {registeredVehicle.user?.name}
                                    </div>
                                    <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: ".25rem" }}>QR code generated — use at entry/exit gate</div>
                                    <button onClick={() => window.print()} style={{ marginTop: ".75rem", background: "#0d9488", color: "white", border: "none", padding: ".5rem 1.2rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: ".85rem" }}>
                                        🖨️ Print QR Code
                                    </button>
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div style={{ display: "flex", gap: "1rem", paddingTop: "1.5rem", borderTop: "1px solid #f1f5f9" }}>
                                <button onClick={handleSubmit} disabled={loading}
                                    style={{ background: loading ? "#94a3b8" : "#0d9488", color: "white", border: "none", padding: ".8rem 2rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".95rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 12px rgba(13,148,136,.3)", transition: "all .2s" }}>
                                    {loading ? "⏳ Registering..." : "✅ Register Vehicle"}
                                </button>
                                <button onClick={() => { setForm({ name: "", phone: "", email: "", password: "", plateNumber: "" }); setErrors({}); setRegisteredVehicle(null); }}
                                    style={{ background: "white", color: "#64748b", border: "1.5px solid #cbd5e1", padding: ".8rem 1.5rem", borderRadius: "10px", fontWeight: 600, cursor: "pointer" }}>
                                    ↺ Reset
                                </button>
                            </div>
                        </>
                    ) : (
                        /* MOBILE APP TAB */
                        <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📱</div>
                            <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.2rem", marginBottom: ".5rem" }}>Mobile App Auto-Registration</h3>
                            <p style={{ color: "#64748b", fontSize: ".9rem", marginBottom: "2rem", lineHeight: 1.6 }}>
                                When a user registers on the <strong>Parkify mobile app</strong>, their vehicle automatically appears here in real-time. No manual entry needed!
                            </p>

                            <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
                                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", marginBottom: "1rem", color: "#0d9488" }}>📡 How it works:</div>
                                {[
                                    ["1", "User downloads Parkify mobile app"],
                                    ["2", "User registers with name, phone & plate number"],
                                    ["3", "Backend generates QR code automatically"],
                                    ["4", "Vehicle appears here within 5 seconds"],
                                    ["5", "Admin can view QR & manage from this panel"],
                                ].map(([num, text]) => (
                                    <div key={num} style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".65rem", fontSize: ".88rem" }}>
                                        <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#0d9488", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".75rem", fontWeight: 700, flexShrink: 0 }}>{num}</span>
                                        {text}
                                    </div>
                                ))}
                            </div>

                            <div style={{ background: "#dbeafe", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: ".75rem", textAlign: "left" }}>
                                <span style={{ fontSize: "1.5rem" }}>🔗</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: ".88rem", color: "#1e40af" }}>API Endpoint for Mobile App</div>
                                    <code style={{ fontSize: ".78rem", color: "#1e40af", background: "#bfdbfe", padding: ".15rem .4rem", borderRadius: "4px" }}>POST {API}/auth/register</code>
                                </div>
                            </div>

                            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: ".5rem", justifyContent: "center", color: "#16a34a", fontWeight: 700, fontSize: ".88rem" }}>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 1.5s infinite" }}></span>
                                    Live polling active — checking every 5 seconds
                                </div>
                                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT — RECENT REGISTRATIONS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div style={{ background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.05)", overflow: "hidden" }}>
                        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".95rem" }}>Recent Registrations</span>
                            <span style={{ display: "flex", alignItems: "center", gap: ".4rem", background: "#f0fdf4", color: "#16a34a", fontSize: ".72rem", fontWeight: 700, padding: ".25rem .65rem", borderRadius: "20px" }}>
                                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                                Live
                            </span>
                        </div>

                        {recentRegistrations.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                                <div style={{ fontSize: "2rem" }}>🚗</div>
                                <p style={{ fontSize: ".85rem", marginTop: ".5rem" }}>No vehicles registered yet</p>
                            </div>
                        ) : (
                            recentRegistrations.map((v, i) => {
                                const colors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];
                                const name = v.userId?.name || "Unknown";
                                const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                                const timeAgo = (iso) => {
                                    const diff = Date.now() - new Date(iso).getTime();
                                    const min = Math.floor(diff / 60000);
                                    if (min < 1) return "Just now";
                                    if (min < 60) return `${min}m ago`;
                                    if (min < 1440) return `${Math.floor(min / 60)}h ago`;
                                    return new Date(iso).toLocaleDateString("en-PK", { month: "short", day: "numeric" });
                                };
                                return (
                                    <div key={v._id} style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".75rem 1.25rem", borderBottom: i < recentRegistrations.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: colors[i % colors.length], display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: ".85rem", flexShrink: 0 }}>{initials}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{name}</div>
                                            <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "1px" }}>
                                                <span style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontFamily: "Syne,sans-serif", fontWeight: 700, padding: ".1rem .4rem", borderRadius: "4px", fontSize: ".72rem", letterSpacing: "1px" }}>{v.plateNumber}</span>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: ".72rem", color: "#94a3b8", textAlign: "right" }}>
                                            <div>{timeAgo(v.createdAt)}</div>
                                            <div style={{ marginTop: "2px", background: "#d1fae5", color: "#065f46", padding: ".1rem .4rem", borderRadius: "4px", fontSize: ".68rem", fontWeight: 700 }}>Active</div>
                                        </div>
                                    </div>
                                );
                            })
                        )}

                        <div style={{ padding: ".75rem 1.25rem", borderTop: "1px solid #f1f5f9" }}>
                            <button onClick={() => navigate("/vehicles")}
                                style={{ width: "100%", background: "#f0fdfa", color: "#0d9488", border: "1px solid #99f6e4", padding: ".6rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: ".85rem" }}>
                                View All Vehicles →
                            </button>
                        </div>
                    </div>

                    {/* API INFO */}
                    <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: "16px", padding: "1.4rem" }}>
                        <div style={{ color: "rgba(255,255,255,.6)", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: ".75rem" }}>Mobile App API</div>
                        <div style={{ fontSize: ".82rem", color: "rgba(255,255,255,.85)", marginBottom: ".5rem" }}>Flutter app register endpoint:</div>
                        <code style={{ display: "block", background: "rgba(255,255,255,.08)", color: "#34d399", padding: ".6rem .9rem", borderRadius: "8px", fontSize: ".78rem", marginBottom: ".75rem", wordBreak: "break-all" }}>
                            POST {API}/auth/register
                        </code>
                        <div style={{ fontSize: ".78rem", color: "rgba(255,255,255,.5)", lineHeight: 1.6 }}>
                            Fields: name, phone, email, password, plateNumber
                        </div>
                        <div style={{ marginTop: ".75rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                            <span style={{ fontSize: ".78rem", color: "#34d399", fontWeight: 600 }}>Connected & Ready</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TOAST */}
            {toast.show && (
                <div style={{ position: "fixed", top: "80px", right: "2rem", background: toast.type === "error" ? "#ef4444" : "#10b981", color: "white", padding: "1rem 1.5rem", borderRadius: "12px", fontWeight: 600, fontSize: ".9rem", boxShadow: `0 8px 24px ${toast.type === "error" ? "rgba(239,68,68,.35)" : "rgba(16,185,129,.35)"}`, zIndex: 999, maxWidth: "350px" }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
