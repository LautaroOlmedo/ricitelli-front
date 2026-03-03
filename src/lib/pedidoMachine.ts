import type { PedidoContext, PedidoEvent, Notificacion } from "@/types/pedido";

function notif(mensaje: string, tipo: Notificacion["tipo"]): Notificacion {
  return { id: crypto.randomUUID(), mensaje, tipo };
}

export const initialContext: PedidoContext = {
  estado: "idle",
  data: {},
  errores: [],
  notificaciones: [],
  insumos_comprometidos: false,
  remitido: false,
  tipo: null,
  llmText: "",
  llmProcessing: false,
};

export function pedidoReducer(
  ctx: PedidoContext,
  event: PedidoEvent
): PedidoContext {
  switch (ctx.estado) {
    case "idle": {
      if (event.type === "SUBMIT_LLM") {
        return {
          ...ctx,
          estado: "validating",
          tipo: "llm",
          llmText: event.text,
          llmProcessing: true,
          errores: [],
        };
      }
      if (event.type === "SUBMIT_TRADITIONAL") {
        return {
          ...ctx,
          estado: "validating",
          tipo: "traditional",
          data: event.data,
          errores: [],
        };
      }
      break;
    }

    case "validating": {
      if (event.type === "LLM_PROCESSED") {
        return { ...ctx, data: event.data, llmProcessing: false };
      }
      if (event.type === "VALIDATION_OK") {
        return {
          ...ctx,
          estado: "pending",
          errores: [],
          notificaciones: [
            ...ctx.notificaciones,
            notif(
              `Pedido guardado con estado: Pending — ${new Date().toLocaleTimeString("es-AR")}`,
              "info"
            ),
          ],
        };
      }
      if (event.type === "VALIDATION_FAIL") {
        return {
          ...ctx,
          estado: "idle",
          errores: event.errors,
          llmProcessing: false,
        };
      }
      break;
    }

    // pending es transitorio: el side-effect dispara la verificación de vinos
    case "pending": {
      if (event.type === "VINOS_OK" || event.type === "VINOS_INSUFICIENTE") {
        // redirigir a checking_vinos que lo maneja
        return pedidoReducer({ ...ctx, estado: "checking_vinos" }, event);
      }
      break;
    }

    case "checking_vinos": {
      if (event.type === "VINOS_OK") {
        return {
          ...ctx,
          estado: "checking_insumos",
          notificaciones: [
            ...ctx.notificaciones,
            notif("Vinos sin vestir: stock suficiente.", "success"),
          ],
        };
      }
      if (event.type === "VINOS_INSUFICIENTE") {
        return {
          ...ctx,
          estado: "encolado",
          notificaciones: [
            ...ctx.notificaciones,
            notif(
              "Stock de vinos sin vestir insuficiente. Notificación enviada al área de producción.",
              "warning"
            ),
            notif("Pedido encolado — esperando reposición de stock.", "info"),
          ],
        };
      }
      break;
    }

    case "checking_insumos": {
      if (event.type === "INSUMOS_OK") {
        return {
          ...ctx,
          estado: "finalizado",
          insumos_comprometidos: true,
          remitido: true,
          notificaciones: [
            ...ctx.notificaciones,
            notif("Insumos secos: stock suficiente.", "success"),
            notif("Insumos comprometidos generados.", "success"),
            notif("Remito generado correctamente.", "success"),
          ],
        };
      }
      if (event.type === "INSUMOS_INSUFICIENTE") {
        return {
          ...ctx,
          estado: "encolado",
          notificaciones: [
            ...ctx.notificaciones,
            notif(
              "Insumos secos insuficientes. Notificación enviada al área de compras.",
              "warning"
            ),
            notif("Pedido encolado — esperando reposición de insumos.", "info"),
          ],
        };
      }
      break;
    }

    case "encolado":
    case "finalizado": {
      if (event.type === "RESET") {
        return initialContext;
      }
      break;
    }
  }

  return ctx;
}
