import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(here, '+page.svelte'), 'utf8');

/**
 * Contas ORCID sem e-mail publico ficam com um placeholder nao entregavel.
 * Elas entram pelo ORCID, mas nenhum e-mail da plataforma as alcanca --
 * inclusive /recovery, que e o unico caminho para definir a senha aleatoria
 * que o callback gerou. Sem um aviso, o usuario nao tem como saber que a
 * conta depende exclusivamente do ORCID. Estes asserts travam o aviso.
 */
describe('settings/account placeholder-email warning', () => {
	it('derives the placeholder state from the shared helper, not its own copy', () => {
		expect(pageSource).toContain("from '$lib/helpers/orcidPlaceholderEmail'");
		expect(pageSource).toContain('isOrcidPlaceholderEmail(data.user.email)');
		expect(pageSource).not.toContain("'@orcid.placeholder'");
	});

	it('warns that the account depends on ORCID and that recovery cannot reach it', () => {
		expect(pageSource).toContain('hasPlaceholderEmail');
		expect(pageSource).toMatch(/only sign in through ORCID/i);
		expect(pageSource).toMatch(/password recovery/i);
	});

	it('hides the unusable placeholder address instead of displaying it as contact', () => {
		expect(pageSource).toMatch(/No email address/i);
	});

	it('still offers the change-email flow as the remedy', () => {
		// O aviso so e acionavel porque o botao continua alcancavel para estas
		// contas -- /api/account/email-change nao as bloqueia.
		expect(pageSource).toContain('openChangeEmailModal');
		expect(pageSource).toContain('Change Email');
	});

	it('uses the warning palette the rest of the codebase uses', () => {
		// Tokens `warning-*` do Skeleton nao estao gerados neste projeto; o
		// padrao real para blocos de aviso e amber do Tailwind. Uma classe
		// inexistente nao renderiza nada e falharia em silencio.
		expect(pageSource).toContain('bg-amber-50');
		expect(pageSource).not.toMatch(/bg-warning-\d/);
	});
});
