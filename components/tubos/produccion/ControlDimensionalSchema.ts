import { z } from "zod";

// Esquema de validación Zod
export const controlDimensionalSchema = z.object({
  id: z.number().optional(),
  maquina_id: z.coerce.number().min(1, "Seleccione una máquina"),
  calidad_id: z.coerce.number().min(1, "Seleccione una calidad"),
  tubo_id: z.coerce.number().min(1, "Seleccione un tubo"),
  medida_de: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_va: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_hb: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_espesor: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_conv: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_rectang: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_redondeo: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_revirado_alt: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_revirado_base: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_rectitud: z.coerce.number().min(0).optional().or(z.literal("")),
  medida_long: z.coerce.number().min(0).optional().or(z.literal("")),
  fecha: z.string().min(1, "Fecha requerida"),
});

// Tipo inferido del esquema de formulario
export type ControlDimensionalFormValues = z.infer<
  typeof controlDimensionalSchema
>;
