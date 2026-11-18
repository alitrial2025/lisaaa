import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      onLog(level, log, handler) {
        if (log.code === 'MODULE_LEVEL_DIRECTIVE'
          && log.message.includes('"use client"')
          && (log.id ?? log.message).includes('framer-motion/')) return;
        handler(level, log);
      },
    },
  },
});
