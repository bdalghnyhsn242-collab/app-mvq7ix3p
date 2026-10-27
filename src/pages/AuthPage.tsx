import { AuthForm } from "@/components/auth/AuthForm";
import { AUTH_ENABLED } from "@/config/features";
import { Navigate } from "react-router-dom";

export default function AuthPage() {
  if (!AUTH_ENABLED) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 max-w-md text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground">
          LL
        </div>
        <h1 className="text-3xl font-semibold">{import.meta.env.VITE_APP_NAME || "LatchLoop App Base"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A reusable React, Supabase, Tailwind, and AI-ready starter shell.
        </p>
      </div>
      <AuthForm />
    </div>
  );
}
