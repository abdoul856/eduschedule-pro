// src/components/AlertCard.jsx
export default function AlertCard({ type = "info", message, onClose }) {
  const icons = {
    success: "✅",
    danger:  "❌",
    warning: "⚠️",
    info:    "ℹ️"
  };

  return (
    <div className={`alert alert-${type} alert-dismissible d-flex align-items-center gap-2`}>
      <span>{icons[type]}</span>
      <span className="flex-grow-1">{message}</span>
      {onClose && (
        <button className="btn-close" onClick={onClose} />
      )}
    </div>
  );
}