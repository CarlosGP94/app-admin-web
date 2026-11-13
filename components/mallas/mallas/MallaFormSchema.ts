import { z } from "zod";

export const mallaSchema = z.object({
  // Identificación
  codigo: z.string().trim().min(1, "El código es requerido"),
  art_codigo: z.string().trim().min(1, "El código de ADM es requerido"),
  designacion: z.string().trim().min(1, "La designación es requerida"),
  art_concepto: z.string().trim().min(1, "El concepto es requerido"),
  activo: z.boolean(),

  // Dimensiones
  diametro: z.number().positive("Debe ser mayor a 0"),
  ancho: z.number().int("Debe ser entero").positive("Debe ser mayor a 0"),
  largo: z.number().int("Debe ser entero").positive("Debe ser mayor a 0"),

  // Retícula
  longitudinales: z
    .number()
    .int("Debe ser entero")
    .positive("Debe ser mayor a 0"),
  transversales: z
    .number()
    .int("Debe ser entero")
    .positive("Debe ser mayor a 0"),
  sl: z.number().positive("Debe ser mayor a 0"),
  st: z.number().int("Debe ser entero").positive("Debe ser mayor a 0"),

  // Empaque
  peso_por_paquete: z.number().positive("Debe ser mayor a 0"),
  unidades_por_paquete: z
    .number()
    .int("Debe ser entero")
    .positive("Debe ser mayor a 0"),

  // Región
  region_id: z.number().int().min(1, "Selecciona una región"),

  // Certificado asociado (0 = sin certificado)
  certificado_id: z.number().int().min(0).nullable(),
});

export type MallaFormValues = z.infer<typeof mallaSchema>;
