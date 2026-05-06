<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db      = (new Database())->getConnection();
$payload = requireAuth();
$annee   = $_GET['annee'] ?? date('Y');

// Utilisateurs
$stmt = $db->query("SELECT role, COUNT(*) as total FROM utilisateurs GROUP BY role");
$rolesData = $stmt->fetchAll();
$utilisateurs = ['total' => 0, 'admins' => 0, 'enseignants' => 0, 'surveillants' => 0, 'comptables' => 0, 'delegues' => 0, 'etudiants' => 0];
foreach ($rolesData as $r) {
    $utilisateurs['total'] += $r['total'];
    $map = ['admin'=>'admins','enseignant'=>'enseignants','surveillant'=>'surveillants','comptable'=>'comptables','delegue'=>'delegues','etudiant'=>'etudiants'];
    if (isset($map[$r['role']])) $utilisateurs[$map[$r['role']]] = $r['total'];
}

// Enseignants
$stmt = $db->query("SELECT COUNT(*) as total FROM enseignants");
$totalEns = $stmt->fetch()['total'];
$stmt = $db->query("SELECT COUNT(*) as actifs FROM enseignants WHERE actif = 1");
$actifsEns = $stmt->fetch()['actifs'];

// Vacations
$stmt = $db->prepare("SELECT statut, COUNT(*) as nb, SUM(montant_net) as montant FROM vacations WHERE annee = ? GROUP BY statut");
$stmt->execute([$annee]);
$vacData = $stmt->fetchAll();
$vacations = ['total'=>0,'generees'=>0,'visees'=>0,'approuvees'=>0,'payees'=>0,'montant_total'=>0,'montant_paye'=>0];
foreach ($vacData as $v) {
    $vacations['total'] += $v['nb'];
    $vacations['montant_total'] += $v['montant'];
    if ($v['statut'] === 'generee')           { $vacations['generees']   = $v['nb']; }
    if ($v['statut'] === 'visee_surveillant') { $vacations['visees']     = $v['nb']; }
    if ($v['statut'] === 'approuvee')         { $vacations['approuvees'] = $v['nb']; }
    if ($v['statut'] === 'payee')             { $vacations['payees']     = $v['nb']; $vacations['montant_paye'] = $v['montant']; }
}

// Pointages
$stmt = $db->query("SELECT COUNT(*) as total FROM pointages");
$totalP = $stmt->fetch()['total'];
$stmt = $db->query("SELECT COUNT(*) as valides FROM pointages WHERE statut = 'valide'");
$validesP = $stmt->fetch()['valides'];
$tauxP = $totalP > 0 ? round($validesP / $totalP * 100) : 0;

// Cahiers
$stmt = $db->query("SELECT COUNT(*) as total FROM cahiers_texte");
$totalC = $stmt->fetch()['total'];
$stmt = $db->query("SELECT COUNT(*) as clotures FROM cahiers_texte WHERE statut = 'cloture'");
$cloturesC = $stmt->fetch()['clotures'];
$tauxC = $totalC > 0 ? round($cloturesC / $totalC * 100) : 0;

// Par mois
$stmt = $db->prepare("
    SELECT mois,
           COUNT(*) as fiches,
           SUM(montant_net) as montant,
           SUM(statut = 'payee') as payees
    FROM vacations
    WHERE annee = ?
    GROUP BY mois
    ORDER BY mois ASC
");
$stmt->execute([$annee]);
$moisData = $stmt->fetchAll();

$MOIS = ['','Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
$parMois = [];
for ($i = 1; $i <= 12; $i++) {
    $found = null;
    foreach ($moisData as $m) {
        if ((int)$m['mois'] === $i) { $found = $m; break; }
    }
    $parMois[] = [
        'mois'      => $i,
        'label'     => $MOIS[$i],
        'fiches'    => $found ? (int)$found['fiches']    : 0,
        'montant'   => $found ? (float)$found['montant'] : 0,
        'pointages' => 0,
    ];
}

echo json_encode([
    'utilisateurs' => $utilisateurs,
    'enseignants'  => ['total' => $totalEns, 'actifs' => $actifsEns],
    'vacations'    => $vacations,
    'pointages'    => ['total' => $totalP, 'valides' => $validesP, 'taux' => $tauxP],
    'cahiers'      => ['total' => $totalC, 'clotures' => $cloturesC, 'taux' => $tauxC],
    'parMois'      => $parMois,
]);