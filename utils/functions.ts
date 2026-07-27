export function getFechaLocalISO(fechaStr?: string): string {
  const d = fechaStr ? new Date(fechaStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
