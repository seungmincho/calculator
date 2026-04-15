var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/admin-inquiry.ts
var corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
  "Access-Control-Allow-Methods": "GET, PATCH, DELETE, OPTIONS"
};
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function verifyAuth(request, env) {
  const password = request.headers.get("X-Admin-Password");
  if (!password || !env.ADMIN_PASSWORD_HASH)
    return false;
  const hash = await hashPassword(password);
  return hash === env.ADMIN_PASSWORD_HASH;
}
__name(verifyAuth, "verifyAuth");
function supabaseFetch(env, path, options = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Prefer": options.method === "PATCH" ? "return=minimal" : "return=representation",
      ...options.headers || {}
    }
  });
}
__name(supabaseFetch, "supabaseFetch");
var onRequestOptions = /* @__PURE__ */ __name(async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
}, "onRequestOptions");
var onRequestGet = /* @__PURE__ */ __name(async (context) => {
  if (!await verifyAuth(context.request, context.env)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders
    });
  }
  const url = new URL(context.request.url);
  const filter = url.searchParams.get("filter") || "all";
  const category = url.searchParams.get("category") || "all";
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = parseInt(url.searchParams.get("limit") || "20", 10);
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "created_at.desc");
  params.set("offset", String(offset));
  params.set("limit", String(limit));
  if (filter === "unread")
    params.set("is_read", "eq.false");
  else if (filter === "read")
    params.set("is_read", "eq.true");
  if (category !== "all")
    params.set("category", `eq.${category}`);
  try {
    const res = await supabaseFetch(context.env, `inquiries?${params.toString()}`, {
      headers: { "Prefer": "count=exact" }
    });
    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: corsHeaders
      });
    }
    const data = await res.json();
    const totalCount = res.headers.get("content-range")?.split("/")[1] || "0";
    return new Response(JSON.stringify({ data, total: parseInt(totalCount, 10) }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch" }), {
      status: 500,
      headers: corsHeaders
    });
  }
}, "onRequestGet");
var onRequestPatch = /* @__PURE__ */ __name(async (context) => {
  if (!await verifyAuth(context.request, context.env)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders
    });
  }
  try {
    const body = await context.request.json();
    if (!body.id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const res = await supabaseFetch(
      context.env,
      `inquiries?id=eq.${body.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_read: body.is_read })
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: corsHeaders
    });
  }
}, "onRequestPatch");
var onRequestDelete = /* @__PURE__ */ __name(async (context) => {
  if (!await verifyAuth(context.request, context.env)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders
    });
  }
  try {
    const body = await context.request.json();
    if (!body.id) {
      return new Response(JSON.stringify({ error: "Missing id" }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const res = await supabaseFetch(
      context.env,
      `inquiries?id=eq.${body.id}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: corsHeaders
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: corsHeaders
    });
  }
}, "onRequestDelete");

// api/fetch-page.ts
var onRequestGet2 = /* @__PURE__ */ __name(async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get("url");
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "url parameter required" }), {
      status: 400,
      headers
    });
  }
  let parsed;
  try {
    parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers
    });
  }
  const hostname = parsed.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.") || hostname === "0.0.0.0" || hostname === "[::1]") {
    return new Response(JSON.stringify({ error: "Internal addresses not allowed" }), {
      status: 403,
      headers
    });
  }
  try {
    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolHub ImageScraper/1.0)",
        "Accept": "text/html,application/xhtml+xml,*/*"
      },
      redirect: "follow"
    });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `HTTP ${resp.status}` }), {
        status: 502,
        headers
      });
    }
    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return new Response(JSON.stringify({ error: "Not an HTML page" }), {
        status: 400,
        headers
      });
    }
    const html = await resp.text();
    if (html.length > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Page too large (>2MB)" }), {
        status: 413,
        headers
      });
    }
    return new Response(JSON.stringify({ html, url: resp.url }), {
      status: 200,
      headers: {
        ...headers,
        "Cache-Control": "public, max-age=300"
        // 5분 캐시
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch page" }), {
      status: 502,
      headers
    });
  }
}, "onRequestGet");

