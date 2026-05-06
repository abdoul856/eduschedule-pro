import { useState, useEffect } from "react";

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [message, setMessage]           = useState("");
  const [showModal, setShowModal]       = useState(false);
  const [editUser, setEditUser]         = useState(null);
  const [filtreRole, setFiltreRole]     = useState("");
  const [recherche, setRecherche]       = useState("");

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const ROLES = [
    { key: "admin",       label: "Administrateur", color: "#1a56db", bg: "#dbeafe", icon: "👨‍💼" },
    { key: "enseignant",  label: "Enseignant",      color: "#057a55", bg: "#d1fae5", icon: "👨‍🏫" },
    { key: "surveillant", label: "Surveillant",     color: "#c27803", bg: "#fef3c7", icon: "🔍" },
    { key: "comptable",   label: "Comptable",       color: "#0694a2", bg: "#cffafe", icon: "💼" },
    { key: "delegue",     label: "Délégué",         color: "#7e3af2", bg: "#ede9fe", icon: "👨‍🎓" },
    { key: "etudiant",    label: "Étudiant",        color: "#e02424", bg: "#fee2e2", icon: "👤" },
  ];

  const FORM_INIT = { email: "", mot_de_passe: "", role: "enseignant", actif: 1 };
  const [form, setForm] = useState(FORM_INIT);

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/utilisateurs.php`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUtilisateurs(Array.isArray(data) ? data : []);
    } catch (err) {
      setMessage("❌ " + err.message);
    }
    setLoading(false);
  };

  const ouvrir = (user = null) => {
    setEditUser(user);
    setForm(user
      ? { email: user.email, mot_de_passe: "", role: user.role, actif: user.actif }
      : FORM_INIT
    );
    setShowModal(true);
  };

  const fermer = () => { setShowModal(false); setEditUser(null); setForm(FORM_INIT); };

  const sauvegarder = async () => {
    if (!form.email || (!editUser && !form.mot_de_passe)) {
      setMessage("❌ Email et mot de passe obligatoires"); return;
    }
    try {
      const url     = editUser ? `${API}/utilisateurs.php?id=${editUser.id}` : `${API}/utilisateurs.php`;
      const methode = editUser ? "PUT" : "POST";
      const res  = await fetch(url, {
        method: methode,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage("✅ " + (editUser ? "Utilisateur modifié" : "Utilisateur créé"));
      fermer(); charger();
    } catch (err) { setMessage("❌ " + err.message); }
  };

  const toggleActif = async (user) => {
    try {
      const res = await fetch(`${API}/utilisateurs.php?id=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: user.email, mot_de_passe: "", role: user.role, actif: user.actif ? 0 : 1 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage(`✅ Compte ${user.actif ? "désactivé" : "activé"}`);
      charger();
    } catch (err) { setMessage("❌ " + err.message); }
  };

  const supprimer = async (id) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      const res = await fetch(`${API}/utilisateurs.php?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur);
      setMessage("✅ Utilisateur supprimé");
      charger();
    } catch (err) { setMessage("❌ " + err.message); }
  };

  const getRoleConfig = (role) =>
    ROLES.find(r => r.key === role) || { label: role, color: "#374151", bg: "#f3f4f6", icon: "👤" };

  const liste = utilisateurs.filter(u => {
    const matchRole   = !filtreRole || u.role === filtreRole;
    const matchSearch = !recherche  || u.email.toLowerCase().includes(recherche.toLowerCase());
    return matchRole && matchSearch;
  });

  const statsParRole = ROLES.map(r => ({
    ...r, count: utilisateurs.filter(u => u.role === r.key).length
  }));

  return (
    <div style={{ fontFamily: "'Inter',sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>👥 Gestion des Utilisateurs</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>Création, modification et gestion des accès</p>
        </div>
        <button onClick={() => ouvrir()} style={{
          background:"linear-gradient(135deg,#1a56db,#1e429f)", color:"white",
          border:"none", borderRadius:10, padding:"10px 20px",
          fontWeight:600, fontSize:"0.875rem", cursor:"pointer"
        }}>➕ Nouvel utilisateur</button>
      </div>

      {message && (
        <div style={{
          background: message.startsWith("✅") ? "#d1fae5" : "#fee2e2",
          color: message.startsWith("✅") ? "#065f46" : "#991b1b",
          borderRadius:10, padding:"0.75rem 1rem", marginBottom:"1rem", fontSize:"0.875rem"
        }}>
          {message}
          <button onClick={() => setMessage("")} style={{ background:"none", border:"none", cursor:"pointer", float:"right" }}>✕</button>
        </div>
      )}

      {/* Stats par rôle */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:"1.5rem" }}>
        {statsParRole.map((r, i) => (
          <div key={i} onClick={() => setFiltreRole(filtreRole === r.key ? "" : r.key)} style={{
            background:"white", borderRadius:12, padding:"0.875rem",
            boxShadow:"0 2px 8px rgba(0,0,0,0.08)", cursor:"pointer",
            border: filtreRole === r.key ? `2px solid ${r.color}` : "1px solid #e5e7eb"
          }}>
            <div style={{ fontSize:"1.25rem", marginBottom:4 }}>{r.icon}</div>
            <div style={{ fontSize:"1.25rem", fontWeight:700, color:r.color }}>{r.count}</div>
            <div style={{ fontSize:"0.7rem", color:"#6b7280", marginTop:2 }}>{r.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ background:"white", borderRadius:14, padding:"1rem 1.25rem", marginBottom:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)", display:"flex", gap:12, alignItems:"center" }}>
        <input type="text" placeholder="🔍 Rechercher par email..."
          value={recherche} onChange={e => setRecherche(e.target.value)}
          style={{ flex:1, padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }} />
        <select value={filtreRole} onChange={e => setFiltreRole(e.target.value)}
          style={{ padding:"8px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
          <option value="">-- Tous les rôles --</option>
          {ROLES.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
        </select>
        <button onClick={() => { setRecherche(""); setFiltreRole(""); }} style={{
          padding:"8px 14px", borderRadius:8, border:"1.5px solid #e5e7eb",
          background:"white", cursor:"pointer", fontSize:"0.875rem", color:"#6b7280"
        }}>✕ Reset</button>
      </div>

      {/* Tableau */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem" }}><div className="spinner-border text-primary" /></div>
      ) : (
        <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
                {["Email","Rôle","Statut","Dernière connexion","Actions"].map(h => (
                  <th key={h} style={{ padding:"1rem", textAlign:"left", fontSize:"0.75rem", fontWeight:600, color:"#1e429f", textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liste.length === 0 ? (
                <tr><td colSpan={5} style={{ padding:"2rem", textAlign:"center", color:"#6b7280" }}>Aucun utilisateur trouvé.</td></tr>
              ) : liste.map((u, i) => {
                const cfg = getRoleConfig(u.role);
                return (
                  <tr key={u.id} style={{ borderBottom:"1px solid #f3f4f6", background: i%2===0 ? "white" : "#fafafa" }}>
                    <td style={{ padding:"0.875rem 1rem" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{
                          width:36, height:36, borderRadius:"50%",
                          background:`linear-gradient(135deg,${cfg.color},${cfg.color}88)`,
                          display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1rem"
                        }}>{cfg.icon}</div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:"0.9rem" }}>{u.email}</div>
                          <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>ID #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"0.875rem 1rem" }}>
                      <span style={{ background:cfg.bg, color:cfg.color, borderRadius:20, padding:"3px 12px", fontSize:"0.75rem", fontWeight:600 }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding:"0.875rem 1rem" }}>
                      <span style={{
                        background: u.actif ? "#d1fae5" : "#fee2e2",
                        color: u.actif ? "#065f46" : "#991b1b",
                        borderRadius:20, padding:"3px 12px", fontSize:"0.75rem", fontWeight:600
                      }}>{u.actif ? "✅ Actif" : "❌ Inactif"}</span>
                    </td>
                    <td style={{ padding:"0.875rem 1rem", fontSize:"0.8rem", color:"#6b7280" }}>
                      {u.derniere_connexion ? new Date(u.derniere_connexion).toLocaleDateString("fr-FR") : "Jamais"}
                    </td>
                    <td style={{ padding:"0.875rem 1rem" }}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={() => ouvrir(u)} style={{
                          padding:"5px 12px", borderRadius:8, border:"1.5px solid #e5e7eb",
                          background:"white", cursor:"pointer", fontSize:"0.75rem", fontWeight:600
                        }}>✏️ Modifier</button>
                        <button onClick={() => toggleActif(u)} style={{
                          padding:"5px 12px", borderRadius:8, border:"none",
                          background: u.actif ? "#fef3c7" : "#d1fae5",
                          color: u.actif ? "#92400e" : "#065f46",
                          cursor:"pointer", fontSize:"0.75rem", fontWeight:600
                        }}>{u.actif ? "🔒 Désactiver" : "🔓 Activer"}</button>
                        <button onClick={() => supprimer(u.id)} style={{
                          padding:"5px 12px", borderRadius:8, border:"none",
                          background:"#fee2e2", color:"#991b1b",
                          cursor:"pointer", fontSize:"0.75rem", fontWeight:600
                        }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:"#f9fafb" }}>
                <td colSpan={5} style={{ padding:"0.75rem 1rem", fontSize:"0.8rem", color:"#6b7280" }}>
                  {liste.length} utilisateur(s) affiché(s) sur {utilisateurs.length} au total
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
        }}>
          <div style={{ background:"white", borderRadius:20, padding:"2rem", width:"100%", maxWidth:460, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
              <h4 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>
                {editUser ? "✏️ Modifier l'utilisateur" : "➕ Nouvel utilisateur"}
              </h4>
              <button onClick={fermer} style={{ background:"none", border:"none", fontSize:"1.25rem", cursor:"pointer" }}>✕</button>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem", boxSizing:"border-box" }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>
                Mot de passe {editUser ? "(vide = inchangé)" : "*"}
              </label>
              <input type="password" value={form.mot_de_passe} onChange={e => setForm({...form, mot_de_passe: e.target.value})}
                placeholder={editUser ? "Laisser vide pour conserver" : "Mot de passe"}
                style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem", boxSizing:"border-box" }} />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Rôle *</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
                  {ROLES.map(r => <option key={r.key} value={r.key}>{r.icon} {r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>Statut</label>
                <select value={form.actif} onChange={e => setForm({...form, actif: parseInt(e.target.value)})}
                  style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
                  <option value={1}>✅ Actif</option>
                  <option value={0}>❌ Inactif</option>
                </select>
              </div>
            </div>

            <div style={{ display:"flex", gap:12, marginTop:"1.5rem" }}>
              <button onClick={fermer} style={{
                flex:1, padding:"10px", borderRadius:10,
                border:"1.5px solid #e5e7eb", background:"white",
                cursor:"pointer", fontWeight:600
              }}>Annuler</button>
              <button onClick={sauvegarder} style={{
                flex:2, padding:"10px", borderRadius:10, border:"none",
                background:"linear-gradient(135deg,#1a56db,#1e429f)",
                color:"white", cursor:"pointer", fontWeight:600
              }}>💾 {editUser ? "Modifier" : "Créer le compte"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}