import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Track Connections</title>
      </Helmet>
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <div className="mb-8 flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link to="/auth">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
        </div>
        
        <div className="prose max-w-none">
          <h1>Track Connections – Privacy Policy</h1>
          <p className="text-muted-foreground">Effective Date: May 7, 2025</p>

          <p>We take your privacy seriously. This Privacy Policy outlines how Track Connections handles your personal information.</p>

          <h2>1. Information We Collect</h2>
          <p>When you register and use the application, we collect:</p>
          <ul>
            <li>Your name and email address (required)</li>
            <li>Any optional contact info you enter (e.g. phone, company, title)</li>
            <li>Notes, tags, and uploaded images/videos associated with your logs</li>
            <li>Default message templates you provide</li>
          </ul>

          <h2>2. How We Use Your Data</h2>
          <p>Your data is stored to provide core functionality of the application. We do not sell or share your information with third parties. Data may be used to:</p>
          <ul>
            <li>Populate your contact and log entries</li>
            <li>Provide reminders and search functionality</li>
            <li>Improve the user experience</li>
          </ul>

          <h2>3. Data Storage</h2>
          <p>Data is stored securely using encrypted cloud infrastructure. Uploaded media is stored in a secure storage system. We do not guarantee data preservation and recommend exporting important data periodically.</p>

          <h2>4. Your Control</h2>
          <p>You may delete your account and data at any time. Deletion is permanent and cannot be undone.</p>

          <h2>5. Security</h2>
          <p>We implement reasonable measures to protect your information. However, no system is 100% secure, and we cannot guarantee the absolute security of your data.</p>

          <h2>6. Policy Changes</h2>
          <p>We may update this policy. Continued use of the service after any changes constitutes your acceptance of the new terms.</p>
        </div>
      </div>
    </>
  );
}