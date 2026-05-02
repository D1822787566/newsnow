import { describe, expect, it } from "vitest"
import { assertSafePreviewUrl, isPrivateHostname } from "./url-safety"

describe("isPrivateHostname", () => {
  it("rejects localhost names", () => {
    expect(isPrivateHostname("localhost")).toBe(true)
    expect(isPrivateHostname("localhost.")).toBe(true)
    expect(isPrivateHostname("LOCALHOST")).toBe(true)
    expect(isPrivateHostname("localhost.localdomain")).toBe(true)
    expect(isPrivateHostname("ip6-localhost")).toBe(true)
    expect(isPrivateHostname("ip6-loopback")).toBe(true)
    expect(isPrivateHostname("app.localhost")).toBe(true)
    expect(isPrivateHostname("app.localhost.")).toBe(true)
    expect(isPrivateHostname("metadata.google.internal")).toBe(true)
    expect(isPrivateHostname("metadata.google.internal.")).toBe(true)
  })

  it("rejects private and loopback IPv4 ranges", () => {
    expect(isPrivateHostname("0.0.0.0")).toBe(true)
    expect(isPrivateHostname("127.0.0.1")).toBe(true)
    expect(isPrivateHostname("10.1.2.3")).toBe(true)
    expect(isPrivateHostname("172.16.0.1")).toBe(true)
    expect(isPrivateHostname("172.31.255.255")).toBe(true)
    expect(isPrivateHostname("192.168.1.10")).toBe(true)
    expect(isPrivateHostname("169.254.10.10")).toBe(true)
  })

  it("rejects IPv6 loopback and local ranges", () => {
    expect(isPrivateHostname("::1")).toBe(true)
    expect(isPrivateHostname("[::1]")).toBe(true)
    expect(isPrivateHostname("fc00::1")).toBe(true)
    expect(isPrivateHostname("fd00::1")).toBe(true)
    expect(isPrivateHostname("fe80::1")).toBe(true)
  })

  it("allows public hostnames and public IPv4 addresses", () => {
    expect(isPrivateHostname("www.36kr.com")).toBe(false)
    expect(isPrivateHostname("8.8.8.8")).toBe(false)
  })
})

describe("assertSafePreviewUrl", () => {
  it("normalizes valid http and https URLs", () => {
    expect(assertSafePreviewUrl("https://www.36kr.com/newsflashes/1").href).toBe("https://www.36kr.com/newsflashes/1")
    expect(assertSafePreviewUrl("http://example.com/a?b=1").href).toBe("http://example.com/a?b=1")
  })

  it("rejects unsupported protocols", () => {
    expect(() => assertSafePreviewUrl("file:///etc/passwd")).toThrow("仅支持 HTTP/HTTPS 协议")
    expect(() => assertSafePreviewUrl("javascript:alert(1)")).toThrow("仅支持 HTTP/HTTPS 协议")
  })

  it("rejects local/private targets", () => {
    expect(() => assertSafePreviewUrl("http://localhost:5173/")).toThrow("不允许访问本机或内网地址")
    expect(() => assertSafePreviewUrl("http://127.0.0.1:8033/")).toThrow("不允许访问本机或内网地址")
    expect(() => assertSafePreviewUrl("http://192.168.1.1/")).toThrow("不允许访问本机或内网地址")
  })

  it("rejects invalid URL strings", () => {
    expect(() => assertSafePreviewUrl("not a url")).toThrow("URL 格式无效")
  })
})
