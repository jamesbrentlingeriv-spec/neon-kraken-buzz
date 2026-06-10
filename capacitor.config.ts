import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.liberai.writer',
  appName: 'LiberAI Writer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;