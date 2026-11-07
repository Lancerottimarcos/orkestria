import crypto from "crypto";

/**
 * Decodifica e valida o `signed_request` que a Meta envia nos webhooks de
 * "Desautorizar" e "Exclusão de dados". Formato: "<assinatura>.<payload>",
 * ambos em base64url. A assinatura é HMAC-SHA256 sobre a string do payload
 * (ainda codificada), não sobre o JSON já decodificado - é assim que a Meta
 * documenta o algoritmo desde os apps de Canvas.
 */

function base64UrlDecode(input: string): Buffer {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return Buffer.from(base64, "base64");
}

export type MetaSignedRequestPayload = {
  algorithm: string;
  issued_at: number;
  user_id: string;
};

export function parseMetaSignedRequest(signedRequest: string, appSecret: string): MetaSignedRequestPayload | null {
  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload) return null;

  const sig = base64UrlDecode(encodedSig);
  const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(sig, expectedSig)) return null;

  try {
    const data = JSON.parse(base64UrlDecode(payload).toString("utf8"));
    if (data?.algorithm !== "HMAC-SHA256" || typeof data?.user_id !== "string") return null;
    return data as MetaSignedRequestPayload;
  } catch {
    return null;
  }
}
