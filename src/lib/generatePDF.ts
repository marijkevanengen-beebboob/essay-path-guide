import jsPDF from 'jspdf';

type PDFData = {
  code: string;
  level: string;
  assignmentText: string;
  firstFeedbackVersion: string;
  finalText: string;
  hasRequestedFeedbackOnce: boolean;
  feedbackSummary?: string;
};

export const generateStudentPDF = (data: PDFData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  // Helper to add text with automatic page breaks
  const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    
    const lines = doc.splitTextToSize(text, maxWidth);
    
    lines.forEach((line: string) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += fontSize * 0.5;
    });
    
    yPosition += 5; // Extra spacing after paragraph
  };

  const addSection = (title: string, content: string) => {
    // Add some space before section
    yPosition += 5;
    
    // Section title
    addText(title, 14, true);
    yPosition += 2;
    
    // Section content
    if (content && content.trim()) {
      addText(content, 11, false);
    } else {
      addText('(Geen tekst beschikbaar)', 11, false);
    }
    
    yPosition += 10; // Extra space after section
  };

  // === HEADER ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PUNT! Schrijfopdracht - Werkproces', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Leerlingcode: ${data.code.toUpperCase()}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Niveau: ${data.level}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Datum: ${new Date().toLocaleDateString('nl-NL')} - ${new Date().toLocaleTimeString('nl-NL')}`, margin, yPosition);
  yPosition += 15;

  // === OPDRACHT ===
  addSection('Opdracht van de docent', data.assignmentText);

  // === VERSIE 1 ===
  if (data.hasRequestedFeedbackOnce && data.firstFeedbackVersion) {
    addSection('Versie 1 - Eerste versie ten tijde van de eerste feedback', data.firstFeedbackVersion);
  } else {
    addSection('Versie 1', 'Er is geen eerdere versie opgeslagen; leerling heeft geen feedbackmoment gebruikt.');
  }

  // === EINDVERSIE ===
  addSection('Eindversie', data.finalText);

  // === FEEDBACKOVERZICHT ===
  if (data.hasRequestedFeedbackOnce && data.feedbackSummary) {
    addSection('Feedbackoverzicht', data.feedbackSummary);
  } else {
    addSection('Feedbackoverzicht', 'De leerling heeft geen tussentijdse feedback opgevraagd.');
  }

  // === DOWNLOAD ===
  const fileName = `opdracht_${data.code}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
