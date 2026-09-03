import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatHeader from "./components/ChatHeader/ChatHeader";
import MessageList from "./components/MessageList/MessageList";
import ChatInput from "./components/ChatInput/ChatInput";
import "./App.css";

const API_BASE_URL = "http://localhost:3888/api";

function App() {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversations, isLoading]);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/chat/conversations`
      );

      console.log(response.data.data);
      console.log(response.data.status);
      
      if (response.data.status) {
        setConversations(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const handleSendMessage = async (question) => {
    if (!question || !question.trim()) {
      return;
    }

    const cleanQuestion = question.trim();

    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: cleanQuestion,
    };

    setConversations((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat/conversations`,
        {
          question: cleanQuestion,
        }
      );

      if (response.data.status) {
        const {
          userConversation,
          assistantConversation,
        } = response.data.data;

        setConversations((prev) => {
          const filtered = prev.filter(
            (message) => message.id !== tempUserMessage.id
          );

          return [
            ...filtered,
            userConversation,
            assistantConversation,
          ].filter(Boolean);
        });
      }
    } catch (error) {
      console.error("Error posting conversation:", error);

      const errorMessage =
        error.response?.data?.message ||
        "There was an error generating a response.";

      const errorConversation = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: errorMessage,
      };

      setConversations((prev) => [
        ...prev,
        errorConversation,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <Sidebar />

      <main className="chat">
        <ChatHeader />

        <MessageList
          conversations={conversations}
          isLoading={isLoading}
          messagesEndRef={messagesEndRef}
        />

        <ChatInput
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}

export default App;
