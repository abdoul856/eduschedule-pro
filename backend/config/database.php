<?php
class Database {
    private string $host;
    private string $db_name;
    private string $username;
    private string $password;
    private ?PDO $conn = null;

    public function __construct() {
        // Charger le .env
        foreach (file(__DIR__ . '/../../.env') as $ligne) {
            $ligne = trim($ligne);
            if ($ligne && !str_starts_with($ligne, '#')) {
                [$cle, $val] = explode('=', $ligne, 2);
                $_ENV[trim($cle)] = trim($val);
            }
        }
        $this->host     = $_ENV['DB_HOST']     ?? 'localhost';
        $this->db_name  = $_ENV['DB_NAME']     ?? 'eduschedule_pro';
        $this->username = $_ENV['DB_USER']     ?? 'root';
        $this->password = $_ENV['DB_PASSWORD'] ?? '';
    }

    public function getConnection(): PDO {
        if ($this->conn !== null) return $this->conn;
        try {
            $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset=utf8mb4";
            $this->conn = new PDO($dsn, $this->username, $this->password, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['erreur' => 'Connexion BDD échouée : ' . $e->getMessage()]);
            exit;
        }
        return $this->conn;
    }
}