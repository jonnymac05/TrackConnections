import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Edit, Trash2, Loader2 } from "lucide-react";
import { LogEntryWithRelations } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface LogEntryCardProps {
  logEntry: LogEntryWithRelations;
  onEdit: (logEntry: LogEntryWithRelations) => void;
}

export function LogEntryCard({ logEntry, onEdit }: LogEntryCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const toggleFavoriteMutation = useMutation({
    mutationFn: async (isFavorite: boolean) => {
      await apiRequest("PUT", `/api/log-entries/${logEntry.id}/favorite`, {
        is_favorite: isFavorite,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/log-entries"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update favorite status: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const deleteLogEntryMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      await apiRequest("DELETE", `/api/log-entries/${logEntry.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/log-entries"] });
      toast({
        title: "Success",
        description: "Log entry deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete log entry: ${error.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });
  
  const handleToggleFavorite = () => {
    toggleFavoriteMutation.mutate(!logEntry.is_favorite);
  };
  
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this log entry?")) {
      deleteLogEntryMutation.mutate();
    }
  };
  
  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header with name, title, and favorite button */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-medium text-foreground">
              {logEntry.name || "Unnamed Contact"}
            </h3>
            {logEntry.company && logEntry.title && (
              <p className="text-sm text-muted-foreground">
                {logEntry.title} at {logEntry.company}
              </p>
            )}
            {logEntry.company && !logEntry.title && (
              <p className="text-sm text-muted-foreground">{logEntry.company}</p>
            )}
            {!logEntry.company && logEntry.title && (
              <p className="text-sm text-muted-foreground">{logEntry.title}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleToggleFavorite}
            disabled={toggleFavoriteMutation.isPending}
            className={`text-${
              logEntry.is_favorite ? "amber-400" : "muted"
            } hover:text-amber-400 transition-colors focus:outline-none disabled:opacity-50`}
            aria-label={logEntry.is_favorite ? "Remove from favorites" : "Add to favorites"}
          >
            {toggleFavoriteMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Star className="h-5 w-5" fill={logEntry.is_favorite ? "currentColor" : "none"} />
            )}
          </button>
        </div>
        
        {/* Notes */}
        {logEntry.notes && (
          <p className="text-sm text-foreground mb-3">{logEntry.notes}</p>
        )}
        
        {/* Where We Met */}
        {logEntry.where_met && (
          <p className="text-sm text-muted-foreground mb-3">
            <span className="font-medium">Where we met:</span> {logEntry.where_met}
          </p>
        )}
        
        {/* Tags */}
        {logEntry.tags && logEntry.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap">
            {logEntry.tags.map((tag) => (
              <span key={tag.id} className="tag">
                {tag.name}
              </span>
            ))}
          </div>
        )}
        
        {/* Media */}
        {logEntry.media && logEntry.media.length > 0 && (
          <div className="mb-3">
            {logEntry.media[0].type === "image" ? (
              <img
                src={logEntry.media[0].url}
                alt="Connection media"
                className="rounded-md w-full h-auto"
              />
            ) : (
              <video
                src={logEntry.media[0].url}
                controls
                className="rounded-md w-full h-auto"
              />
            )}
            {logEntry.media.length > 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                +{logEntry.media.length - 1} more
              </p>
            )}
          </div>
        )}
        
        {/* Footer with date and actions */}
        <div className="flex text-sm text-muted-foreground justify-between border-t border-border pt-3">
          <span>{formatDate(logEntry.created_at)}</span>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(logEntry)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
