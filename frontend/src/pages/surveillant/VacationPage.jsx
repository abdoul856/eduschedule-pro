import { useState, useEffect } from "react";

export default function VacationPage() {
  const [enseignants, setEnseignants] = useState([]);
  const [vacations, setVacations]     = useState([]);
  const [ensId, setEnsId]             = useState("");
  const [mois, setMois]               = useState(new Date().getMonth() + 1);
  const [annee, setAnnee]             = useState(new Date().getFullYear());
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(false);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
                "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  useEffect(() => {
    fetch(`${API}/enseignants.php`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(setEnseignants)
      .catch(() => {});
  }, []);

  const chargerVacations = async () => {
    if (!ensId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/vacations.php?id_enseignant=${ensId}&mois=${mois}&annee=${annee}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setVacations(Array.isArray(data) ? data : [data]);
    } catch {
      setVacations([]);
    }
    setLoading(false);
  };

  const genererFiche = async () => {
    setMessage("");
    try {
      const res = await fetch(`${API}/vacations.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id_enseignant: ensId, mois, annee })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Fiche de vacation générée !");
      chargerVacations();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const valider = async (id, action) => {
    try {
      const res = await fetch(`${API}/vacations.php?id=${id}&action=${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ commentaire: "Validé" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ " + data.message);
      chargerVacations();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      generee:           "bg-secondary",
      signee_enseignant: "bg-info",
      visee_surveillant: "bg-warning",
      approuvee:         "bg-success",
      payee:             "bg-primary"
    };
    return badges[statut] || "bg-secondary";
  };

  return (
    <div>
      <h2 className="mb-4">💰 Fiches de Vacation</h2>
      {message && <div className="alert alert-info">{message}</div>}

      {/* Filtres */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-semibold">Enseignant</label>
              <select className="form-select" value={ensId}
                onChange={e => setEnsId(e.target.value)}>
                <option value="">-- Choisir --</option>
                {enseignants.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.prenom} {e.nom} ({e.statut})
                  </option>
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
              <button className="btn btn-outline-primary" onClick={chargerVacations}>
                🔍 Chercher
              </button>
              <button className="btn btn-primary" onClick={genererFiche}
                disabled={!ensId}>
                ⚙️ Générer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des fiches */}
      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" />
        </div>
      ) : vacations.length === 0 ? (
        <div className="alert alert-info">
          Aucune fiche trouvée. Cliquez sur "Générer" pour créer une fiche.
        </div>
      ) : vacations.map(v => (
        <div key={v.id} className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h5 className="fw-bold">{v.enseignant_nom}</h5>
                <p className="text-muted mb-1">
                  📅 {MOIS[v.mois - 1]} {v.annee}
                </p>
                <span className={`badge ${getStatutBadge(v.statut)}`}>
                  {v.statut}
                </span>
              </div>
              <div className="text-end">
                <div className="fs-4 fw-bold text-primary">
                  {parseInt(v.montant_net || 0).toLocaleString()} FCFA
                </div>
                <div className="text-muted small">
                  Brut : {parseInt(v.montant_brut || 0).toLocaleString()} FCFA
                </div>
              </div>
            </div>

            {/* Lignes de vacation */}
            {v.lignes && v.lignes.length > 0 && (
              <div className="table-responsive mt-3">
                <table className="table table-sm table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Matière</th>
                      <th>Date</th>
                      <th>Durée (h)</th>
                      <th>Taux (FCFA)</th>
                      <th>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.lignes.map((l, i) => (
                      <tr key={i}>
                        <td>{l.matiere}</td>
                        <td>{l.date}</td>
                        <td>{l.duree_heures}</td>
                        <td>{parseInt(l.taux_horaire).toLocaleString()}</td>
                        <td>{parseInt(l.montant).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Actions selon statut */}
            <div className="mt-3 d-flex gap-2">
              {v.statut === 'generee' && (
                <button className="btn btn-sm btn-success"
                  onClick={() => valider(v.id, 'valider')}>
                  ✅ Valider (Surveillant)
                </button>
              )}
              {v.statut === 'visee_surveillant' && (
                <button className="btn btn-sm btn-primary"
                  onClick={() => valider(v.id, 'approuver')}>
                  ✅ Approuver (Comptable)
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}