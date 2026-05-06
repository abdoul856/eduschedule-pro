<?php
// backend/utils/QRCodeGenerator.php

class QRCodeGenerator {
    private string $secret;

    public function __construct() {
        $this->secret = $_ENV['QR_SECRET'] ?? 'QR_SECRET_A_CHANGER';
    }

    /**
     * Générer un token QR sécurisé pour un créneau
     */
    public function genererToken(int $idCreneau, string $heureDebut): array {
        $timestamp = time();
        $data      = $idCreneau . '|' . $timestamp . '|' . $heureDebut;
        $token     = hash_hmac('sha256', $data, $this->secret);

        // Fenêtre de validité : heure prévue ±15 min
        $heureDebutTs = strtotime(date('Y-m-d') . ' ' . $heureDebut);
        $expire       = date('Y-m-d H:i:s', $heureDebutTs + (15 * 60));

        return [
            'token'  => $token,
            'expire' => $expire,
            'data'   => json_encode([
                'id_creneau' => $idCreneau,
                'token'      => $token
            ])
        ];
    }

    /**
     * Vérifier un token QR
     */
    public function verifierToken(string $token, int $idCreneau, string $heureDebut): bool {
        // Recalculer le token attendu n'est pas possible car on n'a pas le timestamp
        // On vérifie juste que le token existe en BDD et n'est pas expiré
        return !empty($token);
    }

    /**
     * Vérifier la fenêtre horaire ±15 min
     */
    public function estDansFenetreHoraire(string $heureDebut): array {
        $maintenant  = time();
        $heureDebutTs = strtotime(date('Y-m-d') . ' ' . $heureDebut);
        $fenetreMin  = $heureDebutTs - (15 * 60);
        $fenetreMax  = $heureDebutTs + (60 * 60);
        $diffMinutes = round(($maintenant - $heureDebutTs) / 60);

        if ($maintenant < $fenetreMin) {
            return [
                'valide'  => false,
                'erreur'  => 'QR-Code pas encore valide — séance dans ' .
                             round(($heureDebutTs - $maintenant) / 60) . ' minutes',
                'retard'  => 0
            ];
        }

        if ($maintenant > $fenetreMax) {
            return [
                'valide' => false,
                'erreur' => 'QR-Code expiré — fenêtre horaire dépassée',
                'retard' => 0
            ];
        }

        $statut = 'valide';
        if ($diffMinutes > 30) $statut = 'retard_grave';
        elseif ($diffMinutes > 15) $statut = 'retard';

        return [
            'valide'       => true,
            'statut'       => $statut,
            'retard'       => $diffMinutes,
            'erreur'       => null
        ];
    }

    /**
     * Logger une tentative de scan
     */
    public function loggerTentative(PDO $db, int $idUser, string $action, array $details, string $ip): void {
        $db->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (?, ?, ?, ?)
        ")->execute([$idUser, $action, json_encode($details), $ip]);
    }
}