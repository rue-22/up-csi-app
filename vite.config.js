import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

import tailwind from '@tailwindcss/vite';

export default defineConfig({
    plugins: [tailwind(), sveltekit()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
    },
});
