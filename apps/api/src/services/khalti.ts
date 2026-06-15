const KHALTI_SECRET = process.env.KHALTI_SECRET_KEY ?? "";
const KHALTI_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://khalti.com/api/v2"
    : "https://dev.khalti.com/api/v2";

export interface KhaltiInitParams {
  returnUrl: string;
  websiteUrl: string;
  amount: number; // In paisa (1 NPR = 100 paisa)
  purchaseOrderId: string;
  purchaseOrderName: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

export interface KhaltiInitResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
}

export async function initiateKhaltiPayment(
  params: KhaltiInitParams
): Promise<KhaltiInitResponse> {
  const res = await fetch(`${KHALTI_BASE_URL}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      return_url: params.returnUrl,
      website_url: params.websiteUrl,
      amount: params.amount,
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      customer_info: {
        name: params.customerName,
        email: params.customerEmail,
        phone: params.customerPhone,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Khalti initiation failed: ${err}`);
  }

  return res.json() as Promise<KhaltiInitResponse>;
}

export async function verifyKhaltiPayment(
  pidx: string
): Promise<{ status: string; totalAmount: number }> {
  const res = await fetch(`${KHALTI_BASE_URL}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${KHALTI_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  if (!res.ok) throw new Error("Khalti verification failed");

  const data = (await res.json()) as { status: string; total_amount: number };
  return { status: data.status, totalAmount: data.total_amount };
}
