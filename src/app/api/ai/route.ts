import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { agentId, stepId, context, history, mode, testContext } = body;

    if (mode === "initial-guide") {
      const { loadInitialGuide } = await import("@/lib/ai-client");
      const response = await loadInitialGuide(agentId, stepId);
      return NextResponse.json({ response });
    }

    if (mode === "testing-suggestion") {
      const { generateTestingSuggestions } = await import("@/lib/ai-client");
      const { suggestions, usage } = await generateTestingSuggestions(context, testContext);
      return NextResponse.json({ suggestions, usage });
    }

    if (mode === "dor-suggestion") {
      const { generateDoRStepSuggestions } = await import("@/lib/ai-client");
      const { suggestions, usage } = await generateDoRStepSuggestions(context);
      return NextResponse.json({ suggestions, usage });
    }

    const { generateResponse } = await import("@/lib/ai-client");
    const { text, usage } = await generateResponse(agentId, stepId, context, history);
    
    return NextResponse.json({ response: text, usage });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
