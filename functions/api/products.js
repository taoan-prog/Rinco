function verifyToken(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [pwd] = decoded.split(":");
    return pwd === env.ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = {};
  match[1].split("\n").forEach(line => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    val = val.replace(/^["']|["']$/g, "");
    fm[key] = val;
  });
  return fm;
}

export async function onRequestGet(context) {
  if (!verifyToken(context.request, context.env)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" }
    });
  }

  const { GITHUB_TOKEN, GITHUB_REPO } = context.env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const listRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/_products`, {
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "Rinco-Admin",
        "Accept": "application/vnd.github+json"
      }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      return new Response(JSON.stringify({ error: "GitHub API error: " + errText }), {
        status: 500, headers: { "Content-Type": "application/json" }
      });
    }

    const files = await listRes.json();
    const products = [];

    for (const file of files) {
      if (!file.name.endsWith(".md")) continue;
      const contentRes = await fetch(file.download_url);
      const text = await contentRes.text();
      const fm = parseFrontmatter(text);
      if (fm) {
        products.push({
          id: file.name.replace(".md", ""),
          ...fm
        });
      }
    }

    products.sort((a, b) => a.id.localeCompare(b.id));

    return new Response(JSON.stringify({ products }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
