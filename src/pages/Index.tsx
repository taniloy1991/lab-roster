import React from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

const appLogo = "/images/lab-roaster-app-logo-2.png";

const Index = () => {
  const { loading, session } = useAuth();

  if (!loading && session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="mb-2 flex justify-center">
              <img src={appLogo} alt="Lab roster app logo" className="h-20 w-20 object-contain" loading="eager" />
            </div>
            <CardTitle>Continue</CardTitle>
            <CardDescription>You’re signed in.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link to="/app">Open dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 flex justify-center">
            <img src={appLogo} alt="Lab roster app logo" className="h-20 w-20 object-contain" loading="eager" />
          </div>
          <CardTitle>Laboratory Roster Management</CardTitle>
          <CardDescription>Minimal multi-institution roster, leave & OFF balance system.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="sm:flex-1">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="sm:flex-1">
            <Link to="/signup">Create account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
