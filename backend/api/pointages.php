<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'PUT') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);
    $body = json_decode(file_get_contents('php://input'), true);

    $stmt = $db->prepare("SELECT heure_debut FROM creneaux WHERE id = ?");
    $stmt->execute([$body['id_creneau']]);
    $creneau = $stmt->fetch();

    if ($creneau) {
        $heureDebutTs = strtotime(date('Y-m-d') . ' ' . $creneau['heure_debut']);
        $expire       = date('Y-m-d H:i:s', $heureDebutTs + (15 * 60));
    } else {
        $expire = date('Y-m-d H:i:s', strtotime('+1 hour'));
    }

    $db->prepare("UPDATE creneaux SET qr_token = ?, qr_expire = ?, qr_utilise = 0 WHERE id = ?")
       ->execute([$body['token_qr'], $expire, $body['id_creneau']]);

    echo json_encode(['message' => 'Token QR sauvegarde', 'expire' => $expire]);
    exit;
}

if ($method === 'POST') {
    $payload = requireAuth();
    $body    = json_decode(file_get_contents('php://input'), true);
    $tokenQR = $body['token_qr']   ?? null;
    $idCren  = $body['id_creneau'] ?? null;

    if (!$tokenQR) {
        http_response_code(400);
        echo json_encode(['erreur' => 'token_qr requis']);
        exit;
    }

    $sql    = "
        SELECT c.*, m.libelle AS matiere,
               CONCAT(e.prenom,' ',e.nom) AS enseignant,
               s.code AS salle, cl.libelle AS classe,
               et.semaine_debut
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN salles s        ON c.id_salle = s.id
        JOIN classes cl      ON et.id_classe = cl.id
        WHERE c.qr_token = ?
    ";
    $params = [$tokenQR];

    if ($idCren) {
        $sql    .= " AND c.id = ?";
        $params[] = $idCren;
    }

    $stmt = $db->prepare($sql . " LIMIT 1");
    $stmt->execute($params);
    $creneau = $stmt->fetch();

    if (!$creneau) {
        $db->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (?, 'SCAN_QR_ECHEC', ?, ?)
        ")->execute([
            $payload['id'],
            json_encode(['token' => substr($tokenQR, 0, 20) . '...']),
            $_SERVER['REMOTE_ADDR']
        ]);
        http_response_code(400);
        echo json_encode(['erreur' => 'QR-Code invalide']);
        exit;
    }

    if ($creneau['qr_utilise']) {
        http_response_code(400);
        echo json_encode(['erreur' => 'Ce QR-Code a deja ete utilise']);
        exit;
    }

    $maintenant   = time();
    $heureDebutTs = strtotime(date('Y-m-d') . ' ' . $creneau['heure_debut']);
    $fenetreMin   = $heureDebutTs - (15 * 60);
    $fenetreMax   = $heureDebutTs + (60 * 60);

    if ($maintenant < $fenetreMin) {
        http_response_code(400);
        echo json_encode(['erreur' => 'QR-Code pas encore valide — seance dans ' .
            round(($heureDebutTs - $maintenant) / 60) . ' minutes']);
        exit;
    }

    if ($maintenant > $fenetreMax) {
        http_response_code(400);
        echo json_encode(['erreur' => 'QR-Code expire — fenetre horaire depassee']);
        exit;
    }

    $diffMinutes = round(($maintenant - $heureDebutTs) / 60);
    $statut      = 'valide';
    if ($diffMinutes > 30) $statut = 'retard_grave';
    elseif ($diffMinutes > 15) $statut = 'retard';

    $db->prepare("
        INSERT INTO pointages (id_creneau, id_enseignant, heure_pointage_reelle, ip_source, token_utilise, statut)
        VALUES (?, ?, NOW(), ?, ?, ?)
    ")->execute([
        $creneau['id'],
        $creneau['id_enseignant'],
        $_SERVER['REMOTE_ADDR'],
        $tokenQR,
        $statut === 'retard_grave' ? 'retard' : $statut
    ]);

    $db->prepare("UPDATE creneaux SET qr_utilise = 1 WHERE id = ?")
       ->execute([$creneau['id']]);

    $db->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
        VALUES (?, 'SCAN_QR_SUCCES', ?, ?)
    ")->execute([
        $payload['id'],
        json_encode(['id_creneau' => $creneau['id'], 'statut' => $statut, 'retard_minutes' => $diffMinutes]),
        $_SERVER['REMOTE_ADDR']
    ]);

    if ($statut === 'retard_grave') {
        $db->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (?, 'ALERTE_RETARD_GRAVE', ?, ?)
        ")->execute([
            $payload['id'],
            json_encode(['id_creneau' => $creneau['id'], 'enseignant' => $creneau['enseignant'], 'retard_minutes' => $diffMinutes]),
            $_SERVER['REMOTE_ADDR']
        ]);
    }

    echo json_encode([
        'message' => 'Pointage valide',
        'statut'  => $statut === 'retard_grave' ? 'retard' : $statut,
        'retard_minutes' => $diffMinutes,
        'seance'  => [
            'matiere'     => $creneau['matiere'],
            'classe'      => $creneau['classe'],
            'salle'       => $creneau['salle'],
            'heure_debut' => $creneau['heure_debut'],
        ]
    ]);
    exit;
}

if ($method === 'GET') {
    $payload = requireAuth();
    $stmt    = $db->prepare("
        SELECT p.*, CONCAT(e.prenom,' ',e.nom) AS enseignant,
               m.libelle AS matiere, cl.libelle AS classe,
               c.heure_debut AS heure_prevue
        FROM pointages p
        JOIN enseignants e   ON p.id_enseignant = e.id
        JOIN creneaux c      ON p.id_creneau = c.id
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN classes cl      ON et.id_classe = cl.id
        ORDER BY p.date_creation DESC
        LIMIT 50
    ");
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Methode non autorisee']);