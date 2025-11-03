// vite.config.ts

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // (기존 서버 및 플러그인 설정 유지)
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      
      // [CRITICAL FIX] 빌드 설정을 강제하여 App.tsx를 진입점으로 사용합니다.
      build: {
        rollupOptions: {
          input: {
            // [!] App.tsx를 진입점으로 사용하도록 명시
            main: path.resolve(__dirname, 'index.html'), // index.html 유지
            appEntry: path.resolve(__dirname, 'App.tsx'), // App.tsx를 진입점으로 추가
          },
          output: {
            entryFileNames: 'assets/[name].[hash].js', // 출력 파일 이름 지정
            chunkFileNames: 'assets/[name].[hash].js',
            assetFileNames: 'assets/[name].[hash].[ext]',
          },
        },
      },
      
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // '@': path.resolve(__dirname, '.'), // 이 코드는 제거합니다.
        }
      }
    };
});