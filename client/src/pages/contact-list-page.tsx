import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactPerson } from "@shared/schema";
import { ContactCard } from "@/components/contact-card";
import { MobileNav } from "@/components/mobile-nav";
import { FormDialog } from "@/components/form-dialog";
import { LogForm } from "@/components/forms/log-form";
import { useAuth } from "@/hooks/use-auth";

export default function ContactListPage() {
  const { user } = useAuth();
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  
  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery<ContactPerson[]>({
    queryKey: ["/api/contacts"],
  });
  
  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    return (
      (contact.name?.toLowerCase().includes(query)) ||
      (contact.company?.toLowerCase().includes(query)) ||
      (contact.title?.toLowerCase().includes(query)) ||
      (contact.email?.toLowerCase().includes(query)) ||
      (contact.phone?.toLowerCase().includes(query))
    );
  });
  
  return (
    <>
      <Helmet>
        <title>Contacts | Track Connections</title>
      </Helmet>
      
      <div className="mobile-container">
        {/* Header */}
        <header className="sticky top-0 bg-background border-b border-border z-10">
          <div className="p-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchVisible(!searchVisible)}
                className="text-muted-foreground hover:text-primary"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Search Bar */}
          {searchVisible && (
            <div className="px-4 pb-3">
              <div className="relative">
                <Input
                  type="search"
                  className="pl-10"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-2.5 text-muted-foreground">
                  <Search className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}
        </header>
        
        {/* Main Content */}
        <main className="px-4 pt-4 space-y-3 pb-20">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
              ))}
            </div>
          ) : filteredContacts.length > 0 ? (
            // Contact list
            <div className="space-y-3">
              {filteredContacts.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            // Empty state
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No contacts found matching your search"
                  : "No contacts yet. Add some connections to see them here."}
              </p>
            </div>
          )}
        </main>
        
        {/* Form Dialog */}
        <FormDialog
          title="Log New Connection"
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
        >
          <LogForm
            onSuccess={() => setFormDialogOpen(false)}
            user_id={user?.id || ""}
          />
        </FormDialog>
        
        {/* Mobile Navigation */}
        <MobileNav onAddClick={() => setFormDialogOpen(true)} />
      </div>
    </>
  );
}
