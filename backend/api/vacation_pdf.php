<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['erreur' => 'Méthode non autorisée']);
    exit;
}

if (!$id) {
    http_response_code(400);
    echo json_encode(['erreur' => 'ID vacation requis']);
    exit;
}

$payload = requireAuth();

// Récupérer la vacation
$stmt = $db->prepare("
    SELECT v.*,
           CONCAT(e.prenom,' ',e.nom) AS enseignant_nom,
           e.matricule, e.taux_horaire,
           e.specialite
    FROM vacations v
    JOIN enseignants e ON v.id_enseignant = e.id
    WHERE v.id = ?
");
$stmt->execute([$id]);
$vacation = $stmt->fetch();

if (!$vacation) {
    http_response_code(404);
    echo json_encode(['erreur' => 'Vacation introuvable']);
    exit;
}

// Récupérer les lignes
$stmt2 = $db->prepare("
    SELECT vl.*,
           m.libelle AS matiere,
           c.jour, c.heure_debut, c.heure_fin, c.type_seance,
           et.semaine_debut AS date,
           p.id AS pointage_id,
           ct.statut AS statut_cahier
    FROM vacation_lignes vl
    JOIN creneaux c         ON vl.id_creneau      = c.id
    JOIN matieres m         ON c.id_matiere        = m.id
    JOIN emploi_temps et    ON c.id_emploi_temps   = et.id
    LEFT JOIN pointages p   ON p.id_creneau        = c.id
                           AND p.id_enseignant     = ?
                           AND p.statut            = 'valide'
    LEFT JOIN cahiers_texte ct ON ct.id_creneau    = c.id
    WHERE vl.id_vacation = ?
    ORDER BY et.semaine_debut, c.heure_debut
");
$stmt2->execute([$vacation['id_enseignant'], $id]);
$lignes = $stmt2->fetchAll();

// Récupérer signatures
$stmt3 = $db->prepare("
    SELECT s.type_signataire, s.signature_base64, s.created_at,
           u.email AS signataire_email
    FROM signatures s
    JOIN utilisateurs u ON s.id_utilisateur = u.id
    WHERE s.id_vacation = ?
");
$stmt3->execute([$id]);
$signatures = $stmt3->fetchAll();

$MOIS = ["","Janvier","Fevrier","Mars","Avril","Mai","Juin",
         "Juillet","Aout","Septembre","Octobre","Novembre","Decembre"];

$STATUT_LABELS = [
    'generee'           => 'Generee',
    'visee_surveillant' => 'Visee par le surveillant',
    'approuvee'         => 'Approuvee',
    'payee'             => 'Payee',
];

// Calculer alertes
$alertes = [];
foreach ($lignes as $l) {
    if (!$l['pointage_id']) {
        $alertes[] = "Absence non pointee : {$l['matiere']} ({$l['date']})";
    }
    if ($l['statut_cahier'] !== 'cloture') {
        $alertes[] = "Cahier non cloture : {$l['matiere']} ({$l['date']})";
    }
}

// Générer HTML pour le PDF
$totalHeures  = array_reduce($lignes, fn($s,$l) => $s + floatval($l['duree_heures']??0), 0);
$moisLabel    = $MOIS[$vacation['mois']] ?? '';
$statutLabel  = $STATUT_LABELS[$vacation['statut']] ?? $vacation['statut'];
$dateGen      = date('d/m/Y');

$rowsHTML = '';
foreach ($lignes as $l) {
    $duree   = round(floatval($l['duree_heures']??0), 2);
    $taux    = number_format(floatval($l['taux_horaire']??0), 0, ',', ' ');
    $montant = number_format(floatval($l['montant']??0), 0, ',', ' ');
    $pointage = $l['pointage_id'] ? '✅ Pointe' : '❌ Absent';
    $cahier   = $l['statut_cahier']==='cloture' ? '✅ Cloture' : '⏳ En cours';
    $rowsHTML .= "
    <tr>
        <td>{$l['matiere']}</td>
        <td class='center'>{$l['date']}</td>
        <td class='center'>{$duree}h</td>
        <td class='right'>{$taux} FCFA</td>
        <td class='center'>{$pointage}</td>
        <td class='center'>{$cahier}</td>
        <td class='right'>{$montant} FCFA</td>
    </tr>";
}

$alertesHTML = '';
if (count($alertes) > 0) {
    $alertesHTML = '<div class="alertes"><strong>Alertes de coherence :</strong><ul>';
    foreach ($alertes as $a) {
        $alertesHTML .= "<li>{$a}</li>";
    }
    $alertesHTML .= '</ul></div>';
}

$signaturesHTML = '';
foreach ($signatures as $sig) {
    $signaturesHTML .= "
    <div class='sig-box'>
        <div class='sig-title'>{$sig['type_signataire']}</div>
        <div class='sig-zone'>
            <img src='{$sig['signature_base64']}' style='max-width:100%;max-height:50px;' />
        </div>
        <div class='sig-date'>{$sig['created_at']}</div>
    </div>";
}

$montantBrut = number_format(floatval($vacation['montant_brut']??0), 0, ',', ' ');
$retenues    = number_format(floatval($vacation['retenues']??0),    0, ',', ' ');
$montantNet  = number_format(floatval($vacation['montant_net']??0), 0, ',', ' ');
$totalH      = round($totalHeures, 2);

$html = "<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8'>
<title>Fiche Vacation - {$vacation['enseignant_nom']}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header h1 { color: #1a56db; font-size: 20px; margin: 0; }
  .header h2 { font-size: 14px; margin: 5px 0; }
  .header p  { color: #666; font-size: 10px; margin: 0; }
  .separator { border-top: 2px solid #1a56db; margin: 15px 0; }
  .infos { display: flex; justify-content: space-between; margin-bottom: 15px; }
  .infos div { width: 48%; }
  .infos p { margin: 3px 0; }
  .infos strong { color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th { background: #1a56db; color: white; padding: 7px 8px; text-align: left; font-size: 10px; }
  td { padding: 6px 8px; border-bottom: 1px solid #dee2e6; font-size: 10px; }
  tr:nth-child(even) td { background: #f8f9fa; }
  .tfoot td { background: #e9ecef !important; font-weight: bold; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .montants { margin: 15px 0; text-align: right; }
  .montants p { margin: 3px 0; }
  .montant-net { font-size: 15px; color: #1a56db; font-weight: bold; }
  .alertes { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 5px; margin: 10px 0; color: #856404; }
  .alertes ul { margin: 5px 0; padding-left: 20px; }
  .signatures { display: flex; justify-content: space-around; margin-top: 30px; }
  .sig-box { width: 28%; text-align: center; }
  .sig-title { font-weight: bold; font-size: 10px; margin-bottom: 5px; }
  .sig-zone { border: 1px solid #333; height: 60px; display: flex; align-items: center; justify-content: center; margin: 5px 0; }
  .sig-date { font-size: 9px; color: #666; }
  .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; border-top: 1px solid #dee2e6; padding-top: 10px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
  .badge-success { background: #d1fae5; color: #065f46; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-info    { background: #dbeafe; color: #1e429f; }
</style>
</head>
<body>

<div class='header'>
  <h1>EduSchedule Pro</h1>
  <h2>FICHE DE VACATION MENSUELLE</h2>
  <p>ISGE-BF — Institut Superieur de Genie Electrique du Burkina Faso</p>
</div>

<div class='separator'></div>

<div class='infos'>
  <div>
    <p><strong>Enseignant :</strong> {$vacation['enseignant_nom']}</p>
    <p><strong>Matricule :</strong> {$vacation['matricule']}</p>
    <p><strong>Specialite :</strong> {$vacation['specialite']}</p>
    <p><strong>Periode :</strong> {$moisLabel} {$vacation['annee']}</p>
  </div>
  <div>
    <p><strong>Statut :</strong> <span class='badge badge-info'>{$statutLabel}</span></p>
    <p><strong>Taux horaire :</strong> {$vacation['taux_horaire']} FCFA/h</p>
    <p><strong>Total heures :</strong> {$totalH}h</p>
    <p><strong>Genere le :</strong> {$dateGen}</p>
  </div>
</div>

<div class='separator'></div>

{$alertesHTML}

<table>
  <thead>
    <tr>
      <th>Matiere</th>
      <th class='center'>Date</th>
      <th class='center'>Duree</th>
      <th class='right'>Taux</th>
      <th class='center'>Pointage QR</th>
      <th class='center'>Cahier</th>
      <th class='right'>Montant</th>
    </tr>
  </thead>
  <tbody>
    {$rowsHTML}
  </tbody>
  <tfoot>
    <tr class='tfoot'>
      <td colspan='2'><strong>TOTAL</strong></td>
      <td class='center'><strong>{$totalH}h</strong></td>
      <td></td>
      <td colspan='2'></td>
      <td class='right'><strong>{$montantBrut} FCFA</strong></td>
    </tr>
  </tfoot>
</table>

<div class='montants'>
  <p>Montant brut : <strong>{$montantBrut} FCFA</strong></p>
  <p>Retenues : <strong>{$retenues} FCFA</strong></p>
  <p class='montant-net'>Montant net a payer : {$montantNet} FCFA</p>
</div>

<div class='separator'></div>

<div class='signatures'>
  <div class='sig-box'>
    <div class='sig-title'>Signature Enseignant</div>
    <div class='sig-zone'></div>
    <div class='sig-date'>Date : ___________</div>
  </div>
  <div class='sig-box'>
    <div class='sig-title'>Visa Surveillant</div>
    <div class='sig-zone'></div>
    <div class='sig-date'>Date : ___________</div>
  </div>
  <div class='sig-box'>
    <div class='sig-title'>Validation Comptable</div>
    <div class='sig-zone'></div>
    <div class='sig-date'>Date : ___________</div>
  </div>
</div>

<div class='footer'>
  EduSchedule Pro — ISGE-BF — Document genere automatiquement le {$dateGen}<br/>
  Ce document constitue la piece justificative pour le paiement de l'enseignant vacataire.
</div>

</body>
</html>";

// Retourner le HTML (le frontend génère le PDF avec jsPDF)
echo json_encode([
    'html'     => $html,
    'vacation' => $vacation,
    'lignes'   => $lignes,
    'alertes'  => $alertes,
    'total_heures' => $totalH,
    'mois_label'   => $moisLabel,
]);