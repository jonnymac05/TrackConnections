import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { MediaUpload } from "@/components/media-upload";
import { LogEntryWithRelations, Tag, insertLogEntrySchema } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Extend the log entry schema for frontend validation
const logFormSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  where_met: z.string().optional(),
  notes: z.string().optional(),
  is_favorite: z.boolean().default(false),
});

type LogFormValues = z.infer<typeof logFormSchema>;

interface LogFormProps {
  logEntry?: LogEntryWithRelations;
  onSuccess: () => void;
  user_id: string;
}

export function LogForm({ logEntry, onSuccess, user_id }: LogFormProps) {
  const { toast } = useToast();
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  // Fetch available tags
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });
  
  // Form definition
  const form = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema),
    defaultValues: {
      name: logEntry?.name || "",
      company: logEntry?.company || "",
      title: logEntry?.title || "",
      email: logEntry?.email || "",
      phone: logEntry?.phone || "",
      where_met: logEntry?.where_met || "",
      notes: logEntry?.notes || "",
      is_favorite: logEntry?.is_favorite || false,
    },
  });
  
  // Load selected tags when editing
  useEffect(() => {
    if (logEntry?.tags) {
      setSelectedTags(logEntry.tags);
    }
  }, [logEntry]);
  
  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/tags", { name, user_id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create tag: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Save log entry mutation
  const saveLogEntryMutation = useMutation({
    mutationFn: async (data: LogFormValues) => {
      const formData = new FormData();
      
      // Base log entry data
      const logEntryData = {
        ...data,
        user_id,
      };
      
      // If editing, update existing log entry
      if (logEntry) {
        const res = await apiRequest("PUT", `/api/log-entries/${logEntry.id}`, {
          ...logEntryData,
          tagIds: selectedTags.map((tag) => tag.id),
        });
        return await res.json();
      } 
      // Otherwise create new log entry
      else {
        const res = await apiRequest("POST", "/api/log-entries", {
          ...logEntryData,
          tagIds: selectedTags.map((tag) => tag.id),
        });
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/log-entries"] });
      toast({
        title: "Success",
        description: logEntry ? "Log entry updated" : "Log entry created",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save log entry: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: LogFormValues) => {
    saveLogEntryMutation.mutate(data);
  };
  
  const handleAddTag = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (tag && !selectedTags.some((t) => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
  };
  
  const handleCreateTag = async (name: string) => {
    return await createTagMutation.mutateAsync(name);
  };
  
  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles([...selectedFiles, ...files]);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title/Role</FormLabel>
              <FormControl>
                <Input placeholder="Product Manager" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 (234) 567-8901" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="where_met"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Where We Met</FormLabel>
              <FormControl>
                <Input placeholder="Tech Conference 2023" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Details about our interaction..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <FormLabel>Tags</FormLabel>
          <TagInput
            availableTags={tags}
            selectedTags={selectedTags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onCreateTag={handleCreateTag}
            className="mt-1"
          />
        </div>
        
        <div>
          <FormLabel>Media</FormLabel>
          <MediaUpload
            onFilesSelected={handleFilesSelected}
            existingMedia={logEntry?.media}
            className="mt-1"
          />
        </div>
        
        <FormField
          control={form.control}
          name="is_favorite"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">Mark as favorite</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            disabled={saveLogEntryMutation.isPending}
          >
            {saveLogEntryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>Save Connection</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
