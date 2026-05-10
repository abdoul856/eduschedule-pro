<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

if ($method === 'GET') {
    $payload = requireAuth();

    // GET /api/creneaux/{id}/qr — Obtenir le QR-Code d'un créneau
    if ($id && $action === 'qr') {
        $stmt = $db->prepare("
            SELECT c.id, c.heure_debut, c.heure_fin, c.jour,
                   c.token_qr, c.qr_expire_at,
                   m.libelle AS matiere,
                   CONCAT(e.prenom,' ',e.nom) AS enseignant,
                   s.code AS salle_code,
                   cl.libelle AS classe,
                   et.semaine_debut
            FROM creneaux c
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN matieres m      ON c.id_matiere = m.id
            JOIN enseignants e   ON c.id_enseignant = e.id
            JOIN salles s        ON c.id_salle = s.id
            JOIN classes cl      ON et.id_classe = cl.id
            WHERE c.id = ?
        ");
        $stmt->execute([$id]);
        $creneau = $stmt->fetch();

        if (!$creneau) {
            http_response_code(404);
            echo json_encode(['erreur' => 'Créneau introuvable']);
            exit;
        }

        // Générer un nouveau token si absent ou expiré
        if (!$creneau['token_qr'] || (
            $creneau['qr_expire_at'] &&
            strtotime($creneau['qr_expire_at']) < time()
        )) {
            $secret    = $_ENV['QR_SECRET'] ?? 'QR_SECRET_ISGE_BF_2025';
            $timestamp = time();
            $random    = bin2hex(random_bytes(8));
            $data      = $creneau['id'] . '|' . $timestamp . '|' . $random;
            $token     = hash_hmac('sha256', $data, $secret);

            // Fenêtre de validité : heure prévue ±15 min
            $heureDebutTs = strtotime(date('Y-m-d') . ' ' . $creneau['heure_debut']);
            $expireAt     = date('Y-m-d H:i:s', $heureDebutTs + (75 * 60));

            $db->prepare("
                UPDATE creneaux
                SET token_qr = ?, qr_expire_at = ?, qr_utilise = 0
                WHERE id = ?
            ")->execute([$token, $expireAt, $id]);

            $creneau['token_qr']      = $token;
            $creneau['qr_expire_at']  = $expireAt;
        }

        // Données à encoder dans le QR
        $qrData = json_encode([
            'id_creneau' => (int)$creneau['id'],
            'token'      => $creneau['token_qr'],
            'matiere'    => $creneau['matiere'],
            'enseignant' => $creneau['enseignant'],
            'heure'      => $creneau['heure_debut'],
        ]);

        echo json_encode([
            'id_creneau'  => (int)$creneau['id'],
            'token'       => $creneau['token_qr'],
            'expire_at'   => $creneau['qr_expire_at'],
            'qr_data'     => $qrData,
            'creneau'     => $creneau,
        ]);
        exit;
    }

    // GET /api/creneaux — Liste des créneaux
    $idClasse    = $_GET['id_classe']    ?? null;
    $idEns       = $_GET['id_enseignant'] ?? null;
    $semaine     = $_GET['semaine']      ?? null;

    $where  = "WHERE 1=1";
    $params = [];

    if ($idClasse) { $where .= " AND et.id_classe = ?";    $params[] = $idClasse; }
    if ($idEns)    { $where .= " AND c.id_enseignant = ?"; $params[] = $idEns; }
    if ($semaine)  { $where .= " AND et.semaine_debut = ?"; $params[] = $semaine; }

    $stmt = $db->prepare("
        SELECT c.id, c.jour, c.heure_debut, c.heure_fin, c.type_seance,
               c.token_qr, c.qr_expire_at, c.qr_utilise,
               c.id_matiere, c.id_enseignant, c.id_salle,
               m.libelle AS matiere,
               CONCAT(e.prenom,' ',e.nom) AS enseignant,
               s.code AS salle_code,
               cl.libelle AS classe,
               et.semaine_debut
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN salles s        ON c.id_salle = s.id
        JOIN classes cl      ON et.id_classe = cl.id
        $where
        ORDER BY FIELD(c.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'),
                 c.heure_debut
    ");
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

// PUT — Sauvegarder token QR
if ($method === 'PUT') {
    $payload = requireAuth();
    $body    = json_decode(file_get_contents('php://input'), true);

    $idCreneau = $body['id_creneau'] ?? null;
    $tokenQR   = $body['token_qr']   ?? null;

    if (!$idCreneau || !$tokenQR) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_creneau et token_qr requis']);
        exit;
    }

    // Calculer expiration
    $stmt = $db->prepare("
        SELECT heure_debut FROM creneaux WHERE id = ?
    ");
    $stmt->execute([$idCreneau]);
    $creneau = $stmt->fetch();

    $heureDebutTs = strtotime(date('Y-m-d') . ' ' . ($creneau['heure_debut'] ?? '07:30:00'));
    $expireAt     = date('Y-m-d H:i:s', $heureDebutTs + (75 * 60));

    $db->prepare("
        UPDATE creneaux
        SET token_qr = ?, qr_expire_at = ?, qr_utilise = 0
        WHERE id = ?
    ")->execute([$tokenQR, $expireAt, $idCreneau]);

    echo json_encode(['message' => 'Token QR sauvegardé', 'expire_at' => $expireAt]);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Méthode non autorisée']);