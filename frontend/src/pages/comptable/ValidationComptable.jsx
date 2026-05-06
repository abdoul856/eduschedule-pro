import { useState, useEffect } from "react";

export default function ValidationComptable() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [mois, setMois]               = useState(new Date().getMonth() + 1);
  const [annee, setAnnee]             = useState(new Date().getFullYear());
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(false);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const formatMontant = (val) =>
    parseInt(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

  useEffect(() => {
    fetch(`${API}/enseignants.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setEnseignants).catch(() => {});
  }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mois, annee });
      if (ensId) params.append("id_enseignant", ensId);
      const res  = await fetch(`${API}/vacations.php?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Filtrer seulement celles visées par le surveillant (en attente d'approbation comptable)
      const liste = Array.isArray(data) ? data.filter(v => v.statut === "visee_surveillant" || v.statut === "approuvee") : [];
      setVacations(liste);
    } catch { setVacations([]); }
    setLoading(false);
  };

  const valider = async (id, action) => {
    try {
      const res = await fetch(`${API}/vacations.php?id=${id}&action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commentaire: "Valide par le comptable" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage("✅ " + data.message);
      charger();
    } catch (err) { setMessage("❌ " + err.message); }
  };

  const aApprouver = vacations.filter(v => v.statut === "visee_surveillant").length;
  const approuvees = vacations.filter(v => v.statut === "approuvee").length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>✅ Validation Comptable</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
          Approuvez et marquez les fiches comme payées
        </p>
      </div>

      {message && (
        <div style={{
          background: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          borderRadius: 10, padding: "0.75rem 1rem",
          marginBottom: "1rem", fontSize: "0.875rem"
        }}>
          {message}
          <button onClick={() => setMessage("")} style={{ background:"none", border:"none", cursor:"pointer", float:"right" }}>✕</button>
        </div>
      )}

      {/* Alertes */}
      {aApprouver > 0 && (
        <div style={{
          background: "#fef3c7", border: "1px solid #fcd34d",
          borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem"
        }}>
          <strong style={{ color: "#92400e" }}>🔔 {aApprouver} fiche(s) en attente de votre approbation !</strong>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: "1.5rem" }}>
        <div style={{
          background: "white", borderRadius: 16, padding: "1.25rem",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          borderLeft: "4px solid #c27803",
          display: "flex", alignItems: "center", gap: 16
        }}>
          <div style={{ width:50, height:50, borderRadius:12, background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem" }}>⏳</div>
          <div>
            <div style={{ fontSize:"1.75rem", fontWeight:700, color:"#111928" }}>{aApprouver}</div>
            <div style={{ fontSize:"0.8rem", color:"#6b7280" }}>En attente d'approbation</div>
          </div>
        </div>
        <div style={{
          background: "white", borderRadius: 16, padding: "1.25rem",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          borderLeft: "4px solid #057a55",
          display: "flex", alignItems: "center", gap: 16
        }}>
          <div style={{ width:50, height:50, borderRadius:12, background:"#d1fae5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem" }}>✅</div>
          <div>
            <div style={{ fontSize:"1.75rem", fontWeight:700, color:"#111928" }}>{approuvees}</div>
            <div style={{ fontSize:"0.8rem", color:"#6b7280" }}>Approuvées (à payer)</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{
        background: "white", borderRadius: 14, padding: "1.25rem",
        marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Enseignant</label>
            <select value={ensId} onChange={e => setEnsId(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              <option value="">-- Tous --</option>
              {enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Mois</label>
            <select value={mois} onChange={e => setMois(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              {MOIS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Année</label>
            <input type="number" value={annee} onChange={e => setAnnee(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding:"8px 20px", borderRadius:8, border:"none",
            background:"linear-gradient(135deg, #1a56db, #1e429f)",
            color:"white", cursor:"pointer", fontWeight:600
          }}>🔍 Chercher</button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}><div className="spinner-border text-primary" /></div>
      ) : vacations.length === 0 ? (
        <div style={{ background:"#eff6ff", borderRadius:14, padding:"2rem", textAlign:"center", color:"#1e429f" }}>
          ℹ️ Aucune fiche à valider. Cherchez par mois ou enseignant.
        </div>
      ) : vacations.map(v => (
        <div key={v.id} style={{
          background: "white", borderRadius: 16, marginBottom: 16,
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", overflow: "hidden",
          border: v.statut === "visee_surveillant" ? "2px solid #fcd34d" : "2px solid #6ee7b7"
        }}>
          <div style={{
            padding: "1rem 1.5rem",
            background: v.statut === "visee_surveillant" ? "#fffbeb" : "#ecfdf5",
            borderBottom: "1px solid #e5e7eb",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>{v.enseignant_nom}</h5>
              <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:"0.875rem" }}>
                📅 {MOIS[v.mois-1]} {v.annee}
              </p>
              <span style={{
                display:"inline-block", marginTop:6,
                background: v.statut === "visee_surveillant" ? "#fef3c7" : "#d1fae5",
                color: v.statut === "visee_surveillant" ? "#92400e" : "#065f46",
                borderRadius:20, padding:"3px 12px",
                fontSize:"0.75rem", fontWeight:600
              }}>
                {v.statut === "visee_surveillant" ? "⏳ En attente d'approbation" : "✅ Approuvée — à payer"}
              </span>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"1.75rem", fontWeight:700, color:"#1a56db" }}>
                {formatMontant(v.montant_net)}
              </div>
              <div style={{ fontSize:"0.8rem", color:"#6b7280" }}>
                Brut : {formatMontant(v.montant_brut)}
              </div>
            </div>
          </div>

          <div style={{ padding: "1rem 1.5rem", display:"flex", gap:12 }}>
            {v.statut === "visee_surveillant" && (
              <button onClick={() => valider(v.id, "approuver")} style={{
                padding:"10px 24px", borderRadius:10, border:"none",
                background:"linear-gradient(135deg, #057a55, #046c4e)",
                color:"white", cursor:"pointer", fontWeight:600, fontSize:"0.875rem",
                boxShadow:"0 4px 12px rgba(5,122,85,0.3)"
              }}>✅ Approuver la fiche</button>
            )}
            {v.statut === "approuvee" && (
              <button onClick={() => valider(v.id, "payer")} style={{
                padding:"10px 24px", borderRadius:10, border:"none",
                background:"linear-gradient(135deg, #1a56db, #1e429f)",
                color:"white", cursor:"pointer", fontWeight:600, fontSize:"0.875rem",
                boxShadow:"0 4px 12px rgba(26,86,219,0.3)"
              }}>💰 Confirmer le paiement</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}