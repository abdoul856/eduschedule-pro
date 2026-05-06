// src/utils/calcDuration.js

/**
 * Calculer la durée entre deux heures en heures décimales
 * @param {string} heureDebut — "07:30" ou "07:30:00"
 * @param {string} heureFin   — "10:00" ou "10:00:00"
 * @returns {number} — durée en heures (ex: 2.5)
 */
export function calculerDuree(heureDebut, heureFin) {
  if (!heureDebut || !heureFin) return 0;
  const [hD, mD] = heureDebut.split(":").map(Number);
  const [hF, mF] = heureFin.split(":").map(Number);
  const minutesDebut = hD * 60 + mD;
  const minutesFin   = hF * 60 + mF;
  return Math.max(0, (minutesFin - minutesDebut) / 60);
}

/**
 * Formater une durée en heures et minutes
 * @param {number} heures — durée en heures décimales
 * @returns {string} — "2h30" ou "1h00"
 */
export function formatDuree(heures) {
  if (!heures || heures < 0) return "0h00";
  const h = Math.floor(heures);
  const m = Math.round((heures - h) * 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Calculer le montant d'une séance
 * @param {number} dureeHeures  — durée en heures
 * @param {number} tauxHoraire  — taux en FCFA/heure
 * @returns {number} — montant en FCFA
 */
export function calculerMontant(dureeHeures, tauxHoraire) {
  return Math.round(dureeHeures * tauxHoraire);
}

/**
 * Calculer le retard en minutes
 * @param {string} heureDebut   — heure prévue "07:30"
 * @param {string} heurePointage — heure réelle "07:45"
 * @returns {number} — retard en minutes (négatif si en avance)
 */
export function calculerRetard(heureDebut, heurePointage) {
  if (!heureDebut || !heurePointage) return 0;
  const [hD, mD] = heureDebut.split(":").map(Number);
  const [hP, mP] = heurePointage.split(":").map(Number);
  return (hP * 60 + mP) - (hD * 60 + mD);
}

/**
 * Déterminer le statut d'un pointage
 * @param {number} retardMinutes — retard en minutes
 * @returns {object} — { statut, label, color }
 */
export function statutPointage(retardMinutes) {
  if (retardMinutes <= 0) return {
    statut: "valide",
    label:  "🟢 À l'heure",
    color:  "success"
  };
  if (retardMinutes <= 15) return {
    statut: "valide",
    label:  "🟢 À l'heure",
    color:  "success"
  };
  if (retardMinutes <= 30) return {
    statut: "retard",
    label:  "🟠 Retard",
    color:  "warning"
  };
  return {
    statut: "retard_grave",
    label:  "🔴 Retard grave",
    color:  "danger"
  };
}

/**
 * Calculer le total des heures d'un tableau de lignes
 * @param {array} lignes — [{duree_heures: 2.5}, ...]
 * @returns {number}
 */
export function totalHeures(lignes) {
  return lignes.reduce((sum, l) => sum + parseFloat(l.duree_heures || 0), 0);
}

/**
 * Calculer le total des montants
 * @param {array} lignes — [{montant: 15000}, ...]
 * @returns {number}
 */
export function totalMontant(lignes) {
  return lignes.reduce((sum, l) => sum + parseFloat(l.montant || 0), 0);
}