import type { APIRoute } from "astro";
import { toolDefs } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";

const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "http://10.1.200.116:8001/v1";
const LLM_MODEL =
  process.env.LLM_MODEL ?? "Qwen/Qwen2.5-Coder-32B-Instruct-AWQ";

const SYSTEM_PROMPT = `Eres un asistente experto en gestión de producción de Ricitelli.
Tienes acceso a herramientas que operan sobre productos, pedidos de venta y órdenes de producción.

Reglas:
- Usa las herramientas cuando el usuario pida información o quiera realizar una acción.
- Si necesitas el ID de un producto o pedido que no tienes, primero lista para obtenerlo.
- Para crear un pedido completo (venta + producción), usa crear_orden_completa.
- Responde siempre en español, de forma concisa y clara.
- Cuando muestres listas, usa formato estructurado (bullets o tabla simple).
- Para valores monetarios usa dos decimales.`;

// ── Stream one LLM turn ──────────────────────────────────────────────────────
// Yields text tokens in real-time and returns the accumulated state when done.
async function* streamTurn(
  messages: any[],
): AsyncGenerator<
  | { type: "token"; content: string }
  | { type: "done"; content: string; toolCalls: { id: string; name: string; arguments: string }[] }
> {
  const resp = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer not-required",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      tools: toolDefs,
      stream: true,
    }),
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`LLM error ${resp.status}: ${await resp.text()}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let fullContent = "";
  // think-block filter state
  let inThink = false;
  let thinkBuf = "";
  // tool call accumulation (keyed by index)
  const tc: Record<number, { id: string; name: string; arguments: string }> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;

      let chunk: any;
      try { chunk = JSON.parse(raw); } catch { continue; }

      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      // ── Text tokens ────────────────────────────────────────
      if (delta.content) {
        fullContent += delta.content;

        // Filter <think>…</think> blocks (DeepSeek-R1 emits these)
        let visible = "";
        for (const ch of delta.content) {
          if (inThink) {
            thinkBuf += ch;
            if (thinkBuf.endsWith("</think>")) { inThink = false; thinkBuf = ""; }
          } else {
            if (ch === "<" && !inThink) { thinkBuf = "<"; }
            else if (thinkBuf) {
              thinkBuf += ch;
              if ("<think>".startsWith(thinkBuf)) {
                if (thinkBuf === "<think>") { inThink = true; thinkBuf = ""; }
              } else {
                visible += thinkBuf;
                thinkBuf = "";
              }
            } else {
              visible += ch;
            }
          }
        }
        if (visible) yield { type: "token", content: visible };
      }

      // ── Tool call delta accumulation ───────────────────────
      if (delta.tool_calls) {
        for (const t of delta.tool_calls) {
          const i = t.index ?? 0;
          if (!tc[i]) tc[i] = { id: "", name: "", arguments: "" };
          if (t.id) tc[i].id = t.id;
          if (t.function?.name) tc[i].name += t.function.name;
          if (t.function?.arguments) tc[i].arguments += t.function.arguments;
        }
      }
    }
  }

  yield {
    type: "done",
    content: fullContent,
    toolCalls: Object.values(tc).filter((t) => t.name),
  };
}

// Regex fallback for models that embed JSON tool calls in content
function parseTextToolCalls(content: string) {
  const calls: { id: string; name: string; arguments: string }[] = [];
  const clean = content.replace(/<think>[\s\S]*?<\/think>/g, "");
  let i = 0;
  while (i < clean.length) {
    if (clean[i] !== "{") { i++; continue; }
    let depth = 0, start = i;
    for (let j = i; j < clean.length; j++) {
      if (clean[j] === "{") depth++;
      else if (clean[j] === "}") {
        depth--;
        if (depth === 0) {
          try {
            const obj = JSON.parse(clean.slice(start, j + 1));
            if (obj.name && obj.arguments !== undefined)
              calls.push({ id: `text_${calls.length}`, name: obj.name, arguments: typeof obj.arguments === "string" ? obj.arguments : JSON.stringify(obj.arguments) });
          } catch { /* skip */ }
          i = j; break;
        }
      }
    }
    i++;
  }
  return calls;
}

export const POST: APIRoute = async ({ request }) => {
  const { message, history = [] } = await request.json();
  const encoder = new TextEncoder();

  const emit = (controller: ReadableStreamDefaultController, data: object) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

  const body = new ReadableStream({
    async start(controller) {
      try {
        const messages: any[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
        ];

        // Agent loop
        while (true) {
          let turnContent = "";
          let toolCalls: { id: string; name: string; arguments: string }[] = [];

          for await (const event of streamTurn(messages)) {
            if (event.type === "token") {
              emit(controller, { type: "token", content: event.content });
            } else {
              turnContent = event.content;
              toolCalls = event.toolCalls;
            }
          }

          // ── Tool calls ────────────────────────────────────────
          if (toolCalls.length > 0) {
            messages.push({
              role: "assistant",
              content: turnContent || null,
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
              })),
            });

            for (const tc of toolCalls) {
              let args: any;
              try { args = JSON.parse(tc.arguments); } catch { args = {}; }

              emit(controller, { type: "tool_start", name: tc.name, args });

              let result: string;
              try {
                result = await executeTool(tc.name, args);
                emit(controller, { type: "tool_end", name: tc.name, result: JSON.parse(result) });
              } catch (e: any) {
                result = JSON.stringify({ error: e.message });
                emit(controller, { type: "tool_end", name: tc.name, error: e.message });
              }
              messages.push({ role: "tool", tool_call_id: tc.id, content: result });
            }
            continue; // next LLM call
          }

          // ── Text-embedded tool calls fallback ─────────────────
          const textCalls = parseTextToolCalls(turnContent);
          if (textCalls.length > 0) {
            messages.push({ role: "assistant", content: turnContent });
            const parts: string[] = [];
            for (const tc of textCalls) {
              let args: any;
              try { args = JSON.parse(tc.arguments); } catch { args = {}; }
              emit(controller, { type: "tool_start", name: tc.name, args });
              let result: string;
              try {
                result = await executeTool(tc.name, args);
                emit(controller, { type: "tool_end", name: tc.name, result: JSON.parse(result) });
              } catch (e: any) {
                result = JSON.stringify({ error: e.message });
                emit(controller, { type: "tool_end", name: tc.name, error: e.message });
              }
              parts.push(`[Resultado de ${tc.name}]\n${result}`);
            }
            messages.push({ role: "user", content: parts.join("\n\n") });
            continue;
          }

          // ── Final response ────────────────────────────────────
          const finalContent = turnContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
          messages.push({ role: "assistant", content: finalContent });
          emit(controller, {
            type: "done",
            history: messages.filter((m) => m.role !== "system"),
          });
          break;
        }
      } catch (e: any) {
        emit(controller, { type: "error", message: e.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
