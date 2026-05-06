import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RapportMensuel() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [mois, setMois]               = useState(new Date().getMonth() + 1);
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
      const res  = await fetch(`${API}/vacations.php?mois=${mois}&annee=${annee}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVacations(Array.isArray(data) ? data : []);
    } catch { setVacations([]); }
    setLoading(false);
  };

  const stats = {
    total:      vacations.length,
    generees:   vacations.filter(v => v.statut === "generee").length,
    visees:     vacations.filter(v => v.statut === "visee_surveillant").length,
    approuvees: vacations.filter(v => v.statut === "approuvee").length,
    payees:     vacations.filter(v => v.statut === "payee").length,
    montantBrut: vacations.reduce((s,v) => s + parseFloat(v.montant_brut||0), 0),
    montantNet:  vacations.reduce((s,v) => s + parseFloat(v.montant_net||0), 0),
    retenues:    vacations.reduce((s,v) => s + parseFloat(v.retenues||0), 0),
  };

  const exporterPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text("EduSchedule Pro", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("RAPPORT MENSUEL DES VACATIONS", 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ISGE-BF — ${MOIS[mois-1]} ${annee}`, 105, 36, { align: "center" });

    doc.setDrawColor(13, 110, 253);
    doc.setLineWidth(0.5);
    doc.line(20, 40, 190, 40);

    // Résumé stats
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont(undefined, "bold");
    doc.text("RESUME STATISTIQUE", 20, 50);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Total fiches      : ${stats.total}`,         20, 58);
    doc.text(`Generees          : ${stats.generees}`,      20, 65);
    doc.text(`Visees            : ${stats.visees}`,        20, 72);
    doc.text(`Approuvees        : ${stats.approuvees}`,    110, 58);
    doc.text(`Payees            : ${stats.payees}`,        110, 65);
    doc.text(`Taux paiement     : ${stats.total > 0 ? Math.round(stats.payees/stats.total*100) : 0}%`, 110, 72);

    doc.setDrawColor(200);
    doc.line(20, 77, 190, 77);

    // Montants
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("MONTANTS", 20, 85);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    doc.text(`Montant brut total :`, 20, 93);
    doc.text(formatMontant(stats.montantBrut), 190, 93, { align: "right" });
    doc.text(`Total retenues :`,     20, 100);
    doc.text(formatMontant(stats.retenues),    190, 100, { align: "right" });
    doc.setTextColor(13, 110, 253);
    doc.setFont(undefined, "bold");
    doc.text(`Montant net total :`,  20, 108);
    doc.text(formatMontant(stats.montantNet),  190, 108, { align: "right" });
    doc.setTextColor(0);
    doc.setFont(undefined, "normal");

    doc.line(20, 113, 190, 113);

    // Tableau détail
    autoTable(doc, {
      startY: 118,
      head:   [["Enseignant", "Montant brut", "Retenues", "Montant net", "Statut"]],
      body:   vacations.map(v => [
        v.enseignant_nom,
        parseInt(v.montant_brut||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
        parseInt(v.retenues||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
        parseInt(v.montant_net||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
        v.statut
      ]),
      foot: [[
        { content: "TOTAL", styles: { fontStyle: "bold" } },
        { content: parseInt(stats.montantBrut).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "), styles: { fontStyle: "bold" } },
        { content: parseInt(stats.retenues).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "), styles: { fontStyle: "bold" } },
        { content: parseInt(stats.montantNet).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "), styles: { fontStyle: "bold" } },
        ""
      ]],
      headStyles:         { fillColor: [13, 110, 253] },
      footStyles:         { fillColor: [240, 240, 240] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });

    const fy = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Rapport genere le ${new Date().toLocaleDateString("fr-FR")} — EduSchedule Pro / ISGE-BF`,
      105, fy, { align: "center" });

    doc.setFontSize(8);
    doc.text("EduSchedule Pro - ISGE-BF - Document genere automatiquement",
      105, doc.internal.pageSize.getHeight() - 8, { align: "center" });

    doc.save(`rapport-mensuel-${MOIS[mois-1]}-${annee}.pdf`);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📊 Rapport Mensuel</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Synthèse mensuelle des vacations et paiements
          </p>
        </div>
        {vacations.length > 0 && (
          <button onClick={exporterPDF} style={{
            background:"linear-gradient(135deg,#057a55,#046c4e)",
            color:"white", border:"none", borderRadius:10,
            padding:"10px 20px", fontWeight:600, fontSize:"0.875rem",
            cursor:"pointer", boxShadow:"0 4px 12px rgba(5,122,85,0.4)"
          }}>📄 Exporter PDF</button>
        )}
      </div>

      {/* Filtres */}
      <div style={{ background:"white", borderRadius:14, padding:"1.25rem", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:12, alignItems:"end" }}>
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
            background:"linear-gradient(135deg,#1a56db,#1e429f)",
            color:"white", cursor:"pointer", fontWeight:600
          }}>🔍 Générer</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}><div className="spinner-border text-primary" /></div>
      ) : vacations.length === 0 ? (
        <div style={{ background:"#eff6ff", borderRadius:14, padding:"2rem", textAlign:"center", color:"#1e429f" }}>
          ℹ️ Sélectionnez un mois et cliquez sur Générer.
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:"1.5rem" }}>
            {[
              { icon:"📋", label:"Total fiches",    value:stats.total,      color:"#1a56db", bg:"#dbeafe" },
              { icon:"✅", label:"Payées",           value:stats.payees,     color:"#057a55", bg:"#d1fae5" },
              { icon:"⏳", label:"En attente",       value:stats.visees + stats.approuvees, color:"#c27803", bg:"#fef3c7" },
              { icon:"🏦", label:"Montant net total",
                value: stats.montantNet.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ") + " F",
                color:"#0694a2", bg:"#cffafe" },
            ].map((k,i) => (
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

          {/* Récapitulatif montants */}
          <div style={{ background:"white", borderRadius:16, padding:"1.5rem", marginBottom:"1.5rem", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <h5 style={{ margin:"0 0 1rem", fontFamily:"'Poppins',sans-serif", color:"#111928" }}>💰 Récapitulatif financier — {MOIS[mois-1]} {annee}</h5>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
              {[
                { label:"Montant brut total", value:stats.montantBrut, color:"#374151" },
                { label:"Total retenues",     value:stats.retenues,    color:"#991b1b" },
                { label:"Montant net total",  value:stats.montantNet,  color:"#1a56db" },
              ].map((item,i) => (
                <div key={i} style={{ background:"#f9fafb", borderRadius:12, padding:"1.25rem", textAlign:"center" }}>
                  <div style={{ fontSize:"1.5rem", fontWeight:700, color:item.color }}>{formatMontant(item.value)}</div>
                  <div style={{ fontSize:"0.8rem", color:"#6b7280", marginTop:6 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tableau détail */}
          <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
                  {["Enseignant","Montant brut","Retenues","Montant net","Statut"].map(h => (
                    <th key={h} style={{ padding:"1rem", textAlign:"left", fontSize:"0.75rem", fontWeight:600, color:"#1e429f", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vacations.map((v,i) => (
                  <tr key={v.id} style={{ borderBottom:"1px solid #f3f4f6", background:i%2===0?"white":"#fafafa" }}>
                    <td style={{ padding:"0.875rem 1rem", fontWeight:600 }}>{v.enseignant_nom}</td>
                    <td style={{ padding:"0.875rem 1rem" }}>{formatMontant(v.montant_brut)}</td>
                    <td style={{ padding:"0.875rem 1rem", color:"#991b1b" }}>{formatMontant(v.retenues||0)}</td>
                    <td style={{ padding:"0.875rem 1rem", fontWeight:700, color:"#1a56db" }}>{formatMontant(v.montant_net)}</td>
                    <td style={{ padding:"0.875rem 1rem" }}>
                      <span style={{
                        background: v.statut==="payee"?"#dbeafe":v.statut==="approuvee"?"#d1fae5":v.statut==="visee_surveillant"?"#fef3c7":"#f3f4f6",
                        color: v.statut==="payee"?"#1e429f":v.statut==="approuvee"?"#065f46":v.statut==="visee_surveillant"?"#92400e":"#374151",
                        borderRadius:20, padding:"3px 12px", fontSize:"0.75rem", fontWeight:600
                      }}>● {v.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f9fafb", fontWeight:700 }}>
                  <td style={{ padding:"1rem" }}>Total ({vacations.length} fiches)</td>
                  <td style={{ padding:"1rem" }}>{formatMontant(stats.montantBrut)}</td>
                  <td style={{ padding:"1rem", color:"#991b1b" }}>{formatMontant(stats.retenues)}</td>
                  <td style={{ padding:"1rem", color:"#1a56db" }}>{formatMontant(stats.montantNet)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}