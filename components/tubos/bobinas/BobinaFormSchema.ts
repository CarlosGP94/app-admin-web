import { z } from "zod";

export const bobinaSchema = z
  .object({
    // Información General
    fabricante_id: z.number().min(1, "Debes seleccionar un fabricante"),
    calidad_id: z.number().min(1, "Debes seleccionar una calidad"),
    activa: z.boolean(), // 👈 Quitar .default(true) aquí resuelve el conflicto de tipos
    concepto: z.string().min(1, "El concepto es obligatorio").trim(),

    // Dimensiones
    espesor: z
      .number({
        error: "El espesor debe ser un número",
      })
      .gt(0, "El espesor debe ser mayor a 0 mm"),

    ancho: z
      .number({
        error: "El ancho debe ser un número",
      })
      .gt(0, "El ancho debe ser mayor a 0 mm"),

    // Inventario y Pesos
    peso_medio: z
      .number({
        error: "El peso medio debe ser un número",
      })
      .min(0, "Mínimo 0"),

    unidades: z
      .number({
        error: "Las unidades deben ser un número",
      })
      .min(0, "Mínimo 0"),

    peso_total: z
      .number({
        error: "El peso total debe ser un número",
      })
      .min(0, "Mínimo 0"),
  })
  .superRefine((data, ctx) => {});

export type BobinaFormValues = z.infer<typeof bobinaSchema>;
