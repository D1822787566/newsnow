export interface FramePolicyVerdict {
  embeddable: boolean
  reason: string | null
  details: string | null
}

type HeaderInput = Headers | Record<string, string | undefined | null>

function getHeader(headers: HeaderInput, name: string) {
  if (headers instanceof Headers) return headers.get(name) || ""
  const lowerName = name.toLowerCase()
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === lowerName)
  return entry?.[1] || ""
}

function extractFrameAncestors(csp: string) {
  const directives = csp.split(";").map(part => part.trim()).filter(Boolean)
  return directives.find((directive) => {
    const [name] = directive.split(/\s+/, 1)
    return name.toLowerCase() === "frame-ancestors"
  }) || ""
}

function originMatchesDirective(origin: string, directive: string) {
  const tokens = directive.split(/\s+/).slice(1)
  return tokens.some((token) => {
    const clean = token.replace(/^[\'"]|[\'"]$/g, "")
    if (clean === "*") return true
    if (clean === origin) return true

    if (clean.startsWith("https://*.")) {
      const suffix = clean.slice("https://*.".length)
      try {
        const originUrl = new URL(origin)
        return originUrl.protocol === "https:" && originUrl.hostname.endsWith(`.${suffix}`)
      } catch {
        return false
      }
    }

    if (clean.startsWith("http://*.")) {
      const suffix = clean.slice("http://*.".length)
      try {
        const originUrl = new URL(origin)
        return originUrl.protocol === "http:" && originUrl.hostname.endsWith(`.${suffix}`)
      } catch {
        return false
      }
    }

    return false
  })
}

export function evaluateFramePolicy(headers: HeaderInput, currentOrigin: string): FramePolicyVerdict {
  const xFrameOptions = getHeader(headers, "x-frame-options").trim()
  const xFrameOptionsLower = xFrameOptions.toLowerCase()

  if (xFrameOptionsLower.includes("deny")) {
    return {
      embeddable: false,
      reason: "x-frame-options-deny",
      details: `X-Frame-Options: ${xFrameOptions}`,
    }
  }

  if (xFrameOptionsLower.includes("sameorigin")) {
    return {
      embeddable: false,
      reason: "x-frame-options-sameorigin",
      details: `X-Frame-Options: ${xFrameOptions}`,
    }
  }

  const csp = getHeader(headers, "content-security-policy")
  const frameAncestors = extractFrameAncestors(csp)
  const frameAncestorsLower = frameAncestors.toLowerCase()

  if (frameAncestorsLower.includes("'none'")) {
    return {
      embeddable: false,
      reason: "csp-frame-ancestors-none",
      details: frameAncestors,
    }
  }

  if (frameAncestorsLower.includes("'self'")) {
    return {
      embeddable: false,
      reason: "csp-frame-ancestors-self",
      details: frameAncestors,
    }
  }

  if (frameAncestors && !originMatchesDirective(currentOrigin, frameAncestors)) {
    return {
      embeddable: false,
      reason: "csp-frame-ancestors-mismatch",
      details: frameAncestors,
    }
  }

  return {
    embeddable: true,
    reason: null,
    details: null,
  }
}
