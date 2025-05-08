import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Edit, Trash2, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { LogEntryWithRelations, Media } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogOverlay } from "@/components/ui/dialog";

// Helper function to check if a file is an image based on mime type
const isImageFile = (fileType: string): boolean => {
  return fileType.startsWith('image/');
};

interface LogEntryCardProps {
  logEntry: LogEntryWithRelations;
  onEdit: (logEntry: LogEntryWithRelations) => void;
}

export function LogEntryCard({ logEntry, onEdit }: LogEntryCardProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  
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
            <div 
              className="relative rounded-md overflow-hidden cursor-pointer" 
              onClick={() => {
                setCurrentMediaIndex(0);
                setMediaGalleryOpen(true);
              }}
            >
              {isImageFile(logEntry.media[0].file_type) ? (
                <img
                  src={logEntry.media[0].url}
                  alt="Connection media"
                  className="rounded-md w-full h-auto max-h-52 object-cover"
                />
              ) : (
                <video
                  src={logEntry.media[0].url}
                  controls
                  className="rounded-md w-full h-auto max-h-52 object-cover"
                />
              )}
              {logEntry.media.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                  +{logEntry.media.length - 1} more
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Media Gallery Dialog */}
        {logEntry.media && logEntry.media.length > 0 && (
          <Dialog open={mediaGalleryOpen} onOpenChange={setMediaGalleryOpen}>
            <DialogContent className="max-w-3xl w-[90vw] p-0 bg-background border border-border">
              <div className="relative h-[70vh] flex items-center justify-center bg-black">
                {/* Close Button */}
                <button 
                  className="absolute top-2 right-2 z-10 bg-black/50 p-1 rounded-full text-white hover:bg-black/80"
                  onClick={() => setMediaGalleryOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
                
                {/* Current Media */}
                {logEntry.media && isImageFile(logEntry.media[currentMediaIndex].file_type) ? (
                  <img
                    src={logEntry.media[currentMediaIndex].url}
                    alt={`Media ${currentMediaIndex + 1}`}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <video
                    src={logEntry.media ? logEntry.media[currentMediaIndex].url : ''}
                    controls
                    className="max-h-full max-w-full"
                  />
                )}
                
                {/* Navigation Buttons - Only show if there are multiple media items */}
                {logEntry.media && logEntry.media.length > 1 && (
                  <>
                    <button 
                      className="absolute left-2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setCurrentMediaIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentMediaIndex === 0}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button 
                      className="absolute right-2 bg-black/50 p-2 rounded-full text-white hover:bg-black/80 disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={() => setCurrentMediaIndex(prev => Math.min(logEntry.media ? logEntry.media.length - 1 : 0, prev + 1))}
                      disabled={logEntry.media && currentMediaIndex === logEntry.media.length - 1}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Thumbnails/Counter */}
              <div className="p-3 bg-card text-center">
                <p className="text-sm text-card-foreground">
                  {currentMediaIndex + 1} of {logEntry.media ? logEntry.media.length : 0}
                </p>
              </div>
            </DialogContent>
          </Dialog>
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
