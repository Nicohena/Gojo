import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import ChatList from "../../components/chat/ChatList";
import ChatBox from "../../components/chat/ChatBox";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket } from "../../utils/socket";

const ChatPage = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const { user } = useAuth();
  const location = useLocation();
  const initialChatContext = location.state;

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      connectSocket(token);
    }
    return () => { disconnectSocket(); };
  }, [user]);

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden">
        <div className="flex h-full bg-[#111] border border-[#d4af37]/15 overflow-hidden">
          {/* Conversation List */}
          <div className="w-full md:w-80 border-r border-[#d4af37]/10 flex flex-col bg-[#0f0f0f]">
            <div className="p-4 border-b border-[#d4af37]/10">
              <h1 className="text-xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Messages
              </h1>
            </div>
            <ChatList
              onSelectConversation={setSelectedConversation}
              activeConversationId={selectedConversation?.roomId}
              initialChatContext={initialChatContext}
              currentUser={user}
            />
          </div>

          {/* Chat Content */}
          <div className={`hidden md:flex flex-1 ${selectedConversation ? "flex" : ""}`}>
            <ChatBox
              conversation={selectedConversation}
              currentUser={user}
              defaultMessage={initialChatContext?.initialMessage}
            />
          </div>

          {/* Mobile Overlay */}
          {selectedConversation && (
            <div className="fixed inset-0 z-50 md:hidden bg-[#0a0a0a] flex flex-col">
              <div className="p-4 border-b border-[#d4af37]/10 bg-[#111] flex items-center">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="mr-4 text-[#d4af37] text-sm font-bold tracking-wide"
                >
                  ← Back
                </button>
                <h2 className="text-[#f8f6f3] text-sm">
                  {selectedConversation.participant?.name}
                </h2>
              </div>
              <ChatBox
                conversation={selectedConversation}
                currentUser={user}
                defaultMessage={initialChatContext?.initialMessage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
