import { useEffect, useState, type ComponentPropsWithoutRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
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
  email: z.string().min(1, "أدخل البريد الإلكتروني").email("أدخل بريدًا إلكترونيًا صحيحًا"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

const registerSchema = z
  .object({
    name: z.string().min(2, "اسم المستخدم يجب أن يكون حرفين على الأقل"),
    email: z.string().min(1, "أدخل البريد الإلكتروني").email("أدخل بريدًا إلكترونيًا صحيحًا"),
    password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
    confirmPassword: z.string().min(1, "أعد إدخال كلمة المرور"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  });

const emailSchema = z.object({
  email: z.string().min(1, "أدخل البريد الإلكتروني").email("أدخل بريدًا إلكترونيًا صحيحًا"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;

type AuthMode = "login" | "register" | "forgot-password" | "magic-link";

function PasswordInput({ ...props }: ComponentPropsWithoutRef<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pe-10" />
      <button
        type="button"
        onClick={() => setShow((value) => !value)}
        aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function AuthForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
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
        navigate("/", { replace: true });
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
        toast.success("تم إنشاء الحساب — تحقق من بريدك إذا كان التأكيد مطلوبًا");
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
    <div className="w-full rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl backdrop-blur-sm">
      <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as AuthMode)}>
        <TabsList className="mb-6 grid w-full grid-cols-2 bg-slate-800/80">
          <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
          <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
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
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <PasswordInput {...field} autoComplete="current-password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-[#2563eb] text-white hover:bg-[#3b82f6]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ تسجيل الدخول…
                  </>
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setAuthMode("forgot-password")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              نسيت كلمة المرور؟
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className="font-semibold text-[#38e1ff] transition-colors hover:text-[#7dd3fc]"
            >
              إنشاء حساب جديد
            </button>
          </div>

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700 bg-transparent hover:bg-slate-800"
              onClick={() => setAuthMode("magic-link")}
              disabled={isLoading}
            >
              <Mail className="h-4 w-4" />
              الدخول برابط سحري عبر البريد
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
                    <FormLabel>اسم المستخدم</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="name" placeholder="مثال: الصقر الشمالي" />
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
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        placeholder="you@example.com"
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
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <PasswordInput {...field} autoComplete="new-password" placeholder="8 أحرف على الأقل" />
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
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <PasswordInput {...field} autoComplete="new-password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full bg-[#f97316] text-slate-950 hover:bg-[#fb923c]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ إنشاء الحساب…
                  </>
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              لديك حساب بالفعل؟ سجّل الدخول
            </button>
          </div>
        </TabsContent>

        <TabsContent value="forgot-password">
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الإرسال…
                  </>
                ) : (
                  "إرسال رسالة استعادة كلمة المرور"
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              العودة إلى تسجيل الدخول
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
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جارٍ الإرسال…
                  </>
                ) : (
                  "إرسال رابط الدخول"
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              العودة إلى تسجيل الدخول
            </button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}