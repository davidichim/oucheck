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

Sigue estos pasos EN ORDEN:

1. DESCRIBE lo que ves de verdad: prendas, colores, ajuste, calzado, accesorios.

2. IDENTIFICA el código estético que el look intenta ejecutar (streetwear baggy, minimal, clásico, deportivo, y2k, grunge, old money, etc.). Esto es CRÍTICO: lo holgado, roto, desproporcionado o llamativo puede ser 100% intencional dentro de su código. NO lo penalices por defecto ni apliques reglas de sastrería clásica a un look que no las busca.

3. JUZGA LA EJECUCIÓN DENTRO DE ESE CÓDIGO. La pregunta no es "¿le queda bien según un sastre?" sino "¿alguien que domina este estilo diría que está bien ejecutado?". Un baggy enorme bien llevado es un 9. Un baggy mal proporcionado sigue siendo un 4 — pero por razones de streetwear, no de sastre.

4. JUZGA LA ADECUACIÓN A LA OCASIÓN. Si el usuario ha dicho a dónde va, esto MANDA sobre todo lo demás. Un look impecable pero equivocado para el sitio es un SUSPENSO, por bonito que sea. Traje para el gimnasio = 1 o 2, aunque el traje sea perfecto. Chándal para una boda = 1 o 2. La nota responde a "¿voy bien vestido para donde voy?", NO a "¿es bonita esta ropa?".

5. PUNTÚA. Si hay ocasión, la nota final la domina el paso 4. Si el usuario NO ha dicho a dónde va, ignora el paso 4 y puntúa solo por ejecución.

Sé sincero aunque duela. Si el look no funciona DENTRO DE SU PROPIO CÓDIGO, dilo. No adules, pero tampoco castigues un estilo por no ser convencional.

Responde SOLO con este JSON, sin texto extra, sin markdown:
{
  "descripcion": "1 frase natural que incluya el estilo que estás leyendo y las prendas concretas que ves",
  "score": número del 1 al 10,
  "funciona": ["qué funciona PARA LA OCASIÓN, no en abstracto"],
  "cambiar": ["cambio concreto y accionable"],
  "veredicto": "1 frase directa: ¿sales así A DONDE VAS o no?"
}

REGLA CRÍTICA sobre "funciona": solo lista cosas que sirvan PARA LA OCASIÓN. Si el look es inadecuado para el sitio, que la prenda sea bonita NO es un punto a favor: no lo pongas. Si de verdad NADA funciona para esa ocasión, devuelve "funciona" como array VACÍO []. Prefiero un array vacío a un elogio irrelevante.

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
