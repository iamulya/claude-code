import { Agent, sequential, parallel, transform } from 'yaaf';

// Ensure the process uses the desired model
// Set API specific vars in shell if not already defined: process.env.ANTHROPIC_API_KEY etc.
// For this example we use default gemini but any provider works.

async function main() {
  console.log("=== YAAF Multi-Agent Workflow Example ===");

  // Create individual worker agents
  const researcher = new Agent({
    name: 'Researcher',
    systemPrompt: 'You are a research agent. Research the provided topic thoroughly. Be concise but informative in your findings. Output markdown with bullet points.',
  });

  const drafter = new Agent({
    name: 'Drafter',
    systemPrompt: 'You are a content drafter. Given research, draft a coherent and engaging short article. Do not include a title.',
  });

  const editor = new Agent({
    name: 'Editor',
    systemPrompt: 'You are a professional editor. Review the article draft. Fix any grammatical issues and improve flow.',
  });

  // Example 1: Parallel Execution
  console.log("\n--- Example 1: Parallel Brainstorming ---");
  const brainstormParallel = parallel([
      new Agent({ name: 'Idea1', systemPrompt: 'Give 1 creative idea for a sci-fi story about AI.' }),
      new Agent({ name: 'Idea2', systemPrompt: 'Give 1 realistic idea for a near-future story about AI.' })
  ], {
      name: 'Brainstormer',
      merge: (results) => "Brainstorming Results:\n\n" + results.join('\n\n---\n\n')
  });

  console.log("Running parallel workflow...");
  const brainstormResult = await brainstormParallel.run("Start brainstorming");
  console.log(brainstormResult);

  // Example 2: Sequential Workflow with Transform
  console.log("\n--- Example 2: Sequential Research -> Draft -> Edit Pipeline ---");
  
  // Custom transform step
  const addTitleStep = transform((input: string) => {
    return `# AI in the Modern Workplace\n\n${input}`;
  });

  const publishingPipeline = sequential([
    researcher,
    drafter,
    editor,
    addTitleStep
  ], { name: 'Publishing Pipeline' });

  // Execute the pipeline
  console.log("Running publishing pipeline for topic: 'Impact of AI on software development'...");
  const pipelineResult = await publishingPipeline.run("Impact of AI on software development");
  console.log("\n=== Final Pipeline Result ===\n");
  console.log(pipelineResult);
}

main().catch(console.error);
