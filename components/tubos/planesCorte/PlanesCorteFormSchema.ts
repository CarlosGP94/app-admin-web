import { z } from "zod";

export const flejePlanCorteSchema = z.object({
  fleje_id: z
    .number({ error: "El ID del fleje debe ser un número" })
    .min(1, "Debes seleccionar un fleje válido"),

  num_flejes: z
    .number({ error: "El número de flejes debe ser un número" })
    .int("El número de flejes debe ser un número entero")
    .min(1, "Debe haber al menos 1 fleje"),

  peso_unit_definido: z
    .number({ error: "El peso unitario debe ser un número" })
    .min(0.001, "El peso unitario debe ser mayor a 0"),

  factor_proporcional_peso: z
    .number({ error: "El factor proporcional de peso debe ser un número" })
    .min(0, "El factor proporcional no puede ser negativo"),

  orden: z.number().int().min(1),
});

export const planCorteSchema = z.object({
  ancho_estipulado: z.number().min(1, "El ancho estipulado debe ser mayor a 0"),
  calidad_id: z
    .number({ error: "La calidad debe ser un número" })
    .min(1, "Debes seleccionar una calidad válida"),
  flejes: z
    .array(flejePlanCorteSchema)
    .min(1, "Debes agregar al menos un fleje al plan de corte"),
});

export type FlejePlanCorteFormValues = z.infer<typeof flejePlanCorteSchema>;
export type PlanCorteFormValues = z.infer<typeof planCorteSchema>;
