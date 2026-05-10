import { useState, useEffect } from "react";

export default function ValidationControle() {
  const [vacations, setVacations]       = useState([]);
  const [enseignants, setEnseignants]   = useState([]);
  const [ensId, setEnsId]               = useState("");
  const [mois, setMois]                 = useState(new Date().getMonth()+1);
  const [annee, setAnnee]               = useState(new Date().getFullYear());
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState("");
  const [commentaires, setCommentaires] = useState({});

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const formatMontant = (val) =>
    parseInt(val||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" FCFA";

  // ✅ CORRECTION 1 : sécuriser le chargement des enseignants
  useEffect(() => {
    const t = localStorage.getItem("edu_token");
    fetch(`${API}/enseignants.php`, {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(r => r.json())
      .then(data => setEnseignants(Array.isArray(data) ? data : []))
      .catch(() => setEnseignants([]));
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
      const liste = Array.isArray(data)
        ? data.filter(v => v.statut === "generee" || v.statut === "visee_surveillant")
        : [];
      setVacations(liste);
    } catch { setVacations([]); }
    setLoading(false);
  };

  // ✅ CORRECTION 2 : action=valider (pas viser)
  const viser = async (id) => {
    try {
      const commentaire = commentaires[id] || "Visé par le surveillant général";
      const res = await fetch(`${API}/vacations.php?id=${id}&action=valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commentaire })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage("✅ " + data.message);
      charger();
    } catch(err) { setMessage("❌ " + err.message); }
  };

  // ✅ CORRECTION 3 : action=valider dans viserTout aussi
  const viserTout = async () => {
    const aViser = vacations.filter(v => v.statut === "generee");
    if (!aViser.length) { setMessage("❌ Aucune fiche à viser."); return; }
    let ok = 0, err = 0;
    for (const v of aViser) {
      try {
        const res = await fetch(`${API}/vacations.php?id=${v.id}&action=valider`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ commentaire: "Visa groupé — surveillant général" })
        });
        if (res.ok) ok++; else err++;
      } catch { err++; }
    }
    setMessage(`✅ ${ok} fiche(s) visée(s)${err > 0 ? ` — ❌ ${err} erreur(s)` : ""}`);
    charger();
  };

  const aViser   = vacations.filter(v => v.statut === "generee");
  const visitees = vacations.filter(v => v.statut === "visee_surveillant");

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0,fontFamily:"'Poppins',sans-serif" }}>✅ Validation & Contrôle</h2>
          <p style={{ margin:0,color:"#6b7280",fontSize:"0.875rem" }}>
            Visa des fiches de vacation — contrôle et approbation
          </p>
        </div>
        {aViser.length > 0 && (
          <button onClick={viserTout} style={{
            background:"linear-gradient(135deg,#c27803,#92400e)",
            color:"white",border:"none",borderRadius:10,
            padding:"10px 20px",fontWeight:600,fontSize:"0.875rem",
            cursor:"pointer",boxShadow:"0 4px 12px rgba(194,120,3,0.4)"
          }}>👁️ Viser toutes ({aViser.length})</button>
        )}
      </div>

      {message && (
        <div style={{
          background:message.startsWith("✅")?"#d1fae5":"#fee2e2",
          color:message.startsWith("✅")?"#065f46":"#991b1b",
          borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",fontSize:"0.875rem"
        }}>
          {message}
          <button onClick={()=>setMessage("")} style={{background:"none",border:"none",cursor:"pointer",float:"right"}}>✕</button>
        </div>
      )}

      {/* Alerte */}
      {aViser.length > 0 && (
        <div style={{
          background:"#fef3c7",border:"1px solid #fcd34d",
          borderRadius:12,padding:"1rem 1.25rem",marginBottom:"1.5rem",
          display:"flex",alignItems:"center",gap:12
        }}>
          <span style={{ fontSize:"1.5rem" }}>🔔</span>
          <div>
            <strong style={{ color:"#92400e" }}>
              {aViser.length} fiche(s) en attente de votre visa !
            </strong>
            <p style={{ margin:"2px 0 0",color:"#78350f",fontSize:"0.875rem" }}>
              Vérifiez les détails avant de viser chaque fiche.
            </p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:"1.5rem" }}>
        <div style={{
          background:"white",borderRadius:16,padding:"1.25rem",
          boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
          borderLeft:"4px solid #c27803",
          display:"flex",alignItems:"center",gap:16
        }}>
          <div style={{ width:50,height:50,borderRadius:12,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem" }}>⏳</div>
          <div>
            <div style={{ fontSize:"2rem",fontWeight:700,color:"#111928" }}>{aViser.length}</div>
            <div style={{ fontSize:"0.8rem",color:"#6b7280" }}>En attente de visa</div>
          </div>
        </div>
        <div style={{
          background:"white",borderRadius:16,padding:"1.25rem",
          boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
          borderLeft:"4px solid #057a55",
          display:"flex",alignItems:"center",gap:16
        }}>
          <div style={{ width:50,height:50,borderRadius:12,background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem" }}>👁️</div>
          <div>
            <div style={{ fontSize:"2rem",fontWeight:700,color:"#111928" }}>{visitees.length}</div>
            <div style={{ fontSize:"0.8rem",color:"#6b7280" }}>Déjà visées</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ background:"white",borderRadius:14,padding:"1.25rem",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:12,alignItems:"end" }}>
          <div>
            <label style={{ display:"block",fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:6 }}>Enseignant</label>
            <select value={ensId} onChange={e=>setEnsId(e.target.value)}
              style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }}>
              <option value="">-- Tous --</option>
              {enseignants.map(e=><option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block",fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:6 }}>Mois</label>
            <select value={mois} onChange={e=>setMois(e.target.value)}
              style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }}>
              {MOIS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block",fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:6 }}>Année</label>
            <input type="number" value={annee} onChange={e=>setAnnee(e.target.value)}
              style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding:"8px 20px",borderRadius:8,border:"none",
            background:"linear-gradient(135deg,#1a56db,#1e429f)",
            color:"white",cursor:"pointer",fontWeight:600
          }}>🔍 Chercher</button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign:"center",padding:"3rem" }}><div className="spinner-border text-warning"/></div>
      ) : vacations.length === 0 ? (
        <div style={{ background:"#fffbeb",borderRadius:14,padding:"2rem",textAlign:"center",color:"#92400e",border:"1px solid #fcd34d" }}>
          ℹ️ Aucune fiche à valider. Cherchez par mois ou enseignant.
        </div>
      ) : (
        <>
          {/* À viser */}
          {aViser.length > 0 && (
            <div style={{ marginBottom:"1.5rem" }}>
              <h5 style={{ fontFamily:"'Poppins',sans-serif",color:"#92400e",marginBottom:12 }}>
                ⏳ En attente de visa ({aViser.length})
              </h5>
              {aViser.map(v=>(
                <div key={v.id} style={{
                  background:"white",borderRadius:16,marginBottom:12,
                  boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
                  overflow:"hidden",border:"2px solid #fcd34d"
                }}>
                  <div style={{
                    padding:"1rem 1.5rem",
                    background:"linear-gradient(135deg,#fffbeb,#fef3c7)",
                    borderBottom:"1px solid #fcd34d",
                    display:"flex",justifyContent:"space-between",alignItems:"center"
                  }}>
                    <div>
                      <h5 style={{ margin:0,fontFamily:"'Poppins',sans-serif" }}>{v.enseignant_nom}</h5>
                      <p style={{ margin:"4px 0 0",color:"#6b7280",fontSize:"0.875rem" }}>
                        📅 {MOIS[v.mois]} {v.annee}
                        &nbsp;•&nbsp; {v.lignes?.length||0} séance(s)
                        {v.alertes?.length > 0 && (
                          <span style={{ marginLeft:8,background:"#fee2e2",color:"#991b1b",borderRadius:20,padding:"2px 8px",fontSize:"0.7rem",fontWeight:600 }}>
                            ⚠️ {v.alertes.length} alerte(s)
                          </span>
                        )}
                      </p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"1.5rem",fontWeight:700,color:"#1a56db" }}>
                        {formatMontant(v.montant_net)}
                      </div>
                      <div style={{ fontSize:"0.8rem",color:"#6b7280" }}>Brut: {formatMontant(v.montant_brut)}</div>
                    </div>
                  </div>

                  {/* Alertes */}
                  {v.alertes?.length > 0 && (
                    <div style={{ padding:"0.5rem 1.5rem",background:"#fff7ed",borderBottom:"1px solid #fed7aa" }}>
                      {v.alertes.map((a,i)=>(
                        <div key={i} style={{ fontSize:"0.8rem",color:"#c2410c" }}>• {a}</div>
                      ))}
                    </div>
                  )}

                  {/* Commentaire + action */}
                  <div style={{ padding:"1rem 1.5rem",display:"flex",gap:12,alignItems:"center" }}>
                    <input
                      type="text"
                      placeholder="Commentaire (optionnel)..."
                      value={commentaires[v.id]||""}
                      onChange={e=>setCommentaires({...commentaires,[v.id]:e.target.value})}
                      style={{ flex:1,padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }}
                    />
                    <button onClick={()=>viser(v.id)} style={{
                      padding:"8px 24px",borderRadius:10,border:"none",
                      background:"linear-gradient(135deg,#c27803,#92400e)",
                      color:"white",cursor:"pointer",fontWeight:600,fontSize:"0.875rem",
                      boxShadow:"0 4px 12px rgba(194,120,3,0.3)",whiteSpace:"nowrap"
                    }}>👁️ Viser la fiche</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Déjà visées */}
          {visitees.length > 0 && (
            <div>
              <h5 style={{ fontFamily:"'Poppins',sans-serif",color:"#057a55",marginBottom:12 }}>
                ✅ Déjà visées ({visitees.length})
              </h5>
              <div style={{ background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                <table style={{ width:"100%",borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ background:"linear-gradient(135deg,#d1fae5,#ecfdf5)" }}>
                      {["Enseignant","Période","Montant brut","Montant net","Statut"].map(h=>(
                        <th key={h} style={{ padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.75rem",fontWeight:600,color:"#065f46",textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visitees.map((v,i)=>(
                      <tr key={v.id} style={{ borderBottom:"1px solid #f3f4f6",background:i%2===0?"white":"#fafafa" }}>
                        <td style={{ padding:"0.875rem 1rem",fontWeight:600 }}>{v.enseignant_nom}</td>
                        <td style={{ padding:"0.875rem 1rem",color:"#6b7280" }}>{MOIS[v.mois]} {v.annee}</td>
                        <td style={{ padding:"0.875rem 1rem" }}>{formatMontant(v.montant_brut)}</td>
                        <td style={{ padding:"0.875rem 1rem",fontWeight:700,color:"#1a56db" }}>{formatMontant(v.montant_net)}</td>
                        <td style={{ padding:"0.875rem 1rem" }}>
                          <span style={{ background:"#fef3c7",color:"#92400e",borderRadius:20,padding:"3px 12px",fontSize:"0.75rem",fontWeight:600 }}>
                            👁️ Visée
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}