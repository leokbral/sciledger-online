import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformWithEsbuild } from 'vite';

/**
 * Para onde cada linha da lista de papers aponta.
 *
 * Isto existe por causa de um erro concreto: o super admin da plataforma passou
 * a ver a lista inteira do hub, mas `getReadMoreHref` escolhe a rota por status
 * E por papel. Sem papel no hub, os links dele caiam em `/publish/inreview`,
 * `/publish/reviewer-assignment` e `/publish/corrections` -- rotas de autor e de
 * revisor, que respondem 403. Dava para ver tudo e abrir nada.
 *
 * O teste anterior nao pegou isso porque so lia o guard da rota e nunca
 * perguntou qual link a lista gerava. Aqui a funcao e RECORTADA do componente e
 * EXECUTADA, com os mesmos sinalizadores que o componente recebe.
 */

const here = dirname(fileURLToPath(import.meta.url));
const componentPath = resolve(here, 'PapersSection.svelte');

type Flags = {
	isCreator?: boolean;
	isHubManager?: boolean;
	isHubReviewer?: boolean;
	isPlatformAdmin?: boolean;
	userId?: string;
};

type LinkFor = (flags: Flags) => (paper: Record<string, unknown>) => string;

let linkFor: LinkFor;

/**
 * Recorta do componente as funcoes de roteamento e as transforma numa fabrica
 * que recebe os sinalizadores. Uma reescrita das regras aqui provaria so que a
 * reescrita funciona.
 */
async function loadLinkResolver(): Promise<LinkFor> {
	const source = readFileSync(componentPath, 'utf8');

	const start = source.indexOf('\tfunction getPaperSlug(');
	const end = source.indexOf('\tfunction intersectsAliases(');
	expect(start, 'getPaperSlug nao encontrada').toBeGreaterThan(-1);
	expect(end, 'fim do bloco de roteamento nao encontrado').toBeGreaterThan(start);

	const block = source.slice(start, end);

	// O bloco usa os props como variaveis livres; aqui eles viram parametros.
	const module = `
type Paper = any;
export function linkFor(flags: {
	isCreator?: boolean;
	isHubManager?: boolean;
	isHubReviewer?: boolean;
	isPlatformAdmin?: boolean;
	userId?: string;
}) {
	const isCreator = flags.isCreator ?? false;
	const isHubManager = flags.isHubManager ?? false;
	const isHubReviewer = flags.isHubReviewer ?? false;
	const isPlatformAdmin = flags.isPlatformAdmin ?? false;
	const userId = flags.userId ?? 'platform-admin';
	// O recorte arrasta declaracoes com runas do Svelte. Elas nao participam do
	// roteamento; aqui viram variaveis comuns para o bloco poder rodar fora de um
	// componente.
	const $state = (value: unknown) => value;
	const shouldHighlight = () => false;
${block}
	return getReadMoreHref;
}`;

	const { code } = await transformWithEsbuild(module, 'papersSectionLinks.ts', {
		loader: 'ts',
		format: 'esm'
	});
	const loaded = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
	return loaded.linkFor;
}

beforeAll(async () => {
	linkFor = await loadLinkResolver();
}, 30_000);

const SUPER_ADMIN: Flags = { isPlatformAdmin: true, userId: 'super-1' };
const HUB_MANAGER: Flags = { isHubManager: true, isCreator: true, userId: 'owner-1' };
const OUTSIDER: Flags = { userId: 'nobody-1' };

function paper(status: string, extra: Record<string, unknown> = {}) {
	return { id: 'p1', status, ...extra };
}

describe('link do paper para o super admin da plataforma', () => {
	it.each([
		['reviewer assignment'],
		['in review'],
		['needing corrections'],
		['under correction'],
		['awaiting final decision']
	])('manda %s para a rota de leitura, nao para a de autor ou revisor', (status) => {
		const href = linkFor(SUPER_ADMIN)(paper(status));

		expect(href).toBe('/publish/view/p1');
	});

	it('manda um paper recusado pelo hub para a rota de leitura', () => {
		expect(linkFor(SUPER_ADMIN)(paper('in review', { rejectedByHub: true }))).toBe(
			'/publish/view/p1'
		);
		expect(linkFor(SUPER_ADMIN)(paper('rejected'))).toBe('/publish/view/p1');
	});

	it('manda um publicado para a rota publica, que ja aceita qualquer autenticado', () => {
		expect(linkFor(SUPER_ADMIN)(paper('published'))).toBe('/publish/published/p1');
	});

	it('nunca manda para uma rota de revisao', () => {
		for (const status of ['reviewer assignment', 'in review', 'needing corrections']) {
			expect(linkFor(SUPER_ADMIN)(paper(status))).not.toContain('/review/');
		}
	});
});

describe('o que mudou e o que NAO mudou', () => {
	it('era exatamente aqui que quebrava: sem o papel, o link ia para rota de 403', () => {
		// Mesmo paper, mesma funcao, so sem o sinalizador: reproduz o bug.
		const semPapel = linkFor(OUTSIDER)(paper('in review'));
		const comPapel = linkFor(SUPER_ADMIN)(paper('in review'));

		expect(semPapel).toBe('/publish/inreview/p1');
		expect(comPapel).toBe('/publish/view/p1');
	});

	it('nao muda nada para o hub manager', () => {
		expect(linkFor(HUB_MANAGER)(paper('reviewer assignment'))).toBe('/publish/view/p1');
		expect(linkFor(HUB_MANAGER)(paper('in review'))).toBe('/publish/inreview/p1');
	});

	it('nao muda nada para quem nao tem papel nenhum', () => {
		expect(linkFor(OUTSIDER)(paper('reviewer assignment'))).toBe(
			'/publish/reviewer-assignment/p1'
		);
		expect(linkFor(OUTSIDER)(paper('needing corrections'))).toBe('/publish/corrections/p1');
		expect(linkFor(OUTSIDER)(paper('published'))).toBe('/publish/published/p1');
	});

	it('o desvio cede a vez quando a pessoa tambem e autor ou revisor do paper', () => {
		// Um super admin que por acaso seja autor continua indo para a rota de autor:
		// o papel de plataforma nao deve roubar o fluxo editorial de ninguem.
		const comoAutor = linkFor({ isPlatformAdmin: true, userId: 'u9' })(
			paper('needing corrections', { mainAuthor: { id: 'u9' } })
		);

		expect(comoAutor).toBe('/publish/corrections/p1');
	});
});

describe('a rota de leitura esta de fato aberta para ele', () => {
	it('o guard de /publish/view aceita o super admin', () => {
		const repoRoot = resolve(here, '../../../..');
		const guard = readFileSync(
			resolve(repoRoot, 'src/routes/(app)/publish/view/[slug]/+page.server.ts'),
			'utf8'
		);
		const linha = guard.split('\n').find((l) => l.includes('if (!isHubOwner && !isHubVice'));

		// Sem isto, o desvio acima so trocaria um 403 por outro.
		expect(linha).toContain('!isPlatformAdmin');
	});
});
