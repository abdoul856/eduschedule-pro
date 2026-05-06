import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./pages/DashboardLayout";

// Admin
import DashboardAdminPage from "./pages/admin/DashboardAdminPage";
import EmploiTempsPage from "./pages/admin/EmploiTempsPage";
import QRCodePage from "./pages/admin/QRCodePage";
import EnseignantsPage from "./pages/admin/EnseignantsPage";
import ClassesPage from "./pages/admin/ClassesPage";
import MatieresPage from "./pages/admin/MatieresPage";
import SallesPage from "./pages/admin/SallesPage";
import UtilisateursPage  from "./pages/admin/UtilisateursPage";
import ParametresPage    from "./pages/admin/ParametresPage";
import StatistiquesPage  from "./pages/admin/StatistiquesPage";

// Enseignant
import DashboardEnseignantPage from "./pages/enseignant/DashboardEnseignantPage";
import PointagePage from "./pages/enseignant/PointagePage";
import SignatureCahierPage from "./pages/enseignant/SignatureCahierPage";
import FicheVacationPage from "./pages/enseignant/FicheVacationPage";

// Délégué
import DashboardDeleguePage from "./pages/delegue/DashboardDeleguePage";
import CahierTextePage from "./pages/delegue/CahierTextePage";
import HistoriquePage    from "./pages/delegue/HistoriquePage";

// Surveillant
import DashboardSurveillantPage from "./pages/surveillant/DashboardSurveillantPage";
import VerificationFiches  from "./pages/surveillant/VerificationFiches";
import ValidationControle  from "./pages/surveillant/ValidationControle";
import RapportSurveillant  from "./pages/surveillant/RapportSurveillant";
// Comptable
import DashboardComptablePage from "./pages/comptable/DashboardComptablePage";
import ValidationComptable from "./pages/comptable/ValidationComptable";
import BonPaiement from "./pages/comptable/BonPaiement";
import ListeVacations from "./pages/comptable/ListeVacations";
import RapportMensuel from "./pages/comptable/RapportMensuel";
import RapportAnnuel from "./pages/comptable/RapportAnnuel";
import HistoriquePaiements from "./pages/comptable/HistoriquePaiements";
import Archivage from "./pages/comptable/Archivage";

// Étudiant
import EmploiTempsEtudiantPage from "./pages/etudiant/EmploiTempsEtudiantPage";

function PrivateRoute({ children, roles }) {
  const { utilisateur, chargement } = useAuth();
  if (chargement) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"100vh" }}>
      <div className="spinner-border text-primary" />
    </div>
  );
  if (!utilisateur) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(utilisateur.role)) return <Navigate to="/" replace />;
  return children;
}

function AccueilParRole() {
  const { utilisateur } = useAuth();
  const routes = {
    admin:       "/admin/dashboard",
    enseignant:  "/enseignant/dashboard",
    delegue:     "/delegue/dashboard",
    surveillant: "/surveillant/dashboard",
    comptable:   "/comptable/dashboard",
    etudiant:    "/etudiant/emploi-temps",
  };
  return <Navigate to={routes[utilisateur?.role] || "/login"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><AccueilParRole /></PrivateRoute>} />

          {/* ── Admin ── */}
          <Route path="/admin" element={<PrivateRoute roles={["admin"]}><DashboardLayout /></PrivateRoute>}>
            <Route path="dashboard"    element={<DashboardAdminPage />} />
            <Route path="emploi-temps" element={<EmploiTempsPage />} />
            <Route path="qrcode"       element={<QRCodePage />} />
            <Route path="enseignants"  element={<EnseignantsPage />} />
            <Route path="classes"      element={<ClassesPage />} />
            <Route path="matieres"     element={<MatieresPage />} />
            <Route path="salles"       element={<SallesPage />} />
            <Route path="utilisateurs" element={<UtilisateursPage />} />
            <Route path="parametres"   element={<ParametresPage />}   />
            <Route path="statistiques" element={<StatistiquesPage />} />
          </Route>

          {/* Enseignant */}
<Route path="/enseignant" element={<PrivateRoute roles={["enseignant"]}><DashboardLayout /></PrivateRoute>}>
  <Route path="dashboard" element={<DashboardEnseignantPage />} />
  <Route path="pointage"  element={<PointagePage />}            />
  <Route path="signature" element={<SignatureCahierPage />}      />
  <Route path="vacations" element={<FicheVacationPage />}       />
</Route>

{/* Délégué */}
<Route path="/delegue" element={<PrivateRoute roles={["delegue"]}><DashboardLayout /></PrivateRoute>}>
  <Route path="dashboard"  element={<DashboardDeleguePage />} />
  <Route path="cahier"     element={<CahierTextePage />}      />
  <Route path="historique" element={<HistoriquePage />}       />
</Route>

          {/* ── Surveillant ── */}
          <Route path="/surveillant" element={<PrivateRoute roles={["surveillant"]}><DashboardLayout /></PrivateRoute>}>
  <Route path="dashboard"    element={<DashboardSurveillantPage />} />
  <Route path="verification" element={<VerificationFiches />}       />
  <Route path="validation"   element={<ValidationControle />}       />
  <Route path="rapports"     element={<RapportSurveillant />}       />
</Route>

          {/* ── Comptable ── */}
          <Route path="/comptable" element={<PrivateRoute roles={["comptable"]}><DashboardLayout /></PrivateRoute>}>
            <Route path="dashboard"      element={<DashboardComptablePage />} />
            <Route path="validation"     element={<ValidationComptable />} />
            <Route path="bons"           element={<BonPaiement />} />
            <Route path="vacations"      element={<ListeVacations />} />
            <Route path="rapport-mensuel" element={<RapportMensuel />} />
            <Route path="rapport-annuel"  element={<RapportAnnuel />} />
            <Route path="historique"     element={<HistoriquePaiements />} />
            <Route path="archives"       element={<Archivage />} />
          </Route>

          {/* ── Étudiant ── */}
          <Route path="/etudiant" element={<PrivateRoute roles={["etudiant"]}><DashboardLayout /></PrivateRoute>}>
            <Route path="emploi-temps" element={<EmploiTempsEtudiantPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}