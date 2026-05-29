import type { Config } from 'tailwindcss';

// Tailwind v4 uses CSS-first configuration in index.css via @theme.
// This file is kept for editor tooling / content discovery.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
