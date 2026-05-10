import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DashboardDeleguePage() {
  const [stats, setStats]     = useState({ seances: 0, clotures: 0, enCours: 0, taux: 0 });
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("edu_token");
  const user  = JSON.parse(localStorage.getItem("edu_user") || "{}");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/cahiers_texte.php`, {
        headers: { Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      const liste = Array.isArray(data) ? data : [];
      setRecents(liste.slice(0, 6));

      const clotures = liste.filter(c => c.statut==="cloture").length;
      const taux     = liste.length > 0 ? Math.round(clotures/liste.length*100) : 0;

      setStats({
        seances: liste.length,
        clotures,
        enCours: liste.filter(c => c.statut!=="cloture").length,
        taux,
      });
    } catch { }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>
          👨‍🎓 Bonjour, {user.prenom||"Délégué"} !
        </h2>
        <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
          Tableau de bord délégué — {MOIS[new Date().getMonth()+1]} {new Date().getFullYear()}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:"1.5rem" }}>
        {[
          { icon:"📚", label:"Total séances",   value:stats.seances,   color:"#1a56db", bg:"#dbeafe" },
          { icon:"✅", label:"Cahiers clôturés", value:stats.clotures,  color:"#057a55", bg:"#d1fae5" },
          { icon:"⏳", label:"En cours",         value:stats.enCours,   color:"#c27803", bg:"#fef3c7" },
          { icon:"📊", label:"Taux clôture",     value:stats.taux+"%",  color:"#7e3af2", bg:"#ede9fe" },
        ].map((k,i)=>(
          <div key={i} style={{
            background:"white", borderRadius:16, padding:"1.25rem",
            boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
            borderLeft:`4px solid ${k.color}`,
            display:"flex", alignItems:"center", gap:16
          }}>
            <div style={{ width:50, height:50, borderRadius:12, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.5rem" }}>{k.icon}</div>
            <div>
              <div style={{ fontSize:"1.5rem", fontWeight:700, color:"#111928", lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:"0.8rem", color:"#6b7280", marginTop:4 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:"1.5rem" }}>
        {[
          { icon:"📋", label:"Cahier de texte",  desc:"Saisir le contenu d'une séance", path:"/delegue/cahier",       color:"#7e3af2" },
          { icon:"📜", label:"Historique",        desc:"Consulter les séances passées",  path:"/delegue/historique",   color:"#1a56db" },
          { icon:"📅", label:"Emploi du temps",   desc:"Voir le planning de ma classe",  path:"/delegue/emploi-temps", color:"#057a55" },
        ].map((btn,i)=>(
          <button key={i} onClick={()=>navigate(btn.path)} style={{
            background:"white", borderRadius:16, padding:"1.5rem",
            boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
            border:`2px solid ${btn.color}22`,
            cursor:"pointer", textAlign:"left", transition:"all 0.2s"
          }}
          onMouseOver={e=>e.currentTarget.style.borderColor=btn.color}
          onMouseOut={e=>e.currentTarget.style.borderColor=`${btn.color}22`}>
            <div style={{ fontSize:"2rem", marginBottom:8 }}>{btn.icon}</div>
            <div style={{ fontWeight:700, fontSize:"1rem", color:"#111928", fontFamily:"'Poppins',sans-serif" }}>{btn.label}</div>
            <div style={{ fontSize:"0.8rem", color:"#6b7280", marginTop:4 }}>{btn.desc}</div>
          </button>
        ))}
      </div>

      {/* Séances récentes */}
      <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <div style={{ padding:"1rem 1.5rem", borderBottom:"1px solid #e5e7eb", background:"#f9fafb" }}>
          <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📋 Séances récentes</h5>
        </div>
        {loading ? (
          <div style={{ padding:"2rem", textAlign:"center" }}><div className="spinner-border text-primary"/></div>
        ) : recents.length===0 ? (
          <div style={{ padding:"2rem", textAlign:"center", color:"#6b7280" }}>Aucune séance enregistrée.</div>
        ) : recents.map((c,i)=>(
          <div key={c.id||i} style={{
            padding:"0.875rem 1.5rem",
            borderBottom:"1px solid #f3f4f6",
            display:"flex", justifyContent:"space-between", alignItems:"center",
            background:i%2===0?"white":"#fafafa"
          }}>
            <div>
              <div style={{ fontWeight:600, fontSize:"0.9rem" }}>{c.matiere||"Matière"}</div>
              <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>
                {c.enseignant_nom||""} • {c.date||""}
              </div>
            </div>
            <span style={{
              background:c.statut==="cloture"?"#d1fae5":"#fef3c7",
              color:c.statut==="cloture"?"#065f46":"#92400e",
              borderRadius:20, padding:"3px 12px", fontSize:"0.75rem", fontWeight:600
            }}>{c.statut==="cloture"?"✅ Clôturé":"⏳ En cours"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}