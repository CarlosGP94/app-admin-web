import { z } from "zod";

export const tuboSchema = z
  .object({
    // TAB 1: Información General
    calidad_id: z.number().min(1, "Selecciona una calidad"),
    tipo_id: z.number().min(1, "Selecciona un tipo"),
    activo: z.boolean(),
    art_concepto: z.string().min(1, "El concepto/medida es requerido"),
    no_especial: z.number().optional(),

    // Dimensiones según Tipo
    alto: z.number().optional(),
    ancho: z.number().optional(),
    diametro: z.number().optional(),
    espesor: z.number().min(1, "Mínimo 1"),
    longitud: z.number().min(1, "Mínimo 1"), // en metros o mm según especifiques

    // Inventario
    num_paquetes: z.number().min(0, "Mínimo 0"),
    num_por_paq: z.number().min(0, "Mínimo 0"),
    unidades: z.number().min(0, "Mínimo 0"),

    // Pesos
    peso_unitario: z.number().min(1, "Mínimo 1"),
    peso_total: z.number().min(1, "Mínimo 1"),
    masa_lineal: z.number().min(0, "Mínimo 0"),

    // Dimensiones Paquete
    alto_paq: z.number().min(1, "Mínimo 1"),
    ancho_paq: z.number().min(1, "Mínimo 1"),

    // TAB 2: Máquinas y Flejes
    maquinasConfig: z.array(
      z.object({
        maquina_id: z.number(),
        maquina_nombre: z.string(),
        habilitada: z.boolean(),
        flejes_ids: z.array(z.number()),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    // Validaciones condicionales por Tipo de Tubo
    if (data.tipo_id === 1) {
      // Rectangular
      if (!data.alto || data.alto < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mínimo 1",
          path: ["alto"],
        });
      }
      if (!data.ancho || data.ancho < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mínimo 1",
          path: ["ancho"],
        });
      }
    } else if (data.tipo_id === 2) {
      // Cuadrado
      if (!data.ancho || data.ancho < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mínimo 1",
          path: ["ancho"],
        });
      }
    } else if (data.tipo_id === 3) {
      // Redondo
      if (!data.diametro || data.diametro < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Mínimo 1",
          path: ["diametro"],
        });
      }
    }
  });

export type TuboFormValues = z.infer<typeof tuboSchema>;
