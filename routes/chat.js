const express = require("express");
const router = express.Router();
const { handleCVConversation } = require("../services/gemini");
const { getSession, updateSession } = require("../services/session");

// Helper function to calculate CV completion progress
function calculateCVProgress(cvData) {
  let completed = 0;
  const total = 4; // personal, education, experience, skills
  
  if (cvData.personal?.name) completed++;
  if (cvData.education?.length > 0) completed++;
  if (cvData.experience?.length > 0) completed++;
  if (cvData.skills?.technical?.length > 0 || cvData.skills?.soft?.length > 0) completed++;
  
  return {
    percentage: Math.round((completed / total) * 100),
    completedFields: completed,
    totalFields: total,
    hasCompleteData: completed === total
  };
}

// Initialize CV session
router.post("/init", async (req, res) => {
  try {
    const { userId } = req.body;
    let session = getSession(userId);

    if (!session) {
      const { message } = await handleCVConversation(
        "Iniciar nueva conversación de CV"
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
      cvProgress: calculateCVProgress(session.cvData)
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Process CV conversation
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

    // Merge new data with existing
    if (data) {
      if (data.personal) {
        session.cvData.personal = { ...session.cvData.personal, ...data.personal };
      }
      if (data.education) {
        session.cvData.education = data.education;
      }
      if (data.experience) {
        session.cvData.experience = data.experience;
      }
      if (data.skills) {
        session.cvData.skills = {
          technical: [...new Set([...session.cvData.skills.technical, ...(data.skills.technical || [])])],
          soft: [...new Set([...session.cvData.skills.soft, ...(data.skills.soft || [])])]
        };
      }
    }

    // Add AI response to history
    session.chatHistory.push({ role: "assistant", content: aiResponse });
    updateSession(userId, session);

    // Calculate current progress
    const cvProgress = calculateCVProgress(session.cvData);

    res.json({
      message: aiResponse,
      cvData: session.cvData,
      cvProgress
    });

  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ 
      error: error.message || "Failed to process message",
      details: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

// Check CV status
router.get("/status/:userId", (req, res) => {
  try {
    const session = getSession(req.params.userId);
    if (!session) {
      return res.status(404).json({ 
        hasCompleteData: false,
        message: "Session not found"
      });
    }

    const cvProgress = calculateCVProgress(session.cvData);
    res.json(cvProgress);
  } catch (error) {
    console.error("Status Check Error:", error);
    res.status(500).json({ 
      hasCompleteData: false,
      error: "Error checking CV status"
    });
  }
});

module.exports = router;