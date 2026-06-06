import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { HomeView } from "./components/HomeView";
import { ApplicationsView } from "./components/ApplicationsView";
import { SupportView } from "./components/SupportView";
import { AdminView } from "./components/AdminView";
import { Opportunity } from "./types";
import { Home, FileText, HelpCircle, Shield, Key, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab ] = useState<"home" | "applications" | "support" | "admin">("home");
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  const [applicationType, setApplicationType] = useState<"student" | "volunteer">("student");

  // Scroll to top window on navigation between views
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab, activeOpportunity]);

  // Authentication configuration for Curator panel
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(() => {
    return localStorage.getItem("admin_unlocked") === "true";
  });
  const [logoClicks, setLogoClicks] = useState(0);
  const [lastLogoClickTime, setLastLogoClickTime] = useState(0);
  const [showPasscodeDialog, setShowPasscodeDialog] = useState(false);
  const [enteredPasscode, setEnteredPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  const handleLogoClick = () => {
    const now = Date.now();
    setLogoClicks((prev) => {
      // Rapid clicking: reset click stream if there's a delay of more than 3.5 seconds
      const isQuickTap = now - lastLogoClickTime < 3500;
      const count = isQuickTap ? prev + 1 : 1;
      setLastLogoClickTime(now);
      
      if (count >= 5) {
        setShowPasscodeDialog(true);
        setPasscodeError("");
        setEnteredPasscode("");
        return 0;
      }
      return count;
    });
  };

  const handleVerifyPasscode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = enteredPasscode.trim();
    if (clean === "futurecore1234") {
      setIsAdminUnlocked(true);
      localStorage.setItem("admin_unlocked", "true");
      setShowPasscodeDialog(false);
      setEnteredPasscode("");
      setPasscodeError("");
      setActiveTab("admin");
    } else {
      setPasscodeError("Доступ запрещен. Некорректный ключ авторизации куратора.");
    }
  };

  const handleLockAdmin = () => {
    setIsAdminUnlocked(false);
    localStorage.removeItem("admin_unlocked");
    setActiveTab("home");
  };

  const handleApplyToOpportunity = (opp: Opportunity, type: "student" | "volunteer") => {
    setActiveOpportunity(opp);
    setApplicationType(type);
    setActiveTab("applications");
  };

  const handleCancelApplicationFlow = () => {
    setActiveOpportunity(null);
  };

  return (
    <div id="app-root" className="min-h-screen bg-background text-on-surface pb-28 md:pb-12 pt-20 flex flex-col font-sans selection:bg-primary-fixed selection:text-on-primary-fixed">
      
      {/* Top Application Bar Header */}
      <Header onLogoClick={handleLogoClick} />

      {/* Main View Container */}
      <main id="main-content" className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (activeOpportunity ? `-${activeOpportunity.id}` : "")}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {activeTab === "home" && (
              <HomeView onApply={handleApplyToOpportunity} />
            )}
            
            {activeTab === "applications" && (
              <ApplicationsView 
                activeOpportunity={activeOpportunity} 
                applicationType={applicationType}
                onSelectTab={(tab) => setActiveTab(tab)}
                onCancelForm={handleCancelApplicationFlow}
              />
            )}
            
            {activeTab === "support" && (
              <SupportView />
            )}

            {activeTab === "admin" && (
              <AdminView 
                onSelectTab={(tab) => setActiveTab(tab)} 
                onLockAdmin={handleLockAdmin}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Bottom Tab Navigation (Optimized for Mobile/Touch viewports with modern active state capsule) */}
      <nav 
        id="bottom-nav"
        className="fixed bottom-0 left-0 w-full z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-6px_20px_rgba(15,23,42,0.06)] h-16 rounded-t-2xl flex justify-around items-center px-2 pb-safe md:max-w-md md:left-1/2 md:-translate-x-1/2 md:bottom-4 md:rounded-2xl md:border will-change-transform"
      >
        {/* Navigation Tab: Home */}
        <button
          onClick={() => {
            setActiveTab("home");
            handleCancelApplicationFlow();
          }}
          className={`flex-1 flex flex-col items-center justify-center h-full py-1.5 transition-all duration-200 cursor-pointer focus:outline-hidden relative group`}
          style={{ minHeight: '48px' }}
        >
          <div className={`p-1 px-3 rounded-full flex flex-col items-center justify-center transition-all ${
            activeTab === "home" 
              ? "bg-sky-50 text-sky-600 font-extrabold" 
              : "text-slate-500 hover:text-slate-900"
          }`}>
            <Home className={`w-[18px] h-[18px] ${activeTab === "home" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium">Главная</span>
          </div>
          {activeTab === "home" && (
            <span className="absolute bottom-1 w-1 h-1 bg-sky-500 rounded-full" />
          )}
        </button>

        {/* Navigation Tab: Applications / Forms */}
        <button
          onClick={() => setActiveTab("applications")}
          className={`flex-1 flex flex-col items-center justify-center h-full py-1.5 transition-all duration-200 cursor-pointer focus:outline-hidden relative group`}
          style={{ minHeight: '48px' }}
        >
          <div className={`p-1 px-3 rounded-full flex flex-col items-center justify-center transition-all ${
            activeTab === "applications" 
              ? "bg-sky-50 text-sky-600 font-extrabold" 
              : "text-slate-500 hover:text-slate-900"
          }`}>
            <div className="relative">
              <FileText className={`w-[18px] h-[18px] ${activeTab === "applications" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              {activeOpportunity && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-sky-500 rounded-full animate-ping" />
              )}
            </div>
            <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium">Кабинет</span>
          </div>
          {activeTab === "applications" && (
            <span className="absolute bottom-1 w-1 h-1 bg-sky-500 rounded-full" />
          )}
        </button>

        {/* Navigation Tab: Support FAQ */}
        <button
          onClick={() => {
            setActiveTab("support");
            handleCancelApplicationFlow();
          }}
          className={`flex-1 flex flex-col items-center justify-center h-full py-1.5 transition-all duration-200 cursor-pointer focus:outline-hidden relative group`}
          style={{ minHeight: '48px' }}
        >
          <div className={`p-1 px-3 rounded-full flex flex-col items-center justify-center transition-all ${
            activeTab === "support" 
              ? "bg-sky-50 text-sky-600 font-extrabold" 
              : "text-slate-500 hover:text-slate-900"
          }`}>
            <HelpCircle className={`w-[18px] h-[18px] ${activeTab === "support" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
            <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium">Поддержка</span>
          </div>
          {activeTab === "support" && (
            <span className="absolute bottom-1 w-1 h-1 bg-sky-500 rounded-full" />
          )}
        </button>

        {/* Navigation Tab: Admin / Curator */}
        {isAdminUnlocked && (
          <button
            onClick={() => {
              setActiveTab("admin");
              handleCancelApplicationFlow();
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full py-1.5 transition-all duration-200 cursor-pointer focus:outline-hidden relative group`}
            style={{ minHeight: '48px' }}
          >
            <div className={`p-1 px-3 rounded-full flex flex-col items-center justify-center transition-all ${
              activeTab === "admin" 
                ? "bg-slate-900 text-white font-extrabold" 
                : "text-slate-500 hover:text-slate-900"
            }`}>
              <Shield className={`w-[18px] h-[18px] ${activeTab === "admin" ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
              <span className="text-[10px] font-sans mt-0.5 tracking-tight font-medium">Куратор</span>
            </div>
            {activeTab === "admin" && (
              <span className="absolute bottom-1 w-1 h-1 bg-slate-900 rounded-full" />
            )}
          </button>
        )}
      </nav>

      {/* Interactive Beautiful Passcode Modal Dialog */}
      <AnimatePresence>
        {showPasscodeDialog && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasscodeDialog(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.92, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.38 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 z-120 overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowPasscodeDialog(false)}
                className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <form onSubmit={handleVerifyPasscode} className="space-y-4">
                <div className="flex flex-col items-center text-center space-y-2 mt-2">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-2xs">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-slate-800 text-base">Вход в панель куратора</h3>
                    <p className="text-[11px] text-slate-500 font-sans mt-1">Доступ только для уполномоченных администраторов.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-sans font-black uppercase text-slate-400 tracking-wider">Введите ваш пароль</label>
                  <input
                    type="password"
                    style={{ WebkitTextSecurity: "disc" }}
                    placeholder="••••••••"
                    value={enteredPasscode}
                    onChange={(e) => {
                      setEnteredPasscode(e.target.value);
                      if (passcodeError) setPasscodeError("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-mono text-center text-sm tracking-widest focus:outline-hidden focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-800"
                    autoFocus
                  />
                  {passcodeError && (
                    <span className="text-[11px] font-sans font-medium text-rose-600 text-center block leading-tight">{passcodeError}</span>
                  )}
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasscodeDialog(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 text-xs font-display font-bold py-3 rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-850 text-white text-xs font-display font-bold py-3 rounded-xl transition-all shadow-md shadow-slate-950/15"
                  >
                    Войти
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
