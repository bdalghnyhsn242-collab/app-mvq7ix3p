import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AuthUser = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  isGuest?: boolean;
};

export type AuthSession = {
  user: AuthUser | null;
  isLoading: boolean;
};

export const signUp = async ({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during sign up";
    toast.error(errorMessage);
    return { data: null, error };
  }
};

export const signIn = async ({ email, password }: { email: string; password: string }) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { data: null, error };
    }

    toast.success("Signed in successfully");
    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during sign in";
    toast.error(errorMessage);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      return { error };
    }

    return { error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An error occurred during sign out";
    toast.error(errorMessage);
    return { error };
  }
};

export const resetPassword = async ({ email }: { email: string }) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Password reset email sent");
    return { error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred while sending reset email";
    toast.error(errorMessage);
    return { error };
  }
};

export const signInWithMagicLink = async ({ email }: { email: string }) => {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Magic link sent");
    return { error: null };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An error occurred while sending magic link";
    toast.error(errorMessage);
    return { error };
  }
};