// api/fuel-prices.ts
var onRequestGet3 = /* @__PURE__ */ __name(async (context) => {
  const url = new URL(context.request.url);
  const sido = url.searchParams.get("sido");
  const date = url.searchParams.get("date");
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  if (date) {
    const SUPABASE_URL = context.env.SUPABASE_URL;
    const SUPABASE_KEY = context.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase not configured" }), {
        status: 500,
        headers
      });
    }
    try {
      const rpcUrl = `${SUPABASE_URL}/rest/v1/rpc/get_nearest_fuel_price`;
      const body = { p_date: date };
      if (sido)
        body.p_sido_cd = sido;
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: "Supabase query failed", detail: errText }), {
          status: 502,
          headers
        });
      }
      const rows = await res.json();
      return new Response(JSON.stringify({
        source: "supabase",
        requested_date: date,
        sido: sido || "all",
        data: rows
      }), { headers: { ...headers, "Cache-Control": "public, max-age=86400" } });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Supabase error", detail: String(err) }), {
        status: 500,
        headers
      });
    }
  }
  const OPINET_KEY = context.env.OPINET_API_KEY;
  if (!OPINET_KEY) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers
    });
  }
  const cacheId = sido ? `opinet-fuel-${sido}` : "opinet-fuel-all";
  const cacheKey = new Request(`https://cache.internal/${cacheId}`, { method: "GET" });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }
  try {
    const apiUrl = sido ? `https://www.opinet.co.kr/api/avgSidoPrice.do?out=json&code=${OPINET_KEY}&sido=${sido}` : `https://www.opinet.co.kr/api/avgAllPrice.do?out=json&code=${OPINET_KEY}`;
    const upstream = await fetch(apiUrl, {
      headers: { "User-Agent": "ToolHub/1.0 (https://toolhub.ai.kr)" }
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "OPINET API error", status: upstream.status }), {
        status: 502,
        headers
      });
    }
    const data = await upstream.json();
    const response = new Response(JSON.stringify(data), {
      headers: {
        ...headers,
        "Cache-Control": "public, max-age=7200",
        "X-Data-Source": "OPINET",
        "X-Cached-At": (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch fuel prices", detail: String(err) }), {
      status: 500,
      headers
    });
  }
}, "onRequestGet");

// api/fuel-prices-collect.ts
var onRequestGet4 = /* @__PURE__ */ __name(async (context) => {
  const secret = context.request.headers.get("X-Cron-Secret") || new URL(context.request.url).searchParams.get("secret");
  if (!context.env.CRON_SECRET || secret !== context.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const OPINET_KEY = context.env.OPINET_API_KEY;
  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_KEY = context.env.SUPABASE_SERVICE_KEY;
  if (!OPINET_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return new Response(JSON.stringify({ error: "Missing env vars" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const apiUrl = `https://www.opinet.co.kr/api/avgSidoPrice.do?out=json&code=${OPINET_KEY}`;
    const upstream = await fetch(apiUrl, {
      headers: { "User-Agent": "ToolHub/1.0 (https://toolhub.ai.kr)" }
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "OPINET API error", status: upstream.status }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
    const data = await upstream.json();
    const oils = data?.RESULT?.OIL;
    if (!Array.isArray(oils) || oils.length === 0) {
      return new Response(JSON.stringify({ error: "No oil data from OPINET" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const priceMap = {};
    for (const oil of oils) {
      if (!priceMap[oil.SIDOCD]) {
        priceMap[oil.SIDOCD] = { sido_nm: oil.SIDONM };
      }
      const entry = priceMap[oil.SIDOCD];
      if (oil.PRODCD === "B027")
        entry.gasoline = Math.round(Number(oil.PRICE) * 100) / 100;
      if (oil.PRODCD === "B034")
        entry.premium_gasoline = Math.round(Number(oil.PRICE) * 100) / 100;
      if (oil.PRODCD === "D047")
        entry.diesel = Math.round(Number(oil.PRICE) * 100) / 100;
      if (oil.PRODCD === "K015")
        entry.lpg = Math.round(Number(oil.PRICE) * 100) / 100;
    }
    const rows = Object.entries(priceMap).map(([sidoCd, data2]) => ({
      trade_date: today,
      sido_cd: sidoCd,
      sido_nm: data2.sido_nm,
      gasoline: data2.gasoline || null,
      premium_gasoline: data2.premium_gasoline || null,
      diesel: data2.diesel || null,
      lpg: data2.lpg || null
    }));
    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/fuel_prices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(rows)
      }
    );
    if (!supabaseRes.ok) {
      const errText = await supabaseRes.text();
      return new Response(JSON.stringify({ error: "Supabase insert failed", detail: errText }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      success: true,
      date: today,
      regions: rows.length,
      sample: rows.slice(0, 3)
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Collection failed", detail: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}, "onRequestGet");

// api/proxy-image.ts
var onRequestGet5 = /* @__PURE__ */ __name(async (context) => {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get("url");
  if (!targetUrl) {
    return new Response("url parameter required", { status: 400 });
  }
  let parsed;
  try {
    parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }
  const hostname = parsed.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.") || hostname === "0.0.0.0" || hostname === "[::1]") {
    return new Response("Internal addresses not allowed", { status: 403 });
  }
  try {
    const resp = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ToolHub ImageScraper/1.0)",
        "Accept": "image/*,*/*"
      },
      redirect: "follow"
    });
    if (!resp.ok) {
      return new Response(`HTTP ${resp.status}`, { status: 502 });
    }
    const contentType = resp.headers.get("content-type") || "application/octet-stream";
    const body = await resp.arrayBuffer();
    if (body.byteLength > 20 * 1024 * 1024) {
      return new Response("Image too large (>20MB)", { status: 413 });
    }
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
        // 1시간 캐시
      }
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}, "onRequestGet");

// ../.wrangler/tmp/pages-qYrk5Z/functionsRoutes-0.2174495785403454.mjs
var routes = [
  {
    routePath: "/api/admin-inquiry",
    mountPath: "/api",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin-inquiry",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/admin-inquiry",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/admin-inquiry",
    mountPath: "/api",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/fetch-page",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/fuel-prices",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/fuel-prices-collect",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/proxy-image",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: () => {
            isFailOpen = true;
          }
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
