const express = require("express");
const router = express.Router();
const { handleChat } = require("../services/gemini");
const { getSession, updateSession } = require("../services/session");

// Initialize chat session for CV improvement
router.post("/init", async (req, res) => {
  try {
    const { userId } = req.body;
    let session = getSession(userId);

    if (!session) {
      // Initial prompt based on user's CV knowledge
      // In routes/chat.js
      const initialPrompt = `You're a friendly CV advisor helping users improve their resumes. 

When users DON'T know what a CV is:
1. Briefly explain it's a document summarizing work history and skills
2. Provide simple steps to create one
3. Ask about their work experience

When users DO know:
1. Ask what specific help they need
2. Provide technical optimization tips:
   - ATS compatibility
   - Achievement quantification
   - Action verbs
3. Offer to review specific sections

Always:
- Use simple, clear language
- Break complex advice into bullet points
- End by suggesting next steps
- Maintain a friendly, professional tone

Start by asking: "Do you know what a Curriculum Vitae (CV) is?"`;

      const response = await handleChat(initialPrompt);

      session = {
        userId,
        chatHistory: [
          { role: "system", content: initialPrompt },
          { role: "assistant", content: response },
        ],
        cvData: {},
      };
      updateSession(userId, session);
    }

    res.json({
      message: session.chatHistory[session.chatHistory.length - 1].content,
      sessionId: userId,
    });
  } catch (error) {
    console.error("Error initializing chat:", error);
    res.status(500).json({ error: "Failed to initialize chat session" });
  }
});

// In routes/chat.js - update the /send endpoint
router.post('/send', async (req, res) => {
    try {
      const { userId, message } = req.body;
      
      if (!userId || !message) {
        return res.status(400).json({ 
          error: 'Se requieren userId y message' 
        });
      }
  
      let session = getSession(userId);
      if (!session) {
        return res.status(404).json({ 
          error: 'Sesión no encontrada. Por favor, inicia una nueva conversación.' 
        });
      }
  
      // Add user message to history
      session.chatHistory.push({ role: 'user', content: message });
      
      // Process with Gemini
      const response = await handleChat(session.chatHistory);
      
      // Add assistant response to history
      session.chatHistory.push({ role: 'assistant', content: response });
      updateSession(userId, session);
  
      res.json({ 
        message: response,
        cvData: session.cvData 
      });
  
    } catch (error) {
      console.error('Full Error:', {
        message: error.message,
        stack: error.stack,
        requestBody: req.body
      });
      
      res.status(500).json({ 
        error: 'Error procesando tu mensaje. Por favor intenta nuevamente.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

// Get chat history
router.get("/history/:userId", (req, res) => {
  try {
    const session = getSession(req.params.userId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session.chatHistory);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// In routes/chat.js
router.get('/test-gemini', async (req, res) => {
    try {
      const testPrompt = "Responde con 'OK' si estás funcionando correctamente";
      const response = await handleChat(testPrompt);
      res.json({ status: 'working', response });
    } catch (error) {
      console.error('Gemini Test Failed:', error);
      res.status(500).json({ 
        status: 'error',
        error: 'Error connecting to Gemini',
        details: error.message 
      });
    }
  });
module.exports = router;
