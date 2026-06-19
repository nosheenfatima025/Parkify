import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const avatarColors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];
const API = "http://localhost:3000/api";
export default function WalletBilling() {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [wallets, setWallets] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [stats, setStats] = useState({ totalBalance: 0, todayRevenue: 0, lowBalance: 0, totalTxns: 0 });
    const [topupForm, setTopupForm] = useState({ plateNumber: "", amount: "", method: "Cash" });
    const [topupLoading, setTopupLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
    const [showModal, setShowModal] = useState(false);
    const [modalSuccess, setModalSuccess] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const PER_PAGE = 10;

    const showToast = (msg, type = "success") => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
    };

    const fetchData = async () => {
        try {
            const [pRes, wRes, vRes] = await Promise.all([
                fetch(`${API}/admin/payments`),
                fetch(`${API}/wallet/all`),
                fetch(`${API}/vehicles/all`)
            ]);
            const pData = await pRes.json();
            const wData = await wRes.json();
            const vData = await vRes.json();

            setPayments(Array.isArray(pData) ? pData : []);
            setWallets(Array.isArray(wData) ? wData : []);
            setVehicles(Array.isArray(vData) ? vData : []);

            // Stats
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const todayPayments = (Array.isArray(pData) ? pData : []).filter(p => new Date(p.createdAt) >= today && p.status === "SUCCESS");
            const todayRevenue = todayPayments.reduce((s, p) => s + p.amount, 0);
            const totalBalance = (Array.isArray(wData) ? wData : []).reduce((s, w) => s + w.balance, 0);
            const lowBalance = (Array.isArray(wData) ? wData : []).filter(w => w.balance < 200).length;

            setStats({
                totalBalance,
                todayRevenue,
                lowBalance,
                totalTxns: Array.isArray(pData) ? pData.length : 0
            });
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let data = [...payments];
        if (search) {
            const q = search.toLowerCase();
            data = data.filter(p =>
                p.vehicleId?.plateNumber?.toLowerCase().includes(q) ||
                p.userId?.name?.toLowerCase().includes(q)
            );
        }
        if (typeFilter) data = data.filter(p => p.method === typeFilter);
        setFiltered(data);
        setCurrentPage(1);
    }, [search, typeFilter, payments]);

    const initials = (name) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";

    const formatDate = (iso) => {
        const d = new Date(iso);
        return {
            time: d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" }),
            date: d.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })
        };
    };

    const handleTopUp = async () => {
        if (!topupForm.plateNumber || !topupForm.amount || topupForm.amount < 50) {
            showToast("❌ Select vehicle and enter min Rs.50", "error"); return;
        }
        setTopupLoading(true);
        try {
            const res = await fetch(`${API}/wallet/topup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plateNumber: topupForm.plateNumber, amount: Number(topupForm.amount) })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setModalSuccess({ plate: topupForm.plateNumber, amount: topupForm.amount });
            setTimeout(() => { setShowModal(false); setModalSuccess(null); fetchData(); }, 2500);
            showToast(`✅ Rs.${topupForm.amount} added to ${topupForm.plateNumber}`);
            setTopupForm({ plateNumber: "", amount: "", method: "Cash" });
        } catch (err) {
            showToast("❌ " + err.message, "error");
        } finally {
            setTopupLoading(false);
        }
    };

    const lowBalanceVehicles = wallets
        .filter(w => w.balance < 200)
        .map(w => {
            const v = vehicles.find(v => v.userId?._id === w.userId?._id || v.userId === w.userId?._id);
            return { plate: v?.plateNumber || "Unknown", owner: w.userId?.name || "Unknown", balance: w.balance };
        })
        .filter(w => w.plate !== "Unknown");

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    const card = { background: "white", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.04)", overflow: "hidden" };
    const plateStyle = { background: "#fffbeb", border: "1.5px solid #fcd34d", color: "#92400e", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".76rem", padding: ".2rem .6rem", borderRadius: "6px", letterSpacing: "1px", display: "inline-block" };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid #ccfbf1", borderTop: "4px solid #0d9488", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: "#0d9488", fontWeight: 600 }}>Loading Wallet & Billing...</p>
        </div>
    );

    return (
        <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#0f172a" }}>

            {/* TOPBAR */}
            <div style={{ background: "#0d9488", height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>Wallet & Billing</span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
                    <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Logout</button>
                </div>
            </div>

            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <div style={{ fontSize: ".8rem", color: "#64748b", marginBottom: ".4rem" }}>Dashboard <span style={{ color: "#0d9488", fontWeight: 600 }}>› Wallet & Billing</span></div>
                    <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>Wallet & Billing</h1>
                    <p style={{ color: "#64748b", fontSize: ".9rem", marginTop: ".25rem" }}>Manage wallet balances, top-ups and billing transactions</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    style={{ background: "#0d9488", color: "white", border: "none", padding: ".7rem 1.4rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 12px rgba(13,148,136,.25)" }}>
                    ➕ Top Up Wallet
                </button>
            </div>

            {/* STATS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
                {[
                    { icon: "💰", val: `Rs.${stats.totalBalance.toLocaleString()}`, label: "Total Wallet Balance", bg: "#ccfbf1" },
                    { icon: "📈", val: `Rs.${stats.todayRevenue.toLocaleString()}`, label: "Revenue Today", bg: "#d1fae5" },
                    { icon: "⚠️", val: stats.lowBalance, label: "Low Balance Vehicles", bg: "#fef3c7" },
                    { icon: "🔄", val: stats.totalTxns, label: "Total Transactions", bg: "#ede9fe" },
                ].map((s, i) => (
                    <div key={i} style={{ ...card, padding: "1.2rem 1.4rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.35rem", lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: ".2rem" }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* TWO COL */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.25rem" }}>

                {/* LEFT */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* LOW BALANCE ALERT */}
                    {lowBalanceVehicles.length > 0 && (
                        <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: "12px", padding: ".85rem 1.1rem", display: "flex", alignItems: "flex-start", gap: ".75rem" }}>
                            <span style={{ fontSize: "1.2rem" }}>🔔</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: ".85rem", color: "#92400e" }}>
                                    {lowBalanceVehicles.length} vehicle{lowBalanceVehicles.length > 1 ? "s" : ""} have low wallet balance (below Rs.200)
                                </div>
                                <div style={{ fontSize: ".75rem", color: "#b45309", marginTop: "2px" }}>
                                    {lowBalanceVehicles.map(v => v.plate).join(", ")} — top up required for parking entry
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRANSACTION TABLE */}
                    <div style={card}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: ".75rem" }}>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".95rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                                Transaction History
                                <span style={{ background: "#ccfbf1", color: "#0f766e", fontSize: ".72rem", fontWeight: 700, padding: ".15rem .55rem", borderRadius: "20px" }}>{filtered.length} transactions</span>
                            </div>
                            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: ".85rem" }}>🔍</span>
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plate or owner…"
                                        style={{ padding: ".55rem .9rem .55rem 2.2rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontFamily: "DM Sans,sans-serif", fontSize: ".85rem", outline: "none", background: "#fafafa", width: "200px" }} />
                                </div>
                                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                                    style={{ padding: ".55rem .9rem", border: "1.5px solid #e2e8f0", borderRadius: "8px", fontFamily: "DM Sans,sans-serif", fontSize: ".82rem", outline: "none", background: "#fafafa", cursor: "pointer" }}>
                                    <option value="">All Methods</option>
                                    <option value="WALLET">Wallet</option>
                                    <option value="MANUAL">Manual</option>
                                </select>
                                <button onClick={fetchData} style={{ background: "#0d9488", color: "white", border: "none", padding: ".55rem 1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer", fontSize: ".82rem" }}>🔄</button>
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "3rem 2rem", color: "#94a3b8" }}>
                                <div style={{ fontSize: "3rem" }}>💳</div>
                                <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, marginTop: ".6rem", color: "#0f172a" }}>No transactions found</h3>
                                <p style={{ fontSize: ".85rem", marginTop: ".3rem" }}>
                                    {payments.length === 0 ? "No transactions yet. Transactions appear after vehicle exits." : "Try adjusting your filters."}
                                </p>
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc" }}>
                                            {["Transaction", "Vehicle", "Owner", "Date & Time", "Amount", "Status"].map(h => (
                                                <th key={h} style={{ padding: ".7rem 1.1rem", textAlign: "left", fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((p, i) => {
                                            const color = avatarColors[i % avatarColors.length];
                                            const { time, date } = formatDate(p.createdAt);
                                            const ownerName = p.userId?.name || "Unknown";
                                            const plate = p.vehicleId?.plateNumber || "Unknown";
                                            return (
                                                <tr key={p._id} style={{ borderBottom: "1px solid #f1f5f9" }}
                                                    onMouseEnter={e => e.currentTarget.style.background = "#fafcff"}
                                                    onMouseLeave={e => e.currentTarget.style.background = "white"}>
                                                    <td style={{ padding: ".82rem 1.1rem" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: ".65rem" }}>
                                                            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".9rem", flexShrink: 0 }}>🅿️</div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: ".86rem" }}>Parking Fee</div>
                                                                <div style={{ fontSize: ".72rem", color: "#64748b", marginTop: "1px" }}>{p._id?.slice(-8).toUpperCase()}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: ".82rem 1.1rem" }}><span style={plateStyle}>{plate}</span></td>
                                                    <td style={{ padding: ".82rem 1.1rem" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                                                            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: ".75rem", flexShrink: 0 }}>{initials(ownerName)}</div>
                                                            <span style={{ fontWeight: 600, fontSize: ".85rem" }}>{ownerName}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: ".82rem 1.1rem" }}>
                                                        <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{time}</div>
                                                        <div style={{ fontSize: ".72rem", color: "#64748b" }}>{date}</div>
                                                    </td>
                                                    <td style={{ padding: ".82rem 1.1rem" }}>
                                                        <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".95rem", color: "#ef4444" }}>− Rs.{p.amount?.toLocaleString()}</span>
                                                    </td>
                                                    <td style={{ padding: ".82rem 1.1rem" }}>
                                                        <span style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", padding: ".25rem .65rem", borderRadius: "20px", fontSize: ".72rem", fontWeight: 700, background: p.status === "SUCCESS" ? "#d1fae5" : p.status === "FAILED" ? "#fee2e2" : "#fef3c7", color: p.status === "SUCCESS" ? "#065f46" : p.status === "FAILED" ? "#991b1b" : "#92400e" }}>
                                                            {p.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* PAGINATION */}
                        {totalPages > 1 && (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".9rem 1.4rem", borderTop: "1px solid #e2e8f0", fontSize: ".8rem", color: "#64748b" }}>
                                <span>Showing {((currentPage - 1) * PER_PAGE) + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length}</span>
                                <div style={{ display: "flex", gap: ".3rem" }}>
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        style={{ width: "30px", height: "30px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600 }}>‹</button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                                        <button key={i} onClick={() => setCurrentPage(i + 1)}
                                            style={{ width: "30px", height: "30px", borderRadius: "7px", border: `1.5px solid ${currentPage === i + 1 ? "#0d9488" : "#e2e8f0"}`, background: currentPage === i + 1 ? "#0d9488" : "white", color: currentPage === i + 1 ? "white" : "#0f172a", cursor: "pointer", fontWeight: 600 }}>
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                        style={{ width: "30px", height: "30px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600 }}>›</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                    {/* WALLET OVERVIEW CARD */}
                    <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", borderRadius: "14px", padding: "1.5rem", position: "relative", overflow: "hidden" }}>
                        <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px" }}>System Total Balance</div>
                        <div style={{ color: "white", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "2rem", margin: ".4rem 0" }}>Rs.{stats.totalBalance.toLocaleString()}</div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.8)", padding: ".25rem .7rem", borderRadius: "6px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".78rem" }}>
                            💳 {wallets.length} Active Wallets
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem" }}>
                            {[["Rs." + stats.todayRevenue.toLocaleString(), "Today's Revenue"], [stats.totalTxns, "Transactions"], [stats.lowBalance, "Low Balance"]].map(([v, l], i) => (
                                <React.Fragment key={i}>
                                    <div style={{ textAlign: "center" }}>
                                        <div style={{ color: "white", fontWeight: 700, fontSize: ".95rem" }}>{v}</div>
                                        <div style={{ color: "rgba(255,255,255,.45)", fontSize: ".7rem", marginTop: "2px" }}>{l}</div>
                                    </div>
                                    {i < 2 && <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,.1)" }}></div>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* QUICK TOP UP */}
                    <div style={card}>
                        <div style={{ padding: "1rem 1.4rem", borderBottom: "1px solid #e2e8f0" }}>
                            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".95rem" }}>➕ Quick Top Up</span>
                        </div>
                        <div style={{ padding: "1.4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                            <div>
                                <label style={{ fontSize: ".75rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".3px", display: "block", marginBottom: ".4rem" }}>Select Vehicle</label>
                                <select value={topupForm.plateNumber} onChange={e => setTopupForm({ ...topupForm, plateNumber: e.target.value })}
                                    style={{ width: "100%", padding: ".65rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".9rem", outline: "none", background: "#fafafa" }}>
                                    <option value="">— Choose Vehicle —</option>
                                    {vehicles.map(v => {
                                        const w = wallets.find(w => w.userId?._id === v.userId?._id || w.userId === v.userId);
                                        const bal = w?.balance ?? 0;
                                        return (
                                            <option key={v._id} value={v.plateNumber}>
                                                {v.plateNumber} — {v.userId?.name || "Unknown"} (Rs.{bal}) {bal < 200 ? "⚠️" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: ".75rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".3px", display: "block", marginBottom: ".4rem" }}>Amount (Rs.)</label>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>💵</span>
                                    <input type="number" value={topupForm.amount} onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })}
                                        placeholder="Enter amount" min="50"
                                        style={{ width: "100%", padding: ".65rem 1rem .65rem 2.3rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".9rem", outline: "none", background: "#fafafa", boxSizing: "border-box" }} />
                                </div>
                            </div>

                            {/* Quick amounts */}
                            <div>
                                <div style={{ fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".3px", marginBottom: ".5rem" }}>Quick Amounts</div>
                                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                                    {[100, 200, 500, 1000].map(amt => (
                                        <button key={amt} onClick={() => setTopupForm({ ...topupForm, amount: amt })}
                                            style={{ background: "#f0fdfa", color: "#0f766e", border: "1.5px solid #ccfbf1", padding: ".4rem .9rem", borderRadius: "20px", fontSize: ".8rem", fontWeight: 700, cursor: "pointer" }}>
                                            Rs.{amt.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: ".75rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: ".3px", display: "block", marginBottom: ".4rem" }}>Payment Method</label>
                                <select value={topupForm.method} onChange={e => setTopupForm({ ...topupForm, method: e.target.value })}
                                    style={{ width: "100%", padding: ".65rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".9rem", outline: "none", background: "#fafafa" }}>
                                    <option>Cash</option>
                                    <option>EasyPaisa</option>
                                    <option>JazzCash</option>
                                    <option>Bank Transfer</option>
                                    <option>Card</option>
                                </select>
                            </div>

                            <button onClick={handleTopUp} disabled={topupLoading}
                                style={{ background: topupLoading ? "#94a3b8" : "linear-gradient(135deg,#0d9488,#0f766e)", color: "white", border: "none", padding: ".75rem 1.5rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: topupLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(13,148,136,.3)" }}>
                                {topupLoading ? "⏳ Processing..." : "💳 Add Balance"}
                            </button>
                        </div>
                    </div>

                    {/* LOW BALANCE LIST */}
                    {lowBalanceVehicles.length > 0 && (
                        <div style={card}>
                            <div style={{ padding: ".9rem 1.2rem", borderBottom: "1px solid #e2e8f0" }}>
                                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem" }}>⚠️ Low Balance Vehicles</span>
                            </div>
                            <div style={{ padding: ".6rem 1.2rem" }}>
                                {lowBalanceVehicles.slice(0, 5).map((v, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".55rem 0", borderBottom: i < lowBalanceVehicles.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                        <div>
                                            <span style={plateStyle}>{v.plate}</span>
                                            <div style={{ fontSize: ".73rem", color: "#64748b", marginTop: "2px" }}>{v.owner}</div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".85rem", color: "#ef4444" }}>Rs.{v.balance}</span>
                                            <button onClick={() => { setTopupForm({ ...topupForm, plateNumber: v.plate }); setShowModal(true); }}
                                                style={{ background: "#ccfbf1", color: "#0f766e", border: "none", padding: ".25rem .65rem", borderRadius: "7px", fontSize: ".72rem", fontWeight: 700, cursor: "pointer" }}>Top Up</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* TOP UP MODAL */}
            {showModal && (
                <div onClick={e => e.target === e.currentTarget && setShowModal(false)}
                    style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "460px", boxShadow: "0 25px 60px rgba(0,0,0,.2)" }}>
                        {modalSuccess ? (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2.5rem", textAlign: "center" }}>
                                <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "linear-gradient(135deg,#0d9488,#0f766e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", marginBottom: "1rem", boxShadow: "0 8px 24px rgba(13,148,136,.3)" }}>✅</div>
                                <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.2rem", color: "#0d9488" }}>Top Up Successful!</h3>
                                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem", color: "#0d9488", margin: ".5rem 0" }}>Rs.{modalSuccess.amount}</div>
                                <p style={{ color: "#64748b", fontSize: ".88rem" }}>Added to {modalSuccess.plate}</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ padding: "1.3rem 1.6rem .9rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.05rem" }}>Top Up Wallet</h2>
                                    <button onClick={() => setShowModal(false)} style={{ width: "30px", height: "30px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: "1rem" }}>✕</button>
                                </div>
                                <div style={{ padding: "1.5rem 1.6rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    <div>
                                        <label style={{ fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: ".4rem" }}>Select Vehicle</label>
                                        <select value={topupForm.plateNumber} onChange={e => setTopupForm({ ...topupForm, plateNumber: e.target.value })}
                                            style={{ width: "100%", padding: ".65rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".9rem", outline: "none" }}>
                                            <option value="">— Choose Vehicle —</option>
                                            {vehicles.map(v => {
                                                const w = wallets.find(w => w.userId?._id === v.userId?._id);
                                                return <option key={v._id} value={v.plateNumber}>{v.plateNumber} — {v.userId?.name || "Unknown"} (Rs.{w?.balance ?? 0})</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: ".75rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: ".4rem" }}>Amount (Rs.)</label>
                                        <div style={{ position: "relative" }}>
                                            <span style={{ position: "absolute", left: ".85rem", top: "50%", transform: "translateY(-50%)" }}>💵</span>
                                            <input type="number" value={topupForm.amount} onChange={e => setTopupForm({ ...topupForm, amount: e.target.value })}
                                                placeholder="0" min="50"
                                                style={{ width: "100%", padding: ".85rem 1rem .85rem 2.5rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.5rem", textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: ".5rem", justifyContent: "center", flexWrap: "wrap" }}>
                                        {[100, 200, 500, 1000, 2000].map(amt => (
                                            <button key={amt} onClick={() => setTopupForm({ ...topupForm, amount: amt })}
                                                style={{ background: "#f1f5f9", color: "#0f172a", border: "none", padding: ".45rem 1rem", borderRadius: "20px", fontSize: ".82rem", fontWeight: 700, cursor: "pointer" }}>
                                                Rs.{amt.toLocaleString()}
                                            </button>
                                        ))}
                                    </div>
                                    {topupForm.plateNumber && topupForm.amount > 0 && (
                                        <div style={{ fontSize: ".78rem", color: "#64748b", textAlign: "center" }}>
                                            Rs.{Number(topupForm.amount).toLocaleString()} will be added to {topupForm.plateNumber}
                                        </div>
                                    )}
                                    <button onClick={handleTopUp} disabled={topupLoading}
                                        style={{ background: topupLoading ? "#94a3b8" : "linear-gradient(135deg,#0d9488,#0f766e)", color: "white", border: "none", padding: ".85rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".95rem", cursor: topupLoading ? "not-allowed" : "pointer", boxShadow: "0 4px 14px rgba(13,148,136,.3)" }}>
                                        {topupLoading ? "⏳ Processing..." : "✅ Confirm Top Up"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast.show && (
                <div style={{ position: "fixed", top: "80px", right: "2rem", background: toast.type === "error" ? "#ef4444" : "#10b981", color: "white", padding: "1rem 1.5rem", borderRadius: "12px", fontWeight: 600, fontSize: ".9rem", boxShadow: "0 8px 24px rgba(0,0,0,.2)", zIndex: 999 }}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
