// =============================================
// SelectTransform Playground - Main Application
// =============================================

(function () {
  "use strict";

  // --- API URLs ---
  // If running on Vercel, use relative path; otherwise use full Vercel URL
  var IS_VERCEL = window.location.hostname.includes("vercel.app");
  var CLOUD_PROXY_URL = IS_VERCEL ? "/api/proxy" : "https://st-playground.vercel.app/api/proxy";
  var TEMPLATES_API_URL = IS_VERCEL ? "/api/templates" : "https://st-playground.vercel.app/api/templates";
  var GENERATE_API_URL = IS_VERCEL ? "/api/generate" : "https://st-playground.vercel.app/api/generate";

  // --- Built-in Example Data ---
  var EXAMPLES = {
    basic: {
      data: '{\n  "name": "John",\n  "age": 30,\n  "city": "New York"\n}',
      template: '{\n  "greeting": "Hello, {{name}}!",\n  "info": "{{name}} is {{age}} years old and lives in {{city}}."\n}',
    },
    each: {
      data: '{\n  "items": [\n    { "name": "Apple", "price": 1.2 },\n    { "name": "Banana", "price": 0.5 },\n    { "name": "Cherry", "price": 2.0 }\n  ]\n}',
      template: '{\n  "{{#each items}}": {\n    "label": "{{name}}",\n    "cost": "{{price}}"\n  }\n}',
    },
    conditional: {
      data: '{\n  "status": "active",\n  "username": "admin"\n}',
      template: '[\n  {\n    "{{#if status === \'active\'}}": {\n      "message": "Welcome back, {{username}}!",\n      "access": true\n    }\n  },\n  {\n    "{{#else}}": {\n      "message": "Account is inactive.",\n      "access": false\n    }\n  }\n]',
    },
    merge: {
      data: '{\n  "first": "John",\n  "last": "Doe",\n  "age": 30\n}',
      template: '{\n  "{{#merge}}": [\n    { "fullName": "{{first}} {{last}}" },\n    { "isAdult": "{{age >= 18}}" },\n    { "type": "user" }\n  ]\n}',
    },
    concat: {
      data: '{\n  "fruits": ["Apple", "Banana"],\n  "vegs": ["Carrot", "Daikon"]\n}',
      template: '{\n  "{{#concat}}": [\n    "{{fruits}}",\n    "{{vegs}}"\n  ]\n}',
    },
    let: {
      data: '{\n  "items": [\n    { "name": "iPhone", "price": 999 },\n    { "name": "iPad", "price": 799 }\n  ]\n}',
      template: '{\n  "{{#let}}": [\n    { "tax_rate": 0.08 },\n    {\n      "products": {\n        "{{#each items}}": {\n          "name": "{{name}}",\n          "price": "{{price}}",\n          "tax": "{{price * tax_rate}}"\n        }\n      }\n    }\n  ]\n}',
    },
    select: {
      data: '{\n  "users": [\n    { "name": "Alice", "role": "admin" },\n    { "name": "Bob", "role": "user" },\n    { "name": "Charlie", "role": "admin" }\n  ]\n}',
      template: '{\n  "{{#each users}}": {\n    "admin_name": "{{name}}",\n    "role": "{{role}}"\n  }\n}',
    },
    nested: {
      data: '{\n  "company": "Acme Corp",\n  "departments": [\n    {\n      "name": "Engineering",\n      "employees": [\n        { "name": "Alice", "title": "Lead" },\n        { "name": "Bob", "title": "Dev" }\n      ]\n    },\n    {\n      "name": "Marketing",\n      "employees": [\n        { "name": "Charlie", "title": "Manager" }\n      ]\n    }\n  ]\n}',
      template: '{\n  "org": "{{company}}",\n  "teams": {\n    "{{#each departments}}": {\n      "team": "{{name}}",\n      "members": {\n        "{{#each employees}}": {\n          "person": "{{name}}",\n          "role": "{{title}}"\n        }\n      }\n    }\n  }\n}',
    },
  };

  // =============================================
  // SAVED TEMPLATES (Cloud API — GitHub-backed)
  // =============================================
  var _cachedTemplates = []; // local cache: [{name, data, template, updatedAt}]

  function refreshSavedDropdown() {
    var select = document.getElementById("savedTemplates");
    while (select.options.length > 1) select.remove(1);
    _cachedTemplates.forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t.name;
      opt.textContent = t.name;
      select.appendChild(opt);
    });
    document.getElementById("deleteTemplateBtn").style.display =
      _cachedTemplates.length > 0 ? "inline-block" : "none";
  }

  function loadTemplatesFromAPI() {
    return fetch(TEMPLATES_API_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _cachedTemplates = (data && data.templates) ? data.templates : [];
        refreshSavedDropdown();
      })
      .catch(function (err) {
        console.error("Failed to load templates:", err);
      });
  }

  function saveTemplateToAPI(name, data, template) {
    return fetch(TEMPLATES_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, data: data, template: template }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.templates) {
          _cachedTemplates = res.templates.templates || [];
        }
        refreshSavedDropdown();
      });
  }

  function deleteTemplateFromAPI(name) {
    return fetch(TEMPLATES_API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.templates) {
          _cachedTemplates = res.templates.templates || [];
        }
        refreshSavedDropdown();
      });
  }

  // =============================================
  // cURL PARSER
  // =============================================
  function parseCurl(curlStr) {
    // Normalize: join line continuations and trim
    var str = curlStr.replace(/\\\s*\n/g, " ").replace(/\\\s*\r\n/g, " ").trim();

    // Remove leading 'curl' keyword
    if (str.toLowerCase().startsWith("curl")) {
      str = str.substring(4).trim();
    }

    var method = "GET";
    var headers = {};
    var body = null;
    var url = "";

    // Tokenize respecting quotes
    var tokens = [];
    var current = "";
    var inSingle = false;
    var inDouble = false;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
      } else if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
      } else if (ch === " " && !inSingle && !inDouble) {
        if (current.length > 0) {
          tokens.push(current);
          current = "";
        }
      } else {
        current += ch;
      }
    }
    if (current.length > 0) tokens.push(current);

    // Flags that take NO argument (just skip them)
    var noArgFlags = [
      "-L", "--location", "--compressed", "-k", "--insecure",
      "-s", "--silent", "-S", "--show-error", "-v", "--verbose",
      "-i", "--include", "-f", "--fail", "--fail-with-body",
      "-N", "--no-buffer", "--raw", "--tr-encoding",
      "--location-trusted", "-G", "--get", "-I", "--head",
    ];

    // Flags that take ONE argument (consume next token)
    var oneArgFlags = [
      "-o", "--output", "-w", "--write-out", "--connect-timeout",
      "-m", "--max-time", "--retry", "--retry-delay",
      "-e", "--referer", "-A", "--user-agent",
      "--max-redirs", "-c", "--cookie-jar",
      "--cert", "--key", "--cacert", "--proxy",
    ];

    // Parse tokens
    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      if (token === "-X" || token === "--request") {
        method = tokens[++t].toUpperCase();
      } else if (token === "-H" || token === "--header") {
        var hdr = tokens[++t];
        var colonIdx = hdr.indexOf(":");
        if (colonIdx > -1) {
          var key = hdr.substring(0, colonIdx).trim();
          var val = hdr.substring(colonIdx + 1).trim();
          headers[key] = val;
        }
      } else if (token === "-b" || token === "--cookie") {
        // Cookie passed as -b flag
        var cookieVal = tokens[++t];
        headers["Cookie"] = cookieVal;
      } else if (token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary" || token === "--data-urlencode") {
        body = tokens[++t];
        if (method === "GET") method = "POST";
      } else if (token === "-u" || token === "--user") {
        var creds = tokens[++t];
        headers["Authorization"] = "Basic " + btoa(creds);
      } else if (noArgFlags.indexOf(token) > -1) {
        // No-argument flag, just skip
      } else if (oneArgFlags.indexOf(token) > -1) {
        // Has argument but we don't use it, skip both
        t++;
      } else if (token.startsWith("http://") || token.startsWith("https://")) {
        url = token;
      } else if (!token.startsWith("-") && !url) {
        // Might be a URL without protocol
        if (token.includes(".") && !token.includes(":")) {
          url = "https://" + token;
        }
      }
    }

    return { url: url, method: method, headers: headers, body: body };
  }

  function setCurlStatus(text, type) {
    var el = document.getElementById("curlStatus");
    el.textContent = text;
    el.className = "curl-status" + (type ? " " + type : "");
  }

  function executeCurl() {
    var curlInput = document.getElementById("curlInput");
    var curlStr = curlInput.value.trim();

    if (!curlStr) {
      setCurlStatus("Paste a cURL command first", "error");
      return;
    }

    var parsed;
    try {
      parsed = parseCurl(curlStr);
    } catch (e) {
      setCurlStatus("Failed to parse cURL: " + e.message, "error");
      return;
    }

    if (!parsed.url) {
      setCurlStatus("No URL found in cURL command", "error");
      return;
    }

    var proxyChoice = document.getElementById("corsProxy").value;

    // Show what we're sending
    setCurlStatus("Executing " + parsed.method + " " + parsed.url + " (via " + proxyChoice + ")...", "loading");
    var btn = document.getElementById("curlExecuteBtn");
    btn.disabled = true;
    btn.textContent = "...";

    var fetchPromise;

    if (proxyChoice === "cloud" || proxyChoice === "local") {
      // Proxy — sends request via serverless function or local Python proxy
      var proxyPayload = {
        url: parsed.url,
        method: parsed.method,
        headers: parsed.headers,
        body: parsed.body,
      };
      var proxyUrl = proxyChoice === "cloud" ? CLOUD_PROXY_URL : "http://localhost:8766";
      fetchPromise = fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proxyPayload),
      })
        .then(function (r) { return r.json(); })
        .then(function (proxyRes) {
          return { status: proxyRes.status, ok: proxyRes.status >= 200 && proxyRes.status < 300, text: proxyRes.body };
        });
    } else {
      var fetchUrl = parsed.url;
      var useAllOrigins = false;

      if (proxyChoice === "corsproxy") {
        fetchUrl = "https://corsproxy.io/?" + encodeURIComponent(parsed.url);
      } else if (proxyChoice === "allorigins") {
        fetchUrl = "https://api.allorigins.win/raw?url=" + encodeURIComponent(parsed.url);
        useAllOrigins = true;
      }

      var fetchHeaders = {};
      if (!useAllOrigins) {
        for (var hk in parsed.headers) {
          fetchHeaders[hk] = parsed.headers[hk];
        }
      }

      var fetchOptions = {
        method: useAllOrigins ? "GET" : parsed.method,
        headers: fetchHeaders,
      };
      if (!useAllOrigins && parsed.body && parsed.method !== "GET" && parsed.method !== "HEAD") {
        fetchOptions.body = parsed.body;
      }

      console.log("[ST Playground] Proxy:", proxyChoice, "URL:", fetchUrl, "Options:", fetchOptions);

      fetchPromise = fetch(fetchUrl, fetchOptions)
        .then(function (response) {
          var status = response.status;
          return response.text().then(function (txt) {
            return { status: status, ok: response.ok, text: txt };
          });
        });
    }

    fetchPromise
      .then(function (res) {
        if (!res.ok) {
          try {
            var errJson = JSON.parse(res.text);
            dataEditor.setValue(JSON.stringify(errJson, null, 2));
          } catch (e) {
            dataEditor.setValue(res.text || "// Empty response");
          }
          var hint = "";
          if (res.text && (res.text.includes("CORS blocked") || res.text.includes("CORS"))) {
            hint = " — Try 'Local Proxy' (run proxy.py first)";
          }
          setCurlStatus("HTTP " + res.status + hint, "error");
          return;
        }
        try {
          var json = JSON.parse(res.text);
          dataEditor.setValue(JSON.stringify(json, null, 2));
        } catch (e) {
          dataEditor.setValue(res.text);
        }
        setCurlStatus("HTTP " + res.status + " — Response loaded (" + res.text.length + " bytes)", "success");
      })
      .catch(function (err) {
        var msg = err.message;
        if (proxyChoice === "local") {
          msg = "Local proxy not running. Start it with: python proxy.py";
        } else if (proxyChoice === "cloud") {
          msg += " — Cloud proxy may be unavailable. Try 'Local Proxy' instead.";
        } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          msg += " — Try 'Cloud Proxy' or 'Local Proxy' option";
        }
        setCurlStatus("Error: " + msg, "error");
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Execute";
      });
  }

  // =============================================
  // ST.js AUTOCOMPLETE for Template Editor
  // =============================================
  // Helper: create a completion that inserts text and places cursor at | position
  function snippetCompletion(insertText, display) {
    var cursorOffset = insertText.indexOf("|");
    var finalText = insertText.replace("|", "");
    return {
      text: finalText,
      displayText: display,
      hint: cursorOffset > -1 ? function (cm, data, completion) {
        cm.replaceRange(finalText, data.from, data.to);
        // Place cursor at the | position
        var newPos = data.from.ch + cursorOffset;
        cm.setCursor({ line: data.from.line, ch: newPos });
      } : undefined
    };
  }

  var ST_COMPLETIONS = {
    // ST.js control flow keys
    stKeys: [
      snippetCompletion('"{{#each |}}": ', '#each — loop over array'),
      snippetCompletion('"{{#if |}}": ', '#if — conditional'),
      snippetCompletion('"{{#elseif |}}": ', '#elseif — else-if branch'),
      { text: '"{{#else}}": ', displayText: '#else — fallback branch' },
      { text: '"{{#merge}}": ', displayText: '#merge — merge objects' },
      { text: '"{{#concat}}": ', displayText: '#concat — concatenate arrays' },
      { text: '"{{#let}}": ', displayText: '#let — define local vars' },
      snippetCompletion('"{{ { ...this, | } }}"', '{{ { ...this } }} — spread + add fields'),
    ],
    // String methods
    string: [
      { text: '.toUpperCase()', displayText: '.toUpperCase() — "abc" → "ABC"' },
      { text: '.toLowerCase()', displayText: '.toLowerCase() — "ABC" → "abc"' },
      { text: '.trim()', displayText: '.trim() — remove whitespace' },
      { text: '.trimStart()', displayText: '.trimStart() — trim leading whitespace' },
      { text: '.trimEnd()', displayText: '.trimEnd() — trim trailing whitespace' },
      snippetCompletion('.split("|")', '.split(sep) — string to array'),
      snippetCompletion('.replace("|", "")', '.replace(old, new) — replace first match'),
      snippetCompletion('.replaceAll("|", "")', '.replaceAll(old, new) — replace all'),
      snippetCompletion('.slice(|)', '.slice(start, end) — substring'),
      snippetCompletion('.substring(|)', '.substring(start, end) — extract part'),
      snippetCompletion('.charAt(|)', '.charAt(i) — char at index'),
      snippetCompletion('.charCodeAt(|)', '.charCodeAt(i) — char code'),
      snippetCompletion('.indexOf("|")', '.indexOf(str) — find position'),
      snippetCompletion('.lastIndexOf("|")', '.lastIndexOf(str) — find last position'),
      snippetCompletion('.includes("|")', '.includes(str) — check contains'),
      snippetCompletion('.startsWith("|")', '.startsWith(str) — check prefix'),
      snippetCompletion('.endsWith("|")', '.endsWith(str) — check suffix'),
      snippetCompletion('.match(/|/)', '.match(regex) — regex match'),
      snippetCompletion('.search(/|/)', '.search(regex) — regex search index'),
      snippetCompletion('.padStart(|, " ")', '.padStart(len, ch) — pad start'),
      snippetCompletion('.padEnd(|, " ")', '.padEnd(len, ch) — pad end'),
      snippetCompletion('.repeat(|)', '.repeat(n) — repeat n times'),
      snippetCompletion('.concat("|")', '.concat(str) — concatenate strings'),
      snippetCompletion('.at(|)', '.at(i) — char at index (supports negative)'),
      { text: '.length', displayText: '.length — string length' },
    ],
    // Array methods
    array: [
      snippetCompletion('.map(x => |x)', '.map(fn) — transform each element'),
      snippetCompletion('.filter(x => |x)', '.filter(fn) — keep matching elements'),
      snippetCompletion('.reduce((acc, x) => |acc, 0)', '.reduce(fn, init) — reduce to value'),
      snippetCompletion('.find(x => |x)', '.find(fn) — first matching element'),
      snippetCompletion('.findIndex(x => |x)', '.findIndex(fn) — index of first match'),
      snippetCompletion('.some(x => |x)', '.some(fn) — any match?'),
      snippetCompletion('.every(x => |x)', '.every(fn) — all match?'),
      snippetCompletion('.forEach(x => |x)', '.forEach(fn) — iterate (no return)'),
      snippetCompletion('.join("|")', '.join(sep) — array to string'),
      snippetCompletion('.includes(|)', '.includes(val) — check membership'),
      snippetCompletion('.indexOf(|)', '.indexOf(val) — find index'),
      snippetCompletion('.lastIndexOf(|)', '.lastIndexOf(val) — last index'),
      snippetCompletion('.slice(|)', '.slice(start, end) — subarray'),
      snippetCompletion('.concat(|)', '.concat(arr) — merge arrays'),
      snippetCompletion('.flat(|)', '.flat(depth) — flatten nested arrays'),
      snippetCompletion('.flatMap(x => |x)', '.flatMap(fn) — map then flatten'),
      snippetCompletion('.sort((a, b) => |a - b)', '.sort(fn) — sort in place'),
      { text: '.reverse()', displayText: '.reverse() — reverse in place' },
      snippetCompletion('.fill(|)', '.fill(val, start, end) — fill with value'),
      snippetCompletion('.at(|)', '.at(i) — element at index (neg ok)'),
      { text: '.length', displayText: '.length — array length' },
      { text: '.toString()', displayText: '.toString() — to string' },
    ],
    // Number / Math
    math: [
      snippetCompletion('Math.round(|)', 'Math.round(n) — round to nearest'),
      snippetCompletion('Math.floor(|)', 'Math.floor(n) — round down'),
      snippetCompletion('Math.ceil(|)', 'Math.ceil(n) — round up'),
      snippetCompletion('Math.abs(|)', 'Math.abs(n) — absolute value'),
      snippetCompletion('Math.max(|)', 'Math.max(a, b, ...) — maximum'),
      snippetCompletion('Math.min(|)', 'Math.min(a, b, ...) — minimum'),
      snippetCompletion('Math.pow(|, 2)', 'Math.pow(base, exp) — power'),
      snippetCompletion('Math.sqrt(|)', 'Math.sqrt(n) — square root'),
      { text: 'Math.random()', displayText: 'Math.random() — 0 to 1 random' },
      snippetCompletion('Math.trunc(|)', 'Math.trunc(n) — remove decimals'),
      snippetCompletion('Math.sign(|)', 'Math.sign(n) — -1, 0, or 1'),
      { text: 'Math.PI', displayText: 'Math.PI — 3.14159...' },
    ],
    // Number methods
    number: [
      snippetCompletion('.toFixed(|2)', '.toFixed(digits) — format decimals'),
      { text: '.toString()', displayText: '.toString(radix) — to string' },
      snippetCompletion('.toPrecision(|)', '.toPrecision(n) — n significant digits'),
      { text: '.toLocaleString()', displayText: '.toLocaleString() — locale format' },
      snippetCompletion('Number(|)', 'Number(val) — convert to number'),
      snippetCompletion('Number.isInteger(|)', 'Number.isInteger(n) — check integer'),
      snippetCompletion('Number.isFinite(|)', 'Number.isFinite(n) — check finite'),
      snippetCompletion('Number.isNaN(|)', 'Number.isNaN(n) — check NaN'),
      snippetCompletion('parseInt(|, 10)', 'parseInt(str, radix) — parse integer'),
      snippetCompletion('parseFloat(|)', 'parseFloat(str) — parse float'),
    ],
    // Object / JSON
    object: [
      snippetCompletion('Object.keys(|)', 'Object.keys(obj) — key array'),
      snippetCompletion('Object.values(|)', 'Object.values(obj) — value array'),
      snippetCompletion('Object.entries(|)', 'Object.entries(obj) — [k,v] pairs'),
      snippetCompletion('Object.assign({}, |)', 'Object.assign(target, src) — merge'),
      snippetCompletion('Object.fromEntries(|)', 'Object.fromEntries(arr) — entries to obj'),
      snippetCompletion('JSON.stringify(|)', 'JSON.stringify(val) — serialize'),
      snippetCompletion('JSON.parse(|)', 'JSON.parse(str) — deserialize'),
    ],
    // Date
    date: [
      snippetCompletion('new Date(|)', 'new Date(val) — create Date'),
      { text: '.getFullYear()', displayText: '.getFullYear() — 4-digit year' },
      { text: '.getMonth()', displayText: '.getMonth() — month (0-11)' },
      { text: '.getDate()', displayText: '.getDate() — day of month' },
      { text: '.getDay()', displayText: '.getDay() — day of week (0-6)' },
      { text: '.getHours()', displayText: '.getHours() — hours (0-23)' },
      { text: '.getMinutes()', displayText: '.getMinutes() — minutes' },
      { text: '.getSeconds()', displayText: '.getSeconds() — seconds' },
      { text: '.getTime()', displayText: '.getTime() — ms since epoch' },
      { text: '.toISOString()', displayText: '.toISOString() — ISO 8601 format' },
      { text: '.toLocaleDateString()', displayText: '.toLocaleDateString() — locale date' },
      { text: '.toLocaleTimeString()', displayText: '.toLocaleTimeString() — locale time' },
      { text: 'Date.now()', displayText: 'Date.now() — current timestamp ms' },
    ],
    // Ternary / Boolean / Utils
    util: [
      snippetCompletion(' ? "|" : ""', 'ternary — condition ? a : b'),
      snippetCompletion(' || "|"', '|| fallback — default value'),
      snippetCompletion('Boolean(|)', 'Boolean(val) — to boolean'),
      snippetCompletion('String(|)', 'String(val) — to string'),
      snippetCompletion('Array.isArray(|)', 'Array.isArray(val) — check array'),
      snippetCompletion('Array.from(|)', 'Array.from(iterable) — to array'),
      snippetCompletion('encodeURIComponent(|)', 'encodeURIComponent(str) — encode URI'),
      snippetCompletion('decodeURIComponent(|)', 'decodeURIComponent(str) — decode URI'),
      snippetCompletion('isNaN(|)', 'isNaN(val) — check not-a-number'),
      snippetCompletion('isFinite(|)', 'isFinite(val) — check finite'),
    ],
  };

  // Resolve a dot-path (like "data.items") against a JSON object
  function resolveDataPath(obj, path) {
    if (!obj || !path) return undefined;
    var parts = path.split(".");
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  // Detect JS type from a value
  function detectType(val) {
    if (val === undefined || val === null) return "unknown";
    if (Array.isArray(val)) return "array";
    if (typeof val === "string") return "string";
    if (typeof val === "number") return "number";
    if (typeof val === "boolean") return "boolean";
    if (val instanceof Date) return "date";
    if (typeof val === "object") return "object";
    return "unknown";
  }

  // Strip dot prefix and preserve the hint function for snippet completions
  function stripPrefix(c, prefixRegex) {
    var t = c.text.replace(prefixRegex, "");
    var item = { text: t, displayText: c.displayText };
    if (c.hint) {
      // Adjust the snippet hint to work with stripped text
      item.hint = function (cm, data, completion) {
        var cursorOffset = c.text.replace(prefixRegex, "").indexOf("(") + 1;
        cm.replaceRange(t, data.from, data.to);
        // Try to place cursor inside first paren
        if (t.indexOf("(") > -1 && t.indexOf("()") === -1) {
          cm.setCursor({ line: data.from.line, ch: data.from.ch + t.indexOf("(") + 1 });
        }
      };
    }
    return item;
  }

  function stHint(cm) {
    var cursor = cm.getCursor();
    var line = cm.getLine(cursor.line);
    var end = cursor.ch;

    // Detect if we're inside a {{ }} expression
    var before = line.substring(0, end);
    var insideMustache = false;
    var mustacheStart = before.lastIndexOf("{{");
    var mustacheEnd = before.lastIndexOf("}}");
    if (mustacheStart > -1 && mustacheStart > mustacheEnd) {
      insideMustache = true;
    }

    // Find the current word/token being typed (stop at dots)
    var start = end;
    while (start > 0 && /[\w$#]/.test(line.charAt(start - 1))) {
      start--;
    }
    var token = line.substring(start, end).toLowerCase();

    var list = [];

    if (!insideMustache) {
      // Outside mustache — suggest ST.js control flow keys
      ST_COMPLETIONS.stKeys.forEach(function (c) {
        if (!token || c.text.toLowerCase().indexOf(token) > -1 || c.displayText.toLowerCase().indexOf(token) > -1) {
          list.push(c);
        }
      });
    } else {
      // Inside {{ }} — suggest methods
      var hasDot = before.charAt(end - token.length - 1) === ".";

      if (hasDot) {
        // Find the full variable path before the dot (e.g. "data.campaigns" from "data.campaigns.")
        var dotPos = end - token.length - 1;
        var prefixEnd = dotPos;
        var prefixStart = prefixEnd;
        while (prefixStart > 0 && /[\w$.]/.test(line.charAt(prefixStart - 1))) {
          prefixStart--;
        }
        var fullPrefix = line.substring(prefixStart, prefixEnd);
        // Last segment for static class detection
        var lastSegment = fullPrefix.indexOf(".") > -1 ? fullPrefix.split(".").pop() : fullPrefix;
        var firstSegment = fullPrefix.split(".")[0];

        if (firstSegment === "Math" || lastSegment === "Math") {
          ST_COMPLETIONS.math.forEach(function (c) {
            var item = stripPrefix(c, /^Math\./);
            if (!token || item.text.toLowerCase().indexOf(token) > -1) {
              list.push(item);
            }
          });
        } else if (firstSegment === "Object" || lastSegment === "Object") {
          ST_COMPLETIONS.object.forEach(function (c) {
            if (c.text.startsWith("Object.") || c.text.indexOf("Object.") > -1) {
              var item = stripPrefix(c, /^Object\./);
              if (!token || item.text.toLowerCase().indexOf(token) > -1) {
                list.push(item);
              }
            }
          });
        } else if (firstSegment === "JSON" || lastSegment === "JSON") {
          ST_COMPLETIONS.object.forEach(function (c) {
            if (c.text.startsWith("JSON.")) {
              var item = stripPrefix(c, /^JSON\./);
              if (!token || item.text.toLowerCase().indexOf(token) > -1) {
                list.push(item);
              }
            }
          });
        } else if (firstSegment === "Number" || lastSegment === "Number") {
          ST_COMPLETIONS.number.forEach(function (c) {
            if (c.text.startsWith(".") || c.text.startsWith("Number.")) {
              var item = stripPrefix(c, /^(Number)?\./);
              if (!token || item.text.toLowerCase().indexOf(token) > -1) {
                list.push(item);
              }
            }
          });
        } else if (firstSegment === "Date" || lastSegment === "Date") {
          ST_COMPLETIONS.date.forEach(function (c) {
            if (c.text.startsWith(".") || c.text.startsWith("Date.")) {
              var item = stripPrefix(c, /^(Date)?\./);
              if (!token || item.text.toLowerCase().indexOf(token) > -1) {
                list.push(item);
              }
            }
          });
        } else {
          // Try to detect type from data editor
          var detectedType = "unknown";
          try {
            var dataObj = JSON.parse(dataEditor.getValue());
            var val = resolveDataPath(dataObj, fullPrefix);
            detectedType = detectType(val);
          } catch (e) { /* ignore parse errors */ }

          var methodSets;
          if (detectedType === "string") {
            methodSets = ST_COMPLETIONS.string;
          } else if (detectedType === "array") {
            methodSets = ST_COMPLETIONS.array;
          } else if (detectedType === "number") {
            methodSets = ST_COMPLETIONS.number;
          } else if (detectedType === "object") {
            // For objects, suggest the object's own keys + Object methods
            methodSets = [];
            try {
              var dataObj2 = JSON.parse(dataEditor.getValue());
              var objVal = resolveDataPath(dataObj2, fullPrefix);
              if (objVal && typeof objVal === "object" && !Array.isArray(objVal)) {
                Object.keys(objVal).forEach(function (key) {
                  var childType = detectType(objVal[key]);
                  var typeLabel = childType === "array" ? "[]" : childType === "object" ? "{}" : childType;
                  methodSets.push({ text: key, displayText: key + " — " + typeLabel });
                });
              }
            } catch (e) {}
          } else {
            // Unknown type — show all instance methods
            methodSets = [].concat(
              ST_COMPLETIONS.string,
              ST_COMPLETIONS.array,
              ST_COMPLETIONS.number,
              ST_COMPLETIONS.date
            );
          }

          methodSets.forEach(function (c) {
            var item = stripPrefix(c, /^\./);
            if (!token || item.text.toLowerCase().indexOf(token) > -1) {
              list.push(item);
            }
          });
        }
      } else {
        // No dot — suggest global functions, utils, AND top-level data keys
        var allItems = [].concat(
          ST_COMPLETIONS.math,
          ST_COMPLETIONS.number,
          ST_COMPLETIONS.object,
          ST_COMPLETIONS.date,
          ST_COMPLETIONS.util
        );
        allItems.forEach(function (c) {
          if (!token || c.text.toLowerCase().indexOf(token) > -1 || c.displayText.toLowerCase().indexOf(token) > -1) {
            list.push(c);
          }
        });

        // Also suggest top-level keys from data
        try {
          var dataObj3 = JSON.parse(dataEditor.getValue());
          if (dataObj3 && typeof dataObj3 === "object") {
            Object.keys(dataObj3).forEach(function (key) {
              if (!token || key.toLowerCase().indexOf(token) > -1) {
                var childType = detectType(dataObj3[key]);
                var typeLabel = childType === "array" ? "[]" : childType === "object" ? "{}" : childType;
                list.push({ text: key, displayText: key + " — data." + typeLabel });
              }
            });
          }
        } catch (e) {}
      }
    }

    if (list.length === 0) return null;

    return {
      list: list,
      from: CodeMirror.Pos(cursor.line, start),
      to: CodeMirror.Pos(cursor.line, end),
    };
  }

  // =============================================
  // EDITOR SETUP
  // =============================================
  var editorConfig = {
    mode: { name: "javascript", json: true },
    theme: "dracula",
    lineNumbers: true,
    lineWrapping: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    foldGutter: true,
    gutters: ["CodeMirror-linenumber", "CodeMirror-foldgutter"],
    tabSize: 2,
    indentWithTabs: false,
  };

  // Hint options — Tab accepts, Enter accepts
  var hintOpts = { hint: stHint, completeSingle: false };

  // Create data editor first so stHint can read its value for type detection
  var dataEditor = CodeMirror.fromTextArea(document.getElementById("dataEditor"), editorConfig);

  var templateEditorConfig = Object.assign({}, editorConfig, {
    extraKeys: {
      "Ctrl-Space": function (cm) { cm.showHint(hintOpts); },
      "Tab": function (cm) {
        // If hint popup is open, Tab accepts the selected hint
        if (cm.state.completionActive) {
          return CodeMirror.Pass; // let show-hint addon handle Tab
        }
        if (cm.somethingSelected()) {
          cm.indentSelection("add");
        } else {
          cm.replaceSelection("  ", "end");
        }
      },
      "'.'": function (cm) {
        cm.replaceSelection(".");
        // Auto-show after dot if inside {{ }}
        var cursor = cm.getCursor();
        var line = cm.getLine(cursor.line);
        var before = line.substring(0, cursor.ch);
        var mustacheStart = before.lastIndexOf("{{");
        var mustacheEnd = before.lastIndexOf("}}");
        if (mustacheStart > -1 && mustacheStart > mustacheEnd) {
          setTimeout(function () { cm.showHint(hintOpts); }, 50);
        }
      },
    },
  });

  var templateEditor = CodeMirror.fromTextArea(document.getElementById("templateEditor"), templateEditorConfig);
  var resultEditor = CodeMirror.fromTextArea(document.getElementById("resultEditor"),
    Object.assign({}, editorConfig, { readOnly: true })
  );

  // Load default example
  dataEditor.setValue(EXAMPLES.basic.data);
  templateEditor.setValue(EXAMPLES.basic.template);

  // =============================================
  // JSON HELPERS
  // =============================================

  // Fix common JSON issues: single quotes → double quotes, trailing commas
  function fixJSON(str) {
    if (!str) return str;
    // Try parsing as-is first
    try { JSON.parse(str); return str; } catch (e) { /* needs fixing */ }

    var result = "";
    var inDouble = false;
    var inSingle = false;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var prev = i > 0 ? str[i - 1] : "";

      if (ch === '"' && !inSingle && prev !== "\\") {
        inDouble = !inDouble;
        result += ch;
      } else if (ch === "'" && !inDouble && prev !== "\\") {
        if (!inSingle) {
          // Opening single quote → replace with double quote
          inSingle = true;
          result += '"';
        } else {
          // Closing single quote → replace with double quote
          inSingle = false;
          result += '"';
        }
      } else if (ch === '"' && inSingle) {
        // Escape double quotes inside single-quoted strings
        result += '\\"';
      } else {
        result += ch;
      }
    }

    // Remove trailing commas before } or ]
    result = result.replace(/,\s*([\]}])/g, "$1");

    return result;
  }

  // Parse JSON with single-quote support
  function parseJSON(str) {
    return JSON.parse(fixJSON(str));
  }

  // =============================================
  // TRANSFORM LOGIC
  // =============================================
  function runTransform() {
    var statusEl = document.getElementById("resultStatus");
    try {
      var dataStr = dataEditor.getValue().trim();
      var templateStr = templateEditor.getValue().trim();

      if (!dataStr || !templateStr) {
        resultEditor.setValue("");
        statusEl.textContent = "Enter data and template";
        statusEl.className = "panel-hint";
        return;
      }

      var data = parseJSON(dataStr);
      var template = parseJSON(templateStr);

      var result = ST.transform(template, data);
      var output = JSON.stringify(result, null, 2);

      resultEditor.setValue(output);
      statusEl.textContent = "Success";
      statusEl.className = "panel-hint success";
    } catch (e) {
      resultEditor.setValue("// Error: " + e.message);
      statusEl.textContent = "Error";
      statusEl.className = "panel-hint error";
    }
  }

  function formatEditors() {
    var errors = [];
    try {
      var d = parseJSON(dataEditor.getValue());
      dataEditor.setValue(JSON.stringify(d, null, 2));
    } catch (e) { errors.push("Data: " + e.message); }
    try {
      var t = parseJSON(templateEditor.getValue());
      templateEditor.setValue(JSON.stringify(t, null, 2));
    } catch (e) { errors.push("Template: " + e.message); }
    // Show format errors in result status
    var statusEl = document.getElementById("resultStatus");
    if (errors.length > 0) {
      statusEl.textContent = "Format error: " + errors.join(" | ");
      statusEl.className = "panel-hint error";
    } else {
      statusEl.textContent = "Formatted";
      statusEl.className = "panel-hint success";
    }
  }

  // Auto-run on change (debounced)
  var debounceTimer;
  function scheduleRun() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runTransform, 400);
  }

  dataEditor.on("change", scheduleRun);
  templateEditor.on("change", scheduleRun);

  // =============================================
  // EVENT HANDLERS
  // =============================================

  // --- Run / Format / Clear ---
  document.getElementById("runBtn").addEventListener("click", runTransform);
  document.getElementById("formatBtn").addEventListener("click", formatEditors);
  document.getElementById("clearBtn").addEventListener("click", function () {
    resultEditor.setValue("");
    document.getElementById("resultStatus").textContent = "Cleared";
    document.getElementById("resultStatus").className = "panel-hint";
  });

  // --- Built-in Examples dropdown ---
  document.getElementById("examples").addEventListener("change", function () {
    var key = this.value;
    if (key && EXAMPLES[key]) {
      dataEditor.setValue(EXAMPLES[key].data);
      templateEditor.setValue(EXAMPLES[key].template);
      runTransform();
    }
    this.value = "";
  });

  // --- Saved Templates dropdown ---
  document.getElementById("savedTemplates").addEventListener("change", function () {
    var key = this.value;
    if (key) {
      var found = _cachedTemplates.find(function (t) { return t.name === key; });
      if (found) {
        dataEditor.setValue(found.data);
        templateEditor.setValue(found.template);
        runTransform();
      }
    }
  });

  // --- Save Template ---
  document.getElementById("saveTemplateBtn").addEventListener("click", function () {
    var name = prompt("Enter a name for this template:");
    if (!name || !name.trim()) return;
    name = name.trim();

    var data = dataEditor.getValue();
    var template = templateEditor.getValue();
    var btn = document.getElementById("saveTemplateBtn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    saveTemplateToAPI(name, data, template)
      .then(function () {
        document.getElementById("savedTemplates").value = name;
      })
      .catch(function (err) {
        alert("Failed to save template: " + err.message);
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Save";
      });
  });

  // --- Delete Template ---
  document.getElementById("deleteTemplateBtn").addEventListener("click", function () {
    var select = document.getElementById("savedTemplates");
    var name = select.value;
    if (!name) {
      alert("Select a saved template first to delete.");
      return;
    }
    if (confirm('Delete template "' + name + '"?')) {
      var btn = document.getElementById("deleteTemplateBtn");
      btn.disabled = true;
      btn.textContent = "Deleting...";

      deleteTemplateFromAPI(name)
        .then(function () {
          select.value = "";
        })
        .catch(function (err) {
          alert("Failed to delete template: " + err.message);
        })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Delete";
        });
    }
  });

  // --- cURL Execute ---
  document.getElementById("curlExecuteBtn").addEventListener("click", executeCurl);

  // --- cURL Collapse/Expand ---
  document.getElementById("curlCollapseBtn").addEventListener("click", function () {
    var body = document.getElementById("curlBody");
    var btn = this;
    if (body.classList.contains("collapsed")) {
      body.classList.remove("collapsed");
      btn.innerHTML = "&#9650;"; // up arrow
    } else {
      body.classList.add("collapsed");
      btn.innerHTML = "&#9660;"; // down arrow
    }
    // Refresh editor after layout change
    setTimeout(function () { dataEditor.refresh(); }, 50);
  });

  // --- AI Generate ---
  function setAiStatus(text, type) {
    var el = document.getElementById("aiStatus");
    el.textContent = text;
    el.className = "ai-status" + (type ? " " + type : "");
  }

  document.getElementById("aiGenerateBtn").addEventListener("click", function () {
    var promptText = document.getElementById("aiPromptInput").value.trim();
    if (!promptText) {
      setAiStatus("Enter a prompt first", "error");
      return;
    }

    var dataStr = dataEditor.getValue().trim();
    var btn = document.getElementById("aiGenerateBtn");
    btn.disabled = true;
    btn.textContent = "Generating...";
    setAiStatus("Generating template...", "loading");

    fetch(GENERATE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: dataStr, prompt: promptText }),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.error) {
          setAiStatus("Error: " + res.error, "error");
          return;
        }
        if (res.template) {
          // Pretty-print the template
          try {
            var parsed = JSON.parse(res.template);
            templateEditor.setValue(JSON.stringify(parsed, null, 2));
          } catch (e) {
            templateEditor.setValue(res.template);
          }
          setAiStatus("Template generated — click Run or it auto-runs", "success");
          runTransform();
        }
      })
      .catch(function (err) {
        setAiStatus("Failed: " + err.message, "error");
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = "Generate";
      });
  });

  // --- AI Collapse/Expand ---
  document.getElementById("aiCollapseBtn").addEventListener("click", function () {
    var body = document.getElementById("aiBody");
    var btn = this;
    if (body.classList.contains("collapsed")) {
      body.classList.remove("collapsed");
      btn.innerHTML = "&#9650;";
    } else {
      body.classList.add("collapsed");
      btn.innerHTML = "&#9660;";
    }
    setTimeout(function () { templateEditor.refresh(); }, 50);
  });

  // --- Keyboard shortcuts ---
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      runTransform();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      e.preventDefault();
      formatEditors();
    }
    // Ctrl+S = Save template
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      document.getElementById("saveTemplateBtn").click();
    }
  });

  // --- Resizable dividers ---
  var dividers = document.querySelectorAll(".divider");
  dividers.forEach(function (divider) {
    divider.addEventListener("mousedown", function (e) {
      e.preventDefault();
      var panels = document.querySelectorAll(".panel");
      var idx = parseInt(divider.getAttribute("data-index"));
      var leftPanel = panels[idx];
      var rightPanel = panels[idx + 1];
      var startX = e.clientX;
      var leftWidth = leftPanel.offsetWidth;
      var rightWidth = rightPanel.offsetWidth;

      function onMouseMove(e) {
        var dx = e.clientX - startX;
        var newLeftWidth = leftWidth + dx;
        var newRightWidth = rightWidth - dx;
        if (newLeftWidth > 100 && newRightWidth > 100) {
          leftPanel.style.flex = "none";
          rightPanel.style.flex = "none";
          leftPanel.style.width = newLeftWidth + "px";
          rightPanel.style.width = newRightWidth + "px";
        }
      }

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        dataEditor.refresh();
        templateEditor.refresh();
        resultEditor.refresh();
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });

  // --- Init ---
  loadTemplatesFromAPI();
  setTimeout(runTransform, 100);
})();
