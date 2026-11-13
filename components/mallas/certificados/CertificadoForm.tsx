"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ImageIcon from "@mui/icons-material/Image";
import {
  certificadoSchema,
  CertificadoFormValues,
} from "./CertificadoFormSchema";
import { FormTextField } from "@/components/commons/FormTextfield";

export interface CertificadoFormSubmitValues extends CertificadoFormValues {
  imagen: File | null;
}

interface CertificadoFormProps {
  initialData?: Partial<CertificadoFormValues>;
  existingImageUrl?: string | null;
  isEditing?: boolean;
  onSubmit: (data: CertificadoFormSubmitValues) => Promise<void> | void;
}

export default function CertificadoForm({
  initialData,
  existingImageUrl,
  isEditing = false,
  onSubmit: onSubmitProp,
}: CertificadoFormProps) {
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const previewUrl = useMemo(
    () => (imagenFile ? URL.createObjectURL(imagenFile) : null),
    [imagenFile]
  );

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<CertificadoFormValues>({
    resolver: zodResolver(certificadoSchema),
    defaultValues: {
      certificado: initialData?.certificado ?? "",
    },
  });

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const imagenMostrada = previewUrl ?? existingImageUrl ?? null;
  const tituloImagen = previewUrl
    ? "Imagen nueva"
    : existingImageUrl
      ? "Imagen actual"
      : "Sin imagen";

  const onSubmit = async (values: CertificadoFormValues) => {
    await onSubmitProp({ ...values, imagen: imagenFile });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Datos del certificado
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <FormTextField
                  name="certificado"
                  control={control}
                  label="Nombre del certificado"
                  required
                  slotProps={{ htmlInput: { maxLength: 100 } }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{
                mb: 2,
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Imagen del certificado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Formatos permitidos: PNG, JPG, WEBP, GIF o BMP. Máximo 10 MB.
                </Typography>
              </Box>

              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadFileIcon />}
                disabled={isSubmitting}
                sx={{ textTransform: "none" }}
              >
                {imagenFile ? "Cambiar imagen" : "Seleccionar imagen"}
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp"
                  onChange={(event) => {
                    setImagenFile(event.target.files?.[0] ?? null);
                  }}
                />
              </Button>
            </Stack>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 240,
                p: 2,
                borderRadius: 2,
                border: 1,
                borderStyle: "dashed",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              {imagenMostrada ? (
                <Box
                  component="img"
                  src={imagenMostrada}
                  alt={tituloImagen}
                  sx={{
                    maxWidth: "100%",
                    maxHeight: 420,
                    objectFit: "contain",
                    borderRadius: 1,
                  }}
                />
              ) : (
                <Stack spacing={1} sx={{ alignItems: "center" }}>
                  <ImageIcon color="disabled" sx={{ fontSize: 48 }} />
                  <Typography variant="body2" color="text.secondary">
                    Selecciona una imagen para previsualizarla.
                  </Typography>
                </Stack>
              )}
            </Box>

            {imagenFile && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {imagenFile.name} ({(imagenFile.size / 1024).toFixed(0)} KB)
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Divider sx={{ my: 4 }} />
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          disabled={isSubmitting}
          sx={{ minWidth: 180, textTransform: "none", fontWeight: 600 }}
        >
          {isSubmitting
            ? "Guardando..."
            : isEditing
              ? "Actualizar Certificado"
              : "Crear Certificado"}
        </Button>
      </Box>
    </Box>
  );
}
