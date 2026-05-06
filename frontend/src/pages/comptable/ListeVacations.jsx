import { useState, useEffect } from "react";

export default function ListeVacations() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [mois, setMois]               = useState("");
  const [annee, setAnnee]             = useState(new Date().getFullYear());
  const [filtreStatut, setFiltreStatut] = useState("");
  const [loading, setLoading]         = useState(false);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const STATUT_CONFIG = {
    generee:           { label: "Generee",          bg: "#f3f4f6", color: "#374151" },
    visee_surveillant: { label: "Visee surveillant", bg: "#fef3c7", color: "#92400e" },
    approuvee:         { label: "Approuvee",         bg: "#d1fae5", color: "#065f46" },
    payee:             { label: "Payee",             bg: "#dbeafe", color: "#1e429f" },
  };

  const formatMontant = (val) =>
    parseInt(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

  useEffect(() => {
    fetch(`${API}/enseignants.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setEnseignants).catch(() => {});
  }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ annee });
      if (ensId)        params.append("id_enseignant", ensId);
      if (mois)         params.append("mois", mois);
      if (filtreStatut) params.append("statut", filtreStatut);

      const res  = await fetch(`${API}/vacations.php?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVacations(Array.isArray(data) ? data : []);
    } catch { setVacations([]); }
    setLoading(false);
  };

  const vacationsParStatut = (statut) => vacations.filter(v => v.statut === statut).length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* En-tête */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>📋 Liste des Vacations</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
          Consultez toutes les fiches de vacation
        </p>
      </div>

      {/* Résumé statuts */}
      {vacations.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: "1.5rem" }}>
          {Object.entries(STATUT_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{
              background: "white", borderRadius: 12, padding: "1rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              borderLeft: `3px solid ${cfg.color}`,
              display: "flex", alignItems: "center", gap: 12
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: cfg.bg, display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", fontWeight: 700, color: cfg.color
              }}>{vacationsParStatut(key)}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 500 }}>
                {cfg.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div style={{
        background: "white", borderRadius: 14, padding: "1.25rem",
        marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Enseignant</label>
            <select value={ensId} onChange={e => setEnsId(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }}>
              <option value="">-- Tous --</option>
              {enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Mois</label>
            <select value={mois} onChange={e => setMois(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }}>
              <option value="">-- Tous --</option>
              {MOIS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Statut</label>
            <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }}>
              <option value="">-- Tous --</option>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Année</label>
            <input type="number" value={annee} onChange={e => setAnnee(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #1a56db, #1e429f)",
            color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem"
          }}>🔍 Chercher</button>
        </div>
      </div>

      {/* Tableau */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner-border text-primary" />
        </div>
      ) : vacations.length === 0 ? (
        <div style={{
          background: "#eff6ff", borderRadius: 14, padding: "2rem",
          textAlign: "center", color: "#1e429f"
        }}>
          ℹ️ Aucune vacation trouvée. Utilisez les filtres ci-dessus.
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "linear-gradient(135deg, #dbeafe, #eff6ff)" }}>
                {["Enseignant","Période","Montant brut","Montant net","Statut"].map(h => (
                  <th key={h} style={{
                    padding: "1rem", textAlign: "left",
                    fontSize: "0.75rem", fontWeight: 600,
                    color: "#1e429f", textTransform: "uppercase", letterSpacing: "0.5px"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vacations.map((v, i) => {
                const cfg = STATUT_CONFIG[v.statut] || { label: v.statut, bg: "#f3f4f6", color: "#374151" };
                return (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f3f4f6", background: i%2===0?"white":"#fafafa" }}>
                    <td style={{ padding: "1rem", fontWeight: 600 }}>{v.enseignant_nom}</td>
                    <td style={{ padding: "1rem", color: "#6b7280" }}>{MOIS[v.mois-1]} {v.annee}</td>
                    <td style={{ padding: "1rem" }}>{formatMontant(v.montant_brut)}</td>
                    <td style={{ padding: "1rem", fontWeight: 700, color: "#1a56db" }}>{formatMontant(v.montant_net)}</td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{
                        background: cfg.bg, color: cfg.color,
                        borderRadius: 20, padding: "4px 12px",
                        fontSize: "0.75rem", fontWeight: 600
                      }}>● {cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
                <td colSpan={2} style={{ padding: "1rem", color: "#374151" }}>
                  Total ({vacations.length} fiches)
                </td>
                <td style={{ padding: "1rem", color: "#374151" }}>
                  {formatMontant(vacations.reduce((s,v) => s + parseFloat(v.montant_brut||0), 0))}
                </td>
                <td style={{ padding: "1rem", color: "#1a56db" }}>
                  {formatMontant(vacations.reduce((s,v) => s + parseFloat(v.montant_net||0), 0))}
                </td>
                <td style={{ padding: "1rem" }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}