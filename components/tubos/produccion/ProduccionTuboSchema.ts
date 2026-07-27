import { z } from "zod";

export const produccionTuboEditSchema = z.object({
  id: z.number({ message: "El ID es obligatorio" }).positive(),

  operario_id: z
    .number({ message: "Selecciona un operario" })
    .min(1, { message: "Debe seleccionar un operario válido" }),

  turno_id: z
    .number({ message: "Selecciona un turno" })
    .min(1, { message: "Debe seleccionar un turno válido" }),

  maquina_id: z
    .number({ message: "Selecciona una máquina" })
    .min(1, { message: "Debe seleccionar una máquina válida" }),

  calidad_id: z
    .number({ message: "Selecciona una calidad" })
    .min(1, { message: "Debe seleccionar una calidad válida" }),

  tubo_id: z
    .number({ message: "Selecciona un tubo" })
    .min(1, { message: "Debe seleccionar un tubo válido" }),

  // Mantenemos el autocomplete de Lote de Tubo
  // Si usas un Autocomplete de MUI, se puede manejar como objeto { id, label } o id directo
  lote_tubo_id: z
    .number({ message: "Selecciona un lote de tubo" })
    .min(1, { message: "Debe seleccionar un lote válido" }),

  cant_tubos_buenos: z
    .number({ message: "Debe ser un número" })
    .min(0, { message: "La cantidad no puede ser negativa" }),

  cant_tubos_malos: z
    .number({ message: "Debe ser un número" })
    .min(0, { message: "La cantidad no puede ser negativa" }),

  paquetes: z
    .number({ message: "Debe ser un número" })
    .min(0, { message: "El número de paquetes no puede ser negativo" }),

  concentracion_taladrina: z
    .number({ message: "Debe ser un número" })
    .min(0, { message: "La concentración no puede ser negativa" })
    .optional()
    .nullable(),

  observacion: z.string().optional().nullable(),

  // Fecha de registro (acepta String YYYY-MM-DD o ISO)
  creado: z.string().min(1, { message: "La fecha es obligatoria" }),
});

// Tipo inferido para TypeScript
export type ProduccionTuboFormValues = z.infer<typeof produccionTuboEditSchema>;
