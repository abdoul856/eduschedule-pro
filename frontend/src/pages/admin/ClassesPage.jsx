import { useState, useEffect } from "react";

export default function ClassesPage() {
  const [classes, setClasses]       = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [message, setMessage]       = useState("");
  const [search, setSearch]         = useState("");
  const [form, setForm] = useState({
    code: "", libelle: "", niveau: "", annee_academique: "2025-2026", capacite: 30
  });

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const charger = () => {
    fetch(`${API}/classes.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { charger(); }, []);

  const handleAjouter = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/classes.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Classe ajoutée !");
      setShowModal(false);
      setForm({ code: "", libelle: "", niveau: "", annee_academique: "2025-2026", capacite: 30 });
      charger();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const NIVEAUX = ["Licence 1","Licence 2","Licence 3","Master 1","Master 2"];

  const NIVEAU_COLORS = {
    "Licence 1": { bg: "#dbeafe", color: "#1e429f" },
    "Licence 2": { bg: "#ede9fe", color: "#5521b5" },
    "Licence 3": { bg: "#d1fae5", color: "#065f46" },
    "Master 1":  { bg: "#fef3c7", color: "#92400e" },
    "Master 2":  { bg: "#fee2e2", color: "#991b1b" },
  };

  const classesFiltrees = classes.filter(c =>
    !search || `${c.code} ${c.libelle} ${c.niveau}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>🏫 Classes</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            {classes.length} classe(s) enregistrée(s)
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: "linear-gradient(135deg, #1a56db, #1e429f)",
          color: "white", border: "none", borderRadius: 10,
          padding: "10px 20px", fontWeight: 600, fontSize: "0.875rem",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(26,86,219,0.4)"
        }}>+ Ajouter une classe</button>
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
        <input type="text" placeholder="🔍 Rechercher une classe..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", outline: "none" }} />
      </div>

      {/* Grille de classes */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {classesFiltrees.length === 0 ? (
          <div style={{ gridColumn: "span 3", textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
            Aucune classe trouvée
          </div>
        ) : classesFiltrees.map(c => {
          const ncolor = NIVEAU_COLORS[c.niveau] || { bg: "#f3f4f6", color: "#374151" };
          return (
            <div key={c.id} style={{
              background: "white", borderRadius: 16,
              padding: "1.5rem",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              border: `1px solid ${ncolor.color}22`,
              transition: "all 0.2s",
              cursor: "default"
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.12)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{
                  background: ncolor.bg, color: ncolor.color,
                  borderRadius: 8, padding: "4px 12px",
                  fontSize: "0.8rem", fontWeight: 700
                }}>{c.code}</span>
                <span style={{
                  background: c.actif ? "#d1fae5" : "#f3f4f6",
                  color: c.actif ? "#065f46" : "#6b7280",
                  borderRadius: 20, padding: "3px 10px",
                  fontSize: "0.7rem", fontWeight: 600
                }}>{c.actif ? "● Active" : "● Inactive"}</span>
              </div>

              <h6 style={{ fontWeight: 700, color: "#111928", marginBottom: 12, fontSize: "0.95rem" }}>
                {c.libelle}
              </h6>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "#6b7280" }}>
                  <span style={{ background: ncolor.bg, color: ncolor.color, borderRadius: 6, padding: "2px 8px", fontSize: "0.75rem", fontWeight: 600 }}>
                    {c.niveau}
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>📅 {c.annee_academique}</div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>👥 {c.capacite} étudiants max</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white", borderRadius: 20, width: "100%", maxWidth: 480,
            boxShadow: "0 25px 60px rgba(0,0,0,0.3)"
          }}>
            <div style={{
              padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "linear-gradient(135deg, #dbeafe, #eff6ff)"
            }}>
              <h5 style={{ margin: 0, fontFamily: "'Poppins',sans-serif", color: "#1e429f" }}>➕ Nouvelle classe</h5>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAjouter}>
              <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Code</label>
                  <input type="text" placeholder="Ex: L3-RST" value={form.code} required
                    onChange={e => setForm({...form, code: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Niveau</label>
                  <select value={form.niveau} required onChange={e => setForm({...form, niveau: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }}>
                    <option value="">-- Choisir --</option>
                    {NIVEAUX.map(n => <option key={n}>{n}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Libellé</label>
                  <input type="text" placeholder="Ex: Licence 3 Réseaux & Télécoms" value={form.libelle} required
                    onChange={e => setForm({...form, libelle: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Année académique</label>
                  <input type="text" value={form.annee_academique} required
                    onChange={e => setForm({...form, annee_academique: e.target.value})}
                    style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Capacité</label>
                  <input type="number" value={form.capacite} required
                    onChange={e => setForm({...form, capacite: e.target.value})}
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