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

## أصول البيئة (nature / buildings / vehicles)

تُحمَّل وقت التشغيل من `public/models/env/<category>/<file>` أولًا ثم من CDN.
جميع الأسماء أدناه مُتحقق منها من قوائم المستودع، والتراخيص من `LICENSES.md`
الرسمي فيه (كلها CC0-1.0):

| الفئة | الملفات | الحزمة | الترخيص |
| --- | --- | --- | --- |
| nature | `CommonTree_1.glb`, `PineTree_1.glb`, `BirchTree_1.glb`, `Bush_1.glb`, `Grass.glb`, `Rock_1..4.glb` | Ultimate Nature Pack | CC0-1.0 |
| buildings | `House1.glb`, `House2.glb`, `Building1_Small.glb`, `Building2_Small.glb` | Ultimate Buildings Pack | CC0-1.0 |
| vehicles | `Tank.glb` | Animated Tanks Pack | CC0-1.0 |

```bash
BASE=https://cdn.jsdelivr.net/gh/trebeljahr/quaternius-showcase@main/public/glb
mkdir -p public/models/env/{nature,buildings,vehicles}
for f in CommonTree_1 PineTree_1 BirchTree_1 Bush_1 Grass Rock_1 Rock_2 Rock_3 Rock_4; do
  curl -L -o "public/models/env/nature/$f.glb" "$BASE/nature_pack/$f.glb"
done
for f in House1 House2 Building1_Small Building2_Small; do
  curl -L -o "public/models/env/buildings/$f.glb" "$BASE/buildings_pack_2/$f.glb"
done
curl -L -o public/models/env/vehicles/Tank.glb "$BASE/tank_pack/Tank.glb"
```

ملاحظة: حزم Quaternius الأحدث مرخّصة بـQAL (لا تسمح بإعادة التوزيع) ولم
تُستخدم — الحزم أعلاه كلها CC0-1.0 upstream وفق جدول التراخيص في المستودع.