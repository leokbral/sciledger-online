import { beforeEach, describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';

const mocks = vi.hoisted(() => ({
	findPaper: vi.fn(),
	updatePaper: vi.fn(),
	upload: vi.fn(),
	guard: vi.fn(),
	audit: vi.fn(),
	launch: vi.fn(),
	setContent: vi.fn(),
	evaluate: vi.fn(),
	pdf: vi.fn(),
	close: vi.fn()
}));

vi.mock('$lib/db/mongo', () => ({
	db: {
		collection: (name: string) =>
			name === 'papers'
				? { findOne: mocks.findPaper, updateOne: mocks.updatePaper }
				: { findOne: vi.fn().mockResolvedValue(null) }
	}
}));
vi.mock('$lib/db/fs', () => ({ fsFiles: { findOne: vi.fn() } }));
vi.mock('mongodb', async (importOriginal) => ({
	...(await importOriginal<typeof import('mongodb')>()),
	GridFSBucket: class {
		openUploadStream = mocks.upload;
	}
}));
vi.mock('$lib/server/authorization/superAdmin', () => ({ requireSuperAdmin: mocks.guard }));
vi.mock('$lib/server/authorization/adminAudit', () => ({ recordAdminAuditEvent: mocks.audit }));
vi.mock('playwright', () => ({ chromium: { launch: mocks.launch } }));

const createEvent = () =>
	({
		params: { paperId: 'paper-1' },
		locals: { user: { id: 'super-1' } },
		url: new URL('http://localhost/api/pdfs/generate/paper-1')
	}) as any;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.guard.mockResolvedValue({ id: 'super-1' });
	mocks.findPaper.mockResolvedValue({
		id: 'paper-1',
		status: 'draft',
		title: 'Test manuscript',
		content: '<p>Review content</p>',
		pdfUrl: 'existing-pdf'
	});
	mocks.pdf.mockResolvedValue(Buffer.from('%PDF-1.7 preview'));
	mocks.launch.mockResolvedValue({
		newPage: vi.fn().mockResolvedValue({
			setContent: mocks.setContent,
			evaluate: mocks.evaluate,
			waitForTimeout: vi.fn(),
			emulateMedia: vi.fn(),
			pdf: mocks.pdf
		}),
		close: mocks.close
	});
});

describe('GET reviewer PDF preview', () => {
	it('uses the reviewer renderer and never uploads or replaces the stored PDF', async () => {
		const { GET } = await import('./+server');
		const response = await GET(createEvent());
		expect(response.headers.get('Content-Type')).toBe('application/pdf');
		expect(response.headers.get('Cache-Control')).toContain('no-store');
		expect(await response.text()).toBe('%PDF-1.7 preview');
		const html = mocks.setContent.mock.calls[0][0];
		expect(html).toContain('Test manuscript');
		expect(html).toContain('Review content');
		expect(html).toContain('In Review');
		expect(mocks.evaluate).toHaveBeenCalled();
		expect(mocks.close).toHaveBeenCalled();
		expect(mocks.upload).not.toHaveBeenCalled();
		expect(mocks.updatePaper).not.toHaveBeenCalled();
		expect(mocks.audit).toHaveBeenCalled();
	});

	it.each([401, 403])(
		'rejects unauthorized access (%s) before reading the paper',
		async (status) => {
			mocks.guard.mockImplementation(async () => {
				error(status);
			});
			const { GET } = await import('./+server');
			await expect(GET(createEvent())).rejects.toMatchObject({ status });
			expect(mocks.findPaper).not.toHaveBeenCalled();
			expect(mocks.pdf).not.toHaveBeenCalled();
		}
	);

	it('returns 404 for a missing paper', async () => {
		mocks.findPaper.mockResolvedValue(null);
		const { GET } = await import('./+server');
		expect((await GET(createEvent())).status).toBe(404);
		expect(mocks.pdf).not.toHaveBeenCalled();
	});

	it('renders a valid PDF using real Chromium', async () => {
		const { chromium } = await vi.importActual<typeof import('playwright')>('playwright');
		mocks.launch.mockImplementation((options) => chromium.launch(options));
		const { GET } = await import('./+server');
		const response = await GET(createEvent());
		const pdf = Buffer.from(await response.arrayBuffer());
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
		expect(pdf.length).toBeGreaterThan(1000);
		expect(mocks.updatePaper).not.toHaveBeenCalled();
	}, 30_000);
});
