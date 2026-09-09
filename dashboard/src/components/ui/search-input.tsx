"use client";

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Input } from "./input";

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-[13px] -translate-y-1/2 text-faint-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full pl-7 text-[12.5px]"
      />
    </div>
  );
}
