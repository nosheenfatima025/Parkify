import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const API = "http://localhost:3000/api";
const TEAL = "#0d9488";
const COLORS = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899"];

export default function Reports() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState("30d");
    const [data, setData] = useState({
        kpis: { revenue: 0, sessions: 0, avgDuration: "0h 0m", occupancy: 0 },
        revenueChart: [],
        sessionsChart: [],
        vehicleTypes: [],
        topVehicles: [],
        walletDist: [],
        fraudTypes: [],
        monthlyTable: [],
        insights: []
    });
    const [revenueType, setRevenueType] = useState("bar");
    const [toast, setToast] = useState({ show: false, msg: "" });

    const showToast = (msg) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: "" }), 3000);
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const [logsRes, paymentsRes, vehiclesRes, walletsRes, fraudRes] = await Promise.all([
                fetch(`${API}/parking/logs`),
                fetch(`${API}/admin/payments`),
                fetch(`${API}/vehicles/all`),
                fetch(`${API}/wallet/all`),
                fetch(`${API}/fraud/all`)
            ]);

            const logs = await logsRes.json().catch(() => []);
            const payments = await paymentsRes.json().catch(() => []);
            const vehicles = await vehiclesRes.json().catch(() => []);
            const wallets = await walletsRes.json().catch(() => []);
            const frauds = await fraudRes.json().catch(() => []);

            const logsArr = Array.isArray(logs) ? logs : [];
            const paymentsArr = Array.isArray(payments) ? payments : [];
            const vehiclesArr = Array.isArray(vehicles) ? vehicles : [];
            const walletsArr = Array.isArray(wallets) ? wallets : [];
            const fraudsArr = Array.isArray(frauds) ? frauds : [];

            // ── Date range filter ──
            const now = new Date();
            const cutoff = new Date();
            if (range === "today") cutoff.setHours(0, 0, 0, 0);
            else if (range === "7d") cutoff.setDate(now.getDate() - 7);
            else if (range === "30d") cutoff.setDate(now.getDate() - 30);
            else if (range === "90d") cutoff.setDate(now.getDate() - 90);
            else cutoff.setFullYear(now.getFullYear(), 0, 1);

            const filteredPayments = paymentsArr.filter(p => new Date(p.createdAt) >= cutoff && p.status === "SUCCESS");
            const filteredLogs = logsArr.filter(l => new Date(l.entryTime) >= cutoff);

            // ── KPIs ──
            const totalRevenue = filteredPayments.reduce((s, p) => s + p.amount, 0);
            const totalSessions = filteredLogs.length;
            const completedLogs = filteredLogs.filter(l => l.exitTime);
            const avgMins = completedLogs.length > 0
                ? completedLogs.reduce((s, l) => s + (new Date(l.exitTime) - new Date(l.entryTime)) / 60000, 0) / completedLogs.length
                : 0;
            const avgDuration = `${Math.floor(avgMins / 60)}h ${Math.round(avgMins % 60)}m`;
            const currentlyParked = logsArr.filter(l => !l.exitTime).length;
            const occupancy = vehiclesArr.length > 0 ? Math.round((currentlyParked / vehiclesArr.length) * 100) : 0;

            // ── Revenue chart (group by date) ──
            const revenueMap = {};
            filteredPayments.forEach(p => {
                const d = new Date(p.createdAt).toLocaleDateString("en-PK", { month: "short", day: "numeric" });
                revenueMap[d] = (revenueMap[d] || 0) + p.amount;
            });
            const revenueChart = Object.entries(revenueMap)
                .sort((a, b) => new Date(a[0]) - new Date(b[0]))
                .slice(-14)
                .map(([date, revenue]) => ({ date, revenue }));

            // ── Sessions by weekday ──
            const dayMap = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
            filteredLogs.forEach(l => {
                const day = new Date(l.entryTime).toLocaleDateString("en-US", { weekday: "short" });
                if (dayMap[day] !== undefined) dayMap[day]++;
            });
            const sessionsChart = Object.entries(dayMap).map(([day, sessions]) => ({ day, sessions }));

            // ── Vehicle type split ──
            const typeMap = {};
            vehiclesArr.forEach(v => {
                const t = v.vehicleType || "Car";
                typeMap[t] = (typeMap[t] || 0) + 1;
            });
            const vehicleTypes = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

            // ── Top vehicles by revenue ──
            const vehicleRevMap = {};
            paymentsArr.filter(p => p.status === "SUCCESS").forEach(p => {
                const plate = p.vehicleId?.plateNumber || "Unknown";
                const name = p.userId?.name || "Unknown";
                vehicleRevMap[plate] = { plate, name, revenue: (vehicleRevMap[plate]?.revenue || 0) + p.amount };
            });
            const topVehicles = Object.values(vehicleRevMap)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 7);
            const maxRev = topVehicles[0]?.revenue || 1;
            topVehicles.forEach(v => v.pct = Math.round((v.revenue / maxRev) * 100));

            // ── Wallet distribution ──
            const wBuckets = { "< Rs.50": 0, "Rs.50–200": 0, "Rs.200–500": 0, "Rs.500–1k": 0, "> Rs.1k": 0 };
            walletsArr.forEach(w => {
                const b = w.balance;
                if (b < 50) wBuckets["< Rs.50"]++;
                else if (b < 200) wBuckets["Rs.50–200"]++;
                else if (b < 500) wBuckets["Rs.200–500"]++;
                else if (b < 1000) wBuckets["Rs.500–1k"]++;
                else wBuckets["> Rs.1k"]++;
            });
            const walletDist = Object.entries(wBuckets).map(([range, count]) => ({ range, count }));

            // ── Fraud types ──
            const fraudMap = {};
            fraudsArr.forEach(f => { fraudMap[f.alertType] = (fraudMap[f.alertType] || 0) + 1; });
            const fraudTypes = Object.entries(fraudMap).map(([name, value]) => ({ name, value }));

            // ── Monthly summary ──
            const monthMap = {};
            paymentsArr.filter(p => p.status === "SUCCESS").forEach(p => {
                const key = new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                if (!monthMap[key]) monthMap[key] = { month: key, sessions: 0, revenue: 0 };
                monthMap[key].revenue += p.amount;
                monthMap[key].sessions++;
            });
            const monthlyTable = Object.values(monthMap)
                .sort((a, b) => new Date(b.month) - new Date(a.month))
                .slice(0, 6);

            // ── Insights ──
            const lowWallets = walletsArr.filter(w => w.balance < 200).length;
            const topType = vehicleTypes.sort((a, b) => b.value - a.value)[0];
            const insights = [
                {
                    icon: "📈", color: "#ccfbf1",
                    title: revenueChart.length > 0 ? `Peak Revenue: Rs.${Math.max(...revenueChart.map(r => r.revenue)).toLocaleString()}` : "Revenue Tracking Active",
                    desc: `${filteredPayments.length} payments processed in the selected period.`
                },
                {
                    icon: "⚠️", color: "#fef3c7",
                    title: `${lowWallets} Wallet${lowWallets !== 1 ? "s" : ""} Below Rs.200`,
                    desc: lowWallets > 0 ? "These vehicles need a top-up to continue using the service." : "All wallets have sufficient balance."
                },
                {
                    icon: "🏆", color: "#ede9fe",
                    title: topType ? `Most Active: ${topType.name} (${Math.round((topType.value / Math.max(vehiclesArr.length, 1)) * 100)}%)` : "Vehicle Stats Loading",
                    desc: `${vehiclesArr.length} total registered vehicles in the system.`
                }
            ];

            setData({ kpis: { revenue: totalRevenue, sessions: totalSessions, avgDuration, occupancy }, revenueChart, sessionsChart, vehicleTypes, topVehicles, walletDist, fraudTypes, monthlyTable, insights });
        } catch (err) {
            console.error("Reports fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, [range]);

    const exportCSV = () => {
        const rows = [
            ["Month", "Sessions", "Revenue"],
            ...data.monthlyTable.map(m => [m.month, m.sessions, `Rs.${m.revenue}`])
        ];
        const csv = rows.map(r => r.join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `parkify-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        showToast("✅ CSV exported successfully!");
    };

    const card = { background: "white", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04)", overflow: "hidden" };
    const avatarColors = ["#0d9488", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899"];

    const CustomTooltipRevenue = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: ".6rem .9rem", boxShadow: "0 4px 12px rgba(0,0,0,.1)", fontSize: ".82rem" }}>
                <div style={{ fontWeight: 700, marginBottom: ".2rem" }}>{label}</div>
                <div style={{ color: TEAL, fontWeight: 700 }}>Rs.{payload[0].value?.toLocaleString()}</div>
            </div>
        );
    };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid #ccfbf1", borderTop: `4px solid ${TEAL}`, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: TEAL, fontWeight: 600 }}>Loading Reports & Analytics...</p>
        </div>
    );

    return (
        <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#0f172a" }}>

            {/* TOPBAR */}
            <div style={{ background: TEAL, height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>Reports & Analytics</span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
                    <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Logout</button>
                </div>
            </div>

            {/* PAGE HEADER */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <div style={{ fontSize: ".8rem", color: "#64748b", marginBottom: ".4rem" }}>Dashboard <span style={{ color: TEAL, fontWeight: 600 }}>› Reports</span></div>
                    <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>Reports & Analytics</h1>
                    <p style={{ color: "#64748b", fontSize: ".9rem", marginTop: ".25rem" }}>Comprehensive insights on parking activity, revenue and system performance</p>
                </div>
                <div style={{ display: "flex", gap: ".75rem" }}>
                    <button onClick={exportCSV} style={{ background: "white", color: "#64748b", border: "1.5px solid #e2e8f0", padding: ".65rem 1.2rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer" }}>
                        📊 Export CSV
                    </button>
                    <button onClick={() => window.print()} style={{ background: TEAL, color: "white", border: "none", padding: ".7rem 1.4rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(13,148,136,.25)" }}>
                        🖨️ Print Report
                    </button>
                </div>
            </div>

            {/* DATE RANGE */}
            <div style={{ background: "white", borderRadius: "14px", padding: ".9rem 1.3rem", display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,.05)", flexWrap: "wrap" }}>
                <span style={{ fontSize: ".82rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px" }}>Period:</span>
                <div style={{ display: "flex", gap: ".4rem" }}>
                    {[["today", "Today"], ["7d", "7 Days"], ["30d", "30 Days"], ["90d", "3 Months"], ["year", "This Year"]].map(([key, label]) => (
                        <button key={key} onClick={() => setRange(key)}
                            style={{ padding: ".4rem 1rem", borderRadius: "8px", border: "1.5px solid", borderColor: range === key ? TEAL : "#e2e8f0", background: range === key ? TEAL : "#fafafa", color: range === key ? "white" : "#64748b", fontFamily: "DM Sans,sans-serif", fontWeight: 600, fontSize: ".82rem", cursor: "pointer", boxShadow: range === key ? "0 2px 8px rgba(13,148,136,.25)" : "none" }}>
                            {label}
                        </button>
                    ))}
                </div>
                <button onClick={fetchReports} style={{ marginLeft: "auto", background: "#f0fdfa", color: TEAL, border: `1.5px solid #ccfbf1`, padding: ".4rem .9rem", borderRadius: "8px", fontFamily: "DM Sans,sans-serif", fontWeight: 700, fontSize: ".82rem", cursor: "pointer" }}>
                    🔄 Refresh
                </button>
            </div>

            {/* KPI CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                {[
                    { icon: "💰", val: `Rs.${data.kpis.revenue.toLocaleString()}`, label: "Total Revenue", sub: `${data.kpis.sessions} paid sessions`, color: "#d1fae5", accent: "#10b981" },
                    { icon: "🚗", val: data.kpis.sessions, label: "Total Sessions", sub: `Real database records`, color: "#ccfbf1", accent: TEAL },
                    { icon: "⏱️", val: data.kpis.avgDuration, label: "Avg Duration", sub: "Per completed session", color: "#fef3c7", accent: "#f59e0b" },
                    { icon: "🅿️", val: `${data.kpis.occupancy}%`, label: "Occupancy Rate", sub: "Currently parked vs total", color: "#ede9fe", accent: "#8b5cf6" },
                ].map((k, i) => (
                    <div key={i} style={{ ...card, padding: "1.4rem", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg,${k.accent},${k.accent}88)` }}></div>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: ".85rem" }}>
                            <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: k.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>{k.icon}</div>
                        </div>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.75rem", letterSpacing: "-.5px", lineHeight: 1 }}>{k.val}</div>
                        <div style={{ fontSize: ".8rem", color: "#64748b", marginTop: ".35rem" }}>{k.label}</div>
                        <div style={{ fontSize: ".75rem", color: "#94a3b8", marginTop: ".5rem", paddingTop: ".5rem", borderTop: "1px solid #f1f5f9" }}>{k.sub}</div>
                    </div>
                ))}
            </div>

            {/* INSIGHTS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                {data.insights.map((ins, i) => (
                    <div key={i} style={{ background: "white", borderRadius: "14px", padding: "1.1rem 1.3rem", boxShadow: "0 1px 3px rgba(0,0,0,.05)", display: "flex", alignItems: "flex-start", gap: ".8rem" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: ins.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", flexShrink: 0 }}>{ins.icon}</div>
                        <div>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".85rem" }}>{ins.title}</div>
                            <p style={{ fontSize: ".75rem", color: "#64748b", marginTop: ".25rem", lineHeight: 1.5 }}>{ins.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* EXPORT PANEL */}
            <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: "16px", padding: "1.75rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.25rem", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", right: "-40px", top: "-40px", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(13,148,136,.1)" }}></div>
                <div>
                    <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.1rem", color: "white" }}>📁 Export & Download Reports</h3>
                    <p style={{ color: "rgba(255,255,255,.55)", fontSize: ".82rem", marginTop: ".3rem" }}>Download detailed reports for record keeping and analysis</p>
                </div>
                <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
                    <button onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1.2rem", borderRadius: "10px", border: "none", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", background: "#d1fae5", color: "#065f46" }}>📊 Export CSV</button>
                    <button onClick={() => showToast("📄 PDF export coming soon!")} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1.2rem", borderRadius: "10px", border: "none", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", background: "#fee2e2", color: "#991b1b" }}>📄 Export PDF</button>
                    <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1.2rem", borderRadius: "10px", border: "1px solid rgba(255,255,255,.2)", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".85rem", cursor: "pointer", background: "rgba(255,255,255,.12)", color: "white" }}>🖨️ Print Report</button>
                </div>
            </div>

            {/* REVENUE CHART + VEHICLE TYPE */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={card}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.2rem 1.4rem .8rem", borderBottom: "1px solid #f8fafc" }}>
                        <div>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: TEAL, display: "inline-block" }}></span>
                                Revenue Over Time
                            </div>
                            <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "2px" }}>Daily revenue — real database data</div>
                        </div>
                        <div style={{ display: "flex", gap: ".35rem" }}>
                            {["bar", "line"].map(t => (
                                <button key={t} onClick={() => setRevenueType(t)}
                                    style={{ padding: ".3rem .75rem", borderRadius: "6px", border: "1px solid #e2e8f0", background: revenueType === t ? TEAL : "#fafafa", color: revenueType === t ? "white" : "#64748b", fontFamily: "DM Sans,sans-serif", fontWeight: 600, fontSize: ".75rem", cursor: "pointer", textTransform: "capitalize" }}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ padding: "1.1rem 1.4rem" }}>
                        {data.revenueChart.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                                <div style={{ fontSize: "2rem" }}>📊</div>
                                <p style={{ fontSize: ".85rem", marginTop: ".5rem" }}>No revenue data for selected period</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                {revenueType === "bar" ? (
                                    <BarChart data={data.revenueChart}>
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={v => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltipRevenue />} />
                                        <Bar dataKey="revenue" fill={TEAL} radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                ) : (
                                    <LineChart data={data.revenueChart}>
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tickFormatter={v => `Rs.${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip content={<CustomTooltipRevenue />} />
                                        <Line type="monotone" dataKey="revenue" stroke={TEAL} strokeWidth={2.5} dot={{ fill: TEAL, r: 3 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div style={card}>
                    <div style={{ padding: "1.2rem 1.4rem .8rem", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#8b5cf6", display: "inline-block" }}></span>
                            Vehicle Type Split
                        </div>
                        <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "2px" }}>Sessions by vehicle category</div>
                    </div>
                    <div style={{ padding: "1.1rem 1.4rem" }}>
                        {data.vehicleTypes.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontSize: ".85rem" }}>No vehicles registered yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={data.vehicleTypes} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name">
                                        {data.vehicleTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* SESSIONS + WALLET DIST */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={card}>
                    <div style={{ padding: "1.2rem 1.4rem .8rem", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", display: "inline-block" }}></span>
                            Daily Sessions
                        </div>
                        <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "2px" }}>Entries by day of week</div>
                    </div>
                    <div style={{ padding: "1.1rem 1.4rem" }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.sessionsChart}>
                                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="sessions" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={card}>
                    <div style={{ padding: "1.2rem 1.4rem .8rem", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                            Wallet Balance Distribution
                        </div>
                        <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "2px" }}>Vehicles by balance range</div>
                    </div>
                    <div style={{ padding: "1.1rem 1.4rem" }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.walletDist}>
                                <XAxis dataKey="range" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {data.walletDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TOP VEHICLES + MONTHLY TABLE */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>
                <div style={card}>
                    <div style={{ padding: "1.2rem 1.4rem .8rem", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span>
                            Top Vehicles by Revenue
                        </div>
                        <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "2px" }}>Highest spending vehicles</div>
                    </div>
                    <div style={{ padding: "1.1rem 1.4rem" }}>
                        {data.topVehicles.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontSize: ".85rem" }}>No payment data yet</div>
                        ) : (
                            data.topVehicles.map((v, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".6rem 0", borderBottom: i < data.topVehicles.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".8rem", color: ["#f59e0b", "#94a3b8", "#b45309"][i] || "#64748b", width: "20px", textAlign: "center" }}>
                                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `0${i + 1}`}
                                    </div>
                                    <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: avatarColors[i % avatarColors.length], display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: ".72rem", flexShrink: 0 }}>
                                        {v.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".78rem", padding: ".15rem .5rem", borderRadius: "5px", letterSpacing: "1px", display: "inline-block" }}>{v.plate}</div>
                                        <div style={{ fontSize: ".73rem", color: "#64748b", marginTop: "1px" }}>{v.name}</div>
                                    </div>
                                    <div style={{ width: "80px", height: "6px", background: "#f1f5f9", borderRadius: "10px", overflow: "hidden" }}>
                                        <div style={{ height: "100%", background: `linear-gradient(90deg,${TEAL},#0f766e)`, borderRadius: "10px", width: `${v.pct}%` }}></div>
                                    </div>
                                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".8rem", color: "#0f766e", minWidth: "60px", textAlign: "right" }}>Rs.{v.revenue.toLocaleString()}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div style={card}>
                    <div style={{ padding: "1.2rem 1.4rem .8rem", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                            Monthly Summary
                        </div>
                        <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "2px" }}>Month-by-month performance</div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        {data.monthlyTable.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8", fontSize: ".85rem" }}>No monthly data yet</div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "#f8fafc" }}>
                                        {["Month", "Sessions", "Revenue", "Status"].map(h => (
                                            <th key={h} style={{ padding: ".5rem .75rem", textAlign: "left", fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.monthlyTable.map((m, i) => {
                                        const prev = data.monthlyTable[i + 1];
                                        const trend = prev ? (m.revenue > prev.revenue ? "up" : m.revenue < prev.revenue ? "down" : "flat") : "up";
                                        return (
                                            <tr key={i} onMouseEnter={e => e.currentTarget.style.background = "#fafcff"} onMouseLeave={e => e.currentTarget.style.background = "white"}>
                                                <td style={{ padding: ".65rem .75rem", fontSize: ".83rem", fontWeight: i === 0 ? 700 : 400 }}>{m.month}</td>
                                                <td style={{ padding: ".65rem .75rem", fontSize: ".83rem" }}>{m.sessions.toLocaleString()}</td>
                                                <td style={{ padding: ".65rem .75rem", fontSize: ".83rem", fontWeight: 700 }}>Rs.{m.revenue.toLocaleString()}</td>
                                                <td style={{ padding: ".65rem .75rem" }}>
                                                    <span style={{ fontSize: ".7rem", fontWeight: 700, padding: ".18rem .55rem", borderRadius: "10px", background: trend === "up" ? "#d1fae5" : trend === "down" ? "#fee2e2" : "#fef3c7", color: trend === "up" ? "#065f46" : trend === "down" ? "#991b1b" : "#92400e" }}>
                                                        {trend === "up" ? "↑ Growth" : trend === "down" ? "↓ Decline" : "→ Stable"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* FRAUD TYPES */}
            {data.fraudTypes.length > 0 && (
                <div style={{ ...card, marginBottom: "1.25rem" }}>
                    <div style={{ padding: "1.2rem 1.4rem .8rem", borderBottom: "1px solid #f8fafc" }}>
                        <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".92rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
                            Fraud Alert Types
                        </div>
                        <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: "2px" }}>Distribution of fraud alert categories</div>
                    </div>
                    <div style={{ padding: "1.1rem 1.4rem" }}>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={data.fraudTypes} layout="vertical">
                                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                    {data.fraudTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast.show && (
                <div style={{ position: "fixed", bottom: "2rem", right: "2rem", background: TEAL, color: "white", padding: ".9rem 1.4rem", borderRadius: "12px", fontWeight: 600, fontSize: ".88rem", boxShadow: "0 8px 24px rgba(13,148,136,.35)", zIndex: 999 }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
