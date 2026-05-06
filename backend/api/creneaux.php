<?php
// backend/api/creneaux.php
// Gestion des créneaux + génération QR-Code

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Extraire l'ID depuis l'URL si présent : /api/creneaux/5 ou /api/creneaux/5/qr
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts  = array_filter(explode('/', $uri));
$parts  = array_values($parts);
// Chercher l'index de 'creneaux'
$idx    = array_search('creneaux', $parts);
$id     = isset($parts[$idx + 1]) ? (int)$parts[$idx + 1] : null;
$action = $parts[$idx + 2] ?? null; // 'qr' éventuellement

// -------------------------------------------------------
// GET /api/creneaux?id_emploi_temps=X
// -------------------------------------------------------
if ($method === 'GET' && !$id) {
    $payload = requireAuth();
    $idET    = (int)($_GET['id_emploi_temps'] ?? 0);

    if (!$idET) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_emploi_temps requis']);
        exit;
    }

    $stmt = $db->prepare("
        SELECT c.*, m.libelle AS matiere, m.code AS matiere_code,
               CONCAT(e.prenom,' ',e.nom) AS enseignant,
               s.code AS salle_code, s.libelle AS salle_libelle
        FROM creneaux c
        JOIN matieres m    ON c.id_matiere    = m.id
        JOIN enseignants e ON c.id_enseignant = e.id
        JOIN salles s      ON c.id_salle      = s.id
        WHERE c.id_emploi_temps = ?
        ORDER BY FIELD(c.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'),
                 c.heure_debut
    ");
    $stmt->execute([$idET]);
    echo json_encode($stmt->fetchAll());
    exit;
}

// -------------------------------------------------------
// GET /api/creneaux/{id}/qr  — Générer le QR-Code
// -------------------------------------------------------
if ($method === 'GET' && $id && $action === 'qr') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);

    // Récupérer le créneau
    $stmt = $db->prepare("SELECT * FROM creneaux WHERE id = ?");
    $stmt->execute([$id]);
    $creneau = $stmt->fetch();

    if (!$creneau) {
        http_response_code(404);
        echo json_encode(['erreur' => 'Créneau introuvable']);
        exit;
    }

    // Générer un token unique sécurisé
    $secret    = $_ENV['QR_SECRET'] ?? 'QR_SECRET_A_CHANGER';
    $timestamp = time();
    $token     = hash_hmac('sha256', $id . $timestamp . $secret, $secret);

    // Fenêtre de validité : ±15 min autour de l'heure prévue
    // On calcule la date + heure du créneau pour cette semaine
    $expire = date('Y-m-d H:i:s', $timestamp + 3600); // simplifié : 1h de validité

    // Sauvegarder le token
    $db->prepare("UPDATE creneaux SET qr_token = ?, qr_expire = ?, qr_utilise = 0 WHERE id = ?")
       ->execute([$token, $expire, $id]);

    // Données encodées dans le QR
    $qrData = json_encode(['id_creneau' => $id, 'token' => $token]);

    // Retourner les infos (le frontend génère l'image QR avec jsQR/qrcode.js)
    echo json_encode([
        'token'      => $token,
        'expire'     => $expire,
        'qr_data'    => $qrData,
        'creneau_id' => $id
    ]);
    exit;
}

// -------------------------------------------------------
// POST /api/creneaux — Créer un créneau
// -------------------------------------------------------
if ($method === 'POST') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);

    $body = json_decode(file_get_contents('php://input'), true);
    $required = ['id_emploi_temps','id_matiere','id_enseignant','id_salle','jour','heure_debut','heure_fin'];

    foreach ($required as $field) {
        if (empty($body[$field])) {
            http_response_code(400);
            echo json_encode(['erreur' => "Champ requis manquant : $field"]);
            exit;
        }
    }

    // Détecter les conflits : enseignant déjà occupé au même moment
    $stmt = $db->prepare("
        SELECT c.id FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN emploi_temps et2 ON et2.id = ?
        WHERE c.id_enseignant = ?
          AND et.semaine_debut = et2.semaine_debut
          AND c.jour = ?
          AND NOT (c.heure_fin <= ? OR c.heure_debut >= ?)
        LIMIT 1
    ");
    $stmt->execute([
        $body['id_emploi_temps'],
        $body['id_enseignant'],
        $body['jour'],
        $body['heure_debut'],
        $body['heure_fin']
    ]);

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Conflit : cet enseignant est déjà occupé sur ce créneau']);
        exit;
    }

    // Détecter les conflits de salle
    $stmt2 = $db->prepare("
        SELECT c.id FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN emploi_temps et2 ON et2.id = ?
        WHERE c.id_salle = ?
          AND et.semaine_debut = et2.semaine_debut
          AND c.jour = ?
          AND NOT (c.heure_fin <= ? OR c.heure_debut >= ?)
        LIMIT 1
    ");
    $stmt2->execute([
        $body['id_emploi_temps'],
        $body['id_salle'],
        $body['jour'],
        $body['heure_debut'],
        $body['heure_fin']
    ]);

    if ($stmt2->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Conflit : cette salle est déjà occupée sur ce créneau']);
        exit;
    }

    // Insérer le créneau
    $stmt3 = $db->prepare("
        INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle,
                              jour, heure_debut, heure_fin, type_seance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt3->execute([
        $body['id_emploi_temps'],
        $body['id_matiere'],
        $body['id_enseignant'],
        $body['id_salle'],
        $body['jour'],
        $body['heure_debut'],
        $body['heure_fin'],
        $body['type_seance'] ?? 'Cours'
    ]);

    http_response_code(201);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Créneau créé avec succès']);
    exit;
}

// -------------------------------------------------------
// DELETE /api/creneaux/{id}
// -------------------------------------------------------
if ($method === 'DELETE' && $id) {
    $payload = requireAuth();
    requireRole($payload, ['admin']);

    $db->prepare("DELETE FROM creneaux WHERE id = ?")->execute([$id]);
    echo json_encode(['message' => 'Créneau supprimé']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Méthode non autorisée']);
