import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// const API = "https://fyp-dun-two.vercel.app/api";
const API = "http://localhost:3000/api";
export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, msg: "", type: "error" });

    const showToast = (msg, type = "error") => {
        setToast({ show: true, msg, type });
        setTimeout(() => setToast({ show: false, msg: "", type: "error" }), 3500);
    };

    const handleLogin = async () => {
        if (!email.trim()) { showToast("Please enter your email"); return; }
        if (!password.trim()) { showToast("Please enter your password"); return; }
        setLoading(true);
        try {
            // Try admin first
            const aRes = await fetch(`${API}/auth/admin/login`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const aData = await aRes.json();
            if (aRes.ok) {
                localStorage.setItem("parkify_token", aData.token);
                localStorage.setItem("parkify_role", "admin");
                localStorage.setItem("parkify_user", JSON.stringify(aData.admin || { name: "Admin" }));
                showToast("Welcome Admin! 🎉", "success");
                setTimeout(() => navigate("/dashboard"), 900);
                return;
            }

            // Try user
                    // const uRes = await fetch(`${API}/auth/admin/login`, {
                        const uRes = await fetch(`${API}/auth/user/login`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const uData = await uRes.json();
            if (uRes.ok) {
                localStorage.setItem("parkify_token", uData.token);
                localStorage.setItem("parkify_role", "user");
                localStorage.setItem("parkify_user", JSON.stringify(uData.user || { name: "User" }));
                showToast("Welcome back! 🌟", "success");
                setTimeout(() => navigate("/dashboard"), 900);
                return;
            }
            showToast(aData.message || uData.message || "Incorrect email or password.");
        } catch {
            showToast("Cannot reach server. Is backend running?");
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", background: "#f0fdf9", position: "relative", overflow: "hidden" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.1)} 66%{transform:translate(-20px,20px) scale(.95)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-30px,40px) scale(1.08)} 66%{transform:translate(30px,-20px) scale(.97)} }
        @keyframes blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,30px) scale(1.05)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes toastDrop { from{opacity:0;transform:translateX(-50%) translateY(-15px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(.7);opacity:.4} }

        .card { animation: fadeUp .6s cubic-bezier(.22,1,.36,1) both }
        .inp:focus { outline:none; border-color:#0d9488!important; box-shadow:0 0 0 4px rgba(13,148,136,.12)!important; background:#fff!important; }
        .btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 35px rgba(13,148,136,.4)!important; }
        .btn:active:not(:disabled) { transform:translateY(0); }
        .btn { transition:all .22s cubic-bezier(.22,1,.36,1); }
        ::placeholder { color:#b0c4c4; }
      `}</style>

            {/* Blobs */}
            <div style={{ position: "absolute", top: "-100px", left: "-100px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle,rgba(13,148,136,.15),transparent 65%)", animation: "blob1 12s ease-in-out infinite", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-80px", right: "-80px", width: "450px", height: "450px", borderRadius: "50%", background: "radial-gradient(circle,rgba(52,211,153,.12),transparent 65%)", animation: "blob2 15s ease-in-out infinite", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: "40%", right: "5%", width: "250px", height: "250px", borderRadius: "50%", background: "radial-gradient(circle,rgba(6,182,212,.08),transparent 65%)", animation: "blob3 9s ease-in-out infinite", pointerEvents: "none" }} />

            {/* Card */}
            <div className="card" style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "400px", margin: "1.5rem", background: "white", borderRadius: "28px", boxShadow: "0 4px 6px rgba(0,0,0,.03), 0 25px 70px rgba(13,148,136,.12)", border: "1px solid rgba(13,148,136,.08)", overflow: "hidden" }}>

                {/* Top shimmer bar */}
                <div style={{ height: "4px", background: "linear-gradient(90deg,#0d9488,#34d399,#06b6d4,#34d399,#0d9488)", backgroundSize: "200% auto", animation: "shimmer 3s linear infinite" }} />

                <div style={{ padding: "2.8rem 2.5rem 3rem" }}>

                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                        <div style={{ width: "70px", height: "70px", borderRadius: "20px", background: "linear-gradient(135deg,#0d9488,#065f57)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 1.2rem", boxShadow: "0 10px 30px rgba(13,148,136,.35)" }}>🅿️</div>
                        <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "2rem", letterSpacing: "-1.2px", color: "#0f172a" }}>
                            Welcome back
                        </h1>
                        <p style={{ color: "#94a3b8", fontSize: ".85rem", marginTop: ".3rem" }}>Sign in to Parkify</p>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: "1.1rem" }}>
                        <label style={{ display: "block", fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: ".45rem" }}>Email</label>
                        <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="your@email.com"
                            style={{ width: "100%", padding: ".85rem 1.1rem", background: "#f8fafb", border: "1.5px solid #e2eaf0", borderRadius: "14px", color: "#0f172a", fontFamily: "'DM Sans',sans-serif", fontSize: ".93rem", transition: "all .22s" }} />
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: "2rem" }}>
                        <label style={{ display: "block", fontSize: ".72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: ".45rem" }}>Password</label>
                        <div style={{ position: "relative" }}>
                            <input className="inp" type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter your password"
                                style={{ width: "100%", padding: ".85rem 3rem .85rem 1.1rem", background: "#f8fafb", border: "1.5px solid #e2eaf0", borderRadius: "14px", color: "#0f172a", fontFamily: "'DM Sans',sans-serif", fontSize: ".93rem", transition: "all .22s" }} />
                            <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: ".2rem" }}>
                                {showPass
                                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                }
                            </button>
                        </div>
                    </div>

                    {/* Button */}
                    <button className="btn" onClick={handleLogin} disabled={loading}
                        style={{ width: "100%", padding: ".95rem", background: loading ? "rgba(13,148,136,.4)" : "linear-gradient(135deg,#0d9488,#0f766e)", border: "none", borderRadius: "14px", color: "white", fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", boxShadow: "0 6px 22px rgba(13,148,136,.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: ".6rem" }}>
                        {loading
                            ? <><div style={{ width: "19px", height: "19px", border: "2.5px solid rgba(255,255,255,.3)", borderTop: "2.5px solid white", borderRadius: "50%", animation: "spin 1s linear infinite" }} />Signing in…</>
                            : <>Login →</>
                        }
                    </button>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", padding: ".75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: ".45rem", background: "#fafcfc" }}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", display: "inline-block", animation: "pulse 2s infinite" }} />
                    <span style={{ color: "#94a3b8", fontSize: ".7rem" }}>Parkify v1.0 · Secure Connection</span>
                </div>
            </div>

            {/* Toast */}
            {toast.show && (
                <div style={{ position: "fixed", top: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.type === "success" ? "linear-gradient(135deg,#059669,#047857)" : "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", padding: ".85rem 1.8rem", borderRadius: "50px", fontWeight: 600, fontSize: ".87rem", boxShadow: "0 8px 30px rgba(0,0,0,.2)", display: "flex", alignItems: "center", gap: ".6rem", animation: "toastDrop .3s cubic-bezier(.22,1,.36,1) both", whiteSpace: "nowrap" }}>
                    {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
                </div>
            )}
        </div>
    );
}
