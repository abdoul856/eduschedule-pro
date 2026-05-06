-- ============================================================
--  EduSchedule Pro — Script SQL Complet
--  Base de données MySQL 8
--  Année Universitaire 2025-2026
-- ============================================================

CREATE DATABASE IF NOT EXISTS eduschedule_pro
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE eduschedule_pro;

-- ============================================================
-- TABLE 1 : classes
-- ============================================================
CREATE TABLE classes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(20)  NOT NULL UNIQUE,        -- Ex: L1-RST
    libelle         VARCHAR(100) NOT NULL,               -- Ex: Licence 1 RST
    niveau          VARCHAR(50)  NOT NULL,               -- Licence 1, Master 2...
    annee_academique VARCHAR(9)  NOT NULL,               -- Ex: 2025-2026
    capacite        INT          DEFAULT 30,
    actif           TINYINT(1)   DEFAULT 1,
    date_creation   DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 2 : matieres
-- ============================================================
CREATE TABLE matieres (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    code                VARCHAR(20)     NOT NULL UNIQUE,  -- Ex: SIG-301
    libelle             VARCHAR(150)    NOT NULL,         -- Ex: Traitement du Signal
    volume_horaire_total DECIMAL(5,1)   NOT NULL,         -- En heures
    coefficient         DECIMAL(4,2)    DEFAULT 1.00,
    actif               TINYINT(1)      DEFAULT 1
);

-- ============================================================
-- TABLE 3 : enseignants
-- ============================================================
CREATE TABLE enseignants (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    matricule   VARCHAR(30)     NOT NULL UNIQUE,
    nom         VARCHAR(80)     NOT NULL,
    prenom      VARCHAR(80)     NOT NULL,
    email       VARCHAR(150)    NOT NULL UNIQUE,
    telephone   VARCHAR(20),
    specialite  VARCHAR(150),
    statut      ENUM('vacataire','permanent') NOT NULL DEFAULT 'vacataire',
    taux_horaire DECIMAL(10,2)  NOT NULL DEFAULT 0.00,   -- En FCFA/heure
    actif       TINYINT(1)      DEFAULT 1,
    date_creation DATETIME      DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 4 : salles
-- ============================================================
CREATE TABLE salles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20)     NOT NULL UNIQUE,         -- Ex: AMPHI-A
    libelle     VARCHAR(100)    NOT NULL,
    capacite    INT             NOT NULL DEFAULT 30,
    batiment    VARCHAR(80),
    equipements TEXT,                                    -- Projecteur, tableau, ...
    actif       TINYINT(1)      DEFAULT 1
);

-- ============================================================
-- TABLE 5 : utilisateurs
-- Centralise les comptes de connexion (tous rôles confondus)
-- ============================================================
CREATE TABLE utilisateurs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(150)    NOT NULL UNIQUE,
    mot_de_passe_hash VARCHAR(255)  NOT NULL,
    role            ENUM('admin','enseignant','delegue','surveillant','comptable','etudiant') NOT NULL,
    id_lien         INT             DEFAULT NULL, -- FK vers enseignants, classes, etc.
    actif           TINYINT(1)      DEFAULT 1,
    token_reset     VARCHAR(255)    DEFAULT NULL,
    token_expire    DATETIME        DEFAULT NULL,
    derniere_connexion DATETIME     DEFAULT NULL,
    date_creation   DATETIME        DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 6 : emploi_temps
-- En-tête d'un planning hebdomadaire d'une classe
-- ============================================================
CREATE TABLE emploi_temps (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_classe       INT             NOT NULL,
    semaine_debut   DATE            NOT NULL,            -- Lundi de la semaine
    statut_publication ENUM('brouillon','publie') NOT NULL DEFAULT 'brouillon',
    cree_par        INT             NOT NULL,            -- id utilisateur admin
    date_creation   DATETIME        DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_classe) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (cree_par)  REFERENCES utilisateurs(id),
    UNIQUE KEY unique_classe_semaine (id_classe, semaine_debut)
);

