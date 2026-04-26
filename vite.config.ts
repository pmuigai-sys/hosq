import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'hosq';
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubActions ? `/${repoName}/` : '/',
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
