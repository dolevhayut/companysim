# Canonical Data Model

## 1. Purpose

The CompanySim schema is a core strategic asset. The objective is not to imitate individual SaaS vendors; it is to define a normalized representation of an organization that is useful to enterprise software and AI agents.

## 2. General entity fields

All first-class entities should include:

```ts
interface BaseEntity {
  id: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
```

Where historical meaning differs from record creation time, entities include domain timestamps such as `startDate`, `occurredAt`, `effectiveFrom`, etc.

## 3. ID strategy

IDs must be:

- stable,
- opaque,
- URL-safe,
- unique within a company environment,
- reproducible for deterministic structural entities when using same seed/config/generator version.

Examples:

```text
person_01...
team_01...
customer_01...
project_01...
doc_01...
msg_01...
event_01...
```

Do not expose database auto-increment IDs as public identifiers.

## 4. Company

Key fields:

```text
id
name
legalName?
industry
foundedDate
headquartersLocationId?
regions[]
defaultTimezone
currency
employeeCountTarget
companySizeProfile
websiteDomain (.test by default)
```

## 5. Location

```text
id
name
country
region?
city?
timezone
kind: headquarters | office | remote_hub | warehouse | plant | other
```

## 6. Department

```text
id
name
code
leaderPersonId?
parentDepartmentId?
```

## 7. Team

```text
id
name
departmentId
managerPersonId?
memberCount
purpose?
```

## 8. Role

Role is distinct from Person so people can change roles through time.

```text
id
title
level
jobFamily
departmentId?
isManager
```

## 9. Person

```text
id
firstName
lastName
displayName
email
status: active | leave | departed
employmentType
locationId?
currentRoleId
currentDepartmentId
currentTeamId?
managerPersonId?
startDate
endDate?
skills[]
locale?
```

Optional structured generation traits:

```text
communicationStyle
technicalDepth
senioritySignal
```

Avoid pseudo-psychological profiling.

## 10. Customer

```text
id
name
industry
status: prospect | active | at_risk | churned
accountOwnerPersonId?
annualValue?
currency?
startDate?
renewalDate?
health?
```

## 11. CustomerContact

```text
id
customerId
name
title?
email
relationshipStrength?
```

Use fictional domains.

## 12. Project

```text
id
name
status
ownerPersonId
customerId?
teamIds[]
startDate
endDate?
targetDate?
description?
priority?
```

## 13. Task

```text
id
projectId?
title
status
assigneePersonId?
reporterPersonId?
priority
createdAt
completedAt?
```

## 14. Folder

```text
id
name
parentFolderId?
ownerPersonId?
visibility
```

## 15. Document

```text
id
title
body
mimeType
folderId?
authorPersonId?
projectId?
customerId?
createdAt
updatedAt
visibility
```

Document body may be template-generated or LLM-enriched.

## 16. Channel

```text
id
name
kind: public | private | direct | group
teamId?
projectId?
```

## 17. Conversation

```text
id
channelId?
participantPersonIds[]
subject?
startedAt
```

## 18. Message

```text
id
conversationId
senderPersonId
timestamp
body
replyToMessageId?
projectId?
customerId?
```

## 19. Ticket

```text
id
title
description
status
priority
requesterPersonId?
assigneePersonId?
customerId?
projectId?
createdAt
resolvedAt?
```

## 20. Policy

```text
id
title
body
ownerDepartmentId?
ownerPersonId?
effectiveFrom
effectiveTo?
visibility
```

## 21. Tool

Represents software/systems used by the organization.

```text
id
name
category
vendor?
ownedByDepartmentId?
adminPersonIds[]
status
```

Examples:

```text
CRM
HRIS
issue_tracker
chat
file_storage
analytics
finance
```

Do not imply protocol compatibility with real vendors unless explicitly implemented later.

## 22. Permission

Permission is generic enough to support actor-aware testing.

```text
id
subjectType: person | team | department | company
subjectId
resourceType
resourceId
access: view | edit | admin
validFrom?
validTo?
```

For V0, simple visibility rules may be derived without materializing every row-level permission. Use explicit rows only where needed.

## 23. Relationship

Relationships are first-class and temporal.

```text
id
sourceType
sourceId
relationType
targetType
targetId
validFrom
validTo?
metadata?
```

Initial relation types:

```text
reports_to
manages
member_of
owns
works_on
supports
authored
mentioned_in
related_to
assigned_to
customer_of
uses
has_access_to
```

## 24. Event

Events define organizational history.

```text
id
type
occurredAt
actorType?
actorId?
subjectType?
subjectId?
payload
```

Initial event types:

```text
employee_hired
employee_promoted
employee_transferred
employee_departed
team_created
customer_created
customer_renewed
customer_escalated
customer_churned
project_created
project_delayed
project_completed
ticket_created
ticket_escalated
ticket_resolved
policy_created
policy_changed
company_reorganized
```

## 25. Temporal role history

Do not rely only on `Person.currentRoleId` for historical generation.

Maintain employment/assignment history, for example:

```text
person_role_history
person_team_history
person_manager_history
```

or model those transitions through temporal relationships/events plus an efficient resolved view.

The implementation choice can vary, but resolving correct state at timestamp is mandatory.

## 26. Search document

Create a unified search projection containing:

```text
entityType
entityId
title
searchableText
timestamp?
visibility metadata
```

Index with FTS5.

## 27. Generation metadata

Store per generated content item where useful:

```text
generatorVersion
promptVersion
provider?
model?
contentJobId?
generatedAt
```

Never store provider API keys.

## 28. Database metadata

Maintain a metadata table for:

```text
schemaVersion
generatorVersion
companySeed
companyId
createdAt
lastGeneratedAt
```

## 29. Referential integrity

Use foreign keys for core relational fields whenever feasible.

Cross-type generic relationships must be validated at application level if SQLite cannot express polymorphic foreign keys directly.

A validation command/test must detect:

- unknown IDs,
- impossible timeline references,
- invalid relationship endpoints,
- orphaned content,
- duplicate public IDs.
