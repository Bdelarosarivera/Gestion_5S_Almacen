
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Al eliminar 'external', Vite agrupará todas las dependencias en el bundle.
      // Esto previene errores de red/CORS y conflictos de versiones de React.
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react', 'recharts', 'xlsx', 'html2canvas']
        }
      }
    }
  },
});
