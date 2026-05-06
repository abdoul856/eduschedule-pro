<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $payload = requireAuth();
    $stmt    = $db->prepare("SELECT * FROM enseignants WHERE actif = 1 ORDER BY nom, prenom");
    $stmt->execute();
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $payload = requireAuth();
    requireRole($payload, ['admin']);
    $body    = json_decode(file_get_contents('php://input'), true);
    $stmt    = $db->prepare("
        INSERT INTO enseignants (matricule, nom, prenom, email, specialite, statut, taux_horaire)
        VALUES (?,?,?,?,?,?,?)
    ");
    $stmt->execute([
        $body['matricule'],
        $body['nom'],
        $body['prenom'],
        $body['email'],
        $body['specialite'] ?? '',
        $body['statut']     ?? 'vacataire',
        $body['taux_horaire'] ?? 0
    ]);
    http_response_code(201);
    echo json_encode(['id' => $db->lastInsertId(), 'message' => 'Enseignant cree']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Methode non autorisee']);