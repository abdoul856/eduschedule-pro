<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $payload = requireAuth();
    $stmt    = $db->prepare("SELECT * FROM classes WHERE actif = 1 ORDER BY niveau, libelle");
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);
    $body    = json_decode(file_get_contents('php://input'), true);
    $stmt    = $db->prepare("
        INSERT INTO classes (code, libelle, niveau, annee_academique, capacite)
        VALUES (?,?,?,?,?)
    ");
    $stmt->execute([
        $body['code'],
        $body['libelle'],
        $body['niveau'],
        $body['annee_academique'],
        $body['capacite'] ?? 30
    ]);
    http_response_code(201);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Classe creee']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Methode non autorisee']);