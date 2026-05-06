import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SignaturePad from "signature_pad";

export default function CahierTextePage() {
  const [seances, setSeances]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({
    titre_cours: "", contenu: "", niveau_avancement: "", observations: ""
  });
  const [travaux, setTravaux]       = useState([]);
  const [nouveauTravail, setNouveauTravail] = useState({
    description: "", date_limite: "", type: "exercice"
  });
  const [message, setMessage]       = useState("");
  const [loading, setLoading]       = useState(false);
  const canvasRef                   = useRef(null);
  const padRef                      = useRef(null);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  useEffect(() => {
    chargerSeances();
  }, []);

  useEffect(() => {
    if (!selected || !canvasRef.current) return;
    padRef.current = new SignaturePad(canvasRef.current, {
      backgroundColor: "rgb(255,255,255)"
    });
    // Resize canvas
    const canvas = canvasRef.current;
    const ratio  = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    padRef.current.clear();
  }, [selected]);

  const chargerSeances = () => {
    fetch(`${API}/cahiers.php`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setSeances(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const ajouterTravail = () => {
    if (!nouveauTravail.description) return;
    setTravaux([...travaux, { ...nouveauTravail, id: Date.now() }]);
    setNouveauTravail({ description: "", date_limite: "", type: "exercice" });
  };

  const supprimerTravail = (id) => {
    setTravaux(travaux.filter(t => t.id !== id));
  };

  const handleSoumettre = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!padRef.current || padRef.current.isEmpty()) {
      setMessage("❌ Veuillez apposer votre signature !");
      setLoading(false);
      return;
    }

    try {
      const signature = padRef.current.toDataURL("image/png");
      const res = await fetch(`${API}/cahiers.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id_creneau:        selected.id_creneau,
          titre_cours:       form.titre_cours,
          contenu_json:      { points: form.contenu.split("\n").filter(Boolean) },
          niveau_avancement: form.niveau_avancement,
          observations:      form.observations,
          travaux:           travaux,
          signature_delegue: signature
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Cahier de texte soumis et signé !");
      setSelected(null);
      chargerSeances();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
    setLoading(false);
  };

  const getStatutBadge = (statut) => {
    if (statut === 'cloture')       return { color: 'success',  label: '✅ Clôturé' };
    if (statut === 'signe_delegue') return { color: 'warning',  label: '⏳ En attente enseignant' };
    return                                 { color: 'secondary', label: '📝 À remplir' };
  };

  return (
    <div>
      <h2 className="mb-4">📋 Cahier de texte</h2>
      {message && (
        <div className="alert alert-info alert-dismissible">
          {message}
          <button className="btn-close" onClick={() => setMessage("")} />
        </div>
      )}

      {!selected ? (
        <div className="row g-3">
          {seances.length === 0 ? (
            <div className="alert alert-warning">Aucune séance disponible.</div>
          ) : seances.map(s => {
            const badge = getStatutBadge(s.statut_cahier);
            return (
              <div key={s.id_creneau} className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold mb-1">{s.matiere}</h6>
                    <p className="text-muted small mb-1">
                      📅 {s.jour} — ⏰ {s.heure_debut?.slice(0,5)} à {s.heure_fin?.slice(0,5)}
                    </p>
                    <p className="text-muted small mb-1">👨‍🏫 {s.enseignant}</p>
                    <p className="text-muted small mb-2">🏫 {s.salle_code}</p>
                    <span className={`badge bg-${badge.color} mb-2`}>{badge.label}</span>
                    <br />
                    <button className="btn btn-primary btn-sm"
                      onClick={() => setSelected(s)}
                      disabled={s.statut_cahier === 'cloture'}>
                      ✏️ {s.statut_cahier === 'signe_delegue' ? 'Voir' : 'Remplir'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            {/* En-tête */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0">✏️ {selected.matiere}</h5>
              <button className="btn btn-outline-secondary btn-sm"
                onClick={() => setSelected(null)}>← Retour</button>
            </div>

            {/* Infos auto */}
            <div className="row mb-4 g-2">
              <div className="col-md-3">
                <div className="bg-light rounded p-2 text-center">
                  <div className="small text-muted">Classe</div>
                  <div className="fw-semibold small">{selected.classe || "—"}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="bg-light rounded p-2 text-center">
                  <div className="small text-muted">Date</div>
                  <div className="fw-semibold small">{new Date().toLocaleDateString("fr-FR")}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="bg-light rounded p-2 text-center">
                  <div className="small text-muted">Heure prévue</div>
                  <div className="fw-semibold small">{selected.heure_debut?.slice(0,5)}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="bg-light rounded p-2 text-center">
                  <div className="small text-muted">Enseignant</div>
                  <div className="fw-semibold small">{selected.enseignant}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSoumettre}>
              {/* Titre */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  📌 Titre du cours <span className="text-danger">*</span>
                </label>
                <input type="text" className="form-control"
                  placeholder="Ex: Introduction aux réseaux informatiques"
                  value={form.titre_cours}
                  onChange={e => setForm({...form, titre_cours: e.target.value})}
                  required />
              </div>

              {/* Points vus */}
              <div className="mb-3">
                <label className="form-label fw-semibold">
                  📝 Points vus dans le cours <span className="text-danger">*</span>
                </label>
                <textarea className="form-control" rows={5}
                  placeholder="Un point par ligne :&#10;- Introduction aux réseaux&#10;- Modèle OSI&#10;- Protocoles TCP/IP"
                  value={form.contenu}
                  onChange={e => setForm({...form, contenu: e.target.value})}
                  required />
              </div>

              {/* Niveau d'avancement */}
              <div className="mb-3">
                <label className="form-label fw-semibold">📊 Niveau d'avancement</label>
                <input type="text" className="form-control"
                  placeholder="Ex: Chapitre 2/5 — 40% du programme"
                  value={form.niveau_avancement}
                  onChange={e => setForm({...form, niveau_avancement: e.target.value})} />
              </div>

              {/* Travaux demandés */}
              <div className="mb-3">
                <label className="form-label fw-semibold">📚 Travaux demandés</label>
                <div className="border rounded p-3 bg-light">
                  {travaux.length > 0 && (
                    <div className="mb-2">
                      {travaux.map(t => (
                        <div key={t.id} className="d-flex justify-content-between align-items-center
                          bg-white rounded p-2 mb-1 border">
                          <div>
                            <span className={`badge me-2 bg-${
                              t.type === 'devoir' ? 'danger' :
                              t.type === 'projet' ? 'primary' : 'secondary'
                            }`}>{t.type}</span>
                            {t.description}
                            {t.date_limite && (
                              <span className="text-muted small ms-2">
                                📅 {t.date_limite}
                              </span>
                            )}
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-danger"
                            onClick={() => supprimerTravail(t.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="row g-2">
                    <div className="col-md-5">
                      <input type="text" className="form-control form-control-sm"
                        placeholder="Description du travail..."
                        value={nouveauTravail.description}
                        onChange={e => setNouveauTravail({...nouveauTravail, description: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={nouveauTravail.type}
                        onChange={e => setNouveauTravail({...nouveauTravail, type: e.target.value})}>
                        <option value="exercice">Exercice</option>
                        <option value="devoir">Devoir</option>
                        <option value="projet">Projet</option>
                        <option value="lecture">Lecture</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <input type="date" className="form-control form-control-sm"
                        value={nouveauTravail.date_limite}
                        onChange={e => setNouveauTravail({...nouveauTravail, date_limite: e.target.value})} />
                    </div>
                    <div className="col-md-2">
                      <button type="button" className="btn btn-sm btn-success w-100"
                        onClick={ajouterTravail}>+ Ajouter</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observations */}
              <div className="mb-3">
                <label className="form-label fw-semibold">💬 Observations</label>
                <textarea className="form-control" rows={2}
                  placeholder="Incidents, retards, absences signalées..."
                  value={form.observations}
                  onChange={e => setForm({...form, observations: e.target.value})} />
              </div>

              {/* Signature délégué */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  ✍️ Signature du délégué <span className="text-danger">*</span>
                </label>
                <div className="border rounded bg-white mb-2"
                  style={{ touchAction: "none", cursor: "crosshair" }}>
                  <canvas ref={canvasRef}
                    style={{ width: "100%", height: 150, display: "block" }} />
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary"
                  onClick={() => padRef.current?.clear()}>
                  🗑️ Effacer la signature
                </button>
              </div>

              <button type="submit" className="btn btn-success w-100 py-2 fw-semibold"
                disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Envoi...</>
                ) : "✅ Soumettre et signer le cahier de texte"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}