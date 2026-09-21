import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listSchema,
  searchSchema,
  safeError,
  VERSION,
  type EntityType,
} from "../../schema/src/index.js";
import type { Services } from "../../core/src/index.js";
export function createMcp(services: Services) {
  const server = new McpServer({ name: "companysim", version: VERSION });
  const register = (
    name: string,
    schema: z.ZodType,
    fn: (input: Record<string, unknown>) => unknown,
  ) =>
    server.registerTool(
      name,
      {
        description: name.replaceAll("_", " ") + " in the synthetic company",
        inputSchema: schema as z.ZodObject,
        annotations: { readOnlyHint: true, destructiveHint: false },
      },
      async (input) => {
        try {
          const value = fn(input as Record<string, unknown>);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(value) }],
            structuredContent: value as Record<string, unknown>,
          };
        } catch (e) {
          return {
            isError: true,
            content: [
              { type: "text" as const, text: JSON.stringify(safeError(e)) },
            ],
          };
        }
      },
    );
  register("get_company", z.object({}), () => services.company());
  register("get_company_stats", z.object({}), () => services.stats());
  register("search_company", searchSchema, (input) => services.search(input));
  const names: Record<string, EntityType> = {
    find_people: "person",
    find_teams: "team",
    find_customers: "customer",
    find_projects: "project",
    search_documents: "document",
    search_messages: "message",
    search_tickets: "ticket",
    find_tools: "tool",
    get_relationships: "relationship",
  };
  for (const [name, type] of Object.entries(names))
    register(name, listSchema, (input) => services.list(type, input));
  for (const type of [
    "person",
    "team",
    "customer",
    "project",
    "document",
    "message",
    "ticket",
    "tool",
  ] as const)
    register(
      "get_" + type,
      z.object({
        [type + "Id"]: z.string(),
        actorId: z.string().optional(),
        include: z.array(z.enum(["relationships", "projects"])).optional(),
      }),
      (input) => {
        const e = services.get(
          type,
          String(input[type + "Id"]),
          input.actorId as string | undefined,
        );
        const include = input.include as string[] | undefined;
        return {
          ...e,
          ...(include?.includes("relationships")
            ? {
                relationships: services.related(
                  type,
                  e.id,
                  "relationship",
                  input.actorId as string | undefined,
                ),
              }
            : {}),
          ...(include?.includes("projects")
            ? {
                projects: services.related(
                  type,
                  e.id,
                  "project",
                  input.actorId as string | undefined,
                ),
              }
            : {}),
        };
      },
    );
  return server;
}
