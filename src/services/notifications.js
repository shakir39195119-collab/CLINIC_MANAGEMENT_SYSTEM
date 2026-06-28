import nodemailer from "nodemailer";

function configuredTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendEmail({ to, subject, text }) {
  const transport = configuredTransport();
  if (!transport) {
    console.log(`[email:demo] To: ${to} | ${subject} | ${text}`);
    return { provider: "console", status: "queued" };
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || "MediCore Clinic <no-reply@example.com>",
    to,
    subject,
    text
  });
  return { provider: "smtp", status: "sent" };
}

export async function sendSms({ to, body }) {
  if (!process.env.SMS_PROVIDER_API_KEY) {
    console.log(`[sms:demo] To: ${to} | ${body}`);
    return { provider: "console", status: "queued" };
  }

  return { provider: "custom", status: "queued" };
}
