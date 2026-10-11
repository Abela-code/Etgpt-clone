import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatHeader from "./components/ChatHeader/ChatHeader";
import MessageList from "./components/MessageList/MessageList";
import ChatInput from "./components/ChatInput/ChatInput";
import Toast from "./components/Toast/Toast";
import AuthPage from "./pages/AuthPage";
import { useAuth } from "./context/AuthContext";
import "./App.css";

const API_BASE_URL = `${(import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "")}/api`;

function ChatApp() {
  const { user, token, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, isLoading, streamingContent]);

  const loadChats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/chat/chats`, {
        headers: authHeaders(),
      });
      if (res.data.status) {
        setChats(res.data.data || []);
        return res.data.data || [];
      }
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Could not load chats. Is the backend running?"
      );
    }
    return [];
  };

  const loadMessages = async (chatId) => {
    if (!chatId) {
      setConversations([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/chat/chats/${chatId}/messages`,
        { headers: authHeaders() }
      );
      if (res.data.status) setConversations(res.data.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load messages");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setHistoryLoading(true);
      const list = await loadChats();
      if (list.length > 0) {
        setActiveChatId(list[0].id);
        await loadMessages(list[0].id);
      } else {
        setHistoryLoading(false);
      }
    })();
  }, []);

  const handleNewChat = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/chat/chats`,
        { title: "New chat" },
        { headers: authHeaders() }
      );
      if (res.data.status) {
        const chat = res.data.data;
        setChats((prev) => [chat, ...prev]);
        setActiveChatId(chat.id);
        setConversations([]);
        setStreamingContent("");
        setSidebarOpen(false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Could not create chat");
    }
  };

  const handleSelectChat = async (id) => {
    if (id === activeChatId || isLoading) return;
    setActiveChatId(id);
    setStreamingContent("");
    setSidebarOpen(false);
    await loadMessages(id);
  };

  const handleRenameChat = async (id, title) => {
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/chat/chats/${id}`,
        { title },
        { headers: authHeaders() }
      );
      if (res.data.status) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, title: res.data.data.title } : c
          )
        );
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Rename failed");
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/chat/chats/${id}`, {
        headers: authHeaders(),
      });
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeChatId === id) {
          const fallback = next[0]?.id || null;
          setActiveChatId(fallback);
          if (fallback) loadMessages(fallback);
          else setConversations([]);
        }
        return next;
      });
      showToast("Chat deleted", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed");
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  };

  const handleSendMessage = async (question, attachment = null) => {
    if ((!question?.trim() && !attachment) || isLoading) return;
    const cleanQuestion = (question || "").trim() || (attachment ? "Describe this image" : "");

    let chatId = activeChatId;
    if (!chatId) {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/chat/chats`,
          { title: "New chat" },
          { headers: authHeaders() }
        );
        chatId = res.data.data.id;
        setChats((prev) => [res.data.data, ...prev]);
        setActiveChatId(chatId);
      } catch (err) {
        showToast(err.response?.data?.message || "Could not create chat");
        return;
      }
    }

    const tempUser = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: attachment
        ? `${cleanQuestion}\n\n[Image: ${attachment.name}]`
        : cleanQuestion,
    };
    setConversations((prev) => [...prev, tempUser]);
    setIsLoading(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: cleanQuestion,
            chatId,
            image: attachment
              ? { mimeType: attachment.type, data: attachment.dataUrl.split(",")[1] }
              : null,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        let msg = "Request failed";
        try {
          const j = await response.json();
          msg = j.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assembled = "";
      let finalAssistant = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let dataLine = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            if (line.startsWith("data:")) dataLine = line.slice(5).trim();
          }
          if (!dataLine) continue;

          let data;
          try {
            data = JSON.parse(dataLine);
          } catch {
            continue;
          }

          if (event === "user_message") {
            setConversations((prev) => {
              const withoutTemp = prev.filter((m) => m.id !== tempUser.id);
              return [...withoutTemp, data];
            });
          } else if (event === "token") {
            assembled += data.text || "";
            setStreamingContent(assembled);
          } else if (event === "done") {
            finalAssistant = data.assistantConversation;
            if (data.chat) {
              setChats((prev) => {
                const others = prev.filter((c) => c.id !== data.chat.id);
                return [data.chat, ...others];
              });
            }
          } else if (event === "error") {
            showToast(data.message || "AI error");
            setConversations((prev) =>
              prev
                .filter((m) => m.id !== tempUser.id)
                .concat({
                  id: `error-${Date.now()}`,
                  role: "assistant",
                  content: data.message || "Something went wrong.",
                })
            );
            setStreamingContent("");
          }
        }
      }

      if (finalAssistant) {
        setConversations((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempUser.id);
          if (withoutTemp.some((m) => m.id === finalAssistant.id)) {
            return withoutTemp;
          }
          return [...withoutTemp, finalAssistant];
        });
      } else if (assembled) {
        // Aborted mid-stream — keep partial as assistant message
        setConversations((prev) => {
          const withoutTemp = prev.filter((m) => m.id !== tempUser.id);
          return [
            ...withoutTemp,
            {
              id: `partial-${Date.now()}`,
              role: "assistant",
              content: assembled,
            },
          ];
        });
      }
      setStreamingContent("");
    } catch (err) {
      if (err.name === "AbortError") {
        // stopped by user — partial handled above if any
      } else {
        console.error(err);
        showToast(err.message || "Failed to send message");
        setConversations((prev) =>
          prev
            .filter((m) => m.id !== tempUser.id)
            .concat({
              id: `error-${Date.now()}`,
              role: "assistant",
              content: err.message || "There was an error generating a response.",
            })
        );
      }
      setStreamingContent("");
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="app">
      <div
        className={`sidebarOverlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className={`sidebarWrap ${sidebarOpen ? "open" : ""}`}>
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
          user={user}
          onLogout={logout}
        />
      </div>

      <main className="chat">
        <ChatHeader
          onMenuClick={() => setSidebarOpen(true)}
          user={user}
          onLogout={logout}
        />
        <MessageList
          conversations={conversations}
          isLoading={isLoading}
          historyLoading={historyLoading}
          streamingContent={streamingContent}
          messagesEndRef={messagesEndRef}
          onSuggestionClick={handleSendMessage}
        />
        <ChatInput
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStop={handleStop}
        />
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="fullLoader">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return <AuthPage />;
  return <ChatApp />;
}
