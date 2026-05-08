import {
  generateIntelligentResponse,
  executeAdminAction,
  saveMessage,
  getWelcomeMessage,
  getUserContext
} from "../services/intelligentChatbot.service.js";
import { db } from "../config/firebase.js";
import { doc, getDoc, addDoc, collection, query, where, getDocs, orderBy, limit, updateDoc } from "firebase/firestore";

/**
 * Get or create conversation
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    // Check if user exists
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Get or create conversation
    const conversationsSnapshot = await getDocs(
      query(
        collection(db, "conversations"),
        where("participants", "array-contains", userId),
        where("type", "==", "ai_chat"),
        orderBy("updatedAt", "desc"),
        limit(1)
      )
    );

    let conversationId;
    if (!conversationsSnapshot.empty) {
      conversationId = conversationsSnapshot.docs[0].id;
    } else {
      // Create new conversation
      const conversationRef = await addDoc(collection(db, "conversations"), {
        participants: [userId, "ai_assistant"],
        type: "ai_chat",
        title: "AI Assistant",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: {
          text: "Conversation started",
          sender: "ai_assistant",
          timestamp: new Date()
        }
      });

      conversationId = conversationRef.id;

      // Add welcome message
      const welcomeMessage = await getWelcomeMessage(userId);
      await addDoc(collection(db, "messages"), {
        conversationId,
        sender: "ai_assistant",
        senderName: "AI Assistant",
        text: welcomeMessage,
        userId,
        timestamp: new Date(),
        type: "text"
      });
    }

    res.json({
      success: true,
      conversationId,
      message: "Conversation ready"
    });
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Send message and get AI response
 */
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const { message } = req.body;

    if (!conversationId || !userId || !message) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Get user info
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userData = userDoc.data();

    // Save user message
    await addDoc(collection(db, "messages"), {
      conversationId,
      sender: userId,
      senderName: userData.name || "User",
      text: message,
      userId,
      timestamp: new Date(),
      type: "text"
    });

    // Generate AI response
    const aiResponse = await generateIntelligentResponse(userId, message);

    // Save AI response
    const aiMessageRef = await addDoc(collection(db, "messages"), {
      conversationId,
      sender: "ai_assistant",
      senderName: "AI Assistant",
      text: aiResponse,
      userId,
      timestamp: new Date(),
      type: "text"
    });

    // Update conversation
    await updateConversation(conversationId, aiResponse);

    res.json({
      success: true,
      message: {
        id: aiMessageRef.id,
        conversationId,
        sender: "ai_assistant",
        senderName: "AI Assistant",
        text: aiResponse,
        timestamp: new Date(),
        type: "text"
      }
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get conversation messages
 */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit: messageLimit = 50 } = req.query;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: "Conversation ID required" });
    }

    const messagesSnapshot = await getDocs(
      query(
        collection(db, "messages"),
        where("conversationId", "==", conversationId),
        orderBy("timestamp", "asc"),
        limit(parseInt(messageLimit))
      )
    );

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }));

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Execute admin action from chatbot
 */
export const executeAction = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, params } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const result = await executeAdminAction(userId, action, params);
    res.json(result);
  } catch (error) {
    console.error("Error in executeAction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get user context for chatbot
 */
export const getUserContextData = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const context = await getUserContext(userId);
    if (!context) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      context
    });
  } catch (error) {
    console.error("Error in getUserContextData:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get welcome message
 */
export const getWelcome = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID required" });
    }

    const welcomeMessage = await getWelcomeMessage(userId);

    res.json({
      success: true,
      message: welcomeMessage
    });
  } catch (error) {
    console.error("Error in getWelcome:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper: Update conversation last message
 */
const updateConversation = async (conversationId, lastMessageText) => {
  try {
    const conversationRef = doc(db, "conversations", conversationId);
    await updateDoc(conversationRef, {
      lastMessage: {
        text: lastMessageText,
        sender: "ai_assistant",
        timestamp: new Date()
      },
      updatedAt: new Date()
    });
  } catch (error) {
    console.error("Error updating conversation:", error);
  }
};
