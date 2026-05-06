import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { connexion } = useAuth();
  const navigate      = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setLoading(true);
    try {
      const response = await fetch("http://localhost/eduschedule-pro/backend/api/auth/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Erreur de connexion");
      connexion(data.token, data.utilisateur);
      navigate("/");
    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Panneau gauche */}
      <div style={{
        width: "45%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "3rem",
        position: "relative",
        overflow: "hidden"
      }} className="d-none d-md-flex">

        {/* Cercles décoratifs */}
        <div style={{
          position: "absolute", width: 400, height: 400,
          borderRadius: "50%", top: -100, left: -100,
          background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.15)"
        }} />
        <div style={{
          position: "absolute", width: 300, height: 300,
          borderRadius: "50%", bottom: -50, right: -50,
          background: "rgba(154,117,234,0.08)", border: "1px solid rgba(154,117,234,0.15)"
        }} />

        {/* Logo */}
        <div style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(10px)",
          borderRadius: 20,
          padding: "20px 30px",
          marginBottom: 30,
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <img src="/logo-isge.png" alt="ISGE" style={{ width: 160 }} />
        </div>

        <h1 style={{
          color: "white",
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: "2rem",
          textAlign: "center",
          marginBottom: 10,
          textShadow: "0 2px 10px rgba(0,0,0,0.3)"
        }}>EduSchedule Pro</h1>

        <p style={{
          color: "rgba(255,255,255,0.6)",
          textAlign: "center",
          fontSize: "0.9rem",
          marginBottom: 40,
          maxWidth: 300
        }}>
          Système Intégré de Gestion de l'Emploi du Temps et de Suivi Pédagogique
        </p>

        {/* Features */}
        {[
          { icon: "📅", text: "Gestion des emplois du temps" },
          { icon: "📱", text: "Pointage QR-Code sécurisé" },
          { icon: "📋", text: "Cahier de texte numérique" },
          { icon: "💰", text: "Fiches de vacation automatiques" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 15,
            marginBottom: 16,
            width: "100%",
            maxWidth: 320,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 12,
            padding: "12px 18px",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(5px)"
          }}>
            <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", fontWeight: 500 }}>
              {item.text}
            </span>
          </div>
        ))}
      </div>

      {/* Panneau droit — Formulaire */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}>
        <div style={{
          background: "rgba(255,255,255,0.97)",
          borderRadius: 24,
          padding: "2.5rem",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.2)"
        }}>
          {/* Logo mobile */}
          <div className="d-md-none text-center mb-4">
            <img src="/logo-isge.png" alt="ISGE" style={{ width: 100 }} />
          </div>

          {/* Titre */}
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: "1.75rem",
              color: "#1a1a2e",
              marginBottom: 8
            }}>Bienvenue 👋</h2>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>
              Connectez-vous à votre espace pédagogique
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{
                display: "block",
                fontWeight: 600,
                fontSize: "0.75rem",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 6
              }}>Adresse email</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%",
                  transform: "translateY(-50%)", fontSize: "1rem"
                }}>✉️</span>
                <input
                  type="email"
                  placeholder="vous@isge.bf"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "0.75rem 0.75rem 0.75rem 2.75rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: 10,
                    fontSize: "0.875rem",
                    outline: "none",
                    transition: "all 0.2s",
                    background: "#fafafa"
                  }}
                  onFocus={e => e.target.style.borderColor = "#1a56db"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{
                display: "block",
                fontWeight: 600,
                fontSize: "0.75rem",
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 6
              }}>Mot de passe</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%",
                  transform: "translateY(-50%)", fontSize: "1rem"
                }}>🔒</span>
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 2.75rem 0.75rem 2.75rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: 10,
                    fontSize: "0.875rem",
                    outline: "none",
                    transition: "all 0.2s",
                    background: "#fafafa"
                  }}
                  onFocus={e => e.target.style.borderColor = "#1a56db"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 14, top: "50%",
                    transform: "translateY(-50%)",
                    background: "none", border: "none",
                    cursor: "pointer", fontSize: "1rem"
                  }}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {erreur && (
              <div style={{
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: 8,
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                ❌ {erreur}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.875rem",
                background: loading
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #1a56db, #1e429f)",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                fontFamily: "'Poppins', sans-serif",
                letterSpacing: "0.3px",
                boxShadow: "0 4px 15px rgba(26,86,219,0.4)"
              }}
              onMouseOver={e => !loading && (e.target.style.transform = "translateY(-1px)")}
              onMouseOut={e => e.target.style.transform = "translateY(0)"}
            >
              {loading ? (
                <span>⏳ Connexion en cours...</span>
              ) : (
                <span>Se connecter →</span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: "2rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid #f3f4f6",
            textAlign: "center"
          }}>
            <img src="/logo-isge.png" alt="ISGE" style={{ width: 60, opacity: 0.7, marginBottom: 8 }} />
            <p style={{ color: "#9ca3af", fontSize: "0.75rem", margin: 0 }}>
              ISGE-BF — Institut Supérieur de Génie Électrique<br />
              <span style={{ color: "#d1d5db" }}>Année universitaire 2025-2026</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}