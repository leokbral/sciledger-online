import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { filterPapersForPersona } from './hubPaperVisibility';
import { resolveHubWorkspaceForHub } from './hubResolver';
import type { HubWorkspacePaper } from './hubTypes';

/**
 * Um super admin da plataforma nao e membro de hub nenhum: `resolveEffectiveHubRoles`
 * so consulta atribuicoes `scopeType: 'hub'`. Sem este tratamento ele caia na persona
 * Reader e enxergava apenas os papers publicados -- menos do que a equipe do hub ve.
 *
 * O que ele ganha e VISIBILIDADE, nao poder: as acoes de escrita continuam presas a
 * `canManageEditorialFlow`, que depende de permissao real no hub.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const serverLoad = readFileSync(
	resolve(repoRoot, 'src/routes/(app)/hub/view/[id]/+page.server.ts'),
	'utf8'
);

function paper(overrides: Partial<HubWorkspacePaper> = {}): HubWorkspacePaper {
	return { status: 'in review', ...overrides } as HubWorkspacePaper;
}

describe('persona de super admin no workspace do hub', () => {
	it('so aparece quando o servidor diz que a pessoa e super admin', () => {
		const semFlag = resolveHubWorkspaceForHub(null, null, { userId: 'u1', papers: [] });
		const comFlag = resolveHubWorkspaceForHub(null, null, {
			userId: 'u1',
			papers: [],
			isSuperAdmin: true
		});

		expect(semFlag.availablePersonas.map((p) => p.key)).not.toContain('PlatformAdmin');
		expect(comFlag.availablePersonas.map((p) => p.key)).toContain('PlatformAdmin');
	});

	it('e aditiva: quem tambem e membro do hub mantem as personas do hub', () => {
		const resolution = resolveHubWorkspaceForHub(null, { primaryRoleKey: 'HubOwner' }, {
			userId: 'u1',
			papers: [],
			isSuperAdmin: true
		});

		const keys = resolution.availablePersonas.map((p) => p.key);
		expect(keys).toContain('HubOwner');
		expect(keys).toContain('PlatformAdmin');
	});

	it('nao abre a tela de administracao do hub, e sim a editorial', () => {
		// `role: 'admin'` renderiza o AdminWorkspace, com gestao de hub. O super admin
		// e so leitura, entao entra pela area editorial.
		const resolution = resolveHubWorkspaceForHub(null, null, {
			userId: 'u1',
			papers: [],
			isSuperAdmin: true
		});
		const persona = resolution.availablePersonas.find((p) => p.key === 'PlatformAdmin');

		expect(persona?.role).toBe('editor');
		expect(persona?.roleKey).toBeNull();
		expect(persona?.label.toLowerCase()).toContain('read-only');
	});

	it('mostra a lista inteira que o servidor devolveu', () => {
		const papers = [
			paper({ status: 'published' }),
			paper({ status: 'in review' }),
			paper({ status: 'awaiting final decision' }),
			paper({ status: 'in review', rejectedByHub: true })
		];

		expect(filterPapersForPersona(papers, 'PlatformAdmin', 'u1')).toHaveLength(4);
	});

	it('ve o mesmo conjunto que as personas editoriais do hub', () => {
		const papers = [paper({ status: 'published' }), paper({ status: 'in review' })];

		expect(filterPapersForPersona(papers, 'PlatformAdmin', 'u1')).toEqual(
			filterPapersForPersona(papers, 'HubOwner', 'u1')
		);
	});

	it('sem a persona, um nao-membro enxergaria so os publicados', () => {
		// Este era o comportamento antigo do super admin, e continua valendo para
		// qualquer visitante comum.
		const papers = [paper({ status: 'published' }), paper({ status: 'in review' })];

		expect(filterPapersForPersona(papers, 'Reader', 'u1')).toHaveLength(1);
	});
});

describe('o que o servidor libera, e o que continua fechado', () => {
	it('a visibilidade passa a considerar o super admin', () => {
		expect(serverLoad).toContain('const isPlatformAdmin = await isSuperAdmin(locals.user)');
		expect(serverLoad).toContain(
			'const canViewAllHubPapers = canManageEditorialFlow || isPlatformAdmin'
		);
		expect(serverLoad).toContain('fetchPapers(canViewAllHubPapers)');
	});

	it('NAO concede escrita: canManageEditorialFlow continua so da permissao do hub', () => {
		// Esta e a asercao que importa. `canManageEditorialFlow` alimenta designacao
		// de revisores, decisao editorial e gestao de membros/papeis. Se um dia alguem
		// somar `isPlatformAdmin` nessa linha, este teste cai.
		const linha = serverLoad
			.split('\n')
			.find((l) => l.includes('const canManageEditorialFlow ='));

		expect(linha).toBeDefined();
		expect(linha).toContain('assignmentAuthorization.allowed');
		expect(linha).not.toContain('isPlatformAdmin');
		expect(linha).not.toContain('isSuperAdmin');
	});

	it('o flag enviado ao cliente nao decide nada sozinho', () => {
		// O cliente recebe `isPlatformAdmin` so para oferecer a persona. A lista de
		// papers ja chega filtrada pelo servidor, entao forjar o flag no navegador
		// nao revela paper nenhum.
		expect(serverLoad).toContain('isPlatformAdmin,');
		expect(serverLoad).not.toContain('locals.user.isPlatformAdmin');
		expect(serverLoad).not.toContain('request.headers.get(');
	});

	it('inclui rascunhos para o super admin e preserva o filtro dos editores do hub', () => {
		const ramo = serverLoad.slice(
			serverLoad.indexOf('if (canViewAllHubPapers)'),
			serverLoad.indexOf('} else {')
		);

		const queryFor = new Function('isPlatformAdmin', 'params', `
			let paperQuery;
			const canViewAllHubPapers = true;
			${ramo}}
			return paperQuery;
		`);
		expect(queryFor(true, { id: 'hub-1' })).toEqual({ hubId: 'hub-1' });
		expect(queryFor(false, { id: 'hub-1' })).toEqual({ hubId: 'hub-1', status: { $ne: 'draft' } });
	});

	it('deixa rastro de auditoria quando e o papel de plataforma que abriu o acesso', () => {
		expect(serverLoad).toContain('recordAdminAuditEvent');
		expect(serverLoad).toContain("action: 'admin.hub.view'");
		// Nao registra quem ja era da equipe do hub por direito proprio.
		expect(serverLoad).toContain('if (isPlatformAdmin && !canManageEditorialFlow)');
	});

	it('resolve o papel no servidor, pelo guard existente', () => {
		// Nada de ler `user.roles.admin` ou um campo do cliente: o unico caminho e
		// `isSuperAdmin()`, que por sua vez passa por `authorize()`.
		expect(serverLoad).toContain(
			"import { isSuperAdmin } from '$lib/server/authorization/superAdmin'"
		);
		expect(serverLoad).not.toMatch(/roles\?\.\s*admin/);
	});
});

describe('abrir o paper a partir da lista', () => {
	const paperView = readFileSync(
		resolve(repoRoot, 'src/routes/(app)/publish/view/[slug]/+page.server.ts'),
		'utf8'
	);

	it('nao devolve 403 para o super admin', () => {
		// Ver o paper na lista e tomar 403 ao clicar seria pior que nao ver.
		const guarda = paperView
			.split('\n')
			.find((l) => l.includes('if (!isHubOwner && !isHubVice'));

		expect(guarda).toBeDefined();
		expect(guarda).toContain('!isPlatformAdmin');
	});

	it('resolve o papel no servidor e nao libera as correcoes', () => {
		expect(paperView).toContain('const isPlatformAdmin = await isSuperAdmin(locals.user)');

		// `canViewCorrections` e capacidade editorial, nao visibilidade.
		const linha = paperView.split('\n').find((l) => l.includes('canViewCorrections:'));
		expect(linha).toBeDefined();
		expect(linha).not.toContain('isPlatformAdmin');
	});
});
