// Provider-independent support assistant.
//
// The /api/support route uses an LLM when a provider key is configured
// (ANTHROPIC_API_KEY today — swap in any provider later without touching the UI).
// When NO key is present, this local, rule-based engine answers the most common
// questions so the Support page still works. It is intentionally dependency-free
// and bilingual (EN/AR), matching the rest of Sarayah.

const KNOWLEDGE = {
  en: {
    greeting:
      "Hi! 👋 I'm Sarayah's assistant. Ask me about inquiries, listing a business, payments, reviews, or finding the right venue.",
    fallback:
      "I'm not sure about that one yet. The FAQ covers most questions, and you can always reach a human on the Contact page.",
    intents: [
      { keys: ["hello", "hi", "hey", "salam", "salaam", "marhaba"], a: "Hi! 👋 How can I help you with Sarayah today? You can ask about inquiries, listing a business, payments, or finding a venue." },
      { keys: ["inquiry", "inquire", "contact venue", "how do i book", "booking", "reach", "message"], a: "Open any listing and send an inquiry with your event details (date, guests, budget). The vendor receives it and contacts you directly to confirm availability and pricing. Browsing and sending inquiries is free." },
      { keys: ["payment", "pay", "deposit", "money", "price", "cost", "fees", "charge"], a: "Sarayah does NOT process payments or bookings. All arrangements — prices, deposits, and contracts — are made directly between you and the vendor. Always confirm details with the vendor before paying anything." },
      { keys: ["list", "add venue", "add my business", "register", "vendor", "sign up business", "become a vendor"], a: "Use “List your venue/business”, choose your category, and submit. Our team reviews every listing before it goes public. Listing is free during launch." },
      { keys: ["verified", "verification", "badge", "trust"], a: "A “Verified” badge means our team reviewed extra proof of ownership for that listing. It's a trust signal, not a guarantee — always confirm final details directly with the vendor." },
      { keys: ["review", "rating", "stars", "feedback"], a: "Anyone can leave a review on a listing. Reviews are checked by our team before they appear publicly." },
      { keys: ["concierge", "planner", "budget", "shortlist", "ai"], a: "Try the AI Budget Concierge at /concierge — enter your budget and guest count and it builds a ranked shortlist of venues that fit, flags what's within budget, and tells you what to ask." },
      { keys: ["favorite", "favourite", "save", "saved", "wishlist"], a: "Tap the heart on any listing to save it. You'll find your saved listings under Settings → Favorites (you'll need to be logged in)." },
      { keys: ["account", "login", "log in", "sign in", "password", "settings"], a: "You can log in or create an account from the Account/Settings page. There you can update your name, phone, password, favorites, and notification preferences." },
      { keys: ["free", "cost to use", "is it free"], a: "Yes — browsing, comparing, and sending inquiries is completely free for couples and event planners. Listing a business is also free during launch." },
      { keys: ["cancel", "refund", "complaint", "report", "problem", "scam", "fake"], a: "For issues like inaccurate or fake listings, use “Report this listing” on the venue page, or reach us via the Contact page. Since payments happen directly with the vendor, refunds are handled by the vendor." },
      { keys: ["human", "agent", "talk to someone", "support team"], a: "You can reach the Sarayah team through the Contact page — we monitor messages during launch and will get back to you." },
    ],
  },
  ar: {
    greeting:
      "أهلًا! 👋 أنا مساعد Sarayah. اسألني عن الطلبات، أو إضافة نشاطك، أو المدفوعات، أو التقييمات، أو إيجاد المكان المناسب.",
    fallback:
      "لست متأكدًا من هذا بعد. تغطي صفحة الأسئلة الشائعة معظم الاستفسارات، ويمكنك دائمًا التواصل معنا عبر صفحة «تواصل معنا».",
    intents: [
      { keys: ["مرحبا", "اهلا", "أهلا", "سلام", "هاي"], a: "أهلًا! 👋 كيف أساعدك في Sarayah اليوم؟ يمكنك السؤال عن الطلبات، أو إضافة نشاطك، أو المدفوعات، أو إيجاد مكان." },
      { keys: ["طلب", "احجز", "حجز", "تواصل", "ابعت", "رسالة", "استفسار"], a: "افتح أي قائمة وأرسل طلبًا بتفاصيل مناسبتك (التاريخ، الضيوف، الميزانية). يستلمه المزوّد ويتواصل معك مباشرةً لتأكيد التوافر والأسعار. التصفّح وإرسال الطلبات مجاني." },
      { keys: ["دفع", "مدفوعات", "فلوس", "سعر", "تكلفة", "عربون", "رسوم"], a: "Sarayah لا تعالج أي مدفوعات أو حجوزات. كل الترتيبات — الأسعار والعربون والعقود — تتم مباشرةً بينك وبين المزوّد. أكّد دائمًا التفاصيل مع المزوّد قبل دفع أي مبلغ." },
      { keys: ["اضافة", "أضف", "سجل", "نشاطي", "مزود", "مزوّد", "صاحب مكان"], a: "استخدم «أضف مكانك/نشاطك»، اختر فئتك، وأرسل. يراجع فريقنا كل قائمة قبل نشرها. الإضافة مجانية خلال الإطلاق." },
      { keys: ["موثق", "موثّق", "توثيق", "شارة", "ثقة"], a: "تعني شارة «موثّق» أن فريقنا راجع إثباتًا إضافيًا لملكية تلك القائمة. هي إشارة ثقة وليست ضمانًا — أكّد دائمًا التفاصيل النهائية مع المزوّد." },
      { keys: ["تقييم", "تقييمات", "نجوم", "رأي"], a: "يمكن لأي شخص ترك تقييم على قائمة. تتم مراجعة التقييمات من فريقنا قبل ظهورها للعامة." },
      { keys: ["مستشار", "مخطط", "ميزانية", "قائمة", "ذكاء"], a: "جرّب مستشار الميزانية الذكي على /concierge — أدخل ميزانيتك وعدد ضيوفك ليبني لك قائمة مرتّبة بالأماكن المناسبة، ويوضّح ما يناسب ميزانيتك، ويخبرك بما تسأل عنه." },
      { keys: ["مفضلة", "حفظ", "محفوظ"], a: "اضغط القلب على أي قائمة لحفظها. ستجد قوائمك المحفوظة في الإعدادات ← المفضلة (يلزم تسجيل الدخول)." },
      { keys: ["حساب", "تسجيل", "دخول", "كلمة المرور", "اعدادات", "إعدادات"], a: "يمكنك تسجيل الدخول أو إنشاء حساب من صفحة الحساب/الإعدادات. هناك يمكنك تحديث اسمك وهاتفك وكلمة مرورك ومفضّلاتك وتفضيلات الإشعارات." },
      { keys: ["مجاني", "ببلاش", "هل هو مجاني"], a: "نعم — التصفّح والمقارنة وإرسال الطلبات مجاني تمامًا للعرسان ومنظّمي المناسبات. وإضافة النشاط مجانية أيضًا خلال الإطلاق." },
      { keys: ["إلغاء", "الغاء", "استرداد", "شكوى", "بلاغ", "مشكلة", "نصب", "مزيف"], a: "للمشاكل مثل القوائم غير الدقيقة أو المزيّفة، استخدم «أبلغ عن هذه القائمة» في صفحة المكان، أو تواصل معنا عبر صفحة «تواصل معنا». بما أن الدفع يتم مباشرةً مع المزوّد، فإن الاسترداد يتم عبره." },
      { keys: ["انسان", "موظف", "اكلم حد", "فريق الدعم"], a: "يمكنك التواصل مع فريق Sarayah عبر صفحة «تواصل معنا» — نتابع الرسائل خلال الإطلاق وسنرد عليك." },
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
