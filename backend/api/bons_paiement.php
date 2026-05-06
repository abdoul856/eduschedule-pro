<?php
require_once '../config.php';
require_once '../auth.php';

$utilisateur = verifierToken();
if (!$utilisateur || !in_array($utilisateur['role'], ['comptable','admin'])) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès refusé']);
    exit;
}

$methode = $_SERVER['REQUEST_METHOD'];

// ── GET : liste des bons ──
if ($methode === 'GET') {
    $where  = ['1=1'];
    $params = [];

    if (!empty($_GET['annee'])) {
        $where[]  = 'YEAR(b.date_generation) = ?';
        $params[] = (int)$_GET['annee'];
    }
    if (!empty($_GET['mois'])) {
        $where[]  = 'v.mois = ?';
        $params[] = (int)$_GET['mois'];
    }
    if (!empty($_GET['statut'])) {
        $where[]  = 'b.statut = ?';
        $params[] = $_GET['statut'];
    }

    $whereSQL = implode(' AND ', $where);

    $sql = "
        SELECT 
            b.id, b.numero_bon, b.montant_net,
            b.date_generation, b.date_paiement, b.statut, b.observations,
            v.mois, v.annee, v.id_enseignant,
            CONCAT(e.prenom, ' ', e.nom) AS enseignant_nom,
            e.matricule
        FROM bons_paiement b
        JOIN vacations v    ON b.id_vacation  = v.id
        JOIN enseignants e  ON v.id_enseignant = e.id
        WHERE $whereSQL
        ORDER BY b.date_generation DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

// ── POST : enregistrer un bon manuellement ──
if ($methode === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    $id_vacation  = (int)($body['id_vacation']  ?? 0);
    $observations = trim($body['observations']   ?? '');

    if (!$id_vacation) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_vacation manquant']);
        exit;
    }

    $stmtV = $pdo->prepare("SELECT * FROM vacations WHERE id = ?");
    $stmtV->execute([$id_vacation]);
    $vacation = $stmtV->fetch(PDO::FETCH_ASSOC);

    if (!$vacation) {
        http_response_code(404);
        echo json_encode(['erreur' => 'Vacation introuvable']);
        exit;
    }

    $numBon = 'BON-' . $vacation['annee'] . '-'
            . str_pad($vacation['mois'], 2, '0', STR_PAD_LEFT) . '-'
            . str_pad($id_vacation, 4, '0', STR_PAD_LEFT);

    $stmt = $pdo->prepare("
        INSERT INTO bons_paiement (numero_bon, id_vacation, id_comptable, montant_net, observations, statut)
        VALUES (?, ?, ?, ?, ?, 'genere')
        ON DUPLICATE KEY UPDATE observations = VALUES(observations)
    ");
    $stmt->execute([$numBon, $id_vacation, $utilisateur['id'], $vacation['montant_net'], $observations]);

    echo json_encode([
        'message'    => 'Bon créé avec succès',
        'numero_bon' => $numBon
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Méthode non autorisée']);