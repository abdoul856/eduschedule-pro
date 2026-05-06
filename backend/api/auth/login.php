<?php
// backend/api/auth/login.php

require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../utils/JWTHelper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['erreur' => 'Méthode non autorisée']);
    exit;
}

// Lire le corps JSON
$body = json_decode(file_get_contents('php://input'), true);
$email    = trim($body['email']    ?? '');
$password = trim($body['password'] ?? '');

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['erreur' => 'Email et mot de passe requis']);
    exit;
}

// Chercher l'utilisateur
$db   = (new Database())->getConnection();
$stmt = $db->prepare("
    SELECT id, email, mot_de_passe_hash, role, id_lien, actif
    FROM utilisateurs
    WHERE email = ?
    LIMIT 1
");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !$user['actif']) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Identifiants incorrects']);
    exit;
}

if (!password_verify($password, $user['mot_de_passe_hash'])) {
    http_response_code(401);
    echo json_encode(['erreur' => 'Identifiants incorrects']);
    exit;
}

// Mettre à jour la dernière connexion
$db->prepare("UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = ?")
   ->execute([$user['id']]);

// Générer le JWT
$token = JWTHelper::generate([
    'id'      => $user['id'],
    'email'   => $user['email'],
    'role'    => $user['role'],
    'id_lien' => $user['id_lien'],
]);

http_response_code(200);
echo json_encode([
    'token' => $token,
    'utilisateur' => [
        'id'      => $user['id'],
        'email'   => $user['email'],
        'role'    => $user['role'],
        'id_lien' => $user['id_lien'],
    ]
]);
