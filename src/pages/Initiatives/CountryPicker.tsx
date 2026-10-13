import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { countryName, searchCountries } from "@/lib/countries";

interface CountryPickerProps {
  /** ISO 3166-1 alpha-2 code, or "" for none */
  value: string;
  onChange: (code: string) => void;
  id?: string;
}

export default function CountryPicker({ value, onChange, id }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const options = useMemo(() => searchCountries(search), [search]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className={`truncate ${value ? "" : "text-muted-foreground"}`}>{value ? countryName(value) : "Choose a country"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search countries..." className="pl-8" autoFocus />
        </div>
        <div className="max-h-60 overflow-y-auto" role="listbox">
          {value && (
            <button
              type="button"
              onClick={() => choose("")}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4 shrink-0" />
              Clear country
            </button>
          )}
          {options.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-500">No matching countries</p>
          ) : (
            options.map((country) => (
              <button
                key={country.code}
                type="button"
                role="option"
                aria-selected={value === country.code}
                onClick={() => choose(country.code)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <Check className={`h-4 w-4 shrink-0 ${value === country.code ? "opacity-100" : "opacity-0"}`} />
                <span className="truncate text-slate-900 dark:text-zinc-100">{country.name}</span>
                <span className="ml-auto text-xs text-slate-400">{country.code}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
