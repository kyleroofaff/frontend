import { useMemo, useState } from "react";
import { Globe, HeartHandshake, Shield } from "lucide-react";
import { PageShell, ProductImage } from "../components/site/SitePrimitives.jsx";
import { COLOR_OPTIONS, CONDITION_OPTIONS, CUSTOM_REQUEST_FEE_THB, DAYS_WORN_OPTIONS, FABRIC_OPTIONS, formatExchangeEstimates, formatPriceTHB, localizeOptionLabel, MESSAGE_FEE_THB, MIN_CUSTOM_REQUEST_PURCHASE_THB, SCENT_LEVEL_OPTIONS, SELLER_SPECIALTY_OPTIONS, SHARED_SIZE_OPTIONS, STYLE_FILTER_OPTIONS } from "../productOptions.js";
import { formatDateTimeNoSeconds } from "../utils/timeFormat.js";
import { getRequiredTopUpAmount } from "../utils/walletTopUp.js";

function normalizeFabric(value) {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "lace blend" || normalized === "lace" || normalized === "lacy") return "Lace";
  if (normalized === "silk blend" || normalized === "silk") return "Silk";
  if (normalized === "satin") return "Satin";
  if (normalized === "mesh") return "Mesh";
  if (normalized === "cotton" || normalized === "modal blend" || normalized === "poly blend") return "Cotton";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const HELP_I18N = {
  en: {
    privacyEyebrow: "Legal",
    privacyTitle: "Privacy Policy",
    privacySubtitle: "How Thailand Panties collects, uses, and protects customer and seller data.",
    privacyPoints: [
      "We collect account details, order information, support messages, listing content, and feed interactions needed to operate marketplace features.",
      "Payment card data is handled by the payment provider. We do not store raw card numbers or security codes on marketplace servers.",
      "Order, wallet, unlock, and moderation records are retained for fulfillment, fraud prevention, policy enforcement, and support.",
      "By using the platform, users agree to moderation and safety logging, including block history and conduct enforcement events."
    ],
    contactEyebrow: "Support",
    contactTitle: "Contact Us",
    contactSubtitle: "Reach the Thailand Panties team for support, onboarding, and policy questions.",
    contactEmailLabel: "Email:",
    contactLocationLabel: "Location:",
    contactHoursLabel: "Hours:",
    contactLocationValue: "Bangkok, Thailand",
    contactHoursValue: "Mon-Sat, 9:00-18:00 ICT",
    contactNamePlaceholder: "Your name",
    contactEmailPlaceholder: "Email",
    contactMessagePlaceholder: "Your message",
    contactSend: "Send Message",
    orderHelpEyebrow: "Support",
    orderHelpTitle: "Order Help",
    orderHelpSubtitle: "Get help with checkout, shipping, tracking, and paid feature activity.",
    orderHelpPoints: [
      "Check order confirmation, tracking details, and wallet transaction history first for the latest status.",
      "For missing tracking, address updates, or delivery issues, contact support with your order number.",
      "For private post unlock or custom request fee questions, include your account email and approximate timestamp."
    ],
    faqEyebrow: "Support",
    faqTitle: "Frequently Asked Questions",
    faqSubtitle: "Answers for buyers and sellers using Thailand Panties.",
    faqs: [
      { q: "How quickly are orders shipped?", a: "Orders typically ship in 1-3 business days after payment confirmation." },
      { q: "Who pays shipping costs?", a: "Buyers pay the exact shipping cost charged for their destination at checkout." },
      { q: "Which carrier do you use?", a: "We ship with international carriers for worldwide delivery and tracking." },
      { q: "Is packaging discreet?", a: "Yes. All orders are packed and shipped discreetly in plain external packaging." },
      { q: "Do you offer refunds or returns?", a: "All sales are final, except if you receive the wrong item. In wrong-item cases, we can issue a refund after you submit evidence through the refund evidence form for review. We dispute all chargebacks and submit evidence of the buyer's agreement to the Terms of Service and their usage activity on the site." },
      { q: "What appears on my card statement?", a: "The card descriptor appears as Small World Chiang Mai." },
      { q: "What currency does the marketplace use?", a: "All listing, wallet, unlock, and message fees are charged in Thai baht (THB). Any non-THB values shown are approximate estimates only." },
      { q: "How do private seller feed posts work?", a: "Sellers can set posts as private and set a price. Buyers unlock private posts individually from wallet balance." },
      { q: "Can buyers follow sellers and save posts?", a: "Yes. Buyers can follow sellers, use Following feed filters, and save posts for quick access." },
      { q: "Can sellers schedule posts?", a: "Yes. Sellers can schedule feed posts for future publish times and manage schedule from the seller dashboard." },
      { q: "Can sellers control notifications?", a: "Yes. Sellers can filter notifications and toggle message or engagement alerts on/off." },
      { q: "What does Independent seller mean?", a: "Independent means the seller is responsible for their own shipping and organization. Many buyers prefer sellers attached to a bar because bar-affiliated operations are often more structured and reliable." },
      { q: "How does the appeals process work?", a: "If your account is frozen or has active strikes, go to the appeals page and submit your explanation. Include relevant context (dates, order/request IDs, and what happened). Admin reviews appeals and posts decisions in your appeal history." },
      { q: "What is your policy on abusive language?", a: "Abusive or offensive language is not tolerated. We enforce a two-strikes policy." },
      { q: "What happens if sellers block a buyer?", a: "If a buyer is blocked by two sellers, the buyer account is blocked from the site." }
    ],
    sellerStandardsEyebrow: "Seller Policy",
    sellerStandardsTitle: "Seller Standards",
    sellerStandardsSubtitle: "Quality, communication, and feed/content requirements for seller participation.",
    sellerStandardsPoints: [
      "Listings and feed posts must be accurate, clearly photographed, and categorized with correct details.",
      "Sellers should maintain responsive communication and keep profile, inventory, and feed status up to date.",
      "Private feed pricing, custom requests, and messaging behavior must follow platform policies and respectful conduct."
    ],
    howToApplyEyebrow: "For Sellers",
    howToApplyTitle: "How to Apply",
    howToApplySubtitle: "Steps for joining Thailand Panties as a seller.",
    howToApplyPoints: [
      "Complete the seller application with profile details, location, and specialty.",
      "Prepare storefront images, listing examples, and clear policy acknowledgements.",
      "After approval, configure your dashboard, post settings (public/private), and feed preferences."
    ],
    sellerGuidelinesEyebrow: "For Sellers",
    sellerGuidelinesTitle: "Seller Guidelines",
    sellerGuidelinesSubtitle: "Best practices for trusted listings, seller feed growth, and buyer satisfaction.",
    sellerGuidelinesPoints: [
      "Use clear images, accurate sizing, and complete metadata for products and posts.",
      "Use feed tools responsibly: set private/public visibility intentionally and keep pricing transparent.",
      "Respond quickly to messages and custom requests, and keep your notification preferences configured."
    ],
    portfolioSetupEyebrow: "For Sellers",
    portfolioSetupTitle: "Portfolio Setup",
    portfolioSetupSubtitle: "How to structure your storefront, profile, and seller feed for discoverability.",
    portfolioSetupPoints: [
      "Add a concise bio, location, languages, and profile image so buyers can trust your page quickly.",
      "Keep product categories and seller feed content consistent so filtering and discovery work better.",
      "Use scheduled posts, saved content review, and analytics insights to keep your storefront active."
    ]
  },
  th: {
    privacyEyebrow: "กฎหมาย",
    privacyTitle: "นโยบายความเป็นส่วนตัว",
    privacySubtitle: "วิธีที่ Thailand Panties เก็บ ใช้งาน และปกป้องข้อมูลผู้ใช้",
    privacyPoints: [
      "เราเก็บข้อมูลบัญชี คำสั่งซื้อ ข้อความช่วยเหลือ ข้อมูลสินค้า และกิจกรรมฟีดที่จำเป็นต่อการให้บริการ",
      "ข้อมูลบัตรชำระเงินถูกจัดการโดยผู้ให้บริการชำระเงิน เราไม่เก็บหมายเลขบัตรเต็มหรือรหัสความปลอดภัย",
      "บันทึกคำสั่งซื้อ กระเป๋าเงิน การปลดล็อกโพสต์ และการดูแลชุมชน ถูกเก็บไว้เพื่อความปลอดภัยและการช่วยเหลือ",
      "การใช้งานแพลตฟอร์มถือว่ายอมรับการบันทึกด้านความปลอดภัยและการบังคับใช้นโยบาย"
    ],
    contactEyebrow: "ช่วยเหลือ",
    contactTitle: "ติดต่อเรา",
    contactSubtitle: "ติดต่อทีม Thailand Panties สำหรับการช่วยเหลือและคำถามด้านนโยบาย",
    contactEmailLabel: "อีเมล:",
    contactLocationLabel: "ที่ตั้ง:",
    contactHoursLabel: "เวลาทำการ:",
    contactLocationValue: "กรุงเทพฯ ประเทศไทย",
    contactHoursValue: "จันทร์-เสาร์ 9:00-18:00 ICT",
    contactNamePlaceholder: "ชื่อของคุณ",
    contactEmailPlaceholder: "อีเมล",
    contactMessagePlaceholder: "ข้อความของคุณ",
    contactSend: "ส่งข้อความ",
    orderHelpEyebrow: "ช่วยเหลือ",
    orderHelpTitle: "ช่วยเหลือคำสั่งซื้อ",
    orderHelpSubtitle: "ช่วยเหลือเรื่องเช็กเอาต์ การจัดส่ง การติดตาม และกิจกรรมการชำระเงิน",
    orderHelpPoints: [
      "ตรวจสอบอีเมลยืนยันคำสั่งซื้อ เลขติดตาม และประวัติธุรกรรมกระเป๋าเงินก่อน",
      "หากไม่พบเลขติดตาม ต้องการแก้ที่อยู่ หรือมีปัญหาการจัดส่ง โปรดติดต่อพร้อมเลขคำสั่งซื้อ",
      "หากมีคำถามเรื่องการปลดล็อกโพสต์ private หรือค่าธรรมเนียม custom request ให้ระบุอีเมลบัญชีและเวลาประมาณการ"
    ],
    faqEyebrow: "ช่วยเหลือ",
    faqTitle: "คำถามที่พบบ่อย",
    faqSubtitle: "คำตอบสำหรับผู้ซื้อและผู้ขายใน Thailand Panties",
    faqs: [
      { q: "จัดส่งเร็วแค่ไหน?", a: "จัดส่งภายใน 1-3 วันทำการหลังยืนยันการชำระเงิน" },
      { q: "ใครเป็นผู้จ่ายค่าส่ง?", a: "ผู้ซื้อจ่ายค่าส่งตามจริงตามปลายทางในขั้นตอนเช็กเอาต์" },
      { q: "ใช้ผู้ให้บริการขนส่งอะไร?", a: "เราใช้ผู้ให้บริการขนส่งระหว่างประเทศพร้อมติดตามพัสดุ" },
      { q: "แพ็กเกจเป็นความลับหรือไม่?", a: "ใช่ เราแพ็กแบบเรียบง่ายและไม่เปิดเผยสินค้า" },
      { q: "คืนเงินหรือคืนสินค้าได้ไหม?", a: "ไม่ได้ สินค้าทุกชิ้นขายขาด ไม่มีการคืนเงิน" },
      { q: "ชื่อที่ขึ้นบัตรคืออะไร?", a: "ชื่อที่ขึ้นบัตรคือ Small World Chiang Mai" },
      { q: "โพสต์แบบ private ทำงานอย่างไร?", a: "ผู้ขายตั้งโพสต์ private และตั้งราคาได้ ผู้ซื้อปลดล็อกแต่ละโพสต์ด้วยเงินในกระเป๋า" },
      { q: "ผู้ซื้อสามารถติดตามผู้ขายและบันทึกโพสต์ได้ไหม?", a: "ได้ ผู้ซื้อสามารถติดตามผู้ขายและบันทึกโพสต์ไว้ดูภายหลังได้" },
      { q: "ผู้ขายตั้งเวลาโพสต์ได้ไหม?", a: "ได้ ผู้ขายตั้งเวลาโพสต์ล่วงหน้าและจัดการตารางในแดชบอร์ดได้" },
      { q: "ผู้ขายตั้งค่าการแจ้งเตือนได้ไหม?", a: "ได้ ผู้ขายกรองการแจ้งเตือนและเปิด/ปิดการแจ้งเตือนแต่ละประเภทได้" },
      { q: "เว็บไซต์ใช้สกุลเงินอะไร?", a: "ราคา ค่ากระเป๋าเงิน ค่าปลดล็อก และค่าข้อความทั้งหมดคิดเป็นเงินบาท (THB) โดยมูลค่าในสกุลเงินอื่นที่แสดงเป็นเพียงการประมาณการเท่านั้น" }
    ],
    sellerStandardsEyebrow: "นโยบายผู้ขาย",
    sellerStandardsTitle: "มาตรฐานผู้ขาย",
    sellerStandardsSubtitle: "มาตรฐานคุณภาพ การสื่อสาร และเนื้อหาฟีดสำหรับผู้ขาย",
    sellerStandardsPoints: [
      "ข้อมูลสินค้าและโพสต์ต้องชัดเจน ถูกต้อง และจัดหมวดหมู่ครบถ้วน",
      "ตอบลูกค้าให้รวดเร็ว และอัปเดตข้อมูลโปรไฟล์/สต็อก/สถานะฟีดสม่ำเสมอ",
      "การตั้งราคา private และการสื่อสารต้องเป็นไปตามนโยบายและสุภาพ"
    ],
    howToApplyEyebrow: "สำหรับผู้ขาย",
    howToApplyTitle: "วิธีสมัครผู้ขาย",
    howToApplySubtitle: "ขั้นตอนการเข้าร่วมเป็นผู้ขายใน Thailand Panties",
    howToApplyPoints: [
      "กรอกข้อมูลโปรไฟล์ผู้ขายให้ครบ เช่น ที่ตั้งและความเชี่ยวชาญ",
      "เตรียมรูปหน้าร้าน ตัวอย่างสินค้า และยอมรับนโยบายที่เกี่ยวข้อง",
      "เมื่ออนุมัติแล้ว ให้ตั้งค่าแดชบอร์ดและการแสดงผลโพสต์ public/private"
    ],
    sellerGuidelinesEyebrow: "สำหรับผู้ขาย",
    sellerGuidelinesTitle: "แนวทางผู้ขาย",
    sellerGuidelinesSubtitle: "แนวทางเพื่อเพิ่มความน่าเชื่อถือและประสบการณ์ที่ดีของผู้ซื้อ",
    sellerGuidelinesPoints: [
      "ใช้รูปชัดเจน ระบุไซซ์/รายละเอียดให้ครบถ้วน",
      "ใช้เครื่องมือฟีดอย่างโปร่งใส โดยเฉพาะการตั้งค่า private/public และราคา",
      "ตอบข้อความและคำขอพิเศษอย่างรวดเร็ว พร้อมตั้งค่าการแจ้งเตือนให้เหมาะสม"
    ],
    portfolioSetupEyebrow: "สำหรับผู้ขาย",
    portfolioSetupTitle: "ตั้งค่าโปรไฟล์ร้าน",
    portfolioSetupSubtitle: "จัดโครงสร้างหน้าร้าน โปรไฟล์ และฟีดให้ค้นหาเจอง่าย",
    portfolioSetupPoints: [
      "เพิ่มไบโอ ที่ตั้ง ภาษา และรูปโปรไฟล์เพื่อเพิ่มความน่าเชื่อถือ",
      "ทำหมวดสินค้าและเนื้อหาฟีดให้สอดคล้องกันเพื่อการค้นหา/กรองที่ดีขึ้น",
      "ใช้โพสต์แบบตั้งเวลาและข้อมูลเชิงลึกเพื่อรักษาความเคลื่อนไหวของร้าน"
    ]
  },
  my: {
    privacyEyebrow: "ဥပဒေ",
    privacyTitle: "ကိုယ်ရေးကိုယ်တာ မူဝါဒ",
    privacySubtitle: "Thailand Panties တွင် data ကို စုဆောင်း၊ အသုံးပြု၊ ကာကွယ်ပုံ",
    privacyPoints: [
      "Marketplace လည်ပတ်ရန်လိုအပ်သော account, order, support message, listing နှင့် feed interaction data များကို စုဆောင်းပါသည်",
      "Card payment data ကို payment provider က ကိုင်တွယ်ပါသည်။ Card number အပြည့်နှင့် security code များကို မသိမ်းဆည်းပါ",
      "Order, wallet, unlock နှင့် moderation record များကို လုံခြုံရေးနှင့် support အတွက် သိမ်းဆည်းပါသည်",
      "Platform အသုံးပြုခြင်းဖြင့် moderation/safety logging ကို သဘောတူသည်ဟု မှတ်ယူပါသည်"
    ],
    contactEyebrow: "အကူအညီ",
    contactTitle: "ဆက်သွယ်ရန်",
    contactSubtitle: "Support, onboarding နှင့် policy ဆိုင်ရာ မေးမြန်းမှုများအတွက် ဆက်သွယ်ပါ",
    contactEmailLabel: "အီးမေးလ်:",
    contactLocationLabel: "တည်နေရာ:",
    contactHoursLabel: "လုပ်ငန်းချိန်:",
    contactLocationValue: "Bangkok, Thailand",
    contactHoursValue: "Mon-Sat, 9:00-18:00 ICT",
    contactNamePlaceholder: "သင့်အမည်",
    contactEmailPlaceholder: "အီးမေးလ်",
    contactMessagePlaceholder: "သင့်မက်ဆေ့ချ်",
    contactSend: "မက်ဆေ့ချ်ပို့ရန်",
    orderHelpEyebrow: "အကူအညီ",
    orderHelpTitle: "Order အကူအညီ",
    orderHelpSubtitle: "Checkout, shipping, tracking နှင့် paid feature activity များအတွက် အကူအညီ",
    orderHelpPoints: [
      "နောက်ဆုံးအခြေအနေအတွက် order confirmation, tracking နှင့် wallet transaction history ကို စစ်ဆေးပါ",
      "Tracking မရရှိခြင်း၊ လိပ်စာပြောင်းလဲမှု၊ ပို့ဆောင်ရေးပြဿနာများအတွက် order number ဖြင့် support ကိုဆက်သွယ်ပါ",
      "Private post unlock/custom request fee မေးခွန်းများတွင် account email နှင့် ခန့်မှန်းအချိန် ထည့်သွင်းပေးပါ"
    ],
    faqEyebrow: "အကူအညီ",
    faqTitle: "မေးလေ့ရှိသော မေးခွန်းများ",
    faqSubtitle: "Thailand Panties အသုံးပြုသူများအတွက် ဖြေကြားချက်များ",
    faqs: [
      { q: "ပို့ဆောင်ချိန်ဘယ်လောက်?", a: "ငွေပေးချေမှုအတည်ပြုပြီး 1-3 ရက်အတွင်း ပို့ဆောင်ပါသည်" },
      { q: "ပို့ဆောင်ခကို ဘယ်သူပေးမလဲ?", a: "ဝယ်သူက checkout တွင်ပြထားသည့် ပို့ဆောင်ခအတိုင်း ပေးဆောင်ပါသည်" },
      { q: "ဘယ် carrier သုံးလဲ?", a: "နိုင်ငံတကာ carrier များဖြင့် tracking ပါဝင်စွာ ပို့ဆောင်ပါသည်" },
      { q: "ထုပ်ပိုးမှု လျှို့ဝှက်ပါသလား?", a: "ဟုတ်ကဲ့ plain packaging ဖြင့် လျှို့ဝှက်စွာ ပို့ဆောင်ပါသည်" },
      { q: "ပြန်အမ်း/ပြန်လဲ ရနိုင်ပါသလား?", a: "မရနိုင်ပါ။ အရောင်းအားလုံး final sale ဖြစ်ပါသည်" },
      { q: "Private post တွေဘယ်လိုလုပ်သလဲ?", a: "Seller က private + စျေးနှုန်း သတ်မှတ်နိုင်ပြီး buyer က wallet ဖြင့် post တစ်ခုပြီးတစ်ခု unlock လုပ်နိုင်သည်" },
      { q: "Independent seller ဆိုတာဘာလဲ?", a: "Independent seller ဆိုသည်မှာ shipping နှင့် organization ကို seller ကိုယ်တိုင် စီမံရသည်ဟု ဆိုလိုပါသည်။ Bar နှင့်ချိတ်ဆက်ထားသော seller များမှာ အများအားဖြင့် ပိုမိုစနစ်တကျဖြစ်သောကြောင့် ယုံကြည်စိတ်ချရမှု များသောအားဖြင့် မြင့်မားပါသည်။" },
      { q: "Platform က ဘယ် currency သုံးလဲ?", a: "Listing price, wallet fee, unlock fee, message fee အားလုံးကို Thai baht (THB) နဲ့တွက်ချက်ပါတယ်။ အခြား currency ပြထားတာတွေက ခန့်မှန်းတန်ဖိုးသာ ဖြစ်ပါတယ်။" }
    ],
    sellerStandardsEyebrow: "Seller Policy",
    sellerStandardsTitle: "Seller စံနှုန်းများ",
    sellerStandardsSubtitle: "အရည်အသွေး၊ ဆက်သွယ်မှုနှင့် feed/content စံနှုန်းများ",
    sellerStandardsPoints: [
      "စာရင်းနှင့် post အချက်အလက်များကို မှန်ကန်ပြီး ရှင်းလင်းစွာ တင်ရန်",
      "ဝယ်သူနှင့် မြန်ဆန်စွာ ဆက်သွယ်ပြီး profile/feed ကို update လုပ်ရန်",
      "Private pricing နှင့် ဆက်သွယ်ရေးများကို policy နှင့်အညီ လိုက်နာရန်"
    ],
    howToApplyEyebrow: "Seller များအတွက်",
    howToApplyTitle: "လျှောက်ထားနည်း",
    howToApplySubtitle: "Thailand Panties တွင် seller အဖြစ်ဝင်ရောက်ရန် အဆင့်များ",
    howToApplyPoints: [
      "Profile, location, specialty အချက်အလက်များကို ဖြည့်သွင်းပါ",
      "Storefront image နှင့် listing နမူနာများကို ပြင်ဆင်ပါ",
      "Approve ဖြစ်ပြီးနောက် dashboard နှင့် post visibility ကို စနစ်တကျ သတ်မှတ်ပါ"
    ],
    sellerGuidelinesEyebrow: "Seller များအတွက်",
    sellerGuidelinesTitle: "Seller လမ်းညွှန်",
    sellerGuidelinesSubtitle: "ယုံကြည်ရသော listing နှင့် buyer အတွေ့အကြုံအတွက် အကောင်းဆုံးလမ်းညွှန်",
    sellerGuidelinesPoints: [
      "ပုံများကိုရှင်းလင်းစွာတင်ပြီး metadata ကိုပြည့်စုံစွာထည့်ပါ",
      "Public/Private feed settings နှင့် စျေးနှုန်းကို ပွင့်လင်းစွာ စီမံပါ",
      "Message နှင့် custom request များကို မြန်ဆန်စွာတုံ့ပြန်ပါ"
    ],
    portfolioSetupEyebrow: "Seller များအတွက်",
    portfolioSetupTitle: "Portfolio Setup",
    portfolioSetupSubtitle: "Storefront နှင့် feed ကို ရှာဖွေရလွယ်ကူအောင် စီမံနည်း",
    portfolioSetupPoints: [
      "Bio, location, language, profile image ထည့်သွင်းပါ",
      "Product category နှင့် feed content တစ်သမတ်တည်းထားပါ",
      "Scheduled post နှင့် analytics ကိုအသုံးပြု၍ storefront ကို active ထားပါ"
    ]
  },
  ru: {
    privacyEyebrow: "Юридическое",
    privacyTitle: "Политика конфиденциальности",
    privacySubtitle: "Как Thailand Panties собирает, использует и защищает данные пользователей.",
    privacyPoints: [
      "Мы собираем данные аккаунта, заказов, обращений в поддержку, контента объявлений и активности в ленте, необходимые для работы платформы.",
      "Платежные данные карты обрабатываются платежным провайдером. Мы не храним полный номер карты и CVV.",
      "Данные заказов, кошелька, разблокировок и модерации сохраняются для безопасности, исполнения заказов и поддержки.",
      "Используя платформу, пользователь соглашается с журналированием событий безопасности и модерации."
    ],
    contactEyebrow: "Поддержка",
    contactTitle: "Связаться с нами",
    contactSubtitle: "Свяжитесь с командой Thailand Panties по вопросам поддержки и правил.",
    contactEmailLabel: "Email:",
    contactLocationLabel: "Локация:",
    contactHoursLabel: "Часы работы:",
    contactLocationValue: "Бангкок, Таиланд",
    contactHoursValue: "Пн-Сб, 9:00-18:00 ICT",
    contactNamePlaceholder: "Ваше имя",
    contactEmailPlaceholder: "Email",
    contactMessagePlaceholder: "Ваше сообщение",
    contactSend: "Отправить сообщение",
    orderHelpEyebrow: "Поддержка",
    orderHelpTitle: "Помощь по заказу",
    orderHelpSubtitle: "Помощь по оплате, доставке, трекингу и платным функциям.",
    orderHelpPoints: [
      "Сначала проверьте подтверждение заказа, трек-номер и историю транзакций кошелька.",
      "При проблемах с трекингом, адресом или доставкой обратитесь в поддержку с номером заказа.",
      "По вопросам разблокировки private-постов или комиссии custom request укажите email аккаунта и примерное время."
    ],
    faqEyebrow: "Поддержка",
    faqTitle: "Часто задаваемые вопросы",
    faqSubtitle: "Ответы для покупателей и продавцов Thailand Panties.",
    faqs: [
      { q: "Как быстро отправляются заказы?", a: "Отправка выполняется в течение 1-3 рабочих дней после подтверждения оплаты." },
      { q: "Кто оплачивает доставку?", a: "Покупатель оплачивает точную стоимость доставки по своему направлению." },
      { q: "Какой перевозчик используется?", a: "Мы используем международных перевозчиков с отслеживанием." },
      { q: "Упаковка дискретная?", a: "Да, все заказы отправляются в нейтральной внешней упаковке." },
      { q: "Есть ли возвраты?", a: "Нет, все продажи окончательные, возвраты не предусмотрены." },
      { q: "Как работают private-посты?", a: "Продавец может сделать пост приватным и задать цену, покупатель разблокирует пост из баланса кошелька." },
      { q: "В какой валюте работают цены на платформе?", a: "Все цены, списания кошелька, стоимость разблокировок и сообщений рассчитываются в тайских батах (THB). Любые значения в других валютах на сайте являются ориентировочными оценками." }
    ],
    sellerStandardsEyebrow: "Политика продавцов",
    sellerStandardsTitle: "Стандарты продавца",
    sellerStandardsSubtitle: "Качество, коммуникация и правила контента/ленты.",
    sellerStandardsPoints: [
      "Карточки и посты должны быть точными, понятными и корректно заполненными.",
      "Продавец должен быстро отвечать и регулярно обновлять профиль/статус.",
      "Private-цены и общение должны соответствовать правилам платформы."
    ],
    howToApplyEyebrow: "Для продавцов",
    howToApplyTitle: "Как подать заявку",
    howToApplySubtitle: "Шаги для подключения к Thailand Panties в роли продавца.",
    howToApplyPoints: [
      "Заполните профиль продавца: локация, специализация, описание.",
      "Подготовьте изображения витрины и примеры объявлений.",
      "После одобрения настройте панель продавца и видимость постов."
    ],
    sellerGuidelinesEyebrow: "Для продавцов",
    sellerGuidelinesTitle: "Рекомендации продавцу",
    sellerGuidelinesSubtitle: "Практики для доверия покупателей и стабильных продаж.",
    sellerGuidelinesPoints: [
      "Используйте качественные фото и полные параметры товара/поста.",
      "Прозрачно управляйте public/private постами и ценами unlock.",
      "Быстро отвечайте на сообщения и custom requests."
    ],
    portfolioSetupEyebrow: "Для продавцов",
    portfolioSetupTitle: "Настройка портфолио",
    portfolioSetupSubtitle: "Как оформить профиль, витрину и ленту для лучшей видимости.",
    portfolioSetupPoints: [
      "Добавьте био, локацию, языки и фото профиля.",
      "Сохраняйте единый стиль категорий и контента в ленте.",
      "Используйте отложенные посты и аналитику для активного профиля."
    ]
  }
};

