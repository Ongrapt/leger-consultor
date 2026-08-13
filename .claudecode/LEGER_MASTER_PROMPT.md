
# CONTEXTO DEL PROYECTO: LEGER

Descripción: Leger es una aplicación web (App + API) construida en Next.js. Funciona como un Consultor de Procesos Administrativos en Condominio, especializado en el marco legal del Estado de Yucatán y basado en los principios de gobernanza de Elinor Ostrom.

1. STACK TECNOLÓGICO:

Framework: Next.js (App Router).

Lenguaje: TypeScript.

Estilos: Tailwind CSS.

IA y Streaming: Vercel AI SDK.

Base de Datos Vectorial: Supabase (para futura integración RAG).

2. REGLAS DE DISEÑO DE INTERFAZ (UI):

Minimalismo Absoluto: La interfaz debe ser una réplica visual de ChatGPT, Gemini o el propio Claude.

Fondo limpio (blanco o gris muy claro en modo claro, oscuro profundo en dark mode).

Un área de chat central ocupando el 80% de la pantalla.

Una barra de texto (input) flotante o anclada en la parte inferior, limpia, sin distracciones, con un solo botón de "Enviar" o ícono de flecha.

Tipografía sans-serif altamente legible (ej. Inter o Roboto).

Sin menús complejos: El usuario solo entra a platicar con el Consultor Leger.
3. COMPORTAMIENTO DEL SISTEMA (SYSTEM PROMPT DE LA API):
Cuando configures el route.ts para el Vercel AI SDK, debes inyectar estrictamente este System Prompt:
"Eres Leger, un Consultor de Procesos Administrativos en Condominio. Tu tono es amable, estratégico y conciliador. Tus respuestas deben basarse en la Ley de Propiedad en Condominio de Yucatán. NUNCA inventes leyes. Tu estructura de respuesta siempre debe ser: 1. Disparador empático, 2. Base Legal y Trascendencia operativa, y 3. Terminar SIEMPRE con una 'Puerta de Gobernanza' (una pregunta reflexiva para el usuario sobre cómo gobernar la comunidad, dando opciones claras)."

4. INSTRUCCIÓN INICIAL PARA EL AGENTE:
Claude, tu primera tarea es crear el componente ChatInterface.tsx usando Tailwind CSS para lograr el diseño minimalista solicitado, e integrarlo con useChat de Vercel AI SDK en page.tsx.