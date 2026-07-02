// Cloudflare Pages Function — proxy sécurisé vers l'API Claude (Anthropic).
// Fichier : functions/api/ai.js  ->  endpoint : /api/ai
// La clé API reste côté serveur (variable d'environnement), jamais dans le code du navigateur.

export async function onRequestPost({ request, env }) {
  try {
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Clé ANTHROPIC_API_KEY manquante (à définir dans Cloudflare Pages > Settings > Environment variables)." }, 500);
    }
    const body = await request.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) return json({ error: "Aucun message." }, 400);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.AI_MODEL || "claude-3-5-sonnet-latest",
        max_tokens: Math.min(Number(body.max_tokens) || 1024, 1500),
        system: typeof body.system === "string" ? body.system : "",
        messages,
      }),
    });

    const data = await r.json();
    return json(data, r.status);
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
