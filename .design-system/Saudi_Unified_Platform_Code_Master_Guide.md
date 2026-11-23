# Saudi Unified Platform Code — Master Implementation Guide

> مرجع تنفيذي مبني على المحتوى العام لنظام «كود المنصات» في <https://design.dga.gov.sa/>.
>
> **نسخة المرجع:** 1.0.0 · **آخر تحقق:** 2026-09-07 · **نسخة النظام المعروضة في الموقع:** 1.0

## 1. About This Guide

هذا الملف يحول توثيق كود المنصات إلى قيود واختيارات قابلة للتنفيذ للمصمم والمطور وفرق المنتج وQA ومراجعي الوصول ووكلاء البرمجة. لا يستبدل المصدر الرسمي عند وجود تحديث أحدث.

مستويات المتطلبات المستخدمة:

| المستوى | المعنى |
|---|---|
| `REQUIRED` | نص إلزامي صريح، معيار تقييم «إلزامي»، أو ضرورة وصول صاغها المصدر بصيغة أمر. |
| `RECOMMENDED` | توصية رسمية أو معيار تقييم «موصى به». |
| `OPTIONAL` | خيار أو متغير أجازه المصدر. |
| `INFERRED` | استنتاج تنفيذي من عدة نصوص؛ ليس قاعدة رسمية مستقلة. |

أي نقطة لا يدعمها المصدر تحمل `⚠️ NEEDS VERIFICATION`. وأي اختلاف داخلي موثق يحمل `⚠️ SOURCE CONFLICT`.

## 2. Official Sources

| المصدر | النوع | الرابط | تمت القراءة | ملاحظات |
|---|---|---|---|---|
| الموقع والتنقل الحي | توثيق | <https://design.dga.gov.sa/> | نعم | المصدر الأساسي؛ 96 مسارًا عامًا عولجت. |
| معايير التقييم | معيار | <https://design.dga.gov.sa/AssessmentCriteria> | نعم | يفصل الإلزامي عن الموصى به. |
| أسس التصميم | Foundations | <https://design.dga.gov.sa/guidelines> | نعم | اللون، الخط، المسافات، الأيقونات، الارتفاع. |
| المكونات | Component library | <https://design.dga.gov.sa/guidelines> | نعم | 50 مكونًا عبر 8 مجموعات. |
| القوالب | Templates | <https://design.dga.gov.sa/guidelines/templates> | نعم | 19 قالبًا/قسم قالب. |
| التصميم للويب والجوال | Guidelines | <https://design.dga.gov.sa/designing> | نعم | سير عمل Figma وقواعد تصميم عامة. |
| التطوير | Development | <https://design.dga.gov.sa/developing> | نعم | حزمة React وطريقة التثبيت. |
| الوصول | Article | <https://design.dga.gov.sa/thoughts/AccessibilityEase> | نعم | مبادئ الوصول العامة. |
| Sitemap | XML | <https://design.dga.gov.sa/sitemap.xml> | نعم | غير كامل: 78 URL مقابل 96 في التنقل الحي. |
| Figma Foundations | تصميم | <https://www.figma.com/community/file/1392267405633663431/foundations-platforms-code> | رابط موثق | مورد خارجي؛ لا توجد نسخة محلية. |
| Figma Icons | تصميم | <https://www.figma.com/community/file/1392269191144731080/icons-platforms-code> | رابط موثق | مورد خارجي؛ لا توجد نسخة محلية. |
| Figma Desktop Components | تصميم | <https://www.figma.com/community/file/1392264328585493958/components-library-platforms-code> | رابط موثق | مورد خارجي؛ لا توجد نسخة محلية. |
| Figma Mobile Components | تصميم | <https://www.figma.com/community/file/1392271796654597578/mobile-components-platforms-code> | رابط موثق | مورد خارجي؛ لا توجد نسخة محلية. |

الجرد التفصيلي في [`crawl_inventory.md`](./crawl_inventory.md)، والنسخ المحلية في [`official-resources/README.md`](../official-resources/README.md).

## 3. Mandatory Rules

