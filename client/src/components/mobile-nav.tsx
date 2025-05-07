import { Link, useLocation } from "wouter";
import { Home, Users, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  onAddClick: () => void;
}

export function MobileNav({ onAddClick }: MobileNavProps) {
  const [location] = useLocation();
  
  return (
    <nav className="bottom-nav">
      <Link href="/home">
        <a className={`nav-item ${location === "/home" ? "active" : ""}`}>
          <Home className="nav-item-icon" />
          <span>Feed</span>
        </a>
      </Link>
      
      <Link href="/contacts">
        <a className={`nav-item ${location.startsWith("/contacts") ? "active" : ""}`}>
          <Users className="nav-item-icon" />
          <span>Contacts</span>
        </a>
      </Link>
      
      <div className="nav-item">
        <Button
          onClick={onAddClick}
          className="bg-primary text-white rounded-full w-10 h-10 flex items-center justify-center"
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      
      <Link href="/settings">
        <a className={`nav-item ${location === "/settings" ? "active" : ""}`}>
          <Settings className="nav-item-icon" />
          <span>Settings</span>
        </a>
      </Link>
    </nav>
  );
}
