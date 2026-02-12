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
  var ST_COMPLETIONS = {
    // ST.js control flow keys
    stKeys: [
      { text: '"{{#each }}": ', displayText: '#each — loop over array' },
      { text: '"{{#if }}": ', displayText: '#if — conditional' },
      { text: '"{{#elseif }}": ', displayText: '#elseif — else-if branch' },
      { text: '"{{#else}}": ', displayText: '#else — fallback branch' },
      { text: '"{{#merge}}": ', displayText: '#merge — merge objects' },
      { text: '"{{#concat}}": ', displayText: '#concat — concatenate arrays' },
      { text: '"{{#let}}": ', displayText: '#let — define local vars' },
      { text: '"{{ { ...this, } }}"', displayText: '{{ { ...this } }} — spread + add fields' },
    ],
    // String methods
    string: [
      { text: '.toUpperCase()', displayText: '.toUpperCase() — "abc" → "ABC"' },
      { text: '.toLowerCase()', displayText: '.toLowerCase() — "ABC" → "abc"' },
      { text: '.trim()', displayText: '.trim() — remove whitespace' },
      { text: '.trimStart()', displayText: '.trimStart() — trim leading whitespace' },
      { text: '.trimEnd()', displayText: '.trimEnd() — trim trailing whitespace' },
      { text: '.split()', displayText: '.split(sep) — string to array' },
      { text: '.replace()', displayText: '.replace(old, new) — replace first match' },
      { text: '.replaceAll()', displayText: '.replaceAll(old, new) — replace all' },
      { text: '.slice()', displayText: '.slice(start, end) — substring' },
      { text: '.substring()', displayText: '.substring(start, end) — extract part' },
      { text: '.charAt()', displayText: '.charAt(i) — char at index' },
      { text: '.charCodeAt()', displayText: '.charCodeAt(i) — char code' },
      { text: '.indexOf()', displayText: '.indexOf(str) — find position' },
      { text: '.lastIndexOf()', displayText: '.lastIndexOf(str) — find last position' },
      { text: '.includes()', displayText: '.includes(str) — check contains' },
      { text: '.startsWith()', displayText: '.startsWith(str) — check prefix' },
      { text: '.endsWith()', displayText: '.endsWith(str) — check suffix' },
      { text: '.match()', displayText: '.match(regex) — regex match' },
      { text: '.search()', displayText: '.search(regex) — regex search index' },
      { text: '.padStart()', displayText: '.padStart(len, ch) — pad start' },
      { text: '.padEnd()', displayText: '.padEnd(len, ch) — pad end' },
      { text: '.repeat()', displayText: '.repeat(n) — repeat n times' },
      { text: '.concat()', displayText: '.concat(str) — concatenate strings' },
      { text: '.at()', displayText: '.at(i) — char at index (supports negative)' },
      { text: '.length', displayText: '.length — string length' },
    ],
    // Array methods
    array: [
      { text: '.map()', displayText: '.map(fn) — transform each element' },
      { text: '.filter()', displayText: '.filter(fn) — keep matching elements' },
      { text: '.reduce()', displayText: '.reduce(fn, init) — reduce to value' },
      { text: '.find()', displayText: '.find(fn) — first matching element' },
      { text: '.findIndex()', displayText: '.findIndex(fn) — index of first match' },
      { text: '.some()', displayText: '.some(fn) — any match?' },
      { text: '.every()', displayText: '.every(fn) — all match?' },
      { text: '.forEach()', displayText: '.forEach(fn) — iterate (no return)' },
      { text: '.join()', displayText: '.join(sep) — array to string' },
      { text: '.includes()', displayText: '.includes(val) — check membership' },
      { text: '.indexOf()', displayText: '.indexOf(val) — find index' },
      { text: '.lastIndexOf()', displayText: '.lastIndexOf(val) — last index' },
      { text: '.slice()', displayText: '.slice(start, end) — subarray' },
      { text: '.concat()', displayText: '.concat(arr) — merge arrays' },
      { text: '.flat()', displayText: '.flat(depth) — flatten nested arrays' },
      { text: '.flatMap()', displayText: '.flatMap(fn) — map then flatten' },
      { text: '.sort()', displayText: '.sort(fn) — sort in place' },
      { text: '.reverse()', displayText: '.reverse() — reverse in place' },
      { text: '.fill()', displayText: '.fill(val, start, end) — fill with value' },
      { text: '.at()', displayText: '.at(i) — element at index (neg ok)' },
      { text: '.length', displayText: '.length — array length' },
      { text: '.toString()', displayText: '.toString() — to string' },
    ],
    // Number / Math
    math: [
      { text: 'Math.round()', displayText: 'Math.round(n) — round to nearest' },
      { text: 'Math.floor()', displayText: 'Math.floor(n) — round down' },
      { text: 'Math.ceil()', displayText: 'Math.ceil(n) — round up' },
      { text: 'Math.abs()', displayText: 'Math.abs(n) — absolute value' },
      { text: 'Math.max()', displayText: 'Math.max(a, b, ...) — maximum' },
      { text: 'Math.min()', displayText: 'Math.min(a, b, ...) — minimum' },
      { text: 'Math.pow()', displayText: 'Math.pow(base, exp) — power' },
      { text: 'Math.sqrt()', displayText: 'Math.sqrt(n) — square root' },
      { text: 'Math.random()', displayText: 'Math.random() — 0 to 1 random' },
      { text: 'Math.trunc()', displayText: 'Math.trunc(n) — remove decimals' },
      { text: 'Math.sign()', displayText: 'Math.sign(n) — -1, 0, or 1' },
      { text: 'Math.PI', displayText: 'Math.PI — 3.14159...' },
    ],
    // Number methods
    number: [
      { text: '.toFixed()', displayText: '.toFixed(digits) — format decimals' },
      { text: '.toString()', displayText: '.toString(radix) — to string' },
      { text: '.toPrecision()', displayText: '.toPrecision(n) — n significant digits' },
      { text: '.toLocaleString()', displayText: '.toLocaleString() — locale format' },
      { text: 'Number()', displayText: 'Number(val) — convert to number' },
      { text: 'Number.isInteger()', displayText: 'Number.isInteger(n) — check integer' },
      { text: 'Number.isFinite()', displayText: 'Number.isFinite(n) — check finite' },
      { text: 'Number.isNaN()', displayText: 'Number.isNaN(n) — check NaN' },
      { text: 'parseInt()', displayText: 'parseInt(str, radix) — parse integer' },
      { text: 'parseFloat()', displayText: 'parseFloat(str) — parse float' },
    ],
    // Object / JSON
    object: [
      { text: 'Object.keys()', displayText: 'Object.keys(obj) — key array' },
      { text: 'Object.values()', displayText: 'Object.values(obj) — value array' },
      { text: 'Object.entries()', displayText: 'Object.entries(obj) — [k,v] pairs' },
      { text: 'Object.assign()', displayText: 'Object.assign(target, src) — merge' },
      { text: 'Object.fromEntries()', displayText: 'Object.fromEntries(arr) — entries to obj' },
      { text: 'JSON.stringify()', displayText: 'JSON.stringify(val) — serialize' },
      { text: 'JSON.parse()', displayText: 'JSON.parse(str) — deserialize' },
    ],
    // Date
    date: [
      { text: 'new Date()', displayText: 'new Date(val) — create Date' },
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
      { text: ' ? "" : ""', displayText: 'ternary — condition ? a : b' },
      { text: ' || ""', displayText: '|| fallback — default value' },
      { text: 'Boolean()', displayText: 'Boolean(val) — to boolean' },
      { text: 'String()', displayText: 'String(val) — to string' },
      { text: 'Array.isArray()', displayText: 'Array.isArray(val) — check array' },
      { text: 'Array.from()', displayText: 'Array.from(iterable) — to array' },
      { text: 'encodeURIComponent()', displayText: 'encodeURIComponent(str) — encode URI' },
      { text: 'decodeURIComponent()', displayText: 'decodeURIComponent(str) — decode URI' },
      { text: 'isNaN()', displayText: 'isNaN(val) — check not-a-number' },
      { text: 'isFinite()', displayText: 'isFinite(val) — check finite' },
    ],
  };

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

    // Find the current word/token being typed
    var start = end;
    while (start > 0 && /[\w.$#]/.test(line.charAt(start - 1))) {
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

      // If user typed a dot, suggest instance methods
      if (before.charAt(end - token.length - 1) === ".") {
        var dotToken = token;
        var allDotMethods = [].concat(
          ST_COMPLETIONS.string,
          ST_COMPLETIONS.array,
          ST_COMPLETIONS.number,
          ST_COMPLETIONS.date
        );
        allDotMethods.forEach(function (c) {
          var t = c.text.replace(/^\./, "");
          if (!dotToken || t.toLowerCase().indexOf(dotToken) > -1) {
            list.push({ text: t, displayText: c.displayText });
          }
        });
      }
      // If user typed "Math." suggest Math methods
      else if (before.indexOf("Math.") > -1 && before.lastIndexOf("Math.") > mustacheStart) {
        ST_COMPLETIONS.math.forEach(function (c) {
          var t = c.text.replace(/^Math\./, "");
          if (!token || t.toLowerCase().indexOf(token) > -1) {
            list.push({ text: t, displayText: c.displayText });
          }
        });
      }
      // If user typed "Object." or "JSON."
      else if (before.indexOf("Object.") > -1 && before.lastIndexOf("Object.") > mustacheStart) {
        ST_COMPLETIONS.object.forEach(function (c) {
          if (c.text.startsWith("Object.")) {
            var t = c.text.replace(/^Object\./, "");
            if (!token || t.toLowerCase().indexOf(token) > -1) {
              list.push({ text: t, displayText: c.displayText });
            }
          }
        });
      }
      else if (before.indexOf("JSON.") > -1 && before.lastIndexOf("JSON.") > mustacheStart) {
        ST_COMPLETIONS.object.forEach(function (c) {
          if (c.text.startsWith("JSON.")) {
            var t = c.text.replace(/^JSON\./, "");
            if (!token || t.toLowerCase().indexOf(token) > -1) {
              list.push({ text: t, displayText: c.displayText });
            }
          }
        });
      }
      else {
        // General — suggest everything relevant
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

  var templateEditorConfig = Object.assign({}, editorConfig, {
    extraKeys: {
      "Ctrl-Space": function (cm) { cm.showHint({ hint: stHint, completeSingle: false }); },
      "'.'": function (cm) {
        cm.replaceSelection(".");
        // Auto-show after dot if inside {{ }}
        var cursor = cm.getCursor();
        var line = cm.getLine(cursor.line);
        var before = line.substring(0, cursor.ch);
        var mustacheStart = before.lastIndexOf("{{");
        var mustacheEnd = before.lastIndexOf("}}");
        if (mustacheStart > -1 && mustacheStart > mustacheEnd) {
          setTimeout(function () { cm.showHint({ hint: stHint, completeSingle: false }); }, 50);
        }
      },
    },
  });

  var dataEditor = CodeMirror.fromTextArea(document.getElementById("dataEditor"), editorConfig);
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
