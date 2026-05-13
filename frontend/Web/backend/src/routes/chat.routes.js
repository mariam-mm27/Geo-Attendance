import express from "express";
import { db } from "../config/firebase.js";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";

const router = express.Router();

// Get or create conversation
router.get("/conversation/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const q = query(
      collection(db, "conversations"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    
    let conversationId;
    if (snap.empty) {
      const docRef = await addDoc(collection(db, "conversations"), {
        userId,
        createdAt: serverTimestamp()
      });
      conversationId = docRef.id;
    } else {
      conversationId = snap.docs[0].id;
    }
    
    res.json({ success: true, conversationId });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Get welcome message
router.get("/welcome/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { getWelcomeMessage } = await import("../services/intelligentChatbot.service.js");
    const message = await getWelcomeMessage(userId);
    res.json({ success: true, message });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Send message
router.post("/conversation/:conversationId/message/:userId", async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const { message } = req.body;
    
    const { generateIntelligentResponse, saveMessage } = await import("../services/intelligentChatbot.service.js");
    
    // Generate AI response
    const responseText = await generateIntelligentResponse(userId, message);
    
    // Save message to Firestore
    await saveMessage(conversationId, userId, "user", message, userId);
    
    const msgRef = await saveMessage(conversationId, "ai_assistant", "AI Assistant", responseText, userId);
    
    res.json({
      success: true,
      message: {
        id: `ai-${Date.now()}`,
        sender: "ai_assistant",
        senderName: "AI Assistant",
        text: responseText,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

export default router;