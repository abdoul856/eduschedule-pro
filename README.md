# 🎓 EduSchedule Pro — ISGE-BF

> **Système Intégré de Gestion de l'Emploi du Temps et de Suivi Pédagogique**  
> Institut Supérieur de Génie Électrique du Burkina Faso — Année académique 2025-2026



## 📋 Présentation du projet

EduSchedule Pro est une application web full-stack qui gère le **cycle complet d'une séance de cours** :

```
Planification → QR-Code → Pointage → Cahier de texte → Vacation → Paiement
```

### 🧩 Modules implémentés

| Module | Description |
|--------|-------------|
| 📅 Emploi du temps | Grille hebdomadaire, vue par classe/enseignant/salle, jours fériés, export PDF |
| 📱 Pointage QR-Code | Token sécurisé, fenêtre ±15 min, saisie manuelle, statuts 🟢🟠🔴 |
| 📋 Cahier de texte | Saisie délégué, travaux, double signature numérique, clôture enseignant |
| 💰 Fiches de vacation | Génération auto, calcul durée×taux, workflow validation, export PDF |
| 📊 Tableaux de bord | KPIs, graphiques, alertes temps réel pour chaque rôle |



## 🛠️ Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18, Bootstrap 5, Chart.js, jsPDF, html5-qrcode, signature_pad |
| Backend | PHP 8, API REST, JWT (authentification) |
| Base de données | MySQL 8 |
| Outils | Vite, Git, WAMP|



## 👥 Rôles et acteurs

| Rôle | Accès |
|------|-------|
| 👨‍💼 Administrateur | Gestion complète (classes, enseignants, salles, matières, emplois du temps) |
| 👨‍🏫 Enseignant | Pointage QR, signature fin de séance, consultation vacations |
| 👨‍🎓 Délégué | Saisie cahier de texte, signature numérique |
| 🔍 Surveillant | Contrôle et visa des fiches de vacation |
| 💼 Comptable | Approbation et validation des paiements |
| 👤 Étudiant | Consultation de l'emploi du temps (lecture seule) |



