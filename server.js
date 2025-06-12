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

// --- ВСЯ ЛОГИКА ---

function getBudgetTier(budget) {
    if (budget <= 1200) return 'Small';
    if (budget <= 3500) return 'Medium';
    return 'Lush';
}

function calculateComposition(budget, style, tier) {
    let remainingBudget = budget * 0.7;
    const composition = {};
    const priceLimit = tier === 'Small' ? 80 : (tier === 'Medium' ? 150 : 1000);
    let suitableFlowers = Object.keys(flowerData).filter(f => {
        const flower = flowerData[f];
        return flower.style.includes(style) && flower.price <= priceLimit;
    });
    if (suitableFlowers.length === 0) {
        const fallbackFlowers = Object.keys(flowerData).filter(f => flowerData[f].style.includes(style));
        if (fallbackFlowers.length > 0) suitableFlowers = fallbackFlowers;
        else return {};
    }
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

function getPackagingString(packaging) {
    switch (packaging.type) {
        case 'Craft Paper': return 'wrapped in natural brown craft paper';
        case 'Ribbon Only': return 'hand-tied with an elegant silk ribbon, leaving the stems exposed';
        case 'None': return 'with no packaging, presented as a simple hand-tied bouquet';
        case 'Korean Paper': default: return `wrapped in ${packaging.color.toLowerCase()} Korean waterproof paper`;
    }
}

function getBackgroundString() {
    const backgrounds = ["on a clean, bright, off-white studio background.", "against a minimalist, light grey textured wall, creating a sophisticated look.", "in a modern, airy interior setting with soft, natural light coming from a nearby window.", "on a seamless, solid, soft pastel color background that complements the bouquet.", "placed on a minimalist light-colored surface, shot from a pleasing angle."];
    return backgrounds[Math.floor(Math.random() * backgrounds.length)];
}

function createCompositionDescription(composition) {
    const sortedFlowers = Object.entries(composition).filter(([name]) => !name.toLowerCase().includes('greenery')).sort(([, countA], [, countB]) => countB - countA);
    if (sortedFlowers.length === 0) return "The composition is an elegant mix of flowers chosen by a master florist.";

    const primaryFlowers = sortedFlowers.slice(0, 2).map(([name]) => name);
    const secondaryFlowers = sortedFlowers.slice(2, 4).map(([name]) => name);
    
    let description = `The bouquet's primary flowers are beautiful ${primaryFlowers.join(' and ')}.`;
    if (secondaryFlowers.length > 0) description += ` These are complemented by delicate accents of ${secondaryFlowers.join(' and ')}.`;
    if (composition['Greenery (Eucalyptus, Ruscus)']) description += " The arrangement is interspersed with fresh greenery to add texture and volume.";

    return description;
}

function createPrompt(composition, style, occasion, packaging, tier) {
    const packagingString = getPackagingString(packaging);
    const backgroundString = getBackgroundString();
    const compositionDetails = createCompositionDescription(composition);
    
    let sizeDescriptor = '';
    switch (tier) {
        case 'Small': sizeDescriptor = 'a delicate and modest'; break;
        case 'Medium': sizeDescriptor = 'a beautiful and well-balanced'; break;
        case 'Lush': sizeDescriptor = 'a large, abundant and luxurious'; break;
        default: sizeDescriptor = 'a beautiful';
    }
    const basePrompt = `Award-winning professional product photography of ${sizeDescriptor} ${style.toLowerCase()} flower bouquet for a ${occasion.toLowerCase()}.`;
    const technicalDetails = `Shot on a Canon EOS R5 camera with a 85mm f/1.2L lens, resulting in an extremely sharp focus and a beautifully blurred background (bokeh). The lighting is soft and bright, with professional studio lights creating gentle highlights and soft, natural shadows, enhancing the 3D quality and texture of every petal.`;
    const colorAndRealismDetails = `The colors are rich, vibrant, and true-to-life, with professional color grading. The image is hyperrealistic, highly detailed, and exudes a feeling of luxury and elegance.`;
    const fullPrompt = [basePrompt, compositionDetails, `The bouquet is ${packagingString}, placed ${backgroundString}`, technicalDetails, colorAndRealismDetails].join(' ');
    return fullPrompt;
}

// --- ГЛАВНЫЙ ЭНДПОИНТ ---
app.post('/generate-bouquet', async (req, res) => {
    try {
        const { budget, style, occasion, packaging } = req.body;
        if (!budget || !style || !occasion || !packaging) return res.status(400).json({ message: "Missing required parameters." });
        
        const tier = getBudgetTier(budget);
        const composition = calculateComposition(budget, style, tier);
        const prompt = createPrompt(composition, style, occasion, packaging, tier);
        
        console.log(`--- TIER: ${tier} --- GENERATING PROMPT V5 (Descriptive) ---`);
        
        const response = await openai.images.generate({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", quality: "hd", style: "vivid" });
        res.json({ imageUrl: response.data[0].url });
    } catch (error) {
        console.error("--- ERROR ---", error.message);
        res.status(500).json({ message: "Failed to generate image. Please check server logs." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
