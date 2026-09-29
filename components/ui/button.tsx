import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/format";

type Variant = "ghost" | "outline" | "solid" | "subtle";
type Size = "sm" | "md" | "icon" | "icon-sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pressed?: boolean;
}

const variants: Record<Variant, string> = {
  ghost: "text-fg-muted hover:text-fg hover:bg-white/[0.06]",
  outline: "border border-line bg-surface/80 text-fg-muted hover:text-fg hover:border-line-strong backdrop-blur",
  solid: "bg-fg text-bg hover:bg-white",
  subtle: "bg-white/[0.05] text-fg hover:bg-white/[0.09]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[13px] gap-1.5",
  md: "h-9 px-3 text-sm gap-2",
  icon: "h-9 w-9",
  "icon-sm": "h-8 w-8",
};

export const buttonClass = (variant: Variant = "outline", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    extra,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", pressed, className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={pressed}
      className={buttonClass(variant, size, cn(pressed && "!text-fg !border-brand/60 bg-brand/10", className))}
      {...props}
    />
  );
});
