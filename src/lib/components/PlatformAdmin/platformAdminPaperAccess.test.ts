import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * O super admin abre o paper pelas telas de leitura, de revisor e de editor,
 * mesmo sem papel no hub, e a tela diz por que ele esta ali.
 *
 * Estes testes leem as rotas: executa-las exigiria subir o SvelteKit com Mongo.
 * Por isso cada asercao mira a EXPRESSAO de decisao, nao a presenca de uma
 * palavra solta em qualquer lugar do arquivo.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');

const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');
const lineWith = (source: string, needle: string) =>
	source.split('\n').find((line) => line.includes(needle));

const ROUTES = {
	leitura: 'src/routes/(app)/publish/view/[slug]/+page.server.ts',
	revisao: 'src/routes/(app)/review/inreview/[slug]/+page.server.ts',
	correcao: 'src/routes/(app)/review/correction/[slug]/+page.server.ts',
	designacao: 'src/routes/(app)/review/paperspool/[slug]/+page.server.ts'
};

describe('as telas de paper aceitam o super admin', () => {
	it.each(Object.entries(ROUTES))('%s resolve o papel pelo guard do servidor', (_nome, path) => {
		const source = read(path);

		expect(source).toContain("import { isSuperAdmin } from '$lib/server/authorization/superAdmin'");
		expect(source).toMatch(/await isSuperAdmin\(locals\.user\)/);
	});

	it('a tela de leitura deixa de recusar', () => {
		const guard = lineWith(read(ROUTES.leitura), 'if (!isHubOwner && !isHubVice');
		expect(guard).toContain('!isPlatformAdmin');
	});

	it('a tela de designacao de revisores deixa de recusar', () => {
		const guard = lineWith(read(ROUTES.designacao), 'if (!isHubReviewer && !isHubOwner');
		expect(guard).toContain('!isSuperUser');
	});

	it('a tela de revisao mostra as revisoes submetidas', () => {
		// Ele nao revisa: entra pelo ramo de quem LE as revisoes, nunca pelo de
		// quem as submete.
		const source = read(ROUTES.revisao);
		const bloco = source.slice(
			source.indexOf('const canViewSubmittedReviews'),
			source.indexOf('const canSubmitReview')
		);

		expect(bloco).toContain('isSuperUser');

		const submeter = source.slice(
			source.indexOf('const canSubmitReview'),
			source.indexOf('if (!canViewSubmittedReviews')
		);
		expect(submeter).not.toContain('isSuperUser');
	});

	it('a tela de correcao idem', () => {
		const linha = lineWith(read(ROUTES.correcao), 'const canViewSubmittedReviews');
		const expressao = lineWith(read(ROUTES.correcao), '!canSubmitReview && (isHubOwner');

		expect(linha ?? expressao).toBeDefined();
		expect(expressao).toContain('isSuperUser');

		const submeter = lineWith(read(ROUTES.correcao), 'const canSubmitReview =');
		expect(submeter).not.toContain('isSuperUser');
	});
});

describe('super admin nao se confunde com Admin', () => {
	it.each([ROUTES.revisao, ROUTES.correcao])(
		'%s mantem `rbac.manage` e o super admin como coisas distintas',
		(path) => {
			// `isPlatformAdmin` nestes arquivos e `can(user, 'rbac.manage')` -- a
			// permissao dos Admin comuns. O papel SuperAdmin foi criado separado para
			// que um Admin NAO herdasse administracao de plataforma, entao somar os
			// dois na mesma variavel apagaria essa fronteira.
			const source = read(path);
			const herdado = lineWith(
				source,
				"const isPlatformAdmin = await can(locals.user, 'rbac.manage')"
			);
			const novo = lineWith(source, 'const isSuperUser = await isSuperAdmin(locals.user)');

			expect(herdado).toBeDefined();
			expect(novo).toBeDefined();
			expect(herdado).not.toContain('isSuperAdmin(');
		}
	);
});

