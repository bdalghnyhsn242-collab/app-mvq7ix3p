import AppLayout from "@/components/layout/AppLayout";
import BattleRoyale3D from "@/components/game/BattleRoyale3D";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">باتل رويال 3D 🏝️</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            انزل إلى الجزيرة، واجه الأعداء، وابقَ داخل المنطقة الآمنة حتى النهاية!
          </p>
        </div>
        <BattleRoyale3D />
        <div className="mx-auto max-w-xl rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">كيف تلعب؟</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>W/S للتقدم والتراجع، وA/D للدوران (تعمل الأسهم أيضًا).</li>
            <li>اضغط مسافة أو زر «إطلاق النار» لإقصاء الأعداء أمامك.</li>
            <li>اجمع الصناديق الملونة على الجزيرة لتبديل السلاح والحصول على ذخيرة.</li>
            <li>لكل سلاح مدى وضرر وسرعة إطلاق مختلفة: مسدس، بندقية، وخرطوش.</li>
            <li>على الجوال: استخدم أزرار التحكم أسفل اللعبة.</li>
            <li>المنطقة الآمنة تنكمش باستمرار، والبقاء خارجها يستهلك صحتك.</li>
            <li>اقضِ على كل الأعداء للفوز، وتنتهي الجولة عند نفاد الصحة.</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}