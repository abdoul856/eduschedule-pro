import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DashboardComptablePage() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [mois, setMois]               = useState(new Date().getMonth() + 1);
  const [annee, setAnnee]             = useState(new Date().getFullYear());
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [stats, setStats]             = useState({ total: 0, approuvees: 0, payees: 0, montantTotal: 0 });

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

  // ✅ CORRECTION : charger au démarrage + sécuriser enseignants
  useEffect(() => {
    const t = localStorage.getItem("edu_token");
    fetch(`${API}/enseignants.php`, { headers:{ Authorization:`Bearer ${t}` } })
      .then(r => r.json())
      .then(data => setEnseignants(Array.isArray(data) ? data : []))
      .catch(() => setEnseignants([]));
    charger();
  }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const t = localStorage.getItem("edu_token");
      const params = new URLSearchParams({ mois, annee });
      if (ensId) params.append("id_enseignant", ensId);
      const res  = await fetch(`${API}/vacations.php?${params}`, {
        headers:{ Authorization:`Bearer ${t}` }
      });
      const data = await res.json();
      const liste = Array.isArray(data) ? data : [];
      setVacations(liste);
      setStats({
        total:        liste.length,
        approuvees:   liste.filter(v => v.statut==="approuvee").length,
        payees:       liste.filter(v => v.statut==="payee").length,
        montantTotal: liste.reduce((s,v) => s+parseFloat(v.montant_net||0), 0)
      });
    } catch { setVacations([]); }
    setLoading(false);
  };

  const valider = async (id, action) => {
    try {
      const res = await fetch(`${API}/vacations.php?id=${id}&action=${action}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ commentaire:"Validé par le comptable" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage("✅ "+data.message);
      charger();
    } catch(err) { setMessage("❌ "+err.message); }
  };

  const exporterPDF = (v) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(13,110,253);
    doc.text("EduSchedule Pro", 105, 20, { align:"center" });
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("FICHE DE VACATION", 105, 30, { align:"center" });
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text("ISGE-BF - Institut Supérieur de Génie Électrique du Burkina Faso", 105, 38, { align:"center" });
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text(`Enseignant : ${v.enseignant_nom}`,         20, 52);
    doc.text(`Période    : ${MOIS[v.mois]} ${v.annee}`,  20, 60);
    doc.text(`Statut     : ${STATUT_CONFIG[v.statut]?.label||v.statut}`, 20, 68);
    doc.text(`Généré le  : ${new Date().toLocaleDateString("fr-FR")}`,  140, 52);
    doc.setDrawColor(13,110,253); doc.setLineWidth(0.5); doc.line(20,73,190,73);

    const lignes = v.lignes||[];
    autoTable(doc, {
      startY:78,
      head:[["Matière","Semaine","Durée (h)","Taux (FCFA/h)","Montant (FCFA)"]],
      body: lignes.map(l=>[
        l.matiere||"-", l.date||"-",
        formatNombre(l.duree_heures),
        parseInt(l.taux_horaire||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),
        parseInt(l.montant||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")
      ]),
      foot:[[
        {content:"TOTAL",colSpan:2,styles:{fontStyle:"bold"}},
        {content:formatNombre(lignes.reduce((s,l)=>s+parseFloat(l.duree_heures||0),0)),styles:{fontStyle:"bold"}},
        "",
        {content:parseInt(v.montant_brut||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),styles:{fontStyle:"bold"}}
      ]],
      headStyles:{fillColor:[13,110,253]},
      footStyles:{fillColor:[240,240,240]},
      alternateRowStyles:{fillColor:[248,249,250]},
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text("Montant brut :", 120, finalY);
    doc.text(formatMontant(v.montant_brut), 175, finalY, { align:"right" });
    doc.text("Retenues :", 120, finalY+8);
    doc.text(formatMontant(v.retenues||0), 175, finalY+8, { align:"right" });
    doc.setFontSize(13); doc.setTextColor(13,110,253);
    doc.text("Montant net :", 120, finalY+18);
    doc.text(formatMontant(v.montant_net), 175, finalY+18, { align:"right" });

    const sigY = finalY + 35;
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text("Signature Enseignant", 30, sigY);
    doc.text("Visa Surveillant",     95, sigY);
    doc.text("Validation Comptable", 155, sigY);
    doc.rect(20, sigY+5, 60, 25);
    doc.rect(85, sigY+5, 60, 25);
    doc.rect(148,sigY+5, 60, 25);

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("EduSchedule Pro - ISGE-BF - Document généré automatiquement",
      105, doc.internal.pageSize.getHeight()-10, { align:"center" });
    doc.save(`vacation-${v.enseignant_nom?.replace(/ /g,"-")}-${MOIS[v.mois]}-${v.annee}.pdf`);
  };

  const exporterRecapPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(13,110,253);
    doc.text("EduSchedule Pro", 105, 20, { align:"center" });
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("RÉCAPITULATIF DES VACATIONS", 105, 30, { align:"center" });
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`ISGE-BF - ${MOIS[mois]} ${annee}`, 105, 38, { align:"center" });
    doc.setDrawColor(13,110,253); doc.line(20,43,190,43);

    autoTable(doc, {
      startY:48,
      head:[["Enseignant","Période","Statut","Montant brut","Montant net"]],
      body: vacations.map(v=>[
        v.enseignant_nom,
        `${MOIS[v.mois]} ${v.annee}`,
        STATUT_CONFIG[v.statut]?.label||v.statut,
        parseInt(v.montant_brut||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),
        parseInt(v.montant_net||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")
      ]),
      foot:[[
        {content:"TOTAL",colSpan:3,styles:{fontStyle:"bold"}},"",
        {content:stats.montantTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" FCFA",styles:{fontStyle:"bold"}}
      ]],
      headStyles:{fillColor:[13,110,253]},
      footStyles:{fillColor:[240,240,240]},
      alternateRowStyles:{fillColor:[248,249,250]},
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Total fiches    : ${stats.total}`,       20, finalY);
    doc.text(`Approuvées      : ${stats.approuvees}`,  20, finalY+8);
    doc.text(`Payées          : ${stats.payees}`,      20, finalY+16);
    doc.setFontSize(13); doc.setTextColor(13,110,253);
    doc.text(`Montant total net : ${stats.montantTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")} FCFA`, 20, finalY+28);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("EduSchedule Pro - ISGE-BF - Document généré automatiquement",
      105, doc.internal.pageSize.getHeight()-10, { align:"center" });
    doc.save(`recap-vacations-${MOIS[mois]}-${annee}.pdf`);
  };

  // Grouper par statut pour affichage humanisé
  const aApprouver = vacations.filter(v => v.statut==="visee_surveillant");
  const approuvees = vacations.filter(v => v.statut==="approuvee");
  const payees     = vacations.filter(v => v.statut==="payee");
  const autres     = vacations.filter(v => v.statut==="generee");

  const SectionFiches = ({ titre, liste, couleur }) => {
    if (!liste.length) return null;
    return (
      <div style={{ marginBottom:"2rem" }}>
        <h5 style={{ fontFamily:"'Poppins',sans-serif", color:couleur, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
          {titre} <span style={{ background:couleur+"22", color:couleur, borderRadius:20, padding:"2px 10px", fontSize:"0.75rem" }}>{liste.length}</span>
        </h5>
        {liste.map(v => {
          const cfg = STATUT_CONFIG[v.statut]||{label:v.statut,bg:"#f3f4f6",color:"#374151",icon:"📋"};
          return (
            <div key={v.id} style={{
              background:"white", borderRadius:16, marginBottom:14,
              boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)", overflow:"hidden",
              border:`1px solid ${couleur}33`
            }}>
              {/* En-tête fiche */}
              <div style={{
                padding:"1.25rem 1.5rem",
                background:`linear-gradient(135deg,${couleur}11,${couleur}05)`,
                borderBottom:"1px solid #e5e7eb",
                display:"flex", justifyContent:"space-between", alignItems:"center"
              }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <div style={{
                      width:42, height:42, borderRadius:10,
                      background:`linear-gradient(135deg,${couleur},${couleur}99)`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:"1.2rem", color:"white"
                    }}>👨‍🏫</div>
                    <div>
                      <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif", color:"#111928" }}>{v.enseignant_nom}</h5>
                      <p style={{ margin:0, color:"#6b7280", fontSize:"0.8rem" }}>
                        📅 {MOIS[v.mois]} {v.annee} &nbsp;•&nbsp; {v.lignes?.length||0} séance(s)
                      </p>
                    </div>
                  </div>
                  <span style={{ background:cfg.bg, color:cfg.color, borderRadius:20, padding:"3px 12px", fontSize:"0.72rem", fontWeight:600 }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  {v.alertes?.length>0 && (
                    <span style={{ marginLeft:8, background:"#fee2e2", color:"#991b1b", borderRadius:20, padding:"3px 10px", fontSize:"0.72rem", fontWeight:600 }}>
                      ⚠️ {v.alertes.length} alerte(s)
                    </span>
                  )}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:"1.75rem", fontWeight:700, color:couleur }}>{formatMontant(v.montant_net)}</div>
                  <div style={{ fontSize:"0.8rem", color:"#6b7280" }}>Brut : {formatMontant(v.montant_brut)}</div>
                </div>
              </div>

              {/* Alertes */}
              {v.alertes?.length>0 && (
                <div style={{ background:"#fffbeb", borderBottom:"1px solid #fcd34d", padding:"0.75rem 1.5rem" }}>
                  {v.alertes.map((a,i)=>(
                    <div key={i} style={{ color:"#92400e", fontSize:"0.8rem", padding:"1px 0" }}>• {a}</div>
                  ))}
                </div>
              )}

              {/* Tableau séances */}
              {v.lignes?.length>0 && (
                <div style={{ padding:"1rem 1.5rem", overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.8rem" }}>
                    <thead>
                      <tr style={{ background:"#f9fafb" }}>
                        {["Matière","Semaine","Durée (h)","Taux","Montant","Pointage","Cahier"].map(h=>(
                          <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:"#6b7280", fontWeight:600, fontSize:"0.7rem", textTransform:"uppercase", borderBottom:"1px solid #e5e7eb" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {v.lignes.map((l,i)=>(
                        <tr key={i} style={{ borderBottom:"1px solid #f3f4f6", background:i%2===0?"white":"#fafafa" }}>
                          <td style={{ padding:"8px 10px", fontWeight:600 }}>{l.matiere}</td>
                          <td style={{ padding:"8px 10px", color:"#6b7280" }}>{l.date}</td>
                          <td style={{ padding:"8px 10px" }}>{formatNombre(l.duree_heures)}h</td>
                          <td style={{ padding:"8px 10px" }}>{formatMontant(l.taux_horaire)}</td>
                          <td style={{ padding:"8px 10px", fontWeight:600, color:couleur }}>{formatMontant(l.montant)}</td>
                          <td style={{ padding:"8px 10px" }}>
                            <span style={{ background:l.pointage_id?"#d1fae5":"#fee2e2", color:l.pointage_id?"#065f46":"#991b1b", borderRadius:20, padding:"2px 8px", fontSize:"0.7rem", fontWeight:600 }}>
                              {l.pointage_id?"✅ Pointé":"❌ Absent"}
                            </span>
                          </td>
                          <td style={{ padding:"8px 10px" }}>
                            <span style={{ background:l.statut_cahier==="cloture"?"#d1fae5":"#fef3c7", color:l.statut_cahier==="cloture"?"#065f46":"#92400e", borderRadius:20, padding:"2px 8px", fontSize:"0.7rem", fontWeight:600 }}>
                              {l.statut_cahier==="cloture"?"✅ Clôturé":"⏳ En cours"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background:"#f9fafb", fontWeight:700 }}>
                        <td colSpan={2} style={{ padding:"8px 10px" }}>Total</td>
                        <td style={{ padding:"8px 10px" }}>{formatNombre(v.lignes.reduce((s,l)=>s+parseFloat(l.duree_heures||0),0))}h</td>
                        <td style={{ padding:"8px 10px" }}></td>
                        <td style={{ padding:"8px 10px", color:couleur }}>{formatMontant(v.montant_brut)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Actions */}
              <div style={{ padding:"1rem 1.5rem", borderTop:"1px solid #f3f4f6", display:"flex", gap:10, flexWrap:"wrap" }}>
                <button onClick={()=>exporterPDF(v)} style={{
                  padding:"8px 16px", borderRadius:8, border:"1.5px solid #e5e7eb",
                  background:"white", cursor:"pointer", fontWeight:600, fontSize:"0.8rem"
                }}>📄 Exporter PDF</button>
                {v.statut==="visee_surveillant" && (
                  <button onClick={()=>valider(v.id,"approuver")} style={{
                    padding:"8px 20px", borderRadius:8, border:"none",
                    background:"linear-gradient(135deg,#057a55,#046c4e)",
                    color:"white", cursor:"pointer", fontWeight:600, fontSize:"0.8rem",
                    boxShadow:"0 4px 12px rgba(5,122,85,0.3)"
                  }}>✅ Approuver</button>
                )}
                {v.statut==="approuvee" && (
                  <button onClick={()=>valider(v.id,"payer")} style={{
                    padding:"8px 20px", borderRadius:8, border:"none",
                    background:"linear-gradient(135deg,#1a56db,#1e429f)",
                    color:"white", cursor:"pointer", fontWeight:600, fontSize:"0.8rem",
                    boxShadow:"0 4px 12px rgba(26,86,219,0.3)"
                  }}>💰 Marquer Payée</button>
                )}
                {v.statut==="payee" && (
                  <span style={{ padding:"8px 16px", borderRadius:8, background:"#d1fae5", color:"#065f46", fontWeight:600, fontSize:"0.8rem" }}>
                    ✅ Paiement effectué
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>💼 Espace Comptable</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Validation et approbation des fiches de vacation — {MOIS[mois]} {annee}
          </p>
        </div>
        {vacations.length>0 && (
          <button onClick={exporterRecapPDF} style={{
            background:"linear-gradient(135deg,#057a55,#046c4e)",
            color:"white", border:"none", borderRadius:10,
            padding:"10px 20px", fontWeight:600, fontSize:"0.875rem",
            cursor:"pointer", boxShadow:"0 4px 12px rgba(5,122,85,0.4)"
          }}>📄 Export Récap PDF</button>
        )}
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

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:"1.5rem" }}>
        {[
          { icon:"📋", label:"Total fiches",     value:stats.total,        color:"#1a56db", bg:"#dbeafe" },
          { icon:"✅", label:"Approuvées",        value:stats.approuvees,   color:"#057a55", bg:"#d1fae5" },
          { icon:"💰", label:"Payées",            value:stats.payees,       color:"#0694a2", bg:"#cffafe" },
          { icon:"🏦", label:"Montant net total",
            value: stats.montantTotal > 0
              ? stats.montantTotal.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F"
              : "0 F",
            color:"#c27803", bg:"#fef3c7" },
        ].map((k,i)=>(
          <div key={i} style={{
            background:"white", borderRadius:16, padding:"1.25rem",
            boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
            borderLeft:`4px solid ${k.color}`,
            display:"flex", alignItems:"center", gap:16
          }}>
            <div style={{ width:50, height:50, borderRadius:12, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem" }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:"1.5rem", fontWeight:700, color:"#111928", lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:"0.8rem", color:"#6b7280", marginTop:4 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background:"white", borderRadius:14, padding:"1.25rem", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Enseignant</label>
            <select value={ensId} onChange={e=>setEnsId(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              <option value="">-- Tous les enseignants --</option>
              {enseignants.map(e=><option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
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
          }}>🔍 Chercher</button>
        </div>
      </div>

      {/* Liste groupée par statut */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:"#6b7280" }}>
          <div className="spinner-border text-primary mb-3"/>
          <p>Chargement des fiches...</p>
        </div>
      ) : vacations.length===0 ? (
        <div style={{ background:"#eff6ff", borderRadius:14, padding:"2rem", textAlign:"center", color:"#1e429f", border:"1px solid #bfdbfe" }}>
          ℹ️ Aucune fiche trouvée pour cette période. Ajustez les filtres et cliquez sur Chercher.
        </div>
      ) : (
        <>
          <SectionFiches titre="⏳ En attente d'approbation" liste={aApprouver} couleur="#c27803" />
          <SectionFiches titre="✅ Approuvées — à payer"     liste={approuvees}  couleur="#057a55" />
          <SectionFiches titre="💰 Payées"                   liste={payees}      couleur="#1a56db" />
          <SectionFiches titre="📋 Générées"                 liste={autres}      couleur="#6b7280" />
        </>
      )}
    </div>
  );
}