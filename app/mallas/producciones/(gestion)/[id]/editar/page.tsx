"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { APP_ROUTES } from "@/config/routes";
import { useLayoutTitle } from "../../layout";
import { toast } from "react-toastify";

interface ProduccionDetalle {
  id: number;
  turno_id: number;
  malla_id: number;
  malla_codigo?: string;
  malla_designacion?: string;
  paquete: number;
  lote: string;
  unidades: number;
  sl: number;
  st: number;
  longitudinales: number;
  transversales: number;
  diametro: number;
  observacion: string;
  ancho: number;
  largo: number;
  maquina_id: number;
  maquina_nombre?: string;
  creado: string;
}

interface MallaOption {
  id: number;
  codigo: string;
  designacion?: string;
  diametro: number;
  ancho: number;
  largo: number;
  sl: number;
  st: number;
  longitudinales: number;
  transversales: number;
}

interface MallaSelectOption {
  id: number;
  label: string;
}

interface EditarProduccionPageProps {
  params: Promise<{ id: string }>;
}

function formatFecha(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO");
}

export default function EditarProduccionPage({
  params,
}: EditarProduccionPageProps) {
  const permission = APP_ROUTES.mallas.subRoutes.producciones_edit
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <EditarProduccionView params={params} />
    </ProtectedRoute>
  );
}

export function EditarProduccionView({ params }: EditarProduccionPageProps) {
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [produccion, setProduccion] = useState<ProduccionDetalle | null>(null);
  const [mallas, setMallas] = useState<MallaOption[]>([]);
  const [mallaId, setMallaId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMallas, setLoadingMallas] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setTitleInfo(
      "Editar producción",
      "Las medidas son solo ilustrativas; selecciona la malla que corresponda."
    );
  }, [setTitleInfo]);

  useEffect(() => {
    async function fetchProduccion() {
      try {
        setLoading(true);

        const response = await fetch(
          APP_ROUTES.api.mallas.producciones_detalle(id)
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.message ||
              "No se pudo recuperar la información de la producción."
          );
        }

        const result = await response.json();
        const data = result.data as ProduccionDetalle;
        setProduccion(data);
        setMallaId(Number(data.malla_id ?? 0));
      } catch (error) {
        console.error("Error al obtener la producción:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar la producción."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProduccion();
    }
  }, [id]);

  useEffect(() => {
    if (!produccion) return;
    const datos = produccion;

    async function fetchMallasCompatibles() {
      try {
        setLoadingMallas(true);

        const url = new URL(
          APP_ROUTES.api.mallas.mallas,
          window.location.origin
        );
        url.searchParams.set("page", "1");
        url.searchParams.set("limit", "200");

        const filtros: Array<[string, number]> = [
          ["diametro", datos.diametro],
          ["ancho", datos.ancho],
          ["largo", datos.largo],
          ["sl", datos.sl],
          ["st", datos.st],
          ["longitudinales", datos.longitudinales],
          ["transversales", datos.transversales],
        ];

        filtros.forEach(([key, value]) => {
          if (Number.isFinite(value)) {
            url.searchParams.set(key, String(value));
          }
        });

        const response = await fetch(url.toString());

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.message ||
              "No se pudieron cargar las mallas compatibles."
          );
        }

        const result = await response.json();
        setMallas((result.data ?? []) as MallaOption[]);
      } catch (error) {
        console.error("Error al obtener las mallas compatibles:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar las mallas compatibles."
        );
      } finally {
        setLoadingMallas(false);
      }
    }

    fetchMallasCompatibles();
  }, [produccion]);

  const mallaOptions = useMemo<MallaSelectOption[]>(() => {
    const options: MallaSelectOption[] = [];
    const seen = new Set<number>();

    mallas.forEach((malla) => {
      const id = Number(malla.id);

      if (!Number.isFinite(id) || seen.has(id)) return;

      seen.add(id);
      options.push({
        id,
        label: malla.designacion
          ? `${malla.codigo} · ${malla.designacion}`
          : malla.codigo,
      });
    });

    const mallaActualId = Number(produccion?.malla_id ?? 0);

    if (produccion && mallaActualId > 0 && !seen.has(mallaActualId)) {
      options.unshift({
        id: mallaActualId,
        label:
          produccion.malla_codigo && produccion.malla_designacion
            ? `${produccion.malla_codigo} · ${produccion.malla_designacion}`
            : (produccion.malla_codigo ?? `Malla #${mallaActualId}`),
      });
    }

    return [{ id: 0, label: "Sin malla" }, ...options];
  }, [mallas, produccion]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);

      const response = await fetch(
        APP_ROUTES.api.mallas.producciones_detalle(id),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ malla_id: mallaId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Error al actualizar la producción en el servidor."
        );
      }

      toast.success("Malla de la producción actualizada correctamente.");
      router.push(APP_ROUTES.mallas.subRoutes.producciones.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar la producción:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocurrió un fallo inesperado al guardar la actualización."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!produccion) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          No se encontró la producción solicitada.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Datos de la producción
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Lote"
                value={produccion.lote ?? ""}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Paquete"
                value={produccion.paquete}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Unidades"
                value={produccion.unidades}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Máquina"
                value={produccion.maquina_nombre ?? produccion.maquina_id}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Turno"
                value={produccion.turno_id}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Creado"
                value={formatFecha(produccion.creado)}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 4 }}>
            Medidas (ilustrativo)
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                label="Diámetro"
                value={produccion.diametro}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                label="Ancho"
                value={produccion.ancho}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                label="Largo"
                value={produccion.largo}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                label="SL"
                value={produccion.sl}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                label="ST"
                value={produccion.st}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                label="Longitudinales"
                value={produccion.longitudinales}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                label="Transversales"
                value={produccion.transversales}
                size="small"
                fullWidth
                disabled
              />
            </Grid>
          </Grid>

          {produccion.observacion && (
            <TextField
              label="Observación"
              value={produccion.observacion}
              size="small"
              fullWidth
              multiline
              minRows={2}
              disabled
              sx={{ mt: 2 }}
            />
          )}

          <Typography variant="h6" sx={{ fontWeight: 600, mt: 4 }}>
            Malla asignada
          </Typography>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 8, md: 6 }}>
              <TextField
                select
                label="Malla"
                value={mallaId}
                onChange={(event) => setMallaId(Number(event.target.value))}
                size="small"
                fullWidth
                disabled={loadingMallas}
                helperText={
                  loadingMallas
                    ? "Buscando mallas compatibles con las medidas..."
                    : mallas.length === 0
                      ? "No se encontraron mallas con estas medidas."
                      : `${mallas.length} malla(s) compatible(s) con las medidas.`
                }
              >
                {mallaOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Stack
        direction="row"
        sx={{
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 2,
          mt: 2,
        }}
      >
        <Button
          component={Link}
          size="small"
          href={APP_ROUTES.mallas.subRoutes.producciones.path}
          variant="outlined"
          color="inherit"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none", minWidth: 112 }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="small"
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={saving}
          sx={{ textTransform: "none", minWidth: 112 }}
        >
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </Stack>
    </Box>
  );
}
