# نماذج المشغّلين GLTF

ضع ملفات النماذج الهيكلية هنا لتفعيل خط أنابيب `AnimationMixer`:

| الملف | المتغيّر |
| --- | --- |
| `operator-male.glb` | المشغّل الذكر (Woodland) |
| `operator-female.glb` | المشغّلة الأنثى |
| `operator-ghillie.glb` | بدلة الغِلي |

## متطلبات الملفات

- هيكل عظمي (Skinned Mesh) بعظام مسماة، ومقاسات بوحدة المتر بارتفاع ≈ 1.8م والأصل عند القدمين.
- مقاطع حركة بأسماء تحتوي: `Idle` / `Sprint` أو `Run` / `Aim` أو `Shoot` / `Crawl` أو `Crouch` / `Swim` / `Drive` أو `Sit`.
- خامات مدمجة في الملف (GLB) لتقليل الطلبات.

عند غياب أي ملف يتراجع المحرك تلقائيًا إلى أصول CDN المرخّصة CC0 ثم إلى
النموذج الإجرائي المفصّل دون أخطاء.

## ترتيب التحميل الفعلي

1. ملف محلي من هذا المجلد (إن وُجد) — الأسبقية القصوى.
2. شخصية Quaternius مكسوّة بالنسيج من CDN (CC0).
3. مجسّم مكتبة الحركات Quaternius بهيكل عظمي وأكثر من 120 حركة حقيقية (CC0).
4. النموذج الإجرائي المفصّل (فقط إذا لم تُطابق أي حركة عظام المجسّم).

## تنزيل الأصول محليًا (اختياري، CC0)

```bash
curl -L -o public/models/operator-male.glb \
  https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_men/Adventurer.glb
curl -L -o public/models/weapon-ar.glb \
  https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb/modular_sci_fi_guns_pack/AR_1.glb
```

مكتبة الحركات (gltf + bin معًا):
`https://github.com/J-Ponzo/gltf-universal-animation-library` (CC0).