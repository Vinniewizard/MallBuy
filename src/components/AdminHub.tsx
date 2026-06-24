import React, { useState, useEffect } from "react";
import { ShieldCheck, Users, Wallet, ListTodo, Plus, Check, X, ToggleLeft, ToggleRight, Sparkles, Server, Edit, Eye, EyeOff, UserCog, ArrowUpDown, ChevronRight, Headphones, MessageSquare, Send, Volume2, VolumeX, Mail, Megaphone } from "lucide-react";
import { Transaction, Purchase, Plan, SupportTicket } from "../types";

interface AdminHubProps {
  onRefresh: () => void;
}

interface AdminUserSummary {
  id: string;
  username: string;
  email: string;
  phone: string;
  referralCode: string;
  referredBy?: string;
  isAdmin: boolean;
  balance: number;
  password?: string;
  country?: string;
  location?: string;
}

export default function AdminHub({ onRefresh }: AdminHubProps) {
  const [activeAdminTab, setActiveAdminTab] = useState<"users" | "transactions" | "purchases" | "plans" | "payment_settings" | "support" | "marketing">("transactions");

  // State data loaded directly
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  
  // Support and live desk state
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [sendingAdminReply, setSendingAdminReply] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [supportFilter, setSupportFilter] = useState<"all" | "open" | "resolved">("all");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Messages and loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Plan Form State
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanAmount, setNewPlanAmount] = useState("");
  const [newPlanReturn, setNewPlanReturn] = useState("");
  const [newPlanDays, setNewPlanDays] = useState("");
  const [newPlanDesc, setNewPlanDesc] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Manual User Registration States
  const [addUsername, setAddUsername] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addInitialBalance, setAddInitialBalance] = useState("");
  const [userFormLoading, setUserFormLoading] = useState(false);

  // User Editing & Direct Balance Adjustment States
  const [selectedManageUser, setSelectedManageUser] = useState<AdminUserSummary | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editCountry, setEditCountry] = useState("Kenya");
  const [editLocation, setEditLocation] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [adjTargetBalance, setAdjTargetBalance] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjType, setAdjType] = useState<"credit" | "debit">("credit");
  const [adjNote, setAdjNote] = useState("");
  const [isAdjLoading, setIsAdjLoading] = useState(false);

  const startManagingUser = (user: AdminUserSummary) => {
    setSelectedManageUser(user);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditPassword(user.password || "");
    setEditIsAdmin(user.isAdmin);
    setEditCountry(user.country || "Kenya");
    setEditLocation(user.location || "Not detected");
    setShowEditPassword(false);
    setAdjTargetBalance("");
    setAdjAmount("");
    setAdjType("credit");
    setAdjNote("");
    setMsg(null);
  };

  const handleEditDetailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManageUser) return;
    setMsg(null);
    setUserFormLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedManageUser.id}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("mallbuy_user_id") || "",
        },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          phone: editPhone,
          password: editPassword,
          isAdmin: editIsAdmin,
          country: editCountry,
          location: editLocation,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: `Successfully updated user details for "${editUsername}"!` });
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update member details." });
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManageUser) return;
    setMsg(null);
    setIsAdjLoading(true);
    try {
      const bodyPayload: any = {
        adjustmentNote: adjNote
      };
      if (adjTargetBalance !== "") {
        bodyPayload.targetBalance = Number(adjTargetBalance);
      } else if (adjAmount !== "") {
        bodyPayload.adjustmentAmount = Number(adjAmount);
        bodyPayload.adjustmentType = adjType;
      } else {
        throw new Error("Please specify either a target balance override or adjustment amount.");
      }

      const response = await fetch(`/api/admin/users/${selectedManageUser.id}/adjust-balance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("mallbuy_user_id") || "",
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: `Balance adjusted successfully for "${selectedManageUser.username}"!` });
      setAdjTargetBalance("");
      setAdjAmount("");
      setAdjNote("");
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to adjust balance." });
    } finally {
      setIsAdjLoading(false);
    }
  };

  // Manual Ledger Injection States
  const [txUserId, setTxUserId] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"deposit" | "withdrawal" | "purchase" | "commission" | "payout">("deposit");
  const [txStatus, setTxStatus] = useState<"approved" | "pending" | "declined">("approved");
  const [txNote, setTxNote] = useState("");
  const [txPhone, setTxPhone] = useState("");
  const [txFormLoading, setTxFormLoading] = useState(false);

  // Neon Cloud DB States
  const [neonStatus, setNeonStatus] = useState<{
    useNeon: boolean;
    maskedUrl: string;
    error: string | null;
    activeProvider: string;
    hasEnv: boolean;
  } | null>(null);
  const [neonLoading, setNeonLoading] = useState(false);

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!addUsername || !addEmail || !addPhone || !addPassword) {
      setMsg({ type: "error", text: "Please fill in all required user fields: Username, Email, Phone, and Password." });
      return;
    }
    setUserFormLoading(true);
    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("mallbuy_user_id") || "",
        },
        body: JSON.stringify({
          username: addUsername,
          email: addEmail,
          phone: addPhone,
          password: addPassword,
          initial_balance: Number(addInitialBalance) || 0,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: `Successfully enrolled member "${addUsername}" into database!` });
      setAddUsername("");
      setAddEmail("");
      setAddPhone("");
      setAddPassword("");
      setAddInitialBalance("");
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to add user." });
    } finally {
      setUserFormLoading(false);
    }
  };

  const handleAddTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!txUserId || !txAmount || !txType || !txStatus) {
      setMsg({ type: "error", text: "Please select a target user and set ledger amounts." });
      return;
    }
    setTxFormLoading(true);
    try {
      const response = await fetch("/api/admin/transactions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("mallbuy_user_id") || "",
        },
        body: JSON.stringify({
          target_user_id: txUserId,
          amount: Number(txAmount),
          transaction_type: txType,
          status: txStatus,
          note: txNote,
          phone: txPhone,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: `Successfully injected administrative ledger transaction record!` });
      setTxAmount("");
      setTxNote("");
      setTxPhone("");
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to record manual ledger transaction." });
    } finally {
      setTxFormLoading(false);
    }
  };

  // Payment settings state
  const [paySettings, setPaySettings] = useState({
    mpesa_enabled: true,
    crypto_enabled: true,
    nowpayments_sandbox: true,
    nowpayments_api_key: "",
    min_deposit: "" as string | number,
    max_deposit: "" as string | number,
    min_withdrawal: "" as string | number,
    max_withdrawal: "" as string | number,
    whatsapp_enabled: true,
    whatsapp_url: "https://chat.whatsapp.com/Ljjp8G34scTCVzLeFCt35F",
  });
  const [envDetected, setEnvDetected] = useState({
    nowpayments_api_key_set: false,
    nowpayments_base_url: "https://api.nowpayments.io/v1",
    nowpayments_base_url_set: false,
    ipn_callback_url: "",
  });
  const [paySettingsLoading, setPaySettingsLoading] = useState(false);

  const loadAdminState = async () => {
    try {
      const h_id = localStorage.getItem("mallbuy_user_id") || "";
      const opt = { headers: { "x-user-id": h_id } };

      const [usersRes, txsRes, invRes, plansRes, payRes, supportRes] = await Promise.all([
        fetch("/api/admin/users", opt),
        fetch("/api/admin/transactions", opt),
        fetch("/api/admin/purchases", opt),
        fetch("/api/plans"),
        fetch("/api/admin/payment-settings", opt),
        fetch("/api/admin/support-tickets", opt),
      ]);

      const uData = await usersRes.json();
      const tData = await txsRes.json();
      const iData = await invRes.json();
      const pData = await plansRes.json();
      const payData = await payRes.json();
      const supportData = await supportRes.json();

      if (uData.users) {
        setUsers(uData.users);
        if (uData.users.length > 0) {
          setTxUserId((prev) => prev || uData.users[0].id);
        }
        setSelectedManageUser((prevSelected) => {
          if (!prevSelected) return null;
          const fresh = uData.users.find((u: any) => u.id === prevSelected.id);
          return fresh || prevSelected;
        });
      }
      if (tData.transactions) setTxs(tData.transactions);
      if (iData.purchases) setPurchases(iData.purchases);
      if (pData.plans) setPlans(pData.plans);
      if (supportData.tickets) setSupportTickets(supportData.tickets);
      if (payData.paymentSettings) {
        setPaySettings({
          ...payData.paymentSettings,
          min_deposit: payData.paymentSettings.min_deposit ?? "",
          max_deposit: payData.paymentSettings.max_deposit ?? "",
          min_withdrawal: payData.paymentSettings.min_withdrawal ?? "",
          max_withdrawal: payData.paymentSettings.max_withdrawal ?? "",
          whatsapp_enabled: payData.paymentSettings.whatsapp_enabled ?? true,
          whatsapp_url: payData.paymentSettings.whatsapp_url || "https://chat.whatsapp.com/Ljjp8G34scTCVzLeFCt35F",
        });
      }
      if (payData.envDetected) {
        setEnvDetected(payData.envDetected);
      }

      // Load Neon database status
      setNeonLoading(true);
      try {
        const neonRes = await fetch("/api/admin/neon/status", opt);
        if (neonRes.ok) {
          const nData = await neonRes.json();
          setNeonStatus(nData);
        }
      } catch (ne) {
        console.error("Failed fetching neon status", ne);
      } finally {
        setNeonLoading(false);
      }
    } catch (err) {
      console.error("Failed to load admin logs", err);
    }
  };

  useEffect(() => {
    loadAdminState();
  }, []);

  // Double ring administrative desktop-like beep
  const playAdminDoubleRing = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(660.00, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.24);
      }, 120);
    } catch (err) {
      console.log("Audio notification error:", err);
    }
  };

  // Support notifications and real-time alerts polling system (runs every 5s)
  useEffect(() => {
    const pollNotifications = () => {
      const h_id = localStorage.getItem("mallbuy_user_id") || "";
      if (!h_id) return;
      
      fetch("/api/admin/support-notifications", {
        headers: { "x-user-id": h_id }
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Unauthorized notification check");
        })
        .then((data) => {
          // Play distinct sound if unreadCount increased or is positive
          if (data.unreadCount > unreadSupportCount) {
            playAdminDoubleRing();
          }
          setUnreadSupportCount(data.unreadCount);
        })
        .catch((e) => console.log("Real-time notification polling skipped:", e.message));
    };

    // Initial load
    pollNotifications();
    const interval = setInterval(pollNotifications, 5000);
    return () => clearInterval(interval);
  }, [unreadSupportCount, soundEnabled]);

  // Live polling for the selected active ticket messaging when the admin is active on the support tab (runs every 3s)
  useEffect(() => {
    if (activeAdminTab !== "support" || !selectedTicketId) return;

    const interval = setInterval(() => {
      const h_id = localStorage.getItem("mallbuy_user_id") || "";
      fetch(`/api/support/tickets/${selectedTicketId}`, {
        headers: { "x-user-id": h_id }
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Stale ticket fetch");
        })
        .then((data) => {
          if (data.ticket) {
            // Update the selected ticket content dynamically
            setSupportTickets((prevTickets) =>
              prevTickets.map((t) => (t.id === selectedTicketId ? data.ticket : t))
            );
          }
        })
        .catch((err) => console.log("Active support ticket tracking issue:", err));
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTicketId, activeAdminTab]);

  const handleTxApprove = async (id: string) => {
    setActionLoading(id);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/transactions/${id}/approve`, {
        method: "POST",
        headers: { "x-user-id": localStorage.getItem("mallbuy_user_id") || "" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: "Transaction successfully verified and approved." });
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to approve transaction." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedTicketId) return;

    setSendingAdminReply(true);
    try {
      const h_id = localStorage.getItem("mallbuy_user_id") || "";
      const res = await fetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": h_id
        },
        body: JSON.stringify({
          content: adminReplyText,
          sender_name: "Desk Support (Admin)",
          sender_id: "admin"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminReplyText("");
        // Reload ticket details instantly
        const updatedTickets = supportTickets.map((t) => 
          t.id === selectedTicketId ? data.ticket : t
        );
        setSupportTickets(updatedTickets);
      }
    } catch (err) {
      console.error("Failed to send admin reply:", err);
    } finally {
      setSendingAdminReply(false);
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const h_id = localStorage.getItem("mallbuy_user_id") || "";
      const res = await fetch(`/api/admin/support-tickets/${ticketId}/resolve`, {
        method: "POST",
        headers: { "x-user-id": h_id }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const updatedTickets = supportTickets.map((t) => 
          t.id === ticketId ? data.ticket : t
        );
        setSupportTickets(updatedTickets);
        setMsg({ type: "success", text: "Ticket successfully marked as RESOLVED/CLOSED." });
      }
    } catch (err) {
      console.error("Failed to resolve ticket:", err);
    }
  };

  const handleTxDecline = async (id: string) => {
    setActionLoading(id);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/transactions/${id}/decline`, {
        method: "POST",
        headers: { "x-user-id": localStorage.getItem("mallbuy_user_id") || "" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: "Transaction request declined." });
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to decline." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvComplete = async (id: string) => {
    setActionLoading(id);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/purchases/${id}/complete`, {
        method: "POST",
        headers: { "x-user-id": localStorage.getItem("mallbuy_user_id") || "" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: "Order forced to maturity successfully! Payout credited to user." });
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to trigger." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvCancel = async (id: string) => {
    setActionLoading(id);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/purchases/${id}/cancel`, {
        method: "POST",
        headers: { "x-user-id": localStorage.getItem("mallbuy_user_id") || "" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: "Order cancelled. User's seed funds refunded to their account ledger." });
      await loadAdminState();
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to cancel." });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePlanToggle = async (id: string) => {
    setActionLoading(id);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/plans/${id}/toggle`, {
        method: "POST",
        headers: { "x-user-id": localStorage.getItem("mallbuy_user_id") || "" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      await loadAdminState();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed key toggle." });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!newPlanName || !newPlanAmount || !newPlanReturn || !newPlanDays) {
      setMsg({ type: "error", text: "Please enter all structural inputs." });
      return;
    }

    try {
      const url = editingPlanId ? `/api/admin/plans/${editingPlanId}/edit` : "/api/admin/plans/create";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("mallbuy_user_id") || "",
        },
        body: JSON.stringify({
          name: newPlanName,
          amount: Number(newPlanAmount),
          return_amount: Number(newPlanReturn),
          duration_days: Number(newPlanDays),
          description: newPlanDesc,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: `Package ${newPlanName} successfully ${editingPlanId ? "updated" : "seeded"} in Marketplace!` });
      resetPlanForm();
      await loadAdminState();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || `Failed to ${editingPlanId ? "update" : "create"} package plan.` });
    }
  };

  const handleEditPlanClick = (p: Plan) => {
    setEditingPlanId(p.id);
    setNewPlanName(p.name);
    setNewPlanAmount(p.amount.toString());
    setNewPlanReturn(p.return_amount.toString());
    setNewPlanDays(p.duration_days.toString());
    setNewPlanDesc(p.description || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetPlanForm = () => {
    setEditingPlanId(null);
    setNewPlanName("");
    setNewPlanAmount("");
    setNewPlanReturn("");
    setNewPlanDays("");
    setNewPlanDesc("");
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the package "${name}"?`)) return;
    setActionLoading(id);
    setMsg(null);
    try {
      const response = await fetch(`/api/admin/plans/${id}/delete`, {
        method: "POST",
        headers: { "x-user-id": localStorage.getItem("mallbuy_user_id") || "" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: "Package successfully deleted." });
      if (editingPlanId === id) resetPlanForm();
      await loadAdminState();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to delete plan." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDatabaseReset = async () => {
    if (!window.confirm("Restore entire sandbox database to pre-seeded clean defaults? All custom registrations will clear.")) return;
    try {
      const response = await fetch("/api/admin/reset", {
        method: "POST",
      });
      await loadAdminState();
      onRefresh();
      setMsg({ type: "success", text: "Database safely reset." });
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setPaySettingsLoading(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": localStorage.getItem("mallbuy_user_id") || "",
        },
        body: JSON.stringify(paySettings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.paymentSettings) {
        setPaySettings({
          ...data.paymentSettings,
          min_deposit: data.paymentSettings.min_deposit ?? "",
          max_deposit: data.paymentSettings.max_deposit ?? "",
          min_withdrawal: data.paymentSettings.min_withdrawal ?? "",
          max_withdrawal: data.paymentSettings.max_withdrawal ?? "",
          whatsapp_enabled: data.paymentSettings.whatsapp_enabled ?? true,
          whatsapp_url: data.paymentSettings.whatsapp_url || "https://chat.whatsapp.com/Ljjp8G34scTCVzLeFCt35F",
        });
      }
      if (data.envDetected) {
        setEnvDetected(data.envDetected);
      }
      setMsg({ type: "success", text: "Global Payment configs updated and applied instantly to cashier ledger!" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to save gateway config settings." });
    } finally {
      setPaySettingsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
            <ShieldCheck className="h-5 text-red-400 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
              MallBuy Administrator Command Console
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Validate pending member deposits/withdrawals, reset state data, or manage return packages.
            </p>
          </div>
        </div>

        <button
          onClick={handleDatabaseReset}
          className="bg-red-950/20 hover:bg-red-900/30 text-rose-300 font-bold border border-red-550/30 font-mono text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
        >
          Reset Sandbox Database
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-xs leading-relaxed font-semibold flex items-center gap-3 ${
            msg.type === "success"
              ? "bg-[#0b251a] border-emerald-500/10 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-300"
          }`}
        >
          <span>{msg.text}</span>
        </div>
      )}

      {/* Selector Subtabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#212a3d] pb-0.5 pt-1">
        {[
          { id: "transactions", label: "Financial Approvals Queue", icon: Wallet },
          { id: "purchases", label: "Active Order Controller", icon: ListTodo },
          { id: "users", label: "Registrations & Balances", icon: Users },
          { id: "plans", label: "Return Packages & Seeding", icon: Server },
          { id: "payment_settings", label: "Gateways Control Center", icon: ToggleRight },
          { id: "support", label: "Support Desk Center", icon: Headphones },
          { id: "marketing", label: "Marketing Hub", icon: Megaphone },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveAdminTab(tab.id as any);
                setMsg(null);
              }}
              className={`pb-3 px-2.5 text-xs font-bold tracking-wider relative transition-colors cursor-pointer flex items-center gap-2 ${
                isActive ? "text-red-400 font-black" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === "support" && unreadSupportCount > 0 && (
                <span className="bg-red-500 text-white rounded-full text-[9.5px] px-1.5 py-0.5 ml-0.5 font-extrabold animate-pulse">
                  {unreadSupportCount}
                </span>
              )}
              {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-450 rounded-full"></div>}
            </button>
          );
        })}
      </div>

      {/* Tab contents */}

      {/* Financial Queue */}
      {activeAdminTab === "transactions" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Inject manual transaction form (left 5 cols) */}
          <form onSubmit={handleAddTxSubmit} className="lg:col-span-5 bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6 space-y-4 font-medium">
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5 bg-[#0f131d]">
                <Plus className="h-4.5 w-4.5 text-red-500" />
                Inject Manual Transaction
              </h3>
              <p className="text-[10px] text-slate-450">
                Directly inject manual deposits, commissions, fees, withdrawals or commission entries for any user.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Member *</label>
              <select
                required
                value={txUserId}
                onChange={(e) => setTxUserId(e.target.value)}
                className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none font-sans cursor-pointer"
              >
                <option value="" disabled>Select User Account</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.phone})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ledger Type *</label>
                <select
                  required
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none font-sans cursor-pointer"
                >
                  <option value="deposit">Deposit (Inflow)</option>
                  <option value="withdrawal">Withdrawal (Outflow)</option>
                  <option value="commission">Commission (Referrals)</option>
                  <option value="payout">Payout (Earnings)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entry Status *</label>
                <select
                  required
                  value={txStatus}
                  onChange={(e) => setTxStatus(e.target.value as any)}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none font-sans cursor-pointer"
                >
                  <option value="approved">Approved (Balance Adjust)</option>
                  <option value="pending">Pending (Awaiting Hold)</option>
                  <option value="declined">Declined (Cancelled)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount (KSh) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1500"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sender line / Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 0711223344"
                  value={txPhone}
                  onChange={(e) => setTxPhone(e.target.value)}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Narrative Note</label>
              <input
                type="text"
                placeholder="e.g. manual balance adjustment"
                value={txNote}
                onChange={(e) => setTxNote(e.target.value)}
                className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none font-sans font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={txFormLoading}
              className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-transform duration-200 cursor-pointer active:scale-[0.99] shadow-md disabled:opacity-50 font-sans"
            >
              <Plus className="h-4 w-4" />
              {txFormLoading ? "Recording Transaction..." : "Inject Ledger Record"}
            </button>
          </form>

          {/* Table list */}
          <div className="lg:col-span-7 bg-[#0f131d] border border-[#212a3d] rounded-2xl overflow-hidden">
            <div className="p-4 bg-[#0c0f16] border-b border-[#212a3d]/70">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                Pending and Complete Ledger Requests
              </h3>
            </div>

            {txs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No transaction requests in ledger history.</div>
            ) : (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#0c0f16] text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-[#212a3d]">
                      <th className="p-4 font-semibold">User</th>
                      <th className="p-4 font-semibold">Transfer Type</th>
                      <th className="p-4 font-semibold">Phone (M-Pesa)</th>
                      <th className="p-4 font-semibold">Amount</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold text-right">Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#212a3d]/50">
                    {txs.map((tx) => {
                      const isPending = tx.status === "pending";
                      return (
                        <tr key={tx.id} className="hover:bg-[#121824]/30 font-medium">
                          <td className="p-4 flex flex-col gap-0.5">
                            <span className="font-bold text-slate-200">{tx.username}</span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {tx.user_id}</span>
                          </td>
                          <td className="p-4">
                            <span className="fundsize font-bold text-slate-200">{tx.transaction_type}</span>
                            <span className="block text-[10px] text-slate-400 max-w-[150px] truncate">{tx.note}</span>
                          </td>
                          <td className="p-4 font-mono text-slate-400">{tx.phone || "None"}</td>
                          <td className="p-4 font-mono font-bold text-slate-200">KSh {tx.amount.toLocaleString()}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                                tx.status === "approved"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : tx.status === "declined"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {isPending ? (
                              <div className="inline-flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleTxApprove(tx.id)}
                                  disabled={actionLoading !== null}
                                  className="bg-[#0b251a] hover:bg-emerald-500 hover:text-white text-emerald-400 text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border border-emerald-500/20 cursor-pointer flex items-center gap-1 transition-all"
                                >
                                  <Check className="h-3 w-3" /> Approve
                                </button>
                                <button
                                  onClick={() => handleTxDecline(tx.id)}
                                  disabled={actionLoading !== null}
                                  className="bg-red-500/10 hover:bg-red-650 hover:text-white text-rose-400 text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border border-red-500/20 cursor-pointer flex items-center gap-1 transition-all"
                                >
                                  <X className="h-3 w-3" /> Decline
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Processed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Orders Controller */}
      {activeAdminTab === "purchases" && (
        <div className="bg-[#0f131d] border border-[#212a3d] rounded-2xl overflow-hidden">
          <div className="p-4 bg-[#0c0f16] border-b border-[#212a3d]/70">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Simulated Server Active Orders
            </h3>
          </div>

          {purchases.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No purchase logs in history.</div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0c0f16] text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-[#212a3d]">
                    <th className="p-4 font-semibold">User</th>
                    <th className="p-4 font-semibold">Tier Plan</th>
                    <th className="p-4 font-semibold">Funds Principal</th>
                    <th className="p-4 font-semibold">Maturity Return</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Force Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#212a3d]/50">
                  {purchases.map((inv) => {
                    const isActive = inv.status === "active";
                    return (
                      <tr key={inv.id} className="hover:bg-[#121824]/30 font-medium">
                        <td className="p-4 font-bold text-slate-200">{inv.username}</td>
                        <td className="p-4 font-bold text-slate-200">
                          {inv.planName}
                          <span className="block text-[10px] text-slate-400 font-mono font-medium">
                            Matures: {new Date(inv.matures_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-400">KSh {inv.amount.toLocaleString()}</td>
                        <td className="p-4 font-mono font-bold text-emerald-400">KSh {inv.return_amount.toLocaleString()}</td>
                        <td className="p-4 text-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                              inv.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10"
                                : inv.status === "cancelled"
                                ? "bg-rose-500/10 text-rose-450 border-rose-500/15"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/15"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {isActive ? (
                            <div className="inline-flex gap-1 justify-end">
                              <button
                                onClick={() => handleInvComplete(inv.id)}
                                disabled={actionLoading !== null}
                                className="bg-[#0b251a] hover:bg-emerald-500 hover:text-white text-emerald-400 text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg border border-emerald-500/20 cursor-pointer flex items-center gap-1 transition-all"
                              >
                                Complete Early
                              </button>
                              <button
                                onClick={() => handleInvCancel(inv.id)}
                                disabled={actionLoading !== null}
                                className="bg-red-500/10 hover:bg-red-600 hover:text-white text-rose-400 text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg border border-red-500/15 cursor-pointer flex items-center gap-1 transition-all"
                              >
                                Cancel & Refund
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">No active actions</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Registrations & Balances */}
      {activeAdminTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Enroll user or Edit user form (left 5 columns) */}
          {selectedManageUser ? (
            <div className="lg:col-span-5 space-y-6">
              {/* Form 1: Edit Details (Username, email, phone, password, isAdmin) */}
              <form onSubmit={handleEditDetailSubmit} className="bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6 space-y-4 font-medium relative">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5 bg-[#0f131d]">
                      <UserCog className="h-4.5 w-4.5 text-red-500 animate-pulse" />
                      Edit Member details
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Modifying record details for: <span className="text-red-400 font-bold font-mono">{selectedManageUser.username}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedManageUser(null)}
                    className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. JohnDoe"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-sans outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0712345678"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      User Password (Plain-Text Display & Modification) *
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        required
                        placeholder="Configure strong password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 pr-10 py-2.5 text-xs text-slate-200 font-sans outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showEditPassword ? "Hide password" : "Show password"}
                      >
                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Country *</label>
                    <select
                      value={editCountry}
                      onChange={(e) => setEditCountry(e.target.value)}
                      className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-3 py-2.5 text-xs text-slate-200 font-bold outline-none cursor-pointer"
                    >
                      <option value="Kenya">🇰🇪 Kenya</option>
                      <option value="Uganda">🇺🇬 Uganda</option>
                      <option value="Tanzania">🇹🇿 Tanzania</option>
                      <option value="Rwanda">🇷🇼 Rwanda</option>
                      <option value="Nigeria">🇳🇬 Nigeria</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detected Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Nairobi, Kenya"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#0c0f16] border border-[#212a3d] p-3 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="block text-[11px] font-bold text-slate-300">Grant Administrator permissions</span>
                    <span className="block text-[9px] text-slate-400">Allow full systems panel access roles.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditIsAdmin(!editIsAdmin)}
                    className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {editIsAdmin ? (
                      <ToggleRight className="h-8 w-8 text-red-500" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-slate-300" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={userFormLoading}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-transform duration-200 cursor-pointer active:scale-[0.99] shadow-md disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {userFormLoading ? "Saving Changes..." : "Apply Member Details Update"}
                </button>
              </form>

              {/* Form 2: Direct Balance adjustments */}
              <form onSubmit={handleAdjustBalanceSubmit} className="bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6 space-y-4 font-medium">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5 bg-[#0f131d]">
                    <ArrowUpDown className="h-4.5 w-4.5 text-emerald-400" />
                    Manipulate / Override Account Balance
                  </h3>
                  <div className="flex items-center justify-between bg-emerald-950/15 border border-emerald-500/20 px-3 py-2 rounded-xl mt-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Enrolled Cash Balance:</span>
                    <span className="text-xs font-black font-mono text-emerald-450">KSh {selectedManageUser.balance.toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-[#212a3d]/50 my-2 pt-2">
                  <span className="block text-[10px] uppercase font-bold text-amber-550 mb-1 tracking-wider">Method A: Override to Exact Target</span>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">New Target Balance (KSh)</label>
                    <input
                      type="number"
                      placeholder="e.g. 100000 (Calculates positive/negative diff automatically!)"
                      value={adjTargetBalance}
                      onChange={(e) => {
                        setAdjTargetBalance(e.target.value);
                        setAdjAmount(""); // Clear other method
                      }}
                      className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2 text-xs text-slate-200 font-mono outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-[#212a3d]/50 my-2 pt-2">
                  <span className="block text-[10px] uppercase font-bold text-slate-450 mb-2 tracking-wider">Method B: Multi-directional adjustment</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Amount (KSh)</label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={adjAmount}
                        onChange={(e) => {
                          setAdjAmount(e.target.value);
                          setAdjTargetBalance(""); // Clear other method
                        }}
                        className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2 text-xs text-slate-200 font-mono outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Change Direction</label>
                      <select
                        value={adjType}
                        onChange={(e) => setAdjType(e.target.value as any)}
                        className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold outline-none cursor-pointer"
                      >
                        <option value="credit">Credit / Add to balance (+)</option>
                        <option value="debit">Debit / Subtract from balance (-)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Adjustment Memo Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Correction for safe deposit failure"
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAdjLoading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-[#005a3e] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-transform duration-200 cursor-pointer active:scale-[0.99] shadow-md disabled:opacity-50"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {isAdjLoading ? "Updating Balance Ledger..." : "Apply Financial Adjustment"}
                </button>
              </form>
            </div>
          ) : (
            /* Enroll user form (left 5 columns) */
            <form onSubmit={handleAddUserSubmit} className="lg:col-span-5 bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6 space-y-4 font-medium">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5 bg-[#0f131d]">
                  <Plus className="h-4.5 w-4.5 text-red-500" />
                  Enroll New Member
                </h3>
                <p className="text-[10px] text-slate-450">
                  Enroll a new user account directly into our cloud database.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JohnDoe"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-sans outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0712345678"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Set account password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-sans outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seed Balance (KSh)</label>
                  <input
                    type="number"
                    placeholder="Optional, e.g. 5000"
                    value={addInitialBalance}
                    onChange={(e) => setAddInitialBalance(e.target.value)}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={userFormLoading}
                className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-transform duration-200 cursor-pointer active:scale-[0.99] shadow-md disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {userFormLoading ? "Enrolling Member..." : "Enroll Active Member"}
              </button>
            </form>
          )}

          {/* Table display (right 7 columns) */}
          <div className="lg:col-span-7 bg-[#0f131d] border border-[#212a3d] rounded-2xl overflow-hidden">
            <div className="p-4 bg-[#0c0f16] border-b border-[#212a3d]/70 flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                Enrolled Members database logs
              </h3>
              {selectedManageUser && (
                <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold font-mono">
                  MANAGING: {selectedManageUser.username}
                </span>
              )}
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0c0f16] text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-[#212a3d]">
                    <th className="p-4 font-semibold">Username</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">Phone</th>
                    <th className="p-4 font-semibold">Referral Code</th>
                    <th className="p-4 font-semibold text-right">Wallet Balance</th>
                    <th className="p-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#212a3d]/50 text-slate-300 font-medium">
                  {users.map((u) => {
                    const isBeingManaged = selectedManageUser?.id === u.id;
                    return (
                      <tr key={u.id} className={`hover:bg-[#121824]/30 ${isBeingManaged ? "bg-red-500/5 font-bold" : ""}`}>
                        <td className="p-4 font-bold text-slate-200 flex flex-col gap-0.5">
                          <span className="flex items-center gap-1.5">
                            {u.username}
                            {u.isAdmin && (
                              <span className="bg-red-500/15 border border-red-500/20 text-red-400 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                                ADMIN
                              </span>
                            )}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono select-all">PWD: {u.password || "••••••••"}</span>
                          <span className="text-[10px] text-indigo-400 font-semibold flex items-center gap-1 mt-0.5">
                            🌍 {u.country || "Kenya"}
                          </span>
                        </td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4">
                          <span className="font-mono block">{u.phone}</span>
                          <span className="text-[10px] text-emerald-400 block mt-0.5 leading-tight select-all max-w-[150px] truncate" title={u.location}>
                            📍 {u.location || "Not detected"}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-400">
                          {u.referralCode}
                          {u.referredBy && <span className="block text-[9px] text-slate-400 normal">Referred by ID: {u.referredBy}</span>}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-450">KSh {u.balance.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => startManagingUser(u)}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                              isBeingManaged 
                                ? "bg-red-500 text-white font-black animate-pulse" 
                                : "bg-[#212a3d] hover:bg-slate-700 hover:text-white text-slate-305"
                            }`}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Return Packages Manager & Creation */}
      {activeAdminTab === "plans" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Seeder form */}
          <form onSubmit={handlePlanSubmit} className="lg:col-span-5 bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6 space-y-4 font-medium">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5 text-red-450" />
                  {editingPlanId ? "Edit Package" : "Seed New Package"}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {editingPlanId ? "Update package parameters." : "Deploy active dynamic items instantly to the marketplace cards."}
                </p>
              </div>
              {editingPlanId && (
                <button type="button" onClick={resetPlanForm} className="text-xs text-red-400 hover:text-red-300 font-bold ml-2">Cancel</button>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plan Display Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Diamond (VIP)"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Price Funds (KSh) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000"
                  value={newPlanAmount}
                  onChange={(e) => setNewPlanAmount(e.target.value)}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Return Payout (KSh) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 100000"
                  value={newPlanReturn}
                  onChange={(e) => setNewPlanReturn(e.target.value)}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration Cycle (Days) *</label>
              <input
                type="number"
                required
                placeholder="e.g. 14"
                value={newPlanDays}
                onChange={(e) => setNewPlanDays(e.target.value)}
                className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
              <input
                type="text"
                placeholder="Short descriptive tagline"
                value={newPlanDesc}
                onChange={(e) => setNewPlanDesc(e.target.value)}
                className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-medium outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-400 text-[#0c0f16] font-bold text-xs flex items-center justify-center gap-2 transition-transform duration-200 cursor-pointer active:scale-[0.99] shadow-md shadow-red-950/20"
            >
              <Plus className="h-4 w-4" />
              {editingPlanId ? "Update Return Package" : "Build Return Package"}
            </button>
          </form>

          {/* Configuration List (7 cols) */}
          <div className="lg:col-span-7 bg-[#0f131d] border border-[#212a3d] rounded-2xl overflow-hidden text-xs">
            <div className="p-4 bg-[#0c0f16] border-b border-[#212a3d]/70">
              <h3 className="text-xs font-extrabold text-slate-350 uppercase tracking-wider">
                Existing marketplace packages
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-medium">
                <thead>
                  <tr className="bg-[#0c0f16] text-slate-400 uppercase text-[9px] font-bold tracking-wider border-b border-[#212a3d]">
                    <th className="p-4 font-semibold whitespace-nowrap">Tier Plan</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Funds Required</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Return Payout</th>
                    <th className="p-4 font-semibold whitespace-nowrap">Cycle</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Visibility Action</th>
                    <th className="p-4 font-semibold text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#212a3d]/50 text-slate-300">
                  {plans.map((p) => (
                    <tr key={p.id} className="hover:bg-[#121824]/30">
                      <td className="p-4 font-bold text-slate-200 whitespace-nowrap">{p.name}</td>
                      <td className="p-4 font-mono font-bold text-slate-400 whitespace-nowrap">KSh {p.amount.toLocaleString()}</td>
                      <td className="p-4 font-mono font-bold text-emerald-450 whitespace-nowrap">KSh {p.return_amount.toLocaleString()}</td>
                      <td className="p-4 font-mono font-bold text-slate-200 whitespace-nowrap">{p.duration_days} Days</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handlePlanToggle(p.id)}
                          disabled={actionLoading !== null}
                          className={`inline-flex items-center gap-1 text-[9px] uppercase font-mono font-black border tracking-wider rounded-lg px-2 py-1 cursor-pointer transition-colors ${
                            p.active
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                          }`}
                        >
                          {p.active ? "Visible" : "Hidden"}
                        </button>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditPlanClick(p)}
                          className="bg-slate-700 hover:bg-slate-600 text-white text-[9px] uppercase px-2 py-1 rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlan(p.id, p.name)}
                          disabled={actionLoading !== null}
                          className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] uppercase px-2 py-1 rounded-lg cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === "payment_settings" && (
        <div className="space-y-6">
          {/* Neon Database Integration Status panel */}
          <div className="bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#212a3d] pb-4">
              <div className="flex items-center gap-2.5">
                <div className={`h-2.5 w-2.5 rounded-full ${neonStatus?.useNeon ? 'bg-emerald-450' : 'bg-amber-450'} animate-pulse`} />
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    Neon Serverless Postgres Database Status
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-none">External cloud database connectivity, sync buffers and telemetry logs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={loadAdminState}
                disabled={neonLoading}
                className="bg-[#182030] hover:bg-[#202b3f] hover:text-white border border-[#212a3d] rounded-xl px-3 py-1.5 text-[9px] uppercase font-bold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {neonLoading ? (
                  <span className="h-3 w-3 border-2 border-white/20 border-t-transparent rounded-full animate-spin"></span>
                ) : "Refresh Health Connection"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div className="lg:col-span-8 space-y-3.5 text-slate-300 font-medium">
                <p className="text-xs leading-relaxed text-slate-300">
                  MallBuy supports automatic dynamic bridging to external cloud-hosted relational structures. Connecting to your 
                  <strong className="text-white"> Neon Serverless Postgres Database</strong> provides bulletproof cloud database persistence, 
                  instant transaction state safety, multi-host sync, and cluster high-availability properties.
                </p>

                <div className="bg-[#0c0f16] border border-[#212a3d] p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 uppercase font-black tracking-wider">Masked Database Connection Details</span>
                    <span className="font-mono text-indigo-400 font-extrabold">Driver: PgPool Core</span>
                  </div>
                  <div className="bg-[#111622] rounded border border-[#212a3d] p-2.5 font-mono text-[10px] text-indigo-300 break-all select-all font-bold">
                    {neonStatus?.maskedUrl || "No database coordinates detected"}
                  </div>
                </div>

                {!neonStatus?.useNeon && (
                  <div className="bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl text-[11px] leading-relaxed text-amber-300/90 space-y-1">
                    <span className="font-black text-amber-400 block tracking-wide uppercase text-[10px]">💡 HOW TO PERMANENTLY LINK NEON DATABASE:</span>
                    <p>1. Provision free PostgreSQL database at <a href="https://neon.tech" target="_blank" rel="noreferrer" className="underline text-amber-350 hover:text-amber-200">neon.tech</a>.</p>
                    <p>2. Copy your connection URL (format <code className="bg-[#0c0f16]/80 px-1 py-0.5 rounded text-rose-350 font-bold font-mono">postgres://...</code> or <code className="bg-[#0c0f16]/80 px-1 py-0.5 rounded text-rose-350 font-bold font-mono">postgresql://...</code>).</p>
                    <p>3. Configure the string as environment variable <code className="bg-[#0c0f16]/80 px-1 py-0.5 rounded text-amber-200 font-mono">DATABASE_URL</code> or <code className="bg-[#0c0f16]/80 px-1 py-0.5 rounded text-amber-200 font-mono">NEON_DATABASE_URL</code> using the settings sidebar menu. The container automatically initiates transaction structures on launch!</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 bg-[#0c0f16] border border-[#212a3d] rounded-xl p-4.5 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest block mb-2">DB Telemetry Indicators</span>
                  <div className="space-y-3.5">
                    <div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wider block">Active Storage Engine:</span>
                      <span className="text-xs font-black text-white block mt-0.5">
                        {neonStatus?.activeProvider || "Scanning Active Port..."}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-slate-400 uppercase font-bold tracking-wider block">Integration Binding:</span>
                      <span className={`inline-flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase mt-1 px-2.5 py-1 rounded-full border ${
                        neonStatus?.useNeon
                          ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20"
                          : neonStatus?.hasEnv
                          ? "bg-rose-500/5 text-rose-400 border-rose-500/20"
                          : "bg-indigo-500/5 text-indigo-400 border-[#212a3d]"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${neonStatus?.useNeon ? 'bg-emerald-400 animate-pulse' : neonStatus?.hasEnv ? 'bg-rose-500' : 'bg-indigo-400'}`} />
                        {neonStatus?.useNeon ? 'Active Cloud Connected' : neonStatus?.hasEnv ? 'Gateway Link Refused' : 'Local Sandbox Mode'}
                      </span>
                    </div>
                  </div>
                </div>

                {neonStatus?.error ? (
                  <div className="text-[10px] text-rose-300 border border-rose-500/25 bg-rose-550/10 p-3 rounded-xl font-bold font-mono tracking-tight leading-normal overflow-auto max-h-[80px]">
                    Connection Failure Log:<br />{neonStatus.error}
                  </div>
                ) : neonStatus?.useNeon ? (
                  <div className="text-[9.5px] text-emerald-400 border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 rounded-xl font-bold tracking-tight">
                    ✅ Neon Cloud system is working perfectly. User accounts, withdrawal requests, and return allocations are locked in.
                  </div>
                ) : (
                  <div className="text-[9.5px] text-slate-400 border border-[#212a3d] bg-slate-900/40 px-3 py-2 rounded-xl font-medium tracking-tight">
                    🕒 Displaying local test environment values. Connect a database to sync live balances with multiple servers.
                  </div>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handlePaymentSettingsSubmit} className="space-y-6 bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6">
          <div className="border-b border-[#212a3d] pb-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ToggleRight className="text-emerald-400 h-4.5 w-4.5" />
              Global Payment Gateways Control Desk
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium select-none">
              Control which checkout methods are active for users, configure access credentials, and activate test frameworks instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Safaricom M-Pesa Integration (Lipia Online API) */}
            <div className="bg-[#0c0f16]/90 border border-[#212a3d] p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block font-sans">
                  Safaricom M-Pesa Mobile Method
                </span>
                <button
                  type="button"
                  onClick={() => setPaySettings({ ...paySettings, mpesa_enabled: !paySettings.mpesa_enabled })}
                  className="bg-[#182030] border border-[#212a3d] rounded-xl px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                >
                  {paySettings.mpesa_enabled ? (
                    <>
                      <ToggleRight className="h-5 w-5 text-emerald-400" />
                      Status: Active
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-5 w-5 text-slate-400" />
                      Status: Disabled
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                When enabled, clients can trigger Lipia Online STK pushes on their mobile lines to prompt direct credential payments using dynamic display currencies.
              </p>
              <div className="text-[10px] text-slate-400 border-t border-[#212a3d]/60 pt-2 leading-relaxed">
                <span>Note: The target API route uses the verified Lipia Online documentation endpoint internally. All mobile deposits require final manager validation/approval inside the Financial Approvals tab.</span>
              </div>
            </div>

            {/* NOWPayments Cryptocurency Integration */}
            <div className="bg-[#0c0f16]/90 border border-[#212a3d] p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block font-sans">
                  NOWPayments Crypto Gateway
                </span>
                <button
                  type="button"
                  onClick={() => setPaySettings({ ...paySettings, crypto_enabled: !paySettings.crypto_enabled })}
                  className="bg-[#182030] border border-[#212a3d] rounded-xl px-3 py-1.5 text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                >
                  {paySettings.crypto_enabled ? (
                    <>
                      <ToggleRight className="h-5 w-5 text-indigo-400" />
                      Status: Active
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-5 w-5 text-slate-400" />
                      Status: Disabled
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400">
                When active, clients can create automatic payments in USDT (TRC-20), BTC, ETH, and USDC. The exchange amount and receiving wallet are populated on-the-fly.
              </p>

              {/* API Key configuration input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 uppercase font-bold">
                  NOWPayments API Credentials Key *
                </label>
                <input
                  type="password"
                  placeholder={paySettings.nowpayments_api_key ? "••••••••••••••••••••••••••••" : "Enter your NOWPayments API Key"}
                  value={paySettings.nowpayments_api_key || ""}
                  onChange={(e) => setPaySettings({ ...paySettings, nowpayments_api_key: e.target.value })}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-indigo-500/40 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono outline-none"
                />
                <span className="text-[9px] text-indigo-300 block select-none">
                  Obtain your key from account.nowpayments.io setting dashboard panel.
                </span>
              </div>

              {/* Sandbox toggle control */}
              <div className="flex items-center justify-between pt-1 border-t border-[#212a3d]/50">
                <div className="text-left font-sans pr-4">
                  <span className="text-[11px] text-slate-300 font-extrabold block">Sandbox Demo Mode</span>
                  <span className="text-[9px] text-slate-400 leading-none">Uses simulator payload parameters avoiding real-world transactions</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPaySettings({ ...paySettings, nowpayments_sandbox: !paySettings.nowpayments_sandbox })}
                  className="bg-[#182030] border border-[#212a3d] rounded-xl px-2.5 py-1.5 text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                >
                  {paySettings.nowpayments_sandbox ? (
                    <>
                      <ToggleRight className="h-4.5 w-4.5 text-emerald-400" />
                      Demo Sandbox Active
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4.5 w-4.5 text-slate-300" />
                      Live Crypto Blockchain
                    </>
                  )}
                </button>
              </div>

              {/* Render & Environment Status Card */}
              <div className="bg-[#0e121b] p-3.5 rounded-xl border border-[#212a3d] space-y-2 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  Render Dynamic API Integration Status
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  You can set your keys directly in your hosting provider's panel.
                </p>
                <div className="space-y-1.5 text-[11px] text-slate-300 pt-1 border-t border-[#212a3d]/25">
                  <div className="flex items-center justify-between">
                    <span>NOWPAYMENTS_API_KEY:</span>
                    {envDetected.nowpayments_api_key_set ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/20 text-[#00e599] font-bold text-[9px] uppercase">
                        Detected in Render
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/15 text-rose-400 font-bold text-[9px] uppercase">
                        Not in Render Env
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>NOWPAYMENTS_BASE_URL:</span>
                    <span className="font-mono text-[10px] text-indigo-300">
                      {envDetected.nowpayments_base_url_set ? "Active from Render" : "https://api.nowpayments.io/v1"}
                    </span>
                  </div>
                </div>
                <div className="text-[9.5px] text-slate-400 leading-relaxed pt-1.5 border-t border-[#212a3d]/25">
                  💡 <strong className="text-slate-400">Where to set on Render:</strong> Live variables can be set under <span className="text-indigo-400 font-semibold font-mono">Render Dashboard &gt; Web Service &gt; Environment &gt; Environment Variables</span>. Adding them there ensures security and auto-sync!
                </div>
              </div>
            </div>

            {/* WhatsApp Group Support & Link Gatekeeper */}
            <div className="bg-[#0c0f16]/90 border border-[#212a3d] p-5 rounded-xl space-y-4 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block font-sans">
                    WhatsApp Community & Support Group Gatekeeper
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-400 mt-0.5">
                    Control whether the WhatsApp Group shortcut banner is visible to users on the Login, Register, and Main App dashboards, and customize the link.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPaySettings({ ...paySettings, whatsapp_enabled: !paySettings.whatsapp_enabled })}
                  className="bg-[#182030] border border-[#212a3d] rounded-xl px-3.5 py-1.5 text-[10px] uppercase font-bold text-slate-300 flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer shrink-0 self-start sm:self-center"
                >
                  {paySettings.whatsapp_enabled ? (
                    <>
                      <ToggleRight className="h-5 w-5 text-emerald-400" />
                      Status: Enabled (Visible)
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-5 w-5 text-slate-400" />
                      Status: Disabled (Hidden)
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  WhatsApp Group Invite URL *
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://chat.whatsapp.com/your-code"
                  value={paySettings.whatsapp_url || ""}
                  onChange={(e) => setPaySettings({ ...paySettings, whatsapp_url: e.target.value })}
                  className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono outline-none"
                  required
                />
                <span className="text-[9.5px] text-slate-500 block">
                  Current target link served to users: <strong className="text-emerald-400 font-mono break-all">{paySettings.whatsapp_url || "https://chat.whatsapp.com/Ljjp8G34scTCVzLeFCt35F"}</strong>
                </span>
              </div>
            </div>

            {/* Dynamic Deposit Limits Configuration (KES) */}
            <div className="bg-[#0c0f16]/90 border border-[#212a3d] p-5 rounded-xl space-y-4 md:col-span-2">
              <span className="text-xs font-black text-red-400 uppercase tracking-widest block font-sans">
                Dynamic Deposit Limit Controls (KES values)
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Configure your project's global minimum and maximum deposit limit thresholds. These restrictions are instantly enforced during checkout when clients attempt either Safaricom M-Pesa Express deposits or NOWPayments Cryptocurency invoice generations. 
                <span className="text-red-300 block mt-1 font-semibold">Leave empty or set to 0 to disable automated limit validations on both Cashier interfaces.</span>
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Global Minimum Deposit Limit (KES / KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100 (Default is 100 KSh if empty)"
                    value={paySettings.min_deposit ?? ""}
                    onChange={(e) => setPaySettings({ ...paySettings, min_deposit: e.target.value })}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Global Maximum Deposit Limit (KES / KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000 (No upper limit check if empty)"
                    value={paySettings.max_deposit ?? ""}
                    onChange={(e) => setPaySettings({ ...paySettings, max_deposit: e.target.value })}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Withdrawal Limits Configuration (KES) */}
            <div className="bg-[#0c0f16]/90 border border-[#212a3d] p-5 rounded-xl space-y-4 md:col-span-2">
              <span className="text-xs font-black text-red-400 uppercase tracking-widest block font-sans">
                Dynamic Withdrawal Limit Controls (KES values)
              </span>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Configure your project's global minimum and maximum withdrawal limit thresholds. These are fully enforced when any buyor attempts to submit an M-Pesa or Cryptocurrency withdrawal transaction request.
                <span className="text-red-300 block mt-1 font-semibold">Leave empty or set to 0 to disable automated withdrawal limits.</span>
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Global Minimum Withdrawal Limit (KES / KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 50 (No dynamic minimum check if empty)"
                    value={paySettings.min_withdrawal ?? ""}
                    onChange={(e) => setPaySettings({ ...paySettings, min_withdrawal: e.target.value })}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    Global Maximum Withdrawal Limit (KES / KSh)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100000 (No upper Limit check if empty)"
                    value={paySettings.max_withdrawal ?? ""}
                    onChange={(e) => setPaySettings({ ...paySettings, max_withdrawal: e.target.value })}
                    className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-red-500/40 rounded-xl px-3.5 py-2 text-xs text-slate-200 font-mono outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit bar */}
          <div className="border-t border-[#212a3d] pt-4.5 flex items-center justify-end">
            <button
              type="submit"
              disabled={paySettingsLoading}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white font-extrabold text-xs rounded-xl cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
            >
              {paySettingsLoading ? (
                <span className="h-3.5 w-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Apply Gateway Configurations
                </>
              )}
            </button>
          </div>
        </form>
        </div>
      )}

      {activeAdminTab === "support" && (
        <div className="bg-[#0b0e14] border border-[#212a3d] rounded-2xl p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#212a3d] pb-4.5 gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-150 uppercase tracking-widest flex items-center gap-2">
                <Headphones className="h-4.5 w-4.5 text-red-400" />
                Live Desk Support & Tickets Hub
              </h3>
              <p className="text-[11px] text-slate-400 leading-tight mt-1">
                Manage and reply to instant client support channels. New tickets trigger dual-ring administrative alerts.
              </p>
            </div>

            {/* Support filters */}
            <div className="flex items-center gap-2">
              {(["all", "open", "resolved"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSupportFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer border ${
                    supportFilter === filter
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : "bg-white/5 border-white/5 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}

              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                  soundEnabled 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                    : "bg-white/5 border-white/5 text-slate-400"
                }`}
                title={soundEnabled ? "Mute alert sounds" : "Unmute alert sounds"}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Master Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Master Queue List */}
            <div className="lg:col-span-5 space-y-3 max-h-[550px] overflow-y-auto pr-1">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Active Client Support Queue
              </h4>
              {supportTickets.filter(t => supportFilter === "all" || t.status === supportFilter).length === 0 ? (
                <div className="text-center py-10 bg-white/5 border border-dashed border-white/5 rounded-xl">
                  <MessageSquare className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-bold">No tickets in this queue</p>
                </div>
              ) : (
                supportTickets
                  .filter(t => supportFilter === "all" || t.status === supportFilter)
                  .map((ticket) => {
                    const isSelected = selectedTicketId === ticket.id;
                    const hasUnread = ticket.unread_by_admin;
                    const lastMsg = ticket.messages?.[ticket.messages.length - 1];
                    
                    return (
                      <div
                        key={ticket.id}
                        onClick={async () => {
                          setSelectedTicketId(ticket.id);
                          // Clear unread on backend as well
                          ticket.unread_by_admin = false;
                          try {
                            const h_id = localStorage.getItem("mallbuy_user_id") || "";
                            await fetch(`/api/support/tickets/${ticket.id}`, {
                              headers: { "x-user-id": h_id }
                            });
                          } catch (err) {}
                        }}
                        className={`p-4 rounded-xl border transition-all text-left cursor-pointer relative ${
                          isSelected
                            ? "bg-red-500/5 border-red-500/30"
                            : "bg-[#0c0f16] border-[#212a3d] hover:border-[#2a364d]"
                        }`}
                      >
                        {/* Unread dot */}
                        {hasUnread && (
                          <span className="absolute top-3.5 right-3.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-200 uppercase tracking-wide truncate">
                            {ticket.user_name}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 font-mono">
                            #{ticket.id.substring(7).toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            {ticket.user_phone}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {ticket.subject}
                          </span>
                        </div>

                        {lastMsg && (
                          <p className="text-[10.5px] text-slate-500 italic mt-2 truncate bg-white/5 px-2 py-1 rounded">
                            {lastMsg.content}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#212a3d]/40">
                          <span className={`text-[8.5px] uppercase font-black px-1.5 py-0.5 rounded ${
                            ticket.status === "open"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-white/5 text-slate-500 border border-white/5"
                          }`}>
                            {ticket.status}
                          </span>
                          <span className="text-[9px] text-slate-500 font-semibold font-mono">
                            {new Date(ticket.updated_at).toLocaleDateString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                          </span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Detail Panel View */}
            <div className="lg:col-span-7 bg-[#0c0f16]/95 border border-[#212a3d] rounded-xl p-5 min-h-[450px] flex flex-col justify-between">
              {(() => {
                const ticket = supportTickets.find(t => t.id === selectedTicketId);
                if (!ticket) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                      <Headphones className="h-12 w-12 text-[#212a3d] mb-3 animate-pulse" />
                      <h5 className="text-xs font-black text-slate-300 uppercase tracking-widest">
                        Live Conversation Console
                      </h5>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-1.5 leading-relaxed">
                        Select an active customer conversation query from the queue list to start instant desk support.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col h-full flex-1 justify-between">
                    {/* Ticket details top panel */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-xs space-y-2 mb-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-200 uppercase tracking-wide">
                          Client: {ticket.user_name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ticket.status === "open" && (
                            <button
                              onClick={() => handleResolveTicket(ticket.id)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-[#07090e] font-extrabold text-[9px] uppercase tracking-wider px-2 py-1 rounded transition-all cursor-pointer"
                            >
                              Resolve Ticket
                            </button>
                          )}
                          <a
                            href={`https://wa.me/${ticket.user_phone.replace(/\D/g, "").startsWith("0") ? "254" + ticket.user_phone.replace(/\D/g, "").slice(1) : ticket.user_phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white font-extrabold text-[9px] uppercase tracking-wider px-2 py-1 rounded transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="h-3 w-3" /> WhatsApp
                          </a>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10.5px] text-slate-400 pt-2 border-t border-[#212a3d]/40">
                        <div>
                          <span className="text-slate-500">M-Pesa Line:</span> <strong className="text-slate-300">{ticket.user_phone}</strong>
                        </div>
                        {ticket.user_email && (
                          <div>
                            <span className="text-slate-500">Email:</span> <strong className="text-slate-300 truncate block">{ticket.user_email}</strong>
                          </div>
                        )}
                        <div>
                          <span className="text-slate-500">Topic:</span> <strong className="text-slate-300">{ticket.subject}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Created:</span> <span className="font-mono">{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Messages Flow Area */}
                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] mb-4 pr-1 min-h-[150px] flex flex-col bg-[#07090e]/40 p-4 rounded-xl border border-white/5">
                      {ticket.messages?.map((msg, idx) => {
                        const isDeskAdmin = msg.sender_id === "admin";
                        return (
                          <div
                            key={msg.id || idx}
                            className={`flex flex-col max-w-[85%] ${isDeskAdmin ? "self-end" : "self-start"}`}
                          >
                            <span className={`text-[8px] font-black uppercase tracking-wider mb-1 px-1 ${isDeskAdmin ? "text-red-400 self-end" : "text-blue-400 self-start"}`}>
                              {isDeskAdmin ? "Desk Admin" : msg.sender_name}
                            </span>
                            <div className={`p-2.5 rounded-2xl text-[11px] leading-relaxed font-medium text-left ${
                              isDeskAdmin
                                ? "bg-gradient-to-br from-red-600 to-red-800 text-white rounded-tr-none shadow shadow-red-950/20"
                                : "bg-slate-800 border border-[#212a3d] text-slate-200 rounded-tl-none"
                            }`}>
                              {msg.content}
                            </div>
                            <span className={`text-[8px] text-slate-500 font-bold mt-0.5 px-1 ${isDeskAdmin ? "self-end" : "self-start"}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Chat reply submission */}
                    <form onSubmit={handleAdminSendReply} className="flex gap-2 pt-3 border-t border-[#212a3d] mt-auto">
                      <input
                        type="text"
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        placeholder={ticket.status === "resolved" ? "Ticket resolved. Re-type here to reopen..." : "Type admin message reply..."}
                        className="flex-1 bg-[#07090e] border border-[#212a3d] px-4 py-2.5 rounded-xl text-xs text-slate-100 placeholder-slate-550 focus:outline-none focus:border-red-500 transition-all font-mono"
                        disabled={sendingAdminReply}
                      />
                      <button
                        type="submit"
                        disabled={sendingAdminReply || !adminReplyText.trim()}
                        className="bg-red-500 hover:bg-red-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* Marketing Hub */}
      {activeAdminTab === "marketing" && (
        <div className="space-y-6 text-left">
          <div className="bg-[#0b0e14] border border-[#212a3d] rounded-2xl p-6">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2 mb-2">
              <Megaphone className="h-5 w-5 text-purple-400" />
              Meta (Facebook/IG) Compliance Marketing Hub
            </h3>
            <p className="text-xs text-slate-400 font-medium mb-6">
              Use these Meta-compliant ad copies and creative guidelines to market MallBuy without violating the "Unrealistic Income" or "MLM" advertising policies. We position this as an E-commerce/Wholesale Agent tool.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Policy Rules */}
              <div className="bg-[#0f131d] rounded-xl p-5 border border-[#212a3d]">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">✅ Meta Policy DOs & DONTs</h4>
                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> <span><b>DO</b> focus on "Wholesale purchasing", "Task Dispatching", and "E-commerce Logistics".</span></li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> <span><b>DO</b> frame it as a platform for dropshippers and independent retail agents.</span></li>
                  <li className="flex gap-2"><X className="h-4 w-4 text-rose-500 shrink-0" /> <span><b>DONT</b> use words like "Investment", "Guaranteed Income", "Make Money Online", or "Passive Income".</span></li>
                  <li className="flex gap-2"><X className="h-4 w-4 text-rose-500 shrink-0" /> <span><b>DONT</b> show screenshots of huge bank withdrawals or crypto wallets in ad images.</span></li>
                </ul>
              </div>

              {/* Creative Guidelines */}
              <div className="bg-[#0f131d] rounded-xl p-5 border border-[#212a3d]">
                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">🖼️ Ad Creative Ideas</h4>
                <ul className="space-y-3 text-xs text-slate-300 font-medium">
                  <li>• <b>Image 1:</b> A person working on a laptop at a coffee shop with a clean dashboard on screen.</li>
                  <li>• <b>Image 2:</b> Warehouse boxes or wholesale goods (sneakers, electronics) being packed.</li>
                  <li>• <b>Video:</b> A short screen recording of the "Active Orders" page showing a dispatch task being completed.</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 space-y-6">
              {/* Ad Copy 1 */}
              <div className="bg-[#0f131d] rounded-xl p-5 border border-[#212a3d]">
                <div className="flex justify-between items-center mb-3 border-b border-[#212a3d] pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Ad Copy 1: The E-commerce Agent (Best for Conversions)</h4>
                  <button onClick={() => {navigator.clipboard.writeText(`Tired of handling your own inventory? 📦\n\nJoin hundreds of independent retail agents using MallBuy to participate in wholesale group purchases. We aggregate buyer demand so you get bulk pricing on trending consumer goods, and you earn commissions by helping us dispatch orders directly from our platform.\n\n✅ Start with small orders\n✅ No physical warehouse needed\n✅ Real-time dashboard tracking\n\nClick "Learn More" to register your agent account today! 👇`)}} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-white font-bold transition-colors cursor-pointer">COPY</button>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap font-medium">
                  Tired of handling your own inventory? 📦{"\n\n"}
                  Join hundreds of independent retail agents using MallBuy to participate in wholesale group purchases. We aggregate buyer demand so you get bulk pricing on trending consumer goods, and you earn commissions by helping us dispatch orders directly from our platform.{"\n\n"}
                  ✅ Start with small orders{"\n"}
                  ✅ No physical warehouse needed{"\n"}
                  ✅ Real-time dashboard tracking{"\n\n"}
                  Click "Learn More" to register your agent account today! 👇
                </p>
              </div>

              {/* Ad Copy 2 */}
              <div className="bg-[#0f131d] rounded-xl p-5 border border-[#212a3d]">
                <div className="flex justify-between items-center mb-3 border-b border-[#212a3d] pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-widest">Ad Copy 2: The Side Hustle (Task Based)</h4>
                  <button onClick={() => {navigator.clipboard.writeText(`Looking for flexible remote tasks? 📱\n\nMallBuy connects smart shoppers with global wholesale logistics. Our platform allows you to participate in active order fulfillment. Simply log in, select an active order dispatch task, and earn a commission when the wholesale cycle completes.\n\nJoin our network of order dispatchers and start scaling your wholesale portfolio today. Tap below to create your free account! 🚀`)}} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded text-white font-bold transition-colors cursor-pointer">COPY</button>
                </div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap font-medium">
                  Looking for flexible remote tasks? 📱{"\n\n"}
                  MallBuy connects smart shoppers with global wholesale logistics. Our platform allows you to participate in active order fulfillment. Simply log in, select an active order dispatch task, and earn a commission when the wholesale cycle completes.{"\n\n"}
                  Join our network of order dispatchers and start scaling your wholesale portfolio today. Tap below to create your free account! 🚀
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
