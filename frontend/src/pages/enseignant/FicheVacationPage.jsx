import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function FicheVacationPage() {
  const [vacations, setVacations] = useState([]);
  const [mois, setMois]           = useState(new Date().getMonth()+1);
  const [annee, setAnnee]         = useState(new Date().getFullYear());
  const [loading, setLoading]     = useState(false);
  const [detail, setDetail]       = useState(null);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const STATUT_CONFIG = {
    generee:           { label:"Générée",          bg:"#f3f4f6", color:"#374151", icon:"📋", desc:"En attente du visa surveillant" },
    visee_surveillant: { label:"Visée",             bg:"#fef3c7", color:"#92400e", icon:"👁️", desc:"En attente d'approbation comptable" },
    approuvee:         { label:"Approuvée",         bg:"#d1fae5", color:"#065f46", icon:"✅", desc:"En attente de paiement" },
    payee:             { label:"Payée",             bg:"#dbeafe", color:"#1e429f", icon:"💰", desc:"Paiement effectué" },
  };

  const formatMontant = (val) =>
    parseInt(val||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" FCFA";

  const formatNombre = (val) => parseFloat(val||0).toFixed(2);

  const charger = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/vacations.php?mois=${mois}&annee=${annee}`, {
        headers: { Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      setVacations(Array.isArray(data) ? data : []);
      setDetail(null);
    } catch { setVacations([]); }
    setLoading(false);
  };

  const exporterPDF = (v) => {
    const doc = new jsPDF();

    doc.setFontSize(18); doc.setTextColor(13,110,253);
    doc.text("EduSchedule Pro", 105, 18, { align:"center" });
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("FICHE DE VACATION", 105, 28, { align:"center" });
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text("ISGE-BF — Institut Supérieur de Génie Électrique du Burkina Faso", 105, 36, { align:"center" });
    doc.setDrawColor(13,110,253); doc.line(20,40,190,40);

    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Enseignant  : ${v.enseignant_nom}`,          20, 50);
    doc.text(`Matricule   : ${v.matricule||"-"}`,           20, 57);
    doc.text(`Période     : ${MOIS[v.mois]} ${v.annee}`,   20, 64);
    doc.text(`Statut      : ${STATUT_CONFIG[v.statut]?.label||v.statut}`, 20, 71);
    doc.text(`Généré le   : ${new Date().toLocaleDateString("fr-FR")}`,   120, 50);

    doc.line(20,76,190,76);

    const lignes = v.lignes||[];
    autoTable(doc, {
      startY:81,
      head:[["Matière","Date","Durée (h)","Taux (FCFA/h)","Pointage","Cahier","Montant"]],
      body: lignes.map(l=>[
        l.matiere||"-", l.date||"-",
        formatNombre(l.duree_heures)+"h",
        parseInt(l.taux_horaire||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),
        l.pointage_id ? "✅ Pointé" : "❌ Absent",
        l.statut_cahier==="cloture" ? "✅ Clôturé" : "⏳ En cours",
        parseInt(l.montant||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F"
      ]),
      foot:[[
        {content:"TOTAL",colSpan:2,styles:{fontStyle:"bold"}},
        {content:formatNombre(lignes.reduce((s,l)=>s+parseFloat(l.duree_heures||0),0))+"h",styles:{fontStyle:"bold"}},
        "","","",
        {content:parseInt(v.montant_brut||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",styles:{fontStyle:"bold"}}
      ]],
      headStyles:{fillColor:[13,110,253]},
      footStyles:{fillColor:[240,240,240]},
      alternateRowStyles:{fillColor:[248,249,250]},
    });

    const fy = doc.lastAutoTable.finalY+15;
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text("Montant brut :", 120, fy);
    doc.text(formatMontant(v.montant_brut), 190, fy, { align:"right" });
    doc.text("Retenues :",     120, fy+8);
    doc.text(formatMontant(v.retenues||0), 190, fy+8, { align:"right" });
    doc.setFontSize(13); doc.setTextColor(13,110,253); doc.setFont(undefined,"bold");
    doc.text("Montant net :", 120, fy+18);
    doc.text(formatMontant(v.montant_net), 190, fy+18, { align:"right" });
    doc.setFont(undefined,"normal"); doc.setTextColor(0);

    const sigY = fy+32;
    doc.setFontSize(10);
    doc.text("Signature Enseignant", 30, sigY);
    doc.text("Visa Surveillant",     90, sigY);
    doc.text("Approbation Comptable",148, sigY);
    doc.rect(20,  sigY+4, 60, 22);
    doc.rect(82,  sigY+4, 60, 22);
    doc.rect(144, sigY+4, 50, 22);

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("EduSchedule Pro - ISGE-BF - Document généré automatiquement",
      105, doc.internal.pageSize.getHeight()-8, { align:"center" });

    doc.save(`fiche-vacation-${MOIS[v.mois]}-${v.annee}.pdf`);
  };

  // Totaux
  const totalNet  = vacations.reduce((s,v)=>s+parseFloat(v.montant_net||0),0);
  const totalPaye = vacations.filter(v=>v.statut==="payee").reduce((s,v)=>s+parseFloat(v.montant_net||0),0);

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>💼 Mes Fiches de Vacation</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Consultation et suivi de vos vacations
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ background:"white", borderRadius:14, padding:"1.25rem", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Mois</label>
            <select value={mois} onChange={e=>setMois(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              {MOIS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Année</label>
            <input type="number" value={annee} onChange={e=>setAnnee(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding:"8px 20px", borderRadius:8, border:"none",
            background:"linear-gradient(135deg,#1a56db,#1e429f)",
            color:"white", cursor:"pointer", fontWeight:600
          }}>🔍 Voir</button>
        </div>
      </div>

      {/* KPIs */}
      {vacations.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:"1.5rem" }}>
          {[
            { icon:"📋", label:"Fiches ce mois", value:vacations.length,    color:"#1a56db", bg:"#dbeafe" },
            { icon:"💰", label:"Montant net total",
              value:totalNet.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",
              color:"#c27803", bg:"#fef3c7" },
            { icon:"✅", label:"Déjà payé",
              value:totalPaye.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",
              color:"#057a55", bg:"#d1fae5" },
          ].map((k,i)=>(
            <div key={i} style={{
              background:"white", borderRadius:14, padding:"1rem",
              boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
              borderLeft:`4px solid ${k.color}`,
              display:"flex", alignItems:"center", gap:14
            }}>
              <div style={{ width:46, height:46, borderRadius:10, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>{k.icon}</div>
              <div>
                <div style={{ fontSize:"1.3rem", fontWeight:700, color:"#111928", lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:"0.75rem", color:"#6b7280", marginTop:3 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}><div className="spinner-border text-primary"/></div>
      ) : vacations.length === 0 ? (
        <div style={{ background:"#eff6ff", borderRadius:14, padding:"2rem", textAlign:"center", color:"#1e429f" }}>
          ℹ️ Aucune fiche trouvée. Sélectionnez un mois et cliquez sur Voir.
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns: detail?"1fr 420px":"1fr", gap:16, alignItems:"start" }}>

          {/* Liste */}
          <div>
            {vacations.map(v => {
              const cfg    = STATUT_CONFIG[v.statut]||{label:v.statut,bg:"#f3f4f6",color:"#374151",icon:"📋",desc:""};
              const isOpen = detail?.id===v.id;
              return (
                <div key={v.id} style={{
                  background:"white", borderRadius:16, marginBottom:14,
                  boxShadow: isOpen
                    ? "0 0 0 2px #1a56db, 0 4px 12px rgba(26,86,219,0.2)"
                    : "0 4px 6px -1px rgba(0,0,0,0.1)",
                  overflow:"hidden"
                }}>
                  <div style={{
                    padding:"1.25rem 1.5rem",
                    background:"linear-gradient(135deg,#f9fafb,#f3f4f6)",
                    borderBottom:"1px solid #e5e7eb",
                    display:"flex", justifyContent:"space-between", alignItems:"center"
                  }}>
                    <div>
                      <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>
                        📅 {MOIS[v.mois]} {v.annee}
                      </h5>
                      <p style={{ margin:"4px 0 0", color:"#6b7280", fontSize:"0.875rem" }}>
                        {v.lignes?.length||0} séance(s)
                      </p>
                      <div style={{ marginTop:8, display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{
                          background:cfg.bg, color:cfg.color,
                          borderRadius:20, padding:"3px 12px",
                          fontSize:"0.75rem", fontWeight:600
                        }}>{cfg.icon} {cfg.label}</span>
                        <span style={{ fontSize:"0.75rem", color:"#6b7280" }}>{cfg.desc}</span>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:"1.75rem", fontWeight:700, color:"#1a56db" }}>
                        {formatMontant(v.montant_net)}
                      </div>
                      <div style={{ fontSize:"0.8rem", color:"#6b7280" }}>Brut: {formatMontant(v.montant_brut)}</div>
                      <div style={{ display:"flex", gap:8, marginTop:10, justifyContent:"flex-end" }}>
                        <button onClick={()=>setDetail(isOpen?null:v)} style={{
                          padding:"6px 14px", borderRadius:8,
                          border:"1.5px solid #e5e7eb", background:"white",
                          cursor:"pointer", fontWeight:600, fontSize:"0.8rem"
                        }}>{isOpen?"✕ Fermer":"🔍 Détail"}</button>
                        <button onClick={()=>exporterPDF(v)} style={{
                          padding:"6px 14px", borderRadius:8, border:"none",
                          background:"linear-gradient(135deg,#057a55,#046c4e)",
                          color:"white", cursor:"pointer", fontWeight:600, fontSize:"0.8rem"
                        }}>📄 PDF</button>
                      </div>
                    </div>
                  </div>

                  {/* Progression statut */}
                  <div style={{ padding:"0.875rem 1.5rem", background:"#fafafa" }}>
                    <div style={{ display:"flex", gap:0 }}>
                      {["generee","visee_surveillant","approuvee","payee"].map((s,i) => {
                        const cfg2   = STATUT_CONFIG[s];
                        const statuts = ["generee","visee_surveillant","approuvee","payee"];
                        const idx    = statuts.indexOf(v.statut);
                        const actif  = i <= idx;
                        return (
                          <div key={s} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                            <div style={{ display:"flex", alignItems:"center", width:"100%" }}>
                              {i > 0 && <div style={{ flex:1, height:3, background: actif?"#1a56db":"#e5e7eb" }} />}
                              <div style={{
                                width:24, height:24, borderRadius:"50%",
                                background: actif ? "#1a56db" : "#e5e7eb",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:"0.7rem", color:"white", fontWeight:700, flexShrink:0
                              }}>{i+1}</div>
                              {i < 3 && <div style={{ flex:1, height:3, background: i<idx?"#1a56db":"#e5e7eb" }} />}
                            </div>
                            <div style={{ fontSize:"0.6rem", color: actif?"#1a56db":"#9ca3af", marginTop:4, textAlign:"center" }}>
                              {cfg2.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panneau détail */}
          {detail && (
            <div style={{
              background:"white", borderRadius:16,
              boxShadow:"0 4px 20px rgba(0,0,0,0.15)",
              overflow:"hidden", position:"sticky", top:20
            }}>
              <div style={{
                padding:"1rem 1.25rem",
                background:"linear-gradient(135deg,#1a1a2e,#0f3460)",
                display:"flex", justifyContent:"space-between", alignItems:"center"
              }}>
                <div>
                  <h6 style={{ margin:0, color:"white", fontFamily:"'Poppins',sans-serif" }}>
                    📋 {MOIS[detail.mois]} {detail.annee}
                  </h6>
                  <p style={{ margin:"3px 0 0", color:"rgba(255,255,255,0.5)", fontSize:"0.8rem" }}>
                    Détail des séances
                  </p>
                </div>
                <button onClick={()=>setDetail(null)} style={{
                  background:"rgba(255,255,255,0.1)", border:"none",
                  color:"white", borderRadius:8, padding:"4px 10px", cursor:"pointer"
                }}>✕</button>
              </div>

              {/* Récap montants */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"#e5e7eb" }}>
                {[
                  { label:"Brut",     value:formatMontant(detail.montant_brut),  color:"#374151" },
                  { label:"Retenues", value:formatMontant(detail.retenues||0),   color:"#991b1b" },
                  { label:"Net",      value:formatMontant(detail.montant_net),   color:"#1a56db" },
                ].map((item,i)=>(
                  <div key={i} style={{ background:"#f9fafb", padding:"0.75rem", textAlign:"center" }}>
                    <div style={{ fontSize:"0.85rem", fontWeight:700, color:item.color }}>{item.value}</div>
                    <div style={{ fontSize:"0.65rem", color:"#6b7280", marginTop:1 }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Séances */}
              <div style={{ padding:"0.75rem", maxHeight:400, overflowY:"auto" }}>
                {(detail.lignes||[]).map((l,i)=>(
                  <div key={i} style={{
                    background: !l.pointage_id||l.statut_cahier!=="cloture" ? "#fffbeb" : "#f9fafb",
                    borderRadius:10, padding:"0.75rem", marginBottom:8,
                    border: !l.pointage_id||l.statut_cahier!=="cloture" ? "1px solid #fcd34d" : "1px solid #e5e7eb"
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:"0.875rem" }}>{l.matiere}</div>
                        <div style={{ fontSize:"0.75rem", color:"#6b7280", marginTop:2 }}>
                          📅 {l.date} &nbsp;•&nbsp; ⏱ {parseFloat(l.duree_heures||0).toFixed(2)}h
                        </div>
                      </div>
                      <div style={{ fontWeight:700, color:"#1a56db", fontSize:"0.875rem" }}>
                        {formatMontant(l.montant)}
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:6, marginTop:6 }}>
                      <span style={{
                        background:l.pointage_id?"#d1fae5":"#fee2e2",
                        color:l.pointage_id?"#065f46":"#991b1b",
                        borderRadius:20, padding:"2px 8px", fontSize:"0.68rem", fontWeight:600
                      }}>{l.pointage_id?"✅ Pointé":"❌ Non pointé"}</span>
                      <span style={{
                        background:l.statut_cahier==="cloture"?"#d1fae5":"#fef3c7",
                        color:l.statut_cahier==="cloture"?"#065f46":"#92400e",
                        borderRadius:20, padding:"2px 8px", fontSize:"0.68rem", fontWeight:600
                      }}>{l.statut_cahier==="cloture"?"✅ Cahier clôturé":"⏳ Cahier en cours"}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding:"0.75rem", borderTop:"1px solid #e5e7eb" }}>
                <button onClick={()=>exporterPDF(detail)} style={{
                  width:"100%", padding:"10px", borderRadius:10, border:"none",
                  background:"linear-gradient(135deg,#057a55,#046c4e)",
                  color:"white", cursor:"pointer", fontWeight:600, fontSize:"0.875rem"
                }}>📄 Exporter en PDF</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}