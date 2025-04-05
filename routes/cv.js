const express = require("express");
const router = express.Router();
const { getSession } = require("../services/session");
const { generateCVPDF } = require("../services/pdfGenerator");

// Helper function to validate CV data
function validateCVData(cvData) {
  if (!cvData.personal || !cvData.personal.name) {
    return false;
  }
  return true;
}

// Generate PDF endpoint
// In your /pdf endpoint
router.get("/:userId/pdf", async (req, res) => {
  try {
    const session = getSession(req.params.userId);
    if (!session) {
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    // More flexible validation
    if (!session.cvData.personal?.name) {
      return res.status(400).json({
        error: "Falta el nombre personal",
      });
    }

    // At least one of these should exist
    const hasContent =
      (session.cvData.education && session.cvData.education.length > 0) ||
      (session.cvData.experience && session.cvData.experience.length > 0) ||
      (session.cvData.skills &&
        (session.cvData.skills.technical.length > 0 ||
          session.cvData.skills.soft.length > 0));

    if (!hasContent) {
      return res.status(400).json({
        error: "Agrega al menos educación, experiencia o habilidades",
      });
    }

    const pdfBytes = await generateCVPDF(session.cvData);

    res.setHeader("Content-Type", "application/pdf");
    const fileName = `CV_${session.cvData.personal.name.replace(
      /\s+/g,
      "_"
    )}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(pdfBytes);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).json({
      error: "Error al generar el PDF",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
