# Leger

Leger es un consultor conversacional de procesos administrativos en
condominio, enfocado en el marco legal del Estado de Yucatán y en principios
de gobernanza colectiva (Elinor Ostrom). La interfaz es un chat minimalista;
el backend responde vía streaming usando el Vercel AI SDK.

> Nota: este `README.md` documenta cómo correr y navegar el proyecto. El
> comportamiento previsto del motor de inferencia legal (máquina de estados,
> manejo de corpus, protocolos de error) está documentado por separado en
> [`SKILL.md`](./SKILL.md) — no se mezcla aquí a propósito.

## Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Estilos:** Tailwind CSS v4
- **IA / streaming:** Vercel AI SDK (`ai`, `@ai-sdk/react`), vía Vercel AI
  Gateway (`AI_GATEWAY_API_KEY`)
- **Validación:** Zod

## Requisitos

- Node.js
- Una API key de [Vercel AI Gateway](https://vercel.com/docs/ai-gateway)

## Configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Variables de entorno (`.env.local`):
   ```
   AI_GATEWAY_API_KEY=tu_api_key
   ```
3. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La app queda disponible en `http://localhost:3000`.

## Scripts

| Comando         | Descripción                        |
| --------------- | ----------------------------------- |
| `npm run dev`   | Servidor de desarrollo (Next.js)    |
| `npm run build` | Build de producción                 |
| `npm run start` | Sirve el build de producción        |
| `npm run lint`  | ESLint                              |

## Estructura

```
src/
  app/
    page.tsx           # Punto de entrada, renderiza ChatInterface
    layout.tsx
    globals.css
    api/chat/route.ts  # Endpoint de streaming (Vercel AI SDK + system prompt)
  components/
    ChatInterface.tsx  # UI de chat (useChat, estilo minimalista tipo ChatGPT/Claude)
```

## Estado actual vs. diseño objetivo

El endpoint `src/app/api/chat/route.ts` implementa hoy un system prompt de
una sola pasada (tono, base legal, estructura de respuesta en 3 partes,
cierre con "Puerta de Gobernanza"). El diseño objetivo del motor —descrito en
[`SKILL.md`](./SKILL.md) y en `metodo prompt.pdf`— es más completo: una
máquina de estados que exige reglamento interno y pruebas documentales antes
de compilar un argumento, con aislamiento estricto del corpus legal inyectado
frente al conocimiento del modelo. Esa lógica todavía no está implementada en
`route.ts`.

## Documentación interna

La carpeta [`.claudecode/`](./.claudecode) contiene notas de diseño del
proyecto (contexto general, reglas de UI, corpus legal) usadas como
referencia de trabajo; varias están aún vacías, pendientes de contenido.
