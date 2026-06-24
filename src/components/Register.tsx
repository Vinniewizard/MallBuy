import React, { useState, useEffect } from "react";
import { UserPlus, Shield, User, Mail, Phone, Lock, Gift, AlertCircle, ArrowLeft, Activity, ArrowRight } from "lucide-react";

interface RegisterProps {
  onRegisterSuccess: (user: any) => void;
  onNavigateToLogin: () => void;
}

interface CountryConfig {
  name: string;
  flag: string;
  placeholder: string;
  pattern: RegExp;
  errorMsg: string;
}

const COUNTRIES: CountryConfig[] = [
  {
    name: "Kenya",
    flag: "🇰🇪",
    placeholder: "e.g. 0712345678 or 254712345678",
    pattern: /^(254[17]\d{8}|0[17]\d{8})$/,
    errorMsg: "Kenya phone numbers must be 10 digits starting with 07 or 01, or 12 digits starting with 2547 or 2541 (e.g. 0712345678 or 254712345678)."
  },
  {
    name: "Uganda",
    flag: "🇺🇬",
    placeholder: "e.g. 0772345678 or 256772345678",
    pattern: /^(256[7]\d{8}|0[7]\d{8})$/,
    errorMsg: "Uganda phone numbers must be 10 digits starting with 07, or 12 digits starting with 2567 (e.g. 0772345678 or 256772345678)."
  },
  {
    name: "Tanzania",
    flag: "🇹🇿",
    placeholder: "e.g. 0752345678 or 255752345678",
    pattern: /^(255[67]\d{8}|0[67]\d{8})$/,
    errorMsg: "Tanzania phone numbers must start with 2557, 2556, 07, or 06."
  },
  {
    name: "Rwanda",
    flag: "🇷🇼",
    placeholder: "e.g. 0782345678 or 250782345678",
    pattern: /^(2507[89]\d{7}|07[89]\d{7})$/,
    errorMsg: "Rwanda phone numbers must start with 25078, 25079, 078, or 079."
  },
  {
    name: "Nigeria",
    flag: "🇳🇬",
    placeholder: "e.g. 08012345678 or 2348012345678",
    pattern: /^(234[789]\d{9}|0[789]\d{9})$/,
    errorMsg: "Nigeria phone numbers must be 11 digits starting with 0, or 13 digits starting with 234 (e.g. 08012345678 or 2348012345678)."
  }
];

