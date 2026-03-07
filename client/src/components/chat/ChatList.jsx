import React, { useState, useEffect } from "react";
import chatService from "../../api/chatService";
import socket from "../../utils/socket";
import { getImageUrl } from "../../utils/imageUtils";
import { User, MessageCircle, Clock } from "lucide-react";

const ChatList = ({
  onSelectConversation,
  activeConversationId,
  currentUser,
  initialChatContext,
}) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!socket.connected) return;

    socket.on("receive_message", (startMessage) => {
      handleNewMessage(startMessage);
    });

    socket.on("message-sent", (sentMessage) => {
      handleNewMessage(sentMessage);
    });

    socket.on("user-status", ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (status === "online") {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
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

      let conversationsData = [];
      if (Array.isArray(response)) {
        conversationsData = response;
      } else if (response?.data?.conversations) {
        conversationsData = response.data.conversations;
      } else if (response?.data && Array.isArray(response.data)) {
        conversationsData = response.data;
      }

      if (initialChatContext?.owner && currentUser) {
        const ownerId = initialChatContext.owner._id;
        const currentUserId = currentUser.id || currentUser._id;

        if (ownerId && currentUserId && ownerId === currentUserId) {
          setConversations(conversationsData);
          return;
        }

        const existingConv = conversationsData.find(
          (c) => c.participant?._id === ownerId,
        );

        if (existingConv) {
          onSelectConversation(existingConv);
        } else {
          const ids = [currentUserId, ownerId].sort();
          const tempRoomId = `${ids[0]}_${ids[1]}`;

          const tempConv = {
            roomId: tempRoomId,
            participant: initialChatContext.owner,
            unreadCount: 0,
            lastMessage: null,
            isTemp: true,
          };

          conversationsData.unshift(tempConv);
          onSelectConversation(tempConv);
        }
      }

      setConversations(conversationsData);

      if (conversationsData.length > 0) {
        const userIds = conversationsData
          .map((c) => c.participant?._id)
          .filter(Boolean);
        if (socket.connected) {
          socket.emit("get-online-status", userIds, (statusMap) => {
            const onlineSet = new Set();
            Object.entries(statusMap).forEach(([id, status]) => {
              if (status === "online") onlineSet.add(id);
            });
            setOnlineUsers(onlineSet);
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    setConversations((prevConversations) => {
      const existingConvIndex = prevConversations.findIndex(
        (c) => c.roomId === message.roomId,
      );

      let updatedConversations = [...prevConversations];

      if (existingConvIndex !== -1) {
        const existingConv = updatedConversations[existingConvIndex];
        const updatedConv = {
          ...existingConv,
          lastMessage: {
            message: message.message,
            timestamp: message.createdAt,
            messageType: message.messageType,
            isFromMe:
              message.from === currentUser?.id ||
              message.from?._id === currentUser?.id,
          },
          unreadCount:
            message.from !== currentUser?.id &&
            message.from?._id !== currentUser?.id &&
            activeConversationId !== message.roomId
              ? (existingConv.unreadCount || 0) + 1
              : existingConv.unreadCount,
        };

        updatedConversations.splice(existingConvIndex, 1);
        updatedConversations.unshift(updatedConv);
      } else {
        // Fallback: reload list for new room
        // fetchConversations(); 
      }
      return updatedConversations;
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full opacity-50">
      <div className="w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-4" />
      <span className="text-[10px] uppercase font-bold tracking-widest text-[#9a9a9a]">Syncing Decryption...</span>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto space-y-1 p-2">
      {Array.isArray(conversations) &&
        conversations.map((conv) => (
          <div
            key={conv.roomId}
            onClick={() => onSelectConversation(conv)}
            className={`p-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center gap-4 relative group ${
              activeConversationId === conv.roomId
                ? "bg-[#d4af37]/10 border border-[#d4af37]/20 shadow-[0_0_20px_rgba(212,175,55,0.05)]"
                : "border border-transparent hover:bg-white/5"
            }`}
          >
            <div className="relative shrink-0">
              {conv.participant?.avatar ? (
                <img
                  src={getImageUrl(conv.participant.avatar)}
                  alt={conv.participant.name}
                  className="w-14 h-14 rounded-xl object-cover border border-[#d4af37]/10 hover:border-[#d4af37]/40 transition-colors"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#d4af37]/10 text-[#d4af37] flex items-center justify-center font-bold text-xl uppercase group-hover:border-[#d4af37]/30 transition-all" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {conv.participant?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              
              {/* Online Status Indicator */}
              {onlineUsers.has(conv.participant?._id) && (
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 border-2 border-[#0a0a0a] w-4 h-4 rounded-full shadow-lg"></span>
              )}

              {conv.unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-lg border-2 border-[#0a0a0a] shadow-lg">
                  {conv.unreadCount}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={`font-bold truncate text-[15px] ${activeConversationId === conv.roomId ? "text-[#d4af37]" : "text-[#f8f6f3]"}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                  {conv.participant?.name || "Access User"}
                </h3>
                <span className="text-[10px] text-[#9a9a9a]/60 font-black uppercase tracking-widest ml-2 flex items-center gap-1">
                  <Clock size={10} />
                  {conv.lastMessage?.timestamp &&
                    new Date(conv.lastMessage.timestamp).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                </span>
              </div>
              <p
                className={`text-xs truncate ${conv.unreadCount > 0 ? "font-bold text-[#f8f6f3]" : "text-[#9a9a9a]/80"}`}
              >
                {conv.lastMessage?.isFromMe && (
                  <span className="text-[#d4af37]/60 font-black mr-2 uppercase tracking-tighter text-[9px]">Self:</span>
                )}
                {conv.lastMessage?.messageType === "image"
                  ? "Visual Dossier Sent"
                  : conv.lastMessage?.messageType === "audio"
                    ? "Voice Intelligence Shared"
                    : conv.lastMessage?.message || "Channel initialization complete"}
              </p>
            </div>
            
            {activeConversationId === conv.roomId && (
               <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#d4af37] rounded-r-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
            )}
          </div>
        ))}
      {(!Array.isArray(conversations) || conversations.length === 0) && (
        <div className="p-12 text-center">
          <MessageCircle className="mx-auto w-12 h-12 text-[#9a9a9a]/20 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9a9a9a]">No Secure Communication History</p>
        </div>
      )}
    </div>
  );
};

export default ChatList;
