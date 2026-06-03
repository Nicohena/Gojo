import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../../utils/socket";
import chatService from "../../api/chatService";
import { getImageUrl } from "../../utils/imageUtils";
import {
  Send,
  Image as ImageIcon,
  MapPin,
  MoreVertical,
  Calendar,
  Users,
  CheckCheck,
  Mic,
  StopCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const CORAL = "#E67E5F";

function Avatar({ src, name, size = 36, online = false }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center text-white font-bold w-full h-full"
          style={{ background: CORAL, fontSize: size * 0.4 }}
        >
          {name?.[0]?.toUpperCase() || "U"}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
      )}
    </div>
  );
}

function DateSeparator({ label }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
        {label}
      </span>
    </div>
  );
}

function isToday(date) {
  const d = new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(date) {
  const d = new Date(date);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

function dateSeparatorLabel(dateStr) {
  if (isToday(dateStr)) return "Today";
  if (isYesterday(dateStr)) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

const ChatBox = ({ conversation, currentUser, defaultMessage }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState(defaultMessage || "");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (defaultMessage && conversation?.isTemp) setNewMessage(defaultMessage);
  }, [defaultMessage, conversation]);

  useEffect(() => {
    if (!conversation) return;

    fetchHistory();

    const participantId = conversation.participant?._id;
    if (participantId && socket.connected) {
      socket.emit("get-online-status", [participantId], (statusMap) => {
        setIsOnline(statusMap[participantId] === "online");
      });
    }

    socket.emit("join_room", conversation.roomId);

    socket.on("receive_message", (msg) => {
      if (msg.roomId === conversation.roomId) setMessages((p) => [...p, msg]);
    });

    socket.on("user-status", ({ userId, status }) => {
      if (userId === conversation.participant?._id) setIsOnline(status === "online");
    });

    socket.on("message-sent", (msg) => {
      if (msg.roomId === conversation.roomId) {
        setMessages((prev) => {
          const exists = prev.some((m) => m._id === msg._id);
          if (exists) return prev;
          const optIdx = msg.tempId
            ? prev.findIndex((m) => m._id === msg.tempId)
            : prev.findIndex((m) => m.status === "sending" && m.message === msg.message);
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = msg;
            return next;
          }
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.emit("leave_room", conversation.roomId);
      socket.off("receive_message");
      socket.off("message-sent");
      socket.off("user-status");
    };
  }, [conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await chatService.getChatHistory(conversation.roomId);
      const list = Array.isArray(res)
        ? res
        : res?.data?.messages || res?.data || [];
      setMessages(Array.isArray(list) ? list : []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    if (!socket.connected) socket.connect();

    const tempId = Date.now().toString();
    const content = newMessage;
    setMessages((p) => [
      ...p,
      {
        _id: tempId,
        from: currentUser?.id || currentUser?._id,
        message: content,
        roomId: conversation.roomId,
        messageType: "text",
        createdAt: new Date().toISOString(),
        status: "sending",
      },
    ]);
    setNewMessage("");

    socket.emit("send-message", {
      to: conversation.participant?._id,
      message: content,
      roomId: conversation.roomId,
      messageType: "text",
      tempId,
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const tempId = Date.now().toString();
    const localUrl = URL.createObjectURL(file);
    const type = file.type.startsWith("image/") ? "image" : "file";

    setMessages((p) => [
      ...p,
      {
        _id: tempId,
        from: currentUser?.id || currentUser?._id,
        message: type === "image" ? "Sent an image" : "Sent a file",
        roomId: conversation.roomId,
        messageType: type,
        createdAt: new Date().toISOString(),
        status: "sending",
        attachment: { url: localUrl, fileName: file.name, mimeType: file.type },
      },
    ]);

    try {
      setUploading(true);
      const result = await chatService.uploadFile(file);
      const fileUrl = result.data?.[0] || null;
      if (fileUrl) {
        socket.emit("send-message", {
          to: conversation.participant?._id,
          message: type === "image" ? "Sent an image" : "Sent a file",
          roomId: conversation.roomId,
          messageType: type,
          tempId,
          attachment: { url: fileUrl, fileName: file.name, mimeType: file.type },
        });
      }
    } catch {
      setMessages((p) => p.filter((m) => m._id !== tempId));
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        const tempId = Date.now().toString();
        const localUrl = URL.createObjectURL(blob);
        setMessages((p) => [
          ...p,
          { _id: tempId, from: currentUser?.id || currentUser?._id, message: "Voice message", roomId: conversation.roomId, messageType: "audio", createdAt: new Date().toISOString(), status: "sending", attachment: { url: localUrl } },
        ]);
        try {
          setUploading(true);
          const file = new File([blob], "voice.webm", { type: "audio/webm" });
          const result = await chatService.uploadFile(file);
          const url = result.data?.[0];
          if (url) {
            socket.emit("send-message", { to: conversation.participant?._id, message: "Voice message", roomId: conversation.roomId, messageType: "audio", tempId, attachment: { url, fileName: "voice.webm", mimeType: "audio/webm" } });
          }
        } catch { toast.error("Voice upload failed"); } finally { setUploading(false); }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const renderContent = (msg) => {
    if (msg.messageType === "image") {
      return (
        <img
          src={getImageUrl(msg.attachment?.url)}
          alt="Shared"
          className="max-w-[220px] rounded-xl cursor-pointer"
          onClick={() => window.open(getImageUrl(msg.attachment?.url), "_blank")}
        />
      );
    }
    if (msg.messageType === "audio") {
      return (
        <audio controls className="w-48 h-8">
          <source src={getImageUrl(msg.attachment?.url)} type="audio/webm" />
        </audio>
      );
    }
    return <p className="text-sm leading-relaxed">{msg.message}</p>;
  };

  // Empty state
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-blue-50/30">
        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-4 shadow-sm">
          <ImageIcon size={28} className="text-gray-300" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Select a conversation to start messaging</p>
      </div>
    );
  }

  // Group messages by date for separators
  const grouped = [];
  let lastDate = null;
  messages.forEach((msg, i) => {
    const d = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
    if (d && d !== lastDate) {
      grouped.push({ type: "separator", label: dateSeparatorLabel(msg.createdAt), key: `sep-${i}` });
      lastDate = d;
    }
    grouped.push({ type: "message", msg, key: msg._id || i });
  });

  const booking = conversation.booking;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <Avatar
            src={conversation.participant?.avatar ? getImageUrl(conversation.participant.avatar) : null}
            name={conversation.participant?.name}
            size={38}
            online={isOnline}
          />
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {conversation.participant?.name || "Unknown"}
            </p>
            <p className="text-xs" style={{ color: isOnline ? "#22C55E" : "#9CA3AF" }}>
              {isOnline ? "● Online" : "Offline"}
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* ── Booking context card ────────────────────────────────────────── */}
      {booking && (
        <div className="mx-4 mt-3 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-200 shrink-0">
            {booking.image ? (
              <img src={booking.image} alt={booking.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: CORAL + "33" }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                ✓ Confirmed
              </span>
            </div>
            <p className="text-sm font-bold text-gray-900 truncate">{booking.title}</p>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Calendar size={10} /> {booking.dates}</span>
              <span className="flex items-center gap-1"><Users size={10} /> {booking.guests} Guests</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-bold" style={{ color: CORAL }}>
              ${booking.pricePerNight}
              <span className="text-xs font-normal text-gray-400">/night</span>
            </p>
            <button
              className="mt-1 text-xs font-medium border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors"
              onClick={() => booking.houseId && navigate(`/details/${booking.houseId}`)}
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1" style={{ background: "#F8FAFC" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === "separator") return <DateSeparator key={item.key} label={item.label} />;

            const { msg } = item;
            const senderId = msg.from?._id || msg.from;
            const isMe = senderId === currentUser?.id || senderId === currentUser?._id;

            return (
              <div key={item.key} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2 mb-2`}>
                {!isMe && (
                  <Avatar
                    src={conversation.participant?.avatar ? getImageUrl(conversation.participant.avatar) : null}
                    name={conversation.participant?.name}
                    size={28}
                  />
                )}
                <div className={`max-w-[65%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl ${isMe ? "rounded-br-sm" : "rounded-bl-sm"} shadow-sm`}
                    style={
                      isMe
                        ? { background: CORAL, color: "white" }
                        : { background: "white", color: "#111827", border: "1px solid #E5E7EB" }
                    }
                  >
                    {renderContent(msg)}
                  </div>
                  <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isMe && (
                      <CheckCheck size={12} className={msg.read ? "text-blue-500" : "text-gray-300"} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        {uploading && (
          <p className="text-xs text-gray-400 mb-2 animate-pulse">Uploading...</p>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-gray-300 transition-colors">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,audio/*" />

          {/* Image attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Attach image"
          >
            <ImageIcon size={18} />
          </button>

          {/* Location (cosmetic) */}
          <button
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Send location"
          >
            <MapPin size={18} />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none px-1"
            disabled={isRecording}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(e); }}
          />

          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="p-2 rounded-xl text-red-500 animate-pulse"
              aria-label="Stop recording"
            >
              <StopCircle size={20} />
            </button>
          ) : newMessage.trim() ? (
            <button
              type="submit"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 transition-opacity hover:opacity-90"
              style={{ background: CORAL }}
              aria-label="Send message"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Record voice"
            >
              <Mic size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
