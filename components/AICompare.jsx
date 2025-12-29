import React, { useState, useEffect } from 'react';

const AI_PROVIDERS = [
  { id: 'chatgpt', name: 'ChatGPT', model: 'GPT-4o', color: '#10a37f', icon: '◯' },
  { id: 'claude', name: 'Claude', model: 'Opus 4.5', color: '#d97706', icon: '◈' },
  { id: 'gemini', name: 'Gemini', model: '2.5 Pro', color: '#4285f4', icon: '◇' },
  { id: 'grok', name: 'Grok', model: '4', color: '#1d9bf0', icon: '✕' },
  { id: 'perplexity', name: 'Perplexity', model: 'Sonar Pro', color: '#22c55e', icon: '◎' },
];

export default function AICompare() {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const successfulResponses = AI_PROVIDERS.filter((p) => responses[p.id]);

  useEffect(() => {
    const anyLoading = Object.values(loading).some(Boolean);
    if (!anyLoading && successfulResponses.length >= 2 && !summary && !summaryLoading) {
      generateSummary();
    }
  }, [loading, responses]);

  const generateSummary = async () => {
    setSummaryLoading(true);
    
    const responseText = successfulResponses
      .map((p) => `### ${p.name} (${p.model}):\n${responses[p.id]}`)
      .join('\n\n---\n\n');

    const summaryPrompt = `You are summarizing AI responses for comparison. The user asked: "${prompt}"

Here are the responses from different AI models:

${responseText}

Provide a brief synthesis (3-5 sentences) highlighting:
1. Key points where the AIs agree
2. Notable differences in their recommendations
3. Any unique insights from specific models

Be concise and actionable. Don't list each AI separately - synthesize the information.`;

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: summaryPrompt, provider: 'claude' }),
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data.response);
      }
    } catch (err) {
      console.error('Summary generation failed:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    setResponses({});
    setError({});
    setSummary('');
    setLoading(
      AI_PROVIDERS.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
    );

    AI_PROVIDERS.forEach(async (provider) => {
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider: provider.id }),
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || `${provider.name} failed`);
        }

        setResponses((prev) => ({ ...prev, [provider.id]: data.response }));
      } catch (err) {
        setError((prev) => ({ ...prev, [provider.id]: err.message }));
      } finally {
        setLoading((prev) => ({ ...prev, [provider.id]: false }));
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const copyResponse = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">AI Compare</h1>
          <p className="text-gray-400">One prompt. Five AI responses. Side by side.</p>
          <p className="text-gray-500 text-xs mt-1">
            GPT-4o • Claude Opus 4.5 • Gemini 2.5 Pro • Grok 4 • Sonar Pro
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your prompt here..."
              className="w-full h-28 md:h-32 p-4 pr-24 bg-gray-900 border border-gray-700 rounded-xl 
                         text-gray-100 placeholder-gray-500 resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || Object.values(loading).some(Boolean)}
              className="absolute bottom-4 right-4 px-5 py-2 bg-blue-600 hover:bg-blue-500 
                         disabled:bg-gray-700 disabled:cursor-not-allowed
                         rounded-lg font-medium transition-colors text-sm md:text-base"
            >
              {Object.values(loading).some(Boolean) ? 'Running...' : 'Compare'}
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">Press ⌘+Enter to submit</p>
        </div>

        {(summary || summaryLoading) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✨</span>
              <h2 className="font-semibold text-blue-300">AI Consensus Summary</h2>
              {summaryLoading && (
                <div className="ml-2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {summary ? (
              <p className="text-gray-300 leading-relaxed">{summary}</p>
            ) : (
              <p className="text-gray-400 animate-pulse">Synthesizing responses...</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {AI_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col"
            >
              <div
                className="px-4 py-3 border-b border-gray-800 flex items-center gap-2"
                style={{ borderTopColor: provider.color, borderTopWidth: '3px' }}
              >
                <span style={{ color: provider.color }} className="text-lg">
                  {provider.icon}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{provider.name}</span>
                  <span className="text-xs text-gray-500">{provider.model}</span>
                </div>
                {loading[provider.id] && (
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                  </div>
                )}
                {responses[provider.id] && (
                  <button
                    onClick={() => copyResponse(responses[provider.id])}
                    className="ml-auto text-gray-500 hover:text-gray-300 text-xs"
                    title="Copy response"
                  >
                    📋
                  </button>
                )}
              </div>

              <div className="p-4 flex-1 min-h-[200px] max-h-[500px] overflow-y-auto">
                {loading[provider.id] && (
                  <div className="text-gray-500 animate-pulse">Thinking...</div>
                )}
                {error[provider.id] && (
                  <div className="text-red-400 text-sm">
                    <span className="font-medium block mb-1">Error:</span>
                    {error[provider.id]}
                  </div>
                )}
                {responses[provider.id] && (
                  <div className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {responses[provider.id]}
                  </div>
                )}
                {!loading[provider.id] && !error[provider.id] && !responses[provider.id] && (
                  <div className="text-gray-600 text-sm">Waiting for prompt...</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-6 text-gray-500 text-sm">
          Responses generated in parallel • API costs apply per provider
        </div>
      </div>
    </div>
  );
}
