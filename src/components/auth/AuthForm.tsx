import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { resetPassword, signIn, signInWithMagicLink, signUp } from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

const registerSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const emailSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;

type AuthMode = "login" | "register" | "forgot-password" | "magic-link";

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const forgotPasswordForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const magicLinkForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  async function onLoginSubmit(values: LoginFormValues) {
    setIsLoading(true);
    try {
      const { error } = await signIn(values);
      if (!error) {
        await refreshSession();
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegisterSubmit(values: RegisterFormValues) {
    setIsLoading(true);
    try {
      const { error } = await signUp({
        email: values.email,
        password: values.password,
        name: values.name,
      });

      if (!error) {
        toast.success("Account created. Check your email if confirmation is enabled.");
        setAuthMode("login");
        loginForm.setValue("email", values.email);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onForgotPasswordSubmit(values: EmailFormValues) {
    setIsLoading(true);
    try {
      const { error } = await resetPassword(values);
      if (!error) {
        setAuthMode("login");
        loginForm.setValue("email", values.email);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function onMagicLinkSubmit(values: EmailFormValues) {
    setIsLoading(true);
    try {
      await signInWithMagicLink(values);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Use Supabase auth to access the app shell.</p>
      </div>

      <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as AuthMode)}>
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Sign up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" placeholder="you@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" autoComplete="current-password" placeholder="********" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in" : "Sign in"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => setAuthMode("forgot-password")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setAuthMode("magic-link")}
              disabled={isLoading}
            >
              <Mail className="h-4 w-4" />
              Continue with magic link
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="register">
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" placeholder="Jane Doe" />
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
                      <Input {...field} type="email" autoComplete="email" placeholder="you@example.com" />
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
                      <Input {...field} type="password" autoComplete="new-password" placeholder="********" />
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
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" autoComplete="new-password" placeholder="********" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating account" : "Create account"}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="forgot-password">
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" placeholder="you@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending reset email" : "Send reset email"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => setAuthMode("login")} className="text-sm text-muted-foreground hover:text-foreground">
              Back to login
            </button>
          </div>
        </TabsContent>

        <TabsContent value="magic-link">
          <Form {...magicLinkForm}>
            <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
              <FormField
                control={magicLinkForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" placeholder="you@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending magic link" : "Send magic link"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => setAuthMode("login")} className="text-sm text-muted-foreground hover:text-foreground">
              Back to login
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
