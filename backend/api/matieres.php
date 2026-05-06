<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $payload = requireAuth();
    $stmt    = $db->prepare("SELECT * FROM matieres WHERE actif = 1 ORDER BY libelle");
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);
    $body    = json_decode(file_get_contents('php://input'), true);
    $stmt    = $db->prepare("
        INSERT INTO matieres (code, libelle, volume_horaire_total, coefficient)
        VALUES (?,?,?,?)
    ");
    $stmt->execute([
        $body['code'],
        $body['libelle'],
        $body['volume_horaire_total'],
        $body['coefficient'] ?? 1
    ]);
    http_response_code(201);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Matiere creee']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Methode non autorisee']);