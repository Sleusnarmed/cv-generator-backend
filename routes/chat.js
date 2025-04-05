const express = require("express");
const router = express.Router();
const { handleCVConversation } = require("../services/gemini");
const { getSession, updateSession } = require("../services/session");

// Initialize CV session
router.post("/init", async (req, res) => {
  try {
    const { userId } = req.body;
    let session = getSession(userId);

    if (!session) {
      const { message } = await handleCVConversation(
        "Saluda y ofrece ayuda con el CV en español"
      );

      session = {
        userId,
        chatHistory: [{ role: "assistant", content: message }],
        cvData: {
          personal: {},
          education: [],
          experience: [],
          skills: { technical: [], soft: [] },
        },
      };
      updateSession(userId, session);
    }

    res.json({
      message: session.chatHistory.slice(-1)[0].content,
      sessionId: userId,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Process CV conversation
// In your /send endpoint
router.post("/send", async (req, res) => {
  try {
    const { userId, message } = req.body;
    let session = getSession(userId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Add user message to history
    session.chatHistory.push({ role: "user", content: message });

    // Process with Gemini
    const { message: aiResponse, data } = await handleCVConversation(
      session.chatHistory
    );

    // NEW: Improved data extraction and merging
    if (data) {
      // Merge personal info
      if (data.personal) {
        session.cvData.personal = {
          ...session.cvData.personal,
          name:
            data.personal.nombre ||
            data.personal.name ||
            session.cvData.personal.name,
          email:
            data.personal.email ||
            data.personal.correo ||
            session.cvData.personal.email,
          phone:
            data.personal.phone ||
            data.personal.telefono ||
            session.cvData.personal.phone,
          location:
            data.personal.location ||
            data.personal.ubicacion ||
            session.cvData.personal.location,
        };
      }

      // Merge education
      if (data.educacion || data.education) {
        const edu = data.educacion || data.education;
        session.cvData.education = [
          {
            degree: edu.titulo || edu.degree || "",
            university: edu.universidad || edu.university || "",
            start: edu.fechas ? edu.fechas.split(" - ")[0] : edu.start || "",
            end: edu.fechas ? edu.fechas.split(" - ")[1] : edu.end || "",
          },
        ];
      }

      // Merge experience
      if (data.experiencia || data.experience) {
        const exp = data.experiencia || data.experience;
        session.cvData.experience = [
          {
            position: exp.puesto || exp.position || "",
            company: exp.empresa || exp.company || "",
            start: exp.fechas ? exp.fechas.split(" - ")[0] : exp.start || "",
            end: exp.fechas ? exp.fechas.split(" - ")[1] : exp.end || "",
            responsibilities:
              exp.responsabilidades || exp.responsibilities || "",
          },
        ];
      }

      // Merge skills
      if (data.habilidades || data.skills) {
        const skills = data.habilidades || data.skills;
        session.cvData.skills = {
          technical: skills.tecnicas || skills.technical || [],
          soft: skills.blandas || skills.soft || [],
        };
      }
    }

    // Add AI response to history
    session.chatHistory.push({ role: "assistant", content: aiResponse });
    updateSession(userId, session);

    res.json({
      message: aiResponse,
      cvData: session.cvData,
      hasCompleteData: !!session.cvData.personal.name,
    });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Add this new route
router.get("/status/:userId", (req, res) => {
  try {
    const session = getSession(req.params.userId);
    if (!session) {
      return res.status(404).json({ hasCompleteData: false });
    }

    const hasCompleteData = !!(
      session.cvData.personal?.name &&
      session.cvData.education?.length > 0 &&
      session.cvData.experience?.length > 0 &&
      session.cvData.skills
    );

    res.json({ hasCompleteData });
  } catch (error) {
    res.status(500).json({ hasCompleteData: false });
  }
});

module.exports = router;
