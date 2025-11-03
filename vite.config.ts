// vite.config.ts (이전 코드에 build 설정을 추가합니다.)

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // path 모듈 import가 필요할 수 있습니다.

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // (기존 설정 유지)
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      
      // [CRITICAL FIX] 빌드 설정에 entry point를 강제합니다.
      build: {
        // [Vercel에서 path0/index.html 경로를 정확히 인식하도록 돕습니다.]
        rollupOptions: {
            // [!] 앱의 실제 진입점인 App.tsx를 명시합니다.
            input: path.resolve(__dirname, 'src/App.tsx'),
        },
      },
      
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      // (resolve 설정이 있다면 그대로 유지)
    };
});