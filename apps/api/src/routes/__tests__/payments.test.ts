import { describe, it, expect } from "vitest";
import crypto from "crypto";

function generateEsewaSignature(message: string, secretKey: string): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
}

function verifyEsewaResponse(
  decoded: {
    transaction_code?: string;
    status?: string;
    total_amount?: string;
    transaction_uuid?: string;
    product_code?: string;
    signed_field_names?: string;
    signature?: string;
  },
  secretKey: string
): { valid: boolean; reason?: string } {
  if (decoded.status !== "COMPLETE") {
    return { valid: false, reason: "Payment was not completed." };
  }

  const signedFields = decoded.signed_field_names?.split(",") ?? [];
  const signatureMessage = signedFields
    .map((field) => `${field}=${decoded[field as keyof typeof decoded] ?? ""}`)
    .join(",");
  const expectedSignature = generateEsewaSignature(signatureMessage, secretKey);

  if (decoded.signature !== expectedSignature) {
    return { valid: false, reason: "Invalid payment signature." };
  }

  return { valid: true };
}

function verifyKhaltiAmount(orderAmountNPR: number, khaltiAmountPaisa: number): boolean {
  const expectedPaisa = Math.round(orderAmountNPR * 100);
  return khaltiAmountPaisa === expectedPaisa;
}

describe("eSewa Signature", () => {
  const SECRET = "8gBm/:&EnhH.1/q";

  it("generates consistent HMAC-SHA256 base64 signature", () => {
    const message = "total_amount=100,transaction_uuid=abc-123,product_code=EPAYTEST";
    const sig1 = generateEsewaSignature(message, SECRET);
    const sig2 = generateEsewaSignature(message, SECRET);
    expect(sig1).toBe(sig2);
    expect(sig1.length).toBeGreaterThan(0);
  });

  it("different messages produce different signatures", () => {
    const sig1 = generateEsewaSignature("total_amount=100,transaction_uuid=a,product_code=X", SECRET);
    const sig2 = generateEsewaSignature("total_amount=200,transaction_uuid=b,product_code=X", SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it("verifies a valid eSewa response", () => {
    const message = "total_amount=1500,transaction_uuid=order1-1234,product_code=EPAYTEST";
    const signature = generateEsewaSignature(message, SECRET);

    const decoded = {
      transaction_code: "TX123",
      status: "COMPLETE",
      total_amount: "1500",
      transaction_uuid: "order1-1234",
      product_code: "EPAYTEST",
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature,
    };

    const result = verifyEsewaResponse(decoded, SECRET);
    expect(result.valid).toBe(true);
  });

  it("rejects incomplete payment status", () => {
    const decoded = {
      status: "PENDING",
      signed_field_names: "total_amount",
      signature: "fake",
    };

    const result = verifyEsewaResponse(decoded, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Payment was not completed.");
  });

  it("rejects tampered signature", () => {
    const decoded = {
      status: "COMPLETE",
      total_amount: "1500",
      transaction_uuid: "order1-1234",
      product_code: "EPAYTEST",
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: "tampered-signature-value",
    };

    const result = verifyEsewaResponse(decoded, SECRET);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invalid payment signature.");
  });
});

describe("Khalti Amount Verification", () => {
  it("converts NPR to paisa correctly", () => {
    expect(verifyKhaltiAmount(1500, 150000)).toBe(true);
  });

  it("rejects mismatched amounts", () => {
    expect(verifyKhaltiAmount(1500, 100000)).toBe(false);
  });

  it("handles decimal NPR amounts", () => {
    expect(verifyKhaltiAmount(99.99, 9999)).toBe(true);
  });

  it("handles zero amount", () => {
    expect(verifyKhaltiAmount(0, 0)).toBe(true);
  });
});
