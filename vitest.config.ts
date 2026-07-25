import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// 最小 Vitest 設定：只服務純邏輯單元測試（同步正確性核心、detectAnomalies、時區）。
// 不啟用 jsdom / 元件測試 —— UI 走 preview 驗證（沿用 001–003 慣例）。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
