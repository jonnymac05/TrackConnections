import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { Tag } from "@shared/schema";

interface TagInputProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (tagName: string) => Promise<Tag>;
  className?: string;
}

export function TagInput({
  availableTags,
  selectedTags,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  className = "",
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = async () => {
    if (!inputValue.trim()) return;

    // Check if tag already exists in available tags
    const existingTag = availableTags.find(
      (tag) => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

    if (existingTag) {
      // If tag exists and not already selected, add it
      if (!selectedTags.some((tag) => tag.id === existingTag.id)) {
        onAddTag(existingTag.id);
      }
    } else {
      // Create new tag
      setIsCreating(true);
      try {
        const newTag = await onCreateTag(inputValue.trim());
        onAddTag(newTag.id);
      } catch (error) {
        console.error("Failed to create tag:", error);
      } finally {
        setIsCreating(false);
      }
    }

    setInputValue("");
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="tag flex items-center"
          >
            {tag.name}
            <button
              type="button"
              className="ml-1 text-xs hover:text-destructive"
              onClick={() => onRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          disabled={isCreating}
          className="flex-grow"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addTag}
          disabled={!inputValue.trim() || isCreating}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
