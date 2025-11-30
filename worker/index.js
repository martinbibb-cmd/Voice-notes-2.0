/**
 * Voice Notes 2.0 - Cloudflare Worker
 * Handles AI API requests for Anthropic, Together, and OpenAI
 * Provides secure API key management and database access
 */

// Environment variables (set in Cloudflare Worker dashboard):
// - ANTHROPIC_API_KEY
// - OPENAI_API_KEY
// - TOGETHER_API_KEY

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle CORS preflight requests
 */
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Create a JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Create an error response
 */
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message, success: false }, status);
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(env, messages, options = {}) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const model = options.model || 'claude-3-haiku-20240307';
  const maxTokens = options.maxTokens || 4096;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
      system: options.system || '',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Call OpenAI API
 */
async function callOpenAI(env, messages, options = {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const model = options.model || 'gpt-4o-mini';
  const maxTokens = options.maxTokens || 4096;

  const body = {
    model,
    messages,
    max_tokens: maxTokens,
  };

  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Call Together AI API
 */
async function callTogether(env, messages, options = {}) {
  const apiKey = env.TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error('Together API key not configured');
  }

  const model = options.model || 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo';
  const maxTokens = options.maxTokens || 4096;

  const body = {
    model,
    messages,
    max_tokens: maxTokens,
  };

  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Together API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Analyze text and extract structured sections for depot notes
 */
async function analyzeText(env, transcript, schema, provider = 'openai', alreadyCaptured = []) {
  const systemPrompt = buildAnalysisSystemPrompt(schema, alreadyCaptured);

  const messages = [
    { role: 'user', content: `Analyze this survey transcript and extract structured information:\n\n${transcript}` }
  ];

  let result;

  try {
    switch (provider.toLowerCase()) {
      case 'anthropic':
        result = await callAnthropic(env, messages, { system: systemPrompt });
        return parseAnthropicResponse(result);

      case 'together':
        messages.unshift({ role: 'system', content: systemPrompt });
        result = await callTogether(env, messages);
        return parseOpenAIResponse(result);

      case 'openai':
      default:
        messages.unshift({ role: 'system', content: systemPrompt });
        result = await callOpenAI(env, messages);
        return parseOpenAIResponse(result);
    }
  } catch (error) {
    console.error(`Error calling ${provider}:`, error);
    throw error;
  }
}

/**
 * Build system prompt for section analysis
 */
function buildAnalysisSystemPrompt(schema, alreadyCaptured = []) {
  const sections = schema?.expectedSections || schema?.sections || [
    'Needs',
    'Working at heights',
    'System characteristics',
    'Components that require assistance',
    'Restrictions to work',
    'External hazards',
    'Delivery notes',
    'Office notes',
    'New boiler and controls',
    'Flue',
    'Pipe work',
    'Disruption',
    'Customer actions',
    'Future plans'
  ];

  const capturedInfo = alreadyCaptured.length > 0
    ? `\n\nAlready captured information (avoid duplicating):\n${JSON.stringify(alreadyCaptured, null, 2)}`
    : '';

  return `You are an expert heating engineer assistant analyzing survey transcripts.
Extract relevant information into the following sections:
${sections.map((s, i) => `${i + 1}. ${s}`).join('\n')}
${capturedInfo}

Return a JSON object with:
{
  "sections": [
    {
      "section": "Section Name",
      "plainText": "Bullet-point notes extracted from transcript",
      "naturalLanguage": "Fluent paragraph summary of the section"
    }
  ],
  "summary": "Brief overall summary of the survey",
  "checklistHits": ["item1", "item2"],
  "materials": ["material1", "material2"]
}

Only include sections that have relevant content from the transcript.
Be concise and professional. Use British English spelling.`;
}

/**
 * Parse Anthropic API response
 */
function parseAnthropicResponse(response) {
  const content = response.content?.[0]?.text || '';
  return extractJSON(content);
}

/**
 * Parse OpenAI/Together API response
 */
function parseOpenAIResponse(response) {
  const content = response.choices?.[0]?.message?.content || '';
  return extractJSON(content);
}

/**
 * Extract JSON from response text
 */
function extractJSON(text) {
  // Try to find JSON in the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
    }
  }

  // Return default structure if parsing fails
  return {
    summary: text.slice(0, 500),
    sections: [],
    checklistHits: [],
    materials: []
  };
}

/**
 * Database operations using Cloudflare D1
 */
async function dbQuery(env, sql, params = []) {
  if (!env.DB) {
    throw new Error('Database not configured');
  }

  const stmt = env.DB.prepare(sql);
  if (params.length > 0) {
    return stmt.bind(...params).all();
  }
  return stmt.all();
}

/**
 * Save session to database
 */
async function saveSession(env, sessionData) {
  if (!env.DB) {
    // Fall back to KV storage if D1 not available
    if (env.SESSIONS) {
      const key = `session_${sessionData.id || Date.now()}`;
      await env.SESSIONS.put(key, JSON.stringify(sessionData), {
        expirationTtl: 60 * 60 * 24 * 30 // 30 days
      });
      return { success: true, key };
    }
    throw new Error('No storage configured');
  }

  const result = await env.DB.prepare(`
    INSERT OR REPLACE INTO sessions (id, data, created_at, updated_at)
    VALUES (?, ?, datetime('now'), datetime('now'))
  `).bind(
    sessionData.id || crypto.randomUUID(),
    JSON.stringify(sessionData)
  ).run();

  return { success: true, meta: result.meta };
}

