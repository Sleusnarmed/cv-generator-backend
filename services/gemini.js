const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: {
    role: "model",
    parts: [{
      text: "You are a professional CV advisor helping users create and improve their resumes. " +
            "Adapt your responses to the user's knowledge level. " +
            "For beginners, explain concepts simply. " +
            "For experienced users, provide technical optimization tips. " +
            "Always provide clear, actionable advice in a friendly tone."
    }]
  }
});

/**
 * Formats chat history for Gemini's expected input format
 * @param {Array} history - Chat history array
 * @returns {Array} - Formatted history
 */
function formatChatHistory(history) {
  return history.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
}

/**
 * Cleans and formats Gemini's response text
 * @param {string} text - Raw response from Gemini
 * @returns {string} - Cleaned response text
 */
function cleanResponse(text) {
  return text
    .replace(/\*\*/g, '')         // Remove markdown bold
    .replace(/\*/g, '•')          // Convert asterisks to bullets
    .replace(/```(json)?/g, '')   // Remove code blocks
    .replace(/\n\s*\n/g, '\n\n')  // Clean up extra newlines
    .trim();
}

/**
 * Handles chat interactions with Gemini AI
 * @param {string|Array} input - Either a direct string prompt or chat history array
 * @returns {Promise<string>} - Generated response from Gemini
 */
async function handleChat(input) {
  try {
    let prompt;
    let chatHistory = [];
    
    if (Array.isArray(input)) {
      chatHistory = formatChatHistory(input.slice(0, -1)); // All messages except last
      prompt = input[input.length - 1].content; // Last message
    } else {
      prompt = input;
    }

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1500,
        temperature: 0.7,
        topP: 0.9,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    });

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    return cleanResponse(text);

  } catch (error) {
    console.error("Gemini API Error:", {
      message: error.message,
      stack: error.stack,
      input: Array.isArray(input) ? 
        input.map(i => `${i.role}: ${i.content}`) : 
        input
    });
    
    if (error.message.includes('500') || error.message.includes('quota')) {
      throw new Error("Our CV advisor service is currently busy. Please try again shortly.");
    } else {
      throw new Error("I'm having trouble processing your request. Please try again or rephrase your question.");
    }
  }
}

module.exports = {
  handleChat,
  cleanResponse,
  formatChatHistory
};