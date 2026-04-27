import { useEffect, useMemo, useState } from "react";
import { Globe, HeartHandshake, Shield } from "lucide-react";
import { PageShell, ProductImage } from "../components/site/SitePrimitives.jsx";
import { COLOR_OPTIONS, CONDITION_OPTIONS, CUSTOM_REQUEST_FEE_THB, DAYS_WORN_OPTIONS, FABRIC_OPTIONS, formatPriceTHB, localizeOptionLabel, MESSAGE_FEE_THB, MIN_CUSTOM_REQUEST_PURCHASE_THB, SCENT_LEVEL_OPTIONS, SHARED_SIZE_OPTIONS, STYLE_FILTER_OPTIONS, HAIR_COLOR_OPTIONS, formatHeight, formatWeight } from "../productOptions.js";
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
      "We collect account details, order information, support messages, listing content, and Stories interactions needed to operate marketplace features.",
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
      { q: "How do you make sure I am talking to a real person and not AI or a fake profile?", a: "We verify seller and bar accounts before they can operate on the platform and review profile/activity signals over time. We do not claim perfect detection in every case, but we actively monitor for suspicious behavior and remove accounts that violate trust or authenticity standards. Our goal is a neutral, safer marketplace experience where buyers can communicate with confidence." },
      { q: "How quickly are orders shipped?", a: "Shipping usually happens within 1-3 business days after payment confirmation, but it can take longer depending on the seller's location." },
      { q: "Which carrier do you use?", a: "We ship with international carriers for worldwide delivery and tracking." },
      { q: "Is packaging discreet?", a: "Yes. External packaging is discreet with no identifying branding. We include a t-shirt, stickers, and a gift in each package, and customs forms are marked as apparel/promotional gift materials." },
      { q: "Is shipping legal in my country and what if customs confiscates my package?", a: "Our products are generally legal in many jurisdictions, and we do our best to ship in ways that meet international shipping requirements. However, buyers are responsible for knowing and complying with their local laws. If a package is flagged, held, or confiscated by customs/government authorities, Thailand Panties is not responsible and no refund will be issued for that seizure." },
      { q: "Who pays shipping costs?", a: "Buyers pay the exact shipping cost charged for their destination at checkout." },
      { q: "Why is international shipping from Thailand priced this way?", a: "The fee is a flat, all-in estimate for your zone: international postage from Thailand, handling and packaging (including discreet fulfillment), and platform coordination with sellers and, when applicable, bar partners, so your total at checkout is complete, not a teaser rate that changes later." },
      { q: "How long does delivery take after shipping?", a: "Transit time depends on your zone. For Asia: Standard is typically 3–7 business days, Express is typically 2–3 business days. For Oceania and South Asia: Standard is typically 7–14 business days, Express is typically 3–5 business days. For the USA, Europe, and the rest of the world: Standard is typically 7–14 business days, Express is typically 3–5 business days. These are estimates from the point of dispatch, not guarantees. Actual transit times can vary based on customs clearance, local conditions, and the specific carrier used for your shipment. Sellers typically dispatch within 1–3 business days of payment confirmation. In our experience, delivery tends to land on the faster end of these ranges." },
      { q: "Do you offer refunds or returns?", a: "All sales are final, except wrong-item cases. If you receive the wrong item, submit evidence through the refund evidence form. We will first try to ship the correct item to you at no additional cost. If that is not possible, we will issue a refund after review." },
      { q: "What is your chargeback policy?", a: "We dispute all chargebacks and provide evidence that includes the buyer's agreement to the Terms of Service and relevant usage activity on the site." },
      { q: "What appears on my card statement?", a: "The card descriptor appears as Siam Second Story LLC." },
      { q: "What currency does the marketplace use?", a: "All listing prices, wallet balances, unlock fees, and message fees are displayed in Thai baht (THB). When you top up your wallet with a credit card, the charge is processed in US dollars (USD) at the current exchange rate. The USD amount is shown before you confirm payment." },
      { q: "How do private Stories posts work?", a: "Sellers can set posts as private and set a price. Buyers unlock private posts individually from wallet balance." },
      { q: "Can buyers follow sellers and like products?", a: "Yes. Buyers can follow sellers, use Following filters, and like products for quick access from their Liked Products section." },
      { q: "Can sellers benefit from follows and likes?", a: "Yes. Seller visibility improves when buyers follow them and like products, and sellers can use this engagement to understand buyer interest." },
      { q: "Can sellers schedule posts?", a: "Yes. Sellers can schedule Stories posts for future publish times and manage schedule from the seller dashboard." },
      { q: "Can sellers control notifications?", a: "Yes. Sellers can filter notifications and toggle message or engagement alerts on/off." },
      { q: "What happens if a seller ships the wrong item?", a: "If a seller ships the wrong item, they must reship the correct item at their own cost. If reship is not completed, the buyer will be refunded and seller commissions for that order will be deducted." },
      { q: "How can sellers appeal strikes or a frozen account?", a: "Sellers can use the seller appeals process page and then submit directly in the appeals center. Include dates, IDs, and what happened so admin can review faster." },
      { q: "What does Independent seller mean?", a: "Independent means the seller is responsible for their own shipping and organization. Many buyers prefer sellers attached to a bar because bar-affiliated operations are often more structured and reliable." },
      { q: "How does the appeals process work?", a: "If your account is frozen or has active strikes, go to the appeals page and submit your explanation. Include relevant context (dates, order/request IDs, and what happened). Admin reviews appeals and posts decisions in your appeal history." },
      { q: "What is your policy on abusive language?", a: "Abusive or offensive language is not tolerated. We enforce a two-strikes policy." },
      { q: "What happens if sellers block a buyer?", a: "If a buyer is blocked by two sellers, the buyer account is blocked from the site." },
      { q: "How do I report abusive messages or harassment?", a: "Open the message thread and tap Report to flag abusive language, harassment, scam attempts, or off-platform payment requests. Admin reviews reports and applies moderation when needed." },
      { q: "What happens after the first strike versus the second strike?", a: "After a first moderation strike, a warning stays on the account and you can submit an appeal. After a second active strike, the account is automatically frozen until admin review and admin decides an outcome." },
      { q: "Where can I see my strike status and appeal history?", a: "Your dashboard shows active strike notices, and the appeals page shows your submitted appeals and admin decisions." },
      { q: "Can bars save posts and follow sellers or bars?", a: "Yes. Bars can save Stories posts and follow sellers or bars to keep important content easier to find." },
      { q: "Who can a bar message?", a: "Bars can reply to buyers or sellers who contacted the bar first. Buyers and sellers can start conversations with bars. Bulk messaging is disabled." }
    ],
    sellerStandardsEyebrow: "Seller Policy",
    sellerStandardsTitle: "Seller Standards",
    sellerStandardsSubtitle: "Quality, communication, and Stories/content requirements for seller participation.",
    sellerStandardsPoints: [
      "Listings and Stories posts must be accurate, clearly photographed, and categorized with correct details.",
      "Sellers should maintain responsive communication and keep profile, inventory, and Stories status up to date.",
      "Private Stories pricing, custom requests, and messaging behavior must follow platform policies and respectful conduct."
    ],
    howToApplyEyebrow: "For Sellers",
    howToApplyTitle: "How to Apply",
    howToApplySubtitle: "Steps for joining Thailand Panties as a seller.",
    howToApplyPoints: [
      "Complete the seller application with profile details and location.",
      "Prepare storefront images, listing examples, and clear policy acknowledgements.",
      "After approval, configure your dashboard, post settings (public/private), and Stories preferences."
    ],
    sellerGuidelinesEyebrow: "For Sellers",
    sellerGuidelinesTitle: "Seller Guidelines",
    sellerGuidelinesSubtitle: "Best practices for trusted listings, Stories growth, and buyer satisfaction.",
    sellerGuidelinesPoints: [
      "Use clear images, accurate sizing, and complete metadata for products and posts.",
      "Use Stories tools responsibly: set private/public visibility intentionally and keep pricing transparent.",
      "Respond quickly to messages and custom requests, and keep your notification preferences configured."
    ],
    portfolioSetupEyebrow: "For Sellers",
    portfolioSetupTitle: "Portfolio Setup",
    portfolioSetupSubtitle: "How to structure your storefront, profile, and Stories for discoverability.",
    portfolioSetupPoints: [
      "Add a concise bio, location, languages, and profile image so buyers can trust your page quickly.",
      "Keep product categories and Stories content consistent so filtering and discovery work better.",
      "Use scheduled posts, saved content review, and analytics insights to keep your storefront active."
    ]
  },
  th: {
    privacyEyebrow: "กฎหมาย",
    privacyTitle: "นโยบายความเป็นส่วนตัว",
    privacySubtitle: "วิธีที่ Thailand Panties เก็บ ใช้งาน และปกป้องข้อมูลผู้ใช้",
    privacyPoints: [
      "เราเก็บข้อมูลบัญชี คำสั่งซื้อ ข้อความช่วยเหลือ ข้อมูลสินค้า และกิจกรรม Stories ที่จำเป็นต่อการให้บริการ",
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
      { q: "คุณทำอย่างไรให้มั่นใจว่าฉันคุยกับคนจริง ไม่ใช่ AI หรือโปรไฟล์ปลอม?", a: "เราตรวจสอบบัญชีผู้ขายและบัญชีบาร์ก่อนอนุญาตให้ใช้งานแพลตฟอร์ม และติดตามสัญญาณความน่าเชื่อถือของโปรไฟล์/พฤติกรรมอย่างต่อเนื่อง เราไม่อ้างว่าสามารถตรวจจับได้สมบูรณ์ 100% ทุกกรณี แต่จะเฝ้าระวังพฤติกรรมที่น่าสงสัยและปิดบัญชีที่ละเมิดมาตรฐานความน่าเชื่อถือหรือความเป็นตัวจริง เป้าหมายของเราคือประสบการณ์ที่เป็นกลางและปลอดภัยยิ่งขึ้น เพื่อให้ผู้ซื้อพูดคุยได้อย่างมั่นใจ" },
      { q: "จัดส่งเร็วแค่ไหน?", a: "โดยปกติจะจัดส่งภายใน 1-3 วันทำการหลังยืนยันการชำระเงิน แต่อาจใช้เวลานานกว่านี้ตามตำแหน่งที่ตั้งของผู้ขาย" },
      { q: "ใช้ผู้ให้บริการขนส่งอะไร?", a: "เราใช้ผู้ให้บริการขนส่งระหว่างประเทศพร้อมติดตามพัสดุ" },
      { q: "แพ็กเกจเป็นความลับหรือไม่?", a: "ใช่ บรรจุภัณฑ์ภายนอกเป็นแบบไม่เปิดเผยตัวตนและไม่มีโลโก้ระบุตัวสินค้า ทุกพัสดุมีเสื้อยืด สติกเกอร์ และของขวัญ พร้อมระบุในเอกสารศุลกากรเป็นเสื้อผ้า/สื่อโปรโมชัน/ของขวัญ" },
      { q: "การจัดส่งถูกกฎหมายในประเทศของฉันไหม และถ้าศุลกากรยึดพัสดุจะเกิดอะไรขึ้น?", a: "สินค้าที่เราจัดส่งโดยทั่วไปถูกกฎหมายในหลายประเทศ และเราพยายามจัดส่งให้เป็นไปตามข้อกำหนดการขนส่งระหว่างประเทศ อย่างไรก็ตาม ผู้ซื้อมีหน้าที่ต้องตรวจสอบและปฏิบัติตามกฎหมายท้องถิ่นของตนเอง หากพัสดุถูกตรวจ ยึด หรืออายัดโดยศุลกากร/หน่วยงานรัฐ ทาง Thailand Panties จะไม่รับผิดชอบ และจะไม่มีการคืนเงินในกรณีที่ถูกยึดโดยภาครัฐ" },
      { q: "ใครเป็นผู้จ่ายค่าส่ง?", a: "ผู้ซื้อจ่ายค่าส่งตามจริงตามปลายทางในขั้นตอนเช็กเอาต์" },
      { q: "ทำไมค่าส่งระหว่างประเทศจากประเทศไทยถึงถูกกำหนดแบบนี้?", a: "ค่าดังกล่าวเป็นอัตรารวมต่อโซนที่ทำนายไว้ล่วงหน้า ครอบคลุมค่าฝากส่งระหว่างประเทศจากประเทศไทย การจัดการและบรรจุภัณฑ์ (รวมการจัดการแบบเป็นความลับ) และการประสานงานของแพลตฟอร์มกับผู้ขายและบาร์ที่เกี่ยวข้องเมื่อมีความจำเป็น ดังนั้นยอดรวมตอนเช็กเอาต์จึงครบถ้วน ไม่ใช่ราคาโปรโมชันแล้วมาเปลี่ยนทีหลัง" },
      { q: "หลังจัดส่งแล้วการจัดส่งใช้เวลานานแค่ไหน?", a: "ระยะเวลาขนส่งขึ้นอยู่กับโซนของคุณ เอเชีย: มาตรฐานประมาณ 3–7 วันทำการ, ด่วนประมาณ 2–3 วันทำการ โอเชียเนียและเอเชียใต้: มาตรฐานประมาณ 7–14 วันทำการ, ด่วนประมาณ 3–5 วันทำการ สหรัฐอเมริกา ยุโรป และส่วนอื่นของโลก: มาตรฐานประมาณ 7–14 วันทำการ, ด่วนประมาณ 3–5 วันทำการ ตัวเลขเหล่านี้เป็นการประมาณนับจากวันส่ง ไม่ใช่การรับประกัน ระยะเวลาจริงอาจแตกต่างตามสภาพศุลกากร สภาวะท้องถิ่น และผู้ให้บริการขนส่งที่ใช้ในการจัดส่งครั้งนั้น ผู้ขายมักจัดส่งภายใน 1–3 วันทำการหลังยืนยันการชำระเงิน จากประสบการณ์ของเรา การจัดส่งมักมาถึงในช่วงต้นของการประมาณเวลาเหล่านี้" },
      { q: "คืนเงินหรือคืนสินค้าได้ไหม?", a: "คำสั่งซื้อทั้งหมดเป็นแบบขายขาด ยกเว้นกรณีได้รับสินค้าผิด หากได้รับสินค้าผิด โปรดส่งหลักฐานผ่านแบบฟอร์มหลักฐานขอคืนเงิน เราจะพยายามส่งสินค้าที่ถูกต้องให้ใหม่โดยไม่มีค่าใช้จ่ายเพิ่มเติมก่อน หากทำไม่ได้จึงจะคืนเงินหลังการตรวจสอบ" },
      { q: "นโยบายเรื่องการปฏิเสธรายการชำระเงิน (chargeback) คืออะไร?", a: "เราจะโต้แย้ง chargeback ทุกกรณี และส่งหลักฐานที่เกี่ยวข้อง เช่น การยอมรับข้อกำหนดการให้บริการ (Terms of Service) และประวัติการใช้งานบนแพลตฟอร์ม" },
      { q: "ชื่อที่ขึ้นบัตรคืออะไร?", a: "ชื่อที่ขึ้นบัตรคือ Siam Second Story LLC" },
      { q: "โพสต์แบบ private ทำงานอย่างไร?", a: "ผู้ขายตั้งโพสต์ private และตั้งราคาได้ ผู้ซื้อปลดล็อกแต่ละโพสต์ด้วยเงินในกระเป๋า" },
      { q: "ผู้ซื้อสามารถติดตามผู้ขายและกดถูกใจสินค้าได้ไหม?", a: "ได้ ผู้ซื้อสามารถติดตามผู้ขาย ใช้ตัวกรอง Following และกดถูกใจสินค้าเพื่อเข้าถึงได้จากส่วนสินค้าที่ถูกใจ" },
      { q: "ผู้ขายได้ประโยชน์จากการติดตามและการกดถูกใจหรือไม่?", a: "ได้ การมองเห็นของผู้ขายดีขึ้นเมื่อผู้ซื้อติดตามและกดถูกใจสินค้า และผู้ขายยังใช้สัญญาณเหล่านี้เพื่อเข้าใจความสนใจของผู้ซื้อได้" },
      { q: "ผู้ขายตั้งเวลาโพสต์ได้ไหม?", a: "ได้ ผู้ขายตั้งเวลาโพสต์ล่วงหน้าและจัดการตารางในแดชบอร์ดได้" },
      { q: "ผู้ขายตั้งค่าการแจ้งเตือนได้ไหม?", a: "ได้ ผู้ขายกรองการแจ้งเตือนและเปิด/ปิดการแจ้งเตือนแต่ละประเภทได้" },
      { q: "ถ้าผู้ขายส่งสินค้าผิดจะเกิดอะไรขึ้น?", a: "หากผู้ขายส่งสินค้าผิด ผู้ขายต้องส่งสินค้าที่ถูกต้องใหม่โดยรับผิดชอบค่าใช้จ่ายเอง หากไม่ดำเนินการ ผู้ซื้อจะได้รับเงินคืน และค่าคอมมิชชั่นของผู้ขายจากคำสั่งซื้อนั้นจะถูกหัก" },
      { q: "ผู้ขายจะอุทธรณ์สไตรก์หรือบัญชีถูกระงับได้อย่างไร?", a: "ผู้ขายสามารถอ่านหน้า Seller Appeals Process และส่งคำอุทธรณ์ผ่านศูนย์อุทธรณ์ได้โดยตรง โดยควรระบุวันที่ รหัสอ้างอิง และรายละเอียดเหตุการณ์เพื่อให้แอดมินตรวจสอบได้เร็วขึ้น" },
      { q: "กระบวนการอุทธรณ์ทำงานอย่างไร?", a: "หากบัญชีถูกระงับหรือมีสไตรก์ active ให้ไปที่หน้าอุทธรณ์เพื่อส่งคำชี้แจง พร้อมวันที่และรหัสอ้างอิงที่เกี่ยวข้อง แอดมินจะตรวจสอบและอัปเดตผลในประวัติอุทธรณ์" },
      { q: "นโยบายเรื่องคำพูดไม่เหมาะสมคืออะไร?", a: "เราไม่ยอมรับคำพูดคุกคามหรือไม่เหมาะสม และใช้นโยบายสองสไตรก์ (two-strikes)" },
      { q: "เว็บไซต์ใช้สกุลเงินอะไร?", a: "ราคาสินค้า ยอดกระเป๋าเงิน ค่าปลดล็อก และค่าข้อความทั้งหมดแสดงเป็นเงินบาท (THB) เมื่อเติมเงินด้วยบัตรเครดิต ระบบจะเรียกเก็บเป็นดอลลาร์สหรัฐ (USD) ตามอัตราแลกเปลี่ยนปัจจุบัน โดยจำนวน USD จะแสดงก่อนยืนยันการชำระเงิน" },
      { q: "แจ้งข้อความคุกคามหรือไม่เหมาะสมได้อย่างไร?", a: "ใช้ปุ่ม Report ภายในหน้าข้อความเพื่อแจ้งการคุกคาม คำพูดไม่เหมาะสม การหลอกลวง หรือการชวนจ่ายเงินนอกระบบ แอดมินจะตรวจสอบและดำเนินการตามนโยบาย" },
      { q: "สไตรก์ครั้งแรกกับครั้งที่สองต่างกันอย่างไร?", a: "สไตรก์ครั้งแรกจะเป็นการเตือนและยังส่งอุทธรณ์ได้ ส่วนสไตรก์ที่สองที่ยัง active จะทำให้บัญชีถูกระงับอัตโนมัติจนกว่าจะผ่านการตรวจสอบและอุทธรณ์" },
      { q: "ดูสถานะสไตรก์และประวัติการอุทธรณ์ได้ที่ไหน?", a: "แดชบอร์ดจะแสดงการแจ้งเตือนสไตรก์ และหน้าศูนย์อุทธรณ์จะแสดงประวัติคำอุทธรณ์และผลการพิจารณาจากแอดมิน" },
      { q: "บาร์สามารถบันทึกโพสต์และติดตามผู้ขายหรือบาร์ได้ไหม?", a: "ได้ บาร์สามารถบันทึกโพสต์ใน Stories และติดตามทั้งผู้ขายและบาร์เพื่อกลับมาดูเนื้อหาสำคัญได้ง่ายขึ้น" },
      { q: "บาร์ส่งข้อความหาใครได้บ้าง?", a: "บาร์สามารถตอบกลับผู้ซื้อหรือผู้ขายที่ทักหาบาร์ก่อนเท่านั้น โดยผู้ซื้อและผู้ขายสามารถเริ่มบทสนทนากับบาร์ได้ ระบบไม่รองรับการส่งแบบเลือกหลายคน (bulk)" },
      { q: "ถ้าผู้ขายสองคนบล็อกผู้ซื้อจะเกิดอะไรขึ้น?", a: "หากผู้ซื้อถูกผู้ขายบล็อกครบสองคน บัญชีผู้ซื้อนั้นจะถูกบล็อกจากการใช้งานเว็บไซต์" }
    ],
    sellerStandardsEyebrow: "นโยบายผู้ขาย",
    sellerStandardsTitle: "มาตรฐานผู้ขาย",
    sellerStandardsSubtitle: "มาตรฐานคุณภาพ การสื่อสาร และเนื้อหา Stories สำหรับผู้ขาย",
    sellerStandardsPoints: [
      "ข้อมูลสินค้าและโพสต์ต้องชัดเจน ถูกต้อง และจัดหมวดหมู่ครบถ้วน",
      "ตอบลูกค้าให้รวดเร็ว และอัปเดตข้อมูลโปรไฟล์/สต็อก/สถานะ Stories สม่ำเสมอ",
      "การตั้งราคา private และการสื่อสารต้องเป็นไปตามนโยบายและสุภาพ"
    ],
    howToApplyEyebrow: "สำหรับผู้ขาย",
    howToApplyTitle: "วิธีสมัครผู้ขาย",
    howToApplySubtitle: "ขั้นตอนการเข้าร่วมเป็นผู้ขายใน Thailand Panties",
    howToApplyPoints: [
      "กรอกข้อมูลโปรไฟล์ผู้ขายให้ครบ เช่น ที่ตั้ง",
      "เตรียมรูปหน้าร้าน ตัวอย่างสินค้า และยอมรับนโยบายที่เกี่ยวข้อง",
      "เมื่ออนุมัติแล้ว ให้ตั้งค่าแดชบอร์ดและการแสดงผลโพสต์ public/private"
    ],
    sellerGuidelinesEyebrow: "สำหรับผู้ขาย",
    sellerGuidelinesTitle: "แนวทางผู้ขาย",
    sellerGuidelinesSubtitle: "แนวทางเพื่อเพิ่มความน่าเชื่อถือและประสบการณ์ที่ดีของผู้ซื้อ",
    sellerGuidelinesPoints: [
      "ใช้รูปชัดเจน ระบุไซซ์/รายละเอียดให้ครบถ้วน",
      "ใช้เครื่องมือ Stories อย่างโปร่งใส โดยเฉพาะการตั้งค่า private/public และราคา",
      "ตอบข้อความและคำขอพิเศษอย่างรวดเร็ว พร้อมตั้งค่าการแจ้งเตือนให้เหมาะสม"
    ],
    portfolioSetupEyebrow: "สำหรับผู้ขาย",
    portfolioSetupTitle: "ตั้งค่าโปรไฟล์ร้าน",
    portfolioSetupSubtitle: "จัดโครงสร้างหน้าร้าน โปรไฟล์ และStories ให้ค้นหาเจอง่าย",
    portfolioSetupPoints: [
      "เพิ่มไบโอ ที่ตั้ง ภาษา และรูปโปรไฟล์เพื่อเพิ่มความน่าเชื่อถือ",
      "ทำหมวดสินค้าและเนื้อหา Stories ให้สอดคล้องกันเพื่อการค้นหา/กรองที่ดีขึ้น",
      "ใช้โพสต์แบบตั้งเวลาและข้อมูลเชิงลึกเพื่อรักษาความเคลื่อนไหวของร้าน"
    ]
  },
  my: {
    privacyEyebrow: "ဥပဒေ",
    privacyTitle: "ကိုယ်ရေးကိုယ်တာ မူဝါဒ",
    privacySubtitle: "Thailand Panties တွင် data ကို စုဆောင်း၊ အသုံးပြု၊ ကာကွယ်ပုံ",
    privacyPoints: [
      "Marketplace လည်ပတ်ရန်လိုအပ်သော account, order, support message, listing နှင့် Stories interaction data များကို စုဆောင်းပါသည်",
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
      { q: "ကျွန်ုပ်က AI သို့မဟုတ် အတု profile မဟုတ်ပဲ လူအစစ်နဲ့ စကားပြောနေတယ်ဆိုတာ ဘယ်လိုသေချာစေသလဲ?", a: "Platform ပေါ်တွင် seller နှင့် bar account များ လည်ပတ်ခွင့်မပြုမီ identity/အကောင့်အချက်အလက်များကို စိစစ်ပါသည်၊ ထို့ပြင် profile နှင့် activity signal များကို အချိန်နှင့်တပြေးညီ ပြန်လည်စောင့်ကြည့်ပါသည်။ အမှုတိုင်းကို 100% ပြည့်စုံစွာ ဖော်ထုတ်နိုင်သည်ဟု မဆိုလိုသော်လည်း သံသယရှိသောအပြုအမူများကို ဆက်တိုက်စောင့်ကြည့်ပြီး trust/authenticity စံနှုန်းချိုးဖောက်သော account များကို ဖယ်ရှားပါသည်။ ဝယ်သူများ ယုံကြည်မှုရှိစွာ ဆက်သွယ်နိုင်ရန် မျှတပြီး ပိုမိုလုံခြုံသော အတွေ့အကြုံကို ပံ့ပိုးပေးရန် ရည်ရွယ်ပါသည်။" },
      { q: "ပို့ဆောင်ချိန်ဘယ်လောက်?", a: "ငွေပေးချေမှုအတည်ပြုပြီးနောက် ပုံမှန်အားဖြင့် 1-3 business days အတွင်း ပို့ဆောင်ပါသည်။ သို့သော် seller ၏ တည်နေရာအပေါ်မူတည်၍ ပိုကြာနိုင်ပါသည်။" },
      { q: "ဘယ် carrier သုံးလဲ?", a: "နိုင်ငံတကာ carrier များဖြင့် tracking ပါဝင်စွာ ပို့ဆောင်ပါသည်" },
      { q: "ထုပ်ပိုးမှု လျှို့ဝှက်ပါသလား?", a: "ဟုတ်ကဲ့။ အပြင်ထုပ်ပိုးမှုမှာ ခွဲခြားသိနိုင်သော branding မပါဘဲ လျှို့ဝှက်ထားပါသည်။ package တိုင်းတွင် t-shirt, stickers နှင့် gift တစ်ခု ပါဝင်ပြီး customs form တွင် apparel/promotional gift materials အဖြစ် မှတ်သားပေးပါသည်။" },
      { q: "ကျွန်ုပ်နိုင်ငံမှာ တင်ပို့မှုတရားဝင်လား၊ customs က package ကို သိမ်းယူရင် ဘာဖြစ်မလဲ?", a: "ကျွန်ုပ်တို့ပစ္စည်းများသည် နိုင်ငံအများစုတွင် ယေဘုယျအားဖြင့် တရားဝင်ဖြစ်ပြီး နိုင်ငံတကာ ပို့ဆောင်ရေးလိုအပ်ချက်များနှင့် ကိုက်ညီစေရန် အကောင်းဆုံးကြိုးစားပို့ဆောင်ပါသည်။ သို့သော် ဝယ်သူက မိမိနိုင်ငံ/ဒေသဥပဒေများကို သိရှိလိုက်နာရန် တာဝန်ရှိသည်။ customs သို့မဟုတ် အစိုးရအာဏာပိုင်များမှ package ကို စစ်ဆေး၊ ထိန်းသိမ်း သို့မဟုတ် သိမ်းယူပါက Thailand Panties မှ တာဝန်မယူပါ။ အစိုးရသိမ်းယူမှုဖြစ်ပွားသည့် case များတွင် ငွေပြန်အမ်းမည်မဟုတ်ပါ။" },
      { q: "ပို့ဆောင်ခကို ဘယ်သူပေးမလဲ?", a: "ဝယ်သူက checkout တွင်ပြထားသည့် ပို့ဆောင်ခအတိုင်း ပေးဆောင်ပါသည်" },
      { q: "ထိုင်းနိုင်ငံမှ နိုင်ငံတကာပို့ဆောင်ခကို ဘာကြောင့် ဒီလိုသတ်မှတ်ထားသလဲ?", a: "သင့်ဇုန်အတွက် ကြိုတင်တွက်ချက်ထားသော တစ်ခုတည်းသော စုစုပေါင်းနှုန်းဖြစ်ပြီး ထိုင်းနိုင်ငံမှ နိုင်ငံတကာစာတိုက်ဝန်ဆောင်မှု၊ လက်ခံထုပ်ပိုးခြင်းနှင့် လျှို့ဝှက်ပို့ဆောင်မှု၊ seller များနှင့် လိုအပ်ပါက bar များနှင့် platform က ညှိနှိုင်းမှုများ ပါဝင်ပါသည်၊ ဒါကြောင့် checkout တွင် စုစုပေါင်းက ပြည့်စုံပြီး နောက်မှ ပြောင်းလဲသော အတုအယောင်ဈေးနှုန်း မဟုတ်ပါ။" },
      { q: "ပို့ဆောင်ပြီးနောက် ဘယ်လောက်ကြာမလဲ?", a: "ကြာချိန်သည် သင့် zone ပေါ်မူတည်ပါသည်။ အာရှ: Standard ပုံမှန်အားဖြင့် 3–7 business days, Express ပုံမှန်အားဖြင့် 2–3 business days. သြစတြေးလျ/တောင်အာရှ: Standard ပုံမှန်အားဖြင့် 7–14 business days, Express ပုံမှန်အားဖြင့် 3–5 business days. အမေရိကန်၊ ဥရောပနှင့် ကမ္ဘာကျန်ရာ: Standard ပုံမှန်အားဖြင့် 7–14 business days, Express ပုံမှန်အားဖြင့် 3–5 business days. ဤကိန်းဂဏာန်းများသည် ပို့ဆောင်ချိန်မှ တွက်ချက်သော ခန့်မှန်းတန်ဖိုးများသာဖြစ်ပြီး အာမခံချက်မဟုတ်ပါ။ Customs ဆုံးဖြတ်မှု၊ ဒေသဆိုင်ရာ အခြေအနေနှင့် ထိုတစ်ကြိမ်အသုံးပြုသော carrier ပေါ်မူတည်၍ ကြာချိန် ကွဲပြားနိုင်ပါသည်။ Seller များသည် ငွေပေးချေမှုအတည်ပြုပြီး 1–3 business days အတွင်း ပုံမှန်အားဖြင့် post ပို့ပေးပါသည်။ ကျွန်ုပ်တို့၏ အတွေ့အကြုံအရ ပစ္စည်းများသည် ခန့်မှန်းရက်အတိုင်းအတာ၏ မြန်သောဘက်တွင် ရောက်ရှိလေ့ရှိပါသည်။" },
      { q: "ပြန်အမ်း/ပြန်လဲ ရနိုင်ပါသလား?", a: "Order အားလုံး final sale ဖြစ်ပါသည်။ သို့သော် wrong-item case တွင် refund evidence form မှတဆင့် သက်သေတင်နိုင်သည်။ ပထမဦးစွာ မှန်ကန်သော item ကို အပိုကုန်ကျစရိတ်မရှိဘဲ ပြန်ပို့ပေးရန် ကြိုးစားမည်ဖြစ်ပြီး မဖြစ်နိုင်ပါက စိစစ်ပြီးနောက် refund ပေးပါမည်။" },
      { q: "Chargeback မူဝါဒက ဘာလဲ?", a: "ကျွန်ုပ်တို့သည် chargeback အမှုများကို အမြဲအတိုက်အခံဖြေရှင်းပြီး Terms of Service ကို ဝယ်သူက သဘောတူထားမှုနှင့် platform အသုံးပြုမှုမှတ်တမ်းတို့အပါအဝင် သက်သေအထောက်အထားများကို တင်ပြပါသည်။" },
      { q: "Card statement ပေါ်မှာ ဘာနာမည်ပေါ်မလဲ?", a: "Card descriptor အဖြစ် Siam Second Story LLC လို့ပြသပါမည်။" },
      { q: "Private post တွေဘယ်လိုလုပ်သလဲ?", a: "Seller က private + စျေးနှုန်း သတ်မှတ်နိုင်ပြီး buyer က wallet ဖြင့် post တစ်ခုပြီးတစ်ခု unlock လုပ်နိုင်သည်" },
      { q: "Buyer တွေက seller ကို follow လုပ်ပြီး product တွေကို Like လုပ်နိုင်လား?", a: "ရနိုင်ပါတယ်။ Buyer များသည် seller များကို follow လုပ်နိုင်ပြီး Following filter ကိုသုံးနိုင်သလို product များကို Like လုပ်ထားပြီး Liked Products section မှ ပြန်ဝင်ကြည့်နိုင်ပါသည်။" },
      { q: "Seller တွေအတွက် follow နဲ့ like တွေက အကျိုးရှိလား?", a: "ရှိပါတယ်။ Buyer များက follow လုပ်ခြင်းနဲ့ product like လုပ်ခြင်းက seller visibility ကိုတိုးစေပြီး buyer စိတ်ဝင်စားမှုကို နားလည်ရန် အထောက်အကူပြုပါသည်။" },
      { q: "Seller တွေက post schedule လုပ်နိုင်လား?", a: "လုပ်နိုင်ပါတယ်။ Seller dashboard မှာ post ကို အနာဂတ်အချိန်အတွက် schedule သတ်မှတ်နိုင်ပါတယ်။" },
      { q: "Seller တွေက notification ကိုထိန်းချုပ်နိုင်လား?", a: "လုပ်နိုင်ပါတယ်။ Message/engagement notification များကို filter လုပ်ပြီး on/off ပြောင်းနိုင်ပါတယ်။" },
      { q: "Seller က wrong item ပို့မိရင် ဘာဖြစ်မလဲ?", a: "Seller က wrong item ပို့မိပါက မှန်ကန်သော item ကို seller ကိုယ်ပိုင်ကုန်ကျစရိတ်ဖြင့် ပြန်ပို့ရပါမည်။ အဲဒီအတိုင်း မဆောင်ရွက်ပါက buyer ကို refund ပေးမည်ဖြစ်ပြီး အဆိုပါ order အတွက် seller commission ကို ဖြတ်တောက်မည်ဖြစ်သည်။" },
      { q: "Seller များ strike သို့မဟုတ် frozen account ကို ဘယ်လို appeal တင်မလဲ?", a: "Seller appeals process page ကိုအသုံးပြုပြီး appeals center မှ တိုက်ရိုက် appeal တင်နိုင်ပါသည်။ Admin စစ်ဆေးမြန်စေရန် date၊ ID နှင့် ဖြစ်ရပ်အသေးစိတ်ကို ထည့်သွင်းပါ။" },
      { q: "Appeals process က ဘယ်လိုအလုပ်လုပ်လဲ?", a: "Account frozen ဖြစ်ခြင်း သို့မဟုတ် active strike ရှိပါက appeals page မှ explanation တင်ပါ။ Date, order/request ID နှင့် ဖြစ်ရပ်ကိုထည့်ပါ။ Admin ကစိစစ်ပြီး appeal history ထဲတွင် ဆုံးဖြတ်ချက်ကိုပြသပါမည်။" },
      { q: "Abusive language policy ကဘာလဲ?", a: "အရှက်ကွဲစေသော သို့မဟုတ် အနိုင်ကျင့်သော စကားလုံးများကို လက်မခံပါ။ Two-strikes policy ကိုအသုံးပြုပါသည်။" },
      { q: "Independent seller ဆိုတာဘာလဲ?", a: "Independent seller ဆိုသည်မှာ shipping နှင့် organization ကို seller ကိုယ်တိုင် စီမံရသည်ဟု ဆိုလိုပါသည်။ Bar နှင့်ချိတ်ဆက်ထားသော seller များမှာ အများအားဖြင့် ပိုမိုစနစ်တကျဖြစ်သောကြောင့် ယုံကြည်စိတ်ချရမှု များသောအားဖြင့် မြင့်မားပါသည်။" },
      { q: "Platform က ဘယ် currency သုံးလဲ?", a: "Listing price, wallet balance, unlock fee, message fee အားလုံးကို Thai baht (THB) နဲ့ပြသပါတယ်။ Credit card နဲ့ wallet ဖြည့်သွင်းသောအခါ US dollars (USD) ဖြင့် charge လုပ်ပြီး လက်ရှိ exchange rate အတိုင်း convert လုပ်ပါတယ်။ USD ပမာဏကို confirm မလုပ်ခင် ပြသပါတယ်။" },
      { q: "အနိုင်ကျင့်/မသင့်လျော်သော message ကို ဘယ်လို report လုပ်မလဲ?", a: "Message thread ကိုဖွင့်ပြီး Report ကိုနှိပ်ကာ harassment၊ abusive language၊ scam သို့မဟုတ် off-platform payment တောင်းဆိုချက်များကို report လုပ်နိုင်ပါတယ်။ Admin က စိစစ်ပြီး moderation အရေးယူပါမည်။" },
      { q: "ပထမ strike နဲ့ ဒုတိယ strike က ဘာကွာလဲ?", a: "ပထမ strike တွင် account အပေါ်သတိပေးချက်ရှိနေပြီး appeal တင်နိုင်ပါသည်။ ဒုတိယ active strike ရောက်ပါက account ကို အလိုအလျောက် frozen လုပ်ပြီး admin review + appeal outcome အထိ စောင့်ရပါမည်။" },
      { q: "Strike status နဲ့ appeal history ကို ဘယ်မှာကြည့်နိုင်မလဲ?", a: "Dashboard တွင် active strike notice ကိုမြင်နိုင်ပြီး appeals page တွင် တင်ထားသော appeal များနှင့် admin ဆုံးဖြတ်ချက်များကို ကြည့်နိုင်ပါသည်။" },
      { q: "Bar က post save လုပ်ပြီး seller/bar ကို follow လုပ်နိုင်လား?", a: "လုပ်နိုင်ပါတယ်။ Bar များသည် Stories post များကို save လုပ်နိုင်ပြီး seller နှင့် bar နှစ်မျိုးလုံးကို follow လုပ်နိုင်ပါသည်။" },
      { q: "Bar က ဘယ်သူတွေကို message ပို့နိုင်လဲ?", a: "Bar များသည် bar ကိုအရင်ဆက်သွယ်ထားသော buyer သို့မဟုတ် seller များကိုသာ ပြန်လည် message ပို့နိုင်ပါသည်။ Buyer နှင့် seller များက bar ကို စတင်ဆက်သွယ်နိုင်ပါသည်။ Bulk messaging ကိုမခွင့်ပြုပါ။" },
      { q: "Seller နှစ်ယောက်က buyer ကို block လုပ်ရင်ဘာဖြစ်မလဲ?", a: "Buyer တစ်ယောက်ကို seller နှစ်ယောက် block လုပ်ပါက အဆိုပါ buyer account ကို site မှ block လုပ်ပါသည်။" }
    ],
    sellerStandardsEyebrow: "Seller Policy",
    sellerStandardsTitle: "Seller စံနှုန်းများ",
    sellerStandardsSubtitle: "အရည်အသွေး၊ ဆက်သွယ်မှုနှင့် Stories/content စံနှုန်းများ",
    sellerStandardsPoints: [
      "စာရင်းနှင့် post အချက်အလက်များကို မှန်ကန်ပြီး ရှင်းလင်းစွာ တင်ရန်",
      "ဝယ်သူနှင့် မြန်ဆန်စွာ ဆက်သွယ်ပြီး profile/Stories ကို update လုပ်ရန်",
      "Private pricing နှင့် ဆက်သွယ်ရေးများကို policy နှင့်အညီ လိုက်နာရန်"
    ],
    howToApplyEyebrow: "Seller များအတွက်",
    howToApplyTitle: "လျှောက်ထားနည်း",
    howToApplySubtitle: "Thailand Panties တွင် seller အဖြစ်ဝင်ရောက်ရန် အဆင့်များ",
    howToApplyPoints: [
      "Profile, location အချက်အလက်များကို ဖြည့်သွင်းပါ",
      "Storefront image နှင့် listing နမူနာများကို ပြင်ဆင်ပါ",
      "Approve ဖြစ်ပြီးနောက် dashboard နှင့် post visibility ကို စနစ်တကျ သတ်မှတ်ပါ"
    ],
    sellerGuidelinesEyebrow: "Seller များအတွက်",
    sellerGuidelinesTitle: "Seller လမ်းညွှန်",
    sellerGuidelinesSubtitle: "ယုံကြည်ရသော listing နှင့် buyer အတွေ့အကြုံအတွက် အကောင်းဆုံးလမ်းညွှန်",
    sellerGuidelinesPoints: [
      "ပုံများကိုရှင်းလင်းစွာတင်ပြီး metadata ကိုပြည့်စုံစွာထည့်ပါ",
      "Public/Private Stories settings နှင့် စျေးနှုန်းကို ပွင့်လင်းစွာ စီမံပါ",
      "Message နှင့် custom request များကို မြန်ဆန်စွာတုံ့ပြန်ပါ"
    ],
    portfolioSetupEyebrow: "Seller များအတွက်",
    portfolioSetupTitle: "Portfolio Setup",
    portfolioSetupSubtitle: "Storefront နှင့် Stories ကို ရှာဖွေရလွယ်ကူအောင် စီမံနည်း",
    portfolioSetupPoints: [
      "Bio, location, language, profile image ထည့်သွင်းပါ",
      "Product category နှင့် Stories content တစ်သမတ်တည်းထားပါ",
      "Scheduled post နှင့် analytics ကိုအသုံးပြု၍ storefront ကို active ထားပါ"
    ]
  },
  ru: {
    privacyEyebrow: "Юридическое",
    privacyTitle: "Политика конфиденциальности",
    privacySubtitle: "Как Thailand Panties собирает, использует и защищает данные пользователей.",
    privacyPoints: [
      "Мы собираем данные аккаунта, заказов, обращений в поддержку, контента объявлений и активности в Stories, необходимые для работы платформы.",
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
      { q: "Как вы подтверждаете, что я общаюсь с реальным человеком, а не с AI или фейковым профилем?", a: "Мы проверяем аккаунты продавцов и баров до допуска к работе на платформе и далее отслеживаем сигналы профиля/активности. Мы не заявляем о 100% идеальном выявлении в каждом случае, но активно мониторим подозрительное поведение и удаляем аккаунты, нарушающие стандарты доверия и подлинности. Наша цель — нейтральный и более безопасный пользовательский опыт, чтобы покупатели могли общаться уверенно." },
      { q: "Как быстро отправляются заказы?", a: "Обычно отправка происходит в течение 1-3 рабочих дней после подтверждения оплаты, но срок может быть дольше в зависимости от локации продавца." },
      { q: "Какой перевозчик используется?", a: "Мы используем международных перевозчиков с отслеживанием." },
      { q: "Упаковка дискретная?", a: "Да. Внешняя упаковка нейтральная, без идентифицирующей маркировки. В каждую посылку добавляются футболка, стикеры и подарок, а в таможенных формах указывается категория «одежда/промо-материалы/подарок»." },
      { q: "Законна ли доставка в моей стране и что, если посылку конфискует таможня?", a: "Наши товары в целом законны во многих юрисдикциях, и мы стараемся отправлять заказы с соблюдением международных требований. Однако покупатель сам несет ответственность за знание и соблюдение законов своей страны. Если посылка помечена, задержана или конфискована таможней/госорганами, Thailand Panties не несет ответственности, и возврат средств за такую конфискацию не производится." },
      { q: "Кто оплачивает доставку?", a: "Покупатель оплачивает точную стоимость доставки по своему направлению." },
      { q: "Почему международная доставка из Таиланда стоит именно так?", a: "Это единая зональная оценка: международная почта из Таиланда, обработка и упаковка (включая дискретную отправку), а также координация платформы с продавцами и, при необходимости, с барами, поэтому итог на чекауте полный, а не рекламная ставка, которая потом меняется." },
      { q: "Сколько занимает доставка после отправки?", a: "Сроки зависят от вашей зоны. Азия: Стандарт ориентировочно 3–7 рабочих дней, Экспресс ориентировочно 2–3 рабочих дня. Океания и Южная Азия: Стандарт ориентировочно 7–14 рабочих дней, Экспресс ориентировочно 3–5 рабочих дней. США, Европа и весь остальной мир: Стандарт ориентировочно 7–14 рабочих дней, Экспресс ориентировочно 3–5 рабочих дней. Это расчётные сроки с момента отправки, а не гарантии. Фактическое время может варьироваться в зависимости от прохождения таможни, местных условий и перевозчика, используемого для конкретного отправления. Продавцы как правило отправляют посылки в течение 1–3 рабочих дней после подтверждения оплаты. По нашему опыту, доставка обычно приходит ближе к нижней границе этих сроков." },
      { q: "Есть ли возвраты?", a: "Все продажи окончательные, кроме случаев wrong-item. Если вы получили не тот товар, отправьте доказательства через форму возврата. Сначала мы попробуем отправить правильный товар за наш счет без дополнительных расходов для покупателя. Если это невозможно, после проверки будет оформлен возврат." },
      { q: "Какая у вас политика по чарджбэкам (chargeback)?", a: "Мы оспариваем все чарджбэки и предоставляем доказательства, включая согласие покупателя с Terms of Service и релевантную активность на платформе." },
      { q: "Что отображается в выписке по карте?", a: "Дескриптор платежа отображается как Siam Second Story LLC." },
      { q: "Как работают private-посты?", a: "Продавец может сделать пост приватным и задать цену, покупатель разблокирует пост из баланса кошелька." },
      { q: "Могут ли покупатели подписываться на продавцов и ставить Like товарам?", a: "Да. Покупатели могут подписываться на продавцов, использовать фильтры Following в Stories и ставить Like товарам для быстрого доступа в разделе «Понравившиеся товары»." },
      { q: "Полезны ли продавцам подписки и лайки?", a: "Да. Видимость продавца растет, когда покупатели подписываются и ставят Like товарам, а сами продавцы могут использовать эти сигналы, чтобы лучше понимать интерес покупателей." },
      { q: "Могут ли продавцы планировать посты?", a: "Да. Продавцы могут заранее планировать публикации в панели продавца." },
      { q: "Могут ли продавцы управлять уведомлениями?", a: "Да. Продавцы могут фильтровать уведомления и включать/выключать типы оповещений." },
      { q: "Что будет, если продавец отправил не тот товар?", a: "Если продавец отправил не тот товар, он обязан переслать правильный товар за свой счет. Если пересылка не выполнена, покупателю будет оформлен возврат, а комиссия продавца по этому заказу будет удержана." },
      { q: "Как продавцу подать апелляцию по страйкам или заморозке аккаунта?", a: "Продавец может открыть страницу процесса апелляции для продавцов и затем отправить апелляцию через центр апелляций. Укажите даты, ID и контекст для более быстрого рассмотрения админом." },
      { q: "Как работает общий процесс апелляции?", a: "Если аккаунт заморожен или есть активные страйки, откройте страницу апелляций и отправьте объяснение с датами и ID. Админ рассмотрит апелляцию и опубликует решение в истории." },
      { q: "Какова политика по оскорбительному языку?", a: "Оскорбительный или агрессивный язык недопустим. На платформе действует политика двух страйков." },
      { q: "В какой валюте работают цены на платформе?", a: "Все цены, баланс кошелька, стоимость разблокировок и сообщений отображаются в тайских батах (THB). При пополнении кошелька кредитной картой списание производится в долларах США (USD) по текущему курсу обмена. Сумма в USD отображается перед подтверждением оплаты." },
      { q: "Как пожаловаться на оскорбительные сообщения или harassment?", a: "Используйте кнопку Report внутри диалога, чтобы отправить жалобу на оскорбления, преследование, мошенничество или попытки увести оплату вне платформы. Админ проверяет жалобы и применяет модерацию." },
      { q: "Что происходит после первого и второго страйка?", a: "После первого страйка аккаунт получает предупреждение, и вы можете подать апелляцию. После второго активного страйка аккаунт автоматически замораживается до решения по апелляции." },
      { q: "Где посмотреть статус страйков и историю апелляций?", a: "На дашборде отображаются активные уведомления о страйках, а на странице апелляций — поданные апелляции и решения администратора." },
      { q: "Могут ли бары сохранять посты и подписываться на продавцов или бары?", a: "Да. Бары могут сохранять посты Stories и подписываться как на продавцов, так и на бары." },
      { q: "Кому бар может писать сообщения?", a: "Бар может отвечать только покупателям или продавцам, которые написали бару первыми. Покупатели и продавцы могут сами начинать диалог с баром. Массовая рассылка отключена." },
      { q: "Что будет, если два продавца заблокируют покупателя?", a: "Если покупателя заблокируют два продавца, аккаунт покупателя блокируется на сайте." }
    ],
    sellerStandardsEyebrow: "Политика продавцов",
    sellerStandardsTitle: "Стандарты продавца",
    sellerStandardsSubtitle: "Качество, коммуникация и правила контента/Stories.",
    sellerStandardsPoints: [
      "Карточки и посты должны быть точными, понятными и корректно заполненными.",
      "Продавец должен быстро отвечать и регулярно обновлять профиль/статус.",
      "Private-цены и общение должны соответствовать правилам платформы."
    ],
    howToApplyEyebrow: "Для продавцов",
    howToApplyTitle: "Как подать заявку",
    howToApplySubtitle: "Шаги для подключения к Thailand Panties в роли продавца.",
    howToApplyPoints: [
      "Заполните профиль продавца: локация, описание.",
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
    portfolioSetupSubtitle: "Как оформить профиль, витрину и Stories для лучшей видимости.",
    portfolioSetupPoints: [
      "Добавьте био, локацию, языки и фото профиля.",
      "Сохраняйте единый стиль категорий и контента в Stories.",
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
    type: "Type",
    size: "Size",
    color: "Color",
    fabric: "Fabric",
    daysWorn: "Days worn",
    scent: "Scent",
    language: "Language",
    hairColor: "Hair color",
    onlineStatus: "Online status",
    clearFilters: "Clear filters",
    sellersMatchSuffix: "seller(s) match your filters.",
    barPrefix: "Bar:",
    sellerFallback: "Seller",
    listings: "listings",
    types: "types",
    onlineNow: "Online now",
    viewProfile: "View profile",
    messageSeller: "Message seller",
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
    type: "ประเภท",
    size: "ไซซ์",
    color: "สี",
    fabric: "เนื้อผ้า",
    daysWorn: "จำนวนวันที่สวม",
    scent: "กลิ่น",
    language: "ภาษา",
    hairColor: "สีผม",
    onlineStatus: "สถานะออนไลน์",
    clearFilters: "ล้างตัวกรอง",
    sellersMatchSuffix: "ผู้ขายตรงกับตัวกรองของคุณ",
    barPrefix: "บาร์:",
    sellerFallback: "ผู้ขาย",
    listings: "รายการสินค้า",
    types: "ประเภท",
    onlineNow: "ออนไลน์ตอนนี้",
    viewProfile: "ดูโปรไฟล์",
    messageSeller: "ส่งข้อความหาผู้ขาย",
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
    type: "အမျိုးအစား",
    size: "အရွယ်အစား",
    color: "အရောင်",
    fabric: "အထည်အမျိုးအစား",
    daysWorn: "ဝတ်ထားသည့်ရက်",
    scent: "အနံ့",
    language: "ဘာသာစကား",
    hairColor: "ဆံပင်အရောင်",
    onlineStatus: "အွန်လိုင်း အခြေအနေ",
    clearFilters: "filters များကို ရှင်းရန်",
    sellersMatchSuffix: "seller(s) သင့် filter နှင့် ကိုက်ညီသည်။",
    barPrefix: "Bar:",
    sellerFallback: "Seller",
    listings: "listing များ",
    types: "အမျိုးအစားများ",
    onlineNow: "ယခု အွန်လိုင်း",
    viewProfile: "ပရိုဖိုင်ကြည့်ရန်",
    messageSeller: "Seller သို့ message ပို့ရန်",
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
    type: "Тип",
    size: "Размер",
    color: "Цвет",
    fabric: "Ткань",
    daysWorn: "Дней ношения",
    scent: "Запах",
    language: "Язык",
    hairColor: "Цвет волос",
    onlineStatus: "Онлайн-статус",
    clearFilters: "Сбросить фильтры",
    sellersMatchSuffix: "продавцов соответствуют фильтрам.",
    barPrefix: "Бар:",
    sellerFallback: "Продавец",
    listings: "листингов",
    types: "типов",
    onlineNow: "Сейчас онлайн",
    viewProfile: "Открыть профиль",
    messageSeller: "Написать продавцу",
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

const STATIC_LANGUAGE_META = {
  en: { label: "Language", english: "English", thai: "Thai", burmese: "Burmese", russian: "Russian" },
  th: { label: "ภาษา", english: "อังกฤษ", thai: "ไทย", burmese: "พม่า", russian: "รัสเซีย" },
  my: { label: "ဘာသာစကား", english: "အင်္ဂလိပ်", thai: "ထိုင်း", burmese: "မြန်မာ", russian: "ရုရှား" },
  ru: { label: "Язык", english: "Английский", thai: "Тайский", burmese: "Бирманский", russian: "Русский" },
};

const SUPPORT_STATIC_I18N = {
  en: {
    termsEyebrow: "Legal",
    termsTitle: "Terms of Service",
    termsSubtitle: "Please read these Terms of Service carefully before using thailandpanties.com, operated by Siam Second Story LLC.",
    shippingEyebrow: "Policy",
    shippingTitle: "Shipping Policy",
    shippingSubtitle: "How orders are sent, priced, and delivered worldwide from Thailand.",
    communityEyebrow: "Policy",
    communityTitle: "Community Standards",
    communitySubtitle: "Conduct rules for respectful communication between buyers, sellers, and support.",
    worldwideEyebrow: "Marketplace",
    worldwideTitle: "Worldwide Shipping",
    worldwideSubtitle: "Worldwide delivery via international carriers with discreet fulfillment and transparent shipping costs.",
    packagingEyebrow: "Support",
    packagingTitle: "Packaging Standards",
    packagingSubtitle: "How orders are packed to protect items in transit and keep fulfillment discreet and professional.",
    refundEvidenceEyebrow: "Support",
    refundEvidenceTitle: "Refund Evidence Form",
    refundEvidenceSubtitle: "Submit wrong-item evidence for refund review.",
    termsSections: [
      { heading: "1. Acceptance of Terms", body: "By accessing or using thailandpanties.com (the \"Site\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, you must not use the Site. Your continued use of the Site following any changes to these Terms constitutes acceptance of those changes." },
      { heading: "2. Eligibility", body: "You must be at least 18 years of age to use this Site. By using the Site, you represent and warrant that you are at least 18 years old and have the legal capacity to enter into these Terms." },
      { heading: "3. Account Responsibilities", body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must provide accurate and complete account information and keep it up to date. Each person may maintain only one account. You agree to follow all marketplace policies regarding listing quality, communication, and safety." },
      { heading: "4. Marketplace Transactions", body: "All orders placed on the Site are final sale. The sole exception is wrong-item cases where the buyer submits reviewable photographic evidence through the designated refund evidence form. For verified wrong-item cases, we first attempt to reship the correct item at no additional cost to the buyer. If reship is not possible, a refund is issued after review. If a seller ships the wrong item, the seller must reship the correct item at their own cost. If the seller fails to reship, the buyer is refunded and the seller's commission for that order is deducted." },
      { heading: "5. Pricing and Currency", body: "All listed prices, wallet balances, content unlock fees, and messaging fees are displayed in Thai baht (THB). Credit card payments for wallet top-ups are processed in US dollars (USD). The THB amount is converted to USD at the current exchange rate (including a small processing margin) at the time of purchase. The USD charge amount is displayed before you confirm. Siam Second Story LLC is not responsible for any additional currency conversion fees charged by your card issuer." },
      { heading: "6. Payment and Billing", body: "Charges from the Site will appear on your credit or debit card statement as \"Siam Second Story LLC\". By completing a purchase, you authorize Siam Second Story LLC to charge your selected payment method for the total amount of your order, including applicable shipping costs. Wallet top-ups, content unlocks, and messaging fees are also charged under this descriptor." },
      { heading: "7. Refunds and Chargebacks", body: "Except as described in Section 4 (wrong-item cases), all sales are final and no refunds are issued. All chargebacks are disputed. In the event of a chargeback, we submit evidence of the buyer's agreement to these Terms of Service, transaction records, and relevant usage activity on the Site. Filing a fraudulent chargeback may result in permanent account suspension." },
      { heading: "8. Conduct and Moderation", body: "Abusive, threatening, discriminatory, or offensive language is strictly prohibited in all messages, requests, and support interactions. The platform enforces a two-strikes conduct policy. A first strike results in a warning on the account. A second active strike results in automatic account suspension pending administrative review. If a buyer is blocked by two separate sellers, the buyer's account is blocked from the Site." },
      { heading: "9. Content and Intellectual Property", body: "Users retain ownership of content they submit to the Site, but grant Siam Second Story LLC a non-exclusive, royalty-free, worldwide license to use, display, and distribute such content in connection with operating the Site. All Site design, branding, software, and proprietary materials are the intellectual property of Siam Second Story LLC and may not be copied, modified, or distributed without prior written consent." },
      { heading: "10. Privacy", body: "Your use of the Site is also governed by our Privacy Policy, which describes how we collect, use, and protect your personal information. By using the Site, you consent to the practices described in the Privacy Policy." },
      { heading: "11. Disclaimers and Limitation of Liability", body: "The Site and all services are provided on an \"as is\" and \"as available\" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. To the fullest extent permitted by law, Siam Second Story LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, arising from your use of the Site. Our total aggregate liability for any claims arising from these Terms or your use of the Site shall not exceed the amount you paid to Siam Second Story LLC in the twelve (12) months preceding the claim." },
      { heading: "12. Indemnification", body: "You agree to indemnify, defend, and hold harmless Siam Second Story LLC, its officers, directors, employees, and agents from and against any and all claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or in any way connected with your access to or use of the Site, your violation of these Terms, or your violation of any third-party rights." },
      { heading: "13. Governing Law and Jurisdiction", body: "These Terms shall be governed by and construed in accordance with the laws of the State of Wyoming, United States, without regard to its conflict of law provisions. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Sheridan County, Wyoming." },
      { heading: "14. Changes to These Terms", body: "Siam Second Story LLC reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Site. Your continued use of the Site after any such changes constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically." },
      { heading: "15. Contact and Company Information", body: "Thailand Panties is owned and operated by Siam Second Story LLC, located at 30 N Gould Street Ste R, Sheridan, Wyoming 82801, United States. For questions or concerns regarding these Terms, please use the Contact page on the Site." },
    ],
    shippingCards: [
      { title: "Shipping time", body: "Shipping usually happens within 1-3 business days after the order is placed and confirmed, but it can take longer depending on the seller's location." },
      { title: "Carrier", body: "All shipments are sent with international carriers and include tracking once sent." },
      { title: "Shipping cost", body: "Buyers pay the exact shipping cost shown at checkout for their destination." },
      { title: "Coverage and packaging", body: "We ship worldwide with discreet external packaging (no identifying branding). Every package includes a t-shirt, stickers, and a gift, and customs forms are marked as apparel/promotional gift materials." },
    ],
    communityPoints: [
      "Abusive, threatening, discriminatory, or offensive language is not tolerated in messages, requests, or support interactions.",
      "We enforce a two-strikes moderation policy for abusive behavior. Repeated violations can result in account suspension or removal.",
      "If a buyer is blocked by two sellers, that buyer account is blocked from the marketplace.",
    ],
    worldwideCards: [
      { title: "Worldwide coverage", body: "We ship worldwide from Thailand to supported destinations." },
      { title: "Discreet handling", body: "All packages use discreet external packaging with no identifying branding. Each shipment includes a t-shirt, stickers, and a gift, and customs forms are marked as apparel/promotional gift materials." },
      { title: "International carriers + exact cost", body: "Shipments use international carriers and buyers pay the exact shipping cost shown at checkout." },
    ],
    packagingPoints: [
      "Orders use protective outer mailers or boxes chosen to keep items secure during transit.",
      "External packaging is discreet and does not include identifying branding.",
      "Each package includes a t-shirt, stickers, and a gift, and customs forms are marked as apparel/promotional gift materials.",
      "Shipping labels use standard fulfillment information required by the carrier.",
      "Packaging choices are designed to balance presentation, transit protection, and international shipping requirements.",
    ],
  },
  th: {
    termsEyebrow: "กฎหมาย", termsTitle: "ข้อกำหนดการให้บริการ", termsSubtitle: "กรุณาอ่านข้อกำหนดการให้บริการอย่างละเอียดก่อนใช้งาน thailandpanties.com ดำเนินการโดย Siam Second Story LLC",
    shippingEyebrow: "นโยบาย", shippingTitle: "นโยบายการจัดส่ง", shippingSubtitle: "วิธีการจัดส่ง ราคา และการส่งทั่วโลกจากประเทศไทย",
    communityEyebrow: "นโยบาย", communityTitle: "มาตรฐานชุมชน", communitySubtitle: "กฎการสื่อสารอย่างสุภาพระหว่างผู้ซื้อ ผู้ขาย และฝ่ายช่วยเหลือ",
    worldwideEyebrow: "มาร์เก็ตเพลส", worldwideTitle: "การจัดส่งทั่วโลก", worldwideSubtitle: "จัดส่งทั่วโลกผ่านผู้ให้บริการระหว่างประเทศอย่างเป็นส่วนตัวและโปร่งใส",
    packagingEyebrow: "ช่วยเหลือ", packagingTitle: "มาตรฐานบรรจุภัณฑ์", packagingSubtitle: "วิธีแพ็กสินค้าเพื่อความปลอดภัยในการขนส่งและความเป็นส่วนตัว",
    refundEvidenceEyebrow: "ช่วยเหลือ", refundEvidenceTitle: "แบบฟอร์มหลักฐานขอคืนเงิน", refundEvidenceSubtitle: "ส่งหลักฐานกรณีได้รับสินค้าผิดเพื่อให้ตรวจสอบ",
    termsSections: [
      { heading: "1. การยอมรับข้อกำหนด", body: "การเข้าถึงหรือใช้งาน thailandpanties.com (\"เว็บไซต์\") ถือว่าคุณยอมรับข้อกำหนดการให้บริการนี้ หากคุณไม่ยอมรับ กรุณาอย่าใช้เว็บไซต์ การใช้งานต่อเนื่องหลังจากมีการเปลี่ยนแปลงข้อกำหนดถือว่าคุณยอมรับข้อกำหนดที่เปลี่ยนแปลง" },
      { heading: "2. คุณสมบัติ", body: "คุณต้องมีอายุอย่างน้อย 18 ปีจึงจะใช้เว็บไซต์นี้ได้ การใช้เว็บไซต์แสดงว่าคุณรับรองว่าคุณมีอายุอย่างน้อย 18 ปีและมีความสามารถทางกฎหมาย" },
      { heading: "3. ความรับผิดชอบของบัญชี", body: "คุณต้องรักษาความลับของข้อมูลรับรองบัญชี ให้ข้อมูลบัญชีที่ถูกต้องและเป็นปัจจุบัน แต่ละคนสามารถมีได้เพียงหนึ่งบัญชี คุณยินยอมปฏิบัติตามนโยบายของแพลตฟอร์มเรื่องคุณภาพสินค้า การสื่อสาร และความปลอดภัย" },
      { heading: "4. การทำธุรกรรมในตลาด", body: "คำสั่งซื้อทั้งหมดถือเป็นการขายขาด ยกเว้นกรณีได้รับสินค้าผิดที่มีหลักฐานภาพถ่าย กรณีสินค้าผิดที่ยืนยันแล้ว เราจะพยายามส่งสินค้าที่ถูกต้องให้ใหม่โดยไม่มีค่าใช้จ่ายเพิ่ม หากทำไม่ได้จะคืนเงิน หากผู้ขายส่งสินค้าผิด ต้องส่งสินค้าที่ถูกต้องใหม่โดยรับผิดชอบค่าใช้จ่ายเอง" },
      { heading: "5. ราคาและสกุลเงิน", body: "ราคาสินค้า ยอดกระเป๋าเงิน ค่าปลดล็อกเนื้อหา และค่าข้อความทั้งหมดแสดงเป็นเงินบาท (THB) การชำระเงินด้วยบัตรเครดิตสำหรับการเติมเงินจะถูกเรียกเก็บเป็นดอลลาร์สหรัฐ (USD) โดยแปลงจำนวน THB เป็น USD ตามอัตราแลกเปลี่ยนปัจจุบัน (รวมค่าดำเนินการเล็กน้อย) ณ เวลาที่ชำระเงิน Siam Second Story LLC ไม่รับผิดชอบต่อค่าธรรมเนียมแปลงสกุลเงินเพิ่มเติมจากธนาคารผู้ออกบัตร" },
      { heading: "6. การชำระเงินและการเรียกเก็บเงิน", body: "รายการชำระเงินจะแสดงบนใบแจ้งยอดบัตรเป็น \"Siam Second Story LLC\" การทำรายการซื้อถือว่าคุณอนุญาตให้เรียกเก็บเงินจากวิธีการชำระเงินที่เลือก" },
      { heading: "7. การคืนเงินและ Chargeback", body: "ยกเว้นกรณีสินค้าผิดตามข้อ 4 การขายทั้งหมดถือเป็นที่สิ้นสุด เราโต้แย้ง chargeback ทุกกรณีและส่งหลักฐานการยอมรับข้อกำหนดและกิจกรรมการใช้งาน การยื่น chargeback เท็จอาจทำให้บัญชีถูกระงับถาวร" },
      { heading: "8. ความประพฤติและการดูแล", body: "ห้ามใช้ถ้อยคำคุกคาม เลือกปฏิบัติ หรือไม่เหมาะสม แพลตฟอร์มใช้กฎสองสไตรก์ สไตรก์แรกจะมีคำเตือน สไตรก์ที่สองจะระงับบัญชีอัตโนมัติ หากผู้ซื้อถูกบล็อกโดยผู้ขายสองรายจะถูกบล็อกจากเว็บไซต์" },
      { heading: "9. เนื้อหาและทรัพย์สินทางปัญญา", body: "ผู้ใช้ยังคงเป็นเจ้าของเนื้อหาที่ส่ง แต่อนุญาตให้ Siam Second Story LLC ใช้ แสดง และเผยแพร่เนื้อหาดังกล่าว การออกแบบ แบรนด์ ซอฟต์แวร์ และสื่อทั้งหมดของเว็บไซต์เป็นทรัพย์สินของ Siam Second Story LLC" },
      { heading: "10. ความเป็นส่วนตัว", body: "การใช้เว็บไซต์อยู่ภายใต้นโยบายความเป็นส่วนตัวของเราด้วย การใช้เว็บไซต์ถือว่าคุณยินยอมตามแนวปฏิบัติที่อธิบายไว้ในนโยบายความเป็นส่วนตัว" },
      { heading: "11. ข้อจำกัดความรับผิดชอบ", body: "เว็บไซต์และบริการทั้งหมดให้บริการ \"ตามสภาพ\" โดยไม่มีการรับประกันใดๆ Siam Second Story LLC จะไม่รับผิดต่อความเสียหายทางอ้อม พิเศษ หรือเป็นผลสืบเนื่อง ความรับผิดรวมสูงสุดจำกัดไม่เกินจำนวนเงินที่คุณจ่ายในช่วง 12 เดือนก่อนหน้า" },
      { heading: "12. การชดใช้ค่าเสียหาย", body: "คุณตกลงที่จะชดใช้และปกป้อง Siam Second Story LLC จากการเรียกร้อง ความรับผิด ความเสียหาย และค่าใช้จ่ายทั้งหมดที่เกิดจากการใช้เว็บไซต์หรือการละเมิดข้อกำหนดเหล่านี้" },
      { heading: "13. กฎหมายที่ใช้บังคับ", body: "ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายของรัฐไวโอมิง สหรัฐอเมริกา ข้อพิพาทใดๆ จะอยู่ภายใต้เขตอำนาจศาลของศาลใน Sheridan County รัฐไวโอมิง" },
      { heading: "14. การเปลี่ยนแปลงข้อกำหนด", body: "Siam Second Story LLC สงวนสิทธิ์ในการแก้ไขข้อกำหนดเหล่านี้ได้ตลอดเวลา การเปลี่ยนแปลงจะมีผลทันทีเมื่อเผยแพร่บนเว็บไซต์ การใช้งานต่อเนื่องถือว่ายอมรับข้อกำหนดที่แก้ไข" },
      { heading: "15. ข้อมูลติดต่อและบริษัท", body: "Thailand Panties เป็นของและดำเนินการโดย Siam Second Story LLC ตั้งอยู่ที่ 30 N Gould Street Ste R, Sheridan, Wyoming 82801 สหรัฐอเมริกา สำหรับคำถามกรุณาใช้หน้าติดต่อบนเว็บไซต์" },
    ],
    shippingCards: [
      { title: "ช่วงเวลาจัดส่ง", body: "โดยปกติคำสั่งซื้อจะจัดส่งภายใน 1-3 วันทำการหลังยืนยันคำสั่งซื้อ แต่อาจใช้เวลานานกว่านี้ตามตำแหน่งที่ตั้งของผู้ขาย" },
      { title: "ผู้ให้บริการขนส่ง", body: "ทุกพัสดุจัดส่งผ่านผู้ให้บริการระหว่างประเทศและมีเลขติดตามหลังส่ง" },
      { title: "ค่าจัดส่ง", body: "ผู้ซื้อชำระค่าจัดส่งตามจริงที่แสดงในขั้นตอนเช็กเอาต์ตามปลายทาง" },
      { title: "พื้นที่จัดส่งและบรรจุภัณฑ์", body: "เราจัดส่งทั่วโลกด้วยบรรจุภัณฑ์ภายนอกแบบไม่เปิดเผยตัวตน (ไม่มีโลโก้ระบุตัวสินค้า) ทุกพัสดุมีเสื้อยืด สติกเกอร์ และของขวัญ พร้อมระบุในเอกสารศุลกากรเป็นเสื้อผ้า/สื่อโปรโมชัน/ของขวัญ" },
    ],
    communityPoints: [
      "ไม่อนุญาตให้ใช้ถ้อยคำคุกคาม ดูหมิ่น เลือกปฏิบัติ หรือไม่เหมาะสมในข้อความ คำขอ หรือการติดต่อฝ่ายช่วยเหลือ",
      "เราใช้ระบบสองสไตรก์สำหรับพฤติกรรมไม่เหมาะสม หากฝ่าฝืนซ้ำอาจถูกระงับหรือปิดบัญชี",
      "หากผู้ซื้อถูกบล็อกโดยผู้ขายสองราย บัญชีผู้ซื้อจะถูกบล็อกจากแพลตฟอร์ม",
    ],
    worldwideCards: [
      { title: "ครอบคลุมทั่วโลก", body: "เราจัดส่งจากประเทศไทยไปยังปลายทางที่รองรับทั่วโลก" },
      { title: "การจัดการแบบเป็นส่วนตัว", body: "พัสดุทั้งหมดใช้บรรจุภัณฑ์ภายนอกแบบไม่เปิดเผยตัวตน โดยทุกพัสดุมีเสื้อยืด สติกเกอร์ และของขวัญ และระบุเอกสารศุลกากรเป็นเสื้อผ้า/สื่อโปรโมชัน/ของขวัญ" },
      { title: "ผู้ให้บริการระหว่างประเทศ + ค่าจัดส่งตามจริง", body: "การจัดส่งใช้ผู้ให้บริการระหว่างประเทศ และผู้ซื้อชำระค่าจัดส่งตามจริงที่แสดงตอนเช็กเอาต์" },
    ],
    packagingPoints: [
      "เราใช้ซองหรือกล่องภายนอกที่เหมาะสมเพื่อปกป้องสินค้าในระหว่างขนส่ง",
      "บรรจุภัณฑ์ภายนอกเป็นแบบไม่เปิดเผยตัวตนและไม่มีเครื่องหมายระบุตัวสินค้า",
      "ทุกพัสดุมีเสื้อยืด สติกเกอร์ และของขวัญ โดยเอกสารศุลกากรจะระบุเป็นเสื้อผ้า/สื่อโปรโมชัน/ของขวัญ",
      "ฉลากจัดส่งใช้ข้อมูลมาตรฐานที่ผู้ให้บริการขนส่งกำหนด",
      "แนวทางบรรจุภัณฑ์ถูกออกแบบให้สมดุลทั้งความปลอดภัย ความเป็นส่วนตัว และข้อกำหนดการขนส่งระหว่างประเทศ",
    ],
  },
  my: {
    termsEyebrow: "ဥပဒေ", termsTitle: "အသုံးပြုမှုစည်းမျဉ်း", termsSubtitle: "thailandpanties.com ကို အသုံးမပြုမီ ဤစည်းမျဉ်းများကို သေချာဖတ်ပါ။ Siam Second Story LLC မှ လုပ်ငန်းဆောင်ရွက်သည်။",
    shippingEyebrow: "မူဝါဒ", shippingTitle: "ပို့ဆောင်ရေး မူဝါဒ", shippingSubtitle: "ထိုင်းနိုင်ငံမှ ကမ္ဘာတစ်ဝှမ်း ပို့ဆောင်ပုံနှင့် စရိတ်သတ်မှတ်ပုံ",
    communityEyebrow: "မူဝါဒ", communityTitle: "အသိုင်းအဝိုင်း စံနှုန်း", communitySubtitle: "buyer၊ seller နှင့် support ကြား လေးစားသော ဆက်သွယ်ရေးစည်းကမ်းများ",
    worldwideEyebrow: "Marketplace", worldwideTitle: "ကမ္ဘာတစ်ဝှမ်း ပို့ဆောင်မှု", worldwideSubtitle: "နိုင်ငံတကာ carrier များဖြင့် လျှို့ဝှက်ပို့ဆောင်မှုနှင့် စရိတ်တိတိကျကျ",
    packagingEyebrow: "အကူအညီ", packagingTitle: "ထုပ်ပိုးမှု စံနှုန်း", packagingSubtitle: "ပို့ဆောင်ရာတွင် လုံခြုံပြီး လျှို့ဝှက်မှုကောင်းရန် ထုပ်ပိုးနည်း",
    refundEvidenceEyebrow: "အကူအညီ", refundEvidenceTitle: "Refund Evidence Form", refundEvidenceSubtitle: "wrong-item case အတွက် သက်သေအထောက်အထား တင်ပြရန်",
    termsSections: [
      { heading: "1. စည်းမျဉ်းများ လက်ခံခြင်း", body: "thailandpanties.com (\"Site\") ကို အသုံးပြုခြင်းဖြင့် ဤစည်းမျဉ်းများကို လက်ခံရန် သဘောတူပါသည်။ သဘောမတူပါက Site ကို အသုံးမပြုပါနှင့်။ စည်းမျဉ်းပြောင်းလဲမှုများပြီးနောက် ဆက်လက်အသုံးပြုခြင်းသည် ပြောင်းလဲမှုများကို လက်ခံသည်ဟု ယူဆပါသည်။" },
      { heading: "2. အရည်အချင်း", body: "ဤ Site ကို အသုံးပြုရန် အသက် 18 နှစ်ပြည့်ပြီးဖြစ်ရမည်။ Site ကို အသုံးပြုခြင်းဖြင့် အသက် 18 နှစ်ပြည့်ပြီးကြောင်း အာမခံပါသည်။" },
      { heading: "3. အကောင့်တာဝန်ဝတ္တရားများ", body: "အကောင့် credentials များကို လျှို့ဝှက်ထားရှိရန်နှင့် account အချက်အလက်မှန်ကန်စွာ ပေးရပါမည်။ တစ်ဦးလျှင် အကောင့်တစ်ခုသာ ရှိနိုင်သည်။ listing quality၊ ဆက်သွယ်မှု နှင့် safety policy များကို လိုက်နာရမည်။" },
      { heading: "4. Marketplace လုပ်ငန်းစဉ်များ", body: "Order အားလုံး final sale ဖြစ်သည်။ Wrong-item case တွင်သာ refund evidence form မှတဆင့် စိစစ်နိုင်သည်။ Wrong-item ဖြစ်ပါက buyer အတွက် အပိုကုန်ကျစရိတ်မရှိဘဲ ပြန်ပို့ပေးရန် ကြိုးစားမည်။ Seller က wrong item ပို့မိပါက ကိုယ်ပိုင်ကုန်ကျစရိတ်ဖြင့် ပြန်ပို့ရပါမည်။" },
      { heading: "5. စျေးနှုန်းနှင့် ငွေကြေး", body: "စျေးနှုန်း၊ wallet balance၊ unlock fee၊ message fee အားလုံးကို THB ဖြင့်ပြသပါသည်။ Credit card ဖြင့် wallet top-up လုပ်ပါက USD ဖြင့် charge လုပ်ပြီး လက်ရှိ exchange rate (processing margin အနည်းငယ်ပါဝင်) ဖြင့် convert လုပ်ပါသည်။ Siam Second Story LLC သည် card issuer မှ ကောက်ခံသော currency conversion fee များအတွက် တာဝန်မရှိပါ။" },
      { heading: "6. ငွေပေးချေမှုနှင့် ငွေတောင်းခံမှု", body: "Card statement တွင် \"Siam Second Story LLC\" ဟု ပြသပါမည်။ ဝယ်ယူမှုပြုလုပ်ခြင်းဖြင့် ရွေးချယ်ထားသော payment method မှ ငွေဖြတ်ယူခွင့် ပေးပါသည်။" },
      { heading: "7. Refund နှင့် Chargeback", body: "Section 4 (wrong-item) မှလွဲ၍ sale အားလုံး final ဖြစ်သည်။ Chargeback များအားလုံးကို dispute လုပ်ပြီး Terms သဘောတူမှုနှင့် usage activity အထောက်အထားများ တင်ပြပါသည်။ Chargeback အတုတင်ပြမှုသည် account ရပ်ဆိုင်းခံရနိုင်သည်။" },
      { heading: "8. အပြုအမူနှင့် ကြီးကြပ်မှု", body: "အကြမ်းဖက်၊ ခြိမ်းခြောက်မှု၊ မလျော်ကန်သော language များကို ခွင့်မပြုပါ။ Two-strike policy ဖြင့် ပထမ strike တွင် သတိပေးပြီး ဒုတိယ strike တွင် account ရပ်ဆိုင်းပါမည်။ Seller နှစ်ဦးက block လုပ်ပါက buyer account ကို site မှ block လုပ်ပါမည်။" },
      { heading: "9. Content နှင့် Intellectual Property", body: "User များသည် တင်သွင်းသော content ကို ပိုင်ဆိုင်ဆဲဖြစ်သော်လည်း Siam Second Story LLC အား Site လုပ်ငန်းဆောင်ရွက်ရန် အသုံးပြုခွင့် ပေးပါသည်။ Site ၏ ဒီဇိုင်း၊ branding၊ software များသည် Siam Second Story LLC ၏ ပိုင်ဆိုင်မှုဖြစ်သည်။" },
      { heading: "10. ကိုယ်ရေးလုံခြုံမှု", body: "Site အသုံးပြုမှုသည် Privacy Policy အောက်တွင်လည်း ရှိပါသည်။ Site အသုံးပြုခြင်းဖြင့် Privacy Policy ကို သဘောတူပါသည်။" },
      { heading: "11. ကန့်သတ်ချက်များနှင့် တာဝန်ယူမှုကန့်သတ်ချက်", body: "Site နှင့် ဝန်ဆောင်မှုများကို \"ရှိသည့်အတိုင်း\" ပေးပါသည်။ Siam Second Story LLC သည် သွယ်ဝိုက်သော ဆုံးရှုံးမှုများအတွက် တာဝန်မရှိပါ။ စုစုပေါင်း တာဝန်ယူမှုသည် ယခင် 12 လအတွင်း ပေးချေခဲ့သော ငွေပမာဏထက် မပိုပါ။" },
      { heading: "12. နစ်နာကြေးပေးခြင်း", body: "Site အသုံးပြုမှု သို့မဟုတ် ဤစည်းမျဉ်းချိုးဖောက်မှုကြောင့် ဖြစ်ပေါ်လာသော claims၊ ဆုံးရှုံးမှုများအားလုံးအတွက် Siam Second Story LLC ကို ကာကွယ်ပေးရန် သဘောတူပါသည်။" },
      { heading: "13. သက်ဆိုင်ရာ ဥပဒေ", body: "ဤစည်းမျဉ်းများသည် United States၊ Wyoming ပြည်နယ် ဥပဒေအောက်တွင် ရှိပါသည်။ အငြင်းပွားမှုများသည် Sheridan County၊ Wyoming ၏ တရားရုံးများတွင် ဖြေရှင်းရပါမည်။" },
      { heading: "14. စည်းမျဉ်းပြောင်းလဲမှုများ", body: "Siam Second Story LLC သည် ဤစည်းမျဉ်းများကို အချိန်မရွေး ပြင်ဆင်နိုင်သည်။ ပြောင်းလဲမှုများသည် Site တွင် ဖော်ပြပြီးချိန်မှ အသက်ဝင်ပါမည်။ ဆက်လက်အသုံးပြုခြင်းသည် ပြင်ဆင်ထားသော စည်းမျဉ်းများကို လက်ခံသည်ဟု ယူဆပါသည်။" },
      { heading: "15. ဆက်သွယ်ရန်နှင့် ကုမ္ပဏီအချက်အလက်", body: "Thailand Panties သည် Siam Second Story LLC မှ ပိုင်ဆိုင်ပြီး လုပ်ငန်းဆောင်ရွက်ပါသည်။ လိပ်စာ - 30 N Gould Street Ste R, Sheridan, Wyoming 82801, United States။ မေးခွန်းများအတွက် Site ရှိ Contact page ကို အသုံးပြုပါ။" },
    ],
    shippingCards: [
      { title: "ပို့ဆောင်ချိန်", body: "Order ကိုအတည်ပြုပြီးနောက် ပုံမှန်အားဖြင့် 1-3 business days အတွင်း ပို့ဆောင်ပါသည်။ သို့သော် seller ၏ တည်နေရာအပေါ်မူတည်၍ ပို့ဆောင်ချိန် ပိုကြာနိုင်ပါသည်။" },
      { title: "Carrier", body: "ပို့ဆောင်မှုအားလုံးကို international carrier များဖြင့်လုပ်ဆောင်ပြီး dispatch ပြီးသည်နှင့် tracking ပေးပါသည်။" },
      { title: "ပို့ဆောင်စရိတ်", body: "Checkout တွင်ပြထားသော destination အလိုက် exact shipping cost ကို buyer ကပေးဆောင်ပါသည်။" },
      { title: "Coverage နှင့် Packaging", body: "ကမ္ဘာတစ်ဝှမ်း ပို့ဆောင်ပြီး အပြင်ထုပ်ပိုးမှုမှာ branding မပါသော discreet format သုံးပါသည်။ Package တိုင်းတွင် t-shirt, stickers နှင့် gift ပါဝင်ပြီး customs forms တွင် apparel/promotional gift materials အဖြစ် မှတ်သားပါသည်။" },
    ],
    communityPoints: [
      "မက်ဆေ့ခ်ျ၊ request သို့မဟုတ် support ဆက်သွယ်မှုများတွင် အကြမ်းဖက်၊ ခြိမ်းခြောက်၊ မလေးစားသော စကားလုံးများကို ခွင့်မပြုပါ။",
      "မလျော်ကန်သောပြုမူမှုအတွက် two-strike moderation policy သုံးပြီး ထပ်ခါတလဲလဲ ချိုးဖောက်ပါက အကောင့်ကို ရပ်ဆိုင်း/ဖျက်သိမ်းနိုင်သည်။",
      "Buyer ကို seller နှစ်ဦးက block လုပ်ပါက buyer account ကို marketplace မှ block လုပ်ပါမည်။",
    ],
    worldwideCards: [
      { title: "ကမ္ဘာတစ်ဝှမ်း coverage", body: "ထိုင်းနိုင်ငံမှ စတင်၍ ပံ့ပိုးထားသော destination များသို့ ကမ္ဘာတစ်ဝှမ်း ပို့ဆောင်ပါသည်။" },
      { title: "Discreet handling", body: "Package အားလုံးကို identifying branding မပါသော အပြင်ထုပ်ပိုးမှုဖြင့် ပို့ဆောင်ပါသည်။ Shipment တိုင်းတွင် t-shirt, stickers နှင့် gift ပါဝင်ပြီး customs forms တွင် apparel/promotional gift materials အဖြစ် မှတ်သားပါသည်။" },
      { title: "International carriers + exact cost", body: "International carrier များကို အသုံးပြုပြီး checkout တွင်ပြထားသော exact shipping cost ကို buyer ကပေးဆောင်ပါသည်။" },
    ],
    packagingPoints: [
      "ပို့ဆောင်ရေးအတွင်း ပစ္စည်းလုံခြုံစေရန် protective mailer သို့မဟုတ် box များကို သုံးပါသည်။",
      "အပြင်ထုပ်ပိုးမှုမှာ discreet ဖြစ်ပြီး identifying branding မပါပါ။",
      "Package တိုင်းတွင် t-shirt, stickers နှင့် gift ပါဝင်ပြီး customs form တွင် apparel/promotional gift materials အဖြစ် မှတ်သားပါသည်။",
      "Shipping label တွင် carrier မှလိုအပ်သော standard fulfillment အချက်အလက်များကိုသာ အသုံးပြုပါသည်။",
      "Packaging ကို presentation၊ လုံခြုံရေးနှင့် international shipping requirements တို့အကြား မျှတစွာ စီစဉ်ထားပါသည်။",
    ],
  },
  ru: {
    termsEyebrow: "Юридическое", termsTitle: "Условия сервиса", termsSubtitle: "Пожалуйста, внимательно прочитайте Условия использования перед использованием thailandpanties.com, управляемого Siam Second Story LLC.",
    shippingEyebrow: "Политика", shippingTitle: "Политика доставки", shippingSubtitle: "Как отправляются заказы, формируется стоимость и выполняется доставка по миру.",
    communityEyebrow: "Политика", communityTitle: "Стандарты сообщества", communitySubtitle: "Правила уважительного общения между покупателями, продавцами и поддержкой.",
    worldwideEyebrow: "Маркетплейс", worldwideTitle: "Доставка по всему миру", worldwideSubtitle: "Международная доставка с дискретной упаковкой и прозрачной стоимостью.",
    packagingEyebrow: "Поддержка", packagingTitle: "Стандарты упаковки", packagingSubtitle: "Как мы упаковываем заказы для защиты в пути и конфиденциальности.",
    refundEvidenceEyebrow: "Поддержка", refundEvidenceTitle: "Форма доказательств для возврата", refundEvidenceSubtitle: "Отправьте доказательства при доставке не того товара.",
    termsSections: [
      { heading: "1. Принятие условий", body: "Используя thailandpanties.com (\"Сайт\"), вы соглашаетесь с настоящими Условиями. Если вы не согласны, не используйте Сайт. Продолжение использования Сайта после внесения изменений означает принятие обновлённых Условий." },
      { heading: "2. Правоспособность", body: "Вам должно быть не менее 18 лет для использования Сайта. Используя Сайт, вы подтверждаете, что вам исполнилось 18 лет и вы обладаете дееспособностью." },
      { heading: "3. Ответственность за аккаунт", body: "Вы несёте ответственность за сохранность учётных данных и всю активность в вашем аккаунте. Необходимо указывать точную и актуальную информацию. Каждый пользователь может иметь только один аккаунт. Вы обязуетесь соблюдать правила площадки." },
      { heading: "4. Сделки на маркетплейсе", body: "Все заказы являются окончательной продажей. Исключение — случаи получения не того товара с предоставлением фотодоказательств. В подтверждённых случаях мы сначала пытаемся отправить правильный товар без дополнительных расходов для покупателя. Если это невозможно, оформляется возврат. Продавец обязан переслать правильный товар за свой счёт." },
      { heading: "5. Цены и валюта", body: "Все цены, баланс кошелька, разблокировки и комиссии отображаются в THB. Оплата кредитной картой при пополнении кошелька производится в USD по текущему курсу обмена (включая небольшую процессинговую наценку). Siam Second Story LLC не несёт ответственности за дополнительные комиссии за конвертацию валюты вашего банка." },
      { heading: "6. Оплата и выставление счетов", body: "Списания отображаются в выписке по карте как \"Siam Second Story LLC\". Совершая покупку, вы авторизуете списание с выбранного способа оплаты." },
      { heading: "7. Возвраты и чарджбэки", body: "За исключением случаев, описанных в разделе 4, все продажи окончательны. Все чарджбэки оспариваются с предоставлением доказательств согласия покупателя с Условиями и его активности на Сайте. Подача ложного чарджбэка может привести к блокировке аккаунта." },
      { heading: "8. Поведение и модерация", body: "Оскорбительное, угрожающее или дискриминационное общение строго запрещено. Действует политика двух страйков: первый — предупреждение, второй — автоматическая блокировка аккаунта. Если покупателя блокируют два продавца, аккаунт покупателя блокируется на Сайте." },
      { heading: "9. Контент и интеллектуальная собственность", body: "Пользователи сохраняют права на загруженный контент, но предоставляют Siam Second Story LLC неисключительную лицензию на его использование. Дизайн, бренд, программное обеспечение и материалы Сайта являются собственностью Siam Second Story LLC." },
      { heading: "10. Конфиденциальность", body: "Использование Сайта также регулируется нашей Политикой конфиденциальности. Используя Сайт, вы соглашаетесь с описанными в ней практиками." },
      { heading: "11. Отказ от гарантий и ограничение ответственности", body: "Сайт и все услуги предоставляются «как есть» без каких-либо гарантий. Siam Second Story LLC не несёт ответственности за косвенные, случайные или штрафные убытки. Совокупная ответственность ограничена суммой, уплаченной вами за последние 12 месяцев." },
      { heading: "12. Возмещение убытков", body: "Вы обязуетесь возместить и оградить Siam Second Story LLC от любых претензий, убытков и расходов, связанных с вашим использованием Сайта или нарушением настоящих Условий." },
      { heading: "13. Применимое право", body: "Настоящие Условия регулируются законодательством штата Вайоминг, США. Любые споры подлежат рассмотрению в судах округа Шеридан, штат Вайоминг." },
      { heading: "14. Изменение условий", body: "Siam Second Story LLC оставляет за собой право изменять настоящие Условия в любое время. Изменения вступают в силу сразу после публикации на Сайте. Продолжение использования Сайта означает принятие изменённых Условий." },
      { heading: "15. Контактная информация и данные компании", body: "Thailand Panties принадлежит и управляется компанией Siam Second Story LLC, расположенной по адресу: 30 N Gould Street Ste R, Sheridan, Wyoming 82801, США. По вопросам используйте страницу контактов на Сайте." },
    ],
    shippingCards: [
      { title: "Срок отправки", body: "Обычно заказы отправляются в течение 1-3 рабочих дней после оформления и подтверждения, но срок может быть дольше в зависимости от локации продавца." },
      { title: "Перевозчик", body: "Все отправления выполняются международными перевозчиками и сопровождаются трекингом после отправки." },
      { title: "Стоимость доставки", body: "Покупатель оплачивает точную стоимость доставки, указанную на этапе checkout для своего направления." },
      { title: "Покрытие и упаковка", body: "Мы отправляем по всему миру в дискретной внешней упаковке без идентифицирующей маркировки. В каждую посылку добавляются футболка, стикеры и подарок, а в таможенных формах указывается категория «одежда/промо-материалы/подарок»." },
    ],
    communityPoints: [
      "Оскорбительное, угрожающее, дискриминационное или агрессивное общение в сообщениях, запросах и поддержке не допускается.",
      "Мы применяем политику двух страйков за нарушение правил поведения. Повторные нарушения могут привести к блокировке или удалению аккаунта.",
      "Если покупателя блокируют два продавца, аккаунт покупателя блокируется на маркетплейсе.",
    ],
    worldwideCards: [
      { title: "Покрытие по всему миру", body: "Мы отправляем из Таиланда в поддерживаемые страны по всему миру." },
      { title: "Дискретная обработка", body: "Все посылки отправляются в дискретной внешней упаковке без идентифицирующей маркировки. В каждую отправку входят футболка, стикеры и подарок, а в таможенных формах указывается категория «одежда/промо-материалы/подарок»." },
      { title: "Международные перевозчики + точная стоимость", body: "Отправки выполняются международными перевозчиками, а покупатель оплачивает точную стоимость доставки, указанную при checkout." },
    ],
    packagingPoints: [
      "Для сохранности в пути используются защитные внешние пакеты или коробки.",
      "Внешняя упаковка дискретная и не содержит идентифицирующей маркировки.",
      "В каждую посылку добавляются футболка, стикеры и подарок; в таможенных формах указывается категория «одежда/промо-материалы/подарок».",
      "Транспортные этикетки содержат стандартные данные, требуемые перевозчиком.",
      "Выбор упаковки балансирует презентацию, защиту при перевозке и международные требования к доставке.",
    ],
  },
};

const SELLER_APPEALS_I18N = {
  en: {
    eyebrow: "Seller Support",
    title: "Seller Appeals Process",
    subtitle: "How sellers can appeal strikes, frozen status, or moderation decisions.",
    points: [
      "If your seller account receives strikes or is frozen, submit an appeal with clear context and timeline.",
      "Include relevant IDs when possible: message IDs, order IDs, request IDs, and dates.",
      "Admin reviews appeals in queue order and posts the decision in your appeal history.",
      "Approved appeals can restore account access and resolve active strikes according to policy.",
    ],
    openAppeals: "Open appeals center",
  },
  th: {
    eyebrow: "ช่วยเหลือผู้ขาย",
    title: "ขั้นตอนการอุทธรณ์สำหรับผู้ขาย",
    subtitle: "วิธีที่ผู้ขายสามารถอุทธรณ์สไตรก์ บัญชีถูกระงับ หรือการตัดสินด้านการดูแลชุมชน",
    points: [
      "หากบัญชีผู้ขายของคุณมีสไตรก์หรือถูกระงับ ให้ส่งคำอุทธรณ์พร้อมรายละเอียดและลำดับเวลาอย่างชัดเจน",
      "ควรแนบเลขอ้างอิงที่เกี่ยวข้อง เช่น message ID, order ID, request ID และวันที่เกิดเหตุ",
      "แอดมินจะตรวจสอบคำอุทธรณ์ตามลำดับคิว และบันทึกผลการตัดสินในประวัติการอุทธรณ์ของคุณ",
      "หากอุทธรณ์ผ่าน อาจคืนสิทธิ์การใช้งานบัญชีและจัดการสไตรก์ตามนโยบาย",
    ],
    openAppeals: "เปิดศูนย์อุทธรณ์",
  },
  my: {
    eyebrow: "Seller အကူအညီ",
    title: "Seller Appeals Process",
    subtitle: "seller များအတွက် strike, frozen status သို့မဟုတ် moderation ဆုံးဖြတ်ချက်များကို အယူခံတင်နည်း",
    points: [
      "Seller account တွင် strike များရှိပါက သို့မဟုတ် frozen ဖြစ်ပါက အချိန်လိုင်းနှင့် context ကိုရှင်းလင်းစွာဖော်ပြပြီး appeal တင်ပါ။",
      "ဖြစ်နိုင်ပါက message ID, order ID, request ID နှင့် ရက်စွဲများကဲ့သို့ အထောက်အထား ID များ ထည့်ပေးပါ။",
      "Admin သည် appeals များကို queue အလိုက် စိစစ်ပြီး ဆုံးဖြတ်ချက်ကို appeal history ထဲတွင် ပြသပါမည်။",
      "Appeal အတည်ပြုခံရပါက policy အရ account access ပြန်လည်ရရှိစေနိုင်ပြီး active strike များကို ဖြေရှင်းပေးနိုင်ပါသည်။",
    ],
    openAppeals: "Appeals center ဖွင့်မည်",
  },
  ru: {
    eyebrow: "Поддержка продавцов",
    title: "Процесс апелляции для продавцов",
    subtitle: "Как продавцам обжаловать страйки, заморозку аккаунта и решения модерации.",
    points: [
      "Если на аккаунте продавца есть страйки или он заморожен, подайте апелляцию с понятным контекстом и таймлайном.",
      "По возможности укажите связанные ID: сообщений, заказов, запросов и даты событий.",
      "Администратор рассматривает апелляции по очереди и публикует решение в истории апелляций.",
      "Одобренная апелляция может восстановить доступ к аккаунту и закрыть активные страйки согласно политике.",
    ],
    openAppeals: "Открыть центр апелляций",
  },
};

function StaticLanguageSelect({ value, onChange, uiLanguage = "en" }) {
  const meta = STATIC_LANGUAGE_META[uiLanguage] || STATIC_LANGUAGE_META.en;
  return (
    <div className="mb-4 flex justify-end">
      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
        {meta.label}
        <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="en">{meta.english}</option>
          <option value="th">{meta.thai}</option>
          <option value="my">{meta.burmese}</option>
          <option value="ru">{meta.russian}</option>
        </select>
      </label>
    </div>
  );
}

function marketplaceText(uiLanguage = "en") {
  return MARKETPLACE_I18N[uiLanguage] || MARKETPLACE_I18N.en;
}

function helpText(uiLanguage) {
  return HELP_I18N[uiLanguage] || HELP_I18N.en;
}

const FAQ_BACK_LABELS = {
  en: "Back to FAQ",
  th: "กลับไปหน้า FAQ",
  my: "FAQ သို့ ပြန်သွားရန်",
  ru: "Назад к FAQ",
};

function BackToFaqButton({ navigate, uiLanguage = "en" }) {
  if (!navigate) return null;
  const label = FAQ_BACK_LABELS[uiLanguage] || FAQ_BACK_LABELS.en;
  return (
    <button
      type="button"
      onClick={() => navigate("/faq")}
      className="mb-4 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
    >
      {label}
    </button>
  );
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

export function TermsPage({ uiLanguage = "en", navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = SUPPORT_STATIC_I18N[pageLanguage] ? pageLanguage : "en";
  const t = SUPPORT_STATIC_I18N[locale] || SUPPORT_STATIC_I18N.en;
  return (
    <PageShell eyebrow={t.termsEyebrow} title={t.termsTitle} subtitle={t.termsSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="space-y-8 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {(t.termsSections || SUPPORT_STATIC_I18N.en.termsSections) ? (t.termsSections || SUPPORT_STATIC_I18N.en.termsSections).map((section) => (
          <div key={section.heading}>
            <h3 className="mb-2 text-lg font-semibold text-slate-800">{section.heading}</h3>
            {section.body ? <p className="leading-7">{section.body}</p> : null}
            {section.points ? section.points.map((p) => <p key={p} className="ml-4 leading-7">{p}</p>) : null}
          </div>
        )) : (t.termsPoints || SUPPORT_STATIC_I18N.en.termsPoints).map((point) => (
          <p key={point}>{point}</p>
        ))}
      </div>
    </PageShell>
  );
}

export function ShippingPolicyPage({ uiLanguage = "en", navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = SUPPORT_STATIC_I18N[pageLanguage] ? pageLanguage : "en";
  const t = SUPPORT_STATIC_I18N[locale] || SUPPORT_STATIC_I18N.en;
  const cards = t.shippingCards || SUPPORT_STATIC_I18N.en.shippingCards;
  return (
    <PageShell eyebrow={t.shippingEyebrow} title={t.shippingTitle} subtitle={t.shippingSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="grid gap-6 md:grid-cols-2">
        {cards.map((card) => (
          <div key={card.title} className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
            <h3 className="text-xl font-semibold">{card.title}</h3>
            <p className="mt-3 text-slate-600">{card.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function RefundPolicyPage() {
  return (
    <PageShell eyebrow="Policy" title="Refund Policy" subtitle="Important purchase terms for all buyers.">
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        <p className="font-semibold text-slate-900">All sales are final, except wrong-item deliveries with submitted evidence.</p>
        <p>If you receive the wrong item, submit evidence through the refund evidence form so the case can be reviewed.</p>
        <p>We first try to ship the correct item at no additional expense to the buyer. If that is not possible, we issue a refund after review.</p>
        <p>If a seller ships the wrong item, the seller must reship the correct item at their own cost. If reship is not completed, the buyer is refunded and seller commission for that order is deducted.</p>
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

export function RefundEvidencePage({ currentUser, submitRefundEvidence, navigate, uiLanguage = "en" }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = SUPPORT_STATIC_I18N[pageLanguage] ? pageLanguage : "en";
  const t = SUPPORT_STATIC_I18N[locale] || SUPPORT_STATIC_I18N.en;
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
    <PageShell eyebrow={t.refundEvidenceEyebrow} title={t.refundEvidenceTitle} subtitle={t.refundEvidenceSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
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
              Refunds are only reviewed for wrong-item deliveries with evidence. We first try to have the correct item shipped at no extra cost to you. If that is not possible, a refund is issued after review. Include order details, a clear evidence summary, and links/screenshots so admin can verify quickly.
            </p>
            <input
              value={form.orderId}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, orderId: event.target.value }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Order ID (for example: order_123456)"
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
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = HELP_I18N[pageLanguage] ? pageLanguage : "en";
  const text = helpText(locale);
  const allFaqs = Array.isArray(text.faqs) ? text.faqs : [];
  const barSignals = /(bar|bars|bar messages|bar dashboard|บาร์|ข้อความบาร์|แดชบอร์ดบาร์|ဘား|bar ကို|бар|бары|сообщения бара)/i;
  const sellerSignals = /(seller|sellers|seller dashboard|stories|seller feed|ผู้ขาย|แดชบอร์ดผู้ขาย|ရောင်းသူ|seller\s*dashboard|продав|панель продавца)/i;
  const buyerPrioritySignals = /(independent seller|independent means|အလိုအလျောက် seller|seller ကိုယ်တိုင်|อิสระ|независим|real person|fake profile|\bai\b|คนจริง|โปรไฟล์ปลอม|ลวง|လူအစစ်|အတု profile|реальным человеком|фейковым профилем)/i;
  const buyerQuestionPrioritySignals = /(how quickly are orders shipped|จัดส่งเร็วแค่ไหน|ပို့ဆောင်ချိန်ဘယ်လောက်|как быстро отправляются заказы)/i;
  const classifyFaq = (faq) => {
    const question = String(faq?.q || "");
    const raw = `${faq?.q || ""} ${faq?.a || ""}`;
    if (buyerQuestionPrioritySignals.test(question)) return "buyer";
    if (barSignals.test(question)) return "bar";
    if (buyerPrioritySignals.test(raw)) return "buyer";
    return sellerSignals.test(raw) ? "seller" : "buyer";
  };
  const sellerFaqs = allFaqs.filter((faq) => classifyFaq(faq) === "seller");
  const barFaqs = allFaqs.filter((faq) => classifyFaq(faq) === "bar");
  const buyerFaqs = allFaqs.filter((faq) => classifyFaq(faq) === "buyer");
  const buyerFaqPriority = (faq) => {
    const q = String(faq?.q || "");
    if (/(real person|fake profile|คนจริง|โปรไฟล์ปลอม|လူအစစ်|အတု profile|реальным человеком|фейковым профилем)/i.test(q)) return 0;
    if (/(how quickly are orders shipped|จัดส่งเร็วแค่ไหน|ပို့ဆောင်ချိန်ဘယ်လောက်|как быстро отправляются заказы)/i.test(q)) return 1;
    return 2;
  };
  const orderedBuyerFaqs = [...buyerFaqs]
    .map((faq, index) => ({ faq, index }))
    .sort((a, b) => {
      const priorityDiff = buyerFaqPriority(a.faq) - buyerFaqPriority(b.faq);
      if (priorityDiff !== 0) return priorityDiff;
      return a.index - b.index;
    })
    .map((entry) => entry.faq);
  const hasSellerSection = sellerFaqs.length > 0;
  const hasBarSection = barFaqs.length > 0;
  const hasSpecializedSection = hasSellerSection || hasBarSection;
  const routeLabelsByLocale = {
    en: {
      "/refund-evidence": "Open refund evidence form",
      "/refund-policy": "Open refund policy",
      "/appeals": "Open appeals page",
      "/custom-requests": "Open custom requests",
      "/stories": "Open Stories",
      "/seller-dashboard": "Open seller dashboard",
      "/account": "Open account",
      "/order-help": "Open order help",
      "/shipping-policy": "Open shipping policy",
      "/worldwide-shipping": "Open worldwide shipping",
      "/privacy-packaging": "Open packaging standards",
      "/safety-report": "Open safety report form",
      "/community-standards": "Open community standards",
      "/terms": "Open terms",
      "/seller-appeals": "Open seller appeals process",
      "/bars": "Open bars",
      "/bar-messages": "Open bar messages",
      fallback: "Open page",
    },
    th: {
      "/refund-evidence": "เปิดฟอร์มหลักฐานขอคืนเงิน",
      "/refund-policy": "เปิดนโยบายการคืนเงิน",
      "/appeals": "เปิดหน้าศูนย์อุทธรณ์",
      "/custom-requests": "เปิดคำขอพิเศษ",
      "/stories": "เปิด Stories",
      "/seller-dashboard": "เปิดแดชบอร์ดผู้ขาย",
      "/account": "เปิดบัญชี",
      "/order-help": "เปิดช่วยเหลือคำสั่งซื้อ",
      "/shipping-policy": "เปิดนโยบายการจัดส่ง",
      "/worldwide-shipping": "เปิดการจัดส่งทั่วโลก",
      "/privacy-packaging": "เปิดมาตรฐานบรรจุภัณฑ์",
      "/safety-report": "เปิดฟอร์มรายงานความปลอดภัย",
      "/community-standards": "เปิดมาตรฐานชุมชน",
      "/terms": "เปิดข้อกำหนด",
      "/seller-appeals": "เปิดขั้นตอนอุทธรณ์ผู้ขาย",
      "/bars": "เปิดหน้าบาร์",
      "/bar-messages": "เปิดข้อความบาร์",
      fallback: "เปิดหน้า",
    },
    my: {
      "/refund-evidence": "Refund evidence form ဖွင့်မည်",
      "/refund-policy": "Refund policy ဖွင့်မည်",
      "/appeals": "Appeals page ဖွင့်မည်",
      "/custom-requests": "Custom requests ဖွင့်မည်",
      "/stories": "Stories ဖွင့်မည်",
      "/seller-dashboard": "Seller dashboard ဖွင့်မည်",
      "/account": "Account ဖွင့်မည်",
      "/order-help": "Order help ဖွင့်မည်",
      "/shipping-policy": "Shipping policy ဖွင့်မည်",
      "/worldwide-shipping": "Worldwide shipping ဖွင့်မည်",
      "/privacy-packaging": "Packaging standards ဖွင့်မည်",
      "/safety-report": "Safety report form ဖွင့်မည်",
      "/community-standards": "Community standards ဖွင့်မည်",
      "/terms": "Terms ဖွင့်မည်",
      "/seller-appeals": "Seller appeals process ဖွင့်မည်",
      "/bars": "Bars ဖွင့်မည်",
      "/bar-messages": "Bar messages ဖွင့်မည်",
      fallback: "စာမျက်နှာဖွင့်မည်",
    },
    ru: {
      "/refund-evidence": "Открыть форму доказательств возврата",
      "/refund-policy": "Открыть политику возврата",
      "/appeals": "Открыть страницу апелляций",
      "/custom-requests": "Открыть индивидуальные запросы",
      "/stories": "Открыть Stories",
      "/seller-dashboard": "Открыть панель продавца",
      "/account": "Открыть аккаунт",
      "/order-help": "Открыть помощь по заказу",
      "/shipping-policy": "Открыть политику доставки",
      "/worldwide-shipping": "Открыть международную доставку",
      "/privacy-packaging": "Открыть стандарты упаковки",
      "/safety-report": "Открыть форму отчета о безопасности",
      "/community-standards": "Открыть стандарты сообщества",
      "/terms": "Открыть условия",
      "/seller-appeals": "Открыть процесс апелляции продавца",
      "/bars": "Открыть бары",
      "/bar-messages": "Открыть сообщения бара",
      fallback: "Открыть страницу",
    },
  };
  const routeLabelByPath = routeLabelsByLocale[locale] || routeLabelsByLocale.en;
  const getFaqActions = (faq) => {
    const raw = `${faq?.q || ""} ${faq?.a || ""}`.toLowerCase();
    const routes = [];
    const isCustomsConfiscationTopic = /(confiscat|customs|government|jurisdiction|import law|ศุลกากร|ยึด|รัฐบาล|тамож|конфиск|госорган|အစိုးရ|သိမ်းယူ)/i.test(raw);
    const add = (path) => {
      if (!path || routes.includes(path)) return;
      routes.push(path);
    };
    if (/(refund|returns|wrong item|chargeback|คืนเงิน|ပြန်အမ်း|возврат)/i.test(raw) && !isCustomsConfiscationTopic) {
      add("/refund-evidence");
      add("/refund-policy");
    }
    if (/(appeals|strike|frozen account|account frozen|อุทธรณ์|สไตรก์|ระงับบัญชี|အယူခံ|strike|frozen|апелляц|страйк|заморож)/i.test(raw)) add("/appeals");
    if (/(seller appeal|appeal.*seller|ผู้ขาย.*อุทธรณ์|seller.*အယူခံ|апелляц.*продав)/i.test(raw)) add("/seller-appeals");
    if (/(custom request|คำขอพิเศษ|စိတ်ကြိုက်|индивидуальн)/i.test(raw)) add("/custom-requests");
    if (/(private.*post|unlock|following feed|save posts|like products|liked products|stories|seller feed|โพสต์.*private|ปลดล็อก|фид продавцов|private-пост)/i.test(raw)) add("/stories");
    if (/(bar.*save|bars?.*save|follow.*bar|follow.*seller|บาร์.*บันทึกโพสต์|บาร์.*ติดตาม|bar.*follow|бар.*подпис)/i.test(raw)) add("/bars");
    if (/(bar.*message|eligible contact|affiliate seller|bulk messaging|บาร์.*ข้อความ|ผู้ติดต่อที่มีสิทธิ์|bar.*message|бар.*сообщен|аффили)/i.test(raw)) add("/bar-messages");
    if (/(schedule posts|notifications|seller dashboard|แดชบอร์ดผู้ขาย|панель продавца)/i.test(raw)) add("/seller-dashboard");
    if (/(currency|wallet|message fee|thai baht|สกุลเงิน|кошел|валют)/i.test(raw)) add("/account");
    if (/(tracking|missing tracking|address update|delivery issue|เลขติดตาม|เปลี่ยนที่อยู่|ပို့ဆောင်ရေးပြဿနာ|трек|адрес|доставк.*проблем)/i.test(raw)) add("/order-help");
    if (/(packaging|discreet|customs form|apparel\/promotional gift materials|บรรจุภัณฑ์|ศุลกากร|ထုပ်ပိုး|customs form|упаковк|таможен)/i.test(raw)) add("/privacy-packaging");
    if (/(shipping|carrier|delivery time|ship time|จัดส่ง|ขนส่ง|пере?воз|доставк)/i.test(raw)) {
      add("/shipping-policy");
      add("/worldwide-shipping");
    }
    if (/(independent seller|bar-affiliated|affiliated seller|อิสระ|ผู้ขายอิสระ|seller ကိုယ်တိုင်|ချိတ်ဆက်ထားသော seller|независим|аффилирован)/i.test(raw)) add("/bars");
    if (isCustomsConfiscationTopic) add("/terms");
    if (/(abusive|harassment|off-platform payment|scam|blocked by two sellers|policy|language|พฤติกรรม|คุกคาม|หลอกลวง|блокир|оскорб|домогат|мошенн|အနိုင်ကျင့်|လိမ်လည်|ပြင်ပငွေပေးချေ)/i.test(raw)) add("/safety-report");
    if (/(abusive|blocked by two sellers|policy|language|พฤติกรรม|блокир|оскорб)/i.test(raw)) add("/community-standards");
    if (/(card statement|descriptor|terms of service|ข้อกำหนด|услов)/i.test(raw)) add("/terms");
    return routes.slice(0, 2).map((path) => ({ path, label: routeLabelByPath[path] || routeLabelByPath.fallback || routeLabelsByLocale.en.fallback }));
  };

  const renderFaqCard = (faq) => {
    const actions = getFaqActions(faq);
    return (
      <div key={faq.q} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <h3 className="text-lg font-semibold">{faq.q}</h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">{faq.a}</p>
        {actions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={`${faq.q}-${action.path}`}
                type="button"
                onClick={() => navigate?.(action.path)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <PageShell eyebrow={text.faqEyebrow} title={text.faqTitle} subtitle={text.faqSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <div className="grid gap-4">
        <div className="rounded-3xl border border-rose-100 bg-rose-50/40 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Buyer FAQ</h3>
          <div className="mt-4 grid gap-4">
            {(hasSpecializedSection ? orderedBuyerFaqs : allFaqs).map(renderFaqCard)}
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
        {hasBarSection ? (
          <div className="rounded-3xl border border-cyan-100 bg-cyan-50/40 p-6">
            <h3 className="text-lg font-semibold text-slate-900">Bar FAQ</h3>
            <div className="mt-4 grid gap-4">
              {barFaqs.map(renderFaqCard)}
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

export function CommunityStandardsPage({ uiLanguage = "en", navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = SUPPORT_STATIC_I18N[pageLanguage] ? pageLanguage : "en";
  const t = SUPPORT_STATIC_I18N[locale] || SUPPORT_STATIC_I18N.en;
  return (
    <PageShell eyebrow={t.communityEyebrow} title={t.communityTitle} subtitle={t.communitySubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {(t.communityPoints || SUPPORT_STATIC_I18N.en.communityPoints).map((point) => (
          <p key={point}>{point}</p>
        ))}
      </div>
    </PageShell>
  );
}

const CUSTOM_REQUESTS_I18N = {
  en: {
    eyebrow: "Marketplace",
    title: "Custom Requests",
    subtitle: "",
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
    buyerPromptTitle: "Quick buyer prompts",
    buyerPrompts: [
      "How are you?",
      "What did you do today?",
      "I'm great, thanks. How about you?"
    ],
    requestPresetTitle: "Custom request presets",
    requestPresets: [
      "Please share timeline, final price, and shipping estimate before we confirm.",
      "I prefer a neutral background and clear close-up detail photos.",
      "Can you turn image upload on for me?"
    ],
    buyerImageDisabledHelp: "Image upload is currently disabled. Please ask the seller to enable image uploads for this request.",
    customRequestSubmitted: "Custom request submitted.",
    sendRequest: "Send Request",
    needWalletSubmitPrefix: "You need at least",
    needWalletSubmitSuffix: "in your wallet to submit this request.",
    awaitingBuyerPayment: "awaiting buyer payment",
    sellerFeed: "Stories",
  },
  th: {
    eyebrow: "ตลาด",
    title: "คำขอพิเศษ",
    subtitle: "",
    submitFee: "การส่งคำขอพิเศษมีค่าใช้จ่าย",
    openFee: "เมื่อเปิดแล้ว ข้อความคำขอพิเศษมีค่าใช้จ่าย",
    perMessageBoth: "ต่อข้อความสำหรับผู้ซื้อ ผู้ขายตอบกลับได้ฟรี",
    loginBuyer: "เข้าสู่ระบบในฐานะผู้ซื้อเพื่อส่งคำขอพิเศษ",
    recentRequests: "คำขอล่าสุดของคุณ",
    noRequests: "ยังไม่มีคำขอที่ส่ง",
    noMessages: "ยังไม่มีข้อความ",
    replyPlaceholder: "ตอบกลับในคำขอนี้",
    send: "ส่ง",
    addWalletToSend: "เติมอย่างน้อย",
    toWalletSend: "ลงในกระเป๋าเพื่อส่งข้อความ",
    sellerQuote: "ราคาที่ผู้ขายเสนอ",
    yourCounter: "ข้อเสนอของคุณ",
    sellerNote: "หมายเหตุจากผู้ขาย:",
    waitingCounter: "รอผู้ขายตอบกลับข้อเสนอของคุณ",
    quoteAcceptedPaid: "ยอมรับราคาและชำระเงินแล้ว",
    acceptPay: "ยอมรับและชำระเงิน",
    quoteDeclined: "ราคาถูกปฏิเสธ",
    decline: "ปฏิเสธ",
    counterAmount: "จำนวนเงินข้อเสนอ (บาท)",
    counterSent: "ส่งข้อเสนอแล้ว",
    messageFeeCharged: "หักค่าข้อความแล้ว",
    counterLabel: "ข้อเสนอ",
    counterRequiresFee: "การเสนอราคาต้องเสียค่าข้อความปกติ:",
    seller: "ผู้ขาย",
    selectSeller: "เลือกผู้ขาย",
    yourName: "ชื่อของคุณ",
    email: "อีเมล",
    detailsPlaceholder: "ประเภทกางเกงใน ไซส์ สไตล์ กิจกรรม หรือไอเดียภาพ",
    shippingCountry: "ประเทศที่จัดส่ง",
    requestBodyPlaceholder: "อธิบายกางเกงในที่ต้องการ ภาพที่อยากได้ และรายละเอียดกิจกรรม",
    buyerPromptTitle: "ตัวอย่างข้อความคุยทั่วไป",
    buyerPrompts: [
      "สบายดีไหม?",
      "วันนี้ทำอะไรมาบ้าง?",
      "ฉันสบายดี ขอบคุณนะ แล้วคุณล่ะ?"
    ],
    requestPresetTitle: "ข้อความสำเร็จรูปสำหรับคำขอพิเศษ",
    requestPresets: [
      "ช่วยเปิดอัปโหลดรูปให้ฉันได้ไหม?",
      "ขอไทม์ไลน์ ราคา final และค่าส่งก่อนยืนยันนะ",
      "ฉันอยากได้ภาพพื้นหลังเรียบและภาพใกล้ที่เห็นรายละเอียดชัดเจน"
    ],
    buyerImageDisabledHelp: "ตอนนี้ยังอัปโหลดรูปไม่ได้จนกว่าผู้ขายจะเปิดให้ในคำขอนี้",
    customRequestSubmitted: "ส่งคำขอพิเศษแล้ว",
    sendRequest: "ส่งคำขอ",
    needWalletSubmitPrefix: "คุณต้องมีอย่างน้อย",
    needWalletSubmitSuffix: "ในกระเป๋าเพื่อส่งคำขอนี้",
    awaitingBuyerPayment: "รอผู้ซื้อชำระเงิน",
    sellerFeed: "Stories",
    profile: "โปรไฟล์",
    messages: "ข้อความ",
    customRequests: "คำขอพิเศษ",
  },
  my: {
    eyebrow: "စျေးကွက်",
    title: "Custom Requests",
    subtitle: "",
    submitFee: "Custom request တစ်ခုပို့ရန် ကုန်ကျငွေ",
    openFee: "ဖွင့်ပြီးနောက် custom request message များ ကုန်ကျငွေ",
    perMessageBoth: "ဝယ်သူတစ်ဦးလျှင် message တစ်ခု။ ရောင်းသူများ အခမဲ့ reply ပို့နိုင်သည်။",
    loginBuyer: "Custom request ပို့ရန် ဝယ်သူအဖြစ် login ဝင်ပါ။",
    recentRequests: "သင့်မကြာသေး request များ",
    noRequests: "တင်ထားသော request မရှိသေးပါ။",
    noMessages: "message မရှိသေးပါ။",
    replyPlaceholder: "ဒီ request မှာ reply ပို့ပါ",
    send: "ပို့မည်",
    addWalletToSend: "အနည်းဆုံး",
    toWalletSend: "ကို wallet ထဲထည့်ပြီးမှ message ပို့နိုင်ပါမည်။",
    sellerQuote: "ရောင်းသူ ဈေးနှုန်း",
    yourCounter: "သင့် counter",
    sellerNote: "ရောင်းသူ မှတ်ချက်:",
    waitingCounter: "သင့် counter-offer အတွက် ရောင်းသူ response ကို စောင့်နေသည်",
    quoteAcceptedPaid: "ဈေးနှုန်းလက်ခံပြီး ငွေချေပြီး။",
    acceptPay: "လက်ခံပြီး ငွေချေမည်",
    quoteDeclined: "ဈေးနှုန်း ငြင်းပယ်ပြီး။",
    decline: "ငြင်းပယ်မည်",
    counterAmount: "Counter ပမာဏ (THB)",
    counterSent: "Counter ပို့ပြီး။",
    messageFeeCharged: "message fee ကောက်ခံပြီး။",
    counterLabel: "Counter",
    counterRequiresFee: "Counter-offer များအတွက် ပုံမှန် message fee လိုအပ်သည်:",
    seller: "ရောင်းသူ",
    selectSeller: "ရောင်းသူ ရွေးချယ်ပါ",
    yourName: "သင့်အမည်",
    email: "အီးမေးလ်",
    detailsPlaceholder: "အမျိုးအစား၊ ဆိုက်၊ ပုံစံ၊ လှုပ်ရှားမှု သို့မဟုတ် ပုံ idea များ",
    shippingCountry: "ပို့ဆောင်မည့်နိုင်ငံ",
    requestBodyPlaceholder: "လိုချင်သော အတွင်းခံ၊ ရိုက်ယူမည့်ပုံများ နှင့် လှုပ်ရှားမှုအသေးစိတ်ကို ဖော်ပြပါ",
    buyerPromptTitle: "ဝယ်သူအတွက် ပုံမှန်စာပို့ prompt များ",
    buyerPrompts: [
      "နေကောင်းလား?",
      "ဒီနေ့ ဘာတွေလုပ်ခဲ့လဲ?",
      "ကျွန်မ/ကျွန်တော် အဆင်ပြေပါတယ်၊ ကျေးဇူးတင်ပါတယ်။ သင်ကော?"
    ],
    requestPresetTitle: "Custom request preset များ",
    requestPresets: [
      "ကျွန်မ/ကျွန်တော်အတွက် image upload ကို ဖွင့်ပေးနိုင်မလား?",
      "အတည်ပြုမလုပ်ခင် timeline, final price နဲ့ shipping estimate ကို မျှဝေပေးပါ။",
      "ရိုးရှင်းတဲ့ background နဲ့ detail ကိုရှင်းရှင်းမြင်ရတဲ့ close-up ပုံများကို လိုချင်ပါတယ်။"
    ],
    buyerImageDisabledHelp: "ဒီ request မှာ seller က enable မလုပ်မချင်း image upload ကို အသုံးမပြုနိုင်သေးပါ။",
    customRequestSubmitted: "Custom request ပို့ပြီးပါပြီ။",
    sendRequest: "Request ပို့မည်",
    needWalletSubmitPrefix: "ဒီ request ပို့ရန် wallet ထဲ အနည်းဆုံး",
    needWalletSubmitSuffix: "ရှိရန် လိုအပ်ပါသည်။",
    awaitingBuyerPayment: "ဝယ်သူ ငွေချေရန် စောင့်နေသည်",
    sellerFeed: "Stories",
    profile: "ပရိုဖိုင်",
    messages: "မက်ဆေ့ချ်များ",
    customRequests: "custom request များ",
  },
  ru: {
    eyebrow: "Маркетплейс",
    title: "Индивидуальные запросы",
    subtitle: "",
    submitFee: "Отправка индивидуального запроса стоит",
    openFee: "После открытия сообщения стоят",
    perMessageBoth: "за сообщение для покупателей. Продавцы отвечают бесплатно.",
    loginBuyer: "Войдите как покупатель, чтобы отправлять запросы.",
    recentRequests: "Ваши недавние запросы",
    noRequests: "Запросов пока нет.",
    noMessages: "Сообщений пока нет.",
    replyPlaceholder: "Ответить в этом запросе",
    send: "Отправить",
    addWalletToSend: "Добавьте минимум",
    toWalletSend: "в кошелек, чтобы отправить сообщение.",
    sellerQuote: "Предложение продавца",
    yourCounter: "ваше встречное предложение",
    sellerNote: "Примечание продавца:",
    waitingCounter: "Ожидание ответа продавца на ваше встречное предложение",
    quoteAcceptedPaid: "Предложение принято и оплачено.",
    acceptPay: "Принять и оплатить",
    quoteDeclined: "Предложение отклонено.",
    decline: "Отклонить",
    counterAmount: "Сумма встречного предложения (THB)",
    counterSent: "Встречное предложение отправлено.",
    messageFeeCharged: "плата за сообщение списана.",
    counterLabel: "Встречное",
    counterRequiresFee: "Встречные предложения требуют стандартную плату за сообщение:",
    seller: "Продавец",
    selectSeller: "Выбрать продавца",
    yourName: "Ваше имя",
    email: "Эл. почта",
    detailsPlaceholder: "Тип белья, размеры, стиль, активности или идеи для фото",
    shippingCountry: "Страна доставки",
    requestBodyPlaceholder: "Опишите желаемое белье, фото и детали активностей",
    buyerPromptTitle: "Быстрые разговорные фразы",
    buyerPrompts: [
      "Как ты?",
      "Что ты делала сегодня?",
      "У меня все отлично, спасибо. А у тебя?"
    ],
    requestPresetTitle: "Готовые шаблоны для запроса",
    requestPresets: [
      "Можешь включить загрузку изображений для меня?",
      "Перед подтверждением отправь, пожалуйста, сроки, финальную цену и стоимость доставки.",
      "Я предпочитаю нейтральный фон и четкие фото крупным планом."
    ],
    buyerImageDisabledHelp: "Загрузка изображений отключена, пока продавец не включит ее для этого запроса.",
    customRequestSubmitted: "Индивидуальный запрос отправлен.",
    sendRequest: "Отправить запрос",
    needWalletSubmitPrefix: "Для отправки запроса в кошельке должно быть минимум",
    needWalletSubmitSuffix: ".",
    awaitingBuyerPayment: "ожидание оплаты покупателем",
    sellerFeed: "Stories",
    profile: "Профиль",
    messages: "Сообщения",
    customRequests: "Индивидуальные запросы",
  },
};

export function CustomRequestsPage({ currentUser, sellers, buyerCustomRequests, sellerCustomRequests, customRequestMessagesByRequestId, submitCustomRequest, sendCustomRequestMessage, respondToCustomRequestPrice, buyerRespondToQuote, sellerRespondToQuote, openWalletTopUpForFlow, navigate, uiLanguage = "en", buyerRecentSellerIds = [], barMap = {}, notifications = [] }) {
  const isSellerView = currentUser?.role === "seller";
  const isBuyerView = currentUser?.role === "buyer";
  const buyerUnreadDirectMessageCount = useMemo(() => {
    if (currentUser?.role !== "buyer") return 0;
    return (notifications || []).filter((n) => (
      n.userId === currentUser.id
      && n.type === "message"
      && !n.read
      && String(n.conversationId || "").includes("__")
    )).length;
  }, [notifications, currentUser]);
  const canSubmitRequest = currentUser?.role === "buyer";
  const canAffordNewRequest = Number(currentUser?.walletBalance || 0) >= CUSTOM_REQUEST_FEE_THB;
  const canAffordMessageAction = isSellerView ? true : Number(currentUser?.walletBalance || 0) >= MESSAGE_FEE_THB;
  const rawVisibleRequests = isSellerView ? (sellerCustomRequests || []) : (buyerCustomRequests || []);
  const t = {
    ...CUSTOM_REQUESTS_I18N.en,
    ...(CUSTOM_REQUESTS_I18N[uiLanguage] || {}),
  };
  const sellerById = useMemo(() => {
    const map = {};
    (sellers || []).forEach((s) => { if (s?.id) map[s.id] = s; });
    return map;
  }, [sellers]);
  const lastActivityAt = (request) => {
    const messages = customRequestMessagesByRequestId?.[request.id] || [];
    const lastMsgAt = messages.length ? new Date(messages[messages.length - 1].createdAt || 0).getTime() : 0;
    const updatedAt = new Date(request.quoteUpdatedAt || request.updatedAt || request.createdAt || 0).getTime();
    return Math.max(lastMsgAt, updatedAt);
  };
  const visibleRequests = useMemo(() => {
    return [...rawVisibleRequests].sort((a, b) => lastActivityAt(b) - lastActivityAt(a));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawVisibleRequests, customRequestMessagesByRequestId]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  useEffect(() => {
    if (selectedRequestId) {
      const exists = visibleRequests.some((r) => r.id === selectedRequestId);
      if (!exists) setSelectedRequestId(null);
      return;
    }
    if (visibleRequests.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
      setSelectedRequestId(visibleRequests[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRequests, selectedRequestId]);
  const selectedRequest = useMemo(
    () => visibleRequests.find((r) => r.id === selectedRequestId) || null,
    [visibleRequests, selectedRequestId],
  );
  const [requestForm, setRequestForm] = useState({
    sellerId: (buyerRecentSellerIds && buyerRecentSellerIds[0]) || (sellers || [])[0]?.id || "",
    buyerName: currentUser?.name || "",
    buyerEmail: currentUser?.email || "",
    preferredDetails: "",
    shippingCountry: currentUser?.country || "",
    requestBody: "",
    proposedPriceThb: "",
  });
  const [showSubmitPanel, setShowSubmitPanel] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestMessageTone, setRequestMessageTone] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestReplyDraftById, setRequestReplyDraftById] = useState({});
  const [requestImageDraftById, setRequestImageDraftById] = useState({});
  const [requestCounterDraftById, setRequestCounterDraftById] = useState({});
  const [requestProposeDraftById, setRequestProposeDraftById] = useState({});
  const [requestProposeNoteById, setRequestProposeNoteById] = useState({});
  const [requestNegotiationBusyById, setRequestNegotiationBusyById] = useState({});
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
    const status = String(request?.quoteStatus || "").toLowerCase();
    if (status === "proposed" && request?.quoteAwaitingBuyerPayment) return t.awaitingBuyerPayment;
    if (status === "buyer_proposed") return "Buyer proposed";
    if (status === "proposed") return "Seller proposed";
    if (status === "countered") return "Countered";
    if (status === "accepted") return "Accepted";
    if (status === "declined") return "Declined";
    if (!status || status === "none") return "Open";
    return request?.quoteStatus || "Open";
  };
  const groupedSellerOptions = useMemo(() => {
    const allSellers = sellers || [];
    const sellerById = new Map(allSellers.map((s) => [s.id, s]));
    const recentIds = (buyerRecentSellerIds || []).filter((id) => sellerById.has(id));
    const recentSet = new Set(recentIds);
    const recents = recentIds.map((id) => sellerById.get(id));

    const remaining = allSellers.filter((s) => !recentSet.has(s.id));
    const byBar = new Map();
    const independent = [];
    remaining.forEach((s) => {
      const barId = String(s.affiliatedBarId || "").trim();
      if (barId && barMap?.[barId]) {
        if (!byBar.has(barId)) byBar.set(barId, []);
        byBar.get(barId).push(s);
      } else {
        independent.push(s);
      }
    });
    byBar.forEach((arr) => arr.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    independent.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const barGroups = [...byBar.entries()].sort((a, b) =>
      (barMap[a[0]]?.name || "").localeCompare(barMap[b[0]]?.name || "")
    );
    return { recents, barGroups, independent };
  }, [sellers, buyerRecentSellerIds, barMap]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      <div className="mb-8">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-500">{t.eyebrow}</div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{t.title}</h2>
        {t.subtitle ? <p className="mt-3 max-w-2xl text-slate-600">{t.subtitle}</p> : null}
      </div>
      {isSellerView ? (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => navigate?.("/seller-dashboard")}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
          >
            {t.profile || "Profile"}
          </button>
          <button
            type="button"
            onClick={() => navigate?.("/seller-messages")}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
          >
            {t.messages || "Messages"}
          </button>
          <button
            type="button"
            className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto"
          >
            {t.customRequests || "Custom requests"}
          </button>
          <button
            type="button"
            onClick={() => navigate?.("/stories-workspace")}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
          >
            {t.sellerFeed || "Stories"}
          </button>
        </div>
      ) : isBuyerView ? (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => navigate?.("/account")}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
          >
            {t.profile || "Profile"}
          </button>
          <button
            type="button"
            onClick={() => navigate?.("/buyer-messages")}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
          >
            {t.messages || "Messages"} {buyerUnreadDirectMessageCount > 0 ? `(${buyerUnreadDirectMessageCount})` : ""}
          </button>
          <button
            type="button"
            className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto"
          >
            {t.customRequests || "Custom requests"}
          </button>
          <button
            type="button"
            onClick={() => navigate?.("/stories")}
            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
          >
            {t.sellerFeed || "Stories"}
          </button>
        </div>
      ) : null}
      <div className="mb-4 rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm ring-1 ring-rose-100">
        {isBuyerView ? <p>{t.submitFee} {formatPriceTHB(CUSTOM_REQUEST_FEE_THB)}.</p> : null}
        {isSellerView ? <p>{t.openFee} {formatPriceTHB(MESSAGE_FEE_THB)} {t.perMessageBoth}</p> : null}
        {!canSubmitRequest && !isSellerView ? <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-800">{t.loginBuyer}</p> : null}
        {isBuyerView ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSubmitPanel((v) => !v)}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {showSubmitPanel ? "Close new request" : `+ New request (${formatPriceTHB(CUSTOM_REQUEST_FEE_THB)})`}
            </button>
            {requestMessage ? (
              <span className={`text-xs font-medium ${requestMessageTone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {requestMessage}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {isBuyerView && showSubmitPanel ? (
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm text-slate-600">
              <span className="font-medium">{t.seller}</span>
              <select
                value={requestForm.sellerId}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, sellerId: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="">{localizeOptionLabel("Select seller...", uiLanguage)}</option>
                {groupedSellerOptions.recents.length > 0 ? (
                  <optgroup label="Recent contacts">
                    {groupedSellerOptions.recents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ) : null}
                {groupedSellerOptions.barGroups.map(([barId, list]) => (
                  <optgroup key={barId} label={barMap[barId]?.name || barId}>
                    {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                ))}
                {groupedSellerOptions.independent.length > 0 ? (
                  <optgroup label="Independent">
                    {groupedSellerOptions.independent.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
            </label>
            <input value={requestForm.buyerName} onChange={(event) => setRequestForm((prev) => ({ ...prev, buyerName: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={t.yourName} />
            <input value={requestForm.buyerEmail} onChange={(event) => setRequestForm((prev) => ({ ...prev, buyerEmail: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" placeholder={t.email} />
            <textarea value={requestForm.requestBody} onChange={(event) => setRequestForm((prev) => ({ ...prev, requestBody: event.target.value }))} className="min-h-[120px] rounded-xl border border-slate-200 px-3 py-2" placeholder={t.requestBodyPlaceholder} />
            <label className="grid gap-1 text-sm text-slate-600">
              <input
                type="number"
                min={MIN_CUSTOM_REQUEST_PURCHASE_THB}
                step="1"
                value={requestForm.proposedPriceThb}
                onChange={(event) => setRequestForm((prev) => ({ ...prev, proposedPriceThb: event.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2"
                placeholder={`Propose a price (THB) — optional, min ${MIN_CUSTOM_REQUEST_PURCHASE_THB}`}
              />
              <span className="text-[11px] text-slate-500">Leave blank if you're not sure how much it should cost.</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={async () => {
                  setRequestSubmitting(true);
                  try {
                    await submitCustomRequest(
                      { ...requestForm, preferredDetails: "", shippingCountry: "" },
                      () => {
                        setRequestMessage(t.customRequestSubmitted);
                        setRequestMessageTone("success");
                        setRequestForm((prev) => ({ ...prev, requestBody: "", proposedPriceThb: "" }));
                        setShowSubmitPanel(false);
                      },
                      (message) => {
                        setRequestMessage(message || "");
                        setRequestMessageTone("error");
                      },
                    );
                  } finally {
                    setRequestSubmitting(false);
                  }
                }}
                disabled={!canAffordNewRequest || requestSubmitting}
                className={`rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white ${(!canAffordNewRequest || requestSubmitting) ? "cursor-not-allowed opacity-60" : ""}`}
              >
                {requestSubmitting ? "Sending..." : `${t.sendRequest} (${formatPriceTHB(CUSTOM_REQUEST_FEE_THB)})`}
              </button>
              {Number(currentUser?.walletBalance || 0) < 100 && openWalletTopUpForFlow ? (
                <button
                  type="button"
                  onClick={() => openWalletTopUpForFlow(Math.max(0, CUSTOM_REQUEST_FEE_THB - Number(currentUser?.walletBalance || 0)), '/custom-requests', 'custom-request')}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  Top up wallet
                </button>
              ) : null}
            </div>
            {!canAffordNewRequest ? <div className="text-xs text-amber-700">{t.needWalletSubmitPrefix} {formatPriceTHB(CUSTOM_REQUEST_FEE_THB)} {t.needWalletSubmitSuffix}</div> : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[300px_1fr] md:items-start">
        <div className={`${selectedRequestId ? "hidden md:block" : "block"} max-h-[78vh] overflow-y-auto rounded-2xl bg-white p-2 shadow-sm ring-1 ring-rose-100`}>
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t.recentRequests}</div>
          {visibleRequests.length === 0 ? (
            <div className="px-2 py-3 text-sm text-slate-500">{t.noRequests}</div>
          ) : (
            <div className="space-y-1">
              {visibleRequests.map((request) => {
                const counterpartName = isSellerView
                  ? (request.buyerName || "Buyer")
                  : (sellerById[request.sellerId]?.name || request.sellerId);
                const sellerForCard = sellerById[request.sellerId];
                const barName = sellerForCard?.affiliatedBarId ? (barMap?.[sellerForCard.affiliatedBarId]?.name || "") : "";
                const messages = customRequestMessagesByRequestId?.[request.id] || [];
                const lastMessage = messages.length ? messages[messages.length - 1] : null;
                const lastBody = lastMessage?.body || request.requestBody || "";
                const isSelected = selectedRequestId === request.id;
                const lastSenderIsCounterpart = lastMessage && lastMessage.senderUserId !== currentUser?.id;
                return (
                  <button
                    key={request.id}
                    type="button"
                    onClick={() => setSelectedRequestId(request.id)}
                    className={`w-full rounded-xl px-3 py-2 text-left transition ${isSelected ? "bg-rose-50 ring-1 ring-rose-200" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-slate-800">{counterpartName}</div>
                      {lastSenderIsCounterpart ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="New activity" />
                      ) : null}
                    </div>
                    {barName ? <div className="text-[11px] text-slate-500">{barName}</div> : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize">{getQuoteStatusLabel(request)}</span>
                      <span className="truncate">{formatDateTimeNoSeconds(request.updatedAt || request.createdAt || Date.now())}</span>
                    </div>
                    {lastBody ? (
                      <div className="mt-1 line-clamp-2 text-xs text-slate-600">{lastBody}</div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={`${selectedRequestId ? "block" : "hidden md:block"} rounded-2xl bg-white shadow-sm ring-1 ring-rose-100`}>
          {!selectedRequest ? (
            <div className="p-6 text-sm text-slate-500">Select a request from the list to view the conversation.</div>
          ) : (() => {
            const request = selectedRequest;
            const messages = customRequestMessagesByRequestId?.[request.id] || [];
            const sellerForRequest = sellerById[request.sellerId];
            const counterpartName = isSellerView
              ? (request.buyerName || "Buyer")
              : (sellerForRequest?.name || request.sellerId);
            const barName = sellerForRequest?.affiliatedBarId ? (barMap?.[sellerForRequest.affiliatedBarId]?.name || "") : "";
            const quotedPrice = Number(request.quotedPriceThb || 0);
            const buyerCounterPrice = Number(request.buyerCounterPriceThb || 0);
            const status = String(request.quoteStatus || "").toLowerCase();
            const proposedDraft = requestProposeDraftById[request.id] || "";
            const proposedNote = requestProposeNoteById[request.id] || "";
            const counterDraft = requestCounterDraftById[request.id] || "";
            const negotiationBusy = Boolean(requestNegotiationBusyById[request.id]);
            const reportPath = isBuyerView
              ? `/safety-report?type=seller&id=${encodeURIComponent(request.sellerId)}&name=${encodeURIComponent(sellerForRequest?.name || "")}`
              : `/safety-report?type=buyer&id=${encodeURIComponent(request.buyerUserId || "")}&name=${encodeURIComponent(request.buyerName || "")}`;
            const setBusy = (value) => setRequestNegotiationBusyById((prev) => ({ ...prev, [request.id]: value }));
            const onErr = (msg) => { setRequestMessage(msg || ""); setRequestMessageTone(msg ? "error" : ""); setBusy(false); };
            const onOk = (note) => { setRequestMessage(note || ""); setRequestMessageTone("success"); setBusy(false); };

            return (
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-rose-100 px-4 py-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedRequestId(null)}
                      className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 md:hidden"
                    >
                      ← Back to list
                    </button>
                    <div className="truncate text-base font-semibold text-slate-800">{counterpartName}</div>
                    {barName ? <div className="text-xs text-slate-500">{barName}</div> : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize">{getQuoteStatusLabel(request)}</span>
                      <span>{formatDateTimeNoSeconds(request.updatedAt || request.createdAt || Date.now())}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate?.(reportPath)}
                    className="shrink-0 rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                  >
                    Report
                  </button>
                </div>

                {request.requestBody ? (
                  <div className="mx-4 mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Original request</div>
                    {request.requestBody}
                  </div>
                ) : null}

                {/* Negotiation block */}
                <div className="mx-4 mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Price negotiation</div>
                  {quotedPrice > 0 ? (
                    <div className="mt-1 text-sm text-slate-700">
                      Current: {formatPriceTHB(quotedPrice)}
                      {buyerCounterPrice > 0 && status === "countered" ? ` · buyer counter ${formatPriceTHB(buyerCounterPrice)}` : ""}
                    </div>
                  ) : null}

                  {isBuyerView ? (
                    status === "none" ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          type="number"
                          min={MIN_CUSTOM_REQUEST_PURCHASE_THB}
                          step="1"
                          value={proposedDraft}
                          onChange={(event) => setRequestProposeDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                          className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          placeholder={`Propose a price (THB), min ${MIN_CUSTOM_REQUEST_PURCHASE_THB}`}
                        />
                        <button
                          type="button"
                          disabled={negotiationBusy}
                          onClick={() => {
                            setBusy(true);
                            buyerRespondToQuote?.(
                              request.id,
                              "counter",
                              { counterPriceThb: Number(proposedDraft || 0) },
                              () => { setRequestProposeDraftById((prev) => ({ ...prev, [request.id]: "" })); onOk("Price proposed."); },
                              onErr,
                            );
                          }}
                          className={`rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white ${negotiationBusy ? "opacity-60" : ""}`}
                        >
                          Propose
                        </button>
                      </div>
                    ) : status === "buyer_proposed" ? (
                      <div className="mt-2 text-xs text-slate-700">You proposed {formatPriceTHB(quotedPrice)}. Waiting for seller.</div>
                    ) : status === "proposed" ? (
                      <>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              respondToCustomRequestPrice(
                                request.id,
                                "accept",
                                {},
                                () => onOk(t.quoteAcceptedPaid),
                                (message) => {
                                  const walletBalance = Number(currentUser?.walletBalance || 0);
                                  const shortfall = Number((quotedPrice - walletBalance).toFixed(2));
                                  if (shortfall > 0) {
                                    const requiredTopUp = getRequiredTopUpAmount(shortfall);
                                    onErr(`You need ${formatPriceTHB(quotedPrice)} to accept this quote. Top up at least ${formatPriceTHB(requiredTopUp)} and try again.`);
                                    openWalletTopUpForFlow?.(shortfall, "/custom-requests", "custom_request_quote");
                                    return;
                                  }
                                  onErr(message || "");
                                },
                              );
                            }}
                            className={`rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white ${negotiationBusy ? "opacity-60" : ""}`}
                          >
                            {t.acceptPay} {formatPriceTHB(quotedPrice)}
                          </button>
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              buyerRespondToQuote?.(request.id, "decline", {}, () => onOk(t.quoteDeclined), onErr);
                            }}
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
                            value={counterDraft}
                            onChange={(event) => setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            placeholder={t.counterAmount}
                          />
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              buyerRespondToQuote?.(
                                request.id,
                                "counter",
                                { counterPriceThb: Number(counterDraft || 0) },
                                () => { setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: "" })); onOk("Counter sent."); },
                                onErr,
                              );
                            }}
                            className={`rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${negotiationBusy ? "opacity-60" : ""}`}
                          >
                            {t.counterLabel}
                          </button>
                        </div>
                      </>
                    ) : status === "countered" ? (
                      <div className="mt-2 text-xs text-slate-700">{t.waitingCounter} {formatPriceTHB(buyerCounterPrice || quotedPrice)}.</div>
                    ) : status === "accepted" ? (
                      <div className="mt-2 text-xs font-semibold text-emerald-700">Accepted · Paid {formatPriceTHB(quotedPrice)}</div>
                    ) : status === "declined" ? (
                      <div className="mt-2 text-xs text-slate-500">This negotiation is closed.</div>
                    ) : null
                  ) : isSellerView ? (
                    status === "none" ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            type="number"
                            min={MIN_CUSTOM_REQUEST_PURCHASE_THB}
                            step="1"
                            value={proposedDraft}
                            onChange={(event) => setRequestProposeDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            placeholder={`Quote price (THB), min ${MIN_CUSTOM_REQUEST_PURCHASE_THB}`}
                          />
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(
                                request.id,
                                "propose",
                                { priceThb: Number(proposedDraft || 0), note: proposedNote },
                                () => {
                                  setRequestProposeDraftById((prev) => ({ ...prev, [request.id]: "" }));
                                  setRequestProposeNoteById((prev) => ({ ...prev, [request.id]: "" }));
                                  onOk("Price proposed.");
                                },
                                onErr,
                              );
                            }}
                            className={`rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white ${negotiationBusy ? "opacity-60" : ""}`}
                          >
                            Propose
                          </button>
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(request.id, "decline", {}, () => onOk("Request declined."), onErr);
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            Decline request
                          </button>
                        </div>
                        <input
                          value={proposedNote}
                          onChange={(event) => setRequestProposeNoteById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          placeholder="Optional note for the buyer"
                        />
                      </div>
                    ) : status === "buyer_proposed" ? (
                      <>
                        <div className="mt-1 text-xs text-slate-700">Buyer proposed {formatPriceTHB(quotedPrice)}.</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(
                                request.id,
                                "accept",
                                {},
                                () => onOk(`Accepted · charged buyer ${formatPriceTHB(quotedPrice)}.`),
                                onErr,
                              );
                            }}
                            className={`rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white ${negotiationBusy ? "opacity-60" : ""}`}
                          >
                            Accept & charge {formatPriceTHB(quotedPrice)}
                          </button>
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(request.id, "decline", {}, () => onOk("Declined."), onErr);
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            Decline
                          </button>
                        </div>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="number"
                            min={MIN_CUSTOM_REQUEST_PURCHASE_THB}
                            step="1"
                            value={counterDraft}
                            onChange={(event) => setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            placeholder={`Counter price (THB), min ${MIN_CUSTOM_REQUEST_PURCHASE_THB}`}
                          />
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(
                                request.id,
                                "counter",
                                { priceThb: Number(counterDraft || 0), note: proposedNote },
                                () => { setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: "" })); onOk("Counter sent."); },
                                onErr,
                              );
                            }}
                            className={`rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${negotiationBusy ? "opacity-60" : ""}`}
                          >
                            Counter
                          </button>
                        </div>
                      </>
                    ) : status === "proposed" ? (
                      <div className="mt-2 text-xs text-slate-700">Waiting for buyer to respond to your quote of {formatPriceTHB(quotedPrice)}.</div>
                    ) : status === "countered" ? (
                      <>
                        <div className="mt-1 text-xs text-slate-700">Buyer countered with {formatPriceTHB(buyerCounterPrice || quotedPrice)}.</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(
                                request.id,
                                "accept",
                                {},
                                () => onOk(`Accepted · charged buyer ${formatPriceTHB(buyerCounterPrice || quotedPrice)}.`),
                                onErr,
                              );
                            }}
                            className={`rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white ${negotiationBusy ? "opacity-60" : ""}`}
                          >
                            Accept & charge {formatPriceTHB(buyerCounterPrice || quotedPrice)}
                          </button>
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(request.id, "decline", {}, () => onOk("Declined."), onErr);
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            Decline
                          </button>
                        </div>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="number"
                            min={MIN_CUSTOM_REQUEST_PURCHASE_THB}
                            step="1"
                            value={counterDraft}
                            onChange={(event) => setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            placeholder={`Counter price (THB)`}
                          />
                          <button
                            disabled={negotiationBusy}
                            onClick={() => {
                              setBusy(true);
                              sellerRespondToQuote?.(
                                request.id,
                                "counter",
                                { priceThb: Number(counterDraft || 0) },
                                () => { setRequestCounterDraftById((prev) => ({ ...prev, [request.id]: "" })); onOk("Counter sent."); },
                                onErr,
                              );
                            }}
                            className={`rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${negotiationBusy ? "opacity-60" : ""}`}
                          >
                            Counter
                          </button>
                        </div>
                      </>
                    ) : status === "accepted" ? (
                      <div className="mt-2 text-xs font-semibold text-emerald-700">Accepted · Buyer paid {formatPriceTHB(quotedPrice)}</div>
                    ) : status === "declined" ? (
                      <div className="mt-2 text-xs text-slate-500">This negotiation is closed.</div>
                    ) : null
                  ) : null}
                </div>

                {/* Thread */}
                <div className="mx-4 mt-3 max-h-[40vh] flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50/60 p-2">
                  {messages.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-slate-500">{t.noMessages}</div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = (message.senderUserId || "") === currentUser?.id;
                      const bubble = isOwn ? "ml-auto bg-rose-600 text-white" : "bg-slate-100 text-slate-700";
                      const linkClass = isOwn ? "text-rose-100" : "text-slate-500";
                      return (
                        <div key={message.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${bubble}`}>
                          <div className="whitespace-pre-wrap">{resolveRequestMessageBody(message)}</div>
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
                              className={`mt-1 block text-[10px] font-semibold ${linkClass}`}
                            >
                              {showOriginalRequestMessageById[message.id] ? "Show translation" : "Show original"}
                            </button>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply composer */}
                <div className="border-t border-rose-100 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={requestReplyDraftById[request.id] || ""}
                      onChange={(event) => setRequestReplyDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
                      className={`rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white ${!canAffordMessageAction ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      {isSellerView ? t.send : `${t.send} (${formatPriceTHB(MESSAGE_FEE_THB)})`}
                    </button>
                    {!isSellerView && Number(currentUser?.walletBalance || 0) < 100 && openWalletTopUpForFlow ? (
                      <button
                        type="button"
                        onClick={() => openWalletTopUpForFlow(Math.max(0, MESSAGE_FEE_THB - Number(currentUser?.walletBalance || 0)), '/custom-requests', 'custom-request')}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                      >
                        Top up
                      </button>
                    ) : null}
                  </div>
                  {isBuyerView ? (
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
                        <div className="text-[11px] text-slate-500">{t.buyerImageDisabledHelp || CUSTOM_REQUESTS_I18N.en.buyerImageDisabledHelp}</div>
                      )}
                    </div>
                  ) : null}
                  {!canAffordMessageAction && !isSellerView ? (
                    <div className="mt-2 text-[11px] text-amber-700">{t.addWalletToSend} {formatPriceTHB(MESSAGE_FEE_THB)} {t.toWalletSend}</div>
                  ) : null}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {requestMessage ? (
        <div className={`mt-3 text-sm font-medium ${requestMessageTone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {requestMessage}
        </div>
      ) : null}
    </section>
  );
}

export function WorldwideShippingPage({ uiLanguage = "en", navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = SUPPORT_STATIC_I18N[pageLanguage] ? pageLanguage : "en";
  const t = SUPPORT_STATIC_I18N[locale] || SUPPORT_STATIC_I18N.en;
  const cards = t.worldwideCards || SUPPORT_STATIC_I18N.en.worldwideCards;
  return (
    <PageShell eyebrow={t.worldwideEyebrow} title={t.worldwideTitle} subtitle={t.worldwideSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><Globe className="h-6 w-6 text-rose-600" /><h3 className="mt-4 text-xl font-semibold">{cards[0].title}</h3><p className="mt-3 text-slate-600">{cards[0].body}</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><Shield className="h-6 w-6 text-rose-600" /><h3 className="mt-4 text-xl font-semibold">{cards[1].title}</h3><p className="mt-3 text-slate-600">{cards[1].body}</p></div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"><HeartHandshake className="h-6 w-6 text-rose-600" /><h3 className="mt-4 text-xl font-semibold">{cards[2].title}</h3><p className="mt-3 text-slate-600">{cards[2].body}</p></div>
      </div>
    </PageShell>
  );
}

export function SellerPortfoliosPage({ sellers, products, navigate, uiLanguage = "en", currentUser }) {
  const text = marketplaceText(uiLanguage);
  const [sellerFilters, setSellerFilters] = useState({
    search: "",
    location: "All",
    type: "All",
    size: "All",
    color: "All",
    fabric: "All",
    daysWorn: "All",
    scentLevel: "All",
    language: "All",
    online: "All",
    hairColor: "All",
  });

  const sellerFilterOptions = useMemo(() => {
    const normalize = (value) => (value || "").trim();
    const withFallback = (value, fallback = "Not specified") => normalize(value) || fallback;
    const locations = [...new Set((sellers || []).map((seller) => withFallback(seller.location)))];
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
      types,
      sizes: ["All", ...sizes],
      colors: ["All", ...colors],
      fabrics: ["All", ...fabrics],
      daysWorn: ["All", ...daysWorn],
      scentLevels: ["All", ...scentLevels],
      languages: ["All", ...languages],
      hairColors: ["All", ...HAIR_COLOR_OPTIONS],
    };
  }, [sellers, products]);

  const filteredSellers = useMemo(() => {
    const query = sellerFilters.search.trim().toLowerCase();
    const normalized = (value, fallback = "Not specified") => (value || "").trim() || fallback;
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
      const matchesSearch = !query || [
        seller.name,
        seller.location,
        seller.bio,
        ...(seller.highlights || []),
        ...sellerLanguages,
        seller.hairColor || '',
        seller.braSize || '',
        seller.pantySize || '',
      ].some((value) => (value || "").toLowerCase().includes(query));
      const matchesLocation = sellerFilters.location === "All" || normalized(seller.location) === sellerFilters.location;
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
      const matchesHairColor = sellerFilters.hairColor === "All" || normalized(seller.hairColor) === sellerFilters.hairColor;
      return matchesSearch && matchesLocation && matchesType && matchesSize && matchesColor && matchesFabric && matchesDaysWorn && matchesScentLevel && matchesLanguage && matchesOnline && matchesHairColor;
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
            <span className="font-medium">{text.hairColor || 'Hair color'}</span>
            <select value={sellerFilters.hairColor} onChange={(event) => setSellerFilters((prev) => ({ ...prev, hairColor: event.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
              {sellerFilterOptions.hairColors.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
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
            onClick={() => setSellerFilters({ search: "", location: "All", type: "All", size: "All", color: "All", fabric: "All", daysWorn: "All", scentLevel: "All", language: "All", online: "All", hairColor: "All" })}
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
            <button onClick={() => navigate(`/seller/${seller.id}`)} className="block h-48 w-full cursor-pointer">
              <ProductImage
                src={seller.profileImageResolved || seller.profileImage}
                label={seller.profileImageNameResolved || seller.profileImageName || `${seller.name} portfolio`}
              />
            </button>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <button onClick={() => navigate(`/seller/${seller.id}`)} className="text-left text-xl font-semibold hover:text-rose-700">{seller.name}</button>
                <p className="text-sm text-slate-500">{seller.location}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {seller.affiliatedBarName ? `${text.barPrefix} ${seller.affiliatedBarName}` : localizeOptionLabel("Independent", uiLanguage)}
                </p>
              </div>
            </div>
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
            {(seller.height || seller.hairColor || seller.braSize || seller.pantySize) ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {seller.height ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">{formatHeight(seller.height, 'cm')} / {formatHeight(seller.height, 'in')}</span> : null}
                {seller.hairColor ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">{localizeOptionLabel(seller.hairColor, uiLanguage)}</span> : null}
                {seller.braSize ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">{seller.braSize}</span> : null}
                {seller.pantySize ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">{seller.pantySize}</span> : null}
              </div>
            ) : null}
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div><span className="font-semibold text-slate-700">{text.shippingCoverage}:</span> {seller.shipping || localizeOptionLabel("Not specified", uiLanguage)}</div>
              <div><span className="font-semibold text-slate-700">{text.typicalShipTime}:</span> {seller.turnaround || localizeOptionLabel("Not specified", uiLanguage)}</div>
            </div>
            <button onClick={() => navigate(currentUser ? `/seller/${seller.id}` : '/login')} className="mt-4 w-full rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
              {text.messageSeller}
            </button>
            <button onClick={() => navigate(`/seller/${seller.id}`)} className="mt-2 w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50">
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
                {[sellerMap?.[product.sellerId]?.name || product.sellerId, product.style && product.style !== "Not specified" ? product.style : null].filter(Boolean).join(" · ")}
              </div>
              {(product.size && product.size !== "Not specified") || (product.color && product.color !== "Not specified") ? <div className="mt-1 text-sm text-slate-500">{[product.size && product.size !== "Not specified" ? product.size : null, product.color && product.color !== "Not specified" ? product.color : null].filter(Boolean).join(" · ")}</div> : null}
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
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = HELP_I18N[pageLanguage] ? pageLanguage : "en";
  const text = helpText(locale);
  return (
    <PageShell eyebrow={text.howToApplyEyebrow} title={text.howToApplyTitle} subtitle={text.howToApplySubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.howToApplyPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function SellerAppealsPage({ uiLanguage = "en", navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = SELLER_APPEALS_I18N[pageLanguage] ? pageLanguage : "en";
  const text = SELLER_APPEALS_I18N[locale] || SELLER_APPEALS_I18N.en;
  return (
    <PageShell eyebrow={text.eyebrow} title={text.title} subtitle={text.subtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.points.map((point) => <p key={point}>{point}</p>)}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate?.("/appeals")}
            className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {text.openAppeals}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

export function SellerGuidelinesPage({ uiLanguage = "en" }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = HELP_I18N[pageLanguage] ? pageLanguage : "en";
  const text = helpText(locale);
  return (
    <PageShell eyebrow={text.sellerGuidelinesEyebrow} title={text.sellerGuidelinesTitle} subtitle={text.sellerGuidelinesSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.sellerGuidelinesPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

export function PortfolioSetupPage({ uiLanguage = "en" }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = HELP_I18N[pageLanguage] ? pageLanguage : "en";
  const text = helpText(locale);
  return (
    <PageShell eyebrow={text.portfolioSetupEyebrow} title={text.portfolioSetupTitle} subtitle={text.portfolioSetupSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {text.portfolioSetupPoints.map((point) => <p key={point}>{point}</p>)}
      </div>
    </PageShell>
  );
}

const ORDER_HELP_FORM_I18N = {
  en: {
    contactTitle: "Contact support",
    contactSubtitle: "Send your order issue details so support can resolve it faster.",
    fullName: "Full name",
    email: "Email",
    orderId: "Order ID (optional)",
    issueType: "Issue type",
    issueTypes: [
      { value: "tracking", label: "Tracking not updating" },
      { value: "address", label: "Address update needed" },
      { value: "delivery", label: "Delivery issue" },
      { value: "billing", label: "Billing or wallet question" },
      { value: "other", label: "Other" },
    ],
    message: "What happened?",
    messagePlaceholder: "Include timeline, order details, tracking code (if any), and what outcome you need.",
    submit: "Open support email draft",
    success: "Support request submitted. Our team will follow up soon.",
    fallback: "If needed, you can also contact hello@thailandpanties.com with your order details.",
    validation: "Please enter your name, email, and issue details.",
  },
  th: {
    contactTitle: "ติดต่อฝ่ายช่วยเหลือ",
    contactSubtitle: "ส่งรายละเอียดปัญหาคำสั่งซื้อเพื่อให้ทีมช่วยเหลือดำเนินการได้เร็วขึ้น",
    fullName: "ชื่อ-นามสกุล",
    email: "อีเมล",
    orderId: "รหัสคำสั่งซื้อ (ไม่บังคับ)",
    issueType: "ประเภทปัญหา",
    issueTypes: [
      { value: "tracking", label: "เลขติดตามไม่อัปเดต" },
      { value: "address", label: "ต้องการแก้ไขที่อยู่" },
      { value: "delivery", label: "ปัญหาการจัดส่ง" },
      { value: "billing", label: "ปัญหาการชำระเงินหรือกระเป๋าเงิน" },
      { value: "other", label: "อื่นๆ" },
    ],
    message: "รายละเอียดปัญหา",
    messagePlaceholder: "โปรดระบุลำดับเหตุการณ์ รายละเอียดคำสั่งซื้อ เลขติดตาม (ถ้ามี) และผลลัพธ์ที่ต้องการ",
    submit: "เปิดร่างอีเมลถึงฝ่ายช่วยเหลือ",
    success: "ส่งคำขอช่วยเหลือเรียบร้อยแล้ว ทีมงานจะติดตามและติดต่อกลับโดยเร็ว",
    fallback: "หากจำเป็น สามารถส่งอีเมลเพิ่มเติมไปที่ hello@thailandpanties.com พร้อมรายละเอียดคำสั่งซื้อ",
    validation: "กรุณากรอกชื่อ อีเมล และรายละเอียดปัญหา",
  },
  my: {
    contactTitle: "Support ကိုဆက်သွယ်ရန်",
    contactSubtitle: "Order issue အသေးစိတ်များပေးပို့ပါက support က ပိုမိုမြန်ဆန်စွာ ဖြေရှင်းနိုင်ပါသည်။",
    fullName: "အမည်",
    email: "အီးမေးလ်",
    orderId: "Order ID (ရွေးချယ်နိုင်)",
    issueType: "ပြဿနာအမျိုးအစား",
    issueTypes: [
      { value: "tracking", label: "Tracking မအပ်ဒိတ်ဖြစ်" },
      { value: "address", label: "လိပ်စာပြင်ဆင်ရန်လို" },
      { value: "delivery", label: "ပို့ဆောင်ရေးပြဿနာ" },
      { value: "billing", label: "ငွေပေးချေမှု/Wallet မေးခွန်း" },
      { value: "other", label: "အခြား" },
    ],
    message: "ဘာဖြစ်ခဲ့သလဲ?",
    messagePlaceholder: "Timeline, order အသေးစိတ်, tracking code (ရှိလျှင်) နှင့် သင်လိုချင်သောဖြေရှင်းချက်ကို ထည့်ပါ။",
    submit: "Support email draft ဖွင့်မည်",
    success: "Support request ပေးပို့ပြီးပါပြီ။ အဖွဲ့က မကြာမီ follow up လုပ်ပါမည်။",
    fallback: "လိုအပ်ပါက order အသေးစိတ်များနှင့်အတူ hello@thailandpanties.com ကို တိုက်ရိုက်ဆက်သွယ်နိုင်ပါသည်။",
    validation: "အမည်၊ အီးမေးလ်နှင့် ပြဿနာအသေးစိတ်ကို ဖြည့်ပါ။",
  },
  ru: {
    contactTitle: "Связаться с поддержкой",
    contactSubtitle: "Отправьте детали проблемы по заказу, чтобы поддержка решила ее быстрее.",
    fullName: "Полное имя",
    email: "Email",
    orderId: "ID заказа (необязательно)",
    issueType: "Тип проблемы",
    issueTypes: [
      { value: "tracking", label: "Трекинг не обновляется" },
      { value: "address", label: "Нужно изменить адрес" },
      { value: "delivery", label: "Проблема с доставкой" },
      { value: "billing", label: "Вопрос по оплате или кошельку" },
      { value: "other", label: "Другое" },
    ],
    message: "Что произошло?",
    messagePlaceholder: "Укажите таймлайн, детали заказа, трек-код (если есть) и нужный результат.",
    submit: "Открыть черновик письма в поддержку",
    success: "Запрос в поддержку отправлен. Команда свяжется с вами в ближайшее время.",
    fallback: "При необходимости вы также можете написать на hello@thailandpanties.com с деталями заказа.",
    validation: "Пожалуйста, заполните имя, email и описание проблемы.",
  },
};

export function OrderHelpPage({ uiLanguage = "en", currentUser, submitOrderHelpRequest, navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = HELP_I18N[pageLanguage] ? pageLanguage : "en";
  const text = helpText(locale);
  const formText = ORDER_HELP_FORM_I18N[locale] || ORDER_HELP_FORM_I18N.en;
  const [form, setForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    orderId: "",
    issueType: "tracking",
    message: "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: prev.name || currentUser?.name || "",
      email: prev.email || currentUser?.email || "",
    }));
  }, [currentUser?.name, currentUser?.email]);
  return (
    <PageShell eyebrow={text.orderHelpEyebrow} title={text.orderHelpTitle} subtitle={text.orderHelpSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
          {text.orderHelpPoints.map((point) => <p key={point}>{point}</p>)}
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-rose-100">
          <h3 className="text-xl font-semibold text-slate-900">{formText.contactTitle}</h3>
          <p className="mt-2 text-sm text-slate-600">{formText.contactSubtitle}</p>
          <div className="mt-4 grid gap-3">
            <input
              value={form.name}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, name: event.target.value }));
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={formText.fullName}
            />
            <input
              value={form.email}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, email: event.target.value }));
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={formText.email}
            />
            <input
              value={form.orderId}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, orderId: event.target.value }));
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={formText.orderId}
            />
            <select
              value={form.issueType}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, issueType: event.target.value }));
              }}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              {(formText.issueTypes || ORDER_HELP_FORM_I18N.en.issueTypes).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <textarea
              value={form.message}
              onChange={(event) => {
                setStatusMessage("");
                setForm((prev) => ({ ...prev, message: event.target.value }));
              }}
              className="min-h-[160px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder={formText.messagePlaceholder}
            />
            <button
              type="button"
              onClick={async () => {
                const name = String(form.name || "").trim();
                const email = String(form.email || "").trim();
                const orderId = String(form.orderId || "").trim();
                const issueType = String(form.issueType || "tracking").trim();
                const message = String(form.message || "").trim();
                if (!name || !email || !message) {
                  setStatusMessage(formText.validation);
                  return;
                }
                const submitted = await submitOrderHelpRequest?.(
                  {
                    name,
                    email,
                    orderId,
                    issueType,
                    message,
                  },
                  (successMessage) => setStatusMessage(successMessage || formText.success),
                  (errorMessage) => setStatusMessage(errorMessage || formText.validation),
                );
                if (submitted) {
                  setForm((prev) => ({
                    ...prev,
                    orderId: "",
                    issueType: "tracking",
                    message: "",
                  }));
                }
              }}
              className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white"
            >
              {formText.submit}
            </button>
            {statusMessage ? <div className="text-sm font-medium text-slate-700">{statusMessage}</div> : null}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const SAFETY_REPORT_FORM_I18N = {
  en: {
    title: "Safety report form",
    subtitle: "Report harassment, abuse, scam attempts, or off-platform payment requests.",
    fullName: "Full name",
    email: "Email",
    reportType: "Report type",
    reportTypes: [
      { value: "harassment", label: "Harassment" },
      { value: "abusive_language", label: "Abusive language" },
      { value: "scam", label: "Scam or suspicious behavior" },
      { value: "off_platform_payment", label: "Asked for off-platform payment" },
      { value: "other", label: "Other" },
    ],
    targetHandle: "Who is involved? (username/email/order ID, optional)",
    details: "Report details",
    detailsPlaceholder: "Describe what happened, when it happened, and include any IDs or context to help moderation review.",
    submit: "Submit safety report",
    success: "Safety report submitted. Admin has been notified.",
    validation: "Please enter your name, email, and report details.",
  },
  th: {
    title: "ฟอร์มรายงานความปลอดภัย",
    subtitle: "รายงานการคุกคาม การใช้ถ้อยคำไม่เหมาะสม การหลอกลวง หรือการชวนชำระเงินนอกแพลตฟอร์ม",
    fullName: "ชื่อ-นามสกุล",
    email: "อีเมล",
    reportType: "ประเภทการรายงาน",
    reportTypes: [
      { value: "harassment", label: "การคุกคาม" },
      { value: "abusive_language", label: "ถ้อยคำไม่เหมาะสม" },
      { value: "scam", label: "การหลอกลวงหรือพฤติกรรมน่าสงสัย" },
      { value: "off_platform_payment", label: "ขอชำระเงินนอกแพลตฟอร์ม" },
      { value: "other", label: "อื่นๆ" },
    ],
    targetHandle: "ผู้ที่เกี่ยวข้อง (ชื่อผู้ใช้/อีเมล/รหัสคำสั่งซื้อ, ไม่บังคับ)",
    details: "รายละเอียดเหตุการณ์",
    detailsPlaceholder: "อธิบายเหตุการณ์ เวลา และข้อมูลอ้างอิงที่เกี่ยวข้องเพื่อช่วยทีมดูแลตรวจสอบ",
    submit: "ส่งรายงานความปลอดภัย",
    success: "ส่งรายงานความปลอดภัยเรียบร้อยแล้ว และได้แจ้งเตือนแอดมินแล้ว",
    validation: "กรุณากรอกชื่อ อีเมล และรายละเอียดการรายงาน",
  },
  my: {
    title: "Safety report form",
    subtitle: "Harassment, abusive language, scam သို့မဟုတ် off-platform payment တောင်းဆိုချက်များကို report လုပ်နိုင်ပါသည်။",
    fullName: "အမည်",
    email: "အီးမေးလ်",
    reportType: "Report အမျိုးအစား",
    reportTypes: [
      { value: "harassment", label: "အနိုင်ကျင့်မှု" },
      { value: "abusive_language", label: "မသင့်လျော်သောစကား" },
      { value: "scam", label: "လိမ်လည်မှု သို့မဟုတ် သံသယဖြစ်ဖွယ်အပြုအမူ" },
      { value: "off_platform_payment", label: "Platform ပြင်ပငွေပေးချေခိုင်းခြင်း" },
      { value: "other", label: "အခြား" },
    ],
    targetHandle: "ပါဝင်သူ (username/email/order ID, optional)",
    details: "Report အသေးစိတ်",
    detailsPlaceholder: "ဘာဖြစ်ခဲ့သလဲ၊ ဘယ်အချိန်ဖြစ်ခဲ့သလဲ၊ moderation review အတွက် ID/context များထည့်ပါ။",
    submit: "Safety report တင်မည်",
    success: "Safety report ပေးပို့ပြီးပါပြီ။ Admin ကို အသိပေးထားပါသည်။",
    validation: "အမည်၊ အီးမေးလ်နှင့် report အသေးစိတ်ကို ဖြည့်ပါ။",
  },
  ru: {
    title: "Форма отчета о безопасности",
    subtitle: "Сообщайте о harassment, оскорблениях, мошенничестве и попытках оплаты вне платформы.",
    fullName: "Полное имя",
    email: "Email",
    reportType: "Тип обращения",
    reportTypes: [
      { value: "harassment", label: "Преследование" },
      { value: "abusive_language", label: "Оскорбительный язык" },
      { value: "scam", label: "Мошенничество или подозрительное поведение" },
      { value: "off_platform_payment", label: "Просьба оплатить вне платформы" },
      { value: "other", label: "Другое" },
    ],
    targetHandle: "Кто участвует? (username/email/ID заказа, необязательно)",
    details: "Детали обращения",
    detailsPlaceholder: "Опишите, что произошло и когда, добавьте ID и контекст для модерации.",
    submit: "Отправить отчет о безопасности",
    success: "Отчет отправлен. Администратор уведомлен.",
    validation: "Пожалуйста, укажите имя, email и детали обращения.",
  },
};

export function SafetyReportPage({ uiLanguage = "en", currentUser, submitSafetyReport, navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = HELP_I18N[pageLanguage] ? pageLanguage : "en";
  const formText = SAFETY_REPORT_FORM_I18N[locale] || SAFETY_REPORT_FORM_I18N.en;
  const urlParams = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  }, []);
  const prefillType = urlParams.get("type") || "";
  const prefillId = urlParams.get("id") || "";
  const prefillName = urlParams.get("name") || "";
  const prefillTargetHandle = useMemo(() => {
    if (prefillType && prefillId) {
      return prefillName ? `${prefillName} (${prefillType} ID: ${prefillId})` : `${prefillType} ID: ${prefillId}`;
    }
    return "";
  }, [prefillType, prefillId, prefillName]);
  const [form, setForm] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    reportType: prefillType ? "other" : "harassment",
    targetHandle: prefillTargetHandle,
    contextDetails: prefillType === "seller" ? "Reporting seller profile:\n\n" : prefillType === "bar" ? "Reporting bar profile:\n\n" : "",
  });
  const [statusMessage, setStatusMessage] = useState("");
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: prev.name || currentUser?.name || "",
      email: prev.email || currentUser?.email || "",
    }));
  }, [currentUser?.name, currentUser?.email]);
  return (
    <PageShell eyebrow="Support" title={formText.title} subtitle={formText.subtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-md ring-1 ring-rose-100">
        <div className="grid gap-3">
          <input
            value={form.name}
            onChange={(event) => {
              setStatusMessage("");
              setForm((prev) => ({ ...prev, name: event.target.value }));
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder={formText.fullName}
          />
          <input
            value={form.email}
            onChange={(event) => {
              setStatusMessage("");
              setForm((prev) => ({ ...prev, email: event.target.value }));
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder={formText.email}
          />
          <select
            value={form.reportType}
            onChange={(event) => {
              setStatusMessage("");
              setForm((prev) => ({ ...prev, reportType: event.target.value }));
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          >
            {(formText.reportTypes || SAFETY_REPORT_FORM_I18N.en.reportTypes).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            value={form.targetHandle}
            onChange={(event) => {
              setStatusMessage("");
              setForm((prev) => ({ ...prev, targetHandle: event.target.value }));
            }}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder={formText.targetHandle}
          />
          <textarea
            value={form.contextDetails}
            onChange={(event) => {
              setStatusMessage("");
              setForm((prev) => ({ ...prev, contextDetails: event.target.value }));
            }}
            className="min-h-[180px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder={formText.detailsPlaceholder}
          />
          <button
            type="button"
            onClick={async () => {
              const payload = {
                name: String(form.name || "").trim(),
                email: String(form.email || "").trim(),
                reportType: String(form.reportType || "other"),
                targetHandle: String(form.targetHandle || "").trim(),
                contextDetails: String(form.contextDetails || "").trim(),
              };
              if (!payload.name || !payload.email || !payload.contextDetails) {
                setStatusMessage(formText.validation);
                return;
              }
              const submitted = await submitSafetyReport?.(
                payload,
                (message) => setStatusMessage(message || formText.success),
                (message) => setStatusMessage(message || formText.validation),
              );
              if (submitted) {
                setForm((prev) => ({ ...prev, reportType: "harassment", targetHandle: "", contextDetails: "" }));
              }
            }}
            className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white"
          >
            {formText.submit}
          </button>
          {statusMessage ? <div className="text-sm font-medium text-slate-700">{statusMessage}</div> : null}
        </div>
      </div>
    </PageShell>
  );
}

export function PrivacyPackagingPage({ uiLanguage = "en", navigate }) {
  const [pageLanguage, setPageLanguage] = useState(uiLanguage);
  const locale = SUPPORT_STATIC_I18N[pageLanguage] ? pageLanguage : "en";
  const t = SUPPORT_STATIC_I18N[locale] || SUPPORT_STATIC_I18N.en;
  return (
    <PageShell eyebrow={t.packagingEyebrow} title={t.packagingTitle} subtitle={t.packagingSubtitle}>
      <StaticLanguageSelect value={locale} onChange={setPageLanguage} uiLanguage={locale} />
      <BackToFaqButton navigate={navigate} uiLanguage={locale} />
      <div className="space-y-4 rounded-3xl bg-white p-8 text-slate-600 shadow-md ring-1 ring-rose-100">
        {(t.packagingPoints || SUPPORT_STATIC_I18N.en.packagingPoints).map((point) => (
          <p key={point}>{point}</p>
        ))}
      </div>
    </PageShell>
  );
}
