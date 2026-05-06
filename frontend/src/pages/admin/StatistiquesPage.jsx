import { useState, useEffect } from "react";

export default function StatistiquesPage() {
  const [stats, setStats]     = useState(null);
  const [annee, setAnnee]     = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const MOIS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

  const formatMontant = (val) =>
    parseInt(val||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")+" FCFA";

  useEffect(() => { charger(); }, [annee]);

  const charger = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/statistiques.php?annee=${annee}`, {
        headers: { Authorization:`Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch {
      // Données de démo si API pas prête
      setStats({
        utilisateurs: { total:25, admins:1, enseignants:12, surveillants:2, comptables:1, delegues:5, etudiants:4 },
        enseignants:  { total:12, actifs:10, vacations_generees:45 },
        vacations:    { total:45, generees:5, visees:8, approuvees:12, payees:20, montant_total:4500000, montant_paye:2800000 },
        pointages:    { total:180, valides:162, taux:90 },
        cahiers:      { total:180, clotures:150, taux:83 },
        parMois: MOIS.map((m,i) => ({
          mois:i+1, label:m,
          fiches: Math.floor(Math.random()*8)+2,
          montant: Math.floor(Math.random()*500000)+200000,
          pointages: Math.floor(Math.random()*20)+10,
        }))
      });
    }
    setLoading(false);
  };

  if (loading) return (
    <div style={{ textAlign:"center", padding:"4rem" }}>
      <div className="spinner-border text-primary" style={{ width:"3rem", height:"3rem" }} />
      <p style={{ marginTop:"1rem", color:"#6b7280" }}>Chargement des statistiques...</p>
    </div>
  );

  if (!stats) return null;

  const maxFiches  = Math.max(...(stats.parMois||[]).map(m=>m.fiches),1);
  const maxMontant = Math.max(...(stats.parMois||[]).map(m=>m.montant),1);

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📊 Statistiques Globales</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Vue d'ensemble complète de la plateforme
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <label style={{ fontSize:"0.875rem", color:"#6b7280", fontWeight:600 }}>Année :</label>
          <input type="number" value={annee} onChange={e=>setAnnee(e.target.value)}
            style={{ padding:"6px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem", width:90 }} />
        </div>
      </div>

      {/* KPIs principaux */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:"1.5rem" }}>
        {[
          { icon:"👥", label:"Utilisateurs",      value:stats.utilisateurs?.total||0,    color:"#1a56db", bg:"#dbeafe" },
          { icon:"👨‍🏫", label:"Enseignants actifs", value:stats.enseignants?.actifs||0,    color:"#057a55", bg:"#d1fae5" },
          { icon:"📋", label:"Vacations totales",  value:stats.vacations?.total||0,       color:"#c27803", bg:"#fef3c7" },
          { icon:"🏦", label:"Montant total",
            value:(stats.vacations?.montant_total||0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g," ")+" F",
            color:"#0694a2", bg:"#cffafe" },
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

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:"1.5rem" }}>

        {/* Statuts vacations */}
        <div style={{ background:"white", borderRadius:16, padding:"1.5rem", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <h5 style={{ margin:"0 0 1.25rem", fontFamily:"'Poppins',sans-serif" }}>📋 Statuts des vacations</h5>
          {[
            { label:"Générées",  value:stats.vacations?.generees||0,  color:"#374151", bg:"#f3f4f6" },
            { label:"Visées",    value:stats.vacations?.visees||0,    color:"#92400e", bg:"#fef3c7" },
            { label:"Approuvées",value:stats.vacations?.approuvees||0,color:"#065f46", bg:"#d1fae5" },
            { label:"Payées",    value:stats.vacations?.payees||0,    color:"#1e429f", bg:"#dbeafe" },
          ].map((item,i) => {
            const total = stats.vacations?.total||1;
            const pct   = Math.round(item.value/total*100);
            return (
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:"0.875rem", fontWeight:500, color:"#374151" }}>{item.label}</span>
                  <span style={{ fontSize:"0.875rem", fontWeight:700, color:item.color }}>{item.value} ({pct}%)</span>
                </div>
                <div style={{ height:8, background:"#f3f4f6", borderRadius:4 }}>
                  <div style={{ width:`${pct}%`, height:"100%", background:item.color, borderRadius:4, transition:"width 0.5s" }} />
                </div>
              </div>
            );
          })}

          <div style={{ marginTop:16, padding:"0.875rem", background:"#f9fafb", borderRadius:10, display:"flex", justifyContent:"space-between" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontWeight:700, color:"#1a56db" }}>{formatMontant(stats.vacations?.montant_total)}</div>
              <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>Montant total</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontWeight:700, color:"#057a55" }}>{formatMontant(stats.vacations?.montant_paye)}</div>
              <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>Déjà payé</div>
            </div>
          </div>
        </div>

        {/* Taux pointages / cahiers */}
        <div style={{ background:"white", borderRadius:16, padding:"1.5rem", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
          <h5 style={{ margin:"0 0 1.25rem", fontFamily:"'Poppins',sans-serif" }}>📈 Taux de conformité</h5>
          {[
            {
              label:"Pointages QR validés",
              valide: stats.pointages?.valides||0,
              total:  stats.pointages?.total||0,
              taux:   stats.pointages?.taux||0,
              color:"#1a56db", icon:"📱"
            },
            {
              label:"Cahiers clôturés",
              valide: stats.cahiers?.clotures||0,
              total:  stats.cahiers?.total||0,
              taux:   stats.cahiers?.taux||0,
              color:"#057a55", icon:"📋"
            },
          ].map((item,i) => (
            <div key={i} style={{ marginBottom:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:"0.875rem", fontWeight:600 }}>{item.icon} {item.label}</span>
                <span style={{ fontSize:"1.25rem", fontWeight:700, color:item.color }}>{item.taux}%</span>
              </div>
              <div style={{ height:14, background:"#f3f4f6", borderRadius:7 }}>
                <div style={{
                  width:`${item.taux}%`, height:"100%",
                  background:`linear-gradient(90deg,${item.color},${item.color}88)`,
                  borderRadius:7, transition:"width 0.5s"
                }} />
              </div>
              <div style={{ fontSize:"0.75rem", color:"#6b7280", marginTop:4 }}>
                {item.valide} / {item.total} séances
              </div>
            </div>
          ))}

          {/* Répartition utilisateurs */}
          <h6 style={{ fontFamily:"'Poppins',sans-serif", marginBottom:10, color:"#374151" }}>👥 Répartition utilisateurs</h6>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {[
              { label:"Enseignants", value:stats.utilisateurs?.enseignants||0, color:"#057a55" },
              { label:"Étudiants",   value:stats.utilisateurs?.etudiants||0,   color:"#e02424" },
              { label:"Délégués",    value:stats.utilisateurs?.delegues||0,    color:"#7e3af2" },
            ].map((item,i) => (
              <div key={i} style={{
                background:`${item.color}11`,
                border:`1px solid ${item.color}33`,
                borderRadius:10, padding:"0.625rem", textAlign:"center"
              }}>
                <div style={{ fontWeight:700, color:item.color, fontSize:"1.25rem" }}>{item.value}</div>
                <div style={{ fontSize:"0.7rem", color:"#6b7280" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graphique barres par mois */}
      <div style={{ background:"white", borderRadius:16, padding:"1.5rem", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)", marginBottom:"1.5rem" }}>
        <h5 style={{ margin:"0 0 1.25rem", fontFamily:"'Poppins',sans-serif" }}>
          📅 Évolution mensuelle {annee}
        </h5>
        <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:180, padding:"0 8px" }}>
          {(stats.parMois||[]).map((m,i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <div style={{ fontSize:"0.65rem", fontWeight:600, color:"#1a56db" }}>
                {m.fiches}
              </div>
              <div style={{
                width:"100%", borderRadius:"4px 4px 0 0",
                background:`linear-gradient(180deg,#1a56db,#1e429f)`,
                height:`${Math.round((m.fiches/maxFiches)*140)}px`,
                minHeight:4, transition:"height 0.5s"
              }} />
              <div style={{ fontSize:"0.65rem", color:"#6b7280", textAlign:"center" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:"center", marginTop:8, fontSize:"0.75rem", color:"#6b7280" }}>
          Nombre de fiches de vacation par mois
        </div>
      </div>

      {/* Tableau récapitulatif mensuel */}
      <div style={{ background:"white", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
        <div style={{ padding:"1rem 1.5rem", borderBottom:"1px solid #e5e7eb", background:"#f9fafb" }}>
          <h5 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>📊 Tableau récapitulatif mensuel {annee}</h5>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
              {["Mois","Nb fiches","Pointages","Montant vacation","Progression"].map(h => (
                <th key={h} style={{ padding:"0.875rem 1rem", textAlign:"left", fontSize:"0.75rem", fontWeight:600, color:"#1e429f", textTransform:"uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(stats.parMois||[]).map((m,i) => {
              const pct = Math.round((m.fiches/maxFiches)*100);
              return (
                <tr key={i} style={{ borderBottom:"1px solid #f3f4f6", background:i%2===0?"white":"#fafafa" }}>
                  <td style={{ padding:"0.875rem 1rem", fontWeight:600 }}>{m.label}</td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <span style={{ background:"#dbeafe", color:"#1e429f", borderRadius:20, padding:"2px 10px", fontSize:"0.75rem", fontWeight:600 }}>
                      {m.fiches}
                    </span>
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>{m.pointages||0}</td>
                  <td style={{ padding:"0.875rem 1rem", fontWeight:700, color:"#1a56db" }}>
                    {(m.montant||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")} F
                  </td>
                  <td style={{ padding:"0.875rem 1rem" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:6, background:"#e5e7eb", borderRadius:3 }}>
                        <div style={{ width:`${pct}%`, height:"100%", background:"#1a56db", borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:"0.75rem", color:"#6b7280", minWidth:35 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:"#f9fafb", fontWeight:700 }}>
              <td style={{ padding:"1rem" }}>TOTAL {annee}</td>
              <td style={{ padding:"1rem", color:"#1a56db" }}>{stats.vacations?.total||0} fiches</td>
              <td style={{ padding:"1rem" }}>{stats.pointages?.total||0}</td>
              <td style={{ padding:"1rem", color:"#1a56db" }}>{formatMontant(stats.vacations?.montant_total)}</td>
              <td style={{ padding:"1rem" }}>—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}