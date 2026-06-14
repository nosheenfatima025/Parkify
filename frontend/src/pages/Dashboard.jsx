import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TOTAL_SLOTS = 50;
const API = "https://fyp-dun-two.vercel.app/api";

export default function Dashboard() {
    const navigate = useNavigate();
    const [time, setTime] = useState(new Date());
    const [stats, setStats] = useState({
        vehicles: 0, parked: 0, revenue: 0, alerts: 0,
        occupancy: 0, available: TOTAL_SLOTS,
        topVehicles: [], lowWallets: [], parkedNow: [],
        activities: [], fraudList: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await fetch(`${API}/admin/dashboard`);
            const data = await res.json();
            setStats({
                vehicles: data.totalVehicles || 0,
                parked: data.currentlyParked || 0,
                revenue: data.todayRevenue || 0,
                alerts: data.fraudAlerts || 0,
                occupancy: data.occupancy || 0,
                available: data.available ?? TOTAL_SLOTS,
                activities: data.activities || [],
                parkedNow: data.parkedNow || [],
                lowWallets: data.lowWallets || [],
                topVehicles: data.topVehicles || [],
                fraudList: data.fraudList || []
            });
        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 15000);
        return () => clearInterval(interval);
    }, []);

    const timeAgo = (iso) => {
        const diff = Date.now() - new Date(iso).getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return "Just now";
        if (min < 60) return `${min} min ago`;
        return `${Math.floor(min / 60)}h ago`;
    };

    const dotColors = {
        entry: "#10b981", exit: "#ef4444",
        topup: "#3b82f6", fraud: "#f59e0b"
    };

    const card = {
        background: "white", borderRadius: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04)",
        overflow: "hidden"
    };

    const plateStyle = {
        fontFamily: "monospace", fontWeight: 700,
        background: "#fffbeb", border: "1px solid #fcd34d",
        color: "#92400e", padding: "1px 7px",
        borderRadius: "5px", fontSize: ".75rem", letterSpacing: "1px"
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid #ccfbf1", borderTop: "4px solid #0d9488", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#0d9488", fontWeight: 600 }}>Loading Dashboard...</p>
        </div>
    );

    return (
        <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#0f172a" }}>

            {/* TOPBAR */}
            <div style={{ background: "#0d9488", height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>Dashboard</span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
                    <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>
                        Logout
                    </button>
                </div>
            </div>

            {/* HERO */}
            <div style={{ minHeight: "200px", background: "linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.6)), url('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=1400&q=80') center/cover", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: "16px", marginBottom: "24px", padding: "2rem" }}>
                <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "white" }}>Welcome to Parkify Admin Dashboard</h1>
                <p style={{ color: "rgba(255,255,255,.85)", marginTop: ".5rem", fontWeight: 500 }}>Manage your parking lot efficiently</p>
                <div style={{ marginTop: "1rem", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)", color: "white", padding: ".4rem 1.4rem", borderRadius: "30px", fontSize: ".85rem", fontWeight: 600 }}>
                    {time.toLocaleString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
            </div>

            {/* KPI CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "24px" }}>
                {[
                    { icon: "🚗", val: stats.vehicles, label: "Registered Vehicles", trend: stats.vehicles === 0 ? "No vehicles yet" : `${stats.vehicles} total`, border: "#0d9488", bg: "#ccfbf1" },
                    { icon: "🅿️", val: stats.parked, label: "Currently Parked", trend: `${stats.occupancy}% occupancy`, border: "#10b981", bg: "#d1fae5" },
                    { icon: "💰", val: `Rs.${stats.revenue.toLocaleString()}`, label: "Revenue Today", trend: "Today", border: "#f59e0b", bg: "#fef3c7" },
                    { icon: "⚠️", val: stats.alerts, label: "Fraud Alerts", trend: stats.alerts === 0 ? "All clear ✅" : "Action needed!", border: "#ef4444", bg: "#fee2e2" },
                ].map((k, i) => (
                    <div key={i} style={{ ...card, padding: "1.25rem 1.4rem", display: "flex", alignItems: "center", gap: "1rem", borderLeft: `4px solid ${k.border}` }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: k.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>{k.icon}</div>
                        <div>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.5rem", lineHeight: 1 }}>{k.val}</div>
                            <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: ".25rem" }}>{k.label}</div>
                            <span style={{ fontSize: ".72rem", fontWeight: 700, padding: ".2rem .5rem", borderRadius: "10px", background: "#f1f5f9", color: "#475569", display: "inline-block", marginTop: ".3rem" }}>{k.trend}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* TWO COL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* QUICK ACTIONS */}
                    <div>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0d9488", display: "inline-block" }}></span>
                            Quick Actions
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".85rem" }}>
                            {[
                                { icon: "➕", label: "Register Vehicle", sub: "Add new vehicle to system", path: "/register-vehicle", hover: "#f0fdfa" },
                                { icon: "📊", label: "Entry / Exit Logs", sub: "View all parking sessions", path: "/logs", hover: "#eff6ff" },
                                { icon: "💳", label: "Wallet & Billing", sub: stats.lowWallets.length > 0 ? `${stats.lowWallets.length} wallet(s) low balance` : "All wallets OK", path: "/billing", hover: "#fffbeb" },
                                { icon: "⚠️", label: "Fraud Alerts", sub: stats.alerts > 0 ? `${stats.alerts} active alert(s)` : "No active alerts", path: "/fraud-alerts", hover: "#fef2f2" },
                                { icon: "📁", label: "Reports", sub: "Analytics & insights", path: "/reports", hover: "#f5f3ff" },
                                { icon: "⚙️", label: "Parking Rates", sub: "Rs.50/hr · Rs.500/day", path: "/parking-rates", hover: "#f0fdf4" },
                            ].map((q, i) => (
                                <button key={i} onClick={() => navigate(q.path)}
                                    style={{ background: "white", border: "1.5px solid #e2e8f0", borderRadius: "14px", padding: "1.1rem", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: ".5rem" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = q.hover; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.1)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
                                    <div style={{ fontSize: "1.5rem" }}>{q.icon}</div>
                                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem" }}>{q.label}</div>
                                    <div style={{ fontSize: ".72rem", color: "#64748b" }}>{q.sub}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ACTIVITY FEED */}
                    <div>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0d9488", display: "inline-block" }}></span>
                            Recent Activity
                        </div>
                        <div style={card}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.4rem", borderBottom: "1px solid #e2e8f0" }}>
                                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700 }}>Live Activity Feed</span>
                                <span style={{ display: "flex", alignItems: "center", gap: ".4rem", background: "#f0fdf4", color: "#10b981", fontSize: ".72rem", fontWeight: 700, padding: ".25rem .7rem", borderRadius: "20px" }}>
                                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span> Live
                                </span>
                            </div>
                            {stats.activities.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                                    <div style={{ fontSize: "2rem" }}>📋</div>
                                    <p style={{ marginTop: ".5rem", fontSize: ".85rem" }}>No activity yet</p>
                                    <p style={{ fontSize: ".78rem", marginTop: ".25rem" }}>Record vehicle entry/exit to see activity here</p>
                                </div>
                            ) : (
                                stats.activities.map((a, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: ".85rem", padding: ".75rem 1.4rem", borderBottom: i < stats.activities.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: dotColors[a.type] || "#94a3b8", marginTop: "5px", flexShrink: 0 }}></div>
                                        <div>
                                            <div style={{ fontSize: ".83rem", fontWeight: 600 }}>
                                                <span style={plateStyle}>{a.plate}</span>{" "}
                                                {a.type === "entry" ? "entered parking" : "exited parking"}
                                            </div>
                                            <div style={{ fontSize: ".72rem", color: "#64748b", marginTop: "2px" }}>{timeAgo(a.time)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT STACK */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* OCCUPANCY */}
                    <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: "16px", padding: "1.4rem" }}>
                        <div style={{ color: "rgba(255,255,255,.55)", fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px" }}>Current Occupancy</div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: ".6rem" }}>
                            <div>
                                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "2rem", color: "white" }}>{stats.occupancy}%</div>
                                <div style={{ color: "rgba(255,255,255,.45)", fontSize: ".75rem" }}>of total capacity</div>
                            </div>
                            <span style={{ fontSize: "2.5rem" }}>🅿️</span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,.1)", borderRadius: "30px", height: "10px", margin: "1rem 0 .5rem", overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: "30px", background: "linear-gradient(90deg,#0d9488,#34d399)", width: `${stats.occupancy}%`, transition: "width 1.5s ease" }}></div>
                        </div>
                        <div style={{ display: "flex", gap: "1.5rem", marginTop: ".85rem" }}>
                            {[["Total", TOTAL_SLOTS], ["Occupied", stats.parked], ["Available", stats.available]].map(([l, v]) => (
                                <div key={l}>
                                    <div style={{ color: "rgba(255,255,255,.4)", fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                                    <div style={{ color: "white", fontWeight: 700, fontSize: ".92rem", marginTop: "2px" }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FRAUD ALERTS */}
                    <div style={card}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1.2rem", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem" }}>🚨 Fraud Alerts</span>
                            <span onClick={() => navigate("/fraud-alerts")} style={{ fontSize: ".75rem", color: "#0d9488", fontWeight: 700, cursor: "pointer" }}>View all →</span>
                        </div>
                        {stats.fraudList.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b" }}>
                                <div style={{ fontSize: "1.5rem" }}>✅</div>
                                <p style={{ fontSize: ".82rem", marginTop: ".5rem" }}>No active fraud alerts</p>
                            </div>
                        ) : (
                            stats.fraudList.map((f, i) => (
                                <div key={i} onClick={() => navigate("/fraud-alerts")} style={{ display: "flex", alignItems: "center", gap: ".7rem", padding: ".65rem 1.2rem", borderBottom: i < stats.fraudList.length - 1 ? "1px solid #f8fafc" : "none", cursor: "pointer" }}>
                                    <div style={{ width: "32px", height: "32px", borderRadius: "9px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>🚨</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: ".8rem" }}>{f.msg}</div>
                                        <div style={plateStyle}>{f.plate}</div>
                                    </div>
                                    <span style={{ fontSize: ".68rem", fontWeight: 800, padding: ".15rem .45rem", borderRadius: "8px", background: "#fee2e2", color: "#991b1b" }}>{f.sev}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM ROW */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>

                {/* Top Vehicles */}
                <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1.2rem", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem" }}>🏆 Top Vehicles by Revenue</span>
                        <span onClick={() => navigate("/reports")} style={{ fontSize: ".75rem", color: "#0d9488", fontWeight: 700, cursor: "pointer" }}>View →</span>
                    </div>
                    <div style={{ padding: ".6rem 1.2rem" }}>
                        {stats.topVehicles.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                                <div>🏆</div>
                                <p style={{ fontSize: ".8rem", marginTop: ".5rem" }}>No revenue data yet</p>
                            </div>
                        ) : stats.topVehicles.map((v, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: ".65rem", padding: ".5rem 0", borderBottom: i < stats.topVehicles.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                <span>{["🥇", "🥈", "🥉"][i]}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={plateStyle}>{v.plate}</div>
                                    <div style={{ fontSize: ".72rem", color: "#64748b", marginTop: "2px" }}>{v.owner}</div>
                                </div>
                                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".78rem", color: "#0f766e" }}>Rs.{v.amt?.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Low Wallets */}
                <div style={card}>
                    
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1.2rem", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem" }}>⚠️ Low Wallet Balance</span>
                        <span onClick={() => navigate("/billing")} style={{ fontSize: ".75rem", color: "#0d9488", fontWeight: 700, cursor: "pointer" }}>Top Up →</span>
                    </div>
                    <div style={{ padding: ".6rem 1.2rem" }}>
                        {stats.lowWallets.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                                <div>💚</div>
                                <p style={{ fontSize: ".8rem", marginTop: ".5rem" }}>All wallets are healthy</p>
                            </div>
                        ) : stats.lowWallets.map((w, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".55rem 0", borderBottom: i < stats.lowWallets.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                <div>
                                    <div style={plateStyle}>{w.plate}</div>
                                    <div style={{ fontSize: ".73rem", color: "#64748b", marginTop: "2px" }}>{w.owner}</div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                    <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".85rem", color: "#ef4444" }}>Rs.{w.balance}</span>
                                    <button onClick={() => navigate("/billing")} style={{ background: "#ccfbf1", color: "#0f766e", border: "none", padding: ".25rem .65rem", borderRadius: "7px", fontSize: ".72rem", fontWeight: 700, cursor: "pointer" }}>Top Up</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Parked Now */}
                <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1.2rem", borderBottom: "1px solid #e2e8f0" }}>
                        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".88rem" }}>🅿️ Currently Parked</span>
                        <span onClick={() => navigate("/logs")} style={{ fontSize: ".75rem", color: "#0d9488", fontWeight: 700, cursor: "pointer" }}>Logs →</span>
                    </div>
                    <div style={{ padding: ".6rem 1.2rem" }}>
                        {stats.parkedNow.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "1.5rem", color: "#94a3b8" }}>
                                <div>🅿️</div>
                                <p style={{ fontSize: ".8rem", marginTop: ".5rem" }}>No vehicles parked right now</p>
                            </div>
                        ) : stats.parkedNow.map((p, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".55rem 0", borderBottom: i < stats.parkedNow.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                <div>
                                    <div style={plateStyle}>{p.plate}</div>
                                    <div style={{ fontSize: ".73rem", color: "#64748b", marginTop: "2px" }}>{p.owner}</div>
                                </div>
                                <div style={{ fontSize: ".76rem", fontWeight: 700, color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }}></span>
                                    {p.duration}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
