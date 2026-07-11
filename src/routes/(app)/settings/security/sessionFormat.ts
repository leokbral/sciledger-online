// Small, dependency-free User-Agent parsing for display purposes only -- this
// never drives any security decision, it just labels a session card.
export function parseUserAgent(userAgent: string): { browser: string; os: string } {
	if (!userAgent) {
		return { browser: 'Unknown browser', os: 'Unknown OS' };
	}

	let browser = 'Unknown browser';
	if (/Edg\//.test(userAgent)) browser = 'Edge';
	else if (/OPR\//.test(userAgent)) browser = 'Opera';
	else if (/Firefox\//.test(userAgent)) browser = 'Firefox';
	else if (/Chrome\//.test(userAgent) && !/Chromium/.test(userAgent)) browser = 'Chrome';
	else if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) browser = 'Safari';

	let os = 'Unknown OS';
	if (/Windows NT/.test(userAgent)) os = 'Windows';
	else if (/iPhone|iPad|iPod/.test(userAgent)) os = 'iOS';
	else if (/Mac OS X/.test(userAgent)) os = 'macOS';
	else if (/Android/.test(userAgent)) os = 'Android';
	else if (/Linux/.test(userAgent)) os = 'Linux';

	return { browser, os };
}

export function formatDateTime(value: string | Date): string {
	return new Date(value).toLocaleString();
}
