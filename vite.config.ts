import tailwindcss from '@tailwindcss/vite'
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [ tailwindcss(), sveltekit()],
    server: {
        //allowedHosts: ['frontend_web']
        port: 5173,
        host: true,
        cors: true,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Credentials': 'true'
        },
        fs: {
            strict: false
        },
        middlewareMode: false
    },
    preview: {
        allowedHosts: [
            'localhost',
            'scideep.imd.ufrn.br'
        ]
    },
    ssr: {
        external: ['entities', 'htmlparser2', 'domutils', 'cheerio', 'jsdom'],
        noExternal: []
    },
    optimizeDeps: {
        exclude: ['entities', 'htmlparser2', 'domutils', 'cheerio', 'jsdom']
    }
});