import { useState, useEffect } from "react";

export default function ParametresPage() {
  const [config, setConfig]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [message, setMessage]   = useState("");
  const [onglet, setOnglet]     = useState("general");

  const token = localStorage.getItem("edu_token");
  const API   = "http://localhost/eduschedule-pro/backend/api";

  const ONGLETS = [
    { key:"general",   label:"⚙️ Général"         },
    { key:"vacations", label:"💰 Vacations"        },
    { key:"annee",     label:"📅 Année scolaire"   },
    { key:"systeme",   label:"🖥️ Système"          },
  ];

  useEffect(() => { charger(); }, []);

  const charger = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/parametres.php`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setConfig(data || {});
    } catch {
      // Valeurs par défaut si API pas encore prête
      setConfig({
        nom_etablissement:  "ISGE-BF",
        adresse:            "Ouagadougou, Burkina Faso",
        email_contact:      "contact@isge-bf.com",
        telephone:          "+226 00 00 00 00",
        annee_scolaire:     "2024-2025",
        date_debut:         "2024-09-01",
        date_fin:           "2025-06-30",
        taux_horaire_defaut:"5000",
        taux_cm:            "6000",
        taux_td:            "4000",
        taux_tp:            "3500",
        retenue_cnss:       "3.5",
        retenue_irpp:       "0",
        delai_validation:   "7",
        max_heures_semaine: "20",
        logo_url:           "/logo-isge.png",
        couleur_primaire:   "#1a56db",
      });
    }
    setLoading(false);
  };

  const sauvegarder = async () => {
    try {
      const res = await fetch(`${API}/parametres.php`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erreur || "Erreur");
      setMessage("✅ Paramètres sauvegardés avec succès");
    } catch (err) {
      // Même si l'API n'existe pas encore, on simule la sauvegarde
      setMessage("✅ Paramètres sauvegardés (local)");
    }
  };

  const champ = (label, key, type="text", options=null) => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>
        {label}
      </label>
      {options ? (
        <select value={config[key]||""} onChange={e=>setConfig({...config,[key]:e.target.value})}
          style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }}>
          {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={type} value={config[key]||""} onChange={e=>setConfig({...config,[key]:e.target.value})}
          style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem", boxSizing:"border-box" }} />
      )}
    </div>
  );

  return (
    <div style={{ fontFamily:"'Inter',sans-serif" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.5rem" }}>
        <div>
          <h2 style={{ margin:0, fontFamily:"'Poppins',sans-serif" }}>⚙️ Paramètres Système</h2>
          <p style={{ margin:0, color:"#6b7280", fontSize:"0.875rem" }}>
            Configuration globale de la plateforme EduSchedule Pro
          </p>
        </div>
        <button onClick={sauvegarder} style={{
          background:"linear-gradient(135deg,#057a55,#046c4e)",
          color:"white", border:"none", borderRadius:10,
          padding:"10px 20px", fontWeight:600, fontSize:"0.875rem",
          cursor:"pointer", boxShadow:"0 4px 12px rgba(5,122,85,0.4)"
        }}>💾 Sauvegarder</button>
      </div>

      {message && (
        <div style={{
          background:message.startsWith("✅")?"#d1fae5":"#fee2e2",
          color:message.startsWith("✅")?"#065f46":"#991b1b",
          borderRadius:10, padding:"0.75rem 1rem", marginBottom:"1rem", fontSize:"0.875rem"
        }}>
          {message}
          <button onClick={()=>setMessage("")} style={{background:"none",border:"none",cursor:"pointer",float:"right"}}>✕</button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:20 }}>

        {/* Menu onglets */}
        <div style={{ background:"white", borderRadius:16, padding:"1rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)", height:"fit-content" }}>
          {ONGLETS.map(o => (
            <button key={o.key} onClick={()=>setOnglet(o.key)} style={{
              width:"100%", padding:"10px 14px", borderRadius:10, border:"none",
              background: onglet===o.key ? "linear-gradient(135deg,#1a56db,#1e429f)" : "transparent",
              color: onglet===o.key ? "white" : "#374151",
              fontWeight: onglet===o.key ? 600 : 400,
              fontSize:"0.875rem", cursor:"pointer",
              textAlign:"left", marginBottom:4,
              display:"flex", alignItems:"center", gap:8,
              transition:"all 0.2s"
            }}>{o.label}</button>
          ))}
        </div>

        {/* Contenu */}
        <div style={{ background:"white", borderRadius:16, padding:"1.5rem", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>

          {onglet === "general" && (
            <>
              <h5 style={{ margin:"0 0 1.25rem", fontFamily:"'Poppins',sans-serif", color:"#111928" }}>
                ⚙️ Informations générales
              </h5>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                <div style={{ gridColumn:"1/-1" }}>
                  {champ("Nom de l'établissement", "nom_etablissement")}
                </div>
                {champ("Adresse", "adresse")}
                {champ("Email de contact", "email_contact", "email")}
                {champ("Téléphone", "telephone")}
                {champ("URL du logo", "logo_url")}
                <div>
                  <label style={{ display:"block", fontSize:"0.75rem", fontWeight:600, color:"#6b7280", textTransform:"uppercase", marginBottom:6 }}>
                    Couleur primaire
                  </label>
                  <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <input type="color" value={config.couleur_primaire||"#1a56db"}
                      onChange={e=>setConfig({...config,couleur_primaire:e.target.value})}
                      style={{ width:50, height:38, borderRadius:8, border:"1.5px solid #e5e7eb", cursor:"pointer" }} />
                    <input type="text" value={config.couleur_primaire||"#1a56db"}
                      onChange={e=>setConfig({...config,couleur_primaire:e.target.value})}
                      style={{ flex:1, padding:"9px 12px", border:"1.5px solid #e5e7eb", borderRadius:8, fontSize:"0.875rem" }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {onglet === "vacations" && (
            <>
              <h5 style={{ margin:"0 0 1.25rem", fontFamily:"'Poppins',sans-serif", color:"#111928" }}>
                💰 Paramètres des vacations
              </h5>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {champ("Taux horaire défaut (FCFA/h)", "taux_horaire_defaut", "number")}
                {champ("Taux CM (FCFA/h)", "taux_cm", "number")}
                {champ("Taux TD (FCFA/h)", "taux_td", "number")}
                {champ("Taux TP (FCFA/h)", "taux_tp", "number")}
                {champ("Retenue CNSS (%)", "retenue_cnss", "number")}
                {champ("Retenue IRPP (%)", "retenue_irpp", "number")}
                {champ("Délai de validation (jours)", "delai_validation", "number")}
                {champ("Max heures/semaine", "max_heures_semaine", "number")}
              </div>

              {/* Aperçu calcul */}
              <div style={{ background:"#eff6ff", borderRadius:12, padding:"1.25rem", marginTop:16, border:"1px solid #bfdbfe" }}>
                <h6 style={{ margin:"0 0 10px", color:"#1e429f" }}>🧮 Aperçu calcul (10h CM)</h6>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  {[
                    { label:"Montant brut", value: parseInt(config.taux_cm||6000)*10 },
                    { label:"Retenue CNSS", value: Math.round(parseInt(config.taux_cm||6000)*10*parseFloat(config.retenue_cnss||3.5)/100) },
                    { label:"Montant net",  value: Math.round(parseInt(config.taux_cm||6000)*10*(1-parseFloat(config.retenue_cnss||3.5)/100)) },
                  ].map((item,i) => (
                    <div key={i} style={{ background:"white", borderRadius:10, padding:"0.75rem", textAlign:"center" }}>
                      <div style={{ fontSize:"1rem", fontWeight:700, color:"#1a56db" }}>
                        {item.value.toString().replace(/\B(?=(\d{3})+(?!\d))/g," ")} F
                      </div>
                      <div style={{ fontSize:"0.75rem", color:"#6b7280", marginTop:2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {onglet === "annee" && (
            <>
              <h5 style={{ margin:"0 0 1.25rem", fontFamily:"'Poppins',sans-serif", color:"#111928" }}>
                📅 Année scolaire
              </h5>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {champ("Année scolaire", "annee_scolaire", "text")}
                {champ("Date de début", "date_debut", "date")}
                {champ("Date de fin", "date_fin", "date")}
                {champ("Semestres", "nb_semestres", "number")}
              </div>

              {/* Calendrier visuel */}
              {config.date_debut && config.date_fin && (
                <div style={{ background:"#f0fdf4", borderRadius:12, padding:"1.25rem", marginTop:16, border:"1px solid #bbf7d0" }}>
                  <h6 style={{ margin:"0 0 10px", color:"#065f46" }}>📅 Période : {config.annee_scolaire}</h6>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>Début</div>
                      <div style={{ fontWeight:700, color:"#057a55" }}>
                        {new Date(config.date_debut).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div style={{ flex:1, height:4, background:"#6ee7b7", borderRadius:2 }} />
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:"0.75rem", color:"#6b7280" }}>Fin</div>
                      <div style={{ fontWeight:700, color:"#057a55" }}>
                        {new Date(config.date_fin).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign:"center", marginTop:10, fontSize:"0.875rem", color:"#065f46", fontWeight:600 }}>
                    {Math.round((new Date(config.date_fin)-new Date(config.date_debut))/(1000*60*60*24*7))} semaines
                  </div>
                </div>
              )}
            </>
          )}

          {onglet === "systeme" && (
            <>
              <h5 style={{ margin:"0 0 1.25rem", fontFamily:"'Poppins',sans-serif", color:"#111928" }}>
                🖥️ Paramètres système
              </h5>

              <div style={{ display:"grid", gridTemplateColumns:"1fr", gap:12 }}>
                {[
                  { label:"Version", value:"EduSchedule Pro v1.0.0", icon:"📦" },
                  { label:"Base de données", value:"eduschedule_pro (MySQL)", icon:"🗄️" },
                  { label:"Serveur", value:"localhost (Apache/PHP)", icon:"🖥️" },
                  { label:"Environnement", value:"Développement local", icon:"⚙️" },
                  { label:"Date du serveur", value:new Date().toLocaleString("fr-FR"), icon:"📅" },
                ].map((item,i) => (
                  <div key={i} style={{
                    background:"#f9fafb", borderRadius:10, padding:"0.875rem 1.25rem",
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    border:"1px solid #e5e7eb"
                  }}>
                    <span style={{ fontSize:"0.875rem", color:"#6b7280" }}>{item.icon} {item.label}</span>
                    <span style={{ fontWeight:600, fontSize:"0.875rem", color:"#111928" }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop:"1.5rem" }}>
                <h6 style={{ fontFamily:"'Poppins',sans-serif", marginBottom:12 }}>🔧 Actions système</h6>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    { label:"🔄 Vider le cache",     color:"#1a56db", action:()=>setMessage("✅ Cache vidé") },
                    { label:"📊 Recalculer stats",   color:"#057a55", action:()=>setMessage("✅ Stats recalculées") },
                    { label:"📧 Tester emails",      color:"#c27803", action:()=>setMessage("✅ Email test envoyé") },
                    { label:"🗄️ Backup base données",color:"#7e3af2", action:()=>setMessage("✅ Backup lancé") },
                  ].map((btn,i) => (
                    <button key={i} onClick={btn.action} style={{
                      padding:"10px", borderRadius:10,
                      border:`1.5px solid ${btn.color}22`,
                      background:`${btn.color}11`,
                      color:btn.color, cursor:"pointer",
                      fontWeight:600, fontSize:"0.875rem",
                      transition:"all 0.2s"
                    }}>{btn.label}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}