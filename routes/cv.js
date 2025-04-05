const express = require('express');
const router = express.Router();
const { getSession } = require('../services/session');
const { generateCVPDF } = require('../services/pdfGenerator');

// Normalize CV data structure
function normalizeCVData(sessionData) {
  return {
    personal: {
      name: sessionData.personal?.name || sessionData.personal?.nombre || '',
      email: sessionData.personal?.email || sessionData.personal?.correo || '',
      phone: sessionData.personal?.phone || sessionData.personal?.telefono || '',
      location: sessionData.personal?.location || sessionData.personal?.ubicacion || ''
    },
    education: Array.isArray(sessionData.education) ? 
      sessionData.education : 
      [sessionData.education || sessionData.educacion].filter(Boolean),
    experience: Array.isArray(sessionData.experience) ? 
      sessionData.experience : 
      [sessionData.experience || sessionData.experiencia].filter(Boolean),
    skills: {
      technical: sessionData.skills?.technical || sessionData.skills?.tecnicas || [],
      soft: sessionData.skills?.soft || sessionData.skills?.blandas || []
    }
  };
}

// Generate PDF endpoint
// In your cv.js route
router.get('/:userId/pdf', async (req, res) => {
    try {
      const session = getSession(req.params.userId);
      if (!session) {
        return res.status(404).json({ error: 'Sesión no encontrada' });
      }
  
      // Validate data first
      const requiredFields = [
        session.cvData.personal?.name,
        session.cvData.education?.length > 0,
        session.cvData.experience?.length > 0,
        (session.cvData.skills?.technical?.length > 0 || session.cvData.skills?.soft?.length > 0)
      ];
  
      if (requiredFields.some(field => !field)) {
        return res.status(400).json({ 
          error: 'Datos incompletos',
          missingFields: {
            personal: !session.cvData.personal?.name,
            education: !session.cvData.education?.length,
            experience: !session.cvData.experience?.length,
            skills: !(session.cvData.skills?.technical?.length || session.cvData.skills?.soft?.length)
          }
        });
      }
  
      const pdfBytes = await generateCVPDF(session.cvData);
      
      res.setHeader('Content-Type', 'application/pdf');
      const fileName = `CV_${session.cvData.personal.name.replace(/\s+/g, '_')}.pdf`;
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBytes);
  
    } catch (error) {
      console.error('PDF Generation Error:', error);
      res.status(500).json({ 
        error: 'Error al generar el PDF',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

module.exports = router;