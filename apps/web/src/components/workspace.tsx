import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Blocks,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  Database,
  FileText,
  FlaskConical,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  MessagesSquare,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

// Adapted from arunjdass / Dashboard Sidebar, retrieved via the 21st CLI.
// Uses the real CompanySim navigation and native buttons; no demo workspaces or billing.
export const pageIcons: Record<string, LucideIcon> = {
  Overview: LayoutDashboard,
  People: Users,
  Teams: UsersRound,
  Departments: Network,
  Customers: Building2,
  Projects: FolderKanban,
  Documents: FileText,
  Messages: MessagesSquare,
  Tickets: LifeBuoy,
  Policies: ShieldCheck,
  Tools: Blocks,
  Events: Activity,
  Search,
  Developer: Code2,
  Scenarios: FlaskConical,
  Snapshots: Database,
  Settings: Settings2,
};
export function Sidebar({
  page,
  onSelect,
  company,
  ready,
}: {
  page: string;
  onSelect: (page: string) => void;
  company: string | null;
  ready: boolean;
}) {
  const groups = [
    { heading: "Workspace", items: ["Overview", "Search"] },
    {
      heading: "Organization",
      items: ["People", "Teams", "Departments", "Customers", "Projects"],
    },
    {
      heading: "Knowledge",
      items: [
        "Documents",
        "Messages",
        "Tickets",
        "Policies",
        "Tools",
        "Events",
      ],
    },
    {
      heading: "Manage",
      items: ["Developer", "Scenarios", "Snapshots", "Settings"],
    },
  ];
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onSelect("Overview");
        }}
        aria-label="CompanySim home"
      >
        <span className="mark">
          <Blocks size={19} strokeWidth={1.8} />
        </span>
        <span>
          companysim<span className="brand-dot">.</span>
        </span>
        <small>α</small>
      </a>
      <div className="workspace-identity">
        <span className="workspace-avatar">
          {company?.charAt(0).toUpperCase() ?? <Sparkles size={17} />}
        </span>
        <div>
          <strong>{company ?? "Your new workspace"}</strong>
          <span>
            {company ? "Synthetic company" : "Let’s build something real"}
          </span>
        </div>
      </div>
      <nav aria-label="Main navigation">
        {groups.map((group) => (
          <div className="nav-group" key={group.heading}>
            <span className="nav-heading">{group.heading}</span>
            {group.items.map((item) => {
              const Icon = pageIcons[item];
              return (
                <button
                  key={item}
                  className={page === item ? "selected" : ""}
                  aria-current={page === item ? "page" : undefined}
                  disabled={
                    !company && item !== "Overview" && item !== "Settings"
                  }
                  onClick={() => onSelect(item)}
                >
                  <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                  <span>{item}</span>
                  {page === item && <span className="nav-active-dot" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <footer>
        <span className="status-dot" />
        <div>
          <strong>
            {ready ? "Local runtime connected" : "Connecting to runtime"}
          </strong>
          <span>Your machine. Your data.</span>
        </div>
        <LockKeyhole size={14} />
      </footer>
    </aside>
  );
}
export function Topbar({
  page,
  company,
  onSearch,
}: {
  page: string;
  company: string | null;
  onSearch: () => void;
}) {
  return (
    <div className="topbar">
      <div className="breadcrumb">
        <Blocks size={15} />
        <span>Workspace</span>
        <ChevronRight size={13} />
        <strong>{company ? page : "Getting started"}</strong>
      </div>
      <div className="topbar-actions">
        {company && (
          <button
            className="icon-button"
            aria-label="Open company search"
            onClick={onSearch}
          >
            <Search size={17} />
          </button>
        )}
        <span className="environment-pill">
          <span className="status-dot" />
          Local environment
        </span>
        <a
          className="icon-button"
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="API documentation"
        >
          <CircleHelp size={18} />
        </a>
      </div>
    </div>
  );
}

// Step count and progress model adapted from shadcnspace / Onboarding Stepper Progress.
export function SetupSteps({ step }: { step: number }) {
  const labels = ["Company", "Structure", "Data", "AI", "Review"];
  return (
    <div className="setup-progress">
      <div className="setup-progress-meta">
        <span>BUILD YOUR WORKSPACE</span>
        <span>
          Step {step + 1} of {labels.length}
        </span>
      </div>
      <ol className="steps" aria-label="Setup progress">
        {labels.map((label, i) => (
          <li
            key={label}
            className={i === step ? "active" : i < step ? "complete" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <span className="step-number">
              {i < step ? <Check size={13} /> : String(i + 1).padStart(2, "0")}
            </span>
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <div className="step-track">
        <span style={{ width: `${(step / (labels.length - 1)) * 100}%` }} />
      </div>
    </div>
  );
}
export function CompanyBlueprint({
  name,
  employees,
  customers,
  projects,
}: {
  name: string;
  employees: number;
  customers: number;
  projects: number;
}) {
  return (
    <div className="blueprint">
      <div className="blueprint-heading">
        <span className="eyebrow">THE BIG PICTURE</span>
        <span className="preview-label">Live preview</span>
      </div>
      <h3>
        A whole company.
        <br />
        Connected from day one.
      </h3>
      <p>
        People, projects and knowledge.
        <br />
        One coherent world to build with.
      </p>
      <div className="org-visual" aria-hidden="true">
        <div className="org-company">
          <span className="org-icon">
            <Building2 size={21} />
          </span>
          <strong>{name || "Your company"}</strong>
          <span>Company workspace</span>
        </div>
        <div className="org-stem" />
        <div className="org-branches" />
        <div className="org-nodes">
          <div>
            <Users size={18} />
            <b>{employees}</b>
            <span>People</span>
          </div>
          <div>
            <FolderKanban size={18} />
            <b>{projects}</b>
            <span>Projects</span>
          </div>
          <div>
            <Globe2 size={18} />
            <b>{customers}</b>
            <span>Customers</span>
          </div>
        </div>
        <div className="org-knowledge">
          <FileText size={14} />
          <span>Shared knowledge & conversations</span>
          <MessagesSquare size={14} />
        </div>
      </div>
      <div className="blueprint-footer">
        <ShieldCheck size={17} />
        <div>
          <strong>Local by design</strong>
          <span>No account. No cloud. AI is optional.</span>
        </div>
      </div>
    </div>
  );
}
export function PlanReview({
  preview,
}: {
  preview: Record<string, unknown> | null;
}) {
  const counts = preview?.counts as Record<string, number> | undefined;
  return (
    <div className="plan-review">
      {Object.entries(counts ?? {}).map(([name, count]) => (
        <div key={name}>
          <span>{name}</span>
          <strong>{count.toLocaleString()}</strong>
          <Check size={15} />
        </div>
      ))}
    </div>
  );
}
export function EntityAvatar({
  name,
  index = 0,
}: {
  name: string;
  index?: number;
}) {
  return (
    <span className={"entity-avatar avatar-" + (index % 5)} aria-hidden="true">
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}
// Icon, title and description composition adapted from serafimcloud / Empty State.
export function EmptyState({
  children,
  title = "No matches yet",
  icon: Icon = Search,
}: {
  children: ReactNode;
  title?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty-state">
      <Icon size={25} aria-hidden="true" />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function DetailPanel({
  detail,
  onClose,
}: {
  detail: Record<string, unknown>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    panel?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel) {
        const items = Array.from(
          panel.querySelectorAll<HTMLElement>(
            'button, a, summary, [tabindex="0"]',
          ),
        );
        if (!items.length) return;
        const first = items[0],
          last = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === panel)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [onClose]);
  const title = String(
    detail.displayName ??
      detail.name ??
      detail.title ??
      detail.subject ??
      detail.id,
  );
  const fields = Object.entries(detail).filter(
    ([key, value]) =>
      ![
        "id",
        "type",
        "body",
        "description",
        "relationships",
        "metadata",
      ].includes(key) &&
      !key.endsWith("Id") &&
      (typeof value === "string" || typeof value === "number"),
  );
  return (
    <div className="detail-overlay">
      <button
        className="detail-backdrop"
        tabIndex={-1}
        aria-label="Dismiss detail panel"
        onClick={onClose}
      />
      <div
        className="drawer"
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Entity detail"
      >
        <div className="drawer-toolbar">
          <span className="eyebrow">{String(detail.type)} DETAILS</span>
          <button
            className="icon-button"
            aria-label="Close detail"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <EntityAvatar name={title} />
        <h2>{title}</h2>
        <code className="entity-id">{String(detail.id)}</code>
        <dl className="detail-fields">
          {fields.map(([key, value]) => (
            <div key={key}>
              <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
              <dd>{String(value)}</dd>
            </div>
          ))}
        </dl>
        {!!(detail.body ?? detail.description) && (
          <article className="prose">
            <h3>Content</h3>
            <p>{String(detail.body ?? detail.description)}</p>
          </article>
        )}
        <details>
          <summary>
            Inspect entity JSON <ArrowRight size={14} />
          </summary>
          <pre>{JSON.stringify(detail, null, 2)}</pre>
        </details>
      </div>
    </div>
  );
}

export type Confirmation = {
  title: string;
  description: string;
  action: string;
  run: () => Promise<void>;
};
// Centered icon and split footer adapted from cnippet-dev / Logout Confirmation Dialog.
// Native modal semantics supply focus containment and background inertness.
export function ConfirmDialog({
  request,
  onClose,
}: {
  request: Confirmation;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    cancel.current?.focus();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <div className="confirm-body">
        <span className="confirm-icon">
          <ShieldCheck size={24} aria-hidden="true" />
        </span>
        <h2 id="confirm-title">{request.title}</h2>
        <p id="confirm-description">{request.description}</p>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="confirm-actions">
        <button ref={cancel} disabled={pending} onClick={onClose}>
          Cancel
        </button>
        <button
          className="danger-action"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            setError("");
            try {
              await request.run();
              onClose();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Request failed");
            } finally {
              setPending(false);
            }
          }}
        >
          {pending ? "Working…" : request.action}
        </button>
      </div>
    </dialog>
  );
}

// Compact credential status rows informed by laziekiki / API Key Manager.
// CompanySim only reports configuration; no secret is returned or revealed.
export function ProviderStatus({
  providers,
}: {
  providers: Record<string, unknown>[];
}) {
  return (
    <div className="provider-status" aria-label="Provider credentials">
      {providers.map((provider) => (
        <div className="provider-status-row" key={String(provider.provider)}>
          <span className="provider-icon">
            <LockKeyhole size={18} aria-hidden="true" />
          </span>
          <div>
            <strong>{String(provider.provider)}</strong>
            <small>
              {provider.configured
                ? "Credential available to this runtime"
                : "Add a session key to enable enrichment"}
            </small>
          </div>
          <span
            className={
              provider.configured
                ? "credential-badge configured"
                : "credential-badge"
            }
          >
            {provider.configured ? "Configured" : "Not configured"}
          </span>
        </div>
      ))}
    </div>
  );
}
