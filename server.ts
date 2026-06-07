import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
}

// Helper to write robust diagnostics to a local diagnostics log
function logDiagnostic(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[Diagnostic] [${timestamp}] ${message}`);
  
  try {
    // Only attempt file logging if not in production (serverless safe)
    if (process.env.NODE_ENV !== "production") {
      const logPath = path.join(process.cwd(), "diagnostics.log");
      fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`, "utf-8");
    }
  } catch (e) {
    // Silent fail for file logging in serverless
  }
}

// Lazy Firestore init — avoids cold-start crashes on Vercel serverless
let db: any = null;
let dbInitAttempted = false;

function getDb() {
  if (dbInitAttempted) return db;
  dbInitAttempted = true;
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      const firebaseApp = initializeApp(config);
      db = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
      }, config.firestoreDatabaseId);
      logDiagnostic("Firebase Firestore initialized successfully with HTTP long-polling on backend.");
    } else {
      logDiagnostic("firebase-applet-config.json not found, falling back to local storage file.");
    }
  } catch (e: any) {
    logDiagnostic(`Error initializing Firebase: ${e.message || String(e)}`);
  }
  return db;
}

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  return {
    token: token || null,
    chatId: chatId || null,
    isConfigured: !!(token && chatId),
  };
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function clearTelegramWebhook(token: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: false }),
    });
  } catch (err: any) {
    logDiagnostic(`Telegram deleteWebhook skipped: ${err.message || String(err)}`);
  }
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  await clearTelegramWebhook(token);

  const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  const tgRes = await fetch(tgUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data: any = await tgRes.json().catch(() => ({}));

  if (tgRes.ok) {
    return { ok: true as const, data };
  }

  // Retry without HTML parse mode if Telegram rejects formatting
  if (data?.description?.includes("parse")) {
    const plainRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.replace(/<[^>]+>/g, ""),
        disable_web_page_preview: true,
      }),
    });
    const plainData: any = await plainRes.json().catch(() => ({}));
    if (plainRes.ok) {
      return { ok: true as const, data: plainData };
    }
    return { ok: false as const, status: plainRes.status, error: plainData.description || "Unknown Telegram error" };
  }

  return { ok: false as const, status: tgRes.status, error: data.description || "Unknown Telegram error" };
}

// Robust custom date parsing helper resolving local formats e.g. "DD.MM.YYYY" or ISO
function parseDateString(dateStr: string): number {
  if (!dateStr) return 0;
  const ts = Date.parse(dateStr);
  if (!isNaN(ts)) return ts;

  const parts = dateStr.split(".");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.getTime();
    }
  }
  return 0;
}

// Helper to fetch submissions from Firestore returning null on failure to safeguard fallback
async function getFirestoreSubmissions(): Promise<any[] | null> {
  const firestore = getDb();
  if (!firestore) {
    logDiagnostic("getFirestoreSubmissions - db is not initialized.");
    return null;
  }
  try {
    const querySnapshot = await getDocs(collection(firestore, "submissions"));
    const list: any[] = [];
    querySnapshot.forEach((docSnapshot) => {
      list.push({ ...docSnapshot.data() });
    });
    const sorted = list.sort((a, b) => {
      const dateA = a.createdAt ? parseDateString(a.createdAt) : 0;
      const dateB = b.createdAt ? parseDateString(b.createdAt) : 0;
      return dateB - dateA;
    });
    logDiagnostic(`getFirestoreSubmissions - successfully fetched ${list.length} submissions.`);
    return sorted;
  } catch (err: any) {
    logDiagnostic(`Failed to fetch from Firestore: ${err.message || String(err)} -- Stack: ${err.stack || ""}`);
    return null;
  }
}

// Helper to save submission to Firestore
async function saveFirestoreSubmission(sub: any): Promise<void> {
  const firestore = getDb();
  if (!firestore) {
    logDiagnostic("saveFirestoreSubmission - db is not initialized.");
    return;
  }
  try {
    await setDoc(doc(firestore, "submissions", sub.id), sub);
    logDiagnostic(`saveFirestoreSubmission - successfully saved ${sub.id} to Firestore.`);
  } catch (err: any) {
    logDiagnostic(`Failed to save ${sub.id} to Firestore: ${err.message || String(err)}`);
    throw err;
  }
}

