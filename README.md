# Escuela de Liderazgo: DoR Orchestrator & Testing Protocol

Este proyecto es una herramienta avanzada diseñada para estructurar planes de investigación (Definition of Ready - DoR) y generar protocolos de testeo automáticos de forma profesional y colaborativa.

## Propósito

El **DoR Orchestrator** guía a los investigadores y estrategas de producto a través de un flujo de trabajo lógico que garantiza la consistencia entre el contexto de negocio, los objetivos de investigación y la ejecución táctica.

## Características Principales

### 1. Wizard de Definición de Ready (DoR)
Un flujo de 5 pasos clave para consolidar la estrategia inicial:
- **Contexto:** Definición de la iniciativa y segmentación de usuarios.
- **Justicia de Negocio:** Alineación con OKRs y justificación estratégica.
- **Objetivo General:** Definición del norte de la investigación.
- **Objetivos Específicos:** Desglose SMART de acciones medibles.
- **Hipótesis:** Mapeo de supuestos bajo el formato SI/ENTONCES/PORQUE.

### 2. Generador Automático de Protocolo de Testeo
Sincronización automática que crea borradores detallados para:
- **Estrategia:** Tipo de testeo y validación de hipótesis de valor/usabilidad.
- **Configuración:** Definición de muestra, perfiles e interrogantes (Quant/Qual).
- **Ejecución:** Indicadores de éxito, misiones (JTBD) y guion institucional.

### 3. IA Co-Pilot (Modelo de Respuesta Híbrido)
Asistente inteligente integrado con el siguiente enfoque:
- **Análisis Ultra-Conciso:** Feedback instantáneo y recomendaciones breves en el panel lateral para agilidad del usuario.
- **Resultados Ricos en Contexto:** Generación de contenido profesional y exhaustivo listo para ser exportado y presentado.
- **Refinamiento Mágico:** Botones para aplicar sugerencias de la IA de forma individual o global en todo el DoR.

### 4. Interfaz Minimalista Institucional
- Diseño libre de distracciones visuales (Sin emojis).
- Tipografía clara en *Sentence Case* para legibilidad profesional.
- Reporte consolidado estilo "Ficha de Investigación" con visualización por tarjetas.

## Stack Tecnológico

- **Frontend:** Next.js (App Router), Tailwind CSS.
- **Iconografía:** Lucide React.
- **IA:** Google Gemini API (Modelos optimizados para velocidad y precisión).
- **Persistencia:** LocalStorage para guardado automático de sesiones.

## Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) en su navegador para interactuar con el orquestador.

---

Desarrollado para la Gobernanza de UX Research & Estrategia de Producto v1.2.
