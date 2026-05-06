import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function VerificationFiches() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [mois, setMois]               = useState(new Date().getMonth() + 1);
  const [annee, setAnnee]             = useState(new Date().getFullYear());
  const [filtreStatut, setFiltreStatut] = useState("");
  const [loading, setLoading]         = useState(false);
  const [message, setMessage]         = useState("");
  const [detail, setDetail]           = useState(null);
  const [filtreAlerte, setFiltreAlerte] = useState(false);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const STATUT_CONFIG = {
    generee:           { label:"Générée",          bg:"#f3f4f6", color:"#374151", icon:"📋" },
    visee_surveillant: { label:"Visée surveillant", bg:"#fef3c7", color:"#92400e", icon:"👁️" },
    approuvee:         { label:"Approuvée",         bg:"#d1fae5", color:"#065f46", icon:"✅" },
    payee:             { label:"Payée",             bg:"#dbeafe", color:"#1e429f", icon:"💰" },
  };

  const formatMontant = (val) =>
    parseInt(val||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" FCFA";

  const formatNombre = (val) => parseFloat(val||0).toFixed(2);

  useEffect(() => {
    fetch(`${API}/enseignants.php`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r=>r.json()).then(setEnseignants).catch(()=>{});
  }, []);

  const charger = async () => {
    setLoading(true); setDetail(null);
    try {
      const params = new URLSearchParams({ mois, annee });
      if (ensId)        params.append("id_enseignant", ensId);
      if (filtreStatut) params.append("statut", filtreStatut);
      const res  = await fetch(`${API}/vacations.php?${params}`, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      setVacations(Array.isArray(data) ? data : []);
    } catch { setVacations([]); }
    setLoading(false);
  };

  const viser = async (id) => {
    try {
      const res = await fetch(`${API}/vacations.php?id=${id}&action=viser`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ commentaire:"Visé par le surveillant général" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage("✅ "+data.message);
      setDetail(null); charger();
    } catch(err) { setMessage("❌ "+err.message); }
  };

  const exporterControlePDF = (v) => {
    const doc = new jsPDF();

    doc.setFontSize(18); doc.setTextColor(13,110,253);
    doc.text("EduSchedule Pro", 105, 18, { align:"center" });
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("FICHE DE VÉRIFICATION — SURVEILLANT", 105, 28, { align:"center" });
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`ISGE-BF — Contrôle du ${new Date().toLocaleDateString("fr-FR")}`, 105, 36, { align:"center" });
    doc.setDrawColor(13,110,253); doc.line(20,40,190,40);

    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Enseignant  : ${v.enseignant_nom}`,       20, 50);
    doc.text(`Matricule   : ${v.matricule||"-"}`,        20, 57);
    doc.text(`Période     : ${MOIS[v.mois]} ${v.annee}`,20, 64);
    doc.text(`Statut      : ${STATUT_CONFIG[v.statut]?.label||v.statut}`, 20, 71);
    doc.text(`Alertes     : ${v.alertes?.length||0}`,   120, 50);
    doc.text(`Montant net : ${formatMontant(v.montant_net)}`, 120, 57);
    doc.text(`Montant brut: ${formatMontant(v.montant_brut)}`, 120, 64);

    doc.setDrawColor(200); doc.line(20,76,190,76);

    const lignes = v.lignes||[];
    autoTable(doc, {
      startY:81,
      head:[["Matière","Date","Durée(h)","Taux","Pointage","Cahier","Montant"]],
      body: lignes.map(l=>[
        l.matiere||"-", l.date||"-",
        formatNombre(l.duree_heures)+"h",
        parseInt(l.taux_horaire||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),
        l.pointage_id ? "✅ Pointé" : "❌ Absent",
        l.statut_cahier==="cloture" ? "✅ Clôturé" : "⏳ En cours",
        parseInt(l.montant||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")
      ]),
      foot:[[
        {content:"TOTAL",colSpan:2,styles:{fontStyle:"bold"}},
        {content:formatNombre(lignes.reduce((s,l)=>s+parseFloat(l.duree_heures||0),0))+"h",styles:{fontStyle:"bold"}},
        "","","",
        {content:parseInt(v.montant_brut||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),styles:{fontStyle:"bold"}}
      ]],
      headStyles:{fillColor:[13,110,253]},
      footStyles:{fillColor:[240,240,240]},
      alternateRowStyles:{fillColor:[248,249,250]},
    });

    let fy = doc.lastAutoTable.finalY + 10;

    if (v.alertes?.length>0) {
      doc.setFontSize(11); doc.setTextColor(146,64,14);
      doc.text("⚠️ Alertes détectées :", 20, fy);
      fy += 7;
      v.alertes.forEach(a => {
        doc.setFontSize(9); doc.setTextColor(120,53,15);
        doc.text(`• ${a}`, 25, fy); fy+=6;
      });
      fy += 5;
    }

    doc.setFontSize(10); doc.setTextColor(0);
    doc.text("Visa Surveillant Général :", 20, fy);
    doc.rect(20, fy+3, 80, 22);
    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 120, fy);
    doc.rect(115, fy+3, 75, 22);

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("EduSchedule Pro - ISGE-BF - Document généré automatiquement",
      105, doc.internal.pageSize.getHeight()-8, { align:"center" });

    doc.save(`verification-${v.enseignant_nom?.replace(/ /g,"-")}-${MOIS[v.mois]}-${v.annee}.pdf`);
  };

  const listeAffichee = filtreAlerte
    ? vacations.filter(v => v.alertes?.length > 0)
    : vacations;

  const nbAlertes  = vacations.reduce((s,v)=>s+(v.alertes?.length||0),0);
  const nbAViser   = vacations.filter(v=>v.statut==="generee").length;
  const nbOK       = vacations.filter(v=>!v.alertes?.length).length;

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>🔎 Vérification des Fiches</h2>
        <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
          Contrôle détaillé — pointages QR et cahiers de texte
        </p>
      </div>

      {message && (
        <div style={{
          background:message.startsWith("✅")?"#d1fae5":"#fee2e2",
          color:message.startsWith("✅")?"#065f46":"#991b1b",
          borderRadius:10, padding:"0.75rem 1rem", marginBottom:"1rem", fontSize:"0.875rem"
        }}>
          {message}
          <button onClick={()=>setMessage("")} style={{background:"none",border:"none",cursor:"pointer",float:"right"}}>✕</button>
        </div>
      )}

      {/* Filtres */}
      <div style={{ background:"white",borderRadius:14,padding:"1.25rem",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:12,alignItems:"end" }}>
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
            <label style={{ display:"block",fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:6 }}>Statut</label>
            <select value={filtreStatut} onChange={e=>setFiltreStatut(e.target.value)}
              style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }}>
              <option value="">-- Tous --</option>
              {Object.entries(STATUT_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block",fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:6 }}>Année</label>
            <input type="number" value={annee} onChange={e=>setAnnee(e.target.value)}
              style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding:"8px 20px",borderRadius:8,border:"none",
            background:"linear-gradient(135deg,#c27803,#92400e)",
            color:"white",cursor:"pointer",fontWeight:600
          }}>🔍 Chercher</button>
        </div>

        {/* Filtre alerte rapide */}
        {vacations.length > 0 && (
          <div style={{ marginTop:12, display:"flex", gap:8 }}>
            <button onClick={()=>setFiltreAlerte(false)} style={{
              padding:"5px 16px", borderRadius:20, border:"none",
              background: !filtreAlerte ? "#1a56db" : "#e5e7eb",
              color: !filtreAlerte ? "white" : "#374151",
              fontWeight:600, fontSize:"0.8rem", cursor:"pointer"
            }}>Toutes ({vacations.length})</button>
            <button onClick={()=>setFiltreAlerte(true)} style={{
              padding:"5px 16px", borderRadius:20, border:"none",
              background: filtreAlerte ? "#e02424" : "#e5e7eb",
              color: filtreAlerte ? "white" : "#374151",
              fontWeight:600, fontSize:"0.8rem", cursor:"pointer"
            }}>⚠️ Avec alertes ({vacations.filter(v=>v.alertes?.length>0).length})</button>
          </div>
        )}
      </div>

      {/* KPIs */}
      {vacations.length > 0 && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:"1.5rem" }}>
          {[
            { icon:"📋", label:"Total fiches",  value:vacations.length, color:"#1a56db", bg:"#dbeafe" },
            { icon:"✅", label:"Sans alerte",    value:nbOK,             color:"#057a55", bg:"#d1fae5" },
            { icon:"⚠️", label:"Alertes totales",value:nbAlertes,        color:"#e02424", bg:"#fee2e2" },
            { icon:"⏳", label:"À viser",         value:nbAViser,         color:"#c27803", bg:"#fef3c7" },
          ].map((k,i)=>(
            <div key={i} style={{
              background:"white",borderRadius:14,padding:"1rem",
              boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
              borderLeft:`4px solid ${k.color}`,
              display:"flex",alignItems:"center",gap:12
            }}>
              <div style={{ width:44,height:44,borderRadius:10,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem" }}>{k.icon}</div>
              <div>
                <div style={{ fontSize:"1.5rem",fontWeight:700,color:"#111928",lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:"0.75rem",color:"#6b7280",marginTop:3 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:"center",padding:"3rem" }}><div className="spinner-border text-warning"/></div>
      ) : listeAffichee.length === 0 ? (
        <div style={{ background:"#fffbeb",borderRadius:14,padding:"2rem",textAlign:"center",color:"#92400e",border:"1px solid #fcd34d" }}>
          {vacations.length===0 ? "ℹ️ Utilisez les filtres et cliquez sur Chercher." : "✅ Aucune fiche avec alerte."}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns: detail?"1fr 420px":"1fr", gap:16, alignItems:"start" }}>

          {/* Liste */}
          <div>
            {listeAffichee.map(v => {
              const cfg     = STATUT_CONFIG[v.statut]||{label:v.statut,bg:"#f3f4f6",color:"#374151",icon:"📋"};
              const hasAl   = v.alertes?.length>0;
              const isOpen  = detail?.id===v.id;
              return (
                <div key={v.id} style={{
                  background:"white",borderRadius:16,marginBottom:12,
                  boxShadow: isOpen
                    ? "0 0 0 2px #c27803, 0 4px 12px rgba(194,120,3,0.2)"
                    : "0 2px 8px rgba(0,0,0,0.08)",
                  overflow:"hidden",
                  border: hasAl?"1px solid #fcd34d":"1px solid #e5e7eb"
                }}>
                  <div style={{
                    padding:"1rem 1.25rem",
                    background: hasAl
                      ? "linear-gradient(135deg,#fffbeb,#fef3c7)"
                      : "linear-gradient(135deg,#f9fafb,#f3f4f6)",
                    display:"flex",justifyContent:"space-between",alignItems:"center"
                  }}>
                    <div>
                      <h6 style={{ margin:0,fontFamily:"'Poppins',sans-serif" }}>{v.enseignant_nom}</h6>
                      <p style={{ margin:"3px 0 0",color:"#6b7280",fontSize:"0.8rem" }}>
                        📅 {MOIS[v.mois]} {v.annee} &nbsp;•&nbsp; {v.lignes?.length||0} séance(s)
                      </p>
                      <div style={{ display:"flex",gap:6,marginTop:6,flexWrap:"wrap" }}>
                        <span style={{ background:cfg.bg,color:cfg.color,borderRadius:20,padding:"2px 10px",fontSize:"0.7rem",fontWeight:600 }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {hasAl ? (
                          <span style={{ background:"#fee2e2",color:"#991b1b",borderRadius:20,padding:"2px 10px",fontSize:"0.7rem",fontWeight:600 }}>
                            ⚠️ {v.alertes.length} alerte(s)
                          </span>
                        ) : (
                          <span style={{ background:"#d1fae5",color:"#065f46",borderRadius:20,padding:"2px 10px",fontSize:"0.7rem",fontWeight:600 }}>
                            ✅ Conforme
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"1.25rem",fontWeight:700,color:"#1a56db" }}>{formatMontant(v.montant_net)}</div>
                      <div style={{ fontSize:"0.75rem",color:"#6b7280",marginTop:2 }}>Brut: {formatMontant(v.montant_brut)}</div>
                      <div style={{ display:"flex",gap:6,marginTop:8,justifyContent:"flex-end" }}>
                        <button onClick={()=>setDetail(isOpen?null:v)} style={{
                          padding:"4px 10px",borderRadius:8,border:"1.5px solid #e5e7eb",
                          background:"white",cursor:"pointer",fontWeight:600,fontSize:"0.75rem",color:"#374151"
                        }}>{isOpen?"✕ Fermer":"🔍 Détail"}</button>
                        <button onClick={()=>exporterControlePDF(v)} style={{
                          padding:"4px 10px",borderRadius:8,border:"none",
                          background:"#f3f4f6",cursor:"pointer",fontWeight:600,fontSize:"0.75rem"
                        }}>📄 PDF</button>
                        {v.statut==="generee" && (
                          <button onClick={()=>viser(v.id)} style={{
                            padding:"4px 10px",borderRadius:8,border:"none",
                            background:"linear-gradient(135deg,#c27803,#92400e)",
                            color:"white",cursor:"pointer",fontWeight:600,fontSize:"0.75rem"
                          }}>👁️ Viser</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Alertes inline */}
                  {hasAl && (
                    <div style={{ padding:"0.5rem 1.25rem",background:"#fffbeb",borderTop:"1px solid #fcd34d" }}>
                      {v.alertes.map((a,i)=>(
                        <div key={i} style={{ fontSize:"0.75rem",color:"#92400e",padding:"1px 0" }}>• {a}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panneau détail */}
          {detail && (
            <div style={{
              background:"white",borderRadius:16,
              boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
              overflow:"hidden",position:"sticky",top:20
            }}>
              <div style={{
                padding:"1rem 1.25rem",
                background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
                display:"flex",justifyContent:"space-between",alignItems:"center"
              }}>
                <div>
                  <h6 style={{ margin:0,color:"white",fontFamily:"'Poppins',sans-serif" }}>🔍 {detail.enseignant_nom}</h6>
                  <p style={{ margin:"3px 0 0",color:"rgba(255,255,255,0.5)",fontSize:"0.8rem" }}>
                    {MOIS[detail.mois]} {detail.annee}
                  </p>
                </div>
                <button onClick={()=>setDetail(null)} style={{
                  background:"rgba(255,255,255,0.1)",border:"none",color:"white",
                  borderRadius:8,padding:"4px 10px",cursor:"pointer"
                }}>✕</button>
              </div>

              {/* Montants */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:"#e5e7eb" }}>
                {[
                  { label:"Montant brut",value:formatMontant(detail.montant_brut),color:"#374151" },
                  { label:"Montant net", value:formatMontant(detail.montant_net), color:"#1a56db" },
                ].map((item,i)=>(
                  <div key={i} style={{ background:"#f9fafb",padding:"0.75rem",textAlign:"center" }}>
                    <div style={{ fontSize:"0.95rem",fontWeight:700,color:item.color }}>{item.value}</div>
                    <div style={{ fontSize:"0.7rem",color:"#6b7280",marginTop:2 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Séances */}
              <div style={{ padding:"0.75rem" }}>
                <div style={{ fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:8 }}>
                  Détail des séances
                </div>
                {(detail.lignes||[]).map((l,i)=>(
                  <div key={i} style={{
                    background: !l.pointage_id || l.statut_cahier!=="cloture"
                      ? "#fffbeb" : "#f9fafb",
                    borderRadius:10, padding:"0.625rem",
                    marginBottom:6,
                    border: !l.pointage_id || l.statut_cahier!=="cloture"
                      ? "1px solid #fcd34d" : "1px solid #e5e7eb"
                  }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontWeight:600,fontSize:"0.85rem" }}>{l.matiere}</div>
                        <div style={{ fontSize:"0.75rem",color:"#6b7280",marginTop:2 }}>
                          📅 {l.date} &nbsp;•&nbsp; ⏱ {formatNombre(l.duree_heures)}h
                        </div>
                      </div>
                      <div style={{ fontWeight:700,color:"#1a56db",fontSize:"0.85rem" }}>
                        {formatMontant(l.montant)}
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:6,marginTop:6 }}>
                      <span style={{
                        background:l.pointage_id?"#d1fae5":"#fee2e2",
                        color:l.pointage_id?"#065f46":"#991b1b",
                        borderRadius:20,padding:"2px 8px",fontSize:"0.68rem",fontWeight:600
                      }}>{l.pointage_id?"✅ Pointé":"❌ Absent"}</span>
                      <span style={{
                        background:l.statut_cahier==="cloture"?"#d1fae5":"#fef3c7",
                        color:l.statut_cahier==="cloture"?"#065f46":"#92400e",
                        borderRadius:20,padding:"2px 8px",fontSize:"0.68rem",fontWeight:600
                      }}>{l.statut_cahier==="cloture"?"✅ Cahier clôturé":"⏳ Cahier en cours"}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ padding:"0.75rem",borderTop:"1px solid #e5e7eb",display:"flex",gap:8 }}>
                <button onClick={()=>exporterControlePDF(detail)} style={{
                  flex:1,padding:"8px",borderRadius:8,
                  border:"1.5px solid #e5e7eb",background:"white",
                  cursor:"pointer",fontWeight:600,fontSize:"0.8rem"
                }}>📄 Exporter PDF</button>
                {detail.statut==="generee" && (
                  <button onClick={()=>viser(detail.id)} style={{
                    flex:1,padding:"8px",borderRadius:8,border:"none",
                    background:"linear-gradient(135deg,#c27803,#92400e)",
                    color:"white",cursor:"pointer",fontWeight:600,fontSize:"0.8rem"
                  }}>👁️ Viser</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}