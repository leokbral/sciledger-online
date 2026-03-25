/**
 * EXEMPLO DE INTEGRAÇÃO: Captura de Pagamento na Aprovação de Publicação
 * 
 * Este arquivo mostra como integrar a captura de pagamento no seu fluxo de publicação.
 * Copie e adapte as funções para seu código existente.
 */

// Exemplo 1: Na sua página de aprovação de publicação
// (Baseado no arquivo: src/routes/(app)/publish/negotiation/[slug]/+page.svelte)

async function approvePublicationWithPaymentCapture(paperId: string, email: string) {
  if (!paperId) return;

  const isApprovingPublication = true;
  let approvePublicationError = '';

  try {
    // Step 1: Capturar o bloqueio de pagamento
    console.log('Capturing payment hold...');
    
    const captureRes = await fetch('/api/stripe/payment-hold-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId })
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      approvePublicationError = 
        captureData.error || 'Failed to capture payment';
      console.error('Capture failed:', captureData);
      
      // Não impedir aprovação se pagamento falhar (opcional)
      // throw new Error(approvePublicationError);
      alert(`⚠️ Payment capture warning: ${approvePublicationError}`);
    } else {
      console.log('✅ Payment captured successfully', captureData);
      
      // Enviar email de confirmação ao autor
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Publication Approved - Payment Charged',
          template: 'publication_approved_charged',
          data: {
            paperId,
            amount: (captureData.amount / 100).toFixed(2),
            currency: captureData.currency.toUpperCase(),
            receiptUrl: captureData.receiptUrl,
            capturedAt: captureData.capturedAt
          }
        })
      }).catch(emailErr => {
        console.warn('Failed to send confirmation email:', emailErr);
        // Não falhar se email não for enviado
      });
    }

    // Step 2: Aprovar a publicação (seu fluxo existente)
    const resp = await fetch(`/api/papers/${paperId}/approve-publication`, {
      method: 'POST'
    });

    const result = await resp.json();

    if (!resp.ok) {
      approvePublicationError = result.error || 'Failed to approve publication';
      console.error('Publication approval failed:', result);
      return;
    }

    // Step 3: Sucesso - redirecionar
    console.log('✅ Publication approved and payment charged');
    // await goto(`/publish/published/${paperId}`);

  } catch (error) {
    console.error('Error approving publication:', error);
    approvePublicationError = error instanceof Error 
      ? error.message 
      : 'Network error. Please try again.';
  } finally {
    // isApprovingPublication = false;
  }

  return { success: !approvePublicationError, error: approvePublicationError };
}

// Exemplo 2: Na sua página onde você rejeita papers
// (Durante a revisão ou após decisão de rejeição)

