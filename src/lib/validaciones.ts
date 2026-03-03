import type { PedidoData } from "@/types/pedido";

export function validarPedido(data: Partial<PedidoData>): string[] {
  const errores: string[] = [];
  if (!data.razonSocial?.trim())
    errores.push("La Razón Social es obligatoria.");
  if (!data.varietal?.trim()) errores.push("El Varietal es obligatorio.");
  if (!data.nombreVino?.trim())
    errores.push("El Nombre del Vino es obligatorio.");
  if (!data.cantidad || data.cantidad <= 0)
    errores.push("La cantidad debe ser mayor a 0.");
  return errores;
}

/**
 * Simula el procesamiento LLM: extrae campos desde texto libre con regex.
 * En producción esto sería una llamada a la API del modelo.
 */
export async function procesarConLLM(
  texto: string
): Promise<Partial<PedidoData>> {
  // Simular latencia de red/modelo (1.5 – 2.5 s)
  await delay(1500 + Math.random() * 1000);

  const data: Partial<PedidoData> = {};

  const rs = texto.match(
    /(?:razón social|empresa|para|cliente|facturar\s+a)[:\s]+([^\n,.(]+)/i
  );
  if (rs) data.razonSocial = rs[1].trim();

  const varietal = texto.match(
    /(?:varietal|cepa|uva|tipo\s+de\s+uva)[:\s]+([^\n,.(]+)/i
  );
  if (varietal) data.varietal = varietal[1].trim();

  const vino = texto.match(
    /(?:vino|etiqueta|producto|línea)[:\s]+([^\n,.(]+)/i
  );
  if (vino) data.nombreVino = vino[1].trim();

  const cant = texto.match(/(\d+)\s*(?:cajas|unidades|botellas|cajones|u\.)?/i);
  if (cant) data.cantidad = parseInt(cant[1], 10);

  const obs = texto.match(/(?:observaciones?|notas?)[:\s]+([^\n]+)/i);
  if (obs) data.observaciones = obs[1].trim();

  return data;
}

/** Simula la verificación de "Vinos sin vestir" en el inventario. */
export function verificarVinosSinVestir(): Promise<boolean> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(Math.random() > 0.35), 1200)
  );
}

/** Simula la verificación de "Insumos secos" en el inventario. */
export function verificarInsumos(): Promise<boolean> {
  return new Promise((resolve) =>
    setTimeout(() => resolve(Math.random() > 0.35), 1200)
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
