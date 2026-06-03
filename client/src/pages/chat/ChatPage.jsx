import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ChatList from "../../components/chat/ChatList";
import ChatBox from "../../components/chat/ChatBox";
import { useAuth } from "../../context/AuthContext";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import { Bell, ArrowLeft } from "lucide-react";

const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

function GojoLogo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="50,10 95,48 5,48" fill={BROWN} />
      <rect x="18" y="44" width="64" height="46" fill={CORAL} />
      <rect x="38" y="62" width="24" height="28" rx="2" fill="white" />
    </svg>
  );
}

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initialChatContext = location.state;

  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem("token");
      connectSocket(token);
    }
    return () => { disconnectSocket(); };
  }, [user]);

  return (
    <div className="h-screen flex flex-col" style={{ background: "#EBF3FB" }}>
      {/* ── Top navbar ─────────────────────────────────────────────────── */}
      <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5">
          <GojoLogo size={26} />
          <span className="text-lg font-bold tracking-tight" style={{ color: CORAL }}>
            Gojo
          </span>
        </button>

        {/* Center links */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => navigate("/owner/dashboard")}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Host your home
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="text-sm font-semibold pb-0.5 transition-colors"
            style={{ color: CORAL, borderBottom: `2px solid ${CORAL}` }}
          >
            Notifications
          </button>
        </nav>

        {/* Right: brand name */}
        <span className="text-lg font-bold tracking-tight" style={{ color: CORAL }}>
          Gojo
        </span>
      </header>

      {/* ── Split panel ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: conversation list */}
        <div
          className={`w-full md:w-80 flex flex-col bg-white border-r border-gray-100 shrink-0 ${
            selectedConversation ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Panel header */}
          <div className="px-5 pt-5 pb-3">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          </div>

          <ChatList
            onSelectConversation={setSelectedConversation}
            activeConversationId={selectedConversation?.roomId}
            initialChatContext={initialChatContext}
            currentUser={user}
          />
        </div>

        {/* Right: chat area */}
        <div
          className={`flex-1 flex flex-col ${
            selectedConversation ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Mobile back button */}
          {selectedConversation && (
            <div className="md:hidden px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-sm font-semibold text-gray-800">
                {selectedConversation.participant?.name}
              </span>
            </div>
          )}

          <ChatBox
            conversation={selectedConversation}
            currentUser={user}
            defaultMessage={initialChatContext?.initialMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
