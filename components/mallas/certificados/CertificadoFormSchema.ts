import { z } from "zod";

export const certificadoSchema = z.object({
  certificado: z
    .string()
    .trim()
    .min(1, "El nombre del certificado es requerido")
    .max(100, "El nombre no puede superar los 100 caracteres"),
});

export type CertificadoFormValues = z.infer<typeof certificadoSchema>;
