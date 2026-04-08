import * as React from "react";

import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string;
  options?: Array<{
    label: string;
    value: string;
  }>;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options = [], placeholder, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-input bg-white/80 px-4 py-2 text-sm text-foreground shadow-sm outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
