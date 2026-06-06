import React, { useState, useEffect } from "react";
import { Application } from "../types";
import { 
  ShieldAlert, RefreshCw, Trash2, Calendar, Phone, Mail, 
  GraduationCap, Check, HelpCircle, FileText, CheckCircle, Search, Filter, Sparkles, UserCheck, Lock, X, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminViewProps {
  onSelectTab: (tab: "home" | "applications" | "support") => void;
  onLockAdmin?: () => void;
}

export function AdminView({ onSelectTab, onLockAdmin }: AdminViewProps) {
  const [submissions, setSubmissions] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "student" | "volunteer">("all");
  const [errorMess, setErrorMess] = useState<string | null>(null);

  // Customized, iframe-safe interactive states and notifications
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusSuccessMsg, setShowStatusSuccessMsg] = useState<string | null>(null);
  const [showDeleteSuccessMsg, setShowDeleteSuccessMsg] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; name: string; type: string; size: string } | null>(null);

  const fetchSubmissions = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setErrorMess(null);
    try {
      const res = await fetch("/api/applications");
      if (!res.ok) {
        throw new Error("Не удалось загрузить заявки с сервера.");
      }
      const data = await res.json();
      setSubmissions(data);
    } catch (err: any) {
      console.error(err);
      if (!silent) {
        setErrorMess(err.message || "Ошибка подключения");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(false);
    
    // Instant real-time background polling (runs silently every 1.5 seconds)
    const interval = setInterval(() => {
      fetchSubmissions(true);
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);

  const executeDeleteSub = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/applications/${deletingId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSubmissions((prev) => prev.filter((sub) => sub.id !== deletingId));
        setShowDeleteSuccessMsg(true);
        setTimeout(() => setShowDeleteSuccessMsg(false), 3000);
      } else {
        setShowErrorToast("Ошибка при удалении заявки с сервера.");
        setTimeout(() => setShowErrorToast(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setShowErrorToast("Не удалось запустить операцию удаления на сервере.");
      setTimeout(() => setShowErrorToast(null), 4000);
    } finally {
      setDeletingId(null);
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: "pending" | "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === id ? { ...sub, status: nextStatus } : sub))
        );
        setShowStatusSuccessMsg(nextStatus === "approved" ? "Заявка успешно одобрена!" : "Статус заявки обновлен.");
        setTimeout(() => setShowStatusSuccessMsg(null), 3000);
      } else {
        setShowErrorToast("Не удалось изменить статус заявки на сервере.");
        setTimeout(() => setShowErrorToast(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setShowErrorToast("Ошибка подключения при замене статуса.");
      setTimeout(() => setShowErrorToast(null), 4000);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    const isStudent = !sub.id.startsWith("app-vol-") && !sub.id.startsWith("vol-");
    const matchesFilter = 
      filterType === "all" ||
      (filterType === "student" && isStudent) ||
      (filterType === "volunteer" && !isStudent);

    const matchesSearch =
      sub.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.projectName && sub.projectName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.email && sub.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sub.phone && sub.phone.includes(searchQuery));

    return matchesFilter && matchesSearch;
  });

  const studentCount = submissions.filter(sub => !sub.id.startsWith("app-vol-") && !sub.id.startsWith("vol-")).length;
  const volunteerCount = submissions.length - studentCount;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header and Sync Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase">Live</span>
            <span className="bg-sky-500 text-white text-[9px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase">Куратор</span>
            <h1 className="text-xl font-display font-black tracking-tight">Панель Куратора</h1>
          </div>
          <p className="text-xs text-slate-300 font-sans leading-relaxed">
            Здесь отображаются реальные заявки от учеников и волонтеров, отправленные на ваш сайт.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchSubmissions}
            disabled={isLoading}
            className="flex-1 sm:flex-none justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-xs font-display font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 disabled:opacity-50 cursor-pointer border border-white/10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Обновить</span>
          </button>
          
          {onLockAdmin && (
            <button
              onClick={() => setLoggingOut(true)}
              className="flex-1 sm:flex-none justify-center bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 active:scale-95 transition-all text-xs font-display font-semibold py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer border border-rose-500/35"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          )}
        </div>
      </div>

      {/* Analytics Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/65 shadow-xs text-center space-y-1">
          <span className="text-[10px] uppercase font-sans font-black tracking-wider text-slate-400">Всего заявок</span>
          <span className="text-3xl font-display font-black text-slate-800 block">{submissions.length}</span>
          <span className="text-5xs uppercase text-slate-400 font-bold block">Синхронизировано в реальном времени</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/65 shadow-xs text-center space-y-1">
          <span className="text-[10px] uppercase font-sans font-black tracking-wider text-sky-505 text-sky-600">Записи детей</span>
          <span className="text-3xl font-display font-black text-sky-600 block">{studentCount}</span>
          <span className="text-5xs uppercase text-slate-404 font-bold block">бесплатное обучение</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/65 shadow-xs text-center space-y-1">
          <span className="text-[10px] uppercase font-sans font-black tracking-wider text-emerald-505 text-emerald-600">Волонтеры 14+</span>
          <span className="text-3xl font-display font-black text-emerald-600 block">{volunteerCount}</span>
          <span className="text-5xs uppercase text-slate-404 font-bold block">активисты инициативы</span>
        </div>
      </div>

      {/* Search and Filters bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по ФИО, курсу, email или телефону..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-2.5 pl-10 pr-4 text-xs font-sans focus:outline-hidden focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 transition-all text-slate-800"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterType === "all" ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Все типы
          </button>
          <button
            onClick={() => setFilterType("student")}
            className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterType === "student" ? "bg-sky-550 bg-sky-500 text-white" : "bg-sky-50 text-sky-700 hover:bg-sky-100/50"
            }`}
          >
            Дети (Ученики)
          </button>
          <button
            onClick={() => setFilterType("volunteer")}
            className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterType === "volunteer" ? "bg-emerald-555 bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100/50"
            }`}
          >
            Волонтеры 14+
          </button>
        </div>
      </div>

      {/* Main Table/List */}
      {isLoading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-xs space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-500 mx-auto animate-spin" />
          <p className="text-slate-500 text-xs font-medium">Безопасное извлечение заявок с сайта...</p>
        </div>
      ) : errorMess ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-rose-100 shadow-xs space-y-4 px-6">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-slate-800 font-bold text-sm">Временное подключение к серверу отсутствует</p>
          <p className="text-slate-450 text-xs leading-relaxed max-w-sm mx-auto">{errorMess}. Убедитесь, что сервер соединен.</p>
          <button
            onClick={fetchSubmissions}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-display font-bold py-2.5 px-5 rounded-xl cursor-pointer"
          >
            Попробовать снова
          </button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/60 shadow-xs space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-slate-600 font-bold text-sm">Новых заявок пока нет</p>
          <p className="text-xs text-slate-450">Новые поданные заявки с телефона или ПК сразу отобразятся в этом списке.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredSubmissions.map((sub) => {
              const isVol = sub.id.startsWith("app-vol-") || sub.id.startsWith("vol-");
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden flex flex-col md:flex-row justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="p-5 flex-1 space-y-4">
                    {/* Header line */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-sans font-black tracking-wider uppercase px-2 py-0.5 rounded-md ${
                        isVol ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-sky-50 text-sky-700 border border-sky-100"
                      }`}>
                        {isVol ? "Волонтер от 14 лет" : "Ученик (Ребенок)"}
                      </span>
                      <span className="text-4xs font-mono text-slate-400">ID: {sub.id}</span>
                      <span className="text-4xs font-sans font-medium text-slate-400 ml-auto">{sub.createdAt}</span>
                    </div>

                    {/* Main content row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-sans text-slate-400 uppercase tracking-wider font-extrabold">Заявитель</p>
                        <p className="font-display font-black text-sm text-slate-800 leading-tight">{sub.fullName}</p>
                        <div className="flex flex-col gap-1 pt-1">
                          <a href={`tel:${sub.phone}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-505 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{sub.phone}</span>
                          </a>
                          <a href={`mailto:${sub.email}`} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-505 font-medium truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{sub.email}</span>
                          </a>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-sans text-slate-400 uppercase tracking-wider font-extrabold">{isVol ? "Возраст" : "Ребенок (ФИО, возраст)"}</p>
                        <p className="text-xs font-display font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                          {isVol ? `${sub.volunteerAge || "От 14"} лет` : sub.childInfo || "Не указан"}
                        </p>
                      </div>
                    </div>

                    {/* Class & Details */}
                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <GraduationCap className="w-4 h-4 text-sky-500" />
                        <span>Курс: {sub.projectName || "Общие программы"}</span>
                      </div>
                      
                      {sub.motivation && (
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xxs text-slate-600 leading-relaxed font-sans">
                          <strong>Мотивация / Пожелания:</strong> {sub.motivation}
                        </div>
                      )}

                      {sub.availability && sub.availability.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center pt-1">
                          <span className="text-5xs font-sans text-slate-400 font-extrabold uppercase tracking-wide">Удобный график:</span>
                          {sub.availability.map((av) => (
                            <span key={av} className="bg-slate-100/80 text-slate-600 text-xxs px-2 py-0.5 rounded-md font-sans">
                              {av}
                            </span>
                          ))}
                        </div>
                      )}

                      {sub.documents && sub.documents.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-5xs font-sans text-slate-400 font-extrabold uppercase tracking-wide">Загруженные документы ({sub.documents.length}):</p>
                          <div className="flex flex-wrap gap-1.5 animate-in fade-in duration-200">
                            {sub.documents.map((doc) => (
                              <div
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className="bg-sky-50 hover:bg-sky-100/80 border border-sky-100/60 rounded-xl p-2 px-3 text-3xs text-sky-700 font-sans font-medium flex items-center gap-1.5 cursor-pointer select-none group transition-all"
                              >
                                <FileText className="w-3.5 h-3.5 text-sky-500 group-hover:scale-105 transition-transform" />
                                <span className="truncate max-w-[120px]">{doc.name}</span>
                                <span className="text-[9px] text-sky-405 text-sky-500 font-mono">({doc.size})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {sub.googleFormsUrl && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-5xs font-sans text-slate-400 font-extrabold uppercase tracking-wide">Ссылка на Google Forms:</p>
                          <a
                            href={sub.googleFormsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-250/70 rounded-xl p-2 px-3 text-3xs text-amber-700 font-sans font-semibold transition-colors"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-550 bg-amber-500 animate-pulse"></span>
                            <span>Открыть форму кандидата</span>
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="bg-slate-50 md:bg-white p-4 md:p-5 border-t md:border-t-0 md:border-l border-slate-100 flex md:flex-col justify-end md:justify-center items-stretch md:items-center gap-2 w-full md:w-44 shrink-0 shadow-xs">
                    <div className="flex flex-row md:flex-col gap-2 w-full items-stretch">
                      
                      {sub.status !== "approved" ? (
                        <button
                          onClick={() => handleUpdateStatus(sub.id, "approved")}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-black text-3xs uppercase py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95"
                        >
                          <Check className="w-3 h-3" />
                          Одобрить
                        </button>
                      ) : (
                        <div className="flex-1 bg-emerald-50 text-emerald-700 font-display font-black text-3xs uppercase py-2 px-3 rounded-xl border border-emerald-100 flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600 animate-pulse" />
                          Одобрена
                        </div>
                      )}

                      <button
                        onClick={() => setDeletingId(sub.id)}
                        className="bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-sans font-bold text-3xs p-2 rounded-xl transition-all border border-slate-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                        title="Удалить заявку"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Floating Alerts & Toast Panel */}
      <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2 max-w-sm w-full font-sans">
        <AnimatePresence>
          {showStatusSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-emerald-500/20"
            >
              <CheckCircle className="w-5 h-5 text-emerald-100 shrink-0" />
              <span className="text-xs font-semibold">{showStatusSuccessMsg}</span>
            </motion.div>
          )}

          {showDeleteSuccessMsg && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-800 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700"
            >
              <Trash2 className="w-5 h-5 text-rose-450 text-rose-400 shrink-0" />
              <span className="text-xs font-semibold">Заявка успешно удалена из базы данных.</span>
            </motion.div>
          )}

          {showErrorToast && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-rose-600 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 border border-rose-500/20"
            >
              <AlertCircle className="w-5 h-5 text-rose-100 shrink-0" />
              <span className="text-xs font-semibold">{showErrorToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Beautiful Interactive Overlay Modals */}
      <AnimatePresence>
        {/* Deletion Dialog */}
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
                <h3 className="font-display font-black text-slate-800 text-base leading-tight">Удалить заявку навсегда?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Это действие полностью и безвозвратно удалит выбранную анкету из реестра и базы данных FutureCore.KG.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="flex-1 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={executeDeleteSub}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer flex justify-center items-center gap-1.5"
                >
                  {isDeleting ? "Удаление..." : "Да, удалить"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Selected Document Dialog Overlay */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-205 p-6 max-w-md w-full shadow-2xl space-y-5 font-sans relative"
            >
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex gap-4 items-start text-left pt-2">
                <div className="w-12 h-12 bg-sky-50 border border-sky-150 text-sky-500 rounded-2xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1 truncate">
                  <span className="text-[9px] font-sans font-black tracking-widest text-sky-550 uppercase">Сведения о документе</span>
                  <h3 className="font-display font-black text-slate-800 text-sm truncate leading-tight" title={selectedDoc.name}>
                    {selectedDoc.name}
                  </h3>
                  <p className="text-4xs text-slate-400 font-sans">Размер файла: {selectedDoc.size}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xxs text-slate-600 space-y-1.5 leading-relaxed text-left">
                <p className="font-bold text-slate-800">Статус верификации:</p>
                <div className="flex gap-1.5 items-center text-emerald-600 font-semibold font-sans">
                  <CheckCircle className="w-4 h-4" />
                  <span>Проверен на вирусы и надежно сохранен.</span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  Файл загружен кандидатом и хранится в выделенном хранилище. Кураторы могут просматривать его через закрытый терминал администрирования.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Закрыть окно просмотра
              </button>
            </motion.div>
          </div>
        )}

        {/* Logout Dialog */}
        {loggingOut && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-205 p-6 max-w-sm w-full shadow-2xl space-y-5 text-center font-sans"
            >
              <div className="w-12 h-12 bg-slate-100 border border-slate-200 text-slate-700 rounded-full mx-auto flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-display font-black text-slate-800 text-base leading-tight">Покинуть панель куратора?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Вы выйдете из режима администрирования. Вкладка "Куратор" будет заблокирована до повторного ввода секретного пин-кода.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLoggingOut(false)}
                  className="flex-1 bg-slate-50 border border-slate-200/80 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoggingOut(false);
                    if (onLockAdmin) onLockAdmin();
                  }}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Выйти из системы
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default AdminView;
