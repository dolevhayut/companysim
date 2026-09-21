import { filterModelCatalog } from "./model-catalog.js";
import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Cpu,
  RefreshCw,
  Search,
  X,
  SlidersHorizontal,
} from "lucide-react";

// Adapted from serafimcloud / Model Picker, retrieved via the 21st CLI.
// Curated text-model shortcuts, not a claim of account-specific availability.
const models: Record<string, { id: string; name: string; version: string }[]> =
  {
    openai: [
      { id: "gpt-5.4-mini", name: "GPT", version: "5.4 mini" },
      { id: "gpt-5.4-nano", name: "GPT", version: "5.4 nano" },
    ],
    anthropic: [
      { id: "claude-sonnet-5", name: "Claude Sonnet", version: "5" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku", version: "4.5" },
    ],
  };
export function ModelPicker({
  provider,
  value,
  onChange,
  onRefresh,
}: {
  onRefresh: () => Promise<{ id: string; name: string }[]>;
  provider: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [liveModels, setLiveModels] = useState<
    { id: string; name: string; version?: string }[] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const options = liveModels ?? models[provider] ?? [];
  const visibleOptions = options.filter((option) =>
    `${option.name} ${option.version ?? ""} ${option.id}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const selected = options.find((option) => option.id === value);
  const close = () => {
    setOpen(false);
    setQuery("");
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="model-picker"
      ref={wrap}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="model-field-header">
        <span className="model-field-label" id={id + "-label"}>
          AI model
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            setError("");
            try {
              setLiveModels(filterModelCatalog(provider, await onRefresh()));
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not refresh models.",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {loading ? "Refreshing…" : "Refresh models"}
        </button>
      </div>
      <button
        ref={trigger}
        type="button"
        className="model-trigger"
        aria-labelledby={id + "-label " + id + "-value"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setQuery("");
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setQuery("");
            setOpen(true);
          }
        }}
      >
        <span className="model-chip">
          <Cpu size={18} aria-hidden="true" />
        </span>
        <span id={id + "-value"}>
          {selected ? (
            <>
              {selected.name}{" "}
              <span className="model-version">{selected.version}</span>
            </>
          ) : (
            value || "Choose a model"
          )}
          <small>
            {provider === "openai" ? "OpenAI" : "Anthropic"} · Text generation
          </small>
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={id}
          ref={menu}
          className="model-menu"
          role="dialog"
          aria-label="Choose AI model"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              close();
            }
            const buttons = Array.from(
              menu.current?.querySelectorAll<HTMLButtonElement>(
                '[role="menuitemradio"]',
              ) ?? [],
            );
            const current = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const inSearch = event.target === search.current;
            if (inSearch && (event.key === "Home" || event.key === "End"))
              return;
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const next = inSearch
                ? event.key === "ArrowUp"
                  ? buttons.length - 1
                  : 0
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? buttons.length - 1
                    : (current +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        buttons.length) %
                      buttons.length;
              buttons[next]?.focus();
            }
          }}
        >
          <div className="model-search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={search}
              type="search"
              aria-label="Search models"
              placeholder="Search by name or model ID…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear model search"
                onClick={() => {
                  setQuery("");
                  search.current?.focus();
                }}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          <div role="menu" aria-label="Model results">
            <div className="model-menu-heading">
              {provider === "openai" ? "OpenAI" : "Anthropic"} models
            </div>
            {visibleOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                role="menuitemradio"
                aria-checked={value === option.id}
                onClick={() => {
                  onChange(option.id);
                  setCustom(false);
                  close();
                }}
              >
                <span>
                  {option.name}{" "}
                  <span className="model-version">{option.version}</span>
                  <small>{option.id}</small>
                </span>
                {value === option.id && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
            {!visibleOptions.length && (
              <p className="model-no-results">
                No models match “{query}”. Try another name or enter a custom
                model.
              </p>
            )}
            <button
              type="button"
              role="menuitemradio"
              aria-checked={custom || (!!value && !selected)}
              onClick={() => {
                setCustom(true);
                onChange("");
                close();
              }}
            >
              <span>
                <SlidersHorizontal size={15} aria-hidden="true" /> Custom model
                <small>Enter another model ID</small>
              </span>
            </button>
          </div>
          <span className="model-search-count" aria-live="polite">
            {visibleOptions.length} matching models
          </span>
        </div>
      )}
      {(custom || (!!value && !selected)) && (
        <label>
          Model ID
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Enter a model available in your account"
            autoComplete="off"
          />
        </label>
      )}
      {liveModels !== null && value && !selected && (
        <p className="model-hint">
          Your selected model is outside the curated list. Choose a listed model
          or verify your custom ID before generating.
        </p>
      )}
      {error && (
        <p className="model-hint" role="alert">
          {error}
        </p>
      )}
      <p className="model-hint" role="status">
        {liveModels === null
          ? "Curated shortcuts. Refresh to load models from your API account."
          : `${liveModels.length} curated text models available in your account. Older, specialized and duplicate versions are hidden. Catalog reviewed September 21, 2026.`}
        {liveModels?.length === 0 &&
          " No supported matches; use a custom ID if you know it supports text generation."}
      </p>
    </div>
  );
}
