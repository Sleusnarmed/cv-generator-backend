// In-memory session store
const sessions = new Map();

/**
 * Get or create a session for the user
 * @param {string} userId - Unique user identifier
 * @returns {object} - User's session data
 */
function getSession(userId) {
    if (!sessions.has(userId)) {
        return null;
    }
    return sessions.get(userId);
}

/**
 * Update or create a session
 * @param {string} userId - Unique user identifier
 * @param {object} sessionData - Session data to store
 */
function updateSession(userId, sessionData) {
    sessions.set(userId, sessionData);
}

/**
 * Clear a user's session
 * @param {string} userId - Unique user identifier
 */
function clearSession(userId) {
    sessions.delete(userId);
}

/**
 * Get all CV data from a session
 * @param {string} userId - Unique user identifier
 * @returns {object} - Structured CV data
 */
function getCVData(userId) {
    const session = getSession(userId);
    return session ? session.cvData : null;
}

/**
 * Update specific CV section in session
 * @param {string} userId - Unique user identifier
 * @param {string} section - CV section (e.g., 'workExperience')
 * @param {object} data - Section data to update
 */
function updateCVSection(userId, section, data) {
    const session = getSession(userId);
    if (session) {
        session.cvData[section] = data;
        updateSession(userId, session);
    }
}

// Clean up old sessions periodically
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [userId, session] of sessions.entries()) {
        if (now - session.lastAccessed > oneHour) {
            sessions.delete(userId);
        }
    }
}, 30 * 60 * 1000); // Run every 30 minutes

module.exports = {
    getSession,
    updateSession,
    clearSession,
    getCVData,
    updateCVSection
};