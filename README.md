# اللعبة — لعبة الثعبان 🐍

لعبة ثعبان (Snake) عربية تعمل بالكامل في المتصفح، مبنية على قالب LatchLoop الأساسي باستخدام React وVite وTailwind CSS.

## Stack

- React, TypeScript, Vite, and React Router.
- Tailwind CSS with shadcn/Radix-style UI primitives and `lucide-react` icons.
- Optional Supabase auth, database, Realtime, and Edge Functions.
- Sonner for toast notifications.
- React Hook Form and Zod for validated forms.
- Trigger.dev scaffolding for durable background AI work.
- Vercel SPA fallback configuration.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

ثم افتح `http://localhost:8080` في المتصفح. يعمل التطبيق افتراضيًا في وضع الزائر دون الحاجة إلى أي خدمات خارجية.

## كيف تلعب؟

- استخدم أسهم لوحة المفاتيح أو حروف `WASD` لتغيير اتجاه الثعبان.
- على الجوال: اسحب بإصبعك على اللوحة أو استخدم أزرار الاتجاه أسفل اللعبة.
- اضغط `مسافة` للإيقاف المؤقت والمتابعة، و`Enter` لبدء جولة جديدة بعد انتهاء الجولة.
- كل تفاحة = 10 نقاط، وتزداد سرعة اللعبة تدريجيًا كلما جمعت المزيد.
- ثلاثة مستويات صعوبة: سهل، متوسط، صعب. يُحفظ أعلى رقم قياسي وإعداد الصوت في المتصفح (localStorage).

Turn on Supabase-backed auth when the app needs accounts:

```bash
VITE_AUTH_ENABLED=true
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

For Supabase Edge Functions, configure server-side env vars in Supabase:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
TRIGGER_SECRET_KEY=
ENCRYPTION_SECRET=
```

## Project Structure

```text
src/
  components/game/      مكوّن اللعبة (لوحة الرسم والتحكم)
  components/ui/        Reusable UI primitives
  components/auth/      Supabase auth form, enabled by feature flag
  components/ai/        AI message display and composer primitives
  components/layout/    App shell and account menu
  context/              Auth, settings, and Trigger providers
  hooks/                Reusable app hooks
  integrations/         Supabase client and generated database types
  lib/                  API helpers and shared utilities
  lib/game/             منطق اللعبة (دوال نقية مع اختبارات)
  pages/                Starter route pages
  trigger/              Trigger.dev tasks
supabase/
  functions/            Edge Functions
  migrations/           Base schema and RLS
docs/
  internal implementation/
```

`docs/internal implementation/` contains deeper implementation guides. Update those docs whenever the corresponding primitive changes.

## الاختبارات

```bash
npm test
```

منطق اللعبة مكتوب كدوال نقية في `src/lib/game/snake.ts` مع اختبارات في `src/lib/game/snake.test.ts` تغطي الحركة، والأكل، والتصادم مع الجدران والجسم، وتسريع اللعبة.

## Routing

`/` is the primary application route and renders `src/pages/HomePage.tsx`. The starter does not register or redirect to `/dashboard` by default, so new apps can own the root path without deleting dashboard-specific scaffolding first.

If an app needs a dashboard, add it intentionally as a normal route in `src/App.tsx` and link to it from `src/components/layout/AppLayout.tsx`.

## Validation Checklist

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test` يمرّ بنجاح.
- اللعبة تعمل من المسار `/` مع لوحة مفاتيح ولمس.
- `vercel.json` يحافظ على توجيه SPA للنشر على Vercel.
