/**
 * OpenAPI Toolset Tests
 *
 * Covers: naming, parser, schema, auth, restApiTool, and OpenAPIToolset integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { toSnakeCase, generateToolName, deduplicateNames } from "../tools/openapi/naming.js";
import { parseOpenAPISpec } from "../tools/openapi/parser.js";
import { operationToToolInput, getBodyPropertyNames } from "../tools/openapi/schema.js";
import { applyAuth, schemeToAuthConfig, resolveAuth } from "../tools/openapi/auth.js";
import { createRestApiTool } from "../tools/openapi/restApiTool.js";
import { OpenAPIToolset } from "../tools/openapi/index.js";

// ── Naming Tests ─────────────────────────────────────────────────────────────

describe("OpenAPI Naming", () => {
  describe("toSnakeCase", () => {
    it("converts camelCase", () => {
      expect(toSnakeCase("listPets")).toBe("list_pets");
      expect(toSnakeCase("getPetById")).toBe("get_pet_by_id");
    });

    it("converts PascalCase", () => {
      expect(toSnakeCase("GetPetById")).toBe("get_pet_by_id");
      expect(toSnakeCase("CreateNewUser")).toBe("create_new_user");
    });

    it("converts kebab-case", () => {
      expect(toSnakeCase("list-all-users")).toBe("list_all_users");
    });

    it("handles uppercase runs", () => {
      expect(toSnakeCase("getHTTPResponse")).toBe("get_http_response");
      expect(toSnakeCase("HTMLParser")).toBe("html_parser");
    });

    it("passes through snake_case", () => {
      expect(toSnakeCase("already_snake")).toBe("already_snake");
    });

    it("handles dots and spaces", () => {
      expect(toSnakeCase("some.method.name")).toBe("some_method_name");
      expect(toSnakeCase("list all pets")).toBe("list_all_pets");
    });
  });

  describe("generateToolName", () => {
    it("uses operationId when available", () => {
      expect(generateToolName("listPets", "get", "/pets")).toBe("list_pets");
      expect(generateToolName("showPetById", "get", "/pets/{petId}")).toBe("show_pet_by_id");
    });

    it("falls back to method + path", () => {
      expect(generateToolName(undefined, "get", "/pets")).toBe("get_pets");
      expect(generateToolName(undefined, "post", "/users/{userId}/orders")).toBe(
        "post_users_by_id_orders",
      );
    });

    it("replaces path params with by_id", () => {
      expect(generateToolName(undefined, "get", "/pets/{petId}")).toBe("get_pets_by_id");
      expect(generateToolName(undefined, "get", "/users/{id}")).toBe("get_users_by_id");
    });

    it("truncates long names", () => {
      const longId =
        "thisIsAnExtremelyLongOperationIdThatShouldDefinitelyBeTruncatedToSixtyCharacters";
      const result = generateToolName(longId, "get", "/");
      expect(result.length).toBeLessThanOrEqual(60);
    });
  });

  describe("deduplicateNames", () => {
    it("leaves unique names unchanged", () => {
      expect(deduplicateNames(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    });

    it("appends suffixes for duplicates", () => {
      expect(deduplicateNames(["list", "list", "create"])).toEqual(["list", "list_1", "create"]);
    });
  });
});

// ── Parser Tests ─────────────────────────────────────────────────────────────

const PETSTORE_SPEC = {
  openapi: "3.0.0",
  info: { title: "Pet Store", version: "1.0.0" },
  servers: [{ url: "https://api.petstore.io/v1" }],
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        summary: "List all pets",
        description: "Returns all pets in the store",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer" },
            description: "Max number of pets",
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["available", "pending", "sold"] },
          },
        ],
        responses: { "200": { description: "OK" } },
      },
      post: {
        operationId: "createPet",
        summary: "Create a pet",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", description: "Pet name" },
                  tag: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/pets/{petId}": {
      get: {
        operationId: "showPetById",
        summary: "Info for a specific pet",
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: { "200": { description: "OK" } },
      },
      delete: {
        operationId: "deletePet",
        summary: "Delete a pet",
        parameters: [
          {
            name: "petId",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: { "204": { description: "Deleted" } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
};

describe("OpenAPI Parser", () => {
  it("extracts all operations", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    expect(operations).toHaveLength(4);
    expect(operations.map((o) => o.operationId)).toEqual([
      "listPets",
      "createPet",
      "showPetById",
      "deletePet",
    ]);
  });

  it("extracts server URL", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    expect(operations[0]!.serverUrl).toBe("https://api.petstore.io/v1");
  });

  it("extracts parameters", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    expect(listPets.parameters).toHaveLength(2);
    expect(listPets.parameters[0]!.name).toBe("limit");
    expect(listPets.parameters[0]!.in).toBe("query");
  });

  it("extracts request body", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const createPet = operations.find((o) => o.operationId === "createPet")!;
    expect(createPet.requestBody).toBeDefined();
    expect(createPet.requestBody!.required).toBe(true);
    expect(createPet.requestBody!.mediaType).toBe("application/json");
  });

  it("extracts security schemes", () => {
    const { securitySchemes } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    expect(securitySchemes.ApiKeyAuth).toEqual({
      type: "apiKey",
      name: "X-API-Key",
      in: "header",
      scheme: undefined,
    });
  });

  it("propagates global security to operations", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    expect(operations[0]!.security).toEqual(["ApiKeyAuth"]);
  });

  it("resolves $ref pointers", () => {
    const specWithRef = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/items": {
          get: {
            operationId: "listItems",
            parameters: [{ $ref: "#/components/parameters/LimitParam" }],
            responses: { "200": { description: "OK" } },
          },
        },
      },
      components: {
        parameters: {
          LimitParam: {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer" },
          },
        },
      },
    };

    const { operations } = parseOpenAPISpec(specWithRef as Record<string, unknown>);
    expect(operations[0]!.parameters[0]!.name).toBe("limit");
  });

  it("handles circular $ref safely", () => {
    const specWithCircular = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/nodes": {
          post: {
            operationId: "createNode",
            requestBody: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Node" },
                },
              },
            },
            responses: { "201": { description: "Created" } },
          },
        },
      },
      components: {
        schemas: {
          Node: {
            type: "object",
            properties: {
              name: { type: "string" },
              children: {
                type: "array",
                items: { $ref: "#/components/schemas/Node" },
              },
            },
          },
        },
      },
    };

    // Should not throw
    const { operations } = parseOpenAPISpec(specWithCircular as Record<string, unknown>);
    expect(operations).toHaveLength(1);
    expect(operations[0]!.requestBody).toBeDefined();
  });

  it("rejects non-3.x specs", () => {
    expect(() =>
      parseOpenAPISpec({ openapi: "2.0", paths: {} } as Record<string, unknown>),
    ).toThrow("Unsupported OpenAPI version");
  });

  it("resolves external file $ref (whole file)", () => {
    const specWithExternalRef = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/items": {
          post: {
            operationId: "createItem",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: { $ref: "./schemas/item.json" },
                },
              },
            },
            responses: { "201": { description: "Created" } },
          },
        },
      },
    };

    // Mock file resolver returns the external schema
    const fileResolver = vi.fn().mockReturnValue({
      type: "object",
      properties: {
        title: { type: "string", description: "Item title" },
        price: { type: "number" },
      },
      required: ["title"],
    });

    const { operations } = parseOpenAPISpec(specWithExternalRef as Record<string, unknown>, {
      fileResolver,
    });

    expect(fileResolver).toHaveBeenCalledWith("./schemas/item.json");
    expect(operations[0]!.requestBody).toBeDefined();
    expect(operations[0]!.requestBody!.schema).toHaveProperty("properties");
    const props = operations[0]!.requestBody!.schema.properties as Record<string, unknown>;
    expect(props).toHaveProperty("title");
    expect(props).toHaveProperty("price");
  });

  it("resolves external file $ref with JSON Pointer (file + pointer)", () => {
    const specWithFileAndPointer = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/items": {
          get: {
            operationId: "listItems",
            parameters: [{ $ref: "./common.json#/parameters/LimitParam" }],
            responses: { "200": { description: "OK" } },
          },
        },
      },
    };

    // The external file has a nested structure
    const fileResolver = vi.fn().mockReturnValue({
      parameters: {
        LimitParam: {
          name: "limit",
          in: "query",
          required: false,
          schema: { type: "integer", maximum: 100 },
          description: "Max results",
        },
      },
    });

    const { operations } = parseOpenAPISpec(specWithFileAndPointer as Record<string, unknown>, {
      fileResolver,
    });

    expect(fileResolver).toHaveBeenCalledWith("./common.json");
    expect(operations[0]!.parameters[0]!.name).toBe("limit");
    expect(operations[0]!.parameters[0]!.description).toBe("Max results");
  });

  it("caches external file loads (calls resolver once per file)", () => {
    const specWithMultipleRefs = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/a": {
          get: {
            operationId: "opA",
            parameters: [{ $ref: "./shared.json#/params/Limit" }],
            responses: { "200": { description: "OK" } },
          },
        },
        "/b": {
          get: {
            operationId: "opB",
            parameters: [{ $ref: "./shared.json#/params/Offset" }],
            responses: { "200": { description: "OK" } },
          },
        },
      },
    };

    const fileResolver = vi.fn().mockReturnValue({
      params: {
        Limit: { name: "limit", in: "query", schema: { type: "integer" } },
        Offset: { name: "offset", in: "query", schema: { type: "integer" } },
      },
    });

    const { operations } = parseOpenAPISpec(specWithMultipleRefs as Record<string, unknown>, {
      fileResolver,
    });

    // File resolver should only be called once (cached on second access)
    expect(fileResolver).toHaveBeenCalledTimes(1);
    expect(operations[0]!.parameters[0]!.name).toBe("limit");
    expect(operations[1]!.parameters[0]!.name).toBe("offset");
  });

  it("throws helpful error for external ref without file resolver", () => {
    const specWithExternalRef = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/items": {
          get: {
            operationId: "listItems",
            parameters: [{ $ref: "./external.json" }],
            responses: { "200": { description: "OK" } },
          },
        },
      },
    };

    expect(() => parseOpenAPISpec(specWithExternalRef as Record<string, unknown>)).toThrow(
      "no file resolver is configured",
    );
  });
});

// ── Schema Tests ─────────────────────────────────────────────────────────────

describe("OpenAPI Schema", () => {
  it("generates schema from query parameters", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const schema = operationToToolInput(listPets);

    expect(schema.type).toBe("object");
    expect(schema.properties).toHaveProperty("limit");
    expect(schema.properties).toHaveProperty("status");
    expect(schema.required).toBeUndefined(); // no required params
  });

  it("generates schema from path parameters", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const showPet = operations.find((o) => o.operationId === "showPetById")!;
    const schema = operationToToolInput(showPet);

    expect(schema.properties).toHaveProperty("petId");
    expect(schema.required).toContain("petId");
  });

  it("inlines request body properties", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const createPet = operations.find((o) => o.operationId === "createPet")!;
    const schema = operationToToolInput(createPet);

    expect(schema.properties).toHaveProperty("name");
    expect(schema.properties).toHaveProperty("tag");
    expect(schema.required).toContain("name");
  });

  it("handles body/param name collisions", () => {
    const op = {
      operationId: "test",
      method: "post" as const,
      path: "/test",
      summary: "",
      description: "",
      serverUrl: "https://example.com",
      parameters: [
        { name: "name", in: "query" as const, required: false, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        mediaType: "application/json",
        schema: {
          type: "object",
          properties: { name: { type: "string" } },
          required: ["name"],
        },
      },
    };

    const schema = operationToToolInput(op);
    // Query 'name' takes the plain key; body 'name' gets prefixed
    expect(schema.properties).toHaveProperty("name"); // query param
    expect(schema.properties).toHaveProperty("__body_name"); // body param
  });

  it("identifies body property names", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const createPet = operations.find((o) => o.operationId === "createPet")!;
    const bodyNames = getBodyPropertyNames(createPet);

    expect(bodyNames.has("name")).toBe(true);
    expect(bodyNames.has("tag")).toBe(true);
    expect(bodyNames.size).toBe(2);
  });

  it("strips noisy schema keys", () => {
    const op = {
      operationId: "test",
      method: "get" as const,
      path: "/test",
      summary: "",
      description: "",
      serverUrl: "https://example.com",
      parameters: [
        {
          name: "q",
          in: "query" as const,
          required: false,
          schema: {
            type: "string",
            example: "hello",
            "x-custom": true,
            deprecated: true,
            description: "Search query",
          },
        },
      ],
    };

    const schema = operationToToolInput(op);
    const qSchema = schema.properties!.q as Record<string, unknown>;
    expect(qSchema.type).toBe("string");
    expect(qSchema.description).toBe("Search query");
    expect(qSchema).not.toHaveProperty("example");
    expect(qSchema).not.toHaveProperty("x-custom");
    expect(qSchema).not.toHaveProperty("deprecated");
  });
});

// ── Auth Tests ───────────────────────────────────────────────────────────────

describe("OpenAPI Auth", () => {
  describe("applyAuth", () => {
    it("applies API key to header", () => {
      const headers: Record<string, string> = {};
      const query: Record<string, string> = {};
      applyAuth(headers, query, {
        type: "apiKey",
        in: "header",
        name: "X-API-Key",
        value: "secret",
      });
      expect(headers["X-API-Key"]).toBe("secret");
    });

    it("applies API key to query", () => {
      const headers: Record<string, string> = {};
      const query: Record<string, string> = {};
      applyAuth(headers, query, { type: "apiKey", in: "query", name: "api_key", value: "secret" });
      expect(query.api_key).toBe("secret");
    });

    it("applies bearer token", () => {
      const headers: Record<string, string> = {};
      applyAuth(headers, {}, { type: "bearer", token: "tok123" });
      expect(headers["Authorization"]).toBe("Bearer tok123");
    });

    it("applies basic auth", () => {
      const headers: Record<string, string> = {};
      applyAuth(headers, {}, { type: "basic", username: "user", password: "pass" });
      const expected = Buffer.from("user:pass").toString("base64");
      expect(headers["Authorization"]).toBe(`Basic ${expected}`);
    });

    it("applies custom headers", () => {
      const headers: Record<string, string> = {};
      applyAuth(headers, {}, { type: "custom", headers: { "X-Custom": "value" } });
      expect(headers["X-Custom"]).toBe("value");
    });
  });

  describe("schemeToAuthConfig", () => {
    it("converts apiKey scheme", () => {
      const config = schemeToAuthConfig(
        { type: "apiKey", name: "X-API-Key", in: "header" },
        "secret",
      );
      expect(config).toEqual({ type: "apiKey", in: "header", name: "X-API-Key", value: "secret" });
    });

    it("converts bearer scheme", () => {
      const config = schemeToAuthConfig({ type: "http", scheme: "bearer" }, "tok123");
      expect(config).toEqual({ type: "bearer", token: "tok123" });
    });

    it("converts basic scheme", () => {
      const config = schemeToAuthConfig({ type: "http", scheme: "basic" }, "user:pass");
      expect(config).toEqual({ type: "basic", username: "user", password: "pass" });
    });

    it("converts oauth2 as bearer", () => {
      const config = schemeToAuthConfig({ type: "oauth2" }, "oauth-token");
      expect(config).toEqual({ type: "bearer", token: "oauth-token" });
    });
  });

  describe("resolveAuth", () => {
    it("resolves matching credential", () => {
      const auth = resolveAuth(
        ["ApiKeyAuth"],
        { ApiKeyAuth: { type: "apiKey", name: "X-API-Key", in: "header" } },
        { ApiKeyAuth: "my-key" },
      );
      expect(auth?.type).toBe("apiKey");
    });

    it("falls back to global auth", () => {
      const globalAuth = { type: "bearer" as const, token: "fallback" };
      const auth = resolveAuth(["Missing"], {}, {}, globalAuth);
      expect(auth).toEqual(globalAuth);
    });

    it("uses global auth when no security requirements", () => {
      const globalAuth = { type: "bearer" as const, token: "global" };
      const auth = resolveAuth(undefined, {}, {}, globalAuth);
      expect(auth).toEqual(globalAuth);
    });
  });
});

// ── RestApiTool Tests ────────────────────────────────────────────────────────

describe("RestApiTool", () => {
  const DEFAULT_CONFIG = {
    timeoutMs: 5_000,
    extraHeaders: {},
    credentials: {},
    securitySchemes: {},
  };

  it("creates a tool with correct name and schema", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const tool = createRestApiTool(listPets, DEFAULT_CONFIG);

    expect(tool.name).toBe("list_pets");
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.inputSchema.properties).toHaveProperty("limit");
  });

  it("classifies GET as read-only and concurrency-safe", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const tool = createRestApiTool(listPets, DEFAULT_CONFIG);

    expect(tool.isReadOnly({})).toBe(true);
    expect(tool.isConcurrencySafe({})).toBe(true);
    expect(tool.isDestructive({})).toBe(false);
  });

  it("classifies DELETE as destructive", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const deletePet = operations.find((o) => o.operationId === "deletePet")!;
    const tool = createRestApiTool(deletePet, DEFAULT_CONFIG);

    expect(tool.isReadOnly({})).toBe(false);
    expect(tool.isDestructive({})).toBe(true);
  });

  it("classifies POST as non-read-only", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const createPet = operations.find((o) => o.operationId === "createPet")!;
    const tool = createRestApiTool(createPet, DEFAULT_CONFIG);

    expect(tool.isReadOnly({})).toBe(false);
    expect(tool.isConcurrencySafe({})).toBe(false);
  });

  it("uses name override when provided", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const tool = createRestApiTool(listPets, DEFAULT_CONFIG, "custom_name");

    expect(tool.name).toBe("custom_name");
  });

  it("describes the operation", () => {
    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const tool = createRestApiTool(listPets, DEFAULT_CONFIG);

    const desc = tool.describe({ limit: 10 });
    expect(desc).toContain("GET");
    expect(desc).toContain("/pets");
  });

  it("executes HTTP request via fetch", async () => {
    const mockResponse = { id: 1, name: "Fido" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const showPet = operations.find((o) => o.operationId === "showPetById")!;
    const tool = createRestApiTool(showPet, DEFAULT_CONFIG);

    const result = await tool.call(
      { petId: 42 },
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    expect(result.data).toEqual(mockResponse);
    expect(fetchSpy).toHaveBeenCalledOnce();

    // Verify URL had path param interpolated
    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("/pets/42");
    expect(calledUrl).not.toContain("{petId}");

    fetchSpy.mockRestore();
  });

  it("returns error data on HTTP error (no throw)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not found" }), {
        status: 404,
        statusText: "Not Found",
        headers: { "content-type": "application/json" },
      }),
    );

    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const showPet = operations.find((o) => o.operationId === "showPetById")!;
    const tool = createRestApiTool(showPet, DEFAULT_CONFIG);

    const result = await tool.call(
      { petId: 999 },
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    const data = result.data as Record<string, unknown>;
    expect(data.error).toBe(true);
    expect(data.status).toBe(404);

    fetchSpy.mockRestore();
  });

  it("returns error data on network failure (no throw)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const tool = createRestApiTool(listPets, DEFAULT_CONFIG);

    const result = await tool.call(
      {},
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    const data = result.data as Record<string, unknown>;
    expect(data.error).toBe(true);
    expect(data.message).toContain("ECONNREFUSED");

    fetchSpy.mockRestore();
  });

  it("sends request body for POST operations", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), {
        status: 201,
        headers: { "content-type": "application/json" },
      }),
    );

    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const createPet = operations.find((o) => o.operationId === "createPet")!;
    const tool = createRestApiTool(createPet, DEFAULT_CONFIG);

    await tool.call(
      { name: "Buddy", tag: "dog" },
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    const fetchOpts = fetchSpy.mock.calls[0]![1] as RequestInit;
    expect(fetchOpts.method).toBe("POST");
    expect(fetchOpts.body).toBe(JSON.stringify({ name: "Buddy", tag: "dog" }));
    expect((fetchOpts.headers as Record<string, string>)["Content-Type"]).toBe("application/json");

    fetchSpy.mockRestore();
  });

  it("applies auth to requests", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
      );

    const config = {
      ...DEFAULT_CONFIG,
      auth: { type: "bearer" as const, token: "my-token" },
    };

    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const tool = createRestApiTool(listPets, config);

    await tool.call(
      {},
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    const fetchHeaders = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(fetchHeaders["Authorization"]).toBe("Bearer my-token");

    fetchSpy.mockRestore();
  });

  it("appends query parameters", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
      );

    const { operations } = parseOpenAPISpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = operations.find((o) => o.operationId === "listPets")!;
    const tool = createRestApiTool(listPets, DEFAULT_CONFIG);

    await tool.call(
      { limit: 5, status: "available" },
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    const calledUrl = fetchSpy.mock.calls[0]![0] as string;
    expect(calledUrl).toContain("limit=5");
    expect(calledUrl).toContain("status=available");

    fetchSpy.mockRestore();
  });
});

// ── OpenAPIToolset Integration Tests ─────────────────────────────────────────

describe("OpenAPIToolset", () => {
  it("creates tools from a spec object", () => {
    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>);
    expect(toolset.tools).toHaveLength(4);
    expect(toolset.operations).toHaveLength(4);
    expect(toolset.tools.map((t) => t.name)).toEqual([
      "list_pets",
      "create_pet",
      "show_pet_by_id",
      "delete_pet",
    ]);
  });

  it("creates tools from a JSON string", () => {
    const toolset = OpenAPIToolset.fromSpec(JSON.stringify(PETSTORE_SPEC));
    expect(toolset.tools).toHaveLength(4);
  });

  it("filters operations by operationId array", () => {
    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>, {
      operationFilter: ["listPets", "createPet"],
    });
    expect(toolset.tools).toHaveLength(2);
    expect(toolset.tools.map((t) => t.name)).toEqual(["list_pets", "create_pet"]);
  });

  it("filters operations by function", () => {
    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>, {
      operationFilter: (_id, method) => method === "get",
    });
    expect(toolset.tools).toHaveLength(2);
    expect(toolset.tools.every((t) => t.isReadOnly({}))).toBe(true);
  });

  it("applies name overrides", () => {
    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>, {
      nameOverrides: { listPets: "fetch_all_pets" },
    });
    expect(toolset.tools[0]!.name).toBe("fetch_all_pets");
  });

  it("passes auth config to tools", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
      );

    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>, {
      auth: { type: "bearer", token: "test-token" },
    });

    await toolset.tools[0]!.call(
      {},
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-token");

    fetchSpy.mockRestore();
  });

  it("passes credentials for security scheme resolution", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
      );

    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>, {
      credentials: { ApiKeyAuth: "my-api-key" },
    });

    await toolset.tools[0]!.call(
      {},
      { model: "test", tools: [], signal: new AbortController().signal, messages: [] },
    );

    const headers = (fetchSpy.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("my-api-key");

    fetchSpy.mockRestore();
  });

  it("deduplicates tool names", () => {
    // Spec with duplicate-generating operationIds
    const dupeSpec = {
      openapi: "3.0.0",
      info: { title: "Test", version: "1.0.0" },
      paths: {
        "/a": {
          get: { operationId: "listItems", responses: { "200": { description: "OK" } } },
        },
        "/b": {
          get: { operationId: "listItems", responses: { "200": { description: "OK" } } },
        },
      },
    };

    const toolset = OpenAPIToolset.fromSpec(dupeSpec as Record<string, unknown>);
    expect(toolset.tools.map((t) => t.name)).toEqual(["list_items", "list_items_1"]);
  });

  it("throws on YAML string with fromSpec (sync)", () => {
    expect(() => OpenAPIToolset.fromSpec('openapi: "3.0.0"\n')).toThrow("YAML specs must use");
  });

  it("exposes security schemes from spec", () => {
    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>);
    expect(toolset.securitySchemes).toHaveProperty("ApiKeyAuth");
  });

  it("generates tools with prompt() returning description", () => {
    const toolset = OpenAPIToolset.fromSpec(PETSTORE_SPEC as Record<string, unknown>);
    const listPets = toolset.tools.find((t) => t.name === "list_pets")!;
    expect(listPets.prompt!()).toBe("List all pets");
  });
});
