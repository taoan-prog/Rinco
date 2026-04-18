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

async function githubAPI(path, env, options = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "Rinco-Admin",
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}

async function getFileSHA(path, env) {
  const res = await githubAPI(`/contents/${path}`, env);
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha;
}

async function putFile(path, contentBase64, message, env) {
  const existingSHA = await getFileSHA(path, env);
  const body = {
    message,
    content: contentBase64,
    branch: "main"
  };
  if (existingSHA) body.sha = existingSHA;
  const res = await githubAPI(`/contents/${path}`, env, {
    method: "PUT",
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub PUT ${path}: ${errText}`);
  }
  return res.json();
}

async function deleteFile(path, message, env) {
  const sha = await getFileSHA(path, env);
  if (!sha) return;
  const res = await githubAPI(`/contents/${path}`, env, {
    method: "DELETE",
    body: JSON.stringify({ message, sha, branch: "main" })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub DELETE ${path}: ${errText}`);
  }
}

function encodeToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function buildMarkdown(data) {
  const escape = (s) => String(s || "").replace(/"/g, '\\"');
  return `---
title: "${escape(data.title)}"
code: "${escape(data.code)}"
category: "${escape(data.category)}"
image: ${data.image}
description: "${escape(data.description)}"
visible: ${data.visible}
---
`;
}

async function listProductIds(env) {
  const res = await githubAPI(`/contents/_products`, env);
  if (!res.ok) return [];
  const files = await res.json();
  return files.filter(f => f.name.endsWith(".md")).map(f => f.name.replace(".md", ""));
}

function generateNewId(existingIds) {
  const nums = existingIds
    .filter(id => /^p\d+$/.test(id))
    .map(id => parseInt(id.substring(1)))
    .sort((a, b) => b - a);
  const next = nums.length ? nums[0] + 1 : 1;
  return "p" + String(next).padStart(2, "0");
}

export async function onRequestPost(context) {
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
    const payload = await context.request.json();

    // DELETE
    if (payload.delete && payload.id) {
      await deleteFile(`_products/${payload.id}.md`, `Delete product ${payload.id}`, context.env);
      await rebuildIndex(context.env);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { "Content-Type": "application/json" }
      });
    }

    // CREATE or UPDATE
    let id = payload.id;
    if (!id) {
      const existing = await listProductIds(context.env);
      id = generateNewId(existing);
    }

    let imagePath = null;

    // Upload image if provided
    if (payload.imageBase64 && payload.imageFilename) {
      const ext = payload.imageFilename.split(".").pop().toLowerCase();
      imagePath = `images/${id}.${ext}`;
      await putFile(imagePath, payload.imageBase64, `Upload image for ${id}`, context.env);
    } else if (payload.id) {
      // Keep existing image path — read it from existing md file
      const res = await githubAPI(`/contents/_products/${payload.id}.md`, context.env);
      if (res.ok) {
        const data = await res.json();
        const text = atob(data.content.replace(/\n/g, ""));
        const match = text.match(/^image:\s*(.+)$/m);
        if (match) imagePath = match[1].trim().replace(/^["']|["']$/g, "");
      }
    }

    if (!imagePath) {
      return new Response(JSON.stringify({ error: "Image is required for new products" }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const md = buildMarkdown({
      title: payload.title,
      code: payload.code,
      category: payload.category,
      image: imagePath,
      description: payload.description || "",
      visible: payload.visible
    });

    await putFile(
      `_products/${id}.md`,
      encodeToBase64(md),
      payload.id ? `Update product ${id}` : `Create product ${id}`,
      context.env
    );

    // Rebuild public products-index.json
    await rebuildIndex(context.env);

    return new Response(JSON.stringify({ ok: true, id }), {
      status: 200, headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

async function rebuildIndex(env) {
  const res = await githubAPI(`/contents/_products`, env);
  if (!res.ok) return;
  const files = await res.json();
  const products = [];
  for (const file of files) {
    if (!file.name.endsWith(".md")) continue;
    const contentRes = await fetch(file.download_url);
    const text = await contentRes.text();
    const match = text.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;
    const fm = { id: file.name.replace(".md", "") };
    match[1].split("\n").forEach(line => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      fm[key] = val;
    });
    products.push(fm);
  }
  products.sort((a, b) => a.id.localeCompare(b.id));
  const indexJSON = JSON.stringify({ products }, null, 2);
  await putFile("products-index.json", encodeToBase64(indexJSON), "Rebuild product index", env);
}
