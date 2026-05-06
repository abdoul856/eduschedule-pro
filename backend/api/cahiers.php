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

    $stmt = $db->prepare("
        SELECT c.id AS id_creneau, c.jour, c.heure_debut, c.heure_fin,
               m.libelle AS matiere, s.code AS salle_code,
               CONCAT(e.prenom,' ',e.nom) AS enseignant,
               cl.libelle AS classe,
               ct.id AS cahier_id, ct.statut AS statut_cahier,
               ct.titre_cours, ct.contenu_json,
               ct.niveau_avancement, ct.observations,
               ct.heure_fin_reelle,
               p.heure_pointage_reelle AS heure_debut_reelle
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN matieres m      ON c.id_matiere = m.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        JOIN salles s        ON c.id_salle = s.id
        JOIN classes cl      ON et.id_classe = cl.id
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        LEFT JOIN pointages p      ON p.id_creneau = c.id
        ORDER BY FIELD(c.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'),
                 c.heure_debut
        LIMIT 50
    ");
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $payload = requireAuth();
    $body    = json_decode(file_get_contents('php://input'), true);

    if ($id && $action === 'cloture') {
        $stmt = $db->prepare("SELECT * FROM cahiers_texte WHERE id = ?");
        $stmt->execute([$id]);
        $cahier = $stmt->fetch();

        if (!$cahier) {
            http_response_code(404);
            echo json_encode(['erreur' => 'Cahier introuvable']);
            exit;
        }

        if ($cahier['statut'] === 'cloture') {
            http_response_code(400);
            echo json_encode(['erreur' => 'Ce cahier est deja cloture']);
            exit;
        }

        $db->prepare("UPDATE cahiers_texte SET heure_fin_reelle = ?, statut = 'cloture' WHERE id = ?")
           ->execute([$body['heure_fin'], $id]);

        if (!empty($body['signature_enseignant'])) {
            $db->prepare("
                INSERT INTO signatures (id_cahier, type_signataire, id_utilisateur, signature_base64)
                VALUES (?, 'enseignant', ?, ?)
            ")->execute([$id, $payload['id'], $body['signature_enseignant']]);
        }

        $db->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (?, 'CAHIER_CLOTURE', ?, ?)
        ")->execute([$payload['id'], json_encode(['id_cahier' => $id]), $_SERVER['REMOTE_ADDR']]);

        echo json_encode(['message' => 'Seance cloturee avec succes']);
        exit;
    }

    if (empty($body['id_creneau'])) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_creneau requis']);
        exit;
    }

    $stmt = $db->prepare("SELECT id FROM cahiers_texte WHERE id_creneau = ?");
    $stmt->execute([$body['id_creneau']]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Un cahier existe deja pour cette seance']);
        exit;
    }

    $contenuJson = json_encode($body['contenu_json'] ?? []);

    $stmt2 = $db->prepare("
        INSERT INTO cahiers_texte
            (id_creneau, id_delegue, titre_cours, contenu_json,
             niveau_avancement, observations, statut)
        VALUES (?, ?, ?, ?, ?, ?, 'signe_delegue')
    ");
    $stmt2->execute([
        $body['id_creneau'],
        $payload['id'],
        $body['titre_cours']       ?? '',
        $contenuJson,
        $body['niveau_avancement'] ?? '',
        $body['observations']      ?? ''
    ]);

    $idCahier = $db->lastInsertId();

    if (!empty($body['travaux'])) {
        foreach ($body['travaux'] as $t) {
            $db->prepare("
                INSERT INTO travaux_demandes (id_cahier, description, date_limite, type)
                VALUES (?, ?, ?, ?)
            ")->execute([
                $idCahier,
                $t['description'],
                !empty($t['date_limite']) ? $t['date_limite'] : null,
                $t['type'] ?? 'exercice'
            ]);
        }
    }

    if (!empty($body['signature_delegue'])) {
        $db->prepare("
            INSERT INTO signatures (id_cahier, type_signataire, id_utilisateur, signature_base64)
            VALUES (?, 'delegue', ?, ?)
        ")->execute([$idCahier, $payload['id'], $body['signature_delegue']]);
    }

    $db->prepare("
        INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
        VALUES (?, 'CAHIER_CREE', ?, ?)
    ")->execute([
        $payload['id'],
        json_encode(['id_cahier' => $idCahier, 'id_creneau' => $body['id_creneau']]),
        $_SERVER['REMOTE_ADDR']
    ]);

    http_response_code(201);
    echo json_encode(['id' => $idCahier, 'message' => 'Cahier cree avec succes']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Methode non autorisee']);