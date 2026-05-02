import { isIP } from "node:net"

function normalizeHostname(hostname: string) {
  return hostname.trim().replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "")
}

function isPrivateIPv4(hostname: string) {
  const parts = hostname.split(".").map(part => Number(part))

  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  const [first, second] = parts

  return (
    first === 0
    || first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
  )
}

function isPrivateIPv6(hostname: string) {
  return (
    hostname === "::1"
    || hostname.startsWith("fc")
    || hostname.startsWith("fd")
    || hostname.startsWith("fe80")
  )
}

export function isPrivateHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname)

  if (
    normalized === "localhost"
    || normalized === "localhost.localdomain"
    || normalized === "ip6-localhost"
    || normalized === "ip6-loopback"
    || normalized.endsWith(".localhost")
    || normalized === "metadata.google.internal"
  ) {
    return true
  }

  const ipVersion = isIP(normalized)

  if (ipVersion === 4) {
    return isPrivateIPv4(normalized)
  }

  if (ipVersion === 6) {
    return isPrivateIPv6(normalized)
  }

  return false
}

export function assertSafePreviewUrl(rawUrl: string): URL {
  let url: URL

  try {
    url = new URL(rawUrl)
  }
  catch {
    throw new Error("URL 格式无效")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("仅支持 HTTP/HTTPS 协议")
  }

  if (isPrivateHostname(url.hostname)) {
    throw new Error("不允许访问本机或内网地址")
  }

  return url
}
