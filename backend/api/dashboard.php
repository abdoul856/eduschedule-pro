<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db      = (new Database())->getConnection();
$payload = requireAuth();

$stmt = $db->prepare("
    SELECT cl.libelle AS classe,
           COUNT(c.id) AS total_creneaux,
           SUM(TIMESTAMPDIFF(MINUTE, c.heure_debut, c.heure_fin) / 60) AS heures_planifiees,
           SUM(CASE WHEN ct.statut = 'cloture'
               THEN TIMESTAMPDIFF(MINUTE, c.heure_debut, COALESCE(ct.heure_fin_reelle, c.heure_fin)) / 60
               ELSE 0 END) AS heures_realisees,
           COUNT(CASE WHEN ct.statut = 'cloture' THEN 1 END) AS seances_clot,
           COUNT(CASE WHEN ct.statut IS NULL THEN 1 END) AS seances_non_remplies
    FROM creneaux c
    JOIN emploi_temps et ON c.id_emploi_temps = et.id
    JOIN classes cl      ON et.id_classe = cl.id
    LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
    GROUP BY cl.id, cl.libelle
    ORDER BY cl.libelle
");
$stmt->execute();
$heuresParClasse = $stmt->fetchAll();

$stmt2 = $db->prepare("
    SELECT m.libelle AS matiere,
           m.volume_horaire_total,
           SUM(CASE WHEN ct.statut = 'cloture'
               THEN TIMESTAMPDIFF(MINUTE, c.heure_debut, COALESCE(ct.heure_fin_reelle, c.heure_fin)) / 60
               ELSE 0 END) AS heures_realisees,
           COUNT(c.id) AS total_seances,
           COUNT(CASE WHEN ct.statut = 'cloture' THEN 1 END) AS seances_clot
    FROM creneaux c
    JOIN matieres m      ON c.id_matiere = m.id
    LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
    GROUP BY m.id, m.libelle, m.volume_horaire_total
    ORDER BY m.libelle
");
$stmt2->execute();
$avancementMatieres = $stmt2->fetchAll();

echo json_encode([
    'heures_par_classe'   => $heuresParClasse,
    'avancement_matieres' => $avancementMatieres
]);