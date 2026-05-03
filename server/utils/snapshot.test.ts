import { describe, expect, it } from "vitest"
import { sanitizeSnapshotHtml } from "./snapshot"

describe("sanitizeSnapshotHtml", () => {
  const baseUrl = "https://example.com/articles/123?from=newsnow"

  it("removes executable and embedded active content", () => {
    const html = sanitizeSnapshotHtml(`
      <!doctype html>
      <html>
        <head><title>Unsafe</title><script>alert(1)</script></head>
        <body>
          <iframe src="https://evil.example.com"></iframe>
          <object data="/x"></object>
          <embed src="/x">
          <p>content</p>
        </body>
      </html>
    `, baseUrl)

    expect(html).not.toContain("<script")
    expect(html).not.toContain("<iframe")
    expect(html).not.toContain("<object")
    expect(html).not.toContain("<embed")
    expect(html).toContain("content")
  })

  it("removes inline event handlers and javascript URLs", () => {
    const html = sanitizeSnapshotHtml(`
      <html><body>
        <a href="javascript:alert(1)" onclick="alert(2)">bad link</a>
        <img src="javascript:alert(3)" onerror="alert(4)">
      </body></html>
    `, baseUrl)

    expect(html).not.toContain("onclick")
    expect(html).not.toContain("onerror")
    expect(html).not.toContain("javascript:")
    expect(html).toContain("bad link")
  })

  it("removes srcset when any candidate uses a javascript URL", () => {
    const html = sanitizeSnapshotHtml(`
      <html><body>
        <img srcset="/safe.png 1x, javascript:alert(1) 2x">
      </body></html>
    `, baseUrl)

    expect(html).not.toContain("srcset")
    expect(html).not.toContain("javascript:")
  })

  it("removes meta refresh", () => {
    const html = sanitizeSnapshotHtml(`
      <html><head><meta http-equiv="refresh" content="0;url=https://evil.example.com"></head><body>ok</body></html>
    `, baseUrl)

    expect(html.toLowerCase()).not.toContain("http-equiv=\"refresh\"")
    expect(html).toContain("ok")
  })

  it("injects a base URL and snapshot notice", () => {
    const html = sanitizeSnapshotHtml("<html><head></head><body><img src=\"/logo.png\"><p>ok</p></body></html>", baseUrl)

    expect(html).toContain(`<base href="${baseUrl}">`)
    expect(html).toContain("这是静态快照，交互功能不可用")
    expect(html).toContain("/logo.png")
  })

  it("injects viewport meta for mobile rendering", () => {
    const html = sanitizeSnapshotHtml("<html><head></head><body><p>ok</p></body></html>", baseUrl)

    expect(html).toContain('<meta name="viewport"')
    expect(html).toContain("width=device-width")
    expect(html).toContain("initial-scale=1.0")
    expect(html).toContain("max-width: 100vw")
    expect(html).toContain("overflow-x: hidden")
  })

  it("disables forms instead of allowing submission", () => {
    const html = sanitizeSnapshotHtml("<html><body><form action=\"/submit\"><input name=\"q\"><button>Go</button></form></body></html>", baseUrl)

    expect(html).not.toContain("<form")
    expect(html).toContain("data-snapshot-form")
    expect(html).toContain("Go")
  })
})
