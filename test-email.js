import nodemailer from 'nodemailer';
import 'dotenv/config';

const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const testRecipient = process.env.TEST_EMAIL_TO;

if (!smtpUser || !smtpPass || !testRecipient) {
    throw new Error('Set SMTP_USER, SMTP_PASS, and TEST_EMAIL_TO before running this script.');
}

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
    auth: {
        user: smtpUser,
        pass: smtpPass
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
            from: `"SciLedger Team" <${smtpUser}>`,
            to: testRecipient,
            subject: 'Teste Nodemailer',
            html: '<h1>Teste funcionando!</h1><p>Email enviado com sucesso.</p>'
        });

        console.log('✅ Email enviado:', info.messageId);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testEmail();
