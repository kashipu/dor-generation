export type AgentId = "dor" | "research" | "experimentation";

export interface AgentConfig {
  id: AgentId;
  name: string;
  steps: string[];
}

const AGENTS: Record<AgentId, AgentConfig> = {
  dor: {
    id: "dor",
    name: "Agente de DoR",
    steps: ["step-context", "step-objectives", "step-hypotheses"],
  },
  research: {
    id: "research",
    name: "Agente de Research",
    steps: ["step-1", "step-2"],
  },
  experimentation: {
    id: "experimentation",
    name: "Agente de Experimentación",
    steps: ["step-1", "step-2"],
  },
};

export function getAgentConfig(id: AgentId): AgentConfig | undefined {
  return AGENTS[id];
}
