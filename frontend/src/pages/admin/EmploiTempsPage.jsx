import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const BLOCS = [
  { id: "matin1", label: "7h30\nà\n9h30",  debut: "07:30", fin: "09:30" },
  { id: "matin2", label: "10h\nà\n12h15",  debut: "10:00", fin: "12:15" },
  { id: "soir",   label: "14h\nà\n17h",    debut: "14:00", fin: "17:00" },
];

const COULEURS = ["#0d6efd","#198754","#dc3545","#fd7e14","#6f42c1","#0dcaf0","#20c997"];

const JOURS_FERIES_DEFAULT = [
  { date: "2026-01-01", label: "Jour de l'An" },
  { date: "2026-01-03", label: "Fete de la Revolution" },
  { date: "2026-03-08", label: "Journee de la Femme" },
  { date: "2026-04-05", label: "Paques" },
  { date: "2026-05-01", label: "Fete du Travail" },
  { date: "2026-05-14", label: "Ascension" },
  { date: "2026-08-05", label: "Fete Nationale" },
  { date: "2026-08-15", label: "Assomption" },
  { date: "2026-11-01", label: "Toussaint" },
  { date: "2026-12-11", label: "Proclamation de la Republique" },
  { date: "2026-12-25", label: "Noel" },
];

export default function EmploiTempsPage() {
  const [classes, setClasses]           = useState([]);
  const [classeId, setClasseId]         = useState("");
  const [creneaux, setCreneaux]         = useState([]);
  const [semaine, setSemaine]           = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [showFeries, setShowFeries]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState("");
  const [matieres, setMatieres]         = useState([]);
  const [enseignants, setEnseignants]   = useState([]);
  const [salles, setSalles]             = useState([]);
  const [vueType, setVueType]           = useState("classe");
  const [vueMode, setVueMode]           = useState("semaine"); // semaine ou jour
  const [jourSelectionne, setJourSelectionne] = useState("Lundi");
  const [filtreEns, setFiltreEns]       = useState("");
  const [filtreSalle, setFiltreSalle]   = useState("");
  const [filtreMatiere, setFiltreMatiere] = useState("");
  const [joursFeries, setJoursFeries]   = useState(JOURS_FERIES_DEFAULT);
  const [nouveauFerie, setNouveauFerie] = useState({ date: "", label: "" });
  const [form, setForm] = useState({
    jour: "Lundi", heure_debut: "07:30", heure_fin: "09:30",
    id_matiere: "", id_enseignant: "", id_salle: "", type_seance: "Cours"
  });

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  useEffect(() => {
    fetch(`${API}/classes.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/matieres.php`,    { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setMatieres).catch(() => {});
    fetch(`${API}/enseignants.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setEnseignants).catch(() => {});
    fetch(`${API}/salles.php`,      { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setSalles).catch(() => {});
  }, []);

  useEffect(() => {
    const today = new Date();
    const day   = today.getDay();
    const diff  = today.getDate() - day + (day === 0 ? -6 : 1);
    const lundi = new Date(today.setDate(diff));
    setSemaine(lundi.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!semaine) return;
    if (vueType === 'classe'     && !classeId)    return;
    if (vueType === 'enseignant' && !filtreEns)   return;
    if (vueType === 'salle'      && !filtreSalle) return;
    recharger();
  }, [classeId, semaine, vueType, filtreEns, filtreSalle]);

  const recharger = () => {
    setLoading(true);
    let url = `${API}/emploi_temps.php?semaine=${semaine}`;
    if (vueType === 'classe'     && classeId)    url += `&id_classe=${classeId}`;
    if (vueType === 'enseignant' && filtreEns)   url += `&id_enseignant=${filtreEns}`;
    if (vueType === 'salle'      && filtreSalle) url += `&id_salle=${filtreSalle}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { setCreneaux(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  // Filtrer par matière
  const creneauxFiltres = filtreMatiere
    ? creneaux.filter(c => c.id_matiere == filtreMatiere)
    : creneaux;

  const estFerie = (indexJour) => {
    if (!semaine) return null;
    const d = new Date(semaine);
    d.setDate(d.getDate() + indexJour);
    const dateStr = d.toISOString().split("T")[0];
    return joursFeries.find(f => f.date === dateStr);
  };

  const getCreneauxBloc = (jour, bloc) => {
    return creneauxFiltres.filter(c => {
      if (c.jour !== jour) return false;
      const debutC = c.heure_debut.slice(0,5);
      return debutC >= bloc.debut && debutC < bloc.fin;
    });
  };

  const getCouleur = (id) => COULEURS[id % COULEURS.length];

  const handleAjouter = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${API}/emploi_temps.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, id_classe: classeId, semaine_debut: semaine })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Créneau ajouté !");
      setShowModal(false);
      recharger();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const supprimerCreneau = async (id) => {
    if (!window.confirm("Supprimer ce créneau ?")) return;
    try {
      const res = await fetch(`${API}/emploi_temps.php?id_creneau=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Créneau supprimé !");
      recharger();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const publier = async () => {
    try {
      const res = await fetch(`${API}/emploi_temps.php?action=publier`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_classe: classeId, semaine_debut: semaine })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ " + data.message);
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const dupliquer = async () => {
    try {
      const prochaineLundi = new Date(semaine);
      prochaineLundi.setDate(prochaineLundi.getDate() + 7);
      const prochaineSemaine = prochaineLundi.toISOString().split("T")[0];
      const res = await fetch(`${API}/emploi_temps.php?action=dupliquer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_classe: classeId, semaine_source: semaine, semaine_cible: prochaineSemaine })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ " + data.message);
      setSemaine(prochaineSemaine);
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const exporterPDF = async () => {
    const element = document.getElementById("grille-emploi-temps");
    if (!element) return;
    setMessage("⏳ Génération du PDF...");
    try {
      const canvas    = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData   = canvas.toDataURL("image/png");
      const pdf       = new jsPDF("landscape", "mm", "a4");
      const pdfWidth  = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFontSize(16);
      pdf.setTextColor(13, 110, 253);
      pdf.text("EduSchedule Pro - Emploi du Temps", pdfWidth / 2, 15, { align: "center" });
      const classeSelectionnee = classes.find(c => c.id == classeId);
      pdf.setFontSize(11);
      pdf.setTextColor(100);
      pdf.text(`${classeSelectionnee?.libelle || ""} - Semaine du ${semaine}`, pdfWidth / 2, 22, { align: "center" });
      pdf.addImage(imgData, "PNG", 5, 28, pdfWidth - 10, pdfHeight - 10);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`ISGE-BF - Genere le ${new Date().toLocaleDateString("fr-FR")}`,
        pdfWidth / 2, pdf.internal.pageSize.getHeight() - 5, { align: "center" });
      pdf.save(`emploi-temps-${classeSelectionnee?.code || "classe"}-${semaine}.pdf`);
      setMessage("✅ PDF exporté !");
    } catch { setMessage("❌ Erreur export PDF"); }
  };

  const ajouterFerie = () => {
    if (!nouveauFerie.date || !nouveauFerie.label) return;
    setJoursFeries([...joursFeries, nouveauFerie]);
    setNouveauFerie({ date: "", label: "" });
    setMessage("✅ Jour férié ajouté !");
  };

  const supprimerFerie = (date) => {
    setJoursFeries(joursFeries.filter(f => f.date !== date));
  };

  const semainePrec = () => {
    const d = new Date(semaine); d.setDate(d.getDate() - 7);
    setSemaine(d.toISOString().split("T")[0]);
  };

  const semaineSuiv = () => {
    const d = new Date(semaine); d.setDate(d.getDate() + 7);
    setSemaine(d.toISOString().split("T")[0]);
  };

  const getDateJour = (indexJour) => {
    if (!semaine) return "";
    const d = new Date(semaine);
    d.setDate(d.getDate() + indexJour);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  // Vue journalière — créneaux du jour sélectionné
  const creneauxJour = creneauxFiltres.filter(c => c.jour === jourSelectionne);

  const CarteCreneauJour = ({ c }) => (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body d-flex gap-3 align-items-start">
        <div className="rounded p-3 text-white text-center"
          style={{ backgroundColor: getCouleur(c.id_matiere), minWidth: 80 }}>
          <div className="fw-bold">{c.heure_debut?.slice(0,5)}</div>
          <div className="small opacity-75">à</div>
          <div className="fw-bold">{c.heure_fin?.slice(0,5)}</div>
        </div>
        <div className="flex-grow-1">
          <h5 className="fw-bold mb-1">{c.matiere}</h5>
          <p className="text-muted small mb-1">👨‍🏫 {c.enseignant}</p>
          <p className="text-muted small mb-1">🏫 {c.salle_code} — {c.salle_libelle}</p>
          {vueType !== 'classe' && (
            <p className="text-muted small mb-1">🎓 {c.classe_libelle}</p>
          )}
          <span className={`badge bg-${
            c.type_seance === 'TP' ? 'info' :
            c.type_seance === 'TD' ? 'warning' : 'primary'
          }`}>{c.type_seance}</span>
        </div>
        {vueType === 'classe' && (
          <button className="btn btn-outline-danger btn-sm"
            onClick={() => supprimerCreneau(c.id)}>
            🗑️
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">📅 Emploi du temps</h2>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}
            disabled={!classeId || !semaine}>+ Ajouter</button>
          <button className="btn btn-success btn-sm" onClick={publier}
            disabled={!classeId || !semaine}>📢 Publier</button>
          <button className="btn btn-outline-primary btn-sm" onClick={dupliquer}
            disabled={!classeId || !semaine}>📋 Dupliquer →</button>
          <button className="btn btn-danger btn-sm" onClick={exporterPDF}
            disabled={!classeId || creneaux.length === 0}>📄 PDF</button>
          <button className="btn btn-outline-warning btn-sm"
            onClick={() => setShowFeries(!showFeries)}>
            🗓️ Jours fériés
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-info alert-dismissible">
          {message}
          <button className="btn-close" onClick={() => setMessage("")} />
        </div>
      )}

      {/* Jours fériés */}
      {showFeries && (
        <div className="card border-0 shadow-sm mb-4 border-warning">
          <div className="card-header bg-warning bg-opacity-10">
            <h6 className="fw-bold mb-0">🗓️ Gestion des Jours Fériés</h6>
          </div>
          <div className="card-body">
            <div className="row g-2 mb-3">
              <div className="col-md-4">
                <input type="date" className="form-control form-control-sm"
                  value={nouveauFerie.date}
                  onChange={e => setNouveauFerie({...nouveauFerie, date: e.target.value})} />
              </div>
              <div className="col-md-5">
                <input type="text" className="form-control form-control-sm"
                  placeholder="Ex: Fete Nationale"
                  value={nouveauFerie.label}
                  onChange={e => setNouveauFerie({...nouveauFerie, label: e.target.value})} />
              </div>
              <div className="col-md-3">
                <button className="btn btn-warning btn-sm w-100" onClick={ajouterFerie}>
                  + Ajouter
                </button>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {joursFeries.map(f => (
                <span key={f.date} className="badge bg-warning text-dark d-flex align-items-center gap-1">
                  📅 {f.date} — {f.label}
                  <button className="btn-close btn-close-sm ms-1"
                    style={{ fontSize: 8 }}
                    onClick={() => supprimerFerie(f.date)} />
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label fw-semibold">Vue par</label>
              <select className="form-select" value={vueType}
                onChange={e => { setVueType(e.target.value); setCreneaux([]); }}>
                <option value="classe">🏫 Classe</option>
                <option value="enseignant">👨‍🏫 Enseignant</option>
                <option value="salle">🏛️ Salle</option>
              </select>
            </div>
            <div className="col-md-3">
              {vueType === 'classe' && (
                <>
                  <label className="form-label fw-semibold">Classe</label>
                  <select className="form-select" value={classeId}
                    onChange={e => setClasseId(e.target.value)}>
                    <option value="">-- Choisir --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.libelle}</option>)}
                  </select>
                </>
              )}
              {vueType === 'enseignant' && (
                <>
                  <label className="form-label fw-semibold">Enseignant</label>
                  <select className="form-select" value={filtreEns}
                    onChange={e => setFiltreEns(e.target.value)}>
                    <option value="">-- Choisir --</option>
                    {enseignants.map(e => (
                      <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                    ))}
                  </select>
                </>
              )}
              {vueType === 'salle' && (
                <>
                  <label className="form-label fw-semibold">Salle</label>
                  <select className="form-select" value={filtreSalle}
                    onChange={e => setFiltreSalle(e.target.value)}>
                    <option value="">-- Choisir --</option>
                    {salles.map(s => <option key={s.id} value={s.id}>{s.libelle}</option>)}
                  </select>
                </>
              )}
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Matière</label>
              <select className="form-select" value={filtreMatiere}
                onChange={e => setFiltreMatiere(e.target.value)}>
                <option value="">-- Toutes --</option>
                {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label fw-semibold">Semaine du</label>
              <input type="date" className="form-control" value={semaine}
                onChange={e => setSemaine(e.target.value)} />
            </div>
            <div className="col-md-3 d-flex gap-2 align-items-end">
              <button className="btn btn-outline-secondary btn-sm" onClick={semainePrec}>← Préc.</button>
              <button className="btn btn-outline-secondary btn-sm" onClick={semaineSuiv}>Suiv. →</button>
            </div>
          </div>

          {/* Mode vue */}
          <div className="mt-3 d-flex gap-2">
            <button className={`btn btn-sm ${vueMode === 'semaine' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setVueMode('semaine')}>
              📅 Vue semaine
            </button>
            <button className={`btn btn-sm ${vueMode === 'jour' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setVueMode('jour')}>
              📆 Vue journalière
            </button>
          </div>
        </div>
      </div>

      {/* Vue journalière */}
      {vueMode === 'jour' && (
        <div>
          {/* Sélecteur de jour */}
          <div className="d-flex gap-2 mb-4 flex-wrap">
            {JOURS.map((j, i) => {
              const ferie = estFerie(i);
              return (
                <button key={j}
                  className={`btn btn-sm ${jourSelectionne === j ? 'btn-primary' : 'btn-outline-primary'} ${ferie ? 'border-warning' : ''}`}
                  onClick={() => setJourSelectionne(j)}>
                  {j}
                  <div className="small">{getDateJour(i)}</div>
                  {ferie && <div className="badge bg-warning text-dark ms-1" style={{ fontSize: 8 }}>Férié</div>}
                </button>
              );
            })}
          </div>

          {/* Créneaux du jour */}
          <div className="card border-0 shadow-sm" id="grille-emploi-temps">
            <div className="card-header bg-white border-0 pt-3">
              <h5 className="fw-bold mb-0">
                📆 {jourSelectionne} — {getDateJour(JOURS.indexOf(jourSelectionne))}
                {estFerie(JOURS.indexOf(jourSelectionne)) && (
                  <span className="badge bg-warning text-dark ms-2">
                    🗓️ {estFerie(JOURS.indexOf(jourSelectionne))?.label}
                  </span>
                )}
              </h5>
            </div>
            <div className="card-body">
              {creneauxJour.length === 0 ? (
                <div className="text-center text-muted p-4">
                  {estFerie(JOURS.indexOf(jourSelectionne))
                    ? "🗓️ Jour férié — Pas de cours"
                    : "Aucun cours ce jour"}
                </div>
              ) : (
                creneauxJour
                  .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut))
                  .map(c => <CarteCreneauJour key={c.id} c={c} />)
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vue semaine */}
      {vueMode === 'semaine' && (
        loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary" /></div>
        ) : (
          <div className="card border-0 shadow-sm" id="grille-emploi-temps">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-bordered mb-0" style={{ minWidth: 800 }}>
                  <thead className="table-primary">
                    <tr>
                      <th style={{ width: 80 }} className="text-center">Horaire</th>
                      {JOURS.map((j, i) => {
                        const ferie = estFerie(i);
                        return (
                          <th key={j} className={`text-center ${ferie ? 'bg-warning bg-opacity-25' : ''}`}>
                            <div>{j}</div>
                            <div className="small fw-normal opacity-75">{getDateJour(i)}</div>
                            {ferie && (
                              <div className="badge bg-warning text-dark" style={{ fontSize: 9 }}>
                                🗓️ {ferie.label}
                              </div>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {BLOCS.map((bloc, bi) => (
                      <>
                        <tr key={bloc.id} style={{ height: 100 }}>
                          <td className="text-center fw-semibold small bg-light"
                            style={{ whiteSpace: "pre-line", verticalAlign: "middle" }}>
                            {bloc.label}
                          </td>
                          {JOURS.map((jour, ji) => {
                            const ferie = estFerie(ji);
                            const cs    = getCreneauxBloc(jour, bloc);
                            return (
                              <td key={jour} className={`p-1 ${ferie ? 'bg-warning bg-opacity-10' : ''}`}
                                style={{ verticalAlign: "top" }}>
                                {ferie ? (
                                  <div className="text-center text-warning-emphasis small p-2">
                                    🗓️ Jour férié
                                  </div>
                                ) : cs.map(c => (
                                  <div key={c.id} className="rounded p-2 text-white position-relative"
                                    style={{ backgroundColor: getCouleur(c.id_matiere), fontSize: 11, minHeight: 80 }}>
                                    <strong>{c.matiere}</strong><br />
                                    {vueType !== 'enseignant' && <span className="opacity-90">{c.enseignant}<br /></span>}
                                    {vueType !== 'classe'     && <span className="opacity-90">{c.classe_libelle}<br /></span>}
                                    {vueType !== 'salle'      && <span className="opacity-75">🏫 {c.salle_code}<br /></span>}
                                    <span className="opacity-75">⏰ {c.heure_debut?.slice(0,5)}-{c.heure_fin?.slice(0,5)}</span>
                                    <span className="badge bg-light text-dark ms-1" style={{ fontSize: 9 }}>{c.type_seance}</span>
                                    {vueType === 'classe' && (
                                      <button
                                        className="btn btn-sm position-absolute top-0 end-0 p-0 text-white"
                                        style={{ fontSize: 10, background: "none", border: "none" }}
                                        onClick={() => supprimerCreneau(c.id)}
                                        title="Supprimer">✕</button>
                                    )}
                                  </div>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                        {bi < BLOCS.length - 1 && (
                          <tr key={`pause-${bi}`} style={{ height: 30, backgroundColor: "#f8f9fa" }}>
                            <td className="text-center text-muted small" style={{ verticalAlign: "middle" }}>
                              {bi === 0 ? "⏸️ 9h30-10h" : "🍽️ 12h15-14h"}
                            </td>
                            <td colSpan={6} className="text-center text-muted small" style={{ verticalAlign: "middle" }}>
                              {bi === 0 ? "Pause" : "Pause dejeuner"}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">➕ Nouveau créneau</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleAjouter}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label">Jour</label>
                      <select className="form-select" value={form.jour}
                        onChange={e => setForm({...form, jour: e.target.value})}>
                        {JOURS.map(j => <option key={j}>{j}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">Bloc horaire</label>
                      <select className="form-select"
                        onChange={e => {
                          const bloc = BLOCS.find(b => b.id === e.target.value);
                          if (bloc) setForm({...form, heure_debut: bloc.debut, heure_fin: bloc.fin});
                        }}>
                        {BLOCS.map(b => (
                          <option key={b.id} value={b.id}>{b.label.replace(/\n/g,' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label">Début</label>
                      <input type="time" className="form-control" value={form.heure_debut}
                        onChange={e => setForm({...form, heure_debut: e.target.value})} />
                    </div>
                    <div className="col-3">
                      <label className="form-label">Fin</label>
                      <input type="time" className="form-control" value={form.heure_fin}
                        onChange={e => setForm({...form, heure_fin: e.target.value})} />
                    </div>
                    <div className="col-6">
                      <label className="form-label">Type</label>
                      <select className="form-select" value={form.type_seance}
                        onChange={e => setForm({...form, type_seance: e.target.value})}>
                        <option>Cours</option>
                        <option>TD</option>
                        <option>TP</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Matière</label>
                      <select className="form-select" value={form.id_matiere} required
                        onChange={e => setForm({...form, id_matiere: e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {matieres.map(m => <option key={m.id} value={m.id}>{m.libelle}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Enseignant</label>
                      <select className="form-select" value={form.id_enseignant} required
                        onChange={e => setForm({...form, id_enseignant: e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {enseignants.map(e => (
                          <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Salle</label>
                      <select className="form-select" value={form.id_salle} required
                        onChange={e => setForm({...form, id_salle: e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {salles.map(s => <option key={s.id} value={s.id}>{s.libelle}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">Ajouter</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}