-- ============================================================
-- TABLE 7 : creneaux
-- Chaque créneau planifié dans un emploi du temps
-- ============================================================
CREATE TABLE creneaux (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_emploi_temps INT             NOT NULL,
    id_matiere      INT             NOT NULL,
    id_enseignant   INT             NOT NULL,
    id_salle        INT             NOT NULL,
    jour            ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi') NOT NULL,
    heure_debut     TIME            NOT NULL,
    heure_fin       TIME            NOT NULL,
    type_seance     ENUM('Cours','TD','TP') NOT NULL DEFAULT 'Cours',
    qr_token        VARCHAR(255)    DEFAULT NULL,        -- Token chiffré unique
    qr_expire       DATETIME        DEFAULT NULL,        -- Fenêtre de validité
    qr_utilise      TINYINT(1)      DEFAULT 0,           -- 1 = scanné
    date_creation   DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_emploi_temps) REFERENCES emploi_temps(id) ON DELETE CASCADE,
    FOREIGN KEY (id_matiere)      REFERENCES matieres(id),
    FOREIGN KEY (id_enseignant)   REFERENCES enseignants(id),
    FOREIGN KEY (id_salle)        REFERENCES salles(id)
);

-- ============================================================
-- TABLE 8 : pointages
-- Log des scans QR-Code (présence enseignant)
-- ============================================================
CREATE TABLE pointages (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    id_creneau          INT             NOT NULL,
    id_enseignant       INT             NOT NULL,
    heure_pointage_reelle DATETIME      NOT NULL,
    ip_source           VARCHAR(45),
    token_utilise       VARCHAR(255),
    statut              ENUM('valide','retard','echoue') NOT NULL DEFAULT 'valide',
    date_creation       DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_creneau)    REFERENCES creneaux(id),
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id)
);

-- ============================================================
-- TABLE 9 : cahiers_texte
-- Fiche pédagogique par séance (remplie par le délégué)
-- ============================================================
CREATE TABLE cahiers_texte (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_creneau      INT             NOT NULL UNIQUE,     -- 1 cahier par séance
    id_delegue      INT             NOT NULL,            -- id utilisateur délégué
    titre_cours     VARCHAR(255),
    contenu_json    JSON,                               -- Points du cours (flexible)
    niveau_avancement VARCHAR(100),                     -- Ex: Chapitre 2/5
    observations    TEXT,
    heure_fin_reelle TIME           DEFAULT NULL,
    statut          ENUM('brouillon','signe_delegue','cloture') NOT NULL DEFAULT 'brouillon',
    date_creation   DATETIME        DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_creneau)  REFERENCES creneaux(id),
    FOREIGN KEY (id_delegue)  REFERENCES utilisateurs(id)
);

-- ============================================================
-- TABLE 10 : signatures
-- Signatures numériques (canvas HTML5 → base64)
-- ============================================================
CREATE TABLE signatures (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_cahier       INT             NOT NULL,
    type_signataire ENUM('delegue','enseignant','surveillant','comptable') NOT NULL,
    id_utilisateur  INT             NOT NULL,
    signature_base64 LONGTEXT       NOT NULL,
    horodatage      DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cahier)      REFERENCES cahiers_texte(id) ON DELETE CASCADE,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id)
);

-- ============================================================
-- TABLE 11 : travaux_demandes
-- Devoirs et exercices associés à un cahier de texte
-- ============================================================
CREATE TABLE travaux_demandes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    id_cahier   INT             NOT NULL,
    description TEXT            NOT NULL,
    date_limite DATE,
    type        ENUM('devoir','exercice','projet','lecture') NOT NULL DEFAULT 'exercice',
    FOREIGN KEY (id_cahier) REFERENCES cahiers_texte(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 12 : vacations
-- En-tête de la fiche de vacation mensuelle
-- ============================================================
CREATE TABLE vacations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_enseignant   INT             NOT NULL,
    mois            TINYINT         NOT NULL,            -- 1-12
    annee           YEAR            NOT NULL,
    montant_brut    DECIMAL(12,2)   DEFAULT 0.00,
    retenues        DECIMAL(12,2)   DEFAULT 0.00,
    montant_net     DECIMAL(12,2)   DEFAULT 0.00,
    statut          ENUM('generee','signee_enseignant','visee_surveillant','approuvee','payee') NOT NULL DEFAULT 'generee',
    date_generation DATETIME        DEFAULT CURRENT_TIMESTAMP,
    date_modification DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_enseignant) REFERENCES enseignants(id),
    UNIQUE KEY unique_enseignant_mois (id_enseignant, mois, annee)
);

-- ============================================================
-- TABLE 13 : vacation_lignes
-- Détail ligne par ligne de chaque séance dans la vacation
-- ============================================================
CREATE TABLE vacation_lignes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_vacation     INT             NOT NULL,
    id_creneau      INT             NOT NULL,
    duree_heures    DECIMAL(5,2)    NOT NULL,            -- Durée réelle en heures
    taux_horaire    DECIMAL(10,2)   NOT NULL,            -- Taux au moment du calcul
    montant         DECIMAL(12,2)   NOT NULL,            -- duree × taux
    FOREIGN KEY (id_vacation) REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_creneau)  REFERENCES creneaux(id)
);