async function rejectPaperWithPaymentRelease(
  paperId: string,
  rejectionReason: string,
  email: string
) {
  const isRejectingPaper = true;
  let rejectError = '';

  try {
    // Step 1: Liberar o bloqueio de pagamento
    console.log('Releasing payment hold...');

    const releaseRes = await fetch('/api/stripe/payment-hold-release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId,
        reason: rejectionReason || 'Paper rejected after review'
      })
    });

    const releaseData = await releaseRes.json();

    if (!releaseRes.ok) {
      rejectError = releaseData.error || 'Failed to release payment hold';
      console.error('Release failed:', releaseData);
      alert(`⚠️ Payment release warning: ${rejectError}`);
    } else {
      console.log('✅ Payment hold released', releaseData);

      // Enviar email informando rejeição (sem cobrança)
      await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Paper Review Result - Not Accepted',
          template: 'paper_rejected_no_charge',
          data: {
            paperId,
            reason: rejectionReason,
            note: 'The payment hold has been released. No charge will be made.'
          }
        })
      }).catch(emailErr => {
        console.warn('Failed to send rejection email:', emailErr);
      });
    }

    // Step 2: Atualizar status do paper (seu fluxo existente)
    const rejectRes = await fetch(`/api/papers/${paperId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectionReason })
    });

    const result = await rejectRes.json();

    if (!rejectRes.ok) {
      rejectError = result.error || 'Failed to reject paper';
      return;
    }

    console.log('✅ Paper rejected and payment hold released');

  } catch (error) {
    console.error('Error rejecting paper:', error);
    rejectError = error instanceof Error ? error.message : 'Network error';
  }

  return { success: !rejectError, error: rejectError };
}

// Exemplo 3: Componente Svelte para confirmar ação com captura de pagamento

export const PaymentCaptureButton = `
<script lang="ts">
  import Icon from '@iconify/svelte';

  export let paperId: string;
  export let authorEmail: string;
  export let isLoading = false;
  export let error = '';

  async function handleApproveWithPayment() {
    isLoading = true;
    error = '';

    try {
      // Call your approval function
      const result = await approvePublicationWithPaymentCapture(paperId, authorEmail);
      
      if (!result.success) {
        error = result.error;
        return;
      }

      // Show success message
      alert('✅ Publication approved! Payment of R$ 50.00 has been charged.');
      // Redirect or update UI as needed
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="mb-4 rounded-lg border-l-4 border-green-500 bg-green-50 p-4">
  <div class="text-sm text-green-900">
    <strong>Publication Approval with Payment Capture</strong>
    <p class="mt-1">
      Approving this paper will charge the author R$ 50.00 and set the paper status to <b>published</b>.
    </p>
    <div class="mt-3 flex items-center gap-3">
      <button
        class="btn preset-filled-green-500"
        disabled={isLoading}
        onclick={handleApproveWithPayment}
      >
        {#if isLoading}
          <span class="flex items-center gap-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing Payment...
          </span>
        {:else}
          <Icon icon="mdi:check-circle" class="w-5 h-5" />
          Approve & Charge Payment
        {/if}
      </button>
      {#if error}
        <span class="text-red-600 text-sm font-semibold">{error}</span>
      {/if}
    </div>
  </div>
</div>
`;

// Exemplo 4: Verificar status do bloqueio de pagamento

async function checkPaymentHoldStatus(paperId: string) {
  try {
    const res = await fetch(
      \`/api/stripe/payment-hold-capture?paperId=\${paperId}\`
    );

    if (!res.ok) {
      console.error('Failed to check payment status');
      return null;
    }

    const data = await res.json();
    
    return {
      status: data.paymentHold.status,
      amount: data.paymentHold.amount,
      currency: data.paymentHold.currency,
      authorizedAt: data.paymentHold.authorizedAt,
      capturedAt: data.paymentHold.capturedAt,
      releasedAt: data.paymentHold.releasedAt,
      // Display helpers
      displayAmount: \`R$ \${(data.paymentHold.amount / 100).toFixed(2)}\`,
      isCaptured: data.paymentHold.status === 'captured',
      isReleased: data.paymentHold.status === 'released',
      isAuthorized: data.paymentHold.status === 'authorized'
    };
  } catch (error) {
    console.error('Error checking payment status:', error);
    return null;
  }
}

// Exemplo 5: Template de email para confirmação de pagamento

export const EmailTemplates = {
  publicationApprovedCharged: {
    subject: 'Your Paper Has Been Published - Payment Processed',
    html: \`
      <h2>Publication Approved! 🎉</h2>
      <p>Your paper has been approved for publication.</p>
      
      <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Information</h3>
        <p><strong>Amount Charged:</strong> R$ {{amount}}</p>
        <p><strong>Date:</strong> {{capturedAt}}</p>
        <p><strong>Status:</strong> Complete</p>
        {{#if receiptUrl}}
          <p><a href="{{receiptUrl}}">View Receipt</a></p>
        {{/if}}
      </div>
      
      <p>Thank you for publishing with us!</p>
    \`
  },

  paperRejectedNoCharge: {
    subject: 'Paper Review Results - No Charge Applied',
    html: \`
      <h2>Paper Review Complete</h2>
      <p>Thank you for your submission. After review, your paper was not accepted at this time.</p>
      
      <div style="background-color: #fef3c7; border-left: 4px solid #eab308; padding: 16px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Payment Information</h3>
        <p>✅ <strong>No Charge</strong> - The payment hold has been released.</p>
        <p>You will not be charged for this submission.</p>
      </div>
      
      <p><strong>Feedback:</strong></p>
      <p>{{reason}}</p>
      
      <p>We encourage you to revise your paper and resubmit in the future.</p>
    \`
  }
};

export default {
  approvePublicationWithPaymentCapture,
  rejectPaperWithPaymentRelease,
  checkPaymentHoldStatus
};
