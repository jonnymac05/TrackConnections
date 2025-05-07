import { useState } from "react";
import { Helmet } from "react-helmet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MobileNav } from "@/components/mobile-nav";
import { FormDialog } from "@/components/form-dialog";
import { LogForm } from "@/components/forms/log-form";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MessageTemplate, insertMessageTemplateSchema } from "@shared/schema";
import { Loader2, ChevronRight, User, Lock, LogOut } from "lucide-react";

// Template form schema
const templateFormSchema = z.object({
  email_template: z.string().min(1, "Email template is required"),
  sms_template: z.string().min(1, "SMS template is required"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function SettingsPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  
  // Fetch message templates
  const { data: templates, isLoading: isLoadingTemplates } = useQuery<MessageTemplate>({
    queryKey: ["/api/message-templates"],
  });
  
  // Form setup
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      email_template: templates?.email_template || "Hi [Name], It was great meeting you at [Event]. I'd love to connect and discuss [Topic] further. Best regards, [Your Name]",
      sms_template: templates?.sms_template || "Hi [Name], it's [Your Name] from [Event]. Great meeting you! Let's connect soon.",
    },
    values: {
      email_template: templates?.email_template || "Hi [Name], It was great meeting you at [Event]. I'd love to connect and discuss [Topic] further. Best regards, [Your Name]",
      sms_template: templates?.sms_template || "Hi [Name], it's [Your Name] from [Event]. Great meeting you! Let's connect soon.",
    },
  });
  
  // Update templates mutation
  const updateTemplatesMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const payload = {
        ...data,
        user_id: user?.id,
      };
      const res = await apiRequest("PUT", "/api/message-templates", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/message-templates"] });
      toast({
        title: "Success",
        description: "Message templates updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update templates: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle template form submission
  const onSubmit = (data: TemplateFormValues) => {
    updateTemplatesMutation.mutate(data);
  };
  
  // Handle logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logoutMutation.mutate();
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Settings | Track Connections</title>
      </Helmet>
      
      <div className="mobile-container">
        {/* Header */}
        <header className="sticky top-0 bg-background border-b border-border z-10">
          <div className="p-4">
            <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="px-4 pt-4 space-y-4 pb-20">
          {/* Account Settings */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-foreground mb-3">Account</h3>
              
              <div className="space-y-3">
                {/* Profile button (non-functional in MVP) */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-foreground">Profile</p>
                      <p className="text-sm text-muted-foreground">Update your personal information</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                
                {/* Change Password button (non-functional in MVP) */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-foreground">Change Password</p>
                      <p className="text-sm text-muted-foreground">Update your security credentials</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Message Templates */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-foreground mb-3">Message Templates</h3>
              
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                    <FormField
                      control={form.control}
                      name="email_template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Email Template</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Hi [Name], It was great meeting you at [Event]. I'd love to connect and discuss [Topic] further. Best regards, [Your Name]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="sms_template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default SMS Template</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              placeholder="Hi [Name], it's [Your Name] from [Event]. Great meeting you! Let's connect soon."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateTemplatesMutation.isPending}
                    >
                      {updateTemplatesMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Templates"
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
          
          {/* App Settings */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium text-foreground mb-3">App Settings</h3>
              
              <div className="space-y-3">
                {/* Notifications toggle (non-functional in MVP) */}
                <div className="flex justify-between items-center">
                  <p className="text-foreground">Notifications</p>
                  <Switch checked={true} />
                </div>
                
                {/* Dark Mode toggle (non-functional in MVP) */}
                <div className="flex justify-between items-center">
                  <p className="text-foreground">Dark Mode</p>
                  <Switch checked={false} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Logout Button */}
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>Log Out</span>
              </>
            )}
          </Button>
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
