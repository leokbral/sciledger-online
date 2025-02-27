import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit(), purgeCss()],
	server: {
		allowedHosts: ['frontend_web'],
	},
	preview: {
        allowedHosts: [
            'localhost',
            'scideep.imd.ufrn.br'
        ]
    }
	
});