import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs/promises";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "\n❌ ERROR: GEMINI_API_KEY no está configurada.\n" +
    "Por favor, crea un archivo .env.local en la raíz del proyecto con:\n\n" +
    "  GEMINI_API_KEY=tu_api_key_aqui\n\n" +
    "Puedes obtener tu API key en: https://aistudio.google.com/apikey\n"
  );
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function loadPrompt(agentId: string, stepId: string): Promise<string> {
  const promptPath = path.join(process.cwd(), "prompts", agentId, `${stepId}.md`);
  try {
    return await fs.readFile(promptPath, "utf-8");
  } catch (error) {
    console.error(`Error loading prompt: ${promptPath}`, error);
    return "";
  }
}

export async function loadInitialGuide(agentId: string, stepId: string): Promise<string> {
  const guidePath = path.join(process.cwd(), "prompts", agentId, "guides", `${stepId}.md`);
  try {
    return await fs.readFile(guidePath, "utf-8");
  } catch (error) {
    console.error(`Error loading guide: ${guidePath}`, error);
    return "_No hay guía disponible para este paso._";
  }
}

interface ChatHistoryItem {
  role: string;
  content: string;
}

export async function generateResponse(
  agentId: string, 
  stepId: string, 
  userContext: string, 
  history: ChatHistoryItem[] = []
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    const systemPrompt = await loadPrompt(agentId, "system");
    const stepPrompt = await loadPrompt(agentId, stepId);
    
    if (!systemPrompt || !stepPrompt) {
      throw new Error(`Missing prompts for agent: ${agentId}, step: ${stepId}`);
    }

    const historyContext = history.length > 0 
      ? "\n\n### INFORMACIÓN DE PASOS ANTERIORES PREVIAMENTE VALIDADA:\n" + 
        history.map(h => h.content).join("\n\n") 
      : "";
    
    const fullPrompt = `${systemPrompt}\n\n${stepPrompt}${historyContext}\n\n### ENTRADA DEL USUARIO A VALIDAR:\n${userContext}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2,
      },
    });

    const response = await result.response;
    const text = response.text();
    const usage = response.usageMetadata;
    
    if (!text) {
      throw new Error("Empty response from AI");
    }
    
    return { text, usage };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
    console.error("AI Generation Error details:", error);

    if (errorMessage.includes("403") || errorMessage.includes("unregistered callers")) {
      throw new Error(
        "API Key no válida o no configurada. " +
        "Asegúrate de tener GEMINI_API_KEY en tu archivo .env.local"
      );
    }

    if (errorMessage.includes("404") || errorMessage.includes("not found")) {
      throw new Error(`Model not found or unavailable. Trace: ${errorMessage}`);
    }

    throw new Error(errorMessage);
  }
}

export async function generateTestingSuggestions(dorContext: string, currentTestContext?: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const systemPrompt = await loadPrompt("dor", "system");
    
    const fullPrompt = `${systemPrompt}
    
### CONTEXTO DEL DOR (Definition of Ready) FINALIZADO:
${dorContext}

${currentTestContext ? `### ESTRATEGIA DE TESTEO ACTUAL:\n${currentTestContext}\n` : ""}

### TAREA:
Propón un Protocolo de Testeo detallado siguiendo estrictamente esta estructura. 
IMPORTANTE: No uses los ejemplos del Banco de Bogotá como texto literal para las preguntas; adáptalos específicamente al contexto de la funcionalidad descrita en el DoR.
IMPORTANTE: NO USES formato Markdown (###, **, etc.) en los valores de este JSON, ya que se mostrarán en campos de texto plano. Usa saltos de línea y mayúsculas para separar secciones.

Debes devolver un JSON con la siguiente estructura:
{
  "step-testing-strategy": "Objetivo del protocolo:\\n[Verbo infinitivo específico]\\n\\nHipótesis:\\n- Hipótesis 1 (Valor): [Hipótesis de valor]\\n- Hipótesis 2 (Usabilidad): [Hipótesis de usabilidad]\\n\\nTipo de testeo sugerido:\\n[Moderado/No moderado, Remoto/Presencial]",
  "step-testing-config": "Muestra esperada:\\n- Cantidad sugerida: [5-8 usuarios]\\n- Perfil del usuario: [Perfil detallado]\\n- Características importantes: [Criterios específicos]\\n\\nInterrogantes de investigación:\\nPreguntas Cuantitativas:\\n- [Pregunta sobre eficiencia/tiempo]\\n- [Pregunta sobre happy path]\\n\\nPreguntas Cualitativas:\\n- [Pregunta sobre claridad de textos]\\n- [Pregunta sobre percepción de valor]",
  "step-testing-execution": "Indicadores de éxito:\\n- [Tasa de éxito > 80%]: [Justificación]\\n- [Tiempo promedio < X min]: [Justificación]\\n\\nMisiones (Jobs to be Done):\\n- Misión 1: [Contexto + Acción específica]\\n- Misión 2: [Contexto + Acción específica]\\n\\nGuion de apertura sugerido:\\nHola, mi nombre es ________ del Banco de Bogotá, del área de experiencia de usuario. Gracias por atendernos, para nosotros es indispensable conocer qué piensan nuestros clientes.\\n\\nContexto del testeo: [Párrafo breve explicando qué vamos a probar hoy basado en el DoR].\\n\\nEn este espacio no vamos a venderte nada, ni pedirte información delicada, solo queremos conocer tu opinión honesta. ¿Tienes alguna pregunta antes de empezar?\\n\\n¿Nos autorizas grabar esta sesión con fines investigativos? Excelente, primero cuéntanos un poco sobre ti."
}

Asegúrate de que:
- Las hipótesis sean testeables.
- El tipo de testeo sea coherente con la complejidad del DoR.
- Los interrogantes se dividan claramente en Cuantitativos y Cualitativos.

Responde ÚNICAMENTE con el objeto JSON.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    const usage = response.usageMetadata;
    
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return { suggestions: JSON.parse(cleanJson), usage };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
    console.error("Error generating suggestions", error);

    if (errorMessage.includes("403") || errorMessage.includes("unregistered callers")) {
      throw new Error(
        "API Key no válida o no configurada. " +
        "Asegúrate de tener GEMINI_API_KEY en tu archivo .env.local"
      );
    }

    throw error;
  }
}

