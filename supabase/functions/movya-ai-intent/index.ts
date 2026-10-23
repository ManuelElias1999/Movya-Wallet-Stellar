import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

type HistoryMessage = { role: 'user' | 'assistant'; content: string };
type RequestBody = { message?: unknown; history?: unknown; locale?: unknown };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const recentRequests = new Map<string, number[]>();

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function readInput(body: RequestBody) {
  if (typeof body.message !== 'string') throw new Error('Invalid message');
  const message = body.message.trim();
  if (!message || message.length > 500) throw new Error('Invalid message');
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  if (rawHistory.length > 8) throw new Error('Invalid history');
  const history: HistoryMessage[] = rawHistory.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid history');
    const candidate = item as Record<string, unknown>;
    if ((candidate.role !== 'user' && candidate.role !== 'assistant') || typeof candidate.content !== 'string') throw new Error('Invalid history');
    const content = candidate.content.trim();
    if (!content || content.length > 500) throw new Error('Invalid history');
    return { role: candidate.role, content };
  });
  return { message, history, locale: body.locale === 'en' ? 'en' : 'es' };
}

function allowRequest(userId: string) {
  const now = Date.now();
  const windowStart = now - 5 * 60_000;
  const hits = (recentRequests.get(userId) ?? []).filter(timestamp => timestamp >= windowStart);
  if (hits.length >= 30) return false;
  hits.push(now);
  recentRequests.set(userId, hits);
  return true;
}

const intentSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['send', 'swap', 'balance', 'receive', 'contact', 'help', 'unknown'] },
    amount: { type: ['string', 'null'] },
    token: { type: ['string', 'null'], enum: ['XLM', 'USDC', null] },
    from: { type: ['string', 'null'], enum: ['XLM', 'USDC', null] },
    to: { type: ['string', 'null'], enum: ['XLM', 'USDC', null] },
    recipient: { type: ['string', 'null'] },
    reply: { type: ['string', 'null'] },
  },
  required: ['kind', 'amount', 'token', 'from', 'to', 'recipient', 'reply'],
} as const;

const systemPrompt = `You classify requests for Movya, a Stellar Testnet wallet. Return only the required structured object.
Allowed intents: send, swap, balance, receive, contact, help, unknown.
Allowed assets: XLM and USDC only.
For send, extract an explicitly stated positive numeric amount, asset and recipient. Never invent or autocomplete any field.
For swap, extract an explicitly stated positive numeric amount, source asset and destination asset. They must differ.
Use recent history only to complete a clearly unfinished request. If any transactional field is missing or ambiguous, use kind unknown and ask one short clarification in reply.
Never claim that a transaction happened. Never provide investment advice. Never request a seed phrase, private key, password, PIN or authentication code.
For balance, receive, contact and transaction intents, reply may be null because the app renders the authoritative answer.
For help or unknown, reply in the user's language and keep it under 60 words.`;

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const gatewayKey = Deno.env.get('AI_GATEWAY_API_KEY');
  const model = Deno.env.get('AI_GATEWAY_MODEL');
  if (!supabaseUrl || !publishableKey) return response(500, { error: 'Backend configuration unavailable' });

  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return response(401, { error: 'Authentication required' });
  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return response(401, { error: 'Authentication required' });
  if (!allowRequest(data.user.id)) return response(429, { error: 'Demasiadas consultas. Espera unos minutos.' });
  if (!gatewayKey || !model) return response(503, { error: 'Movya AI todavía no está configurada.' });

  let input: ReturnType<typeof readInput>;
  try {
    input = readInput(await request.json() as RequestBody);
  } catch {
    return response(400, { error: 'Invalid request' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const aiResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          { role: 'system', content: systemPrompt },
          ...input.history.map(item => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: item.content })),
          { role: 'user', content: input.message },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'movya_intent', strict: true, schema: intentSchema } },
      }),
    });
    if (!aiResponse.ok) {
      console.error('AI Gateway request failed', aiResponse.status);
      return response(aiResponse.status === 429 ? 429 : 503, { error: aiResponse.status === 429 ? 'Movya AI está ocupada. Inténtalo nuevamente.' : 'Movya AI no está disponible.' });
    }
    const result = await aiResponse.json() as { choices?: { message?: { content?: string } }[] };
    const content = result.choices?.[0]?.message?.content;
    if (!content) return response(503, { error: 'Movya AI no devolvió una respuesta.' });
    const intent = JSON.parse(content) as Record<string, unknown>;
    return response(200, { intent });
  } catch (error) {
    console.error('Movya AI request error', error instanceof Error ? error.name : 'unknown');
    return response(503, { error: 'Movya AI no está disponible.' });
  } finally {
    clearTimeout(timeout);
  }
});
