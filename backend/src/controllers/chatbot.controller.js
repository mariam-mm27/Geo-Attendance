import {
  generateIntelligentResponse,
  executeAdminAction,
  getWelcomeMessage,
  getUserContext
} from "../services/intelligentChatbot.service.js";
import { db } from "../config/firebase.js";

export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: "User ID required" });

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, message: "User not found" });

    const conversationsSnapshot = await db.collection("conversations")
      .where("participants", "array-contains", userId)
      .where("type", "==", "ai_chat")
      .limit(1)
      .get();

    let conversationId;
    if (!conversationsSnapshot.empty) {
      conversationId = conversationsSnapshot.docs[0].id;
    } else {
      const conversationRef = await db.collection("conversations").add({
        participants: [userId, "ai_assistant"],
        type: "ai_chat",
        title: "AI Assistant",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: { text: "Conversation started", sender: "ai_assistant", timestamp: new Date() }
      });
      conversationId = conversationRef.id;

      const welcomeMessage = await getWelcomeMessage(userId);
      await db.collection("messages").add({
        conversationId,
        sender: "ai_assistant",
        senderName: "AI Assistant",
        text: welcomeMessage,
        userId,
        timestamp: new Date(),
        type: "text"
      });
    }

    res.json({ success: true, conversationId, message: "Conversation ready" });
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error);
    res.status(500).json({ success: false, message: "Unable to create conversation. Please try again or contact support.", error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const { message } = req.body;

    if (!conversationId || !userId || !message) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, message: "User not found" });

    const userData = userDoc.data();

    await db.collection("messages").add({
      conversationId,
      sender: userId,
      senderName: userData.name || "User",
      text: message,
      userId,
      timestamp: new Date(),
      type: "text"
    });

    const aiResponse = await generateIntelligentResponse(userId, message);

    const aiMessageRef = await db.collection("messages").add({
      conversationId,
      sender: "ai_assistant",
      senderName: "AI Assistant",
      text: aiResponse,
      userId,
      timestamp: new Date(),
      type: "text"
    });

    await db.collection("conversations").doc(conversationId).update({
      lastMessage: { text: aiResponse, sender: "ai_assistant", timestamp: new Date() },
      updatedAt: new Date()
    });

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
    res.status(500).json({ success: false, message: "Unable to process your message. Please try again or contact support.", error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit: messageLimit = 50 } = req.query;

    if (!conversationId) return res.status(400).json({ success: false, message: "Conversation ID required" });

    const messagesSnapshot = await db.collection("messages")
      .where("conversationId", "==", conversationId)
      .orderBy("timestamp", "asc")
      .limit(parseInt(messageLimit))
      .get();

    const messages = messagesSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp?.toDate?.() || d.data().timestamp
    }));

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const executeAction = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, params } = req.body;
    if (!userId || !action) return res.status(400).json({ success: false, message: "Missing required fields" });
    const result = await executeAdminAction(userId, action, params);
    res.json(result);
  } catch (error) {
    console.error("Error in executeAction:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserContextData = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: "User ID required" });
    const context = await getUserContext(userId);
    res.json({ success: true, context });
  } catch (error) {
    console.error("Error in getUserContextData:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getWelcome = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, message: "User ID required" });
    const welcomeMessage = await getWelcomeMessage(userId);
    res.json({ success: true, message: welcomeMessage });
  } catch (error) {
    console.error("Error in getWelcome:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};