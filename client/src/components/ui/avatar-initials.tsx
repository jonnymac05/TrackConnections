import { User } from "lucide-react";

interface AvatarInitialsProps {
  name?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// Generate a unique color based on the name
function getColorFromName(name?: string | null): string {
  if (!name) return "bg-primary";
  
  const colors = [
    "bg-primary",
    "bg-blue-600",
    "bg-purple-600",
    "bg-green-600",
    "bg-orange-500",
    "bg-red-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
  ];
  
  // Simple hash function to pick a color based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Get initials from name
function getInitials(name?: string | null): string {
  if (!name) return "";
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function AvatarInitials({ name, size = "md", className = "" }: AvatarInitialsProps) {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);
  
  let sizeClass = "w-10 h-10";
  switch (size) {
    case "sm":
      sizeClass = "w-8 h-8 text-xs";
      break;
    case "md":
      sizeClass = "w-10 h-10 text-sm";
      break;
    case "lg":
      sizeClass = "w-12 h-12 text-base";
      break;
    case "xl":
      sizeClass = "w-16 h-16 text-xl";
      break;
  }
  
  if (!name) {
    return (
      <div className={`${sizeClass} ${bgColor} text-white rounded-full flex items-center justify-center font-medium ${className}`}>
        <User className="w-1/2 h-1/2" />
      </div>
    );
  }
  
  return (
    <div className={`${sizeClass} ${bgColor} text-white rounded-full flex items-center justify-center font-medium ${className}`}>
      {initials}
    </div>
  );
}
