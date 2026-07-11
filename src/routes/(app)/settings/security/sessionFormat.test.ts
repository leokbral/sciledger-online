import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './sessionFormat';

describe('parseUserAgent', () => {
	it('returns Unknown for an empty user agent', () => {
		expect(parseUserAgent('')).toEqual({ browser: 'Unknown browser', os: 'Unknown OS' });
	});

	it('identifies Chrome on Windows', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Chrome', os: 'Windows' });
	});

	it('identifies Safari on macOS', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Safari', os: 'macOS' });
	});

	it('identifies Firefox on Linux', () => {
		const ua = 'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Firefox', os: 'Linux' });
	});

	it('identifies Edge on Windows (does not misclassify as Chrome)', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Edge', os: 'Windows' });
	});

	it('identifies Mobile Safari on iOS', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
		expect(parseUserAgent(ua)).toEqual({ browser: 'Safari', os: 'iOS' });
	});
});
