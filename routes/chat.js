const express = require('express');
const router = express.Router();
const { handleCVConversation } = require('../services/gemini');
const { getSession, updateSession } = require('../services/session');

// Initialize CV session
router.post('/init', async (req, res) => {
  try {
    const { userId } = req.body;
    let session = getSession(userId);

    if (!session) {
      const { message } = await handleCVConversation(
        "Saluda y ofrece ayuda con el CV en español"
      );
      
      session = {
        userId,
        chatHistory: [
          { role: 'assistant', content: message }
        ],
        cvData: {
          personal: {},
          education: [],
          experience: [],
          skills: { technical: [], soft: [] }
        }
      };
      updateSession(userId, session);
    }

    res.json({ 
      message: session.chatHistory.slice(-1)[0].content,
      sessionId: userId
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Process CV conversation
router.post('/send', async (req, res) => {
  try {
    const { userId, message } = req.body;
    let session = getSession(userId);

    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada. Por favor inicia una nueva conversación.' });
    }

    // Add user message to history
    session.chatHistory.push({ role: 'user', content: message });
    
    // Process with Gemini using full history
    const { message: aiResponse, data } = await handleCVConversation(
      session.chatHistory
    );

    // Update CV data
    if (data) {
      if (data.personal) {
        session.cvData.personal = { ...session.cvData.personal, ...data.personal };
      }
      if (data.education) {
        session.cvData.education = [...session.cvData.education, ...data.education];
      }
      if (data.experience) {
        session.cvData.experience = [...session.cvData.experience, ...data.experience];
      }
      if (data.skills) {
        session.cvData.skills = {
          technical: [...new Set([...session.cvData.skills.technical, ...(data.skills.technical || [])])],
          soft: [...new Set([...session.cvData.skills.soft, ...(data.skills.soft || [])])]
        };
      }
    }

    // Add AI response to history
    session.chatHistory.push({ role: 'assistant', content: aiResponse });
    updateSession(userId, session);

    res.json({ 
      message: aiResponse,
      cvData: session.cvData
    });

  } catch (error) {
    console.error("Send Error:", {
      userId,
      error: error.message,
      chatHistory: getSession(userId)?.chatHistory
    });
    
    res.status(500).json({ 
      error: "Hubo un problema procesando tu mensaje. Por favor inténtalo de nuevo.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;