// Helper to delete submission from Firestore
async function deleteFirestoreSubmission(id: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) {
    logDiagnostic("deleteFirestoreSubmission - db is not initialized.");
    return;
  }
  try {
    await deleteDoc(doc(firestore, "submissions", id));
    logDiagnostic(`deleteFirestoreSubmission - successfully deleted ${id} from Firestore.`);
  } catch (err: any) {
    logDiagnostic(`Failed to delete ${id} from Firestore: ${err.message || String(err)}`);
    throw err;
  }
}

// Helper to update status in Firestore
async function updateFirestoreSubmissionStatus(id: string, status: string): Promise<void> {
  const firestore = getDb();
  if (!firestore) {
    logDiagnostic("updateFirestoreSubmissionStatus - db is not initialized.");
    return;
  }
  try {
    const docRef = doc(firestore, "submissions", id);
    await setDoc(docRef, { status }, { merge: true });
    logDiagnostic(`updateFirestoreSubmissionStatus - successfully updated status of ${id} to ${status} in Firestore.`);
  } catch (err: any) {
    logDiagnostic(`Failed to update status of ${id} in Firestore: ${err.message || String(err)}`);
    throw err;
  }
}

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

const SUBMISSIONS_FILE = path.join(process.cwd(), "submissions.json");

// Helper to load submissions
function loadSubmissions() {
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("Error reading submissions", e);
    return [];
  }
}

// Helper to save submissions
function saveSubmissions(submissions: any[]) {
  try {
    // Only attempt local file write if not in production
    if (process.env.NODE_ENV !== "production") {
      fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), "utf-8");
    }
  } catch (e) {
    console.error("Error saving submissions", e);
  }
}

