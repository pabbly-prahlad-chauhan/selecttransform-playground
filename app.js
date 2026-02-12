// =============================================
// SelectTransform Playground - Main Application
// =============================================

(function () {
  "use strict";

  // --- Cloud Proxy URL ---
  // If running on Vercel, use relative path; otherwise use full Vercel URL
  var CLOUD_PROXY_URL = (function () {
    var host = window.location.hostname;
    if (host.includes("vercel.app")) {
      return "/api/proxy";
    }
    // Default: deployed Vercel proxy
    return "https://st-playground.vercel.app/api/proxy";
  })();

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
  // SAVED TEMPLATES (localStorage)
  // =============================================
  var STORAGE_KEY = "st_playground_saved_templates";

  function getSavedTemplates() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveTemplate(name, data, template) {
    var saved = getSavedTemplates();
    saved[name] = { data: data, template: template };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }

  function deleteTemplate(name) {
    var saved = getSavedTemplates();
    delete saved[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }

  function refreshSavedDropdown() {
    var select = document.getElementById("savedTemplates");
    var saved = getSavedTemplates();
    var names = Object.keys(saved);

    // Clear old saved options
    while (select.options.length > 1) {
      select.remove(1);
    }

    names.forEach(function (name) {
      var opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });

    // Show/hide delete button
    document.getElementById("deleteTemplateBtn").style.display = names.length > 0 ? "inline-block" : "none";
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

  var dataEditor = CodeMirror.fromTextArea(document.getElementById("dataEditor"), editorConfig);
  var templateEditor = CodeMirror.fromTextArea(document.getElementById("templateEditor"), editorConfig);
  var resultEditor = CodeMirror.fromTextArea(document.getElementById("resultEditor"),
    Object.assign({}, editorConfig, { readOnly: true })
  );

  // Load default example
  dataEditor.setValue(EXAMPLES.basic.data);
  templateEditor.setValue(EXAMPLES.basic.template);

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

      var data = JSON.parse(dataStr);
      var template = JSON.parse(templateStr);

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
    try {
      var d = JSON.parse(dataEditor.getValue());
      dataEditor.setValue(JSON.stringify(d, null, 2));
    } catch (e) { /* ignore parse errors */ }
    try {
      var t = JSON.parse(templateEditor.getValue());
      templateEditor.setValue(JSON.stringify(t, null, 2));
    } catch (e) { /* ignore parse errors */ }
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
      var saved = getSavedTemplates();
      if (saved[key]) {
        dataEditor.setValue(saved[key].data);
        templateEditor.setValue(saved[key].template);
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

    saveTemplate(name, data, template);
    refreshSavedDropdown();

    // Select the newly saved template
    document.getElementById("savedTemplates").value = name;
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
      deleteTemplate(name);
      refreshSavedDropdown();
      select.value = "";
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
  refreshSavedDropdown();
  setTimeout(runTransform, 100);
})();
