const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- ОБНОВЛЕННАЯ БАЗА ЦВЕТОВ ---
const flowerData = {
    'Rose Pink O\'Hara': { price: 100, style: ['Romantic', 'Classic'] },
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

    // Для минимализма делаем меньше итераций, для тропического - больше
    const iterations = style === 'Minimalism' ? 5 : (style === 'Tropical' ? 20 : 15);

    for (let i = 0; i < iterations; i++) {
        const flowerName = suitableFlowers[Math.floor(Math.random() * suitableFlowers.length)];
        const flower = flowerData[flowerName];
        if (remainingBudget >= flower.price) {
            composition[flowerName] = (composition[flowerName] || 0) + 1;
            remainingBudget -= flower.price;
        }
    }
    // Если в минимализме слишком много цветов, урежем до 2-3 видов
    if (style === 'Minimalism' && Object.keys(composition).length > 3) {
        const minimalComposition = {};
        Object.entries(composition).slice(0, 3).forEach(([name, count]) => {
            minimalComposition[name] = count;
        });
        return minimalComposition;
    }
    return composition;
}

// Умный генератор текста для упаковки
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

function createPrompt(composition, style, occasion, packaging) {
    const compositionString = Object.entries(composition).map(([name, count]) => `${count} ${name}`).join(', ');
    const packagingString = getPackagingString(packaging);

    if (!compositionString) {
        return `Photorealistic studio quality photo. A beautiful, ${style.toLowerCase()} flower bouquet for a ${occasion.toLowerCase()}, based on the florist's choice. The bouquet is ${packagingString}. Clean, professional lighting on a neutral background.`;
    }

    return `Photorealistic studio quality photo. A beautiful, ${style.toLowerCase()} flower bouquet for a ${occasion.toLowerCase()}. The composition focuses on these primary flowers: ${compositionString}. The bouquet is ${packagingString}. Clean, professional lighting on a neutral background. Focus on texture and detail.`;
}

app.post('/generate-bouquet', async (req, res) => {
    try {
        const { budget, style, occasion, packaging } = req.body;
        if (!budget || !style || !occasion || !packaging) {
            return res.status(400).json({ message: "Missing required parameters." });
        }
        const composition = calculateComposition(budget, style);
        const prompt = createPrompt(composition, style, occasion, packaging);

        console.log('--- GENERATING PROMPT ---', prompt);

        const response = await openai.images.generate({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", quality: "standard" });
        res.json({ imageUrl: response.data[0].url });
    } catch (error) {
        console.error("Error generating bouquet:", error);
        res.status(500).json({ message: "Failed to generate image." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
