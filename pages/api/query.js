// api/query.js - Backend API handler for multi-AI queries
// v2.2 - Fixed ChatGPT and Gemini only

const PROVIDERS = {
  chatgpt: {
    url: 'https://api.openai.com/v1/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      // GPT-5.2 requires usage tier 5 ($1000+ lifetime spend)
      // Using GPT-4o (best available without tier restrictions)
      // User can upgrade to gpt-5.2 once they hit tier 5
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
    extractResponse: (data) => data.choices[0].message.content,
    keyEnvVar: 'OPENAI_API_KEY',
    modelName: 'GPT-4o',
  },

  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    getHeaders: () => ({
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'claude-opus-4-5-20251101',  // KEEPING - was working
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractResponse: (data) => data.content[0].text,
    keyEnvVar: 'ANTHROPIC_API_KEY',
    modelName: 'Claude Opus 4.5',
  },

  gemini: {
    // Gemini 3 Pro is not available via public API yet (preview only)
    // Using Gemini 2.5 Pro - the best publicly available model
    url: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    getHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      contents: [{ parts: [{ text: prompt }] }],
    }),
    extractResponse: (data) => {
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error('Unexpected Gemini response format');
    },
    useDynamicUrl: true,
    keyEnvVar: 'GOOGLE_API_KEY',
    modelName: 'Gemini 2.5 Pro',
  },

  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'grok-4',  // KEEPING - was working
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
    extractResponse: (data) => data.choices[0].message.content,
    keyEnvVar: 'XAI_API_KEY',
    modelName: 'Grok 4',
  },

  perplexity: {
    url: 'https://api.perplexity.ai/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'sonar-pro',  // KEEPING - was working
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
    extractResponse: (data) => data.choices[0].message.content,
    keyEnvVar: 'PERPLEXITY_API_KEY',
    modelName: 'Sonar Pro',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, provider } = req.body;

  if (!prompt || !provider) {
    return res.status(400).json({ error: 'Missing prompt or provider' });
  }

  const config = PROVIDERS[provider];
  if (!config) {
    return res.status(400).json({ error: 'Unknown provider' });
  }

  const apiKey = config.useDynamicUrl 
    ? process.env.GOOGLE_API_KEY 
    : process.env[config.keyEnvVar];
  
  if (!apiKey) {
    return res.status(500).json({ 
      error: `Missing API key: ${config.keyEnvVar}. Add it in Vercel Environment Variables.` 
    });
  }

  try {
    const url = config.useDynamicUrl 
      ? config.url(process.env.GOOGLE_API_KEY) 
      : config.url;

    const response = await fetch(url, {
      method: 'POST',
      headers: config.getHeaders(),
      body: JSON.stringify(config.getBody(prompt)),
    });

    if (!response.ok) {
      const errorData = await response.text();
      let errorMessage = `${config.modelName} error (${response.status})`;
      
      try {
        const parsed = JSON.parse(errorData);
        if (parsed.error?.message) {
          errorMessage = parsed.error.message;
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch (e) {
        if (errorData.length < 200) {
          errorMessage = errorData;
        }
      }

      if (response.status === 401) {
        errorMessage = `Invalid API key for ${config.modelName}. Check your ${config.keyEnvVar} in Vercel.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied for ${config.modelName}. Make sure billing is enabled.`;
      } else if (response.status === 429) {
        errorMessage = `Rate limited by ${config.modelName}. Wait a moment.`;
      } else if (response.status === 402) {
        errorMessage = `Payment required for ${config.modelName}. Add credits.`;
      } else if (response.status === 404) {
        errorMessage = `Model not found: ${config.modelName}`;
      }

      console.error(`${provider} error:`, errorData);
      return res.status(response.status).json({ error: errorMessage });
    }

    const data = await response.json();
    const text = config.extractResponse(data);

    return res.status(200).json({ response: text, model: config.modelName });
  } catch (error) {
    console.error(`Error with ${provider}:`, error);
    return res.status(500).json({ error: `${config.modelName}: ${error.message}` });
  }
}
