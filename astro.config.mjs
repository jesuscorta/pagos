import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  // Vite preview options (used by Astro preview) to allow external hostnames
  vite: {
    preview: {
      allowedHosts: true,
      host: '0.0.0.0',
      port: 4321,
    },
  },
});
