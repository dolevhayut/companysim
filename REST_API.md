# REST API Specification

## 1. Base URL

```text
http://localhost:4545/api/v1
```

## 2. Design principles

- JSON only for V0.
- Stable public IDs.
- Cursor-based pagination.
- Consistent errors.
- Schema validation on every input.
- REST calls the same application services as MCP and CLI.
- Actor-aware filtering where supported.
- OpenAPI generated from source-of-truth schemas where practical.

## 3. Metadata endpoints

```http
GET /health
GET /api/v1/company
GET /api/v1/stats
GET /openapi.json
GET /docs
```

`/health` should remain lightweight and not require company search.

## 4. Entity endpoints

### People

```http
GET /api/v1/people
GET /api/v1/people/:id
GET /api/v1/people/:id/relationships
GET /api/v1/people/:id/projects
GET /api/v1/people/:id/documents
GET /api/v1/people/:id/messages
```

Suggested filters:

```text
departmentId
teamId
managerId
status
locationId
q
```

### Teams

```http
GET /api/v1/teams
GET /api/v1/teams/:id
GET /api/v1/teams/:id/members
```

### Departments

```http
GET /api/v1/departments
GET /api/v1/departments/:id
```

### Customers

```http
GET /api/v1/customers
GET /api/v1/customers/:id
GET /api/v1/customers/:id/projects
GET /api/v1/customers/:id/tickets
```

### Projects

```http
GET /api/v1/projects
GET /api/v1/projects/:id
GET /api/v1/projects/:id/people
GET /api/v1/projects/:id/documents
GET /api/v1/projects/:id/tickets
```

### Documents

```http
GET /api/v1/documents
GET /api/v1/documents/:id
```

### Messages

```http
GET /api/v1/messages
GET /api/v1/messages/:id
```

### Tickets

```http
GET /api/v1/tickets
GET /api/v1/tickets/:id
```

### Tools

```http
GET /api/v1/tools
GET /api/v1/tools/:id
```

### Events

```http
GET /api/v1/events
GET /api/v1/events/:id
```

### Relationships

```http
GET /api/v1/relationships
```

Filters:

```text
sourceId
sourceType
targetId
targetType
relationType
at
```

## 5. Search

```http
POST /api/v1/search
Content-Type: application/json
```

Request:

```json
{
  "query": "Atlas migration",
  "types": ["project", "document", "message", "ticket"],
  "limit": 25,
  "actorId": "person_123"
}
```

Response:

```json
{
  "results": [
    {
      "entityType": "project",
      "entityId": "project_atlas",
      "title": "Atlas Migration",
      "snippet": "...",
      "score": 0.91,
      "relationshipContext": []
    }
  ],
  "nextCursor": null
}
```

Scores from FTS do not need to pretend to be normalized probabilities. Document score semantics clearly.

## 6. Generation endpoints for local UI

These are local control-plane endpoints, not part of the stable public data API promise yet.

Suggested namespace:

```text
/api/control/*
```

Examples:

```http
POST /api/control/generation/plan
POST /api/control/generation/start
POST /api/control/generation/cancel
POST /api/control/generation/resume
GET  /api/control/generation/status
```

Separate control-plane routes from `/api/v1` data-plane routes.

## 7. Snapshot control endpoints

```http
GET    /api/control/snapshots
POST   /api/control/snapshots
POST   /api/control/snapshots/:id/restore
DELETE /api/control/snapshots/:id
```

## 8. Provider control endpoints

Never return keys.

```http
GET  /api/control/providers
POST /api/control/providers/test
POST /api/control/providers/session-key
DELETE /api/control/providers/session-key/:provider
```

`session-key` should remain memory-only.

## 9. Pagination

List response:

```json
{
  "items": [],
  "nextCursor": "...",
  "hasMore": true
}
```

Cursor should be opaque to clients.

## 10. Actor-aware access

Prefer a clear request mechanism.

Candidate header:

```text
X-CompanySim-Actor: person_123
```

Search request may also include actor explicitly.

For V0, define precedence if both are supplied; recommended: reject mismatch.

## 11. Errors

Use a consistent problem-style structure:

```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Person person_999 was not found.",
    "details": {}
  }
}
```

Suggested status mapping:

```text
400 validation
401 local token required/invalid when enabled
403 permission denied
404 not found
409 conflict
429 provider or runtime rate/budget limitation where appropriate
500 unexpected runtime error
503 provider unavailable/runtime not ready
```

## 12. API compatibility

Do not break `/api/v1` casually.

Experimental control routes can evolve faster.

The public alpha should document which endpoints are stable versus experimental.

### Provider model catalog

`GET /api/control/providers/:provider/models` (`openai` or `anthropic`) returns `{ models: [{ id, name }] }` using the runtime's configured provider credentials. Lists all provider pages without generating content. Provider authorization/connectivity failures use the standard sanitized error envelope. Catalog membership does not guarantee compatibility with text enrichment.