-- ============================================================
-- TABLE 14 : validations
-- Chaîne de validation d'une fiche de vacation
-- ============================================================
CREATE TABLE validations (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    id_vacation     INT             NOT NULL,
    id_validateur   INT             NOT NULL,
    role_validateur ENUM('enseignant','surveillant','comptable') NOT NULL,
    visa_base64     LONGTEXT,                            -- Signature numérique
    date_validation DATETIME        DEFAULT CURRENT_TIMESTAMP,
    commentaire     TEXT,
    FOREIGN KEY (id_vacation)   REFERENCES vacations(id) ON DELETE CASCADE,
    FOREIGN KEY (id_validateur) REFERENCES utilisateurs(id)
);

-- ============================================================
-- TABLE 15 : logs_activite
-- Journal d'audit complet de toutes les actions
-- ============================================================
CREATE TABLE logs_activite (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    id_utilisateur INT          DEFAULT NULL,
    action      VARCHAR(100)    NOT NULL,                -- Ex: SCAN_QR, CREATE_CRENEAU
    details_json JSON,
    ip          VARCHAR(45),
    date_heure  DATETIME        DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_utilisateur) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- ============================================================
-- DONNÉES DE DÉMONSTRATION
-- ============================================================

-- Classes
INSERT INTO classes (code, libelle, niveau, annee_academique, capacite) VALUES
('L1-RST', 'Licence 1 Réseaux & Systèmes Télécom', 'Licence 1', '2025-2026', 35),
('L2-RST', 'Licence 2 Réseaux & Systèmes Télécom', 'Licence 2', '2025-2026', 32),
('L3-RST', 'Licence 3 Réseaux & Systèmes Télécom', 'Licence 3', '2025-2026', 28),
('M1-RST', 'Master 1 Réseaux & Systèmes Télécom',  'Master 1',  '2025-2026', 20),
('M2-RST', 'Master 2 Réseaux & Systèmes Télécom',  'Master 2',  '2025-2026', 18);

-- Matières
INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient) VALUES
('SIG-301', 'Traitement du Signal', 45.0, 3.00),
('NET-201', 'Réseaux Informatiques', 40.0, 3.00),
('PROG-101', 'Programmation Orientée Objet', 40.0, 2.00),
('ELEC-401', 'Électronique de Puissance', 35.0, 2.50),
('MATH-201', 'Mathématiques Appliquées', 50.0, 3.00),
('TELE-301', 'Télécommunications Numériques', 45.0, 3.00),
('DEV-WEB', 'Développement Web', 40.0, 2.00),
('MGMT-201', 'Management des Entreprises', 30.0, 1.50);

-- Enseignants
INSERT INTO enseignants (matricule, nom, prenom, email, specialite, statut, taux_horaire) VALUES
('ENS-001', 'BERÉ',      'Wend-Panga Cédric', 'c.bere@isge.bf',     'Développement Web & IA',          'permanent',  8000.00),
('ENS-002', 'OUÉDRAOGO', 'Abdoul Razak',       'ar.ouedraogo@isge.bf','Réseaux et Télécommunications',   'permanent',  7500.00),
('ENS-003', 'KABORÉ',    'Fatimata',           'f.kabore@isge.bf',   'Traitement du Signal',             'vacataire',  6000.00),
('ENS-004', 'SAWADOGO',  'Issouf',             'i.sawadogo@isge.bf', 'Électronique',                    'vacataire',  5500.00),
('ENS-005', 'TRAORÉ',    'Aïssata',            'a.traore@isge.bf',   'Mathématiques Appliquées',         'vacataire',  5000.00);

-- Salles
INSERT INTO salles (code, libelle, capacite, batiment, equipements) VALUES
('AMPHI-A',  'Amphithéâtre A',    150, 'Bâtiment Principal', 'Vidéoprojecteur, Micro, Climatisation'),
('SALLE-101','Salle 101',          40, 'Bâtiment A',          'Tableau blanc, Vidéoprojecteur'),
('SALLE-102','Salle 102',          35, 'Bâtiment A',          'Tableau blanc'),
('LABO-INF', 'Laboratoire Info',   25, 'Bâtiment B',          '25 PC, Internet, Vidéoprojecteur'),
('SALLE-201','Salle 201',          30, 'Bâtiment B',          'Tableau blanc, Climatisation');

