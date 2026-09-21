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
  const nowMs = Date.parse(now);
  const startMs = nowMs - c.historyYears * 365 * 86400000;
  const start = new Date(startMs).toISOString();
  const middle = new Date((startMs + nowMs) / 2).toISOString();
  const between = (key: string, i: number, from = startMs, to = nowMs) => {
    const value = rng(`${c.seed}:${key}:${i}`)();
    return new Date(
      from + Math.floor(value * Math.max(1, to - from)),
    ).toISOString();
  };
  const offset = (days: number) =>
    new Date(nowMs + days * 86400000).toISOString();
  const add = (type: EntityType, i: number, data: Partial<Entity>) => {
    const createdAt =
      data.createdAt ?? between(`${type}:created`, i, startMs, nowMs);
    const updatedAt =
      data.updatedAt ??
      between(`${type}:updated`, i, Date.parse(createdAt), nowMs);
    const e = {
      id: uid(type, i),
      type,
      ...data,
      createdAt,
      updatedAt,
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
    createdAt: start,
    updatedAt: now,
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
  const teamSpecialties = [
    "Platform",
    "Foundations",
    "Experience",
    "Growth",
    "Operations",
    "Insights",
    "Reliability",
    "Enablement",
    "Core Systems",
    "Customer Outcomes",
    "Automation",
    "Strategy",
  ];
  for (let i = 0; i < depts.length; i++)
    add("department", i, {
      name: depts[i],
      code: depts[i].slice(0, 3).toUpperCase(),
      leaderPersonId: uid("person", i * 8),
    });
  for (let i = 0; i < teamCount; i++)
    add("team", i, {
      name:
        depts[i % depts.length] +
        " · " +
        teamSpecialties[i % teamSpecialties.length] +
        (i >= teamSpecialties.length
          ? ` ${String.fromCharCode(65 + (Math.floor(i / teamSpecialties.length) % 26))}`
          : ""),
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
    const personStart =
      i === 0 ? start : between("person:start", i, startMs, nowMs - 86400000);
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
      startDate: personStart,
      createdAt: personStart,
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
  const customerNames = [
    "Northstar Systems",
    "Cloudcrest Health",
    "Willow & Finch",
    "Summit Works",
    "Juniper Labs",
    "Harborline Logistics",
    "Copperfield Energy",
    "Brightpath Learning",
    "Redwood Commerce",
    "Aster Finance",
    "Lumen Foods",
    "Meridian Robotics",
    "Bluebird Mobility",
    "Evergreen Legal",
    "Stonebridge Media",
    "Orbit Bio",
  ];
  const renewalOffsets = [-120, -45, 14, 35, 75, 120, 210, 320];
  const healthScores = [28, 43, 54, 61, 69, 76, 82, 88, 93, 97];
  const annualValues = [
    12000, 18000, 26000, 39000, 55000, 78000, 110000, 165000, 240000, 360000,
  ];
  let contactIndex = 0;
  for (let i = 0; i < counts.customers; i++) {
    const customerName =
      customerNames[i % customerNames.length] +
      (i >= customerNames.length
        ? ` ${Math.floor(i / customerNames.length) + 2}`
        : "");
    const health = healthScores[(i * 7 + 2) % healthScores.length];
    add("customer", i, {
      name: customerName,
      industry: c.industry,
      status: health < 55 ? "at_risk" : i % 9 === 0 ? "onboarding" : "active",
      accountOwnerPersonId: person(i).id,
      annualValue:
        annualValues[(i * 3) % annualValues.length] *
        (1 + Math.floor(i / annualValues.length)),
      currency: "USD",
      startDate: between("customer:start", i, startMs, nowMs - 180 * 86400000),
      renewalDate: offset(renewalOffsets[i % renewalOffsets.length]),
      health,
    });
    const customerDomain = customerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    for (let j = 0; j < 1 + (i % 3); j++) {
      const contactFirst = first[(i * 3 + j) % first.length];
      const contactLast = last[(i * 5 + j * 2) % last.length];
      add("customerContact", contactIndex++, {
        customerId: uid("customer", i),
        name: `${contactFirst} ${contactLast}`,
        email: `${contactFirst.toLowerCase()}.${contactLast.toLowerCase()}@${customerDomain}.test`,
        title: ["Operations Director", "Technical Lead", "Finance Partner"][j],
      });
    }
  }
  const projectNames = [
    "Atlas Migration",
    "Beacon Launch",
    "Cedar Integration",
    "Drift Analytics",
    "Everest Rollout",
    "Foundry Modernization",
    "Gemini Portal",
    "Horizon Data Hub",
    "Ion Automation",
    "Keystone Expansion",
    "Lantern Mobile",
    "Mosaic Billing",
    "Nimbus Security",
    "Orchard Workspace",
    "Pulse Insights",
    "Quartz Platform",
  ];
  const projectStatuses = [
    "active",
    "active",
    "at_risk",
    "blocked",
    "completed",
    "on_hold",
  ];
  const projectPriorities = ["high", "medium", "critical", "low", "medium"];
  const projectTargetOffsets = [-90, -21, 10, 35, 75, 140, 240];
  for (let i = 0; i < counts.projects; i++) {
    const project = add("project", i, {
      name:
        projectNames[i % projectNames.length] +
        (i >= projectNames.length
          ? ` ${Math.floor(i / projectNames.length) + 2}`
          : ""),
      status: projectStatuses[i % projectStatuses.length],
      ownerPersonId: person(i).id,
      customerId: uid("customer", i % counts.customers),
      teamIds: [uid("team", i % teamCount)],
      startDate: between("project:start", i, startMs, nowMs - 120 * 86400000),
      targetDate: offset(projectTargetOffsets[i % projectTargetOffsets.length]),
      description: "Delivery, migration and adoption for a fictional customer.",
      priority: projectPriorities[i % projectPriorities.length],
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
      status: ["todo", "in_progress", "blocked", "completed"][i % 4],
      assigneePersonId: person(i).id,
      reporterPersonId: person(0).id,
      priority: ["low", "medium", "high", "urgent"][i % 4],
    });
  }
  add("folder", 0, {
    name: "Company knowledge",
    ownerPersonId: person(0).id,
    visibility: "company",
  });
  const conversationStarts: string[] = [];
  for (let i = 0; i < teamCount; i++) {
    const conversationStart = between(
      "conversation:start",
      i,
      startMs,
      nowMs - 86400000,
    );
    conversationStarts.push(conversationStart);
    const team = entities.find((entity) => entity.id === uid("team", i))!;
    add("channel", i, {
      name: String(team.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
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
      startedAt: conversationStart,
      createdAt: conversationStart,
    });
  }
  const projects = entities.filter((e) => e.type === "project");
  for (let i = 0; i < counts.documents; i++) {
    const projectRng = rng(`${c.seed}:document:project:${i}`);
    const p = projects[Math.floor(projectRng() ** 1.6 * projects.length)],
      author =
        i === 0 ? person(0) : person(Math.floor(projectRng() * c.employees));
    const createdAt = between(
      "document:created",
      i,
      Date.parse(author.startDate!),
      i === 0 ? Date.parse(middle) : nowMs,
    );
    const oldTitle =
      author.id === person(0).id && createdAt < middle
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
      createdAt,
      visibility: i % 10 === 0 ? "private" : "company",
    });
  }
  for (let i = 0; i < counts.messages; i++) {
    const messageRng = rng(`${c.seed}:message:links:${i}`);
    const p = projects[Math.floor(messageRng() ** 1.6 * projects.length)],
      sender = person(Math.floor(messageRng() * c.employees));
    const conversationIndex = Math.floor(
      Number(
        sender.currentTeamId === undefined
          ? 0
          : entities
              .filter((e) => e.type === "team")
              .findIndex((team) => team.id === sender.currentTeamId),
      ),
    );
    const timestamp = between(
      "message:timestamp",
      i,
      Math.max(
        Date.parse(sender.startDate!),
        Date.parse(conversationStarts[Math.max(0, conversationIndex)]),
      ),
      nowMs,
    );
    add("message", i, {
      conversationId: uid("conversation", Math.max(0, conversationIndex)),
      senderPersonId: sender.id,
      timestamp,
      createdAt: timestamp,
      body: `${p.name}: ${sender.displayName} shared a delivery update. Please review the customer migration checklist and open risks.`,
      projectId: p.id,
      customerId: p.customerId,
    });
  }
  if (c.features.tickets)
    for (let i = 0; i < counts.customers * 2; i++) {
      const ticketRng = rng(`${c.seed}:ticket:project:${i}`);
      const p = projects[Math.floor(ticketRng() ** 1.5 * projects.length)];
      add("ticket", i, {
        title: p.name + " support request " + (i + 1),
        description:
          "Fictional customer requests help validating the integration rollout.",
        status: [
          "open",
          "in_progress",
          "resolved",
          "closed",
          "waiting_on_customer",
        ][i % 5],
        priority: ["low", "medium", "high", "urgent"][i % 4],
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
    [
      ["Northstar CRM", "crm"],
      ["PeopleOS", "hris"],
      ["Trackline", "issue_tracker"],
      ["Relay Chat", "chat"],
      ["VaultDrive", "file_storage"],
    ].forEach(([name, category], i) =>
      add("tool", i, {
        name,
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
    let eventIndex = 0;
    entities
      .filter((e) => e.type === "person")
      .forEach((p) =>
        add("event", eventIndex++, {
          eventType: "employee_hired",
          occurredAt: p.startDate,
          subjectType: "person",
          subjectId: p.id,
          payload: {},
          createdAt: p.startDate,
        }),
      );
    add("event", eventIndex++, {
      eventType: "employee_promoted",
      occurredAt: middle,
      subjectType: "person",
      subjectId: person(0).id,
      payload: {
        fromRoleId: uid("role", c.employees),
        toRoleId: uid("role", 0),
      },
      createdAt: middle,
    });
    for (const p of projects)
      add("event", eventIndex++, {
        eventType: "project_started",
        occurredAt: p.startDate,
        subjectType: "project",
        subjectId: p.id,
        payload: { status: p.status },
        createdAt: p.startDate,
      });
    for (const customer of entities.filter((e) => e.type === "customer"))
      add("event", eventIndex++, {
        eventType: "customer_onboarded",
        occurredAt: customer.startDate,
        subjectType: "customer",
        subjectId: customer.id,
        payload: { health: customer.health },
        createdAt: customer.startDate,
      });
    for (const ticket of entities.filter((e) => e.type === "ticket"))
      add("event", eventIndex++, {
        eventType:
          ticket.status === "resolved" || ticket.status === "closed"
            ? "ticket_resolved"
            : "ticket_opened",
        occurredAt: ticket.updatedAt,
        subjectType: "ticket",
        subjectId: ticket.id,
        payload: { priority: ticket.priority },
        createdAt: ticket.updatedAt,
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
