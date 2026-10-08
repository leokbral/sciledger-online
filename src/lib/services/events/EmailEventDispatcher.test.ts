import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	sendMail: vi.fn(),
	findOne: vi.fn(),
	getEventEmailTemplate: vi.fn()
}));

vi.mock('nodemailer', () => ({
	default: {
		createTransport: vi.fn(() => ({ sendMail: mocks.sendMail }))
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		SMTP_USER: 'noreply@sciledger.online',
		SMTP_PASS: 'smtp-password'
	}
}));

vi.mock('$lib/db/models/User', () => ({
	default: {
		findOne: mocks.findOne
	}
}));

vi.mock('./templates', () => ({
	getEventEmailTemplate: mocks.getEventEmailTemplate
}));

/**
 * `Users.findOne(...).select(...).lean()` resolvido por id do destinatario.
 */
function mockUsersByEmail(emailsByUserId: Record<string, string | undefined>) {
	mocks.findOne.mockImplementation((query: any) => {
		const id = query?.$or?.[0]?.id;
		const email = emailsByUserId[id];
		return {
			select: vi.fn().mockReturnValue({
				lean: vi.fn().mockResolvedValue(email === undefined ? null : { id, email })
			})
		};
	});
}

function eventWith(userIds: string[]) {
	return {
		type: 'review.invitation.created',
		recipients: userIds.map((userId) => ({ userId, channels: ['email'] }))
	} as any;
}

async function dispatch(event: any) {
	const { EmailEventDispatcher } = await import('./EmailEventDispatcher');
	return new EmailEventDispatcher().dispatch({ event });
}

describe('EmailEventDispatcher per-recipient isolation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// `clearAllMocks` NAO drena a fila de `mockXOnce`. Sem este reset, um
		// `mockRejectedValueOnce` que o teste anterior nao consumiu (porque o
		// dispatch lancou antes de chegar nele) vaza para o teste seguinte e
		// torna a suite dependente de ordem.
		mocks.sendMail.mockReset();
		mocks.sendMail.mockResolvedValue(undefined);
		mocks.getEventEmailTemplate.mockReturnValue(
			vi.fn().mockResolvedValue({ subject: 'Subject', text: 'Text', html: '<p>Html</p>' })
		);
	});

	it('skips an ORCID placeholder address without blocking the remaining recipients', async () => {
		mockUsersByEmail({
			'user-placeholder': '0000-0001-0002-0003@orcid.placeholder',
			'user-real': 'ada@example.com'
		});

		const results = await dispatch(eventWith(['user-placeholder', 'user-real']));

		// O destinatario real recebe, apesar de vir DEPOIS do placeholder.
		expect(results).toEqual([
			{
				channel: 'email',
				status: 'skipped',
				recipientId: 'user-placeholder',
				reason: 'recipient_email_undeliverable'
			},
			{ channel: 'email', status: 'sent', recipientId: 'user-real' }
		]);
		expect(mocks.sendMail).toHaveBeenCalledTimes(1);
		expect(mocks.sendMail).toHaveBeenCalledWith(
			expect.objectContaining({ to: 'ada@example.com' })
		);
	});

	it('records the skip reason and never attempts SMTP for an undeliverable address', async () => {
		mockUsersByEmail({ 'user-placeholder': '0000-0001-0002-0003@orcid.placeholder' });

		const results = await dispatch(eventWith(['user-placeholder']));

		expect(results).toEqual([
			{
				channel: 'email',
				status: 'skipped',
				recipientId: 'user-placeholder',
				reason: 'recipient_email_undeliverable'
			}
		]);
		expect(mocks.sendMail).not.toHaveBeenCalled();
	});

	it('matches the placeholder domain regardless of casing or surrounding whitespace', async () => {
		mockUsersByEmail({ 'user-legacy': '  0000-0001-0002-0003@ORCID.Placeholder  ' });

		const results = await dispatch(eventWith(['user-legacy']));

		expect(results[0].reason).toBe('recipient_email_undeliverable');
		expect(mocks.sendMail).not.toHaveBeenCalled();
	});

	it('records a failed send and keeps going instead of aborting the event', async () => {
		mockUsersByEmail({
			'user-bad': 'bounces@example.invalid',
			'user-good': 'ada@example.com'
		});
		mocks.sendMail
			.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND example.invalid'))
			.mockResolvedValueOnce(undefined);

		const results = await dispatch(eventWith(['user-bad', 'user-good']));

		// Antes do try/catch, o throw abortava o loop e 'user-good' ficava sem
		// e-mail e sem nenhum registro.
		expect(results).toEqual([
			{
				channel: 'email',
				status: 'failed',
				recipientId: 'user-bad',
				error: 'getaddrinfo ENOTFOUND example.invalid'
			},
			{ channel: 'email', status: 'sent', recipientId: 'user-good' }
		]);
		expect(mocks.sendMail).toHaveBeenCalledTimes(2);
	});

	it('stringifies a non-Error rejection rather than losing the reason', async () => {
		mockUsersByEmail({ 'user-bad': 'bounces@example.invalid' });
		mocks.sendMail.mockRejectedValueOnce('smtp exploded');

		const results = await dispatch(eventWith(['user-bad']));

		expect(results[0]).toEqual({
			channel: 'email',
			status: 'failed',
			recipientId: 'user-bad',
			error: 'smtp exploded'
		});
	});

	it('still reports a real address with no user record as not found', async () => {
		mockUsersByEmail({ 'user-missing': undefined, 'user-real': 'ada@example.com' });

		const results = await dispatch(eventWith(['user-missing', 'user-real']));

		expect(results[0]).toEqual({
			channel: 'email',
			status: 'skipped',
			recipientId: 'user-missing',
			reason: 'recipient_email_not_found'
		});
		expect(results[1].status).toBe('sent');
	});
});
