import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MENUS = {
  admin: [
  { label: "Tableau de bord", icon: "📊", path: "/admin/dashboard"     },
  { label: "Emploi du temps", icon: "📅", path: "/admin/emploi-temps"  },
  { label: "QR-Codes",        icon: "📱", path: "/admin/qrcode"        },
  { label: "Enseignants",     icon: "👨‍🏫", path: "/admin/enseignants"   },
  { label: "Classes",         icon: "🏫", path: "/admin/classes"       },
  { label: "Matières",        icon: "📚", path: "/admin/matieres"      },
  { label: "Salles",          icon: "🏛️", path: "/admin/salles"        },
  { label: "Utilisateurs",    icon: "👥", path: "/admin/utilisateurs"  },
  { label: "Statistiques",    icon: "📈", path: "/admin/statistiques"  },
  { label: "Paramètres",      icon: "⚙️", path: "/admin/parametres"    },
],
  
  enseignant: [
  { label: "Mon dashboard",   icon: "📊", path: "/enseignant/dashboard" },
  { label: "Pointage QR",     icon: "📱", path: "/enseignant/pointage"  },
  { label: "Signer cahiers",  icon: "✍️", path: "/enseignant/signature" },
  { label: "Mes vacations",   icon: "💼", path: "/enseignant/vacations" },
],
delegue: [
  { label: "Mon dashboard",   icon: "📊", path: "/delegue/dashboard"   },
  { label: "Cahier de texte", icon: "📋", path: "/delegue/cahier"      },
  { label: "Historique",      icon: "📜", path: "/delegue/historique"  },
],
  surveillant: [
  { label: "Tableau de bord",      icon: "📊", path: "/surveillant/dashboard"   },
  { label: "Vérification fiches",  icon: "🔎", path: "/surveillant/verification" },
  { label: "Validation contrôle",  icon: "✅", path: "/surveillant/validation"  },
  { label: "Rapports",             icon: "📊", path: "/surveillant/rapports"    },
],
  comptable: [
    { label: "Tableau de bord",      icon: "📊", path: "/comptable/dashboard" },
    { label: "Validation",           icon: "✅", path: "/comptable/validation" },
    { label: "Bons de paiement",     icon: "🧾", path: "/comptable/bons" },
    { label: "Liste vacations",      icon: "📋", path: "/comptable/vacations" },
    { label: "Rapport mensuel",      icon: "📊", path: "/comptable/rapport-mensuel" },
    { label: "Rapport annuel",       icon: "📈", path: "/comptable/rapport-annuel" },
    { label: "Historique paiements", icon: "💳", path: "/comptable/historique" },
    { label: "Archives",             icon: "🗄️", path: "/comptable/archives" },
  ],
  etudiant: [
    { label: "Emploi du temps", icon: "📅", path: "/etudiant/emploi-temps" },
  ],
};

const ROLE_LABELS = {
  admin:       "Administrateur",
  enseignant:  "Enseignant",
  delegue:     "Délégué",
  surveillant: "Surveillant",
  comptable:   "Comptable",
  etudiant:    "Étudiant",
};

const ROLE_COLORS = {
  admin:       "#1a56db",
  enseignant:  "#057a55",
  delegue:     "#7e3af2",
  surveillant: "#c27803",
  comptable:   "#0694a2",
  etudiant:    "#e02424",
};

const ROLE_ICONS = {
  admin:       "👨‍💼",
  enseignant:  "👨‍🏫",
  delegue:     "👨‍🎓",
  surveillant: "🔍",
  comptable:   "💼",
  etudiant:    "👤",
};

export default function DashboardLayout() {
  const { utilisateur, deconnexion } = useAuth();
  const navigate  = useNavigate();
  const menus     = MENUS[utilisateur?.role] || [];
  const roleColor = ROLE_COLORS[utilisateur?.role] || "#1a56db";

  const handleDeconnexion = () => {
    deconnexion();
    navigate("/login");
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Inter', sans-serif" }}>

      {/* ── Sidebar ── */}
      <nav style={{
        width: 260,
        minHeight: "100vh",
        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 1rem",
        boxShadow: "4px 0 20px rgba(0,0,0,0.2)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto"
      }}>

        {/* Logo */}
        <div style={{
          textAlign: "center",
          marginBottom: "1.5rem",
          paddingBottom: "1.5rem",
          borderBottom: "1px solid rgba(255,255,255,0.08)"
        }}>
          <img src="/logo-isge.png" alt="ISGE"
            style={{ width:70, marginBottom:10, filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.3))" }} />
          <div style={{
            color: "white", fontFamily: "'Poppins', sans-serif",
            fontWeight: 700, fontSize: "1rem", letterSpacing: "0.5px"
          }}>EduSchedule</div>
          <div style={{
            color: "rgba(255,255,255,0.4)", fontSize: "0.7rem",
            letterSpacing: "2px", textTransform: "uppercase"
          }}>Pro</div>
        </div>

        {/* Profil */}
        <div style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 14, padding: "1rem",
          marginBottom: "1.5rem",
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", marginBottom: 8,
            boxShadow: `0 4px 12px ${roleColor}40`
          }}>
            {ROLE_ICONS[utilisateur?.role] || "👤"}
          </div>
          <div style={{
            color: "white", fontSize: "0.75rem", fontWeight: 600,
            marginBottom: 4, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap"
          }}>{utilisateur?.email}</div>
          <span style={{
            background: `${roleColor}33`,
            color: roleColor,
            border: `1px solid ${roleColor}55`,
            borderRadius: 20, padding: "2px 10px",
            fontSize: "0.7rem", fontWeight: 600
          }}>
            {ROLE_LABELS[utilisateur?.role]}
          </span>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: "rgba(255,255,255,0.3)", fontSize: "0.65rem",
            fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "1px", marginBottom: 8, paddingLeft: 8
          }}>Navigation</div>

          {menus.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 12, marginBottom: 4,
                textDecoration: "none",
                color: isActive ? "white" : "rgba(255,255,255,0.6)",
                background: isActive
                  ? `linear-gradient(135deg, ${roleColor}cc, ${roleColor}88)`
                  : "transparent",
                boxShadow: isActive ? `0 4px 12px ${roleColor}40` : "none",
                fontWeight: isActive ? 600 : 400,
                fontSize: "0.875rem", transition: "all 0.2s",
                border: isActive ? `1px solid ${roleColor}44` : "1px solid transparent"
              })}
            >
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Déconnexion */}
        <div style={{ marginTop:"1rem", paddingTop:"1rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={handleDeconnexion}
            style={{
              width: "100%", padding: "10px 14px",
              background: "rgba(224,36,36,0.1)",
              border: "1px solid rgba(224,36,36,0.2)",
              borderRadius: 12, color: "#fc8181",
              fontSize: "0.875rem", fontWeight: 500,
              cursor: "pointer", display: "flex",
              alignItems: "center", gap: 10, transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(224,36,36,0.2)"}
            onMouseOut={e  => e.currentTarget.style.background = "rgba(224,36,36,0.1)"}
          >
            🚪 Se déconnecter
          </button>
        </div>
      </nav>

      {/* ── Contenu principal ── */}
      <main style={{ flex:1, background:"#f3f4f6", padding:"2rem", overflowY:"auto" }}>
        <Outlet />
      </main>
    </div>
  );
}