const MARKETPLACE_I18N = {
  en: {
    marketplace: "Marketplace",
    sellerPortfoliosTitle: "Seller Portfolios",
    sellerPortfoliosSubtitle: "Browse independent storefronts and discover each seller's listing style.",
    searchSellers: "Search sellers",
    searchSellersPlaceholder: "Search seller name, bio, style, or language",
    location: "Location",
    specialty: "Specialty",
    type: "Type",
    size: "Size",
    color: "Color",
    fabric: "Fabric",
    daysWorn: "Days worn",
    scent: "Scent",
    language: "Language",
    onlineStatus: "Online status",
    clearFilters: "Clear filters",
    sellersMatchSuffix: "seller(s) match your filters.",
    barPrefix: "Bar:",
    sellerFallback: "Seller",
    listings: "listings",
    types: "types",
    onlineNow: "Online now",
    viewProfile: "View profile",
    shippingCoverage: "Shipping",
    typicalShipTime: "Typical ship time",
    noSellersMatch: "No sellers match the selected filters yet.",
    findTitle: "Find",
    findSubtitle: "Discover recent uploads fast with focused filters.",
    searchProducts: "Search products",
    searchProductsPlaceholder: "Search title, type, color, or seller",
    condition: "Condition",
    price: "Price",
    seller: "Seller",
    productsMatchSuffix: "product(s) match your filters.",
    recentUploads: "Recent uploads",
    thbNotice: "All final prices are in Thai baht (THB). Displayed non-THB equivalents are estimates only.",
    noUploadsMatch: "No uploads match your current filters.",
  },
  th: {
    marketplace: "มาร์เก็ตเพลส",
    sellerPortfoliosTitle: "พอร์ตผู้ขาย",
    sellerPortfoliosSubtitle: "เรียกดูหน้าร้านอิสระและดูสไตล์สินค้าของผู้ขายแต่ละคน",
    searchSellers: "ค้นหาผู้ขาย",
    searchSellersPlaceholder: "ค้นหาชื่อผู้ขาย ไบโอ สไตล์ หรือภาษา",
    location: "ที่ตั้ง",
    specialty: "ความเชี่ยวชาญ",
    type: "ประเภท",
    size: "ไซซ์",
    color: "สี",
    fabric: "เนื้อผ้า",
    daysWorn: "จำนวนวันที่สวม",
    scent: "กลิ่น",
    language: "ภาษา",
    onlineStatus: "สถานะออนไลน์",
    clearFilters: "ล้างตัวกรอง",
    sellersMatchSuffix: "ผู้ขายตรงกับตัวกรองของคุณ",
    barPrefix: "บาร์:",
    sellerFallback: "ผู้ขาย",
    listings: "รายการสินค้า",
    types: "ประเภท",
    onlineNow: "ออนไลน์ตอนนี้",
    viewProfile: "ดูโปรไฟล์",
    shippingCoverage: "การจัดส่ง",
    typicalShipTime: "เวลาจัดส่งโดยทั่วไป",
    noSellersMatch: "ยังไม่มีผู้ขายที่ตรงกับตัวกรองที่เลือก",
    findTitle: "ค้นหา",
    findSubtitle: "ค้นหาอัปโหลดล่าสุดได้รวดเร็วด้วยตัวกรองที่เจาะจง",
    searchProducts: "ค้นหาสินค้า",
    searchProductsPlaceholder: "ค้นหาชื่อสินค้า ประเภท สี หรือผู้ขาย",
    condition: "สภาพ",
    price: "ราคา",
    seller: "ผู้ขาย",
    productsMatchSuffix: "สินค้าตรงกับตัวกรองของคุณ",
    recentUploads: "อัปโหลดล่าสุด",
    thbNotice: "ราคาสุดท้ายทั้งหมดเป็นเงินบาท (THB) มูลค่าในสกุลอื่นเป็นเพียงการประมาณการ",
    noUploadsMatch: "ไม่มีอัปโหลดที่ตรงกับตัวกรองปัจจุบัน",
  },
  my: {
    marketplace: "Marketplace",
    sellerPortfoliosTitle: "Seller Portfolios",
    sellerPortfoliosSubtitle: "လွတ်လပ်သော storefront များကို ကြည့်ရှုပြီး seller တစ်ဦးချင်း၏ listing စတိုင်ကို ရှာဖွေပါ။",
    searchSellers: "seller များ ရှာရန်",
    searchSellersPlaceholder: "seller အမည်၊ bio၊ style သို့မဟုတ် language ဖြင့် ရှာပါ",
    location: "တည်နေရာ",
    specialty: "အထူးပြု",
    type: "အမျိုးအစား",
    size: "အရွယ်အစား",
    color: "အရောင်",
    fabric: "အထည်အမျိုးအစား",
    daysWorn: "ဝတ်ထားသည့်ရက်",
    scent: "အနံ့",
    language: "ဘာသာစကား",
    onlineStatus: "အွန်လိုင်း အခြေအနေ",
    clearFilters: "filters များကို ရှင်းရန်",
    sellersMatchSuffix: "seller(s) သင့် filter နှင့် ကိုက်ညီသည်။",
    barPrefix: "Bar:",
    sellerFallback: "Seller",
    listings: "listing များ",
    types: "အမျိုးအစားများ",
    onlineNow: "ယခု အွန်လိုင်း",
    viewProfile: "ပရိုဖိုင်ကြည့်ရန်",
    shippingCoverage: "ပို့ဆောင်မှု",
    typicalShipTime: "ပုံမှန်ပို့ဆောင်ချိန်",
    noSellersMatch: "ရွေးထားသော filters နှင့် ကိုက်ညီသော seller မရှိသေးပါ။",
    findTitle: "Find",
    findSubtitle: "တိကျသော filters ဖြင့် recent uploads ကို မြန်မြန်ရှာဖွေပါ။",
    searchProducts: "product များ ရှာရန်",
    searchProductsPlaceholder: "title၊ type၊ color သို့မဟုတ် seller ဖြင့် ရှာပါ",
    condition: "အခြေအနေ",
    price: "စျေးနှုန်း",
    seller: "Seller",
    productsMatchSuffix: "product(s) သင့် filter နှင့် ကိုက်ညီသည်။",
    recentUploads: "Recent uploads",
    thbNotice: "နောက်ဆုံးစျေးနှုန်းအားလုံး THB ဖြစ်သည်။ အခြားငွေကြေးပြောင်းလဲမှုတန်ဖိုးများသည် ခန့်မှန်းချက်သာဖြစ်သည်။",
    noUploadsMatch: "လက်ရှိ filters နှင့် ကိုက်ညီသော uploads မရှိပါ။",
  },
  ru: {
    marketplace: "Маркетплейс",
    sellerPortfoliosTitle: "Портфолио продавцов",
    sellerPortfoliosSubtitle: "Просматривайте независимые витрины и стиль листингов каждого продавца.",
    searchSellers: "Поиск продавцов",
    searchSellersPlaceholder: "Ищите по имени продавца, био, стилю или языку",
    location: "Локация",
    specialty: "Специализация",
    type: "Тип",
    size: "Размер",
    color: "Цвет",
    fabric: "Ткань",
    daysWorn: "Дней ношения",
    scent: "Запах",
    language: "Язык",
    onlineStatus: "Онлайн-статус",
    clearFilters: "Сбросить фильтры",
    sellersMatchSuffix: "продавцов соответствуют фильтрам.",
    barPrefix: "Бар:",
    sellerFallback: "Продавец",
    listings: "листингов",
    types: "типов",
    onlineNow: "Сейчас онлайн",
    viewProfile: "Открыть профиль",
    shippingCoverage: "Доставка",
    typicalShipTime: "Обычное время отправки",
    noSellersMatch: "Нет продавцов, подходящих под выбранные фильтры.",
    findTitle: "Поиск",
    findSubtitle: "Быстро находите свежие загрузки с точечными фильтрами.",
    searchProducts: "Поиск товаров",
    searchProductsPlaceholder: "Ищите по названию, типу, цвету или продавцу",
    condition: "Состояние",
    price: "Цена",
    seller: "Продавец",
    productsMatchSuffix: "товаров соответствуют фильтрам.",
    recentUploads: "Последние загрузки",
    thbNotice: "Все итоговые цены указаны в тайских батах (THB). Значения в других валютах являются приблизительными.",
    noUploadsMatch: "Нет загрузок, соответствующих текущим фильтрам.",
  },
};

