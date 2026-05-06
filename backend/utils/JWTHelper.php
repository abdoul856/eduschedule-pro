<?php
// backend/utils/JWTHelper.php

class JWTHelper {
    private static string $secret;
    private static int    $expiration = 3600 * 8; // 8 heures

    private static function getSecret(): string {
        if (!isset(self::$secret)) {
            self::$secret = $_ENV['JWT_SECRET'] ?? 'CHANGE_MOI_EN_PRODUCTION';
        }
        return self::$secret;
    }

    // Encode en base64 URL-safe
    private static function base64url_encode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Décode depuis base64 URL-safe
    private static function base64url_decode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    /**
     * Génère un JWT
     * @param array $payload  Ex: ['id' => 1, 'role' => 'admin', 'email' => '...']
     */
    public static function generate(array $payload): string {
        $header = self::base64url_encode(json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT'
        ]));

        $payload['iat'] = time();
        $payload['exp'] = time() + self::$expiration;

        $body = self::base64url_encode(json_encode($payload));

        $signature = self::base64url_encode(
            hash_hmac('sha256', "$header.$body", self::getSecret(), true)
        );

        return "$header.$body.$signature";
    }

    /**
     * Vérifie et décode un JWT
     * @return array|null  Payload décodé, ou null si invalide/expiré
     */
    public static function verify(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $body, $signature] = $parts;

        // Vérifier la signature
        $expectedSig = self::base64url_encode(
            hash_hmac('sha256', "$header.$body", self::getSecret(), true)
        );
        if (!hash_equals($expectedSig, $signature)) return null;

        // Décoder le payload
        $payload = json_decode(self::base64url_decode($body), true);
        if (!$payload) return null;

        // Vérifier l'expiration
        if (isset($payload['exp']) && $payload['exp'] < time()) return null;

        return $payload;
    }

    /**
     * Extrait le token du header Authorization: Bearer {token}
     */
    public static function fromHeader(): ?string {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (str_starts_with($auth, 'Bearer ')) {
            return substr($auth, 7);
        }
        return null;
    }
}
