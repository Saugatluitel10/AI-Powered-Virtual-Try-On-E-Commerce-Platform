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

export async function sendOrderStatusUpdate(
  to: string,
  orderId: string,
  status: string
) {
  const statusMessages: Record<string, string> = {
    confirmed: "Your order has been confirmed and is being prepared.",
    processing: "Your order is being processed.",
    shipped: "Your order has been shipped! It's on its way to you.",
    delivered: "Your order has been delivered. Enjoy!",
    cancelled: "Your order has been cancelled.",
    refunded: "Your order has been refunded.",
  };

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: `Order Update — #${orderId.slice(0, 8).toUpperCase()} is now ${status}`,
    html: `
      <h2>Order Status Update</h2>
      <p>Order ID: <strong>${orderId}</strong></p>
      <p>Status: <strong>${status}</strong></p>
      <p>${statusMessages[status] ?? `Your order status has been updated to ${status}.`}</p>
    `,
  });
}

export async function sendReturnRequestUpdate(
  to: string,
  orderId: string,
  status: string
) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: `Return Request ${status === "approved" ? "Approved" : status === "rejected" ? "Rejected" : "Updated"} — #${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Return Request Update</h2>
      <p>Your return request for order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been <strong>${status}</strong>.</p>
      ${status === "approved" ? "<p>Please ship the items back within 7 days. You'll receive a refund once we receive and inspect the items.</p>" : ""}
    `,
  });
}

export async function sendOrderReceipt(
  to: string,
  orderId: string,
  total: number,
  currency: string,
  paymentMethod: string,
  invoiceUrl: string
) {
  const fmtCurrency = currency === "NPR" ? `Rs. ${total.toLocaleString()}` : `${currency} ${total.toFixed(2)}`;
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: `Payment Receipt — #${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Payment Receipt</h2>
      <p>Thank you for your purchase!</p>
      <p>Order ID: <strong>#${orderId.slice(0, 8).toUpperCase()}</strong></p>
      <p>Amount Paid: <strong>${fmtCurrency}</strong></p>
      <p>Payment Method: <strong>${paymentMethod}</strong></p>
      <p><a href="${invoiceUrl}">View Full Invoice</a></p>
    `,
  });
}

export async function sendRefundConfirmation(
  to: string,
  orderId: string,
  refundAmount: number,
  currency: string,
  reason: string
) {
  const fmtCurrency = currency === "NPR" ? `Rs. ${refundAmount.toLocaleString()}` : `${currency} ${refundAmount.toFixed(2)}`;
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: `Refund Initiated — #${orderId.slice(0, 8).toUpperCase()}`,
    html: `
      <h2>Refund Initiated</h2>
      <p>We've initiated a refund for your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong>.</p>
      <p>Refund Amount: <strong>${fmtCurrency}</strong></p>
      <p>Reason: ${reason}</p>
      <p>The refund will be processed within 5-7 business days.</p>
    `,
  });
}

export async function sendPriceAlert(
  to: string,
  productName: string,
  productSlug: string,
  currentPrice: number,
  targetPrice: number,
  currency: string
) {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const fmtPrice = currency === "NPR" ? `Rs. ${currentPrice.toLocaleString()}` : `${currency} ${currentPrice.toFixed(2)}`;
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: `Price Drop Alert — ${productName}`,
    html: `
      <h2>Price Drop!</h2>
      <p><strong>${productName}</strong> is now <strong>${fmtPrice}</strong> — below your target of ${currency === "NPR" ? `Rs. ${targetPrice.toLocaleString()}` : `${currency} ${targetPrice.toFixed(2)}`}.</p>
      <p><a href="${frontendUrl}/shop/${productSlug}">View Product</a></p>
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
