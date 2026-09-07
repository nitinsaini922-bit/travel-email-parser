import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function Panel({
  index,
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  index?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("border border-rule bg-paper-raised shadow-card", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-rule px-3.5 py-2">
        <div className="flex items-baseline gap-2">
          {index ? <span className="font-mono text-[10px] text-vermilion">{index}</span> : null}
          <h3 className="label-mono text-ink-soft">{title}</h3>
        </div>
        {action}
      </header>
      <div className={cn("px-3.5 py-2.5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field — label, dotted leader, value                                        */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "accent" | "muted";
}) {
  const empty =
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);

  return (
    <div className="flex items-baseline gap-1.5 py-[3px]">
      <span className="label-mono shrink-0">{label}</span>
      <span className="leader h-[0.9em] min-w-[10px] flex-1" aria-hidden="true" />
      <span
        className={cn(
          "shrink-0 max-w-[62%] text-right font-mono text-[12.5px] leading-tight",
          empty && "text-ink-ghost",
          !empty && tone === "default" && "text-ink",
          !empty && tone === "accent" && "text-vermilion",
          !empty && tone === "muted" && "text-ink-soft",
        )}
      >
        {empty ? "—" : value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chip                                                                       */
/* -------------------------------------------------------------------------- */

const CHIP_TONES = {
  ink: "border-rule-strong bg-paper text-ink",
  vermilion: "border-vermilion/45 bg-vermilion-wash text-vermilion",
  sea: "border-sea/40 bg-sea-wash text-sea",
  brass: "border-brass/40 bg-brass-wash text-brass",
} as const;

export function Chip({
  children,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof CHIP_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-[3px] font-mono text-[10px] uppercase leading-none tracking-[0.1em]",
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Chip row with a heading                                                    */
/* -------------------------------------------------------------------------- */

export function ChipRow({
  label,
  items,
  tone = "ink",
}: {
  label: string;
  items: string[];
  tone?: keyof typeof CHIP_TONES;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5 py-1.5">
      <span className="label-mono w-full sm:w-auto sm:min-w-[104px]">{label}</span>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {items.map((item) => (
          <Chip key={item} tone={tone}>
            {item}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Rubber stamp                                                               */
/* -------------------------------------------------------------------------- */

export function Stamp({
  children,
  tone = "vermilion",
  className,
}: {
  children: ReactNode;
  tone?: "vermilion" | "sea" | "ink";
  className?: string;
}) {
  const tones = {
    vermilion: "border-vermilion text-vermilion",
    sea: "border-sea text-sea",
    ink: "border-ink text-ink",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex animate-stamp-in items-center justify-center border-[2.5px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] opacity-90",
        tones[tone],
        className,
      )}
      style={{ transform: "rotate(-7deg)" }}
    >
      {children}
    </span>
  );
}
