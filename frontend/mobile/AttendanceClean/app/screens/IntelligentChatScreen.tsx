import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

const API_BASE_URL = "http://172.28.16.1:5000/api/chatbot";

interface Message {
  id: string;
  sender: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export default function IntelligentChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const auth = getAuth();
  const user = auth.currentUser;

  // Initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      if (!user) return;

      try {
        // Get user info
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          setUserName(userData.name || user.displayName || "User");
        }

        // Get or create conversation
        const response = await fetch(`${API_BASE_URL}/conversation/${user.uid}`);
        const data = await response.json();

        if (data.success) {
          setConversationId(data.conversationId);

          // Get welcome message
          const welcomeResponse = await fetch(`${API_BASE_URL}/welcome/${user.uid}`);
          const welcomeData = await welcomeResponse.json();

          if (welcomeData.success) {
            setMessages([{
              id: "welcome",
              sender: "ai_assistant",
              senderName: "AI Assistant",
              text: welcomeData.message,
              timestamp: new Date()
            }]);
          }
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        // Fallback welcome message
        setMessages([{
          id: "welcome",
          sender: "ai_assistant",
          senderName: "AI Assistant",
          text: "Welcome! How can I help you today?",
          timestamp: new Date()
        }]);
      }
    };

    initializeChat();
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Send message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: user.uid,
      senderName: userName,
      text: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = inputMessage.trim();
    setInputMessage("");
    setLoading(true);

    try {
      // If no conversationId yet, create one
      let convId = conversationId;
      if (!convId) {
        const response = await fetch(`${API_BASE_URL}/conversation/${user.uid}`);
        const data = await response.json();
        if (data.success) {
          convId = data.conversationId;
          setConversationId(convId);
        }
      }

      // Send message
      const response = await fetch(
        `${API_BASE_URL}/conversation/${convId}/message/${user.uid}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageText })
        }
      );

      const data = await response.json();

      if (data.success && data.message) {
        setMessages(prev => [...prev, {
          id: data.message.id,
          sender: "ai_assistant",
          senderName: "AI Assistant",
          text: data.message.text,
          timestamp: new Date(data.message.timestamp)
        }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        sender: "ai_assistant",
        senderName: "AI Assistant",
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUserMessage = item.sender === user?.uid;

    return (
      <View style={[styles.messageWrapper, isUserMessage ? styles.userMessage : styles.aiMessage]}>
        <View style={[styles.messageBubble, isUserMessage ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUserMessage ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
          <Text style={[styles.messageTime, isUserMessage ? styles.userTime : styles.aiTime]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  const renderLoadingIndicator = () => (
    <View style={styles.messageWrapper}>
      <View style={[styles.messageBubble, styles.aiBubble]}>
        <ActivityIndicator size="small" color="#667eea" />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🤖 AI Assistant</Text>
          <Text style={styles.headerStatus}>Online</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          scrollEnabled={true}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && renderLoadingIndicator()}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask me anything..."
            placeholderTextColor="#94a3b8"
            value={inputMessage}
            onChangeText={setInputMessage}
            editable={!loading}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputMessage.trim() || loading) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputMessage.trim() || loading}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  header: {
    backgroundColor: "#667eea",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#764ba2",
  },

  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  backButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  headerContent: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  headerStatus: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 2,
  },

  keyboardAvoidingView: {
    flex: 1,
  },

  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: "flex-end",
  },

  messageWrapper: {
    marginBottom: 12,
    flexDirection: "row",
  },

  userMessage: {
    justifyContent: "flex-end",
  },

  aiMessage: {
    justifyContent: "flex-start",
  },

  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },

  userBubble: {
    backgroundColor: "#667eea",
    borderBottomRightRadius: 4,
  },

  aiBubble: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },

  userText: {
    color: "white",
  },

  aiText: {
    color: "#1e293b",
  },

  messageTime: {
    fontSize: 11,
    opacity: 0.7,
  },

  userTime: {
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "right",
  },

  aiTime: {
    color: "#64748b",
    textAlign: "left",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 8,
  },

  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 20,
    fontSize: 14,
    maxHeight: 100,
    color: "#1e293b",
  },

  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
  },

  sendButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },

  sendButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
