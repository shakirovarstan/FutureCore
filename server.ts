import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

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

async function startServer() {
  const app = express();
  const PORT = 3000;
  
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
      fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), "utf-8");
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
- Кандидаты могут загружать документы (PDF, DOCX, JPG) напрямую в форму (на Шаге 2 анкеты) или прикреплять ссылку на заполненную Google Форму регистрации.

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
        // filter or transform
        const recentHistory = history.slice(-6); // Last 6 messages to keep context short and fast
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
        model: "gemini-3.5-flash",
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

  app.get("/api/applications", (req, res) => {
    const subs = loadSubmissions();
    res.json(subs);
  });

  app.post("/api/applications", (req, res) => {
    const newSub = req.body;
    if (!newSub || !newSub.id) {
      return res.status(400).json({ error: "Invalid submission data" });
    }
    const subs = loadSubmissions();
    // Prevent duplicates
    const filtered = subs.filter((s: any) => s.id !== newSub.id);
    filtered.unshift(newSub);
    saveSubmissions(filtered);
    res.status(201).json({ success: true, count: filtered.length });
  });

  app.delete("/api/applications/:id", (req, res) => {
    const { id } = req.params;
    const subs = loadSubmissions();
    const filtered = subs.filter((s: any) => s.id !== id);
    saveSubmissions(filtered);
    res.json({ success: true, count: filtered.length });
  });

  app.patch("/api/applications/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const subs = loadSubmissions();
    const updated = subs.map((s: any) => {
      if (s.id === id) {
        return { ...s, status };
      }
      return s;
    });
    saveSubmissions(updated);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
