// @/app/tubos/(gestion)/[id]/page.tsx
"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../../layout";
import { APP_ROUTES } from "@/config/routes";
import {
  Box,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { ProduccionTuboFormValues } from "@/components/tubos/produccion/ProduccionTuboSchema";
import ProduccionTuboForm from "@/components/tubos/produccion/ProduccionTuboForm";

interface ActualizarProduccionTuboPageProps {
  params: Promise<{ id: string }>;
}

export default function ActualizarProduccionTuboPage({
  params,
}: ActualizarProduccionTuboPageProps) {
  const permission = APP_ROUTES.tubos.subRoutes.bobinas_edit
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    // <ProtectedRoute requiredPermission={permission}>
    <ActualizarProduccionTuboView params={params} />
    // </ProtectedRoute>
  );
}

export function ActualizarProduccionTuboView({
  params,
}: ActualizarProduccionTuboPageProps) {
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [initialData, setInitialData] =
    useState<ProduccionTuboFormValues | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados para controlar el modal de confirmación y sus mensajes de advertencia
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [pendingData, setPendingData] =
    useState<ProduccionTuboFormValues | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Titular de la página
  useEffect(() => {
    setTitleInfo(
      "Actualizar Producción de Tubo",
      "Modifica las dimensiones y especificaciones de la producción de tubo.",
    );
  }, [setTitleInfo]);

  // Cargar datos de la producción de tubo al montar la vista
  useEffect(() => {
    async function fetchProduccionTubo() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const response = await fetch(
          `${APP_ROUTES.api.tubos.produccion_detalle(id)}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              "No se pudo recuperar la información de la producción de tubo.",
          );
        }

        const result = await response.json();
        const rawData = result.data;

        setInitialData({
          ...rawData,
          operario_id: Number(rawData.operario_id),
          maquina_id: Number(rawData.maquina_id),
          turno_id: Number(rawData.turno_id),
          tubo_id: Number(rawData.tubo_id),
          calidad_id: Number(rawData?.tubo?.calidad_id || rawData.calidad_id),
          tubos_buenos: Number(rawData.tubos_buenos),
          cant_tubos_buenos: Number(rawData.cant_tubos_buenos),
        });
      } catch (error) {
        console.error("Error al obtener la producción de tubo:", error);
        setErrorMessage("Ocurrió un error al cargar la producción de tubo.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchProduccionTubo();
    }
  }, [id]);

  // Ejecuta la llamada API para actualizar los datos
  const executeUpdate = async (data: ProduccionTuboFormValues) => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch(`${APP_ROUTES.api.tubos.produccion}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id: Number(id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            "Error al actualizar la producción de tubo en el servidor.",
        );
      }
      toast.success("Producción de tubo actualizada exitosamente.");
      router.push(APP_ROUTES.tubos.subRoutes.produccion.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar la producción de tubo:", error);
      toast.error("Error al guardar la producción de tubo.");
      setErrorMessage(
        "Ocurrió un fallo inesperado al guardar la actualización.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Evalúa qué cambios se han realizado y decide si muestra el modal o envía directamente
  const handleFormSubmit = (formData: ProduccionTuboFormValues) => {
    if (!initialData) {
      executeUpdate(formData);
      return;
    }

    const detectedWarnings: string[] = [];

    // Normalización de la fecha a YYYY-MM-DD para comparar de forma precisa
    const fechaInicial = initialData.creado
      ? new Date(initialData.creado).toISOString().split("T")[0]
      : "";
    const fechaNuevas = formData.creado
      ? new Date(formData.creado).toISOString().split("T")[0]
      : "";

    // 1. Evaluación de campos de Control Dimensional
    const cambioControlDimensional =
      Number(initialData.operario_id) !== Number(formData.operario_id) ||
      Number(initialData.tubo_id) !== Number(formData.tubo_id) ||
      Number(initialData.calidad_id) !== Number(formData.calidad_id) ||
      Number(initialData.maquina_id) !== Number(formData.maquina_id) ||
      fechaInicial !== fechaNuevas;

    if (cambioControlDimensional) {
      detectedWarnings.push(
        "Se han modificado uno o más campos clave (Operario, Tubo, Calidad, Máquina o Fecha). Estos cambios se actualizarán también en el control dimensional correspondiente.",
      );
    }

    // 2. Evaluación de campos de Inventario/Stock
    const cambioInventario =
      Number(initialData.tubo_id) !== Number(formData.tubo_id) ||
      Number(initialData.cant_tubos_buenos) !==
        Number(formData.cant_tubos_buenos);

    if (cambioInventario) {
      detectedWarnings.push(
        "Se ha modificado el tubo seleccionado o la cantidad de tubos buenos. El inventario de stock del tubo se recalculará automáticamente.",
      );
    }

    // Si hay advertencias, abrimos el modal de confirmación; en caso contrario, guardamos directamente
    if (detectedWarnings.length > 0) {
      setWarnings(detectedWarnings);
      setPendingData(formData);
      setOpenModal(true);
    } else {
      executeUpdate(formData);
    }
  };

  const handleConfirmModal = () => {
    setOpenModal(false);
    if (pendingData) {
      executeUpdate(pendingData);
    }
  };

  const handleCancelModal = () => {
    setOpenModal(false);
    setPendingData(null);
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

  return (
    <Box>
      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {initialData && (
        <ProduccionTuboForm
          initialData={initialData}
          onSubmit={handleFormSubmit}
        />
      )}

      {/* Modal de confirmación previa al guardado */}
      <Dialog
        open={openModal}
        onClose={handleCancelModal}
        aria-labelledby="confirm-update-title"
        aria-describedby="confirm-update-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          id="confirm-update-title"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <WarningAmberIcon color="warning" />
          Confirmación de actualización
        </DialogTitle>

        <DialogContent>
          <DialogContentText id="confirm-update-description" sx={{ mb: 2 }}>
            Por favor, revisa las siguientes implicaciones antes de continuar:
          </DialogContentText>

          <List>
            {warnings.map((text, idx) => (
              <ListItem
                key={idx}
                disableGutters
                sx={{ alignItems: "flex-start" }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                  <WarningAmberIcon color="warning" fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={text}
                  // primaryTypographyProps={{
                  //   variant: "body2",
                  //   color: "text.primary",
                  // }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCancelModal}
            color="inherit"
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmModal}
            color="primary"
            variant="contained"
            disabled={submitting}
            autoFocus
          >
            {submitting ? <CircularProgress size={24} /> : "Entendido"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