// API router endpoints
app.post("/api/support/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing message in request body" });
  }

  const client = getGeminiClient();
  if (!client) {
    // Fallback matching logic
    const BOT_RESPONSES: Record<string, string> = {
      "hello": "Привет! Я виртуальный координатор FutureCore. Наша организация обучает детей из малоимущих семей и ребят с инвалидностью английскому языку, математике и искусственному интеллекту (ИИ). Я могу проконсультировать вас по поводу регистрации и загрузки документов!",
      "привет": "Здравствуйте! Я виртуальный помощник FutureCore. Наша организация обучает детей из малоимущих семей и ребят с инвалидностью английскому языку, математике и искусственному интеллекту (ИИ). Напишите ключевые слова, например 'английский', 'математика' или 'ИИ', чтобы узнать подробнее!",
      "английск": "Наше направление английского языка сфокусировано на детях с ОВЗ и ребятах из малоимущих семей. Мы учим слова в интерактивном игровом формате, поем песни и смотрим адаптированные мультики. Потребуется знание языка уровня B2+ и высокая чуткость!",
      "english": "Наше направление английского языка сфокусировано на детях с ОВЗ и ребятах из малоимущих семей. Мы учим слова в интерактивном игровом формате, поем песни и смотрим адаптированные мультики. Потребуется знание языка уровня B2+ и высокая чуткость!",
      "математик": "По математике мы помогаем ребятам освоить базовую школьную программу, развивать математическую логику и логические игры. Занятия проходят онлайн через Zoom или очно в общественном центре.",
      "ии": "Мы знакомим детей из малоимущих семей с нейросетями, генерацией картинок и Scratch-программированием! Это дает мощный карьерный старт и развивает цифровое творчество. Специальное IT-образование не требуется, мы даем готовые уроки.",
      "ai": "Мы знакомим детей из малоимущих семей с нейросетями, генерацией картинок и Scratch-программированием! Это дает мощный карьерный старт и развивает цифровое творчество. Специальное IT-образование не требуется, мы даем готовые уроки.",
      "нейросе": "Мы знакомим детей из малоимущих семей с нейросетями, генерацией картинок и Scratch-программированием! Это дает мощный карьерный старт и развивает цифровое творчество. Специальное IT-образование не требуется, мы даем готовые уроки.",
      "google": "Вы можете загрузить документы как напрямую в нашем приложении (нажмите 'Далее' на странице заполнения заявки), так и через прикрепленную ссылку на Google Docs / Google Forms. Там вы легко загрузите резюме и паспортные данные!",
      "docs": "Для максимального удобства вы можете заполнить официальную Google-форму регистрации, прикрепив документы (резюме, сертификаты, удостоверение личности), и указать ссылку в нашей анкете.",
      "document": "На шаге 2 нашей формы вы можете загрузить в формате PDF, DOCX или JPG такие документы, как паспорт/ID, резюме (CV) или свидетельство СОР.",
      "volunteer": "Мы всегда рады новым волонтерам! Нам требуются участники готовые уделять от 2-4 часов в неделю и искренне любящие общение с детьми и преподавание.",
      "support": "Если у вас возник экстренный вопрос, напишите на почту shakirovarstan999@gmail.com или свяжитесь по телефону/WhatsApp +996 555 611 884."
    };
    
    const normalized = message.toLowerCase();
    let botAnswer = "Спасибо за ваш вопрос! Я могу проконсультировать вас по поводу регистрации волонтеров, записи детей на бесплатные занятия, загрузки документов и интеграции с Google Forms. Пожалуйста, спросите про 'английский', 'математика', 'ИИ' или 'документы'.";
    for (const key of Object.keys(BOT_RESPONSES)) {
      if (normalized.includes(key)) {
        botAnswer = BOT_RESPONSES[key];
        break;
      }
    }
    return res.json({ text: botAnswer });
  }

  try {
    const systemInstruction = `Ты — официальный ИИ-координатор образовательного портала FutureCore.KG.
FutureCore.KG — это некоммерческая инициатива по бесплатному обучению детей (из малоимущих семей и детей с инвалидностью/ОВЗ) трем основным направлениям:
1. Английский язык (English): Обучение базовому английскому языку для детей с инвалидностью и из малоимущих семей в игровой, чуткой, интерактивной форме. Для волонтеров требуется уровень B2+ и высокая эмпатия.
2. Математика и логика (Math): Освоение школьной программы, развитие логики. Занятия в онлайн-формате или в общественном центре "Радуга".
3. ИИ и цифровое творчество (AI): Знакомство с нейросетями, генеративным искусством и Scratch на доступном уровне.

Требования к волонтерам-преподавателям:
- Возраст: старше 14 лет (под кураторством) или старше 18 лет.
- Справка об отсутствии судимости (бесплатно на Госуслугах) и резюме (CV) обязательны для работы с детьми.
- Занятия проходят 2-4 часа в неделю.

Интеграция документов и Google Forms:
- Кандидаты могут загружать документы (PDF, DOCX, JPG) напрямую в форму (на Шаге 2 анкеты) или прикреплять ссылку на заполненою Google Форму регистрации.

Контакты координатора:
- Email: shakirovarstan999@gmail.com
- Телефон/WhatsApp: +996 555 611 884
- Офис в данный момент переезжает, поэтому все консультации проходят в онлайн-виде.

Инструкции по стилю ответов:
- Отвечай вежливо, дружелюбно, по-человечески, с высокой эмпатией и только на русском языке.
- Твои ответы должны быть лаконичными и точными (не длиннее 3-4 предложений), структурированными и сфокусированными на интересе пользователя.
- Если тебя спрашивают о вещах, не связанных с FutureCore.KG, вежливо направь разговор обратно на тему помощи детям, волонтерства, обучения английскому, математике или искусственному интеллекту в нашей инициативе.`;

    const contentsList: any[] = [];
    
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      recentHistory.forEach((h: any) => {
        const role = h.sender === "user" ? "user" : "model";
        contentsList.push({
          role,
          parts: [{ text: h.text }]
        });
      });
    }
    
    contentsList.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await client.models.generateContent({
      model: "gemini-1.5-flash",
      contents: contentsList,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ text: response.text || "Извините, не удалось сформировать ответ." });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(200).json({ text: "Не удалось подключиться к ИИ-сервису в данный момент, но я готов помочь вам по ключевым вопросам о наших учебных программах, требованиях и правилах!" });
  }
});

