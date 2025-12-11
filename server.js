import https from "https";

const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});

import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import crypto from "crypto";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const GIGACHAT_AUTH_KEY = process.env.GIGACHAT_AUTH_KEY;

// --- Получаем Access Token ---
async function getAccessToken() {
    const response = await axios.post(
        "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
        "scope=GIGACHAT_API_PERS",
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${GIGACHAT_AUTH_KEY}`,
                "RqUID": crypto.randomUUID()
            },
            httpsAgent // ← добавлено
        }
    );

    return response.data.access_token;
}

// --- Генерация ответа ---
app.post("/generate", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt обязателен" });
        }

        const token = await getAccessToken();

        const response = await axios.post(
            "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
            {
                model: "GigaChat",
                messages: [
                    {
                        role: "system",
                        content: "Ты создаёшь структурированный, краткий отчёт о совещании."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                httpsAgent // ← добавлено
            }
        );

        res.json({ result: response.data.choices[0].message.content });

    } catch (err) {
        console.error("Ошибка GigaChat:", err.response?.data || err);
        res.status(500).json({
            error: "Ошибка при обращении к GigaChat",
            details: err.response?.data || err.message
        });
    }
});

app.get("/", (req, res) => {
    res.send("GigaChat backend работает!");
});

app.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
});