describe('a tela avisa por que ele esta vendo', () => {
	const notice = read('src/lib/components/PlatformAdmin/PlatformAdminNotice.svelte');

	it('diz exatamente isso', () => {
		expect(notice).toContain('You are seeing this paper because you are a super user');
	});

	it('diz que ele nao e do hub, que e leitura e que ficou registrado', () => {
		expect(notice).toMatch(/not a member of this Hub/i);
		expect(notice).toMatch(/nothing here can be edited or decided/i);
		expect(notice).toMatch(/recorded/i);
	});

	it('nomeia a lente pela qual ele esta olhando', () => {
		for (const lente of ['the read-only view', "a reviewer's view", "an editor's view"]) {
			expect(notice).toContain(lente);
		}
	});

	it.each([
		['src/routes/(app)/publish/view/[slug]/+page.svelte', 'data.isPlatformAdmin'],
		['src/routes/(app)/review/inreview/[slug]/+page.svelte', 'data.isSuperUserView'],
		['src/routes/(app)/review/correction/[slug]/+page.svelte', 'data.isSuperUserView'],
		['src/routes/(app)/review/paperspool/[slug]/+page.svelte', 'data.isSuperUserView']
	])('%s so mostra o aviso quando foi o papel de plataforma que abriu a porta', (path, flag) => {
		const source = read(path);

		expect(source).toContain('PlatformAdminNotice');
		expect(source).toContain(`{#if ${flag}}`);
	});

	it('quem e do hub por direito proprio nao ve o aviso', () => {
		// O sinalizador exclui quem ja tinha papel no hub, senao um dono de hub que
		// tambem fosse super admin leria que "nao e membro deste Hub".
		for (const path of [ROUTES.revisao, ROUTES.correcao]) {
			const source = read(path);
			expect(source).toContain('const isSuperUserView =');
			expect(source).toContain('!isHubOwner');
			expect(source).toContain('!isHubReviewer');
			expect(source).toContain('!isReviewerAccepted');
			expect(source).toContain('!hasAcceptedViaQueue');
		}

		const pool = read(ROUTES.designacao);
		expect(pool).toContain('const isSuperUserView =');
		expect(pool).toContain('!isHubReviewer');
		expect(pool).toContain('!isHubOwner');
		expect(pool).toContain('!isOpenReviewer');
		expect(pool).toContain('!hasAcceptedViaQueue');
	});
});

describe('o acesso elevado e registrado e somente para leitura', () => {
	it.each([ROUTES.leitura, ROUTES.revisao, ROUTES.correcao, ROUTES.designacao])(
		'%s registra a visualizacao que depende do super admin',
		(path) => {
			const source = read(path);

			expect(source).toContain(
				"import { recordAdminAuditEvent } from '$lib/server/authorization/adminAudit'"
			);
			expect(source).toContain("action: 'admin.paper.view'");
			expect(source).toContain("resourceType: 'paper'");
			expect(source).toContain('metadata: { surface:');
		}
	);

	it('na tela de designacao nao oferece aceitar ou recusar ao super admin', () => {
		const page = read('src/routes/(app)/review/paperspool/[slug]/+page.svelte');
		const actions = page.slice(page.indexOf('<!-- Action Buttons -->'));

		expect(
			page.lastIndexOf('{#if !data.isSuperUserView}', page.indexOf('<!-- Action Buttons -->'))
		).toBeGreaterThan(-1);
		expect(actions).toContain('Accept Review');
		expect(actions).toContain('Decline Review');
	});
});

describe('atalhos para as outras lentes', () => {
	const page = read('src/routes/(app)/publish/view/[slug]/+page.svelte');

	it('oferece a visao de revisor e a de editor conforme o status', () => {
		expect(page).toContain('/review/inreview/');
		expect(page).toContain('/review/correction/');
		expect(page).toContain('/review/paperspool/');
	});

	it('nao oferece uma tela de revisao para um paper que ainda nao chegou nela', () => {
		// As telas de revisao so existem a partir da etapa correspondente; oferecer
		// antes levaria a um 404 ou a uma tela vazia.
		const bloco = page.slice(page.indexOf('let otherViews'), page.indexOf('otherViews = views;'));

		expect(bloco).toContain("status === 'in review'");
		expect(bloco).toContain("status === 'reviewer assignment'");
		expect(bloco).toMatch(/needing corrections/);
	});
});
