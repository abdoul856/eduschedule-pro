<?php
// backend/models/CahierTexte.php

class CahierTexte {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Récupérer tous les cahiers avec détails
    public function getAll(): array {
        $stmt = $this->db->prepare("
            SELECT c.id AS id_creneau, c.jour, c.heure_debut, c.heure_fin,
                   m.libelle AS matiere, s.code AS salle_code,
                   CONCAT(e.prenom,' ',e.nom) AS enseignant,
                   cl.libelle AS classe,
                   ct.id AS cahier_id, ct.statut AS statut_cahier,
                   ct.titre_cours, ct.contenu_json,
                   ct.niveau_avancement, ct.observations,
                   ct.heure_fin_reelle,
                   p.heure_pointage_reelle AS heure_debut_reelle
            FROM creneaux c
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN matieres m      ON c.id_matiere = m.id
            JOIN enseignants e   ON c.id_enseignant = e.id
            JOIN salles s        ON c.id_salle = s.id
            JOIN classes cl      ON et.id_classe = cl.id
            LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
            LEFT JOIN pointages p      ON p.id_creneau = c.id
            ORDER BY FIELD(c.jour,'Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'),
                     c.heure_debut
            LIMIT 50
        ");
        $stmt->execute();
        return $stmt->fetchAll();
    }

    // Récupérer un cahier par ID
    public function getById(int $id): ?array {
        $stmt = $this->db->prepare("
            SELECT ct.*, c.jour, c.heure_debut, c.heure_fin,
                   m.libelle AS matiere,
                   CONCAT(e.prenom,' ',e.nom) AS enseignant,
                   cl.libelle AS classe
            FROM cahiers_texte ct
            JOIN creneaux c      ON ct.id_creneau = c.id
            JOIN matieres m      ON c.id_matiere = m.id
            JOIN enseignants e   ON c.id_enseignant = e.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN classes cl      ON et.id_classe = cl.id
            WHERE ct.id = ?
        ");
        $stmt->execute([$id]);
        return $stmt->fetch() ?: null;
    }

    // Créer un cahier de texte
    public function creer(array $data, int $idDelegue): int {
        // Vérifier si un cahier existe déjà
        $stmt = $this->db->prepare("SELECT id FROM cahiers_texte WHERE id_creneau = ?");
        $stmt->execute([$data['id_creneau']]);
        if ($stmt->fetch()) {
            throw new Exception("Un cahier existe déjà pour cette séance");
        }

        $stmt2 = $this->db->prepare("
            INSERT INTO cahiers_texte
                (id_creneau, id_delegue, titre_cours, contenu_json,
                 niveau_avancement, observations, statut)
            VALUES (?, ?, ?, ?, ?, ?, 'signe_delegue')
        ");
        $stmt2->execute([
            $data['id_creneau'],
            $idDelegue,
            $data['titre_cours']       ?? '',
            json_encode($data['contenu_json'] ?? []),
            $data['niveau_avancement'] ?? '',
            $data['observations']      ?? ''
        ]);
        return (int)$this->db->lastInsertId();
    }

    // Clôturer un cahier
    public function cloturer(int $id, string $heureFin): bool {
        $stmt = $this->db->prepare("
            UPDATE cahiers_texte
            SET heure_fin_reelle = ?, statut = 'cloture'
            WHERE id = ? AND statut != 'cloture'
        ");
        return $stmt->execute([$heureFin, $id]);
    }

    // Sauvegarder une signature
    public function sauvegarderSignature(int $idCahier, string $type, int $idUser, string $signature): void {
        $stmt = $this->db->prepare("
            INSERT INTO signatures (id_cahier, type_signataire, id_utilisateur, signature_base64)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$idCahier, $type, $idUser, $signature]);
    }

    // Sauvegarder les travaux demandés
    public function sauvegarderTravaux(int $idCahier, array $travaux): void {
        foreach ($travaux as $t) {
            $stmt = $this->db->prepare("
                INSERT INTO travaux_demandes (id_cahier, description, date_limite, type)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([
                $idCahier,
                $t['description'],
                !empty($t['date_limite']) ? $t['date_limite'] : null,
                $t['type'] ?? 'exercice'
            ]);
        }
    }

    // Vérifier si un cahier est clôturé
    public function estCloture(int $idCreneau): bool {
        $stmt = $this->db->prepare("
            SELECT statut FROM cahiers_texte WHERE id_creneau = ? LIMIT 1
        ");
        $stmt->execute([$idCreneau]);
        $cahier = $stmt->fetch();
        return $cahier && $cahier['statut'] === 'cloture';
    }
}