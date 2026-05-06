<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? null;
$id     = $_GET['id']     ?? null;

if ($method === 'GET') {
    $payload = requireAuth();
    $idEns   = $_GET['id_enseignant'] ?? null;
    $mois    = $_GET['mois']          ?? null;
    $annee   = $_GET['annee']         ?? null;

    $where  = "WHERE 1=1";
    $params = [];
    if ($idEns) { $where .= " AND v.id_enseignant = ?"; $params[] = $idEns; }
    if ($mois)  { $where .= " AND v.mois = ?";          $params[] = $mois; }
    if ($annee) { $where .= " AND v.annee = ?";         $params[] = $annee; }

    $stmt = $db->prepare("
        SELECT v.*, CONCAT(e.prenom,' ',e.nom) AS enseignant_nom, e.taux_horaire
        FROM vacations v
        JOIN enseignants e ON v.id_enseignant = e.id
        $where
        ORDER BY v.annee DESC, v.mois DESC
    ");
    $stmt->execute($params);
    $vacations = $stmt->fetchAll();

    foreach ($vacations as &$v) {
        $stmt2 = $db->prepare("
            SELECT vl.*, m.libelle AS matiere,
                   et.semaine_debut AS date,
                   c.heure_debut, c.heure_fin,
                   ct.statut AS statut_cahier,
                   p.id AS pointage_id
            FROM vacation_lignes vl
            JOIN creneaux c      ON vl.id_creneau = c.id
            JOIN matieres m      ON c.id_matiere = m.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
            LEFT JOIN pointages p      ON p.id_creneau = c.id
            WHERE vl.id_vacation = ?
        ");
        $stmt2->execute([$v['id']]);
        $lignes = $stmt2->fetchAll();

        $alertes = [];
        foreach ($lignes as $l) {
            if (!$l['pointage_id']) {
                $alertes[] = "Seance {$l['matiere']} sans pointage QR";
            }
            if ($l['statut_cahier'] !== 'cloture') {
                $alertes[] = "Cahier de {$l['matiere']} non cloture";
            }
            $dureeReelle = floatval($l['duree_heures']);
            $dureePrevu  = (strtotime($l['heure_fin']) - strtotime($l['heure_debut'])) / 3600;
            if ($dureeReelle > $dureePrevu + 0.5) {
                $alertes[] = "Duree {$l['matiere']} depasse de 30 min la duree planifiee";
            }
        }
        $v['lignes']  = $lignes;
        $v['alertes'] = $alertes;
    }

    echo json_encode($vacations);
    exit;
}

if ($method === 'POST') {
    $payload = requireAuth();
    $body    = json_decode(file_get_contents('php://input'), true);

    if ($id && $action) {
        $stmt = $db->prepare("SELECT * FROM vacations WHERE id = ?");
        $stmt->execute([$id]);
        $vacation = $stmt->fetch();

        if (!$vacation) {
            http_response_code(404);
            echo json_encode(['erreur' => 'Fiche introuvable']);
            exit;
        }

        if ($action === 'valider') {
            $stmt2 = $db->prepare("
                SELECT COUNT(*) AS non_clotures
                FROM vacation_lignes vl
                JOIN creneaux c ON vl.id_creneau = c.id
                LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
                WHERE vl.id_vacation = ?
                AND (ct.statut IS NULL OR ct.statut != 'cloture')
            ");
            $stmt2->execute([$id]);
            $result = $stmt2->fetch();
            if ($result['non_clotures'] > 0) {
                http_response_code(400);
                echo json_encode(['erreur' => "Impossible de valider : {$result['non_clotures']} seance(s) non cloturee(s)."]);
                exit;
            }

            $stmt3 = $db->prepare("
                SELECT COUNT(*) AS sans_pointage
                FROM vacation_lignes vl
                LEFT JOIN pointages p ON p.id_creneau = vl.id_creneau
                WHERE vl.id_vacation = ? AND p.id IS NULL
            ");
            $stmt3->execute([$id]);
            $result2 = $stmt3->fetch();
            if ($result2['sans_pointage'] > 0) {
                http_response_code(400);
                echo json_encode(['erreur' => "Attention : {$result2['sans_pointage']} seance(s) sans pointage QR."]);
                exit;
            }
        }

        $nouveauStatut = match($action) {
            'valider'   => 'visee_surveillant',
            'approuver' => 'approuvee',
            'payer'     => 'payee',
            default     => null
        };

        if (!$nouveauStatut) {
            http_response_code(400);
            echo json_encode(['erreur' => 'Action invalide']);
            exit;
        }

        $db->prepare("UPDATE vacations SET statut = ? WHERE id = ?")
           ->execute([$nouveauStatut, $id]);

        $db->prepare("
            INSERT INTO validations (id_vacation, id_validateur, role_validateur, commentaire)
            VALUES (?, ?, ?, ?)
        ")->execute([$id, $payload['id'], $payload['role'], $body['commentaire'] ?? '']);

        echo json_encode(['message' => 'Fiche mise a jour : ' . $nouveauStatut]);
        exit;
    }

    $idEns = $body['id_enseignant'] ?? null;
    $mois  = $body['mois']          ?? null;
    $annee = $body['annee']         ?? null;

    if (!$idEns || !$mois || !$annee) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_enseignant, mois et annee requis']);
        exit;
    }

    $stmt = $db->prepare("SELECT id FROM vacations WHERE id_enseignant = ? AND mois = ? AND annee = ?");
    $stmt->execute([$idEns, $mois, $annee]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Une fiche existe deja pour ce mois']);
        exit;
    }

    $stmt2 = $db->prepare("
        SELECT c.id, c.heure_debut, c.heure_fin, e.taux_horaire, ct.heure_fin_reelle
        FROM creneaux c
        JOIN emploi_temps et ON c.id_emploi_temps = et.id
        JOIN enseignants e   ON c.id_enseignant = e.id
        LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
        WHERE c.id_enseignant = ?
          AND MONTH(et.semaine_debut) = ?
          AND YEAR(et.semaine_debut)  = ?
    ");
    $stmt2->execute([$idEns, $mois, $annee]);
    $seances = $stmt2->fetchAll();

    $montantBrut = 0;
    $lignes      = [];

    foreach ($seances as $s) {
        $debut   = strtotime($s['heure_debut']);
        $fin     = strtotime($s['heure_fin_reelle'] ?? $s['heure_fin']);
        $duree   = round(($fin - $debut) / 3600, 2);
        $montant = $duree * $s['taux_horaire'];
        $montantBrut += $montant;
        $lignes[] = [
            'id_creneau' => $s['id'],
            'duree'      => $duree,
            'taux'       => $s['taux_horaire'],
            'montant'    => $montant
        ];
    }

    $stmt3 = $db->prepare("
        INSERT INTO vacations (id_enseignant, mois, annee, montant_brut, montant_net, statut)
        VALUES (?, ?, ?, ?, ?, 'generee')
    ");
    $stmt3->execute([$idEns, $mois, $annee, $montantBrut, $montantBrut]);
    $idVacation = $db->lastInsertId();

    foreach ($lignes as $l) {
        $db->prepare("
            INSERT INTO vacation_lignes (id_vacation, id_creneau, duree_heures, taux_horaire, montant)
            VALUES (?, ?, ?, ?, ?)
        ")->execute([$idVacation, $l['id_creneau'], $l['duree'], $l['taux'], $l['montant']]);
    }

    http_response_code(201);
    echo json_encode(['id' => $idVacation, 'message' => 'Fiche generee avec succes', 'montant' => $montantBrut]);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Methode non autorisee']);