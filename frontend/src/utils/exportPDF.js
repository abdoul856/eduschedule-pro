// src/utils/exportPDF.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

/**
 * Exporter un élément HTML en PDF
 * @param {string} elementId — ID de l'élément HTML
 * @param {string} nom — nom du fichier PDF
 * @param {string} titre — titre du document
 * @param {string} sousTitre — sous-titre
 */
export async function exporterElementPDF(elementId, nom, titre, sousTitre = "") {
  const element = document.getElementById(elementId);
  if (!element) throw new Error("Élément introuvable");

  const canvas   = await html2canvas(element, {
    scale:           2,
    useCORS:         true,
    backgroundColor: "#ffffff"
  });

  const imgData   = canvas.toDataURL("image/png");
  const pdf       = new jsPDF("landscape", "mm", "a4");
  const pdfWidth  = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  // Titre
  pdf.setFontSize(16);
  pdf.setTextColor(13, 110, 253);
  pdf.text(titre, pdfWidth / 2, 15, { align: "center" });

  // Sous-titre
  if (sousTitre) {
    pdf.setFontSize(11);
    pdf.setTextColor(100);
    pdf.text(sousTitre, pdfWidth / 2, 22, { align: "center" });
  }

  // Image
  pdf.addImage(imgData, "PNG", 5, 28, pdfWidth - 10, pdfHeight - 10);

  // Pied de page
  pdf.setFontSize(8);
  pdf.setTextColor(150);
  pdf.text(
    `ISGE-BF — EduSchedule Pro — Généré le ${new Date().toLocaleDateString("fr-FR")}`,
    pdfWidth / 2,
    pdf.internal.pageSize.getHeight() - 5,
    { align: "center" }
  );

  pdf.save(`${nom}.pdf`);
}

/**
 * Exporter une fiche de vacation en PDF
 * @param {object} vacation — données de la vacation
 * @param {array}  lignes   — lignes de détail
 * @param {string} nomMois  — libellé du mois
 */
export function exporterVacationPDF(vacation, lignes, nomMois) {
  const doc = new jsPDF();

  // En-tête
  doc.setFontSize(18);
  doc.setTextColor(13, 110, 253);
  doc.text("EduSchedule Pro", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("FICHE DE VACATION", 105, 30, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("ISGE-BF — Institut Supérieur de Génie Électrique du Burkina Faso",
    105, 38, { align: "center" });

  // Infos
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Enseignant : ${vacation.enseignant_nom}`, 20, 52);
  doc.text(`Période : ${nomMois} ${vacation.annee}`, 20, 60);
  doc.text(`Statut : ${vacation.statut}`, 20, 68);
  doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")}`, 140, 52);

  // Séparateur
  doc.setDrawColor(13, 110, 253);
  doc.setLineWidth(0.5);
  doc.line(20, 73, 190, 73);

  // Tableau
  autoTable(doc, {
    startY: 78,
    head:   [["Matière", "Semaine", "Durée (h)", "Taux (FCFA/h)", "Montant (FCFA)"]],
    body:   lignes.map(l => [
      l.matiere || "—",
      l.date    || "—",
      parseFloat(l.duree_heures || 0).toFixed(2),
      parseInt(l.taux_horaire   || 0).toLocaleString(),
      parseInt(l.montant        || 0).toLocaleString()
    ]),
    foot: [[
      { content: "TOTAL", colSpan: 2, styles: { fontStyle: "bold" } },
      { content: lignes.reduce((s, l) => s + parseFloat(l.duree_heures || 0), 0).toFixed(2), styles: { fontStyle: "bold" } },
      "",
      { content: parseInt(vacation.montant_brut || 0).toLocaleString() + " FCFA", styles: { fontStyle: "bold" } }
    ]],
    headStyles:         { fillColor: [13, 110, 253] },
    footStyles:         { fillColor: [240, 240, 240] },
    alternateRowStyles: { fillColor: [248, 249, 250] },
  });

  const finalY = doc.lastAutoTable.finalY + 15;

  // Montants
  doc.setFontSize(11);
  doc.text(`Montant brut :`,  120, finalY);
  doc.text(`${parseInt(vacation.montant_brut || 0).toLocaleString()} FCFA`, 175, finalY, { align: "right" });
  doc.text(`Retenues :`,      120, finalY + 8);
  doc.text(`${parseInt(vacation.retenues || 0).toLocaleString()} FCFA`, 175, finalY + 8, { align: "right" });

  doc.setFontSize(13);
  doc.setTextColor(13, 110, 253);
  doc.text(`Montant net :`, 120, finalY + 18);
  doc.text(`${parseInt(vacation.montant_net || 0).toLocaleString()} FCFA`, 175, finalY + 18, { align: "right" });

  // Signatures
  doc.setFontSize(10);
  doc.setTextColor(0);
  const sigY = finalY + 35;
  doc.text("Signature Enseignant", 30,  sigY);
  doc.text("Visa Surveillant",     95,  sigY);
  doc.text("Validation Comptable", 155, sigY);
  doc.rect(20,  sigY + 5, 60, 25);
  doc.rect(85,  sigY + 5, 60, 25);
  doc.rect(148, sigY + 5, 60, 25);

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    "EduSchedule Pro — ISGE-BF — Document généré automatiquement",
    105,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );

  doc.save(`vacation-${vacation.enseignant_nom?.replace(/ /g,'-')}-${nomMois}-${vacation.annee}.pdf`);
}

/**
 * Exporter l'emploi du temps en PDF
 * @param {string} elementId    — ID de la grille
 * @param {string} classeLibelle — libellé de la classe
 * @param {string} semaine       — date de la semaine
 * @param {string} classeCode    — code de la classe
 */
export async function exporterEmploiTempsPDF(elementId, classeLibelle, semaine, classeCode) {
  await exporterElementPDF(
    elementId,
    `emploi-temps-${classeCode}-${semaine}`,
    "EduSchedule Pro — Emploi du Temps",
    `${classeLibelle} — Semaine du ${semaine}`
  );
}