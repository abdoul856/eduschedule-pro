// src/utils/formatDate.js

/**
 * Formater une date en français
 * @param {string} date — date ISO (2026-04-14)
 * @returns {string} — Ex: "Lundi 14 avril 2026"
 */
export function formatDateLong(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    year:    "numeric"
  });
}

/**
 * Formater une date courte
 * @param {string} date — date ISO
 * @returns {string} — Ex: "14/04/2026"
 */
export function formatDateCourt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

/**
 * Formater une heure
 * @param {string} heure — "07:30:00"
 * @returns {string} — "07:30"
 */
export function formatHeure(heure) {
  if (!heure) return "—";
  return heure.slice(0, 5);
}

/**
 * Formater une datetime
 * @param {string} datetime
 * @returns {string} — "14/04/2026 à 07:30"
 */
export function formatDatetime(datetime) {
  if (!datetime) return "—";
  const d = new Date(datetime);
  return d.toLocaleDateString("fr-FR") + " à " +
         d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Obtenir le lundi de la semaine courante
 * @returns {string} — date ISO du lundi
 */
export function getLundiSemaine(date = new Date()) {
  const d    = new Date(date);
  const day  = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/**
 * Obtenir la semaine suivante
 * @param {string} semaine — date ISO du lundi
 * @returns {string} — date ISO du lundi suivant
 */
export function semaineSuivante(semaine) {
  const d = new Date(semaine);
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

/**
 * Obtenir la semaine précédente
 * @param {string} semaine — date ISO du lundi
 * @returns {string} — date ISO du lundi précédent
 */
export function semainePrecedente(semaine) {
  const d = new Date(semaine);
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

/**
 * Libellé du mois en français
 * @param {number} mois — 1-12
 * @returns {string}
 */
export function nomMois(mois) {
  const MOIS = ["Janvier","Février","Mars","Avril","Mai","Juin",
                "Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  return MOIS[mois - 1] || "—";
}