import React, { useState, useEffect, useRef } from "react";
import { Coins, LogOut, ShieldCheck, User, TrendingUp, Wallet, ListTodo, Users, Globe, Sun, Bell, CheckCircle2, XCircle } from "lucide-react";
import { User as UserType, WalletBalance, AppNotification } from "../types";
import { useCurrency, CurrencyType } from "../context/CurrencyContext";

interface HeaderProps {
  user: UserType;
  balance: WalletBalance | null;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdminMode: boolean;
  setIsAdminMode: (mode: boolean) => void;
  onLogout: () => void;
  notifications?: AppNotification[];
  setNotifications?: React.Dispatch<React.SetStateAction<AppNotification[]>>;
}

export default function Header({
  user,
  balance,
  currentTab,
  setCurrentTab,
  isAdminMode,
  setIsAdminMode,
  onLogout,
  notifications = [],
  setNotifications
}: HeaderProps) {
  const { activeCurrency, setCurrency, format } = useCurrency();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    if (setNotifications) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/90 border-b border-white/10 shadow-lg backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1 sm:gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-shrink-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mr-2">
            <span className="font-bold text-white italic">H</span>
          </div>
          <span className="text-base sm:text-xl font-bold tracking-tight text-white truncate">
            MallBuy
          </span>
          {isAdminMode && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="bg-amber-500/20 text-amber-400 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                Admin
              </span>
              <button
                onClick={() => {
                  setIsAdminMode(false);
                  setCurrentTab("dashboard");
                }}
                className="bg-white/10 hover:bg-white/20 text-slate-300 text-[9px] font-bold px-1.5 sm:px-2.5 py-1 rounded-lg border border-white/10 transition-all flex items-center gap-0.5 cursor-pointer flex-shrink-0"
                title="Exit administrative portal view"
              >
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
                <span className="hidden xs:inline">Exit</span>
              </button>
            </div>
          )}
        </div>
 
        {/* Multi-Currency Selection Controls */}
        <div className="group flex items-center gap-1 bg-white/5 hover:bg-white/10 px-1.5 sm:px-3 py-1.5 rounded-xl border border-white/10 transition-all duration-200 hover:border-emerald-500/30 flex-shrink-0 hover:scale-103 active:scale-97">
          <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400 group-hover:rotate-12 transition-transform duration-300 ease-out" />
          <select
            value={activeCurrency}
            onChange={(e) => setCurrency(e.target.value as CurrencyType)}
            className="bg-transparent text-[10px] sm:text-xs font-bold text-slate-300 focus:outline-none cursor-pointer pr-1 [&>option]:text-slate-900 [&>option]:bg-white"
          >
            <option value="USD">USD ($)</option>
            <option value="KES">KES (KSh)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>


 
        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center justify-end gap-6 font-semibold flex-shrink-0">
           {balance !== null && (
             <div className="group flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs transition-all duration-200 hover:scale-105 active:scale-98 cursor-pointer">
               <Coins className="h-3.5 w-3.5 text-emerald-400 animate-pulse group-hover:rotate-12 transition-transform duration-300" />
               <span className="text-emerald-500/70 font-semibold uppercase text-[9px] tracking-wider hidden md:inline">A/C Bal:</span>
               <span className="text-xs font-bold transition-colors">{format(balance.available_balance)}</span>
             </div>
           )}
           <button
             onClick={() => {
               setIsAdminMode(false);
               setCurrentTab("dashboard");
             }}
             className={`text-sm cursor-pointer transition-all duration-200 font-bold hover:scale-105 active:scale-95 ${!isAdminMode && currentTab === "dashboard" ? "text-emerald-400" : "text-slate-400 hover:text-white"}`}
           >
             Dashboard
           </button>
           
           {/* Notification Bell Desktop */}
           <div className="relative" ref={notifRef}>
             <button
               onClick={() => setShowNotifications(!showNotifications)}
               className="relative p-1.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer group"
             >
               <Bell className="h-5 w-5 group-hover:rotate-12 transition-transform" />
               {unreadCount > 0 && (
                 <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border border-slate-900 animate-pulse" />
               )}
             </button>
             
             {showNotifications && (
               <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                 <div className="p-3 border-b border-white/10 flex items-center justify-between bg-slate-950/50">
                   <span className="text-xs font-bold text-white uppercase tracking-wider">Notifications</span>
                   {unreadCount > 0 && (
                     <button onClick={markAllRead} className="text-[10px] text-emerald-400 hover:text-emerald-300 cursor-pointer font-bold">
                       Mark all read
                     </button>
                   )}
                 </div>
                 <div className="max-h-80 overflow-y-auto">
                   {notifications.length === 0 ? (
                     <div className="p-6 text-center text-slate-500 text-xs">No new notifications</div>
                   ) : (
                     <div className="divide-y divide-white/5">
                       {notifications.map(notif => (
                         <div key={notif.id} className={`p-3 hover:bg-white/5 transition-colors ${!notif.read ? 'bg-emerald-500/5' : ''}`}>
                           <div className="flex items-start gap-2">
                             {notif.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                             <div>
                               <div className="text-xs font-bold text-slate-200">{notif.title}</div>
                               <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{notif.message}</div>
                               <div className="text-[9px] text-slate-500 mt-1 font-mono">{new Date(notif.created_at).toLocaleTimeString()}</div>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
             )}
           </div>

           <button onClick={onLogout} className="text-sm font-bold text-slate-400 hover:text-red-400 transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95">Logout</button>
        </div>
        
        {/* Mobile Nav Actions */}
        <div className="sm:hidden flex items-center gap-1.5 flex-shrink-0">
           {balance !== null && (
             <span className="group flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 transition-all duration-200 hover:scale-105">
               <Coins className="h-3 w-3 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
               <span>{format(balance.available_balance)}</span>
             </span>
           )}
           
           <button
             onClick={() => setShowNotifications(!showNotifications)}
             className="relative p-1.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
           >
             <Bell className="h-4.5 w-4.5" />
             {unreadCount > 0 && (
               <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border border-slate-900 animate-pulse" />
             )}
           </button>
           
           <button
             onClick={onLogout}
             title="Log Out"
             className="p-1.5 text-slate-400 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors cursor-pointer flex-shrink-0"
           >
             <LogOut className="h-4.5 w-4.5" />
           </button>
        </div>
      </div>

      {/* Navigation sub-header for inner pages (unless Admin Mode) */}
      {!isAdminMode && (
        <div className="w-full bg-black/20 border-b border-white/10 overflow-hidden backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 py-2 flex items-center justify-between sm:justify-center gap-1 sm:gap-3">
            <div className="flex-1 sm:flex-initial flex items-center justify-between sm:justify-center gap-1 sm:gap-3 w-full">
              {[
                { id: "dashboard", label: "Overview", icon: TrendingUp },
                { id: "wallet", label: "Wallet", icon: Wallet },
                { id: "referrals", label: "Network", icon: Users },
                { id: "orders", label: "History", icon: ListTodo },
                { id: "profile", label: "Profile", icon: User },
              ].map((tab) => {
                const isActive = currentTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`group flex-1 sm:flex-initial justify-center px-1.5 xs:px-3 sm:px-5 py-2 rounded-xl text-[10px] xs:text-xs sm:text-sm font-medium transition-all duration-200 ease-out whitespace-nowrap cursor-pointer flex items-center gap-1 sm:gap-2 hover:scale-104 active:scale-96 ${
                      isActive
                        ? "bg-white/10 text-white border border-white/10"
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10"
                    }`}
                  >
                    <TabIcon className={`h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:scale-115 group-hover:rotate-3 ${isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-400"}`} />
                    <span className="transition-colors duration-200">{tab.label}</span>
                  </button>
                );
              })}
            </div>
            
            {user.isAdmin && (
              <button
                onClick={() => {
                  setIsAdminMode(true);
                  setCurrentTab("admin");
                }}
                className={`group px-2 xs:px-3 py-2 rounded-xl text-[10px] xs:text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400 ml-1 sm:ml-4 flex items-center gap-1 hover:scale-104 active:scale-96 flex-shrink-0`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-amber-500 transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110" />
                <span className="hidden xs:inline">Admin</span>
                <span className="inline xs:hidden">Adm</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
