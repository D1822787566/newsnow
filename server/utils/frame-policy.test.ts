import { describe, expect, it } from "vitest"
import { evaluateFramePolicy, headersToRecord } from "./frame-policy"

describe("evaluateFramePolicy", () => {
  const origin = "http://localhost:5173"

  it("allows iframe when no blocking headers exist", () => {
    expect(evaluateFramePolicy({}, origin)).toEqual({
      embeddable: true,
      reason: null,
      details: null,
    })
  })

  it("blocks X-Frame-Options DENY", () => {
    expect(evaluateFramePolicy({ "x-frame-options": "DENY" }, origin)).toEqual({
      embeddable: false,
      reason: "x-frame-options-deny",
      details: "X-Frame-Options: DENY",
    })
  })

  it("blocks X-Frame-Options SAMEORIGIN", () => {
    expect(evaluateFramePolicy({ "x-frame-options": "SAMEORIGIN" }, origin)).toEqual({
      embeddable: false,
      reason: "x-frame-options-sameorigin",
      details: "X-Frame-Options: SAMEORIGIN",
    })
  })

  it("blocks CSP frame-ancestors none", () => {
    expect(evaluateFramePolicy({
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'; img-src *",
    }, origin)).toEqual({
      embeddable: false,
      reason: "csp-frame-ancestors-none",
      details: "frame-ancestors 'none'",
    })
  })

  it("blocks CSP frame-ancestors self", () => {
    expect(evaluateFramePolicy({
      "content-security-policy": "frame-ancestors 'self' https://trusted.example.com",
    }, origin)).toEqual({
      embeddable: false,
      reason: "csp-frame-ancestors-self",
      details: "frame-ancestors 'self' https://trusted.example.com",
    })
  })

  it("blocks CSP frame-ancestors when current origin is not listed", () => {
    expect(evaluateFramePolicy({
      "content-security-policy": "frame-ancestors https://news.example.com https://*.trusted.example.com",
    }, origin)).toEqual({
      embeddable: false,
      reason: "csp-frame-ancestors-mismatch",
      details: "frame-ancestors https://news.example.com https://*.trusted.example.com",
    })
  })

  it("allows CSP frame-ancestors when current origin is explicitly listed", () => {
    expect(evaluateFramePolicy({
      "content-security-policy": "frame-ancestors http://localhost:5173 https://trusted.example.com",
    }, origin)).toEqual({
      embeddable: true,
      reason: null,
      details: null,
    })
  })

  it("ignores CSP directives whose names only start with frame-ancestors", () => {
    expect(evaluateFramePolicy({
      "content-security-policy": "default-src 'self'; frame-ancestors-old 'none'",
    }, origin)).toEqual({
      embeddable: true,
      reason: null,
      details: null,
    })
  })

  it("converts Headers to a lowercase record", () => {
    const headers = new Headers()
    headers.set("X-Frame-Options", "DENY")
    expect(headersToRecord(headers)).toEqual({
      "x-frame-options": "DENY",
    })
  })

  it("parses Headers instances", () => {
    const headers = new Headers()
    headers.set("X-Frame-Options", "DENY")
    expect(evaluateFramePolicy(headers, origin).reason).toBe("x-frame-options-deny")
  })
})
