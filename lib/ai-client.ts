interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CallOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  seed?: number;
}

function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter((k): k is string => !!k);
}

async function callGroqWithKey(key: string, messages: Message[], opts: CallOptions): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model ?? 'openai/gpt-oss-120b',
    messages,
    temperature: opts.temperature ?? 0.1,
    max_tokens: Math.max(opts.max_tokens ?? 500, 1200),
    reasoning_effort: 'low',
  };
  if (opts.seed !== undefined) body.seed = opts.seed;

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Groq ${resp.status}: ${JSON.stringify(err)}`);
  }

  const data = await resp.json();
  return data.choices[0].message.content.trim();
}

async function callGemini(messages: Message[], opts: CallOptions): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');

  const systemMsg = messages.find(m => m.role === 'system')?.content ?? '';
  const userMsg   = messages.find(m => m.role === 'user')?.content ?? '';
  const combined  = systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: combined }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.1,
          maxOutputTokens: Math.max(opts.max_tokens ?? 500, 1500),
          thinkingConfig: { thinkingBudget: 200 },
        },
      }),
    }
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini ${resp.status}: ${JSON.stringify(err)}`);
  }

  const data = await resp.json();
  return data.candidates[0].content.parts[0].text.trim();
}

// 랜덤으로 Groq 키를 선택하여 요청, 실패 시 다음 키 시도, 모두 실패 시 Gemini로 fallback
export async function chat(messages: Message[], opts: CallOptions = {}): Promise<string> {
  const keys = getGroqKeys();
  const shuffled = [...keys].sort(() => Math.random() - 0.5);

  for (const key of shuffled) {
    try {
      return await callGroqWithKey(key, messages, opts);
    } catch (err) {
      console.warn('[ai-client] Groq key failed:', err instanceof Error ? err.message : err);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    console.log('[ai-client] Falling back to Gemini');
    return await callGemini(messages, opts);
  }

  throw new Error('모든 AI 제공자 요청이 실패했습니다.');
}