app.get("/api/applications", async (req, res) => {
  let subs = null;
  if (getDb()) {
    subs = await getFirestoreSubmissions();
  }
  
  if (subs !== null) {
    saveSubmissions(subs);
    return res.json(subs);
  } else {
    console.warn("Serving submissions from local fallback JSON cache.");
    const cached = loadSubmissions();
    return res.json(cached);
  }
});

// Status endpoint for Telegram bot configuration
app.get("/api/telegram-config", (req, res) => {
  const { isConfigured, chatId } = getTelegramConfig();
  res.json({
    isConfigured,
    chatId: chatId ? chatId.replace(/.(?=.{4})/g, "*") : null
  });
});

// Test Telegram endpoint
app.post("/api/telegram-test", async (req, res) => {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    return res.status(400).json({ 
      success: false, 
      error: "Telegram API не настроен (отсутствуют токены в .env / секретах)." 
    });
  }

  try {
    const result = await sendTelegramMessage(
      token,
      chatId,
      "🚀 <b>FUTURECORE.KG: Тестовое сообщение</b>\nЕсли вы получили это сообщение, значит ваш бот корректно настроен и готов к работе!"
    );

    if (result.ok) {
      console.log(`[Telegram Test] Success: ${JSON.stringify(result.data)}`);
      return res.json({ success: true, message: "Тестовое сообщение успешно отправлено!" });
    }

    console.error(`[Telegram Test] API Error: ${result.status} ${result.error}`);
    return res.status(result.status || 400).json({ 
      success: false, 
      error: `Ошибка Telegram API (${result.status}): ${result.error}` 
    });
  } catch (err: any) {
    console.error(`[Telegram Test] Network Error: ${err.message}`);
    return res.status(500).json({ 
      success: false, 
      error: `Сетевая ошибка: ${err.message}` 
    });
  }
});

app.post("/api/applications", async (req, res) => {
  const newSub = req.body;
  const logInfo = `[POST /api/applications] ID: ${newSub?.id}. Bot Token: ${!!process.env.TELEGRAM_BOT_TOKEN}, Chat ID: ${process.env.TELEGRAM_CHAT_ID}`;
  logDiagnostic(logInfo);
  console.log(logInfo);

  if (!newSub || !newSub.id) {
    return res.status(400).json({ error: "Invalid submission data" });
  }
  
  // 1. Immediately store in local file cache (only if non-prod)
  if (process.env.NODE_ENV !== "production") {
    const subs = loadSubmissions();
    const filtered = subs.filter((s: any) => s.id !== newSub.id);
    filtered.unshift(newSub);
    saveSubmissions(filtered);
  }

  // 2. Persist to central Firestore database
  if (getDb()) {
    try {
      await saveFirestoreSubmission(newSub);
    } catch (err: any) {
      console.error(`Firestore save error for ${newSub.id}:`, err);
    }
  }

  // 3. Automatically dispatch Telegram Bot notification
  const { token: tgToken, chatId: tgChatId } = getTelegramConfig();
  if (tgToken && tgChatId) {
    try {
      const typeLabel = newSub.type === "volunteer" || newSub.id.startsWith("app-vol-")
        ? "🌟 Заявка ВОЛОНТЕРА (14+ лет)" 
        : "👶 Заявка на бесплатное ОБУЧЕНИЕ";
        
      const availabilityText = Array.isArray(newSub.availability) && newSub.availability.length > 0
        ? newSub.availability.map((item: string) => escapeHtml(item)).join(", ") 
        : "Индивидуальный график";

      const filesText = Array.isArray(newSub.documents) && newSub.documents.length > 0
        ? newSub.documents.map((d: any) => `• 📄 <b>${escapeHtml(d.name || "Документ")}</b> (${Math.round((d.size || 0) / 1024)} KB)`).join("\n")
        : "Нет прикрепленных документов";

      const volunteerLine = newSub.volunteerAge
        ? `👶 <b>Возраст волонтера:</b> ${escapeHtml(String(newSub.volunteerAge))} лет\n`
        : "";
      const childLine = newSub.childInfo
        ? `👶 <b>Ребенок (ФИО, возраст):</b> ${escapeHtml(newSub.childInfo)}\n`
        : "";

      const tgMessage = 
`<b>=== FUTURECORE.KG ===</b>\n` +
`🔔 <b>ПОЛУЧЕНА НОВАЯ АНКЕТА!</b>\n\n` +
`👤 <b>ФИО:</b> ${escapeHtml(newSub.fullName || "—")}\n` +
`🏷 <b>Тип:</b> ${typeLabel}\n` +
`📞 <b>Телефон:</b> <code>${escapeHtml(newSub.phone || "—")}</code>\n` +
`📧 <b>Email:</b> <code>${escapeHtml(newSub.email || "—")}</code>\n` +
`📚 <b>Выбранное направление:</b> <i>${escapeHtml(newSub.projectName || "—")}</i>\n` +
volunteerLine +
childLine +
`\n📋 <b>О себе / Сообщение:</b>\n<i>${escapeHtml(newSub.motivation || "Не заполнено")}</i>\n\n` +
`🗓 <b>Удобный график:</b> ${availabilityText}\n\n` +
`📂 <b>Файлы:</b>\n${filesText}\n\n` +
`🕒 <b>Дата подачи:</b> ${escapeHtml(newSub.createdAt || new Date().toLocaleString())}`;

      const result = await sendTelegramMessage(tgToken, tgChatId, tgMessage);

      if (!result.ok) {
        const errMsg = `Telegram API error status ${result.status} for application ${newSub.id}: ${result.error}`;
        logDiagnostic(errMsg);
        console.error(errMsg);
      } else {
        const okMsg = `Telegram notification successfully delivered for application ${newSub.id}`;
        logDiagnostic(okMsg);
        console.log(okMsg);
      }

    } catch (tgErr: any) {
      const fatalMsg = `Failed to dispatch Telegram notification for ${newSub.id}: ${tgErr.message || String(tgErr)}`;
      logDiagnostic(fatalMsg);
      console.error(fatalMsg);
    }
  } else {
    console.warn(`Telegram notification skipped for ${newSub.id}: Credentials missing. TOKEN: ${!!tgToken}, CHAT_ID: ${!!tgChatId}`);
  }

  res.status(201).json({ success: true, count: 1 });
});

