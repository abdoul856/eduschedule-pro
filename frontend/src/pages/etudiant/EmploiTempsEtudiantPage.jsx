// Auteur : DAOUGA Said Alfred
// Module : Délégué/Étudiant - Cahier texte, historique, PDF
// Date : Mai 2026

import { useState, useEffect } from "react";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

const BLOCS = [
  { id: "matin1", label: "7h30\nà\n9h30",  debut: "07:30", fin: "09:30" },
  { id: "matin2", label: "10h\nà\n12h15",  debut: "10:00", fin: "12:15" },
  { id: "soir",   label: "14h\nà\n17h",    debut: "14:00", fin: "17:00" },
];

const COULEURS = ["#0d6efd","#198754","#dc3545","#fd7e14","#6f42c1","#0dcaf0","#20c997"];

export default function EmploiTempsEtudiantPage() {
  const [creneaux, setCreneaux] = useState([]);
  const [semaine, setSemaine]   = useState("");
  const [loading, setLoading]   = useState(false);

  const token = localStorage.getItem("edu_token");
  const user  = JSON.parse(localStorage.getItem("edu_user") || "{}");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  useEffect(() => {
    const today = new Date();
    const day   = today.getDay();
    const diff  = today.getDate() - day + (day === 0 ? -6 : 1);
    const lundi = new Date(today.setDate(diff));
    setSemaine(lundi.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!semaine || !user.id_lien) return;
    setLoading(true);
    fetch(`${API}/emploi_temps.php?id_classe=${user.id_lien}&semaine=${semaine}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { setCreneaux(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [semaine]);

  const getCreneauxBloc = (jour, bloc) => {
    return creneaux.filter(c => {
      if (c.jour !== jour) return false;
      const debutC = c.heure_debut.slice(0,5);
      return debutC >= bloc.debut && debutC < bloc.fin;
    });
  };

  const getCouleur = (id) => COULEURS[id % COULEURS.length];

  const getDateJour = (indexJour) => {
    if (!semaine) return "";
    const d = new Date(semaine);
    d.setDate(d.getDate() + indexJour);
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  const semainePrec = () => {
    const d = new Date(semaine); d.setDate(d.getDate() - 7);
    setSemaine(d.toISOString().split("T")[0]);
  };

  const semaineSuiv = () => {
    const d = new Date(semaine); d.setDate(d.getDate() + 7);
    setSemaine(d.toISOString().split("T")[0]);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">📅 Mon Emploi du Temps</h2>
        <span className="badge bg-primary fs-6">Lecture seule</span>
      </div>

      {/* Semaine */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Semaine du</label>
              <input type="date" className="form-control" value={semaine}
                onChange={e => setSemaine(e.target.value)} />
            </div>
            <div className="col-md-8 d-flex gap-2 align-items-end">
              <button className="btn btn-outline-primary btn-sm" onClick={semainePrec}>
                ← Semaine précédente
              </button>
              <button className="btn btn-outline-primary btn-sm" onClick={semaineSuiv}>
                Semaine suivante →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : creneaux.length === 0 ? (
        <div className="alert alert-info">
          Aucun cours planifié pour cette semaine.
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered mb-0" style={{ minWidth: 800 }}>
                <thead className="table-primary">
                  <tr>
                    <th style={{ width: 80 }} className="text-center">Horaire</th>
                    {JOURS.map((j, i) => (
                      <th key={j} className="text-center">
                        <div>{j}</div>
                        <div className="small opacity-75 fw-normal">{getDateJour(i)}</div>
                      </th>
                    ))}
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
                        {JOURS.map(jour => {
                          const cs = getCreneauxBloc(jour, bloc);
                          return (
                            <td key={jour} className="p-1" style={{ verticalAlign: "top" }}>
                              {cs.map(c => (
                                <div key={c.id} className="rounded p-2 text-white"
                                  style={{ backgroundColor: getCouleur(c.id_matiere), fontSize: 11, minHeight: 80 }}>
                                  <strong>{c.matiere}</strong><br />
                                  <span className="opacity-75">{c.type_seance}</span><br />
                                  <span className="opacity-75">🏫 {c.salle_code}</span><br />
                                  <span className="opacity-75">
                                    ⏰ {c.heure_debut?.slice(0,5)} - {c.heure_fin?.slice(0,5)}
                                  </span>
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
                            {bi === 0 ? "Pause" : "Pause déjeuner"}
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
      )}

      {/* Légende */}
      {creneaux.length > 0 && (
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-body">
            <h6 className="fw-bold mb-3">📚 Matières de la semaine</h6>
            <div className="d-flex flex-wrap gap-2">
              {[...new Map(creneaux.map(c => [c.id_matiere, c])).values()].map(c => (
                <span key={c.id_matiere} className="badge rounded-pill text-white px-3 py-2"
                  style={{ backgroundColor: getCouleur(c.id_matiere) }}>
                  {c.matiere}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}