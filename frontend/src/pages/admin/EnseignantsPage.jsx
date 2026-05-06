import { useState, useEffect } from "react";

export default function EnseignantsPage() {
  const [enseignants, setEnseignants] = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [message, setMessage]         = useState("");
  const [search, setSearch]           = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [form, setForm] = useState({
    matricule: "", nom: "", prenom: "", email: "",
    specialite: "", statut: "vacataire", taux_horaire: ""
  });

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const charger = () => {
    fetch(`${API}/enseignants.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setEnseignants(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { charger(); }, []);

  const handleAjouter = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/enseignants.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Enseignant ajouté !");
      setShowModal(false);
      setForm({ matricule: "", nom: "", prenom: "", email: "", specialite: "", statut: "vacataire", taux_horaire: "" });
      charger();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const enseignantsFiltres = enseignants.filter(e => {
    const matchSearch = !search || `${e.nom} ${e.prenom} ${e.email} ${e.specialite}`.toLowerCase().includes(search.toLowerCase());
    const matchStatut = !filtreStatut || e.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  const formatMontant = (val) => parseInt(val || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>👨‍🏫 Enseignants</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            {enseignants.length} enseignant(s) enregistré(s)
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: "linear-gradient(135deg, #1a56db, #1e429f)",
          color: "white", border: "none", borderRadius: 10,
          padding: "10px 20px", fontWeight: 600, fontSize: "0.875rem",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(26,86,219,0.4)"
        }}>
          + Ajouter un enseignant
        </button>
      </div>

      {message && (
        <div style={{
          background: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          borderRadius: 10, padding: "0.75rem 1rem",
          marginBottom: "1rem", fontSize: "0.875rem"
        }}>{message}</div>
      )}

      {/* Filtres */}
      <div style={{
        background: "white", borderRadius: 14,
        padding: "1rem 1.25rem", marginBottom: "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        display: "flex", gap: 12, alignItems: "center"
      }}>
        <input
          type="text"
          placeholder="🔍 Rechercher un enseignant..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: "8px 14px", border: "1.5px solid #e5e7eb",
            borderRadius: 8, fontSize: "0.875rem", outline: "none"
          }}
        />
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
          style={{ padding: "8px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }}>
          <option value="">Tous les statuts</option>
          <option value="permanent">Permanent</option>
          <option value="vacataire">Vacataire</option>
        </select>
      </div>

      {/* Tableau */}
      <div style={{ background: "white", borderRadius: 16, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "linear-gradient(135deg, #dbeafe, #eff6ff)" }}>
              {["Matricule","Nom & Prénom","Email","Spécialité","Statut","Taux/h (FCFA)"].map(h => (
                <th key={h} style={{
                  padding: "1rem", textAlign: "left",
                  fontSize: "0.75rem", fontWeight: 600,
                  color: "#1e429f", textTransform: "uppercase", letterSpacing: "0.5px"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enseignantsFiltres.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                Aucun enseignant trouvé
              </td></tr>
            ) : enseignantsFiltres.map((e, i) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                <td style={{ padding: "1rem" }}>
                  <span style={{
                    background: "#dbeafe", color: "#1e429f",
                    borderRadius: 6, padding: "3px 10px",
                    fontSize: "0.75rem", fontWeight: 600
                  }}>{e.matricule}</span>
                </td>
                <td style={{ padding: "1rem", fontWeight: 600, color: "#111928" }}>
                  {e.prenom} {e.nom}
                </td>
                <td style={{ padding: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>{e.email}</td>
                <td style={{ padding: "1rem", color: "#6b7280", fontSize: "0.875rem" }}>{e.specialite}</td>
                <td style={{ padding: "1rem" }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: 20,
                    fontSize: "0.75rem", fontWeight: 600,
                    background: e.statut === 'permanent' ? '#d1fae5' : '#fef3c7',
                    color: e.statut === 'permanent' ? '#065f46' : '#92400e'
                  }}>
                    {e.statut === 'permanent' ? '✅ Permanent' : '🔄 Vacataire'}
                  </span>
                </td>
                <td style={{ padding: "1rem", fontWeight: 600, color: "#1a56db" }}>
                  {formatMontant(e.taux_horaire)} FCFA
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white", borderRadius: 20, width: "100%", maxWidth: 500,
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)", overflow: "hidden"
          }}>
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #f3f4f6",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "linear-gradient(135deg, #dbeafe, #eff6ff)"
            }}>
              <h5 style={{ margin: 0, fontFamily: "'Poppins',sans-serif", color: "#1e429f" }}>
                ➕ Nouvel enseignant
              </h5>
              <button onClick={() => setShowModal(false)} style={{
                background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer"
              }}>✕</button>
            </div>
            <form onSubmit={handleAjouter}>
              <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { label: "Matricule", key: "matricule", placeholder: "ENS-006", col: 1 },
                  { label: "Statut", key: "statut", type: "select", col: 1 },
                  { label: "Nom", key: "nom", placeholder: "DUPONT", col: 1 },
                  { label: "Prénom", key: "prenom", placeholder: "Jean", col: 1 },
                  { label: "Email", key: "email", type: "email", placeholder: "j.dupont@isge.bf", col: 2 },
                  { label: "Spécialité", key: "specialite", placeholder: "Réseaux informatiques", col: 2 },
                  { label: "Taux horaire (FCFA)", key: "taux_horaire", type: "number", placeholder: "5000", col: 2 },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.col === 2 ? "span 2" : "span 1" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>
                      {f.label}
                    </label>
                    {f.type === "select" ? (
                      <select value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                        style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }}>
                        <option value="vacataire">Vacataire</option>
                        <option value="permanent">Permanent</option>
                      </select>
                    ) : (
                      <input type={f.type || "text"} placeholder={f.placeholder}
                        value={form[f.key]} required
                        onChange={e => setForm({...form, [f.key]: e.target.value})}
                        style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{
                  padding: "8px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb",
                  background: "white", cursor: "pointer", fontWeight: 500
                }}>Annuler</button>
                <button type="submit" style={{
                  padding: "8px 20px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #1a56db, #1e429f)",
                  color: "white", cursor: "pointer", fontWeight: 600
                }}>Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}