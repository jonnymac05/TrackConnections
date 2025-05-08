import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Contact } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

interface ContactAutocompleteProps {
  onContactSelect: (contact: Contact) => void;
  className?: string;
}

export function ContactAutocomplete({
  onContactSelect,
  className,
}: ContactAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  // Only search when we have at least 2 characters to search with
  const shouldSearch = debouncedQuery.length >= 2;

  const {
    data: contacts = [],
    isLoading,
    error,
  } = useQuery<Contact[]>({
    queryKey: ["/api/search/contacts", debouncedQuery],
    queryFn: async () => {
      if (!shouldSearch) return [];
      const res = await fetch(`/api/search/contacts?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    enabled: shouldSearch,
  });

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {searchQuery || "Search existing contacts..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search contacts..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="h-9"
            />
            {isLoading && (
              <div className="py-6 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Searching contacts...</p>
              </div>
            )}
            {error && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Error searching contacts
              </div>
            )}
            {!isLoading && !error && (
              <>
                <CommandEmpty>
                  {shouldSearch ? "No contacts found." : "Type at least 2 characters to search"}
                </CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id}
                      onSelect={() => {
                        onContactSelect(contact);
                        setSearchQuery(contact.name || "");
                        setOpen(false);
                      }}
                      className="flex items-center"
                    >
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium">{contact.name}</p>
                        {contact.company && (
                          <p className="text-sm text-muted-foreground truncate">
                            {contact.company}
                            {contact.title && ` • ${contact.title}`}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}