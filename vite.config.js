import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl(),
  ],
  server: {
    https: true,
    host: '0.0.0.0',
    port: 5173
  },
  resolve: {
    alias: {
      '@iwsdk/core': '../immersive-web-sdk/packages/core/dist/index.js',
      '@iwsdk/xr-input': '../immersive-web-sdk/packages/xr-input/dist/index.js',
      '@iwsdk/locomotor': '../immersive-web-sdk/packages/locomotor/dist/index.js',
      '@iwsdk/glxf': '../immersive-web-sdk/packages/glxf/dist/index.js'
    }
  }
});
