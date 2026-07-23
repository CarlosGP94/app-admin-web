// @/components/flejes/FlejeFormSchema.ts
import { z } from "zod";

export const flejeSchema = z.object({
  // Información General
  calidad_id: z.number().min(1, "Debes seleccionar una calidad"),
  activo: z.boolean(),
  concepto: z.string().min(1, "El concepto es obligatorio"),
  art_concepto: z.string().optional(),

  // Dimensiones
  ancho: z.number().min(1, "El ancho debe ser mayor a 0"),
  espesor: z.number().min(0.1, "El espesor debe ser mayor a 0"),

  // Inventario y Pesos
  unidades: z.number().min(0, "Mínimo 0"),
  peso_medio: z.number().min(0, "Mínimo 0"),
  peso_total: z.number().min(0, "Mínimo 0"),
});

export type FlejeFormValues = z.infer<typeof flejeSchema>;
