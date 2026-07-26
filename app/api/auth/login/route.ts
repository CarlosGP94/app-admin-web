import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"; // 1. Importamos JWT
import { getConnection } from "@/lib/db";
import { loginService } from "@/lib/services/auth.service";

// Clave secreta definida en tu archivo .env.local (e.g. JWT_SECRET="tu_clave_secreta_super_segura")
const JWT_SECRET = process.env.JWT_SECRET || "secreto_desarrollo_temporal_123";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario, password } = body || {};

    if (!usuario || !password) {
      return NextResponse.json(
        { ok: false, message: "Usuario y contraseña requeridos." },
        { status: 400 },
      );
    }

    const pool = await getConnection("seguridad");
    const userDb = await loginService(pool, { usuario, password });

    // Validar contraseña
    const passwordMatch = await bcrypt.compare(password, userDb.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { ok: false, message: "Credenciales inválidas." },
        { status: 401 },
      );
    }

    const { password_hash, ...usuarioSinHash } = userDb;

    // 2. Generar el Token JWT firmado (caduca en 8 horas por ejemplo)
    const token = jwt.sign(
      {
        id: usuarioSinHash.id,
        usuario: usuarioSinHash.usuario,
        nombre: usuarioSinHash.nombre,
        rol_id: usuarioSinHash.rol_id,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    // 3. Incluir la propiedad token en la respuesta
    return NextResponse.json(
      {
        ok: true,
        data: {
          usuario: usuarioSinHash,
        },
        token,
        message: "Autenticación exitosa.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error en login:", error);
    return NextResponse.json(
      { ok: false, message: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
