// api/query.js - Backend API handler for multi-AI queries
// Works with Next.js API routes, Vercel serverless, or Express

// ============================================================
// SETUP: Add your API keys to environment variables
// ============================================================
// OPENAI_API_KEY=sk-...
// ANTHROPIC_API_KEY=sk-ant-...
// GOOGLE_API_KEY=...
// XAI_API_KEY=...
// PERPLEXITY_API_KEY=pplx-...

const PROVIDERS = {
  chatgpt: {
    url: 'https://api.openai.com/v1/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
    extractResponse: (data) => data.choices[0].message.content,
  },

  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    getHeaders: () => ({
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractResponse: (data) => data.content[0].text,
  },

  gemini: {
    url: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    getHeaders: () => ({
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      contents: [{ parts: [{ text: prompt }] }],
    }),
    extractResponse: (data) => data.candidates[0].content.parts[0].text,
    useDynamicUrl: true,
  },

  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'grok-3',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
    extractResponse: (data) => data.choices[0].message.content,
  },

  perplexity: {
    url: 'https://api.perplexity.ai/chat/completions',
    getHeaders: () => ({
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    }),
    getBody: (prompt) => ({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
    }),
    extractResponse: (data) => data.choices[0].message.content,
  },
};

// ============================================================
// API Handler (Next.js / Vercel format)
// ============================================================
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
      const errorText = await response.text();
      console.error(`${provider} error:`, errorText);
      throw new Error(`${provider} API returned ${response.status}`);
    }

    const data = await response.json();
    const text = config.extractResponse(data);

    return res.status(200).json({ response: text });
  } catch (error) {
    console.error(`Error with ${provider}:`, error);
    return res.status(500).json({ error: error.message });
  }
}

// ============================================================
// Express.js version (alternative)
// ============================================================
/*
const express = require('express');
const router = express.Router();

router.post('/query', async (req, res) => {
  // Same logic as handler above
});

module.exports = router;
*/

// ============================================================
// Query all providers at once (optional batch endpoint)
// ============================================================
export async function queryAll(prompt) {
  const results = await Promise.allSettled(
    Object.entries(PROVIDERS).map(async ([name, config]) => {
      const url = config.useDynamicUrl 
        ? config.url(process.env.GOOGLE_API_KEY) 
        : config.url;

      const response = await fetch(url, {
        method: 'POST',
        headers: config.getHeaders(),
        body: JSON.stringify(config.getBody(prompt)),
      });

      if (!response.ok) throw new Error(`${name} failed`);

      const data = await response.json();
      return { provider: name, response: config.extractResponse(data) };
    })
  );

  return results.map((result, i) => {
    const name = Object.keys(PROVIDERS)[i];
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return { provider: name, error: result.reason.message };
  });
}
