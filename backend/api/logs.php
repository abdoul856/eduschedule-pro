<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['erreur' => 'Méthode non autorisée']);
    exit;
}

$payload = requireAuth();
requireRole($payload, ['admin']);

$action     = $_GET['action']     ?? null;
$date_debut = $_GET['date_debut'] ?? null;
$date_fin   = $_GET['date_fin']   ?? null;
$id_user    = $_GET['id_user']    ?? null;
$limite     = (int)($_GET['limite'] ?? 100);

$where  = "WHERE 1=1";
$params = [];

if ($action) {
    $where   .= " AND l.action = ?";
    $params[] = $action;
}

if ($date_debut) {
    $where   .= " AND l.created_at >= ?";
    $params[] = $date_debut . " 00:00:00";
}

if ($date_fin) {
    $where   .= " AND l.created_at <= ?";
    $params[] = $date_fin . " 23:59:59";
}

if ($id_user) {
    $where   .= " AND l.id_utilisateur = ?";
    $params[] = (int)$id_user;
}

$stmt = $db->prepare("
    SELECT
        l.id,
        l.action,
        l.details_json,
        l.ip,
        l.created_at,
        u.email AS utilisateur_email,
        u.role  AS utilisateur_role
    FROM logs_activite l
    LEFT JOIN utilisateurs u ON l.id_utilisateur = u.id
    $where
    ORDER BY l.created_at DESC
    LIMIT $limite
");

$stmt->execute($params);
$logs = $stmt->fetchAll();

// Parser le JSON des détails
foreach ($logs as &$log) {
    $log['details'] = json_decode($log['details_json'] ?? '{}', true);
    unset($log['details_json']);
}

// Stats rapides
$stmtStats = $db->prepare("
    SELECT action, COUNT(*) AS nb
    FROM logs_activite
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY action
    ORDER BY nb DESC
");
$stmtStats->execute();
$statsActions = $stmtStats->fetchAll();

echo json_encode([
    'logs'          => $logs,
    'total'         => count($logs),
    'stats_actions' => $statsActions
]);