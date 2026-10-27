import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Maps common Supabase auth errors to clear Arabic messages. */
const ARABIC_AUTH_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, "البريد الإلكتروني أو كلمة المرور غير صحيحة"],
  [/email not confirmed/i, "لم يتم تأكيد البريد الإلكتروني بعد — تحقق من بريدك"],
  [/user already registered/i, "هذا البريد الإلكتروني مسجَّل بالفعل"],
  [/rate limit/i, "محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة"],
  [/password should contain|password.*at least/i, "كلمة المرور ضعيفة — استخدم 8 أحرف على الأقل"],
  [/failed to fetch|networkerror|fetch failed/i, "تعذر الاتصال بالخادم — تحقق من اتصالك بالإنترنت"],
  [/invalid email/i, "البريد الإلكتروني غير صالح"],
];

export function arabicAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  for (const [pattern, text] of ARABIC_AUTH_ERRORS) {
    if (pattern.test(message)) {
      return text;
    }
  }
  return message || "حدث خطأ غير متوقع — أعد المحاولة";
}

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
      toast.error(arabicAuthError(error));
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    const errorMessage = arabicAuthError(error);
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
      toast.error(arabicAuthError(error));
      return { data: null, error };
    }

    toast.success("تم تسجيل الدخول بنجاح");
    return { data, error: null };
  } catch (error) {
    const errorMessage = arabicAuthError(error);
    toast.error(errorMessage);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(arabicAuthError(error));
      return { error };
    }

    return { error: null };
  } catch (error) {
    const errorMessage = arabicAuthError(error);
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
      toast.error(arabicAuthError(error));
      return { error };
    }

    toast.success("تم إرسال رسالة استعادة كلمة المرور");
    return { error: null };
  } catch (error) {
    const errorMessage = arabicAuthError(error);
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
      toast.error(arabicAuthError(error));
      return { error };
    }

    toast.success("تم إرسال رابط الدخول إلى بريدك");
    return { error: null };
  } catch (error) {
    const errorMessage = arabicAuthError(error);
    toast.error(errorMessage);
    return { error };
  }
};
