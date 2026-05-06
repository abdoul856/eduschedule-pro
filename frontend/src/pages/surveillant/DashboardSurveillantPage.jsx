import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function DashboardSurveillantPage() {
  const [vacations, setVacations]     = useState([]);
  const [enseignants, setEnseignants] = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [mois, setMois]               = useState(new Date().getMonth() + 1);
  const [annee, setAnnee]             = useState(new Date().getFullYear());
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(false);

  const token = localStorage.getItem("edu_token");
  const user  = JSON.parse(localStorage.getItem("edu_user") || "{}");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const STATUT_COLORS = {
    generee:           "secondary",
    visee_surveillant: "warning",
    approuvee:         "success",
    payee:             "primary"
  };

  const STATUT_LABELS = {
    generee:           "Generee",
    visee_surveillant: "Visee surveillant",
    approuvee:         "Approuvee",
    payee:             "Payee"
  };

  const formatMontant = (val) => {
    const n = parseInt(val || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
  };

  const formatNombre = (val) => parseFloat(val || 0).toFixed(2);

  useEffect(() => {
    fetch(`${API}/enseignants.php`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setEnseignants)
      .catch(() => {});
  }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mois, annee });
      if (ensId) params.append('id_enseignant', ensId);
      const res  = await fetch(`${API}/vacations.php?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setVacations(Array.isArray(data) ? data : []);
    } catch { setVacations([]); }
    setLoading(false);
  };

  const generer = async () => {
    if (!ensId) { setMessage("Choisissez un enseignant"); return; }
    try {
      const res = await fetch(`${API}/vacations.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_enseignant: ensId, mois, annee })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      let msg = "Fiche generee : " + data.message;
      if (data.alertes && data.alertes.length > 0) {
        msg += " — " + data.alertes.join(", ");
      }
      setMessage(msg);
      charger();
    } catch (err) { setMessage(err.message); }
  };

  const valider = async (id, action) => {
    try {
      const res = await fetch(`${API}/vacations.php?id=${id}&action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ commentaire: "Valide" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage(data.message);
      charger();
    } catch (err) { setMessage(err.message); }
  };

  const exporterPDF = (v) => {
    const doc = new jsPDF();

    // En-tete
    doc.setFontSize(18);
    doc.setTextColor(13, 110, 253);
    doc.text("EduSchedule Pro", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("FICHE DE VACATION", 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("ISGE-BF - Institut Superieur de Genie Electrique du Burkina Faso",
      105, 38, { align: "center" });

    // Infos enseignant
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Enseignant : ${v.enseignant_nom}`,         20,  52);
    doc.text(`Periode : ${MOIS[v.mois-1]} ${v.annee}`,  20,  60);
    doc.text(`Statut : ${STATUT_LABELS[v.statut]}`,      20,  68);
    doc.text(`Genere le : ${new Date().toLocaleDateString("fr-FR")}`, 140, 52);

    // Separateur
    doc.setDrawColor(13, 110, 253);
    doc.setLineWidth(0.5);
    doc.line(20, 73, 190, 73);

    // Tableau des seances
    const lignes = v.lignes || [];
    autoTable(doc, {
      startY: 78,
      head: [["Matiere", "Semaine", "Duree (h)", "Taux (FCFA/h)", "Montant (FCFA)"]],
      body: lignes.map(l => [
        l.matiere || "-",
        l.date    || "-",
        formatNombre(l.duree_heures),
        parseInt(l.taux_horaire || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "),
        parseInt(l.montant      || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
      ]),
      foot: [[
        { content: "TOTAL", colSpan: 2, styles: { fontStyle: "bold" } },
        { content: formatNombre(lignes.reduce((s,l) => s + parseFloat(l.duree_heures||0), 0)), styles: { fontStyle: "bold" } },
        "",
        { content: parseInt(v.montant_brut||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "), styles: { fontStyle: "bold" } }
      ]],
      headStyles:         { fillColor: [13, 110, 253] },
      footStyles:         { fillColor: [240, 240, 240] },
      alternateRowStyles: { fillColor: [248, 249, 250] },
    });

    const finalY = doc.lastAutoTable.finalY + 15;

    // Montants
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Montant brut :`, 120, finalY);
    doc.text(formatMontant(v.montant_brut), 175, finalY, { align: "right" });
    doc.text(`Retenues :`, 120, finalY + 8);
    doc.text(formatMontant(v.retenues || 0), 175, finalY + 8, { align: "right" });

    doc.setFontSize(13);
    doc.setTextColor(13, 110, 253);
    doc.text(`Montant net :`, 120, finalY + 18);
    doc.text(formatMontant(v.montant_net), 175, finalY + 18, { align: "right" });

    // Alertes
    if (v.alertes && v.alertes.length > 0) {
      doc.setFontSize(9);
      doc.setTextColor(200, 100, 0);
      doc.text("Alertes de coherence :", 20, finalY);
      v.alertes.forEach((a, i) => {
        const alerteSimple = a.replace(/[^\x00-\x7F]/g, "?");
        doc.text(`- ${alerteSimple}`, 22, finalY + 6 + (i * 5));
      });
    }

    // Signatures
    doc.setFontSize(10);
    doc.setTextColor(0);
    const sigY = finalY + 35;
    doc.text("Signature Enseignant", 30,  sigY);
    doc.text("Visa Surveillant",     95,  sigY);
    doc.text("Validation Comptable", 155, sigY);
    doc.rect(20,  sigY + 5, 60, 25);
    doc.rect(85,  sigY + 5, 60, 25);
    doc.rect(148, sigY + 5, 60, 25);

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "EduSchedule Pro - ISGE-BF - Document genere automatiquement",
      105,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    doc.save(`vacation-${v.enseignant_nom?.replace(/ /g,'-')}-${MOIS[v.mois-1]}-${v.annee}.pdf`);
  };

  return (
    <div>
      <h2 className="mb-4">🔍 Contrôle des Vacations</h2>

      {message && (
        <div className="alert alert-info alert-dismissible">
          {message}
          <button className="btn-close" onClick={() => setMessage("")} />
        </div>
      )}

      {/* Filtres */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Enseignant</label>
              <select className="form-select" value={ensId}
                onChange={e => setEnsId(e.target.value)}>
                <option value="">-- Tous --</option>
                {enseignants.map(e => (
                  <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Mois</label>
              <select className="form-select" value={mois}
                onChange={e => setMois(e.target.value)}>
                {MOIS.map((m, i) => (
                  <option key={i+1} value={i+1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Année</label>
              <input type="number" className="form-control" value={annee}
                onChange={e => setAnnee(e.target.value)} />
            </div>
            <div className="col-md-3 d-flex align-items-end gap-2">
              <button className="btn btn-outline-primary" onClick={charger}>
                🔍 Chercher
              </button>
              {user.role === 'surveillant' && (
                <button className="btn btn-primary" onClick={generer}
                  disabled={!ensId}>
                  ⚙️ Générer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : vacations.length === 0 ? (
        <div className="alert alert-info">
          Aucune fiche trouvée. Ajustez les filtres ou générez une fiche.
        </div>
      ) : vacations.map(v => (
        <div key={v.id} className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            {/* En-tête fiche */}
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 className="fw-bold mb-1">{v.enseignant_nom}</h5>
                <p className="text-muted small mb-1">
                  📅 {MOIS[v.mois-1]} {v.annee}
                </p>
                <span className={`badge bg-${STATUT_COLORS[v.statut]}`}>
                  {STATUT_LABELS[v.statut]}
                </span>
              </div>
              <div className="text-end">
                <div className="fs-4 fw-bold text-primary">
                  {formatMontant(v.montant_net)}
                </div>
                <div className="text-muted small">
                  Brut : {formatMontant(v.montant_brut)}
                </div>
              </div>
            </div>

            {/* Alertes */}
            {v.alertes && v.alertes.length > 0 && (
              <div className="alert alert-warning py-2 mb-3">
                <strong>⚠️ Alertes de cohérence :</strong>
                <ul className="mb-0 mt-1">
                  {v.alertes.map((a, i) => (
                    <li key={i} className="small">{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tableau */}
            {v.lignes && v.lignes.length > 0 && (
              <div className="table-responsive mb-3">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Matière</th>
                      <th>Semaine</th>
                      <th>Durée (h)</th>
                      <th>Taux (FCFA)</th>
                      <th>Montant</th>
                      <th>Pointage QR</th>
                      <th>Cahier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.lignes.map((l, i) => (
                      <tr key={i}>
                        <td>{l.matiere}</td>
                        <td>{l.date}</td>
                        <td>{formatNombre(l.duree_heures)}</td>
                        <td>{formatMontant(l.taux_horaire)}</td>
                        <td>{formatMontant(l.montant)}</td>
                        <td>
                          {l.pointage_id
                            ? <span className="badge bg-success">✅ Pointé</span>
                            : <span className="badge bg-danger">❌ Absent</span>
                          }
                        </td>
                        <td>
                          {l.statut_cahier === 'cloture'
                            ? <span className="badge bg-success">✅ Clôturé</span>
                            : <span className="badge bg-warning text-dark">⏳ En cours</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-light fw-bold">
                    <tr>
                      <td colSpan={2}>Total</td>
                      <td>{formatNombre(v.lignes.reduce((s,l) => s + parseFloat(l.duree_heures||0), 0))}</td>
                      <td></td>
                      <td>{formatMontant(v.montant_brut)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Actions */}
            <div className="d-flex gap-2 flex-wrap">
              <button className="btn btn-outline-danger btn-sm"
                onClick={() => exporterPDF(v)}>
                📄 Exporter PDF
              </button>
              {v.statut === 'generee' && user.role === 'surveillant' && (
                <button className="btn btn-warning btn-sm"
                  onClick={() => valider(v.id, 'valider')}>
                  👁️ Viser (Surveillant)
                </button>
              )}
              {v.statut === 'visee_surveillant' && user.role === 'comptable' && (
                <button className="btn btn-success btn-sm"
                  onClick={() => valider(v.id, 'approuver')}>
                  ✅ Approuver (Comptable)
                </button>
              )}
              {v.statut === 'approuvee' && user.role === 'comptable' && (
                <button className="btn btn-primary btn-sm"
                  onClick={() => valider(v.id, 'payer')}>
                  💰 Marquer Payée
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}