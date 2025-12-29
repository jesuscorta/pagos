import { defineConfig } from 'vite';

export default defineConfig({
  preview: {
    // Allow Dokploy/remote hostnames without blocking
    allowedHosts: true,
    host: '0.0.0.0',
    port: 4321,
  },
});
