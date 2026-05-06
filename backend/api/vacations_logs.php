<?php
require_once '../config.php';
require_once '../auth.php';

$utilisateur = verifierToken();
if (!$utilisateur || !in_array($utilisateur['role'], ['comptable','admin'])) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès refusé']);
    exit;
}

$id_vacation = (int)($_GET['id_vacation'] ?? 0);

if (!$id_vacation) {
    http_response_code(400);
    echo json_encode(['erreur' => 'id_vacation manquant']);
    exit;
}

$sql = "
    SELECT 
        vl.id, vl.action, vl.commentaire, vl.created_at,
        CONCAT(u.email) AS utilisateur_email,
        u.role AS utilisateur_role
    FROM vacations_logs vl
    JOIN utilisateurs u ON vl.id_utilisateur = u.id
    WHERE vl.id_vacation = ?
    ORDER BY vl.created_at DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute([$id_vacation]);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));