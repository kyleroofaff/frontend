import { useEffect, useMemo, useRef, useState } from "react";
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
  formatExchangeEstimates,
  formatPriceTHB,
  localizeOptionLabel,
  MESSAGE_FEE_THB,
  MIN_CUSTOM_REQUEST_PURCHASE_THB,
  MIN_SELLER_PRICE_THB,
  SCENT_LEVEL_OPTIONS,
  SELLER_LANGUAGE_OPTIONS,
  SELLER_SPECIALTY_OPTIONS,
  SHARED_SIZE_OPTIONS,
  STYLE_OPTIONS
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

const SELLER_UI_LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "th", label: "Thai" },
  { value: "my", label: "Burmese" },
  { value: "ru", label: "Russian" }
];

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
    profile: "Profile",
    quickFinder: "Quick finder",
    contactDetails: "Contact details",
    saveDetails: "Save Details",
    timeFormat: "Time format",
    loginHelp: "Use the account menu to sign in and view your order history and profile details.",
    totalOrders: "Total orders",
    processing: "Processing",
    shippedDelivered: "Shipped / delivered",
    seller: "Seller",
    items: "item(s)",
    orderPlaced: "Placed",
    tracking: "Tracking",
    pending: "Pending",
    copied: "Copied",
    copyCode: "Copy code",
    linkCopied: "Link copied",
    copyLink: "Copy link",
    trackPackage: "Track package",
    messagingCenter: "Messaging center",
    perMessage: "per message",
    messagingHelp: "Connect with sellers, ask questions, and continue conversations in one secure thread.",
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
    noDate: "No date",
    newCountSuffix: "new",
    selectOrStartConversation: "Select or start a conversation",
    noMessagesInThread: "No messages in this thread yet. Send the first message to start the conversation.",
    writeMessage: "Write your message",
    sendMessage: "Send message",
    purchaseHistoryHelp: "Your purchase history will appear here after checkout.",
    markNotificationsRead: "Mark notifications read",
    noWalletActivity: "No wallet activity yet.",
    availableBalance: "Available balance",
    walletHelp: "Messages and custom request messages deduct",
    walletHelpPart2: "per message, and custom request submissions cost",
    add: "Add",
    walletProcessing: "Processing wallet top-up...",
    walletAddedPrefix: "Added",
    walletAddedSuffix: "to your wallet.",
    walletPresetHelp: "Use a preset amount to simulate a Stripe wallet top-up.",
    favoritesHelp: "Bookmark sellers for quick profile and messaging access.",
    noFavorites: "No favorite sellers yet. Use Bookmark in the quick finder or Follow in seller feed.",
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
    quickFinderHelp: "Search sellers and products, then jump directly to the page you need.",
    searchSellersProductsStyles: "Search sellers, products, styles...",
    sellersLabel: "Sellers",
    noSellersFound: "No sellers found for this query.",
    bookmarked: "Bookmarked",
    bookmark: "Bookmark",
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
    profile: "โปรไฟล์",
    quickFinder: "ค้นหาแบบรวดเร็ว",
    contactDetails: "ข้อมูลติดต่อ",
    saveDetails: "บันทึกข้อมูล",
    timeFormat: "รูปแบบเวลา",
    loginHelp: "ใช้เมนูบัญชีเพื่อเข้าสู่ระบบและดูประวัติคำสั่งซื้อและข้อมูลโปรไฟล์ของคุณ",
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
    noDate: "ไม่มีวันที่",
    newCountSuffix: "ใหม่",
    selectOrStartConversation: "เลือกหรือเริ่มบทสนทนา",
    noMessagesInThread: "ยังไม่มีข้อความในเธรดนี้ ส่งข้อความแรกเพื่อเริ่มการสนทนา",
    writeMessage: "พิมพ์ข้อความของคุณ",
    sendMessage: "ส่งข้อความ",
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
    walletPresetHelp: "ใช้จำนวนเงินที่กำหนดไว้ล่วงหน้าเพื่อจำลองการเติมเงินผ่าน Stripe",
    favoritesHelp: "บันทึกผู้ขายไว้เพื่อเข้าถึงโปรไฟล์และข้อความได้รวดเร็ว",
    noFavorites: "ยังไม่มีผู้ขายที่ชื่นชอบ ใช้ Bookmark ใน quick finder หรือ Follow ในฟีดผู้ขาย",
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
    profile: "ပရိုဖိုင်",
    quickFinder: "အမြန်ရှာဖွေမှု",
    contactDetails: "ဆက်သွယ်ရန် အချက်အလက်",
    saveDetails: "အချက်အလက် သိမ်းမည်",
    timeFormat: "အချိန်ပုံစံ",
    loginHelp: "သင့် order မှတ်တမ်းနှင့် profile အသေးစိတ်ကြည့်ရန် account menu မှ လော့ဂ်အင်ဝင်ပါ။",
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
    noDate: "ရက်စွဲမရှိ",
    newCountSuffix: "အသစ်",
    selectOrStartConversation: "conversation ရွေးပါ သို့မဟုတ် စတင်ပါ",
    noMessagesInThread: "ဒီ thread ထဲတွင် မက်ဆေ့ချ်မရှိသေးပါ။ conversation စရန် ပထမမက်ဆေ့ချ်ကို ပို့ပါ။",
    writeMessage: "သင့်မက်ဆေ့ချ်ရေးပါ",
    sendMessage: "မက်ဆေ့ချ်ပို့ရန်",
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
    walletPresetHelp: "Stripe wallet top-up ကို စမ်းသပ်ရန် preset ပမာဏကို သုံးပါ။",
    favoritesHelp: "profile နှင့် messaging ကို မြန်မြန်ဝင်ကြည့်ရန် seller များကို bookmark လုပ်ပါ။",
    noFavorites: "အကြိုက်ဆုံး seller မရှိသေးပါ။ quick finder တွင် Bookmark သို့မဟုတ် seller feed တွင် Follow ကို သုံးပါ။",
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
    bookmarked: "bookmark လုပ်ပြီး",
    bookmark: "bookmark",
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
    profile: "Профиль",
    quickFinder: "Быстрый поиск",
    contactDetails: "Контактные данные",
    saveDetails: "Сохранить данные",
    timeFormat: "Формат времени",
    loginHelp: "Используйте меню аккаунта, чтобы войти и просматривать историю заказов и данные профиля.",
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
    noDate: "Нет даты",
    newCountSuffix: "новых",
    selectOrStartConversation: "Выберите или начните диалог",
    noMessagesInThread: "В этом диалоге пока нет сообщений. Отправьте первое сообщение, чтобы начать общение.",
    writeMessage: "Напишите сообщение",
    sendMessage: "Отправить сообщение",
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
    walletPresetHelp: "Используйте готовую сумму для симуляции пополнения кошелька через Stripe.",
    favoritesHelp: "Добавляйте продавцов в закладки для быстрого доступа к профилю и сообщениям.",
    noFavorites: "Пока нет избранных продавцов. Используйте Bookmark в быстром поиске или Follow в ленте продавца.",
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
  { key: "social", label: "Social Moderation", description: "Reports, comments, and feed safety", icon: Shield },
  { key: "products", label: "Product Catalog", description: "Browse seller listings and status", icon: Package },
  { key: "sales", label: "Sales Performance", description: "Revenue and seller leaderboard", icon: ShoppingBag },
  { key: "email", label: "Email Templates", description: "Notification copy, variants, and tests", icon: MessageSquare },
  { key: "payments", label: "Payments", description: "Stripe/webhook monitoring", icon: CreditCard },
  { key: "cms", label: "CMS and Routes", description: "Content model and route map", icon: Database },
  { key: "deployment", label: "Deployment", description: "Architecture and SEO metadata", icon: Upload },
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
    specialtyPlaceholder: "Select specialty",
    shippingPlaceholder: "Select shipping coverage",
    turnaroundPlaceholder: "Select turnaround",
    locations: ["Bangkok, Thailand", "Chiang Mai, Thailand", "Phuket, Thailand", "Pattaya, Thailand", "Khon Kaen, Thailand", "Hat Yai, Thailand"],
    specialties: ["Premium", "Luxury", "Everyday"],
    shipping: ["Worldwide via international carriers", "Asia + Europe via international carriers", "US + Canada via international carriers", "Selected countries via international carriers"],
    turnaround: ["Ships in 1-3 days", "Ships in 2-4 days", "Ships in 3-5 days", "Ships in 5-7 days"],
  },
  th: {
    locationPlaceholder: "เลือกที่ตั้ง",
    specialtyPlaceholder: "เลือกความถนัด",
    shippingPlaceholder: "เลือกพื้นที่จัดส่ง",
    turnaroundPlaceholder: "เลือกระยะเวลาจัดส่ง",
    locations: ["กรุงเทพฯ, ไทย", "เชียงใหม่, ไทย", "ภูเก็ต, ไทย", "พัทยา, ไทย", "ขอนแก่น, ไทย", "หาดใหญ่, ไทย"],
    specialties: ["พรีเมียม", "ลักชัวรี", "ทุกวัน"],
    shipping: ["จัดส่งทั่วโลกผ่านผู้ให้บริการขนส่งระหว่างประเทศ", "เอเชีย + ยุโรป ผ่านผู้ให้บริการขนส่งระหว่างประเทศ", "สหรัฐฯ + แคนาดา ผ่านผู้ให้บริการขนส่งระหว่างประเทศ", "บางประเทศผ่านผู้ให้บริการขนส่งระหว่างประเทศ"],
    turnaround: ["จัดส่งภายใน 1-3 วัน", "จัดส่งภายใน 2-4 วัน", "จัดส่งภายใน 3-5 วัน", "จัดส่งภายใน 5-7 วัน"],
  },
  my: {
    locationPlaceholder: "တည်နေရာရွေးပါ",
    specialtyPlaceholder: "အထူးပြုအမျိုးအစားရွေးပါ",
    shippingPlaceholder: "ပို့ဆောင်ရေးဧရိယာရွေးပါ",
    turnaroundPlaceholder: "ပို့ဆောင်ချိန်ရွေးပါ",
    locations: ["Bangkok, Thailand", "Chiang Mai, Thailand", "Phuket, Thailand", "Pattaya, Thailand", "Khon Kaen, Thailand", "Hat Yai, Thailand"],
    specialties: ["Premium", "Luxury", "Everyday"],
    shipping: ["International carriers ဖြင့် ကမ္ဘာတစ်ဝန်းပို့ဆောင်", "International carriers ဖြင့် Asia + Europe", "International carriers ဖြင့် US + Canada", "ရွေးချယ်ထားသောနိုင်ငံများသို့ international carriers"],
    turnaround: ["1-3 ရက်အတွင်းပို့မည်", "2-4 ရက်အတွင်းပို့မည်", "3-5 ရက်အတွင်းပို့မည်", "5-7 ရက်အတွင်းပို့မည်"],
  },
  ru: {
    locationPlaceholder: "Выберите локацию",
    specialtyPlaceholder: "Выберите специализацию",
    shippingPlaceholder: "Выберите покрытие доставки",
    turnaroundPlaceholder: "Выберите срок отправки",
    locations: ["Бангкок, Таиланд", "Чиангмай, Таиланд", "Пхукет, Таиланд", "Паттайя, Таиланд", "Кхонкэн, Таиланд", "Хатъяй, Таиланд"],
    specialties: ["Премиум", "Люкс", "Повседневный"],
    shipping: ["Доставка по всему миру через международных перевозчиков", "Азия + Европа через международных перевозчиков", "США + Канада через международных перевозчиков", "Выбранные страны через международных перевозчиков"],
    turnaround: ["Отправка за 1-3 дня", "Отправка за 2-4 дня", "Отправка за 3-5 дней", "Отправка за 5-7 дней"],
  },
};

function buildSellerSelectOptions(baseOptions, currentValue) {
  const trimmed = (currentValue || "").trim();
  if (!trimmed || baseOptions.includes(trimmed)) return baseOptions;
  return [trimmed, ...baseOptions];
}

