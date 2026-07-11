// Oucheck — función serverless. Guarda la API key y hace el análisis REAL de la foto.
// La key NUNCA está en el frontend. Se lee de la variable de entorno de Vercel.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Usa POST." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Falta ANTHROPIC_API_KEY en Vercel." });
  }

  const { image, mediaType, occasion } = req.body || {};
  if (!image || !mediaType) {
    return res.status(400).json({ error: "Falta la foto." });
  }

  const contexto = occasion?.trim()
    ? `El usuario va a: ${occasion.trim()}.`
    : `El usuario no ha dicho a dónde va. Juzga el look en general.`;

  // El prompt OBLIGA a describir lo que ve antes de juzgar → imposible dar veredicto enlatado.
  const prompt = `Eres un estilista brutalmente honesto dando una segunda opinión rápida antes de salir. ${contexto}

Mira la foto REAL. Primero identifica qué prendas, colores y ajuste ves de verdad. Luego juzga.

Sé sincero aunque duela. Si el look no funciona, dilo. No adules.

Responde SOLO con este JSON, sin texto extra, sin markdown:
{
  "descripcion": "1 frase: qué llevas puesto exactamente (prendas y colores que ves)",
  "score": número del 1 al 10,
  "funciona": ["punto concreto", "..."],
  "cambiar": ["cambio concreto y accionable", "..."],
  "veredicto": "1 frase directa: ¿sales así o no?"
}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5", // vision. Para bajar coste: "claude-haiku-4-5-20251001"
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: "La API falló.", detail });
    }

    const data = await r.json();
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "Respuesta no parseable.", raw: text });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: "Error de red.", detail: String(e) });
  }
}
