import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DashboardEnseignantPage() {
  const [stats, setStats]       = useState({ seances: 0, pointages: 0, cahiers: 0, montant: 0 });
  const [vacations, setVacations] = useState([]);
  const [prochaines, setProchaines] = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("edu_token");
  const user  = JSON.parse(localStorage.getItem("edu_user") || "{}");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
                "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

  const formatMontant = (val) =>
    parseInt(val||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" FCFA";

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const mois  = new Date().getMonth() + 1;
      const annee = new Date().getFullYear();

      // Vacations
      const resV = await fetch(`${API}/vacations.php?mois=${mois}&annee=${annee}`, {
        headers: { Authorization:`Bearer ${token}` }
      });
      const dataV = await resV.json();
      const liste = Array.isArray(dataV) ? dataV : [];
      setVacations(liste);

      // Stats
      const totalHeures  = liste.reduce((s,v) =>
        s + (v.lignes||[]).reduce((sh,l) => sh + parseFloat(l.duree_heures||0), 0), 0);
      const totalPointes = liste.reduce((s,v) =>
        s + (v.lignes||[]).filter(l => l.pointage_id).length, 0);
      const totalCahiers = liste.reduce((s,v) =>
        s + (v.lignes||[]).filter(l => l.statut_cahier==="cloture").length, 0);
      const totalMontant = liste.reduce((s,v) => s + parseFloat(v.montant_net||0), 0);

      setStats({
        seances:  liste.reduce((s,v) => s + (v.lignes||[]).length, 0),
        pointages: totalPointes,
        cahiers:  totalCahiers,
        montant:  totalMontant,
      });

      // Emploi du temps (prochaines séances)
      const resE = await fetch(`${API}/emploi_temps.php`, {
        headers: { Authorization:`Bearer ${token}` }
      });
      const dataE = await resE.json();
      setProchaines(Array.isArray(dataE) ? dataE.slice(0,5) : []);

    } catch { }
    setLoading(false);
  };

  const moisCourant = MOIS[new Date().getMonth()+1];
  const anneeCourante = new Date().getFullYear();

  const STATUT_CONFIG = {
    generee:           { label:"Générée",          bg:"#f3f4f6", color:"#374151" },
    visee_surveillant: { label:"Visée",             bg:"#fef3c7", color:"#92400e" },
    approuvee:         { label:"Approuvée",         bg:"#d1fae5", color:"#065f46" },
    payee:             { label:"Payée",             bg:"#dbeafe", color:"#1e429f" },
  };

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      {/* En-tête */}
      <div style={{ marginBottom:"1.5rem" }}>
        <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>
          👨‍🏫 Bonjour, {user.prenom || "Enseignant"} !
        </h2>
        <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
          Tableau de bord — {moisCourant} {anneeCourante}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:"1.5rem" }}>
        {[
          { icon:"📚", label:"Séances ce mois",  value:stats.seances,   color:"#1a56db", bg:"#dbeafe" },
          { icon:"📱", label:"Pointages validés", value:stats.pointages, color:"#057a55", bg:"#d1fae5" },
          { icon:"📋", label:"Cahiers clôturés",  value:stats.cahiers,   color:"#7e3af2", bg:"#ede9fe" },
          { icon:"💰", label:"Montant net",
            value:stats.montant.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",
            color:"#c27803", bg:"#fef3c7" },
        ].map((k,i) => (
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
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:"1.5rem" }}>
        {[
          { icon:"📱", label:"Scanner QR", desc:"Pointer ma présence", path:"/enseignant/pointage", color:"#1a56db" },
          { icon:"✍️", label:"Signer cahier", desc:"Clôturer une séance", path:"/enseignant/signature", color:"#057a55" },
          { icon:"💼", label:"Mes vacations", desc:"Consulter mes fiches", path:"/enseignant/vacations", color:"#c27803" },
        ].map((btn,i) => (
          <button key={i} onClick={() => navigate(btn.path)} style={{
            background:"white", borderRadius:16, padding:"1.5rem",
            boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)",
            border:`2px solid ${btn.color}22`,
            cursor:"pointer", textAlign:"left",
            transition:"all 0.2s"
          }}
          onMouseOver={e => e.currentTarget.style.borderColor = btn.color}
          onMouseOut={e  => e.currentTarget.style.borderColor = `${btn.color}22`}>
            <div style={{ fontSize:"2rem", marginBottom:8 }}>{btn.icon}</div>
            <div style={{ fontWeight:700, fontSize:"1rem", color:"#111928", fontFamily:"'Poppins',sans-serif" }}>{btn.label}</div>
            <div style={{ fontSize:"0.8rem", color:"#6b7280", marginTop:4 }}>{btn.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>

        {/* Fiches du mois */}
        <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ padding:"1rem 1.5rem", borderBottom:"1px solid #e5e7eb", background:"#f9fafb" }}>
            <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📋 Mes fiches — {moisCourant}</h5>
          </div>
          {loading ? (
            <div style={{ padding:"2rem", textAlign:"center" }}><div className="spinner-border text-primary"/></div>
          ) : vacations.length === 0 ? (
            <div style={{ padding:"2rem", textAlign:"center", color:"#6b7280" }}>
              Aucune fiche ce mois.
            </div>
          ) : vacations.map((v,i) => {
            const cfg = STATUT_CONFIG[v.statut] || { label:v.statut, bg:"#f3f4f6", color:"#374151" };
            return (
              <div key={v.id} style={{ padding:"1rem 1.5rem", borderBottom:"1px solid #f3f4f6", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:"0.9rem" }}>{MOIS[v.mois]} {v.annee}</div>
                  <span style={{ background:cfg.bg, color:cfg.color, borderRadius:20, padding:"2px 10px", fontSize:"0.7rem", fontWeight:600 }}>
                    ● {cfg.label}
                  </span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontWeight:700, color:"#1a56db" }}>{formatMontant(v.montant_net)}</div>
                  <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>{v.lignes?.length||0} séance(s)</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alertes */}
        <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <div style={{ padding:"1rem 1.5rem", borderBottom:"1px solid #e5e7eb", background:"#f9fafb" }}>
            <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>⚠️ Alertes & Actions requises</h5>
          </div>
          <div style={{ padding:"1rem" }}>
            {vacations.flatMap(v => v.alertes||[]).length === 0 ? (
              <div style={{ padding:"1rem", textAlign:"center", color:"#057a55" }}>
                ✅ Tout est en ordre !
              </div>
            ) : vacations.map(v =>
              (v.alertes||[]).map((a,i) => (
                <div key={`${v.id}-${i}`} style={{
                  background:"#fef3c7", borderRadius:10, padding:"0.75rem",
                  marginBottom:8, fontSize:"0.8rem", color:"#92400e",
                  border:"1px solid #fcd34d"
                }}>⚠️ {a}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}