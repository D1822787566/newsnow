import { readFileSync } from "node:fs"
import { join } from "node:path"

// In Nitro, process.cwd() points to the project root during dev.
// The CSS file is at server/styles/dfl-inject.css relative to project root.
const getCssPath = () => {
  const baseDir = process.cwd()
  return join(baseDir, "server", "styles", "dfl-inject.css")
}

/** 读取 DFL 注入样式模板 */
export function getDflInjectCss(): string {
  try {
    return readFileSync(getCssPath(), "utf-8")
  } catch {
    // Fallback inline CSS if file not found
    return getFallbackDflCss()
  }
}

function getFallbackDflCss(): string {
  return `
    :root {
      --dfl-paper: #F2EAD3;
      --dfl-ink: #1F1A14;
      --dfl-ink-2: #3D3528;
      --dfl-ink-3: #7A6E60;
      --dfl-rule: #D4C9B8;
      --dfl-blue: #2B5E8B;
      --dfl-red: #C0392B;
    }
    body {
      background: var(--dfl-paper) !important;
      color: var(--dfl-ink-2) !important;
      font-family: 'Noto Serif SC', serif !important;
      line-height: 1.8 !important;
    }
    a { color: var(--dfl-blue) !important; text-decoration: underline !important; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Noto Serif SC', serif !important; color: var(--dfl-ink) !important; font-weight: 700 !important; }
    img { max-width: 100% !important; border-radius: 8px !important; }
    blockquote { border-left: 3px solid var(--dfl-rule) !important; padding-left: 12px !important; color: var(--dfl-ink-3) !important; }
    .ad, .sidebar, .nav, .header, .footer,
    [class*="ad-"], [class*="nav-"], [class*="sidebar"],
    [id*="ad"], [id*="popup"], [id*="modal"] {
      display: none !important;
    }
  `
}

/**
 * 在 HTML 的 <head> 最前面注入 <base> 标签，告诉浏览器如何解析相对 URL
 * @param html - 原始 HTML 字符串
 * @param baseUrl - 原始页面的完整 URL（如 https://bbs.hupu.com/thread/123）
 * @returns 注入了 <base> 标签的 HTML
 */
export function injectBaseTag(html: string, baseUrl: string): string {
  // 如果 HTML 中已存在 <base> 标签，直接返回（避免重复注入）
  if (/<base\s/i.test(html)) {
    return html;
  }

  // 提取基础 URL：协议 + 域名 + 端口（不含路径）
  // 例如 https://bbs.hupu.com/thread/123 → https://bbs.hupu.com
  const urlObj = new URL(baseUrl);
  const origin = `${urlObj.protocol}//${urlObj.host}`;

  const baseTag = `<base href="${origin}">`;

  // 优先插入到 <head> 标签之后（最前面位置）
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1${baseTag}`);
  }

  // 如果没有 <head>，插入到 <html> 之后
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/(<html[^>]*>)/i, `$1${baseTag}`);
  }

  // 如果连 <html> 都没有，直接插在最前面
  return baseTag + html;
}

/** 将 DFL 样式注入到 HTML 的 <head> 中 */
export function injectDflStyles(html: string): string {
  const css = getDflInjectCss()
  const styleTag = `<style id="dfl-injected-styles" data-dfl-preview="true">\n${css}\n</style>`

  // 尝试注入到 </head> 之前
  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleTag}\n</head>`)
  }

  // 如果没有 </head>，注入到 <body> 开头或最前面
  if (html.includes("<body")) {
    return html.replace(/<body[^>]*>/, (match) => `${match}\n${styleTag}`)
  }

  return `${styleTag}\n${html}`
}

/** 移除可能限制 iframe 嵌入的 CSP meta 标签 */
export function removeCspMeta(html: string): string {
  // 移除 <meta http-equiv="Content-Security-Policy" ...>
  html = html.replace(/<meta\s+[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi, "")
  // 移除 <meta http-equiv="X-Frame-Options" ...>
  html = html.replace(/<meta\s+[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, "")
  return html
}

/** 处理完整的代理 HTML 管道 */
export function processProxyHtml(html: string, baseUrl?: string): string {
  html = removeCspMeta(html)
  if (baseUrl) {
    html = injectBaseTag(html, baseUrl)
  }
  html = injectDflStyles(html)
  return html
}
