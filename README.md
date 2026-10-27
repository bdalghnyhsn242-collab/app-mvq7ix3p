# اللعبة — باتل رويال 3D 🏝️

لعبة باتل رويال ثلاثية الأبعاد تعمل في المتصفح: جندي واحد في جزيرة، أعداء يطاردونك، ومنطقة آمنة تنكمش باستمرار. مبنية على قالب LatchLoop باستخدام React وVite وTailwind CSS وThree.js.

## Stack

- React, TypeScript, Vite, React Router, Tailwind CSS.
- Three.js لمشهد ثلاثي الأبعاد (الجزيرة، الماء، الجندي، الأعداء، حلقة المنطقة).
- منطق اللعبة دوال نقية في `src/lib/game/battleRoyale.ts` مع اختبارات Vitest.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

ثم افتح `http://localhost:8080`. تعمل اللعبة بالكامل دون أي خدمات خارجية.

## كيف تلعب؟

- `W/S` للتقدم والتراجع، و`A/D` للدوران (تعمل الأسهم أيضًا).
- `مسافة` أو زر «إطلاق النار» لإقصاء أي عدو أمامك في نطاق التصويب.
- على الجوال: أزرار تحكم لمسية أسفل اللعبة.
- المنطقة الآمنة (الحلقة الزرقاء) تنكمش تدريجيًا؛ البقاء خارجها يستهلك الصحة، والاحتكاك بالأعداء أيضًا.
- الفوز بإقصاء كل الأعداء، والخسارة عند نفاد الصحة.

## Project Structure

```text
src/
  components/game/BattleRoyale3D.tsx   مشهد Three.js وواجهة التحكم
  lib/game/battleRoyale.ts             منطق اللعبة (دوال نقية)
  lib/game/battleRoyale.test.ts        اختبارات المنطق
  pages/HomePage.tsx                   الصفحة الرئيسية
```

## الاختبارات

```bash
npm test
```

تغطي الاختبارات الحركة، والدوران، وانكماش المنطقة، والضرر خارجها، والإطلاق والإقصاء، وشروط الفوز والخسارة.

## Validation Checklist

- `npm install`
- `npm run dev`
- `npm run build`
- `npm test`
- اللعبة تعمل من المسار `/` مع لوحة مفاتيح وأزرار لمس.
- `vercel.json` يحافظ على توجيه SPA للنشر على Vercel.