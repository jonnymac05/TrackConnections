import { Helmet } from "react-helmet";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <>
      <Helmet>
        <title>Terms and Conditions | Track Connections</title>
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
          <h1>Track Connections – Terms and Conditions</h1>
          <p className="text-muted-foreground">Effective Date: May 7, 2025</p>

          <p>Welcome to Track Connections, a web application designed to help users log and organize their interactions at conferences. By registering for and using this application, you agree to the following terms:</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By creating an account or using the Track Connections platform, you agree to be bound by these Terms and Conditions. If you do not agree, you may not use the service.</p>

          <h2>2. Use of the Service</h2>
          <p>Track Connections allows users to log personal interactions, upload media, and store related contact information. You are responsible for the accuracy of any data you enter and for ensuring you have the right to store and use any uploaded content.</p>

          <h2>3. Data Loss Disclaimer</h2>
          <p>We do not guarantee the availability or integrity of your stored data. While we take reasonable steps to maintain data security, data may be lost, corrupted, or become inaccessible without notice. By using the service, you acknowledge and accept this risk.</p>

          <h2>4. Limitation of Liability</h2>
          <p>Track Connections, its owners, and operators are not liable for any damages—including direct, indirect, incidental, or consequential damages—resulting from your use or inability to use the service, loss of data, or unauthorized access.</p>

          <h2>5. Termination</h2>
          <p>We reserve the right to suspend or terminate access to the platform at any time, for any reason, without notice.</p>

          <h2>6. Modifications</h2>
          <p>We may update these Terms and Conditions from time to time. Continued use of the service after changes means you accept the revised terms.</p>
        </div>
      </div>
    </>
  );
}