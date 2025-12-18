import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    debug: true,
    logger: true
});

async function testEmail() {
    try {
        console.log('Verificando conexão...');
        await transporter.verify();
        console.log('✅ Conexão OK');

        console.log('Enviando email de teste...');
        const info = await transporter.sendMail({
            from: `"SciLedger Team" <${process.env.SMTP_USER}>`,
            to: 'your-email@example.com', // Replace with your email
            subject: 'Teste Nodemailer',
            html: '<h1>Teste funcionando!</h1><p>Email enviado com sucesso.</p>'
        });

        console.log('✅ Email enviado:', info.messageId);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testEmail();
