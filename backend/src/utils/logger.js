/**
 * Logger Utility
 * 
 * Centralized logging for the application.
 */

const admin = require('firebase-admin');
const db = admin.firestore();

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

class Logger {
  constructor() {
    this.enableFirestoreLogging = process.env.ENABLE_FIRESTORE_LOGGING === 'true';
  }

  /**
   * Log message
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      level,
      message,
      timestamp,
      ...(data && { data })
    };

    // Console output
    const prefix = `[${timestamp}] [${level}]`;
    if (level === LOG_LEVELS.ERROR) {
      console.error(prefix, message, data);
    } else if (level === LOG_LEVELS.WARN) {
      console.warn(prefix, message, data);
    } else {
      console.log(prefix, message, data);
    }

    // Firestore logging (optional)
    if (this.enableFirestoreLogging) {
      try {
        await db.collection('logs').add(logEntry);
      } catch (error) {
        console.error('Failed to write log to Firestore:', error);
      }
    }
  }

  debug(message, data = null) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data = null) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  error(message, data = null) {
    this.log(LOG_LEVELS.ERROR, message, data);
  }
}

// Singleton instance
let instance = null;

function getInstance() {
  if (!instance) {
    instance = new Logger();
  }
  return instance;
}

module.exports = getInstance();
