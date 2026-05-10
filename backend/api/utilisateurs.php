<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db      = (new Database())->getConnection();
$methode = $_SERVER['REQUEST_METHOD'];
$id      = $_GET['id'] ?? null;

$payload = requireAuth();
if ($payload['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès réservé à l\'administrateur']);
    exit;
}

// ── GET ──
if ($methode === 'GET') {
    $stmt = $db->query("
        SELECT id, email, role, id_lien, actif, derniere_connexion
        FROM utilisateurs
        ORDER BY role, email ASC
    ");
    echo json_encode($stmt->fetchAll());
    exit;
}

// ── POST (créer) ──
if ($methode === 'POST') {
    $body    = json_decode(file_get_contents('php://input'), true);
    $email   = trim($body['email']        ?? '');
    $mdp     = trim($body['mot_de_passe'] ?? '');
    $role    = trim($body['role']         ?? 'etudiant');
    $actif   = (int)($body['actif']       ?? 1);
    // ── AJOUT : récupérer id_lien ──
    $id_lien = !empty($body['id_lien']) ? (int)$body['id_lien'] : null;

    if (!$email || !$mdp) {
        http_response_code(400);
        echo json_encode(['erreur' => 'Email et mot de passe obligatoires']);
        exit;
    }

    $check = $db->prepare("SELECT id FROM utilisateurs WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Cet email est déjà utilisé']);
        exit;
    }

    $hash = password_hash($mdp, PASSWORD_BCRYPT);
    // ── AJOUT : insérer id_lien ──
    $stmt = $db->prepare("
        INSERT INTO utilisateurs (email, mot_de_passe_hash, role, actif, id_lien)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$email, $hash, $role, $actif, $id_lien]);
    echo json_encode(['message' => 'Utilisateur créé', 'id' => $db->lastInsertId()]);
    exit;
}

// ── PUT (modifier) ──
if ($methode === 'PUT' && $id) {
    $body    = json_decode(file_get_contents('php://input'), true);
    $email   = trim($body['email']        ?? '');
    $mdp     = trim($body['mot_de_passe'] ?? '');
    $role    = trim($body['role']         ?? '');
    $actif   = (int)($body['actif']       ?? 1);
    // ── AJOUT : récupérer id_lien ──
    $id_lien = !empty($body['id_lien']) ? (int)$body['id_lien'] : null;

    if ($mdp) {
        $hash = password_hash($mdp, PASSWORD_BCRYPT);
        $db->prepare("
            UPDATE utilisateurs
            SET email=?, mot_de_passe_hash=?, role=?, actif=?, id_lien=?
            WHERE id=?
        ")->execute([$email, $hash, $role, $actif, $id_lien, $id]);
    } else {
        $db->prepare("
            UPDATE utilisateurs
            SET email=?, role=?, actif=?, id_lien=?
            WHERE id=?
        ")->execute([$email, $role, $actif, $id_lien, $id]);
    }
    echo json_encode(['message' => 'Utilisateur modifié']);
    exit;
}

// ── DELETE ──
if ($methode === 'DELETE' && $id) {
    if ((int)$id === (int)$payload['id']) {
        http_response_code(400);
        echo json_encode(['erreur' => 'Impossible de supprimer votre propre compte']);
        exit;
    }
    $db->prepare("DELETE FROM utilisateurs WHERE id = ?")->execute([$id]);
    echo json_encode(['message' => 'Utilisateur supprimé']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Méthode non autorisée']);