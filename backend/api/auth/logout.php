<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['erreur' => 'Méthode non autorisée']);
    exit;
}

$payload = requireAuth();

// Invalider le token en BDD
$stmt = $db->prepare("
    UPDATE utilisateurs
    SET token_connexion = NULL, derniere_connexion = NOW()
    WHERE id = ?
");
$stmt->execute([$payload['id']]);

// Logger la déconnexion
$db->prepare("
    INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
    VALUES (?, 'deconnexion', ?, ?)
")->execute([
    $payload['id'],
    json_encode(['email' => $payload['email']]),
    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
]);

echo json_encode(['message' => 'Déconnexion réussie']);