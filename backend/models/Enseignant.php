<?php
// backend/models/Enseignant.php

class Enseignant {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Récupérer tous les enseignants actifs
    public function getAll(array $filtres = []): array {
        $where  = "WHERE actif = 1";
        $params = [];

        if (!empty($filtres['statut'])) {
            $where .= " AND statut = ?";
            $params[] = $filtres['statut'];
        }

        if (!empty($filtres['specialite'])) {
            $where .= " AND specialite LIKE ?";
            $params[] = "%" . $filtres['specialite'] . "%";
        }

        $stmt = $this->db->prepare("
            SELECT * FROM enseignants $where ORDER BY nom, prenom
        ");
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // Récupérer un enseignant par ID
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM enseignants WHERE id = ? AND actif = 1");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    // Créer un enseignant
    public function creer(array $data): int {
        $stmt = $this->db->prepare("
            INSERT INTO enseignants (matricule, nom, prenom, email, specialite, statut, taux_horaire)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $data['matricule'],
            $data['nom'],
            $data['prenom'],
            $data['email'],
            $data['specialite'] ?? '',
            $data['statut']     ?? 'vacataire',
            $data['taux_horaire'] ?? 0
        ]);
        return (int)$this->db->lastInsertId();
    }

    // Mettre à jour un enseignant
    public function modifier(int $id, array $data): bool {
        $stmt = $this->db->prepare("
            UPDATE enseignants
            SET nom = ?, prenom = ?, email = ?, specialite = ?,
                statut = ?, taux_horaire = ?
            WHERE id = ?
        ");
        return $stmt->execute([
            $data['nom'],
            $data['prenom'],
            $data['email'],
            $data['specialite'] ?? '',
            $data['statut']     ?? 'vacataire',
            $data['taux_horaire'] ?? 0,
            $id
        ]);
    }

    // Supprimer (désactiver) un enseignant
    public function supprimer(int $id): bool {
        $stmt = $this->db->prepare("UPDATE enseignants SET actif = 0 WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // Calculer les heures réalisées par un enseignant
    public function getHeuresRealisees(int $id, int $mois, int $annee): float {
        $stmt = $this->db->prepare("
            SELECT SUM(
                TIMESTAMPDIFF(MINUTE, c.heure_debut, COALESCE(ct.heure_fin_reelle, c.heure_fin)) / 60
            ) AS total_heures
            FROM creneaux c
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
            WHERE c.id_enseignant = ?
              AND MONTH(et.semaine_debut) = ?
              AND YEAR(et.semaine_debut)  = ?
              AND ct.statut = 'cloture'
        ");
        $stmt->execute([$id, $mois, $annee]);
        return (float)($stmt->fetchColumn() ?? 0);
    }
}