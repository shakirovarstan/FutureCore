import React, { useState, useRef, useEffect } from "react";
import { Opportunity, Application } from "../types";
import { INITIAL_OPPORTUNITIES } from "../data";
import { 
  ArrowLeft, ArrowRight, Save, CheckCircle, FileText, UploadCloud, 
  Trash2, Link, ExternalLink, Calendar, HelpCircle, FileCheck, Check, Sparkles, FolderSync, Info, AlertCircle, X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ApplicationsViewProps {
  activeOpportunity: Opportunity | null;
  applicationType: "student" | "volunteer";
  onSelectTab: (tab: "home" | "applications" | "support") => void;
  onCancelForm: () => void;
}

export function ApplicationsView({ 
  activeOpportunity, 
  applicationType = "student",
  onSelectTab,
  onCancelForm 
}: ApplicationsViewProps) {
  
  // Real LocalStorage state for history
  const [pastApplications, setPastApplications] = useState<Application[]>([]);

  // Sandbox-safe popups and states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedDraftMessage, setSavedDraftMessage] = useState(false);
  const [selectedAuditApp, setSelectedAuditApp] = useState<Application | null>(null);
  const [selectedDocDetails, setSelectedDocDetails] = useState<{ id: string; name: string; size: string } | null>(null);
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  
  // Wizard steps
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [childInfo, setChildInfo] = useState(""); // Child name & age (Specific to Student type)
  const [volunteerAge, setVolunteerAge] = useState(""); // Volunteer Age (Specific to Volunteer type)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [motivation, setMotivation] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  
  // Document uploading / Google Docs Integration
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; type: string; size: string; progress: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [googleDocsFormUrl, setGoogleDocsFormUrl] = useState("https://docs.google.com/forms/d/e/1FAIpQLSc6i8vKAtgXFrPcxpx4CAnb6uF_KBy7V7D9MlwWlzFfK4b30g/viewform?usp=sf_link");
  const [useGoogleDocsOnly, setUseGoogleDocsOnly] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false); // Collapsible attachment state for simplicity

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load drafts and applications with live server synchronization
  useEffect(() => {
    const getLocalApps = () => {
      const saved = localStorage.getItem("voluntree_apps");
      let localApps: Application[] = [];
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            localApps = parsed.filter((app: any) => {
              if (!app || typeof app !== "object") return false;
              if (app.id === "app-draft-1") return false;
              return true;
            });
          }
        } catch (err) {
          console.error("Failed to parse local applications", err);
        }
      }
      return localApps;
    };

    const syncWithServer = async () => {
      try {
        const res = await fetch("/api/applications");
        if (res.ok) {
          const serverApps: Application[] = await res.json();
          // Fetch freshest local ones (for newly saved drafts/actions)
          const currentLocal = getLocalApps();
          
          // Merge local applications (drafts + submitted) with live server submissions
          const merged = [...currentLocal];
          serverApps.forEach((serverApp) => {
            const idx = merged.findIndex((m) => m.id === serverApp.id);
            if (idx === -1) {
              merged.push(serverApp);
            } else {
              // Update status of matching local storage elements with the live server status
              merged[idx] = { ...merged[idx], status: serverApp.status };
            }
          });
          
          setPastApplications(merged);
          localStorage.setItem("voluntree_apps", JSON.stringify(merged));
        } else {
          setPastApplications(getLocalApps());
        }
      } catch (err) {
        console.error("Could not sync applications from server", err);
        setPastApplications(getLocalApps());
      }
    };

    syncWithServer();

    // Instant real-time background synchronization (every 1.5 seconds)
    const interval = setInterval(() => {
      syncWithServer();
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  // Autofill if opportunity selected
  useEffect(() => {
    if (activeOpportunity) {
      setStep(1);
    }
  }, [activeOpportunity]);

  const toggleAvailability = (chip: string) => {
    if (availability.includes(chip)) {
      setAvailability(availability.filter((a) => a !== chip));
    } else {
      setAvailability([...availability, chip]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
    }
  };

  const processSelectedFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const readableSize = `${(file.size / 1024).toFixed(0)} KB`;
      const newFileObj = {
        id: fileId,
        name: file.name,
        type: file.type || "file",
        size: readableSize,
        progress: 10
      };

      setUploadedFiles((prev) => [...prev, newFileObj]);

      // Progress animation
      const interval = setInterval(() => {
        setUploadedFiles((prev) => 
          prev.map((f) => {
            if (f.id === fileId) {
              const currentProgress = f.progress + 30;
              if (currentProgress >= 100) {
                clearInterval(interval);
                return { ...f, progress: 100 };
              }
              return { ...f, progress: currentProgress };
            }
            return f;
          })
        );
      }, 150);
    });
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Draft Save
  const handleSaveDraft = () => {
    if (!activeOpportunity) return;
    
    const draftApp: Application = {
      id: `draft-${Date.now()}`,
      projectId: activeOpportunity.id,
      projectName: activeOpportunity.title,
      projectImage: activeOpportunity.image,
      fullName: fullName,
      email: email,
      phone: phone,
      volunteerAge: applicationType === "volunteer" ? volunteerAge : undefined,
      motivation: applicationType === "student" ? `Ребенок: ${childInfo}. ${motivation}` : motivation,
      availability: availability,
      documents: uploadedFiles
        .filter((f) => f.progress === 100)
        .map((f) => ({ id: f.id, name: f.name, type: f.type, size: f.size })),
      googleFormsUrl: useGoogleDocsOnly ? googleDocsFormUrl : undefined,
      status: "draft",
      step: 1, // simplified to 1 step form
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [draftApp, ...pastApplications.filter((p) => p.status !== "draft")];
    setPastApplications(updated);
    localStorage.setItem("voluntree_apps", JSON.stringify(updated));
    setSavedDraftMessage(true);
  };

  // Complete Submission
  const handleFinalSubmit = async () => {
    if (!activeOpportunity) return;

    const completedApp: Application = {
      id: applicationType === "volunteer" ? `app-vol-${Date.now()}` : `app-stud-${Date.now()}`,
      projectId: activeOpportunity.id,
      projectName: applicationType === "student" 
        ? `Обучение: ${activeOpportunity.category === "english" ? "Английский разговорный" : activeOpportunity.category === "math" ? "Математика и логика" : "ИИ и Кодинг"}`
        : `Волонтёр: ${activeOpportunity.title}`,
      projectImage: activeOpportunity.image,
      fullName: fullName,
      email: email,
      phone: phone,
      volunteerAge: applicationType === "volunteer" ? volunteerAge : undefined,
      childInfo: applicationType === "student" ? childInfo : undefined,
      motivation: applicationType === "student" ? `Ребёнок: ${childInfo}. Особенности/Статус: ${motivation}` : motivation,
      availability: availability,
      documents: uploadedFiles
        .filter((f) => f.progress === 100)
        .map((f) => ({ id: f.id, name: f.name, type: f.type, size: f.size })),
      googleFormsUrl: useGoogleDocsOnly ? googleDocsFormUrl : undefined,
      status: "submitted",
      step: 2, // 2 is success step in simple format
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [completedApp, ...pastApplications.filter((p) => p.id !== "app-draft-1")];
    setPastApplications(updated);
    localStorage.setItem("voluntree_apps", JSON.stringify(updated));

    // 1. Send application to the site backend database (live synchronization)
    try {
      await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completedApp)
      });
    } catch (err) {
      console.error("Error syncing submission to site database:", err);
    }

    // 2. Clear Google Forms fields or trigger email delivery
    try {
      const emailPayload = {
        access_key: "0e5999f8-b3d5-45dc-b11f-ece390a3c2cf", // Web3Forms free direct-to-email routing token
        subject: `[FUTURECORE] Новая заявка от ${fullName} (${applicationType === "student" ? "Родитель" : "Волонтер"})`,
        from_name: "FutureCore Initiative",
        to: "shakirovarstan999@gmail.com",
        message: `
          === НОВАЯ ЗАЯВКА НА ПОРТАЛЕ FUTURECORE ===

          Тип: ${applicationType === "student" ? "Регистрация ребенка" : "Волонтер-активист (14+ лет)"}
          ФИО отправителя: ${fullName}
          Электронная почта (Email): ${email}
          Контактный телефон: ${phone}
          Событие/Класс: ${completedApp.projectName}

          Дополнительно:
          ${applicationType === "student" ? `Данные о ребенке (ФИО и возраст): ${childInfo}` : `Возраст волонтера: ${volunteerAge} лет`}

          Мотивация:
          "${motivation}"

          Удобный график занятий:
          ${availability.join(", ") || "Индивидуальный"}

          Количество вложенных файлов: ${uploadedFiles.length}
          Дата подачи: ${new Date().toLocaleString()}
        `
      };

      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload)
      });
    } catch (err) {
      console.error("Error dispatching email:", err);
    }

    setStep(2); // directly to success screen (Step 2)
  };

  const handleContinueDraft = (draft: Application) => {
    const matchingProj = INITIAL_OPPORTUNITIES.find((opp) => opp.id === draft.projectId) || null;
    if (matchingProj) {
      setStep(1);
      setFullName(draft.fullName);
      
      // Parse child info back if exists
      if (draft.motivation.startsWith("Ребенок: ")) {
        const parts = draft.motivation.split(". ");
        const firstPart = parts[0]?.replace("Ребенок: ", "") || "";
        const secondPart = parts.slice(1).join(". ") || "";
        setChildInfo(firstPart);
        setMotivation(secondPart);
      } else {
        setMotivation(draft.motivation);
      }

      setVolunteerAge(draft.volunteerAge || "");
      setEmail(draft.email);
      setPhone(draft.phone);
      setAvailability(draft.availability);
      setUploadedFiles(draft.documents.map((d) => ({ ...d, progress: 100 })));
      if (draft.googleFormsUrl) {
        setGoogleDocsFormUrl(draft.googleFormsUrl);
        setUseGoogleDocsOnly(true);
      }
      // Show attachments if they were filled
      if (draft.googleFormsUrl || draft.documents.length > 0) {
        setShowAttachments(true);
      }
      // Trigger update of selection
      onSelectTab("applications");
    }
  };

  const handleRemoveDraftFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const executeRemoveDraftFromHistory = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    // 1. Delete from local state and localStorage
    const updated = pastApplications.filter((app) => app.id !== deletingId);
    setPastApplications(updated);
    localStorage.setItem("voluntree_apps", JSON.stringify(updated));

    // 2. Clear from backend database
    try {
      await fetch(`/api/applications/${deletingId}`, {
        method: "DELETE"
      });
      setToastMessage("Заявка успешно удалена!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error("Failed to delete application from server:", err);
      setToastMessage("Ошибка соединения с сервером.");
      setTimeout(() => setToastMessage(null), 3500);
    } finally {
      setDeletingId(null);
      setIsDeleting(false);
    }
  };

  const startNewApplicationFromHistory = () => {
    onSelectTab("home");
  };

  // Availability chip presets
  const availabilityPresets = portalAvailableSchedule(applicationType);

  // ----------------------------------------------------
  // SUB-VIEW A: ACTIVE STEPPING APPLICATION FORM
  // ----------------------------------------------------
  if (activeOpportunity && step <= 2) {
    const isStudent = applicationType === "student";

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
        
        {/* Header Indicator */}
        {step === 1 && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-xs flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <div>
                <button 
                  onClick={onCancelForm}
                  className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-sans font-bold cursor-pointer mb-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Вернуться назад
                </button>
                <h2 className="font-display font-black text-lg md:text-xl text-slate-850 leading-tight">
                  {isStudent ? "Быстрая запись на обучение" : "Быстрая анкета волонтёра-преподавателя"}
                </h2>
              </div>
              <span className="font-display font-black text-xxs text-sky-600 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-md">
                Заполнение анкеты
              </span>
            </div>
            {/* Elegant visual progress bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full w-1/2 transition-all duration-300" />
            </div>
          </div>
        )}

        {/* Selected Course info banner */}
        {step === 1 && (
          <div className="bg-sky-50/55 border border-sky-100/90 p-4 rounded-2xl flex gap-3 sm:gap-4 items-center">
            <img
              alt={activeOpportunity.title}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-200 shrink-0"
              src={activeOpportunity.image}
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="text-[9px] uppercase font-sans tracking-widest font-black text-sky-600">
                {isStudent ? "Программа обучения детей" : "Выбранная вакансия наставника"}
              </span>
              <h3 className="font-display font-black text-slate-800 text-xs sm:text-sm leading-tight">
                {isStudent 
                  ? activeOpportunity.category === "english" ? "Курс Разговорного Английского языка"
                    : activeOpportunity.category === "math" ? "Занимательная Математика и Логика"
                    : "Основы ИИ и Scratch-программирования"
                  : activeOpportunity.title
                }
              </h3>
              <p className="text-4xs text-slate-500 font-sans mt-0.5">Локация: {activeOpportunity.location} • {activeOpportunity.commitment}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Unified Quick Questionnaire Form */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6 text-left"
          >
            <div className="space-y-4">
              <h3 className="text-[10px] uppercase font-sans tracking-widest font-black text-slate-400 border-b border-slate-100 pb-2">
                Контактные данные и анкета
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-display font-black text-slate-700 px-1" htmlFor="full-name">
                    {isStudent ? "ФИО Родителя / Опекуна" : "Ваше полное имя (ФИО)"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="full-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-sans text-xs focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-hidden transition-all text-slate-850"
                    placeholder={isStudent ? "Например: Смирнов Станислав Игоревич" : "Например: Смирнов Станислав"}
                  />
                </div>

                {/* AGE SECTION FOR VOLUNTEERS (Granular age requirement added explicitly) */}
                {!isStudent && (
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-xs font-display font-black text-slate-700 px-1" htmlFor="volunteer-age">
                      Ваш возраст (полных лет) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="volunteer-age"
                      required
                      min="14"
                      max="100"
                      value={volunteerAge}
                      onChange={(e) => setVolunteerAge(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-sans text-xs focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-hidden transition-all text-slate-850"
                      placeholder="Например: 21"
                    />
                  </div>
                )}

                {isStudent && (
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-xs font-display font-black text-slate-700 px-1" htmlFor="child-info">
                      Имя, фамилия и возраст ребёнка <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="child-info"
                      required
                      value={childInfo}
                      onChange={(e) => setChildInfo(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-sans text-xs focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-hidden transition-all text-slate-850"
                      placeholder="Например: Аскар Смирнов, 11 лет"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5 min-w-0">
                  <label className="text-xs font-display font-black text-slate-700 px-1" htmlFor="phone-input">
                    Номер телефона (WhatsApp / Telegram) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone-input"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-sans text-xs focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-hidden transition-all text-slate-850"
                    placeholder="+996 (___) __-__-__"
                  />
                </div>

                <div className="flex flex-col gap-1.5 min-w-0 col-span-1 md:col-span-2">
                  <label className="text-xs font-display font-black text-slate-700 px-1" htmlFor="email-input">
                    Электронная почта для обратной связи <span className="text-slate-400 font-normal">(Необязательно)</span>
                  </label>
                  <input
                    type="email"
                    id="email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-sans text-xs focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-hidden transition-all text-slate-850"
                    placeholder="example@mail.ru"
                  />
                </div>
              </div>

              {/* Motivation */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-display font-black text-slate-700 px-1" htmlFor="motivation-input">
                  {isStudent ? "Социальный статус семьи или особые потребности ребёнка (ОВЗ)" : "Кратко о вашем опыте или пожеланиях"}
                </label>
                <textarea
                  id="motivation-input"
                  rows={2}
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-sans text-xs focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-hidden transition-all text-slate-850"
                  placeholder={isStudent ? "Напишите статус семьи или имеет ли ребенок ОВЗ, чтобы мы зачислили на бесплатное льготное обучение." : "Напишите ваши мотивы или опыт в преподавании, чтобы кураторы быстрее обработали заявку."}
                />
              </div>

              {/* Availability selection */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-display font-black text-slate-700 px-1 block">
                  {isStudent ? "Предпочтительное время занятий" : "Когда вам удобно проводить занятия?"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availabilityPresets.map((preset) => {
                    const isSelected = availability.includes(preset);
                    return (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => toggleAvailability(preset)}
                        className={`px-3 py-2 rounded-xl text-xs font-sans font-bold border transition-all active:scale-95 cursor-pointer ${
                          isSelected 
                            ? "bg-sky-50 text-sky-600 border-sky-300 shadow-3xs" 
                            : "bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100"
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Simplified Collapsible Attachments Section (Keeps UI light and simple) */}
              <div className="border border-slate-200/80 rounded-2xl bg-slate-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="w-full flex items-center justify-between p-4 text-xs font-display font-black text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-slate-400 shrink-0" />
                    Прикрепить резюме/документы или Google Docs (Необязательно)
                  </span>
                  <span className="text-xxs font-sans text-sky-650 bg-sky-50 border border-sky-100/60 px-2 py-0.5 rounded-md">
                    {showAttachments ? "Скрыть" : "Раскрыть"}
                  </span>
                </button>

                <AnimatePresence>
                  {showAttachments && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200 p-4 space-y-4 bg-white"
                    >
                      <p className="text-4xs sm:text-[11px] text-slate-500 font-sans leading-relaxed">
                        Вы можете загрузить подтверждающие документы/резюме напрямую на сайт, либо просто привязать готовую ссылку на вашу Google Form / Google Docs.
                      </p>

                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-xs">
                        <button
                          type="button"
                          onClick={() => setUseGoogleDocsOnly(false)}
                          className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-sans font-black rounded-lg transition-transform ${
                            !useGoogleDocsOnly 
                              ? "bg-white text-slate-800 shadow-3xs" 
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Файлы
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseGoogleDocsOnly(true)}
                          className={`flex-1 py-1.5 text-[9px] uppercase tracking-wider font-sans font-black rounded-lg transition-transform ${
                            useGoogleDocsOnly 
                              ? "bg-white text-slate-800 shadow-3xs" 
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          Google Forms
                        </button>
                      </div>

                      {!useGoogleDocsOnly ? (
                        <div className="space-y-3">
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={triggerFileSelect}
                            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                              isDragging 
                                ? "border-sky-500 bg-sky-50/20" 
                                : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/20"
                            }`}
                          >
                            <input
                              type="file"
                              id="documents-upload-input"
                              multiple
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1 animate-pulse" />
                            <p className="font-display font-bold text-xs text-slate-750">
                              Нажмите, чтобы выбрать файлы (PDF, DOCX, JPG)
                            </p>
                          </div>

                          {uploadedFiles.length > 0 && (
                            <div className="space-y-1.5">
                              {uploadedFiles.map((file) => (
                                <div key={file.id} className="bg-slate-50 border border-slate-150 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs">
                                  <div className="flex items-center gap-2 truncate">
                                    <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                                    <span className="font-medium truncate">{file.name}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeFile(file.id)}
                                    className="text-rose-500 p-1 hover:bg-rose-50 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-sans font-black text-slate-450 uppercase block" htmlFor="google-url-input">
                            Ссылка на анкету / документ
                          </label>
                          <div className="relative">
                            <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="url"
                              id="google-url-input"
                              value={googleDocsFormUrl}
                              onChange={(e) => setGoogleDocsFormUrl(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 font-sans text-xs focus:ring-3 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-800"
                              placeholder="https://docs.google.com/forms/..."
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>
          </motion.div>
        )}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-7 sm:p-9 rounded-3xl border border-slate-200 shadow-md text-center space-y-6 max-w-md mx-auto"
          >
            <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full mx-auto flex items-center justify-center border border-emerald-150 shadow-inner">
              <Check className="w-7 h-7 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-display font-black text-lg sm:text-xl text-slate-800 leading-tight">
                Анкета успешно принята!
              </h3>
              <p className="font-sans text-xs text-slate-500 leading-relaxed">
                Спасибо за вашу бесценную заявку в <strong>FutureCore.KG</strong> по направлению <strong className="text-slate-800 font-display">{activeOpportunity.title}</strong>. Данные сохранены в реестре.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left font-sans text-xs space-y-2">
              <div className="flex gap-1.5 items-center text-sky-600 font-display font-black text-4xs tracking-wider uppercase">
                <CheckCircle className="w-4 h-4" />
                <span>Что будет теперь?</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-xxs leading-relaxed">
                <li>Интегрированная форма занесена в ваш профиль Личного кабинета.</li>
                <li>Кураторы свяжутся с вами по указанному телефону в течение 24 часов.</li>
                <li>Статус прохождения проверки доступен ниже на этой странице.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                onCancelForm();
                // Clear state fields so the next form is clean
                setFullName("");
                setChildInfo("");
                setVolunteerAge("");
                setEmail("");
                setPhone("");
                setMotivation("");
                setAvailability([]);
                setUploadedFiles([]);
              }}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white text-xs font-display font-bold py-3 px-4 rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
            >
              Отлично, перейти в кабинет!
            </button>
          </motion.div>
        )}

        {/* Unified Light Controls Footer (visible only in step 1 editing) */}
        {step === 1 && (
          <div className="bg-white border border-slate-205 p-3 rounded-2xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 shadow-xs">
            <button
              type="button"
              onClick={onCancelForm}
              className="text-slate-500 text-xs font-display font-bold px-4 py-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer text-center focus:outline-hidden"
            >
              Отмена
            </button>

            {formValidationError && (
              <div className="text-rose-600 text-[11.5px] font-sans font-bold bg-rose-50 border border-rose-100/85 rounded-xl p-3 flex items-center gap-2 text-left mb-2 w-full">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{formValidationError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="text-slate-600 text-xs font-display font-bold px-4 py-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 focus:outline-hidden cursor-pointer whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5 text-slate-400" />
                Сохранить черновик
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!fullName.trim()) {
                    setFormValidationError("Пожалуйста, заполните ФИО.");
                    return;
                  }
                  if (isStudent && !childInfo.trim()) {
                    setFormValidationError("Пожалуйста, укажите ФИО и возраст ребенка.");
                    return;
                  }
                  if (!isStudent && !volunteerAge.trim()) {
                    setFormValidationError("Пожалуйста, укажите ваш возраст.");
                    return;
                  }
                  if (!phone.trim()) {
                    setFormValidationError("Пожалуйста, введите контактный номер телефона.");
                    return;
                  }
                  setFormValidationError(null);
                  handleFinalSubmit();
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-display font-black px-5 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer focus:outline-hidden"
              >
                Подать анкету в 1 клик
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // SUB-VIEW B: HISTORY LIST & PORTFOLIO EXPLAINER DASHBOARD
  // ----------------------------------------------------
  return (
    <div className="space-y-6 animate-in fade-in duration-350">
      
      {/* Dynamic dashboard Explainer - EXPLAINS EXACTLY WHAT THIS VIEW DOES, REMOVES CONFUSION */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white border border-slate-700/30 shadow-md space-y-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-sky-500/15 border border-sky-400/40 text-sky-305 text-4xs uppercase font-sans font-black tracking-widest px-2.5 py-1 rounded-full">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            Информационная панель Личного Кабинета
          </div>
          <h2 className="text-xl md:text-2xl font-display font-black tracking-tight leading-tight">
            Кабинет соискателя & Верификация заявок
          </h2>
          <p className="text-slate-300 text-xs font-sans max-w-2xl leading-relaxed">
            Это ваш личный центр управления. Здесь вы можете в режиме реального времени наблюдать за статусом ваших поданных анкет: будь то <strong>запись вашего ребёнка на бесплатное обучение</strong> или <strong>ваше участие в роли преподавателя-волонтёра</strong>. Вы также всегда можете восстановить сохраненные черновики.
          </p>
        </div>

        {/* 3 stages cycle explanations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-705 text-xs text-slate-300">
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex gap-2.5 items-start">
            <span className="w-5 h-5 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center font-display font-bold shrink-0 text-3xs">1</span>
            <div>
              <p className="font-display font-bold text-white text-[11px] leading-tight">Заполнение анкеты</p>
              <p className="text-slate-400 text-4xs mt-0.5 leading-tight">Ввод контактов ученика или волонтера и документов</p>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex gap-2.5 items-start">
            <span className="w-5 h-5 bg-sky-500/20 text-sky-400 rounded-full flex items-center justify-center font-display font-bold shrink-0 text-3xs">2</span>
            <div>
              <p className="font-display font-bold text-white text-[11px] leading-tight">Проверка куратором</p>
              <p className="text-slate-400 text-4xs mt-0.5 leading-tight">Координаторы FutureCore проверят льготы или опыт резюме</p>
            </div>
          </div>

          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex gap-2.5 items-start">
            <span className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-display font-bold shrink-0 text-3xs">3</span>
            <div>
              <p className="font-display font-bold text-white text-[11px] leading-tight">Старт обучений</p>
              <p className="text-slate-400 text-4xs mt-0.5 leading-tight">Добавление ребенка в учебный чат и звонок по расписанию</p>
            </div>
          </div>
        </div>
      </div>

      {pastApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/50 shadow-xs">
          <FolderSync className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-pulse" />
          <h3 className="font-display font-black text-slate-800 text-base">Нет активных поданных анкет</h3>
          <p className="font-sans text-xs text-on-surface-variant mt-1.5 max-w-sm mx-auto leading-relaxed">
            На главной странице выберите нужный режим (Записать ребёнка на курсы или стать преподавателем) и нажмите кнопку для оформления быстрой анкеты!
          </p>
          <button
            onClick={startNewApplicationFromHistory}
            className="mt-4 bg-sky-500 text-white text-xs font-display font-bold px-5 py-3 rounded-xl active:scale-95 shadow-sm hover:bg-sky-600 transition-transform cursor-pointer"
          >
            Выбрать курс или вакансию
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1.5 gap-2">
            <h3 className="font-display font-black text-slate-800 text-sm md:text-base">История ваших заполнений</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{pastApplications.length}</span>
              <button
                onClick={() => setClearingHistory(true)}
                className="text-[10px] text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 p-1 px-2 rounded-lg font-sans font-bold transition-all cursor-pointer"
              >
                Очистить историю
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {pastApplications.map((app) => {
              const isDraft = app.status === "draft";
              const isVol = app.id.startsWith("app-vol-") || app.id.startsWith("vol-");
              return (
                <div
                  key={app.id}
                  onClick={() => !isDraft && setSelectedAuditApp(app)}
                  className={`bg-white rounded-2xl overflow-hidden border border-slate-250/50 shadow-xs p-5 space-y-4 transition-all ${
                    !isDraft ? "hover:border-sky-305 hover:shadow-xs cursor-pointer" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                    
                    {/* Project profile information */}
                    <div className="flex items-center gap-3">
                      <img
                        alt={app.projectName}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-150 shrink-0"
                        src={app.projectImage}
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <h3 className="font-display font-black text-slate-850 text-sm md:text-base leading-tight">
                          {app.projectName}
                        </h3>
                        <p className="text-4xs text-slate-400 font-sans mt-0.5 uppercase font-medium tracking-wide">
                          ДАТА: {app.createdAt} • ID: {app.id.substring(0, 14)}...
                        </p>
                      </div>
                    </div>

                    {/* Status badge chips */}
                    <div className="flex items-center gap-2">
                      {isDraft ? (
                        <span className="text-[10px] uppercase tracking-wider font-sans font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          Черновик
                        </span>
                      ) : app.status === "approved" ? (
                        <span className="text-[10px] uppercase tracking-wider font-sans font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          {isVol ? "Волонтер Принят" : "Ребенок Зачислен"}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-sans font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-100">
                          На рассмотрении у FutureCore
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile contents summary details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3.5 border-t border-slate-100/70 text-xs">
                    <div className="text-left">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Имя в анкете</span>
                      <span className="text-slate-800 font-semibold">{app.fullName || "—"}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Выбранный график</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {app.availability.length === 0 ? (
                          <span className="text-slate-500 text-xxs italic">Гибкий график</span>
                        ) : (
                          app.availability.map((av) => (
                            <span key={av} className="text-[10px] font-sans font-medium text-slate-600 bg-slate-55 bg-slate-100 px-2 py-0.5 rounded-lg leading-tight">
                              {av}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Интегрированные документы</span>
                      {app.googleFormsUrl ? (
                        <a
                          href={app.googleFormsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-600 hover:underline inline-flex items-center gap-1 mt-0.5 font-display font-extrabold text-[10px]"
                        >
                          Google Forms <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : app.documents.length === 0 ? (
                        <span className="text-slate-400 italic">Не прикреплялись (ввод вручную)</span>
                      ) : (
                        <span className="text-slate-700 font-semibold inline-flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          файлов: {app.documents.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons list */}
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-50/50">
                    <button
                      type="button"
                      onClick={(e) => handleRemoveDraftFromHistory(app.id, e)}
                      className="text-red-500 hover:bg-red-50 rounded-xl p-2 px-3 text-xs font-sans font-bold cursor-pointer transition-colors"
                    >
                      Удалить
                    </button>

                    {isDraft ? (
                      <button
                        onClick={() => handleContinueDraft(app)}
                        className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-display font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform flex items-center gap-1 shadow-sm"
                      >
                        Продолжить заполнение
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAuditApp(app);
                          }}
                          className="text-slate-600 text-[11px] font-display font-medium px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                        >
                          Подробный аудит записи
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

            {/* Additional helper action */}
            <div className="text-center pt-2.5">
              <button
                onClick={startNewApplicationFromHistory}
                className="text-xs text-sky-600 font-display font-bold bg-sky-50 border border-sky-150 hover:bg-sky-100 px-5 py-3 rounded-full transition-colors inline-block cursor-pointer shadow-xs"
              >
                + Записать еще одного ребенка или подать заявку на вакансию
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Toast Panel */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2 max-w-sm w-full font-sans">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700"
            >
              <Info className="w-5 h-5 text-sky-400 shrink-0" />
              <span className="text-xs font-semibold">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sandbox-Friendly Interactive Dialog Overlays */}
      <AnimatePresence>
        {/* Save Draft Success Dialog */}
        {savedDraftMessage && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-205 p-6 max-w-sm w-full shadow-2xl space-y-5 text-center font-sans"
            >
              <div className="w-12 h-12 bg-sky-50 border border-sky-150 text-sky-500 rounded-full mx-auto flex items-center justify-center">
                <Save className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-slate-800 text-base leading-tight">Черновик успешно сохранён!</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Вы сможете продолжить заполнение в любое удобное время прямо из вашего личного кабинета.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSavedDraftMessage(false);
                  onCancelForm();
                }}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Вернуться на главную
              </button>
            </motion.div>
          </div>
        )}

        {/* Delete Draft/Submission Confirmation Dialog */}
        {deletingId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-205 p-6 max-w-sm w-full shadow-2xl space-y-5 text-center font-sans"
            >
              <div className="w-12 h-12 bg-rose-50 border border-rose-150 text-rose-500 rounded-full mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-slate-800 text-base leading-tight">Удалить эту запись?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Вы собираетесь удалить вашу запись и поданную заявку из реестра. Это действие нельзя отменить.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="flex-1 bg-slate-50 border border-slate-200/85 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={executeRemoveDraftFromHistory}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  {isDeleting ? "Стирание..." : "Да, удалить"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Clear All History Confirmation Dialog */}
        {clearingHistory && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-205 p-6 max-w-sm w-full shadow-2xl space-y-5 text-center font-sans"
            >
              <div className="w-12 h-12 bg-rose-50 border border-rose-150 text-rose-500 rounded-full mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-slate-800 text-base leading-tight">Очистить всю историю?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Вы полностью сотрёте локальную историю всех ваших заполнений во всех проектах. Это действие необратимо.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClearingHistory(false)}
                  className="flex-1 bg-slate-50 border border-slate-200/85 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("voluntree_apps", JSON.stringify([]));
                    setPastApplications([]);
                    setClearingHistory(false);
                    setToastMessage("История очищена!");
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Стереть всё
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Detailed Audit App Detail View Overlay */}
        {selectedAuditApp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-150 p-6 md:p-7 max-w-lg w-full shadow-2xl space-y-5 font-sans relative my-8 text-left animate-in fade-in zoom-in-95 duration-200"
            >
              <button
                type="button"
                onClick={() => setSelectedAuditApp(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-4 items-start pt-2">
                <img
                  alt={selectedAuditApp.projectName}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-150 shrink-0"
                  src={selectedAuditApp.projectImage}
                  referrerPolicy="no-referrer"
                />
                <div className="space-y-1 truncate">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {selectedAuditApp.status === "approved" ? (
                      <span className="text-[9px] font-sans font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150 uppercase">
                        {(selectedAuditApp.id.startsWith("app-vol-") || selectedAuditApp.id.startsWith("vol-")) ? "Волонтер Принят" : "Ребенок Зачислен"}
                      </span>
                    ) : selectedAuditApp.status === "draft" ? (
                      <span className="text-[9px] font-sans font-black tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-150 uppercase">
                        Черновик
                      </span>
                    ) : (
                      <span className="text-[9px] font-sans font-black tracking-widest text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100 uppercase">
                        На рассмотрении
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-black text-slate-800 text-sm md:text-base leading-snug truncate" title={selectedAuditApp.projectName}>
                    {selectedAuditApp.projectName}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Анкета подана: {selectedAuditApp.createdAt}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3.5 space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {/* Applicant data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs leading-relaxed">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider font-sans">ФИО в анкете</span>
                    <span className="text-slate-800 font-semibold">{selectedAuditApp.fullName || "—"}</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 font-sans">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider font-sans">Контактный телефон</span>
                    <span className="text-slate-800 font-semibold">{selectedAuditApp.phone || "—"}</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 col-span-1 sm:col-span-2 font-sans">
                    <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider font-sans">
                      {(selectedAuditApp.id.startsWith("app-vol-") || selectedAuditApp.id.startsWith("vol-")) ? "Возраст волонтера" : "ФИО и возраст ребенка"}
                    </span>
                    <span className="text-slate-800 font-semibold">
                      {(selectedAuditApp.id.startsWith("app-vol-") || selectedAuditApp.id.startsWith("vol-")) 
                        ? (selectedAuditApp.volunteerAge || "—") 
                        : (selectedAuditApp.childInfo || "—")}
                    </span>
                  </div>
                </div>

                {/* Motivation Text */}
                {selectedAuditApp.motivation && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100/60 text-xs text-slate-650 leading-relaxed font-sans">
                    <strong className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider mb-1">
                      {(selectedAuditApp.id.startsWith("app-vol-") || selectedAuditApp.id.startsWith("vol-")) ? "О себе и мотивация" : "Цель занятий и пожелания"}
                    </strong>
                    {selectedAuditApp.motivation}
                  </div>
                )}

                {/* Convenient Schedule Schedule Selection */}
                {selectedAuditApp.availability && selectedAuditApp.availability.length > 0 && (
                  <div className="space-y-1.5 text-xs font-sans">
                    <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider font-sans">Расписание</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAuditApp.availability.map((day) => (
                        <span key={day} className="text-[10px] font-sans font-semibold text-slate-600 bg-slate-100 border border-slate-150 px-2.5 py-1 rounded-lg leading-tight">
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uploaded Files Section */}
                {selectedAuditApp.documents && selectedAuditApp.documents.length > 0 && (
                  <div className="space-y-1.5 text-xs font-sans">
                    <span className="text-[9px] text-slate-400 font-semibold block uppercase tracking-wider">Прикрепленные документы ({selectedAuditApp.documents.length})</span>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedAuditApp.documents.map((file) => (
                        <div
                          key={file.id || file.name}
                          onClick={() => setSelectedDocDetails(file)}
                          className="bg-sky-50 hover:bg-sky-100/80 border border-sky-100 flex items-center justify-between p-2.5 rounded-xl text-3xs text-sky-700 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck className="w-4 h-4 text-sky-500 shrink-0" />
                            <span className="font-semibold truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <span className="text-[9px] text-sky-500 font-mono">({file.size})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-3.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAuditApp(null)}
                  className="flex-1 bg-slate-900 hover:bg-slate-855 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer text-center"
                >
                  Закрыть аудит записи
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Selected Doc Details Internal Overlay */}
        {selectedDocDetails && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-205 p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans text-left relative"
            >
              <button
                type="button"
                onClick={() => setSelectedDocDetails(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-3 items-center pt-2">
                <div className="w-10 h-10 bg-sky-50 border border-sky-150 text-sky-500 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h4 className="font-display font-black text-slate-800 text-xs truncate leading-tight font-sans">{selectedDocDetails.name}</h4>
                  <p className="text-[9px] text-slate-400 font-mono">Размер: {selectedDocDetails.size}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 leading-normal mb-1">
                Файл успешно сохранён и зашифрован на сервере FutureCore.KG. Выгрузка возможна только кураторами учебных групп.
              </div>

              <button
                type="button"
                onClick={() => setSelectedDocDetails(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Preset helpers
function portalAvailableSchedule(applicationType: string): string[] {
  if (applicationType === "student") {
    return [
      "Будние дни (Утро)",
      "Будние дни (День)",
      "Будние дни (Вечер)",
      "Выходные дни (Утро)",
      "Выходные дни (День)",
      "Выходные дни (Вечер)"
    ];
  }
  return [
    "Будние: утренние созвоны",
    "Будние: вечерние занятия",
    "Выходные: проведение уроков",
    "Любое свободное время"
  ];
}

export default ApplicationsView;
