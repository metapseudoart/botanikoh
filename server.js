const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- НАША БАЗА ДАННЫХ ЦВЕТОВ ---
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

function calculateComposition(budget, style) {
    let remainingBudget = budget * 0.7;
    const composition = {};
    const suitableFlowers = Object.keys(flowerData).filter(f => flowerData[f].style.includes(style));
    if (suitableFlowers.length === 0) return {};

    const iterations = style === 'Minimalism' ? 5 : (style === 'Tropical' ? 20 : 15);

    for (let i = 0; i < iterations; i++) {
        const flowerName = suitableFlowers[Math.floor(Math.random() * suitableFlowers.length)];
        const flower = flowerData[flowerName];
        if (remainingBudget >= flower.price) {
            composition[flowerName] = (composition[flowerName] || 0) + 1;
            remainingBudget -= flower.price;
        }
    }
    if (style === 'Minimalism' && Object.keys(composition).length > 3) {
        const minimalComposition = {};
        Object.entries(composition).slice(0, 3).forEach(([name, count]) => {
            minimalComposition[name] = count;
        });
        return minimalComposition;
    }
    return composition;
}

function getPackagingString(packaging) {
    switch (packaging.type) {
        case 'Craft Paper':
            return 'wrapped in natural brown craft paper';
        case 'Ribbon Only':
            return 'hand-tied with an elegant silk ribbon, leaving the stems exposed';
        case 'None':
            return 'with no packaging, presented as a simple hand-tied bouquet';
        case 'Korean Paper':
        default:
            return `wrapped in ${packaging.color.toLowerCase()} Korean waterproof paper`;
    }
}

// --- УЛУЧШЕННЫЙ ПРОМПТ-ИНЖЕНЕР "АРТ-ДИРЕКТОР" ---
function createPrompt(composition, style, occasion, packaging) {
    const compositionString = Object.entries(composition).map(([name, count]) => `${count} ${name}`).join(', ');
    const packagingString = getPackagingString(packaging);
    
    // Определяем основной тон промпта
    const basePrompt = `Award-winning professional product photography of a beautiful, artistic, ${style.toLowerCase()} flower bouquet for a ${occasion.toLowerCase()}.`;

    // Детали композиции
    const compositionDetails = compositionString 
        ? `The composition focuses on these primary flowers: ${compositionString}.` 
        : `The composition is an elegant mix of flowers chosen by a master florist.`;
    
    // Детали камеры и освещения для максимального реализма
    const technicalDetails = `Shot on a Canon EOS R5 camera with a 85mm f/1.2L lens, resulting in an extremely sharp focus and a beautifully blurred background (bokeh). The lighting is soft and cinematic, with professional studio lights creating gentle highlights and deep, soft shadows, enhancing the 3D quality and texture of every petal.`;

    // Детали цветов и финальный штрих
    const colorAndRealismDetails = `The colors are rich, vibrant, and true-to-life, with professional color grading. The image is hyperrealistic, highly detailed, and exudes a feeling of luxury and elegance.`;

    const fullPrompt = [basePrompt, compositionDetails, `The bouquet is ${packagingString}.`, technicalDetails, colorAndRealismDetails].join(' ');

    return fullPrompt;
}

app.post('/generate-bouquet', async (req, res) => {
    try {
        const { budget, style, occasion, packaging } = req.body;
        if (!budget || !style || !occasion || !packaging) {
            return res.status(400).json({ message: "Missing required parameters." });
        }
        const composition = calculateComposition(budget, style);
        const prompt = createPrompt(composition, style, occasion, packaging);

        console.log('--- GENERATING PROMPT V2 (Art Director) ---', prompt);

        const response = await openai.images.generate({ 
            model: "dall-e-3", 
            prompt, 
            n: 1, 
            size: "1024x1024", 
            quality: "hd", // <-- HD качество для большей детализации
            style: "vivid"  // <-- Яркие, насыщенные цвета
        });
        res.json({ imageUrl: response.data[0].url });
    } catch (error) {
        console.error("Error generating bouquet:", error);
        res.status(500).json({ message: "Failed to generate image." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
