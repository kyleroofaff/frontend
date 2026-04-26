import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Bell,
  Bookmark,
  CheckCircle2,
  Clock3,
  CreditCard,
  Database,
  LayoutDashboard,
  Lock,
  LogOut,
  MapPin,
  MessageSquare,
  Paperclip,
  Pencil,
  Package,
  Shield,
  ShoppingBag,
  Upload,
  Users,
  Wallet,
  X
} from "lucide-react";
import { ProductImage, SectionTitle, SellerQrCard } from "../components/site/SitePrimitives.jsx";
import {
  COLOR_OPTIONS,
  CONDITION_OPTIONS,
  CUSTOM_REQUEST_FEE_THB,
  DAYS_WORN_OPTIONS,
  FABRIC_OPTIONS,
  formatPriceTHB,
  localizeOptionLabel,
  MESSAGE_FEE_THB,
  MIN_CUSTOM_REQUEST_PURCHASE_THB,
  MIN_FEED_UNLOCK_PRICE_THB,
  MIN_SELLER_PRICE_THB,
  SCENT_LEVEL_OPTIONS,
  SELLER_LANGUAGE_OPTIONS,
  SHARED_SIZE_OPTIONS,
  STYLE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  BRA_SIZE_OPTIONS,
  PANTY_SIZE_OPTIONS,
  THAI_BRA_BANDS,
  THAI_BRA_CUPS,
  THAI_BRA_CUP_CM_SPAN,
  THAI_TO_US_BRA_SIZE_MAP,
  SELLER_BAR_REGISTRATION_COUNTRIES,
  REGISTRATION_CITIES_BY_COUNTRY,
} from "../productOptions.js";
import { formatDateTimeNoSeconds, formatTimeNoSeconds } from "../utils/timeFormat.js";
import { getRequiredTopUpAmount, isValidWalletTopUpAmount, MIN_WALLET_TOP_UP_THB } from "../utils/walletTopUp.js";

const CHECKOUT_SHAKE_KEYFRAMES = `
@keyframes checkout-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}
`;

const DEFAULT_PROMPTPAY_RECEIVER_MOBILE = "0812345678";

function onlyDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function toPromptPayMobileTarget(mobileNumber) {
  const digits = onlyDigits(mobileNumber);
  if (!digits) return "";
  if (digits.startsWith("66")) return `00${digits}`;
  if (digits.startsWith("0")) return `0066${digits.slice(1)}`;
  return `0066${digits}`;
}

function formatPromptPayAmount(amount) {
  const normalizedAmount = Number(amount || 0);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) return "";
  return normalizedAmount.toFixed(2);
}

function computePromptPayCrc(payloadWithoutCrc) {
  let crc = 0xFFFF;
  const data = `${payloadWithoutCrc}6304`;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPromptPayPayload({ mobileNumber, amount }) {
  const target = toPromptPayMobileTarget(mobileNumber);
  const formattedAmount = formatPromptPayAmount(amount);
  if (!target || !formattedAmount) return "";
  const merchantAccount = `0016A0000006770101110113${target}`;
  const payloadWithoutCrc = `00020101021229${String(merchantAccount.length).padStart(2, "0")}${merchantAccount}530376454${String(formattedAmount.length).padStart(2, "0")}${formattedAmount}5802TH`;
  const crc = computePromptPayCrc(payloadWithoutCrc);
  return `${payloadWithoutCrc}6304${crc}`;
}

function getAddressConventionMeta(countryValue) {
  const normalized = String(countryValue || "").trim().toUpperCase();
  if (normalized === "US") {
    return {
      regionLabel: "State",
      regionPlaceholder: "State",
      postalLabel: "ZIP code",
      postalPlaceholder: "ZIP code",
      regionRequired: true,
    };
  }
  if (normalized === "CA") {
    return {
      regionLabel: "Province",
      regionPlaceholder: "Province",
      postalLabel: "Postal code",
      postalPlaceholder: "Postal code",
      regionRequired: true,
    };
  }
  return {
    regionLabel: "State / Province / Region",
    regionPlaceholder: "State / Province / Region",
    postalLabel: "ZIP / Postal code",
    postalPlaceholder: "ZIP / Postal code",
    regionRequired: false,
  };
}

function formatRelativeTimeLabel(value) {
  if (!value) return "Just now";
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "Just now";
  const diffMs = Date.now() - dateValue.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 45) return "Just now";
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes}m ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours}h ago`;
  }
  if (diffSeconds < 604800) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days}d ago`;
  }
  return formatDateTimeNoSeconds(value);
}

function getDiscreetNotificationText(text, type, enabled) {
  if (!enabled) return String(text || "");
  const normalizedType = String(type || "").toLowerCase();
  if (normalizedType === "message") return "You have a new message.";
  if (normalizedType === "engagement") return "You have a new account update.";
  if (normalizedType === "admin_ops") return "You have a new admin alert.";
  return "You have a new notification.";
}

function formatNotificationDayLabel(value) {
  const dateValue = new Date(value || Date.now());
  if (Number.isNaN(dateValue.getTime())) return "Earlier";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate()).getTime();
  const diffDays = Math.floor((startOfToday - startOfTarget) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return dateValue.toLocaleDateString();
}

function groupNotificationsByDay(items) {
  const groups = [];
  let currentLabel = "";
  (items || []).forEach((item) => {
    const label = formatNotificationDayLabel(item?.createdAt);
    if (!groups.length || currentLabel !== label) {
      groups.push({ label, items: [] });
      currentLabel = label;
    }
    groups[groups.length - 1].items.push(item);
  });
  return groups;
}

const SELLER_UI_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "th", label: "Thai" },
  { value: "my", label: "Burmese" },
  { value: "ru", label: "Russian" }
];

const ADMIN_MOBILE_NAV_I18N = {
  en: { overview: "Overview", inbox: "Inbox", approvals: "Approvals", payments: "Payments" },
  th: { overview: "ภาพรวม", inbox: "กล่องข้อความ", approvals: "อนุมัติ", payments: "การชำระเงิน" },
  my: { overview: "အကျဉ်းချုပ်", inbox: "Inbox", approvals: "အတည်ပြုချက်", payments: "ငွေပေးချေမှု" },
  ru: { overview: "Обзор", inbox: "Входящие", approvals: "Одобрения", payments: "Платежи" },
};

const ACCOUNT_PAGE_I18N = {
  en: {
    loginRequired: "Login required",
    accountCenterTitle: "Your account center",
    accountCenterSubtitle: "Track orders, message sellers, manage your wallet, and update contact details.",
    messages: "Messages",
    favorites: "Favorites",
    wallet: "Wallet",
    orders: "Orders",
    contact: "Contact",
    orderTracking: "Order tracking",
    noOrders: "You have no orders yet.",
    orderHistory: "Order history",
    billingLedger: "Billing ledger",
    accountBalance: "Account balance",
    favoriteSellers: "Favorite sellers",
    favoriteBars: "Favorite bars",
    watchedProducts: "Liked Products",
    profile: "Profile",
    quickFinder: "Quick finder",
    contactDetails: "Contact details",
    saveDetails: "Save Details",
    timeFormat: "Time format",
    loginHelp: "Use the account menu to sign in and view your order history and profile details.",
    unknownAccountRoleTitle: "We could not load your account type",
    unknownAccountRoleHelp: "Try signing out and signing in again. If this keeps happening, contact support.",
    goHome: "Go home",
    totalOrders: "Total orders",
    processing: "Processing",
    shippedDelivered: "Shipped / delivered",
    seller: "Seller",
    items: "item(s)",
    orderPlaced: "Placed",
    tracking: "Tracking",
    resendReceipt: "Resend receipt",
    resendingReceipt: "Sending...",
    receiptRecentlySent: "Recently sent",
    receiptResent: "Receipt email sent.",
    receiptResendFailed: "Could not send receipt right now.",
    pending: "Pending",
    copied: "Copied",
    copyCode: "Copy code",
    linkCopied: "Link copied",
    copyLink: "Copy link",
    trackPackage: "Track package",
    messagingCenter: "Messaging center",
    perMessage: "per message",
    messagingHelp: "Connect with sellers, ask questions, and continue conversations in one secure thread.",
    sellerFeed: "Stories",
    barProfile: "Bar profile",
    barFeedTab: "Bar Stories",
    watchFeeds: "Watch Stories",
    findSellers: "Find sellers",
    searchSellers: "Search sellers",
    noSellerSearchResults: "No sellers match your search.",
    message: "Message",
    findByProduct: "Find by product",
    searchProductOrSeller: "Search product or seller",
    noProductFilterResults: "No products match your current filters.",
    notSpecified: "Not specified",
    conversationList: "Conversation list",
    conversationsAppearHere: "Your seller conversations will appear here.",
    conversationWith: "Conversation with",
    chattingWith: "Chatting with",
    noDate: "No date",
    newCountSuffix: "new",
    selectOrStartConversation: "Select or start a conversation",
    noMessagesInThread: "No messages in this thread yet. Send the first message to start the conversation.",
    writeMessage: "Write your message",
    sendMessage: "Send message",
    safetyNoticeKeepOnPlatform: "For your safety, keep all communication and payments on-platform. Never move chats to outside apps or pay sellers directly.",
    reportMessage: "Report",
    reportReasonLabel: "Reason",
    reportReasonDirectPayment: "Asked for direct payment outside platform",
    reportReasonOffPlatform: "Asked to move to another messaging app",
    reportReasonHarassment: "Harassment or abusive language",
    reportReasonScam: "Scam or suspicious behavior",
    reportReasonOther: "Other",
    reportDetailsOptional: "Optional details",
    reportDetailsRequiredOther: "Please add details when selecting Other.",
    submitReport: "Submit report",
    reportingMessage: "Reporting...",
    alreadyReportedMessage: "Already reported",
    reportSubmitFailed: "Unable to submit report right now.",
    purchaseHistoryHelp: "Your purchase history will appear here after checkout.",
    markNotificationsRead: "Mark notifications read",
    notifications: "Notifications",
    notificationsHelp: "Stay on top of messages, activity, and order updates.",
    notificationDiscreetMode: "Discreet notification text",
    noNotifications: "No notifications yet.",
    markRead: "Mark read",
    openThread: "Open thread",
    noWalletActivity: "No wallet activity yet.",
    availableBalance: "Available balance",
    walletHelp: "Messages and custom request messages deduct",
    walletHelpPart2: "per message, and custom request submissions cost",
    add: "Add",
    walletProcessing: "Processing wallet top-up...",
    walletAddedPrefix: "Added",
    walletAddedSuffix: "to your wallet.",
    walletPresetHelp: "Minimum top-up is 500 baht.",
    favoritesHelp: "Favorite sellers for quick profile and messaging access.",
    noFavorites: "No favorite sellers yet. Use Favorite in the quick finder or Follow in stories.",
    favoriteBarsHelp: "Follow bars to keep their stories posts close and easy to find.",
    noFavoriteBars: "No favorite bars yet. Use Follow bar on bar stories cards.",
    watchedProductsHelp: "Like products you want to revisit later from listing and product pages.",
    noWatchedProducts: "No liked products yet. Tap Like on product cards.",
    locationNotSet: "Location not set",
    savedOn: "Saved",
    view: "View",
    remove: "Remove",
    editProfileDetails: "Edit profile details",
    noAddressSaved: "No address saved yet",
    cityFallback: "City",
    countryFallback: "Country",
    postalCodeFallback: "ZIP / Postal code",
    phoneNotSet: "Phone not set",
    emailNotSet: "Email not set",
    quickFinderHelp: "Search sellers, products, and bars, then jump directly to the page you need.",
    searchSellersProductsStyles: "Search sellers, products, bars, styles...",
    sellersLabel: "Sellers",
    noSellersFound: "No sellers found for this query.",
    barsLabel: "Bars",
    noBarsFound: "No bars found for this query.",
    bookmarked: "Favorited",
    bookmark: "Favorite",
    followBar: "Favorite bar",
    followingBar: "Favorited bar",
    productsLabel: "Products",
    noProductsFound: "No products found for this query.",
    updateContactHelp: "Update your name, email, phone number, and shipping contact information.",
    fullName: "Full name",
    emailPlaceholder: "Email",
    phone: "Phone",
    country: "Country",
    city: "City",
    address: "Address",
    postalCode: "ZIP / Postal code",
    clock12: "12-hour clock (AM/PM)",
    clock24: "24-hour clock",
    orderLabel: "Order",
    all: "All",
    under: "Under",
    statusPaid: "Paid",
    statusPending: "Pending",
    statusRefunded: "Refunded",
    statusProcessing: "Processing",
    statusShipped: "Shipped",
    statusDelivered: "Delivered",
    statusCancelled: "Cancelled",
    showTranslation: "Show translation",
    showOriginal: "Show original",
    addWalletReplyPrefix: "Add at least",
    addWalletReplySuffix: "to your wallet to reply.",
    addWalletRequestMessageSuffix: "to your wallet to send custom request messages.",
    customRequests: "Custom requests",
  },
  th: {
    loginRequired: "ต้องเข้าสู่ระบบ",
    accountCenterTitle: "ศูนย์บัญชีของคุณ",
    accountCenterSubtitle: "ติดตามคำสั่งซื้อ ส่งข้อความหาผู้ขาย จัดการกระเป๋าเงิน และอัปเดตข้อมูลติดต่อ",
    messages: "ข้อความ",
    favorites: "รายการโปรด",
    wallet: "กระเป๋าเงิน",
    orders: "คำสั่งซื้อ",
    contact: "ติดต่อ",
    orderTracking: "ติดตามคำสั่งซื้อ",
    noOrders: "คุณยังไม่มีคำสั่งซื้อ",
    orderHistory: "ประวัติคำสั่งซื้อ",
    billingLedger: "ประวัติการเงิน",
    accountBalance: "ยอดเงินคงเหลือ",
    favoriteSellers: "ผู้ขายที่ชื่นชอบ",
    watchedProducts: "สินค้าที่ถูกใจ",
    profile: "โปรไฟล์",
    quickFinder: "ค้นหาแบบรวดเร็ว",
    contactDetails: "ข้อมูลติดต่อ",
    saveDetails: "บันทึกข้อมูล",
    timeFormat: "รูปแบบเวลา",
    loginHelp: "ใช้เมนูบัญชีเพื่อเข้าสู่ระบบและดูประวัติคำสั่งซื้อและข้อมูลโปรไฟล์ของคุณ",
    unknownAccountRoleTitle: "ไม่สามารถโหลดประเภทบัญชีได้",
    unknownAccountRoleHelp: "ลองออกจากระบบแล้วเข้าใหม่ หากยังเป็นอยู่ โปรดติดต่อฝ่ายสนับสนุน",
    goHome: "กลับหน้าแรก",
    totalOrders: "จำนวนคำสั่งซื้อทั้งหมด",
    processing: "กำลังดำเนินการ",
    shippedDelivered: "จัดส่งแล้ว / ส่งมอบแล้ว",
    seller: "ผู้ขาย",
    items: "รายการ",
    orderPlaced: "สั่งซื้อเมื่อ",
    tracking: "ติดตามพัสดุ",
    pending: "รอดำเนินการ",
    copied: "คัดลอกแล้ว",
    copyCode: "คัดลอกรหัส",
    linkCopied: "คัดลอกลิงก์แล้ว",
    copyLink: "คัดลอกลิงก์",
    trackPackage: "ติดตามพัสดุ",
    messagingCenter: "ศูนย์ข้อความ",
    perMessage: "ต่อข้อความ",
    messagingHelp: "เชื่อมต่อกับผู้ขาย ถามคำถาม และสนทนาต่อในเธรดเดียวอย่างปลอดภัย",
    sellerFeed: "เรื่องราว",
    barProfile: "โปรไฟล์บาร์",
    barFeedTab: "เรื่องราวบาร์",
    watchFeeds: "ดูเรื่องราว",
    findSellers: "ค้นหาผู้ขาย",
    searchSellers: "ค้นหาผู้ขาย",
    noSellerSearchResults: "ไม่พบผู้ขายที่ตรงกับคำค้นหา",
    message: "ข้อความ",
    findByProduct: "ค้นหาตามสินค้า",
    searchProductOrSeller: "ค้นหาสินค้าหรือผู้ขาย",
    noProductFilterResults: "ไม่พบสินค้าที่ตรงกับตัวกรองปัจจุบัน",
    notSpecified: "ไม่ได้ระบุ",
    conversationList: "รายการบทสนทนา",
    conversationsAppearHere: "บทสนทนากับผู้ขายของคุณจะแสดงที่นี่",
    conversationWith: "บทสนทนากับ",
    chattingWith: "กำลังแชทกับ",
    noDate: "ไม่มีวันที่",
    newCountSuffix: "ใหม่",
    selectOrStartConversation: "เลือกหรือเริ่มบทสนทนา",
    noMessagesInThread: "ยังไม่มีข้อความในเธรดนี้ ส่งข้อความแรกเพื่อเริ่มการสนทนา",
    writeMessage: "พิมพ์ข้อความของคุณ",
    sendMessage: "ส่งข้อความ",
    safetyNoticeKeepOnPlatform: "เพื่อความปลอดภัยของคุณ โปรดสื่อสารและชำระเงินบนแพลตฟอร์มเท่านั้น อย่าย้ายแชตไปแอปอื่นหรือจ่ายเงินให้ผู้ขายโดยตรง",
    reportMessage: "รายงาน",
    reportReasonLabel: "เหตุผล",
    reportReasonDirectPayment: "ขอชำระเงินนอกแพลตฟอร์ม",
    reportReasonOffPlatform: "ขอให้ย้ายไปแชตในแอปอื่น",
    reportReasonHarassment: "คุกคามหรือใช้ภาษาที่ไม่เหมาะสม",
    reportReasonScam: "หลอกลวงหรือพฤติกรรมน่าสงสัย",
    reportReasonOther: "อื่นๆ",
    reportDetailsOptional: "รายละเอียดเพิ่มเติม (ไม่บังคับ)",
    reportDetailsRequiredOther: "โปรดระบุรายละเอียดเมื่อเลือก อื่นๆ",
    submitReport: "ส่งรายงาน",
    reportingMessage: "กำลังรายงาน...",
    alreadyReportedMessage: "รายงานแล้ว",
    reportSubmitFailed: "ไม่สามารถส่งรายงานได้ในขณะนี้",
    purchaseHistoryHelp: "ประวัติการซื้อของคุณจะแสดงที่นี่หลังชำระเงิน",
    markNotificationsRead: "ทำเครื่องหมายการแจ้งเตือนว่าอ่านแล้ว",
    noWalletActivity: "ยังไม่มีกิจกรรมในกระเป๋าเงิน",
    availableBalance: "ยอดคงเหลือที่ใช้ได้",
    walletHelp: "ข้อความและข้อความคำขอพิเศษจะหัก",
    walletHelpPart2: "ต่อข้อความ และการส่งคำขอพิเศษมีค่าใช้จ่าย",
    add: "เติม",
    walletProcessing: "กำลังเติมเงินกระเป๋า...",
    walletAddedPrefix: "เพิ่ม",
    walletAddedSuffix: "เข้าสู่กระเป๋าเงินของคุณแล้ว",
    walletPresetHelp: "ยอดเติมขั้นต่ำคือ 500 บาท",
    favoritesHelp: "บันทึกผู้ขายไว้เพื่อเข้าถึงโปรไฟล์และข้อความได้รวดเร็ว",
    noFavorites: "ยังไม่มีผู้ขายที่ชื่นชอบ ใช้ Favorite ใน quick finder หรือ Follow ในเรื่องราว",
    watchedProductsHelp: "กดถูกใจสินค้าเพื่อกลับมาดูได้ภายหลังจากหน้ารายการหรือหน้าสินค้า",
    noWatchedProducts: "ยังไม่มีสินค้าที่ถูกใจ กด Like บนการ์ดสินค้าได้เลย",
    locationNotSet: "ยังไม่ได้ระบุที่อยู่",
    savedOn: "บันทึกเมื่อ",
    view: "ดู",
    remove: "ลบ",
    editProfileDetails: "แก้ไขรายละเอียดโปรไฟล์",
    noAddressSaved: "ยังไม่ได้บันทึกที่อยู่",
    cityFallback: "เมือง",
    countryFallback: "ประเทศ",
    postalCodeFallback: "รหัสไปรษณีย์",
    phoneNotSet: "ยังไม่ได้ตั้งค่าเบอร์โทร",
    emailNotSet: "ยังไม่ได้ตั้งค่าอีเมล",
    quickFinderHelp: "ค้นหาผู้ขายและสินค้า แล้วไปยังหน้าที่คุณต้องการได้ทันที",
    searchSellersProductsStyles: "ค้นหาผู้ขาย สินค้า สไตล์...",
    sellersLabel: "ผู้ขาย",
    noSellersFound: "ไม่พบผู้ขายสำหรับคำค้นหานี้",
    bookmarked: "บันทึกแล้ว",
    bookmark: "บันทึก",
    productsLabel: "สินค้า",
    noProductsFound: "ไม่พบสินค้าสำหรับคำค้นหานี้",
    updateContactHelp: "อัปเดตชื่อ อีเมล เบอร์โทร และข้อมูลที่อยู่สำหรับจัดส่งของคุณ",
    fullName: "ชื่อ-นามสกุล",
    emailPlaceholder: "อีเมล",
    phone: "เบอร์โทร",
    country: "ประเทศ",
    city: "เมือง",
    address: "ที่อยู่",
    postalCode: "รหัสไปรษณีย์",
    clock12: "เวลาแบบ 12 ชั่วโมง (AM/PM)",
    clock24: "เวลาแบบ 24 ชั่วโมง",
    orderLabel: "คำสั่งซื้อ",
    all: "ทั้งหมด",
    under: "ต่ำกว่า",
    statusPaid: "ชำระแล้ว",
    statusPending: "รอดำเนินการ",
    statusRefunded: "คืนเงินแล้ว",
    statusProcessing: "กำลังดำเนินการ",
    statusShipped: "จัดส่งแล้ว",
    statusDelivered: "ส่งมอบแล้ว",
    statusCancelled: "ยกเลิกแล้ว",
    showTranslation: "แสดงคำแปล",
    showOriginal: "แสดงต้นฉบับ",
    addWalletReplyPrefix: "เติมอย่างน้อย",
    addWalletReplySuffix: "ลงในกระเป๋าเพื่อส่งข้อความตอบกลับ",
    addWalletRequestMessageSuffix: "ลงในกระเป๋าเพื่อส่งข้อความคำขอพิเศษ",
    customRequests: "คำขอพิเศษ",
  },
  my: {
    loginRequired: "လော့ဂ်အင် လိုအပ်သည်",
    accountCenterTitle: "သင့်အကောင့်စင်တာ",
    accountCenterSubtitle: "order များစောင့်ကြည့်ရန်၊ seller များနှင့် စာပို့ရန်၊ wallet စီမံရန်နှင့် ဆက်သွယ်ရန်အချက်အလက် ပြင်ဆင်ရန်",
    messages: "မက်ဆေ့ချ်",
    favorites: "အကြိုက်များ",
    wallet: "wallet",
    orders: "အော်ဒါ",
    contact: "ဆက်သွယ်ရန်",
    orderTracking: "အော်ဒါ ခြေရာခံခြင်း",
    noOrders: "သင့်တွင် အော်ဒါ မရှိသေးပါ",
    orderHistory: "အော်ဒါ မှတ်တမ်း",
    billingLedger: "ငွေစာရင်း",
    accountBalance: "လက်ကျန်ငွေ",
    favoriteSellers: "အကြိုက်ဆုံး seller များ",
    watchedProducts: "Like လုပ်ထားသော Product များ",
    profile: "ပရိုဖိုင်",
    quickFinder: "အမြန်ရှာဖွေမှု",
    contactDetails: "ဆက်သွယ်ရန် အချက်အလက်",
    saveDetails: "အချက်အလက် သိမ်းမည်",
    timeFormat: "အချိန်ပုံစံ",
    loginHelp: "သင့် order မှတ်တမ်းနှင့် profile အသေးစိတ်ကြည့်ရန် account menu မှ လော့ဂ်အင်ဝင်ပါ။",
    unknownAccountRoleTitle: "အကောင့်အမျိုးအစား မဖတ်နိုင်ပါ",
    unknownAccountRoleHelp: "ထွက်ပြီး ပြန်ဝင်ကြည့်ပါ။ ဆက်ဖြစ်နေရင် ပံ့ပိုးမှုကို ဆက်သွယ်ပါ။",
    goHome: "ပင်မသို့",
    totalOrders: "စုစုပေါင်း order များ",
    processing: "ဆောင်ရွက်နေသည်",
    shippedDelivered: "ပို့ပြီး / လက်ခံပြီး",
    seller: "seller",
    items: "ပစ္စည်း",
    orderPlaced: "မှာယူသောနေ့",
    tracking: "ခြေရာခံ",
    pending: "စောင့်ဆိုင်းနေသည်",
    copied: "ကူးပြီးပါပြီ",
    copyCode: "ကုဒ်ကူးရန်",
    linkCopied: "လင့်ခ်ကူးပြီး",
    copyLink: "လင့်ခ်ကူးရန်",
    trackPackage: "ပါကေးချ်ကို ခြေရာခံ",
    messagingCenter: "မက်ဆေ့ချ်စင်တာ",
    perMessage: "တစ်မက်ဆေ့ချ်လျှင်",
    messagingHelp: "seller များနှင့် ဆက်သွယ်ပြီး မေးခွန်းမေးကာ conversation ကို တစ်နေရာတည်းတွင် ဆက်လက်လုပ်ဆောင်နိုင်သည်။",
    sellerFeed: "stories",
    barProfile: "bar ပရိုဖိုင်",
    barFeedTab: "bar stories",
    watchFeeds: "stories များကြည့်မည်",
    findSellers: "seller ရှာရန်",
    searchSellers: "seller ရှာရန်",
    noSellerSearchResults: "ရှာဖွေမှုနှင့် ကိုက်ညီသော seller မရှိပါ။",
    message: "မက်ဆေ့ချ်",
    findByProduct: "product အလိုက် ရှာရန်",
    searchProductOrSeller: "product သို့မဟုတ် seller ရှာရန်",
    noProductFilterResults: "လက်ရှိ filter များနှင့် ကိုက်ညီသော product မရှိပါ။",
    notSpecified: "မသတ်မှတ်ရသေး",
    conversationList: "conversation စာရင်း",
    conversationsAppearHere: "seller နှင့် conversation များကို ဒီမှာ ပြသပါမည်။",
    conversationWith: "conversation with",
    chattingWith: "စကားပြောနေသူ",
    noDate: "ရက်စွဲမရှိ",
    newCountSuffix: "အသစ်",
    selectOrStartConversation: "conversation ရွေးပါ သို့မဟုတ် စတင်ပါ",
    noMessagesInThread: "ဒီ thread ထဲတွင် မက်ဆေ့ချ်မရှိသေးပါ။ conversation စရန် ပထမမက်ဆေ့ချ်ကို ပို့ပါ။",
    writeMessage: "သင့်မက်ဆေ့ချ်ရေးပါ",
    sendMessage: "မက်ဆေ့ချ်ပို့ရန်",
    safetyNoticeKeepOnPlatform: "လုံခြုံရေးအတွက် စကားပြောခြင်းနှင့် ငွေပေးချေမှုကို platform အတွင်းသာ လုပ်ပါ။ ပြင်ပ app များသို့ မပြောင်းပါနှင့် seller ကို တိုက်ရိုက် မပေးချေပါနှင့်။",
    reportMessage: "Report",
    reportReasonLabel: "အကြောင်းပြချက်",
    reportReasonDirectPayment: "Platform ပြင်ပ တိုက်ရိုက်ငွေပေးချေခိုင်းခြင်း",
    reportReasonOffPlatform: "အခြား messaging app သို့ ပြောင်းခိုင်းခြင်း",
    reportReasonHarassment: "အနိုင်ကျင့်မှု/မသင့်လျော်သည့်စကား",
    reportReasonScam: "လိမ်လည်မှု သို့မဟုတ် သံသယဖြစ်ဖွယ် အပြုအမူ",
    reportReasonOther: "အခြား",
    reportDetailsOptional: "အသေးစိတ် (ရွေးချယ်နိုင်)",
    reportDetailsRequiredOther: "အခြား ကိုရွေးပါက အသေးစိတ် ထည့်ပါ။",
    submitReport: "Report ပို့ရန်",
    reportingMessage: "Report လုပ်နေသည်...",
    alreadyReportedMessage: "Report လုပ်ပြီး",
    reportSubmitFailed: "ယခုအချိန်တွင် report မပို့နိုင်ပါ။",
    purchaseHistoryHelp: "checkout ပြီးနောက် သင့်ဝယ်ယူမှတ်တမ်းကို ဒီနေရာတွင် ပြသပါမည်။",
    markNotificationsRead: "အသိပေးချက်အားလုံး ဖတ်ပြီးဟုမှတ်ပါ",
    noWalletActivity: "wallet လှုပ်ရှားမှု မရှိသေးပါ။",
    availableBalance: "အသုံးပြုနိုင်သည့် လက်ကျန်",
    walletHelp: "မက်ဆေ့ချ်နှင့် custom request မက်ဆေ့ချ်များသည်",
    walletHelpPart2: "တစ်မက်ဆေ့ချ်လျှင် နှုတ်ယူပြီး custom request တင်သွင်းမှုသည် ကုန်ကျမည်",
    add: "ထည့်ရန်",
    walletProcessing: "wallet top-up ဆောင်ရွက်နေသည်...",
    walletAddedPrefix: "ထည့်ပြီး",
    walletAddedSuffix: "သင့် wallet ထဲသို့ ရောက်ရှိပါပြီ။",
    walletPresetHelp: "အနည်းဆုံး top-up ပမာဏသည် 500 ဘတ် ဖြစ်သည်။",
    favoritesHelp: "profile နှင့် messaging ကို မြန်မြန်ဝင်ကြည့်ရန် seller များကို bookmark လုပ်ပါ။",
    noFavorites: "အကြိုက်ဆုံး seller မရှိသေးပါ။ quick finder တွင် Favorite သို့မဟုတ် stories တွင် Follow ကို သုံးပါ။",
    watchedProductsHelp: "Listing နှင့် product စာမျက်နှာများမှ ပြန်ကြည့်ချင်သော product များကို Like လုပ်ထားနိုင်သည်။",
    noWatchedProducts: "Like လုပ်ထားသော product မရှိသေးပါ။ Product card များပေါ်ရှိ Like ကိုနှိပ်ပါ။",
    locationNotSet: "တည်နေရာ မသတ်မှတ်ရသေး",
    savedOn: "သိမ်းထားသောနေ့",
    view: "ကြည့်ရန်",
    remove: "ဖယ်ရှားရန်",
    editProfileDetails: "profile အသေးစိတ် ပြင်ဆင်ရန်",
    noAddressSaved: "လိပ်စာ မသိမ်းထားသေးပါ",
    cityFallback: "မြို့",
    countryFallback: "နိုင်ငံ",
    postalCodeFallback: "စာပို့သင်္ကေတ",
    phoneNotSet: "ဖုန်းနံပါတ် မသတ်မှတ်ရသေး",
    emailNotSet: "အီးမေးလ် မသတ်မှတ်ရသေး",
    quickFinderHelp: "seller နှင့် product များကို ရှာပြီး လိုအပ်သည့်စာမျက်နှာသို့ တိုက်ရိုက်သွားပါ။",
    searchSellersProductsStyles: "seller, product, style များကို ရှာပါ...",
    sellersLabel: "seller များ",
    noSellersFound: "ဤရှာဖွေမှုအတွက် seller မတွေ့ပါ။",
    bookmarked: "favorite လုပ်ပြီး",
    bookmark: "favorite",
    productsLabel: "product များ",
    noProductsFound: "ဤရှာဖွေမှုအတွက် product မတွေ့ပါ။",
    updateContactHelp: "သင့်အမည်၊ email၊ ဖုန်းနံပါတ်နှင့် ပို့ဆောင်ရေးဆိုင်ရာ ဆက်သွယ်ရန်အချက်အလက်များကို အပ်ဒိတ်လုပ်ပါ။",
    fullName: "အမည်အပြည့်အစုံ",
    emailPlaceholder: "အီးမေးလ်",
    phone: "ဖုန်း",
    country: "နိုင်ငံ",
    city: "မြို့",
    address: "လိပ်စာ",
    postalCode: "စာပို့သင်္ကေတ",
    clock12: "12-နာရီ နာရီစနစ် (AM/PM)",
    clock24: "24-နာရီ နာရီစနစ်",
    orderLabel: "အော်ဒါ",
    all: "အားလုံး",
    under: "အောက်",
    statusPaid: "ငွေပေးချေပြီး",
    statusPending: "စောင့်ဆိုင်းနေသည်",
    statusRefunded: "ငွေပြန်အမ်းပြီး",
    statusProcessing: "ဆောင်ရွက်နေသည်",
    statusShipped: "ပို့ပြီး",
    statusDelivered: "လက်ခံပြီး",
    statusCancelled: "ပယ်ဖျက်ပြီး",
    showTranslation: "ဘာသာပြန်ကိုပြရန်",
    showOriginal: "မူရင်းကိုပြရန်",
    addWalletReplyPrefix: "အနည်းဆုံး",
    addWalletReplySuffix: "ကို wallet ထဲ ထည့်ပြီးမှ reply ပို့နိုင်ပါမည်။",
    addWalletRequestMessageSuffix: "ကို wallet ထဲ ထည့်ပြီးမှ custom request message ပို့နိုင်ပါမည်။",
    customRequests: "စိတ်ကြိုက်တောင်းဆိုချက်များ",
  },
  ru: {
    loginRequired: "Требуется вход",
    accountCenterTitle: "Ваш центр аккаунта",
    accountCenterSubtitle: "Отслеживайте заказы, пишите продавцам, управляйте кошельком и обновляйте контактные данные.",
    messages: "Сообщения",
    favorites: "Избранное",
    wallet: "Кошелек",
    orders: "Заказы",
    contact: "Контакты",
    orderTracking: "Отслеживание заказов",
    noOrders: "У вас пока нет заказов.",
    orderHistory: "История заказов",
    billingLedger: "История операций",
    accountBalance: "Баланс аккаунта",
    favoriteSellers: "Избранные продавцы",
    watchedProducts: "Понравившиеся товары",
    profile: "Профиль",
    quickFinder: "Быстрый поиск",
    contactDetails: "Контактные данные",
    saveDetails: "Сохранить данные",
    timeFormat: "Формат времени",
    loginHelp: "Используйте меню аккаунта, чтобы войти и просматривать историю заказов и данные профиля.",
    unknownAccountRoleTitle: "Не удалось определить тип аккаунта",
    unknownAccountRoleHelp: "Выйдите и войдите снова. Если проблема останется, обратитесь в поддержку.",
    goHome: "На главную",
    totalOrders: "Всего заказов",
    processing: "В обработке",
    shippedDelivered: "Отправлено / доставлено",
    seller: "Продавец",
    items: "товар(ов)",
    orderPlaced: "Оформлен",
    tracking: "Трекинг",
    pending: "В ожидании",
    copied: "Скопировано",
    copyCode: "Копировать код",
    linkCopied: "Ссылка скопирована",
    copyLink: "Копировать ссылку",
    trackPackage: "Отследить посылку",
    messagingCenter: "Центр сообщений",
    perMessage: "за сообщение",
    messagingHelp: "Связывайтесь с продавцами, задавайте вопросы и продолжайте диалоги в одном безопасном чате.",
    sellerFeed: "Истории",
    barProfile: "Профиль бара",
    barFeedTab: "Истории бара",
    watchFeeds: "Смотреть истории",
    findSellers: "Найти продавцов",
    searchSellers: "Поиск продавцов",
    noSellerSearchResults: "По вашему запросу продавцы не найдены.",
    message: "Сообщение",
    findByProduct: "Найти по товару",
    searchProductOrSeller: "Поиск товара или продавца",
    noProductFilterResults: "По текущим фильтрам товары не найдены.",
    notSpecified: "Не указано",
    conversationList: "Список диалогов",
    conversationsAppearHere: "Здесь появятся ваши диалоги с продавцами.",
    conversationWith: "Диалог с",
    chattingWith: "Чат с",
    noDate: "Нет даты",
    newCountSuffix: "новых",
    selectOrStartConversation: "Выберите или начните диалог",
    noMessagesInThread: "В этом диалоге пока нет сообщений. Отправьте первое сообщение, чтобы начать общение.",
    writeMessage: "Напишите сообщение",
    sendMessage: "Отправить сообщение",
    safetyNoticeKeepOnPlatform: "Для вашей безопасности общайтесь и оплачивайте только на платформе. Не переходите в сторонние мессенджеры и не платите продавцам напрямую.",
    reportMessage: "Пожаловаться",
    reportReasonLabel: "Причина",
    reportReasonDirectPayment: "Просьба об оплате вне платформы",
    reportReasonOffPlatform: "Просьба перейти в другой мессенджер",
    reportReasonHarassment: "Оскорбления или неподобающий язык",
    reportReasonScam: "Мошенничество или подозрительное поведение",
    reportReasonOther: "Другое",
    reportDetailsOptional: "Дополнительные детали (необязательно)",
    reportDetailsRequiredOther: "Если выбрано «Другое», добавьте детали.",
    submitReport: "Отправить жалобу",
    reportingMessage: "Отправка...",
    alreadyReportedMessage: "Уже пожаловались",
    reportSubmitFailed: "Сейчас не удалось отправить жалобу.",
    purchaseHistoryHelp: "После оформления заказа здесь появится история ваших покупок.",
    markNotificationsRead: "Отметить уведомления прочитанными",
    noWalletActivity: "Активности кошелька пока нет.",
    availableBalance: "Доступный баланс",
    walletHelp: "Сообщения и сообщения по кастомным запросам списывают",
    walletHelpPart2: "за сообщение, а отправка кастомного запроса стоит",
    add: "Пополнить",
    walletProcessing: "Обрабатывается пополнение кошелька...",
    walletAddedPrefix: "Добавлено",
    walletAddedSuffix: "в ваш кошелек.",
    walletPresetHelp: "Минимальное пополнение — 500 бат.",
    favoritesHelp: "Добавляйте продавцов в закладки для быстрого доступа к профилю и сообщениям.",
    noFavorites: "Пока нет избранных продавцов. Используйте Favorite в быстром поиске или Follow в историях.",
    watchedProductsHelp: "Отмечайте товары Like, чтобы быстро возвращаться к ним со страниц каталога и товара.",
    noWatchedProducts: "Пока нет понравившихся товаров. Нажмите Like на карточке товара.",
    locationNotSet: "Локация не указана",
    savedOn: "Сохранено",
    view: "Открыть",
    remove: "Удалить",
    editProfileDetails: "Изменить данные профиля",
    noAddressSaved: "Адрес пока не сохранен",
    cityFallback: "Город",
    countryFallback: "Страна",
    postalCodeFallback: "Почтовый индекс",
    phoneNotSet: "Телефон не указан",
    emailNotSet: "Email не указан",
    quickFinderHelp: "Ищите продавцов и товары, затем сразу переходите на нужную страницу.",
    searchSellersProductsStyles: "Поиск продавцов, товаров, стилей...",
    sellersLabel: "Продавцы",
    noSellersFound: "По этому запросу продавцы не найдены.",
    bookmarked: "В закладках",
    bookmark: "В закладки",
    productsLabel: "Товары",
    noProductsFound: "По этому запросу товары не найдены.",
    updateContactHelp: "Обновите имя, email, телефон и контактные данные для доставки.",
    fullName: "Полное имя",
    emailPlaceholder: "Email",
    phone: "Телефон",
    country: "Страна",
    city: "Город",
    address: "Адрес",
    postalCode: "Почтовый индекс",
    clock12: "12-часовой формат (AM/PM)",
    clock24: "24-часовой формат",
    orderLabel: "Заказ",
    all: "Все",
    under: "До",
    statusPaid: "Оплачен",
    statusPending: "В ожидании",
    statusRefunded: "Возврат выполнен",
    statusProcessing: "В обработке",
    statusShipped: "Отправлен",
    statusDelivered: "Доставлен",
    statusCancelled: "Отменен",
    showTranslation: "Показать перевод",
    showOriginal: "Показать оригинал",
    addWalletReplyPrefix: "Добавьте минимум",
    addWalletReplySuffix: "в кошелек, чтобы ответить.",
    addWalletRequestMessageSuffix: "в кошелек, чтобы отправлять сообщения по кастомным запросам.",
    customRequests: "Индивидуальные запросы",
  },
};

const EMAIL_TONE_VARIANTS_BY_TEMPLATE = {
  buyer_message_received: [
    {
      id: "premium",
      label: "Premium",
      subject: "A new message from {{senderName}} is waiting",
      body: "Hi {{recipientName}},\n\nYou have received a new message from {{senderName}}.\n\nOpen your inbox:\n{{actionUrl}}\n\nConversation: {{conversationId}}\n\nThank you for being part of the ThP community.\n\n- ThP",
      ctaLabel: "Open your messages",
    },
    {
      id: "playful",
      label: "Playful",
      subject: "Ping! {{senderName}} just wrote to you",
      body: "Hi {{recipientName}},\n\nYou have a fresh message from {{senderName}}.\n\nTap in and keep the chat flowing:\n{{actionUrl}}\n\nConversation: {{conversationId}}\n\nHave fun and keep it kind.\n\n- ThP",
      ctaLabel: "Jump to inbox",
    },
    {
      id: "neutral",
      label: "Neutral",
      subject: "New message received from {{senderName}}",
      body: "Hi {{recipientName}},\n\n{{senderName}} sent you a new message.\n\nGo to your inbox:\n{{actionUrl}}\n\nConversation: {{conversationId}}\n\n- ThP",
      ctaLabel: "Open inbox",
    },
  ],
  seller_message_received: [
    {
      id: "premium",
      label: "Premium",
      subject: "You have a new buyer message from {{senderName}}",
      body: "Hi {{recipientName}},\n\nA new buyer message has arrived from {{senderName}}.\n\nOpen your seller inbox:\n{{actionUrl}}\n\nConversation: {{conversationId}}\n\nProfessional responses help your shop stand out.\n\n- ThP",
      ctaLabel: "Open seller inbox",
    },
    {
      id: "playful",
      label: "Playful",
      subject: "New buyer message! {{senderName}} is in your inbox",
      body: "Hi {{recipientName}},\n\nA buyer just popped into your inbox: {{senderName}}.\n\nReply here:\n{{actionUrl}}\n\nConversation: {{conversationId}}\n\nQuick replies keep momentum high.\n\n- ThP",
      ctaLabel: "Reply now",
    },
    {
      id: "neutral",
      label: "Neutral",
      subject: "New buyer message from {{senderName}}",
      body: "Hi {{recipientName}},\n\nYou received a new buyer message from {{senderName}}.\n\nOpen inbox:\n{{actionUrl}}\n\nConversation: {{conversationId}}\n\n- ThP",
      ctaLabel: "Open inbox",
    },
  ],
  custom_request_received: [
    {
      id: "premium",
      label: "Premium",
      subject: "New custom request from {{buyerName}}",
      body: "Hi {{recipientName}},\n\nA new custom request has been submitted by {{buyerName}}.\n\nReview and respond:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\nA thoughtful reply can turn into a great order.\n\n- ThP",
      ctaLabel: "Review request",
    },
    {
      id: "playful",
      label: "Playful",
      subject: "Fresh custom request from {{buyerName}}",
      body: "Hi {{recipientName}},\n\nYou got a new custom request from {{buyerName}}.\n\nOpen it here:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\nHave fun with it and keep communication clear.\n\n- ThP",
      ctaLabel: "Open request",
    },
    {
      id: "neutral",
      label: "Neutral",
      subject: "Custom request received from {{buyerName}}",
      body: "Hi {{recipientName}},\n\nYou received a custom request from {{buyerName}}.\n\nView request:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\n- ThP",
      ctaLabel: "View request",
    },
  ],
  custom_request_status_changed: [
    {
      id: "premium",
      label: "Premium",
      subject: "Your custom request is now {{requestStatus}}",
      body: "Hi {{recipientName}},\n\nYour custom request status has been updated to {{requestStatus}}.\n\nOpen your request thread:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\nThank you for your patience.\n\n- ThP",
      ctaLabel: "View update",
    },
    {
      id: "playful",
      label: "Playful",
      subject: "Update time: request is now {{requestStatus}}",
      body: "Hi {{recipientName}},\n\nYour custom request just moved to {{requestStatus}}.\n\nCheck details here:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\nYou can message right from the thread.\n\n- ThP",
      ctaLabel: "Check request",
    },
    {
      id: "neutral",
      label: "Neutral",
      subject: "Custom request status changed to {{requestStatus}}",
      body: "Hi {{recipientName}},\n\nYour custom request status is now {{requestStatus}}.\n\nOpen custom requests:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\n- ThP",
      ctaLabel: "Open requests",
    },
  ],
  wallet_top_up_completed: [
    {
      id: "premium",
      label: "Premium",
      subject: "Wallet top-up complete: {{amount}} added",
      body: "Hi {{recipientName}},\n\nYour wallet top-up has been completed successfully.\n\nAdded: {{amount}}\nCurrent balance: {{walletBalance}}\n\nView account activity:\n{{actionUrl}}\n\n- ThP",
      ctaLabel: "View wallet",
    },
    {
      id: "playful",
      label: "Playful",
      subject: "Top-up successful! {{amount}} is now in your wallet",
      body: "Hi {{recipientName}},\n\nNice - your wallet has been topped up.\n\nAdded: {{amount}}\nNew balance: {{walletBalance}}\n\nOpen account:\n{{actionUrl}}\n\nYou are ready for your next move.\n\n- ThP",
      ctaLabel: "Open account",
    },
    {
      id: "neutral",
      label: "Neutral",
      subject: "Wallet top-up successful ({{amount}})",
      body: "Hi {{recipientName}},\n\nYour wallet top-up was successful.\n\nAmount added: {{amount}}\nBalance: {{walletBalance}}\n\nGo to account:\n{{actionUrl}}\n\n- ThP",
      ctaLabel: "Go to account",
    },
  ],
  wallet_low_balance: [
    {
      id: "premium",
      label: "Premium",
      subject: "Wallet balance reminder: {{walletBalance}}",
      body: "Hi {{recipientName}},\n\nYour wallet balance is currently {{walletBalance}}.\n\nTo avoid interruptions for messaging and requests, top up here:\n{{actionUrl}}\n\n- ThP",
      ctaLabel: "Top up wallet",
    },
    {
      id: "playful",
      label: "Playful",
      subject: "Friendly heads-up: your wallet is getting low",
      body: "Hi {{recipientName}},\n\nQuick reminder: your wallet balance is {{walletBalance}}.\n\nA quick top-up keeps everything smooth:\n{{actionUrl}}\n\n- ThP",
      ctaLabel: "Add funds",
    },
    {
      id: "neutral",
      label: "Neutral",
      subject: "Low wallet balance notice ({{walletBalance}})",
      body: "Hi {{recipientName}},\n\nYour wallet balance is {{walletBalance}}.\n\nTop up wallet:\n{{actionUrl}}\n\n- ThP",
      ctaLabel: "Top up",
    },
  ],
  order_shipped: [
    {
      id: "premium",
      label: "Premium",
      subject: "Your order {{orderId}} is on the way",
      body: "Hi {{recipientName}},\n\nYour order {{orderId}} has shipped.\n\nCarrier: {{trackingCarrier}}\nTracking code: {{trackingNumber}}\nTrack shipment: {{trackingUrl}}\n\nYou can also review status in your account:\n{{actionUrl}}\n\nThank you for your order.\n\n- ThP",
      ctaLabel: "Track shipment",
    },
    {
      id: "playful",
      label: "Playful",
      subject: "Good news! Order {{orderId}} just shipped",
      body: "Hi {{recipientName}},\n\nYour package is on the move.\n\nCarrier: {{trackingCarrier}}\nTracking code: {{trackingNumber}}\nTrack it here: {{trackingUrl}}\n\nNeed a quick recap? Open your account:\n{{actionUrl}}\n\nThanks for shopping with us.\n\n- ThP",
      ctaLabel: "Track my package",
    },
    {
      id: "neutral",
      label: "Neutral",
      subject: "Shipment update for order {{orderId}}",
      body: "Hi {{recipientName}},\n\nOrder {{orderId}} has been marked as shipped.\n\nCarrier: {{trackingCarrier}}\nTracking code: {{trackingNumber}}\nTracking link: {{trackingUrl}}\n\nView order details:\n{{actionUrl}}\n\n- ThP",
      ctaLabel: "View shipment",
    },
  ],
};

const ADMIN_TAB_CONFIG = [
  { key: "overview", label: "Overview", description: "Platform health and key counts", icon: LayoutDashboard },
  { key: "inbox", label: "Inbox and Reviews", description: "Messages and custom requests triage", icon: Bell },
  { key: "disputes", label: "Disputes and Refunds", description: "Investigate and resolve risk cases", icon: Shield },
  { key: "auth", label: "Seller Applications", description: "Approve/reject seller onboarding", icon: Lock },
  { key: "bars", label: "Bars", description: "Manage bars and seller affiliations", icon: MapPin },
  { key: "users", label: "Users and Appeals", description: "Search users, strikes, and appeals", icon: Users },
  { key: "social", label: "Social Moderation", description: "Reports, comments, and stories safety", icon: Shield },
  { key: "products", label: "Product Catalog", description: "Browse seller listings and status", icon: Package },
  { key: "sales", label: "Sales Performance", description: "Revenue and seller leaderboard", icon: ShoppingBag },
  { key: "email_inbox", label: "Email Inbox", description: "Manage shared support and admin mailbox threads", icon: MessageSquare },
  { key: "email_templates", label: "Email Templates", description: "Notification copy, variants, and tests", icon: MessageSquare },
  { key: "payments", label: "Payments", description: "Payouts and ledger operations", icon: CreditCard },
  { key: "gifts", label: "Gifts", description: "Gift catalog and fulfillment", icon: ShoppingBag },
  { key: "cms", label: "CMS and Routes", description: "Content model and route map", icon: Database },
  { key: "deployment", label: "Site Settings", description: "Manage SEO, routes, and technical settings.", icon: Upload },
];

const DELEGATED_ADMIN_SCOPE_OPTIONS = [
  { key: "sales.read", label: "Sales dashboard" },
  { key: "payments.manage", label: "Payments, payouts, and wallet adjustments" },
  { key: "affiliations.manage", label: "Seller-bar affiliations" },
  { key: "disputes.review", label: "Disputes and refund reviews" },
  { key: "users.block", label: "Block and unblock users" },
];

const TRACKING_CARRIER_OPTIONS = [
  "Not set",
  "Thailand Post / EMS",
  "DHL",
  "FedEx",
  "UPS",
  "USPS",
  "Other",
];

function formatDurationCompact(ms) {
  const safeMs = Math.max(0, Number(ms || 0));
  const totalMinutes = Math.floor(safeMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const SELLER_PROFILE_SELECT_I18N = {
  en: {
    locationPlaceholder: "Select location",
    shippingPlaceholder: "Select shipping coverage",
    turnaroundPlaceholder: "Select turnaround",
    locations: ["Bangkok, Thailand", "Chiang Mai, Thailand", "Phuket, Thailand", "Pattaya, Thailand", "Khon Kaen, Thailand", "Hat Yai, Thailand"],
    shipping: ["Worldwide via international carriers", "Asia + Europe via international carriers", "US + Canada via international carriers", "Selected countries via international carriers"],
    turnaround: ["Ships in 1-3 days", "Ships in 2-4 days", "Ships in 3-5 days", "Ships in 5-7 days"],
  },
  th: {
    locationPlaceholder: "เลือกที่ตั้ง",
    shippingPlaceholder: "เลือกพื้นที่จัดส่ง",
    turnaroundPlaceholder: "เลือกระยะเวลาจัดส่ง",
    locations: ["กรุงเทพฯ, ไทย", "เชียงใหม่, ไทย", "ภูเก็ต, ไทย", "พัทยา, ไทย", "ขอนแก่น, ไทย", "หาดใหญ่, ไทย"],
    shipping: ["จัดส่งทั่วโลกผ่านผู้ให้บริการขนส่งระหว่างประเทศ", "เอเชีย + ยุโรป ผ่านผู้ให้บริการขนส่งระหว่างประเทศ", "สหรัฐฯ + แคนาดา ผ่านผู้ให้บริการขนส่งระหว่างประเทศ", "บางประเทศผ่านผู้ให้บริการขนส่งระหว่างประเทศ"],
    turnaround: ["จัดส่งภายใน 1-3 วัน", "จัดส่งภายใน 2-4 วัน", "จัดส่งภายใน 3-5 วัน", "จัดส่งภายใน 5-7 วัน"],
  },
  my: {
    locationPlaceholder: "တည်နေရာရွေးပါ",
    shippingPlaceholder: "ပို့ဆောင်ရေးဧရိယာရွေးပါ",
    turnaroundPlaceholder: "ပို့ဆောင်ချိန်ရွေးပါ",
    locations: ["Bangkok, Thailand", "Chiang Mai, Thailand", "Phuket, Thailand", "Pattaya, Thailand", "Khon Kaen, Thailand", "Hat Yai, Thailand"],
    shipping: ["International carriers ဖြင့် ကမ္ဘာတစ်ဝန်းပို့ဆောင်", "International carriers ဖြင့် Asia + Europe", "International carriers ဖြင့် US + Canada", "ရွေးချယ်ထားသောနိုင်ငံများသို့ international carriers"],
    turnaround: ["1-3 ရက်အတွင်းပို့မည်", "2-4 ရက်အတွင်းပို့မည်", "3-5 ရက်အတွင်းပို့မည်", "5-7 ရက်အတွင်းပို့မည်"],
  },
  ru: {
    locationPlaceholder: "Выберите локацию",
    shippingPlaceholder: "Выберите покрытие доставки",
    turnaroundPlaceholder: "Выберите срок отправки",
    locations: ["Бангкок, Таиланд", "Чиангмай, Таиланд", "Пхукет, Таиланд", "Паттайя, Таиланд", "Кхонкэн, Таиланд", "Хатъяй, Таиланд"],
    shipping: ["Доставка по всему миру через международных перевозчиков", "Азия + Европа через международных перевозчиков", "США + Канада через международных перевозчиков", "Выбранные страны через международных перевозчиков"],
    turnaround: ["Отправка за 1-3 дня", "Отправка за 2-4 дня", "Отправка за 3-5 дней", "Отправка за 5-7 дней"],
  },
};
const SELLER_WORLDWIDE_SHIPPING_BY_LOCALE = {
  en: "Worldwide from Thailand",
  th: "จัดส่งทั่วโลกจากประเทศไทย",
  my: "ထိုင်းနိုင်ငံမှ ကမ္ဘာတစ်ဝန်းပို့ဆောင်",
  ru: "Доставка по всему миру из Таиланда",
};

const SELLER_WRITING_PRESETS_I18N = {
  en: {
    bioPresetLabel: "Profile description presets",
    messagePresetLabel: "Message presets",
    inboxMessageCategories: [
      {
        label: "Friendly",
        presets: [
          "I'm good today, how are you?",
          "Hey, hope your day is going well.",
          "Just checking in, how has your day been?",
          "Have you eaten today?"
        ],
      },
      {
        label: "Affectionate",
        presets: [
          "I miss you, I'm thinking of you.",
          "You crossed my mind and made me smile.",
          "You have such a lovely vibe - I always enjoy chatting with you."
        ],
      }
    ],
    bioCategories: [
      {
        label: "Professional",
        presets: [
          "I offer carefully curated listings with clear details, discreet shipping, and respectful communication.",
          "I focus on everyday and sporty styles, quick replies, and consistent quality."
        ],
      },
      {
        label: "Style-focused",
        presets: [
          "I curate lace, satin, and silk options with careful hygiene and reliable turnaround.",
          "I specialize in comfort-first styles with clear photos, transparent pricing, and dependable service."
        ],
      }
    ],
    messageCategories: [
      {
        label: "Availability",
        presets: [
          "I can do that. What color and size do you prefer?",
          "Thanks for your request. I can share options and pricing shortly."
        ],
      },
      {
        label: "Follow-up",
        presets: [
          "I received your message and will reply with details soon.",
          "I can start this request today and share an update once it is ready."
        ],
      },
      {
        label: "Pricing",
        presets: [
          "I cannot accept this quote right now, but I can suggest an alternative.",
          "That budget is a little low for this request. I can offer a revised quote."
        ],
      }
    ],
  },
  th: {
    bioPresetLabel: "ข้อความแนะนำโปรไฟล์",
    messagePresetLabel: "ข้อความตอบกลับสำเร็จรูป",
    inboxMessageCategories: [
      {
        label: "ทักทายแบบเป็นกันเอง",
        presets: [
          "วันนี้ฉันสบายดี คุณเป็นยังไงบ้าง?",
          "หวังว่าวันนี้ของคุณจะเป็นวันที่ดีนะ",
          "แวะมาทักเฉยๆ วันนี้ของคุณเป็นยังไงบ้าง?",
          "วันนี้ทานข้าวหรือยัง?"
        ],
      },
      {
        label: "คิดถึง",
        presets: [
          "ฉันคิดถึงคุณนะ กำลังนึกถึงคุณอยู่เลย",
          "วันนี้คุณเข้ามาในความคิดของฉันแล้วทำให้ยิ้มได้",
          "คุณมีเสน่ห์มาก คุยกับคุณทีไรก็รู้สึกดีเสมอ"
        ],
      }
    ],
    bioCategories: [
      {
        label: "มืออาชีพ",
        presets: [
          "ฉันมีสินค้าพรีเมียมพร้อมรายละเอียดชัดเจน จัดส่งแบบเป็นส่วนตัว และสื่อสารอย่างสุภาพ",
          "ฉันเน้นสไตล์ใส่ง่ายและสปอร์ต ตอบไว และคุมคุณภาพสม่ำเสมอ"
        ],
      },
      {
        label: "เน้นสไตล์",
        presets: [
          "ฉันคัดสรรงานลูกไม้ ซาติน และไหม พร้อมดูแลความสะอาดและจัดส่งตรงเวลา",
          "ฉันเน้นงานใส่สบาย พร้อมรูปชัดเจน ราคาโปร่งใส และบริการที่เชื่อถือได้"
        ],
      }
    ],
    messageCategories: [
      {
        label: "พร้อมให้บริการ",
        presets: [
          "ได้ค่ะ/ครับ ต้องการสีและไซซ์แบบไหนคะ/ครับ?",
          "ขอบคุณสำหรับคำขอ เดี๋ยวฉันส่งตัวเลือกและราคาให้เร็วที่สุด"
        ],
      },
      {
        label: "ติดตามงาน",
        presets: [
          "ได้รับข้อความแล้ว เดี๋ยวตอบรายละเอียดเพิ่มเติมให้นะคะ/ครับ",
          "ฉันเริ่มคำขอนี้ได้วันนี้ และจะแจ้งอัปเดตให้เมื่อพร้อมค่ะ/ครับ"
        ],
      },
      {
        label: "เรื่องราคา",
        presets: [
          "ตอนนี้ยังรับราคานี้ไม่ได้ แต่ฉันเสนอทางเลือกอื่นให้ได้ค่ะ/ครับ",
          "งบนี้อาจต่ำไปเล็กน้อยสำหรับคำขอนี้ ฉันสามารถเสนอราคาใหม่ให้ได้ค่ะ/ครับ"
        ],
      }
    ],
  },
  my: {
    bioPresetLabel: "Profile ဖော်ပြချက် preset များ",
    messagePresetLabel: "Reply preset များ",
    inboxMessageCategories: [
      {
        label: "Friendly",
        presets: [
          "ဒီနေ့ကျွန်မ/ကျွန်တော် အဆင်ပြေပါတယ်၊ သင်ကော ဘယ်လိုလဲ?",
          "ဟယ်လို, သင့်နေ့လေး ကောင်းကောင်းဖြတ်သန်းနေရမယ်လို့ မျှော်လင့်ပါတယ်။",
          "အခြေအနေမေးချင်လို့ပါ - ဒီနေ့ သင့်နေ့လေး ဘယ်လိုလဲ?",
          "ဒီနေ့ ထမင်းစားပြီးပြီလား?"
        ],
      },
      {
        label: "Affectionate",
        presets: [
          "သင့်ကို လွမ်းနေတယ်၊ သင့်ကို စဉ်းစားနေတယ်။",
          "သင့်ကို စဉ်းစားမိတိုင်း ကျွန်မ/ကျွန်တော် ပြုံးမိတယ်။",
          "သင့် vibe က အရမ်းချစ်စရာကောင်းလို့ သင်နဲ့ chat လုပ်ရတာ အမြဲပျော်ပါတယ်။"
        ],
      }
    ],
    bioCategories: [
      {
        label: "Professional",
        presets: [
          "ကျွန်မ/ကျွန်တော်သည် အသေးစိတ်ဖော်ပြချက်ရှင်းလင်းပြီး discreet shipping နှင့် လေးစားသောဆက်သွယ်ရေးဖြင့် listing များကို ပေးပါသည်။",
          "Everyday နှင့် sporty style များကို အဓိကထားပြီး မြန်မြန်ပြန်လည်တုံ့ပြန်ကာ အရည်အသွေးကို တည်ငြိမ်စွာ ထိန်းသိမ်းပါသည်။"
        ],
      },
      {
        label: "Style-focused",
        presets: [
          "Lace၊ satin နှင့် silk option များကို သန့်ရှင်းရေးဂရုစိုက်မှုနှင့် ယုံကြည်စိတ်ချရသော turnaround ဖြင့် ကောင်းစွာရွေးချယ်ပေးပါသည်။",
          "သက်တောင့်သက်သာ style များကို အဓိကထားပြီး ပုံရှင်းလင်းမှု၊ စျေးနှုန်းပွင့်လင်းမှု နှင့် ယုံကြည်ရသော service ကို ပေးပါသည်။"
        ],
      }
    ],
    messageCategories: [
      {
        label: "Availability",
        presets: [
          "ရပါတယ်။ အရောင်နဲ့ size ဘာလိုချင်ပါသလဲ?",
          "Request အတွက် ကျေးဇူးတင်ပါတယ်။ Option နဲ့ စျေးနှုန်းကို မကြာခင်ပေးပါမယ်။"
        ],
      },
      {
        label: "Follow-up",
        presets: [
          "သင့် message ကို လက်ခံရရှိပြီးပါပြီ။ မကြာခင် အသေးစိတ်ပြန်ဖြေပါမယ်။",
          "ဒီ request ကို ဒီနေ့စလို့ရပါတယ်။ အဆင်သင့်ဖြစ်တာနဲ့ update ပို့ပါမယ်။"
        ],
      },
      {
        label: "Pricing",
        presets: [
          "ဒီ quote ကို အခုမလက်ခံနိုင်သေးပါ၊ ဒါပေမယ့် အစားထိုး option တစ်ခု အကြံပြုနိုင်ပါတယ်။",
          "ဒီ budget က ဒီ request အတွက် နည်းနည်းနိမ့်နေပါတယ်။ ပြန်လည်စျေးနှုန်းပေးနိုင်ပါတယ်။"
        ],
      }
    ],
  },
  ru: {
    bioPresetLabel: "Шаблоны описания профиля",
    messagePresetLabel: "Шаблоны ответов",
    inboxMessageCategories: [
      {
        label: "Дружелюбно",
        presets: [
          "У меня сегодня все хорошо, как ты?",
          "Привет, надеюсь, у тебя хороший день.",
          "Просто решила написать: как у тебя проходит день?",
          "Ты сегодня уже ела?"
        ],
      },
      {
        label: "Нежно",
        presets: [
          "Я скучаю по тебе, думаю о тебе.",
          "Ты пришел(пришла) мне в голову и заставил(а) улыбнуться.",
          "У тебя очень приятная энергия, мне всегда нравится с тобой переписываться."
        ],
      }
    ],
    bioCategories: [
      {
        label: "Профессионально",
        presets: [
          "Я предлагаю премиальные товары с понятными деталями, деликатной доставкой и уважительным общением.",
          "Мой фокус - повседневные и спортивные стили, быстрые ответы и стабильное качество."
        ],
      },
      {
        label: "По стилю",
        presets: [
          "Я подбираю варианты из кружева, сатина и шелка с аккуратной гигиеной и надежными сроками отправки.",
          "Я делаю акцент на комфортных стилях, четких фото, прозрачной цене и надежном сервисе."
        ],
      }
    ],
    messageCategories: [
      {
        label: "Наличие",
        presets: [
          "Да, могу сделать. Какой цвет и размер вы хотите?",
          "Спасибо за запрос. Скоро отправлю варианты и цену."
        ],
      },
      {
        label: "Уточнение",
        presets: [
          "Я получила(а) ваше сообщение и скоро отвечу с деталями.",
          "Я могу начать этот запрос сегодня и сообщу, когда все будет готово."
        ],
      },
      {
        label: "Цена",
        presets: [
          "Сейчас не могу принять эту цену, но могу предложить альтернативу.",
          "Этот бюджет немного низкий для такого запроса. Могу предложить обновленную цену."
        ],
      }
    ],
  },
};

function buildSellerSelectOptions(baseOptions, currentValue) {
  const trimmed = (currentValue || "").trim();
  if (!trimmed || baseOptions.includes(trimmed)) return baseOptions;
  return [trimmed, ...baseOptions];
}

function normalizeLegacyLocalizedValue(rawValue, options, fallback = "") {
  const value = String(rawValue || "").trim();
  if (!value) return fallback;
  if (options.includes(value)) return value;
  const baseEnglish = value.split(" (")[0].trim();
  if (options.includes(baseEnglish)) return baseEnglish;
  return fallback || value;
}

const SELLER_I18N = {
  en: {
    sectionTitle: "Manage your storefront",
    sectionSubtitle: "Update your profile, publish listings, and share posts with your audience.",
    language: "Language",
    loginRequired: "Seller login required",
    profileChecklist: "Profile completion checklist",
    profileComplete: "Profile complete. You can publish listings.",
    location: "Location",
    countryLabel: "Country",
    cityLabel: "City",
    shipping: "Shipping details",
    turnaround: "Turnaround time",
    portfolio: "Portfolio URL",
    bio: "Seller bio",
    profileDetails: "Profile details (shown publicly)",
    profileDetailsHint: "This info is shown on your public profile to help buyers find you.",
    heightLabel: "Height",
    weightLabel: "Weight",
    hairColorLabel: "Hair color",
    braSizeLabel: "Bra size",
    thaiBraSizes: "Thai sizes (cm)",
    usBraSizes: "US sizes",
    thaiBraCupDifferenceHint: "Cup = chest difference in cm",
    selectedUsSize: "US equivalent:",
    pantySizeLabel: "Panty size",
    selectHairColor: "Select hair color",
    selectBraSize: "Select bra size",
    selectPantySize: "Select panty size",
    saveProfile: "Save profile updates",
    mediaUpload: "Product upload",
    mediaUploadHelp: "Choose an image file for your product listing. Uploaded images are saved for this session.",
    productTitle: "Product title",
    price: "Price",
    color: "Color",
    imagePreview: "Image preview",
    createDraft: "Create listing",
    inbox: "Seller inbox",
    liveUpdates: "Live updates",
    conversations: "conversation(s)",
    noMessages: "No messages yet.",
    customerConversation: "Customer conversation",
    chattingWith: "Chatting with",
    unknownBuyer: "Unknown buyer",
    selectConversation: "Select a conversation to reply.",
    replyPlaceholder: "Reply to buyer",
    reply: "Reply",
    createFeedPost: "Create stories post",
    createFeedPostHelp: "Share an update on your public stories so buyers can get to know your brand.",
    captionPlaceholder: "Write a caption about your day, mood, or style...",
    postImagePreview: "Post image preview",
    posting: "Posting...",
    postToFeed: "Post to Stories",
    yourFeedPosts: "Your Stories posts",
    noPosts: "You have not posted yet. Create your first stories post above.",
    noCaption: "No caption added.",
    noImage: "No image",
    notifications: "Notifications",
    markAllRead: "Mark all read",
    noNotifications: "No notifications.",
    listingLibrary: "Listing library",
    items: "items",
    noAsset: "No asset",
    worn: "Worn",
    notSpecified: "Not specified",
    publish: "Publish",
    viewListing: "View listing",
    editListing: "Edit",
    cancelEditListing: "Cancel edit",
    updateListing: "Update listing",
    creatingListing: "Creating...",
    updatingListing: "Updating...",
    editingLabel: "Editing",
    delete: "Delete",
    deleting: "Deleting...",
    feedEyebrow: "Stories",
    feedTitle: "Stories",
    feedSubtitle: "Browse seller stories, behind-the-scenes photos, and day-to-day updates.",
    noFeedPosts: "No stories yet. Check back soon for new updates.",
    feedImage: "Stories image",
    whatBuyersWillSee: "What buyers will see (profile card)",
    whatBuyersWillSeeShort: "What buyers will see",
    removeImage: "Remove image",
  like: "Like",
  unlike: "Unlike",
  comment: "Comment",
  comments: "comments",
  writeComment: "Write a comment...",
  postComment: "Post",
  loginToEngage: "Login to like and comment on posts.",
  allPosts: "All posts",
  followingPosts: "Following",
  affiliatesPosts: "Affiliates",
  barsPosts: "Bars",
  favoriteBarsPosts: "Favorite Bars",
  savedPosts: "Saved",
  follow: "Follow",
  following: "Following",
  followBar: "Follow bar",
  followingBar: "Following bar",
  savePost: "Save post",
  saved: "Saved",
  deleteComment: "Delete",
  noFollowingPosts: "No posts from followed sellers yet.",
  noAffiliatesPosts: "No posts from your affiliated sellers yet.",
  noBarsPosts: "No bar stories yet.",
  noFavoriteBarsPosts: "No posts from your favorite bars yet.",
  noSavedPosts: "No saved posts yet.",
  noCommentsYet: "No comments yet.",
  commentLimit: "Comment",
  newest: "Newest",
  mostEngaged: "Most engaged",
  followers: "followers",
  searchFeedPlaceholder: "Search stories",
  clearSearch: "Clear",
  noSearchResults: "No posts match your search.",
  watchFeeds: "Watch Stories",
  barProfile: "Bar profile",
  barFeedTab: "Bar Stories",
    reportCount: "report(s)",
    reasonInappropriate: "Inappropriate content",
    reasonHarassment: "Harassment or abuse",
    reasonSpam: "Spam",
    reasonImpersonation: "Impersonation",
    reasonOther: "Other",
    customReason: "Custom reason",
    report: "Report",
    reporting: "Reporting...",
    loadMorePosts: "Load more posts",
    quickProfile: "Profile",
    quickNewListing: "New Listing",
    quickInbox: "Inbox",
    messagesTab: "Messages",
    customRequestsTab: "Custom requests",
    unreadChatsCount: "Unread chats",
    openRequestsCount: "Open requests",
    quickNewPost: "New Post",
    quickListings: "Listings",
    showTranslation: "Show translation",
    showOriginal: "Show original",
    addWalletReplyPrefix: "Add at least",
    addWalletReplySuffix: "to your wallet to reply.",
    languages: "Languages",
    barAffiliation: "Bar affiliation",
    barAffiliationHelp: "Adding a bar now creates an approval request. Removing your affiliation applies immediately.",
    applicationMessageLabel: "Application message (optional)",
    applicationMessagePlaceholder: "Tell the bar about you and why you want to join.",
    uploadPhotosLabel: "Upload photos (up to 4)",
    applicationPendingWith: "Application pending with",
    pendingApplicationElsewhere: "You have a pending application to another bar. Cancel it before applying elsewhere.",
    currentlyAffiliatedWith: "Currently affiliated with",
    removeAffiliation: "Remove affiliation",
    pendingBarRequests: "Pending requests to bars",
    barInvitesAwaitingApproval: "Bar invites awaiting your approval",
    cancel: "Cancel",
    approve: "Approve",
    reject: "Reject",
    customRequests: "Custom requests",
    requestsCount: "request(s)",
    receivedLabel: "Received",
    sentLabel: "Sent",
    noCustomRequests: "No custom requests yet.",
    buyer: "Buyer",
    noEmail: "No email",
    preferencesLabel: "Preferences",
    shippingCountryLabel: "Shipping country",
    notProvided: "Not provided",
    noDetailsProvided: "No details provided.",
    buyerImageUploads: "Buyer image uploads",
    buyerUploadsEnabled: "Buyer image uploads enabled.",
    buyerUploadsDisabled: "Buyer image uploads disabled.",
    allowBuyerUploads: "Allow buyer to upload images",
    buyerUploadsHelp: "Sellers can always upload images. Buyer uploads are blocked by default until enabled here.",
    priceProposal: "Price proposal",
    currentQuoteLabel: "Current quote",
    notProposedYet: "Not proposed yet",
    buyerCounterLabel: "Buyer counter",
    lastNoteLabel: "Last note",
    quotePlaceholder: "Quote THB",
    optionalNotePlaceholder: "Optional note to buyer",
    quoteSent: "Quote sent.",
    sendQuote: "Send quote",
    counterAccepted: "Counter accepted. Buyer can now pay.",
    acceptCounter: "Accept counter",
    counterDeclined: "Counter declined. Quote remains active.",
    declineCounter: "Decline counter",
    noRepliesYet: "No replies yet.",
    customRequestAttachment: "Custom request attachment",
    replyToCustomRequest: "Reply to this custom request",
    send: "Send",
    clearImages: "Clear images",
    draftAttachment: "Draft attachment",
    awaitingBuyerPayment: "awaiting buyer payment",
    statusNone: "none",
    statusProposed: "proposed",
    statusCountered: "countered",
    statusAccepted: "accepted",
    statusDeclined: "declined",
    statusPaid: "paid",
    statusExpired: "expired",
    sellerDashboardEyebrow: "Seller dashboard",
    sellerPresence: "Seller presence",
    online: "Online",
    offline: "Offline",
    feedVisibilityMode: "Stories visibility mode",
    publicAllPosts: "Public all posts",
    privateAllPosts: "Private all posts",
    chooseEachPost: "Choose each post",
    presenceHelp: "Online/offline appears on your listings and posts. Use a global visibility mode or choose visibility per post.",
    size: "Size",
    type: "Type",
    fabric: "Fabric",
    daysWorn: "Days worn",
    condition: "Condition",
    scentLevel: "Scent level",
    scheduleOptional: "Schedule (optional)",
    futureTimeOnly: "Future time only. Leave blank to publish now.",
    postVisibility: "Post visibility",
    controlledByFeedMode: "Controlled by stories mode",
    privateUnlockPrice: "Private unlock price (THB)",
    lockedPosts: "Locked posts",
    paidUnlocks: "Paid unlocks",
    unlockRevenue: "Unlock revenue",
    topPost: "Top post",
    earnings: "Earnings",
    grossEarnings: "Gross earnings",
    grossEarningsHelp: "Before platform/bar fee allocation.",
    netEarnings: "Net earnings",
    netEarningsHelp: "Amount credited to your wallet.",
    scheduledPosts: "Scheduled posts",
    likes: "Likes",
    engagement7Day: "7-day engagement",
    trendVsPrevious7Day: "Trend vs previous 7 days",
    privatePostPricingMode: "Private post pricing mode",
    samePriceForAllPrivate: "Same price for all private posts",
    individualPricePerPost: "Individual price per post",
    bulkPriceForAllPrivate: "Bulk price for all private posts",
    applyToAllPrivate: "Apply to all private",
    individualModeHelp: "Individual mode is active. Set each private post price in the post list below",
    scheduledLabel: "Scheduled",
    unschedule: "Unschedule",
    publishNow: "Publish now",
    chooseFile: "Choose file",
    chooseFiles: "Choose files",
    noFileChosen: "No file chosen",
    tapToCover: "Tap an image to set it as the cover photo.",
    coverBadge: "Cover",
    filesSelected: "file(s) selected",
    allLabel: "All",
    unreadLabel: "Unread",
    messagesLabel: "Messages",
    engagementLabel: "Engagement",
    adminLabel: "Admin",
    updateLabel: "Update",
    notificationDiscreetMode: "Discreet Messages",
    viewModeLabel: "View",
    compactLabel: "Compact",
    comfortLabel: "Comfort",
    onLabel: "On",
    offLabel: "Off",
    discreetMessagesHelp: "Discreet Messages hides sensitive wording in notification previews. View switches between roomier cards (Comfort) and tighter rows (Compact).",
    emailNotifications: "Email notifications",
    browserNotifications: "Browser notifications",
    pushNotSupported: "Push notifications are not supported by this browser.",
    pushBlockedEnableSettings: "Browser notifications are blocked. Enable notifications in browser settings.",
    markRead: "Mark read",
    openThread: "Open thread",
    appealNow: "Appeal now",
    newBuyerMessagesWaiting: "New buyer messages waiting",
    youHave: "You have",
    openInboxReplyQuickly: "Open inbox to reply quickly.",
    viewUnreadMessages: "View unread messages",
    quickActionsLabel: "Quick actions",
    quickActionsHelp: "Use these shortcuts to post listings, reply quickly, and manage incoming work.",
    openMessages: "Open messages",
    sellerOrdersTitle: "Order shipments",
    sellerOrdersHelp: "Orders containing your products. Add tracking numbers and update fulfillment status.",
    sellerOrdersHelpAffiliated: "Your bar handles shipping. Tracking info will appear here once added.",
    noSellerOrders: "No orders for your products yet.",
    shipTo: "Ship to",
    fulfillmentStatus: "Fulfillment status",
    trackingCode: "Tracking code",
    carrier: "Carrier",
    saveShipment: "Save shipment",
    saving: "Saving...",
    shipmentControlsNote: "Shipment controls become available after payment is marked as paid.",
    loginCredentialsTitle: "Login credentials",
    loginCredentialsSubtitle: "Change your name, email, or password.",
    credentialsHelp: "Update your display name freely. To change email or password, enter your current password to confirm.",
    displayNamePlaceholder: "New display name",
    currentPasswordPlaceholder: "Current password",
    newEmailPlaceholder: "New email",
    newPasswordPlaceholder: "New password",
    confirmPasswordPlaceholder: "Confirm password",
    passwordPolicyHelp: "Use at least 8 characters with 1 number and 1 symbol.",
    savingLabel: "Saving...",
    updateCredentials: "Update credentials",
    sellerApplicationUnderReviewTitle: "Seller application under review",
    sellerApplicationUnderReviewHelp: "Your application has been submitted and is currently being reviewed. Seller tools unlock as soon as you are approved.",
    submittedLabel: "Submitted",
    recentlyLabel: "Recently",
    typicalReviewTimeHelp: "Typical review time: within 24-48 hours.",
    contactSupport: "Contact support",
    sellerApplicationRejectedTitle: "Seller application rejected",
    sellerApplicationRejectedHelp: "Your previous application was not approved. Update your details and submit a new registration.",
    reapplyAsSeller: "Reapply as Seller",
    sellerLoginRequiredHelp: "Please log in with a seller account to continue.",
    goToLogin: "Go to login",
    accountFrozenAfterStrikes: "Account frozen after two moderation strikes",
    moderationStrikesOnAccount: "Moderation strikes on account",
    sellerAccountFrozenAppealHelp: "Your seller account is frozen. Submit an appeal to request review.",
    reviewStrikesAndAppealHelp: "Please review your strike details and submit an appeal if you want admin review.",
    openAppeals: "Open appeals",
    closeLabel: "Close",
    openLabel: "Open",
    profileLabel: "Profile",
    sellerProfileFallback: "Seller profile",
    profileImageLabel: "Profile image",
    sellerProfileImageFallback: "Seller profile image",
    profileImageHelp: "If you skip this, buyers will see your seller name on a default image.",
    shippingScopeFixedHelp: "Shipping scope is fixed for all sellers.",
    setBuilderTitle: "Set builder",
    setBuilderHelp: "Create combo products (for example bra + panties, top + skirt, or 4-piece sets) while keeping individual items listed separately.",
    setBuilderNeedMore: "Add at least 2 individual listings to unlock the set builder.",
    cancelEdit: "Cancel edit",
    setTitleLabel: "Set title",
    setTitlePlaceholder: "Example: Bra + Panty Matching Set",
    setDescriptionLabel: "Set description",
    setDescriptionPlaceholder: "Describe this set for buyers...",
    advancedSetOptions: "Advanced options",
    combinedSetPriceLabel: "Combined set price (THB)",
    setPricePlaceholder: "Set price",
    selectProductsToInclude: "Select products to include (2 or more)",
    createIndividualProductsFirst: "Create individual products first, then build sets from them.",
    setSaved: "Set saved.",
    setSaveFailed: "Could not save set.",
    updateSetProduct: "Update set product",
    createSetProduct: "Create set product",
    existingSetProducts: "Existing set products",
    editSet: "Edit set",
    noListingsYet: "No listings yet.",
    noListingsYetHelp: "Create your first listing so buyers can discover and message you.",
    createFirstListing: "Create your first listing",
    setBadgeLabel: "Set",
    soldLabel: "Sold",
    draftStatusLabel: "Draft",
    includesLabel: "Includes",
    unpublishLabel: "Unpublish",
    applyToBar: "Apply to selected bar"
  },
  th: {
    sectionTitle: "จัดการหน้าร้านของคุณ", sectionSubtitle: "อัปเดตโปรไฟล์ เผยแพร่สินค้า และแชร์โพสต์ไลฟ์สไตล์ให้ผู้ซื้อเห็น",
    language: "ภาษา", loginRequired: "ต้องเข้าสู่ระบบผู้ขาย", profileChecklist: "เช็กลิสต์ความสมบูรณ์ของโปรไฟล์",
    profileComplete: "โปรไฟล์ครบถ้วนแล้ว คุณสามารถเผยแพร่สินค้าได้",
    profileDetails: "รายละเอียดโปรไฟล์ (แสดงสาธารณะ)", profileDetailsHint: "ข้อมูลนี้จะแสดงบนโปรไฟล์สาธารณะเพื่อช่วยให้ผู้ซื้อค้นหาคุณ", heightLabel: "ส่วนสูง", weightLabel: "น้ำหนัก", hairColorLabel: "สีผม", braSizeLabel: "ขนาดบรา", thaiBraSizes: "ไซส์ไทย (ซม.)", usBraSizes: "ไซส์ US", thaiBraCupDifferenceHint: "ถ้วย = ความต่างรอบอก (ซม.)", selectedUsSize: "ไซส์ US:", pantySizeLabel: "ขนาดกางเกงใน", selectHairColor: "เลือกสีผม", selectBraSize: "เลือกขนาดบรา", selectPantySize: "เลือกขนาดกางเกงใน",
    countryLabel: "ประเทศ", cityLabel: "เมือง",
    saveProfile: "บันทึกการอัปเดตโปรไฟล์",
    mediaUpload: "อัปโหลดสินค้า", mediaUploadHelp: "เลือกรูปภาพสำหรับสินค้าของคุณ รูปจะถูกบันทึกในเซสชันปัจจุบัน",
    imagePreview: "ตัวอย่างรูปภาพ", createDraft: "สร้างรายการ", inbox: "กล่องข้อความผู้ขาย",
    liveUpdates: "อัปเดตสด", conversations: "บทสนทนา", noMessages: "ยังไม่มีข้อความ",
    customerConversation: "บทสนทนาลูกค้า", chattingWith: "กำลังแชทกับ", unknownBuyer: "ผู้ซื้อที่ไม่ทราบชื่อ", selectConversation: "เลือกบทสนทนาเพื่อตอบกลับ",
    replyPlaceholder: "ตอบกลับผู้ซื้อ", reply: "ตอบกลับ", createFeedPost: "สร้างโพสต์เรื่องราว",
    createFeedPostHelp: "แชร์โพสต์ไลฟ์สไตล์ในเรื่องราวสาธารณะของคุณเพื่อให้ผู้ซื้อรู้จักแบรนด์มากขึ้น",
    captionPlaceholder: "เขียนแคปชันเกี่ยวกับวันของคุณ อารมณ์ หรือสไตล์...",
    postImagePreview: "ตัวอย่างรูปโพสต์", posting: "กำลังโพสต์...", postToFeed: "โพสต์ไปยังเรื่องราว",
    yourFeedPosts: "โพสต์เรื่องราวของคุณ", noPosts: "คุณยังไม่มีโพสต์ สร้างโพสต์แรกด้านบนได้เลย",
    noCaption: "ไม่มีแคปชัน", noImage: "ไม่มีรูปภาพ", notifications: "การแจ้งเตือน",
    markAllRead: "อ่านทั้งหมด", noNotifications: "ไม่มีการแจ้งเตือน", listingLibrary: "คลังรายการสินค้า",
    items: "รายการ", noAsset: "ไม่มีไฟล์", worn: "สวมใส่", notSpecified: "ไม่ระบุ",
    publish: "เผยแพร่", viewListing: "ดูรายการ", editListing: "แก้ไข", cancelEditListing: "ยกเลิกการแก้ไข", updateListing: "อัปเดตรายการ", creatingListing: "กำลังสร้าง...", updatingListing: "กำลังอัปเดต...", editingLabel: "กำลังแก้ไข", delete: "ลบ", deleting: "กำลังลบ...",
    feedEyebrow: "เรื่องราว", feedTitle: "เรื่องราว",
    feedSubtitle: "ดูโพสต์ไลฟ์สไตล์ เบื้องหลัง และอัปเดตประจำวันจากผู้ขาย",
    noFeedPosts: "ยังไม่มีเรื่องราว กลับมาตรวจสอบอีกครั้งเร็วๆ นี้",
    feedImage: "รูปเรื่องราว", whatBuyersWillSee: "สิ่งที่ผู้ซื้อจะเห็น (การ์ดโปรไฟล์)", whatBuyersWillSeeShort: "สิ่งที่ผู้ซื้อจะเห็น", removeImage: "ลบรูปภาพ", reportCount: "รายงาน",
    reasonInappropriate: "เนื้อหาไม่เหมาะสม", reasonHarassment: "คุกคามหรือกลั่นแกล้ง",
    reasonSpam: "สแปม", reasonImpersonation: "แอบอ้างตัวตน", reasonOther: "อื่นๆ",
    customReason: "เหตุผลเพิ่มเติม", report: "รายงาน", reporting: "กำลังรายงาน...", loadMorePosts: "โหลดโพสต์เพิ่มเติม",
    quickProfile: "โปรไฟล์", quickNewListing: "ลงสินค้าใหม่", quickInbox: "กล่องข้อความ", messagesTab: "ข้อความ", customRequestsTab: "คำขอพิเศษ", unreadChatsCount: "แชทยังไม่อ่าน", openRequestsCount: "คำขอที่เปิดอยู่", quickNewPost: "โพสต์ใหม่", quickListings: "รายการสินค้า",
    watchFeeds: "ดูเรื่องราว", barProfile: "โปรไฟล์บาร์", barFeedTab: "เรื่องราวบาร์",
    showTranslation: "แสดงคำแปล", showOriginal: "แสดงต้นฉบับ",
    addWalletReplyPrefix: "เติมอย่างน้อย", addWalletReplySuffix: "ลงในกระเป๋าเพื่อส่งข้อความตอบกลับ",
    languages: "ภาษา",
    barAffiliation: "การเชื่อมกับบาร์",
    barAffiliationHelp: "เมื่อเลือกบาร์จะสร้างคำขออนุมัติทันที การยกเลิกการเชื่อมจะมีผลทันที",
    applicationMessageLabel: "ข้อความสมัคร (ไม่บังคับ)",
    applicationMessagePlaceholder: "บอกบาร์เกี่ยวกับตัวคุณและเหตุผลที่อยากเข้าร่วม",
    uploadPhotosLabel: "อัปโหลดรูปภาพ (สูงสุด 4 รูป)",
    applicationPendingWith: "คำขอกำลังรอการอนุมัติจาก",
    pendingApplicationElsewhere: "คุณมีคำขอที่รออยู่กับบาร์อื่น กรุณายกเลิกก่อนสมัครที่อื่น",
    currentlyAffiliatedWith: "เชื่อมอยู่กับ",
    removeAffiliation: "ยกเลิกการเชื่อม",
    pendingBarRequests: "คำขอที่ส่งถึงบาร์ (รอดำเนินการ)",
    barInvitesAwaitingApproval: "คำเชิญจากบาร์ที่รอการอนุมัติ",
    cancel: "ยกเลิก",
    approve: "อนุมัติ",
    reject: "ปฏิเสธ",
    customRequests: "คำขอพิเศษ",
    requestsCount: "คำขอ",
    receivedLabel: "ได้รับ",
    sentLabel: "ส่งแล้ว",
    noCustomRequests: "ยังไม่มีคำขอพิเศษ",
    buyer: "ผู้ซื้อ",
    noEmail: "ไม่มีอีเมล",
    preferencesLabel: "ความต้องการ",
    shippingCountryLabel: "ประเทศปลายทาง",
    notProvided: "ไม่ได้ระบุ",
    noDetailsProvided: "ไม่มีรายละเอียด",
    buyerImageUploads: "การอัปโหลดรูปของผู้ซื้อ",
    buyerUploadsEnabled: "เปิดให้ผู้ซื้ออัปโหลดรูปแล้ว",
    buyerUploadsDisabled: "ปิดการอัปโหลดรูปของผู้ซื้อแล้ว",
    allowBuyerUploads: "อนุญาตให้ผู้ซื้ออัปโหลดรูป",
    buyerUploadsHelp: "ผู้ขายอัปโหลดรูปได้เสมอ ฝั่งผู้ซื้อจะถูกปิดไว้เป็นค่าเริ่มต้นจนกว่าจะเปิดที่นี่",
    priceProposal: "ข้อเสนอราคา",
    currentQuoteLabel: "ราคาที่เสนอปัจจุบัน",
    notProposedYet: "ยังไม่ได้เสนอราคา",
    buyerCounterLabel: "ราคาต่อรองจากผู้ซื้อ",
    lastNoteLabel: "หมายเหตุล่าสุด",
    quotePlaceholder: "ราคาเสนอ (บาท)",
    optionalNotePlaceholder: "หมายเหตุถึงผู้ซื้อ (ไม่บังคับ)",
    quoteSent: "ส่งข้อเสนอราคาแล้ว",
    sendQuote: "ส่งราคา",
    counterAccepted: "ยอมรับราคาต่อรองแล้ว ผู้ซื้อสามารถชำระเงินได้",
    acceptCounter: "ยอมรับการต่อรอง",
    counterDeclined: "ปฏิเสธการต่อรองแล้ว ข้อเสนอเดิมยังใช้งานอยู่",
    declineCounter: "ปฏิเสธการต่อรอง",
    noRepliesYet: "ยังไม่มีการตอบกลับ",
    customRequestAttachment: "ไฟล์แนบคำขอพิเศษ",
    replyToCustomRequest: "ตอบกลับคำขอนี้",
    send: "ส่ง",
    clearImages: "ล้างรูป",
    draftAttachment: "ไฟล์แนบแบบร่าง",
    awaitingBuyerPayment: "รอผู้ซื้อชำระเงิน",
    statusNone: "ไม่มี",
    statusProposed: "เสนอราคาแล้ว",
    statusCountered: "มีการต่อรอง",
    statusAccepted: "ยอมรับแล้ว",
    statusDeclined: "ปฏิเสธแล้ว",
    statusPaid: "ชำระแล้ว",
    statusExpired: "หมดอายุ",
    sellerDashboardEyebrow: "แดชบอร์ดผู้ขาย",
    sellerPresence: "สถานะผู้ขาย",
    online: "ออนไลน์",
    offline: "ออฟไลน์",
    feedVisibilityMode: "โหมดการมองเห็นเรื่องราว",
    publicAllPosts: "โพสต์สาธารณะทั้งหมด",
    privateAllPosts: "โพสต์ส่วนตัวทั้งหมด",
    chooseEachPost: "เลือกทีละโพสต์",
    presenceHelp: "สถานะออนไลน์/ออฟไลน์จะแสดงบนรายการสินค้าและโพสต์ของคุณ ใช้โหมดทั้งระบบหรือกำหนดทีละโพสต์",
    size: "ไซซ์",
    type: "ประเภท",
    fabric: "เนื้อผ้า",
    daysWorn: "จำนวนวันที่สวม",
    condition: "สภาพ",
    scentLevel: "ระดับกลิ่น",
    scheduleOptional: "ตั้งเวลา (ไม่บังคับ)",
    futureTimeOnly: "ตั้งเวลาในอนาคตเท่านั้น เว้นว่างเพื่อโพสต์ตอนนี้",
    postVisibility: "การมองเห็นโพสต์",
    controlledByFeedMode: "ควบคุมโดยโหมดเรื่องราว",
    privateUnlockPrice: "ราคาปลดล็อกโพสต์ส่วนตัว (THB)",
    lockedPosts: "โพสต์ล็อก",
    paidUnlocks: "การปลดล็อกแบบชำระเงิน",
    unlockRevenue: "รายได้จากการปลดล็อก",
    topPost: "โพสต์ยอดนิยม",
    earnings: "รายได้",
    grossEarnings: "รายได้รวม",
    grossEarningsHelp: "ก่อนหักส่วนแบ่งแพลตฟอร์ม/บาร์",
    netEarnings: "รายได้สุทธิ",
    netEarningsHelp: "ยอดที่เข้ากระเป๋าเงินของคุณ",
    scheduledPosts: "โพสต์ที่ตั้งเวลาไว้",
    likes: "ถูกใจ",
    engagement7Day: "การมีส่วนร่วม 7 วัน",
    trendVsPrevious7Day: "เทียบกับ 7 วันก่อนหน้า",
    privatePostPricingMode: "โหมดราคาของโพสต์ส่วนตัว",
    samePriceForAllPrivate: "ราคาเดียวสำหรับโพสต์ส่วนตัวทั้งหมด",
    individualPricePerPost: "ตั้งราคาแยกแต่ละโพสต์",
    bulkPriceForAllPrivate: "ราคาแบบรวมสำหรับโพสต์ส่วนตัวทั้งหมด",
    applyToAllPrivate: "ใช้กับทั้งหมด",
    individualModeHelp: "กำลังใช้โหมดรายโพสต์ ตั้งราคาแต่ละโพสต์ในรายการด้านล่าง",
    scheduledLabel: "ตั้งเวลา",
    unschedule: "ยกเลิกเวลา",
    publishNow: "เผยแพร่ทันที",
    chooseFile: "เลือกรูปไฟล์",
    chooseFiles: "เลือกหลายไฟล์",
    noFileChosen: "ยังไม่ได้เลือกไฟล์",
    tapToCover: "แตะรูปภาพเพื่อตั้งเป็นภาพปก",
    coverBadge: "ปก",
    filesSelected: "ไฟล์ที่เลือก",
    allLabel: "ทั้งหมด",
    unreadLabel: "ยังไม่อ่าน",
    messagesLabel: "ข้อความ",
    engagementLabel: "กิจกรรม",
    adminLabel: "แอดมิน",
    updateLabel: "อัปเดต",
    notificationDiscreetMode: "ข้อความแบบเป็นส่วนตัว",
    viewModeLabel: "มุมมอง",
    compactLabel: "กระชับ",
    comfortLabel: "สบายตา",
    onLabel: "เปิด",
    offLabel: "ปิด",
    discreetMessagesHelp: "ข้อความแบบเป็นส่วนตัวจะซ่อนถ้อยคำที่ละเอียดอ่อนในพรีวิวการแจ้งเตือน มุมมองช่วยสลับระหว่างการ์ดแบบอ่านสบาย (สบายตา) และแบบแน่นขึ้น (กระชับ).",
    emailNotifications: "การแจ้งเตือนอีเมล",
    browserNotifications: "การแจ้งเตือนเบราว์เซอร์",
    pushNotSupported: "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบพุช",
    pushBlockedEnableSettings: "เบราว์เซอร์บล็อกการแจ้งเตือนอยู่ โปรดเปิดใช้งานในการตั้งค่าเบราว์เซอร์",
    markRead: "ทำเครื่องหมายว่าอ่านแล้ว",
    openThread: "เปิดบทสนทนา",
    appealNow: "ยื่นอุทธรณ์",
    newBuyerMessagesWaiting: "มีข้อความใหม่จากผู้ซื้อ",
    youHave: "คุณมี",
    openInboxReplyQuickly: "เปิดกล่องข้อความเพื่อตอบได้ทันที",
    viewUnreadMessages: "ดูข้อความที่ยังไม่อ่าน",
    quickActionsLabel: "ทางลัดด่วน",
    quickActionsHelp: "ใช้ปุ่มลัดเหล่านี้เพื่อโพสต์สินค้า ตอบกลับเร็ว และจัดการงานที่เข้ามา",
    openMessages: "เปิดข้อความ",
    sellerOrdersTitle: "จัดส่งคำสั่งซื้อ",
    sellerOrdersHelp: "คำสั่งซื้อที่มีสินค้าของคุณ เพิ่มหมายเลขติดตามและอัปเดตสถานะ",
    sellerOrdersHelpAffiliated: "บาร์ของคุณดูแลการจัดส่ง ข้อมูลการติดตามจะแสดงที่นี่เมื่อเพิ่มแล้ว",
    noSellerOrders: "ยังไม่มีคำสั่งซื้อสำหรับสินค้าของคุณ",
    shipTo: "จัดส่งไปยัง",
    fulfillmentStatus: "สถานะการจัดส่ง",
    trackingCode: "รหัสติดตาม",
    carrier: "ผู้ให้บริการขนส่ง",
    saveShipment: "บันทึกการจัดส่ง",
    saving: "กำลังบันทึก...",
    shipmentControlsNote: "ควบคุมการจัดส่งได้หลังจากชำระเงินแล้ว",
    loginCredentialsTitle: "ข้อมูลเข้าสู่ระบบ",
    loginCredentialsSubtitle: "เปลี่ยนชื่อ อีเมล หรือรหัสผ่าน",
    credentialsHelp: "เปลี่ยนชื่อที่แสดงได้อย่างอิสระ หากต้องการเปลี่ยนอีเมลหรือรหัสผ่าน ให้ใส่รหัสผ่านปัจจุบันเพื่อยืนยัน",
    displayNamePlaceholder: "ชื่อที่แสดงใหม่",
    currentPasswordPlaceholder: "รหัสผ่านปัจจุบัน",
    newEmailPlaceholder: "อีเมลใหม่",
    newPasswordPlaceholder: "รหัสผ่านใหม่",
    confirmPasswordPlaceholder: "ยืนยันรหัสผ่าน",
    passwordPolicyHelp: "ใช้อย่างน้อย 8 ตัวอักษร พร้อมตัวเลข 1 ตัวและสัญลักษณ์ 1 ตัว",
    savingLabel: "กำลังบันทึก...",
    updateCredentials: "อัปเดตข้อมูลเข้าสู่ระบบ",
    sellerApplicationUnderReviewTitle: "ใบสมัครผู้ขายอยู่ระหว่างการตรวจสอบ",
    sellerApplicationUnderReviewHelp: "เราได้รับใบสมัครของคุณแล้วและกำลังตรวจสอบอยู่ ฟีเจอร์ผู้ขายจะเปิดใช้งานทันทีเมื่ออนุมัติ",
    submittedLabel: "ส่งเมื่อ",
    recentlyLabel: "เมื่อไม่นานนี้",
    typicalReviewTimeHelp: "เวลาตรวจสอบโดยทั่วไป: ภายใน 24-48 ชั่วโมง",
    contactSupport: "ติดต่อซัพพอร์ต",
    sellerApplicationRejectedTitle: "ใบสมัครผู้ขายถูกปฏิเสธ",
    sellerApplicationRejectedHelp: "ใบสมัครครั้งก่อนของคุณไม่ได้รับการอนุมัติ โปรดอัปเดตรายละเอียดและส่งสมัครใหม่",
    reapplyAsSeller: "สมัครผู้ขายใหม่",
    sellerLoginRequiredHelp: "โปรดเข้าสู่ระบบด้วยบัญชีผู้ขายเพื่อดำเนินการต่อ",
    goToLogin: "ไปหน้าเข้าสู่ระบบ",
    accountFrozenAfterStrikes: "บัญชีถูกระงับหลังได้รับการเตือนจากการดูแล 2 ครั้ง",
    moderationStrikesOnAccount: "จำนวนการเตือนการดูแลบัญชี",
    sellerAccountFrozenAppealHelp: "บัญชีผู้ขายของคุณถูกระงับ โปรดยื่นอุทธรณ์เพื่อขอให้ตรวจสอบ",
    reviewStrikesAndAppealHelp: "โปรดตรวจสอบรายละเอียดการเตือน และยื่นอุทธรณ์หากต้องการให้แอดมินตรวจสอบ",
    openAppeals: "เปิดหน้าคำอุทธรณ์",
    closeLabel: "ปิด",
    openLabel: "เปิด",
    profileLabel: "โปรไฟล์",
    sellerProfileFallback: "โปรไฟล์ผู้ขาย",
    profileImageLabel: "รูปโปรไฟล์",
    sellerProfileImageFallback: "รูปโปรไฟล์ผู้ขาย",
    profileImageHelp: "หากไม่อัปโหลด ผู้ซื้อจะเห็นชื่อผู้ขายของคุณบนรูปเริ่มต้น",
    shippingScopeFixedHelp: "ขอบเขตการจัดส่งถูกกำหนดคงที่สำหรับผู้ขายทุกคน",
    setBuilderTitle: "ตัวสร้างเซ็ตสินค้า",
    setBuilderHelp: "สร้างสินค้าชุด (เช่น บรา + กางเกงใน, เสื้อ + กระโปรง หรือชุด 4 ชิ้น) โดยยังคงแสดงสินค้ารายชิ้นแยกกันได้",
    setBuilderNeedMore: "เพิ่มสินค้าอย่างน้อย 2 รายการเพื่อปลดล็อกตัวสร้างเซ็ต",
    cancelEdit: "ยกเลิกการแก้ไข",
    setTitleLabel: "ชื่อเซ็ต",
    setTitlePlaceholder: "ตัวอย่าง: เซ็ตบราคู่กางเกงใน",
    setDescriptionLabel: "คำอธิบายเซ็ต",
    setDescriptionPlaceholder: "อธิบายเซ็ตนี้ให้ผู้ซื้อ...",
    advancedSetOptions: "ตัวเลือกขั้นสูง",
    combinedSetPriceLabel: "ราคารวมเซ็ต (THB)",
    setPricePlaceholder: "ราคาเซ็ต",
    selectProductsToInclude: "เลือกสินค้าที่จะรวมในเซ็ต (2 ชิ้นขึ้นไป)",
    createIndividualProductsFirst: "ให้สร้างสินค้ารายชิ้นก่อน แล้วค่อยสร้างเซ็ตจากสินค้านั้น",
    setSaved: "บันทึกเซ็ตแล้ว",
    setSaveFailed: "ไม่สามารถบันทึกเซ็ตได้",
    updateSetProduct: "อัปเดตสินค้าเซ็ต",
    createSetProduct: "สร้างสินค้าเซ็ต",
    existingSetProducts: "สินค้าเซ็ตที่มีอยู่",
    editSet: "แก้ไขเซ็ต",
    noListingsYet: "ยังไม่มีรายการสินค้า",
    noListingsYetHelp: "สร้างรายการแรกของคุณเพื่อให้ผู้ซื้อค้นพบและทักข้อความได้",
    createFirstListing: "สร้างรายการแรกของคุณ",
    setBadgeLabel: "เซ็ต",
    soldLabel: "ขายแล้ว",
    draftStatusLabel: "ฉบับร่าง",
    includesLabel: "มี",
    unpublishLabel: "ยกเลิกเผยแพร่"
  },
  my: {
    sectionTitle: "သင့်စတိုးကို စီမံပါ", sectionSubtitle: "ပရိုဖိုင်ပြင်ဆင်ခြင်း၊ စာရင်းထုတ်ခြင်းနှင့် post များကို မျှဝေပါ",
    language: "ဘာသာစကား", loginRequired: "ရောင်းသူအကောင့်ဖြင့် ဝင်ရန်လိုအပ်သည်", profileChecklist: "ပရိုဖိုင်ပြည့်စုံမှု စစ်ဆေးစာရင်း",
    profileComplete: "ပရိုဖိုင် ပြည့်စုံပြီးဖြစ်သည်။ စာရင်းတင်နိုင်ပါသည်",
    profileDetails: "ပရိုဖိုင်အချက်အလက် (အများသုံးပြသ)", profileDetailsHint: "ဤအချက်အလက်သည် သင့်ပြည်သူ့ပရိုဖိုင်တွင် ပြသပြီး ဝယ်သူများ ရှာဖွေနိုင်ရန် ကူညီသည်", heightLabel: "အရပ်", weightLabel: "ကိုယ်အလေးချိန်", hairColorLabel: "ဆံပင်အရောင်", braSizeLabel: "ဘရာဆိုက်", thaiBraSizes: "ထိုင်းဆိုက် (စမ)", usBraSizes: "US ဆိုက်", thaiBraCupDifferenceHint: "ခွက် = ရင်ဘတ်ကွာဟချက် (စမ)", selectedUsSize: "US တူညီ:", pantySizeLabel: "ပန်တီဆိုက်", selectHairColor: "ဆံပင်အရောင်ရွေးပါ", selectBraSize: "ဘရာဆိုက်ရွေးပါ", selectPantySize: "ပန်တီဆိုက်ရွေးပါ",
    countryLabel: "နိုင်ငံ", cityLabel: "မြို့",
    saveProfile: "ပရိုဖိုင်ပြင်ဆင်ချက်များ သိမ်းမည်",
    mediaUpload: "ပစ္စည်း အပ်လုဒ်", mediaUploadHelp: "သင့်ပစ္စည်းအတွက် ပုံကိုရွေးပါ။ ပုံကို လက်ရှိ session တွင် သိမ်းဆည်းမည်",
    imagePreview: "ပုံကြိုတင်ကြည့်ရှုမှု", createDraft: "စာရင်းဖန်တီးမည်", inbox: "ရောင်းသူ စာဝင်ပုံး",
    liveUpdates: "တိုက်ရိုက်အပ်ဒိတ်", conversations: "စကားဝိုင်း", noMessages: "မက်ဆေ့ချ် မရှိသေးပါ",
    customerConversation: "ဝယ်သူနှင့် စကားဝိုင်း", chattingWith: "စကားပြောနေသူ", unknownBuyer: "ဝယ်သူအမည်မသိ", selectConversation: "ပြန်ရန် စကားဝိုင်းတစ်ခု ရွေးပါ",
    replyPlaceholder: "ဝယ်သူသို့ ပြန်စာရေးရန်", reply: "ပြန်ပို့မည်", createFeedPost: "stories post ဖန်တီးမည်",
    createFeedPostHelp: "သင့် public stories တွင် update မျှဝေပြီး ဝယ်သူများကို မိတ်ဆက်ပါ",
    captionPlaceholder: "သင့်နေ့စဉ်အကြောင်း၊ စိတ်နေစိတ်ထား သို့မဟုတ် စတိုင်ကို ရေးပါ...",
    postImagePreview: "post ပုံကြိုတင်ကြည့်ရှုမှု", posting: "တင်နေသည်...", postToFeed: "stories သို့တင်မည်",
    yourFeedPosts: "သင့် stories post များ", noPosts: "post မရှိသေးပါ။ အပေါ်တွင် ပထမဆုံး post တင်ပါ",
    noCaption: "စာတန်းမရှိ", noImage: "ပုံမရှိ", notifications: "အသိပေးချက်များ",
    markAllRead: "အားလုံးကို ဖတ်ပြီးအဖြစ် မှတ်ရန်", noNotifications: "အသိပေးချက်မရှိပါ",
    listingLibrary: "စာရင်းစာအုပ်", items: "ခု", noAsset: "ဖိုင်မရှိ", worn: "ဝတ်ထားသည့်ကာလ",
    notSpecified: "မသတ်မှတ်ထား", publish: "တင်မည်", viewListing: "စာရင်းကြည့်မည်", editListing: "တည်းဖြတ်", cancelEditListing: "တည်းဖြတ်ခြင်း ပယ်ဖျက်", updateListing: "စာရင်း အပ်ဒိတ်", creatingListing: "ဖန်တီးနေသည်...", updatingListing: "အပ်ဒိတ်လုပ်နေသည်...", editingLabel: "တည်းဖြတ်နေသည်", delete: "ဖျက်မည်", deleting: "ဖျက်နေသည်...",
    feedEyebrow: "stories", feedTitle: "stories",
    feedSubtitle: "seller post များ၊ နောက်ကွယ်ပုံများနှင့် နေ့စဉ် update များကို ကြည့်ရှုပါ",
    noFeedPosts: "stories မရှိသေးပါ။ နောက်ပိုင်းတွင် ပြန်စစ်ပါ",
    feedImage: "stories ပုံ", whatBuyersWillSee: "ဝယ်သူမြင်ရမည့်အရာ (ပရိုဖိုင်ကတ်)", whatBuyersWillSeeShort: "ဝယ်သူမြင်ရမည့်အရာ", removeImage: "ပုံဖယ်ရှားမည်", reportCount: "report",
    reasonInappropriate: "မသင့်လျော်သော အကြောင်းအရာ", reasonHarassment: "အနှောင့်အယှက် သို့မဟုတ် အနိုင်ကျင့်မှု",
    reasonSpam: "spam", reasonImpersonation: "အယောင်ဆောင်မှု", reasonOther: "အခြား",
    customReason: "စိတ်ကြိုက် အကြောင်းပြချက်", report: "report", reporting: "report လုပ်နေသည်...", loadMorePosts: "post များထပ်ဖွင့်မည်",
    quickProfile: "ပရိုဖိုင်", quickNewListing: "စာရင်းသစ်", quickInbox: "စာဝင်ပုံး", messagesTab: "မက်ဆေ့ချ်များ", customRequestsTab: "စိတ်ကြိုက်တောင်းဆိုချက်များ", unreadChatsCount: "မဖတ်ရသေးသော chat", openRequestsCount: "ဖွင့်ထားသော request များ", quickNewPost: "post အသစ်", quickListings: "စာရင်းများ",
    watchFeeds: "stories များကြည့်မည်", barProfile: "bar ပရိုဖိုင်", barFeedTab: "bar stories",
    showTranslation: "ဘာသာပြန်ကိုပြရန်", showOriginal: "မူရင်းကိုပြရန်",
    addWalletReplyPrefix: "အနည်းဆုံး", addWalletReplySuffix: "ကို wallet ထဲ ထည့်ပြီးမှ reply ပို့နိုင်ပါမည်။",
    languages: "ဘာသာစကားများ",
    barAffiliation: "bar ချိတ်ဆက်မှု",
    barAffiliationHelp: "bar ရွေးချယ်ပါက အတည်ပြုခွင့်ပြုရန် တောင်းဆိုချက် ပို့မည်။ ချိတ်ဆက်မှုဖယ်ရှားခြင်းသည် ချက်ချင်းအသက်ဝင်သည်",
    applicationMessageLabel: "လျှောက်လွှာ message (မလိုအပ်ပါ)",
    applicationMessagePlaceholder: "bar ကို သင့်အကြောင်းနှင့် ဝင်ချင်သော အကြောင်းရင်း ပြောပြပါ",
    uploadPhotosLabel: "ဓာတ်ပုံများတင်ပါ (၄ ခုအထိ)",
    applicationPendingWith: "လျှောက်လွှာ စောင့်နေသည်",
    pendingApplicationElsewhere: "အခြား bar တစ်ခုတွင် စောင့်နေသော လျှောက်လွှာရှိသည်။ အခြားနေရာ မလျှောက်ခင် ပယ်ဖျက်ပါ",
    currentlyAffiliatedWith: "လက်ရှိချိတ်ဆက်ထားသည်",
    removeAffiliation: "ချိတ်ဆက်မှုဖယ်ရှားရန်",
    pendingBarRequests: "bar များသို့ ပို့ထားသော တောင်းဆိုချက်များ",
    barInvitesAwaitingApproval: "သင်အတည်ပြုရန် စောင့်နေသော bar ဖိတ်ကြားချက်များ",
    cancel: "ပယ်ဖျက်မည်",
    approve: "အတည်ပြုမည်",
    reject: "ငြင်းပယ်မည်",
    customRequests: "စိတ်ကြိုက်တောင်းဆိုချက်များ",
    requestsCount: "တောင်းဆိုချက်",
    receivedLabel: "လက်ခံရရှိ",
    sentLabel: "ပို့ပြီး",
    noCustomRequests: "စိတ်ကြိုက်တောင်းဆိုချက် မရှိသေးပါ",
    buyer: "ဝယ်သူ",
    noEmail: "အီးမေးလ်မရှိ",
    preferencesLabel: "လိုလားချက်",
    shippingCountryLabel: "ပို့ဆောင်မည့်နိုင်ငံ",
    notProvided: "မဖော်ပြထား",
    noDetailsProvided: "အသေးစိတ်မရှိပါ",
    buyerImageUploads: "ဝယ်သူ၏ပုံအပ်လုဒ်",
    buyerUploadsEnabled: "ဝယ်သူပုံအပ်လုဒ်ကို ဖွင့်ပြီးပါပြီ",
    buyerUploadsDisabled: "ဝယ်သူပုံအပ်လုဒ်ကို ပိတ်ပြီးပါပြီ",
    allowBuyerUploads: "ဝယ်သူအား ပုံအပ်လုဒ်ခွင့်ပြုမည်",
    buyerUploadsHelp: "ရောင်းသူက ပုံကို အမြဲတမ်းတင်နိုင်သည်။ ဝယ်သူတင်ခြင်းကို ဒီနေရာမှာမဖွင့်မချင်း မူလအတိုင်း ပိတ်ထားသည်",
    priceProposal: "စျေးနှုန်းအဆိုပြု",
    currentQuoteLabel: "လက်ရှိအဆိုပြုစျေး",
    notProposedYet: "မအဆိုပြုရသေးပါ",
    buyerCounterLabel: "ဝယ်သူပြန်ညှိစျေး",
    lastNoteLabel: "နောက်ဆုံးမှတ်ချက်",
    quotePlaceholder: "အဆိုပြုစျေး (THB)",
    optionalNotePlaceholder: "ဝယ်သူသို့ မှတ်ချက် (optional)",
    quoteSent: "အဆိုပြုစျေးပို့ပြီးပါပြီ",
    sendQuote: "စျေးပို့မည်",
    counterAccepted: "ပြန်ညှိစျေးလက်ခံပြီး ဝယ်သူသည် ယခုပေးချေနိုင်ပါသည်",
    acceptCounter: "ပြန်ညှိစျေးလက်ခံမည်",
    counterDeclined: "ပြန်ညှိစျေးကို ငြင်းပယ်ပြီး မူလအဆိုပြုစျေး ဆက်လက်အသက်ဝင်သည်",
    declineCounter: "ပြန်ညှိစျေးငြင်းပယ်မည်",
    noRepliesYet: "ပြန်စာမရှိသေးပါ",
    customRequestAttachment: "စိတ်ကြိုက်တောင်းဆိုချက် ပူးတွဲဖိုင်",
    replyToCustomRequest: "ဤတောင်းဆိုချက်ကို ပြန်စာရေးပါ",
    send: "ပို့မည်",
    clearImages: "ပုံဖျက်မည်",
    draftAttachment: "မူကြမ်းပူးတွဲဖိုင်",
    awaitingBuyerPayment: "ဝယ်သူပေးချေမှု စောင့်နေသည်",
    statusNone: "မရှိ",
    statusProposed: "အဆိုပြုထားသည်",
    statusCountered: "ပြန်ညှိထားသည်",
    statusAccepted: "လက်ခံပြီး",
    statusDeclined: "ငြင်းပယ်ပြီး",
    statusPaid: "ပေးချေပြီး",
    statusExpired: "သက်တမ်းကုန်",
    sellerDashboardEyebrow: "seller dashboard",
    sellerPresence: "seller အခြေအနေ",
    online: "အွန်လိုင်း",
    offline: "အော့ဖ်လိုင်း",
    feedVisibilityMode: "stories မြင်နိုင်မှုမုဒ်",
    publicAllPosts: "post အားလုံး public",
    privateAllPosts: "post အားလုံး private",
    chooseEachPost: "post တစ်ခုချင်းရွေးမည်",
    presenceHelp: "online/offline အခြေအနေကို သင့်စာရင်းနှင့် post များတွင်ပြမည်။ global mode သို့မဟုတ် post တစ်ခုချင်း သတ်မှတ်နိုင်သည်",
    size: "အရွယ်အစား",
    type: "အမျိုးအစား",
    fabric: "အထည်",
    daysWorn: "ဝတ်ထားသည့်ရက်",
    condition: "အခြေအနေ",
    scentLevel: "အနံ့အဆင့်",
    scheduleOptional: "အချိန်ဇယား (ရွေးချယ်နိုင်)",
    futureTimeOnly: "အနာဂတ်အချိန်ကိုသာ ရွေးပါ။ ယခုပဲတင်လိုပါက ကွက်လပ်ထားပါ",
    postVisibility: "post မြင်နိုင်မှု",
    controlledByFeedMode: "stories mode ဖြင့် ထိန်းချုပ်သည်",
    privateUnlockPrice: "private unlock စျေး (THB)",
    lockedPosts: "locked post များ",
    paidUnlocks: "ငွေပေး unlock များ",
    unlockRevenue: "unlock ဝင်ငွေ",
    topPost: "ထိပ်တန်း post",
    earnings: "ဝင်ငွေ",
    grossEarnings: "စုစုပေါင်းဝင်ငွေ",
    grossEarningsHelp: "platform/bar fee ခွဲဝေမတိုင်မီ",
    netEarnings: "စစ်ဝင်ငွေ",
    netEarningsHelp: "သင့် wallet သို့ ထည့်သွင်းသောပမာဏ",
    scheduledPosts: "အချိန်ဇယားတင်ထားသော post များ",
    likes: "ကြိုက်နှစ်သက်မှု",
    engagement7Day: "၇ ရက်အတွင်း engagement",
    trendVsPrevious7Day: "မတိုင်မီ ၇ ရက်နှင့် နှိုင်းယှဉ်ချက်",
    privatePostPricingMode: "private post ဈေးနှုန်းမုဒ်",
    samePriceForAllPrivate: "private post အားလုံး တူညီဈေး",
    individualPricePerPost: "post တစ်ခုချင်းဈေး",
    bulkPriceForAllPrivate: "private post အားလုံးအတွက် bulk ဈေး",
    applyToAllPrivate: "အားလုံးသို့ သတ်မှတ်မည်",
    individualModeHelp: "individual mode အသုံးပြုနေသည်။ အောက်တွင် post တစ်ခုချင်းဈေး သတ်မှတ်ပါ",
    scheduledLabel: "စီစဉ်ထားသည်",
    unschedule: "အချိန်ဇယားဖျက်မည်",
    publishNow: "ယခုပဲ တင်မည်",
    chooseFile: "ဖိုင်ရွေးမည်",
    chooseFiles: "ဖိုင်များရွေးမည်",
    noFileChosen: "ဖိုင်မရွေးရသေးပါ",
    tapToCover: "cover photo အဖြစ်သတ်မှတ်ရန် ပုံကိုနှိပ်ပါ",
    coverBadge: "မျက်နှာဖုံး",
    filesSelected: "ဖိုင်ရွေးထားသည်",
    allLabel: "အားလုံး",
    unreadLabel: "မဖတ်ရသေး",
    messagesLabel: "မက်ဆေ့ချ်များ",
    engagementLabel: "လှုပ်ရှားမှု",
    adminLabel: "အက်မင်",
    updateLabel: "အပ်ဒိတ်",
    notificationDiscreetMode: "လျှို့ဝှက် မက်ဆေ့ချ်",
    viewModeLabel: "မြင်ကွင်း",
    compactLabel: "ကျစ်လစ်",
    comfortLabel: "ဖတ်ရလွယ်",
    onLabel: "ဖွင့်",
    offLabel: "ပိတ်",
    discreetMessagesHelp: "လျှို့ဝှက် မက်ဆေ့ချ် ကိုဖွင့်ထားလျှင် အသိပေးချက် preview တွင် အာရုံခံစာသားများကို ဖုံးကွယ်ပေးသည်။ View သည် ဖတ်ရလွယ် (Comfort) နှင့် ကျစ်လစ် (Compact) ကိုပြောင်းနိုင်သည်။",
    emailNotifications: "အီးမေးလ် အသိပေးချက်",
    browserNotifications: "ဘရောက်ဇာ အသိပေးချက်",
    pushNotSupported: "ဤဘရောက်ဇာတွင် push notification မပံ့ပိုးပါ",
    pushBlockedEnableSettings: "ဘရောက်ဇာ notification များကို ပိတ်ထားသည်။ ဘရောက်ဇာ setting တွင် ဖွင့်ပေးပါ",
    markRead: "ဖတ်ပြီးဟုမှတ်မည်",
    openThread: "စကားဝိုင်းဖွင့်မည်",
    appealNow: "အယူခံတင်မည်",
    newBuyerMessagesWaiting: "ဝယ်သူအသစ်မက်ဆေ့ချ်များ ရှိနေသည်",
    youHave: "သင့်တွင်",
    openInboxReplyQuickly: "မြန်မြန်ပြန်ရန် inbox ကိုဖွင့်ပါ",
    viewUnreadMessages: "မဖတ်ရသေးသော မက်ဆေ့ချ်များကြည့်မည်",
    quickActionsLabel: "အမြန်လုပ်ဆောင်ချက်များ",
    quickActionsHelp: "စာရင်းတင်ခြင်း၊ မြန်မြန်ပြန်ခြင်းနှင့် ဝင်လာသောအလုပ်များကို စီမံရန် shortcut များ",
    openMessages: "မက်ဆေ့ချ်ဖွင့်မည်",
    sellerOrdersTitle: "အော်ဒါ ပို့ဆောင်မှု",
    sellerOrdersHelp: "သင့်ပစ္စည်းပါဝင်သော အော်ဒါများ။ tracking number ထည့်ပြီး အခြေအနေ update လုပ်ပါ",
    sellerOrdersHelpAffiliated: "သင့်ဘားက ပို့ဆောင်မှုကို စီစဉ်ပေးပါသည်။ tracking info ထည့်ပြီးသောအခါ ဤနေရာတွင် ပေါ်လာပါမည်",
    noSellerOrders: "သင့်ပစ္စည်းများအတွက် အော်ဒါ မရှိသေးပါ",
    shipTo: "ပို့ဆောင်ရန်",
    fulfillmentStatus: "ပို့ဆောင်မှုအခြေအနေ",
    trackingCode: "tracking code",
    carrier: "ပို့ဆောင်သူ",
    saveShipment: "ပို့ဆောင်မှု သိမ်းမည်",
    saving: "သိမ်းနေသည်...",
    shipmentControlsNote: "ငွေပေးချေပြီးမှ ပို့ဆောင်မှု ထိန်းချုပ်ခွင့် ရရှိမည်",
    loginCredentialsTitle: "ဝင်ရောက်မှု အချက်အလက်",
    loginCredentialsSubtitle: "အမည်၊ email သို့မဟုတ် password ပြောင်းပါ",
    credentialsHelp: "ပြသမည့်အမည်ကို လွတ်လပ်စွာ ပြောင်းလဲနိုင်သည်။ email သို့မဟုတ် password ပြောင်းရန် လက်ရှိ password ထည့်ပြီး အတည်ပြုပါ",
    displayNamePlaceholder: "ပြသမည့်အမည်အသစ်",
    currentPasswordPlaceholder: "လက်ရှိ password",
    newEmailPlaceholder: "email အသစ်",
    newPasswordPlaceholder: "password အသစ်",
    confirmPasswordPlaceholder: "password အတည်ပြု",
    passwordPolicyHelp: "အနည်းဆုံး စာလုံး 8 လုံး၊ နံပါတ် 1 လုံးနှင့် သင်္ကေတ 1 လုံး ပါဝင်ရမည်",
    savingLabel: "သိမ်းနေသည်...",
    updateCredentials: "ဝင်ရောက်မှုအချက်အလက် အပ်ဒိတ်",
    sellerApplicationUnderReviewTitle: "ရောင်းသူလျှောက်လွှာ စိစစ်နေသည်",
    sellerApplicationUnderReviewHelp: "သင့်လျှောက်လွှာကို လက်ခံရရှိပြီး စိစစ်နေပါသည်။ အတည်ပြုပြီးသည်နှင့် seller tools ဖွင့်ပေးမည်။",
    submittedLabel: "တင်သွင်းချိန်",
    recentlyLabel: "မကြာသေးမီ",
    typicalReviewTimeHelp: "ပုံမှန်စိစစ်ချိန်: 24-48 နာရီအတွင်း",
    contactSupport: "အကူအညီကို ဆက်သွယ်ရန်",
    sellerApplicationRejectedTitle: "ရောင်းသူလျှောက်လွှာ ပယ်ချခံရသည်",
    sellerApplicationRejectedHelp: "ယခင်လျှောက်လွှာကို အတည်မပြုခဲ့ပါ။ အသေးစိတ်ပြင်ဆင်ပြီး ပြန်လည်လျှောက်ထားပါ။",
    reapplyAsSeller: "Seller အဖြစ် ပြန်လည်လျှောက်ထားရန်",
    sellerLoginRequiredHelp: "ဆက်လုပ်ရန် seller အကောင့်ဖြင့် ဝင်ရောက်ပါ။",
    goToLogin: "ဝင်ရောက်ရန် သွားမည်",
    accountFrozenAfterStrikes: "moderation strike 2 ကြိမ်ပြီးနောက် အကောင့်ပိတ်ထားသည်",
    moderationStrikesOnAccount: "အကောင့်ရှိ moderation strikes",
    sellerAccountFrozenAppealHelp: "သင့် seller အကောင့်ပိတ်ထားသည်။ ပြန်လည်စိစစ်ရန် appeal တင်ပါ။",
    reviewStrikesAndAppealHelp: "strike အသေးစိတ်ကို စစ်ဆေးပြီး admin စိစစ်လိုပါက appeal တင်ပါ။",
    openAppeals: "Appeals ဖွင့်မည်",
    closeLabel: "ပိတ်",
    openLabel: "ဖွင့်",
    profileLabel: "ပရိုဖိုင်",
    sellerProfileFallback: "seller ပရိုဖိုင်",
    profileImageLabel: "ပရိုဖိုင်ပုံ",
    sellerProfileImageFallback: "seller ပရိုဖိုင်ပုံ",
    profileImageHelp: "ဤနေရာကိုကျော်ခဲ့လျှင် ဝယ်သူများသည် မူလပုံပေါ်တွင် သင့် seller နာမည်ကိုမြင်ရမည်။",
    shippingScopeFixedHelp: "shipping scope ကို seller အားလုံးအတွက် တစ်မျိုးတည်း သတ်မှတ်ထားသည်။",
    setBuilderTitle: "Set builder",
    setBuilderHelp: "ပစ္စည်းတစ်ခုချင်းစာရင်းကို ထိန်းထားပြီး combo set များ (ဥပမာ bra + panties, top + skirt, 4-piece sets) ဖန်တီးနိုင်သည်။",
    setBuilderNeedMore: "Set builder ကိုဖွင့်ရန် အနည်းဆုံး စာရင်း ၂ ခု ထည့်ပါ။",
    cancelEdit: "တည်းဖြတ်ခြင်း ပယ်ဖျက်",
    setTitleLabel: "Set ခေါင်းစဉ်",
    setTitlePlaceholder: "ဥပမာ: Bra + Panty Matching Set",
    setDescriptionLabel: "Set ဖော်ပြချက်",
    setDescriptionPlaceholder: "ဝယ်သူများအတွက် ဤ set ကိုဖော်ပြပါ...",
    advancedSetOptions: "အဆင့်မြင့်ရွေးချယ်မှုများ",
    combinedSetPriceLabel: "Set စုပေါင်းဈေး (THB)",
    setPricePlaceholder: "Set ဈေး",
    selectProductsToInclude: "ထည့်မည့်ပစ္စည်းများရွေးပါ (2 ခုနှင့်အထက်)",
    createIndividualProductsFirst: "ပထမဦးစွာ တစ်ခုချင်းပစ္စည်းများဖန်တီးပြီးနောက် set တည်ဆောက်ပါ။",
    setSaved: "Set သိမ်းပြီးပါပြီ။",
    setSaveFailed: "Set ကို မသိမ်းနိုင်ပါ။",
    updateSetProduct: "Set product ကို အပ်ဒိတ်",
    createSetProduct: "Set product ဖန်တီးရန်",
    existingSetProducts: "ရှိပြီးသော set products",
    editSet: "Set တည်းဖြတ်",
    noListingsYet: "စာရင်းမရှိသေးပါ။",
    noListingsYetHelp: "ဝယ်သူများရှာတွေ့ပြီး message ပို့နိုင်ရန် ပထမစာရင်းကို ဖန်တီးပါ။",
    createFirstListing: "ပထမစာရင်း ဖန်တီးရန်",
    setBadgeLabel: "Set",
    soldLabel: "ရောင်းပြီး",
    draftStatusLabel: "Draft",
    includesLabel: "ပါဝင်သည်",
    unpublishLabel: "Unpublish"
  },
  ru: {
    sectionTitle: "Управление витриной", sectionSubtitle: "Обновляйте профиль, публикуйте объявления и делитесь постами.",
    language: "Язык", loginRequired: "Требуется вход продавца", profileChecklist: "Проверка заполнения профиля",
    profileComplete: "Профиль заполнен. Вы можете публиковать объявления.",
    profileDetails: "Детали профиля (показываются публично)", profileDetailsHint: "Эта информация отображается в вашем публичном профиле и помогает покупателям вас найти.", heightLabel: "Рост", weightLabel: "Вес", hairColorLabel: "Цвет волос", braSizeLabel: "Размер бюстгальтера", thaiBraSizes: "Тайские размеры (см)", usBraSizes: "Размеры US", thaiBraCupDifferenceHint: "Чашка = разница обхвата груди (см)", selectedUsSize: "Аналог US:", pantySizeLabel: "Размер трусиков", selectHairColor: "Выберите цвет волос", selectBraSize: "Выберите размер бюстгальтера", selectPantySize: "Выберите размер трусиков",
    countryLabel: "Страна", cityLabel: "Город",
    saveProfile: "Сохранить профиль",
    mediaUpload: "Загрузка товара", mediaUploadHelp: "Выберите изображение для объявления. Файлы сохраняются в текущей сессии.",
    imagePreview: "Предпросмотр изображения", createDraft: "Создать объявление", inbox: "Входящие продавца",
    liveUpdates: "Онлайн-обновления", conversations: "диалог(ов)", noMessages: "Сообщений пока нет.",
    customerConversation: "Диалог с покупателем", chattingWith: "Чат с", unknownBuyer: "Неизвестный покупатель", selectConversation: "Выберите диалог для ответа",
    replyPlaceholder: "Ответ покупателю", reply: "Ответить", createFeedPost: "Создать пост в истории",
    createFeedPostHelp: "Публикуйте обновления в историях, чтобы покупатели узнавали ваш бренд.",
    captionPlaceholder: "Напишите подпись к посту...",
    postImagePreview: "Предпросмотр поста", posting: "Публикация...", postToFeed: "Опубликовать в истории",
    yourFeedPosts: "Ваши посты в историях", noPosts: "Постов пока нет. Создайте первый пост выше.",
    noCaption: "Подпись не добавлена.", noImage: "Нет изображения", notifications: "Уведомления",
    markAllRead: "Отметить все прочитанным", noNotifications: "Нет уведомлений.",
    listingLibrary: "Библиотека объявлений", items: "шт.", noAsset: "Нет файла", worn: "Ношение",
    notSpecified: "Не указано", publish: "Опубликовать", viewListing: "Открыть объявление", editListing: "Редактировать", cancelEditListing: "Отменить редактирование", updateListing: "Обновить объявление", creatingListing: "Создание...", updatingListing: "Обновление...", editingLabel: "Редактируется", delete: "Удалить", deleting: "Удаление...",
    feedEyebrow: "Истории", feedTitle: "Истории",
    feedSubtitle: "Смотрите посты продавцов, закулисные фото и ежедневные обновления.",
    noFeedPosts: "Историй пока нет. Загляните позже.",
    feedImage: "Фото истории", whatBuyersWillSee: "Что увидят покупатели (карточка профиля)", whatBuyersWillSeeShort: "Что увидят покупатели", removeImage: "Удалить изображение", reportCount: "жалоб(ы)",
    reasonInappropriate: "Неприемлемый контент", reasonHarassment: "Оскорбления или травля",
    reasonSpam: "Спам", reasonImpersonation: "Выдача себя за другого", reasonOther: "Другое",
    customReason: "Своя причина", report: "Пожаловаться", reporting: "Отправка...", loadMorePosts: "Загрузить еще",
    quickProfile: "Профиль", quickNewListing: "Новое объявление", quickInbox: "Входящие", messagesTab: "Сообщения", customRequestsTab: "Индивидуальные запросы", unreadChatsCount: "Непрочитанные чаты", openRequestsCount: "Открытые запросы", quickNewPost: "Новый пост", quickListings: "Объявления",
    watchFeeds: "Смотреть истории", barProfile: "Профиль бара", barFeedTab: "Истории бара",
    showTranslation: "Показать перевод", showOriginal: "Показать оригинал",
    addWalletReplyPrefix: "Добавьте минимум", addWalletReplySuffix: "в кошелек, чтобы ответить.",
    languages: "Языки",
    barAffiliation: "Привязка к бару",
    barAffiliationHelp: "При выборе бара создается запрос на одобрение. Удаление привязки применяется сразу.",
    applicationMessageLabel: "Сообщение к заявке (необязательно)",
    applicationMessagePlaceholder: "Расскажите бару о себе и почему хотите присоединиться.",
    uploadPhotosLabel: "Загрузить фото (до 4)",
    applicationPendingWith: "Заявка ожидает рассмотрения",
    pendingApplicationElsewhere: "У вас есть заявка в другой бар. Отмените ее, чтобы подать новую.",
    currentlyAffiliatedWith: "Сейчас привязан к",
    removeAffiliation: "Убрать привязку",
    pendingBarRequests: "Ожидающие запросы в бары",
    barInvitesAwaitingApproval: "Приглашения от баров, ожидающие вашего одобрения",
    cancel: "Отменить",
    approve: "Одобрить",
    reject: "Отклонить",
    customRequests: "Индивидуальные запросы",
    requestsCount: "запрос(ов)",
    receivedLabel: "Получено",
    sentLabel: "Отправлено",
    noCustomRequests: "Пока нет индивидуальных запросов.",
    buyer: "Покупатель",
    noEmail: "Нет email",
    preferencesLabel: "Пожелания",
    shippingCountryLabel: "Страна доставки",
    notProvided: "Не указано",
    noDetailsProvided: "Детали не указаны.",
    buyerImageUploads: "Загрузка фото покупателем",
    buyerUploadsEnabled: "Загрузка фото покупателем включена.",
    buyerUploadsDisabled: "Загрузка фото покупателем отключена.",
    allowBuyerUploads: "Разрешить покупателю загружать фото",
    buyerUploadsHelp: "Продавец всегда может загружать фото. Загрузка покупателем по умолчанию отключена, пока не включите здесь.",
    priceProposal: "Предложение цены",
    currentQuoteLabel: "Текущая цена",
    notProposedYet: "Пока не предложена",
    buyerCounterLabel: "Встречная цена покупателя",
    lastNoteLabel: "Последняя заметка",
    quotePlaceholder: "Цена (THB)",
    optionalNotePlaceholder: "Комментарий покупателю (необязательно)",
    quoteSent: "Предложение отправлено.",
    sendQuote: "Отправить цену",
    counterAccepted: "Встречная цена принята. Покупатель может оплатить.",
    acceptCounter: "Принять встречную цену",
    counterDeclined: "Встречная цена отклонена. Текущая цена остается активной.",
    declineCounter: "Отклонить встречную цену",
    noRepliesYet: "Ответов пока нет.",
    customRequestAttachment: "Вложение запроса",
    replyToCustomRequest: "Ответить по этому запросу",
    send: "Отправить",
    clearImages: "Очистить фото",
    draftAttachment: "Черновое вложение",
    awaitingBuyerPayment: "ожидает оплату покупателя",
    statusNone: "нет",
    statusProposed: "предложено",
    statusCountered: "встречное предложение",
    statusAccepted: "принято",
    statusDeclined: "отклонено",
    statusPaid: "оплачено",
    statusExpired: "истекло",
    sellerDashboardEyebrow: "Панель продавца",
    sellerPresence: "Статус продавца",
    online: "Онлайн",
    offline: "Оффлайн",
    feedVisibilityMode: "Режим видимости историй",
    publicAllPosts: "Все посты публичные",
    privateAllPosts: "Все посты приватные",
    chooseEachPost: "Выбирать для каждого поста",
    presenceHelp: "Статус онлайн/оффлайн отображается в ваших объявлениях и постах. Используйте общий режим или настройку для каждого поста.",
    size: "Размер",
    type: "Тип",
    fabric: "Ткань",
    daysWorn: "Дней ношения",
    condition: "Состояние",
    scentLevel: "Уровень запаха",
    scheduleOptional: "Расписание (необязательно)",
    futureTimeOnly: "Только будущее время. Оставьте пустым, чтобы опубликовать сейчас.",
    postVisibility: "Видимость поста",
    controlledByFeedMode: "Управляется режимом историй",
    privateUnlockPrice: "Цена разблокировки приватного поста (THB)",
    lockedPosts: "Закрытые посты",
    paidUnlocks: "Платные разблокировки",
    unlockRevenue: "Доход от разблокировок",
    topPost: "Топ-пост",
    earnings: "Доход",
    grossEarnings: "Валовый доход",
    grossEarningsHelp: "До распределения комиссии платформы/бара.",
    netEarnings: "Чистый доход",
    netEarningsHelp: "Сумма, зачисленная в ваш кошелек.",
    scheduledPosts: "Запланированные посты",
    likes: "Лайки",
    engagement7Day: "Вовлеченность за 7 дней",
    trendVsPrevious7Day: "Тренд к предыдущим 7 дням",
    privatePostPricingMode: "Режим цены приватных постов",
    samePriceForAllPrivate: "Одинаковая цена для всех приватных постов",
    individualPricePerPost: "Отдельная цена для каждого поста",
    bulkPriceForAllPrivate: "Общая цена для всех приватных постов",
    applyToAllPrivate: "Применить ко всем",
    individualModeHelp: "Включен индивидуальный режим. Укажите цену для каждого приватного поста ниже",
    scheduledLabel: "Запланирован",
    unschedule: "Отменить расписание",
    publishNow: "Опубликовать сейчас",
    chooseFile: "Выбрать файл",
    chooseFiles: "Выбрать файлы",
    noFileChosen: "Файл не выбран",
    tapToCover: "Нажмите на изображение, чтобы установить его как обложку.",
    coverBadge: "Обложка",
    filesSelected: "файл(ов) выбрано",
    allLabel: "Все",
    unreadLabel: "Непрочитано",
    messagesLabel: "Сообщения",
    engagementLabel: "Активность",
    adminLabel: "Админ",
    updateLabel: "Обновление",
    notificationDiscreetMode: "Дискретные сообщения",
    viewModeLabel: "Вид",
    compactLabel: "Компактный",
    comfortLabel: "Комфортный",
    onLabel: "Вкл",
    offLabel: "Выкл",
    discreetMessagesHelp: "Дискретные сообщения скрывают чувствительные формулировки в превью уведомлений. Вид переключает между более просторными карточками (Комфортный) и плотными строками (Компактный).",
    emailNotifications: "Email-уведомления",
    browserNotifications: "Уведомления браузера",
    pushNotSupported: "Push-уведомления не поддерживаются этим браузером.",
    pushBlockedEnableSettings: "Уведомления браузера заблокированы. Включите их в настройках браузера.",
    markRead: "Отметить прочитанным",
    openThread: "Открыть диалог",
    appealNow: "Подать апелляцию",
    newBuyerMessagesWaiting: "Есть новые сообщения от покупателей",
    youHave: "У вас",
    openInboxReplyQuickly: "Откройте входящие, чтобы ответить быстрее.",
    viewUnreadMessages: "Смотреть непрочитанные",
    quickActionsLabel: "Быстрые действия",
    quickActionsHelp: "Используйте эти кнопки для публикации объявлений, быстрых ответов и управления входящими задачами.",
    openMessages: "Открыть сообщения",
    sellerOrdersTitle: "Отправка заказов",
    sellerOrdersHelp: "Заказы с вашими товарами. Добавляйте трек-номера и обновляйте статус.",
    sellerOrdersHelpAffiliated: "Ваш бар занимается доставкой. Информация о трекинге появится здесь после добавления.",
    noSellerOrders: "Заказов на ваши товары пока нет.",
    shipTo: "Доставить",
    fulfillmentStatus: "Статус выполнения",
    trackingCode: "Трек-номер",
    carrier: "Перевозчик",
    saveShipment: "Сохранить отправку",
    saving: "Сохранение...",
    shipmentControlsNote: "Управление доставкой доступно после оплаты.",
    loginCredentialsTitle: "Данные для входа",
    loginCredentialsSubtitle: "Измените имя, email или пароль.",
    credentialsHelp: "Имя можно изменить свободно. Для смены email или пароля введите текущий пароль.",
    displayNamePlaceholder: "Новое отображаемое имя",
    currentPasswordPlaceholder: "Текущий пароль",
    newEmailPlaceholder: "Новый email",
    newPasswordPlaceholder: "Новый пароль",
    confirmPasswordPlaceholder: "Подтвердите пароль",
    passwordPolicyHelp: "Используйте не менее 8 символов, включая 1 цифру и 1 спецсимвол.",
    savingLabel: "Сохранение...",
    updateCredentials: "Обновить данные входа",
    sellerApplicationUnderReviewTitle: "Заявка продавца на рассмотрении",
    sellerApplicationUnderReviewHelp: "Ваша заявка отправлена и сейчас проверяется. Инструменты продавца откроются сразу после одобрения.",
    submittedLabel: "Отправлено",
    recentlyLabel: "Недавно",
    typicalReviewTimeHelp: "Обычно проверка занимает 24-48 часов.",
    contactSupport: "Связаться с поддержкой",
    sellerApplicationRejectedTitle: "Заявка продавца отклонена",
    sellerApplicationRejectedHelp: "Ваша предыдущая заявка не была одобрена. Обновите данные и подайте новую регистрацию.",
    reapplyAsSeller: "Подать заново как продавец",
    sellerLoginRequiredHelp: "Войдите в аккаунт продавца, чтобы продолжить.",
    goToLogin: "Перейти ко входу",
    accountFrozenAfterStrikes: "Аккаунт заморожен после двух модерационных страйков",
    moderationStrikesOnAccount: "Модерационные страйки на аккаунте",
    sellerAccountFrozenAppealHelp: "Ваш аккаунт продавца заморожен. Отправьте апелляцию для пересмотра.",
    reviewStrikesAndAppealHelp: "Проверьте детали страйков и отправьте апелляцию, если хотите проверку админом.",
    openAppeals: "Открыть апелляции",
    closeLabel: "Закрыть",
    openLabel: "Открыть",
    profileLabel: "Профиль",
    sellerProfileFallback: "Профиль продавца",
    profileImageLabel: "Фото профиля",
    sellerProfileImageFallback: "Фото профиля продавца",
    profileImageHelp: "Если пропустить, покупатели увидят имя продавца на стандартном изображении.",
    shippingScopeFixedHelp: "Область доставки фиксирована для всех продавцов.",
    setBuilderTitle: "Конструктор наборов",
    setBuilderHelp: "Создавайте комбинированные товары (например, бюстгальтер + трусики, топ + юбка или наборы из 4 предметов), сохраняя отдельные позиции в каталоге.",
    setBuilderNeedMore: "Добавьте минимум 2 объявления, чтобы разблокировать конструктор наборов.",
    cancelEdit: "Отменить редактирование",
    setTitleLabel: "Название набора",
    setTitlePlaceholder: "Пример: Сочетающийся набор бюстгальтер + трусики",
    setDescriptionLabel: "Описание набора",
    setDescriptionPlaceholder: "Опишите этот набор для покупателей...",
    advancedSetOptions: "Дополнительные параметры",
    combinedSetPriceLabel: "Общая цена набора (THB)",
    setPricePlaceholder: "Цена набора",
    selectProductsToInclude: "Выберите товары для набора (2 и более)",
    createIndividualProductsFirst: "Сначала создайте отдельные товары, затем собирайте из них наборы.",
    setSaved: "Набор сохранен.",
    setSaveFailed: "Не удалось сохранить набор.",
    updateSetProduct: "Обновить набор",
    createSetProduct: "Создать набор",
    existingSetProducts: "Существующие наборы",
    editSet: "Редактировать набор",
    noListingsYet: "Объявлений пока нет.",
    noListingsYetHelp: "Создайте первое объявление, чтобы покупатели могли вас найти и написать.",
    createFirstListing: "Создать первое объявление",
    setBadgeLabel: "Набор",
    soldLabel: "Продано",
    draftStatusLabel: "Черновик",
    includesLabel: "Включает",
    unpublishLabel: "Снять с публикации"
  }
};

export function SellerDashboardPage({
  isSeller,
  isPendingSeller,
  isRejectedSeller,
  uploadDraft,
  setUploadDraft,
  handleUploadFile,
  createProductFromUpload,
  sellerMap,
  bars,
  barMap,
  currentSellerId,
  currentSellerProfile,
  sellerProfileDraft,
  updateSellerProfileField,
  handleSellerProfileImageUpload,
  saveSellerProfile,
  isSavingSellerProfile,
  sellerProfileSaveSuccess,
  requestSellerBarAffiliation,
  sellerAffiliationRequestDraft,
  updateSellerAffiliationRequestDraftMessage,
  handleSellerAffiliationRequestImagesUpload,
  removeSellerAffiliationRequestDraftImage,
  sellerIncomingAffiliationRequests,
  sellerOutgoingAffiliationRequests,
  respondToBarAffiliationRequest,
  cancelBarAffiliationRequest,
  removeSellerFromCurrentBarBySeller,
  sellerProfileChecklist,
  sellerProfileMessage,
  sellerInbox,
  sellerMessageHistory,
  setSellerSelectedConversationId,
  markNotificationsReadForConversation,
  sellerActiveConversationId,
  sellerActiveConversationMessages,
  sellerReplyDraft,
  setSellerReplyDraft,
  sendSellerReply,
  notifications,
  userStrikes,
  currentUser,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
  updatePushNotificationPreference,
  pushPermission,
  pushSupported,
  sellerDashboardProducts,
  soldProductIds,
  sellerDashboardPosts,
  publishProduct,
  upsertBundleProduct,
  deleteProduct,
  deletingProductId,
  sellerPostDraft,
  sellerPostDraftSavedAt,
  setSellerPostDraft,
  handleSellerPostImageUpload,
  createSellerPost,
  creatingSellerPost,
  deleteSellerPost,
  deletingSellerPostId,
  sellerLanguage,
  updateSellerLanguage,
  isSellerOnline,
  toggleSellerOnlineStatus,
  updateSellerPostVisibility,
  updateSellerPostPrice,
  updateAllPrivatePostPrices,
  unscheduleSellerPost,
  publishSellerPostNow,
  sellerPostAnalytics,
  sellerCustomRequests,
  customRequestMessagesByRequestId,
  updateCustomRequestStatus,
  proposeCustomRequestPrice,
  respondToCustomRequestCounter,
  toggleCustomRequestBuyerImageUpload,
  sendCustomRequestMessage,
  accountCredentialForm,
  setAccountCredentialForm,
  submitAccountCredentialChanges,
  accountCredentialSaving,
  accountCredentialMessage,
  accountCredentialTone,
  navigate,
  giftCatalog,
  giftPurchases,
  giftFulfillmentTasks,
  startEditProduct,
  editingProductId,
  sellerOrders,
  updateOrderShipment,
  updatingOrderId,
}) {
  const locale = SELLER_I18N[sellerLanguage] ? sellerLanguage : "en";
  const t = (key) => SELLER_I18N[locale]?.[key] || SELLER_I18N.en[key] || key;
  const sellerProfileSelectText = SELLER_PROFILE_SELECT_I18N[locale] || SELLER_PROFILE_SELECT_I18N.en;
  const sellerWritingPresetText = SELLER_WRITING_PRESETS_I18N[locale] || SELLER_WRITING_PRESETS_I18N.en;
  const [bundleDraft, setBundleDraft] = useState({
    title: "",
    description: "",
    price: "",
    selectedProductIds: [],
  });
  const [editingBundleId, setEditingBundleId] = useState("");
  const [bundleMessage, setBundleMessage] = useState("");
  const [sellerOrderShipmentDrafts, setSellerOrderShipmentDrafts] = useState({});
  const isAffiliated = Boolean(currentSellerProfile?.affiliatedBarId);
  const [dashHeightUnit, setDashHeightUnit] = useState("cm");
  const [localHeightIn, setLocalHeightIn] = useState("");
  const [dashWeightUnit, setDashWeightUnit] = useState("kg");
  const [localWeightLbs, setLocalWeightLbs] = useState("");
  const [useBraThaiSizingDash, setUseBraThaiSizingDash] = useState(true);
  const [dashThaiBraBand, setDashThaiBraBand] = useState("");
  const [dashThaiBraCup, setDashThaiBraCup] = useState("");
  const [dashLocationCountry, setDashLocationCountry] = useState("");
  const [dashLocationCity, setDashLocationCity] = useState("");
  useEffect(() => {
    setDashHeightUnit("cm");
    setLocalHeightIn("");
    setDashWeightUnit("kg");
    setLocalWeightLbs("");
    setUseBraThaiSizingDash(true);
    setDashThaiBraBand("");
    setDashThaiBraCup("");
    const loc = String(currentSellerProfile?.location || "").trim();
    if (loc) {
      const lastComma = loc.lastIndexOf(", ");
      if (lastComma >= 0) {
        const parsedCountry = loc.slice(lastComma + 2);
        const parsedCity = loc.slice(0, lastComma);
        const knownCountries = SELLER_BAR_REGISTRATION_COUNTRIES.filter((c) => c !== "Other");
        if (knownCountries.includes(parsedCountry)) {
          setDashLocationCountry(parsedCountry);
          setDashLocationCity(parsedCity);
          return;
        }
      }
      setDashLocationCountry("");
      setDashLocationCity(loc);
    } else {
      setDashLocationCountry("");
      setDashLocationCity("");
    }
  }, [currentSellerProfile?.id]);
  const turnaroundOptions = useMemo(
    () => buildSellerSelectOptions(sellerProfileSelectText.turnaround, sellerProfileDraft.turnaround),
    [sellerProfileSelectText, sellerProfileDraft.turnaround],
  );
  const fixedShippingLabel = SELLER_WORLDWIDE_SHIPPING_BY_LOCALE[locale] || SELLER_WORLDWIDE_SHIPPING_BY_LOCALE.en;
  const soldProductIdSet = useMemo(() => new Set((soldProductIds || []).map((id) => String(id || ""))), [soldProductIds]);
  useEffect(() => {
    if ((sellerProfileDraft.shipping || "") === fixedShippingLabel) return;
    updateSellerProfileField("shipping", fixedShippingLabel);
  }, [fixedShippingLabel, sellerProfileDraft.shipping, updateSellerProfileField]);
  useEffect(() => {
    if (String(sellerProfileDraft.turnaround || "").trim()) return;
    const fallbackTurnaround = turnaroundOptions[0] || "";
    if (!fallbackTurnaround) return;
    updateSellerProfileField("turnaround", fallbackTurnaround);
  }, [sellerProfileDraft.turnaround, turnaroundOptions, updateSellerProfileField]);
  const barOptions = useMemo(
    () => [...(bars || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [bars],
  );
  const currentAffiliatedBar = currentSellerProfile?.affiliatedBarId
    ? (barMap?.[currentSellerProfile.affiliatedBarId] || null)
    : null;
  const selectedAffiliatedBarId = String(sellerProfileDraft.affiliatedBarId || "").trim();
  const currentAffiliatedBarId = String(currentSellerProfile?.affiliatedBarId || "").trim();
  const hasPendingSelectedBarRequest = (sellerOutgoingAffiliationRequests || []).some(
    (request) => String(request?.barId || "").trim() === selectedAffiliatedBarId
  );
  const hasPendingAnyBarRequest = (sellerOutgoingAffiliationRequests || []).some(
    (request) => request?.status === "pending"
  );
  const canApplyToSelectedBar = Boolean(
    selectedAffiliatedBarId
    && selectedAffiliatedBarId !== currentAffiliatedBarId
    && !hasPendingSelectedBarRequest
    && !hasPendingAnyBarRequest
    && typeof requestSellerBarAffiliation === "function"
  );
  const selectedBarName = barMap?.[selectedAffiliatedBarId]?.name || selectedAffiliatedBarId;
  const sellerLanguages = Array.isArray(sellerProfileDraft.languages) ? sellerProfileDraft.languages : [];
  const bundleSourceProducts = useMemo(
    () => (sellerDashboardProducts || []).filter((product) => !product?.isBundle),
    [sellerDashboardProducts],
  );
  const existingBundleProducts = useMemo(
    () => (sellerDashboardProducts || []).filter((product) => product?.isBundle),
    [sellerDashboardProducts],
  );
  const [customRequestReplyDraftById, setCustomRequestReplyDraftById] = useState({});
  const [customRequestImageDraftById, setCustomRequestImageDraftById] = useState({});
  const [customRequestQuoteDraftById, setCustomRequestQuoteDraftById] = useState({});
  const [customRequestQuoteNoteById, setCustomRequestQuoteNoteById] = useState({});
  const [customRequestQuoteMessageById, setCustomRequestQuoteMessageById] = useState({});
  const sellerSectionStateStorageKey = `tlm-seller-dashboard-sections-${currentUser?.id || "anon"}`;
  const [sellerSectionOpen, setSellerSectionOpen] = useState(() => {
    const defaults = { credentials: true, profile: true, upload: true, listings: true, orders: true };
    if (typeof window === "undefined") return defaults;
    try {
      const raw = window.localStorage.getItem(sellerSectionStateStorageKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      return {
        credentials: typeof parsed?.credentials === "boolean" ? parsed.credentials : defaults.credentials,
        profile: typeof parsed?.profile === "boolean" ? parsed.profile : defaults.profile,
        upload: typeof parsed?.upload === "boolean" ? parsed.upload : defaults.upload,
        listings: typeof parsed?.listings === "boolean" ? parsed.listings : defaults.listings,
        orders: typeof parsed?.orders === "boolean" ? parsed.orders : defaults.orders,
      };
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    const defaults = { credentials: true, profile: true, upload: true, listings: true, orders: true };
    if (typeof window === "undefined") {
      setSellerSectionOpen(defaults);
      return;
    }
    try {
      const raw = window.localStorage.getItem(sellerSectionStateStorageKey);
      if (!raw) {
        setSellerSectionOpen(defaults);
        return;
      }
      const parsed = JSON.parse(raw);
      setSellerSectionOpen({
        credentials: typeof parsed?.credentials === "boolean" ? parsed.credentials : defaults.credentials,
        profile: typeof parsed?.profile === "boolean" ? parsed.profile : defaults.profile,
        upload: typeof parsed?.upload === "boolean" ? parsed.upload : defaults.upload,
        listings: typeof parsed?.listings === "boolean" ? parsed.listings : defaults.listings,
        orders: typeof parsed?.orders === "boolean" ? parsed.orders : defaults.orders,
      });
    } catch {
      setSellerSectionOpen(defaults);
    }
  }, [sellerSectionStateStorageKey]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#seller-listings") {
      setSellerSectionOpen((prev) => ({ ...prev, listings: true }));
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(sellerSectionStateStorageKey, JSON.stringify(sellerSectionOpen));
  }, [sellerSectionStateStorageKey, sellerSectionOpen]);
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [sellerNotificationCompactMode, setSellerNotificationCompactMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(`tlm-seller-notification-density-${currentUser?.id || "anon"}`) === "compact";
  });
  const [sellerDiscreetNotificationText, setSellerDiscreetNotificationText] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(`tlm-seller-discreet-notifications-${currentUser?.id || "anon"}`) === "1";
  });
  const [showOriginalMessageById, setShowOriginalMessageById] = useState({});
  const applyPresetToDraft = (currentValue, preset) => {
    if (String(currentValue || "").trim()) {
      return `${String(currentValue || "").trim()}\n${preset}`;
    }
    return preset;
  };
  const sellerNotifications = useMemo(
    () =>
      (notifications || [])
        .filter((notification) => currentUser && notification.userId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [notifications, currentUser]
  );
  const sellerActiveStrikes = useMemo(
    () => (userStrikes || []).filter((strike) => strike.userId === currentUser?.id && strike.status === "active"),
    [userStrikes, currentUser]
  );
  const filteredSellerNotifications = useMemo(() => {
    if (notificationFilter === "unread") return sellerNotifications.filter((notification) => !notification.read);
    if (notificationFilter === "messages") return sellerNotifications.filter((notification) => notification.type === "message");
    if (notificationFilter === "engagement") return sellerNotifications.filter((notification) => notification.type === "engagement");
    return sellerNotifications;
  }, [sellerNotifications, notificationFilter]);
  const resolveNotificationActionPath = (notification) => {
    const explicitPath = String(notification?.actionPath || "").trim();
    if (explicitPath) return explicitPath;
    const text = String(notification?.text || "").toLowerCase();
    if (/(strike|frozen|appeal)/i.test(text)) return "/appeals";
    return "";
  };
  const unreadNotificationCount = sellerNotifications.filter((notification) => !notification.read).length;
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `tlm-seller-discreet-notifications-${currentUser?.id || "anon"}`,
      sellerDiscreetNotificationText ? "1" : "0"
    );
  }, [sellerDiscreetNotificationText, currentUser?.id]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `tlm-seller-notification-density-${currentUser?.id || "anon"}`,
      sellerNotificationCompactMode ? "compact" : "comfort"
    );
  }, [sellerNotificationCompactMode, currentUser?.id]);
  const groupedSellerNotifications = useMemo(
    () => groupNotificationsByDay(filteredSellerNotifications),
    [filteredSellerNotifications]
  );
  const sellerNotificationTypeMeta = (notificationType) => {
    const normalizedType = String(notificationType || "").toLowerCase();
    if (normalizedType === "message") {
      return {
        label: t("messagesLabel"),
        icon: MessageSquare,
        chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
        iconWrapClassName: "bg-emerald-50 text-emerald-700",
      };
    }
    if (normalizedType === "engagement") {
      return {
        label: t("engagementLabel"),
        icon: Bell,
        chipClassName: "border-amber-200 bg-amber-50 text-amber-700",
        iconWrapClassName: "bg-amber-50 text-amber-700",
      };
    }
    if (normalizedType === "admin_ops") {
      return {
        label: t("adminLabel"),
        icon: Shield,
        chipClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
        iconWrapClassName: "bg-indigo-50 text-indigo-700",
      };
    }
    return {
      label: t("updateLabel"),
      icon: Bell,
      chipClassName: "border-slate-200 bg-slate-50 text-slate-700",
      iconWrapClassName: "bg-slate-100 text-slate-700",
    };
  };
  const safeSellerInbox = (sellerInbox || []).filter((message) => message && typeof message === "object");
  const sellerUnreadConversationCount = safeSellerInbox.filter((message) => message.hasUnread ?? !message.readBySeller).length;
  const firstUnreadSellerConversation = safeSellerInbox.find((message) => message.hasUnread ?? !message.readBySeller) || null;
  const parseBuyerIdFromConversationId = (conversationId) => {
    const [buyerId] = String(conversationId || "").split("__");
    return String(buyerId || "").trim();
  };
  const resolveBuyerDisplayName = (row) => {
    if (!row) return t("unknownBuyer");
    const explicitName = String(row.buyerName || row.buyerDisplayName || row.counterpartName || "").trim();
    if (explicitName) return explicitName;
    const explicitId = String(row.buyerId || row.counterpartId || "").trim();
    if (explicitId) return explicitId;
    const parsedBuyerId = parseBuyerIdFromConversationId(row.conversationId);
    return parsedBuyerId || t("unknownBuyer");
  };
  const getConversationInitials = (label) => {
    const parts = String(label || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };
  const activeSellerConversation = safeSellerInbox.find((row) => row.conversationId === sellerActiveConversationId) || null;
  const activeSellerConversationLabel = resolveBuyerDisplayName(activeSellerConversation);
  const activeSellerConversationInitials = getConversationInitials(activeSellerConversationLabel);
  const unlockRevenue = Number(sellerPostAnalytics?.unlockRevenue || 0);
  const messageRevenue = Number(sellerPostAnalytics?.messageRevenue || 0);
  const orderRevenue = Number(sellerPostAnalytics?.orderRevenue || 0);
  const netEarnings = Number(
    sellerPostAnalytics?.totalRevenue
    ?? Number((unlockRevenue + messageRevenue + orderRevenue).toFixed(2))
  );
  const sellerPayoutRatio = String(currentSellerProfile?.affiliatedBarId || "").trim() ? 0.34 : 0.5;
  const grossMessageFees = Number((messageRevenue / sellerPayoutRatio).toFixed(2));
  const grossOrderRevenue = Number((orderRevenue / sellerPayoutRatio).toFixed(2));
  const grossEarnings = Number(
    sellerPostAnalytics?.totalGrossRevenue
    ?? Number((unlockRevenue + grossMessageFees + grossOrderRevenue).toFixed(2))
  );
  const openSellerRequestCount = useMemo(
    () =>
      (sellerCustomRequests || []).filter((request) => {
        const status = String(request?.status || "open");
        return status === "open" || status === "reviewing";
      }).length,
    [sellerCustomRequests],
  );
  const inAppAllEnabled =
    (currentUser?.notificationPreferences?.message !== false)
    && (currentUser?.notificationPreferences?.engagement !== false);
  const pushPrefs = currentUser?.notificationPreferences?.push || {};
  const pushAllEnabled =
    pushPrefs.message === true
    && pushPrefs.engagement === true
    && (currentUser?.role !== "admin" || pushPrefs.adminOps === true);
  const scrollToSection = (sectionId) => {
    if (typeof document === "undefined") return;
    const node = document.getElementById(sectionId);
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const resolveConversationMessageBody = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = (message?.senderId || message?.senderUserId) === currentUser?.id;
    const showOriginal = Boolean(showOriginalMessageById[message?.id]);
    if (isOwnMessage || showOriginal) return original;
    return translated || original;
  };
  const canToggleConversationTranslation = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = (message?.senderId || message?.senderUserId) === currentUser?.id;
    return !isOwnMessage && Boolean(translated) && translated !== original;
  };
  const getQuoteStatusLabel = (request) => {
    if ((request?.quoteStatus || "") === "proposed" && request?.quoteAwaitingBuyerPayment) {
      return t("awaitingBuyerPayment");
    }
    const status = String(request?.quoteStatus || "none");
    const statusMap = {
      none: t("statusNone"),
      proposed: t("statusProposed"),
      countered: t("statusCountered"),
      accepted: t("statusAccepted"),
      declined: t("statusDeclined"),
      paid: t("statusPaid"),
      expired: t("statusExpired"),
    };
    return statusMap[status] || status;
  };
  const handleCustomRequestImageDraftSelect = async (requestId, fileList) => {
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
    setCustomRequestImageDraftById((prev) => ({ ...prev, [requestId]: nextImages.filter((item) => item?.image) }));
  };
  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      {isPendingSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">{t("sellerApplicationUnderReviewTitle")}</h2>
          <p className="mt-2 text-slate-600">{t("sellerApplicationUnderReviewHelp")}</p>
          <div className="mt-2 text-sm text-slate-500">{t("submittedLabel")}: {currentUser?.sellerApplicationAt ? formatDateTimeNoSeconds(currentUser.sellerApplicationAt) : t("recentlyLabel")}</div>
          <div className="mt-1 text-sm text-slate-500">{t("typicalReviewTimeHelp")}</div>
          <button onClick={() => navigate("/contact")} className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700">{t("contactSupport")}</button>
        </div>
      ) : isRejectedSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">{t("sellerApplicationRejectedTitle")}</h2>
          <p className="mt-2 text-slate-600">{t("sellerApplicationRejectedHelp")}</p>
          <button onClick={() => navigate("/register")} className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white">{t("reapplyAsSeller")}</button>
        </div>
      ) : !isSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">{t("loginRequired")}</h2>
          <p className="mt-2 text-slate-600">{t("sellerLoginRequiredHelp")}</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700"
          >
            {t("goToLogin")}
          </button>
        </div>
      ) : (
        <>
          <SectionTitle eyebrow={t("sellerDashboardEyebrow")} title={t("sectionTitle")} subtitle={t("sectionSubtitle")} />
          {sellerActiveStrikes.length > 0 ? (
            <div className={`mb-4 rounded-3xl border p-4 ${currentUser?.accountStatus === "frozen" ? "border-rose-300 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={`text-sm font-semibold ${currentUser?.accountStatus === "frozen" ? "text-rose-900" : "text-amber-900"}`}>
                    {currentUser?.accountStatus === "frozen"
                      ? t("accountFrozenAfterStrikes")
                      : `${t("moderationStrikesOnAccount")}: ${sellerActiveStrikes.length}/2`}
                  </div>
                  <div className={`mt-1 text-sm ${currentUser?.accountStatus === "frozen" ? "text-rose-800" : "text-amber-800"}`}>
                    {currentUser?.accountStatus === "frozen"
                      ? t("sellerAccountFrozenAppealHelp")
                      : t("reviewStrikesAndAppealHelp")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/appeals")}
                  className={`rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold ${currentUser?.accountStatus === "frozen" ? "border-rose-300 text-rose-800" : "border-amber-300 text-amber-800"}`}
                >
                  {t("openAppeals")}
                </button>
              </div>
            </div>
          ) : null}
          {sellerUnreadConversationCount > 0 ? (
            <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-amber-900">{t("newBuyerMessagesWaiting")}</div>
                  <div className="mt-1 text-sm text-amber-800">
                    {t("youHave")} {sellerUnreadConversationCount} {t("unreadChatsCount")}. {t("openInboxReplyQuickly")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (firstUnreadSellerConversation?.conversationId) {
                      setSellerSelectedConversationId(firstUnreadSellerConversation.conversationId);
                    }
                    navigate("/seller-messages");
                  }}
                  className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800"
                >
                  {t("viewUnreadMessages")}
                </button>
              </div>
            </div>
          ) : null}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/seller-dashboard")}
              className="min-h-[44px] rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {t("quickProfile")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/seller-messages")}
              className="min-h-[44px] rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {t("messagesTab")} {sellerUnreadConversationCount > 0 ? `(${sellerUnreadConversationCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => navigate("/custom-requests")}
              className="min-h-[44px] rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {t("customRequestsTab")} {openSellerRequestCount > 0 ? `(${openSellerRequestCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => navigate("/stories-workspace")}
              className="min-h-[44px] rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {t("feedEyebrow")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/seller-upload")}
              className="min-h-[44px] rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700"
            >
              {t("mediaUpload")}
            </button>
          </div>
          <div className="mb-4 flex justify-start lg:justify-end">
            <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
              <label className="flex w-full items-center gap-2 text-sm text-slate-600 sm:w-auto">
              {t("language")}
              <select
                value={locale}
                onChange={(event) => updateSellerLanguage(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-auto"
              >
                {SELLER_UI_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{localizeOptionLabel(option.label, locale)}</option>
                ))}
              </select>
              </label>
            </div>
          </div>
          <div className="mb-6 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">{t("earnings")}</div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("grossEarnings")}</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{formatPriceTHB(grossEarnings)}</div>
                <div className="mt-1 text-xs text-slate-500">{t("grossEarningsHelp")}</div>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <div className="text-[11px] uppercase tracking-[0.12em] text-emerald-700">{t("netEarnings")}</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-800">{formatPriceTHB(netEarnings)}</div>
                <div className="mt-1 text-xs text-emerald-700">{t("netEarningsHelp")}</div>
              </div>
            </div>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Bell className="h-4 w-4 text-rose-600" />
              {t("notifications")}
            </div>
            <button
              onClick={() => {
                const nextEnabled = !inAppAllEnabled;
                updateNotificationPreference("message", nextEnabled);
                updateNotificationPreference("engagement", nextEnabled);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${inAppAllEnabled ? "bg-emerald-50 text-emerald-700" : "border border-slate-200 text-slate-600"}`}
            >
              {t("emailNotifications")}: {inAppAllEnabled ? t("onLabel") : t("offLabel")}
            </button>
            <button
              onClick={() => {
                const nextEnabled = !pushAllEnabled;
                updatePushNotificationPreference("message", nextEnabled);
                updatePushNotificationPreference("engagement", nextEnabled);
                if (currentUser?.role === "admin") {
                  updatePushNotificationPreference("adminOps", nextEnabled);
                }
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${pushAllEnabled ? "bg-indigo-50 text-indigo-700" : "border border-slate-200 text-slate-600"}`}
            >
              {t("browserNotifications")}: {pushAllEnabled ? t("onLabel") : t("offLabel")}
            </button>
            {!pushSupported ? (
              <span className="text-xs text-amber-700">{t("pushNotSupported")}</span>
            ) : null}
            {pushSupported && pushPermission === "denied" ? (
              <span className="text-xs text-amber-700">{t("pushBlockedEnableSettings")}</span>
            ) : null}
          </div>
          <div className="space-y-8">
            {sellerMap[currentSellerId] ? (
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <SellerQrCard seller={sellerMap[currentSellerId]} />
              </div>
            ) : null}
            <div className="mb-4 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{t("barAffiliation")}</h3>
              </div>
              <p className="mt-1 text-sm text-slate-600">{t("barAffiliationHelp")}</p>
              <div className="mt-4 space-y-3">
                {currentAffiliatedBar ? (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                    {t("currentlyAffiliatedWith")} <span className="font-semibold">{currentAffiliatedBar.name}</span>.
                    <button type="button" onClick={removeSellerFromCurrentBarBySeller} className="ml-2 rounded-lg border border-indigo-200 px-2 py-1 text-xs font-semibold text-indigo-700">{t("removeAffiliation")}</button>
                  </div>
                ) : null}
                {(sellerOutgoingAffiliationRequests || []).length > 0 ? (
                  <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">{t("pendingBarRequests")}</div>
                    {(sellerOutgoingAffiliationRequests || []).map((request) => (
                      <div key={request.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-amber-100">
                        <span>{barMap?.[request.barId]?.name || request.barId}</span>
                        <button type="button" onClick={() => cancelBarAffiliationRequest?.(request.id)} className="rounded-lg border border-slate-200 px-2 py-0.5 font-semibold text-slate-700">{t("cancel")}</button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {(sellerIncomingAffiliationRequests || []).length > 0 ? (
                  <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{t("barInvitesAwaitingApproval")}</div>
                    {(sellerIncomingAffiliationRequests || []).map((request) => (
                      <div key={request.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-emerald-100">
                        <div className="font-semibold">{barMap?.[request.barId]?.name || request.barId}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" onClick={() => respondToBarAffiliationRequest?.(request.id, "approved")} className="rounded-lg border border-emerald-200 px-2 py-1 font-semibold text-emerald-700">{t("approve")}</button>
                          <button type="button" onClick={() => respondToBarAffiliationRequest?.(request.id, "rejected")} className="rounded-lg border border-rose-200 px-2 py-1 font-semibold text-rose-700">{t("reject")}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {!currentAffiliatedBar ? (
                  <>
                    <select value={sellerProfileDraft.affiliatedBarId || ""} onChange={(event) => updateSellerProfileField("affiliatedBarId", event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <option value="">{localizeOptionLabel("Independent", locale)}</option>
                      {barOptions.map((bar) => (<option key={bar.id} value={bar.id}>{bar.name}</option>))}
                    </select>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{t("applicationMessageLabel")}</div>
                      <textarea value={sellerAffiliationRequestDraft?.message || ""} onChange={(event) => updateSellerAffiliationRequestDraftMessage?.(event.target.value)} className="mt-2 min-h-[84px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder={t("applicationMessagePlaceholder")} />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => requestSellerBarAffiliation?.({ message: sellerAffiliationRequestDraft?.message || "", images: sellerAffiliationRequestDraft?.images || [] })} disabled={!canApplyToSelectedBar} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${canApplyToSelectedBar ? "border-rose-200 text-rose-700" : "cursor-not-allowed border-slate-200 text-slate-400"}`}>{t("applyToBar")}</button>
                        <label className="inline-flex cursor-pointer items-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
                          <input type="file" accept="image/*" multiple onChange={(event) => { handleSellerAffiliationRequestImagesUpload?.(event.target.files); event.currentTarget.value = ""; }} className="hidden" />
                          {t("uploadPhotosLabel")}
                        </label>
                      </div>
                      {(sellerAffiliationRequestDraft?.images || []).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(sellerAffiliationRequestDraft?.images || []).map((image) => (
                            <div key={image.id || image.image} className="relative">
                              <img src={image.image} alt={image.imageName || "Application"} className="h-14 w-14 rounded-lg object-cover ring-1 ring-rose-100" />
                              <button type="button" onClick={() => removeSellerAffiliationRequestDraftImage?.(image.id)} className="absolute -right-1 -top-1 rounded-full border border-rose-200 bg-white px-1 text-[10px] font-semibold text-rose-700">x</button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {hasPendingSelectedBarRequest && selectedAffiliatedBarId ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t("applicationPendingWith")} {selectedBarName}.</div>
                    ) : hasPendingAnyBarRequest && !hasPendingSelectedBarRequest ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{t("pendingApplicationElsewhere")}</div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
            <details
              id="seller-profile"
              open={sellerSectionOpen.profile}
              onToggle={(event) => {
                const isOpen = Boolean(event.currentTarget?.open);
                setSellerSectionOpen((prev) => ({ ...prev, profile: isOpen }));
              }}
              className="overflow-hidden rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">{t("profileChecklist")}</h3>
                  <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{sellerSectionOpen.profile ? t("closeLabel") : t("openLabel")}</span>
                </div>
              </summary>
              <div className="mt-1 text-sm text-slate-500">{t("profileLabel")}: {currentSellerProfile?.name || t("sellerProfileFallback")}</div>
              <div className="mt-4 rounded-2xl border border-rose-100 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{t("sellerPresence")}</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={toggleSellerOnlineStatus}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isSellerOnline ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {isSellerOnline ? t("online") : t("offline")}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">{t("presenceHelp")}</p>
              </div>
              <div className="mt-4 max-w-2xl space-y-2">
                {sellerProfileChecklist.length === 0 ? (
                  <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{t("profileComplete")}</div>
                ) : sellerProfileChecklist.map((item) => (
                  <div key={item} className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">• {item}</div>
                ))}
              </div>
              <div className="mt-5 max-w-2xl grid gap-3">
                <div className="rounded-2xl border border-rose-100 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{t("profileImageLabel")}</div>
                  {(sellerProfileDraft.profileImage || currentSellerProfile?.profileImageResolved) ? (
                    <div className="mt-3">
                      <div className="aspect-[4/5] max-w-xs">
                        <ProductImage
                          src={sellerProfileDraft.profileImage || currentSellerProfile?.profileImageResolved}
                          label={sellerProfileDraft.profileImageName || currentSellerProfile?.profileImageNameResolved || t("sellerProfileImageFallback")}
                          top
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 aspect-[4/5] max-w-xs">
                      <ProductImage label={sellerProfileDraft.profileImageName || currentSellerProfile?.profileImageNameResolved || t("sellerProfileImageFallback")} />
                    </div>
                  )}
                  <input
                    id="seller-profile-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleSellerProfileImageUpload}
                    className="sr-only"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label htmlFor="seller-profile-image-input" className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700">
                      {t("chooseFile")}
                    </label>
                    {(sellerProfileDraft.profileImage || currentSellerProfile?.profileImageResolved) ? (
                      <button
                        type="button"
                        onClick={() => { updateSellerProfileField("profileImage", ""); updateSellerProfileField("profileImageName", ""); }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
                      >
                        {t("removeImage")}
                      </button>
                    ) : null}
                    <span className="text-xs text-slate-500">{sellerProfileDraft.profileImageName || currentSellerProfile?.profileImageNameResolved || t("noFileChosen")}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{t("profileImageHelp")}</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={saveSellerProfile}
                    disabled={isSavingSellerProfile}
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 ${
                      sellerProfileSaveSuccess
                        ? "border-2 border-emerald-400 bg-emerald-50 text-emerald-700 scale-[1.02]"
                        : isSavingSellerProfile
                          ? "border border-slate-200 bg-slate-50 text-slate-400 cursor-wait"
                          : "border border-rose-300 bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.97]"
                    }`}
                  >
                    {isSavingSellerProfile ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                        Saving…
                      </>
                    ) : sellerProfileSaveSuccess ? (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Saved!
                      </>
                    ) : t("saveProfile")}
                  </button>
                  {sellerProfileMessage ? (
                    <span className={`text-xs font-medium ${sellerProfileSaveSuccess ? "text-emerald-600" : "text-rose-600"}`}>
                      {sellerProfileMessage}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid gap-2 text-sm text-slate-600">
                    <label className="block">
                      <span className="font-medium">{t("countryLabel") || "Country"}</span>
                      <select
                        value={SELLER_BAR_REGISTRATION_COUNTRIES.filter((c) => c !== "Other").includes(dashLocationCountry) ? dashLocationCountry : (dashLocationCountry ? "Other" : "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newCountry = val === "Other" ? "" : val;
                          setDashLocationCountry(newCountry);
                          setDashLocationCity("");
                          updateSellerProfileField("location", newCountry || "");
                        }}
                        className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      >
                        <option value="">{localizeOptionLabel("Select country", locale)}</option>
                        {SELLER_BAR_REGISTRATION_COUNTRIES.map((c) => <option key={c} value={c}>{localizeOptionLabel(c, locale)}</option>)}
                      </select>
                    </label>
                    {!SELLER_BAR_REGISTRATION_COUNTRIES.filter((c) => c !== "Other").includes(dashLocationCountry) ? (
                      <input
                        value={dashLocationCountry === "Other" ? "" : dashLocationCountry}
                        onChange={(e) => {
                          const newCountry = e.target.value;
                          setDashLocationCountry(newCountry);
                          updateSellerProfileField("location", [dashLocationCity, newCountry].filter(Boolean).join(", "));
                        }}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        placeholder={localizeOptionLabel("Type your country", locale)}
                      />
                    ) : null}
                    {(() => {
                      const cities = REGISTRATION_CITIES_BY_COUNTRY[dashLocationCountry] || [];
                      if (cities.length === 0) {
                        return (
                          <label className="block">
                            <span className="font-medium">{t("cityLabel") || "City"}</span>
                            <input
                              value={dashLocationCity}
                              onChange={(e) => {
                                const newCity = e.target.value;
                                setDashLocationCity(newCity);
                                updateSellerProfileField("location", [newCity, dashLocationCountry].filter(Boolean).join(", "));
                              }}
                              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                              placeholder={dashLocationCountry ? localizeOptionLabel("Type your city", locale) : (t("cityLabel") || "City")}
                            />
                          </label>
                        );
                      }
                      return (
                        <>
                          <label className="block">
                            <span className="font-medium">{t("cityLabel") || "City"}</span>
                            <select
                              value={cities.includes(dashLocationCity) ? dashLocationCity : (dashLocationCity ? "Other" : "")}
                              onChange={(e) => {
                                const val = e.target.value;
                                const newCity = val === "Other" ? "" : val;
                                setDashLocationCity(newCity);
                                updateSellerProfileField("location", [newCity, dashLocationCountry].filter(Boolean).join(", "));
                              }}
                              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                            >
                              <option value="">{localizeOptionLabel("Select city", locale)}</option>
                              {cities.map((city) => <option key={city} value={city}>{localizeOptionLabel(city, locale)}</option>)}
                              <option value="Other">{localizeOptionLabel("Other", locale)}</option>
                            </select>
                          </label>
                          {!cities.includes(dashLocationCity) ? (
                            <input
                              value={dashLocationCity}
                              onChange={(e) => {
                                const newCity = e.target.value;
                                setDashLocationCity(newCity);
                                updateSellerProfileField("location", [newCity, dashLocationCountry].filter(Boolean).join(", "));
                              }}
                              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                              placeholder={localizeOptionLabel("Type your city", locale)}
                            />
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("languages")}</span>
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 px-3 py-3">
                      {SELLER_LANGUAGE_OPTIONS.map((value) => {
                        const selected = sellerLanguages.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateSellerProfileField("languages", selected ? sellerLanguages.filter((item) => item !== value) : [...sellerLanguages, value])}
                            className={`rounded-xl px-3 py-2 text-xs font-semibold ${selected ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
                          >
                            {localizeOptionLabel(value, locale)}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("turnaround")}</span>
                    <select
                      value={turnaroundOptions.includes(sellerProfileDraft.turnaround || "") ? (sellerProfileDraft.turnaround || "") : (turnaroundOptions[0] || "")}
                      onChange={(event) => updateSellerProfileField("turnaround", event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    >
                      <option value="">{sellerProfileSelectText.turnaroundPlaceholder}</option>
                      {turnaroundOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid gap-1">
                  <textarea value={sellerProfileDraft.bio} onChange={(e) => updateSellerProfileField("bio", e.target.value)} className="min-h-[90px] rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("bio")} />
                  <div className="text-[11px] text-slate-400">Write in any language — your bio will be automatically translated for buyers.</div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={saveSellerProfile}
                    disabled={isSavingSellerProfile}
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 ${
                      sellerProfileSaveSuccess
                        ? "border-2 border-emerald-400 bg-emerald-50 text-emerald-700 scale-[1.02]"
                        : isSavingSellerProfile
                          ? "border border-slate-200 bg-slate-50 text-slate-400 cursor-wait"
                          : "border border-rose-300 bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.97]"
                    }`}
                  >
                    {isSavingSellerProfile ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                        Saving…
                      </>
                    ) : sellerProfileSaveSuccess ? (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Saved!
                      </>
                    ) : t("saveProfile")}
                  </button>
                  {sellerProfileMessage ? (
                    <span className={`text-xs font-medium ${sellerProfileSaveSuccess ? "text-emerald-600" : "text-rose-600"}`}>
                      {sellerProfileMessage}
                    </span>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{t("profileDetails") || "Profile details (shown publicly)"}</div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">{t("profileDetailsHint") || "This info is shown on your public profile to help buyers find you."}</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm text-slate-600">
                      <span className="font-medium">{t("heightLabel") || "Height"}</span>
                      <div className="flex gap-2">
                        <input
                          value={dashHeightUnit === "in" ? localHeightIn : (sellerProfileDraft.height || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (dashHeightUnit === "in") {
                              setLocalHeightIn(val);
                              const cm = val ? Number((Number(val) * 2.54).toFixed(1)) : "";
                              updateSellerProfileField("height", cm ? String(cm) : "");
                            } else {
                              updateSellerProfileField("height", val);
                            }
                          }}
                          type="number" min="0"
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder={dashHeightUnit === "cm" ? "165" : "65"}
                        />
                        <select
                          value={dashHeightUnit}
                          onChange={(e) => {
                            const newUnit = e.target.value;
                            if (newUnit === "in") {
                              const currentCm = Number(sellerProfileDraft.height);
                              setLocalHeightIn(currentCm > 0 ? String(Math.round(currentCm / 2.54)) : "");
                            }
                            setDashHeightUnit(newUnit);
                          }}
                          className="rounded-2xl border border-slate-200 px-2 py-2 text-sm"
                        >
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                    </label>
                    <label className="grid gap-1 text-sm text-slate-600">
                      <span className="font-medium">{t("weightLabel") || "Weight"}</span>
                      <div className="flex gap-2">
                        <input
                          value={dashWeightUnit === "lbs" ? localWeightLbs : (sellerProfileDraft.weight || "")}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (dashWeightUnit === "lbs") {
                              setLocalWeightLbs(val);
                              const kg = val ? Number((Number(val) / 2.20462).toFixed(1)) : "";
                              updateSellerProfileField("weight", kg ? String(kg) : "");
                            } else {
                              updateSellerProfileField("weight", val);
                            }
                          }}
                          type="number" min="0"
                          className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder={dashWeightUnit === "kg" ? "55" : "121"}
                        />
                        <select
                          value={dashWeightUnit}
                          onChange={(e) => {
                            const newUnit = e.target.value;
                            if (newUnit === "lbs") {
                              const currentKg = Number(sellerProfileDraft.weight);
                              setLocalWeightLbs(currentKg > 0 ? String(Math.round(currentKg * 2.20462)) : "");
                            }
                            setDashWeightUnit(newUnit);
                          }}
                          className="rounded-2xl border border-slate-200 px-2 py-2 text-sm"
                        >
                          <option value="kg">{localizeOptionLabel("kg", locale)}</option>
                          <option value="lbs">{localizeOptionLabel("lbs", locale)}</option>
                        </select>
                      </div>
                    </label>
                  </div>
                  <label className="block text-sm text-slate-600">
                    <span className="font-medium">{t("hairColorLabel") || "Hair color"}</span>
                    <select value={sellerProfileDraft.hairColor || ""} onChange={(e) => updateSellerProfileField("hairColor", e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <option value="">{t("selectHairColor") || "Select hair color"}</option>
                      {HAIR_COLOR_OPTIONS.map((color) => <option key={color} value={color}>{localizeOptionLabel(color, locale)}</option>)}
                    </select>
                  </label>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">{t("braSizeLabel") || "Bra size"}</span>
                      <button type="button" onClick={() => { setUseBraThaiSizingDash(true); updateSellerProfileField("braSize", ""); setDashThaiBraBand(""); setDashThaiBraCup(""); }} className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${useBraThaiSizingDash ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t("thaiBraSizes") || "Thai sizes (cm)"}</button>
                      <button type="button" onClick={() => { setUseBraThaiSizingDash(false); updateSellerProfileField("braSize", ""); setDashThaiBraBand(""); setDashThaiBraCup(""); }} className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${!useBraThaiSizingDash ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t("usBraSizes") || "US sizes"}</button>
                    </div>
                    {useBraThaiSizingDash ? (
                      <div className="grid grid-cols-2 gap-2">
                        <select value={dashThaiBraBand} onChange={(e) => { const band = e.target.value; setDashThaiBraBand(band); if (band && dashThaiBraCup) { updateSellerProfileField("braSize", THAI_TO_US_BRA_SIZE_MAP[band + dashThaiBraCup] || ""); } else { updateSellerProfileField("braSize", ""); } }} className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm">
                          <option value="">{localizeOptionLabel("Select band size", locale)}</option>
                          {THAI_BRA_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
                        </select>
                        <select value={dashThaiBraCup} onChange={(e) => { const cup = e.target.value; setDashThaiBraCup(cup); if (dashThaiBraBand && cup) { updateSellerProfileField("braSize", THAI_TO_US_BRA_SIZE_MAP[dashThaiBraBand + cup] || ""); } else { updateSellerProfileField("braSize", ""); } }} className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm">
                          <option value="">{localizeOptionLabel("Select cup", locale)}</option>
                          {THAI_BRA_CUPS.map((cup) => { const span = THAI_BRA_CUP_CM_SPAN[cup]; return (<option key={cup} value={cup}>{cup}{span ? ` (${span})` : ""}</option>); })}
                        </select>
                      </div>
                    ) : (
                      <select value={sellerProfileDraft.braSize || ""} onChange={(e) => updateSellerProfileField("braSize", e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                        <option value="">{t("selectBraSize") || "Select bra size"}</option>
                        {BRA_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                    )}
                    {useBraThaiSizingDash && sellerProfileDraft.braSize ? (
                      <div className="mt-1 text-xs text-slate-500">{t("selectedUsSize") || "US equivalent:"} <span className="font-semibold">{sellerProfileDraft.braSize}</span></div>
                    ) : null}
                    {useBraThaiSizingDash ? (
                      <div className="mt-1 text-xs text-slate-400">{t("thaiBraCupDifferenceHint") || "Cup = chest difference in cm"}</div>
                    ) : null}
                  </div>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("pantySizeLabel") || "Panty size"}</span>
                    <select value={sellerProfileDraft.pantySize || ""} onChange={(e) => updateSellerProfileField("pantySize", e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">{t("selectPantySize") || "Select panty size"}</option>
                      {PANTY_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Birthday day</span>
                    <select value={sellerProfileDraft.birthDay || ""} onChange={(e) => updateSellerProfileField("birthDay", Number(e.target.value) || null)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Birthday month</span>
                    <select value={sellerProfileDraft.birthMonth || ""} onChange={(e) => updateSellerProfileField("birthMonth", Number(e.target.value) || null)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="">Month</option>
                      {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                    </select>
                  </label>
                </div>
                {(giftCatalog || []).length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Gift preferences</span>
                    <p className="text-xs text-slate-500">Uncheck any gift types you do not want to receive.</p>
                    <div className="flex flex-wrap gap-3">
                      {(giftCatalog || []).filter(g => g.isActive).map((gift) => {
                        const disabled = (sellerProfileDraft.disabledGiftTypes || []).includes(gift.type);
                        return (
                          <label key={gift.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={!disabled}
                              onChange={() => {
                                const current = sellerProfileDraft.disabledGiftTypes || [];
                                const next = disabled ? current.filter(t => t !== gift.type) : [...current, gift.type];
                                updateSellerProfileField("disabledGiftTypes", next);
                              }}
                              className="rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                            />
                            <span>{gift.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={saveSellerProfile}
                    disabled={isSavingSellerProfile}
                    className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 ${
                      sellerProfileSaveSuccess
                        ? "border-2 border-emerald-400 bg-emerald-50 text-emerald-700 scale-[1.02]"
                        : isSavingSellerProfile
                          ? "border border-slate-200 bg-slate-50 text-slate-400 cursor-wait"
                          : "border border-rose-300 bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.97]"
                    }`}
                  >
                    {isSavingSellerProfile ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" /></svg>
                        Saving…
                      </>
                    ) : sellerProfileSaveSuccess ? (
                      <>
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        Saved!
                      </>
                    ) : t("saveProfile")}
                  </button>
                  {sellerProfileMessage ? (
                    <span className={`text-xs font-medium ${sellerProfileSaveSuccess ? "text-emerald-600" : "text-rose-600"}`}>
                      {sellerProfileMessage}
                    </span>
                  ) : null}
                </div>
              </div>
            </details>

          {/* Gifts Received */}
          {(giftPurchases || []).filter((p) => p.sellerId === currentSellerId).length > 0 && (
            <div className="mt-8 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100">
              <h3 className="text-xl font-semibold">Gifts Received</h3>
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {(giftPurchases || []).filter((p) => p.sellerId === currentSellerId).map((purchase) => (
                  <div key={purchase.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{purchase.giftType?.replace(/_/g, ' ')}</span>
                      <span className="text-slate-500">{formatPriceTHB(purchase.price)}</span>
                      {purchase.message && <span className="text-xs text-slate-400 italic">"{purchase.message}"</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{purchase.isAnonymous ? 'Anonymous' : purchase.buyerId}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${purchase.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{purchase.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <details
            id="seller-listings"
            open={sellerSectionOpen.listings}
            onToggle={(event) => {
              const isOpen = Boolean(event.currentTarget?.open);
              setSellerSectionOpen((prev) => ({ ...prev, listings: isOpen }));
            }}
            className="mt-8 overflow-hidden rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold">{t("listingLibrary")}</h3>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-slate-500">{sellerDashboardProducts.length} {t("items")}</div>
                  <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{sellerSectionOpen.listings ? t("closeLabel") : t("openLabel")}</span>
                </div>
              </div>
            </summary>

          <div className="mt-5 space-y-4">
                {sellerDashboardProducts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">{t("noListingsYet")}</div>
                    <div className="mt-1">{t("noListingsYetHelp")}</div>
                    <button onClick={() => navigate("/seller-upload")} className="mt-3 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white">
                      {t("createFirstListing")}
                    </button>
                  </div>
                ) : sellerDashboardProducts.map((product) => {
                  const normalizedStatus = String(product?.status || "").toLowerCase();
                  const isSold = soldProductIdSet.has(String(product?.id || "")) || normalizedStatus === "sold";
                  const isPublished = normalizedStatus === "published";
                  return (
                  <div key={product.id} className={`flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${isSold ? "border-emerald-200 bg-emerald-50/40" : "border-rose-100"}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{product.title}</div>
                        {product.isBundle ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">{t("setBadgeLabel")}</span> : null}
                        {isSold ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{t("soldLabel")}</span> : null}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSellerOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {isSellerOnline ? t("online") : t("offline")}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {[
                          formatPriceTHB(product.price),
                          isSold ? t("soldLabel") : (product.status || t("draftStatusLabel")),
                          product.daysWorn && product.daysWorn !== 'Unworn' && product.daysWorn !== 'Not specified' ? `${t("worn")}: ${localizeOptionLabel(normalizeLegacyLocalizedValue(product.daysWorn, DAYS_WORN_OPTIONS, DAYS_WORN_OPTIONS[0]), locale)}` : '',
                          product.condition && product.condition !== 'Not specified' ? `${t("condition")}: ${product.condition}` : '',
                          product.isBundle ? `${t("includesLabel")} ${(product.bundleItemIds || []).length} ${t("items")}` : '',
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 md:w-auto">
                      <button
                        onClick={() => publishProduct(product.id)}
                        disabled={isSold}
                        className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold md:flex-none ${isSold ? "cursor-not-allowed border-emerald-200 bg-emerald-100 text-emerald-700" : "border-rose-200 text-rose-700"}`}
                      >
                        {isSold ? t("soldLabel") : (isPublished ? t("unpublishLabel") : t("publish"))}
                      </button>
                      <button onClick={() => navigate(`/product/${product.slug}`)} className="flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none">{t("viewListing")}</button>
                      {!product.isBundle && startEditProduct ? (
                        <button
                          onClick={() => { startEditProduct(product.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          disabled={isSold}
                          className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold md:flex-none ${isSold ? "cursor-not-allowed border-slate-200 text-slate-400" : editingProductId === product.id ? "border-amber-300 bg-amber-50 text-amber-700" : "border-rose-200 text-rose-700"}`}
                        >
                          {editingProductId === product.id ? t("editingLabel") : t("editListing")}
                        </button>
                      ) : null}
                      {product.isBundle ? (
                        <button
                          onClick={() => { navigate('/seller-upload'); }}
                          disabled={isSold}
                          className={`flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none ${isSold ? "cursor-not-allowed border-slate-200 text-slate-400" : ""}`}
                        >
                          {t("editListing")}
                        </button>
                      ) : null}
                      <button
                        onClick={() => deleteProduct(product.id)}
                        disabled={deletingProductId === product.id}
                        className={`flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none ${deletingProductId === product.id ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {deletingProductId === product.id ? t("deleting") : t("delete")}
                      </button>
                    </div>
                  </div>
                );
                })}
          </div>
          </details>
          </div>
          {(sellerOrders || []).length > 0 || !isAffiliated ? (
          <details
            id="seller-orders"
            open={sellerSectionOpen.orders}
            onToggle={(event) => {
              const isOpen = Boolean(event.currentTarget?.open);
              setSellerSectionOpen((prev) => ({ ...prev, orders: isOpen }));
            }}
            className="mt-8 overflow-hidden rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold">{t("sellerOrdersTitle")}</h3>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-slate-500">{(sellerOrders || []).length} {t("items")}</div>
                  <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{sellerSectionOpen.orders ? t("closeLabel") : t("openLabel")}</span>
                </div>
              </div>
            </summary>
            <p className="mt-1 text-sm text-slate-600">{isAffiliated ? t("sellerOrdersHelpAffiliated") : t("sellerOrdersHelp")}</p>
            <div className="mt-4 space-y-4">
              {(sellerOrders || []).length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{t("noSellerOrders")}</div>
              ) : (sellerOrders || []).map((order) => (
                <div key={order.id} className="rounded-2xl border border-rose-100 p-5">
                  <div className="font-semibold">{order.id}</div>
                  <div className="mt-1 text-sm text-slate-600">{formatDateTimeNoSeconds(order.createdAt || Date.now())}</div>
                  <div className="mt-1 text-sm text-slate-600">{formatPriceTHB(order.total)} &middot; {order.paymentStatus} &middot; {order.fulfillmentStatus}</div>
                  <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <span className="font-medium">{t("shipTo")}:</span>{" "}
                    {[order.shippingAddress, order.shippingPostalCode, order.shippingCountry].filter(Boolean).join(", ") || "Not provided"}
                  </div>
                  {order.paymentStatus === "paid" ? (
                    isAffiliated ? (
                      <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                        {order.trackingNumber
                          ? <>{t("trackingCode")}: <span className="font-semibold">{order.trackingNumber}</span>{order.trackingCarrier && order.trackingCarrier !== "Not set" ? ` · ${t("carrier")}: ${order.trackingCarrier}` : ""}</>
                          : t("sellerOrdersHelpAffiliated")}
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1fr_0.95fr_auto] md:items-end">
                        <label className="text-sm text-slate-700">
                          {t("fulfillmentStatus")}
                          <select
                            value={sellerOrderShipmentDrafts[order.id]?.fulfillmentStatus || order.fulfillmentStatus || "processing"}
                            onChange={(event) => setSellerOrderShipmentDrafts((prev) => ({
                              ...prev,
                              [order.id]: {
                                fulfillmentStatus: event.target.value,
                                trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? "",
                                trackingCarrier: prev[order.id]?.trackingCarrier ?? order.trackingCarrier ?? "",
                              },
                            }))}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="processing">processing</option>
                            <option value="shipped">shipped</option>
                            <option value="delivered">delivered</option>
                          </select>
                        </label>
                        <label className="text-sm text-slate-700">
                          {t("trackingCode")}
                          <input
                            value={sellerOrderShipmentDrafts[order.id]?.trackingNumber ?? order.trackingNumber ?? ""}
                            onChange={(event) => setSellerOrderShipmentDrafts((prev) => ({
                              ...prev,
                              [order.id]: {
                                fulfillmentStatus: prev[order.id]?.fulfillmentStatus || order.fulfillmentStatus || "processing",
                                trackingNumber: event.target.value,
                                trackingCarrier: prev[order.id]?.trackingCarrier ?? order.trackingCarrier ?? "",
                              },
                            }))}
                            placeholder="e.g. TH1234567890"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </label>
                        <label className="text-sm text-slate-700">
                          {t("carrier")}
                          <select
                            value={sellerOrderShipmentDrafts[order.id]?.trackingCarrier ?? order.trackingCarrier ?? "Not set"}
                            onChange={(event) => setSellerOrderShipmentDrafts((prev) => ({
                              ...prev,
                              [order.id]: {
                                fulfillmentStatus: prev[order.id]?.fulfillmentStatus || order.fulfillmentStatus || "processing",
                                trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? "",
                                trackingCarrier: event.target.value,
                              },
                            }))}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            {TRACKING_CARRIER_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          onClick={() => {
                            const draft = sellerOrderShipmentDrafts[order.id] || {};
                            const nextStatus = draft.fulfillmentStatus || order.fulfillmentStatus || "processing";
                            const nextTracking = draft.trackingNumber ?? order.trackingNumber ?? "";
                            const nextCarrier = draft.trackingCarrier ?? order.trackingCarrier ?? "";
                            updateOrderShipment(order.id, nextStatus, nextTracking, nextCarrier);
                          }}
                          disabled={updatingOrderId === order.id}
                          className={`rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 ${updatingOrderId === order.id ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {updatingOrderId === order.id ? t("saving") : t("saveShipment")}
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="mt-3 text-xs text-slate-500">{t("shipmentControlsNote")}</div>
                  )}
                </div>
              ))}
            </div>
          </details>
          ) : null}
          <details
            id="seller-credentials"
            open={sellerSectionOpen.credentials}
            onToggle={(event) => {
              const isOpen = Boolean(event.currentTarget?.open);
              setSellerSectionOpen((prev) => ({ ...prev, credentials: isOpen }));
            }}
            className="mt-8 overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm ring-1 ring-rose-100"
          >
            <summary className="cursor-pointer list-none px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">{t("loginCredentialsTitle")}</div>
                  <div className="mt-0.5 text-sm text-slate-600">{t("loginCredentialsSubtitle")}</div>
                </div>
                <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  {sellerSectionOpen.credentials ? t("closeLabel") : t("openLabel")}
                </span>
              </div>
            </summary>
            <div className="border-t border-rose-100 px-5 pb-5 pt-4">
              <p className="text-sm text-slate-600">{t("credentialsHelp")}</p>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={accountCredentialForm.newDisplayName}
                  onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, newDisplayName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("displayNamePlaceholder")}
                />
                <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="password"
                  value={accountCredentialForm.currentPassword}
                  onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("currentPasswordPlaceholder")}
                />
                <input
                  type="email"
                  value={accountCredentialForm.newEmail}
                  onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, newEmail: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("newEmailPlaceholder")}
                />
                <input
                  type="password"
                  value={accountCredentialForm.newPassword}
                  onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("newPasswordPlaceholder")}
                />
                <input
                  type="password"
                  value={accountCredentialForm.confirmNewPassword}
                  onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder={t("confirmPasswordPlaceholder")}
                />
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-500">{t("passwordPolicyHelp")}</div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={submitAccountCredentialChanges}
                  disabled={accountCredentialSaving}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white ${accountCredentialSaving ? "cursor-not-allowed bg-rose-300" : "bg-rose-600 hover:bg-rose-700"}`}
                >
                  {accountCredentialSaving ? t("savingLabel") : t("updateCredentials")}
                </button>
                {accountCredentialMessage ? (
                  <div className={`text-sm font-medium ${accountCredentialTone === "error" ? "text-rose-700" : accountCredentialTone === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                    {accountCredentialMessage}
                  </div>
                ) : null}
              </div>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

export function SellerUploadPage({
  isSeller,
  isPendingSeller,
  isRejectedSeller,
  uploadDraft,
  setUploadDraft,
  handleUploadFile,
  createProductFromUpload,
  editingProductId,
  startEditProduct,
  cancelEditProduct,
  creatingProduct,
  sellerDashboardProducts,
  upsertBundleProduct,
  publishProduct,
  deleteProduct,
  deletingProductId,
  soldProductIds,
  isSellerOnline,
  sellerLanguage,
  sellerProfileMessage,
  sellerName,
  navigate,
}) {
  const locale = SELLER_I18N[sellerLanguage] ? sellerLanguage : "en";
  const t = (key) => SELLER_I18N[locale]?.[key] || SELLER_I18N.en[key] || key;
  const [bundleDraft, setBundleDraft] = useState({ title: "", description: "", price: "", selectedProductIds: [] });
  const [editingBundleId, setEditingBundleId] = useState("");
  const [bundleMessage, setBundleMessage] = useState("");
  const [bundleSuccess, setBundleSuccess] = useState(false);
  const bundleSourceProducts = useMemo(
    () => (sellerDashboardProducts || []).filter((product) => !product?.isBundle),
    [sellerDashboardProducts],
  );
  const existingBundleProducts = useMemo(
    () => (sellerDashboardProducts || []).filter((product) => product?.isBundle),
    [sellerDashboardProducts],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      {isPendingSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Seller application under review</h2>
          <p className="mt-2 text-slate-600">Your application has been submitted and is currently being reviewed. Seller tools unlock as soon as you are approved.</p>
        </div>
      ) : isRejectedSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Application not approved</h2>
          <p className="mt-2 text-slate-600">Unfortunately your seller application was not approved. Contact support if you believe this is an error.</p>
        </div>
      ) : !isSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Seller access required</h2>
          <p className="mt-2 text-slate-600">Only approved sellers can upload products.</p>
          <button type="button" onClick={() => navigate("/login")} className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700">Go to login</button>
        </div>
      ) : (
        <>
          <SectionTitle eyebrow={t("sellerDashboard")} title={t("mediaUpload")} subtitle={t("mediaUploadHelp")} />
          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button type="button" onClick={() => navigate("/seller-dashboard")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">{t("profile")}</button>
            <button type="button" onClick={() => navigate("/seller-messages")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">{t("messages")}</button>
            <button type="button" onClick={() => navigate("/custom-requests")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">{t("customRequestsTab")}</button>
            <button type="button" onClick={() => navigate("/stories-workspace")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">{t("sellerFeed")}</button>
            <button type="button" className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto">{t("mediaUpload")}</button>
          </div>
          <div className="grid gap-4 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="font-medium">{t("price")} (THB)</span>
                <input type="number" min={MIN_SELLER_PRICE_THB} step="1" value={uploadDraft.price} onChange={(e) => setUploadDraft((prev) => ({ ...prev, price: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={`Min ${MIN_SELLER_PRICE_THB}`} />
                {uploadDraft.price && Number(uploadDraft.price) > 0 && Number(uploadDraft.price) < MIN_SELLER_PRICE_THB ? (
                  <span className="text-xs font-medium text-rose-600">Minimum price is {MIN_SELLER_PRICE_THB} THB</span>
                ) : null}
              </label>
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="font-medium">{t("type")}</span>
                <select value={uploadDraft.style || ''} onChange={(e) => setUploadDraft((prev) => ({ ...prev, style: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Select type...</option>
                  {STYLE_OPTIONS.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, locale)}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="font-medium">{t("color")}</span>
                <select value={uploadDraft.color || ''} onChange={(e) => setUploadDraft((prev) => ({ ...prev, color: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <option value="">Select color...</option>
                  {COLOR_OPTIONS.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, locale)}</option>)}
                </select>
              </label>
            </div>
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-rose-600">Advanced options <span className="text-xs text-slate-400 group-open:hidden">&#9654;</span><span className="text-xs text-slate-400 hidden group-open:inline">&#9660;</span></summary>
              <div className="mt-3 grid gap-4">
                <div>
                  <input value={uploadDraft.title} onChange={(e) => setUploadDraft((prev) => ({ ...prev, title: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("productTitle")} />
                  <p className="mt-1 text-xs text-slate-400">Leave blank to auto-generate from your selections</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("size")}</span>
                    <select value={uploadDraft.size || ''} onChange={(e) => setUploadDraft((prev) => ({ ...prev, size: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <option value="">Select size...</option>
                      {SHARED_SIZE_OPTIONS.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, locale)}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("daysWorn")}</span>
                    <select value={uploadDraft.daysWorn || ''} onChange={(e) => setUploadDraft((prev) => ({ ...prev, daysWorn: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <option value="">Select...</option>
                      {DAYS_WORN_OPTIONS.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, locale)}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("fabric")}</span>
                    <select value={uploadDraft.fabric || ''} onChange={(e) => setUploadDraft((prev) => ({ ...prev, fabric: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <option value="">Select fabric...</option>
                      {FABRIC_OPTIONS.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, locale)}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("condition")}</span>
                    <select value={uploadDraft.condition || ''} onChange={(e) => setUploadDraft((prev) => ({ ...prev, condition: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <option value="">Select condition...</option>
                      {CONDITION_OPTIONS.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, locale)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("scentLevel")}</span>
                    <select value={uploadDraft.scentLevel || ''} onChange={(e) => setUploadDraft((prev) => ({ ...prev, scentLevel: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                      <option value="">Select scent level...</option>
                      {SCENT_LEVEL_OPTIONS.map((value) => <option key={value} value={value}>{localizeOptionLabel(value, locale)}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            </details>
            <input id="seller-product-image-input-page" type="file" accept="image/*,video/*" multiple onChange={handleUploadFile} className="hidden" />
            <div className="flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border border-dashed border-rose-300 px-3 py-2">
              <button type="button" onClick={() => document.getElementById('seller-product-image-input-page')?.click()} className="cursor-pointer rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700">{t("chooseFile")}</button>
              <span className="text-xs text-slate-600">{uploadDraft.images?.length ? `${uploadDraft.images.length} / 5 files` : t("noFileChosen")}</span>
            </div>
            <p className="text-xs text-slate-400">Upload up to 5 images or short videos (max 8 seconds per video, 5 MB per image).</p>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(uploadDraft.images || []).map((img, idx) => {
                const isCover = idx === (uploadDraft.coverIndex || 0);
                return (
                  <div key={idx} className={`relative aspect-[4/5] cursor-pointer rounded-xl ${isCover ? 'ring-2 ring-rose-500' : 'ring-1 ring-transparent hover:ring-rose-200'}`} onClick={() => setUploadDraft((prev) => ({ ...prev, coverIndex: idx }))}>
                    <ProductImage src={img.url} label={img.name || `Image ${idx + 1}`} top mediaType={img.type} />
                    {isCover ? <span className="absolute left-1 top-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">{t("coverBadge")}</span> : null}
                    <button onClick={(e) => { e.stopPropagation(); setUploadDraft((prev) => {
                      const next = prev.images.filter((_, i) => i !== idx);
                      const oldCover = prev.coverIndex || 0;
                      let newCover = oldCover;
                      if (idx === oldCover) newCover = 0;
                      else if (idx < oldCover) newCover = oldCover - 1;
                      return { ...prev, images: next, image: next[0]?.url || '', imageName: next[0]?.name || '', coverIndex: Math.min(newCover, Math.max(0, next.length - 1)) };
                    }); }} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">&times;</button>
                  </div>
                );
              })}
              {(!uploadDraft.images?.length) && (
                <div className="aspect-[4/5]"><ProductImage label={t("imagePreview")} /></div>
              )}
            </div>
            {(uploadDraft.images?.length > 1) ? <p className="text-xs text-slate-400">{t("tapToCover")}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={createProductFromUpload} disabled={creatingProduct} className={`inline-flex w-auto items-center gap-2 justify-self-start rounded-2xl px-5 py-3 font-semibold ${creatingProduct ? 'bg-slate-300 text-slate-500 cursor-wait' : 'bg-rose-600 text-white'}`}>{creatingProduct ? (editingProductId ? t("updatingListing") : t("creatingListing")) : (editingProductId ? t("updateListing") : t("createDraft"))}</button>
              {editingProductId ? (
                <button type="button" onClick={cancelEditProduct} className="inline-flex w-auto rounded-2xl border border-rose-200 px-5 py-3 font-semibold text-rose-700">{t("cancelEditListing")}</button>
              ) : null}
            </div>
            {sellerProfileMessage ? (
              <span className={`text-sm font-medium ${sellerProfileMessage.toLowerCase().includes('created') || sellerProfileMessage.toLowerCase().includes('updated') ? 'text-emerald-600' : 'text-rose-600'}`}>{sellerProfileMessage}</span>
            ) : null}
          </div>
          <div className="mt-5 rounded-3xl border border-rose-100 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold">{t("setBuilderTitle")}</h4>
                <p className="mt-1 text-sm text-slate-600">{bundleSourceProducts.length >= 2 ? t("setBuilderHelp") : t("setBuilderNeedMore")}</p>
              </div>
              {editingBundleId ? (
                <button type="button" onClick={() => { setEditingBundleId(""); setBundleDraft({ title: "", description: "", price: "", selectedProductIds: [] }); setBundleMessage(""); }} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">{t("cancelEdit")}</button>
              ) : null}
            </div>
            {bundleSourceProducts.length >= 2 ? (<>
            <div className="mt-4">
              <label className="grid gap-1 text-sm text-slate-600">
                <span className="font-medium">{t("combinedSetPriceLabel")}</span>
                <input type="number" min={MIN_SELLER_PRICE_THB} step="1" value={bundleDraft.price} onChange={(event) => { setBundleMessage(""); setBundleDraft((prev) => ({ ...prev, price: event.target.value })); }} className="max-w-xs rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("setPricePlaceholder")} />
              </label>
            </div>
            <div className="mt-4">
              <div className="text-sm font-medium text-slate-700">{t("selectProductsToInclude")}</div>
              <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-rose-100 bg-white p-3">
                {bundleSourceProducts.map((product) => {
                  const selected = bundleDraft.selectedProductIds.includes(product.id);
                  return (
                    <label key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selected} onChange={() => { setBundleMessage(""); setBundleDraft((prev) => ({ ...prev, selectedProductIds: selected ? prev.selectedProductIds.filter((id) => id !== product.id) : [...prev.selectedProductIds, product.id] })); }} />
                        <span>{product.title}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{formatPriceTHB(product.price)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-slate-600">{t("advancedSetOptions")}</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1 text-sm text-slate-600">
                  <span className="font-medium">{t("setTitleLabel")}</span>
                  <input value={bundleDraft.title} onChange={(event) => { setBundleMessage(""); setBundleDraft((prev) => ({ ...prev, title: event.target.value })); }} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("setTitlePlaceholder")} />
                </label>
                <label className="grid gap-1 text-sm text-slate-600">
                  <span className="font-medium">{t("setDescriptionLabel")}</span>
                  <textarea value={bundleDraft.description || ""} onChange={(event) => { setBundleMessage(""); setBundleDraft((prev) => ({ ...prev, description: event.target.value })); }} className="rounded-2xl border border-slate-200 px-4 py-3" rows={3} placeholder={t("setDescriptionPlaceholder")} />
                </label>
              </div>
            </details>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => { upsertBundleProduct({ bundleId: editingBundleId || "", title: bundleDraft.title, description: bundleDraft.description, price: bundleDraft.price, selectedProductIds: bundleDraft.selectedProductIds, sellerName: sellerName }, (message) => { setBundleSuccess(true); setBundleMessage(message || t("setSaved")); setEditingBundleId(""); setBundleDraft({ title: "", description: "", price: "", selectedProductIds: [] }); }, (errorMessage) => { setBundleSuccess(false); setBundleMessage(errorMessage || t("setSaveFailed")); }); }} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">{editingBundleId ? t("updateSetProduct") : t("createSetProduct")}</button>
            </div>
            </>) : null}
            {bundleMessage ? <div className={`mt-3 text-sm font-medium ${bundleSuccess ? 'text-emerald-700' : 'text-rose-700'}`}>{bundleMessage}</div> : null}
            {existingBundleProducts.length > 0 ? (
              <div className="mt-5 space-y-2 rounded-2xl border border-rose-100 bg-white p-3">
                <div className="text-sm font-medium text-slate-700">{t("existingSetProducts")}</div>
                {existingBundleProducts.map((bundle) => (
                  <div key={bundle.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{bundle.title}</div>
                      <div className="text-xs text-slate-500">{(bundle.bundleItemIds || []).length} {t("items")} · {formatPriceTHB(bundle.price)}</div>
                    </div>
                    <button type="button" onClick={() => { setBundleMessage(""); setEditingBundleId(bundle.id); setBundleDraft({ title: bundle.title || "", price: String(bundle.price || ""), selectedProductIds: Array.isArray(bundle.bundleItemIds) ? bundle.bundleItemIds : [] }); }} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">{t("editSet")}</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-8 rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold">{t("listingLibrary")}</h3>
              <div className="text-sm text-slate-500">{(sellerDashboardProducts || []).length} {t("items")}</div>
            </div>
            <div className="mt-5 space-y-4">
              {(sellerDashboardProducts || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{t("noListingsYet")}</div>
                  <div className="mt-1">{t("noListingsYetHelp")}</div>
                </div>
              ) : (sellerDashboardProducts || []).map((product) => {
                const soldProductIdSet = new Set((soldProductIds || []).map(String));
                const normalizedStatus = String(product?.status || "").toLowerCase();
                const isSold = soldProductIdSet.has(String(product?.id || "")) || normalizedStatus === "sold";
                const isPublished = normalizedStatus === "published";
                return (
                  <div key={product.id} className={`flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${isSold ? "border-emerald-200 bg-emerald-50/40" : "border-rose-100"}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{product.title}</div>
                        {product.isBundle ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">{t("setBadgeLabel")}</span> : null}
                        {isSold ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{t("soldLabel")}</span> : null}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSellerOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {isSellerOnline ? t("online") : t("offline")}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {[
                          formatPriceTHB(product.price),
                          isSold ? t("soldLabel") : (product.status || t("draftStatusLabel")),
                          product.daysWorn && product.daysWorn !== 'Unworn' && product.daysWorn !== 'Not specified' ? `${t("worn")}: ${localizeOptionLabel(normalizeLegacyLocalizedValue(product.daysWorn, DAYS_WORN_OPTIONS, DAYS_WORN_OPTIONS[0]), locale)}` : '',
                          product.condition && product.condition !== 'Not specified' ? `${t("condition")}: ${product.condition}` : '',
                          product.isBundle ? `${t("includesLabel")} ${(product.bundleItemIds || []).length} ${t("items")}` : '',
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 md:w-auto">
                      <button
                        onClick={() => publishProduct(product.id)}
                        disabled={isSold}
                        className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold md:flex-none ${isSold ? "cursor-not-allowed border-emerald-200 bg-emerald-100 text-emerald-700" : "border-rose-200 text-rose-700"}`}
                      >
                        {isSold ? t("soldLabel") : (isPublished ? t("unpublishLabel") : t("publish"))}
                      </button>
                      <button onClick={() => navigate(`/product/${product.slug}`)} className="flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none">{t("viewListing")}</button>
                      {!product.isBundle && startEditProduct ? (
                        <button
                          onClick={() => { startEditProduct(product.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          disabled={isSold}
                          className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold md:flex-none ${isSold ? "cursor-not-allowed border-slate-200 text-slate-400" : editingProductId === product.id ? "border-amber-300 bg-amber-50 text-amber-700" : "border-rose-200 text-rose-700"}`}
                        >
                          {editingProductId === product.id ? t("editingLabel") : t("editListing")}
                        </button>
                      ) : null}
                      {product.isBundle ? (
                        <button
                          onClick={() => { setBundleMessage(""); setEditingBundleId(product.id); setBundleDraft({ title: product.title || "", description: product.description || "", price: String(product.price || ""), selectedProductIds: Array.isArray(product.bundleItemIds) ? product.bundleItemIds : [] }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          disabled={isSold}
                          className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold md:flex-none ${isSold ? "cursor-not-allowed border-slate-200 text-slate-400" : editingBundleId === product.id ? "border-amber-300 bg-amber-50 text-amber-700" : "border-rose-200 text-rose-700"}`}
                        >
                          {editingBundleId === product.id ? t("editingLabel") : t("editListing")}
                        </button>
                      ) : null}
                      <button
                        onClick={() => deleteProduct(product.id)}
                        disabled={deletingProductId === product.id}
                        className={`flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none ${deletingProductId === product.id ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {deletingProductId === product.id ? t("deleting") : t("delete")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function StoriesWorkspacePage({
  isSeller,
  isPendingSeller,
  isRejectedSeller,
  sellerMap,
  currentSellerId,
  currentSellerProfile,
  sellerDashboardPosts,
  sellerPostDraft,
  sellerPostDraftSavedAt,
  setSellerPostDraft,
  handleSellerPostImageUpload,
  createSellerPost,
  creatingSellerPost,
  deleteSellerPost,
  deletingSellerPostId,
  sellerLanguage,
  isSellerOnline,
  updateSellerPostVisibility,
  updateSellerPostPrice,
  updateAllPrivatePostPrices,
  unscheduleSellerPost,
  publishSellerPostNow,
  sellerPostAnalytics,
  navigate,
}) {
  const locale = SELLER_I18N[sellerLanguage] ? sellerLanguage : "en";
  const t = (key) => SELLER_I18N[locale]?.[key] || SELLER_I18N.en[key] || key;
  const draftPostVisibility = sellerPostDraft.visibility === "private" ? "private" : "public";
  const effectiveDraftVisibility = draftPostVisibility;
  const unlockRevenue = Number(sellerPostAnalytics?.unlockRevenue || 0);
  const messageRevenue = Number(sellerPostAnalytics?.messageRevenue || 0);
  const netEarnings = Number(
    sellerPostAnalytics?.totalRevenue
    ?? Number((unlockRevenue + messageRevenue).toFixed(2))
  );
  const sellerPayoutRatio = String(currentSellerProfile?.affiliatedBarId || "").trim() ? 0.34 : 0.5;
  const grossMessageFees = Number((messageRevenue / sellerPayoutRatio).toFixed(2));
  const grossEarnings = Number((unlockRevenue + grossMessageFees).toFixed(2));

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      {isPendingSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Seller application under review</h2>
          <p className="mt-2 text-slate-600">Your application has been submitted and is currently being reviewed. Seller tools unlock as soon as you are approved.</p>
        </div>
      ) : isRejectedSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Seller application rejected</h2>
          <p className="mt-2 text-slate-600">Your previous application was not approved. Update your details and submit a new registration.</p>
          <button onClick={() => navigate("/register")} className="mt-5 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white">Reapply as Seller</button>
        </div>
      ) : !isSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">{t("loginRequired")}</h2>
          <p className="mt-2 text-slate-600">Please log in with a seller account to continue.</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700"
          >
            Go to login
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button type="button" onClick={() => navigate("/seller-dashboard")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
              {t("quickProfile")}
            </button>
            <button type="button" onClick={() => navigate("/seller-messages")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
              {t("messagesTab")}
            </button>
            <button type="button" onClick={() => navigate("/custom-requests")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
              {t("customRequestsTab")}
            </button>
            <button type="button" className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto">
              {t("feedEyebrow")}
            </button>
          </div>
          <SectionTitle eyebrow={t("feedEyebrow")} title={t("createFeedPost")} subtitle={t("createFeedPostHelp")} />
          <div className="mt-6 space-y-6">
            <details id="seller-post-create" className="overflow-hidden rounded-3xl border border-rose-100 bg-slate-50 p-5" open>
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">{t("createFeedPost")}</h3>
                  <span className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                </div>
              </summary>
              <div className="mt-5 grid gap-4">
                <input
                  id="seller-post-image-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleSellerPostImageUpload}
                  className="sr-only"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="seller-post-image-input" className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700">
                    {t("chooseFile")}
                  </label>
                  {sellerPostDraft.image ? (
                    <button type="button" onClick={() => setSellerPostDraft((prev) => ({ ...prev, image: "", imageName: "" }))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600">
                      {t("removeImage")}
                    </button>
                  ) : null}
                  <span className="text-xs text-slate-500">{sellerPostDraft.imageName || t("noFileChosen")}</span>
                </div>
                {sellerPostDraft.image ? (
                  <div className="aspect-[4/5] max-w-xs"><ProductImage src={sellerPostDraft.image} label={sellerPostDraft.imageName || "Stories image"} top mediaType={sellerPostDraft.mediaType} /></div>
                ) : (
                  <div className="aspect-[4/5] max-w-xs"><ProductImage label={t("postImagePreview")} /></div>
                )}
                <textarea
                  value={sellerPostDraft.caption}
                  onChange={(e) => setSellerPostDraft((prev) => ({ ...prev, caption: e.target.value }))}
                  className="min-h-[96px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  maxLength={500}
                  placeholder={t("captionPlaceholder")}
                />
                <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("postVisibility")}</span>
                    <select
                      value={draftPostVisibility}
                      onChange={(event) => setSellerPostDraft((prev) => ({ ...prev, visibility: event.target.value === "private" ? "private" : "public" }))}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    >
                      <option value="public">{localizeOptionLabel("Public", locale)}</option>
                      <option value="private">{localizeOptionLabel("Private (paid)", locale)}</option>
                    </select>
                  </label>
                  {effectiveDraftVisibility === "private" ? (
                    <label className="grid max-w-sm gap-1 text-sm text-slate-600">
                      <span className="font-medium">{t("privateUnlockPrice")}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={sellerPostDraft.accessPriceUsd ?? ""}
                        onChange={(event) =>
                          setSellerPostDraft((prev) => ({
                            ...prev,
                            accessPriceUsd: event.target.value,
                          }))
                        }
                        className={`rounded-2xl border px-4 py-3 text-sm ${Number(sellerPostDraft.accessPriceUsd) < MIN_FEED_UNLOCK_PRICE_THB ? "border-rose-400" : "border-slate-200"}`}
                      />
                      {Number(sellerPostDraft.accessPriceUsd) < MIN_FEED_UNLOCK_PRICE_THB ? (
                        <span className="text-xs text-rose-600">{t("privateUnlockPrice")} must be at least {MIN_FEED_UNLOCK_PRICE_THB} THB</span>
                      ) : null}
                    </label>
                  ) : <div />}
                </div>
                <label className="grid max-w-md gap-1 text-sm text-slate-600">
                  <span className="font-medium">{t("scheduleOptional")}</span>
                  <input
                    type="datetime-local"
                    value={sellerPostDraft.scheduledFor || ""}
                    onChange={(event) => setSellerPostDraft((prev) => ({ ...prev, scheduledFor: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  />
                  <span className="text-[11px] text-slate-500">{t("futureTimeOnly")}</span>
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    {sellerPostDraft.caption.length}/500
                    {sellerPostDraftSavedAt ? ` · Draft auto-saved ${formatTimeNoSeconds(sellerPostDraftSavedAt)}` : ""}
                  </div>
                  <button
                    onClick={createSellerPost}
                    disabled={creatingSellerPost}
                    className={`w-full rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white sm:w-auto ${creatingSellerPost ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {creatingSellerPost ? t("posting") : t("postToFeed")}
                  </button>
                </div>
              </div>
            </details>
            <details className="overflow-hidden rounded-3xl border border-rose-100 bg-slate-50 p-5" open>
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">{t("yourFeedPosts")}</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-500">{sellerDashboardPosts.length} post(s)</div>
                    <span className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                  </div>
                </div>
              </summary>
              <div className="mt-4 space-y-3">
                {sellerDashboardPosts.length === 0 ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">{t("noPosts")}</div>
                ) : sellerDashboardPosts.map((post) => (
                  <div key={post.id} className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSellerOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {isSellerOnline ? t("online") : t("offline")}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteSellerPost(post.id)}
                        disabled={deletingSellerPostId === post.id}
                        className={`rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${deletingSellerPostId === post.id ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {deletingSellerPostId === post.id ? t("deleting") : t("delete")}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {post.scheduledFor && new Date(post.scheduledFor).getTime() > Date.now() ? (
                        <>
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{t("scheduledLabel")}: {formatDateTimeNoSeconds(post.scheduledFor)}</span>
                          <button
                            onClick={() => unscheduleSellerPost(post.id)}
                            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700"
                          >
                            {t("unschedule")}
                          </button>
                          <button
                            onClick={() => publishSellerPostNow(post.id)}
                            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                          >
                            {t("publishNow")}
                          </button>
                        </>
                      ) : null}
                      <span className="text-xs text-slate-500">{t("postVisibility")}</span>
                      <select
                        value={post.visibility === "private" ? "private" : "public"}
                        onChange={(event) => updateSellerPostVisibility(post.id, event.target.value, post.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="public">{localizeOptionLabel("Public", locale)}</option>
                        <option value="private">{localizeOptionLabel("Private (paid)", locale)}</option>
                      </select>
                      {post.visibility === "private" ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={post.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB}
                          onChange={(event) => updateSellerPostPrice(post.id, event.target.value)}
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        />
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-slate-700">{post.caption || t("noCaption")}</div>
                    <div className="mt-3 aspect-[4/5] max-w-xs">{post.image ? <ProductImage src={post.image} label={post.imageName || "Stories image"} top mediaType={post.mediaType} /> : <ProductImage label={t("noImage")} />}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-rose-100 md:grid-cols-4">
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("lockedPosts")}</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.lockedPostCount}</div></div>
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("paidUnlocks")}</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.unlockCount}</div></div>
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("unlockRevenue")}</div><div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(sellerPostAnalytics.unlockRevenue)}</div></div>
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("topPost")}</div><div className="mt-1 text-xs text-slate-600">{sellerPostAnalytics.topPostTitle} ({sellerPostAnalytics.topPostUnlocks})</div></div>
              </div>
              <div className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">{t("earnings")}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("grossEarnings")}</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{formatPriceTHB(grossEarnings)}</div>
                    <div className="mt-1 text-xs text-slate-500">{t("grossEarningsHelp")}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-emerald-700">{t("netEarnings")}</div>
                    <div className="mt-1 text-2xl font-semibold text-emerald-800">{formatPriceTHB(netEarnings)}</div>
                    <div className="mt-1 text-xs text-emerald-700">{t("netEarningsHelp")}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-rose-100 md:grid-cols-4">
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("scheduledPosts")}</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.scheduledPostCount}</div></div>
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("likes")}</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.likeCount}</div></div>
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("comments")}</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.commentCount}</div></div>
                <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{t("followers")}</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.followerCount}</div></div>
              </div>
              <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-rose-100">
                {t("engagement7Day")}: <span className="font-semibold text-slate-900">{sellerPostAnalytics.recentEngagement}</span>
                {" · "}
                {t("trendVsPrevious7Day")}: <span className={`font-semibold ${sellerPostAnalytics.engagementTrendPct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{sellerPostAnalytics.engagementTrendPct >= 0 ? "+" : ""}{sellerPostAnalytics.engagementTrendPct}%</span>
              </div>
            </details>
          </div>
        </>
      )}
    </section>
  );
}

export function SellerMessagesPage({
  isSeller,
  isPendingSeller,
  isRejectedSeller,
  sellerInbox,
  sellerMessageHistory,
  setSellerSelectedConversationId,
  markNotificationsReadForConversation,
  sellerActiveConversationId,
  sellerActiveConversationMessages,
  sellerReplyDraft,
  setSellerReplyDraft,
  sendSellerReply,
  sendBarConversationMessage,
  sellerReplyMedia,
  setSellerReplyMedia,
  uploadMediaFile,
  validateVideoFile,
  barMap,
  sellerLanguage,
  currentUser,
  navigate
}) {
  const locale = SELLER_I18N[sellerLanguage] ? sellerLanguage : "en";
  const t = (key) => SELLER_I18N[locale]?.[key] || SELLER_I18N.en[key] || key;
  const sellerWritingPresetText = SELLER_WRITING_PRESETS_I18N[locale] || SELLER_WRITING_PRESETS_I18N.en;
  const [showOriginalMessageById, setShowOriginalMessageById] = useState({});
  const sellerMessagesContainerRef = useRef(null);
  useEffect(() => {
    if (sellerMessagesContainerRef.current && sellerActiveConversationMessages?.length > 0) {
      sellerMessagesContainerRef.current.scrollTop = sellerMessagesContainerRef.current.scrollHeight;
    }
  }, [sellerActiveConversationMessages, sellerActiveConversationId]);
  const safeSellerInbox = (sellerInbox || []).filter((message) => message && typeof message === "object");
  const safeSellerMessageHistory = (sellerMessageHistory || []).filter((message) => message && typeof message === "object");
  const safeSellerActiveConversationMessages = (sellerActiveConversationMessages || []).filter((message) => message && typeof message === "object");
  const sellerInboxReceivedCount = safeSellerMessageHistory.filter((message) => message.senderRole === "buyer").length;
  const sellerInboxSentCount = safeSellerMessageHistory.filter((message) => message.senderRole === "seller").length;
  const sellerUnreadConversationCount = safeSellerInbox.filter((message) => message.hasUnread ?? !message.readBySeller).length;
  const parseBuyerIdFromConversationId = (conversationId) => {
    const [buyerId] = String(conversationId || "").split("__");
    return String(buyerId || "").trim();
  };
  const resolveBuyerDisplayName = (row) => {
    if (!row) return t("unknownBuyer");
    const explicitName = String(row.buyerName || row.buyerDisplayName || row.counterpartName || "").trim();
    if (explicitName) return explicitName;
    const explicitId = String(row.buyerId || row.counterpartId || "").trim();
    if (explicitId) return explicitId;
    const parsedBuyerId = parseBuyerIdFromConversationId(row.conversationId);
    return parsedBuyerId || t("unknownBuyer");
  };
  const getConversationInitials = (label) => {
    const parts = String(label || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };
  const activeSellerConversation = safeSellerInbox.find((row) => row.conversationId === sellerActiveConversationId) || null;
  const isActiveBarThread = Boolean(activeSellerConversation?._isBarThread);
  const activeSellerConversationLabel = isActiveBarThread ? (activeSellerConversation?._barName || "Bar") : resolveBuyerDisplayName(activeSellerConversation);
  const activeSellerConversationInitials = getConversationInitials(activeSellerConversationLabel);
  const resolveConversationMessageBody = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = (message?.senderId || message?.senderUserId) === currentUser?.id;
    const showOriginal = Boolean(showOriginalMessageById[message?.id]);
    if (isOwnMessage || showOriginal) return original;
    return translated || original;
  };
  const canToggleConversationTranslation = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = (message?.senderId || message?.senderUserId) === currentUser?.id;
    return !isOwnMessage && Boolean(translated) && translated !== original;
  };
  const applyPresetToDraft = (currentValue, preset) => {
    if (String(currentValue || "").trim()) return `${String(currentValue || "").trim()}\n${preset}`;
    return preset;
  };
  if (isPendingSeller || isRejectedSeller || !isSeller) {
    return (
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 md:pb-16 md:py-16">
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <h2 className="text-2xl font-bold">{t("loginRequired")}</h2>
          <p className="mt-2 text-slate-600">Please log in with a seller account to continue.</p>
          <button onClick={() => navigate("/login")} className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700">
            Go to login
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button onClick={() => navigate("/seller-dashboard")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
          {t("quickProfile")}
        </button>
        <button className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto">
          {t("messagesTab")}
        </button>
        <button onClick={() => navigate("/custom-requests")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
          {t("customRequestsTab")}
        </button>
        <button onClick={() => navigate("/stories-workspace")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
          {t("feedEyebrow")}
        </button>
      </div>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{t("messagesTab")}</div>
        <h2 className="text-2xl font-bold text-slate-900">{t("inbox")}</h2>
      </div>
      <div id="seller-inbox" className="rounded-3xl border border-rose-100 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-600" />
            <h3 className="text-xl font-semibold">{t("inbox")}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{t("liveUpdates")}</div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${sellerUnreadConversationCount > 0 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-white text-slate-700 ring-rose-100"}`}>
              Unread {sellerUnreadConversationCount}
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">{safeSellerInbox.length} {t("conversations")}</div>
            <div className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100 sm:inline-flex">Received {sellerInboxReceivedCount}</div>
            <div className="hidden rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100 sm:inline-flex">Sent {sellerInboxSentCount}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {safeSellerInbox.length === 0 ? <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">{t("noMessages")}</div> : safeSellerInbox.map((message) => {
              const isBarThread = Boolean(message._isBarThread);
              const buyerName = isBarThread ? (message._barName || "Bar") : resolveBuyerDisplayName(message);
              const buyerInitials = getConversationInitials(buyerName);
              return (
                <button key={message.conversationId || message.id} onClick={() => { setSellerSelectedConversationId(message.conversationId); markNotificationsReadForConversation(message.conversationId); }} className={`block w-full rounded-2xl p-4 text-left ring-1 ${message.hasUnread ?? !message.readBySeller ? "ring-amber-200 bg-amber-50" : "ring-rose-100"} ${sellerActiveConversationId === message.conversationId ? 'bg-rose-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2">
                      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isBarThread ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>{buyerInitials}</span>
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{buyerName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{isBarThread ? "Bar conversation" : t("customerConversation")}</div>
                        <div className="mt-1 truncate text-sm text-slate-500">{message.body}</div>
                      </div>
                    </div>
                    {message.hasUnread ?? !message.readBySeller ? <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">New</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
            {safeSellerActiveConversationMessages.length === 0 ? <div className="text-sm text-slate-500">{t("selectConversation")}</div> : (
              <>
                <div className="mb-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">{activeSellerConversationInitials}</span>
                  <span>{t("chattingWith")}: {activeSellerConversationLabel}</span>
                </div>
                <div ref={sellerMessagesContainerRef} className="max-h-64 space-y-3 overflow-y-auto">
                  {safeSellerActiveConversationMessages.map((message) => (
                    <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${(message.senderRole === 'seller' || (isActiveBarThread && message.senderRole !== 'bar')) ? 'ml-auto bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {message.mediaUrl ? (
                        message.mediaType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(message.mediaUrl)
                          ? <video src={message.mediaUrl} controls playsInline loop muted className="mb-2 max-h-48 rounded-xl" />
                          : <img src={message.mediaUrl} alt="" className="mb-2 max-h-48 rounded-xl object-cover" />
                      ) : null}
                      {resolveConversationMessageBody(message)}
                      {canToggleConversationTranslation(message) ? (
                        <button
                          type="button"
                          onClick={() => setShowOriginalMessageById((prev) => ({ ...prev, [message.id]: !prev[message.id] }))}
                          className={`mt-2 block text-[11px] font-semibold ${message.senderRole === 'seller' ? 'text-rose-100' : 'text-slate-500'}`}
                        >
                          {showOriginalMessageById[message.id] ? t("showTranslation") : t("showOriginal")}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{sellerWritingPresetText.messagePresetLabel}</div>
                  <div className="mt-2 space-y-2">
                    {(sellerWritingPresetText.inboxMessageCategories || sellerWritingPresetText.messageCategories || []).map((category) => (
                      <div key={category.label}>
                        <div className="text-[11px] font-semibold text-slate-500">{category.label}</div>
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {(category.presets || []).map((preset) => (
                            <button
                              key={`${category.label}-${preset}`}
                              type="button"
                              onClick={() => setSellerReplyDraft(applyPresetToDraft(sellerReplyDraft, preset))}
                              className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <div className="flex-1 space-y-2">
                    <textarea value={sellerReplyDraft} onChange={(e) => setSellerReplyDraft(e.target.value)} className="min-h-[96px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={t("replyPlaceholder")} />
                    {sellerReplyMedia ? (
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                        {sellerReplyMedia.type === "video" ? <span>Video: {sellerReplyMedia.name}</span> : <img src={sellerReplyMedia.url} alt="" className="h-10 w-10 rounded object-cover" />}
                        <button onClick={() => setSellerReplyMedia(null)} className="ml-auto text-rose-600 font-semibold text-xs">Remove</button>
                      </div>
                    ) : null}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:text-rose-600">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span>Attach</span>
                      <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = "";
                        try {
                          if (file.type.startsWith("video/")) { await validateVideoFile(file); }
                          const result = await uploadMediaFile(file);
                          setSellerReplyMedia({ url: result.url, type: result.type, name: file.name });
                        } catch (err) { window.alert(typeof err === "string" ? err : "Upload failed."); }
                      }} />
                    </label>
                  </div>
                  <button onClick={() => { if (isActiveBarThread && sendBarConversationMessage) { sendBarConversationMessage(); } else { sendSellerReply(); } }} className="w-full rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white sm:w-auto sm:self-end">{t("reply")}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function BarMessagesPage({
  currentUser,
  barMap,
  barMessageInbox,
  barMessageEligibleContacts,
  barMessageActiveConversationId,
  setBarMessageActiveConversationId,
  barMessageActiveConversationMessages,
  barReplyDraft,
  setBarReplyDraft,
  sendBarConversationMessage,
  barConversationMessageError,
  messageReports,
  reportBarConversationMessage,
  reportingDirectMessageId,
  markNotificationsReadForConversation,
  uiLanguage = "en",
  navigate,
}) {
  const isBar = currentUser?.role === "bar";
  const isParticipant = currentUser?.role === "buyer" || currentUser?.role === "seller";
  const locale = ACCOUNT_PAGE_I18N[uiLanguage] ? uiLanguage : "en";
  const tx = (key) => ACCOUNT_PAGE_I18N[locale]?.[key] || ACCOUNT_PAGE_I18N.en[key] || key;
  const [messageReportOpenById, setMessageReportOpenById] = useState({});
  const [messageReportReasonById, setMessageReportReasonById] = useState({});
  const [messageReportDetailsById, setMessageReportDetailsById] = useState({});
  const [messageReportErrorById, setMessageReportErrorById] = useState({});
  const barMessagesContainerRef = useRef(null);
  useEffect(() => {
    if (barMessagesContainerRef.current && barMessageActiveConversationMessages?.length > 0) {
      barMessagesContainerRef.current.scrollTop = barMessagesContainerRef.current.scrollHeight;
    }
  }, [barMessageActiveConversationMessages, barMessageActiveConversationId]);
  if (!isBar && !isParticipant) {
    return (
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 md:pb-16 md:py-16">
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <h2 className="text-2xl font-bold">Login required</h2>
          <p className="mt-2 text-slate-600">Please log in with a buyer, seller, or bar account to continue.</p>
          <button onClick={() => navigate("/login")} className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700">
            Go to login
          </button>
        </div>
      </section>
    );
  }
  const activeConversation = (barMessageInbox || []).find((row) => row.conversationId === barMessageActiveConversationId) || null;
  const reportedOpenMessageIds = useMemo(
    () => new Set(
      (messageReports || [])
        .filter((entry) => entry.reporterUserId === currentUser?.id && entry.status !== "resolved" && entry.status !== "dismissed")
        .map((entry) => entry.messageId)
    ),
    [messageReports, currentUser?.id]
  );
  const messageReportReasonOptions = [
    { value: "direct_payment_request", label: tx("reportReasonDirectPayment") },
    { value: "off_platform_contact", label: tx("reportReasonOffPlatform") },
    { value: "harassment_abuse", label: tx("reportReasonHarassment") },
    { value: "scam_fraud", label: tx("reportReasonScam") },
    { value: "other", label: tx("reportReasonOther") },
  ];
  const getMessageReportReasonLabel = (reasonCategory) => (
    messageReportReasonOptions.find((entry) => entry.value === reasonCategory)?.label || tx("reportReasonOther")
  );
  const submitMessageReport = async (message) => {
    if (!message?.id) return;
    const reasonCategory = messageReportReasonById[message.id] || "off_platform_contact";
    const details = String(messageReportDetailsById[message.id] || "").trim();
    if (reasonCategory === "other" && !details) {
      setMessageReportErrorById((prev) => ({ ...prev, [message.id]: tx("reportDetailsRequiredOther") }));
      return;
    }
    const reasonLabel = getMessageReportReasonLabel(reasonCategory);
    const reportBody = details ? `${reasonLabel}: ${details}` : reasonLabel;
    const didSubmit = await reportBarConversationMessage?.(message.id, reasonCategory, reportBody);
    if (!didSubmit) {
      setMessageReportErrorById((prev) => ({ ...prev, [message.id]: tx("reportSubmitFailed") }));
      return;
    }
    setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
    setMessageReportOpenById((prev) => ({ ...prev, [message.id]: false }));
  };
  const activeLabel = isBar
    ? `${activeConversation?.participantName || "Guest"}${activeConversation?.participantRole ? ` (${activeConversation.participantRole})` : ""}`
    : (barMap?.[activeConversation?.barId || ""]?.name || activeConversation?.barName || "Bar");
  const unreadCount = (barMessageInbox || []).filter((row) => row.hasUnread).length;
  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      {isBar ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button type="button" onClick={() => navigate("/bar-dashboard")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {tx("barProfile")}
          </button>
          <button type="button" onClick={() => navigate("/bar-feed-workspace")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {tx("barFeedTab")}
          </button>
          <button type="button" className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto">
            {tx("messages")}
          </button>
          <button type="button" onClick={() => navigate("/stories")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {tx("watchFeeds")}
          </button>
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button type="button" onClick={() => navigate("/account")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            Profile
          </button>
          <button type="button" className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto">
            Bar messages
          </button>
          <button type="button" onClick={() => navigate("/stories")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            Watch Feeds
          </button>
        </div>
      )}
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Messaging</div>
        <h2 className="text-2xl font-bold text-slate-900">{isBar ? "Bar inbox" : "Your bar conversations"}</h2>
      </div>
      <div className="rounded-3xl border border-rose-100 bg-slate-50 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-rose-600" />
            <h3 className="text-xl font-semibold">Conversations</h3>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${unreadCount > 0 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-white text-slate-700 ring-rose-100"}`}>
            Unread {unreadCount}
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {isBar && (barMessageEligibleContacts || []).length > 0 ? (
              <div className="rounded-2xl border border-rose-200 bg-white p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-500">Eligible contacts</div>
                <div className="mt-2 space-y-2">
                  {(barMessageEligibleContacts || []).map((contact) => (
                    <button
                      key={`eligible_${contact.conversationId}`}
                      type="button"
                      onClick={() => setBarMessageActiveConversationId(contact.conversationId)}
                      className={`block w-full rounded-xl border px-3 py-2 text-left ${barMessageActiveConversationId === contact.conversationId ? "border-rose-300 bg-rose-50" : "border-rose-100 bg-slate-50"}`}
                    >
                      <div className="text-sm font-semibold text-slate-800">
                        {contact.participantName} ({contact.participantRole})
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">{(contact.sourceLabels || []).join(" · ")}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">Select one contact to message. Bulk select is disabled.</div>
              </div>
            ) : null}
            {(barMessageInbox || []).length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">No conversations yet.</div>
            ) : (barMessageInbox || []).map((row) => (
              <button
                key={row.conversationId}
                onClick={() => {
                  setBarMessageActiveConversationId(row.conversationId);
                  markNotificationsReadForConversation(row.conversationId);
                }}
                className={`block w-full rounded-2xl p-4 text-left ring-1 ${row.hasUnread ? "ring-amber-200 bg-amber-50" : "ring-rose-100"} ${barMessageActiveConversationId === row.conversationId ? "bg-rose-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {isBar ? `${row.participantName}${row.participantRole ? ` (${row.participantRole})` : ""}` : (row.barName || row.barId)}
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">{row.body || ""}</div>
                  </div>
                  {row.hasUnread ? <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">New</span> : null}
                </div>
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
            {!barMessageActiveConversationId ? (
              <div className="text-sm text-slate-500">Select a conversation.</div>
            ) : (
              <>
                <div className="mb-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                  Chatting with: {activeLabel}
                </div>
                <div ref={barMessagesContainerRef} className="max-h-64 space-y-3 overflow-y-auto">
                  {(barMessageActiveConversationMessages || []).length === 0 ? (
                    <div className="text-sm text-slate-500">No messages yet. Send the first message.</div>
                  ) : (barMessageActiveConversationMessages || []).map((message) => (
                    <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.senderId === currentUser?.id ? "ml-auto bg-rose-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                      {message.mediaUrl ? (
                        message.mediaType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(message.mediaUrl)
                          ? <video src={message.mediaUrl} controls playsInline loop muted className="mb-2 max-h-48 rounded-xl" />
                          : <img src={message.mediaUrl} alt="" className="mb-2 max-h-48 rounded-xl object-cover" />
                      ) : null}
                      {message.body}
                      {message.senderId !== currentUser?.id && String(message.senderRole || "").toLowerCase() === "bar" ? (
                        <div className="mt-2">
                          {reportedOpenMessageIds.has(message.id) ? (
                            <div className="text-[11px] font-semibold text-amber-700">{tx("alreadyReportedMessage")}</div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMessageReportOpenById((prev) => ({ ...prev, [message.id]: !prev[message.id] }));
                                setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
                                if (!messageReportReasonById[message.id]) {
                                  setMessageReportReasonById((prev) => ({ ...prev, [message.id]: "off_platform_contact" }));
                                }
                              }}
                              className="text-[11px] font-semibold text-rose-700"
                            >
                              {tx("reportMessage")}
                            </button>
                          )}
                          {messageReportOpenById[message.id] && !reportedOpenMessageIds.has(message.id) ? (
                            <div className="mt-2 space-y-2 rounded-xl border border-rose-200 bg-white p-3">
                              <div className="text-[11px] font-semibold text-slate-600">{tx("reportReasonLabel")}</div>
                              <select
                                value={messageReportReasonById[message.id] || "off_platform_contact"}
                                onChange={(event) => {
                                  const nextReason = event.target.value;
                                  setMessageReportReasonById((prev) => ({ ...prev, [message.id]: nextReason }));
                                  setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
                                }}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                              >
                                {messageReportReasonOptions.map((entry) => (
                                  <option key={entry.value} value={entry.value}>{entry.label}</option>
                                ))}
                              </select>
                              <textarea
                                value={messageReportDetailsById[message.id] || ""}
                                onChange={(event) => {
                                  setMessageReportDetailsById((prev) => ({ ...prev, [message.id]: event.target.value }));
                                  setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
                                }}
                                className="min-h-[72px] w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                                placeholder={tx("reportDetailsOptional")}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => submitMessageReport(message)}
                                  disabled={reportingDirectMessageId === message.id}
                                  className={`rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-700 ${reportingDirectMessageId === message.id ? "cursor-not-allowed opacity-60" : ""}`}
                                >
                                  {reportingDirectMessageId === message.id ? tx("reportingMessage") : tx("submitReport")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMessageReportOpenById((prev) => ({ ...prev, [message.id]: false }));
                                    setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
                                  }}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                              {messageReportErrorById[message.id] ? (
                                <div className="text-[11px] font-semibold text-rose-700">{messageReportErrorById[message.id]}</div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <textarea value={barReplyDraft} onChange={(event) => setBarReplyDraft(event.target.value)} className="min-h-[96px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm sm:flex-1" placeholder="Write your message" />
                  <button onClick={sendBarConversationMessage} className="w-full rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white sm:w-auto sm:self-end">Send</button>
                </div>
                {barConversationMessageError ? <div className="mt-2 text-sm font-medium text-rose-700">{barConversationMessageError}</div> : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StoriesPage({
  sellerPosts,
  barPosts,
  sellers,
  bars,
  users,
  sellerMap,
  barMap,
  postReports,
  commentReports,
  sellerPostLikes,
  sellerPostComments,
  sellerFollows,
  barFollows,
  sellerFollowerCountById,
  sellerSavedPosts,
  currentUser,
  reportSellerPost,
  reportSellerPostComment,
  reportingSellerPostId,
  reportingSellerPostCommentId,
  toggleSellerPostLike,
  addSellerPostComment,
  deleteSellerPostComment,
  toggleSellerFollow,
  toggleBarFollow,
  toggleSavedSellerPost,
  sellerLanguage,
  canViewSellerPost,
  isSellerPostPrivate,
  unlockPrivatePost,
  navigate
}) {
  const locale = SELLER_I18N[sellerLanguage] ? sellerLanguage : "en";
  const t = (key) => SELLER_I18N[locale]?.[key] || SELLER_I18N.en[key] || key;
  const userNameById = useMemo(() => {
    const map = {};
    (users || []).forEach((u) => { if (u?.id) map[u.id] = u.name || ''; });
    return map;
  }, [users]);
  const REPORT_REASON_OPTIONS = [
    { value: "inappropriate", label: t("reasonInappropriate") },
    { value: "harassment", label: t("reasonHarassment") },
    { value: "spam", label: t("reasonSpam") },
    { value: "impersonation", label: t("reasonImpersonation") },
    { value: "other", label: t("reasonOther") }
  ];
  const [visibleCount, setVisibleCount] = useState(9);
  const [feedMode, setFeedMode] = useState("all");
  const [sortMode, setSortMode] = useState("newest");
  const [feedSearch, setFeedSearch] = useState("");
  const [reportReasonByPostId, setReportReasonByPostId] = useState({});
  const [customReasonByPostId, setCustomReasonByPostId] = useState({});
  const [commentDraftByPostId, setCommentDraftByPostId] = useState({});
  const unresolvedReportCounts = useMemo(() => {
    const counts = {};
    (postReports || []).forEach((report) => {
      if (report.status === "resolved") return;
      counts[report.postId] = (counts[report.postId] || 0) + 1;
    });
    return counts;
  }, [postReports]);
  const unresolvedCommentReportCounts = useMemo(() => {
    const counts = {};
    (commentReports || []).forEach((report) => {
      if (report.status === "resolved") return;
      counts[report.commentId] = (counts[report.commentId] || 0) + 1;
    });
    return counts;
  }, [commentReports]);
  const likesByPostId = useMemo(() => {
    const map = {};
    (sellerPostLikes || []).forEach((entry) => {
      if (!map[entry.postId]) map[entry.postId] = [];
      map[entry.postId].push(entry);
    });
    return map;
  }, [sellerPostLikes]);
  const commentsByPostId = useMemo(() => {
    const map = {};
    (sellerPostComments || []).forEach((entry) => {
      if (!map[entry.postId]) map[entry.postId] = [];
      map[entry.postId].push(entry);
    });
    return map;
  }, [sellerPostComments]);
  const followedSellerIds = useMemo(
    () =>
      new Set(
        (sellerFollows || [])
          .filter((entry) => entry.followerUserId === currentUser?.id)
          .map((entry) => entry.sellerId)
      ),
    [sellerFollows, currentUser]
  );
  const followedBarIds = useMemo(
    () =>
      new Set(
        (barFollows || [])
          .filter((entry) => entry.followerUserId === currentUser?.id)
          .map((entry) => entry.barId)
      ),
    [barFollows, currentUser]
  );
  const savedPostIds = useMemo(
    () =>
      new Set(
        (sellerSavedPosts || [])
          .filter((entry) => entry.userId === currentUser?.id)
          .map((entry) => `${entry.feedType || "seller"}:${entry.postId}`)
      ),
    [sellerSavedPosts, currentUser]
  );
  const savedCount = savedPostIds.size;
  const affiliatedSellerIds = useMemo(
    () =>
      new Set(
        (currentUser?.role === "bar"
          ? (sellers || [])
            .filter((seller) => String(seller?.affiliatedBarId || "").trim() === String(currentUser?.barId || "").trim())
            .map((seller) => seller.id)
          : [])
      ),
    [sellers, currentUser]
  );
  const affiliatedBarIdsForFollowedSellers = useMemo(() => {
    if (currentUser?.role !== "buyer") return new Set();
    return new Set(
      (sellers || [])
        .filter((seller) => followedSellerIds.has(seller.id))
        .map((seller) => String(seller?.affiliatedBarId || "").trim())
        .filter(Boolean)
    );
  }, [currentUser, sellers, followedSellerIds]);
  const relationshipFeedModeKey = currentUser?.role === "bar" ? "affiliates" : "following";
  const isBarUser = currentUser?.role === "bar";
  const isBuyerUser = currentUser?.role === "buyer";
  const barById = barMap || Object.fromEntries((bars || []).map((bar) => [bar.id, bar]));
  const sellerFeedItems = useMemo(
    () => (sellerPosts || []).map((post) => ({ ...post, feedType: "seller" })),
    [sellerPosts]
  );
  const barFeedItems = useMemo(
    () => (barPosts || []).map((post) => ({ ...post, feedType: "bar" })),
    [barPosts]
  );
  const allFeedItems = useMemo(
    () => [...sellerFeedItems, ...barFeedItems],
    [sellerFeedItems, barFeedItems]
  );

  const feedPosts = useMemo(
    () => {
      const basePosts =
        feedMode === "following"
          ? allFeedItems.filter((post) =>
              post.feedType === "seller"
                ? followedSellerIds.has(post.sellerId)
                : affiliatedBarIdsForFollowedSellers.has(post.barId)
            )
          : feedMode === "affiliates"
            ? allFeedItems.filter((post) =>
                post.feedType === "seller"
                  ? affiliatedSellerIds.has(post.sellerId)
                  : String(post.barId || "").trim() === String(currentUser?.barId || "").trim()
              )
            : feedMode === "bars"
              ? allFeedItems.filter((post) => post.feedType === "bar")
              : feedMode === "favorite-bars"
                ? allFeedItems.filter((post) => post.feedType === "bar" && followedBarIds.has(post.barId))
                : feedMode === "saved"
                  ? allFeedItems.filter((post) => savedPostIds.has(`${post.feedType}:${post.id}`))
                  : allFeedItems;
      const ranked = [...basePosts];
      if (sortMode === "engaged") {
        ranked.sort((a, b) => {
          const scoreFor = (post) => {
            if (post.feedType !== "seller") return 0;
            const likes = (sellerPostLikes || []).filter((entry) => entry.postId === post.id).length;
            const comments = (sellerPostComments || []).filter((entry) => entry.postId === post.id).length;
            return likes + (comments * 2);
          };
          const bScore = scoreFor(b);
          const aScore = scoreFor(a);
          if (bScore !== aScore) return bScore - aScore;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
      } else {
        ranked.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
      return ranked;
    },
    [allFeedItems, feedMode, sortMode, followedSellerIds, affiliatedBarIdsForFollowedSellers, affiliatedSellerIds, currentUser, followedBarIds, savedPostIds, sellerPostLikes, sellerPostComments]
  );
  const searchedFeedPosts = useMemo(() => {
    const query = feedSearch.trim().toLowerCase();
    if (!query) return feedPosts;
    return feedPosts.filter((post) => {
      if (post.feedType === "bar") {
        const barName = (barById?.[post.barId]?.name || "").toLowerCase();
        const caption = (post.caption || "").toLowerCase();
        const barId = (post.barId || "").toLowerCase();
        return barName.includes(query) || caption.includes(query) || barId.includes(query);
      }
      const sellerName = (sellerMap?.[post.sellerId]?.name || "").toLowerCase();
      const caption = (post.caption || "").toLowerCase();
      const sellerId = (post.sellerId || "").toLowerCase();
      return sellerName.includes(query) || caption.includes(query) || sellerId.includes(query);
    });
  }, [feedPosts, feedSearch, sellerMap, barById]);
  const visiblePosts = searchedFeedPosts.slice(0, visibleCount);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      {currentUser?.role === "buyer" ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button type="button" onClick={() => navigate("/account")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {t("quickProfile")}
          </button>
          <button type="button" onClick={() => navigate("/buyer-messages")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {t("messagesTab")}
          </button>
          <button type="button" onClick={() => navigate("/custom-requests")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {t("customRequestsTab")}
          </button>
          <button type="button" className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto">
            {t("watchFeeds")}
          </button>
        </div>
      ) : null}
      {currentUser?.role === "bar" ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button type="button" onClick={() => navigate("/bar-dashboard")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {t("quickProfile")}
          </button>
          <button type="button" onClick={() => navigate("/bar-feed-workspace")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {t("barFeedTab")}
          </button>
          <button type="button" onClick={() => navigate("/bar-messages")} className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto">
            {t("messagesTab")}
          </button>
          <button type="button" className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto">
            {t("watchFeeds")}
          </button>
        </div>
      ) : null}
      <SectionTitle
        eyebrow={t("feedEyebrow")}
        title={t("feedTitle")}
        subtitle={t("feedSubtitle")}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setFeedMode("all");
            setVisibleCount(9);
          }}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedMode === "all" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
        >
          {t("allPosts")}
        </button>
        <button
          onClick={() => {
            setFeedMode(relationshipFeedModeKey);
            setVisibleCount(9);
          }}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedMode === relationshipFeedModeKey ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
        >
          {currentUser?.role === "bar" ? t("affiliatesPosts") : t("followingPosts")}
        </button>
        {(isBuyerUser || isBarUser) ? (
          <button
            onClick={() => {
              setFeedMode("bars");
              setVisibleCount(9);
            }}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedMode === "bars" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
          >
            {t("barsPosts")}
          </button>
        ) : null}
        {isBuyerUser ? (
          <button
            onClick={() => {
              setFeedMode("favorite-bars");
              setVisibleCount(9);
            }}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedMode === "favorite-bars" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
          >
            {t("favoriteBarsPosts")}
          </button>
        ) : null}
        <button
          onClick={() => {
            setFeedMode("saved");
            setVisibleCount(9);
          }}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedMode === "saved" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
        >
          {t("savedPosts")} ({savedCount})
        </button>
        <button
          onClick={() => {
            setSortMode("newest");
            setVisibleCount(9);
          }}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${sortMode === "newest" ? "bg-slate-700 text-white" : "border border-slate-200 text-slate-700"}`}
        >
          {t("newest")}
        </button>
        <button
          onClick={() => {
            setSortMode("engaged");
            setVisibleCount(9);
          }}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${sortMode === "engaged" ? "bg-slate-700 text-white" : "border border-slate-200 text-slate-700"}`}
        >
          {t("mostEngaged")}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={feedSearch}
          onChange={(event) => {
            setFeedSearch(event.target.value);
            setVisibleCount(9);
          }}
          placeholder={t("searchFeedPlaceholder")}
          aria-label={t("searchFeedPlaceholder")}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-80 md:w-96"
        />
        <button
          onClick={() => {
            setFeedSearch("");
            setVisibleCount(9);
          }}
          aria-label={t("clearSearch")}
          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
        >
          {t("clearSearch")}
        </button>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {visiblePosts.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-md ring-1 ring-rose-100">
            {feedSearch.trim()
              ? t("noSearchResults")
              : feedMode === "following"
                ? t("noFollowingPosts")
                : feedMode === "affiliates"
                  ? t("noAffiliatesPosts")
                : feedMode === "bars"
                  ? t("noBarsPosts")
                : feedMode === "favorite-bars"
                  ? t("noFavoriteBarsPosts")
                : feedMode === "saved"
                  ? t("noSavedPosts")
                  : t("noFeedPosts")}
          </div>
        ) : visiblePosts.map((post) => {
          if (post.feedType === "bar") {
            const bar = barById?.[post.barId];
            const isFollowingBar = followedBarIds.has(post.barId);
            return (
              <article key={post.id} className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center justify-between gap-2">
                  <button onClick={() => navigate(`/bar/${post.barId}`)} className="text-left text-sm font-semibold text-rose-700 hover:text-rose-800">
                    {bar?.name || post.barId}
                  </button>
                  {currentUser?.role === "buyer" || currentUser?.role === "bar" ? (
                    <button
                      onClick={() => toggleBarFollow(post.barId)}
                      className={`rounded-xl border px-2 py-0.5 text-[11px] font-semibold ${isFollowingBar ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600"}`}
                    >
                      {isFollowingBar ? t("followingBar") : t("followBar")}
                    </button>
                  ) : null}
                  {currentUser?.role === "bar" ? (
                    <button
                      onClick={() => toggleSavedSellerPost(post.id, "bar")}
                      className={`rounded-xl border px-2 py-0.5 text-[11px] font-semibold ${savedPostIds.has(`bar:${post.id}`) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600"}`}
                    >
                      {savedPostIds.has(`bar:${post.id}`) ? t("saved") : t("savePost")}
                    </button>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
                <div className="mt-3 aspect-[4/5]">
                  <ProductImage src={post.image} label={post.imageName || t("feedImage")} top />
                </div>
                {post.caption ? <p className="mt-3 text-sm leading-6 text-slate-700">{post.caption}</p> : null}
                <div className="mt-3 text-xs text-slate-500">
                  {bar?.location || ""}
                </div>
              </article>
            );
          }
          return (
            <article key={post.id} className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-rose-100">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(`/seller/${post.sellerId}`)} className="text-left text-sm font-semibold text-rose-700 hover:text-rose-800">
                    {sellerMap[post.sellerId]?.name || post.sellerId}
                  </button>
                  {currentUser?.role === "buyer" || currentUser?.role === "bar" ? (
                    <button
                      onClick={() => toggleSellerFollow(post.sellerId)}
                      className={`rounded-xl border px-2 py-0.5 text-[11px] font-semibold ${followedSellerIds.has(post.sellerId) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600"}`}
                    >
                      {followedSellerIds.has(post.sellerId) ? t("following") : t("follow")}
                    </button>
                  ) : null}
                  {currentUser ? (
                    <button
                      onClick={() => toggleSavedSellerPost(post.id, "seller")}
                      className={`rounded-xl border px-2 py-0.5 text-[11px] font-semibold ${savedPostIds.has(`seller:${post.id}`) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600"}`}
                    >
                      {savedPostIds.has(`seller:${post.id}`) ? t("saved") : t("savePost")}
                    </button>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {sellerFollowerCountById?.[post.sellerId] || 0} {t("followers")}
                  </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sellerMap[post.sellerId]?.isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {sellerMap[post.sellerId]?.isOnline ? t("online") : t("offline")}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
              <div className="mt-3 aspect-[4/5]">
                <button
                  onClick={() => {
                    if (!canViewSellerPost(post) && isSellerPostPrivate(post) && !currentUser) {
                      navigate("/login");
                      return;
                    }
                    if (!canViewSellerPost(post) && isSellerPostPrivate(post) && currentUser) {
                      unlockPrivatePost(post.id);
                    }
                  }}
                  className="relative block h-full w-full text-left"
                >
                  <div className={canViewSellerPost(post) ? "" : "blur-xl"}>
                    <ProductImage src={post.image} label={post.imageName || t("feedImage")} top />
                  </div>
                  {!canViewSellerPost(post) && isSellerPostPrivate(post) ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button onClick={(event) => { event.stopPropagation(); unlockPrivatePost(post.id); }} className="rounded-2xl bg-white/95 px-4 py-2 text-xs font-semibold text-rose-700 shadow">
                        Unlock for {formatPriceTHB(post.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB)}
                      </button>
                    </div>
                  ) : null}
                </button>
              </div>
              {!canViewSellerPost(post) && <p className="mt-3 text-xs font-medium text-rose-600/70">Private post. Unlock to view.</p>}
              {post.caption ? <p className={`${!canViewSellerPost(post) ? 'mt-1' : 'mt-3'} text-sm leading-6 text-slate-700`}>{post.caption}</p> : null}
              {canViewSellerPost(post) ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => toggleSellerPostLike(post.id)}
                      className={`rounded-xl border px-3 py-1 text-xs font-semibold ${((likesByPostId[post.id] || []).some((entry) => entry.userId === currentUser?.id)) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                    >
                      {((likesByPostId[post.id] || []).some((entry) => entry.userId === currentUser?.id)) ? t("unlike") : t("like")} · {(likesByPostId[post.id] || []).length}
                    </button>
                    <div className="text-xs text-slate-500">
                      {(commentsByPostId[post.id] || []).length} {t("comments")}
                    </div>
                  </div>
                  <div className="mt-2 max-h-28 space-y-1 overflow-y-auto">
                    {(commentsByPostId[post.id] || []).length === 0 ? (
                      <div className="text-xs text-slate-500">{t("noCommentsYet")}</div>
                    ) : (commentsByPostId[post.id] || []).map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-rose-100">
                        <div className="flex items-center justify-between gap-2">
                          <span><span className="font-semibold text-slate-600">{userNameById[comment.senderUserId] || comment.senderRole}</span>: {comment.body}</span>
                          <div className="flex items-center gap-1">
                            {unresolvedCommentReportCounts[comment.id] ? (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                {unresolvedCommentReportCounts[comment.id]} report(s)
                              </span>
                            ) : null}
                            {currentUser && currentUser.role !== "admin" && currentUser.id !== comment.senderUserId ? (
                              <button
                                onClick={() => {
                                  if (typeof window === "undefined") return;
                                  const reason = window.prompt("Why are you reporting this comment?", "Inappropriate comment");
                                  if (!reason || !reason.trim()) return;
                                  reportSellerPostComment(comment.id, reason.trim());
                                }}
                                disabled={reportingSellerPostCommentId === comment.id}
                                className={`rounded-lg border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ${reportingSellerPostCommentId === comment.id ? "cursor-not-allowed opacity-60" : ""}`}
                              >
                                {reportingSellerPostCommentId === comment.id ? "Reporting..." : "Report"}
                              </button>
                            ) : null}
                            {currentUser && (currentUser.role === "admin" || currentUser.id === comment.senderUserId) ? (
                              <button
                                onClick={() => deleteSellerPostComment(comment.id)}
                                className="rounded-lg border border-rose-200 px-2 py-0.5 text-[10px] font-semibold text-rose-700"
                              >
                                {t("deleteComment")}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {currentUser ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={commentDraftByPostId[post.id] || ""}
                        onChange={(event) => setCommentDraftByPostId((prev) => ({ ...prev, [post.id]: event.target.value }))}
                        className="flex-1 rounded-xl border border-slate-200 px-2 py-1 text-xs"
                        maxLength={400}
                        placeholder={t("writeComment")}
                      />
                      <button
                        onClick={() => {
                          const posted = addSellerPostComment(post.id, commentDraftByPostId[post.id] || "");
                          if (posted) {
                            setCommentDraftByPostId((prev) => ({ ...prev, [post.id]: "" }));
                          }
                        }}
                        disabled={!(commentDraftByPostId[post.id] || "").trim()}
                        className={`rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${!(commentDraftByPostId[post.id] || "").trim() ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {t("postComment")} ({formatPriceTHB(MESSAGE_FEE_THB)})
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-slate-500">{t("loginToEngage")}</div>
                  )}
                  {currentUser ? <div className="mt-1 text-[11px] text-slate-500">{t("commentLimit")}: {(commentDraftByPostId[post.id] || "").length}/400</div> : null}
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between gap-3">
                {unresolvedReportCounts[post.id] ? (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {unresolvedReportCounts[post.id]} {t("reportCount")}
                  </span>
                ) : <span />}
                {currentUser ? (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <select
                      value={reportReasonByPostId[post.id] || REPORT_REASON_OPTIONS[0].value}
                      onChange={(event) => setReportReasonByPostId((prev) => ({ ...prev, [post.id]: event.target.value }))}
                      className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                    >
                      {REPORT_REASON_OPTIONS.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}
                    </select>
                    {(reportReasonByPostId[post.id] || REPORT_REASON_OPTIONS[0].value) === "other" ? (
                      <input
                        value={customReasonByPostId[post.id] || ""}
                        onChange={(event) => setCustomReasonByPostId((prev) => ({ ...prev, [post.id]: event.target.value }))}
                        className="rounded-xl border border-slate-200 px-2 py-1 text-xs"
                        placeholder={t("customReason")}
                      />
                    ) : null}
                    <button
                      onClick={() => {
                        const selectedReason = reportReasonByPostId[post.id] || REPORT_REASON_OPTIONS[0].value;
                        const reasonLabel = REPORT_REASON_OPTIONS.find((option) => option.value === selectedReason)?.label || selectedReason;
                        const finalReason = selectedReason === "other"
                          ? (customReasonByPostId[post.id] || "").trim()
                          : reasonLabel;
                        reportSellerPost(post.id, finalReason);
                      }}
                      disabled={reportingSellerPostId === post.id}
                      className={`rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${reportingSellerPostId === post.id ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      {reportingSellerPostId === post.id ? t("reporting") : t("report")}
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      {searchedFeedPosts.length > visibleCount ? (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setVisibleCount((count) => count + 9)} className="rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700">
            {t("loadMorePosts")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function AdminPage({
  isAdmin,
  isSuperAdmin,
  adminPermissions,
  adminTab,
  setAdminTab,
  products,
  users,
  orders,
  messages,
  customRequests,
  customRequestMessages,
  refundClaims,
  orderHelpRequests,
  safetyReports,
  barAffiliationRequests,
  adminInboxReviews,
  updateAdminInboxReview,
  updateRefundClaimDecision,
  respondToBarAffiliationRequest,
  adminInboxFilterPresets,
  saveAdminInboxFilterPreset,
  deleteAdminInboxFilterPreset,
  adminNotes,
  updateAdminNote,
  walletTransactions,
  adminDisputeCases,
  updateAdminDisputeCase,
  updateOrderHelpRequestStatus,
  blocks,
  adminActions,
  pendingSellerApprovals,
  pendingSellerCount,
  adminSellerReviewFilter,
  setAdminSellerReviewFilter,
  adminSellerReviewItems,
  adminAuthActionMessage,
  approveSellerAccount,
  approveAllPendingSellers,
  rejectSellerAccount,
  bars,
  sellers,
  updateBarProfileByAdmin,
  setSellerBarAffiliationByAdmin,
  removeBarByAdmin,
  toggleAdminBlockUser,
  updateUserCredentialsByAdmin,
  applyAdminWalletAdjustment,
  updateUserAdminAccessBySuperAdmin,
  adminUserSearch,
  setAdminUserSearch,
  adminUserResults,
  adminSelectedUser,
  setAdminSelectedUserId,
  adminSelectedUserOrderHistory,
  updateOrderShipment,
  updatingOrderId,
  adminSelectedUserMessageHistory,
  cancelCustomRequestByAdmin,
  adminSalesSummary,
  sellerSalesRows,
  stripeEvents,
  sellerPosts,
  postReports,
  commentReports,
  messageReports,
  sellerPostLikes,
  sellerPostComments,
  sellerFollows,
  deleteSellerPost,
  deletingSellerPostId,
  resolvePostReport,
  resolvingPostReportId,
  resolveAllPostReports,
  resolvingAllPostReports,
  resolveCommentReport,
  resolvingCommentReportId,
  resolveAllCommentReports,
  resolvingAllCommentReports,
  resolveMessageReport,
  resolvingMessageReportId,
  dismissMessageReport,
  dismissingMessageReportId,
  resolveAllMessageReports,
  resolvingAllMessageReports,
  userStrikes,
  userAppeals,
  reviewUserAppeal,
  reviewingAppealId,
  emailTemplates,
  updateEmailTemplate,
  resetEmailTemplate,
  sendTestEmailTemplate,
  emailDeliveryLog,
  adminEmailThreads,
  adminEmailMessages,
  refreshAdminEmailInbox,
  fetchAdminEmailThreadMessages,
  sendAdminEmailThreadReply,
  sendAdminEmailInboxMessage,
  updateAdminEmailThreadStatus,
  deleteAdminEmailThread,
  getAdminEmailInboxHealth,
  listAdminEmailSuppressions,
  addAdminEmailSuppression,
  removeAdminEmailSuppression,
  downloadAdminEmailAttachment,
  sellerMap,
  currentUser,
  sendTestBrowserNotification,
  navigate,
  CMS_SCHEMA,
  NEXTJS_EXPORT_BLUEPRINT,
  SEO_CONFIG,
  promptPayReceiverMobile,
  updatePromptPayReceiverMobile,
  payoutRuns,
  payoutItems,
  payoutEvents,
  createMonthlyPayoutRun,
  markPayoutItemSent,
  markPayoutItemFailed,
  appMode,
  switchAppMode,
  onImpersonateUser,
  giftCatalog,
  giftPurchases,
  giftFulfillmentTasks,
  updateGiftCatalogItem,
}) {
  const [socialSearch, setSocialSearch] = useState("");
  const [socialFilter, setSocialFilter] = useState("all");
  const [socialVisibleCount, setSocialVisibleCount] = useState(10);
  const [reportVisibleCount, setReportVisibleCount] = useState(8);
  const [emailTemplateDrafts, setEmailTemplateDrafts] = useState({});
  const [emailToneByTemplateKey, setEmailToneByTemplateKey] = useState({});
  const [selectedEmailTemplateKey, setSelectedEmailTemplateKey] = useState(null);
  const [emailTemplateScenarioByKey, setEmailTemplateScenarioByKey] = useState({});
  const [sendingTestTemplateKey, setSendingTestTemplateKey] = useState(null);
  const [emailTemplateActionMessage, setEmailTemplateActionMessage] = useState("");
  const [adminEmailMailboxFilter, setAdminEmailMailboxFilter] = useState("all");
  const [adminEmailStatusFilter, setAdminEmailStatusFilter] = useState("active");
  const [adminEmailSearch, setAdminEmailSearch] = useState("");
  const [adminEmailLoading, setAdminEmailLoading] = useState(false);
  const [adminEmailSelectedThreadId, setAdminEmailSelectedThreadId] = useState("");
  const [adminEmailReplySubject, setAdminEmailReplySubject] = useState("");
  const [adminEmailReplyBody, setAdminEmailReplyBody] = useState("");
  const [adminEmailActionMessage, setAdminEmailActionMessage] = useState("");
  const [adminEmailComposeMailbox, setAdminEmailComposeMailbox] = useState("admin");
  const [adminEmailComposeToName, setAdminEmailComposeToName] = useState("");
  const [adminEmailComposeToEmail, setAdminEmailComposeToEmail] = useState("");
  const [adminEmailComposeSubject, setAdminEmailComposeSubject] = useState("");
  const [adminEmailComposeBody, setAdminEmailComposeBody] = useState("");
  const [adminEmailComposeAttachments, setAdminEmailComposeAttachments] = useState([]);
  const [adminEmailReplyAttachments, setAdminEmailReplyAttachments] = useState([]);
  const [adminEmailComposeSending, setAdminEmailComposeSending] = useState(false);
  const [adminEmailComposeConfirmed, setAdminEmailComposeConfirmed] = useState(false);
  const [adminEmailInboxHealth, setAdminEmailInboxHealth] = useState(null);
  const [adminEmailInboxHealthLoading, setAdminEmailInboxHealthLoading] = useState(false);
  const [adminEmailSuppressions, setAdminEmailSuppressions] = useState([]);
  const [adminEmailSuppressionsLoading, setAdminEmailSuppressionsLoading] = useState(false);
  const [adminEmailSuppressionEmailDraft, setAdminEmailSuppressionEmailDraft] = useState("");
  const [adminEmailSuppressionReasonDraft, setAdminEmailSuppressionReasonDraft] = useState("");
  const [adminEmailComposeStatusMessage, setAdminEmailComposeStatusMessage] = useState("");
  const [adminEmailComposeStatusTone, setAdminEmailComposeStatusTone] = useState("neutral");
  const normalizeAdminEmailStatus = useCallback((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "all") return "all";
    if (normalized === "active") return "active";
    if (normalized === "closed") return "archived";
    if (["open", "pending_customer", "archived"].includes(normalized)) return normalized;
    return "open";
  }, []);
  const doesAdminEmailThreadMatchStatusFilter = useCallback((threadStatus, statusFilter) => {
    const normalizedStatus = normalizeAdminEmailStatus(threadStatus);
    const normalizedFilter = normalizeAdminEmailStatus(statusFilter);
    if (normalizedFilter === "all") return true;
    if (normalizedFilter === "active") return normalizedStatus === "open" || normalizedStatus === "pending_customer";
    return normalizedStatus === normalizedFilter;
  }, [normalizeAdminEmailStatus]);
  const getAdminEmailStatusLabel = useCallback((value) => {
    const normalized = normalizeAdminEmailStatus(value);
    if (normalized === "pending_customer") return "Waiting for customer";
    if (normalized === "archived") return "Archived";
    return "Open";
  }, [normalizeAdminEmailStatus]);
  const refreshAdminEmailInboxRef = useRef(refreshAdminEmailInbox);
  const fetchAdminEmailThreadMessagesRef = useRef(fetchAdminEmailThreadMessages);
  const adminUxPrefsHydratedRef = useRef(false);
  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxTypeFilter, setInboxTypeFilter] = useState("all");
  const [inboxPriorityFilter, setInboxPriorityFilter] = useState("all");
  const [inboxReviewFilter, setInboxReviewFilter] = useState("all");
  const [inboxVisibleCount, setInboxVisibleCount] = useState(20);
  const [inboxSelectedKeys, setInboxSelectedKeys] = useState({});
  const [inboxPresetName, setInboxPresetName] = useState("");
  const [inboxActionMessage, setInboxActionMessage] = useState("");
  const [inboxItemMessages, setInboxItemMessages] = useState({});
  const [adminWorkspaceMode, setAdminWorkspaceMode] = useState("all");
  const [adminUserNoteDraft, setAdminUserNoteDraft] = useState("");
  const [adminUserMessageDraftByUserId, setAdminUserMessageDraftByUserId] = useState({});
  const [adminUserMessageSending, setAdminUserMessageSending] = useState(false);
  const [adminUserMessageStatus, setAdminUserMessageStatus] = useState("");
  const [adminUserMessageTone, setAdminUserMessageTone] = useState("neutral");
  const [adminCredentialDraftByUserId, setAdminCredentialDraftByUserId] = useState({});
  const [adminCredentialSaving, setAdminCredentialSaving] = useState(false);
  const [adminCredentialMessage, setAdminCredentialMessage] = useState("");
  const [adminCredentialTone, setAdminCredentialTone] = useState("neutral");
  const [adminAccessDraftByUserId, setAdminAccessDraftByUserId] = useState({});
  const [adminAccessSaving, setAdminAccessSaving] = useState(false);
  const [adminAccessMessage, setAdminAccessMessage] = useState("");
  const [adminAccessTone, setAdminAccessTone] = useState("neutral");
  const [walletAdjustDirection, setWalletAdjustDirection] = useState("credit");
  const [walletAdjustAmount, setWalletAdjustAmount] = useState("");
  const [walletAdjustReason, setWalletAdjustReason] = useState("");
  const [walletAdjustSaving, setWalletAdjustSaving] = useState(false);
  const [walletAdjustMessage, setWalletAdjustMessage] = useState("");
  const [walletAdjustTone, setWalletAdjustTone] = useState("neutral");
  const [orderShipmentDrafts, setOrderShipmentDrafts] = useState({});
  const [orderHelpNoteDraftByItemKey, setOrderHelpNoteDraftByItemKey] = useState({});
  const [barDraftsById, setBarDraftsById] = useState({});
  const [payoutSourceFilter, setPayoutSourceFilter] = useState("all");
  const [payoutRoleFilter, setPayoutRoleFilter] = useState("all");
  const [payoutDateRangeFilter, setPayoutDateRangeFilter] = useState("all");
  const [promptPayReceiverDraft, setPromptPayReceiverDraft] = useState(String(promptPayReceiverMobile || DEFAULT_PROMPTPAY_RECEIVER_MOBILE));
  const [promptPayReceiverMessage, setPromptPayReceiverMessage] = useState("");
  const [adminNotificationTestStatus, setAdminNotificationTestStatus] = useState({ tone: "neutral", message: "" });
  useEffect(() => {
    setPromptPayReceiverDraft(String(promptPayReceiverMobile || DEFAULT_PROMPTPAY_RECEIVER_MOBILE));
  }, [promptPayReceiverMobile]);
  const [payoutMonthDraft, setPayoutMonthDraft] = useState(() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  const [payoutRunNotesDraft, setPayoutRunNotesDraft] = useState("");
  const [payoutRunActionMessage, setPayoutRunActionMessage] = useState("");
  const [selectedPayoutRunId, setSelectedPayoutRunId] = useState("");
  const [payoutMethodByItemId, setPayoutMethodByItemId] = useState({});
  const [payoutReferenceByItemId, setPayoutReferenceByItemId] = useState({});
  const [payoutNoteByItemId, setPayoutNoteByItemId] = useState({});
  const [payoutHistoryRecipientFilter, setPayoutHistoryRecipientFilter] = useState("all");
  const [payoutHistoryStatusFilter, setPayoutHistoryStatusFilter] = useState("all");
  const [payoutHistoryMonthFilter, setPayoutHistoryMonthFilter] = useState("all");
  const [salesDatePreset, setSalesDatePreset] = useState("all_time");
  const [paymentsWindowPreset, setPaymentsWindowPreset] = useState("all_time");
  const [paymentsCustomStartDate, setPaymentsCustomStartDate] = useState("");
  const [paymentsCustomEndDate, setPaymentsCustomEndDate] = useState("");
  const [paymentsEntityRoleFilter, setPaymentsEntityRoleFilter] = useState("all");
  const [paymentsSellerTypeFilter, setPaymentsSellerTypeFilter] = useState("all");
  const [paymentsEntitySearch, setPaymentsEntitySearch] = useState("");
  const [payoutAnalyticsPreset, setPayoutAnalyticsPreset] = useState("all_time");
  const [payoutAnalyticsStartDate, setPayoutAnalyticsStartDate] = useState("");
  const [payoutAnalyticsEndDate, setPayoutAnalyticsEndDate] = useState("");
  const [payoutAnalyticsRecipientFilter, setPayoutAnalyticsRecipientFilter] = useState("all");
  const [payoutAnalyticsSellerTypeFilter, setPayoutAnalyticsSellerTypeFilter] = useState("all");
  const sortedPayoutRuns = useMemo(
    () => [...(payoutRuns || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [payoutRuns]
  );
  const salesDateWindow = useMemo(() => {
    if (salesDatePreset === "all_time") {
      return { startMs: null, endMs: null, label: "All time" };
    }
    if (salesDatePreset === "this_month") {
      const now = new Date();
      const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0);
      const endMs = Date.now();
      return { startMs, endMs, label: "This month" };
    }
    const activeCycle = sortedPayoutRuns.find((run) => run.status === "processing") || sortedPayoutRuns[0] || null;
    if (activeCycle?.periodStart && activeCycle?.periodEnd) {
      return {
        startMs: new Date(activeCycle.periodStart).getTime(),
        endMs: new Date(activeCycle.periodEnd).getTime(),
        label: activeCycle.periodLabel || "This pay cycle",
      };
    }
    return { startMs: null, endMs: null, label: "This pay cycle" };
  }, [salesDatePreset, sortedPayoutRuns]);
  const isWithinSalesWindow = (dateValue) => {
    const createdAtMs = new Date(dateValue || 0).getTime();
    if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return false;
    if (salesDateWindow.startMs !== null && createdAtMs < salesDateWindow.startMs) return false;
    if (salesDateWindow.endMs !== null && createdAtMs > salesDateWindow.endMs) return false;
    return true;
  };
  const filteredSalesOrders = useMemo(
    () => (orders || []).filter((order) => isWithinSalesWindow(order.createdAt)),
    [orders, salesDateWindow]
  );
  const filteredAcceptedCustomRequests = useMemo(
    () =>
      (customRequests || [])
        .filter((request) => (request?.quoteStatus || "") === "accepted" && (request?.status || "") !== "cancelled")
        .filter((request) => isWithinSalesWindow(request?.quoteAcceptedAt || request?.updatedAt || request?.createdAt)),
    [customRequests, salesDateWindow]
  );
  const filteredAdminSalesSummary = useMemo(() => {
    const productSales = filteredSalesOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const customRequestSales = filteredAcceptedCustomRequests.reduce(
      (sum, request) => sum + Number(request?.quotedPriceThb || 0),
      0
    );
    const messageFeeTransactions = (walletTransactions || []).filter(
      (txn) => txn.type === "message_fee" && txn.amount < 0 && isWithinSalesWindow(txn.createdAt)
    );
    const messageFees = messageFeeTransactions.reduce((sum, txn) => sum + Math.abs(Number(txn.amount || 0)), 0);
    const messageCount = messageFeeTransactions.length;
    const buyersInWindow = new Set(filteredSalesOrders.map((order) => order.buyerUserId).filter(Boolean));
    const sellersInWindow = new Set();
    const productById = Object.fromEntries((products || []).map((product) => [product.id, product]));
    filteredSalesOrders.forEach((order) => {
      (order.items || []).forEach((itemId) => {
        const sellerId = productById[itemId]?.sellerId;
        if (sellerId) sellersInWindow.add(sellerId);
      });
    });
    filteredAcceptedCustomRequests.forEach((request) => {
      if (request?.sellerId) sellersInWindow.add(request.sellerId);
    });
    const totalPlatformSales = Number((productSales + customRequestSales + messageFees).toFixed(2));
    return {
      totalSales: Number((productSales + customRequestSales).toFixed(2)),
      productSales: Number(productSales.toFixed(2)),
      customRequestSales: Number(customRequestSales.toFixed(2)),
      messageFees: Number(messageFees.toFixed(2)),
      messageCount,
      totalPlatformSales,
      totalOrders: filteredSalesOrders.length,
      customRequestOrders: filteredAcceptedCustomRequests.length,
      totalBuyers: buyersInWindow.size,
      totalSellers: sellersInWindow.size,
    };
  }, [filteredSalesOrders, filteredAcceptedCustomRequests, products, walletTransactions, isWithinSalesWindow]);
  const filteredSellerSalesRows = useMemo(() => {
    const productPriceById = Object.fromEntries((products || []).map((product) => [product.id, Number(product.price || 0)]));
    return (users || [])
      .filter((user) => user.role === "seller" && user.sellerId)
      .map((sellerUser) => {
        const sellerProductIds = (products || []).filter((product) => product.sellerId === sellerUser.sellerId).map((product) => product.id);
        const sellerOrders = filteredSalesOrders.filter((order) => (order.items || []).some((itemId) => sellerProductIds.includes(itemId)));
        const productSalesValue = sellerOrders.reduce((sum, order) => {
          const sellerItemTotal = (order.items || [])
            .filter((itemId) => sellerProductIds.includes(itemId))
            .reduce((itemSum, itemId) => itemSum + (productPriceById[itemId] || 0), 0);
          return sum + sellerItemTotal;
        }, 0);
        const sellerAcceptedRequests = filteredAcceptedCustomRequests.filter((request) => request?.sellerId === sellerUser.sellerId);
        const customRequestSalesValue = sellerAcceptedRequests.reduce((sum, request) => sum + Number(request?.quotedPriceThb || 0), 0);
        const salesValue = Number((productSalesValue + customRequestSalesValue).toFixed(2));
        return {
          userId: sellerUser.id,
          sellerId: sellerUser.sellerId,
          name: sellerUser.name,
          email: sellerUser.email,
          orderCount: sellerOrders.length,
          customRequestOrderCount: sellerAcceptedRequests.length,
          productSalesValue: Number(productSalesValue.toFixed(2)),
          customRequestSalesValue: Number(customRequestSalesValue.toFixed(2)),
          salesValue,
        };
      })
      .filter((row) => row.salesValue > 0)
      .sort((a, b) => b.salesValue - a.salesValue);
  }, [users, products, filteredSalesOrders, filteredAcceptedCustomRequests]);
  useEffect(() => {
    if (!sortedPayoutRuns.length) {
      setSelectedPayoutRunId("");
      return;
    }
    setSelectedPayoutRunId((prev) => (
      prev && sortedPayoutRuns.some((run) => run.id === prev)
        ? prev
        : sortedPayoutRuns[0].id
    ));
  }, [sortedPayoutRuns]);
  const activePayoutRun = useMemo(
    () => sortedPayoutRuns.find((run) => run.id === selectedPayoutRunId) || null,
    [sortedPayoutRuns, selectedPayoutRunId]
  );
  const activePayoutItems = useMemo(
    () =>
      [...((payoutItems || []).filter((item) => item.runId === activePayoutRun?.id))]
        .sort((a, b) => Number(b.netPayable || 0) - Number(a.netPayable || 0)),
    [payoutItems, activePayoutRun]
  );
  const pendingPayoutItems = useMemo(
    () => activePayoutItems.filter((item) => item.status === "ready"),
    [activePayoutItems]
  );
  const sentPayoutItems = useMemo(
    () => activePayoutItems.filter((item) => item.status === "sent"),
    [activePayoutItems]
  );
  const failedPayoutItems = useMemo(
    () => activePayoutItems.filter((item) => item.status === "failed"),
    [activePayoutItems]
  );
  const belowThresholdPayoutItems = useMemo(
    () => activePayoutItems.filter((item) => item.status === "skipped_below_threshold"),
    [activePayoutItems]
  );
  const payoutSummary = useMemo(() => (
    activePayoutItems.reduce((summary, item) => {
      const amount = Number(item?.netPayable || 0);
      summary.total += amount;
      if (item.status === "ready") summary.pending += amount;
      if (item.status === "sent") summary.sent += amount;
      if (item.status === "failed") summary.failed += amount;
      if (item.status === "skipped_below_threshold") summary.belowThreshold += amount;
      return summary;
    }, {
      total: 0,
      pending: 0,
      sent: 0,
      failed: 0,
      belowThreshold: 0,
    })
  ), [activePayoutItems]);
  const recentPayoutEvents = useMemo(
    () =>
      [...(payoutEvents || [])]
        .filter((event) => {
          if (!activePayoutRun) return false;
          const item = (payoutItems || []).find((row) => row.id === event.payoutItemId);
          return item?.runId === activePayoutRun.id;
        })
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 20),
    [payoutEvents, payoutItems, activePayoutRun]
  );
  const currentPayoutCycleRun = useMemo(
    () => sortedPayoutRuns.find((run) => run.status === "processing") || sortedPayoutRuns[0] || null,
    [sortedPayoutRuns]
  );
  const paymentWindowMeta = useMemo(() => {
    if (paymentsWindowPreset === "all_time") {
      return { startMs: null, endMs: null, label: "All time" };
    }
    if (paymentsWindowPreset === "current_month") {
      const now = new Date();
      const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0);
      const endMs = Date.now();
      return {
        startMs,
        endMs,
        label: now.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      };
    }
    if (paymentsWindowPreset === "current_payout_cycle") {
      if (!currentPayoutCycleRun) {
        return { startMs: null, endMs: null, label: "Current payout cycle (not available)" };
      }
      return {
        startMs: new Date(currentPayoutCycleRun.periodStart || 0).getTime(),
        endMs: new Date(currentPayoutCycleRun.periodEnd || Date.now()).getTime(),
        label: currentPayoutCycleRun.periodLabel || "Current payout cycle",
      };
    }
    const customStartMs = paymentsCustomStartDate ? new Date(`${paymentsCustomStartDate}T00:00:00.000Z`).getTime() : null;
    const customEndMs = paymentsCustomEndDate ? new Date(`${paymentsCustomEndDate}T23:59:59.999Z`).getTime() : null;
    return {
      startMs: Number.isFinite(customStartMs) ? customStartMs : null,
      endMs: Number.isFinite(customEndMs) ? customEndMs : null,
      label: "Custom date range",
    };
  }, [paymentsWindowPreset, paymentsCustomStartDate, paymentsCustomEndDate, currentPayoutCycleRun]);
  const isWithinPaymentWindow = (dateValue) => {
    const createdAtMs = new Date(dateValue || 0).getTime();
    if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return false;
    if (paymentWindowMeta.startMs !== null && createdAtMs < paymentWindowMeta.startMs) return false;
    if (paymentWindowMeta.endMs !== null && createdAtMs > paymentWindowMeta.endMs) return false;
    return true;
  };
  const payoutPaidSourceTxIds = useMemo(() => {
    const ids = new Set();
    (payoutItems || []).forEach((item) => {
      if (item.status !== "sent") return;
      (item.sourceTxIds || []).forEach((txId) => {
        if (txId) ids.add(String(txId));
      });
    });
    return ids;
  }, [payoutItems]);
  const payoutIntelligenceRows = useMemo(() => {
    const eligibleByUserId = {};
    (walletTransactions || []).forEach((entry) => {
      const amount = Number(entry?.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const user = (users || []).find((candidate) => candidate.id === entry.userId);
      if (!user || !["seller", "bar"].includes(user.role)) return;
      const type = String(entry.type || "");
      if (!["message_fee", "order_sale_earning", "order_bar_commission"].includes(type)) return;
      if (!eligibleByUserId[user.id]) eligibleByUserId[user.id] = [];
      eligibleByUserId[user.id].push(entry);
    });
    const nowMinusHoldMs = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const sellerByIdMap = Object.fromEntries((sellers || []).map((seller) => [seller.id, seller]));
    const barLinkedSellerCount = {};
    (sellers || []).forEach((seller) => {
      const barId = String(seller?.affiliatedBarId || "").trim();
      if (!barId) return;
      barLinkedSellerCount[barId] = (barLinkedSellerCount[barId] || 0) + 1;
    });
    return (users || [])
      .filter((user) => ["seller", "bar"].includes(user.role))
      .map((user) => {
        const source = eligibleByUserId[user.id] || [];
        const revenueAllTime = source.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const revenueInWindow = source
          .filter((entry) => isWithinPaymentWindow(entry.createdAt))
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const paidRows = (payoutItems || []).filter((item) => item.recipientUserId === user.id && item.status === "sent");
        const paidAllTime = paidRows.reduce((sum, row) => sum + Number(row.netPayable || 0), 0);
        const paidInWindow = paidRows
          .filter((row) => isWithinPaymentWindow(row.paidAt || row.createdAt))
          .reduce((sum, row) => sum + Number(row.netPayable || 0), 0);
        const totalMoneyOwed = source
          .filter((entry) => !payoutPaidSourceTxIds.has(String(entry.id)))
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const maturedUnpaid = source
          .filter((entry) => !payoutPaidSourceTxIds.has(String(entry.id)))
          .filter((entry) => new Date(entry.createdAt || 0).getTime() <= nowMinusHoldMs)
          .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
        const owedNow = Number(totalMoneyOwed.toFixed(2));
        const payableCandidate = Number(maturedUnpaid.toFixed(2));
        const payableNow = payableCandidate >= 100 ? payableCandidate : 0;
        const isBelowThreshold = payableCandidate > 0 && payableCandidate < 100;
        const sellerProfile = user.role === "seller" ? sellerByIdMap[user.sellerId] : null;
        const affiliatedBarId = String(sellerProfile?.affiliatedBarId || "").trim();
        const sellerType = user.role === "seller"
          ? (affiliatedBarId ? "affiliated" : "independent")
          : "";
        return {
          id: user.id,
          role: user.role,
          name: user.name || user.id,
          email: user.email || "",
          sellerType,
          affiliatedBarId,
          linkedSellerCount: user.role === "bar" ? (barLinkedSellerCount[user.barId] || 0) : 0,
          revenueAllTime: Number(revenueAllTime.toFixed(2)),
          revenueInWindow: Number(revenueInWindow.toFixed(2)),
          paidAllTime: Number(paidAllTime.toFixed(2)),
          paidInWindow: Number(paidInWindow.toFixed(2)),
          owedNow,
          payableNow,
          isBelowThreshold,
        };
      })
      .filter((row) => {
        if (paymentsEntityRoleFilter !== "all" && row.role !== paymentsEntityRoleFilter) return false;
        if (paymentsSellerTypeFilter !== "all") {
          if (row.role !== "seller") return false;
          if (row.sellerType !== paymentsSellerTypeFilter) return false;
        }
        const query = paymentsEntitySearch.trim().toLowerCase();
        if (!query) return true;
        return `${row.name} ${row.email} ${row.id}`.toLowerCase().includes(query);
      })
      .sort((a, b) => b.payableNow - a.payableNow || b.owedNow - a.owedNow || b.revenueInWindow - a.revenueInWindow);
  }, [
    walletTransactions,
    users,
    sellers,
    payoutItems,
    payoutPaidSourceTxIds,
    paymentsEntityRoleFilter,
    paymentsSellerTypeFilter,
    paymentsEntitySearch,
    paymentWindowMeta,
  ]);
  const payoutIntelligenceSummary = useMemo(
    () =>
      payoutIntelligenceRows.reduce((summary, row) => {
        summary.revenueInWindow += row.revenueInWindow;
        summary.paidInWindow += row.paidInWindow;
        summary.owedNow += row.owedNow;
        summary.payableNow += row.payableNow;
        if (row.isBelowThreshold) summary.belowThresholdCount += 1;
        return summary;
      }, {
        revenueInWindow: 0,
        paidInWindow: 0,
        owedNow: 0,
        payableNow: 0,
        belowThresholdCount: 0,
      }),
    [payoutIntelligenceRows]
  );
  const payoutHistoryRows = useMemo(
    () =>
      [...(payoutItems || [])]
        .map((item) => {
          const recipient = (users || []).find((user) => user.id === item.recipientUserId);
          const run = (payoutRuns || []).find((row) => row.id === item.runId);
          return {
            ...item,
            recipientName: recipient?.name || item.recipientUserId,
            periodLabel: run?.periodLabel || "Unknown period",
            periodStart: run?.periodStart || "",
            periodEnd: run?.periodEnd || "",
            runStatus: run?.status || "processing",
          };
        })
        .sort((a, b) => {
          const aTime = new Date(a.paidAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.paidAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        }),
    [payoutItems, payoutRuns, users]
  );
  const filteredPayoutHistoryRows = useMemo(
    () =>
      payoutHistoryRows.filter((row) => {
        if (payoutHistoryRecipientFilter !== "all" && row.recipientRole !== payoutHistoryRecipientFilter) return false;
        if (payoutHistoryStatusFilter !== "all" && row.status !== payoutHistoryStatusFilter) return false;
        if (payoutHistoryMonthFilter !== "all") {
          const rowMonth = String(row.periodStart || "").slice(0, 7);
          if (rowMonth !== payoutHistoryMonthFilter) return false;
        }
        return true;
      }),
    [payoutHistoryRows, payoutHistoryRecipientFilter, payoutHistoryStatusFilter, payoutHistoryMonthFilter]
  );
  const payoutHistoryMonthOptions = useMemo(
    () =>
      Array.from(
        new Set(
          payoutHistoryRows
            .map((row) => String(row.periodStart || "").slice(0, 7))
            .filter(Boolean)
        )
      ).sort((a, b) => b.localeCompare(a)),
    [payoutHistoryRows]
  );
  const buildPayoutHistoryCsv = (rows) => {
    const header = [
      "period",
      "recipient_name",
      "recipient_role",
      "amount_thb",
      "status",
      "method",
      "reference",
      "paid_at",
      "notes",
      "run_status",
    ];
    const escapeCsv = (value) => {
      const normalized = String(value ?? "");
      if (/[",\n]/.test(normalized)) return `"${normalized.replace(/"/g, "\"\"")}"`;
      return normalized;
    };
    const csvRows = rows.map((row) => ([
      row.periodLabel || "",
      row.recipientName || "",
      row.recipientRole || "",
      Number(row.netPayable || 0).toFixed(2),
      row.status || "",
      row.method || "",
      row.externalReference || "",
      row.paidAt || "",
      row.notes || "",
      row.runStatus || "",
    ]));
    return [header, ...csvRows].map((cols) => cols.map(escapeCsv).join(",")).join("\n");
  };
  const downloadPayoutHistoryCsv = (rows, filenameSuffix = "filtered") => {
    const csv = buildPayoutHistoryCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `payout-history-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };
  const payoutAnalyticsDateWindow = useMemo(() => {
    const now = new Date();
    if (payoutAnalyticsPreset === "current_month") {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { startMs: start.getTime(), endMs: end.getTime(), label: "Current month" };
    }
    if (payoutAnalyticsPreset === "current_cycle") {
      const cycleRun = activePayoutRun || sortedPayoutRuns[0] || null;
      if (cycleRun?.periodStart && cycleRun?.periodEnd) {
        return {
          startMs: new Date(cycleRun.periodStart).getTime(),
          endMs: new Date(cycleRun.periodEnd).getTime(),
          label: cycleRun.periodLabel || "Current payout cycle",
        };
      }
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { startMs: start.getTime(), endMs: end.getTime(), label: "Current payout cycle" };
    }
    if (payoutAnalyticsPreset === "custom") {
      const startMs = payoutAnalyticsStartDate
        ? new Date(`${payoutAnalyticsStartDate}T00:00:00.000Z`).getTime()
        : null;
      const endMs = payoutAnalyticsEndDate
        ? new Date(`${payoutAnalyticsEndDate}T23:59:59.999Z`).getTime()
        : null;
      return {
        startMs: Number.isFinite(startMs) ? startMs : null,
        endMs: Number.isFinite(endMs) ? endMs : null,
        label: "Custom range",
      };
    }
    return { startMs: null, endMs: null, label: "All time" };
  }, [
    payoutAnalyticsPreset,
    payoutAnalyticsStartDate,
    payoutAnalyticsEndDate,
    activePayoutRun,
    sortedPayoutRuns,
  ]);
  const payoutRecipientRows = useMemo(() => {
    const usersById = Object.fromEntries((users || []).map((user) => [user.id, user]));
    const sellersById = Object.fromEntries((sellers || []).map((seller) => [seller.id, seller]));
    const holdCutoffMs = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const eligibleTypes = new Set(["message_fee", "order_sale_earning", "order_bar_commission"]);
    const isRecipientIncluded = (user) => {
      if (!user || !["seller", "bar"].includes(user.role)) return false;
      if (payoutAnalyticsRecipientFilter !== "all" && user.role !== payoutAnalyticsRecipientFilter) return false;
      if (user.role !== "seller" || payoutAnalyticsSellerTypeFilter === "all") return true;
      const sellerProfile = sellersById[user.sellerId];
      const isIndependent = !String(sellerProfile?.affiliatedBarId || "").trim();
      if (payoutAnalyticsSellerTypeFilter === "independent") return isIndependent;
      if (payoutAnalyticsSellerTypeFilter === "affiliated") return !isIndependent;
      return true;
    };
    const startMs = payoutAnalyticsDateWindow.startMs;
    const endMs = payoutAnalyticsDateWindow.endMs;
    const inWindow = (createdAtMs) => {
      if (!Number.isFinite(createdAtMs)) return false;
      if (startMs !== null && createdAtMs < startMs) return false;
      if (endMs !== null && createdAtMs > endMs) return false;
      return true;
    };
    const paidSourceTxIds = new Set();
    (payoutItems || []).forEach((item) => {
      if (item?.status !== "sent") return;
      (item.sourceTxIds || []).forEach((txId) => paidSourceTxIds.add(String(txId)));
    });
    const byRecipient = {};
    const ensureRecipient = (userId) => {
      const user = usersById[userId];
      if (!isRecipientIncluded(user)) return null;
      if (!byRecipient[userId]) {
        const sellerProfile = user?.role === "seller" ? sellersById[user?.sellerId] : null;
        const independentLabel = user?.role === "seller"
          ? (!String(sellerProfile?.affiliatedBarId || "").trim() ? "Independent" : "Affiliated")
          : "";
        byRecipient[userId] = {
          userId,
          name: user?.name || userId,
          role: user?.role || "seller",
          sellerType: independentLabel,
          totalRevenueInView: 0,
          totalPayoutSentInView: 0,
          owedNow: 0,
          owedInView: 0,
          earningTxCountInView: 0,
        };
      }
      return byRecipient[userId];
    };
    (walletTransactions || []).forEach((entry) => {
      const user = usersById[entry.userId];
      if (!isRecipientIncluded(user)) return;
      if (!eligibleTypes.has(String(entry.type || ""))) return;
      const amount = Number(entry.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const createdAtMs = new Date(entry.createdAt || 0).getTime();
      const row = ensureRecipient(entry.userId);
      if (!row) return;
      if (inWindow(createdAtMs)) {
        row.totalRevenueInView += amount;
        row.earningTxCountInView += 1;
      }
      if (createdAtMs <= holdCutoffMs && !paidSourceTxIds.has(String(entry.id))) {
        row.owedNow += amount;
        if (inWindow(createdAtMs)) row.owedInView += amount;
      }
    });
    (payoutItems || []).forEach((item) => {
      if (item?.status !== "sent") return;
      const row = ensureRecipient(item.recipientUserId);
      if (!row) return;
      const paidAtMs = new Date(item.paidAt || item.createdAt || 0).getTime();
      if (inWindow(paidAtMs)) {
        row.totalPayoutSentInView += Number(item.netPayable || 0);
      }
    });
    return Object.values(byRecipient)
      .map((row) => ({
        ...row,
        totalRevenueInView: Number(row.totalRevenueInView.toFixed(2)),
        totalPayoutSentInView: Number(row.totalPayoutSentInView.toFixed(2)),
        owedNow: Number(row.owedNow.toFixed(2)),
        owedInView: Number(row.owedInView.toFixed(2)),
      }))
      .sort((a, b) => b.owedNow - a.owedNow);
  }, [
    users,
    sellers,
    walletTransactions,
    payoutItems,
    payoutAnalyticsRecipientFilter,
    payoutAnalyticsSellerTypeFilter,
    payoutAnalyticsDateWindow,
  ]);
  const payoutRecipientSummary = useMemo(() => (
    payoutRecipientRows.reduce((summary, row) => {
      summary.revenue += row.totalRevenueInView;
      summary.payouts += row.totalPayoutSentInView;
      summary.owedNow += row.owedNow;
      summary.owedInView += row.owedInView;
      return summary;
    }, { revenue: 0, payouts: 0, owedNow: 0, owedInView: 0 })
  ), [payoutRecipientRows]);
  const adminLocale = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
    ? currentUser.preferredLanguage
    : "en";
  const adminMobileNavText = ADMIN_MOBILE_NAV_I18N[adminLocale] || ADMIN_MOBILE_NAV_I18N.en;
  const emailTestScenarioOptions = [
    { value: "default", label: "Standard template" },
    { value: "buyer_message", label: "Buyer receives seller message" },
    { value: "seller_message", label: "Seller receives buyer message" },
    { value: "custom_request", label: "New custom request" },
    { value: "custom_request_status", label: "Custom request status update" },
    { value: "wallet_top_up", label: "Wallet top-up confirmation" },
    { value: "wallet_low", label: "Low wallet balance warning" },
    { value: "order_shipped", label: "Order shipped with tracking" },
    { value: "payout_sent", label: "Payout sent notification" },
  ];
  const recommendedScenarioByTemplateKey = {
    buyer_message_received: "buyer_message",
    seller_message_received: "seller_message",
    custom_request_received: "custom_request",
    custom_request_status_changed: "custom_request_status",
    wallet_top_up_completed: "wallet_top_up",
    wallet_low_balance: "wallet_low",
    order_shipped: "order_shipped",
    payout_sent: "payout_sent",
  };
  const emailTemplatesList = emailTemplates || [];
  const effectiveSelectedEmailTemplateKey =
    (selectedEmailTemplateKey && emailTemplatesList.some((template) => template.key === selectedEmailTemplateKey))
      ? selectedEmailTemplateKey
      : (emailTemplatesList[0]?.key || null);
  const activeEmailTemplate = emailTemplatesList.find((template) => template.key === effectiveSelectedEmailTemplateKey) || null;
  const activeEmailDraft = activeEmailTemplate ? (emailTemplateDrafts[activeEmailTemplate.key] || activeEmailTemplate) : null;
  const activeEmailScenario = activeEmailTemplate
    ? (emailTemplateScenarioByKey[activeEmailTemplate.key] || recommendedScenarioByTemplateKey[activeEmailTemplate.key] || "default")
    : "default";
  const emailPreviewVarsByScenario = {
    default: {
      recipientName: "Sam",
      senderName: "Test Sender",
      conversationId: "buyer-1__nina-b",
      buyerName: "Alex T.",
      requestId: "custom_request_test_001",
      requestStatus: "reviewing",
      amount: formatPriceTHB(500),
      walletBalance: formatPriceTHB(240),
    },
    buyer_message: {
      recipientName: "Alex T.",
      senderName: "Nina B.",
      conversationId: "buyer-1__nina-b",
      buyerName: "Alex T.",
      requestId: "custom_request_test_001",
      requestStatus: "reviewing",
      amount: formatPriceTHB(500),
      walletBalance: formatPriceTHB(240),
    },
    seller_message: {
      recipientName: "Nina B.",
      senderName: "Alex T.",
      conversationId: "buyer-1__nina-b",
      buyerName: "Alex T.",
      requestId: "custom_request_test_001",
      requestStatus: "reviewing",
      amount: formatPriceTHB(500),
      walletBalance: formatPriceTHB(240),
    },
    custom_request: {
      recipientName: "Nina B.",
      senderName: "Alex T.",
      conversationId: "buyer-1__nina-b",
      buyerName: "Alex T.",
      requestId: "custom_request_test_447",
      requestStatus: "open",
      amount: formatPriceTHB(700),
      walletBalance: formatPriceTHB(560),
    },
    custom_request_status: {
      recipientName: "Alex T.",
      senderName: "Nina B.",
      conversationId: "buyer-1__nina-b",
      buyerName: "Alex T.",
      requestId: "custom_request_test_447",
      requestStatus: "fulfilled",
      amount: formatPriceTHB(700),
      walletBalance: formatPriceTHB(560),
    },
    wallet_top_up: {
      recipientName: "Alex T.",
      senderName: "Payment System",
      conversationId: "buyer-1__nina-b",
      buyerName: "Alex T.",
      requestId: "custom_request_test_001",
      requestStatus: "reviewing",
      amount: formatPriceTHB(1200),
      walletBalance: formatPriceTHB(1580),
    },
    wallet_low: {
      recipientName: "Alex T.",
      senderName: "Payment System",
      conversationId: "buyer-1__nina-b",
      buyerName: "Alex T.",
      requestId: "custom_request_test_001",
      requestStatus: "reviewing",
      amount: formatPriceTHB(120),
      walletBalance: formatPriceTHB(220),
    },
    order_shipped: {
      recipientName: "Alex T.",
      orderId: "order_test_3091",
      trackingCarrier: "Thailand Post / EMS",
      trackingNumber: "TH1234567890",
      trackingUrl: "https://www.17track.net/en/track?nums=TH1234567890",
    },
    payout_sent: {
      recipientName: "Dao P.",
      amount: formatPriceTHB(3400),
      periodLabel: "March 2026",
      method: "Bank transfer",
      referenceId: "PAYOUT-MAR-2026-001",
    },
  };
  const renderTemplateWithVars = (text, vars) =>
    String(text || "").replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, token) => {
      const value = vars?.[token];
      return value === undefined || value === null ? "" : String(value);
    });
  const hasUnsavedTemplateChanges = (template) => {
    const draft = emailTemplateDrafts[template.key];
    if (!draft) return false;
    return (
      String(draft.subject || "") !== String(template.subject || "") ||
      String(draft.body || "") !== String(template.body || "") ||
      String(draft.ctaLabel || "") !== String(template.ctaLabel || "") ||
      String(draft.ctaPath || "") !== String(template.ctaPath || "") ||
      Boolean(draft.enabled !== false) !== Boolean(template.enabled !== false)
    );
  };

  const unresolvedReports = useMemo(
    () => (postReports || []).filter((report) => report.status !== "resolved"),
    [postReports]
  );
  const unresolvedCommentReports = useMemo(
    () => (commentReports || []).filter((report) => report.status !== "resolved"),
    [commentReports]
  );
  const unresolvedMessageReports = useMemo(
    () => (messageReports || []).filter((report) => report.status === "open"),
    [messageReports]
  );
  const getAdminMessageReportReasonLabel = (reasonCategory) => {
    const labels = {
      direct_payment_request: "Asked for direct payment outside platform",
      off_platform_contact: "Asked to move to another messaging app",
      harassment_abuse: "Harassment or abusive language",
      scam_fraud: "Scam or suspicious behavior",
      other: "Other",
    };
    return labels[reasonCategory] || labels.other;
  };
  const reportedPostIds = useMemo(
    () => new Set(unresolvedReports.map((report) => report.postId)),
    [unresolvedReports]
  );
  const socialPostsFiltered = useMemo(() => {
    const q = socialSearch.trim().toLowerCase();
    return (sellerPosts || []).filter((post) => {
      if (socialFilter === "reported" && !reportedPostIds.has(post.id)) return false;
      if (!q) return true;
      const sellerName = (sellerMap[post.sellerId]?.name || "").toLowerCase();
      return (
        (post.caption || "").toLowerCase().includes(q) ||
        (post.id || "").toLowerCase().includes(q) ||
        sellerName.includes(q)
      );
    });
  }, [sellerPosts, socialFilter, socialSearch, reportedPostIds, sellerMap]);

  const visibleSocialPosts = socialPostsFiltered.slice(0, socialVisibleCount);
  const visibleOpenReports = unresolvedReports.slice(0, reportVisibleCount);
  const visibleOpenCommentReports = unresolvedCommentReports.slice(0, reportVisibleCount);
  const visibleOpenMessageReports = unresolvedMessageReports.slice(0, reportVisibleCount);
  const pendingAppeals = useMemo(
    () => (userAppeals || []).filter((appeal) => appeal.status === "pending"),
    [userAppeals]
  );
  const activeStrikesByUserId = useMemo(() => {
    const map = {};
    (userStrikes || []).forEach((strike) => {
      if (strike.status !== "active") return;
      map[strike.userId] = (map[strike.userId] || 0) + 1;
    });
    return map;
  }, [userStrikes]);
  const socialInsights = useMemo(() => {
    const totalPosts = (sellerPosts || []).length;
    const totalLikes = (sellerPostLikes || []).length;
    const totalComments = (sellerPostComments || []).length;
    const totalFollows = (sellerFollows || []).length;
    const last7Days = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const newPosts7d = (sellerPosts || []).filter((post) => new Date(post.createdAt || 0).getTime() >= last7Days).length;
    const engagement7d =
      (sellerPostLikes || []).filter((entry) => new Date(entry.createdAt || 0).getTime() >= last7Days).length +
      (sellerPostComments || []).filter((entry) => new Date(entry.createdAt || 0).getTime() >= last7Days).length;
    return { totalPosts, totalLikes, totalComments, totalFollows, newPosts7d, engagement7d };
  }, [sellerPosts, sellerPostLikes, sellerPostComments, sellerFollows]);
  const recentModerationActions = useMemo(
    () =>
      (adminActions || [])
        .filter((action) => [
          "report_seller_post",
          "resolve_post_report",
          "delete_seller_post",
          "report_direct_message",
          "resolve_message_report",
          "dismiss_message_report",
        ].includes(action.type))
        .slice(-12)
        .reverse(),
    [adminActions]
  );
  const sellerUserBySellerId = useMemo(() => {
    const map = {};
    (users || []).forEach((user) => {
      if (user.role === "seller" && user.sellerId) {
        map[user.sellerId] = user;
      }
    });
    return map;
  }, [users]);
  const sellersByBarId = useMemo(() => {
    const map = {};
    (sellers || []).forEach((seller) => {
      const barId = String(seller?.affiliatedBarId || "").trim();
      if (!barId) return;
      if (!map[barId]) map[barId] = [];
      map[barId].push(seller);
    });
    return map;
  }, [sellers]);
  const independentSellers = useMemo(
    () => (sellers || []).filter((seller) => !String(seller?.affiliatedBarId || "").trim()),
    [sellers],
  );
  const sellerById = useMemo(() => {
    const map = {};
    (sellers || []).forEach((seller) => {
      map[seller.id] = seller;
    });
    return map;
  }, [sellers]);
  const barById = useMemo(() => {
    const map = {};
    (bars || []).forEach((bar) => {
      map[bar.id] = bar;
    });
    return map;
  }, [bars]);
  const userById = useMemo(() => {
    const map = {};
    (users || []).forEach((user) => {
      map[user.id] = user;
    });
    return map;
  }, [users]);
  const barUserByBarId = useMemo(() => {
    const map = {};
    (users || []).forEach((user) => {
      if (user?.role === "bar" && user?.barId) {
        map[user.barId] = user;
      }
    });
    return map;
  }, [users]);
  const barEarningsByBarId = useMemo(() => {
    const summary = {};
    (bars || []).forEach((bar) => {
      const barUser = barUserByBarId[bar.id];
      const ledgerRows = (walletTransactions || [])
        .filter((entry) => entry.userId === barUser?.id && Number(entry.amount || 0) > 0)
        .filter((entry) => (
          entry.type === "order_bar_commission"
          || (entry.type === "message_fee" && String(entry.description || "").toLowerCase().includes("bar commission"))
        ));
      const bySource = ledgerRows.reduce((acc, entry) => {
        const amount = Number(entry.amount || 0);
        const description = String(entry.description || "").toLowerCase();
        if (description.includes("custom request")) {
          acc.customRequests += amount;
        } else if (description.includes("message")) {
          acc.messages += amount;
        } else if (description.includes("order")) {
          acc.orders += amount;
        } else {
          acc.other += amount;
        }
        return acc;
      }, {
        orders: 0,
        messages: 0,
        customRequests: 0,
        other: 0,
      });
      const sellerAgg = {};
      (orders || []).forEach((order) => {
        const rows = order?.payoutSummary?.bySeller || [];
        rows.forEach((row) => {
          if (String(row?.barId || "") !== bar.id) return;
          const sellerId = String(row?.sellerId || "").trim();
          if (!sellerId) return;
          if (!sellerAgg[sellerId]) {
            sellerAgg[sellerId] = {
              sellerId,
              sellerName: row?.sellerName || sellerId,
              amount: 0,
              orderCount: 0,
            };
          }
          sellerAgg[sellerId].amount += Number(row?.barAmount || 0);
          sellerAgg[sellerId].orderCount += 1;
        });
      });
      const bySeller = Object.values(sellerAgg)
        .map((entry) => ({ ...entry, amount: Number(entry.amount.toFixed(2)) }))
        .sort((a, b) => b.amount - a.amount);
      summary[bar.id] = {
        total: Number(ledgerRows.reduce((sum, entry) => sum + Number(entry.amount || 0), 0).toFixed(2)),
        bySource: {
          orders: Number(bySource.orders.toFixed(2)),
          messages: Number(bySource.messages.toFixed(2)),
          customRequests: Number(bySource.customRequests.toFixed(2)),
          other: Number(bySource.other.toFixed(2)),
        },
        txCount: ledgerRows.length,
        bySeller,
      };
    });
    return summary;
  }, [bars, barUserByBarId, walletTransactions, orders]);
  const customRequestById = useMemo(() => {
    const map = {};
    (customRequests || []).forEach((request) => {
      map[request.id] = request;
    });
    return map;
  }, [customRequests]);
  const inboxReviewByItemKey = useMemo(() => {
    const map = {};
    (adminInboxReviews || []).forEach((entry) => {
      if (!entry?.itemKey) return;
      const existing = map[entry.itemKey];
      if (!existing || new Date(entry.updatedAt || 0).getTime() >= new Date(existing.updatedAt || 0).getTime()) {
        map[entry.itemKey] = entry;
      }
    });
    return map;
  }, [adminInboxReviews]);
  const inboxItems = useMemo(() => {
    const riskPattern = /\b(refund|chargeback|scam|fraud|abuse|harass|threat|urgent|problem|issue|dispute|complain)\b/i;
    const resolvePriority = ({ text, basePriority = "medium", requestStatus = "" }) => {
      const haystack = String(text || "");
      if (riskPattern.test(haystack)) return "high";
      if (requestStatus === "open" || requestStatus === "reviewing") return "high";
      return basePriority;
    };
    const directMessages = (messages || []).map((message) => {
      const sellerUser = sellerUserBySellerId[message.sellerId];
      const buyer = userById[message.buyerId];
      const review = inboxReviewByItemKey[`message:${message.id}`];
      const actorUserId = message.senderRole === "buyer" ? message.buyerId : (sellerUser?.id || null);
      const counterpartUserId = message.senderRole === "buyer" ? (sellerUser?.id || null) : message.buyerId;
      return {
        itemKey: `message:${message.id}`,
        id: message.id,
        conversationId: message.conversationId || null,
        type: "message",
        typeLabel: "Direct message",
        priority: resolvePriority({ text: message.body, basePriority: "medium" }),
        reviewStatus: review?.status || "new",
        reviewUpdatedAt: review?.updatedAt || null,
        createdAt: message.createdAt || null,
        actorLabel: message.senderRole === "buyer" ? (buyer?.name || message.buyerId) : (sellerUser?.name || message.sellerId),
        counterpartLabel: message.senderRole === "buyer" ? (sellerUser?.name || message.sellerId) : (buyer?.name || message.buyerId),
        actorUserId,
        counterpartUserId,
        requestStatus: null,
        body: String(message.body || ""),
        bodySnippet: String(message.body || "").slice(0, 180),
        requestId: null,
        actionPath: "/account",
        searchText: `${message.id} ${message.body || ""} ${buyer?.name || ""} ${sellerUser?.name || ""}`.toLowerCase(),
      };
    });
    const requestEvents = (customRequests || []).map((request) => {
      const sellerUser = sellerUserBySellerId[request.sellerId];
      const buyer = userById[request.buyerUserId];
      const review = inboxReviewByItemKey[`custom_request:${request.id}`];
      return {
        itemKey: `custom_request:${request.id}`,
        id: request.id,
        conversationId: null,
        type: "custom_request",
        typeLabel: "Custom request",
        priority: resolvePriority({
          text: `${request.requestBody || ""} ${request.preferredDetails || ""}`,
          basePriority: request.status === "fulfilled" || request.status === "closed" || request.status === "cancelled" ? "low" : "medium",
          requestStatus: request.status || "",
        }),
        reviewStatus: review?.status || "new",
        reviewUpdatedAt: review?.updatedAt || null,
        createdAt: request.createdAt || request.updatedAt || null,
        actorLabel: buyer?.name || request.buyerName || request.buyerUserId,
        counterpartLabel: sellerUser?.name || request.sellerId,
        actorUserId: request.buyerUserId || null,
        counterpartUserId: sellerUser?.id || null,
        requestStatus: request.status || "open",
        body: String(request.requestBody || ""),
        bodySnippet: String(request.requestBody || "").slice(0, 180),
        requestId: request.id,
        actionPath: "/custom-requests",
        searchText: `${request.id} ${request.requestBody || ""} ${request.preferredDetails || ""} ${buyer?.name || ""} ${sellerUser?.name || ""}`.toLowerCase(),
      };
    });
    const requestMessages = (customRequestMessages || []).map((message) => {
      const request = customRequestById[message.requestId];
      const sellerUser = request ? sellerUserBySellerId[request.sellerId] : null;
      const buyer = request ? userById[request.buyerUserId] : null;
      const sender = userById[message.senderUserId];
      const review = inboxReviewByItemKey[`custom_request_message:${message.id}`];
      const counterpartUserId = message.senderRole === "buyer" ? (sellerUser?.id || null) : (request?.buyerUserId || null);
      return {
        itemKey: `custom_request_message:${message.id}`,
        id: message.id,
        conversationId: null,
        type: "custom_request_message",
        typeLabel: "Custom request message",
        priority: resolvePriority({ text: message.body, basePriority: "medium" }),
        reviewStatus: review?.status || "new",
        reviewUpdatedAt: review?.updatedAt || null,
        createdAt: message.createdAt || null,
        actorLabel: sender?.name || message.senderRole || message.senderUserId,
        counterpartLabel: message.senderRole === "buyer" ? (sellerUser?.name || request?.sellerId || "Seller") : (buyer?.name || request?.buyerUserId || "Buyer"),
        actorUserId: message.senderUserId || null,
        counterpartUserId,
        requestStatus: request?.status || null,
        body: String(message.body || ""),
        bodySnippet: String(message.body || "").slice(0, 180),
        requestId: message.requestId || null,
        actionPath: "/custom-requests",
        searchText: `${message.id} ${message.requestId || ""} ${message.body || ""} ${sender?.name || ""} ${buyer?.name || ""} ${sellerUser?.name || ""}`.toLowerCase(),
      };
    });
    const refundClaimEvents = (refundClaims || []).map((claim) => {
      const buyer = userById[claim.buyerUserId];
      const review = inboxReviewByItemKey[`refund_claim:${claim.id}`];
      return {
        itemKey: `refund_claim:${claim.id}`,
        id: claim.id,
        conversationId: null,
        type: "refund_claim",
        typeLabel: "Refund evidence",
        priority: resolvePriority({
          text: `${claim.evidenceDetails || ""} ${claim.expectedItem || ""} ${claim.receivedItem || ""}`,
          basePriority: claim.status === "resolved" || claim.status === "rejected" ? "low" : "high",
        }),
        reviewStatus: review?.status || "new",
        reviewUpdatedAt: review?.updatedAt || null,
        createdAt: claim.createdAt || null,
        actorLabel: buyer?.name || claim.buyerUserId || "Buyer",
        counterpartLabel: "Admin",
        actorUserId: claim.buyerUserId || null,
        counterpartUserId: null,
        requestStatus: claim.status || "submitted",
        evidenceLinks: Array.isArray(claim.evidenceLinks) ? claim.evidenceLinks : [],
        decisionNote: String(claim.decisionNote || ""),
        refundAmount: Number(claim.refundAmount || 0),
        body: `Order ${claim.orderId}: expected "${claim.expectedItem}", received "${claim.receivedItem}". ${claim.evidenceDetails || ""}`,
        bodySnippet: `Order ${claim.orderId}: expected "${claim.expectedItem}", received "${claim.receivedItem}".`,
        requestId: claim.orderId || null,
        actionPath: "/refund-evidence",
        searchText: `${claim.id} ${claim.orderId || ""} ${claim.expectedItem || ""} ${claim.receivedItem || ""} ${claim.evidenceDetails || ""} ${(claim.evidenceLinks || []).join(" ")} ${buyer?.name || ""}`.toLowerCase(),
      };
    });
    const orderHelpEvents = (orderHelpRequests || []).map((request) => {
      const requester = request?.userId ? userById[request.userId] : null;
      const review = inboxReviewByItemKey[`order_help_request:${request.id}`];
      const requestBody = String(request?.message || "");
      return {
        itemKey: `order_help_request:${request.id}`,
        id: request.id,
        conversationId: null,
        type: "order_help_request",
        typeLabel: "Order help request",
        priority: resolvePriority({ text: requestBody, basePriority: "medium" }),
        reviewStatus: review?.status || "new",
        reviewUpdatedAt: review?.updatedAt || null,
        createdAt: request?.createdAt || null,
        actorLabel: requester?.name || request?.name || request?.email || "Guest",
        counterpartLabel: "Support",
        actorUserId: requester?.id || null,
        counterpartUserId: null,
        requestStatus: request?.status || "submitted",
        issueType: String(request?.issueType || "other"),
        requesterEmail: String(request?.email || ""),
        adminNote: String(request?.adminNote || ""),
        body: requestBody,
        bodySnippet: requestBody.slice(0, 180),
        requestId: request?.orderId || null,
        actionPath: "/order-help",
        searchText: `${request.id} ${request.orderId || ""} ${request.issueType || ""} ${request.message || ""} ${request.name || ""} ${request.email || ""}`.toLowerCase(),
      };
    });
    const safetyReportEvents = (safetyReports || []).map((report) => {
      const reporter = report?.userId ? userById[report.userId] : null;
      const review = inboxReviewByItemKey[`safety_report:${report.id}`];
      const reportBody = String(report?.contextDetails || "");
      return {
        itemKey: `safety_report:${report.id}`,
        id: report.id,
        conversationId: null,
        type: "safety_report",
        typeLabel: "Safety report",
        priority: resolvePriority({ text: reportBody, basePriority: "high" }),
        reviewStatus: review?.status || "new",
        reviewUpdatedAt: review?.updatedAt || null,
        createdAt: report?.createdAt || null,
        actorLabel: reporter?.name || report?.name || report?.email || "Guest",
        counterpartLabel: "Admin",
        actorUserId: reporter?.id || null,
        counterpartUserId: null,
        requestStatus: report?.status || "submitted",
        reportType: String(report?.reportType || "other"),
        reporterEmail: String(report?.email || ""),
        targetHandle: String(report?.targetHandle || ""),
        body: reportBody,
        bodySnippet: reportBody.slice(0, 180),
        requestId: null,
        actionPath: "/safety-report",
        searchText: `${report.id} ${report.reportType || ""} ${report.targetHandle || ""} ${report.contextDetails || ""} ${report.name || ""} ${report.email || ""}`.toLowerCase(),
      };
    });
    const barAffiliationEvents = (barAffiliationRequests || []).filter((request) => request.status === "pending").map((request) => {
      const seller = sellerById[request.sellerId];
      const bar = barById[request.barId];
      const sellerUser = seller ? sellerUserBySellerId[seller.id] : null;
      const barUser = (users || []).find((user) => user.role === "bar" && user.barId === request.barId);
      const review = inboxReviewByItemKey[`bar_affiliation_request:${request.id}`];
      const waitingForRole = request.status === "pending"
        ? (request.direction === "seller_to_bar" ? "bar" : "seller")
        : "none";
      const actionText = request.direction === "seller_to_bar"
        ? `${seller?.name || request.sellerId} requested to join ${bar?.name || request.barId}`
        : `${bar?.name || request.barId} invited ${seller?.name || request.sellerId} to join`;
      return {
        itemKey: `bar_affiliation_request:${request.id}`,
        id: request.id,
        conversationId: null,
        type: "bar_affiliation_request",
        typeLabel: "Bar affiliation request",
        priority: request.status === "pending" ? "high" : "low",
        reviewStatus: review?.status || "new",
        reviewUpdatedAt: review?.updatedAt || null,
        createdAt: request.createdAt || null,
        actorLabel: request.direction === "seller_to_bar"
          ? (seller?.name || request.sellerId)
          : (bar?.name || request.barId),
        counterpartLabel: request.direction === "seller_to_bar"
          ? (bar?.name || request.barId)
          : (seller?.name || request.sellerId),
        actorUserId: request.direction === "seller_to_bar" ? (sellerUser?.id || null) : (barUser?.id || null),
        counterpartUserId: request.direction === "seller_to_bar" ? (barUser?.id || null) : (sellerUser?.id || null),
        requestStatus: request.status || "pending",
        body: `${actionText}. Requested by ${request.requestedByRole}.`,
        bodySnippet: actionText,
        requestId: request.id,
        waitingForRole,
        affiliationDirection: request.direction,
        barId: request.barId,
        sellerId: request.sellerId,
        actionPath: "/admin",
        searchText: `${request.id} ${request.direction || ""} ${request.status || ""} ${seller?.name || ""} ${bar?.name || ""}`.toLowerCase(),
      };
    });
    return [...directMessages, ...requestEvents, ...requestMessages, ...refundClaimEvents, ...orderHelpEvents, ...safetyReportEvents, ...barAffiliationEvents]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [
    messages,
    customRequests,
    customRequestMessages,
    refundClaims,
    orderHelpRequests,
    safetyReports,
    barAffiliationRequests,
    sellerUserBySellerId,
    sellerById,
    barById,
    users,
    userById,
    customRequestById,
    inboxReviewByItemKey
  ]);
  const inboxCounts = useMemo(() => ({
    total: inboxItems.length,
    highPriority: inboxItems.filter((item) => item.priority === "high").length,
    new: inboxItems.filter((item) => item.reviewStatus === "new").length,
    followUp: inboxItems.filter((item) => item.reviewStatus === "follow_up").length,
    resolved: inboxItems.filter((item) => item.reviewStatus === "resolved").length,
  }), [inboxItems]);
  const filteredInboxItems = useMemo(() => {
    const search = inboxSearch.trim().toLowerCase();
    return inboxItems.filter((item) => {
      if (inboxTypeFilter !== "all" && item.type !== inboxTypeFilter) return false;
      if (inboxPriorityFilter !== "all" && item.priority !== inboxPriorityFilter) return false;
      if (inboxReviewFilter !== "all" && item.reviewStatus !== inboxReviewFilter) return false;
      if (!search) return true;
      return item.searchText.includes(search);
    });
  }, [inboxItems, inboxSearch, inboxTypeFilter, inboxPriorityFilter, inboxReviewFilter]);
  const visibleInboxItems = filteredInboxItems.slice(0, inboxVisibleCount);
  const inboxDigest = useMemo(() => {
    const nowMs = Date.now();
    const oneDayAgoMs = nowMs - (24 * 60 * 60 * 1000);
    const highPriorityUnresolved = inboxItems.filter((item) => (
      item.priority === "high" && item.reviewStatus !== "resolved"
    ));
    const followUpOlderThan24h = inboxItems.filter((item) => {
      if (item.reviewStatus !== "follow_up") return false;
      const reviewedAtMs = new Date(item.reviewUpdatedAt || item.createdAt || 0).getTime();
      return reviewedAtMs > 0 && reviewedAtMs < oneDayAgoMs;
    });
    const newSinceYesterday = inboxItems.filter((item) => {
      const createdAtMs = new Date(item.createdAt || 0).getTime();
      return createdAtMs >= oneDayAgoMs;
    });
    return {
      highPriorityUnresolved,
      followUpOlderThan24h,
      newSinceYesterday,
      generatedAt: nowMs,
    };
  }, [inboxItems]);
  const conversationSummaryById = useMemo(() => {
    const grouped = {};
    (messages || []).forEach((message) => {
      if (!grouped[message.conversationId]) grouped[message.conversationId] = [];
      grouped[message.conversationId].push(message);
    });
    const summary = {};
    Object.entries(grouped).forEach(([conversationId, list]) => {
      const sorted = [...list].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      const latest = sorted[sorted.length - 1];
      summary[conversationId] = {
        count: sorted.length,
        latest,
        latestAtMs: new Date(latest?.createdAt || 0).getTime(),
      };
    });
    return summary;
  }, [messages]);
  const customRequestMessageSummaryByRequestId = useMemo(() => {
    const grouped = {};
    (customRequestMessages || []).forEach((message) => {
      if (!grouped[message.requestId]) grouped[message.requestId] = [];
      grouped[message.requestId].push(message);
    });
    const summary = {};
    Object.entries(grouped).forEach(([requestId, list]) => {
      const sorted = [...list].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      const latest = sorted[sorted.length - 1];
      summary[requestId] = {
        count: sorted.length,
        latest,
        latestAtMs: new Date(latest?.createdAt || 0).getTime(),
      };
    });
    return summary;
  }, [customRequestMessages]);
  const productById = useMemo(() => {
    const map = {};
    (products || []).forEach((product) => {
      map[product.id] = product;
    });
    return map;
  }, [products]);
  const orderStatsByBuyerId = useMemo(() => {
    const map = {};
    (orders || []).forEach((order) => {
      const buyerId = order.buyerUserId;
      if (!buyerId) return;
      if (!map[buyerId]) map[buyerId] = { count: 0, value: 0 };
      map[buyerId].count += 1;
      map[buyerId].value += Number(order.total || 0);
    });
    return map;
  }, [orders]);
  const orderStatsBySellerId = useMemo(() => {
    const map = {};
    (orders || []).forEach((order) => {
      const sellerIds = new Set(
        (order.items || [])
          .map((itemId) => productById[itemId]?.sellerId)
          .filter(Boolean),
      );
      sellerIds.forEach((sellerId) => {
        if (!map[sellerId]) map[sellerId] = { count: 0 };
        map[sellerId].count += 1;
      });
    });
    return map;
  }, [orders, productById]);
  const latestWalletTxByUserId = useMemo(() => {
    const map = {};
    (walletTransactions || []).forEach((entry) => {
      const existing = map[entry.userId];
      if (!existing || new Date(entry.createdAt || 0).getTime() > new Date(existing.createdAt || 0).getTime()) {
        map[entry.userId] = entry;
      }
    });
    return map;
  }, [walletTransactions]);
  const splitPayoutWalletRows = useMemo(() => {
    const rows = (walletTransactions || [])
      .filter((entry) => Number(entry?.amount || 0) > 0)
      .map((entry) => {
        const user = userById[entry.userId];
        if (!user) return null;
        const description = String(entry.description || "");
        const lowerDescription = description.toLowerCase();
        const isCustomRequest = lowerDescription.includes("custom request");
        const isMessageFlow = lowerDescription.includes("message");
        const isCommentFlow = lowerDescription.includes("comment");
        if (!isCustomRequest && !isMessageFlow && !isCommentFlow) return null;
        if (!["admin", "bar", "seller"].includes(user.role)) return null;
        if (entry.type !== "message_fee" && entry.type !== "order_payment") return null;
        return {
          ...entry,
          userName: user.name || user.id,
          recipientRole: user.role,
          sourceLabel: isCustomRequest
            ? "Custom request"
            : (isCommentFlow ? "Seller post comment" : "Direct message"),
          isCommission: lowerDescription.includes("commission"),
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return rows;
  }, [walletTransactions, userById]);
  const splitPayoutSummary = useMemo(() => (
    splitPayoutWalletRows.reduce((summary, row) => {
      const amount = Number(row.amount || 0);
      summary.total += amount;
      if (row.recipientRole === "seller") summary.seller += amount;
      if (row.recipientRole === "bar") summary.bar += amount;
      if (row.recipientRole === "admin") summary.admin += amount;
      if (row.sourceLabel === "Direct message") summary.directMessage += amount;
      if (row.sourceLabel === "Custom request") summary.customRequest += amount;
      if (row.sourceLabel === "Seller post comment") summary.comment += amount;
      return summary;
    }, {
      total: 0,
      seller: 0,
      bar: 0,
      admin: 0,
      directMessage: 0,
      customRequest: 0,
      comment: 0,
    })
  ), [splitPayoutWalletRows]);
  const splitSellerPct = splitPayoutSummary.total > 0
    ? Math.round((splitPayoutSummary.seller / splitPayoutSummary.total) * 100)
    : 0;
  const splitBarPct = splitPayoutSummary.total > 0
    ? Math.round((splitPayoutSummary.bar / splitPayoutSummary.total) * 100)
    : 0;
  const splitAdminPct = splitPayoutSummary.total > 0
    ? Math.round((splitPayoutSummary.admin / splitPayoutSummary.total) * 100)
    : 0;
  const filteredSplitPayoutWalletRows = useMemo(() => {
    const nowMs = Date.now();
    const minCreatedAtMs = payoutDateRangeFilter === "7d"
      ? nowMs - (7 * 24 * 60 * 60 * 1000)
      : payoutDateRangeFilter === "30d"
        ? nowMs - (30 * 24 * 60 * 60 * 1000)
        : payoutDateRangeFilter === "90d"
          ? nowMs - (90 * 24 * 60 * 60 * 1000)
          : null;
    return splitPayoutWalletRows.filter((row) => {
      if (payoutSourceFilter !== "all") {
        const sourceKey = payoutSourceFilter === "direct_message"
          ? "Direct message"
          : payoutSourceFilter === "custom_request"
            ? "Custom request"
            : "Seller post comment";
        if (row.sourceLabel !== sourceKey) return false;
      }
      if (payoutRoleFilter !== "all" && row.recipientRole !== payoutRoleFilter) return false;
      if (minCreatedAtMs !== null && new Date(row.createdAt || 0).getTime() < minCreatedAtMs) return false;
      return true;
    });
  }, [splitPayoutWalletRows, payoutSourceFilter, payoutRoleFilter, payoutDateRangeFilter]);
  const recentSplitPayoutWalletRows = useMemo(
    () => filteredSplitPayoutWalletRows.slice(0, 18),
    [filteredSplitPayoutWalletRows],
  );
  const inboxItemsWithContext = useMemo(() => {
    const nowMs = Date.now();
    return inboxItems.map((item) => {
      const conversationId = item.type === "message" ? item.conversationId : null;
      const directSummary = conversationId ? conversationSummaryById[conversationId] : null;
      const requestSummary = item.requestId ? customRequestMessageSummaryByRequestId[item.requestId] : null;
      const staleMs = Math.max(0, nowMs - (directSummary?.latestAtMs || requestSummary?.latestAtMs || new Date(item.createdAt || 0).getTime()));
      const waitingFor = item.type === "message"
        ? (directSummary?.latest?.senderRole ? ((directSummary.latest.senderRole === "buyer") ? "seller" : "buyer") : "none")
        : item.type === "custom_request"
          ? ((item.requestStatus === "fulfilled" || item.requestStatus === "closed" || item.requestStatus === "cancelled") ? "none" : "seller")
          : item.type === "refund_claim"
            ? "none"
          : item.type === "bar_affiliation_request"
            ? (item.waitingForRole || "none")
          : (requestSummary?.latest?.senderRole ? ((requestSummary.latest.senderRole === "buyer") ? "seller" : "buyer") : "none");
      const isOverdue = waitingFor !== "none" && staleMs >= 24 * 60 * 60 * 1000;
      const actorUser = item.actorUserId ? (userById[item.actorUserId] || null) : null;
      const counterpartUser = item.counterpartUserId ? (userById[item.counterpartUserId] || null) : null;
      const actorWalletTx = actorUser ? latestWalletTxByUserId[actorUser.id] : null;
      const counterpartWalletTx = counterpartUser ? latestWalletTxByUserId[counterpartUser.id] : null;
      return {
        ...item,
        waitingFor,
        waitingDurationLabel: formatDurationCompact(staleMs),
        isOverdue,
        directMessageCount: directSummary?.count || 0,
        requestMessageCount: requestSummary?.count || 0,
        actorOrderStats: actorUser?.role === "buyer"
          ? orderStatsByBuyerId[actorUser.id]
          : (actorUser?.sellerId ? orderStatsBySellerId[actorUser.sellerId] : null),
        counterpartOrderStats: counterpartUser?.role === "buyer"
          ? orderStatsByBuyerId[counterpartUser.id]
          : (counterpartUser?.sellerId ? orderStatsBySellerId[counterpartUser.sellerId] : null),
        actorWalletTx,
        counterpartWalletTx,
      };
    });
  }, [
    inboxItems,
    conversationSummaryById,
    customRequestMessageSummaryByRequestId,
    userById,
    latestWalletTxByUserId,
    orderStatsByBuyerId,
    orderStatsBySellerId,
  ]);
  const filteredInboxItemsWithContext = useMemo(() => {
    const allowedKeys = new Set(filteredInboxItems.map((entry) => entry.itemKey));
    return inboxItemsWithContext.filter((item) => allowedKeys.has(item.itemKey));
  }, [filteredInboxItems, inboxItemsWithContext]);
  const visibleInboxItemsWithContext = filteredInboxItemsWithContext.slice(0, inboxVisibleCount);
  const disputeCaseByKey = useMemo(() => {
    const map = {};
    (adminDisputeCases || []).forEach((entry) => {
      map[entry.caseKey] = entry;
    });
    return map;
  }, [adminDisputeCases]);
  const disputeQueue = useMemo(() => {
    const delayCases = (orders || [])
      .filter((order) => order.paymentStatus === "paid" && order.fulfillmentStatus !== "delivered")
      .filter((order) => (Date.now() - new Date(order.createdAt || 0).getTime()) > (3 * 24 * 60 * 60 * 1000))
      .map((order) => {
        const caseKey = `order:${order.id}`;
        const state = disputeCaseByKey[caseKey];
        return {
          caseKey,
          title: `Potential fulfillment delay: ${order.id}`,
          reason: `Paid order remains ${order.fulfillmentStatus || "processing"} after 3+ days.`,
          status: state?.status || "new",
          orderId: order.id,
          sourceType: "order_delay",
          updatedAt: state?.updatedAt || order.createdAt,
        };
      });
    const refundCases = inboxItemsWithContext
      .filter((item) => /\b(refund|chargeback|dispute|not received|wrong item|lost package)\b/i.test(item.body || ""))
      .map((item) => {
        const caseKey = `inbox:${item.itemKey}`;
        const state = disputeCaseByKey[caseKey];
        return {
          caseKey,
          title: `Refund risk from ${item.typeLabel.toLowerCase()}`,
          reason: item.bodySnippet || item.body || "Potential dispute language detected.",
          status: state?.status || "new",
          orderId: null,
          sourceType: "inbox_risk",
          updatedAt: state?.updatedAt || item.createdAt,
        };
      });
    const automatedCaseKeys = new Set([...delayCases, ...refundCases].map((entry) => entry.caseKey));
    const manualCases = (adminDisputeCases || [])
      .filter((entry) => entry?.caseKey && !automatedCaseKeys.has(entry.caseKey))
      .map((entry) => ({
        caseKey: entry.caseKey,
        title: entry.title || "Manual test dispute case",
        reason: entry.reason || "Manually created test case.",
        status: entry.status || "new",
        orderId: entry.orderId || null,
        sourceType: entry.sourceType || "manual_test",
        updatedAt: entry.updatedAt || null,
      }));
    return [...delayCases, ...refundCases, ...manualCases]
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  }, [orders, inboxItemsWithContext, disputeCaseByKey, adminDisputeCases]);
  const disputeCounts = useMemo(() => ({
    total: disputeQueue.length,
    open: disputeQueue.filter((item) => !["resolved", "rejected"].includes(item.status)).length,
    pendingRefund: disputeQueue.filter((item) => item.status === "pending_refund").length,
  }), [disputeQueue]);
  const sellerQualityByUserId = useMemo(() => {
    const result = {};
    (users || []).filter((user) => user.role === "seller").forEach((sellerUser) => {
      const sellerMessages = (messages || []).filter((message) => message.sellerId === sellerUser.sellerId);
      const grouped = {};
      sellerMessages.forEach((message) => {
        if (!grouped[message.conversationId]) grouped[message.conversationId] = [];
        grouped[message.conversationId].push(message);
      });
      const replyDurations = [];
      Object.values(grouped).forEach((conversation) => {
        const sorted = [...conversation].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        for (let index = 1; index < sorted.length; index += 1) {
          const prev = sorted[index - 1];
          const next = sorted[index];
          if (prev.senderRole === "buyer" && next.senderRole === "seller") {
            replyDurations.push(Math.max(0, new Date(next.createdAt || 0).getTime() - new Date(prev.createdAt || 0).getTime()));
          }
        }
      });
      const avgReplyHours = replyDurations.length
        ? (replyDurations.reduce((sum, duration) => sum + duration, 0) / replyDurations.length) / (1000 * 60 * 60)
        : null;
      const sellerOrderRows = (orders || []).filter((order) => {
        const sellerIds = new Set((order.items || []).map((itemId) => productById[itemId]?.sellerId).filter(Boolean));
        return sellerIds.has(sellerUser.sellerId);
      });
      const deliveredCount = sellerOrderRows.filter((order) => order.fulfillmentStatus === "delivered").length;
      const fulfillmentRate = sellerOrderRows.length ? (deliveredCount / sellerOrderRows.length) : 0;
      const reportCount = (postReports || []).filter((entry) => {
        const post = (sellerPosts || []).find((candidate) => candidate.id === entry.postId);
        return post?.sellerId === sellerUser.sellerId;
      }).length + (commentReports || []).filter((entry) => entry.targetUserId === sellerUser.id).length;
      const strikeCount = activeStrikesByUserId[sellerUser.id] || 0;
      const score = Math.max(0, Math.round(
        100
        - Math.min(30, Math.round((avgReplyHours || 24) * 1.5))
        - Math.min(30, strikeCount * 15)
        - Math.min(20, reportCount * 3)
        + Math.min(10, Math.round(fulfillmentRate * 10)),
      ));
      result[sellerUser.id] = {
        score,
        avgReplyHours,
        fulfillmentRate,
        reportCount,
        strikeCount,
        totalOrders: sellerOrderRows.length,
      };
    });
    return result;
  }, [users, messages, orders, productById, postReports, commentReports, sellerPosts, activeStrikesByUserId]);
  const selectedSellerQuality = adminSelectedUser?.role === "seller"
    ? sellerQualityByUserId[adminSelectedUser.id]
    : null;
  const selectedSellerProfile = adminSelectedUser?.role === "seller"
    ? (sellers || []).find((seller) => seller.id === adminSelectedUser.sellerId)
    : null;
  const selectedSellerAffiliatedBar = selectedSellerProfile?.affiliatedBarId
    ? (bars || []).find((bar) => bar.id === selectedSellerProfile.affiliatedBarId)
    : null;
  const canManageAffiliations = adminPermissions?.canManageAffiliations !== false;
  const canBlockUsers = adminPermissions?.canBlockUsers !== false;
  const canManageAdminAccess = adminPermissions?.canManageAdminAccess === true;
  const canManageCredentials = adminPermissions?.canManageCredentials !== false;
  const canManagePayments = adminPermissions?.canManagePayments !== false;
  const canAccessAdminTab = (tabKey) => {
    if (!adminPermissions?.tabAccess) return true;
    return adminPermissions.tabAccess[tabKey] !== false;
  };
  const openPostReportCount = unresolvedReports.length;
  const openCommentReportCount = unresolvedCommentReports.length;
  const openMessageReportCount = unresolvedMessageReports.length;
  const openModerationCount = openPostReportCount + openCommentReportCount + openMessageReportCount;
  const whatNeedsAttention = useMemo(() => ({
    pendingSellerCount,
    openModerationCount,
    pendingAppeals: pendingAppeals.length,
    highPriorityInbox: inboxDigest.highPriorityUnresolved.length,
    openDisputes: disputeCounts.open,
  }), [pendingSellerCount, openModerationCount, pendingAppeals.length, inboxDigest.highPriorityUnresolved.length, disputeCounts.open]);
  const adminNoteByEntityKey = useMemo(() => {
    const map = {};
    (adminNotes || []).forEach((entry) => {
      if (entry?.entityKey) map[entry.entityKey] = entry;
    });
    return map;
  }, [adminNotes]);
  const inboxSelectedCount = useMemo(
    () => Object.values(inboxSelectedKeys).filter(Boolean).length,
    [inboxSelectedKeys],
  );
  const workspaceModeConfig = useMemo(() => ({
    all: { label: "All workspaces", tabs: null },
    moderation: { label: "Moderation", tabs: new Set(["overview", "inbox", "disputes", "social", "users"]) },
    operations: { label: "Operations", tabs: new Set(["overview", "sales", "products", "payments", "users", "email_inbox", "email_templates", "auth", "bars"]) },
    support: { label: "Support", tabs: new Set(["overview", "inbox", "users", "disputes", "email_inbox", "email_templates"]) },
  }), []);
  const visibleAdminTabs = useMemo(() => {
    const mode = workspaceModeConfig[adminWorkspaceMode] || workspaceModeConfig.all;
    const modeFiltered = mode.tabs
      ? ADMIN_TAB_CONFIG.filter((tab) => mode.tabs.has(tab.key))
      : ADMIN_TAB_CONFIG;
    return modeFiltered.filter((tab) => canAccessAdminTab(tab.key));
  }, [adminWorkspaceMode, workspaceModeConfig, adminPermissions]);
  useEffect(() => {
    if (!visibleAdminTabs.some((tab) => tab.key === adminTab)) {
      setAdminTab(visibleAdminTabs[0]?.key || "overview");
    }
  }, [visibleAdminTabs, adminTab, setAdminTab]);
  useEffect(() => {
    if (adminUxPrefsHydratedRef.current) return;
    if (typeof window === "undefined") return;
    const safeRead = (key, fallback) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    };
    const savedTab = String(safeRead("tlm-admin-tab", "overview") || "overview");
    const savedWorkspace = String(safeRead("tlm-admin-workspace-mode", "all") || "all");
    const savedInboxSearch = String(safeRead("tlm-admin-inbox-search", "") || "");
    const savedInboxType = String(safeRead("tlm-admin-inbox-type", "all") || "all");
    const savedInboxPriority = String(safeRead("tlm-admin-inbox-priority", "all") || "all");
    const savedInboxReview = String(safeRead("tlm-admin-inbox-review", "all") || "all");
    const savedEmailMailbox = String(safeRead("tlm-admin-email-mailbox", "all") || "all");
    const savedEmailStatusRaw = String(safeRead("tlm-admin-email-status", "active") || "active");
    const savedEmailStatus = savedEmailStatusRaw === "all" ? "active" : normalizeAdminEmailStatus(savedEmailStatusRaw);
    const savedEmailSearch = String(safeRead("tlm-admin-email-search", "") || "");
    if (visibleAdminTabs.some((tab) => tab.key === savedTab)) {
      setAdminTab(savedTab);
    }
    setAdminWorkspaceMode(savedWorkspace);
    setInboxSearch(savedInboxSearch);
    setInboxTypeFilter(savedInboxType);
    setInboxPriorityFilter(savedInboxPriority);
    setInboxReviewFilter(savedInboxReview);
    setAdminEmailMailboxFilter(savedEmailMailbox);
    setAdminEmailStatusFilter(savedEmailStatus);
    setAdminEmailSearch(savedEmailSearch);
    adminUxPrefsHydratedRef.current = true;
  }, [visibleAdminTabs, setAdminTab, setAdminUserSearch, normalizeAdminEmailStatus]);
  useEffect(() => {
    if (!adminUxPrefsHydratedRef.current) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem("tlm-admin-tab", JSON.stringify(String(adminTab || "overview")));
    window.localStorage.setItem("tlm-admin-workspace-mode", JSON.stringify(String(adminWorkspaceMode || "all")));
    window.localStorage.setItem("tlm-admin-inbox-search", JSON.stringify(String(inboxSearch || "")));
    window.localStorage.setItem("tlm-admin-inbox-type", JSON.stringify(String(inboxTypeFilter || "all")));
    window.localStorage.setItem("tlm-admin-inbox-priority", JSON.stringify(String(inboxPriorityFilter || "all")));
    window.localStorage.setItem("tlm-admin-inbox-review", JSON.stringify(String(inboxReviewFilter || "all")));
    window.localStorage.setItem("tlm-admin-email-mailbox", JSON.stringify(String(adminEmailMailboxFilter || "all")));
    window.localStorage.setItem("tlm-admin-email-status", JSON.stringify(String(adminEmailStatusFilter || "all")));
    window.localStorage.setItem("tlm-admin-email-search", JSON.stringify(String(adminEmailSearch || "")));
  }, [
    adminTab,
    adminWorkspaceMode,
    inboxSearch,
    inboxTypeFilter,
    inboxPriorityFilter,
    inboxReviewFilter,
    adminEmailMailboxFilter,
    adminEmailStatusFilter,
    adminEmailSearch,
  ]);
  useEffect(() => {
    if (!adminSelectedUser?.id) {
      setAdminUserNoteDraft("");
      return;
    }
    setAdminUserNoteDraft(adminNoteByEntityKey[`user:${adminSelectedUser.id}`]?.body || "");
  }, [adminSelectedUser?.id, adminNoteByEntityKey]);
  useEffect(() => {
    if (!adminCredentialMessage || adminCredentialTone !== "success") return undefined;
    const timerId = window.setTimeout(() => {
      setAdminCredentialMessage("");
      setAdminCredentialTone("neutral");
    }, 2800);
    return () => window.clearTimeout(timerId);
  }, [adminCredentialMessage, adminCredentialTone]);
  useEffect(() => {
    if (!adminAccessMessage || adminAccessTone !== "success") return undefined;
    const timerId = window.setTimeout(() => {
      setAdminAccessMessage("");
      setAdminAccessTone("neutral");
    }, 2800);
    return () => window.clearTimeout(timerId);
  }, [adminAccessMessage, adminAccessTone]);
  useEffect(() => {
    if (!walletAdjustMessage || walletAdjustTone !== "success") return undefined;
    const timerId = window.setTimeout(() => {
      setWalletAdjustMessage("");
      setWalletAdjustTone("neutral");
    }, 3200);
    return () => window.clearTimeout(timerId);
  }, [walletAdjustMessage, walletAdjustTone]);
  useEffect(() => {
    setWalletAdjustAmount("");
    setWalletAdjustReason("");
    setWalletAdjustDirection("credit");
    setWalletAdjustMessage("");
    setWalletAdjustTone("neutral");
  }, [adminSelectedUser?.id]);
  useEffect(() => {
    if (!adminUserMessageStatus || adminUserMessageSending || adminUserMessageTone !== "success") return undefined;
    const timerId = window.setTimeout(() => {
      setAdminUserMessageStatus("");
      setAdminUserMessageTone("neutral");
    }, 2800);
    return () => window.clearTimeout(timerId);
  }, [adminUserMessageStatus, adminUserMessageSending, adminUserMessageTone]);
  const selectedCredentialDraft = adminSelectedUser?.id
    ? (adminCredentialDraftByUserId[adminSelectedUser.id] || {
        newEmail: adminSelectedUser?.email || "",
        newPassword: "",
        confirmPassword: "",
      })
    : { newEmail: "", newPassword: "", confirmPassword: "" };
  const setSelectedCredentialDraft = (patch = {}) => {
    if (!adminSelectedUser?.id) return;
    setAdminCredentialDraftByUserId((prev) => ({
      ...prev,
      [adminSelectedUser.id]: {
        ...(prev[adminSelectedUser.id] || {
          newEmail: adminSelectedUser?.email || "",
          newPassword: "",
          confirmPassword: "",
        }),
        ...patch,
      },
    }));
  };
  const selectedAdminAccessDraft = adminSelectedUser?.id
    ? (adminAccessDraftByUserId[adminSelectedUser.id] || {
        enabled: adminSelectedUser?.adminAccess?.enabled === true,
        scopes: Array.isArray(adminSelectedUser?.adminAccess?.scopes) ? adminSelectedUser.adminAccess.scopes : [],
      })
    : { enabled: false, scopes: [] };
  const setSelectedAdminAccessDraft = (patch = {}) => {
    if (!adminSelectedUser?.id) return;
    setAdminAccessDraftByUserId((prev) => ({
      ...prev,
      [adminSelectedUser.id]: {
        ...(prev[adminSelectedUser.id] || {
          enabled: adminSelectedUser?.adminAccess?.enabled === true,
          scopes: Array.isArray(adminSelectedUser?.adminAccess?.scopes) ? adminSelectedUser.adminAccess.scopes : [],
        }),
        ...patch,
      },
    }));
  };
  const submitSelectedUserAdminAccessUpdate = async () => {
    if (!isSuperAdmin || !adminSelectedUser?.id || !updateUserAdminAccessBySuperAdmin || adminAccessSaving) return;
    if (!["seller", "bar"].includes(String(adminSelectedUser.role || "").trim().toLowerCase())) {
      setAdminAccessTone("error");
      setAdminAccessMessage("Delegated admin access can only be assigned to seller or bar accounts.");
      return;
    }
    const enabled = selectedAdminAccessDraft.enabled === true;
    const scopes = Array.isArray(selectedAdminAccessDraft.scopes)
      ? selectedAdminAccessDraft.scopes.map((scope) => String(scope || "").trim()).filter(Boolean)
      : [];
    if (enabled && scopes.length === 0) {
      setAdminAccessTone("error");
      setAdminAccessMessage("Select at least one permission scope.");
      return;
    }
    setAdminAccessSaving(true);
    const result = await updateUserAdminAccessBySuperAdmin(adminSelectedUser.id, {
      enabled,
      scopes,
    });
    setAdminAccessSaving(false);
    if (!result?.ok) {
      setAdminAccessTone("error");
      setAdminAccessMessage(String(result?.error || "Could not update delegated admin access."));
      return;
    }
    setAdminAccessTone("success");
    setAdminAccessMessage(String(result?.message || "Delegated admin access updated."));
  };
  const submitSelectedUserCredentialUpdate = async () => {
    if (!adminSelectedUser?.id || !updateUserCredentialsByAdmin || adminCredentialSaving) return;
    const newEmail = String(selectedCredentialDraft.newEmail || "").trim();
    const newPassword = String(selectedCredentialDraft.newPassword || "");
    const confirmPassword = String(selectedCredentialDraft.confirmPassword || "");
    const hasEmailChange = newEmail && newEmail.toLowerCase() !== String(adminSelectedUser.email || "").trim().toLowerCase();
    const hasPasswordChange = Boolean(newPassword);
    if (!hasEmailChange && !hasPasswordChange) {
      setAdminCredentialTone("error");
      setAdminCredentialMessage("Add a new email or password to update credentials.");
      return;
    }
    if (hasPasswordChange && newPassword !== confirmPassword) {
      setAdminCredentialTone("error");
      setAdminCredentialMessage("Passwords do not match.");
      return;
    }
    setAdminCredentialSaving(true);
    const result = await updateUserCredentialsByAdmin(adminSelectedUser.id, {
      ...(hasEmailChange ? { newEmail } : {}),
      ...(hasPasswordChange ? { newPassword } : {}),
    });
    setAdminCredentialSaving(false);
    if (!result?.ok) {
      setAdminCredentialTone("error");
      setAdminCredentialMessage(String(result?.error || "Could not update user credentials."));
      return;
    }
    setSelectedCredentialDraft({
      ...(hasEmailChange ? { newEmail } : {}),
      newPassword: "",
      confirmPassword: "",
    });
    setAdminCredentialTone("success");
    setAdminCredentialMessage(String(result?.message || "User credentials updated."));
  };
  const submitWalletAdjustment = async () => {
    if (!applyAdminWalletAdjustment || !adminSelectedUser?.id || walletAdjustSaving) return;
    if (String(adminSelectedUser.role || "").trim().toLowerCase() === "admin") {
      setWalletAdjustTone("error");
      setWalletAdjustMessage("Platform admin wallets cannot be adjusted here.");
      return;
    }
    const amt = Number(walletAdjustAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setWalletAdjustTone("error");
      setWalletAdjustMessage("Enter a positive THB amount.");
      return;
    }
    const reason = String(walletAdjustReason || "").trim();
    if (reason.length < 4) {
      setWalletAdjustTone("error");
      setWalletAdjustMessage("Reason must be at least 4 characters.");
      return;
    }
    setWalletAdjustSaving(true);
    setWalletAdjustMessage("");
    const result = await applyAdminWalletAdjustment(adminSelectedUser.id, {
      direction: walletAdjustDirection,
      amountThb: amt,
      reason,
    });
    setWalletAdjustSaving(false);
    if (!result?.ok) {
      setWalletAdjustTone("error");
      setWalletAdjustMessage(String(result?.error || "Could not update wallet."));
      return;
    }
    setWalletAdjustTone("success");
    setWalletAdjustMessage("Wallet updated. Balance and ledger will refresh for this user.");
    setWalletAdjustAmount("");
    setWalletAdjustReason("");
  };
  const promptForSafetyReason = ({ actionLabel = "this action", impactNote = "" } = {}) => {
    if (typeof window !== "undefined" && impactNote) {
      const confirmed = window.confirm(`${impactNote}\n\nContinue with ${actionLabel}?`);
      if (!confirmed) return { ok: false, reason: "" };
    }
    const reason = String(
      typeof window !== "undefined"
        ? window.prompt(`Add a short reason for ${actionLabel} (minimum 8 characters).`, "")
        : ""
    ).trim();
    if (reason.length < 8) {
      return { ok: false, reason: "", error: "Reason is required (minimum 8 characters)." };
    }
    return { ok: true, reason };
  };
  const runAdminAffiliationChange = (sellerId, nextBarId) => {
    const result = setSellerBarAffiliationByAdmin?.(sellerId, nextBarId, 'Admin affiliation change');
    if (result?.ok === false) {
      setInboxActionMessage(result.error || "Could not update affiliation.");
    }
  };
  const runAdminBlockToggle = (userId, currentlyBlocked) => {
    const safety = promptForSafetyReason({
      actionLabel: currentlyBlocked ? "unblocking this user" : "blocking this user",
      impactNote: currentlyBlocked
        ? "Impact: the user regains access and can resume activity immediately."
        : "Impact: the user will lose access and cannot place orders or message until unblocked.",
    });
    if (!safety.ok) {
      if (safety.error) setInboxActionMessage(safety.error);
      return;
    }
    const result = toggleAdminBlockUser?.(userId, safety.reason);
    if (result?.ok === false) {
      setInboxActionMessage(result.error || "Could not update block status.");
    }
  };
  const selectedUserMessageDraft = adminSelectedUser?.id
    ? (adminUserMessageDraftByUserId[adminSelectedUser.id] || {
        templateKey: "",
        subject: "",
        body: "",
        ccAdminInbox: false,
      })
    : { templateKey: "", subject: "", body: "", ccAdminInbox: false };
  const USER_MESSAGE_TEMPLATE_OPTIONS = [
    {
      key: "policy_reminder",
      label: "Policy reminder",
      subject: "Important policy reminder from support",
      body: "Hi {name},\n\nThis is a reminder to follow community and messaging policies while using the platform.\n\nIf you have any questions, reply to this email and our team can help.\n\nThank you,\nAdmin team",
    },
    {
      key: "account_update",
      label: "Account update required",
      subject: "Action needed on your account",
      body: "Hi {name},\n\nWe need you to review and update some account details.\n\nPlease log in and check your account dashboard. If you need help, reply to this email.\n\nThank you,\nAdmin team",
    },
    {
      key: "warning_notice",
      label: "Warning notice",
      subject: "Warning notice regarding account activity",
      body: "Hi {name},\n\nWe noticed activity that may violate platform rules.\n\nPlease correct this immediately to avoid further account restrictions.\n\nIf you believe this is a mistake, reply and we will review.\n\nAdmin team",
    },
  ];
  const applyTemplateToSelectedUserMessage = (templateKey) => {
    const selectedTemplate = USER_MESSAGE_TEMPLATE_OPTIONS.find((entry) => entry.key === templateKey) || null;
    if (!selectedTemplate) {
      setSelectedUserMessageDraft({ templateKey: "", subject: "", body: "" });
      return;
    }
    const name = String(adminSelectedUser?.name || "there").trim() || "there";
    const interpolatedBody = String(selectedTemplate.body || "").replaceAll("{name}", name);
    setSelectedUserMessageDraft({
      templateKey: selectedTemplate.key,
      subject: selectedTemplate.subject,
      body: interpolatedBody,
    });
  };
  const setSelectedUserMessageDraft = (patch = {}) => {
    if (!adminSelectedUser?.id) return;
    setAdminUserMessageDraftByUserId((prev) => ({
      ...prev,
      [adminSelectedUser.id]: {
        ...(prev[adminSelectedUser.id] || { templateKey: "", subject: "", body: "", ccAdminInbox: false }),
        ...patch,
      },
    }));
  };
  const sendMessageToSelectedUser = async () => {
    if (!adminSelectedUser?.id || !sendAdminEmailInboxMessage || adminUserMessageSending) return;
    const toEmail = String(adminSelectedUser.email || "").trim();
    const subject = String(selectedUserMessageDraft.subject || "").trim();
    const body = String(selectedUserMessageDraft.body || "").trim();
    if (!toEmail || !toEmail.includes("@")) {
      setAdminUserMessageTone("error");
      setAdminUserMessageStatus("Selected user does not have a valid email address.");
      return;
    }
    if (!subject || !body) {
      setAdminUserMessageTone("error");
      setAdminUserMessageStatus("Add both subject and message body before sending.");
      return;
    }
    setAdminUserMessageSending(true);
    setAdminUserMessageTone("neutral");
    setAdminUserMessageStatus("");
    try {
      const result = await Promise.resolve(sendAdminEmailInboxMessage({
        mailbox: "admin",
        toEmail,
        toName: String(adminSelectedUser.name || ""),
        subject,
        body,
      }));
      if (!result?.ok) {
        setAdminUserMessageTone("error");
        setAdminUserMessageStatus(String(result?.error || "Could not send message."));
        return;
      }
      if (selectedUserMessageDraft.ccAdminInbox) {
        const adminAuditEmail = "admin@thailandpanties.com";
        const ccSubject = `[Copy] ${subject}`;
        const ccBody = [
          `Original recipient: ${toEmail}`,
          `Recipient name: ${String(adminSelectedUser.name || "").trim() || "N/A"}`,
          "",
          "----- Original message -----",
          body,
        ].join("\n");
        const ccResult = await Promise.resolve(sendAdminEmailInboxMessage({
          mailbox: "admin",
          toEmail: adminAuditEmail,
          toName: "Admin Inbox",
          subject: ccSubject,
          body: ccBody,
        }));
        if (!ccResult?.ok) {
          setAdminUserMessageTone("error");
          setAdminUserMessageStatus(`User message sent, but admin copy failed: ${String(ccResult?.error || "unknown error")}`);
          return;
        }
      }
      setSelectedUserMessageDraft({ templateKey: "", subject: "", body: "" });
      setAdminUserMessageTone("success");
      setAdminUserMessageStatus(selectedUserMessageDraft.ccAdminInbox ? "Message sent and copied to admin inbox." : "Message sent.");
    } catch {
      setAdminUserMessageTone("error");
      setAdminUserMessageStatus("Could not send message.");
    } finally {
      setAdminUserMessageSending(false);
    }
  };
  useEffect(() => {
    const nextDrafts = {};
    (bars || []).forEach((bar) => {
      nextDrafts[bar.id] = {
        name: bar.name || "",
        location: bar.location || "",
        about: bar.about || "",
        specials: bar.specials || "",
        mapEmbedUrl: bar.mapEmbedUrl || "",
        mapLink: bar.mapLink || "",
      };
    });
    setBarDraftsById(nextDrafts);
  }, [bars]);
  const overviewTrends = useMemo(() => {
    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const since7 = nowMs - (7 * dayMs);
    const since30 = nowMs - (30 * dayMs);
    const countSince = (items, getDate) => (items || []).filter((item) => new Date(getDate(item) || 0).getTime() >= since7).length;
    const countSince30 = (items, getDate) => (items || []).filter((item) => new Date(getDate(item) || 0).getTime() >= since30).length;
    return {
      messages7d: countSince(messages, (item) => item.createdAt),
      messages30d: countSince30(messages, (item) => item.createdAt),
      requests7d: countSince(customRequests, (item) => item.createdAt),
      requests30d: countSince30(customRequests, (item) => item.createdAt),
      reports7d: countSince([...(postReports || []), ...(commentReports || [])], (item) => item.createdAt),
      reports30d: countSince30([...(postReports || []), ...(commentReports || [])], (item) => item.createdAt),
    };
  }, [messages, customRequests, postReports, commentReports]);
  const emailTemplateHealth = useMemo(() => {
    const nowMs = Date.now();
    const since7 = nowMs - (7 * 24 * 60 * 60 * 1000);
    const templates = emailTemplatesList || [];
    const enabled = templates.filter((template) => template.enabled !== false).length;
    const disabled = templates.length - enabled;
    const lastEditedAtMs = Math.max(
      0,
      ...templates.map((template) => new Date(template.updatedAt || 0).getTime()),
    );
    const emailLog = emailDeliveryLog || [];
    const failed7d = emailLog.filter((entry) => new Date(entry.createdAt || 0).getTime() >= since7 && entry.status === "failed").length;
    const tests7d = emailLog.filter((entry) => new Date(entry.createdAt || 0).getTime() >= since7 && Boolean(entry.testScenario)).length;
    const queuedCount = emailLog.filter((entry) => entry.status === "queued" || entry.status === "sending").length;
    return {
      total: templates.length,
      enabled,
      disabled,
      queuedCount,
      failed7d,
      tests7d,
      lastEditedAt: lastEditedAtMs > 0 ? lastEditedAtMs : null,
    };
  }, [emailTemplatesList, emailDeliveryLog]);
  const filteredAdminEmailThreads = useMemo(() => {
    const normalizedSearch = String(adminEmailSearch || "").trim().toLowerCase();
    return [...(adminEmailThreads || [])]
      .filter((thread) => {
        if (adminEmailMailboxFilter !== "all" && String(thread?.mailbox || "admin") !== adminEmailMailboxFilter) return false;
        if (!doesAdminEmailThreadMatchStatusFilter(thread?.status, adminEmailStatusFilter)) return false;
        if (!normalizedSearch) return true;
        const haystack = [
          thread?.participantName,
          thread?.participantEmail,
          thread?.lastSubject,
          thread?.lastSnippet
        ].map((value) => String(value || "").toLowerCase()).join(" ");
        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0).getTime() - new Date(a.lastMessageAt || a.createdAt || 0).getTime());
  }, [adminEmailThreads, adminEmailMailboxFilter, adminEmailStatusFilter, adminEmailSearch, doesAdminEmailThreadMatchStatusFilter]);
  const selectedAdminEmailThread = useMemo(() => {
    if (adminEmailSelectedThreadId) {
      return filteredAdminEmailThreads.find((entry) => entry.id === adminEmailSelectedThreadId)
        || (adminEmailThreads || []).find((entry) => entry.id === adminEmailSelectedThreadId)
        || null;
    }
    return filteredAdminEmailThreads[0] || null;
  }, [adminEmailSelectedThreadId, filteredAdminEmailThreads, adminEmailThreads]);
  const selectedAdminEmailThreadMessages = useMemo(() => (
    (adminEmailMessages || [])
      .filter((entry) => entry.threadId === selectedAdminEmailThread?.id)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
  ), [adminEmailMessages, selectedAdminEmailThread?.id]);
  const adminEmailComposeCanSend = useMemo(() => {
    const toEmail = String(adminEmailComposeToEmail || "").trim();
    const subject = String(adminEmailComposeSubject || "").trim();
    const body = String(adminEmailComposeBody || "").trim();
    return Boolean(toEmail && toEmail.includes("@") && subject && body);
  }, [adminEmailComposeToEmail, adminEmailComposeSubject, adminEmailComposeBody]);
  const adminEmailComposeMissingFields = useMemo(() => {
    const missing = [];
    const toEmail = String(adminEmailComposeToEmail || "").trim();
    const subject = String(adminEmailComposeSubject || "").trim();
    const body = String(adminEmailComposeBody || "").trim();
    if (!toEmail) missing.push("recipient email");
    if (toEmail && !toEmail.includes("@")) missing.push("valid email format");
    if (!subject) missing.push("subject");
    if (!body) missing.push("message body");
    return missing;
  }, [adminEmailComposeToEmail, adminEmailComposeSubject, adminEmailComposeBody]);
  const readAttachmentAsBase64 = useCallback((file) => (
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        const marker = "base64,";
        const idx = result.indexOf(marker);
        resolve(idx >= 0 ? result.slice(idx + marker.length) : "");
      };
      reader.onerror = () => reject(new Error("Could not read attachment."));
      reader.readAsDataURL(file);
    })
  ), []);
  const buildAttachmentPayloadsFromFileList = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return [];
    const nextPayloads = [];
    for (const file of files) {
      const base64 = await readAttachmentAsBase64(file);
      if (!base64) continue;
      nextPayloads.push({
        filename: String(file?.name || "attachment").slice(0, 180),
        contentType: String(file?.type || "application/octet-stream"),
        contentBase64: base64,
        sizeBytes: Number(file?.size || 0),
      });
    }
    return nextPayloads;
  }, [readAttachmentAsBase64]);
  useEffect(() => {
    refreshAdminEmailInboxRef.current = refreshAdminEmailInbox;
  }, [refreshAdminEmailInbox]);
  useEffect(() => {
    fetchAdminEmailThreadMessagesRef.current = fetchAdminEmailThreadMessages;
  }, [fetchAdminEmailThreadMessages]);
  useEffect(() => {
    if (!adminEmailActionMessage) return;
    const timer = window.setTimeout(() => setAdminEmailActionMessage(""), 7000);
    return () => window.clearTimeout(timer);
  }, [adminEmailActionMessage]);
  useEffect(() => {
    if (!adminEmailComposeStatusMessage || adminEmailComposeSending) return;
    if (adminEmailComposeStatusTone !== "success") return;
    const timer = window.setTimeout(() => setAdminEmailComposeStatusMessage(""), 2800);
    return () => window.clearTimeout(timer);
  }, [adminEmailComposeStatusMessage, adminEmailComposeSending, adminEmailComposeStatusTone]);
  useEffect(() => {
    if (!adminEmailComposeConfirmed) return;
    const timer = window.setTimeout(() => setAdminEmailComposeConfirmed(false), 2000);
    return () => window.clearTimeout(timer);
  }, [adminEmailComposeConfirmed]);
  useEffect(() => {
    if (adminTab !== "email_inbox" || !refreshAdminEmailInboxRef.current) return;
    setAdminEmailLoading(true);
    setAdminEmailActionMessage("");
    Promise.resolve(refreshAdminEmailInboxRef.current({
      mailbox: adminEmailMailboxFilter,
      status: adminEmailStatusFilter,
      search: adminEmailSearch
    }))
      .then((result) => {
        if (!result?.ok) {
          setAdminEmailActionMessage(result?.error || "Could not load shared inbox.");
        }
      })
      .catch(() => {
        setAdminEmailActionMessage("Could not load shared inbox.");
      })
      .finally(() => {
        setAdminEmailLoading(false);
      });
  }, [adminTab, adminEmailMailboxFilter, adminEmailStatusFilter, adminEmailSearch]);
  useEffect(() => {
    if (adminTab !== "email_inbox") return;
    setAdminEmailInboxHealthLoading(true);
    Promise.resolve(getAdminEmailInboxHealth?.())
      .then((result) => {
        if (result?.ok) {
          setAdminEmailInboxHealth(result.health || null);
        }
      })
      .finally(() => setAdminEmailInboxHealthLoading(false));
    setAdminEmailSuppressionsLoading(true);
    Promise.resolve(listAdminEmailSuppressions?.())
      .then((result) => {
        if (result?.ok) {
          setAdminEmailSuppressions(Array.isArray(result.suppressions) ? result.suppressions : []);
        }
      })
      .finally(() => setAdminEmailSuppressionsLoading(false));
  }, [adminTab, getAdminEmailInboxHealth, listAdminEmailSuppressions]);
  useEffect(() => {
    if (!selectedAdminEmailThread?.id) return;
    setAdminEmailSelectedThreadId(selectedAdminEmailThread.id);
    if (!adminEmailReplySubject) {
      setAdminEmailReplySubject(String(selectedAdminEmailThread.lastSubject || "Re: Message").trim() || "Re: Message");
    }
  }, [selectedAdminEmailThread?.id]);
  useEffect(() => {
    if (adminTab !== "email_inbox" || !selectedAdminEmailThread?.id || !fetchAdminEmailThreadMessagesRef.current) return;
    Promise.resolve(fetchAdminEmailThreadMessagesRef.current(selectedAdminEmailThread.id)).catch(() => {});
  }, [adminTab, selectedAdminEmailThread?.id]);
  const activeAdminTabConfig = useMemo(
    () => ADMIN_TAB_CONFIG.find((entry) => entry.key === adminTab) || ADMIN_TAB_CONFIG[0],
    [adminTab]
  );
  const exportRowsToCsv = (filename, rows) => {
    if (typeof window === "undefined") return;
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escapeCsv = (value) => {
      const text = String(value ?? "");
      if (/[",\n]/.test(text)) return `"${text.replace(/"/g, "\"\"")}"`;
      return text;
    };
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };
  const applyBulkInboxStatus = (status) => {
    const selectedKeys = Object.keys(inboxSelectedKeys).filter((key) => inboxSelectedKeys[key]);
    if (selectedKeys.length === 0) return;
    selectedKeys.forEach((itemKey) => updateAdminInboxReview?.(itemKey, status));
    setInboxSelectedKeys({});
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
      {!isAdmin ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Admin login required</h2>
          <p className="mt-2 text-slate-600">Please log in with an admin account to continue.</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700"
          >
            Go to login
          </button>
        </div>
      ) : (
        <div className="text-[15px] leading-6 text-slate-800">
          <SectionTitle eyebrow="Admin dashboard" title="Operations center!" subtitle="Manage seller approvals, users, listings, payments, and social moderation from one workspace." />
          <div className="mb-6 rounded-3xl border border-rose-100 bg-white p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Current workspace</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <activeAdminTabConfig.icon className="h-4 w-4 text-rose-600" />
              <div className="text-sm font-semibold text-slate-800">{activeAdminTabConfig.label}</div>
              <span className="text-sm text-slate-500">- {activeAdminTabConfig.description}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(workspaceModeConfig).map(([modeKey, modeValue]) => (
                <button
                  key={modeKey}
                  onClick={() => setAdminWorkspaceMode(modeKey)}
                  className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold ${adminWorkspaceMode === modeKey ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                >
                  {modeValue.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {visibleAdminTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAdminTab(tab.key)}
                className={`cursor-pointer rounded-2xl border px-4 py-3.5 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${
                  adminTab === tab.key
                    ? "border-rose-300 bg-rose-50 ring-1 ring-rose-200"
                    : "border-rose-100 bg-white hover:border-rose-200 hover:bg-rose-50/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon className={`h-4 w-4 ${adminTab === tab.key ? "text-rose-700" : "text-slate-500"}`} />
                  <div className={`text-sm font-semibold ${adminTab === tab.key ? "text-rose-700" : "text-slate-800"}`}>
                    {tab.label}
                    {tab.key === "auth" && pendingSellerCount > 0 ? ` (${pendingSellerCount})` : ""}
                  </div>
                </div>
                <div className="mt-1 text-sm text-slate-600">{tab.description}</div>
              </button>
            ))}
          </div>
          <div className="mb-6 rounded-3xl border border-rose-100 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigate("/account")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-rose-200 px-3 py-3 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm sm:w-auto">
                Open buyer account
              </button>
              <button onClick={() => navigate("/seller-dashboard")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-rose-200 px-3 py-3 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm sm:w-auto">
                Open seller dashboard
              </button>
              <button onClick={() => navigate("/bar-dashboard")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-rose-200 px-3 py-3 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm sm:w-auto">
                Open bar dashboard
              </button>
              {currentUser?.role === "admin" ? (
                <span className="ml-1 text-sm text-slate-600">Seller profile access requires a seller account.</span>
              ) : null}
            </div>
          </div>
          <div className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Environment mode</div>
                <p className="mt-1 text-sm text-slate-700">
                  Test mode keeps only Alex (buyer), Nina (seller), Small World (bar), and the Nina bra + panty + bundle products.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => switchAppMode?.("live")}
                  disabled={appMode === "live"}
                  className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold ${
                    appMode === "live"
                      ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-500"
                      : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Live mode
                </button>
                <button
                  type="button"
                  onClick={() => switchAppMode?.("test")}
                  disabled={appMode === "test"}
                  className={`min-h-[44px] rounded-xl px-4 py-2 text-sm font-semibold ${
                    appMode === "test"
                      ? "cursor-not-allowed border border-emerald-300 bg-emerald-100 text-emerald-800"
                      : "border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Test mode
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
              Active mode: {appMode === "test" ? "Test" : "Live"}
            </div>
          </div>
          <div className="mb-8 rounded-3xl border border-rose-100 bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Quick actions</div>
                <p className="mt-1 text-sm text-slate-600">Jump to the most frequent admin tasks.</p>
              </div>
              <div className="grid w-full gap-2 sm:flex sm:flex-wrap">
                <button onClick={() => setAdminTab("auth")} className="min-h-[44px] w-full cursor-pointer rounded-xl bg-rose-600 px-3 py-3 text-sm font-semibold text-white transition duration-150 hover:-translate-y-0.5 hover:shadow-sm sm:w-auto">
                  Seller approvals ({pendingSellerCount})
                </button>
                <button onClick={() => setAdminTab("users")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm sm:w-auto">
                  Appeals ({pendingAppeals.length})
                </button>
                <button onClick={() => setAdminTab("inbox")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm sm:w-auto">
                  Inbox review ({inboxCounts.new + inboxCounts.followUp})
                </button>
                <button onClick={() => setAdminTab("disputes")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm sm:w-auto">
                  Disputes ({disputeCounts.open})
                </button>
                <button onClick={() => setAdminTab("social")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm sm:w-auto">
                  Open reports ({openModerationCount})
                </button>
                <button onClick={() => setAdminTab("email_templates")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm sm:w-auto">
                  Email templates
                </button>
                <button onClick={() => setAdminTab("bars")} className="min-h-[44px] w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm sm:w-auto">
                  Bars ({(bars || []).length})
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setAdminNotificationTestStatus({ tone: "neutral", message: "" });
                    const result = await sendTestBrowserNotification?.();
                    if (result?.ok) {
                      setAdminNotificationTestStatus({ tone: "success", message: result.message || "Test notification sent." });
                    } else {
                      setAdminNotificationTestStatus({ tone: "error", message: result?.error || "Could not send test notification." });
                    }
                  }}
                  className="min-h-[44px] w-full cursor-pointer rounded-xl border border-rose-200 bg-white px-3 py-3 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm sm:w-auto"
                >
                  Send test notification
                </button>
              </div>
            </div>
            {adminNotificationTestStatus.message ? (
              <div className={`mt-3 text-sm ${adminNotificationTestStatus.tone === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                {adminNotificationTestStatus.message}
              </div>
            ) : null}
          </div>

          {adminTab === "overview" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5">
                <h3 className="text-lg font-semibold text-slate-900">What needs attention now</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <button onClick={() => setAdminTab("auth")} className="rounded-2xl border border-amber-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-amber-700">Seller approvals</div>
                    <div className="mt-1 text-xl font-semibold text-amber-700">{whatNeedsAttention.pendingSellerCount}</div>
                  </button>
                  <button onClick={() => setAdminTab("social")} className="rounded-2xl border border-rose-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-rose-700">Moderation queue</div>
                    <div className="mt-1 text-xl font-semibold text-rose-700">{whatNeedsAttention.openModerationCount}</div>
                  </button>
                  <button onClick={() => setAdminTab("users")} className="rounded-2xl border border-violet-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-violet-700">Pending appeals</div>
                    <div className="mt-1 text-xl font-semibold text-violet-700">{whatNeedsAttention.pendingAppeals}</div>
                  </button>
                  <button onClick={() => setAdminTab("inbox")} className="rounded-2xl border border-indigo-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-indigo-700">High-priority inbox</div>
                    <div className="mt-1 text-xl font-semibold text-indigo-700">{whatNeedsAttention.highPriorityInbox}</div>
                  </button>
                  <button onClick={() => setAdminTab("disputes")} className="rounded-2xl border border-orange-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-orange-700">Open disputes</div>
                    <div className="mt-1 text-xl font-semibold text-orange-700">{whatNeedsAttention.openDisputes}</div>
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">7-day and 30-day trends</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-600">Messages</div>
                    <div className="mt-1 text-sm text-slate-700">7d: <span className="font-semibold">{overviewTrends.messages7d}</span> · 30d: <span className="font-semibold">{overviewTrends.messages30d}</span></div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-600">Custom requests</div>
                    <div className="mt-1 text-sm text-slate-700">7d: <span className="font-semibold">{overviewTrends.requests7d}</span> · 30d: <span className="font-semibold">{overviewTrends.requests30d}</span></div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-600">Reports</div>
                    <div className="mt-1 text-sm text-slate-700">7d: <span className="font-semibold">{overviewTrends.reports7d}</span> · 30d: <span className="font-semibold">{overviewTrends.reports30d}</span></div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">What to review first</h3>
                <p className="mt-1 text-sm text-slate-700">Start with seller approvals and moderation queues, then review sales and system logs.</p>
              </div>
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Admin Today Queue</h3>
                <p className="mt-1 text-sm text-slate-700">Handle highest-impact items first to reduce user wait time and payment mistakes.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <button onClick={() => setAdminTab("disputes")} className="rounded-2xl border border-amber-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-amber-700">Disputes</div>
                    <div className="mt-1 text-xl font-semibold text-amber-800">{disputeCounts.open}</div>
                    <div className="mt-1 text-xs font-semibold text-amber-800">Review now</div>
                  </button>
                  <button onClick={() => setAdminTab("payments")} className="rounded-2xl border border-emerald-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-emerald-700">Pending payouts</div>
                    <div className="mt-1 text-xl font-semibold text-emerald-800">{(payoutItems || []).filter((row) => row.status === "ready").length}</div>
                    <div className="mt-1 text-xs font-semibold text-emerald-800">Process payouts</div>
                  </button>
                  <button onClick={() => setAdminTab("auth")} className="rounded-2xl border border-violet-200 bg-white p-3 text-left">
                    <div className="text-xs uppercase tracking-[0.12em] text-violet-700">Pending approvals</div>
                    <div className="mt-1 text-xl font-semibold text-violet-800">{pendingSellerCount}</div>
                    <div className="mt-1 text-xs font-semibold text-violet-800">Open approvals</div>
                  </button>
                </div>
              </div>
              {pendingSellerCount > 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-amber-800">{pendingSellerCount} seller application(s) waiting for review</div>
                    <div className="grid w-full gap-2 sm:flex sm:w-auto">
                      <button onClick={() => setAdminTab("auth")} className="min-h-[44px] rounded-xl border border-amber-300 px-3 py-3 text-sm font-semibold text-amber-800">Open review queue</button>
                      <button onClick={approveAllPendingSellers} className="min-h-[44px] rounded-xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white">Approve all</button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Products", value: products.length, icon: Package, tabKey: "products", actionLabel: "Open catalog" },
                  { label: "Users", value: users.length, icon: Users, tabKey: "users", actionLabel: "Open users" },
                  { label: "Orders", value: orders.length, icon: ShoppingBag, tabKey: "sales", actionLabel: "Open sales" },
                  { label: "Messages", value: messages.length, icon: MessageSquare, tabKey: "inbox", actionLabel: "Open inbox" },
                  { label: "Blocked Users", value: users.filter((user) => user.accountStatus === "blocked").length, icon: Lock, tabKey: "users", actionLabel: "Open users" },
                  { label: "Admin Blocks", value: blocks.length, icon: Shield, tabKey: "users", actionLabel: "Open users" },
                  { label: "Stripe Events", value: stripeEvents.length, icon: CreditCard, tabKey: "payments", actionLabel: "Open payments" },
                  { label: "Seller Posts", value: sellerPosts.length, icon: Upload, tabKey: "social", actionLabel: "Open moderation" }
                ].map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => setAdminTab(card.tabKey)}
                    className="cursor-pointer rounded-3xl bg-white p-6 text-left shadow-md ring-1 ring-rose-100 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50/40 hover:shadow-lg hover:ring-rose-200"
                  >
                    <card.icon className="h-6 w-6 text-rose-600" />
                    <div className="mt-4 text-sm text-slate-700">{card.label}</div>
                    <div className="mt-2 text-3xl font-bold">{card.value}</div>
                    <div className="mt-2 text-xs font-semibold text-rose-700">{card.actionLabel}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {adminTab === "sales" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Sales dashboard</h3>
                <p className="mt-1 text-sm text-slate-700">Track product + custom request revenue, order volume, and top-performing sellers.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={salesDatePreset}
                    onChange={(event) => setSalesDatePreset(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="all_time">All time</option>
                    <option value="this_month">This month</option>
                    <option value="this_pay_cycle">This pay cycle</option>
                  </select>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">
                    {salesDateWindow.label}
                  </span>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total platform sales", value: formatPriceTHB(filteredAdminSalesSummary.totalPlatformSales || 0), highlight: true },
                  { label: "Product sales", value: formatPriceTHB(filteredAdminSalesSummary.productSales || 0) },
                  { label: "Custom request sales", value: formatPriceTHB(filteredAdminSalesSummary.customRequestSales || 0) },
                  { label: "Message fees", value: `${formatPriceTHB(filteredAdminSalesSummary.messageFees || 0)} (${filteredAdminSalesSummary.messageCount || 0} msgs)` },
                ].map((card) => (
                  <div key={card.label} className={`rounded-3xl p-6 shadow-md ring-1 ${card.highlight ? "bg-rose-50 ring-rose-200" : "bg-white ring-rose-100"}`}>
                    <div className="text-sm text-slate-700">{card.label}</div>
                    <div className={`mt-2 text-3xl font-bold ${card.highlight ? "text-rose-700" : ""}`}>{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Total orders", value: filteredAdminSalesSummary.totalOrders },
                  { label: "Custom request purchases", value: filteredAdminSalesSummary.customRequestOrders || 0 },
                  { label: "Buyers", value: filteredAdminSalesSummary.totalBuyers },
                  { label: "Sellers", value: filteredAdminSalesSummary.totalSellers }
                ].map((card) => (
                  <div key={card.label} className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                    <div className="text-sm text-slate-700">{card.label}</div>
                    <div className="mt-2 text-3xl font-bold">{card.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">Seller sales leaderboard</h3>
                <div className="mt-4 space-y-3">
                  {filteredSellerSalesRows.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No seller sales yet.</div>
                  ) : filteredSellerSalesRows.map((row) => (
                    <div key={row.userId} className="grid gap-2 rounded-2xl border border-rose-100 p-4 md:grid-cols-[1.1fr_1.2fr_0.8fr]">
                      <div>
                        <div className="font-semibold">{row.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{row.email}</div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {row.orderCount} product order(s) · {row.customRequestOrderCount || 0} custom request purchase(s)
                        <div className="mt-1 text-xs text-slate-500">
                          Product {formatPriceTHB(row.productSalesValue || 0)} · Custom {formatPriceTHB(row.customRequestSalesValue || 0)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-rose-700">{formatPriceTHB(row.salesValue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "bars" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Bars and affiliations</h3>
                <p className="mt-1 text-sm text-slate-700">Manage bar profiles and assign/unassign sellers. Removing a bar automatically sets linked sellers to Independent.</p>
                {adminAuthActionMessage ? <div className="mt-2 text-sm font-medium text-emerald-700">{adminAuthActionMessage}</div> : null}
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {(bars || []).map((bar) => {
                  const earning = barEarningsByBarId[bar.id] || {
                    total: 0,
                    txCount: 0,
                    bySource: { orders: 0, messages: 0, customRequests: 0, other: 0 },
                    bySeller: [],
                  };
                  const topSeller = earning.bySeller[0] || null;
                  const draft = barDraftsById[bar.id] || {
                    name: bar.name || "",
                    location: bar.location || "",
                    about: bar.about || "",
                    specials: bar.specials || "",
                    mapEmbedUrl: bar.mapEmbedUrl || "",
                    mapLink: bar.mapLink || "",
                  };
                  const linkedSellers = sellersByBarId[bar.id] || [];
                  return (
                    <div key={bar.id} className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-lg font-semibold">{bar.name}</h4>
                        <button
                          onClick={() => {
                            if (typeof window !== "undefined" && !window.confirm(`Remove ${bar.name}? Linked sellers will be set to Independent.`)) return;
                            removeBarByAdmin?.(bar.id);
                          }}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Remove bar
                        </button>
                      </div>
                      <div className="mt-3 text-xs text-slate-500">Linked sellers: {linkedSellers.length}</div>
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Affiliate earnings</div>
                        <div className="mt-1 text-xl font-bold text-emerald-800">{formatPriceTHB(earning.total)}</div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-emerald-100">Orders: <span className="font-semibold">{formatPriceTHB(earning.bySource.orders)}</span></div>
                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-emerald-100">Messages: <span className="font-semibold">{formatPriceTHB(earning.bySource.messages)}</span></div>
                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-emerald-100">Custom requests: <span className="font-semibold">{formatPriceTHB(earning.bySource.customRequests)}</span></div>
                          <div className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-emerald-100">Ledger rows: <span className="font-semibold">{earning.txCount}</span></div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">
                          Top affiliate seller:{" "}
                          <span className="font-semibold">
                            {topSeller ? `${topSeller.sellerName} (${formatPriceTHB(topSeller.amount)})` : "No affiliate earnings yet"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        {linkedSellers.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">No sellers linked to this bar.</div>
                        ) : linkedSellers.map((seller) => (
                          <div key={seller.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3">
                            <div className="text-sm text-slate-700">{seller.name}</div>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                value={seller.affiliatedBarId || ""}
                                onChange={(event) => runAdminAffiliationChange(seller.id, event.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                <option value="">Independent</option>
                                {(bars || []).map((nextBar) => (
                                  <option key={nextBar.id} value={nextBar.id}>{nextBar.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => runAdminAffiliationChange(seller.id, "")}
                                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                Set Independent
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h4 className="text-lg font-semibold">Independent sellers</h4>
                <p className="mt-1 text-sm text-slate-600">Assign independent sellers to a bar when they join a venue.</p>
                <div className="mt-4 space-y-3">
                  {independentSellers.length === 0 ? (
                    <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">No independent sellers right now.</div>
                  ) : independentSellers.map((seller) => (
                    <div key={seller.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-100 p-3">
                      <div className="min-w-[170px] text-sm font-semibold text-slate-800">{seller.name}</div>
                      <select
                        defaultValue=""
                        onChange={(event) => {
                          if (!event.target.value) return;
                          runAdminAffiliationChange(seller.id, event.target.value);
                          event.target.value = "";
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Assign to bar...</option>
                        {(bars || []).map((bar) => (
                          <option key={bar.id} value={bar.id}>{bar.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "users" ? (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">Find buyers and sellers</h3>
                <p className="mt-1 text-sm text-slate-600">Search by name, email, role, or status, then pick a user to inspect details.</p>
                <div className="relative mt-4">
                  <input
                    value={adminUserSearch}
                    onChange={(event) => setAdminUserSearch(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-10 text-sm"
                    placeholder="Search by name, email, role"
                  />
                  {adminUserSearch ? (
                    <button
                      onClick={() => setAdminUserSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 p-1 text-slate-500 hover:bg-slate-300 hover:text-slate-700"
                      aria-label="Clear search"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 space-y-3">
                  {adminUserResults.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      No users found.
                    </div>
                  ) : adminUserResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setAdminSelectedUserId(user.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left ${adminSelectedUser?.id === user.id ? "border-rose-300 bg-rose-50" : "border-rose-100"}`}
                    >
                      <div className="font-semibold">{user.name}</div>
                      <div className="mt-1 text-sm text-slate-600">{user.email} · {user.role} · {user.accountStatus || "active"}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  {!adminSelectedUser ? (
                    <div className="text-sm text-slate-600">Select a user to view history.</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold">{adminSelectedUser.name}</h3>
                        <div className="mt-1 text-sm text-slate-600">{adminSelectedUser.email} · {adminSelectedUser.role}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSuperAdmin && onImpersonateUser ? (
                            <button
                              onClick={() => onImpersonateUser(adminSelectedUser.id)}
                              className="rounded-2xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700"
                            >
                              Login as
                            </button>
                          ) : null}
                          {canBlockUsers ? (
                            <button
                              onClick={() => runAdminBlockToggle(adminSelectedUser.id, adminSelectedUser.accountStatus === "blocked")}
                              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${adminSelectedUser.accountStatus === "blocked" ? "border border-emerald-200 text-emerald-700" : "border border-rose-200 text-rose-700"}`}
                            >
                              {adminSelectedUser.accountStatus === "blocked" ? "Unblock User" : "Block User"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        Status: <span className="font-semibold">{adminSelectedUser.accountStatus || "active"}</span>
                        {" · "}
                        Active strikes: <span className="font-semibold">{activeStrikesByUserId[adminSelectedUser.id] || 0}</span>
                        {" · "}
                        Appeals: <span className="font-semibold">{pendingAppeals.filter((appeal) => appeal.userId === adminSelectedUser.id).length} pending</span>
                      </div>
                      {canManagePayments ? (
                        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Wallet adjustment</div>
                          <p className="mt-1 text-sm text-slate-600">
                            Credit for goodwill or lost balance; debit to reverse commissions or correct mistakes. Requires{" "}
                            <span className="font-semibold">payments.manage</span>. Creates a ledger row with your admin id.
                          </p>
                          <div className="mt-2 text-sm text-slate-700">
                            Current balance:{" "}
                            <span className="font-semibold text-slate-900">{formatPriceTHB(Number(adminSelectedUser.walletBalance || 0))}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1 text-xs text-slate-600">
                              Direction
                              <select
                                value={walletAdjustDirection}
                                onChange={(event) => setWalletAdjustDirection(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                              >
                                <option value="credit">Credit (add THB)</option>
                                <option value="debit">Debit (remove THB)</option>
                              </select>
                            </label>
                            <label className="flex flex-col gap-1 text-xs text-slate-600">
                              Amount (THB)
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={walletAdjustAmount}
                                onChange={(event) => setWalletAdjustAmount(event.target.value)}
                                className="w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                placeholder="0.00"
                              />
                            </label>
                            <label className="min-w-[200px] flex-1 flex flex-col gap-1 text-xs text-slate-600">
                              Reason (audit trail)
                              <input
                                type="text"
                                value={walletAdjustReason}
                                onChange={(event) => setWalletAdjustReason(event.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                placeholder="e.g. Refund credit order #…"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={submitWalletAdjustment}
                              disabled={walletAdjustSaving}
                              className={`rounded-xl px-4 py-2 text-sm font-semibold ${walletAdjustSaving ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                            >
                              {walletAdjustSaving ? "Applying…" : "Apply"}
                            </button>
                          </div>
                          {walletAdjustMessage ? (
                            <div
                              className={`mt-2 text-xs font-semibold ${walletAdjustTone === "error" ? "text-rose-700" : walletAdjustTone === "success" ? "text-emerald-800" : "text-slate-700"}`}
                            >
                              {walletAdjustMessage}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {adminSelectedUser.role === "seller" && canManageAffiliations ? (
                        <div className="mt-4 rounded-2xl border border-rose-100 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Bar affiliation</div>
                          <p className="mt-1 text-sm text-slate-600">Assign this seller to a bar, move them, or set them back to independent.</p>
                          <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            Current: <span className="font-semibold text-slate-800">{selectedSellerAffiliatedBar?.name || "Independent"}</span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <select
                              value={selectedSellerProfile?.affiliatedBarId || ""}
                              onChange={(event) => runAdminAffiliationChange(selectedSellerProfile?.id, event.target.value)}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            >
                              <option value="">Set to Independent</option>
                              {(bars || []).map((bar) => (
                                <option key={bar.id} value={bar.id}>{bar.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => runAdminAffiliationChange(selectedSellerProfile?.id, "")}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                            >
                              Remove from bar
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {isSuperAdmin && canManageAdminAccess && ["seller", "bar"].includes(String(adminSelectedUser.role || "").trim().toLowerCase()) ? (
                        <div className="mt-4 rounded-2xl border border-rose-100 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Delegated admin access</div>
                          <p className="mt-1 text-sm text-slate-600">Grant limited admin permissions to this seller or bar account.</p>
                          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedAdminAccessDraft.enabled)}
                              onChange={(event) => setSelectedAdminAccessDraft({ enabled: event.target.checked })}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            Enable delegated admin access
                          </label>
                          {selectedAdminAccessDraft.enabled ? (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {DELEGATED_ADMIN_SCOPE_OPTIONS.map((option) => {
                                const checked = (selectedAdminAccessDraft.scopes || []).includes(option.key);
                                return (
                                  <label key={option.key} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) => {
                                        const current = new Set(selectedAdminAccessDraft.scopes || []);
                                        if (event.target.checked) current.add(option.key);
                                        else current.delete(option.key);
                                        setSelectedAdminAccessDraft({ scopes: Array.from(current) });
                                      }}
                                      className="h-4 w-4 rounded border-slate-300"
                                    />
                                    {option.label}
                                  </label>
                                );
                              })}
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              onClick={submitSelectedUserAdminAccessUpdate}
                              disabled={adminAccessSaving}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${adminAccessSaving ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"}`}
                            >
                              {adminAccessSaving ? "Saving..." : "Save delegated access"}
                            </button>
                            {adminAccessMessage ? (
                              <div className={`text-xs font-semibold ${adminAccessTone === "error" ? "text-rose-700" : adminAccessTone === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                                {adminAccessMessage}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      {canManageCredentials ? (
                      <div className="mt-4 rounded-2xl border border-rose-100 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Credentials</div>
                        <p className="mt-1 text-sm text-slate-600">Admins can update this user's email and password.</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <input
                            type="email"
                            value={selectedCredentialDraft.newEmail}
                            onChange={(event) => setSelectedCredentialDraft({ newEmail: event.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="New email"
                          />
                          <input
                            type="password"
                            value={selectedCredentialDraft.newPassword}
                            onChange={(event) => setSelectedCredentialDraft({ newPassword: event.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="New password"
                          />
                          <input
                            type="password"
                            value={selectedCredentialDraft.confirmPassword}
                            onChange={(event) => setSelectedCredentialDraft({ confirmPassword: event.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Password policy: at least 8 characters, 1 number, and 1 symbol.</div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            onClick={submitSelectedUserCredentialUpdate}
                            disabled={adminCredentialSaving}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${adminCredentialSaving ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"}`}
                          >
                            {adminCredentialSaving ? "Updating..." : "Update credentials"}
                          </button>
                          {adminCredentialMessage ? (
                            <div className={`text-xs font-semibold ${adminCredentialTone === "error" ? "text-rose-700" : adminCredentialTone === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                              {adminCredentialMessage}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      ) : null}
                      {isSuperAdmin ? (
                      <>
                      <div className="mt-4 rounded-2xl border border-rose-100 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Message user</div>
                        <p className="mt-1 text-sm text-slate-600">Send an email to this user without leaving Users and Appeals.</p>
                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                          To: <span className="font-semibold text-slate-800">{adminSelectedUser.email || "No email set"}</span>
                        </div>
                        <div className="mt-3">
                          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            Template
                          </label>
                          <select
                            value={selectedUserMessageDraft.templateKey || ""}
                            onChange={(event) => applyTemplateToSelectedUserMessage(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="">No template (custom message)</option>
                            {USER_MESSAGE_TEMPLATE_OPTIONS.map((template) => (
                              <option key={template.key} value={template.key}>{template.label}</option>
                            ))}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={selectedUserMessageDraft.subject}
                          onChange={(event) => setSelectedUserMessageDraft({ subject: event.target.value })}
                          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Email subject"
                        />
                        <textarea
                          value={selectedUserMessageDraft.body}
                          onChange={(event) => setSelectedUserMessageDraft({ body: event.target.value })}
                          className="mt-2 min-h-[110px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Write your message"
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <label className="mr-2 inline-flex items-center gap-2 text-xs text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedUserMessageDraft.ccAdminInbox)}
                              onChange={(event) => setSelectedUserMessageDraft({ ccAdminInbox: event.target.checked })}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                            CC to admin inbox
                          </label>
                          <button
                            onClick={sendMessageToSelectedUser}
                            disabled={adminUserMessageSending}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${adminUserMessageSending ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"}`}
                          >
                            {adminUserMessageSending ? "Sending..." : "Send message"}
                          </button>
                          {adminUserMessageStatus ? (
                            <div className={`text-xs font-semibold ${adminUserMessageTone === "error" ? "text-rose-700" : adminUserMessageTone === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                              {adminUserMessageStatus}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 rounded-2xl border border-rose-100 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Admin notes</div>
                        <textarea
                          value={adminUserNoteDraft}
                          onChange={(event) => setAdminUserNoteDraft(event.target.value)}
                          className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Internal notes for support/moderation handoff."
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => updateAdminNote?.(`user:${adminSelectedUser.id}`, adminUserNoteDraft)}
                            className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                          >
                            Save note
                          </button>
                          <button
                            onClick={() => {
                              setAdminUserNoteDraft("");
                              updateAdminNote?.(`user:${adminSelectedUser.id}`, "");
                            }}
                            className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            Clear note
                          </button>
                        </div>
                      </div>
                      </>
                      ) : null}
                    </>
                  )}
                </div>
                {selectedSellerQuality ? (
                  <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                    <h4 className="text-lg font-semibold">Seller quality scorecard (admin only)</h4>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Quality score</div><div className="mt-1 text-2xl font-semibold text-slate-800">{selectedSellerQuality.score}/100</div></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Avg reply time</div><div className="mt-1 text-2xl font-semibold text-slate-800">{selectedSellerQuality.avgReplyHours === null ? "N/A" : `${selectedSellerQuality.avgReplyHours.toFixed(1)}h`}</div></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Fulfillment rate</div><div className="mt-1 text-2xl font-semibold text-slate-800">{Math.round((selectedSellerQuality.fulfillmentRate || 0) * 100)}%</div></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Active strikes</div><div className="mt-1 text-2xl font-semibold text-rose-700">{selectedSellerQuality.strikeCount}</div></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Report volume</div><div className="mt-1 text-2xl font-semibold text-amber-700">{selectedSellerQuality.reportCount}</div></div>
                      <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Orders reviewed</div><div className="mt-1 text-2xl font-semibold text-slate-800">{selectedSellerQuality.totalOrders}</div></div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Visible only in admin to support coaching, moderation, and risk review.</p>
                  </div>
                ) : null}
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold">Appeals queue</h4>
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-rose-100">
                      {pendingAppeals.length} pending
                    </span>
                  </div>
                <div className="mt-4 space-y-4">
                    {pendingAppeals.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No pending appeals.</div>
                    ) : pendingAppeals.slice(0, 8).map((appeal) => {
                      const appealUser = users.find((user) => user.id === appeal.userId);
                      const roleLabel = String(appeal?.userRole || appealUser?.role || "").trim();
                      const sellerIdLabel = String(appeal?.sellerId || appealUser?.sellerId || "").trim();
                      return (
                    <div key={appeal.id} className="rounded-2xl border border-rose-100 p-5">
                        <div className="text-sm font-semibold">
                          {appealUser?.name || appeal.userId}
                        </div>
                      <div className="mt-1 text-sm text-slate-600">{formatDateTimeNoSeconds(appeal.createdAt || Date.now())}</div>
                      {(roleLabel || sellerIdLabel) ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {roleLabel ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">Role: {roleLabel}</span> : null}
                          {sellerIdLabel ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Seller ID: {sellerIdLabel}</span> : null}
                        </div>
                      ) : null}
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{appeal.message}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => reviewUserAppeal(appeal.id, "approved")}
                            disabled={reviewingAppealId === appeal.id}
                            className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${reviewingAppealId === appeal.id ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            Approve appeal
                          </button>
                          <button
                            onClick={() => reviewUserAppeal(appeal.id, "denied")}
                            disabled={reviewingAppealId === appeal.id}
                            className={`rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 ${reviewingAppealId === appeal.id ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            Deny appeal
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <h4 className="text-lg font-semibold">Order history</h4>
                <div className="mt-4 space-y-4">
                    {adminSelectedUserOrderHistory.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <div className="font-semibold text-slate-800">No order history yet.</div>
                        <div className="mt-1">This section tracks paid orders and shipment updates once user activity starts.</div>
                        <div className="mt-3">
                          <button onClick={() => navigate("/find")} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">
                            Browse sellers
                          </button>
                        </div>
                      </div>
                    ) : adminSelectedUserOrderHistory.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-rose-100 p-5">
                        <div className="font-semibold">{order.id}</div>
                      <div className="mt-1 text-sm text-slate-600">{formatDateTimeNoSeconds(order.createdAt || Date.now())}</div>
                        <div className="mt-1 text-sm text-slate-600">{formatPriceTHB(order.total)} · {order.paymentStatus} · {order.fulfillmentStatus}</div>
                        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span className="font-medium">Ship to:</span>{" "}
                          {[order.shippingAddress, order.shippingPostalCode, order.shippingCountry].filter(Boolean).join(", ") || "Not provided"}
                        </div>
                        {order.paymentStatus === "paid" ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1fr_0.95fr_auto] md:items-end">
                            <label className="text-sm text-slate-700">
                              Fulfillment status
                              <select
                                value={orderShipmentDrafts[order.id]?.fulfillmentStatus || order.fulfillmentStatus || "processing"}
                                onChange={(event) => setOrderShipmentDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    fulfillmentStatus: event.target.value,
                                    trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? "",
                                    trackingCarrier: prev[order.id]?.trackingCarrier ?? order.trackingCarrier ?? "",
                                  },
                                }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              >
                                <option value="processing">processing</option>
                                <option value="shipped">shipped</option>
                                <option value="delivered">delivered</option>
                              </select>
                            </label>
                            <label className="text-sm text-slate-700">
                              Tracking code
                              <input
                                value={orderShipmentDrafts[order.id]?.trackingNumber ?? order.trackingNumber ?? ""}
                                onChange={(event) => setOrderShipmentDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    fulfillmentStatus: prev[order.id]?.fulfillmentStatus || order.fulfillmentStatus || "processing",
                                    trackingNumber: event.target.value,
                                    trackingCarrier: prev[order.id]?.trackingCarrier ?? order.trackingCarrier ?? "",
                                  },
                                }))}
                                placeholder="e.g. TH1234567890"
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              />
                            </label>
                            <label className="text-sm text-slate-700">
                              Carrier
                              <select
                                value={orderShipmentDrafts[order.id]?.trackingCarrier ?? order.trackingCarrier ?? "Not set"}
                                onChange={(event) => setOrderShipmentDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    fulfillmentStatus: prev[order.id]?.fulfillmentStatus || order.fulfillmentStatus || "processing",
                                    trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? "",
                                    trackingCarrier: event.target.value,
                                  },
                                }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              >
                                {TRACKING_CARRIER_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <button
                              onClick={() => {
                                const draft = orderShipmentDrafts[order.id] || {};
                                const nextStatus = draft.fulfillmentStatus || order.fulfillmentStatus || "processing";
                                const nextTracking = draft.trackingNumber ?? order.trackingNumber ?? "";
                                const nextCarrier = draft.trackingCarrier ?? order.trackingCarrier ?? "";
                                updateOrderShipment(order.id, nextStatus, nextTracking, nextCarrier);
                              }}
                              disabled={updatingOrderId === order.id}
                              className={`rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 ${updatingOrderId === order.id ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              {updatingOrderId === order.id ? "Saving..." : "Save shipment"}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-slate-500">Shipment controls become available after payment is marked as paid.</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <h4 className="text-lg font-semibold">Message history</h4>
                <div className="mt-4 space-y-4">
                    {adminSelectedUserMessageHistory.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <div className="font-semibold text-slate-800">No messages yet.</div>
                        <div className="mt-1">Messages appear here after buyers, sellers, or support start a conversation.</div>
                        <div className="mt-3">
                          <button onClick={() => setAdminTab("users")} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">
                            Message user
                          </button>
                        </div>
                      </div>
                    ) : adminSelectedUserMessageHistory.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-rose-100 p-5">
                        <div className="text-sm font-semibold">{message.senderRole} message</div>
                        <div className="mt-1 text-sm text-slate-700">{message.body}</div>
                      <div className="mt-1 text-sm text-slate-600">{formatDateTimeNoSeconds(message.createdAt || Date.now())}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "inbox" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Daily digest</h3>
                    <p className="mt-1 text-sm text-slate-700">Quick exception view so you can review only what needs attention.</p>
                  </div>
                  <div className="text-xs text-slate-600">
                    Generated: {formatDateTimeNoSeconds(inboxDigest.generatedAt)}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <button
                    onClick={() => {
                      setInboxPriorityFilter("high");
                      setInboxReviewFilter("all");
                      setInboxVisibleCount(20);
                    }}
                    className="rounded-2xl border border-rose-200 bg-white p-4 text-left"
                  >
                    <div className="text-xs uppercase tracking-[0.12em] text-rose-700">High priority unresolved</div>
                    <div className="mt-1 text-2xl font-bold text-rose-700">{inboxDigest.highPriorityUnresolved.length}</div>
                    <div className="mt-1 text-xs text-slate-600">Click to filter queue</div>
                  </button>
                  <button
                    onClick={() => {
                      setInboxReviewFilter("follow_up");
                      setInboxPriorityFilter("all");
                      setInboxVisibleCount(20);
                    }}
                    className="rounded-2xl border border-violet-200 bg-white p-4 text-left"
                  >
                    <div className="text-xs uppercase tracking-[0.12em] text-violet-700">Follow-up older than 24h</div>
                    <div className="mt-1 text-2xl font-bold text-violet-700">{inboxDigest.followUpOlderThan24h.length}</div>
                    <div className="mt-1 text-xs text-slate-600">Click to filter queue</div>
                  </button>
                  <button
                    onClick={() => {
                      setInboxPriorityFilter("all");
                      setInboxReviewFilter("new");
                      setInboxVisibleCount(20);
                    }}
                    className="rounded-2xl border border-amber-200 bg-white p-4 text-left"
                  >
                    <div className="text-xs uppercase tracking-[0.12em] text-amber-700">New items since yesterday</div>
                    <div className="mt-1 text-2xl font-bold text-amber-700">{inboxDigest.newSinceYesterday.length}</div>
                    <div className="mt-1 text-xs text-slate-600">Click to show new queue</div>
                  </button>
                </div>
              </div>
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Inbox and reviews</h3>
                <p className="mt-1 text-sm text-slate-700">All direct messages and custom request activity in one queue. Review only exceptions, keep everything searchable.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Total items</div><div className="mt-1 text-lg font-semibold text-slate-800">{inboxCounts.total}</div></div>
                  <div className="rounded-2xl bg-rose-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-rose-700">High priority</div><div className="mt-1 text-lg font-semibold text-rose-700">{inboxCounts.highPriority}</div></div>
                  <div className="rounded-2xl bg-amber-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-amber-700">New</div><div className="mt-1 text-lg font-semibold text-amber-700">{inboxCounts.new}</div></div>
                  <div className="rounded-2xl bg-violet-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-violet-700">Needs follow-up</div><div className="mt-1 text-lg font-semibold text-violet-700">{inboxCounts.followUp}</div></div>
                  <div className="rounded-2xl bg-emerald-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-emerald-700">Resolved</div><div className="mt-1 text-lg font-semibold text-emerald-700">{inboxCounts.resolved}</div></div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={inboxSearch}
                    onChange={(event) => {
                      setInboxSearch(event.target.value);
                      setInboxVisibleCount(20);
                    }}
                    placeholder="Search by message text, user name, request id, item id"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-80 md:w-96"
                  />
                  <select value={inboxTypeFilter} onChange={(event) => { setInboxTypeFilter(event.target.value); setInboxVisibleCount(20); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="all">All types</option>
                    <option value="message">Direct messages</option>
                    <option value="custom_request">Custom requests</option>
                    <option value="custom_request_message">Request messages</option>
                    <option value="refund_claim">Refund evidence</option>
                    <option value="order_help_request">Order help requests</option>
                    <option value="safety_report">Safety reports</option>
                    <option value="bar_affiliation_request">Bar affiliation requests</option>
                  </select>
                  <select value={inboxPriorityFilter} onChange={(event) => { setInboxPriorityFilter(event.target.value); setInboxVisibleCount(20); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="all">All priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <select value={inboxReviewFilter} onChange={(event) => { setInboxReviewFilter(event.target.value); setInboxVisibleCount(20); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="all">All review states</option>
                    <option value="new">New</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="follow_up">Needs follow-up</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => exportRowsToCsv(
                      `admin-inbox-${new Date().toISOString().slice(0, 10)}.csv`,
                      filteredInboxItemsWithContext.map((item) => ({
                        itemKey: item.itemKey,
                        type: item.typeLabel,
                        priority: item.priority,
                        reviewStatus: item.reviewStatus,
                        waitingFor: item.waitingFor,
                        waitingDuration: item.waitingDurationLabel,
                        actor: item.actorLabel,
                        counterpart: item.counterpartLabel,
                        requestId: item.requestId || "",
                        createdAt: item.createdAt || "",
                        text: item.bodySnippet || item.body || "",
                      })),
                    )}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Export CSV
                  </button>
                </div>
                {inboxActionMessage ? (
                  <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                    {inboxActionMessage}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                  <input
                    value={inboxPresetName}
                    onChange={(event) => setInboxPresetName(event.target.value)}
                    placeholder="Preset name"
                    className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => {
                      if (!inboxPresetName.trim()) return;
                      saveAdminInboxFilterPreset?.({
                        name: inboxPresetName,
                        type: inboxTypeFilter,
                        priority: inboxPriorityFilter,
                        review: inboxReviewFilter,
                        search: inboxSearch,
                      });
                      setInboxPresetName("");
                    }}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                  >
                    Save filter preset
                  </button>
                  {(adminInboxFilterPresets || []).slice(0, 8).map((preset) => (
                    <div key={preset.id} className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1">
                      <button
                        onClick={() => {
                          setInboxTypeFilter(preset.type || "all");
                          setInboxPriorityFilter(preset.priority || "all");
                          setInboxReviewFilter(preset.review || "all");
                          setInboxSearch(preset.search || "");
                          setInboxVisibleCount(20);
                        }}
                        className="text-xs font-semibold text-slate-700"
                      >
                        {preset.name}
                      </button>
                      <button onClick={() => deleteAdminInboxFilterPreset?.(preset.id)} className="text-xs text-rose-600">x</button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="text-sm font-semibold text-slate-700">Selected: {inboxSelectedCount}</div>
                  <button onClick={() => applyBulkInboxStatus("reviewed")} className="rounded-xl border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700">Bulk reviewed</button>
                  <button onClick={() => applyBulkInboxStatus("follow_up")} className="rounded-xl border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700">Bulk follow-up</button>
                  <button onClick={() => applyBulkInboxStatus("resolved")} className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">Bulk resolve</button>
                  <button onClick={() => setInboxSelectedKeys({})} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">Clear selection</button>
                </div>
                <div className="mt-4 space-y-4">
                  {visibleInboxItemsWithContext.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      No inbox items match the current filters.
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setInboxSearch("");
                            setInboxTypeFilter("all");
                            setInboxPriorityFilter("all");
                            setInboxReviewFilter("all");
                            setInboxVisibleCount(20);
                          }}
                          className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                        >
                          Reset filters
                        </button>
                      </div>
                    </div>
                  ) : visibleInboxItemsWithContext.map((item) => (
                    <div key={item.itemKey} className="rounded-2xl border border-rose-100 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={Boolean(inboxSelectedKeys[item.itemKey])}
                            onChange={(event) => setInboxSelectedKeys((prev) => ({ ...prev, [item.itemKey]: event.target.checked }))}
                          />
                          <div className="text-sm font-semibold text-slate-800">{item.typeLabel}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.priority === "high" ? "bg-rose-100 text-rose-700" : item.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                            {item.priority}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.reviewStatus === "resolved" ? "bg-emerald-100 text-emerald-700" : item.reviewStatus === "follow_up" ? "bg-violet-100 text-violet-700" : item.reviewStatus === "reviewed" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                            {item.reviewStatus === "follow_up" ? "needs follow-up" : item.reviewStatus}
                          </span>
                          {item.waitingFor !== "none" ? (
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.isOverdue ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
                              Waiting on {item.waitingFor} · {item.waitingDurationLabel}
                            </span>
                          ) : null}
                          <span className="text-sm text-slate-600">{formatDateTimeNoSeconds(item.createdAt || Date.now())}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        <span className="font-semibold">{item.actorLabel}</span>
                        {" -> "}
                        <span className="font-semibold">{item.counterpartLabel}</span>
                        {" · "}
                        <span className="text-slate-600">{item.id}</span>
                        {item.requestId ? <>{" · "}Request: <span className="text-slate-700">{item.requestId}</span></> : null}
                        {item.requestStatus ? <>{" · "}Status: <span className="text-slate-700">{item.requestStatus}</span></> : null}
                      </div>
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap">{item.bodySnippet || "(No message body)"}</div>
                      {item.type === "refund_claim" && (item.evidenceLinks || []).length > 0 ? (
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                          <div className="font-semibold text-slate-800">Evidence links</div>
                          <div className="mt-1 space-y-1">
                            {(item.evidenceLinks || []).slice(0, 5).map((link, index) => (
                              <div key={`${item.itemKey}_evidence_${index}`} className="truncate">{link}</div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {item.type === "refund_claim" && item.decisionNote ? (
                        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          Decision note: {item.decisionNote}
                        </div>
                      ) : null}
                      {item.type === "order_help_request" ? (
                        <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                          <div><span className="font-semibold text-slate-800">Issue type:</span> {item.issueType || "other"}</div>
                          <div className="mt-1"><span className="font-semibold text-slate-800">Requester email:</span> {item.requesterEmail || "Not provided"}</div>
                        </div>
                      ) : null}
                      {item.type === "safety_report" ? (
                        <div className="mt-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-900">
                          <div><span className="font-semibold">Report type:</span> {item.reportType || "other"}</div>
                          <div className="mt-1"><span className="font-semibold">Reporter email:</span> {item.reporterEmail || "Not provided"}</div>
                          {item.targetHandle ? <div className="mt-1"><span className="font-semibold">Target:</span> {item.targetHandle}</div> : null}
                        </div>
                      ) : null}
                      {item.type === "order_help_request" && item.adminNote ? (
                        <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                          Admin note: {item.adminNote}
                        </div>
                      ) : null}
                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Conversation context</div>
                        <div className="mt-2 text-sm text-slate-700">
                          {item.type === "message" ? (
                            <>Direct thread messages: <span className="font-semibold">{item.directMessageCount}</span></>
                          ) : (
                            <>Request thread messages: <span className="font-semibold">{item.requestMessageCount}</span></>
                          )}
                          {item.actorOrderStats?.count ? <>{" · "}Actor orders: <span className="font-semibold">{item.actorOrderStats.count}</span></> : null}
                          {item.counterpartOrderStats?.count ? <>{" · "}Counterpart orders: <span className="font-semibold">{item.counterpartOrderStats.count}</span></> : null}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {item.actorWalletTx ? `Actor last wallet activity: ${item.actorWalletTx.description || item.actorWalletTx.type} (${formatDateTimeNoSeconds(item.actorWalletTx.createdAt || Date.now())})` : "Actor wallet activity not available."}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          {item.counterpartWalletTx ? `Counterpart last wallet activity: ${item.counterpartWalletTx.description || item.counterpartWalletTx.type} (${formatDateTimeNoSeconds(item.counterpartWalletTx.createdAt || Date.now())})` : "Counterpart wallet activity not available."}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => updateAdminInboxReview?.(item.itemKey, "reviewed")} className="rounded-xl border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700">
                          Mark reviewed
                        </button>
                        <button onClick={() => updateAdminInboxReview?.(item.itemKey, "follow_up")} className="rounded-xl border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700">
                          Needs follow-up
                        </button>
                        <button onClick={() => updateAdminInboxReview?.(item.itemKey, "resolved")} className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">
                          Resolve
                        </button>
                        <button onClick={() => navigate(item.actionPath)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">
                          Open source
                        </button>
                        {item.type === "custom_request" && item.requestId ? (
                          <button
                            onClick={() => {
                              if (!cancelCustomRequestByAdmin) return;
                              if ((item.requestStatus || "") === "cancelled") {
                                setInboxActionMessage(`Request ${item.requestId} is already cancelled.`);
                                return;
                              }
                              if (typeof window === "undefined") return;
                              const reason = window.prompt("Reason for admin cancellation", "Inappropriate custom order content");
                              if (reason === null) return;
                              cancelCustomRequestByAdmin(
                                item.requestId,
                                reason,
                                (result) => {
                                  const refunded = Number(result?.refundAmount || 0);
                                  setInboxActionMessage(
                                    refunded > 0
                                      ? `Cancelled ${item.requestId}. Buyer refunded ${formatPriceTHB(refunded)}.`
                                      : `Cancelled ${item.requestId}.`,
                                  );
                                  updateAdminInboxReview?.(item.itemKey, "resolved");
                                },
                                (message) => setInboxActionMessage(message || "Could not cancel this custom request."),
                              );
                            }}
                            className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700"
                          >
                            Cancel custom order
                          </button>
                        ) : null}
                        {item.type === "refund_claim" ? (
                          <>
                            <button
                              onClick={() => {
                                if (!updateRefundClaimDecision) return;
                                if (["approved", "rejected"].includes(String(item.requestStatus || ""))) {
                                  setInboxActionMessage(`Refund claim ${item.id} is already ${item.requestStatus}.`);
                                  return;
                                }
                                if (typeof window === "undefined") return;
                                const note = window.prompt("Optional note for buyer (approval)", "Approved after evidence review");
                                if (note === null) return;
                                updateRefundClaimDecision(
                                  item.id,
                                  "approved",
                                  note,
                                  (result) => {
                                    const refunded = Number(result?.refundAmount || 0);
                                    setInboxActionMessage(`Approved refund claim ${item.id}. Refunded ${formatPriceTHB(refunded)}.`);
                                    updateAdminInboxReview?.(item.itemKey, "resolved");
                                  },
                                  (message) => setInboxActionMessage(message || "Could not approve refund claim."),
                                );
                              }}
                              className="rounded-xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"
                            >
                              Approve + refund
                            </button>
                            <button
                              onClick={() => {
                                if (!updateRefundClaimDecision) return;
                                if (["approved", "rejected"].includes(String(item.requestStatus || ""))) {
                                  setInboxActionMessage(`Refund claim ${item.id} is already ${item.requestStatus}.`);
                                  return;
                                }
                                if (typeof window === "undefined") return;
                                const note = window.prompt("Reason for rejection", "Evidence did not confirm wrong-item delivery");
                                if (note === null) return;
                                updateRefundClaimDecision(
                                  item.id,
                                  "rejected",
                                  note,
                                  () => {
                                    setInboxActionMessage(`Rejected refund claim ${item.id}.`);
                                    updateAdminInboxReview?.(item.itemKey, "resolved");
                                  },
                                  (message) => setInboxActionMessage(message || "Could not reject refund claim."),
                                );
                              }}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                            >
                              Reject claim
                            </button>
                          </>
                        ) : null}
                        {item.type === "bar_affiliation_request" ? (
                          <>
                            <button
                              onClick={() => {
                                if (!respondToBarAffiliationRequest) return;
                                respondToBarAffiliationRequest(item.id, "approved");
                                setInboxItemMessages((prev) => ({ ...prev, [item.itemKey]: "Approved." }));
                                updateAdminInboxReview?.(item.itemKey, "resolved");
                              }}
                              className="cursor-pointer rounded-xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"
                            >
                              Approved
                            </button>
                            <button
                              onClick={() => {
                                if (!respondToBarAffiliationRequest) return;
                                respondToBarAffiliationRequest(item.id, "rejected");
                                setInboxItemMessages((prev) => ({ ...prev, [item.itemKey]: "Rejected." }));
                                updateAdminInboxReview?.(item.itemKey, "resolved");
                              }}
                              className="cursor-pointer rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                            >
                              Reject request
                            </button>
                          </>
                        ) : null}
                        <button
                          onClick={() => {
                            if (typeof window === "undefined") return;
                            const existing = adminNoteByEntityKey[item.itemKey]?.body || "";
                            const next = window.prompt("Internal note for this inbox item", existing);
                            if (next === null) return;
                            updateAdminNote?.(item.itemKey, next);
                          }}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                        >
                          Add note
                        </button>
                      </div>
                      {inboxItemMessages[item.itemKey] ? (
                        <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                          {inboxItemMessages[item.itemKey]}
                        </div>
                      ) : null}
                      {adminNoteByEntityKey[item.itemKey]?.body ? (
                        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          Note: {adminNoteByEntityKey[item.itemKey].body}
                        </div>
                      ) : null}
                      {item.reviewUpdatedAt ? (
                        <div className="mt-2 text-xs text-slate-500">Last reviewed: {formatDateTimeNoSeconds(item.reviewUpdatedAt)}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
                {filteredInboxItems.length > inboxVisibleCount ? (
                  <div className="mt-4">
                    <button onClick={() => setInboxVisibleCount((count) => count + 20)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">
                      Load more inbox items
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {adminTab === "disputes" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-orange-100 bg-orange-50/70 p-5">
                <h3 className="text-lg font-semibold text-slate-900">Disputes and refund workflow</h3>
                <p className="mt-1 text-sm text-slate-700">Review possible refund/dispute cases from delayed paid orders and high-risk inbox language.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Total cases</div><div className="mt-1 text-2xl font-semibold text-slate-800">{disputeCounts.total}</div></div>
                  <div className="rounded-2xl bg-white p-3"><div className="text-xs uppercase tracking-[0.12em] text-rose-700">Open</div><div className="mt-1 text-2xl font-semibold text-rose-700">{disputeCounts.open}</div></div>
                  <div className="rounded-2xl bg-white p-3"><div className="text-xs uppercase tracking-[0.12em] text-amber-700">Pending refund</div><div className="mt-1 text-2xl font-semibold text-amber-700">{disputeCounts.pendingRefund}</div></div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const timestamp = Date.now();
                      updateAdminDisputeCase?.(`manual:${timestamp}`, "new", {
                        title: `Manual test case ${timestamp}`,
                        reason: "Admin-generated test dispute case for workflow validation.",
                        sourceType: "manual_test",
                        createdAt: new Date(timestamp).toISOString(),
                      });
                    }}
                    className="rounded-xl border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-700"
                  >
                    Create test dispute case
                  </button>
                  <button
                    onClick={() => exportRowsToCsv(
                      `admin-disputes-${new Date().toISOString().slice(0, 10)}.csv`,
                      disputeQueue.map((item) => ({
                        caseKey: item.caseKey,
                        title: item.title,
                        reason: item.reason,
                        status: item.status,
                        sourceType: item.sourceType,
                        orderId: item.orderId || "",
                        updatedAt: item.updatedAt || "",
                      })),
                    )}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Export disputes CSV
                  </button>
                </div>
                <div className="space-y-4">
                  {disputeQueue.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      No dispute cases right now.
                      <div className="mt-2">
                        <button onClick={() => setAdminTab("inbox")} className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                          Open inbox for manual review
                        </button>
                      </div>
                    </div>
                  ) : disputeQueue.map((item) => (
                    <div key={item.caseKey} className="rounded-2xl border border-rose-100 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === "resolved" ? "bg-emerald-100 text-emerald-700" : item.status === "rejected" ? "bg-slate-200 text-slate-700" : item.status === "pending_refund" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">{item.reason}</div>
                      <div className="mt-1 text-xs text-slate-600">Source: {item.sourceType} {item.orderId ? `· Order: ${item.orderId}` : ""}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => updateAdminDisputeCase?.(item.caseKey, "investigating", { title: item.title, reason: item.reason, orderId: item.orderId, sourceType: item.sourceType })} className="rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700">Investigating</button>
                        <button onClick={() => updateAdminDisputeCase?.(item.caseKey, "pending_refund", { title: item.title, reason: item.reason, orderId: item.orderId, sourceType: item.sourceType })} className="rounded-xl border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-700">Pending refund</button>
                        <button onClick={() => updateAdminDisputeCase?.(item.caseKey, "resolved", { title: item.title, reason: item.reason, orderId: item.orderId, sourceType: item.sourceType })} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700">Resolve</button>
                        <button onClick={() => updateAdminDisputeCase?.(item.caseKey, "rejected", { title: item.title, reason: item.reason, orderId: item.orderId, sourceType: item.sourceType })} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "products" ? (
            <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">Product catalog</h3>
              <p className="mt-1 text-sm text-slate-600">Review listing metadata, seller ownership, pricing, and status at a glance.</p>
              <div className="mt-5 space-y-3">
                {products.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                    No products yet.
                    <div className="mt-2">
                      <button onClick={() => navigate("/seller-dashboard")} className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">Open seller dashboard</button>
                    </div>
                  </div>
                ) : products.map((product) => (
                  <div key={product.id} className="grid gap-3 rounded-2xl border border-rose-100 p-4 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
                    <div><div className="font-semibold">{product.title}</div><div className="mt-1 text-sm text-slate-500">{product.slug}</div></div>
                    <div className="text-sm text-slate-600">Seller: {sellerMap[product.sellerId]?.name}</div>
                    <div className="text-sm text-slate-600">{formatPriceTHB(product.price)}</div>
                    <div className="text-sm font-semibold text-rose-700">{product.status}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {adminTab === "social" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Moderation workflow</h3>
                <p className="mt-1 text-sm text-slate-700">Handle open post reports first, then comment reports, then clean up posts from feed search.</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">Social insights snapshot</h3>
                <p className="mt-1 text-sm text-slate-600">High-level feed health, engagement, and growth indicators.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Posts</div><div className="mt-1 text-lg font-semibold text-slate-800">{socialInsights.totalPosts}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Likes</div><div className="mt-1 text-lg font-semibold text-slate-800">{socialInsights.totalLikes}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Comments</div><div className="mt-1 text-lg font-semibold text-slate-800">{socialInsights.totalComments}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Follows</div><div className="mt-1 text-lg font-semibold text-slate-800">{socialInsights.totalFollows}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">New posts (7d)</div><div className="mt-1 text-lg font-semibold text-emerald-700">{socialInsights.newPosts7d}</div></div>
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Engagement (7d)</div><div className="mt-1 text-lg font-semibold text-rose-700">{socialInsights.engagement7d}</div></div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Recent moderation actions</h3>
                    <p className="mt-1 text-sm text-slate-600">Latest reporting, report resolution, and admin post-removal events.</p>
                  </div>
                  <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">
                    {recentModerationActions.length} action(s)
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {recentModerationActions.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No moderation actions yet.</div>
                  ) : recentModerationActions.map((action) => {
                    const actionTitle =
                      action.type === "report_seller_post"
                        ? "Post reported"
                        : action.type === "resolve_post_report"
                          ? "Report resolved"
                          : action.type === "report_direct_message"
                            ? "Direct message reported"
                            : action.type === "resolve_message_report"
                              ? "Direct message report resolved"
                              : action.type === "dismiss_message_report"
                                ? "Direct message report dismissed"
                                : "Post deleted by admin";
                    return (
                      <div key={action.id} className="rounded-2xl border border-rose-100 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-800">{actionTitle}</div>
                          <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(action.createdAt || Date.now())}</div>
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          {action.targetPostId ? `Post: ${action.targetPostId}` : null}
                          {action.targetMessageId ? `Message: ${action.targetMessageId}` : null}
                          {action.conversationId ? ` · Conversation: ${action.conversationId}` : null}
                          {action.targetPostId && action.targetReportId ? " · " : null}
                          {action.targetReportId ? `Report: ${action.targetReportId}` : null}
                          {(action.adminUserId || action.reporterUserId) ? " · " : null}
                          {action.adminUserId ? `Admin: ${action.adminUserId}` : null}
                          {action.reporterUserId ? `Reporter: ${action.reporterUserId} (${action.reporterRole || "user"})` : null}
                        </div>
                        {action.reason ? <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{action.reason}</div> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Open reports queue</h3>
                    <p className="mt-1 text-sm text-slate-600">Review reported posts and resolve each case when moderation is complete.</p>
                  </div>
                  <button
                    onClick={resolveAllPostReports}
                    disabled={resolvingAllPostReports || unresolvedReports.length === 0}
                    className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${resolvingAllPostReports || unresolvedReports.length === 0 ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {resolvingAllPostReports ? "Resolving all..." : `Resolve all (${unresolvedReports.length})`}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {visibleOpenReports.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No open reports.</div>
                  ) : visibleOpenReports.map((report) => (
                    <div key={report.id} className="rounded-2xl border border-rose-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">Post: {report.postId}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            Reporter: {report.reporterUserId} ({report.reporterRole}) · {formatDateTimeNoSeconds(report.createdAt || Date.now())}
                          </div>
                        </div>
                        <button
                          onClick={() => resolvePostReport(report.id)}
                          disabled={resolvingPostReportId === report.id}
                          className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${resolvingPostReportId === report.id ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {resolvingPostReportId === report.id ? "Resolving..." : "Resolve"}
                        </button>
                      </div>
                      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{report.reason}</div>
                    </div>
                  ))}
                </div>
                {unresolvedReports.length > reportVisibleCount ? (
                  <div className="mt-4">
                    <button onClick={() => setReportVisibleCount((count) => count + 8)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                      Load more reports
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Open comment reports queue</h3>
                    <p className="mt-1 text-sm text-slate-600">Resolve reported comments. Each resolved violation applies one strike automatically.</p>
                  </div>
                  <button
                    onClick={resolveAllCommentReports}
                    disabled={resolvingAllCommentReports || unresolvedCommentReports.length === 0}
                    className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${resolvingAllCommentReports || unresolvedCommentReports.length === 0 ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {resolvingAllCommentReports ? "Resolving all..." : `Resolve all (${unresolvedCommentReports.length})`}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {visibleOpenCommentReports.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No open comment reports.</div>
                  ) : visibleOpenCommentReports.map((report) => (
                    <div key={report.id} className="rounded-2xl border border-rose-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">Comment: {report.commentId}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            Post: {report.postId} · Reporter: {report.reporterUserId} ({report.reporterRole}) · {formatDateTimeNoSeconds(report.createdAt || Date.now())}
                          </div>
                        </div>
                        <button
                          onClick={() => resolveCommentReport(report.id)}
                          disabled={resolvingCommentReportId === report.id}
                          className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${resolvingCommentReportId === report.id ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {resolvingCommentReportId === report.id ? "Resolving..." : "Resolve"}
                        </button>
                      </div>
                      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{report.reason}</div>
                    </div>
                  ))}
                </div>
                {unresolvedCommentReports.length > reportVisibleCount ? (
                  <div className="mt-4">
                    <button onClick={() => setReportVisibleCount((count) => count + 8)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                      Load more comment reports
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Open direct message reports queue</h3>
                    <p className="mt-1 text-sm text-slate-600">Review reported seller messages. Resolve adds a moderation strike, dismiss closes without a strike.</p>
                  </div>
                  <button
                    onClick={resolveAllMessageReports}
                    disabled={resolvingAllMessageReports || unresolvedMessageReports.length === 0}
                    className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${resolvingAllMessageReports || unresolvedMessageReports.length === 0 ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {resolvingAllMessageReports ? "Resolving all..." : `Resolve all (${unresolvedMessageReports.length})`}
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {visibleOpenMessageReports.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No open direct message reports.</div>
                  ) : visibleOpenMessageReports.map((report) => (
                    <div key={report.id} className="rounded-2xl border border-rose-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">Message: {report.messageId}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            Conversation: {report.conversationId || "N/A"} · Reporter: {report.reporterUserId} ({report.reporterRole}) · Priority: {report.priority || "medium"} · {formatDateTimeNoSeconds(report.createdAt || Date.now())}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => resolveMessageReport(report.id)}
                            disabled={resolvingMessageReportId === report.id}
                            className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${resolvingMessageReportId === report.id ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            {resolvingMessageReportId === report.id ? "Resolving..." : "Resolve"}
                          </button>
                          <button
                            onClick={() => dismissMessageReport(report.id)}
                            disabled={dismissingMessageReportId === report.id}
                            className={`rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 ${dismissingMessageReportId === report.id ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            {dismissingMessageReportId === report.id ? "Dismissing..." : "Dismiss"}
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                        <div><span className="font-semibold">Category:</span> {getAdminMessageReportReasonLabel(report.reasonCategory)}</div>
                        <div className="mt-1">{report.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {unresolvedMessageReports.length > reportVisibleCount ? (
                  <div className="mt-4">
                    <button onClick={() => setReportVisibleCount((count) => count + 8)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                      Load more message reports
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Feed moderation</h3>
                    <p className="mt-1 text-sm text-slate-600">Search, review, and remove posts that violate platform policy.</p>
                  </div>
                  <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">{socialPostsFiltered.length} post(s)</div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    value={socialSearch}
                    onChange={(event) => {
                      setSocialSearch(event.target.value);
                      setSocialVisibleCount(10);
                    }}
                    placeholder="Search by caption, post id, seller name"
                    className="min-w-[240px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <select
                    value={socialFilter}
                    onChange={(event) => {
                      setSocialFilter(event.target.value);
                      setSocialVisibleCount(10);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="all">All posts</option>
                    <option value="reported">Reported only</option>
                  </select>
                </div>
                <div className="mt-5 space-y-4">
                  {visibleSocialPosts.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No seller posts yet.</div>
                  ) : visibleSocialPosts.map((post) => (
                    <div key={post.id} className="rounded-2xl border border-rose-100 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{sellerMap[post.sellerId]?.name || post.sellerId}</div>
                          <div className="mt-1 text-sm text-slate-600">{formatDateTimeNoSeconds(post.createdAt || Date.now())} · {post.id}</div>
                          {reportedPostIds.has(post.id) ? (
                            <div className="mt-1 text-sm font-semibold text-amber-700">Reported</div>
                          ) : null}
                        </div>
                        <button
                          onClick={() => deleteSellerPost(post.id)}
                          disabled={deletingSellerPostId === post.id}
                          className={`rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 ${deletingSellerPostId === post.id ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {deletingSellerPostId === post.id ? "Deleting..." : "Delete post"}
                        </button>
                      </div>
                      {post.caption ? <div className="mt-3 text-sm text-slate-700">{post.caption}</div> : null}
                      <div className="mt-3 aspect-[4/5]">{post.image ? <ProductImage src={post.image} label={post.imageName || "Post image"} top /> : <ProductImage label="No image" />}</div>
                    </div>
                  ))}
                </div>
                {socialPostsFiltered.length > socialVisibleCount ? (
                  <div className="mt-4">
                    <button onClick={() => setSocialVisibleCount((count) => count + 10)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                      Load more posts
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {adminTab === "payments" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Payments operations</h3>
                <p className="mt-1 text-sm text-slate-700">Monitor split payouts across messages, comments, and custom request purchases.</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Manual monthly payout run</h3>
                    <p className="mt-1 text-sm text-slate-600">Schedule: monthly · Minimum threshold: ฿100 · Hold window: 14 days · Approval: admin only</p>
                  </div>
                  <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">
                    {sortedPayoutRuns.length} run(s)
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[200px_1fr_auto] md:items-end">
                  <label className="text-sm text-slate-700">
                    Month
                    <input
                      type="month"
                      value={payoutMonthDraft}
                      onChange={(event) => setPayoutMonthDraft(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-sm text-slate-700">
                    Run notes (optional)
                    <input
                      value={payoutRunNotesDraft}
                      onChange={(event) => setPayoutRunNotesDraft(event.target.value)}
                      placeholder="for example: monthly payout batch"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await Promise.resolve(createMonthlyPayoutRun?.(payoutMonthDraft, payoutRunNotesDraft));
                      setPayoutRunActionMessage(result?.message || result?.error || "No payout action result.");
                      if (result?.ok) setPayoutRunNotesDraft("");
                    }}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                  >
                    Generate run
                  </button>
                </div>
                {payoutRunActionMessage ? (
                  <div className="mt-3 text-sm font-medium text-emerald-700">{payoutRunActionMessage}</div>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-700">
                    Active payout run
                    <select
                      value={selectedPayoutRunId}
                      onChange={(event) => setSelectedPayoutRunId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {sortedPayoutRuns.length === 0 ? (
                        <option value="">No payout runs yet</option>
                      ) : sortedPayoutRuns.map((run) => (
                        <option key={run.id} value={run.id}>
                          {run.periodLabel || run.id} · {run.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                    {activePayoutRun ? (
                      <>
                        <div><span className="font-semibold">Hold until:</span> {formatDateTimeNoSeconds(activePayoutRun.holdUntil || Date.now())}</div>
                        <div className="mt-1"><span className="font-semibold">Created:</span> {formatDateTimeNoSeconds(activePayoutRun.createdAt || Date.now())}</div>
                      </>
                    ) : "Choose or create a payout run to begin."}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Pending</div>
                    <div className="mt-1 text-lg font-semibold text-amber-700">{formatPriceTHB(payoutSummary.pending)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Sent</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(payoutSummary.sent)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Failed</div>
                    <div className="mt-1 text-lg font-semibold text-rose-700">{formatPriceTHB(payoutSummary.failed)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Below threshold</div>
                    <div className="mt-1 text-lg font-semibold text-slate-800">{formatPriceTHB(payoutSummary.belowThreshold)}</div>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Pending payout approvals</h4>
                  {pendingPayoutItems.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No pending payout items in this run.</div>
                  ) : pendingPayoutItems.map((item) => {
                    const recipient = userById[item.recipientUserId];
                    const methodDraft = payoutMethodByItemId[item.id] || item.method || "bank_transfer";
                    const referenceDraft = payoutReferenceByItemId[item.id] || item.externalReference || "";
                    const noteDraft = payoutNoteByItemId[item.id] || item.notes || "";
                    return (
                      <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-slate-900">{recipient?.name || item.recipientUserId} ({item.recipientRole})</div>
                          <div className="text-sm font-semibold text-emerald-700">{formatPriceTHB(item.netPayable)}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{(item.sourceTxIds || []).length} earning transaction(s)</div>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <select
                            value={methodDraft}
                            onChange={(event) => setPayoutMethodByItemId((prev) => ({ ...prev, [item.id]: event.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="bank_transfer">Bank transfer</option>
                            <option value="promptpay">PromptPay</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            value={referenceDraft}
                            onChange={(event) => setPayoutReferenceByItemId((prev) => ({ ...prev, [item.id]: event.target.value }))}
                            placeholder="Transfer reference (required)"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                          <input
                            value={noteDraft}
                            onChange={(event) => setPayoutNoteByItemId((prev) => ({ ...prev, [item.id]: event.target.value }))}
                            placeholder="Reason / notes (required)"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          Impact: payout status updates seller earnings history and reconciliation logs immediately.
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const reasonText = String(noteDraft || "").trim();
                              if (reasonText.length < 8) {
                                setPayoutRunActionMessage("Add a short reason in notes (minimum 8 characters) before marking sent.");
                                return;
                              }
                              if (typeof window !== "undefined" && !window.confirm(`Mark payout sent to ${recipient?.name || item.recipientUserId}?`)) return;
                              const result = await Promise.resolve(markPayoutItemSent?.(item.id, {
                                method: methodDraft,
                                externalReference: referenceDraft,
                                notes: reasonText,
                              }));
                              setPayoutRunActionMessage(result?.message || result?.error || "No payout action result.");
                            }}
                            className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700"
                          >
                            Mark sent
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const reasonText = String(noteDraft || "").trim();
                              if (reasonText.length < 8) {
                                setPayoutRunActionMessage("Add a short failure reason (minimum 8 characters) before marking failed.");
                                return;
                              }
                              if (typeof window !== "undefined" && !window.confirm(`Mark payout as failed for ${recipient?.name || item.recipientUserId}?`)) return;
                              const result = await Promise.resolve(markPayoutItemFailed?.(item.id, reasonText));
                              setPayoutRunActionMessage(result?.message || result?.error || "No payout action result.");
                            }}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                          >
                            Mark failed
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Sent in active run</h4>
                    <div className="mt-3 space-y-2 text-sm">
                      {sentPayoutItems.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 p-3 text-slate-600">No sent payouts yet.</div>
                      ) : sentPayoutItems.map((item) => {
                        const recipient = userById[item.recipientUserId];
                        return (
                          <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-slate-700">
                            <div className="font-semibold">{recipient?.name || item.recipientUserId} · {formatPriceTHB(item.netPayable)}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.method} · Ref {item.externalReference || "N/A"} · {formatDateTimeNoSeconds(item.paidAt || Date.now())}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Run events</h4>
                    <div className="mt-3 space-y-2 text-sm">
                      {recentPayoutEvents.length === 0 ? (
                        <div className="rounded-xl bg-slate-50 p-3 text-slate-600">No payout events yet.</div>
                      ) : recentPayoutEvents.map((event) => (
                        <div key={event.id} className="rounded-xl bg-slate-50 p-3 text-slate-700">
                          <div className="font-semibold">{event.eventType}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatDateTimeNoSeconds(event.createdAt || Date.now())} · {event.payoutItemId}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {failedPayoutItems.length > 0 || belowThresholdPayoutItems.length > 0 ? (
                  <div className="mt-4 text-xs text-slate-500">
                    Failed items: {failedPayoutItems.length} · Below threshold items: {belowThresholdPayoutItems.length}
                  </div>
                ) : null}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Who is owed now</h3>
                    <p className="mt-1 text-sm text-slate-600">Fast payout intelligence by all-time, month, current payout cycle, or custom range.</p>
                  </div>
                  <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">
                    Window: {paymentWindowMeta.label}
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
                  <select
                    value={paymentsWindowPreset}
                    onChange={(event) => setPaymentsWindowPreset(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="all_time">All time</option>
                    <option value="current_month">Current month</option>
                    <option value="current_payout_cycle">Current payout cycle</option>
                    <option value="custom">Custom range</option>
                  </select>
                  <input
                    type="date"
                    value={paymentsCustomStartDate}
                    onChange={(event) => setPaymentsCustomStartDate(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    disabled={paymentsWindowPreset !== "custom"}
                  />
                  <input
                    type="date"
                    value={paymentsCustomEndDate}
                    onChange={(event) => setPaymentsCustomEndDate(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    disabled={paymentsWindowPreset !== "custom"}
                  />
                  <select
                    value={paymentsEntityRoleFilter}
                    onChange={(event) => setPaymentsEntityRoleFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="all">Bars + Sellers</option>
                    <option value="seller">Sellers only</option>
                    <option value="bar">Bars only</option>
                  </select>
                  <select
                    value={paymentsSellerTypeFilter}
                    onChange={(event) => setPaymentsSellerTypeFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="all">All seller types</option>
                    <option value="independent">Independent sellers</option>
                    <option value="affiliated">Affiliated sellers</option>
                  </select>
                  <input
                    value={paymentsEntitySearch}
                    onChange={(event) => setPaymentsEntitySearch(event.target.value)}
                    placeholder="Search seller/bar"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{`Revenue (${paymentWindowMeta.label})`}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{formatPriceTHB(payoutIntelligenceSummary.revenueInWindow)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{`Payouts sent (${paymentWindowMeta.label})`}</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(payoutIntelligenceSummary.paidInWindow)}</div>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-amber-700">Total money owed</div>
                    <div className="mt-1 text-lg font-semibold text-amber-800">{formatPriceTHB(payoutIntelligenceSummary.owedNow)}</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-emerald-700">Payable now (&gt;= ฿100)</div>
                    <div className="mt-1 text-lg font-semibold text-emerald-800">{formatPriceTHB(payoutIntelligenceSummary.payableNow)}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {payoutIntelligenceRows.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No seller/bar records match current filters.</div>
                  ) : payoutIntelligenceRows.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-900">{row.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {row.role === "seller"
                              ? `Seller · ${row.sellerType === "affiliated" ? `Affiliated (${row.affiliatedBarId || "bar"})` : "Independent"}`
                              : `Bar · Linked sellers ${row.linkedSellerCount}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Total money owed</div>
                          <div className="text-lg font-semibold text-amber-700">{formatPriceTHB(row.owedNow)}</div>
                          {row.isBelowThreshold ? (
                            <div className="text-[11px] font-medium text-slate-500">Below ฿100 threshold</div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">Revenue (all-time): <span className="font-semibold">{formatPriceTHB(row.revenueAllTime)}</span></div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">{`Revenue (${paymentWindowMeta.label}): `}<span className="font-semibold">{formatPriceTHB(row.revenueInWindow)}</span></div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">Payouts (all-time): <span className="font-semibold">{formatPriceTHB(row.paidAllTime)}</span></div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">{`Payouts (${paymentWindowMeta.label}): `}<span className="font-semibold">{formatPriceTHB(row.paidInWindow)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                {payoutIntelligenceSummary.belowThresholdCount > 0 ? (
                  <div className="mt-3 text-xs text-slate-500">
                    {payoutIntelligenceSummary.belowThresholdCount} recipient(s) have matured unpaid balances below ฿100 threshold (not yet payable).
                  </div>
                ) : null}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Payout history</h3>
                    <p className="mt-1 text-sm text-slate-600">Filter payout records and export the current view to CSV.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadPayoutHistoryCsv(filteredPayoutHistoryRows, "filtered")}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                    >
                      Export filtered CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPayoutHistoryCsv(payoutHistoryRows, "all")}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      Export all CSV
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <select
                    value={payoutHistoryRecipientFilter}
                    onChange={(event) => setPayoutHistoryRecipientFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="all">All recipients</option>
                    <option value="seller">Seller</option>
                    <option value="bar">Bar</option>
                  </select>
                  <select
                    value={payoutHistoryStatusFilter}
                    onChange={(event) => setPayoutHistoryStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="all">All statuses</option>
                    <option value="ready">Ready</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="skipped_below_threshold">Skipped below threshold</option>
                  </select>
                  <select
                    value={payoutHistoryMonthFilter}
                    onChange={(event) => setPayoutHistoryMonthFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="all">All months</option>
                    {payoutHistoryMonthOptions.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {filteredPayoutHistoryRows.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-slate-600">No payout history matches the selected filters.</div>
                  ) : filteredPayoutHistoryRows.slice(0, 40).map((row) => (
                    <div key={row.id} className="rounded-2xl border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">{row.recipientName} ({row.recipientRole})</div>
                        <div className="text-sm font-semibold text-emerald-700">{formatPriceTHB(Number(row.netPayable || 0))}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.periodLabel} · {row.status} · {row.method || "N/A"} · Ref {row.externalReference || "N/A"}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Paid: {row.paidAt ? formatDateTimeNoSeconds(row.paidAt) : "Not paid"} · Run status: {row.runStatus}
                      </div>
                    </div>
                  ))}
                  {filteredPayoutHistoryRows.length > 40 ? (
                    <div className="text-xs text-slate-500">
                      Showing 40 of {filteredPayoutHistoryRows.length} row(s). Export CSV for the full filtered set.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Seller payout</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(splitPayoutSummary.seller)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Bar fee</div>
                  <div className="mt-1 text-lg font-semibold text-violet-700">{formatPriceTHB(splitPayoutSummary.bar)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Platform fee</div>
                  <div className="mt-1 text-lg font-semibold text-rose-700">{formatPriceTHB(splitPayoutSummary.admin)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Total distributed</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{formatPriceTHB(splitPayoutSummary.total)}</div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-base font-semibold text-slate-900">Payout money flow</h3>
                <p className="mt-1 text-sm text-slate-600">How incoming fee revenue is split and credited in wallet transactions.</p>
                <div className="mt-4 grid gap-3 lg:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Incoming buyer fees</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{formatPriceTHB(splitPayoutSummary.total)}</div>
                    <div className="mt-1 text-xs text-slate-500">From direct messages, custom requests, and seller post comments.</div>
                  </div>
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-rose-700">Split engine</div>
                    <div className="mt-1 text-sm font-semibold text-rose-800">Buyer fee to role allocation</div>
                    <div className="mt-1 text-xs text-rose-700">Each event allocates a seller payout plus bar and platform fees.</div>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-emerald-700">Seller payout wallet</div>
                    <div className="mt-1 text-sm font-semibold text-emerald-800">{formatPriceTHB(splitPayoutSummary.seller)} ({splitSellerPct}%)</div>
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-violet-700">Bar fee wallet</div>
                    <div className="mt-1 text-sm font-semibold text-violet-800">{formatPriceTHB(splitPayoutSummary.bar)} ({splitBarPct}%)</div>
                  </div>
                  <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-rose-700">Platform fee wallet</div>
                    <div className="mt-1 text-sm font-semibold text-rose-800">{formatPriceTHB(splitPayoutSummary.admin)} ({splitAdminPct}%)</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <h3 className="text-base font-semibold text-slate-900">By source</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Direct messages</span>
                      <span className="font-semibold">{formatPriceTHB(splitPayoutSummary.directMessage)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Custom requests</span>
                      <span className="font-semibold">{formatPriceTHB(splitPayoutSummary.customRequest)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                      <span>Seller post comments</span>
                      <span className="font-semibold">{formatPriceTHB(splitPayoutSummary.comment)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100 lg:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-slate-900">Recent payout split ledger</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{filteredSplitPayoutWalletRows.length} filtered · {splitPayoutWalletRows.length} total</span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <select
                      value={payoutSourceFilter}
                      onChange={(event) => setPayoutSourceFilter(event.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    >
                      <option value="all">All sources</option>
                      <option value="direct_message">Direct messages</option>
                      <option value="custom_request">Custom requests</option>
                      <option value="comment">Seller post comments</option>
                    </select>
                    <select
                      value={payoutRoleFilter}
                      onChange={(event) => setPayoutRoleFilter(event.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    >
                      <option value="all">All recipients</option>
                      <option value="seller">Seller</option>
                      <option value="bar">Bar</option>
                      <option value="admin">Platform</option>
                    </select>
                    <select
                      value={payoutDateRangeFilter}
                      onChange={(event) => setPayoutDateRangeFilter(event.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    >
                      <option value="all">All time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </select>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    {recentSplitPayoutWalletRows.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-slate-600">No payouts match the selected filters.</div>
                    ) : recentSplitPayoutWalletRows.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-slate-900">{entry.sourceLabel}</div>
                          <div className="text-sm font-semibold text-emerald-700">{formatPriceTHB(Number(entry.amount || 0))}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatDateTimeNoSeconds(entry.createdAt || Date.now())} · {(entry.recipientRole === "admin" ? "PLATFORM" : entry.recipientRole.toUpperCase())} · {entry.userName}
                        </div>
                        <div className="mt-1 text-xs text-slate-600">{entry.description || entry.type}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-base font-semibold text-slate-900">Webhook event log</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  {stripeEvents.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4">No webhook events yet.</div>
                  ) : stripeEvents.map((event) => <div key={event.id} className="rounded-2xl bg-slate-50 p-4">{event.type} · {event.stripeSessionId}</div>)}
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "email_inbox" || adminTab === "email_templates" ? (
            <div className="space-y-6">
              {adminTab === "email_inbox" ? (
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">Compose outbound email</h3>
                <p className="mt-1 text-sm text-slate-600">Send a new support or admin email directly from the dashboard via Postmark.</p>
                <p className="mt-1 text-xs text-slate-500">Sending can take 5-15 seconds. After success, check inbox plus spam/promotions for the recipient.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <select
                    value={adminEmailComposeMailbox}
                    onChange={(event) => setAdminEmailComposeMailbox(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="admin">Send from admin@ mailbox</option>
                    <option value="support">Send from support@ mailbox</option>
                  </select>
                  <input
                    value={adminEmailComposeToEmail}
                    onChange={(event) => setAdminEmailComposeToEmail(event.target.value)}
                    placeholder="Recipient email"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={adminEmailComposeToName}
                    onChange={(event) => setAdminEmailComposeToName(event.target.value)}
                    placeholder="Recipient name (optional)"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={adminEmailComposeSubject}
                    onChange={(event) => setAdminEmailComposeSubject(event.target.value)}
                    placeholder="Subject"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  value={adminEmailComposeBody}
                  onChange={(event) => setAdminEmailComposeBody(event.target.value)}
                  placeholder="Write your email..."
                  className="mt-3 min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Attachments</label>
                  <input
                    type="file"
                    multiple
                    accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,.webp,.zip"
                    onChange={async (event) => {
                      const next = await buildAttachmentPayloadsFromFileList(event.target.files);
                      setAdminEmailComposeAttachments(next);
                    }}
                    className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  {adminEmailComposeAttachments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {adminEmailComposeAttachments.map((attachment, index) => (
                        <span key={`compose_att_${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          {attachment.filename} · {Math.max(1, Math.round(Number(attachment.sizeBytes || 0) / 1024))}KB
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={adminEmailComposeSending || !adminEmailComposeCanSend}
                    onClick={async () => {
                      const recipientEmail = String(adminEmailComposeToEmail || "").trim();
                      const subject = String(adminEmailComposeSubject || "").trim();
                      const body = String(adminEmailComposeBody || "").trim();
                      if (!recipientEmail || !subject || !body) {
                        setAdminEmailComposeStatusTone("error");
                        setAdminEmailComposeStatusMessage(`Missing: ${adminEmailComposeMissingFields.join(", ")}.`);
                        return;
                      }
                      if (!recipientEmail.includes("@")) {
                        setAdminEmailComposeStatusTone("error");
                        setAdminEmailComposeStatusMessage("Please enter a valid recipient email address.");
                        return;
                      }
                      setAdminEmailComposeSending(true);
                      setAdminEmailComposeConfirmed(false);
                      setAdminEmailComposeStatusTone("neutral");
                      setAdminEmailComposeStatusMessage("Sending email via Postmark...");
                      try {
                        const result = await Promise.resolve(sendAdminEmailInboxMessage?.({
                          mailbox: adminEmailComposeMailbox,
                          toEmail: adminEmailComposeToEmail,
                          toName: adminEmailComposeToName,
                          subject: adminEmailComposeSubject,
                          body: adminEmailComposeBody,
                          attachments: adminEmailComposeAttachments,
                        }));
                        setAdminEmailComposeStatusTone(result?.ok ? "success" : "error");
                        setAdminEmailComposeConfirmed(Boolean(result?.ok));
                        setAdminEmailComposeStatusMessage(result?.ok
                          ? `Confirmed: sent to Postmark${String(adminEmailComposeToEmail || "").trim() ? ` for ${String(adminEmailComposeToEmail || "").trim()}` : ""}.`
                          : (
                            String(result?.error || "").includes("toEmail, subject, and text are required.")
                              ? "Recipient email, subject, and message body are required."
                              : (result?.error || "Could not send email.")
                          ));
                        if (result?.ok) {
                          if (result?.thread?.id) setAdminEmailSelectedThreadId(result.thread.id);
                          setAdminEmailComposeToName("");
                          setAdminEmailComposeToEmail("");
                          setAdminEmailComposeSubject("");
                          setAdminEmailComposeBody("");
                          setAdminEmailComposeAttachments([]);
                        }
                      } finally {
                        setAdminEmailComposeSending(false);
                      }
                    }}
                    className={`rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 ${(adminEmailComposeSending || !adminEmailComposeCanSend) ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {adminEmailComposeSending ? "Sending..." : (adminEmailComposeConfirmed ? "Confirmed" : "Send email")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminEmailComposeToName("");
                      setAdminEmailComposeToEmail("");
                      setAdminEmailComposeSubject("");
                      setAdminEmailComposeBody("");
                      setAdminEmailComposeAttachments([]);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Clear
                  </button>
                </div>
                {adminEmailComposeStatusMessage ? (
                  <div className={`mt-3 text-xs font-medium ${adminEmailComposeStatusTone === "error" ? "text-rose-700" : adminEmailComposeStatusTone === "success" ? "text-emerald-700" : "text-slate-600"}`}>
                    {adminEmailComposeStatusMessage}
                  </div>
                ) : null}
                {!adminEmailComposeCanSend ? (
                  <div className="mt-2 text-xs text-slate-500">To enable send: {adminEmailComposeMissingFields.join(", ")}.</div>
                ) : null}
              </div>
              ) : null}
              {adminTab === "email_inbox" ? (
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Shared email inbox</h3>
                    <p className="mt-1 text-sm text-slate-600">Manage inbound and outbound conversations for support and admin mailboxes.</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setAdminEmailLoading(true);
                      setAdminEmailActionMessage("");
                      const result = await Promise.resolve(refreshAdminEmailInbox?.({
                        mailbox: adminEmailMailboxFilter,
                        status: adminEmailStatusFilter,
                        search: adminEmailSearch
                      }));
                      setAdminEmailActionMessage(result?.ok ? `Inbox refreshed (${result?.count || 0} thread(s)).` : (result?.error || "Could not refresh inbox."));
                      setAdminEmailLoading(false);
                    }}
                    className={`rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 ${adminEmailLoading ? "cursor-not-allowed opacity-60" : ""}`}
                    disabled={adminEmailLoading}
                  >
                    {adminEmailLoading ? "Refreshing..." : "Refresh inbox"}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <input
                    value={adminEmailSearch}
                    onChange={(event) => setAdminEmailSearch(event.target.value)}
                    placeholder="Search sender, subject, body"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                  />
                  <select
                    value={adminEmailMailboxFilter}
                    onChange={(event) => setAdminEmailMailboxFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="all">All mailboxes</option>
                    <option value="support">support@ mailbox</option>
                    <option value="admin">admin@ mailbox</option>
                  </select>
                  <select
                    value={adminEmailStatusFilter}
                    onChange={(event) => setAdminEmailStatusFilter(event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="active">Active (Open + Waiting)</option>
                    <option value="all">All statuses</option>
                    <option value="open">Open</option>
                    <option value="pending_customer">Waiting for customer</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-800">Inbound webhook health</div>
                      <button
                        type="button"
                        onClick={async () => {
                          setAdminEmailInboxHealthLoading(true);
                          const result = await Promise.resolve(getAdminEmailInboxHealth?.());
                          if (result?.ok) {
                            setAdminEmailInboxHealth(result.health || null);
                          }
                          setAdminEmailInboxHealthLoading(false);
                        }}
                        className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        {adminEmailInboxHealthLoading ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Last event: {adminEmailInboxHealth?.lastWebhookAt ? formatDateTimeNoSeconds(adminEmailInboxHealth.lastWebhookAt) : "No webhook events yet."}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">ok: {Number(adminEmailInboxHealth?.totals?.ok || 0)}</span>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">duplicate: {Number(adminEmailInboxHealth?.totals?.duplicate || 0)}</span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">error: {Number(adminEmailInboxHealth?.totals?.error || 0)}</span>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700">denied: {Number(adminEmailInboxHealth?.totals?.denied || 0)}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-800">Suppression list</div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <input
                        value={adminEmailSuppressionEmailDraft}
                        onChange={(event) => setAdminEmailSuppressionEmailDraft(event.target.value)}
                        placeholder="email@example.com"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        value={adminEmailSuppressionReasonDraft}
                        onChange={(event) => setAdminEmailSuppressionReasonDraft(event.target.value)}
                        placeholder="Reason (optional)"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await Promise.resolve(addAdminEmailSuppression?.(adminEmailSuppressionEmailDraft, adminEmailSuppressionReasonDraft));
                          if (result?.ok) {
                            setAdminEmailSuppressionEmailDraft("");
                            setAdminEmailSuppressionReasonDraft("");
                            const refreshed = await Promise.resolve(listAdminEmailSuppressions?.());
                            if (refreshed?.ok) setAdminEmailSuppressions(refreshed.suppressions || []);
                            setAdminEmailActionMessage("Suppression saved.");
                          } else {
                            setAdminEmailActionMessage(result?.error || "Could not save suppression.");
                          }
                        }}
                        className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                      >
                        Suppress
                      </button>
                    </div>
                    <div className="mt-2 max-h-[120px] space-y-1 overflow-auto text-xs text-slate-700">
                      {adminEmailSuppressionsLoading ? (
                        <div>Loading suppressions...</div>
                      ) : (adminEmailSuppressions || []).length === 0 ? (
                        <div>No suppressions.</div>
                      ) : (adminEmailSuppressions || []).map((entry) => (
                        <div key={entry.id || entry.email} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1">
                          <div className="truncate">{entry.email} {entry.reason ? `· ${entry.reason}` : ""}</div>
                          <button
                            type="button"
                            onClick={async () => {
                              const result = await Promise.resolve(removeAdminEmailSuppression?.(entry.email));
                              if (result?.ok) {
                                setAdminEmailSuppressions((prev) => (prev || []).filter((row) => String(row?.email || "").toLowerCase() !== String(entry.email || "").toLowerCase()));
                                setAdminEmailActionMessage(`Removed suppression for ${entry.email}.`);
                              } else {
                                setAdminEmailActionMessage(result?.error || "Could not remove suppression.");
                              }
                            }}
                            className="rounded-lg border border-slate-300 px-2 py-0.5 font-semibold text-slate-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {adminEmailActionMessage ? <div className="mt-2 text-xs font-medium text-emerald-700">{adminEmailActionMessage}</div> : null}
                <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
                  <div className="max-h-[420px] overflow-auto rounded-2xl border border-rose-100">
                    {(filteredAdminEmailThreads || []).length === 0 ? (
                      <div className="p-4 text-sm text-slate-600">No inbox threads match current filters.</div>
                    ) : (filteredAdminEmailThreads || []).map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          setAdminEmailSelectedThreadId(thread.id);
                          setAdminEmailReplySubject(String(thread.lastSubject || "Re: Message").trim() || "Re: Message");
                          setAdminEmailReplyBody("");
                          setAdminEmailActionMessage("");
                        }}
                        className={`w-full border-b border-rose-50 px-3 py-3 text-left text-sm ${selectedAdminEmailThread?.id === thread.id ? "bg-rose-50" : "bg-white hover:bg-slate-50"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-800">{thread.participantName || thread.participantEmail || "Unknown sender"}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${thread.mailbox === "support" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"}`}>
                            {thread.mailbox === "support" ? "support@" : "admin@"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">{thread.participantEmail || "No sender email"}</div>
                        <div className="mt-1 text-xs font-medium text-slate-700">{thread.lastSubject || "(No subject)"}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-slate-600">{thread.lastSnippet || "No body preview"}</div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{getAdminEmailStatusLabel(thread.status)}</span>
                          <span>{formatDateTimeNoSeconds(thread.lastMessageAt || thread.createdAt || Date.now())}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-rose-100 p-4">
                    {!selectedAdminEmailThread ? (
                      <div className="text-sm text-slate-600">Select a thread to read and reply.</div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-base font-semibold text-slate-900">{selectedAdminEmailThread.lastSubject || "(No subject)"}</div>
                            <div className="mt-1 text-sm text-slate-600">{selectedAdminEmailThread.participantName || selectedAdminEmailThread.participantEmail} · {selectedAdminEmailThread.participantEmail}</div>
                          </div>
                          <select
                            value={normalizeAdminEmailStatus(selectedAdminEmailThread.status)}
                            onChange={async (event) => {
                              const result = await Promise.resolve(updateAdminEmailThreadStatus?.(selectedAdminEmailThread.id, event.target.value));
                              setAdminEmailActionMessage(result?.ok ? "Thread status updated." : (result?.error || "Could not update status."));
                            }}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="open">Open</option>
                            <option value="pending_customer">Waiting for customer</option>
                            <option value="archived">Archived</option>
                          </select>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (!selectedAdminEmailThread?.id) return;
                                const result = await Promise.resolve(updateAdminEmailThreadStatus?.(selectedAdminEmailThread.id, "archived"));
                                setAdminEmailActionMessage(result?.ok ? "Thread archived." : (result?.error || "Could not archive thread."));
                              }}
                              className="rounded-xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700"
                            >
                              Archive thread
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!selectedAdminEmailThread?.id) return;
                                const confirmed = window.confirm("Delete this thread and all messages permanently?");
                                if (!confirmed) return;
                                const deletingThreadId = selectedAdminEmailThread.id;
                                const result = await Promise.resolve(deleteAdminEmailThread?.(deletingThreadId));
                                if (result?.ok) {
                                  const nextThread = (filteredAdminEmailThreads || []).find((entry) => entry.id !== deletingThreadId);
                                  setAdminEmailSelectedThreadId(nextThread?.id || "");
                                }
                                setAdminEmailActionMessage(result?.ok ? "Thread deleted." : (result?.error || "Could not delete thread."));
                              }}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                            >
                              Delete thread
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[260px] space-y-2 overflow-auto rounded-xl bg-slate-50 p-3">
                          {(selectedAdminEmailThreadMessages || []).length === 0 ? (
                            <div className="text-sm text-slate-500">No messages loaded yet.</div>
                          ) : (selectedAdminEmailThreadMessages || []).map((message) => (
                            <div key={message.id} className={`rounded-xl px-3 py-2 text-sm ${message.direction === "outbound" ? "bg-rose-100 text-rose-900" : "bg-white text-slate-800"}`}>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {message.direction === "outbound"
                                  ? "Admin · admin@thailandpanties.com"
                                  : "Customer"} · {formatDateTimeNoSeconds(message.createdAt || Date.now())}
                              </div>
                              <div className="mt-1 whitespace-pre-wrap">{message.text || "(No plain-text body)"}</div>
                              {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {message.attachments.map((attachment, index) => (
                                    <button
                                      key={`${message.id}_att_${index}`}
                                      type="button"
                                      onClick={async () => {
                                        if (!selectedAdminEmailThread?.id || !message?.id || !attachment?.id) return;
                                        const result = await Promise.resolve(
                                          downloadAdminEmailAttachment?.(
                                            selectedAdminEmailThread.id,
                                            message.id,
                                            attachment.id,
                                            attachment.filename || `attachment-${index + 1}`
                                          )
                                        );
                                        if (!result?.ok) {
                                          setAdminEmailActionMessage(result?.error || "Could not download attachment.");
                                        }
                                      }}
                                      className={`rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-700 underline-offset-2 hover:underline ${attachment?.hasContent === false ? "opacity-60" : ""}`}
                                      disabled={attachment?.hasContent === false}
                                      title={attachment?.hasContent === false
                                        ? (
                                          attachment?.blockedReason
                                            ? `Attachment blocked: ${String(attachment.blockedReason).replaceAll("_", " ")}`
                                            : "Attachment metadata retained, content unavailable."
                                        )
                                        : "Download attachment"}
                                    >
                                      {attachment.filename || `Attachment ${index + 1}`}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                              {message.delivery ? (
                                <div className="mt-2 text-[11px] text-slate-600">
                                  Delivery: {message.delivery.status || "unknown"}{message.delivery.reason ? ` · ${message.delivery.reason}` : ""}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                          <div className="text-sm font-semibold text-slate-800">Reply</div>
                          <input
                            value={adminEmailReplySubject}
                            onChange={(event) => setAdminEmailReplySubject(event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Reply subject"
                          />
                          <textarea
                            value={adminEmailReplyBody}
                            onChange={(event) => setAdminEmailReplyBody(event.target.value)}
                            className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Write your reply..."
                          />
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Reply attachments</label>
                            <input
                              type="file"
                              multiple
                              accept=".txt,.csv,.pdf,.jpg,.jpeg,.png,.webp,.zip"
                              onChange={async (event) => {
                                const next = await buildAttachmentPayloadsFromFileList(event.target.files);
                                setAdminEmailReplyAttachments(next);
                              }}
                              className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            />
                            {adminEmailReplyAttachments.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {adminEmailReplyAttachments.map((attachment, index) => (
                                  <span key={`reply_att_${index}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                    {attachment.filename} · {Math.max(1, Math.round(Number(attachment.sizeBytes || 0) / 1024))}KB
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const result = await Promise.resolve(sendAdminEmailThreadReply?.(selectedAdminEmailThread.id, {
                                  mailbox: selectedAdminEmailThread.mailbox || "admin",
                                  toEmail: selectedAdminEmailThread.participantEmail || "",
                                  toName: selectedAdminEmailThread.participantName || "",
                                  subject: adminEmailReplySubject,
                                  body: adminEmailReplyBody,
                                  attachments: adminEmailReplyAttachments
                                }));
                                setAdminEmailActionMessage(result?.ok ? (result?.message || "Reply sent.") : (result?.error || "Could not send reply."));
                                if (result?.ok) {
                                  setAdminEmailReplyBody("");
                                  setAdminEmailReplyAttachments([]);
                                  await Promise.resolve(fetchAdminEmailThreadMessages?.(selectedAdminEmailThread.id));
                                }
                              }}
                              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700"
                            >
                              Send reply
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdminEmailReplyBody("");
                                setAdminEmailReplyAttachments([]);
                              }}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ) : null}
              {adminTab === "email_templates" ? (
              <>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">Email notification templates</h3>
                <p className="mt-2 text-sm text-slate-600">Edit subjects, body copy, and target links for system emails sent to buyers and sellers.</p>
                <p className="mt-1 text-sm text-slate-600">Tip: choose a template on the left, edit content in the center, and confirm output in live preview.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-2xl bg-slate-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-600">Templates</div><div className="mt-1 text-lg font-semibold text-slate-800">{emailTemplateHealth.total}</div></div>
                  <div className="rounded-2xl bg-emerald-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-emerald-700">Enabled</div><div className="mt-1 text-lg font-semibold text-emerald-700">{emailTemplateHealth.enabled}</div></div>
                  <div className="rounded-2xl bg-slate-100 p-3"><div className="text-xs uppercase tracking-[0.12em] text-slate-700">Disabled</div><div className="mt-1 text-lg font-semibold text-slate-700">{emailTemplateHealth.disabled}</div></div>
                  <div className="rounded-2xl bg-amber-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-amber-700">Queue depth</div><div className="mt-1 text-lg font-semibold text-amber-700">{emailTemplateHealth.queuedCount}</div></div>
                  <div className="rounded-2xl bg-rose-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-rose-700">Failed (7d)</div><div className="mt-1 text-lg font-semibold text-rose-700">{emailTemplateHealth.failed7d}</div></div>
                  <div className="rounded-2xl bg-sky-50 p-3"><div className="text-xs uppercase tracking-[0.12em] text-sky-700">Tests sent (7d)</div><div className="mt-1 text-lg font-semibold text-sky-700">{emailTemplateHealth.tests7d}</div></div>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Last template edit: {emailTemplateHealth.lastEditedAt ? formatDateTimeNoSeconds(emailTemplateHealth.lastEditedAt) : "No template edits recorded yet."}
                </div>
                {emailTemplateActionMessage ? <div className="mt-3 text-xs font-medium text-emerald-700">{emailTemplateActionMessage}</div> : null}
                <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
                  <div className="rounded-2xl border border-rose-100 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Email types</div>
                    <div className="mt-3 space-y-3">
                      {emailTemplatesList.map((template) => (
                        <button
                          key={template.key}
                          onClick={() => setSelectedEmailTemplateKey(template.key)}
                          className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${effectiveSelectedEmailTemplateKey === template.key ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rose-100 text-slate-700"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold">{template.name}</div>
                            {hasUnsavedTemplateChanges(template) ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Unsaved</span>
                            ) : null}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-600">{template.audience}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {!activeEmailTemplate || !activeEmailDraft ? (
                      <div className="rounded-2xl border border-rose-100 p-4 text-sm text-slate-600">Select an email template to edit.</div>
                    ) : (
                      <>
                        <div className="rounded-2xl border border-rose-100 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{activeEmailTemplate.name}</div>
                              <div className="mt-1 text-xs text-slate-500">{activeEmailTemplate.key} · Audience: {activeEmailTemplate.audience}</div>
                            </div>
                            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={activeEmailDraft.enabled !== false}
                                onChange={(event) => setEmailTemplateDrafts((prev) => ({
                                  ...prev,
                                  [activeEmailTemplate.key]: { ...activeEmailDraft, enabled: event.target.checked },
                                }))}
                              />
                              Enabled
                            </label>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="text-sm text-slate-700">
                              Subject
                              <input
                                value={activeEmailDraft.subject || ""}
                                onChange={(event) => setEmailTemplateDrafts((prev) => ({
                                  ...prev,
                                  [activeEmailTemplate.key]: { ...activeEmailDraft, subject: event.target.value },
                                }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              />
                            </label>
                            <label className="text-sm text-slate-700">
                              Button label
                              <input
                                value={activeEmailDraft.ctaLabel || ""}
                                onChange={(event) => setEmailTemplateDrafts((prev) => ({
                                  ...prev,
                                  [activeEmailTemplate.key]: { ...activeEmailDraft, ctaLabel: event.target.value },
                                }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              />
                            </label>
                          </div>
                          <label className="mt-3 block text-sm text-slate-700">
                            Deep link path (for example: /account or /custom-requests)
                            <input
                              value={activeEmailDraft.ctaPath || ""}
                              onChange={(event) => setEmailTemplateDrafts((prev) => ({
                                ...prev,
                                [activeEmailTemplate.key]: { ...activeEmailDraft, ctaPath: event.target.value },
                              }))}
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="text-sm text-slate-700">
                              Variant tone
                              <div className="mt-1 flex gap-2">
                                <select
                                  value={emailToneByTemplateKey[activeEmailTemplate.key] || "premium"}
                                  onChange={(event) => setEmailToneByTemplateKey((prev) => ({
                                    ...prev,
                                    [activeEmailTemplate.key]: event.target.value,
                                  }))}
                                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                >
                                  {(EMAIL_TONE_VARIANTS_BY_TEMPLATE[activeEmailTemplate.key] || []).map((variant) => (
                                    <option key={variant.id} value={variant.id}>{variant.label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => {
                                    const variantId = emailToneByTemplateKey[activeEmailTemplate.key] || "premium";
                                    const variant = (EMAIL_TONE_VARIANTS_BY_TEMPLATE[activeEmailTemplate.key] || []).find((entry) => entry.id === variantId);
                                    if (!variant) return;
                                    setEmailTemplateDrafts((prev) => ({
                                      ...prev,
                                      [activeEmailTemplate.key]: {
                                        ...activeEmailDraft,
                                        subject: variant.subject,
                                        body: variant.body,
                                        ctaLabel: variant.ctaLabel || activeEmailDraft.ctaLabel,
                                      },
                                    }));
                                    setEmailTemplateActionMessage(`Applied ${variant.label} tone to ${activeEmailTemplate.name}.`);
                                  }}
                                  className="rounded-xl border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700"
                                >
                                  Apply
                                </button>
                              </div>
                            </label>
                            <label className="text-sm text-slate-700">
                              Test scenario
                              <select
                                value={activeEmailScenario}
                                onChange={(event) => setEmailTemplateScenarioByKey((prev) => ({
                                  ...prev,
                                  [activeEmailTemplate.key]: event.target.value,
                                }))}
                              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              >
                                {emailTestScenarioOptions.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label className="mt-3 block text-sm text-slate-700">
                            Body (supports placeholders like {"{{recipientName}}"}, {"{{actionUrl}}"}, {"{{senderName}}"}, {"{{requestId}}"}, {"{{requestStatus}}"}, {"{{walletBalance}}"})
                            <textarea
                              value={activeEmailDraft.body || ""}
                              onChange={(event) => setEmailTemplateDrafts((prev) => ({
                                ...prev,
                                [activeEmailTemplate.key]: { ...activeEmailDraft, body: event.target.value },
                              }))}
                              className="mt-1 min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => updateEmailTemplate(activeEmailTemplate.key, activeEmailDraft)}
                              className="rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700"
                            >
                              Save template
                            </button>
                            <button
                              onClick={async () => {
                                setSendingTestTemplateKey(activeEmailTemplate.key);
                                setEmailTemplateActionMessage("");
                                const result = await sendTestEmailTemplate(activeEmailTemplate.key, activeEmailDraft, activeEmailScenario);
                                setEmailTemplateActionMessage(result.ok ? (result.message || "Test email sent.") : (result.error || "Could not send test email."));
                                setSendingTestTemplateKey(null);
                              }}
                              disabled={sendingTestTemplateKey === activeEmailTemplate.key}
                              className={`rounded-xl border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-700 ${sendingTestTemplateKey === activeEmailTemplate.key ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              {sendingTestTemplateKey === activeEmailTemplate.key ? "Sending test..." : "Send test email"}
                            </button>
                            <button
                              onClick={() => {
                                resetEmailTemplate(activeEmailTemplate.key);
                                setEmailTemplateDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[activeEmailTemplate.key];
                                  return next;
                                });
                              }}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                            >
                              Reset default
                            </button>
                          </div>
                        </div>
                        <div className="rounded-2xl border border-rose-100 p-4">
                          <div className="text-sm font-semibold text-slate-800">Live preview</div>
                          <div className="mt-1 text-sm text-slate-600">Scenario: {emailTestScenarioOptions.find((item) => item.value === activeEmailScenario)?.label || activeEmailScenario}</div>
                          {(() => {
                            const path = String(activeEmailDraft.ctaPath || "/account");
                            const normalizedPath = path.startsWith("/") ? path : `/${path}`;
                            const actionUrl = `https://thailandpanties.com${normalizedPath}`;
                            const previewVars = {
                              ...(emailPreviewVarsByScenario[activeEmailScenario] || emailPreviewVarsByScenario.default),
                              actionPath: normalizedPath,
                              actionUrl,
                            };
                            const previewSubject = renderTemplateWithVars(activeEmailDraft.subject || "", previewVars);
                            const previewBody = renderTemplateWithVars(activeEmailDraft.body || "", previewVars);
                            return (
                              <div className="mt-3 space-y-2">
                                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-semibold">Subject:</span> {previewSubject}</div>
                                <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-wrap">{previewBody}</div>
                                <div className="text-sm text-rose-700">Action URL: {actionUrl}</div>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">Recent email queue</h3>
                <div className="mt-4 space-y-4">
                  {(emailDeliveryLog || []).length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No email events queued yet.</div>
                  ) : (emailDeliveryLog || []).slice(0, 25).map((email) => (
                    <div key={email.id} className="rounded-2xl border border-rose-100 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-800">{email.subject}</div>
                        <div className="text-sm text-slate-600">{formatDateTimeNoSeconds(email.createdAt || Date.now())}</div>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">To: {email.toName || "User"} ({email.toEmail}) · Template: {email.templateKey} · Status: {email.status || "queued"}</div>
                      {email.testScenario ? <div className="mt-1 text-sm text-slate-600">Test scenario: {email.testScenario}</div> : null}
                      {email.deliveryMode ? <div className="mt-1 text-sm text-slate-600">Mode: {email.deliveryMode}</div> : null}
                      {email.lastError ? <div className="mt-1 text-sm text-rose-700">Error: {email.lastError}</div> : null}
                      <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700 whitespace-pre-wrap">{email.body}</div>
                      <div className="mt-2 text-sm text-rose-700">Link: {email.actionUrl}</div>
                    </div>
                  ))}
                </div>
              </div>
              </>
              ) : null}
            </div>
          ) : null}

          {adminTab === "gifts" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Gift Catalog</h3>
                <p className="mt-1 text-sm text-slate-500">Manage prices and availability for all gift types.</p>
                <div className="mt-4 space-y-3">
                  {(giftCatalog || []).map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-4">
                      <div className="flex-1 min-w-[120px]">
                        <span className="font-semibold">{item.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{item.fulfillmentType}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-slate-500">฿</span>
                        <input
                          type="number"
                          min="1"
                          className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                          defaultValue={item.price}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0 && val !== item.price) updateGiftCatalogItem(item.id, { price: val });
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateGiftCatalogItem(item.id, { isActive: !item.isActive })}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${item.isActive ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {item.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </div>
                  ))}
                  {(!giftCatalog || giftCatalog.length === 0) && <p className="text-sm text-slate-400">Default catalog will be used (Rose, Dozen Roses, Chocolate, Drink).</p>}
                </div>
              </div>
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Gift Purchases</h3>
                <p className="mt-1 text-sm text-slate-500">{(giftPurchases || []).length} total purchases</p>
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  {(giftPurchases || []).slice(0, 50).map((purchase) => (
                    <div key={purchase.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm">
                      <div>
                        <span className="font-medium">{purchase.giftType}</span>
                        <span className="ml-2 text-slate-500">{formatPriceTHB(purchase.price)}</span>
                        <span className="ml-2 text-xs text-slate-400">{purchase.isAnonymous ? 'Anonymous' : purchase.buyerId}</span>
                        <span className="ml-1 text-xs text-slate-400">→ {purchase.sellerId}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${purchase.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{purchase.status}</span>
                    </div>
                  ))}
                  {(!giftPurchases || giftPurchases.length === 0) && <p className="text-sm text-slate-400">No gift purchases yet.</p>}
                </div>
              </div>
              <div className="rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Fulfillment Tasks</h3>
                <p className="mt-1 text-sm text-slate-500">{(giftFulfillmentTasks || []).length} total tasks</p>
                <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                  {(giftFulfillmentTasks || []).slice(0, 50).map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-sm">
                      <div>
                        <span className="font-medium">{task.taskType}</span>
                        <span className="ml-2 text-xs text-slate-400">{task.assigneeType === 'bar' ? `Bar: ${task.barId}` : `Seller: ${task.sellerId}`}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${task.status === 'pending' ? 'bg-amber-50 text-amber-700' : task.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{task.status}</span>
                    </div>
                  ))}
                  {(!giftFulfillmentTasks || giftFulfillmentTasks.length === 0) && <p className="text-sm text-slate-400">No fulfillment tasks yet.</p>}
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "cms" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lg:col-span-2 rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">CMS reference</h3>
                <p className="mt-1 text-sm text-slate-700">Use this section as a schema and route reference while editing content or planning navigation.</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-3"><Database className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">Content data model</h3></div>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{JSON.stringify(CMS_SCHEMA, null, 2)}</pre>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-3"><LayoutDashboard className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">Route map</h3></div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div>/</div>
                  <div>/product/:slug</div>
                  <div>/seller/:id</div>
                  <div>/bar/:id</div>
                  <div>/bars</div>
                  <div>/stories</div>
                  <div>/seller-portfolios</div>
                  <div>/checkout</div>
                  <div>/checkout/success</div>
                  <div>/account</div>
                  <div>/seller-dashboard</div>
                  <div>/bar-dashboard</div>
                  <div>/admin</div>
                  <div>/privacy-policy</div>
                  <div>/terms</div>
                  <div>/shipping-policy</div>
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "auth" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lg:col-span-2 rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Seller approval queue</h3>
                <p className="mt-1 text-sm text-slate-700">Review pending applications in order, then approve or reject with one click.</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-3"><Lock className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">Access and approval model</h3></div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4">User roles define access permissions.</div>
                  <div className="rounded-2xl bg-slate-50 p-4">Buyer accounts are active immediately after signup.</div>
                  <div className="rounded-2xl bg-slate-50 p-4">Seller accounts require admin approval before activation.</div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-500">Pending seller approvals</h4>
                    {pendingSellerCount > 0 ? (
                      <button onClick={approveAllPendingSellers} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve all ({pendingSellerCount})</button>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select value={adminSellerReviewFilter} onChange={(event) => setAdminSellerReviewFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="pending">Pending</option>
                      <option value="approved_today">Approved today</option>
                      <option value="rejected">Rejected</option>
                      <option value="all">All sellers</option>
                    </select>
                    {adminAuthActionMessage ? <div className="text-sm font-medium text-emerald-700">{adminAuthActionMessage}</div> : null}
                  </div>
                  <div className="mt-3 space-y-3">
                    {adminSellerReviewItems.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No seller applications in this filter.</div>
                    ) : adminSellerReviewItems.map((user) => {
                      const sellerRecord = (sellers || []).find((s) => s.id === user.sellerId);
                      const pendingAffiliation = (barAffiliationRequests || []).find(
                        (r) => r.status === "pending" && r.sellerId === (sellerRecord?.id || user.sellerId)
                      );
                      const approvedAffiliation = (barAffiliationRequests || []).find(
                        (r) => r.status === "approved" && r.sellerId === (sellerRecord?.id || user.sellerId)
                      );
                      const affiliatedBar = approvedAffiliation
                        ? (bars || []).find((b) => b.id === approvedAffiliation.barId)
                        : (sellerRecord?.affiliatedBarId ? (bars || []).find((b) => b.id === sellerRecord.affiliatedBarId) : null);
                      const pendingBar = pendingAffiliation
                        ? (bars || []).find((b) => b.id === pendingAffiliation.barId)
                        : null;
                      return (
                      <div key={user.id} className="rounded-2xl border border-rose-100 p-4">
                        <div className="font-semibold">{user.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{user.email}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          Requested: {formatDateTimeNoSeconds(user.sellerApplicationAt || Date.now())}
                          {" · "}
                          Status: {user.accountStatus || "active"}
                          {" · "}
                          Age: {Math.max(0, Math.floor((Date.now() - new Date(user.sellerApplicationAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))} day(s)
                        </div>
                        {pendingAffiliation ? (
                          <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                            <span>Pending bar application: {pendingBar?.name || pendingAffiliation.barId}</span>
                          </div>
                        ) : affiliatedBar ? (
                          <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                            <span>Affiliated with: {affiliatedBar.name}</span>
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {user.accountStatus !== "active" ? (
                            <button onClick={() => approveSellerAccount(user.id)} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                              Approve seller
                            </button>
                          ) : null}
                          {user.accountStatus === "pending" ? (
                            <button onClick={() => rejectSellerAccount(user.id)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">
                              Reject
                            </button>
                          ) : null}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-3"><LogOut className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">User snapshot</h3></div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  {users.map((user) => <div key={user.id} className="rounded-2xl bg-slate-50 p-4">{user.name} · {user.email} · {user.role}{user.accountStatus === "pending" ? " · pending approval" : ""}</div>)}
                </div>
                <h4 className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-rose-500">Recent admin actions</h4>
                <div className="mt-3 space-y-3">
                  {adminActions.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">No admin actions recorded yet.</div>
                  ) : adminActions.slice(-6).reverse().map((action) => (
                    <div key={action.id} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                      {action.type} · {action.targetUserId} · {formatDateTimeNoSeconds(action.createdAt || Date.now())}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {adminTab === "deployment" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lg:col-span-2 rounded-3xl border border-rose-100 bg-white p-5">
                <h3 className="text-lg font-semibold text-slate-900">Deployment reference</h3>
                <p className="mt-1 text-sm text-slate-700">Architecture and SEO guidance for production rollout and migration planning.</p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-3"><LayoutDashboard className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">Deployment architecture</h3></div>
                <p className="mt-3 text-sm leading-7 text-slate-600">Reference deployment structure for a Next.js App Router implementation, including pages, API routes, shared libraries, and environment configuration.</p>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-50 p-4 text-xs text-slate-700">{JSON.stringify(NEXTJS_EXPORT_BLUEPRINT, null, 2)}</pre>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-3"><Database className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">SEO metadata</h3></div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Title:</span> {SEO_CONFIG.title}</div>
                  <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Description:</span> {SEO_CONFIG.description}</div>
                  <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Open Graph Image:</span> {SEO_CONFIG.ogImage}</div>
                  <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">Production suggestion:</span> Move this metadata into Next.js route metadata exports in app/layout.tsx and key route files.</div>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">PromptPay receiver</h3></div>
                <p className="mt-3 text-sm leading-7 text-slate-600">Set the PromptPay mobile number used to generate buyer top-up QR codes.</p>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  PromptPay mobile (Thailand)
                  <input
                    type="text"
                    value={promptPayReceiverDraft}
                    onChange={(event) => {
                      setPromptPayReceiverMessage("");
                      setPromptPayReceiverDraft(event.target.value);
                    }}
                    placeholder="0812345678"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const sanitized = String(promptPayReceiverDraft || "").replace(/[^\d+]/g, "").trim();
                      if (!sanitized) {
                        setPromptPayReceiverMessage("Enter a PromptPay mobile number.");
                        return;
                      }
                      const result = await Promise.resolve(updatePromptPayReceiverMobile?.(sanitized));
                      setPromptPayReceiverMessage(result?.message || result?.error || "PromptPay receiver saved.");
                    }}
                    className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                  >
                    Save PromptPay receiver
                  </button>
                  {promptPayReceiverMessage ? (
                    <div className="text-sm font-medium text-emerald-700">{promptPayReceiverMessage}</div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <div className="fixed inset-x-0 bottom-3 z-30 px-3 lg:hidden">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-4 gap-2 rounded-2xl border border-rose-200 bg-white p-2 shadow-lg">
              {canAccessAdminTab("overview") ? <button onClick={() => setAdminTab("overview")} className={`min-h-[44px] rounded-xl border px-2.5 py-2.5 text-sm font-semibold ${adminTab === "overview" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rose-200 text-rose-700"}`}>{adminMobileNavText.overview}</button> : null}
              {canAccessAdminTab("inbox") ? <button onClick={() => setAdminTab("inbox")} className={`min-h-[44px] rounded-xl border px-2.5 py-2.5 text-sm font-semibold ${adminTab === "inbox" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rose-200 text-rose-700"}`}>{adminMobileNavText.inbox}</button> : null}
              {canAccessAdminTab("auth") ? <button onClick={() => setAdminTab("auth")} className={`min-h-[44px] rounded-xl border px-2.5 py-2.5 text-sm font-semibold ${adminTab === "auth" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rose-200 text-rose-700"}`}>{adminMobileNavText.approvals}</button> : null}
              {canAccessAdminTab("payments") ? <button onClick={() => setAdminTab("payments")} className={`min-h-[44px] rounded-xl border px-2.5 py-2.5 text-sm font-semibold ${adminTab === "payments" ? "border-rose-300 bg-rose-50 text-rose-700" : "border-rose-200 text-rose-700"}`}>{adminMobileNavText.payments}</button> : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function WalletTopUpModal({ open, draftAmount, setDraftAmount, paymentError, setPaymentError, walletStatus, exchangeRate, formatPriceTHB, formatUsdFromThb, onSubmit, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Top up wallet</h4>
            <p className="mt-1 text-sm text-slate-600">Confirm the amount, then proceed to our secure payment page.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-700"
            aria-label="Close top-up modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top-up amount (THB)</label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-sm font-semibold text-slate-500">฿</span>
            <input
              type="number"
              min={MIN_WALLET_TOP_UP_THB}
              step="1"
              value={draftAmount}
              onChange={(event) => {
                setPaymentError("");
                setDraftAmount(event.target.value);
              }}
              className="w-full rounded-2xl border border-slate-200 py-2 pl-8 pr-4 text-sm"
            />
          </div>
          <div className="mt-1 text-xs text-slate-500">Minimum top-up is {formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.{formatUsdFromThb(Number(draftAmount || 0)) ? <> Your card will be charged <span className="font-semibold">{formatUsdFromThb(Number(draftAmount || 0))}</span>.</> : null}</div>
          {exchangeRate ? <div className="mt-1 text-[11px] text-slate-400">Card charges are processed in USD at the current exchange rate.</div> : null}
        </div>
        <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
          You will be redirected to a secure payment page to enter your card details. After payment, you will be returned here automatically.
        </div>
        {paymentError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {paymentError}
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={walletStatus === "processing"}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {walletStatus === "processing" ? "Processing..." : "Continue to payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckoutPage({
  setCheckoutAuthModalOpen,
  currentUser,
  checkoutStep,
  setCheckoutStep,
  buyerEmail,
  setBuyerEmail,
  checkoutForm,
  shippingCountryOptions,
  updateCheckoutField,
  currentWalletBalance,
  runWalletCheckout,
  checkoutError,
  cartItems,
  sellerMap,
  removeFromCart,
  onContinueShopping,
  checkoutBundleSuggestion,
  onExploreBundle,
  onAddBundleFromCheckout,
  subtotal,
  shippingRates,
  shippingZoneLabel,
  shippingSupported,
  shippingFee,
  shippingStandardDays,
  shippingExpressDays,
  onMoreShipping,
  total,
  checkoutAuthModalOpen,
  onOpenLogin,
  onOpenRegister,
  onOpenWalletTopUp,
  runWalletTopUp,
  walletStatus,
  exchangeRate
}) {
  const [attemptedStepOneContinue, setAttemptedStepOneContinue] = useState(false);
  const [attemptedStepTwoContinue, setAttemptedStepTwoContinue] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const [shakeCountry, setShakeCountry] = useState(false);
  const [shakeAddress, setShakeAddress] = useState(false);
  const [shakeCity, setShakeCity] = useState(false);
  const [shakeRegion, setShakeRegion] = useState(false);
  const [shakePostalCode, setShakePostalCode] = useState(false);
  const stepOneEmailRef = useRef(null);
  const stepOneNameRef = useRef(null);
  const stepTwoCountryRef = useRef(null);
  const stepTwoCityRef = useRef(null);
  const stepTwoRegionRef = useRef(null);
  const stepTwoPostalCodeRef = useRef(null);
  const stepTwoAddressRef = useRef(null);
  const triggerShake = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 380);
  };
  const trimmedEmail = String(buyerEmail || "").trim();
  const trimmedFullName = String(checkoutForm.fullName || "").trim();
  const trimmedAddress = String(checkoutForm.address || "").trim();
  const trimmedCity = String(checkoutForm.city || "").trim();
  const trimmedRegion = String(checkoutForm.region || "").trim();
  const trimmedCountry = String(checkoutForm.country || "").trim();
  const countryDisplayName = shippingCountryOptions.find((c) => c.code === trimmedCountry)?.name || trimmedCountry;
  const trimmedPostalCode = String(checkoutForm.postalCode || "").trim();
  const checkoutAddressMeta = getAddressConventionMeta(checkoutForm.country);
  const emailLooksValid = /\S+@\S+\.\S+/.test(trimmedEmail);
  const canContinueToDelivery = emailLooksValid && trimmedFullName.length >= 2;
  const stepOneComplete = canContinueToDelivery;
  const stepTwoComplete = Boolean(
    trimmedCountry
    && trimmedAddress
    && trimmedCity
    && (!checkoutAddressMeta.regionRequired || trimmedRegion)
    && trimmedPostalCode
    && shippingSupported
  );
  const walletShortfall = Math.max(0, Number((total - Number(currentWalletBalance || 0)).toFixed(2)));
  const requiredTopUpAmount = getRequiredTopUpAmount(walletShortfall);
  const shouldShowTopUpPrompt = currentUser?.role === "buyer" && walletShortfall > 0;
  const autoSkippedStepOneRef = useRef(false);
  useEffect(() => {
    if (currentUser && stepOneComplete && checkoutStep === 1 && !autoSkippedStepOneRef.current) {
      autoSkippedStepOneRef.current = true;
      setCheckoutStep(2);
    }
  }, [currentUser, stepOneComplete, checkoutStep]);
  const [checkoutTopUpModalOpen, setCheckoutTopUpModalOpen] = useState(false);
  const [checkoutTopUpDraftAmount, setCheckoutTopUpDraftAmount] = useState(String(MIN_WALLET_TOP_UP_THB));
  const [checkoutTopUpError, setCheckoutTopUpError] = useState("");
  const formatUsdFromThb = (thb) => {
    if (!exchangeRate || exchangeRate <= 0) return null;
    return `~$${(Number(thb) / exchangeRate).toFixed(2)} USD`;
  };
  const openCheckoutTopUpModal = (amount) => {
    const resolved = Math.max(MIN_WALLET_TOP_UP_THB, Math.ceil(Number(amount || 0) || MIN_WALLET_TOP_UP_THB));
    setCheckoutTopUpDraftAmount(String(resolved));
    setCheckoutTopUpError("");
    setCheckoutTopUpModalOpen(true);
  };
  const closeCheckoutTopUpModal = () => {
    if (walletStatus === "processing") return;
    setCheckoutTopUpModalOpen(false);
    setCheckoutTopUpError("");
  };
  const submitCheckoutTopUp = async () => {
    const amount = Number(checkoutTopUpDraftAmount || 0);
    if (!isValidWalletTopUpAmount(amount)) {
      setCheckoutTopUpError(`Top-up amount must be at least ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.`);
      return;
    }
    setCheckoutTopUpError("");
    const result = await runWalletTopUp(amount);
    if (!result?.ok) {
      setCheckoutTopUpError(result?.error || "Top-up failed. Please try again.");
      return;
    }
    setCheckoutTopUpModalOpen(false);
  };
  return (
    <>
      <style>{CHECKOUT_SHAKE_KEYFRAMES}</style>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <div className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl">
          <div className="mb-5 grid gap-2 rounded-2xl bg-white/10 p-3 text-xs font-semibold text-slate-100 sm:grid-cols-3">
            <div className="rounded-xl bg-white/10 px-3 py-2">Discreet shipping</div>
            <div className="rounded-xl bg-white/10 px-3 py-2">Secure payments</div>
            <div className="rounded-xl bg-white/10 px-3 py-2">Policy-first support</div>
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              {!currentUser ? (
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={() => setCheckoutAuthModalOpen(true)} className="rounded-full bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
                    Past customer? Login
                  </button>
                </div>
              ) : null}
              <h2 className="mt-4 text-3xl font-bold tracking-tight">Secure checkout</h2>
              {currentUser ? <div className="mt-3 text-sm font-medium text-emerald-300">Welcome back, {currentUser.name}</div> : null}
            </div>
            <div className="grid gap-2 rounded-3xl bg-white/5 p-2 text-sm lg:w-[420px] lg:grid-cols-3">
              {[1, 2, 3].map((step) => {
                const completed = (step === 1 && stepOneComplete) || (step === 2 && stepTwoComplete);
                return (
                  <button
                    key={step}
                    onClick={() => setCheckoutStep(step)}
                    className={`rounded-2xl px-4 py-3 font-semibold ${checkoutStep === step ? "bg-white text-slate-900" : "text-slate-200"}`}
                  >
                    <span>Step {step}</span>
                    {completed ? <span className="ml-1 text-emerald-300 lg:text-emerald-600">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl bg-white p-6 text-slate-800">
              {checkoutStep === 1 ? (
                <div className="grid gap-4">
                  <h3 className="text-xl font-semibold">Customer information</h3>
                  {shouldShowTopUpPrompt ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div>Short by: {formatPriceTHB(walletShortfall)}</div>
                      <div className="mt-1">
                        Top up required: {formatPriceTHB(requiredTopUpAmount)}. Minimum top-up is {formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.
                      </div>
                      <button
                        onClick={() => openCheckoutTopUpModal(requiredTopUpAmount)}
                        className="mt-2 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
                      >
                        Top up now ({formatPriceTHB(requiredTopUpAmount)})
                      </button>
                    </div>
                  ) : null}
                  {currentUser ? (
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Welcome back, {currentUser.name}. We pre-filled your account details below - please review and edit if needed, then continue to delivery.
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Enter your email and name, then continue to delivery details.
                    </div>
                  )}
                  <label className="text-sm font-medium text-slate-700">
                    Email address
                    <input
                      ref={stepOneEmailRef}
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className={`mt-1 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 ${shakeEmail ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                      placeholder="Email address"
                    />
                  </label>
                  {attemptedStepOneContinue && !trimmedEmail ? <div className="text-xs text-rose-600">Email is required.</div> : null}
                  {attemptedStepOneContinue && trimmedEmail && !emailLooksValid ? <div className="text-xs text-rose-600">Enter a valid email address.</div> : null}
                  <label className="text-sm font-medium text-slate-700">
                    Full name
                    <input
                      ref={stepOneNameRef}
                      value={checkoutForm.fullName}
                      onChange={(e) => updateCheckoutField("fullName", e.target.value)}
                      className={`mt-1 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 ${shakeName ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                      placeholder="Full name"
                    />
                  </label>
                  {attemptedStepOneContinue && trimmedFullName.length < 2 ? <div className="text-xs text-rose-600">Full name is required.</div> : null}
                  <button
                    onClick={() => {
                      setAttemptedStepOneContinue(true);
                      if (!trimmedEmail || !emailLooksValid) {
                        triggerShake(setShakeEmail);
                        stepOneEmailRef.current?.focus();
                        return;
                      }
                      if (trimmedFullName.length < 2) {
                        triggerShake(setShakeName);
                        stepOneNameRef.current?.focus();
                        return;
                      }
                      setCheckoutStep(2);
                    }}
                    className={`rounded-2xl px-5 py-3 font-semibold text-white ${canContinueToDelivery ? "bg-rose-600" : "cursor-not-allowed bg-rose-300"}`}
                  >
                    Continue to delivery (Step 2)
                  </button>
                </div>
              ) : null}
              {checkoutStep === 2 ? (
                <div className="grid gap-4">
                  <h3 className="text-xl font-semibold">Delivery details</h3>
                  {shouldShowTopUpPrompt ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div>Short by: {formatPriceTHB(walletShortfall)}</div>
                      <div className="mt-1">
                        Top up required: {formatPriceTHB(requiredTopUpAmount)}. Minimum top-up is {formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.
                      </div>
                      <button
                        onClick={() => openCheckoutTopUpModal(requiredTopUpAmount)}
                        className="mt-2 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
                      >
                        Top up now ({formatPriceTHB(requiredTopUpAmount)})
                      </button>
                    </div>
                  ) : null}
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                    You can edit your shipping address directly here in cart before payment.
                  </div>
                  <label className="text-sm font-medium text-slate-700">
                    Destination country
                    <select
                      ref={stepTwoCountryRef}
                      value={shippingCountryOptions.some((c) => c.code === checkoutForm.country) ? checkoutForm.country : ""}
                      onChange={(e) => updateCheckoutField("country", e.target.value)}
                      className={`mt-1 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 ${shakeCountry ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                    >
                      <option value="">{localizeOptionLabel("Select country", currentUser?.preferredLanguage || "en")}</option>
                      {shippingCountryOptions.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </label>
                  {attemptedStepTwoContinue && !trimmedCountry ? <div className="text-xs text-rose-600">Destination country is required.</div> : null}
                  <label className="text-sm font-medium text-slate-700">
                    Street address
                    <input
                      ref={stepTwoAddressRef}
                      value={checkoutForm.address}
                      onChange={(e) => updateCheckoutField("address", e.target.value)}
                      className={`mt-1 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 ${shakeAddress ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                      placeholder="Street address"
                    />
                  </label>
                  {attemptedStepTwoContinue && !trimmedAddress ? <div className="text-xs text-rose-600">Street address is required.</div> : null}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      City
                      <input
                        ref={stepTwoCityRef}
                        value={checkoutForm.city || ""}
                        onChange={(e) => updateCheckoutField("city", e.target.value)}
                        className={`mt-1 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 ${shakeCity ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                        placeholder="City"
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      {checkoutAddressMeta.regionLabel}
                      <input
                        ref={stepTwoRegionRef}
                        value={checkoutForm.region || ""}
                        onChange={(e) => updateCheckoutField("region", e.target.value)}
                        className={`mt-1 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 ${shakeRegion ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                        placeholder={checkoutAddressMeta.regionPlaceholder}
                      />
                    </label>
                  </div>
                  {attemptedStepTwoContinue && !trimmedCity ? <div className="text-xs text-rose-600">City is required.</div> : null}
                  {attemptedStepTwoContinue && checkoutAddressMeta.regionRequired && !trimmedRegion ? <div className="text-xs text-rose-600">{checkoutAddressMeta.regionLabel} is required.</div> : null}
                  <label className="text-sm font-medium text-slate-700">
                    {checkoutAddressMeta.postalLabel}
                    <input
                      ref={stepTwoPostalCodeRef}
                      value={checkoutForm.postalCode || ""}
                      onChange={(e) => updateCheckoutField("postalCode", e.target.value)}
                      className={`mt-1 min-h-[44px] w-full rounded-2xl border border-slate-200 px-4 py-3 ${shakePostalCode ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                      placeholder={checkoutAddressMeta.postalPlaceholder}
                    />
                  </label>
                  {attemptedStepTwoContinue && !trimmedPostalCode ? <div className="text-xs text-rose-600">{checkoutAddressMeta.postalLabel} is required.</div> : null}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Delivery preview</div>
                    <div className="mt-2 grid gap-1">
                      <div><span className="font-medium">Name:</span> {trimmedFullName || "Add your name in Step 1"}</div>
                      <div><span className="font-medium">Email:</span> {trimmedEmail || "Add your email in Step 1"}</div>
                      <div><span className="font-medium">Address:</span> {trimmedAddress || "Enter street address"}</div>
                      <div><span className="font-medium">City:</span> {trimmedCity || "Enter city"}</div>
                      <div><span className="font-medium">{checkoutAddressMeta.regionLabel}:</span> {trimmedRegion || `Enter ${checkoutAddressMeta.regionPlaceholder}`}</div>
                      <div><span className="font-medium">{checkoutAddressMeta.postalLabel}:</span> {trimmedPostalCode || `Enter ${checkoutAddressMeta.postalPlaceholder}`}</div>
                      <div><span className="font-medium">Country:</span> {countryDisplayName || "Select destination country"}</div>
                      <div><span className="font-medium">Method:</span> {checkoutForm.shippingMethod === "express" ? "Express" : "Standard"}</div>
                    </div>
                  </div>
                  {currentUser?.role === "buyer" ? (
                    <label className="flex items-start gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={checkoutForm.saveAddressToProfile !== false}
                        onChange={(e) => updateCheckoutField("saveAddressToProfile", e.target.checked)}
                        className="mt-0.5"
                      />
                      <span>Save this delivery address to my dashboard profile for next time.</span>
                    </label>
                  ) : null}
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">Shipping method</div>
                      {onMoreShipping ? (
                        <button type="button" onClick={onMoreShipping} className="text-xs font-medium text-rose-600 hover:underline">
                          More about shipping
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Zone: {shippingZoneLabel}
                    </div>
                    {!shippingSupported && checkoutForm.country.trim() ? (
                      <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Shipping is not available for this destination yet.
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-3">
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                        <div>
                          <div className="font-medium">Standard</div>
                          <div className="text-sm text-slate-500">Tracked international delivery</div>
                          {shippingStandardDays ? <div className="mt-0.5 text-xs text-slate-400">Est. {shippingStandardDays} (once shipped)</div> : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-700">{formatPriceTHB(shippingRates.standard)}</span>
                          <input type="radio" name="shippingMethod" checked={checkoutForm.shippingMethod === "standard"} onChange={() => updateCheckoutField("shippingMethod", "standard")} />
                        </div>
                      </label>
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                        <div>
                          <div className="font-medium">Express</div>
                          <div className="text-sm text-slate-500">Priority handling with faster delivery</div>
                          {shippingExpressDays ? <div className="mt-0.5 text-xs text-slate-400">Est. {shippingExpressDays} (once shipped)</div> : null}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-700">{formatPriceTHB(shippingRates.express)}</span>
                          <input type="radio" name="shippingMethod" checked={checkoutForm.shippingMethod === "express"} onChange={() => updateCheckoutField("shippingMethod", "express")} />
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setCheckoutStep(1)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold">Back</button>
                    <button
                      onClick={() => {
                        setAttemptedStepTwoContinue(true);
                        if (!trimmedCountry) {
                          triggerShake(setShakeCountry);
                          stepTwoCountryRef.current?.focus();
                          return;
                        }
                        if (!trimmedAddress) {
                          triggerShake(setShakeAddress);
                          stepTwoAddressRef.current?.focus();
                          return;
                        }
                      if (!trimmedCity) {
                        triggerShake(setShakeCity);
                        stepTwoCityRef.current?.focus();
                        return;
                      }
                      if (checkoutAddressMeta.regionRequired && !trimmedRegion) {
                        triggerShake(setShakeRegion);
                        stepTwoRegionRef.current?.focus();
                        return;
                      }
                      if (!trimmedPostalCode) {
                        triggerShake(setShakePostalCode);
                        stepTwoPostalCodeRef.current?.focus();
                        return;
                      }
                        if (!shippingSupported) {
                          triggerShake(setShakeCountry);
                          stepTwoCountryRef.current?.focus();
                          return;
                        }
                        setCheckoutStep(3);
                      }}
                      className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : null}
              {checkoutStep === 3 ? (
                <div className="grid gap-4">
                  <h3 className="text-xl font-semibold">Payment</h3>
                  <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">Wallet balance available: {formatPriceTHB(currentWalletBalance)}</div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">
                    Policy note: refunds require order evidence and are reviewed case-by-case. Before you pay, double-check your items, shipping address, and contact details.
                  </div>
                  {shouldShowTopUpPrompt ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div>Short by: {formatPriceTHB(walletShortfall)}</div>
                      <div className="mt-1">
                        Top up required: {formatPriceTHB(requiredTopUpAmount)}. Minimum top-up is {formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.
                      </div>
                      <button
                        onClick={() => openCheckoutTopUpModal(requiredTopUpAmount)}
                        className="mt-2 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
                      >
                        Top up now ({formatPriceTHB(requiredTopUpAmount)})
                      </button>
                    </div>
                  ) : null}
                  <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Payment recap</div>
                    <div className="mt-2 grid gap-1">
                      <div>
                        <span className="font-medium">Contact:</span> {trimmedFullName || "No name"} · {trimmedEmail || "No email"}
                        <button type="button" onClick={() => setCheckoutStep(1)} className="ml-2 text-xs font-semibold text-rose-700">Edit</button>
                      </div>
                      <div>
                        <span className="font-medium">Ship to:</span> {trimmedAddress || "No address"}, {trimmedCity || "No city"}, {trimmedRegion || checkoutAddressMeta.regionPlaceholder}, {trimmedPostalCode || checkoutAddressMeta.postalPlaceholder}, {countryDisplayName || "No country"}
                        <button type="button" onClick={() => setCheckoutStep(2)} className="ml-2 text-xs font-semibold text-rose-700">Edit</button>
                      </div>
                      <div><span className="font-medium">Shipping:</span> {checkoutForm.shippingMethod === "express" ? "Express" : "Standard"} ({formatPriceTHB(shippingFee)})</div>
                      <div><span className="font-medium">Total:</span> {formatPriceTHB(total)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => setCheckoutStep(2)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold">Back</button>
                    {currentUser?.role === "buyer" ? (
                      walletShortfall > 0 ? (
                        <button
                          onClick={() => openCheckoutTopUpModal(requiredTopUpAmount)}
                          className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 font-semibold text-amber-800"
                        >
                          Top up now ({formatPriceTHB(requiredTopUpAmount)})
                        </button>
                      ) : (
                        <button onClick={runWalletCheckout} className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">Pay with Wallet</button>
                      )
                    ) : null}
                  </div>
                  {checkoutError ? <div className="text-sm font-medium text-rose-600">{checkoutError}</div> : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl bg-white/10 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Cart summary</h3>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-300">{cartItems.length} item(s)</div>
                  <button
                    onClick={onContinueShopping}
                    className="rounded-xl border border-white/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-white/40 hover:text-white"
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {cartItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/20 p-5 text-sm text-slate-300">
                    <div>Your cart is empty.</div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={onContinueShopping}
                        className="rounded-xl border border-white/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-white/40 hover:text-white"
                      >
                        Browse products
                      </button>
                      {currentUser?.role === "buyer" ? (
                        <button
                          onClick={() => openCheckoutTopUpModal(MIN_WALLET_TOP_UP_THB)}
                          className="rounded-xl border border-rose-300/40 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:border-rose-300/60 hover:text-rose-100"
                        >
                          Top up wallet
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="rounded-2xl bg-white/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {item.slug ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.location.assign(`/product/${item.slug}`);
                              }
                            }}
                            className="font-semibold text-white underline-offset-2 hover:underline"
                            title={`Open ${item.title}`}
                          >
                            {item.title}
                          </button>
                        ) : (
                          <div className="font-semibold text-white">{item.title}</div>
                        )}
                        {item.sellerId ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof window !== "undefined") {
                                window.location.assign(`/seller/${item.sellerId}`);
                              }
                            }}
                            className="mt-1 block text-sm text-slate-300 underline-offset-2 hover:text-white hover:underline"
                            title={`Open ${sellerMap[item.sellerId]?.name || "seller"} profile`}
                          >
                            {sellerMap[item.sellerId]?.name || "Seller"}
                          </button>
                        ) : (
                          <div className="mt-1 text-sm text-slate-300">{sellerMap[item.sellerId]?.name}</div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFromCart(index)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/40 hover:text-white"
                        aria-label={`Remove ${item.title} from cart`}
                        title="Remove item from cart"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove item
                      </button>
                    </div>
                    <div className="mt-3 text-sm font-semibold text-white">{formatPriceTHB(item.price)}</div>
                  </div>
                ))}
              </div>
              {checkoutBundleSuggestion ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Bundle available: {checkoutBundleSuggestion.bundle.title}</div>
                  <div className="mt-1 text-amber-800">
                    You currently have 1 item from this set in cart. Get the full bundle for {formatPriceTHB(checkoutBundleSuggestion.bundle.price)}.
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => onExploreBundle?.(checkoutBundleSuggestion.bundle)}
                      className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      Explore bundle
                    </button>
                    <button
                      onClick={() => onAddBundleFromCheckout?.(checkoutBundleSuggestion.bundle, checkoutBundleSuggestion.selectedItem)}
                      className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                    >
                      Add bundle to cart
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="mt-6 space-y-3 rounded-2xl bg-white/10 p-4 text-sm">
                <div className="flex items-center justify-between text-slate-200"><span>Subtotal</span><span>{formatPriceTHB(subtotal)}</span></div>
                <div className="flex items-center justify-between text-slate-200"><span>Shipping ({checkoutForm.shippingMethod === "express" ? "Express" : "Standard"})</span><span>{formatPriceTHB(shippingFee)}</span></div>
                <div className="text-xs text-slate-300">
                  Shipping destination: {countryDisplayName || "Enter country"}
                  {trimmedCity ? ` · ${trimmedCity}` : ""}
                  {trimmedRegion ? `, ${trimmedRegion}` : ""}
                  {trimmedPostalCode ? ` (${trimmedPostalCode})` : ""}
                  {" "}· Carrier: international carriers
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold text-white"><span>Total</span><span>{formatPriceTHB(total)}</span></div>
              </div>
              <div className="mt-3 rounded-2xl border border-white/20 bg-white/5 p-3 text-xs text-slate-200">
                Policy summary: discreet packaging is standard, wallet payments are secure, and support follows policy-first dispute handling.
              </div>
            </div>
          </div>
        </div>
      </section>

      {checkoutAuthModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-slate-800 shadow-2xl ring-1 ring-rose-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Sign in or create account</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Sign in to speed up checkout, or create an account to save details for future orders.</p>
              </div>
              <button onClick={() => setCheckoutAuthModalOpen(false)} className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 grid gap-3">
              <button
                onClick={() => {
                  onOpenLogin();
                  setCheckoutAuthModalOpen(false);
                }}
                className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white"
              >
                Go to login
              </button>
              <button
                onClick={() => {
                  onOpenRegister();
                  setCheckoutAuthModalOpen(false);
                }}
                className="rounded-2xl border border-rose-200 px-5 py-3 font-semibold text-rose-700"
              >
                Open registration
              </button>
              <button onClick={() => setCheckoutAuthModalOpen(false)} className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-700">
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {currentUser?.role === "buyer" ? (
        <WalletTopUpModal
          open={checkoutTopUpModalOpen}
          draftAmount={checkoutTopUpDraftAmount}
          setDraftAmount={setCheckoutTopUpDraftAmount}
          paymentError={checkoutTopUpError}
          setPaymentError={setCheckoutTopUpError}
          walletStatus={walletStatus}
          exchangeRate={exchangeRate}
          formatPriceTHB={formatPriceTHB}
          formatUsdFromThb={formatUsdFromThb}
          onSubmit={submitCheckoutTopUp}
          onClose={closeCheckoutTopUpModal}
        />
      ) : null}
    </>
  );
}

export function AccountPage({
  currentUser,
  buyerOrders,
  recentBuyerOrders,
  buyerCustomRequests,
  customRequestMessagesByRequestId,
  products,
  sellerMap,
  barMap,
  buyerConversations,
  sellerFollows,
  barFollows,
  toggleSellerFollow,
  toggleBarFollow,
  accountForm,
  updateAccountField,
  isoCountries,
  saveAccountDetails,
  accountSaveMessage,
  currentWalletBalance,
  runWalletTopUp,
  walletStatus,
  topUpAmount,
  markAllNotificationsRead,
  markNotificationRead,
  buyerLedger,
  buyerSellerDirectory,
  accountSearchQuery,
  setAccountSearchQuery,
  quickSellerResults,
  quickProductResults,
  quickBarResults,
  watchedProducts,
  toggleProductWatch,
  buyerMessageSellerSearch,
  setBuyerMessageSellerSearch,
  buyerMessageSellerResults,
  buyerMessageProductFilters,
  buyerMessageFilterOptions,
  updateBuyerMessageProductFilter,
  buyerMessageProductResults,
  buyerDashboardConversationId,
  setBuyerDashboardConversationId,
  buyerDashboardConversationMessages,
  buyerDashboardMessageDraft,
  setBuyerDashboardMessageDraft,
  sendBuyerDashboardMessage,
  buyerDashboardMessageError,
  startBuyerConversationWithSeller,
  sendCustomRequestMessage,
  respondToCustomRequestPrice,
  notifications,
  userStrikes,
  updateNotificationPreference,
  updatePushNotificationPreference,
  pushPermission,
  pushSupported,
  walletTopUpContext,
  clearWalletTopUpContext,
  promptPayReceiverMobile,
  accountCredentialForm,
  setAccountCredentialForm,
  submitAccountCredentialChanges,
  accountCredentialSaving,
  accountCredentialMessage,
  accountCredentialTone,
  resendOrderReceipt,
  fetchOrderTracking,
  exchangeRate,
  uiLanguage = "en",
  navigate
}) {
  const accountText = ACCOUNT_PAGE_I18N[uiLanguage] || ACCOUNT_PAGE_I18N.en;
  const tx = (key) => accountText[key] || ACCOUNT_PAGE_I18N.en[key] || key;
  const formatUsdFromThb = (thb) => {
    if (!exchangeRate || exchangeRate <= 0) return null;
    return `~$${(Number(thb) / exchangeRate).toFixed(2)} USD`;
  };
  const localizePaymentStatus = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "paid":
        return tx("statusPaid");
      case "pending":
        return tx("statusPending");
      case "refunded":
        return tx("statusRefunded");
      default:
        return status || tx("statusPending");
    }
  };
  const localizeFulfillmentStatus = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "processing":
        return tx("statusProcessing");
      case "shipped":
        return tx("statusShipped");
      case "delivered":
        return tx("statusDelivered");
      case "cancelled":
      case "canceled":
        return tx("statusCancelled");
      default:
        return status || tx("statusPending");
    }
  };
  const [copiedTrackingOrderId, setCopiedTrackingOrderId] = useState(null);
  const [copiedTrackingLinkOrderId, setCopiedTrackingLinkOrderId] = useState(null);
  const [trackingDataByOrderId, setTrackingDataByOrderId] = useState({});
  const [trackingLoadingOrderId, setTrackingLoadingOrderId] = useState(null);
  const [showOriginalMessageById, setShowOriginalMessageById] = useState({});
  const [customRequestReplyDraftById, setCustomRequestReplyDraftById] = useState({});
  const [customRequestImageDraftById, setCustomRequestImageDraftById] = useState({});
  const [customRequestCounterDraftById, setCustomRequestCounterDraftById] = useState({});
  const [customRequestStatusMessageById, setCustomRequestStatusMessageById] = useState({});
  const [customTopUpAmount, setCustomTopUpAmount] = useState("500");
  const [customTopUpError, setCustomTopUpError] = useState("");
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpDraftAmount, setTopUpDraftAmount] = useState(String(MIN_WALLET_TOP_UP_THB));
  const [topUpPaymentError, setTopUpPaymentError] = useState("");
  const [showCheckoutTopUpSuccessPopup, setShowCheckoutTopUpSuccessPopup] = useState(false);
  const [resendingReceiptOrderId, setResendingReceiptOrderId] = useState("");
  const [receiptActionMessage, setReceiptActionMessage] = useState("");
  const [receiptActionTone, setReceiptActionTone] = useState("neutral");
  const [receiptCooldownByOrderId, setReceiptCooldownByOrderId] = useState({});
  const [receiptCooldownNow, setReceiptCooldownNow] = useState(Date.now());
  const [showAllOrderHistory, setShowAllOrderHistory] = useState(false);
  const [orderHistoryPage, setOrderHistoryPage] = useState(1);
  const [showAllBillingLedger, setShowAllBillingLedger] = useState(false);
  const [billingLedgerPage, setBillingLedgerPage] = useState(1);
  const [buyerConversationBarFilter, setBuyerConversationBarFilter] = useState("all");
  const RECEIPT_RESEND_COOLDOWN_MS = 30000;
  const handledCheckoutTopUpContextRef = useRef("");
  const buyerMessagesContainerRef = useRef(null);
  useEffect(() => {
    if (buyerMessagesContainerRef.current && buyerDashboardConversationMessages.length > 0) {
      buyerMessagesContainerRef.current.scrollTop = buyerMessagesContainerRef.current.scrollHeight;
    }
  }, [buyerDashboardConversationMessages, buyerDashboardConversationId]);
  useEffect(() => {
    if (!receiptActionMessage) return undefined;
    const timerId = window.setTimeout(() => {
      setReceiptActionMessage("");
      setReceiptActionTone("neutral");
    }, 3500);
    return () => window.clearTimeout(timerId);
  }, [receiptActionMessage]);
  useEffect(() => {
    const hasActiveCooldown = Object.values(receiptCooldownByOrderId).some((expiresAt) => Number(expiresAt || 0) > Date.now());
    if (!hasActiveCooldown) return undefined;
    const timerId = window.setInterval(() => {
      const now = Date.now();
      setReceiptCooldownNow(now);
      setReceiptCooldownByOrderId((prev) => {
        const next = Object.entries(prev || {}).reduce((acc, [orderId, expiresAt]) => {
          if (Number(expiresAt || 0) > now) acc[orderId] = Number(expiresAt);
          return acc;
        }, {});
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [receiptCooldownByOrderId]);
  const detailPageSize = 10;
  const checkoutRequiredTopUpAmount = getRequiredTopUpAmount(walletTopUpContext?.topupRequired || 0);
  const checkoutReturnPath = String(walletTopUpContext?.returnTo || "").trim();
  useEffect(() => {
    if (!checkoutRequiredTopUpAmount) return;
    setCustomTopUpAmount(String(Math.ceil(checkoutRequiredTopUpAmount)));
    setCustomTopUpError("");
  }, [checkoutRequiredTopUpAmount]);
  useEffect(() => {
    if (!checkoutRequiredTopUpAmount) return;
    if (checkoutReturnPath) return;
    const normalizedBalance = Number(currentWalletBalance || 0);
    if (normalizedBalance >= checkoutRequiredTopUpAmount) {
      clearWalletTopUpContext?.();
    }
  }, [checkoutRequiredTopUpAmount, checkoutReturnPath, currentWalletBalance, clearWalletTopUpContext]);
  useEffect(() => {
    if (walletStatus !== "success" || !checkoutReturnPath) return;
    setShowCheckoutTopUpSuccessPopup(true);
    const timerId = window.setTimeout(() => {
      setShowCheckoutTopUpSuccessPopup(false);
      clearWalletTopUpContext?.();
      navigate(checkoutReturnPath);
    }, 1200);
    return () => window.clearTimeout(timerId);
  }, [walletStatus, checkoutReturnPath, clearWalletTopUpContext, navigate]);
  const openTopUpModal = (amount) => {
    const normalizedAmount = Number(amount || 0);
    const fallbackAmount = checkoutRequiredTopUpAmount > 0 ? Math.ceil(checkoutRequiredTopUpAmount) : MIN_WALLET_TOP_UP_THB;
    const resolvedAmount = normalizedAmount > 0 ? normalizedAmount : fallbackAmount;
    setTopUpDraftAmount(String(Math.max(MIN_WALLET_TOP_UP_THB, Math.ceil(resolvedAmount))));
    setTopUpPaymentError("");
    setCustomTopUpError("");
    setTopUpModalOpen(true);
  };
  const closeTopUpModal = () => {
    if (walletStatus === "processing") return;
    setTopUpModalOpen(false);
    setTopUpPaymentError("");
  };
  useEffect(() => {
    if (currentUser?.role !== "buyer") return;
    if (!walletTopUpContext?.source) return;
    const contextKey = [
      String(walletTopUpContext?.source || ""),
      String(walletTopUpContext?.topupRequired || ""),
      String(walletTopUpContext?.returnTo || ""),
    ].join("|");
    if (!contextKey || handledCheckoutTopUpContextRef.current === contextKey) return;
    handledCheckoutTopUpContextRef.current = contextKey;
    if (typeof document !== "undefined") {
      document.getElementById("buyer-wallet")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const nextAmount = checkoutRequiredTopUpAmount > 0
      ? checkoutRequiredTopUpAmount
      : Number(walletTopUpContext?.topupRequired || 0);
    openTopUpModal(nextAmount > 0 ? nextAmount : MIN_WALLET_TOP_UP_THB);
  }, [currentUser?.role, walletTopUpContext?.source, walletTopUpContext?.topupRequired, walletTopUpContext?.returnTo, checkoutRequiredTopUpAmount]);
  const submitTopUpFromModal = async () => {
    const amount = Number(topUpDraftAmount || 0);
    if (!isValidWalletTopUpAmount(amount)) {
      setTopUpPaymentError(`Top-up amount must be at least ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.`);
      return;
    }
    setTopUpPaymentError("");
    const result = await runWalletTopUp(amount);
    if (!result?.ok) {
      setTopUpPaymentError(result?.error || "Top-up failed. Please try again.");
      return;
    }
    setTopUpModalOpen(false);
  };
  const canAffordCustomRequestMessage =
    currentUser?.role !== "buyer" || Number(currentWalletBalance || 0) >= MESSAGE_FEE_THB;
  const [buyerNotificationFilter, setBuyerNotificationFilter] = useState("all");
  const [buyerNotificationCompactMode, setBuyerNotificationCompactMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(`tlm-buyer-notification-density-${currentUser?.id || "anon"}`) === "compact";
  });
  const [buyerDiscreetNotificationText, setBuyerDiscreetNotificationText] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(`tlm-buyer-discreet-notifications-${currentUser?.id || "anon"}`) === "1";
  });
  const buyerUnreadMessageNotifications = useMemo(() => {
    if (currentUser?.role !== "buyer") return [];
    return (notifications || []).filter((notification) => (
      notification.userId === currentUser.id
      && notification.type === "message"
      && !notification.read
    ));
  }, [notifications, currentUser]);
  const accountActiveStrikes = useMemo(
    () => (userStrikes || []).filter((strike) => strike.userId === currentUser?.id && strike.status === "active"),
    [userStrikes, currentUser]
  );
  const buyerUnreadDirectMessageCount = useMemo(
    () =>
      buyerUnreadMessageNotifications.filter(
        (notification) => String(notification.conversationId || "").includes("__"),
      ).length,
    [buyerUnreadMessageNotifications],
  );
  const buyerUnreadCustomRequestMessageCount = useMemo(
    () =>
      buyerUnreadMessageNotifications.filter(
        (notification) => String(notification.conversationId || "").startsWith("custom_request_"),
      ).length,
    [buyerUnreadMessageNotifications],
  );
  const buyerUnreadSellerReplyCount = buyerUnreadDirectMessageCount + buyerUnreadCustomRequestMessageCount;
  const buyerNotifications = useMemo(() => {
    if (currentUser?.role !== "buyer") return [];
    return (notifications || [])
      .filter((notification) => notification.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [notifications, currentUser]);
  const filteredBuyerNotifications = useMemo(() => {
    if (buyerNotificationFilter === "unread") return buyerNotifications.filter((notification) => !notification.read);
    if (buyerNotificationFilter === "messages") return buyerNotifications.filter((notification) => notification.type === "message");
    if (buyerNotificationFilter === "engagement") return buyerNotifications.filter((notification) => notification.type === "engagement");
    return buyerNotifications;
  }, [buyerNotifications, buyerNotificationFilter]);
  const groupedBuyerNotifications = useMemo(
    () => groupNotificationsByDay(filteredBuyerNotifications),
    [filteredBuyerNotifications]
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `tlm-buyer-discreet-notifications-${currentUser?.id || "anon"}`,
      buyerDiscreetNotificationText ? "1" : "0"
    );
  }, [buyerDiscreetNotificationText, currentUser?.id]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      `tlm-buyer-notification-density-${currentUser?.id || "anon"}`,
      buyerNotificationCompactMode ? "compact" : "comfort"
    );
  }, [buyerNotificationCompactMode, currentUser?.id]);
  const followedSellerIds = useMemo(
    () =>
      new Set(
        (sellerFollows || [])
          .filter((entry) => entry.followerUserId === currentUser?.id)
          .map((entry) => entry.sellerId)
      ),
    [sellerFollows, currentUser]
  );
  const followedBarIds = useMemo(
    () =>
      new Set(
        (barFollows || [])
          .filter((entry) => entry.followerUserId === currentUser?.id)
          .map((entry) => String(entry?.barId || ""))
          .filter(Boolean)
      ),
    [barFollows, currentUser]
  );
  const favoriteSellers = useMemo(() => {
    if (currentUser?.role !== "buyer") return [];
    const rows = (sellerFollows || [])
      .filter((entry) => entry.followerUserId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const seenSellerIds = new Set();
    const list = [];
    rows.forEach((entry) => {
      if (seenSellerIds.has(entry.sellerId)) return;
      seenSellerIds.add(entry.sellerId);
      const seller = sellerMap?.[entry.sellerId];
      if (!seller) return;
      list.push({ ...seller, followedAt: entry.createdAt || "" });
    });
    return list;
  }, [sellerFollows, currentUser, sellerMap]);
  const favoriteBars = useMemo(() => {
    if (currentUser?.role !== "buyer") return [];
    const rows = (barFollows || [])
      .filter((entry) => entry.followerUserId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const seenBarIds = new Set();
    const list = [];
    rows.forEach((entry) => {
      const barId = String(entry?.barId || "");
      if (!barId || seenBarIds.has(barId)) return;
      seenBarIds.add(barId);
      const bar = barMap?.[barId];
      if (!bar) return;
      list.push({ ...bar, followedAt: entry.createdAt || "" });
    });
    return list;
  }, [barFollows, currentUser, barMap]);
  const watchedProductIds = useMemo(
    () => new Set((watchedProducts || []).map((product) => product.id)),
    [watchedProducts]
  );
  const scrollToSection = (sectionId) => {
    if (typeof document === "undefined") return;
    const node = document.getElementById(sectionId);
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const copyTrackingCode = async (orderId, trackingNumber) => {
    const value = String(trackingNumber || "").trim();
    if (!value || typeof window === "undefined") return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedTrackingOrderId(orderId);
      window.setTimeout(() => {
        setCopiedTrackingOrderId((prev) => (prev === orderId ? null : prev));
      }, 1400);
    } catch {
      setCopiedTrackingOrderId(null);
    }
  };
  const copyTrackingLink = async (orderId, trackingNumber) => {
    const value = String(trackingNumber || "").trim();
    if (!value || typeof window === "undefined") return;
    const trackingUrl = `https://www.17track.net/en/track?nums=${encodeURIComponent(value)}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(trackingUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = trackingUrl;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedTrackingLinkOrderId(orderId);
      window.setTimeout(() => {
        setCopiedTrackingLinkOrderId((prev) => (prev === orderId ? null : prev));
      }, 1400);
    } catch {
      setCopiedTrackingLinkOrderId(null);
    }
  };
  const handleCheckTracking = async (orderId) => {
    if (!fetchOrderTracking || trackingLoadingOrderId === orderId) return;
    setTrackingLoadingOrderId(orderId);
    try {
      const result = await fetchOrderTracking(orderId);
      if (result.ok && result.tracking) {
        setTrackingDataByOrderId((prev) => ({ ...prev, [orderId]: result.tracking }));
      } else if (result.ok && !result.tracking) {
        setTrackingDataByOrderId((prev) => ({ ...prev, [orderId]: { _noData: true } }));
      } else {
        setTrackingDataByOrderId((prev) => ({ ...prev, [orderId]: { _error: result.error || "Failed to load tracking" } }));
      }
    } catch {
      setTrackingDataByOrderId((prev) => ({ ...prev, [orderId]: { _error: "Network error" } }));
    } finally {
      setTrackingLoadingOrderId(null);
    }
  };
  const AFTERSHIP_TAG_LABELS = {
    Pending: { label: "Pending", color: "bg-slate-100 text-slate-700" },
    InfoReceived: { label: "Info Received", color: "bg-blue-50 text-blue-700" },
    InTransit: { label: "In Transit", color: "bg-amber-50 text-amber-700" },
    OutForDelivery: { label: "Out for Delivery", color: "bg-indigo-50 text-indigo-700" },
    AttemptFail: { label: "Delivery Attempt Failed", color: "bg-orange-50 text-orange-700" },
    Delivered: { label: "Delivered", color: "bg-emerald-50 text-emerald-700" },
    AvailableForPickup: { label: "Available for Pickup", color: "bg-teal-50 text-teal-700" },
    Exception: { label: "Exception", color: "bg-red-50 text-red-700" },
    Expired: { label: "Expired", color: "bg-slate-100 text-slate-600" },
  };
  const resolveConversationSellerName = (conversationId) => {
    const sellerId = String(conversationId || "").split("__")[1] || "";
    return sellerMap[sellerId]?.name || tx("seller");
  };
  const getConversationInitials = (label) => {
    const parts = String(label || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };
  const resolveConversationMessageBody = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = (message?.senderId || message?.senderUserId) === currentUser?.id;
    const showOriginal = Boolean(showOriginalMessageById[message?.id]);
    if (isOwnMessage || showOriginal) return original;
    return translated || original;
  };
  const canToggleConversationTranslation = (message) => {
    const original = String(message?.bodyOriginal || message?.body || "");
    const translations = message?.translations || {};
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(translations?.[preferredLanguage] || translations?.en || "");
    const isOwnMessage = (message?.senderId || message?.senderUserId) === currentUser?.id;
    return !isOwnMessage && Boolean(translated) && translated !== original;
  };
  const getCustomRequestQuoteStatusLabel = (request) => {
    if ((request?.quoteStatus || "") === "proposed" && request?.quoteAwaitingBuyerPayment) {
      return "awaiting buyer payment";
    }
    return request?.quoteStatus || "proposed";
  };
  const isBuyerPaymentPending = (request) => {
    const quoteStatus = String(request?.quoteStatus || "").toLowerCase();
    const quotedPrice = Number(request?.quotedPriceThb || 0);
    return quoteStatus === "proposed" && quotedPrice >= MIN_CUSTOM_REQUEST_PURCHASE_THB;
  };
  const buyerInAppAllEnabled =
    (currentUser?.notificationPreferences?.message !== false)
    && (currentUser?.notificationPreferences?.engagement !== false);
  const buyerPushDefaultEnabled = false;
  const buyerPushMessageEnabled = typeof currentUser?.notificationPreferences?.push?.message === "boolean"
    ? currentUser.notificationPreferences.push.message
    : buyerPushDefaultEnabled;
  const buyerPushEngagementEnabled = typeof currentUser?.notificationPreferences?.push?.engagement === "boolean"
    ? currentUser.notificationPreferences.push.engagement
    : buyerPushDefaultEnabled;
  const buyerPushAdminOpsEnabled = currentUser?.role !== "admin"
    ? true
    : (typeof currentUser?.notificationPreferences?.push?.adminOps === "boolean"
      ? currentUser.notificationPreferences.push.adminOps
      : false);
  const buyerPushAllEnabled = buyerPushMessageEnabled && buyerPushEngagementEnabled && buyerPushAdminOpsEnabled;
  const buyerNotificationTypeMeta = (notificationType) => {
    const normalizedType = String(notificationType || "").toLowerCase();
    if (normalizedType === "message") {
      return {
        label: "Message",
        icon: MessageSquare,
        chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
        iconWrapClassName: "bg-emerald-50 text-emerald-700",
      };
    }
    if (normalizedType === "engagement") {
      return {
        label: "Activity",
        icon: Bell,
        chipClassName: "border-amber-200 bg-amber-50 text-amber-700",
        iconWrapClassName: "bg-amber-50 text-amber-700",
      };
    }
    return {
      label: "Update",
      icon: Bell,
      chipClassName: "border-slate-200 bg-slate-50 text-slate-700",
      iconWrapClassName: "bg-slate-100 text-slate-700",
    };
  };
  const accountAddressMeta = getAddressConventionMeta(accountForm.country);
  const orderHistoryPageCount = Math.max(1, Math.ceil(recentBuyerOrders.length / detailPageSize));
  const visibleOrderHistory = showAllOrderHistory
    ? recentBuyerOrders.slice((orderHistoryPage - 1) * detailPageSize, orderHistoryPage * detailPageSize)
    : recentBuyerOrders.slice(0, 3);
  const billingLedgerPageCount = Math.max(1, Math.ceil(buyerLedger.length / detailPageSize));
  const visibleBillingLedger = showAllBillingLedger
    ? buyerLedger.slice((billingLedgerPage - 1) * detailPageSize, billingLedgerPage * detailPageSize)
    : buyerLedger.slice(0, 3);
  const handleCustomRequestImageDraftSelect = async (requestId, fileList) => {
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
    setCustomRequestImageDraftById((prev) => ({ ...prev, [requestId]: nextImages.filter((item) => item?.image) }));
  };
  const handleResendReceipt = async (order) => {
    if (!order?.id || !resendOrderReceipt) return;
    const cooldownExpiresAt = Number(receiptCooldownByOrderId[order.id] || 0);
    if (cooldownExpiresAt > Date.now()) {
      setReceiptActionMessage(`${tx("receiptRecentlySent")} (${Math.ceil((cooldownExpiresAt - Date.now()) / 1000)}s)`);
      setReceiptActionTone("neutral");
      return;
    }
    setResendingReceiptOrderId(order.id);
    setReceiptActionMessage("");
    setReceiptActionTone("neutral");
    try {
      const result = await resendOrderReceipt(order.id);
      if (result?.ok) {
        setReceiptActionMessage(tx("receiptResent"));
        setReceiptActionTone("success");
        const nextExpiry = Date.now() + RECEIPT_RESEND_COOLDOWN_MS;
        setReceiptCooldownNow(Date.now());
        setReceiptCooldownByOrderId((prev) => ({ ...prev, [order.id]: nextExpiry }));
      } else {
        setReceiptActionMessage(result?.error || tx("receiptResendFailed"));
        setReceiptActionTone("error");
      }
    } catch {
      setReceiptActionMessage(tx("receiptResendFailed"));
      setReceiptActionTone("error");
    } finally {
      setResendingReceiptOrderId("");
    }
  };
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      {!currentUser ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">{accountText.loginRequired}</h2>
          <p className="mt-2 text-slate-600">{tx("loginHelp")}</p>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-6 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700"
          >
            Go to login
          </button>
        </div>
      ) : (
        <>
          {['buyer', 'seller', 'bar', 'admin'].includes(String(currentUser.role || '').toLowerCase()) ? (
          <>
          <SectionTitle eyebrow="Account" title={accountText.accountCenterTitle} subtitle={accountText.accountCenterSubtitle} />
          {(currentUser.role === "buyer" || currentUser.role === "seller") && accountActiveStrikes.length > 0 ? (
            <div className={`mb-6 rounded-3xl border p-5 ${currentUser.accountStatus === "frozen" ? "border-rose-300 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className={`text-sm font-semibold uppercase tracking-[0.14em] ${currentUser.accountStatus === "frozen" ? "text-rose-700" : "text-amber-700"}`}>
                    Account moderation notice
                  </div>
                  <div className={`mt-1 text-sm ${currentUser.accountStatus === "frozen" ? "text-rose-900" : "text-amber-900"}`}>
                    {currentUser.accountStatus === "frozen"
                      ? "Your account is frozen after two moderation strikes."
                      : `You currently have ${accountActiveStrikes.length} active moderation strike${accountActiveStrikes.length > 1 ? "s" : ""}.`}
                  </div>
                  <div className={`mt-1 text-sm ${currentUser.accountStatus === "frozen" ? "text-rose-800" : "text-amber-800"}`}>
                    Open appeals to submit your explanation and request admin review.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/appeals")}
                  className={`min-h-[44px] rounded-xl border bg-white px-3 py-3 text-sm font-semibold ${currentUser.accountStatus === "frozen" ? "border-rose-300 text-rose-800" : "border-amber-300 text-amber-800"}`}
                >
                  Open appeals
                </button>
              </div>
            </div>
          ) : null}
          {currentUser.role === "buyer" ? (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button className="min-h-[44px] w-full rounded-xl bg-rose-600 px-4 py-3 text-center text-sm font-semibold text-white sm:w-auto">
                {tx("profile")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/buyer-messages")}
                className="min-h-[44px] w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700 sm:w-auto"
              >
                {tx("messages")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/custom-requests")}
                className="min-h-[44px] w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700 sm:w-auto"
              >
                {tx("customRequests")}
              </button>
              <button
                type="button"
                onClick={() => navigate("/stories")}
                className="min-h-[44px] w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700 sm:w-auto"
              >
                {tx("sellerFeed")}
              </button>
            </div>
          ) : null}
          {currentUser.role === "admin" ? (
            <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-600">Admin quick access</div>
                  <div className="mt-1 text-sm text-slate-700">Open the admin control center to manage approvals, users, and sales.</div>
                </div>
                <button
                  onClick={() => navigate("/admin")}
                  className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Open Admin Dashboard
                </button>
              </div>
            </div>
          ) : null}
          {currentUser.role === "seller" && currentUser.accountStatus === "active" ? (
            <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-600">Seller quick access</div>
                  <div className="mt-1 text-sm text-slate-700">Open your seller dashboard to manage listings, messages, and profile updates.</div>
                </div>
                <button
                  onClick={() => navigate("/seller-dashboard")}
                  className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Open seller dashboard
                </button>
              </div>
            </div>
          ) : null}
          {currentUser.role === "seller" && currentUser.accountStatus !== "active" ? (
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">Seller application status</div>
              <div className="mt-2 text-sm text-slate-700">
                {currentUser.accountStatus === "pending"
                  ? "Your seller application is pending review."
                  : `Your seller application was rejected${currentUser.rejectionReason ? `: ${currentUser.rejectionReason}` : "."}`}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => navigate("/seller-dashboard")} className="rounded-xl border border-amber-300 px-3 py-2.5 text-sm font-semibold text-amber-800">Open seller dashboard</button>
                <button onClick={() => navigate("/contact")} className="rounded-xl border border-amber-300 px-3 py-2.5 text-sm font-semibold text-amber-800">Contact support</button>
              </div>
            </div>
          ) : null}
          {currentUser.role === "buyer" && buyerUnreadSellerReplyCount > 0 ? (
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">New seller replies</div>
                  <div className="mt-1 text-sm text-slate-700">
                    You have {buyerUnreadSellerReplyCount} unread seller {buyerUnreadSellerReplyCount === 1 ? "reply" : "replies"}
                    {buyerUnreadDirectMessageCount > 0 ? ` · ${buyerUnreadDirectMessageCount} direct message${buyerUnreadDirectMessageCount > 1 ? "s" : ""}` : ""}
                    {buyerUnreadCustomRequestMessageCount > 0 ? ` · ${buyerUnreadCustomRequestMessageCount} custom request update${buyerUnreadCustomRequestMessageCount > 1 ? "s" : ""}` : ""}.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {buyerUnreadDirectMessageCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => navigate("/buyer-messages")}
                      className="rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-amber-800"
                    >
                      Open messages
                    </button>
                  ) : null}
                  {buyerUnreadCustomRequestMessageCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => navigate("/custom-requests")}
                      className="rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-amber-800"
                    >
                      Open custom requests
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-semibold text-amber-800"
                  >
                    Mark as read
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Bell className="h-4 w-4 text-rose-600" />
              {tx("notifications")}
            </div>
            <button
              type="button"
              onClick={() => {
                const nextEnabled = !buyerInAppAllEnabled;
                updateNotificationPreference("message", nextEnabled);
                updateNotificationPreference("engagement", nextEnabled);
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${buyerInAppAllEnabled ? "bg-emerald-50 text-emerald-700" : "border border-slate-200 text-slate-600"}`}
            >
              {tx("emailNotifications")}: {buyerInAppAllEnabled ? tx("onLabel") : tx("offLabel")}
            </button>
            <button
              type="button"
              onClick={() => {
                const nextEnabled = !buyerPushAllEnabled;
                updatePushNotificationPreference("message", nextEnabled);
                updatePushNotificationPreference("engagement", nextEnabled);
                if (currentUser?.role === "admin") {
                  updatePushNotificationPreference("adminOps", nextEnabled);
                }
              }}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${buyerPushAllEnabled ? "bg-indigo-50 text-indigo-700" : "border border-slate-200 text-slate-600"}`}
            >
              {tx("browserNotifications")}: {buyerPushAllEnabled ? tx("onLabel") : tx("offLabel")}
            </button>
            {!pushSupported ? (
              <span className="text-xs text-amber-700">{tx("pushNotSupported")}</span>
            ) : null}
            {pushSupported && pushPermission === "denied" ? (
              <span className="text-xs text-amber-700">{tx("pushBlockedEnableSettings")}</span>
            ) : null}
          </div>
          <div className="flex flex-col gap-5 sm:gap-6">
              <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
                <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
                  <ShoppingBag className="h-6 w-6 text-rose-600" />
                  <div className="mt-4 text-sm text-slate-500">{tx("totalOrders")}</div>
                  <div className="mt-2 text-3xl font-bold">{buyerOrders.length}</div>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
                  <Clock3 className="h-6 w-6 text-rose-600" />
                  <div className="mt-4 text-sm text-slate-500">{tx("processing")}</div>
                  <div className="mt-2 text-3xl font-bold">{buyerOrders.filter((order) => order.fulfillmentStatus === "processing").length}</div>
                </div>
                <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
                  <CheckCircle2 className="h-6 w-6 text-rose-600" />
                  <div className="mt-4 text-sm text-slate-500">{tx("shippedDelivered")}</div>
                  <div className="mt-2 text-3xl font-bold">{buyerOrders.filter((order) => order.fulfillmentStatus !== "processing").length}</div>
                </div>
              </div>
              {currentUser.role === "buyer" ? (
                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
                    <Bookmark className="h-6 w-6 text-rose-600" />
                    <div className="mt-4 text-sm text-slate-500">{accountText.favoriteSellers}</div>
                    <div className="mt-2 text-3xl font-bold">{favoriteSellers.length}</div>
                  </div>
                  <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
                    <MapPin className="h-6 w-6 text-rose-600" />
                    <div className="mt-4 text-sm text-slate-500">{accountText.favoriteBars || "Favorite bars"}</div>
                    <div className="mt-2 text-3xl font-bold">{favoriteBars.length}</div>
                  </div>
                </div>
              ) : null}

              <details id="buyer-wallet" className="order-first overflow-hidden rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-rose-600" />
                      <h3 className="text-xl font-semibold">{accountText.accountBalance}</h3>
                    </div>
                    <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                  </div>
                </summary>
                <div className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                  {tx("availableBalance")}: <span className="font-bold">{formatPriceTHB(currentWalletBalance)}</span>
                </div>
                {checkoutRequiredTopUpAmount > 0 ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div>You need {formatPriceTHB(checkoutRequiredTopUpAmount)} to complete your checkout.</div>
                    <div className="mt-1">Minimum top-up is {formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.</div>
                    {checkoutReturnPath ? (
                      <button
                        type="button"
                        onClick={() => navigate(checkoutReturnPath)}
                        className="mt-2 rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
                      >
                        Back to checkout
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <p className="mt-3 text-sm leading-6 text-slate-600">{tx("walletHelp")} {formatPriceTHB(MESSAGE_FEE_THB)} {tx("walletHelpPart2")} {formatPriceTHB(CUSTOM_REQUEST_FEE_THB)}.</p>
                {currentUser.role === "buyer" || currentUser.role === "seller" ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {[500, 1000, 10000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setCustomTopUpError("");
                            if (currentUser.role === "buyer") {
                              openTopUpModal(amount);
                              return;
                            }
                            runWalletTopUp(amount);
                          }}
                          className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                        >
                          {tx("add")} {formatPriceTHB(amount)}{formatUsdFromThb(amount) ? ` (${formatUsdFromThb(amount)})` : ''}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="relative w-44">
                        <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-sm font-semibold text-slate-500">฿</span>
                        <input
                          type="number"
                          min={MIN_WALLET_TOP_UP_THB}
                          step="1"
                          value={customTopUpAmount}
                          onChange={(event) => {
                            setCustomTopUpError("");
                            setCustomTopUpAmount(event.target.value);
                          }}
                          className="w-full rounded-2xl border border-slate-200 py-2 pl-8 pr-4 text-sm"
                          placeholder={`Custom amount (min ${MIN_WALLET_TOP_UP_THB})`}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const amount = Number(customTopUpAmount);
                          if (!isValidWalletTopUpAmount(amount)) {
                            setCustomTopUpError(`Custom amount must be at least ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.`);
                            return;
                          }
                          setCustomTopUpError("");
                          if (currentUser.role === "buyer") {
                            openTopUpModal(amount);
                            return;
                          }
                          runWalletTopUp(amount);
                        }}
                        className="w-full rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 sm:w-auto"
                      >
                        {currentUser.role === "buyer" ? "Top up with card" : "Add custom amount"}
                      </button>
                    </div>
                    {customTopUpError ? <div className="mt-2 text-sm font-medium text-rose-600">{customTopUpError}</div> : null}
                    <div className={`mt-3 text-sm ${walletStatus === "success" ? "font-medium text-emerald-700" : walletStatus === "processing" ? "font-medium text-indigo-700" : "text-slate-500"}`}>
                      {walletStatus === "processing" ? tx("walletProcessing") : walletStatus === "success" ? `${tx("walletAddedPrefix")} ${formatPriceTHB(topUpAmount)} ${tx("walletAddedSuffix")}` : tx("walletPresetHelp")}
                    </div>
                    {walletStatus === "success" && checkoutReturnPath ? (
                      <div className="mt-2 text-xs font-medium text-emerald-700">
                        Top-up complete. Returning to checkout...
                      </div>
                    ) : null}
                    {currentUser.role === "buyer" ? (
                      <WalletTopUpModal
                        open={topUpModalOpen}
                        draftAmount={topUpDraftAmount}
                        setDraftAmount={setTopUpDraftAmount}
                        paymentError={topUpPaymentError}
                        setPaymentError={setTopUpPaymentError}
                        walletStatus={walletStatus}
                        exchangeRate={exchangeRate}
                        formatPriceTHB={formatPriceTHB}
                        formatUsdFromThb={formatUsdFromThb}
                        onSubmit={submitTopUpFromModal}
                        onClose={closeTopUpModal}
                      />
                    ) : null}
                  </>
                ) : null}
              </details>

              <div id="buyer-orders" className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
                <h3 className="text-xl font-semibold">{accountText.orderTracking}</h3>
                <div className="mt-5 space-y-4">
                  {recentBuyerOrders.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{accountText.noOrders}</div>
                  ) : recentBuyerOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-rose-100 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="font-semibold">{tx("orderLabel")} {order.id}</div>
                          <div className="mt-1 text-sm text-slate-500">{tx("orderPlaced")} {new Date(order.createdAt || Date.now()).toLocaleDateString()}</div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                            {order.items.map((itemId) => {
                              const purchasedProduct = products.find((product) => product.id === itemId);
                              const itemLabel = purchasedProduct?.title || itemId;
                              if (purchasedProduct?.slug) {
                                return (
                                  <button
                                    key={itemId}
                                    type="button"
                                    onClick={() => navigate(`/product/${purchasedProduct.slug}`)}
                                    className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                                  >
                                    {itemLabel}
                                  </button>
                                );
                              }
                              return (
                                <span key={itemId} className="rounded-full bg-slate-100 px-3 py-1">{itemLabel}</span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2 text-sm md:text-right">
                          <div className="font-semibold text-rose-700">{formatPriceTHB(order.total)}</div>
                          <div className="inline-block rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{localizeFulfillmentStatus(order.fulfillmentStatus)}</div>
                          <div className="text-slate-500">{tx("tracking")}: {order.trackingCarrier ? `${order.trackingCarrier} · ` : ""}{order.trackingNumber || tx("pending")}</div>
                          {order.trackingNumber ? (
                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                              <button
                                type="button"
                                onClick={() => copyTrackingCode(order.id, order.trackingNumber)}
                                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                              >
                                {copiedTrackingOrderId === order.id ? tx("copied") : tx("copyCode")}
                              </button>
                              <button
                                type="button"
                                onClick={() => copyTrackingLink(order.id, order.trackingNumber)}
                                className="text-xs font-semibold text-slate-600 hover:text-slate-800"
                              >
                                {copiedTrackingLinkOrderId === order.id ? tx("linkCopied") : tx("copyLink")}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCheckTracking(order.id)}
                                disabled={trackingLoadingOrderId === order.id}
                                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-50"
                              >
                                {trackingLoadingOrderId === order.id ? "Loading..." : "Check Status"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {(() => {
                        const td = trackingDataByOrderId[order.id];
                        if (!td) return null;
                        if (td._error) return <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{td._error}</div>;
                        if (td._noData) return <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Tracking registered but no updates yet.</div>;
                        const tagInfo = AFTERSHIP_TAG_LABELS[td.tag] || { label: td.tag || "Unknown", color: "bg-slate-100 text-slate-700" };
                        return (
                          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tagInfo.color}`}>{tagInfo.label}</span>
                              {td.subtag ? <span className="text-xs text-slate-500">{td.subtag}</span> : null}
                              {td.estimatedDeliveryDate ? (
                                <span className="text-xs text-slate-500">ETA: {new Date(td.estimatedDeliveryDate).toLocaleDateString()}</span>
                              ) : null}
                            </div>
                            {td.trackingUrl ? (
                              <a href={td.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                                View full tracking page
                              </a>
                            ) : null}
                            {Array.isArray(td.checkpoints) && td.checkpoints.length > 0 ? (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs font-semibold text-slate-700">Tracking history</div>
                                {td.checkpoints.slice(0, 8).map((cp, idx) => (
                                  <div key={idx} className="flex items-start gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                                    <div>
                                      <div className="text-xs text-slate-800">{cp.message || cp.tag || ""}</div>
                                      <div className="text-[11px] text-slate-500">{cp.location || ""}{cp.checkpoint_time ? ` · ${new Date(cp.checkpoint_time).toLocaleString()}` : ""}</div>
                                    </div>
                                  </div>
                                ))}
                                {td.checkpoints.length > 8 ? <div className="text-xs text-slate-400">+ {td.checkpoints.length - 8} more events</div> : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>

              {currentUser.role === "buyer" ? (
                <details id="buyer-favorites" className="overflow-hidden rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-5 w-5 text-rose-600" />
                        <h3 className="text-xl font-semibold">{accountText.favoriteSellers}</h3>
                      </div>
                      <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                    </div>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tx("favoritesHelp")}</p>
                  <div className="mt-4 space-y-3">
                    {favoriteSellers.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{tx("noFavorites")}</div>
                    ) : favoriteSellers.slice(0, 8).map((seller) => (
                      <div key={seller.id} className="rounded-2xl border border-rose-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <button onClick={() => navigate(`/seller/${seller.id}`)} className="text-left text-sm font-semibold text-slate-800 hover:text-rose-700">{seller.name}</button>
                            <div className="text-xs text-slate-500">{seller.location || tx("locationNotSet")}</div>
                          </div>
                          <div className="text-[11px] text-slate-500">{seller.followedAt ? `${tx("savedOn")} ${new Date(seller.followedAt).toLocaleDateString()}` : ""}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => navigate(`/seller/${seller.id}`)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">{tx("view")}</button>
                          <button
                            onClick={() => startBuyerConversationWithSeller(seller.id)}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
                          >
                            {tx("message")}
                          </button>
                          <button
                            onClick={() => toggleSellerFollow(seller.id)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                          >
                            {tx("remove")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div id="buyer-favorite-bars" className="mt-6 border-t border-rose-100 pt-5">
                    <div className="flex items-center gap-2">
                      <Bookmark className="h-5 w-5 text-rose-600" />
                      <h3 className="text-xl font-semibold">{accountText.favoriteBars || "Favorite bars"}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{tx("favoriteBarsHelp")}</p>
                    <div className="mt-4 space-y-3">
                      {favoriteBars.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{tx("noFavoriteBars")}</div>
                      ) : favoriteBars.slice(0, 8).map((bar) => (
                        <div key={bar.id} className="rounded-2xl border border-rose-100 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <button onClick={() => navigate(`/bar/${bar.id}`)} className="text-left text-sm font-semibold text-slate-800 hover:text-rose-700">{bar.name}</button>
                              <div className="text-xs text-slate-500">{bar.location || tx("locationNotSet")}</div>
                            </div>
                            <div className="text-[11px] text-slate-500">{bar.followedAt ? `${tx("savedOn")} ${new Date(bar.followedAt).toLocaleDateString()}` : ""}</div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={() => navigate(`/bar/${bar.id}`)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">{tx("view")}</button>
                            <button onClick={() => navigate("/stories")} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">Open Stories</button>
                            <button
                              onClick={() => toggleBarFollow(bar.id)}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                            >
                              {tx("remove")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ) : null}

              {currentUser.role === "buyer" ? (
                <details id="buyer-watched-products" className="overflow-hidden rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold">{accountText.watchedProducts || "Liked Products"}</h3>
                      <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                    </div>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tx("watchedProductsHelp")}</p>
                  <div className="mt-4 space-y-3">
                    {(watchedProducts || []).length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{tx("noWatchedProducts")}</div>
                    ) : (watchedProducts || []).slice(0, 12).map((product) => (
                      <div key={product.id} className="rounded-2xl border border-rose-100 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <button onClick={() => navigate(`/product/${product.slug}`)} className="truncate text-left text-sm font-semibold text-slate-800 hover:text-rose-700">{product.title}</button>
                            <div className="text-xs text-slate-500">{product.style || tx("notSpecified")} · {formatPriceTHB(product.price)}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => navigate(`/product/${product.slug}`)} className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">{tx("view")}</button>
                            <button onClick={() => toggleProductWatch?.(product.id)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                              {tx("remove")}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {currentUser.role === "buyer" ? (
                <details className="overflow-hidden rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">{accountText.quickFinder}</h3>
                    <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                  </div>
                </summary>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{tx("quickFinderHelp")}</p>
                  <input
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
                    placeholder={tx("searchSellersProductsStyles")}
                  />
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">{tx("sellersLabel")}</div>
                    <div className="mt-2 space-y-2">
                      {quickSellerResults.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noSellersFound")}</div>
                      ) : quickSellerResults.map((seller) => (
                        <div key={seller.id} className="rounded-2xl border border-rose-100 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <button onClick={() => navigate(`/seller/${seller.id}`)} className="flex min-w-0 items-center gap-3 text-left hover:text-rose-700">
                              {seller.profileImageResolved || seller.profileImage ? (
                                <span className="h-10 w-10 overflow-hidden rounded-xl ring-1 ring-rose-100">
                                  <ProductImage src={seller.profileImageResolved || seller.profileImage} label={seller.name || "Seller"} />
                                </span>
                              ) : (
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-xs font-bold text-rose-700">
                                  {getConversationInitials(seller.name)}
                                </span>
                              )}
                              <span className="truncate font-medium">{seller.name}</span>
                            </button>
                            <button
                              onClick={() => toggleSellerFollow(seller.id)}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${followedSellerIds.has(seller.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                            >
                              {followedSellerIds.has(seller.id) ? tx("bookmarked") : tx("bookmark")}
                            </button>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{seller.location}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">{tx("productsLabel")}</div>
                    <div className="mt-2 space-y-2">
                      {quickProductResults.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noProductsFound")}</div>
                      ) : quickProductResults.map((product) => (
                        <div key={product.id} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-rose-100 px-4 py-3">
                          <button onClick={() => navigate(`/product/${product.slug}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left hover:text-rose-700">
                            <span className="h-10 w-10 overflow-hidden rounded-xl ring-1 ring-rose-100">
                              {product.image ? <ProductImage src={product.image} label={product.imageName || product.title} /> : <ProductImage label={product.title} />}
                            </span>
                            <span className="truncate font-medium">{product.title}</span>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{formatPriceTHB(product.price)}</span>
                            <button
                              type="button"
                              onClick={() => toggleProductWatch?.(product.id)}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${watchedProductIds.has(product.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                            >
                              {watchedProductIds.has(product.id) ? "Liked" : "Like"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">{tx("barsLabel")}</div>
                    <div className="mt-2 space-y-2">
                      {(quickBarResults || []).length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noBarsFound")}</div>
                      ) : (quickBarResults || []).map((bar) => (
                        <div key={bar.id} className="rounded-2xl border border-rose-100 px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <button onClick={() => navigate(`/bar/${bar.id}`)} className="flex min-w-0 items-center gap-3 text-left hover:text-rose-700">
                              {bar.profileImage ? (
                                <span className="h-10 w-10 overflow-hidden rounded-xl ring-1 ring-rose-100">
                                  <ProductImage src={bar.profileImage} label={bar.profileImageName || bar.name || "Bar"} />
                                </span>
                              ) : (
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xs font-bold text-indigo-700">
                                  {getConversationInitials(bar.name)}
                                </span>
                              )}
                              <span className="truncate font-medium">{bar.name}</span>
                            </button>
                            <button
                              onClick={() => toggleBarFollow(bar.id)}
                              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${followedBarIds.has(bar.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                            >
                              {followedBarIds.has(bar.id) ? tx("followingBar") : tx("followBar")}
                            </button>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{bar.location || tx("locationNotSet")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ) : null}

              <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">{accountText.profile}</h3>
                  <button
                    type="button"
                    onClick={() => document.getElementById("buyer-contact")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="rounded-xl border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"
                    aria-label={tx("editProfileDetails")}
                    title={tx("editProfileDetails")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div>{accountForm.name || tx("fullName")}</div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-600" /> {accountForm.address || tx("noAddressSaved")}</div>
                  <div>
                    {accountForm.city || tx("cityFallback")}
                    {accountForm.region ? `, ${accountForm.region}` : ""}
                  </div>
                  <div>{accountForm.postalCode || tx("postalCodeFallback")}</div>
                  <div>{accountForm.country || tx("countryFallback")}</div>
                  <div>{accountForm.phone || tx("phoneNotSet")}</div>
                  <div>{accountForm.email || tx("emailNotSet")}</div>
                </div>
              </div>

              <details id="buyer-contact" className="overflow-hidden rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">{accountText.contactDetails}</h3>
                    <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                  </div>
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tx("updateContactHelp")}</p>
                <div className="mt-5 grid gap-4">
                  <input value={accountForm.name} onChange={(e) => updateAccountField("name", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("fullName")} />
                  <input value={accountForm.email} onChange={(e) => updateAccountField("email", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("emailPlaceholder")} />
                  <input value={accountForm.phone} onChange={(e) => updateAccountField("phone", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={`${tx("phone")} (optional)`} />
                  {currentUser.role === "buyer" ? (
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span className="font-medium">{accountText.timeFormat}</span>
                      <select
                        value={accountForm.timeFormat || "12h"}
                        onChange={(e) => updateAccountField("timeFormat", e.target.value)}
                        className="rounded-2xl border border-slate-200 px-4 py-3"
                      >
                        <option value="12h">{localizeOptionLabel("12-hour", uiLanguage)}</option>
                        <option value="24h">{localizeOptionLabel("24-hour", uiLanguage)}</option>
                      </select>
                    </label>
                  ) : null}
                  <select value={(isoCountries || []).some((c) => c.code === accountForm.country) ? accountForm.country : ""} onChange={(e) => updateAccountField("country", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <option value="">{tx("country")}</option>
                    {(isoCountries || []).map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <textarea value={accountForm.address} onChange={(e) => updateAccountField("address", e.target.value)} className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("address")} />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input value={accountForm.city} onChange={(e) => updateAccountField("city", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("city")} />
                    <input value={accountForm.region || ""} onChange={(e) => updateAccountField("region", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={accountAddressMeta.regionPlaceholder} />
                  </div>
                  <input value={accountForm.postalCode || ""} onChange={(e) => updateAccountField("postalCode", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={accountAddressMeta.postalPlaceholder} />
                  {currentUser.role === "seller" ? (
                    <>
                      <div className="col-span-full mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Profile details (shown publicly)</div>
                      <input value={accountForm.height || ""} onChange={(e) => updateAccountField("height", e.target.value)} type="number" min="0" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Height (cm)" />
                      <input value={accountForm.weight || ""} onChange={(e) => updateAccountField("weight", e.target.value)} type="number" min="0" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Weight (kg)" />
                      <select value={accountForm.hairColor || ""} onChange={(e) => updateAccountField("hairColor", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <option value="">Hair color</option>
                        {HAIR_COLOR_OPTIONS.map((color) => <option key={color} value={color}>{localizeOptionLabel(color, uiLanguage)}</option>)}
                      </select>
                      <select value={accountForm.braSize || ""} onChange={(e) => updateAccountField("braSize", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <option value="">Bra size</option>
                        {BRA_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                      <select value={accountForm.pantySize || ""} onChange={(e) => updateAccountField("pantySize", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3">
                        <option value="">Panty size</option>
                        {PANTY_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </>
                  ) : null}
                  <button onClick={saveAccountDetails} className="inline-flex w-auto justify-self-start rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">{accountText.saveDetails}</button>
                  {accountSaveMessage ? <div className="text-sm font-medium text-emerald-700">{accountSaveMessage}</div> : null}
                </div>
              </details>

              {currentUser.role === "buyer" ? (
                <details className="overflow-hidden rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-100" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-slate-900">Login credentials</div>
                      <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                    </div>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600">Update your account email or password. Enter your current password to confirm.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input
                      type="password"
                      value={accountCredentialForm.currentPassword}
                      onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Current password"
                    />
                    <input
                      type="email"
                      value={accountCredentialForm.newEmail}
                      onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, newEmail: event.target.value }))}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="New email"
                    />
                    <input
                      type="password"
                      value={accountCredentialForm.newPassword}
                      onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="New password"
                    />
                    <input
                      type="password"
                      value={accountCredentialForm.confirmNewPassword}
                      onChange={(event) => setAccountCredentialForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      placeholder="Confirm password"
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">Use at least 8 characters with 1 number and 1 symbol.</div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={submitAccountCredentialChanges}
                      disabled={accountCredentialSaving}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white ${accountCredentialSaving ? "cursor-not-allowed bg-rose-300" : "bg-rose-600 hover:bg-rose-700"}`}
                    >
                      {accountCredentialSaving ? "Saving..." : "Update credentials"}
                    </button>
                    {accountCredentialMessage ? (
                      <div className={`text-sm font-medium ${accountCredentialTone === "error" ? "text-rose-700" : accountCredentialTone === "success" ? "text-emerald-700" : "text-slate-700"}`}>
                        {accountCredentialMessage}
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}

              <details className="overflow-hidden rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">{accountText.orderHistory}</h3>
                    <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                  </div>
                </summary>
                <div className="mt-2 flex items-center justify-end gap-3">
                  {recentBuyerOrders.length > 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showAllOrderHistory;
                        setShowAllOrderHistory(next);
                        setOrderHistoryPage(1);
                      }}
                      className="text-sm font-semibold text-rose-700"
                    >
                      {showAllOrderHistory ? "Show less" : "View all"}
                    </button>
                  ) : null}
                </div>
                <div className="mt-5 space-y-3">
                  {recentBuyerOrders.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{tx("purchaseHistoryHelp")}</div>
                  ) : visibleOrderHistory.map((order) => (
                    <div key={`${order.id}-history`} className="grid gap-3 rounded-2xl border border-rose-100 p-4 md:grid-cols-[1.3fr_0.9fr_0.8fr_1fr]">
                      <div>
                        <div className="font-semibold">{order.id}</div>
                        <div className="mt-1 text-sm text-slate-500">{order.items.length} {tx("items")}</div>
                      </div>
                      <div className="text-sm text-slate-600">{new Date(order.createdAt || Date.now()).toLocaleDateString()}</div>
                      <div className="text-sm text-slate-600">{localizePaymentStatus(order.paymentStatus)}</div>
                      <div className="flex items-center justify-between gap-2 md:justify-end">
                        <div className="text-sm font-semibold text-rose-700">{formatPriceTHB(order.total)}</div>
                        {(() => {
                          const cooldownRemainingSeconds = Math.max(
                            0,
                            Math.ceil((Number(receiptCooldownByOrderId[order.id] || 0) - receiptCooldownNow) / 1000)
                          );
                          const cooldownActive = cooldownRemainingSeconds > 0;
                          return (
                        <button
                          type="button"
                          onClick={() => handleResendReceipt(order)}
                          disabled={resendingReceiptOrderId === order.id || cooldownActive}
                          className={`rounded-xl border px-2.5 py-1 text-xs font-semibold ${
                            (resendingReceiptOrderId === order.id || cooldownActive)
                              ? "cursor-not-allowed border-slate-200 text-slate-400"
                              : "border-rose-200 text-rose-700 hover:bg-rose-50"
                          }`}
                        >
                          {resendingReceiptOrderId === order.id
                            ? tx("resendingReceipt")
                            : cooldownActive
                              ? `${tx("receiptRecentlySent")} (${cooldownRemainingSeconds}s)`
                              : tx("resendReceipt")}
                        </button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
                {receiptActionMessage ? (
                  <div className={`mt-3 text-sm font-medium ${receiptActionTone === "success" ? "text-emerald-700" : receiptActionTone === "error" ? "text-rose-700" : "text-slate-700"}`}>
                    {receiptActionMessage}
                  </div>
                ) : null}
                {showAllOrderHistory && recentBuyerOrders.length > detailPageSize ? (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderHistoryPage((prev) => Math.max(1, prev - 1))}
                      disabled={orderHistoryPage <= 1}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${orderHistoryPage <= 1 ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"}`}
                    >
                      Previous
                    </button>
                    <div className="text-xs text-slate-500">Page {orderHistoryPage} of {orderHistoryPageCount}</div>
                    <button
                      type="button"
                      onClick={() => setOrderHistoryPage((prev) => Math.min(orderHistoryPageCount, prev + 1))}
                      disabled={orderHistoryPage >= orderHistoryPageCount}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${orderHistoryPage >= orderHistoryPageCount ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"}`}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </details>

              <details className="overflow-hidden rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6" open>
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">{accountText.billingLedger}</h3>
                    <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Close</span>
                  </div>
                </summary>
                <div className="mt-2 flex items-center justify-end gap-3">
                  <div className="flex items-center gap-3">
                    {buyerLedger.length > 3 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next = !showAllBillingLedger;
                          setShowAllBillingLedger(next);
                          setBillingLedgerPage(1);
                        }}
                        className="text-sm font-semibold text-rose-700"
                      >
                        {showAllBillingLedger ? "Show less" : "View all"}
                      </button>
                    ) : null}
                    <button onClick={markAllNotificationsRead} className="text-sm font-semibold text-rose-700">{tx("markNotificationsRead")}</button>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {buyerLedger.length === 0 ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{tx("noWalletActivity")}</div> : visibleBillingLedger.map((entry) => (
                    <div key={entry.id} className="grid gap-2 rounded-2xl border border-rose-100 p-4 md:grid-cols-[1.2fr_0.9fr_0.7fr]">
                      <div>
                        <div className="font-semibold">{entry.description}</div>
                        <div className="mt-1 text-sm text-slate-500">{entry.type}</div>
                      </div>
                      <div className="text-sm text-slate-600">{new Date(entry.createdAt).toLocaleDateString()}</div>
                      <div className={`text-sm font-semibold ${entry.amount >= 0 ? "text-emerald-600" : "text-rose-700"}`}>{entry.amount >= 0 ? "+" : ""}{formatPriceTHB(Math.abs(entry.amount))}</div>
                    </div>
                  ))}
                </div>
                {showAllBillingLedger && buyerLedger.length > detailPageSize ? (
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setBillingLedgerPage((prev) => Math.max(1, prev - 1))}
                      disabled={billingLedgerPage <= 1}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${billingLedgerPage <= 1 ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"}`}
                    >
                      Previous
                    </button>
                    <div className="text-xs text-slate-500">Page {billingLedgerPage} of {billingLedgerPageCount}</div>
                    <button
                      type="button"
                      onClick={() => setBillingLedgerPage((prev) => Math.min(billingLedgerPageCount, prev + 1))}
                      disabled={billingLedgerPage >= billingLedgerPageCount}
                      className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${billingLedgerPage >= billingLedgerPageCount ? "cursor-not-allowed border-slate-200 text-slate-400" : "border-rose-200 text-rose-700"}`}
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </details>

          </div>
          {showCheckoutTopUpSuccessPopup ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-rose-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900">Top-up successful</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Added <span className="font-semibold text-slate-900">{formatPriceTHB(topUpAmount)}</span> to your wallet.
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Returning to checkout...</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {currentUser.role === "buyer" ? (
            <div className="fixed inset-x-0 bottom-3 z-30 px-3 lg:hidden">
              <div className="mx-auto grid w-full max-w-7xl grid-cols-4 gap-2 rounded-2xl border border-rose-200 bg-white p-2 shadow-lg">
                <button onClick={() => scrollToSection("buyer-orders")} className="min-h-[44px] rounded-xl border border-rose-200 px-2.5 py-2.5 text-sm font-semibold text-rose-700">{accountText.orders}</button>
                <button onClick={() => navigate("/buyer-messages")} className="min-h-[44px] rounded-xl border border-rose-200 px-2.5 py-2.5 text-sm font-semibold text-rose-700">{accountText.messages}</button>
                <button onClick={() => scrollToSection("buyer-wallet")} className="min-h-[44px] rounded-xl border border-rose-200 px-2.5 py-2.5 text-sm font-semibold text-rose-700">{accountText.wallet}</button>
                <button onClick={() => scrollToSection("buyer-contact")} className="min-h-[44px] rounded-xl border border-rose-200 px-2.5 py-2.5 text-sm font-semibold text-rose-700">{accountText.contact}</button>
              </div>
            </div>
          ) : null}
          </>
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
              <h2 className="text-2xl font-bold text-slate-900">{tx("unknownAccountRoleTitle")}</h2>
              <p className="mt-2 text-slate-600">{tx("unknownAccountRoleHelp")}</p>
              <button type="button" onClick={() => navigate("/")} className="mt-6 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700">
                {tx("goHome")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function BuyerMessagesPage({
  currentUser,
  sellerMap,
  buyerMessageSellerSearch,
  setBuyerMessageSellerSearch,
  buyerMessageSellerResults,
  buyerMessageProductFilters,
  buyerMessageFilterOptions,
  updateBuyerMessageProductFilter,
  buyerMessageProductResults,
  buyerConversations,
  buyerDashboardConversationId,
  setBuyerDashboardConversationId,
  buyerDashboardConversationMessages,
  buyerDashboardMessageDraft,
  setBuyerDashboardMessageDraft,
  sendBuyerDashboardMessage,
  buyerDashboardMessageError,
  messageReports,
  reportDirectMessage,
  reportingDirectMessageId,
  startBuyerConversationWithSeller,
  currentWalletBalance,
  uiLanguage = "en",
  navigate,
}) {
  const locale = ACCOUNT_PAGE_I18N[uiLanguage] ? uiLanguage : "en";
  const accountText = ACCOUNT_PAGE_I18N[locale];
  const tx = (key) => ACCOUNT_PAGE_I18N[locale]?.[key] || ACCOUNT_PAGE_I18N.en[key] || key;
  const [showOriginalMessageById, setShowOriginalMessageById] = useState({});
  const [messageReportOpenById, setMessageReportOpenById] = useState({});
  const [messageReportReasonById, setMessageReportReasonById] = useState({});
  const [messageReportDetailsById, setMessageReportDetailsById] = useState({});
  const [messageReportErrorById, setMessageReportErrorById] = useState({});
  const reportedOpenMessageIds = useMemo(
    () => new Set(
      (messageReports || [])
        .filter((entry) => entry.reporterUserId === currentUser?.id && entry.status !== "resolved" && entry.status !== "dismissed")
        .map((entry) => entry.messageId)
    ),
    [messageReports, currentUser?.id]
  );
  const messageReportReasonOptions = [
    { value: "direct_payment_request", label: tx("reportReasonDirectPayment") },
    { value: "off_platform_contact", label: tx("reportReasonOffPlatform") },
    { value: "harassment_abuse", label: tx("reportReasonHarassment") },
    { value: "scam_fraud", label: tx("reportReasonScam") },
    { value: "other", label: tx("reportReasonOther") },
  ];
  const getMessageReportReasonLabel = (reasonCategory) => (
    messageReportReasonOptions.find((entry) => entry.value === reasonCategory)?.label || tx("reportReasonOther")
  );

  const getConversationInitials = (name) => {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "SL";
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
  };
  const resolveConversationSellerName = (conversationId) => {
    const sellerId = String(conversationId || "").split("__")[1] || "";
    return sellerMap?.[sellerId]?.name || tx("seller");
  };
  const resolveConversationMessageBody = (message) => {
    if (!message) return "";
    if (showOriginalMessageById[message.id]) return message.body || "";
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    return String(message.translations?.[preferredLanguage] || message.translations?.en || message.body || "");
  };
  const canToggleConversationTranslation = (message) => {
    if (!message || !message.translations) return false;
    const original = String(message.body || "");
    const preferredLanguage = ["en", "th", "my", "ru"].includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : "en";
    const translated = String(message.translations?.[preferredLanguage] || message.translations?.en || "");
    const isOwnMessage = (message?.senderId || message?.senderUserId) === currentUser?.id;
    return !isOwnMessage && Boolean(translated) && translated !== original;
  };
  const canAffordMessage = Number(currentWalletBalance || 0) >= MESSAGE_FEE_THB;
  const submitMessageReport = async (message) => {
    if (!message?.id) return;
    const reasonCategory = messageReportReasonById[message.id] || "off_platform_contact";
    const details = String(messageReportDetailsById[message.id] || "").trim();
    if (reasonCategory === "other" && !details) {
      setMessageReportErrorById((prev) => ({ ...prev, [message.id]: tx("reportDetailsRequiredOther") }));
      return;
    }
    const reasonLabel = getMessageReportReasonLabel(reasonCategory);
    const reportBody = details ? `${reasonLabel}: ${details}` : reasonLabel;
    const didSubmit = await reportDirectMessage?.(message.id, reasonCategory, reportBody);
    if (!didSubmit) {
      setMessageReportErrorById((prev) => ({ ...prev, [message.id]: tx("reportSubmitFailed") }));
      return;
    }
    setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
    setMessageReportOpenById((prev) => ({ ...prev, [message.id]: false }));
  };

  if (!currentUser || currentUser.role !== "buyer") {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <h2 className="text-2xl font-bold">{tx("loginRequired")}</h2>
          <p className="mt-2 text-slate-600">{tx("loginHelp")}</p>
          <button onClick={() => navigate("/account")} className="mt-4 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
            {tx("profile")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:py-16">
      <SectionTitle eyebrow="Account" title={tx("messagingCenter")} subtitle={tx("messagingHelp")} />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <button type="button" onClick={() => navigate("/account")} className="min-h-[44px] w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700 sm:w-auto">
          {tx("profile")}
        </button>
        <button className="min-h-[44px] w-full rounded-xl bg-rose-600 px-4 py-3 text-center text-sm font-semibold text-white sm:w-auto">
          {tx("messages")}
        </button>
        <button type="button" onClick={() => navigate("/custom-requests")} className="min-h-[44px] w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700 sm:w-auto">
          {tx("customRequests")}
        </button>
        <button type="button" onClick={() => navigate("/stories")} className="min-h-[44px] w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-center text-sm font-semibold text-rose-700 sm:w-auto">
          {tx("sellerFeed")}
        </button>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">{tx("messagingCenter")}</h3>
          <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{formatPriceTHB(MESSAGE_FEE_THB)} {tx("perMessage")}</div>
        </div>
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {tx("safetyNoticeKeepOnPlatform")}
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-rose-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">{tx("findSellers")}</div>
              <input
                value={buyerMessageSellerSearch}
                onChange={(event) => setBuyerMessageSellerSearch(event.target.value)}
                className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={tx("searchSellers")}
              />
              <div className="mt-3 space-y-2">
                {buyerMessageSellerResults.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noSellerSearchResults")}</div>
                ) : buyerMessageSellerResults.map((seller) => (
                  <button
                    key={seller.id}
                    onClick={() => startBuyerConversationWithSeller(seller.id)}
                    className="min-h-[44px] flex w-full items-center justify-between rounded-2xl border border-rose-100 px-3 py-2.5 text-left hover:bg-rose-50"
                  >
                    <span className="text-sm font-medium">{seller.name}</span>
                    <span className="text-xs text-slate-500">{tx("message")}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-rose-100 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">{tx("findByProduct")}</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  value={buyerMessageProductFilters.search}
                  onChange={(event) => updateBuyerMessageProductFilter("search", event.target.value)}
                  className="min-h-[44px] rounded-2xl border border-slate-200 px-3 py-2.5 text-sm sm:col-span-2"
                  placeholder={tx("searchProductOrSeller")}
                />
                <select value={buyerMessageProductFilters.size} onChange={(event) => updateBuyerMessageProductFilter("size", event.target.value)} className="min-h-[44px] rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                  {(buyerMessageFilterOptions?.size || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                </select>
                <select value={buyerMessageProductFilters.style} onChange={(event) => updateBuyerMessageProductFilter("style", event.target.value)} className="min-h-[44px] rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                  {(buyerMessageFilterOptions?.style || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                </select>
                <select value={buyerMessageProductFilters.fabric} onChange={(event) => updateBuyerMessageProductFilter("fabric", event.target.value)} className="min-h-[44px] rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                  {(buyerMessageFilterOptions?.fabric || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                </select>
                <select value={buyerMessageProductFilters.daysWorn} onChange={(event) => updateBuyerMessageProductFilter("daysWorn", event.target.value)} className="min-h-[44px] rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
                  {(buyerMessageFilterOptions?.daysWorn || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                </select>
              </div>
              <div className="mt-3 space-y-2">
                {buyerMessageProductResults.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noProductFilterResults")}</div>
                ) : buyerMessageProductResults.slice(0, 5).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => startBuyerConversationWithSeller(product.sellerId)}
                    className="min-h-[44px] flex w-full items-center justify-between rounded-2xl border border-rose-100 px-3 py-2.5 text-left hover:bg-rose-50"
                  >
                    <span className="text-sm font-medium">{product.title}</span>
                    <span className="text-xs text-slate-500">{sellerMap[product.sellerId]?.name || tx("seller")} · {product.daysWorn || tx("notSpecified")}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-rose-100 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">{tx("conversationList")}</div>
                {(() => {
                  const barOptionsSet = new Map();
                  buyerConversations.forEach((conv) => {
                    const barId = sellerMap[conv.sellerId]?.affiliatedBarId;
                    if (barId && barMap[barId]) {
                      barOptionsSet.set(barId, barMap[barId].name || barId);
                    }
                  });
                  const barOptions = Array.from(barOptionsSet.entries()).sort((a, b) => a[1].localeCompare(b[1]));
                  if (barOptions.length === 0) return null;
                  return (
                    <select
                      value={buyerConversationBarFilter}
                      onChange={(e) => setBuyerConversationBarFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="all">{tx("allBars") || "All bars"}</option>
                      {barOptions.map(([barId, barName]) => (
                        <option key={barId} value={barId}>{barName}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>
              <div className="mt-3 space-y-2">
                {(() => {
                  const filtered = buyerConversationBarFilter === "all"
                    ? buyerConversations
                    : buyerConversations.filter((conv) => sellerMap[conv.sellerId]?.affiliatedBarId === buyerConversationBarFilter);
                  if (filtered.length === 0) {
                    return <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("conversationsAppearHere")}</div>;
                  }
                  return filtered.map((conversation) => {
                    const seller = sellerMap[conversation.sellerId];
                    const sellerName = seller?.name || tx("seller");
                    const sellerInitials = getConversationInitials(sellerName);
                    const barName = seller?.affiliatedBarId && barMap[seller.affiliatedBarId]?.name;
                    return (
                      <button
                        key={conversation.conversationId}
                        onClick={() => setBuyerDashboardConversationId(conversation.conversationId)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left ${buyerDashboardConversationId === conversation.conversationId ? "border-rose-300 bg-rose-50" : "border-rose-100"}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">{sellerInitials}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold">{tx("conversationWith")} {sellerName}</div>
                            {barName ? <div className="mt-0.5 text-xs text-indigo-600">{barName}</div> : null}
                            <div className="mt-1 truncate text-sm text-slate-500">{conversation.latestBody}</div>
                          </div>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-100 p-4">
            <div className="text-sm font-semibold">
              {buyerDashboardConversationId
                ? `${tx("conversationWith")} ${sellerMap[buyerDashboardConversationId.split("__")[1]]?.name || tx("seller")}`
                : tx("selectOrStartConversation")}
            </div>
            {buyerDashboardConversationId ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-700">
                  {getConversationInitials(resolveConversationSellerName(buyerDashboardConversationId))}
                </span>
                <span>{tx("chattingWith")} {resolveConversationSellerName(buyerDashboardConversationId)}</span>
              </div>
            ) : null}
            <div ref={buyerMessagesContainerRef} className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
              {buyerDashboardConversationMessages.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noMessagesInThread")}</div>
              ) : buyerDashboardConversationMessages.map((message) => (
                <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === "buyer" ? "ml-auto bg-rose-100 text-rose-900 ring-1 ring-rose-200" : "bg-slate-100 text-slate-700"}`}>
                  {message.mediaUrl ? (
                    message.mediaType === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(message.mediaUrl)
                      ? <video src={message.mediaUrl} controls playsInline loop muted className="mb-2 max-h-48 rounded-xl" />
                      : <img src={message.mediaUrl} alt="" className="mb-2 max-h-48 rounded-xl object-cover" />
                  ) : null}
                  <div>{resolveConversationMessageBody(message)}</div>
                  <div className={`mt-1 text-[11px] ${message.senderRole === "buyer" ? "text-rose-100" : "text-slate-500"}`}>
                    {formatTimeNoSeconds(message.createdAt)}
                  </div>
                  {canToggleConversationTranslation(message) ? (
                    <button
                      type="button"
                      onClick={() => setShowOriginalMessageById((prev) => ({ ...prev, [message.id]: !prev[message.id] }))}
                      className={`mt-1 text-[11px] font-semibold ${message.senderRole === "buyer" ? "text-rose-100" : "text-slate-500"}`}
                    >
                      {showOriginalMessageById[message.id] ? tx("showTranslation") : tx("showOriginal")}
                    </button>
                  ) : null}
                  {message.senderRole === "seller" ? (
                    <div className="mt-2">
                      {reportedOpenMessageIds.has(message.id) ? (
                        <div className="text-[11px] font-semibold text-amber-700">{tx("alreadyReportedMessage")}</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setMessageReportOpenById((prev) => ({ ...prev, [message.id]: !prev[message.id] }));
                            setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
                            if (!messageReportReasonById[message.id]) {
                              setMessageReportReasonById((prev) => ({ ...prev, [message.id]: "off_platform_contact" }));
                            }
                          }}
                          className="text-[11px] font-semibold text-rose-700"
                        >
                          {tx("reportMessage")}
                        </button>
                      )}
                      {messageReportOpenById[message.id] && !reportedOpenMessageIds.has(message.id) ? (
                        <div className="mt-2 space-y-2 rounded-xl border border-rose-200 bg-white p-3">
                          <div className="text-[11px] font-semibold text-slate-600">{tx("reportReasonLabel")}</div>
                          <select
                            value={messageReportReasonById[message.id] || "off_platform_contact"}
                            onChange={(event) => {
                              const nextReason = event.target.value;
                              setMessageReportReasonById((prev) => ({ ...prev, [message.id]: nextReason }));
                              setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                          >
                            {messageReportReasonOptions.map((entry) => (
                              <option key={entry.value} value={entry.value}>{entry.label}</option>
                            ))}
                          </select>
                          <textarea
                            value={messageReportDetailsById[message.id] || ""}
                            onChange={(event) => {
                              setMessageReportDetailsById((prev) => ({ ...prev, [message.id]: event.target.value }));
                              setMessageReportErrorById((prev) => ({ ...prev, [message.id]: "" }));
                            }}
                            className="min-h-[72px] w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                            placeholder={tx("reportDetailsOptional")}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => submitMessageReport(message)}
                              disabled={reportingDirectMessageId === message.id}
                              className={`rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 ${reportingDirectMessageId === message.id ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              {reportingDirectMessageId === message.id ? tx("reportingMessage") : tx("submitReport")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setMessageReportOpenById((prev) => ({ ...prev, [message.id]: false }))}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                          {messageReportErrorById[message.id] ? (
                            <div className="text-[11px] font-medium text-rose-600">{messageReportErrorById[message.id]}</div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              <textarea
                value={buyerDashboardMessageDraft}
                onChange={(event) => setBuyerDashboardMessageDraft(event.target.value)}
                className="min-h-[110px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder={tx("writeMessage")}
              />
              <button
                onClick={sendBuyerDashboardMessage}
                disabled={!buyerDashboardConversationId || !buyerDashboardMessageDraft.trim()}
                className="w-full rounded-2xl bg-rose-500 px-5 py-3 font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {tx("sendMessage")} ({formatPriceTHB(MESSAGE_FEE_THB)})
              </button>
              {buyerDashboardMessageError ? <div className="text-sm font-medium text-rose-600">{buyerDashboardMessageError}</div> : null}
              {buyerDashboardMessageError && !canAffordMessage ? (
                <button type="button" onClick={() => navigate("/account")} className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
                  Top up wallet
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AppealsPage({
  currentUser,
  userStrikes,
  userAppeals,
  submitStrikeAppeal,
  submittingStrikeAppeal,
  navigate,
  onOpenLogin
}) {
  const [appealMessage, setAppealMessage] = useState("");
  const activeStrikes = useMemo(
    () => (userStrikes || []).filter((strike) => strike.userId === currentUser?.id && strike.status === "active"),
    [userStrikes, currentUser]
  );
  const myAppeals = useMemo(
    () => (userAppeals || []).filter((appeal) => appeal.userId === currentUser?.id),
    [userAppeals, currentUser]
  );
  const canSubmitAppeal = Boolean(currentUser && (currentUser.accountStatus === "frozen" || activeStrikes.length > 0));

  if (!currentUser) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16">
        <div className="rounded-3xl bg-white p-8 text-center shadow-md ring-1 ring-rose-100">
          <h2 className="text-2xl font-bold">Login required</h2>
          <p className="mt-2 text-sm text-slate-600">Please login to submit a moderation appeal.</p>
          <button onClick={() => (onOpenLogin ? onOpenLogin() : navigate("/login"))} className="mt-4 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
            Go to login
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-16">
      <SectionTitle eyebrow="Account support" title="Moderation appeal center" subtitle="If your account was frozen after two strikes, submit an appeal here for admin review." />
      {currentUser.accountStatus === "frozen" ? (
        <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h3 className="text-base font-semibold text-amber-900">Your account is temporarily frozen</h3>
              <p className="mt-1 text-sm text-amber-900/90">
                You can still use this page to appeal. Most appeals are reviewed within 24-48 hours.
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-900/90">
                <li>Step 1: Review strike details below.</li>
                <li>Step 2: Submit a clear appeal with context.</li>
                <li>Step 3: Watch your appeal history for the decision.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
          <h3 className="text-xl font-semibold">Your account status</h3>
          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            Status: <span className="font-semibold">{currentUser.accountStatus || "active"}</span>
            <br />
            Active strikes: <span className="font-semibold">{activeStrikes.length}</span>
          </div>
          <div className="mt-4 space-y-3">
            {activeStrikes.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                No active strikes on your account.
                <div className="mt-2">
                  <button onClick={() => navigate("/account")} className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                    Return to account
                  </button>
                </div>
              </div>
            ) : activeStrikes.map((strike) => (
              <div key={strike.id} className="rounded-2xl border border-rose-100 p-4">
                <div className="text-sm font-semibold">{strike.sourceType === "comment" ? "Comment violation" : "Post violation"}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDateTimeNoSeconds(strike.createdAt || Date.now())}</div>
                {strike.reason ? <div className="mt-2 text-sm text-slate-700">{strike.reason}</div> : null}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
          <h3 className="text-xl font-semibold">Submit an appeal</h3>
          <p className="mt-2 text-sm text-slate-600">Explain what happened and why you want your account reviewed for reactivation.</p>
          {!canSubmitAppeal ? (
            <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
              Appeals are only available when your account is frozen or has active strikes.
            </div>
          ) : null}
          <textarea
            value={appealMessage}
            onChange={(event) => setAppealMessage(event.target.value)}
            className="mt-4 min-h-[180px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            maxLength={1000}
            placeholder="Share your explanation, context, and commitment to follow community standards."
          />
          <div className="mt-1 text-xs text-slate-500">{appealMessage.length}/1000</div>
          <button
            onClick={() => {
              const submitted = submitStrikeAppeal(appealMessage);
              if (submitted) setAppealMessage("");
            }}
            disabled={submittingStrikeAppeal || !appealMessage.trim() || !canSubmitAppeal}
            className={`mt-4 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 ${submittingStrikeAppeal || !appealMessage.trim() || !canSubmitAppeal ? "cursor-not-allowed opacity-60" : ""}`}
          >
            {submittingStrikeAppeal ? "Submitting..." : "Submit appeal"}
          </button>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            Tip: include dates, message/request IDs, and what steps you will take to prevent future violations.
          </div>
        </div>
      </div>
      <div className="mt-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
        <h3 className="text-xl font-semibold">Appeal history</h3>
        <div className="mt-4 space-y-3">
          {myAppeals.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              No appeals submitted yet.
              <div className="mt-2">
                <button onClick={() => navigate("/contact")} className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                  Contact support
                </button>
              </div>
            </div>
          ) : myAppeals.map((appeal) => (
            <div key={appeal.id} className="rounded-2xl border border-rose-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Status: {appeal.status}</div>
                <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(appeal.createdAt || Date.now())}</div>
              </div>
              <div className="mt-2 text-sm text-slate-700">{appeal.message}</div>
              {appeal.adminDecisionNote ? (
                <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{appeal.adminDecisionNote}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
