import { Buffer } from "node:buffer"
import { JSDOM } from "jsdom"
import { chromium } from "playwright"
import { assertSafePreviewUrl, assertSafeResolvedPreviewUrl } from "./url-safety"

export interface SnapshotResult {
  title: string
  html: string
  source: string
  elapsed: string
  finalUrl: string
}

const ACTIVE_TAGS = ["script", "iframe", "object", "embed"]
const URL_ATTRIBUTES = ["href", "src", "action", "formaction"]

function srcsetHasJavascriptUrl(srcset: string) {
  return srcset.split(",").some((candidate) => {
    const [url] = candidate.trim().split(/\s+/, 1)
    return url.toLowerCase().startsWith("javascript:")
  })
}

export function sanitizeSnapshotHtml(rawHtml: string, baseUrl: string) {
  const dom = new JSDOM(rawHtml)
  const { document } = dom.window

  for (const tag of ACTIVE_TAGS) {
    document.querySelectorAll(tag).forEach(element => element.remove())
  }

  document.querySelectorAll('meta[http-equiv="refresh" i]').forEach(element => element.remove())

  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name)
        continue
      }

      if (name === "srcset" && srcsetHasJavascriptUrl(attribute.value)) {
        element.removeAttribute(attribute.name)
        continue
      }

      if (URL_ATTRIBUTES.includes(name) && value.startsWith("javascript:")) {
        element.removeAttribute(attribute.name)
      }
    }
  })

  document.querySelectorAll("form").forEach((form) => {
    const replacement = document.createElement("div")
    replacement.setAttribute("data-snapshot-form", "disabled")

    const className = form.getAttribute("class")
    if (className) {
      replacement.setAttribute("class", className)
    }

    replacement.innerHTML = form.innerHTML
    form.replaceWith(replacement)
  })

  const html = document.documentElement || document.appendChild(document.createElement("html"))
  const head = document.head || html.insertBefore(document.createElement("head"), html.firstChild)
  const body = document.body || html.appendChild(document.createElement("body"))

  document.querySelectorAll("base").forEach(element => element.remove())

  const base = document.createElement("base")
  base.setAttribute("href", baseUrl)
  head.insertBefore(base, head.firstChild)

  const viewportMeta = document.createElement("meta")
  viewportMeta.setAttribute("name", "viewport")
  viewportMeta.setAttribute("content", "width=device-width, initial-scale=1.0")
  head.appendChild(viewportMeta)

  const styleEl = document.createElement("style")
  styleEl.textContent = "body { max-width: 100vw; overflow-x: hidden; }"
  head.appendChild(styleEl)

  const notice = document.createElement("div")
  notice.textContent = "这是静态快照，交互功能不可用"
  notice.setAttribute("style", "position: sticky; top: 0; z-index: 2147483647; padding: 10px 14px; background: #fff7ed; color: #9a3412; border-bottom: 1px solid #fed7aa; font: 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;")
  body.insertBefore(notice, body.firstChild)

  return `<!doctype html>\n${document.documentElement.outerHTML}`
}

const SNAPSHOT_TIMEOUT_MS = 15000
const NETWORK_IDLE_TIMEOUT_MS = 3000
const MAX_SNAPSHOT_HTML_BYTES = 3 * 1024 * 1024

function byteLength(value: string) {
  return Buffer.byteLength(value, "utf8")
}

export async function createSnapshot(rawUrl: string): Promise<SnapshotResult> {
  const start = Date.now()
  const safeUrl = assertSafePreviewUrl(rawUrl)
  const browser = await chromium.launch({ headless: true })

  try {
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      locale: "zh-CN",
      viewport: { width: 1365, height: 900 },
    })
    const page = await context.newPage()

    await page.goto(safeUrl.href, {
      waitUntil: "domcontentloaded",
      timeout: SNAPSHOT_TIMEOUT_MS,
    })

    await page.waitForLoadState("networkidle", {
      timeout: NETWORK_IDLE_TIMEOUT_MS,
    }).catch(() => undefined)

    const finalUrl = page.url()
    assertSafeResolvedPreviewUrl(finalUrl)

    const rawHtml = await page.content()
    const html = sanitizeSnapshotHtml(rawHtml, finalUrl)

    if (byteLength(html) > MAX_SNAPSHOT_HTML_BYTES) {
      throw new Error("snapshot-too-large")
    }

    return {
      title: await page.title(),
      html,
      source: new URL(finalUrl).hostname,
      elapsed: ((Date.now() - start) / 1000).toFixed(1),
      finalUrl,
    }
  } finally {
    await browser.close()
  }
}
