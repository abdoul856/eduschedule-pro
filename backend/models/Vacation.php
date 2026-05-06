<?php
// backend/models/Vacation.php

class Vacation {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    // Récupérer les fiches de vacation
    public function getAll(array $filtres = []): array {
        $where  = "WHERE 1=1";
        $params = [];

        if (!empty($filtres['id_enseignant'])) {
            $where .= " AND v.id_enseignant = ?";
            $params[] = $filtres['id_enseignant'];
        }
        if (!empty($filtres['mois'])) {
            $where .= " AND v.mois = ?";
            $params[] = $filtres['mois'];
        }
        if (!empty($filtres['annee'])) {
            $where .= " AND v.annee = ?";
            $params[] = $filtres['annee'];
        }

        $stmt = $this->db->prepare("
            SELECT v.*, CONCAT(e.prenom,' ',e.nom) AS enseignant_nom,
                   e.taux_horaire
            FROM vacations v
            JOIN enseignants e ON v.id_enseignant = e.id
            $where
            ORDER BY v.annee DESC, v.mois DESC
        ");
        $stmt->execute($params);
        $vacations = $stmt->fetchAll();

        foreach ($vacations as &$v) {
            $v['lignes']  = $this->getLignes($v['id']);
            $v['alertes'] = $this->verifierCoherence($v['id']);
        }

        return $vacations;
    }

    // Récupérer les lignes d'une vacation
    public function getLignes(int $idVacation): array {
        $stmt = $this->db->prepare("
            SELECT vl.*, m.libelle AS matiere,
                   et.semaine_debut AS date,
                   c.heure_debut, c.heure_fin,
                   ct.statut AS statut_cahier,
                   p.id AS pointage_id
            FROM vacation_lignes vl
            JOIN creneaux c      ON vl.id_creneau = c.id
            JOIN matieres m      ON c.id_matiere = m.id
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
            LEFT JOIN pointages p      ON p.id_creneau = c.id
            WHERE vl.id_vacation = ?
        ");
        $stmt->execute([$idVacation]);
        return $stmt->fetchAll();
    }

    // Vérifier la cohérence d'une fiche
    public function verifierCoherence(int $idVacation): array {
        $lignes  = $this->getLignes($idVacation);
        $alertes = [];

        foreach ($lignes as $l) {
            if (!$l['pointage_id']) {
                $alertes[] = "⚠️ Séance {$l['matiere']} sans pointage QR";
            }
            if ($l['statut_cahier'] !== 'cloture') {
                $alertes[] = "⚠️ Cahier de {$l['matiere']} non clôturé";
            }
            $dureeReelle = floatval($l['duree_heures']);
            $dureePrevu  = (strtotime($l['heure_fin']) - strtotime($l['heure_debut'])) / 3600;
            if ($dureeReelle > $dureePrevu + 0.5) {
                $alertes[] = "⚠️ Durée {$l['matiere']} dépasse de 30 min la durée planifiée";
            }
        }

        return $alertes;
    }

    // Générer une fiche de vacation
    public function generer(int $idEns, int $mois, int $annee): int {
        // Vérifier si une fiche existe déjà
        $stmt = $this->db->prepare("
            SELECT id FROM vacations WHERE id_enseignant = ? AND mois = ? AND annee = ?
        ");
        $stmt->execute([$idEns, $mois, $annee]);
        if ($stmt->fetch()) {
            throw new Exception("Une fiche existe déjà pour ce mois");
        }

        // Récupérer les séances
        $stmt2 = $this->db->prepare("
            SELECT c.id, c.heure_debut, c.heure_fin, e.taux_horaire,
                   ct.heure_fin_reelle
            FROM creneaux c
            JOIN emploi_temps et ON c.id_emploi_temps = et.id
            JOIN enseignants e   ON c.id_enseignant = e.id
            LEFT JOIN cahiers_texte ct ON ct.id_creneau = c.id
            WHERE c.id_enseignant = ?
              AND MONTH(et.semaine_debut) = ?
              AND YEAR(et.semaine_debut)  = ?
        ");
        $stmt2->execute([$idEns, $mois, $annee]);
        $seances = $stmt2->fetchAll();

        $montantBrut = 0;
        $lignes      = [];

        foreach ($seances as $s) {
            $debut   = strtotime($s['heure_debut']);
            $fin     = strtotime($s['heure_fin_reelle'] ?? $s['heure_fin']);
            $duree   = round(($fin - $debut) / 3600, 2);
            $montant = $duree * $s['taux_horaire'];
            $montantBrut += $montant;
            $lignes[] = [
                'id_creneau' => $s['id'],
                'duree'      => $duree,
                'taux'       => $s['taux_horaire'],
                'montant'    => $montant
            ];
        }

        // Créer la fiche
        $stmt3 = $this->db->prepare("
            INSERT INTO vacations (id_enseignant, mois, annee, montant_brut, montant_net, statut)
            VALUES (?, ?, ?, ?, ?, 'generee')
        ");
        $stmt3->execute([$idEns, $mois, $annee, $montantBrut, $montantBrut]);
        $idVacation = (int)$this->db->lastInsertId();

        // Insérer les lignes
        foreach ($lignes as $l) {
            $this->db->prepare("
                INSERT INTO vacation_lignes (id_vacation, id_creneau, duree_heures, taux_horaire, montant)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([$idVacation, $l['id_creneau'], $l['duree'], $l['taux'], $l['montant']]);
        }

        return $idVacation;
    }

    // Valider une fiche
    public function valider(int $id, string $action, int $idValidateur, string $role, string $commentaire = ''): string {
        $nouveauStatut = match($action) {
            'valider'   => 'visee_surveillant',
            'approuver' => 'approuvee',
            'payer'     => 'payee',
            default     => throw new Exception("Action invalide")
        };

        $this->db->prepare("UPDATE vacations SET statut = ? WHERE id = ?")
                 ->execute([$nouveauStatut, $id]);

        $this->db->prepare("
            INSERT INTO validations (id_vacation, id_validateur, role_validateur, commentaire)
            VALUES (?, ?, ?, ?)
        ")->execute([$id, $idValidateur, $role, $commentaire]);

        return $nouveauStatut;
    }
}