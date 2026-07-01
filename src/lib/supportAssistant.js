// Provider-independent support assistant.
//
// The /api/support route uses an LLM when a provider key is configured
// (ANTHROPIC_API_KEY today — swap in any provider later without touching the UI).
// When NO key is present, this local, rule-based engine answers the most common
// questions so the Support page still works. It is dependency-free and bilingual
// (EN/AR), and always returns a helpful answer — never "sorry, unavailable".

const KNOWLEDGE = {
  en: {
    greeting:
      "Hi! 👋 I'm Sarayah's assistant. Ask me about inquiries, listing a business, payments, pricing, the Verified badge, favorites, notifications, the AI Planner, or finding the right venue.",
    // Helpful default — lists what the assistant can do instead of apologising.
    fallback:
      "I can help with: how inquiries work, listing a venue/business, payments & pricing, the Verified badge, login & account, favorites, notifications, browsing venues & services, and the AI Planner. Try asking about one of those — or reach a human on the Contact page.",
    intents: [
      { keys: ["hello", "hi ", "hey", "good morning", "good evening", "salam", "salaam", "marhaba", "how are you"], a: "Hi! 👋 How can I help you with Sarayah today? You can ask about inquiries, listing a business, payments, pricing, favorites, notifications, the AI Planner, or finding a venue." },
      { keys: ["what is sarayah", "about sarayah", "what do you do", "what is this", "how does sarayah work", "how it works"], a: "Sarayah is a bilingual (English/Arabic) marketplace for wedding & event venues and vendors in Egypt. You browse and compare venues, caterers, planners, invitations and more, then send an inquiry — all free. Sarayah doesn't take payments; you arrange everything directly with the vendor." },
      { keys: ["inquir", "enquir", "contact venue", "contact the venue", "how do i book", "booking", "reach the venue", "send a message", "request", "how do i contact"], a: "Open any listing and send an inquiry with your event details (date, guests, budget). The vendor receives it and contacts you directly to confirm availability and pricing. Browsing and sending inquiries is completely free." },
      { keys: ["payment", "pay ", "deposit", "money", "credit card", "online payment", "wallet", "transaction", "refund"], a: "Sarayah does NOT process payments or bookings. All arrangements — prices, deposits, and contracts — are made directly between you and the vendor. Always confirm details with the vendor before paying anything. Refunds are handled by the vendor since payment happens with them directly." },
      { keys: ["price", "pricing", "cost", "how much", "budget", "fees", "expensive", "cheap", "charge"], a: "Each listing shows a starting price or price range in EGP. Final pricing depends on your date, guest count, and package, so confirm the exact quote with the vendor. Using Sarayah itself is free — for both couples and businesses during launch." },
      { keys: ["list", "add venue", "add my", "register my", "list my business", "list my venue", "become a vendor", "join as a vendor", "i have a venue", "i own", "advertise"], a: "Tap “List your venue/business”, choose your category, and submit your details and photos. Our team reviews every listing before it goes public. Listing is free during launch." },
      { keys: ["verified", "verification", "badge", "trust", "trusted", "legit"], a: "A “Verified” badge means our team reviewed extra proof of ownership for that listing. It's a trust signal, not a guarantee — always confirm final details directly with the vendor." },
      { keys: ["review", "rating", "stars", "feedback", "comment"], a: "Anyone can leave a review on a listing, and the rating shows on the card and detail page. Reviews are checked by our team before they appear publicly." },
      { keys: ["concierge", "planner", "ai planner", "shortlist", "recommend", "suggest", "help me choose", "help me find"], a: "Try the AI Budget Concierge at /concierge — enter your budget and guest count and it builds a ranked shortlist of venues that fit, flags what's within budget, compares to the local average, and tells you what to ask." },
      { keys: ["favorite", "favourite", "save", "saved", "wishlist", "bookmark", "heart"], a: "Tap the heart on any listing to save it. You'll find your saved listings under Settings → Favorites (you'll need to be logged in)." },
      { keys: ["notification", "alert", "updates", "bell"], a: "The bell icon in the top bar shows your notifications — updates and tips. You can mark them all as read, and manage which ones you get under Settings → Notifications." },
      { keys: ["account", "login", "log in", "sign in", "signup", "sign up", "register", "password", "settings", "profile", "my account"], a: "You can log in or create an account from the Account/Settings page. There you can update your name, phone, and password, and manage favorites and notification preferences." },
      { keys: ["venue", "venues", "hall", "garden", "hotel", "rooftop", "browse", "search", "find a place", "location", "city", "area"], a: "Browse all venues from the Venues tab. Use the filters to narrow by city, type, indoor/outdoor, capacity, budget, and amenities — then open a listing to see details, photos, and a map, and send an inquiry." },
      { keys: ["service", "services", "vendor", "vendors", "category", "categories", "catering", "invitation", "photographer", "makeup", "dj", "flowers", "cake"], a: "The Services tab lists every category — venues, catering, invitations, planners and more. Some categories are live now and others say “Soon” as we onboard the best vendors across Egypt." },
      { keys: ["free", "is it free", "cost to use", "do i pay", "any fees"], a: "Yes — browsing, comparing, and sending inquiries is completely free for couples and event planners. Listing a business is also free during launch." },
      { keys: ["cancel", "complaint", "report", "problem", "scam", "fake", "wrong", "issue", "fraud"], a: "For issues like inaccurate or fake listings, use “Report this listing” on the venue page, or reach us via the Contact page. We review every report." },
      { keys: ["contact", "human", "agent", "talk to someone", "support team", "email", "phone", "call you", "reach you"], a: "You can reach the Sarayah team through the Contact page — we monitor messages during launch and will get back to you. You can also read the FAQ for quick answers." },
      { keys: ["language", "arabic", "english", "translate", "عربي"], a: "Sarayah is fully bilingual. Switch between English and العربية (with right-to-left layout) from Settings → Language, or the language toggle in the top bar." },
      { keys: ["cancel", "change my mind", "change plans", "postpone", "reschedule"], a: "No problem — Sarayah doesn't lock you into anything. Since arrangements are made directly with the vendor, cancelling or rescheduling is handled with the vendor. You can send a new inquiry to other venues anytime, free." },
      { keys: ["deposit", "down payment", "pay upfront"], a: "Any deposit is agreed and paid directly to the vendor, not through Sarayah. Always get the deposit terms (amount, refundable or not) in writing from the venue before paying." },
      { keys: ["compare", "difference between", "which is better", "vs "], a: "Open the venues you like and compare capacity, price range, location, and amenities on each detail page — or use the AI Planner at /concierge to rank options against your budget and guest count." },
      { keys: ["event type", "wedding", "engagement", "birthday", "corporate", "henna", "graduation", "occasion"], a: "Sarayah covers weddings, engagements, birthdays, corporate events and more. Use the “Suitable for” filter on the Venues page, or the AI Planner, to see venues that fit your specific occasion." },
      { keys: ["catering", "food", "buffet", "menu", "meal"], a: "Some venues include catering and others let you bring your own — check the “Catering” amenity on each listing. Catering is also a Services category; confirm menus and per-head pricing directly with the vendor." },
      { keys: ["invitation", "cards", "printing"], a: "Invitations are one of Sarayah's Services categories. Browse invitation vendors from the Services tab and send an inquiry with your quantity and design ideas." },
      { keys: ["planner", "coordinator", "organizer", "organiser"], a: "Event planners are listed under Services → Planners. They can manage vendors and the timeline for you — open a planner's listing and send an inquiry with your date and budget." },
      { keys: ["photographer", "photography", "makeup", "hair ", "zaffa", "flowers", "cake", "dress", "car "], a: "These vendor categories live on Sarayah's Services tab. Some are live now and others show “Soon” while we onboard the best vendors across Egypt — check back or send an inquiry where available." },
      { keys: ["edit my listing", "manage my listing", "update my venue", "vendor dashboard", "my listings"], a: "If you listed a business, sign in and open the Vendor Dashboard from Settings/Account. There you can edit your listing details and photos and see the inquiries you've received." },
      { keys: ["delete my account", "remove my data", "close account", "delete account"], a: "You can request removal or correction of your data anytime via the Contact page. We don't sell your data, and any verification documents are kept private to admins only." },
      { keys: ["official", "who runs", "who owns", "is this real", "legit", "trustworthy", "safe to use"], a: "Sarayah is a launch-stage marketplace for wedding & event venues and vendors in Egypt. Every listing is reviewed before going public, and “Verified” listings had extra ownership proof checked — but always confirm final details with the vendor." },
      { keys: ["how many venues", "coverage", "which cities", "governorate", "areas you cover", "locations do you cover"], a: "Sarayah is growing across Egypt's governorates and cities. Use the city/area filters on the Venues page to see what's available near you, and check back as we add more." },
      { keys: ["available date", "availability", "is it free on", "book date", "specific date"], a: "Sarayah doesn't hold live calendars — availability is confirmed directly with the vendor. Send an inquiry with your date and the venue will tell you if it's open." },
      { keys: ["decoration", "decor", "theme", "styling"], a: "Some venues include decoration and others leave it to you or a planner — check the “Decoration included” amenity on the listing, and confirm exactly what's covered with the vendor." },
      { keys: ["parking", "valet"], a: "Parking availability is shown as an amenity on each venue's detail page. Filter by “Parking available” on the Venues page to see only venues that offer it." },
      { keys: ["how many guests", "capacity help", "fits how many", "guest count", "how big"], a: "Each venue shows a min–max guest capacity. Filter by “Minimum capacity” on the Venues page, or tell the AI Planner your guest count and it'll only show venues that fit." },
      { keys: ["cheapest", "lowest price", "affordable", "on a budget", "save money", "discount", "offer", "deal"], a: "Set a “Max budget” filter on the Venues page to see options in your range, or use the AI Planner — it ranks venues that fit your budget and flags what's below the local average. Using Sarayah is free during launch." },
      { keys: ["whatsapp", "phone number", "call the venue", "vendor number", "contact number"], a: "For privacy and to prevent spam, vendor phone numbers aren't shown publicly. Send an inquiry instead and the vendor contacts you directly to arrange everything." },
      { keys: ["app", "mobile app", "download", "ios", "android"], a: "Sarayah works great in your mobile browser — just open the site on your phone. A dedicated app may come later; for now everything (browsing, inquiries, favorites) works on mobile." },
      { keys: ["how long", "response time", "when will", "how fast", "reply back"], a: "Response time depends on the vendor. After you send an inquiry the vendor (or the Sarayah team) follows up directly — usually within a day or two during launch." },
      { keys: ["thank", "thanks", "great", "appreciate"], a: "You're welcome! 🌿 If there's anything else — inquiries, listing, pricing, or finding a venue — just ask." },
    ],
  },
  ar: {
    greeting:
      "أهلًا! 👋 أنا مساعد Sarayah. اسألني عن الطلبات، أو إضافة نشاطك، أو المدفوعات، أو الأسعار، أو شارة التوثيق، أو المفضلة، أو الإشعارات، أو المخطط الذكي، أو إيجاد المكان المناسب.",
    fallback:
      "يمكنني المساعدة في: كيف تعمل الطلبات، إضافة مكان/نشاط، المدفوعات والأسعار، شارة «موثّق»، تسجيل الدخول والحساب، المفضلة، الإشعارات، تصفّح الأماكن والخدمات، والمخطط الذكي. جرّب أن تسأل عن أحدها — أو تواصل معنا عبر صفحة «تواصل معنا».",
    intents: [
      { keys: ["مرحبا", "اهلا", "أهلا", "سلام", "هاي", "صباح", "مساء", "ازيك", "كيف حالك"], a: "أهلًا! 👋 كيف أساعدك في Sarayah اليوم؟ يمكنك السؤال عن الطلبات، أو إضافة نشاطك، أو المدفوعات، أو الأسعار، أو المفضلة، أو الإشعارات، أو المخطط الذكي، أو إيجاد مكان." },
      { keys: ["ما هي sarayah", "ما هو", "عن sarayah", "ايه هي", "ماذا تفعل", "كيف تعمل sarayah", "كيف يعمل"], a: "Sarayah سوق ثنائي اللغة (عربي/إنجليزي) لأماكن ومزوّدي الأفراح والمناسبات في مصر. تتصفّح وتقارن بين الأماكن والبوفيهات والمنظّمين والدعوات والمزيد، ثم ترسل طلبًا — مجانًا. لا تأخذ Sarayah مدفوعات؛ ترتّب كل شيء مباشرةً مع المزوّد." },
      { keys: ["طلب", "احجز", "حجز", "تواصل", "ابعت", "رسالة", "استفسار", "أتواصل"], a: "افتح أي قائمة وأرسل طلبًا بتفاصيل مناسبتك (التاريخ، الضيوف، الميزانية). يستلمه المزوّد ويتواصل معك مباشرةً لتأكيد التوافر والأسعار. التصفّح وإرسال الطلبات مجاني تمامًا." },
      { keys: ["دفع", "مدفوعات", "فلوس", "عربون", "فيزا", "بطاقة", "تحويل", "استرداد"], a: "Sarayah لا تعالج أي مدفوعات أو حجوزات. كل الترتيبات — الأسعار والعربون والعقود — تتم مباشرةً بينك وبين المزوّد. أكّد دائمًا التفاصيل مع المزوّد قبل دفع أي مبلغ. والاسترداد يتم عبر المزوّد لأن الدفع يتم معه مباشرةً." },
      { keys: ["سعر", "اسعار", "أسعار", "تكلفة", "بكام", "كام", "ميزانية", "رسوم", "غالي", "رخيص"], a: "تعرض كل قائمة سعرًا مبدئيًا أو نطاق سعر بالجنيه. يعتمد السعر النهائي على تاريخك وعدد ضيوفك والباقة، لذا أكّد العرض الدقيق مع المزوّد. استخدام Sarayah نفسه مجاني — للعرسان وللأنشطة خلال الإطلاق." },
      { keys: ["اضافة", "أضف", "اضيف", "سجل", "نشاطي", "مكاني", "مزود", "مزوّد", "صاحب مكان", "عندي مكان", "اعلان", "أعلن"], a: "اضغط «أضف مكانك/نشاطك»، اختر فئتك، وأرسل بياناتك وصورك. يراجع فريقنا كل قائمة قبل نشرها. الإضافة مجانية خلال الإطلاق." },
      { keys: ["موثق", "موثّق", "توثيق", "شارة", "ثقة"], a: "تعني شارة «موثّق» أن فريقنا راجع إثباتًا إضافيًا لملكية تلك القائمة. هي إشارة ثقة وليست ضمانًا — أكّد دائمًا التفاصيل النهائية مع المزوّد." },
      { keys: ["تقييم", "تقييمات", "نجوم", "رأي", "تعليق"], a: "يمكن لأي شخص ترك تقييم على قائمة، ويظهر التقييم على البطاقة وصفحة التفاصيل. تتم مراجعة التقييمات من فريقنا قبل ظهورها للعامة." },
      { keys: ["مستشار", "مخطط", "المخطط الذكي", "قائمة", "رشح", "اقترح", "ساعدني", "ابحث لي"], a: "جرّب مستشار الميزانية الذكي على /concierge — أدخل ميزانيتك وعدد ضيوفك ليبني لك قائمة مرتّبة بالأماكن المناسبة، ويوضّح ما يناسب ميزانيتك، ويقارن بمتوسط الأسعار، ويخبرك بما تسأل عنه." },
      { keys: ["مفضلة", "حفظ", "محفوظ", "احفظ", "قلب"], a: "اضغط القلب على أي قائمة لحفظها. ستجد قوائمك المحفوظة في الإعدادات ← المفضلة (يلزم تسجيل الدخول)." },
      { keys: ["اشعار", "إشعار", "تنبيه", "تحديثات", "جرس"], a: "أيقونة الجرس في الأعلى تعرض إشعاراتك — تحديثات ونصائح. يمكنك تحديد الكل كمقروء، والتحكم فيما تستقبله من الإعدادات ← الإشعارات." },
      { keys: ["حساب", "تسجيل", "دخول", "كلمة المرور", "اعدادات", "إعدادات", "ملفي", "بروفايل"], a: "يمكنك تسجيل الدخول أو إنشاء حساب من صفحة الحساب/الإعدادات. هناك يمكنك تحديث اسمك وهاتفك وكلمة مرورك، وإدارة المفضلة وتفضيلات الإشعارات." },
      { keys: ["مكان", "اماكن", "أماكن", "قاعة", "حديقة", "فندق", "سطح", "تصفح", "بحث", "مدينة", "منطقة"], a: "تصفّح كل الأماكن من تبويب «الأماكن». استخدم الفلاتر للتضييق حسب المدينة والنوع ومغلق/مفتوح والسعة والميزانية والخدمات — ثم افتح القائمة لرؤية التفاصيل والصور والخريطة وإرسال طلب." },
      { keys: ["خدمة", "خدمات", "فئة", "فئات", "بوفيه", "دعوات", "مصور", "ميكب", "دي جيه", "ورد", "تورتة"], a: "تبويب «الخدمات» يعرض كل الفئات — أماكن، بوفيه، دعوات، منظّمون والمزيد. بعض الفئات متاحة الآن وأخرى مكتوب عليها «قريبًا» بينما نضم أفضل المزوّدين في مصر." },
      { keys: ["مجاني", "ببلاش", "هل هو مجاني", "بفلوس", "في رسوم"], a: "نعم — التصفّح والمقارنة وإرسال الطلبات مجاني تمامًا للعرسان ومنظّمي المناسبات. وإضافة النشاط مجانية أيضًا خلال الإطلاق." },
      { keys: ["إلغاء", "الغاء", "شكوى", "بلاغ", "مشكلة", "نصب", "مزيف", "احتيال", "غلط"], a: "للمشاكل مثل القوائم غير الدقيقة أو المزيّفة، استخدم «أبلغ عن هذه القائمة» في صفحة المكان، أو تواصل معنا عبر صفحة «تواصل معنا». نراجع كل بلاغ." },
      { keys: ["تواصل", "انسان", "موظف", "اكلم حد", "فريق الدعم", "ايميل", "تليفون", "اتصال"], a: "يمكنك التواصل مع فريق Sarayah عبر صفحة «تواصل معنا» — نتابع الرسائل خلال الإطلاق وسنرد عليك. ويمكنك أيضًا قراءة الأسئلة الشائعة للإجابات السريعة." },
      { keys: ["لغة", "عربي", "انجليزي", "إنجليزي", "ترجمة", "english"], a: "Sarayah ثنائية اللغة بالكامل. بدّل بين English والعربية (مع تخطيط من اليمين لليسار) من الإعدادات ← اللغة، أو زر اللغة في الأعلى." },
      { keys: ["الغاء", "إلغاء", "غيرت رايي", "تأجيل", "أجل", "اعادة جدولة"], a: "مفيش مشكلة — Sarayah مش بتلزمك بأي حاجة. وبما إن الترتيبات بتتم مباشرةً مع المزوّد، الإلغاء أو التأجيل بيتم معاه. وتقدر تبعت طلب جديد لأماكن تانية في أي وقت مجانًا." },
      { keys: ["عربون", "مقدم", "دفع مقدم"], a: "أي عربون بيتفق ويتدفع مباشرةً للمزوّد، مش عن طريق Sarayah. خُد دايمًا شروط العربون (المبلغ، مسترد ولا لأ) مكتوبة من المكان قبل ما تدفع." },
      { keys: ["مقارنة", "قارن", "الفرق بين", "ايهما افضل", "أيهما أفضل"], a: "افتح الأماكن اللي عاجباك وقارن السعة والسعر والموقع والخدمات في صفحة كل مكان — أو استخدم المخطط الذكي على /concierge علشان يرتّبهم حسب ميزانيتك وعدد ضيوفك." },
      { keys: ["نوع المناسبة", "زفاف", "فرح", "خطوبة", "عيد ميلاد", "شركات", "حنة", "تخرج", "مناسبة"], a: "Sarayah بتغطّي الأفراح والخطوبة وأعياد الميلاد ومناسبات الشركات وأكتر. استخدم فلتر «مناسب لـ» في صفحة الأماكن، أو المخطط الذكي، علشان تشوف الأماكن المناسبة لمناسبتك." },
      { keys: ["بوفيه", "اكل", "أكل", "منيو", "وجبة"], a: "بعض الأماكن بتشمل البوفيه وبعضها بيسمحلك تجيب بتاعك — راجع خدمة «بوفيه» في كل قائمة. البوفيه كمان فئة في الخدمات؛ أكّد المنيو وسعر الفرد مع المزوّد." },
      { keys: ["دعوة", "دعوات", "كروت", "طباعة"], a: "الدعوات فئة من فئات الخدمات في Sarayah. تصفّح مزوّدي الدعوات من تبويب «الخدمات» وابعت طلب بالكمية والأفكار اللي عايزها." },
      { keys: ["منظم", "منظّم", "منسق", "منسّق", "مخطط افراح"], a: "منظّمو المناسبات موجودين في الخدمات ← المنظّمون. بيقدروا يديروا لك المزوّدين والجدول — افتح قائمة المنظّم وابعت طلب بتاريخك وميزانيتك." },
      { keys: ["مصور", "تصوير", "ميكب", "مكياج", "شعر", "دي جيه", "زفة", "ورد", "تورتة", "فستان", "عربية"], a: "الفئات دي موجودة في تبويب «الخدمات». بعضها متاح دلوقتي وبعضها مكتوب عليه «قريبًا» بينما نضم أفضل المزوّدين في مصر — تابعنا أو ابعت طلب حيثما متاح." },
      { keys: ["تعديل قائمتي", "ادارة قائمتي", "تحديث مكاني", "لوحة المزود", "قوائمي"], a: "لو أضفت نشاط، سجّل الدخول وافتح لوحة المزوّد من الإعدادات/الحساب. هناك تقدر تعدّل تفاصيل قائمتك وصورها وتشوف الطلبات اللي وصلتك." },
      { keys: ["حذف حسابي", "امسح بياناتي", "اغلاق حساب", "حذف الحساب"], a: "تقدر تطلب حذف أو تصحيح بياناتك في أي وقت عبر صفحة «تواصل معنا». إحنا مابنبيعش بياناتك، ومستندات التوثيق (إن وُجدت) محفوظة للمسؤولين فقط." },
      { keys: ["رسمي", "مين بيدير", "مين صاحب", "ده حقيقي", "موثوق", "آمن"], a: "Sarayah سوق في مرحلة الإطلاق لأماكن ومزوّدي الأفراح والمناسبات في مصر. كل قائمة بتتراجع قبل النشر، والقوائم «الموثّقة» اتراجع لها إثبات ملكية إضافي — بس أكّد دايمًا التفاصيل مع المزوّد." },
      { keys: ["كام مكان", "التغطية", "أي مدن", "محافظة", "مناطق", "بتغطوا فين"], a: "Sarayah بتكبر في محافظات ومدن مصر. استخدم فلاتر المدينة/المنطقة في صفحة الأماكن علشان تشوف المتاح عندك، وتابعنا مع إضافة المزيد." },
      { keys: ["تاريخ متاح", "التوافر", "متاح يوم", "احجز تاريخ", "تاريخ معين"], a: "Sarayah مابتحتفظش بتقويم مباشر — التوافر بيتأكد مباشرةً مع المزوّد. ابعت طلب بتاريخك والمكان هيقولك لو متاح." },
      { keys: ["ديكور", "تزيين", "ثيم", "تنسيق"], a: "بعض الأماكن بتشمل الديكور وبعضها بيسيبه ليك أو لمنظّم — راجع خدمة «ديكور مشمول» في القائمة، وأكّد اللي متغطّى بالضبط مع المزوّد." },
      { keys: ["موقف", "باركينج", "صف سيارات"], a: "توفّر الموقف بيظهر كخدمة في صفحة كل مكان. صفِّي بـ «موقف سيارات متاح» في صفحة الأماكن علشان تشوف اللي بيوفّره بس." },
      { keys: ["كام ضيف", "السعة", "قد ايه", "يستوعب كام", "عدد الضيوف"], a: "كل مكان بيعرض سعة من–إلى للضيوف. صفِّي بـ «أقل سعة» في صفحة الأماكن، أو قول للمخطط الذكي عدد ضيوفك وهيعرضلك الأماكن اللي تستوعبهم بس." },
      { keys: ["ارخص", "أرخص", "اقل سعر", "أقل سعر", "في المتناول", "على قد الميزانية", "خصم", "عرض"], a: "حط فلتر «أقصى ميزانية» في صفحة الأماكن علشان تشوف اللي في حدودك، أو استخدم المخطط الذكي — بيرتّب الأماكن اللي تناسب ميزانيتك ويوضّح الأقل من المتوسط. واستخدام Sarayah مجاني خلال الإطلاق." },
      { keys: ["واتساب", "رقم تليفون", "اكلم المكان", "رقم المزود", "رقم للتواصل"], a: "للخصوصية ولمنع الإزعاج، أرقام المزوّدين مش ظاهرة للعامة. ابعت طلب والمزوّد هيتواصل معاك مباشرةً علشان ترتّبوا كل حاجة." },
      { keys: ["تطبيق", "ابليكيشن", "تحميل", "اندرويد", "ايفون"], a: "Sarayah بتشتغل تمام من متصفح موبايلك — افتح الموقع على تليفونك. ممكن يكون فيه تطبيق مخصص لاحقًا؛ دلوقتي كل حاجة (تصفّح، طلبات، مفضلة) شغّالة على الموبايل." },
      { keys: ["قد ايه وقت", "وقت الرد", "امتى هيردوا", "بيردوا بسرعة", "الرد"], a: "وقت الرد بيعتمد على المزوّد. بعد ما تبعت طلب، المزوّد (أو فريق Sarayah) بيتواصل معاك مباشرةً — عادةً خلال يوم أو يومين خلال الإطلاق." },
      { keys: ["شكرا", "شكرًا", "تسلم", "ممتاز", "رائع"], a: "العفو! 🌿 لو في أي شيء آخر — طلبات، إضافة، أسعار، أو إيجاد مكان — اسأل وقتما تريد." },
    ],
  },
};

