import { useState, useEffect } from "react";
import QRCode from "qrcode";

export default function QRCodePage() {
  const [classes, setClasses]   = useState([]);
  const [classeId, setClasseId] = useState("");
  const [semaine, setSemaine]   = useState("");
  const [creneaux, setCreneaux] = useState([]);
  const [qrImages, setQrImages] = useState({});
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  useEffect(() => {
    fetch(`${API}/classes.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setClasses).catch(() => {});
    const today = new Date();
    const day   = today.getDay();
    const diff  = today.getDate() - day + (day === 0 ? -6 : 1);
    const lundi = new Date(today.setDate(diff));
    setSemaine(lundi.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!classeId || !semaine) return;
    setLoading(true);
    fetch(`${API}/emploi_temps.php?id_classe=${classeId}&semaine=${semaine}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setCreneaux(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [classeId, semaine]);

  const genererQR = async (creneau) => {
    const random  = Math.random().toString(36).substring(2, 15);
    const payload = {
      id_creneau: creneau.id, id_enseignant: creneau.id_enseignant,
      jour: creneau.jour, heure_debut: creneau.heure_debut,
      timestamp: Date.now(), random
    };
    const tokenQR = btoa(JSON.stringify(payload))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const qrData  = JSON.stringify({ token: tokenQR, id_creneau: creneau.id });

    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 200, margin: 2,
        color: { dark: "#1a1a2e", light: "#ffffff" }
      });
      setQrImages(prev => ({ ...prev, [creneau.id]: { url, token: tokenQR } }));
      setMessage(`✅ QR-Code généré pour ${creneau.matiere}`);
      await fetch(`${API}/pointages.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_creneau: creneau.id, token_qr: tokenQR })
      });
    } catch (err) {
      setMessage("❌ Erreur génération QR");
    }
  };

  const imprimer = (id) => {
    const img     = qrImages[id];
    if (!img) return;
    const creneau = creneaux.find(c => c.id === id);
    const w       = window.open("", "_blank");
    w.document.write(`
      <html><head>
        <style>
          body { text-align:center; padding:40px; font-family:'Segoe UI',sans-serif; background:#f8fafc; }
          .card { background:white; border-radius:20px; padding:30px; max-width:400px; margin:0 auto; box-shadow:0 10px 30px rgba(0,0,0,0.1); }
          .header { background:linear-gradient(135deg,#1a1a2e,#0f3460); color:white; padding:20px; border-radius:12px; margin-bottom:20px; }
          .header h2 { margin:0; font-size:18px; } .header p { margin:5px 0 0; opacity:0.8; font-size:13px; }
          .info { background:#f0f4ff; border-radius:10px; padding:15px; margin:15px 0; text-align:left; }
          .info p { margin:5px 0; font-size:13px; color:#374151; }
          .code { background:#fff3cd; border:1px solid #fcd34d; border-radius:10px; padding:15px; margin:15px 0; }
          .code strong { display:block; margin-bottom:8px; color:#92400e; }
          code { font-size:10px; word-break:break-all; color:#374151; }
          .footer { color:#9ca3af; font-size:11px; margin-top:20px; }
        </style>
      </head><body>
        <div class="card">
          <div class="header">
            <h2>🎓 EduSchedule Pro</h2>
            <p>ISGE-BF — QR-Code de Pointage</p>
          </div>
          <div class="info">
            <p><strong>${creneau?.matiere}</strong></p>
            <p>📅 ${creneau?.jour} &nbsp; ⏰ ${creneau?.heure_debut?.slice(0,5)} à ${creneau?.heure_fin?.slice(0,5)}</p>
            <p>👨‍🏫 ${creneau?.enseignant}</p>
            <p>🏫 ${creneau?.salle_code} — ${creneau?.type_seance}</p>
          </div>
          <img src="${img.url}" style="width:200px;border:3px solid #1a56db;border-radius:12px;padding:8px;margin:10px 0"/>
          <div class="code">
            <strong>⌨️ Code manuel (problème technique) :</strong>
            <code>${img.token}</code>
          </div>
          <div class="footer">
            <p>⚠️ QR-Code à usage unique — Valide ±15 min autour de l'heure prévue</p>
            <p>Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}</p>
          </div>
        </div>
        <script>window.print()</script>
      </body></html>
    `);
  };

  const semainePrec = () => { const d = new Date(semaine); d.setDate(d.getDate()-7); setSemaine(d.toISOString().split("T")[0]); };
  const semaineSuiv = () => { const d = new Date(semaine); d.setDate(d.getDate()+7); setSemaine(d.toISOString().split("T")[0]); };

  const TYPE_COLORS = { Cours: "#1a56db", TD: "#c27803", TP: "#057a55" };

  return (
    <div>
      {/* En-tête */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>📱 Génération des QR-Codes</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
          Générez et imprimez les QR-Codes pour chaque séance
        </p>
      </div>

      {message && (
        <div style={{
          background: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          borderRadius: 10, padding: "0.75rem 1.25rem",
          marginBottom: "1rem", fontSize: "0.875rem",
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span>{message}</span>
          <button onClick={() => setMessage("")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>
      )}

      {/* Filtres */}
      <div style={{
        background: "white", borderRadius: 16, padding: "1.25rem",
        marginBottom: "1.5rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Classe</label>
            <select value={classeId} onChange={e => setClasseId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }}>
              <option value="">-- Choisir une classe --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Semaine du</label>
            <input type="date" value={semaine} onChange={e => setSemaine(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={semainePrec} style={{ padding: "9px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "white", cursor: "pointer", fontWeight: 500 }}>← Préc.</button>
            <button onClick={semaineSuiv} style={{ padding: "9px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, background: "white", cursor: "pointer", fontWeight: 500 }}>Suiv. →</button>
          </div>
        </div>
      </div>

      {/* Créneaux */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div className="spinner-border text-primary" />
          <p style={{ color: "#6b7280", marginTop: 12 }}>Chargement des créneaux...</p>
        </div>
      ) : creneaux.length === 0 ? (
        <div style={{
          background: "white", borderRadius: 16, padding: "3rem",
          textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📱</div>
          <p style={{ color: "#6b7280" }}>Sélectionnez une classe et une semaine pour voir les créneaux.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {creneaux.map(c => (
            <div key={c.id} style={{
              background: "white", borderRadius: 16,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              overflow: "hidden", transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.12)"}
            onMouseOut={e => e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)"}
            >
              {/* Bande colorée en haut */}
              <div style={{
                height: 4,
                background: `linear-gradient(135deg, ${TYPE_COLORS[c.type_seance] || "#1a56db"}, ${TYPE_COLORS[c.type_seance] || "#1a56db"}88)`
              }} />

              <div style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <h6 style={{ margin: 0, fontWeight: 700, color: "#111928", fontSize: "0.95rem" }}>{c.matiere}</h6>
                      <span style={{
                        background: `${TYPE_COLORS[c.type_seance] || "#1a56db"}15`,
                        color: TYPE_COLORS[c.type_seance] || "#1a56db",
                        borderRadius: 6, padding: "2px 8px", fontSize: "0.7rem", fontWeight: 600
                      }}>{c.type_seance}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        📅 {c.jour} &nbsp; ⏰ {c.heure_debut?.slice(0,5)} — {c.heure_fin?.slice(0,5)}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>👨‍🏫 {c.enseignant}</span>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>🏫 {c.salle_code}</span>
                    </div>
                  </div>

                  {/* QR Code preview */}
                  {qrImages[c.id] && (
                    <div style={{ textAlign: "center", marginLeft: 16 }}>
                      <img src={qrImages[c.id].url} alt="QR"
                        style={{ width: 80, height: 80, border: "2px solid #e5e7eb", borderRadius: 10, padding: 4 }} />
                      <div style={{ fontSize: "0.6rem", color: "#9ca3af", marginTop: 4, maxWidth: 80, wordBreak: "break-all" }}>
                        {qrImages[c.id].token.slice(0,12)}...
                      </div>
                    </div>
                  )}
                </div>

                {/* Code manuel */}
                {qrImages[c.id] && (
                  <div style={{
                    background: "#fef3c7", border: "1px solid #fcd34d",
                    borderRadius: 8, padding: "8px 12px", marginTop: 12
                  }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#92400e", marginBottom: 4 }}>
                      ⌨️ Code manuel :
                    </div>
                    <code style={{ fontSize: "0.65rem", wordBreak: "break-all", color: "#374151" }}>
                      {qrImages[c.id].token}
                    </code>
                  </div>
                )}

                {/* Boutons */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => genererQR(c)} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8, border: "none",
                    background: qrImages[c.id]
                      ? "linear-gradient(135deg, #057a55, #046c4e)"
                      : "linear-gradient(135deg, #1a56db, #1e429f)",
                    color: "white", fontWeight: 600, fontSize: "0.8rem",
                    cursor: "pointer"
                  }}>
                    {qrImages[c.id] ? "🔄 Regénérer" : "⚡ Générer QR"}
                  </button>
                  {qrImages[c.id] && (
                    <>
                      <button onClick={() => imprimer(c.id)} style={{
                        padding: "8px 12px", borderRadius: 8,
                        border: "1.5px solid #e5e7eb", background: "white",
                        cursor: "pointer", fontSize: "0.8rem", fontWeight: 500
                      }}>🖨️</button>
                      <button onClick={() => {
                        navigator.clipboard.writeText(qrImages[c.id].token);
                        setMessage("✅ Code copié dans le presse-papier !");
                      }} style={{
                        padding: "8px 12px", borderRadius: 8,
                        border: "1.5px solid #e5e7eb", background: "white",
                        cursor: "pointer", fontSize: "0.8rem", fontWeight: 500
                      }}>📋</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}