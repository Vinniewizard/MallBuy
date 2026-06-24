import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Headphones, X, Send, ChevronRight, Phone, Mail, User, ShieldAlert, CheckCircle2, MessageCircle, Clock, Volume2, VolumeX } from "lucide-react";
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const previousMessagesCountRef = useRef<number>(0);

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
          className="fixed bottom-24 right-4 sm:right-6 w-[92vw] sm:w-[420px] h-[550px] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden font-sans backdrop-blur-md"
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
                    Live Response Agent
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                title={soundEnabled ? "Mute audio" : "Unmute audio"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-950/60 flex flex-col">
            {activeTicket ? (
              // ACTIVE CHAT SCREEN
              <div className="flex-1 flex flex-col h-full">
                {/* Info Card */}
                <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 mb-4 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-300">
                    <span className="text-blue-400 uppercase tracking-wider">Subject: {activeTicket.subject}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-black ${
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
                      className="flex-1 flex items-center justify-center gap-1 bg-[#25D366] hover:bg-[#128C7E] text-white py-1.5 rounded-lg font-extrabold text-[11px] uppercase tracking-wider transition-all"
                    >
                      <MessageCircle className="h-3 w-3" /> Notify via WhatsApp
                    </button>
                    <button
                      onClick={handleDisconnectTicket}
                      className="px-2 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
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
            ) : (
              // CREATE NEW TICKET FORM
              <div className="flex-1 flex flex-col justify-between">
                <div>
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
                  <div className="mt-6 pt-5 border-t border-white/5">
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