function marketplaceText(uiLanguage = "en") {
  return MARKETPLACE_I18N[uiLanguage] || MARKETPLACE_I18N.en;
}

function helpText(uiLanguage) {
  return HELP_I18N[uiLanguage] || HELP_I18N.en;
}

export function PrivacyPolicyPage({ uiLanguage = "en" }) {
  const text = helpText(uiLanguage);
  return (
    <PageShell eyebrow={text.privacyEyebrow} title={text.privacyTitle} subtitle={text.privacySubtitle}>
      <div className="space-y-6 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.privacyPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function TermsPage() {
  return (
    <PageShell eyebrow="Legal" title="Terms of Service" subtitle="The Thailand Panties rules for buyers, sellers, and platform usage.">
      <div className="space-y-6 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        <p>Users must provide accurate account information and follow all marketplace policies for listing quality, communication, and safety.</p>
        <p>All orders are final sale, except when the buyer receives the wrong item and provides reviewable evidence through the refund evidence form.</p>
        <p>All chargebacks are disputed. We submit evidence of the buyer's agreement to these Terms of Service and their usage activity on the site.</p>
        <p>All listed prices, wallet charges, unlock fees, and messaging fees are processed in Thai baht (THB). Any converted non-THB values shown on the site are estimates only and may vary by provider rates.</p>
        <p>Abusive or offensive language is prohibited. The platform enforces a two-strikes conduct policy and may suspend accounts for violations.</p>
        <p>If a buyer is blocked by two sellers, the buyer account is blocked from the site.</p>
        <p>Payment charges appear on card statements as <span className="font-semibold text-slate-900">Small World Chiang Mai</span>.</p>
      </div>
    </PageShell>
  );
}

export function ShippingPolicyPage() {
  return (
    <PageShell eyebrow="Policy" title="Shipping Policy" subtitle="How orders are dispatched, priced, and delivered worldwide from Thailand.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><h3 className="text-xl font-semibold">Dispatch window</h3><p className="mt-3 text-slate-600">Orders ship in 1-3 business days after the order is placed and confirmed.</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><h3 className="text-xl font-semibold">Carrier</h3><p className="mt-3 text-slate-600">All shipments are sent with international carriers and include tracking once dispatched.</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><h3 className="text-xl font-semibold">Shipping cost</h3><p className="mt-3 text-slate-600">Buyers pay the exact shipping cost shown at checkout for their destination.</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><h3 className="text-xl font-semibold">Coverage and packaging</h3><p className="mt-3 text-slate-600">We ship worldwide and package all orders discreetly for privacy.</p></div>
      </div>
    </PageShell>
  );
}

export function RefundPolicyPage() {
  return (
    <PageShell eyebrow="Policy" title="Refund Policy" subtitle="Important purchase terms for all buyers.">
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        <p className="font-semibold text-slate-900">All sales are final, except wrong-item deliveries with submitted evidence.</p>
        <p>Due to the nature of products sold on the marketplace, we do not provide returns, exchanges, partial refunds, or cancellations after purchase, unless the delivered item is materially different from the order and evidence is submitted for review.</p>
        <p>All chargebacks are disputed. We submit evidence of the buyer's agreement to the Terms of Service and their usage activity on the site.</p>
        <p>Buyers are responsible for reviewing listing details, shipping costs, and seller information before checkout.</p>
      </div>
    </PageShell>
  );
}

export function SellerStandardsPage({ uiLanguage = "en" }) {
  const text = helpText(uiLanguage);
  return (
    <PageShell eyebrow={text.sellerStandardsEyebrow} title={text.sellerStandardsTitle} subtitle={text.sellerStandardsSubtitle}>
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.sellerStandardsPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function ContactPage({ uiLanguage = "en" }) {
  const text = helpText(uiLanguage);
  return (
    <PageShell eyebrow={text.contactEyebrow} title={text.contactTitle} subtitle={text.contactSubtitle}>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
          <p><span className="font-semibold text-slate-900">{text.contactEmailLabel}</span> hello@thailandpanties.com</p>
          <p className="mt-3"><span className="font-semibold text-slate-900">{text.contactLocationLabel}</span> {text.contactLocationValue}</p>
          <p className="mt-3"><span className="font-semibold text-slate-900">{text.contactHoursLabel}</span> {text.contactHoursValue}</p>
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-rose-100">
          <div className="grid gap-4">
            <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={text.contactNamePlaceholder} />
            <input className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={text.contactEmailPlaceholder} />
            <textarea className="min-h-[160px] rounded-2xl border border-slate-200 px-4 py-3" placeholder={text.contactMessagePlaceholder} />
            <button className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">{text.contactSend}</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export function RefundEvidencePage({ currentUser, submitRefundEvidence, navigate }) {
  const [form, setForm] = useState({
    orderId: "",
    expectedItem: "",
    receivedItem: "",
    evidenceDetails: "",
    evidenceLinks: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  const isBuyer = currentUser?.role === "buyer";

  return (
    <PageShell eyebrow="Support" title="Refund Evidence Form" subtitle="Submit wrong-item evidence for refund review.">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-md ring-1 ring-rose-100">
        {!isBuyer ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
            Please login as a buyer to submit refund evidence.
            <div className="mt-3">
              <button onClick={() => navigate("/login")} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900">Go to login</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Refunds are only reviewed for wrong-item deliveries. Include order details, clear evidence summary, and links/screenshots so admin can verify quickly.
            </p>
            <input
              value={form.orderId}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, orderId: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Order ID (example: order_123456)"
            />
            <input
              value={form.expectedItem}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, expectedItem: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="What you ordered"
            />
            <input
              value={form.receivedItem}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, receivedItem: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="What you received"
            />
            <textarea
              value={form.evidenceDetails}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, evidenceDetails: event.target.value }));
              }}
              className="min-h-[140px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Describe the mismatch and any supporting details (timestamps, packaging notes, tracking, etc.)"
            />
            <textarea
              value={form.evidenceLinks}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, evidenceLinks: event.target.value }));
              }}
              className="min-h-[90px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Evidence links (one per line: screenshots, photos, video, cloud links)"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  submitRefundEvidence(
                    form,
                    (message) => {
                      setStatusMessage(message || "Evidence submitted.");
                      setForm({
                        orderId: "",
                        expectedItem: "",
                        receivedItem: "",
                        evidenceDetails: "",
                        evidenceLinks: "",
                      });
                    },
                    (message) => setStatusMessage(message || "Unable to submit evidence."),
                  );
                }}
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Submit evidence
              </button>
              <button onClick={() => navigate("/faq")} className="rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700">
                Back to FAQ
              </button>
            </div>
            {statusMessage ? <div className="text-sm font-medium text-slate-700">{statusMessage}</div> : null}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export function FaqPage({ uiLanguage = "en", navigate }) {
  const text = helpText(uiLanguage);
  const allFaqs = Array.isArray(text.faqs) ? text.faqs : [];
  const sellerSignals = /(seller|sellers|seller dashboard|seller feed|independent seller|ผู้ขาย|แดชบอร์ดผู้ขาย|ရောင်းသူ|seller\s*dashboard|продав|панель продавца)/i;
  const sellerFaqs = allFaqs.filter((faq) => sellerSignals.test(`${faq?.q || ""} ${faq?.a || ""}`));
  const buyerFaqs = allFaqs.filter((faq) => !sellerSignals.test(`${faq?.q || ""} ${faq?.a || ""}`));
  const hasSellerSection = sellerFaqs.length > 0;

  const renderFaqCard = (faq) => (
    <div key={faq.q} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
      <h3 className="text-lg font-semibold">{faq.q}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{faq.a}</p>
    </div>
  );

  return (
    <PageShell eyebrow={text.faqEyebrow} title={text.faqTitle} subtitle={text.faqSubtitle}>
      <div className="grid gap-4">
        <div className="rounded-3xl border border-rose-100 bg-rose-50/40 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Buyer FAQ</h3>
          <div className="mt-4 grid gap-4">
            {(hasSellerSection ? buyerFaqs : allFaqs).map(renderFaqCard)}
          </div>
        </div>
        {hasSellerSection ? (
          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Seller FAQ</h3>
            <div className="mt-4 grid gap-4">
              {sellerFaqs.map(renderFaqCard)}
            </div>
          </div>
        ) : null}
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Wrong item refund evidence</h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            If you received the wrong item, submit evidence for review. Approved wrong-item claims can be refunded.
          </p>
          <button
            onClick={() => navigate?.("/refund-evidence")}
            className="mt-3 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Open refund evidence form
          </button>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Account appeals</h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">
            Need to contest strikes or a frozen account? Use the appeals center to submit your case and track review outcomes.
          </p>
          <button
            onClick={() => navigate?.("/appeals")}
            className="mt-3 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Open appeals page
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export function CommunityStandardsPage() {
  return (
    <PageShell eyebrow="Policy" title="Community Standards" subtitle="Conduct rules for respectful communication between buyers, sellers, and support.">
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        <p>Abusive, threatening, discriminatory, or offensive language is not tolerated in messages, requests, or support interactions.</p>
        <p>We enforce a two-strikes moderation policy for abusive behavior. Repeated violations can result in account suspension or removal.</p>
        <p>If a buyer is blocked by two sellers, that buyer account is blocked from the marketplace.</p>
      </div>
    </PageShell>
  );
}

const CUSTOM_REQUESTS_I18N = {
  en: {
    eyebrow: "Marketplace",
    title: "Custom Requests",
    subtitle: "A structured request flow for premium listing inquiries and seller availability.",
    submitFee: "Submitting a custom request costs",
    openFee: "Once opened, custom request messages cost",
    perMessageBoth: "per message for buyers. Sellers can reply for free.",
    loginBuyer: "Login as a buyer to send custom requests.",
    recentRequests: "Your recent requests",
    noRequests: "No requests submitted yet.",
    noMessages: "No messages yet.",
    replyPlaceholder: "Reply in this request",
    send: "Send",
    addWalletToSend: "Add at least",
    toWalletSend: "to your wallet to send a message.",
    sellerQuote: "Seller quote",
    yourCounter: "your counter",
    sellerNote: "Seller note:",
    waitingCounter: "Waiting for seller response to your counter-offer of",
    quoteAcceptedPaid: "Quote accepted and paid.",
    acceptPay: "Accept & pay",
    quoteDeclined: "Quote declined.",
    decline: "Decline",
    counterAmount: "Counter amount (THB)",
    counterSent: "Counter sent.",
    messageFeeCharged: "message fee charged.",
    counterLabel: "Counter",
    counterRequiresFee: "Counter-offers require the regular message fee:",
    seller: "Seller",
    selectSeller: "Select seller",
    yourName: "Your name",
    email: "Email",
    detailsPlaceholder: "Panty type, sizes, style, activities, or picture ideas",
    shippingCountry: "Shipping country",
    requestBodyPlaceholder: "Describe requested panties, potential pictures, and activity details",
    customRequestSubmitted: "Custom request submitted.",
    sendRequest: "Send Request",
    needWalletSubmitPrefix: "You need at least",
    needWalletSubmitSuffix: "in your wallet to submit this request.",
    awaitingBuyerPayment: "awaiting buyer payment",
  },
};

export function CustomRequestsPage({ currentUser, sellers, buyerCustomRequests, customRequestMessagesByRequestId, submitCustomRequest, sendCustomRequestMessage, respondToCustomRequestPrice, openWalletTopUpForFlow, navigate, uiLanguage = "en" }) {
  const canSubmitRequest = currentUser?.role === "buyer";
  const canAffordNewRequest = Number(currentUser?.walletBalance || 0) >= CUSTOM_REQUEST_FEE_THB;
  const canAffordMessageAction = Number(currentUser?.walletBalance || 0) >= MESSAGE_FEE_THB;
  const t = CUSTOM_REQUESTS_I18N[uiLanguage] || CUSTOM_REQUESTS_I18N.en;
  const [requestForm, setRequestForm] = useState({
    sellerId: (sellers || [])[0]?.id || "",
    buyerName: currentUser?.name || "",
    buyerEmail: currentUser?.email || "",
    preferredDetails: "",
    shippingCountry: currentUser?.country || "",
    requestBody: "",
  });
  const [requestMessage, setRequestMessage] = useState("");
  const [requestReplyDraftById, setRequestReplyDraftById] = useState({});
  const [requestImageDraftById, setRequestImageDraftById] = useState({});
  const [requestCounterDraftById, setRequestCounterDraftById] = useState({});
  const [showOriginalRequestMessageById, setShowOriginalRequestMessageById] = useState({});
  const resolveRequestMessageBody = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = message?.senderUserId === currentUser?.id;
    const showOriginal = Boolean(showOriginalRequestMessageById[message?.id]);
    if (isOwnMessage || showOriginal) return original;
    return translated || original;
  };
  const canToggleRequestTranslation = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = message?.senderUserId === currentUser?.id;
    return !isOwnMessage && Boolean(translated) && translated !== original;
  };
  const handleRequestImageDraftSelect = async (requestId, fileList) => {
    const files = Array.from(fileList || []).slice(0, 4);
    if (!requestId || files.length === 0) return;
    const nextImages = await Promise.all(
      files.map((file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          id: `custom_req_draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          image: typeof reader.result === "string" ? reader.result : "",
          imageName: file.name || "attachment.jpg",
        });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      })),
    );
    setRequestImageDraftById((prev) => ({ ...prev, [requestId]: nextImages.filter((item) => item?.image) }));
  };
  const getQuoteStatusLabel = (request) => {
    if ((request?.quoteStatus || "") === "proposed" && request?.quoteAwaitingBuyerPayment) {
      return t.awaitingBuyerPayment;
    }
    return request?.quoteStatus || "proposed";
  };
  const isBuyerPaymentPending = (request) => {
    const quoteStatus = String(request?.quoteStatus || "").toLowerCase();
    const quotedPrice = Number(request?.quotedPriceThb || 0);
    return quoteStatus === "proposed" && quotedPrice >= MIN_CUSTOM_REQUEST_PURCHASE_THB;
  };

  const sellerOptions = useMemo(
    () => (sellers || []).map((seller) => ({ value: seller.id, label: seller.name })),
    [sellers],
  );

  return (
    <PageShell eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle}>
      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
          <p>{t.submitFee} {formatPriceTHB(CUSTOM_REQUEST_FEE_THB)} from your wallet balance.</p>
          <p className="mt-1 text-xs text-slate-500">{formatExchangeEstimates(CUSTOM_REQUEST_FEE_THB)}</p>
          <p className="mt-4">{t.openFee} {formatPriceTHB(MESSAGE_FEE_THB)} {t.perMessageBoth}</p>
          {!canSubmitRequest ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{t.loginBuyer}</p> : null}
          {canSubmitRequest ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-rose-100">
              <div className="font-semibold text-slate-800">{t.recentRequests}</div>
              <div className="mt-2 space-y-2">
                {(buyerCustomRequests || []).length === 0 ? (
                  <div>{t.noRequests}</div>
                ) : (buyerCustomRequests || []).slice(0, 5).map((request) => (
                  <div key={request.id} className="rounded-xl bg-white px-3 py-2 ring-1 ring-rose-100">
                    <div className="text-sm font-medium">{(sellers || []).find((seller) => seller.id === request.sellerId)?.name || request.sellerId}</div>
                    <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(request.createdAt || Date.now())} · {request.status || "open"}</div>
                    <div className="mt-2 rounded-xl bg-slate-50 p-2">
                      <div className="max-h-28 space-y-1 overflow-y-auto">
                        {(customRequestMessagesByRequestId?.[request.id] || []).length === 0 ? (
                          <div className="text-xs text-slate-500">{t.noMessages}</div>
                        ) : (customRequestMessagesByRequestId?.[request.id] || []).map((message) => (
                          <div key={message.id} className={`max-w-[90%] rounded-lg px-2 py-1 text-xs ${message.senderRole === "buyer" ? "ml-auto bg-rose-600 text-white" : "bg-white text-slate-700 ring-1 ring-rose-100"}`}>
                            <div>{resolveRequestMessageBody(message)}</div>
                            {(message.imageAttachments || []).length > 0 ? (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {(message.imageAttachments || []).map((image) => (
                                  <a
                                    key={image.id}
                                    href={image.image}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block overflow-hidden rounded-lg ring-1 ring-rose-200/60"
                                  >
                                    <ProductImage src={image.image} label={image.imageName || "Custom request attachment"} />
                                  </a>
                                ))}
                              </div>
                            ) : null}
                            {canToggleRequestTranslation(message) ? (
                              <button
                                type="button"
                                onClick={() => setShowOriginalRequestMessageById((prev) => ({ ...prev, [message.id]: !prev[message.id] }))}
                                className={`mt-1 block text-[11px] font-semibold ${message.senderRole === "buyer" ? "text-rose-100" : "text-slate-500"}`}
                              >
                                {showOriginalRequestMessageById[message.id] ? "Show translation" : "Show original"}
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={requestReplyDraftById[request.id] || ""}
                          onChange={(event) => setRequestReplyDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                          className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          placeholder={t.replyPlaceholder}
                        />
                        <button
                          onClick={() => {
                            sendCustomRequestMessage(
                              request.id,
                              requestReplyDraftById[request.id] || "",
                              requestImageDraftById[request.id] || [],
                              () => {
                                setRequestReplyDraftById((prev) => ({ ...prev, [request.id]: "" }));
                                setRequestImageDraftById((prev) => ({ ...prev, [request.id]: [] }));
                              },
                              (message) => setRequestMessage(message || ""),
                            );
                          }}
                          disabled={!canAffordMessageAction}
                          className={`rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white ${!canAffordMessageAction ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {t.send} ({formatPriceTHB(MESSAGE_FEE_THB)})
                        </button>
                      </div>
                      <div className="mt-2">
                        {request.buyerImageUploadEnabled ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => handleRequestImageDraftSelect(request.id, event.target.files)}
                                className="max-w-full rounded-lg border border-dashed border-rose-300 px-2 py-1 text-[11px]"
                              />
                              {(requestImageDraftById[request.id] || []).length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setRequestImageDraftById((prev) => ({ ...prev, [request.id]: [] }))}
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                                >
                                  Clear images
                                </button>
                              ) : null}
                            </div>
                            {(requestImageDraftById[request.id] || []).length > 0 ? (
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                {(requestImageDraftById[request.id] || []).map((image) => (
                                  <div key={image.id} className="overflow-hidden rounded-lg ring-1 ring-rose-200/60">
                                    <ProductImage src={image.image} label={image.imageName || "Draft attachment"} />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="text-[11px] text-slate-500">Seller has not enabled buyer image uploads for this request yet.</div>
                        )}
                      </div>
                      {!canAffordMessageAction ? <div className="mt-2 text-[11px] text-amber-700">{t.addWalletToSend} {formatPriceTHB(MESSAGE_FEE_THB)} {t.toWalletSend}</div> : null}
                    </div>
                    {Number(request.quotedPriceThb || 0) > 0 ? (
                      <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">{t.sellerQuote}</div>
                          {isBuyerPaymentPending(request) ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                              Pending payment
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm text-slate-700">
                          {formatPriceTHB(Number(request.quotedPriceThb || 0))} · <span className="capitalize">{getQuoteStatusLabel(request)}</span>
                          {Number(request.buyerCounterPriceThb || 0) > 0 ? ` · ${t.yourCounter} ${formatPriceTHB(Number(request.buyerCounterPriceThb || 0))}` : ""}
                        </div>
                        {request.quoteMessage ? <div className="mt-1 text-xs text-slate-600">{t.sellerNote} {request.quoteMessage}</div> : null}
                        {request.quoteStatus === "countered" && Number(request.buyerCounterPriceThb || 0) > 0 ? (
                          <div className="mt-2 text-xs text-slate-700">
                            {t.waitingCounter} {formatPriceTHB(Number(request.buyerCounterPriceThb || 0))}.
                          </div>
                        ) : ["accepted", "declined"].includes(request.quoteStatus || "") ? null : (
                          <>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => respondToCustomRequestPrice(
                                  request.id,
                                  "accept",
                                  {},
                                  () => setRequestMessage(t.quoteAcceptedPaid),
                                  (message) => {
                                    const quotedPrice = Number(request.quotedPriceThb || 0);
                                    const walletBalance = Number(currentUser?.walletBalance || 0);
                                    const shortfall = Number((quotedPrice - walletBalance).toFixed(2));
                                    if (shortfall > 0) {
                                      const requiredTopUp = getRequiredTopUpAmount(shortfall);
                                      setRequestMessage(`You need ${formatPriceTHB(quotedPrice)} to accept this quote. Top up at least ${formatPriceTHB(requiredTopUp)} and try again.`);
                                      openWalletTopUpForFlow?.(shortfall, "/custom-requests", "custom_request_quote");
                                      return;
                                    }
                                    setRequestMessage(message || "");
                                  },
                                )}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                              >
                                {t.acceptPay} {formatPriceTHB(Number(request.quotedPriceThb || 0))}
                              </button>
                              <button
                                onClick={() => respondToCustomRequestPrice(request.id, "decline", {}, () => setRequestMessage(t.quoteDeclined), (message) => setRequestMessage(message || ""))}
                                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                {t.decline}
                              </button>
                            </div>
                            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                              <input
                                type="number"
                                min={MIN_CUSTOM_REQUEST_PURCHASE_THB}
                                step="1"
                                value={requestCounterDraftById[request.id] || ""}
                                onChange={(event) => setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                placeholder={t.counterAmount}
                              />
                              <button
                                onClick={() => {
                                  respondToCustomRequestPrice(
                                    request.id,
                                    "counter",
                                    { counterPriceThb: requestCounterDraftById[request.id] || 0 },
                                    () => {
                                      setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: "" }));
                                      setRequestMessage(`${t.counterSent} ${formatPriceTHB(MESSAGE_FEE_THB)} ${t.messageFeeCharged}`);
                                    },
                                    (message) => setRequestMessage(message || ""),
                                  );
                                }}
                                disabled={!canAffordMessageAction}
                                className={`rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${!canAffordMessageAction ? "cursor-not-allowed opacity-60" : ""}`}
                              >
                                {t.counterLabel} ({formatPriceTHB(MESSAGE_FEE_THB)} fee)
                              </button>
                            </div>
                            {!canAffordMessageAction ? <div className="mt-1 text-[11px] text-amber-700">{t.counterRequiresFee} {formatPriceTHB(MESSAGE_FEE_THB)}.</div> : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-rose-100">
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm text-slate-600">
              <span className="font-medium">{t.seller}</span>
              <select
                value={requestForm.sellerId}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, sellerId: event.target.value }))}
                className="rounded-2xl border border-slate-200 px-4 py-3"
              >
                <option value="">{localizeOptionLabel("Select seller...", uiLanguage)}</option>
                {sellerOptions.map((seller) => <option key={seller.value} value={seller.value}>{seller.label}</option>)}
              </select>
            </label>
            <input value={requestForm.buyerName} onChange={(event) => setRequestForm((prev) => ({ ...prev, buyerName: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t.yourName} />
            <input value={requestForm.buyerEmail} onChange={(event) => setRequestForm((prev) => ({ ...prev, buyerEmail: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t.email} />
            <input value={requestForm.preferredDetails} onChange={(event) => setRequestForm((prev) => ({ ...prev, preferredDetails: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t.detailsPlaceholder} />
            <input value={requestForm.shippingCountry} onChange={(event) => setRequestForm((prev) => ({ ...prev, shippingCountry: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t.shippingCountry} />
            <textarea value={requestForm.requestBody} onChange={(event) => setRequestForm((prev) => ({ ...prev, requestBody: event.target.value }))} className="min-h-[140px] rounded-2xl border border-slate-200 px-4 py-3" placeholder={t.requestBodyPlaceholder} />
            <button
              onClick={() => {
                submitCustomRequest(
                  requestForm,
                  () => {
                    setRequestMessage(t.customRequestSubmitted);
                    setRequestForm((prev) => ({ ...prev, preferredDetails: "", requestBody: "" }));
                  },
                  (message) => setRequestMessage(message || ""),
                );
              }}
              disabled={!canAffordNewRequest}
              className={`rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white ${!canAffordNewRequest ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {t.sendRequest} ({formatPriceTHB(CUSTOM_REQUEST_FEE_THB)})
            </button>
            {!canAffordNewRequest ? <div className="text-xs text-amber-700">{t.needWalletSubmitPrefix} {formatPriceTHB(CUSTOM_REQUEST_FEE_THB)} {t.needWalletSubmitSuffix}</div> : null}
            {requestMessage ? <div className="text-sm font-medium text-rose-700">{requestMessage}</div> : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export function WorldwideShippingPage() {
  return (
    <PageShell eyebrow="Marketplace" title="Worldwide Shipping" subtitle="Worldwide delivery via international carriers with discreet fulfillment and transparent shipping costs.">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><Globe className="h-6 w-6 text-rose-600" /><h3 className="mt-4 text-xl font-semibold">Worldwide coverage</h3><p className="mt-3 text-slate-600">We ship worldwide from Thailand to supported destinations.</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><Shield className="h-6 w-6 text-rose-600" /><h3 className="mt-4 text-xl font-semibold">Discreet handling</h3><p className="mt-3 text-slate-600">All packages are prepared discreetly with plain external packaging.</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><HeartHandshake className="h-6 w-6 text-rose-600" /><h3 className="mt-4 text-xl font-semibold">International carriers + exact cost</h3><p className="mt-3 text-slate-600">Shipments use international carriers and buyers pay the exact shipping cost shown at checkout.</p></div>
      </div>
    </PageShell>
  );
}

export function SellerPortfoliosPage({ sellers, products, navigate, uiLanguage = "en" }) {
  const text = marketplaceText(uiLanguage);
  const [sellerFilters, setSellerFilters] = useState({
    search: "",
    location: "All",
    specialty: "All",
    type: "All",
    size: "All",
    color: "All",
    fabric: "All",
    daysWorn: "All",
    scentLevel: "All",
    language: "All",
    online: "All",
  });

  const sellerFilterOptions = useMemo(() => {
    const normalize = (value) => (value || "").trim();
    const withFallback = (value, fallback = "Not specified") => normalize(value) || fallback;
    const locations = [...new Set((sellers || []).map((seller) => withFallback(seller.location)))];
    const specialties = SELLER_SPECIALTY_OPTIONS;
    const types = STYLE_FILTER_OPTIONS;
    const sizes = SHARED_SIZE_OPTIONS;
    const colors = COLOR_OPTIONS;
    const fabrics = FABRIC_OPTIONS;
    const daysWorn = DAYS_WORN_OPTIONS;
    const scentLevels = SCENT_LEVEL_OPTIONS;
    const languages = [...new Set((sellers || []).flatMap((seller) => {
      const list = Array.isArray(seller.languages) && seller.languages.length > 0 ? seller.languages : ["Not specified"];
      return list.map((language) => withFallback(language));
    }))];
    return {
      locations: ["All", ...locations],
      specialties: ["All", ...specialties],
      types,
      sizes: ["All", ...sizes],
      colors: ["All", ...colors],
      fabrics: ["All", ...fabrics],
      daysWorn: ["All", ...daysWorn],
      scentLevels: ["All", ...scentLevels],
      languages: ["All", ...languages],
    };
  }, [sellers, products]);

  const filteredSellers = useMemo(() => {
    const query = sellerFilters.search.trim().toLowerCase();
    const normalized = (value, fallback = "Not specified") => (value || "").trim() || fallback;
    const specialtyCategory = (value) => {
      const normalizedValue = (value || "").trim().toLowerCase();
      if (["every day", "everyday", "ทุกวัน", "နေ့စဉ်", "каждый день"].some((term) => normalizedValue.includes(term))) return "every day";
      if (["sport", "sports", "สปอร์ต", "အားကစား", "спорт"].some((term) => normalizedValue.includes(term))) return "sport";
      if (["lace", "ลูกไม้", "လေ့စ်", "кружево"].some((term) => normalizedValue.includes(term))) return "lace";
      if (["risqué", "risque", "ยั่วยวน", "စွဲဆောင်", "провокац"].some((term) => normalizedValue.includes(term))) return "risqué";
      if (["satin", "ซาติน", "ဆာတင်", "сатин"].some((term) => normalizedValue.includes(term))) return "satin";
      if (["silk", "ไหม", "ပိုး", "шелк"].some((term) => normalizedValue.includes(term))) return "silk";
      return "";
    };
    const sellerProductTypesById = (products || []).reduce((acc, product) => {
      const sellerId = product?.sellerId;
      const type = (product?.style || "").trim();
      if (!sellerId || !type) return acc;
      if (!acc[sellerId]) acc[sellerId] = new Set();
      acc[sellerId].add(type);
      return acc;
    }, {});
    const sellerProductSizesById = (products || []).reduce((acc, product) => {
      const sellerId = product?.sellerId;
      const size = (product?.size || "").trim();
      if (!sellerId || !size) return acc;
      if (!acc[sellerId]) acc[sellerId] = new Set();
      acc[sellerId].add(size);
      return acc;
    }, {});
    const sellerProductColorsById = (products || []).reduce((acc, product) => {
      const sellerId = product?.sellerId;
      const color = (product?.color || "").trim();
      if (!sellerId || !color) return acc;
      if (!acc[sellerId]) acc[sellerId] = new Set();
      acc[sellerId].add(color);
      return acc;
    }, {});
    const sellerProductScentLevelsById = (products || []).reduce((acc, product) => {
      const sellerId = product?.sellerId;
      const scentLevel = (product?.scentLevel || "").trim();
      if (!sellerId || !scentLevel) return acc;
      if (!acc[sellerId]) acc[sellerId] = new Set();
      acc[sellerId].add(scentLevel);
      return acc;
    }, {});
    const sellerProductDaysWornById = (products || []).reduce((acc, product) => {
      const sellerId = product?.sellerId;
      const value = (product?.daysWorn || "").trim();
      if (!sellerId || !value) return acc;
      if (!acc[sellerId]) acc[sellerId] = new Set();
      acc[sellerId].add(value);
      return acc;
    }, {});
    const sellerProductFabricsById = (products || []).reduce((acc, product) => {
      const sellerId = product?.sellerId;
      const fabric = normalizeFabric(product?.fabric);
      if (!sellerId || !fabric) return acc;
      if (!acc[sellerId]) acc[sellerId] = new Set();
      acc[sellerId].add(fabric);
      return acc;
    }, {});
    return (sellers || []).filter((seller) => {
      const sellerLanguages = Array.isArray(seller.languages) && seller.languages.length > 0
        ? seller.languages.map((language) => normalized(language))
        : ["Not specified"];
      const sellerSpecialties = Array.isArray(seller.specialties) && seller.specialties.length > 0
        ? seller.specialties.map((item) => normalized(item))
        : [seller.specialty].filter(Boolean).map((item) => normalized(item));
      const matchesSearch = !query || [
        seller.name,
        seller.location,
        seller.specialty,
        ...sellerSpecialties,
        seller.bio,
        ...(seller.highlights || []),
        ...sellerLanguages,
      ].some((value) => (value || "").toLowerCase().includes(query));
      const matchesLocation = sellerFilters.location === "All" || normalized(seller.location) === sellerFilters.location;
      const matchesSpecialty =
        sellerFilters.specialty === "All" ||
        sellerSpecialties.some((item) => specialtyCategory(item) === sellerFilters.specialty);
      const sellerTypes = sellerProductTypesById[seller.id] || new Set();
      const matchesType = sellerFilters.type === "All" || sellerTypes.has(sellerFilters.type);
      const sellerSizes = sellerProductSizesById[seller.id] || new Set();
      const matchesSize = sellerFilters.size === "All" || sellerSizes.has(sellerFilters.size);
      const sellerColors = sellerProductColorsById[seller.id] || new Set();
      const matchesColor = sellerFilters.color === "All" || sellerColors.has(sellerFilters.color);
      const sellerFabrics = sellerProductFabricsById[seller.id] || new Set();
      const matchesFabric = sellerFilters.fabric === "All" || sellerFabrics.has(sellerFilters.fabric);
      const sellerDaysWorn = sellerProductDaysWornById[seller.id] || new Set();
      const matchesDaysWorn = sellerFilters.daysWorn === "All" || sellerDaysWorn.has(sellerFilters.daysWorn);
      const sellerScentLevels = sellerProductScentLevelsById[seller.id] || new Set();
      const matchesScentLevel = sellerFilters.scentLevel === "All" || sellerScentLevels.has(sellerFilters.scentLevel);
      const matchesLanguage = sellerFilters.language === "All" || sellerLanguages.includes(sellerFilters.language);
      const matchesOnline =
        sellerFilters.online === "All" ||
        (sellerFilters.online === "Online" && seller.isOnline) ||
        (sellerFilters.online === "Offline" && !seller.isOnline);
      return matchesSearch && matchesLocation && matchesSpecialty && matchesType && matchesSize && matchesColor && matchesFabric && matchesDaysWorn && matchesScentLevel && matchesLanguage && matchesOnline;
    });
  }, [sellers, products, sellerFilters]);
  const sellerInsightsById = useMemo(() => {
    const byId = {};
    (products || []).forEach((product) => {
      const sellerId = product?.sellerId;
      if (!sellerId) return;
      if (!byId[sellerId]) {
        byId[sellerId] = {
          total: 0,
          types: new Set(),
        };
      }
      byId[sellerId].total += 1;
      if (product.style) byId[sellerId].types.add(product.style);
    });
    return byId;
  }, [products]);
  const formatSellerSpecialtyLabel = (seller) => {
    const raw = (Array.isArray(seller?.specialties) && seller.specialties.length > 0)
      ? String(seller.specialties[0] || "")
      : String(seller?.specialty || "");
    return raw.replace(/\s*·\s*/g, ", ").trim();
  };

  return (
    <PageShell eyebrow={text.marketplace} title={text.sellerPortfoliosTitle} subtitle={text.sellerPortfoliosSubtitle}>
      <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="grid gap-1 text-sm text-slate-600 md:col-span-2 lg:col-span-3 xl:col-span-5">
            <span className="font-medium">{text.searchSellers}</span>
            <input
              value={sellerFilters.search}
              onChange={(event) => setSellerFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={text.searchSellersPlaceholder}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.location}</span>
            <select value={sellerFilters.location} onChange={(event) => setSellerFilters((prev) => ({ ...prev, location: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.locations.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.specialty}</span>
            <select value={sellerFilters.specialty} onChange={(event) => setSellerFilters((prev) => ({ ...prev, specialty: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.specialties.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.type}</span>
            <select value={sellerFilters.type} onChange={(event) => setSellerFilters((prev) => ({ ...prev, type: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.types.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.size}</span>
            <select value={sellerFilters.size} onChange={(event) => setSellerFilters((prev) => ({ ...prev, size: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.sizes.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.color}</span>
            <select value={sellerFilters.color} onChange={(event) => setSellerFilters((prev) => ({ ...prev, color: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.colors.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.fabric}</span>
            <select value={sellerFilters.fabric} onChange={(event) => setSellerFilters((prev) => ({ ...prev, fabric: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.fabrics.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.daysWorn}</span>
            <select value={sellerFilters.daysWorn} onChange={(event) => setSellerFilters((prev) => ({ ...prev, daysWorn: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.daysWorn.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.scent}</span>
            <select value={sellerFilters.scentLevel} onChange={(event) => setSellerFilters((prev) => ({ ...prev, scentLevel: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.scentLevels.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.language}</span>
            <select value={sellerFilters.language} onChange={(event) => setSellerFilters((prev) => ({ ...prev, language: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.languages.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.onlineStatus}</span>
            <select value={sellerFilters.online} onChange={(event) => setSellerFilters((prev) => ({ ...prev, online: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {["All", "Online", "Offline"].map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setSellerFilters({ search: "", location: "All", specialty: "All", type: "All", size: "All", color: "All", fabric: "All", daysWorn: "All", scentLevel: "All", language: "All", online: "All" })}
            className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 md:col-span-2 lg:col-span-3 xl:col-span-5"
          >
            {text.clearFilters}
          </button>
        </div>
        <div className="mt-3 text-sm text-slate-500">{filteredSellers.length} {text.sellersMatchSuffix}</div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {filteredSellers.map((seller) => (
          <div key={seller.id} className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
            <div className="h-48">
              <ProductImage
                src={seller.profileImageResolved || seller.profileImage}
                label={seller.profileImageNameResolved || seller.profileImageName || `${seller.name} portfolio`}
              />
            </div>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <button onClick={() => navigate(`/seller/${seller.id}`)} className="text-left text-xl font-semibold hover:text-rose-700">{seller.name}</button>
                <p className="text-sm text-slate-500">{seller.location}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {seller.affiliatedBarName ? `${text.barPrefix} ${seller.affiliatedBarName}` : localizeOptionLabel("Independent", uiLanguage)}
                </p>
              </div>
              <div className="max-w-full rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold leading-5 text-slate-700">
                {formatSellerSpecialtyLabel(seller) || text.sellerFallback}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{(Array.isArray(seller.specialties) && seller.specialties.length > 0) ? seller.specialties.join(" · ") : seller.specialty}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {(sellerInsightsById[seller.id]?.total || 0)} {text.listings}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {(sellerInsightsById[seller.id]?.types?.size || 0)} {text.types}
              </span>
              <span className={`rounded-full px-3 py-1 ${seller.isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {seller.isOnline ? text.onlineNow : localizeOptionLabel("Offline", uiLanguage)}
              </span>
            </div>
            {Array.isArray(seller.languages) && seller.languages.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {seller.languages.slice(0, 3).map((language) => (
                  <span key={`${seller.id}-${language}`} className="rounded-full border border-rose-100 px-3 py-1 text-xs text-slate-600">
                    {language}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div><span className="font-semibold text-slate-700">{text.shippingCoverage}:</span> {seller.shipping || localizeOptionLabel("Not specified", uiLanguage)}</div>
              <div><span className="font-semibold text-slate-700">{text.typicalShipTime}:</span> {seller.turnaround || localizeOptionLabel("Not specified", uiLanguage)}</div>
            </div>
            <button onClick={() => navigate(`/seller/${seller.id}`)} className="mt-4 w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
              {text.viewProfile}
            </button>
          </div>
        ))}
      </div>
      {filteredSellers.length === 0 ? <div className="mt-6 rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-md ring-1 ring-rose-100">{text.noSellersMatch}</div> : null}
    </PageShell>
  );
}

export function FindPage({ products, sellerMap, navigate, uiLanguage = "en" }) {
  const text = marketplaceText(uiLanguage);
  const [filters, setFilters] = useState({
    search: "",
    type: "All",
    size: "All",
    color: "All",
    fabric: "All",
    daysWorn: "All",
    condition: "All",
    scentLevel: "All",
    price: "All",
    seller: "All",
  });

  const filterOptions = useMemo(() => {
    const normalize = (value, fallback = "Not specified") => ((value || "").trim() || fallback);
    const types = STYLE_FILTER_OPTIONS;
    const sizes = SHARED_SIZE_OPTIONS;
    const colors = COLOR_OPTIONS;
    const fabrics = FABRIC_OPTIONS;
    const daysWorn = DAYS_WORN_OPTIONS;
    const conditions = CONDITION_OPTIONS;
    const scentLevels = SCENT_LEVEL_OPTIONS;
    const sellers = [...new Set((products || []).map((product) => product.sellerId).filter(Boolean))]
      .map((sellerId) => ({ sellerId, label: sellerMap?.[sellerId]?.name || sellerId }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return {
      types,
      sizes: ["All", ...sizes],
      colors: ["All", ...colors],
      fabrics: ["All", ...fabrics],
      daysWorn: ["All", ...daysWorn],
      conditions: ["All", ...conditions],
      scentLevels: ["All", ...scentLevels],
      sellers: [{ sellerId: "All", label: "All sellers" }, ...sellers],
    };
  }, [products, sellerMap]);

  const filteredProducts = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    const matchesPrice = (price) =>
      filters.price === "All" ||
      (filters.price === `Under ${formatPriceTHB(1400)}` && Number(price) < 1400) ||
      (filters.price === `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}` && Number(price) >= 1400 && Number(price) <= 2000) ||
      (filters.price === `${formatPriceTHB(2000)}+` && Number(price) >= 2000);
    return (products || [])
      .filter((product) => {
        const sellerName = sellerMap?.[product.sellerId]?.name || "";
        const matchesSearch = !query || [product.title, product.style, product.color, sellerName]
          .some((value) => (value || "").toLowerCase().includes(query));
        const matchesType = filters.type === "All" || (product.style || "Not specified") === filters.type;
        const matchesSize = filters.size === "All" || (product.size || "Not specified") === filters.size;
        const matchesColor = filters.color === "All" || (product.color || "Not specified") === filters.color;
        const matchesFabric = filters.fabric === "All" || normalizeFabric(product.fabric) === filters.fabric;
        const matchesDaysWorn = filters.daysWorn === "All" || (product.daysWorn || "Not specified") === filters.daysWorn;
        const matchesCondition = filters.condition === "All" || (product.condition || "Not specified") === filters.condition;
        const matchesScentLevel = filters.scentLevel === "All" || (product.scentLevel || "Not specified") === filters.scentLevel;
        const matchesSeller = filters.seller === "All" || product.sellerId === filters.seller;
        return matchesSearch && matchesType && matchesSize && matchesColor && matchesFabric && matchesDaysWorn && matchesCondition && matchesScentLevel && matchesSeller && matchesPrice(product.price);
      })
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }, [products, sellerMap, filters]);

  const recentUploads = filteredProducts.slice(0, 24);

  return (
    <PageShell eyebrow={text.marketplace} title={text.findTitle} subtitle={text.findSubtitle}>
      <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="grid gap-1 text-sm text-slate-600 md:col-span-2 lg:col-span-3 xl:col-span-4">
            <span className="font-medium">{text.searchProducts}</span>
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={text.searchProductsPlaceholder}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.type}</span>
            <select value={filters.type} onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.types.map((option) => <option key={option} value={option}>{localizeOptionLabel(option, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.size}</span>
            <select value={filters.size} onChange={(event) => setFilters((prev) => ({ ...prev, size: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.sizes.map((option) => <option key={option} value={option}>{localizeOptionLabel(option, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.color}</span>
            <select value={filters.color} onChange={(event) => setFilters((prev) => ({ ...prev, color: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.colors.map((option) => <option key={option} value={option}>{localizeOptionLabel(option, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.fabric}</span>
            <select value={filters.fabric} onChange={(event) => setFilters((prev) => ({ ...prev, fabric: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.fabrics.map((option) => <option key={option} value={option}>{localizeOptionLabel(option, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.daysWorn}</span>
            <select value={filters.daysWorn} onChange={(event) => setFilters((prev) => ({ ...prev, daysWorn: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.daysWorn.map((option) => <option key={option} value={option}>{localizeOptionLabel(option, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.condition}</span>
            <select value={filters.condition} onChange={(event) => setFilters((prev) => ({ ...prev, condition: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.conditions.map((option) => <option key={option} value={option}>{localizeOptionLabel(option, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.scent}</span>
            <select value={filters.scentLevel} onChange={(event) => setFilters((prev) => ({ ...prev, scentLevel: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.scentLevels.map((option) => <option key={option} value={option}>{localizeOptionLabel(option, uiLanguage)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.price}</span>
            <select value={filters.price} onChange={(event) => setFilters((prev) => ({ ...prev, price: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {[
                { value: "All", label: localizeOptionLabel("All", uiLanguage) },
                { value: `Under ${formatPriceTHB(1400)}`, label: `${localizeOptionLabel("Under", uiLanguage)} ${formatPriceTHB(1400)}` },
                { value: `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}`, label: `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}` },
                { value: `${formatPriceTHB(2000)}+`, label: `${formatPriceTHB(2000)}+` }
              ].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            <span className="font-medium">{text.seller}</span>
            <select value={filters.seller} onChange={(event) => setFilters((prev) => ({ ...prev, seller: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {filterOptions.sellers.map((option) => <option key={option.sellerId} value={option.sellerId}>{option.sellerId === "All" ? localizeOptionLabel(option.label, uiLanguage) : option.label}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setFilters({ search: "", type: "All", size: "All", color: "All", fabric: "All", daysWorn: "All", condition: "All", scentLevel: "All", price: "All", seller: "All" })}
            className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 md:col-span-2 lg:col-span-3 xl:col-span-4"
          >
            {text.clearFilters}
          </button>
        </div>
        <div className="mt-3 text-sm text-slate-500">{filteredProducts.length} {text.productsMatchSuffix}</div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-slate-900">{text.recentUploads}</h3>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {recentUploads.map((product) => (
          <article key={product.id} className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
            <button onClick={() => navigate(`/product/${product.slug}`)} className="block h-56 w-full text-left">
              <ProductImage src={product.image} label={product.imageName || product.title} />
            </button>
            <div className="mt-4">
              <button onClick={() => navigate(`/product/${product.slug}`)} className="text-left text-lg font-semibold hover:text-rose-700">{product.title}</button>
              <div className="mt-1 text-sm text-slate-500">
                {sellerMap?.[product.sellerId]?.name || product.sellerId} · {product.style || localizeOptionLabel("Not specified", uiLanguage)}
              </div>
              <div className="mt-1 text-sm text-slate-500">{product.size || localizeOptionLabel("Not specified", uiLanguage)} · {product.color || localizeOptionLabel("Not specified", uiLanguage)}</div>
              <div className="mt-3 text-lg font-semibold text-rose-700">{formatPriceTHB(product.price)}</div>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-500">{text.thbNotice}</div>
      {recentUploads.length === 0 ? <div className="mt-6 rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-md ring-1 ring-rose-100">{text.noUploadsMatch}</div> : null}
    </PageShell>
  );
}

export function HowToApplyPage({ uiLanguage = "en" }) {
  const text = helpText(uiLanguage);
  return (
    <PageShell eyebrow={text.howToApplyEyebrow} title={text.howToApplyTitle} subtitle={text.howToApplySubtitle}>
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.howToApplyPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function SellerGuidelinesPage({ uiLanguage = "en" }) {
  const text = helpText(uiLanguage);
  return (
    <PageShell eyebrow={text.sellerGuidelinesEyebrow} title={text.sellerGuidelinesTitle} subtitle={text.sellerGuidelinesSubtitle}>
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.sellerGuidelinesPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function PortfolioSetupPage({ uiLanguage = "en" }) {
  const text = helpText(uiLanguage);
  return (
    <PageShell eyebrow={text.portfolioSetupEyebrow} title={text.portfolioSetupTitle} subtitle={text.portfolioSetupSubtitle}>
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.portfolioSetupPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function OrderHelpPage({ uiLanguage = "en" }) {
  const text = helpText(uiLanguage);
  return (
    <PageShell eyebrow={text.orderHelpEyebrow} title={text.orderHelpTitle} subtitle={text.orderHelpSubtitle}>
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.orderHelpPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function PrivacyPackagingPage() {
  return (
    <PageShell eyebrow="Support" title="Packaging Standards" subtitle="How orders are packed to protect items in transit and keep fulfillment discreet and professional.">
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        <p>Orders use protective outer mailers or boxes chosen to keep items secure during transit.</p>
        <p>Shipping labels use standard fulfillment information required by the carrier.</p>
        <p>Packaging choices are designed to balance presentation, transit protection, and international shipping requirements.</p>
      </div>
    </PageShell>
  );
}
