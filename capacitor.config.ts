import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workwaysmart.app',
  appName: 'WorkWay Smart',
  webDir: 'www',
  server: {
    url: 'https://workway-smart.vercel.app',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
