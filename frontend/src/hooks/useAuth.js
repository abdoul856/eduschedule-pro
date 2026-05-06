// src/hooks/useAuth.js
import { useAuth as useAuthContext } from "../context/AuthContext";

// Hook personnalisé qui expose les fonctions d'authentification
export function useAuth() {
  const { utilisateur, token, connexion, deconnexion, chargement } = useAuthContext();

  const estConnecte  = !!utilisateur;
  const estAdmin     = utilisateur?.role === 'admin';
  const estEnseignant = utilisateur?.role === 'enseignant';
  const estDelegue   = utilisateur?.role === 'delegue';
  const estSurveillant = utilisateur?.role === 'surveillant';
  const estComptable = utilisateur?.role === 'comptable';
  const estEtudiant  = utilisateur?.role === 'etudiant';

  const aRole = (roles) => roles.includes(utilisateur?.role);

  return {
    utilisateur,
    token,
    connexion,
    deconnexion,
    chargement,
    estConnecte,
    estAdmin,
    estEnseignant,
    estDelegue,
    estSurveillant,
    estComptable,
    estEtudiant,
    aRole,
  };
}