/**
 * Load session from database
 */
async function loadSession(env, sessionId) {
  if (!env.DB) {
    // Fall back to KV storage
    if (env.SESSIONS) {
      const data = await env.SESSIONS.get(`session_${sessionId}`, 'json');
      return data;
    }
    throw new Error('No storage configured');
  }

  const result = await env.DB.prepare(
    'SELECT data FROM sessions WHERE id = ?'
  ).bind(sessionId).first();

  if (result?.data) {
    return JSON.parse(result.data);
  }
  return null;
}

/**
 * List sessions from database
 */
async function listSessions(env, limit = 50) {
  if (!env.DB) {
    // Fall back to KV storage
    if (env.SESSIONS) {
      const list = await env.SESSIONS.list({ prefix: 'session_', limit });
      const sessions = [];
      for (const key of list.keys) {
        const data = await env.SESSIONS.get(key.name, 'json');
        if (data) {
          sessions.push({
            id: key.name.replace('session_', ''),
            ...data
          });
        }
      }
      return sessions;
    }
    throw new Error('No storage configured');
  }

  const result = await env.DB.prepare(`
    SELECT id, data, created_at, updated_at
    FROM sessions
    ORDER BY updated_at DESC
    LIMIT ?
  `).bind(limit).all();

  return result.results.map(row => ({
    id: row.id,
    ...JSON.parse(row.data),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

/**
 * Delete session from database
 */
async function deleteSession(env, sessionId) {
  if (!env.DB) {
    if (env.SESSIONS) {
      await env.SESSIONS.delete(`session_${sessionId}`);
      return { success: true };
    }
    throw new Error('No storage configured');
  }

  await env.DB.prepare('DELETE FROM sessions WHERE id = ?')
    .bind(sessionId)
    .run();

  return { success: true };
}

/**
 * Main request handler
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      // Health check endpoint
      if (path === '/' || path === '/health') {
        return jsonResponse({
          status: 'ok',
          version: '2.0.0',
          providers: {
            anthropic: !!env.ANTHROPIC_API_KEY,
            openai: !!env.OPENAI_API_KEY,
            together: !!env.TOGETHER_API_KEY
          },
          database: !!env.DB || !!env.SESSIONS
        });
      }

      // Text analysis endpoint (main endpoint for voice notes processing)
      if (path === '/text' || path === '/analyze') {
        if (request.method !== 'POST') {
          return errorResponse('Method not allowed', 405);
        }

        const body = await request.json();
        const { transcript, expectedSections, alreadyCaptured, depotSections, provider } = body;

        if (!transcript) {
          return errorResponse('Transcript is required');
        }

        const schema = { expectedSections: expectedSections || depotSections };
        const result = await analyzeText(env, transcript, schema, provider || 'openai', alreadyCaptured || []);

        return jsonResponse(result);
      }

      // Direct API call endpoints
      if (path === '/api/anthropic') {
        if (request.method !== 'POST') {
          return errorResponse('Method not allowed', 405);
        }

        const body = await request.json();
        const { messages, options } = body;

        if (!messages || !Array.isArray(messages)) {
          return errorResponse('Messages array is required');
        }

        const result = await callAnthropic(env, messages, options || {});
        return jsonResponse(result);
      }

      if (path === '/api/openai') {
        if (request.method !== 'POST') {
          return errorResponse('Method not allowed', 405);
        }

        const body = await request.json();
        const { messages, options } = body;

        if (!messages || !Array.isArray(messages)) {
          return errorResponse('Messages array is required');
        }

        const result = await callOpenAI(env, messages, options || {});
        return jsonResponse(result);
      }

      if (path === '/api/together') {
        if (request.method !== 'POST') {
          return errorResponse('Method not allowed', 405);
        }

        const body = await request.json();
        const { messages, options } = body;

        if (!messages || !Array.isArray(messages)) {
          return errorResponse('Messages array is required');
        }

        const result = await callTogether(env, messages, options || {});
        return jsonResponse(result);
      }

      // Database endpoints
      if (path === '/sessions') {
        if (request.method === 'GET') {
          const limit = parseInt(url.searchParams.get('limit') || '50');
          const sessions = await listSessions(env, limit);
          return jsonResponse({ sessions });
        }

        if (request.method === 'POST') {
          const body = await request.json();
          const result = await saveSession(env, body);
          return jsonResponse(result);
        }
      }

      if (path.startsWith('/sessions/')) {
        const sessionId = path.replace('/sessions/', '');

        if (request.method === 'GET') {
          const session = await loadSession(env, sessionId);
          if (!session) {
            return errorResponse('Session not found', 404);
          }
          return jsonResponse(session);
        }

        if (request.method === 'PUT') {
          const body = await request.json();
          body.id = sessionId;
          const result = await saveSession(env, body);
          return jsonResponse(result);
        }

        if (request.method === 'DELETE') {
          const result = await deleteSession(env, sessionId);
          return jsonResponse(result);
        }
      }

      // Provider status endpoint
      if (path === '/providers') {
        return jsonResponse({
          anthropic: {
            configured: !!env.ANTHROPIC_API_KEY,
            models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
          },
          openai: {
            configured: !!env.OPENAI_API_KEY,
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
          },
          together: {
            configured: !!env.TOGETHER_API_KEY,
            models: ['meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1']
          }
        });
      }

      return errorResponse('Not found', 404);

    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse(error.message || 'Internal server error', 500);
    }
  }
};
