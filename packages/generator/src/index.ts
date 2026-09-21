import { createHash } from "node:crypto";
import {
  configSchema,
  GENERATOR_VERSION,
  references,
  type Config,
  type Entity,
  type EntityType,
} from "../../schema/src/index.js";
export function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function rng(seed: string) {
  let s = parseInt(hash(seed).slice(0, 8), 16);
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function plan(input: unknown) {
  const c = configSchema.parse(input);
  const scale = { low: 1, medium: 4, high: 10 }[c.density];
  return {
    config: c,
    generatorVersion: GENERATOR_VERSION,
    counts: {
      people: c.employees,
      customers: c.customers ?? Math.max(2, Math.ceil(c.employees / 10)),
      projects: c.projects ?? Math.max(2, Math.ceil(c.employees / 10)),
      documents: c.features.documents
        ? (c.documents ?? c.employees * scale)
        : 0,
      messages: c.features.messages
        ? (c.messages ?? c.employees * scale * 5)
        : 0,
    },
  };
}
export function generate(input: unknown): {
  config: Config;
  entities: Entity[];
} {
  const { config: c, counts } = plan(input),
    entities: Entity[] = [];
  const root = hash([GENERATOR_VERSION, c]);
  const uid = (t: string, i: number) =>
    t + "_" + hash([root, t, i]).slice(0, 20);
  const now = c.asOf;
  const start = new Date(
    Date.parse(now) - c.historyYears * 365 * 86400000,
  ).toISOString();
  const middle = new Date(
    (Date.parse(start) + Date.parse(now)) / 2,
  ).toISOString();
  const add = (type: EntityType, i: number, data: Partial<Entity>) => {
    const e = {
      id: uid(type, i),
      type,
      createdAt: start,
      updatedAt: now,
      ...data,
    };
    entities.push(e);
    return e;
  };
  const company = add("company", 0, {
    name: c.name,
    industry: c.industry,
    foundedDate: start,
    headquartersLocationId: uid("location", 0),
    regions: c.regions,
    defaultTimezone: "UTC",
    currency: "USD",
    employeeCountTarget: c.employees,
    companySizeProfile:
      c.employees < 50 ? "startup" : c.employees < 250 ? "smb" : "mid-market",
    websiteDomain: c.name.toLowerCase().replace(/[^a-z0-9]/g, "-") + ".test",
  });
  c.locations.forEach((l, i) =>
    add("location", i, { ...l, kind: i === 0 ? "headquarters" : "office" }),
  );
  const depts = [
    "Executive",
    "Engineering",
    "Product",
    "Sales",
    "Customer Success",
    "Operations",
  ].slice(0, Math.min(6, Math.ceil(c.employees / 8)));
  const teamCount = Math.ceil(c.employees / 8);
  for (let i = 0; i < depts.length; i++)
    add("department", i, {
      name: depts[i],
      code: depts[i].slice(0, 3).toUpperCase(),
      leaderPersonId: uid("person", i * 8),
    });
  for (let i = 0; i < teamCount; i++)
    add("team", i, {
      name: depts[i % depts.length] + " " + (i + 1),
      departmentId: uid("department", i % depts.length),
      managerPersonId: uid("person", i * 8),
      memberCount: Math.min(8, c.employees - i * 8),
    });
  const first = [
    "Avery",
    "Jordan",
    "Morgan",
    "Riley",
    "Casey",
    "Taylor",
    "Sam",
    "Alex",
    "Quinn",
    "Drew",
    "Jamie",
    "Robin",
  ];
  const last = [
    "Vale",
    "Chen",
    "Brooks",
    "Patel",
    "Reed",
    "Kim",
    "Rivera",
    "Shaw",
    "Okafor",
    "Stone",
    "Park",
    "Ellis",
  ];
  for (let i = 0; i < c.employees; i++) {
    const r = rng(c.seed + ":person:" + i),
      team = Math.floor(i / 8),
      dep = team % depts.length;
    const name = first[Math.floor(r() * first.length)],
      surname = last[Math.floor(r() * last.length)];
    const title =
      i === 0
        ? "Chief Executive Officer"
        : (i % 8 === 0 ? "Team Lead" : "Specialist") + " · " + depts[dep];
    add("role", i, {
      title,
      level: i === 0 ? 10 : i % 8 === 0 ? 6 : 3,
      jobFamily: depts[dep],
      departmentId: uid("department", dep),
      isManager: i === 0 || i % 8 === 0,
    });
    add("person", i, {
      firstName: name,
      lastName: surname,
      displayName: name + " " + surname,
      email: `${name.toLowerCase()}.${surname.toLowerCase()}.${i}@${company.websiteDomain}`,
      status: "active",
      employmentType: "full_time",
      locationId: uid("location", i % c.locations.length),
      currentRoleId: uid("role", i),
      currentDepartmentId: uid("department", dep),
      currentTeamId: uid("team", team),
      ...(i
        ? {
            managerPersonId: uid(
              "person",
              i % 8 === 0 ? Math.floor((i / 8 - 1) / 6) * 8 : team * 8,
            ),
          }
        : {}),
      startDate: start,
      skills: [depts[dep]],
      locale: "en-US",
    });
  }
  // A promotion has explicit old and new role intervals; historical content resolves these intervals.
  add("role", c.employees, {
    title: "Founding Director",
    level: 8,
    jobFamily: "Executive",
    isManager: true,
    departmentId: uid("department", 0),
  });
  let rel = 0;
  const relate = (
    source: Entity,
    target: Entity,
    relationType: string,
    from = start,
    to?: string,
  ) =>
    add("relationship", rel++, {
      sourceType: source.type,
      sourceId: source.id,
      targetType: target.type,
      targetId: target.id,
      relationType,
      validFrom: from,
      ...(to ? { validTo: to } : {}),
    });
  const person = (i: number) =>
    entities.find((e) => e.id === uid("person", i % c.employees))!;
  for (let i = 0; i < counts.customers; i++) {
    add("customer", i, {
      name:
        ["Northstar", "Cloudcrest", "Willow", "Summit"][i % 4] +
        " Labs " +
        (i + 1),
      industry: c.industry,
      status: i % 7 === 0 ? "at_risk" : "active",
      accountOwnerPersonId: person(i).id,
      annualValue: 10000 + i * 1250,
      currency: "USD",
      startDate: start,
      renewalDate: now,
      health: 60 + (i % 40),
    });
    add("customerContact", i, {
      customerId: uid("customer", i),
      name: first[i % first.length] + " " + last[i % last.length],
      email: `contact@customer-${i}.test`,
      title: "Operations Director",
    });
  }
  for (let i = 0; i < counts.projects; i++) {
    const project = add("project", i, {
      name:
        [
          "Atlas Migration",
          "Beacon Launch",
          "Cedar Integration",
          "Drift Analytics",
        ][i % 4] +
        " " +
        (i + 1),
      status: "active",
      ownerPersonId: person(i).id,
      customerId: uid("customer", i % counts.customers),
      teamIds: [uid("team", i % teamCount)],
      startDate: start,
      targetDate: now,
      description: "Delivery, migration and adoption for a fictional customer.",
      priority: "high",
    });
    relate(project, person(i), "owns");
    relate(
      project,
      entities.find((e) => e.id === project.customerId)!,
      "related_to",
    );
    for (let j = 0; j < Math.min(3, c.employees); j++)
      relate(person(i + j), project, "works_on");
    add("task", i, {
      projectId: project.id,
      title: project.name + " readiness",
      status: "in_progress",
      assigneePersonId: person(i).id,
      reporterPersonId: person(0).id,
      priority: "medium",
    });
  }
  add("folder", 0, {
    name: "Company knowledge",
    ownerPersonId: person(0).id,
    visibility: "company",
  });
  for (let i = 0; i < teamCount; i++) {
    add("channel", i, {
      name: "team-" + (i + 1),
      kind: "public",
      teamId: uid("team", i),
    });
    add("conversation", i, {
      channelId: uid("channel", i),
      participantPersonIds: Array.from(
        { length: Math.min(8, c.employees - i * 8) },
        (_, j) => person(i * 8 + j).id,
      ),
      subject: "Delivery coordination",
      startedAt: middle,
    });
  }
  const projects = entities.filter((e) => e.type === "project");
  for (let i = 0; i < counts.documents; i++) {
    const p = projects[i % projects.length],
      author = person(i);
    const oldTitle =
      i % c.employees === 0
        ? "Founding Director"
        : entities.find((e) => e.id === author.currentRoleId)!.title;
    add("document", i, {
      title:
        p.name +
        " · " +
        ["Risk review", "Delivery plan", "Decision record"][i % 3],
      body: `${p.name}: ${author.displayName}, ${oldTitle}, documents scope, milestones, customer needs and delivery risks. All identities are fictional.`,
      mimeType: "text/markdown",
      folderId: uid("folder", 0),
      authorPersonId: author.id,
      projectId: p.id,
      customerId: p.customerId,
      createdAt: start,
      visibility: i % 10 === 0 ? "private" : "company",
    });
  }
  for (let i = 0; i < counts.messages; i++) {
    const p = projects[i % projects.length],
      sender = person(i);
    add("message", i, {
      conversationId: uid("conversation", Math.floor((i % c.employees) / 8)),
      senderPersonId: sender.id,
      timestamp: middle,
      createdAt: middle,
      body: `${p.name}: ${sender.displayName} shared a delivery update. Please review the customer migration checklist and open risks.`,
      projectId: p.id,
      customerId: p.customerId,
    });
  }
  if (c.features.tickets)
    for (let i = 0; i < counts.customers * 2; i++) {
      const p = projects[i % projects.length];
      add("ticket", i, {
        title: p.name + " support request " + (i + 1),
        description:
          "Fictional customer requests help validating the integration rollout.",
        status: "open",
        priority: i % 4 === 0 ? "high" : "medium",
        assigneePersonId: person(i).id,
        customerId: p.customerId,
        projectId: p.id,
      });
    }
  if (c.features.policies)
    add("policy", 0, {
      title: "Information security policy",
      body: "Use least privilege. Review access quarterly. Escalate incidents to Operations.",
      ownerDepartmentId: uid("department", 0),
      ownerPersonId: person(0).id,
      effectiveFrom: start,
      visibility: "company",
    });
  if (c.features.tools)
    ["CRM", "HRIS", "issue_tracker", "chat", "file_storage"].forEach(
      (category, i) =>
        add("tool", i, {
          name: "Company " + category,
          category,
          status: "active",
          ownedByDepartmentId: uid("department", i % depts.length),
          adminPersonIds: [person(i).id],
        }),
    );
  for (const p of entities.filter((e) => e.type === "person")) {
    relate(
      p,
      entities.find((e) => e.id === p.currentTeamId)!,
      "member_of",
    );
    if (p.managerPersonId)
      relate(
        p,
        entities.find((e) => e.id === p.managerPersonId)!,
        "reports_to",
      );
    if (p.id === person(0).id) {
      relate(
        p,
        entities.find((e) => e.id === uid("role", c.employees))!,
        "has_role",
        start,
        middle,
      );
      relate(
        p,
        entities.find((e) => e.id === p.currentRoleId)!,
        "has_role",
        middle,
      );
    } else
      relate(
        p,
        entities.find((e) => e.id === p.currentRoleId)!,
        "has_role",
      );
  }
  if (c.features.events) {
    entities
      .filter((e) => e.type === "person")
      .forEach((p, i) =>
        add("event", i, {
          eventType: "employee_hired",
          occurredAt: start,
          subjectType: "person",
          subjectId: p.id,
          payload: {},
        }),
      );
    add("event", c.employees, {
      eventType: "employee_promoted",
      occurredAt: middle,
      subjectType: "person",
      subjectId: person(0).id,
      payload: {
        fromRoleId: uid("role", c.employees),
        toRoleId: uid("role", 0),
      },
    });
  }
  const doc = entities.find((e) => e.type === "document");
  if (doc)
    add("permission", 0, {
      subjectType: "person",
      subjectId: doc.authorPersonId,
      resourceType: "document",
      resourceId: doc.id,
      access: "admin",
      validFrom: start,
    });
  const invalid = validate(entities);
  if (invalid.length) throw new Error(invalid.join("; "));
  return { config: c, entities };
}
export function validate(entities: Entity[]) {
  const errors: string[] = [];
  const map = new Map(entities.map((e) => [e.id, e]));
  if (map.size !== entities.length) errors.push("duplicate IDs");
  for (const e of entities) {
    for (const [k, v] of references(e)) {
      if (!map.has(v)) errors.push(`${e.id}.${k} is unknown`);
      const expected: Record<string, EntityType> = {
        locationId: "location",
        headquartersLocationId: "location",
        departmentId: "department",
        currentDepartmentId: "department",
        ownerDepartmentId: "department",
        ownedByDepartmentId: "department",
        parentDepartmentId: "department",
        teamId: "team",
        currentTeamId: "team",
        teamIds: "team",
        currentRoleId: "role",
        customerId: "customer",
        projectId: "project",
        folderId: "folder",
        parentFolderId: "folder",
        channelId: "channel",
        conversationId: "conversation",
        replyToMessageId: "message",
      };
      const targetType =
        k.endsWith("PersonId") || k.endsWith("PersonIds")
          ? "person"
          : expected[k];
      if (targetType && map.get(v)?.type !== targetType)
        errors.push(`${e.id}.${k} has wrong entity type`);
    }
    if (e.type === "person") {
      const visited = new Set([e.id]);
      let p = map.get(e.managerPersonId ?? "");
      while (p) {
        if (visited.has(p.id)) {
          errors.push("manager cycle");
          break;
        }
        visited.add(p.id);
        p = map.get(p.managerPersonId ?? "");
      }
    }
    const author = map.get(e.authorPersonId ?? e.senderPersonId ?? "");
    if (author?.startDate && author.startDate > (e.timestamp ?? e.createdAt))
      errors.push("author before employment");
    if (e.sourceId && map.get(e.sourceId)?.type !== e.sourceType)
      errors.push("source type mismatch");
    if (e.targetId && map.get(e.targetId)?.type !== e.targetType)
      errors.push("target type mismatch");
  }
  return errors;
}
