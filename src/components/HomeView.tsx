import { useState, useMemo } from "react";
import { Opportunity } from "../types";
import { INITIAL_OPPORTUNITIES } from "../data";
import { 
  Search, MapPin, Sparkles, Clock, Calendar, GraduationCap, 
  ShieldCheck, Heart, BookOpen, Cpu, Users, CheckCircle, ChevronRight
} from "lucide-react";
import { motion } from "motion/react";

interface HomeViewProps {
  onApply: (opportunity: Opportunity, type: "student" | "volunteer") => void;
}

export function HomeView({ onApply }: HomeViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "english" | "math" | "ai">("all");
  const [portalMode, setPortalMode] = useState<"student" | "volunteer">("student");

  const categories = [
    { id: "all", label: "Все направления", icon: Sparkles },
    { id: "english", label: "Английский язык", icon: GraduationCap },
    { id: "math", label: "Математика и логика", icon: BookOpen },
    { id: "ai", label: "Программирование и ИИ", icon: Cpu },
  ] as const;

  const filteredOpportunities = useMemo(() => {
    return INITIAL_OPPORTUNITIES.filter((opp) => {
      const matchesSearch =
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || opp.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Premium Minimalist Hero & Intro Section - Compact & beautiful without heavy folders/clutter */}
      <section className="bg-gradient-to-br from-sky-500/10 via-white to-emerald-500/5 p-6 rounded-3xl border border-slate-200/50 shadow-xs relative overflow-hidden text-center sm:text-left">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="space-y-2 md:space-y-3 flex-1">
            <div className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-150 text-sky-600 text-[10px] font-sans uppercase font-black tracking-widest px-2.5 py-1 rounded-full">
              <Sparkles className="w-3 h-3 text-sky-500" />
              <span>FutureCore.KG Initiative</span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl md:text-3xl text-slate-900 tracking-tight leading-tight">
              Образование для Каждого Ребёнка
            </h1>
            <p className="font-sans text-xs sm:text-sm text-slate-550 max-w-xl leading-relaxed">
              Бесплатные развивающие занятия (английский, математика, ИИ-кодинг) для ребят из малоимущих семей и детей с инвалидностью под руководством сертифицированных кураторов.
            </p>
          </div>
        </div>
      </section>

      {/* iOS-Style Compact Segmented Mode Selector */}
      <section className="space-y-3">
        <div className="bg-slate-100/90 p-1.5 rounded-2xl flex max-w-md mx-auto border border-slate-200 shadow-xs">
          <button
            onClick={() => setPortalMode("student")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-display font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              portalMode === "student"
                ? "bg-white text-sky-600 shadow-xs scale-[1.01]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4 text-sky-500" />
            <span>Записать ребёнка</span>
          </button>
          
          <button
            onClick={() => setPortalMode("volunteer")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-display font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              portalMode === "volunteer"
                ? "bg-white text-emerald-600 shadow-xs scale-[1.01]"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Heart className="w-4 h-4 text-emerald-500" />
            <span>Стать волонтером</span>
          </button>
        </div>

        {/* Dynamic Compact Description Tip */}
        <div className="max-w-md mx-auto text-center">
          {portalMode === "student" ? (
            <p className="text-[11px] font-sans text-sky-700 bg-sky-50/60 p-2.5 rounded-xl border border-sky-100/50 leading-relaxed">
              🙋‍♂️ <strong>Родителям:</strong> Бесплатно обучаем детей от 7 до 17 лет из социально уязвимых категорий с нуля.
            </p>
          ) : (
            <p className="text-[11px] font-sans text-emerald-800 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100/50 leading-relaxed">
              🤝 <strong>Добровольцам от 14 лет:</strong> Даем анкеты кураторов, учебный материал и гибкий график от 2 часов в неделю.
            </p>
          )}
        </div>
      </section>

      {/* Filter Component (With hidden horizontal scrollbar on mobile views for full edge swipe) */}
      <section className="space-y-3.5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
          <input
            type="text"
            id="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/50 border border-slate-200 py-3 pl-11 pr-4 rounded-2xl font-sans text-xs focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-hidden transition-all shadow-2xs placeholder-slate-400 text-slate-800"
            placeholder={portalMode === "student" ? "Поиск направления занятий..." : "Поиск вакансий для преподавателей..."}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`cat-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-display font-semibold whitespace-nowrap active:scale-95 transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic Compact Criteria Dashboard */}
      <section className="p-4 bg-white rounded-3xl border border-slate-200/55 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />
          <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-wide text-slate-705 text-slate-800">
            {portalMode === "student" ? "Условия бесплатного участия" : "Критерии отбора волонтеров"}
          </h3>
        </div>
        
        {portalMode === "student" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
              <span className="font-bold text-slate-800 block">Категория</span>
              <span className="text-slate-550 text-[11px] leading-tight block mt-0.5">Малоимущие/многодетные, дети ОВЗ, сироты.</span>
            </div>
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
              <span className="font-bold text-slate-800 block">Возраст</span>
              <span className="text-slate-550 text-[11px] leading-tight block mt-0.5">Дети и подростки в возрасте от 7 до 17 лет.</span>
            </div>
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
              <span className="font-bold text-slate-800 block">Подготовка</span>
              <span className="text-slate-550 text-[11px] leading-tight block mt-0.5">Никаких требований: учим с полного нуля.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
              <span className="font-bold text-slate-800 block">От 2ч в неделю</span>
              <span className="text-slate-550 text-[11px] leading-tight block mt-0.5">Проведение занятий онлайн или очно по свободному графику.</span>
            </div>
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
              <span className="font-bold text-slate-800 block">Возраст 14+</span>
              <span className="text-slate-550 text-[11px] leading-tight block mt-0.5">Принимаем подростков и взрослых. Работа под кураторством.</span>
            </div>
            <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
              <span className="font-bold text-slate-800 block">Забота и эмпатия</span>
              <span className="text-slate-550 text-[11px] leading-tight block mt-0.5">Искренний интерес поддержать детей из уязвимых категорий.</span>
            </div>
          </div>
        )}
      </section>

      {/* Featured Courses/Opportunities Grid */}
      <section className="space-y-4">
        <div className="flex justify-between items-center gap-2">
          <h2 className="font-display font-black text-lg sm:text-xl md:text-2xl text-slate-800 flex items-center gap-1.5">
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500 shrink-0" />
            <span>
              {portalMode === "student" ? "Доступные учебные классы" : "Актуальные волонтёрские вакансии"}
            </span>
          </h2>
          <span className="text-[11px] sm:text-xs font-bold text-sky-600 px-2.5 py-1 bg-sky-50 border border-sky-150 rounded-full whitespace-nowrap shrink-0">
            {filteredOpportunities.length === 1 
              ? "1 вариант" 
              : filteredOpportunities.length >= 2 && filteredOpportunities.length <= 4 
                ? `${filteredOpportunities.length} варианта` 
                : `${filteredOpportunities.length} вариантов`}
          </span>
        </div>

        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/60 shadow-xs">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2 animate-bounce" />
            <p className="text-slate-600 font-bold">Ничего не найдено.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-3 text-sm text-sky-500 font-bold hover:underline"
            >
              Сбросить поиск
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOpportunities.map((opp) => {
              // Dynamic labels based on Selected Mode
              const displayTitle = portalMode === "student"
                ? opp.category === "english" ? "Курс Разговорного Английского языка"
                  : opp.category === "math" ? "Занимательная Математика и Логика"
                  : "Основы ИИ и Scratch-программирования"
                : opp.title;

              const displayDescription = portalMode === "student"
                ? `Бесплатный курс для детей из малоимущих семей и детей с ОВЗ. ${opp.description.replace(/Обучение/, "Программа обучения").replace(/Помощь/, "Эффективная помощь")}`
                : opp.description;

              const displayTags = portalMode === "student"
                ? ["Бесплатно для детей", "С нуля", opp.category === "english" ? "English" : opp.category === "math" ? "Математика" : "ИИ-Кодинг", "ОВЗ-адаптировано"]
                : opp.tags;

              const displayCommitment = portalMode === "student"
                ? "2 занятия в неделю"
                : opp.commitment;

              const displayBadgeCategory = opp.category === "english" ? "Английский" : opp.category === "math" ? "Математика" : "ИИ";

              return (
                <motion.div
                  key={opp.id}
                  id={`project-card-${opp.id}`}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-250/50 shadow-xs hover:shadow-md transition-all flex flex-col h-full"
                >
                  {/* Opportunity Image Header */}
                  <div className="h-44 w-full relative group">
                    <img
                      alt={displayTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={opp.image}
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60 pointer-events-none" />
                    
                    {/* Removed 'Запись открыта' badge */}

                    <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs text-slate-800 font-display font-extrabold text-xxs uppercase tracking-wider px-2.5 py-1 rounded-md">
                      {displayBadgeCategory}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-display font-black text-slate-800 text-base leading-snug">
                        {displayTitle}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{opp.location}</span>
                      </div>
                      <p className="font-sans text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {displayDescription}
                      </p>
                    </div>

                    {/* Criteria & Badges */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap gap-1.5">
                        {displayTags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-100 text-slate-600 font-sans font-semibold text-2xs px-2.5 py-1 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-4xs uppercase font-sans tracking-wider text-slate-400 font-bold">Нагрузка</span>
                          <span className="text-xs font-display font-extrabold text-slate-750">{displayCommitment}</span>
                        </div>
                        <button
                          id={`apply-btn-${opp.id}`}
                          onClick={() => onApply(opp, portalMode)}
                          className="bg-sky-500 text-white text-xs font-display font-black px-4.5 py-2.5 rounded-xl active:scale-95 hover:bg-sky-600 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {portalMode === "student" ? "Записать ребёнка" : "Стать волонтером"}
                          <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
export default HomeView;
