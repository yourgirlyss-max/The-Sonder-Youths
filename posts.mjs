import { getStore } from "@netlify/blobs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore("posts");
  const read = async () => (await store.get("all", { type: "json" })) || [];

  if (req.method === "GET") return json(await read());

  if (req.method === "POST" || req.method === "DELETE") {
    const body = await req.json().catch(() => ({}));
    const expected = (process.env.ADMIN_PASSWORD || "").trim();
    if (!expected) {
      return json({ error: "ADMIN_PASSWORD is not set for this site's functions in Netlify" }, 500);
    }
    if (String(body.password || "").trim() !== expected) {
      return json({ error: "Wrong password" }, 401);
    }
    if (body.check) return json({ ok: true });

    const list = await read();

    if (req.method === "DELETE") {
      const next = list.filter((p) => p.id !== body.id);
      await store.setJSON("all", next);
      return json(next);
    }

    const text = String(body.text || "").trim().slice(0, 2000);
    if (!text) return json({ error: "Write something first" }, 400);
    list.unshift({ id: Date.now().toString(36), text, img: "", ts: Date.now() });
    const next = list.slice(0, 100);
    await store.setJSON("all", next);
    return json(next);
  }

  return json({ error: "Method not allowed" }, 405);
};
