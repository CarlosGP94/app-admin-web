import MUIThemeProvider from "@/theme/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer, Bounce } from "react-toastify";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />
        <AuthProvider>
          <MUIThemeProvider>{children}</MUIThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
