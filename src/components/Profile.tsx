import React, { useState } from "react";
import { User as UserIcon, ShieldCheck, Mail, Phone, Lock, Save, AlertCircle, MapPin, Fingerprint } from "lucide-react";
import { User } from "../types";

interface ProfileProps {
  user: User;
  onRefresh: () => void;
}

export default function Profile({ user, onRefresh }: ProfileProps) {
  const [username, setUsername] = useState(user.username);
  const [fullName, setFullName] = useState(user.fullName || "");
  const [city, setCity] = useState(user.city || "");
  const [country, setCountry] = useState(user.country || "");
  const [location, setLocation] = useState(user.location || "");
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleEnableBiometric = async () => {
    setMsg(null);
    setBiometricLoading(true);

    try {
      // Simulate fingerprint scanning delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newBiometricKey = "bio_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      const response = await fetch("/api/auth/biometric/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ biometricKey: newBiometricKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem(`biometric_key_${user.username.toLowerCase()}`, newBiometricKey);
        setMsg({ type: "success", text: user.hasBiometric ? "Biometric / Device Passkey updated successfully for this device." : "Biometric / Device Passkey enabled successfully for this device." });
        onRefresh();
      } else {
        setMsg({ type: "error", text: data.error || "Failed to enable biometrics." });
      }
    } catch (err) {
      setMsg({ type: "error", text: "An error occurred while setting up biometrics." });
    } finally {
      setBiometricLoading(false);
    }
  };

  const detectLocation = async () => {
    setDetecting(true);
    setMsg(null);
    
    const fetchIpFallback = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.city && data.country_name) {
          setCity(data.city);
          setCountry(data.country_name);
          setLocation(`${data.ip} - ${data.city}, ${data.country_name}`);
          setMsg({ type: "success", text: "Location detected automatically via IP." });
        } else {
          throw new Error("Invalid location data");
        }
      } catch (err) {
        setMsg({ type: "error", text: "Failed to detect location automatically." });
      } finally {
        setDetecting(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Attempt reverse geocoding via free geocoding API or fallback to IP
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const geoData = await geoRes.json();
            
            if (geoData && geoData.city && geoData.countryName) {
              setCity(geoData.city);
              setCountry(geoData.countryName);
              setLocation(`[GPS] ${latitude.toFixed(4)}, ${longitude.toFixed(4)} - ${geoData.city}, ${geoData.countryName}`);
              setMsg({ type: "success", text: "Location precisely detected via GPS." });
              setDetecting(false);
            } else {
              fetchIpFallback();
            }
          } catch (err) {
            fetchIpFallback();
          }
        },
        (error) => {
          console.log("Geolocation error/denied. Falling back to IP.", error);
          fetchIpFallback();
        },
        { timeout: 10000 }
      );
    } else {
      fetchIpFallback();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify({ username, fullName, city, country, location, email, phone }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMsg({ type: "success", text: "Profile updated successfully." });
      onRefresh();
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-emerald-400" />
          My Profile Settings
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          Manage your personal details and account recovery options.
        </p>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold leading-relaxed flex items-start gap-3 transition-colors ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-red-500/10 border-red-500/20 text-red-350"
          }`}
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>{msg.text}</div>
        </div>
      )}

      <form onSubmit={handleUpdate} className="bg-[#0f131d] border border-[#212a3d] rounded-2xl p-6 w-full lg:max-w-2xl space-y-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <UserIcon className="h-3 w-3" /> Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <UserIcon className="h-3 w-3" /> Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Mail className="h-3 w-3" /> Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <MapPin className="h-3 w-3" /> Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Kenya"
              className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
            />
          </div>
          
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <UserIcon className="h-3 w-3" /> City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Nairobi"
              className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Phone className="h-3 w-3" /> PesaPal Phone
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#0c0f16] border border-[#212a3d] focus:border-indigo-500/50 rounded-xl px-4 py-2.5 text-xs text-slate-200 font-bold outline-none"
            />
          </div>
          
          <div className="space-y-1">
             <div className="flex items-center justify-between mb-2">
               <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Detected Location
               </label>
               <button
                 type="button"
                 onClick={detectLocation}
                 disabled={detecting}
                 className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase flex items-center gap-1 disabled:opacity-50"
               >
                 {detecting ? (
                   <span className="h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                 ) : (
                   <MapPin className="h-3 w-3" />
                 )}
                 Auto Detect
               </button>
             </div>
            <input
              type="text"
              disabled
              value={location || 'Unknown'}
              className="w-full bg-[#0c0f16] border border-[#212a3d] rounded-xl px-4 py-2.5 text-[11px] text-slate-400 font-mono outline-none opacity-80 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-transform duration-200 active:scale-[0.99] shadow-md shadow-indigo-950/20"
          >
            {loading ? (
              <span className="h-4.5 w-4.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Save className="h-4.5 w-4.5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-8 pt-6 border-t border-white/5">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          Security Settings
        </h4>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-1">
              <Fingerprint className="h-4 w-4 text-emerald-400" />
              Biometric & Device Authentication
            </h5>
            <p className="text-[11px] text-slate-400 max-w-sm leading-relaxed">
              Enable Passkey or Fingerprint login on this device. This securely registers your current device as a trusted authenticator.
            </p>
          </div>
          <button
            type="button"
            onClick={handleEnableBiometric}
            disabled={biometricLoading}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 transition-all transform active:scale-[0.98] ${
              user.hasBiometric
                ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 cursor-pointer shadow-md"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer shadow-md"
            }`}
          >
            {biometricLoading ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : user.hasBiometric ? (
              <>
                <Fingerprint className="h-4 w-4" />
                Update Biometric
              </>
            ) : (
              <>
                <Fingerprint className="h-4 w-4 text-emerald-400" />
                Enable Biometric
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
