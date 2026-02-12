export default async function handler(req, res) {
  // CORS headers — allow any origin (GitHub Pages, localhost, etc.)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const { url, method = "GET", headers = {}, body } = req.body || {};

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in request body." });
  }

  try {
    const fetchOptions = { method, headers: { ...headers } };

    if (body && method !== "GET" && method !== "HEAD") {
      fetchOptions.body = body;
    }

    const response = await fetch(url, fetchOptions);
    const text = await response.text();

    return res.status(200).json({
      status: response.status,
      body: text,
    });
  } catch (error) {
    return res.status(200).json({
      status: 500,
      body: "Proxy error: " + error.message,
    });
  }
}
