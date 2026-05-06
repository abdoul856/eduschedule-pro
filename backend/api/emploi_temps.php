<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action']     ?? null;
$idCren = $_GET['id_creneau'] ?? null;

if ($method === 'GET') {
    $payload  = requireAuth();
    $idClasse = $_GET['id_classe']     ?? null;
    $semaine  = $_GET['semaine']       ?? null;
    $idEns    = $_GET['id_enseignant'] ?? null;
    $idSalle  = $_GET['id_salle']      ?? null;

    if (!$semaine) {
        http_response_code(400);
        echo json_encode(['erreur' => 'semaine requise']);
        exit;
    }

    $where  = "WHERE et.semaine_debut = ?";
    $params = [$semaine];

    if ($idClasse) { $where .= " AND et.id_classe = ?";    $params[] = $idClasse; }
    if ($idEns)    { $where .= " AND c.id_enseignant = ?"; $params[] = $idEns; }
    if ($idSalle)  { $where .= " AND c.id_salle = ?";      $params[] = $idSalle; }

    $stmt = $db->prepare("
        SELECT c.id, c.jour, c.heure_debut, c.heure_fin, c.type_seance,
               c.id_matiere, c.id_enseignant, c.id_salle,
               m.libelle AS matiere, m.code AS matiere_code,
               CONCAT(e.prenom,' ',e.nom) AS enseignant,
               s.code AS salle_code, s.libelle AS salle_libelle,
               cl.libelle AS classe_libelle, cl.code AS classe_code,
               et.id AS emploi_temps_id, et.statut_publication
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

if ($method === 'POST') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);
    $body = json_decode(file_get_contents('php://input'), true);

    if ($action === 'dupliquer') {
        $idClasse      = $body['id_classe']     ?? null;
        $semaineSource = $body['semaine_source'] ?? null;
        $semaineCible  = $body['semaine_cible']  ?? null;

        if (!$idClasse || !$semaineSource || !$semaineCible) {
            http_response_code(400);
            echo json_encode(['erreur' => 'Paramètres manquants']);
            exit;
        }

        $stmt = $db->prepare("SELECT id FROM emploi_temps WHERE id_classe = ? AND semaine_debut = ?");
        $stmt->execute([$idClasse, $semaineCible]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['erreur' => 'Un emploi du temps existe déjà pour cette semaine']);
            exit;
        }

        $stmt2 = $db->prepare("SELECT id FROM emploi_temps WHERE id_classe = ? AND semaine_debut = ?");
        $stmt2->execute([$idClasse, $semaineSource]);
        $etSource = $stmt2->fetch();

        if (!$etSource) {
            http_response_code(404);
            echo json_encode(['erreur' => 'Emploi du temps source introuvable']);
            exit;
        }

        $stmt3 = $db->prepare("
            INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par)
            VALUES (?, ?, 'brouillon', ?)
        ");
        $stmt3->execute([$idClasse, $semaineCible, $payload['id']]);
        $idETCible = $db->lastInsertId();

        $stmt4 = $db->prepare("SELECT * FROM creneaux WHERE id_emploi_temps = ?");
        $stmt4->execute([$etSource['id']]);
        $creneaux = $stmt4->fetchAll();

        foreach ($creneaux as $c) {
            $db->prepare("
                INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle,
                                      jour, heure_debut, heure_fin, type_seance)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([
                $idETCible, $c['id_matiere'], $c['id_enseignant'],
                $c['id_salle'], $c['jour'], $c['heure_debut'],
                $c['heure_fin'], $c['type_seance']
            ]);
        }

        echo json_encode(['message' => 'Semaine dupliquée — ' . count($creneaux) . ' créneaux copiés']);
        exit;
    }

    $idClasse = $body['id_classe']     ?? null;
    $semaine  = $body['semaine_debut'] ?? null;

    if (!$idClasse || !$semaine) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_classe et semaine_debut requis']);
        exit;
    }

    $stmt = $db->prepare("SELECT id FROM emploi_temps WHERE id_classe = ? AND semaine_debut = ?");
    $stmt->execute([$idClasse, $semaine]);
    $et = $stmt->fetch();

    if (!$et) {
        $stmt2 = $db->prepare("
            INSERT INTO emploi_temps (id_classe, semaine_debut, statut_publication, cree_par)
            VALUES (?, ?, 'brouillon', ?)
        ");
        $stmt2->execute([$idClasse, $semaine, $payload['id']]);
        $idET = $db->lastInsertId();
    } else {
        $idET = $et['id'];
    }

    $stmt3 = $db->prepare("
        SELECT c.id FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        WHERE c.id_enseignant = ? AND et.semaine_debut = ?
          AND c.jour = ?
          AND NOT (c.heure_fin <= ? OR c.heure_debut >= ?)
        LIMIT 1
    ");
    $stmt3->execute([
        $body['id_enseignant'], $semaine,
        $body['jour'], $body['heure_debut'], $body['heure_fin']
    ]);
    if ($stmt3->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Conflit : enseignant déjà occupé sur ce créneau']);
        exit;
    }

    $stmt4 = $db->prepare("
        SELECT c.id FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        WHERE c.id_salle = ? AND et.semaine_debut = ?
          AND c.jour = ?
          AND NOT (c.heure_fin <= ? OR c.heure_debut >= ?)
        LIMIT 1
    ");
    $stmt4->execute([
        $body['id_salle'], $semaine,
        $body['jour'], $body['heure_debut'], $body['heure_fin']
    ]);
    if ($stmt4->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Conflit : salle déjà occupée sur ce créneau']);
        exit;
    }

    $stmt5 = $db->prepare("
        INSERT INTO creneaux (id_emploi_temps, id_matiere, id_enseignant, id_salle,
                              jour, heure_debut, heure_fin, type_seance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt5->execute([
        $idET, $body['id_matiere'], $body['id_enseignant'],
        $body['id_salle'], $body['jour'],
        $body['heure_debut'], $body['heure_fin'],
        $body['type_seance'] ?? 'Cours'
    ]);

    http_response_code(201);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Créneau ajouté avec succès']);
    exit;
}

if ($method === 'PUT') {
    $payload  = requireAuth();
    requireRole($payload, ['admin']);
    $body     = json_decode(file_get_contents('php://input'), true);
    $idClasse = $body['id_classe']     ?? null;
    $semaine  = $body['semaine_debut'] ?? null;

    if (!$idClasse || !$semaine) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_classe et semaine_debut requis']);
        exit;
    }

    $stmt = $db->prepare("
        UPDATE emploi_temps SET statut_publication = 'publie'
        WHERE id_classe = ? AND semaine_debut = ?
    ");
    $stmt->execute([$idClasse, $semaine]);
    echo json_encode(['message' => 'Emploi du temps publié avec succès !']);
    exit;
}

if ($method === 'DELETE') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);

    if (!$idCren) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_creneau requis']);
        exit;
    }

    $db->prepare("DELETE FROM creneaux WHERE id = ?")->execute([$idCren]);
    echo json_encode(['message' => 'Créneau supprimé']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Méthode non autorisée']);