المصدر: [معايير التقييم](https://design.dga.gov.sa/AssessmentCriteria) و[أسس النظام](https://design.dga.gov.sa/guidelines) — آخر تحقق 2026-09-07.

1. `REQUIRED` نفّذ الإصدار 1.0 تنفيذًا صحيحًا في نطاق التقييم.
2. `REQUIRED` استخدم الألوان الأساسية والوظيفية والخطوط المعتمدة.
3. `REQUIRED` التزم بنظام التخطيط والمسافات، بما فيه الشبكة وأبعادها ومنهجية Mobile-first وشبكة المسافات.
4. `REQUIRED` اجعل التجربة قابلة للاستخدام كاملًا على الجوال: viewport، اللمس، والتحول الملائم للتنقل.
5. `REQUIRED` حافظ على تباين 4.5:1 للنص الصغير و3:1 للنص الكبير (24px فأكثر) ولمكونات UI والرسومات.
6. `REQUIRED` لا تعتمد على اللون وحده لتوصيل الحالة أو المعنى.
7. `REQUIRED` اجعل كل عنصر تفاعلي قابلًا للوحة المفاتيح مع مؤشر تركيز ظاهر.
8. `REQUIRED` استخدم HTML الدلالي والتسميات والعلاقات المناسبة؛ أضف ARIA فقط حيث يلزم.
9. `REQUIRED` استخدم `lang="ar"` و`dir="rtl"` عندما تكون واجهة الصفحة عربية.
10. `REQUIRED` اجعل هدف اللمس التفاعلي 44×44px على الأقل.
11. `REQUIRED` استخدم خط IBM Plex Sans Arabic للنصوص العامة، والخط السعودي فقط في العناوين الرئيسية للمناسبات الوطنية/الموسمية.
12. `REQUIRED` حافظ على تسلسل قراءة DOM منطقي ومتوافق مع العرض.

## 4. Recommended Practices

المصدر: [معايير التقييم](https://design.dga.gov.sa/AssessmentCriteria) وصفحات المكونات — آخر تحقق 2026-09-07.

- `RECOMMENDED` أعد استخدام مكتبة المكونات والأيقونات الرسمية بدل بناء بدائل مخصصة.
- `RECOMMENDED` اجعل العربية اللغة الأولى، واكتب نصًا حكوميًا واضحًا وموجزًا.
- `RECOMMENDED` وفّر Sitemap، وبحثًا ومساعدة فعّالين، وقنوات ملاحظات، وإشعار خصوصية واضحًا.
- `RECOMMENDED` اجعل التنقل بديهيًا، والسلوك متوقعًا، والأخطاء واضحة، والاستجابة للإجراء فورية.
- `RECOMMENDED` استخدم قائمة تحقق في كل مرحلة، ومراجعة نظير، وتحكمًا في الإصدارات، وأدلة مصورة/برمجية للتقييم.
- `RECOMMENDED` قدّم طلب التقييم قبل الموعد المرغوب بأسبوعين وفق نص الموقع.

## 5. Foundations

### Colors

المصدر: [نظام الألوان](https://design.dga.gov.sa/guidelines/foundations/color-system) وحزمة CSS الرسمية — آخر تحقق 2026-09-07.

الأخضر الأساسي يمثل العلم والقيم الوطنية. الذهبي واللافندر لوحات ثانوية، والأزرق/الأخضر/الأصفر/الأحمر ألوان دلالية للمعلومة/النجاح/التحذير/الخطأ.

| السلم | 25 | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Primary SA Flag | `#f7fdf9` | `#f3fcf6` | `#dff6e7` | `#b8eacb` | `#88d8ad` | `#54c08a` | `#25935f` | `#1b8354` | `#166a45` | `#14573a` | `#104631` | `#092a1e` |
| Secondary Gold | `#fffef7` | `#fffef2` | `#fffce6` | `#fcf3bd` | `#fae996` | `#f7d54d` | `#f5bd02` | `#dba102` | `#b87b02` | `#945c01` | `#6e3c00` | `#472400` |
| Tertiary Lavendar | `#fefcff` | `#f9f5fa` | `#f2e9f5` | `#e1cce8` | `#ccadd9` | `#a57bba` | `#80519f` | `#6d428f` | `#532d75` | `#3d1d5e` | `#281047` | `#16072e` |
| Neutral | `#fcfcfd` | `#f9fafb` | `#f3f4f6` | `#e5e7eb` | `#d2d6db` | `#9da4ae` | `#6c727e` | `#4d5761` | `#384250` | `#1f2a37` | `#111927` | `#0c111b` |
| Semantic Blue | `#f5faff` | `#eff8ff` | `#d1e9ff` | `#b2ddff` | `#84caff` | `#53b0fd` | `#2e90fa` | `#156fee` | `#175cd3` | `#1849a9` | `#194084` | `#102a56` |
| Semantic Green | `#f6fef9` | `#ecfdf3` | `#dcfae6` | `#abefc6` | `#75dfa6` | `#47cd89` | `#17b169` | `#069454` | `#067647` | `#085d3a` | `#074c30` | `#053321` |
| Semantic Yellow | `#fffcf5` | `#fffaeb` | `#fef0c7` | `#fedf89` | `#fec84b` | `#fdb022` | `#f79009` | `#dc6803` | `#b54707` | `#93370c` | `#7a2e0e` | `#4e1d09` |
| Semantic Red | `#fffbfa` | `#fef3f2` | `#fee4e2` | `#fecdca` | `#fca19b` | `#f97066` | `#f04437` | `#d92c20` | `#b42318` | `#912018` | `#7a2619` | `#54150c` |

`RECOMMENDED` على خلفيات الدرجات 25–400 استخدم نص Neutral 500/600/700/950 بحسب التباين، وعلى 500 فأعلى استخدم الأبيض. الاختيار النهائي يجب أن يجتاز النسبة، لا أن يعتمد الجدول وحده.

### Typography

المصدر: [الخطوط](https://design.dga.gov.sa/guidelines/foundations/typography) — آخر تحقق 2026-09-07.

- الخط الأساسي: **IBM Plex Sans Arabic**؛ الشفرة: **Roboto Mono**.
- الأوزان: Regular، Medium، Semibold، Bold.
- `display` للعناوين فقط، و`text` للنصوص والتسميات وUI.

| Token | الحجم/ارتفاع السطر | Tracking |
|---|---|---|
| display-2xl | 72/90px | -2% |
| display-xl | 60/72px | -2% |
| display-lg | 48/60px | -2% |
| display-md | 36/44px | -2% |
| display-sm | 30/38px | عادي |
| display-xs | 24/32px | عادي |
| text-xl | 20/30px | عادي |
| text-lg | 18/28px | عادي |
| text-md | 16/24px | عادي |
| text-sm | 14/20px | عادي |
| text-xs | 12/18px | عادي |
| text-2xs | 10/14px | عادي |

`REQUIRED` اجعل ارتفاع سطر النص الأساسي 1.5× على الأقل. `OPTIONAL` الخط السعودي بأوزان Regular/Bold للعناوين الرئيسية في المناسبات الوطنية والموسمية؛ `REQUIRED` لا تستخدمه للفقرات الطويلة.

### Spacing

المصدر: [التخطيط والمسافات](https://design.dga.gov.sa/guidelines/foundations/layout-and-spacing) وCSS — آخر تحقق 2026-09-07.

السلم الخام (token → px): `0→0`, `0.5→2`, `1→4`, `1.5→6`, `2→8`, `3→12`, `4→16`, `5→20`, `6→24`, `8→32`, `10→40`, `12→48`, `16→64`, `20→80`, `24→96`, `32→128`, `40→160`, `48→192`, `56→224`, `64→256`, `80→320`, `96→384`, `120→480`, `140→560`, `160→640`, `180→720`, `192→768`, `256→1024`, `320→1280`, `360→1440`, `400→1600`, `480→1920`.

الأسماء الدلالية: `none=0`, `xxs=2`, `xs=4`, `sm=6`, `md=8`, `lg=12`, `xl=16`, `2xl=20`, `3xl=24`, `4xl=32`, `5xl=40`, `6xl=48`, `7xl=64`, `8xl=80`, `9xl=96`, `10xl=128`, `11xl=160`.

### Grid

- الحاوية: padding جوال 16px، سطح مكتب 32px، أقصى عرض سطح مكتب 1280px.
- أقصى عرض فقرة منشور في CSS: 720px.
- الشبكة المعتادة: 12 عمودًا على سطح المكتب، و2–4 أعمدة في العروض الأضيق بحسب السياق.
- `REQUIRED` ابدأ Mobile-first، واستخدم المسافات الرسمية.

`⚠️ SOURCE CONFLICT` يعرض جدول الصفحة `width-xs = 34rem / 384px` مع أن 384px تساوي 24rem عند أساس 16px. ويعرض `paragraph-max-width = 20rem / 720px` وهما غير متكافئين. CSS يثبت 720px للفقرة؛ اعتمد قيمة البكسل/CSS في التنفيذ وسجّل التعارض.

### Breakpoints

| الفئة | النطاق | نقطة التحول |
|---|---:|---:|
| Small / Mobile | 0–599px | 600px |
| Medium / Tablet | 600–959px | 960px |
| Large / Desktop | 960–1279px | 1280px |
| X-Large Desktop | 1280px فأكثر | — |

### Radius

`none=0`, `xxs=2`, `xs=4`, `sm=6`, `md=8`, `lg=10`, `xl=12`, `2xl=16`, `3xl=20`, `4xl=24`, `full=9999` (px).

### Shadows

المصدر: [الارتفاع](https://design.dga.gov.sa/guidelines/foundations/elevation) وCSS — آخر تحقق 2026-09-07.

```css
--shadow-xs: 0 1px 2px 0 rgba(16,24,40,.05);
--shadow-sm: 0 1px 2px 0 rgba(16,24,40,.06), 0 1px 3px 0 rgba(16,24,40,.10);
--shadow-md: 0 2px 4px -2px rgba(16,24,40,.06), 0 4px 8px -2px rgba(16,24,40,.10);
--shadow-lg: 0 4px 6px -2px rgba(16,24,40,.03), 0 12px 16px -4px rgba(16,24,40,.08);
--shadow-xl: 0 8px 8px -4px rgba(16,24,40,.03), 0 20px 24px -4px rgba(16,24,40,.08);
--shadow-2xl: 0 24px 48px -12px rgba(16,24,40,.18);
--shadow-3xl: 0 32px 64px -12px rgba(16,24,40,.14);
```

Blur الخلفية المنشور: 8، 16، 24، 40px. `RECOMMENDED` استخدم الظلال باعتدال للهرمية، ولا تعتمد عليها وحدها للحالة.

### Icons

المصدر: [الأيقونات](https://design.dga.gov.sa/guidelines/foundations/iconography) — آخر تحقق 2026-09-07.

- الأحجام: 10/14/16 صغيرة جدًا؛ 18/20 صغيرة؛ 24 قياسية؛ 28/32 كبيرة.
- الأنواع الرسمية تشمل: النظام/الأساس، العناصر، featured، التغذية الراجعة، التقييم، الاجتماعية، الأعلام، أدوات التكامل، المدفوعات، المساعدة.
- ذات المعنى: اسم وصول عبر النص/`aria-label`/`aria-labelledby`. زخرفية: `aria-hidden="true"` أو `alt=""`. SVG ذو معنى: `role="img"` واسم واضح.
- الهدف التفاعلي المحيط بالأيقونة 44×44px على الأقل.

### Motion

لا توجد صفحة Foundation مستقلة تنشر مددًا أو easing tokens. `⚠️ NEEDS VERIFICATION` لا تخترع مدة حركة. [صفحة التحميل](https://design.dga.gov.sa/guidelines/components/loading-and-status/loading) تطلب خيار تقليل الحركة للمستخدمين الحساسين؛ طبّق `prefers-reduced-motion` عند وجود حركة (`INFERRED` كترجمة تقنية للمطلب).

## 6. Layout System

المصدر: [التخطيط والمسافات](https://design.dga.gov.sa/guidelines/foundations/layout-and-spacing) — آخر تحقق 2026-09-07.

1. ابدأ بحاوية padding ‏16px للجوال ثم 32px لسطح المكتب؛ لا تتجاوز 1280px لمحتوى الحاوية.
2. استخدم 12 عمودًا للشاشات الكبيرة، وقلّص إلى 2–4 أعمدة بحسب المحتوى والعرض.
3. اربط الهوامش والفجوات بسلم المسافات؛ لا تنشئ أرقامًا عشوائية.
4. حافظ على ترتيب بصري/دلالي واحد، وتجميع منطقي ومساحات بيضاء تساعد القراءة.
5. اجعل الصور والمكونات مرنة مع تغيير الاتجاه والحجم.
6. `INFERRED` اجعل أقصى عرض النص الطويل 720px لتقليل طول السطر، بناءً على token المنشور.

## 7. RTL & Arabic Rules

المصدر: [الخطوط](https://design.dga.gov.sa/guidelines/foundations/typography)، [الخطوات](https://design.dga.gov.sa/guidelines/components/forms-and-inputs/steps)، [مسار التصفح](https://design.dga.gov.sa/guidelines/components/navigational/breadcrumbs)، والقوالب — آخر تحقق 2026-09-07.

- `REQUIRED` العربية هي اللغة الأولى بحسب معيار التقييم؛ عيّن `lang="ar" dir="rtl"` لجذر الواجهة العربية.
- `REQUIRED` استخدم IBM Plex Sans Arabic، ومحاذاة/تدفق RTL منطقيين.
- `REQUIRED` اعكس ترتيب الخطوات الأفقية، الفواصل الاتجاهية، أسهم العودة، ومواضع السابق/التالي في RTL عندما يحمل الرمز معنى اتجاهيًا.
- `REQUIRED` أبقِ ترتيب DOM منطقيًا؛ لا تستخدم CSS لعكس بصري يفسد ترتيب القراءة أو Tab.
- `RECOMMENDED` اعرض شرائح المرشحات المطبقة من اليمين إلى اليسار مع إمكانية حذف كل شريحة.
- `OPTIONAL` عند وجود لغتين استخدم مبدّلًا مباشرًا؛ عند أكثر من لغتين استخدم قائمة منسدلة وفق قالب الأسئلة الشائعة.
- `⚠️ NEEDS VERIFICATION` لم ينشر الموقع قاعدة موحدة لصيغة الأرقام أو التاريخ أو الهاتف أو البريد أو URLs أو المحتوى العربي/الإنجليزي المختلط. لا تُدخل قاعدة محلية على أنها من النظام.
- `INFERRED` طبّق `dir="ltr"` على قيمة تقنية مفردة فقط عند الحاجة (URL/بريد/كود) مع إبقاء سياق الصفحة RTL؛ هذا سلوك تقني تكميلي وليس نصًا رسميًا منشورًا.

## 8. Accessibility

المصدر: [التصميم للوصول](https://design.dga.gov.sa/thoughts/AccessibilityEase)، [اللون](https://design.dga.gov.sa/guidelines/foundations/color-system)، وصفحات المكونات — آخر تحقق 2026-09-07.

الهدف المعلن هو WCAG 2.1 AA. النص العادي 4.5:1، الكبير 3:1، وUI/الرسومات 3:1؛ AAA المعروض 7:1، وAAA large ‏4.5:1.

- استخدم HTML الدلالي أولًا: `button`, `a`, `nav`, `main`, `header`, `footer`, `table`, `ol/ul/li`, `fieldset/legend`, و`label`.
- اجعل كل التفاعلات تعمل بلوحة المفاتيح؛ Tab/Shift+Tab للتنقل، Enter/Space للتفعيل، الأسهم حيث يحدد نمط المكون، وEsc للإغلاق/المسح حين يذكر المكون ذلك.
- وفّر مؤشر تركيز واضح، ولا تحذف focus outline دون بديل مكافئ.
- اربط الحقول بالتسميات، والمساعدة/الخطأ بـ`aria-describedby`، والخطأ بـ`aria-invalid="true"`.
- لا تستخدم placeholder بدل label.
- الصور ذات المعنى لها alt؛ الزخرفية `alt=""`. الأيقونات الزخرفية `aria-hidden="true"`.
- استخدم `aria-live="polite"` للتغيرات غير الحرجة؛ `role="alert"` فقط للتنبيه الفوري الحرج، و`role="status"` للحالة غير المقطعة.
- لا تنقل التركيز إلى مؤشر تحميل غير تفاعلي. في modal: `role="dialog"`, `aria-modal="true"`, اسم وصول، حبس تركيز، وإعادته للمشغل عند الإغلاق.
- حافظ على التكيف مع التكبير وتغير العرض والاتجاه، وهدف لمس 44×44px.
- `RECOMMENDED` وفّر رابط تخطي للمحتوى؛ صفحة جدول المحتويات تطلب روابط تخطي لتجاوز TOC.
- `⚠️ NEEDS VERIFICATION` لا ينشر الموقع حدًا رقميًا للتكبير أو سياسة موحدة للحركة تتجاوز طلب تقليلها.

## 9. Content Guidelines

المصدر: [معايير التقييم](https://design.dga.gov.sa/AssessmentCriteria)، القوالب، وصفحات المكونات — آخر تحقق 2026-09-07.

- العربية أولًا، والنص واضح، موجز، مباشر، ومتسق المصطلحات.
- اسم الزر يصف نتيجة الإجراء؛ رابط التنقل يصف الوجهة، ولا تستخدم «اضغط هنا» دون سياق.
- تعليمات النموذج تسبق الحاجة إليها وتذكر متطلبات الحقل؛ رسالة الخطأ تشرح المشكلة وطريقة التصحيح.
- لا تعتمد على اللون أو الأيقونة وحدهما؛ أضف نصًا واضحًا للحالة.
- العناوين تنشئ تسلسلًا هرميًا؛ لا تستخدم نمط heading لمجرد الحجم.
- اذكر فتح نافذة جديدة للرابط الخارجي، واستخدم `rel="noopener noreferrer"`.
- `⚠️ NEEDS VERIFICATION` لا توجد في الصفحات العامة قواعد تفصيلية موحدة للاختصارات أو علامات الترقيم أو كتابة التاريخ والأرقام أو الإنجليزية.

## 10. Navigation

المصدر: [مكونات التنقل](https://design.dga.gov.sa/guidelines) وقوالب الصفحات — آخر تحقق 2026-09-07.

- شريط التنقل العلوي في أعلى كل صفحة ويضم العلامة والروابط والإجراءات.
- القائمة الجانبية تكشف خيارات وأقسامًا فرعية؛ حدّث `aria-expanded` وأدر التركيز عند الفتح/الإغلاق.
- Breadcrumb قائمة روابط داخل `<nav aria-label="Breadcrumb">`؛ الصفحة الحالية `aria-current="page"`. سطح المكتب يعرض المسار ويختصر عند الضيق؛ الجوال يعرض رابط الصفحة السابقة وسهم الرجوع.
- Pagination داخل nav مسمى، الصفحة الحالية `aria-current="page"`، وأسهم السابق/التالي اتجاهية في RTL.
- Tabs تستخدم tablist/tab/tabpanel مع `aria-selected`, `aria-controls`, إدارة `tabindex`، والأسهم داخل المجموعة.
- TOC منطقة navigation ذات اسم، القسم الحالي `aria-current`; كل رابط قابل للتركيز، مع skip link.

## 11. Header

المصدر: [Navigation Header](https://design.dga.gov.sa/guidelines/components/ui-shell/navigation-header)، [Second Navigation Header](https://design.dga.gov.sa/guidelines/components/ui-shell/second-nav-header)، و[Home Template](https://design.dga.gov.sa/guidelines/templates/home-page) — آخر تحقق 2026-09-07.

- حافظ على البنية الأصلية والألوان والخطوط عند تكييف قالب الصفحة.
- العناصر الأساسية: شعار/هوية، روابط رئيسية، بحث، لغة، وإجراءات بحسب احتياج المنصة.
- Tooltip للأزرار الأيقونية، مع اسم وصول مستقل.
- الشعار البديل في مثال القالب: 125×42px عند ضغطه داخل المكون؛ `⚠️ NEEDS VERIFICATION` لا تعمم هذه القيمة خارج ذلك القالب دون فحص مكتبة Figma.
- الشريط الثانوي `OPTIONAL` للمعلومات السياقية مثل التاريخ/الوقت/الموقع/الطقس والإجراءات السريعة، وكل معلومة/أيقونة لها تسمية وصفية.
- `⚠️ NEEDS VERIFICATION` لم ينشر المصدر قاعدة عامة عن sticky header أو تسجيل الدخول أو قائمة المستخدم.

## 12. Footer

المصدر: [Footer](https://design.dga.gov.sa/guidelines/components/ui-shell/footer) والقوالب — آخر تحقق 2026-09-07.

- استخدم landmark `footer` أو `role="contentinfo"`، وعناوين مجموعات وروابط واضحة.
- يدعم: روابط المعلومات والتنقل، بيانات الاتصال، الاجتماعية، الوصول، الشروط، الخصوصية، وحقوق النشر بحسب احتياج المنصة.
- كل الروابط قابلة للوحة المفاتيح مع focus ظاهر، وأيقونات الشبكات لها أسماء وصول.
- يجوز فصل component من Figma للتخصيص فقط مع الحفاظ على بنيته وأسلوبه وألوانه وخطوطه.
- اعرض تاريخ آخر تحديث للصفحة/المنصة حيث يطلب القالب ذلك.

## 13. Components

كل بطاقة أدناه موثقة من صفحتها المباشرة، وآخر تحقق لها **2026-09-07**. في جميع المكونات: استخدم ألوان/مسافات/أنصاف أقطار/ظلال المكتبة بدل قيم محلية؛ اختبر RTL والنطاقات الأربعة؛ ولا تخترع API من الرسومات. لم تعرض الصفحات المرئية أمثلة شفرة مكتملة قابلة للاعتماد؛ التنفيذ البرمجي المرجعي هو حزمة React المنشورة، وAPI التفصيلي `⚠️ NEEDS VERIFICATION` إلى أن ينشر Storybook.

السجل التنفيذي الكامل هو [`uds-components.json`](./uds-components.json): يحتوي **50/50** مكونًا بمعرّف ثابت ومجموعة وغرض وحالات وvariants وأحجام وRTL واستجابة ووصول ولوحة مفاتيح وARIA ومحتوى وtokens وDo/Don't ومثال شفرة وقواعد ومصدر وعنوان صفحة وتاريخ تحقق. أي حقل لم ينشره المصدر العام يحمل حرفيًا `NOT PUBLISHED BY OFFICIAL SOURCE`؛ لا يجوز استبدال هذه العلامة بتخمين يُنسب إلى النظام الرسمي.

### Actions

#### Component 01 — Buttons / الأزرار

- **الغرض/الاستخدام:** فعل واضح؛ high للإجراء الأساسي، medium/low للثانوي. الأنواع: قياسي، destructive للتحذير/غير القابل للعكس، menu، icon، close. تجنب الزر للانتقال أو عدة high متنافسة.
- **Anatomy/variants/states/content:** حاوية، label، leading/trailing icon؛ default, hover, pressed/selected, focus, disabled. النص يصف النتيجة.
- **A11y/keyboard/RTL/responsive:** `<button>`، Enter/Space، تركيز ظاهر، 44×44، و`aria-label` للأيقوني. الأيقونة الاتجاهية تنعكس في RTL؛ يرص الزر مع المحتوى عند الضيق. `⚠️ SOURCE CONFLICT` فقرة الصفحة تذكر alert/status الخاصة بالإشعار؛ لا تطبقها على الزر.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/actions/buttons> · 2026-09-07

#### Component 02 — Floating Button / الزر العائم

- **الغرض/الاستخدام:** إجراء دائري بارز ومتكرر/عالي الأولوية؛ تجنبه إن حجب محتوى أو نافس CTA الأساسي.
- **Anatomy/variants/states:** حاوية، أيقونة، label اختياري؛ default, hover, pressed, focus, disabled.
- **A11y/keyboard/RTL/responsive:** اسم وصول وصفي، Tab ثم Enter/Space، هدف كبير، موضع لا يحجب المحتوى في الجوال؛ لا اتجاه خاص إلا للأيقونات الدلالية.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/actions/floating-Button> · 2026-09-07

#### Component 03 — Dropdown / القائمة المنسدلة

- **الغرض/الاستخدام:** اختيار من قائمة مؤقتة؛ variants outlined، filled light/dark. تجنبها للخيارات القليلة التي تحتاج مقارنة مباشرة.
- **Anatomy/states:** label/title، trigger، list، options؛ collapsed/expanded, hover, focus, selected, disabled, error.
- **A11y/keyboard:** `aria-haspopup="listbox"`, `aria-expanded`, listbox/option و`aria-selected`؛ Tab، الأسهم، Enter/Space، Esc؛ يبدأ التركيز بالمحدد أو الأول. لا خطأ باللون وحده.
- **RTL/responsive:** محاذاة القائمة والتسميات مع RTL وبقائها داخل viewport.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/actions/dropdown> · 2026-09-07

#### Component 04 — Link / الرابط

- **الغرض/الاستخدام:** الانتقال إلى صفحة/موضع/مورد؛ تجنب استخدامه لفعل محلي.
- **Anatomy/variants/states:** نص وصفي وأيقونة اختيارية؛ default, hover, pressed, focus, visited, disabled؛ underline افتراضي.
- **A11y/keyboard:** `<a href>`، Enter، contrast ‏4.5:1، focus ظاهر. عند فتح نافذة جديدة أخبر المستخدم واستخدم `noopener noreferrer`.
- **RTL/responsive:** اعكس سهم الاتجاه عند تغير المعنى، ولا تقطع النص أو تقلل الهدف.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/actions/link> · 2026-09-07

#### Component 05 — Chip / الشريحة

- **الغرض/الاستخدام:** تصنيف/مرشح/اختيار أو إجراء صغير؛ تجنب الإفراط أو النص الطويل.
- **Anatomy/variants/states:** حاوية، نص، leading/trailing icon؛ default, hover, pressed, selected, focus, disabled/removable.
- **A11y/keyboard:** الشريحة القابلة للحذف تعامل كزر باسم يذكر العنصر، Tab وEnter/Space، focus ظاهر؛ لا تعتمد على اللون.
- **RTL/responsive:** ترتيب النص وأيقونة الحذف RTL، والتفاف المجموعة دون قص.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/actions/chip> · 2026-09-07

### Content display

#### Component 06 — Accordion / الأكورديون

- **الغرض/الاستخدام:** كشف/طي أقسام محتوى مرتبطة؛ تجنبه لإخفاء إجراء أو معلومة حرجة يجب رؤيتها فورًا.
- **Anatomy/variants/states:** header trigger، title، expand icon، panel؛ collapsed/expanded, hover, focus, disabled إن وجد.
- **A11y/keyboard:** trigger زر، `aria-expanded` وعلاقة باللوحة، Enter/Space، Tab، focus ظاهر؛ أبق ترتيب headings منطقيًا.
- **RTL/responsive:** مؤشر الفتح في الطرف المنطقي، المحتوى يعيد التدفق.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/accordion> · 2026-09-07

#### Component 07 — Card / البطاقة

- **الغرض/الاستخدام:** تجميع محتوى/إجراء ذي صلة؛ display-only بلا CTA، والقابلة للفعل لها رابط/CTA واضح. تجنب جعل كامل البطاقة div غير دلالي.
- **Anatomy/variants/states:** container، image/featured icon، title، description، avatar، tags، rating، actions؛ حالات التفاعلية بحسب link/button.
- **A11y/RTL/responsive:** heading وترتيب قراءة، alt للصورة، رابط/زر حقيقي، focus ظاهر؛ stack على الجوال. `⚠️ SOURCE CONFLICT` فقرة الوصول الرسمية منسوخة من Accordion؛ لا تعتمد تفاصيلها الخاصة بالأكورديون.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/card> · 2026-09-07

#### Component 08 — Carousel / العرض الدوار

- **الغرض/الاستخدام:** سلسلة عناصر في مساحة واحدة؛ تجنب autoplay غير قابل للتحكم أو إخفاء محتوى أساسي.
- **Anatomy/variants/states:** viewport/items، السابق/التالي، dots، current؛ manual/auto إن استُخدم.
- **A11y/keyboard:** listbox/options أو بنية مكافئة موثقة، `aria-roledescription`، إعلان تغير الشريحة، أزرار مسماة؛ لا تفقد التركيز. وفّر تحكمًا في الحركة.
- **RTL/responsive:** السابق/التالي يتبعان الاتجاه، وعدد العناصر المرئية يتكيف دون قص.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/carousel> · 2026-09-07

#### Component 09 — List / القائمة

- **الغرض/الاستخدام:** عناصر مرتبة أو غير مرتبة؛ استخدم `ol` للتسلسل و`ul` للتجميع، وتجنب divs غير دلالية.
- **Anatomy/variants/states:** container و`li`، رقم/marker، نص وروابط/إجراءات اختيارية؛ حالات الروابط/الأزرار فقط.
- **A11y/keyboard/RTL/responsive:** semantics أصلية، `aria-current="page"` داخل nav، Tab للعناصر التفاعلية، مسافات لمس؛ marker والمحاذاة RTL.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/list> · 2026-09-07

#### Component 10 — Code Snippet / مقتطف الشفرة

- **الغرض/الاستخدام:** عرض/نسخ شفرة؛ تجنب صور الشفرة.
- **Anatomy/variants/states:** code area، language tabs، copy، line numbers، show-more؛ copy success/error.
- **A11y/keyboard:** label واضح، keyboard لكل إجراء، `aria-live="polite"` لنجاح النسخ، الحفاظ على formatting، إخفاء line numbers إن كانت زخرفية.
- **RTL/responsive:** كتلة الشفرة LTR داخل صفحة RTL مع scrolling أفقي مضبوط؛ الأزرار تبقى مرئية.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/code-snippet> · 2026-09-07

#### Component 11 — Quote / الاقتباس

- **الغرض/الاستخدام:** اقتباس منسوب بوضوح؛ تجنب استخدامه كزخرفة لنص عادي.
- **Anatomy/variants:** quote/title، text، author/name/title/image، علامات اقتباس.
- **A11y/RTL/responsive:** `<blockquote>` أصلي، ربط المؤلف، quote marks الزخرفية `aria-hidden`; `dir="rtl"` للعربي، وإعادة تدفق الصورة/النص.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/quote> · 2026-09-07

#### Component 12 — Divider / الفاصل

- **الغرض/الاستخدام:** فصل بصري/بنيوي؛ تجنب الإفراط أو استخدامه بدل hierarchy/spacing.
- **Anatomy/variants:** خط/مساحة فصل؛ أفقي/حسب المكتبة؛ لا حالات تفاعلية.
- **A11y/RTL/responsive:** `role="separator"` عندما يحمل معنى بنيويًا، وإخفاؤه إن كان زخرفيًا؛ contrast كافٍ؛ يمكن إزالته responsive إن بقيت البنية واضحة.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/divider> · 2026-09-07

#### Component 13 — Digital Stamp / الختم الرقمي

- **الغرض/الاستخدام:** إثبات أصالة/ثقة المنصة الرسمية؛ لا تستخدمه ادعاءً بلا نطاق معترف وHTTPS وتسجيل/ترخيص.
- **Anatomy/states:** stamp/status، نطاق/تفاصيل، أيقونات، رابط «كيف تتحقق»؛ verified/information.
- **A11y/keyboard/RTL:** `role="status"`، أسماء للأيقونات أو إخفاؤها، الرابط بلوحة المفاتيح، النص/النطاق يعيدان التدفق.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/content-display/digital-stamp> · 2026-09-07

### Data display

#### Component 14 — Avatar / الصورة الرمزية

- **الغرض/الاستخدام:** تمثيل شخص/كيان بصريًا؛ initials/photo/icon، دائري افتراضي أو مستطيل.
- **Sizes:** 24/32 صغيرة؛ 40/48 متوسطة؛ 64/80/120 كبيرة.
- **A11y/RTL/responsive:** alt باسم/غرض إذا كانت ذات معنى، و`alt=""` إن كانت زخرفية؛ لا معنى اتجاهيًا، واختر الحجم بحسب كثافة الشاشة.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/data-display/avatar> · 2026-09-07

#### Component 15 — Metric / المؤشر الرقمي

- **الغرض/الاستخدام:** قيمة KPI واتجاهها/سياقها؛ تجنب رقمًا بلا label أو وحدة/فترة.
- **Anatomy/variants/states:** label، value، trend، chart، settings، CTA؛ loading/updated/error بحسب البيانات.
- **A11y/keyboard/RTL:** `aria-live="polite"` للقيمة الديناميكية عند الملاءمة، label واضح، الأيقونات مسماة/مخفية، إجراءات keyboard؛ ترتيب الرقم/الاتجاه قابل للقراءة RTL.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/data-display/metric> · 2026-09-07

#### Component 16 — Table / الجدول

- **الغرض/الاستخدام:** بيانات صفوف/أعمدة تحتاج المقارنة؛ تجنب الجداول للتخطيط أو بيانات لا تستفيد من المحاور.
- **Anatomy/states:** table، caption، column/row headers، body، cells، optional selection/actions/sort؛ hover/focus/selected/loading/empty/error بحسب الوظيفة.
- **A11y/keyboard/RTL/responsive:** HTML table و`th/scope`؛ keyboard للتفاعلات؛ ARIA فقط إن لم تكفِ الدلالة الأصلية. محاذاة/ترتيب RTL، وoverflow متاح لا قص؛ نمط التحويل `⚠️ NEEDS VERIFICATION`.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/data-display/table> · 2026-09-07

#### Component 17 — Content Switcher / مبدّل المحتوى

- **الغرض/الاستخدام:** تبديل 2–4 مشاهد مرتبطة؛ عند أكثر من 4 استخدم Tabs.
- **Anatomy/states:** option list، selected indicator، panels؛ default/hover/focus/selected/disabled.
- **A11y/keyboard:** tablist/tab/tabpanel، `aria-controls`, `aria-selected`, hidden/`aria-hidden`؛ Tab إلى المجموعة والأسهم داخلها.
- **RTL/responsive:** اتجاه الأسهم/الترتيب RTL، والتفاف/تحول دون قص.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/data-display/content-switcher> · 2026-09-07

#### Component 18 — Charts / الرسوم البيانية

- **الغرض/الاستخدام:** pie/line/bar لعرض علاقات البيانات؛ تجنب الرسم إذا كان النص/القيمة أوضح.
- **Anatomy/variants/states:** title، axes/labels، plot، legend، data points؛ hover/focus/selected/loading/error بحسب التفاعل.
- **A11y/keyboard/RTL:** summary/alt؛ `role="img"` للثابت؛ عناوين المحاور والنقاط؛ keyboard للنقاط؛ لا لون وحده؛ responsive. جدول بيانات بديل `INFERRED` كأفضل ممارسة تكميلية.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/data-display/charts> · 2026-09-07

#### Component 19 — Structured List / القائمة المنظمة

- **الغرض/الاستخدام:** بيانات منظمة غير معقدة؛ rows/columns/dividers/container، مع checkbox اختيار اختياري. تجنبها حين يحتاج المستخدم علاقات جدول كاملة.
- **Anatomy/states:** header/rows/cells/selection؛ default/selected/focus إن تفاعلت.
- **A11y/keyboard/RTL:** list/listitem أو table/row/columnheader/rowheader بحسب البنية؛ keyboard للاختيار؛ ترتيب الأعمدة والمحاذاة RTL وإعادة التدفق.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/data-display/structured-list> · 2026-09-07

### Feedback

#### Component 20 — Notification / الإشعار

- **الغرض/الاستخدام:** inline أو toast، قابل للإجراء أو معلوماتي؛ info/success/warning/error/neutral، بخلفية/بلا خلفية. تجنب modal لرسالة غير معيقة.
- **Anatomy/states:** icon، title/message، action، dismiss؛ visible/dismissed/persistent.
- **A11y/keyboard:** `role="alert"` للحرج الفوري، وstatus/`aria-live="polite"` لغير الحرج؛ وقت قراءة كافٍ، والحرج الدائم لا يختفي تلقائيًا؛ actions keyboard.
- **RTL/responsive:** النص/الأيقونة/actions RTL، وعرض لا يحجب المحتوى.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/feedback/notification> · 2026-09-07

#### Component 21 — Modal / النافذة النمطية

- **الغرض/الاستخدام:** قرار/مهمة مركزة تحجب الخلفية؛ تجنبها لمعلومات يمكن عرضها inline.
- **Anatomy/states:** overlay، dialog container، title/description، content، actions، close؛ open/closing/error/loading.
- **A11y/keyboard:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; انقل التركيز لأول عنصر مناسب، احبسه، أخفِ الخلفية عن AT، Esc للإغلاق حيث آمن، وأعد التركيز للمشغل.
- **RTL/responsive:** actions وترتيب النص RTL؛ في الجوال ضمن viewport وقابل للتمرير داخليًا.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/feedback/modal> · 2026-09-07

#### Component 22 — Tooltip / التلميح

- **الغرض/الاستخدام:** شرح موجز عند hover/focus؛ top/bottom/left/right، light/dark. تجنب معلومات أساسية لا يمكن الوصول إليها بدونه.
- **Anatomy/states:** trigger، bubble، arrow؛ hidden/visible.
- **A11y/keyboard:** `role="tooltip"` وربط المشغل بـ`aria-describedby` (الصفحة تذكر صيغة قريبة غير دقيقة)؛ يظهر focus ويختفي blur/Esc؛ لا ينقل التركيز إن لم يكن تفاعليًا.
- **RTL/responsive:** موضع داخل viewport واتجاه النص RTL.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/feedback/tooltip> · 2026-09-07

#### Component 23 — Rating / التقييم

- **الغرض/الاستخدام:** اختيار درجة نجوم؛ small/medium/large، full/half حيث تعرض القراءة. تجنب الاعتماد على شكل النجمة بلا تسمية رقمية.
- **States:** default, pressed, selected, half؛ disabled/read-only عند العرض.
- **A11y/keyboard:** radiogroup/radio، `aria-checked` وتسميات رقمية، الأسهم تغير الاختيار، Tab يدخل/يخرج، optional live confirmation.
- **RTL/responsive:** ترتيب المجموعة واضح في RTL والهدف مناسب للمس.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/feedback/rating> · 2026-09-07

### Forms and inputs

#### Component 24 — Checkbox / مربع الاختيار

- **الغرض/الاستخدام:** اختيار ثنائي أو صفر/عدة من مجموعة؛ تجنبها لواحد فقط من خيارات متنافية.
- **Anatomy/states:** native input، label، help، alert؛ checked/unchecked/indeterminate إن توفر، focus, disabled, error.
- **A11y/keyboard:** input/label أصليان؛ `aria-label/labelledby` فقط عند تعذر الارتباط؛ Tab وSpace؛ قارئ الشاشة يعلن الحالة.
- **RTL/responsive:** المربع والتسمية بترتيب RTL، ومسافة/هدف لمس كافيان.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/checkbox> · 2026-09-07

#### Component 25 — Datepicker / محدد التاريخ

- **الغرض/الاستخدام:** إدخال/اختيار تاريخ؛ single-month أو dual-month. تجنب التقويم إذا كان الإدخال النصي المباشر أبسط دون توفيره.
- **Anatomy/states:** month/year، input، container، today، selected date، nav buttons، actions؛ open/closed/selected/focus/disabled/error.
- **A11y/keyboard:** popup dialog، اسم/وصف، كل controls مسماة؛ focus للتاريخ المختار/اليوم؛ arrows، Enter، Esc؛ تنقل أشهر/سنوات keyboard؛ announce month/year. الصفحة تقترح `role="application"` للشبكة؛ اختبره بعناية ولا تستخدمه دون تنفيذ لوحة المفاتيح الكامل.
- **RTL/responsive:** اتجاه السابق/التالي RTL؛ dual يتحول إلى single عند الضيق (`INFERRED` من قابلية التكيف؛ التوقيت الدقيق `⚠️ NEEDS VERIFICATION`).
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/datepicker> · 2026-09-07

#### Component 26 — Input / حقل الإدخال

- **الغرض/الاستخدام:** نص/رقم/بيانات أحادية السطر؛ standard، with icon، prefix/suffix، read-only؛ filled default/light/dark؛ help/error.
- **Anatomy/states:** label، editable area، icon/feedback icon، help، prefix/suffix؛ default/hover/focus/filled/read-only/disabled/error/success.
- **A11y/keyboard:** type HTML الصحيح، label مرتبط، `aria-describedby` للمساعدة/الخطأ، `aria-invalid`; Tab/Shift+Tab. المصدر يحتوي أخطاء تسمية `aria-describe/aria-description`؛ الاسم القياسي الصحيح `aria-describedby`.
- **RTL/responsive:** label/input RTL؛ prefix للهاتف/العملة يعالج اتجاه قيمته دون كسر ترتيب القراءة.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/input> · 2026-09-07

#### Component 27 — File Uploader / رافع الملفات

- **الغرض/الاستخدام:** ملف واحد أو متعدد، drag/drop أو browse، معاينة/حالة/حذف/تأكيد. تجنب منطقة إسقاط غير قابلة للوحة المفاتيح.
- **Anatomy/states:** dropzone، title/help وأنواع مقبولة، browse، featured/status icon، filename، file help، delete؛ default, drag-hover, uploading, success, error, disabled.
- **A11y/keyboard:** input file أصلي محسن، Tab/Shift+Tab، Enter/Space يفتح الحوار، اسم وصول لمنطقة الرفع؛ أعلن التقدم/النتيجة.
- **RTL/responsive:** قائمة الملفات والأفعال RTL، واسم الملف لا يحجب الحذف/الحالة.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/file-uploader> · 2026-09-07

#### Component 28 — Radio / زر الاختيار

- **الغرض/الاستخدام:** اختيار واحد من مجموعة؛ تجنب خيارًا ثنائيًا فوريًا أو اختيارات متعددة.
- **Anatomy/states:** radio، label، help، alert؛ checked/unchecked/focus/disabled/error.
- **A11y/keyboard:** `fieldset/legend` وlabels، نفس `name` للمجموعة؛ focus/selection بلوحة المفاتيح. لا تستخدم `aria-label` بدل label المرئي إلا لضرورة.
- **RTL/responsive:** ترتيب وتباعد RTL، ومجموعة قابلة للالتفاف.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/radio> · 2026-09-07

#### Component 29 — Slider / شريط التمرير

- **الغرض/الاستخدام:** قيمة أو range بمقبض/مقبضين؛ تجنب قيمًا تحتاج إدخالًا دقيقًا بلا عرض القيمة/بديل.
- **Anatomy/states:** label/help، track، thumb(s)، current value، min/max؛ default/hover/focus/drag/disabled/error.
- **A11y/keyboard:** `role="slider"`, `aria-valuemin/max/now`, اسم؛ Tab، arrows، Home/End، Page Up/Down؛ focus واضح.
- **RTL/responsive:** زيادة/نقص القيمة واتجاه المسار يجب أن يكونا مفهومين في RTL؛ `⚠️ NEEDS VERIFICATION` لسلوك انعكاس القيمة الدقيق.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/slider> · 2026-09-07

#### Component 30 — Steps / الخطوات

- **الغرض/الاستخدام:** إظهار تقدم عملية متعددة الخطوات؛ أفقي (ينعكس RTL) أو عمودي.
- **Anatomy/states:** base/number، name، description، connector، first/middle/final؛ completed/current/upcoming، default/hover/focus.
- **A11y/keyboard:** `<ol aria-label="Progress">`, `aria-current="step"`; إن كانت قابلة للنقر استخدم button/link، Enter/Space، ونصًا مخفيًا للحالة.
- **Responsive:** في نموذج القالب استخدم radial stepper للجوال.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/steps> · 2026-09-07

#### Component 31 — Switch / زر التبديل

- **الغرض/الاستخدام:** on/off فوري؛ off افتراضي. تجنب استخدامه لاختيار يحتاج زر حفظ/إرسال دون توضيح.
- **Anatomy/states:** control، label، help، alert؛ on/off/focus/disabled/error.
- **A11y/keyboard:** `role="switch"`, `aria-checked`, label/`aria-label`; Tab وSpace؛ حدّث ARIA والنص فورًا مع الحالة.
- **RTL/responsive:** label/control RTL وهدف 44×44؛ لا تعتمد على موضع المقبض وحده.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/switch> · 2026-09-07

#### Component 32 — Textarea / منطقة النص

- **الغرض/الاستخدام:** نص متعدد الأسطر؛ standard scroll+resize، no-scroll resizable، non-resizable؛ filled default/light/dark. تجنبها لإجابة قصيرة.
- **Anatomy/states:** label، editable area، help/error، optional resize/scroll؛ default/focus/filled/read-only/disabled/error/success.
- **A11y/keyboard:** label، `aria-describedby`، focus من Tab، scrolling/resize متاحان عند variant؛ لا تستخدم placeholder بدل label.
- **RTL/responsive:** الكتابة والمحاذاة RTL؛ العرض 100% ضمن حاوية الجوال.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/textarea> · 2026-09-07

#### Component 33 — Number Input / مدخل الأرقام

- **الغرض/الاستخدام:** قيمة رقمية يدوية أو عبر +/−؛ تجنب النص العام أو نطاقًا مستمرًا أنسب له Slider.
- **Anatomy/states:** label، input، increment/decrement، placeholder، help؛ default/focus/invalid/out-of-range/disabled.
- **A11y/keyboard:** `role="spinbutton"` إن لم يكن native مناسبًا، `aria-valuemin/max/now`, label؛ إدخال يدوي وEnter عند الحاجة؛ `aria-invalid` وخطأ واضح.
- **RTL/responsive:** حافظ على تسلسل العدد/الأزرار المفهوم وهدف لمس كافٍ.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/forms-and-inputs/number-input> · 2026-09-07

### Loading and status

#### Component 34 — Loading / جاري التحميل

- **الغرض/الاستخدام:** عملية غير محددة المدة؛ تجنب استخدامه عندما تتوفر نسبة تقدم معروفة.
- **Anatomy/state:** circular indicator، optional message؛ active/completed/error عبر مكونات feedback.
- **A11y:** `role="status"` عادة، `alert` فقط إن كانت عاجلة؛ نص «جاري التحميل»، `aria-live`; لا focus تلقائي ولا tab stop؛ مدة/إلغاء للعملية الطويلة إن أمكن؛ تقليل الحركة.
- **RTL/responsive:** لا اتجاه خاص؛ لا يحجب المحتوى أو يصغر.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/loading-and-status/loading> · 2026-09-07

#### Component 35 — Progress Bar / شريط التقدم

- **الغرض/الاستخدام:** تقدم معروف لمهمة/رفع/إرسال؛ تجنب قيمة وهمية.
- **Anatomy/states:** container، fill، label، percentage، help، success/error label+icon؛ in-progress/success/error.
- **A11y:** `role="progressbar"`, `aria-valuemin/max/now`, label/labelledby، live للتحديث المناسب، contrast؛ responsive.
- **RTL:** اتجاه الامتلاء يجب أن يتسق مع RTL ومعنى التقدم؛ التفاصيل الدقيقة `⚠️ NEEDS VERIFICATION`.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/loading-and-status/progress-bar> · 2026-09-07

#### Component 36 — Radial Stepper / شريط التقدم الدائري

- **الغرض/الاستخدام:** تقدم عملية متعددة الخطوات، خصوصًا الجوال.
- **Anatomy/states:** ring، current/total، title، description، next/previous labels؛ current/completed/error بحسب العملية.
- **A11y/keyboard:** `role="progressbar"`, min/max/now، labelledby/describedby؛ الخطوات التفاعلية Tab وEnter/Space.
- **RTL/responsive:** النص المجاور RTL؛ ملائم لمساحة الجوال وفق Form Template.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/loading-and-status/radial-stepper> · 2026-09-07

#### Component 37 — Skeleton / الهيكل المؤقت

- **الغرض/الاستخدام:** placeholder يشبه layout أثناء جلب المحتوى؛ square/rectangle/line/circle + shimmer. تجنب بقائه بعد التحميل.
- **States:** loading ثم removed/replaced؛ لا تفاعل.
- **A11y:** container status/alert بحسب الإلحاح، عادة `aria-live="polite"`، وصف «المحتوى قيد التحميل»؛ بعد الاكتمال أزل skeleton من accessibility tree؛ قلّل shimmer مع reduced motion.
- **RTL/responsive:** الشكل يحاكي layout الفعلي في كل breakpoint.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/loading-and-status/skeleton> · 2026-09-07

### Navigational

#### Component 38 — Breadcrumbs / مسار التصفح

- **الغرض/الاستخدام:** إظهار الموضع الهرمي والعودة للأعلى؛ تجنب صفحة بلا hierarchy أو تكرار main nav.
- **Anatomy/variants:** root، separators، middle/overflow، current؛ full/abbreviated/back-only mobile.
- **A11y/keyboard:** nav + list، `aria-label="Breadcrumb"`, current `aria-current="page"`; الروابط Tab/Enter.
- **RTL/responsive:** large حتى 5XL كامل ثم اختصار؛ medium مختصر؛ small/XS السابق+سهم، مع انعكاس السهم.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/navigational/breadcrumbs> · 2026-09-07

#### Component 39 — Menu / القائمة

- **الغرض/الاستخدام:** خيارات على سطح مؤقت يفتحه trigger؛ يمكن تجميع العناصر بعناوين وفواصل. تجنب menu semantics لقائمة روابط عادية إن لم يكن سلوك تطبيق.
- **Anatomy/states:** group title، item، leading icon، trailing control/tag، divider، container؛ closed/open/hover/focus/selected/disabled.
- **A11y/keyboard:** الصفحة العامة لا تعرض تفاصيل كافية: `⚠️ NEEDS VERIFICATION` لنمط role/arrow/escape؛ يجب أن تبقى العناصر قابلة للوحة المفاتيح والتركيز ظاهرًا.
- **RTL/responsive:** placement داخل viewport وتسلسل RTL.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/navigational/menu> · 2026-09-07

#### Component 40 — Pagination / ترقيم الصفحات

- **الغرض/الاستخدام:** تقسيم مجموعة كبيرة إلى صفحات؛ تجنبها لمجموعة قصيرة.
- **Anatomy/states:** previous، page items، active، next؛ default/hover/focus/current/disabled.
- **A11y/keyboard:** `<nav aria-label="Pagination">`, `aria-current="page"`, Tab؛ arrows إضافية اختياريًا للمجموعات الكبيرة.
- **RTL/responsive:** السابق/التالي واتجاه الأيقونات RTL، واختصار الأرقام في الضيق دون إخفاء الحالية.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/navigational/pagination> · 2026-09-07

#### Component 41 — Tabs / علامات التبويب

- **الغرض/الاستخدام:** معلومات مترابطة دون صفحات منفصلة؛ أفقي/عمودي؛ تجنبها لتسلسل خطوات.
- **Anatomy/states:** container، title/icon، selected indicator، first/second، more، divider؛ default/hover/pressed/focus/disabled/selected.
- **A11y/keyboard:** tablist/tab/tabpanel، selected/controls/labelledby وroving tabindex؛ الأسهم داخل القائمة، focus واضح وتباين للحالية.
- **RTL/responsive:** ترتيب/أسهم RTL؛ overflow يتحول إلى «المزيد» بحسب المكون.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/navigational/tabs> · 2026-09-07

#### Component 42 — Slide-out / القائمة الجانبية المنسدلة

- **الغرض/الاستخدام:** لوحة جانبية لمحتوى/خيارات إضافية دون تشويش؛ تجنب حجب دائم أو إغلاق غير متاح.
- **Anatomy/states:** top title/description، grouped sections، dividers، scrollbar، frame، actions/close؛ closed/open/focus.
- **A11y/keyboard:** page تقترح menu/menuitem، أسماء للأيقونات/الإغلاق؛ كل عنصر keyboard وfocus ظاهر. `⚠️ NEEDS VERIFICATION` لحبس/إعادة التركيز لأنه غير موثق صراحة هنا.
- **RTL/responsive:** يخرج من الجانب المنطقي المناسب ولا يتجاوز viewport.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/navigational/slide-out> · 2026-09-07

### Search and filters

#### Component 43 — Search Box / حقل البحث

- **الغرض/الاستخدام:** إدخال query والعثور على نتائج؛ يمكن clear/voice. تجنب placeholder فقط أو أيقونة بلا اسم.
- **Anatomy/states:** input، placeholder، search icon، clear، voice؛ default/hover/pressed/focus/read-only/disabled.
- **A11y/keyboard:** منطقة `role="search"`، label/labelledby، Tab، Enter للإرسال، Esc للمسح، focus ظاهر؛ placeholder مساعد لا label.
- **RTL/responsive:** النص/الأيقونات RTL مع اتجاه قيمة مناسب؛ العرض يتكيف.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/search-and-filters/search-box> · 2026-09-07

#### Component 44 — Tags / العلامات

- **الغرض/الاستخدام:** معلومة/حالة موجزة بجوار المحتوى؛ standard actions أو status، styles selected/neutral/inverse/subtle/transparent. تجنب نصًا طويلًا أو حالات غير مرتبطة في مجموعة واحدة.
- **Anatomy/states:** container، text، leading/trailing icon؛ status container/text/indicator؛ default/focus/active/removable.
- **A11y/keyboard:** الدور/الحالة/الفعل معلنة؛ interactive tag زر باسم، Enter/Space، focus واضح، contrast؛ announce removal `aria-live`.
- **RTL/responsive:** tags المطبقة تتدفق RTL وتلتف.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/search-and-filters/tags> · 2026-09-07

#### Component 45 — Filtration / التصفية

- **الغرض/الاستخدام:** تضييق النتائج بالفئات/السمات؛ تجنب خيارات كثيرة مكشوفة بلا بحث/تجميع.
- **Anatomy/states:** trigger+active count، panel، applied removable filters، multi-checkbox search، 5–10 خيارات أولية مع show more، reset؛ closed/open/applied/loading/results-updated.
- **A11y/keyboard:** listbox/menu حسب البنية، option/checkbox/radio، `aria-expanded`, live polite للنتائج، labels؛ keyboard كامل.
- **RTL/responsive:** applied chips RTL؛ في الجوال panel/slide-out مناسب دون حجب controls.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/search-and-filters/filtration> · 2026-09-07

### UI shell

#### Component 46 — Navigation Header / شريط التنقل العلوي

- **الغرض/الاستخدام:** هوية وروابط وإجراءات أساسية في أعلى كل صفحة.
- **Anatomy/states:** brand logo، nav links، actions، optional icon/help/badge؛ default/hover/pressed/focus/active/disabled.
- **A11y/keyboard:** header/nav landmarks، اسم للـnav، current state، روابط/أزرار دلالية وkeyboard، focus واضح، icon labels.
- **RTL/responsive:** ترتيب RTL؛ يتحول إلى drawer/menu عند الضيق؛ التحول التفصيلي `⚠️ NEEDS VERIFICATION` في API.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/ui-shell/navigation-header> · 2026-09-07

#### Component 47 — Navigation Drawer / قائمة التنقل الجانبية

- **الغرض/الاستخدام:** لوحة خيارات وروابط وأقسام فرعية من جانب الشاشة.
- **Anatomy/states:** items، submenus، expand/collapse arrows؛ closed/open/current/hover/focus/expanded/disabled.
- **A11y/keyboard:** navigation landmark، `aria-expanded`; Tab/Enter/Arrow؛ عند التوسيع focus لأول عنصر فرعي، وعند الإغلاق يعود للأصل؛ focus ظاهر.
- **RTL/responsive:** يظهر من الجانب المنطقي ويتبع RTL؛ شائع لتحول mobile nav.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/ui-shell/navigation-drawer> · 2026-09-07

#### Component 48 — Table of Content / جدول المحتويات

- **الغرض/الاستخدام:** مخطط قابل للتنقل لمحتوى طويل؛ تجنب صفحة قصيرة لا تستفيد منه.
- **Anatomy/states:** title، current indicator، hierarchy markers، section/nested links؛ default/hover/pressed/focus/current.
- **A11y/keyboard:** navigation + label، `aria-current="page"` أو للقسم النشط، Tab وfocus، skip link لتجاوز TOC، contrast.
- **RTL/responsive:** indentation من الجهة المنطقية؛ في الضيق قابل للطي/النقل `⚠️ NEEDS VERIFICATION` للتفصيل.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/ui-shell/table-of-content> · 2026-09-07

#### Component 49 — Second Navigation Header / شريط التنقل الثانوي

- **الغرض/الاستخدام:** معلومات سياقية/إجراءات إضافية فوق الرئيسي؛ optional.
- **Anatomy/states:** weather/status، date، time، location، quick actions؛ default/focus/updated.
- **A11y/keyboard:** اسم للمنطقة، labels وصفية للقيم، Tab وEnter/Space للإجراءات؛ meaningful icons مسماة، decorative hidden.
- **RTL/responsive:** ترتيب RTL؛ أخفِ/اختصر الأقل أهمية فقط مع بقاء الوصول إليه.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/ui-shell/second-nav-header> · 2026-09-07

#### Component 50 — Footer / التذييل

- **الغرض/الاستخدام:** روابط مهمة، تنقل، اتصال، اجتماعية، اشتراك، وصول، قانوني.
- **Anatomy/states:** group labels، links، social icons، accessibility tools، legal/copyright؛ link states وform states إن وجد اشتراك.
- **A11y/keyboard:** `footer`/contentinfo، headings للمجموعات، links واضحة وTab/focus، أسماء للأيقونات؛ form labels/errors.
- **RTL/responsive:** مجموعات RTL وتتحول إلى stack/accordion بحسب المكتبة؛ لا تغير الألوان والخطوط عند detach.
- **Source / Last verified:** <https://design.dga.gov.sa/guidelines/components/ui-shell/footer> · 2026-09-07

## 14. Forms

المصدر: [Form Page](https://design.dga.gov.sa/guidelines/templates/form-page) و[Forms and Inputs](https://design.dga.gov.sa/guidelines) — آخر تحقق 2026-09-07.

1. استخدم label ظاهرًا مرتبطًا بـ`for/id`، و`fieldset/legend` للمجموعات.
2. اذكر المطلوب/الاختياري والمتطلبات قبل الإرسال؛ لا تستخدم placeholder كتسمية.
3. استخدم نوع input الصحيح لاستدعاء لوحة المفاتيح والتحقق المناسبين.
4. اربط المساعدة والخطأ بـ`aria-describedby`؛ اجعل الحقل غير الصالح `aria-invalid="true"`.
5. اجعل رسالة الخطأ محددة وقابلة للتصحيح ولا تعتمد على الأحمر وحده.
6. للنموذج متعدد الخطوات: stepper مرقم وعنوان/تعليمات موجزة على الشاشات الكبيرة؛ radial stepper يوضح الحالية والسابقة والتالية على الجوال.
7. عند الإرسال، وفّر تحميلًا ثم نجاحًا/خطأ واضحًا؛ لا تفقد إدخال المستخدم بلا إنذار.
8. تحقق باللمس ولوحة المفاتيح والجوال، وأبقِ CTA ضمن التسلسل المنطقي.

## 15. Patterns

| النمط | التركيب الرسمي القريب | قاعدة التنفيذ | المصدر |
|---|---|---|---|
| البحث | Search box + نتائج + filters + chips + sort + pagination | تحديث ذو صلة؛ زر مسح عند وجود نص؛ Enter للإرسال وEsc للمسح | [Search template](https://design.dga.gov.sa/guidelines/templates/search-page) |
| التصفية | زر/لوحة Filters + checkboxes/radio + applied chips + reset | اعرض العدد والحالة؛ حدّث النتائج وأعلنها `aria-live` | [Filtration](https://design.dga.gov.sa/guidelines/components/search-and-filters/filtration) |
| نموذج متعدد الخطوات | Form + Steps/ radial stepper + validation + actions | خطوات واضحة؛ الحالية `aria-current="step"`; mobile radial | [Form template](https://design.dga.gov.sa/guidelines/templates/form-page) |
| تأكيد/ملاحظات | Notification/Modal + explicit action | اشرح النتيجة وأعد التركيز بعد modal | [Feedback section](https://design.dga.gov.sa/guidelines/templates/feedback-section) |
| أخطاء الصفحة | رسالة واضحة + إجراء خروج/عودة | لا تترك صفحة فارغة أو رمز خطأ بلا شرح | [404 template](https://design.dga.gov.sa/guidelines/templates/page-not-found) |
| أسئلة شائعة | Search + categories + accordion + optional rating | البحث/التصنيف مفضّلان إذا تجاوزت 20؛ pagination اختياري بعد 10 | [FAQ template](https://design.dga.gov.sa/guidelines/templates/faqs-page) |
| صفحة خدمة | Header + service summary/content + actions + feedback + footer | استخدم المكونات الرسمية والتسلسل الملائم للخدمة | [Service template](https://design.dga.gov.sa/guidelines/templates/service-page) |
| قوائم/تفاصيل | List/Structured list/Table/Card + pagination | اختر semantic structure حسب نوع البيانات والتفاعل | [Components](https://design.dga.gov.sa/guidelines) |
| Dashboard | Metric + Charts + Table/Structured list + filters | `INFERRED` تركيب من المكونات؛ لا يوجد Dashboard Template رسمي عام | [Data display](https://design.dga.gov.sa/guidelines) |
| Authentication | `⚠️ NEEDS VERIFICATION` | لا يوجد قالب Login/Authentication عام في الموقع الذي جرى زحفه | [Templates](https://design.dga.gov.sa/guidelines/templates) |
| Empty state | `⚠️ NEEDS VERIFICATION` | لا توجد صفحة مكون مستقلة منشورة؛ لا تخترع API أو شكلًا رسميًا | [Components](https://design.dga.gov.sa/guidelines) |

## 16. Templates

المصدر: [Templates](https://design.dga.gov.sa/guidelines/templates) — آخر تحقق 2026-09-07.

السجل التنفيذي الكامل هو [`uds-templates.json`](./uds-templates.json): يحتوي **19/19** قالبًا بمعرّفات مستقرة، حالات الاستخدام، الأقسام المنشورة، التسلسل الهرمي، المكونات، layout/header/navigation/hero/main/CTA/footer، الاستجابة، RTL، الوصول، المحتوى، القواعد والمصادر. يستخدم السجل العلامة الحرفية `NOT PUBLISHED BY OFFICIAL SOURCE` عندما لا يحدد المصدر العام ما إذا كان القسم أو المكون مطلوبًا أو اختياريًا.

| القالب | البنية/المكونات الأساسية | قواعد بارزة | المصدر |
|---|---|---|---|
| الحج | Header، hero، أقسام، Footer، Ihsan floating | بدائل خلفية/لون/صورة؛ الخط السعودي للمناسبة | [Hajj](https://design.dga.gov.sa/guidelines/templates/hajj-template) |
| يوم التأسيس | Hero تاريخي، صور/حركة، محتوى، Footer، Ihsan | هوية المناسبة مع الحفاظ على الوصول | [Founding Day](https://design.dga.gov.sa/guidelines/templates/founding-day) |
| اليوم الوطني | قادة/رسوم/صور/حركة، hero، Footer | تذييل أخضر داكن أو افتراضي بحسب البديل | [National Day](https://design.dga.gov.sa/guidelines/templates/national-day) |
| الصفحة الرئيسية | Header، optional secondary nav، hero+CTA، خدمات/ميزات/أخبار، feedback، footer | بحث autocomplete، صور عالية الجودة، تواريخ تحديث، استجابة كاملة | [Home](https://design.dga.gov.sa/guidelines/templates/home-page) |
| تواصل معنا | عنوان، قنوات/نموذج، حالات، feedback، footer | وضّح حالات الإدخال والإرسال | [Contact](https://design.dga.gov.sa/guidelines/templates/contact-us-page) |
| صفحة نموذج | مقدمة، stepper/form، validation، actions | desktop numbered؛ mobile radial | [Form](https://design.dga.gov.sa/guidelines/templates/form-page) |
| المساعدة | عنوان، بحث/بطاقات مساعدة، قنوات، feedback | بطاقات قابلة للفهم والتنقل | [Help](https://design.dga.gov.sa/guidelines/templates/help-page) |
| قسم الملاحظات | سؤال/خيارات، أسباب، submit confirmation | مثال «هل كانت هذه الصفحة مفيدة؟» نعم/لا ثم سبب | [Feedback](https://design.dga.gov.sa/guidelines/templates/feedback-section) |
| صفحة خدمة | تعريف/متطلبات/خطوات/CTA/محتوى/feedback | تسلسل المهمة أولًا | [Service](https://design.dga.gov.sa/guidelines/templates/service-page) |
| الأسئلة الشائعة | بحث، تصنيفات، accordion، pagination، rating | >20: البحث والتصنيف مفضّلان؛ >10: pagination اختياري | [FAQs](https://design.dga.gov.sa/guidelines/templates/faqs-page) |
| خريطة الموقع | هيكل روابط داخلي/خارجي وقياسات | دلالات nav/list وروابط واضحة | [Sitemap](https://design.dga.gov.sa/guidelines/templates/sitemap-page) |
| 404 | رسالة واضحة + CTA | قدّم مسار استعادة | [404](https://design.dga.gov.sa/guidelines/templates/page-not-found) |
| نتائج البحث | search، filters، chips، sort، results، pagination | اذكر الروابط الخارجية/الملفات، وRTL للشرائح | [Search](https://design.dga.gov.sa/guidelines/templates/search-page) |
| المشاركة الإلكترونية | بطاقات، بيانات مفتوحة، إحصاءات، charts | وضّح البيانات والأداء والمشاركة | [E-participation](https://design.dga.gov.sa/guidelines/templates/e-participation-page) |
| من نحن | هيكل، استراتيجية، سياسات/أنظمة، ميزانية، مشتريات، شركاء، وظائف، أخبار، تواصل | بنية محتوى مؤسسية واسعة | [About](https://design.dga.gov.sa/guidelines/templates/about-page) |
| صفحة محتوى | عنوان/مقدمة، TOC، نص/قوائم/وسائط، لغة، feedback | بنية headings ووسائط بديلة | [Content](https://design.dga.gov.sa/guidelines/templates/content-page) |
| Cookie banner | محتوى، إجراءات، خطأ، إدارة ملفات الارتباط | موافقة/إدارة واضحة؛ تفاصيل قانونية `⚠️ NEEDS VERIFICATION` | [Cookies](https://design.dga.gov.sa/guidelines/templates/cookies-banner) |
| Chatbot | intro/welcome، features، conversation، position | وصول ووضوح وموضع غير حاجب | [Chatbot](https://design.dga.gov.sa/guidelines/templates/chatbot) |
| Rating section | تقييم، إرسال، تأكيد، mobile | radiogroup قابل للوحة المفاتيح | [Rating](https://design.dga.gov.sa/guidelines/templates/rating-section) |

`OPTIONAL` شعار «عام الذكاء الاصطناعي 2026» وارد في الصفحة الرئيسية وقت التحقق؛ هذه إرشادات زمنية/حملاتية وليست عنصرًا دائمًا. أعد التحقق قبل الاستخدام.

## 17. Responsive Design

- طبّق breakpoints الرسمية 600/960/1280 وابدأ من mobile.
- غيّر grid من 2–4 أعمدة إلى 12 بحسب العرض؛ لا تصغّر المحتوى حتى يصبح غير مقروء.
- Breadcrumb في الجوال: السابق + سهم فقط؛ المسار الكامل/المختصر في العروض الأكبر.
- النموذج: radial stepper على الجوال، numbered stepper في الشاشات الكبيرة.
- رص العناوين الطويلة وCTA رأسيًا على الجوال؛ ضع CTA أسفل المحتوى.
- اجعل بطاقات وصور وحقول وجداول قابلة لإعادة التدفق؛ `⚠️ NEEDS VERIFICATION` لا ينشر المصدر نمط table-to-card إلزاميًا.
- اجعل كل هدف لمس 44×44px، واختبر portrait/landscape ولوحة المفاتيح والتكبير.

## 18. Development Guidelines

المصدر: [Developing](https://design.dga.gov.sa/developing)، [Design installation](https://design.dga.gov.sa/design-installation)، [Migration guide](https://design.dga.gov.sa/migration-guide) — آخر تحقق 2026-09-07.

```bash
npm install platformscode-new-react@latest
# أو
yarn add platformscode-new-react@latest
```

- الدعم المنشور صراحةً: React.
- `⚠️ NEEDS VERIFICATION` لا يوجد دليل رسمي عام على دعم Angular أو Vue أو Web Components.
- Storybook وGitHub موسومان «قريبًا» ولا يوجد URL رسمي قابل للاستخدام وقت التحقق.
- Figma: انشر Foundations وIcons للفريق أولًا، ثم مكتبة Desktop/Mobile واربطها بملف التصميم.
- الترحيل في Figma: استورد المكتبة الجديدة وانشرها ثم Swap library؛ يحاول Figma المطابقة بالاسم، لذلك لا تعِد تسمية المكونات القديمة قبل الاستبدال.
- ملاحظات ترحيل مايو 2024 تذكر تحديثات labels وtextarea وtabs؛ تحقّق من النسخة الحية عند الترحيل.
- لا تتعامل مع class names داخل bundle المصغّر على أنها API مستقرة.

## 19. Design Tokens

القيم الرقمية الموثقة موجودة في §5. النموذج المقترح للاستهلاك (`INFERRED` في أسماء alias، والقيم رسمية):

```css
:root {
  --uds-color-primary-600: #1b8354;
  --uds-color-gold-600: #dba102;
  --uds-color-lavendar-500: #80519f;
  --uds-color-neutral-950: #0c111b;
  --uds-space-md: 8px;
  --uds-space-xl: 16px;
  --uds-space-4xl: 32px;
  --uds-radius-md: 8px;
  --uds-container-max: 1280px;
  --uds-paragraph-max: 720px;
}
```

`⚠️ NEEDS VERIFICATION` هذه الأسماء المعيارية ليست API منشورة للحزمة؛ استخدم أسماء المتغيرات الفعلية من الحزمة/المكتبة في مشروعك. حزمة CSS الحالية تحمل namespace حديثًا (`--colors-primary-sa-flag`, semantic) وآخر legacy (`--colors-brand`, `--colors-error`...)؛ لا يوجد نص عام يحدد سياسة إزالة legacy.

لا توجد tokens منشورة موثقة لـz-index أو motion duration/easing في صفحات الموقع العامة.

## 20. SEO & Performance

المصدر: HTML العام للموقع و[Assessment Criteria](https://design.dga.gov.sa/AssessmentCriteria) — آخر تحقق 2026-09-07.

- الموقع النموذجي ينشر title، description، viewport، robots، Open Graph، Twitter Card، RSS، وSitemap. هذا دليل تنفيذ للموقع نفسه لا قائمة إلزامية عامة.
- `RECOMMENDED` استخدم HTML دلاليًا وعناوين صفحات ووصفًا فريدًا وصورة مشاركة مناسبة (`INFERRED` من تنفيذ الموقع، لا معيار صريح).
- `RECOMMENDED` حسّن الصور واجعلها متجاوبة (`INFERRED` من متطلبات جودة hero/responsive).
- `⚠️ NEEDS VERIFICATION` لا ينشر النظام حدود Core Web Vitals أو سياسة lazy-loading أو ميزانية أداء رقمية.
- `⚠️ SOURCE CONFLICT` `robots.txt` يشير إلى `https://yourdomain.com/sitemap.xml`، و`critical.css`/`non-critical.js` يعيدان HTML؛ لا تنسخ هذا السلوك.

## 21. Government Platform Requirements

المصدر: [Assessment Criteria](https://design.dga.gov.sa/AssessmentCriteria)، القوالب، و[Digital Stamp](https://design.dga.gov.sa/guidelines/components/content-display/digital-stamp) — آخر تحقق 2026-09-07.

- الألوان والخطوط والتخطيط والجوال متطلبات تقييم إلزامية.
- `RECOMMENDED` العربية أولًا، Sitemap، بحث/مساعدة، feedback، خصوصية ظاهرة، وأخطاء متسقة.
- التذييل يدعم الشروط والخصوصية وحقوق النشر وبيانات التواصل وروابط الوصول.
- الختم الرقمي يبين نطاقًا سعوديًا رسميًا معترفًا به (`gov.sa`, `edu.sa`, `org.sa`, `sch.sa`, `med.sa`)، HTTPS، والتسجيل/الترخيص لدى الهيئة وفق صفحة المكون.
- الروابط الرسمية التي كشفها موقع التوثيق: [شروط الاستخدام](https://my.gov.sa/ar/content/termsofuse) و[حماية البيانات/الخصوصية](https://my.gov.sa/ar/content/data-protection).
- `⚠️ NEEDS VERIFICATION` لا تجعل شعارًا أو رابطًا قانونيًا بعينه إلزاميًا لكل منصة إلا إذا نص مصدر الجهة المالكة أو التقييم على ذلك.

## 22. Do / Don't Rules

| افعل | لا تفعل | المستوى |
|---|---|---|
| استخدم component/template رسميًا قائمًا | تبني بديلًا مخصصًا بلا حاجة | RECOMMENDED |
| افحص contrast واللوحة واللمس | تعتمد على اللون/hover وحدهما | REQUIRED |
| استخدم button للإجراء وa للتنقل | تستخدم div قابلًا للنقر | REQUIRED |
| اجعل label ورسالة الخطأ واضحة | تستخدم placeholder أو الأحمر وحده | REQUIRED |
| اربط المسافات والألوان بسلم tokens | تضيف قيمًا عشوائية | REQUIRED في نطاق التقييم |
| حافظ على RTL وترتيب DOM | تعكس بصريًا وتفسد القراءة/Tab | REQUIRED |
| اذكر مقصد الرابط/الزر | تستخدم نصًا مبهمًا | RECOMMENDED |
| سجّل `⚠️ NEEDS VERIFICATION` عند الغموض | تخترع API/token/framework | REQUIRED في هذا المرجع |

### Supplementary Best Practices

كل ما يلي `INFERRED` وليس متطلبًا رسميًا منشورًا: اختبارات آلية بـaxe، snapshots للـbreakpoints الأربعة، اختبارات keyboard E2E، وجدول بيانات بديل للرسم البياني. هي وسائل تحقق عملية لتحقيق المتطلبات، لا قواعد جديدة من النظام.

## 23. Implementation Checklist

- [ ] حُدد القالب الرسمي الأنسب أو سُجل عدم وجوده.
- [ ] استُخدمت مكتبة المكونات والأيقونات الرسمية.
- [ ] طُبقت الألوان والخطوط والشبكة والمسافات الرسمية.
- [ ] عُيّن RTL والعربية وتحقق ترتيب DOM.
- [ ] header/navigation/footer متوافقة مع الحاجة والقوالب.
- [ ] كل الحالات: default/hover/pressed/focus/disabled/error/success/loading بحسب المكون.
- [ ] mobile/tablet/desktop/x-large اختبرت.
- [ ] الوصول والمحتوى والقواعد الحكومية راجعت.
- [ ] كل انحراف موثق بسبب ومستوى ومصدر.

## 24. Page Review Checklist

- [ ] title وH1 فريدان والتسلسل الهرمي صحيح.
- [ ] المسار/التنقل يوضح الموقع الحالي.
- [ ] CTA أساسي واحد واضح أو هرمية الإجراءات واضحة.
- [ ] المحتوى والبطاقات والروابط قابلة للمسح والفهم.
- [ ] البحث/التصفية/الترقيم يعملان إذا استدعى الحجم.
- [ ] feedback/آخر تحديث/الروابط القانونية موجودة حيث يطلب القالب.
- [ ] لا يوجد overflow أو محتوى محجوب أو target صغير.

## 25. Accessibility Checklist

- [ ] WCAG 2.1 AA؛ 4.5:1 للنص الصغير و3:1 للكبير/UI.
- [ ] تجربة كاملة بلوحة المفاتيح وتركيز ظاهر.
- [ ] landmarks/headings/list/table/form semantics صحيحة.
- [ ] labels/help/errors وARIA relationships صحيحة.
- [ ] صور/أيقونات meaningful أو decorative وسمت بدقة.
- [ ] dialogs/menus/tabs/accordion focus وkeyboard مطابقان لنمطهما.
- [ ] dynamic status معلن دون إزعاج؛ لا focus على loader.
- [ ] touch targets 44×44px، وتكبير/إعادة تدفق/اتجاه اختبرت.
- [ ] لا معلومة باللون وحده، وتقليل الحركة مدعوم.

## 26. Responsive Checklist

- [ ] 0–599، 600–959، 960–1279، 1280+ اختبرت.
- [ ] padding 16px mobile / 32px desktop، max container 1280px.
- [ ] الأعمدة تنتقل من 2–4 إلى 12 بحسب العرض.
- [ ] navigation/breadcrumb/stepper يتحول حسب القواعد.
- [ ] النص والصور والبطاقات والجداول والنماذج لا تتجاوز viewport.
- [ ] CTA والعناوين الطويلة تُرص رأسيًا عند الضيق.
- [ ] portrait/landscape/zoom/touch اختبرت.

## 27. Content Checklist

- [ ] العربية أولًا والنص واضح وموجز.
- [ ] عناوين وتسميات وأزرار وروابط وصفية.
- [ ] التعليمات قبل الحاجة ورسائل الخطأ قابلة للتصحيح.
- [ ] المصطلحات ونبرة الجهة متسقة.
- [ ] فتح نافذة جديدة/ملف خارجي موضح.
- [ ] لا توجد قواعد تاريخ/رقم مخترعة؛ الغامض موسوم للتحقق.

## 28. Developer Checklist

- [ ] الحزمة الرسمية والإصدار المقصود مثبتان ومقفولان وفق سياسة المشروع.
- [ ] semantic HTML قبل ARIA.
- [ ] لا div-click ولا CSS values عشوائية ولا reliance على bundle internals.
- [ ] states/focus/errors/loading/success مكتملة.
- [ ] RTL وkeyboard وscreen reader وresponsive مختبرة.
- [ ] lint/type/test/build ناجحة، مع دليل تحقق.
- [ ] لا ادعاء بدعم framework غير منشور.

## 29. Designer Checklist

- [ ] Foundations وIcons وDesktop/Mobile libraries منشورة ومرتبطة في Figma.
- [ ] المكونات variants/states الرسمية مستخدمة.
- [ ] الشبكة والمسافات والتباين والأحجام موثقة.
- [ ] prototype يغطي keyboard/focus/error/loading والـbreakpoints.
- [ ] النص الحقيقي العربي اختبر، لا lorem ipsum فقط.
- [ ] أي detach يحافظ على البنية والأسلوب ويسجل سببه.

## 30. AI Coding Agent Instructions

عند إنشاء أي صفحة جديدة، اعتبر القواعد في هذا الملف قيودًا على التنفيذ وليست اقتراحات. لا تملأ فراغًا في المصدر بالتخمين؛ أظهر `⚠️ NEEDS VERIFICATION` أو اسأل صاحب القرار.

التعليمات الجذرية الملزمة للوكلاء موجودة في [`../AGENTS.md`](../AGENTS.md). المدخلات المقروءة آليًا هي [`uds-rules.json`](./uds-rules.json)، [`uds-components.json`](./uds-components.json)، و[`uds-templates.json`](./uds-templates.json)، وتعريف الإنجاز في [`UDS_DEFINITION_OF_DONE.md`](./UDS_DEFINITION_OF_DONE.md). بعد أي تغيير واجهة شغّل `python3 tools/uds-compliance/uds_compliance.py <target>` من جذر المستودع؛ نجاح الفحص الساكن لا يلغي المراجعات المصنفة `SEMI_AUTOMATED` أو `MANUAL`.

### Workflow

1. **Understand the requested page:** استخرج نوع الصفحة واللغة والمحتوى والإجراءات والبيانات والمستخدمين.
2. **Identify the template:** اختر قالب §16؛ إن لم يوجد، صرّح أن التركيب `INFERRED`.
3. **Select approved components:** استخدم فهرس §13؛ لا تبنِ بديلًا إذا كان المكون يغطي الحاجة.
4. **Apply typography and colors:** IBM Plex Sans Arabic، السلم الرسمي، contrast.
5. **Apply spacing and grid:** mobile-first، tokens، 16/32px، max 1280px.
6. **Apply RTL:** `lang/dir`, logical DOM, directional icons.
7. **Apply responsive rules:** اختبر النطاقات الأربعة والتحولات الخاصة.
8. **Apply accessibility:** semantics, keyboard, focus, names, relationships, live regions.
9. **Validate content:** العربية أولًا، labels/actions/errors واضحة.
10. **Run compliance:** شغّل المدقق، أصلح كل `FAIL`، قيّم كل `WARNING`، ثم نفذ قوائم §23–§29 وسجل الأدلة والانحرافات.

### Decision Rules

```text
IF page_type == "home" THEN use Home Page template.
IF page_type == "service" THEN use Service Page template.
IF page_type == "form" AND steps > 1 THEN use Steps on large screens and Radial Stepper on mobile.
IF page_type == "faq" AND item_count > 20 THEN prefer search and classifications.
IF page_type == "faq" AND item_count > 10 THEN pagination is an allowed option.
IF interface_language == "ar" THEN html.lang = "ar" AND html.dir = "rtl".
IF official_component_exists THEN reuse it before creating a custom alternative.
IF intent == "navigate" THEN use Link; IF intent == "act" THEN use Button.
IF choice_count == 1_of_many THEN use Radio; IF 0_or_many THEN use Checkbox.
IF immediate_binary_setting THEN use Switch; IF explicit submission is needed THEN do not model it as an immediate Switch.
IF related_views <= 4 THEN Content Switcher may be used; IF > 4 THEN use Tabs.
IF critical_immediate_message THEN role = "alert"; ELSE dynamic status SHOULD use status/polite.
IF requested_visual_conflicts_with_REQUIRED THEN prioritize REQUIRED and report the conflict.
IF value_or_API_not_officially_documented THEN do not invent it; flag NEEDS VERIFICATION.
```

### Component Selection Rules

| الحاجة | المكون | قاعدة الاختيار | تجنب |
|---|---|---|---|
| إجراء أساسي | Button high emphasis | CTA الأهم | عدة أزرار high متنافسة |
| انتقال | Link | نص يصف الوجهة | Button للتنقل |
| اختيار متعدد | Checkbox | صفر أو أكثر | Radio |
| اختيار وحيد | Radio | واحد من مجموعة | Checkboxes متنافية |
| إعداد فوري ثنائي | Switch | أثر فوري on/off | انتظار submit بلا توضيح |
| إدخال طويل | Textarea | عدة أسطر | Input أحادي السطر |
| قيمة/نطاق مستمر | Slider | مع min/max/value | Slider لقيم دقيقة بلا بديل إدخال |
| تقدم معروف | Progress Bar/Radial Stepper | قيمة حالية/قصوى | Loader غير محدد |
| محتوى قيد الجلب | Skeleton | يحاكي layout | شاشة فارغة |
| مجموعة كبيرة | Pagination | صفحات متسلسلة | تحميل مبهم بلا حالة |
| محتوى قابل للطي | Accordion | عناوين وأقسام | إخفاء معلومات حرجة بلا دلالة |
| بيانات صفوف/أعمدة | Table | headers دلالية | div grid غير دلالي |
| إشعار | Notification | status/alert حسب الإلحاح | modal لكل رسالة |

### Template Selection Matrix

| نوع الصفحة | القالب | المكونات الأساسية | ملاحظات |
|---|---|---|---|
| رئيسية | Home | Header, Hero, Search, Cards, Feedback, Footer | secondary nav اختياري |
| خدمة | Service | Breadcrumb, service content, actions, feedback | ركز إتمام المهمة |
| نموذج | Form | Steps/Radial, Inputs, Buttons, Notification | تحقق inline |
| بحث | Search | Search box, Filters, Tags, Sort, Results, Pagination | أعلن تحديث النتائج |
| محتوى | Content | Breadcrumb, TOC, headings, media, feedback | max paragraph 720px |
| أسئلة | FAQ | Search, Categories, Accordion, Pagination, Rating | قواعد 20/10 |
| مساعدة | Help | Search/Cards/Contact | وضوح مسار الدعم |
| غير موجودة | 404 | Message + recovery CTA | لا dead end |
| لوحة مؤشرات | لا يوجد | Metrics/Charts/Table/Filters | `INFERRED`; يحتاج قرار تصميم |
| تسجيل دخول | لا يوجد | `⚠️ NEEDS VERIFICATION` | لا تخترع قالبًا رسميًا |

## 31. Source Mapping

| المجال | الصفحات المرجعية | الأقسام في هذا الملف |
|---|---|---|
| إلزام/تقييم | `/AssessmentCriteria` | 3, 4, 21–30 |
| Foundations | `/guidelines/foundations/*` | 5–8, 17, 19 |
| Components | `/guidelines/components/*` (50) | 10–15, 30 |
| Templates | `/guidelines/templates/*` (19) | 11–17, 20–21, 30 |
| تصميم/ترحيل | `/designing`, `/design-installation`, `/migration-guide` | 18, 29 |
| تطوير | `/developing`, `/contributing` | 18, 28 |
| وصول/مقالات | `/thoughts/*` | 8, 20, 27 |
| اكتشاف/أصول | `/sitemap`, `/sitemap.xml`, `/robots.txt`, bundles | 2, 19, 20, 32 |

لكل URL وعنوان وحالة صفحة، راجع [`crawl_inventory.md`](./crawl_inventory.md). القواعد الذرية ومعرفاتها ومصادرها في [`Saudi_Unified_Platform_Code_Rules.md`](./Saudi_Unified_Platform_Code_Rules.md).

## 32. Change Log / Version

| الإصدار | التاريخ | التغيير |
|---|---|---|
| 2.0.0 | 2026-09-07 | تدقيق إنفاذ: إثراء 169 قاعدة، تصنيف 96 URL، سجلا 50 مكونًا و19 قالبًا، تعليمات `AGENTS.md`، Definition of Done، مدقق امتثال، واختبار تنفيذي متجاوب. |
| 1.0.0 | 2026-09-07 | أول إصدار: زحف 96 صفحة، توثيق 50 مكونًا و19 قالبًا و5 Foundations، واستخراج القيم من CSS الرسمي. |

### Known source issues at this version

- `⚠️ SOURCE CONFLICT` Sitemap XML لا يغطي كل التنقل الحي (78 مقابل 96).
- `⚠️ SOURCE CONFLICT` `robots.txt` يحتوي نطاق Sitemap تجريبيًا.
- `⚠️ SOURCE CONFLICT` `critical.css`, `non-critical.js`, `sitemap_index.xml` تعيد HTML.
- `⚠️ SOURCE CONFLICT` عدم اتساق rem/px في width-xs وparagraph-max-width.
- `⚠️ SOURCE CONFLICT` قسم وصول Card يذكر Accordion، وقسم Button يتضمن أدوار Notification؛ اعتُبرا عيبي نسخ ولم يتحولا إلى قواعد.
- `⚠️ NEEDS VERIFICATION` Storybook/GitHub/API docs والحركة وz-index وقواعد التاريخ/الأرقام غير منشورة للعامة وقت التحقق.

> **سياسة التحديث:** أعد الزحف وقارن ملفات البناء وروابط Figma والتاريخ عند بدء مشروع جديد أو ظهور إصدار نظام أحدث.
