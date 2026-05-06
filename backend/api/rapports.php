<?php
require_once '../config.php';
require_once '../auth.php';

$utilisateur = verifierToken();
if (!$utilisateur || !in_array($utilisateur['role'], ['comptable','admin'])) {
    http_response_code(403);
    echo json_encode(['erreur' => 'Accès refusé']);
    exit;
}

$methode = $_SERVER['REQUEST_METHOD'];
$type    = $_GET['type'] ?? 'mensuel';   // mensuel | annuel | recap
$mois    = (int)($_GET['mois']  ?? date('n'));
$annee   = (int)($_GET['annee'] ?? date('Y'));

if ($methode === 'GET') {

    $MOIS_FR = ['','Janvier','Fevrier','Mars','Avril','Mai','Juin',
                'Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];

    // ── Rapport mensuel ──
    if ($type === 'mensuel') {
        $sql = "
            SELECT 
                v.id, v.mois, v.annee, v.statut,
                v.montant_brut, v.retenues, v.montant_net,
                CONCAT(e.prenom,' ',e.nom) AS enseignant_nom,
                e.matricule, e.statut AS statut_enseignant,
                COUNT(vl.id) AS nb_lignes,
                SUM(vl.duree_heures) AS total_heures
            FROM vacations v
            JOIN enseignants e     ON v.id_enseignant = e.id
            LEFT JOIN vacation_lignes vl ON vl.id_vacation = v.id
            WHERE v.mois = ? AND v.annee = ?
            GROUP BY v.id
            ORDER BY e.nom ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$mois, $annee]);
        $vacations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Stats globales
        $stats = [
            'mois'          => $mois,
            'annee'         => $annee,
            'mois_label'    => $MOIS_FR[$mois],
            'total'         => count($vacations),
            'generees'      => 0, 'visees' => 0,
            'approuvees'    => 0, 'payees' => 0,
            'montant_brut'  => 0, 'retenues' => 0,
            'montant_net'   => 0, 'total_heures' => 0,
        ];
        foreach ($vacations as $v) {
            $stats[$v['statut'] === 'visee_surveillant' ? 'visees' : $v['statut'] . 's']
                = ($stats[$v['statut'] === 'visee_surveillant' ? 'visees' : $v['statut'] . 's'] ?? 0) + 1;
            $stats['montant_brut']  += floatval($v['montant_brut']);
            $stats['retenues']      += floatval($v['retenues']);
            $stats['montant_net']   += floatval($v['montant_net']);
            $stats['total_heures']  += floatval($v['total_heures']);
        }

        // Enregistrer le rapport
        $pdo->prepare("
            INSERT INTO rapports_comptable 
                (id_comptable, type_rapport, mois, annee, nb_fiches, montant_total)
            VALUES (?, 'mensuel', ?, ?, ?, ?)
        ")->execute([
            $utilisateur['id'], $mois, $annee,
            $stats['total'], $stats['montant_net']
        ]);

        echo json_encode([
            'type'      => 'mensuel',
            'stats'     => $stats,
            'vacations' => $vacations,
        ]);
        exit;
    }

    // ── Rapport annuel ──
    if ($type === 'annuel') {
        $sql = "
            SELECT 
                v.mois,
                COUNT(v.id)               AS nb_fiches,
                SUM(v.statut='payee')     AS nb_payees,
                SUM(v.montant_brut)       AS montant_brut,
                SUM(v.retenues)           AS retenues,
                SUM(v.montant_net)        AS montant_net,
                SUM(vl.duree_heures)      AS total_heures
            FROM vacations v
            LEFT JOIN vacation_lignes vl ON vl.id_vacation = v.id
            WHERE v.annee = ?
            GROUP BY v.mois
            ORDER BY v.mois ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$annee]);
        $parMois = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Enrichir avec labels
        foreach ($parMois as &$m) {
            $m['mois_label'] = $MOIS_FR[(int)$m['mois']];
        }

        // Totaux annuels
        $totaux = [
            'annee'        => $annee,
            'nb_fiches'    => array_sum(array_column($parMois, 'nb_fiches')),
            'nb_payees'    => array_sum(array_column($parMois, 'nb_payees')),
            'montant_brut' => array_sum(array_column($parMois, 'montant_brut')),
            'retenues'     => array_sum(array_column($parMois, 'retenues')),
            'montant_net'  => array_sum(array_column($parMois, 'montant_net')),
            'total_heures' => array_sum(array_column($parMois, 'total_heures')),
        ];

        // Enregistrer le rapport
        $pdo->prepare("
            INSERT INTO rapports_comptable 
                (id_comptable, type_rapport, annee, nb_fiches, montant_total)
            VALUES (?, 'annuel', ?, ?, ?)
        ")->execute([
            $utilisateur['id'], $annee,
            $totaux['nb_fiches'], $totaux['montant_net']
        ]);

        echo json_encode([
            'type'    => 'annuel',
            'totaux'  => $totaux,
            'parMois' => $parMois,
        ]);
        exit;
    }

    // ── Récapitulatif par enseignant ──
    if ($type === 'recap') {
        $sql = "
            SELECT 
                e.id, e.matricule,
                CONCAT(e.prenom,' ',e.nom) AS enseignant_nom,
                e.statut AS statut_enseignant,
                e.taux_horaire,
                COUNT(v.id)              AS nb_fiches,
                SUM(v.statut='payee')    AS nb_payees,
                SUM(v.montant_brut)      AS montant_brut,
                SUM(v.retenues)          AS retenues,
                SUM(v.montant_net)       AS montant_net,
                SUM(vl.duree_heures)     AS total_heures
            FROM enseignants e
            LEFT JOIN vacations v            ON v.id_enseignant = e.id AND v.annee = ?
            LEFT JOIN vacation_lignes vl     ON vl.id_vacation  = v.id
            WHERE e.actif = 1
            GROUP BY e.id
            ORDER BY e.nom ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$annee]);
        $enseignants = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'type'        => 'recap',
            'annee'       => $annee,
            'enseignants' => $enseignants,
        ]);
        exit;
    }

    http_response_code(400);
    echo json_encode(['erreur' => 'Type de rapport inconnu']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Méthode non autorisée']);