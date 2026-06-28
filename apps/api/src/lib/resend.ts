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

export async function sendBrandVerified(to: string, brandName: string) {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: `Your brand "${brandName}" has been verified!`,
    html: `
      <h2>Brand Verified!</h2>
      <p>Congratulations! Your brand <strong>${brandName}</strong> has been verified on VTryon.</p>
      <p>You now have full access to the seller portal — manage products, track sales, and grow your brand.</p>
      <p><a href="${frontendUrl}/brand">Go to Brand Portal</a></p>
    `,
  });
}

export async function sendWeeklyStyleDigest(
  to: string,
  userName: string,
  outfitSuggestions: Array<{ name: string; slug: string; imageUrl: string; price: number; currency: string }>,
) {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  const productCards = outfitSuggestions
    .map(
      (p) =>
        `<div style="display:inline-block;width:200px;margin:8px;vertical-align:top;text-align:center;">
          <img src="${p.imageUrl}" alt="${p.name}" style="width:180px;height:240px;object-fit:cover;border-radius:8px;" />
          <p style="margin:8px 0 4px;font-weight:600;">${p.name}</p>
          <p style="color:#666;">${p.currency === "NPR" ? `Rs. ${p.price.toLocaleString()}` : `${p.currency} ${p.price.toFixed(2)}`}</p>
          <a href="${frontendUrl}/shop/${p.slug}" style="color:#7C3AED;">Shop Now</a>
        </div>`
    )
    .join("");

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "VTryon <noreply@vtryon.com>",
    to,
    subject: "Your Weekly Style Picks",
    html: `
      <h2>Hi ${userName || "there"}, here are this week's outfit ideas!</h2>
      <p>Our AI stylist curated these picks just for you based on your style profile.</p>
      <div>${productCards}</div>
      <p style="margin-top:24px;"><a href="${frontendUrl}/shop">Browse All Products</a></p>
      <hr style="margin-top:32px;" />
      <p style="font-size:12px;color:#999;">You're receiving this because you opted into marketing emails. <a href="${frontendUrl}/settings">Manage preferences</a></p>
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
