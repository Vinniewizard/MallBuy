import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Headphones, X, Minus, Send, ChevronRight, Phone, Mail, User, ShieldAlert, CheckCircle2, MessageCircle, Clock, Volume2, VolumeX, Sparkles, AlertCircle } from "lucide-react";
import { User as UserType, SupportTicket, SupportMessage } from "../types";

interface SupportChatProps {
  currentUser: UserType | null;
}

export default function SupportChat({ currentUser }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Tabs state
  const [activeTab, setActiveTab] = useState<"ai" | "live">("ai");

  // Form states for creating a ticket
  const [subject, setSubject] = useState("");
  const [name, setName] = useState(currentUser?.username || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [initialMsg, setInitialMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Chat window state
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // AI assistant state
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string; time: string }[]>([
    {
      role: "assistant",
      content: "Hello! I am your MallBuy AI Support Assistant. Ask me anything about M-Pesa deposits, order tasks, commissions, or withdrawals. I can answer instantly!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [aiText, setAiText] = useState("");
  const [aiIsTyping, setAiIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const aiEndRef = useRef<HTMLDivElement | null>(null);

  const QUICK_QUESTIONS = [
    { label: "💳 Deposit Issue", query: "My M-Pesa deposit is not reflecting in my wallet. How can I get it credited?" },
    { label: "💰 M-Pesa Withdraw", query: "How do I withdraw my earnings to my M-Pesa account, and what are the rules?" },
    { label: "🤝 Referral Program", query: "What is the team referral commission structure and how do I earn from my downlines?" },
    { label: "📦 Wholesale Tasks", query: "How do group buy wholesale dispatch tasks work and what are the commission rates?" }
  ];

  // Update form values if user logs in/out
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.username);
      setPhone(currentUser.phone);
      setEmail(currentUser.email || "");
    }
  }, [currentUser]);

  // Load existing tickets or saved active ticket on mount
  useEffect(() => {
    const savedTicketId = localStorage.getItem("mallbuy_active_support_ticket_id");
    if (savedTicketId) {
      fetchTicketDetails(savedTicketId);
    }
    fetchUserTickets();
  }, [currentUser]);

  // Play support beep when new message arrives from admin
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 150);
    } catch (e) {
      console.log("Audio notification error:", e);
    }
  };

  // Poll active ticket details every 3 seconds for live support messaging
  useEffect(() => {
    if (!activeTicket) return;

    const interval = setInterval(() => {
      fetch(`/api/support/tickets/${activeTicket.id}`, {
        headers: currentUser ? { "x-user-id": currentUser.id } : {}
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Stale ticket fetch");
        })
        .then((data) => {
          if (data.ticket) {
            const serverMsgs = data.ticket.messages || [];
            const localMsgs = activeTicket.messages || [];
            
            // Check if there are new incoming messages
            if (serverMsgs.length > localMsgs.length) {
              const lastMsg = serverMsgs[serverMsgs.length - 1];
              // Only play beep if the message is from someone else (e.g. support/admin)
              if (lastMsg.sender_id === "admin") {
                playBeep();
                setIsOpen(true); // Automatically pop open/unminimize for alert
              }
            }
            
            setActiveTicket(data.ticket);
          }
        })
        .catch((err) => console.log("Live Support polling inactive:", err));
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTicket, currentUser, soundEnabled]);

  // Scroll to bottom whenever messages list is updated
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTicket?.messages]);

  // Scroll to bottom of AI chat whenever messages are added
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages, aiIsTyping]);

  const fetchUserTickets = async () => {
    try {
      let url = "/api/support/tickets";
      if (!currentUser) {
        // If guest, try looking up by phone
        if (phone) url += `?phone=${encodeURIComponent(phone)}`;
        else return;
      }
      
      const headers: HeadersInit = currentUser ? { "x-user-id": currentUser.id } : {};
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setTicketsList(data.tickets || []);
      }
    } catch (err) {
      console.log("Error loading tickets list:", err);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    try {
      const headers: HeadersInit = currentUser ? { "x-user-id": currentUser.id } : {};
      const res = await fetch(`/api/support/tickets/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) {
          setActiveTicket(data.ticket);
          setActiveTab("live"); // auto-switch to live if there's active session
          localStorage.setItem("mallbuy_active_support_ticket_id", data.ticket.id);
        }
      } else {
        localStorage.removeItem("mallbuy_active_support_ticket_id");
      }
    } catch (err) {
      console.log("Error fetching active ticket details:", err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!subject.trim() || !name.trim() || !phone.trim() || !initialMsg.trim()) {
      setErrorMsg("Please fill in all fields with an asterisk (*).");
      return;
    }

    setIsLoading(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (currentUser) {
        headers["x-user-id"] = currentUser.id;
      }

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject,
          name,
          phone,
          email,
          initialMessage: initialMsg
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveTicket(data.ticket);
        localStorage.setItem("mallbuy_active_support_ticket_id", data.ticket.id);
        // Clear creation form
        setSubject("");
        setInitialMsg("");
        fetchUserTickets();
      } else {
        setErrorMsg(data.error || "Failed to create support room.");
      }
    } catch (err) {
      setErrorMsg("Connection issue. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    setSendingReply(true);
    try {
      const senderId = currentUser ? currentUser.id : "guest";
      const senderName = currentUser ? currentUser.username : activeTicket.user_name;

      const res = await fetch(`/api/support/tickets/${activeTicket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentUser ? { "x-user-id": currentUser.id } : {})
        },
        body: JSON.stringify({
          content: replyText,
          sender_name: senderName,
          sender_id: senderId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveTicket(data.ticket);
        setReplyText("");
      }
    } catch (err) {
      console.log("Error sending message:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleAiSend = async (e?: React.FormEvent, presetMessage?: string) => {
    if (e) e.preventDefault();
    const textToSend = presetMessage || aiText;
    if (!textToSend.trim() || aiIsTyping) return;

    // Add user message
    const userMsg = {
      role: "user" as const,
      content: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setAiMessages(prev => [...prev, userMsg]);
    setAiText("");
    setAiIsTyping(true);

    try {
      const historyToSend = aiMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/support/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyToSend
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.response) {
          setAiMessages(prev => [...prev, {
            role: "assistant" as const,
            content: data.response,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          throw new Error("Invalid response format");
        }
      } else {
        throw new Error("Failed to reach AI helper");
      }
    } catch (err) {
      setAiMessages(prev => [...prev, {
        role: "assistant" as const,
        content: "I'm having difficulty connecting to my AI brain at the moment. Please try asking again or switch directly to our Live Support Agent desk!",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setAiIsTyping(false);
    }
  };

  const handleEscalateToLive = () => {
    const transcript = aiMessages
      .map(m => `${m.role === "user" ? "Client" : "AI Assistant"} (${m.time}): ${m.content}`)
      .join("\n");

    const escalationMsg = `[Escalation from AI Assistant Chat Transcript]\n\n${transcript}\n\nClient has requested direct escalation to a live support desk agent.`;
    
    setSubject("AI Escalation - Human Assistance Required");
    setInitialMsg(escalationMsg);
    setActiveTab("live");
  };

  const handleDisconnectTicket = () => {
    setActiveTicket(null);
    localStorage.removeItem("mallbuy_active_support_ticket_id");
  };

  // Generate WhatsApp Message & Trigger Redirect for user notification
  const handleNotifyWhatsApp = () => {
    if (!activeTicket) return;
    const ticketId = activeTicket.id;
    const adminPhone = "+254700000100"; // Kenya default support line
    const textMessage = `Hello MallBuy Support, I have initiated an instant support request on the website.\n\n` +
      `📌 Ticket ID: #${ticketId.toUpperCase()}\n` +
      `👤 Client: ${activeTicket.user_name}\n` +
      `📞 M-Pesa Phone: ${activeTicket.user_phone}\n` +
      `💼 Subject: ${activeTicket.subject}\n\n` +
      `Please connect me to a desk support representative!`;

    const formattedText = encodeURIComponent(textMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=${adminPhone}&text=${formattedText}`;
    window.open(waUrl, "_blank");
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="live-support-floating-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="block bg-blue-600 p-4 rounded-full shadow-lg shadow-blue-500/30 hover:scale-110 transition-transform cursor-pointer relative"
        title="Live Support Chat"
      >
        <Headphones className="h-8 w-8 text-white" />
        {/* Unread dot simulation */}
        {ticketsList.some(t => t.unread_by_user) && (
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Floating Support Modal Sheet */}
      {isOpen && (
        <div 
          id="support-chat-sheet"
          className="fixed bottom-24 right-4 sm:right-6 w-[92vw] sm:w-[420px] h-[580px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden font-sans backdrop-blur-md"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-indigo-900 px-5 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center animate-pulse">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  MallBuy Desk Support
                </h4>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                    Live Response Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title={soundEnabled ? "Mute audio" : "Unmute audio"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {/* Minimize Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Minimize Chat"
              >
                <Minus className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                title="Close Chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tab Selector */}
          {!activeTicket && (
            <div className="flex bg-slate-950 border-b border-white/5 p-1">
              <button
                onClick={() => setActiveTab("ai")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "ai"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300/30" />
                Instant AI Help
              </button>
              <button
                onClick={() => setActiveTab("live")}
                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                  activeTab === "live"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Headphones className="h-3.5 w-3.5" />
                Live Support Desk
                {ticketsList.some(t => t.unread_by_user) && (
                  <span className="absolute top-1.5 right-4 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-950/60 flex flex-col min-h-0">
            {activeTicket ? (
              // ACTIVE CHAT SCREEN
              <div className="flex-1 flex flex-col h-full min-h-0">
                {/* Info Card */}
                <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 mb-4 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-300">
                    <span className="text-blue-400 uppercase tracking-wider truncate mr-2">Subject: {activeTicket.subject}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black shrink-0 ${
                      activeTicket.status === "open" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/10 text-slate-400"
                    }`}>
                      {activeTicket.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Ticket: #{activeTicket.id.substring(7).toUpperCase()}</p>
                  
                  {/* Action row */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                    <button
                      onClick={handleNotifyWhatsApp}
                      className="flex-1 flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white py-1.5 rounded-lg font-extrabold text-[11px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <MessageCircle className="h-3 w-3" /> Notify Support
                    </button>
                    <button
                      onClick={handleDisconnectTicket}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      New Support
                    </button>
                  </div>
                </div>

                {/* Messages Bubbles Area */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 min-h-0 flex flex-col">
                  {activeTicket.messages?.map((msg, index) => {
                    const isAdmin = msg.sender_id === "admin";
                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col max-w-[85%] ${isAdmin ? "self-start" : "self-end"}`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-wider mb-1 px-1 ${isAdmin ? "text-blue-400 self-start" : "text-emerald-400 self-end"}`}>
                          {isAdmin ? "Desk Support" : msg.sender_name}
                        </span>
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed font-medium ${
                          isAdmin 
                            ? "bg-slate-800 border border-white/5 rounded-tl-none text-slate-200" 
                            : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-blue-900/20"
                        }`}>
                          {msg.content}
                        </div>
                        <span className={`text-[8.5px] text-slate-500 font-bold mt-1 px-1 ${isAdmin ? "self-start" : "self-end"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Send Reply Input Bar */}
                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-white/5 mt-auto">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    disabled={sendingReply}
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-blue-600 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : activeTab === "ai" ? (
              // AI ASSISTANT CHAT SCREEN
              <div className="flex-1 flex flex-col h-full min-h-0">
                {/* Messages Bubbles Area */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 min-h-0 flex flex-col">
                  {aiMessages.map((msg, index) => {
                    const isAI = msg.role === "assistant";
                    return (
                      <div
                        key={index}
                        className={`flex flex-col max-w-[85%] ${isAI ? "self-start" : "self-end"}`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-wider mb-1 px-1 flex items-center gap-1 ${isAI ? "text-yellow-400 self-start" : "text-emerald-400 self-end"}`}>
                          {isAI && <Sparkles className="h-2 w-2 fill-yellow-400" />}
                          {isAI ? "MallBuy AI Assistant" : "You"}
                        </span>
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed font-medium ${
                          isAI 
                            ? "bg-slate-800 border border-white/5 rounded-tl-none text-slate-200 font-sans" 
                            : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-blue-900/20"
                        }`}>
                          {msg.content}
                        </div>
                        <span className={`text-[8.5px] text-slate-500 font-bold mt-1 px-1 ${isAI ? "self-start" : "self-end"}`}>
                          {msg.time}
                        </span>
                      </div>
                    );
                  })}
                  {aiIsTyping && (
                    <div className="flex flex-col max-w-[85%] self-start">
                      <span className="text-[9px] font-black uppercase tracking-wider mb-1 px-1 text-yellow-400 flex items-center gap-1">
                        <Sparkles className="h-2 w-2 fill-yellow-400" /> MallBuy AI Assistant
                      </span>
                      <div className="bg-slate-800 border border-white/5 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-400 flex items-center gap-1.5 font-semibold">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce [animation-delay:0.2s]">●</span>
                        <span className="animate-bounce [animation-delay:0.4s]">●</span>
                        <span className="text-[9px] ml-1 uppercase font-black text-slate-500 tracking-wider">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>

                {/* Quick actions FAQ panel */}
                {aiMessages.length <= 2 && (
                  <div className="mb-3.5 shrink-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Frequently Asked Inquiries</p>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_QUESTIONS.map((q, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => handleAiSend(e, q.query)}
                          className="p-2.5 text-left bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10.5px] font-extrabold text-slate-300 hover:text-white transition-all leading-tight cursor-pointer"
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Handover Escalation Alert */}
                {aiMessages.length > 1 && (
                  <div className="bg-blue-950/40 border border-blue-900/30 rounded-xl p-3 mb-3 flex items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex-1">
                      <p className="text-[10.5px] font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-blue-400" /> Need human desk review?
                      </p>
                      <p className="text-[9.5px] text-slate-400 mt-0.5 leading-normal">Instantly transfer this chat log to our human support desk.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleEscalateToLive}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9.5px] uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer"
                    >
                      Connect Live
                    </button>
                  </div>
                )}

                {/* Send AI Message Bar */}
                <form onSubmit={(e) => handleAiSend(e)} className="flex gap-2 pt-2 border-t border-white/5 mt-auto shrink-0">
                  <input
                    type="text"
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    placeholder="Ask MallBuy AI support..."
                    className="flex-1 bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    disabled={aiIsTyping}
                  />
                  <button
                    type="submit"
                    disabled={aiIsTyping || !aiText.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-blue-600 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              // CREATE NEW TICKET FORM
              <div className="flex-1 flex flex-col justify-between min-h-0">
                <div className="overflow-y-auto flex-1 pr-1">
                  <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-4">
                    Create an instant desk ticket to chat directly with our legitimate wholesale dispatch support desk. Our administrative team will be paged immediately on-site and through secure WhatsApp channels.
                  </p>

                  <form onSubmit={handleCreateTicket} className="space-y-3.5">
                    {/* Subject/Topic */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Topic/Request Subject *</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Active Order Delay, Deposit Issue, Withdrawal"
                        className="w-full bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                        required
                      />
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Name *</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-500" />
                        <input
                           type="text"
                           value={name}
                           onChange={(e) => setName(e.target.value)}
                           placeholder="Your Name"
                           className="w-full bg-white/5 border border-white/10 pl-10 pr-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                           required
                           disabled={!!currentUser}
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">M-Pesa / Contact Phone *</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0712345678"
                          className="w-full bg-white/5 border border-white/10 pl-10 pr-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                          required
                          disabled={!!currentUser}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address (Optional)</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-500" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-white/5 border border-white/10 pl-10 pr-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                          disabled={!!currentUser}
                        />
                      </div>
                    </div>

                    {/* Initial Message */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Describe your issue in detail *</label>
                      <textarea
                        value={initialMsg}
                        onChange={(e) => setInitialMsg(e.target.value)}
                        placeholder="Please type your message..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 px-3.5 py-2.5 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none font-medium"
                        required
                      />
                    </div>

                    {errorMsg && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs">
                        <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      {isLoading ? (
                        <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Initialize Chat Room</span>
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Tickets list / reconnect view */}
                {ticketsList.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-white/5 shrink-0">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Previous Active Sessions</h5>
                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                      {ticketsList.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => fetchTicketDetails(t.id)}
                          className="flex items-center justify-between p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[11px] font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`h-1.5 w-1.5 rounded-full ${t.status === 'open' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                            <span className="truncate">{t.subject}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>{new Date(t.updated_at).toLocaleDateString([], {month: 'short', day: 'numeric'})}</span>
                            {t.unread_by_user && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
