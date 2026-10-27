import AppLayout from "@/components/layout/AppLayout";
import SnakeGame from "@/components/game/SnakeGame";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="page-shell space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">لعبة الثعبان 🐍</h1>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            تحكّم بالثعبان، اجمع أكبر عدد من التفاحات، وحاول تحطيم رقمك القياسي!
          </p>
        </div>
        <SnakeGame />
        <div className="mx-auto max-w-xl rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">كيف تلعب؟</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>استخدم أسهم لوحة المفاتيح أو حروف WASD لتغيير الاتجاه.</li>
            <li>على الجوال: اسحب بإصبعك على اللوحة أو استخدم أزرار الاتجاه.</li>
            <li>اضغط مسافة للإيقاف المؤقت والمتابعة، وEnter لبدء جولة جديدة بعد النهاية.</li>
            <li>كل تفاحة = 10 نقاط، وتزداد السرعة تدريجيًا كلما جمعت المزيد.</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}