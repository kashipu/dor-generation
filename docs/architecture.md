# Arquitectura del Proyecto: Orchestrator App

Este documento detalla la estructura, tecnologías y patrones de diseño utilizados en el proyecto `orchestrator-app`, permitiendo su replicación en futuros desarrollos.

## 🚀 Stack Tecnológico

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS 4
- **IA**: Google Generative AI (Gemini SDK)
- **Iconos**: Lucide React
- **Runtime**: Node.js / Bun

---

## 📁 Estructura del Proyecto

```text
orchestrator-app/
├── src/
│   ├── app/                # Rutas y APIs (Next.js App Router)
│   │   ├── api/            # Endpoints backend (Health, Experiments, AI)
│   │   ├── layout.tsx      # Estructura global (Sidebar, Navbar)
│   │   └── page.tsx        # Dashboard principal
│   ├── components/         # Componentes de UI
│   │   ├── ui/             # Componentes base (Button, Card, etc.)
│   │   └── wizard/         # Lógica y UI del asistente de experimentos
│   ├── lib/                # Lógica de negocio y utilidades
│   │   ├── ai-client.ts    # Cliente de Gemini y carga de prompts
│   │   ├── file-system.ts  # Manejo de archivos (.md) en /experiments
│   │   ├── types.ts        # Definiciones de tipos globales
│   │   └── experiment-types.ts # Definiciones de tipos de experimentos
├── prompts/                # Plantillas de prompts para la IA (.md)
├── experiments/            # Almacenamiento de experimentos generados (.md)
├── public/                 # Assets estáticos
└── .env.local              # Variables de entorno (GEMINI_API_KEY)
```

---

## 🧠 Componentes Críticos

### 1. Orquestación de IA (`src/lib/ai-client.ts`)
Utiliza el SDK de Google para interactuar con Gemini. 
- **Modelo preferido**: `gemini-flash-lite-latest`.
- **Gestión de Prompts**: Los prompts no están "hardcodeados"; se cargan dinámicamente desde la carpeta `/prompts` como archivos Markdown, lo que facilita su edición sin tocar el código.

### 2. Gestión de Persistencia (`src/lib/file-system.ts`)
El proyecto no utiliza una base de datos tradicional. En su lugar:
- Los experimentos se guardan como archivos `.md` en la carpeta `/experiments`.
- Se utiliza el módulo `fs/promises` para operaciones asíncronas de lectura/escritura.

### 3. State Management (`src/components/wizard/WizardContext.tsx`)
Utiliza **React Context** para manejar el estado complejo del asistente (Wizard), permitiendo que múltiples pasos compartan información del experimento actual.

---

## 🛠️ Pasos para Replicar

Para crear un proyecto similar desde cero, sigue estos pasos:

### 1. Inicialización
```bash
npx create-next-app@latest my-orchestrator --typescript --tailwind --eslint
# Instalar dependencias clave
npm install @google/generative-ai lucide-react clsx tailwind-merge
```

### 2. Configuración de IA
Crea un archivo `.env.local` con tu API Key:
```env
GEMINI_API_KEY=tu_api_key_aqui
```

### 3. Implementación del Cliente de IA
Crea un helper para cargar prompts y llamar al modelo. Asegúrate de tener una carpeta `prompts/` en la raíz.

### 4. Sistema de Archivos
Implementa rutas de API en `src/app/api` que lean y escriban en una carpeta local para "emular" una base de datos de documentos.

### 5. Interfaz de Usuario (Dashboard)
Usa una arquitectura de componentes "Shadcn-like" para mantener la UI limpia y profesional. Centraliza la lógica de navegación del asistente en un `Context`.

---

## 💡 Mejores Prácticas Observadas
1. **Separación de Prompts**: Mantener la "lógica de pensamiento" de la IA en archivos Markdown fuera del código fuente.
2. **Typescript Strict**: Uso riguroso de interfaces para asegurar que la estructura de los experimentos sea consistente.
3. **UI Responsiva y Animada**: Uso de CSS nativo de Tailwind y componentes modulares para un sentimiento premium.
