const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY is missing. AI replies will fallback.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getGeminiModel = (options = {}) => {
  const {
    model = process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    temperature = 0.3,
    maxTokens = 256,
    topP,
    topK,
  } = options;

  const generationConfig = {
    temperature,
    maxOutputTokens: maxTokens,
  };

  if (typeof topP === 'number') {
    generationConfig.topP = topP;
  }

  if (typeof topK === 'number') {
    generationConfig.topK = topK;
  }

  return genAI.getGenerativeModel({
    model,
    generationConfig,
  });
};

exports.getSimilarityScore = async (textA, textB) => {
  console.log(
    `🤖 Gemini comparing: "${String(textA || '').slice(0, 30)}..." vs "${String(textB || '').slice(0, 30)}..."`
  );

  try {
    const model = exports.getGeminiModel({
      maxTokens: 50,
      temperature: 0.2,
    });

    const prompt = `Compare these two texts and return ONLY a number from 0 to 1. No words, no explanation.

Text 1:
${String(textA || '').slice(0, 500)}

Text 2:
${String(textB || '').slice(0, 500)}

Score:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text().trim();

    const score = parseFloat(raw);

    if (Number.isNaN(score) || score < 0 || score > 1) {
      console.warn(`⚠️ Invalid Gemini score: ${raw}, using fallback 0.4`);
      return 0.4;
    }

    return score;
  } catch (err) {
    console.error('❌ Gemini similarity error:', err.message);
    return 0.4;
  }
};