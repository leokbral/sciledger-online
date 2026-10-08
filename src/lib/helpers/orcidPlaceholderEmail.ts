/**
 * Fonte unica de verdade para o endereco de e-mail placeholder do ORCID.
 *
 * Contas criadas pelo login ORCID sem e-mail publico nao tem endereco algum
 * para armazenar, e o schema exige um. O callback grava um placeholder
 * deterministico `<orcid>@orcid.placeholder`. Esse dominio nao existe: a
 * resolucao MX falha, entao qualquer envio para ele lanca de forma sincrona.
 *
 * Todo ponto que precise construir ou reconhecer esses enderecos deve usar
 * este modulo em vez de repetir a string -- antes desta extracao havia quatro
 * copias com tres semanticas diferentes (`includes`, `endsWith` e concatenacao
 * literal), e `includes` classificava um endereco real em um subdominio como
 * `bob@orcid.placeholder.com` como se fosse um placeholder.
 *
 * Mantido em `$lib/helpers` (nao em `$lib/server`) porque
 * /complete-profile o usa no cliente, e SvelteKit proibe importar modulos
 * server-only de um componente.
 */

const ORCID_PLACEHOLDER_EMAIL_DOMAIN = 'orcid.placeholder';

/**
 * Monta o placeholder deterministico de um ORCID iD.
 */
export function buildOrcidPlaceholderEmail(orcid: string): string {
	return `${orcid}@${ORCID_PLACEHOLDER_EMAIL_DOMAIN}`;
}

/**
 * Responde se o endereco e um placeholder do ORCID, portanto nao entregavel.
 *
 * Compara o dominio com `endsWith` (nao `includes`) para nao capturar um
 * endereco real hospedado em um subdominio, e normaliza antes de comparar
 * porque linhas antigas podem ter sido gravadas sem trim/lowercase.
 *
 * Retorna false para qualquer coisa que nao seja string: um usuario SEM
 * e-mail nao tem um placeholder. Quem precisa distinguir "ausente" de "real"
 * deve testar a presenca do campo separadamente.
 */
export function isOrcidPlaceholderEmail(email: unknown): boolean {
	if (typeof email !== 'string') return false;
	return email.trim().toLowerCase().endsWith(`@${ORCID_PLACEHOLDER_EMAIL_DOMAIN}`);
}
