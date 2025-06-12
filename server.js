const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- БАЗА ДАННЫХ ЦВЕТОВ ---
const flowerData = {
    'Rose Pink OHara': { price: 100, style: ['Romantic', 'Classic'] },
    'Rose Caramel': { price: 60, style: ['Classic', 'Vibrant'] },
    'Spray Rose': { price: 60, style: ['Romantic', 'Classic'] },
    'Chrysanthemum': { price: 40, style: ['Classic', 'Vibrant'] },
    'Eustoma Alissa': { price: 40, style: ['Romantic', 'Minimalism'] },
    'Dianthus': { price: 30, style: ['Vibrant', 'Classic', 'Tropical'] },
    'Dahlia': { price: 50, style: ['Vibrant', 'Classic'] },
    'Gerbera': { price: 40, style: ['Vibrant', 'Tropical'] },
    'Peony': { price: 200, style: ['Romantic'] },
    'Anthurium': { price: 50, style: ['Minimalism', 'Tropical'] },
    'Craspedia': { price: 30, style: ['Vibrant', 'Tropical'] },
    'Hydrangea': { price: 200, style: ['Classic'] },
    'Protea': { price: 200, style: ['Vibrant', 'Exotic', 'Tropical', 'Minimalism'] },
    'Greenery (Eucalyptus, Ruscus)': { price: 20, style: ['Romantic', 'Classic', 'Vibrant', 'Minimalism', 'Tropical'] },
};

// --- НОВАЯ ЛОГИКА ---

// 1. Определяем "уровень" букета по бюджету
function getBudgetTier(budget) {
    if (budget <= 1200) return 'Small';
    if (budget <= 3500) return 'Medium';
    return 'Lush';
}

// 2. Подбираем состав с учетом цены и уровня
function calculateComposition(budget, style, tier) {
    let remainingBudget = budget * 0.7; // 70% бюджета на цветы
    const composition = {};

    // Устанавливаем лимит цены цветка в зависимости от уровня бюджета
    const priceLimit = tier === 'Small' ? 80 : (tier === 'Medium' ? 150 : 1000);

    const suitableFlowers = Object.keys(flowerData).filter(f => {
        const flower = flowerData[f];
        return flower.style.includes(style) && flower.price <= priceLimit;
    });

    if (suitableFlowers.length === 0) {
        // Если для Small-букета ничего не нашлось, попробуем взять что-то дороже
        const fallbackFlowers = Object.keys(flowerData).filter(f => flowerData[f].style.includes(style));
        if (fallbackFlowers.length > 0) suitableFlowers.push(fallbackFlowers[0]);
        else return {};
    }

    // Количество "проходов" зависит от уровня, чтобы букеты были разного размера
    const iterations = tier === 'Small' ? 8 : (tier === 'Medium' ? 15 : 25);

    for (let i = 0; i < iterations; i++) {
        const flowerName = suitableFlowers[Math.floor(Math.random() * suitableFlowers.length)];
        const flower = flowerData[flowerName];
        if (remainingBudget >= flower.price) {
            composition[flowerName] = (composition[flowerName] || 0) + 1;
            remainingBudget -= flower.price;
        }
    }
    return composition;
}

// 3. Создаем текст для упаковки
function getPackagingString(packaging) {
    switch (packaging.type) {
        case 'Craft Paper': return 'wrapped in natural brown craft paper';
        case 'Ribbon Only': return 'hand-tied with an elegant silk ribbon, leaving the stems exposed';
        case 'None': return 'with no packaging, presented as a simple hand-tied bouquet';
        case 'Korean Paper': default: return `wrapped in ${packaging.color.toLowerCase()} Korean waterproof paper`;
    }
}

// 4. Создаем "Арт-директорский" промпт с учетом размера
function createPrompt(composition, style, occasion, packaging, tier) {
    const compositionString = Object.entries(composition).map(([name, count]) => `${count} ${name}`).join(', ');
    const packagingString = getPackagingString(packaging);

    let sizeDescriptor = '';
    switch (tier) {
        case 'Small': sizeDescriptor = 'a delicate and modest'; break;
        case 'Medium': sizeDescriptor = 'a beautiful and well-balanced'; break;
        case 'Lush': sizeDescriptor = 'a large, abundant and luxurious'; break;
        default: sizeDescriptor = 'a beautiful';
    }

    const basePrompt = `Award-winning professional product photography of ${sizeDescriptor} ${style.toLowerCase()} flower bouquet for a ${occasion.toLowerCase()}.`;
    const compositionDetails = compositionString ? `The composition focuses on these primary flowers: ${compositionString}.` : `The composition is an elegant mix of flowers chosen by a master florist.`;
    const technicalDetails = `Shot on a Canon EOS R5 camera with a 85mm f/1.2L lens, resulting in an extremely sharp focus and a beautifully blurred background (bokeh). The lighting is soft and cinematic, with professional studio lights creating gentle highlights and deep, soft shadows, enhancing the 3D quality and texture of every petal.`;
    const colorAndRealismDetails = `The colors are rich, vibrant, and true-to-life, with professional color grading. The image is hyperrealistic, highly detailed, and exudes a feeling of luxury and elegance.`;

    const fullPrompt = [basePrompt, compositionDetails, `The bouquet is ${packagingString}.`, technicalDetails, colorAndRealismDetails].join(' ');
    return fullPrompt;
}


// --- ГЛАВНЫЙ ЭНДПОИНТ ---
app.post('/generate-bouquet', async (req, res) => {
    try {
        const { budget, style, occasion, packaging } = req.body;
        if (!budget || !style || !occasion || !packaging) {
            return res.status(400).json({ message: "Missing required parameters." });
        }

        // Вызываем всю нашу новую логику
        const tier = getBudgetTier(budget);
        const composition = calculateComposition(budget, style, tier);
        const prompt = createPrompt(composition, style, occasion, packaging, tier);

        // Логгируем, чтобы видеть в Render, что происходит
        console.log(`--- TIER: ${tier} --- GENERATING PROMPT V3 (Budget-aware) ---`);
        console.log(prompt);

        const response = await openai.images.generate({ 
            model: "dall-e-3", 
            prompt, 
            n: 1, 
            size: "1024x1024", 
            quality: "hd", 
            style: "vivid" 
        });
        res.json({ imageUrl: response.data[0].url });

    } catch (error) {
        console.error("--- ERROR ---", error.message);
        res.status(500).json({ message: "Failed to generate image. Please check server logs." });
    }
});

// --- ЗАПУСК СЕРВЕРА ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
