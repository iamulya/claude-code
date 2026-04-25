---
title: Tools
entity_type: subsystem
summary: The subsystem responsible for defining, creating, and managing callable functions that agents can utilize to interact with external systems or perform specific tasks.
primary_files:
 - src/tools/tool.ts
exports:
 - Tool
 - buildTool
search_terms:
 - agent capabilities
 - how to add functions to an agent
 - defining agent tools
 - tool use in agents
 - function calling
 - YAAF tool definition
 - buildTool function
 - Tool type
 - connecting agents to external systems
 - agent actions
 - extending agent functionality
 - code intelligence tools
 - sandboxed file system access
stub: false
compiled_at: 2026-04-24T18:21:00.767Z
compiled_from:
 - /Users/hybridpro/Downloads/claude-code-main/yaaf/yaaf-agent/knowledge/raw/source/doctor/tools.ts
compiled_from_quality: unknown
confidence: 0.9
---

## Purpose

The [Tools Subsystem](./tools-subsystem.md) provides the core functionality for defining and creating tools that a YAAF agent can invoke. Tools are discrete, callable functions that grant an agent capabilities beyond text generation, such as reading files, executing shell commands, or interacting with APIs. This allows agents to perform actions, gather information from the environment, and affect external systems to accomplish more complex goals [Source 1].

An example use case is the "YAAF Doctor" agent, which is equipped with a suite of tools for code intelligence. These tools enable it to read, search, compile, test, and inspect a YAAF-based project, effectively acting as an automated developer assistant [Source 1].

## Architecture

The architecture of the Tools subsystem is centered around the `Tool` type and a helper function, `buildTool`, for its creation.

-   **`Tool` Type**: This is the fundamental interface or type that defines the contract for any tool within the framework. It encapsulates all necessary information about a tool, such as its name, a description of what it does, its input parameters, and the function to execute.
-   **`buildTool()` Function**: A factory function used to construct `Tool` objects. It simplifies the process of creating well-formed tools that conform to the `Tool` type definition [Source 1].

Tools are typically grouped into logical sets and created via dedicated factory functions. For instance, the `createDoctorTools` function generates a list of `Tool` objects specifically for the Doctor agent. This function also demonstrates how tools can be configured; it accepts a `projectRoot` parameter to ensure that all file system operations performed by the tools are sandboxed within the specified project directory for security [Source 1].

## Key APIs

The primary public APIs for this subsystem are imported from `src/tools/tool.ts`.

-   **`Tool`**: The type definition for a tool. Developers implementing custom tools must ensure their objects conform to this type.
-   **`buildTool()`**: The standard factory function for creating `Tool` instances. It is the recommended way to define new tools for an agent [Source 1].

## Extension Points

The primary method for extending an agent's capabilities is by creating custom tools. Developers can define their own functions to perform specific tasks and then wrap them using the `buildTool` function to make them available to an agent. The `createDoctorTools` function serves as a reference implementation, showing how to bundle a set of related tools for a specific purpose, such as code analysis and manipulation [Source 1].

## Sources

[Source 1]: src/doctor/tools.ts