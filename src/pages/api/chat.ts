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

// Regex fallback: some models embed tool calls as {"name":"...","arguments":{...}} in content
function parseTextToolCalls(content: string) {
  const calls: { name: string; arguments: string; id: string }[] = [];
  const runes = content;
  let i = 0;
  while (i < runes.length) {
    if (runes[i] !== "{") { i++; continue; }
    let depth = 0, start = i;
    let j = i;
    for (; j < runes.length; j++) {
      if (runes[j] === "{") depth++;
      else if (runes[j] === "}") {
        depth--;
        if (depth === 0) {
          try {
            const obj = JSON.parse(runes.slice(start, j + 1));
            if (obj.name && (obj.arguments !== undefined)) {
              calls.push({
                name: obj.name,
                arguments:
                  typeof obj.arguments === "string"
                    ? obj.arguments
                    : JSON.stringify(obj.arguments),
                id: `text_${calls.length}`,
              });
            }
          } catch { /* skip */ }
          i = j;
          break;
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
  const send = (controller: ReadableStreamDefaultController, data: object) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messages: any[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
        ];

        // Agent loop — keeps running until the LLM returns a text response
        while (true) {
          const resp = await fetch(`${LLM_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer not-required",
            },
            body: JSON.stringify({ model: LLM_MODEL, messages, tools: toolDefs }),
          });

          if (!resp.ok) {
            const errText = await resp.text();
            send(controller, { type: "error", message: `LLM error ${resp.status}: ${errText}` });
            break;
          }

          const data = await resp.json();
          const msg = data.choices?.[0]?.message;
          if (!msg) {
            send(controller, { type: "error", message: "Respuesta inesperada del LLM" });
            break;
          }

          // ── Structured tool calls (OpenAI standard) ─────────────────────
          if (msg.tool_calls?.length) {
            messages.push(msg);
            for (const tc of msg.tool_calls) {
              let args: any;
              try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

              send(controller, { type: "tool_start", name: tc.function.name, args });

              let result: string;
              try {
                result = await executeTool(tc.function.name, args);
                send(controller, {
                  type: "tool_end",
                  name: tc.function.name,
                  result: JSON.parse(result),
                });
              } catch (e: any) {
                result = JSON.stringify({ error: e.message });
                send(controller, { type: "tool_end", name: tc.function.name, error: e.message });
              }
              messages.push({ role: "tool", tool_call_id: tc.id, content: result });
            }
            continue;
          }

          const rawContent: string = msg.content ?? "";

          // ── Text-embedded tool calls (Qwen / DeepSeek fallback) ──────────
          const textCalls = parseTextToolCalls(
            rawContent.replace(/<think>[\s\S]*?<\/think>/g, ""),
          );
          if (textCalls.length) {
            messages.push(msg);
            const resultParts: string[] = [];
            for (const tc of textCalls) {
              let args: any;
              try { args = JSON.parse(tc.arguments); } catch { args = {}; }

              send(controller, { type: "tool_start", name: tc.name, args });

              let result: string;
              try {
                result = await executeTool(tc.name, args);
                send(controller, {
                  type: "tool_end",
                  name: tc.name,
                  result: JSON.parse(result),
                });
              } catch (e: any) {
                result = JSON.stringify({ error: e.message });
                send(controller, { type: "tool_end", name: tc.name, error: e.message });
              }
              resultParts.push(`[Resultado de ${tc.name}]\n${result}`);
            }
            messages.push({ role: "user", content: resultParts.join("\n\n") });
            continue;
          }

          // ── Final text response ──────────────────────────────────────────
          const content = rawContent
            .replace(/<think>[\s\S]*?<\/think>/g, "")
            .trim();

          messages.push({ role: "assistant", content });

          // Send updated history (without system message) back to client
          const clientHistory = messages.filter((m) => m.role !== "system");
          send(controller, { type: "response", content, history: clientHistory });
          break;
        }
      } catch (e: any) {
        send(controller, { type: "error", message: e.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};
