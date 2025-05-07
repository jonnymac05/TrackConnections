import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, Image, FilePlus } from "lucide-react";

interface MediaUploadProps {
  onFilesSelected: (files: File[]) => void;
  existingMedia?: { id: string; url: string; type: string }[];
  onRemoveExistingMedia?: (id: string) => void;
  maxFiles?: number;
  className?: string;
}

export function MediaUpload({
  onFilesSelected,
  existingMedia = [],
  onRemoveExistingMedia,
  maxFiles = 5,
  className = "",
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(
        file => file.type.startsWith('image/') || file.type.startsWith('video/')
      );
      
      if (existingMedia.length + selectedFiles.length + files.length <= maxFiles) {
        setSelectedFiles(prev => [...prev, ...files]);
        onFilesSelected(files);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(
        file => file.type.startsWith('image/') || file.type.startsWith('video/')
      );
      
      if (existingMedia.length + selectedFiles.length + files.length <= maxFiles) {
        setSelectedFiles(prev => [...prev, ...files]);
        onFilesSelected(files);
      }
      
      // Reset the file input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      {/* Display existing and newly selected media */}
      {(existingMedia.length > 0 || selectedFiles.length > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {existingMedia.map((media) => (
            <div key={media.id} className="relative rounded-md overflow-hidden border border-border">
              {media.type === 'image' ? (
                <img src={media.url} alt="Uploaded media" className="w-full h-32 object-cover" />
              ) : (
                <video src={media.url} className="w-full h-32 object-cover" controls />
              )}
              {onRemoveExistingMedia && (
                <button
                  type="button"
                  onClick={() => onRemoveExistingMedia(media.id)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          
          {selectedFiles.map((file, index) => (
            <div key={index} className="relative rounded-md overflow-hidden border border-border">
              {file.type.startsWith('image/') ? (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={`Selected file ${index}`} 
                  className="w-full h-32 object-cover"
                  onLoad={() => URL.revokeObjectURL(URL.createObjectURL(file))}
                />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-muted">
                  <FilePlus className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeSelectedFile(index)}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Drop zone */}
      {existingMedia.length + selectedFiles.length < maxFiles && (
        <div
          className={`border-2 border-dashed rounded-md p-4 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-muted-foreground mb-2">
            <UploadCloud className="h-8 w-8 mx-auto mb-2" />
          </div>
          <p className="text-muted-foreground text-sm mb-2">
            Drag and drop files here or
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInput}
          />
        </div>
      )}
      
      {existingMedia.length + selectedFiles.length >= maxFiles && (
        <p className="text-sm text-muted-foreground mt-2">
          Maximum of {maxFiles} files allowed
        </p>
      )}
    </div>
  );
}
