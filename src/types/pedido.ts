export interface PedidoData {
  razonSocial: string;
  varietal: string;
  nombreVino: string;
  cantidad: number;
  observaciones?: string;
}

export type PedidoEstado =
  | "idle"
  | "validating"
  | "pending"
  | "checking_vinos"
  | "checking_insumos"
  | "encolado"
  | "finalizado";

export interface Notificacion {
  id: string;
  mensaje: string;
  tipo: "warning" | "error" | "success" | "info";
}

export interface PedidoContext {
  estado: PedidoEstado;
  data: Partial<PedidoData>;
  errores: string[];
  notificaciones: Notificacion[];
  insumos_comprometidos: boolean;
  remitido: boolean;
  tipo: "llm" | "traditional" | null;
  llmText: string;
  llmProcessing: boolean;
}

export type PedidoEvent =
  | { type: "SUBMIT_LLM"; text: string }
  | { type: "SUBMIT_TRADITIONAL"; data: PedidoData }
  | { type: "LLM_PROCESSED"; data: Partial<PedidoData> }
  | { type: "VALIDATION_OK" }
  | { type: "VALIDATION_FAIL"; errors: string[] }
  | { type: "VINOS_OK" }
  | { type: "VINOS_INSUFICIENTE" }
  | { type: "INSUMOS_OK" }
  | { type: "INSUMOS_INSUFICIENTE" }
  | { type: "RESET" };
