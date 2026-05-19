import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vicoach.fitness',
  appName: 'VI Coach Fitness',
  webDir: 'dist',
  server: {
    // Modo remoto: la app carga desde tu VPS (siempre actualizada)
    url: 'https://veroisasmendicoach.com',
    cleartext: false,
    androidScheme: 'https',
  },
};

export default config;
