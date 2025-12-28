import React, { useState } from 'react';

const AI_PROVIDERS = [
  { id: 'chatgpt', name: 'ChatGPT', color: '#10a37f', icon: '◯' },
  { id: 'claude', name: 'Claude', color: '#d97706', icon: '◈' },
  { id: 'gemini', name: 'Gemini', color: '#4285f4', icon: '◇' },
  { id: 'grok', name: 'Grok', color: '#1d9bf0', icon: '✕' },
  { id: 'perplexity', name: 'Perplexity', color: '#22c55e', icon: '◎' },
];

export default function AICompare() {
  const [prompt, setPrompt] = useState('');
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  const handleSubmit = async () => {
    if (!prompt.trim()) return;

    // Reset states
    setResponses({});
    setError({});
    setLoading(
      AI_PROVIDERS.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
    );

    // Fire all requests in parallel
    AI_PROVIDERS.forEach(async (provider) => {
      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, provider: provider.id }),
        });

        if (!res.ok) throw new Error(`${provider.name} failed`);

        const data = await res.json();
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Compare</h1>
          <p className="text-gray-400">One prompt. Five AI responses. Side by side.</p>
        </div>

        {/* Prompt Input */}
        <div className="mb-8">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your prompt here..."
              className="w-full h-32 p-4 pr-24 bg-gray-900 border border-gray-700 rounded-xl 
                         text-gray-100 placeholder-gray-500 resize-none
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || Object.values(loading).some(Boolean)}
              className="absolute bottom-4 right-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 
                         disabled:bg-gray-700 disabled:cursor-not-allowed
                         rounded-lg font-medium transition-colors"
            >
              {Object.values(loading).some(Boolean) ? 'Running...' : 'Compare'}
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">Press ⌘+Enter to submit</p>
        </div>

        {/* Response Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {AI_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col"
            >
              {/* Provider Header */}
              <div
                className="px-4 py-3 border-b border-gray-800 flex items-center gap-2"
                style={{ borderTopColor: provider.color, borderTopWidth: '3px' }}
              >
                <span style={{ color: provider.color }} className="text-lg">
                  {provider.icon}
                </span>
                <span className="font-medium">{provider.name}</span>
                {loading[provider.id] && (
                  <div className="ml-auto">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Response Body */}
              <div className="p-4 flex-1 min-h-[200px] max-h-[500px] overflow-y-auto">
                {loading[provider.id] && (
                  <div className="text-gray-500 animate-pulse">Thinking...</div>
                )}
                {error[provider.id] && (
                  <div className="text-red-400 text-sm">{error[provider.id]}</div>
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

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          Responses generated in parallel • API costs apply per provider
        </div>
      </div>
    </div>
  );
}
