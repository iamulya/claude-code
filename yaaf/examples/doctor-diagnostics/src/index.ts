import { YaafDoctor, Agent, buildTool } from 'yaaf';

async function main() {
  console.log("=== YAAF Doctor Diagnostics Example ===");

  // Initialize the YaafDoctor
  const doctor = new YaafDoctor({
    projectRoot: process.cwd(),
    // Uses default model configured via env vars
  });

  // Attach a listener to observe issues caught by the doctor
  doctor.onIssue((issue) => {
    console.log(`\n[DOCTOR ANALYSIS] Type: ${issue.type}`);
    console.log(`[DOCTOR ANALYSIS] Summary: ${issue.summary}`);
    console.log(`[DOCTOR ANALYSIS] Details:\n${issue.details}\n`);
  });

  // Create a tool that simulates a database failure
  const failingDbTool = buildTool({
    name: 'query_database',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    maxResultChars: 10000,
    describe: () => 'Query the internal company database for info.',
    call: async () => {
      // Simulate an unexpected error that an agent might encounter
      throw new Error("ConnectionRefused: Unable to connect to postgres on port 5432. Dial tcp 127.0.0.1:5432: connect: connection refused");
    }
  });

  // Create the agent
  const agent = new Agent({
    name: 'DataAnalyst',
    systemPrompt: 'You are a data analyst. Find the 2024 retention rate by querying the database.',
    tools: [failingDbTool]
  });

  // Attach the doctor to watch this specific agent
  // autoDiagnose: true enables the LLM-powered root cause analysis
  doctor.watch(agent, { autoDiagnose: true, debounceMs: 100 });

  console.log("Agent is running. It will try to use the database and fail.");
  console.log("The Doctor is watching in the background...\n");

  try {
    await agent.run("Please get me the requested retention rate.");
  } catch (error) {
    console.error(`> Agent Run Terminated with Error: ${error}\n`);
  }

  // Wait a moment for the doctor to finish its async diagnosis
  console.log("Waiting for Doctor to complete its final analysis...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  doctor.unwatchAll();
  console.log("Done.");
}

main().catch(console.error);
