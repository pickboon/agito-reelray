import * as React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({
  className,
  checked,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "h-4 w-4 rounded border border-border bg-background",
        "text-brand-gold focus:ring-2 focus:ring-brand-gold/20 focus:ring-offset-0",
        "cursor-pointer transition-colors",
        className
      )}
      {...props}
    />
  );
}

export { Checkbox };
export type { CheckboxProps };
