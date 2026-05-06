// src/context/NotifContext.jsx
import { createContext, useContext, useState, useCallback } from "react";

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // Ajouter une notification
  const notifier = useCallback((message, type = "info", duree = 4000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    // Supprimer automatiquement après la durée
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duree);
  }, []);

  const succes  = (msg) => notifier(msg, "success");
  const erreur  = (msg) => notifier(msg, "danger");
  const info    = (msg) => notifier(msg, "info");
  const alerte  = (msg) => notifier(msg, "warning");

  const supprimer = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotifContext.Provider value={{ notifications, notifier, succes, erreur, info, alerte, supprimer }}>
      {children}

      {/* Zone d'affichage des notifications */}
      <div style={{
        position:  "fixed",
        top:       20,
        right:     20,
        zIndex:    9999,
        minWidth:  300,
        maxWidth:  400
      }}>
        {notifications.map(n => (
          <div key={n.id}
            className={`alert alert-${n.type} alert-dismissible shadow d-flex align-items-center gap-2 mb-2`}
            style={{ animation: "slideIn 0.3s ease" }}>
            <span>
              {n.type === "success" ? "✅" :
               n.type === "danger"  ? "❌" :
               n.type === "warning" ? "⚠️" : "ℹ️"}
            </span>
            <span className="flex-grow-1">{n.message}</span>
            <button
              className="btn-close"
              onClick={() => supprimer(n.id)}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </NotifContext.Provider>
  );
}

export function useNotif() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error("useNotif doit être dans NotifProvider");
  return ctx;
}