export async function generateDoRStepSuggestions(contextAndJustification: string) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const systemPrompt = await loadPrompt("dor", "system");
    
    const fullPrompt = `${systemPrompt}
    
### CONTEXTO Y JUSTIFICACIÓN PROPORCIONADOS:
${contextAndJustification}

### TAREA:
Basado en el contexto y la justificación anteriores, propón un borrador inicial para los siguientes 3 pasos del DoR. 
IMPORTANTE: NO USES formato Markdown (###, **, etc.) en los valores de este JSON. Usa saltos de línea y mayúsculas para jerarquía.

Debes devolver un JSON con la siguiente estructura:
{
  "step-objectives": "OBJETIVO GENERAL\\n[Verbo infinitivo + Qué + Para qué]...",
  "step-objectives-specific": "OBJETIVOS ESPECÍFICOS\\n- [Objetivo 1]\\n- [Objetivo 2]...",
  "step-hypotheses": "HIPÓTESIS DE VALOR\\n- [Hipótesis 1]\\n- [Hipótesis 2]..."
}

Asegúrate de que las propuestas sean técnicamente sólidas y coherentes con la problemática descrita.
Responde ÚNICAMENTE con el objeto JSON.`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    const usage = response.usageMetadata;
    
    const cleanJson = text.replace(/```json|```/g, "").trim();
    return { suggestions: JSON.parse(cleanJson), usage };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown AI error";
    console.error("Error generating DoR suggestions", error);

    if (errorMessage.includes("403") || errorMessage.includes("unregistered callers")) {
      throw new Error(
        "API Key no válida o no configurada. " +
        "Asegúrate de tener GEMINI_API_KEY en tu archivo .env.local"
      );
    }

    throw error;
  }
}
