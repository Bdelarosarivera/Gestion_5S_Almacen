import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Indicamos a Rollup que estas librerías se cargarán externamente (vía importmap en index.html)
      external: [
        'html2canvas',
        'xlsx',
        'recharts',
        'lucide-react',
        '@google/genai'
      ],
      output: {
        globals: {
          html2canvas: 'html2canvas',
          xlsx: 'XLSX',
          recharts: 'Recharts',
          'lucide-react': 'LucideReact',
          '@google/genai': 'GoogleGenAI'
        }
      }
    }
  },
});