// Pick the best matching answer for a user message. Pure string matching, no deps.
export function localSupportReply(text, locale = "en") {
  const lang = locale === "ar" ? "ar" : "en";
  const kb = KNOWLEDGE[lang];
  const q = String(text || "").toLowerCase().trim();
  if (!q) return kb.greeting;

  let best = null;
  let bestScore = 0;
  for (const intent of kb.intents) {
    let score = 0;
    for (const key of intent.keys) {
      if (q.includes(key.toLowerCase())) score += key.length; // longer keyword = stronger signal
    }
    if (score > bestScore) {
      bestScore = score;
      best = intent;
    }
  }
  return best ? best.a : kb.fallback;
}

export const SUPPORT_SYSTEM_PROMPT =
  "You are Sarayah's friendly support assistant. Sarayah is a bilingual (English/Arabic) " +
  "wedding & event marketplace in Egypt: couples discover venues and vendors " +
  "(photographers, makeup & hair, catering, DJ & zaffa, dresses, flowers, cakes, " +
  "invitations, cars, planners), compare them, and send an inquiry. KEY FACTS: " +
  "Sarayah does NOT process payments or bookings — all arrangements are made directly " +
  "between the user and the vendor. Listings are reviewed by the team before going " +
  "public; listing a business is free during launch. Reviews are moderated. There is " +
  "an AI Budget Concierge at /concierge that builds a shortlist from a budget + guest " +
  "count. A 'Verified' badge means extra proof of ownership was reviewed. " +
  "Answer concisely (2-4 sentences), warmly, and accurately. Never invent policies. " +
  "If you don't know, point them to the Contact page. Reply in the user's language.";

