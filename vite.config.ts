import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'lucide-react/dist/esm/icons/fingerprint': 'lucide-react/dist/esm/icons/activity',
    },
  },
  optimizeDeps: {
    exclude: [],
  },
});
