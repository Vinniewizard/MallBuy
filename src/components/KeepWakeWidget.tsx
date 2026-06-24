import React, { useState, useEffect, useRef } from "react";

export default function KeepWakeWidget() {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(true); // default active for optimal user experience
  const [uptime, setUptime] = useState(0);
  const [pings, setPings] = useState(0);
  const wakeLockRef = useRef<any>(null);

  // Check support on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "wakeLock" in navigator) {
      setIsSupported(true);
    }
  }, []);

  // Request Wake Lock
  const requestLock = async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
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
      if (typeof document !== "undefined" && document.visibilityState === "visible" && isActive) {
        await requestLock();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [isActive]);

  // Keep-alive server loop & local stats
  useEffect(() => {
    // Standard interval to keep CPU active & prevent background state suspension
    const interval = setInterval(() => {
      setUptime((prev) => {
        const next = prev + 1;
        // Every 15 seconds, trigger a silent heartbeat to backend to keep socket/container active
        if (next % 15 === 0) {
          setPings((p) => p + 1);
          fetch("/api/health")
            .then((res) => res.json())
            .catch((err) => console.log("[HEARTBEAT] Keep-alive error:", err));
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Return null so it runs silently in the background without rendering any UI elements
  return null;
}
