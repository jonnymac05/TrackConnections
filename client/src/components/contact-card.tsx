import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { ContactPerson } from "@shared/schema";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Link } from "wouter";

interface ContactCardProps {
  contact: ContactPerson;
}

export function ContactCard({ contact }: ContactCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex-shrink-0">
          <AvatarInitials name={contact.name} size="md" />
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {contact.name || "Unnamed Contact"}
          </h3>
          {contact.company && contact.title && (
            <p className="text-sm text-muted-foreground truncate">
              {contact.title} at {contact.company}
            </p>
          )}
          {contact.company && !contact.title && (
            <p className="text-sm text-muted-foreground truncate">{contact.company}</p>
          )}
          {!contact.company && contact.title && (
            <p className="text-sm text-muted-foreground truncate">{contact.title}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          <Link href={`/contacts/${contact.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              aria-label="View contact details"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
