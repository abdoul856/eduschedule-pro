import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RapportSurveillant() {
  const [vacations, setVacations]   = useState([]);
  const [mois, setMois]             = useState(new Date().getMonth()+1);
  const [annee, setAnnee]           = useState(new Date().getFullYear());
  const [loading, setLoading]       = useState(false);
  const [typeRapport, setTypeRapport] = useState("mensuel");

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const formatMontant = (val) =>
    parseInt(val||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" FCFA";

  const charger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ annee });
      if (typeRapport==="mensuel") params.append("mois", mois);
      const res  = await fetch(`${API}/vacations.php?${params}`,{
        headers:{ Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      setVacations(Array.isArray(data)?data:[]);
    } catch { setVacations([]); }
    setLoading(false);
  };

  // Stats
  const stats = {
    total:     vacations.length,
    generees:  vacations.filter(v=>v.statut==="generee").length,
    visees:    vacations.filter(v=>v.statut==="visee_surveillant").length,
    approuvees:vacations.filter(v=>v.statut==="approuvee").length,
    payees:    vacations.filter(v=>v.statut==="payee").length,
    avecAlertes: vacations.filter(v=>v.alertes?.length>0).length,
    nbAlertes: vacations.reduce((s,v)=>s+(v.alertes?.length||0),0),
    montantBrut: vacations.reduce((s,v)=>s+parseFloat(v.montant_brut||0),0),
    montantNet:  vacations.reduce((s,v)=>s+parseFloat(v.montant_net||0),0),
    tauxVisa: vacations.length>0
      ? Math.round((vacations.filter(v=>v.statut!=="generee").length/vacations.length)*100)
      : 0,
  };

  // Grouper par mois (rapport annuel)
  const parMois = MOIS.slice(1).map((label,i)=>({
    mois:i+1, label,
    fiches: vacations.filter(v=>parseInt(v.mois)===i+1),
    visees: vacations.filter(v=>parseInt(v.mois)===i+1 && v.statut!=="generee").length,
    alertes:vacations.filter(v=>parseInt(v.mois)===i+1).reduce((s,v)=>s+(v.alertes?.length||0),0),
    montant:vacations.filter(v=>parseInt(v.mois)===i+1).reduce((s,v)=>s+parseFloat(v.montant_net||0),0),
  })).filter(g=>g.fiches.length>0);

  const exporterRapportMensuelPDF = () => {
    const doc = new jsPDF();
    const periode = `${MOIS[mois]} ${annee}`;

    doc.setFontSize(18); doc.setTextColor(13,110,253);
    doc.text("EduSchedule Pro", 105, 18, { align:"center" });
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("RAPPORT MENSUEL — SURVEILLANT GÉNÉRAL", 105, 28, { align:"center" });
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`ISGE-BF — ${periode} — Généré le ${new Date().toLocaleDateString("fr-FR")}`, 105, 36, { align:"center" });
    doc.setDrawColor(13,110,253); doc.line(20,40,190,40);

    // Stats
    doc.setFontSize(11); doc.setFont(undefined,"bold"); doc.setTextColor(0);
    doc.text("RÉSUMÉ STATISTIQUE", 20, 50);
    doc.setFont(undefined,"normal"); doc.setFontSize(10);
    doc.text(`Total fiches     : ${stats.total}`,       20, 58);
    doc.text(`Fiches générées  : ${stats.generees}`,    20, 65);
    doc.text(`Fiches visées    : ${stats.visees}`,      20, 72);
    doc.text(`Approuvées       : ${stats.approuvees}`,  110, 58);
    doc.text(`Payées           : ${stats.payees}`,      110, 65);
    doc.text(`Taux visa        : ${stats.tauxVisa}%`,   110, 72);
    doc.text(`Fiches avec alertes : ${stats.avecAlertes}`, 20, 79);
    doc.text(`Total alertes    : ${stats.nbAlertes}`,   110, 79);

    doc.line(20,84,190,84);

    // Montants
    doc.setFont(undefined,"bold"); doc.text("MONTANTS", 20, 92);
    doc.setFont(undefined,"normal");
    doc.text(`Montant brut total : ${formatMontant(stats.montantBrut)}`, 20, 100);
    doc.setTextColor(13,110,253); doc.setFont(undefined,"bold");
    doc.text(`Montant net total  : ${formatMontant(stats.montantNet)}`,  20, 108);
    doc.setTextColor(0); doc.setFont(undefined,"normal");
    doc.line(20,113,190,113);

    // Tableau fiches
    autoTable(doc,{
      startY:118,
      head:[["Enseignant","Montant net","Statut","Alertes","Séances"]],
      body: vacations.map(v=>[
        v.enseignant_nom,
        parseInt(v.montant_net||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",
        v.statut==="generee"?"En attente":
        v.statut==="visee_surveillant"?"Visée":
        v.statut==="approuvee"?"Approuvée":"Payée",
        v.alertes?.length||0,
        v.lignes?.length||0
      ]),
      headStyles:{fillColor:[13,110,253]},
      alternateRowStyles:{fillColor:[248,249,250]},
      foot:[[
        {content:`TOTAL (${stats.total} fiches)`,colSpan:1,styles:{fontStyle:"bold"}},
        {content:parseInt(stats.montantNet).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",styles:{fontStyle:"bold"}},
        "","",""
      ]],
      footStyles:{fillColor:[240,240,240]},
    });

    // Alertes détail
    const avecAl = vacations.filter(v=>v.alertes?.length>0);
    if (avecAl.length>0) {
      let fy = doc.lastAutoTable.finalY+10;
      doc.setFontSize(11); doc.setTextColor(146,64,14);
      doc.text("⚠️ DÉTAIL DES ALERTES", 20, fy); fy+=8;
      avecAl.forEach(v=>{
        doc.setFontSize(9); doc.setTextColor(0);
        doc.setFont(undefined,"bold");
        doc.text(v.enseignant_nom, 20, fy); fy+=5;
        doc.setFont(undefined,"normal"); doc.setTextColor(120,53,15);
        v.alertes.forEach(a=>{ doc.text(`  • ${a}`,25,fy); fy+=5; });
        fy+=2;
      });
    }

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("EduSchedule Pro - ISGE-BF - Document généré automatiquement",
      105, doc.internal.pageSize.getHeight()-8, { align:"center" });

    doc.save(`rapport-surveillant-${MOIS[mois]}-${annee}.pdf`);
  };

  const exporterRapportAnnuelPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18); doc.setTextColor(13,110,253);
    doc.text("EduSchedule Pro", 105, 18, { align:"center" });
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text(`RAPPORT ANNUEL ${annee} — SURVEILLANT GÉNÉRAL`, 105, 28, { align:"center" });
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`ISGE-BF — Généré le ${new Date().toLocaleDateString("fr-FR")}`, 105, 36, { align:"center" });
    doc.setDrawColor(13,110,253); doc.line(20,40,190,40);

    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Total fiches : ${stats.total}`,           20, 50);
    doc.text(`Taux visa    : ${stats.tauxVisa}%`,       20, 57);
    doc.text(`Total alertes: ${stats.nbAlertes}`,       110, 50);
    doc.text(`Montant net  : ${formatMontant(stats.montantNet)}`, 110, 57);
    doc.line(20,62,190,62);

    autoTable(doc,{
      startY:67,
      head:[["Mois","Nb fiches","Nb visées","Alertes","Montant net (FCFA)","Avancement"]],
      body: parMois.map(m=>[
        m.label,
        m.fiches.length,
        m.visees,
        m.alertes,
        parseInt(m.montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),
        m.fiches.length>0 ? Math.round(m.visees/m.fiches.length*100)+"%":"0%"
      ]),
      foot:[[
        {content:`TOTAL ${annee}`,styles:{fontStyle:"bold"}},
        {content:stats.total,styles:{fontStyle:"bold"}},
        {content:stats.total-stats.generees,styles:{fontStyle:"bold"}},
        {content:stats.nbAlertes,styles:{fontStyle:"bold"}},
        {content:parseInt(stats.montantNet).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),styles:{fontStyle:"bold"}},
        {content:stats.tauxVisa+"%",styles:{fontStyle:"bold"}}
      ]],
      headStyles:{fillColor:[13,110,253]},
      footStyles:{fillColor:[240,240,240]},
      alternateRowStyles:{fillColor:[248,249,250]},
    });

    doc.setFontSize(8); doc.setTextColor(150);
    doc.text("EduSchedule Pro - ISGE-BF - Document généré automatiquement",
      105, doc.internal.pageSize.getHeight()-8, { align:"center" });

    doc.save(`rapport-annuel-surveillant-${annee}.pdf`);
  };

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0,fontFamily:"'Poppins',sans-serif" }}>📊 Rapports Surveillant</h2>
          <p style={{ margin:0,color:"#6b7280",fontSize:"0.875rem" }}>
            Génération de rapports de supervision et contrôle
          </p>
        </div>
        {vacations.length>0 && (
          <button
            onClick={typeRapport==="mensuel" ? exporterRapportMensuelPDF : exporterRapportAnnuelPDF}
            style={{
              background:"linear-gradient(135deg,#057a55,#046c4e)",
              color:"white",border:"none",borderRadius:10,
              padding:"10px 20px",fontWeight:600,fontSize:"0.875rem",
              cursor:"pointer",boxShadow:"0 4px 12px rgba(5,122,85,0.4)"
            }}>📄 Exporter PDF</button>
        )}
      </div>

      {/* Type rapport */}
      <div style={{ display:"flex",gap:8,marginBottom:"1.5rem" }}>
        {[
          { key:"mensuel", label:"📅 Rapport Mensuel" },
          { key:"annuel",  label:"📈 Rapport Annuel"  },
        ].map(t=>(
          <button key={t.key} onClick={()=>{ setTypeRapport(t.key); setVacations([]); }} style={{
            padding:"8px 20px",borderRadius:10,border:"none",
            background: typeRapport===t.key
              ? "linear-gradient(135deg,#c27803,#92400e)"
              : "white",
            color: typeRapport===t.key ? "white" : "#374151",
            fontWeight:600,fontSize:"0.875rem",cursor:"pointer",
            boxShadow: typeRapport===t.key
              ? "0 4px 12px rgba(194,120,3,0.3)"
              : "0 2px 8px rgba(0,0,0,0.08)"
          }}>{t.label}</button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background:"white",borderRadius:14,padding:"1.25rem",marginBottom:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid",gridTemplateColumns: typeRapport==="mensuel"?"1fr 1fr auto":"1fr auto",gap:12,alignItems:"end" }}>
          {typeRapport==="mensuel" && (
            <div>
              <label style={{ display:"block",fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:6 }}>Mois</label>
              <select value={mois} onChange={e=>setMois(e.target.value)}
                style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }}>
                {MOIS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display:"block",fontSize:"0.75rem",fontWeight:600,color:"#6b7280",textTransform:"uppercase",marginBottom:6 }}>Année</label>
            <input type="number" value={annee} onChange={e=>setAnnee(e.target.value)}
              style={{ width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:"0.875rem" }} />
          </div>
          <button onClick={charger} style={{
            padding:"8px 24px",borderRadius:8,border:"none",
            background:"linear-gradient(135deg,#c27803,#92400e)",
            color:"white",cursor:"pointer",fontWeight:600
          }}>🔍 Générer</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center",padding:"3rem" }}><div className="spinner-border text-warning"/></div>
      ) : vacations.length===0 ? (
        <div style={{ background:"#fffbeb",borderRadius:14,padding:"2rem",textAlign:"center",color:"#92400e",border:"1px solid #fcd34d" }}>
          ℹ️ Sélectionnez une période et cliquez sur Générer.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:"1.5rem" }}>
            {[
              { icon:"📋", label:"Total fiches",    value:stats.total,       color:"#1a56db", bg:"#dbeafe" },
              { icon:"👁️", label:"Taux de visa",    value:stats.tauxVisa+"%",color:"#057a55", bg:"#d1fae5" },
              { icon:"⚠️", label:"Fiches alertées", value:stats.avecAlertes, color:"#e02424", bg:"#fee2e2" },
              { icon:"🏦", label:"Montant net",
                value:stats.montantNet.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",
                color:"#0694a2", bg:"#cffafe" },
            ].map((k,i)=>(
              <div key={i} style={{
                background:"white",borderRadius:14,padding:"1rem",
                boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
                borderLeft:`4px solid ${k.color}`,
                display:"flex",alignItems:"center",gap:12
              }}>
                <div style={{ width:44,height:44,borderRadius:10,background:k.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem" }}>{k.icon}</div>
                <div>
                  <div style={{ fontSize:"1.4rem",fontWeight:700,color:"#111928",lineHeight:1 }}>{k.value}</div>
                  <div style={{ fontSize:"0.75rem",color:"#6b7280",marginTop:3 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Statuts */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:"1.5rem" }}>
            {[
              { label:"Générées",  value:stats.generees,   color:"#374151", bg:"#f3f4f6" },
              { label:"Visées",    value:stats.visees,     color:"#92400e", bg:"#fef3c7" },
              { label:"Approuvées",value:stats.approuvees, color:"#065f46", bg:"#d1fae5" },
              { label:"Payées",    value:stats.payees,     color:"#1e429f", bg:"#dbeafe" },
            ].map((s,i)=>(
              <div key={i} style={{
                background:"white",borderRadius:12,padding:"1rem",
                boxShadow:"0 2px 8px rgba(0,0,0,0.06)",
                borderLeft:`3px solid ${s.color}`,
                display:"flex",alignItems:"center",gap:12
              }}>
                <div style={{ width:40,height:40,borderRadius:10,background:s.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",fontWeight:700,color:s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize:"0.8rem",color:"#6b7280",fontWeight:500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tableau */}
          {typeRapport==="mensuel" ? (
            <div style={{ background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
              <div style={{ padding:"1rem 1.5rem",borderBottom:"1px solid #e5e7eb",background:"#f9fafb" }}>
                <h5 style={{ margin:0,fontFamily:"'Poppins',sans-serif" }}>
                  📋 Détail — {MOIS[mois]} {annee}
                </h5>
              </div>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
                    {["Enseignant","Séances","Montant net","Alertes","Statut"].map(h=>(
                      <th key={h} style={{ padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.75rem",fontWeight:600,color:"#1e429f",textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vacations.map((v,i)=>(
                    <tr key={v.id} style={{ borderBottom:"1px solid #f3f4f6",background:i%2===0?"white":"#fafafa" }}>
                      <td style={{ padding:"0.875rem 1rem",fontWeight:600 }}>{v.enseignant_nom}</td>
                      <td style={{ padding:"0.875rem 1rem",color:"#6b7280" }}>{v.lignes?.length||0}</td>
                      <td style={{ padding:"0.875rem 1rem",fontWeight:700,color:"#1a56db" }}>{formatMontant(v.montant_net)}</td>
                      <td style={{ padding:"0.875rem 1rem" }}>
                        {v.alertes?.length>0 ? (
                          <span style={{ background:"#fee2e2",color:"#991b1b",borderRadius:20,padding:"3px 10px",fontSize:"0.75rem",fontWeight:600 }}>
                            ⚠️ {v.alertes.length}
                          </span>
                        ) : (
                          <span style={{ background:"#d1fae5",color:"#065f46",borderRadius:20,padding:"3px 10px",fontSize:"0.75rem",fontWeight:600 }}>✅ OK</span>
                        )}
                      </td>
                      <td style={{ padding:"0.875rem 1rem" }}>
                        <span style={{
                          background:
                            v.statut==="payee"?"#dbeafe":
                            v.statut==="approuvee"?"#d1fae5":
                            v.statut==="visee_surveillant"?"#fef3c7":"#f3f4f6",
                          color:
                            v.statut==="payee"?"#1e429f":
                            v.statut==="approuvee"?"#065f46":
                            v.statut==="visee_surveillant"?"#92400e":"#374151",
                          borderRadius:20,padding:"3px 12px",fontSize:"0.75rem",fontWeight:600
                        }}>● {v.statut}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:"#f9fafb",fontWeight:700 }}>
                    <td style={{ padding:"1rem" }}>Total ({vacations.length} fiches)</td>
                    <td style={{ padding:"1rem" }}>{vacations.reduce((s,v)=>s+(v.lignes?.length||0),0)}</td>
                    <td style={{ padding:"1rem",color:"#1a56db" }}>{formatMontant(stats.montantNet)}</td>
                    <td style={{ padding:"1rem",color:"#991b1b" }}>{stats.nbAlertes} alerte(s)</td>
                    <td style={{ padding:"1rem" }}>{stats.tauxVisa}% visées</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            /* Rapport annuel par mois */
            <div style={{ background:"white",borderRadius:16,overflow:"hidden",boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
              <div style={{ padding:"1rem 1.5rem",borderBottom:"1px solid #e5e7eb",background:"#f9fafb" }}>
                <h5 style={{ margin:0,fontFamily:"'Poppins',sans-serif" }}>📈 Bilan annuel {annee} par mois</h5>
              </div>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
                    {["Mois","Nb fiches","Nb visées","Alertes","Montant net","Avancement"].map(h=>(
                      <th key={h} style={{ padding:"0.875rem 1rem",textAlign:"left",fontSize:"0.75rem",fontWeight:600,color:"#1e429f",textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parMois.map((m,i)=>{
                    const pct = m.fiches.length>0 ? Math.round(m.visees/m.fiches.length*100) : 0;
                    return (
                      <tr key={m.mois} style={{ borderBottom:"1px solid #f3f4f6",background:i%2===0?"white":"#fafafa" }}>
                        <td style={{ padding:"0.875rem 1rem",fontWeight:600 }}>{m.label}</td>
                        <td style={{ padding:"0.875rem 1rem" }}>{m.fiches.length}</td>
                        <td style={{ padding:"0.875rem 1rem",color:"#057a55",fontWeight:600 }}>{m.visees}</td>
                        <td style={{ padding:"0.875rem 1rem" }}>
                          {m.alertes>0
                            ? <span style={{ background:"#fee2e2",color:"#991b1b",borderRadius:20,padding:"2px 8px",fontSize:"0.75rem",fontWeight:600 }}>⚠️ {m.alertes}</span>
                            : <span style={{ background:"#d1fae5",color:"#065f46",borderRadius:20,padding:"2px 8px",fontSize:"0.75rem",fontWeight:600 }}>✅ 0</span>
                          }
                        </td>
                        <td style={{ padding:"0.875rem 1rem",fontWeight:700,color:"#1a56db" }}>{formatMontant(m.montant)}</td>
                        <td style={{ padding:"0.875rem 1rem" }}>
                          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                            <div style={{ flex:1,height:8,background:"#e5e7eb",borderRadius:4 }}>
                              <div style={{ width:`${pct}%`,height:"100%",background:pct===100?"#057a55":"#c27803",borderRadius:4 }}/>
                            </div>
                            <span style={{ fontSize:"0.75rem",fontWeight:600,color:"#6b7280",minWidth:35 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background:"#f9fafb",fontWeight:700 }}>
                    <td style={{ padding:"1rem" }}>TOTAL {annee}</td>
                    <td style={{ padding:"1rem" }}>{stats.total}</td>
                    <td style={{ padding:"1rem",color:"#057a55" }}>{stats.total-stats.generees}</td>
                    <td style={{ padding:"1rem",color:"#991b1b" }}>{stats.nbAlertes}</td>
                    <td style={{ padding:"1rem",color:"#1a56db" }}>{formatMontant(stats.montantNet)}</td>
                    <td style={{ padding:"1rem" }}>{stats.tauxVisa}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}