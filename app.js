// =============================================
// SelectTransform Playground - Main Application
// =============================================

(function () {
  "use strict";

  // --- Example Data ---
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

  // --- Editor Setup ---
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

  // --- Load default example ---
  dataEditor.setValue(EXAMPLES.basic.data);
  templateEditor.setValue(EXAMPLES.basic.template);

  // --- Transform Logic ---
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

  // --- Format JSON ---
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

  // --- Auto-run on change (debounced) ---
  var debounceTimer;
  function scheduleRun() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runTransform, 400);
  }

  dataEditor.on("change", scheduleRun);
  templateEditor.on("change", scheduleRun);

  // --- Button handlers ---
  document.getElementById("runBtn").addEventListener("click", runTransform);
  document.getElementById("formatBtn").addEventListener("click", formatEditors);
  document.getElementById("clearBtn").addEventListener("click", function () {
    resultEditor.setValue("");
    document.getElementById("resultStatus").textContent = "Cleared";
    document.getElementById("resultStatus").className = "panel-hint";
  });

  // --- Examples dropdown ---
  document.getElementById("examples").addEventListener("change", function () {
    var key = this.value;
    if (key && EXAMPLES[key]) {
      dataEditor.setValue(EXAMPLES[key].data);
      templateEditor.setValue(EXAMPLES[key].template);
      runTransform();
    }
    this.value = "";
  });

  // --- Keyboard shortcuts ---
  document.addEventListener("keydown", function (e) {
    // Ctrl+Enter = Run
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      runTransform();
    }
    // Ctrl+Shift+F = Format
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      e.preventDefault();
      formatEditors();
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
        // Refresh editors after resize
        dataEditor.refresh();
        templateEditor.refresh();
        resultEditor.refresh();
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });

  // --- Initial run ---
  setTimeout(runTransform, 100);
})();
