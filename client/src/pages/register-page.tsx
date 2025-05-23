import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Helmet } from "react-helmet";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

// Register form schema
const registerFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and privacy policy",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerFormSchema>;

export default function RegisterPage() {
  const { registerMutation, user } = useAuth();
  const [location, navigate] = useLocation();

  // Redirect to home if already logged in
  useEffect(() => {
    if (user) {
      navigate("/home");
    }
  }, [user, navigate]);

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
  });

  // Handle register submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    console.log('Registration form submitted with:', { 
      name: data.name, 
      email: data.email, 
      passwordMatch: data.password === data.confirmPassword,
      termsAccepted: data.termsAccepted
    });
    
    // Check if form is valid
    if (!data.termsAccepted) {
      registerForm.setError("termsAccepted", {
        type: "manual",
        message: "You must accept the terms and privacy policy"
      });
      return;
    }
    
    if (data.password !== data.confirmPassword) {
      console.log('Password confirmation failed');
      registerForm.setError("confirmPassword", {
        type: "manual",
        message: "Passwords do not match"
      });
      return;
    }
    
    console.log('Submitting registration data...');
    registerMutation.mutate({
      name: data.name,
      email: data.email,
      password: data.password,
    });
  };

  return (
    <>
      <Helmet>
        <title>Create Account | Track Connections</title>
      </Helmet>

      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
                <p className="text-muted-foreground">Start tracking your connections</p>
              </div>

              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            type="text"
                            {...field}
                            autoComplete="name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="your@email.com"
                            type="email"
                            {...field}
                            autoComplete="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            {...field}
                            autoComplete="new-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I agree to the{" "}
                            <Link to="/terms" className="text-primary underline" target="_blank">
                              Terms and Conditions
                            </Link>{" "}
                            and{" "}
                            <Link to="/privacy" className="text-primary underline" target="_blank">
                              Privacy Policy
                            </Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="text-center text-sm">
                <Button variant="link" asChild>
                  <Link to="/login">
                    Already have an account? Sign in
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}