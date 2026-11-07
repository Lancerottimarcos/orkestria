"use client";

import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  OptionHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Children,
  isValidElement,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";

const fieldClasses =
  "w-full bg-surface-2 border border-border rounded-full px-5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-2 focus:border-accent disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldClasses, className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldClasses, "rounded-xl px-4 py-3 resize-none min-h-24", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

/**
 * <option> aceito pelo Select customizado - além dos atributos nativos,
 * aceita data-avatar-url/data-avatar-name pra desenhar uma foto (ou inicial)
 * à esquerda do rótulo, usado em selects de pessoas/clientes.
 */
type SelectOptionProps = OptionHTMLAttributes<HTMLOptionElement> & {
  "data-avatar-url"?: string | null;
  "data-avatar-name"?: string;
};

type SelectOptionMeta = {
  value: string;
  label: string;
  disabled: boolean;
  avatarName?: string;
  avatarUrl?: string | null;
};

function textFromNode(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  return "";
}

function extractOptions(children: ReactNode): SelectOptionMeta[] {
  const options: SelectOptionMeta[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const props = child.props as SelectOptionProps;
    options.push({
      value: String(props.value ?? ""),
      label: textFromNode(props.children),
      disabled: Boolean(props.disabled),
      avatarName: props["data-avatar-name"],
      avatarUrl: props["data-avatar-url"] ?? null,
    });
  });
  return options;
}

const PANEL_MAX_HEIGHT = 260;

/**
 * Select com aparência 100% customizada (fonte, cores e espaçamento do
 * design system) em vez do menu nativo do navegador/SO, que não dá pra
 * estilizar. Por baixo, mantém um <select> nativo de verdade - invisível,
 * mas presente no DOM - só pra continuar funcionando com react-hook-form
 * (register) e onChange no formato de evento nativo, sem exigir nenhuma
 * mudança nos formulários que já usam este componente.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, value, defaultValue, onChange, onBlur, disabled, id, ...rest }, forwardedRef) => {
    const options = useMemo(() => extractOptions(children), [children]);
    const uid = useId();
    const isControlled = value !== undefined;

    const hiddenRef = useRef<HTMLSelectElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const [uncontrolledValue, setUncontrolledValue] = useState(() => {
      if (defaultValue !== undefined) return String(defaultValue);
      return options[0]?.value ?? "";
    });
    const currentValue = String(isControlled ? value : uncontrolledValue);

    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const [placement, setPlacement] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);

    const selectedIndex = Math.max(0, options.findIndex((o) => o.value === currentValue));
    const selected = options[selectedIndex];

    function setHiddenRef(node: HTMLSelectElement | null) {
      hiddenRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }

    const updatePlacement = useCallback(() => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < PANEL_MAX_HEIGHT && rect.top > spaceBelow;
      setPlacement({
        top: openUp ? rect.top - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        openUp,
      });
    }, []);

    useLayoutEffect(() => {
      if (!open) return;
      updatePlacement();
      const handler = () => updatePlacement();
      window.addEventListener("scroll", handler, true);
      window.addEventListener("resize", handler);
      return () => {
        window.removeEventListener("scroll", handler, true);
        window.removeEventListener("resize", handler);
      };
    }, [open, updatePlacement]);

    useEffect(() => {
      if (!open) return;
      function handlePointerDown(e: MouseEvent) {
        const target = e.target as Node;
        if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
        setOpen(false);
      }
      document.addEventListener("mousedown", handlePointerDown);
      return () => document.removeEventListener("mousedown", handlePointerDown);
    }, [open]);

    function commit(nextValue: string) {
      if (!isControlled) setUncontrolledValue(nextValue);
      const el = hiddenRef.current;
      if (el) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set;
        setter?.call(el, nextValue);
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function openPanel() {
      if (disabled) return;
      setHighlighted(selectedIndex);
      setOpen(true);
    }

    function handleTriggerKeyDown(e: React.KeyboardEvent) {
      if (disabled) return;
      if (!open) {
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          openPanel();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const opt = options[highlighted];
        if (opt && !opt.disabled) {
          commit(opt.value);
          setOpen(false);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        setHighlighted(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setHighlighted(options.length - 1);
      }
    }

    return (
      <div className="relative">
        <select
          ref={setHiddenRef}
          id={id}
          value={isControlled ? currentValue : undefined}
          defaultValue={isControlled ? undefined : uncontrolledValue}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          {...rest}
        >
          {children}
        </select>

        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${uid}-listbox`}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openPanel())}
          onKeyDown={handleTriggerKeyDown}
          className={cn(fieldClasses, "appearance-none pr-10 cursor-pointer text-left flex items-center gap-2", className)}
        >
          {selected?.avatarName !== undefined && (
            <Avatar name={selected.avatarName || "?"} url={selected.avatarUrl} size={22} className="text-[10px] flex-shrink-0" />
          )}
          <span className="flex-1 min-w-0 truncate">{selected?.label ?? ""}</span>
        </button>

        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-2"
        />

        {open &&
          placement &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={panelRef}
              role="listbox"
              id={`${uid}-listbox`}
              className="fixed z-50 bg-surface rounded-2xl shadow-2xl shadow-black/20 border border-border p-1.5 overflow-y-auto animate-select-pop"
              style={{
                top: placement.openUp ? undefined : placement.top,
                bottom: placement.openUp ? window.innerHeight - placement.top : undefined,
                left: placement.left,
                width: Math.max(placement.width, 200),
                maxHeight: PANEL_MAX_HEIGHT,
              }}
            >
              {options.length === 0 && (
                <p className="text-xs text-muted-2 px-3.5 py-2">Nenhuma opção</p>
              )}
              {options.map((opt, i) => (
                <div
                  key={`${opt.value}-${i}`}
                  role="option"
                  id={`${uid}-opt-${i}`}
                  aria-selected={opt.value === currentValue}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => {
                    if (opt.disabled) return;
                    commit(opt.value);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2 rounded-full text-sm font-medium text-ink cursor-pointer transition-colors",
                    opt.disabled && "opacity-40 cursor-not-allowed",
                    !opt.disabled && i === highlighted && "bg-surface-2",
                    opt.value === currentValue && "text-accent",
                  )}
                >
                  {opt.avatarName !== undefined && (
                    <Avatar name={opt.avatarName || "?"} url={opt.avatarUrl} size={22} className="text-[10px] flex-shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 truncate">{opt.label}</span>
                  {opt.value === currentValue && <Check size={14} className="flex-shrink-0" />}
                </div>
              ))}
            </div>,
            document.body,
          )}
      </div>
    );
  },
);
Select.displayName = "Select";

export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-muted pl-1.5">
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-muted-2 pl-1.5">{hint}</span>}
      {error && <span className="text-xs text-danger pl-1.5">{error}</span>}
    </div>
  );
}
