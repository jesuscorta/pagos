import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    allowedHosts: ['pagos.jesuscorta.es'],
    host: '0.0.0.0',
    port: 4321,
  },
});
