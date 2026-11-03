import { generatePrescriptionPDF } from './pdfGenerator.js';

export const sendPrescriptionEmail = async (rx, { isResend = false } = {}) => {
  if (!rx?.patientEmail) throw new Error('Patient email address is missing.');

  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error('Email is not configured. Set EMAIL_USER and EMAIL_PASS in server/.env');
  }

  const pdfBuffer = await generatePrescriptionPDF(rx);
  const { default: nodemailer } = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color:#0e2a47;margin-bottom:4px;">DentoCare Dental Clinic</h2>
      <h3 style="color:#3ec1d3;margin-top:0;">${isResend ? 'Your Prescription (Re-sent)' : 'Your Digital Prescription is Ready'}</h3>
      <p>Dear <strong>${rx.patientName}</strong>,</p>
      <p>Your prescription (Ref: <strong>${rx.prescriptionNumber}</strong>) issued by <strong>${rx.doctorName}</strong> is attached as a PDF.</p>
      <div style="background:#f8fafc;padding:14px;border-left:4px solid #3ec1d3;border-radius:4px;">
        <p style="margin:0 0 6px;"><strong>Diagnosis:</strong> ${rx.diagnosis}</p>
        <p style="margin:0;"><strong>Advice:</strong> ${rx.generalAdvice || 'As directed'}</p>
      </div>
    </div>`;

  await transporter.sendMail({
    from: `"DentoCare Clinic" <${user}>`,
    to: rx.patientEmail,
    subject: `Prescription ${isResend ? '(Re-sent) ' : ''}(${rx.prescriptionNumber}) - DentoCare Clinic`,
    html,
    attachments: [{
      filename: `Prescription_${rx.prescriptionNumber}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
  return true;
};