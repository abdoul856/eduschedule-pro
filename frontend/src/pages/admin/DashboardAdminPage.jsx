import { useState, useEffect } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, ArcElement, Title, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const KPI = ({ icon, label, value, color, bg }) => (
  <div style={{
    background: "white",
    borderRadius: 16,
    padding: "1.25rem",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    borderLeft: `4px solid ${color}`,
    display: "flex",
    alignItems: "center",
    gap: 16,
    transition: "all 0.2s"
  }}>
    <div style={{
      width: 50, height: 50,
      borderRadius: 12,
      background: bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.5rem"
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111928", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

export default function DashboardAdminPage() {
  const [stats, setStats]                 = useState({ total_classes: 0, total_enseignants: 0, total_cahiers: 0, permanent: 0, vacataire: 0 });
  const [pointagesJour, setPointagesJour] = useState([]);
  const [alertes, setAlertes]             = useState([]);
  const [heuresClasse, setHeuresClasse]   = useState([]);
  const [avancement, setAvancement]       = useState([]);
  const [loading, setLoading]             = useState(true);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  useEffect(() => {
    Promise.all([
      fetch(`${API}/classes.php`,     { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/enseignants.php`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/pointages.php`,   { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/cahiers.php`,     { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/dashboard.php`,   { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([classes, enseignants, pointages, cahiers, dashboard]) => {
      const permanent = enseignants.filter(e => e.statut === 'permanent').length;
      const vacataire = enseignants.filter(e => e.statut === 'vacataire').length;
      const today     = new Date().toDateString();
      const pJour     = Array.isArray(pointages) ? pointages.filter(p => new Date(p.date_creation).toDateString() === today) : [];
      const alerts    = [];
      if (Array.isArray(cahiers)) {
        const ns = cahiers.filter(c => !c.statut_cahier).length;
        if (ns > 0) alerts.push(`📋 ${ns} cahier(s) non rempli(s)`);
        const ea = cahiers.filter(c => c.statut_cahier === 'signe_delegue').length;
        if (ea > 0) alerts.push(`✍️ ${ea} cahier(s) en attente signature enseignant`);
      }
      if (Array.isArray(pointages)) {
        const r = pointages.filter(p => p.statut === 'retard').length;
        if (r > 0) alerts.push(`⚠️ ${r} retard(s) enregistré(s)`);
      }
      setStats({ total_classes: classes.length, total_enseignants: enseignants.length, total_cahiers: Array.isArray(cahiers) ? cahiers.filter(c => c.statut_cahier).length : 0, permanent, vacataire });
      setPointagesJour(pJour);
      setAlertes(alerts);
      setHeuresClasse(dashboard.heures_par_classe    || []);
      setAvancement(dashboard.avancement_matieres    || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const heuresBarData = {
    labels: heuresClasse.map(h => h.classe),
    datasets: [
      { label: "Planifiées", data: heuresClasse.map(h => parseFloat(h.heures_planifiees||0).toFixed(1)), backgroundColor: "#1a56db", borderRadius: 6 },
      { label: "Réalisées",  data: heuresClasse.map(h => parseFloat(h.heures_realisees||0).toFixed(1)),  backgroundColor: "#057a55", borderRadius: 6 }
    ]
  };

  const avancementData = {
    labels: avancement.map(a => a.matiere),
    datasets: [
      { label: "Réalisées", data: avancement.map(a => parseFloat(a.heures_realisees||0).toFixed(1)), backgroundColor: "#057a55", borderRadius: 6 },
      { label: "Volume prévu", data: avancement.map(a => parseFloat(a.volume_horaire_total||0)), backgroundColor: "#e5e7eb", borderRadius: 6 }
    ]
  };

  const donutData = {
    labels: ["Permanents", "Vacataires"],
    datasets: [{ data: [stats.permanent, stats.vacataire], backgroundColor: ["#1a56db", "#7e3af2"], borderWidth: 0 }]
  };

  const presenceData = {
    labels: ["À l'heure", "Retard", "Absent"],
    datasets: [{ data: [pointagesJour.filter(p => p.statut==='valide').length, pointagesJour.filter(p => p.statut==='retard').length, 0], backgroundColor: ["#057a55", "#c27803", "#e02424"], borderWidth: 0 }]
  };

  const ACCÈS = [
    { icon: "📅", label: "Emploi du temps",  path: "/admin/emploi-temps", color: "#1a56db", bg: "#dbeafe" },
    { icon: "📱", label: "Générer QR-Codes", path: "/admin/qrcode",       color: "#057a55", bg: "#d1fae5" },
    { icon: "👨‍🏫", label: "Enseignants",     path: "/admin/enseignants",  color: "#7e3af2", bg: "#ede9fe" },
    { icon: "🏫", label: "Classes",           path: "/admin/classes",      color: "#0694a2", bg: "#cffafe" },
    { icon: "📚", label: "Matières",          path: "/admin/matieres",     color: "#c27803", bg: "#fef3c7" },
    { icon: "🏛️", label: "Salles",           path: "/admin/salles",       color: "#6b7280", bg: "#f3f4f6" },
  ];

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner-border text-primary mb-3" />
        <p style={{ color: "#6b7280" }}>Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontFamily: "'Poppins',sans-serif" }}>
            Tableau de bord 📊
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
            {new Date().toLocaleDateString("fr-FR", { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: "8px 16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          fontSize: "0.8rem",
          color: "#6b7280"
        }}>
          🎓 ISGE-BF — 2025-2026
        </div>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: 12,
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem"
        }}>
          <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 8 }}>🔔 Alertes en temps réel</div>
          {alertes.map((a, i) => (
            <div key={i} style={{ color: "#78350f", fontSize: "0.875rem", marginBottom: 4 }}>• {a}</div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: "1.5rem" }}>
        <KPI icon="🏫" label="Classes"              value={stats.total_classes}     color="#1a56db" bg="#dbeafe" />
        <KPI icon="👨‍🏫" label="Enseignants"         value={stats.total_enseignants}  color="#057a55" bg="#d1fae5" />
        <KPI icon="📋" label="Cahiers signés"        value={stats.total_cahiers}      color="#c27803" bg="#fef3c7" />
        <KPI icon="📱" label="Pointages aujourd'hui" value={pointagesJour.length}     color="#0694a2" bg="#cffafe" />
      </div>

      {/* Pointages du jour */}
      {pointagesJour.length > 0 && (
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom: "1.5rem", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6", fontWeight: 600 }}>
            📱 Pointages du jour
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Enseignant","Matière","Classe","Heure prévue","Heure réelle","Statut"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pointagesJour.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>{p.enseignant}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{p.matiere}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{p.classe}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{p.heure_prevue?.slice(0,5)}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>{new Date(p.heure_pointage_reelle).toLocaleTimeString("fr-FR",{hour:'2-digit',minute:'2-digit'})}</td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: p.statut==='valide' ? '#d1fae5' : p.statut==='retard' ? '#fef3c7' : '#fee2e2',
                      color: p.statut==='valide' ? '#065f46' : p.statut==='retard' ? '#92400e' : '#991b1b'
                    }}>
                      {p.statut==='valide' ? '🟢 À l\'heure' : p.statut==='retard' ? '🟠 Retard' : '🔴 Absent'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Graphiques */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: "1.5rem" }}>
        <div style={{ background: "white", borderRadius: 16, padding: "1.25rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", gridColumn: "span 1" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>👨‍🏫 Enseignants par statut</div>
          <Doughnut data={donutData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
        </div>
        <div style={{ background: "white", borderRadius: 16, padding: "1.25rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>📱 Présence aujourd'hui</div>
          <Doughnut data={presenceData} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
        </div>
        <div style={{ background: "white", borderRadius: 16, padding: "1.25rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 Statistiques rapides</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {[
              { label: "Permanents", value: stats.permanent, color: "#1a56db" },
              { label: "Vacataires", value: stats.vacataire, color: "#7e3af2" },
              { label: "Total cahiers", value: stats.total_cahiers, color: "#057a55" },
              { label: "Pointages", value: pointagesJour.length, color: "#0694a2" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{s.label}</span>
                <span style={{
                  fontWeight: 700, color: s.color,
                  background: `${s.color}15`,
                  padding: "2px 12px",
                  borderRadius: 20,
                  fontSize: "0.875rem"
                }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Heures planifiées vs réalisées */}
      {heuresClasse.length > 0 && (
        <div style={{ background: "white", borderRadius: 16, padding: "1.25rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>📊 Heures planifiées vs réalisées par classe</div>
          <Bar data={heuresBarData} options={{ responsive: true, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true } } }} />
        </div>
      )}

      {/* Avancement programmes */}
      {avancement.length > 0 && (
        <div style={{ background: "white", borderRadius: 16, padding: "1.25rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom: "1.5rem" }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>📚 Avancement des programmes par matière</div>
          <Bar data={avancementData} options={{ responsive: true, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true } } }} />
          <div style={{ marginTop: 16 }}>
            {avancement.map((a, i) => {
              const pct = Math.min(100, Math.round((parseFloat(a.heures_realisees||0) / parseFloat(a.volume_horaire_total||1)) * 100));
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 140, fontSize: "0.8rem", color: "#374151", fontWeight: 500 }}>{a.matiere}</div>
                  <div style={{ flex: 1, background: "#e5e7eb", borderRadius: 50, height: 8, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: pct >= 75 ? "#057a55" : pct >= 50 ? "#c27803" : "#e02424",
                      borderRadius: 50,
                      transition: "width 0.6s ease"
                    }} />
                  </div>
                  <div style={{ width: 40, fontSize: "0.8rem", fontWeight: 600, color: "#374151", textAlign: "right" }}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accès rapides */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: "0.875rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          ⚡ Accès rapides
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {ACCÈS.map(item => (
            <a key={item.path} href={item.path} style={{
              background: "white",
              borderRadius: 14,
              padding: "1rem",
              textAlign: "center",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: `1px solid ${item.color}22`,
              transition: "all 0.2s",
              display: "block"
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.12)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#374151" }}>{item.label}</div>
              <div style={{
                marginTop: 8,
                display: "inline-block",
                background: item.bg,
                color: item.color,
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: "0.7rem",
                fontWeight: 600
              }}>→</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}