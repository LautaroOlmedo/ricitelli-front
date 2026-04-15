import type { APIRoute } from "astro";

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? "http://10.1.200.116:8001/v1";
const LLM_MODEL    = process.env.LLM_MODEL    ?? "Qwen/Qwen2.5-Coder-32B-Instruct-AWQ";

// ── Deterministic simulated indicators ───────────────────────────────────────
// Uses a simple hash of the plot ID so values are stable across refreshes.
function hashId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i);
  return Math.abs(h);
}

function simIndicators(plotId: string, status: string) {
  const h = hashId(plotId);
  // Bias values by status
  const bias =
    status === "healthy"   ? 0.75 :
    status === "attention" ? 0.50 :
                             0.25;

  const noise = (h % 100) / 100;          // 0–1
  const blend = (bias * 0.7 + noise * 0.3);

  return {
    ndvi:        +(blend * 0.6 + 0.35).toFixed(2),        // 0.35–0.95
    moisture:    +((blend * 55 + 30)).toFixed(1),          // 30–85 %
    temperature: +((20 + (1 - blend) * 15)).toFixed(1),   // 20–35 °C
    maturity:    +((blend * 70 + 20)).toFixed(1),          // 20–90 %
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el Asistente de Viñedo de Bodega Riccitelli, especializado en análisis agronómico y recomendaciones de cosecha.

Tenés acceso a los datos en tiempo real de cada parcela: NDVI, porcentaje de humedad del suelo, temperatura promedio y porcentaje de maduración.

Reglas:
- Respondé siempre en español rioplatense, de forma cálida y concisa.
- Cuando recomendés parcelas, justificá brevemente cada una con los datos.
- SIEMPRE terminá tu respuesta con un bloque JSON en esta línea exacta, sin markdown ni explicaciones adicionales después:
  {"highlight_plots":["id1","id2"]}
- Si no hay parcelas para recomendar, ponés: {"highlight_plots":[]}
- Usá los IDs exactos que aparecen en los datos.
- Para maduración óptima: 80–95%. NDVI saludable: > 0.60. Humedad ideal: 40–70%. Temperatura óptima: 18–28°C.`;

// ── Request body type ─────────────────────────────────────────────────────────
interface ChatBody {
  message: string;
  plots: { id: string; name: string; variety: string; ha: number; age: number; status: string }[];
  history?: { role: string; content: string }[];
}

export const POST: APIRoute = async ({ request }) => {
  let body: ChatBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { message, plots, history = [] } = body;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message is required" }), { status: 400 });
  }

  // ── Build plot context ──────────────────────────────────────────────────────
  const plotContext = plots.map((p) => {
    const ind = simIndicators(p.id, p.status);
    return [
      `• ${p.name} (ID: ${p.id})`,
      `  Varietal: ${p.variety || "—"}  |  ${p.ha} ha  |  Cepa: ${p.age} años  |  Estado: ${p.status}`,
      `  NDVI: ${ind.ndvi}  |  Humedad: ${ind.moisture}%  |  Temp: ${ind.temperature}°C  |  Maduración: ${ind.maturity}%`,
    ].join("\n");
  }).join("\n\n");

  const contextMessage = plots.length > 0
    ? `Datos actuales de las parcelas:\n\n${plotContext}`
    : "No hay parcelas registradas todavía.";

  // ── Build messages array ────────────────────────────────────────────────────
  const messages = [
    { role: "system",    content: SYSTEM_PROMPT },
    { role: "assistant", content: contextMessage },
    ...history,
    { role: "user",      content: message },
  ];

  // ── Call LLM ───────────────────────────────────────────────────────────────
  let rawContent = "";
  try {
    const resp = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer not-required",
      },
      body: JSON.stringify({
        model:       LLM_MODEL,
        messages,
        stream:      false,
        temperature: 0.7,
        max_tokens:  600,
      }),
    });

    if (!resp.ok) throw new Error(`LLM ${resp.status}: ${await resp.text()}`);

    const data = await resp.json();
    rawContent = data.choices?.[0]?.message?.content ?? "";
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Error al conectar con el asistente: ${e.message}` }),
      { status: 502 }
    );
  }

  // ── Parse highlight_plots JSON block ───────────────────────────────────────
  let highlightPlots: string[] = [];
  let displayMessage = rawContent.trim();

  const jsonMatch = rawContent.match(/\{[^{}]*"highlight_plots"\s*:\s*\[[^\]]*\][^{}]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.highlight_plots)) {
        highlightPlots = parsed.highlight_plots;
      }
    } catch { /* ignore parse error */ }
    // Remove JSON block from visible message
    displayMessage = rawContent.replace(jsonMatch[0], "").trim();
  }

  // ── Update history ─────────────────────────────────────────────────────────
  const updatedHistory = [
    ...history,
    { role: "user",      content: message },
    { role: "assistant", content: displayMessage },
  ];

  return new Response(
    JSON.stringify({ message: displayMessage, highlight_plots: highlightPlots, history: updatedHistory }),
    { headers: { "Content-Type": "application/json" } }
  );
};
