import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { backup, DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { AppError } from "../../schema/src/index.js";

const branchNameSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/)
  .refine((name) => name !== "main", "The name main is reserved.");

const manifestSchema = z.object({
  formatVersion: z.literal(1),
  name: branchNameSchema,
  source: z.literal("main"),
  createdAt: z.iso.datetime(),
  companyId: z.string(),
  canonicalHash: z.string(),
});

export type CompanyBranch = z.infer<typeof manifestSchema>;

function root(dataDir: string) {
  const path = join(dataDir, "branches");
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if (lstatSync(path).isSymbolicLink())
    throw new AppError("VALIDATION", "Branch directory cannot be a symlink.");
  return path;
}

export function companyBranchPath(dataDir: string, name: string) {
  const path = join(root(dataDir), branchNameSchema.parse(name));
  if (existsSync(path) && lstatSync(path).isSymbolicLink())
    throw new AppError("VALIDATION", "Branch directory cannot be a symlink.");
  return path;
}

export function listCompanyBranches(dataDir: string): CompanyBranch[] {
  return readdirSync(root(dataDir), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(entry.name),
    )
    .flatMap((entry) => {
      try {
        const path = join(root(dataDir), entry.name);
        if (lstatSync(path).isSymbolicLink()) return [];
        return [
          manifestSchema.parse(
            JSON.parse(readFileSync(join(path, "branch.json"), "utf8")),
          ),
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCompanyBranch(
  source: DatabaseSync,
  dataDir: string,
  nameInput: string,
) {
  const name = branchNameSchema.parse(nameInput);
  const path = companyBranchPath(dataDir, name);
  if (existsSync(path))
    throw new AppError("CONFLICT", `Branch ${name} already exists.`, 409);
  mkdirSync(path, { mode: 0o700 });
  try {
    await backup(source, join(path, "company.db"));
    const clone = new DatabaseSync(join(path, "company.db"), {
      readOnly: true,
    });
    let entities: Record<string, unknown>[];
    try {
      entities = clone
        .prepare("SELECT data FROM entities ORDER BY id")
        .all()
        .map((row) => JSON.parse(String(row.data)) as Record<string, unknown>);
    } finally {
      clone.close();
    }
    const company = entities.find((entity) => entity.type === "company");
    if (!company) throw new AppError("NOT_INITIALIZED", "Company not found.");
    const manifest = manifestSchema.parse({
      formatVersion: 1,
      name,
      source: "main",
      createdAt: new Date().toISOString(),
      companyId: company.id,
      canonicalHash: createHash("sha256")
        .update(JSON.stringify(entities))
        .digest("hex"),
    });
    writeFileSync(
      join(path, "branch.json"),
      JSON.stringify(manifest, null, 2),
      {
        flag: "wx",
        mode: 0o600,
      },
    );
    return manifest;
  } catch (error) {
    rmSync(path, { recursive: true, force: true });
    throw error;
  }
}

export function deleteCompanyBranch(dataDir: string, name: string) {
  const path = companyBranchPath(dataDir, name);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink())
    throw new AppError("ENTITY_NOT_FOUND", "Branch was not found.", 404);
  rmSync(path, { recursive: true });
  return { deleted: true, name };
}
