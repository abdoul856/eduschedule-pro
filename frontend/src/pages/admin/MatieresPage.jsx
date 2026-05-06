import { useState, useEffect } from "react";

export default function MatieresPage() {
  const [matieres, setMatieres]     = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [message, setMessage]       = useState("");
  const [search, setSearch]         = useState("");
  const [form, setForm] = useState({
    code: "", libelle: "", volume_horaire_total: "", coefficient: "1"
  });

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const charger = () => {
    fetch(`${API}/matieres.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setMatieres(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { charger(); }, []);

  const handleAjouter = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/matieres.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Matière ajoutée !");
      setShowModal(false);
      setForm({ code: "", libelle: "", volume_horaire_total: "", coefficient: "1" });
      charger();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const COULEURS = ["#1a56db","#057a55","#7e3af2","#c27803","#0694a2","#e02424","#1c64f2"];

  const matieresFiltrees = matieres.filter(m =>
    !search || `${m.code} ${m.libelle}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>📚 Matières</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            {matieres.length} matière(s) enregistrée(s)
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: "linear-gradient(135deg, #1a56db, #1e429f)",
          color: "white", border: "none", borderRadius: 10,
          padding: "10px 20px", fontWeight: 600, fontSize: "0.875rem",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(26,86,219,0.4)"
        }}>+ Ajouter une matière</button>
      </div>

      {message && (
        <div style={{
          background: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem"
        }}>{message}</div>
      )}

      {/* Recherche */}
      <div style={{ background: "white", borderRadius: 14, padding: "1rem", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <input type="text" placeholder="🔍 Rechercher une matière..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", outline: "none" }} />
      </div>

      {/* Tableau */}
      <div style={{ background: "white", borderRadius: 16, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "linear-gradient(135deg, #dbeafe, #eff6ff)" }}>
              {["Code","Libellé","Volume horaire","Coefficient","Statut"].map(h => (
                <th key={h} style={{
                  padding: "1rem", textAlign: "left",
                  fontSize: "0.75rem", fontWeight: 600,
                  color: "#1e429f", textTransform: "uppercase", letterSpacing: "0.5px"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matieresFiltrees.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
                Aucune matière trouvée
              </td></tr>
            ) : matieresFiltrees.map((m, i) => {
              const color = COULEURS[i % COULEURS.length];
              const pct   = Math.min(100, Math.round((0 / parseFloat(m.volume_horaire_total||1)) * 100));
              return (
                <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      background: `${color}15`, color,
                      borderRadius: 6, padding: "4px 12px",
                      fontSize: "0.75rem", fontWeight: 700
                    }}>{m.code}</span>
                  </td>
                  <td style={{ padding: "1rem", fontWeight: 600, color: "#111928" }}>{m.libelle}</td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 80, background: "#e5e7eb", borderRadius: 50, height: 6, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 50 }} />
                      </div>
                      <span style={{ fontSize: "0.875rem", fontWeight: 600, color }}>{m.volume_horaire_total}h</span>
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      background: "#f3f4f6", color: "#374151",
                      borderRadius: 6, padding: "4px 12px",
                      fontSize: "0.875rem", fontWeight: 600
                    }}>Coeff. {m.coefficient}</span>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <span style={{
                      background: m.actif ? "#d1fae5" : "#f3f4f6",
                      color: m.actif ? "#065f46" : "#6b7280",
                      borderRadius: 20, padding: "3px 10px",
                      fontSize: "0.75rem", fontWeight: 600
                    }}>{m.actif ? "● Active" : "● Inactive"}</span>
                  </td>
                </tr>
              );
            })}
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
            background: "white", borderRadius: 20, width: "100%", maxWidth: 460,
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "linear-gradient(135deg, #dbeafe, #eff6ff)"
            }}>
              <h5 style={{ margin: 0, fontFamily: "'Poppins',sans-serif", color: "#1e429f" }}>➕ Nouvelle matière</h5>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAjouter}>
              <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Code</label>
                  <input type="text" placeholder="Ex: SIG-301" value={form.code} required
                    onChange={e => setForm({...form, code: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Coefficient</label>
                  <input type="number" step="0.5" min="0.5" max="5" value={form.coefficient} required
                    onChange={e => setForm({...form, coefficient: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Libellé</label>
                  <input type="text" placeholder="Ex: Traitement du Signal" value={form.libelle} required
                    onChange={e => setForm({...form, libelle: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Volume horaire total (h)</label>
                  <input type="number" placeholder="Ex: 45" value={form.volume_horaire_total} required
                    onChange={e => setForm({...form, volume_horaire_total: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                </div>
              </div>
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb", background: "white", cursor: "pointer", fontWeight: 500 }}>Annuler</button>
                <button type="submit" style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #1a56db, #1e429f)", color: "white", cursor: "pointer", fontWeight: 600 }}>Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}