const SELLER_I18N = {
  en: {
    sectionTitle: "Manage your storefront",
    sectionSubtitle: "Update your profile, publish listings, and share lifestyle posts with your audience.",
    language: "Language",
    loginRequired: "Seller login required",
    profileChecklist: "Profile completion checklist",
    profileComplete: "Profile complete. You can publish listings.",
    location: "Location",
    specialty: "Specialty",
    shipping: "Shipping details",
    turnaround: "Turnaround time",
    portfolio: "Portfolio URL",
    bio: "Seller bio",
    saveProfile: "Save profile updates",
    mediaUpload: "Product upload",
    mediaUploadHelp: "Choose an image file for your product listing. Uploaded images are saved to your current workspace session.",
    productTitle: "Product title",
    price: "Price",
    color: "Color",
    imagePreview: "Image preview",
    createDraft: "Create draft listing",
    inbox: "Seller inbox",
    liveUpdates: "Live updates",
    conversations: "conversation(s)",
    noMessages: "No messages yet.",
    customerConversation: "Customer conversation",
    selectConversation: "Select a conversation to reply.",
    replyPlaceholder: "Reply to buyer",
    reply: "Reply",
    createFeedPost: "Create post",
    createFeedPostHelp: "Share a lifestyle update on your public seller feed so buyers can get to know your brand.",
    captionPlaceholder: "Write a caption about your day, mood, or style...",
    postImagePreview: "Post image preview",
    posting: "Posting...",
    postToFeed: "Post",
    yourFeedPosts: "Your posts",
    noPosts: "You have not posted yet. Create your first feed post above.",
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
    delete: "Delete",
    deleting: "Deleting...",
    feedEyebrow: "Seller feed",
    feedTitle: "See what your favorite seller is up to",
    feedSubtitle: "Browse seller lifestyle posts, behind-the-scenes photos, and day-to-day updates.",
    noFeedPosts: "No feed posts yet. Check back soon for new updates.",
    feedImage: "Feed image",
  like: "Like",
  unlike: "Unlike",
  comment: "Comment",
  comments: "comments",
  writeComment: "Write a comment...",
  postComment: "Post",
  loginToEngage: "Login to like and comment on posts.",
  allPosts: "All posts",
  followingPosts: "Following",
  savedPosts: "Saved",
  follow: "Follow",
  following: "Following",
  savePost: "Save post",
  saved: "Saved",
  deleteComment: "Delete",
  noFollowingPosts: "No posts from followed sellers yet.",
  noSavedPosts: "No saved posts yet.",
  noCommentsYet: "No comments yet.",
  commentLimit: "Comment",
  newest: "Newest",
  mostEngaged: "Most engaged",
  followers: "followers",
  searchFeedPlaceholder: "Search seller or caption",
  clearSearch: "Clear",
  noSearchResults: "No posts match your search.",
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
    quickNewPost: "New Post",
    quickListings: "Listings",
    showTranslation: "Show translation",
    showOriginal: "Show original",
    addWalletReplyPrefix: "Add at least",
    addWalletReplySuffix: "to your wallet to reply."
  },
  th: {
    sectionTitle: "จัดการหน้าร้านของคุณ", sectionSubtitle: "อัปเดตโปรไฟล์ เผยแพร่สินค้า และแชร์โพสต์ไลฟ์สไตล์ให้ผู้ซื้อเห็น",
    language: "ภาษา", loginRequired: "ต้องเข้าสู่ระบบผู้ขาย", profileChecklist: "เช็กลิสต์ความสมบูรณ์ของโปรไฟล์",
    profileComplete: "โปรไฟล์ครบถ้วนแล้ว คุณสามารถเผยแพร่สินค้าได้", saveProfile: "บันทึกการอัปเดตโปรไฟล์",
    mediaUpload: "อัปโหลดสินค้า", mediaUploadHelp: "เลือกรูปภาพสำหรับสินค้าของคุณ รูปจะถูกบันทึกในเซสชันปัจจุบัน",
    imagePreview: "ตัวอย่างรูปภาพ", createDraft: "สร้างรายการแบบร่าง", inbox: "กล่องข้อความผู้ขาย",
    liveUpdates: "อัปเดตสด", conversations: "บทสนทนา", noMessages: "ยังไม่มีข้อความ",
    customerConversation: "บทสนทนาลูกค้า", selectConversation: "เลือกบทสนทนาเพื่อตอบกลับ",
    replyPlaceholder: "ตอบกลับผู้ซื้อ", reply: "ตอบกลับ", createFeedPost: "สร้างโพสต์",
    createFeedPostHelp: "แชร์โพสต์ไลฟ์สไตล์ในฟีดสาธารณะของคุณเพื่อให้ผู้ซื้อรู้จักแบรนด์มากขึ้น",
    captionPlaceholder: "เขียนแคปชันเกี่ยวกับวันของคุณ อารมณ์ หรือสไตล์...",
    postImagePreview: "ตัวอย่างรูปโพสต์", posting: "กำลังโพสต์...", postToFeed: "โพสต์",
    yourFeedPosts: "โพสต์ของคุณ", noPosts: "คุณยังไม่มีโพสต์ สร้างโพสต์แรกด้านบนได้เลย",
    noCaption: "ไม่มีแคปชัน", noImage: "ไม่มีรูปภาพ", notifications: "การแจ้งเตือน",
    markAllRead: "อ่านทั้งหมด", noNotifications: "ไม่มีการแจ้งเตือน", listingLibrary: "คลังรายการสินค้า",
    items: "รายการ", noAsset: "ไม่มีไฟล์", worn: "สวมใส่", notSpecified: "ไม่ระบุ",
    publish: "เผยแพร่", viewListing: "ดูรายการ", delete: "ลบ", deleting: "กำลังลบ...",
    feedEyebrow: "ฟีดผู้ขาย", feedTitle: "ดูว่า ผู้ขายคนโปรดของคุณกำลังทำอะไรอยู่",
    feedSubtitle: "ดูโพสต์ไลฟ์สไตล์ เบื้องหลัง และอัปเดตประจำวันจากผู้ขาย",
    noFeedPosts: "ยังไม่มีโพสต์ฟีด กลับมาตรวจสอบอีกครั้งเร็วๆ นี้",
    feedImage: "รูปฟีด", reportCount: "รายงาน",
    reasonInappropriate: "เนื้อหาไม่เหมาะสม", reasonHarassment: "คุกคามหรือกลั่นแกล้ง",
    reasonSpam: "สแปม", reasonImpersonation: "แอบอ้างตัวตน", reasonOther: "อื่นๆ",
    customReason: "เหตุผลเพิ่มเติม", report: "รายงาน", reporting: "กำลังรายงาน...", loadMorePosts: "โหลดโพสต์เพิ่มเติม",
    quickProfile: "โปรไฟล์", quickNewListing: "ลงสินค้าใหม่", quickInbox: "กล่องข้อความ", quickNewPost: "โพสต์ใหม่", quickListings: "รายการสินค้า",
    showTranslation: "แสดงคำแปล", showOriginal: "แสดงต้นฉบับ",
    addWalletReplyPrefix: "เติมอย่างน้อย", addWalletReplySuffix: "ลงในกระเป๋าเพื่อส่งข้อความตอบกลับ"
  },
  my: {
    sectionTitle: "သင့်စတိုးကို စီမံပါ", sectionSubtitle: "ပရိုဖိုင်ပြင်ဆင်ခြင်း၊ စာရင်းထုတ်ခြင်းနှင့် lifestyle post များကို မျှဝေပါ",
    language: "ဘာသာစကား", loginRequired: "ရောင်းသူအကောင့်ဖြင့် ဝင်ရန်လိုအပ်သည်", profileChecklist: "ပရိုဖိုင်ပြည့်စုံမှု စစ်ဆေးစာရင်း",
    profileComplete: "ပရိုဖိုင် ပြည့်စုံပြီးဖြစ်သည်။ စာရင်းတင်နိုင်ပါသည်", saveProfile: "ပရိုဖိုင်ပြင်ဆင်ချက်များ သိမ်းမည်",
    mediaUpload: "ပစ္စည်း အပ်လုဒ်", mediaUploadHelp: "သင့်ပစ္စည်းအတွက် ပုံကိုရွေးပါ။ ပုံကို လက်ရှိ session တွင် သိမ်းဆည်းမည်",
    imagePreview: "ပုံကြိုတင်ကြည့်ရှုမှု", createDraft: "မူကြမ်းစာရင်း ဖန်တီးမည်", inbox: "ရောင်းသူ စာဝင်ပုံး",
    liveUpdates: "တိုက်ရိုက်အပ်ဒိတ်", conversations: "စကားဝိုင်း", noMessages: "မက်ဆေ့ချ် မရှိသေးပါ",
    customerConversation: "ဝယ်သူနှင့် စကားဝိုင်း", selectConversation: "ပြန်ရန် စကားဝိုင်းတစ်ခု ရွေးပါ",
    replyPlaceholder: "ဝယ်သူသို့ ပြန်စာရေးရန်", reply: "ပြန်ပို့မည်", createFeedPost: "Post ဖန်တီးမည်",
    createFeedPostHelp: "သင့် public seller feed တွင် lifestyle update မျှဝေပြီး ဝယ်သူများကို မိတ်ဆက်ပါ",
    captionPlaceholder: "သင့်နေ့စဉ်အကြောင်း၊ စိတ်နေစိတ်ထား သို့မဟုတ် စတိုင်ကို ရေးပါ...",
    postImagePreview: "post ပုံကြိုတင်ကြည့်ရှုမှု", posting: "တင်နေသည်...", postToFeed: "တင်မည်",
    yourFeedPosts: "သင့် post များ", noPosts: "post မရှိသေးပါ။ အပေါ်တွင် ပထမဆုံး post တင်ပါ",
    noCaption: "စာတန်းမရှိ", noImage: "ပုံမရှိ", notifications: "အသိပေးချက်များ",
    markAllRead: "အားလုံးကို ဖတ်ပြီးအဖြစ် မှတ်ရန်", noNotifications: "အသိပေးချက်မရှိပါ",
    listingLibrary: "စာရင်းစာအုပ်", items: "ခု", noAsset: "ဖိုင်မရှိ", worn: "ဝတ်ထားသည့်ကာလ",
    notSpecified: "မသတ်မှတ်ထား", publish: "တင်မည်", viewListing: "စာရင်းကြည့်မည်", delete: "ဖျက်မည်", deleting: "ဖျက်နေသည်...",
    feedEyebrow: "seller feed", feedTitle: "သင်နှစ်သက်သော seller ဘာလုပ်နေလဲ ကြည့်ပါ",
    feedSubtitle: "seller lifestyle post များ၊ နောက်ကွယ်ပုံများနှင့် နေ့စဉ် update များကို ကြည့်ရှုပါ",
    noFeedPosts: "feed post မရှိသေးပါ။ နောက်ပိုင်းတွင် ပြန်စစ်ပါ",
    feedImage: "feed ပုံ", reportCount: "report",
    reasonInappropriate: "မသင့်လျော်သော အကြောင်းအရာ", reasonHarassment: "အနှောင့်အယှက် သို့မဟုတ် အနိုင်ကျင့်မှု",
    reasonSpam: "spam", reasonImpersonation: "အယောင်ဆောင်မှု", reasonOther: "အခြား",
    customReason: "စိတ်ကြိုက် အကြောင်းပြချက်", report: "report", reporting: "report လုပ်နေသည်...", loadMorePosts: "post များထပ်ဖွင့်မည်",
    quickProfile: "ပရိုဖိုင်", quickNewListing: "စာရင်းသစ်", quickInbox: "စာဝင်ပုံး", quickNewPost: "post အသစ်", quickListings: "စာရင်းများ",
    showTranslation: "ဘာသာပြန်ကိုပြရန်", showOriginal: "မူရင်းကိုပြရန်",
    addWalletReplyPrefix: "အနည်းဆုံး", addWalletReplySuffix: "ကို wallet ထဲ ထည့်ပြီးမှ reply ပို့နိုင်ပါမည်။"
  },
  ru: {
    sectionTitle: "Управление витриной", sectionSubtitle: "Обновляйте профиль, публикуйте объявления и делитесь постами.",
    language: "Язык", loginRequired: "Требуется вход продавца", profileChecklist: "Проверка заполнения профиля",
    profileComplete: "Профиль заполнен. Вы можете публиковать объявления.", saveProfile: "Сохранить профиль",
    mediaUpload: "Загрузка товара", mediaUploadHelp: "Выберите изображение для объявления. Файлы сохраняются в текущей сессии.",
    imagePreview: "Предпросмотр изображения", createDraft: "Создать черновик", inbox: "Входящие продавца",
    liveUpdates: "Онлайн-обновления", conversations: "диалог(ов)", noMessages: "Сообщений пока нет.",
    customerConversation: "Диалог с покупателем", selectConversation: "Выберите диалог для ответа",
    replyPlaceholder: "Ответ покупателю", reply: "Ответить", createFeedPost: "Создать пост",
    createFeedPostHelp: "Публикуйте обновления в ленте продавца, чтобы покупатели узнавали ваш бренд.",
    captionPlaceholder: "Напишите подпись к посту...",
    postImagePreview: "Предпросмотр поста", posting: "Публикация...", postToFeed: "Опубликовать",
    yourFeedPosts: "Ваши посты", noPosts: "Постов пока нет. Создайте первый пост выше.",
    noCaption: "Подпись не добавлена.", noImage: "Нет изображения", notifications: "Уведомления",
    markAllRead: "Отметить все прочитанным", noNotifications: "Нет уведомлений.",
    listingLibrary: "Библиотека объявлений", items: "шт.", noAsset: "Нет файла", worn: "Ношение",
    notSpecified: "Не указано", publish: "Опубликовать", viewListing: "Открыть объявление", delete: "Удалить", deleting: "Удаление...",
    feedEyebrow: "Лента продавцов", feedTitle: "Смотрите, чем сейчас занимается ваш любимый продавец",
    feedSubtitle: "Смотрите lifestyle-посты продавцов, закулисные фото и ежедневные обновления.",
    noFeedPosts: "Постов в ленте пока нет. Загляните позже.",
    feedImage: "Фото ленты", reportCount: "жалоб(ы)",
    reasonInappropriate: "Неприемлемый контент", reasonHarassment: "Оскорбления или травля",
    reasonSpam: "Спам", reasonImpersonation: "Выдача себя за другого", reasonOther: "Другое",
    customReason: "Своя причина", report: "Пожаловаться", reporting: "Отправка...", loadMorePosts: "Загрузить еще",
    quickProfile: "Профиль", quickNewListing: "Новое объявление", quickInbox: "Входящие", quickNewPost: "Новый пост", quickListings: "Объявления",
    showTranslation: "Показать перевод", showOriginal: "Показать оригинал",
    addWalletReplyPrefix: "Добавьте минимум", addWalletReplySuffix: "в кошелек, чтобы ответить."
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
  currentUser,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreference,
  sellerDashboardProducts,
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
  sellerFeedVisibility,
  setSellerFeedVisibility,
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
  navigate
}) {
  const locale = SELLER_I18N[sellerLanguage] ? sellerLanguage : "en";
  const t = (key) => SELLER_I18N[locale]?.[key] || SELLER_I18N.en[key] || key;
  const sellerProfileSelectText = SELLER_PROFILE_SELECT_I18N[locale] || SELLER_PROFILE_SELECT_I18N.en;
  const [bulkPrivatePostPrice, setBulkPrivatePostPrice] = useState("1");
  const [privatePostPricingMode, setPrivatePostPricingMode] = useState("all");
  const [bundleDraft, setBundleDraft] = useState({
    title: "",
    price: "",
    selectedProductIds: [],
  });
  const [editingBundleId, setEditingBundleId] = useState("");
  const [bundleMessage, setBundleMessage] = useState("");
  const locationOptions = useMemo(
    () => buildSellerSelectOptions(sellerProfileSelectText.locations, sellerProfileDraft.location),
    [sellerProfileSelectText, sellerProfileDraft.location],
  );
  const barOptions = useMemo(
    () => [...(bars || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [bars],
  );
  const currentAffiliatedBar = currentSellerProfile?.affiliatedBarId
    ? (barMap?.[currentSellerProfile.affiliatedBarId] || null)
    : null;
  const sellerSpecialties = Array.isArray(sellerProfileDraft.specialties) ? sellerProfileDraft.specialties : [];
  const sellerLanguages = Array.isArray(sellerProfileDraft.languages) ? sellerProfileDraft.languages : [];
  const bundleSourceProducts = useMemo(
    () => (sellerDashboardProducts || []).filter((product) => !product?.isBundle),
    [sellerDashboardProducts],
  );
  const existingBundleProducts = useMemo(
    () => (sellerDashboardProducts || []).filter((product) => product?.isBundle),
    [sellerDashboardProducts],
  );
  const feedVisibilityMode = sellerFeedVisibility === "per-post" ? "per-post" : (sellerFeedVisibility === "private" ? "private" : "public");
  const draftPostVisibility = sellerPostDraft.visibility === "private" ? "private" : "public";
  const effectiveDraftVisibility = feedVisibilityMode === "per-post" ? draftPostVisibility : feedVisibilityMode;
  const [customRequestReplyDraftById, setCustomRequestReplyDraftById] = useState({});
  const [customRequestImageDraftById, setCustomRequestImageDraftById] = useState({});
  const [customRequestQuoteDraftById, setCustomRequestQuoteDraftById] = useState({});
  const [customRequestQuoteNoteById, setCustomRequestQuoteNoteById] = useState({});
  const [customRequestQuoteMessageById, setCustomRequestQuoteMessageById] = useState({});
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [showOriginalMessageById, setShowOriginalMessageById] = useState({});
  const sellerNotifications = useMemo(
    () =>
      (notifications || [])
        .filter((notification) => currentUser && notification.userId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [notifications, currentUser]
  );
  const filteredSellerNotifications = useMemo(() => {
    if (notificationFilter === "unread") return sellerNotifications.filter((notification) => !notification.read);
    if (notificationFilter === "messages") return sellerNotifications.filter((notification) => notification.type === "message");
    if (notificationFilter === "engagement") return sellerNotifications.filter((notification) => notification.type === "engagement");
    return sellerNotifications;
  }, [sellerNotifications, notificationFilter]);
  const unreadNotificationCount = sellerNotifications.filter((notification) => !notification.read).length;
  const sellerInboxReceivedCount = (sellerMessageHistory || []).filter((message) => message.senderRole === "buyer").length;
  const sellerInboxSentCount = (sellerMessageHistory || []).filter((message) => message.senderRole === "seller").length;
  const sellerUnreadConversationCount = (sellerInbox || []).filter((message) => message.hasUnread ?? !message.readBySeller).length;
  const firstUnreadSellerConversation = (sellerInbox || []).find((message) => message.hasUnread ?? !message.readBySeller) || null;
  const customRequestMessageStats = useMemo(() => {
    const requestIdSet = new Set((sellerCustomRequests || []).map((request) => request.id));
    let sent = 0;
    let received = 0;
    Object.entries(customRequestMessagesByRequestId || {}).forEach(([requestId, rows]) => {
      if (!requestIdSet.has(requestId)) return;
      (rows || []).forEach((message) => {
        if (message.senderRole === "seller") sent += 1;
        else received += 1;
      });
    });
    return { sent, received };
  }, [sellerCustomRequests, customRequestMessagesByRequestId]);
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
      return "awaiting buyer payment";
    }
    return request?.quoteStatus || "none";
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
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      {isPendingSeller ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Seller application under review</h2>
          <p className="mt-2 text-slate-600">Your application has been submitted and is currently being reviewed. Seller tools unlock as soon as you are approved.</p>
          <div className="mt-2 text-sm text-slate-500">Submitted: {currentUser?.sellerApplicationAt ? formatDateTimeNoSeconds(currentUser.sellerApplicationAt) : "Recently"}</div>
          <div className="mt-1 text-sm text-slate-500">Typical review time: within 24-48 hours.</div>
          <button onClick={() => navigate("/contact")} className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700">Contact support</button>
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
          <p className="mt-2 text-slate-600">Use the Seller Login button in the header to access the seller dashboard.</p>
        </div>
      ) : (
        <>
          <SectionTitle eyebrow="Seller dashboard" title={t("sectionTitle")} subtitle={t("sectionSubtitle")} />
          {sellerUnreadConversationCount > 0 ? (
            <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-amber-900">New buyer messages waiting</div>
                  <div className="mt-1 text-sm text-amber-800">
                    You have {sellerUnreadConversationCount} unread conversation{sellerUnreadConversationCount > 1 ? "s" : ""}. Open inbox to reply quickly.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (firstUnreadSellerConversation?.conversationId) {
                      setSellerSelectedConversationId(firstUnreadSellerConversation.conversationId);
                    }
                    scrollToSection("seller-inbox");
                  }}
                  className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800"
                >
                  Open unread messages
                </button>
              </div>
            </div>
          ) : null}
          <div className="mb-4 lg:hidden">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button onClick={() => scrollToSection("seller-profile")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{t("quickProfile")}</button>
              <button onClick={() => scrollToSection("seller-upload")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{t("quickNewListing")}</button>
              <button onClick={() => scrollToSection("seller-inbox")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{t("quickInbox")} {sellerUnreadConversationCount > 0 ? `(${sellerUnreadConversationCount})` : ""}</button>
              <button onClick={() => scrollToSection("seller-post-create")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{t("quickNewPost")}</button>
              <button onClick={() => scrollToSection("seller-listings")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{t("quickListings")}</button>
            </div>
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
          <div className="mb-6 rounded-3xl border border-rose-100 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-rose-600" />
                <h3 className="text-xl font-semibold">{t("notifications")}</h3>
                {!unreadNotificationCount ? null : (
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadNotificationCount}
                  </span>
                )}
              </div>
              <button onClick={markAllNotificationsRead} className="text-sm font-semibold text-rose-700">{t("markAllRead")}</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setNotificationFilter("all")} className={`rounded-xl px-3 py-1 text-xs font-semibold ${notificationFilter === "all" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}>All ({sellerNotifications.length})</button>
              <button onClick={() => setNotificationFilter("unread")} className={`rounded-xl px-3 py-1 text-xs font-semibold ${notificationFilter === "unread" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}>Unread ({unreadNotificationCount})</button>
              <button onClick={() => setNotificationFilter("messages")} className={`rounded-xl px-3 py-1 text-xs font-semibold ${notificationFilter === "messages" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}>Messages</button>
              <button onClick={() => setNotificationFilter("engagement")} className={`rounded-xl px-3 py-1 text-xs font-semibold ${notificationFilter === "engagement" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}>Engagement</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-white p-3 ring-1 ring-rose-100">
              <button
                onClick={() => updateNotificationPreference("message", !(currentUser?.notificationPreferences?.message !== false))}
                className={`rounded-xl px-3 py-1 text-xs font-semibold ${(currentUser?.notificationPreferences?.message !== false) ? "bg-emerald-50 text-emerald-700" : "border border-slate-200 text-slate-600"}`}
              >
                Message alerts: {(currentUser?.notificationPreferences?.message !== false) ? "On" : "Off"}
              </button>
              <button
                onClick={() => updateNotificationPreference("engagement", !(currentUser?.notificationPreferences?.engagement !== false))}
                className={`rounded-xl px-3 py-1 text-xs font-semibold ${(currentUser?.notificationPreferences?.engagement !== false) ? "bg-emerald-50 text-emerald-700" : "border border-slate-200 text-slate-600"}`}
              >
                Engagement alerts: {(currentUser?.notificationPreferences?.engagement !== false) ? "On" : "Off"}
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {filteredSellerNotifications.length === 0 ? <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">{t("noNotifications")}</div> : filteredSellerNotifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-700">{notification.text}</div>
                    {!notification.read ? <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">Unread</span> : null}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-500">{formatDateTimeNoSeconds(notification.createdAt || Date.now())}</div>
                    <div className="flex gap-2">
                      {!notification.read ? (
                        <button onClick={() => markNotificationRead(notification.id)} className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-semibold text-rose-700">Mark read</button>
                      ) : null}
                      {notification.conversationId ? (
                        <button
                          onClick={() => {
                            setSellerSelectedConversationId(notification.conversationId);
                            markNotificationsReadForConversation(notification.conversationId);
                            scrollToSection("seller-inbox");
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-700"
                        >
                          Open thread
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div id="seller-profile" className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
              <h3 className="text-xl font-semibold">{t("profileChecklist")}</h3>
              <div className="mt-1 text-sm text-slate-500">Profile: {currentSellerProfile?.name || "Seller profile"}</div>
              <div className="mt-4 rounded-2xl border border-rose-100 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Seller presence</div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={toggleSellerOnlineStatus}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isSellerOnline ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    {isSellerOnline ? "Online" : "Offline"}
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">Feed visibility mode</span>
                    <button
                      type="button"
                      onClick={() => setSellerFeedVisibility("public")}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${sellerFeedVisibility === "public" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}
                    >
                      Public all posts
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerFeedVisibility("private")}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${sellerFeedVisibility === "private" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600"}`}
                    >
                      Private all posts
                    </button>
                    <button
                      type="button"
                      onClick={() => setSellerFeedVisibility("per-post")}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${sellerFeedVisibility === "per-post" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600"}`}
                    >
                      Choose each post
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Online/offline appears on your listings and posts. Use a global visibility mode or choose visibility per post.</p>
              </div>
              <div className="mt-4 space-y-2">
                {sellerProfileChecklist.length === 0 ? (
                  <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{t("profileComplete")}</div>
                ) : sellerProfileChecklist.map((item) => (
                  <div key={item} className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">• {item}</div>
                ))}
              </div>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-rose-100 bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">Profile image</div>
                  <div className="mt-3 h-40">
                    <ProductImage
                      src={sellerProfileDraft.profileImage || currentSellerProfile?.profileImageResolved}
                      label={sellerProfileDraft.profileImageName || currentSellerProfile?.profileImageNameResolved || "Seller profile image"}
                    />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSellerProfileImageUpload}
                    className="mt-3 w-full rounded-2xl border border-dashed border-rose-300 px-4 py-3 text-sm"
                  />
                  <div className="mt-2 text-xs text-slate-500">If no image is uploaded, buyers will see a default placeholder with your seller name.</div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("location")}</span>
                    <select value={sellerProfileDraft.location} onChange={(e) => updateSellerProfileField("location", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <option value="">{sellerProfileSelectText.locationPlaceholder}</option>
                      {locationOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">{t("specialty")}</span>
                    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 px-3 py-3">
                      {SELLER_SPECIALTY_OPTIONS.map((value) => {
                        const selected = sellerSpecialties.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => updateSellerProfileField("specialties", selected ? sellerSpecialties.filter((item) => item !== value) : [...sellerSpecialties, value])}
                            className={`rounded-xl px-3 py-2 text-xs font-semibold ${selected ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Languages</span>
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
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Bar affiliation</span>
                    <select
                      value={sellerProfileDraft.affiliatedBarId || ""}
                      onChange={(event) => updateSellerProfileField("affiliatedBarId", event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    >
                      <option value="">{localizeOptionLabel("Independent", locale)}</option>
                      {barOptions.map((bar) => (
                        <option key={bar.id} value={bar.id}>{bar.name}</option>
                      ))}
                    </select>
                    <span className="text-xs text-slate-500">Adding a bar now creates an approval request. Removing your affiliation applies immediately.</span>
                    {currentAffiliatedBar ? (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                        Currently affiliated with <span className="font-semibold">{currentAffiliatedBar.name}</span>.
                        <button
                          type="button"
                          onClick={removeSellerFromCurrentBarBySeller}
                          className="ml-2 rounded-lg border border-indigo-200 px-2 py-0.5 font-semibold text-indigo-700"
                        >
                          Remove affiliation
                        </button>
                      </div>
                    ) : null}
                    {(sellerOutgoingAffiliationRequests || []).length > 0 ? (
                      <div className="space-y-2 rounded-2xl border border-amber-100 bg-amber-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Pending requests to bars</div>
                        {(sellerOutgoingAffiliationRequests || []).map((request) => (
                          <div key={request.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-amber-100">
                            <span>{barMap?.[request.barId]?.name || request.barId}</span>
                            <button
                              type="button"
                              onClick={() => cancelBarAffiliationRequest?.(request.id)}
                              className="rounded-lg border border-slate-200 px-2 py-0.5 font-semibold text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {(sellerIncomingAffiliationRequests || []).length > 0 ? (
                      <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Bar invites awaiting your approval</div>
                        {(sellerIncomingAffiliationRequests || []).map((request) => (
                          <div key={request.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700 ring-1 ring-emerald-100">
                            <div className="font-semibold">{barMap?.[request.barId]?.name || request.barId}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => respondToBarAffiliationRequest?.(request.id, "approved")}
                                className="rounded-lg border border-emerald-200 px-2 py-1 font-semibold text-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => respondToBarAffiliationRequest?.(request.id, "rejected")}
                                className="rounded-lg border border-rose-200 px-2 py-1 font-semibold text-rose-700"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </label>
                </div>
                <textarea value={sellerProfileDraft.bio} onChange={(e) => updateSellerProfileField("bio", e.target.value)} className="min-h-[90px] rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("bio")} />
                <button onClick={saveSellerProfile} className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">{t("saveProfile")}</button>
                {sellerProfileMessage ? <div className="text-sm font-medium text-rose-700">{sellerProfileMessage}</div> : null}
              </div>

              <div id="seller-upload" className="flex items-center gap-3"><Upload className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">{t("mediaUpload")}</h3></div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t("mediaUploadHelp")}</p>
              <div className="mt-5 grid gap-4">
                <input value={uploadDraft.title} onChange={(e) => setUploadDraft((prev) => ({ ...prev, title: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("productTitle")} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input type="number" min={MIN_SELLER_PRICE_THB} step="1" value={uploadDraft.price} onChange={(e) => setUploadDraft((prev) => ({ ...prev, price: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={t("price")} />
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Color</span>
                    <select value={uploadDraft.color} onChange={(e) => setUploadDraft((prev) => ({ ...prev, color: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">
                      {COLOR_OPTIONS.map((value) => <option key={value}>{localizeOptionLabel(value, locale)}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Size</span>
                    <select value={uploadDraft.size} onChange={(e) => setUploadDraft((prev) => ({ ...prev, size: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">{SHARED_SIZE_OPTIONS.map((value) => <option key={value}>{localizeOptionLabel(value, locale)}</option>)}</select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Type</span>
                    <select value={uploadDraft.style} onChange={(e) => setUploadDraft((prev) => ({ ...prev, style: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">{STYLE_OPTIONS.map((value) => <option key={value}>{localizeOptionLabel(value, locale)}</option>)}</select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Fabric</span>
                    <select value={uploadDraft.fabric} onChange={(e) => setUploadDraft((prev) => ({ ...prev, fabric: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">{FABRIC_OPTIONS.map((value) => <option key={value}>{localizeOptionLabel(value, locale)}</option>)}</select>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Days worn</span>
                    <select value={uploadDraft.daysWorn} onChange={(e) => setUploadDraft((prev) => ({ ...prev, daysWorn: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">{DAYS_WORN_OPTIONS.map((value) => <option key={value}>{localizeOptionLabel(value, locale)}</option>)}</select>
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Condition</span>
                    <select value={uploadDraft.condition} onChange={(e) => setUploadDraft((prev) => ({ ...prev, condition: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">{CONDITION_OPTIONS.map((value) => <option key={value}>{localizeOptionLabel(value, locale)}</option>)}</select>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Scent level</span>
                    <select value={uploadDraft.scentLevel} onChange={(e) => setUploadDraft((prev) => ({ ...prev, scentLevel: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3">{SCENT_LEVEL_OPTIONS.map((value) => <option key={value}>{localizeOptionLabel(value, locale)}</option>)}</select>
                  </label>
                </div>
                <input type="file" accept="image/*" onChange={handleUploadFile} className="rounded-2xl border border-dashed border-rose-300 px-4 py-3" />
                <div className="h-40">{uploadDraft.image ? <ProductImage src={uploadDraft.image} label={uploadDraft.imageName} /> : <ProductImage label={t("imagePreview")} />}</div>
                <button onClick={createProductFromUpload} className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">{t("createDraft")}</button>
              </div>
              <div className="mt-5 rounded-3xl border border-rose-100 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">Step 2</div>
                    <h4 className="text-lg font-semibold">Set builder</h4>
                    <p className="mt-1 text-sm text-slate-600">Create combo products (for example bra + panties, top + skirt, or 4-piece sets) while keeping individual items listed separately.</p>
                  </div>
                  {editingBundleId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBundleId("");
                        setBundleDraft({ title: "", price: "", selectedProductIds: [] });
                        setBundleMessage("");
                      }}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Set title</span>
                    <input
                      value={bundleDraft.title}
                      onChange={(event) => {
                        setBundleMessage("");
                        setBundleDraft((prev) => ({ ...prev, title: event.target.value }));
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      placeholder="Example: Bra + Panty Matching Set"
                    />
                  </label>
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Combined set price (THB)</span>
                    <input
                      type="number"
                      min={MIN_SELLER_PRICE_THB}
                      step="1"
                      value={bundleDraft.price}
                      onChange={(event) => {
                        setBundleMessage("");
                        setBundleDraft((prev) => ({ ...prev, price: event.target.value }));
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                      placeholder="Set price"
                    />
                  </label>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium text-slate-700">Select products to include (2 or more)</div>
                  <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-rose-100 bg-white p-3">
                    {bundleSourceProducts.length === 0 ? (
                      <div className="text-sm text-slate-500">Create individual products first, then build sets from them.</div>
                    ) : bundleSourceProducts.map((product) => {
                      const selected = bundleDraft.selectedProductIds.includes(product.id);
                      return (
                        <label key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-100 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {
                                setBundleMessage("");
                                setBundleDraft((prev) => ({
                                  ...prev,
                                  selectedProductIds: selected
                                    ? prev.selectedProductIds.filter((id) => id !== product.id)
                                    : [...prev.selectedProductIds, product.id],
                                }));
                              }}
                            />
                            <span>{product.title}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-500">{formatPriceTHB(product.price)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      upsertBundleProduct(
                        {
                          bundleId: editingBundleId || "",
                          title: bundleDraft.title,
                          price: bundleDraft.price,
                          selectedProductIds: bundleDraft.selectedProductIds,
                        },
                        (message) => {
                          setBundleMessage(message || "Set saved.");
                          setEditingBundleId("");
                          setBundleDraft({ title: "", price: "", selectedProductIds: [] });
                        },
                        (errorMessage) => setBundleMessage(errorMessage || "Could not save set."),
                      );
                    }}
                    className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {editingBundleId ? "Update set product" : "Create set product"}
                  </button>
                  {bundleMessage ? <div className="text-sm font-medium text-rose-700">{bundleMessage}</div> : null}
                </div>
                {existingBundleProducts.length > 0 ? (
                  <div className="mt-5 space-y-2 rounded-2xl border border-rose-100 bg-white p-3">
                    <div className="text-sm font-medium text-slate-700">Existing set products</div>
                    {existingBundleProducts.map((bundle) => (
                      <div key={bundle.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100 px-3 py-2 text-sm">
                        <div>
                          <div className="font-medium">{bundle.title}</div>
                          <div className="text-xs text-slate-500">
                            {(bundle.bundleItemIds || []).length} item(s) · {formatPriceTHB(bundle.price)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBundleMessage("");
                            setEditingBundleId(bundle.id);
                            setBundleDraft({
                              title: bundle.title || "",
                              price: String(bundle.price || ""),
                              selectedProductIds: Array.isArray(bundle.bundleItemIds) ? bundle.bundleItemIds : [],
                            });
                          }}
                          className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                        >
                          Edit set
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="space-y-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
              <SellerQrCard seller={sellerMap[currentSellerId]} compact />
              <div id="seller-inbox" className="rounded-3xl border border-rose-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-rose-600" />
                    <h3 className="text-xl font-semibold">{t("inbox")}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{t("liveUpdates")}</div>
                    <div className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${sellerUnreadConversationCount > 0 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-white text-slate-700 ring-rose-100"}`}>
                      Unread {sellerUnreadConversationCount}
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">{sellerInbox.length} {t("conversations")}</div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">Received {sellerInboxReceivedCount}</div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">Sent {sellerInboxSentCount}</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-3">
                    {sellerInbox.length === 0 ? <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">{t("noMessages")}</div> : sellerInbox.map((message) => (
                      <button key={message.id} onClick={() => { setSellerSelectedConversationId(message.conversationId); markNotificationsReadForConversation(message.conversationId); }} className={`block w-full rounded-2xl p-4 text-left ring-1 ${message.hasUnread ?? !message.readBySeller ? "ring-amber-200 bg-amber-50" : "ring-rose-100"} ${sellerActiveConversationId === message.conversationId ? 'bg-rose-50' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{t("customerConversation")}</div>
                            <div className="mt-1 text-sm text-slate-500">{message.body}</div>
                          </div>
                          {message.hasUnread ?? !message.readBySeller ? <span className="rounded-full bg-rose-600 px-2 py-1 text-xs font-bold text-white">New</span> : null}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                    {sellerActiveConversationMessages.length === 0 ? <div className="text-sm text-slate-500">{t("selectConversation")}</div> : (
                      <>
                        <div className="max-h-64 space-y-3 overflow-y-auto">
                          {sellerActiveConversationMessages.map((message) => (
                            <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === 'seller' ? 'ml-auto bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
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
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <textarea value={sellerReplyDraft} onChange={(e) => setSellerReplyDraft(e.target.value)} className="min-h-[96px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm sm:flex-1" placeholder={t("replyPlaceholder")} />
                          <button onClick={sendSellerReply} className="w-full rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white sm:w-auto sm:self-end">{t("reply")}</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-rose-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">Custom requests</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-slate-500">{(sellerCustomRequests || []).length} request(s)</div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">Received {customRequestMessageStats.received}</div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-rose-100">Sent {customRequestMessageStats.sent}</div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {(sellerCustomRequests || []).length === 0 ? (
                    <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">No custom requests yet.</div>
                  ) : (sellerCustomRequests || []).map((request) => (
                    <div key={request.id} className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{request.buyerName || "Buyer"} · {request.buyerEmail || "No email"}</div>
                          <div className="mt-1 text-xs text-slate-500">{formatDateTimeNoSeconds(request.createdAt || Date.now())}</div>
                        </div>
                        <select
                          value={request.status || "open"}
                          onChange={(event) => updateCustomRequestStatus(request.id, event.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                        >
                          <option value="open">{localizeOptionLabel("open", locale)}</option>
                          <option value="reviewing">{localizeOptionLabel("reviewing", locale)}</option>
                          <option value="fulfilled">{localizeOptionLabel("fulfilled", locale)}</option>
                          <option value="closed">{localizeOptionLabel("closed", locale)}</option>
                        </select>
                      </div>
                      <div className="mt-2 text-sm text-slate-700"><span className="font-medium">Preferences:</span> {request.preferredDetails || "Not provided"}</div>
                      <div className="mt-1 text-sm text-slate-700"><span className="font-medium">Shipping country:</span> {request.shippingCountry || "Not provided"}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{request.requestBody || "No details provided."}</div>
                      <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">Buyer image uploads</div>
                          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(request.buyerImageUploadEnabled)}
                              onChange={(event) => {
                                toggleCustomRequestBuyerImageUpload(
                                  request.id,
                                  event.target.checked,
                                  () => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: event.target.checked ? "Buyer image uploads enabled." : "Buyer image uploads disabled." })),
                                  (errorMessage) => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: errorMessage || "" })),
                                );
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            />
                            Allow buyer to upload images
                          </label>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          Sellers can always upload images. Buyer uploads are blocked by default until enabled here.
                        </div>
                      </div>
                      <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Price proposal</div>
                        <div className="mt-2 text-sm text-slate-700">
                          Current quote:{" "}
                          <span className="font-semibold">
                            {Number(request.quotedPriceThb || 0) > 0 ? formatPriceTHB(Number(request.quotedPriceThb || 0)) : "Not proposed yet"}
                          </span>
                          {" · "}
                          <span className="capitalize">{getQuoteStatusLabel(request)}</span>
                          {Number(request.buyerCounterPriceThb || 0) > 0 ? ` · Buyer counter: ${formatPriceTHB(Number(request.buyerCounterPriceThb || 0))}` : ""}
                        </div>
                        {request.quoteMessage ? (
                          <div className="mt-1 text-xs text-slate-600">Last note: {request.quoteMessage}</div>
                        ) : null}
                        <div className="mt-2 grid gap-2 sm:grid-cols-[0.55fr_1fr_auto]">
                          <input
                            type="number"
                            min={MIN_CUSTOM_REQUEST_PURCHASE_THB}
                            step="1"
                            value={customRequestQuoteDraftById[request.id] ?? (Number(request.quotedPriceThb || 0) > 0 ? String(request.quotedPriceThb) : "")}
                            onChange={(event) => setCustomRequestQuoteDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            placeholder="Quote THB"
                          />
                          <input
                            value={customRequestQuoteNoteById[request.id] || ""}
                            onChange={(event) => setCustomRequestQuoteNoteById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            placeholder="Optional note to buyer"
                          />
                          <button
                            onClick={() => {
                              const priceDraft = customRequestQuoteDraftById[request.id] ?? request.quotedPriceThb;
                              const noteDraft = customRequestQuoteNoteById[request.id] || "";
                              proposeCustomRequestPrice(
                                request.id,
                                priceDraft,
                                noteDraft,
                                () => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: "Quote sent." })),
                                (errorMessage) => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: errorMessage || "" })),
                              );
                            }}
                            className="rounded-xl border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700"
                          >
                            Send quote
                          </button>
                        </div>
                        {customRequestQuoteMessageById[request.id] ? (
                          <div className="mt-2 text-[11px] text-indigo-700">{customRequestQuoteMessageById[request.id]}</div>
                        ) : null}
                        {request.quoteStatus === "countered" && Number(request.buyerCounterPriceThb || 0) > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                respondToCustomRequestCounter(
                                  request.id,
                                  "accept",
                                  () => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: "Counter accepted. Buyer can now pay." })),
                                  (errorMessage) => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: errorMessage || "" })),
                                );
                              }}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                            >
                              Accept counter
                            </button>
                            <button
                              onClick={() => {
                                respondToCustomRequestCounter(
                                  request.id,
                                  "decline",
                                  () => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: "Counter declined. Quote remains active." })),
                                  (errorMessage) => setCustomRequestQuoteMessageById((prev) => ({ ...prev, [request.id]: errorMessage || "" })),
                                );
                              }}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                            >
                              Decline counter
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                        <div className="max-h-40 space-y-2 overflow-y-auto">
                          {(customRequestMessagesByRequestId?.[request.id] || []).length === 0 ? (
                            <div className="text-xs text-slate-500">No replies yet.</div>
                          ) : (customRequestMessagesByRequestId?.[request.id] || []).map((message) => (
                            <div key={message.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${message.senderRole === "seller" ? "ml-auto bg-rose-600 text-white" : "bg-white text-slate-700 ring-1 ring-rose-100"}`}>
                              <div>{resolveConversationMessageBody(message)}</div>
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
                              {canToggleConversationTranslation(message) ? (
                                <button
                                  type="button"
                                  onClick={() => setShowOriginalMessageById((prev) => ({ ...prev, [message.id]: !prev[message.id] }))}
                                  className={`mt-1 block text-[11px] font-semibold ${message.senderRole === "seller" ? "text-rose-100" : "text-slate-500"}`}
                                >
                                  {showOriginalMessageById[message.id] ? t("showTranslation") : t("showOriginal")}
                                </button>
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                          <input
                            value={customRequestReplyDraftById[request.id] || ""}
                            onChange={(event) => setCustomRequestReplyDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                            placeholder="Reply to this custom request"
                          />
                          <button
                            onClick={() => {
                              sendCustomRequestMessage(
                                request.id,
                                customRequestReplyDraftById[request.id] || "",
                                customRequestImageDraftById[request.id] || [],
                                () => {
                                  setCustomRequestReplyDraftById((prev) => ({ ...prev, [request.id]: "" }));
                                  setCustomRequestImageDraftById((prev) => ({ ...prev, [request.id]: [] }));
                                },
                              );
                            }}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                          >
                            Send
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) => handleCustomRequestImageDraftSelect(request.id, event.target.files)}
                            className="max-w-full rounded-xl border border-dashed border-rose-300 px-3 py-2 text-[11px]"
                          />
                          {(customRequestImageDraftById[request.id] || []).length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setCustomRequestImageDraftById((prev) => ({ ...prev, [request.id]: [] }))}
                              className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                            >
                              Clear images
                            </button>
                          ) : null}
                        </div>
                        {(customRequestImageDraftById[request.id] || []).length > 0 ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {(customRequestImageDraftById[request.id] || []).map((image) => (
                              <div key={image.id} className="overflow-hidden rounded-lg ring-1 ring-rose-200/60">
                                <ProductImage src={image.image} label={image.imageName || "Draft attachment"} />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div id="seller-post-create" className="rounded-3xl border border-rose-100 bg-slate-50 p-5">
                <div className="flex items-center gap-3"><Upload className="h-5 w-5 text-rose-600" /><h3 className="text-xl font-semibold">{t("createFeedPost")}</h3></div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{t("createFeedPostHelp")}</p>
                <div className="mt-5 grid gap-4">
                  <textarea
                    value={sellerPostDraft.caption}
                    onChange={(e) => setSellerPostDraft((prev) => ({ ...prev, caption: e.target.value }))}
                    className="min-h-[96px] rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    maxLength={500}
                    placeholder={t("captionPlaceholder")}
                  />
                  <input type="file" accept="image/*" onChange={handleSellerPostImageUpload} className="rounded-2xl border border-dashed border-rose-300 px-4 py-3" />
                  <label className="grid gap-1 text-sm text-slate-600">
                    <span className="font-medium">Schedule (optional)</span>
                    <input
                      type="datetime-local"
                      value={sellerPostDraft.scheduledFor || ""}
                      onChange={(event) => setSellerPostDraft((prev) => ({ ...prev, scheduledFor: event.target.value }))}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                    />
                    <span className="text-[11px] text-slate-500">Future time only. Leave blank to publish now.</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm text-slate-600">
                      <span className="font-medium">Post visibility</span>
                      {feedVisibilityMode === "per-post" ? (
                        <select
                          value={draftPostVisibility}
                          onChange={(event) => setSellerPostDraft((prev) => ({ ...prev, visibility: event.target.value === "private" ? "private" : "public" }))}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        >
                          <option value="public">{localizeOptionLabel("Public", locale)}</option>
                          <option value="private">{localizeOptionLabel("Private (paid)", locale)}</option>
                        </select>
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Controlled by feed mode: {feedVisibilityMode === "private" ? "Private all posts" : "Public all posts"}
                        </div>
                      )}
                    </label>
                    {effectiveDraftVisibility === "private" ? (
                      <label className="grid gap-1 text-sm text-slate-600">
                        <span className="font-medium">Private unlock price (THB)</span>
                        <input
                          type="number"
                          min={MIN_SELLER_PRICE_THB}
                          step="1"
                          value={Number(sellerPostDraft.accessPriceUsd || MIN_SELLER_PRICE_THB)}
                          onChange={(event) =>
                            setSellerPostDraft((prev) => ({
                              ...prev,
                              accessPriceUsd: Number.isFinite(Number(event.target.value)) && Number(event.target.value) >= MIN_SELLER_PRICE_THB
                                ? Number(Number(event.target.value).toFixed(2))
                                : MIN_SELLER_PRICE_THB,
                            }))
                          }
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        />
                      </label>
                    ) : <div />}
                  </div>
                  <div className="h-40">{sellerPostDraft.image ? <ProductImage src={sellerPostDraft.image} label={sellerPostDraft.imageName || "Feed image"} /> : <ProductImage label={t("postImagePreview")} />}</div>
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
              </div>
              <div className="rounded-3xl border border-rose-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">{t("yourFeedPosts")}</h3>
                  <div className="text-sm text-slate-500">{sellerDashboardPosts.length} post(s)</div>
                </div>
                <div className="mt-3 grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-rose-100 md:grid-cols-4">
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Locked posts</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.lockedPostCount}</div></div>
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Paid unlocks</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.unlockCount}</div></div>
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Unlock revenue</div><div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(sellerPostAnalytics.unlockRevenue)}</div></div>
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Top post</div><div className="mt-1 text-xs text-slate-600">{sellerPostAnalytics.topPostTitle} ({sellerPostAnalytics.topPostUnlocks})</div></div>
                </div>
                <div className="mt-3 grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-rose-100 md:grid-cols-2">
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Message earnings</div><div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(Number(sellerPostAnalytics.messageRevenue || 0))}</div></div>
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Total direct earnings</div><div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(Number(sellerPostAnalytics.totalRevenue || 0))}</div></div>
                </div>
                <div className="mt-3 grid gap-3 rounded-2xl bg-white p-3 ring-1 ring-rose-100 md:grid-cols-4">
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Scheduled posts</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.scheduledPostCount}</div></div>
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Likes</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.likeCount}</div></div>
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Comments</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.commentCount}</div></div>
                  <div><div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Followers</div><div className="mt-1 text-lg font-semibold text-slate-800">{sellerPostAnalytics.followerCount}</div></div>
                </div>
                <div className="mt-3 rounded-2xl bg-white p-3 text-xs text-slate-600 ring-1 ring-rose-100">
                  7-day engagement: <span className="font-semibold text-slate-900">{sellerPostAnalytics.recentEngagement}</span>
                  {" · "}
                  Trend vs previous 7 days: <span className={`font-semibold ${sellerPostAnalytics.engagementTrendPct >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{sellerPostAnalytics.engagementTrendPct >= 0 ? "+" : ""}{sellerPostAnalytics.engagementTrendPct}%</span>
                </div>
                <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-rose-100">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Private post pricing mode</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPrivatePostPricingMode("all")}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${privatePostPricingMode === "all" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
                    >
                      Same price for all private posts
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivatePostPricingMode("individual")}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${privatePostPricingMode === "individual" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
                    >
                      Individual price per post
                    </button>
                  </div>
                  {privatePostPricingMode === "all" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="w-full text-xs text-slate-500 sm:w-auto">Bulk price for all private posts</span>
                      <input
                        type="number"
                        min={MIN_SELLER_PRICE_THB}
                        step="1"
                        value={bulkPrivatePostPrice}
                        onChange={(event) => setBulkPrivatePostPrice(event.target.value)}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => updateAllPrivatePostPrices(bulkPrivatePostPrice)}
                        className="w-full rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 sm:w-auto sm:py-1"
                      >
                        Apply to all private
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 text-xs text-slate-500">
                      Individual mode is active. Set each private post price in the post list below (for example, one post at {formatPriceTHB(MIN_SELLER_PRICE_THB)} and another at {formatPriceTHB(MIN_SELLER_PRICE_THB + 500)}).
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  {sellerDashboardPosts.length === 0 ? (
                    <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">{t("noPosts")}</div>
                  ) : sellerDashboardPosts.map((post) => (
                    <div key={post.id} className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSellerOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                            {isSellerOnline ? "Online" : "Offline"}
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
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Scheduled: {formatDateTimeNoSeconds(post.scheduledFor)}</span>
                            <button
                              onClick={() => unscheduleSellerPost(post.id)}
                              className="rounded-lg border border-amber-200 px-2 py-1 text-[10px] font-semibold text-amber-700"
                            >
                              Unschedule
                            </button>
                            <button
                              onClick={() => publishSellerPostNow(post.id)}
                              className="rounded-lg border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-700"
                            >
                              Publish now
                            </button>
                          </>
                        ) : null}
                        <span className="text-xs text-slate-500">Post visibility</span>
                        <select
                          value={post.visibility === "private" ? "private" : "public"}
                          onChange={(event) => updateSellerPostVisibility(post.id, event.target.value, post.accessPriceUsd || MIN_SELLER_PRICE_THB)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="public">{localizeOptionLabel("Public", locale)}</option>
                          <option value="private">{localizeOptionLabel("Private (paid)", locale)}</option>
                        </select>
                        {post.visibility === "private" && privatePostPricingMode === "individual" ? (
                          <input
                            type="number"
                            min={MIN_SELLER_PRICE_THB}
                            step="1"
                            value={Number(post.accessPriceUsd || MIN_SELLER_PRICE_THB)}
                            onChange={(event) => updateSellerPostPrice(post.id, event.target.value)}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          />
                        ) : null}
                        {post.visibility === "private" && privatePostPricingMode === "all" ? (
                          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                            {formatPriceTHB(post.accessPriceUsd || MIN_SELLER_PRICE_THB)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm text-slate-700">{post.caption || t("noCaption")}</div>
                      <div className="mt-3 h-36">{post.image ? <ProductImage src={post.image} label={post.imageName || "Feed image"} /> : <ProductImage label={t("noImage")} />}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div id="seller-listings" className="flex items-center justify-between gap-4"><h3 className="text-xl font-semibold">{t("listingLibrary")}</h3><div className="text-sm text-slate-500">{sellerDashboardProducts.length} {t("items")}</div></div>
              <div className="mt-5 space-y-4">
                {sellerDashboardProducts.map((product) => (
                  <div key={product.id} className="flex flex-col gap-4 rounded-2xl border border-rose-100 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-semibold">{product.title}</div>
                        {product.isBundle ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Set</span> : null}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isSellerOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {isSellerOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {product.imageName || t("noAsset")} · {formatPriceTHB(product.price)} · {product.status} · {t("worn")}: {product.daysWorn || t("notSpecified")} · Condition: {product.condition || t("notSpecified")}
                        {product.isBundle ? ` · Includes ${(product.bundleItemIds || []).length} item(s)` : ""}
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap gap-2 md:w-auto">
                      <button onClick={() => publishProduct(product.id)} className="flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none">{t("publish")}</button>
                      <button onClick={() => navigate(`/product/${product.slug}`)} className="flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none">{t("viewListing")}</button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        disabled={deletingProductId === product.id}
                        className={`flex-1 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 md:flex-none ${deletingProductId === product.id ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        {deletingProductId === product.id ? t("deleting") : t("delete")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function SellerFeedPage({
  sellerPosts,
  sellerMap,
  postReports,
  commentReports,
  sellerPostLikes,
  sellerPostComments,
  sellerFollows,
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
  toggleSavedSellerPost,
  sellerLanguage,
  canViewSellerPost,
  isSellerPostPrivate,
  unlockPrivatePost,
  navigate
}) {
  const locale = SELLER_I18N[sellerLanguage] ? sellerLanguage : "en";
  const t = (key) => SELLER_I18N[locale]?.[key] || SELLER_I18N.en[key] || key;
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
  const savedPostIds = useMemo(
    () =>
      new Set(
        (sellerSavedPosts || [])
          .filter((entry) => entry.userId === currentUser?.id)
          .map((entry) => entry.postId)
      ),
    [sellerSavedPosts, currentUser]
  );
  const savedCount = savedPostIds.size;

  const feedPosts = useMemo(
    () => {
      const basePosts =
        feedMode === "following"
          ? sellerPosts.filter((post) => followedSellerIds.has(post.sellerId))
          : feedMode === "saved"
            ? sellerPosts.filter((post) => savedPostIds.has(post.id))
            : sellerPosts;
      const ranked = [...basePosts];
      if (sortMode === "engaged") {
        ranked.sort((a, b) => {
          const aLikes = (sellerPostLikes || []).filter((entry) => entry.postId === a.id).length;
          const bLikes = (sellerPostLikes || []).filter((entry) => entry.postId === b.id).length;
          const aComments = (sellerPostComments || []).filter((entry) => entry.postId === a.id).length;
          const bComments = (sellerPostComments || []).filter((entry) => entry.postId === b.id).length;
          const aScore = aLikes + (aComments * 2);
          const bScore = bLikes + (bComments * 2);
          if (bScore !== aScore) return bScore - aScore;
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
      }
      return ranked;
    },
    [sellerPosts, feedMode, sortMode, followedSellerIds, savedPostIds, sellerPostLikes, sellerPostComments]
  );
  const searchedFeedPosts = useMemo(() => {
    const query = feedSearch.trim().toLowerCase();
    if (!query) return feedPosts;
    return feedPosts.filter((post) => {
      const sellerName = (sellerMap?.[post.sellerId]?.name || "").toLowerCase();
      const caption = (post.caption || "").toLowerCase();
      const sellerId = (post.sellerId || "").toLowerCase();
      return sellerName.includes(query) || caption.includes(query) || sellerId.includes(query);
    });
  }, [feedPosts, feedSearch, sellerMap]);
  const visiblePosts = searchedFeedPosts.slice(0, visibleCount);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
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
            setFeedMode("following");
            setVisibleCount(9);
          }}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${feedMode === "following" ? "bg-rose-600 text-white" : "border border-rose-200 text-rose-700"}`}
        >
          {t("followingPosts")}
        </button>
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
          className="min-w-[240px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm sm:min-w-[320px]"
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
                : feedMode === "saved"
                  ? t("noSavedPosts")
                  : t("noFeedPosts")}
          </div>
        ) : visiblePosts.map((post) => (
          <article key={post.id} className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-rose-100">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/seller/${post.sellerId}`)} className="text-left text-sm font-semibold text-rose-700 hover:text-rose-800">
                  {sellerMap[post.sellerId]?.name || post.sellerId}
                </button>
                {currentUser?.role === "buyer" ? (
                  <button
                    onClick={() => toggleSellerFollow(post.sellerId)}
                    className={`rounded-xl border px-2 py-0.5 text-[11px] font-semibold ${followedSellerIds.has(post.sellerId) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600"}`}
                  >
                    {followedSellerIds.has(post.sellerId) ? t("following") : t("follow")}
                  </button>
                ) : null}
                {currentUser ? (
                  <button
                    onClick={() => toggleSavedSellerPost(post.id)}
                    className={`rounded-xl border px-2 py-0.5 text-[11px] font-semibold ${savedPostIds.has(post.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600"}`}
                  >
                    {savedPostIds.has(post.id) ? t("saved") : t("savePost")}
                  </button>
                ) : null}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {sellerFollowerCountById?.[post.sellerId] || 0} {t("followers")}
                </span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sellerMap[post.sellerId]?.isOnline ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {sellerMap[post.sellerId]?.isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
            <div className="mt-3 h-72">
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
                <div className={canViewSellerPost(post) ? "" : "blur-sm"}>
                  <ProductImage src={post.image} label={post.imageName || t("feedImage")} />
                </div>
                {!canViewSellerPost(post) && isSellerPostPrivate(post) ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button onClick={(event) => { event.stopPropagation(); unlockPrivatePost(post.id); }} className="rounded-2xl bg-white/95 px-4 py-2 text-xs font-semibold text-rose-700 shadow">
                      Unlock for {formatPriceTHB(post.accessPriceUsd || MIN_SELLER_PRICE_THB)}
                    </button>
                  </div>
                ) : null}
              </button>
            </div>
            {canViewSellerPost(post) ? (post.caption ? <p className="mt-3 text-sm leading-6 text-slate-700">{post.caption}</p> : null) : <p className="mt-3 text-sm text-slate-500">Private post. Unlock to view.</p>}
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
                        <span><span className="font-semibold text-slate-600">{comment.senderRole}</span>: {comment.body}</span>
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
        ))}
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
  adminTab,
  setAdminTab,
  products,
  users,
  orders,
  messages,
  customRequests,
  customRequestMessages,
  refundClaims,
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
  userStrikes,
  userAppeals,
  reviewUserAppeal,
  reviewingAppealId,
  emailTemplates,
  updateEmailTemplate,
  resetEmailTemplate,
  sendTestEmailTemplate,
  emailDeliveryLog,
  sellerMap,
  currentUser,
  navigate,
  CMS_SCHEMA,
  NEXTJS_EXPORT_BLUEPRINT,
  SEO_CONFIG
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
  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxTypeFilter, setInboxTypeFilter] = useState("all");
  const [inboxPriorityFilter, setInboxPriorityFilter] = useState("all");
  const [inboxReviewFilter, setInboxReviewFilter] = useState("all");
  const [inboxVisibleCount, setInboxVisibleCount] = useState(20);
  const [inboxSelectedKeys, setInboxSelectedKeys] = useState({});
  const [inboxPresetName, setInboxPresetName] = useState("");
  const [inboxActionMessage, setInboxActionMessage] = useState("");
  const [adminWorkspaceMode, setAdminWorkspaceMode] = useState("all");
  const [adminUserNoteDraft, setAdminUserNoteDraft] = useState("");
  const [orderShipmentDrafts, setOrderShipmentDrafts] = useState({});
  const [barDraftsById, setBarDraftsById] = useState({});
  const [payoutSourceFilter, setPayoutSourceFilter] = useState("all");
  const [payoutRoleFilter, setPayoutRoleFilter] = useState("all");
  const [payoutDateRangeFilter, setPayoutDateRangeFilter] = useState("all");
  const emailTestScenarioOptions = [
    { value: "default", label: "Default sample" },
    { value: "buyer_message", label: "Buyer receives seller message" },
    { value: "seller_message", label: "Seller receives buyer message" },
    { value: "custom_request", label: "New custom request" },
    { value: "custom_request_status", label: "Custom request status update" },
    { value: "wallet_top_up", label: "Wallet top-up confirmation" },
    { value: "wallet_low", label: "Low wallet balance warning" },
    { value: "order_shipped", label: "Order shipped with tracking" },
  ];
  const recommendedScenarioByTemplateKey = {
    buyer_message_received: "buyer_message",
    seller_message_received: "seller_message",
    custom_request_received: "custom_request",
    custom_request_status_changed: "custom_request_status",
    wallet_top_up_completed: "wallet_top_up",
    wallet_low_balance: "wallet_low",
    order_shipped: "order_shipped",
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
        .filter((action) => ["report_seller_post", "resolve_post_report", "delete_seller_post"].includes(action.type))
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
    const barAffiliationEvents = (barAffiliationRequests || []).map((request) => {
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
    return [...directMessages, ...requestEvents, ...requestMessages, ...refundClaimEvents, ...barAffiliationEvents]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [
    messages,
    customRequests,
    customRequestMessages,
    refundClaims,
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
  const openPostReportCount = unresolvedReports.length;
  const openCommentReportCount = unresolvedCommentReports.length;
  const openModerationCount = openPostReportCount + openCommentReportCount;
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
    operations: { label: "Operations", tabs: new Set(["overview", "sales", "products", "payments", "email", "auth", "bars"]) },
    support: { label: "Support", tabs: new Set(["overview", "inbox", "users", "disputes", "email"]) },
  }), []);
  const visibleAdminTabs = useMemo(() => {
    const mode = workspaceModeConfig[adminWorkspaceMode] || workspaceModeConfig.all;
    if (!mode.tabs) return ADMIN_TAB_CONFIG;
    return ADMIN_TAB_CONFIG.filter((tab) => mode.tabs.has(tab.key));
  }, [adminWorkspaceMode, workspaceModeConfig]);
  useEffect(() => {
    if (!visibleAdminTabs.some((tab) => tab.key === adminTab)) {
      setAdminTab(visibleAdminTabs[0]?.key || "overview");
    }
  }, [visibleAdminTabs, adminTab, setAdminTab]);
  useEffect(() => {
    if (!adminSelectedUser?.id) {
      setAdminUserNoteDraft("");
      return;
    }
    setAdminUserNoteDraft(adminNoteByEntityKey[`user:${adminSelectedUser.id}`]?.body || "");
  }, [adminSelectedUser?.id, adminNoteByEntityKey]);
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
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      {!isAdmin ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">Admin login required</h2>
          <p className="mt-2 text-slate-600">Use the Admin Login button in the header to access the admin dashboard.</p>
        </div>
      ) : (
        <div className="text-[15px] leading-6 text-slate-800">
          <SectionTitle eyebrow="Admin dashboard" title="Operations center" subtitle="Manage seller approvals, users, listings, payments, and social moderation from one workspace." />
          <div className="mb-6 rounded-3xl border border-rose-100 bg-white p-4">
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
                  className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold ${adminWorkspaceMode === modeKey ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
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
                className={`cursor-pointer rounded-2xl border px-4 py-3 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${
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
          <div className="mb-6 rounded-3xl border border-rose-100 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => navigate("/account")} className="cursor-pointer rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm">
                Open buyer account
              </button>
              <button onClick={() => navigate("/seller-dashboard")} className="cursor-pointer rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm">
                Open seller dashboard
              </button>
              <button onClick={() => navigate("/bar-dashboard")} className="cursor-pointer rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:bg-rose-50 hover:shadow-sm">
                Open bar dashboard
              </button>
              {currentUser?.role === "admin" ? (
                <span className="ml-1 text-sm text-slate-600">Seller profile access requires a seller account.</span>
              ) : null}
            </div>
          </div>
          <div className="mb-8 rounded-3xl border border-rose-100 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">Quick actions</div>
                <p className="mt-1 text-sm text-slate-600">Jump to the most frequent admin tasks.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setAdminTab("auth")} className="cursor-pointer rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                  Seller approvals ({pendingSellerCount})
                </button>
                <button onClick={() => setAdminTab("users")} className="cursor-pointer rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                  Appeals ({pendingAppeals.length})
                </button>
                <button onClick={() => setAdminTab("inbox")} className="cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                  Inbox review ({inboxCounts.new + inboxCounts.followUp})
                </button>
                <button onClick={() => setAdminTab("disputes")} className="cursor-pointer rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                  Disputes ({disputeCounts.open})
                </button>
                <button onClick={() => setAdminTab("social")} className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                  Open reports ({openModerationCount})
                </button>
                <button onClick={() => setAdminTab("email")} className="cursor-pointer rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                  Email templates
                </button>
                <button onClick={() => setAdminTab("bars")} className="cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition duration-150 hover:-translate-y-0.5 hover:shadow-sm">
                  Bars ({(bars || []).length})
                </button>
              </div>
            </div>
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
              {pendingSellerCount > 0 ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-amber-800">{pendingSellerCount} seller application(s) waiting for review</div>
                    <div className="flex gap-2">
                      <button onClick={() => setAdminTab("auth")} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">Open review queue</button>
                      <button onClick={approveAllPendingSellers} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve all</button>
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
              </div>
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-6">
                {[
                  { label: "Total sales", value: formatPriceTHB(adminSalesSummary.totalSales) },
                  { label: "Product sales", value: formatPriceTHB(adminSalesSummary.productSales || 0) },
                  { label: "Custom request sales", value: formatPriceTHB(adminSalesSummary.customRequestSales || 0) },
                  { label: "Total orders", value: adminSalesSummary.totalOrders },
                  { label: "Custom request purchases", value: adminSalesSummary.customRequestOrders || 0 },
                  { label: "Buyers", value: adminSalesSummary.totalBuyers },
                  { label: "Sellers", value: adminSalesSummary.totalSellers }
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
                  {sellerSalesRows.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No seller sales yet.</div>
                  ) : sellerSalesRows.map((row) => (
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
                      <div className="mt-4 grid gap-2">
                        <input
                          value={draft.name}
                          onChange={(event) => setBarDraftsById((prev) => ({ ...prev, [bar.id]: { ...draft, name: event.target.value } }))}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Bar name"
                        />
                        <input
                          value={draft.location}
                          onChange={(event) => setBarDraftsById((prev) => ({ ...prev, [bar.id]: { ...draft, location: event.target.value } }))}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Location"
                        />
                        <textarea
                          value={draft.about}
                          onChange={(event) => setBarDraftsById((prev) => ({ ...prev, [bar.id]: { ...draft, about: event.target.value } }))}
                          className="min-h-[90px] rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="About"
                        />
                        <textarea
                          value={draft.specials}
                          onChange={(event) => setBarDraftsById((prev) => ({ ...prev, [bar.id]: { ...draft, specials: event.target.value } }))}
                          className="min-h-[70px] rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Specials"
                        />
                        <input
                          value={draft.mapEmbedUrl}
                          onChange={(event) => setBarDraftsById((prev) => ({ ...prev, [bar.id]: { ...draft, mapEmbedUrl: event.target.value } }))}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Map embed URL"
                        />
                        <input
                          value={draft.mapLink}
                          onChange={(event) => setBarDraftsById((prev) => ({ ...prev, [bar.id]: { ...draft, mapLink: event.target.value } }))}
                          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder="Map link URL"
                        />
                        <button
                          onClick={() => updateBarProfileByAdmin?.(bar.id, draft)}
                          className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Save bar profile
                        </button>
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
                                onChange={(event) => setSellerBarAffiliationByAdmin?.(seller.id, event.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                              >
                                <option value="">Independent</option>
                                {(bars || []).map((nextBar) => (
                                  <option key={nextBar.id} value={nextBar.id}>{nextBar.name}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => setSellerBarAffiliationByAdmin?.(seller.id, "")}
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
                          setSellerBarAffiliationByAdmin?.(seller.id, event.target.value);
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
                <input
                  value={adminUserSearch}
                  onChange={(event) => setAdminUserSearch(event.target.value)}
                  className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  placeholder="Search by name, email, role"
                />
                <div className="mt-4 space-y-3">
                  {adminUserResults.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      No users found.
                      <div className="mt-2">
                        <button onClick={() => setAdminUserSearch("")} className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                          Clear search
                        </button>
                      </div>
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
                        <button
                          onClick={() => toggleAdminBlockUser(adminSelectedUser.id)}
                          className={`rounded-2xl px-4 py-2 text-sm font-semibold ${adminSelectedUser.accountStatus === "blocked" ? "border border-emerald-200 text-emerald-700" : "border border-rose-200 text-rose-700"}`}
                        >
                          {adminSelectedUser.accountStatus === "blocked" ? "Unblock User" : "Block User"}
                        </button>
                      </div>
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        Status: <span className="font-semibold">{adminSelectedUser.accountStatus || "active"}</span>
                        {" · "}
                        Active strikes: <span className="font-semibold">{activeStrikesByUserId[adminSelectedUser.id] || 0}</span>
                        {" · "}
                        Appeals: <span className="font-semibold">{pendingAppeals.filter((appeal) => appeal.userId === adminSelectedUser.id).length} pending</span>
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
                    ) : pendingAppeals.slice(0, 8).map((appeal) => (
                    <div key={appeal.id} className="rounded-2xl border border-rose-100 p-5">
                        <div className="text-sm font-semibold">
                          {users.find((user) => user.id === appeal.userId)?.name || appeal.userId}
                        </div>
                      <div className="mt-1 text-sm text-slate-600">{formatDateTimeNoSeconds(appeal.createdAt || Date.now())}</div>
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
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <h4 className="text-lg font-semibold">Order history</h4>
                <div className="mt-4 space-y-4">
                    {adminSelectedUserOrderHistory.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No order history.</div>
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
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No messages yet.</div>
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
                    className="min-w-[240px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <select value={inboxTypeFilter} onChange={(event) => { setInboxTypeFilter(event.target.value); setInboxVisibleCount(20); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    <option value="all">All types</option>
                    <option value="message">Direct messages</option>
                    <option value="custom_request">Custom requests</option>
                    <option value="custom_request_message">Request messages</option>
                    <option value="refund_claim">Refund evidence</option>
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
                                if (String(item.requestStatus || "") !== "pending") {
                                  setInboxActionMessage(`Affiliation request ${item.id} is already ${item.requestStatus || "closed"}.`);
                                  return;
                                }
                                respondToBarAffiliationRequest(item.id, "approved");
                                setInboxActionMessage(`Approved bar affiliation request ${item.id}.`);
                                updateAdminInboxReview?.(item.itemKey, "resolved");
                              }}
                              className="rounded-xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700"
                            >
                              Approve request
                            </button>
                            <button
                              onClick={() => {
                                if (!respondToBarAffiliationRequest) return;
                                if (String(item.requestStatus || "") !== "pending") {
                                  setInboxActionMessage(`Affiliation request ${item.id} is already ${item.requestStatus || "closed"}.`);
                                  return;
                                }
                                respondToBarAffiliationRequest(item.id, "rejected");
                                setInboxActionMessage(`Rejected bar affiliation request ${item.id}.`);
                                updateAdminInboxReview?.(item.itemKey, "resolved");
                              }}
                              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
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
                          : "Post deleted by admin";
                    return (
                      <div key={action.id} className="rounded-2xl border border-rose-100 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-800">{actionTitle}</div>
                          <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(action.createdAt || Date.now())}</div>
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          {action.targetPostId ? `Post: ${action.targetPostId}` : null}
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold">Lifestyle feed moderation</h3>
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
                      <div className="mt-3 h-48">{post.image ? <ProductImage src={post.image} label={post.imageName || "Post image"} /> : <ProductImage label="No image" />}</div>
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

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Seller share</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-700">{formatPriceTHB(splitPayoutSummary.seller)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Bar commission</div>
                  <div className="mt-1 text-lg font-semibold text-violet-700">{formatPriceTHB(splitPayoutSummary.bar)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Admin commission</div>
                  <div className="mt-1 text-lg font-semibold text-rose-700">{formatPriceTHB(splitPayoutSummary.admin)}</div>
                </div>
                <div className="rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                  <div className="text-xs uppercase tracking-[0.12em] text-slate-500">Total distributed</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">{formatPriceTHB(splitPayoutSummary.total)}</div>
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
                      <option value="admin">Admin</option>
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
                          {formatDateTimeNoSeconds(entry.createdAt || Date.now())} · {entry.recipientRole.toUpperCase()} · {entry.userName}
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

          {adminTab === "email" ? (
            <div className="space-y-6">
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
                  <div>/seller-feed</div>
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
                    ) : adminSellerReviewItems.map((user) => (
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
                    ))}
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
            </div>
          ) : null}
        </div>
      )}
    </section>
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
  total,
  checkoutAuthModalOpen,
  onOpenLogin,
  onOpenRegister,
  onOpenWalletTopUp
}) {
  const [attemptedStepOneContinue, setAttemptedStepOneContinue] = useState(false);
  const [attemptedStepTwoContinue, setAttemptedStepTwoContinue] = useState(false);
  const [shakeEmail, setShakeEmail] = useState(false);
  const [shakeName, setShakeName] = useState(false);
  const [shakeCountry, setShakeCountry] = useState(false);
  const [shakeAddress, setShakeAddress] = useState(false);
  const [shakePostalCode, setShakePostalCode] = useState(false);
  const stepOneEmailRef = useRef(null);
  const stepOneNameRef = useRef(null);
  const stepTwoCountryRef = useRef(null);
  const stepTwoPostalCodeRef = useRef(null);
  const stepTwoAddressRef = useRef(null);
  const triggerShake = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 380);
  };
  const trimmedEmail = String(buyerEmail || "").trim();
  const trimmedFullName = String(checkoutForm.fullName || "").trim();
  const trimmedAddress = String(checkoutForm.address || "").trim();
  const trimmedCountry = String(checkoutForm.country || "").trim();
  const trimmedPostalCode = String(checkoutForm.postalCode || "").trim();
  const emailLooksValid = /\S+@\S+\.\S+/.test(trimmedEmail);
  const canContinueToDelivery = emailLooksValid && trimmedFullName.length >= 2;
  const stepOneComplete = canContinueToDelivery;
  const stepTwoComplete = Boolean(trimmedCountry && trimmedAddress && trimmedPostalCode && shippingSupported);
  const walletShortfall = Math.max(0, Number((total - Number(currentWalletBalance || 0)).toFixed(2)));
  const requiredTopUpAmount = getRequiredTopUpAmount(walletShortfall);
  return (
    <>
      <style>{CHECKOUT_SHAKE_KEYFRAMES}</style>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <div className="rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 text-sm">
                <button onClick={() => setCheckoutAuthModalOpen(true)} className="rounded-full bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">
                  Past customer? Login
                </button>
              </div>
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
                  {currentUser ? (
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Welcome back, {currentUser.name}. We pre-filled your account details below - please review and edit if needed, then continue to delivery.
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Enter your email and name, then continue to delivery details.
                    </div>
                  )}
                  <input
                    ref={stepOneEmailRef}
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className={`rounded-2xl border border-slate-200 px-4 py-3 ${shakeEmail ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                    placeholder="Email address"
                  />
                  {attemptedStepOneContinue && !trimmedEmail ? <div className="text-xs text-rose-600">Email is required.</div> : null}
                  {attemptedStepOneContinue && trimmedEmail && !emailLooksValid ? <div className="text-xs text-rose-600">Enter a valid email address.</div> : null}
                  <input
                    ref={stepOneNameRef}
                    value={checkoutForm.fullName}
                    onChange={(e) => updateCheckoutField("fullName", e.target.value)}
                    className={`rounded-2xl border border-slate-200 px-4 py-3 ${shakeName ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                    placeholder="Full name"
                  />
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
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                    You can edit your shipping address directly here in cart before payment.
                  </div>
                  <select
                    ref={stepTwoCountryRef}
                    value={shippingCountryOptions.includes(checkoutForm.country) ? checkoutForm.country : ""}
                    onChange={(e) => updateCheckoutField("country", e.target.value)}
                    className={`rounded-2xl border border-slate-200 px-4 py-3 ${shakeCountry ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                  >
                    <option value="">{localizeOptionLabel("Select country", currentUser?.preferredLanguage || "en")}</option>
                    {shippingCountryOptions.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {attemptedStepTwoContinue && !trimmedCountry ? <div className="text-xs text-rose-600">Destination country is required.</div> : null}
                  <input
                    ref={stepTwoPostalCodeRef}
                    value={checkoutForm.postalCode || ""}
                    onChange={(e) => updateCheckoutField("postalCode", e.target.value)}
                    className={`rounded-2xl border border-slate-200 px-4 py-3 ${shakePostalCode ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                    placeholder="ZIP / Postal code"
                  />
                  {attemptedStepTwoContinue && !trimmedPostalCode ? <div className="text-xs text-rose-600">ZIP / Postal code is required.</div> : null}
                  <input
                    ref={stepTwoAddressRef}
                    value={checkoutForm.address}
                    onChange={(e) => updateCheckoutField("address", e.target.value)}
                    className={`rounded-2xl border border-slate-200 px-4 py-3 ${shakeAddress ? "animate-[checkout-shake_0.35s_ease-in-out]" : ""}`}
                    placeholder="Street address"
                  />
                  {attemptedStepTwoContinue && !trimmedAddress ? <div className="text-xs text-rose-600">Street address is required.</div> : null}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Delivery preview</div>
                    <div className="mt-2 grid gap-1">
                      <div><span className="font-medium">Name:</span> {trimmedFullName || "Add your name in Step 1"}</div>
                      <div><span className="font-medium">Email:</span> {trimmedEmail || "Add your email in Step 1"}</div>
                      <div><span className="font-medium">Address:</span> {trimmedAddress || "Enter street address"}</div>
                      <div><span className="font-medium">ZIP / Postal:</span> {trimmedPostalCode || "Enter ZIP / Postal code"}</div>
                      <div><span className="font-medium">Country:</span> {trimmedCountry || "Select destination country"}</div>
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
                    <div className="text-sm font-semibold text-slate-900">Shipping method</div>
                    <div className="mt-1 text-xs text-slate-500">
                      International carrier rates for destination: {shippingZoneLabel}
                    </div>
                    {!shippingSupported && checkoutForm.country.trim() ? (
                      <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Shipping is not available for this destination yet.
                      </div>
                    ) : null}
                    <div className="mt-3 grid gap-3">
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                        <div>
                          <div className="font-medium">Standard shipping</div>
                          <div className="text-sm text-slate-500">Tracked delivery via international carriers</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-700">{formatPriceTHB(shippingRates.standard)}</span>
                          <input type="radio" name="shippingMethod" checked={checkoutForm.shippingMethod === "standard"} onChange={() => updateCheckoutField("shippingMethod", "standard")} />
                        </div>
                      </label>
                      <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                        <div>
                          <div className="font-medium">Express shipping</div>
                          <div className="text-sm text-slate-500">Priority handling via international carriers and faster delivery</div>
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
                        if (!trimmedPostalCode) {
                          triggerShake(setShakePostalCode);
                          stepTwoPostalCodeRef.current?.focus();
                          return;
                        }
                        if (!trimmedAddress) {
                          triggerShake(setShakeAddress);
                          stepTwoAddressRef.current?.focus();
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
                  <div className="mt-2 text-xs text-slate-500">{formatExchangeEstimates(currentWalletBalance)}</div>
                  {currentUser?.role === "buyer" && walletShortfall > 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <div>Short by: {formatPriceTHB(walletShortfall)}</div>
                      <div className="mt-1">
                        Top up required: {formatPriceTHB(requiredTopUpAmount)}. Minimum top-up is {formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.
                      </div>
                      <button
                        onClick={() => onOpenWalletTopUp(requiredTopUpAmount)}
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
                        <span className="font-medium">Ship to:</span> {trimmedAddress || "No address"}, {trimmedPostalCode || "No ZIP"}, {trimmedCountry || "No country"}
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
                          onClick={() => onOpenWalletTopUp(requiredTopUpAmount)}
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
                    <button
                      onClick={onContinueShopping}
                      className="mt-3 rounded-xl border border-white/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-white/40 hover:text-white"
                    >
                      Browse products
                    </button>
                  </div>
                ) : null}
                {cartItems.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="rounded-2xl bg-white/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="font-semibold text-white">{item.title}</div><div className="mt-1 text-sm text-slate-300">{sellerMap[item.sellerId]?.name}</div></div>
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
                <div className="text-xs text-slate-300">Shipping destination: {checkoutForm.country.trim() || "Enter country"}{trimmedPostalCode ? ` (${trimmedPostalCode})` : ""} · Carrier: international carriers</div>
                <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold text-white"><span>Total</span><span>{formatPriceTHB(total)}</span></div>
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
                Open login
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
  buyerConversations,
  sellerFollows,
  toggleSellerFollow,
  accountForm,
  updateAccountField,
  saveAccountDetails,
  accountSaveMessage,
  currentWalletBalance,
  runWalletTopUp,
  walletStatus,
  topUpAmount,
  markAllNotificationsRead,
  buyerLedger,
  buyerSellerDirectory,
  accountSearchQuery,
  setAccountSearchQuery,
  quickSellerResults,
  quickProductResults,
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
  walletTopUpContext,
  clearWalletTopUpContext,
  uiLanguage = "en",
  navigate
}) {
  const accountText = ACCOUNT_PAGE_I18N[uiLanguage] || ACCOUNT_PAGE_I18N.en;
  const tx = (key) => accountText[key] || ACCOUNT_PAGE_I18N.en[key] || key;
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
  const [showOriginalMessageById, setShowOriginalMessageById] = useState({});
  const [customRequestReplyDraftById, setCustomRequestReplyDraftById] = useState({});
  const [customRequestImageDraftById, setCustomRequestImageDraftById] = useState({});
  const [customRequestCounterDraftById, setCustomRequestCounterDraftById] = useState({});
  const [customRequestStatusMessageById, setCustomRequestStatusMessageById] = useState({});
  const [customTopUpAmount, setCustomTopUpAmount] = useState("500");
  const [customTopUpError, setCustomTopUpError] = useState("");
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
    const timerId = window.setTimeout(() => {
      clearWalletTopUpContext?.();
      navigate(checkoutReturnPath);
    }, 450);
    return () => window.clearTimeout(timerId);
  }, [walletStatus, checkoutReturnPath, clearWalletTopUpContext, navigate]);
  const canAffordCustomRequestMessage =
    currentUser?.role !== "buyer" || Number(currentWalletBalance || 0) >= MESSAGE_FEE_THB;
  const buyerUnreadMessageNotifications = useMemo(() => {
    if (currentUser?.role !== "buyer") return [];
    return (notifications || []).filter((notification) => (
      notification.userId === currentUser.id
      && notification.type === "message"
      && !notification.read
    ));
  }, [notifications, currentUser]);
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
  const followedSellerIds = useMemo(
    () =>
      new Set(
        (sellerFollows || [])
          .filter((entry) => entry.followerUserId === currentUser?.id)
          .map((entry) => entry.sellerId)
      ),
    [sellerFollows, currentUser]
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
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-16">
      {!currentUser ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
          <Lock className="mx-auto h-10 w-10 text-rose-600" />
          <h2 className="mt-4 text-2xl font-bold">{accountText.loginRequired}</h2>
          <p className="mt-2 text-slate-600">{tx("loginHelp")}</p>
        </div>
      ) : (
        <>
          <SectionTitle eyebrow="Account" title={accountText.accountCenterTitle} subtitle={accountText.accountCenterSubtitle} />
          <div className="mb-4 lg:hidden">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {currentUser.role === "buyer" ? (
                <>
                  <button onClick={() => scrollToSection("buyer-messaging")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.messages}</button>
                  <button onClick={() => scrollToSection("buyer-favorites")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.favorites}</button>
                  <button onClick={() => scrollToSection("buyer-wallet")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.wallet}</button>
                  <button onClick={() => scrollToSection("buyer-orders")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.orders}</button>
                  <button onClick={() => scrollToSection("buyer-custom-requests")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">Custom requests</button>
                  <button onClick={() => scrollToSection("buyer-contact")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.contact}</button>
                </>
              ) : (
                <>
                  <button onClick={() => scrollToSection("buyer-orders")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.orders}</button>
                  <button onClick={() => scrollToSection("buyer-contact")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.contact}</button>
                  <button onClick={() => scrollToSection("buyer-wallet")} className="whitespace-nowrap rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700">{accountText.wallet}</button>
                </>
              )}
            </div>
          </div>
          {currentUser.role === "admin" ? (
            <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-600">Admin quick access</div>
                  <div className="mt-1 text-sm text-slate-700">Open the admin control center to manage approvals, users, and sales.</div>
                </div>
                <button
                  onClick={() => navigate("/admin")}
                  className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
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
                  className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Open Seller Dashboard
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
                <button onClick={() => navigate("/seller-dashboard")} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">Open Seller Dashboard</button>
                <button onClick={() => navigate("/contact")} className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800">Contact support</button>
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
                      onClick={() => scrollToSection("buyer-messaging")}
                      className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800"
                    >
                      Open messages
                    </button>
                  ) : null}
                  {buyerUnreadCustomRequestMessageCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => scrollToSection("buyer-custom-requests")}
                      className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800"
                    >
                      Open custom requests
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800"
                  >
                    Mark as read
                  </button>
                </div>
              </div>
            </div>
          ) : null}
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <ShoppingBag className="h-6 w-6 text-rose-600" />
                  <div className="mt-4 text-sm text-slate-500">{tx("totalOrders")}</div>
                  <div className="mt-2 text-3xl font-bold">{buyerOrders.length}</div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <Clock3 className="h-6 w-6 text-rose-600" />
                  <div className="mt-4 text-sm text-slate-500">{tx("processing")}</div>
                  <div className="mt-2 text-3xl font-bold">{buyerOrders.filter((order) => order.fulfillmentStatus === "processing").length}</div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <CheckCircle2 className="h-6 w-6 text-rose-600" />
                  <div className="mt-4 text-sm text-slate-500">{tx("shippedDelivered")}</div>
                  <div className="mt-2 text-3xl font-bold">{buyerOrders.filter((order) => order.fulfillmentStatus !== "processing").length}</div>
                </div>
              </div>

              <div id="buyer-orders" className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
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
                            <div className="flex items-center gap-3 md:justify-end">
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
                              <a
                                href={`https://www.17track.net/en/track?nums=${encodeURIComponent(order.trackingNumber)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                              >
                                {tx("trackPackage")}
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {currentUser.role === "buyer" ? (
                <div id="buyer-custom-requests" className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">Custom requests</h3>
                    <button
                      onClick={() => navigate("/custom-requests")}
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                    >
                      Open full custom requests page
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Manage quotes, counters, and request messages directly from your dashboard.
                  </p>
                  <div className="mt-5 space-y-4">
                    {(buyerCustomRequests || []).length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No custom requests yet.</div>
                    ) : (buyerCustomRequests || []).slice(0, 8).map((request) => (
                      <div key={request.id} className="rounded-2xl border border-rose-100 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{sellerMap?.[request.sellerId]?.name || request.sellerId}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatDateTimeNoSeconds(request.createdAt || Date.now())} · {request.status || "open"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-rose-700">{formatPriceTHB(Number(request.quotedPriceThb || 0) || 0)}</div>
                            <div className="mt-1 text-xs capitalize text-slate-500">{getCustomRequestQuoteStatusLabel(request)}</div>
                            {isBuyerPaymentPending(request) ? (
                              <div className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                                Pending payment
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                          <div className="max-h-40 space-y-2 overflow-y-auto">
                            {(customRequestMessagesByRequestId?.[request.id] || []).length === 0 ? (
                              <div className="text-xs text-slate-500">No replies yet.</div>
                            ) : (customRequestMessagesByRequestId?.[request.id] || []).map((message) => (
                            <div key={message.id} className={`max-w-[90%] rounded-xl px-3 py-2 text-xs ${message.senderRole === "buyer" ? "ml-auto bg-rose-100 text-rose-900 ring-1 ring-rose-200" : "bg-white text-slate-700 ring-1 ring-rose-100"}`}>
                                <div>{resolveConversationMessageBody(message)}</div>
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
                                {canToggleConversationTranslation(message) ? (
                                  <button
                                    type="button"
                                    onClick={() => setShowOriginalMessageById((prev) => ({ ...prev, [message.id]: !prev[message.id] }))}
                                    className={`mt-1 block text-[11px] font-semibold ${message.senderRole === "buyer" ? "text-rose-100" : "text-slate-500"}`}
                                  >
                                    {showOriginalMessageById[message.id] ? tx("showTranslation") : tx("showOriginal")}
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                            <input
                              value={customRequestReplyDraftById[request.id] || ""}
                              onChange={(event) => setCustomRequestReplyDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
                              placeholder="Reply in this request"
                            />
                            <button
                              onClick={() => {
                                sendCustomRequestMessage(
                                  request.id,
                                  customRequestReplyDraftById[request.id] || "",
                                  customRequestImageDraftById[request.id] || [],
                                  () => {
                                    setCustomRequestReplyDraftById((prev) => ({ ...prev, [request.id]: "" }));
                                    setCustomRequestImageDraftById((prev) => ({ ...prev, [request.id]: [] }));
                                    setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: "" }));
                                  },
                                  (message) => setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: message || "" })),
                                );
                              }}
                              disabled={!canAffordCustomRequestMessage}
                              className={`rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white ${!canAffordCustomRequestMessage ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              {currentUser?.role === "buyer" ? `Send (${formatPriceTHB(MESSAGE_FEE_THB)})` : "Send"}
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
                                    onChange={(event) => handleCustomRequestImageDraftSelect(request.id, event.target.files)}
                                    className="max-w-full rounded-xl border border-dashed border-rose-300 px-3 py-2 text-[11px]"
                                  />
                                  {(customRequestImageDraftById[request.id] || []).length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setCustomRequestImageDraftById((prev) => ({ ...prev, [request.id]: [] }))}
                                      className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700"
                                    >
                                      Clear images
                                    </button>
                                  ) : null}
                                </div>
                                {(customRequestImageDraftById[request.id] || []).length > 0 ? (
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    {(customRequestImageDraftById[request.id] || []).map((image) => (
                                      <div key={image.id} className="overflow-hidden rounded-lg ring-1 ring-rose-200/60">
                                        <ProductImage src={image.image} label={image.imageName || "Draft attachment"} />
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            ) : (
                              <div className="text-[11px] text-slate-500">
                                Seller has not enabled buyer image uploads for this request yet.
                              </div>
                            )}
                          </div>
                        </div>

                        {Number(request.quotedPriceThb || 0) >= MIN_CUSTOM_REQUEST_PURCHASE_THB ? (
                          <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Seller quote</div>
                              {isBuyerPaymentPending(request) ? (
                                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800">
                                  Pending payment
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 text-sm text-slate-700">
                              {formatPriceTHB(Number(request.quotedPriceThb || 0))} · <span className="capitalize">{getCustomRequestQuoteStatusLabel(request)}</span>
                              {Number(request.buyerCounterPriceThb || 0) > 0 ? ` · Your counter ${formatPriceTHB(Number(request.buyerCounterPriceThb || 0))}` : ""}
                            </div>
                            {request.quoteMessage ? <div className="mt-1 text-xs text-slate-600">Seller note: {request.quoteMessage}</div> : null}
                            {request.quoteStatus === "countered" && Number(request.buyerCounterPriceThb || 0) > 0 ? (
                              <div className="mt-2 text-xs text-slate-700">
                                Waiting for seller response to your counter {formatPriceTHB(Number(request.buyerCounterPriceThb || 0))}.
                              </div>
                            ) : ["accepted", "declined"].includes(request.quoteStatus || "") ? null : (
                              <>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    onClick={() => respondToCustomRequestPrice(
                                      request.id,
                                      "accept",
                                      {},
                                      () => setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: "Quote accepted and payment sent." })),
                                      (message) => {
                                        const quotedPrice = Number(request.quotedPriceThb || 0);
                                        const walletBalance = Number(currentWalletBalance || 0);
                                        const shortfall = Number((quotedPrice - walletBalance).toFixed(2));
                                        if (shortfall > 0) {
                                          const requiredTopUp = getRequiredTopUpAmount(shortfall);
                                          setCustomTopUpAmount(String(Math.ceil(requiredTopUp)));
                                          setCustomRequestStatusMessageById((prev) => ({
                                            ...prev,
                                            [request.id]: `You need ${formatPriceTHB(quotedPrice)} to accept this quote. Top up at least ${formatPriceTHB(requiredTopUp)} and try again.`,
                                          }));
                                          scrollToSection("buyer-wallet");
                                          return;
                                        }
                                        setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: message || "" }));
                                      },
                                    )}
                                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                                  >
                                    Accept & pay {formatPriceTHB(Number(request.quotedPriceThb || 0))}
                                  </button>
                                  <button
                                    onClick={() => respondToCustomRequestPrice(request.id, "decline", {}, () => setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: "Quote declined." })), (message) => setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: message || "" })))}
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
                                    value={customRequestCounterDraftById[request.id] || ""}
                                    onChange={(event) => setCustomRequestCounterDraftById((prev) => ({ ...prev, [request.id]: event.target.value }))}
                                    className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                    placeholder="Counter amount (THB)"
                                  />
                                  <button
                                    onClick={() => {
                                      respondToCustomRequestPrice(
                                        request.id,
                                        "counter",
                                        { counterPriceThb: customRequestCounterDraftById[request.id] || 0 },
                                        () => {
                                          setCustomRequestCounterDraftById((prev) => ({ ...prev, [request.id]: "" }));
                                          setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: `Counter sent. ${formatPriceTHB(MESSAGE_FEE_THB)} message fee charged.` }));
                                        },
                                        (message) => setCustomRequestStatusMessageById((prev) => ({ ...prev, [request.id]: message || "" })),
                                      );
                                    }}
                                    disabled={!canAffordCustomRequestMessage}
                                    className={`rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 ${!canAffordCustomRequestMessage ? "cursor-not-allowed opacity-60" : ""}`}
                                  >
                                    Counter ({formatPriceTHB(MESSAGE_FEE_THB)} fee)
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ) : null}

                        {customRequestStatusMessageById[request.id] ? (
                          <div className="mt-2 text-[11px] text-indigo-700">{customRequestStatusMessageById[request.id]}</div>
                        ) : null}
                        {currentUser?.role === "buyer" && !canAffordCustomRequestMessage ? (
                          <div className="mt-2 text-[11px] text-amber-700">
                            {tx("addWalletReplyPrefix")} {formatPriceTHB(MESSAGE_FEE_THB)} {tx("addWalletRequestMessageSuffix")}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {currentUser.role === "buyer" ? (
                <div id="buyer-messaging" className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold">{tx("messagingCenter")}</h3>
                    <div className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">{formatPriceTHB(MESSAGE_FEE_THB)} {tx("perMessage")}</div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{tx("messagingHelp")}</p>
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
                              className="flex w-full items-center justify-between rounded-2xl border border-rose-100 px-3 py-2 text-left hover:bg-rose-50"
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
                            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
                            placeholder={tx("searchProductOrSeller")}
                          />
                          <select value={buyerMessageProductFilters.size} onChange={(event) => updateBuyerMessageProductFilter("size", event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                            {(buyerMessageFilterOptions?.size || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                          </select>
                          <select value={buyerMessageProductFilters.style} onChange={(event) => updateBuyerMessageProductFilter("style", event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                            {(buyerMessageFilterOptions?.style || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                          </select>
                          <select value={buyerMessageProductFilters.fabric} onChange={(event) => updateBuyerMessageProductFilter("fabric", event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                            {(buyerMessageFilterOptions?.fabric || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                          </select>
                          <select value={buyerMessageProductFilters.daysWorn} onChange={(event) => updateBuyerMessageProductFilter("daysWorn", event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                            {(buyerMessageFilterOptions?.daysWorn || ["All"]).map((value) => <option key={value} value={value}>{localizeOptionLabel(value, uiLanguage)}</option>)}
                          </select>
                          <select value={buyerMessageProductFilters.price} onChange={(event) => updateBuyerMessageProductFilter("price", event.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                            {[
                              { value: "All", label: localizeOptionLabel("All", uiLanguage) },
                              { value: `Under ${formatPriceTHB(1400)}`, label: `${localizeOptionLabel("Under", uiLanguage)} ${formatPriceTHB(1400)}` },
                              { value: `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}`, label: `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}` },
                              { value: `${formatPriceTHB(2000)}+`, label: `${formatPriceTHB(2000)}+` }
                            ].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                        <div className="mt-3 space-y-2">
                          {buyerMessageProductResults.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noProductFilterResults")}</div>
                          ) : buyerMessageProductResults.slice(0, 5).map((product) => (
                            <button
                              key={product.id}
                              onClick={() => startBuyerConversationWithSeller(product.sellerId)}
                              className="flex w-full items-center justify-between rounded-2xl border border-rose-100 px-3 py-2 text-left hover:bg-rose-50"
                            >
                              <span className="text-sm font-medium">{product.title}</span>
                              <span className="text-xs text-slate-500">{sellerMap[product.sellerId]?.name || tx("seller")} · {product.daysWorn || tx("notSpecified")}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-rose-100 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-500">{tx("conversationList")}</div>
                        <div className="mt-3 space-y-2">
                          {buyerConversations.length === 0 ? (
                            <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("conversationsAppearHere")}</div>
                          ) : buyerConversations.map((conversation) => (
                            <button
                              key={conversation.conversationId}
                              onClick={() => setBuyerDashboardConversationId(conversation.conversationId)}
                              className={`w-full rounded-2xl border px-3 py-3 text-left ${buyerDashboardConversationId === conversation.conversationId ? "border-rose-300 bg-rose-50" : "border-rose-100"}`}
                            >
                              <div className="font-semibold">{tx("conversationWith")} {sellerMap[conversation.sellerId]?.name || tx("seller")}</div>
                              <div className="mt-1 text-sm text-slate-500">{conversation.latestBody}</div>
                              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                                <span>{conversation.latestAt ? formatDateTimeNoSeconds(conversation.latestAt) : tx("noDate")}</span>
                                {conversation.unreadCount > 0 ? <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">{conversation.unreadCount} {tx("newCountSuffix")}</span> : null}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-100 p-4">
                      <div className="text-sm font-semibold">
                        {buyerDashboardConversationId
                          ? `${tx("conversationWith")} ${sellerMap[buyerDashboardConversationId.split("__")[1]]?.name || tx("seller")}`
                          : tx("selectOrStartConversation")}
                      </div>
                      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                        {buyerDashboardConversationMessages.length === 0 ? (
                          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{tx("noMessagesInThread")}</div>
                        ) : buyerDashboardConversationMessages.map((message) => (
                          <div key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === "buyer" ? "ml-auto bg-rose-100 text-rose-900 ring-1 ring-rose-200" : "bg-slate-100 text-slate-700"}`}>
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
                        {buyerDashboardMessageError && !canAffordCustomRequestMessage ? (
                          <button
                            type="button"
                            onClick={() => scrollToSection("buyer-wallet")}
                            className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
                          >
                            Top up wallet
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">{accountText.orderHistory}</h3>
                <div className="mt-5 space-y-3">
                  {recentBuyerOrders.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{tx("purchaseHistoryHelp")}</div>
                  ) : recentBuyerOrders.map((order) => (
                    <div key={`${order.id}-history`} className="grid gap-3 rounded-2xl border border-rose-100 p-4 md:grid-cols-[1.3fr_0.9fr_0.8fr_0.8fr]">
                      <div>
                        <div className="font-semibold">{order.id}</div>
                        <div className="mt-1 text-sm text-slate-500">{order.items.length} {tx("items")}</div>
                      </div>
                      <div className="text-sm text-slate-600">{new Date(order.createdAt || Date.now()).toLocaleDateString()}</div>
                      <div className="text-sm text-slate-600">{localizePaymentStatus(order.paymentStatus)}</div>
                      <div className="text-sm font-semibold text-rose-700">{formatPriceTHB(order.total)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">{accountText.billingLedger}</h3>
                  <button onClick={markAllNotificationsRead} className="text-sm font-semibold text-rose-700">{tx("markNotificationsRead")}</button>
                </div>
                <div className="mt-4 space-y-3">
                  {buyerLedger.length === 0 ? <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{tx("noWalletActivity")}</div> : buyerLedger.map((entry) => (
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
              </div>
            </div>

            <div className="space-y-8">
              <div id="buyer-wallet" className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-rose-600" />
                  <h3 className="text-xl font-semibold">{accountText.accountBalance}</h3>
                </div>
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
                            runWalletTopUp(amount);
                          }}
                          className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                        >
                          {tx("add")} {formatPriceTHB(amount)}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={MIN_WALLET_TOP_UP_THB}
                        step="1"
                        value={customTopUpAmount}
                        onChange={(event) => {
                          setCustomTopUpError("");
                          setCustomTopUpAmount(event.target.value);
                        }}
                        className="w-44 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                        placeholder={`Custom amount (min ${MIN_WALLET_TOP_UP_THB})`}
                      />
                      <button
                        onClick={() => {
                          const amount = Number(customTopUpAmount);
                          if (!isValidWalletTopUpAmount(amount)) {
                            setCustomTopUpError(`Custom amount must be at least ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.`);
                            return;
                          }
                          setCustomTopUpError("");
                          runWalletTopUp(amount);
                        }}
                        className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                      >
                        Add custom amount
                      </button>
                    </div>
                    {customTopUpError ? <div className="mt-2 text-sm font-medium text-rose-600">{customTopUpError}</div> : null}
                    <div className="mt-3 text-sm text-slate-500">{walletStatus === "processing" ? tx("walletProcessing") : walletStatus === "success" ? `${tx("walletAddedPrefix")} ${formatPriceTHB(topUpAmount)} ${tx("walletAddedSuffix")}` : tx("walletPresetHelp")}</div>
                    {walletStatus === "success" && checkoutReturnPath ? (
                      <div className="mt-2 text-xs font-medium text-rose-700">
                        Top-up complete. Returning to checkout...
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              {currentUser.role === "buyer" ? (
                <div id="buyer-favorites" className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-5 w-5 text-rose-600" />
                    <h3 className="text-xl font-semibold">{accountText.favoriteSellers}</h3>
                  </div>
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
                          <button onClick={() => navigate(`/seller/${seller.id}`)} className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700">{tx("view")}</button>
                          <button
                            onClick={() => startBuyerConversationWithSeller(seller.id)}
                            className="rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          >
                            {tx("message")}
                          </button>
                          <button
                            onClick={() => toggleSellerFollow(seller.id)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            {tx("remove")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
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
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-rose-600" /> {accountForm.address || tx("noAddressSaved")}</div>
                  <div>{accountForm.city || tx("cityFallback")}{accountForm.city && accountForm.country ? ", " : ""}{accountForm.country || tx("countryFallback")}</div>
                  <div>{accountForm.postalCode || tx("postalCodeFallback")}</div>
                  <div>{accountForm.phone || tx("phoneNotSet")}</div>
                  <div>{accountForm.email || tx("emailNotSet")}</div>
                </div>
              </div>

              {currentUser.role === "buyer" ? (
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">{accountText.quickFinder}</h3>
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
                            <button onClick={() => navigate(`/seller/${seller.id}`)} className="text-left font-medium hover:text-rose-700">{seller.name}</button>
                            <button
                              onClick={() => toggleSellerFollow(seller.id)}
                              className={`rounded-xl border px-2 py-1 text-[11px] font-semibold ${followedSellerIds.has(seller.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
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
                        <button key={product.id} onClick={() => navigate(`/product/${product.slug}`)} className="flex w-full items-center justify-between rounded-2xl border border-rose-100 px-4 py-3 text-left hover:bg-rose-50">
                          <span className="font-medium">{product.title}</span>
                          <span className="text-xs text-slate-500">${product.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div id="buyer-contact" className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <h3 className="text-xl font-semibold">{accountText.contactDetails}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tx("updateContactHelp")}</p>
                <div className="mt-5 grid gap-4">
                  <input value={accountForm.name} onChange={(e) => updateAccountField("name", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("fullName")} />
                  <input value={accountForm.email} onChange={(e) => updateAccountField("email", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("emailPlaceholder")} />
                  <input value={accountForm.phone} onChange={(e) => updateAccountField("phone", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("phone")} />
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <input value={accountForm.country} onChange={(e) => updateAccountField("country", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("country")} />
                    <input value={accountForm.city} onChange={(e) => updateAccountField("city", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("city")} />
                  </div>
                  <input value={accountForm.postalCode || ""} onChange={(e) => updateAccountField("postalCode", e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("postalCode")} />
                  <textarea value={accountForm.address} onChange={(e) => updateAccountField("address", e.target.value)} className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3" placeholder={tx("address")} />
                  <button onClick={saveAccountDetails} className="rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">{accountText.saveDetails}</button>
                  {accountSaveMessage ? <div className="text-sm font-medium text-emerald-700">{accountSaveMessage}</div> : null}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </section>
  );
}

export function AppealsPage({
  currentUser,
  userStrikes,
  userAppeals,
  submitStrikeAppeal,
  submittingStrikeAppeal,
  navigate
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
          <button onClick={() => navigate("/login")} className="mt-4 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
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
