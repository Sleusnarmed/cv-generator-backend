// routes/cv.js - Handles CV data and PDF generation
const express = require('express');
const router = express.Router();
const { getSession } = require('../services/session');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

// GET /api/cv/data - Retrieve current CV data
router.get('/data', (req, res) => {
  try {
    const { sessionId } = req.query;
    const session = getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session.cvData);
  } catch (error) {
    console.error('CV data error:', error);
    res.status(500).json({ error: 'Failed to retrieve CV data' });
  }
});

// POST /api/pdf/generate - Generate PDF from CV data
router.post('/generate', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Create a simple PDF (hackathon version)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { cvData } = session;

    // Add content to PDF
    page.drawText(`${cvData.basics.name || 'Your Name'}`, { x: 50, y: 750, size: 24 });
    page.drawText('Work Experience', { x: 50, y: 700, size: 18 });
    
    cvData.work.forEach((job, i) => {
      const yPos = 670 - (i * 50);
      page.drawText(`${job.position} at ${job.company}`, { x: 50, y: yPos, size: 12 });
    });

    // Serialize and send
    const pdfBytes = await pdfDoc.save();
    const pdfPath = `./temp/cv_${sessionId}.pdf`;
    
    fs.writeFileSync(pdfPath, pdfBytes);
    res.json({ 
      pdfUrl: `/api/pdf/download?sessionId=${sessionId}`,
      message: 'PDF generated successfully'
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/pdf/download - Download generated PDF
router.get('/download', (req, res) => {
  try {
    const { sessionId } = req.query;
    const filePath = `./temp/cv_${sessionId}.pdf`;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    res.download(filePath, 'my_cv.pdf', (err) => {
      if (err) throw err;
      // Optional: Clean up file after download
      // fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: 'Failed to download PDF' });
  }
});

module.exports = router;