import crypto from "crypto";

const ESEWA_SECRET = process.env.ESEWA_SECRET_KEY ?? "";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE ?? "EPAYTEST";
const ESEWA_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://epay.esewa.com.np/api/epay"
    : "https://rc-epay.esewa.com.np/api/epay";

export interface EsewaInitParams {
  amount: number;
  taxAmount: number;
  totalAmount: number;
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
}

function generateSignature(message: string): string {
  return crypto
    .createHmac("sha256", ESEWA_SECRET)
    .update(message)
    .digest("base64");
}

export function buildEsewaForm(params: EsewaInitParams) {
  const message = `total_amount=${params.totalAmount},transaction_uuid=${params.transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
  const signature = generateSignature(message);

  return {
    amount: params.amount,
    tax_amount: params.taxAmount,
    total_amount: params.totalAmount,
    transaction_uuid: params.transactionUuid,
    product_code: ESEWA_PRODUCT_CODE,
    product_service_charge: 0,
    product_delivery_charge: 0,
    success_url: params.successUrl,
    failure_url: params.failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature,
    action_url: `${ESEWA_BASE_URL}/main`,
  };
}

export async function verifyEsewaPayment(encodedData: string): Promise<boolean> {
  const decoded = JSON.parse(Buffer.from(encodedData, "base64").toString("utf-8")) as {
    total_amount: string;
    transaction_uuid: string;
    product_code: string;
    signed_field_names: string;
    signature: string;
  };

  const fields = decoded.signed_field_names.split(",");
  const message = fields.map((f) => `${f}=${decoded[f as keyof typeof decoded]}`).join(",");
  const expected = generateSignature(message);

  return expected === decoded.signature;
}
