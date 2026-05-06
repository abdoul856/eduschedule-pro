import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [utilisateur, setUtilisateur] = useState(null);
  const [token, setToken] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const tokenStocke = localStorage.getItem("edu_token");
    const userStocke  = localStorage.getItem("edu_user");
    if (tokenStocke && userStocke) {
      setToken(tokenStocke);
      setUtilisateur(JSON.parse(userStocke));
    }
    setChargement(false);
  }, []);

  const connexion = (tokenRecu, userRecu) => {
    localStorage.setItem("edu_token", tokenRecu);
    localStorage.setItem("edu_user", JSON.stringify(userRecu));
    setToken(tokenRecu);
    setUtilisateur(userRecu);
  };

  const deconnexion = () => {
    localStorage.removeItem("edu_token");
    localStorage.removeItem("edu_user");
    setToken(null);
    setUtilisateur(null);
  };

  return (
    <AuthContext.Provider value={{ utilisateur, token, connexion, deconnexion, chargement }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être dans AuthProvider");
  return ctx;
}