const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- НАША БАЗА ДАННЫХ ЦВЕТОВ ---
const flowerData = {
    'Rose Pink O\'Hara': { price: 100, style: ['Romantic', 'Classic'] },
    'Rose Caramel': { price: 60, style: ['Classic', 'Vibrant'] },
    'Spray Rose': { price: 60, style: ['Romantic'] },
    'Chrysanthemum': { price: 40, style: ['Classic', 'Vibrant'] },
    'Eustoma Alissa': { price: 40, style: ['Romantic'] },
    'Dianthus': { price: 30, style: ['Vibrant', 'Classic'] },
    'Peony': { price: 200, style: ['Romantic'] },
    'Hydrangea': { price: 200, style: ['Classic'] },
    'Protea': { price: 200, style: ['Vibrant', 'Exotic'] },
    'Greenery': { price: 20, style: ['Romantic', 'Classic', 'Vibrant'] },
};

// --- ЛОГИКА "МОЗГА" ---
function calculateComposition(budget, style) {
    let remainingBudget = budget * 0.7; // 30% оставляем на работу и доп. материалы
    const composition = {};

    const suitableFlowers = Object.keys(flowerData).filter(f => flowerData[f].style.includes(style));
    
    // ИЗМЕНЕНИЕ: Проверка, что подходящие цветы вообще есть
    if (suitableFlowers.length === 0) {
        return {}; // Возвращаем пустой объект, если не нашли цветов для этого стиля
    }

    for (let i = 0; i < 15; i++) { // Увеличим количество итераций для более пышных букетов
        const flowerName = suitableFlowers[Math.floor(Math.random() * suitableFlowers.length)];
        const flower = flowerData[flowerName];

        if (remainingBudget >= flower.price) {
            composition[flowerName] = (composition[flowerName] || 0) + 1;
            remainingBudget -= flower.price;
        }
    }
    return composition;
}

function createPrompt(composition, style, occasion, packaging) {
    const compositionString = Object.entries(composition)
        .map(([name, count]) => `${count} ${name}`)
        .join(', ');

    // ИЗМЕНЕНИЕ: "Защита от дурака" - если композиция пуста, создаем более общий промпт
    if (!compositionString) {
        return `Photorealistic studio quality photo. A beautiful, ${style.toLowerCase()} flower bouquet for a ${occasion.toLowerCase()}, based on the florist's choice. The bouquet is wrapped in ${packaging.color.toLowerCase()} ${packaging.type.toLowerCase()}. Clean, professional lighting on a neutral background.`;
    }

    return `Photorealistic studio quality photo. A beautiful, ${style.toLowerCase()} flower bouquet for a ${occasion.toLowerCase()}. The composition must include: ${compositionString}. The bouquet is wrapped in ${packaging.color.toLowerCase()} ${packaging.type.toLowerCase()}. Clean, professional lighting on a neutral background. Focus on the texture and details of the flowers.`;
}

// --- НАШ API ЭНДПОИНТ ---
app.post('/generate-bouquet', async (req, res) => {
    try {
        const { budget, style, occasion, packaging } = req.body;

        if (!budget || !style || !occasion || !packaging) {
            return res.status(400).json({ message: "Missing required parameters." });
        }

        const composition = calculateComposition(budget, style);
        const prompt = createPrompt(composition, style, occasion, packaging);

        // НОВОЕ ИЗМЕНЕНИЕ: Логгируем промпт перед отправкой! Это супер-важно для отладки.
        console.log('--- GENERATING PROMPT ---', prompt);

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard", // Используем standard, чтобы было быстрее и дешевле для тестов
        });

        const imageUrl = response.data[0].url;
        res.json({ imageUrl });

    } catch (error) {
        // Улучшенное логгирование ошибок
        console.error("--- ERROR ---");
        console.error("Error Message:", error.message);
        console.error("Error Type:", error.type);
        console.error("Error Details:", error);
        console.error("--- END ERROR ---");
        res.status(500).json({ message: "Failed to generate image due to an internal error." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
