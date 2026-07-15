module.exports = {
  apps: [
    {
      name: "mi-app-next",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000", // Cambia el puerto aquí si lo necesitas
      instances: "max", // Aprovecha todos los núcleos de tu procesador (modo cluster)
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
