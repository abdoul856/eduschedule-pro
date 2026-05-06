import { useState, useEffect } from "react";

export default function HistoriquePage() {
  const [cahiers, setCahiers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [mois, setMois]   = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ annee });
      if (mois) params.append("mois", mois);
      const res  = await fetch(`${API}/cahiers_texte.php?${params}`, {
        headers: { Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      setCahiers(Array.isArray(data) ? data : []);
    } catch { setCahiers([]); }
    setLoading(false);
  };

  const liste = cahiers.filter(c => {
    const matchSearch  = !recherche || `${c.matiere} ${c.enseignant_nom}`.toLowerCase().includes(recherche.toLowerCase());
    const matchStatut  = !filtreStatut || c.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  const nbClotures = cahiers.filter(c=>c.statut==="cloture").length;
  const taux = cahiers.length>0 ? Math.round(nbClotures/cahiers.length*100) : 0;

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📜 Historique des Séances</h2>
        <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
          Consulter l'historique complet du cahier de texte
        </p>
      </div>

      {/* Filtres */}
      <div style={{ background:"white", borderRadius:14, padding:"1.25rem", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Recherche</label>
            <input type="text" placeholder="Matière, enseignant..."
              value={recherche} onChange={e=>setRecherche(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem", boxSizing:"border-box" }} />
          </div>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Mois</label>
            <select value={mois} onChange={e=>setMois(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              <option value="">-- Tous --</option>
              {MOIS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Statut</label>
            <select value={filtreStatut} onChange={e=>setFiltreStatut(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              <option value="">-- Tous --</option>
              <option value="cloture">✅ Clôturé</option>
              <option value="en_cours">⏳ En cours</option>
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Année</label>
            <input type="number" value={annee} onChange={e=>setAnnee(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding:"8px 20px", borderRadius:8, border:"none",
            background:"linear-gradient(135deg,#7e3af2,#6c2bd9)",
            color:"white", cursor:"pointer", fontWeight:600
          }}>🔍 Filtrer</button>
        </div>
      </div>

      {/* KPIs */}
      {cahiers.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:"1.5rem" }}>
          {[
            { icon:"📚", label:"Total séances", value:cahiers.length,  color:"#1a56db", bg:"#dbeafe" },
            { icon:"✅", label:"Clôturés",       value:nbClotures,      color:"#057a55", bg:"#d1fae5" },
            { icon:"📊", label:"Taux clôture",   value:taux+"%",        color:"#7e3af2", bg:"#ede9fe" },
          ].map((k,i)=>(
            <div key={i} style={{
              background:"white", borderRadius:14, padding:"1rem",
              boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
              borderLeft:`4px solid ${k.color}`,
              display:"flex", alignItems:"center", gap:12
            }}>
              <div style={{ width:44, height:44, borderRadius:10, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.3rem" }}>{k.icon}</div>
              <div>
                <div style={{ fontSize:"1.4rem", fontWeight:700, color:"#111928", lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:"0.75rem", color:"#6b7280", marginTop:3 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tableau */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}><div className="spinner-border text-primary"/></div>
      ) : liste.length===0 ? (
        <div style={{ background:"#f5f3ff", borderRadius:14, padding:"2rem", textAlign:"center", color:"#7e3af2", border:"1px solid #ddd6fe" }}>
          ℹ️ Aucune séance trouvée.
        </div>
      ) : (
        <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"linear-gradient(135deg,#ede9fe,#f5f3ff)" }}>
                {["Matière","Enseignant","Date","Contenu","Signé délégué","Statut"].map(h=>(
                  <th key={h} style={{ padding:"1rem", textAlign:"left", fontSize:"0.75rem", fontWeight:600, color:"#7e3af2", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liste.map((c,i)=>(
                <tr key={c.id||i} style={{ borderBottom:"1px solid #f3f4f6", background:i%2===0?"white":"#fafafa" }}>
                  <td style={{ padding:"0.875rem 1rem", fontWeight:600 }}>{c.matiere||"-"}</td>
                  <td style={{ padding:"0.875rem 1rem", color:"#6b7280" }}>{c.enseignant_nom||"-"}</td>
                  <td style={{ padding:"0.875rem 1rem", color:"#6b7280" }}>{c.date||"-"}</td>
                  <td style={{ padding:"0.875rem 1rem", maxWidth:200 }}>
                    <div style={{ fontSize:"0.8rem", color:"#374151", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {c.contenu||<em style={{color:"#9ca3af"}}>Non renseigné</em>}
                    </div>
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <span style={{
                      background:c.signature_delegue?"#d1fae5":"#fee2e2",
                      color:c.signature_delegue?"#065f46":"#991b1b",
                      borderRadius:20, padding:"3px 10px", fontSize:"0.75rem", fontWeight:600
                    }}>{c.signature_delegue?"✅ Signé":"❌ Non signé"}</span>
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <span style={{
                      background:c.statut==="cloture"?"#d1fae5":"#fef3c7",
                      color:c.statut==="cloture"?"#065f46":"#92400e",
                      borderRadius:20, padding:"3px 12px", fontSize:"0.75rem", fontWeight:600
                    }}>{c.statut==="cloture"?"✅ Clôturé":"⏳ En cours"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:"#f9fafb", fontWeight:700 }}>
                <td colSpan={6} style={{ padding:"0.875rem 1rem", fontSize:"0.8rem", color:"#6b7280" }}>
                  {liste.length} séance(s) affichée(s) • {nbClotures} clôturée(s) • Taux : {taux}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}