import { z } from "zod";
export const VERSION = "0.1.0-alpha.2";
export const GENERATOR_VERSION = 2;
const currentUtcDay = () =>
  new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";
export const types = [
  "company",
  "location",
  "department",
  "team",
  "role",
  "person",
  "customer",
  "customerContact",
  "project",
  "task",
  "folder",
  "document",
  "channel",
  "conversation",
  "message",
  "ticket",
  "policy",
  "tool",
  "permission",
  "relationship",
  "event",
] as const;
export const entityType = z.enum(types);
export type EntityType = z.infer<typeof entityType>;
const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{1,100}$/);
export const entitySchema = z
  .object({
    id,
    type: entityType,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    name: z.string().max(300).optional(),
    title: z.string().max(300).optional(),
    body: z.string().max(30000).optional(),
    description: z.string().max(30000).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    email: z.email().optional(),
    industry: z.string().optional(),
    foundedDate: z.string().optional(),
    websiteDomain: z.string().optional(),
    regions: z.array(z.string()).optional(),
    defaultTimezone: z.string().optional(),
    currency: z.string().optional(),
    employeeCountTarget: z.number().optional(),
    companySizeProfile: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
    kind: z.string().optional(),
    code: z.string().optional(),
    level: z.number().optional(),
    jobFamily: z.string().optional(),
    isManager: z.boolean().optional(),
    memberCount: z.number().optional(),
    status: z.string().optional(),
    employmentType: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    targetDate: z.string().optional(),
    renewalDate: z.string().optional(),
    annualValue: z.number().optional(),
    health: z.number().optional(),
    skills: z.array(z.string()).optional(),
    locale: z.string().optional(),
    locationId: id.optional(),
    headquartersLocationId: id.optional(),
    departmentId: id.optional(),
    leaderPersonId: id.optional(),
    parentDepartmentId: id.optional(),
    managerPersonId: id.optional(),
    currentRoleId: id.optional(),
    currentDepartmentId: id.optional(),
    currentTeamId: id.optional(),
    accountOwnerPersonId: id.optional(),
    customerId: id.optional(),
    ownerPersonId: id.optional(),
    projectId: id.optional(),
    assigneePersonId: id.optional(),
    reporterPersonId: id.optional(),
    parentFolderId: id.optional(),
    folderId: id.optional(),
    authorPersonId: id.optional(),
    channelId: id.optional(),
    teamId: id.optional(),
    conversationId: id.optional(),
    senderPersonId: id.optional(),
    replyToMessageId: id.optional(),
    requesterPersonId: id.optional(),
    ownerDepartmentId: id.optional(),
    ownedByDepartmentId: id.optional(),
    teamIds: z.array(id).optional(),
    participantPersonIds: z.array(id).optional(),
    adminPersonIds: z.array(id).optional(),
    priority: z.string().optional(),
    mimeType: z.string().optional(),
    subject: z.string().optional(),
    timestamp: z.string().optional(),
    startedAt: z.string().optional(),
    completedAt: z.string().optional(),
    resolvedAt: z.string().optional(),
    effectiveFrom: z.string().optional(),
    effectiveTo: z.string().optional(),
    category: z.string().optional(),
    vendor: z.string().optional(),
    visibility: z
      .enum([
        "public",
        "company",
        "department",
        "team",
        "restricted",
        "private",
      ])
      .optional(),
    subjectType: entityType.optional(),
    subjectId: id.optional(),
    resourceType: entityType.optional(),
    resourceId: id.optional(),
    access: z.enum(["view", "edit", "admin"]).optional(),
    sourceType: entityType.optional(),
    sourceId: id.optional(),
    targetType: entityType.optional(),
    targetId: id.optional(),
    relationType: z.string().optional(),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    occurredAt: z.string().optional(),
    eventType: z.string().optional(),
    actorType: entityType.optional(),
    actorId: id.optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .superRefine((entity, ctx) => {
    const required: Record<string, string[]> = {
      company: ["name", "industry", "foundedDate", "websiteDomain"],
      location: ["name", "country", "timezone", "kind"],
      department: ["name", "code"],
      team: ["name", "departmentId", "memberCount"],
      role: ["title", "level", "jobFamily", "isManager"],
      person: [
        "firstName",
        "lastName",
        "displayName",
        "email",
        "currentRoleId",
        "currentDepartmentId",
        "startDate",
        "status",
      ],
      customer: ["name", "industry", "status"],
      customerContact: ["customerId", "name", "email"],
      project: ["name", "ownerPersonId", "status", "startDate"],
      task: ["title", "status", "priority"],
      folder: ["name", "visibility"],
      document: ["title", "body", "mimeType", "visibility"],
      channel: ["name", "kind"],
      conversation: ["participantPersonIds", "startedAt"],
      message: ["conversationId", "senderPersonId", "timestamp", "body"],
      ticket: ["title", "description", "status", "priority"],
      policy: ["title", "body", "effectiveFrom", "visibility"],
      tool: ["name", "category", "status"],
      permission: [
        "subjectType",
        "subjectId",
        "resourceType",
        "resourceId",
        "access",
      ],
      relationship: [
        "sourceType",
        "sourceId",
        "targetType",
        "targetId",
        "relationType",
        "validFrom",
      ],
      event: ["eventType", "occurredAt", "payload"],
    };
    for (const key of required[entity.type] ?? [])
      if (entity[key as keyof typeof entity] === undefined)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Required for " + entity.type,
        });
  });
