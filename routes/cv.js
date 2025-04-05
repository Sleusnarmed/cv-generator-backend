const express = require('express');
const router = express.Router();
const { getSession } = require('../services/session');
const { generateCVPDF } = require('../services/pdfGenerator');

// Generate PDF endpoint
router.get('/:userId/pdf', async (req, res) => {
  try {
    const session = getSession(req.params.userId);
    if (!session || !session.cvData.personal.nombre) {
      return res.status(404).json({ error: 'CV data not found' });
    }

    const pdfBytes = await generateCVPDF(session.cvData);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=CV_${session.cvData.personal.nombre.replace(/\s+/g, '_')}.pdf`);
    res.send(pdfBytes);

  } catch (error) {
    console.error('PDF Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

module.exports = router;