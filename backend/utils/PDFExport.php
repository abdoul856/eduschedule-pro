<?php
// backend/utils/PDFExport.php
// Génération de PDFs avec mPDF ou FPDF
// Pour utiliser ce fichier, installer mPDF via composer :
// composer require mpdf/mpdf

class PDFExport {
    
    /**
     * Générer le HTML d'une fiche de vacation
     */
    public static function ficheVacationHTML(array $vacation, array $lignes): string {
        $MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
                 "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
        
        $moisLabel = $MOIS[$vacation['mois'] - 1] ?? '';
        $dateGen   = date('d/m/Y');
        
        $rowsHTML = '';
        $totalH   = 0;
        $totalM   = 0;

        foreach ($lignes as $l) {
            $duree   = round(floatval($l['duree_heures']), 2);
            $taux    = number_format(floatval($l['taux_horaire']), 0, ',', ' ');
            $montant = number_format(floatval($l['montant']), 0, ',', ' ');
            $totalH += $duree;
            $totalM += floatval($l['montant']);

            $rowsHTML .= "
            <tr>
                <td>{$l['matiere']}</td>
                <td>{$l['date']}</td>
                <td>{$duree}h</td>
                <td>{$taux} FCFA</td>
                <td>{$montant} FCFA</td>
            </tr>";
        }

        $totalHFmt = round($totalH, 2);
        $brutFmt   = number_format(floatval($vacation['montant_brut']), 0, ',', ' ');
        $netFmt    = number_format(floatval($vacation['montant_net']), 0, ',', ' ');

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
                .header { background: #0d6efd; color: white; padding: 15px; text-align: center; border-radius: 8px; }
                .header h1 { margin: 0; font-size: 20px; }
                .header p  { margin: 5px 0 0; font-size: 12px; opacity: 0.9; }
                .section   { margin: 15px 0; padding: 10px; border: 1px solid #dee2e6; border-radius: 6px; }
                .section h3 { margin: 0 0 10px; color: #0d6efd; font-size: 14px; }
                table  { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th     { background: #0d6efd; color: white; padding: 8px; text-align: left; }
                td     { padding: 7px 8px; border-bottom: 1px solid #dee2e6; }
                tr:nth-child(even) { background: #f8f9fa; }
                .tfoot td { background: #e9ecef; font-weight: bold; }
                .montants { text-align: right; margin: 10px 0; }
                .montant-net { font-size: 16px; color: #0d6efd; font-weight: bold; }
                .signatures { margin-top: 30px; }
                .sig-box { display: inline-block; width: 30%; margin: 0 1%; text-align: center; vertical-align: top; }
                .sig-zone { border: 1px solid #333; height: 60px; margin: 10px 0; }
                .footer { text-align: center; font-size: 10px; color: #666; margin-top: 20px; border-top: 1px solid #dee2e6; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>🎓 EduSchedule Pro</h1>
                <p>ISGE-BF — Institut Supérieur de Génie Électrique du Burkina Faso</p>
            </div>

            <h2 style='text-align:center;margin:15px 0'>FICHE DE VACATION MENSUELLE</h2>

            <div class='section'>
                <h3>Informations Enseignant</h3>
                <table>
                    <tr>
                        <td><strong>Enseignant :</strong> {$vacation['enseignant_nom']}</td>
                        <td><strong>Période :</strong> {$moisLabel} {$vacation['annee']}</td>
                    </tr>
                    <tr>
                        <td><strong>Statut :</strong> {$vacation['statut']}</td>
                        <td><strong>Généré le :</strong> {$dateGen}</td>
                    </tr>
                </table>
            </div>

            <div class='section'>
                <h3>Détail des Séances Réalisées</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Matière</th>
                            <th>Semaine</th>
                            <th>Durée</th>
                            <th>Taux horaire</th>
                            <th>Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        {$rowsHTML}
                    </tbody>
                    <tfoot>
                        <tr class='tfoot'>
                            <td colspan='2'><strong>TOTAL</strong></td>
                            <td><strong>{$totalHFmt}h</strong></td>
                            <td></td>
                            <td><strong>{$brutFmt} FCFA</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div class='section montants'>
                <p>Montant brut : <strong>{$brutFmt} FCFA</strong></p>
                <p>Retenues : <strong>" . number_format(floatval($vacation['retenues'] ?? 0), 0, ',', ' ') . " FCFA</strong></p>
                <p class='montant-net'>Montant net à payer : {$netFmt} FCFA</p>
            </div>

            <div class='signatures'>
                <h3>Signatures et Validations</h3>
                <div class='sig-box'>
                    <strong>Signature Enseignant</strong>
                    <div class='sig-zone'></div>
                    <p>Date : ___________</p>
                </div>
                <div class='sig-box'>
                    <strong>Visa Surveillant</strong>
                    <div class='sig-zone'></div>
                    <p>Date : ___________</p>
                </div>
                <div class='sig-box'>
                    <strong>Validation Comptable</strong>
                    <div class='sig-zone'></div>
                    <p>Date : ___________</p>
                </div>
            </div>

            <div class='footer'>
                <p>EduSchedule Pro — ISGE-BF — Document généré automatiquement le {$dateGen}</p>
                <p>Ce document constitue la pièce justificative comptable pour le paiement de l'enseignant vacataire.</p>
            </div>
        </body>
        </html>";
    }

    /**
     * Générer le HTML d'un cahier de texte
     */
    public static function cahierTexteHTML(array $cahier): string {
        $contenu = json_decode($cahier['contenu_json'] ?? '{}', true);
        $points  = $contenu['points'] ?? [];
        $pointsHTML = '';
        foreach ($points as $p) {
            $pointsHTML .= "<li>{$p}</li>";
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; }
                .header { background: #0d6efd; color: white; padding: 15px; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th { background: #0d6efd; color: white; padding: 8px; }
                td { padding: 7px; border: 1px solid #dee2e6; }
                .footer { text-align: center; font-size: 10px; color: #666; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h2>EduSchedule Pro — Cahier de Texte</h2>
                <p>ISGE-BF</p>
            </div>

            <table>
                <tr><td><strong>Matière</strong></td><td>{$cahier['matiere']}</td>
                    <td><strong>Classe</strong></td><td>{$cahier['classe']}</td></tr>
                <tr><td><strong>Enseignant</strong></td><td>{$cahier['enseignant']}</td>
                    <td><strong>Jour</strong></td><td>{$cahier['jour']}</td></tr>
                <tr><td><strong>Heure début</strong></td><td>{$cahier['heure_debut']}</td>
                    <td><strong>Heure fin</strong></td><td>{$cahier['heure_fin_reelle'] ?? $cahier['heure_fin']}</td></tr>
            </table>

            <h3>Titre du cours</h3>
            <p>{$cahier['titre_cours']}</p>

            <h3>Points vus dans le cours</h3>
            <ul>{$pointsHTML}</ul>

            <h3>Niveau d'avancement</h3>
            <p>{$cahier['niveau_avancement']}</p>

            <h3>Observations</h3>
            <p>{$cahier['observations'] ?? '—'}</p>

            <div class='footer'>
                <p>EduSchedule Pro — ISGE-BF — Généré le " . date('d/m/Y') . "</p>
            </div>
        </body>
        </html>";
    }
}