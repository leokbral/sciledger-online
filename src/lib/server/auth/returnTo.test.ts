import { describe, expect, it, vi } from 'vitest';
import { safeReturnTo, hubSubmissionHref, hubSubmissionLoginHref } from '$lib/helpers/authReturnTo';
import { getAuthReturnTo, AUTH_RETURN_TO_COOKIE, profileReturnTo } from './returnTo';
import { load } from '../../../routes/(auth)/login/+page.server';

vi.mock('$lib/db/models/User', () => ({ default: {} }));
vi.mock('$lib/db/mongooseConnection', () => ({ start_mongo: vi.fn() }));
vi.mock('$env/static/private', () => ({ ORCID_CLIENT_ID: 'test-client' }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));

const target = hubSubmissionHref('hub-123');

function event(query = '', saved?: string, user?: object) {
	const url = new URL(`https://sciledger.online/login${query}`);
	return {
		url,
		request: new Request(url),
		locals: { user },
		cookies: { get: vi.fn(() => saved), set: vi.fn(), delete: vi.fn() }
	};
}

describe('submission continuation after authentication', () => {
	it('uses normal login when a visitor opens the submission page directly', async () => {
		const { load: loadSubmission } = await import('../../../routes/(app)/publish/new/+page.server');
		const url = new URL(target, 'https://sciledger.online');
		await expect(loadSubmission({ locals: {}, url } as any)).rejects.toMatchObject({
			status: 302,
			location: '/login'
		});
	});
	it('retains the selected Hub in the login URL and server data', async () => {
		const url = new URL(hubSubmissionLoginHref('hub-123'), 'https://sciledger.online');
		const input = event(url.search);
		expect(url.searchParams.get('returnTo')).toBe('/publish/new?hubId=hub-123');
		expect(await load(input as any)).toEqual({ returnTo: target });
		expect(url.searchParams.get('from')).toBe('hub-submission');
		expect(input.cookies.set).not.toHaveBeenCalled();
	});

	it('discards a previous Hub destination during normal login', async () => {
		const input = event('', target);
		expect(await load(input as any)).toEqual({ returnTo: '/' });
		expect(input.cookies.delete).toHaveBeenCalledWith(AUTH_RETURN_TO_COOKIE, { path: '/' });
	});

	it('does not apply Hub login redirection to already authenticated visitors', async () => {
		await expect(
			load(
				event(`?returnTo=${encodeURIComponent(target)}&from=hub-submission`, undefined, {
					id: 'user-1'
				}) as any
			)
		).rejects.toMatchObject({ status: 302, location: '/' });
	});

	it.each([
		`?returnTo=${encodeURIComponent(target)}`,
		'?from=hub-submission&returnTo=%2Fpublish%2Fnew',
		'?from=hub-submission&returnTo=%2Fprofile%2Fsomebody',
		'?from=hub-submission&returnTo=https%3A%2F%2Fevil.test'
	])('ignores return destinations outside the Hub submission flow: %s', async (query) => {
		expect(await load(event(query, target) as any)).toEqual({ returnTo: '/' });
	});

	it('starts normal ORCID login without a stale Hub destination', async () => {
		const { GET } = await import('../../../routes/orcid/redirect/+server');
		const input = event('', target);
		await expect(GET(input as any)).rejects.toMatchObject({ status: 302 });
		expect(input.cookies.delete).toHaveBeenCalledWith(AUTH_RETURN_TO_COOKIE, { path: '/' });
		expect(input.cookies.set).not.toHaveBeenCalled();
	});

	it('carries the destination through ORCID only for explicit Hub submission login', async () => {
		const { GET } = await import('../../../routes/orcid/redirect/+server');
		const url = new URL(hubSubmissionLoginHref('hub-123'), 'https://sciledger.online');
		const input = event(url.search);
		await expect(GET(input as any)).rejects.toMatchObject({ status: 302 });
		expect(input.cookies.set).toHaveBeenCalledWith(
			AUTH_RETURN_TO_COOKIE,
			target,
			expect.objectContaining({ httpOnly: true, sameSite: 'lax', secure: true })
		);
	});

	it.each([
		'https://evil.test',
		'//evil.test',
		'/\\evil.test',
		'/\nevil.test',
		'javascript:alert(1)',
		'relative/path'
	])('rejects unsafe return URLs: %s', (value) => {
		expect(safeReturnTo(value)).toBe('/');
	});

	it('keeps the Hub through ORCID cookies and required profile completion', () => {
		const request = new Request('https://sciledger.online/orcid/callback', {
			headers: { cookie: `${AUTH_RETURN_TO_COOKIE}=${encodeURIComponent(target)}` }
		});
		expect(getAuthReturnTo(request)).toBe(target);
		const profile = new URL(profileReturnTo(getAuthReturnTo(request)), 'https://sciledger.online');
		expect(profile.pathname).toBe('/complete-profile');
		expect(profile.searchParams.get('returnTo')).toBe(target);
	});

	it.each([
		'/profile/somebody',
		'/publish/new',
		'/publish/new?hubId=',
		'/publish/new?hubId=hub-123&other=1'
	])('ignores old ORCID return cookies outside the Hub submission flow: %s', (value) => {
		const request = new Request('https://sciledger.online/orcid/callback', {
			headers: { cookie: `${AUTH_RETURN_TO_COOKIE}=${encodeURIComponent(value)}` }
		});
		expect(getAuthReturnTo(request)).toBe('/');
	});
});
