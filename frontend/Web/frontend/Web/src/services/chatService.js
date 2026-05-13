import { db } from "../firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";

const API_BASE_URL = "http://localhost:5000/api/chat";

/**
 * Get or create AI conversation for user
 */
export const getAIConversation = async (userId) => {
  try {
    console.log("🤖 Getting AI conversation for user:", userId);
    const response = await fetch(`${API_BASE_URL}/conversation/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("🤖 AI conversation response:", data);
    return data;
  } catch (error) {
    console.error("❌ Error getting AI conversation:", error);
    
    // Fallback: create a mock conversation
    const mockConversationId = `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: true,
      conversationId: mockConversationId,
      data: {
        participants: [userId, "ai_assistant"],
        type: "ai_chat",
        title: "AI Assistant",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: {
          text: "Hello! I'm your attendance assistant. How can I help you today?",
          sender: "ai_assistant",
          timestamp: new Date()
        }
      },
      fallback: true
    };
  }
};

/**
 * Send message to AI assistant
 */
export const sendMessageToAI = async (userId, conversationId, message) => {
  try {
    console.log("🤖 Sending message:", { userId, conversationId, message });
    const response = await fetch(`${API_BASE_URL}/conversation/${conversationId}/message/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("🤖 AI response:", data);
    return data;
  } catch (error) {
    console.error("❌ Error sending message:", error);
    
    // Fallback: generate a simple AI response
    const aiResponses = [
      "I'm here to help with attendance-related questions. Could you be more specific?",
      "I can assist with attendance, courses, sessions, and notifications. What would you like to know?",
      "Please let me know what you need help with regarding your attendance system.",
      "To check your attendance, go to your course dashboard and select 'Attendance History'.",
      "You can view your enrolled courses in your dashboard."
    ];
    
    const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    
    return {
      success: true,
      message: {
        id: `fallback-${Date.now()}`,
        conversationId: conversationId,
        sender: "ai_assistant",
        senderName: "AI Assistant",
        text: randomResponse,
        timestamp: new Date(),
        type: "text"
      },
      fallback: true
    };
  }
};

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (conversationId, messageLimit = 50) => {
  try {
    console.log("🤖 Getting messages for conversation:", conversationId);
    const response = await fetch(`${API_BASE_URL}/conversation/${conversationId}/messages?limit=${messageLimit}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("🤖 Messages response:", data);
    return data;
  } catch (error) {
    console.error("❌ Error getting messages:", error);
    
    // Fallback: return welcome message
    return {
      success: true,
      messages: [{
        id: "welcome-fallback",
        conversationId: conversationId,
        sender: "ai_assistant",
        senderName: "AI Assistant",
        text: "Hello! I'm your attendance assistant. How can I help you today?",
        timestamp: new Date(),
        type: "text"
      }],
      fallback: true
    };
  }
};

/**
 * Listen to real-time messages using Firestore (with fallback)
 */
export const subscribeToMessages = (conversationId, callback) => {
  try {
    // Try to use Firestore real-time listener
    const messagesQuery = query(
      collection(db, "messages"),
      where("conversationId", "==", conversationId),
      orderBy("timestamp", "asc"),
      limit(100)
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
      }));
      callback(messages);
    }, (error) => {
      console.error("❌ Firestore listener error:", error);
      // Fallback: call the callback with empty array or cached messages
      callback([]);
    });
  } catch (error) {
    console.error("❌ Error setting up Firestore listener:", error);
    // Return a dummy unsubscribe function
    return () => {};
  }
};

/**
 * Listen to real-time conversations using Firestore (with fallback)
 */
export const subscribeToConversations = (userId, callback) => {
  try {
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId),
      orderBy("updatedAt", "desc")
    );

    return onSnapshot(conversationsQuery, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
        lastMessage: {
          ...doc.data().lastMessage,
          timestamp: doc.data().lastMessage?.timestamp?.toDate?.() || doc.data().lastMessage?.timestamp
        }
      }));
      callback(conversations);
    }, (error) => {
      console.error("❌ Firestore conversations listener error:", error);
      callback([]);
    });
  } catch (error) {
    console.error("❌ Error setting up conversations listener:", error);
    return () => {};
  }
};