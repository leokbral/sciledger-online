import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: 'snackonapp@gmail.com',
        pass: 'foriuquhhkipihfv' // Sua senha de app
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
            from: '"SciLedger Team" <snackonapp@gmail.com>',
            to: 'mixim94561@pacfut.com', // Coloque seu email aqui
            subject: 'Teste Nodemailer',
            html: '<h1>Teste funcionando!</h1><p>Email enviado com sucesso.</p>'
        });

        console.log('✅ Email enviado:', info.messageId);
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

testEmail();