export default function Register({ onRegisterSuccess, onNavigateToLogin }: RegisterProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("Kenya");
  const [detectedLocation, setDetectedLocation] = useState("Detecting location...");
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [whatsappUrl, setWhatsappUrl] = useState("https://chat.whatsapp.com/Ljjp8G34scTCVzLeFCt35F");

  useEffect(() => {
    fetch("/api/payment-settings")
      .then((res) => {
        if (!res.ok) throw new Error("Server response error");
        return res.json();
      })
      .then((data) => {
        if (data.paymentSettings) {
          setWhatsappEnabled(data.paymentSettings.whatsapp_enabled !== false);
          setWhatsappUrl(data.paymentSettings.whatsapp_url || "https://chat.whatsapp.com/Ljjp8G34scTCVzLeFCt35F");
        }
      })
      .catch((err) => console.error("Failed to load public settings", err));
  }, []);

  // Auto-parse invite code from URL search parameters if present (e.g. ?ref=MALL777)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setInviteCode(ref.toUpperCase());
    }
  }, []);

  // IP-based Location detection with HTML5 Geolocation Supplement
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Primary API Offline");
      })
      .then((data) => {
        if (data.city && data.country_name) {
          const locStr = `${data.city}, ${data.region || ""}, ${data.country_name} (IP: ${data.ip || "unknown"})`;
          setDetectedLocation(locStr);
          if (["Kenya", "Uganda", "Tanzania", "Rwanda", "Nigeria"].includes(data.country_name)) {
            setSelectedCountry(data.country_name);
          }
        }
      })
      .catch((err) => {
        console.log("IP lookup fail, trying backup...", err);
        fetch("https://ip-api.com/json")
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "success") {
              const locStr = `${data.city}, ${data.regionName || ""}, ${data.country} (IP: ${data.query || "unknown"})`;
              setDetectedLocation(locStr);
              if (["Kenya", "Uganda", "Tanzania", "Rwanda", "Nigeria"].includes(data.country)) {
                setSelectedCountry(data.country);
              }
            } else {
              setDetectedLocation("Location services offline");
            }
          })
          .catch(() => {
            setDetectedLocation("Unknown Location (offline/blocked)");
          });
      });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(5);
          const lon = position.coords.longitude.toFixed(5);
          const accuracy = position.coords.accuracy.toFixed(1);
          setDetectedLocation((prev) => {
            const base = prev.includes("Detecting") ? "GPS Location" : prev;
            return `${base} [GPS: ${lat}, ${lon} ±${accuracy}m]`;
          });
        },
        (geoErr) => {
          console.log("GPS precision request skipped:", geoErr.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !email || !phone || !password) {
      setError("Please fill in all required setup details");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Your security PIN passwords do not match.");
      return;
    }

    const activeCountryConfig = COUNTRIES.find(c => c.name === selectedCountry) || COUNTRIES[0];
    if (!activeCountryConfig.pattern.test(phone)) {
      setError(activeCountryConfig.errorMsg);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          phone,
          invite_code: inviteCode || undefined,
          password,
          country: selectedCountry,
          location: detectedLocation
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to complete registration.");
      }

      onRegisterSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-950 relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/2 -right-1/4 w-full h-full bg-emerald-500/10 rounded-full blur-[120px]"></div>
      </div>
      <div className="relative z-10 w-full h-full flex flex-col">
      {/* Top Header Navbar */}
      <div className="w-full h-20 px-6 sm:px-12 flex items-center justify-between bg-white/5 backdrop-blur-md border-b border-white/10 shadow-xs z-10">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm shadow-emerald-600/20">H</div>
          <span className="text-xl font-black tracking-tight text-white">
            Mall<span className="text-emerald-600">Buy</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onNavigateToLogin} 
            className="text-xs font-bold text-slate-300 hover:text-emerald-600 transition-colors uppercase tracking-wider cursor-pointer"
          >
            Sign In
          </button>
          <button 
            className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl transition-all shadow-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            Create Account
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 mb-8 relative z-0">
        {/* Aesthetic Background Decors */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="w-full max-w-[560px] bg-white/5 rounded-3xl shadow-xl shadow-slate-200/50 border border-white/10 overflow-hidden p-6 sm:p-10 relative">
          
          {/* Header Area */}
          <div className="mb-8 text-center sm:text-left relative">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700 tracking-widest uppercase mb-3">
              <Shield className="h-3 w-3" />
              Secure Access
            </span>
            <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">
              Create Account
            </h2>
            <p className="text-slate-400 text-xs">
              Complete the security profile below to register your inventory growth account.
            </p>
          </div>

          {/* Secure System Notification */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 mb-6 animate-fadeIn">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-rose-900 block">Registration Error</span>
                <p className="text-xs text-rose-400 font-medium leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Username & Email Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Username *
                </label>
                <div className="relative rounded-xl transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. wizardbuy"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm focus:bg-white/5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Email Address *
                </label>
                <div className="relative rounded-xl transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g. wizard@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm focus:bg-white/5"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Choose Country & PesaPal Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Country Region *
                </label>
                <div className="relative rounded-xl transition-all">
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setPhone(""); // Clear phone on change to avoid confusion
                    }}
                    className="block w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name} className="bg-slate-900 text-white">
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  PesaPal Phone *
                </label>
                <div className="relative rounded-xl transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder={COUNTRIES.find(c => c.name === selectedCountry)?.placeholder || "e.g. 0712345678"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm focus:bg-white/5"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Security Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Password *
                </label>
                <div className="relative rounded-xl transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm focus:bg-white/5"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Confirm Password *
                </label>
                <div className="relative rounded-xl transition-all">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm focus:bg-white/5"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Optional Invite Code */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Invite Code / Referrer
              </label>
              <div className="relative rounded-xl transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Gift className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Optional invite code (e.g. MALL777)"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="block w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-sm focus:bg-white/5"
                />
              </div>
            </div>

            {/* Live Security Geolocation Gateway Badge */}
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-start gap-3.5 text-xs text-slate-300">
              <Activity className="h-5 w-5 text-emerald-500 animate-pulse shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider block">Security Location Gateway</span>
                <p className="text-[11.5px] text-slate-400 leading-tight font-mono break-words">{detectedLocation}</p>
              </div>
              <span className="text-[9px] uppercase font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none">
                SECURE
              </span>
            </div>

            {/* Sign Up Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-2xl cursor-pointer flex items-center justify-center transition-all transform active:scale-[0.99] mt-6 shadow-md shadow-emerald-950/10 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {loading ? (
                <span className="h-5.5 w-5.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Prompt Switcher to Login */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <button
                onClick={onNavigateToLogin}
                className="text-emerald-700 hover:text-emerald-800 font-bold uppercase tracking-wider text-[11px] cursor-pointer transition-colors focus:outline-none"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Floating Assistance Ring */}
      {whatsappEnabled && (
        <div className="fixed bottom-6 right-6 z-50">
          <a 
            href={whatsappUrl} 
            target="_blank" 
            rel="noreferrer" 
            title="Join community guidance" 
            className="block bg-[#25D366] p-4 rounded-full shadow-lg shadow-green-500/20 hover:scale-110 active:scale-95 transition-transform"
          >
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
               <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.898-4.45 9.898-9.898 0-2.64-1.026-5.119-2.894-6.985-1.87-1.868-4.349-2.895-6.99-2.895-5.448 0-9.897 4.45-9.897 9.898 0 2.128.597 4.195 1.731 6.014l-.066.11-1.127 4.103 4.22-.109.064-.061c.063-.061 1.259-.628 1.259-.628zm8.932-5.751c-.482-.242-2.85-1.408-3.292-1.57-.442-.162-.764-.242-1.085.242-.32.484-1.246 1.57-1.526 1.892-.281.32-.562.364-1.045.122-2.128-1.065-3.692-2.835-4.482-3.791-.257-.31-.027-.478.214-.719.222-.222.483-.564.724-.846.242-.282.322-.484.483-.807.161-.322.08-.605-.04-.847-.122-.242-1.085-2.618-1.488-3.585-.391-.937-.788-.81-1.085-.825l-.924-.015c-.322 0-.845.121-1.288.605-.443.484-1.69 1.653-1.69 4.032 0 2.378 1.732 4.675 1.973 4.997.242.322 3.411 5.21c2.19 2.223 2.186 2.221 2.204 2.628.017.382-.416 1.135-.85 1.517-.504.444-1.134.697-1.802.733-1.996.108-5.751-2.023-8.082-4.498zm-1.895-4.053c-.021-.065.044-.221.161-.403.116-.182.261-.363.383-.524.24-.316.32-.484.524-.807.039-.062.062-.124.085-.186.027-.085.051-.186-.067-.428-.119-.242-1.033-2.502-1.4-3.41-.303-.748-.616-1.29-.98-1.29-.364 0-.806 0-1.25.04a2.228 2.228 0 0 0-1.571.747c-.504.545-2.016 1.976-2.016 4.8 0 2.825 2.057 5.568 2.339 5.952.282.383 4.032 6.452 9.94 8.793 2.457.962 4.148 1.25 5.512 1.077 1.484-.19 4.036-1.654 4.598-3.267.563-1.614.563-2.985.395-3.267-.168-.282-.613-.444-1.259-.766l-4.106-2.058c-.645-.323-1.116-.484-1.5-.04-2.825 3.268-3.35 3.913-4.036 3.913-.686 0-1.372-.343-2.664-1.01-1.85-.947-3.414-2.316-4.908-4.223z"/>
            </svg>
          </a>
        </div>
      )}
      </div>
    </div>
  );
}

