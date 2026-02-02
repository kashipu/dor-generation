"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TwoPaneCard from "./TwoPaneCard";
import { Loader2, Zap } from "lucide-react";

interface CardState {
  id: string;
  title: string;
  content: string;
  aiFeedback: string;
  status: "idle" | "loading" | "completed" | "error";
  attentionNeeded: boolean;
}

const STORAGE_KEY = "dor_orchestrator_session_v4";
const EXPIRATION_MS = 24 * 60 * 60 * 1000;

const CORE_DOR_CARDS: CardState[] = [
  { id: "step-context", title: "Contexto", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
  { id: "step-justification", title: "Justificación", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
  { id: "step-objectives", title: "Objetivo General", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
  { id: "step-objectives-specific", title: "Objetivos Específicos", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
  { id: "step-hypotheses", title: "Hipótesis", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
];

const TESTING_PROTOCOL_CARDS: CardState[] = [
  { id: "step-testing-strategy", title: "Estrategia: Objetivo, Hipótesis y Tipo", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
  { id: "step-testing-config", title: "Configuración: Muestra e Interrogantes", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
  { id: "step-testing-execution", title: "Ejecución: Indicadores, JTBD y Guion", content: "", aiFeedback: "", status: "idle", attentionNeeded: false },
];

export default function DoRWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [cards, setCards] = useState<CardState[]>(CORE_DOR_CARDS);
  const [isTestingEnabled, setIsTestingEnabled] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [totalTokens, setTotalTokens] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { cards: savedCards, activeStep: savedStep, isTestingEnabled: savedTesting, timestamp, totalTokens: savedTokens } = JSON.parse(saved);
        const now = Date.now();
        
        if (now - timestamp < EXPIRATION_MS) {
          setCards(savedCards);
          setActiveStep(savedStep);
          setIsTestingEnabled(savedTesting);
          setTotalTokens(savedTokens || 0);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error("Error loading session", e);
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to LocalStorage on changes
  useEffect(() => {
    if (isHydrated) {
      const session = {
        cards,
        activeStep,
        isTestingEnabled,
        totalTokens,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [cards, activeStep, isHydrated, isTestingEnabled, totalTokens]);

  const updateCard = (index: number, updates: Partial<CardState>) => {
    setCards(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const extractRefinedText = (feedback: string) => {
    if (!feedback) return "";
    
    // Mejoramos el regex para capturar TODO hasta la siguiente sección principal (Análisis o Recomendación)
    // En lugar de detenerse en cualquier '###', buscamos específicamente los headers de sección
    const regex = /### ✍️ Propuesta Refinada\s*\n+([\s\S]*?)(?=\n\s*###\s*(🎯|💡|🔍|✍️)|$)/i;
    const match = feedback.match(regex);
    if (match) return match[1].trim();
    
    const sections = feedback.split(/### .*\n/);
    if (sections.length > 2) return sections[2].trim();
    
    return feedback.trim();
  };

  const handleValidationSuccess = async (index: number) => {
    // 1. DoR Auto-drafting after step 2 (index 1)
    if (index === 1 && !cards[2].content) {
      setIsDrafting(true);
      try {
        const contextAndJustification = `${cards[0].title}: ${cards[0].content}\n${cards[1].title}: ${cards[1].content}`;
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: "dor",
            mode: "dor-suggestion",
            context: contextAndJustification
          }),
        });
        const { suggestions, usage } = await res.json();
        
        if (usage) setTotalTokens(prev => prev + usage.totalTokenCount);

        setCards(prev => prev.map(c => {
          if (suggestions[c.id]) {
            return { ...c, content: String(suggestions[c.id]) };
          }
          return c;
        }));
      } catch (e) {
        console.error("Error drafting DoR steps", e);
      } finally {
        setIsDrafting(false);
      }
    }

    // 2. Testing Protocol Auto-drafting after strategy validation (index 5)
    if (index === 5) {
      setIsDrafting(true);
      try {
        const dorSummary = cards.slice(0, CORE_DOR_CARDS.length)
          .map(c => `${c.title}: ${extractRefinedText(c.aiFeedback)}`)
          .join("\n");
        const testStrategy = extractRefinedText(cards[5].aiFeedback);

        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: "dor",
            mode: "testing-suggestion",
            context: dorSummary,
            testContext: testStrategy
          }),
        });

        const { suggestions, usage } = await res.json();
        if (usage) setTotalTokens(prev => prev + usage.totalTokenCount);

        setCards(prev => prev.map(c => {
          if (c.id === "step-testing-config" || c.id === "step-testing-execution") {
            return { ...c, content: String(suggestions[c.id]) };
          }
          return c;
        }));
      } catch (e) {
        console.error("Error refining testing suggestions", e);
      } finally {
        setIsDrafting(false);
      }
    }
  };

  const enableTesting = async () => {
    if (isTestingEnabled || isDrafting) return;
    setIsDrafting(true);

    try {
      const dorSummary = cards.slice(0, CORE_DOR_CARDS.length)
        .map(c => `${c.title}: ${extractRefinedText(c.aiFeedback)}`)
        .join("\n");

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "dor",
          mode: "testing-suggestion",
          context: dorSummary
        }),
      });

      const { suggestions, usage } = await res.json();
      if (usage) setTotalTokens(prev => prev + usage.totalTokenCount);

      const newTestingCards = TESTING_PROTOCOL_CARDS.map(card => ({
        ...card,
        content: suggestions[card.id] ? String(suggestions[card.id]) : ""
      }));

      setCards(prev => [...prev, ...newTestingCards]);
      setIsTestingEnabled(true);
      setActiveStep(CORE_DOR_CARDS.length);
      
      // Fetch guides for the newly added testing cards
      fetchInitialGuides(TESTING_PROTOCOL_CARDS);

      setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    } catch (e) {
      console.error("Error generating protocol draft", e);
      setCards(prev => [...prev, ...TESTING_PROTOCOL_CARDS]);
      setIsTestingEnabled(true);
      setActiveStep(CORE_DOR_CARDS.length);
    } finally {
      setIsDrafting(false);
    }
  };

  const fetchInitialGuides = async (cardList: CardState[]) => {
    setCards(prev => {
      const updated = [...prev];

      // Use a separate async block to fetch each guide and update state independently 
      cardList.forEach(async (card) => {
        const cardIndex = updated.findIndex(c => c.id === card.id);
        if (cardIndex !== -1 && !updated[cardIndex].aiFeedback) {
          try {
            const res = await fetch("/api/ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentId: "dor",
                stepId: card.id,
                mode: "initial-guide"
              }),
            });
            const { response } = await res.json();
            if (response) {
              setCards(current => current.map(c => 
                c.id === card.id ? { ...c, aiFeedback: response } : c
              ));
            }
          } catch (e) {
            console.error(`Error fetching guide for ${card.id}`, e);
          }
        }
      });

      return updated;
    });
  };

  useEffect(() => {
    if (isHydrated) {
      fetchInitialGuides(CORE_DOR_CARDS);
    }
  }, [isHydrated]);

  const handleReset = () => {
    if (confirm("¿Estás seguro de que quieres restablecer la sesión? Se borrará todo tu progreso.")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload(); 
    }
  };

  const handleApplyRefinement = (index: number) => {
    const refined = extractRefinedText(cards[index].aiFeedback || "");
    if (refined) {
      updateCard(index, { content: refined });
    }
  };

  const handleRefineAllDoR = () => {
    setCards(prev => prev.map((card, i) => {
      // Solo refinamos las de DoR (primeras 5) que tengan feedback de IA
      if (i < CORE_DOR_CARDS.length && card.aiFeedback) {
        const refined = extractRefinedText(card.aiFeedback);
        if (refined) return { ...card, content: refined };
      }
      return card;
    }));
  };

  const handleValidate = async (index: number) => {
    const card = cards[index];
    if (!card.content.trim()) return;

    updateCard(index, { status: "loading", attentionNeeded: false });

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "dor",
          stepId: card.id,
          context: card.content,
          history: cards.slice(0, index).map(c => ({ 
            role: "assistant", 
            content: `${c.title}: ${extractRefinedText(c.aiFeedback) || c.content}` 
          }))
        }),
      });
      
      const data = await res.json();
      if (data.usage) setTotalTokens(prev => prev + data.usage.totalTokenCount);

      if (!res.ok || !data.response) {
        updateCard(index, { 
          status: "error", 
          aiFeedback: `### ❌ Error de Validación\nNo se pudo obtener respuesta de la IA.\n\n${data.error || "Error desconocido"}` 
        });
        return;
      }
      
      const focusMatch = data.response.match(/\[FOCUS: (.*?)\]/);
      if (focusMatch) {
         const focusId = focusMatch[1];
         const focusIndex = cards.findIndex(c => c.id.includes(focusId));
         if (focusIndex !== -1) {
            updateCard(focusIndex, { attentionNeeded: true });
            updateCard(index, { status: "error", aiFeedback: data.response });
            return;
         }
      }

      updateCard(index, { 
        status: "completed", 
        aiFeedback: data.response,
        attentionNeeded: false 
      });

      await handleValidationSuccess(index);

      // Sincronización automática: Si se actualiza DoR y el testeo está activo, regenerar protocolo
      if (index < CORE_DOR_CARDS.length && isTestingEnabled) {
        console.log("DoR updated, syncing Testing Protocol...");
        await enableTesting(); // Esto regenera el protocolo con el nuevo contexto
      }

      if (index === activeStep && index < cards.length - 1) {
        setActiveStep(index + 1);
      }
    } catch (error) {
      console.error("Error validating card", error);
      updateCard(index, { status: "error" });
    }
  };

  const isDoRCompleted = cards.slice(0, CORE_DOR_CARDS.length).every(c => c.status === "completed");

  const generateMarkdown = () => {
    let doc = `# Definition of Ready (DoR): ${cards[2].content.split("\n")[0] || "Nueva Investigación"}\n\n`;
    
    CORE_DOR_CARDS.forEach((_, i) => {
      doc += `## ${cards[i].title}\n${extractRefinedText(cards[i].aiFeedback)}\n\n`;
    });

    if (isTestingEnabled) {
      doc += `---\n# Protocolo de Testeo\n\n`;
      TESTING_PROTOCOL_CARDS.forEach((_, i) => {
        const idx = CORE_DOR_CARDS.length + i;
        doc += `## ${cards[idx].title}\n${extractRefinedText(cards[idx].aiFeedback)}\n\n`;
      });
    }

    doc += `--- \n*Documento generado por DoR Orchestrator • Framework de Gobernanza*`;
    return doc.trim();
  };

  if (!isHydrated) return null;

  return (
    <div ref={containerRef} className="max-w-6xl mx-auto p-4 md:p-12 space-y-12 bg-zinc-950 min-h-screen pb-64">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
              DoR Orchestrator
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
              <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                {totalTokens.toLocaleString()} Tokens
              </span>
            </div>
          </div>
          <p className="text-zinc-500 font-medium tracking-tight">Estrategia de Producto & UX Research • Gobernanza v1.2</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleRefineAllDoR}
            className="px-5 py-2.5 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-xl border border-blue-500/20 hover:bg-blue-500 hover:text-black transition-all flex items-center gap-2 group"
          >
            <Zap className="w-4 h-4 transition-transform group-hover:scale-110" />
            Refinar todo el DoR
          </button>
          <button 
            onClick={handleReset}
            className="px-5 py-2.5 bg-zinc-900 text-zinc-400 text-xs font-bold uppercase tracking-widest rounded-xl border border-zinc-800 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all flex items-center gap-2 group"
          >
            <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restablecer Sesión
          </button>
        </div>
      </header>

      <div className="space-y-6">
        {cards.map((card, index) => (
          <TwoPaneCard
            key={card.id}
            stepNumber={index + 1}
            title={card.title}
            isActive={index <= activeStep}
            isCompleted={card.status === "completed"}
            attentionNeeded={card.attentionNeeded}
            isLoading={card.status === "loading"}
            canValidate={(card.content || "").trim().length > 0}
            onValidate={() => handleValidate(index)}
            onApplyRefinement={card.aiFeedback ? () => handleApplyRefinement(index) : undefined}
            leftPanel={
              <textarea
                value={card.content}
                onChange={(e) => updateCard(index, { content: e.target.value })}
                placeholder={`Escribe aquí el ${card.title.toLowerCase()}...`}
                className="w-full h-48 bg-transparent text-zinc-100 text-lg placeholder:text-zinc-700 outline-none resize-none border-none focus:ring-0"
              />
            }
            rightPanel={
              <div className="prose prose-invert prose-sm max-w-none prose-h3:text-blue-400 prose-h3:mt-6 prose-strong:text-white prose-li:my-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {card.aiFeedback || "_El agente analizará tu entrada para proponer una versión refinada._"}
                </ReactMarkdown>
              </div>
            }
          />
        ))}

        {isDrafting && (
           <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/50 rounded-[2rem] border border-white/5 animate-pulse">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4"/>
              <p className="text-zinc-400 font-bold text-sm tracking-widest uppercase">El agente está redactando los siguientes pasos...</p>
           </div>
        )}

        {isDoRCompleted && (
          <section className="transition-all duration-1000 animate-in fade-in slide-in-from-bottom-10">
            <div className="bg-zinc-900/60 rounded-[2.5rem] border-2 border-white/5 backdrop-blur-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              <div className="p-8 md:p-10 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-emerald-500/10 to-transparent">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                    <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">DoR Consolidado</h2>
                    <p className="text-emerald-400/70 font-bold text-xs uppercase tracking-widest mt-1">Definición de Ready Finalizada</p>
                  </div>
                </div>
                {!isTestingEnabled && (
                   <button 
                    onClick={enableTesting}
                    disabled={isDrafting}
                    className="px-8 py-4 bg-emerald-500 text-black font-black rounded-2xl hover:scale-105 transition-all flex items-center gap-3 shadow-2xl shadow-emerald-500/40 disabled:opacity-50 disabled:scale-100"
                   >
                     {isDrafting ? <Loader2 className="w-5 h-5 animate-spin"/> : "🚀 Generar Protocolo de Testeo"}
                   </button>
                )}
              </div>

              <div className="p-8 md:p-12 space-y-12">
                <div className="flex flex-col gap-6">
                  {cards.slice(0, CORE_DOR_CARDS.length).map((card) => (
                    <div key={card.id} className="bg-zinc-950/50 p-8 rounded-3xl border border-white/5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                        <span className="text-xs text-zinc-400 font-black uppercase tracking-widest">{card.title}</span>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed">
                        <ReactMarkdown>{extractRefinedText(card.aiFeedback)}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>

                {isTestingEnabled && (
                  <div className="pt-12 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-4 mb-8">
                       <h3 className="text-2xl font-black text-blue-500 tracking-tight">Protocolo de Testeo Adicional</h3>
                       <div className="flex-1 h-px bg-gradient-to-r from-blue-500/20 to-transparent" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-8">
                       {cards.slice(CORE_DOR_CARDS.length).map((card) => {
                          const refined = extractRefinedText(card.aiFeedback);
                          if (!refined) return null;
                          return (
                            <div key={card.id} className="bg-zinc-950/40 p-8 rounded-[2rem] border border-blue-500/10 space-y-6 hover:border-blue-500/30 transition-colors">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-black text-xs">
                                     {card.id.includes('strategy') ? 'S' : card.id.includes('config') ? 'C' : 'E'}
                                  </div>
                                  <span className="text-xs text-blue-400 font-black uppercase tracking-widest">{card.title.split(":")[0]}</span>
                               </div>
                               <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed prose-strong:text-white prose-p:my-4">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{refined}</ReactMarkdown>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                    
                    <div className="mt-12 flex flex-col md:flex-row gap-4 items-center justify-center p-8 bg-zinc-900/40 rounded-[2rem] border border-white/5">
                      <p className="text-zinc-500 text-sm font-medium">¿Todo listo para compartir con el equipo?</p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(generateMarkdown());
                            alert("¡Documento copiado!");
                          }}
                          className="px-6 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-all flex items-center gap-2"
                        >
                          Copiar Portapapeles
                        </button>
                        <button 
                          onClick={() => {
                            const blob = new Blob([generateMarkdown()], { type: "text/markdown" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `dor-protocolo-${new Date().toISOString().split('T')[0]}.md`;
                            a.click();
                          }}
                          className="px-6 py-3 bg-white text-black font-black rounded-xl hover:scale-105 transition-all shadow-xl shadow-white/5"
                        >
                          Descargar .MD
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
