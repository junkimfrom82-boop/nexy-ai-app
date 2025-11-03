import { GoogleGenAI, Type } from "@google/genai";
import { PriorityLevel, ImageQuality } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const systemInstruction = `
You are an AI Sourcing Data Analyst for a company called Nexy.ai. Your ONLY job is to find the data requested and return it as a SINGLE, VALID JSON object wrapped in a \`\`\`json ... \`\`\` markdown block.
Do NOT write any prose or explanations.

You MUST use 'google_search' to find the following, being as specific as possible:

1.  **Product Info:** A detailed 'productName', a one-sentence 'productDescription', and key sourcing data: 'minimumOrderQuantity' (number), 'leadTime' (e.g., "30-45 days"), and 'sampleAvailability' (boolean). Include 'specs' like dimensions, weight, 'coreMaterial', and key 'features'.
2.  **Demand Analysis:** US market demand, competition level, GenAI insight, and quantifiable 'marketSize' (e.g., "$31.6B in 2023"). Include competitor benchmarks and a sales forecast.
3.  **Factory Bids:** AT LEAST 3 factory (EXW) bids. If the user provides a preferred export country, ALL bids MUST be from that country. Include name, price, specialty, risk, a detailed 'riskSummary', sustainability notes (e.g., ISO certifications), any product 'certifications' (e.g., GOTS), and a 'trustIndicators' checklist.
4.  **Packaging:**
    -   Provide TWO distinct 'packagingOptions' (e.g., one standard, one premium) with 'name', 'description', and estimated 'pricePerUnit'.
    -   Provide 'packagingDetails' including 'unitsPerCarton', 'cartonDimensions', and 'cartonWeight'.
5.  **Nexy.ai Advantage:** 3 key service advantages for Nexy.ai.
6.  **Logistics Assumptions:** The assumed 'exportCountry' MUST match the user's preferred export country if provided. Also include 'incoterm', ports, and 'shippingMode'.
7.  **DDP Price & Breakdown:**
    -   'ddpPriceTiers' for 500, 1,000, and 5,000 units.
    -   A granular 'ddpCostBreakdown' based on the 1000-unit tier. Use the mid-tier factory price. Calculate specific duties: 'mfnDuty', 'section301Duty' (if from China, otherwise 0; this MUST be 0 if the export country is not China), 'mpf' (Merchandise Processing Fee), 'hmf' (Harbor Maintenance Fee), and estimate 'brokerageAndIsf'. Find the correct US HTS code.
8.  **Compliance Checks:** A list of applicable checks. For each, provide its 'name', 'details', and if it's 'applicable'. Include checks for CPSIA (if potentially for children), Phthalates/Prop 65 (if plastic/PVC from China).
9.  **Sources:** Direct URLs for all data points.

[CRITICAL] If a piece of data is not found, return 'null' or an empty array '[]'. Your entire response MUST be only the JSON structure.

Return data in this exact format:

\`\`\`json
{
  "productName": "Fabric-Wrapped Plastic Comb Headband",
  "productDescription": "A classic comb-style headband with a plastic core for structure, wrapped in fabric for comfort and style, featuring anti-slip teeth.",
  "minimumOrderQuantity": 500,
  "leadTime": "25-35 days",
  "sampleAvailability": true,
  "specs": {
    "dimensions": "14cm x 12cm x 2.5cm",
    "weight": "25g",
    "coreMaterial": "ABS Plastic",
    "features": ["Anti-slip interior teeth", "Satin fabric wrap"]
  },
  "demandAnalysis": {
    "usMarketDemand": "High",
    "competitionLevel": "Very High",
    "genAiInsight": "Eco-friendly materials and unique patterns are key differentiators in a crowded market. There is a growing trend for headbands made from recycled or sustainable fabrics, driven by consumer demand for environmentally conscious products. This presents an opportunity for brands to stand out by offering certified materials.",
    "marketSize": "The global hair accessories market was valued at $31.6 billion in 2023, with North America being a significant segment.",
    "competitorBenchmarks": ["Brand A: $8.99", "Brand B (Etsy): $12.50"],
    "salesForecast": "Steady sales with Q3/Q4 growth potential driven by seasonal trends."
  },
  "factoryBids": [
    { 
      "name": "Factory A (Guangdong, China)", 
      "price": 0.32,
      "specialty": "Fashion Accessories",
      "risk": "Low",
      "riskSummary": "Stable bid with positive reviews. 5+ years in business.",
      "sustainability": "Offers recycled fabric options. ISO 9001 certified.",
      "certifications": ["OEKO-TEX"],
      "trustIndicators": [
        { "name": "In-house mold making", "available": true },
        { "name": "Stitching quality control", "available": true }
      ],
      "sourceUrl": "https://alibaba.com/link-to-factory-a"
    }
  ],
  "packagingOptions": [
    { "name": "Standard Polybag", "description": "Basic, clear plastic bag for protection.", "pricePerUnit": 0.03 },
    { "name": "Custom Backer Card", "description": "Recycled cardstock with custom branding.", "pricePerUnit": 0.12 }
  ],
  "packagingDetails": {
    "unitsPerCarton": 250,
    "cartonDimensions": "50cm x 40cm x 35cm",
    "cartonWeight": "7.5 kg"
  },
  "nexyAdvantage": [
    { "title": "2-Week Express Sample", "description": "Get a physical sample in your hands fast to validate quality before committing to a full order." },
    { "title": "Dedicated Sourcing Agent", "description": "A single point of contact to expertly manage factory communication, QC, and logistics for you." }
  ],
  "ddpPriceTiers": [
    { "quantity": 500, "pricePerUnit": 1.25 },
    { "quantity": 1000, "pricePerUnit": 0.98 },
    { "quantity": 5000, "pricePerUnit": 0.82 }
  ],
  "logisticsAssumptions": {
    "exportCountry": "China",
    "incoterm": "EXW",
    "portOfLoading": "Shenzhen (Yantian)",
    "portOfDischarge": "Los Angeles (LAX)",
    "shippingMode": "Ocean LCL",
    "cartonEstimate": "Est. 0.5 CBM for 1,000 units"
  },
  "ddpCostBreakdown": {
    "htsCode": "9615.11.4000",
    "factoryPrice": 0.32,
    "estimatedFreight": 0.40,
    "mfnDuty": 0.02,
    "section301Duty": 0.02,
    "mpf": 0.03,
    "hmf": 0.00,
    "brokerageAndIsf": 0.03,
    "nexyFee": 0.16
  },
  "complianceChecks": [
      { "name": "CPSIA Compliance", "details": "If marketed to children under 12, requires tracking labels and testing for lead/phthalates.", "applicable": true }
  ],
  "sources": {
    "tariff": ["https://hts.usitc.gov/"],
    "demand": ["https://www.grandviewresearch.com/industry-analysis/hair-accessories-market"]
  }
}
\`\`\`
`;

