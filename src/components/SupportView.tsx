import React, { useState, useRef, useEffect } from "react";
import { INITIAL_FAQS, BOT_RESPONSES } from "../data";
import { ChatMessage } from "../types";
import { Phone, Mail, MapPin, Clock, ShieldAlert, ChevronDown, ChevronUp, MessageSquare, Send, X, ArrowRight, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function SupportView() {
  const [openFaq, setOpenFaq] = useState<string | null>("faq-1");
  const [chatOpen, setChatOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "initial-1",
      sender: "bot",
      text: "Здравствуйте! Я виртуальный координатор FutureCore.KG. Чем я могу помочь вам? Спросите меня про наши курсы английского, математики или ИИ для детей, а также про загрузку документов, интеграцию с Google Forms или часы волонтерства.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatOpen, isTyping]);

  const toggleFaq = (id: string) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || isTyping) return;

    if (!textToSend) setChatInput("");

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-6)
        })
      });
      
      const data = await response.json();
      
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.text || "Извините, не удалось получить ответ.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: "Произошла временная техническая ошибка подключения. Вы можете связаться с нами по номеру +996 555 611 884.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">
      
      {/* Hero Section */}
      <section className="space-y-4">
        <h2 className="text-3xl font-display font-bold tracking-tight text-on-surface">
          Служба поддержки пользователей
        </h2>
        <p className="text-on-surface-variant text-base md:text-lg max-w-2xl font-sans">
          Найдите ответы на интересующие вас вопросы или свяжитесь напрямую с нашей командой поддержки FutureCore.KG в любое время.
        </p>
        <button
          onClick={() => setChatOpen(true)}
          className="w-full sm:w-auto bg-primary hover:bg-primary-container text-white py-4 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 font-display font-semibold hover:scale-102 active:scale-95 shadow-md shadow-primary/10"
        >
          <MessageSquare className="w-5 h-5 fill-white/20" />
          Начать чат с ассистентом
        </button>
      </section>

      {/* Bento Grid: FAQ + Contact Options */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FAQs */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/50 shadow-xs">
          <h3 className="text-lg font-display font-bold text-primary mb-4 uppercase tracking-wider block">
            Часто задаваемые вопросы (FAQ)
          </h3>
          <div className="space-y-3">
            {INITIAL_FAQS.map((faq) => {
              const isOpen = openFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  className="border border-slate-100 rounded-xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex justify-between items-center p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left focus:outline-hidden"
                  >
                    <span className="font-display font-semibold text-slate-800 text-sm md:text-base">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white"
                      >
                        <p className="p-4 pt-1 text-slate-600 text-sm leading-relaxed font-sans border-t border-slate-50">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact info cards */}
        <div className="lg:col-span-4 flex flex-col md:flex-row lg:flex-col gap-4">
          
          {/* Phone block */}
          <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200/50 shadow-xs hover:border-primary/30 transition-all group">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-display font-bold text-slate-800 text-base">Связь & Соцсети</h4>
            <p className="text-on-surface-variant font-display font-black text-sm mt-1">
              +996 555 611 884
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href="https://wa.me/996555611884"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-bold hover:underline"
              >
                Написать в WhatsApp <ArrowRight className="w-3 h-3" />
              </a>
              <a
                href="tel:+996555611884"
                className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
              >
                Позвонить на сотовый <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Email block */}
          <div className="flex-1 bg-white p-5 rounded-2xl border border-slate-200/50 shadow-xs hover:border-primary/30 transition-all group">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-display font-bold text-slate-800 text-base">Электронная почта</h4>
            <p className="text-on-surface-variant font-sans text-xs mt-1 truncate">
              shakirovarstan999@gmail.com
            </p>
            <a
              href="mailto:shakirovarstan999@gmail.com"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
            >
              Написать письмо <ArrowRight className="w-3 h-3" />
            </a>
          </div>

        </div>
      </div>

      {/* Location HQ */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-4">
        <div className="space-y-4">
          <h3 className="font-display font-black text-2xl text-slate-800">
            Офис FutureCore.KG
          </h3>
          <p className="text-slate-600 font-sans text-sm leading-relaxed">
            В данный момент координационный центр находится на стадии переезда для расширения аудиторий. Все официальные встречи и консультации проводятся онлайн или по предварительной записи.
            <br />
            <br />
            <strong className="text-slate-800 block text-base font-display">
              Адрес: Неизвестно
            </strong>
          </p>
          <div className="flex items-center gap-2 text-primary font-display font-semibold text-sm">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span>Пн - Пт, 9:00 - 18:00</span>
          </div>
        </div>

        {/* Visual Map Area - Styled Placeholder for Unknown Address */}
        <div className="h-60 md:h-72 w-full rounded-2xl overflow-hidden shadow-xs border border-slate-200/55 relative bg-slate-50 flex flex-col items-center justify-center text-center p-6 space-y-3 group">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 group-hover:scale-110 transition-transform duration-350">
            <MapPin className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-display font-bold text-slate-700 text-sm">Карта временно недоступна</p>
            <p className="font-sans text-slate-405 text-4xs max-w-xs leading-relaxed uppercase tracking-wider">
              Адрес офиса не определен. Используйте WhatsApp или Mail для координации личных встреч.
            </p>
          </div>
          <div className="absolute inset-0 bg-sky-500/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
      </section>

      {/* Emergency Hotline Alert */}
      <div className="p-5 md:p-6 bg-error-container text-on-error-container rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-red-200/50">
        <div className="p-3 bg-red-100 rounded-full shrink-0">
          <ShieldAlert className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h4 className="font-display font-bold text-red-950 text-base">Срочная помощь?</h4>
          <p className="font-sans text-xs md:text-sm text-red-900 leading-relaxed mt-0.5">
            Если у вас возникли экстренные вопросы или трудности с подачей заявки, вы всегда можете написать нам напрямую в WhatsApp или позвонить на сотовый номер для быстрого ответа координатора.
          </p>
        </div>
      </div>

      {/* Floating Interactive Live Chat Widget Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed inset-y-0 right-0 md:bottom-6 md:right-6 md:top-auto w-full md:w-[400px] md:h-[500px] bg-white z-100 shadow-2xl rounded-t-2xl md:rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden"
          >
            {/* Chat header */}
            <div className="bg-primary px-4 py-3 text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-primary rounded-full animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-sm leading-tight">Координатор FutureCore.KG</h4>
                  <p className="text-3xs text-white/70">Онлайн-помощник</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 px-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50 custom-scrollbar">
              {chatMessages.map((msg) => {
                const isBot = msg.sender === "bot";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isBot ? "justify-start" : "justify-end"} items-end gap-1.5`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-sans leading-relaxed shadow-3xs ${
                      isBot
                        ? "bg-white text-slate-800 rounded-bl-xs border border-slate-100"
                        : "bg-primary text-white rounded-br-xs"
                    }`}>
                      <p>{msg.text}</p>
                      <span className={`block text-4xs mt-1 text-right ${isBot ? "text-slate-400" : "text-white/60"}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex justify-start items-end gap-1.5 animate-pulse">
                  <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white text-slate-800 rounded-bl-xs border border-slate-100 shadow-3xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Sample Prompts Trigger buttons */}
            <div className="px-3 py-1.5 bg-slate-100/50 border-t border-slate-100 flex gap-1.5 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => handleSendMessage("Google Docs")}
                className="text-4xs font-semibold px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-full border border-slate-200 shrink-0 cursor-pointer"
              >
                📝 Как загрузить Google Docs?
              </button>
              <button
                onClick={() => handleSendMessage("документы")}
                className="text-4xs font-semibold px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-full border border-slate-200 shrink-0 cursor-pointer"
              >
                📎 Какие документы нужны?
              </button>
              <button
                onClick={() => handleSendMessage("volunteers")}
                className="text-4xs font-semibold px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-full border border-slate-200 shrink-0 cursor-pointer"
              >
                🤝 Критерии отбора
              </button>
            </div>

            {/* Chat input footer */}
            <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isTyping}
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-hidden focus:border-primary text-slate-800 disabled:opacity-60"
                placeholder={isTyping ? "Ассистент думает..." : "Write your question..."}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isTyping || !chatInput.trim()}
                className="p-2.5 bg-primary hover:bg-primary-container text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default SupportView;
