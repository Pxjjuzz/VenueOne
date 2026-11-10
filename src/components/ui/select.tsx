"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

type SelectProps = {
  id?: string;
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  className?: string;
  /** Smaller control and panel, for inline use. */
  compact?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

export function Select({
  id,
  name,
  options,
  defaultValue = "",
  value,
  onValueChange,
  placeholder = "Select an option",
  disabled = false,
  invalid = false,
  required = false,
  className,
  compact = false,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: SelectProps) {
  const reactId = useId();
  const listboxId = `${reactId}-listbox`;
  const buttonId = id ?? `${reactId}-button`;

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = isControlled ? value : internal;

  const selectedIndex = useMemo(
    () => options.findIndex((option) => option.value === current),
    [options, current],
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    selectedIndex >= 0 ? selectedIndex : 0,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const typeahead = useRef({ query: "", at: 0 });

  const firstEnabled = options.findIndex((option) => !option.disabled);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function openPanel() {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled >= 0 ? firstEnabled : 0);
    setOpen(true);
  }

  function commit(option: SelectOption) {
    if (option.disabled) return;
    if (!isControlled) setInternal(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function move(direction: 1 | -1) {
    if (options.length === 0) return;
    let next = activeIndex;
    for (let step = 0; step < options.length; step += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next]?.disabled) {
        setActiveIndex(next);
        return;
      }
    }
  }

  function jumpTo(index: number) {
    if (index < 0 || index >= options.length || options[index]?.disabled) return;
    setActiveIndex(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        event.preventDefault();
        openPanel();
        if (event.key === "ArrowUp" || event.key === "End") {
          setActiveIndex(options.length - 1);
        } else if (event.key === "Home") {
          setActiveIndex(firstEnabled >= 0 ? firstEnabled : 0);
        }
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        return;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        return;
      case "Home":
        event.preventDefault();
        jumpTo(firstEnabled);
        return;
      case "End":
        event.preventDefault();
        jumpTo(options.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (options[activeIndex]) commit(options[activeIndex]);
        return;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        break;
    }

    if (event.key.length === 1 && /\S/.test(event.key)) {
      const now = Date.now();
      const query =
        now - typeahead.current.at > 700
          ? event.key.toLowerCase()
          : `${typeahead.current.query}${event.key.toLowerCase()}`;
      typeahead.current = { query, at: now };
      const match = options.findIndex(
        (option) => !option.disabled && option.label.toLowerCase().startsWith(query),
      );
      if (match >= 0) setActiveIndex(match);
    }
  }

  const activeOption = options[activeIndex];
  const activeId = open && activeOption ? `${listboxId}-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={current} disabled={current === ""} />
      ) : null}

      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border bg-surface text-left text-sm text-foreground transition-[border-color,box-shadow,background-color] duration-150",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/18",
          "disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-muted",
          compact ? "h-9 px-2.5 text-[0.8125rem]" : "h-11 px-3.5",
          invalid ? "border-error" : open ? "border-primary" : "border-border-strong",
          "hover:border-primary/45",
        )}
      >
        <span className={cn("truncate", !selected && "text-muted/80")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={buttonId}
          tabIndex={-1}
          className={cn(
            "absolute left-0 z-50 mt-1.5 max-h-72 w-full min-w-[11rem] overflow-y-auto overscroll-contain rounded-[var(--radius-md)] border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]",
            "animate-dropdown-in origin-top",
          )}
        >
          {options.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted">No options available</p>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === current;
              const isActive = index === activeIndex;
              return (
                <div
                  key={`${option.value}-${index}`}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  id={`${listboxId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseEnter={() => {
                    if (!option.disabled) setActiveIndex(index);
                  }}
                  onClick={() => commit(option)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-xs)] px-2.5 py-2 text-sm transition-colors",
                    option.disabled && "cursor-not-allowed opacity-45",
                    isActive && !option.disabled && "bg-surface-secondary",
                    isSelected ? "font-semibold text-primary" : "text-foreground-soft",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="mt-0.5 block text-[0.68rem] font-normal text-muted">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-primary transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
