import MUIThemeProvider from "@/theme/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <MUIThemeProvider>{children}</MUIThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
