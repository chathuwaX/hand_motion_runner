import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  optimizeDeps: {
    include: ['three', '@mediapipe/tasks-vision']
  }
});