// System prompt for the RAG AGENT (used when a provider key is configured).
// It has the query_sarayah_database tool and must ground every concrete fact in
// the tool's results — no invented prices, venues, capacities, or availability.
export const AGENT_SYSTEM_PROMPT =
  "You are Sarayah's AI assistant — a warm, helpful guide for a bilingual wedding & " +
  "event marketplace in Egypt. LANGUAGE: reply in friendly EGYPTIAN ARABIC (اللهجة المصرية) " +
  "by DEFAULT; if the user writes in English, reply in English. Keep replies concise (2–5 sentences).\n\n" +
  "TOOL: You have a tool `query_sarayah_database` that searches Sarayah's REAL database. " +
  "Call it whenever the user asks about specific venues, vendors, prices, capacity, locations, " +
  "packages, availability, or recommendations. Extract structured filters (city, venue type, " +
  "minimum capacity/guests, maximum budget) from their message and pass them to the tool.\n\n" +
  "GROUNDING (critical): Only state venue names, prices, capacities, and locations that come from " +
  "the tool results. NEVER invent or guess prices, venues, vendors, or availability. If the tool " +
  "returns no results, say clearly that you couldn't find matching options in the data, and ASK the " +
  "user for more details (city, guest count, budget, event type) so you can search again. Sarayah " +
  "does not process payments or bookings — arrangements are made directly with the vendor, so never " +
  "confirm a booking or a final price; tell them to confirm with the venue.\n\n" +
  "For general how-to questions (inquiries, listing a business, the Verified badge, favorites, " +
  "notifications, login), answer directly without the tool. When unsure, point to the Contact page.";
