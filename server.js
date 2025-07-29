const express = require('express');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- НАСТРОЙКА КЛИЕНТА GOOGLE VERTEX AI ---
const vertex_ai = new VertexAI({
    project: 'botanikoh', // Твой ID проекта
    location: 'us-central1' // Стандартный регион
});

// Указываем модель Imagen от Google
const model = 'imagegeneration@006'; // Используем последнюю стабильную версию

const generativeModel = vertex_ai.getGenerativeModel({
    model: model,
});

// --- ВСЯ НАША СТАРАЯ ЛОГИКА (ОНА НЕ МЕНЯЕТСЯ) ---
const flowerData = { /* ... (полный объект flowerData из прошлого кода) ... */ };
function getBudgetTier(budget) { /* ... (код из прошлого ответа) ... */ }
function calculateComposition(budget, style, tier) { /* ... (код из прошлого ответа) ... */ }
function getPackagingString(packaging) { /* ... (код из прошлого ответа) ... */ }
function getBackgroundString() { /* ... (код из прошлого ответа) ... */ }
function createCompositionDescription(composition) { /* ... (код из прошлого ответа) ... */ }
function createPrompt(composition, style, occasion, packaging, tier) { /* ... (код из прошлого ответа) ... */ }


// --- ГЛАВНЫЙ ЭНДПОИНТ (ПЕРЕПИСАННЫЙ ДЛЯ GOOGLE) ---
app.post('/generate-bouquet', async (req, res) => {
    try {
        const { budget, style, occasion, packaging } = req.body;
        if (!budget || !style || !occasion || !packaging) {
            return res.status(400).json({ message: "Missing required parameters." });
        }

        const tier = getBudgetTier(budget);
        const composition = calculateComposition(budget, style, tier);
        const prompt = createPrompt(composition, style, occasion, packaging, tier);
        
        console.log(`--- TIER: ${tier} --- GENERATING WITH GOOGLE IMAGEN ---`);
        console.log(prompt);

        // Новый способ генерации изображения
        const response = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        // Получаем картинку в формате base64
        const imageBase64 = response.response.candidates[0].content.parts[0].fileData.data;
        const mimeType = response.response.candidates[0].content.parts[0].fileData.mimeType;
        
        // Отправляем картинку обратно на сайт
        res.json({ imageUrl: `data:${mimeType};base64,${imageBase64}` });

    } catch (error) {
        console.error("--- GOOGLE API ERROR ---", error);
        res.status(500).json({ message: "Failed to generate image with Google. Please check server logs." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

// ВАЖНО: Вставьте сюда полные версии всех вспомогательных функций,
// помеченных как /* ... (код из прошлого ответа) ... */