## ⚙️ Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **WAMP** (Windows) — Apache + PHP 8 + MySQL
- **Node.js** v18 ou supérieur — [nodejs.org](https://nodejs.org)
- **Git** — [git-scm.com](https://git-scm.com)
- **VS Code** (recommandé) — [code.visualstudio.com](https://code.visualstudio.com)



## 🚀 Installation et lancement

### Étape 1 — Cloner le dépôt

```bash
git clone https://github.com/abdoul856/eduschedule-pro.git
cd eduschedule-pro
```

### Étape 2 — Configurer le backend PHP

Copiez le dossier `backend/` dans votre répertoire web :

```
C:\wamp64\www\eduschedule-pro\
```

Créez le fichier `.env` à la racine du projet en copiant `.env.example` :

```bash
cp .env.example .env
```

Éditez `.env` avec vos paramètres :

```env
DB_HOST=localhost
DB_NAME=eduschedule_pro
DB_USER=root
DB_PASSWORD=
JWT_SECRET=votre_secret_jwt_ici
QR_SECRET=votre_secret_qr_ici
FRONTEND_URL=http://localhost:5173
```

### Étape 3 — Créer et importer la base de données

1. Ouvrez **PhpMyAdmin** : http://localhost/phpmyadmin
2. Créez une base de données nommée `eduschedule_pro`
3. Importez le fichier SQL :
   - Cliquez sur la base → onglet **Importer**
   - Sélectionnez `database/eduschedule_pro.sql`
   - Cliquez **Exécuter**

### Étape 4 — Installer et lancer le frontend React

```bash
# Aller dans le dossier frontend
cd frontend

# Installer les dépendances
npm install

# Créer le fichier .env React
echo "VITE_API_URL=http://localhost/eduschedule-pro/backend/api" > .env

# Lancer le serveur de développement
npm run dev
```

L'application est accessible sur : **http://localhost:5173**



## 🌐 URLs importantes

| Service | URL |
|---------|-----|
| Application React | http://localhost:5173 |
| API Backend PHP | http://localhost/eduschedule-pro/backend/api/ |
| PhpMyAdmin | http://localhost/phpmyadmin |



## 🔑 Comptes de test

> Mot de passe pour tous les comptes : **`password`**

| Rôle | Email |
|------|-------|
| Administrateur | admin@isge.bf |
| Enseignant | c.bere@isge.bf |
| Enseignant | a.sanogo@isge.bf |
| Enseignant | d.bonkoungou@isge.bf |
| Enseignant | am.sanogo@isge.bf |
| Délégué L1 | delegue.l1@isge.bf |
| Délégué L2 | delegue.l2@isge.bf |
| Délégué L3 | delegue.l3@isge.bf |
| Délégué M1 | delegue.m1@isge.bf |
| Délégué M2 | delegue.m2@isge.bf |
| Surveillant | surveillant@isge.bf |
| Comptable | comptable@isge.bf |
| Étudiant L1 | etudiant.l1@isge.bf |



## 📁 Structure du projet

```
eduschedule-pro/
├── backend/                    # API REST PHP
│   ├── api/                    # Endpoints
│   │   ├── auth/
│   │   │   ├── login.php       # Connexion JWT
│   │   │   └── logout.php      # Déconnexion
│   │   ├── classes.php         # Gestion des classes
│   │   ├── matieres.php        # Gestion des matières
│   │   ├── enseignants.php     # Gestion des enseignants
│   │   ├── salles.php          # Gestion des salles
│   │   ├── emploi_temps.php    # Emplois du temps
│   │   ├── creneaux.php        # Créneaux + QR-Code
│   │   ├── pointages.php       # Pointages QR
│   │   ├── cahiers.php         # Cahiers de texte
│   │   ├── vacations.php       # Fiches de vacation
│   │   ├── dashboard.php       # Statistiques
│   │   ├── utilisateurs.php    # Gestion utilisateurs
│   │   └── logs.php            # Journal d'activité
│   ├── config/
│   │   ├── database.php        # Connexion PDO MySQL
│   │   └── cors.php            # Headers CORS
│   ├── middleware/
│   │   └── auth.php            # Vérification JWT
│   ├── models/
│   │   ├── Enseignant.php      # Modèle enseignant
│   │   ├── CahierTexte.php     # Modèle cahier
│   │   └── Vacation.php        # Modèle vacation
│   └── utils/
│       ├── JWTHelper.php       # Génération/vérification JWT
│       ├── QRCodeGenerator.php # Génération tokens QR
│       └── PDFExport.php       # Export PDF HTML
│
├── frontend/                   # Application React
│   └── src/
│       ├── context/
│       │   ├── AuthContext.jsx # Contexte authentification
│       │   └── NotifContext.jsx # Contexte notifications
│       ├── hooks/
│       │   ├── useAuth.js      # Hook authentification
│       │   ├── useFetch.js     # Hook appels API
│       │   └── useQRScan.js    # Hook scan QR-Code
│       ├── utils/
│       │   ├── api.js          # Fonctions API centralisées
│       │   ├── formatDate.js   # Formatage dates français
│       │   ├── calcDuration.js # Calcul durées/montants
│       │   └── exportPDF.js    # Export PDF côté client
│       ├── components/
│       │   ├── AlertCard.jsx   # Composant alerte
│       │   ├── LoadingSpinner.jsx # Chargement
│       │   ├── PrivateRoute.jsx # Route protégée
│       │   └── SignaturePad.jsx # Pad signature canvas
│       └── pages/
│           ├── LoginPage.jsx
│           ├── DashboardLayout.jsx
│           ├── admin/          # Pages administrateur
│           ├── enseignant/     # Pages enseignant
│           ├── delegue/        # Pages délégué
│           ├── surveillant/    # Pages surveillant
│           └── etudiant/       # Pages étudiant
│
├── database/
│   └── eduschedule_pro.sql     # Script SQL complet
│
├── .env.example                # Variables d'environnement
├── .gitignore
└── README.md                   # Ce fichier
```



## 🔒 Sécurité

- **Authentification JWT** — tokens signés, expiration configurable
- **QR-Code à usage unique** — token HMAC-SHA256, fenêtre ±15 minutes
- **Rôles et permissions** — chaque endpoint vérifie le rôle de l'utilisateur
- **CORS** — origines autorisées configurables
- **Mots de passe** — hashés avec `password_hash()` (bcrypt)
- **Logs** — toutes les actions sensibles sont enregistrées



## 📊 Base de données

Le schéma contient **15 tables** :

`classes` · `matieres` · `enseignants` · `salles` · `utilisateurs` · `emploi_temps` · `creneaux` · `pointages` · `cahiers_texte` · `signatures` · `travaux_demandes` · `vacations` · `vacation_lignes` · `validations` · `logs_activite`



## 🤝 Équipe

Projet réalisé dans le cadre du cours de **Développement Web** — ISGE-BF 2025-2026

Encadrant : **Dr Wend-Panga Cédric BÉRÉ**



## 📄 Licence

Projet académique — ISGE-BF © 2025-2026