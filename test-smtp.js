const nodemailer = require('nodemailer');

// COPY THESE EXACT VALUES FROM BREVO DASHBOARD
const BREVO_SMTP_HOST = 'smtp-relay.brevo.com';
const BREVO_SMTP_PORT = 587;
const BREVO_SMTP_LOGIN = '9bc325001@smtp-brevo.com'; // Copy from Brevo dashboard
const BREVO_SMTP_KEY = 'xsmtpsib-b5d4745af8924f04435a577484e25832c83a15c6663581d9edceb05232492f32-Cdn5uclnXlhjocEi';    // Your new SMTP key
// xsmtpsib-b5d4745af8924f04435a577484e25832c83a15c6663581d9edceb05232492f32-Cdn5uclnXlhjocEi
console.log('Testing with:');
console.log('Host:', BREVO_SMTP_HOST);
console.log('Port:', BREVO_SMTP_PORT);
console.log('Login:', BREVO_SMTP_LOGIN);
console.log('Key:', BREVO_SMTP_KEY.substring(0, 20) + '...\n');

const transporter = nodemailer.createTransport({
  host: BREVO_SMTP_HOST,
  port: BREVO_SMTP_PORT,
  secure: false,
  auth: {
    user: BREVO_SMTP_LOGIN,
    pass: BREVO_SMTP_KEY,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true, // Enable debug output
  logger: true, // Enable logging
});

transporter.verify((error, success) => {
  if (error) {
    console.log('\n❌ Connection failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Go to Brevo → SMTP & API');
    console.log('2. Delete all existing SMTP keys');
    console.log('3. Create a NEW SMTP key');
    console.log('4. Copy the ENTIRE key (starts with xsmtpsib-)');
    console.log('5. Make sure Login matches what Brevo shows');
  } else {
    console.log('\n✅ Connection successful! Server is ready.');
    
    // Try sending a test email
    transporter.sendMail({
      from: '"Test" <mail66838vs@gmail.com>',
      to: 'mail66838vs@gmail.com',
      subject: 'Test from Node',
      text: 'If you receive this, SMTP is working!',
    }, (err, info) => {
      if (err) {
        console.log('❌ Send failed:', err.message);
      } else {
        console.log('✅ Email sent:', info.messageId);
      }
    });
  }
});