import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function BonPaiement() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [mois, setMois]               = useState(new Date().getMonth() + 1);
  const [annee, setAnnee]             = useState(new Date().getFullYear());
  const [loading, setLoading]         = useState(false);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const formatMontant = (val) =>
    parseInt(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";

  const formatNombre = (val) => parseFloat(val || 0).toFixed(2);

  useEffect(() => {
    fetch(`${API}/enseignants.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setEnseignants).catch(() => {});
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
      // Seulement les fiches approuvées ou payées
      const liste = Array.isArray(data) ? data.filter(v => v.statut === "approuvee" || v.statut === "payee") : [];
      setVacations(liste);
    } catch { setVacations([]); }
    setLoading(false);
  };

  const genererBonPDF = (v) => {
    const doc   = new jsPDF();
    const numBon = `BON-${v.annee}-${String(v.mois).padStart(2,"0")}-${String(v.id).padStart(4,"0")}`;

    // En-tête
    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text("EduSchedule Pro", 105, 18, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("BON DE PAIEMENT", 105, 28, { align: "center" });

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("ISGE-BF - Institut Superieur de Genie Electrique du Burkina Faso", 105, 35, { align: "center" });

    // Numéro et date
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFillColor(235, 245, 255);
    doc.rect(15, 40, 180, 18, "F");
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(`N° : ${numBon}`, 20, 50);
    doc.text(`Date : ${new Date().toLocaleDateString("fr-FR")}`, 130, 50);
    doc.setFont(undefined, "normal");

    // Infos bénéficiaire
    doc.setDrawColor(200);
    doc.rect(15, 63, 85, 35);
    doc.rect(110, 63, 85, 35);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("BENEFICIAIRE", 20, 70);
    doc.text("ETABLISSEMENT", 115, 70);

    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setFont(undefined, "bold");
    doc.text(v.enseignant_nom, 20, 78);
    doc.setFont(undefined, "normal");
    doc.text(`Periode : ${MOIS[v.mois-1]} ${v.annee}`, 20, 85);
    doc.text(`Statut : ${v.statut === "payee" ? "PAYE" : "A PAYER"}`, 20, 92);

    doc.setFont(undefined, "bold");
    doc.text("ISGE-BF", 115, 78);
    doc.setFont(undefined, "normal");
    doc.text("Ouagadougou, Burkina Faso", 115, 85);
    doc.text(`Ref. : ${numBon}`, 115, 92);

    // Tableau lignes
    const lignes = v.lignes || [];
    autoTable(doc, {
      startY: 103,
      head:   [["Matiere", "Date", "Duree (h)", "Taux (FCFA/h)", "Montant (FCFA)"]],
      body:   lignes.map(l => [
        l.matiere || "-",
        l.date    || "-",
        formatNombre(l.duree_heures),
        parseInt(l.taux_horaire||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "),
        parseInt(l.montant||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")
      ]),
      foot: [[
        { content: "TOTAL", colSpan: 2, styles: { fontStyle: "bold" } },
        { content: formatNombre(lignes.reduce((s,l) => s+parseFloat(l.duree_heures||0),0))+"h", styles:{ fontStyle:"bold" } },
        "",
        { content: parseInt(v.montant_brut||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," "), styles:{ fontStyle:"bold" } }
      ]],
      headStyles:         { fillColor: [13, 110, 253] },
      footStyles:         { fillColor: [240, 240, 240] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });

    const fy = doc.lastAutoTable.finalY + 10;

    // Récapitulatif montants
    doc.setFillColor(248, 249, 250);
    doc.rect(110, fy, 85, 36, "F");
    doc.setDrawColor(220);
    doc.rect(110, fy, 85, 36);

    doc.setFontSize(10);
    doc.text("Montant brut :", 115, fy + 9);
    doc.text(formatMontant(v.montant_brut), 192, fy + 9, { align:"right" });
    doc.text("Retenues :",    115, fy + 18);
    doc.text(formatMontant(v.retenues || 0), 192, fy + 18, { align:"right" });

    doc.setDrawColor(13, 110, 253);
    doc.line(115, fy + 21, 192, fy + 21);

    doc.setFont(undefined, "bold");
    doc.setTextColor(13, 110, 253);
    doc.setFontSize(12);
    doc.text("NET A PAYER :", 115, fy + 30);
    doc.text(formatMontant(v.montant_net), 192, fy + 30, { align:"right" });
    doc.setFont(undefined, "normal");
    doc.setTextColor(0);

    // Signatures
    const sy = fy + 50;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Enseignant (recu le paiement)", 20, sy);
    doc.text("Comptable (signature)", 155, sy);
    doc.rect(15,  sy+4, 75, 22);
    doc.rect(148, sy+4, 47, 22);

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `EduSchedule Pro - ISGE-BF - ${numBon} - Genere le ${new Date().toLocaleDateString("fr-FR")}`,
      105, doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );

    doc.save(`bon-paiement-${v.enseignant_nom?.replace(/ /g,"-")}-${MOIS[v.mois-1]}-${v.annee}.pdf`);
  };

  const montantTotal = vacations.reduce((s,v) => s + parseFloat(v.montant_net||0), 0);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>🧾 Bons de Paiement</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Générez les bons de paiement officiels
          </p>
        </div>
        {vacations.length > 0 && (
          <div style={{
            background:"white", borderRadius:12, padding:"0.75rem 1.25rem",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)",
            borderLeft:"4px solid #1a56db"
          }}>
            <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>Montant total à payer</div>
            <div style={{ fontSize:"1.25rem", fontWeight:700, color:"#1a56db" }}>
              {formatMontant(montantTotal)}
            </div>
          </div>
        )}
      </div>

      {/* Filtres */}
      <div style={{
        background:"white", borderRadius:14, padding:"1.25rem",
        marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)"
      }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:12, alignItems:"end" }}>
          <div>
            <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Enseignant</label>
            <select value={ensId} onChange={e => setEnsId(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
              <option value="">-- Tous --</option>
              {enseignants.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>)}
            </select>
          </div>
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
            background:"linear-gradient(135deg, #1a56db, #1e429f)",
            color:"white", cursor:"pointer", fontWeight:600
          }}>🔍 Chercher</button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}><div className="spinner-border text-primary" /></div>
      ) : vacations.length === 0 ? (
        <div style={{ background:"#eff6ff", borderRadius:14, padding:"2rem", textAlign:"center", color:"#1e429f" }}>
          ℹ️ Aucun bon à générer. Seules les fiches approuvées ou payées apparaissent ici.
        </div>
      ) : (
        <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
                {["Enseignant","Période","Montant net","Statut","Action"].map(h => (
                  <th key={h} style={{
                    padding:"1rem", textAlign:"left",
                    fontSize:"0.75rem", fontWeight:600,
                    color:"#1e429f", textTransform:"uppercase", letterSpacing:"0.5px"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vacations.map((v, i) => (
                <tr key={v.id} style={{ borderBottom:"1px solid #f3f4f6", background:i%2===0?"white":"#fafafa" }}>
                  <td style={{ padding:"1rem", fontWeight:600 }}>{v.enseignant_nom}</td>
                  <td style={{ padding:"1rem", color:"#6b7280" }}>{MOIS[v.mois-1]} {v.annee}</td>
                  <td style={{ padding:"1rem", fontWeight:700, color:"#1a56db" }}>{formatMontant(v.montant_net)}</td>
                  <td style={{ padding:"1rem" }}>
                    <span style={{
                      background: v.statut==="payee" ? "#dbeafe" : "#d1fae5",
                      color: v.statut==="payee" ? "#1e429f" : "#065f46",
                      borderRadius:20, padding:"4px 12px",
                      fontSize:"0.75rem", fontWeight:600
                    }}>
                      {v.statut==="payee" ? "💰 Payée" : "✅ Approuvée"}
                    </span>
                  </td>
                  <td style={{ padding:"1rem" }}>
                    <button onClick={() => genererBonPDF(v)} style={{
                      padding:"6px 14px", borderRadius:8, border:"none",
                      background:"linear-gradient(135deg,#1a56db,#1e429f)",
                      color:"white", cursor:"pointer", fontWeight:600, fontSize:"0.8rem"
                    }}>🧾 Générer Bon PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}