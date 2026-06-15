import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderConfirmation(
  to: string,
  orderId: string,
  total: number,
  currency: string
) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: `Order Confirmed — #${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Your order is confirmed!</h2>
      <p>Order ID: <strong>${orderId}</strong></p>
      <p>Total: <strong>${currency} ${total}</strong></p>
      <p>We'll notify you when your order ships.</p>
    `,
  });
}

export async function sendPasswordReset(to: string, resetUrl: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: "Reset your VTryon password",
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}">Reset Password</a>
    `,
  });
}
