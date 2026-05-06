import { useState, useEffect } from "react";

export default function SallesPage() {
  const [salles, setSalles]         = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [message, setMessage]       = useState("");
  const [search, setSearch]         = useState("");
  const [form, setForm] = useState({
    code: "", libelle: "", capacite: "30", batiment: "", equipements: ""
  });

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const charger = () => {
    fetch(`${API}/salles.php`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setSalles(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { charger(); }, []);

  const handleAjouter = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/salles.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Salle ajoutée !");
      setShowModal(false);
      setForm({ code: "", libelle: "", capacite: "30", batiment: "", equipements: "" });
      charger();
    } catch (err) {
      setMessage("❌ " + err.message);
    }
  };

  const TYPE_ICONS = {
    "LABO": "🔬", "AMP": "🎭", "SALLE": "📖", "TD": "✏️"
  };

  const getIcon = (code) => {
    for (const [key, icon] of Object.entries(TYPE_ICONS)) {
      if (code?.toUpperCase().includes(key)) return icon;
    }
    return "🏛️";
  };

  const sallesFiltrees = salles.filter(s =>
    !search || `${s.code} ${s.libelle} ${s.batiment}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Poppins',sans-serif" }}>🏛️ Salles</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            {salles.length} salle(s) enregistrée(s)
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: "linear-gradient(135deg, #1a56db, #1e429f)",
          color: "white", border: "none", borderRadius: 10,
          padding: "10px 20px", fontWeight: 600, fontSize: "0.875rem",
          cursor: "pointer", boxShadow: "0 4px 12px rgba(26,86,219,0.4)"
        }}>+ Ajouter une salle</button>
      </div>

      {message && (
        <div style={{
          background: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem"
        }}>{message}</div>
      )}

      <div style={{ background: "white", borderRadius: 14, padding: "1rem", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <input type="text" placeholder="🔍 Rechercher une salle..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "8px 14px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem", outline: "none" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {sallesFiltrees.length === 0 ? (
          <div style={{ gridColumn: "span 3", textAlign: "center", padding: "3rem", color: "#9ca3af" }}>
            Aucune salle trouvée
          </div>
        ) : sallesFiltrees.map((s, i) => (
          <div key={s.id} style={{
            background: "white", borderRadius: 16, padding: "1.5rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb", transition: "all 0.2s"
          }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.12)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 12,
                background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem"
              }}>{getIcon(s.code)}</div>
              <span style={{
                background: s.actif ? "#d1fae5" : "#f3f4f6",
                color: s.actif ? "#065f46" : "#6b7280",
                borderRadius: 20, padding: "3px 10px",
                fontSize: "0.7rem", fontWeight: 600
              }}>{s.actif ? "● Active" : "● Inactive"}</span>
            </div>

            <span style={{
              background: "#dbeafe", color: "#1e429f",
              borderRadius: 6, padding: "3px 10px",
              fontSize: "0.75rem", fontWeight: 700,
              display: "inline-block", marginBottom: 8
            }}>{s.code}</span>

            <h6 style={{ fontWeight: 700, color: "#111928", marginBottom: 12 }}>{s.libelle}</h6>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {s.batiment && (
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>🏢 {s.batiment}</div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>👥 Capacité :</div>
                <div style={{
                  background: "#f3f4f6", borderRadius: 20,
                  padding: "2px 10px", fontSize: "0.8rem", fontWeight: 600, color: "#374151"
                }}>{s.capacite} places</div>
              </div>
              {s.equipements && (
                <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>
                  🖥️ {s.equipements}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
              <h5 style={{ margin: 0, fontFamily: "'Poppins',sans-serif", color: "#1e429f" }}>➕ Nouvelle salle</h5>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>
            <form onSubmit={handleAjouter}>
              <div style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { label: "Code", key: "code", placeholder: "Ex: SALLE-201", col: 1 },
                  { label: "Capacité", key: "capacite", type: "number", placeholder: "30", col: 1 },
                  { label: "Libellé", key: "libelle", placeholder: "Ex: Salle 201", col: 2 },
                  { label: "Bâtiment", key: "batiment", placeholder: "Ex: Bâtiment A", col: 2 },
                  { label: "Équipements", key: "equipements", placeholder: "Ex: Vidéoprojecteur, Tableau", col: 2 },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.col === 2 ? "span 2" : "span 1" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type || "text"} placeholder={f.placeholder}
                      value={form[f.key]} required={f.key !== "batiment" && f.key !== "equipements"}
                      onChange={e => setForm({...form, [f.key]: e.target.value})}
                      style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: "0.875rem" }} />
                  </div>
                ))}
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