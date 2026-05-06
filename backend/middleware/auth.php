<?php
require_once __DIR__ . '/../utils/JWTHelper.php';

function requireAuth(): array {
    $headers = getallheaders();
    $auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!$auth || !str_starts_with($auth, 'Bearer ')) {
        http_response_code(401);
        echo json_encode(['erreur' => 'Token manquant. Authentification requise.']);
        exit;
    }

    $token   = substr($auth, 7);
    $payload = JWTHelper::verify($token);

    if (!$payload) {
        http_response_code(401);
        echo json_encode(['erreur' => 'Token invalide ou expiré.']);
        exit;
    }

    return $payload;
}

function requireRole(array $payload, array $roles): void {
    if (!in_array($payload['role'], $roles)) {
        http_response_code(403);
        echo json_encode(['erreur' => 'Accès interdit. Rôle insuffisant.']);
        exit;
    }
}