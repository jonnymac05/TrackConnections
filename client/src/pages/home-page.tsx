import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Search, Filter, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogEntryWithRelations, Tag } from "@shared/schema";
import { LogEntryCard } from "@/components/log-entry-card";
import { MobileNav } from "@/components/mobile-nav";
import { UserMenu } from "@/components/user-menu";
import { FormDialog } from "@/components/form-dialog";
import { LogForm } from "@/components/forms/log-form";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "favorites" | string>("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingLogEntry, setEditingLogEntry] = useState<LogEntryWithRelations | undefined>(undefined);
  
  // Fetch log entries
  const { data: logEntries = [], isLoading: isLoadingLogs } = useQuery<LogEntryWithRelations[]>({
    queryKey: ["/api/log-entries"],
  });
  
  // Fetch tags for filtering
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });
  
  // Search query mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/search-results"], data);
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Search results
  const { data: searchResults = [] } = useQuery<LogEntryWithRelations[]>({
    queryKey: ["/api/search-results"],
    enabled: !!searchQuery,
  });
  
  // Handle search input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery);
    }
  };
  
  // Filter logs based on active filter
  const filteredLogs = () => {
    let filtered = searchQuery ? searchResults : logEntries;
    
    if (activeFilter === "favorites") {
      return filtered.filter(entry => entry.is_favorite);
    } else if (activeFilter !== "all") {
      // Filter by tag ID
      return filtered.filter(entry => 
        entry.tags?.some(tag => tag.id === activeFilter)
      );
    }
    
    return filtered;
  };
  
  // Handle opening the form dialog for new log entry
  const handleNewLogEntry = () => {
    setEditingLogEntry(undefined);
    setFormDialogOpen(true);
  };
  
  // Handle opening the form dialog for editing log entry
  const handleEditLogEntry = (logEntry: LogEntryWithRelations) => {
    setEditingLogEntry(logEntry);
    setFormDialogOpen(true);
  };
  
  // Close the form dialog
  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setEditingLogEntry(undefined);
  };
  
  return (
    <>
      <Helmet>
        <title>Track Connections</title>
      </Helmet>
      
      <div className="mobile-container">
        {/* Header */}
        <header className="sticky top-0 bg-background border-b border-border z-10">
          <div className="p-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-foreground">Connections</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchVisible(!searchVisible)}
                className="text-muted-foreground hover:text-primary"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterVisible(!filterVisible)}
                className="text-muted-foreground hover:text-primary"
              >
                <Filter className="h-5 w-5" />
              </Button>
              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
          
          {/* Search Bar */}
          {searchVisible && (
            <div className="px-4 pb-3">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <Input
                    type="search"
                    className="pl-10"
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute left-3 top-2.5 text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </div>
                </div>
              </form>
            </div>
          )}
          
          {/* Filter Options */}
          {filterVisible && (
            <div className="p-4 pt-0 border-b border-border">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant={activeFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  className="py-1 px-3 text-sm whitespace-nowrap"
                  onClick={() => setActiveFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={activeFilter === "favorites" ? "default" : "ghost"}
                  size="sm"
                  className="py-1 px-3 text-sm whitespace-nowrap"
                  onClick={() => setActiveFilter("favorites")}
                >
                  <Star className="h-4 w-4 mr-1 text-amber-400" />
                  Favorites
                </Button>
                
                {tags.map((tag) => (
                  <Button
                    key={tag.id}
                    variant={activeFilter === tag.id ? "default" : "ghost"}
                    size="sm"
                    className="py-1 px-3 text-sm whitespace-nowrap"
                    onClick={() => setActiveFilter(tag.id)}
                  >
                    {tag.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </header>
        
        {/* Main Content */}
        <main className="px-4 pt-4 space-y-4 pb-20">
          {/* New Connection Banner */}
          <div 
            className="card flex items-center justify-between p-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg shadow-md cursor-pointer"
            onClick={handleNewLogEntry}
          >
            <div>
              <h3 className="font-medium text-white">Add New Connection</h3>
              <p className="text-sm text-blue-100">Log someone you've met</p>
            </div>
            <div className="bg-white bg-opacity-20 p-2 rounded-full">
              <Plus className="h-5 w-5" />
            </div>
          </div>
          
          {/* Log Entries */}
          {isLoadingLogs ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg overflow-hidden">
                  <div className="h-32 bg-muted animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : filteredLogs().length > 0 ? (
            <div className="space-y-4">
              {filteredLogs().map((logEntry) => (
                <LogEntryCard
                  key={logEntry.id}
                  logEntry={logEntry}
                  onEdit={handleEditLogEntry}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No connections found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleNewLogEntry}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add your first connection
              </Button>
            </div>
          )}
        </main>
        
        {/* Form Dialog */}
        <FormDialog
          title={editingLogEntry ? "Edit Connection" : "Log New Connection"}
          open={formDialogOpen}
          onOpenChange={setFormDialogOpen}
        >
          <LogForm
            logEntry={editingLogEntry}
            onSuccess={handleCloseFormDialog}
            user_id={user?.id || ""}
          />
        </FormDialog>
        
        {/* Mobile Navigation */}
        <MobileNav onAddClick={handleNewLogEntry} />
      </div>
    </>
  );
}
