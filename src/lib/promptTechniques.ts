export type PromptTechnique = {
  id: string;
  name: string;
  description: string;
  template: (input: string) => string;
  suggestedMethods: string[];
};

export const promptTechniques: PromptTechnique[] = [
  {
    id: "standard",
    name: "Standard Prompt",
    description: "Clear, direct instructions without framework constraints",
    template: (input: string) => `${input}`,
    suggestedMethods: ["@context", "@examples", "@constraints"],
  },
  {
    id: "reasoning",
    name: "Reasoning Prompt",
    description: "Step-by-step thinking and logical analysis",
    template: (input: string) => `Think through this step-by-step:\n\n${input}\n\nProvide your reasoning process before giving the final answer.`,
    suggestedMethods: ["@chain-of-thought", "@step-by-step", "@explain"],
  },
  {
    id: "race",
    name: "RACE Prompt",
    description: "Role, Action, Context, Expectation framework",
    template: (input: string) => `Role: [Specify the role]\nAction: ${input}\nContext: [Provide relevant context]\nExpectation: [Define expected output]`,
    suggestedMethods: ["@role", "@format", "@audience"],
  },
  {
    id: "care",
    name: "CARE Prompt",
    description: "Context, Action, Result, Example framework",
    template: (input: string) => `Context: [Describe the situation]\nAction: ${input}\nResult: [Desired outcome]\nExample: [Provide an example if applicable]`,
    suggestedMethods: ["@context", "@examples", "@output-format"],
  },
  {
    id: "ape",
    name: "APE Prompt",
    description: "Action, Purpose, Expectation framework",
    template: (input: string) => `Action: ${input}\nPurpose: [Why this action is needed]\nExpectation: [What the result should look like]`,
    suggestedMethods: ["@purpose", "@scope", "@deliverables"],
  },
  {
    id: "create",
    name: "CREATE Prompt",
    description: "Character, Request, Examples, Additions, Tone, Extras framework",
    template: (input: string) => `Character: [Who you want the AI to be]\nRequest: ${input}\nExamples: [Show examples]\nAdditions: [Additional requirements]\nTone: [Desired tone]\nExtras: [Any other details]`,
    suggestedMethods: ["@persona", "@tone", "@style"],
  },
  {
    id: "tag",
    name: "TAG Prompt",
    description: "Task, Action, Goal framework",
    template: (input: string) => `Task: [Define the task]\nAction: ${input}\nGoal: [What success looks like]`,
    suggestedMethods: ["@success-criteria", "@metrics", "@constraints"],
  },
  {
    id: "creo",
    name: "CREO Prompt",
    description: "Context, Request, Examples, Output format framework",
    template: (input: string) => `Context: [Background information]\nRequest: ${input}\nExamples: [Sample inputs/outputs]\nOutput: [Desired format]`,
    suggestedMethods: ["@format", "@length", "@structure"],
  },
  {
    id: "rise",
    name: "RISE Prompt",
    description: "Role, Input, Steps, Expectation framework",
    template: (input: string) => `Role: [Your expertise/role]\nInput: ${input}\nSteps: [Break down the approach]\nExpectation: [Final deliverable]`,
    suggestedMethods: ["@methodology", "@timeline", "@resources"],
  },
  {
    id: "pain",
    name: "PAIN Prompt",
    description: "Problem, Action, Information, Next steps framework",
    template: (input: string) => `Problem: [What needs solving]\nAction: ${input}\nInformation: [Key details to consider]\nNext Steps: [What happens after]`,
    suggestedMethods: ["@root-cause", "@impact", "@priority"],
  },
  {
    id: "coast",
    name: "COAST Prompt",
    description: "Context, Objective, Actions, Scenario, Task framework",
    template: (input: string) => `Context: [Background]\nObjective: [What we want to achieve]\nActions: ${input}\nScenario: [Use case or situation]\nTask: [Specific task]`,
    suggestedMethods: ["@stakeholders", "@risks", "@timeline"],
  },
  {
    id: "roses",
    name: "ROSES Prompt",
    description: "Role, Objective, Scenario, Expected Solution, Steps framework",
    template: (input: string) => `Role: [Expertise to adopt]\nObjective: [Goal]\nScenario: [Situation]\nExpected Solution: ${input}\nSteps: [How to get there]`,
    suggestedMethods: ["@alternatives", "@evaluation", "@implementation"],
  },
];

export function getTechniqueById(id: string): PromptTechnique | undefined {
  return promptTechniques.find((t) => t.id === id);
}

export function generatePromptWithTechnique(
  techniqueId: string,
  userInput: string
): { prompt: string; suggestedMethods: string[] } {
  const technique = getTechniqueById(techniqueId);
  if (!technique) {
    return { prompt: userInput, suggestedMethods: [] };
  }
  return {
    prompt: technique.template(userInput),
    suggestedMethods: technique.suggestedMethods,
  };
}
