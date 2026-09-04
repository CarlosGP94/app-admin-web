module.exports = {
  apps: [
    {
      name: "mi-app-next",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000", // IMPORTANTE: -H 0.0.0.0 para escuchar en la LAN
      instances: 1, // Modo fork recomendado para controlar el uso de RAM/Puppeteer/SQL Server
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
