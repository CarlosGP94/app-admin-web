import MUIThemeProvider from "@/theme/ThemeProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <MUIThemeProvider>{children}</MUIThemeProvider>
      </body>
    </html>
  );
}
