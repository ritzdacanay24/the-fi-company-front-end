const nodemailer = require('nodemailer');
const { SESClient } = require('@aws-sdk/client-ses');
const awsSes = require('@aws-sdk/client-ses');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function buildTransport(mailTransport) {
  if (mailTransport === 'sendmail') {
    return nodemailer.createTransport({
      sendmail: true,
      path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail',
      newline: process.env.SENDMAIL_NEWLINE || 'unix',
    });
  }

  if (mailTransport === 'ses') {
    const region = String(process.env.AWS_SES_REGION || process.env.AWS_REGION || '').trim();
    if (!region) {
      throw new Error('Missing AWS_SES_REGION (or AWS_REGION) for MAIL_TRANSPORT=ses');
    }

    const accessKeyId = String(process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = String(process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '').trim();

    const sesClient = new SESClient({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    return nodemailer.createTransport({
      SES: { ses: sesClient, aws: awsSes },
    });
  }

  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 25);
  const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPassword = String(process.env.SMTP_PASSWORD || '').trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: smtpUser && smtpPassword ? { user: smtpUser, pass: smtpPassword } : undefined,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 10000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000),
  });
}

function printUsage() {
  console.log('Usage: node scripts/test-email.js --to <email> [--subject <subject>] [--text <message>]');
  console.log('Env used: MAIL_TRANSPORT (smtp|sendmail|ses), MAIL_FROM, and transport-specific vars.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printUsage();
    return;
  }

  const to = String(args.to || process.env.TEST_EMAIL_TO || '').trim();
  if (!to) {
    printUsage();
    throw new Error('Missing recipient. Provide --to or TEST_EMAIL_TO.');
  }

  const subject = String(args.subject || 'SES Test Email from modern backend').trim();
  const text = String(args.text || 'Test email sent successfully.').trim();
  const from = String(process.env.MAIL_FROM || '').trim();
  if (!from) {
    throw new Error('Missing MAIL_FROM.');
  }

  const mailTransport = String(process.env.MAIL_TRANSPORT || 'smtp').trim().toLowerCase();
  const transporter = buildTransport(mailTransport);

  const startedAt = Date.now();
  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });

  console.log('Email sent successfully');
  console.log(`transport=${mailTransport}`);
  console.log(`to=${to}`);
  console.log(`messageId=${info && info.messageId ? info.messageId : '(n/a)'}`);
  console.log(`durationMs=${Date.now() - startedAt}`);
}

main().catch((err) => {
  console.error('Failed to send test email');
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
