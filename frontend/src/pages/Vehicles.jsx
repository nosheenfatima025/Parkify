import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:3000/api";
const avatarColors = ['#0d9488', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

export default function Vehicles() {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [toast, setToast] = useState("");
    const [stats, setStats] = useState({ total: 0, active: 0, parked: 0, lowBalance: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const PER_PAGE = 8;

    const getHeaders = () => {
const token = localStorage.getItem("parkify_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchVehicles = async () => {
        try {
            const headers = getHeaders();
            const [vRes, logRes] = await Promise.all([
                fetch(`${API}/vehicles/all`, { headers }),
                fetch(`${API}/parking/logs`, { headers })
            ]);
            const vData = await vRes.json();
            const logData = await logRes.json();

            const parkedPlates = new Set(
                Array.isArray(logData) ? logData.filter(l => l.status === "IN").map(l => l.vehicleId?.plateNumber) : []
            );

            const arr = Array.isArray(vData) ? vData : [];
            const enriched = arr.map(v => ({
                ...v,
                ownerName: v.userId?.name || "Unknown",
                ownerPhone: v.userId?.phone || "—",
                ownerEmail: v.userId?.email || "",
                status: !v.isActive ? "Inactive" : parkedPlates.has(v.plateNumber) ? "Parked" : "Active",
                registeredDate: new Date(v.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" })
            }));

            setVehicles(enriched);
            setFiltered(enriched);
            setStats({
                total: enriched.length,
                active: enriched.filter(v => v.status === "Active").length,
                parked: enriched.filter(v => v.status === "Parked").length,
                lowBalance: 0
            });
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVehicles(); }, []);

    useEffect(() => {
        let data = [...vehicles];
        if (search) {
            const q = search.toLowerCase();
            data = data.filter(v =>
                v.plateNumber?.toLowerCase().includes(q) ||
                v.ownerName?.toLowerCase().includes(q) ||
                v.ownerPhone?.includes(q)
            );
        }
        if (statusFilter) data = data.filter(v => v.status === statusFilter);
        setFiltered(data);
        setCurrentPage(1);
    }, [search, statusFilter, vehicles]);

    const initials = (name) => name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(""), 3000);
    };

    const deactivateVehicle = async (id) => {
        if (!confirm("Are you sure you want to deactivate this vehicle?")) return;
        try {
            await fetch(`${API}/vehicles/${id}/deactivate`, {
                method: "PUT",
                headers: getHeaders()
            });
            showToast("✅ Vehicle deactivated successfully");
            fetchVehicles();
        } catch (err) {
            showToast("❌ Failed to deactivate vehicle");
        }
    };

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

    const statusBadge = (status) => {
        const map = {
            Active: { bg: "#d1fae5", color: "#065f46", dot: "#10b981" },
            Parked: { bg: "#dbeafe", color: "#1e40af", dot: "#3b82f6" },
            Inactive: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" }
        };
        const s = map[status] || map.Active;
        return (
            <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem", padding: ".3rem .75rem", borderRadius: "20px", fontSize: ".76rem", fontWeight: 700, background: s.bg, color: s.color }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.dot, display: "inline-block" }}></span>
                {status}
            </span>
        );
    };

    const card = { background: "white", borderRadius: "14px", boxShadow: "0 1px 3px rgba(0,0,0,.05),0 4px 16px rgba(0,0,0,.05)", overflow: "hidden" };
    const plateStyle = { background: "#fffbeb", border: "1.5px solid #fcd34d", color: "#92400e", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".82rem", padding: ".3rem .75rem", borderRadius: "7px", letterSpacing: "1.5px", display: "inline-block" };

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh", flexDirection: "column", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", border: "4px solid #ccfbf1", borderTop: "4px solid #0d9488", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: "#0d9488", fontWeight: 600 }}>Loading Vehicles...</p>
        </div>
    );

    return (
        <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#0f172a" }}>
            <div style={{ background: "#0d9488", height: "64px", padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "12px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(13,148,136,.3)" }}>
                <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.4rem", color: "white" }}>Vehicles</span>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ color: "rgba(255,255,255,.85)", fontSize: ".9rem" }}>Admin Panel</span>
                    <button onClick={() => navigate("/")} style={{ background: "transparent", border: "2px solid white", color: "white", padding: ".35rem 1.1rem", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>Logout</button>
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <div style={{ fontSize: ".8rem", color: "#64748b", marginBottom: ".4rem" }}>
                        Dashboard <span style={{ color: "#0d9488", fontWeight: 600 }}>› Vehicles</span>
                    </div>
                    <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.8rem" }}>Vehicles</h1>
                    <p style={{ color: "#64748b", fontSize: ".9rem", marginTop: ".25rem" }}>Manage all registered vehicles in the system</p>
                </div>
                <button onClick={() => navigate("/register-vehicle")}
                    style={{ background: "#0d9488", color: "white", border: "none", padding: ".7rem 1.4rem", borderRadius: "10px", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: ".9rem", cursor: "pointer", display: "flex", alignItems: "center", gap: ".5rem", boxShadow: "0 4px 12px rgba(13,148,136,.25)" }}>
                    ➕ Register New Vehicle
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem", marginBottom: "1.75rem" }}>
                {[
                    { icon: "🚗", val: stats.total, label: "Total Vehicles", bg: "#ccfbf1" },
                    { icon: "✅", val: stats.active, label: "Active", bg: "#d1fae5" },
                    { icon: "🅿️", val: stats.parked, label: "Currently Parked", bg: "#fef3c7" },
                    { icon: "⚠️", val: stats.lowBalance, label: "Low Balance", bg: "#fee2e2" },
                ].map((s, i) => (
                    <div key={i} style={{ ...card, padding: "1.2rem 1.4rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.5rem", lineHeight: 1 }}>{s.val}</div>
                            <div style={{ fontSize: ".78rem", color: "#64748b", marginTop: ".2rem" }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ background: "white", borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,.05)", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                    <span style={{ position: "absolute", left: ".9rem", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by plate, owner, or contact…"
                        style={{ width: "100%", padding: ".6rem 1rem .6rem 2.4rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".9rem", outline: "none", background: "#fafafa", boxSizing: "border-box" }} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: ".6rem 1rem", border: "1.5px solid #e2e8f0", borderRadius: "9px", fontFamily: "DM Sans,sans-serif", fontSize: ".88rem", outline: "none", background: "#fafafa", cursor: "pointer" }}>
                    <option value="">All Status</option>
                    <option>Active</option>
                    <option>Parked</option>
                    <option>Inactive</option>
                </select>
                <button onClick={fetchVehicles} style={{ background: "#0d9488", color: "white", border: "none", padding: ".6rem 1.2rem", borderRadius: "9px", fontWeight: 600, cursor: "pointer", fontSize: ".88rem" }}>
                    🔄 Refresh
                </button>
            </div>

            <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
                        Registered Vehicles
                        <span style={{ background: "#ccfbf1", color: "#0f766e", fontSize: ".75rem", fontWeight: 700, padding: ".15rem .55rem", borderRadius: "20px" }}>{filtered.length} vehicles</span>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#94a3b8" }}>
                        <div style={{ fontSize: "3.5rem" }}>🚗</div>
                        <h3 style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, marginTop: ".75rem", color: "#0f172a" }}>No vehicles found</h3>
                        <p style={{ fontSize: ".88rem", marginTop: ".35rem" }}>
                            {vehicles.length === 0 ? "No vehicles registered yet." : "Try adjusting your search or filters."}
                        </p>
                        {vehicles.length === 0 && (
                            <button onClick={() => navigate("/register-vehicle")}
                                style={{ marginTop: "1rem", background: "#0d9488", color: "white", border: "none", padding: ".7rem 1.4rem", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}>
                                ➕ Register First Vehicle
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                    {["#", "Number Plate", "Owner", "Status", "Registered", "QR Code", "Actions"].map(h => (
                                        <th key={h} style={{ padding: ".75rem 1.2rem", textAlign: h === "Actions" || h === "QR Code" ? "center" : "left", fontSize: ".75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((v, i) => {
                                    const idx = (currentPage - 1) * PER_PAGE + i;
                                    const color = avatarColors[idx % avatarColors.length];
                                    return (
                                        <tr key={v._id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background .15s" }}
                                            onMouseEnter={e => e.currentTarget.style.background = "#fafcff"}
                                            onMouseLeave={e => e.currentTarget.style.background = "white"}>
                                            <td style={{ padding: ".9rem 1.2rem", color: "#64748b", fontWeight: 600 }}>{String(idx + 1).padStart(2, "0")}</td>
                                            <td style={{ padding: ".9rem 1.2rem" }}><span style={plateStyle}>{v.plateNumber}</span></td>
                                            <td style={{ padding: ".9rem 1.2rem" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: ".65rem" }}>
                                                    <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: ".85rem", flexShrink: 0 }}>{initials(v.ownerName)}</div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: ".88rem" }}>{v.ownerName}</div>
                                                        <div style={{ fontSize: ".76rem", color: "#64748b", marginTop: "1px" }}>{v.ownerPhone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: ".9rem 1.2rem" }}>{statusBadge(v.status)}</td>
                                            <td style={{ padding: ".9rem 1.2rem", color: "#64748b", fontSize: ".82rem" }}>{v.registeredDate}</td>
                                            <td style={{ padding: ".9rem 1.2rem", textAlign: "center" }}>
                                                <button onClick={() => setSelectedVehicle(v)}
                                                    style={{ background: "#ccfbf1", color: "#0f766e", border: "none", padding: ".35rem .7rem", borderRadius: "7px", fontSize: ".82rem", fontWeight: 600, cursor: "pointer" }}>
                                                    📱 View QR
                                                </button>
                                            </td>
                                            <td style={{ padding: ".9rem 1.2rem", textAlign: "center" }}>
                                                <div style={{ display: "flex", gap: ".4rem", justifyContent: "center" }}>
                                                    <button onClick={() => setSelectedVehicle(v)} title="View"
                                                        style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: "#eff6ff", color: "#3b82f6", cursor: "pointer", fontSize: ".9rem" }}>👁</button>
                                                    <button onClick={() => deactivateVehicle(v._id)} title="Deactivate"
                                                        style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: "#fee2e2", color: "#ef4444", cursor: "pointer", fontSize: ".9rem" }}>🗑</button>
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
                        <span>Showing {((currentPage - 1) * PER_PAGE) + 1}–{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length} vehicles</span>
                        <div style={{ display: "flex", gap: ".35rem" }}>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                style={{ width: "32px", height: "32px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600 }}>‹</button>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button key={i} onClick={() => setCurrentPage(i + 1)}
                                    style={{ width: "32px", height: "32px", borderRadius: "7px", border: `1.5px solid ${currentPage === i + 1 ? "#0d9488" : "#e2e8f0"}`, background: currentPage === i + 1 ? "#0d9488" : "white", color: currentPage === i + 1 ? "white" : "#0f172a", cursor: "pointer", fontWeight: 600 }}>
                                    {i + 1}
                                </button>
                            ))}
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                style={{ width: "32px", height: "32px", borderRadius: "7px", border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600 }}>›</button>
                        </div>
                    </div>
                )}
            </div>

            {selectedVehicle && (
                <div onClick={(e) => e.target === e.currentTarget && setSelectedVehicle(null)}
                    style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
                    <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "480px", boxShadow: "0 25px 60px rgba(0,0,0,.2)" }}>
                        <div style={{ padding: "1.4rem 1.75rem 1rem", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.1rem" }}>Vehicle Details</h2>
                            <button onClick={() => setSelectedVehicle(null)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", background: "#f1f5f9", cursor: "pointer", fontSize: "1rem" }}>✕</button>
                        </div>
                        <div style={{ padding: "1.5rem 1.75rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: ".85rem", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #e2e8f0" }}>
                                <div style={{ width: "46px", height: "46px", borderRadius: "50%", background: "#0d9488", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "1rem" }}>{initials(selectedVehicle.ownerName)}</div>
                                <div>
                                    <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: "1.05rem" }}>{selectedVehicle.ownerName}</div>
                                    <div style={{ fontSize: ".8rem", color: "#64748b" }}>{selectedVehicle.ownerPhone}{selectedVehicle.ownerEmail ? " · " + selectedVehicle.ownerEmail : ""}</div>
                                </div>
                                <div style={{ marginLeft: "auto" }}>{statusBadge(selectedVehicle.status)}</div>
                            </div>
                            {[
                                ["Number Plate", <span style={plateStyle}>{selectedVehicle.plateNumber}</span>],
                                ["Status", statusBadge(selectedVehicle.status)],
                                ["Registered On", selectedVehicle.registeredDate],
                            ].map(([label, val]) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".65rem 0", borderBottom: "1px solid #f8fafc", fontSize: ".88rem" }}>
                                    <span style={{ color: "#64748b", fontWeight: 500 }}>{label}</span>
                                    <span style={{ fontWeight: 600 }}>{val}</span>
                                </div>
                            ))}
                            <div style={{ background: "#f0fdfa", border: "2px dashed #0d9488", borderRadius: "12px", padding: "1.25rem", textAlign: "center", marginTop: "1rem" }}>
                                {selectedVehicle.qrCode ? (
                                    <img src={selectedVehicle.qrCode} alt="QR Code" style={{ width: "120px", height: "120px", borderRadius: "8px" }} />
                                ) : (
                                    <div style={{ fontSize: "4rem" }}>📱</div>
                                )}
                                <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "3px", color: "#0f766e", marginTop: ".4rem" }}>{selectedVehicle.plateNumber}</div>
                                <div style={{ fontSize: ".75rem", color: "#64748b", marginTop: ".25rem" }}>Scan this QR at entry/exit gate</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div style={{ position: "fixed", top: "80px", right: "2rem", background: "#0d9488", color: "white", padding: ".9rem 1.4rem", borderRadius: "12px", fontWeight: 600, fontSize: ".88rem", boxShadow: "0 8px 24px rgba(13,148,136,.35)", zIndex: 999 }}>
                    {toast}
                </div>
            )}
        </div>
    );
}