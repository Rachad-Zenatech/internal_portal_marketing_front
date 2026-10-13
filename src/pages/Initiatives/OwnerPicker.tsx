import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOwnerOptions } from "@/hooks/useInitiatives";
import type { OwnerOption } from "@/types/initiatives";

interface OwnerPickerProps {
  value: OwnerOption | null;
  onChange: (owner: OwnerOption) => void;
  id?: string;
}

export default function OwnerPicker({ value, onChange, id }: OwnerPickerProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  // Wait until typing pauses before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const { data: options = [], isFetching } = useOwnerOptions(search, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{value ? value.full_name || value.email : "Select owner"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search by name or email..." className="pl-8" autoFocus />
        </div>
        <div className="max-h-60 overflow-y-auto" role="listbox">
          {options.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-500">{isFetching ? "Searching..." : "No matching users"}</p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={value?.id === option.id}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <Check className={`h-4 w-4 shrink-0 ${value?.id === option.id ? "opacity-100" : "opacity-0"}`} />
                <span className="min-w-0">
                  <span className="block truncate text-slate-900 dark:text-zinc-100">{option.full_name || option.email}</span>
                  {option.full_name && <span className="block truncate text-xs text-slate-500">{option.email}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
