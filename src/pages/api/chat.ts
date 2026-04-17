import type { APIRoute } from "astro";
import { toolDefs } from "@/lib/agent/tools";
import { executeTool } from "@/lib/agent/executor";

const LLM_BASE_URL =
  process.env.LLM_BASE_URL ?? "http://10.1.200.116:8001/v1";
const LLM_MODEL =
  process.env.LLM_MODEL ?? "Qwen/Qwen2.5-Coder-32B-Instruct-AWQ";

const SYSTEM_PROMPT = `Sos un asistente experto en gestión comercial y producción de Bodegas Ricitelli.
Tenés acceso a herramientas para consultar y operar sobre clientes, productos, pedidos de venta e inventario.

## Reglas generales
- Usá las herramientas cuando el usuario pida información o quiera realizar una acción.
- Respondé siempre en español rioplatense, de forma concisa y clara.
- Cuando mostrés listas, usá formato de tabla o bullets estructurados.
- Para valores monetarios usá dos decimales.
- Nunca inventes IDs ni datos — siempre consultá primero con las herramientas.
- **NUNCA pidas datos al usuario en texto plano.** Cuando necesités información estructurada (para crear algo, completar campos, etc.), usá SIEMPRE la tool \`solicitar_datos\` para mostrar un formulario inline.
- En los campos del formulario, los \`placeholder\` deben ser **siempre ejemplos genéricos** (ej: "ETQ-001", "Mi insumo"). **Nunca uses datos reales del sistema** (nombres de productos, códigos HEYM, IDs, etc.) como placeholder — confunde al usuario.
- Cuando recibís un mensaje que empieza con \`[FORM_DATA:{...}]\`, los datos son los valores completados por el usuario. El JSON incluye \`__tool__\` con el nombre exacto de la herramienta a ejecutar. Llamá esa herramienta **inmediatamente** con los campos del JSON — sin modificar, sin inventar, sin mezclar con datos de registros previos.
- **CRÍTICO**: Los valores del \`[FORM_DATA]\` son los ÚNICOS valores válidos. Ignorá cualquier dato previo en la conversación. Si el form dice \`code: "ABC-123"\`, usá \`"ABC-123"\`, no otro código que hayas visto antes.
- **NUNCA** le digas al usuario que copie o pegue texto con \`[FORM_DATA]\` — ese formato es interno. Si necesitás datos, usá \`solicitar_datos\`.
- Si una herramienta falla, intentá una vez más con los mismos datos. Si falla dos veces, informá el error al usuario y pará.
- Los \`placeholder\` son solo ayuda visual — **nunca son valores reales**.

## Cómo cargar un pedido de venta
Cuando el usuario quiera crear un pedido, seguí este flujo:

1. **Identificar cliente**: si menciona el nombre usá \`buscar_cliente\`. Si no lo encontrás, usá \`listar_clientes\`.
2. **Identificar productos**: si menciona nombres usá \`listar_productos\` y encontrá el ID correcto.
3. **Confirmar antes de crear**: mostrá un resumen con cliente, productos, cantidades, precio y moneda. Preguntá "¿Confirmo el pedido?" antes de ejecutar.
4. **Crear**: usá \`hacer_pedido_cliente\` con customer_id, items (product_id, quantity, unit_price), currency y destination_country si es exportación.
5. **Confirmar resultado**: mostrá el ID del pedido y el link \`/sale-orders/{id}\`.

## Campos del pedido
- currency: ARS (default) | USD | EUR | CAD
- sale_type: SALE (default) | SAMPLE_CUSTOMS | GIFT | INTERNAL | COMMERCIAL_SAMPLE
- destination_country: código ISO-3166 alpha-2 (GB, JP, US, BR…) — solo para exportación
- El mercado DOMESTIC/EXPORT se infiere automáticamente del tipo de cliente

## Disparadores de carga de pedido
Si el usuario dice cosas como "quiero cargar un pedido para X", "X pide N botellas de Y", "registrá un pedido de Y para X" → iniciá el flujo de inmediato sin preguntar si querés hacerlo.

## Otras acciones que podés realizar
- **Crear producto**: \`crear_producto\` con name y bods (BOM de insumos). Si no tenés los IDs de insumos, listá primero con \`listar_insumos\`.
- **Crear insumo seco**: \`crear_insumo\` con code, name, category (LABEL|CONTRAETIQUETA|BOX|CORK|CAPSULE|BOTTLE|OTHER), unit (UNIT|BOX|KG) y reorder_point opcional.
- **Agregar stock**: \`agregar_stock_insumo\` con id, quantity y reference.
- **Convertir SV→PT**: \`convertir_sv_a_pt\` con product_id, quantity y lot_number.
- **Crear cliente**: \`crear_cliente\` con social_reason, market_type (INTERNAL|EXTERNAL) y group.

Para cualquier creación, confirmá los datos con el usuario antes de ejecutar.`;

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

