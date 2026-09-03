/**
 * Permite `import tpl from './algum-template.tpl.html?raw'`.
 * O tsconfig gerado pelo SvelteKit não inclui os tipos do Vite (`vite/client`),
 * então declaramos aqui o formato do import cru.
 */
declare module '*.tpl.html?raw' {
	const content: string;
	export default content;
}
