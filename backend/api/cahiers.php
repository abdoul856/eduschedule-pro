<?php
require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';

$db     = (new Database())->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id']     ?? null;
$action = $_GET['action'] ?? null;

// ══════════════════════════════════════════════
// GET
// ══════════════════════════════════════════════
if ($method === 'GET') {
    $payload = requireAuth();

    // GET /api/cahiers/{id} — Détail complet
    if ($id && !$action) {
        $stmt = $db->prepare("
            SELECT
                ct.id, ct.id_creneau, ct.id_delegue,
                ct.titre_cours, ct.contenu_json,
                ct.niveau_avancement, ct.observations,
                ct.heure_fin_reelle, ct.statut,
                ct.created_at, ct.updated_at,
                c.jour, c.heure_debut, c.heure_fin,
                c.type_seance, c.id_enseignant,
                m.libelle  AS matiere,
                m.code     AS matiere_code,
                CONCAT(e.prenom,' ',e.nom) AS enseignant,
                s.code     AS salle_code,
                cl.libelle AS classe,
                et.semaine_debut AS date_semaine,
                p.heure_pointage_reelle AS heure_debut_reelle,
                p.statut AS statut_pointage
            FROM cahiers_texte ct
            JOIN creneaux c         ON ct.id_creneau      = c.id
            JOIN matieres m         ON c.id_matiere        = m.id
            JOIN enseignants e      ON c.id_enseignant     = e.id
            JOIN salles s           ON c.id_salle          = s.id
            JOIN emploi_temps et    ON c.id_emploi_temps   = et.id
            JOIN classes cl         ON et.id_classe        = cl.id
            LEFT JOIN pointages p   ON p.id_creneau        = c.id
                                   AND p.id_enseignant     = c.id_enseignant
                                   AND p.statut            = 'valide'
            WHERE ct.id = ?
        ");
        $stmt->execute([$id]);
        $cahier = $stmt->fetch();

        if (!$cahier) {
            http_response_code(404);
            echo json_encode(['erreur' => 'Cahier introuvable']);
            exit;
        }

        // Parser contenu JSON
        $cahier['contenu'] = json_decode($cahier['contenu_json'] ?? '{}', true);
        unset($cahier['contenu_json']);

        // Récupérer signatures
        $stmtSig = $db->prepare("
            SELECT type_signataire, id_utilisateur, signature_base64,
                   created_at AS date_signature
            FROM signatures
            WHERE id_cahier = ?
            ORDER BY created_at ASC
        ");
        $stmtSig->execute([$id]);
        $cahier['signatures'] = $stmtSig->fetchAll();

        // Récupérer travaux
        $stmtTrav = $db->prepare("
            SELECT id, description, date_limite, type, created_at
            FROM travaux_demandes
            WHERE id_cahier = ?
            ORDER BY created_at ASC
        ");
        $stmtTrav->execute([$id]);
        $cahier['travaux'] = $stmtTrav->fetchAll();

        echo json_encode($cahier);
        exit;
    }

    // GET /api/cahiers — Liste
    $idCreneau = $_GET['id_creneau'] ?? null;
    $idClasse  = $_GET['id_classe']  ?? null;
    $mois      = $_GET['mois']       ?? null;
    $annee     = $_GET['annee']      ?? null;
    $statut    = $_GET['statut']     ?? null;

    $where  = "WHERE 1=1";
    $params = [];

    if ($idCreneau) { $where .= " AND ct.id_creneau = ?"; $params[] = $idCreneau; }
    if ($statut)    { $where .= " AND ct.statut = ?";     $params[] = $statut; }

    if ($idClasse) {
        $where   .= " AND et.id_classe = ?";
        $params[] = $idClasse;
    }
    if ($mois) {
        $where   .= " AND MONTH(et.semaine_debut) = ?";
        $params[] = (int)$mois;
    }
    if ($annee) {
        $where   .= " AND YEAR(et.semaine_debut) = ?";
        $params[] = (int)$annee;
    }

    // Restriction par rôle
    if ($payload['role'] === 'enseignant') {
        $where   .= " AND c.id_enseignant = ?";
        $params[] = (int)$payload['id_lien'];
    } elseif ($payload['role'] === 'delegue') {
        $where   .= " AND et.id_classe = (
            SELECT id_classe FROM utilisateurs WHERE id = ? LIMIT 1
        )";
        $params[] = (int)$payload['id'];
    }

    $stmt = $db->prepare("
        SELECT
            ct.id AS cahier_id,
            ct.id_creneau,
            ct.titre_cours,
            ct.niveau_avancement,
            ct.statut AS statut_cahier,
            ct.heure_fin_reelle,
            c.id AS id_creneau_ref,
            c.jour,
            c.heure_debut,
            c.heure_fin,
            c.type_seance,
            c.id_enseignant,
            m.libelle  AS matiere,
            CONCAT(e.prenom,' ',e.nom) AS enseignant,
            s.code     AS salle_code,
            cl.libelle AS classe,
            et.semaine_debut AS date,
            p.heure_pointage_reelle AS heure_debut_reelle
        FROM cahiers_texte ct
        JOIN creneaux c         ON ct.id_creneau    = c.id
        JOIN matieres m         ON c.id_matiere      = m.id
        JOIN enseignants e      ON c.id_enseignant   = e.id
        JOIN salles s           ON c.id_salle        = s.id
        JOIN emploi_temps et    ON c.id_emploi_temps = et.id
        JOIN classes cl         ON et.id_classe      = cl.id
        LEFT JOIN pointages p   ON p.id_creneau      = c.id
                               AND p.id_enseignant   = c.id_enseignant
                               AND p.statut          = 'valide'
        $where
        ORDER BY et.semaine_debut DESC, c.heure_debut DESC
    ");
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
    exit;
}

// ══════════════════════════════════════════════
// POST
// ══════════════════════════════════════════════
if ($method === 'POST') {
    $payload = requireAuth();
    $body    = json_decode(file_get_contents('php://input'), true);

    // POST /api/cahiers/{id}/signer
    if ($id && $action === 'signer') {
        $signature = $body['signature_base64'] ?? null;
        $type      = $body['type']             ?? null;

        if (!$signature || !$type) {
            http_response_code(400);
            echo json_encode(['erreur' => 'signature_base64 et type requis']);
            exit;
        }

        // Vérifier que le cahier existe
        $stmt = $db->prepare("SELECT * FROM cahiers_texte WHERE id = ?");
        $stmt->execute([$id]);
        $cahier = $stmt->fetch();
        if (!$cahier) {
            http_response_code(404);
            echo json_encode(['erreur' => 'Cahier introuvable']);
            exit;
        }

        // Sauvegarder signature
        $db->prepare("
            INSERT INTO signatures
                (id_cahier, type_signataire, id_utilisateur, signature_base64)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                signature_base64 = VALUES(signature_base64),
                created_at       = NOW()
        ")->execute([$id, $type, $payload['id'], $signature]);

        // Mettre à jour statut
        if ($type === 'delegue') {
            $db->prepare("
                UPDATE cahiers_texte SET statut = 'signe_delegue' WHERE id = ? AND statut = 'brouillon'
            ")->execute([$id]);
        }

        // Logger
        $db->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (?, 'signature_cahier', ?, ?)
        ")->execute([
            $payload['id'],
            json_encode(['id_cahier' => $id, 'type' => $type]),
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);

        echo json_encode(['message' => 'Signature enregistrée']);
        exit;
    }

    // POST /api/cahiers/{id}/cloture
    if ($id && $action === 'cloture') {
        $heureFin  = $body['heure_fin']        ?? null;
        $signature = $body['signature_base64'] ?? null;

        if (!$heureFin) {
            http_response_code(400);
            echo json_encode(['erreur' => 'heure_fin requis']);
            exit;
        }

        // Vérifier cahier
        $stmt = $db->prepare("SELECT * FROM cahiers_texte WHERE id = ?");
        $stmt->execute([$id]);
        $cahier = $stmt->fetch();
        if (!$cahier) {
            http_response_code(404);
            echo json_encode(['erreur' => 'Cahier introuvable']);
            exit;
        }

        // Sauvegarder signature enseignant si fournie
        if ($signature) {
            $db->prepare("
                INSERT INTO signatures
                    (id_cahier, type_signataire, id_utilisateur, signature_base64)
                VALUES (?, 'enseignant', ?, ?)
                ON DUPLICATE KEY UPDATE
                    signature_base64 = VALUES(signature_base64),
                    created_at       = NOW()
            ")->execute([$id, $payload['id'], $signature]);
        }

        // Clôturer
        $db->prepare("
            UPDATE cahiers_texte
            SET statut         = 'cloture',
                heure_fin_reelle = ?,
                updated_at     = NOW()
            WHERE id = ?
        ")->execute([$heureFin, $id]);

        // Logger
        $db->prepare("
            INSERT INTO logs_activite (id_utilisateur, action, details_json, ip)
            VALUES (?, 'cloture_cahier', ?, ?)
        ")->execute([
            $payload['id'],
            json_encode(['id_cahier' => $id, 'heure_fin' => $heureFin]),
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);

        echo json_encode(['message' => 'Séance clôturée avec succès']);
        exit;
    }

    // POST /api/cahiers — Créer un cahier
    $idCreneau = $body['id_creneau'] ?? null;
    if (!$idCreneau) {
        http_response_code(400);
        echo json_encode(['erreur' => 'id_creneau requis']);
        exit;
    }

    // Vérifier si cahier existe déjà
    $stmt = $db->prepare("SELECT id FROM cahiers_texte WHERE id_creneau = ?");
    $stmt->execute([$idCreneau]);
    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['erreur' => 'Un cahier existe déjà pour ce créneau']);
        exit;
    }

    $stmt2 = $db->prepare("
        INSERT INTO cahiers_texte
            (id_creneau, id_delegue, titre_cours, contenu_json,
             niveau_avancement, observations, statut)
        VALUES (?, ?, ?, ?, ?, ?, 'brouillon')
    ");
    $stmt2->execute([
        $idCreneau,
        $payload['id'],
        $body['titre']             ?? '',
        json_encode($body['contenu_json'] ?? []),
        $body['niveau_avancement'] ?? '',
        $body['observations']      ?? ''
    ]);
    $idCahier = $db->lastInsertId();

    // Sauvegarder travaux
    if (!empty($body['travaux']) && is_array($body['travaux'])) {
        foreach ($body['travaux'] as $t) {
            $db->prepare("
                INSERT INTO travaux_demandes (id_cahier, description, date_limite, type)
                VALUES (?, ?, ?, ?)
            ")->execute([
                $idCahier,
                $t['description'] ?? '',
                !empty($t['date_limite']) ? $t['date_limite'] : null,
                $t['type'] ?? 'exercice'
            ]);
        }
    }

    http_response_code(201);
    echo json_encode(['id' => $idCahier, 'message' => 'Cahier créé avec succès']);
    exit;
}

// ══════════════════════════════════════════════
// PUT /api/cahiers/{id}
// ══════════════════════════════════════════════
if ($method === 'PUT') {
    $payload = requireAuth();
    $body    = json_decode(file_get_contents('php://input'), true);

    if (!$id) {
        http_response_code(400);
        echo json_encode(['erreur' => 'ID cahier requis']);
        exit;
    }

    // Vérifier statut — seulement brouillon modifiable
    $stmt = $db->prepare("SELECT * FROM cahiers_texte WHERE id = ?");
    $stmt->execute([$id]);
    $cahier = $stmt->fetch();

    if (!$cahier) {
        http_response_code(404);
        echo json_encode(['erreur' => 'Cahier introuvable']);
        exit;
    }

    if ($cahier['statut'] === 'cloture') {
        http_response_code(403);
        echo json_encode(['erreur' => 'Impossible de modifier un cahier clôturé']);
        exit;
    }

    // Mettre à jour
    $db->prepare("
        UPDATE cahiers_texte
        SET titre_cours       = ?,
            contenu_json      = ?,
            niveau_avancement = ?,
            observations      = ?,
            updated_at        = NOW()
        WHERE id = ?
    ")->execute([
        $body['titre']             ?? $cahier['titre_cours'],
        json_encode($body['contenu_json'] ?? []),
        $body['niveau_avancement'] ?? $cahier['niveau_avancement'],
        $body['observations']      ?? $cahier['observations'],
        $id
    ]);

    // Mettre à jour travaux
    if (!empty($body['travaux']) && is_array($body['travaux'])) {
        // Supprimer anciens travaux
        $db->prepare("DELETE FROM travaux_demandes WHERE id_cahier = ?")->execute([$id]);

        // Insérer nouveaux
        foreach ($body['travaux'] as $t) {
            $db->prepare("
                INSERT INTO travaux_demandes (id_cahier, description, date_limite, type)
                VALUES (?, ?, ?, ?)
            ")->execute([
                $id,
                $t['description'] ?? '',
                !empty($t['date_limite']) ? $t['date_limite'] : null,
                $t['type'] ?? 'exercice'
            ]);
        }
    }

    echo json_encode(['message' => 'Cahier mis à jour avec succès']);
    exit;
}

http_response_code(405);
echo json_encode(['erreur' => 'Méthode non autorisée']);