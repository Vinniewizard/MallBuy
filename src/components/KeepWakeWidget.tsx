import React, { useState, useEffect, useRef } from "react";
import { Eye, ShieldCheck, Sun, RefreshCw, Sparkles, Activity } from "lucide-react";

export default function KeepWakeWidget() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(true); // default active for optimal user experience
  const [uptime, setUptime] = useState(0);
  const [pings, setPings] = useState(0);
  const wakeLockRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "wakeLock" in navigator) {
      setIsSupported(true);
    }
  }, []);

  // Request Wake Lock
  const requestLock = async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      // Release any existing lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      console.log("[WAKE LOCK] Screen Wake Lock acquired successfully.");
    } catch (err: any) {
      console.warn("[WAKE LOCK] Failed to acquire Screen Wake Lock:", err.message);
    }
  };

  // Release Wake Lock
  const releaseLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log("[WAKE LOCK] Screen Wake Lock released.");
      } catch (err: any) {
        console.error("[WAKE LOCK] Error releasing Screen Wake Lock:", err);
      }
    }
  };

  // Handle Lock Activation State Change
  useEffect(() => {
    if (isActive) {
      requestLock();
    } else {
      releaseLock();
    }

    return () => {
      releaseLock();
    };
  }, [isActive]);

  // Re-acquire lock when page visibility changes (standard Screen Wake Lock requirement)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isActive) {
        await requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isActive]);

  // Keep-alive server loop & local stats
  useEffect(() => {
    // Standard interval to keep CPU active & prevent background state suspension
    intervalRef.current = setInterval(() => {
      setUptime((prev) => prev + 1);
      
      // Every 15 seconds, trigger a silent heartbeat to backend to keep socket/container active
      if (uptime % 15 === 0) {
        setPings((prev) => prev + 1);
        fetch("/api/health")
          .then((res) => res.json())
          .catch((err) => console.log("[HEARTBEAT] Keep-alive error:", err));
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [uptime]);

  // Format uptime to human hours/minutes/seconds
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div id="keep-wake-widget" className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 p-5 shadow-xl transition-all duration-300">
      {/* Decorative pulse blur in corner */}
      {isActive && (
        <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl animate-pulse"></div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left column: Title & Description */}
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-xl transition-all duration-300 ${isActive ? "bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/20 animate-pulse" : "bg-white/5 text-slate-500"}`}>
            {isActive ? <Sun className="h-5 w-5" /> : <Sun className="h-5 w-5 opacity-40" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Keep-Wake System
              </h4>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-slate-400 border border-white/5"}`}>
                {isActive ? "ACTIVE" : "STANDBY"}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5 max-w-sm">
              Prevents phone, laptop, or tablet screens from sleeping to ensure continuous blockchain order maturation and instant balance updates.
            </p>
          </div>
        </div>

        {/* Right column: Toggle Switch */}
        <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
          <span className="text-xs font-bold text-slate-400 sm:hidden">Toggle Keep-Wake</span>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isActive ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Stats sub-panel */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/5 bg-black/20 rounded-xl px-4 py-3">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Device Lock</span>
          <span className="text-xs font-bold text-white mt-0.5">
            {isSupported ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Native API
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Simulation
              </span>
            )}
          </span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Uptime Watch</span>
          <span className="text-xs font-mono font-bold text-white mt-0.5 flex items-center gap-1">
            <Activity className="h-3 w-3 text-indigo-400 animate-pulse" />
            {formatUptime(uptime)}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Ping Heartbeats</span>
          <span className="text-xs font-mono font-bold text-white mt-0.5">
            {pings} Tx-Saves
          </span>
        </div>
      </div>
    </div>
  );
}