const imageQualitySystemInstruction = `You are an expert AI photo analyst. Your task is to evaluate the quality of a product image for e-commerce and sourcing purposes. Your response MUST be a single, valid JSON object matching the provided schema, with no additional text or explanations.`;

const imageQualityPrompt = `Analyze the provided product image. Focus on factors critical for a sourcing request:
- **Clarity & Focus**: Is the product sharp and in focus?
- **Lighting**: Is the lighting even, without harsh shadows or glare?
- **Background**: Is the background simple and non-distracting?
- **Completeness**: Does the image show the entire product clearly?

Based on your analysis, return a JSON object with:
1.  \`qualityScore\`: An integer score from 0 to 100.
2.  \`qualityRating\`: A rating string from the set: "Poor", "Fair", "Good", "Excellent".
3.  \`feedback\`: A single, concise, and actionable sentence suggesting the most impactful improvement. If the rating is "Excellent", the feedback should be "Image is clear and well-lit."`;

export const analyzeImageQuality = async (
    image: { base64: string; mimeType: string }
): Promise<Omit<ImageQuality, 'isLoading'>> => {
    
    const imagePart = {
        inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
        },
    };
    
    const textPart = { text: imageQualityPrompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            systemInstruction: imageQualitySystemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    qualityScore: { type: Type.INTEGER, description: "A score from 0 to 100." },
                    qualityRating: { type: Type.STRING, description: "One of: Poor, Fair, Good, Excellent." },
                    feedback: { type: Type.STRING, description: "Actionable feedback for improvement." }
                },
                required: ["qualityScore", "qualityRating", "feedback"],
            },
        },
    });

    const jsonString = response.text.trim();
    // Assuming the response is a valid JSON string as requested
    const parsed = JSON.parse(jsonString);

    return {
        score: parsed.qualityScore,
        rating: parsed.qualityRating,
        feedback: parsed.feedback,
    };
};


export const getPriceEstimate = async (
    productDescription: string, 
    images: { base64: string; mimeType: string }[],
    exportCountry: string, 
    priority: PriorityLevel
): Promise<string> => {
    
    const imageParts = images.map(image => ({
        inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
        },
    }));

    let userText = `User-provided details: "${productDescription || 'None. Analyze the image only.'}"`;
    if (exportCountry) {
        userText += `\n\n[IMPORTANT] The user has specified a preferred export country: "${exportCountry}". All factory bids, logistics, and duties must be specific to this country.`;
    }
    userText += `\n\n[PRIORITY] The user has set the priority for this analysis to: "${priority}". Adapt your analysis accordingly.`;


    const textPart = { text: userText };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [...imageParts, textPart] },
        config: {
            systemInstruction: systemInstruction,
            tools: [{googleSearch: {}}],
        },
    });

    return response.text;
};
