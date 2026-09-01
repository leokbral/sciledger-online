import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(fileURLToPath(new URL('./+page.svelte', import.meta.url)), 'utf8');

describe('paper payment page', () => {
	it('uses Stripe Payment Element instead of the legacy split Card Elements', () => {
		expect(pageSource).toContain("elements.create('payment'");
		expect(pageSource).toContain("stripe.confirmPayment");
		expect(pageSource).not.toContain("confirmCardPayment");
		expect(pageSource).not.toContain("cardNumber");
		expect(pageSource).not.toContain("cardExpiry");
		expect(pageSource).not.toContain("cardCvc");
	});

	it('collects billing details with Stripe elements and keeps backend reconciliation', () => {
		expect(pageSource).toContain("elements.create('address'");
		expect(pageSource).toContain("mode: 'billing'");
		expect(pageSource).toContain('/api/stripe/payment-hold');
		expect(pageSource).toContain('/update-payment-auth');
		expect(pageSource).toContain("paymentState !== 'captured'");
	});

	it('requires explicit payment policy acceptance before creating a PaymentIntent', () => {
		expect(pageSource).toContain('acceptPaymentPolicy: paymentPolicyAccepted');
		expect(pageSource).toContain('Li e aceito as regras de pagamento aplicaveis a este Paper.');
		expect(pageSource).toContain('!paymentPolicyAccepted');
	});
});
