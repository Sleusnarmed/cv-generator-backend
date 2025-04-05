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
  
  // Add header
  page.drawText('Curriculum Vitae', {
    x: margin,
    y: yPosition,
    size: 24,
    font: fontBold,
    color: rgb(0.2, 0.4, 0.6)
  });
  yPosition -= lineHeight * 2;
  
  // Add personal information section
  yPosition = addSection(page, 'Información Personal', yPosition, fontBold);
  yPosition = addField(page, `Nombre: ${cvData.personal.nombre}`, yPosition, font);
  yPosition = addField(page, `Email: ${cvData.personal.email}`, yPosition, font);
  yPosition = addField(page, `Teléfono: ${cvData.personal.telefono}`, yPosition, font);
  yPosition = addField(page, `Ubicación: ${cvData.personal.ubicacion}`, yPosition, font);
  yPosition -= sectionSpacing;
  
  // Add education section
  yPosition = addSection(page, 'Educación', yPosition, fontBold);
  yPosition = addField(page, `${cvData.educacion.titulo}`, yPosition, fontBold);
  yPosition = addField(page, `${cvData.educacion.universidad}`, yPosition, font);
  yPosition = addField(page, `${cvData.educacion.fechas}`, yPosition, font);
  yPosition -= sectionSpacing;
  
  // Add experience section
  yPosition = addSection(page, 'Experiencia Laboral', yPosition, fontBold);
  yPosition = addField(page, `${cvData.experiencia.puesto}`, yPosition, fontBold);
  yPosition = addField(page, `${cvData.experiencia.empresa} | ${cvData.experiencia.fechas}`, yPosition, font);
  
  // Split responsibilities into bullet points
  const responsibilities = cvData.experiencia.responsabilidades.split(';');
  for (const resp of responsibilities) {
    yPosition = addBulletPoint(page, `• ${resp.trim()}`, yPosition, font);
  }
  yPosition -= sectionSpacing;
  
  // Add skills section
  yPosition = addSection(page, 'Habilidades', yPosition, fontBold);
  yPosition = addField(page, `Técnicas: ${cvData.habilidades.tecnicas.join(', ')}`, yPosition, font);
  yPosition = addField(page, `Blandas: ${cvData.habilidades.blandas.join(', ')}`, yPosition, font);
  
  // Add footer
  page.drawText('Generado con CV Builder - © 2024', {
    x: margin,
    y: 30,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  return await pdfDoc.save();
}

// Helper functions
function addSection(page, text, y, font) {
  page.drawText(text, {
    x: 50,
    y: y,
    size: 16,
    font: font,
    color: rgb(0.2, 0.4, 0.6)
  });
  return y - 25;
}

function addField(page, text, y, font) {
  page.drawText(text, {
    x: 50,
    y: y,
    size: 12,
    font: font
  });
  return y - 20;
}

function addBulletPoint(page, text, y, font) {
  page.drawText(text, {
    x: 60,
    y: y,
    size: 11,
    font: font
  });
  return y - 15;
}

module.exports = { generateCVPDF };