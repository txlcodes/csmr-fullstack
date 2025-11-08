require('dotenv').config();
const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

if (!emailUser || !emailPass) {
    console.error('❌ Error: EMAIL_USER or EMAIL_PASS not found in .env file');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass.replace(/\s/g, '') // Remove spaces
    }
});

// Get recipient email from command line or use a test email
const recipientEmail = process.argv[2] || emailUser; // Default to sender's email

console.log('📧 Sending test email...\n');
console.log('From:', emailUser);
console.log('To:', recipientEmail);
console.log('');

const mailOptions = {
    from: `"CSMR Test" <${emailUser}>`,
    to: recipientEmail,
    subject: 'Test Email from CSMR Platform',
    html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ Email Test Successful!</h2>
            <p>This is a test email from your CSMR Platform.</p>
            <p>If you received this, your email configuration is working correctly!</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
                Sent at: ${new Date().toLocaleString()}
            </p>
        </div>
    `
};

transporter.sendMail(mailOptions, function(error, info) {
    if (error) {
        console.error('❌ Error sending email:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check your internet connection');
        console.log('2. Verify the recipient email address is correct');
        console.log('3. Make sure Gmail App Password is correct');
        process.exit(1);
    } else {
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('\n📬 Check your inbox (and spam folder) for the test email.');
        console.log('\nUsage: node test-email-send.js [recipient@email.com]');
    }
});

