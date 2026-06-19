import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// const API = "http://localhost:3000/api";
const API = "http://192.168.1.5:3000/api";
export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [focused, setFocused] = useState("");
    const [toast, setToast] = useState({ show: false, msg: "", type: "error" });
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

    const showToast = (msg, type = "error") => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: "", type: "error" }), 4500);
    };

    const validate = () => {
        const e = {};
        if (!form.name.trim() || form.name.trim().length < 2) e.name = "Please enter your full name";
        if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email";
        if (!form.phone || !/^0[0-9]{10}$/.test(form.phone)) e.phone = "Enter 11-digit number starting with 0";
        if (!form.password || form.password.length < 6) e.password = "Password must be at least 6 characters";
        if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    phone: form.phone.trim(),
                    password: form.password,
                    plateNumber: "NONE",
                    vehicleType: "car",
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Registration failed");

            localStorage.setItem("parkify_token", data.token || "user-token");
            localStorage.setItem("parkify_role", "user");
            localStorage.setItem("parkify_user", JSON.stringify(data.user || { name: form.name }));
            showToast("Account created! Welcome to Parkify 🎉", "success");
            setTimeout(() => navigate("/dashboard"), 1000);
        } catch (err) {
            showToast(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inp = (f) => ({
        width: "100%",
        padding: ".82rem 1rem .82rem 3rem",
        background: focused === f ? "#fff" : (errors[f] ? "#fff5f5" : "#f8fafb"),
        border: `1.5px solid ${errors[f] ? "#fca5a5" : (focused === f ? "#0d9488" : "#e2eaf0")}`,
        borderRadius: "12px", color: "#0f172a",
        fontFamily: "'DM Sans', sans-serif", fontSize: ".93rem",
        outline: "none", transition: "all .22s", boxSizing: "border-box",
        boxShadow: focused === f ? "0 0 0 3.5px rgba(13,148,136,.13)" : (errors[f] ? "0 0 0 3px rgba(252,165,165,.15)" : "none"),
    });

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f0fdf9 0%,#ecfdf5 35%,#f0f9ff 70%,#f8fafc 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden", padding: "1.5rem" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
        @keyframes rotateSlow{to{transform:rotate(360deg)}}
        @keyframes pulseDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.4}}
        @keyframes slideCard{from{opacity:0;transform:translateY(40px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes orbFloat{0%,100%{transform:translate(0,0)}33%{transform:translate(20px,-15px)}66%{transform:translate(-15px,20px)}}
        @keyframes floatBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
        .reg-card{animation:slideCard .65s cubic-bezier(.22,1,.36,1) both}
        .reg-btn{transition:all .22s cubic-bezier(.22,1,.36,1)}
        .reg-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 30px rgba(13,148,136,.35)!important}
        .reg-btn:active:not(:disabled){transform:translateY(0) scale(.99)}
        .link-txt{transition:color .18s;cursor:pointer}
        .link-txt:hover{color:#0f766e!important;text-decoration:underline}
        .err-msg{color:#ef4444;font-size:.7rem;margin-top:.3rem}
        ::placeholder{color:#b0bec5;font-family:'DM Sans',sans-serif}
      `}</style>

            {/* Orbs */}
            <div style={{ position: "absolute", top: "-80px", left: "-80px", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle,rgba(13,148,136,.1) 0%,transparent 65%)", animation: "orbFloat 12s ease-in-out infinite", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-60px", right: "-60px", width: "350px", height: "350px", borderRadius: "50%", background: "radial-gradient(circle,rgba(52,211,153,.08) 0%,transparent 65%)", animation: "orbFloat 15s ease-in-out infinite 4s", pointerEvents: "none" }} />
            {[[8, 7, 14, 6], [15, 91, 10, 8], [72, 4, 14, 7], [82, 94, 12, 9], [40, 2, 8, 5]].map(([t, l, sz, d], i) => (
                <div key={i} style={{ position: "absolute", top: `${t}%`, left: `${l}%`, width: `${sz}px`, height: `${sz}px`, borderRadius: "50%", background: "rgba(13,148,136,.15)", animation: `floatBob ${d}s ease-in-out infinite ${i * .7}s`, pointerEvents: "none" }} />
            ))}
            <div style={{ position: "absolute", inset: 0, opacity: .025, pointerEvents: "none", backgroundImage: "linear-gradient(#0d9488 1px,transparent 1px),linear-gradient(90deg,#0d9488 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

            {/* Card */}
            <div className="reg-card" style={{ width: "100%", maxWidth: "440px", background: "rgba(255,255,255,.93)", backdropFilter: "blur(20px)", borderRadius: "24px", boxShadow: "0 4px 6px rgba(0,0,0,.04),0 20px 60px rgba(13,148,136,.1)", border: "1px solid rgba(255,255,255,.7)", overflow: "hidden", position: "relative", zIndex: 10, opacity: mounted ? 1 : 0, transition: "opacity .3s" }}>

                <div style={{ height: "3.5px", background: "linear-gradient(90deg,#0d9488,#34d399,#06b6d4,#34d399,#0d9488)", backgroundSize: "300% auto", animation: "shimmer 4s linear infinite" }} />

                <div style={{ padding: "2rem 2.5rem 2.5rem" }}>
                    {/* Brand */}
                    <div style={{ textAlign: "center", marginBottom: "1.6rem" }}>
                        <div style={{ position: "relative", display: "inline-block", marginBottom: ".9rem" }}>
                            <div style={{ position: "absolute", inset: "-5px", borderRadius: "50%", border: "2px dashed rgba(13,148,136,.2)", animation: "rotateSlow 12s linear infinite" }} />
                            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "linear-gradient(135deg,#0d9488,#065f57)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem", boxShadow: "0 8px 24px rgba(13,148,136,.3)" }}>🅿️</div>
                        </div>
                        <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-1px", color: "#0f172a", lineHeight: 1 }}>
                            Create your{" "}
                            <span style={{ background: "linear-gradient(135deg,#0d9488,#34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>account</span>
                        </h1>
                        <p style={{ color: "#64748b", fontSize: ".82rem", marginTop: ".35rem" }}>Join Parkify Smart Parking System</p>
                    </div>

                    {/* Fields */}
                    <div style={{ display: "flex", flexDirection: "column", gap: ".9rem" }}>

                        {/* Name */}
                        <div>
                            <label style={{ display: "block", fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: ".35rem" }}>Full Name</label>
                            <div style={{ position: "relative" }}>
                                <svg style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={focused === "name" ? "#0d9488" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} onFocus={() => setFocused("name")} onBlur={() => setFocused("")} placeholder="Ali Hassan" style={inp("name")} />
                            </div>
                            {errors.name && <p className="err-msg">⚠ {errors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{ display: "block", fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: ".35rem" }}>Email Address</label>
                            <div style={{ position: "relative" }}>
                                <svg style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={focused === "email" ? "#0d9488" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} onFocus={() => setFocused("email")} onBlur={() => setFocused("")} placeholder="ali@example.com" style={inp("email")} />
                            </div>
                            {errors.email && <p className="err-msg">⚠ {errors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                            <label style={{ display: "block", fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: ".35rem" }}>Phone Number</label>
                            <div style={{ position: "relative" }}>
                                <svg style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={focused === "phone" ? "#0d9488" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} onFocus={() => setFocused("phone")} onBlur={() => setFocused("")} placeholder="03001234567" maxLength={11} style={inp("phone")} />
                            </div>
                            {errors.phone && <p className="err-msg">⚠ {errors.phone}</p>}
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: "block", fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: ".35rem" }}>Password</label>
                            <div style={{ position: "relative" }}>
                                <svg style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={focused === "pass" ? "#0d9488" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                <input type={showPass ? "text" : "password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} onFocus={() => setFocused("pass")} onBlur={() => setFocused("")} placeholder="Minimum 6 characters" style={{ ...inp("password"), paddingRight: "3rem" }} />
                                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: ".85rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: ".2rem" }}>
                                    {showPass ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                                </button>
                            </div>
                            {errors.password && <p className="err-msg">⚠ {errors.password}</p>}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label style={{ display: "block", fontSize: ".7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: ".35rem" }}>Confirm Password</label>
                            <div style={{ position: "relative" }}>
                                <svg style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={focused === "confirm" ? "#0d9488" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                                <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} onFocus={() => setFocused("confirm")} onBlur={() => setFocused("")} onKeyDown={e => e.key === "Enter" && handleRegister()} placeholder="Repeat your password" style={{ ...inp("confirmPassword"), paddingRight: "3rem" }} />
                                <button onClick={() => setShowConfirm(!showConfirm)} style={{ position: "absolute", right: ".85rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: ".2rem" }}>
                                    {showConfirm ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="err-msg">⚠ {errors.confirmPassword}</p>}
                        </div>

                        {/* Button */}
                        <button className="reg-btn" onClick={handleRegister} disabled={loading}
                            style={{ width: "100%", padding: ".88rem", background: loading ? "rgba(13,148,136,.5)" : "linear-gradient(135deg,#0d9488,#0f766e)", border: "none", borderRadius: "12px", color: "white", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: ".96rem", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 4px 18px rgba(13,148,136,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: ".6rem", marginTop: ".2rem" }}>
                            {loading
                                ? <><div style={{ width: "18px", height: "18px", border: "2.5px solid rgba(255,255,255,.35)", borderTop: "2.5px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Registering Email…</>
                                : <>Register Email🎉</>
                            }
                        </button>

                        <p style={{ textAlign: "center", color: "#64748b", fontSize: ".85rem" }}>
                            Already have an account?{" "}
                            <span className="link-txt" onClick={() => navigate("/")} style={{ color: "#0d9488", fontWeight: 700 }}>Sign in</span>
                        </p>
                    </div>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", padding: ".8rem 2.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", background: "#fafcfc" }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulseDot 2s infinite" }} />
                    <span style={{ color: "#94a3b8", fontSize: ".72rem" }}>Parkify v1.0 · Secure Registration</span>
                </div>
            </div>

            {toast.show && (
                <div style={{ position: "fixed", top: "1.5rem", right: "1.5rem", zIndex: 9999, background: toast.type === "success" ? "linear-gradient(135deg,#059669,#047857)" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", padding: ".85rem 1.4rem", borderRadius: "14px", fontWeight: 600, fontSize: ".87rem", boxShadow: toast.type === "success" ? "0 8px 30px rgba(5,150,105,.45)" : "0 8px 30px rgba(239,68,68,.45)", display: "flex", alignItems: "center", gap: ".65rem", animation: "toastIn .35s cubic-bezier(.22,1,.36,1) both", maxWidth: "370px", border: "1px solid rgba(255,255,255,.2)" }}>
                    <span style={{ fontSize: "1.15rem" }}>{toast.type === "success" ? "✅" : "⚠️"}</span>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
