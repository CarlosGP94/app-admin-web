"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import FactoryIcon from "@mui/icons-material/Factory";
import { useAuth } from "@/context/AuthContext";
import { APP_ROUTES } from "@/config/routes";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Por favor, introduce usuario y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(APP_ROUTES.api.auth.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: username, password }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.ok) {
        const msg = resData.message || "Credenciales incorrectas.";
        setError(msg);
        return;
      }

      // Extraemos el objeto de usuario enviado en { ok: true, data: { usuario: ... } }
      const userDb = resData.data.usuario;

      // Ahora resData.token contiene un hash JWT real (ej. "eyJhbGciOiJIUzI1NiIsInR5cCI6...")
      login(
        {
          id: Number(userDb.id),
          username: userDb.usuario,
          nombre: userDb.nombre,
          rol: userDb.rol_nombre || "Sin rol",
          cargo: userDb.cargo || "Sin cargo",
          permissions: userDb.permisos || [],
        },
        resData.token, // Guarda el JWT real en el localStorage
      );

      router.push(APP_ROUTES.home.path);
    } catch (err) {
      console.error("Error en login:", err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper
          elevation={4}
          sx={{
            p: 4,
            width: "100%",
            borderRadius: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Logo general de Planta/Empresa */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <FactoryIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: "bold" }}
            align="center"
            gutterBottom
          >
            Sistema de Gestión
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            Plataforma de Control e Integración Industrial
          </Typography>

          {/* Mensaje de Error */}
          {error && (
            <Alert severity="error" sx={{ width: "100%", mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Formulario de Acceso General */}
          <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              size="small"
              id="username"
              label="Usuario"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              size="small"
              name="password"
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="mostrar u ocultar contraseña"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, height: 48 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Acceder al Sistema"
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
