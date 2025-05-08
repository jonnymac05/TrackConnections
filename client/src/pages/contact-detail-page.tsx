import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, MessageSquare, Edit, Trash2, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ContactWithRelations, LogEntryWithRelations, MessageTemplate } from "@shared/schema";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { FormDialog } from "@/components/form-dialog";
import { LogForm } from "@/components/forms/log-form";
import { MobileNav } from "@/components/mobile-nav";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  
  // Fetch the contact details
  const { data: contact, isLoading: isLoadingContact } = useQuery<ContactWithRelations>({
    queryKey: [`/api/contacts/${id}`],
    queryFn: async () => {
      // Use the specific contact by ID endpoint
      const res = await fetch(`/api/contacts/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch contact details');
      const contact = await res.json();
      if (!contact) throw new Error('Contact not found');
      return contact;
    },
  });
  
  // Fetch message templates
  const { data: messageTemplates } = useQuery<MessageTemplate>({
    queryKey: ['/api/message-templates'],
  });
  
  // Format email subject and body
  const formatEmailContent = () => {
    if (!contact || !messageTemplates?.email_template) return null;
    
    let subject = 'Following up from our meeting';
    let body = messageTemplates.email_template
      .replace('[Name]', contact.name || 'there')
      .replace('[Your Name]', user?.name || '');
      
    return {
      subject: encodeURIComponent(subject),
      body: encodeURIComponent(body),
    };
  };
  
  // Format SMS body
  const formatSmsContent = () => {
    if (!contact || !messageTemplates?.sms_template) return null;
    
    let body = messageTemplates.sms_template
      .replace('[Name]', contact.name || 'there')
      .replace('[Your Name]', user?.name || '');
      
    return encodeURIComponent(body);
  };
  
  const emailContent = formatEmailContent();
  const smsContent = formatSmsContent();
  
  // Handle going back to contacts list
  const handleBackToContacts = () => {
    navigate('/contacts');
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Copy to clipboard functions
  const copyToClipboard = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
      
      toast({
        title: "Copied to clipboard",
        description: `${type === 'email' ? 'Email' : 'Phone number'} copied to clipboard`,
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  return (
    <>
      <Helmet>
        <title>{contact?.name || 'Contact Details'} | Track Connections</title>
      </Helmet>
      
      <div className="mobile-container">
        {/* Header */}
        <header className="sticky top-0 bg-background border-b border-border z-10">
          <div className="p-4 flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToContacts}
              className="mr-2 text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Contact Details</h1>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="px-4 pt-4 space-y-4 pb-20">
          {isLoadingContact ? (
            // Loading skeleton
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted animate-pulse rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 w-40 bg-muted animate-pulse rounded"></div>
                  <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                </div>
              </div>
              
              <div className="h-16 bg-muted animate-pulse rounded-lg"></div>
              
              <div className="space-y-2">
                <div className="h-6 bg-muted animate-pulse rounded"></div>
                <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
              </div>
            </div>
          ) : contact ? (
            <>
              {/* Contact Header */}
              <div className="flex items-center gap-4">
                <AvatarInitials name={contact.name} size="xl" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {contact.name || "Unnamed Contact"}
                  </h2>
                  {contact.company && contact.title && (
                    <p className="text-muted-foreground">
                      {contact.title} at {contact.company}
                    </p>
                  )}
                  {contact.company && !contact.title && (
                    <p className="text-muted-foreground">{contact.company}</p>
                  )}
                  {!contact.company && contact.title && (
                    <p className="text-muted-foreground">{contact.title}</p>
                  )}
                </div>
              </div>
              
              {/* Contact Actions */}
              <div className="flex gap-3">
                {contact.email && emailContent && (
                  <a 
                    href={`mailto:${contact.email}?subject=${emailContent.subject}&body=${emailContent.body}`}
                    className="flex-1"
                  >
                    <Button className="w-full flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Email</span>
                    </Button>
                  </a>
                )}
                
                {contact.phone && smsContent && (
                  <a 
                    href={`sms:${contact.phone}?body=${smsContent}`}
                    className="flex-1"
                  >
                    <Button 
                      variant="outline"
                      className="w-full flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Message</span>
                    </Button>
                  </a>
                )}
              </div>
              
              {/* Contact Details */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-medium text-foreground">Contact Information</h3>
                  
                  {contact.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <div className="flex items-center justify-between group">
                        <p 
                          className="text-foreground group-hover:text-primary cursor-pointer transition-colors" 
                          onClick={() => copyToClipboard(contact.email || '', 'email')}
                        >
                          {contact.email}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(contact.email || '', 'email')}
                          className="h-8 w-8 p-0"
                        >
                          {copiedEmail ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {contact.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <div className="flex items-center justify-between group">
                        <p 
                          className="text-foreground group-hover:text-primary cursor-pointer transition-colors" 
                          onClick={() => copyToClipboard(contact.phone || '', 'phone')}
                        >
                          {contact.phone}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(contact.phone || '', 'phone')}
                          className="h-8 w-8 p-0"
                        >
                          {copiedPhone ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {contact.company && (
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="text-foreground">{contact.company}</p>
                    </div>
                  )}
                  
                  {contact.tags && contact.tags.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tags</p>
                      <div className="mt-1">
                        {contact.tags.map((tag: { id: string, name: string }) => (
                          <span key={tag.id} className="tag">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Log Entries */}
              {contact.logEntries && contact.logEntries.length > 0 && (
                <div>
                  <h3 className="font-medium text-foreground mb-2">Interaction History</h3>
                  
                  <div className="space-y-3">
                    {contact.logEntries.map((logEntry: LogEntryWithRelations) => (
                      <Card key={logEntry.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              {logEntry.notes && (
                                <p className="text-sm text-foreground">
                                  {logEntry.notes}
                                </p>
                              )}
                              {logEntry.where_met && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Met at {logEntry.where_met}
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(logEntry.created_at)}
                            </span>
                          </div>
                          
                          {/* Media */}
                          {logEntry.media && logEntry.media.length > 0 && (
                            <div className="mt-2">
                              {logEntry.media[0].file_type?.startsWith('image/') ? (
                                <img
                                  src={logEntry.media[0].url}
                                  alt="Interaction media"
                                  className="rounded-md w-full h-auto"
                                />
                              ) : (
                                <video
                                  src={logEntry.media[0].url}
                                  controls
                                  className="rounded-md w-full h-auto"
                                />
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Contact not found
            <div className="text-center py-8">
              <p className="text-muted-foreground">Contact not found</p>
              <Link href="/contacts">
                <Button variant="outline" className="mt-4">
                  Back to Contacts
                </Button>
              </Link>
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
