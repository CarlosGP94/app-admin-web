export interface BobinaCortada {
  id: number;
  bobinaId: number;
  planCorteId: number;
  numero: number | null;
  anchoInicial: number;
  anchoFinal: number;
  espesorInicial: number;
  espesorFinal: number;
  pesoReal: number;
  observacion?: string;
  creado: string; // Fecha de creación/corte
  operario?: string; // Nombre traído con JOIN o ID fallback
  coladaId?: number;
}
export interface PlanCorteCabecera {
  id: number;
  codigoPlan: string;
  fechaCreacion: string;
  estado: string;
  totalBobinas: number;
}