export type Entity = z.infer<typeof entitySchema>;
export const configSchema = z
  .object({
    name: z.string().min(1).max(100).default("Acme"),
    industry: z.enum(["saas", "generic"]).default("saas"),
    employees: z.coerce.number().int().min(1).max(10000).default(100),
    historyYears: z.coerce.number().int().min(1).max(50).default(5),
    seed: z.coerce.string().max(100).default("42"),
    asOf: z.iso.datetime().default(currentUtcDay),
    mode: z.enum(["lite", "realistic"]).default("lite"),
    density: z.enum(["low", "medium", "high"]).default("low"),
    regions: z.array(z.string().max(50)).min(1).default(["US"]),
    locations: z
      .array(
        z.object({
          name: z.string(),
          country: z.string(),
          city: z.string().optional(),
          timezone: z.string().default("UTC"),
        }),
      )
      .min(1)
      .max(100)
      .default([
        {
          name: "Austin HQ",
          country: "US",
          city: "Austin",
          timezone: "America/Chicago",
        },
      ]),
    customers: z.coerce.number().int().min(1).max(2000).optional(),
    projects: z.coerce.number().int().min(1).max(2000).optional(),
    documents: z.coerce.number().int().min(0).max(100000).optional(),
    messages: z.coerce.number().int().min(0).max(500000).optional(),
    features: z
      .object({
        documents: z.boolean().default(true),
        messages: z.boolean().default(true),
        tickets: z.boolean().default(true),
        policies: z.boolean().default(true),
        tools: z.boolean().default(true),
        events: z.boolean().default(true),
      })
      .default({
        documents: true,
        messages: true,
        tickets: true,
        policies: true,
        tools: true,
        events: true,
      }),
  })
  .strict();
export type Config = z.infer<typeof configSchema>;
export const listSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(200).default(25),
    cursor: z.string().max(300).optional(),
    q: z.string().max(200).optional(),
    query: z.string().max(200).optional(),
    actorId: id.optional(),
    departmentId: id.optional(),
    teamId: id.optional(),
    managerId: id.optional(),
    status: z.string().max(50).optional(),
    locationId: id.optional(),
    sourceId: id.optional(),
    targetId: id.optional(),
    sourceType: entityType.optional(),
    targetType: entityType.optional(),
    relationType: z.string().max(50).optional(),
    at: z.iso.datetime().optional(),
  })
  .strict();
export type ListInput = z.input<typeof listSchema>;
export const searchSchema = z
  .object({
    query: z.string().min(1).max(200),
    types: z.array(entityType).optional(),
    limit: z.number().int().min(1).max(200).default(25),
    actorId: id.optional(),
  })
  .strict();
export const enrichmentSchema = z
  .object({
    provider: z.enum(["openai", "anthropic"]),
    model: z.string().min(1).max(150),
    maxCostUsd: z.number().nonnegative(),
    costPerJobUsd: z.number().positive(),
    only: z.array(z.enum(["document", "message", "ticket"])).optional(),
    force: z.boolean().optional(),
  })
  .strict();
export type Enrichment = z.infer<typeof enrichmentSchema>;
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function safeError(e: unknown) {
  if (e instanceof AppError) return { code: e.code, message: e.message };
  if (e instanceof z.ZodError)
    return {
      code: "VALIDATION",
      message:
        "Invalid input: " +
        e.issues.map((i) => i.path.join(".") + ": " + i.code).join(", "),
    };
  return {
    code: "INTERNAL",
    message: "Operation failed. Check configuration and retry.",
  };
}
export const routes: Record<string, EntityType> = {
  people: "person",
  teams: "team",
  departments: "department",
  customers: "customer",
  projects: "project",
  documents: "document",
  messages: "message",
  tickets: "ticket",
  tools: "tool",
  events: "event",
  relationships: "relationship",
  policies: "policy",
  locations: "location",
  roles: "role",
  tasks: "task",
  folders: "folder",
  channels: "channel",
  conversations: "conversation",
  permissions: "permission",
  contacts: "customerContact",
};
export function references(e: Entity): [string, string][] {
  return Object.entries(e).flatMap(([k, v]) =>
    k !== "id" && k.endsWith("Id") && typeof v === "string"
      ? [[k, v] as [string, string]]
      : k.endsWith("Ids") && Array.isArray(v)
        ? v.map((x) => [k, String(x)] as [string, string])
        : [],
  );
}
