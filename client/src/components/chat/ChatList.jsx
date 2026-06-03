import React, { useState, useEffect } from "react";
import chatService from "../../api/chatService";
import socket from "../../utils/socket";
import { getImageUrl } from "../../utils/imageUtils";
import { Search, MessageCircle } from "lucide-react";

const CORAL = "#E67E5F";

function timeAgo(ts) {
  if (!ts) return "";
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    const m = new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return h < 3 ? m : "Today";
  }
  if (diff < 172800) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", { weekday: "short" });
}

function ConvBadge({ label }) {
  const styles = {
    confirmed: { bg: "#D1FAE5", color: "#065F46" },
    pending: { bg: "#FEF3C7", color: "#92400E" },
    "past trip": { bg: "#F3F4F6", color: "#6B7280" },
    approved: { bg: "#D1FAE5", color: "#065F46" },
  };
  const key = label?.toLowerCase();
  const s = styles[key] || { bg: "#F3F4F6", color: "#6B7280" };
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
      style={{ background: s.bg, color: s.color }}
    >
      {label}
    </span>
  );
}

const TABS = ["All", "Unread", "Support"];

const ChatList = ({
  onSelectConversation,
  activeConversationId,
  currentUser,
  initialChatContext,
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket.connected) return;

    socket.on("receive_message", handleNewMessage);
    socket.on("message-sent", handleNewMessage);
    socket.on("user-status", ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        status === "online" ? next.add(userId) : next.delete(userId);
        return next;
      });
    });

    return () => {
      socket.off("receive_message");
      socket.off("message-sent");
      socket.off("user-status");
    };
  }, [conversations, currentUser]);

  const fetchConversations = async () => {
    try {
      const response = await chatService.getConversations();
      let list = [];
      if (Array.isArray(response)) list = response;
      else if (response?.data?.conversations) list = response.data.conversations;
      else if (response?.data && Array.isArray(response.data)) list = response.data;

      if (initialChatContext?.owner && currentUser) {
        const ownerId = initialChatContext.owner._id;
        const currentUserId = currentUser.id || currentUser._id;
        if (ownerId && currentUserId && ownerId !== currentUserId) {
          const existing = list.find((c) => c.participant?._id === ownerId);
          if (existing) {
            onSelectConversation(existing);
          } else {
            const ids = [currentUserId, ownerId].sort();
            const tempConv = {
              roomId: `${ids[0]}_${ids[1]}`,
              participant: initialChatContext.owner,
              unreadCount: 0,
              lastMessage: null,
              isTemp: true,
            };
            list.unshift(tempConv);
            onSelectConversation(tempConv);
          }
        }
      }

      setConversations(list);

      const userIds = list.map((c) => c.participant?._id).filter(Boolean);
      if (userIds.length > 0 && socket.connected) {
        socket.emit("get-online-status", userIds, (statusMap) => {
          const s = new Set();
          Object.entries(statusMap).forEach(([id, st]) => { if (st === "online") s.add(id); });
          setOnlineUsers(s);
        });
      }
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (msg) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.roomId === msg.roomId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const conv = { ...updated[idx] };
      const fromMe = msg.from === currentUser?.id || msg.from?._id === currentUser?.id;
      conv.lastMessage = { message: msg.message, timestamp: msg.createdAt, messageType: msg.messageType, isFromMe: fromMe };
      if (!fromMe && activeConversationId !== msg.roomId) conv.unreadCount = (conv.unreadCount || 0) + 1;
      updated.splice(idx, 1);
      updated.unshift(conv);
      return updated;
    });
  };

  // Derive booking status badge label from conversation metadata
  function getBadge(conv) {
    const st = conv.bookingStatus || conv.lastBookingStatus;
    if (!st) return null;
    const map = { approved: "Confirmed", confirmed: "Confirmed", pending: "Pending", completed: "Past Trip" };
    return map[st] || null;
  }

  const filtered = conversations.filter((c) => {
    const name = c.participant?.name || "";
    const msg = c.lastMessage?.message || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !msg.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeTab === "Unread" && !c.unreadCount) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-3 py-2">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-3 pb-3">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-colors"
            style={
              activeTab === tab
                ? { background: CORAL, color: "white" }
                : { background: "#F3F4F6", color: "#6B7280" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto space-y-0.5 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <MessageCircle size={32} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No messages yet</p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = activeConversationId === conv.roomId;
            const isOnline = onlineUsers.has(conv.participant?._id);
            const badge = getBadge(conv);
            const lastText =
              conv.lastMessage?.messageType === "image"
                ? "📷 Image"
                : conv.lastMessage?.messageType === "audio"
                  ? "🎤 Voice message"
                  : conv.lastMessage?.message || "Start a conversation";

            return (
              <button
                key={conv.roomId}
                onClick={() => onSelectConversation(conv)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left relative"
                style={isActive ? { background: "#FEF0EC", borderLeft: `3px solid ${CORAL}` } : {}}
              >
                {/* Unread dot */}
                {conv.unreadCount > 0 && !isActive && (
                  <span className="absolute top-3 left-1 w-2 h-2 rounded-full bg-red-500" />
                )}

                {/* Avatar */}
                <div className="relative shrink-0">
                  {conv.participant?.avatar ? (
                    <img
                      src={getImageUrl(conv.participant.avatar)}
                      alt={conv.participant.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ background: isActive ? CORAL : "#9CA3AF" }}
                    >
                      {conv.participant?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {conv.participant?.name || "Unknown"}
                    </p>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">
                      {timeAgo(conv.lastMessage?.timestamp || conv.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage?.isFromMe ? <span className="text-gray-400">You: </span> : null}
                    {lastText}
                  </p>
                  {badge && (
                    <div className="mt-1">
                      <ConvBadge label={badge} />
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;
