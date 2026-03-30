#!/usr/bin/env node

/**
 * Post-build script: Inject SEO HTML content into static export pages.
 *
 * Problem: Next.js App Router static export + I18nWrapper causes <body>
 * to only contain "Loading..." — Google sees no content to index.
 *
 * Solution: Extract title, description, JSON-LD data, and RSC prose content,
 * then inject as visible HTML into <body>. Hidden via JS after React hydrates.
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'out');
let processed = 0;
let skipped = 0;
let withRscProse = 0;

// ── Extractors ──

function extractTitle(html) {
  const match = html.match(/<title>([^<]+)<\/title>/);
  if (!match) return null;
  return match[1].replace(/\s*\|\s*툴허브\s*$/, '').trim();
}

function extractDescription(html) {
  const match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  return match ? match[1] : null;
}

function extractJsonLd(html) {
  const results = [];

  // Method 1: Real <script> tags (rare in this app, but try)
  const re = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { results.push(JSON.parse(m[1])); } catch {}
  }

  // Method 2: JSON-LD inside RSC payload (double-escaped)
  // Pattern: "type":"application/ld+json","dangerouslySetInnerHTML":{"__html":"..."}
  const rscLdMarker = 'application/ld+json';
  let idx = 0;
  while (true) {
    idx = html.indexOf(rscLdMarker, idx);
    if (idx === -1) break;

    // Find __html after this point
    const htmlMarker = '__html';
    const htmlIdx = html.indexOf(htmlMarker, idx);
    if (htmlIdx === -1 || htmlIdx - idx > 200) { idx++; continue; }

    // Find the JSON content - it starts after __html":"  or __html\\\":\\\"
    // Try to find the opening { of the JSON-LD
    const searchStart = htmlIdx + htmlMarker.length;
    const braceIdx = html.indexOf('{', searchStart);
    if (braceIdx === -1 || braceIdx - searchStart > 50) { idx++; continue; }

    // Extract until we find matching closing brace (accounting for nesting)
    let depth = 0;
    let jsonEnd = braceIdx;
    for (let i = braceIdx; i < html.length && i < braceIdx + 10000; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) { jsonEnd = i + 1; break; }
      }
    }

    const rawJson = html.substring(braceIdx, jsonEnd);
    // Unescape: the JSON might be escaped (\\\" → \")
    const unescaped = rawJson.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
    try {
      const parsed = JSON.parse(unescaped);
      results.push(parsed);
    } catch {
      // Try another level of unescaping
      try {
        const doubleUnescaped = unescaped.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
        results.push(JSON.parse(doubleUnescaped));
      } catch {}
    }

    idx = jsonEnd;
  }

  return results;
}

function extractRscSeoContent(html) {
  // RSC payloads are inside self.__next_f.push([1,"..."]) calls
  // The string content is double-escaped JSON
  // Strategy: find the push() that contains our SEO section marker,
  // unescape it, then extract text content

  const items = [];

  // Find all next_f push payloads
  const pushes = [];
  let searchIdx = 0;
  while (true) {
    const start = html.indexOf('self.__next_f.push([1,"', searchIdx);
    if (start === -1) break;
    const contentStart = start + 'self.__next_f.push([1,"'.length;
    // Find the closing "])
    const end = html.indexOf('"])', contentStart);
    if (end === -1) break;
    pushes.push(html.substring(contentStart, end));
    searchIdx = end + 3;
  }

  for (const payload of pushes) {
    // Look for SEO section markers
    if (!payload.includes('max-w-4xl') && !payload.includes('max-w-6xl')) continue;
    if (!payload.includes('border-t border-gray') && !payload.includes('pb-12')) continue;

    // Unescape the double-escaped string
    let text;
    try {
      text = JSON.parse('"' + payload + '"');
    } catch {
      // If JSON.parse fails, do manual unescaping
      text = payload.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
    }

    // Now extract h2 and p content from the unescaped RSC format
    // Format: ["$","h2",null,{"className":"...","children":"text"}]
    extractTagContent(text, 'h2', items);
    extractTagContent(text, 'p', items);
  }

  return items;
}

function extractTagContent(rscText, tag, items) {
  // Find patterns like: "$","h2",null,{"className":"...","children":"actual text"}
  const marker = '"' + tag + '",null,{"className":"';
  let idx = 0;

  while (true) {
    idx = rscText.indexOf(marker, idx);
    if (idx === -1) break;

    // Find "children":" after this point
    const childrenMarker = ',"children":"';
    const childrenIdx = rscText.indexOf(childrenMarker, idx);
    if (childrenIdx === -1 || childrenIdx - idx > 300) { idx++; continue; }

    const textStart = childrenIdx + childrenMarker.length;
    // Find the closing " (not escaped)
    let textEnd = textStart;
    while (textEnd < rscText.length) {
      if (rscText[textEnd] === '"' && rscText[textEnd - 1] !== '\\') break;
      textEnd++;
    }

    const text = rscText.substring(textStart, textEnd);

    // Filter: h2 should be short titles, p should be meaningful prose
    if (tag === 'h2' && text.length > 3 && text.length < 200 && !text.includes('Loading')) {
      items.push({ tag: 'h2', text });
    } else if (tag === 'p' && text.length > 40) {
      items.push({ tag: 'p', text });
    }

    idx = textEnd;
  }
}

// ── HTML Builder ──

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildSeoHtml(title, description, jsonLdList, rscContent) {
  const parts = [];

  parts.push('<div id="__seo" style="max-width:768px;margin:2rem auto;padding:1rem 1.5rem;font-family:system-ui,sans-serif;color:#111827">');

  if (title) {
    parts.push(`<h1 style="font-size:1.5rem;font-weight:700;margin-bottom:0.75rem;line-height:1.3">${escapeHtml(title)}</h1>`);
  }

  if (description) {
    parts.push(`<p style="color:#4b5563;line-height:1.7;margin-bottom:1rem">${escapeHtml(description)}</p>`);
  }

  for (const ld of jsonLdList) {
    // Feature list
    if (ld.featureList && Array.isArray(ld.featureList) && ld.featureList.length > 0) {
      parts.push('<ul style="color:#4b5563;line-height:1.8;padding-left:1.25rem;margin-bottom:1rem">');
      for (const f of ld.featureList.slice(0, 10)) {
        parts.push(`<li>${escapeHtml(f)}</li>`);
      }
      parts.push('</ul>');
    }

    // FAQ
    if (ld['@type'] === 'FAQPage' && ld.mainEntity) {
      for (const qa of ld.mainEntity.slice(0, 5)) {
        if (qa.name) parts.push(`<h3 style="font-size:1rem;font-weight:600;margin:1rem 0 0.5rem">${escapeHtml(qa.name)}</h3>`);
        if (qa.acceptedAnswer?.text) parts.push(`<p style="color:#4b5563;line-height:1.7">${escapeHtml(qa.acceptedAnswer.text)}</p>`);
      }
    }

    // HowTo
    if (ld['@type'] === 'HowTo' && ld.step) {
      parts.push(`<h3 style="font-size:1rem;font-weight:600;margin:1rem 0 0.5rem">${escapeHtml(ld.name || '사용 방법')}</h3>`);
      parts.push('<ol style="color:#4b5563;line-height:1.8;padding-left:1.25rem;margin-bottom:1rem">');
      for (const step of ld.step.slice(0, 8)) {
        const t = step.text || step.name || '';
        if (t) parts.push(`<li>${escapeHtml(t)}</li>`);
      }
      parts.push('</ol>');
    }
  }

  // RSC prose content
  if (rscContent.length > 0) {
    withRscProse++;
    for (const item of rscContent.slice(0, 10)) {
      if (item.tag === 'h2') {
        parts.push(`<h2 style="font-size:1.25rem;font-weight:700;margin:1.5rem 0 0.5rem">${escapeHtml(item.text)}</h2>`);
      } else {
        parts.push(`<p style="color:#4b5563;line-height:1.7;margin-bottom:0.75rem">${escapeHtml(item.text)}</p>`);
      }
    }
  }

  parts.push('</div>');
  return parts.join('\n');
}

// ── Main ──

function processHtmlFile(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');

  if (html.includes('id="__seo"')) { skipped++; return; }

  const title = extractTitle(html);
  const description = extractDescription(html);
  if (!title && !description) { skipped++; return; }

  const jsonLdList = extractJsonLd(html);
  const rscContent = extractRscSeoContent(html);
  const seoHtml = buildSeoHtml(title, description, jsonLdList, rscContent);

  // Script to hide __seo once React hydrates (DOMContentLoaded fires after hydration)
  const hideScript = '<script>document.addEventListener("DOMContentLoaded",function(){var e=document.getElementById("__seo");if(e)e.remove()})</script>';

  html = html.replace(/(<body[^>]*>)/, `$1\n${seoHtml}\n${hideScript}`);
  fs.writeFileSync(filePath, html, 'utf-8');
  processed++;
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(full);
    else if (entry.name === 'index.html') processHtmlFile(full);
  }
}

console.log('Injecting SEO HTML into static export...');
walkDir(OUT_DIR);
console.log(`Done: ${processed} pages processed (${withRscProse} with RSC prose), ${skipped} skipped`);
