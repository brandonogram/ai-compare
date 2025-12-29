// api/query.js - Backend API handler for multi-AI queries
// Updated December 2025 with latest models

const PROVIDERS = {
  chatgpt: {
    url: 'https://api.openai.com/v1/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'gpt-5.2',  // Latest: GPT-5.2 (Dec 2025)
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
    extractResponse: (data) => data.choices[0].message.content,
    keyEnvVar: 'OPENAI_API_KEY',
    modelName: 'GPT-5.2',
  },

  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    getHeaders: () => ({
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'claude-opus-4-5-20251101',  // Latest: Claude Opus 4.5 (Nov 2025)
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractResponse: (data) => data.content[0].text,
    keyEnvVar: 'ANTHROPIC_API_KEY',
    modelName: 'Claude Opus 4.5',
  },

  gemini: {
    // Latest: Gemini 3 Pro (Nov 2025)
    url: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro:generateContent?key=${apiKey}`,
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
    modelName: 'Gemini 3 Pro',
  },

  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'grok-4',  // Latest: Grok 4 (use grok-4-1-fast-reasoning for faster)
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
      model: 'sonar-pro',  // Latest: Sonar Pro with web search
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

  // Check if API key exists
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
      
      // Parse common error messages
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

      // Add helpful hints based on status codes
      if (response.status === 401) {
        errorMessage = `Invalid API key for ${config.modelName}. Check your ${config.keyEnvVar} in Vercel.`;
      } else if (response.status === 403) {
        errorMessage = `Access denied for ${config.modelName}. Make sure billing is enabled.`;
      } else if (response.status === 429) {
        errorMessage = `Rate limited by ${config.modelName}. Wait a moment or check your usage limits.`;
      } else if (response.status === 402) {
        errorMessage = `Payment required for ${config.modelName}. Add a payment method to your account.`;
      } else if (response.status === 404) {
        errorMessage = `Model not found. ${config.modelName} may require special access or the model ID changed.`;
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
