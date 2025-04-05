const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 2000,
    temperature: 0.7,
    topP: 0.95,
  },
});

/**
 * Properly formats chat history for Gemini API
 */
function formatChatHistory(history) {
  return history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}

function extractCVData(text) {
    const data = {};
    
    // Extract personal information
    const personalRegex = /(?:nombre|name):?\s*([^\n]+)|(?:email|correo):?\s*([^\n]+)|(?:tel[ée]fono|phone):?\s*([^\n]+)|(?:ubicaci[óo]n|location):?\s*([^\n]+)/gi;
    let match;
    while ((match = personalRegex.exec(text)) !== null) {
      if (match[1]) data.personal = { ...(data.personal || {}), name: match[1].trim() };
      if (match[2]) data.personal = { ...(data.personal || {}), email: match[2].trim() };
      if (match[3]) data.personal = { ...(data.personal || {}), phone: match[3].trim() };
      if (match[4]) data.personal = { ...(data.personal || {}), location: match[4].trim() };
    }
  
    // Extract education
    const educationRegex = /(?:t[ií]tulo|degree):?\s*([^\n]+)|(?:universidad|university):?\s*([^\n]+)|(?:fechas|dates):?\s*([^\n]+)/gi;
    let eduMatch;
    while ((eduMatch = educationRegex.exec(text)) !== null) {
      if (eduMatch[1] || eduMatch[2] || eduMatch[3]) {
        data.education = [{
          degree: eduMatch[1]?.trim() || '',
          university: eduMatch[2]?.trim() || '',
          dates: eduMatch[3]?.trim() || ''
        }];
      }
    }
  
    // Extract experience
    const expRegex = /(?:puesto|position):?\s*([^\n]+)|(?:empresa|company):?\s*([^\n]+)|(?:responsabilidades|responsibilities):?\s*([^\n]+)/gi;
    let expMatch;
    while ((expMatch = expRegex.exec(text)) !== null) {
      if (expMatch[1] || expMatch[2] || expMatch[3]) {
        data.experience = [{
          position: expMatch[1]?.trim() || '',
          company: expMatch[2]?.trim() || '',
          responsibilities: expMatch[3]?.trim() || ''
        }];
      }
    }
  
    // Extract skills
    const skillsRegex = /(?:habilidades t[eé]cnicas|technical skills):?\s*([^\n]+)|(?:habilidades blandas|soft skills):?\s*([^\n]+)/gi;
    let skillsMatch;
    while ((skillsMatch = skillsRegex.exec(text)) !== null) {
      data.skills = {
        technical: skillsMatch[1]?.split(',').map(s => s.trim()).filter(Boolean) || [],
        soft: skillsMatch[2]?.split(',').map(s => s.trim()).filter(Boolean) || []
      };
    }
  
    return Object.keys(data).length > 0 ? data : null;
  }

/**
 * Handles CV-building conversation with proper API format
 */
async function handleCVConversation(input) {
  try {
    // Determine if input is chat history or single message
    const isHistory = Array.isArray(input);
    const chatHistory = isHistory ? formatChatHistory(input) : [];

    // Start chat with system instruction if new conversation
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{
            text: `Eres un asistente profesional para crear CVs en español. 
            Comienza preguntando: "¡Hola! ¿Te gustaría que te ayude a crear o mejorar tu CV?" 
            Luego sigue este flujo natural:
            1. Pide información personal (nombre, email, teléfono, ubicación)
            2. Pide información educativa (título, universidad, fechas)
            3. Pide experiencia laboral (puesto, empresa, responsabilidades)
            4. Pide habilidades técnicas y blandas
            Haz una pregunta a la vez en español de manera natural.`
          }]
        },
        {
          role: "model",
          parts: [{ text: "¡Entendido! Comenzaré ofreciendo ayuda y guiaré paso a paso." }]
        },
        ...chatHistory
      ],
      generationConfig: {
        maxOutputTokens: 2000,
        temperature: 0.7
      }
    });

    // Send only the last message if it's a history
    const lastMessage = isHistory ? input[input.length - 1].content : input;
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    const text = response.text();
    const data = extractCVData(text) || await tryExtractJSON(text);
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log("No se pudo extraer datos estructurados");
    }
    

    return {
      message: text,
      data
    };

  } catch (error) {
    console.error("Detailed Gemini Error:", {
      message: error.message,
      stack: error.stack,
      input: Array.isArray(input) ? 
        input.map(i => `${i.role}: ${i.content}`) : 
        input
    });
    
    throw new Error("Disculpa, estoy teniendo dificultades técnicas. ¿Podrías reformular tu mensaje?");
  }
}


// Update your handleCVConversation function

// Helper to try extracting JSON if regex fails
async function tryExtractJSON(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  handleCVConversation
};