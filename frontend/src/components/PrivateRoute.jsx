// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

export default function PrivateRoute({ children, roles }) {
  const { utilisateur, chargement } = useAuth();

  if (chargement) return <LoadingSpinner message="Vérification..." />;
  if (!utilisateur) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(utilisateur.role)) return <Navigate to="/" replace />;

  return children;
}