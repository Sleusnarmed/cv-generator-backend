const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

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

// Main PDF generation function
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
  yPosition = addField(page, `Nombre: ${cvData.personal?.name || cvData.personal?.nombre || ''}`, yPosition, font);
  yPosition = addField(page, `Email: ${cvData.personal?.email || cvData.personal?.correo || ''}`, yPosition, font);
  yPosition = addField(page, `Teléfono: ${cvData.personal?.phone || cvData.personal?.telefono || ''}`, yPosition, font);
  yPosition = addField(page, `Ubicación: ${cvData.personal?.location || cvData.personal?.ubicacion || ''}`, yPosition, font);
  yPosition -= sectionSpacing;
  
  // Add education section (handles both structures)
  yPosition = addSection(page, 'Educación', yPosition, fontBold);
  const education = Array.isArray(cvData.education) ? cvData.education[0] : cvData.education;
  if (education) {
    yPosition = addField(page, `${education.degree || education.titulo || ''}`, yPosition, fontBold);
    yPosition = addField(page, `${education.university || education.universidad || ''}`, yPosition, font);
    yPosition = addField(page, `${education.start || education.fechas || ''}${education.end ? ` - ${education.end}` : ''}`, yPosition, font);
  }
  yPosition -= sectionSpacing;
  
  // Add experience section (handles both structures)
  yPosition = addSection(page, 'Experiencia Laboral', yPosition, fontBold);
  const experience = Array.isArray(cvData.experience) ? cvData.experience[0] : cvData.experiencia || cvData.experience;
  if (experience) {
    yPosition = addField(page, `${experience.position || experience.puesto || ''}`, yPosition, fontBold);
    yPosition = addField(page, `${experience.company || experience.empresa || ''} | ${experience.start || experience.fechas || ''}${experience.end ? ` - ${experience.end}` : ''}`, yPosition, font);
    
    // Handle responsibilities in both formats
    const responsibilities = experience.responsibilities || 
                            (experience.responsabilidades ? experience.responsabilidades.split(';') : []);
    for (const resp of responsibilities) {
      if (resp.trim()) {
        yPosition = addBulletPoint(page, `• ${resp.trim()}`, yPosition, font);
      }
    }
  }
  yPosition -= sectionSpacing;
  
  // Add skills section (handles both structures)
  yPosition = addSection(page, 'Habilidades', yPosition, fontBold);
  const skills = cvData.skills || cvData.habilidades;
  if (skills) {
    const technical = skills.technical || skills.tecnicas || [];
    const soft = skills.soft || skills.blandas || [];
    
    if (technical.length > 0) {
      yPosition = addField(page, `Técnicas: ${technical.join(', ')}`, yPosition, font);
    }
    if (soft.length > 0) {
      yPosition = addField(page, `Blandas: ${soft.join(', ')}`, yPosition, font);
    }
  }
  
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

module.exports = {
  generateCVPDF,
  addSection,
  addField,
  addBulletPoint
};