-- Utilisateurs (mots de passe: "password123" hashés avec bcrypt)
INSERT INTO utilisateurs (email, mot_de_passe_hash, role, id_lien) VALUES
('admin@isge.bf',         '$2y$10$examplehashADMIN1234567890abcdefghijk', 'admin',        NULL),
('c.bere@isge.bf',        '$2y$10$examplehashENS001234567890abcdefghijk', 'enseignant',   1),
('ar.ouedraogo@isge.bf',  '$2y$10$examplehashENS002234567890abcdefghijk', 'enseignant',   2),
('f.kabore@isge.bf',      '$2y$10$examplehashENS003234567890abcdefghijk', 'enseignant',   3),
('i.sawadogo@isge.bf',    '$2y$10$examplehashENS004234567890abcdefghijk', 'enseignant',   4),
('a.traore@isge.bf',      '$2y$10$examplehashENS005234567890abcdefghijk', 'enseignant',   5),
('delegue.l1@isge.bf',    '$2y$10$examplehashDELEGUE01234567890abcdef', 'delegue',      1),
('delegue.l2@isge.bf',    '$2y$10$examplehashDELEGUE02234567890abcdef', 'delegue',      2),
('surveillant@isge.bf',   '$2y$10$examplehashSURV001234567890abcdefghijk', 'surveillant', NULL),
('comptable@isge.bf',     '$2y$10$examplehashCOMPT01234567890abcdefghijk', 'comptable',  NULL);

-- Emploi du temps (semaine du 14 avril 2026)
INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par) VALUES
(1, '2026-04-14', 'publie',    1),  -- L1-RST
(2, '2026-04-14', 'publie',    1),  -- L2-RST
(3, '2026-04-14', 'brouillon', 1);  -- L3-RST

-- Créneaux (exemples pour L1-RST)
INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle, jour, heure_debut, heure_fin, type_seance) VALUES
(1, 3,  3, 2, 'Lundi',    '07:30:00', '10:00:00', 'Cours'),  -- POO - KABORÉ - Salle 101
(1, 1,  3, 4, 'Lundi',    '10:30:00', '13:00:00', 'TP'),     -- Signal - KABORÉ - Labo
(1, 2,  2, 2, 'Mardi',    '07:30:00', '10:00:00', 'Cours'),  -- Réseaux - OUÉDRAOGO
(1, 5,  5, 3, 'Mercredi', '07:30:00', '10:00:00', 'Cours'),  -- Math - TRAORÉ
(1, 7,  1, 4, 'Jeudi',    '07:30:00', '10:00:00', 'TP'),     -- Dev Web - BÉRÉ - Labo
(1, 6,  2, 1, 'Vendredi', '07:30:00', '10:00:00', 'Cours'),  -- Télécom - OUÉDRAOGO - Amphi
(1, 4,  4, 3, 'Samedi',   '07:30:00', '10:00:00', 'TD');     -- Électro - SAWADOGO

-- ============================================================
-- VUES UTILES
-- ============================================================

-- Vue : Planning complet avec détails
CREATE VIEW v_planning_complet AS
SELECT
    c.id                AS creneau_id,
    cl.code             AS classe_code,
    cl.libelle          AS classe_libelle,
    m.libelle           AS matiere,
    CONCAT(e.prenom, ' ', e.nom) AS enseignant,
    s.code              AS salle_code,
    c.jour,
    c.heure_debut,
    c.heure_fin,
    c.type_seance,
    et.semaine_debut,
    et.statut_publication
FROM creneaux c
JOIN emploi_temps et ON c.id_emploi_temps = et.id
JOIN classes cl      ON et.id_classe = cl.id
JOIN matieres m      ON c.id_matiere = m.id
JOIN enseignants e   ON c.id_enseignant = e.id
JOIN salles s        ON c.id_salle = s.id;

-- Vue : Résumé des pointages du jour
CREATE VIEW v_pointages_jour AS
SELECT
    p.id                AS pointage_id,
    CONCAT(e.prenom, ' ', e.nom) AS enseignant,
    m.libelle           AS matiere,
    cl.code             AS classe,
    c.heure_debut       AS heure_prevue,
    p.heure_pointage_reelle,
    p.statut
FROM pointages p
JOIN creneaux c      ON p.id_creneau = c.id
JOIN enseignants e   ON p.id_enseignant = e.id
JOIN matieres m      ON c.id_matiere = m.id
JOIN emploi_temps et ON c.id_emploi_temps = et.id
JOIN classes cl      ON et.id_classe = cl.id
WHERE DATE(p.heure_pointage_reelle) = CURDATE();