app.delete("/api/applications/:id", async (req, res) => {
  const { id } = req.params;
  
  // 1. Local cache (non-prod only)
  if (process.env.NODE_ENV !== "production") {
    const subs = loadSubmissions();
    const filtered = subs.filter((s: any) => s.id !== id);
    saveSubmissions(filtered);
  }

  // 2. Firestore sync
  if (getDb()) {
    try {
      await deleteFirestoreSubmission(id);
      console.log(`Successfully synced deleted doc ${id} from Firestore.`);
    } catch (err) {
      console.error(`Error deleting doc ${id} from Firestore:`, err);
    }
  }

  res.json({ success: true });
});

app.patch("/api/applications/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  // 1. Local cache (non-prod only)
  if (process.env.NODE_ENV !== "production") {
    const subs = loadSubmissions();
    const updated = subs.map((s: any) => (s.id === id ? { ...s, status } : s));
    saveSubmissions(updated);
  }

  // 2. Firestore sync
  if (getDb()) {
    try {
      await updateFirestoreSubmissionStatus(id, status);
      console.log(`Successfully patched status of ${id} in Firestore.`);
    } catch (err) {
      console.error(`Error patching status of ${id} in Firestore:`, err);
    }
  }

  res.json({ success: true });
});

// Diagnostic endpoint to check env vars visibility on Vercel
app.get("/api/debug-env", (req, res) => {
  const tg = getTelegramConfig();
  res.json({
    nodeEnv: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    hasToken: !!tg.token,
    hasChatId: !!tg.chatId,
    hasGemini: !!process.env.GEMINI_API_KEY,
    currentTime: new Date().toISOString()
  });
});

// Final handler for SPA serving (only in prod)
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    // Check if it's an API route that fell through
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Export app here
export default app;

// Standalone start (local development only — never on Vercel/serverless)
async function startServer() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return;
  }

  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Development server running at http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

