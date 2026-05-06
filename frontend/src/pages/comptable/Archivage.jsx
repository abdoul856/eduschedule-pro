import { useState, useEffect } from "react";

export default function Archivage() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [annee, setAnnee]             = useState(new Date().getFullYear());
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
      const params = new URLSearchParams({ annee });
      if (ensId) params.append("id_enseignant", ensId);
      const res  = await fetch(`${API}/vacations.php?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Archives = fiches payées uniquement
      const liste = Array.isArray(data) ? data.filter(v => v.statut === "payee") : [];
      setVacations(liste);
    } catch { setVacations([]); }
    setLoading(false);
  };

  // Grouper par mois
  const parMois = MOIS.map((m, i) => ({
    mois: i + 1,
    label: m,
    fiches: vacations.filter(v => parseInt(v.mois) === i + 1),
    total:  vacations.filter(v => parseInt(v.mois) === i + 1).reduce((s,v) => s+parseFloat(v.montant_net||0), 0)
  })).filter(g => g.fiches.length > 0);

  const totalAnnee = vacations.reduce((s,v) => s + parseFloat(v.montant_net||0), 0);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>🗄️ Archives</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Historique complet des paiements effectués
          </p>
        </div>
        {vacations.length > 0 && (
          <div style={{
            background:"white", borderRadius:12, padding:"0.75rem 1.25rem",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
            borderLeft:"4px solid #057a55"
          }}>
            <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>Total payé {annee}</div>
            <div style={{ fontSize:"1.25rem", fontWeight:700, color:"#057a55" }}>
              {formatMontant(totalAnnee)}
            </div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div style={{
        background:"white", borderRadius:14, padding:"1.25rem",
        marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr auto", gap:12, alignItems:"end" }}>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Enseignant</label>
            <select value={ensId} onChange={e => setEnsId(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              <option value="">-- Tous --</option>
              {enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Année</label>
            <input type="number" value={annee} onChange={e => setAnnee(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding:"8px 20px", borderRadius:8, border:"none",
            background:"linear-gradient(135deg, #057a55, #046c4e)",
            color:"white", cursor:"pointer", fontWeight:600
          }}>🔍 Chercher</button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}><div className="spinner-border text-success" /></div>
      ) : vacations.length === 0 ? (
        <div style={{ background:"#ecfdf5", borderRadius:14, padding:"2rem", textAlign:"center", color:"#065f46" }}>
          🗄️ Aucune archive trouvée. Seules les fiches payées apparaissent ici.
        </div>
      ) : parMois.map(groupe => (
        <div key={groupe.mois} style={{ marginBottom: "1.5rem" }}>
          {/* En-tête mois */}
          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"0.75rem 1.25rem",
            background:"linear-gradient(135deg, #d1fae5, #ecfdf5)",
            borderRadius:"12px 12px 0 0",
            border:"1px solid #6ee7b7"
          }}>
            <div style={{ fontWeight:700, color:"#065f46", fontSize:"1rem" }}>
              📅 {groupe.label} {annee}
            </div>
            <div style={{ fontWeight:700, color:"#057a55" }}>
              Total : {formatMontant(groupe.total)}
            </div>
          </div>

          {/* Tableau du mois */}
          <div style={{ background:"white", borderRadius:"0 0 12px 12px", border:"1px solid #6ee7b7", borderTop:"none", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f9fafb" }}>
                  {["Enseignant","Montant brut","Retenues","Montant net","Statut"].map(h => (
                    <th key={h} style={{ padding:"0.75rem 1rem", textAlign:"left", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupe.fiches.map((v, i) => (
                  <tr key={v.id} style={{ borderBottom:"1px solid #f3f4f6", background:i%2===0?"white":"#fafafa" }}>
                    <td style={{ padding:"0.875rem 1rem", fontWeight:600 }}>{v.enseignant_nom}</td>
                    <td style={{ padding:"0.875rem 1rem", color:"#6b7280" }}>{formatMontant(v.montant_brut)}</td>
                    <td style={{ padding:"0.875rem 1rem", color:"#6b7280" }}>{formatMontant(v.retenues||0)}</td>
                    <td style={{ padding:"0.875rem 1rem", fontWeight:700, color:"#057a55" }}>{formatMontant(v.montant_net)}</td>
                    <td style={{ padding:"0.875rem 1rem" }}>
                      <span style={{ background:"#dbeafe", color:"#1e429f", borderRadius:20, padding:"4px 12px", fontSize:"0.75rem", fontWeight:600 }}>
                        💰 Payée
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}