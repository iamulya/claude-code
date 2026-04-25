---
summary: Utility function to split long text responses into smaller chunks suitable for channel-specific message limits.
export_name: chunkResponse
source_file: src/gateway/channel.ts
category: function
title: chunkResponse
entity_type: api
search_terms:
 - split long messages
 - message chunking
 - handle message length limits
 - break up agent response
 - channel message size
 - text splitting utility
 - paragraph boundary splitting
 - sentence boundary splitting
 - avoid mid-word splits
 - format long text for chat
 - response pagination
 - how to send long replies
 - afterProcess hook
stub: false
compiled_at: 2026-04-24T16:54:52.354Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/gateway/channel.ts
compiled_from_quality: unknown
confidence: 0.98
---

## Overview

The `chunkResponse` function is a utility for splitting a single large string of text into an array of smaller strings. Its primary purpose is to handle message length limits imposed by various chat platforms. [when](./when.md) an agent generates a response that exceeds a [Channel](./channel.md)'s maximum message size, this function can be used to break the response into multiple parts that can be sent as separate messages [Source 1].

The splitting logic is designed to be intelligent, prioritizing breaks at paragraph or sentence boundaries to maintain readability. This prevents words from being cut in half and ensures that the resulting chunks are coherent [Source 1].

This function is commonly used within the `afterProcess` hook in the `GatewayConfig` to automatically prepare agent responses for delivery across different channels, each with potentially different message size constraints [Source 1].

## Signature

```typescript
export function chunkResponse(text: string, channelName: string): string[];
```

**Parameters:**

*   `text: string`: The long text response from the agent that needs to be split.
*   `channelName: string`: The identifier of the channel for which the text is being formatted (e.g., 'discord', 'telegram'). This is used to determine the appropriate chunking strategy, likely based on the channel's specific limits.

**Returns:**

*   `string[]`: An array of strings, where each string is a chunk of the original text, ready to be sent as a separate message.

## Examples

### Basic Usage

Here is a simple example of splitting a long string into chunks.

```typescript
import { chunkResponse } from 'yaaf';

const longAgentResponse = "This is the first paragraph of a very long response. It contains a lot of detail that might exceed the message limit of a typical chat platform.\n\nThis is the second paragraph. By splitting at paragraph boundaries, we can ensure the message remains readable when sent in multiple parts.";

// Split the response for a channel named 'discord'
const messageChunks = chunkResponse(longAgentResponse, 'discord');

console.log(messageChunks);
/*
  Expected output (assuming the split occurs between paragraphs):
  [
    "This is the first paragraph of a very long response. It contains a lot of detail that might exceed the message limit of a typical chat platform.",
    "This is the second paragraph. By splitting at paragraph boundaries, we can ensure the message remains readable when sent in multiple parts."
  ]
*/

// These chunks can now be sent as individual messages.
```

### Integration with Gateway

A common use case is to integrate `chunkResponse` into the `Gateway` lifecycle using the `afterProcess` hook. This automatically chunks all agent responses before they are sent.

```typescript
import { Gateway, GatewayConfig, InboundMessage, ConsoleChannel } from 'yaaf';
import { MyAgent } from './my-agent'; // Your agent implementation

const myAgent = new MyAgent();

const gatewayConfig: GatewayConfig = {
  agent: myAgent,
  channels: [new ConsoleChannel()],
  
  // Use the afterProcess hook to chunk responses
  afterProcess: (response: string, message: InboundMessage): string[] => {
    // The gateway will automatically send each string in the returned
    // array as a separate message.
    return chunkResponse(response, message.channel);
  },
};

const gateway = new Gateway(gatewayConfig);
gateway.start();
```

## See Also

*   `Gateway`: The subsystem that manages message routing and processing, where `chunkResponse` is often used.
*   `GatewayConfig`: The configuration object for a `Gateway`, specifically the `afterProcess` hook.
*   `Channel`: The interface for communication platforms, which have the message limits that `chunkResponse` helps manage.

## Sources

[Source 1]: src/gateway/channel.ts