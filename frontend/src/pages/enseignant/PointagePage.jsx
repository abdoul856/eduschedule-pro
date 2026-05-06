import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function PointagePage() {
  const [statut, setStatut]     = useState(""); // success, error, scanning
  const [message, setMessage]   = useState("");
  const [seance, setSeance]     = useState(null);
  const [codeManuel, setCodeManuel] = useState("");
  const [showManuel, setShowManuel] = useState(false);
  const [loading, setLoading]   = useState(false);
  const scannerRef              = useRef(null);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  useEffect(() => {
    if (statut) return;

    const scanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true,
    });

    scanner.render(
      async (decodedText) => {
        scanner.clear();
        await validerPointage(decodedText);
      },
      (error) => console.warn(error)
    );

    scannerRef.current = scanner;
    return () => scanner.clear().catch(() => {});
  }, [statut]);

  const validerPointage = async (qrData) => {
    setLoading(true);
    setMessage("⏳ Validation en cours...");
    try {
      let data;
      try {
        data = JSON.parse(qrData);
      } catch {
        data = { token: qrData, id_creneau: null };
      }

      const res = await fetch(`${API}/pointages.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ token_qr: data.token, id_creneau: data.id_creneau })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.erreur || "Erreur");
      setStatut(result.statut === 'retard' ? 'retard' : 'success');
      setSeance(result.seance);
      setMessage(result.statut === 'retard' ? '⚠️ Pointage enregistré avec retard !' : '✅ Présence validée !');
    } catch (err) {
      setStatut("error");
      setMessage("❌ " + err.message);
    }
    setLoading(false);
  };

  const validerManuel = async (e) => {
    e.preventDefault();
    if (!codeManuel) return;
    await validerPointage(JSON.stringify({ token: codeManuel, id_creneau: null }));
  };

  const recommencer = () => {
    setStatut("");
    setMessage("");
    setSeance(null);
    setCodeManuel("");
    setShowManuel(false);
  };

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h2 className="mb-4">📱 Pointage QR-Code</h2>

      {/* Résultat succès */}
      {statut === "success" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center p-5">
            <div className="fs-1 mb-3">✅</div>
            <h4 className="text-success fw-bold">Présence validée !</h4>
            {seance && (
              <div className="mt-3 text-start bg-light rounded p-3">
                <p className="mb-1"><strong>📚 Matière :</strong> {seance.matiere}</p>
                <p className="mb-1"><strong>🏫 Classe :</strong> {seance.classe}</p>
                <p className="mb-1"><strong>📍 Salle :</strong> {seance.salle}</p>
                <p className="mb-0"><strong>⏰ Heure prévue :</strong> {seance.heure_debut?.slice(0,5)}</p>
              </div>
            )}
            <div className="mt-3 badge bg-success fs-6 px-3 py-2">
              🟢 Séance en cours
            </div>
            <br />
            <button className="btn btn-primary mt-3" onClick={recommencer}>
              Scanner un autre QR
            </button>
          </div>
        </div>
      )}

      {/* Résultat retard */}
      {statut === "retard" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center p-5">
            <div className="fs-1 mb-3">⚠️</div>
            <h4 className="text-warning fw-bold">Pointage avec retard</h4>
            <p className="text-muted">Le surveillant a été notifié.</p>
            {seance && (
              <div className="mt-3 text-start bg-light rounded p-3">
                <p className="mb-1"><strong>📚 Matière :</strong> {seance.matiere}</p>
                <p className="mb-1"><strong>🏫 Classe :</strong> {seance.classe}</p>
                <p className="mb-1"><strong>📍 Salle :</strong> {seance.salle}</p>
                <p className="mb-0"><strong>⏰ Heure prévue :</strong> {seance.heure_debut?.slice(0,5)}</p>
              </div>
            )}
            <div className="mt-3 badge bg-warning text-dark fs-6 px-3 py-2">
              🟠 Retard signalé
            </div>
            <br />
            <button className="btn btn-primary mt-3" onClick={recommencer}>
              Scanner un autre QR
            </button>
          </div>
        </div>
      )}

      {/* Résultat erreur */}
      {statut === "error" && (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center p-5">
            <div className="fs-1 mb-3">❌</div>
            <h4 className="text-danger fw-bold">Échec du pointage</h4>
            <p className="text-muted">{message}</p>
            <div className="mt-3 badge bg-danger fs-6 px-3 py-2">
              🔴 Absent
            </div>
            <br />
            <button className="btn btn-primary mt-3" onClick={recommencer}>
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* Scanner */}
      {!statut && (
        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <p className="text-muted mb-3">
              Pointez votre caméra vers le QR-Code de la séance.
            </p>
            {loading && (
              <div className="alert alert-info d-flex align-items-center gap-2">
                <div className="spinner-border spinner-border-sm" />
                {message}
              </div>
            )}
            <div id="qr-reader" style={{ width: "100%" }} />

            <hr />

            {/* Saisie manuelle */}
            <button className="btn btn-outline-secondary btn-sm w-100"
              onClick={() => setShowManuel(!showManuel)}>
              ⌨️ Saisie manuelle du code (problème technique)
            </button>

            {showManuel && (
              <form onSubmit={validerManuel} className="mt-3">
                <div className="input-group">
                  <input type="text" className="form-control"
                    placeholder="Entrez le code QR manuellement..."
                    value={codeManuel}
                    onChange={e => setCodeManuel(e.target.value)}
                    required />
                  <button type="submit" className="btn btn-primary">
                    Valider
                  </button>
                </div>
                <small className="text-muted">
                  Le code est affiché sous le QR-Code imprimé.
                </small>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Légende statuts */}
      {!statut && (
        <div className="card border-0 shadow-sm mt-3">
          <div className="card-body py-2">
            <div className="d-flex justify-content-around text-center small">
              <div>
                <span className="badge bg-success">🟢</span>
                <div className="text-muted mt-1">À l'heure</div>
              </div>
              <div>
                <span className="badge bg-warning text-dark">🟠</span>
                <div className="text-muted mt-1">Retard {'>'} 15 min</div>
              </div>
              <div>
                <span className="badge bg-danger">🔴</span>
                <div className="text-muted mt-1">Absent</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}