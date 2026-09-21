# MCP Server Specification

## 1. Goal

Expose the same CompanySim company state to AI hosts and agents through Model Context Protocol.

The MCP server is an adapter over application services, not an independent implementation.

## 2. Transports

Required:

- stdio for clients that launch a local subprocess,
- Streamable HTTP for clients connecting to the running local server.

HTTP endpoint:

```text
http://localhost:4545/mcp
```

Use the current stable official MCP TypeScript SDK at implementation time.

Target the current MCP specification behavior rather than legacy HTTP+SSE.

## 3. Tool naming

Names should be stable, obvious, and vendor-neutral.

Initial tools:

```text
get_company
get_company_stats
get_company_entry_points
find_people
get_person
find_teams
get_team
find_customers
get_customer
find_projects
get_project
search_documents
get_document
search_messages
get_message
search_tickets
get_ticket
find_tools
get_tool
get_relationships
search_company
```

## 4. Tool design principles

- Prefer fewer powerful tools over dozens of microscopic tools.
- Return structured content where the SDK supports it cleanly.
- Keep response size bounded.
- Support pagination/limit for list/search tools.
- Never leak provider credentials.
- Do not expose raw SQLite access.
- Apply actor-aware visibility consistently with REST.

## 5. `get_company`

Input: none.

Returns:

```text
company identity
industry
size
locations
history window
available entity counts
runtime metadata safe for clients
```

## 6. `find_people`

Input schema concept:

```json
{
  "query": "product manager",
  "departmentId": null,
  "teamId": null,
  "status": "active",
  "limit": 20
}
```

Returns lightweight person summaries.

`get_company_entry_points` returns a bounded first set of active projects,
at-risk customers and key people, plus the simulation date. Agents can use it
as their first domain read when they do not yet have search terms or IDs.

## 7. `get_person`

Input:

```json
{
  "personId": "person_123",
  "include": ["relationships", "projects", "documents", "messages"]
}
```

Do not return every associated message/document by default.

Entity getters support bounded relationship expansion through `include`.
Available expansions are `relationships`, `projects`, `people`, `documents`,
`messages`, `tickets` and `members`. This mirrors the REST scoped sub-resources;
for example, `get_project({projectId, include:["documents","people"]})` returns
the same collections as `/projects/{id}/documents` and `/projects/{id}/people`.

## 8. `search_company`

This is the flagship tool.

Input:

```json
{
  "query": "everything related to the Atlas migration",
  "types": [],
  "actorId": null,
  "limit": 30
}
```

Output should group or annotate heterogeneous entity results so an agent can understand what it found.

Potential response structure:

```json
{
  "summary": {
    "query": "...",
    "resultCount": 12
  },
  "results": [
    {
      "entityType": "project",
      "entityId": "project_atlas",
      "title": "Atlas Migration",
      "snippet": "..."
    }
  ]
}
```

Do not have `search_company` call an LLM by default. It should search the generated company deterministically.

## 9. MCP resources

Optional for V0.1 if they improve client interoperability.

Possible URI scheme:

```text
companysim://company
companysim://people/{id}
companysim://customers/{id}
companysim://projects/{id}
companysim://documents/{id}
```

Tools are higher priority than resources for the first end-to-end release.

## 10. MCP prompts

Not necessary for V0.

Do not add prompts merely to demonstrate MCP features.

## 11. stdio behavior

Command:

```bash
company mcp
```

Requirements:

- stdout reserved for protocol messages,
- logs go to stderr,
- no interactive prompts,
- process exits cleanly when parent closes stdin,
- database path/config can be passed by flags/environment.

## 12. HTTP behavior

The runtime's `/mcp` endpoint should be mounted through the official server SDK/handler compatible with the current stable Streamable HTTP specification.

Do not hand-roll JSON-RPC framing.

## 13. Errors

Tool errors should be concise and actionable.

Examples:

- entity not found,
- invalid actor,
- permission denied,
- query too broad,
- company not generated,
- runtime not ready.

## 14. Parity requirement

Create tests asserting equivalent domain behavior for matching REST and MCP operations.

Example:

```text
REST GET /people/person_123
MCP get_person(person_123)
```

They may have different protocol wrappers, but must represent the same underlying entity state.

## 15. Current protocol implementation note

As of the 2026 MCP specification line, standard transports include stdio and Streamable HTTP, and the current TypeScript SDK exposes server helpers for those transports. Implementation must confirm the current stable package API from official MCP documentation before coding because SDK package organization can evolve.
