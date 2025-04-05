const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generateCVPDF(cvData) {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  
  // Register fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Set up margins and spacing
  const margin = 50;
  let yPosition = height - margin;
  const lineHeight = 20;
  const sectionSpacing = 30;

  // Helper function to add text with proper formatting
  const addText = (text, size, isBold = false, yOffset = 0) => {
    page.drawText(text, {
      x: margin,
      y: yPosition - yOffset,
      size,
      font: isBold ? fontBold : font,
      color: isBold ? rgb(0.2, 0.4, 0.6) : rgb(0, 0, 0)
    });
    return size + 4;
  };

  // Add header
  yPosition -= addText('Curriculum Vitae', 24, true);
  yPosition -= lineHeight * 2;
  
  // Add personal information section
  yPosition -= addText('Información Personal', 16, true);
  if (cvData.personal?.name) yPosition -= addText(`Nombre: ${cvData.personal.name}`, 12);
  if (cvData.personal?.email) yPosition -= addText(`Email: ${cvData.personal.email}`, 12);
  if (cvData.personal?.phone) yPosition -= addText(`Teléfono: ${cvData.personal.phone}`, 12);
  if (cvData.personal?.location) yPosition -= addText(`Ubicación: ${cvData.personal.location}`, 12);
  yPosition -= sectionSpacing;
  
  // Add education section
  if (cvData.education?.length > 0) {
    yPosition -= addText('Educación', 16, true);
    cvData.education.forEach(edu => {
      if (edu.degree) yPosition -= addText(edu.degree, 12, true);
      if (edu.university) yPosition -= addText(edu.university, 12);
      if (edu.dates || (edu.start && edu.end)) {
        const dates = edu.dates || `${edu.start} - ${edu.end}`;
        yPosition -= addText(dates, 12);
      }
      yPosition -= lineHeight;
    });
    yPosition -= sectionSpacing;
  }
  
  // Add experience section
  if (cvData.experience?.length > 0) {
    yPosition -= addText('Experiencia Laboral', 16, true);
    cvData.experience.forEach(exp => {
      if (exp.position) yPosition -= addText(exp.position, 12, true);
      if (exp.company) yPosition -= addText(exp.company, 12);
      if (exp.dates || (exp.start && exp.end)) {
        const dates = exp.dates || `${exp.start} - ${exp.end}`;
        yPosition -= addText(dates, 12);
      }
      if (exp.responsibilities) {
        const responsibilities = Array.isArray(exp.responsibilities) 
          ? exp.responsibilities 
          : exp.responsibilities.split('\n');
        responsibilities.forEach(resp => {
          if (resp.trim()) {
            yPosition -= addText(`• ${resp.trim()}`, 10, false, 15);
          }
        });
      }
      yPosition -= lineHeight;
    });
    yPosition -= sectionSpacing;
  }
  
  // Add skills section
  if (cvData.skills) {
    yPosition -= addText('Habilidades', 16, true);
    if (cvData.skills.technical?.length > 0) {
      yPosition -= addText(`Técnicas: ${cvData.skills.technical.join(', ')}`, 12);
    }
    if (cvData.skills.soft?.length > 0) {
      yPosition -= addText(`Blandas: ${cvData.skills.soft.join(', ')}`, 12);
    }
  }
  
  // Add footer
  page.drawText('Generado con CV Builder', {
    x: margin,
    y: 30,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  return await pdfDoc.save();
}

module.exports = {
  generateCVPDF
};