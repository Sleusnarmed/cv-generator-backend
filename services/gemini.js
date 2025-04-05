const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 2000,
    temperature: 0.5,
  },
});

// System instruction for consistent behavior
const SYSTEM_INSTRUCTION = {
  role: "user",
  parts: [
    {
      text: `Eres un asistente profesional para crear CVs en español. Sigue estas reglas:
      1. Comienza preguntando: "¡Hola! ¿Te gustaría que te ayude a crear o mejorar tu CV?"
      2. Haz UNA pregunta a la vez en este orden:
         a) Información personal (nombre completo, email, teléfono, ubicación)
         b) Educación (título, universidad, fechas inicio/fin)
         c) Experiencia laboral (puesto, empresa, responsabilidades)
         d) Habilidades (técnicas y blandas)
         e)
      3. Verifica cada respuesta antes de continuar
      4. Nunca muestres el JSON completo al usuario
      4. Mantén un tono amable y profesional
      5. Al final, resume toda la información en formato JSON`,
    },
  ],
};

/**
 * Formats chat history for Gemini API
 */
function formatChatHistory(history) {
  return history.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));
}

/**
 * Handles CV conversation flow
 */
async function handleCVConversation(input) {
  try {
    const isHistory = Array.isArray(input);
    const messages = isHistory ? input : [{ role: "user", content: input }];

    // Start chat with system instruction
    const chat = model.startChat({
      history: [
        SYSTEM_INSTRUCTION,
        {
          role: "model",
          parts: [
            {
              text: "Entendido. Comenzaré ofreciendo ayuda con el CV y haré una pregunta a la vez, pero sobre todo nunca mostraré el JSON completo al usuario.",
            },
          ],
        },
      ],
    });

    // Send all messages to maintain context
    for (const msg of messages) {
      if (msg.role === "user") {
        await chat.sendMessage(msg.content);
      }
    }

    // Get the last response
    const result = await chat.sendMessage(
      messages[messages.length - 1].content
    );
    const response = await result.response;
    const text = response.text();

    // Try to extract structured data
    let data = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) data = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log("No se pudo extraer datos estructurados");
    }

    return {
      message: text,
      data,
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error(
      "Disculpa, estoy teniendo problemas técnicos. ¿Podrías intentarlo de nuevo?"
    );
  }
}

module.exports = {
  handleCVConversation,
  formatChatHistory,
};
