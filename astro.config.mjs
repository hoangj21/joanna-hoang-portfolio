// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  // Set this to the custom domain once it's registered (used for canonical and Open Graph URLs).
  site: 'https://www.joannahoang.me',
  // Astro 7 defaults to JSX-style whitespace collapsing; keep v6 behavior so inline spacing is preserved.
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
  },
});
