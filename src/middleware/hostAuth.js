const crypto = require("crypto");
const env = require("../config/env");

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}

function base64UrlEncode(input) {
  const b64 = Buffer.from(input).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input) {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64").toString("utf-8");
}

function createHostToken(user) {
  const exp = Date.now() + env.hostSessionTtlMs;
  const payload = { u: user, exp };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", env.hostSessionSecret)
    .update(payloadB64)
    .digest("base64");
  const signatureB64Url = signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${payloadB64}.${signatureB64Url}`;
}

function verifyHostToken(token) {
  if (!token || !token.includes(".")) return false;
  const [payloadB64, signatureB64Url] = token.split(".");
  if (!payloadB64 || !signatureB64Url) return false;

  const expectedSigB64 = crypto
    .createHmac("sha256", env.hostSessionSecret)
    .update(payloadB64)
    .digest("base64");
  const expectedSigB64Url = expectedSigB64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const a = Buffer.from(signatureB64Url, "utf-8");
  const b = Buffer.from(expectedSigB64Url, "utf-8");
  if (a.length !== b.length) return false;
  const ok = crypto.timingSafeEqual(a, b);
  if (!ok) return false;
  try {
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);
    if (!payload || typeof payload.exp !== "number") return false;
    if (Date.now() > payload.exp) return false;
    if (payload.u !== env.hostBasicUser) return false;
    return true;
  } catch (_err) {
    return false;
  }
}

function isHostAuthenticated(req) {
  // Auth via cookie uniquement (plus de Basic Auth implicite côté navigateur)
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies[env.hostCookieName];
  if (token && verifyHostToken(token)) return true;
  return false;
}

function hostAuth(req, res, next) {
  if (isHostAuthenticated(req)) return next();
  return res.status(401).json({ error: "Host authentication required." });
}

module.exports = { hostAuth, isHostAuthenticated, createHostToken };

