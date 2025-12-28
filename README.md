# AI Compare

One prompt. Five AI responses. Side by side.

Compare responses from ChatGPT, Claude, Gemini, Grok, and Perplexity simultaneously.

## Quick Start

```bash
# Install dependencies
npm install

# Copy env template and add your API keys
cp .env.example .env.local

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## API Keys Required

| Provider | Get Key | Model Used |
|----------|---------|------------|
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) | gpt-4o |
| Anthropic | [console.anthropic.com](https://console.anthropic.com/settings/keys) | claude-sonnet-4 |
| Google | [aistudio.google.com](https://aistudio.google.com/apikey) | gemini-2.0-flash |
| xAI | [console.x.ai](https://console.x.ai) | grok-3 |
| Perplexity | [perplexity.ai/settings](https://www.perplexity.ai/settings/api) | sonar-pro |

## Cost Estimates

Approximate cost per comparison (one prompt to all 5 AIs):

| Provider | Input (1K tokens) | Output (1K tokens) | Est. per query |
|----------|-------------------|--------------------| ---------------|
| GPT-4o | $0.0025 | $0.01 | ~$0.01 |
| Claude Sonnet | $0.003 | $0.015 | ~$0.015 |
| Gemini Flash | $0.00001 | $0.00004 | ~$0.0001 |
| Grok-3 | $0.003 | $0.015 | ~$0.015 |
| Perplexity Sonar | $0.001 | $0.001 | ~$0.002 |

**Total: ~$0.04-0.05 per comparison** (varies by response length)

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Project Structure

```
ai-compare/
├── components/
│   └── AICompare.jsx    # Main UI component
├── pages/
│   ├── _app.js          # App wrapper
│   ├── index.js         # Home page
│   └── api/
│       └── query.js     # API handler for all providers
├── styles/
│   └── globals.css      # Tailwind imports
└── .env.example         # Environment template
```

## Customization

### Add/Remove Providers

Edit the `PROVIDERS` object in `pages/api/query.js`:

```javascript
const PROVIDERS = {
  chatgpt: { ... },
  claude: { ... },
  // Add or remove providers here
};
```

And update the `AI_PROVIDERS` array in `components/AICompare.jsx`.

### Change Models

Update the `model` field in each provider's `getBody` function.

## Features to Add

- [ ] Streaming responses
- [ ] Response timing comparison
- [ ] Token count display
- [ ] Cost tracking per query
- [ ] Prompt history
- [ ] Share comparison results
- [ ] Rate limiting
- [ ] Authentication

## License

MIT
