// GitHub-backed CRUD for shared templates
// Templates are stored in templates.json in the repo

const REPO_OWNER = "pabbly-prahlad-chauhan";
const REPO_NAME = "selecttransform-playground";
const FILE_PATH = "templates.json";
const BRANCH = "main";

function corsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function getFileFromGitHub() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const resp = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!resp.ok) throw new Error("Failed to read templates from GitHub");
  const data = await resp.json();
  const content = JSON.parse(
    Buffer.from(data.content, "base64").toString("utf-8")
  );
  return { content, sha: data.sha };
}

async function updateFileOnGitHub(content, sha, message) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const body = JSON.stringify({
    message,
    content: Buffer.from(JSON.stringify(content, null, 2) + "\n").toString(
      "base64"
    ),
    sha,
    branch: BRANCH,
  });

  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error("GitHub update failed: " + err);
  }
  return await resp.json();
}

export default async function handler(req, res) {
  corsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // GET — list all templates
    if (req.method === "GET") {
      const { content } = await getFileFromGitHub();
      return res.status(200).json(content);
    }

    // POST — add a new template
    if (req.method === "POST") {
      const { name, data, template } = req.body || {};
      if (!name || !data || !template) {
        return res
          .status(400)
          .json({ error: "Missing name, data, or template" });
      }

      const { content, sha } = await getFileFromGitHub();

      // Check if name already exists — overwrite it
      const idx = content.templates.findIndex((t) => t.name === name);
      const entry = {
        name,
        data,
        template,
        updatedAt: new Date().toISOString(),
      };

      if (idx > -1) {
        content.templates[idx] = entry;
      } else {
        content.templates.push(entry);
      }

      await updateFileOnGitHub(content, sha, `Add/update template: ${name}`);
      return res.status(200).json({ success: true, templates: content });
    }

    // DELETE — remove a template by name
    if (req.method === "DELETE") {
      const { name } = req.body || {};
      if (!name) {
        return res.status(400).json({ error: "Missing template name" });
      }

      const { content, sha } = await getFileFromGitHub();
      content.templates = content.templates.filter((t) => t.name !== name);

      await updateFileOnGitHub(content, sha, `Delete template: ${name}`);
      return res.status(200).json({ success: true, templates: content });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
