import express from "express";
import {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  executeAction,
  getUserContextData,
  getWelcome
} from "../controllers/chatbot.controller.js";

const router = express.Router();

/**
 * Chatbot Routes
 */

// Get or create conversation
router.get("/conversation/:userId", getOrCreateConversation);

// Send message and get AI response
router.post("/conversation/:conversationId/message/:userId", sendMessage);

// Get conversation messages
router.get("/conversation/:conversationId/messages", getMessages);

// Execute admin action
router.post("/action/:userId", executeAction);

// Get user context
router.get("/context/:userId", getUserContextData);

// Get welcome message
router.get("/welcome/:userId", getWelcome);

export default router;
