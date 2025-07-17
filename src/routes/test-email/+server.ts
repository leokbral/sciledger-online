import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        console.log('🧪 Iniciando teste de email...');
        
        // Importar dinamicamente para ver erros de import
        const { sendEmail } = await import('$lib/utils/emailService');
        
        const { to } = await request.json();
        
        if (!to) {
            return json({ error: 'Email é obrigatório' }, { status: 400 });
        }

        console.log('📧 Enviando email de teste para:', to);

        const result = await sendEmail({
            to,
            subject: 'Teste de Email - SciLedger',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #7e0cf5;">🧪 Teste de Email</h1>
                    <p>Este é um email de teste para verificar a configuração do Nodemailer.</p>
                    <p><strong>Enviado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0;">
                        <p style="color: #1565c0; margin: 0;">✅ Se você recebeu este email, a configuração está funcionando corretamente!</p>
                    </div>
                </div>
            `,
        });

        console.log('✅ Email de teste enviado com sucesso:', result);
        return json({ success: true, result });

    } catch (error) {
        console.error('❌ Erro no teste de email:', error);
        return json({ 
            error: typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error),
            details: {
                name: typeof error === 'object' && error !== null && 'name' in error ? (error as { name: string }).name : undefined,
                stack: typeof error === 'object' && error !== null && 'stack' in error ? (error as { stack: string }).stack : undefined
            }
        }, { status: 500 });
    }
};