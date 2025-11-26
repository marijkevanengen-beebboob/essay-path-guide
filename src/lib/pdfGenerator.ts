import jsPDF from 'jspdf';

export type PDFData = {
  code: string;
  level: string;
  assignmentText: string;
  criteria: Array<{
    label: string;
    description: string;
  }>;
  firstFeedbackVersion: string | null;
  finalText: string;
  hasRequestedFeedbackOnce: boolean;
  copyPasteTriggered: boolean;
  sessionStartTime: number;
  aiReflection?: string;
};

export async function generatePDF(data: PDFData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    });
    yPosition += 3;
  };

  const addSection = (title: string) => {
    yPosition += 5;
    addText(title, 14, true);
    yPosition += 2;
  };

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PUNT! – Schrijfopdracht', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const exportDate = new Date().toLocaleString('nl-NL');
  doc.text(`Datum/tijd export: ${exportDate}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Code: ${data.code.toUpperCase()}`, margin, yPosition);
  yPosition += 10;

  // Assignment info
  addSection('Opdrachtinformatie');
  addText('Opdrachttekst:', 11, true);
  addText(data.assignmentText);
  yPosition += 3;
  
  addText('Beoordelingscriteria:', 11, true);
  data.criteria.forEach((criterion, index) => {
    addText(`${index + 1}. ${criterion.label}: ${criterion.description}`, 10);
  });

  // Scenario A: Feedback was used
  if (data.hasRequestedFeedbackOnce && data.firstFeedbackVersion) {
    addSection('Versie 1 (eerste versie bij feedbackaanvraag)');
    addText(data.firstFeedbackVersion);

    addSection('Eindversie');
    addText(data.finalText);

    addSection('Korte analyse van verbeteringen');
    if (data.aiReflection) {
      addText(data.aiReflection);
    } else {
      // Fallback simple analysis
      const version1Words = data.firstFeedbackVersion.trim().split(/\s+/).length;
      const finalWords = data.finalText.trim().split(/\s+/).length;
      const wordDiff = finalWords - version1Words;
      const diffText = wordDiff > 0 
        ? `uitgebreid met ${wordDiff} woorden`
        : wordDiff < 0 
        ? `ingekort met ${Math.abs(wordDiff)} woorden`
        : 'niet significant gewijzigd in lengte';
      
      addText(
        `De leerling heeft na feedback de tekst ${diffText}. ` +
        'Er is tussentijdse feedback gebruikt om de tekst te verbeteren.'
      );
    }
  } 
  // Scenario B: No feedback was used
  else {
    addSection('Eindversie');
    addText(data.finalText);

    yPosition += 5;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition, maxWidth, 15, 'F');
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Leerling heeft in deze sessie geen tussentijdse feedback opgevraagd via het systeem.',
      margin + 5,
      yPosition
    );
    yPosition += 10;
  }

  // Integrity log
  addSection('Integriteitslog');
  const copyPasteStatus = data.copyPasteTriggered ? 'Ja' : 'Nee';
  addText(`Copy-paste detector: ${copyPasteStatus}`, 10);
  
  const sessionDuration = Math.round((Date.now() - data.sessionStartTime) / 1000 / 60);
  addText(`Sessieduur: ${sessionDuration} minuten`, 10);

  // Download the PDF
  doc.save(`PUNT_opdracht_${data.code.toUpperCase()}_${Date.now()}.pdf`);
}
