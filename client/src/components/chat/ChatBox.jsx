import React, { useState, useEffect, useRef } from "react";
import socket from "../../utils/socket";
import chatService from "../../api/chatService";
import {
  Send,
  Mic,
  Image as ImageIcon,
  Paperclip,
  X,
  StopCircle,
} from "lucide-react";
import { getImageUrl } from "../../utils/imageUtils";

const ChatBox = ({ conversation, currentUser, defaultMessage }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (defaultMessage && conversation?.isTemp) {
      setNewMessage(defaultMessage);
    }
  }, [defaultMessage, conversation]);

  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  useEffect(() => {
    if (conversation) {
      fetchHistory();
      const participantId = conversation.participant?._id;
      if (participantId && socket.connected) {
        socket.emit("get-online-status", [participantId], (statusMap) => {
          setIsOnline(statusMap[participantId] === "online");
        });
      }
      socket.emit("join_room", conversation.roomId);

      socket.on("receive_message", (message) => {
        if (message.roomId === conversation.roomId) {
          setMessages((prev) => [...prev, message]);
        }
      });

      socket.on("user-status", ({ userId, status, lastSeen }) => {
        if (userId === conversation.participant?._id) {
          setIsOnline(status === "online");
          if (lastSeen) setLastSeen(lastSeen);
        }
      });

      socket.on("message-sent", (message) => {
        if (message.roomId === conversation.roomId) {
          setMessages((prev) => {
            const exists = prev.some((m) => m._id === message._id);
            if (exists) return prev;

            let optimisticIndex = -1;
            if (message.tempId) {
              optimisticIndex = prev.findIndex((m) => m._id === message.tempId);
            } else {
              optimisticIndex = prev.findIndex(
                (m) => m.status === "sending" && m.message === message.message,
              );
            }

            if (optimisticIndex !== -1) {
              const newMessages = [...prev];
              newMessages[optimisticIndex] = message;
              return newMessages;
            }
            return [...prev, message];
          });
        }
      });

      return () => {
        socket.emit("leave_room", conversation.roomId);
        socket.off("receive_message");
        socket.off("message-sent");
        socket.off("user-status");
      };
    }
  }, [conversation]);

  useEffect(() => { scrollToBottom(); }, [messages]);
  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await chatService.getChatHistory(conversation.roomId);
      let messagesData = [];
      if (Array.isArray(response)) messagesData = response;
      else if (response?.data?.messages && Array.isArray(response.data.messages)) messagesData = response.data.messages;
      else if (response?.data && Array.isArray(response.data)) messagesData = response.data;
      setMessages(messagesData);
    } catch (err) { setMessages([]); } finally { setLoading(false); }
  };

  const handleSendMessage = async (e) => {
    e && e.preventDefault();
    if (!newMessage.trim()) return;
    if (!socket.connected) socket.connect();

    const tempId = Date.now().toString();
    const messageContent = newMessage;
    const optimisticMessage = {
      _id: tempId,
      conversationId: conversation._id,
      from: currentUser.id || currentUser._id,
      to: conversation.participant?._id,
      message: messageContent,
      roomId: conversation.roomId,
      messageType: "text",
      createdAt: new Date().toISOString(),
      read: false,
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");

    try {
      socket.emit("send-message", {
        to: conversation.participant?._id,
        message: messageContent,
        roomId: conversation.roomId,
        messageType: "text",
        tempId: tempId,
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      toast.error("Failed to send message.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const tempId = Date.now().toString();
    const localUrl = URL.createObjectURL(file);
    const messageType = file.type.startsWith("image/") ? "image" : "file";
    const messageText = messageType === "image" ? "Sent an image" : "Sent a file";

    const optimisticMessage = {
      _id: tempId,
      conversationId: conversation._id,
      from: currentUser.id || currentUser._id,
      to: conversation.participant?._id,
      message: messageText,
      roomId: conversation.roomId,
      messageType: messageType,
      createdAt: new Date().toISOString(),
      read: false,
      status: "sending",
      attachment: { url: localUrl, fileName: file.name, mimeType: file.type },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      setUploading(true);
      const result = await chatService.uploadFile(file);
      const fileUrl = result.data ? result.data[0] : null;
      if (fileUrl) {
        socket.emit("send-message", {
          to: conversation.participant?._id,
          message: messageText,
          roomId: conversation.roomId,
          messageType: messageType,
          tempId: tempId,
          attachment: { url: fileUrl, fileName: file.name, mimeType: file.type },
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      toast.error("Upload failed");
    } finally { setUploading(false); }
  };

  const sendVoiceMessage = async (audioBlob) => {
    const tempId = Date.now().toString();
    const localUrl = URL.createObjectURL(audioBlob);
    const optimisticMessage = {
      _id: tempId,
      conversationId: conversation._id,
      from: currentUser.id || currentUser._id,
      to: conversation.participant?._id,
      message: "Voice message",
      roomId: conversation.roomId,
      messageType: "audio",
      createdAt: new Date().toISOString(),
      read: false,
      status: "sending",
      attachment: { url: localUrl, fileName: "voice-message.webm", mimeType: "audio/webm" },
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      setUploading(true);
      const file = new File([audioBlob], "voice-message.webm", { type: "audio/webm" });
      const result = await chatService.uploadFile(file);
      const fileUrl = result.data ? result.data[0] : null;
      if (fileUrl) {
        socket.emit("send-message", {
          to: conversation.participant?._id,
          message: "Voice message",
          roomId: conversation.roomId,
          messageType: "audio",
          tempId: tempId,
          attachment: { url: fileUrl, fileName: "voice-message.webm", mimeType: "audio/webm" },
        });
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      toast.error("Voice message failed");
    } finally { setUploading(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await sendVoiceMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const renderMessageContent = (msg) => {
    switch (msg.messageType) {
      case "image":
        return (
          <div className="mt-1">
            <img src={getImageUrl(msg.attachment?.url)} alt="Shared" className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(getImageUrl(msg.attachment?.url), "_blank")} />
            {msg.message !== "Sent an image" && <p className="mt-2 text-sm">{msg.message}</p>}
          </div>
        );
      case "audio":
        return (
          <div className="mt-1 min-w-[200px]">
             <audio controls className="w-full h-8 brightness-90 contrast-125 filter invert">
              <source src={getImageUrl(msg.attachment?.url)} type={msg.attachment?.mimeType || "audio/webm"} />
            </audio>
          </div>
        );
      default: return <p className="text-sm leading-relaxed">{msg.message}</p>;
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a]">
        <div className="w-24 h-24 bg-[#111] border border-[#d4af37]/10 rounded-full flex items-center justify-center mb-6">
          <ImageIcon className="w-10 h-10 text-[#d4af37]/20" />
        </div>
        <p className="text-[#9a9a9a] uppercase tracking-widest text-[10px] font-bold">Select a secure channel to begin</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0a] rounded-r-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-[#d4af37]/10 bg-[#111] flex items-center z-10">
        <div className="relative">
          {conversation.participant?.avatar ? (
            <img src={getImageUrl(conversation.participant.avatar)} alt={conversation.participant.name} className="w-12 h-12 rounded-full object-cover mr-4 border border-[#d4af37]/20" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center font-bold mr-4 italic text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              {conversation.participant?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          {isOnline && <span className="absolute bottom-0 right-4 w-3 h-3 bg-emerald-500 border-2 border-[#111] rounded-full shadow-sm"></span>}
        </div>
        <div>
          <h2 className="text-[#f8f6f3] text-lg font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{conversation.participant?.name || "Anonymous User"}</h2>
          <div className="flex items-center gap-2">
             <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-[#333]"}`} />
             <p className={`text-[10px] uppercase font-bold tracking-widest ${isOnline ? "text-emerald-500" : "text-[#9a9a9a]"}`}>{isOnline ? "Secure Connection" : "Offline"}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0a0a0a]" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #111 0%, #0a0a0a 100%)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          messages.map((msg, idx) => {
            const senderId = msg.from?._id || msg.from;
            const isMe = senderId === currentUser?.id || senderId === currentUser?._id;
            return (
              <div key={msg._id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in duration-500`}>
                <div className={`max-w-[70%] px-5 py-3.5 rounded-2xl shadow-xl ${isMe ? "bg-[#d4af37] text-[#0a0a0a] rounded-tr-none font-medium" : "bg-[#111] text-[#f8f6f3] border border-[#d4af37]/10 rounded-tl-none"}`}>
                  {renderMessageContent(msg)}
                  <div className={`flex items-center justify-end mt-2 gap-2 ${isMe ? "text-[#0a0a0a]/50" : "text-[#d4af37]/40"} text-[9px] font-bold uppercase tracking-tighter`}>
                    <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {isMe && <span>{msg.read ? "Read" : "Sent"}</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-[#d4af37]/10 bg-[#111]">
        {uploading && <div className="mb-4 text-[10px] font-bold text-[#d4af37] animate-pulse uppercase tracking-widest flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" /> Encrypting Media...</div>}
        <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-[#0a0a0a] p-2 rounded-xl border border-[#d4af37]/20 focus-within:border-[#d4af37]/50 transition-all">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,audio/*" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-[#9a9a9a] hover:text-[#d4af37] transition-colors"><ImageIcon size={20} /></button>
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent border-none focus:outline-none px-2 text-[#f8f6f3] text-sm placeholder-[#9a9a9a]/30" disabled={isRecording} />
          {isRecording ? (
            <div className="flex items-center gap-4 pr-2">
              <span className="text-red-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">Recording</span>
              <button type="button" onClick={stopRecording} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20"><StopCircle size={20} /></button>
            </div>
          ) : (
            <div className="flex gap-1">
              {newMessage.trim() ? (
                <button type="submit" className="p-2.5 bg-[#d4af37] text-[#0a0a0a] rounded-lg hover:bg-[#b8941f] transition-all"><Send size={18} /></button>
              ) : (
                <button type="button" onClick={startRecording} className="p-2 text-[#9a9a9a] hover:text-red-400 transition-colors"><Mic size={20} /></button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatBox;