// Regex fallback for models that embed tool calls in content as text
function parseTextToolCalls(content: string) {
  const calls: { id: string; name: string; arguments: string }[] = [];
  const clean = content.replace(/<think>[\s\S]*?<\/think>/g, "");

  // Pattern 0: tool_name { ... }  — bare known tool name followed by JSON object (Qwen variant)
  // Must match against known tool names only to avoid false positives (e.g. ```json blocks)
  const knownTools = new Set([
    "listar_productos","obtener_producto","crear_producto",
    "listar_pedidos_venta","obtener_pedido_venta",
    "listar_ordenes_produccion","obtener_orden_produccion",
    "crear_orden_completa","solicitar_datos",
    "crear_insumo","listar_insumos","obtener_tricapa_insumo","agregar_stock_insumo",
    "reporte_inventario","alertas_stock_bajo","obtener_tricapa_producto","convertir_sv_a_pt",
    "listar_clientes","obtener_cliente","crear_cliente","buscar_cliente","desactivar_cliente",
    "pedidos_por_cliente","hacer_pedido_cliente","resumen_sistema",
    "generar_informe_ventas","generar_informe_produccion","generar_informe_general",
    "generar_informe_stock_bajo","generar_informe_trazabilidad_lote","generar_informe_cliente",
  ]);
  const bareNameRe = /\b([a-z][a-z_]*)\s*\{/g;
  let bn: RegExpExecArray | null;
  while ((bn = bareNameRe.exec(clean)) !== null) {
    const name = bn[1];
    if (!knownTools.has(name)) continue;
    // Find the balanced JSON object starting at the `{`
    let depth = 0, start = bn.index + bn[0].length - 1, pos = start;
    while (pos < clean.length) {
      if (clean[pos] === "{") depth++;
      else if (clean[pos] === "}") { depth--; if (depth === 0) { pos++; break; } }
      else if (clean[pos] === '"') {
        pos++;
        while (pos < clean.length && !(clean[pos] === '"' && clean[pos - 1] !== "\\")) pos++;
      }
      pos++;
    }
    try {
      const args = JSON.parse(clean.slice(start, pos));
      calls.push({ id: `bare_${calls.length}`, name, arguments: JSON.stringify(args) });
    } catch { /* skip */ }
  }
  if (calls.length > 0) return calls;

  // Pattern 1a: <tool_name>{...}</tool_name>
  const xmlJsonRe = /<([a-z_]+)>\s*(\{[\s\S]*?\})\s*<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = xmlJsonRe.exec(clean)) !== null) {
    const name = m[1];
    try {
      const args = JSON.parse(m[2]);
      calls.push({ id: `xml_${calls.length}`, name, arguments: JSON.stringify(args) });
    } catch { /* skip */ }
  }
  if (calls.length > 0) return calls;

  // Pattern 1b: <tool_name attr="val" fields=[...] /> — Qwen XML attribute style
  const xmlTagRe = /<([a-z_]+)\s([^>]*?)(?:\/>|>[\s\S]*?<\/\1>)/g;
  while ((m = xmlTagRe.exec(clean)) !== null) {
    const name = m[1];
    if (["think","p","div","span","br","b","i","ul","ol","li","code","pre","a","h1","h2","h3","table","tr","td","th"].includes(name)) continue;
    const attrStr = m[2];
    const obj: Record<string, any> = {};

    // Walk the attribute string extracting key=VALUE where VALUE is "string", [...] (balanced), or word
    let pos = 0;
    while (pos < attrStr.length) {
      // Skip whitespace
      while (pos < attrStr.length && /\s/.test(attrStr[pos])) pos++;
      // Match key=
      const keyMatch = /^([a-zA-Z_]\w*)\s*=\s*/.exec(attrStr.slice(pos));
      if (!keyMatch) { pos++; continue; }
      const key = keyMatch[1];
      pos += keyMatch[0].length;
      if (pos >= attrStr.length) break;

      const ch = attrStr[pos];
      if (ch === '"') {
        // Quoted string
        const end = attrStr.indexOf('"', pos + 1);
        if (end === -1) break;
        obj[key] = attrStr.slice(pos + 1, end);
        pos = end + 1;
      } else if (ch === '[' || ch === '{') {
        // Balanced bracket extraction
        const open = ch, close = ch === '[' ? ']' : '}';
        let depth = 0, start = pos;
        while (pos < attrStr.length) {
          if (attrStr[pos] === open) depth++;
          else if (attrStr[pos] === close) { depth--; if (depth === 0) { pos++; break; } }
          else if (attrStr[pos] === '"') {
            pos++;
            while (pos < attrStr.length && !(attrStr[pos] === '"' && attrStr[pos-1] !== '\\')) pos++;
          }
          pos++;
        }
        try { obj[key] = JSON.parse(attrStr.slice(start, pos)); } catch { obj[key] = attrStr.slice(start, pos); }
      } else {
        // Bare word
        const end = attrStr.slice(pos).search(/[\s>]/);
        const word = end === -1 ? attrStr.slice(pos) : attrStr.slice(pos, pos + end);
        obj[key] = word;
        pos += word.length;
      }
    }

    if (Object.keys(obj).length > 0) {
      calls.push({ id: `attr_${calls.length}`, name, arguments: JSON.stringify(obj) });
    }
  }
  if (calls.length > 0) return calls;

  // Pattern 2: {"name":"tool","arguments":{...}}
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
