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
