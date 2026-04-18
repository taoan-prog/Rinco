export async function onRequestPost(context) {
  try {
    const { password } = await context.request.json();
    const adminPassword = context.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (password !== adminPassword) {
      return new Response(JSON.stringify({ error: "Invalid password" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Simple token: base64(password + timestamp). Validated server-side each request.
    const token = btoa(adminPassword + ":" + Date.now());

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
