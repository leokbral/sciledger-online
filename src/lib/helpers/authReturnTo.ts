/** Only accept local paths, including when the browser normalizes the URL. */
export function safeReturnTo(value: string | null | undefined): string {
	if (!value || !value.startsWith('/') || /[\\\u0000-\u0020]/.test(value)) return '/';
	try {
		const url = new URL(value, 'https://sciledger.local');
		if (url.origin !== 'https://sciledger.local') return '/';
		return `${url.pathname}${url.search}${url.hash}`;
	} catch {
		return '/';
	}
}

export function hubSubmissionHref(id: string): string {
	return `/publish/new?${new URLSearchParams({ hubId: id })}`;
}

export function hubSubmissionLoginHref(id: string): string {
	return `/login?${new URLSearchParams({ returnTo: hubSubmissionHref(id), from: 'hub-submission' })}`;
}

export function hubLoginReturnTo(params: URLSearchParams): string {
	if (params.get('from') !== 'hub-submission') return '/';
	const destination = new URL(safeReturnTo(params.get('returnTo')), 'https://sciledger.local');
	const hubId = destination.searchParams.get('hubId');
	if (
		destination.pathname !== '/publish/new' ||
		destination.hash ||
		!hubId ||
		[...destination.searchParams.keys()].length !== 1
	)
		return '/';
	return hubSubmissionHref(hubId);
}
