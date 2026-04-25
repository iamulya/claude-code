---
title: UserCredentials
entity_type: api
summary: A type representing credentials for downstream propagation, used by tools that call external APIs on behalf of the user.
export_name: UserCredentials
source_file: src/iam/types.ts
category: type
search_terms:
 - downstream API authentication
 - propagating user identity
 - tool authentication
 - API keys for tools
 - OAuth tokens for agents
 - user identity propagation
 - agent security context
 - impersonation credentials
 - on-behalf-of calls
 - external API access
 - user auth for tools
 - passing tokens to agents
stub: false
compiled_at: 2026-04-25T00:16:15.801Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/iam/index.ts
compiled_from_quality: unknown
confidence: 1
---

## Overview

`UserCredentials` is a type alias for an object that holds authentication information for a user. This information is intended for propagation to downstream systems. When an [Agent](./agent.md) uses a tool that needs to call an external API (such as GitHub, Jira, or a corporate database), it may need to authenticate as the user who initiated the request. The `UserCredentials` object provides a container for this authentication material, such as OAuth tokens, API keys, or other secrets [Source 1].

This type is a component of the broader [UserContext](./user-context.md) object, which represents the full identity and access profile of the user interacting with the agent. It is a key part of YAAF's Identity and Access Management (IAM) subsystem, enabling secure impersonation and on-behalf-of operations by agent tools [Source 1].

## Signature

`UserCredentials` is a type alias for a plain JavaScript object. The specific properties are not fixed, as different tools and external services require different types of credentials. It is typically a key-value map where keys might correspond to service names (e.g., `'github'`) and values are the corresponding credentials (e.g., an OAuth token).

```typescript
// Source: src/iam/index.ts
export type { UserCredentials } from "./types.js";

// Conceptual definition in src/iam/types.ts
export type UserCredentials = {
  [key: string]: unknown;
};
```

## Examples

The most common use case is to provide credentials within the `UserContext` when invoking an agent's `run` method. This makes the credentials available to any tools that might need them during the execution of the task.

```typescript
import { Agent, UserContext, agentTool } from 'yaaf';

// A hypothetical tool that interacts with the GitHub API
const githubTool = agentTool({
  name: 'createGitHubIssue',
  description: 'Creates a new issue in a GitHub repository.',
  // This tool would use the credentials from the context to make an authenticated API call
  async execute(params, context) {
    const githubToken = context.user?.credentials?.github;
    if (!githubToken) {
      throw new Error('GitHub credentials not provided.');
    }
    // ... logic to call GitHub API with the token
    return `Issue created successfully.`;
  }
});

const agent = new Agent({
  tools: [githubTool],
});

// Define the user context, including their credentials for the 'github' service
const userContext: UserContext = {
  userId: 'alice@example.com',
  roles: ['developer'],
  credentials: {
    github: 'ghp_some_oauth_token_here' // This would be a real token
  }
};

// Run the agent with the user's context
await agent.run('Create a new issue in the "YAAF" repository about a bug in the auth system.', {
  user: userContext
});
```

## See Also

- [UserContext](./user-context.md): The parent object that contains `UserCredentials` along with other user identity information.
- [AccessPolicy](./access-policy.md): The configuration that governs authorization and data scoping based on user identity.
- [AuthorizationStrategy](./authorization-strategy.md): The component responsible for deciding if a user can execute a specific tool.

## Sources

[Source 1]: src/iam/index.ts