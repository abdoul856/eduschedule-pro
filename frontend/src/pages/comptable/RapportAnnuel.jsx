import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function RapportAnnuel() {
  const [vacations, setVacations] = useState([]);
  const [annee, setAnnee]         = useState(new Date().getFullYear());
  const [loading, setLoading]     = useState(false);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const formatMontant = (val) =>
    parseInt(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

  const charger = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/vacations.php?annee=${annee}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVacations(Array.isArray(data) ? data : []);
    } catch { setVacations([]); }
    setLoading(false);
  };

  // Grouper par mois
  const parMois = MOIS.map((label, i) => {
    const fiches = vacations.filter(v => parseInt(v.mois) === i + 1);
    return {
      mois: i + 1, label,
      total:      fiches.length,
      payees:     fiches.filter(v => v.statut === "payee").length,
      montantBrut: fiches.reduce((s,v) => s + parseFloat(v.montant_brut||0), 0),
      montantNet:  fiches.reduce((s,v) => s + parseFloat(v.montant_net||0), 0),
    };
  });

  const totaux = {
    fiches:      vacations.length,
    payees:      vacations.filter(v => v.statut === "payee").length,
    montantBrut: vacations.reduce((s,v) => s + parseFloat(v.montant_brut||0), 0),
    montantNet:  vacations.reduce((s,v) => s + parseFloat(v.montant_net||0), 0),
  };

  const exporterPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text("EduSchedule Pro", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`RAPPORT ANNUEL ${annee}`, 105, 28, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("ISGE-BF — Institut Superieur de Genie Electrique du Burkina Faso", 105, 36, { align: "center" });

    doc.setDrawColor(13, 110, 253);
    doc.line(20, 40, 190, 40);

    // Récap global
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total fiches : ${totaux.fiches}`,                    20, 50);
    doc.text(`Fiches payees : ${totaux.payees}`,                   20, 57);
    doc.text(`Montant brut annuel : ${formatMontant(totaux.montantBrut)}`, 110, 50);
    doc.text(`Montant net annuel  : ${formatMontant(totaux.montantNet)}`,  110, 57);

    doc.line(20, 62, 190, 62);

    // Tableau par mois
    autoTable(doc, {
      startY: 67,
      head:   [["Mois", "Nb fiches", "Nb payees", "Montant brut (FCFA)", "Montant net (FCFA)"]],
      body:   parMois.filter(m => m.total > 0).map(m => [
        m.label,
        m.total,
        m.payees,
        parseInt(m.montantBrut).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
        parseInt(m.montantNet).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
      ]),
      foot: [[
        { content: `TOTAL ${annee}`, styles: { fontStyle: "bold" } },
        { content: totaux.fiches, styles: { fontStyle: "bold" } },
        { content: totaux.payees, styles: { fontStyle: "bold" } },
        { content: parseInt(totaux.montantBrut).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "), styles: { fontStyle: "bold" } },
        { content: parseInt(totaux.montantNet).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "), styles: { fontStyle: "bold" } },
      ]],
      headStyles:         { fillColor: [13, 110, 253] },
      footStyles:         { fillColor: [240, 240, 240] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });

    const fy = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Rapport annuel ${annee} — Genere le ${new Date().toLocaleDateString("fr-FR")} — EduSchedule Pro / ISGE-BF`,
      105, doc.internal.pageSize.getHeight() - 8, { align: "center" });

    doc.save(`rapport-annuel-${annee}.pdf`);
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📈 Rapport Annuel</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Bilan complet de l'année scolaire
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

      {/* Filtre année */}
      <div style={{ background:"white", borderRadius:14, padding:"1.25rem", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:12, alignItems:"end", maxWidth:300 }}>
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
          ℹ️ Entrez une année et cliquez sur Générer.
        </div>
      ) : (
        <>
          {/* KPIs annuels */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:"1.5rem" }}>
            {[
              { icon:"📋", label:"Total fiches",     value:totaux.fiches,      color:"#1a56db", bg:"#dbeafe" },
              { icon:"💰", label:"Fiches payées",     value:totaux.payees,      color:"#057a55", bg:"#d1fae5" },
              { icon:"📦", label:"Montant brut",
                value:totaux.montantBrut.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ") + " F",
                color:"#374151", bg:"#f3f4f6" },
              { icon:"🏦", label:"Montant net total",
                value:totaux.montantNet.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ") + " F",
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
                  <div style={{ fontSize:"1.25rem", fontWeight:700, color:"#111928", lineHeight:1 }}>{k.value}</div>
                  <div style={{ fontSize:"0.8rem", color:"#6b7280", marginTop:4 }}>{k.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Tableau par mois */}
          <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <div style={{ padding:"1rem 1.5rem", borderBottom:"1px solid #e5e7eb" }}>
              <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📅 Détail par mois — {annee}</h5>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
                  {["Mois","Nb fiches","Nb payées","Montant brut","Montant net","Avancement"].map(h => (
                    <th key={h} style={{ padding:"1rem", textAlign:"left", fontSize:"0.75rem", fontWeight:600, color:"#1e429f", textTransform:"uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parMois.filter(m => m.total > 0).map((m, i) => {
                  const pct = m.total > 0 ? Math.round(m.payees / m.total * 100) : 0;
                  return (
                    <tr key={m.mois} style={{ borderBottom:"1px solid #f3f4f6", background:i%2===0?"white":"#fafafa" }}>
                      <td style={{ padding:"0.875rem 1rem", fontWeight:600 }}>{m.label}</td>
                      <td style={{ padding:"0.875rem 1rem" }}>{m.total}</td>
                      <td style={{ padding:"0.875rem 1rem", color:"#057a55", fontWeight:600 }}>{m.payees}</td>
                      <td style={{ padding:"0.875rem 1rem" }}>{formatMontant(m.montantBrut)}</td>
                      <td style={{ padding:"0.875rem 1rem", fontWeight:700, color:"#1a56db" }}>{formatMontant(m.montantNet)}</td>
                      <td style={{ padding:"0.875rem 1rem" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ flex:1, height:8, background:"#e5e7eb", borderRadius:4 }}>
                            <div style={{ width:`${pct}%`, height:"100%", background: pct===100?"#057a55":"#1a56db", borderRadius:4 }} />
                          </div>
                          <span style={{ fontSize:"0.75rem", fontWeight:600, color:"#6b7280", minWidth:35 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#f9fafb", fontWeight:700 }}>
                  <td style={{ padding:"1rem" }}>TOTAL {annee}</td>
                  <td style={{ padding:"1rem" }}>{totaux.fiches}</td>
                  <td style={{ padding:"1rem", color:"#057a55" }}>{totaux.payees}</td>
                  <td style={{ padding:"1rem" }}>{formatMontant(totaux.montantBrut)}</td>
                  <td style={{ padding:"1rem", color:"#1a56db" }}>{formatMontant(totaux.montantNet)}</td>
                  <td style={{ padding:"1rem" }}>
                    {totaux.fiches > 0 ? Math.round(totaux.payees/totaux.fiches*100) : 0}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}