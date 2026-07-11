# Oucheck — MVP del check

Foto → análisis real de tu look → veredicto. Sin armario, sin login, sin base de datos.

## Qué hay dentro
- `index.html` — la app (una pantalla).
- `api/check.js` — el servidor (una función). Guarda tu API key y analiza la foto de verdad.

## Desplegar (15 min, sin saber programar)

**1. API key de Anthropic**
- Entra en https://console.anthropic.com → API Keys → crea una.
- Añade saldo en Billing (unos pocos euros bastan para cientos de tests).
- Copia la key (empieza por `sk-ant-`). Guárdala.

**2. Subir a Vercel**
- Crea cuenta en https://vercel.com (gratis, con GitHub).
- Sube esta carpeta: la forma fácil es crear un repo en GitHub con estos archivos y en Vercel darle a **Add New → Project → Import**.
- (O instala la CLI: `npm i -g vercel`, entra en la carpeta y ejecuta `vercel`.)

**3. Meter la key**
- En Vercel → tu proyecto → **Settings → Environment Variables**.
- Nombre: `ANTHROPIC_API_KEY` · Valor: tu key `sk-ant-...` · Guarda.
- Vuelve a **Deployments** y haz **Redeploy** (para que coja la key).

**4. Listo**
- Vercel te da un link tipo `https://oucheck.vercel.app`. Ese es el que enseñas.

## Test anti-enlatado (hazlo tú primero)
Sube una foto con un look obviamente malo. Si el score sale alto y el texto no describe lo que ves de verdad → algo está roto. Debe describir tus prendas reales.

## Coste
El modelo por defecto es `claude-sonnet-5`. Para abaratar, en `api/check.js` cámbialo por `claude-haiku-4-5-20251001`.
