import React, { useState } from "react";
import { Copy, ArrowRight, ShieldAlert, ShieldCheck, Sparkles, Coins, Flame, Gem, TrendingUp, HelpCircle } from "lucide-react";
import { User, DashboardStats, ReferralRecord, Plan, WalletBalance } from "../types";
import { useCurrency } from "../context/CurrencyContext";

interface DashboardProps {
  user: User;
  stats: DashboardStats;
  referrals: ReferralRecord[];
  plans: Plan[];
  balance: WalletBalance | null;
  onInvest: (planId: string) => Promise<any>;
  onSwitchTab: (tab: string, subTab?: "deposit" | "withdraw" | "history") => void;
  onRefresh: () => void;
}

export default function Dashboard({ user, stats, referrals, plans, balance, onInvest, onSwitchTab, onRefresh }: DashboardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { format } = useCurrency();

  const getTierIcon = (name: string) => {
    if (name.toLowerCase().includes("copper")) return Sparkles;
    if (name.toLowerCase().includes("bronze")) return TrendingUp;
    if (name.toLowerCase().includes("silver")) return Coins;
    if (name.toLowerCase().includes("gold")) return Flame;
    return Gem;
  };

  const handleInvestSubmit = async (planId: string) => {
    setStatusMsg(null);
    setLoading(planId);

    try {
      const res = await onInvest(planId);
      if (res && res.error) {
        setStatusMsg({ type: "error", text: res.error });
      } else {
        setStatusMsg({
          type: "success",
          text: `Successfully initialized ${plans.find((p) => p.id === planId)?.name}! Tracks initialized on My Trades.`,
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: "Deposit failed: " + (err.message || "Insufficient balance") });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-12 pb-8">
      {/* Intro section */}
      <div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 sm:p-5 mb-8 text-emerald-400 flex items-start sm:items-center gap-3.5 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-xs">
          <div className="bg-emerald-500/20 p-2 rounded-xl flex-shrink-0 flex items-center justify-center border border-emerald-500/30">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-emerald-300 mb-0.5">Secure Terminal Active</p>
            <p className="text-[11px] sm:text-xs text-slate-300 font-bold leading-relaxed">
              Your capital growth workspace has been successfully initialized. Welcome to HelaVest—explore curated investment tiers below to allocate your capital and monitor compounding yields.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-bold text-amber-400 tracking-wider uppercase mb-2">PROFESSIONAL TERMINAL</h2>
          <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
            Manage your capital, explore strategic investment plans, and monitor your affiliate network growth from a unified workspace.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between backdrop-blur-md">
          <div className="text-xs font-semibold text-slate-400 mb-1">Available balance</div>
          <div className="text-xl font-bold text-white tracking-tight">{format(stats.balance.available_balance)}</div>
          <div className="w-6 h-1 bg-emerald-500 rounded-full absolute bottom-4 right-4"></div>
        </div>
        
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between backdrop-blur-md">
          <div className="text-xs font-semibold text-slate-400 mb-1">Active capital</div>
          <div className="text-xl font-bold text-white tracking-tight">{format(stats.active_trades_capital)}</div>
          <div className="w-6 h-1 bg-emerald-500 rounded-full absolute bottom-4 right-4"></div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between backdrop-blur-md">
          <div className="text-xs font-semibold text-slate-400 mb-1">Total deposits</div>
          <div className="text-xl font-bold text-white tracking-tight">{format(stats.balance.total_deposits)}</div>
          <div className="w-6 h-1 bg-emerald-500 rounded-full absolute bottom-4 right-4"></div>
        </div>

        <div className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between backdrop-blur-md">
          <div className="text-xs font-semibold text-slate-400 mb-1">Referral bonus</div>
          <div className="text-xl font-bold text-white tracking-tight">{format(stats.balance.referral_bonus || 0)}</div>
          <div className="w-6 h-1 bg-emerald-500 rounded-full absolute bottom-4 right-4"></div>
        </div>
        
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between col-span-2 md:col-span-1 backdrop-blur-md">
          <div className="text-xs font-semibold text-slate-400 mb-1">Completed profit</div>
          <div className="text-xl font-bold text-white tracking-tight">{format(stats.total_profit_earned)}</div>
          <div className="w-6 h-1 bg-emerald-500 rounded-full absolute bottom-4 right-4"></div>
        </div>
      </div>

      {/* QUICK ACCOUNT PORTAL */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm backdrop-blur-md">
        <div className="space-y-1 text-left">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="h-4.5 w-4.5 animate-pulse text-emerald-400" /> Quick Account Actions
          </h3>
          <p className="text-xs text-slate-400 font-semibold">
            Instantly credit your balance via Safaricom M-Pesa push / Crypto invoice, or request real-time withdrawals of your trades' profit yield.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => onSwitchTab("wallet", "deposit")}
            className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 hover:scale-[1.02] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            📥 Deposit Funds
          </button>
          <button
            onClick={() => onSwitchTab("wallet", "withdraw")}
            className="flex-1 md:flex-none px-6 py-2.5 bg-white/10 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.98] border border-white/10 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            📤 Withdraw Earnings
          </button>
        </div>
      </div>

      {/* INVESTMENT DESK */}
      <div className="space-y-6 pt-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Investment Desk</h2>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">Strategic Growth Plans</p>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed font-semibold transition-all backdrop-blur-md ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>{statusMsg.text}</div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = getTierIcon(plan.name);
            const profitVal = plan.return_amount - plan.amount;
            const roiPercent = Math.round((profitVal / plan.amount) * 100);
            const needsDeposit = !balance || balance.available_balance < plan.amount;

            return (
              <div
                key={plan.id}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col h-full hover:shadow-lg transition-shadow relative overflow-hidden backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${needsDeposit ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                    {needsDeposit ? "Needs deposit" : "Ready"}
                  </span>
                  <span className="text-xs font-bold text-slate-400">{plan.duration_days} days</span>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <Icon className="h-4 w-4 text-emerald-400" />
                </div>
                
                <p className="text-[11px] text-slate-400 mb-6 flex-grow">
                  {plan.description || "Compounding yield package."}
                </p>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-medium">Entry</span>
                    <span className="font-bold text-white">{format(plan.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                    <span className="text-slate-400 font-medium">ROI</span>
                    <span className="font-bold text-emerald-400">+{roiPercent}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-medium">Profit</span>
                    <span className="font-bold text-white">{format(profitVal)}</span>
                  </div>
                </div>

                <button
                  onClick={() => needsDeposit ? onSwitchTab("wallet") : handleInvestSubmit(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-transform active:scale-[0.98] ${
                    needsDeposit 
                      ? "bg-white/10 hover:bg-white/20 text-slate-300"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}
                >
                  {loading === plan.id ? "Processing..." : needsDeposit ? "Deposit to unlock" : "Activate"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MARKET PULSE */}
      <div className="space-y-6 pt-6">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Market Pulse</h2>
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mt-1">Trending Insights</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm backdrop-blur-md">
            <h3 className="font-bold text-white text-sm">Funding Network</h3>
            <p className="text-xs font-bold text-amber-400 mb-2 mt-1">Preferred lending partners across the USA, Australia, UK, UAE, and Kenya</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              The platform presents a global funding posture with clear wallet records, portfolio visibility, and fast trade access.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm backdrop-blur-md">
            <h3 className="font-bold text-white text-sm">Business Standard</h3>
            <p className="text-xs font-bold text-amber-400 mb-2 mt-1">Built for transparent deposits, withdrawals, commissions, and trade history</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every user action is reflected in the ledger, making account activity easier to audit and manage.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm backdrop-blur-md">
            <h3 className="font-bold text-white text-sm">Growth Desk</h3>
            <p className="text-xs font-bold text-amber-400 mb-2 mt-1">Invite-based growth with commission tracking for every qualifying member</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Referral earnings, active sessions, and completed payouts stay visible without exposing staff controls.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-sm backdrop-blur-md">
            <h3 className="font-bold text-white text-sm">Platform Security</h3>
            <p className="text-xs font-bold text-amber-400 mb-2 mt-1">Institutional Grade Wallet Protection</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated session management and secured back-office auditing protect all transactions and capital records.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
