import { useState, useEffect, useRef } from "react";
import SignaturePad from "signature_pad";

export default function SignatureCahierPage() {
  const [cahiers, setCahiers]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [heureFin, setHeureFin] = useState("");
  const [message, setMessage]   = useState("");
  const [loading, setLoading]   = useState(false);
  const canvasRef               = useRef(null);
  const padRef                  = useRef(null);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  useEffect(() => {
    fetch(`${API}/cahiers.php`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => setCahiers(Array.isArray(data) ? data.filter(c => c.statut_cahier === 'signe_delegue') : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected || !canvasRef.current) return;
    padRef.current = new SignaturePad(canvasRef.current, {
      backgroundColor: "rgb(255,255,255)"
    });
    const canvas = canvasRef.current;
    const ratio  = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    padRef.current.clear();

    // Heure fin par défaut = maintenant
    const now = new Date();
    setHeureFin(`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
  }, [selected]);

  const handleCloture = async (e) => {
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
      const res = await fetch(`${API}/cahiers.php?id=${selected.cahier_id}&action=cloture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          heure_fin:           heureFin,
          signature_enseignant: signature
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Séance clôturée et signée !");
      setSelected(null);
      // Recharger
      const r2 = await fetch(`${API}/cahiers.php`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const d2 = await r2.json();
      setCahiers(Array.isArray(d2) ? d2.filter(c => c.statut_cahier === 'signe_delegue') : []);
    } catch (err) {
      setMessage("❌ " + err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 className="mb-4">✍️ Signature des cahiers de texte</h2>
      {message && (
        <div className="alert alert-info alert-dismissible">
          {message}
          <button className="btn-close" onClick={() => setMessage("")} />
        </div>
      )}

      {!selected ? (
        <>
          {cahiers.length === 0 ? (
            <div className="alert alert-info">
              Aucun cahier en attente de votre signature.
            </div>
          ) : (
            <div className="row g-3">
              {cahiers.map(c => (
                <div key={c.id_creneau} className="col-md-6">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body">
                      <h6 className="fw-bold">{c.matiere}</h6>
                      <p className="text-muted small mb-1">
                        📅 {c.jour} — ⏰ {c.heure_debut?.slice(0,5)}
                      </p>
                      <span className="badge bg-warning text-dark mb-2">
                        ⏳ En attente de votre signature
                      </span>
                      <br />
                      <button className="btn btn-primary btn-sm"
                        onClick={() => setSelected(c)}>
                        ✍️ Signer et clôturer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between mb-4">
              <h5 className="mb-0">✍️ {selected.matiere}</h5>
              <button className="btn btn-outline-secondary btn-sm"
                onClick={() => setSelected(null)}>← Retour</button>
            </div>

            {/* Infos */}
            <div className="row g-2 mb-4">
              <div className="col-md-4">
                <div className="bg-light rounded p-2 text-center">
                  <div className="small text-muted">Matière</div>
                  <div className="fw-semibold small">{selected.matiere}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="bg-light rounded p-2 text-center">
                  <div className="small text-muted">Jour</div>
                  <div className="fw-semibold small">{selected.jour}</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="bg-light rounded p-2 text-center">
                  <div className="small text-muted">Heure début</div>
                  <div className="fw-semibold small">{selected.heure_debut?.slice(0,5)}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleCloture}>
              {/* Heure de fin */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  ⏰ Heure de fin réelle <span className="text-danger">*</span>
                </label>
                <input type="time" className="form-control" value={heureFin}
                  onChange={e => setHeureFin(e.target.value)} required />
                <small className="text-muted">
                  Confirmez ou ajustez l'heure de fin de la séance
                </small>
              </div>

              {/* Signature enseignant */}
              <div className="mb-4">
                <label className="form-label fw-semibold">
                  ✍️ Votre signature <span className="text-danger">*</span>
                </label>
                <div className="border rounded bg-white mb-2"
                  style={{ touchAction: "none", cursor: "crosshair" }}>
                  <canvas ref={canvasRef}
                    style={{ width: "100%", height: 150, display: "block" }} />
                </div>
                <button type="button" className="btn btn-sm btn-outline-secondary"
                  onClick={() => padRef.current?.clear()}>
                  🗑️ Effacer
                </button>
              </div>

              <div className="alert alert-warning small">
                ⚠️ En signant, vous confirmez que la séance s'est déroulée conformément
                au cahier de texte rempli par le délégué. La fiche sera verrouillée.
              </div>

              <button type="submit" className="btn btn-success w-100 py-2 fw-semibold"
                disabled={loading}>
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Clôture...</>
                ) : "✅ Signer et clôturer la séance"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}