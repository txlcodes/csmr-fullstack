require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('🔍 Testing Email Configuration...\n');

// Check if credentials are loaded
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log('Email User:', emailUser || '❌ NOT SET');
console.log('Email Pass:', emailPass ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('');

if (!emailUser || !emailPass) {
    console.error('❌ Error: EMAIL_USER or EMAIL_PASS not found in .env file');
    console.log('\nMake sure your .env file contains:');
    console.log('EMAIL_USER=your_email@gmail.com');
    console.log('EMAIL_PASS=your_app_password');
    process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass.replace(/\s/g, '') // Remove spaces from password
    }
});

// Test connection
console.log('📧 Testing Gmail connection...\n');

transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ Connection Failed!');
        console.error('Error:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Make sure 2-Factor Authentication is enabled on your Gmail account');
        console.log('2. Generate an App Password at: https://myaccount.google.com/apppasswords');
        console.log('3. Use the App Password (16 characters), not your regular Gmail password');
        console.log('4. Remove spaces from the app password in .env file');
        console.log('5. Make sure .env file is in the project root directory');
        process.exit(1);
    } else {
        console.log('✅ Connection Successful!');
        console.log('✅ Email credentials are correct!');
        console.log('\n📨 Ready to send emails!');
        console.log('\nTo test sending an email, run:');
        console.log('node test-email-send.js');
    }
});

