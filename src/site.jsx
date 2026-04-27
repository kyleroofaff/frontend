import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Armchair,
  Beer,
  Bell,
  CheckCircle2,
  CircleDot,
  Clock3,
  ChevronDown,
  ChevronLeft,
  Mic2,
  Music2,
  Sparkles,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  Store,
  Target,
  Trees,
  Tv,
  User,
  UtensilsCrossed,
  UserCog
} from 'lucide-react';
import { BarQrCard, PageShell, ProductImage, SectionTitle, SellerQrCard } from './components/site/SitePrimitives.jsx';
import {
  CommunityStandardsPage,
  ContactPage,
  CustomRequestsPage,
  FaqPage,
  FindPage,
  HowToApplyPage,
  OrderHelpPage,
  SafetyReportPage,
  PortfolioSetupPage,
  PrivacyPackagingPage,
  PrivacyPolicyPage,
  RefundEvidencePage,
  RefundPolicyPage,
  SellerGuidelinesPage,
  SellerAppealsPage,
  SellerPortfoliosPage,
  SellerStandardsPage,
  ShippingPolicyPage,
  TermsPage,
  WorldwideShippingPage,
} from './pages/StaticPages.jsx';
import {
  COLOR_OPTIONS,
  CONDITION_OPTIONS,
  CUSTOM_REQUEST_FEE_THB,
  DAYS_WORN_OPTIONS,
  localizeOptionLabel,
  formatPriceTHB,
  MESSAGE_FEE_THB,
  MIN_FEED_UNLOCK_PRICE_THB,
  MIN_CUSTOM_REQUEST_PURCHASE_THB,
  MIN_SELLER_PRICE_THB,
  FABRIC_OPTIONS,
  SCENT_LEVEL_OPTIONS,
  SELLER_LANGUAGE_OPTIONS,
  SIZE_OPTIONS,
  STYLE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  BRA_SIZE_OPTIONS,
  THAI_BRA_SIZE_OPTIONS,
  THAI_BRA_BANDS,
  THAI_BRA_CUPS,
  THAI_BRA_CUP_CM_SPAN,
  THAI_TO_US_BRA_SIZE_MAP,
  PANTY_SIZE_OPTIONS,
  SHARED_SIZE_OPTIONS,
  SELLER_BAR_REGISTRATION_COUNTRIES,
  BUYER_REGISTRATION_COUNTRIES,
  REGISTRATION_COUNTRIES,
  REGISTRATION_CITIES_BY_COUNTRY,
  formatHeight,
  formatWeight,
} from './productOptions.js';
import { formatDateTimeNoSeconds, normalizeTimeFormat, setStoredTimeFormat } from './utils/timeFormat.js';
import { getRequiredTopUpAmount, isValidWalletTopUpAmount, MIN_WALLET_TOP_UP_THB } from './utils/walletTopUp.js';

const StoriesPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.StoriesPage })));
const SellerDashboardPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.SellerDashboardPage })));
const SellerMessagesPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.SellerMessagesPage })));
const BuyerMessagesPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.BuyerMessagesPage })));
const BarMessagesPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.BarMessagesPage })));
const StoriesWorkspacePage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.StoriesWorkspacePage })));
const SellerUploadPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.SellerUploadPage })));
const AdminPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.AdminPage })));
const CheckoutPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.CheckoutPage })));
const AccountPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.AccountPage })));
const AppealsPage = lazy(() => import('./pages/DashboardPages.jsx').then((module) => ({ default: module.AppealsPage })));

const ADMIN_SCOPES = {
  SALES_READ: 'sales.read',
  PAYMENTS_MANAGE: 'payments.manage',
  AFFILIATIONS_MANAGE: 'affiliations.manage',
  DISPUTES_REVIEW: 'disputes.review',
  USERS_BLOCK: 'users.block',
  USERS_ADMIN_ACCESS_MANAGE: 'users.admin_access.manage',
  USERS_CREDENTIALS_MANAGE: 'users.credentials.manage',
};

const KNOWN_ADMIN_SCOPES = new Set(Object.values(ADMIN_SCOPES));

const GIFT_CATALOG = [
  { id: 'gift_rose', type: 'rose', name: 'Rose', nameI18n: { en: 'Rose', th: 'กุหลาบ', my: 'နှင်းဆီ', ru: 'Роза' }, price: 200, emoji: '🌹', fulfillmentType: 'physical' },
  { id: 'gift_dozen_roses', type: 'dozen_roses', name: 'Dozen Roses', nameI18n: { en: 'Dozen Roses', th: 'กุหลาบ 12 ดอก', my: 'နှင်းဆီ ၁၂ ပွင့်', ru: '12 Роз' }, price: 2000, emoji: '💐', fulfillmentType: 'physical' },
  { id: 'gift_chocolate', type: 'chocolate', name: 'Chocolate', nameI18n: { en: 'Chocolate', th: 'ช็อกโกแลต', my: 'ချောကလက်', ru: 'Шоколад' }, price: 1000, emoji: '🍫', fulfillmentType: 'physical' },
  { id: 'gift_drink', type: 'drink', name: 'Drink', nameI18n: { en: 'Drink', th: 'เครื่องดื่ม', my: 'အချိုရည်', ru: 'Напиток' }, price: 300, emoji: '🍹', fulfillmentType: 'drink' },
];

function resolveAdminAccess(user) {
  const role = String(user?.role || '').trim().toLowerCase();
  if (role === 'admin') {
    return { enabled: true, level: 'super', scopes: ['*'] };
  }
  const raw = user?.adminAccess && typeof user.adminAccess === 'object' ? user.adminAccess : {};
  const enabled = raw.enabled === true;
  if (!enabled) {
    return { enabled: false, level: 'none', scopes: [] };
  }
  const scopes = Array.isArray(raw.scopes)
    ? raw.scopes
      .map((entry) => String(entry || '').trim())
      .filter((scope) => KNOWN_ADMIN_SCOPES.has(scope))
    : [];
  return {
    enabled: true,
    level: raw.level === 'super' ? 'super' : 'limited',
    scopes,
  };
}

function hasAdminScopeAccess(user, scope) {
  const normalizedScope = String(scope || '').trim();
  if (!normalizedScope) return false;
  const adminAccess = resolveAdminAccess(user);
  if (adminAccess.level === 'super') return true;
  if (!adminAccess.enabled) return false;
  return adminAccess.scopes.includes(normalizedScope);
}

function hasAdminPanelAccess(user) {
  const adminAccess = resolveAdminAccess(user);
  return adminAccess.enabled || adminAccess.level === 'super';
}

function normalizeAuthUserRole(userLike) {
  if (!userLike || typeof userLike !== 'object') return userLike;
  const raw = String(userLike.role || '').trim().toLowerCase();
  const allowed = new Set(['buyer', 'seller', 'bar', 'admin']);
  const role = allowed.has(raw) ? raw : 'buyer';
  return { ...userLike, role };
}

function resolvePrimaryShellRoute(user) {
  if (!user || typeof user !== 'object') return '/account';
  if (hasAdminPanelAccess(user)) return '/admin';
  const { role } = normalizeAuthUserRole(user);
  if (role === 'bar') return '/bar-dashboard';
  if (role === 'seller') return '/seller-dashboard';
  return '/account';
}

function buildAdminPermissions(user) {
  const isSuperAdmin = resolveAdminAccess(user).level === 'super';
  const canManageAffiliations = hasAdminScopeAccess(user, ADMIN_SCOPES.AFFILIATIONS_MANAGE);
  const canReviewDisputes = hasAdminScopeAccess(user, ADMIN_SCOPES.DISPUTES_REVIEW);
  const canManagePayments = hasAdminScopeAccess(user, ADMIN_SCOPES.PAYMENTS_MANAGE);
  const canViewSales = hasAdminScopeAccess(user, ADMIN_SCOPES.SALES_READ);
  const canBlockUsers = hasAdminScopeAccess(user, ADMIN_SCOPES.USERS_BLOCK);
  const canManageAdminAccess = hasAdminScopeAccess(user, ADMIN_SCOPES.USERS_ADMIN_ACCESS_MANAGE);
  const canManageCredentials = hasAdminScopeAccess(user, ADMIN_SCOPES.USERS_CREDENTIALS_MANAGE);

  if (isSuperAdmin) {
    return {
      isSuperAdmin: true,
      canManageAffiliations: true,
      canReviewDisputes: true,
      canManagePayments: true,
      canViewSales: true,
      canBlockUsers: true,
      canManageAdminAccess: true,
      canManageCredentials: true,
      tabAccess: null,
    };
  }

  const canAccessUsersTab = canBlockUsers || canManageAffiliations || canManageAdminAccess || canManageCredentials || canManagePayments;
  return {
    isSuperAdmin: false,
    canManageAffiliations,
    canReviewDisputes,
    canManagePayments,
    canViewSales,
    canBlockUsers,
    canManageAdminAccess,
    canManageCredentials,
    tabAccess: {
      overview: true,
      users: canAccessUsersTab,
      bars: canManageAffiliations,
      disputes: canReviewDisputes,
      sales: canViewSales,
      payments: canManagePayments,
      inbox: false,
      auth: false,
      social: false,
      products: false,
      email_inbox: false,
      email_templates: false,
      cms: false,
      deployment: false,
    },
  };
}

const SHARED_NAV_I18N = {
  en: { home: 'Home', sellers: 'Sellers', bars: 'Bars', find: 'Find', sellerFeed: 'Stories', customRequests: 'Custom Requests', faq: 'FAQ', contact: 'Contact', account: 'Account', dashboard: 'Dashboard', messages: 'Messages', login: 'Login', register: 'Register', logout: 'Logout' },
  th: { home: 'หน้าแรก', sellers: 'ผู้ขาย', bars: 'บาร์', find: 'ค้นหา', sellerFeed: 'สตอรี่', customRequests: 'คำขอพิเศษ', faq: 'คำถามที่พบบ่อย', contact: 'ติดต่อ', account: 'บัญชี', dashboard: 'แดชบอร์ด', messages: 'ข้อความ', login: 'เข้าสู่ระบบ', register: 'สมัครสมาชิก', logout: 'ออกจากระบบ' },
  my: { home: 'ပင်မ', sellers: 'ရောင်းသူများ', bars: 'bars', find: 'ရှာဖွေရန်', sellerFeed: 'Stories', customRequests: 'custom request များ', faq: 'မေးလေ့ရှိသော မေးခွန်းများ', contact: 'ဆက်သွယ်ရန်', account: 'အကောင့်', dashboard: 'ဒက်ရှ်ဘုတ်', messages: 'မက်ဆေ့ချ်များ', login: 'အကောင့်ဝင်ရန်', register: 'စာရင်းသွင်းရန်', logout: 'ထွက်ရန်' },
  ru: { home: 'Главная', sellers: 'Продавцы', bars: 'Бары', find: 'Поиск', sellerFeed: 'Истории', customRequests: 'Индивидуальные запросы', faq: 'FAQ', contact: 'Контакты', account: 'Аккаунт', dashboard: 'Панель', messages: 'Сообщения', login: 'Войти', register: 'Регистрация', logout: 'Выйти' },
};

const BAR_DASHBOARD_I18N = {
  en: {
    barDashboard: 'Bar dashboard',
    title: 'Manage your bar profile',
    subtitle: 'Update your bar details, share specials, and post live bar photos.',
    language: 'Language',
    profileTitle: 'Bar profile',
    profileImage: 'Bar profile image',
    locationPlaceholder: 'Bar location',
    aboutPlaceholder: 'About your bar',
    specialsPlaceholder: 'Current specials and events',
    mapEmbedPlaceholder: 'Map embed URL (Google Maps embed)',
    mapLinkPlaceholder: 'Map link URL',
    saveProfile: 'Save bar profile',
    saving: 'Saving...',
    profileSaved: 'Bar profile saved.',
    mapLocationTitle: 'Map location',
    mapLocationInstructions: 'Paste a Google Maps link for your bar. Open Google Maps, find your bar, tap Share and copy the link.',
    addLocationButton: 'Add location',
    mapStep1: 'Open Google Maps and search for your bar.',
    mapStep2: 'Tap Share, then Copy link.',
    mapStep3: 'Paste the link above and click Add location.',
    aboutPresetsTitle: 'About presets',
    aboutPresetsHelp: 'Tap any preset to append text, then edit it however you want.',
    specialsPresetsTitle: 'Specials text presets',
    chooseImage: 'Choose image',
    noFileSelected: 'No file selected',
    closeSectionLabel: 'Close',
    feedTitle: 'Bar Stories',
    feedSubtitle: 'Use this like the live stories: post photos, updates, and specials from your venue.',
    feedPlaceholder: "Share tonight's vibe, specials, or event updates...",
    preview: 'Bar post preview',
    postButton: 'Post to bar stories',
    watchFeeds: 'Watch Stories',
    posting: 'Posting...',
    noPosts: 'No bar posts yet. Create your first post above.',
    noCaption: 'No caption added.',
    deleting: 'Deleting...',
    delete: 'Delete',
    affiliationsTitle: 'Seller affiliations',
    affiliationsSubtitle: 'Review seller applications and remove affiliations when needed.',
    pendingRequestsTitle: 'Pending seller requests',
    noPendingRequests: 'No pending seller requests.',
    pendingRequestsTopAlert: 'You have pending seller applications to review.',
    pendingRequestsTopAlertCount: 'Pending applications',
    reviewApplicationsNow: 'Review now',
    requestedPrefix: 'Requested',
    approve: 'Approve',
    reject: 'Reject',
    inviteSellerTitle: 'Invite seller to join',
    currentlyPrefix: 'currently',
    sendInvite: 'Send invite',
    noOutgoingInvites: 'No outgoing invites.',
    cancelInvite: 'Cancel invite',
    affiliatedSellersTitle: 'Affiliated sellers',
    noAffiliatedSellers: 'No affiliated sellers yet.',
    viewProfile: 'View profile',
    removeFromBar: 'Remove from bar',
    backToBarAccount: 'Back to bar account',
    affiliationNotificationsTitle: 'Affiliation notifications',
    affiliationNotificationsSubtitle: 'Recent updates for add/remove and approval activity.',
    noAffiliationNotifications: 'No affiliation notifications yet.',
    quickPicksTitle: 'Quick picks',
    quickPicksHelp: 'Select what your bar offers, then apply to specials.',
    applyToSpecials: 'Apply to specials',
    clearPicks: 'Clear picks',
    highlightsPrefix: 'Highlights',
    notificationDisplay: 'Notification display',
    discreetMessages: 'Discreet Messages',
    viewMode: 'View',
    on: 'On',
    off: 'Off',
    compact: 'Compact',
    comfort: 'Comfort',
    discreetMessagesHelp: 'Discreet Messages hides sensitive wording in notification previews. View switches between roomier cards (Comfort) and tighter rows (Compact).',
    emailNotifications: 'Email notifications',
    browserNotifications: 'Browser notifications',
    pushNotSupported: 'Push notifications are not supported by this browser.',
    pushBlocked: 'Browser notifications are blocked. Enable notifications in browser settings.',
    shareBarQr: 'Share bar page QR code',
    shareBarQrHelp: (name) => `Visitors can scan this code to open ${name}\u2019s bar profile directly.`,
    copyLink: 'Copy Link',
    downloadQr: 'Download QR',
    affiliateEarnings: 'Affiliate earnings',
    affiliateEarningsHelp: 'Track the money your bar earns from affiliated seller sales and paid buyer interactions.',
    totalEarned: 'Total earned',
    orderCommissions: 'Order commissions',
    messageCommissions: 'Message commissions',
    customRequestCommissions: 'Custom request commissions',
    topAffiliatedSellers: 'Top affiliated sellers (order commissions)',
    noOrderCommissions: 'No order commissions yet.',
    commissionEvents: (n) => `${n} commission event${n > 1 ? 's' : ''}`,
    recentLedger: 'Recent affiliate commission ledger',
    noCommissionTransactions: 'No affiliate commission transactions yet.',
    commissionCredit: 'Commission credit',
    engagementBadge: 'Engagement',
    unreadBadge: 'Unread',
    markRead: 'Mark read',
    removeImage: 'Remove image',
  },
  th: {
    barDashboard: 'แดชบอร์ดบาร์',
    title: 'จัดการโปรไฟล์บาร์ของคุณ',
    subtitle: 'อัปเดตรายละเอียดบาร์ แชร์โปรโมชั่น และโพสต์ภาพสดจากร้านของคุณ',
    language: 'ภาษา',
    profileTitle: 'โปรไฟล์บาร์',
    profileImage: 'รูปโปรไฟล์บาร์',
    locationPlaceholder: 'ที่ตั้งบาร์',
    aboutPlaceholder: 'เกี่ยวกับบาร์ของคุณ',
    specialsPlaceholder: 'โปรโมชั่นและอีเวนต์ปัจจุบัน',
    mapEmbedPlaceholder: 'ลิงก์ฝังแผนที่ (Google Maps embed)',
    mapLinkPlaceholder: 'ลิงก์แผนที่',
    saveProfile: 'บันทึกโปรไฟล์บาร์',
    saving: 'กำลังบันทึก...',
    profileSaved: 'บันทึกโปรไฟล์บาร์แล้ว',
    mapLocationTitle: 'ตำแหน่งบนแผนที่',
    mapLocationInstructions: 'วางลิงก์ Google Maps ของบาร์คุณ เปิด Google Maps ค้นหาบาร์ของคุณ แตะแชร์แล้วคัดลอกลิงก์',
    addLocationButton: 'เพิ่มตำแหน่ง',
    mapStep1: 'เปิด Google Maps แล้วค้นหาบาร์ของคุณ',
    mapStep2: 'แตะแชร์ แล้วคัดลอกลิงก์',
    mapStep3: 'วางลิงก์ด้านบน แล้วกดเพิ่มตำแหน่ง',
    aboutPresetsTitle: 'ข้อความสำเร็จรูป',
    aboutPresetsHelp: 'แตะข้อความสำเร็จรูปเพื่อเพิ่ม แล้วแก้ไขได้ตามต้องการ',
    specialsPresetsTitle: 'ข้อความโปรโมชั่นสำเร็จรูป',
    chooseImage: 'เลือกรูปภาพ',
    noFileSelected: 'ยังไม่ได้เลือกไฟล์',
    closeSectionLabel: 'ปิด',
    feedTitle: 'สตอรี่ภาพบาร์',
    feedSubtitle: 'ใช้งานเหมือนสตอรี่สด: โพสต์รูปภาพ อัปเดต และโปรโมชั่นจากร้านคุณ',
    feedPlaceholder: 'แชร์บรรยากาศคืนนี้ โปรโมชั่น หรืออัปเดตงานอีเวนต์...',
    preview: 'ตัวอย่างโพสต์บาร์',
    postButton: 'โพสต์ลงสตอรี่บาร์',
    watchFeeds: 'ดูสตอรี่',
    posting: 'กำลังโพสต์...',
    noPosts: 'ยังไม่มีโพสต์บาร์ สร้างโพสต์แรกของคุณได้ด้านบน',
    noCaption: 'ยังไม่มีคำบรรยาย',
    deleting: 'กำลังลบ...',
    delete: 'ลบ',
    affiliationsTitle: 'การสังกัดผู้ขาย',
    affiliationsSubtitle: 'ตรวจสอบคำขอของผู้ขาย และยกเลิกการสังกัดได้เมื่อจำเป็น',
    pendingRequestsTitle: 'คำขอผู้ขายที่รออนุมัติ',
    noPendingRequests: 'ไม่มีคำขอผู้ขายที่รออนุมัติ',
    pendingRequestsTopAlert: 'คุณมีคำขอสมัครผู้ขายที่รอการตรวจสอบ',
    pendingRequestsTopAlertCount: 'คำขอที่รอ',
    reviewApplicationsNow: 'ตรวจสอบตอนนี้',
    requestedPrefix: 'ส่งคำขอเมื่อ',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    inviteSellerTitle: 'เชิญผู้ขายเข้าร่วม',
    currentlyPrefix: 'ปัจจุบัน',
    sendInvite: 'ส่งคำเชิญ',
    noOutgoingInvites: 'ยังไม่มีคำเชิญที่ส่งออก',
    cancelInvite: 'ยกเลิกคำเชิญ',
    affiliatedSellersTitle: 'ผู้ขายที่สังกัด',
    noAffiliatedSellers: 'ยังไม่มีผู้ขายที่สังกัด',
    viewProfile: 'ดูโปรไฟล์',
    removeFromBar: 'นำออกจากบาร์',
    backToBarAccount: 'กลับไปบัญชีบาร์',
    affiliationNotificationsTitle: 'การแจ้งเตือนการสังกัด',
    affiliationNotificationsSubtitle: 'อัปเดตล่าสุดเกี่ยวกับการเพิ่ม/ลบและการอนุมัติ',
    noAffiliationNotifications: 'ยังไม่มีการแจ้งเตือนการสังกัด',
    quickPicksTitle: 'ตัวเลือกด่วน',
    quickPicksHelp: 'เลือกสิ่งที่บาร์ของคุณมี แล้วเพิ่มลงในส่วนโปรโมชั่น',
    applyToSpecials: 'เพิ่มลงในโปรโมชั่น',
    clearPicks: 'ล้างตัวเลือก',
    highlightsPrefix: 'ไฮไลต์',
    notificationDisplay: 'การแสดงการแจ้งเตือน',
    discreetMessages: 'ข้อความแบบสุขุม',
    viewMode: 'มุมมอง',
    on: 'เปิด',
    off: 'ปิด',
    compact: 'กะทัดรัด',
    comfort: 'สบายตา',
    discreetMessagesHelp: 'ข้อความแบบสุขุมจะซ่อนข้อความละเอียดอ่อนในตัวอย่างการแจ้งเตือน มุมมองสลับระหว่างการ์ดกว้าง (สบายตา) และแถวแน่น (กะทัดรัด)',
    emailNotifications: 'การแจ้งเตือนทางอีเมล',
    browserNotifications: 'การแจ้งเตือนเบราว์เซอร์',
    pushNotSupported: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบพุช',
    pushBlocked: 'การแจ้งเตือนเบราว์เซอร์ถูกบล็อก เปิดใช้งานในการตั้งค่าเบราว์เซอร์',
    shareBarQr: 'แชร์ QR code หน้าบาร์',
    shareBarQrHelp: (name) => `ผู้เยี่ยมชมสามารถสแกนโค้ดนี้เพื่อเปิดโปรไฟล์บาร์ ${name} โดยตรง`,
    copyLink: 'คัดลอกลิงก์',
    downloadQr: 'ดาวน์โหลด QR',
    affiliateEarnings: 'รายได้จากการเป็นพันธมิตร',
    affiliateEarningsHelp: 'ติดตามรายได้ที่บาร์ของคุณได้จากยอดขายของผู้ขายในสังกัดและการโต้ตอบของผู้ซื้อ',
    totalEarned: 'รายได้ทั้งหมด',
    orderCommissions: 'ค่าคอมมิชชั่นจากออเดอร์',
    messageCommissions: 'ค่าคอมมิชชั่นจากข้อความ',
    customRequestCommissions: 'ค่าคอมมิชชั่นจากคำขอพิเศษ',
    topAffiliatedSellers: 'ผู้ขายในสังกัดอันดับต้น (ค่าคอมมิชชั่นจากออเดอร์)',
    noOrderCommissions: 'ยังไม่มีค่าคอมมิชชั่นจากออเดอร์',
    commissionEvents: (n) => `${n} รายการค่าคอมมิชชั่น`,
    recentLedger: 'บัญชีค่าคอมมิชชั่นล่าสุด',
    noCommissionTransactions: 'ยังไม่มีรายการค่าคอมมิชชั่น',
    commissionCredit: 'เครดิตค่าคอมมิชชั่น',
    engagementBadge: 'การมีส่วนร่วม',
    unreadBadge: 'ยังไม่ได้อ่าน',
    markRead: 'ทำเครื่องหมายอ่านแล้ว',
    removeImage: 'ลบรูปภาพ',
  },
  my: {
    barDashboard: 'Bar Dashboard',
    title: 'သင့် bar ပရိုဖိုင်ကို စီမံပါ',
    subtitle: 'bar အချက်အလက်များ အပ်ဒိတ်လုပ်ပြီး အထူးအစီအစဉ်များနှင့် တိုက်ရိုက်ဓာတ်ပုံများ မျှဝေပါ',
    language: 'ဘာသာစကား',
    profileTitle: 'bar ပရိုဖိုင်',
    profileImage: 'bar ပရိုဖိုင်ပုံ',
    locationPlaceholder: 'bar တည်နေရာ',
    aboutPlaceholder: 'သင့် bar အကြောင်း',
    specialsPlaceholder: 'လက်ရှိ promotions နှင့် events',
    mapEmbedPlaceholder: 'Map embed URL (Google Maps embed)',
    mapLinkPlaceholder: 'Map link URL',
    saveProfile: 'bar ပရိုဖိုင် သိမ်းမည်',
    saving: 'သိမ်းနေသည်...',
    profileSaved: 'bar profile ကို သိမ်းပြီးပါပြီ',
    mapLocationTitle: 'မြေပုံတည်နေရာ',
    mapLocationInstructions: 'သင့် bar ၏ Google Maps link ကို paste လုပ်ပါ။ Google Maps ကိုဖွင့်ပြီး bar ကိုရှာ၍ Share ကိုနှိပ်ပြီး link ကို copy ကူးပါ။',
    addLocationButton: 'တည်နေရာထည့်မည်',
    mapStep1: 'Google Maps ကိုဖွင့်ပြီး bar ကိုရှာပါ။',
    mapStep2: 'Share ကိုနှိပ်ပြီး link ကို Copy ကူးပါ။',
    mapStep3: 'link ကို အပေါ်တွင် paste လုပ်ပြီး Add location ကိုနှိပ်ပါ။',
    aboutPresetsTitle: 'About presets',
    aboutPresetsHelp: 'preset ကိုနှိပ်ပြီး text ထည့်ပါ၊ ပြီးရင် ကိုယ်လိုသလို ပြင်ဆင်ပါ။',
    specialsPresetsTitle: 'Specials text presets',
    chooseImage: 'ပုံရွေးမည်',
    noFileSelected: 'ဖိုင်မရွေးထားပါ',
    closeSectionLabel: 'ပိတ်မည်',
    feedTitle: 'bar ဓာတ်ပုံ Stories',
    feedSubtitle: 'live stories လို အသုံးပြုပါ - ဓာတ်ပုံများ၊ updates နှင့် specials မျှဝေပါ',
    feedPlaceholder: 'ယနေ့ည vibe၊ specials သို့မဟုတ် event updates မျှဝေပါ...',
    preview: 'bar post preview',
    postButton: 'bar stories သို့ တင်မည်',
    watchFeeds: 'Stories များကြည့်မည်',
    posting: 'တင်နေသည်...',
    noPosts: 'bar posts မရှိသေးပါ။ အပေါ်တွင် ပထမ post တင်ပါ။',
    noCaption: 'caption မရှိပါ',
    deleting: 'ဖျက်နေသည်...',
    delete: 'ဖျက်မည်',
    affiliationsTitle: 'Seller affiliation များ',
    affiliationsSubtitle: 'seller request များကို approve လုပ်ပြီး လိုအပ်သည့်အခါ affiliation ဖယ်ရှားပါ။',
    pendingRequestsTitle: 'စောင့်ဆိုင်းနေသော seller requests',
    noPendingRequests: 'စောင့်ဆိုင်းနေသော seller request မရှိပါ။',
    pendingRequestsTopAlert: 'စစ်ဆေးရန် စောင့်ဆိုင်းနေသော seller application များရှိသည်',
    pendingRequestsTopAlertCount: 'စောင့်ဆိုင်းနေသော လျှောက်လွှာများ',
    reviewApplicationsNow: 'ယခုစစ်ဆေးမည်',
    requestedPrefix: 'Requested',
    approve: 'Approve',
    reject: 'Reject',
    inviteSellerTitle: 'seller ကို ဖိတ်ခေါ်ရန်',
    currentlyPrefix: 'currently',
    sendInvite: 'invite ပို့မည်',
    noOutgoingInvites: 'ပို့ပြီး invite မရှိသေးပါ။',
    cancelInvite: 'invite ပယ်ဖျက်မည်',
    affiliatedSellersTitle: 'Affiliated sellers',
    noAffiliatedSellers: 'Affiliated sellers မရှိသေးပါ။',
    viewProfile: 'ပရိုဖိုင်ကြည့်မည်',
    removeFromBar: 'bar မှ ဖယ်ရှားမည်',
    backToBarAccount: 'bar အကောင့်သို့ ပြန်သွားမည်',
    affiliationNotificationsTitle: 'Affiliation notifications',
    affiliationNotificationsSubtitle: 'add/remove နှင့် approval activity အပ်ဒိတ်များ',
    noAffiliationNotifications: 'Affiliation notification မရှိသေးပါ။',
    quickPicksTitle: 'အမြန်ရွေးချယ်မှု',
    quickPicksHelp: 'သင့် bar မှာ ရရှိနိုင်တာတွေကို ရွေးပြီး specials ထဲသို့ ထည့်ပါ။',
    applyToSpecials: 'specials ထဲ ထည့်မည်',
    clearPicks: 'ရွေးချယ်မှုရှင်းမည်',
    highlightsPrefix: 'အထူးအချက်များ',
    notificationDisplay: 'အကြောင်းကြားချက် ပြသမှု',
    discreetMessages: 'လျှို့ဝှက် Messages',
    viewMode: 'မြင်ကွင်း',
    on: 'ဖွင့်',
    off: 'ပိတ်',
    compact: 'သိပ်သည်း',
    comfort: 'အဆင်ပြေ',
    discreetMessagesHelp: 'လျှို့ဝှက် Messages သည် အကြောင်းကြားချက်များတွင် အရေးကြီးစာသားများကို ဝှက်ထားသည်။ မြင်ကွင်းသည် ကျယ်ဝန်းသော ကတ်များ (အဆင်ပြေ) နှင့် ကျပ်သော အတန်းများ (သိပ်သည်း) ကို ပြောင်းသည်။',
    emailNotifications: 'Email အကြောင်းကြားချက်',
    browserNotifications: 'Browser အကြောင်းကြားချက်',
    pushNotSupported: 'ဤ browser သည် push notifications ကို မပံ့ပိုးပါ',
    pushBlocked: 'Browser notifications ကို ပိတ်ထားသည်။ browser settings တွင် ဖွင့်ပါ။',
    shareBarQr: 'Bar page QR code မျှဝေမည်',
    shareBarQrHelp: (name) => `ဧည့်သည်များသည် ${name} bar profile ကို တိုက်ရိုက်ဖွင့်ရန် ဤ code ကို scan ဖတ်နိုင်ပါသည်`,
    copyLink: 'Link ကူးမည်',
    downloadQr: 'QR ဒေါင်းလုဒ်',
    affiliateEarnings: 'Affiliate ဝင်ငွေ',
    affiliateEarningsHelp: 'သင့် bar မှ affiliated seller ရောင်းအား နှင့် buyer အပြန်အလှန်ဆက်ဆံမှုမှ ရသော ငွေကို ခြေရာခံပါ',
    totalEarned: 'စုစုပေါင်း ရငွေ',
    orderCommissions: 'Order commissions',
    messageCommissions: 'Message commissions',
    customRequestCommissions: 'Custom request commissions',
    topAffiliatedSellers: 'ထိပ်တန်း affiliated sellers (order commissions)',
    noOrderCommissions: 'Order commissions မရှိသေးပါ',
    commissionEvents: (n) => `commission event ${n} ခု`,
    recentLedger: 'မကြာသေးမီ affiliate commission စာရင်း',
    noCommissionTransactions: 'Affiliate commission transactions မရှိသေးပါ',
    commissionCredit: 'Commission credit',
    engagementBadge: 'Engagement',
    unreadBadge: 'မဖတ်ရသေး',
    markRead: 'ဖတ်ပြီး အဖြစ် မှတ်မည်',
    removeImage: 'ပုံဖယ်ရှားမည်',
  },
  ru: {
    barDashboard: 'Панель бара',
    title: 'Управляйте профилем бара',
    subtitle: 'Обновляйте данные бара, публикуйте акции и фото из заведения.',
    language: 'Язык',
    profileTitle: 'Профиль бара',
    profileImage: 'Фото профиля бара',
    locationPlaceholder: 'Локация бара',
    aboutPlaceholder: 'О вашем баре',
    specialsPlaceholder: 'Текущие акции и события',
    mapEmbedPlaceholder: 'Ссылка embed карты (Google Maps)',
    mapLinkPlaceholder: 'Ссылка на карту',
    saveProfile: 'Сохранить профиль бара',
    saving: 'Сохранение...',
    profileSaved: 'Профиль бара сохранён.',
    mapLocationTitle: 'Местоположение на карте',
    mapLocationInstructions: 'Вставьте ссылку Google Maps вашего бара. Откройте Google Maps, найдите бар, нажмите Поделиться и скопируйте ссылку.',
    addLocationButton: 'Добавить местоположение',
    mapStep1: 'Откройте Google Maps и найдите ваш бар.',
    mapStep2: 'Нажмите Поделиться, затем Копировать ссылку.',
    mapStep3: 'Вставьте ссылку выше и нажмите Добавить местоположение.',
    aboutPresetsTitle: 'Шаблоны описания',
    aboutPresetsHelp: 'Нажмите на шаблон, чтобы добавить текст, затем отредактируйте по желанию.',
    specialsPresetsTitle: 'Шаблоны акций',
    chooseImage: 'Выбрать изображение',
    noFileSelected: 'Файл не выбран',
    closeSectionLabel: 'Закрыть',
    feedTitle: 'Фото-истории бара',
    feedSubtitle: 'Используйте как live-истории: публикуйте фото, обновления и акции.',
    feedPlaceholder: 'Поделитесь атмосферой вечера, акциями или обновлениями событий...',
    preview: 'Предпросмотр поста бара',
    postButton: 'Опубликовать в истории бара',
    watchFeeds: 'Смотреть истории',
    posting: 'Публикация...',
    noPosts: 'Постов бара пока нет. Создайте первый пост выше.',
    noCaption: 'Подпись не добавлена.',
    deleting: 'Удаление...',
    delete: 'Удалить',
    affiliationsTitle: 'Привязки продавцов',
    affiliationsSubtitle: 'Одобряйте заявки продавцов и удаляйте привязки при необходимости.',
    pendingRequestsTitle: 'Ожидающие заявки продавцов',
    noPendingRequests: 'Нет ожидающих заявок продавцов.',
    pendingRequestsTopAlert: 'У вас есть заявки продавцов, ожидающие проверки.',
    pendingRequestsTopAlertCount: 'Заявки в ожидании',
    reviewApplicationsNow: 'Проверить сейчас',
    requestedPrefix: 'Запрошено',
    approve: 'Одобрить',
    reject: 'Отклонить',
    inviteSellerTitle: 'Пригласить продавца',
    currentlyPrefix: 'сейчас',
    sendInvite: 'Отправить приглашение',
    noOutgoingInvites: 'Исходящих приглашений нет.',
    cancelInvite: 'Отменить приглашение',
    affiliatedSellersTitle: 'Привязанные продавцы',
    noAffiliatedSellers: 'Привязанных продавцов пока нет.',
    viewProfile: 'Открыть профиль',
    removeFromBar: 'Удалить из бара',
    backToBarAccount: 'К аккаунту бара',
    affiliationNotificationsTitle: 'Уведомления о привязках',
    affiliationNotificationsSubtitle: 'Последние обновления по добавлению/удалению и одобрениям.',
    noAffiliationNotifications: 'Пока нет уведомлений о привязках.',
    quickPicksTitle: 'Быстрые варианты',
    quickPicksHelp: 'Выберите, что есть в вашем баре, и добавьте в акции.',
    applyToSpecials: 'Добавить в акции',
    clearPicks: 'Очистить выбор',
    highlightsPrefix: 'Особенности',
    notificationDisplay: 'Настройки уведомлений',
    discreetMessages: 'Скрытые сообщения',
    viewMode: 'Вид',
    on: 'Вкл',
    off: 'Выкл',
    compact: 'Компактный',
    comfort: 'Комфортный',
    discreetMessagesHelp: 'Скрытые сообщения скрывают деликатные формулировки в превью уведомлений. Вид переключает между просторными карточками (Комфортный) и плотными рядами (Компактный).',
    emailNotifications: 'Email-уведомления',
    browserNotifications: 'Уведомления браузера',
    pushNotSupported: 'Push-уведомления не поддерживаются этим браузером.',
    pushBlocked: 'Уведомления браузера заблокированы. Включите их в настройках браузера.',
    shareBarQr: 'QR-код страницы бара',
    shareBarQrHelp: (name) => `Посетители могут отсканировать этот код, чтобы перейти к профилю бара ${name}.`,
    copyLink: 'Копировать ссылку',
    downloadQr: 'Скачать QR',
    affiliateEarnings: 'Партнёрский доход',
    affiliateEarningsHelp: 'Отслеживайте доход бара от продаж привязанных продавцов и платных взаимодействий покупателей.',
    totalEarned: 'Всего заработано',
    orderCommissions: 'Комиссии с заказов',
    messageCommissions: 'Комиссии с сообщений',
    customRequestCommissions: 'Комиссии с индивидуальных запросов',
    topAffiliatedSellers: 'Топ привязанных продавцов (комиссии с заказов)',
    noOrderCommissions: 'Пока нет комиссий с заказов.',
    commissionEvents: (n) => `${n} комиссионн${n > 1 ? 'ых событий' : 'ое событие'}`,
    recentLedger: 'Последние записи комиссий',
    noCommissionTransactions: 'Пока нет комиссионных транзакций.',
    commissionCredit: 'Комиссионный кредит',
    engagementBadge: 'Активность',
    unreadBadge: 'Непрочитано',
    markRead: 'Прочитано',
    removeImage: 'Удалить изображение',
  },
};

const BAR_PROFILE_SPECIAL_PRESET_OPTIONS = [
  { id: 'darts', labels: { en: 'Darts', th: 'ปาเป้า', my: 'ဒတ်စ်', ru: 'Дартс' }, Icon: Target },
  { id: 'pool', labels: { en: 'Pool table', th: 'โต๊ะพูล', my: 'ဘီလီယက်โต๊ะ', ru: 'Бильярд' }, Icon: CircleDot },
  { id: 'live-music', labels: { en: 'Live music', th: 'ดนตรีสด', my: 'live music', ru: 'Живая музыка' }, Icon: Music2 },
  { id: 'dj-nights', labels: { en: 'DJ nights', th: 'ดีเจไนท์', my: 'DJ ည', ru: 'DJ-вечера' }, Icon: Music2 },
  { id: 'karaoke', labels: { en: 'Karaoke', th: 'คาราโอเกะ', my: 'ကာရာအိုကေ', ru: 'Караоке' }, Icon: Mic2 },
  { id: 'sports', labels: { en: 'Sports screening', th: 'ถ่ายทอดสดกีฬา', my: 'အားကစားပြသ', ru: 'Спортивные трансляции' }, Icon: Tv },
  { id: 'drink-specials', labels: { en: 'Drink specials', th: 'โปรเครื่องดื่ม', my: 'အထူးသောက်စရာများ', ru: 'Акции на напитки' }, Icon: Beer },
  { id: 'happy-hour', labels: { en: 'Happy hour', th: 'แฮปปี้อาวร์', my: 'happy hour', ru: 'Счастливые часы' }, Icon: Clock3 },
  { id: 'ladies-night', labels: { en: 'Ladies night', th: 'เลดี้ส์ไนท์', my: 'ladies night', ru: 'Женский вечер' }, Icon: Sparkles },
  { id: 'private-booths', labels: { en: 'Private booths', th: 'บูธส่วนตัว', my: 'သီးသန့် booth များ', ru: 'Приватные кабинки' }, Icon: Armchair },
  { id: 'outdoor-seating', labels: { en: 'Outdoor seating', th: 'ที่นั่งกลางแจ้ง', my: 'အပြင်ဘက်ထိုင်ခုံ', ru: 'Уличные места' }, Icon: Trees },
  { id: 'food-menu', labels: { en: 'Food menu', th: 'เมนูอาหาร', my: 'အစားအစာမီနူး', ru: 'Меню еды' }, Icon: UtensilsCrossed },
];

const BAR_PROFILE_TEXT_PRESET_OPTIONS = {
  about: [
    {
      id: 'safe-welcome',
      label: { en: 'Safe + welcoming', th: 'ปลอดภัย + เป็นกันเอง', my: 'လုံခြုံ + ကြိုဆိုမှုရှိ', ru: 'Безопасно и дружелюбно' },
      text: {
        en: 'Friendly venue focused on safe operations and respectful service.',
        th: 'สถานที่เป็นกันเอง เน้นการดำเนินงานอย่างปลอดภัยและการบริการที่สุภาพ',
        my: 'လုံခြုံသောဆောင်ရွက်မှုနှင့် လေးစားမှုရှိသောဝန်ဆောင်မှုကို အလေးထားသော ဖော်ရွေရာနေရာ',
        ru: 'Дружелюбное заведение с акцентом на безопасность и уважительное обслуживание.',
      },
    },
    {
      id: 'nightlife-energy',
      label: { en: 'Nightlife energy', th: 'บรรยากาศไนท์ไลฟ์', my: 'ညဘဝ vibe', ru: 'Ночная атмосфера' },
      text: {
        en: 'Lively nightlife atmosphere with music, social seating, and late-night events.',
        th: 'บรรยากาศไนท์ไลฟ์คึกคัก มีดนตรี ที่นั่งสังสรรค์ และกิจกรรมยามค่ำคืน',
        my: 'ဂီတ၊ အတူတကွထိုင်နိုင်သောနေရာများနှင့် ညပိုင်း events ပါသော စည်ကားသောညဘဝ vibe',
        ru: 'Яркая ночная атмосфера с музыкой, удобными зонами и поздними событиями.',
      },
    },
    {
      id: 'community-driven',
      label: { en: 'Community driven', th: 'คอมมูนิตี้ชัดเจน', my: 'community အခြေပြု', ru: 'Ориентация на сообщество' },
      text: {
        en: 'Community-oriented bar with recurring themed nights and partner promotions.',
        th: 'บาร์ที่เน้นชุมชน มีกิจกรรมธีมประจำและโปรโมชันร่วมกับพาร์ทเนอร์',
        my: 'themed nights နှင့် partner promotions များရှိသော community အခြေပြု bar',
        ru: 'Бар для сообщества: регулярные тематические вечера и партнерские акции.',
      },
    },
    {
      id: 'social-hotspot',
      label: { en: 'Social hotspot', th: 'จุดนัดพบสายปาร์ตี้', my: 'လူစုလူဝေး hotspot', ru: 'Точка притяжения' },
      text: {
        en: 'A social hotspot for friends and travelers with a fun crowd and upbeat atmosphere.',
        th: 'จุดนัดพบของเพื่อนและนักท่องเที่ยว บรรยากาศสนุกและคึกคัก',
        my: 'သူငယ်ချင်းများနှင့် ခရီးသွားများအတွက် စည်ကားပျော်ရွှင်သော social hotspot',
        ru: 'Популярное место для друзей и путешественников с веселой публикой и живой атмосферой.',
      },
    },
    {
      id: 'signature-experience',
      label: { en: 'Signature experience', th: 'ประสบการณ์เฉพาะของร้าน', my: 'ထူးခြားသော အတွေ့အကြုံ', ru: 'Фирменный формат' },
      text: {
        en: 'Known for a signature bar experience with creative events, music, and memorable nights.',
        th: 'ขึ้นชื่อเรื่องประสบการณ์เฉพาะของร้าน พร้อมอีเวนต์ ดนตรี และค่ำคืนที่น่าจดจำ',
        my: 'ဖန်တီးမှုရှိသော events, music နှင့် မှတ်မိနေမည့်ညများပါဝင်သော ထူးခြားသောအတွေ့အကြုံ',
        ru: 'Известен фирменной атмосферой: креативные события, музыка и запоминающиеся вечера.',
      },
    },
    {
      id: 'late-night-vibe',
      label: { en: 'Late-night vibe', th: 'บรรยากาศยามดึก', my: 'ညနက်ပိုင်း vibe', ru: 'Атмосфера поздней ночи' },
      text: {
        en: 'A go-to late-night spot with energetic playlists, cozy seating, and engaging crowd energy.',
        th: 'สถานที่ยามดึกที่หลายคนเลือก ด้วยเพลย์ลิสต์มันส์ๆ ที่นั่งสบาย และพลังความสนุกของผู้คน',
        my: 'energetic playlists, သက်တောင့်သက်သာထိုင်ခုံများနှင့် စိတ်လှုပ်ရှားဖွယ် crowd energy ပါဝင်သော ညနက်ပိုင်းနေရာ',
        ru: 'Любимое место поздней ночью: энергичные плейлисты, уютные места и живая энергия гостей.',
      },
    },
  ],
  specials: [
    {
      id: 'buy-2-get-1',
      label: { en: 'Buy 2 get 1 free', th: 'ซื้อ 2 แถม 1', my: '2 ခုဝယ် 1 ခုအခမဲ့', ru: 'Купи 2 — 1 бесплатно' },
      text: {
        en: 'Buy 2 cocktails, get 1 free from 20:00-22:00 tonight.',
        th: 'คืนนี้ 20:00-22:00 ซื้อค็อกเทล 2 แก้ว รับฟรี 1 แก้ว',
        my: 'ဒီည 20:00-22:00 cocktail 2 ခွက်ဝယ်လျှင် 1 ခွက်အခမဲ့',
        ru: 'Сегодня с 20:00 до 22:00: купи 2 коктейля, получи 1 бесплатно.',
      },
    },
    {
      id: 'bucket-deal',
      label: { en: 'Beer bucket deal', th: 'โปรถังเบียร์', my: 'ဘီယာ bucket deal', ru: 'Акция на ведро пива' },
      text: {
        en: 'Beer bucket deal: 5 bottles for the price of 4.',
        th: 'โปรถังเบียร์: 5 ขวด จ่ายราคา 4 ขวด',
        my: 'ဘီယာ bucket deal: 5 ပုလင်းကို 4 ပုလင်းစျေးဖြင့်',
        ru: 'Акция на ведро пива: 5 бутылок по цене 4.',
      },
    },
    {
      id: 'ladies-free-entry',
      label: { en: 'Ladies free entry', th: 'ผู้หญิงเข้าฟรี', my: 'အမျိုးသမီးဝင်ခွင့်အခမဲ့', ru: 'Бесплатный вход для девушек' },
      text: {
        en: 'Ladies free entry before 22:00 plus welcome shot.',
        th: 'ผู้หญิงเข้าฟรีก่อน 22:00 พร้อมช็อตต้อนรับ',
        my: '22:00 မတိုင်မီ အမျိုးသမီးဝင်ခွင့်အခမဲ့ + welcome shot',
        ru: 'Для девушек бесплатный вход до 22:00 и welcome-shot.',
      },
    },
    {
      id: 'shot-combo',
      label: { en: 'Shot combo', th: 'โปรช็อตคอมโบ', my: 'shot combo', ru: 'Комбо шотов' },
      text: {
        en: 'Shot combo: 3 shots for 299 THB all night.',
        th: 'โปรช็อตคอมโบ: 3 ช็อต 299 บาท ตลอดคืน',
        my: 'shot combo: တစ်ညလုံး 3 shots ကို 299 ဘတ်',
        ru: 'Комбо шотов: 3 шота за 299 THB всю ночь.',
      },
    },
  ],
};

const PUBLIC_SITE_I18N = {
  en: {
    heroBadge: 'Discreet premium marketplace',
    heroTitle: 'Thailand Panties connects buyers with premium used underwear sellers in Thailand.',
    heroSubtitle: 'Browse premium listings, use transparent filters, and message sellers in a respectful way to build real connections, with discreet worldwide shipping from Thailand.',
    browseListings: 'Browse Listings',
    meetSellers: 'Meet Sellers',
    vettedSellers: 'Vetted sellers and bars',
    discreetShipping: 'Discreet shipping',
    buyerPrivacy: 'Buyer privacy',
    featuredSellers: 'Featured sellers',
    sellerFallback: 'Seller',
    sellerPortfolioPages: 'Seller Portfolio Pages',
    sellerPortfolioCardDesc: 'Professional bios, highlighted strengths, language support, and faster profile discovery.',
    exploreSellerPortfolios: 'Explore seller portfolios ->',
    liveDiscoverySnapshot: 'Latest Listings',
    smartProductDiscovery: 'Smart Product Discovery',
    smartProductCardDesc: 'Filter by type, size, color, wear details, condition, and price with live catalog counts.',
    openSmartDiscovery: 'Open smart discovery ->',
    talkToRealGirls: 'Talk to real girls',
    talkToRealGirlsSubtitle: 'Browse active seller profiles and start real conversations.',
    viewSellerDirectory: 'View seller directory',
    listingsLabel: 'listings',
    typesLabel: 'types',
    allFeed: 'All stories',
    latestFromSellersAndBars: 'Latest from sellers and bars',
    noRecentFeedPostsHome: 'No recent stories yet.',
    findABar: 'Find a bar',
    findABarSubtitle: 'Discover bars with the latest activity and specials.',
    noRecentBarsHome: 'No recent bar activity yet.',
    viewAllBars: 'View all bars',
    marketplace: 'Marketplace',
    shopWithRealFilters: 'Shop with real filters',
    resultsFoundSuffix: 'results found',
    searchStylesSellersColors: 'Search styles, sellers, colors',
    resetFilters: 'Reset Filters',
    premiumVerifiedSellers: 'Premium used underwear from verified independent sellers',
    byPrefix: 'by',
    sizeLabel: 'Size',
    wornLabel: 'Worn',
    riseLabel: 'Rise',
    coverageLabel: 'Coverage',
    scentLabel: 'Scent',
    viewListing: 'View listing',
    bundleAvailableBadge: 'Bundle option available',
    viewBundleOption: 'View bundle option',
    add: 'Add',
    inCartLabel: 'Added',
    addedToCartNotice: 'Added to cart.',
    alreadyInCartNotice: 'This item is already in your cart.',
    sellerFeed: 'Stories',
    latestSellerUpdates: 'Latest seller updates',
    recentLifestylePosts: 'Recent posts from active sellers and bars.',
    viewFullFeed: 'View all stories',
    noRecentSellerPosts: 'No recent seller posts yet.',
    unlockFor: 'Unlock for',
    privatePostUnlock: 'Private post. Unlock to view.',
    savePost: 'Save post',
    saved: 'Saved',
    savedFeed: 'Saved stories',
    yourSavedSellerPosts: 'Your saved seller posts',
    quickAccessBookmarked: 'Quick access to bookmarked posts.',
    openSavedTab: 'Open saved tab',
    noSavedPostsHome: 'No saved posts yet. Tap "Save post" on stories cards.',
    bars: 'Bars',
    partnerBars: 'Partner bars',
    barsSubtitle: 'Discover bars, specials, and locations connected to seller profiles.',
    locationComingSoon: 'Location coming soon',
    affiliatedSellersSuffix: 'affiliated seller(s)',
    barProfileSoon: 'Bar profile details coming soon.',
    viewBarProfile: 'View bar profile',
    backToBars: 'Back to Bars',
    currentSpecials: 'Current specials',
    noSpecialsYet: 'No specials posted yet.',
    affiliatedSellers: 'Affiliated sellers',
    noAffiliatedSellersListed: 'No affiliated sellers listed yet.',
    affiliatedSellerFallback: 'Affiliated seller',
    locationMap: 'Location map',
    mapNotSet: 'Map link not set yet.',
    openMap: 'Open map',
    messageThisBar: 'Message this bar',
    noCaption: 'No caption added.',
    barPhotoFeed: 'Bar photos',
    noBarPhotosYet: 'No bar photos yet.',
    barPrefix: 'Bar:',
    liveNights: 'Live nights',
    weeklySpecials: 'Weekly specials',
    partnerSellers: 'Partner sellers',
    backToSellers: 'Back to Sellers',
    myAccount: 'My Account',
    followersLabel: 'Followers',
    heightLabel: 'Height',
    weightLabel: 'Weight',
    hairColorLabel: 'Hair color',
    braSizeLabel: 'Bra size',
    pantySizeLabel: 'Panty size',
    messageSellerTitle: 'Message seller',
    buyerMessagesCostPrefix: 'Buyer messages cost',
    buyerMessagesCostSuffix: 'each and are delivered inside the platform.',
    balanceLabel: 'Balance',
    autoRefreshOn: 'Auto refresh on',
    loginBuyerToMessage: 'Login as a buyer to start a conversation.',
    sellerInboxReviewHint: 'Seller accounts can review messages in the seller dashboard inbox.',
    noMessagesYetStart: 'No messages yet. Start the conversation below.',
    showTranslation: 'Show translation',
    showOriginal: 'Show original',
    sendMessageToPrefix: 'Send a message to',
    send: 'Send',
    markThreadRead: 'Mark thread as read',
    customRequestsTitle: 'Custom requests',
    customRequestExplainPrefix: 'Looking for a specific piece from',
    customRequestExplainBody: 'Custom request messages cost',
    customRequestExplainBodyEnd: 'each.',
    customRequestExplainNote: 'Unfortunately there are a lot of tire kickers so custom request messages have to be charged at the same rate as regular messages.',
    yourName: 'Your name',
    email: 'Email',
    customDetailsPlaceholder: 'Panty type, size, style, activities, or photo ideas',
    shippingCountry: 'Shipping country',
    describeRequestForPrefix: 'Describe your request for',
    customRequestSubmitted: 'Custom request submitted.',
    sendCustomRequest: 'Send Custom Request',
    walletNeedsAtLeastPrefix: 'You need at least',
    walletNeedsAtLeastSuffix: 'in your wallet to send this request.',
    listingsByPrefix: 'Listings by',
    listingsReservedTitle: 'Temporarily reserved',
    listingsReservedSubtitle: 'All current listings from this seller are in active carts. If an item is removed from cart, it will appear again automatically.',
    lifestylePostsByPrefix: 'Posts by',
    noLifestylePostsYet: 'No posts from this seller yet.',
    backToShop: 'Back to Shop',
    sizeField: 'Size',
    colorField: 'Color',
    styleField: 'Style',
    fabricField: 'Fabric',
    daysWornField: 'Days worn',
    waistRiseField: 'Waist rise',
    coverageField: 'Coverage',
    conditionField: 'Condition',
    scentLevelField: 'Scent level',
    addToCart: 'Add to Cart',
    viewSellerProfile: 'View Seller Profile',
    productNotFoundTitle: 'Product not found',
    productNotFoundSubtitle: 'This product could not be found in the current catalog.',
    shareSellerQr: 'Share profile QR code',
    shareSellerQrHelp: (name) => `Buyers can scan this code to open ${name}\u2019s profile page directly.`,
    copyLink: 'Copy Link',
    downloadQr: 'Download QR',
  },
  th: {
    heroBadge: 'มาร์เก็ตเพลสพรีเมียมแบบเป็นส่วนตัว',
    heroTitle: 'Thailand Panties เชื่อมผู้ซื้อกับผู้ขายชุดชั้นในใช้แล้วพรีเมียมในไทย',
    heroSubtitle: 'เลือกดูรายการพรีเมียม ใช้ตัวกรองที่โปร่งใส และส่งข้อความหาผู้ขายอย่างสุภาพ พร้อมการจัดส่งแบบเป็นส่วนตัวทั่วโลกจากประเทศไทย',
    browseListings: 'ดูรายการสินค้า',
    meetSellers: 'พบผู้ขาย',
    vettedSellers: 'ผู้ขายและบาร์ที่ผ่านการคัดกรอง',
    discreetShipping: 'จัดส่งแบบเป็นความลับ',
    buyerPrivacy: 'ความเป็นส่วนตัวของผู้ซื้อ',
    featuredSellers: 'ผู้ขายแนะนำ',
    sellerFallback: 'ผู้ขาย',
    sellerPortfolioPages: 'หน้าโปรไฟล์ผู้ขาย',
    sellerPortfolioCardDesc: 'ไบโอมืออาชีพ จุดเด่นชัดเจน รองรับภาษา และค้นหาโปรไฟล์ได้เร็วขึ้น',
    exploreSellerPortfolios: 'สำรวจโปรไฟล์ผู้ขาย ->',
    liveDiscoverySnapshot: 'รายการล่าสุด',
    smartProductDiscovery: 'ค้นหาสินค้าอัจฉริยะ',
    smartProductCardDesc: 'กรองตามประเภท ไซซ์ สี รายละเอียดการสวม สภาพ และราคา พร้อมจำนวนรายการแบบเรียลไทม์',
    openSmartDiscovery: 'เปิดการค้นหาอัจฉริยะ ->',
    talkToRealGirls: 'คุยกับผู้หญิงจริง',
    talkToRealGirlsSubtitle: 'ดูโปรไฟล์ผู้ขายที่ใช้งานอยู่และเริ่มบทสนทนาจริง',
    viewSellerDirectory: 'ดูรายชื่อผู้ขาย',
    listingsLabel: 'รายการ',
    typesLabel: 'ประเภท',
    allFeed: 'สตอรี่ทั้งหมด',
    latestFromSellersAndBars: 'ล่าสุดจากผู้ขายและบาร์',
    noRecentFeedPostsHome: 'ยังไม่มีสตอรี่ล่าสุด',
    findABar: 'หาบาร์',
    findABarSubtitle: 'ค้นพบบาร์ที่มีความเคลื่อนไหวและโปรล่าสุด',
    noRecentBarsHome: 'ยังไม่มีกิจกรรมล่าสุดจากบาร์',
    viewAllBars: 'ดูบาร์ทั้งหมด',
    marketplace: 'มาร์เก็ตเพลส',
    shopWithRealFilters: 'ช้อปด้วยตัวกรองจริง',
    resultsFoundSuffix: 'ผลลัพธ์',
    searchStylesSellersColors: 'ค้นหาสไตล์ ผู้ขาย สี',
    resetFilters: 'รีเซ็ตตัวกรอง',
    premiumVerifiedSellers: 'ชุดชั้นในใช้แล้วพรีเมียมจากผู้ขายอิสระที่ผ่านการยืนยัน',
    byPrefix: 'โดย',
    sizeLabel: 'ไซซ์',
    wornLabel: 'การสวม',
    riseLabel: 'เอว',
    coverageLabel: 'การปกปิด',
    scentLabel: 'กลิ่น',
    viewListing: 'ดูรายการ',
    bundleAvailableBadge: 'มีตัวเลือกแบบบันเดิล',
    viewBundleOption: 'ดูตัวเลือกบันเดิล',
    add: 'เพิ่ม',
    inCartLabel: 'เพิ่มแล้ว',
    addedToCartNotice: 'เพิ่มลงตะกร้าแล้ว',
    alreadyInCartNotice: 'สินค้านี้อยู่ในตะกร้าแล้ว',
    sellerFeed: 'สตอรี่',
    latestSellerUpdates: 'อัปเดตล่าสุดจากผู้ขาย',
    recentLifestylePosts: 'โพสต์ล่าสุดจากผู้ขายและบาร์ที่ใช้งานอยู่',
    viewFullFeed: 'ดูสตอรี่ทั้งหมด',
    noRecentSellerPosts: 'ยังไม่มีโพสต์ล่าสุดจากผู้ขาย',
    unlockFor: 'ปลดล็อกในราคา',
    privatePostUnlock: 'โพสต์ส่วนตัว ปลดล็อกเพื่อดู',
    savePost: 'บันทึกโพสต์',
    saved: 'บันทึกแล้ว',
    savedFeed: 'สตอรี่ที่บันทึก',
    yourSavedSellerPosts: 'โพสต์ผู้ขายที่คุณบันทึก',
    quickAccessBookmarked: 'เข้าถึงโพสต์ที่บันทึกไว้อย่างรวดเร็ว',
    openSavedTab: 'เปิดแท็บที่บันทึก',
    noSavedPostsHome: 'ยังไม่มีโพสต์ที่บันทึก กด "บันทึกโพสต์" ที่การ์ดสตอรี่',
    bars: 'บาร์',
    partnerBars: 'บาร์พาร์ทเนอร์',
    barsSubtitle: 'ค้นพบบาร์ โปรโมชั่น และสถานที่ที่เชื่อมกับโปรไฟล์ผู้ขาย',
    locationComingSoon: 'กำลังอัปเดตสถานที่',
    affiliatedSellersSuffix: 'ผู้ขายในสังกัด',
    barProfileSoon: 'รายละเอียดโปรไฟล์บาร์กำลังอัปเดต',
    viewBarProfile: 'ดูโปรไฟล์บาร์',
    backToBars: 'กลับไปหน้าบาร์',
    currentSpecials: 'โปรโมชั่นปัจจุบัน',
    noSpecialsYet: 'ยังไม่มีโปรโมชั่น',
    affiliatedSellers: 'ผู้ขายในสังกัด',
    noAffiliatedSellersListed: 'ยังไม่มีรายชื่อผู้ขายในสังกัด',
    affiliatedSellerFallback: 'ผู้ขายในสังกัด',
    locationMap: 'แผนที่สถานที่',
    mapNotSet: 'ยังไม่ได้ตั้งค่าลิงก์แผนที่',
    openMap: 'เปิดแผนที่',
    messageThisBar: 'ส่งข้อความถึงบาร์นี้',
    noCaption: 'ยังไม่มีคำบรรยาย',
    barPhotoFeed: 'ภาพบาร์',
    noBarPhotosYet: 'ยังไม่มีภาพบาร์',
    barPrefix: 'บาร์:',
    liveNights: 'คืนไลฟ์',
    weeklySpecials: 'โปรประจำสัปดาห์',
    partnerSellers: 'ผู้ขายพาร์ทเนอร์',
    backToSellers: 'กลับไปหน้าผู้ขาย',
    myAccount: 'บัญชีของฉัน',
    followersLabel: 'ผู้ติดตาม',
    heightLabel: 'ส่วนสูง',
    weightLabel: 'น้ำหนัก',
    hairColorLabel: 'สีผม',
    braSizeLabel: 'ขนาดบรา',
    pantySizeLabel: 'ขนาดกางเกงใน',
    messageSellerTitle: 'ส่งข้อความหาผู้ขาย',
    buyerMessagesCostPrefix: 'ข้อความจากผู้ซื้อมีค่าใช้จ่าย',
    buyerMessagesCostSuffix: 'ต่อข้อความ และส่งภายในแพลตฟอร์ม',
    balanceLabel: 'ยอดคงเหลือ',
    autoRefreshOn: 'รีเฟรชอัตโนมัติเปิดอยู่',
    loginBuyerToMessage: 'เข้าสู่ระบบเป็นผู้ซื้อเพื่อเริ่มการสนทนา',
    sellerInboxReviewHint: 'บัญชีผู้ขายสามารถตรวจสอบข้อความได้ในกล่องข้อความแดชบอร์ดผู้ขาย',
    noMessagesYetStart: 'ยังไม่มีข้อความ เริ่มการสนทนาได้ด้านล่าง',
    showTranslation: 'แสดงคำแปล',
    showOriginal: 'แสดงต้นฉบับ',
    sendMessageToPrefix: 'ส่งข้อความถึง',
    send: 'ส่ง',
    markThreadRead: 'ทำเครื่องหมายเธรดว่าอ่านแล้ว',
    customRequestsTitle: 'คำขอพิเศษ',
    customRequestExplainPrefix: 'กำลังมองหาชิ้นเฉพาะจาก',
    customRequestExplainBody: 'ข้อความคำขอพิเศษมีค่าใช้จ่าย',
    customRequestExplainBodyEnd: 'ต่อข้อความ',
    customRequestExplainNote: 'เนื่องจากมีผู้ที่ไม่จริงจังจำนวนมาก ข้อความคำขอพิเศษจึงต้องเรียกเก็บในอัตราเดียวกับข้อความปกติ',
    yourName: 'ชื่อของคุณ',
    email: 'อีเมล',
    customDetailsPlaceholder: 'ประเภท ไซซ์ สไตล์ กิจกรรม หรือไอเดียรูปภาพ',
    shippingCountry: 'ประเทศปลายทาง',
    describeRequestForPrefix: 'อธิบายคำขอของคุณสำหรับ',
    customRequestSubmitted: 'ส่งคำขอพิเศษแล้ว',
    sendCustomRequest: 'ส่งคำขอพิเศษ',
    walletNeedsAtLeastPrefix: 'คุณต้องมีอย่างน้อย',
    walletNeedsAtLeastSuffix: 'ในกระเป๋าเพื่อส่งคำขอนี้',
    listingsByPrefix: 'รายการสินค้าของ',
    listingsReservedTitle: 'ถูกจองชั่วคราว',
    listingsReservedSubtitle: 'รายการสินค้าปัจจุบันของผู้ขายรายนี้อยู่ในตะกร้าที่กำลังใช้งานทั้งหมด หากมีการนำสินค้าออกจากตะกร้า สินค้าจะกลับมาแสดงโดยอัตโนมัติ',
    lifestylePostsByPrefix: 'โพสต์ของ',
    noLifestylePostsYet: 'ยังไม่มีโพสต์จากผู้ขายรายนี้',
    backToShop: 'กลับไปหน้าร้าน',
    sizeField: 'ไซซ์',
    colorField: 'สี',
    styleField: 'สไตล์',
    fabricField: 'เนื้อผ้า',
    daysWornField: 'จำนวนวันที่สวม',
    waistRiseField: 'ระดับเอว',
    coverageField: 'การปกปิด',
    conditionField: 'สภาพ',
    scentLevelField: 'ระดับกลิ่น',
    addToCart: 'เพิ่มลงตะกร้า',
    viewSellerProfile: 'ดูโปรไฟล์ผู้ขาย',
    productNotFoundTitle: 'ไม่พบสินค้า',
    productNotFoundSubtitle: 'ไม่พบสินค้านี้ในแคตตาล็อกปัจจุบัน',
    shareSellerQr: 'แชร์ QR code โปรไฟล์',
    shareSellerQrHelp: (name) => `ผู้ซื้อสามารถสแกนโค้ดนี้เพื่อเปิดหน้าโปรไฟล์ ${name} โดยตรง`,
    copyLink: 'คัดลอกลิงก์',
    downloadQr: 'ดาวน์โหลด QR',
  },
  my: {
    heroBadge: 'သီးသန့် ပရီမီယမ် marketplace',
    heroTitle: 'Thailand Panties သည် ထိုင်းနိုင်ငံရှိ premium used underwear seller များနှင့် buyer များကို ချိတ်ဆက်ပေးသည်။',
    heroSubtitle: 'premium listing များကို ကြည့်ရှုပါ၊ တိကျသော filter များဖြင့် ရှာဖွေပါ၊ seller များနှင့် လေးစားမှုရှိစွာ စကားပြောပါ၊ ထိုင်းမှ discreet worldwide shipping ဖြင့် ပို့ဆောင်ပေးပါသည်။',
    browseListings: 'Listing များကြည့်ရန်',
    meetSellers: 'Seller များတွေ့ရန်',
    vettedSellers: 'စိစစ်ပြီးသော sellers နှင့် bars',
    discreetShipping: 'လျှို့ဝှက်စနစ်ဖြင့် ပို့ဆောင်ခြင်း',
    buyerPrivacy: 'buyer ကိုယ်ရေးကိုယ်တာ',
    featuredSellers: 'ထူးခြား seller များ',
    sellerFallback: 'Seller',
    sellerPortfolioPages: 'Seller Portfolio စာမျက်နှာများ',
    sellerPortfolioCardDesc: 'ပရော်ဖက်ရှင်နယ် bio များ၊ ထင်ရှားသောအားသာချက်များ၊ language support နှင့် ပိုမိုမြန်သော profile ရှာဖွေမှု',
    exploreSellerPortfolios: 'Seller portfolio များကို ရှာဖွေပါ ->',
    liveDiscoverySnapshot: 'နောက်ဆုံးရောင်းချမှုများ',
    smartProductDiscovery: 'Smart Product Discovery',
    smartProductCardDesc: 'type, size, color, wear details, condition နှင့် price အလိုက် live count ဖြင့် filter လုပ်ပါ',
    openSmartDiscovery: 'Smart discovery ဖွင့်ရန် ->',
    talkToRealGirls: 'အမျိုးသမီးရောင်းသူများနှင့် စကားပြောပါ',
    talkToRealGirlsSubtitle: 'လှုပ်ရှားနေသော ရောင်းသူပရိုဖိုင်များကို ကြည့်ပြီး တကယ့်စကားပြောမှု စတင်ပါ',
    viewSellerDirectory: 'ရောင်းသူစာရင်း ကြည့်ရန်',
    listingsLabel: 'ကြော်ငြာ',
    typesLabel: 'အမျိုးအစား',
    allFeed: 'Stories အားလုံး',
    latestFromSellersAndBars: 'ရောင်းသူများနှင့် ဘားများမှ နောက်ဆုံးတင်ထားမှုများ',
    noRecentFeedPostsHome: 'Stories အသစ်များ မရှိသေးပါ',
    findABar: 'ဘားရှာရန်',
    findABarSubtitle: 'နောက်ဆုံးလှုပ်ရှားမှုနှင့် အထူးအစီအစဉ်ရှိသော ဘားများကို ရှာဖွေပါ',
    noRecentBarsHome: 'ဘားလှုပ်ရှားမှုအသစ်များ မရှိသေးပါ',
    viewAllBars: 'ဘားအားလုံး ကြည့်ရန်',
    marketplace: 'Marketplace',
    shopWithRealFilters: 'Filter ဖြင့် စျေးဝယ်ပါ',
    resultsFoundSuffix: 'ရလဒ်',
    searchStylesSellersColors: 'style, seller, color များရှာရန်',
    resetFilters: 'Filter ပြန်တင်ရန်',
    premiumVerifiedSellers: 'အတည်ပြု independent seller များထံမှ premium used underwear',
    byPrefix: 'by',
    sizeLabel: 'Size',
    wornLabel: 'Worn',
    riseLabel: 'Rise',
    coverageLabel: 'Coverage',
    scentLabel: 'Scent',
    viewListing: 'Listing ကြည့်ရန်',
    bundleAvailableBadge: 'Bundle option available',
    viewBundleOption: 'View bundle option',
    add: 'ထည့်ရန်',
    inCartLabel: 'ထည့်ပြီး',
    addedToCartNotice: 'Cart ထဲသို့ ထည့်ပြီးပါပြီ',
    alreadyInCartNotice: 'ဤပစ္စည်းသည် cart ထဲတွင် ရှိနေပြီးဖြစ်သည်',
    sellerFeed: 'Stories',
    latestSellerUpdates: 'Seller update အသစ်များ',
    recentLifestylePosts: 'active seller နှင့် bar များ၏ post အသစ်များ',
    viewFullFeed: 'Stories အပြည့်ကြည့်ရန်',
    noRecentSellerPosts: 'seller post အသစ် မရှိသေးပါ',
    unlockFor: 'Unlock for',
    privatePostUnlock: 'Private post ဖြစ်သည်။ ကြည့်ရန် unlock လုပ်ပါ။',
    savePost: 'Post သိမ်းရန်',
    saved: 'သိမ်းပြီး',
    savedFeed: 'Saved Stories',
    yourSavedSellerPosts: 'သင်သိမ်းထားသော seller post များ',
    quickAccessBookmarked: 'bookmark လုပ်ထားသော post များကို မြန်မြန်ဝင်ရောက်နိုင်သည်',
    openSavedTab: 'Saved tab ဖွင့်ရန်',
    noSavedPostsHome: 'သိမ်းထားသော post မရှိသေးပါ။ stories card တွင် "Save post" ကိုနှိပ်ပါ။',
    bars: 'Bars',
    partnerBars: 'Partner bars',
    barsSubtitle: 'seller profile များနှင့်ဆက်စပ်သော bar များ၊ special များနှင့် location များကို ရှာဖွေပါ',
    locationComingSoon: 'တည်နေရာ မကြာမီ',
    affiliatedSellersSuffix: 'affiliated seller(s)',
    barProfileSoon: 'bar profile အသေးစိတ် မကြာမီ',
    viewBarProfile: 'Bar profile ကြည့်ရန်',
    backToBars: 'Bars သို့ ပြန်ရန်',
    currentSpecials: 'လက်ရှိ special များ',
    noSpecialsYet: 'special မရှိသေးပါ',
    affiliatedSellers: 'Affiliated sellers',
    noAffiliatedSellersListed: 'affiliated seller များ မရှိသေးပါ',
    affiliatedSellerFallback: 'Affiliated seller',
    locationMap: 'Location map',
    mapNotSet: 'map link မသတ်မှတ်ရသေးပါ',
    openMap: 'Map ဖွင့်ရန်',
    messageThisBar: 'ဤ bar သို့ message ပို့ရန်',
    noCaption: 'caption မရှိပါ',
    barPhotoFeed: 'Bar photos',
    noBarPhotosYet: 'bar photo မရှိသေးပါ',
    barPrefix: 'Bar:',
    liveNights: 'Live nights',
    weeklySpecials: 'အပတ်စဉ် special များ',
    partnerSellers: 'Partner sellers',
    backToSellers: 'Sellers သို့ ပြန်ရန်',
    myAccount: 'ကျွန်ုပ်၏အကောင့်',
    followersLabel: 'Followers',
    heightLabel: 'အရပ်',
    weightLabel: 'ကိုယ်အလေးချိန်',
    hairColorLabel: 'ဆံပင်အရောင်',
    braSizeLabel: 'ဘရာဆိုက်',
    pantySizeLabel: 'ပန်တီဆိုက်',
    messageSellerTitle: 'Seller သို့ message ပို့ရန်',
    buyerMessagesCostPrefix: 'Buyer message တစ်ခုလျှင်',
    buyerMessagesCostSuffix: 'ကုန်ကျပြီး platform အတွင်းပို့ပေးသည်',
    balanceLabel: 'Balance',
    autoRefreshOn: 'Auto refresh ဖွင့်ထားသည်',
    loginBuyerToMessage: 'စကားဝိုင်းစတင်ရန် buyer အဖြစ် login လုပ်ပါ',
    sellerInboxReviewHint: 'seller account များသည် seller dashboard inbox တွင် message များကို ကြည့်ရှုနိုင်သည်',
    noMessagesYetStart: 'message မရှိသေးပါ။ အောက်တွင် စတင်ပါ။',
    showTranslation: 'ဘာသာပြန်ကိုပြရန်',
    showOriginal: 'မူရင်းကိုပြရန်',
    sendMessageToPrefix: 'Message ပို့ရန်',
    send: 'ပို့မည်',
    markThreadRead: 'thread ကို read အဖြစ် မှတ်ရန်',
    customRequestsTitle: 'Custom requests',
    customRequestExplainPrefix: 'သတ်မှတ်ထားသော item တစ်ခုကို',
    customRequestExplainBody: 'Custom request message များ',
    customRequestExplainBodyEnd: 'တစ်ခုလျှင် ကုန်ကျသည်',
    customRequestExplainNote: 'ဝယ်မည့်ဟန်ဆောင်သူများ များပြားသောကြောင့် custom request message များကို ပုံမှန် message များနှင့် နှုန်းတူ ကောက်ခံရပါသည်။',
    yourName: 'သင့်အမည်',
    email: 'အီးမေးလ်',
    customDetailsPlaceholder: 'panty type, size, style, activities သို့မဟုတ် photo idea',
    shippingCountry: 'ပို့မည့်နိုင်ငံ',
    describeRequestForPrefix: 'သင့် request ကို ဖော်ပြပါ',
    customRequestSubmitted: 'Custom request ပို့ပြီးပါပြီ',
    sendCustomRequest: 'Custom Request ပို့ရန်',
    walletNeedsAtLeastPrefix: 'ဤ request ပို့ရန် အနည်းဆုံး',
    walletNeedsAtLeastSuffix: 'wallet ထဲတွင်လိုအပ်သည်',
    listingsByPrefix: 'Listings by',
    listingsReservedTitle: 'ယာယီ reserved',
    listingsReservedSubtitle: 'ဤ seller ၏ လက်ရှိ listing များအားလုံးကို active cart များတွင် ထည့်ထားပါသည်။ item တစ်ခုကို cart မှ ဖယ်ရှားလျှင် အလိုအလျောက် ပြန်ပေါ်လာမည်။',
    lifestylePostsByPrefix: 'Posts by',
    noLifestylePostsYet: 'ဤ seller ၏ post မရှိသေးပါ',
    backToShop: 'Shop သို့ ပြန်ရန်',
    sizeField: 'Size',
    colorField: 'Color',
    styleField: 'Style',
    fabricField: 'Fabric',
    daysWornField: 'Days worn',
    waistRiseField: 'Waist rise',
    coverageField: 'Coverage',
    conditionField: 'Condition',
    scentLevelField: 'Scent level',
    addToCart: 'Cart ထဲသို့ ထည့်ရန်',
    viewSellerProfile: 'Seller Profile ကြည့်ရန်',
    productNotFoundTitle: 'Product မတွေ့ပါ',
    productNotFoundSubtitle: 'ယခု catalog တွင် product မတွေ့ပါ',
    shareSellerQr: 'Profile QR code မျှဝေမည်',
    shareSellerQrHelp: (name) => `Buyer များသည် ${name} profile page ကို တိုက်ရိုက်ဖွင့်ရန် ဤ code ကို scan ဖတ်နိုင်ပါသည်`,
    copyLink: 'Link ကူးမည်',
    downloadQr: 'QR ဒေါင်းလုဒ်',
  },
  ru: {
    heroBadge: 'Премиум маркетплейс с конфиденциальностью',
    heroTitle: 'Thailand Panties соединяет покупателей с продавцами премиального ношеного белья в Таиланде.',
    heroSubtitle: 'Просматривайте премиальные листинги, используйте прозрачные фильтры и общайтесь с продавцами уважительно. Доступна скрытая доставка по миру из Таиланда.',
    browseListings: 'Смотреть листинги',
    meetSellers: 'Познакомиться с продавцами',
    vettedSellers: 'Проверенные продавцы и бары',
    discreetShipping: 'Дискретная доставка',
    buyerPrivacy: 'Конфиденциальность покупателя',
    featuredSellers: 'Рекомендуемые продавцы',
    sellerFallback: 'Продавец',
    sellerPortfolioPages: 'Страницы портфолио продавцов',
    sellerPortfolioCardDesc: 'Профессиональные био, сильные стороны, поддержка языков и более быстрый поиск профилей.',
    exploreSellerPortfolios: 'Открыть портфолио продавцов ->',
    liveDiscoverySnapshot: 'Последние объявления',
    smartProductDiscovery: 'Умный поиск товаров',
    smartProductCardDesc: 'Фильтруйте по типу, размеру, цвету, деталям носки, состоянию и цене с живыми счетчиками.',
    openSmartDiscovery: 'Открыть умный поиск ->',
    talkToRealGirls: 'Общайтесь с реальными девушками',
    talkToRealGirlsSubtitle: 'Смотрите активные профили продавцов и начинайте реальные диалоги.',
    viewSellerDirectory: 'Открыть каталог продавцов',
    listingsLabel: 'листингов',
    typesLabel: 'типов',
    allFeed: 'Все истории',
    latestFromSellersAndBars: 'Последнее от продавцов и баров',
    noRecentFeedPostsHome: 'Пока нет свежих историй.',
    findABar: 'Найти бар',
    findABarSubtitle: 'Откройте бары с самой свежей активностью и акциями.',
    noRecentBarsHome: 'Пока нет свежей активности баров.',
    viewAllBars: 'Смотреть все бары',
    marketplace: 'Маркетплейс',
    shopWithRealFilters: 'Покупки с точными фильтрами',
    resultsFoundSuffix: 'результатов',
    searchStylesSellersColors: 'Поиск по стилям, продавцам, цветам',
    resetFilters: 'Сбросить фильтры',
    premiumVerifiedSellers: 'Премиальное ношеное белье от проверенных независимых продавцов',
    byPrefix: 'от',
    sizeLabel: 'Размер',
    wornLabel: 'Ношение',
    riseLabel: 'Посадка',
    coverageLabel: 'Покрытие',
    scentLabel: 'Запах',
    viewListing: 'Открыть листинг',
    bundleAvailableBadge: 'Доступен вариант бандла',
    viewBundleOption: 'Открыть вариант бандла',
    add: 'Добавить',
    inCartLabel: 'Уже добавлено',
    addedToCartNotice: 'Добавлено в корзину.',
    alreadyInCartNotice: 'Этот товар уже в корзине.',
    sellerFeed: 'Истории',
    latestSellerUpdates: 'Последние обновления продавцов',
    recentLifestylePosts: 'Свежие посты активных продавцов и баров.',
    viewFullFeed: 'Смотреть все истории',
    noRecentSellerPosts: 'Пока нет свежих постов продавцов.',
    unlockFor: 'Разблокировать за',
    privatePostUnlock: 'Приватный пост. Разблокируйте для просмотра.',
    savePost: 'Сохранить пост',
    saved: 'Сохранено',
    savedFeed: 'Сохраненные истории',
    yourSavedSellerPosts: 'Ваши сохраненные посты продавцов',
    quickAccessBookmarked: 'Быстрый доступ к сохраненным постам.',
    openSavedTab: 'Открыть сохраненные',
    noSavedPostsHome: 'Пока нет сохраненных постов. Нажмите "Сохранить пост" в карточках историй.',
    bars: 'Бары',
    partnerBars: 'Партнерские бары',
    barsSubtitle: 'Откройте бары, акции и локации, связанные с профилями продавцов.',
    locationComingSoon: 'Локация скоро появится',
    affiliatedSellersSuffix: 'привязанных продавцов',
    barProfileSoon: 'Данные профиля бара скоро появятся.',
    viewBarProfile: 'Открыть профиль бара',
    backToBars: 'Назад к барам',
    currentSpecials: 'Текущие акции',
    noSpecialsYet: 'Пока нет акций.',
    affiliatedSellers: 'Привязанные продавцы',
    noAffiliatedSellersListed: 'Пока нет привязанных продавцов.',
    affiliatedSellerFallback: 'Привязанный продавец',
    locationMap: 'Карта локации',
    mapNotSet: 'Ссылка на карту еще не задана.',
    openMap: 'Открыть карту',
    messageThisBar: 'Написать этому бару',
    noCaption: 'Подпись не добавлена.',
    barPhotoFeed: 'Фото бара',
    noBarPhotosYet: 'Пока нет фото бара.',
    barPrefix: 'Бар:',
    liveNights: 'Живые ночи',
    weeklySpecials: 'Недельные акции',
    partnerSellers: 'Партнерские продавцы',
    backToSellers: 'Назад к продавцам',
    myAccount: 'Мой аккаунт',
    followersLabel: 'Подписчики',
    heightLabel: 'Рост',
    weightLabel: 'Вес',
    hairColorLabel: 'Цвет волос',
    braSizeLabel: 'Размер бюстгальтера',
    pantySizeLabel: 'Размер трусиков',
    messageSellerTitle: 'Написать продавцу',
    buyerMessagesCostPrefix: 'Сообщения покупателя стоят',
    buyerMessagesCostSuffix: 'за сообщение и доставляются внутри платформы.',
    balanceLabel: 'Баланс',
    autoRefreshOn: 'Автообновление включено',
    loginBuyerToMessage: 'Войдите как покупатель, чтобы начать диалог.',
    sellerInboxReviewHint: 'Аккаунты продавцов могут просматривать сообщения во входящих продавца.',
    noMessagesYetStart: 'Сообщений пока нет. Начните диалог ниже.',
    showTranslation: 'Показать перевод',
    showOriginal: 'Показать оригинал',
    sendMessageToPrefix: 'Отправить сообщение',
    send: 'Отправить',
    markThreadRead: 'Отметить тред прочитанным',
    customRequestsTitle: 'Индивидуальные запросы',
    customRequestExplainPrefix: 'Ищете конкретную вещь у',
    customRequestExplainBody: 'Сообщения по индивидуальным запросам стоят',
    customRequestExplainBodyEnd: 'каждое.',
    customRequestExplainNote: 'К сожалению, много людей просто интересуются без намерения покупать, поэтому сообщения по индивидуальным запросам оплачиваются по той же ставке, что и обычные сообщения.',
    yourName: 'Ваше имя',
    email: 'Email',
    customDetailsPlaceholder: 'Тип, размер, стиль, активности или идеи для фото',
    shippingCountry: 'Страна доставки',
    describeRequestForPrefix: 'Опишите ваш запрос для',
    customRequestSubmitted: 'Индивидуальный запрос отправлен.',
    sendCustomRequest: 'Отправить запрос',
    walletNeedsAtLeastPrefix: 'Нужно минимум',
    walletNeedsAtLeastSuffix: 'на балансе, чтобы отправить этот запрос.',
    listingsByPrefix: 'Листинги продавца',
    listingsReservedTitle: 'Временно зарезервировано',
    listingsReservedSubtitle: 'Все текущие листинги этого продавца сейчас находятся в активных корзинах. Если товар удалят из корзины, он снова станет доступен автоматически.',
    lifestylePostsByPrefix: 'Посты продавца',
    noLifestylePostsYet: 'У этого продавца пока нет постов.',
    backToShop: 'Назад в магазин',
    sizeField: 'Размер',
    colorField: 'Цвет',
    styleField: 'Стиль',
    fabricField: 'Ткань',
    daysWornField: 'Дней ношения',
    waistRiseField: 'Посадка по талии',
    coverageField: 'Покрытие',
    conditionField: 'Состояние',
    scentLevelField: 'Уровень запаха',
    addToCart: 'Добавить в корзину',
    viewSellerProfile: 'Открыть профиль продавца',
    productNotFoundTitle: 'Товар не найден',
    productNotFoundSubtitle: 'Этот товар не найден в текущем каталоге.',
    shareSellerQr: 'QR-код профиля',
    shareSellerQrHelp: (name) => `Покупатели могут отсканировать этот код, чтобы перейти к профилю ${name}.`,
    copyLink: 'Копировать ссылку',
    downloadQr: 'Скачать QR',
  },
};

function publicSiteText(uiLanguage = 'en') {
  return PUBLIC_SITE_I18N[uiLanguage] || PUBLIC_SITE_I18N.en;
}

const SELLER_BIO_TEMPLATES = [
  'Offers premium used panties with clear listing details, responsive communication, and discreet shipping.',
  'Shares curated used panties with accurate notes, fast replies, and discreet packaging.',
  'Provides premium used panties with clear sizing, honest condition details, and smooth communication.',
  'Lists quality used panties with transparent descriptions and discreet dispatch from Thailand.',
  'Focuses on premium used panties, clear photos, and reliable response times.',
  'Offers everyday and premium used panties with straightforward listings and discreet fulfillment.',
  'Maintains clear used panty listings with detailed notes and fast support in chat.',
  'Specializes in used panties with consistent quality details and discreet shipping.',
  'Provides used panty drops with accurate fit notes, clear expectations, and quick updates.',
  'Offers curated used panties with responsive communication and secure discreet packaging.',
  'Shares premium used panties with detailed listing info and dependable seller messaging.',
  'Delivers used panties with clear condition notes, fair pricing, and discreet handling.',
  'Focuses on used panties with transparent listing details and consistent communication.',
  'Offers premium used panties with clear post information and quick seller replies.',
  'Lists used panties with accurate descriptions, flexible options, and discreet fulfillment.',
  'Provides quality used panties with clear listing standards and reliable turnaround.',
  'Offers used panty selections with detailed notes and straightforward communication.',
  'Maintains premium used panties listings with discreet dispatch and fast responses.',
  'Curates used panties with clear sizing details, honest condition notes, and smooth support.',
  'Offers used panties with transparent listing details and dependable shipping updates.',
  'Shares premium used panties with strong communication and discreet worldwide dispatch.',
  'Provides used panties with clear fit and condition details plus responsive service.',
  'Lists curated used panties with concise descriptions and buyer-friendly communication.',
  'Offers used panties with reliable listing quality and discreet packaging practices.',
  'Focuses on premium used panties with detailed posts and timely responses.',
  'Provides everyday used panties with clear listing information and discreet delivery.',
  'Offers used panties with transparent details, consistent quality notes, and quick follow-up.',
  'Maintains premium used panties listings with clear expectations and dependable communication.',
  'Shares used panties with accurate post details, smooth messaging, and discreet handling.',
  'Offers curated used panties with responsive support and clear listing standards.',
  'Provides premium used panties with honest notes, reliable updates, and discreet dispatch.',
];

function randomSellerBio() {
  return SELLER_BIO_TEMPLATES[Math.floor(Math.random() * SELLER_BIO_TEMPLATES.length)];
}

const LOW_WALLET_BALANCE_THB = 300;
const SALE_SPLIT = {
  sellerWithBar: 0.34,
  sellerWithoutBar: 0.5,
  bar: 0.33,
  admin: 0.33,
};
const PAYOUT_SCHEDULE = 'monthly';
const PAYOUT_MIN_THRESHOLD_THB = 100;
const PAYOUT_HOLD_DAYS = 14;

const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: 'buyer_message_received',
    name: 'Buyer receives seller message',
    audience: 'buyer',
    enabled: true,
    ctaLabel: 'Open your messages',
    ctaPath: '/account',
    subject: 'New message from {{senderName}} waiting for you',
    body: 'Hi {{recipientName}},\n\nGood news - {{senderName}} just sent you a new message.\n\nIf you want to keep the conversation moving, open your inbox here:\n{{actionUrl}}\n\nConversation reference: {{conversationId}}\n\nThanks for keeping things respectful and friendly.\n\n- ThP',
  },
  {
    key: 'seller_message_received',
    name: 'Seller receives buyer message',
    audience: 'seller',
    enabled: true,
    ctaLabel: 'Open seller inbox',
    ctaPath: '/account',
    subject: 'You got a new buyer message from {{senderName}}',
    body: 'Hi {{recipientName}},\n\nA buyer just reached out: {{senderName}}.\n\nJump into your inbox to reply:\n{{actionUrl}}\n\nConversation reference: {{conversationId}}\n\nFast, clear replies help build trust and repeat buyers.\n\n- ThP',
  },
  {
    key: 'custom_request_received',
    name: 'Seller receives custom request',
    audience: 'seller',
    enabled: true,
    ctaLabel: 'Open custom requests',
    ctaPath: '/custom-requests',
    subject: 'New custom request from {{buyerName}}',
    body: 'Hi {{recipientName}},\n\nYou have a fresh custom request from {{buyerName}}.\n\nReview details and respond here:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\nA thoughtful reply goes a long way.\n\n- ThP',
  },
  {
    key: 'custom_request_status_changed',
    name: 'Buyer custom request status updated',
    audience: 'buyer',
    enabled: true,
    ctaLabel: 'View custom request',
    ctaPath: '/custom-requests',
    subject: 'Update: your custom request is now {{requestStatus}}',
    body: 'Hi {{recipientName}},\n\nQuick update - your custom request status changed to: {{requestStatus}}.\n\nOpen your request thread here:\n{{actionUrl}}\n\nRequest ID: {{requestId}}\n\nIf action is needed, you can continue the conversation right away.\n\n- ThP',
  },
  {
    key: 'wallet_top_up_completed',
    name: 'Wallet top-up completed',
    audience: 'buyer_or_seller',
    enabled: true,
    ctaLabel: 'Open your account',
    ctaPath: '/account',
    subject: 'Wallet top-up successful - {{amount}} added',
    body: 'Hi {{recipientName}},\n\nYour top-up is complete.\n\nAmount added: {{amount}}\nCurrent wallet balance: {{walletBalance}}\n\nView your account and activity here:\n{{actionUrl}}\n\nYou are all set for your next action.\n\n- ThP',
  },
  {
    key: 'wallet_low_balance',
    name: 'Wallet low balance warning',
    audience: 'buyer_or_seller',
    enabled: true,
    ctaLabel: 'Top up wallet',
    ctaPath: '/account',
    subject: 'Heads up: wallet balance is low ({{walletBalance}})',
    body: 'Hi {{recipientName}},\n\nFriendly reminder: your wallet balance is currently {{walletBalance}}.\n\nTo keep messaging, requests, and unlocks running smoothly, top up here:\n{{actionUrl}}\n\nA quick top-up now can prevent interruptions later.\n\n- ThP',
  },
  {
    key: 'payout_sent',
    name: 'Payout sent to seller or bar',
    audience: 'seller_or_bar',
    enabled: true,
    ctaLabel: 'Open account ledger',
    ctaPath: '/account',
    subject: 'Payout sent: {{amount}} for {{periodLabel}}',
    body: 'Hi {{recipientName}},\n\nYour payout has been sent.\n\nAmount: {{amount}}\nPeriod: {{periodLabel}}\nMethod: {{method}}\nReference: {{referenceId}}\n\nYou can review payout activity in your account:\n{{actionUrl}}\n\n- ThP',
  },
  {
    key: 'moderation_strike_added',
    name: 'Moderation strike added',
    audience: 'buyer_or_seller',
    enabled: true,
    ctaLabel: 'Open appeals',
    ctaPath: '/appeals',
    subject: 'Moderation strike added to your account ({{strikeCount}}/2)',
    body: 'Hi {{recipientName}},\n\nA moderation strike was added to your account.\n\nCurrent strike count: {{strikeCount}}/2\nReason: {{strikeReason}}\n\nIf you want this reviewed, submit an appeal here:\n{{actionUrl}}\n\n- ThP',
  },
  {
    key: 'account_frozen_two_strikes',
    name: 'Account frozen after two strikes',
    audience: 'buyer_or_seller',
    enabled: true,
    ctaLabel: 'Submit appeal',
    ctaPath: '/appeals',
    subject: 'Your account is frozen after two moderation strikes',
    body: 'Hi {{recipientName}},\n\nYour account has been frozen after receiving two moderation strikes.\n\nLatest strike reason: {{strikeReason}}\n\nTo request review and reactivation, submit an appeal here:\n{{actionUrl}}\n\n- ThP',
  },
  {
    key: 'order_shipped',
    name: 'Order shipped update',
    audience: 'buyer',
    enabled: true,
    ctaLabel: 'Track your shipment',
    ctaPath: '/account',
    subject: 'Your order {{orderId}} has shipped',
    body: 'Hi {{recipientName}},\n\nGreat news - your order {{orderId}} is now on the way.\n\nCarrier: {{trackingCarrier}}\nTracking code: {{trackingNumber}}\nTrack here: {{trackingUrl}}\n\nYou can also view shipment updates in your account:\n{{actionUrl}}\n\nThank you for shopping with ThP.\n\n- ThP',
  },
  {
    key: 'order_placed',
    name: 'Order placed confirmation',
    audience: 'buyer',
    enabled: true,
    ctaLabel: 'View your order',
    ctaPath: '/account',
    subject: 'Order placed successfully: {{orderId}}',
    body: 'Hi {{recipientName}},\n\nYour order {{orderId}} is confirmed.\n\nItems: {{itemCount}}\nShipping: {{shippingFee}}\nTotal charged: {{orderTotal}}\n\nYou can review order tracking in your account:\n{{actionUrl}}\n\nThanks for your purchase.\n\n- ThP',
  },
  {
    key: 'seller_application_approved',
    name: 'Seller application approved',
    audience: 'seller',
    enabled: true,
    ctaLabel: 'Open seller dashboard',
    ctaPath: '/seller-dashboard',
    subject: 'Your seller application was approved',
    body: 'Hi {{recipientName}},\n\nGreat news - your seller application has been approved.\n\nYou can now access your seller dashboard and publish listings:\n{{actionUrl}}\n\nWelcome aboard.\n\n- ThP',
  },
  {
    key: 'seller_application_rejected',
    name: 'Seller application rejected',
    audience: 'seller',
    enabled: true,
    ctaLabel: 'View account status',
    ctaPath: '/account',
    subject: 'Update on your seller application',
    body: 'Hi {{recipientName}},\n\nYour seller application was not approved this time.\n\nReason: {{reason}}\n\nYou can review your account status and reapply later:\n{{actionUrl}}\n\n- ThP',
  },
  {
    key: 'bar_affiliation_approved',
    name: 'Bar affiliation approved',
    audience: 'seller_or_bar',
    enabled: true,
    ctaLabel: 'Open your account',
    ctaPath: '/account',
    subject: 'Bar affiliation approved: {{sellerName}} and {{barName}}',
    body: 'Hi {{recipientName}},\n\nThe affiliation between {{sellerName}} and {{barName}} has been approved.\n\nYou can review the latest affiliation status in your account:\n{{actionUrl}}\n\n- ThP',
  },
  {
    key: 'bar_affiliation_rejected',
    name: 'Bar affiliation rejected',
    audience: 'seller_or_bar',
    enabled: true,
    ctaLabel: 'Open your account',
    ctaPath: '/account',
    subject: 'Bar affiliation update: request declined',
    body: 'Hi {{recipientName}},\n\nThe affiliation request between {{sellerName}} and {{barName}} was declined.\n\nOpen your account to review details:\n{{actionUrl}}\n\n- ThP',
  },
  {
    key: 'refund_claim_decision',
    name: 'Refund claim decision',
    audience: 'buyer',
    enabled: true,
    ctaLabel: 'View account activity',
    ctaPath: '/account',
    subject: 'Refund claim {{decision}} for order {{orderId}}',
    body: 'Hi {{recipientName}},\n\nYour refund claim for order {{orderId}} was {{decision}}.\n\n{{decisionSummary}}\n\nView your order and wallet activity here:\n{{actionUrl}}\n\n- ThP',
  },
];

const EMAIL_TEMPLATE_KEYS = new Set(DEFAULT_EMAIL_TEMPLATES.map((template) => template.key));

function getDefaultEmailTemplateByKey(key) {
  return DEFAULT_EMAIL_TEMPLATES.find((template) => template.key === key) || null;
}

const REGISTER_I18N = {
  en: {
    title: 'Create your account',
    subtitle: 'Choose your role and register in a few steps.',
    language: 'Language',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    passwordRequirementsHint: 'Use at least 8 characters with 1 number and 1 symbol.',
    passwordRuleMinLength: 'At least 8 characters',
    passwordRuleNumber: 'Contains at least 1 number',
    passwordRuleSymbol: 'Contains at least 1 symbol',
    passwordRuleMatch: 'Passwords match',
    passwordPolicyError: 'Password must be at least 8 characters and include at least 1 number and 1 symbol.',
    passwordMismatchError: 'Passwords do not match.',
    accountTypePlaceholder: 'Select account type',
    buyerAccount: 'I want to buy used panties',
    sellerAccount: 'I want to sell my used panties',
    barAccount: "I'm a bar or venue",
    city: 'City',
    country: 'Country',
    sellerNameHint: 'Please write your name in English. We suggest a nickname and one initial (e.g. Nina R.), but you can use any name you like.',
    barNameHint: 'Please enter the name of your bar in English (e.g. Small World Chiang Mai).',
    heightLabel: 'Height',
    weightLabel: 'Weight',
    hairColorLabel: 'Hair color',
    braSizeLabel: 'Bra size',
    pantySizeLabel: 'Panty size',
    selectHairColor: 'Select hair color',
    selectBraSize: 'Select bra size',
    selectPantySize: 'Select panty size',
    sellerBodyInfoHint: 'This info is shown on your public profile to help buyers find you.',
    measurementsRequiredError: 'Please fill in all measurements before continuing.',
    sellerNote: 'Seller registration requires name, email, password, city, and country.',
    barNote: 'Bar registration requires bar name, email, password, city, and country.',
    createAccount: 'Create Account',
    haveAccount: 'Already have an account? Login',
    chooseRoleError: 'Please choose an account type.',
    sellerRequiredError: 'Seller registration requires name, email, password, city, and country.',
    barRequiredError: 'Bar registration requires bar name, email, password, city, and country.',
    buyerRequiredError: 'Name, email, and password are required.',
    sellerTermsRequiredError: 'Seller signup requires accepting respectful conduct and wrong-item reship/refund responsibility terms.',
    buyerTermsRequiredError: 'Buyer signup requires accepting respectful behavior and final-sale terms (wrong-item exception applies).',
    buyerTermsTitle: 'Buyer terms acceptance',
    sellerTermsTitle: 'Seller terms acceptance',
    viewCommunityStandards: 'View Community Standards',
    viewRefundPolicy: 'View Refund Policy',
    buyerRespectfulCheckbox: 'I agree to be respectful in messages and interactions.',
    buyerNoRefundCheckbox: 'I understand purchases are final, except wrong-item orders may be eligible for correction or refund review.',
    sellerRespectfulCheckbox: 'I agree to be respectful in messages and interactions.',
    sellerWrongItemPolicyCheckbox: 'I understand that if I ship the wrong item, I must reship the correct item at my own expense, or the buyer may be refunded and my commission may be deducted.',
    emailExistsError: 'This email is already registered.',
    sellerPendingSuccess: 'Seller application submitted. We will notify you after review.',
    buyerSuccess: 'Account created. You can now login.',
    barSuccess: 'Bar account created. You can now manage your bar page.',
    emailPrepText: 'You will need a working email address to create your account. If you do not have one, you can get a free email at',
    emailPrepTextSuffix: '. Please have your email address ready before continuing.',
    successPopupTitle: 'Account created successfully!',
    successPopupSaveCredentials: 'Save these credentials. You will need them to log in.',
    successPopupEmail: 'Your email',
    successPopupPassword: 'Your password',
    successPopupCopy: 'Copy',
    successPopupCopied: 'Copied!',
    successPopupCopyBoth: 'Copy email & password',
    successPopupContinue: 'Continue',
    successPopupSaveCredentialsSignedIn: "You're signed in. Save these credentials somewhere safe if you need them on another device.",
    successPopupGoToLogin: 'Go to login',
    successPopupVerifyEmail: 'We sent a verification email to your address. Please check your inbox (and spam folder) and click the link to verify before logging in.',
    successPopupGoToLoginVerified: "I've verified — go to login",
    thaiBraSizes: 'Thai sizes (cm)',
    usBraSizes: 'US sizes',
    pantySizeHint: 'Thai panty sizes run one size larger than US/European. If you are M in Thailand, select S here.',
    stepDetails: 'Your details',
    stepPassword: 'Create a password',
    passwordStepIntro: 'Your password must meet our security rules. Use the checklist below to see what is still needed.',
    stepLocation: 'Your location',
    stepMeasurements: 'Your measurements',
    stepPantySize: 'Your panty size',
    registerChecklistTitle: 'Signup checklist',
    registerChecklistName: 'Name',
    registerChecklistEmail: 'Email',
    registerChecklistCountry: 'Country',
    registerChecklistCity: 'City',
    registerChecklistPasswordRules: 'Password rules met (8+ characters, number, symbol)',
    registerChecklistPasswordMatch: 'Password confirmation matches',
    registerChecklistTerms: 'Required terms accepted',
    thaiBraCupDifferenceHint: 'Cup sizes show approximate bust–underband difference in cm. Ranges are a guide only.',
    next: 'Next',
    back: 'Back',
    skipStep: 'Skip for now',
    stepTerms: 'Terms & agreement',
    barTermsTitle: 'Bar terms acceptance',
    barRespectfulCheckbox: 'I agree to be respectful in all communications and interactions.',
    barServiceCheckbox: 'I understand that as a bar, I am responsible for fulfilling gift delivery orders in a timely manner.',
    barTermsRequiredError: 'Bar registration requires accepting conduct and service terms.',
    nameRequiredError: 'Please enter your name.',
    emailRequiredError: 'Please enter a valid email address.',
    countryRequiredError: 'Please select your country.',
    cityRequiredError: 'Please enter your city.',
  },
  th: {
    title: 'สร้างบัญชีของคุณ',
    subtitle: 'เลือกรูปแบบบัญชีและสมัครใช้งานได้ในไม่กี่ขั้นตอน',
    language: 'ภาษา',
    fullName: 'ชื่อ-นามสกุล',
    email: 'อีเมล',
    password: 'รหัสผ่าน',
    confirmPassword: 'ยืนยันรหัสผ่าน',
    showPassword: 'แสดงรหัสผ่าน',
    hidePassword: 'ซ่อนรหัสผ่าน',
    passwordRequirementsHint: 'ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร และต้องมีตัวเลข 1 ตัวกับสัญลักษณ์ 1 ตัว',
    passwordRuleMinLength: 'อย่างน้อย 8 ตัวอักษร',
    passwordRuleNumber: 'มีตัวเลขอย่างน้อย 1 ตัว',
    passwordRuleSymbol: 'มีสัญลักษณ์อย่างน้อย 1 ตัว',
    passwordRuleMatch: 'รหัสผ่านตรงกัน',
    passwordPolicyError: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และมีตัวเลขอย่างน้อย 1 ตัวกับสัญลักษณ์อย่างน้อย 1 ตัว',
    passwordMismatchError: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน',
    accountTypePlaceholder: 'เลือกประเภทบัญชี',
    buyerAccount: 'ต้องการซื้อกางเกงในมือสอง',
    sellerAccount: 'ต้องการขายกางเกงในมือสอง',
    barAccount: 'เป็นบาร์หรือสถานบันเทิง',
    city: 'เมือง',
    country: 'ประเทศ',
    sellerNameHint: 'กรุณาเขียนชื่อเป็นภาษาอังกฤษ แนะนำให้ใช้ชื่อเล่นและอักษรย่อหนึ่งตัว (เช่น Nina R.) แต่คุณสามารถใช้ชื่ออะไรก็ได้ที่ต้องการ',
    barNameHint: 'กรุณาใส่ชื่อบาร์เป็นภาษาอังกฤษ (เช่น Small World Chiang Mai)',
    heightLabel: 'ส่วนสูง',
    weightLabel: 'น้ำหนัก',
    hairColorLabel: 'สีผม',
    braSizeLabel: 'ขนาดบรา',
    pantySizeLabel: 'ขนาดกางเกงใน',
    selectHairColor: 'เลือกสีผม',
    selectBraSize: 'เลือกขนาดบรา',
    selectPantySize: 'เลือกขนาดกางเกงใน',
    sellerBodyInfoHint: 'ข้อมูลนี้จะแสดงในโปรไฟล์สาธารณะเพื่อช่วยให้ผู้ซื้อค้นหาคุณ',
    measurementsRequiredError: 'กรุณากรอกข้อมูลวัดตัวให้ครบก่อนดำเนินการต่อ',
    sellerNote: 'การสมัครผู้ขายต้องมีชื่อ อีเมล รหัสผ่าน เมือง และประเทศ',
    barNote: 'การสมัครบัญชีบาร์ต้องมีชื่อบาร์ อีเมล รหัสผ่าน เมือง และประเทศ',
    createAccount: 'สร้างบัญชี',
    haveAccount: 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ',
    chooseRoleError: 'โปรดเลือกประเภทบัญชี',
    sellerRequiredError: 'การสมัครผู้ขายต้องมีชื่อ อีเมล รหัสผ่าน เมือง และประเทศ',
    barRequiredError: 'การสมัครบัญชีบาร์ต้องมีชื่อบาร์ อีเมล รหัสผ่าน เมือง และประเทศ',
    buyerRequiredError: 'ต้องกรอกชื่อ อีเมล และรหัสผ่าน',
    sellerTermsRequiredError: 'การสมัครผู้ขายต้องยอมรับเงื่อนไขเรื่องความสุภาพและความรับผิดชอบกรณีส่งสินค้าผิด (ส่งใหม่ด้วยค่าใช้จ่ายของตนเอง/อาจถูกหักค่าคอมมิชชั่นหากมีการคืนเงิน)',
    buyerTermsRequiredError: 'การสมัครผู้ซื้อต้องยอมรับข้อกำหนดเรื่องความสุภาพและเงื่อนไขการขายขาด (ยกเว้นกรณีได้รับสินค้าผิด)',
    buyerTermsTitle: 'การยอมรับข้อกำหนดสำหรับผู้ซื้อ',
    sellerTermsTitle: 'การยอมรับข้อกำหนดสำหรับผู้ขาย',
    viewCommunityStandards: 'ดูมาตรฐานชุมชน',
    viewRefundPolicy: 'ดูนโยบายการคืนเงิน',
    buyerRespectfulCheckbox: 'ฉันยินยอมที่จะสื่อสารอย่างสุภาพและให้เกียรติ',
    buyerNoRefundCheckbox: 'ฉันเข้าใจว่าการซื้อเป็นแบบขายขาด ยกเว้นกรณีได้รับสินค้าผิดซึ่งอาจมีสิทธิ์แก้ไขการจัดส่งหรือพิจารณาคืนเงิน',
    sellerRespectfulCheckbox: 'ฉันยินยอมที่จะสื่อสารอย่างสุภาพและให้เกียรติ',
    sellerWrongItemPolicyCheckbox: 'ฉันเข้าใจว่าหากส่งสินค้าผิด ฉันต้องส่งสินค้าที่ถูกต้องใหม่โดยรับผิดชอบค่าใช้จ่ายเอง มิฉะนั้นผู้ซื้ออาจได้รับเงินคืนและค่าคอมมิชชั่นของฉันอาจถูกหัก',
    emailExistsError: 'อีเมลนี้ถูกใช้งานแล้ว',
    sellerPendingSuccess: 'ส่งคำขอผู้ขายแล้ว เราจะแจ้งผลหลังการตรวจสอบ',
    buyerSuccess: 'สร้างบัญชีเรียบร้อยแล้ว สามารถเข้าสู่ระบบได้',
    barSuccess: 'สร้างบัญชีบาร์เรียบร้อยแล้ว สามารถจัดการหน้าโปรไฟล์บาร์ได้ทันที',
    emailPrepText: 'คุณต้องมีอีเมลที่ใช้งานได้จริงเพื่อสร้างบัญชี หากยังไม่มี สามารถสมัครอีเมลฟรีได้ที่',
    emailPrepTextSuffix: ' กรุณาเตรียมอีเมลให้พร้อมก่อนดำเนินการต่อ',
    successPopupTitle: 'สร้างบัญชีสำเร็จ!',
    successPopupSaveCredentials: 'บันทึกข้อมูลเหล่านี้ไว้ คุณจะต้องใช้ในการเข้าสู่ระบบ',
    successPopupEmail: 'อีเมลของคุณ',
    successPopupPassword: 'รหัสผ่านของคุณ',
    successPopupCopy: 'คัดลอก',
    successPopupCopied: 'คัดลอกแล้ว!',
    successPopupCopyBoth: 'คัดลอกอีเมลและรหัสผ่าน',
    successPopupContinue: 'ดำเนินการต่อ',
    successPopupSaveCredentialsSignedIn: 'คุณเข้าสู่ระบบแล้ว บันทึกข้อมูลเหล่านี้ไว้ในที่ปลอดภัยหากต้องใช้บนอุปกรณ์อื่น',
    successPopupGoToLogin: 'ไปหน้าเข้าสู่ระบบ',
    successPopupVerifyEmail: 'เราส่งอีเมลยืนยันไปยังที่อยู่ของคุณแล้ว กรุณาตรวจสอบกล่องจดหมาย (และโฟลเดอร์สแปม) แล้วคลิกลิงก์เพื่อยืนยันก่อนเข้าสู่ระบบ',
    successPopupGoToLoginVerified: 'ยืนยันแล้ว — ไปหน้าเข้าสู่ระบบ',
    thaiBraSizes: 'ขนาดไทย (ซม.)',
    usBraSizes: 'ขนาด US',
    pantySizeHint: 'ไซส์กางเกงในไทยใหญ่กว่า US/ยุโรป 1 ไซส์ ถ้าคุณใส่ M ในไทย ให้เลือก S ที่นี่',
    stepDetails: 'ข้อมูลของคุณ',
    stepPassword: 'สร้างรหัสผ่าน',
    passwordStepIntro: 'รหัสผ่านต้องเป็นไปตามกฎความปลอดภัย ใช้รายการด้านล่างเพื่อดูว่ายังขาดอะไร',
    stepLocation: 'ที่อยู่ของคุณ',
    stepMeasurements: 'สัดส่วนของคุณ',
    stepPantySize: 'ขนาดกางเกงในของคุณ',
    registerChecklistTitle: 'รายการตรวจก่อนส่ง',
    registerChecklistName: 'ชื่อ',
    registerChecklistEmail: 'อีเมล',
    registerChecklistCountry: 'ประเทศ',
    registerChecklistCity: 'เมือง',
    registerChecklistPasswordRules: 'รหัสผ่านตามกฎ (8+ ตัวอักษร ตัวเลข สัญลักษณ์)',
    registerChecklistPasswordMatch: 'ยืนยันรหัสผ่านตรงกัน',
    registerChecklistTerms: 'ยอมรับข้อกำหนดที่จำเป็นแล้ว',
    thaiBraCupDifferenceHint: 'ตัวอักษรคัพคือความต่างโดยประมาณระหว่างรอบอกบนและใต้อก (ซม.) ใช้เป็นแนวทางเท่านั้น',
    next: 'ถัดไป',
    back: 'ย้อนกลับ',
    skipStep: 'ข้ามไปก่อน',
    stepTerms: 'ข้อกำหนดและข้อตกลง',
    barTermsTitle: 'การยอมรับข้อกำหนดสำหรับบาร์',
    barRespectfulCheckbox: 'ฉันยินยอมที่จะสื่อสารและปฏิบัติต่อผู้อื่นอย่างสุภาพ',
    barServiceCheckbox: 'ฉันเข้าใจว่าในฐานะบาร์ ฉันมีหน้าที่จัดส่งออเดอร์ของขวัญตามกำหนดเวลา',
    barTermsRequiredError: 'การสมัครบาร์ต้องยอมรับข้อกำหนดด้านพฤติกรรมและการให้บริการ',
    nameRequiredError: 'กรุณากรอกชื่อของคุณ',
    emailRequiredError: 'กรุณากรอกอีเมลที่ถูกต้อง',
    countryRequiredError: 'กรุณาเลือกประเทศของคุณ',
    cityRequiredError: 'กรุณากรอกเมืองของคุณ',
  },
  my: {
    title: 'အကောင့်ဖန်တီးရန်',
    subtitle: 'သင့် account type ကိုရွေးပြီး လျင်မြန်စွာ စာရင်းသွင်းပါ',
    language: 'ဘာသာစကား',
    fullName: 'အမည်အပြည့်အစုံ',
    email: 'အီးမေးလ်',
    password: 'စကားဝှက်',
    confirmPassword: 'စကားဝှက် ထပ်မံအတည်ပြုရန်',
    showPassword: 'စကားဝှက် ပြရန်',
    hidePassword: 'စကားဝှက် ဝှက်ရန်',
    passwordRequirementsHint: 'အနည်းဆုံး စာလုံး 8 လုံးနှင့် နံပါတ် 1 လုံး၊ သင်္ကေတ 1 လုံး ပါဝင်ရမည်',
    passwordRuleMinLength: 'အနည်းဆုံး စာလုံး 8 လုံး',
    passwordRuleNumber: 'နံပါတ် အနည်းဆုံး 1 လုံး ပါဝင်ရမည်',
    passwordRuleSymbol: 'သင်္ကေတ အနည်းဆုံး 1 လုံး ပါဝင်ရမည်',
    passwordRuleMatch: 'စကားဝှက်နှစ်ခု ကိုက်ညီသည်',
    passwordPolicyError: 'စကားဝှက်မှာ အနည်းဆုံး 8 လုံးရှိပြီး နံပါတ် 1 လုံးနှင့် သင်္ကေတ 1 လုံး ပါဝင်ရမည်',
    passwordMismatchError: 'စကားဝှက်နှစ်ခု မကိုက်ညီပါ',
    accountTypePlaceholder: 'အကောင့်အမျိုးအစားရွေးပါ',
    buyerAccount: 'ဝတ်ပြီးသောဝတ်ဆင် ဝယ်လိုသည်',
    sellerAccount: 'ကျွန်ုပ်၏ ဝတ်ပြီးသောဝတ်ဆင် ရောင်းလိုသည်',
    barAccount: 'ကျွန်ုပ်သည် ဘား သို့မဟုတ် နေရာတစ်ခု ဖြစ်သည်',
    city: 'မြို့',
    country: 'နိုင်ငံ',
    sellerNameHint: 'အမည်ကို အင်္ဂလိပ်လို ရေးပါ။ အမည်ပြောင်နှင့် အစအက္ခရာတစ်လုံး သုံးရန် အကြံပြုပါသည် (ဥပမာ Nina R.)။ သို့သော် သင်ကြိုက်သော အမည်ကို သုံးနိုင်ပါသည်',
    barNameHint: 'bar အမည်ကို အင်္ဂလိပ်လို ရေးပါ (ဥပမာ Small World Chiang Mai)',
    heightLabel: 'အရပ်',
    weightLabel: 'ကိုယ်အလေးချိန်',
    hairColorLabel: 'ဆံပင်အရောင်',
    braSizeLabel: 'ဘရာဆိုက်',
    pantySizeLabel: 'ပန်တီဆိုက်',
    selectHairColor: 'ဆံပင်အရောင်ရွေးပါ',
    selectBraSize: 'ဘရာဆိုက်ရွေးပါ',
    selectPantySize: 'ပန်တီဆိုက်ရွေးပါ',
    sellerBodyInfoHint: 'ဤအချက်အလက်ကို သင့်အများသုံးပရိုဖိုင်တွင် ပြသ၍ ဝယ်သူများ သင့်ကို ရှာတွေ့ရန် ကူညီပါသည်။',
    measurementsRequiredError: 'ဆက်မသွားမီ တိုင်းတာချက်အားလုံးဖြည့်ပါ။',
    sellerNote: 'seller စာရင်းသွင်းရန် အမည်၊ အီးမေးလ်၊ စကားဝှက်၊ မြို့၊ နိုင်ငံ လိုအပ်သည်',
    barNote: 'bar စာရင်းသွင်းရန် ဘားအမည်၊ အီးမေးလ်၊ စကားဝှက်၊ မြို့၊ နိုင်ငံ လိုအပ်သည်',
    createAccount: 'အကောင့်ဖန်တီးမည်',
    haveAccount: 'အကောင့်ရှိပြီးသားလား? ဝင်မည်',
    chooseRoleError: 'အကောင့်အမျိုးအစား ရွေးပါ',
    sellerRequiredError: 'seller စာရင်းသွင်းရန် အမည်၊ အီးမေးလ်၊ စကားဝှက်၊ မြို့၊ နိုင်ငံ လိုအပ်သည်',
    barRequiredError: 'bar စာရင်းသွင်းရန် ဘားအမည်၊ အီးမေးလ်၊ စကားဝှက်၊ မြို့၊ နိုင်ငံ လိုအပ်သည်',
    buyerRequiredError: 'အမည်၊ အီးမေးလ်နှင့် စကားဝှက် လိုအပ်သည်',
    sellerTermsRequiredError: 'seller စာရင်းသွင်းရန် လေးစားသောဆက်သွယ်ရေးနှင့် wrong-item ပို့မှားပါက seller ကုန်ကျစရိတ်ဖြင့် ပြန်ပို့/မပြန်ပို့ပါက refund + commission ဖြတ်တောက်နိုင်ခြင်း စည်းကမ်းများကို လက်ခံရန် လိုအပ်သည်',
    buyerTermsRequiredError: 'buyer စာရင်းသွင်းရန် လေးစားသောဆက်သွယ်ရေးနှင့် final-sale စည်းကမ်း (wrong-item exception ပါဝင်) ကို လက်ခံရန် လိုအပ်သည်',
    buyerTermsTitle: 'buyer စည်းကမ်း လက်ခံမှု',
    sellerTermsTitle: 'seller စည်းကမ်း လက်ခံမှု',
    viewCommunityStandards: 'Community Standards ကြည့်ရန်',
    viewRefundPolicy: 'Refund Policy ကြည့်ရန်',
    buyerRespectfulCheckbox: 'မက်ဆေ့ချ်နှင့် ဆက်ဆံမှုများတွင် လေးစားစွာ ပြုမူမည်ဟု လက်ခံပါသည်',
    buyerNoRefundCheckbox: 'ဝယ်ယူမှုများသည် final sale ဖြစ်ကြောင်း နားလည်ပါသည်။ သို့သော် wrong-item order ဖြစ်ပါက ပြန်ပို့ပြင်ဆင်ခြင်း သို့မဟုတ် refund review အတွက် အရည်အချင်းရှိနိုင်ပါသည်',
    sellerRespectfulCheckbox: 'မက်ဆေ့ချ်နှင့် ဆက်ဆံမှုများတွင် လေးစားစွာ ပြုမူမည်ဟု လက်ခံပါသည်',
    sellerWrongItemPolicyCheckbox: 'wrong-item ပို့မိပါက မှန်ကန်သော item ကို seller ကိုယ်ပိုင်ကုန်ကျစရိတ်ဖြင့် ပြန်ပို့ရမည်ကို နားလည်ပါသည်။ မဆောင်ရွက်ပါက buyer ကို refund ပေးနိုင်ပြီး seller commission ဖြတ်တောက်နိုင်ပါသည်',
    emailExistsError: 'ဤအီးမေးလ်ကို အသုံးပြုပြီးဖြစ်သည်',
    sellerPendingSuccess: 'seller လျှောက်လွှာ ပို့ပြီးပါပြီ၊ စစ်ဆေးပြီးနောက် အသိပေးပါမည်',
    buyerSuccess: 'အကောင့်ဖန်တီးပြီးပါပြီ၊ ယခု ဝင်နိုင်ပါပြီ',
    barSuccess: 'bar အကောင့် ဖန်တီးပြီးပါပြီ။ ယခု bar page ကို စီမံနိုင်ပါသည်',
    emailPrepText: 'အကောင့်ဖန်တီးရန် အသုံးပြုနိုင်သော အီးမေးလ်လိပ်စာ လိုအပ်ပါသည်။ မရှိသေးပါက',
    emailPrepTextSuffix: ' တွင် အခမဲ့ အီးမေးလ် ရယူနိုင်ပါသည်။ ဆက်လက်မလုပ်ဆောင်မီ အီးမေးလ်ကို အသင့်ပြင်ထားပါ',
    successPopupTitle: 'အကောင့် အောင်မြင်စွာ ဖန်တီးပြီးပါပြီ!',
    successPopupSaveCredentials: 'ဤအချက်အလက်များကို သိမ်းဆည်းပါ။ ဝင်ရောက်ရန် လိုအပ်ပါမည်',
    successPopupEmail: 'သင့်အီးမေးလ်',
    successPopupPassword: 'သင့်စကားဝှက်',
    successPopupCopy: 'ကူးယူရန်',
    successPopupCopied: 'ကူးယူပြီး!',
    successPopupCopyBoth: 'အီးမေးလ်နှင့် စကားဝှက် ကူးယူရန်',
    successPopupContinue: 'ဆက်လုပ်ရန်',
    successPopupSaveCredentialsSignedIn: 'သင်ဝင်ပြီးပါပြီ။ အခြားစက်တွင် လိုအပ်ပါက ဤအချက်အလက်များကို လုံခြုံစွာ သိမ်းဆည်းပါ',
    successPopupGoToLogin: 'ဝင်ရောက်ရန် သွားမည်',
    successPopupVerifyEmail: 'သင့်အီးမေးလ်သို့ အတည်ပြုလင့်ခ် ပို့ပြီးပါပြီ။ inbox (နှင့် spam folder) စစ်ဆေးပြီး ဝင်ရောက်ခြင်းမပြုမီ လင့်ခ်ကို နှိပ်၍ အတည်ပြုပါ',
    successPopupGoToLoginVerified: 'အတည်ပြုပြီး — ဝင်ရောက်ရန်',
    thaiBraSizes: 'ထိုင်းဆိုက် (cm)',
    usBraSizes: 'US ဆိုက်',
    pantySizeHint: 'ထိုင်းပန်တီဆိုက်သည် US/ဥရောပထက် တစ်ဆိုက် ပိုကြီးပါသည်။ ထိုင်းတွင် M ဝတ်ပါက ဤနေရာတွင် S ရွေးပါ',
    stepDetails: 'သင့်အချက်အလက်',
    stepPassword: 'စကားဝှက်ဖန်တီးရန်',
    passwordStepIntro: 'စကားဝှက်သည် လုံခြုံရေး စည်းမျဉ်းများနှင့် ကိုက်ညီရမည်။ အောက်ပါစာရင်းဖြင့် မပြည့်မီသေးသည်များ ကြည့်ပါ',
    stepLocation: 'သင့်တည်နေရာ',
    stepMeasurements: 'သင့်အတိုင်းအတာ',
    stepPantySize: 'သင့်ပန်တီဆိုက်',
    registerChecklistTitle: 'ပို့မီ စစ်ဆေးရမည့်အချက်များ',
    registerChecklistName: 'အမည်',
    registerChecklistEmail: 'အီးမေးလ်',
    registerChecklistCountry: 'နိုင်ငံ',
    registerChecklistCity: 'မြို့',
    registerChecklistPasswordRules: 'စကားဝှက် စည်းမျဉ်းများ ပြည့်မီ (စာလုံး 8+၊ နံပါတ်၊ သင်္ကေတ)',
    registerChecklistPasswordMatch: 'စကားဝှက် အတည်ပြုချက် ကိုက်ညီသည်',
    registerChecklistTerms: 'လိုအပ်သော စည်းကမ်းများ လက်ခံထားသည်',
    thaiBraCupDifferenceHint: 'Cup အက္ခရာများသည် ရင်ဘတ်ပတ်လည်နှင့် အောက်ရင်ဘတ်ကြား ကွာခြားချက် (cm) ကို ခန့်မှန်းပြသည်။ လမ်းညွှန်သာဖြစ်သည်။',
    next: 'ရှေ့သို့',
    back: 'နောက်သို့',
    skipStep: 'ယခုကျော်မည်',
    stepTerms: 'စည်းကမ်းနှင့် သဘောတူညီချက်',
    barTermsTitle: 'ဘားအတွက် စည်းကမ်း လက်ခံမှု',
    barRespectfulCheckbox: 'ဆက်သွယ်ရေးနှင့် ဆက်ဆံမှုများတွင် လေးစားစွာ ပြုမူမည်ဟု သဘောတူပါသည်',
    barServiceCheckbox: 'ဘားတစ်ခုအနေဖြင့် လက်ဆောင်ပေးပို့ရေး order များကို သတ်မှတ်ချိန်အတွင်း ဆောင်ရွက်ရမည်ဟု နားလည်ပါသည်',
    barTermsRequiredError: 'bar စာရင်းသွင်းရန် ကျင့်ဝတ်နှင့် ဝန်ဆောင်မှု စည်းကမ်းများ လက်ခံရန် လိုအပ်သည်',
    nameRequiredError: 'သင့်အမည် ရေးသွင်းပါ',
    emailRequiredError: 'မှန်ကန်သော အီးမေးလ် ရေးသွင်းပါ',
    countryRequiredError: 'သင့်နိုင်ငံ ရွေးပါ',
    cityRequiredError: 'သင့်မြို့ ရေးသွင်းပါ',
  },
  ru: {
    title: 'Создание аккаунта',
    subtitle: 'Выберите тип аккаунта и зарегистрируйтесь за несколько шагов.',
    language: 'Язык',
    fullName: 'Полное имя',
    email: 'Email',
    password: 'Пароль',
    confirmPassword: 'Подтвердите пароль',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    passwordRequirementsHint: 'Используйте не менее 8 символов, включая 1 цифру и 1 спецсимвол.',
    passwordRuleMinLength: 'Не менее 8 символов',
    passwordRuleNumber: 'Содержит минимум 1 цифру',
    passwordRuleSymbol: 'Содержит минимум 1 спецсимвол',
    passwordRuleMatch: 'Пароли совпадают',
    passwordPolicyError: 'Пароль должен содержать минимум 8 символов, включая хотя бы 1 цифру и 1 спецсимвол.',
    passwordMismatchError: 'Пароли не совпадают.',
    accountTypePlaceholder: 'Выберите тип аккаунта',
    buyerAccount: 'Хочу купить ношеные трусики',
    sellerAccount: 'Хочу продать мои ношеные трусики',
    barAccount: 'Я бар или заведение',
    city: 'Город',
    country: 'Страна',
    sellerNameHint: 'Пожалуйста, напишите имя на английском языке. Рекомендуем использовать никнейм и одну начальную букву (например, Nina R.), но вы можете указать любое имя.',
    barNameHint: 'Пожалуйста, введите название бара на английском языке (например, Small World Chiang Mai).',
    heightLabel: 'Рост',
    weightLabel: 'Вес',
    hairColorLabel: 'Цвет волос',
    braSizeLabel: 'Размер бюстгальтера',
    pantySizeLabel: 'Размер трусиков',
    selectHairColor: 'Выберите цвет волос',
    selectBraSize: 'Выберите размер бюстгальтера',
    selectPantySize: 'Выберите размер трусиков',
    sellerBodyInfoHint: 'Эта информация отображается в вашем публичном профиле, чтобы покупатели могли вас найти.',
    measurementsRequiredError: 'Пожалуйста, заполните все параметры перед продолжением.',
    sellerNote: 'Для регистрации продавца нужны имя, email, пароль, город и страна.',
    barNote: 'Для регистрации бара нужны название бара, email, пароль, город и страна.',
    createAccount: 'Создать аккаунт',
    haveAccount: 'Уже есть аккаунт? Войти',
    chooseRoleError: 'Пожалуйста, выберите тип аккаунта.',
    sellerRequiredError: 'Для регистрации продавца нужны имя, email, пароль, город и страна.',
    barRequiredError: 'Для регистрации бара нужны название, email, пароль, город и страна.',
    buyerRequiredError: 'Имя, email и пароль обязательны.',
    sellerTermsRequiredError: 'Для регистрации продавца нужно принять условия уважительного общения и ответственности за wrong-item (пересылка за свой счет или удержание комиссии при возврате).',
    buyerTermsRequiredError: 'Для регистрации покупателя нужно принять условия уважительного общения и окончательной продажи (с исключением для wrong-item).',
    buyerTermsTitle: 'Принятие условий для покупателя',
    sellerTermsTitle: 'Принятие условий для продавца',
    viewCommunityStandards: 'Открыть стандарты сообщества',
    viewRefundPolicy: 'Открыть политику возвратов',
    buyerRespectfulCheckbox: 'Я согласен(на) соблюдать уважительное общение в сообщениях и взаимодействиях.',
    buyerNoRefundCheckbox: 'Я понимаю, что покупки являются окончательными, кроме случаев wrong-item, где возможна корректирующая отправка или рассмотрение возврата.',
    sellerRespectfulCheckbox: 'Я согласен(на) соблюдать уважительное общение в сообщениях и взаимодействиях.',
    sellerWrongItemPolicyCheckbox: 'Я понимаю, что если отправлю не тот товар, я обязан переслать правильный товар за свой счет, иначе покупателю может быть оформлен возврат с удержанием моей комиссии.',
    emailExistsError: 'Этот email уже зарегистрирован.',
    sellerPendingSuccess: 'Заявка продавца отправлена. Мы сообщим после проверки.',
    buyerSuccess: 'Аккаунт создан. Теперь вы можете войти.',
    barSuccess: 'Аккаунт бара создан. Теперь вы можете управлять страницей бара.',
    emailPrepText: 'Для создания аккаунта вам понадобится действующий email. Если у вас его нет, вы можете бесплатно создать email на',
    emailPrepTextSuffix: '. Пожалуйста, подготовьте свой email перед продолжением.',
    successPopupTitle: 'Аккаунт успешно создан!',
    successPopupSaveCredentials: 'Сохраните эти данные. Они понадобятся для входа.',
    successPopupEmail: 'Ваш email',
    successPopupPassword: 'Ваш пароль',
    successPopupCopy: 'Копировать',
    successPopupCopied: 'Скопировано!',
    successPopupCopyBoth: 'Копировать email и пароль',
    successPopupContinue: 'Продолжить',
    successPopupSaveCredentialsSignedIn: 'Вы уже вошли. Сохраните эти данные в надёжном месте, если понадобятся на другом устройстве.',
    successPopupGoToLogin: 'Перейти к входу',
    successPopupVerifyEmail: 'Мы отправили письмо с подтверждением на ваш адрес. Проверьте входящие (и папку «Спам») и перейдите по ссылке для подтверждения перед входом.',
    successPopupGoToLoginVerified: 'Я подтвердил — войти',
    thaiBraSizes: 'Тайские размеры (см)',
    usBraSizes: 'Размеры US',
    pantySizeHint: 'Тайские размеры трусиков на размер больше, чем US/европейские. Если вы носите M в Таиланде, выберите S здесь.',
    stepDetails: 'Ваши данные',
    stepPassword: 'Создайте пароль',
    passwordStepIntro: 'Пароль должен соответствовать правилам безопасности. Ниже список того, что ещё нужно выполнить.',
    stepLocation: 'Ваше местоположение',
    stepMeasurements: 'Ваши параметры',
    stepPantySize: 'Размер трусиков',
    registerChecklistTitle: 'Чеклист перед отправкой',
    registerChecklistName: 'Имя',
    registerChecklistEmail: 'Email',
    registerChecklistCountry: 'Страна',
    registerChecklistCity: 'Город',
    registerChecklistPasswordRules: 'Пароль соответствует правилам (8+ символов, цифра, спецсимвол)',
    registerChecklistPasswordMatch: 'Подтверждение пароля совпадает',
    registerChecklistTerms: 'Обязательные условия приняты',
    thaiBraCupDifferenceHint: 'Буквы чашки — приблизительная разница обхвата груди и под грудью в см. Только ориентир.',
    next: 'Далее',
    back: 'Назад',
    skipStep: 'Пропустить',
    stepTerms: 'Условия и соглашение',
    barTermsTitle: 'Принятие условий для бара',
    barRespectfulCheckbox: 'Я обязуюсь уважительно общаться во всех переписках и взаимодействиях.',
    barServiceCheckbox: 'Я понимаю, что как бар несу ответственность за своевременное выполнение заказов на доставку подарков.',
    barTermsRequiredError: 'Для регистрации бара нужно принять условия поведения и обслуживания.',
    nameRequiredError: 'Пожалуйста, введите ваше имя.',
    emailRequiredError: 'Пожалуйста, введите корректный email.',
    countryRequiredError: 'Пожалуйста, выберите вашу страну.',
    cityRequiredError: 'Пожалуйста, введите ваш город.',
  },
};

const FOOTER_I18N = {
  en: {
    brandTitle: 'Thailand Panties',
    description: 'A trusted marketplace for premium used underwear from Thailand, with discreet checkout, secure messaging, and tools designed for professional private shopping.',
    copyright: '© 2026 Thailand Panties, operated by Siam Second Story LLC. All rights reserved.',
    groups: [
      {
        title: 'Marketplace',
        links: [
          { label: 'Shop', route: '/' },
          { label: 'Find', route: '/find' },
          { label: 'Seller Portfolios', route: '/seller-portfolios' },
          { label: 'Bars', route: '/bars' },
          { label: 'Custom Requests', route: '/custom-requests' },
          { label: 'Worldwide Shipping', route: '/worldwide-shipping' },
        ],
      },
      {
        title: 'Support',
        links: [
          { label: 'FAQ', route: '/faq' },
          { label: 'Contact', route: '/contact' },
          { label: 'Order Help', route: '/order-help' },
          { label: 'Appeals', route: '/appeals' },
          { label: 'Seller Appeals Process', route: '/seller-appeals' },
          { label: 'Privacy Packaging', route: '/privacy-packaging' },
          { label: 'Community Standards', route: '/community-standards' },
        ],
      },
      {
        title: 'For Sellers',
        links: [
          { label: 'How to Apply', route: '/how-to-apply' },
          { label: 'Seller Guidelines', route: '/seller-guidelines' },
          { label: 'Appeals Process', route: '/seller-appeals' },
          { label: 'Portfolio Setup', route: '/portfolio-setup' },
          { label: 'Shipping Standards', route: '/seller-standards' },
        ],
      },
    ],
    legalLinks: [
      { label: 'Privacy Policy', route: '/privacy-policy' },
      { label: 'Terms', route: '/terms' },
      { label: 'Shipping Policy', route: '/shipping-policy' },
      { label: 'Refund Policy', route: '/refund-policy' },
      { label: 'Community Standards', route: '/community-standards' },
      { label: 'Seller Standards', route: '/seller-standards' },
    ],
  },
  th: {
    brandTitle: 'Thailand Panties',
    description: 'ตลาดที่เชื่อถือได้สำหรับชุดชั้นในมือสองพรีเมียมจากประเทศไทย พร้อมการชำระเงินแบบเป็นส่วนตัว ข้อความที่ปลอดภัย และเครื่องมือสำหรับการช้อปส่วนตัวอย่างมืออาชีพ',
    copyright: '© 2026 Thailand Panties ดำเนินการโดย Siam Second Story LLC สงวนลิขสิทธิ์',
    groups: [
      {
        title: 'ตลาด',
        links: [
          { label: 'ร้านค้า', route: '/' },
          { label: 'ค้นหา', route: '/find' },
          { label: 'พอร์ตผู้ขาย', route: '/seller-portfolios' },
          { label: 'บาร์', route: '/bars' },
          { label: 'คำขอพิเศษ', route: '/custom-requests' },
          { label: 'จัดส่งทั่วโลก', route: '/worldwide-shipping' },
        ],
      },
      {
        title: 'ช่วยเหลือ',
        links: [
          { label: 'คำถามที่พบบ่อย', route: '/faq' },
          { label: 'ติดต่อ', route: '/contact' },
          { label: 'ช่วยเหลือคำสั่งซื้อ', route: '/order-help' },
          { label: 'อุทธรณ์', route: '/appeals' },
          { label: 'ขั้นตอนอุทธรณ์ผู้ขาย', route: '/seller-appeals' },
          { label: 'บรรจุภัณฑ์เป็นส่วนตัว', route: '/privacy-packaging' },
          { label: 'มาตรฐานชุมชน', route: '/community-standards' },
        ],
      },
      {
        title: 'สำหรับผู้ขาย',
        links: [
          { label: 'วิธีสมัคร', route: '/how-to-apply' },
          { label: 'แนวทางผู้ขาย', route: '/seller-guidelines' },
          { label: 'ขั้นตอนอุทธรณ์', route: '/seller-appeals' },
          { label: 'ตั้งค่าพอร์ตโฟลิโอ', route: '/portfolio-setup' },
          { label: 'มาตรฐานการจัดส่ง', route: '/seller-standards' },
        ],
      },
    ],
    legalLinks: [
      { label: 'นโยบายความเป็นส่วนตัว', route: '/privacy-policy' },
      { label: 'ข้อกำหนด', route: '/terms' },
      { label: 'นโยบายการจัดส่ง', route: '/shipping-policy' },
      { label: 'นโยบายการคืนเงิน', route: '/refund-policy' },
      { label: 'มาตรฐานชุมชน', route: '/community-standards' },
      { label: 'มาตรฐานผู้ขาย', route: '/seller-standards' },
    ],
  },
  my: {
    brandTitle: 'Thailand Panties',
    description: 'ယုံကြည်စရာ ဈေးကွက် — ထိုင်းမှ အသုံးပြုပြီးပန်တီများ၊ လျှို့ဝှက်ငွေပေးချေမှု၊ လုံခြုံသော မက်ဆေ့ခ်ျနှင့် ပရိုဖက်ရှင်နယ် ပရိုင်ဗိတ် ဈေးဝယ်ကိရိယာများ',
    copyright: '© 2026 Thailand Panties, Siam Second Story LLC မှ လုပ်ငန်းဆောင်ရွက်သည်။ မူပိုင်ခွင့်ရှိသည်',
    groups: [
      {
        title: 'ဈေးကွက်',
        links: [
          { label: 'ဆိုင်', route: '/' },
          { label: 'ရှာဖွေရန်', route: '/find' },
          { label: 'ရောင်းသူ ပေါ်တိုဖိုလီယိုများ', route: '/seller-portfolios' },
          { label: 'ဘားများ', route: '/bars' },
          { label: 'စိတ်ကြိုက် တောင်းဆိုမှုများ', route: '/custom-requests' },
          { label: 'ကမ္ဘာလုံးဆိုင်ရာ ပို့ဆောင်မှု', route: '/worldwide-shipping' },
        ],
      },
      {
        title: 'ပံ့ပိုးမှု',
        links: [
          { label: 'FAQ', route: '/faq' },
          { label: 'ဆက်သွယ်ရန်', route: '/contact' },
          { label: 'အော်ဒါ အကူအညီ', route: '/order-help' },
          { label: 'တောင်းဆိုချက်များ', route: '/appeals' },
          { label: 'ရောင်းသူ တောင်းဆိုချက် လုပ်ငန်းစဉ်', route: '/seller-appeals' },
          { label: 'လျှို့ဝှက်ထုပ်ပိုး', route: '/privacy-packaging' },
          { label: 'Community Standards', route: '/community-standards' },
        ],
      },
      {
        title: 'ရောင်းသူများအတွက်',
        links: [
          { label: 'လျှောက်ထားနည်း', route: '/how-to-apply' },
          { label: 'ရောင်းသူ လမ်းညွှန်ချက်များ', route: '/seller-guidelines' },
          { label: 'တောင်းဆိုချက် လုပ်ငန်းစဉ်', route: '/seller-appeals' },
          { label: 'ပေါ်တိုဖိုလီယို စတင်ခြင်း', route: '/portfolio-setup' },
          { label: 'ပို့ဆောင်မှု စံနှုန်းများ', route: '/seller-standards' },
        ],
      },
    ],
    legalLinks: [
      { label: 'ကိုယ်ရေးလုံခြုံမှု မူဝါဒ', route: '/privacy-policy' },
      { label: 'စည်းကမ်းများ', route: '/terms' },
      { label: 'ပို့ဆောင်မှု မူဝါဒ', route: '/shipping-policy' },
      { label: 'ငွေပြန်အမ်းမူဝါဒ', route: '/refund-policy' },
      { label: 'Community Standards', route: '/community-standards' },
      { label: 'ရောင်းသူ စံနှုန်းများ', route: '/seller-standards' },
    ],
  },
  ru: {
    brandTitle: 'Thailand Panties',
    description: 'Надёжный маркетплейс премиального белья из Таиланда: конфиденциальная оплата, безопасные сообщения и инструменты для приватных покупок.',
    copyright: '© 2026 Thailand Panties, управляется Siam Second Story LLC. Все права защищены.',
    groups: [
      {
        title: 'Маркетплейс',
        links: [
          { label: 'Магазин', route: '/' },
          { label: 'Поиск', route: '/find' },
          { label: 'Портфолио продавцов', route: '/seller-portfolios' },
          { label: 'Бары', route: '/bars' },
          { label: 'Индивидуальные запросы', route: '/custom-requests' },
          { label: 'Доставка по миру', route: '/worldwide-shipping' },
        ],
      },
      {
        title: 'Поддержка',
        links: [
          { label: 'FAQ', route: '/faq' },
          { label: 'Контакты', route: '/contact' },
          { label: 'Помощь по заказу', route: '/order-help' },
          { label: 'Апелляции', route: '/appeals' },
          { label: 'Апелляции продавцов', route: '/seller-appeals' },
          { label: 'Конфиденциальная упаковка', route: '/privacy-packaging' },
          { label: 'Стандарты сообщества', route: '/community-standards' },
        ],
      },
      {
        title: 'Продавцам',
        links: [
          { label: 'Как подать заявку', route: '/how-to-apply' },
          { label: 'Правила для продавцов', route: '/seller-guidelines' },
          { label: 'Процесс апелляций', route: '/seller-appeals' },
          { label: 'Настройка портфолио', route: '/portfolio-setup' },
          { label: 'Стандарты доставки', route: '/seller-standards' },
        ],
      },
    ],
    legalLinks: [
      { label: 'Политика конфиденциальности', route: '/privacy-policy' },
      { label: 'Условия', route: '/terms' },
      { label: 'Доставка', route: '/shipping-policy' },
      { label: 'Возвраты', route: '/refund-policy' },
      { label: 'Стандарты сообщества', route: '/community-standards' },
      { label: 'Стандарты продавцов', route: '/seller-standards' },
    ],
  },
};

const LOGIN_I18N = {
  en: {
    title: 'Sign in',
    subtitle: 'Login to your buyer, seller, bar, or admin account.',
    language: 'Language',
    email: 'Email',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Sign In',
    registerCta: 'Need an account? Register',
    invalidCredentials: 'Invalid email or password.',
    blocked: 'This account is blocked. Contact admin for support.',
    sellerRejectedPrefix: 'Your seller application was rejected.',
    sellerRejectedFallback: 'Please update your details and reapply.',
    sellerPending: 'Your seller account is pending admin approval.',
    welcomeBack: 'Welcome back',
    loginResponseInvalid: 'Login response is invalid. Please try again.',
    loginOffline: 'Login is unavailable while API is offline. Please try again in a moment.',
    resendEnterEmail: 'Enter your email first, then click resend verification.',
    resendOffline: 'Email verification resend is unavailable while API is offline.',
    resendFailed: 'Could not resend verification email.',
    resendSent: 'Verification email sent. Please check your inbox.',
    resendButton: 'Resend verification email',
    resendSending: 'Sending verification email...',
    verifyTitle: 'Verify email',
    verifySubtitle: 'Confirm your account email to complete registration',
    verifyPreparing: 'Preparing verification...',
    verifyInvalidLink: 'Verification link is invalid. Please request a new verification email.',
    verifyInProgress: 'Verifying your email...',
    verifyFailedRequestNew: 'Verification failed. Please request a new link.',
    verifyFailedTryAgain: 'Verification failed. Please try again.',
    verifyGoToLogin: 'Go to login',
    verifySuccess: 'Email verified. You can now log in.',
    homeCtaBuyerLine: 'Want to save favorites, message sellers, and checkout faster?',
    homeCtaBuyerButton: 'Create your account',
    homeCtaSellerLine: 'Ready to sell? Create a seller account and build your profile.',
    homeCtaSellerButton: 'Register now',
    homeCtaBarLine: 'Own a venue? Join as a bar account to post events and connect with sellers.',
    homeCtaBarButton: 'Register a bar account',
    barLoginRequiredTitle: 'Bar login required',
    barLoginProfileSubtitle: 'Please log in with a bar account to continue.',
    barLoginFeedSubtitle: 'Please log in with a bar account to continue.',
    loginBuyerToMessage: 'Please login as a buyer to send messages.',
    loginBuyerToCustomRequest: 'Please login as a buyer to send custom requests.',
    loginBuyerToRefundEvidence: 'Please login as a buyer to submit refund evidence.',
    loginToSendCustomRequestMessages: 'Please login to send custom request messages.',
    loginToLikePosts: 'Please login to like posts.',
    loginToCommentPosts: 'Please login to comment on posts.',
    loginToSavePosts: 'Please login to save posts.',
    loginToReportComments: 'Please login to report comments.',
    loginToReportMessages: 'Please login to report messages.',
    accountFrozenAppeal: 'Your account is frozen after two moderation strikes. Please submit an appeal to continue.',
    barAccountMarketplaceBlocked: 'Bar accounts cannot buy or sell marketplace products.',
    unlockOnlyBuyer: 'Only buyer accounts can unlock private posts.',
    unlockWalletRequiredPrefix: 'You need at least',
    unlockWalletRequiredSuffix: 'in your wallet to unlock this post.',
    postUnlockedPrefix: 'Post unlocked for',
  },
  th: {
    title: 'เข้าสู่ระบบ',
    subtitle: 'เข้าสู่ระบบบัญชีผู้ซื้อ ผู้ขาย บาร์ หรือผู้ดูแลระบบ',
    language: 'ภาษา',
    email: 'อีเมล',
    password: 'รหัสผ่าน',
    showPassword: 'แสดงรหัสผ่าน',
    hidePassword: 'ซ่อนรหัสผ่าน',
    submit: 'เข้าสู่ระบบ',
    registerCta: 'ยังไม่มีบัญชี? สมัครสมาชิก',
    invalidCredentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    blocked: 'บัญชีนี้ถูกระงับ โปรดติดต่อผู้ดูแลระบบ',
    sellerRejectedPrefix: 'คำขอเปิดบัญชีผู้ขายของคุณถูกปฏิเสธ',
    sellerRejectedFallback: 'โปรดอัปเดตรายละเอียดและสมัครใหม่',
    sellerPending: 'บัญชีผู้ขายของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ',
    welcomeBack: 'ยินดีต้อนรับกลับ',
    loginResponseInvalid: 'ข้อมูลตอบกลับจากการเข้าสู่ระบบไม่ถูกต้อง โปรดลองอีกครั้ง',
    loginOffline: 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้ เนื่องจาก API ออฟไลน์ โปรดลองอีกครั้งในอีกสักครู่',
    resendEnterEmail: 'กรอกอีเมลก่อน แล้วกดส่งอีเมลยืนยันอีกครั้ง',
    resendOffline: 'ไม่สามารถส่งอีเมลยืนยันอีกครั้งได้ในขณะนี้ เนื่องจาก API ออฟไลน์',
    resendFailed: 'ไม่สามารถส่งอีเมลยืนยันอีกครั้งได้',
    resendSent: 'ส่งอีเมลยืนยันแล้ว โปรดตรวจสอบกล่องจดหมายของคุณ',
    resendButton: 'ส่งอีเมลยืนยันอีกครั้ง',
    resendSending: 'กำลังส่งอีเมลยืนยัน...',
    verifyTitle: 'ยืนยันอีเมล',
    verifySubtitle: 'ยืนยันอีเมลบัญชีของคุณเพื่อทำการสมัครให้เสร็จสมบูรณ์',
    verifyPreparing: 'กำลังเตรียมการยืนยัน...',
    verifyInvalidLink: 'ลิงก์ยืนยันไม่ถูกต้อง โปรดขออีเมลยืนยันใหม่',
    verifyInProgress: 'กำลังยืนยันอีเมลของคุณ...',
    verifyFailedRequestNew: 'การยืนยันล้มเหลว โปรดขอลิงก์ใหม่',
    verifyFailedTryAgain: 'การยืนยันล้มเหลว โปรดลองอีกครั้ง',
    verifyGoToLogin: 'ไปหน้าเข้าสู่ระบบ',
    verifySuccess: 'ยืนยันอีเมลสำเร็จแล้ว ตอนนี้คุณสามารถเข้าสู่ระบบได้',
    homeCtaBuyerLine: 'อยากบันทึกรายการโปรด ส่งข้อความหาผู้ขาย และชำระเงินได้เร็วขึ้นไหม?',
    homeCtaBuyerButton: 'สร้างบัญชีของคุณ',
    homeCtaSellerLine: 'พร้อมเริ่มขายหรือยัง? สร้างบัญชีผู้ขายและเริ่มทำโปรไฟล์ของคุณ',
    homeCtaSellerButton: 'สมัครตอนนี้',
    homeCtaBarLine: 'มีร้านหรือสถานที่ใช่ไหม? สมัครบัญชีบาร์เพื่อโพสต์กิจกรรมและเชื่อมต่อกับผู้ขาย',
    homeCtaBarButton: 'สมัครบัญชีบาร์',
    barLoginRequiredTitle: 'ต้องเข้าสู่ระบบด้วยบัญชีบาร์',
    barLoginProfileSubtitle: 'ใช้บัญชีบาร์เพื่อจัดการข้อมูลโปรไฟล์และโพสต์รูปภาพของบาร์',
    barLoginFeedSubtitle: 'ใช้บัญชีบาร์เพื่อสร้างและจัดการโพสต์สตอรี่ของบาร์',
    loginBuyerToMessage: 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ซื้อเพื่อส่งข้อความ',
    loginBuyerToCustomRequest: 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ซื้อเพื่อส่งคำขอพิเศษ',
    loginBuyerToRefundEvidence: 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ซื้อเพื่อส่งหลักฐานการขอคืนเงิน',
    loginToSendCustomRequestMessages: 'กรุณาเข้าสู่ระบบเพื่อส่งข้อความคำขอพิเศษ',
    loginToLikePosts: 'กรุณาเข้าสู่ระบบเพื่อกดถูกใจโพสต์',
    loginToCommentPosts: 'กรุณาเข้าสู่ระบบเพื่อคอมเมนต์โพสต์',
    loginToSavePosts: 'กรุณาเข้าสู่ระบบเพื่อบันทึกโพสต์',
    loginToReportComments: 'กรุณาเข้าสู่ระบบเพื่อรายงานความคิดเห็น',
    loginToReportMessages: 'กรุณาเข้าสู่ระบบเพื่อรายงานข้อความ',
    accountFrozenAppeal: 'บัญชีของคุณถูกระงับหลังจากได้รับการเตือนด้านการดูแลชุมชน 2 ครั้ง กรุณาส่งคำร้องอุทธรณ์เพื่อดำเนินการต่อ',
    barAccountMarketplaceBlocked: 'บัญชีบาร์ไม่สามารถซื้อหรือขายสินค้าในมาร์เก็ตเพลสได้',
    unlockOnlyBuyer: 'เฉพาะบัญชีผู้ซื้อเท่านั้นที่ปลดล็อกโพสต์ส่วนตัวได้',
    unlockWalletRequiredPrefix: 'คุณต้องมียอดเงินอย่างน้อย',
    unlockWalletRequiredSuffix: 'ในวอลเล็ตเพื่อปลดล็อกโพสต์นี้',
    postUnlockedPrefix: 'ปลดล็อกโพสต์แล้ว สำหรับ',
  },
  my: {
    title: 'ဝင်ရန်',
    subtitle: 'buyer, seller, bar သို့မဟုတ် admin အကောင့်ဖြင့် ဝင်ပါ',
    language: 'ဘာသာစကား',
    email: 'အီးမေးလ်',
    password: 'စကားဝှက်',
    showPassword: 'စကားဝှက် ပြရန်',
    hidePassword: 'စကားဝှက် ဝှက်ရန်',
    submit: 'ဝင်မည်',
    registerCta: 'အကောင့်မရှိသေးဘူးလား? စာရင်းသွင်းမည်',
    invalidCredentials: 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မမှန်ပါ',
    blocked: 'ဤအကောင့်ကို ပိတ်ထားသည်။ admin ကို ဆက်သွယ်ပါ',
    sellerRejectedPrefix: 'သင့် seller လျှောက်လွှာကို ငြင်းပယ်ထားသည်',
    sellerRejectedFallback: 'အသေးစိတ်ကို ပြင်ဆင်ပြီး ထပ်မံလျှောက်ထားပါ',
    sellerPending: 'သင့် seller အကောင့်သည် admin အတည်ပြုမှုကို စောင့်နေသည်',
    welcomeBack: 'ပြန်လည်ကြိုဆိုပါသည်',
    loginResponseInvalid: 'ဝင်ရောက်မှုတုံ့ပြန်ချက် မမှန်ကန်ပါ။ ထပ်ကြိုးစားပါ။',
    loginOffline: 'API အော့ဖ်လိုင်းဖြစ်နေသောကြောင့် ယခု ဝင်၍မရပါ။ ခဏနောက် ထပ်ကြိုးစားပါ။',
    resendEnterEmail: 'ပထမဦးစွာ အီးမေးလ်ထည့်ပြီးနောက် verification ကို ပြန်ပို့ပါ။',
    resendOffline: 'API အော့ဖ်လိုင်းဖြစ်နေသောကြောင့် verification email ကို ပြန်ပို့မရပါ။',
    resendFailed: 'verification email ကို ပြန်ပို့မရပါ။',
    resendSent: 'verification email ပို့ပြီးပါပြီ။ သင့် inbox ကို စစ်ဆေးပါ။',
    resendButton: 'verification email ပြန်ပို့ရန်',
    resendSending: 'verification email ပို့နေသည်...',
    verifyTitle: 'အီးမေးလ် အတည်ပြုရန်',
    verifySubtitle: 'စာရင်းသွင်းမှုကို ပြီးစီးစေရန် သင့်အကောင့် အီးမေးလ်ကို အတည်ပြုပါ',
    verifyPreparing: 'အတည်ပြုမှု ပြင်ဆင်နေသည်...',
    verifyInvalidLink: 'အတည်ပြု link မမှန်ကန်ပါ။ verification email အသစ်တောင်းပါ။',
    verifyInProgress: 'သင့်အီးမေးလ်ကို အတည်ပြုနေသည်...',
    verifyFailedRequestNew: 'အတည်ပြုမှု မအောင်မြင်ပါ။ link အသစ်တောင်းပါ။',
    verifyFailedTryAgain: 'အတည်ပြုမှု မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။',
    verifyGoToLogin: 'ဝင်ရန် သို့ သွားပါ',
    verifySuccess: 'အီးမေးလ် အတည်ပြုပြီးပါပြီ။ ယခု ဝင်နိုင်ပါပြီ။',
    homeCtaBuyerLine: 'favorites သိမ်းရန်၊ seller များကို မက်ဆေ့ချ်ပို့ရန်နှင့် checkout ကို မြန်မြန်လုပ်ရန် အကောင့်ဖန်တီးပါ',
    homeCtaBuyerButton: 'သင့်အကောင့် ဖန်တီးရန်',
    homeCtaSellerLine: 'ရောင်းချရန် အဆင်သင့်ဖြစ်ပြီလား? seller အကောင့်ဖန်တီးပြီး profile တည်ဆောက်ပါ',
    homeCtaSellerButton: 'ယခု စာရင်းသွင်းရန်',
    homeCtaBarLine: 'venue ရှိပါသလား? events တင်ရန်နှင့် sellers နှင့်ချိတ်ဆက်ရန် bar အကောင့်ဖွင့်ပါ',
    homeCtaBarButton: 'bar အကောင့် စာရင်းသွင်းရန်',
    barLoginRequiredTitle: 'bar အကောင့်ဖြင့် ဝင်ရန်လိုအပ်သည်',
    barLoginProfileSubtitle: 'bar profile အသေးစိတ်နှင့် ဓာတ်ပုံပို့စ်များကို စီမံရန် bar အကောင့်ကို အသုံးပြုပါ',
    barLoginFeedSubtitle: 'bar stories posts များကို ဖန်တီး/စီမံရန် bar အကောင့်ကို အသုံးပြုပါ',
    loginBuyerToMessage: 'မက်ဆေ့ချ်ပို့ရန် buyer အကောင့်ဖြင့် ဝင်ပါ',
    loginBuyerToCustomRequest: 'custom request ပို့ရန် buyer အကောင့်ဖြင့် ဝင်ပါ',
    loginBuyerToRefundEvidence: 'refund evidence တင်ရန် buyer အကောင့်ဖြင့် ဝင်ပါ',
    loginToSendCustomRequestMessages: 'custom request messages ပို့ရန် ဝင်ပါ',
    loginToLikePosts: 'post များကို like လုပ်ရန် ဝင်ပါ',
    loginToCommentPosts: 'post များတွင် comment ရေးရန် ဝင်ပါ',
    loginToSavePosts: 'post များကို save လုပ်ရန် ဝင်ပါ',
    loginToReportComments: 'comments များကို report လုပ်ရန် ဝင်ပါ',
    loginToReportMessages: 'messages များကို report လုပ်ရန် ဝင်ပါ',
    accountFrozenAppeal: 'moderation strike 2 ကြိမ်ရရှိသောကြောင့် သင့်အကောင့်ကို freeze လုပ်ထားပါသည်။ ဆက်လက်အသုံးပြုရန် appeal တင်ပါ။',
    barAccountMarketplaceBlocked: 'bar အကောင့်များသည် marketplace products များကို မဝယ်/မရောင်းနိုင်ပါ။',
    unlockOnlyBuyer: 'private posts များကို buyer အကောင့်သာ unlock လုပ်နိုင်သည်။',
    unlockWalletRequiredPrefix: 'ဤ post ကို unlock လုပ်ရန် သင့် wallet တွင် အနည်းဆုံး',
    unlockWalletRequiredSuffix: 'လိုအပ်သည်။',
    postUnlockedPrefix: 'post ကို unlock လုပ်ပြီးပါပြီ -',
  },
  ru: {
    title: 'Вход',
    subtitle: 'Войдите как покупатель, продавец, бар или администратор.',
    language: 'Язык',
    email: 'Email',
    password: 'Пароль',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    submit: 'Войти',
    registerCta: 'Нет аккаунта? Зарегистрироваться',
    invalidCredentials: 'Неверный email или пароль.',
    blocked: 'Этот аккаунт заблокирован. Обратитесь к администратору.',
    sellerRejectedPrefix: 'Ваша заявка продавца отклонена.',
    sellerRejectedFallback: 'Обновите данные и отправьте заявку снова.',
    sellerPending: 'Ваш аккаунт продавца ожидает одобрения администратора.',
    welcomeBack: 'С возвращением',
    loginResponseInvalid: 'Некорректный ответ сервера при входе. Попробуйте снова.',
    loginOffline: 'Вход недоступен, пока API офлайн. Пожалуйста, попробуйте чуть позже.',
    resendEnterEmail: 'Сначала введите email, затем нажмите повторную отправку подтверждения.',
    resendOffline: 'Повторная отправка письма подтверждения недоступна, пока API офлайн.',
    resendFailed: 'Не удалось повторно отправить письмо подтверждения.',
    resendSent: 'Письмо подтверждения отправлено. Проверьте вашу почту.',
    resendButton: 'Отправить письмо подтверждения снова',
    resendSending: 'Отправка письма подтверждения...',
    verifyTitle: 'Подтверждение email',
    verifySubtitle: 'Подтвердите email аккаунта, чтобы завершить регистрацию',
    verifyPreparing: 'Подготовка подтверждения...',
    verifyInvalidLink: 'Ссылка подтверждения недействительна. Запросите новое письмо подтверждения.',
    verifyInProgress: 'Подтверждаем ваш email...',
    verifyFailedRequestNew: 'Подтверждение не удалось. Запросите новую ссылку.',
    verifyFailedTryAgain: 'Подтверждение не удалось. Попробуйте снова.',
    verifyGoToLogin: 'Перейти ко входу',
    verifySuccess: 'Email подтвержден. Теперь вы можете войти.',
    homeCtaBuyerLine: 'Хотите сохранять избранное, писать продавцам и быстрее оформлять заказ?',
    homeCtaBuyerButton: 'Создать аккаунт',
    homeCtaSellerLine: 'Готовы продавать? Создайте аккаунт продавца и оформите профиль.',
    homeCtaSellerButton: 'Зарегистрироваться',
    homeCtaBarLine: 'Есть заведение? Создайте аккаунт бара, публикуйте события и связывайтесь с продавцами.',
    homeCtaBarButton: 'Зарегистрировать аккаунт бара',
    barLoginRequiredTitle: 'Требуется вход в аккаунт бара',
    barLoginProfileSubtitle: 'Используйте аккаунт бара, чтобы управлять профилем бара и фото-постами.',
    barLoginFeedSubtitle: 'Используйте аккаунт бара для создания и управления постами бара.',
    loginBuyerToMessage: 'Войдите как покупатель, чтобы отправлять сообщения.',
    loginBuyerToCustomRequest: 'Войдите как покупатель, чтобы отправлять индивидуальные запросы.',
    loginBuyerToRefundEvidence: 'Войдите как покупатель, чтобы отправить доказательства для возврата.',
    loginToSendCustomRequestMessages: 'Войдите, чтобы отправлять сообщения по индивидуальным запросам.',
    loginToLikePosts: 'Войдите, чтобы ставить лайки постам.',
    loginToCommentPosts: 'Войдите, чтобы комментировать посты.',
    loginToSavePosts: 'Войдите, чтобы сохранять посты.',
    loginToReportComments: 'Войдите, чтобы отправлять жалобы на комментарии.',
    loginToReportMessages: 'Войдите, чтобы отправлять жалобы на сообщения.',
    accountFrozenAppeal: 'Ваш аккаунт заморожен после двух страйков модерации. Подайте апелляцию, чтобы продолжить.',
    barAccountMarketplaceBlocked: 'Аккаунты баров не могут покупать или продавать товары маркетплейса.',
    unlockOnlyBuyer: 'Только аккаунты покупателей могут открывать приватные посты.',
    unlockWalletRequiredPrefix: 'Для разблокировки этого поста нужно как минимум',
    unlockWalletRequiredSuffix: 'в кошельке.',
    postUnlockedPrefix: 'Пост разблокирован за',
  },
};

const SELLER_STATUS_I18N = {
  en: {
    profileSaved: 'Profile updates saved.',
    languageUpdated: 'Language preference updated.',
    uploadImageBeforePost: 'Please upload an image before publishing your post.',
    postPublished: 'Post published to Stories.',
    postScheduled: ({ when }) => `Post scheduled for ${when}.`,
    postSavedLocal: 'Post saved locally. It will sync when the connection is restored.',
    publishPostFailed: 'Could not publish seller post.',
    completeOnboarding: ({ items }) => `Complete onboarding first: ${items}.`,
    listingPublished: 'Listing published successfully.',
    deleteProductConfirm: ({ title }) => `Delete "${title}"? This will remove it from your listings.`,
    productDeleted: 'Product deleted successfully.',
    productDeletedLocal: 'Product deleted locally. Server sync is pending.',
    deleteProductFailed: 'Could not delete product.',
    deletePostConfirm: 'Delete this Stories post?',
    postDeleted: 'Post deleted successfully.',
    postDeletedLocal: 'Post deleted locally. Server sync is pending.',
    deleteSellerPostFailed: 'Could not delete seller post.',
    loginToReport: 'Please login to report a post.',
    alreadyReported: 'You already reported this post.',
    postReported: 'Post reported. Our moderation team will review it.',
    submitReportFailed: 'Could not submit report.',
    reportResolved: 'Report resolved.',
    reportResolvedLocal: 'Report resolved locally.',
    resolveReportFailed: 'Could not resolve report.',
    resolveAllReportsConfirm: ({ count }) => `Resolve all ${count} open post report(s)?`,
    productNotFound: 'Product not found.',
    postNotFound: 'Post not found.',
    reportNotFound: 'Report not found.',
    onlyOwnProducts: 'You can only delete your own products.',
    onlyOwnPosts: 'You can only delete your own posts.',
    invalidDeleteRequest: 'Invalid delete request.',
    reportFieldsRequired: 'postId, reporterUserId, and reason are required.',
    invalidReportPayload: 'Invalid report payload.',
    adminRoleRequired: 'Admin role is required.',
    invalidResolveRequest: 'Invalid resolve request.',
    sellerNotFound: 'Seller not found.',
    affiliationConfirmed: ({ barName }) => `${barName} affiliation confirmed.`,
    affiliationRejected: ({ barName }) => `Affiliation request for ${barName} was rejected.`,
    affiliationRequestCancelled: 'Affiliation request cancelled.',
    affiliationRemoved: ({ barName }) => `Removed affiliation with ${barName}.`,
    feedPrivate: 'Entire stories set to private.',
    feedPublic: 'Entire stories set to public.',
    feedPerPost: 'Stories set to choose-per-post mode.',
    postPrivate: 'Post set to private.',
    postPublic: 'Post set to public.',
    privatePricesUpdated: ({ amount }) => `Updated all private post prices to ${amount}.`,
    postUnscheduled: 'Post unscheduled.',
    scheduledPostPublishedNow: 'Scheduled post published now.',
    accountActiveToComment: 'Your account must be active to post comments.',
    onlyBuyerPaidComments: 'Only buyer accounts can post paid comments.',
    walletNeededToComment: ({ amount }) => `You need at least ${amount} in your wallet to comment.`,
    loginBuyerFollowSellers: 'Login as a buyer to follow sellers.',
    loginBuyerOrBarFollowBars: 'Login as a buyer or bar to follow bars.',
    accountActiveToReport: 'Your account must be active to submit reports.',
    cannotReportOwnComment: 'You cannot report your own comment.',
    alreadyReportedComment: 'You already reported this comment.',
    commentReported: 'Comment reported. Admin will review it.',
    onlyBuyersReportDirectMessages: 'Only buyers can report direct messages.',
    onlySellerMessagesReportable: 'Only seller messages can be reported from this view.',
    cannotReportOwnMessage: 'You cannot report your own message.',
    alreadyReportedMessage: 'You already reported this message.',
    messageReported: 'Message reported. Admin will review it.',
    commentReportResolved: 'Comment report resolved.',
    messageReportResolved: 'Message report resolved.',
    messageReportDismissed: 'Message report dismissed.',
    appealsOnlyEligible: 'Appeals are only available for frozen accounts or accounts with active strikes.',
    appealSubmitted: 'Appeal submitted. Admin will review it soon.',
    appealApprovedRestored: 'Appeal approved and account restored.',
    appealDenied: 'Appeal denied.',
    listingPriceAtLeast: ({ amount }) => `Listing price must be at least ${amount}.`,
    onlineEnabled: 'You are visible as online.',
    onlineDisabled: 'You are now offline.',
  },
  th: {
    profileSaved: 'บันทึกการอัปเดตโปรไฟล์แล้ว',
    languageUpdated: 'อัปเดตภาษาที่ต้องการแล้ว',
    uploadImageBeforePost: 'โปรดอัปโหลดรูปภาพก่อนเผยแพร่โพสต์',
    postPublished: 'เผยแพร่โพสต์ไปยังสตอรี่แล้ว',
    postSavedLocal: 'บันทึกโพสต์ในเครื่องแล้ว ระบบจะซิงก์เมื่อเชื่อมต่ออีกครั้ง',
    publishPostFailed: 'ไม่สามารถเผยแพร่โพสต์ผู้ขายได้',
    completeOnboarding: ({ items }) => `กรุณาทำขั้นตอนเริ่มต้นให้ครบก่อน: ${items}.`,
    listingPublished: 'เผยแพร่รายการสินค้าเรียบร้อยแล้ว',
    deleteProductConfirm: ({ title }) => `ลบ "${title}"? รายการนี้จะถูกลบออกจากคลังสินค้าของคุณ`,
    productDeleted: 'ลบสินค้าเรียบร้อยแล้ว',
    productDeletedLocal: 'ลบสินค้าในเครื่องแล้ว การซิงก์กับเซิร์ฟเวอร์กำลังรออยู่',
    deleteProductFailed: 'ไม่สามารถลบสินค้าได้',
    deletePostConfirm: 'ลบโพสต์สตอรี่นี้หรือไม่?',
    postDeleted: 'ลบโพสต์เรียบร้อยแล้ว',
    postDeletedLocal: 'ลบโพสต์ในเครื่องแล้ว การซิงก์กับเซิร์ฟเวอร์กำลังรออยู่',
    deleteSellerPostFailed: 'ไม่สามารถลบโพสต์ผู้ขายได้',
    loginToReport: 'โปรดเข้าสู่ระบบเพื่อรายงานโพสต์',
    alreadyReported: 'คุณได้รายงานโพสต์นี้แล้ว',
    postReported: 'รายงานโพสต์แล้ว ทีมดูแลจะตรวจสอบต่อไป',
    submitReportFailed: 'ไม่สามารถส่งรายงานได้',
    reportResolved: 'ปิดเคสรายงานแล้ว',
    reportResolvedLocal: 'ปิดเคสรายงานในเครื่องแล้ว',
    resolveReportFailed: 'ไม่สามารถปิดเคสรายงานได้',
    resolveAllReportsConfirm: ({ count }) => `ต้องการปิดเคสรายงานที่เปิดอยู่ทั้งหมด ${count} รายการหรือไม่?`,
    productNotFound: 'ไม่พบสินค้า',
    postNotFound: 'ไม่พบโพสต์',
    reportNotFound: 'ไม่พบรายงาน',
    onlyOwnProducts: 'คุณสามารถลบได้เฉพาะสินค้าของคุณเอง',
    onlyOwnPosts: 'คุณสามารถลบได้เฉพาะโพสต์ของคุณเอง',
    invalidDeleteRequest: 'คำขอลบไม่ถูกต้อง',
    reportFieldsRequired: 'จำเป็นต้องมี postId, reporterUserId และ reason',
    invalidReportPayload: 'ข้อมูลรายงานไม่ถูกต้อง',
    adminRoleRequired: 'จำเป็นต้องมีสิทธิ์ผู้ดูแลระบบ',
    invalidResolveRequest: 'คำขอปิดเคสไม่ถูกต้อง',
    sellerNotFound: 'ไม่พบผู้ขาย',
    affiliationConfirmed: ({ barName }) => `ยืนยันการเชื่อมโยงกับ ${barName} แล้ว`,
    affiliationRejected: ({ barName }) => `คำขอเชื่อมโยงกับ ${barName} ถูกปฏิเสธ`,
    affiliationRequestCancelled: 'ยกเลิกคำขอเชื่อมโยงแล้ว',
    affiliationRemoved: ({ barName }) => `ยกเลิกการเชื่อมโยงกับ ${barName} แล้ว`,
    feedPrivate: 'ตั้งค่าสตอรี่ทั้งหมดเป็นส่วนตัวแล้ว',
    feedPublic: 'ตั้งค่าสตอรี่ทั้งหมดเป็นสาธารณะแล้ว',
    feedPerPost: 'ตั้งค่าสตอรี่เป็นแบบเลือกต่อโพสต์แล้ว',
    postPrivate: 'ตั้งค่าโพสต์เป็นส่วนตัวแล้ว',
    postPublic: 'ตั้งค่าโพสต์เป็นสาธารณะแล้ว',
    privatePricesUpdated: ({ amount }) => `อัปเดตราคาโพสต์ส่วนตัวทั้งหมดเป็น ${amount} แล้ว`,
    postUnscheduled: 'ยกเลิกการตั้งเวลาโพสต์แล้ว',
    scheduledPostPublishedNow: 'เผยแพร่โพสต์ที่ตั้งเวลาไว้ทันทีแล้ว',
    accountActiveToComment: 'บัญชีของคุณต้องเป็นสถานะใช้งานจึงจะแสดงความคิดเห็นได้',
    onlyBuyerPaidComments: 'เฉพาะบัญชีผู้ซื้อเท่านั้นที่สามารถคอมเมนต์แบบมีค่าบริการได้',
    walletNeededToComment: ({ amount }) => `คุณต้องมียอดเงินอย่างน้อย ${amount} ในวอลเล็ตเพื่อคอมเมนต์`,
    loginBuyerFollowSellers: 'เข้าสู่ระบบด้วยบัญชีผู้ซื้อเพื่อกดติดตามผู้ขาย',
    loginBuyerOrBarFollowBars: 'เข้าสู่ระบบด้วยบัญชีผู้ซื้อหรือบาร์เพื่อกดติดตามบาร์',
    accountActiveToReport: 'บัญชีของคุณต้องเป็นสถานะใช้งานจึงจะส่งรายงานได้',
    cannotReportOwnComment: 'คุณไม่สามารถรายงานความคิดเห็นของตัวเองได้',
    alreadyReportedComment: 'คุณรายงานความคิดเห็นนี้ไปแล้ว',
    commentReported: 'รายงานความคิดเห็นแล้ว ผู้ดูแลระบบจะตรวจสอบ',
    onlyBuyersReportDirectMessages: 'เฉพาะผู้ซื้อเท่านั้นที่รายงานข้อความโดยตรงได้',
    onlySellerMessagesReportable: 'ในหน้านี้สามารถรายงานได้เฉพาะข้อความของผู้ขาย',
    cannotReportOwnMessage: 'คุณไม่สามารถรายงานข้อความของตัวเองได้',
    alreadyReportedMessage: 'คุณรายงานข้อความนี้ไปแล้ว',
    messageReported: 'รายงานข้อความแล้ว ผู้ดูแลระบบจะตรวจสอบ',
    commentReportResolved: 'ปิดเคสรายงานความคิดเห็นแล้ว',
    messageReportResolved: 'ปิดเคสรายงานข้อความแล้ว',
    messageReportDismissed: 'ยกเลิกรายงานข้อความแล้ว',
    appealsOnlyEligible: 'การอุทธรณ์ใช้ได้เฉพาะบัญชีที่ถูกระงับหรือมีการเตือนที่ยังมีผลอยู่',
    appealSubmitted: 'ส่งคำร้องอุทธรณ์แล้ว ผู้ดูแลระบบจะตรวจสอบในเร็วๆ นี้',
    appealApprovedRestored: 'อนุมัติคำอุทธรณ์แล้ว และกู้คืนบัญชีเรียบร้อย',
    appealDenied: 'คำอุทธรณ์ถูกปฏิเสธ',
    listingPriceAtLeast: ({ amount }) => `ราคาสินค้าต้องไม่น้อยกว่า ${amount}`,
    onlineEnabled: 'เปิดสถานะออนไลน์แล้ว',
    onlineDisabled: 'ปิดสถานะออนไลน์แล้ว',
  },
  my: {
    profileSaved: 'ပရိုဖိုင် ပြင်ဆင်ချက်များကို သိမ်းပြီးပါပြီ',
    languageUpdated: 'ဘာသာစကားရွေးချယ်မှုကို အပ်ဒိတ်လုပ်ပြီးပါပြီ',
    uploadImageBeforePost: 'post တင်မည့်အချိန်တွင် ပုံတင်ပေးပါ',
    postPublished: 'Stories သို့ post တင်ပြီးပါပြီ',
    postSavedLocal: 'post ကို local တွင် သိမ်းထားပြီး connection ပြန်ရလာသည့်အခါ sync လုပ်ပါမည်',
    publishPostFailed: 'seller post ကို မတင်နိုင်ပါ',
    completeOnboarding: ({ items }) => `onboarding ကို အရင်ပြီးအောင်လုပ်ပါ: ${items}.`,
    listingPublished: 'listing ကို အောင်မြင်စွာ တင်ပြီးပါပြီ',
    deleteProductConfirm: ({ title }) => `"${title}" ကို ဖျက်မလား? သင့် listing မှ ဖယ်ရှားပါမည်`,
    productDeleted: 'product ကို အောင်မြင်စွာ ဖျက်ပြီးပါပြီ',
    productDeletedLocal: 'product ကို local တွင် ဖျက်ပြီး server sync ကို စောင့်နေသည်',
    deleteProductFailed: 'product ကို မဖျက်နိုင်ပါ',
    deletePostConfirm: 'ဒီ Stories post ကို ဖျက်မလား?',
    postDeleted: 'post ကို အောင်မြင်စွာ ဖျက်ပြီးပါပြီ',
    postDeletedLocal: 'post ကို local တွင် ဖျက်ပြီး server sync ကို စောင့်နေသည်',
    deleteSellerPostFailed: 'seller post ကို မဖျက်နိုင်ပါ',
    loginToReport: 'post ကို report လုပ်ရန် login ဝင်ပါ',
    alreadyReported: 'ဒီ post ကို report လုပ်ပြီးသားဖြစ်သည်',
    postReported: 'post ကို report လုပ်ပြီး moderation team မှ စိစစ်ပါမည်',
    submitReportFailed: 'report မတင်နိုင်ပါ',
    reportResolved: 'report ကို ဖြေရှင်းပြီးပါပြီ',
    reportResolvedLocal: 'report ကို local တွင် ဖြေရှင်းပြီးပါပြီ',
    resolveReportFailed: 'report ကို မဖြေရှင်းနိုင်ပါ',
    resolveAllReportsConfirm: ({ count }) => `open report ${count} ခုလုံးကို resolve လုပ်မလား?`,
    productNotFound: 'product မတွေ့ပါ',
    postNotFound: 'post မတွေ့ပါ',
    reportNotFound: 'report မတွေ့ပါ',
    onlyOwnProducts: 'သင့် product များကိုသာ ဖျက်နိုင်ပါသည်',
    onlyOwnPosts: 'သင့် post များကိုသာ ဖျက်နိုင်ပါသည်',
    invalidDeleteRequest: 'delete request မမှန်ကန်ပါ',
    reportFieldsRequired: 'postId, reporterUserId နှင့် reason လိုအပ်ပါသည်',
    invalidReportPayload: 'report payload မမှန်ကန်ပါ',
    adminRoleRequired: 'admin role လိုအပ်ပါသည်',
    invalidResolveRequest: 'resolve request မမှန်ကန်ပါ',
    sellerNotFound: 'seller မတွေ့ပါ',
    affiliationConfirmed: ({ barName }) => `${barName} နှင့် affiliation ကို အတည်ပြုပြီးပါပြီ`,
    affiliationRejected: ({ barName }) => `${barName} အတွက် affiliation request ကို ငြင်းပယ်ခဲ့သည်`,
    affiliationRequestCancelled: 'affiliation request ကို ပယ်ဖျက်ပြီးပါပြီ',
    affiliationRemoved: ({ barName }) => `${barName} နှင့် affiliation ကို ဖယ်ရှားပြီးပါပြီ`,
    feedPrivate: 'stories တစ်ခုလုံးကို private အဖြစ် သတ်မှတ်ပြီးပါပြီ',
    feedPublic: 'stories တစ်ခုလုံးကို public အဖြစ် သတ်မှတ်ပြီးပါပြီ',
    feedPerPost: 'stories ကို post တစ်ခုစီအလိုက် ရွေးချယ်မည့် mode သို့ ပြောင်းထားသည်',
    postPrivate: 'post ကို private အဖြစ် သတ်မှတ်ပြီးပါပြီ',
    postPublic: 'post ကို public အဖြစ် သတ်မှတ်ပြီးပါပြီ',
    privatePricesUpdated: ({ amount }) => `private post စျေးနှုန်းများအားလုံးကို ${amount} သို့ အပ်ဒိတ်လုပ်ပြီးပါပြီ`,
    postUnscheduled: 'post schedule ကို ဖြုတ်ပြီးပါပြီ',
    scheduledPostPublishedNow: 'schedule လုပ်ထားသော post ကို ယခုတင်ပြီးပါပြီ',
    accountActiveToComment: 'comment ရေးရန် သင့်အကောင့်သည် active ဖြစ်ရမည်',
    onlyBuyerPaidComments: 'paid comment များကို buyer အကောင့်သာ ပို့နိုင်သည်',
    walletNeededToComment: ({ amount }) => `comment ရေးရန် wallet တွင် အနည်းဆုံး ${amount} လိုအပ်သည်`,
    loginBuyerFollowSellers: 'sellers များကို follow လုပ်ရန် buyer အဖြစ် login ဝင်ပါ',
    loginBuyerOrBarFollowBars: 'bars များကို follow လုပ်ရန် buyer သို့မဟုတ် bar အဖြစ် login ဝင်ပါ',
    accountActiveToReport: 'report တင်ရန် သင့်အကောင့်သည် active ဖြစ်ရမည်',
    cannotReportOwnComment: 'သင့်ကိုယ်ပိုင် comment ကို report မလုပ်နိုင်ပါ',
    alreadyReportedComment: 'ဤ comment ကို report လုပ်ပြီးသားဖြစ်သည်',
    commentReported: 'comment ကို report လုပ်ပြီးပါပြီ။ Admin မှ စစ်ဆေးပါမည်',
    onlyBuyersReportDirectMessages: 'direct messages များကို buyer များသာ report လုပ်နိုင်သည်',
    onlySellerMessagesReportable: 'ဤ view မှ seller messages များကိုသာ report လုပ်နိုင်သည်',
    cannotReportOwnMessage: 'သင့်ကိုယ်ပိုင် message ကို report မလုပ်နိုင်ပါ',
    alreadyReportedMessage: 'ဤ message ကို report လုပ်ပြီးသားဖြစ်သည်',
    messageReported: 'message ကို report လုပ်ပြီးပါပြီ။ Admin မှ စစ်ဆေးပါမည်',
    commentReportResolved: 'comment report ကို ဖြေရှင်းပြီးပါပြီ',
    messageReportResolved: 'message report ကို ဖြေရှင်းပြီးပါပြီ',
    messageReportDismissed: 'message report ကို ပယ်ချပြီးပါပြီ',
    appealsOnlyEligible: 'appeal ကို frozen accounts သို့မဟုတ် active strikes ရှိသော accounts များသာ အသုံးပြုနိုင်သည်',
    appealSubmitted: 'appeal တင်ပြီးပါပြီ။ Admin မှ မကြာမီ စစ်ဆေးပါမည်',
    appealApprovedRestored: 'appeal ကို အတည်ပြုပြီး account ကို ပြန်ဖွင့်ပေးခဲ့သည်',
    appealDenied: 'appeal ကို ငြင်းပယ်ခဲ့သည်',
    listingPriceAtLeast: ({ amount }) => `listing စျေးနှုန်းသည် ${amount} အနည်းဆုံးဖြစ်ရမည်`,
    onlineEnabled: 'online status ကို ဖွင့်ပြီးပါပြီ',
    onlineDisabled: 'offline status သို့ ပြောင်းပြီးပါပြီ',
  },
  ru: {
    profileSaved: 'Изменения профиля сохранены.',
    languageUpdated: 'Язык интерфейса обновлен.',
    uploadImageBeforePost: 'Пожалуйста, загрузите изображение перед публикацией поста.',
    postPublished: 'Пост опубликован в Истории.',
    postSavedLocal: 'Пост сохранен локально. Синхронизация выполнится после восстановления соединения.',
    publishPostFailed: 'Не удалось опубликовать пост продавца.',
    completeOnboarding: ({ items }) => `Сначала завершите онбординг: ${items}.`,
    listingPublished: 'Объявление успешно опубликовано.',
    deleteProductConfirm: ({ title }) => `Удалить "${title}"? Товар будет удален из ваших объявлений.`,
    productDeleted: 'Товар успешно удален.',
    productDeletedLocal: 'Товар удален локально. Синхронизация с сервером ожидается.',
    deleteProductFailed: 'Не удалось удалить товар.',
    deletePostConfirm: 'Удалить этот пост из Историй?',
    postDeleted: 'Пост успешно удален.',
    postDeletedLocal: 'Пост удален локально. Синхронизация с сервером ожидается.',
    deleteSellerPostFailed: 'Не удалось удалить пост продавца.',
    loginToReport: 'Войдите, чтобы пожаловаться на пост.',
    alreadyReported: 'Вы уже пожаловались на этот пост.',
    postReported: 'Жалоба отправлена. Модерация проверит этот пост.',
    submitReportFailed: 'Не удалось отправить жалобу.',
    reportResolved: 'Жалоба обработана.',
    reportResolvedLocal: 'Жалоба обработана локально.',
    resolveReportFailed: 'Не удалось обработать жалобу.',
    resolveAllReportsConfirm: ({ count }) => `Обработать все открытые жалобы (${count})?`,
    productNotFound: 'Товар не найден.',
    postNotFound: 'Пост не найден.',
    reportNotFound: 'Жалоба не найдена.',
    onlyOwnProducts: 'Вы можете удалять только свои товары.',
    onlyOwnPosts: 'Вы можете удалять только свои посты.',
    invalidDeleteRequest: 'Некорректный запрос на удаление.',
    reportFieldsRequired: 'Требуются postId, reporterUserId и reason.',
    invalidReportPayload: 'Некорректные данные жалобы.',
    adminRoleRequired: 'Требуется роль администратора.',
    invalidResolveRequest: 'Некорректный запрос на обработку.',
    sellerNotFound: 'Продавец не найден.',
    affiliationConfirmed: ({ barName }) => `Связь с баром ${barName} подтверждена.`,
    affiliationRejected: ({ barName }) => `Запрос на связь с ${barName} был отклонен.`,
    affiliationRequestCancelled: 'Запрос на связь отменен.',
    affiliationRemoved: ({ barName }) => `Связь с ${barName} удалена.`,
    feedPrivate: 'Все истории переведены в приватный режим.',
    feedPublic: 'Все истории переведены в публичный режим.',
    feedPerPost: 'Истории переведены в режим выбора для каждого поста.',
    postPrivate: 'Пост переведен в приватный режим.',
    postPublic: 'Пост переведен в публичный режим.',
    privatePricesUpdated: ({ amount }) => `Цены всех приватных постов обновлены до ${amount}.`,
    postUnscheduled: 'Публикация по расписанию отменена.',
    scheduledPostPublishedNow: 'Запланированный пост опубликован сейчас.',
    accountActiveToComment: 'Чтобы оставлять комментарии, аккаунт должен быть активен.',
    onlyBuyerPaidComments: 'Платные комментарии могут оставлять только покупатели.',
    walletNeededToComment: ({ amount }) => `Чтобы комментировать, на кошельке нужно как минимум ${amount}.`,
    loginBuyerFollowSellers: 'Войдите как покупатель, чтобы подписываться на продавцов.',
    loginBuyerOrBarFollowBars: 'Войдите как покупатель или бар, чтобы подписываться на бары.',
    accountActiveToReport: 'Чтобы отправлять жалобы, аккаунт должен быть активен.',
    cannotReportOwnComment: 'Нельзя пожаловаться на собственный комментарий.',
    alreadyReportedComment: 'Вы уже пожаловались на этот комментарий.',
    commentReported: 'Жалоба на комментарий отправлена. Администратор проверит.',
    onlyBuyersReportDirectMessages: 'На личные сообщения могут жаловаться только покупатели.',
    onlySellerMessagesReportable: 'В этом разделе можно жаловаться только на сообщения продавца.',
    cannotReportOwnMessage: 'Нельзя пожаловаться на собственное сообщение.',
    alreadyReportedMessage: 'Вы уже пожаловались на это сообщение.',
    messageReported: 'Жалоба на сообщение отправлена. Администратор проверит.',
    commentReportResolved: 'Жалоба на комментарий обработана.',
    messageReportResolved: 'Жалоба на сообщение обработана.',
    messageReportDismissed: 'Жалоба на сообщение отклонена.',
    appealsOnlyEligible: 'Апелляции доступны только для замороженных аккаунтов или аккаунтов с активными страйками.',
    appealSubmitted: 'Апелляция отправлена. Администратор скоро рассмотрит ее.',
    appealApprovedRestored: 'Апелляция одобрена, аккаунт восстановлен.',
    appealDenied: 'Апелляция отклонена.',
    listingPriceAtLeast: ({ amount }) => `Цена объявления должна быть не ниже ${amount}.`,
    onlineEnabled: 'Статус онлайн включен.',
    onlineDisabled: 'Статус офлайн включен.',
  },
};

const ADMIN_ACTION_I18N = {
  en: {
    sellerApproved: 'Seller account approved.',
    sellersApprovedBulk: ({ count }) => `Approved ${count} seller application(s).`,
    sellerRejected: 'Seller application marked as rejected.',
    barUpdated: 'Bar profile updated.',
    sellerAffiliationUpdated: 'Seller affiliation updated.',
    sellerSetIndependent: 'Seller set to Independent.',
    barRemovedIndependent: 'Bar removed. Linked sellers set to Independent.',
  },
  th: {
    sellerApproved: 'อนุมัติบัญชีผู้ขายแล้ว',
    sellersApprovedBulk: ({ count }) => `อนุมัติคำขอผู้ขายแล้ว ${count} รายการ`,
    sellerRejected: 'ทำเครื่องหมายคำขอผู้ขายเป็นปฏิเสธแล้ว',
    barUpdated: 'อัปเดตโปรไฟล์บาร์แล้ว',
    sellerAffiliationUpdated: 'อัปเดตการเชื่อมโยงผู้ขายแล้ว',
    sellerSetIndependent: 'ตั้งค่าผู้ขายเป็นอิสระแล้ว',
    barRemovedIndependent: 'ลบบาร์แล้ว และตั้งค่าผู้ขายที่เกี่ยวข้องเป็นอิสระ',
  },
  my: {
    sellerApproved: 'seller account ကို အတည်ပြုပြီးပါပြီ',
    sellersApprovedBulk: ({ count }) => `seller application ${count} ခုကို အတည်ပြုပြီးပါပြီ`,
    sellerRejected: 'seller application ကို reject အဖြစ် သတ်မှတ်ပြီးပါပြီ',
    barUpdated: 'bar profile ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ',
    sellerAffiliationUpdated: 'seller affiliation ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ',
    sellerSetIndependent: 'seller ကို Independent အဖြစ် သတ်မှတ်ပြီးပါပြီ',
    barRemovedIndependent: 'bar ကို ဖယ်ရှားပြီး linked sellers များကို Independent အဖြစ် သတ်မှတ်ပြီးပါပြီ',
  },
  ru: {
    sellerApproved: 'Аккаунт продавца одобрен.',
    sellersApprovedBulk: ({ count }) => `Одобрено заявок продавцов: ${count}.`,
    sellerRejected: 'Заявка продавца отмечена как отклоненная.',
    barUpdated: 'Профиль бара обновлен.',
    sellerAffiliationUpdated: 'Связь продавца обновлена.',
    sellerSetIndependent: 'Продавец переведен в независимый статус.',
    barRemovedIndependent: 'Бар удален. Связанные продавцы переведены в независимый статус.',
  },
};

const BAR_STATUS_I18N = {
  en: {
    affiliationRequestCancelled: 'Affiliation request cancelled.',
    addLocationBeforeAutofill: 'Add your venue location first, then use auto-fill.',
    saveFailed: 'Could not save bar profile. Please try again.',
    uploadImageBeforePosting: 'Please upload a bar image before posting.',
    photoPosted: 'Bar photo posted.',
    postRemoved: 'Bar post removed.',
    languageUpdated: 'Bar language updated.',
  },
  th: {
    affiliationRequestCancelled: 'ยกเลิกคำขอเชื่อมโยงแล้ว',
    addLocationBeforeAutofill: 'กรอกตำแหน่งสถานที่ของคุณก่อน แล้วจึงใช้การเติมข้อมูลอัตโนมัติ',
    saveFailed: 'ไม่สามารถบันทึกโปรไฟล์บาร์ได้ โปรดลองอีกครั้ง',
    uploadImageBeforePosting: 'โปรดอัปโหลดรูปภาพบาร์ก่อนโพสต์',
    photoPosted: 'โพสต์รูปภาพบาร์แล้ว',
    postRemoved: 'ลบโพสต์บาร์แล้ว',
    languageUpdated: 'อัปเดตภาษาของบาร์แล้ว',
  },
  my: {
    affiliationRequestCancelled: 'affiliation request ကို ပယ်ဖျက်ပြီးပါပြီ',
    addLocationBeforeAutofill: 'venue တည်နေရာကို အရင်ထည့်ပြီးမှ auto-fill ကို သုံးပါ',
    saveFailed: 'bar profile ကို မသိမ်းနိုင်ပါ။ ထပ်ကြိုးစားပါ။',
    uploadImageBeforePosting: 'post မတင်ခင် bar image ကို အရင်တင်ပါ',
    photoPosted: 'bar photo ကို post တင်ပြီးပါပြီ',
    postRemoved: 'bar post ကို ဖယ်ရှားပြီးပါပြီ',
    languageUpdated: 'bar language ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ',
  },
  ru: {
    affiliationRequestCancelled: 'Запрос на связь отменен.',
    addLocationBeforeAutofill: 'Сначала добавьте адрес заведения, затем используйте автозаполнение.',
    saveFailed: 'Не удалось сохранить профиль бара. Попробуйте снова.',
    uploadImageBeforePosting: 'Пожалуйста, загрузите фото бара перед публикацией.',
    photoPosted: 'Фото бара опубликовано.',
    postRemoved: 'Пост бара удален.',
    languageUpdated: 'Язык бара обновлен.',
  },
};

const SEED_DEMO_PASSWORD = String(import.meta.env.VITE_SEED_DEMO_PASSWORD || 'demo123').trim();

const SEED_DB = {
  siteSettings: {
    promptPayReceiverMobile: '0812345678',
  },
  users: [
    {
      id: 'admin-2',
      name: 'Kyle Roof',
      email: String(import.meta.env.VITE_SEED_ADMIN_EMAIL || 'admin@localhost.invalid').trim(),
      phone: '',
      country: '',
      city: '',
      address: '',
      walletBalance: 0,
      role: 'admin',
      password: String(import.meta.env.VITE_SEED_ADMIN_PASSWORD || '__set_vite_seed_admin_password__').trim(),
      accountStatus: 'active',
    },
    {
      id: 'seller-1',
      name: 'Nina B.',
      email: 'nina@example.com',
      phone: '+66 88 888 8899',
      country: 'Thailand',
      city: 'Bangkok',
      address: 'Sathon, Bangkok',
      walletBalance: 0,
      role: 'seller',
      sellerId: 'nina-b',
      password: SEED_DEMO_PASSWORD,
      accountStatus: 'active',
      height: 165,
      weight: 52,
      hairColor: 'Black',
      braSize: '32B',
      pantySize: 'S',
    },
    {
      id: 'buyer-1',
      name: 'Alex T.',
      email: 'alex@example.com',
      phone: '+1 206 555 0101',
      country: 'United States',
      city: 'Portland',
      address: '88 NW Alder Street',
      walletBalance: 50,
      role: 'buyer',
      password: SEED_DEMO_PASSWORD,
      accountStatus: 'active',
    },
    {
      id: 'bar-1',
      name: 'Small World Chiang Mai',
      email: 'smallworld.cm@example.com',
      phone: '+66 82 555 0199',
      country: 'Thailand',
      city: 'Chiang Mai',
      address: 'Loh Kroh Boxing Stadium, Chiang Mai, Thailand',
      walletBalance: 0,
      role: 'bar',
      barId: 'small-world-chiang-mai',
      password: SEED_DEMO_PASSWORD,
      accountStatus: 'active',
      preferredLanguage: 'en',
    },
  ],
  sellers: [
    {
      id: 'nina-b',
      name: 'Nina B.',
      location: 'Bangkok, Thailand',
      bio: 'Nina offers premium used panties with clear listing details, discreet handling, and respectful communication.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 2–4 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Premium used pairs', 'Discreet shipping', 'Professional communication'],
      height: 165,
      weight: 52,
      hairColor: 'Black',
      braSize: '32B',
      pantySize: 'S',
    },
    {
      id: 'mali-k',
      name: 'Mali K.',
      location: 'Chiang Mai, Thailand',
      bio: 'Mali focuses on premium used underwear listings with a polished experience and dependable worldwide fulfillment.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 3–5 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Lace and premium styles', 'Limited drops', 'Trusted fulfillment'],
    },
    {
      id: 'prae-s',
      name: 'Prae S.',
      location: 'Phuket, Thailand',
      bio: 'Prae offers premium everyday used underwear listings, consistent quality notes, and fast discreet dispatch.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 1–3 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Everyday favorites', 'Sport-inspired cuts', 'Fast dispatch'],
    },
    {
      id: 'lila-r',
      name: 'Lila R.',
      location: 'Pattaya, Thailand',
      bio: 'Lila curates polished lingerie-inspired listings with elegant details, responsive communication, and discreet worldwide dispatch.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 2-4 days',
      isOnline: true,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English', 'Russian'],
      highlights: ['Lingerie-inspired looks', 'Curated bundles', 'Premium presentation'],
    },
    {
      id: 'anya-v',
      name: 'Anya V.',
      location: 'Hat Yai, Thailand',
      bio: 'Anya focuses on daily-wear favorites and comfort-first styles with clear notes and reliable order prep.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 1-3 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English', 'Burmese'],
      highlights: ['Comfort styles', 'Fast turnaround', 'Friendly communication'],
    },
    {
      id: 'sora-p',
      name: 'Sora P.',
      location: 'Khon Kaen, Thailand',
      bio: 'Sora offers premium statement pieces and seasonal collections with a detail-rich listing style.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 2-4 days',
      isOnline: true,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Seasonal drops', 'Statement pieces', 'Trusted shipping'],
    },
    {
      id: 'kiko-n',
      name: 'Kiko N.',
      location: 'Bangkok, Thailand',
      bio: 'Kiko runs a versatile catalog that includes intimates, hosiery, and fashion-layer listings for buyers wanting variety.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 3-5 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English', 'Russian'],
      highlights: ['Wide catalog', 'Fashion layers', 'Consistent quality notes'],
    },
    {
      id: 'dao-p',
      name: 'Dao P.',
      location: 'Bangkok, Thailand',
      bio: 'Dao offers premium used panties with clear listing details, responsive communication, and discreet shipping.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 1-3 days',
      isOnline: true,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Curated premium drops', 'Quick responses', 'Discreet packaging'],
    },
    {
      id: 'lina-cm',
      name: 'Lina',
      location: 'Chiang Mai, Thailand',
      bio: 'Lina shares premium listings with clear details, friendly communication, and discreet shipping.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 1-3 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Premium quality', 'Fast response', 'Discreet packaging'],
    },
    {
      id: 'try-cm',
      name: 'Try',
      location: 'Chiang Mai, Thailand',
      bio: 'Try focuses on everyday styles with reliable fulfillment and respectful buyer communication.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 2-4 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Everyday styles', 'Reliable shipping', 'Friendly support'],
    },
    {
      id: 'noi-na-cm',
      name: 'Noi Na',
      location: 'Chiang Mai, Thailand',
      bio: 'Noi Na offers premium curated drops with polished presentation and dependable turnaround.',
      shipping: 'Worldwide from Thailand',
      turnaround: 'Ships in 1-3 days',
      isOnline: false,
      feedVisibility: 'public',
      affiliatedBarId: '',
      languages: ['Thai', 'English'],
      highlights: ['Curated drops', 'Polished listings', 'Consistent fulfillment'],
    },
  ],
  bars: [
    {
      id: 'small-world-chiang-mai',
      name: 'Small World Chiang Mai',
      location: 'Loh Kroh Boxing Stadium, Chiang Mai, Thailand',
      about: 'A nightlife spot based at Loh Kroh Boxing Stadium in Chiang Mai, focused on safe operations and respectful community standards.',
      specials: 'Fight-night specials and live event nights throughout the week.',
      mapEmbedUrl: 'https://www.google.com/maps?q=Loh+Kroh+Boxing+Stadium+Chiang+Mai&output=embed',
      mapLink: 'https://maps.google.com/?q=Loh+Kroh+Boxing+Stadium+Chiang+Mai',
      profileImage: 'https://placehold.co/1200x900/fbcfe8/831843?text=Small+World+Chiang+Mai',
      profileImageName: 'small-world-chiang-mai.jpg',
    },
    {
      id: 'north-lantern-chiang-mai',
      name: 'North Lantern Chiang Mai',
      location: 'Chiang Mai, Thailand',
      about: 'Neighborhood bar with warm staff, live acoustic nights, and reliable local support for partnered sellers.',
      specials: 'Acoustic Thursdays and weekend cocktail flights.',
      mapEmbedUrl: 'https://www.google.com/maps?q=Chiang+Mai+Thailand&output=embed',
      mapLink: 'https://maps.google.com/?q=Chiang+Mai+Thailand',
      profileImage: 'https://placehold.co/1200x900/e0e7ff/3730a3?text=North+Lantern',
      profileImageName: 'north-lantern.jpg',
    },
    {
      id: 'phuket-moon-lounge',
      name: 'Moon Lounge Phuket',
      location: 'Phuket, Thailand',
      about: 'Modern Phuket lounge known for late-night service, event collabs, and clean, organized operations.',
      specials: 'Sunset specials from 17:00-19:00 and Saturday showcases.',
      mapEmbedUrl: 'https://www.google.com/maps?q=Phuket+Thailand&output=embed',
      mapLink: 'https://maps.google.com/?q=Phuket+Thailand',
      profileImage: 'https://placehold.co/1200x900/cffafe/155e75?text=Moon+Lounge',
      profileImageName: 'moon-lounge.jpg',
    },
    {
      id: 'riverlight-social-bkk',
      name: 'Riverlight Social BKK',
      location: 'Bangkok, Thailand',
      about: 'Riverside social bar focused on premium guest experience, clear scheduling, and trusted partner operations.',
      specials: 'Two-for-one mocktails on Tuesdays and rooftop sessions weekly.',
      mapEmbedUrl: 'https://www.google.com/maps?q=Riverside+Bangkok+Thailand&output=embed',
      mapLink: 'https://maps.google.com/?q=Riverside+Bangkok+Thailand',
      profileImage: 'https://placehold.co/1200x900/fef3c7/92400e?text=Riverlight+Social',
      profileImageName: 'riverlight-social.jpg',
    },
  ],
  products: [
    {
      id: 'product-bikini-blush-cotton',
      title: 'Blush Cotton Bikini',
      slug: 'blush-cotton-bikini',
      sellerId: 'nina-b',
      price: 1180,
      size: 'M',
      color: 'Red',
      style: 'Bikini',
      fabric: 'Cotton',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Soft cotton bikini with comfortable daily fit.',
      features: ['Lightweight cotton', 'Breathable', 'Discreet packaging'],
      image: 'https://placehold.co/900x1200/fbcfe8/831843?text=Blush+Cotton+Bikini',
      imageName: 'blush-cotton-bikini.jpg',
      status: 'Published',
      publishedAt: '2026-03-08',
    },
    {
      id: 'product-nina-lace-bra-midnight',
      title: 'Nina Midnight Lace Bra',
      slug: 'nina-midnight-lace-bra',
      sellerId: 'nina-b',
      price: 1590,
      size: '34B',
      color: 'Black',
      style: 'Bra',
      fabric: 'Lace Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Lace bra with soft support and elegant finish.',
      features: ['Lace blend', 'Supportive fit', 'Discreet shipping'],
      image: 'https://placehold.co/900x1200/d4d4d8/111827?text=Nina+Lace+Bra',
      imageName: 'nina-lace-bra.jpg',
      isBundle: false,
      bundleItemIds: [],
      status: 'Published',
      publishedAt: '2026-03-20',
    },
    {
      id: 'product-nina-soft-panty-rose',
      title: 'Nina Soft Rose Panty',
      slug: 'nina-soft-rose-panty',
      sellerId: 'nina-b',
      price: 1210,
      size: 'M',
      color: 'Pink',
      style: 'Briefs',
      fabric: 'Cotton',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Soft everyday panty with stretch comfort.',
      features: ['Comfort fit', 'Cotton feel', 'Discreet packaging'],
      image: 'https://placehold.co/900x1200/fbcfe8/9d174d?text=Nina+Soft+Panty',
      imageName: 'nina-soft-panty.jpg',
      isBundle: false,
      bundleItemIds: [],
      status: 'Published',
      publishedAt: '2026-03-20',
    },
    {
      id: 'product-set-nina-bra-panty-bundle',
      title: 'Nina Bra + Panty Bundle',
      slug: 'nina-bra-panty-bundle',
      sellerId: 'nina-b',
      price: 2590,
      size: 'M',
      color: 'Mixed',
      style: 'Bra and Panty Set',
      fabric: 'Mixed',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Bundle set featuring Nina Midnight Lace Bra and Nina Soft Rose Panty.',
      features: ['2-item bundle', 'Bra + panty set', 'Bundle savings'],
      image: 'https://placehold.co/900x1200/f5d0fe/7e22ce?text=Nina+Bundle+Set',
      imageName: 'nina-bra-panty-bundle.jpg',
      isBundle: true,
      bundleItemIds: ['product-nina-lace-bra-midnight', 'product-nina-soft-panty-rose'],
      status: 'Published',
      publishedAt: '2026-03-20',
    },
    {
      id: 'product-lace-briefs-indigo',
      title: 'Indigo Lace Briefs',
      slug: 'indigo-lace-briefs',
      sellerId: 'mali-k',
      price: 1360,
      size: 'S',
      color: 'Blue',
      style: 'Briefs',
      fabric: 'Lace Blend',
      daysWorn: '4-7 days',
      shipping: 'Worldwide',
      condition: 'Very Good',
      description: 'Elegant lace briefs with a premium finish.',
      features: ['Lace blend', 'Limited style', 'Seller verified'],
      image: 'https://placehold.co/900x1200/c4b5fd/312e81?text=Indigo+Lace+Briefs',
      imageName: 'indigo-lace-briefs.jpg',
      status: 'Published',
      publishedAt: '2026-03-08',
    },
    {
      id: 'product-thong-black-seamless',
      title: 'Seamless Black Thong',
      slug: 'seamless-black-thong',
      sellerId: 'prae-s',
      price: 1025,
      size: 'L',
      color: 'Black',
      style: 'Thong',
      fabric: 'Modal Blend',
      daysWorn: 'Unworn',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Smooth seamless thong with stretch comfort.',
      features: ['Seamless', 'Stretch fit', 'Soft touch'],
      image: 'https://placehold.co/900x1200/d4d4d8/27272a?text=Seamless+Black+Thong',
      imageName: 'seamless-black-thong.jpg',
      status: 'Published',
      publishedAt: '2026-03-08',
    },
    {
      id: 'product-boyshorts-rose',
      title: 'Rose Everyday Boyshorts',
      slug: 'rose-everyday-boyshorts',
      sellerId: 'nina-b',
      price: 1240,
      size: 'M',
      color: 'Red',
      style: 'Boyshorts',
      fabric: 'Cotton',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Everyday boyshorts with soft cotton comfort.',
      features: ['Full coverage', 'Cotton comfort', 'Durable seams'],
      image: 'https://placehold.co/900x1200/fda4af/881337?text=Rose+Boyshorts',
      imageName: 'rose-everyday-boyshorts.jpg',
      status: 'Published',
      publishedAt: '2026-03-08',
    },
    {
      id: 'product-cheeky-brazilian-coral',
      title: 'Coral Cheeky Brazilian',
      slug: 'coral-cheeky-brazilian',
      sellerId: 'mali-k',
      price: 1325,
      size: 'S',
      color: 'Orange',
      style: 'Brazilian',
      fabric: 'Lace Blend',
      daysWorn: '4-7 days',
      shipping: 'Worldwide',
      condition: 'Very Good',
      description: 'Cheeky brazilian cut with lace blend detail.',
      features: ['Brazilian cut', 'Lace detail', 'Premium listing'],
      image: 'https://placehold.co/900x1200/fca5a5/7f1d1d?text=Coral+Cheeky+Brazilian',
      imageName: 'coral-cheeky-brazilian.jpg',
      status: 'Published',
      publishedAt: '2026-03-08',
    },
    {
      id: 'product-premium-bra-ivory-lace',
      title: 'Ivory Lace Balcony Bra',
      slug: 'ivory-lace-balcony-bra',
      sellerId: 'lila-r',
      price: 1490,
      size: '34B',
      color: 'White',
      style: 'Bra',
      fabric: 'Lace Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Luxury balcony bra with soft lace cups and satin trim.',
      features: ['Balcony cut', 'Lace texture', 'Adjustable straps'],
      image: 'https://placehold.co/900x1200/fef3c7/92400e?text=Ivory+Lace+Bra',
      imageName: 'ivory-lace-balcony-bra.jpg',
      status: 'Published',
      publishedAt: '2026-03-08',
    },
    {
      id: 'product-bra-panty-set-sapphire',
      title: 'Sapphire Bra and Panty Set',
      slug: 'sapphire-bra-panty-set',
      sellerId: 'sora-p',
      price: 1890,
      size: 'M',
      color: 'Blue',
      style: 'Bra and Panty Set',
      fabric: 'Microfiber',
      daysWorn: 'Unworn',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Matching set with soft support and stretch brief.',
      features: ['Matching two-piece', 'Soft microfiber', 'Limited release'],
      image: 'https://placehold.co/900x1200/bfdbfe/1e3a8a?text=Sapphire+Set',
      imageName: 'sapphire-bra-panty-set.jpg',
      status: 'Published',
      publishedAt: '2026-03-08',
    },
    {
      id: 'product-pantyhose-charcoal-sheer',
      title: 'Charcoal Sheer Pantyhose',
      slug: 'charcoal-sheer-pantyhose',
      sellerId: 'kiko-n',
      price: 1110,
      size: 'L',
      color: 'Grey',
      style: 'Pantyhose',
      fabric: 'Nylon Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Very Good',
      description: 'Classic sheer pantyhose with smooth finish.',
      features: ['Sheer finish', 'Light compression', 'Daily wear'],
      image: 'https://placehold.co/900x1200/e5e7eb/334155?text=Charcoal+Pantyhose',
      imageName: 'charcoal-sheer-pantyhose.jpg',
      status: 'Published',
      publishedAt: '2026-03-07',
    },
    {
      id: 'product-thighhigh-midnight',
      title: 'Midnight Thigh-High Pantyhose',
      slug: 'midnight-thigh-high-pantyhose',
      sellerId: 'mali-k',
      price: 1275,
      size: 'M',
      color: 'Blue',
      style: 'Thigh-High Pantyhose',
      fabric: 'Nylon Blend',
      daysWorn: '4-7 days',
      shipping: 'Worldwide',
      condition: 'Very Good',
      description: 'Thigh-high hosiery with lace top band.',
      features: ['Thigh-high fit', 'Lace band', 'Elegant style'],
      image: 'https://placehold.co/900x1200/dbeafe/1d4ed8?text=Thigh-High+Pantyhose',
      imageName: 'midnight-thigh-high-pantyhose.jpg',
      status: 'Published',
      publishedAt: '2026-03-07',
    },
    {
      id: 'product-kneehigh-cream-rib',
      title: 'Cream Rib Knee-High Socks',
      slug: 'cream-rib-knee-high-socks',
      sellerId: 'anya-v',
      price: 1035,
      size: 'One Size',
      color: 'White',
      style: 'Knee-High Socks',
      fabric: 'Cotton',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Soft rib-knit knee-high socks for cozy styling.',
      features: ['Rib knit', 'Comfort stretch', 'Cozy feel'],
      image: 'https://placehold.co/900x1200/fef9c3/854d0e?text=Cream+Knee-High+Socks',
      imageName: 'cream-rib-knee-high-socks.jpg',
      status: 'Published',
      publishedAt: '2026-03-06',
    },
    {
      id: 'product-anklesock-neon-mix',
      title: 'Neon Mix Ankle Socks Pack',
      slug: 'neon-mix-ankle-socks-pack',
      sellerId: 'prae-s',
      price: 1065,
      size: 'S',
      color: 'Pink',
      style: 'Ankle Socks',
      fabric: 'Cotton Blend',
      daysWorn: 'Unworn',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Bright ankle socks pack with sporty trim.',
      features: ['Sporty trim', 'Color mix', 'Breathable cotton blend'],
      image: 'https://placehold.co/900x1200/fecdd3/9f1239?text=Ankle+Socks',
      imageName: 'neon-mix-ankle-socks-pack.jpg',
      status: 'Published',
      publishedAt: '2026-03-06',
    },
    {
      id: 'product-skirt-plaid-mini',
      title: 'Plaid Mini Skirt',
      slug: 'plaid-mini-skirt',
      sellerId: 'kiko-n',
      price: 1385,
      size: 'M',
      color: 'Red',
      style: 'Skirt',
      fabric: 'Poly Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'High-waist mini skirt with pleated plaid texture.',
      features: ['Pleated finish', 'High waist', 'Soft lining'],
      image: 'https://placehold.co/900x1200/fca5a5/7f1d1d?text=Plaid+Mini+Skirt',
      imageName: 'plaid-mini-skirt.jpg',
      status: 'Published',
      publishedAt: '2026-03-05',
    },
    {
      id: 'product-dress-satin-slip',
      title: 'Satin Slip Dress',
      slug: 'satin-slip-dress',
      sellerId: 'lila-r',
      price: 1720,
      size: 'S',
      color: 'Tan',
      style: 'Dress',
      fabric: 'Satin',
      daysWorn: 'Unworn',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Light satin slip dress with adjustable straps.',
      features: ['Satin sheen', 'Slim silhouette', 'Adjustable fit'],
      image: 'https://placehold.co/900x1200/fef3c7/78350f?text=Satin+Slip+Dress',
      imageName: 'satin-slip-dress.jpg',
      status: 'Published',
      publishedAt: '2026-03-05',
    },
    {
      id: 'product-top-crop-ribbed',
      title: 'Ribbed Crop Top',
      slug: 'ribbed-crop-top',
      sellerId: 'sora-p',
      price: 1195,
      size: 'XL',
      color: 'Pink',
      style: 'Top',
      fabric: 'Cotton Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Very Good',
      description: 'Stretch ribbed crop top with square neckline.',
      features: ['Square neck', 'Stretch rib', 'Easy layering'],
      image: 'https://placehold.co/900x1200/e9d5ff/581c87?text=Ribbed+Crop+Top',
      imageName: 'ribbed-crop-top.jpg',
      status: 'Published',
      publishedAt: '2026-03-04',
    },
    {
      id: 'product-briefs-forest-soft',
      title: 'Forest Soft Briefs',
      slug: 'forest-soft-briefs',
      sellerId: 'anya-v',
      price: 1215,
      size: 'XS',
      color: 'Green',
      style: 'Briefs',
      fabric: 'Bamboo Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Ultra-soft briefs with flexible waistband.',
      features: ['Bamboo blend', 'Lightweight', 'Comfort waistband'],
      image: 'https://placehold.co/900x1200/bbf7d0/14532d?text=Forest+Briefs',
      imageName: 'forest-soft-briefs.jpg',
      status: 'Published',
      publishedAt: '2026-03-04',
    },
    {
      id: 'product-bikini-graphite-sport',
      title: 'Graphite Sport Bikini',
      slug: 'graphite-sport-bikini',
      sellerId: 'prae-s',
      price: 1295,
      size: 'XXL',
      color: 'Grey',
      style: 'Bikini',
      fabric: 'Modal Blend',
      daysWorn: '4-7 days',
      shipping: 'Worldwide',
      condition: 'Very Good',
      description: 'Sport-cut bikini with breathable stretch feel.',
      features: ['Sport silhouette', 'Breathable modal', 'Smooth seams'],
      image: 'https://placehold.co/900x1200/e2e8f0/0f172a?text=Graphite+Sport+Bikini',
      imageName: 'graphite-sport-bikini.jpg',
      status: 'Published',
      publishedAt: '2026-03-03',
    },
    {
      id: 'product-thong-cherry-lace',
      title: 'Cherry Lace Thong',
      slug: 'cherry-lace-thong',
      sellerId: 'mali-k',
      price: 1460,
      size: 'M',
      color: 'Red',
      style: 'Thong',
      fabric: 'Lace Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Fine lace thong with lightweight stretch.',
      features: ['Fine lace', 'Minimal silhouette', 'Premium feel'],
      image: 'https://placehold.co/900x1200/fecdd3/881337?text=Cherry+Lace+Thong',
      imageName: 'cherry-lace-thong.jpg',
      status: 'Published',
      publishedAt: '2026-03-03',
    },
    {
      id: 'product-mali-bar-night-bodysuit',
      title: 'Mali Bar Night Bodysuit',
      slug: 'mali-bar-night-bodysuit',
      sellerId: 'mali-k',
      price: 1690,
      size: 'M',
      color: 'Black',
      style: 'Bodysuit',
      fabric: 'Lace Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Bar-inspired lace bodysuit styled for Mali K night set photos.',
      features: ['Bar night styling', 'Lace blend', 'Premium fit'],
      image: 'https://placehold.co/900x1200/e5e7eb/111827?text=Mali+Bar+Night+Bodysuit',
      imageName: 'mali-bar-night-bodysuit.jpg',
      isBundle: false,
      bundleItemIds: [],
      status: 'Published',
      publishedAt: '2026-03-03',
    },
    {
      id: 'product-mali-underwear-velvet-brief',
      title: 'Mali Velvet Brief',
      slug: 'mali-velvet-brief',
      sellerId: 'mali-k',
      price: 1320,
      size: 'M',
      color: 'Red',
      style: 'Briefs',
      fabric: 'Modal Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Velvet-tone premium brief from Mali K collection.',
      features: ['Underwear staple', 'Soft modal blend', 'Premium finish'],
      image: 'https://placehold.co/900x1200/fecdd3/881337?text=Mali+Velvet+Brief',
      imageName: 'mali-velvet-brief.jpg',
      isBundle: false,
      bundleItemIds: [],
      status: 'Published',
      publishedAt: '2026-03-03',
    },
    {
      id: 'product-set-mali-night-bundle',
      title: 'Mali Night Bar + Brief Bundle',
      slug: 'mali-night-bar-brief-bundle',
      sellerId: 'mali-k',
      price: 2690,
      size: 'M',
      color: 'Mixed',
      style: 'Custom Set',
      fabric: 'Mixed',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Bundle set featuring Mali Bar Night Bodysuit and Mali Velvet Brief at a combined bundle price.',
      features: ['2-item bundle', 'Bar look + underwear pair', 'Bundle savings'],
      image: 'https://placehold.co/900x1200/fbcfe8/9d174d?text=Mali+Night+Bundle',
      imageName: 'mali-night-bar-brief-bundle.jpg',
      isBundle: true,
      bundleItemIds: ['product-mali-bar-night-bodysuit', 'product-mali-underwear-velvet-brief'],
      status: 'Published',
      publishedAt: '2026-03-03',
    },
    {
      id: 'product-boyshorts-navy-comfort',
      title: 'Navy Comfort Boyshorts',
      slug: 'navy-comfort-boyshorts',
      sellerId: 'nina-b',
      price: 1340,
      size: 'L',
      color: 'Blue',
      style: 'Boyshorts',
      fabric: 'Cotton',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Full-coverage navy boyshorts with everyday comfort.',
      features: ['Full coverage', 'Soft cotton', 'Stretch waistband'],
      image: 'https://placehold.co/900x1200/c7d2fe/312e81?text=Navy+Boyshorts',
      imageName: 'navy-comfort-boyshorts.jpg',
      status: 'Published',
      publishedAt: '2026-03-02',
    },
    {
      id: 'product-bra-wirefree-rose',
      title: 'Rose Wirefree Bra',
      slug: 'rose-wirefree-bra',
      sellerId: 'kiko-n',
      price: 1565,
      size: '38C',
      color: 'Red',
      style: 'Bra',
      fabric: 'Modal Blend',
      daysWorn: 'Unworn',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Wirefree bra with soft support and smooth cups.',
      features: ['Wirefree comfort', 'Smooth cup', 'Light support'],
      image: 'https://placehold.co/900x1200/fbcfe8/9d174d?text=Rose+Wirefree+Bra',
      imageName: 'rose-wirefree-bra.jpg',
      status: 'Published',
      publishedAt: '2026-03-02',
    },
    {
      id: 'product-set-emerald-luxe',
      title: 'Emerald Luxe Set',
      slug: 'emerald-luxe-bra-panty-set',
      sellerId: 'lila-r',
      price: 1980,
      size: 'L',
      color: 'Green',
      style: 'Bra and Panty Set',
      fabric: 'Lace Blend',
      daysWorn: 'Unworn',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Emerald set with structured bra and matching brief.',
      features: ['Two-piece set', 'Emerald tone', 'Premium detailing'],
      image: 'https://placehold.co/900x1200/a7f3d0/065f46?text=Emerald+Luxe+Set',
      imageName: 'emerald-luxe-bra-panty-set.jpg',
      status: 'Published',
      publishedAt: '2026-03-01',
    },
    {
      id: 'product-bodysuit-midnight-mesh',
      title: 'Midnight Mesh Bodysuit',
      slug: 'midnight-mesh-bodysuit',
      sellerId: 'dao-p',
      price: 1725,
      size: 'M',
      color: 'Black',
      style: 'Bodysuit',
      fabric: 'Mesh Blend',
      daysWorn: '1-3 days',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Sheer mesh bodysuit with soft stretch and snap closure.',
      features: ['Sheer mesh', 'Stretch fit', 'Snap closure'],
      image: 'https://placehold.co/900x1200/d4d4d8/111827?text=Midnight+Mesh+Bodysuit',
      imageName: 'midnight-mesh-bodysuit.jpg',
      status: 'Published',
      publishedAt: '2026-03-17',
    },
    {
      id: 'product-cami-satin-champagne',
      title: 'Champagne Satin Cami',
      slug: 'champagne-satin-cami',
      sellerId: 'nina-b',
      price: 1290,
      size: 'S',
      color: 'Beige',
      style: 'Top',
      fabric: 'Satin',
      daysWorn: 'Unworn',
      shipping: 'Worldwide',
      condition: 'Excellent',
      description: 'Light satin cami with adjustable straps and clean neckline.',
      features: ['Satin finish', 'Adjustable straps', 'Minimal silhouette'],
      image: 'https://placehold.co/900x1200/fef3c7/92400e?text=Champagne+Satin+Cami',
      imageName: 'champagne-satin-cami.jpg',
      status: 'Published',
      publishedAt: '2026-03-17',
    },
  ],
  sellerPosts: [
    {
      id: 'post_seed_nina_1',
      sellerId: 'nina-b',
      caption: 'Sunday reset: tea, sunlight, and planning my next listing drop.',
      image: 'https://placehold.co/1200x900/fbcfe8/881337?text=Nina+Feed+Post',
      imageName: 'nina-sunday.jpg',
      createdAt: '2026-03-08T09:30:00.000Z',
      visibility: 'public',
      accessPriceUsd: 1,
    },
    {
      id: 'post_seed_mali_1',
      sellerId: 'mali-k',
      caption: 'Quick studio prep before photos. New lace favorites coming this week.',
      image: 'https://placehold.co/1200x900/dbeafe/1e3a8a?text=Mali+Feed+Post',
      imageName: 'mali-studio.jpg',
      createdAt: '2026-03-08T10:15:00.000Z',
      visibility: 'public',
      accessPriceUsd: 1,
    },
    {
      id: 'post_seed_prae_1',
      sellerId: 'prae-s',
      caption: 'Morning gym + shipping prep. Sporty drops are back in stock.',
      image: 'https://placehold.co/1200x900/e2e8f0/0f172a?text=Prae+Sport+Update',
      imageName: 'prae-sport-update.jpg',
      createdAt: '2026-03-08T11:10:00.000Z',
      visibility: 'public',
      accessPriceUsd: 1,
    },
    {
      id: 'post_seed_lila_private_1',
      sellerId: 'lila-r',
      caption: 'Private behind-the-scenes set styling from tonight\'s shoot.',
      image: 'https://placehold.co/1200x900/fef3c7/92400e?text=Lila+Private+Set',
      imageName: 'lila-private-set.jpg',
      createdAt: '2026-03-08T12:25:00.000Z',
      visibility: 'private',
      accessPriceUsd: 2.5,
    },
    {
      id: 'post_seed_sora_private_1',
      sellerId: 'sora-p',
      caption: 'Private seasonal preview: premium lace capsule before public release.',
      image: 'https://placehold.co/1200x900/bfdbfe/1e3a8a?text=Sora+Private+Preview',
      imageName: 'sora-private-preview.jpg',
      createdAt: '2026-03-08T13:00:00.000Z',
      visibility: 'private',
      accessPriceUsd: 3,
    },
    {
      id: 'post_seed_kiko_1',
      sellerId: 'kiko-n',
      caption: 'Catalog update day: tops, skirts, and fresh hosiery options listed.',
      image: 'https://placehold.co/1200x900/e9d5ff/581c87?text=Kiko+Catalog+Update',
      imageName: 'kiko-catalog-update.jpg',
      createdAt: '2026-03-08T14:20:00.000Z',
      visibility: 'public',
      accessPriceUsd: 1,
    },
    {
      id: 'post_seed_anya_private_1',
      sellerId: 'anya-v',
      caption: 'Private comfort-set diary with custom request samples.',
      image: 'https://placehold.co/1200x900/fecdd3/9f1239?text=Anya+Private+Diary',
      imageName: 'anya-private-diary.jpg',
      createdAt: '2026-03-08T15:05:00.000Z',
      visibility: 'private',
      accessPriceUsd: 1.5,
    },
  ],
  barPosts: [
    {
      id: 'bar_post_seed_1',
      barId: 'small-world-chiang-mai',
      caption: 'Tonight at Small World Chiang Mai: welcome cocktails and live ambient set from 9PM.',
      image: 'https://placehold.co/1200x900/fbcfe8/831843?text=Small+World+Chiang+Mai+Tonight',
      imageName: 'small-world-chiang-mai-tonight.jpg',
      createdAt: '2026-03-09T12:00:00.000Z',
    },
    {
      id: 'bar_post_seed_2',
      barId: 'north-lantern-chiang-mai',
      caption: 'Acoustic Thursday lineup is posted. Come early for happy hour seating.',
      image: 'https://placehold.co/1200x900/e0e7ff/3730a3?text=North+Lantern+Acoustic',
      imageName: 'north-lantern-acoustic.jpg',
      createdAt: '2026-03-09T10:30:00.000Z',
    },
  ],
  postReports: [
    {
      id: 'post_report_seed_qa_1',
      postId: 'post_seed_nina_1',
      targetUserId: 'seller-1',
      contentType: 'post',
      contentId: 'post_seed_nina_1',
      reporterUserId: 'buyer-1',
      reporterRole: 'buyer',
      reason: 'QA seed: resolve this report to test automatic second strike and account freeze flow.',
      status: 'open',
      createdAt: '2026-03-09T08:00:00.000Z',
      resolvedAt: null,
      resolvedByUserId: null,
    },
  ],
  commentReports: [],
  messageReports: [],
  userStrikes: [
    {
      id: 'strike_seed_qa_1',
      userId: 'seller-1',
      sourceType: 'post',
      sourceId: 'post_seed_nina_1',
      reportId: 'post_report_seed_previous_qa',
      reason: 'QA seed: prior moderation strike.',
      status: 'active',
      createdAt: '2026-03-08T08:00:00.000Z',
      appliedByUserId: 'admin-1',
    },
  ],
  userAppeals: [],
  postUnlocks: [],
  sellerPostLikes: [],
  sellerPostComments: [],
  sellerFollows: [],
  barFollows: [],
  productWatches: [],
  sellerSavedPosts: [],
  orders: [],
  walletTransactions: [
    {
      id: 'txn_1',
      userId: 'buyer-1',
      type: 'top_up',
      amount: 25,
      description: 'Stripe wallet top-up',
      createdAt: '2026-03-01T08:00:00.000Z',
    },
  ],
  payoutRuns: [],
  payoutItems: [],
  payoutEvents: [],
  messages: [
    {
      id: 'msg_1',
      conversationId: 'buyer-1__nina-b',
      buyerId: 'buyer-1',
      sellerId: 'nina-b',
      senderId: 'buyer-1',
      senderRole: 'buyer',
      body: 'Hi Nina, is your soft cotton briefs listing still available?',
      feeCharged: MESSAGE_FEE_THB,
      createdAt: '2026-03-06T09:00:00.000Z',
      readByBuyer: true,
      readBySeller: false,
    },
    {
      id: 'msg_2',
      conversationId: 'buyer-1__nina-b',
      buyerId: 'buyer-1',
      sellerId: 'nina-b',
      senderId: 'seller-1',
      senderRole: 'seller',
      body: 'Yes, it is available and ready to ship this week.',
      feeCharged: 0,
      createdAt: '2026-03-06T09:05:00.000Z',
      readByBuyer: false,
      readBySeller: true,
    },
  ],
  notifications: [
    {
      id: 'notif_1',
      userId: 'seller-1',
      type: 'message',
      text: 'New buyer message from Alex T.',
      conversationId: 'buyer-1__nina-b',
      read: false,
      createdAt: '2026-03-06T09:00:01.000Z',
    },
    {
      id: 'notif_2',
      userId: 'buyer-1',
      type: 'message',
      text: 'Nina B. replied to your message.',
      conversationId: 'buyer-1__nina-b',
      read: false,
      createdAt: '2026-03-06T09:05:01.000Z',
    },
  ],
  customRequests: [],
  customRequestMessages: [],
  refundClaims: [],
  orderHelpRequests: [],
  safetyReports: [],
  barAffiliationRequests: [],
  adminInboxReviews: [],
  adminInboxFilterPresets: [],
  adminNotes: [],
  adminDisputeCases: [],
  inactivityNudges: [],
  blocks: [],
  adminActions: [],
  stripeEvents: [],
  emailTemplates: structuredClone(DEFAULT_EMAIL_TEMPLATES),
  emailDeliveryLog: [],
  adminEmailThreads: [],
  adminEmailMessages: [],
};

const SEO_CONFIG = {
  title: 'Thailand Panties | Premium Used Underwear from Thailand',
  description:
    'Thailand Panties is a discreet and professional marketplace for premium used underwear listings from women in Thailand, with trusted messaging and worldwide shipping.',
  keywords: ['Thailand Panties', 'premium used underwear', 'discreet shipping', 'Thailand sellers', 'buyer seller chat'],
  ogImage: '/og-thailand-panties.jpg',
};

const API_BASE_URL_FROM_ENV = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const APP_BASE_URL_FALLBACK = String(import.meta.env.VITE_APP_BASE_URL || 'https://thailandpanties.com').replace(/\/+$/, '');
const IS_PRODUCTION_BUILD = Boolean(import.meta.env.PROD);
const REQUIRE_BACKEND_AUTH = IS_PRODUCTION_BUILD || String(import.meta.env.VITE_REQUIRE_BACKEND_AUTH || 'false') === 'true';
const ENABLE_PROD_DATA_MIGRATION_RESET = String(import.meta.env.VITE_ENABLE_PROD_DATA_MIGRATION_RESET || 'false') === 'true';
const ENABLE_LOGIN_ALIASES = !IS_PRODUCTION_BUILD || String(import.meta.env.VITE_ENABLE_LOGIN_ALIASES || 'false') === 'true';
function resolveApiBaseUrl() {
  const envValue = API_BASE_URL_FROM_ENV;
  if (!IS_PRODUCTION_BUILD) return envValue;

  // Production safety net: if env is missing (or points to localhost), derive the live API host.
  const hasLocalhostEnv = (() => {
    if (!envValue) return false;
    try {
      const parsed = new URL(envValue);
      return ['localhost', '127.0.0.1'].includes(parsed.hostname);
    } catch {
      return /localhost|127\.0\.0\.1/i.test(envValue);
    }
  })();

  if (!envValue || hasLocalhostEnv) {
    const host = typeof window !== 'undefined' ? String(window.location.hostname || '').toLowerCase() : '';
    if (host === 'thailandpanties.com' || host === 'www.thailandpanties.com') {
      return 'https://api.thailandpanties.com';
    }
  }

  return envValue;
}
const API_BASE_URL = resolveApiBaseUrl();
const STYLE_SCHEMA = `enum<${STYLE_OPTIONS.join('|')}>`;
const DB_STORAGE_VERSION = '2026-03-11-seller-feed-v1';
const APP_MODE_STORAGE_KEY = 'tlm-app-mode';
const SHIPPING_ZONES = {
  zone1: { label: 'Asia', countries: ['SG','MY','ID','PH','VN','CN','JP','KR','HK','TW','LA','KH','MM','BN','TH'], standard: { rate: 824, label: 'Standard Shipping (EMS)', days: '3–7 business days' }, express: { rate: 1442, label: 'Express Shipping (DHL/FedEx)', days: '2–3 business days' } },
  zone2: { label: 'Oceania & South Asia', countries: ['AU','NZ','IN','BD','LK','PK','NP'], standard: { rate: 1133, label: 'Standard Shipping (EMS)', days: '7–14 business days' }, express: { rate: 2060, label: 'Express Shipping (DHL/FedEx)', days: '3–5 business days' } },
  zone3: { label: 'USA, Europe & Rest of World', countries: ['*'], standard: { rate: 1285, label: 'Standard Shipping (EMS)', days: '7–14 business days' }, express: { rate: 2369, label: 'Express Shipping (DHL/FedEx)', days: '3–5 business days' } },
};
const SHIPPING_BAR_REIMBURSEMENT = { zone1: 400, zone2: 500, zone3: 600 };

const ISO_COUNTRIES = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' }, { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' }, { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (DRC)' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' }, { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' }, { code: 'SZ', name: 'Eswatini' },
  { code: 'ET', name: 'Ethiopia' }, { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' }, { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' }, { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' }, { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haiti' }, { code: 'HN', name: 'Honduras' }, { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' }, { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' }, { code: 'JP', name: 'Japan' }, { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' }, { code: 'KI', name: 'Kiribati' },
  { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' }, { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' }, { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' }, { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' }, { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' }, { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' }, { code: 'KP', name: 'North Korea' }, { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' }, { code: 'PS', name: 'Palestine' }, { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' }, { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' }, { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' }, { code: 'KR', name: 'South Korea' },
  { code: 'SS', name: 'South Sudan' }, { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' },
  { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' }, { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }, { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' }, { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' },
  { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' }, { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' }, { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
];
const ISO_COUNTRY_MAP = Object.fromEntries(ISO_COUNTRIES.map((c) => [c.code, c.name]));

const NEXTJS_EXPORT_BLUEPRINT = {
  app: [
    'layout.tsx',
    'page.tsx',
    'account/page.tsx',
    'checkout/page.tsx',
    'checkout/success/page.tsx',
    'seller/[id]/page.tsx',
    'product/[slug]/page.tsx',
    'find/page.tsx',
    'seller-portfolios/page.tsx',
    'faq/page.tsx',
    'contact/page.tsx',
    'privacy-policy/page.tsx',
    'terms/page.tsx',
    'shipping-policy/page.tsx',
    'refund-policy/page.tsx',
    'community-standards/page.tsx',
    'api/stripe/create-checkout-session/route.ts',
    'api/stripe/webhook/route.ts',
    'api/account/route.ts',
    'api/orders/route.ts',
  ],
  lib: ['db.ts', 'auth.ts', 'stripe.ts', 'seo.ts'],
  components: ['site-header.tsx', 'site-footer.tsx', 'product-card.tsx', 'account-dashboard.tsx'],
  prisma: ['schema.prisma'],
  public: ['logo-placeholder.svg', 'og-thailand-panties.jpg'],
  env: ['DATABASE_URL', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
};

const CMS_SCHEMA = {
  Product: {
    id: 'string',
    title: 'string',
    slug: 'string',
    sellerId: 'relation<Seller>',
    price: 'number',
    size: 'enum<S|M|L>',
    color: 'string',
    style: STYLE_SCHEMA,
    fabric: 'string',
    daysWorn: 'enum<Unworn|1-3 days|4-7 days|8+ days>',
    waistRise: 'enum<Low-rise|Mid-rise|High-rise>',
    coverage: 'enum<Minimal|Moderate|Full>',
    scentLevel: 'enum<Light|Medium|Strong>',
    shipping: 'string',
    condition: 'enum<Excellent|Very Good|Good>',
    description: 'text',
    features: 'string[]',
    image: 'asset',
    imageName: 'string',
    status: 'enum<Draft|Published|Sold>',
    publishedAt: 'date',
  },
  Seller: {
    id: 'string',
    name: 'string',
    location: 'string',
    bio: 'text',
    shipping: 'string',
    turnaround: 'string',
    feedVisibility: 'enum<public|private|per-post>',
    languages: 'string[]',
    highlights: 'string[]',
  },
  Order: {
    id: 'string',
    items: 'Product[]',
    buyerEmail: 'string',
    buyerUserId: 'relation<User>',
    total: 'number',
    stripeSessionId: 'string',
    paymentStatus: 'enum<pending|paid>',
    fulfillmentStatus: 'enum<processing|shipped|delivered>',
    trackingNumber: 'string',
    createdAt: 'datetime',
  },
  Message: {
    id: 'string',
    conversationId: 'string',
    buyerId: 'relation<User>',
    sellerId: 'relation<Seller>',
    senderId: 'relation<User>',
    senderRole: 'enum<buyer|seller>',
    body: 'text',
    feeCharged: 'number',
    createdAt: 'datetime',
  },
  Notification: {
    id: 'string',
    userId: 'relation<User>',
    type: 'enum<message|engagement>',
    text: 'string',
    conversationId: 'string',
    read: 'boolean',
    createdAt: 'datetime',
  },
  CustomRequest: {
    id: 'string',
    buyerUserId: 'relation<User>',
    sellerId: 'relation<Seller>',
    buyerName: 'string',
    buyerEmail: 'string',
    preferredDetails: 'string',
    shippingCountry: 'string',
    requestBody: 'text',
    status: 'enum<open|reviewing|fulfilled|closed>',
    quotedPriceThb: 'number',
    quoteStatus: 'enum<none|proposed|countered|accepted|declined>',
    quoteMessage: 'string',
    quoteUpdatedAt: 'datetime',
    quoteUpdatedByUserId: 'relation<User>',
    quoteAcceptedAt: 'datetime',
    buyerCounterPriceThb: 'number',
    quoteAwaitingBuyerPayment: 'boolean',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  CustomRequestMessage: {
    id: 'string',
    requestId: 'relation<CustomRequest>',
    senderUserId: 'relation<User>',
    senderRole: 'enum<buyer|seller>',
    body: 'text',
    feeCharged: 'number',
    createdAt: 'datetime',
  },
  SafetyReport: {
    id: 'string',
    userId: 'relation<User>',
    name: 'string',
    email: 'string',
    reportType: 'enum<harassment|abusive_language|scam|off_platform_payment|other>',
    targetHandle: 'string',
    contextDetails: 'text',
    status: 'enum<submitted|in_review|resolved>',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  WalletTransaction: {
    id: 'string',
    userId: 'relation<User>',
    type: 'enum<top_up|order_payment|message_fee|post_unlock|order_sale_earning|order_bar_commission|order_platform_commission|custom_request_refund|custom_request_reversal>',
    amount: 'number',
    description: 'string',
    createdAt: 'datetime',
  },
  PayoutRun: {
    id: 'string',
    schedule: 'enum<monthly>',
    periodLabel: 'string',
    periodStart: 'datetime',
    periodEnd: 'datetime',
    holdUntil: 'datetime',
    status: 'enum<draft|processing|completed|cancelled>',
    createdByUserId: 'relation<User>',
    createdAt: 'datetime',
    completedAt: 'datetime',
    notes: 'text',
  },
  PayoutItem: {
    id: 'string',
    runId: 'relation<PayoutRun>',
    recipientUserId: 'relation<User>',
    recipientRole: 'enum<seller|bar>',
    currency: 'enum<THB>',
    grossEligible: 'number',
    threshold: 'number',
    netPayable: 'number',
    status: 'enum<ready|sent|failed|skipped_below_threshold>',
    method: 'enum<bank_transfer|promptpay|other>',
    externalReference: 'string',
    paidAt: 'datetime',
    paidByUserId: 'relation<User>',
    notes: 'text',
    sourceTxIds: 'string[]',
    createdAt: 'datetime',
  },
  PayoutEvent: {
    id: 'string',
    payoutItemId: 'relation<PayoutItem>',
    eventType: 'enum<created|marked_sent|marked_failed|note_added>',
    actorUserId: 'relation<User>',
    createdAt: 'datetime',
    payload: 'json',
  },
  OrderHelpRequest: {
    id: 'string',
    userId: 'relation<User>',
    name: 'string',
    email: 'string',
    orderId: 'string',
    issueType: 'enum<tracking|address|delivery|billing|other>',
    message: 'text',
    status: 'enum<submitted|in_review|resolved>',
    createdAt: 'datetime',
    updatedAt: 'datetime',
  },
  SellerPostLike: {
    id: 'string',
    postId: 'relation<SellerPost>',
    userId: 'relation<User>',
    userRole: 'enum<buyer|seller|admin>',
    createdAt: 'datetime',
  },
  SellerPostComment: {
    id: 'string',
    postId: 'relation<SellerPost>',
    senderUserId: 'relation<User>',
    senderRole: 'enum<buyer|seller|admin>',
    body: 'text',
    createdAt: 'datetime',
  },
  SellerFollow: {
    id: 'string',
    sellerId: 'relation<Seller>',
    followerUserId: 'relation<User>',
    followerRole: 'enum<buyer>',
    createdAt: 'datetime',
  },
  SellerSavedPost: {
    id: 'string',
    postId: 'relation<SellerPost>',
    userId: 'relation<User>',
    createdAt: 'datetime',
  },
  User: {
    id: 'string',
    name: 'string',
    email: 'string',
    phone: 'string',
    country: 'string',
    city: 'string',
    address: 'string',
    postalCode: 'string',
    height: 'string',
    weight: 'string',
    braSize: 'string',
    pantySize: 'string',
    interests: 'text',
    hobbies: 'text',
    walletBalance: 'number',
    role: 'enum<buyer|seller|bar|admin>',
  },
};

function readStore(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeCheckoutStep(value) {
  const numeric = Number(value);
  return [1, 2, 3].includes(numeric) ? numeric : 1;
}

function normalizeCheckoutFormDraft(value) {
  const draft = value && typeof value === 'object' ? value : {};
  return {
    fullName: String(draft.fullName || ''),
    country: String(draft.country || ''),
    address: String(draft.address || ''),
    city: String(draft.city || ''),
    region: String(draft.region || ''),
    postalCode: String(draft.postalCode || ''),
    shippingMethod: draft.shippingMethod === 'express' ? 'express' : 'standard',
    saveAddressToProfile: draft.saveAddressToProfile !== false,
  };
}

const SUPPORTED_AUTH_LANGUAGES = ['en', 'th', 'my', 'ru'];
const DEFAULT_PROMPTPAY_RECEIVER_MOBILE = '0812345678';
const DASHBOARD_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'th', label: 'Thai' },
  { value: 'my', label: 'Burmese' },
  { value: 'ru', label: 'Russian' },
];
const BAR_TRACKING_CARRIER_OPTIONS = ['Not set', 'Thailand Post / EMS', 'DHL', 'FedEx', 'UPS', 'USPS', 'Kerry Express', 'Flash Express', 'J&T Express', 'Other'];

function normalizeAuthLanguage(language) {
  return SUPPORTED_AUTH_LANGUAGES.includes(language) ? language : 'en';
}

function resolveLocalizedText(baseText, translationsByLang, targetLang) {
  const fallback = String(baseText || '');
  if (!SUPPORTED_AUTH_LANGUAGES.includes(targetLang)) return fallback;
  const translated = translationsByLang?.[targetLang];
  if (typeof translated === 'string' && translated.trim()) return translated;
  return fallback;
}

function normalizeEmailTemplates(templates) {
  const byKey = new Map();
  (Array.isArray(templates) ? templates : []).forEach((template) => {
    if (!template?.key || !EMAIL_TEMPLATE_KEYS.has(template.key)) return;
    byKey.set(template.key, {
      ...template,
      enabled: template.enabled !== false,
      subject: String(template.subject || ''),
      body: String(template.body || ''),
      ctaLabel: String(template.ctaLabel || ''),
      ctaPath: String(template.ctaPath || '/account'),
    });
  });
  return DEFAULT_EMAIL_TEMPLATES.map((template) => ({
    ...template,
    ...(byKey.get(template.key) || {}),
  }));
}

function normalizeMessageTranslations(translations, fallbackBody = '') {
  const base = String(fallbackBody || '');
  const normalized = {};
  if (translations && typeof translations === 'object') {
    SUPPORTED_AUTH_LANGUAGES.forEach((lang) => {
      if (typeof translations[lang] === 'string' && translations[lang].trim()) {
        normalized[lang] = String(translations[lang]);
      }
    });
  }
  if (!normalized.en) {
    normalized.en = base;
  }
  return normalized;
}

function normalizeLocalizedMap(translations, fallbackText = '') {
  const normalized = {};
  if (translations && typeof translations === 'object') {
    SUPPORTED_AUTH_LANGUAGES.forEach((lang) => {
      if (typeof translations[lang] === 'string' && translations[lang].trim()) {
        normalized[lang] = String(translations[lang]);
      }
    });
  }
  const fallback = String(fallbackText || '').trim();
  if (fallback && !normalized.en) {
    normalized.en = fallback;
  }
  return normalized;
}

function normalizeCustomRequestImageAttachments(imageAttachments) {
  if (!Array.isArray(imageAttachments)) return [];
  return imageAttachments
    .map((item, index) => {
      const image = String(item?.image || '');
      if (!image) return null;
      return {
        id: String(item?.id || `custom_request_img_${Date.now()}_${index}`),
        image,
        imageName: String(item?.imageName || 'attachment.jpg'),
        uploadedByUserId: String(item?.uploadedByUserId || ''),
        uploadedByRole: ['buyer', 'seller', 'admin'].includes(item?.uploadedByRole) ? item.uploadedByRole : 'buyer',
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeNotificationPreferences(preferences, role = '') {
  const pushDefaultEnabled = false;
  const base = {
    message: preferences?.message !== false,
    engagement: preferences?.engagement !== false,
  };
  const push = {
    message: typeof preferences?.push?.message === 'boolean' ? preferences.push.message : pushDefaultEnabled,
    engagement: typeof preferences?.push?.engagement === 'boolean' ? preferences.push.engagement : pushDefaultEnabled,
  };
  if (role === 'admin') {
    push.adminOps = typeof preferences?.push?.adminOps === 'boolean' ? preferences.push.adminOps : false;
  }
  return {
    ...base,
    push,
  };
}

function normalizeSiteSettings(siteSettings) {
  const nextMobile = String(siteSettings?.promptPayReceiverMobile || '').trim();
  return {
    promptPayReceiverMobile: nextMobile || DEFAULT_PROMPTPAY_RECEIVER_MOBILE,
  };
}

const DEMO_USER_IDS_TO_REMOVE = new Set([
  'seller-1',
  'seller-2',
  'seller-3',
  'seller-4',
  'seller-5',
  'seller-6',
  'seller-7',
  'seller-8',
  'seller-9',
  'seller-10',
  'seller-11',
  'buyer-1',
  'buyer-2',
  'bar-1',
]);
const DEMO_SELLER_IDS_TO_REMOVE = new Set([
  'nina-b',
  'mali-k',
  'prae-s',
  'lila-r',
  'anya-v',
  'sora-p',
  'kiko-n',
  'dao-p',
  'lina-cm',
  'try-cm',
  'noi-na-cm',
]);
const DEMO_BAR_IDS_TO_REMOVE = new Set([
  'north-lantern-chiang-mai',
  'phuket-moon-lounge',
  'riverlight-social-bkk',
  'small-world-chiang-mai',
]);

/** Live-only: hide QA / manual test bar rows by display name (not in DEMO_BAR_IDS — different ids from registration). */
const LIVE_JUNK_BAR_NAME_SNIPPETS = [
  'bangkok lounge',
  'bangkok loung',
  'bar email test',
  'bar email check',
];

function isLiveJunkBarRecord(bar) {
  const name = String(bar?.name || '').trim().toLowerCase();
  if (!name) return false;
  return LIVE_JUNK_BAR_NAME_SNIPPETS.some((snip) => name.includes(snip));
}

/** Strip junk bars in live mode (bootstrap merge bypasses normalizeDbState — must re-apply here). */
function filterLiveJunkBarsForMode(bars, modeValue) {
  return normalizeAppMode(modeValue) === 'live'
    ? (bars || []).filter((bar) => !isLiveJunkBarRecord(bar))
    : (bars || []);
}
const REQUIRED_SYSTEM_USER_IDS = new Set(['admin-2', 'buyer-1', 'seller-1', 'bar-1']);
const REQUIRED_SELLER_IDS = new Set(['nina-b']);
const REQUIRED_BAR_IDS = new Set(['small-world-chiang-mai']);
const REQUIRED_PRODUCT_IDS = new Set([
  'product-nina-lace-bra-midnight',
  'product-nina-soft-panty-rose',
  'product-set-nina-bra-panty-bundle',
]);

function normalizeAppMode(modeValue) {
  return String(modeValue || '').trim().toLowerCase() === 'test' ? 'test' : 'live';
}

function pruneDemoMarketplaceData(dbState) {
  if (!dbState || typeof dbState !== 'object') return dbState;
  const users = Array.isArray(dbState.users)
    ? dbState.users.filter((user) => !DEMO_USER_IDS_TO_REMOVE.has(String(user?.id || '')))
    : [];
  const userIds = new Set(users.map((user) => String(user?.id || '')));
  const sellers = Array.isArray(dbState.sellers)
    ? dbState.sellers.filter((seller) => !DEMO_SELLER_IDS_TO_REMOVE.has(String(seller?.id || '')))
    : [];
  const sellerIds = new Set(sellers.map((seller) => String(seller?.id || '')));
  const bars = Array.isArray(dbState.bars)
    ? dbState.bars.filter((bar) => !DEMO_BAR_IDS_TO_REMOVE.has(String(bar?.id || '')))
    : [];
  const barIds = new Set(bars.map((bar) => String(bar?.id || '')));
  const hasUser = (id) => userIds.has(String(id || ''));
  const hasSeller = (id) => sellerIds.has(String(id || ''));
  const hasBar = (id) => barIds.has(String(id || ''));

  const products = Array.isArray(dbState.products)
    ? dbState.products.filter((product) => hasSeller(product?.sellerId))
    : [];
  const productIds = new Set(products.map((product) => String(product?.id || '')));
  const sellerPosts = Array.isArray(dbState.sellerPosts)
    ? dbState.sellerPosts.filter((post) => hasSeller(post?.sellerId))
    : [];
  const sellerPostIds = new Set(sellerPosts.map((post) => String(post?.id || '')));

  const customRequests = Array.isArray(dbState.customRequests)
    ? dbState.customRequests.filter((request) => hasUser(request?.buyerId) && hasSeller(request?.sellerId))
    : [];
  const customRequestIds = new Set(customRequests.map((request) => String(request?.id || '')));

  return {
    ...dbState,
    users,
    sellers,
    bars,
    products,
    sellerPosts,
    barPosts: Array.isArray(dbState.barPosts) ? dbState.barPosts.filter((post) => hasBar(post?.barId)) : [],
    postReports: Array.isArray(dbState.postReports)
      ? dbState.postReports.filter((report) => hasUser(report?.targetUserId) && hasUser(report?.reporterUserId) && sellerPostIds.has(String(report?.postId || report?.contentId || '')))
      : [],
    commentReports: Array.isArray(dbState.commentReports)
      ? dbState.commentReports.filter((report) => hasUser(report?.targetUserId) && hasUser(report?.reporterUserId))
      : [],
    messageReports: Array.isArray(dbState.messageReports)
      ? dbState.messageReports.filter((report) => hasUser(report?.targetUserId) && hasUser(report?.reporterUserId))
      : [],
    userStrikes: Array.isArray(dbState.userStrikes) ? dbState.userStrikes.filter((strike) => hasUser(strike?.userId)) : [],
    userAppeals: Array.isArray(dbState.userAppeals) ? dbState.userAppeals.filter((appeal) => hasUser(appeal?.userId)) : [],
    sellerPostLikes: Array.isArray(dbState.sellerPostLikes)
      ? dbState.sellerPostLikes.filter((entry) => hasUser(entry?.userId) && sellerPostIds.has(String(entry?.postId || '')))
      : [],
    sellerPostComments: Array.isArray(dbState.sellerPostComments)
      ? dbState.sellerPostComments.filter((entry) => hasUser(entry?.senderUserId || entry?.userId) && sellerPostIds.has(String(entry?.postId || '')))
      : [],
    sellerFollows: Array.isArray(dbState.sellerFollows)
      ? dbState.sellerFollows.filter((entry) => hasUser(entry?.followerUserId || entry?.userId) && hasSeller(entry?.sellerId))
      : [],
    barFollows: Array.isArray(dbState.barFollows)
      ? dbState.barFollows.filter((entry) => hasUser(entry?.followerUserId || entry?.userId) && hasBar(entry?.barId))
      : [],
    productWatches: Array.isArray(dbState.productWatches)
      ? dbState.productWatches.filter((entry) => hasUser(entry?.userId) && productIds.has(String(entry?.productId || '')))
      : [],
    sellerSavedPosts: Array.isArray(dbState.sellerSavedPosts)
      ? dbState.sellerSavedPosts.filter((entry) => hasUser(entry?.userId) && sellerPostIds.has(String(entry?.postId || '')))
      : [],
    orders: Array.isArray(dbState.orders)
      ? dbState.orders.filter((order) => hasUser(order?.buyerId))
      : [],
    walletTransactions: Array.isArray(dbState.walletTransactions)
      ? dbState.walletTransactions.filter((txn) => hasUser(txn?.userId))
      : [],
    messages: Array.isArray(dbState.messages)
      ? dbState.messages.filter((message) => (
          hasUser(message?.senderId)
          && (!message?.buyerId || hasUser(message?.buyerId))
          && (!message?.sellerId || hasSeller(message?.sellerId))
          && (!message?.barId || hasBar(message?.barId))
        ))
      : [],
    notifications: Array.isArray(dbState.notifications)
      ? dbState.notifications.filter((notification) => hasUser(notification?.userId))
      : [],
    customRequests,
    customRequestMessages: Array.isArray(dbState.customRequestMessages)
      ? dbState.customRequestMessages.filter((message) => (
          hasUser(message?.senderId)
          && (!message?.buyerId || hasUser(message?.buyerId))
          && (!message?.sellerId || hasSeller(message?.sellerId))
          && (!message?.requestId || customRequestIds.has(String(message?.requestId || '')))
        ))
      : [],
    refundClaims: Array.isArray(dbState.refundClaims)
      ? dbState.refundClaims.filter((claim) => hasUser(claim?.buyerId))
      : [],
    orderHelpRequests: Array.isArray(dbState.orderHelpRequests)
      ? dbState.orderHelpRequests.filter((request) => hasUser(request?.buyerId))
      : [],
    safetyReports: Array.isArray(dbState.safetyReports)
      ? dbState.safetyReports.filter((report) => hasUser(report?.reporterUserId))
      : [],
    barAffiliationRequests: Array.isArray(dbState.barAffiliationRequests)
      ? dbState.barAffiliationRequests.filter((request) => hasSeller(request?.sellerId) && hasBar(request?.barId))
      : [],
    blocks: Array.isArray(dbState.blocks)
      ? dbState.blocks.filter((entry) => hasUser(entry?.blockedUserId) && hasUser(entry?.blockedByUserId))
      : [],
  };
}
const CLEAN_SEED_DB = pruneDemoMarketplaceData(SEED_DB);
const OFFICIAL_TEST_MODE_DB = {
  ...structuredClone(CLEAN_SEED_DB),
  users: (CLEAN_SEED_DB.users || []).filter((user) => REQUIRED_SYSTEM_USER_IDS.has(String(user?.id || ''))),
  sellers: (CLEAN_SEED_DB.sellers || []).filter((seller) => REQUIRED_SELLER_IDS.has(String(seller?.id || ''))),
  bars: (CLEAN_SEED_DB.bars || []).filter((bar) => REQUIRED_BAR_IDS.has(String(bar?.id || ''))),
  products: (CLEAN_SEED_DB.products || []).filter((product) => REQUIRED_PRODUCT_IDS.has(String(product?.id || ''))),
  sellerPosts: [],
  barPosts: [],
  postReports: [],
  commentReports: [],
  messageReports: [],
  userStrikes: [],
  userAppeals: [],
  sellerPostLikes: [],
  sellerPostComments: [],
  sellerFollows: [],
  barFollows: [],
  productWatches: [],
  sellerSavedPosts: [],
  orders: [],
  walletTransactions: [],
  messages: [],
  notifications: [],
  customRequests: [],
  customRequestMessages: [],
  refundClaims: [],
  orderHelpRequests: [],
  safetyReports: [],
  barAffiliationRequests: [],
  blocks: [],
  adminInboxReviews: [],
  adminInboxFilterPresets: [],
  adminNotes: [],
  adminDisputeCases: [],
  adminActions: [],
  adminEmailThreads: [],
  adminEmailMessages: [],
  payoutRuns: [],
  payoutItems: [],
  payoutEvents: [],
};

function normalizeDbState(nextDb, mode = 'live') {
  const isLive = mode === 'live';
  if (!nextDb || typeof nextDb !== 'object') {
    if (isLive) {
      const scaffold = structuredClone(CLEAN_SEED_DB);
      Object.keys(scaffold).forEach((key) => { if (Array.isArray(scaffold[key])) scaffold[key] = []; });
      return scaffold;
    }
    return structuredClone(CLEAN_SEED_DB);
  }

  const base = isLive
    ? (() => { const s = structuredClone(CLEAN_SEED_DB); Object.keys(s).forEach((k) => { if (Array.isArray(s[k])) s[k] = []; }); return s; })()
    : structuredClone(CLEAN_SEED_DB);
  const normalized = {
    ...base,
    ...nextDb,
    users: Array.isArray(nextDb.users)
      ? (() => {
          const normalizedUsers = nextDb.users
            .filter((user) => !DEMO_USER_IDS_TO_REMOVE.has(String(user?.id || '')))
            .map((user) => ({
              ...user,
              postalCode: String(user?.postalCode || ''),
              region: String(user?.region || ''),
              strikeCount: Math.max(0, Number(user?.strikeCount || 0)),
              timeFormat: normalizeTimeFormat(user?.timeFormat),
              notificationPreferences: normalizeNotificationPreferences(user?.notificationPreferences, user?.role),
            }));
          if (isLive) return normalizedUsers;
          const existingIds = new Set(normalizedUsers.map((user) => String(user?.id || '')));
          const requiredUsers = (CLEAN_SEED_DB.users || [])
            .filter((user) => REQUIRED_SYSTEM_USER_IDS.has(String(user?.id || '')) && !existingIds.has(String(user?.id || '')))
            .map((user) => ({
              ...user,
              postalCode: String(user?.postalCode || ''),
              region: String(user?.region || ''),
              strikeCount: Math.max(0, Number(user?.strikeCount || 0)),
              timeFormat: normalizeTimeFormat(user?.timeFormat),
              notificationPreferences: normalizeNotificationPreferences(user?.notificationPreferences, user?.role),
            }));
          return [...normalizedUsers, ...requiredUsers];
        })()
      : isLive ? [] : structuredClone(CLEAN_SEED_DB.users),
    sellers: Array.isArray(nextDb.sellers)
      ? (() => {
          const normalizedSellers = nextDb.sellers.map((seller) => ({
            ...seller,
            isOnline: Boolean(seller?.isOnline),
            feedVisibility: ['public', 'private', 'per-post'].includes(seller?.feedVisibility) ? seller.feedVisibility : 'public',
            affiliatedBarId: String(seller?.affiliatedBarId || '').trim(),
            birthDay: seller?.birthDay || null,
            birthMonth: seller?.birthMonth || null,
            locationI18n: normalizeLocalizedMap(seller?.locationI18n, seller?.location),
            shippingI18n: normalizeLocalizedMap(seller?.shippingI18n, seller?.shipping),
            turnaroundI18n: normalizeLocalizedMap(seller?.turnaroundI18n, seller?.turnaround),
            bioI18n: normalizeLocalizedMap(seller?.bioI18n, seller?.bio),
          }));
          if (isLive) return normalizedSellers;
          const existingSellerIds = new Set(normalizedSellers.map((seller) => String(seller?.id || '')));
          const requiredSellers = (CLEAN_SEED_DB.sellers || [])
            .filter((seller) => REQUIRED_SELLER_IDS.has(String(seller?.id || '')) && !existingSellerIds.has(String(seller?.id || '')))
            .map((seller) => ({
              ...seller,
              isOnline: Boolean(seller?.isOnline),
              feedVisibility: ['public', 'private', 'per-post'].includes(seller?.feedVisibility) ? seller.feedVisibility : 'public',
              affiliatedBarId: String(seller?.affiliatedBarId || '').trim(),
              birthDay: seller?.birthDay || null,
              birthMonth: seller?.birthMonth || null,
              locationI18n: normalizeLocalizedMap(seller?.locationI18n, seller?.location),
              specialtyI18n: normalizeLocalizedMap(seller?.specialtyI18n, seller?.specialty),
              shippingI18n: normalizeLocalizedMap(seller?.shippingI18n, seller?.shipping),
              turnaroundI18n: normalizeLocalizedMap(seller?.turnaroundI18n, seller?.turnaround),
              bioI18n: normalizeLocalizedMap(seller?.bioI18n, seller?.bio),
            }));
          return [...normalizedSellers, ...requiredSellers];
        })()
      : isLive ? [] : structuredClone(CLEAN_SEED_DB.sellers),
    bars: Array.isArray(nextDb.bars)
      ? (() => {
          const normalizedBars = nextDb.bars.map((bar) => ({
            ...bar,
            aboutI18n: normalizeLocalizedMap(bar?.aboutI18n, bar?.about),
            specialsI18n: normalizeLocalizedMap(bar?.specialsI18n, bar?.specials),
          }));
          const afterJunkFilter = filterLiveJunkBarsForMode(normalizedBars, mode);
          if (isLive) return afterJunkFilter;
          const existingBarIds = new Set(afterJunkFilter.map((bar) => String(bar?.id || '')));
          const requiredBars = (CLEAN_SEED_DB.bars || [])
            .filter((bar) => REQUIRED_BAR_IDS.has(String(bar?.id || '')) && !existingBarIds.has(String(bar?.id || '')))
            .map((bar) => ({
              ...bar,
              aboutI18n: normalizeLocalizedMap(bar?.aboutI18n, bar?.about),
              specialsI18n: normalizeLocalizedMap(bar?.specialsI18n, bar?.specials),
            }));
          return [...afterJunkFilter, ...requiredBars];
        })()
      : isLive ? [] : structuredClone(CLEAN_SEED_DB.bars || []),
    barPosts: Array.isArray(nextDb.barPosts) ? nextDb.barPosts : isLive ? [] : structuredClone(CLEAN_SEED_DB.barPosts || []),
    products: Array.isArray(nextDb.products)
      ? (() => {
          const normalizedProducts = nextDb.products.map((product) => ({
            ...product,
            price: Math.max(MIN_SELLER_PRICE_THB, Number(product?.price ?? product?.priceTHB ?? MIN_SELLER_PRICE_THB)),
            daysWorn: normalizeProductDaysWornValue(product?.daysWorn),
          }));
          if (isLive) return normalizedProducts;
          const existingProductIds = new Set(normalizedProducts.map((product) => String(product?.id || '')));
          const requiredProducts = (CLEAN_SEED_DB.products || [])
            .filter((product) => REQUIRED_PRODUCT_IDS.has(String(product?.id || '')) && !existingProductIds.has(String(product?.id || '')))
            .map((product) => ({
              ...product,
              price: Math.max(MIN_SELLER_PRICE_THB, Number(product?.price ?? product?.priceTHB ?? MIN_SELLER_PRICE_THB)),
              daysWorn: normalizeProductDaysWornValue(product?.daysWorn),
            }));
          return [...normalizedProducts, ...requiredProducts];
        })()
      : isLive ? [] : structuredClone(CLEAN_SEED_DB.products),
    sellerPosts: Array.isArray(nextDb.sellerPosts)
      ? nextDb.sellerPosts.map((post) => ({
          ...post,
          visibility: post?.visibility === 'private' ? 'private' : 'public',
          accessPriceUsd: Math.max(MIN_FEED_UNLOCK_PRICE_THB, Number(post?.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB)),
          scheduledFor: typeof post?.scheduledFor === 'string' ? post.scheduledFor : '',
        }))
      : isLive ? [] : structuredClone(CLEAN_SEED_DB.sellerPosts),
    postReports: Array.isArray(nextDb.postReports) ? nextDb.postReports : [],
    commentReports: Array.isArray(nextDb.commentReports) ? nextDb.commentReports : [],
    messageReports: Array.isArray(nextDb.messageReports) ? nextDb.messageReports : [],
    userStrikes: Array.isArray(nextDb.userStrikes) ? nextDb.userStrikes : [],
    userAppeals: Array.isArray(nextDb.userAppeals) ? nextDb.userAppeals : [],
    postUnlocks: Array.isArray(nextDb.postUnlocks) ? nextDb.postUnlocks : [],
    sellerPostLikes: Array.isArray(nextDb.sellerPostLikes) ? nextDb.sellerPostLikes : [],
    sellerPostComments: Array.isArray(nextDb.sellerPostComments) ? nextDb.sellerPostComments : [],
    sellerFollows: Array.isArray(nextDb.sellerFollows) ? nextDb.sellerFollows : [],
    barFollows: Array.isArray(nextDb.barFollows) ? nextDb.barFollows : [],
    productWatches: Array.isArray(nextDb.productWatches) ? nextDb.productWatches : [],
    sellerSavedPosts: Array.isArray(nextDb.sellerSavedPosts)
      ? nextDb.sellerSavedPosts
        .map((entry) => ({
          ...entry,
          feedType: entry?.feedType === 'bar' ? 'bar' : 'seller',
        }))
      : [],
    customRequests: Array.isArray(nextDb.customRequests)
      ? nextDb.customRequests.map((request) => ({
          ...request,
          buyerImageUploadEnabled: Boolean(request?.buyerImageUploadEnabled),
        }))
      : [],
    customRequestMessages: Array.isArray(nextDb.customRequestMessages)
      ? nextDb.customRequestMessages.map((message) => {
          const body = String(message?.body || '');
          const bodyOriginal = String(message?.bodyOriginal || body);
          return {
            ...message,
            body,
            bodyOriginal,
            sourceLanguage: SUPPORTED_AUTH_LANGUAGES.includes(message?.sourceLanguage) ? message.sourceLanguage : 'en',
            translations: normalizeMessageTranslations(message?.translations, bodyOriginal),
            imageAttachments: normalizeCustomRequestImageAttachments(message?.imageAttachments),
          };
        })
      : [],
    refundClaims: Array.isArray(nextDb.refundClaims) ? nextDb.refundClaims : [],
    orderHelpRequests: Array.isArray(nextDb.orderHelpRequests) ? nextDb.orderHelpRequests : [],
    safetyReports: Array.isArray(nextDb.safetyReports) ? nextDb.safetyReports : [],
    barAffiliationRequests: Array.isArray(nextDb.barAffiliationRequests) ? nextDb.barAffiliationRequests : [],
    adminInboxReviews: Array.isArray(nextDb.adminInboxReviews) ? nextDb.adminInboxReviews : [],
    adminInboxFilterPresets: Array.isArray(nextDb.adminInboxFilterPresets) ? nextDb.adminInboxFilterPresets : [],
    adminNotes: Array.isArray(nextDb.adminNotes) ? nextDb.adminNotes : [],
    adminDisputeCases: Array.isArray(nextDb.adminDisputeCases) ? nextDb.adminDisputeCases : [],
    inactivityNudges: Array.isArray(nextDb.inactivityNudges) ? nextDb.inactivityNudges : [],
    orders: Array.isArray(nextDb.orders) ? nextDb.orders : [],
    walletTransactions: Array.isArray(nextDb.walletTransactions) ? nextDb.walletTransactions : [],
    payoutRuns: Array.isArray(nextDb.payoutRuns) ? nextDb.payoutRuns : [],
    payoutItems: Array.isArray(nextDb.payoutItems) ? nextDb.payoutItems : [],
    payoutEvents: Array.isArray(nextDb.payoutEvents) ? nextDb.payoutEvents : [],
    messages: Array.isArray(nextDb.messages)
      ? nextDb.messages.map((message) => {
          const body = String(message?.body || '');
          const bodyOriginal = String(message?.bodyOriginal || body);
          return {
            ...message,
            body,
            bodyOriginal,
            sourceLanguage: SUPPORTED_AUTH_LANGUAGES.includes(message?.sourceLanguage) ? message.sourceLanguage : 'en',
            translations: normalizeMessageTranslations(message?.translations, bodyOriginal),
          };
        })
      : [],
    notifications: Array.isArray(nextDb.notifications) ? nextDb.notifications : [],
    pushSubscriptions: Array.isArray(nextDb.pushSubscriptions) ? nextDb.pushSubscriptions : [],
    blocks: Array.isArray(nextDb.blocks) ? nextDb.blocks : [],
    adminActions: Array.isArray(nextDb.adminActions) ? nextDb.adminActions : [],
    stripeEvents: Array.isArray(nextDb.stripeEvents) ? nextDb.stripeEvents : [],
    emailTemplates: normalizeEmailTemplates(nextDb.emailTemplates),
    emailDeliveryLog: Array.isArray(nextDb.emailDeliveryLog) ? nextDb.emailDeliveryLog : [],
    adminEmailThreads: Array.isArray(nextDb.adminEmailThreads) ? nextDb.adminEmailThreads : [],
    adminEmailMessages: Array.isArray(nextDb.adminEmailMessages) ? nextDb.adminEmailMessages : [],
    giftCatalog: Array.isArray(nextDb.giftCatalog) ? nextDb.giftCatalog : [],
    giftPurchases: Array.isArray(nextDb.giftPurchases) ? nextDb.giftPurchases : [],
    giftFulfillmentTasks: Array.isArray(nextDb.giftFulfillmentTasks) ? nextDb.giftFulfillmentTasks : [],
    siteSettings: normalizeSiteSettings(nextDb.siteSettings),
  };
  const existingBarIds = new Set((normalized.bars || []).map((bar) => String(bar?.id || '')));
  const missingBars = (normalized.users || [])
    .filter((user) => user.role === 'bar' && user.barId && !existingBarIds.has(String(user.barId)))
    .filter((user) => !isLive || !isLiveJunkBarRecord({ name: user.name || '' }))
    .map((user) => ({
      id: user.barId,
      name: user.name || '',
      location: [user.city, user.country].filter(Boolean).join(', '),
      about: '', specials: '', mapEmbedUrl: '', mapLink: '', profileImage: '', profileImageName: '',
    }));
  if (missingBars.length > 0) {
    normalized.bars = [...normalized.bars, ...missingBars];
  }
  normalized.bars = filterLiveJunkBarsForMode(normalized.bars, mode);
  return pruneDemoMarketplaceData(normalized);
}

function shouldSendNotificationForType(user, type) {
  const preferences = user?.notificationPreferences || {};
  if (type === 'message') return preferences.message !== false;
  if (type === 'engagement') return preferences.engagement !== false;
  return true;
}

function buildAbsoluteActionUrl(path) {
  const safePath = String(path || '/account').startsWith('/') ? String(path || '/account') : `/${String(path || 'account')}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${safePath}`;
  }
  return `${APP_BASE_URL_FALLBACK}${safePath}`;
}

function fillEmailTemplate(templateText, vars) {
  return String(templateText || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, token) => {
    const value = vars?.[token];
    return value === undefined || value === null ? '' : String(value);
  });
}

function appendTemplatedEmail(prev, { templateKey, userId, vars = {}, fallbackPath = '/account' }) {
  const recipient = (prev.users || []).find((user) => user.id === userId);
  if (!recipient?.email) return prev;
  const templates = normalizeEmailTemplates(prev.emailTemplates);
  const template = templates.find((entry) => entry.key === templateKey);
  if (!template || template.enabled === false) return { ...prev, emailTemplates: templates };
  const actionPath = vars.actionPath || template.ctaPath || fallbackPath;
  const actionUrl = buildAbsoluteActionUrl(actionPath);
  const renderVars = {
    recipientName: recipient.name || 'there',
    actionPath,
    actionUrl,
    ...vars,
  };
  const now = new Date().toISOString();
  const queuedEmail = {
    id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    templateKey,
    userId,
    toEmail: recipient.email,
    toName: recipient.name || '',
    subject: fillEmailTemplate(template.subject, renderVars),
    body: fillEmailTemplate(template.body, renderVars),
    ctaLabel: template.ctaLabel || 'Open in app',
    actionPath,
    actionUrl,
    status: 'queued',
    createdAt: now,
  };
  return {
    ...prev,
    emailTemplates: templates,
    emailDeliveryLog: [queuedEmail, ...((prev.emailDeliveryLog || []).slice(0, 199))],
  };
}

function appendLowBalanceEmailIfNeeded(prev, { userId, beforeBalance, afterBalance }) {
  const before = Number(beforeBalance || 0);
  const after = Number(afterBalance || 0);
  if (!(before >= LOW_WALLET_BALANCE_THB && after < LOW_WALLET_BALANCE_THB)) {
    return prev;
  }
  return appendTemplatedEmail(prev, {
    templateKey: 'wallet_low_balance',
    userId,
    vars: {
      walletBalance: formatPriceTHB(after),
      threshold: formatPriceTHB(LOW_WALLET_BALANCE_THB),
      actionPath: '/account',
    },
    fallbackPath: '/account',
  });
}

function ensureOrderPlacedEmailQueued(prev, { userId, orderId, itemCount, shippingFee, total }) {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) return prev;
  const alreadyQueued = (prev.emailDeliveryLog || []).some((entry) => (
    entry?.templateKey === 'order_placed'
    && String(entry?.userId || '') === String(userId || '')
    && String(entry?.subject || '').includes(normalizedOrderId)
  ));
  if (alreadyQueued) return prev;
  return appendTemplatedEmail(prev, {
    templateKey: 'order_placed',
    userId,
    vars: {
      orderId: normalizedOrderId,
      itemCount,
      shippingFee: formatPriceTHB(shippingFee),
      orderTotal: formatPriceTHB(total),
      actionPath: '/account',
    },
    fallbackPath: '/account',
  });
}

function queueOrderPlacedEmail(prev, { userId, orderId, itemCount, shippingFee, total }) {
  return appendTemplatedEmail(prev, {
    templateKey: 'order_placed',
    userId,
    vars: {
      orderId: String(orderId || '').trim(),
      itemCount: Number(itemCount || 0),
      shippingFee: formatPriceTHB(shippingFee),
      orderTotal: formatPriceTHB(total),
      actionPath: '/account',
    },
    fallbackPath: '/account',
  });
}

function getMonthRangeFromValue(monthValue) {
  const normalized = String(monthValue || '').trim();
  const match = normalized.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return {
    periodStartIso: startDate.toISOString(),
    periodEndIso: endDate.toISOString(),
    periodLabel: startDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

function normalizePayoutMethod(method) {
  const normalized = String(method || '').trim().toLowerCase();
  if (normalized === 'promptpay') return 'promptpay';
  if (normalized === 'other') return 'other';
  return 'bank_transfer';
}

function isEligiblePayoutWalletTransaction(entry, recipient) {
  if (!entry?.id || !recipient?.id) return false;
  if (!['seller', 'bar'].includes(recipient.role)) return false;
  const amount = Number(entry.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const eligibleTypes = new Set(['message_fee', 'order_sale_earning', 'order_bar_commission']);
  if (!eligibleTypes.has(String(entry.type || ''))) return false;
  const createdAtMs = new Date(entry.createdAt || 0).getTime();
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return false;
  return true;
}

function calculateSellerRevenueSplit(prev, { sellerId, grossAmount }) {
  const gross = Number(Number(grossAmount || 0).toFixed(2));
  if (!sellerId || !Number.isFinite(gross) || gross <= 0) {
    return {
      sellerUserId: null,
      barUserId: null,
      adminUserId: null,
      sellerAmount: 0,
      barAmount: 0,
      adminAmount: 0,
      affiliatedBarId: null,
    };
  }

  const seller = (prev.sellers || []).find((entry) => entry.id === sellerId);
  const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === sellerId);
  const affiliatedBarId = String(seller?.affiliatedBarId || '').trim();
  const barUser = affiliatedBarId
    ? (prev.users || []).find((user) => user.role === 'bar' && user.barId === affiliatedBarId)
    : null;
  const adminUser = (prev.users || []).find((user) => user.role === 'admin');

  const hasPayoutBar = Boolean(barUser?.id);
  const sellerPct = hasPayoutBar ? SALE_SPLIT.sellerWithBar : SALE_SPLIT.sellerWithoutBar;
  const barPct = hasPayoutBar ? SALE_SPLIT.bar : 0;

  let sellerAmount = Number((gross * sellerPct).toFixed(2));
  let barAmount = Number((gross * barPct).toFixed(2));
  let adminAmount = Number((gross - sellerAmount - barAmount).toFixed(2));

  if (!sellerUser?.id) {
    adminAmount = Number((adminAmount + sellerAmount).toFixed(2));
    sellerAmount = 0;
  }
  if (!barUser?.id) {
    adminAmount = Number((adminAmount + barAmount).toFixed(2));
    barAmount = 0;
  }

  return {
    sellerUserId: sellerUser?.id || null,
    barUserId: barUser?.id || null,
    adminUserId: adminUser?.id || null,
    sellerAmount,
    barAmount,
    adminAmount,
    affiliatedBarId: hasPayoutBar ? affiliatedBarId : null,
  };
}

function buildBarConversationId(barId, participantRole, participantUserId) {
  return `barchat__${String(barId || '').trim()}__${String(participantRole || '').trim()}__${String(participantUserId || '').trim()}`;
}

function parseBarConversationId(conversationId) {
  const [prefix, barId, participantRole, participantUserId] = String(conversationId || '').split('__');
  if (prefix !== 'barchat' || !barId || !participantRole || !participantUserId) return null;
  return {
    barId: String(barId || '').trim(),
    participantRole: String(participantRole || '').trim(),
    participantUserId: String(participantUserId || '').trim(),
  };
}

function getShippingRateByCountry(countryCode) {
  const upper = String(countryCode || '').trim().toUpperCase();
  if (!upper) {
    return { zoneLabel: 'Select destination', standard: 0, express: 0, standardDays: '', expressDays: '', supported: false };
  }

  for (const zone of Object.values(SHIPPING_ZONES)) {
    if (zone.countries.includes('*')) continue;
    if (zone.countries.includes(upper)) {
      return {
        zoneLabel: zone.label,
        standard: zone.standard.rate,
        express: zone.express.rate,
        standardLabel: zone.standard.label,
        expressLabel: zone.express.label,
        standardDays: zone.standard.days,
        expressDays: zone.express.days,
        supported: true,
      };
    }
  }

  const fallback = Object.values(SHIPPING_ZONES).find((z) => z.countries.includes('*'));
  if (fallback) {
    return {
      zoneLabel: fallback.label,
      standard: fallback.standard.rate,
      express: fallback.express.rate,
      standardLabel: fallback.standard.label,
      expressLabel: fallback.express.label,
      standardDays: fallback.standard.days,
      expressDays: fallback.express.days,
      supported: true,
    };
  }

  return { zoneLabel: 'Unknown', standard: 0, express: 0, standardDays: '', expressDays: '', supported: false };
}

function getBarShippingReimbursement(countryCode) {
  const upper = String(countryCode || '').trim().toUpperCase();
  if (!upper) return 0;
  for (const [zoneKey, zone] of Object.entries(SHIPPING_ZONES)) {
    if (zone.countries.includes('*')) continue;
    if (zone.countries.includes(upper)) return Number(SHIPPING_BAR_REIMBURSEMENT[zoneKey] || 0);
  }
  const fallbackKey = Object.entries(SHIPPING_ZONES).find(([, z]) => z.countries.includes('*'));
  return fallbackKey ? Number(SHIPPING_BAR_REIMBURSEMENT[fallbackKey[0]] || 0) : 0;
}

function WalletTopUpReturnPage({ apiRequestJson, navigate, primaryShellRoute, setDb, normalizeDbState, appMode, userId }) {
  const [status, setStatus] = useState('polling');
  const [balance, setBalance] = useState(null);
  const polled = useRef(false);

  useEffect(() => {
    if (polled.current) return;
    polled.current = true;
    const txnId = (() => { try { return sessionStorage.getItem('pendingTopUpTxnId'); } catch { return null; } })();
    if (!txnId) { setStatus('unknown'); return; }
    let attempts = 0;
    const maxAttempts = 20;
    const interval = 3000;
    const poll = async () => {
      try {
        const { ok, payload } = await apiRequestJson(`/api/wallet/top-up-status/${encodeURIComponent(txnId)}`, { method: 'GET' });
        if (ok && payload?.status === 'completed') {
          setStatus('success');
          setBalance(payload.walletBalance);
          if (userId && payload.walletBalance != null) {
            setDb((prev) => ({
              ...prev,
              users: (prev.users || []).map((u) =>
                u.id === userId ? { ...u, walletBalance: payload.walletBalance } : u
              ),
            }));
          }
          try { sessionStorage.removeItem('pendingTopUpTxnId'); } catch {}
          return;
        }
        if (ok && payload?.status === 'failed') {
          setStatus('failed');
          try { sessionStorage.removeItem('pendingTopUpTxnId'); } catch {}
          return;
        }
      } catch {}
      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(poll, interval);
      } else {
        setStatus('timeout');
      }
    };
    poll();
  }, [apiRequestJson]);

  if (status === 'polling') {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-[2rem] bg-white p-10 text-center shadow-xl ring-1 ring-rose-100">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600" />
          <h2 className="mt-5 text-2xl font-bold tracking-tight">Processing your top-up&hellip;</h2>
          <p className="mt-3 text-slate-600">Please wait while we confirm your payment. This usually takes 10 to 15 seconds.</p>
        </div>
      </section>
    );
  }

  if (status === 'success') {
    return (
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-[2rem] bg-white p-10 text-center shadow-xl ring-1 ring-rose-100">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight">Wallet topped up</h2>
          <p className="mt-3 text-slate-600">Your payment was successful.{balance != null ? ` Your new wallet balance is ${balance.toLocaleString()} THB.` : ''}</p>
          <button onClick={() => navigate(primaryShellRoute)} className="mt-6 rounded-2xl bg-rose-600 px-6 py-3 font-semibold text-white">Go to account</button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="rounded-[2rem] bg-white p-10 text-center shadow-xl ring-1 ring-rose-100">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-2xl font-bold">!</div>
        <h2 className="mt-5 text-3xl font-bold tracking-tight">{status === 'failed' ? 'Top-up failed' : 'Payment status unknown'}</h2>
        <p className="mt-3 text-slate-600">
          {status === 'failed'
            ? 'The payment could not be processed. Please try again.'
            : 'We could not confirm your payment status. If you were charged, your balance will update shortly. Contact support if it does not.'}
        </p>
        <button onClick={() => navigate(primaryShellRoute)} className="mt-6 rounded-2xl border border-rose-200 px-6 py-3 font-semibold text-rose-700">Return to account</button>
      </div>
    </section>
  );
}

function parseRoute(pathname) {
  if (pathname === '/') return { name: 'home' };
  if (pathname === '/find') return { name: 'find' };
  if (pathname === '/login') return { name: 'login' };
  if (pathname === '/register') return { name: 'register' };
  if (pathname === '/verify-email') return { name: 'verify-email' };
  if (pathname === '/checkout') return { name: 'checkout' };
  if (pathname === '/checkout/success') return { name: 'checkout-success' };
  if (pathname === '/admin') return { name: 'admin' };
  if (pathname === '/seller-dashboard') return { name: 'account' };
  if (pathname === '/seller-messages') return { name: 'seller-messages' };
  if (pathname === '/buyer-messages') return { name: 'buyer-messages' };
  if (pathname === '/bar-messages') return { name: 'bar-messages' };
  if (pathname === '/seller-feed-workspace') return { name: 'stories-workspace', redirect: '/stories-workspace' };
  if (pathname === '/seller-upload') return { name: 'seller-upload' };
  if (pathname === '/bar-feed-workspace') return { name: 'bar-feed-workspace' };
  if (pathname === '/bar-dashboard') return { name: 'bar-dashboard' };
  if (pathname === '/seller-feed') return { name: 'stories', redirect: '/stories' };
  if (pathname === '/stories-workspace') return { name: 'stories-workspace' };
  if (pathname === '/stories') return { name: 'stories' };
  if (pathname === '/account') return { name: 'account' };
  if (pathname === '/bars') return { name: 'bars' };
  if (pathname === '/appeals') return { name: 'appeals' };
  if (pathname === '/privacy-policy') return { name: 'privacy-policy' };
  if (pathname === '/terms') return { name: 'terms' };
  if (pathname === '/shipping-policy') return { name: 'shipping-policy' };
  if (pathname === '/refund-policy') return { name: 'refund-policy' };
  if (pathname === '/refund-evidence') return { name: 'refund-evidence' };
  if (pathname === '/community-standards') return { name: 'community-standards' };
  if (pathname === '/seller-standards') return { name: 'seller-standards' };
  if (pathname === '/contact') return { name: 'contact' };
  if (pathname === '/faq') return { name: 'faq' };
  if (pathname === '/custom-requests') return { name: 'custom-requests' };
  if (pathname === '/worldwide-shipping') return { name: 'worldwide-shipping' };
  if (pathname === '/seller-portfolios') return { name: 'seller-portfolios' };
  if (pathname === '/how-to-apply') return { name: 'how-to-apply' };
  if (pathname === '/seller-appeals') return { name: 'seller-appeals' };
  if (pathname === '/seller-guidelines') return { name: 'seller-guidelines' };
  if (pathname === '/portfolio-setup') return { name: 'portfolio-setup' };
  if (pathname === '/order-help') return { name: 'order-help' };
  if (pathname === '/safety-report') return { name: 'safety-report' };
  if (pathname === '/privacy-packaging') return { name: 'privacy-packaging' };
  if (pathname === '/wallet-top-up-complete') return { name: 'wallet-top-up-complete' };
  if (pathname === '/wallet-top-up-cancelled') return { name: 'wallet-top-up-cancelled' };
  if (pathname === '/wallet-top-up-failed') return { name: 'wallet-top-up-failed' };
  if (pathname.startsWith('/product/')) return { name: 'product', slug: pathname.replace('/product/', '') };
  if (pathname.startsWith('/bar/')) return { name: 'bar', id: pathname.replace('/bar/', '') };
  if (pathname.startsWith('/seller/')) return { name: 'seller', id: pathname.replace('/seller/', '') };
  return { name: 'home' };
}

function removeBundlesContainingSoldItems(products, soldProductIds) {
  const soldSet = new Set(soldProductIds || []);
  return (products || []).filter((product) => {
    if (!product?.isBundle) return true;
    const bundleItems = Array.isArray(product.bundleItemIds) ? product.bundleItemIds : [];
    return !bundleItems.some((itemId) => soldSet.has(itemId));
  });
}

const DAYS_WORN_CANONICAL_BY_NORMALIZED = Object.fromEntries(
  (DAYS_WORN_OPTIONS || []).map((value) => [String(value || '').trim().toLowerCase(), value]),
);
function normalizeProductDaysWornValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.toLowerCase();
  if (DAYS_WORN_CANONICAL_BY_NORMALIZED[normalized]) {
    return DAYS_WORN_CANONICAL_BY_NORMALIZED[normalized];
  }
  if (normalized.includes('1-3')) return '1 day';
  if (normalized.includes('4-7')) return '6-7 days';
  if (normalized.includes('2-4')) return '2 days';
  if (normalized.includes('3-5')) return '3 days';
  if (normalized.includes('5-7')) return '6-7 days';
  return DAYS_WORN_OPTIONS[0];
}

function stableStringHash(value) {
  const source = String(value || "");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function rotateAndTake(items, count, seedValue) {
  const list = Array.isArray(items) ? items : [];
  if (list.length <= 1) return list.slice(0, count);
  const normalizedCount = Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : list.length;
  const offset = Math.abs(Number(seedValue || 0)) % list.length;
  const rotated = [...list.slice(offset), ...list.slice(0, offset)];
  return rotated.slice(0, normalizedCount);
}

const MALI_BUNDLE_PRODUCT_ID_SET = new Set([
  'product-mali-bar-night-bodysuit',
  'product-mali-underwear-velvet-brief',
  'product-set-mali-night-bundle',
]);

function ensureMaliBundleSeedProducts(products) {
  const currentProducts = Array.isArray(products) ? products : [];
  const existingIds = new Set(currentProducts.map((product) => product?.id).filter(Boolean));
  const missingSeedProducts = (CLEAN_SEED_DB.products || []).filter(
    (product) => MALI_BUNDLE_PRODUCT_ID_SET.has(product?.id) && !existingIds.has(product.id),
  );
  return missingSeedProducts.length > 0 ? [...currentProducts, ...missingSeedProducts] : currentProducts;
}

function buildRuntimeDbState(sourceDb, modeValue = 'live') {
  const appMode = normalizeAppMode(modeValue);
  const normalized = normalizeDbState(sourceDb, appMode);
  const baseProducts = Array.isArray(normalized.products) ? normalized.products : [];
  return {
    ...normalized,
    products: baseProducts,
  };
}

function applyStrikeAndAutoFreeze(prev, { targetUserId, reason, sourceType, sourceId, reportId, adminUserId }) {
  const targetUser = (prev.users || []).find((entry) => entry.id === targetUserId);
  if (!targetUser || targetUser.role === 'admin') {
    return prev;
  }
  const now = new Date().toISOString();
  const activeStrikeCount = (prev.userStrikes || []).filter((strike) => strike.userId === targetUserId && strike.status === 'active').length;
  const nextStrikeCount = activeStrikeCount + 1;
  const shouldFreeze = nextStrikeCount >= 2 && targetUser.accountStatus !== 'blocked';
  const strike = {
    id: `strike_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: targetUserId,
    sourceType,
    sourceId,
    reportId,
    reason: String(reason || '').slice(0, 500),
    status: 'active',
    createdAt: now,
    appliedByUserId: adminUserId || 'admin',
  };

  const base = {
    ...prev,
    userStrikes: [strike, ...(prev.userStrikes || [])],
    users: (prev.users || []).map((user) => {
      if (user.id !== targetUserId) return user;
      return {
        ...user,
        strikeCount: nextStrikeCount,
        accountStatus: shouldFreeze ? 'frozen' : user.accountStatus,
        frozenAt: shouldFreeze ? now : user.frozenAt,
        frozenReason: shouldFreeze ? 'Automatically frozen after receiving two moderation strikes.' : user.frozenReason,
      };
    }),
    notifications: [
      {
        id: `notif_${Date.now()}_strike`,
        userId: targetUserId,
        type: 'engagement',
        text: shouldFreeze
          ? 'Your account is frozen after two moderation strikes. Please submit an appeal.'
          : `A moderation strike was added to your account (${nextStrikeCount}/2).`,
        actionPath: '/appeals',
        actionLabel: 'Appeal now',
        read: false,
        createdAt: now,
      },
      ...(prev.notifications || []),
    ],
    adminActions: [
      ...(prev.adminActions || []),
      {
        id: `admin_action_${Date.now()}_strike`,
        type: 'apply_user_strike',
        targetUserId,
        targetReportId: reportId,
        adminUserId: adminUserId || 'admin',
        reason: strike.reason,
        createdAt: now,
      },
      ...(shouldFreeze
        ? [{
            id: `admin_action_${Date.now()}_auto_freeze`,
            type: 'auto_freeze_user',
            targetUserId,
            targetReportId: reportId,
            adminUserId: adminUserId || 'admin',
            reason: 'Reached two moderation strikes.',
            createdAt: now,
          }]
        : []),
    ],
  };
  const strikeTemplateKey = shouldFreeze ? 'account_frozen_two_strikes' : 'moderation_strike_added';
  return appendTemplatedEmail(base, {
    templateKey: strikeTemplateKey,
    userId: targetUserId,
    vars: {
      strikeCount: nextStrikeCount,
      strikeReason: strike.reason || 'Not specified',
      actionPath: '/appeals',
    },
    fallbackPath: '/appeals',
  });
}

export default function ThailandPantiesMarketSite() {
  const apiIdempotencyKeysRef = useRef({});
  const accountMenuRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [appMode, setAppMode] = useState(() => normalizeAppMode(readStore(APP_MODE_STORAGE_KEY, 'live')));
  const [db, setDb] = useState(() => {
    if (appMode === 'test') {
      return buildRuntimeDbState(OFFICIAL_TEST_MODE_DB, 'test');
    }
    return buildRuntimeDbState(readStore('tlm-db', {}), 'live');
  });
  const [cart, setCart] = useState(() => readStore('tlm-cart', []));
  const [cartNotice, setCartNotice] = useState('');
  const [session, setSession] = useState(() => readStore('tlm-session', { userId: null }));
  const [apiAuthToken, setApiAuthToken] = useState(() => readStore('tlm-api-token', ''));
  const [route, setRoute] = useState(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });
  const [checkoutStep, setCheckoutStep] = useState(() => normalizeCheckoutStep(readStore('tlm-checkout-step', 1)));
  const [adminTab, setAdminTab] = useState(() => String(readStore('tlm-admin-tab', 'overview') || 'overview'));
  const [adminImpersonation, setAdminImpersonation] = useState(() => {
    const saved = readStore('tlm-admin-impersonation', null);
    return saved?.token && saved?.sessionUserId ? saved : null;
  });
  const [filters, setFilters] = useState({
    search: '',
    size: 'All',
    color: 'All',
    style: 'All',
    fabric: 'All',
    daysWorn: 'All',
    condition: 'All',
    scentLevel: 'All',
    price: 'All',
  });
  const [uploadDraft, setUploadDraft] = useState({
    title: '',
    sellerId: 'nina-b',
    price: '',
    size: '',
    color: '',
    style: '',
    fabric: '',
    daysWorn: '',
    condition: '',
    scentLevel: '',
    image: '',
    imageName: '',
    images: [],
    coverIndex: 0,
  });
  const [editingProductId, setEditingProductId] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState(() => String(readStore('tlm-checkout-buyer-email', '') || ''));
  const [checkoutAuthModalOpen, setCheckoutAuthModalOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [postLoginRedirectPath, setPostLoginRedirectPath] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [authLanguage, setAuthLanguage] = useState(() => normalizeAuthLanguage(readStore('tlm-auth-language', 'en')));
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    city: '',
    country: '',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg',
    hairColor: '',
    braSize: '',
    pantySize: '',
    acceptedRespectfulConduct: false,
    acceptedNoRefunds: false,
  });
  const [registrationSuccessPopup, setRegistrationSuccessPopup] = useState(null);
  const registrationSuccessCardRef = useRef(null);
  const [registrationCopyFlash, setRegistrationCopyFlash] = useState({ email: false, password: false });
  const registrationCopyTimersRef = useRef({ email: null, password: null });
  const triggerRegistrationCopyFlash = useCallback((key) => {
    setRegistrationCopyFlash((prev) => ({ ...prev, [key]: true }));
    const timers = registrationCopyTimersRef.current;
    if (timers[key]) window.clearTimeout(timers[key]);
    timers[key] = window.setTimeout(() => {
      setRegistrationCopyFlash((prev) => ({ ...prev, [key]: false }));
      timers[key] = null;
    }, 2000);
  }, []);
  const [useBraThaiSizing, setUseBraThaiSizing] = useState(true);
  const [thaiBraBand, setThaiBraBand] = useState('');
  const [thaiBraCup, setThaiBraCup] = useState('');
  const [registerStep, setRegisterStep] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStepError, setRegisterStepError] = useState('');
  const [authError, setAuthError] = useState('');
  const [authErrorRefreshKey, setAuthErrorRefreshKey] = useState(0);
  const [authSuccess, setAuthSuccess] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authResendVerificationSending, setAuthResendVerificationSending] = useState(false);
  const [emailVerificationStatus, setEmailVerificationStatus] = useState({
    loading: false,
    message: '',
    tone: 'neutral',
  });
  const [checkoutForm, setCheckoutForm] = useState(() => normalizeCheckoutFormDraft(readStore('tlm-checkout-form', null)));
  const [accountForm, setAccountForm] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    region: '',
    address: '',
    postalCode: '',
    height: '',
    weight: '',
    hairColor: '',
    braSize: '',
    pantySize: '',
    interests: '',
    hobbies: '',
    timeFormat: '12h',
  });
  const [accountSaveMessage, setAccountSaveMessage] = useState('');
  const [accountCredentialForm, setAccountCredentialForm] = useState({
    newDisplayName: '',
    currentPassword: '',
    newEmail: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [accountCredentialSaving, setAccountCredentialSaving] = useState(false);
  const [accountCredentialMessage, setAccountCredentialMessage] = useState('');
  const [accountCredentialTone, setAccountCredentialTone] = useState('neutral');
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const switchAppMode = useCallback((nextMode) => {
    const normalizedMode = normalizeAppMode(nextMode);
    if (normalizedMode === appMode) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(APP_MODE_STORAGE_KEY, JSON.stringify(normalizedMode));
      window.localStorage.removeItem('tlm-db');
      window.localStorage.removeItem('tlm-cart');
      window.localStorage.removeItem('tlm-checkout-step');
      window.localStorage.removeItem('tlm-checkout-buyer-email');
      window.localStorage.removeItem('tlm-checkout-form');
      window.localStorage.removeItem('tlm-session');
      window.localStorage.removeItem('tlm-api-token');
    }
    setAppMode(normalizedMode);
    setDb(buildRuntimeDbState(normalizedMode === 'test' ? OFFICIAL_TEST_MODE_DB : {}, normalizedMode));
    setCart([]);
    setCheckoutStep(1);
    setBuyerEmail('');
    setCheckoutForm(normalizeCheckoutFormDraft(null));
    setSession({ userId: null });
    setApiAuthToken('');
    setAuthError('');
    setAuthSuccess('');
    setCheckoutAuthModalOpen(false);
    setBackendStatus('idle');
  }, [appMode]);
  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      const menuElement = accountMenuRef.current;
      if (!menuElement) return;
      if (menuElement.contains(event.target)) return;
      setAccountMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('touchstart', closeOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('touchstart', closeOnOutsideClick);
    };
  }, [accountMenuOpen]);
  useLayoutEffect(() => {
    if (!registrationSuccessPopup) return;
    registrationSuccessCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [registrationSuccessPopup]);
  useEffect(() => {
    if (registrationSuccessPopup) return undefined;
    setRegistrationCopyFlash({ email: false, password: false });
    const timers = registrationCopyTimersRef.current;
    if (timers.email) window.clearTimeout(timers.email);
    if (timers.password) window.clearTimeout(timers.password);
    timers.email = null;
    timers.password = null;
    return undefined;
  }, [registrationSuccessPopup]);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState('');
  const [adminSellerReviewFilter, setAdminSellerReviewFilter] = useState('pending');
  const [adminAuthActionMessage, setAdminAuthActionMessage] = useState('');
  const [messageDraft, setMessageDraft] = useState('');
  const [messageError, setMessageError] = useState('');
  const [showOriginalMarketplaceMessageById, setShowOriginalMarketplaceMessageById] = useState({});
  const [buyerDashboardConversationId, setBuyerDashboardConversationId] = useState('');
  const [buyerDashboardMessageDraft, setBuyerDashboardMessageDraft] = useState('');
  const [barMessagesConversationId, setBarMessagesConversationId] = useState('');
  const [barMessagesDraft, setBarMessagesDraft] = useState('');
  const [barMessagesError, setBarMessagesError] = useState('');
  const [buyerDashboardMessageError, setBuyerDashboardMessageError] = useState('');
  const [buyerMessageSellerSearch, setBuyerMessageSellerSearch] = useState('');
  const [buyerMessageProductFilters, setBuyerMessageProductFilters] = useState({
    search: '',
    size: 'All',
    style: 'All',
    fabric: 'All',
    daysWorn: 'All',
    price: 'All',
  });
  const [topUpAmount, setTopUpAmount] = useState(500);
  const [walletStatus, setWalletStatus] = useState('idle');
  const [walletTopUpContext, setWalletTopUpContext] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [sellerPageTopUpOpen, setSellerPageTopUpOpen] = useState(false);
  const [sellerPageTopUpDraft, setSellerPageTopUpDraft] = useState(String(MIN_WALLET_TOP_UP_THB));
  const [sellerPageTopUpError, setSellerPageTopUpError] = useState('');
  const sellerPageFormatUsd = (thb) => {
    if (!exchangeRate || exchangeRate <= 0) return null;
    return `~$${(Number(thb) / exchangeRate).toFixed(2)} USD`;
  };
  function openSellerPageTopUp(shortfall) {
    const amount = Math.max(MIN_WALLET_TOP_UP_THB, Math.ceil(Number(shortfall || 0) || MIN_WALLET_TOP_UP_THB));
    setSellerPageTopUpDraft(String(amount));
    setSellerPageTopUpError('');
    setSellerPageTopUpOpen(true);
  }
  async function submitSellerPageTopUp() {
    const amount = Number(sellerPageTopUpDraft || 0);
    if (!isValidWalletTopUpAmount(amount)) {
      setSellerPageTopUpError(`Top-up amount must be at least ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.`);
      return;
    }
    setSellerPageTopUpError('');
    const result = await runWalletTopUp(amount);
    if (!result?.ok) {
      setSellerPageTopUpError(result?.error || 'Top-up failed. Please try again.');
      return;
    }
    setSellerPageTopUpOpen(false);
  }
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/exchange-rate`);
        const data = await res.json();
        if (!cancelled && data?.ok && data.rate > 0) setExchangeRate(data.rate);
      } catch {}
    })();
    const tid = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/exchange-rate`);
        const data = await res.json();
        if (!cancelled && data?.ok && data.rate > 0) setExchangeRate(data.rate);
      } catch {}
    }, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(tid); };
  }, []);
  const [giftModal, setGiftModal] = useState({ open: false, sellerId: '', giftType: '', message: '', isAnonymous: false, sending: false, error: '', success: '' });
  const [sellerSelectedConversationId, setSellerSelectedConversationId] = useState('');
  const [sellerReplyDraft, setSellerReplyDraft] = useState('');
  const [sellerReplyMedia, setSellerReplyMedia] = useState(null);
  const [sellerCustomRequestDraft, setSellerCustomRequestDraft] = useState({
    name: '',
    email: '',
    preferredDetails: '',
    shippingCountry: '',
    requestBody: '',
  });
  const [sellerCustomRequestMessage, setSellerCustomRequestMessage] = useState('');
  const [sellerProfileDraft, setSellerProfileDraft] = useState({
    location: '',
    languages: [],
    bio: '',
    shipping: 'Worldwide from Thailand',
    turnaround: 'Ships in 1-3 days',
    affiliatedBarId: '',
    profileImage: '',
    profileImageName: '',
    height: '',
    weight: '',
    hairColor: '',
    braSize: '',
    pantySize: '',
    birthDay: null,
    birthMonth: null,
  });
  const [sellerProfileMessage, setSellerProfileMessage] = useState('');
  const [isSavingSellerProfile, setIsSavingSellerProfile] = useState(false);
  const [sellerProfileSaveSuccess, setSellerProfileSaveSuccess] = useState(false);
  const [sellerAffiliationRequestDraft, setSellerAffiliationRequestDraft] = useState({
    message: '',
    images: [],
  });
  const [barProfileDraft, setBarProfileDraft] = useState({
    location: '',
    about: '',
    specials: '',
    mapEmbedUrl: '',
    mapLink: '',
    profileImage: '',
    profileImageName: '',
  });
  const [barProfileMessage, setBarProfileMessage] = useState('');
  const [barSpecialPresetSelections, setBarSpecialPresetSelections] = useState([]);
  const [barPostDraft, setBarPostDraft] = useState({
    caption: '',
    image: '',
    imageName: '',
  });
  const [barNotificationCompactMode, setBarNotificationCompactMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`tlm-bar-notification-density-${session?.userId || 'anon'}`) === 'compact';
  });
  const [barDiscreetNotificationText, setBarDiscreetNotificationText] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(`tlm-bar-discreet-notifications-${session?.userId || 'anon'}`) === '1';
  });
  const [creatingBarPost, setCreatingBarPost] = useState(false);
  const [savingBarProfile, setSavingBarProfile] = useState(false);
  const [deletingBarPostId, setDeletingBarPostId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [sellerPostDraft, setSellerPostDraft] = useState({
    caption: '',
    image: '',
    imageName: '',
    scheduledFor: '',
    visibility: 'public',
    accessPriceUsd: MIN_FEED_UNLOCK_PRICE_THB,
  });
  const [sellerPostDraftSavedAt, setSellerPostDraftSavedAt] = useState('');
  const [creatingSellerPost, setCreatingSellerPost] = useState(false);
  const [reportingSellerPostId, setReportingSellerPostId] = useState(null);
  const [reportingSellerPostCommentId, setReportingSellerPostCommentId] = useState(null);
  const [reportingDirectMessageId, setReportingDirectMessageId] = useState(null);
  const [deletingSellerPostId, setDeletingSellerPostId] = useState(null);
  const [resolvingPostReportId, setResolvingPostReportId] = useState(null);
  const [resolvingAllPostReports, setResolvingAllPostReports] = useState(false);
  const [resolvingCommentReportId, setResolvingCommentReportId] = useState(null);
  const [resolvingAllCommentReports, setResolvingAllCommentReports] = useState(false);
  const [resolvingMessageReportId, setResolvingMessageReportId] = useState(null);
  const [dismissingMessageReportId, setDismissingMessageReportId] = useState(null);
  const [resolvingAllMessageReports, setResolvingAllMessageReports] = useState(false);
  const [submittingStrikeAppeal, setSubmittingStrikeAppeal] = useState(false);
  const [reviewingAppealId, setReviewingAppealId] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [barOrderShipmentDrafts, setBarOrderShipmentDrafts] = useState({});
  const [lastFrozenPopupUserId, setLastFrozenPopupUserId] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [checkoutSuccessPopup, setCheckoutSuccessPopup] = useState(null);
  const [cartPulse, setCartPulse] = useState(false);
  const cartNoticeTimerRef = useRef(null);
  const cartPulseTimerRef = useRef(null);
  const [messageRefreshTick, setMessageRefreshTick] = useState(0);
  const [backendStatus, setBackendStatus] = useState('idle');
  const [pushSupport, setPushSupport] = useState({
    serviceWorker: false,
    notification: false,
    pushManager: false,
  });
  const [pushPermission, setPushPermission] = useState(
    typeof window !== 'undefined' && typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [pushConfig, setPushConfig] = useState({ enabled: false, publicKey: '' });
  const [feedNow, setFeedNow] = useState(Date.now());
  const emailDispatchInFlightRef = useRef(false);
  const PROFILE_MESSAGE_AUTO_DISMISS_MS = 4500;

  useEffect(() => {
    if (!sellerProfileMessage) return undefined;
    const timerId = window.setTimeout(() => setSellerProfileMessage(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [sellerProfileMessage]);

  useEffect(() => {
    if (!barProfileMessage) return undefined;
    const timerId = window.setTimeout(() => setBarProfileMessage(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [barProfileMessage]);

  useEffect(() => {
    if (!authError) return undefined;
    const timerId = window.setTimeout(() => setAuthError(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [authError]);

  useEffect(() => {
    if (!authSuccess) return undefined;
    const timerId = window.setTimeout(() => setAuthSuccess(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [authSuccess]);

  useEffect(() => {
    if (!adminAuthActionMessage) return undefined;
    const timerId = window.setTimeout(() => setAdminAuthActionMessage(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [adminAuthActionMessage]);

  useEffect(() => {
    if (!checkoutError) return undefined;
    const timerId = window.setTimeout(() => setCheckoutError(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [checkoutError]);

  useEffect(() => {
    if (!sellerCustomRequestMessage) return undefined;
    const timerId = window.setTimeout(() => setSellerCustomRequestMessage(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [sellerCustomRequestMessage]);

  useEffect(() => {
    if (!messageError) return undefined;
    const timerId = window.setTimeout(() => setMessageError(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [messageError]);

  useEffect(() => {
    if (!buyerDashboardMessageError) return undefined;
    const timerId = window.setTimeout(() => setBuyerDashboardMessageError(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [buyerDashboardMessageError]);

  useEffect(() => {
    if (!barMessagesError) return undefined;
    const timerId = window.setTimeout(() => setBarMessagesError(''), PROFILE_MESSAGE_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timerId);
  }, [barMessagesError]);

  const users = db.users;
  const sellers = db.sellers;
  const bars = db.bars || [];
  const barPosts = db.barPosts || [];
  const currentUser = users.find((u) => u.id === session.userId) || null;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setBarNotificationCompactMode(window.localStorage.getItem(`tlm-bar-notification-density-${currentUser?.id || 'anon'}`) === 'compact');
    setBarDiscreetNotificationText(window.localStorage.getItem(`tlm-bar-discreet-notifications-${currentUser?.id || 'anon'}`) === '1');
  }, [currentUser?.id]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`tlm-bar-notification-density-${currentUser?.id || 'anon'}`, barNotificationCompactMode ? 'compact' : 'comfort');
  }, [barNotificationCompactMode, currentUser?.id]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(`tlm-bar-discreet-notifications-${currentUser?.id || 'anon'}`, barDiscreetNotificationText ? '1' : '0');
  }, [barDiscreetNotificationText, currentUser?.id]);
  const uiLanguage = ['en', 'th', 'my', 'ru'].includes(currentUser?.preferredLanguage)
    ? currentUser.preferredLanguage
    : authLanguage;
  const barT = BAR_DASHBOARD_I18N[uiLanguage] || BAR_DASHBOARD_I18N.en;
  const rawProducts = db.products;
  const rawSellerPosts = db.sellerPosts || [];
  const products = useMemo(
    () =>
      (rawProducts || []).map((product) => ({
        ...product,
        title: resolveLocalizedText(product?.title, product?.titleI18n, uiLanguage),
      })),
    [rawProducts, uiLanguage]
  );
  const sellerPosts = useMemo(
    () =>
      (rawSellerPosts || []).map((post) => ({
        ...post,
        caption: resolveLocalizedText(post?.caption, post?.captionI18n, uiLanguage),
      })),
    [rawSellerPosts, uiLanguage]
  );
  const barMap = useMemo(
    () => Object.fromEntries((bars || []).map((bar) => [bar.id, bar])),
    [bars],
  );
  const postReports = db.postReports || [];
  const commentReports = db.commentReports || [];
  const messageReports = db.messageReports || [];
  const userStrikes = db.userStrikes || [];
  const userAppeals = db.userAppeals || [];
  const postUnlocks = db.postUnlocks || [];
  const buyerUnlockedPostIds = currentUser ? new Set(postUnlocks.filter((u) => u.buyerUserId === currentUser.id).map((u) => u.postId)) : new Set();
  const sellerPostLikes = db.sellerPostLikes || [];
  const sellerPostComments = db.sellerPostComments || [];
  const sellerFollows = db.sellerFollows || [];
  const barFollows = db.barFollows || [];
  const productWatches = db.productWatches || [];
  const sellerSavedPosts = db.sellerSavedPosts || [];
  const sellerFollowerCountById = useMemo(() => {
    const counts = {};
    (sellerFollows || []).forEach((entry) => {
      if (!entry?.sellerId) return;
      counts[entry.sellerId] = (counts[entry.sellerId] || 0) + 1;
    });
    return counts;
  }, [sellerFollows]);
  const customRequests = db.customRequests || [];
  const customRequestMessages = db.customRequestMessages || [];
  const refundClaims = db.refundClaims || [];
  const orderHelpRequests = db.orderHelpRequests || [];
  const safetyReports = db.safetyReports || [];
  const barAffiliationRequests = db.barAffiliationRequests || [];
  const reconciledSellers = useMemo(() => {
    const approved = barAffiliationRequests.filter((r) => r.status === 'approved');
    if (approved.length === 0) return sellers;
    const barIdBySellerId = {};
    approved.forEach((r) => { barIdBySellerId[r.sellerId] = r.barId; });
    let changed = false;
    const result = (sellers || []).map((s) => {
      const approvedBarId = barIdBySellerId[s.id];
      if (approvedBarId && String(s.affiliatedBarId || '').trim() !== String(approvedBarId).trim()) {
        changed = true;
        return { ...s, affiliatedBarId: approvedBarId };
      }
      return s;
    });
    return changed ? result : sellers;
  }, [sellers, barAffiliationRequests]);
  const adminInboxReviews = db.adminInboxReviews || [];
  const adminInboxFilterPresets = db.adminInboxFilterPresets || [];
  const adminNotes = db.adminNotes || [];
  const adminDisputeCases = db.adminDisputeCases || [];
  const inactivityNudges = db.inactivityNudges || [];
  const orders = db.orders;
  const walletTransactions = db.walletTransactions || [];
  const payoutRuns = db.payoutRuns || [];
  const payoutItems = db.payoutItems || [];
  const payoutEvents = db.payoutEvents || [];
  const messages = db.messages || [];
  const notifications = db.notifications || [];
  const watchedProductIds = useMemo(
    () => new Set(
      (productWatches || [])
        .filter((entry) => entry?.userId === currentUser?.id && entry?.productId)
        .map((entry) => entry.productId)
    ),
    [productWatches, currentUser?.id]
  );
  const watchedProducts = useMemo(() => {
    if (!currentUser?.id) return [];
    return (productWatches || [])
      .filter((entry) => entry?.userId === currentUser.id && entry?.productId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((entry) => {
        const product = products.find((candidate) => candidate.id === entry.productId);
        return product ? { ...product, watchedAt: entry.createdAt || "" } : null;
      })
      .filter(Boolean);
  }, [productWatches, currentUser?.id, products]);
  const blocks = db.blocks || [];
  const adminActions = db.adminActions || [];
  const stripeEvents = db.stripeEvents;
  const emailTemplates = db.emailTemplates || [];
  const emailDeliveryLog = db.emailDeliveryLog || [];
  const adminEmailThreads = db.adminEmailThreads || [];
  const adminEmailMessages = db.adminEmailMessages || [];
  const siteSettings = normalizeSiteSettings(db.siteSettings);
  const promptPayReceiverMobile = siteSettings.promptPayReceiverMobile;

  const navText = SHARED_NAV_I18N[uiLanguage] || SHARED_NAV_I18N.en;
  const publicText = publicSiteText(uiLanguage);
  const footerCopy = FOOTER_I18N[uiLanguage] || FOOTER_I18N.en;
  const sellerUserBySellerId = useMemo(() => {
    const map = {};
    (users || []).forEach((user) => {
      if (user.role === 'seller' && user.sellerId) map[user.sellerId] = user;
    });
    return map;
  }, [users]);
  const barUserByBarId = useMemo(() => {
    const map = {};
    (users || []).forEach((user) => {
      if (user.role === 'bar' && user.barId) map[user.barId] = user;
    });
    return map;
  }, [users]);
  const sellerStatus = (key, params = {}) => {
    const dict = SELLER_STATUS_I18N[uiLanguage] || SELLER_STATUS_I18N.en;
    const template = dict[key] ?? SELLER_STATUS_I18N.en[key] ?? key;
    return typeof template === 'function' ? template(params) : template;
  };
  const adminActionText = (key, params = {}) => {
    const dict = ADMIN_ACTION_I18N[uiLanguage] || ADMIN_ACTION_I18N.en;
    const template = dict[key] ?? ADMIN_ACTION_I18N.en[key] ?? key;
    return typeof template === 'function' ? template(params) : template;
  };
  const barStatus = (key, params = {}) => {
    const dict = BAR_STATUS_I18N[uiLanguage] || BAR_STATUS_I18N.en;
    const template = dict[key] ?? BAR_STATUS_I18N.en[key] ?? key;
    return typeof template === 'function' ? template(params) : template;
  };
  const loginText = LOGIN_I18N[authLanguage] || LOGIN_I18N.en;
  const registerText = REGISTER_I18N[authLanguage] || REGISTER_I18N.en;
  const registerPasswordValue = String(registerForm.password || '');
  const registerConfirmPasswordValue = String(registerForm.confirmPassword || '');
  const registerTotalSteps = registerForm.role === 'seller' ? 6 : registerForm.role === 'bar' ? 5 : registerForm.role === 'buyer' ? 4 : 0;
  const isLastRegisterStep = registerTotalSteps > 0 && registerStep === registerTotalSteps;
  const registerPasswordChecks = [
    {
      key: 'length',
      label: registerText.passwordRuleMinLength || 'At least 8 characters',
      passed: registerPasswordValue.length >= 8,
    },
    {
      key: 'number',
      label: registerText.passwordRuleNumber || 'Contains at least 1 number',
      passed: /\d/.test(registerPasswordValue),
    },
    {
      key: 'symbol',
      label: registerText.passwordRuleSymbol || 'Contains at least 1 symbol',
      passed: /[^A-Za-z0-9]/.test(registerPasswordValue),
    },
    {
      key: 'match',
      label: registerText.passwordRuleMatch || 'Passwords match',
      passed: registerConfirmPasswordValue.length > 0 && registerPasswordValue === registerConfirmPasswordValue,
    },
  ];
  const registerSellerBarFieldChecks = useMemo(() => {
    if (registerForm.role !== 'seller' && registerForm.role !== 'bar') return [];
    const name = String(registerForm.name || '').trim();
    const email = String(registerForm.email || '').trim();
    const city = String(registerForm.city || '').trim();
    const country = String(registerForm.country || '').trim();
    const pw = registerPasswordValue;
    const hasPasswordNumber = /\d/.test(pw);
    const hasPasswordSymbol = /[^A-Za-z0-9]/.test(pw);
    const termsOk = Boolean(registerForm.acceptedRespectfulConduct) && Boolean(registerForm.acceptedNoRefunds);
    return [
      { key: 'name', label: registerText.registerChecklistName || 'Name', passed: Boolean(name) },
      { key: 'email', label: registerText.registerChecklistEmail || 'Email', passed: Boolean(email) && email.includes('@') },
      { key: 'country', label: registerText.registerChecklistCountry || 'Country', passed: Boolean(country) },
      { key: 'city', label: registerText.registerChecklistCity || 'City', passed: Boolean(city) },
      {
        key: 'pwRules',
        label: registerText.registerChecklistPasswordRules || 'Password rules met',
        passed: pw.length >= 8 && hasPasswordNumber && hasPasswordSymbol,
      },
      {
        key: 'pwMatch',
        label: registerText.registerChecklistPasswordMatch || 'Passwords match',
        passed: registerConfirmPasswordValue.length > 0 && pw === registerConfirmPasswordValue,
      },
      { key: 'terms', label: registerText.registerChecklistTerms || 'Terms accepted', passed: termsOk },
    ];
  }, [
    registerForm.role,
    registerForm.name,
    registerForm.email,
    registerForm.city,
    registerForm.country,
    registerForm.acceptedRespectfulConduct,
    registerForm.acceptedNoRefunds,
    registerPasswordValue,
    registerConfirmPasswordValue,
    registerText.registerChecklistName,
    registerText.registerChecklistEmail,
    registerText.registerChecklistCountry,
    registerText.registerChecklistCity,
    registerText.registerChecklistPasswordRules,
    registerText.registerChecklistPasswordMatch,
    registerText.registerChecklistTerms,
    registerText.registerChecklistTitle,
  ]);
  const localizeSellerApiError = (apiErrorMessage, fallbackKey) => {
    const normalized = String(apiErrorMessage || '').trim();
    const keyByApiError = {
      'Product not found.': 'productNotFound',
      'Post not found.': 'postNotFound',
      'Report not found.': 'reportNotFound',
      'You can only delete your own products.': 'onlyOwnProducts',
      'You can only delete your own posts.': 'onlyOwnPosts',
      'Invalid delete request.': 'invalidDeleteRequest',
      'postId, reporterUserId, and reason are required.': 'reportFieldsRequired',
      'Invalid report payload.': 'invalidReportPayload',
      'Admin role is required.': 'adminRoleRequired',
      'Invalid resolve request.': 'invalidResolveRequest',
      'Seller not found.': 'sellerNotFound',
      'You already reported this post.': 'alreadyReported',
    };
    const mappedKey = keyByApiError[normalized];
    if (mappedKey) return sellerStatus(mappedKey);
    if (normalized) return normalized;
    return sellerStatus(fallbackKey);
  };
  const getApiHeaders = (baseHeaders = {}) => (
    apiAuthToken
      ? { ...baseHeaders, Authorization: `Bearer ${apiAuthToken}` }
      : { ...baseHeaders }
  );
  const createIdempotencyKey = (scope = 'req') => (
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? `${scope}_${crypto.randomUUID()}`
      : `${scope}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );
  async function apiRequestJson(path, {
    method = 'GET',
    body,
    headers = {},
    idempotencyScope = '',
    stableIdempotency = false,
  } = {}) {
    const nextHeaders = { ...headers };
    if (body !== undefined) {
      const hasContentType = Object.keys(nextHeaders).some((key) => key.toLowerCase() === 'content-type');
      if (!hasContentType) {
        nextHeaders['Content-Type'] = 'application/json';
      }
    }
    if (idempotencyScope && !nextHeaders['Idempotency-Key']) {
      const stableKey = stableIdempotency
        ? (apiIdempotencyKeysRef.current[idempotencyScope] || createIdempotencyKey(idempotencyScope))
        : createIdempotencyKey(idempotencyScope);
      nextHeaders['Idempotency-Key'] = stableKey;
      if (stableIdempotency) {
        apiIdempotencyKeysRef.current[idempotencyScope] = stableKey;
      }
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: getApiHeaders(nextHeaders),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (stableIdempotency && idempotencyScope && response.ok) {
      delete apiIdempotencyKeysRef.current[idempotencyScope];
    }
    if (response.status === 401 || response.status === 403) {
      setApiAuthToken('');
    }
    return { ok: response.ok, status: response.status, payload };
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function getPushRegistration() {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing) return existing;
      return navigator.serviceWorker.register('/sw.js');
    } catch {
      return null;
    }
  }

  async function fetchPushConfig() {
    if (backendStatus !== 'connected') return;
    const { ok, payload } = await apiRequestJson('/api/push/config');
    if (!ok) return;
    const enabled = Boolean(payload?.push?.enabled);
    const publicKey = String(payload?.push?.publicKey || '');
    setPushConfig({ enabled, publicKey });
  }

  async function subscribeToPushIfEnabled() {
    if (typeof window === 'undefined') return false;
    if (!currentUser || !apiAuthToken || backendStatus !== 'connected') return false;
    if (!pushConfig.enabled || !pushConfig.publicKey) return false;
    const { push: pushPref } = normalizeNotificationPreferences(
      currentUser.notificationPreferences,
      currentUser.role,
    );
    const shouldEnablePush =
      pushPref.message === true ||
      pushPref.engagement === true ||
      (currentUser.role === 'admin' && pushPref.adminOps === true);
    if (!shouldEnablePush) return false;
    const registration = await getPushRegistration();
    if (!registration || !registration.pushManager) return false;

    if (typeof Notification === 'undefined') return false;
    const permission = Notification.permission;
    if (permission !== 'granted') return false;
    setPushPermission(permission);

    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey)
    });
    const response = await apiRequestJson('/api/push/subscribe', {
      method: 'POST',
      body: {
        subscription: subscription.toJSON()
      }
    });
    return Boolean(response.ok);
  }

  async function unsubscribeFromPush() {
    if (typeof window === 'undefined') return false;
    const registration = await getPushRegistration();
    if (!registration || !registration.pushManager) return false;
    const existing = await registration.pushManager.getSubscription();
    if (!existing) return true;
    await apiRequestJson('/api/push/unsubscribe', {
      method: 'POST',
      body: {
        endpoint: existing.endpoint
      }
    });
    await existing.unsubscribe().catch(() => {});
    return true;
  }

  async function requestTextTranslation(text, targetLang) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText) return '';
    if (!SUPPORTED_AUTH_LANGUAGES.includes(targetLang)) return '';
    const response = await fetch(`${API_BASE_URL}/api/translate`, {
      method: 'POST',
      headers: getApiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text: normalizedText, targetLang }),
    });
    if (!response.ok) return '';
    const payload = await response.json().catch(() => ({}));
    return String(payload?.translatedText || '').trim();
  }

  async function buildTextTranslations(text) {
    const normalizedText = String(text || '').trim();
    if (!normalizedText || backendStatus !== 'connected') return {};
    const entries = await Promise.all(
      SUPPORTED_AUTH_LANGUAGES.map(async (lang) => {
        const translated = await requestTextTranslation(normalizedText, lang).catch(() => '');
        return [lang, translated || normalizedText];
      })
    );
    return Object.fromEntries(entries);
  }

  async function buildBilingualSellerEmailText(baseText, preferredLanguage) {
    const normalizedBase = String(baseText || '').trim();
    const normalizedLang = SUPPORTED_AUTH_LANGUAGES.includes(preferredLanguage) ? preferredLanguage : 'en';
    if (!normalizedBase || normalizedLang === 'en') return normalizedBase;
    const translated = await requestTextTranslation(normalizedBase, normalizedLang).catch(() => '');
    const normalizedTranslated = String(translated || '').trim();
    if (!normalizedTranslated) return normalizedBase;
    const languageLabel = {
      th: 'Thai',
      my: 'Burmese',
      ru: 'Russian',
    }[normalizedLang] || normalizedLang.toUpperCase();
    return `English:\n${normalizedBase}\n\n---\n${languageLabel}:\n${normalizedTranslated}`;
  }

  async function buildMessageTranslationsForRecipient(messageBody, senderUser, recipientUser) {
    const base = String(messageBody || '').trim();
    if (!base) return { sourceLanguage: 'en', translations: { en: '' } };
    const senderLanguage = SUPPORTED_AUTH_LANGUAGES.includes(senderUser?.preferredLanguage)
      ? senderUser.preferredLanguage
      : 'en';
    const recipientLanguage = SUPPORTED_AUTH_LANGUAGES.includes(recipientUser?.preferredLanguage)
      ? recipientUser.preferredLanguage
      : 'en';
    const translations = {
      [senderLanguage]: base,
    };
    const requiredLanguages = new Set(['en', recipientLanguage]);
    requiredLanguages.delete(senderLanguage);
    if (backendStatus === 'connected') {
      for (const language of requiredLanguages) {
        if (!SUPPORTED_AUTH_LANGUAGES.includes(language)) continue;
        const translated = await requestTextTranslation(base, language).catch(() => '');
        if (translated) {
          translations[language] = translated;
        }
      }
    }
    if (!translations.en) translations.en = base;
    if (!translations[recipientLanguage]) translations[recipientLanguage] = base;
    return {
      sourceLanguage: senderLanguage,
      translations: normalizeMessageTranslations(translations, base),
    };
  }

  const normalizeIdentityKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const namesLikelyMatch = (leftValue, rightValue) => {
    const left = normalizeIdentityKey(leftValue);
    const right = normalizeIdentityKey(rightValue);
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
  };
  const currentSellerId = currentUser?.sellerId || 'nina-b';
  const currentBarId = useMemo(() => {
    const explicitBarId = String(currentUser?.barId || '').trim();
    if (explicitBarId) return explicitBarId;
    if (currentUser?.role !== 'bar') return '';
    const matchedBar = (bars || []).find((bar) => namesLikelyMatch(currentUser?.name, bar?.name));
    if (matchedBar?.id) return String(matchedBar.id || '').trim();
    if ((bars || []).length === 1) return String(bars[0]?.id || '').trim();
    return '';
  }, [currentUser?.barId, currentUser?.role, currentUser?.name, bars]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('tlm-seller-post-drafts');
    if (!raw) {
      setSellerPostDraft((prev) => ({ ...prev, caption: '', image: '', imageName: '', scheduledFor: '', visibility: 'public', accessPriceUsd: MIN_FEED_UNLOCK_PRICE_THB }));
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const draft = parsed?.[currentSellerId];
      if (!draft) {
        setSellerPostDraft((prev) => ({ ...prev, caption: '', image: '', imageName: '', scheduledFor: '', visibility: 'public', accessPriceUsd: MIN_FEED_UNLOCK_PRICE_THB }));
        return;
      }
      setSellerPostDraft((prev) => ({
        ...prev,
        caption: String(draft.caption || '').slice(0, 500),
        scheduledFor: String(draft.scheduledFor || ''),
        visibility: draft.visibility === 'private' ? 'private' : 'public',
        accessPriceUsd: Number.isFinite(Number(draft.accessPriceUsd)) && Number(draft.accessPriceUsd) >= MIN_FEED_UNLOCK_PRICE_THB
          ? Number(Number(draft.accessPriceUsd).toFixed(2))
          : MIN_FEED_UNLOCK_PRICE_THB,
      }));
      setSellerPostDraftSavedAt(String(draft.savedAt || ''));
    } catch {
      setSellerPostDraft((prev) => ({ ...prev, caption: '', image: '', imageName: '', scheduledFor: '', visibility: 'public', accessPriceUsd: MIN_FEED_UNLOCK_PRICE_THB }));
    }
  }, [currentSellerId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !currentSellerId) return;
    const savedAt = new Date().toISOString();
    setSellerPostDraftSavedAt(savedAt);
    const raw = window.localStorage.getItem('tlm-seller-post-drafts');
    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = {};
    }
    parsed[currentSellerId] = {
      caption: sellerPostDraft.caption || '',
      scheduledFor: sellerPostDraft.scheduledFor || '',
      visibility: sellerPostDraft.visibility || 'public',
      accessPriceUsd: sellerPostDraft.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB,
      savedAt,
    };
    window.localStorage.setItem('tlm-seller-post-drafts', JSON.stringify(parsed));
  }, [sellerPostDraft, currentSellerId]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const intervalId = window.setInterval(() => setFeedNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const rawSellerMap = useMemo(
    () =>
      Object.fromEntries(
        reconciledSellers.map((seller) => {
          const resolvedImage = seller.profileImage || '';
          const resolvedImageName = seller.profileImageName || `${seller.name} profile`;
          return [
            seller.id,
            {
              ...seller,
              affiliatedBarName: seller.affiliatedBarId ? (barMap[seller.affiliatedBarId]?.name || '') : '',
              profileImageResolved: resolvedImage,
              profileImageNameResolved: resolvedImageName,
            },
          ];
        }),
      ),
    [reconciledSellers, barMap],
  );
  const sellerMap = useMemo(
    () =>
      Object.fromEntries(
        Object.values(rawSellerMap).map((seller) => [
          seller.id,
          {
            ...seller,
            location: resolveLocalizedText(seller?.location, seller?.locationI18n, uiLanguage),
            shipping: resolveLocalizedText(seller?.shipping, seller?.shippingI18n, uiLanguage),
            turnaround: resolveLocalizedText(seller?.turnaround, seller?.turnaroundI18n, uiLanguage),
            bio: resolveLocalizedText(seller?.bio, seller?.bioI18n, uiLanguage),
          },
        ]),
      ),
    [rawSellerMap, uiLanguage],
  );
  const localizedBarMap = useMemo(
    () =>
      Object.fromEntries(
        (bars || []).map((bar) => [
          bar.id,
          {
            ...bar,
            about: resolveLocalizedText(bar?.about, bar?.aboutI18n, uiLanguage),
            specials: resolveLocalizedText(bar?.specials, bar?.specialsI18n, uiLanguage),
          },
        ]),
      ),
    [bars, uiLanguage],
  );
  const routeInfo = parseRoute(route);
  const selectedBar = routeInfo.name === 'bar' ? localizedBarMap[routeInfo.id] || null : null;
  const reservedProductIdSet = useMemo(() => new Set(cart), [cart]);
  const soldProductIdSet = useMemo(() => {
    const soldIds = new Set();
    (orders || []).forEach((order) => {
      if (String(order?.paymentStatus || '').toLowerCase() !== 'paid') return;
      (order?.items || []).forEach((itemId) => {
        if (itemId) soldIds.add(String(itemId));
      });
    });
    return soldIds;
  }, [orders]);
  const availableProducts = useMemo(
    () => products.filter((product) => !reservedProductIdSet.has(product.id) && !soldProductIdSet.has(String(product?.id || ''))),
    [products, reservedProductIdSet, soldProductIdSet],
  );
  const selectedBarAffiliatedSellers = useMemo(() => {
    if (!selectedBar) return [];
    return (reconciledSellers || [])
      .filter((seller) => seller.affiliatedBarId === selectedBar.id)
      .map((seller) => sellerMap[seller.id] || seller);
  }, [selectedBar, reconciledSellers, sellerMap]);
  const selectedSeller = routeInfo.name === 'seller' ? sellerMap[routeInfo.id] || null : null;
  const sortProductsNewestFirst = (items) =>
    [...(items || [])].sort((a, b) => {
      const aTs = new Date(a?.publishedAt || a?.createdAt || 0).getTime();
      const bTs = new Date(b?.publishedAt || b?.createdAt || 0).getTime();
      return bTs - aTs;
    });
  const selectedSellerAllProducts = useMemo(
    () => (selectedSeller ? sortProductsNewestFirst(products.filter((product) => product.sellerId === selectedSeller.id)) : []),
    [products, selectedSeller],
  );
  const selectedSellerAvailableProducts = useMemo(
    () => (selectedSeller ? sortProductsNewestFirst(availableProducts.filter((product) => product.sellerId === selectedSeller.id)) : []),
    [availableProducts, selectedSeller],
  );
  const productsById = useMemo(
    () => Object.fromEntries((products || []).map((product) => [String(product.id || ''), product])),
    [products],
  );
  const selectedProduct = routeInfo.name === 'product'
    ? products.find((product) => product.slug === routeInfo.slug) || products.find((product) => String(product.id) === routeInfo.slug) || null
    : null;
  const selectedProductIsSold = Boolean(
    selectedProduct
    && (soldProductIdSet.has(String(selectedProduct.id || '')) || String(selectedProduct.status || '').toLowerCase() === 'sold')
  );
  const bundlesByItemId = useMemo(() => {
    const map = {};
    (products || []).forEach((product) => {
      if (!product?.isBundle) return;
      const itemIds = Array.isArray(product.bundleItemIds) ? product.bundleItemIds : [];
      itemIds.forEach((itemId) => {
        if (!map[itemId]) map[itemId] = [];
        map[itemId].push(product);
      });
    });
    return map;
  }, [products]);
  const selectedProductRelatedBundles = useMemo(() => {
    if (!selectedProduct || selectedProduct.isBundle) return [];
    return bundlesByItemId[selectedProduct.id] || [];
  }, [selectedProduct, bundlesByItemId]);
  const selectedProductPrimaryBundle = selectedProductRelatedBundles[0] || null;
  const cartBundleCoveredItemIds = useMemo(() => {
    const coveredIds = new Set();
    (cart || []).forEach((productId) => {
      const product = productsById[String(productId || '')];
      if (!product?.isBundle) return;
      const bundleItemIds = Array.isArray(product.bundleItemIds) ? product.bundleItemIds : [];
      bundleItemIds.forEach((itemId) => coveredIds.add(String(itemId || '')));
    });
    return coveredIds;
  }, [cart, productsById]);
  const selectedProductCoveredByBundleInCart = Boolean(
    selectedProduct
    && !selectedProduct.isBundle
    && cartBundleCoveredItemIds.has(String(selectedProduct.id || ''))
  );
  const [selectedProductImageIndex, setSelectedProductImageIndex] = useState(0);
  const getPrimaryBundleForProduct = (productId) => {
    if (!productId) return null;
    const matches = bundlesByItemId[productId] || [];
    return matches[0] || null;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentUser || currentUser.accountStatus !== 'frozen') return;
    if (routeInfo.name === 'appeals') return;
    if (lastFrozenPopupUserId === currentUser.id) return;
    setLastFrozenPopupUserId(currentUser.id);
    window.alert(loginText.accountFrozenAppeal || 'Your account is frozen after two moderation strikes. Please submit an appeal to continue.');
    navigate('/appeals');
  }, [currentUser, routeInfo.name, lastFrozenPopupUserId, loginText.accountFrozenAppeal]);

  const buyerOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter((order) => order.buyerUserId === currentUser.id || order.buyerEmail === currentUser.email);
  }, [orders, currentUser]);
  const buyerHasProcessingOrderForSelectedProduct = useMemo(() => {
    if (!selectedProduct || currentUser?.role !== 'buyer') return false;
    return (buyerOrders || []).some((order) => {
      const status = String(order?.fulfillmentStatus || '').toLowerCase();
      if (status !== 'processing') return false;
      return Array.isArray(order?.items) && order.items.includes(selectedProduct.id);
    });
  }, [buyerOrders, currentUser?.role, selectedProduct]);
  const recentBuyerOrders = useMemo(
    () => [...buyerOrders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [buyerOrders],
  );
  const barOrders = useMemo(() => {
    if (!currentUser || currentUser.role !== 'bar' || !currentUser.barId) return [];
    const affiliatedSellerIds = new Set();
    for (const s of sellers) {
      if (s.affiliatedBarId === currentUser.barId) affiliatedSellerIds.add(s.id);
    }
    if (affiliatedSellerIds.size === 0) return [];
    return orders.filter((order) =>
      (order.items || []).some((itemId) => {
        const product = products.find((p) => p.id === itemId);
        return product && affiliatedSellerIds.has(product.sellerId);
      })
    ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [currentUser, sellers, orders, products]);
  const sellerOrders = useMemo(() => {
    if (!currentUser || currentUser.role !== 'seller' || !currentUser.sellerId) return [];
    const sellerProductIds = new Set(
      products.filter((p) => p.sellerId === currentUser.sellerId).map((p) => p.id)
    );
    if (sellerProductIds.size === 0) return [];
    return orders.filter((order) =>
      (order.items || []).some((itemId) => sellerProductIds.has(itemId))
    ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [currentUser, products, orders]);
  const currentWalletBalance = Number(currentUser?.walletBalance || 0);
  const buyerLedger = useMemo(() => {
    if (!currentUser) return [];
    return [...walletTransactions]
      .filter((transaction) => transaction.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [walletTransactions, currentUser]);
  const selectedConversationId = selectedSeller && currentUser?.role === 'buyer' ? `${currentUser.id}__${selectedSeller.id}` : null;
  const selectedConversationMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return [...messages]
      .filter((message) => message.conversationId === selectedConversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, selectedConversationId]);
  const buyerConversations = useMemo(() => {
    if (!currentUser || currentUser.role !== 'buyer') return [];
    const grouped = {};
    messages.filter((message) => message.buyerId === currentUser.id).forEach((message) => {
      if (!grouped[message.conversationId]) grouped[message.conversationId] = [];
      grouped[message.conversationId].push(message);
    });
    return Object.entries(grouped)
      .map(([conversationId, conversation]) => {
        const sorted = [...conversation].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const latest = sorted[0];
        const unreadCount = conversation.filter((message) => !message.readByBuyer && message.senderRole === 'seller').length;
        return {
          conversationId,
          sellerId: latest?.sellerId || '',
          latestBody: latest?.body || '',
          latestAt: latest?.createdAt || null,
          latestSenderRole: latest?.senderRole || 'seller',
          unreadCount,
        };
      })
      .sort((a, b) => new Date(b.latestAt || 0) - new Date(a.latestAt || 0));
  }, [messages, currentUser]);
  const buyerSellerDirectory = useMemo(
    () => [...Object.values(sellerMap)].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [sellerMap],
  );
  const quickSellerResults = useMemo(() => {
    const query = accountSearchQuery.trim().toLowerCase();
    const source = query
      ? Object.values(sellerMap).filter((seller) =>
          [seller.name, seller.location, seller.bio].some((value) => (value || '').toLowerCase().includes(query)),
        )
      : Object.values(sellerMap);
    return source.slice(0, query ? 6 : 4);
  }, [sellerMap, accountSearchQuery]);
  const quickProductResults = useMemo(() => {
    const query = accountSearchQuery.trim().toLowerCase();
    const source = query
      ? products.filter((product) => {
          const sellerName = sellerMap[product.sellerId]?.name || '';
          return [product.title, product.style, product.fabric, sellerName].some((value) =>
            (value || '').toLowerCase().includes(query),
          );
        })
      : products;
    return source.slice(0, query ? 8 : 5);
  }, [products, sellerMap, accountSearchQuery]);
  const quickBarResults = useMemo(() => {
    const query = accountSearchQuery.trim().toLowerCase();
    const source = query
      ? Object.values(barMap).filter((bar) =>
          [bar.name, bar.location, bar.about, bar.specials].some((value) => (value || '').toLowerCase().includes(query)),
        )
      : Object.values(barMap);
    return source.slice(0, query ? 6 : 4);
  }, [barMap, accountSearchQuery]);
  const buyerMessageSellerResults = useMemo(() => {
    const query = buyerMessageSellerSearch.trim().toLowerCase();
    if (!query) return buyerSellerDirectory.slice(0, 8);
    return buyerSellerDirectory
      .filter((seller) => [seller.name, seller.location, seller.bio].some((value) => (value || '').toLowerCase().includes(query)))
      .slice(0, 8);
  }, [buyerSellerDirectory, buyerMessageSellerSearch]);
  const buyerMessageFilterOptions = useMemo(
    () => ({
      size: ['All', ...new Set([...SIZE_OPTIONS, ...products.map((product) => product.size || 'Not specified')])],
      style: ['All', ...new Set(products.map((product) => product.style || 'Not specified'))],
      fabric: ['All', ...new Set([...FABRIC_OPTIONS, ...products.map((product) => product.fabric || 'Not specified')])],
      daysWorn: ['All', ...new Set([...DAYS_WORN_OPTIONS, ...products.map((product) => product.daysWorn || 'Not specified')])],
    }),
    [products],
  );
  const buyerMessageProductResults = useMemo(() => {
    const query = buyerMessageProductFilters.search.trim().toLowerCase();
    return products
      .filter((product) => {
        const sellerName = sellerMap[product.sellerId]?.name || '';
        const matchesSearch = !query || [product.title, product.style, product.fabric, sellerName].some((value) => (value || '').toLowerCase().includes(query));
        const matchesSize = buyerMessageProductFilters.size === 'All' || product.size === buyerMessageProductFilters.size;
        const matchesStyle = buyerMessageProductFilters.style === 'All' || product.style === buyerMessageProductFilters.style;
        const matchesFabric = buyerMessageProductFilters.fabric === 'All' || product.fabric === buyerMessageProductFilters.fabric;
        const productDaysWorn = product.daysWorn || 'Not specified';
        const matchesDaysWorn = buyerMessageProductFilters.daysWorn === 'All' || productDaysWorn === buyerMessageProductFilters.daysWorn;
        const matchesPrice =
          buyerMessageProductFilters.price === 'All' ||
          (buyerMessageProductFilters.price === `Under ${formatPriceTHB(1400)}` && product.price < 1400) ||
          (buyerMessageProductFilters.price === `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}` && product.price >= 1400 && product.price <= 2000) ||
          (buyerMessageProductFilters.price === `${formatPriceTHB(2000)}+` && product.price >= 2000);
        return matchesSearch && matchesSize && matchesStyle && matchesFabric && matchesDaysWorn && matchesPrice;
      })
      .slice(0, 10);
  }, [products, sellerMap, buyerMessageProductFilters]);
  const buyerDashboardConversationMessages = useMemo(() => {
    if (!buyerDashboardConversationId) return [];
    return [...messages]
      .filter((message) => message.conversationId === buyerDashboardConversationId)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [messages, buyerDashboardConversationId]);
  const barMessageHistory = useMemo(() => {
    if (!currentUser) return [];
    const rows = (messages || []).filter((message) => {
      const parsed = parseBarConversationId(message.conversationId);
      if (!parsed) return false;
      if (currentUser.role === 'bar') return parsed.barId === currentUser.barId;
      if (currentUser.role === 'buyer' || currentUser.role === 'seller') {
        return parsed.participantRole === currentUser.role && parsed.participantUserId === currentUser.id;
      }
      return false;
    });
    return [...rows].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [messages, currentUser]);
  const barOutreachEligibilityByParticipantKey = useMemo(() => {
    if (!currentUser || currentUser.role !== 'bar') return {};
    const currentBarId = String(currentUser.barId || '').trim();
    if (!currentBarId) return {};
    const eligibilityMap = {};
    const upsert = (participantRole, participantUserId, createdAt, sourceType) => {
      const normalizedRole = participantRole === 'buyer' || participantRole === 'seller' ? participantRole : '';
      const normalizedUserId = String(participantUserId || '').trim();
      if (!normalizedRole || !normalizedUserId) return;
      if (normalizedUserId === String(currentUser.id || '').trim()) return;
      const key = `${normalizedRole}:${normalizedUserId}`;
      const existing = eligibilityMap[key];
      const nextTimestamp = new Date(createdAt || 0).getTime() || 0;
      const existingTimestamp = new Date(existing?.lastActivityAt || 0).getTime() || 0;
      const mergedSourceTypes = { ...(existing?.sourceTypes || {}) };
      if (sourceType) mergedSourceTypes[sourceType] = true;
      eligibilityMap[key] = {
        participantRole: normalizedRole,
        participantUserId: normalizedUserId,
        lastActivityAt: (!existing || nextTimestamp >= existingTimestamp)
          ? (createdAt || existing?.lastActivityAt || '')
          : (existing?.lastActivityAt || ''),
        sourceTypes: mergedSourceTypes,
      };
    };
    // Buyers: bars can only reply to buyers who contacted the bar first.
    // Sellers: bars can only message affiliated sellers.
    (messages || []).forEach((message) => {
      const parsedBarConversation = parseBarConversationId(message.conversationId);
      if (parsedBarConversation && parsedBarConversation.barId === currentBarId) {
        if (parsedBarConversation.participantRole === 'buyer') {
          upsert('buyer', parsedBarConversation.participantUserId, message.createdAt, 'direct_bar');
        }
      }
    });
    const affiliatedSellerUserIds = new Set();
    (reconciledSellers || []).forEach((seller) => {
      if (String(seller.affiliatedBarId || '').trim() === currentBarId) {
        const sellerUser = (users || []).find((user) => user.role === 'seller' && user.sellerId === seller.id);
        if (sellerUser?.id) affiliatedSellerUserIds.add(sellerUser.id);
      }
    });
    affiliatedSellerUserIds.forEach((userId) => {
      upsert('seller', userId, new Date().toISOString(), 'affiliate_seller');
    });
    return eligibilityMap;
  }, [messages, currentUser, sellers, users]);
  const barMessageEligibleContacts = useMemo(() => {
    if (!currentUser || currentUser.role !== 'bar') return [];
    const currentBarId = String(currentUser.barId || '').trim();
    const sourceRankByType = {
      affiliate_seller: 0,
      affiliate_message: 1,
      affiliate_sale: 2,
      direct_bar: 3,
    };
    return Object.values(barOutreachEligibilityByParticipantKey || [])
      .map((entry) => {
        const participantUser = users.find((user) => user.id === entry.participantUserId);
        const sourceTypes = entry?.sourceTypes || {};
        const sourceLabels = [
          sourceTypes.direct_bar ? 'Direct bar contact' : '',
        ].filter(Boolean);
        return {
          participantRole: entry.participantRole,
          participantUserId: entry.participantUserId,
          participantName: participantUser?.name || entry.participantUserId,
          conversationId: buildBarConversationId(currentBarId, entry.participantRole, entry.participantUserId),
          sourceLabels,
          sourceRank: Object.keys(sourceTypes).reduce((bestRank, sourceType) => {
            const nextRank = Number.isFinite(sourceRankByType[sourceType]) ? sourceRankByType[sourceType] : 99;
            return Math.min(bestRank, nextRank);
          }, 99),
          lastActivityAt: entry.lastActivityAt || '',
        };
      })
      .sort((a, b) => {
        const bySourceRank = Number(a.sourceRank || 99) - Number(b.sourceRank || 99);
        if (bySourceRank !== 0) return bySourceRank;
        const byTime = new Date(b.lastActivityAt || 0).getTime() - new Date(a.lastActivityAt || 0).getTime();
        if (byTime !== 0) return byTime;
        return String(a.participantName || '').localeCompare(String(b.participantName || ''));
      });
  }, [barOutreachEligibilityByParticipantKey, currentUser, users]);
  const barMessageInbox = useMemo(() => {
    if (!currentUser) return [];
    const grouped = {};
    barMessageHistory.forEach((message) => {
      if (!grouped[message.conversationId]) grouped[message.conversationId] = [];
      grouped[message.conversationId].push(message);
    });
    const inboxRows = Object.entries(grouped).map(([conversationId, conversation]) => {
      const sorted = [...conversation].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      const latest = sorted[0];
      const parsed = parseBarConversationId(conversationId);
      const participantUser = parsed ? users.find((entry) => entry.id === parsed.participantUserId) : null;
      const barEntity = parsed ? barMap?.[parsed.barId] : null;
      const hasUnread = currentUser.role === 'bar'
        ? sorted.some((entry) => !entry.readByBar && entry.senderRole !== 'bar')
        : sorted.some((entry) => !entry.readByParticipant && entry.senderRole === 'bar');
      return {
        ...latest,
        conversationId,
        participantRole: parsed?.participantRole || '',
        participantUserId: parsed?.participantUserId || '',
        participantName: participantUser?.name || parsed?.participantUserId || '',
        barId: parsed?.barId || '',
        barName: barEntity?.name || parsed?.barId || '',
        hasUnread,
      };
    });
    if (currentUser.role === 'bar') {
      const currentBarId = String(currentUser.barId || '').trim();
      const barName = barMap?.[currentBarId]?.name || currentBarId;
      const existingConversationIds = new Set(inboxRows.map((row) => row.conversationId));
      Object.values(barOutreachEligibilityByParticipantKey || {}).forEach((eligible) => {
        const conversationId = buildBarConversationId(currentBarId, eligible.participantRole, eligible.participantUserId);
        if (existingConversationIds.has(conversationId)) return;
        const participantUser = users.find((entry) => entry.id === eligible.participantUserId);
        inboxRows.push({
          id: `bar_outreach_${conversationId}`,
          conversationId,
          participantRole: eligible.participantRole,
          participantUserId: eligible.participantUserId,
          participantName: participantUser?.name || eligible.participantUserId,
          barId: currentBarId,
          barName,
          body: '',
          createdAt: eligible.lastActivityAt || '',
          hasUnread: false,
        });
      });
    }
    return inboxRows.sort((a, b) => {
        const unreadDiff = Number(Boolean(b.hasUnread)) - Number(Boolean(a.hasUnread));
        if (unreadDiff !== 0) return unreadDiff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [barMessageHistory, currentUser, users, barMap, barOutreachEligibilityByParticipantKey]);
  const barMessageActiveConversationId = barMessagesConversationId || barMessageInbox[0]?.conversationId || '';
  const barMessageActiveConversationMessages = useMemo(() => {
    if (!barMessageActiveConversationId) return [];
    return [...messages]
      .filter((message) => message.conversationId === barMessageActiveConversationId)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  }, [messages, barMessageActiveConversationId]);
  const pendingSellerApprovals = useMemo(
    () => users.filter((user) => user.role === 'seller' && user.accountStatus === 'pending'),
    [users],
  );
  const rejectedSellerApplications = useMemo(
    () => users.filter((user) => user.role === 'seller' && user.accountStatus === 'rejected'),
    [users],
  );
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const approvedTodaySellers = useMemo(
    () =>
      users.filter(
        (user) => user.role === 'seller' && user.accountStatus === 'active' && (user.approvedAt || '').slice(0, 10) === todayIsoDate,
      ),
    [users, todayIsoDate],
  );
  const adminSellerReviewItems = useMemo(() => {
    const source =
      adminSellerReviewFilter === 'rejected'
        ? rejectedSellerApplications
        : adminSellerReviewFilter === 'approved_today'
          ? approvedTodaySellers
          : adminSellerReviewFilter === 'all'
            ? users.filter((user) => user.role === 'seller')
            : pendingSellerApprovals;
    return [...source].sort((a, b) => new Date(a.sellerApplicationAt || a.createdAt || 0) - new Date(b.sellerApplicationAt || b.createdAt || 0));
  }, [adminSellerReviewFilter, rejectedSellerApplications, approvedTodaySellers, users, pendingSellerApprovals]);
  const currentSellerProfile = rawSellerMap[currentSellerId] || null;
  const currentBarProfile = barMap[currentBarId] || null;

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'seller') return;
    const sellerPantySize = currentUser.pantySize || '';
    if (sellerPantySize && SHARED_SIZE_OPTIONS.includes(sellerPantySize)) {
      setUploadDraft((prev) => prev.size === SIZE_OPTIONS[2] ? { ...prev, size: sellerPantySize } : prev);
    }
  }, [currentUser]);

  const sellerProfileChecklist = useMemo(() => {
    if (!currentSellerProfile) return ['Seller profile not found'];
    const checklist = [];
    if (!currentSellerProfile.location || currentSellerProfile.location === 'To be updated') checklist.push('Add location');
    if (!(Array.isArray(currentSellerProfile.languages) && currentSellerProfile.languages.length > 0)) checklist.push('Add language');
    if (!currentSellerProfile.bio || currentSellerProfile.bio.length < 20) checklist.push('Add a stronger bio');
    if (!currentSellerProfile?.height) checklist.push('Add your height');
    if (!currentSellerProfile?.weight) checklist.push('Add your weight');
    if (!currentSellerProfile?.hairColor) checklist.push('Add your hair color');
    if (!currentSellerProfile?.braSize) checklist.push('Add your bra size');
    return checklist;
  }, [currentSellerProfile, currentUser]);
  const adminSalesSummary = useMemo(() => {
    const productSales = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const customRequestSales = customRequests.reduce((sum, request) => {
      if ((request?.quoteStatus || '') !== 'accepted') return sum;
      if ((request?.status || '') === 'cancelled') return sum;
      return sum + Number(request?.quotedPriceThb || 0);
    }, 0);
    const totalSales = Number((productSales + customRequestSales).toFixed(2));
    return {
      totalSales,
      productSales: Number(productSales.toFixed(2)),
      customRequestSales: Number(customRequestSales.toFixed(2)),
      totalOrders: orders.length,
      customRequestOrders: customRequests.filter((request) => (request?.quoteStatus || '') === 'accepted' && (request?.status || '') !== 'cancelled').length,
      totalBuyers: users.filter((user) => user.role === 'buyer').length,
      totalSellers: users.filter((user) => user.role === 'seller').length,
    };
  }, [orders, customRequests, users]);
  const sellerSalesRows = useMemo(() => {
    const productPriceById = Object.fromEntries(products.map((product) => [product.id, Number(product.price || 0)]));
    return users
      .filter((user) => user.role === 'seller' && user.sellerId)
      .map((sellerUser) => {
        const sellerProductIds = products.filter((product) => product.sellerId === sellerUser.sellerId).map((product) => product.id);
        const sellerOrders = orders.filter((order) => (order.items || []).some((itemId) => sellerProductIds.includes(itemId)));
        const productSalesValue = sellerOrders.reduce((sum, order) => {
          const sellerItemTotal = (order.items || [])
            .filter((itemId) => sellerProductIds.includes(itemId))
            .reduce((itemSum, itemId) => itemSum + (productPriceById[itemId] || 0), 0);
          return sum + sellerItemTotal;
        }, 0);
        const customRequestSalesValue = customRequests.reduce((sum, request) => {
          if (request?.sellerId !== sellerUser.sellerId) return sum;
          if ((request?.quoteStatus || '') !== 'accepted') return sum;
          if ((request?.status || '') === 'cancelled') return sum;
          return sum + Number(request?.quotedPriceThb || 0);
        }, 0);
        const salesValue = productSalesValue + customRequestSalesValue;
        return {
          userId: sellerUser.id,
          sellerId: sellerUser.sellerId,
          name: sellerUser.name,
          email: sellerUser.email,
          orderCount: sellerOrders.length,
          customRequestOrderCount: customRequests.filter((request) => request?.sellerId === sellerUser.sellerId && (request?.quoteStatus || '') === 'accepted' && (request?.status || '') !== 'cancelled').length,
          productSalesValue: Number(productSalesValue.toFixed(2)),
          customRequestSalesValue: Number(customRequestSalesValue.toFixed(2)),
          salesValue: Number(salesValue.toFixed(2)),
        };
      })
      .sort((a, b) => b.salesValue - a.salesValue);
  }, [users, products, orders, customRequests]);
  const adminUserResults = useMemo(() => {
    const query = adminUserSearch.trim().toLowerCase();
    return users
      .filter((user) => user.role === 'buyer' || user.role === 'seller' || user.role === 'bar')
      .filter((user) => !(user.role === 'bar' && isLiveJunkBarRecord({ name: user.name || '' })))
      .filter((user) => {
        if (!query) return true;
        return [user.name, user.email, user.role, user.sellerId, user.barId]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, adminUserSearch]);
  const adminSelectedUser = useMemo(() => {
    if (adminSelectedUserId) {
      const selected = users.find((user) => user.id === adminSelectedUserId);
      if (selected) return selected;
    }
    return adminUserResults[0] || null;
  }, [users, adminSelectedUserId, adminUserResults]);
  const adminSelectedUserOrderHistory = useMemo(() => {
    if (!adminSelectedUser) return [];
    if (adminSelectedUser.role === 'buyer') {
      return orders
        .filter((order) => order.buyerUserId === adminSelectedUser.id || order.buyerEmail === adminSelectedUser.email)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    const sellerProductIds = products.filter((product) => product.sellerId === adminSelectedUser.sellerId).map((product) => product.id);
    return orders
      .filter((order) => (order.items || []).some((itemId) => sellerProductIds.includes(itemId)))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [adminSelectedUser, orders, products]);
  const adminSelectedUserMessageHistory = useMemo(() => {
    if (!adminSelectedUser) return [];
    return messages
      .filter((message) => {
        if (adminSelectedUser.role === 'buyer') return message.buyerId === adminSelectedUser.id;
        return message.sellerId === adminSelectedUser.sellerId;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [adminSelectedUser, messages]);
  const sellerInbox = useMemo(() => {
    if (!currentUser || currentUser.role !== 'seller') return [];
    const grouped = {};
    (messages || []).filter((message) => (
      message
      && typeof message === 'object'
      && message.sellerId === currentUser.sellerId
    )).forEach((message) => {
      if (!grouped[message.conversationId]) grouped[message.conversationId] = [];
      grouped[message.conversationId].push(message);
    });
    const buyerRows = Object.values(grouped)
      .map((conversation) => {
        const sortedConversation = [...conversation].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const latestMessage = sortedConversation[0];
        const hasUnread = sortedConversation.some((message) => !message.readBySeller);
        const buyerUser = users.find((u) => u.id === latestMessage.buyerId);
        return { ...latestMessage, hasUnread, buyerName: buyerUser?.name || '' };
      });

    const affiliatedBarId = currentSellerProfile?.affiliatedBarId;
    if (affiliatedBarId) {
      const barConvId = buildBarConversationId(affiliatedBarId, 'seller', currentUser.id);
      const barMsgs = (barMessageHistory || []).filter((m) => m.conversationId === barConvId);
      const barName = barMap[affiliatedBarId]?.name || 'Bar';
      const latestBarMsg = barMsgs[0];
      const hasBarUnread = barMsgs.some((m) => m.senderRole === 'bar' && !m.readByParticipant);
      buyerRows.push({
        conversationId: barConvId,
        barId: affiliatedBarId,
        _isBarThread: true,
        _barName: barName,
        body: latestBarMsg?.body || '',
        createdAt: latestBarMsg?.createdAt || new Date(0).toISOString(),
        hasUnread: hasBarUnread,
        senderRole: latestBarMsg?.senderRole || '',
      });
    }

    return buyerRows.sort((a, b) => {
      if (a._isBarThread && !b._isBarThread) return -1;
      if (!a._isBarThread && b._isBarThread) return 1;
        const unreadPriorityDiff = Number(Boolean(b.hasUnread)) - Number(Boolean(a.hasUnread));
        if (unreadPriorityDiff !== 0) return unreadPriorityDiff;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  }, [messages, currentUser, barMessageHistory, currentSellerProfile, barMap, users]);
  const sellerMessageHistory = useMemo(() => {
    if (!currentUser || currentUser.role !== 'seller') return [];
    return [...(messages || [])]
      .filter((message) => message && typeof message === 'object' && message.sellerId === currentUser.sellerId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [messages, currentUser]);
  const sellerCustomRequests = useMemo(() => {
    if (!currentUser || currentUser.role !== 'seller') return [];
    return [...customRequests]
      .filter((request) => request.sellerId === currentUser.sellerId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [customRequests, currentUser]);
  const buyerCustomRequests = useMemo(() => {
    if (!currentUser || currentUser.role !== 'buyer') return [];
    return [...customRequests]
      .filter((request) => request.buyerUserId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [customRequests, currentUser]);
  const customRequestMessagesByRequestId = useMemo(() => {
    const grouped = {};
    (customRequestMessages || []).forEach((message) => {
      if (!grouped[message.requestId]) grouped[message.requestId] = [];
      grouped[message.requestId].push(message);
    });
    Object.keys(grouped).forEach((requestId) => {
      grouped[requestId] = grouped[requestId].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    });
    return grouped;
  }, [customRequestMessages]);
  const sellerActiveConversationId = sellerSelectedConversationId || sellerInbox[0]?.conversationId || '';
  const sellerActiveConversationMessages = useMemo(() => {
    if (!sellerActiveConversationId) return [];
    if (sellerActiveConversationId.startsWith('barchat__')) {
      return [...(barMessageHistory || [])]
        .filter((message) => message.conversationId === sellerActiveConversationId)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    return [...messages]
      .filter((message) => message.conversationId === sellerActiveConversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, barMessageHistory, sellerActiveConversationId]);
  const unreadMessageCount = useMemo(() => {
    if (!currentUser) return 0;
    if (currentUser.role === 'buyer') {
      const sellerUnread = messages.filter((message) => message.buyerId === currentUser.id && message.senderRole === 'seller' && !message.readByBuyer).length;
      const barUnread = messages.filter((message) => {
        const parsed = parseBarConversationId(message.conversationId);
        if (!parsed) return false;
        return parsed.participantRole === 'buyer' && parsed.participantUserId === currentUser.id && message.senderRole === 'bar' && !message.readByParticipant;
      }).length;
      return sellerUnread + barUnread;
    }
    if (currentUser.role === 'seller') {
      const buyerUnread = messages.filter((message) => message.sellerId === currentUser.sellerId && message.senderRole === 'buyer' && !message.readBySeller).length;
      const barUnread = messages.filter((message) => {
        const parsed = parseBarConversationId(message.conversationId);
        if (!parsed) return false;
        return parsed.participantRole === 'seller' && parsed.participantUserId === currentUser.id && message.senderRole === 'bar' && !message.readByParticipant;
      }).length;
      return buyerUnread + barUnread;
    }
    if (currentUser.role === 'bar') {
      return messages.filter((message) => {
        const parsed = parseBarConversationId(message.conversationId);
        if (!parsed) return false;
        return parsed.barId === currentUser.barId && message.senderRole !== 'bar' && !message.readByBar;
      }).length;
    }
    return 0;
  }, [messages, currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'seller' && !sellerSelectedConversationId && sellerInbox[0]?.conversationId) {
      setSellerSelectedConversationId(sellerInbox[0].conversationId);
    }
  }, [currentUser, sellerInbox, sellerSelectedConversationId, messageRefreshTick]);

  useEffect(() => {
    if (!currentSellerProfile) return;
    setSellerProfileDraft({
      location: currentSellerProfile.location || '',
      languages: Array.isArray(currentSellerProfile.languages) && currentSellerProfile.languages.length > 0
        ? currentSellerProfile.languages.filter(Boolean)
        : (() => {
            const langMap = { en: 'English', th: 'Thai', my: 'Burmese', ru: 'Russian' };
            const fromPref = langMap[currentUser?.preferredLanguage];
            return fromPref ? [fromPref] : [];
          })(),
      bio: currentSellerProfile.bio || '',
      shipping: currentSellerProfile.shipping || 'Worldwide from Thailand',
      turnaround: currentSellerProfile.turnaround || 'Ships in 1-3 days',
      affiliatedBarId: currentSellerProfile.affiliatedBarId || '',
      profileImage: currentSellerProfile.profileImage || '',
      profileImageName: currentSellerProfile.profileImageName || '',
      height: currentSellerProfile.height || '',
      weight: currentSellerProfile.weight || '',
      hairColor: currentSellerProfile.hairColor || '',
      braSize: currentSellerProfile.braSize || '',
      pantySize: currentSellerProfile.pantySize || '',
      birthDay: currentSellerProfile.birthDay || null,
      birthMonth: currentSellerProfile.birthMonth || null,
      disabledGiftTypes: Array.isArray(currentSellerProfile.disabledGiftTypes) ? currentSellerProfile.disabledGiftTypes : [],
    });
  }, [currentSellerProfile?.id]);

  useEffect(() => {
    if (!currentBarProfile) return;
    const specialsText = String(currentBarProfile.specials || '');
    const specialsLower = specialsText.toLowerCase();
    setBarProfileDraft({
      location: currentBarProfile.location || '',
      about: currentBarProfile.about || '',
      specials: specialsText,
      mapEmbedUrl: currentBarProfile.mapEmbedUrl || '',
      mapLink: currentBarProfile.mapLink || '',
      profileImage: currentBarProfile.profileImage || '',
      profileImageName: currentBarProfile.profileImageName || '',
    });
    setBarSpecialPresetSelections(
      BAR_PROFILE_SPECIAL_PRESET_OPTIONS
        .filter((option) => Object.values(option.labels || {}).some((label) => specialsLower.includes(String(label || '').toLowerCase())))
        .map((option) => option.id)
    );
  }, [currentBarProfile?.id]);

  useEffect(() => {
    if (!currentBarProfile || !currentBarId) return;
    if (currentUser?.role !== 'bar') return;
    if (backendStatus !== 'connected' || !apiAuthToken) return;
    const hasLocalData = !!(currentBarProfile.profileImage || currentBarProfile.about || currentBarProfile.specials || currentBarProfile.mapLink);
    if (!hasLocalData) return;
    apiRequestJson(`/api/bars/${encodeURIComponent(currentBarId)}`, {
      method: 'PUT',
      body: {
        name: currentBarProfile.name || currentUser?.name || '',
        location: currentBarProfile.location || '',
        about: currentBarProfile.about || '',
        specials: currentBarProfile.specials || '',
        mapEmbedUrl: currentBarProfile.mapEmbedUrl || '',
        mapLink: currentBarProfile.mapLink || '',
        profileImage: currentBarProfile.profileImage || '',
        profileImageName: currentBarProfile.profileImageName || '',
        aboutI18n: currentBarProfile.aboutI18n || {},
        specialsI18n: currentBarProfile.specialsI18n || {},
      },
    }).catch(() => {});
  }, [currentBarProfile?.id, backendStatus, apiAuthToken]);

  useEffect(() => {
    if (currentUser?.role !== 'buyer') return;
    if (!buyerDashboardConversationId && buyerConversations[0]?.conversationId) {
      setBuyerDashboardConversationId(buyerConversations[0].conversationId);
    }
  }, [currentUser, buyerConversations, buyerDashboardConversationId]);

  useEffect(() => {
    if (currentUser?.role !== 'buyer' || !buyerDashboardConversationId) return;
    markNotificationsReadForConversation(buyerDashboardConversationId);
  }, [currentUser?.role, buyerDashboardConversationId]);

  useEffect(() => {
    if (!currentUser) return;
    if (!barMessagesConversationId && barMessageInbox[0]?.conversationId) {
      setBarMessagesConversationId(barMessageInbox[0].conversationId);
    }
  }, [currentUser, barMessageInbox, barMessagesConversationId, messageRefreshTick]);

  useEffect(() => {
    if (!currentUser || !barMessageActiveConversationId) return;
    markNotificationsReadForConversation(barMessageActiveConversationId);
  }, [currentUser?.role, barMessageActiveConversationId]);

  useEffect(() => {
    if (currentUser?.role === 'buyer') {
      setSellerCustomRequestDraft((prev) => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || '',
      }));
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(APP_MODE_STORAGE_KEY, JSON.stringify(appMode));
  }, [appMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedVersion = window.localStorage.getItem('tlm-db-version');
    if (storedVersion === DB_STORAGE_VERSION) return;
    if (IS_PRODUCTION_BUILD && !ENABLE_PROD_DATA_MIGRATION_RESET) {
      // In production we avoid automatic local data wipes unless explicitly enabled.
      window.localStorage.setItem('tlm-db-version', DB_STORAGE_VERSION);
      return;
    }

    // One-time migration: clear stale local data so refreshed seed/options are applied.
    window.localStorage.setItem('tlm-db-version', DB_STORAGE_VERSION);
    window.localStorage.removeItem('tlm-db');
    window.localStorage.removeItem('tlm-cart');
    window.localStorage.removeItem('tlm-checkout-step');
    window.localStorage.removeItem('tlm-checkout-buyer-email');
    window.localStorage.removeItem('tlm-checkout-form');
    window.localStorage.removeItem('tlm-session');
    window.localStorage.removeItem('tlm-api-token');
    setDb(buildRuntimeDbState(appMode === 'test' ? OFFICIAL_TEST_MODE_DB : {}, appMode));
    setCart([]);
    setCheckoutStep(1);
    setBuyerEmail('');
    setCheckoutForm(normalizeCheckoutFormDraft(null));
    setSession({ userId: null });
  }, [appMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (appMode === 'test') {
      setBackendStatus('offline');
      return;
    }

    const loadBootstrap = async () => {
      const BOOTSTRAP_FETCH_MS = 15000;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), BOOTSTRAP_FETCH_MS);
      try {
        const response = await fetch(`${API_BASE_URL}/api/bootstrap`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setBackendStatus('offline');
          return;
        }
        const payload = await response.json();
        const hasLocalDb = !!window.localStorage.getItem('tlm-db');
        if (!hasLocalDb && payload?.db) {
          setDb(buildRuntimeDbState(payload.db, appMode));
        } else if (hasLocalDb && payload?.db) {
          setDb((prev) => {
            let changed = false;
            let merged = { ...prev };
            const serverUsers = Array.isArray(payload.db.users) ? payload.db.users : [];
            if (serverUsers.length > 0) {
              const localUserIds = new Set((prev.users || []).map((u) => u.id));
              const newUsers = serverUsers.filter((u) => u?.id && !localUserIds.has(u.id));
              if (newUsers.length > 0) {
                merged.users = [...prev.users, ...newUsers];
                changed = true;
              }
            }
            const serverBars = Array.isArray(payload.db.bars) ? payload.db.bars : [];
            if (serverBars.length > 0) {
              const localBarMap = new Map((merged.bars || []).map((b) => [String(b?.id || ''), b]));
              let barsUpdated = false;
              serverBars.forEach((serverBar) => {
                if (!serverBar?.id || isLiveJunkBarRecord(serverBar)) return;
                const id = String(serverBar.id);
                const local = localBarMap.get(id);
                if (!local) {
                  localBarMap.set(id, serverBar);
                  barsUpdated = true;
                } else {
                  localBarMap.set(id, { ...local, ...serverBar });
                  barsUpdated = true;
                }
              });
              if (barsUpdated) {
                merged.bars = Array.from(localBarMap.values());
                changed = true;
              }
            }
            const barIds = new Set((merged.bars || []).map((b) => String(b?.id || '')));
            const missingBars = (merged.users || [])
              .filter((u) => u.role === 'bar' && u.barId && !barIds.has(String(u.barId)))
              .filter((u) => !isLiveJunkBarRecord({ name: u.name || '' }))
              .map((u) => ({
                id: u.barId, name: u.name || '',
                location: [u.city, u.country].filter(Boolean).join(', '),
                about: '', specials: '', mapEmbedUrl: '', mapLink: '', profileImage: '', profileImageName: '',
              }));
            if (missingBars.length > 0) {
              merged.bars = [...(merged.bars || []), ...missingBars];
              changed = true;
            }
            const barsAfterJunk = filterLiveJunkBarsForMode(merged.bars, appMode);
            if (barsAfterJunk.length !== (merged.bars || []).length) {
              changed = true;
              merged.bars = barsAfterJunk;
            } else {
              merged.bars = barsAfterJunk;
            }
            const serverSellers = Array.isArray(payload.db.sellers) ? payload.db.sellers : [];
            if (serverSellers.length > 0) {
              const localSellerMap = new Map((merged.sellers || []).map((s) => [String(s?.id || ''), s]));
              let sellersUpdated = false;
              serverSellers.forEach((serverSeller) => {
                if (!serverSeller?.id) return;
                const id = String(serverSeller.id);
                const local = localSellerMap.get(id);
                if (!local) {
                  localSellerMap.set(id, serverSeller);
                  sellersUpdated = true;
                } else {
                  localSellerMap.set(id, { ...local, ...serverSeller });
                  sellersUpdated = true;
                }
              });
              if (sellersUpdated) {
                merged.sellers = Array.from(localSellerMap.values());
                changed = true;
              }
            }
            const serverReqs = Array.isArray(payload.db.barAffiliationRequests) ? payload.db.barAffiliationRequests : [];
            if (serverReqs.length > 0) {
              const localReqMap = new Map((merged.barAffiliationRequests || []).map((r) => [r?.id, r]));
              let reqsUpdated = false;
              serverReqs.forEach((serverReq) => {
                if (!serverReq?.id) return;
                const local = localReqMap.get(serverReq.id);
                if (!local) {
                  localReqMap.set(serverReq.id, serverReq);
                  reqsUpdated = true;
                } else if (serverReq.status !== 'pending' && local.status === 'pending') {
                  localReqMap.set(serverReq.id, { ...local, ...serverReq });
                  reqsUpdated = true;
                }
              });
              if (reqsUpdated) {
                merged.barAffiliationRequests = Array.from(localReqMap.values());
                changed = true;
              }
            }
            const serverPosts = Array.isArray(payload.db.sellerPosts) ? payload.db.sellerPosts : [];
            if (serverPosts.length > 0) {
              const localPostMap = new Map((merged.sellerPosts || []).map((p) => [p?.id, p]));
              let postsUpdated = false;
              serverPosts.forEach((serverPost) => {
                if (!serverPost?.id) return;
                const local = localPostMap.get(serverPost.id);
                if (!local) {
                  localPostMap.set(serverPost.id, serverPost);
                  postsUpdated = true;
                } else {
                  localPostMap.set(serverPost.id, { ...local, ...serverPost });
                  postsUpdated = true;
                }
              });
              if (postsUpdated) {
                merged.sellerPosts = Array.from(localPostMap.values());
                changed = true;
              }
            }
            const serverBarPosts = Array.isArray(payload.db.barPosts) ? payload.db.barPosts : [];
            if (serverBarPosts.length > 0) {
              const localBarPostMap = new Map((merged.barPosts || []).map((p) => [p?.id, p]));
              let barPostsUpdated = false;
              serverBarPosts.forEach((serverPost) => {
                if (!serverPost?.id) return;
                const local = localBarPostMap.get(serverPost.id);
                if (!local) {
                  localBarPostMap.set(serverPost.id, serverPost);
                  barPostsUpdated = true;
                } else {
                  localBarPostMap.set(serverPost.id, { ...local, ...serverPost });
                  barPostsUpdated = true;
                }
              });
              if (barPostsUpdated) {
                merged.barPosts = Array.from(localBarPostMap.values());
                changed = true;
              }
            }
            const approvedReqs = (merged.barAffiliationRequests || []).filter((r) => r.status === 'approved');
            if (approvedReqs.length > 0) {
              const reconSellerMap = new Map((merged.sellers || []).map((s) => [s.id, s]));
              let sellersReconciled = false;
              approvedReqs.forEach((req) => {
                const seller = reconSellerMap.get(req.sellerId);
                if (seller && String(seller.affiliatedBarId || '').trim() !== String(req.barId || '').trim()) {
                  reconSellerMap.set(req.sellerId, { ...seller, affiliatedBarId: req.barId });
                  sellersReconciled = true;
                }
              });
              if (sellersReconciled) {
                merged.sellers = Array.from(reconSellerMap.values());
                changed = true;
              }
            }
            const serverMessages = Array.isArray(payload.db.messages) ? payload.db.messages : [];
            if (serverMessages.length > 0) {
              const localMsgIds = new Set((merged.messages || []).map((m) => m?.id));
              const newMsgs = serverMessages.filter((m) => m?.id && !localMsgIds.has(m.id));
              if (newMsgs.length > 0) {
                merged.messages = [...(merged.messages || []), ...newMsgs];
                changed = true;
              }
            }
            const serverProducts = Array.isArray(payload.db.products) ? payload.db.products : [];
            if (serverProducts.length > 0) {
              const localProductMap = new Map((merged.products || []).map((p) => [String(p?.id || ''), p]));
              let productsUpdated = false;
              serverProducts.forEach((serverProduct) => {
                if (!serverProduct?.id) return;
                const id = String(serverProduct.id);
                const local = localProductMap.get(id);
                if (!local) {
                  localProductMap.set(id, serverProduct);
                  productsUpdated = true;
                } else {
                  localProductMap.set(id, { ...local, ...serverProduct });
                  productsUpdated = true;
                }
              });
              if (productsUpdated) {
                merged.products = Array.from(localProductMap.values());
                changed = true;
              }
            }
            return changed ? merged : prev;
          });
        }
        setBackendStatus('connected');
      } catch {
        setBackendStatus('offline');
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    loadBootstrap();
  }, [appMode]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'buyer') return;
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const todayDay = now.getDate();
    const todayMonth = now.getMonth() + 1;
    const todayKey = `birthday-notif-${todayDay}-${todayMonth}`;
    const birthdaySellers = (db.sellers || []).filter((s) => s.birthDay === todayDay && s.birthMonth === todayMonth);
    if (birthdaySellers.length === 0) return;
    const existingNotifIds = new Set((db.notifications || []).map((n) => String(n?.id || '')));
    const newNotifs = birthdaySellers
      .filter((s) => !existingNotifIds.has(`birthday_${s.id}_${todayKey}`))
      .map((s) => ({
        id: `birthday_${s.id}_${todayKey}`,
        userId: currentUser.id,
        type: 'birthday',
        title: { en: `${s.name || 'A seller'}'s birthday is today!` },
        body: { en: `Send ${s.name || 'them'} a gift to celebrate!` },
        route: `/seller/${s.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      }));
    if (newNotifs.length > 0) {
      setDb((prev) => ({ ...prev, notifications: [...newNotifs, ...(prev.notifications || [])] }));
    }
  }, [currentUser?.id, currentUser?.role, db.sellers]);

  useEffect(() => {
    if (backendStatus !== 'connected') return;
    if (emailDispatchInFlightRef.current) return;
    const queuedEmails = (emailDeliveryLog || []).filter((entry) => entry.status === 'queued').slice(0, 5);
    if (queuedEmails.length === 0) return;

    emailDispatchInFlightRef.current = true;
    const dispatchEmails = async () => {
      try {
        for (const queued of queuedEmails) {
          const markSendingAt = new Date().toISOString();
          setDb((prev) => ({
            ...prev,
            emailDeliveryLog: (prev.emailDeliveryLog || []).map((entry) => (
              entry.id === queued.id && entry.status === 'queued'
                ? { ...entry, status: 'sending', sendingStartedAt: markSendingAt }
                : entry
            )),
          }));

          try {
            const recipientUser = (users || []).find((user) => user.id === queued.userId);
            let outboundSubject = queued.subject;
            let outboundText = queued.body;
            const recipientLang = SUPPORTED_AUTH_LANGUAGES.includes(recipientUser?.preferredLanguage)
              ? recipientUser.preferredLanguage
              : 'en';
            if (recipientUser?.role === 'seller' && recipientLang !== 'en') {
              const [translatedSubject, bilingualBody] = await Promise.all([
                requestTextTranslation(outboundSubject, recipientLang).catch(() => ''),
                buildBilingualSellerEmailText(outboundText, recipientLang),
              ]);
              outboundSubject = translatedSubject
                ? `${outboundSubject} | ${translatedSubject}`
                : outboundSubject;
              outboundText = bilingualBody || outboundText;
            }
            const response = await fetch(`${API_BASE_URL}/api/notifications/platform-email`, {
              method: 'POST',
              headers: getApiHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({
                toEmail: queued.toEmail,
                toName: queued.toName,
                subject: outboundSubject,
                text: outboundText,
                templateKey: queued.templateKey,
                actionUrl: queued.actionUrl,
              }),
            });
            const payload = await response.json().catch(() => ({}));
            const emailResult = payload?.email || {};
            const delivered = Boolean(emailResult.delivered);
            const mocked = Boolean(emailResult.mock) && !delivered;
            const nextStatus = delivered ? 'sent' : mocked ? 'mocked' : 'failed';
            const dispatchedAt = new Date().toISOString();
            setDb((prev) => ({
              ...prev,
              emailDeliveryLog: (prev.emailDeliveryLog || []).map((entry) => (
                entry.id === queued.id
                  ? {
                      ...entry,
                      status: nextStatus,
                      dispatchedAt,
                      dispatchedSubject: outboundSubject,
                      dispatchedBody: outboundText,
                      deliveryMode: emailResult.mode || null,
                      recipients: emailResult.recipients || [queued.toEmail],
                      lastError: !delivered ? (emailResult.reason || `request_failed_${response.status}`) : null,
                    }
                  : entry
              )),
            }));
          } catch {
            const dispatchedAt = new Date().toISOString();
            setDb((prev) => ({
              ...prev,
              emailDeliveryLog: (prev.emailDeliveryLog || []).map((entry) => (
                entry.id === queued.id
                  ? {
                      ...entry,
                      status: 'failed',
                      dispatchedAt,
                      lastError: 'network_error',
                    }
                  : entry
              )),
            }));
          }
        }
      } finally {
        emailDispatchInFlightRef.current = false;
      }
    };

    dispatchEmails();
  }, [backendStatus, emailDeliveryLog]);

  useEffect(() => {
    const nowMs = Date.now();
    const staleThresholdMs = 24 * 60 * 60 * 1000;
    const existingNudges = new Set(
      (inactivityNudges || [])
        .filter((entry) => (nowMs - new Date(entry.nudgedAt || 0).getTime()) < staleThresholdMs)
        .map((entry) => entry.nudgeKey),
    );
    const usersById = {};
    const sellerUserBySellerId = {};
    (users || []).forEach((user) => {
      usersById[user.id] = user;
      if (user.role === 'seller' && user.sellerId) {
        sellerUserBySellerId[user.sellerId] = user;
      }
    });

    const candidates = [];

    const latestMessageByConversation = {};
    (messages || []).forEach((message) => {
      const existing = latestMessageByConversation[message.conversationId];
      if (!existing || new Date(message.createdAt || 0).getTime() > new Date(existing.createdAt || 0).getTime()) {
        latestMessageByConversation[message.conversationId] = message;
      }
    });
    Object.values(latestMessageByConversation).forEach((latest) => {
      const latestAtMs = new Date(latest.createdAt || 0).getTime();
      if (!latestAtMs || (nowMs - latestAtMs) < staleThresholdMs) return;
      const sellerUser = sellerUserBySellerId[latest.sellerId];
      const recipientUserId = latest.senderRole === 'buyer' ? sellerUser?.id : latest.buyerId;
      const recipient = usersById[recipientUserId];
      if (!recipient || recipient.accountStatus !== 'active') return;
      const nudgeKey = `dm:${latest.conversationId}:${recipientUserId}`;
      if (existingNudges.has(nudgeKey)) return;
      candidates.push({
        nudgeKey,
        recipientUserId,
        notificationType: 'message',
        notificationText: `Reply reminder: conversation ${latest.conversationId} has been waiting for over 24 hours.`,
        templateKey: recipient.role === 'seller' ? 'seller_message_received' : 'buyer_message_received',
        vars: {
          senderName: 'ThP Support',
          conversationId: latest.conversationId,
          actionPath: '/account',
        },
        fallbackPath: '/account',
      });
    });

    (customRequests || []).forEach((request) => {
      if (!['open', 'reviewing'].includes(request.status)) return;
      const staleAt = new Date(request.updatedAt || request.createdAt || 0).getTime();
      if (!staleAt || (nowMs - staleAt) < staleThresholdMs) return;
      const sellerUser = sellerUserBySellerId[request.sellerId];
      if (!sellerUser || sellerUser.accountStatus !== 'active') return;
      const nudgeKey = `custom_request_status:${request.id}:${sellerUser.id}`;
      if (existingNudges.has(nudgeKey)) return;
      candidates.push({
        nudgeKey,
        recipientUserId: sellerUser.id,
        notificationType: 'message',
        notificationText: `Review reminder: custom request ${request.id} has been waiting over 24 hours.`,
        templateKey: 'custom_request_received',
        vars: {
          buyerName: request.buyerName || 'Buyer',
          requestId: request.id,
          actionPath: '/custom-requests',
        },
        fallbackPath: '/custom-requests',
      });
    });

    const latestCustomRequestMessageByRequestId = {};
    (customRequestMessages || []).forEach((message) => {
      const existing = latestCustomRequestMessageByRequestId[message.requestId];
      if (!existing || new Date(message.createdAt || 0).getTime() > new Date(existing.createdAt || 0).getTime()) {
        latestCustomRequestMessageByRequestId[message.requestId] = message;
      }
    });
    Object.values(latestCustomRequestMessageByRequestId).forEach((latest) => {
      const latestAtMs = new Date(latest.createdAt || 0).getTime();
      if (!latestAtMs || (nowMs - latestAtMs) < staleThresholdMs) return;
      const request = (customRequests || []).find((entry) => entry.id === latest.requestId);
      if (!request || ['fulfilled', 'closed'].includes(request.status)) return;
      const sellerUser = sellerUserBySellerId[request.sellerId];
      const recipientUserId = latest.senderRole === 'buyer' ? sellerUser?.id : request.buyerUserId;
      const recipient = usersById[recipientUserId];
      if (!recipient || recipient.accountStatus !== 'active') return;
      const nudgeKey = `custom_request_message:${latest.requestId}:${recipientUserId}`;
      if (existingNudges.has(nudgeKey)) return;
      candidates.push({
        nudgeKey,
        recipientUserId,
        notificationType: 'message',
        notificationText: `Reply reminder: custom request ${latest.requestId} has had no response for over 24 hours.`,
        templateKey: recipient.role === 'seller' ? 'seller_message_received' : 'buyer_message_received',
        vars: {
          senderName: 'ThP Support',
          conversationId: latest.requestId,
          actionPath: '/custom-requests',
        },
        fallbackPath: '/custom-requests',
      });
    });

    if (candidates.length === 0) return;

    setDb((prev) => {
      const refreshedNudgeSet = new Set(
        (prev.inactivityNudges || [])
          .filter((entry) => (nowMs - new Date(entry.nudgedAt || 0).getTime()) < staleThresholdMs)
          .map((entry) => entry.nudgeKey),
      );
      const due = candidates.filter((candidate) => !refreshedNudgeSet.has(candidate.nudgeKey)).slice(0, 8);
      if (due.length === 0) return prev;
      const nudgedAt = new Date().toISOString();
      let next = { ...prev };
      due.forEach((candidate) => {
        const recipient = (next.users || []).find((user) => user.id === candidate.recipientUserId);
        if (!recipient) return;
        if (shouldSendNotificationForType(recipient, candidate.notificationType)) {
          next = {
            ...next,
            notifications: [
              ...(next.notifications || []),
              {
                id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                userId: candidate.recipientUserId,
                type: candidate.notificationType,
                text: candidate.notificationText,
                read: false,
                createdAt: nudgedAt,
              },
            ],
          };
        }
        next = appendTemplatedEmail(next, {
          templateKey: candidate.templateKey,
          userId: candidate.recipientUserId,
          vars: candidate.vars,
          fallbackPath: candidate.fallbackPath,
        });
      });
      return {
        ...next,
        inactivityNudges: [
          ...due.map((candidate) => ({
            id: `inactivity_nudge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            nudgeKey: candidate.nudgeKey,
            recipientUserId: candidate.recipientUserId,
            nudgedAt,
          })),
          ...(next.inactivityNudges || []),
        ].slice(0, 2500),
      };
    });
  }, [messages, customRequests, customRequestMessages, users, inactivityNudges]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-db', JSON.stringify(db));
  }, [db]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-checkout-step', JSON.stringify(normalizeCheckoutStep(checkoutStep)));
  }, [checkoutStep]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-admin-tab', JSON.stringify(String(adminTab || 'overview')));
  }, [adminTab]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-admin-impersonation', JSON.stringify(adminImpersonation));
  }, [adminImpersonation]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-checkout-buyer-email', JSON.stringify(String(buyerEmail || '')));
  }, [buyerEmail]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-checkout-form', JSON.stringify(normalizeCheckoutFormDraft(checkoutForm)));
  }, [checkoutForm]);

  useEffect(() => () => {
    if (cartNoticeTimerRef.current) clearTimeout(cartNoticeTimerRef.current);
    if (cartPulseTimerRef.current) clearTimeout(cartPulseTimerRef.current);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-session', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-api-token', JSON.stringify(apiAuthToken || ''));
  }, [apiAuthToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('tlm-auth-language', JSON.stringify(authLanguage));
  }, [authLanguage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromStorage = () => {
      const nextCart = readStore('tlm-cart', []);
      const nextCheckoutStep = normalizeCheckoutStep(readStore('tlm-checkout-step', 1));
      const nextAdminTab = String(readStore('tlm-admin-tab', 'overview') || 'overview');
      const nextCheckoutBuyerEmail = String(readStore('tlm-checkout-buyer-email', '') || '');
      const nextCheckoutForm = normalizeCheckoutFormDraft(readStore('tlm-checkout-form', null));
      const nextSession = readStore('tlm-session', { userId: null });
      const nextApiAuthToken = String(readStore('tlm-api-token', '') || '');
      const nextAuthLanguage = normalizeAuthLanguage(readStore('tlm-auth-language', 'en'));
      setCart((prev) => JSON.stringify(prev) === JSON.stringify(nextCart) ? prev : nextCart);
      setCheckoutStep((prev) => (prev === nextCheckoutStep ? prev : nextCheckoutStep));
      setAdminTab((prev) => (prev === nextAdminTab ? prev : nextAdminTab));
      setBuyerEmail((prev) => (prev === nextCheckoutBuyerEmail ? prev : nextCheckoutBuyerEmail));
      setCheckoutForm((prev) => (JSON.stringify(prev) === JSON.stringify(nextCheckoutForm) ? prev : nextCheckoutForm));
      setSession((prev) => JSON.stringify(prev) === JSON.stringify(nextSession) ? prev : nextSession);
      setApiAuthToken((prev) => prev === nextApiAuthToken ? prev : nextApiAuthToken);
      setAuthLanguage((prev) => prev === nextAuthLanguage ? prev : nextAuthLanguage);
      setMessageRefreshTick((tick) => tick + 1);
    };

    const onStorage = (event) => {
      if (!event.key || ['tlm-cart', 'tlm-checkout-step', 'tlm-admin-tab', 'tlm-checkout-buyer-email', 'tlm-checkout-form', 'tlm-session', 'tlm-api-token', 'tlm-auth-language'].includes(event.key)) {
        syncFromStorage();
      }
    };

    const onFocusOrVisible = () => syncFromStorage();
    const intervalId = window.setInterval(syncFromStorage, 2500);

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => setRoute(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPushSupport({
      serviceWorker: 'serviceWorker' in navigator,
      notification: 'Notification' in window,
      pushManager: 'PushManager' in window,
    });
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const chunkRecoveryKey = 'tlm-chunk-recovery-at';
    const shouldRecoverFromMessage = (message) => {
      const normalized = String(message || '');
      return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|Failed to load module script/i.test(normalized);
    };
    const recoverFromStaleClient = async () => {
      const attemptedAt = Number(window.sessionStorage.getItem(chunkRecoveryKey) || 0);
      if (Date.now() - attemptedAt < 120000) return;
      window.sessionStorage.setItem(chunkRecoveryKey, String(Date.now()));
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister().catch(() => {})));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key).catch(() => {})));
        }
      } finally {
        window.location.reload();
      }
    };
    const onWindowError = (event) => {
      const message = String(event?.message || event?.error?.message || '');
      if (!shouldRecoverFromMessage(message)) return;
      event?.preventDefault?.();
      recoverFromStaleClient().catch(() => {});
    };
    const onUnhandledRejection = (event) => {
      const reason = event?.reason;
      const message = String(reason?.message || reason || '');
      if (!shouldRecoverFromMessage(message)) return;
      event?.preventDefault?.();
      recoverFromStaleClient().catch(() => {});
    };
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    fetchPushConfig().catch(() => {});
  }, [backendStatus]);

  useEffect(() => {
    if (!currentUser || !apiAuthToken) return;
    subscribeToPushIfEnabled().catch(() => {});
  }, [currentUser?.id, currentUser?.role, backendStatus, apiAuthToken, pushConfig.enabled, pushConfig.publicKey, currentUser?.notificationPreferences]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search || '');
    const scope = String(params.get('scope') || '').trim();
    const conversationId = String(params.get('conversationId') || '').trim();
    const requestId = String(params.get('requestId') || '').trim();
    if (!currentUser || (route !== '/account' && route !== '/bar-messages')) return;
    if (currentUser.role === 'seller' && scope === 'seller') {
      if (conversationId) setSellerSelectedConversationId(conversationId);
      if (requestId) {
        setSellerSelectedConversationId((prev) => prev || '');
      }
    }
    if (currentUser.role === 'buyer' && conversationId) {
      setBuyerDashboardConversationId(conversationId);
    }
    if ((currentUser.role === 'buyer' || currentUser.role === 'seller' || currentUser.role === 'bar') && conversationId && parseBarConversationId(conversationId)) {
      setBarMessagesConversationId(conversationId);
    }
  }, [route, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (parseRoute(route).name !== 'verify-email') {
      setEmailVerificationStatus((prev) => (
        prev.loading || prev.message
          ? { loading: false, message: '', tone: 'neutral' }
          : prev
      ));
      return;
    }
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search || '');
    const email = String(params.get('email') || '').trim().toLowerCase();
    const token = String(params.get('token') || '').trim();
    if (!email || !token) {
      setEmailVerificationStatus({
        loading: false,
        message: loginText.verifyInvalidLink || 'Verification link is invalid. Please request a new verification email.',
        tone: 'error',
      });
      return;
    }
    let isActive = true;
    setEmailVerificationStatus({
      loading: true,
      message: loginText.verifyInProgress || 'Verifying your email...',
      tone: 'neutral',
    });
    Promise.resolve(apiRequestJson('/api/auth/verify-email', {
      method: 'POST',
      body: { email, token },
    }))
      .then(({ ok, payload }) => {
        if (!isActive) return;
        if (!ok) {
          setEmailVerificationStatus({
            loading: false,
            message: String(payload?.error || loginText.verifyFailedRequestNew || 'Verification failed. Please request a new link.'),
            tone: 'error',
          });
          return;
        }
        setEmailVerificationStatus({
          loading: false,
          message: String(payload?.message || loginText.verifySuccess || 'Email verified. You can now log in.'),
          tone: 'success',
        });
      })
      .catch(() => {
        if (!isActive) return;
        setEmailVerificationStatus({
          loading: false,
          message: loginText.verifyFailedTryAgain || 'Verification failed. Please try again.',
          tone: 'error',
        });
      });
    return () => {
      isActive = false;
    };
  }, [route, authLanguage, loginText.verifySuccess, loginText.verifyInvalidLink, loginText.verifyInProgress, loginText.verifyFailedRequestNew, loginText.verifyFailedTryAgain]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.title = SEO_CONFIG.title;

    const ensureMeta = (name, content, attr = 'name') => {
      let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    ensureMeta('description', SEO_CONFIG.description);
    ensureMeta('keywords', SEO_CONFIG.keywords.join(', '));
    ensureMeta('og:title', SEO_CONFIG.title, 'property');
    ensureMeta('og:description', SEO_CONFIG.description, 'property');
    ensureMeta('og:image', SEO_CONFIG.ogImage, 'property');
    ensureMeta('twitter:card', 'summary_large_image', 'name');
    ensureMeta('twitter:title', SEO_CONFIG.title, 'name');
    ensureMeta('twitter:description', SEO_CONFIG.description, 'name');
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'seller') {
      setUploadDraft((prev) => ({ ...prev, sellerId: currentUser.sellerId }));
    }
  }, [currentUser]);

  useEffect(() => {
    setAccountForm({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: currentUser?.phone || '',
      country: currentUser?.country || '',
      city: currentUser?.city || '',
      region: currentUser?.region || '',
      address: currentUser?.address || '',
      postalCode: currentUser?.postalCode || '',
      height: currentUser?.height || currentUser?.heightCm || '',
      weight: currentUser?.weight || currentUser?.weightKg || '',
      hairColor: currentUser?.hairColor || '',
      braSize: currentUser?.braSize || '',
      pantySize: currentUser?.pantySize || '',
      interests: currentUser?.interests || '',
      hobbies: currentUser?.hobbies || '',
      timeFormat: normalizeTimeFormat(currentUser?.timeFormat),
    });
    setAccountCredentialForm({
      newDisplayName: '',
      currentPassword: '',
      newEmail: currentUser?.email || '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setAccountCredentialMessage('');
    setAccountCredentialTone('neutral');
  }, [currentUser]);

  useEffect(() => {
    if (!accountSaveMessage) return undefined;
    const timeoutId = setTimeout(() => {
      setAccountSaveMessage('');
    }, 2500);
    return () => clearTimeout(timeoutId);
  }, [accountSaveMessage]);

  useEffect(() => {
    if (!accountCredentialMessage) return undefined;
    const timeoutId = setTimeout(() => {
      setAccountCredentialMessage('');
      setAccountCredentialTone('neutral');
    }, 4000);
    return () => clearTimeout(timeoutId);
  }, [accountCredentialMessage]);

  useEffect(() => {
    const nextTimeFormat = currentUser?.role === 'buyer'
      ? normalizeTimeFormat(currentUser?.timeFormat)
      : '12h';
    setStoredTimeFormat(nextTimeFormat);
  }, [currentUser?.id, currentUser?.role, currentUser?.timeFormat]);

  useEffect(() => {
    if (!currentUser) {
      setBuyerEmail('');
      setCheckoutForm(normalizeCheckoutFormDraft(null));
      setCheckoutStep(1);
      return;
    }
    const storedBuyerEmail = String(readStore('tlm-checkout-buyer-email', '') || '').trim();
    const storedCheckoutForm = normalizeCheckoutFormDraft(readStore('tlm-checkout-form', null));
    const hasStoredCheckoutDraft = Boolean(
      storedBuyerEmail
      || storedCheckoutForm.fullName
      || storedCheckoutForm.country
      || storedCheckoutForm.address
      || storedCheckoutForm.city
      || storedCheckoutForm.region
      || storedCheckoutForm.postalCode
    );
    if (hasStoredCheckoutDraft) return;
    setBuyerEmail(currentUser.email || '');
    setCheckoutForm({
      fullName: currentUser.name || '',
      country: currentUser.country || '',
      address: currentUser.address || '',
      city: currentUser.city || '',
      region: currentUser.region || '',
      postalCode: currentUser.postalCode || '',
      shippingMethod: 'standard',
      saveAddressToProfile: true,
    });
  }, [currentUser?.id]);
  const checkoutStepOneReadyForBuyer = useMemo(() => {
    const email = String(buyerEmail || '').trim();
    const fullName = String(checkoutForm?.fullName || '').trim();
    return /\S+@\S+\.\S+/.test(email) && fullName.length >= 2;
  }, [buyerEmail, checkoutForm?.fullName]);
  useEffect(() => {
    if (routeInfo.name !== 'checkout') return;
    if (currentUser?.role !== 'buyer') return;
    if (!checkoutStepOneReadyForBuyer) return;
    if (checkoutStep !== 1) return;
    setCheckoutStep(2);
  }, [routeInfo.name, currentUser?.role, checkoutStepOneReadyForBuyer, checkoutStep]);

  const filterOptions = useMemo(
    () => ({
      size: ['All', ...new Set([...SIZE_OPTIONS, ...availableProducts.map((p) => p.size || 'Not specified')])],
      color: ['All', ...new Set([...COLOR_OPTIONS, ...availableProducts.map((p) => p.color || 'Not specified')])],
      style: ['All', ...new Set([...STYLE_OPTIONS, ...availableProducts.map((p) => p.style || 'Not specified')])],
      fabric: ['All', ...new Set([...FABRIC_OPTIONS, ...availableProducts.map((p) => p.fabric || 'Not specified')])],
      daysWorn: ['All', ...new Set([...DAYS_WORN_OPTIONS, ...availableProducts.map((p) => p.daysWorn || 'Not specified')])],
      condition: ['All', ...new Set([...CONDITION_OPTIONS, ...availableProducts.map((p) => p.condition || 'Not specified')])],
      scentLevel: ['All', ...new Set([...SCENT_LEVEL_OPTIONS, ...availableProducts.map((p) => p.scentLevel || 'Not specified')])],
      price: ['All', `Under ${formatPriceTHB(1400)}`, `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}`, `${formatPriceTHB(2000)}+`],
    }),
    [availableProducts],
  );

  const filteredProducts = useMemo(() => {
    return availableProducts.filter((product) => {
      const seller = sellerMap[product.sellerId];
      const q = filters.search.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        product.title.toLowerCase().includes(q) ||
        seller?.name.toLowerCase().includes(q) ||
        product.color.toLowerCase().includes(q) ||
        product.style.toLowerCase().includes(q);

      const matchesSize = filters.size === 'All' || product.size === filters.size;
      const matchesColor = filters.color === 'All' || product.color === filters.color;
      const matchesStyle = filters.style === 'All' || product.style === filters.style;
      const matchesFabric = filters.fabric === 'All' || product.fabric === filters.fabric;
      const productDaysWorn = product.daysWorn || 'Not specified';
      const matchesDaysWorn = filters.daysWorn === 'All' || productDaysWorn === filters.daysWorn;
      const productCondition = product.condition || 'Not specified';
      const productScentLevel = product.scentLevel || 'Not specified';
      const matchesCondition = filters.condition === 'All' || productCondition === filters.condition;
      const matchesScentLevel = filters.scentLevel === 'All' || productScentLevel === filters.scentLevel;
      const matchesPrice =
        filters.price === 'All' ||
        (filters.price === `Under ${formatPriceTHB(1400)}` && product.price < 1400) ||
        (filters.price === `${formatPriceTHB(1400)}-${formatPriceTHB(2000)}` && product.price >= 1400 && product.price <= 2000) ||
        (filters.price === `${formatPriceTHB(2000)}+` && product.price >= 2000);

      return matchesSearch && matchesSize && matchesColor && matchesStyle && matchesFabric && matchesDaysWorn && matchesCondition && matchesScentLevel && matchesPrice;
    });
  }, [filters, availableProducts, sellerMap]);
  const activeFilterChips = useMemo(() => {
    const chips = [];
    const searchValue = String(filters.search || '').trim();
    if (searchValue) chips.push({ key: 'search', label: `Search: ${searchValue}` });
    const filterKeys = ['size', 'color', 'style', 'fabric', 'daysWorn', 'condition', 'scentLevel', 'price'];
    filterKeys.forEach((key) => {
      const value = String(filters[key] || 'All');
      if (!value || value === 'All') return;
      const labelKey = ({ daysWorn: 'Days worn', scentLevel: 'Scent level' }[key] || key.charAt(0).toUpperCase() + key.slice(1));
      chips.push({ key, label: `${labelKey}: ${localizeOptionLabel(value, uiLanguage)}` });
    });
    return chips;
  }, [filters, uiLanguage]);
  const homeRotationDayKey = new Date().toISOString().slice(0, 10);
  const homeFeaturedSellersSeed = stableStringHash(`${homeRotationDayKey}_home_featured_sellers`);
  const homeProductPreviewSeed = stableStringHash(`${homeRotationDayKey}_home_product_preview`);
  const homeSellerPreviewSeed = stableStringHash(`${homeRotationDayKey}_home_seller_preview`);
  const homeBarsPreviewSeed = stableStringHash(`${homeRotationDayKey}_home_bars_preview`);
  const homeFeaturedSellers = useMemo(
    () => {
      const source = Object.values(sellerMap)
        .filter((s) => s.profileImage)
        .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
      return rotateAndTake(source, 6, homeFeaturedSellersSeed);
    },
    [sellerMap, homeFeaturedSellersSeed],
  );
  const homeSellerInsightsById = useMemo(() => {
    const byId = {};
    (availableProducts || []).forEach((product) => {
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
  }, [availableProducts]);
  const homeSellerPreview = useMemo(() => {
    const latestProductTsBySeller = (availableProducts || []).reduce((acc, product) => {
      const sellerId = String(product?.sellerId || '').trim();
      if (!sellerId) return acc;
      const ts = new Date(product?.publishedAt || product?.createdAt || 0).getTime();
      if (!acc[sellerId] || ts > acc[sellerId]) acc[sellerId] = ts;
      return acc;
    }, {});
    const source = Object.values(sellerMap)
      .filter((s) => s.profileImage)
      .sort((a, b) => {
        const bTs = latestProductTsBySeller[b.id] || 0;
        const aTs = latestProductTsBySeller[a.id] || 0;
        if (bTs !== aTs) return bTs - aTs;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      });
    return rotateAndTake(source, 6, homeSellerPreviewSeed);
  }, [sellerMap, availableProducts, homeSellerPreviewSeed]);
  const sellerCountByBarId = useMemo(() => {
    const counts = {};
    (reconciledSellers || []).forEach((seller) => {
      const barId = String(seller?.affiliatedBarId || '').trim();
      if (!barId) return;
      counts[barId] = (counts[barId] || 0) + 1;
    });
    return counts;
  }, [reconciledSellers]);
  const barFeedPosts = useMemo(
    () => [...barPosts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [barPosts],
  );
  const barDashboardPosts = useMemo(
    () => barFeedPosts.filter((post) => post.barId === currentBarId),
    [barFeedPosts, currentBarId],
  );

  const sellerDashboardProducts = products.filter((product) => product.sellerId === currentSellerId);
  const sellerAllPosts = useMemo(
    () => [...sellerPosts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [sellerPosts],
  );
  const sellerFeedPosts = useMemo(
    () =>
      sellerAllPosts.filter((post) => {
        if (post.deletedAt) return false;
        if (!post?.scheduledFor) return true;
        return new Date(post.scheduledFor).getTime() <= feedNow;
      }),
    [sellerAllPosts, feedNow],
  );
  const homeProductPreview = useMemo(
    () => rotateAndTake(filteredProducts, 6, homeProductPreviewSeed),
    [filteredProducts, homeProductPreviewSeed],
  );
  const homeAllFeedPreviewPosts = useMemo(() => {
    const sellerRows = (sellerFeedPosts || [])
      .map((post) => ({
        ...post,
        feedType: 'seller',
        sortAt: post?.createdAt || null,
      }));
    const barRows = (barFeedPosts || []).map((post) => ({
      ...post,
      feedType: 'bar',
      sortAt: post?.createdAt || null,
    }));
    const seen = new Set();
    return [...sellerRows, ...barRows]
      .filter((post) => {
        const key = `${post.feedType}_${post.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(b.sortAt || 0).getTime() - new Date(a.sortAt || 0).getTime())
      .slice(0, 6);
  }, [sellerFeedPosts, barFeedPosts]);
  const homeBarsByRecentPost = useMemo(() => {
    const newestBarPostByBarId = {};
    (barFeedPosts || []).forEach((post) => {
      const barId = String(post?.barId || '').trim();
      if (!barId) return;
      const ts = new Date(post?.createdAt || 0).getTime();
      const current = newestBarPostByBarId[barId];
      const currentTs = new Date(current?.createdAt || 0).getTime();
      if (!current || ts > currentTs) {
        newestBarPostByBarId[barId] = post;
      }
    });
    const source = Object.entries(newestBarPostByBarId)
      .map(([barId, latestPost]) => ({
        bar: localizedBarMap[barId] || barMap[barId] || null,
        latestPost,
      }))
      .filter((entry) => entry.bar && entry.latestPost)
      .sort((a, b) => new Date(b.latestPost?.createdAt || 0).getTime() - new Date(a.latestPost?.createdAt || 0).getTime())
    return rotateAndTake(source, 6, homeBarsPreviewSeed);
  }, [barFeedPosts, localizedBarMap, barMap, homeBarsPreviewSeed]);
  const vettedMarketplaceCountLabel = useMemo(() => {
    const vettedCount = (users || []).filter((user) => {
      const role = String(user?.role || '').trim().toLowerCase();
      if (!['seller', 'bar'].includes(role)) return false;
      return String(user?.accountStatus || 'active').trim().toLowerCase() === 'active';
    }).length;
    if (vettedCount <= 10) return '10+';
    if (vettedCount <= 20) return '20+';
    return `${Math.ceil(vettedCount / 10) * 10}+`;
  }, [users]);
  const sellerDashboardPosts = useMemo(
    () => sellerAllPosts.filter((post) => post.sellerId === currentSellerId && !post.deletedAt),
    [sellerAllPosts, currentSellerId],
  );
  const sellerPostAnalytics = useMemo(() => {
    const lockedPosts = sellerDashboardPosts.filter((post) => isSellerPostPrivate(post));
    const scheduledPosts = sellerDashboardPosts.filter((post) => post?.scheduledFor && new Date(post.scheduledFor).getTime() > feedNow);
    const unlockedRows = postUnlocks.filter((entry) => {
      const post = sellerPosts.find((candidate) => candidate.id === entry.postId);
      return post?.sellerId === currentSellerId;
    });
    const unlockCount = unlockedRows.length;
    const unlockRevenue = unlockedRows.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const sellerUserId = users.find((user) => user.sellerId === currentSellerId)?.id;
    const sellerPayoutRatio = String(sellerMap[currentSellerId]?.affiliatedBarId || '').trim() ? SALE_SPLIT.sellerWithBar : SALE_SPLIT.sellerWithoutBar;
    const messageRevenue = (walletTransactions || [])
      .filter((entry) => entry.userId === sellerUserId && entry.type === 'message_fee' && Number(entry.amount || 0) > 0)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const orderRevenue = (walletTransactions || [])
      .filter((entry) => entry.userId === sellerUserId && entry.type === 'order_sale_earning' && Number(entry.amount || 0) > 0)
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const grossMessageFees = Number((messageRevenue / sellerPayoutRatio).toFixed(2));
    const grossOrderSalesRevenue = Number((orderRevenue / sellerPayoutRatio).toFixed(2));
    const unlocksByPost = {};
    unlockedRows.forEach((entry) => {
      unlocksByPost[entry.postId] = (unlocksByPost[entry.postId] || 0) + 1;
    });
    let topPostId = null;
    let topUnlocks = 0;
    Object.entries(unlocksByPost).forEach(([postId, count]) => {
      if (count > topUnlocks) {
        topUnlocks = count;
        topPostId = postId;
      }
    });
    const topPost = sellerDashboardPosts.find((post) => post.id === topPostId) || null;
    const sellerPostIdSet = new Set(sellerDashboardPosts.map((post) => post.id));
    const sellerLikeRows = sellerPostLikes.filter((entry) => sellerPostIdSet.has(entry.postId));
    const sellerCommentRows = sellerPostComments.filter((entry) => sellerPostIdSet.has(entry.postId));
    const followerCount = sellerFollowerCountById[currentSellerId] || 0;
    const now = feedNow;
    const dayMs = 24 * 60 * 60 * 1000;
    const recentStart = now - (7 * dayMs);
    const previousStart = now - (14 * dayMs);
    const recentEngagement =
      sellerLikeRows.filter((entry) => new Date(entry.createdAt || 0).getTime() >= recentStart).length +
      sellerCommentRows.filter((entry) => new Date(entry.createdAt || 0).getTime() >= recentStart).length;
    const previousEngagement =
      sellerLikeRows.filter((entry) => {
        const ts = new Date(entry.createdAt || 0).getTime();
        return ts >= previousStart && ts < recentStart;
      }).length +
      sellerCommentRows.filter((entry) => {
        const ts = new Date(entry.createdAt || 0).getTime();
        return ts >= previousStart && ts < recentStart;
      }).length;
    const engagementTrendPct = previousEngagement === 0
      ? (recentEngagement > 0 ? 100 : 0)
      : Math.round(((recentEngagement - previousEngagement) / previousEngagement) * 100);
    return {
      lockedPostCount: lockedPosts.length,
      scheduledPostCount: scheduledPosts.length,
      unlockCount,
      unlockRevenue,
      messageRevenue,
      orderRevenue,
      totalRevenue: Number((unlockRevenue + messageRevenue + orderRevenue).toFixed(2)),
      totalGrossRevenue: Number((unlockRevenue + grossMessageFees + grossOrderSalesRevenue).toFixed(2)),
      topPostTitle: topPost?.caption?.slice(0, 60) || topPost?.id || 'No unlocked posts yet',
      topPostUnlocks: topUnlocks,
      likeCount: sellerLikeRows.length,
      commentCount: sellerCommentRows.length,
      followerCount,
      recentEngagement,
      engagementTrendPct,
    };
  }, [sellerDashboardPosts, postUnlocks, sellerPosts, currentSellerId, sellerPostLikes, sellerPostComments, sellerFollowerCountById, walletTransactions, users, sellerMap, feedNow]);
  const cartItems = cart.map((id) => products.find((product) => product.id === id)).filter(Boolean);
  const checkoutBundleSuggestion = useMemo(() => {
    if (cartItems.length !== 1) return null;
    const selectedItem = cartItems[0];
    if (!selectedItem || selectedItem.isBundle) return null;
    const matchingBundles = bundlesByItemId[selectedItem.id] || [];
    const firstAvailableBundle = matchingBundles.find((bundle) => !cart.includes(bundle.id)) || null;
    if (!firstAvailableBundle) return null;
    return {
      selectedItem,
      bundle: firstAvailableBundle,
    };
  }, [cartItems, bundlesByItemId, cart]);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price, 0);
  const shippingBaseRates = getShippingRateByCountry(checkoutForm.country);
  const shippingSupported = shippingBaseRates.supported;
  const shippingRates = {
    standard: shippingSupported ? shippingBaseRates.standard : 0,
    express: shippingSupported ? shippingBaseRates.express : 0,
  };
  const shippingFee = cartItems.length > 0
    ? shippingRates[checkoutForm.shippingMethod] ?? shippingRates.standard
    : 0;
  const total = subtotal + shippingFee;

  function navigate(path) {
    const hashIndex = path.indexOf('#');
    const pathOnly = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
    const hash = hashIndex >= 0 ? path.slice(hashIndex + 1) : '';
    setRoute(pathOnly || '/');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      if (hash) {
        requestAnimationFrame(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }

  function openWalletTopUpForFlow(shortfallAmount, returnTo = '/checkout', source = 'checkout') {
    const normalizedShortfall = Math.max(0, Number(shortfallAmount || 0));
    const requiredTopUp = getRequiredTopUpAmount(normalizedShortfall);
    // Prevent immediate bounce-back to checkout if a previous top-up left success state active.
    setWalletStatus('idle');
    setWalletTopUpContext({
      source,
      topupRequired: requiredTopUp,
      returnTo: returnTo || '/checkout',
    });
    navigate('/account');
  }

  function openWalletTopUpFromCheckout(shortfallAmount) {
    openWalletTopUpForFlow(shortfallAmount, '/checkout', 'checkout');
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters({
      search: '',
      size: 'All',
      color: 'All',
      style: 'All',
      fabric: 'All',
      daysWorn: 'All',
      condition: 'All',
      scentLevel: 'All',
      price: 'All',
    });
  }

  function clearSingleFilter(key) {
    if (key === 'search') {
      setFilters((prev) => ({ ...prev, search: '' }));
      return;
    }
    setFilters((prev) => ({ ...prev, [key]: 'All' }));
  }

  function addToCart(productId) {
    if (soldProductIdSet.has(String(productId || ''))) {
      setCartNotice('This listing is sold. Create a new listing to sell again.');
      if (cartNoticeTimerRef.current) clearTimeout(cartNoticeTimerRef.current);
      cartNoticeTimerRef.current = setTimeout(() => setCartNotice(''), 2200);
      return;
    }
    if (currentUser?.role === 'bar') {
      if (typeof window !== 'undefined') window.alert(loginText.barAccountMarketplaceBlocked || 'Bar accounts cannot buy or sell marketplace products.');
      return;
    }
    if (cartBundleCoveredItemIds.has(String(productId || ''))) {
      setCartNotice('This item is already included in a bundle in your cart.');
      if (cartNoticeTimerRef.current) clearTimeout(cartNoticeTimerRef.current);
      cartNoticeTimerRef.current = setTimeout(() => setCartNotice(''), 1800);
      return;
    }
    let itemWasAdded = false;
    setCart((prev) => {
      if (prev.includes(productId)) {
        setCartNotice(publicText.alreadyInCartNotice);
        return prev;
      }
      itemWasAdded = true;
      setCartNotice(publicText.addedToCartNotice);
      return [...prev, productId];
    });
    if (cartNoticeTimerRef.current) clearTimeout(cartNoticeTimerRef.current);
    cartNoticeTimerRef.current = setTimeout(() => setCartNotice(''), 1800);
    if (itemWasAdded) {
      setCartPulse(true);
      if (cartPulseTimerRef.current) clearTimeout(cartPulseTimerRef.current);
      cartPulseTimerRef.current = setTimeout(() => setCartPulse(false), 450);
    }
  }

  function addBundleToCartFromSingleItem(bundleProductId, sourceItemId) {
    if (!bundleProductId) return;
    if (currentUser?.role === 'bar') {
      if (typeof window !== 'undefined') window.alert(loginText.barAccountMarketplaceBlocked || 'Bar accounts cannot buy or sell marketplace products.');
      return;
    }
    let changed = false;
    setCart((prev) => {
      if (prev.includes(bundleProductId)) {
        setCartNotice('Bundle is already in your cart.');
        return prev;
      }
      const next = prev.includes(sourceItemId)
        ? prev.map((id) => (id === sourceItemId ? bundleProductId : id))
        : [...prev, bundleProductId];
      changed = true;
      setCartNotice(prev.includes(sourceItemId) ? 'Switched to bundle in cart.' : 'Bundle added to cart.');
      return next;
    });
    if (cartNoticeTimerRef.current) clearTimeout(cartNoticeTimerRef.current);
    cartNoticeTimerRef.current = setTimeout(() => setCartNotice(''), 1800);
    if (changed) {
      setCartPulse(true);
      if (cartPulseTimerRef.current) clearTimeout(cartPulseTimerRef.current);
      cartPulseTimerRef.current = setTimeout(() => setCartPulse(false), 450);
    }
  }

  function removeFromCart(indexToRemove) {
    setCart((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  async function notifyAdminOfSellerApplication({ name, email, requestedAt }) {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/seller-approval-request`, {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          sellerName: name,
          sellerEmail: email,
          requestedAt,
        }),
      });
    } catch {
      // Keep registration working even if notification delivery fails.
    }
  }

  async function loginWithCredentials(event) {
    event.preventDefault();
    setAuthErrorRefreshKey((prev) => prev + 1);
    setAuthSubmitting(true);
    try {
    const email = loginForm.email.trim().toLowerCase();
    if (!email || !loginForm.password) {
      setAuthError(loginText.invalidCredentials);
      setAuthSuccess('');
      return;
    }
    const normalizeLoginAlias = (value) => String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s._-]+/g, "");
    const compactLoginInput = normalizeLoginAlias(email);
    const password = loginForm.password;

    const finalizeLogin = (user) => {
      if (!user) return;
      if (user.role === 'seller' && user.sellerId) {
        const sellerId = String(user.sellerId || '').trim();
        if (sellerId) {
          setDb((prev) => {
            const alreadyInSellers = (prev.sellers || []).some((s) => String(s?.id || '').trim() === sellerId);
            const updatedSellers = alreadyInSellers
              ? (prev.sellers || []).map((seller) =>
                  String(seller?.id || '').trim() === sellerId
                    ? { ...seller, isOnline: true }
                    : seller
                )
              : [
                  ...(prev.sellers || []),
                  { id: sellerId, name: user.name || '', isOnline: true, feedVisibility: 'public', location: [user.city, user.country].filter(Boolean).join(', ') },
                ];
            return { ...prev, sellers: updatedSellers };
          });
        }
      }
      setSession({ userId: user.id });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tlm-session', JSON.stringify({ userId: user.id }));
      }
      if (user.role === 'buyer' && backendStatus === 'connected' && apiAuthToken) {
        apiRequestJson(`${API_BASE_URL}/api/post-unlocks`, {
          headers: getApiHeaders(),
        }).then((payload) => {
          if (payload?.unlocks) {
            setDb((prev) => {
              const existingIds = new Set((prev.postUnlocks || []).map((u) => u.id));
              const newUnlocks = payload.unlocks.filter((u) => u?.id && !existingIds.has(u.id));
              const existingPostIds = new Set((prev.sellerPosts || []).map((p) => p.id));
              const newPosts = Array.isArray(payload.posts)
                ? payload.posts.filter((p) => p?.id && !existingPostIds.has(p.id))
                : [];
              if (newUnlocks.length === 0 && newPosts.length === 0) return prev;
              return {
                ...prev,
                postUnlocks: [...newUnlocks, ...(prev.postUnlocks || [])],
                sellerPosts: [...(prev.sellerPosts || []), ...newPosts],
              };
            });
          }
        }).catch(() => {});
      }
      setAuthError('');
      setAuthSuccess(`${loginText.welcomeBack}, ${user.name}.`);
      setCheckoutAuthModalOpen(false);
      const scrollAfterNav = () => setTimeout(() => window.scrollTo(0, 0), 50);
      const normalizedPostLoginRedirectPath = String(postLoginRedirectPath || '').trim();
      const canUsePostLoginRedirect = normalizedPostLoginRedirectPath.startsWith('/') && !normalizedPostLoginRedirectPath.startsWith('//');
      if (canUsePostLoginRedirect) {
        setPostLoginRedirectPath('');
        navigate(normalizedPostLoginRedirectPath);
        scrollAfterNav();
        return;
      }
      if (hasAdminPanelAccess(user)) {
        navigate('/admin');
        scrollAfterNav();
        return;
      }
      if (user.role === 'seller') {
        navigate('/seller-dashboard');
        scrollAfterNav();
        return;
      }
      if (user.role === 'bar') {
        navigate('/bar-dashboard');
        scrollAfterNav();
        return;
      }
      navigate('/account');
      scrollAfterNav();
    };

    const shouldTryApiLogin = backendStatus === 'connected' || REQUIRE_BACKEND_AUTH;
    if (shouldTryApiLogin) {
      try {
        const loginAbortController = new AbortController();
        const loginTimeout = setTimeout(() => loginAbortController.abort(), 15000);
        let authResponse = null;
        try {
          authResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            signal: loginAbortController.signal,
          });
        } finally {
          clearTimeout(loginTimeout);
        }
        let authPayload = null;
        try {
          authPayload = await authResponse.json();
        } catch {
          authPayload = null;
        }
        if (!authResponse.ok) {
          setApiAuthToken('');
          const serverError = String(authPayload?.error || '').trim();
          setAuthError(serverError || loginText.invalidCredentials);
          setAuthSuccess('');
          return;
        }
        const token = String(authPayload?.token || '').trim();
        const authUser = authPayload?.user || null;
        if (!token || !authUser?.id) {
          setApiAuthToken('');
          setAuthError(loginText.loginResponseInvalid || 'Login response is invalid. Please try again.');
          setAuthSuccess('');
          return;
        }
        setBackendStatus('connected');
        setApiAuthToken(token);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('tlm-api-token', JSON.stringify(token));
        }
        const normalizedAuthUser = normalizeAuthUserRole(authUser);
        setDb((prev) => {
          const existingUsers = Array.isArray(prev.users) ? prev.users : [];
          const hasExisting = existingUsers.some((entry) => entry.id === normalizedAuthUser.id);
          const mergedUser = {
            ...(hasExisting ? existingUsers.find((entry) => entry.id === normalizedAuthUser.id) : {}),
            ...normalizedAuthUser,
            // Never persist password from auth responses.
            password: hasExisting ? String(existingUsers.find((entry) => entry.id === normalizedAuthUser.id)?.password || '') : '',
          };
          let nextBars = prev.bars || [];
          if (mergedUser.role === 'bar' && mergedUser.barId) {
            const barExists = nextBars.some((bar) => bar.id === mergedUser.barId);
            if (!barExists) {
              nextBars = [...nextBars, {
                id: mergedUser.barId,
                name: mergedUser.name || '',
                location: [mergedUser.city, mergedUser.country].filter(Boolean).join(', '),
                about: '', specials: '', mapEmbedUrl: '', mapLink: '', profileImage: '', profileImageName: '',
              }];
            }
          }
          return {
            ...prev,
            users: hasExisting
              ? existingUsers.map((entry) => (entry.id === normalizedAuthUser.id ? mergedUser : entry))
              : [mergedUser, ...existingUsers],
            bars: filterLiveJunkBarsForMode(nextBars, appMode),
          };
        });
        finalizeLogin(normalizedAuthUser);
        return;
      } catch (error) {
        if (REQUIRE_BACKEND_AUTH) {
          setApiAuthToken('');
          if (error?.name === 'AbortError') {
            setAuthError(loginText.loginOffline || 'Login timed out. Please try again.');
          } else {
            setAuthError(loginText.loginOffline || 'Login is unavailable while API is offline. Please try again in a moment.');
          }
          setAuthSuccess('');
          return;
        }
      }
    } else if (REQUIRE_BACKEND_AUTH) {
      setApiAuthToken('');
      setAuthError(loginText.loginOffline || 'Login is unavailable while API is offline. Please try again in a moment.');
      setAuthSuccess('');
      return;
    }

    // Non-production fallback only: allow local seeded auth when API is unavailable.
    const user = users.find((candidate) => {
      const candidateEmail = String(candidate?.email || "").trim().toLowerCase();
      if (candidateEmail === email) return true;
      if (!ENABLE_LOGIN_ALIASES) return false;
      const candidateEmailLocal = candidateEmail.split("@")[0] || "";
      const candidateId = String(candidate?.id || "").trim().toLowerCase();
      const candidateSellerId = String(candidate?.sellerId || "").trim().toLowerCase();
      const candidateBarId = String(candidate?.barId || "").trim().toLowerCase();
      const candidateName = String(candidate?.name || "").trim().toLowerCase();
      return (
        candidateEmailLocal === email
        || candidateId === email
        || candidateSellerId === email
        || candidateBarId === email
        || normalizeLoginAlias(candidateEmailLocal) === compactLoginInput
        || normalizeLoginAlias(candidateName) === compactLoginInput
        || normalizeLoginAlias(candidateSellerId) === compactLoginInput
        || normalizeLoginAlias(candidateBarId) === compactLoginInput
      );
    });
    if (!user || user.password !== password) {
      setAuthError(loginText.invalidCredentials);
      setAuthSuccess('');
      return;
    }
    if (user.accountStatus === 'blocked') {
      setAuthError(loginText.blocked);
      setAuthSuccess('');
      return;
    }
    if (user.role === 'seller' && user.accountStatus === 'rejected') {
      setAuthError(`${loginText.sellerRejectedPrefix} ${user.rejectionReason || loginText.sellerRejectedFallback}`);
      setAuthSuccess('');
      return;
    }
    if (user.role === 'seller' && user.accountStatus === 'pending') {
      setAuthError(loginText.sellerPending);
      setAuthSuccess('');
      return;
    }
    setApiAuthToken('');
    finalizeLogin(normalizeAuthUserRole(user));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function resendVerificationEmailByAddress(rawEmail) {
    const email = String(rawEmail || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { ok: false, error: loginText.resendEnterEmail || 'Enter your email first, then click resend verification.' };
    }
    if (!(backendStatus === 'connected' || REQUIRE_BACKEND_AUTH)) {
      return { ok: false, error: loginText.resendOffline || 'Email verification resend is unavailable while API is offline.' };
    }
    setAuthResendVerificationSending(true);
    try {
      const { ok, payload } = await apiRequestJson('/api/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
      if (!ok) {
        return { ok: false, error: String(payload?.error || loginText.resendFailed || 'Could not resend verification email.') };
      }
      return {
        ok: true,
        message: String(payload?.message || loginText.resendSent || 'Verification email sent. Please check your inbox.')
      };
    } finally {
      setAuthResendVerificationSending(false);
    }
  }

  async function resendVerificationEmailForLogin() {
    const result = await resendVerificationEmailByAddress(loginForm.email);
    if (!result?.ok) {
      setAuthError(String(result?.error || loginText.resendFailed || 'Could not resend verification email.'));
      setAuthSuccess('');
      return;
    }
    setAuthError('');
    setAuthSuccess(String(result.message || loginText.resendSent || 'Verification email sent. Please check your inbox.'));
  }

  async function resendVerificationEmailForVerifyPage() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search || '');
    const email = String(params.get('email') || '').trim().toLowerCase();
    const result = await resendVerificationEmailByAddress(email);
    if (!result?.ok) {
      setEmailVerificationStatus({
        loading: false,
        message: String(result?.error || loginText.resendFailed || 'Could not resend verification email.'),
        tone: 'error',
      });
      return;
    }
    setEmailVerificationStatus({
      loading: false,
      message: String(result.message || loginText.resendSent || 'Verification email sent. Please check your inbox.'),
      tone: 'success',
    });
  }

  function goNextStep() {
    setRegisterStepError('');
    setAuthError('');
    const name = String(registerForm.name || '').trim();
    const email = String(registerForm.email || '').trim();
    const country = String(registerForm.country || '').trim();
    const city = String(registerForm.city || '').trim();
    if (registerStep === 1) {
      if (!registerForm.role) {
        setRegisterStepError(registerText.chooseRoleError || 'Please choose an account type.');
        return;
      }
    }
    if (registerStep === 2) {
      if (!name) {
        setRegisterStepError(registerText.nameRequiredError || 'Please enter your name.');
        return;
      }
      if (!email || !email.includes('@')) {
        setRegisterStepError(registerText.emailRequiredError || 'Please enter a valid email address.');
        return;
      }
    }
    if (registerStep === 3) {
      if (!registerPasswordChecks.every((c) => c.passed)) {
        setRegisterStepError(registerText.passwordPolicyError || 'Please meet all password requirements above.');
        return;
      }
    }
    if (registerStep === 4 && (registerForm.role === 'seller' || registerForm.role === 'bar')) {
      if (!country) {
        setRegisterStepError(registerText.countryRequiredError || 'Please select your country.');
        return;
      }
      if (!city) {
        setRegisterStepError(registerText.cityRequiredError || 'Please enter your city.');
        return;
      }
    }
    if (registerStep === 5 && registerForm.role === 'seller') {
      if (!registerForm.pantySize) {
        setRegisterStepError(registerText.pantySizeRequiredError || 'Please select your panty size before continuing.');
        return;
      }
    }
    setRegisterStep((prev) => prev + 1);
  }
  function goBackStep() {
    setRegisterStepError('');
    setAuthError('');
    setRegisterStep((prev) => Math.max(1, prev - 1));
  }
  async function registerAccount(event) {
    event.preventDefault();
    if (isRegistering) return;
    setIsRegistering(true);
    try {
    const name = registerForm.name.trim();
    const email = registerForm.email.trim().toLowerCase();
    const role = registerForm.role;
    const city = registerForm.city.trim();
    const country = registerForm.country.trim();
    const password = registerForm.password;
    const confirmPassword = registerForm.confirmPassword;
    const hasPasswordNumber = /\d/.test(password);
    const hasPasswordSymbol = /[^A-Za-z0-9]/.test(password);
    if (!['buyer', 'seller', 'bar'].includes(role)) {
      setAuthError(registerText.chooseRoleError);
      setAuthSuccess('');
      return;
    }
    if (role === 'seller' && (!name || !email || !password || !city || !country)) {
      setAuthError(registerText.sellerRequiredError);
      setAuthSuccess('');
      return;
    }
    if (role === 'buyer' && (!name || !email || !password)) {
      setAuthError(registerText.buyerRequiredError);
      setAuthSuccess('');
      return;
    }
    if (role === 'buyer' && (!registerForm.acceptedRespectfulConduct || !registerForm.acceptedNoRefunds)) {
      setAuthError(registerText.buyerTermsRequiredError || registerText.buyerRequiredError);
      setAuthSuccess('');
      return;
    }
    if (role === 'seller' && (!registerForm.acceptedRespectfulConduct || !registerForm.acceptedNoRefunds)) {
      setAuthError(registerText.sellerTermsRequiredError || registerText.sellerRequiredError);
      setAuthSuccess('');
      return;
    }
    if (role === 'bar' && (!registerForm.acceptedRespectfulConduct || !registerForm.acceptedNoRefunds)) {
      setAuthError(registerText.barTermsRequiredError || 'Bar registration requires accepting conduct and service terms.');
      setAuthSuccess('');
      return;
    }
    if (role === 'bar' && (!name || !email || !password || !city || !country)) {
      setAuthError(registerText.barRequiredError || registerText.sellerRequiredError);
      setAuthSuccess('');
      return;
    }
    if (password.length < 8 || !hasPasswordNumber || !hasPasswordSymbol) {
      setAuthError(registerText.passwordPolicyError || 'Password must be at least 8 characters and include at least 1 number and 1 symbol.');
      setAuthSuccess('');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(registerText.passwordMismatchError || 'Passwords do not match.');
      setAuthSuccess('');
      return;
    }
    const heightCm = role === 'seller' && registerForm.height
      ? (registerForm.heightUnit === 'in' ? Number((Number(registerForm.height) * 2.54).toFixed(1)) : Number(registerForm.height))
      : '';
    const weightKg = role === 'seller' && registerForm.weight
      ? (registerForm.weightUnit === 'lbs' ? Number((Number(registerForm.weight) / 2.20462).toFixed(1)) : Number(registerForm.weight))
      : '';
    const shouldUseBackendRegistration = REQUIRE_BACKEND_AUTH || backendStatus === 'connected';
    if (shouldUseBackendRegistration) {
      const autoApproved = role === 'seller' || role === 'bar';
      const registrationBody = {
        name,
        email,
        password,
        role,
        city,
        country,
        preferredLanguage: authLanguage,
        acceptedRespectfulConduct: Boolean(registerForm.acceptedRespectfulConduct),
        acceptedNoRefunds: Boolean(registerForm.acceptedNoRefunds),
      };
      if (role === 'seller') {
        if (heightCm) registrationBody.heightCm = heightCm;
        if (weightKg) registrationBody.weightKg = weightKg;
        if (registerForm.hairColor) registrationBody.hairColor = String(registerForm.hairColor).trim();
        if (registerForm.braSize) registrationBody.braSize = String(registerForm.braSize).trim();
        if (registerForm.pantySize) registrationBody.pantySize = String(registerForm.pantySize).trim();
      }
      const { ok, payload } = await apiRequestJson('/api/auth/register', {
        method: 'POST',
        body: registrationBody,
      });
      if (!ok) {
        setAuthError(String(payload?.error || 'Could not create account right now. Please try again.'));
        setAuthSuccess('');
        return;
      }
      setAuthError('');
      const registrationToken = String(payload?.token || '').trim();
      const registrationUser = payload?.user || null;
      if (autoApproved && registrationToken && registrationUser?.id) {
        const normalizedRegistrationUser = normalizeAuthUserRole(registrationUser);
        setApiAuthToken(registrationToken);
        setBackendStatus('connected');
        setDb((prev) => {
          const existingUsers = Array.isArray(prev.users) ? prev.users : [];
          const hasExisting = existingUsers.some((entry) => entry.id === normalizedRegistrationUser.id);
          const mergedUser = { ...(hasExisting ? existingUsers.find((entry) => entry.id === normalizedRegistrationUser.id) : {}), ...normalizedRegistrationUser, password: '' };
          let nextBars = prev.bars || [];
          if (role === 'bar' && mergedUser.barId) {
            const barExists = nextBars.some((bar) => bar.id === mergedUser.barId);
            if (!barExists) {
              nextBars = [...nextBars, {
                id: mergedUser.barId,
                name: name || mergedUser.name || '',
                location: [city || mergedUser.city, country || mergedUser.country].filter(Boolean).join(', '),
                about: '', specials: '', mapEmbedUrl: '', mapLink: '', profileImage: '', profileImageName: '',
              }];
            }
          }
          return {
            ...prev,
            users: hasExisting
              ? existingUsers.map((entry) => (entry.id === normalizedRegistrationUser.id ? mergedUser : entry))
              : [mergedUser, ...existingUsers],
            bars: filterLiveJunkBarsForMode(nextBars, appMode),
            sellers: role === 'seller' && mergedUser.sellerId
              ? (() => {
                  const sellerId = String(mergedUser.sellerId || '').trim();
                  const alreadyInSellers = (prev.sellers || []).some((s) => String(s?.id || '').trim() === sellerId);
                  return alreadyInSellers
                    ? (prev.sellers || []).map((seller) =>
                        String(seller?.id || '').trim() === sellerId
                          ? { ...seller, isOnline: true }
                          : seller
                      )
                    : [
                        ...(prev.sellers || []),
                        {
                          id: sellerId,
                          name: mergedUser.name || name || '',
                          isOnline: true,
                          feedVisibility: 'public',
                          location: [city || mergedUser.city, country || mergedUser.country].filter(Boolean).join(', '),
                          height: heightCm || mergedUser.heightCm || '',
                          weight: weightKg || mergedUser.weightKg || '',
                          hairColor: registerForm.hairColor || mergedUser.hairColor || '',
                          braSize: registerForm.braSize || mergedUser.braSize || '',
                          pantySize: registerForm.pantySize || mergedUser.pantySize || '',
                        },
                      ];
                })()
              : (prev.sellers || []),
          };
        });
        setSession({ userId: normalizedRegistrationUser.id });
        setAuthSuccess('');
        setRegistrationSuccessPopup({ email, password, role });
        return;
      }
      setAuthSuccess('');
      setRegistrationSuccessPopup({ email, password, role });
      return;
    }
    const exists = users.some((user) => user.email.toLowerCase() === email);
    if (exists) {
      setAuthError(registerText.emailExistsError);
      setAuthSuccess('');
      return;
    }
    const now = new Date().toISOString();
    const userId = `user_${Date.now()}`;
    const requestedSellerSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new-seller';
    const requestedBarSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new-bar';
    const newUser = {
      id: userId,
      role,
      name,
      email,
      password,
      phone: '',
      country: role === 'seller' || role === 'bar' ? country : '',
      city: role === 'seller' || role === 'bar' ? city : '',
      address: '',
      postalCode: '',
      height: role === 'seller' ? (heightCm || '') : '',
      weight: role === 'seller' ? (weightKg || '') : '',
      hairColor: role === 'seller' ? (registerForm.hairColor || '') : '',
      braSize: role === 'seller' ? (registerForm.braSize || '') : '',
      pantySize: role === 'seller' ? (registerForm.pantySize || '') : '',
      interests: '',
      hobbies: '',
      walletBalance: 0,
      timeFormat: '12h',
      notificationPreferences: {
        message: true,
        engagement: true,
        push: {
          message: false,
          engagement: false,
        },
      },
      ...(role === 'seller'
        ? {
            accountStatus: 'pending',
            sellerApplicationAt: now,
            sellerApplicationStatus: 'pending',
            requestedSellerSlug,
          }
        : role === 'bar'
          ? {
              accountStatus: 'active',
              barId: requestedBarSlug,
            }
          : {
              accountStatus: 'active',
              acceptedBuyerTermsAt: now,
            }),
    };
    setDb((prev) => {
      let nextUser = { ...newUser };
      let nextBars = prev.bars || [];
      if (role === 'bar') {
        let barId = requestedBarSlug;
        let suffix = 1;
        while ((nextBars || []).some((bar) => bar.id === barId)) {
          suffix += 1;
          barId = `${requestedBarSlug}-${suffix}`;
        }
        nextUser = { ...nextUser, barId };
        nextBars = [
          ...nextBars,
          {
            id: barId,
            name,
            location: [city, country].filter(Boolean).join(', '),
            about: '',
            specials: '',
            mapEmbedUrl: '',
            mapLink: '',
            profileImage: '',
            profileImageName: '',
          },
        ];
      }
      return {
        ...prev,
        users: [...prev.users, nextUser],
        bars: filterLiveJunkBarsForMode(nextBars, appMode),
        notifications: [
          ...(prev.notifications || []),
          {
            id: `notif_${Date.now()}`,
            userId,
            text: role === 'seller' ? 'Seller application submitted for review.' : role === 'bar' ? 'Welcome. Your bar page is ready to set up.' : 'Welcome to Thailand Panties.',
            read: false,
            createdAt: now,
          },
        ],
      };
    });
    setRegisterForm({ name: '', email: '', password: '', confirmPassword: '', role: '', city: '', country: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', hairColor: '', braSize: '', pantySize: '', acceptedRespectfulConduct: false, acceptedNoRefunds: false });
    setRegisterStep(1);
    setRegisterStepError('');
    setAuthError('');
    if (role === 'seller') {
      await notifyAdminOfSellerApplication({ name, email, requestedAt: now });
      setAuthSuccess(registerText.sellerPendingSuccess);
      navigate('/login');
      return;
    }
    setSession({ userId });
    setAuthSuccess(role === 'bar' ? (registerText.barSuccess || registerText.buyerSuccess) : registerText.buyerSuccess);
    setCheckoutAuthModalOpen(false);
    navigate(role === 'bar' ? '/bar-dashboard' : '/account');
    } catch (err) {
      setAuthError('Something went wrong. Please try again.');
      setAuthSuccess('');
    } finally {
      setIsRegistering(false);
    }
  }

  function approveSellerAccount(userId) {
    const approvedUser = (users || []).find((candidate) => candidate.id === userId && candidate.role === 'seller');
    setDb((prev) => {
      const user = prev.users.find((candidate) => candidate.id === userId);
      if (!user || user.role !== 'seller' || (user.accountStatus !== 'pending' && user.accountStatus !== 'rejected')) return prev;
      const slugBase = user.requestedSellerSlug || user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new-seller';
      let sellerId = user.sellerId || slugBase;
      if (!user.sellerId) {
        let count = 1;
        while (prev.sellers.some((seller) => seller.id === sellerId)) {
          count += 1;
          sellerId = `${slugBase}-${count}`;
        }
      }
      const now = new Date().toISOString();
      const existingSeller = prev.sellers.find((seller) => seller.id === sellerId);
      const base = {
        ...prev,
        users: prev.users.map((candidate) =>
          candidate.id === userId
            ? {
                ...candidate,
                accountStatus: 'active',
                sellerId,
                approvedAt: now,
                rejectedAt: undefined,
                rejectionReason: undefined,
                sellerApplicationStatus: 'approved',
              }
            : candidate,
        ),
        sellers: existingSeller
          ? prev.sellers
          : [
              ...prev.sellers,
              {
                id: sellerId,
                name: user.name || '',
                location: [user.city, user.country].filter(Boolean).join(', ') || '',
                bio: randomSellerBio(),
                shipping: 'Worldwide',
                turnaround: 'Ships in 1-3 days',
                isOnline: false,
                feedVisibility: 'public',
                languages: ['English'],
                highlights: ['New seller'],
                portfolioUrl: '',
                height: user.height || '',
                weight: user.weight || '',
                hairColor: user.hairColor || '',
                braSize: user.braSize || '',
                pantySize: user.pantySize || '',
              },
            ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'approve_seller',
            targetUserId: userId,
            adminUserId: currentUser?.id || 'admin',
            createdAt: now,
          },
        ],
      };
      return appendTemplatedEmail(base, {
        templateKey: 'seller_application_approved',
        userId,
        vars: {
          actionPath: '/seller-dashboard',
        },
        fallbackPath: '/seller-dashboard',
      });
    });
    setAdminAuthActionMessage(adminActionText('sellerApproved'));
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson(`/api/admin/users/${encodeURIComponent(userId)}/approve-seller`, {
        method: 'POST',
        idempotencyScope: 'approve_seller',
      }).catch((err) => console.warn('[approveSellerAccount] API sync failed:', err));
    }
    if (approvedUser?.id) {
      Promise.resolve(dispatchManagedNotification({
        recipientUserIds: [approvedUser.id],
        preferenceType: 'engagement',
        route: '/seller-dashboard',
        titleByLang: {
          en: 'Seller application approved',
          th: 'อนุมัติใบสมัครผู้ขายแล้ว',
          my: 'Seller application ကို အတည်ပြုပြီးပါပြီ',
          ru: 'Заявка продавца одобрена',
        },
        bodyByLang: {
          en: 'Your seller account has been approved. You can now start selling.',
          th: 'บัญชีผู้ขายของคุณได้รับการอนุมัติแล้ว เริ่มขายได้เลย',
          my: 'သင့် seller account ကို အတည်ပြုပြီးပါပြီ။ ယခု စတင်ရောင်းချနိုင်ပါပြီ။',
          ru: 'Ваш аккаунт продавца одобрен. Теперь вы можете начать продажи.',
        },
        sendEmail: true,
        emailSubject: 'Seller account approved',
        emailText: 'Your seller account has been approved. Open your seller dashboard to get started.',
        kind: 'seller_application_approved',
      })).catch(() => {});
    }
  }

  function approveAllPendingSellers() {
    if (!pendingSellerApprovals.length) return;
    if (typeof window !== 'undefined' && !window.confirm(`Approve all ${pendingSellerApprovals.length} pending sellers?`)) return;
    pendingSellerApprovals.forEach((user) => approveSellerAccount(user.id));
    setAdminAuthActionMessage(adminActionText('sellersApprovedBulk', { count: pendingSellerApprovals.length }));
  }

  function rejectSellerAccount(userId, reason = 'Not a fit right now') {
    const now = new Date().toISOString();
    setDb((prev) => {
      const targetUser = prev.users.find((candidate) => (
        candidate.id === userId && candidate.role === 'seller' && candidate.accountStatus === 'pending'
      ));
      if (!targetUser) return prev;
      const base = {
        ...prev,
        users: prev.users.map((candidate) =>
          candidate.id === userId
            ? {
                ...candidate,
                accountStatus: 'rejected',
                sellerApplicationStatus: 'rejected',
                rejectedAt: now,
                rejectionReason: reason,
              }
            : candidate,
        ),
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'reject_seller',
            targetUserId: userId,
            adminUserId: currentUser?.id || 'admin',
            reason,
            createdAt: now,
          },
        ],
      };
      return appendTemplatedEmail(base, {
        templateKey: 'seller_application_rejected',
        userId,
        vars: {
          reason: String(reason || 'Not a fit right now'),
          actionPath: '/account',
        },
        fallbackPath: '/account',
      });
    });
    setAdminAuthActionMessage(adminActionText('sellerRejected'));
  }

  function updateBarProfileByAdmin(barId, updates = {}) {
    if (!currentUser || currentUser.role !== 'admin' || !barId) return;
    const now = new Date().toISOString();
    const mapFields = buildBarMapFields(String(updates.mapLink || '').trim(), '');
    setDb((prev) => ({
      ...prev,
      bars: (prev.bars || []).map((bar) => (
        bar.id === barId
          ? {
              ...bar,
              name: String(updates.name ?? bar.name ?? '').trim(),
              location: String(updates.location ?? bar.location ?? '').trim(),
              about: String(updates.about ?? bar.about ?? '').trim(),
              specials: String(updates.specials ?? bar.specials ?? '').trim(),
              mapEmbedUrl: mapFields.mapEmbedUrl || String(bar.mapEmbedUrl || '').trim(),
              mapLink: mapFields.mapLink || String(bar.mapLink || '').trim(),
            }
          : bar
      )),
      adminActions: [
        ...(prev.adminActions || []),
        {
          id: `admin_action_${Date.now()}_bar_update`,
          type: 'update_bar_profile',
          targetBarId: barId,
          adminUserId: currentUser.id,
          createdAt: now,
        },
      ],
    }));
    setAdminAuthActionMessage(adminActionText('barUpdated'));
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson(`/api/bars/${encodeURIComponent(barId)}`, {
        method: 'PUT',
        body: {
          name: String(updates.name || '').trim(),
          location: String(updates.location || '').trim(),
          about: String(updates.about || '').trim(),
          specials: String(updates.specials || '').trim(),
          mapEmbedUrl: mapFields.mapEmbedUrl,
          mapLink: mapFields.mapLink,
        },
      }).catch((err) => console.warn('[updateBarProfileByAdmin] API sync failed:', err));
    }
  }

  function setSellerBarAffiliationByAdmin(sellerId, barId, reason = '') {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.AFFILIATIONS_MANAGE) || !sellerId) {
      return { ok: false, error: 'You do not have permission to manage affiliations.' };
    }
    const normalizedReason = String(reason || '').trim();
    const normalizedBarId = String(barId || '').trim();
    const barExists = !normalizedBarId || (bars || []).some((bar) => bar.id === normalizedBarId);
    if (!barExists) return { ok: false, error: 'The selected bar does not exist.' };
    const targetSellerUser = (users || []).find((user) => user.role === 'seller' && user.sellerId === sellerId);
    const targetBarUser = normalizedBarId
      ? (users || []).find((user) => user.role === 'bar' && user.barId === normalizedBarId)
      : null;
    const adminRecipients = (users || [])
      .filter((user) => hasAdminPanelAccess(user))
      .map((user) => user.id)
      .filter(Boolean);
    const now = new Date().toISOString();
    setDb((prev) => {
      const seller = (prev.sellers || []).find((entry) => entry.id === sellerId);
      const previousBarId = String(seller?.affiliatedBarId || '').trim();
      const nextBar = (prev.bars || []).find((bar) => bar.id === normalizedBarId);
      const previousBar = (prev.bars || []).find((bar) => bar.id === previousBarId);
      const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === sellerId);
      const nextBarUser = (prev.users || []).find((user) => user.role === 'bar' && user.barId === normalizedBarId);
      const previousBarUser = (prev.users || []).find((user) => user.role === 'bar' && user.barId === previousBarId);
      const nextNotifications = [...(prev.notifications || [])];
      if (sellerUser?.id) {
        nextNotifications.push(
          buildInAppNotification(
            sellerUser.id,
            normalizedBarId
              ? `Admin set your affiliation to ${nextBar?.name || 'a bar'}.`
              : 'Admin set your affiliation to Independent.',
            now,
          )
        );
      }
      if (normalizedBarId && nextBarUser?.id) {
        nextNotifications.push(
          buildInAppNotification(nextBarUser.id, `${seller?.name || 'Seller'} is now affiliated with ${nextBar?.name || 'your bar'}.`, now)
        );
      }
      if (previousBarId && previousBarId !== normalizedBarId && previousBarUser?.id) {
        nextNotifications.push(
          buildInAppNotification(previousBarUser.id, `${seller?.name || 'Seller'} is no longer affiliated with ${previousBar?.name || 'your bar'}.`, now)
        );
      }
      return {
        ...prev,
        sellers: (prev.sellers || []).map((entry) => (
          entry.id === sellerId
            ? { ...entry, affiliatedBarId: normalizedBarId }
            : entry
        )),
        notifications: nextNotifications,
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}_seller_bar`,
            type: 'set_seller_bar_affiliation',
            targetSellerId: sellerId,
            targetBarId: normalizedBarId || null,
            adminUserId: currentUser.id,
            reason: normalizedReason,
            createdAt: now,
          },
        ],
      };
    });
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson(`/api/sellers/${encodeURIComponent(sellerId)}`, {
        method: 'PUT',
        body: { affiliatedBarId: normalizedBarId },
      }).catch((err) => console.warn('[setSellerBarAffiliationByAdmin] API sync failed:', err));
    }
    setAdminAuthActionMessage(normalizedBarId ? adminActionText('sellerAffiliationUpdated') : adminActionText('sellerSetIndependent'));
    Promise.resolve(dispatchManagedNotification({
      recipientUserIds: adminRecipients,
      preferenceType: 'adminOps',
      route: '/admin?tab=users',
      titleByLang: {
        en: normalizedBarId ? 'Seller added to bar' : 'Seller removed from bar',
        th: normalizedBarId ? 'เพิ่มผู้ขายเข้าบาร์แล้ว' : 'นำผู้ขายออกจากบาร์แล้ว',
        my: normalizedBarId ? 'Seller ကို bar သို့ ထည့်ပြီးပါပြီ' : 'Seller ကို bar မှ ဖယ်ရှားပြီးပါပြီ',
        ru: normalizedBarId ? 'Продавец добавлен в бар' : 'Продавец удален из бара',
      },
      bodyByLang: {
        en: normalizedBarId ? 'A seller affiliation was updated by admin.' : 'A seller was set to independent by admin.',
        th: normalizedBarId ? 'มีการอัปเดตความสังกัดผู้ขายโดยแอดมิน' : 'แอดมินตั้งผู้ขายเป็นอิสระแล้ว',
        my: normalizedBarId ? 'Admin မှ seller affiliation ကို အပ်ဒိတ်လုပ်ခဲ့သည်။' : 'Admin မှ seller ကို independent အဖြစ် ပြောင်းခဲ့သည်။',
        ru: normalizedBarId ? 'Администратор обновил привязку продавца.' : 'Администратор сделал продавца независимым.',
      },
      kind: normalizedBarId ? 'seller_added_to_bar' : 'seller_removed_from_bar',
    })).catch(() => {});
    if (targetSellerUser?.id) {
      Promise.resolve(dispatchManagedNotification({
        recipientUserIds: [targetSellerUser.id],
        preferenceType: 'engagement',
        route: '/account',
        titleByLang: {
          en: normalizedBarId ? 'Bar affiliation updated' : 'Bar affiliation removed',
          th: normalizedBarId ? 'อัปเดตความสังกัดบาร์แล้ว' : 'ยกเลิกความสังกัดบาร์แล้ว',
          my: normalizedBarId ? 'Bar affiliation အပ်ဒိတ်လုပ်ပြီးပါပြီ' : 'Bar affiliation ဖယ်ရှားပြီးပါပြီ',
          ru: normalizedBarId ? 'Привязка к бару обновлена' : 'Привязка к бару удалена',
        },
        bodyByLang: {
          en: normalizedBarId ? 'Admin updated your bar affiliation.' : 'Admin removed your bar affiliation.',
          th: normalizedBarId ? 'แอดมินอัปเดตความสังกัดบาร์ของคุณแล้ว' : 'แอดมินยกเลิกความสังกัดบาร์ของคุณแล้ว',
          my: normalizedBarId ? 'Admin မှ သင့် bar affiliation ကို အပ်ဒိတ်လုပ်ခဲ့သည်။' : 'Admin မှ သင့် bar affiliation ကို ဖယ်ရှားခဲ့သည်။',
          ru: normalizedBarId ? 'Администратор обновил вашу привязку к бару.' : 'Администратор удалил вашу привязку к бару.',
        },
        sendEmail: true,
        emailSubject: normalizedBarId ? 'Bar affiliation updated' : 'Bar affiliation removed',
        emailText: normalizedBarId ? 'Admin updated your bar affiliation.' : 'Admin removed your bar affiliation.',
        kind: normalizedBarId ? 'seller_added_to_bar' : 'seller_removed_from_bar',
      })).catch(() => {});
    }
    if (targetBarUser?.id) {
      Promise.resolve(dispatchManagedNotification({
        recipientUserIds: [targetBarUser.id],
        preferenceType: 'engagement',
        route: '/bar-dashboard',
        titleByLang: {
          en: 'Seller affiliation updated',
          th: 'อัปเดตความสังกัดผู้ขายแล้ว',
          my: 'Seller affiliation ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ',
          ru: 'Привязка продавца обновлена',
        },
        bodyByLang: {
          en: 'Admin added or updated a seller affiliation for your bar.',
          th: 'แอดมินได้เพิ่มหรืออัปเดตความสังกัดผู้ขายให้บาร์ของคุณ',
          my: 'Admin သည် သင့် bar အတွက် seller affiliation ကို အပ်ဒိတ်လုပ်ခဲ့သည်။',
          ru: 'Администратор добавил или обновил привязку продавца для вашего бара.',
        },
        sendEmail: true,
        emailSubject: 'Seller affiliation updated',
        emailText: 'Admin added or updated a seller affiliation for your bar.',
        kind: 'seller_added_to_bar',
      })).catch(() => {});
    }
    return { ok: true, message: normalizedBarId ? adminActionText('sellerAffiliationUpdated') : adminActionText('sellerSetIndependent') };
  }

  async function updateSellerNameByAdmin(sellerId, newName) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.AFFILIATIONS_MANAGE) || !sellerId) {
      return { ok: false, error: 'You do not have permission to update seller profiles.' };
    }
    const trimmedName = String(newName || '').trim();
    if (!trimmedName) return { ok: false, error: 'Name cannot be empty.' };
    setDb((prev) => ({
      ...prev,
      sellers: (prev.sellers || []).map((seller) =>
        seller.id === sellerId ? { ...seller, name: trimmedName } : seller
      ),
    }));
    if (backendStatus === 'connected' && apiAuthToken) {
      try {
        await apiRequestJson(`/api/sellers/${encodeURIComponent(sellerId)}`, {
          method: 'PUT',
          body: { name: trimmedName },
        });
      } catch (err) {
        console.warn('[updateSellerNameByAdmin] API sync failed:', err);
        return { ok: false, error: 'Failed to save name to server.' };
      }
    }
    setAdminAuthActionMessage('Seller name updated.');
    return { ok: true, message: 'Seller name updated.' };
  }

  function removeBarByAdmin(barId) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.AFFILIATIONS_MANAGE) || !barId) return;
    const now = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      bars: (prev.bars || []).filter((bar) => bar.id !== barId),
      barPosts: (prev.barPosts || []).filter((post) => post.barId !== barId),
      sellers: (prev.sellers || []).map((seller) => (
        seller.affiliatedBarId === barId
          ? { ...seller, affiliatedBarId: '' }
          : seller
      )),
      adminActions: [
        ...(prev.adminActions || []),
        {
          id: `admin_action_${Date.now()}_bar_remove`,
          type: 'remove_bar',
          targetBarId: barId,
          adminUserId: currentUser.id,
          createdAt: now,
        },
      ],
    }));
    setAdminAuthActionMessage(adminActionText('barRemovedIndependent'));
  }

  function toggleAdminBlockUser(userId, reason = '') {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.USERS_BLOCK)) {
      return { ok: false, error: 'You do not have permission to block users.' };
    }
    const target = users.find((user) => user.id === userId);
    if (!target || resolveAdminAccess(target).level === 'super') {
      return { ok: false, error: 'This user cannot be blocked by delegated admins.' };
    }
    const isBlocked = target.accountStatus === 'blocked';
    const normalizedReason = String(reason || '').trim();
    if (normalizedReason.length < 8) {
      return { ok: false, error: 'Add a short reason (at least 8 characters) before confirming this action.' };
    }
    const now = new Date().toISOString();
    const adminRecipients = (users || [])
      .filter((user) => hasAdminPanelAccess(user))
      .map((user) => user.id)
      .filter(Boolean);
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((user) => {
        if (user.id !== userId) return user;
        if (isBlocked) {
          return {
            ...user,
            accountStatus: user.statusBeforeBlocked || 'active',
            statusBeforeBlocked: undefined,
            blockedAt: undefined,
          };
        }
        return {
          ...user,
          statusBeforeBlocked: user.accountStatus || 'active',
          accountStatus: 'blocked',
          blockedAt: now,
        };
      }),
      blocks: isBlocked
        ? (prev.blocks || []).filter((entry) => !(entry.blockerUserId === currentUser.id && entry.blockedUserId === userId))
        : [
            ...(prev.blocks || []),
            {
              id: `block_${Date.now()}`,
              blockerUserId: currentUser.id,
              blockedUserId: userId,
              createdAt: now,
              reason: normalizedReason,
            },
          ],
      notifications: [
        ...(prev.notifications || []),
        {
          id: `notif_${Date.now()}`,
          userId,
          text: isBlocked ? 'Your account has been unblocked by admin.' : 'Your account has been blocked by admin.',
          read: false,
          createdAt: now,
        },
      ],
      adminActions: [
        ...(prev.adminActions || []),
        {
          id: `admin_action_${Date.now()}`,
          type: isBlocked ? 'unblock_user' : 'block_user',
          targetUserId: userId,
          adminUserId: currentUser.id,
          reason: normalizedReason,
          createdAt: now,
        },
      ],
    }));
    Promise.resolve(dispatchManagedNotification({
      recipientUserIds: adminRecipients,
      preferenceType: 'adminOps',
      route: '/admin?tab=users',
      titleByLang: {
        en: isBlocked ? 'User unblocked' : 'User blocked',
        th: isBlocked ? 'ปลดบล็อกผู้ใช้แล้ว' : 'บล็อกผู้ใช้แล้ว',
        my: isBlocked ? 'User ကို unblock လုပ်ပြီးပါပြီ' : 'User ကို block လုပ်ပြီးပါပြီ',
        ru: isBlocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован',
      },
      bodyByLang: {
        en: isBlocked ? 'An account was unblocked by admin.' : 'An account was blocked by admin.',
        th: isBlocked ? 'แอดมินปลดบล็อกบัญชีแล้ว' : 'แอดมินบล็อกบัญชีแล้ว',
        my: isBlocked ? 'Admin က account တစ်ခုကို unblock လုပ်ခဲ့သည်။' : 'Admin က account တစ်ခုကို block လုပ်ခဲ့သည်။',
        ru: isBlocked ? 'Администратор разблокировал аккаунт.' : 'Администратор заблокировал аккаунт.',
      },
      kind: isBlocked ? 'user_unblocked' : 'user_blocked',
    })).catch(() => {});
    return { ok: true, message: isBlocked ? 'User unblocked.' : 'User blocked.' };
  }

  function returnToAdmin() {
    if (!adminImpersonation?.token || !adminImpersonation?.sessionUserId) return;
    setApiAuthToken(adminImpersonation.token);
    setSession({ userId: adminImpersonation.sessionUserId });
    setAdminImpersonation(null);
    navigate('/admin');
  }

  async function handleAdminImpersonate(userId) {
    if (!currentUser || !isSuperAdmin) return;
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;
    if (backendStatus !== 'connected' || !apiAuthToken) return;
    try {
      const response = await apiRequestJson(`/api/admin/impersonate/${encodeURIComponent(normalizedUserId)}`, {
        method: 'POST',
      });
      if (!response?.ok || !response.payload?.token || !response.payload?.user?.id) return;
      const impersonatedUser = response.payload.user;
      setAdminImpersonation({ token: apiAuthToken, sessionUserId: currentUser.id });
      setApiAuthToken(response.payload.token);
      setSession({ userId: impersonatedUser.id });
      setDb((prev) => {
        const existingIds = new Set((prev.users || []).map((u) => u.id));
        if (existingIds.has(impersonatedUser.id)) return prev;
        return { ...prev, users: [...(prev.users || []), impersonatedUser] };
      });
      if (impersonatedUser.role === 'bar') {
        navigate('/bar-dashboard');
      } else if (impersonatedUser.role === 'seller') {
        navigate('/seller-dashboard');
      } else {
        navigate('/account');
      }
    } catch (err) {
      setAdminAuthActionMessage(err?.message || 'Could not impersonate user. Check the console for details.');
    }
  }

  async function updateUserCredentialsByAdmin(userId, { newEmail, newPassword } = {}) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.USERS_CREDENTIALS_MANAGE)) {
      return { ok: false, error: 'Admin permission is required.' };
    }
    const normalizedUserId = String(userId || '').trim();
    const normalizedEmail = String(newEmail || '').trim().toLowerCase();
    const normalizedPassword = String(newPassword || '');
    const hasEmail = Boolean(normalizedEmail);
    const hasPassword = Boolean(normalizedPassword);
    if (!normalizedUserId || (!hasEmail && !hasPassword)) {
      return { ok: false, error: 'Provide a new email or new password.' };
    }
    if (hasEmail && !normalizedEmail.includes('@')) {
      return { ok: false, error: 'Enter a valid email address.' };
    }
    if (hasPassword) {
      const hasNumber = /\d/.test(normalizedPassword);
      const hasSymbol = /[^A-Za-z0-9]/.test(normalizedPassword);
      if (normalizedPassword.length < 8 || !hasNumber || !hasSymbol) {
        return { ok: false, error: registerText.passwordPolicyError || 'Password must be at least 8 characters and include at least 1 number and 1 symbol.' };
      }
    }

    if (backendStatus === 'connected' && apiAuthToken) {
      const { ok, payload } = await apiRequestJson(`/api/admin/users/${encodeURIComponent(normalizedUserId)}/credentials`, {
        method: 'POST',
        body: {
          ...(hasEmail ? { newEmail: normalizedEmail } : {}),
          ...(hasPassword ? { newPassword: normalizedPassword } : {}),
        },
      });
      if (!ok) {
        return { ok: false, error: String(payload?.error || 'Could not update user credentials right now.') };
      }
      const nextUser = payload?.user || null;
      if (nextUser?.id) {
        setDb((prev) => ({
          ...prev,
          users: (prev.users || []).map((user) => (
            user.id === nextUser.id
              ? { ...user, ...nextUser }
              : user
          )),
        }));
      }
      return { ok: true, message: String(payload?.message || 'User credentials updated.') };
    }

    const duplicateEmail = hasEmail && users.some((user) => (
      user.id !== normalizedUserId
      && String(user.email || '').trim().toLowerCase() === normalizedEmail
    ));
    if (duplicateEmail) {
      return { ok: false, error: registerText.emailExistsError || 'This email is already registered.' };
    }
    setDb((prev) => ({
      ...prev,
      users: (prev.users || []).map((user) => (
        user.id === normalizedUserId
          ? {
              ...user,
              ...(hasEmail ? { email: normalizedEmail } : {}),
              ...(hasPassword ? { password: normalizedPassword } : {}),
            }
          : user
      )),
    }));
    return { ok: true, message: 'User credentials updated.' };
  }

  async function applyAdminWalletAdjustment(userId, { direction, amountThb, reason } = {}) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.PAYMENTS_MANAGE)) {
      return { ok: false, error: 'payments.manage permission is required.' };
    }
    const normalizedUserId = String(userId || '').trim();
    const dir = String(direction || '').trim().toLowerCase();
    const amt = Number(amountThb);
    const reasonStr = String(reason || '').trim();
    if (!normalizedUserId) {
      return { ok: false, error: 'User id is required.' };
    }
    if (dir !== 'credit' && dir !== 'debit') {
      return { ok: false, error: 'Choose credit or debit.' };
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      return { ok: false, error: 'Enter a positive amount in THB.' };
    }
    if (reasonStr.length < 4) {
      return { ok: false, error: 'Add a short reason (at least 4 characters).' };
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      const { ok, payload } = await apiRequestJson(
        `/api/admin/users/${encodeURIComponent(normalizedUserId)}/wallet-adjustment`,
        {
          method: 'POST',
          body: { direction: dir, amountThb: amt, reason: reasonStr },
          idempotencyScope: `wallet_adj_${normalizedUserId}_${Date.now()}`,
        },
      );
      if (!ok) {
        return { ok: false, error: String(payload?.error || 'Wallet adjustment failed.') };
      }
      const nextBal = Number(payload?.walletBalance);
      const tx = payload?.walletTransaction;
      if (payload?.userId) {
        setDb((prev) => ({
          ...prev,
          users: (prev.users || []).map((user) => (
            user.id === payload.userId
              ? { ...user, walletBalance: Number.isFinite(nextBal) ? nextBal : user.walletBalance }
              : user
          )),
          walletTransactions: tx?.id
            ? [tx, ...(prev.walletTransactions || [])]
            : (prev.walletTransactions || []),
        }));
      }
      return { ok: true, message: 'Wallet updated.', walletBalance: nextBal, walletTransaction: tx };
    }
    return { ok: false, error: 'Connect to the API to adjust wallets.' };
  }

  async function updateUserAdminAccessBySuperAdmin(userId, { enabled, scopes } = {}) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.USERS_ADMIN_ACCESS_MANAGE)) {
      return { ok: false, error: 'Super admin permission is required.' };
    }
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) {
      return { ok: false, error: 'User id is required.' };
    }
    const nextEnabled = enabled === true;
    const nextScopes = Array.isArray(scopes)
      ? scopes.map((entry) => String(entry || '').trim()).filter((scope) => KNOWN_ADMIN_SCOPES.has(scope))
      : [];
    if (backendStatus === 'connected' && apiAuthToken) {
      const { ok, payload } = await apiRequestJson(`/api/admin/users/${encodeURIComponent(normalizedUserId)}/admin-access`, {
        method: 'POST',
        body: {
          enabled: nextEnabled,
          scopes: nextScopes,
        },
      });
      if (!ok) {
        return { ok: false, error: String(payload?.error || 'Could not update delegated admin access.') };
      }
      const nextUser = payload?.user || null;
      if (nextUser?.id) {
        setDb((prev) => ({
          ...prev,
          users: (prev.users || []).map((user) => (
            user.id === nextUser.id
              ? { ...user, ...nextUser }
              : user
          )),
        }));
      }
      return { ok: true, message: String(payload?.message || 'Delegated admin access updated.'), user: nextUser };
    }

    setDb((prev) => ({
      ...prev,
      users: (prev.users || []).map((user) => {
        if (user.id !== normalizedUserId) return user;
        const role = String(user?.role || '').trim().toLowerCase();
        if (!['seller', 'bar'].includes(role)) return user;
        return {
          ...user,
          adminAccess: nextEnabled
            ? { enabled: true, level: 'limited', scopes: nextScopes }
            : { enabled: false, level: 'none', scopes: [] },
        };
      }),
    }));
    return { ok: true, message: nextEnabled ? 'Delegated admin access updated.' : 'Delegated admin access removed.' };
  }

  function logout() {
    setSession({ userId: null });
    setApiAuthToken('');
    apiIdempotencyKeysRef.current = {};
    setAuthError('');
    setAuthSuccess('');
    navigate('/');
  }

  function updateAccountField(key, value) {
    if (['address', 'city', 'region', 'country', 'postalCode', 'timeFormat'].includes(key)) {
      setAccountSaveMessage('');
    }
    setAccountForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCheckoutField(key, value) {
    if (key === 'country' || key === 'shippingMethod' || key === 'postalCode' || key === 'city' || key === 'region') {
      setCheckoutError('');
    }
    setCheckoutForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSellerProfileField(key, value) {
    setSellerProfileMessage('');
    setSellerProfileDraft((prev) => ({ ...prev, [key]: value }));
  }

  function updateSellerAffiliationRequestDraftMessage(value) {
    setSellerAffiliationRequestDraft((prev) => ({
      ...prev,
      message: String(value || '').slice(0, 600),
    }));
  }

  async function handleSellerAffiliationRequestImagesUpload(fileList) {
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    const files = Array.from(fileList || []).slice(0, 4);
    if (!files.length) return;
    const skipped = [];
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_BYTES) { skipped.push(file.name); return false; }
      if (!file.type.startsWith('image/')) { skipped.push(file.name); return false; }
      return true;
    });
    if (skipped.length > 0) {
      setSellerProfileMessage(`Skipped ${skipped.length} file(s) — images must be under 5 MB.`);
    }
    if (!validFiles.length) return;
    const loadedImages = await Promise.all(
      validFiles.map((file) => new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
          URL.revokeObjectURL(objectUrl);
          resolve({
            id: makeRuntimeId('affiliation_image'),
            image: dataUrl,
            imageName: String(file.name || 'application-image.jpg'),
          });
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        img.src = objectUrl;
      })),
    );
    setSellerAffiliationRequestDraft((prev) => ({
      ...prev,
      images: [...(prev.images || []), ...loadedImages.filter((item) => item?.image)].slice(0, 4),
    }));
  }

  function removeSellerAffiliationRequestDraftImage(imageId) {
    if (!imageId) return;
    setSellerAffiliationRequestDraft((prev) => ({
      ...prev,
      images: (prev.images || []).filter((image) => image?.id !== imageId),
    }));
  }

  function makeRuntimeId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function buildInAppNotification(userId, text, createdAt, type = 'engagement', extra = {}) {
    return {
      id: makeRuntimeId('notif'),
      userId,
      type,
      text,
      read: false,
      createdAt,
      ...extra,
    };
  }

  async function saveSellerProfile() {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    if (isSavingSellerProfile) return;
    setIsSavingSellerProfile(true);
    setSellerProfileSaveSuccess(false);
    try {
    const languages = (sellerProfileDraft.languages || [])
      .map((value) => (value || '').trim())
      .filter((value) => SELLER_LANGUAGE_OPTIONS.includes(value));
    const requestedBarId = String(sellerProfileDraft.affiliatedBarId || '').trim();
    const normalizedAffiliatedBarId = requestedBarId && bars.some((bar) => bar.id === requestedBarId) ? requestedBarId : '';
    const previousAffiliatedBarId = String(currentSellerProfile?.affiliatedBarId || '').trim();
    const isAffiliationChange = normalizedAffiliatedBarId !== previousAffiliatedBarId;
    const isJoinRequest = Boolean(normalizedAffiliatedBarId && isAffiliationChange);
    const isLeavingBar = Boolean(!normalizedAffiliatedBarId && previousAffiliatedBarId);
    const now = new Date().toISOString();
    const locationText = String(sellerProfileDraft.location || '').trim();
    const bioText = sellerProfileDraft.bio.trim();
    const shippingText = String(sellerProfileDraft.shipping || '').trim() || 'Worldwide via international carriers';
    const turnaroundText = String(sellerProfileDraft.turnaround || '').trim() || 'Ships in 1-3 days';
    const [locationI18n, bioI18n, shippingI18n, turnaroundI18n] = await Promise.all([
      buildTextTranslations(locationText),
      buildTextTranslations(bioText),
      buildTextTranslations(shippingText),
      buildTextTranslations(turnaroundText),
    ]);
    setDb((prev) => {
      const nextNotifications = [...(prev.notifications || [])];
      const nextAdminActions = [...(prev.adminActions || [])];
      const nextRequests = [...(prev.barAffiliationRequests || [])];
      const prevSeller = (prev.sellers || []).find((seller) => seller.id === currentSellerId);
      const prevSellerName = prevSeller?.name || currentUser?.name || 'Seller';
      const requestedBar = (prev.bars || []).find((bar) => bar.id === normalizedAffiliatedBarId);
      const previousBar = (prev.bars || []).find((bar) => bar.id === previousAffiliatedBarId);
      const requestedBarUsers = (prev.users || []).filter((user) => (
        user.role === 'bar'
        && (
          String(user.barId || '').trim() === normalizedAffiliatedBarId
          || (
            !String(user.barId || '').trim()
            && namesLikelyMatch(user?.name, requestedBar?.name)
          )
        )
      ));
      const fallbackRequestedBarUsers = requestedBarUsers.length > 0
        ? requestedBarUsers
        : (prev.users || []).filter((user) => user.role === 'bar');
      const previousBarUser = (prev.users || []).find((user) => user.role === 'bar' && user.barId === previousAffiliatedBarId);

      let sellerMessage = sellerStatus('profileSaved');
      if (isJoinRequest) {
        const duplicateRequest = nextRequests.some((request) =>
          request.status === 'pending'
          && request.direction === 'seller_to_bar'
          && request.sellerId === currentSellerId
          && request.barId === normalizedAffiliatedBarId
        );
        if (!duplicateRequest) {
          nextRequests.push({
            id: makeRuntimeId('bar_affiliation_request'),
            direction: 'seller_to_bar',
            sellerId: currentSellerId,
            barId: normalizedAffiliatedBarId,
            targetBarUserIds: fallbackRequestedBarUsers.map((user) => user.id).filter(Boolean),
            requestedByUserId: currentUser.id,
            requestedByRole: 'seller',
            status: 'pending',
            createdAt: now,
            respondedAt: null,
            respondedByUserId: null,
          });
          if (fallbackRequestedBarUsers.length > 0) {
            const latestRequestId = nextRequests[nextRequests.length - 1]?.id;
            fallbackRequestedBarUsers.forEach((barUser) => {
              if (!barUser?.id) return;
              nextNotifications.push(
                buildInAppNotification(
                  barUser.id,
                  `${prevSellerName} requested to join ${requestedBar?.name || 'your bar'}.`,
                  now,
                  'engagement',
                  {
                    category: 'bar_affiliation',
                    affiliationEvent: 'seller_requested_join',
                    affiliationRequestId: latestRequestId || null,
                    sellerId: currentSellerId,
                    barId: normalizedAffiliatedBarId,
                    targetBarUserIds: fallbackRequestedBarUsers.map((user) => user.id).filter(Boolean),
                  },
                )
              );
            });
          }
          nextAdminActions.push({
            id: makeRuntimeId('admin_action'),
            type: 'seller_requested_bar_affiliation',
            targetSellerId: currentSellerId,
            targetBarId: normalizedAffiliatedBarId,
            actorUserId: currentUser.id,
            createdAt: now,
          });
          sellerMessage = requestedBar?.name
            ? `Affiliation request sent to ${requestedBar.name}.`
            : 'Affiliation request sent.';
        } else {
          sellerMessage = requestedBar?.name
            ? `You already have a pending request for ${requestedBar.name}.`
            : 'You already have a pending affiliation request.';
        }
      }

      if (isLeavingBar && previousBarUser?.id) {
        nextNotifications.push(
          buildInAppNotification(
            previousBarUser.id,
            `${prevSellerName} is no longer affiliated with ${previousBar?.name || 'your bar'}.`,
            now,
            'engagement',
            {
              category: 'bar_affiliation',
              affiliationEvent: 'seller_left_bar',
              sellerId: currentSellerId,
              barId: previousAffiliatedBarId,
            },
          )
        );
        nextAdminActions.push({
          id: makeRuntimeId('admin_action'),
          type: 'seller_left_bar_affiliation',
          targetSellerId: currentSellerId,
          targetBarId: previousAffiliatedBarId,
          actorUserId: currentUser.id,
          createdAt: now,
        });
      }

      setSellerProfileMessage(sellerMessage);
      return {
        ...prev,
        sellers: (prev.sellers || []).map((seller) =>
          seller.id === currentSellerId
            ? {
                ...seller,
                location: locationText,
                locationI18n: locationI18n && Object.keys(locationI18n).length > 0 ? locationI18n : normalizeLocalizedMap(seller?.locationI18n, locationText),
                languages,
                bio: bioText,
                bioI18n: bioI18n && Object.keys(bioI18n).length > 0 ? bioI18n : normalizeLocalizedMap(seller?.bioI18n, bioText),
                affiliatedBarId: isJoinRequest ? previousAffiliatedBarId : normalizedAffiliatedBarId,
                shipping: shippingText,
                shippingI18n: shippingI18n && Object.keys(shippingI18n).length > 0 ? shippingI18n : normalizeLocalizedMap(seller?.shippingI18n, shippingText),
                turnaround: turnaroundText,
                turnaroundI18n: turnaroundI18n && Object.keys(turnaroundI18n).length > 0 ? turnaroundI18n : normalizeLocalizedMap(seller?.turnaroundI18n, turnaroundText),
                portfolioUrl: '',
                profileImage: sellerProfileDraft.profileImage || '',
                profileImageName: sellerProfileDraft.profileImageName || '',
                height: sellerProfileDraft.height || '',
                weight: sellerProfileDraft.weight || '',
                hairColor: sellerProfileDraft.hairColor || '',
                braSize: sellerProfileDraft.braSize || '',
                pantySize: sellerProfileDraft.pantySize || '',
                birthDay: sellerProfileDraft.birthDay || null,
                birthMonth: sellerProfileDraft.birthMonth || null,
                disabledGiftTypes: sellerProfileDraft.disabledGiftTypes || [],
              }
            : seller,
        ),
        barAffiliationRequests: nextRequests,
        notifications: nextNotifications,
        adminActions: nextAdminActions,
      };
    });
    if (backendStatus === 'connected' && apiAuthToken && currentSellerId) {
      apiRequestJson(`/api/sellers/${encodeURIComponent(currentSellerId)}`, {
        method: 'PUT',
        body: {
          location: locationText,
          locationI18n,
          bio: bioText,
          bioI18n,
          shipping: shippingText,
          shippingI18n,
          turnaround: turnaroundText,
          turnaroundI18n,
          languages,
          profileImage: sellerProfileDraft.profileImage || '',
          profileImageName: sellerProfileDraft.profileImageName || '',
          height: sellerProfileDraft.height || '',
          weight: sellerProfileDraft.weight || '',
          hairColor: sellerProfileDraft.hairColor || '',
          braSize: sellerProfileDraft.braSize || '',
          pantySize: sellerProfileDraft.pantySize || '',
          affiliatedBarId: isJoinRequest ? previousAffiliatedBarId : normalizedAffiliatedBarId,
          feedVisibility: currentSellerProfile?.feedVisibility || 'public',
          birthDay: sellerProfileDraft.birthDay || null,
          birthMonth: sellerProfileDraft.birthMonth || null,
          disabledGiftTypes: sellerProfileDraft.disabledGiftTypes || [],
        },
      }).catch((err) => {
        console.error('Seller profile save failed:', err);
        setSellerProfileMessage('Profile saved locally but failed to sync to server. Please try saving again.');
      });
    }
    setSellerProfileSaveSuccess(true);
    setTimeout(() => setSellerProfileSaveSuccess(false), 4000);
    } catch (err) {
      setSellerProfileMessage('Something went wrong saving your profile. Please try again.');
    } finally {
      setIsSavingSellerProfile(false);
    }
  }

  function requestSellerBarAffiliation(payload = {}) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    const requestedBarId = String(sellerProfileDraft?.affiliatedBarId || '').trim();
    const requestMessage = String(payload?.message || '').trim().slice(0, 600);
    const requestImages = (Array.isArray(payload?.images) ? payload.images : [])
      .map((image) => ({
        id: String(image?.id || makeRuntimeId('affiliation_image')),
        image: String(image?.image || ''),
        imageName: String(image?.imageName || 'application-image.jpg'),
      }))
      .filter((image) => image.image)
      .slice(0, 4);
    if (!requestedBarId) {
      setSellerProfileMessage('Select a bar first, then click Apply.');
      return;
    }
    const now = new Date().toISOString();
    const nextRequestId = makeRuntimeId('bar_affiliation_request');
    setDb((prev) => {
      const seller = (prev.sellers || []).find((entry) => entry.id === currentSellerId);
      const bar = (prev.bars || []).find((entry) => entry.id === requestedBarId);
      const barUsers = (prev.users || []).filter((user) => (
        user.role === 'bar'
        && (
          String(user.barId || '').trim() === requestedBarId
          || (
            !String(user.barId || '').trim()
            && namesLikelyMatch(user?.name, bar?.name)
          )
        )
      ));
      const fallbackBarUsers = barUsers.length > 0
        ? barUsers
        : (prev.users || []).filter((user) => user.role === 'bar');
      if (!seller || !bar) {
        setSellerProfileMessage('Selected bar was not found.');
        return prev;
      }
      if (String(seller.affiliatedBarId || '').trim() === requestedBarId) {
        setSellerProfileMessage(`You are already affiliated with ${bar.name}.`);
        return prev;
      }
      const hasPendingRequest = (prev.barAffiliationRequests || []).some((request) =>
        request.status === 'pending'
        && request.direction === 'seller_to_bar'
        && request.sellerId === currentSellerId
        && request.barId === requestedBarId
      );
      if (hasPendingRequest) {
        setSellerProfileMessage(`You already have a pending request for ${bar.name}.`);
        return prev;
      }
      const hasPendingAnyBar = (prev.barAffiliationRequests || []).some((request) =>
        request.status === 'pending'
        && request.direction === 'seller_to_bar'
        && request.sellerId === currentSellerId
        && request.barId !== requestedBarId
      );
      if (hasPendingAnyBar) {
        setSellerProfileMessage('You already have a pending application to another bar. Cancel it first.');
        return prev;
      }

      const nextRequest = {
        id: nextRequestId,
        direction: 'seller_to_bar',
        sellerId: currentSellerId,
        barId: requestedBarId,
        targetBarUserIds: fallbackBarUsers.map((user) => user.id).filter(Boolean),
        requestedByUserId: currentUser.id,
        requestedByRole: 'seller',
        status: 'pending',
        createdAt: now,
        respondedAt: null,
        respondedByUserId: null,
        sellerMessage: requestMessage,
        sellerImages: requestImages,
      };
      const sellerName = String(seller?.name || currentUser?.name || 'Seller').trim() || 'Seller';
      setSellerProfileMessage(`Affiliation request sent to ${bar.name}.`);
      setSellerAffiliationRequestDraft({ message: '', images: [] });
      return {
        ...prev,
        barAffiliationRequests: [...(prev.barAffiliationRequests || []), nextRequest],
        notifications: [
          ...(prev.notifications || []),
          ...fallbackBarUsers
            .filter((user) => Boolean(user?.id))
            .map((user) => buildInAppNotification(
              user.id,
              `${sellerName} requested to join ${bar.name}.`,
              now,
              'engagement',
              {
                category: 'bar_affiliation',
                affiliationEvent: 'seller_requested_join',
                affiliationRequestId: nextRequest.id,
                sellerId: currentSellerId,
                barId: requestedBarId,
                targetBarUserIds: fallbackBarUsers.map((entry) => entry.id).filter(Boolean),
              },
            )),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: makeRuntimeId('admin_action'),
            type: 'seller_requested_bar_affiliation',
            targetSellerId: currentSellerId,
            targetBarId: requestedBarId,
            actorUserId: currentUser.id,
            createdAt: now,
          },
        ],
      };
    });
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson('/api/affiliation-requests', {
        method: 'POST',
        body: {
          id: nextRequestId,
          sellerId: currentSellerId,
          barId: requestedBarId,
          direction: 'seller_to_bar',
          sellerMessage: requestMessage,
          sellerImages: requestImages.map((img) => img.image),
        },
        idempotencyScope: 'affiliation_request',
      }).catch((err) => console.warn('[requestSellerBarAffiliation] API sync failed:', err));
    }
  }

  function respondToBarAffiliationRequest(requestId, decision) {
    if (!requestId || !['approved', 'rejected'].includes(decision)) return;
    if (!currentUser || !['bar', 'seller', 'admin'].includes(currentUser.role)) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const existingRequest = (prev.barAffiliationRequests || []).find((entry) => entry.id === requestId);
      const recoveryNotification = !existingRequest
        ? (prev.notifications || []).find((notification) => {
            const notificationRequestId = String(notification?.affiliationRequestId || notification?.id || '').trim();
            const notificationText = String(notification?.text || '').toLowerCase();
            return (
              (
                notificationRequestId === String(requestId || '').trim()
                || /requested to join|join request|applied to join/.test(notificationText)
              )
              && (
                String(notification?.affiliationEvent || '').trim() === 'seller_requested_join'
                || /requested to join|join request|applied to join/.test(notificationText)
              )
            );
          })
        : null;
      const recoveryText = String(recoveryNotification?.text || '');
      const inferredSellerIdFromText = String(
        (prev.sellers || []).find((entry) => (
          String(entry?.name || '').trim()
          && recoveryText.toLowerCase().includes(String(entry?.name || '').trim().toLowerCase())
        ))?.id || ''
      ).trim();
      const inferredBarIdFromText = String(
        (prev.bars || []).find((entry) => (
          String(entry?.name || '').trim()
          && recoveryText.toLowerCase().includes(String(entry?.name || '').trim().toLowerCase())
        ))?.id || ''
      ).trim();
      const recoveredRequest = (!existingRequest && recoveryNotification)
        ? {
            id: String(recoveryNotification?.affiliationRequestId || requestId || '').trim(),
            direction: 'seller_to_bar',
            sellerId: String(recoveryNotification?.sellerId || inferredSellerIdFromText || '').trim(),
            barId: String(recoveryNotification?.barId || inferredBarIdFromText || currentBarId || currentUser?.barId || '').trim(),
            targetBarUserIds: Array.isArray(recoveryNotification?.targetBarUserIds)
              ? recoveryNotification.targetBarUserIds.map((id) => String(id || '').trim()).filter(Boolean)
              : [String(currentUser?.id || '').trim()].filter(Boolean),
            requestedByUserId: null,
            requestedByRole: 'seller',
            status: 'pending',
            createdAt: recoveryNotification?.createdAt || now,
            respondedAt: null,
            respondedByUserId: null,
            sellerMessage: String(recoveryNotification?.sellerMessage || ''),
            sellerImages: Array.isArray(recoveryNotification?.sellerImages) ? recoveryNotification.sellerImages : [],
          }
        : null;
      const request = existingRequest || recoveredRequest;
      if (!request || request.status !== 'pending') return prev;
      const sellerRecord = (prev.sellers || []).find((entry) => entry.id === request.sellerId);
      const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === request.sellerId);
      const seller = sellerRecord || (sellerUser ? { id: request.sellerId, name: sellerUser.name || request.sellerId } : null)
        || (request.sellerId ? { id: request.sellerId, name: request.sellerId } : null);
      const resolvedRequestBarId = String(request?.barId || '').trim();
      const bar = (prev.bars || []).find((entry) => (
        String(entry?.id || '').trim() === resolvedRequestBarId
        || (currentUser?.role === 'bar' && String(entry?.id || '').trim() === String(currentBarId || '').trim())
        || namesLikelyMatch(currentUser?.name, entry?.name)
      ));
      const fallbackBarByName = (prev.bars || []).find((entry) => namesLikelyMatch(currentUser?.name, entry?.name));
      const fallbackResolvedBarId = String(
        bar?.id
        || fallbackBarByName?.id
        || resolvedRequestBarId
        || currentBarId
        || currentUser?.barId
        || Array.from(resolvedBarIdsForCurrentUser || [])[0]
        || ''
      ).trim();
      const resolvedBar = bar
        || fallbackBarByName
        || (prev.bars || []).find((entry) => String(entry?.id || '').trim() === fallbackResolvedBarId)
        || null;
      const resolvedBarId = String(resolvedBar?.id || fallbackResolvedBarId || '').trim();
      const resolvedBarName = String(resolvedBar?.name || barMap?.[resolvedBarId]?.name || 'your bar').trim() || 'your bar';
      const requestTargetBarUserIds = Array.isArray(request?.targetBarUserIds)
        ? request.targetBarUserIds.map((id) => String(id || '').trim()).filter(Boolean)
        : [];
      const barUser = (prev.users || []).find((user) => (
        user.role === 'bar'
        && (
          String(user.barId || '').trim() === resolvedBarId
          || requestTargetBarUserIds.includes(String(user.id || '').trim())
          || String(user.id || '').trim() === String(currentUser?.id || '').trim()
        )
      )) || (currentUser?.role === 'bar' ? currentUser : null);
      if (!seller || !resolvedBarId) return prev;
      const actorIsBarApprover = request.direction === 'seller_to_bar' && currentUser.role === 'bar';
      const actorIsSellerApprover = request.direction === 'bar_to_seller' && currentUser.role === 'seller' && currentUser.sellerId === request.sellerId;
      const actorIsAdminApprover = currentUser.role === 'admin';
      if (!actorIsBarApprover && !actorIsSellerApprover && !actorIsAdminApprover) return prev;

      const previousBarId = String(seller.affiliatedBarId || '').trim();
      const nextNotifications = [...(prev.notifications || [])];
      const nextAdminActions = [...(prev.adminActions || [])];
      const nextRequestRecord = {
        ...request,
        barId: resolvedBarId || request.barId,
        status: decision,
        respondedAt: now,
        respondedByUserId: currentUser.id,
      };
      const nextRequests = existingRequest
        ? (prev.barAffiliationRequests || []).map((entry) => (
            entry.id === requestId
              ? nextRequestRecord
              : entry
          ))
        : [...(prev.barAffiliationRequests || []), nextRequestRecord];

      if (decision === 'approved') {
        if (sellerUser?.id) {
          nextNotifications.push(
            buildInAppNotification(
              sellerUser.id,
              actorIsAdminApprover
                ? `Admin approved your affiliation with ${resolvedBarName}.`
                : `${resolvedBarName} affiliation approved. You are now linked to this bar.`,
              now,
            )
          );
        }
        if (barUser?.id) {
          nextNotifications.push(
            buildInAppNotification(
              barUser.id,
              actorIsAdminApprover
                ? `Admin approved ${seller.name}'s affiliation with ${resolvedBarName}.`
                : `${seller.name} is now affiliated with ${resolvedBarName}.`,
              now,
            )
          );
        }
        if (previousBarId && previousBarId !== resolvedBarId) {
          const previousBarUser = (prev.users || []).find((user) => user.role === 'bar' && user.barId === previousBarId);
          const previousBar = (prev.bars || []).find((entry) => entry.id === previousBarId);
          if (previousBarUser?.id) {
            nextNotifications.push(
              buildInAppNotification(
                previousBarUser.id,
                `${seller.name} is no longer affiliated with ${previousBar?.name || 'your bar'}.`,
                now,
              )
            );
          }
        }
      } else {
        if (request.direction === 'seller_to_bar' && sellerUser?.id) {
          nextNotifications.push(
            buildInAppNotification(
              sellerUser.id,
              actorIsAdminApprover
                ? `Admin rejected your affiliation request for ${resolvedBarName}.`
                : `${resolvedBarName} declined your affiliation request.`,
              now,
            )
          );
        }
        if (request.direction === 'bar_to_seller' && barUser?.id) {
          nextNotifications.push(
            buildInAppNotification(
              barUser.id,
              actorIsAdminApprover
                ? `Admin rejected the affiliation request for ${seller.name}.`
                : `${seller.name} declined your affiliation request.`,
              now,
            )
          );
        }
      }

      nextAdminActions.push({
        id: makeRuntimeId('admin_action'),
        type: decision === 'approved' ? 'approve_bar_affiliation_request' : 'reject_bar_affiliation_request',
        targetSellerId: request.sellerId,
        targetBarId: resolvedBarId || request.barId,
        actorUserId: currentUser.id,
        requestId: request.id,
        createdAt: now,
      });
      if (decision === 'approved') {
        setBarProfileMessage(`Approved affiliation for ${seller.name}.`);
        setSellerProfileMessage(sellerStatus('affiliationConfirmed', { barName: resolvedBarName }));
      } else {
        setBarProfileMessage(`Rejected affiliation request for ${seller.name}.`);
        setSellerProfileMessage(sellerStatus('affiliationRejected', { barName: resolvedBarName }));
      }

      const base = {
        ...prev,
        barAffiliationRequests: nextRequests,
        sellers: (prev.sellers || []).map((entry) => (
          decision === 'approved' && entry.id === request.sellerId
            ? { ...entry, affiliatedBarId: resolvedBarId || request.barId }
            : entry
        )),
        notifications: nextNotifications,
        adminActions: nextAdminActions,
      };
      let withEmails = base;
      const templateKey = decision === 'approved' ? 'bar_affiliation_approved' : 'bar_affiliation_rejected';
      if (sellerUser?.id) {
        withEmails = appendTemplatedEmail(withEmails, {
          templateKey,
          userId: sellerUser.id,
          vars: {
            sellerName: seller.name || 'Seller',
            barName: resolvedBarName || 'Bar',
            actionPath: '/account',
          },
          fallbackPath: '/account',
        });
      }
      if (barUser?.id) {
        withEmails = appendTemplatedEmail(withEmails, {
          templateKey,
          userId: barUser.id,
          vars: {
            sellerName: seller.name || 'Seller',
            barName: resolvedBarName || 'Bar',
            actionPath: '/account',
          },
          fallbackPath: '/account',
        });
      }
      return withEmails;
    });
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson(`/api/affiliation-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        body: { decision },
        idempotencyScope: 'affiliation_respond',
      }).catch((err) => console.warn('[respondToBarAffiliationRequest] API sync failed:', err));
    }
  }

  function cancelBarAffiliationRequest(requestId) {
    if (!requestId || !currentUser) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const request = (prev.barAffiliationRequests || []).find((entry) => entry.id === requestId);
      if (!request || request.status !== 'pending') return prev;
      const seller = (prev.sellers || []).find((entry) => entry.id === request.sellerId);
      const bar = (prev.bars || []).find((entry) => entry.id === request.barId);
      const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === request.sellerId);
      const barUser = (prev.users || []).find((user) => user.role === 'bar' && user.barId === request.barId);
      const actorIsSellerRequester = currentUser.role === 'seller'
        && request.direction === 'seller_to_bar'
        && request.requestedByUserId === currentUser.id;
      const actorIsBarRequester = currentUser.role === 'bar'
        && request.direction === 'bar_to_seller'
        && request.requestedByUserId === currentUser.id;
      if (!actorIsSellerRequester && !actorIsBarRequester) return prev;
      setBarProfileMessage(barStatus('affiliationRequestCancelled'));
      setSellerProfileMessage(sellerStatus('affiliationRequestCancelled'));
      return {
        ...prev,
        barAffiliationRequests: (prev.barAffiliationRequests || []).map((entry) => (
          entry.id === requestId
            ? { ...entry, status: 'cancelled', respondedAt: now, respondedByUserId: currentUser.id }
            : entry
        )),
        notifications: [
          ...(prev.notifications || []),
          ...(actorIsSellerRequester && barUser?.id
            ? [buildInAppNotification(barUser.id, `${seller?.name || 'Seller'} cancelled their affiliation request.`, now)]
            : []),
          ...(actorIsBarRequester && sellerUser?.id
            ? [buildInAppNotification(sellerUser.id, `${bar?.name || 'A bar'} cancelled their affiliation invite.`, now)]
            : []),
        ],
      };
    });
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson(`/api/affiliation-requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        body: { decision: 'cancelled' },
        idempotencyScope: 'affiliation_cancel',
      }).catch((err) => console.warn('[cancelBarAffiliationRequest] API sync failed:', err));
    }
  }

  function removeSellerFromCurrentBarBySeller() {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    const now = new Date().toISOString();
    setDb((prev) => {
      const seller = (prev.sellers || []).find((entry) => entry.id === currentSellerId);
      const oldBarId = String(seller?.affiliatedBarId || '').trim();
      if (!oldBarId) return prev;
      const oldBar = (prev.bars || []).find((entry) => entry.id === oldBarId);
      const oldBarUser = (prev.users || []).find((user) => user.role === 'bar' && user.barId === oldBarId);
      setSellerProfileMessage(sellerStatus('affiliationRemoved', { barName: oldBar?.name || 'bar' }));
      setSellerProfileDraft((draft) => ({ ...draft, affiliatedBarId: '' }));
      return {
        ...prev,
        sellers: (prev.sellers || []).map((entry) => (
          entry.id === currentSellerId ? { ...entry, affiliatedBarId: '' } : entry
        )),
        notifications: [
          ...(prev.notifications || []),
          ...(oldBarUser?.id
            ? [buildInAppNotification(oldBarUser.id, `${seller?.name || 'Seller'} is no longer affiliated with ${oldBar?.name || 'your bar'}.`, now)]
            : []),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: makeRuntimeId('admin_action'),
            type: 'seller_removed_self_from_bar',
            targetSellerId: currentSellerId,
            targetBarId: oldBarId,
            actorUserId: currentUser.id,
            createdAt: now,
          },
        ],
      };
    });
  }

  function removeSellerFromCurrentBarByBar(sellerId, forcedBarId) {
    if (!currentUser || currentUser.role !== 'bar' || !sellerId) return;
    const outerBarId = String(forcedBarId || currentBarId || '').trim();
    const now = new Date().toISOString();
    let removedSellerName = '';
    let removedBarName = '';
    setDb((prev) => {
      const seller = (prev.sellers || []).find((entry) => entry.id === sellerId);
      if (!seller) return prev;
      const sellerBarId = String(seller.affiliatedBarId || '').trim();
      const effectiveBarId = outerBarId || sellerBarId || Array.from(resolvedBarIdsForCurrentUser)[0] || '';
      const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === sellerId);
      const bar = (prev.bars || []).find((entry) => entry.id === effectiveBarId)
        || (sellerBarId ? (prev.bars || []).find((entry) => entry.id === sellerBarId) : null);
      removedSellerName = seller.name;
      removedBarName = bar?.name || 'your bar';
      const cancelBarIds = new Set(
        [effectiveBarId, sellerBarId, ...resolvedBarIdsForCurrentUser].filter(Boolean)
      );
      const nextBarAffiliationRequests = (prev.barAffiliationRequests || []).map((req) => {
        if (String(req.sellerId || '').trim() !== String(sellerId).trim()) return req;
        const reqBarId = String(req.barId || '').trim();
        if (reqBarId && !cancelBarIds.has(reqBarId)) return req;
        if (req.status !== 'approved') return req;
        return { ...req, status: 'cancelled_by_bar', cancelledAt: now };
      });
      return {
        ...prev,
        barAffiliationRequests: nextBarAffiliationRequests,
        sellers: (prev.sellers || []).map((entry) => (
          entry.id === sellerId ? { ...entry, affiliatedBarId: '' } : entry
        )),
        notifications: [
          ...(prev.notifications || []),
          ...(sellerUser?.id
            ? [buildInAppNotification(sellerUser.id, `You were removed from ${bar?.name || 'your bar'} affiliation.`, now)]
            : []),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: makeRuntimeId('admin_action'),
            type: 'bar_removed_seller_affiliation',
            targetSellerId: sellerId,
            targetBarId: effectiveBarId,
            actorUserId: currentUser.id,
            createdAt: now,
          },
        ],
      };
    });
    if (removedSellerName) {
      setBarProfileMessage(`${removedSellerName} removed from ${removedBarName}.`);
    }
  }

  function updateBarProfileField(key, value) {
    setBarProfileMessage('');
    setBarProfileDraft((prev) => ({ ...prev, [key]: value }));
  }

  function buildBarMapFields(mapLinkInput, locationInput) {
    const mapLinkRaw = String(mapLinkInput || '').trim();
    const locationRaw = String(locationInput || '').trim();
    if (!mapLinkRaw && !locationRaw) {
      return { mapLink: '', mapEmbedUrl: '' };
    }
    const locationLooksLikeUrl = /^https?:\/\//i.test(locationRaw);
    const mapLink = mapLinkRaw || (locationLooksLikeUrl ? locationRaw : `https://maps.google.com/?q=${encodeURIComponent(locationRaw)}`);
    let query = '';
    let coords = '';
    let queryFromStructuredUrl = false;
    try {
      const parsed = new URL(mapLink);
      const decodedPath = decodeURIComponent(parsed.pathname || '');
      const coordMatch = decodedPath.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordMatch) coords = `${coordMatch[1]},${coordMatch[2]}`;
      query = String(parsed.searchParams.get('q') || parsed.searchParams.get('query') || '').trim();
      if (query) queryFromStructuredUrl = true;
      if (!query) {
        const placeMatch = decodedPath.match(/\/place\/([^/@]+)/);
        if (placeMatch) {
          query = placeMatch[1].replace(/\+/g, ' ');
          queryFromStructuredUrl = true;
        }
      }
      if (!query && coords) {
        query = coords;
        queryFromStructuredUrl = true;
      }
      if (query && coords && query !== coords) {
        query = `${query} @${coords}`;
      }
    } catch {
      // not a valid URL at all
    }
    if (!queryFromStructuredUrl && locationRaw && !locationLooksLikeUrl) {
      query = locationRaw;
    }
    if (!query) query = locationRaw;
    const mapEmbedUrl = query
      ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
      : '';
    return { mapLink, mapEmbedUrl };
  }

  const SHORT_MAP_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|share\.google)$/i;

  async function autofillBarMapFromLocation() {
    const mapLinkText = String(barProfileDraft.mapLink || '').trim();
    const locationText = String(barProfileDraft.location || '').trim();
    if (!mapLinkText && !locationText) {
      setBarProfileMessage(barStatus('addLocationBeforeAutofill'));
      return;
    }
    let resolvedLink = mapLinkText;
    if (mapLinkText) {
      try {
        const hostname = new URL(mapLinkText).hostname;
        if (SHORT_MAP_HOSTS.test(hostname)) {
          setBarProfileMessage('Resolving short link...');
          const resp = await apiRequestJson(`/api/resolve-map-url?url=${encodeURIComponent(mapLinkText)}`);
          if (resp?.ok && resp?.payload?.resolvedUrl) {
            resolvedLink = resp.payload.resolvedUrl;
          }
        }
      } catch { /* not a valid URL or fetch failed, continue with original */ }
    }
    const nextMap = buildBarMapFields(resolvedLink, locationText);
    setBarProfileDraft((prev) => ({
      ...prev,
      mapLink: nextMap.mapLink,
      mapEmbedUrl: nextMap.mapEmbedUrl,
    }));
    if (nextMap.mapEmbedUrl && currentBarId) {
      setDb((prev) => ({
        ...prev,
        bars: (prev.bars || []).map((bar) => bar.id === currentBarId ? { ...bar, mapLink: nextMap.mapLink, mapEmbedUrl: nextMap.mapEmbedUrl } : bar),
      }));
      if (backendStatus === 'connected' && apiAuthToken) {
        apiRequestJson(`/api/bars/${encodeURIComponent(currentBarId)}`, {
          method: 'PUT',
          body: { mapEmbedUrl: nextMap.mapEmbedUrl, mapLink: nextMap.mapLink },
        }).catch((err) => console.warn('[autofillBarMapFromLocation] API sync failed:', err));
      }
      setBarProfileMessage(barT.mapLocationTitle + ' ✓');
    } else if (nextMap.mapLink) {
      setBarProfileMessage('Link saved but map preview needs a bar location name above.');
    }
  }

  function toggleBarSpecialPreset(optionId) {
    setBarProfileMessage('');
    setBarSpecialPresetSelections((prev) => (
      prev.includes(optionId)
        ? prev.filter((entry) => entry !== optionId)
        : [...prev, optionId]
    ));
  }

  function applyBarSpecialPresetsToDraft() {
    if (!barSpecialPresetSelections.length) return;
    const locale = BAR_DASHBOARD_I18N[uiLanguage] ? uiLanguage : 'en';
    const t = BAR_DASHBOARD_I18N[locale] || BAR_DASHBOARD_I18N.en;
    const labels = barSpecialPresetSelections
      .map((selectedId) => BAR_PROFILE_SPECIAL_PRESET_OPTIONS.find((option) => option.id === selectedId))
      .filter(Boolean)
      .map((option) => option.labels?.[locale] || option.labels?.en || option.id);
    const generatedLine = `${t.highlightsPrefix || 'Highlights'}: ${labels.join(', ')}.`;
    const existingText = String(barProfileDraft.specials || '').trim();
    const cleanedLines = existingText
      .split('\n')
      .map((line) => line.trimEnd())
      .filter((line) => line && !line.trim().toLowerCase().startsWith('highlights:'));
    const nextSpecials = [...cleanedLines, generatedLine].join('\n').trim();
    setBarProfileMessage('');
    setBarProfileDraft((prev) => ({ ...prev, specials: nextSpecials }));
  }

  function appendBarProfilePresetText(fieldKey, presetText) {
    const nextText = String(presetText || '').trim();
    if (!nextText) return;
    setBarProfileMessage('');
    setBarProfileDraft((prev) => {
      const currentValue = String(prev?.[fieldKey] || '').trim();
      return {
        ...prev,
        [fieldKey]: currentValue ? `${currentValue}\n${nextText}` : nextText,
      };
    });
  }

  async function saveBarProfile() {
    if (!currentUser || currentUser.role !== 'bar' || !currentBarId) return;
    if (savingBarProfile) return;
    setSavingBarProfile(true);
    try {
      let specialsText = String(barProfileDraft.specials || '').trim();
      if (barSpecialPresetSelections.length > 0) {
        const locale = BAR_DASHBOARD_I18N[uiLanguage] ? uiLanguage : 'en';
        const t = BAR_DASHBOARD_I18N[locale] || BAR_DASHBOARD_I18N.en;
        const labels = barSpecialPresetSelections
          .map((selectedId) => BAR_PROFILE_SPECIAL_PRESET_OPTIONS.find((option) => option.id === selectedId))
          .filter(Boolean)
          .map((option) => option.labels?.[locale] || option.labels?.en || option.id);
        const generatedLine = `${t.highlightsPrefix || 'Highlights'}: ${labels.join(', ')}.`;
        const cleanedLines = specialsText
          .split('\n')
          .map((line) => line.trimEnd())
          .filter((line) => line && !line.trim().toLowerCase().startsWith('highlights:'));
        specialsText = [...cleanedLines, generatedLine].join('\n').trim();
        setBarProfileDraft((prev) => ({ ...prev, specials: specialsText }));
      }
      const aboutText = String(barProfileDraft.about || '').trim();
      const [aboutI18n, specialsI18n] = await Promise.all([
        buildTextTranslations(aboutText),
        buildTextTranslations(specialsText),
      ]);
      const updatedBar = {
        location: String(barProfileDraft.location || '').trim(),
        about: aboutText,
        aboutI18n: aboutI18n && Object.keys(aboutI18n).length > 0 ? aboutI18n : {},
        specials: specialsText,
        specialsI18n: specialsI18n && Object.keys(specialsI18n).length > 0 ? specialsI18n : {},
        mapEmbedUrl: String(barProfileDraft.mapEmbedUrl || '').trim(),
        mapLink: String(barProfileDraft.mapLink || '').trim(),
        profileImage: barProfileDraft.profileImage || '',
        profileImageName: barProfileDraft.profileImageName || '',
        name: currentUser?.name || '',
      };
      setDb((prev) => ({
        ...prev,
        bars: (prev.bars || []).map((bar) => (
          bar.id === currentBarId
            ? {
                ...bar,
                ...updatedBar,
                aboutI18n: updatedBar.aboutI18n && Object.keys(updatedBar.aboutI18n).length > 0 ? updatedBar.aboutI18n : normalizeLocalizedMap(bar?.aboutI18n, aboutText),
                specialsI18n: updatedBar.specialsI18n && Object.keys(updatedBar.specialsI18n).length > 0 ? updatedBar.specialsI18n : normalizeLocalizedMap(bar?.specialsI18n, specialsText),
              }
            : bar
        )),
      }));
      if (backendStatus === 'connected' && apiAuthToken) {
        apiRequestJson(`/api/bars/${encodeURIComponent(currentBarId)}`, {
          method: 'PUT',
          body: updatedBar,
        }).catch((err) => console.warn('[saveBarProfile] API sync failed:', err));
      }
      setBarProfileMessage(barT.profileSaved);
    } catch {
      setBarProfileMessage(barStatus('saveFailed'));
    } finally {
      setSavingBarProfile(false);
    }
  }

  function handleBarProfileImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_BYTES) {
      setBarProfileMessage('Image must be under 5 MB. Please choose a smaller file.');
      event.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setBarProfileMessage('Only image files are accepted.');
      event.target.value = '';
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setBarProfileDraft((prev) => ({
        ...prev,
        profileImage: dataUrl,
        profileImageName: file.name,
      }));
      setBarProfileMessage('');
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      setBarProfileMessage('Could not read that image. Please try a different file.');
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  function handleBarPostImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_BYTES) {
      setBarProfileMessage('Image must be under 5 MB. Please choose a smaller file.');
      event.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setBarProfileMessage('Only image files are accepted.');
      event.target.value = '';
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setBarPostDraft((prev) => ({
        ...prev,
        image: dataUrl,
        imageName: file.name,
      }));
      setBarProfileMessage('');
      URL.revokeObjectURL(objectUrl);
      const el = document.getElementById('bar-post-image-input');
      if (el) el.value = '';
    };
    img.onerror = () => {
      setBarProfileMessage('Could not read that image. Please try a different file.');
      URL.revokeObjectURL(objectUrl);
      const el = document.getElementById('bar-post-image-input');
      if (el) el.value = '';
    };
    img.src = objectUrl;
  }

  function createBarPost() {
    if (!currentUser || currentUser.role !== 'bar' || !currentBarId) return;
    if (!barPostDraft.image) {
      setBarProfileMessage(barStatus('uploadImageBeforePosting'));
      return;
    }
    if (creatingBarPost) return;
    setCreatingBarPost(true);
    const now = new Date().toISOString();
    const tempId = `bar_post_${Date.now()}`;
    const caption = String(barPostDraft.caption || '').trim().slice(0, 500);
    const image = barPostDraft.image;
    const imageName = barPostDraft.imageName;
    setDb((prev) => ({
      ...prev,
      barPosts: [
        { id: tempId, barId: currentBarId, caption, image, imageName, createdAt: now },
        ...(prev.barPosts || []),
      ],
    }));
    setBarPostDraft({ caption: '', image: '', imageName: '' });
    setBarProfileMessage(barStatus('photoPosted'));
    setCreatingBarPost(false);
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson('/api/bar-posts', { method: 'POST', body: { image, imageName, caption } })
        .then((res) => {
          if (res?.post?.id && res.post.id !== tempId) {
            setDb((prev) => ({
              ...prev,
              barPosts: (prev.barPosts || []).map((p) => (p.id === tempId ? { ...p, id: res.post.id } : p)),
            }));
          }
        })
        .catch((err) => console.warn('[createBarPost] API sync failed:', err));
    }
  }

  function deleteBarPost(postId) {
    if (!currentUser || currentUser.role !== 'bar' || !currentBarId) return;
    if (!postId || deletingBarPostId === postId) return;
    setDeletingBarPostId(postId);
    setDb((prev) => ({
      ...prev,
      barPosts: (prev.barPosts || []).filter((post) => !(post.id === postId && post.barId === currentBarId)),
    }));
    setBarProfileMessage(barStatus('postRemoved'));
    setDeletingBarPostId(null);
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson(`/api/bar-posts/${encodeURIComponent(postId)}`, { method: 'DELETE' }).catch((err) => console.warn('[deleteBarPost] API sync failed:', err));
    }
  }

  function handleSellerProfileImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_BYTES) {
      setSellerProfileMessage('Image must be under 5 MB. Please choose a smaller file.');
      event.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setSellerProfileMessage('Only image files are accepted.');
      event.target.value = '';
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setSellerProfileDraft((prev) => ({
        ...prev,
        profileImage: dataUrl,
        profileImageName: file.name,
      }));
      setSellerProfileMessage('');
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      setSellerProfileMessage('Could not read that image. Please try a different file.');
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  function updateSellerLanguage(languageCode) {
    if (!currentUser || currentUser.role !== 'seller') return;
    const supported = ['en', 'th', 'my', 'ru'];
    const nextLanguage = supported.includes(languageCode) ? languageCode : 'en';
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === currentUser.id
          ? { ...user, preferredLanguage: nextLanguage }
          : user
      ),
    }));
    setSellerProfileMessage(sellerStatus('languageUpdated'));
  }

  function updateBarLanguage(languageCode) {
    if (!currentUser || currentUser.role !== 'bar') return;
    const nextLanguage = SUPPORTED_AUTH_LANGUAGES.includes(languageCode) ? languageCode : 'en';
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === currentUser.id
          ? { ...user, preferredLanguage: nextLanguage }
          : user
      ),
    }));
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson('/api/auth/language', { method: 'PATCH', body: { language: nextLanguage } }).catch((err) => console.warn('[updateBarLanguage] API sync failed:', err));
    }
    setBarProfileMessage(barStatus('languageUpdated'));
  }

  function toggleSellerOnlineStatus() {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    const currentlyOnline = Boolean(currentSellerProfile?.isOnline);
    const nextOnline = !currentlyOnline;
    setDb((prev) => ({
      ...prev,
      sellers: prev.sellers.map((seller) => (
        seller.id === currentSellerId
          ? { ...seller, isOnline: nextOnline }
          : seller
      )),
    }));
    setSellerProfileMessage(nextOnline ? sellerStatus('onlineEnabled') : sellerStatus('onlineDisabled'));
  }

  function setSellerFeedVisibility(nextVisibility) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    if (!['public', 'private', 'per-post'].includes(nextVisibility)) return;
    setDb((prev) => ({
      ...prev,
      sellers: prev.sellers.map((seller) => (
        seller.id === currentSellerId
          ? { ...seller, feedVisibility: nextVisibility }
          : seller
      )),
    }));
    if (nextVisibility === 'public' || nextVisibility === 'private') {
      setSellerPostDraft((prev) => ({ ...prev, visibility: nextVisibility }));
    }
    if (nextVisibility === 'private') setSellerProfileMessage(sellerStatus('feedPrivate'));
    else if (nextVisibility === 'public') setSellerProfileMessage(sellerStatus('feedPublic'));
    else setSellerProfileMessage(sellerStatus('feedPerPost'));
  }

  function updateSellerPostVisibility(postId, visibility, nextPriceInput) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    if (!['public', 'private'].includes(visibility)) return;
    const parsedPrice = Number(nextPriceInput);
    const normalizedPrice = Number.isFinite(parsedPrice) && parsedPrice >= MIN_FEED_UNLOCK_PRICE_THB ? Number(parsedPrice.toFixed(2)) : MIN_FEED_UNLOCK_PRICE_THB;
    setDb((prev) => ({
      ...prev,
      sellerPosts: (prev.sellerPosts || []).map((post) => (
        post.id === postId && post.sellerId === currentSellerId
          ? { ...post, visibility, accessPriceUsd: normalizedPrice }
          : post
      )),
    }));
    setSellerProfileMessage(visibility === 'private' ? sellerStatus('postPrivate') : sellerStatus('postPublic'));
  }

  function updateSellerPostPrice(postId, nextPriceInput) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    const parsedPrice = Number(nextPriceInput);
    const normalizedPrice = Number.isFinite(parsedPrice) && parsedPrice >= MIN_FEED_UNLOCK_PRICE_THB ? Number(parsedPrice.toFixed(2)) : MIN_FEED_UNLOCK_PRICE_THB;
    setDb((prev) => ({
      ...prev,
      sellerPosts: (prev.sellerPosts || []).map((post) => (
        post.id === postId && post.sellerId === currentSellerId
          ? { ...post, accessPriceUsd: normalizedPrice }
          : post
      )),
    }));
  }

  function updateAllPrivatePostPrices(nextPriceInput) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    const parsedPrice = Number(nextPriceInput);
    const normalizedPrice = Number.isFinite(parsedPrice) && parsedPrice >= MIN_FEED_UNLOCK_PRICE_THB ? Number(parsedPrice.toFixed(2)) : MIN_FEED_UNLOCK_PRICE_THB;
    setDb((prev) => ({
      ...prev,
      sellerPosts: (prev.sellerPosts || []).map((post) => (
        post.sellerId === currentSellerId && post.visibility === 'private'
          ? { ...post, accessPriceUsd: normalizedPrice }
          : post
      )),
    }));
    setSellerProfileMessage(sellerStatus('privatePricesUpdated', { amount: formatPriceTHB(normalizedPrice) }));
  }

  function unscheduleSellerPost(postId) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    setDb((prev) => ({
      ...prev,
      sellerPosts: (prev.sellerPosts || []).map((post) => (
        post.id === postId && post.sellerId === currentSellerId
          ? { ...post, scheduledFor: '' }
          : post
      )),
    }));
    setSellerProfileMessage(sellerStatus('postUnscheduled'));
  }

  function publishSellerPostNow(postId) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    const nowIso = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      sellerPosts: (prev.sellerPosts || []).map((post) => (
        post.id === postId && post.sellerId === currentSellerId
          ? { ...post, scheduledFor: '', createdAt: nowIso }
          : post
      )),
    }));
    setSellerProfileMessage(sellerStatus('scheduledPostPublishedNow'));
  }

  function isSellerPostPrivate(post) {
    const seller = sellerMap[post?.sellerId];
    if (!post || !seller) return false;
    if (post.visibility === 'private') return true;
    if (post.visibility === 'public') return false;
    if (seller.feedVisibility === 'private') return true;
    if (seller.feedVisibility === 'public') return false;
    return false;
  }

  function canViewSellerPost(post) {
    if (!post) return false;
    const hasUnlock = currentUser && postUnlocks.some((entry) => entry.postId === post.id && entry.buyerUserId === currentUser.id);
    if (post.deletedAt) {
      if (currentUser?.role === 'admin') return true;
      if (currentUser?.role === 'seller' && currentUser.sellerId === post.sellerId) return true;
      return hasUnlock;
    }
    if (!isSellerPostPrivate(post)) return true;
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'seller' && currentUser.sellerId === post.sellerId) return true;
    return hasUnlock;
  }

  function toggleSellerPostLike(postId) {
    if (!currentUser) {
      setSellerProfileMessage(loginText.loginToLikePosts || 'Please login to like posts.');
      return false;
    }
    const post = sellerPosts.find((candidate) => candidate.id === postId);
    if (!post || !canViewSellerPost(post)) return false;
    const alreadyLiked = sellerPostLikes.some((entry) => entry.postId === postId && entry.userId === currentUser.id);
    const createdAt = new Date().toISOString();
    const sellerUser = users.find((entry) => entry.sellerId === post.sellerId);
    const sellerUserId = sellerUser?.id;
    setDb((prev) => {
      const likes = prev.sellerPostLikes || [];
      const recipient = (prev.users || []).find((entry) => entry.id === sellerUserId);
      return {
        ...prev,
        sellerPostLikes: alreadyLiked
          ? likes.filter((entry) => !(entry.postId === postId && entry.userId === currentUser.id))
          : [
              {
                id: `post_like_${Date.now()}`,
                postId,
                userId: currentUser.id,
                userRole: currentUser.role,
                createdAt,
              },
              ...likes,
            ],
        notifications: !alreadyLiked && sellerUserId && sellerUserId !== currentUser.id && shouldSendNotificationForType(recipient, 'engagement')
          ? [
              {
                id: `notif_${Date.now()}`,
                userId: sellerUserId,
                type: 'engagement',
                text: `${currentUser.name || 'A user'} liked your Stories post.`,
                read: false,
                createdAt,
              },
              ...(prev.notifications || []),
            ]
          : prev.notifications,
      };
    });
    return true;
  }

  function addSellerPostComment(postId, body) {
    if (!currentUser) {
      setSellerProfileMessage(loginText.loginToCommentPosts || 'Please login to comment on posts.');
      return false;
    }
    if (currentUser.accountStatus !== 'active') {
      setSellerProfileMessage(sellerStatus('accountActiveToComment'));
      return false;
    }
    if (currentUser.role !== 'buyer') {
      setSellerProfileMessage(sellerStatus('onlyBuyerPaidComments'));
      return false;
    }
    const post = sellerPosts.find((candidate) => candidate.id === postId);
    if (!post || !canViewSellerPost(post)) return false;
    const trimmedBody = String(body || '').trim();
    if (!trimmedBody) return false;
    const commentFee = MESSAGE_FEE_THB;
    if (Number(currentUser.walletBalance || 0) < commentFee) {
      setSellerProfileMessage(sellerStatus('walletNeededToComment', { amount: formatPriceTHB(commentFee) }));
      return false;
    }
    const createdAt = new Date().toISOString();
    const sellerUser = users.find((entry) => entry.sellerId === post.sellerId);
    const sellerUserId = sellerUser?.id;
    setDb((prev) => {
      const buyerBefore = Number((prev.users || []).find((entry) => entry.id === currentUser.id)?.walletBalance || 0);
      const buyerAfter = Number((buyerBefore - commentFee).toFixed(2));
      const payout = calculateSellerRevenueSplit(prev, {
        sellerId: post.sellerId,
        grossAmount: commentFee,
      });
      const recipient = (prev.users || []).find((entry) => entry.id === sellerUserId);
      const base = {
        ...prev,
        users: (prev.users || []).map((user) => {
          if (user.id === currentUser.id) {
            return { ...user, walletBalance: buyerAfter };
          }
          if (payout.sellerUserId && user.id === payout.sellerUserId && payout.sellerUserId !== currentUser.id) {
            return { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.sellerAmount).toFixed(2)) };
          }
          if (payout.barUserId && user.id === payout.barUserId && payout.barUserId !== currentUser.id) {
            return { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.barAmount).toFixed(2)) };
          }
          if (payout.adminUserId && user.id === payout.adminUserId && payout.adminUserId !== currentUser.id) {
            return { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.adminAmount).toFixed(2)) };
          }
          return user;
        }),
        sellerPostComments: [
        {
          id: `post_comment_${Date.now()}`,
          postId,
          senderUserId: currentUser.id,
          senderRole: currentUser.role,
          body: trimmedBody.slice(0, 400),
          feeCharged: commentFee,
          createdAt,
        },
        ...(prev.sellerPostComments || []),
      ],
        walletTransactions: [
          ...(payout.sellerUserId && payout.sellerAmount > 0 && payout.sellerUserId !== currentUser.id
            ? [{
                id: `txn_${Date.now()}_seller_comment`,
                userId: payout.sellerUserId,
                type: 'message_fee',
                amount: payout.sellerAmount,
                description: `Comment earning from ${currentUser.name || 'Buyer'}`,
                createdAt,
              }]
            : []),
          ...(payout.barUserId && payout.barAmount > 0 && payout.barUserId !== currentUser.id
            ? [{
                id: `txn_${Date.now()}_bar_comment`,
                userId: payout.barUserId,
                type: 'message_fee',
                amount: payout.barAmount,
                description: `Bar commission from seller comment fee`,
                createdAt,
              }]
            : []),
          ...(payout.adminUserId && payout.adminAmount > 0 && payout.adminUserId !== currentUser.id
            ? [{
                id: `txn_${Date.now()}_admin_comment`,
                userId: payout.adminUserId,
                type: 'message_fee',
                amount: payout.adminAmount,
                description: `Platform commission from seller comment fee`,
                createdAt,
              }]
            : []),
          {
            id: `txn_${Date.now()}_buyer_comment`,
            userId: currentUser.id,
            type: 'message_fee',
            amount: -commentFee,
            description: `Comment fee for post ${postId}`,
            createdAt,
          },
          ...(prev.walletTransactions || []),
        ],
        notifications: sellerUserId && sellerUserId !== currentUser.id && shouldSendNotificationForType(recipient, 'engagement')
        ? [
            {
              id: `notif_${Date.now()}`,
              userId: sellerUserId,
              type: 'engagement',
              text: `${currentUser.name || 'A user'} commented on your Stories post.`,
              read: false,
              createdAt,
            },
            ...(prev.notifications || []),
          ]
        : prev.notifications,
      };
      return appendLowBalanceEmailIfNeeded(base, {
        userId: currentUser.id,
        beforeBalance: buyerBefore,
        afterBalance: buyerAfter,
      });
    });
    return true;
  }

  function deleteSellerPostComment(commentId) {
    if (!currentUser) return false;
    const comment = sellerPostComments.find((entry) => entry.id === commentId);
    if (!comment) return false;
    const canDelete = currentUser.role === 'admin' || comment.senderUserId === currentUser.id;
    if (!canDelete) return false;
    setDb((prev) => ({
      ...prev,
      sellerPostComments: (prev.sellerPostComments || []).filter((entry) => entry.id !== commentId),
    }));
    return true;
  }

  function toggleSellerFollow(sellerId) {
    if (!currentUser || currentUser.role !== 'buyer') {
      setSellerProfileMessage(sellerStatus('loginBuyerFollowSellers'));
      return false;
    }
    const seller = sellerMap[sellerId];
    if (!seller) return false;
    const alreadyFollowing = sellerFollows.some((entry) => entry.sellerId === sellerId && entry.followerUserId === currentUser.id);
    const sellerUser = users.find((entry) => entry.sellerId === sellerId);
    const sellerUserId = sellerUser?.id;
    const createdAt = new Date().toISOString();
    setDb((prev) => {
      const follows = prev.sellerFollows || [];
      const recipient = (prev.users || []).find((entry) => entry.id === sellerUserId);
      return {
        ...prev,
        sellerFollows: alreadyFollowing
          ? follows.filter((entry) => !(entry.sellerId === sellerId && entry.followerUserId === currentUser.id))
          : [
              {
                id: `seller_follow_${Date.now()}`,
                sellerId,
                followerUserId: currentUser.id,
                followerRole: 'buyer',
                createdAt,
              },
              ...follows,
            ],
        notifications: !alreadyFollowing && sellerUserId && sellerUserId !== currentUser.id && shouldSendNotificationForType(recipient, 'engagement')
          ? [
              {
                id: `notif_${Date.now()}`,
                userId: sellerUserId,
                type: 'engagement',
                text: `${currentUser.name || 'A buyer'} started following your seller profile.`,
                read: false,
                createdAt,
              },
              ...(prev.notifications || []),
            ]
          : prev.notifications,
      };
    });
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson('/api/seller-follows/toggle', {
        method: 'POST',
        body: { sellerId },
        idempotencyScope: 'seller_follow',
      }).catch((err) => console.warn('[toggleSellerFollow] API sync failed:', err));
    }
    return true;
  }

  function toggleBarFollow(barId) {
    if (!currentUser || (currentUser.role !== 'buyer' && currentUser.role !== 'bar')) {
      setSellerProfileMessage(sellerStatus('loginBuyerOrBarFollowBars'));
      return false;
    }
    const normalizedBarId = String(barId || '').trim();
    if (!normalizedBarId || !barMap[normalizedBarId]) return false;
    const alreadyFollowing = barFollows.some((entry) => entry.barId === normalizedBarId && entry.followerUserId === currentUser.id);
    const createdAt = new Date().toISOString();
    setDb((prev) => {
      const follows = prev.barFollows || [];
      return {
        ...prev,
        barFollows: alreadyFollowing
          ? follows.filter((entry) => !(entry.barId === normalizedBarId && entry.followerUserId === currentUser.id))
          : [
              {
                id: `bar_follow_${Date.now()}`,
                barId: normalizedBarId,
                followerUserId: currentUser.id,
                followerRole: currentUser.role,
                createdAt,
              },
              ...follows,
            ],
      };
    });
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson('/api/bar-follows/toggle', {
        method: 'POST',
        body: { barId: normalizedBarId },
        idempotencyScope: 'bar_follow',
      }).catch((err) => console.warn('[toggleBarFollow] API sync failed:', err));
    }
    return true;
  }

  function toggleProductWatch(productId) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return false;
    if (!currentUser || currentUser.role !== "buyer") {
      navigate("/login");
      return false;
    }
    const product = products.find((entry) => entry.id === normalizedProductId);
    if (!product) return false;
    const alreadyWatching = productWatches.some((entry) => (
      entry.productId === normalizedProductId
      && entry.userId === currentUser.id
    ));
    const createdAt = new Date().toISOString();
    setDb((prev) => {
      const rows = prev.productWatches || [];
      return {
        ...prev,
        productWatches: alreadyWatching
          ? rows.filter((entry) => !(entry.productId === normalizedProductId && entry.userId === currentUser.id))
          : [
              {
                id: `product_watch_${Date.now()}`,
                productId: normalizedProductId,
                userId: currentUser.id,
                createdAt,
              },
              ...rows,
            ],
      };
    });
    return true;
  }

  function toggleSavedSellerPost(postId, feedType = 'seller') {
    if (!currentUser) {
      setSellerProfileMessage(loginText.loginToSavePosts || 'Please login to save posts.');
      return false;
    }
    const normalizedFeedType = feedType === 'bar' ? 'bar' : 'seller';
    const post = normalizedFeedType === 'bar'
      ? barPosts.find((entry) => entry.id === postId)
      : sellerPosts.find((entry) => entry.id === postId);
    if (!post) return false;
    if (normalizedFeedType === 'seller' && !canViewSellerPost(post)) return false;
    const alreadySaved = sellerSavedPosts.some((entry) => (
      entry.postId === postId
      && entry.userId === currentUser.id
      && (entry.feedType || 'seller') === normalizedFeedType
    ));
    const createdAt = new Date().toISOString();
    setDb((prev) => {
      const rows = prev.sellerSavedPosts || [];
      return {
        ...prev,
        sellerSavedPosts: alreadySaved
          ? rows.filter((entry) => !(
            entry.postId === postId
            && entry.userId === currentUser.id
            && (entry.feedType || 'seller') === normalizedFeedType
          ))
          : [
              {
                id: `saved_post_${Date.now()}`,
                postId,
                userId: currentUser.id,
                feedType: normalizedFeedType,
                createdAt,
              },
              ...rows,
            ],
      };
    });
    return true;
  }

  async function unlockPrivatePost(postId) {
    const post = sellerPosts.find((candidate) => candidate.id === postId);
    if (!post || !isSellerPostPrivate(post)) return;
    const unlockPrice = Math.max(MIN_FEED_UNLOCK_PRICE_THB, Number(post.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB));
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (currentUser.role !== 'buyer') {
      if (typeof window !== 'undefined') window.alert(loginText.unlockOnlyBuyer || 'Only buyer accounts can unlock private posts.');
      return;
    }
    const alreadyUnlocked = postUnlocks.some((entry) => entry.postId === postId && entry.buyerUserId === currentUser.id);
    if (alreadyUnlocked) return;
    if (currentWalletBalance < unlockPrice) {
      if (typeof window !== 'undefined') {
        window.alert(`${loginText.unlockWalletRequiredPrefix || 'You need at least'} ${formatPriceTHB(unlockPrice)} ${loginText.unlockWalletRequiredSuffix || 'in your wallet to unlock this post.'}`);
      }
      return;
    }
    try {
      const response = await apiRequestJson(`${API_BASE_URL}/api/post-unlocks`, {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ postId }),
      });
      if (response?.ok || response?.alreadyUnlocked) {
        if (response.unlock) {
          setDb((prev) => ({
            ...prev,
            postUnlocks: [response.unlock, ...(prev.postUnlocks || [])],
            users: (prev.users || []).map((u) =>
              u.id === currentUser.id
                ? { ...u, walletBalance: response.walletBalance ?? u.walletBalance }
                : u
            ),
          }));
        }
        if (typeof window !== 'undefined') window.alert(`${loginText.postUnlockedPrefix || 'Post unlocked for'} ${formatPriceTHB(unlockPrice)}.`);
      } else {
        const errMsg = response?.error || 'Failed to unlock post.';
        if (typeof window !== 'undefined') window.alert(errMsg);
      }
    } catch {
      if (typeof window !== 'undefined') window.alert('Failed to unlock post. Please try again.');
    }
  }

  function saveAccountDetails() {
    if (!currentUser) return;
    const normalizedTimeFormat = normalizeTimeFormat(accountForm.timeFormat);
    setDb((prev) => ({
      ...prev,
      users: prev.users.map((user) => (
        user.id === currentUser.id
          ? {
              ...user,
              ...accountForm,
              timeFormat: currentUser.role === 'buyer' ? normalizedTimeFormat : '12h',
            }
          : user
      )),
      sellers: currentUser.role === 'seller' && currentUser.sellerId
        ? prev.sellers.map((seller) => (
            seller.id === currentUser.sellerId
              ? {
                  ...seller,
                  height: accountForm.height || seller.height || '',
                  weight: accountForm.weight || seller.weight || '',
                  hairColor: accountForm.hairColor || seller.hairColor || '',
                  braSize: accountForm.braSize || seller.braSize || '',
                  pantySize: accountForm.pantySize || seller.pantySize || '',
                }
              : seller
          ))
        : prev.sellers,
    }));
    if (currentUser.role === 'buyer') {
      setStoredTimeFormat(normalizedTimeFormat);
    }
    setAccountSaveMessage('Account details saved successfully.');
  }

  async function submitAccountCredentialChanges() {
    if (!currentUser || accountCredentialSaving) return;
    const newDisplayName = String(accountCredentialForm.newDisplayName || '').trim();
    const currentPassword = String(accountCredentialForm.currentPassword || '');
    const newEmail = String(accountCredentialForm.newEmail || '').trim().toLowerCase();
    const newPassword = String(accountCredentialForm.newPassword || '');
    const confirmNewPassword = String(accountCredentialForm.confirmNewPassword || '');
    const hasNameChange = Boolean(newDisplayName) && newDisplayName !== String(currentUser.name || '').trim();
    const hasEmailChange = Boolean(newEmail) && newEmail !== String(currentUser.email || '').trim().toLowerCase();
    const hasPasswordChange = Boolean(newPassword);
    if (!hasNameChange && !hasEmailChange && !hasPasswordChange) {
      setAccountCredentialTone('error');
      setAccountCredentialMessage('Add a new name, email, or password to save changes.');
      return;
    }
    if ((hasEmailChange || hasPasswordChange) && !currentPassword) {
      setAccountCredentialTone('error');
      setAccountCredentialMessage('Enter your current password to confirm email/password changes.');
      return;
    }
    if (hasEmailChange && !newEmail.includes('@')) {
      setAccountCredentialTone('error');
      setAccountCredentialMessage('Enter a valid email address.');
      return;
    }
    if (hasPasswordChange) {
      const hasNumber = /\d/.test(newPassword);
      const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
      if (newPassword.length < 8 || !hasNumber || !hasSymbol) {
        setAccountCredentialTone('error');
        setAccountCredentialMessage(registerText.passwordPolicyError || 'Password must be at least 8 characters and include at least 1 number and 1 symbol.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setAccountCredentialTone('error');
        setAccountCredentialMessage(registerText.passwordMismatchError || 'Passwords do not match.');
        return;
      }
    }
    setAccountCredentialSaving(true);
    setAccountCredentialMessage('');
    setAccountCredentialTone('neutral');
    try {
      if (backendStatus === 'connected' && apiAuthToken) {
        if (hasEmailChange || hasPasswordChange) {
          const { ok, payload } = await apiRequestJson('/api/auth/account-credentials', {
            method: 'POST',
            body: {
              currentPassword,
              ...(hasEmailChange ? { newEmail } : {}),
              ...(hasPasswordChange ? { newPassword } : {}),
            },
          });
          if (!ok) {
            setAccountCredentialTone('error');
            setAccountCredentialMessage(String(payload?.error || 'Could not update credentials right now.'));
            return;
          }
          const nextUser = payload?.user || null;
          if (nextUser?.id) {
            setDb((prev) => ({
              ...prev,
              users: (prev.users || []).map((user) => (
                user.id === nextUser.id
                  ? { ...user, ...nextUser }
                  : user
              )),
            }));
            setAccountForm((prev) => ({ ...prev, email: nextUser.email || prev.email }));
          }
        }
        if (hasNameChange && currentSellerId) {
          apiRequestJson(`/api/sellers/${encodeURIComponent(currentSellerId)}`, {
            method: 'PUT',
            body: { name: newDisplayName },
          }).catch(() => {});
          setDb((prev) => ({
            ...prev,
            users: (prev.users || []).map((user) =>
              user.id === currentUser.id ? { ...user, name: newDisplayName } : user
            ),
            sellers: (prev.sellers || []).map((seller) =>
              seller.id === currentSellerId ? { ...seller, name: newDisplayName } : seller
            ),
          }));
        }
        setAccountCredentialForm({
          newDisplayName: '',
          currentPassword: '',
          newEmail: '',
          newPassword: '',
          confirmNewPassword: '',
        });
        setAccountCredentialTone('success');
        setAccountCredentialMessage('Account updated successfully.');
        return;
      }

      const duplicateEmail = hasEmailChange && users.some((user) => (
        user.id !== currentUser.id
        && String(user.email || '').trim().toLowerCase() === newEmail
      ));
      if (duplicateEmail) {
        setAccountCredentialTone('error');
        setAccountCredentialMessage(registerText.emailExistsError || 'This email is already registered.');
        return;
      }
      if ((hasEmailChange || hasPasswordChange) && String(currentUser.password || '') !== currentPassword) {
        setAccountCredentialTone('error');
        setAccountCredentialMessage('Current password is incorrect.');
        return;
      }
      setDb((prev) => ({
        ...prev,
        users: (prev.users || []).map((user) => (
          user.id === currentUser.id
            ? {
                ...user,
                ...(hasNameChange ? { name: newDisplayName } : {}),
                ...(hasEmailChange ? { email: newEmail } : {}),
                ...(hasPasswordChange ? { password: newPassword } : {}),
              }
            : user
        )),
        sellers: hasNameChange && currentSellerId
          ? (prev.sellers || []).map((seller) =>
              seller.id === currentSellerId ? { ...seller, name: newDisplayName } : seller
            )
          : prev.sellers,
      }));
      if (hasEmailChange) {
        setAccountForm((prev) => ({ ...prev, email: newEmail }));
      }
      setAccountCredentialForm({
        newDisplayName: '',
        currentPassword: '',
        newEmail: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setAccountCredentialTone('success');
      setAccountCredentialMessage('Account updated successfully.');
    } finally {
      setAccountCredentialSaving(false);
    }
  }

  function submitRefundEvidence(payload, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'buyer') {
      const message = loginText.loginBuyerToRefundEvidence || 'Please login as a buyer to submit refund evidence.';
      onError?.(message);
      navigate('/login');
      return;
    }
    const orderId = String(payload?.orderId || '').trim();
    const expectedItem = String(payload?.expectedItem || '').trim();
    const receivedItem = String(payload?.receivedItem || '').trim();
    const evidenceDetails = String(payload?.evidenceDetails || '').trim();
    const evidenceLinks = String(payload?.evidenceLinks || '')
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!orderId || !expectedItem || !receivedItem || !evidenceDetails) {
      onError?.('Please complete order ID, expected item, received item, and evidence details.');
      return;
    }
    const now = new Date().toISOString();
    setDb((prev) => {
      const adminUsers = (prev.users || []).filter((user) => user.role === 'admin');
      return {
        ...prev,
        refundClaims: [
          {
            id: `refund_claim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            buyerUserId: currentUser.id,
            orderId,
            expectedItem,
            receivedItem,
            evidenceDetails,
            evidenceLinks,
            status: 'submitted',
            createdAt: now,
            updatedAt: now,
          },
          ...(prev.refundClaims || []),
        ],
        notifications: [
          ...(prev.notifications || []),
          ...adminUsers.map((admin, index) => ({
            id: `notif_refund_claim_${Date.now()}_${index}`,
            userId: admin.id,
            type: 'engagement',
            text: `New wrong-item refund evidence submitted by ${currentUser.name || currentUser.id} (${orderId}).`,
            read: false,
            createdAt: now,
          })),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}_refund_claim`,
            type: 'refund_evidence_submitted',
            targetUserId: currentUser.id,
            adminUserId: currentUser.id,
            createdAt: now,
            metadata: {
              orderId,
            },
          },
        ],
      };
    });
    onSuccess?.('Refund evidence submitted. Admin will review your claim.');
  }

  async function submitOrderHelpRequest(payload, onSuccess, onError) {
    const name = String(payload?.name || currentUser?.name || '').trim();
    const email = String(payload?.email || currentUser?.email || '').trim().toLowerCase();
    const orderId = String(payload?.orderId || '').trim();
    const issueType = String(payload?.issueType || 'other').trim();
    const message = String(payload?.message || '').trim();
    if (!name || !email || !message) {
      onError?.('Please complete name, email, and issue details.');
      return false;
    }
    const validIssueTypes = new Set(['tracking', 'address', 'delivery', 'billing', 'other']);
    const normalizedIssueType = validIssueTypes.has(issueType) ? issueType : 'other';
    if (backendStatus === 'connected') {
      try {
        const idScope = `order_help_${email}_${orderId}_${normalizedIssueType}_${message.slice(0, 80)}`;
        const { ok, payload: apiPayload } = await apiRequestJson('/api/support/order-help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            name,
            email,
            orderId,
            issueType: normalizedIssueType,
            message,
          },
          idempotencyScope: idScope,
          stableIdempotency: true,
        });
        if (ok) {
          if (apiPayload?.db) {
            setDb(normalizeDbState(apiPayload.db, appMode));
          }
          onSuccess?.('Support request submitted. Our team will follow up soon.');
          return true;
        }
      } catch {
        // Fall through to local persistence so support request is not lost.
      }
    }
    const now = new Date().toISOString();
    setDb((prev) => {
      const adminUsers = (prev.users || []).filter((user) => user.role === 'admin');
      const requestId = `order_help_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        ...prev,
        orderHelpRequests: [
          {
            id: requestId,
            userId: currentUser?.id || null,
            name,
            email,
            orderId,
            issueType: normalizedIssueType,
            message,
            status: 'submitted',
            adminNote: '',
            reviewedByUserId: null,
            createdAt: now,
            updatedAt: now,
          },
          ...(prev.orderHelpRequests || []),
        ],
        notifications: [
          ...(prev.notifications || []),
          ...adminUsers.map((admin, index) => ({
            id: `notif_order_help_${Date.now()}_${index}`,
            userId: admin.id,
            type: 'engagement',
            text: `New order help request from ${name}${orderId ? ` (${orderId})` : ''}.`,
            read: false,
            createdAt: now,
          })),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}_order_help`,
            type: 'order_help_submitted',
            targetUserId: currentUser?.id || null,
            adminUserId: currentUser?.id || null,
            createdAt: now,
            metadata: {
              requestId,
              orderId,
              issueType: normalizedIssueType,
              email,
            },
          },
        ],
      };
    });
    onSuccess?.('Support request submitted. Our team will follow up soon.');
    return true;
  }

  async function submitSafetyReport(payload, onSuccess, onError) {
    const name = String(payload?.name || currentUser?.name || '').trim();
    const email = String(payload?.email || currentUser?.email || '').trim().toLowerCase();
    const reportType = String(payload?.reportType || 'other').trim();
    const targetHandle = String(payload?.targetHandle || '').trim();
    const contextDetails = String(payload?.contextDetails || '').trim();
    if (!name || !email || !contextDetails) {
      onError?.('Please complete name, email, and report details.');
      return false;
    }
    const validTypes = new Set(['harassment', 'abusive_language', 'scam', 'off_platform_payment', 'other']);
    const normalizedReportType = validTypes.has(reportType) ? reportType : 'other';
    if (backendStatus === 'connected') {
      try {
        const idScope = `safety_report_${email}_${normalizedReportType}_${contextDetails.slice(0, 80)}`;
        const { ok, payload: apiPayload } = await apiRequestJson('/api/support/safety-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            name,
            email,
            reportType: normalizedReportType,
            targetHandle,
            contextDetails,
          },
          idempotencyScope: idScope,
          stableIdempotency: true,
        });
        if (ok) {
          if (apiPayload?.db) {
            setDb(normalizeDbState(apiPayload.db, appMode));
          }
          onSuccess?.('Safety report submitted. Admin has been notified.');
          return true;
        }
      } catch {
        // Fall through to local persistence so safety report is not lost.
      }
    }
    const now = new Date().toISOString();
    setDb((prev) => {
      const adminUsers = (prev.users || []).filter((user) => user.role === 'admin');
      const reportId = `safety_report_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        ...prev,
        safetyReports: [
          {
            id: reportId,
            userId: currentUser?.id || null,
            name,
            email,
            reportType: normalizedReportType,
            targetHandle,
            contextDetails,
            status: 'submitted',
            createdAt: now,
            updatedAt: now,
          },
          ...(prev.safetyReports || []),
        ],
        notifications: [
          ...(prev.notifications || []),
          ...adminUsers.map((admin, index) => ({
            id: `notif_safety_report_${Date.now()}_${index}`,
            userId: admin.id,
            type: 'engagement',
            text: `New safety report from ${name}${targetHandle ? ` about ${targetHandle}` : ''}.`,
            read: false,
            createdAt: now,
          })),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}_safety_report`,
            type: 'safety_report_submitted',
            targetUserId: currentUser?.id || null,
            adminUserId: currentUser?.id || null,
            createdAt: now,
            metadata: {
              reportId,
              reportType: normalizedReportType,
              targetHandle,
              email,
            },
          },
        ],
      };
    });
    onSuccess?.('Safety report submitted. Admin has been notified.');
    return true;
  }

  function updateOrderHelpRequestStatus(requestId, nextStatus, note, onSuccess, onError) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.DISPUTES_REVIEW)) {
      onError?.('Insufficient admin permissions.');
      return;
    }
    if (!requestId || !['submitted', 'in_review', 'resolved'].includes(nextStatus)) {
      onError?.('Invalid request update.');
      return;
    }
    const now = new Date().toISOString();
    const normalizedNote = String(note || '').trim().slice(0, 1000);
    let found = false;
    let requesterUserId = null;
    setDb((prev) => {
      const requests = prev.orderHelpRequests || [];
      const target = requests.find((entry) => entry.id === requestId);
      if (!target) return prev;
      found = true;
      requesterUserId = target.userId || null;
      const updatedRequests = requests.map((entry) => (
        entry.id === requestId
          ? {
              ...entry,
              status: nextStatus,
              adminNote: normalizedNote,
              reviewedByUserId: currentUser.id,
              updatedAt: now,
            }
          : entry
      ));
      const base = {
        ...prev,
        orderHelpRequests: updatedRequests,
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}_order_help_status`,
            type: 'order_help_status_updated',
            targetRequestId: requestId,
            targetUserId: requesterUserId,
            adminUserId: currentUser.id,
            status: nextStatus,
            note: normalizedNote,
            createdAt: now,
          },
        ],
      };
      if (!requesterUserId) return base;
      const requester = (prev.users || []).find((user) => user.id === requesterUserId);
      if (!requester || !shouldSendNotificationForType(requester, 'engagement')) return base;
      return {
        ...base,
        notifications: [
          ...(base.notifications || []),
          {
            id: `notif_${Date.now()}_order_help_update`,
            userId: requesterUserId,
            type: 'engagement',
            text: `Your order help request was updated to ${nextStatus.replace('_', ' ')}.${normalizedNote ? ` Note: ${normalizedNote}` : ''}`,
            read: false,
            createdAt: now,
          },
        ],
      };
    });
    if (!found) {
      onError?.('Order help request not found.');
      return;
    }
    onSuccess?.('Order help request updated.');
  }

  function updateBuyerMessageProductFilter(key, value) {
    setBuyerMessageProductFilters((prev) => ({ ...prev, [key]: value }));
  }

  function startBuyerConversationWithSeller(sellerId) {
    if (!currentUser) {
      setPostLoginRedirectPath(`/buyer-messages`);
      navigate('/login');
      return;
    }
    if (currentUser.role !== 'buyer' || !sellerId) return;
    setBuyerDashboardConversationId(`${currentUser.id}__${sellerId}`);
    setBuyerDashboardMessageError('');
  }

  function startConversationWithBar(barId) {
    if (!currentUser) {
      setPostLoginRedirectPath(`/bar-messages`);
      navigate('/login');
      return;
    }
    if (currentUser.role !== 'buyer' && currentUser.role !== 'seller') return;
    if (currentUser.accountStatus !== 'active') return;
    const normalizedBarId = String(barId || '').trim();
    if (!normalizedBarId) return;
    if (currentUser.role === 'seller') {
      const sellerAffiliatedBarId = String(sellerMap[currentSellerId]?.affiliatedBarId || '').trim();
      if (sellerAffiliatedBarId !== normalizedBarId) return;
    }
    const conversationId = buildBarConversationId(normalizedBarId, currentUser.role, currentUser.id);
    setBarMessagesConversationId(conversationId);
    setBarMessagesError('');
    navigate(`/bar-messages?conversationId=${encodeURIComponent(conversationId)}`);
  }

  function markNotificationsReadForConversation(conversationId) {
    if (!currentUser) return;
    const parsedBarConversation = parseBarConversationId(conversationId);
    setDb((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((notification) =>
        notification.userId === currentUser.id && notification.conversationId === conversationId
          ? { ...notification, read: true }
          : notification,
      ),
      messages: (prev.messages || []).map((message) => {
        if (message.conversationId !== conversationId) return message;
        if (parsedBarConversation) {
          if (currentUser.role === 'bar') return { ...message, readByBar: true };
          if (currentUser.role === 'buyer' || currentUser.role === 'seller') return { ...message, readByParticipant: true };
          return message;
        }
        if (currentUser.role === 'buyer') return { ...message, readByBuyer: true };
        if (currentUser.role === 'seller') return { ...message, readBySeller: true };
        return message;
      }),
    }));
  }

  async function sendBuyerMessageToConversation(sellerId, conversationId, body, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'buyer') {
      const message = loginText.loginBuyerToMessage || 'Please login as a buyer to send messages.';
      onError?.(message);
      if (typeof window !== 'undefined') window.alert(message);
      navigate('/login');
      return;
    }
    if (currentUser.accountStatus !== 'active' || !sellerId || !conversationId || !body.trim()) return;
    if (currentWalletBalance < MESSAGE_FEE_THB) {
      const shortfall = Number((MESSAGE_FEE_THB - currentWalletBalance).toFixed(2));
      const requiredTopUp = getRequiredTopUpAmount(shortfall);
      onError?.(`You need ${formatPriceTHB(MESSAGE_FEE_THB)} to send a message. Please top up at least ${formatPriceTHB(requiredTopUp)} and try again.`);
      return;
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      try {
        const idScope = `buyer_message_${currentUser.id}_${conversationId}_${String(body || '').trim()}`;
        const { ok, payload } = await apiRequestJson('/api/messages/buyer-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            sellerId,
            conversationId,
            body: String(body || '').trim(),
          },
          idempotencyScope: idScope,
          stableIdempotency: true,
        });
        if (ok) {
          setDb((prev) => {
            let next = { ...prev };
            if (payload?.message) {
              const msgExists = (prev.messages || []).some((m) => m.id === payload.message.id);
              if (!msgExists) {
                next = { ...next, messages: [...(prev.messages || []), payload.message] };
              }
            }
            if (payload?.walletBalance != null && currentUser?.id) {
              next = {
                ...next,
                users: (prev.users || []).map((u) =>
                  u.id === currentUser.id ? { ...u, walletBalance: payload.walletBalance } : u
                ),
              };
            }
            return next;
          });
          onSuccess?.();
          onError?.('');
          return;
        }
        const requiredTopUp = Number(payload?.requiredTopUp || 0);
        const shortfall = Number(payload?.shortfall || 0);
        if (requiredTopUp > 0 || shortfall > 0) {
          const computedRequiredTopUp = requiredTopUp > 0 ? requiredTopUp : getRequiredTopUpAmount(shortfall);
          onError?.(`You need ${formatPriceTHB(MESSAGE_FEE_THB)} to send a message. Please top up at least ${formatPriceTHB(computedRequiredTopUp)} and try again.`);
          return;
        }
        onError?.(String(payload?.error || 'Could not send message. Please try again.'));
        return;
      } catch {
        onError?.('Could not connect to messaging service. Please try again.');
        return;
      }
    }
    const seller = sellers.find((candidate) => candidate.id === sellerId);
    const sellerUser = users.find((user) => user.sellerId === sellerId);
    const now = new Date().toISOString();
    const messageText = body.trim();
    const { sourceLanguage, translations } = await buildMessageTranslationsForRecipient(
      messageText,
      currentUser,
      sellerUser,
    );
    const newMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      buyerId: currentUser.id,
      sellerId,
      senderId: currentUser.id,
      senderRole: 'buyer',
      body: messageText,
      bodyOriginal: messageText,
      sourceLanguage,
      translations,
      feeCharged: MESSAGE_FEE_THB,
      createdAt: now,
      readByBuyer: true,
      readBySeller: false,
    };
    setDb((prev) => {
      const buyerBefore = Number((prev.users || []).find((user) => user.id === currentUser.id)?.walletBalance || 0);
      const buyerAfter = Number((buyerBefore - MESSAGE_FEE_THB).toFixed(2));
      const payout = calculateSellerRevenueSplit(prev, {
        sellerId,
        grossAmount: MESSAGE_FEE_THB,
      });
      const base = {
        ...prev,
        users: prev.users.map((user) =>
          user.id === currentUser.id
            ? { ...user, walletBalance: buyerAfter }
            : user.id === payout.sellerUserId
              ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.sellerAmount).toFixed(2)) }
              : user.id === payout.barUserId
                ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.barAmount).toFixed(2)) }
                : user.id === payout.adminUserId
                  ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.adminAmount).toFixed(2)) }
                  : user,
        ),
        walletTransactions: [
          ...(payout.sellerUserId && payout.sellerAmount > 0 ? [
            {
              id: `txn_${Date.now()}_seller`,
              userId: payout.sellerUserId,
              type: 'message_fee',
              amount: payout.sellerAmount,
              description: `Message earning from ${currentUser.name || 'Buyer'}`,
              createdAt: now,
            },
          ] : []),
          ...(payout.barUserId && payout.barAmount > 0 ? [
            {
              id: `txn_${Date.now()}_bar`,
              userId: payout.barUserId,
              type: 'message_fee',
              amount: payout.barAmount,
              description: 'Bar commission from buyer message fee',
              createdAt: now,
            },
          ] : []),
          ...(payout.adminUserId && payout.adminAmount > 0 ? [
            {
              id: `txn_${Date.now()}_admin`,
              userId: payout.adminUserId,
              type: 'message_fee',
              amount: payout.adminAmount,
              description: 'Platform commission from buyer message fee',
              createdAt: now,
            },
          ] : []),
          {
            id: `txn_${Date.now()}`,
            userId: currentUser.id,
            type: 'message_fee',
            amount: -MESSAGE_FEE_THB,
            description: `Message fee to ${seller?.name || 'Seller'}`,
            createdAt: now,
          },
          ...(prev.walletTransactions || []),
        ],
        messages: [...(prev.messages || []), newMessage],
        notifications: shouldSendNotificationForType((prev.users || []).find((user) => user.id === (sellerUser?.id || 'seller-1')), 'message')
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}`,
                userId: sellerUser?.id || 'seller-1',
                type: 'message',
                text: `New buyer message from ${currentUser.name}.`,
                conversationId,
                read: false,
                createdAt: now,
              },
            ]
          : prev.notifications,
      };
      let withEmails = base;
      if (sellerUser?.id) {
        withEmails = appendTemplatedEmail(withEmails, {
          templateKey: 'seller_message_received',
          userId: sellerUser.id,
          vars: {
            senderName: currentUser.name || 'Buyer',
            conversationId,
            actionPath: '/account',
          },
        });
      }
      return appendLowBalanceEmailIfNeeded(withEmails, {
        userId: currentUser.id,
        beforeBalance: buyerBefore,
        afterBalance: buyerAfter,
      });
    });
    onSuccess?.();
    onError?.('');
  }

  async function sendBarConversationMessage() {
    if (!currentUser || !barMessageActiveConversationId) return;
    const conversationMeta = parseBarConversationId(barMessageActiveConversationId);
    if (!conversationMeta) return;
    const draft = String(barMessagesDraft || '').trim();
    if (!draft) return;
    if (currentUser.accountStatus !== 'active') {
      setBarMessagesError('Your account must be active to send messages.');
      return;
    }
    const { barId, participantRole, participantUserId } = conversationMeta;
    if (currentUser.role === 'bar') {
      if (String(currentUser.barId || '').trim() !== barId) return;
      if (participantRole === 'seller') {
        const participantSeller = sellers.find((entry) => {
          const sellerUser = users.find((user) => user.id === participantUserId && user.role === 'seller');
          return sellerUser ? entry.id === sellerUser.sellerId : false;
        });
        const isAffiliated = participantSeller && String(participantSeller.affiliatedBarId || '').trim() === barId;
        if (!isAffiliated) {
          setBarMessagesError('Bars can only message their affiliated sellers.');
          return;
        }
      }
      if (participantRole === 'buyer') {
        const existingCount = (messages || []).filter((entry) => entry.conversationId === barMessageActiveConversationId).length;
        if (existingCount === 0) {
          const participantKey = `${participantRole}:${participantUserId}`;
          if (!barOutreachEligibilityByParticipantKey?.[participantKey]) {
            setBarMessagesError('Bars can only message buyers who contacted the bar first.');
            return;
          }
        }
      }
    } else if (currentUser.role === 'seller') {
      if (participantRole !== 'seller' || participantUserId !== currentUser.id) return;
      const sellerAffiliatedBarId = String(sellerMap[currentSellerId]?.affiliatedBarId || '').trim();
      if (sellerAffiliatedBarId !== barId) {
        setBarMessagesError('You can only message your affiliated bar.');
        return;
      }
    } else if (currentUser.role === 'buyer') {
      if (participantRole !== 'buyer' || participantUserId !== currentUser.id) return;
    } else {
      return;
    }
    const now = new Date().toISOString();
    const barUser = users.find((user) => user.role === 'bar' && String(user.barId || '').trim() === barId);
    const participantUser = users.find((user) => user.id === participantUserId);
    const recipientUser = currentUser.role === 'bar' ? participantUser : barUser;
    const { sourceLanguage, translations } = await buildMessageTranslationsForRecipient(
      draft,
      currentUser,
      recipientUser,
    );
    const newMessage = {
      id: `bar_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: barMessageActiveConversationId,
      barId,
      participantRole,
      participantUserId,
      senderId: currentUser.id,
      senderRole: currentUser.role,
      body: draft,
      bodyOriginal: draft,
      sourceLanguage,
      translations,
      createdAt: now,
      readByBar: currentUser.role === 'bar',
      readByParticipant: currentUser.role !== 'bar',
    };
    setDb((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), newMessage],
      notifications: recipientUser?.id
        ? [
            ...(prev.notifications || []),
            {
              id: `notif_${Date.now()}_barmsg`,
              userId: recipientUser.id,
              type: 'message',
              text: `New message from ${currentUser.name || currentUser.id}.`,
              conversationId: barMessageActiveConversationId,
              read: false,
              createdAt: now,
            },
          ]
        : prev.notifications,
    }));
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson('/api/messages/bar-send', {
        method: 'POST',
        body: {
          conversationId: barMessageActiveConversationId,
          body: draft,
          barId,
          participantRole,
          participantUserId,
          sourceLanguage,
          translations,
        },
        idempotencyScope: 'bar_message',
      }).catch((err) => console.warn('[sendBarConversationMessage] API sync failed:', err));
    }
    setBarMessagesDraft('');
    setBarMessagesError('');
  }

  async function sendBuyerMessageToSeller() {
    if (!selectedSeller || !selectedConversationId) return;
    await sendBuyerMessageToConversation(
      selectedSeller.id,
      selectedConversationId,
      messageDraft,
      () => setMessageDraft(''),
      setMessageError,
    );
  }

  async function sendBuyerDashboardMessage() {
    if (!buyerDashboardConversationId) return;
    const sellerId = buyerDashboardConversationId.split('__')[1];
    await sendBuyerMessageToConversation(
      sellerId,
      buyerDashboardConversationId,
      buyerDashboardMessageDraft,
      () => setBuyerDashboardMessageDraft(''),
      setBuyerDashboardMessageError,
    );
  }

  async function sendSellerReply() {
    if (!currentUser || currentUser.role !== 'seller' || !sellerActiveConversationId || (!sellerReplyDraft.trim() && !sellerReplyMedia)) return;
    const conversationMessages = messages.filter((message) => message.conversationId === sellerActiveConversationId);
    const latest = conversationMessages[0];
    const buyerId = latest?.buyerId || sellerActiveConversationId.split('__')[0];
    const buyerUser = users.find((user) => user.id === buyerId);
    const now = new Date().toISOString();
    const messageText = sellerReplyDraft.trim();
    const { sourceLanguage, translations } = messageText
      ? await buildMessageTranslationsForRecipient(messageText, currentUser, buyerUser)
      : { sourceLanguage: '', translations: {} };
    setDb((prev) => {
      const base = {
        ...prev,
        messages: [
          ...(prev.messages || []),
          {
            id: `msg_${Date.now()}`,
            conversationId: sellerActiveConversationId,
            buyerId,
            sellerId: currentUser.sellerId,
            senderId: currentUser.id,
            senderRole: 'seller',
            body: messageText,
            bodyOriginal: messageText,
            sourceLanguage,
            translations,
            ...(sellerReplyMedia ? { mediaUrl: sellerReplyMedia.url, mediaType: sellerReplyMedia.type } : {}),
            feeCharged: 0,
            createdAt: now,
            readByBuyer: false,
            readBySeller: true,
          },
        ],
        notifications: shouldSendNotificationForType((prev.users || []).find((user) => user.id === buyerId), 'message')
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}`,
                userId: buyerId,
                type: 'message',
                text: `${currentUser.name} replied to your message.`,
                conversationId: sellerActiveConversationId,
                read: false,
                createdAt: now,
              },
            ]
          : prev.notifications,
      };
      return appendTemplatedEmail(base, {
        templateKey: 'buyer_message_received',
        userId: buyerId,
        vars: {
          senderName: currentUser.name || 'Seller',
          conversationId: sellerActiveConversationId,
          actionPath: '/account',
        },
      });
    });
    setSellerReplyDraft('');
    setSellerReplyMedia(null);
    markNotificationsReadForConversation(sellerActiveConversationId);
  }

  async function sendSellerBarReply() {
    if (!currentUser || currentUser.role !== 'seller' || !sellerActiveConversationId) return;
    const draft = String(sellerReplyDraft || '').trim();
    if (!draft && !sellerReplyMedia) return;
    const conversationMeta = parseBarConversationId(sellerActiveConversationId);
    if (!conversationMeta) return;
    const { barId, participantRole, participantUserId } = conversationMeta;
    const barUser = users.find((u) => u.role === 'bar' && String(u.barId || '').trim() === barId);
    const { sourceLanguage, translations } = await buildMessageTranslationsForRecipient(draft, currentUser, barUser);
    const now = new Date().toISOString();
    const newMessage = {
      id: `bar_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      conversationId: sellerActiveConversationId,
      barId,
      participantRole,
      participantUserId,
      senderId: currentUser.id,
      senderRole: 'seller',
      body: draft,
      bodyOriginal: draft,
      sourceLanguage,
      translations,
      ...(sellerReplyMedia ? { mediaUrl: sellerReplyMedia.url, mediaType: sellerReplyMedia.type } : {}),
      createdAt: now,
      readByBar: false,
      readByParticipant: true,
    };
    setDb((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), newMessage],
      notifications: barUser?.id
        ? [
            ...(prev.notifications || []),
            {
              id: `notif_${Date.now()}_barmsg`,
              userId: barUser.id,
              type: 'bar_message',
              text: `${currentUser.name || 'A seller'} sent you a message.`,
              conversationId: sellerActiveConversationId,
              read: false,
              createdAt: now,
            },
          ]
        : prev.notifications,
    }));
    if (backendStatus === 'connected' && apiAuthToken) {
      try {
        await fetch(`${API_BASE_URL}/api/messages/bar-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiAuthToken}` },
          body: JSON.stringify({
            conversationId: sellerActiveConversationId,
            body: draft,
            barId,
            participantRole,
            participantUserId,
            sourceLanguage,
            translations,
            ...(sellerReplyMedia ? { mediaUrl: sellerReplyMedia.url, mediaType: sellerReplyMedia.type } : {}),
          }),
        });
      } catch (err) {
        console.error('[sendSellerBarReply] API error:', err);
      }
    }
    setSellerReplyDraft('');
    setSellerReplyMedia(null);
    markNotificationsReadForConversation(sellerActiveConversationId);
  }

  async function submitCustomRequest(payload, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'buyer') {
      const message = loginText.loginBuyerToCustomRequest || 'Please login as a buyer to send custom requests.';
      onError?.(message);
      if (typeof window !== 'undefined') window.alert(message);
      navigate('/login');
      return;
    }
    const sellerId = String(payload?.sellerId || '').trim();
    const buyerName = String(payload?.buyerName || currentUser.name || '').trim();
    const buyerEmail = String(payload?.buyerEmail || currentUser.email || '').trim().toLowerCase();
    const preferredDetails = String(payload?.preferredDetails || '').trim();
    const shippingCountry = String(payload?.shippingCountry || '').trim();
    const requestBody = String(payload?.requestBody || '').trim();
    if (!sellerId || !buyerName || !buyerEmail || !preferredDetails || !requestBody) {
      onError?.('Please complete all required custom request fields.');
      return;
    }
    if (currentWalletBalance < CUSTOM_REQUEST_FEE_THB) {
      onError?.(`You need at least ${formatPriceTHB(CUSTOM_REQUEST_FEE_THB)} in your wallet to send a custom request.`);
      return;
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      try {
        const idScope = `custom_request_create_${currentUser.id}_${sellerId}_${requestBody}`;
        const { ok, payload: apiPayload } = await apiRequestJson('/api/custom-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            sellerId,
            buyerName,
            buyerEmail,
            preferredDetails,
            shippingCountry,
            requestBody,
          },
          idempotencyScope: idScope,
          stableIdempotency: true,
        });
        if (ok) {
          if (apiPayload?.db) {
            setDb(normalizeDbState(apiPayload.db, appMode));
          }
          onError?.('');
          onSuccess?.();
          return;
        }
        const requiredTopUp = Number(apiPayload?.requiredTopUp || 0);
        const shortfall = Number(apiPayload?.shortfall || 0);
        if (requiredTopUp > 0 || shortfall > 0) {
          const computedRequiredTopUp = requiredTopUp > 0 ? requiredTopUp : getRequiredTopUpAmount(shortfall);
          onError?.(`You need at least ${formatPriceTHB(CUSTOM_REQUEST_FEE_THB)} in your wallet to send a custom request. Please top up at least ${formatPriceTHB(computedRequiredTopUp)}.`);
          return;
        }
      } catch {
        // Fall back to local flow if API is temporarily unavailable.
      }
    }
    const sellerUser = users.find((user) => user.role === 'seller' && user.sellerId === sellerId);
    const now = new Date().toISOString();
    setDb((prev) => {
      const buyerBefore = Number((prev.users || []).find((user) => user.id === currentUser.id)?.walletBalance || 0);
      const buyerAfter = Number((buyerBefore - CUSTOM_REQUEST_FEE_THB).toFixed(2));
      const requestId = `custom_request_${Date.now()}`;
      const payout = calculateSellerRevenueSplit(prev, {
        sellerId,
        grossAmount: CUSTOM_REQUEST_FEE_THB,
      });
      const base = {
        ...prev,
        users: prev.users.map((user) =>
          user.id === currentUser.id
            ? { ...user, walletBalance: buyerAfter }
            : user.id === payout.sellerUserId
              ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.sellerAmount).toFixed(2)) }
              : user.id === payout.barUserId
                ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.barAmount).toFixed(2)) }
                : user.id === payout.adminUserId
                  ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.adminAmount).toFixed(2)) }
                  : user,
        ),
        walletTransactions: [
          ...(payout.sellerUserId && payout.sellerAmount > 0 ? [
            {
              id: `txn_${Date.now()}_seller`,
              userId: payout.sellerUserId,
              type: 'message_fee',
              amount: payout.sellerAmount,
              description: `Custom request earning from ${buyerName || 'Buyer'}`,
              createdAt: now,
            },
          ] : []),
          ...(payout.barUserId && payout.barAmount > 0 ? [
            {
              id: `txn_${Date.now()}_bar`,
              userId: payout.barUserId,
              type: 'message_fee',
              amount: payout.barAmount,
              description: 'Bar commission from custom request fee',
              createdAt: now,
            },
          ] : []),
          ...(payout.adminUserId && payout.adminAmount > 0 ? [
            {
              id: `txn_${Date.now()}_admin`,
              userId: payout.adminUserId,
              type: 'message_fee',
              amount: payout.adminAmount,
              description: 'Platform commission from custom request fee',
              createdAt: now,
            },
          ] : []),
          {
            id: `txn_${Date.now()}`,
            userId: currentUser.id,
            type: 'message_fee',
            amount: -CUSTOM_REQUEST_FEE_THB,
            description: `Custom request fee to ${sellerUser?.name || 'Seller'}`,
            createdAt: now,
          },
          ...(prev.walletTransactions || []),
        ],
        customRequests: [
          {
            id: requestId,
            buyerUserId: currentUser.id,
            sellerId,
            buyerName,
            buyerEmail,
            preferredDetails,
            shippingCountry,
            requestBody,
            status: 'open',
            quotedPriceThb: null,
            quoteStatus: 'none',
            quoteMessage: '',
            quoteUpdatedAt: null,
            quoteUpdatedByUserId: null,
            quoteAcceptedAt: null,
            buyerCounterPriceThb: null,
            quoteAwaitingBuyerPayment: false,
            buyerImageUploadEnabled: false,
            createdAt: now,
            updatedAt: now,
          },
          ...(prev.customRequests || []),
        ],
        notifications: sellerUser?.id
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}`,
                userId: sellerUser.id,
                type: 'message',
                text: `New custom request from ${buyerName}.`,
                read: false,
                createdAt: now,
              },
            ]
          : prev.notifications || [],
      };
      let withEmails = base;
      if (sellerUser?.id) {
        withEmails = appendTemplatedEmail(withEmails, {
          templateKey: 'custom_request_received',
          userId: sellerUser.id,
          vars: {
            buyerName: buyerName || currentUser.name || 'Buyer',
            requestId,
            actionPath: '/custom-requests',
          },
          fallbackPath: '/custom-requests',
        });
      }
      return appendLowBalanceEmailIfNeeded(withEmails, {
        userId: currentUser.id,
        beforeBalance: buyerBefore,
        afterBalance: buyerAfter,
      });
    });
    onError?.('');
    onSuccess?.();
  }

  function updateCustomRequestStatus(requestId, status) {
    if (!currentUser || currentUser.role !== 'seller') return;
    if (!['open', 'reviewing', 'fulfilled', 'closed'].includes(status)) return;
    setDb((prev) => {
      const targetRequest = (prev.customRequests || []).find((request) => request.id === requestId && request.sellerId === currentUser.sellerId);
      if (!targetRequest) return prev;
      const now = new Date().toISOString();
      const base = {
        ...prev,
        customRequests: (prev.customRequests || []).map((request) =>
          request.id === requestId && request.sellerId === currentUser.sellerId
            ? { ...request, status, updatedAt: now }
            : request,
        ),
      };
      return appendTemplatedEmail(base, {
        templateKey: 'custom_request_status_changed',
        userId: targetRequest.buyerUserId,
        vars: {
          requestId,
          requestStatus: status,
          actionPath: '/custom-requests',
        },
        fallbackPath: '/custom-requests',
      });
    });
  }

  function cancelCustomRequestByAdmin(requestId, reason = '', onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'admin') {
      onError?.('Only admins can cancel custom requests.');
      return;
    }
    const normalizedReason = String(reason || '').trim();
    let actionError = '';
    let actionResult = null;
    setDb((prev) => {
      const targetRequest = (prev.customRequests || []).find((request) => request.id === requestId);
      if (!targetRequest) {
        actionError = 'Custom request not found.';
        return prev;
      }
      if ((targetRequest.status || '') === 'cancelled') {
        actionError = 'This custom request is already cancelled.';
        return prev;
      }
      const now = new Date().toISOString();
      const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === targetRequest.sellerId);
      const buyerUser = (prev.users || []).find((user) => user.id === targetRequest.buyerUserId);
      const shouldRefundAcceptedQuote = (targetRequest.quoteStatus || '') === 'accepted' && Number(targetRequest.quotedPriceThb || 0) > 0;
      const refundAmount = shouldRefundAcceptedQuote ? Number(Number(targetRequest.quotedPriceThb || 0).toFixed(2)) : 0;
      const base = {
        ...prev,
        users: (prev.users || []).map((user) => {
          if (refundAmount > 0 && buyerUser?.id && user.id === buyerUser.id) {
            return { ...user, walletBalance: Number(((user.walletBalance || 0) + refundAmount).toFixed(2)) };
          }
          if (refundAmount > 0 && sellerUser?.id && user.id === sellerUser.id) {
            return { ...user, walletBalance: Number(((user.walletBalance || 0) - refundAmount).toFixed(2)) };
          }
          return user;
        }),
        walletTransactions: [
          ...(refundAmount > 0 && buyerUser?.id ? [
            {
              id: `txn_${Date.now()}_custom_refund_buyer`,
              userId: buyerUser.id,
              type: 'custom_request_refund',
              amount: refundAmount,
              description: `Admin cancelled custom request ${requestId} (${normalizedReason || 'policy'})`,
              createdAt: now,
            },
          ] : []),
          ...(refundAmount > 0 && sellerUser?.id ? [
            {
              id: `txn_${Date.now()}_custom_refund_seller`,
              userId: sellerUser.id,
              type: 'custom_request_reversal',
              amount: -refundAmount,
              description: `Admin reversal for cancelled custom request ${requestId}`,
              createdAt: now,
            },
          ] : []),
          ...(prev.walletTransactions || []),
        ],
        customRequests: (prev.customRequests || []).map((request) => (
          request.id === requestId
            ? {
                ...request,
                status: 'cancelled',
                quoteStatus: 'cancelled',
                quoteAwaitingBuyerPayment: false,
                adminCancelledAt: now,
                adminCancelledByUserId: currentUser.id,
                adminCancellationReason: normalizedReason,
                updatedAt: now,
              }
            : request
        )),
        customRequestMessages: [
          ...(prev.customRequestMessages || []),
          {
            id: `custom_request_msg_${Date.now()}_admin_cancel`,
            requestId,
            senderUserId: currentUser.id,
            senderRole: 'admin',
            body: normalizedReason
              ? `Admin cancelled this custom request: ${normalizedReason}`
              : 'Admin cancelled this custom request as inappropriate.',
            feeCharged: 0,
            messageType: 'admin_cancel',
            createdAt: now,
          },
        ],
        notifications: [
          ...(prev.notifications || []),
          ...(buyerUser?.id ? [{
            id: `notif_${Date.now()}_custom_cancel_buyer`,
            userId: buyerUser.id,
            type: 'engagement',
            text: `Admin cancelled custom request ${requestId}.${refundAmount > 0 ? ` Refunded ${formatPriceTHB(refundAmount)}.` : ''}`,
            read: false,
            createdAt: now,
          }] : []),
          ...(sellerUser?.id ? [{
            id: `notif_${Date.now()}_custom_cancel_seller`,
            userId: sellerUser.id,
            type: 'engagement',
            text: `Admin cancelled custom request ${requestId}.`,
            read: false,
            createdAt: now,
          }] : []),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}_cancel_custom_request`,
            type: 'cancel_custom_request',
            targetRequestId: requestId,
            targetUserId: buyerUser?.id || null,
            targetSellerId: targetRequest.sellerId || null,
            adminUserId: currentUser.id,
            reason: normalizedReason || 'Inappropriate custom request content',
            refundedAmount: refundAmount,
            createdAt: now,
          },
        ],
      };
      actionResult = { requestId, refundAmount };
      return appendTemplatedEmail(base, {
        templateKey: 'custom_request_status_changed',
        userId: targetRequest.buyerUserId,
        vars: {
          requestId,
          requestStatus: 'cancelled by admin',
          actionPath: '/custom-requests',
        },
        fallbackPath: '/custom-requests',
      });
    });
    if (actionError) onError?.(actionError);
    else onSuccess?.(actionResult);
  }

  function proposeCustomRequestPrice(requestId, quotedPriceThb, quoteMessage, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'seller') {
      onError?.('Only sellers can propose a custom request price.');
      return;
    }
    const normalizedPrice = Number(quotedPriceThb);
    if (!Number.isFinite(normalizedPrice) || normalizedPrice < MIN_CUSTOM_REQUEST_PURCHASE_THB) {
      onError?.(`Quote amount must be at least ${formatPriceTHB(MIN_CUSTOM_REQUEST_PURCHASE_THB)}.`);
      return;
    }
    const roundedPrice = Number(normalizedPrice.toFixed(2));
    const note = String(quoteMessage || '').trim();
    const now = new Date().toISOString();
    setDb((prev) => {
      const targetRequest = (prev.customRequests || []).find((request) => request.id === requestId && request.sellerId === currentUser.sellerId);
      if (!targetRequest) return prev;
      const buyerUser = (prev.users || []).find((user) => user.id === targetRequest.buyerUserId);
      const base = {
        ...prev,
        customRequests: (prev.customRequests || []).map((request) => (
          request.id === requestId && request.sellerId === currentUser.sellerId
            ? {
                ...request,
                quotedPriceThb: roundedPrice,
                quoteStatus: 'proposed',
                quoteMessage: note,
                quoteUpdatedAt: now,
                quoteUpdatedByUserId: currentUser.id,
                buyerCounterPriceThb: null,
                quoteAwaitingBuyerPayment: false,
                updatedAt: now,
              }
            : request
        )),
        customRequestMessages: [
          ...(prev.customRequestMessages || []),
          {
            id: `custom_request_msg_${Date.now()}_quote`,
            requestId,
            senderUserId: currentUser.id,
            senderRole: 'seller',
            body: note || `I can complete this request for ${formatPriceTHB(roundedPrice)}.`,
            feeCharged: 0,
            messageType: 'price_proposal',
            quotedPriceThb: roundedPrice,
            createdAt: now,
          },
        ],
        notifications: buyerUser?.id
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}_quote`,
                userId: buyerUser.id,
                type: 'engagement',
                text: `${currentUser.name || 'Seller'} proposed ${formatPriceTHB(roundedPrice)} for your custom request.`,
                read: false,
                createdAt: now,
              },
            ]
          : (prev.notifications || []),
      };
      return appendTemplatedEmail(base, {
        templateKey: 'custom_request_status_changed',
        userId: targetRequest.buyerUserId,
        vars: {
          requestId,
          requestStatus: `quoted ${formatPriceTHB(roundedPrice)}`,
          actionPath: '/custom-requests',
        },
        fallbackPath: '/custom-requests',
      });
    });
    onError?.('');
    onSuccess?.();
  }

  function respondToCustomRequestCounter(requestId, action, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'seller') {
      onError?.('Only sellers can review counter-offers.');
      return;
    }
    if (!['accept', 'decline'].includes(action)) {
      onError?.('Unsupported counter action.');
      return;
    }
    const now = new Date().toISOString();
    let actionError = '';
    let actionSucceeded = false;
    setDb((prev) => {
      const targetRequest = (prev.customRequests || []).find((request) => request.id === requestId && request.sellerId === currentUser.sellerId);
      if (!targetRequest) {
        actionError = 'Custom request not found.';
        return prev;
      }
      const counterPrice = Number(targetRequest.buyerCounterPriceThb || 0);
      if (targetRequest.quoteStatus !== 'countered' || !Number.isFinite(counterPrice) || counterPrice < MIN_CUSTOM_REQUEST_PURCHASE_THB) {
        actionError = 'No active buyer counter-offer found.';
        return prev;
      }
      const buyerUser = (prev.users || []).find((user) => user.id === targetRequest.buyerUserId);
      if (action === 'accept') {
        const base = {
          ...prev,
          customRequests: (prev.customRequests || []).map((request) => (
            request.id === requestId
              ? {
                  ...request,
                  quotedPriceThb: counterPrice,
                  quoteStatus: 'proposed',
                  quoteMessage: `Seller accepted buyer counter-offer at ${formatPriceTHB(counterPrice)}.`,
                  quoteUpdatedAt: now,
                  quoteUpdatedByUserId: currentUser.id,
                  quoteAwaitingBuyerPayment: true,
                  updatedAt: now,
                }
              : request
          )),
          customRequestMessages: [
            ...(prev.customRequestMessages || []),
            {
              id: `custom_request_msg_${Date.now()}_counter_accept`,
              requestId,
              senderUserId: currentUser.id,
              senderRole: 'seller',
              body: `I accept your counter-offer of ${formatPriceTHB(counterPrice)}. You can pay now.`,
              feeCharged: 0,
              messageType: 'counter_accept',
              quotedPriceThb: counterPrice,
              createdAt: now,
            },
          ],
          notifications: buyerUser?.id
            ? [
                ...(prev.notifications || []),
                {
                  id: `notif_${Date.now()}_counter_accept`,
                  userId: buyerUser.id,
                  type: 'engagement',
                  text: `${currentUser.name || 'Seller'} accepted your counter-offer of ${formatPriceTHB(counterPrice)}.`,
                  read: false,
                  createdAt: now,
                },
              ]
            : (prev.notifications || []),
        };
        actionSucceeded = true;
        return base;
      }
      const base = {
        ...prev,
        customRequests: (prev.customRequests || []).map((request) => (
          request.id === requestId
            ? {
                ...request,
                quoteStatus: 'proposed',
                quoteMessage: `Seller declined buyer counter-offer. Current quote remains ${formatPriceTHB(Number(request.quotedPriceThb || 0))}.`,
                quoteUpdatedAt: now,
                quoteUpdatedByUserId: currentUser.id,
                buyerCounterPriceThb: null,
                quoteAwaitingBuyerPayment: false,
                updatedAt: now,
              }
            : request
        )),
        customRequestMessages: [
          ...(prev.customRequestMessages || []),
          {
            id: `custom_request_msg_${Date.now()}_counter_decline`,
            requestId,
            senderUserId: currentUser.id,
            senderRole: 'seller',
            body: `I cannot accept that counter-offer. Current quote remains ${formatPriceTHB(Number(targetRequest.quotedPriceThb || 0))}.`,
            feeCharged: 0,
            messageType: 'counter_decline',
            quotedPriceThb: Number(targetRequest.quotedPriceThb || 0),
            createdAt: now,
          },
        ],
        notifications: buyerUser?.id
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}_counter_decline`,
                userId: buyerUser.id,
                type: 'engagement',
                text: `${currentUser.name || 'Seller'} declined your counter-offer.`,
                read: false,
                createdAt: now,
              },
            ]
          : (prev.notifications || []),
      };
      actionSucceeded = true;
      return base;
    });
    if (actionSucceeded) {
      onError?.('');
      onSuccess?.();
    } else if (actionError) {
      onError?.(actionError);
    }
  }

  function toggleCustomRequestBuyerImageUpload(requestId, enabled, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'seller') {
      onError?.('Only sellers can change buyer upload permissions.');
      return;
    }
    const now = new Date().toISOString();
    let actionError = '';
    let actionSucceeded = false;
    setDb((prev) => {
      const targetRequest = (prev.customRequests || []).find((request) => request.id === requestId && request.sellerId === currentUser.sellerId);
      if (!targetRequest) {
        actionError = 'Custom request not found.';
        return prev;
      }
      const nextEnabled = Boolean(enabled);
      if (Boolean(targetRequest.buyerImageUploadEnabled) === nextEnabled) {
        actionSucceeded = true;
        return prev;
      }
      const buyerUser = (prev.users || []).find((user) => user.id === targetRequest.buyerUserId);
      const base = {
        ...prev,
        customRequests: (prev.customRequests || []).map((request) => (
          request.id === requestId
            ? {
                ...request,
                buyerImageUploadEnabled: nextEnabled,
                updatedAt: now,
              }
            : request
        )),
        customRequestMessages: [
          ...(prev.customRequestMessages || []),
          {
            id: `custom_request_msg_${Date.now()}_upload_permission`,
            requestId,
            senderUserId: currentUser.id,
            senderRole: 'seller',
            body: nextEnabled
              ? 'You can now upload images in this custom request thread.'
              : 'Image uploads have been disabled for this request.',
            feeCharged: 0,
            messageType: 'upload_permission',
            createdAt: now,
            imageAttachments: [],
          },
        ],
        notifications: buyerUser?.id
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}_custom_upload_permission`,
                userId: buyerUser.id,
                type: 'engagement',
                text: nextEnabled
                  ? `${currentUser.name || 'Seller'} enabled image uploads for your custom request.`
                  : `${currentUser.name || 'Seller'} disabled image uploads for your custom request.`,
                read: false,
                createdAt: now,
              },
            ]
          : (prev.notifications || []),
      };
      actionSucceeded = true;
      return base;
    });
    if (actionSucceeded) {
      onError?.('');
      onSuccess?.();
    } else if (actionError) {
      onError?.(actionError);
    }
  }

  async function respondToCustomRequestPrice(requestId, action, payload = {}, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'buyer') {
      onError?.('Only buyers can respond to custom request pricing.');
      return;
    }
    if (!['accept', 'decline', 'counter'].includes(action)) {
      onError?.('Unsupported quote action.');
      return;
    }
    const now = new Date().toISOString();
    let actionError = '';
    let actionSucceeded = false;
    let serverAcceptMeta = null;

    if (action === 'accept' && apiAuthToken) {
      try {
        const { ok, payload } = await apiRequestJson(
          `/api/custom-requests/${encodeURIComponent(requestId)}/accept`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {},
            idempotencyScope: `custom_accept_${requestId}`,
            stableIdempotency: true,
          }
        );
        if (!ok) {
          const requiredTopUp = Number(payload?.requiredTopUp || 0);
          const shortfall = Number(payload?.shortfall || 0);
          if (requiredTopUp > 0 || shortfall > 0) {
            const computedRequiredTopUp = requiredTopUp > 0 ? requiredTopUp : getRequiredTopUpAmount(shortfall);
            onError?.(`Insufficient wallet balance. Please top up at least ${formatPriceTHB(computedRequiredTopUp)} to continue.`);
            return;
          }
          onError?.(String(payload?.error || 'Could not process payment. Please try again.'));
          return;
        } else {
          serverAcceptMeta = {
            alreadyProcessed: Boolean(payload?.alreadyProcessed),
          };
        }
      } catch {
        onError?.('Could not connect to payment service. Please try again.');
        return;
      }
    }

    setDb((prev) => {
      const targetRequest = (prev.customRequests || []).find((request) => request.id === requestId && request.buyerUserId === currentUser.id);
      if (!targetRequest) {
        actionError = 'Custom request not found.';
        return prev;
      }
      const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === targetRequest.sellerId);
      const quotedPrice = Number(targetRequest.quotedPriceThb || 0);
      if (!Number.isFinite(quotedPrice) || quotedPrice < MIN_CUSTOM_REQUEST_PURCHASE_THB) {
        actionError = `No valid seller quote is available yet. Minimum is ${formatPriceTHB(MIN_CUSTOM_REQUEST_PURCHASE_THB)}.`;
        return prev;
      }

      if (action === 'accept') {
        if (serverAcceptMeta?.alreadyProcessed) {
          actionSucceeded = true;
          return {
            ...prev,
            customRequests: (prev.customRequests || []).map((request) => (
              request.id === requestId
                ? {
                    ...request,
                    quoteStatus: 'accepted',
                    quoteAcceptedAt: request.quoteAcceptedAt || now,
                    quoteUpdatedAt: now,
                    quoteUpdatedByUserId: currentUser.id,
                    quoteAwaitingBuyerPayment: false,
                    status: request.status === 'open' ? 'reviewing' : request.status,
                    updatedAt: now,
                  }
                : request
            )),
          };
        }
        const buyerBefore = Number((prev.users || []).find((user) => user.id === currentUser.id)?.walletBalance || 0);
        if (buyerBefore < quotedPrice) {
          actionError = `You need at least ${formatPriceTHB(quotedPrice)} in your wallet to accept this quote.`;
          return prev;
        }
        const buyerAfter = Number((buyerBefore - quotedPrice).toFixed(2));
        const payout = calculateSellerRevenueSplit(prev, {
          sellerId: targetRequest.sellerId,
          grossAmount: quotedPrice,
        });
        const base = {
          ...prev,
          users: (prev.users || []).map((user) => (
            user.id === currentUser.id
              ? { ...user, walletBalance: buyerAfter }
              : (payout.sellerUserId && user.id === payout.sellerUserId)
                ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.sellerAmount).toFixed(2)) }
                : (payout.barUserId && user.id === payout.barUserId)
                  ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.barAmount).toFixed(2)) }
                  : (payout.adminUserId && user.id === payout.adminUserId)
                    ? { ...user, walletBalance: Number(((user.walletBalance || 0) + payout.adminAmount).toFixed(2)) }
                : user
          )),
          walletTransactions: [
            ...(payout.sellerUserId && payout.sellerAmount > 0 ? [{
              id: `txn_${Date.now()}_quote_seller`,
              userId: payout.sellerUserId,
              type: 'order_payment',
              amount: payout.sellerAmount,
              description: `Custom request quote accepted (${requestId})`,
              createdAt: now,
            }] : []),
            ...(payout.barUserId && payout.barAmount > 0 ? [{
              id: `txn_${Date.now()}_quote_bar`,
              userId: payout.barUserId,
              type: 'order_payment',
              amount: payout.barAmount,
              description: `Bar commission for custom request (${requestId})`,
              createdAt: now,
            }] : []),
            ...(payout.adminUserId && payout.adminAmount > 0 ? [{
              id: `txn_${Date.now()}_quote_admin`,
              userId: payout.adminUserId,
              type: 'order_payment',
              amount: payout.adminAmount,
              description: `Platform commission for custom request (${requestId})`,
              createdAt: now,
            }] : []),
            {
              id: `txn_${Date.now()}_quote_buyer`,
              userId: currentUser.id,
              type: 'order_payment',
              amount: -quotedPrice,
              description: `Accepted custom request quote (${requestId})`,
              createdAt: now,
            },
            ...(prev.walletTransactions || []),
          ],
          customRequests: (prev.customRequests || []).map((request) => (
            request.id === requestId
              ? {
                  ...request,
                  quoteStatus: 'accepted',
                  quoteAcceptedAt: now,
                  quoteUpdatedAt: now,
                  quoteUpdatedByUserId: currentUser.id,
                  quoteAwaitingBuyerPayment: false,
                  status: request.status === 'open' ? 'reviewing' : request.status,
                  updatedAt: now,
                }
              : request
          )),
          customRequestMessages: [
            ...(prev.customRequestMessages || []),
            {
              id: `custom_request_msg_${Date.now()}_accept`,
              requestId,
              senderUserId: currentUser.id,
              senderRole: 'buyer',
              body: `I accept your quote of ${formatPriceTHB(quotedPrice)}. Payment sent.`,
              feeCharged: 0,
              messageType: 'price_accept',
              quotedPriceThb: quotedPrice,
              createdAt: now,
            },
          ],
          notifications: sellerUser?.id
            ? [
                ...(prev.notifications || []),
                {
                  id: `notif_${Date.now()}_quote_accept`,
                  userId: sellerUser.id,
                  type: 'engagement',
                  text: `${currentUser.name || 'Buyer'} accepted your quote and paid ${formatPriceTHB(quotedPrice)}.`,
                  read: false,
                  createdAt: now,
                },
              ]
            : (prev.notifications || []),
        };
        actionSucceeded = true;
        return appendLowBalanceEmailIfNeeded(base, {
          userId: currentUser.id,
          beforeBalance: buyerBefore,
          afterBalance: buyerAfter,
        });
      }

      if (action === 'decline') {
        const declineNote = String(payload?.note || '').trim();
        const base = {
          ...prev,
          customRequests: (prev.customRequests || []).map((request) => (
            request.id === requestId
              ? {
                  ...request,
                  quoteStatus: 'declined',
                  quoteUpdatedAt: now,
                  quoteUpdatedByUserId: currentUser.id,
                  quoteAwaitingBuyerPayment: false,
                  updatedAt: now,
                }
              : request
          )),
          customRequestMessages: [
            ...(prev.customRequestMessages || []),
            {
              id: `custom_request_msg_${Date.now()}_decline`,
              requestId,
              senderUserId: currentUser.id,
              senderRole: 'buyer',
              body: declineNote || 'I cannot accept this quote right now.',
              feeCharged: 0,
              messageType: 'price_decline',
              quotedPriceThb: quotedPrice,
              createdAt: now,
            },
          ],
          notifications: sellerUser?.id
            ? [
                ...(prev.notifications || []),
                {
                  id: `notif_${Date.now()}_quote_decline`,
                  userId: sellerUser.id,
                  type: 'engagement',
                  text: `${currentUser.name || 'Buyer'} declined your custom request quote.`,
                  read: false,
                  createdAt: now,
                },
              ]
            : (prev.notifications || []),
        };
        actionSucceeded = true;
        return base;
      }

      const counterPriceValue = Number(payload?.counterPriceThb);
      if (!Number.isFinite(counterPriceValue) || counterPriceValue < MIN_CUSTOM_REQUEST_PURCHASE_THB) {
        actionError = `Counter-offer must be at least ${formatPriceTHB(MIN_CUSTOM_REQUEST_PURCHASE_THB)}.`;
        return prev;
      }
      const counterPrice = Number(counterPriceValue.toFixed(2));
      const counterNote = String(payload?.note || '').trim();
      const buyerBefore = Number((prev.users || []).find((user) => user.id === currentUser.id)?.walletBalance || 0);
      if (buyerBefore < MESSAGE_FEE_THB) {
        actionError = `You need at least ${formatPriceTHB(MESSAGE_FEE_THB)} in your wallet to send a counter-offer.`;
        return prev;
      }
      const buyerAfter = Number((buyerBefore - MESSAGE_FEE_THB).toFixed(2));
      const counterPayout = calculateSellerRevenueSplit(prev, {
        sellerId: targetRequest.sellerId,
        grossAmount: MESSAGE_FEE_THB,
      });
      const base = {
        ...prev,
        users: (prev.users || []).map((user) => (
          user.id === currentUser.id
            ? { ...user, walletBalance: buyerAfter }
            : (counterPayout.sellerUserId && user.id === counterPayout.sellerUserId)
              ? { ...user, walletBalance: Number(((user.walletBalance || 0) + counterPayout.sellerAmount).toFixed(2)) }
              : (counterPayout.barUserId && user.id === counterPayout.barUserId)
                ? { ...user, walletBalance: Number(((user.walletBalance || 0) + counterPayout.barAmount).toFixed(2)) }
                : (counterPayout.adminUserId && user.id === counterPayout.adminUserId)
                  ? { ...user, walletBalance: Number(((user.walletBalance || 0) + counterPayout.adminAmount).toFixed(2)) }
              : user
        )),
        walletTransactions: [
          ...(counterPayout.sellerUserId && counterPayout.sellerAmount > 0 ? [{
            id: `txn_${Date.now()}_counter_seller`,
            userId: counterPayout.sellerUserId,
            type: 'message_fee',
            amount: counterPayout.sellerAmount,
            description: `Counter-offer message earning (${requestId})`,
            createdAt: now,
          }] : []),
          ...(counterPayout.barUserId && counterPayout.barAmount > 0 ? [{
            id: `txn_${Date.now()}_counter_bar`,
            userId: counterPayout.barUserId,
            type: 'message_fee',
            amount: counterPayout.barAmount,
            description: `Bar commission from counter-offer fee (${requestId})`,
            createdAt: now,
          }] : []),
          ...(counterPayout.adminUserId && counterPayout.adminAmount > 0 ? [{
            id: `txn_${Date.now()}_counter_admin`,
            userId: counterPayout.adminUserId,
            type: 'message_fee',
            amount: counterPayout.adminAmount,
            description: `Platform commission from counter-offer fee (${requestId})`,
            createdAt: now,
          }] : []),
          {
            id: `txn_${Date.now()}_counter_buyer`,
            userId: currentUser.id,
            type: 'message_fee',
            amount: -MESSAGE_FEE_THB,
            description: `Counter-offer message fee (${requestId})`,
            createdAt: now,
          },
          ...(prev.walletTransactions || []),
        ],
        customRequests: (prev.customRequests || []).map((request) => (
          request.id === requestId
            ? {
                ...request,
                quoteStatus: 'countered',
                buyerCounterPriceThb: counterPrice,
                quoteMessage: counterNote || request.quoteMessage || '',
                quoteUpdatedAt: now,
                quoteUpdatedByUserId: currentUser.id,
                quoteAwaitingBuyerPayment: false,
                updatedAt: now,
              }
            : request
        )),
        customRequestMessages: [
          ...(prev.customRequestMessages || []),
          {
            id: `custom_request_msg_${Date.now()}_counter`,
            requestId,
            senderUserId: currentUser.id,
            senderRole: 'buyer',
            body: counterNote || `Counter offer: ${formatPriceTHB(counterPrice)}.`,
            feeCharged: MESSAGE_FEE_THB,
            messageType: 'price_counter',
            quotedPriceThb: counterPrice,
            createdAt: now,
          },
        ],
        notifications: sellerUser?.id
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}_quote_counter`,
                userId: sellerUser.id,
                type: 'message',
                text: `${currentUser.name || 'Buyer'} sent a counter-offer of ${formatPriceTHB(counterPrice)}.`,
                read: false,
                createdAt: now,
              },
            ]
          : (prev.notifications || []),
      };
      actionSucceeded = true;
      return appendLowBalanceEmailIfNeeded(base, {
        userId: currentUser.id,
        beforeBalance: buyerBefore,
        afterBalance: buyerAfter,
      });
    });
    if (actionSucceeded) {
      onError?.('');
      onSuccess?.();
    } else if (actionError) {
      onError?.(actionError);
    }
  }

  async function sendCustomRequestMessage(requestId, body, arg3, arg4, arg5) {
    const imageAttachments = Array.isArray(arg3) ? normalizeCustomRequestImageAttachments(arg3) : [];
    const onSuccess = Array.isArray(arg3) ? arg4 : arg3;
    const onError = Array.isArray(arg3) ? arg5 : arg4;
    if (!currentUser || !['buyer', 'seller'].includes(currentUser.role)) {
      onError?.(loginText.loginToSendCustomRequestMessages || 'Please login to send custom request messages.');
      return;
    }
    const trimmedBody = String(body || '').trim();
    if (!requestId || (!trimmedBody && imageAttachments.length === 0)) return;
    const request = customRequests.find((item) => item.id === requestId);
    if (!request) {
      onError?.('Custom request not found.');
      return;
    }
    const isBuyerParticipant = currentUser.role === 'buyer' && request.buyerUserId === currentUser.id;
    const isSellerParticipant = currentUser.role === 'seller' && request.sellerId === currentUser.sellerId;
    if (!isBuyerParticipant && !isSellerParticipant) {
      onError?.('You can only message requests you are part of.');
      return;
    }
    if (currentUser.role === 'buyer' && imageAttachments.length > 0 && !request.buyerImageUploadEnabled) {
      onError?.('Seller approval is required before you can upload images in this request.');
      return;
    }
    if (currentUser.role === 'buyer' && currentWalletBalance < MESSAGE_FEE_THB) {
      onError?.(`You need at least ${formatPriceTHB(MESSAGE_FEE_THB)} in your wallet to send this message.`);
      return;
    }
    const sellerUser = users.find((user) => user.role === 'seller' && user.sellerId === request.sellerId);
    const now = new Date().toISOString();
    const recipientUserId = currentUser.role === 'buyer' ? sellerUser?.id : request.buyerUserId;
    const recipientUser = users.find((user) => user.id === recipientUserId);
    const { sourceLanguage, translations } = await buildMessageTranslationsForRecipient(
      trimmedBody,
      currentUser,
      recipientUser,
    );
    setDb((prev) => {
      const senderBefore = Number((prev.users || []).find((user) => user.id === currentUser.id)?.walletBalance || 0);
      const senderAfter = currentUser.role === 'buyer'
        ? Number((senderBefore - MESSAGE_FEE_THB).toFixed(2))
        : senderBefore;
      const messagePayout = currentUser.role === 'buyer'
        ? calculateSellerRevenueSplit(prev, {
            sellerId: request.sellerId,
            grossAmount: MESSAGE_FEE_THB,
          })
        : {
            sellerUserId: null,
            barUserId: null,
            adminUserId: null,
            sellerAmount: 0,
            barAmount: 0,
            adminAmount: 0,
          };
      const base = {
        ...prev,
        users: prev.users.map((user) =>
          user.id === currentUser.id
            ? { ...user, walletBalance: senderAfter }
            : (currentUser.role === 'buyer' && messagePayout.sellerUserId && user.id === messagePayout.sellerUserId)
              ? { ...user, walletBalance: Number(((user.walletBalance || 0) + messagePayout.sellerAmount).toFixed(2)) }
              : (currentUser.role === 'buyer' && messagePayout.barUserId && user.id === messagePayout.barUserId)
                ? { ...user, walletBalance: Number(((user.walletBalance || 0) + messagePayout.barAmount).toFixed(2)) }
                : (currentUser.role === 'buyer' && messagePayout.adminUserId && user.id === messagePayout.adminUserId)
                  ? { ...user, walletBalance: Number(((user.walletBalance || 0) + messagePayout.adminAmount).toFixed(2)) }
              : user,
        ),
        walletTransactions: [
          ...(currentUser.role === 'buyer' && messagePayout.sellerUserId && messagePayout.sellerAmount > 0 ? [
            {
              id: `txn_${Date.now()}_seller`,
              userId: messagePayout.sellerUserId,
              type: 'message_fee',
              amount: messagePayout.sellerAmount,
              description: `Custom request message earning (${requestId})`,
              createdAt: now,
            },
          ] : []),
          ...(currentUser.role === 'buyer' && messagePayout.barUserId && messagePayout.barAmount > 0 ? [
            {
              id: `txn_${Date.now()}_bar`,
              userId: messagePayout.barUserId,
              type: 'message_fee',
              amount: messagePayout.barAmount,
              description: `Bar commission from custom request message fee (${requestId})`,
              createdAt: now,
            },
          ] : []),
          ...(currentUser.role === 'buyer' && messagePayout.adminUserId && messagePayout.adminAmount > 0 ? [
            {
              id: `txn_${Date.now()}_admin`,
              userId: messagePayout.adminUserId,
              type: 'message_fee',
              amount: messagePayout.adminAmount,
              description: `Platform commission from custom request message fee (${requestId})`,
              createdAt: now,
            },
          ] : []),
          ...(currentUser.role === 'buyer' ? [
            {
              id: `txn_${Date.now()}`,
              userId: currentUser.id,
              type: 'message_fee',
              amount: -MESSAGE_FEE_THB,
              description: `Custom request message fee (${requestId})`,
              createdAt: now,
            },
          ] : []),
          ...(prev.walletTransactions || []),
        ],
        customRequestMessages: [
          ...(prev.customRequestMessages || []),
          {
            id: `custom_request_msg_${Date.now()}`,
            requestId,
            senderUserId: currentUser.id,
            senderRole: currentUser.role,
            body: trimmedBody,
            bodyOriginal: trimmedBody,
            sourceLanguage,
            translations,
            imageAttachments,
            feeCharged: currentUser.role === 'buyer' ? MESSAGE_FEE_THB : 0,
            createdAt: now,
          },
        ],
        notifications: recipientUserId
          ? [
              ...(prev.notifications || []),
              {
                id: `notif_${Date.now()}`,
                userId: recipientUserId,
                type: 'message',
                text: `New custom request message from ${currentUser.name}.`,
                conversationId: requestId,
                read: false,
                createdAt: now,
              },
            ]
          : prev.notifications || [],
        customRequests: (prev.customRequests || []).map((item) =>
          item.id === requestId ? { ...item, updatedAt: now } : item,
        ),
      };
      let withEmails = base;
      if (recipientUserId) {
        withEmails = appendTemplatedEmail(withEmails, {
          templateKey: currentUser.role === 'buyer' ? 'seller_message_received' : 'buyer_message_received',
          userId: recipientUserId,
          vars: {
            senderName: currentUser.name || (currentUser.role === 'buyer' ? 'Buyer' : 'Seller'),
            conversationId: requestId,
            actionPath: '/custom-requests',
          },
          fallbackPath: '/custom-requests',
        });
      }
      if (currentUser.role !== 'buyer') return withEmails;
      return appendLowBalanceEmailIfNeeded(withEmails, {
        userId: currentUser.id,
        beforeBalance: senderBefore,
        afterBalance: senderAfter,
      });
    });
    onError?.('');
    onSuccess?.();
  }

  function markAllNotificationsRead() {
    if (!currentUser) return;
    setDb((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((notification) =>
        notification.userId === currentUser.id ? { ...notification, read: true } : notification,
      ),
    }));
  }

  function markNotificationRead(notificationId) {
    if (!currentUser || !notificationId) return;
    setDb((prev) => ({
      ...prev,
      notifications: (prev.notifications || []).map((notification) =>
        notification.userId === currentUser.id && notification.id === notificationId
          ? { ...notification, read: true }
          : notification,
      ),
    }));
  }

  function updateNotificationPreference(type, enabled) {
    if (!currentUser || !['message', 'engagement'].includes(type)) return;
    setDb((prev) => ({
      ...prev,
      users: (prev.users || []).map((user) =>
        user.id === currentUser.id
          ? {
              ...user,
              notificationPreferences: {
                ...normalizeNotificationPreferences(user?.notificationPreferences, user?.role),
                [type]: Boolean(enabled),
              }
            }
          : user,
      ),
    }));
    if (backendStatus === 'connected' && apiAuthToken) {
      const current = normalizeNotificationPreferences(currentUser.notificationPreferences, currentUser.role);
      const next = {
        ...current.push,
        [type]: Boolean(enabled),
      };
      apiRequestJson('/api/push/preferences', {
        method: 'POST',
        body: { push: next }
      }).catch((err) => console.warn('[updateNotificationPreference] API sync failed:', err));
    }
  }

  async function updatePushNotificationPreference(type, enabled) {
    if (!currentUser || !['message', 'engagement', 'adminOps'].includes(type)) return;
    if (type === 'adminOps' && currentUser.role !== 'admin') return;
    const applyPushPreference = (nextEnabled) => {
      setDb((prev) => ({
        ...prev,
        users: (prev.users || []).map((user) =>
          user.id === currentUser.id
            ? {
                ...user,
                notificationPreferences: {
                  ...normalizeNotificationPreferences(user?.notificationPreferences, user?.role),
                  push: {
                    ...normalizeNotificationPreferences(user?.notificationPreferences, user?.role).push,
                    [type]: Boolean(nextEnabled),
                  }
                }
              }
            : user
        )
      }));
    };

    const syncPushPreferenceToApi = async (nextEnabled) => {
      if (!(backendStatus === 'connected' && apiAuthToken)) return;
      const preferences = normalizeNotificationPreferences(currentUser.notificationPreferences, currentUser.role);
      const payload = {
        ...preferences.push,
        [type]: Boolean(nextEnabled),
      };
      await apiRequestJson('/api/push/preferences', {
        method: 'POST',
        body: {
          push: payload
        }
      }).catch((err) => console.warn('[syncPushPreferenceToApi] API sync failed:', err));
    };

    if (enabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        let permission = Notification.permission;
        if (permission !== 'granted') {
          permission = await Notification.requestPermission();
          setPushPermission(permission);
        }
        if (permission !== 'granted') {
          applyPushPreference(false);
          await syncPushPreferenceToApi(false);
          return;
        }
      }
      applyPushPreference(true);
      await syncPushPreferenceToApi(true);
      await subscribeToPushIfEnabled().catch(() => {});
      return;
    }

    applyPushPreference(false);
    await syncPushPreferenceToApi(false);
    const latest = normalizeNotificationPreferences(currentUser.notificationPreferences, currentUser.role).push;
    const nextPush = {
      ...latest,
      [type]: false,
    };
    const anyEnabled = Object.values(nextPush).some((value) => value !== false);
    if (!anyEnabled) {
      await unsubscribeFromPush().catch(() => {});
    }
  }

  async function sendTestBrowserNotification() {
    try {
      if (typeof window === 'undefined' || typeof Notification === 'undefined') {
        return { ok: false, error: 'Browser notifications are not supported in this environment.' };
      }

      let permission = pushPermission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
        setPushPermission(permission);
      }
      if (permission !== 'granted') {
        return { ok: false, error: 'Browser notifications are blocked. Enable them in browser settings.' };
      }

      const title = 'Test notification';
      const body = `Notifications are working for ${currentUser?.name || 'your account'}.`;
      const isAndroid = /Android/i.test(String(window.navigator?.userAgent || ''));
      let delivered = false;

      const registration = await getPushRegistration();
      if (registration && typeof registration.showNotification === 'function') {
        try {
          await registration.showNotification(title, {
            body,
            tag: 'tp-test-notification',
            renotify: true,
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200],
            icon: '/favicon.svg',
            badge: '/favicon.svg',
          });
          delivered = true;
        } catch {
          delivered = false;
        }
      }

      // Fallback for browsers where service-worker notifications are flaky.
      if (!delivered) {
        try {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.svg',
            tag: 'tp-test-notification-inline',
          });
          notification.onclick = () => {
            if (typeof window !== 'undefined') window.focus();
          };
          delivered = true;
        } catch {
          delivered = false;
        }
      }

      if (!delivered) {
        return { ok: false, error: 'Could not send browser notification. Check OS notification settings and Do Not Disturb.' };
      }
      if (isAndroid) {
        return { ok: true, message: 'Test notification sent.' };
      }
      return { ok: true, message: 'Test notification sent.' };
    } catch {
      return { ok: false, error: 'Could not send test notification right now.' };
    }
  }

  function updateEmailTemplate(templateKey, nextTemplateDraft) {
    if (!currentUser || currentUser.role !== 'admin' || !EMAIL_TEMPLATE_KEYS.has(templateKey)) return;
    const defaultTemplate = getDefaultEmailTemplateByKey(templateKey);
    if (!defaultTemplate) return;
    const updatedAt = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      emailTemplates: normalizeEmailTemplates((prev.emailTemplates || []).map((template) => (
        template.key !== templateKey
          ? template
          : {
              ...template,
              enabled: nextTemplateDraft?.enabled !== false,
              subject: String(nextTemplateDraft?.subject || defaultTemplate.subject || ''),
              body: String(nextTemplateDraft?.body || defaultTemplate.body || ''),
              ctaLabel: String(nextTemplateDraft?.ctaLabel || defaultTemplate.ctaLabel || ''),
              ctaPath: String(nextTemplateDraft?.ctaPath || defaultTemplate.ctaPath || '/account'),
              updatedAt,
              updatedByUserId: currentUser.id,
            }
      ))),
    }));
  }

  function resetEmailTemplate(templateKey) {
    if (!currentUser || currentUser.role !== 'admin' || !EMAIL_TEMPLATE_KEYS.has(templateKey)) return;
    const defaultTemplate = getDefaultEmailTemplateByKey(templateKey);
    if (!defaultTemplate) return;
    const updatedAt = new Date().toISOString();
    setDb((prev) => ({
      ...prev,
      emailTemplates: normalizeEmailTemplates((prev.emailTemplates || []).map((template) => (
        template.key !== templateKey
          ? template
          : { ...structuredClone(defaultTemplate), updatedAt, updatedByUserId: currentUser.id }
      ))),
    }));
  }

  async function refreshAdminEmailInbox({ mailbox = 'all', status = 'all', search = '' } = {}) {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const query = new URLSearchParams();
    if (mailbox && mailbox !== 'all') query.set('mailbox', mailbox);
    if (status && status !== 'all') query.set('status', status);
    if (String(search || '').trim()) query.set('search', String(search || '').trim());
    const endpoint = `/api/admin/email-inbox/threads${query.toString() ? `?${query.toString()}` : ''}`;
    const { ok, payload } = await apiRequestJson(endpoint);
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not load admin email inbox.') };
    }
    setDb((prev) => ({
      ...prev,
      adminEmailThreads: Array.isArray(payload?.threads) ? payload.threads : [],
    }));
    return { ok: true, count: Array.isArray(payload?.threads) ? payload.threads.length : 0 };
  }

  async function fetchAdminEmailThreadMessages(threadId) {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const safeThreadId = String(threadId || '').trim();
    if (!safeThreadId) return { ok: false, error: 'Thread id is required.' };
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const { ok, payload } = await apiRequestJson(`/api/admin/email-inbox/threads/${encodeURIComponent(safeThreadId)}/messages`);
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not load thread messages.') };
    }
    setDb((prev) => {
      const incomingThread = payload?.thread || null;
      const incomingMessages = Array.isArray(payload?.messages) ? payload.messages : [];
      const remainingMessages = (prev.adminEmailMessages || []).filter((entry) => entry.threadId !== safeThreadId);
      return {
        ...prev,
        adminEmailThreads: incomingThread
          ? [incomingThread, ...(prev.adminEmailThreads || []).filter((entry) => entry.id !== incomingThread.id)]
          : (prev.adminEmailThreads || []),
        adminEmailMessages: [...remainingMessages, ...incomingMessages],
      };
    });
    return { ok: true, thread: payload?.thread || null, messages: Array.isArray(payload?.messages) ? payload.messages : [] };
  }

  async function sendAdminEmailThreadReply(threadId, { mailbox = 'admin', toEmail = '', toName = '', subject = '', body = '', attachments = [] } = {}) {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const safeThreadId = String(threadId || '').trim();
    const nextBody = String(body || '').trim();
    if (!safeThreadId || !nextBody) {
      return { ok: false, error: 'Thread id and reply body are required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const { ok, payload } = await apiRequestJson(
      `/api/admin/email-inbox/threads/${encodeURIComponent(safeThreadId)}/reply`,
      {
        method: 'POST',
        idempotencyScope: `admin_email_reply_${safeThreadId}`,
        body: {
          mailbox: String(mailbox || 'admin').toLowerCase(),
          toEmail: String(toEmail || '').trim().toLowerCase(),
          toName: String(toName || '').trim(),
          subject: String(subject || '').trim(),
          body: nextBody,
          attachments: Array.isArray(attachments) ? attachments : [],
        },
      }
    );
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not send admin reply.') };
    }
    setDb((prev) => ({
      ...prev,
      adminEmailThreads: payload?.thread
        ? [payload.thread, ...(prev.adminEmailThreads || []).filter((entry) => entry.id !== payload.thread.id)]
        : (prev.adminEmailThreads || []),
      adminEmailMessages: payload?.message
        ? [...(prev.adminEmailMessages || []), payload.message]
        : (prev.adminEmailMessages || []),
    }));
    return {
      ok: true,
      message: payload?.email?.delivered
        ? `Reply delivered to ${(payload?.email?.recipients || [toEmail]).join(', ')}.`
        : 'Reply sent.',
    };
  }

  async function sendAdminEmailInboxMessage({ mailbox = 'admin', toEmail = '', toName = '', subject = '', body = '', attachments = [] } = {}) {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const nextToEmail = String(toEmail || '').trim().toLowerCase();
    const nextSubject = String(subject || '').trim();
    const nextBody = String(body || '').trim();
    if (!nextToEmail || !nextSubject || !nextBody) {
      return { ok: false, error: 'Recipient email, subject, and body are required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const selectedMailbox = String(mailbox || 'admin').toLowerCase() === 'support' ? 'support' : 'admin';
    const { ok, payload } = await apiRequestJson(
      '/api/admin/email-inbox/send',
      {
        method: 'POST',
        idempotencyScope: `admin_email_send_${nextToEmail}`,
        body: {
          mailbox: selectedMailbox,
          toEmail: nextToEmail,
          toName: String(toName || '').trim(),
          subject: nextSubject,
          body: nextBody,
          attachments: Array.isArray(attachments) ? attachments : [],
        },
      }
    );
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not send email.') };
    }
    if (!payload?.email?.delivered) {
      return {
        ok: false,
        error: `Email was accepted but not delivered (${payload?.email?.reason || payload?.email?.mode || 'unknown'}).`,
      };
    }
    setDb((prev) => ({
      ...prev,
      adminEmailThreads: payload?.thread
        ? [payload.thread, ...(prev.adminEmailThreads || []).filter((entry) => entry.id !== payload.thread.id)]
        : (prev.adminEmailThreads || []),
      adminEmailMessages: payload?.message
        ? [...(prev.adminEmailMessages || []), payload.message]
        : (prev.adminEmailMessages || []),
    }));
    return {
      ok: true,
      thread: payload?.thread || null,
      message: `Email delivered to ${(payload?.email?.recipients || [nextToEmail]).join(', ')}.`,
    };
  }

  async function updateAdminEmailThreadStatus(threadId, status) {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const safeThreadId = String(threadId || '').trim();
    const nextStatus = String(status || '').trim();
    if (!safeThreadId || !nextStatus) {
      return { ok: false, error: 'Thread id and status are required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const { ok, payload } = await apiRequestJson(
      `/api/admin/email-inbox/threads/${encodeURIComponent(safeThreadId)}/status`,
      {
        method: 'POST',
        body: { status: nextStatus },
      }
    );
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not update thread status.') };
    }
    setDb((prev) => ({
      ...prev,
      adminEmailThreads: payload?.thread
        ? [payload.thread, ...(prev.adminEmailThreads || []).filter((entry) => entry.id !== payload.thread.id)]
        : (prev.adminEmailThreads || []),
    }));
    return { ok: true, thread: payload?.thread || null };
  }

  async function deleteAdminEmailThread(threadId) {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    const safeThreadId = String(threadId || '').trim();
    if (!safeThreadId) {
      return { ok: false, error: 'Thread id is required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const { ok, payload } = await apiRequestJson(
      `/api/admin/email-inbox/threads/${encodeURIComponent(safeThreadId)}`,
      {
        method: 'DELETE',
        idempotencyScope: `admin_email_delete_${safeThreadId}`,
      }
    );
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not delete thread.') };
    }
    setDb((prev) => ({
      ...prev,
      adminEmailThreads: (prev.adminEmailThreads || []).filter((entry) => entry.id !== safeThreadId),
      adminEmailMessages: (prev.adminEmailMessages || []).filter((entry) => entry.threadId !== safeThreadId),
    }));
    return { ok: true, deletedThreadId: safeThreadId };
  }

  async function getAdminEmailInboxHealth() {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const { ok, payload } = await apiRequestJson('/api/admin/email-inbox/health');
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not load inbox health.') };
    }
    return { ok: true, health: payload?.webhook || null };
  }

  async function listAdminEmailSuppressions() {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const { ok, payload } = await apiRequestJson('/api/admin/email-inbox/suppressions');
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not load suppressions.') };
    }
    return { ok: true, suppressions: Array.isArray(payload?.suppressions) ? payload.suppressions : [] };
  }

  async function addAdminEmailSuppression(email, reason = '') {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const safeEmail = String(email || '').trim().toLowerCase();
    if (!safeEmail || !safeEmail.includes('@')) {
      return { ok: false, error: 'Valid email is required.' };
    }
    const { ok, payload } = await apiRequestJson('/api/admin/email-inbox/suppressions', {
      method: 'POST',
      body: { email: safeEmail, reason: String(reason || '').trim() },
    });
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not add suppression.') };
    }
    return { ok: true, suppression: payload?.suppression || null };
  }

  async function removeAdminEmailSuppression(email) {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const safeEmail = String(email || '').trim().toLowerCase();
    if (!safeEmail || !safeEmail.includes('@')) {
      return { ok: false, error: 'Valid email is required.' };
    }
    const { ok, payload } = await apiRequestJson(`/api/admin/email-inbox/suppressions/${encodeURIComponent(safeEmail)}`, {
      method: 'DELETE',
    });
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not remove suppression.') };
    }
    return { ok: true, removedEmail: payload?.removedEmail || safeEmail };
  }

  async function dispatchManagedNotification({
    recipientUserIds = [],
    preferenceType = 'engagement',
    route = '/account',
    titleByLang = {},
    bodyByLang = {},
    sendEmail = false,
    emailSubject = '',
    emailText = '',
    kind = 'managed_notification',
  } = {}) {
    if (!currentUser || !hasAdminPanelAccess(currentUser)) {
      return { ok: false, error: 'Admin access required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend notifications are unavailable while API is offline.' };
    }
    const normalizedRecipientUserIds = Array.isArray(recipientUserIds)
      ? [...new Set(recipientUserIds.map((entry) => String(entry || '').trim()).filter(Boolean))]
      : [];
    if (normalizedRecipientUserIds.length === 0) {
      return { ok: false, error: 'At least one recipient is required.' };
    }
    const { ok, payload } = await apiRequestJson('/api/notifications/dispatch', {
      method: 'POST',
      body: {
        recipientUserIds: normalizedRecipientUserIds,
        preferenceType: String(preferenceType || 'engagement').trim(),
        route: String(route || '/account').trim() || '/account',
        titleByLang: (titleByLang && typeof titleByLang === 'object') ? titleByLang : {},
        bodyByLang: (bodyByLang && typeof bodyByLang === 'object') ? bodyByLang : {},
        sendEmail: Boolean(sendEmail),
        emailSubject: String(emailSubject || '').trim(),
        emailText: String(emailText || '').trim(),
        kind: String(kind || 'managed_notification').trim() || 'managed_notification',
      },
    });
    if (!ok) {
      return { ok: false, error: String(payload?.error || 'Could not dispatch notification.') };
    }
    return { ok: true, result: payload?.result || null };
  }

  async function downloadAdminEmailAttachment(threadId, messageId, attachmentId, fallbackFilename = "attachment") {
    if (!currentUser || currentUser.role !== 'admin') {
      return { ok: false, error: 'Admin access required.' };
    }
    if (!(backendStatus === 'connected' && apiAuthToken)) {
      return { ok: false, error: 'Backend inbox is unavailable while API is offline.' };
    }
    const safeThreadId = String(threadId || '').trim();
    const safeMessageId = String(messageId || '').trim();
    const safeAttachmentId = String(attachmentId || '').trim();
    if (!safeThreadId || !safeMessageId || !safeAttachmentId) {
      return { ok: false, error: 'Thread, message, and attachment ids are required.' };
    }
    const response = await fetch(
      `${API_BASE_URL}/api/admin/email-inbox/threads/${encodeURIComponent(safeThreadId)}/messages/${encodeURIComponent(safeMessageId)}/attachments/${encodeURIComponent(safeAttachmentId)}`,
      {
        method: 'GET',
        headers: getApiHeaders({}),
      }
    );
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return { ok: false, error: String(payload?.error || 'Could not download attachment.') };
    }
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const downloadName = String(
      response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
      || fallbackFilename
      || 'attachment'
    ).trim() || 'attachment';
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = downloadName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(objectUrl);
    return { ok: true };
  }

  async function updatePromptPayReceiverMobile(nextMobileValue) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.PAYMENTS_MANAGE)) return;
    const sanitized = String(nextMobileValue || '').replace(/[^\d+]/g, '').trim();
    if (backendStatus === 'connected' && apiAuthToken) {
      const { ok, payload } = await apiRequestJson('/api/admin/site-settings/promptpay', {
        method: 'POST',
        body: { promptPayReceiverMobile: sanitized },
      });
      if (!ok) {
        return { ok: false, error: String(payload?.error || 'Could not save PromptPay receiver.') };
      }
      if (payload?.db) setDb(normalizeDbState(payload.db, appMode));
      return { ok: true, message: String(payload?.message || 'PromptPay receiver saved.') };
    }
    setDb((prev) => ({
      ...prev,
      siteSettings: normalizeSiteSettings({
        ...(prev.siteSettings || {}),
        promptPayReceiverMobile: sanitized,
      }),
    }));
    return { ok: true, message: 'PromptPay receiver saved.' };
  }

  async function createMonthlyPayoutRun(monthValue, notes = '') {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.PAYMENTS_MANAGE)) {
      return { ok: false, error: 'Admin access required.' };
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      const { ok, payload } = await apiRequestJson('/api/admin/payout-runs/monthly', {
        method: 'POST',
        idempotencyScope: `payout_run_${monthValue || 'month'}`,
        body: { monthValue, notes: String(notes || '').trim() },
      });
      if (!ok) {
        return { ok: false, error: String(payload?.error || 'Could not create payout run.') };
      }
      if (payload?.db) setDb(normalizeDbState(payload.db, appMode));
      return {
        ok: true,
        runId: payload?.runId || '',
        message: String(payload?.message || 'Payout run created.'),
      };
    }
    if (PAYOUT_SCHEDULE !== 'monthly') {
      return { ok: false, error: 'Unsupported payout schedule.' };
    }
    const monthRange = getMonthRangeFromValue(monthValue);
    if (!monthRange) {
      return { ok: false, error: 'Select a valid month (YYYY-MM).' };
    }
    let actionResult = { ok: false, error: 'Could not create payout run.' };
    setDb((prev) => {
      const existingRun = (prev.payoutRuns || []).find((run) => (
        run?.periodStart === monthRange.periodStartIso
        && run?.periodEnd === monthRange.periodEndIso
        && run?.status !== 'cancelled'
      ));
      if (existingRun) {
        actionResult = { ok: false, error: `A payout run already exists for ${monthRange.periodLabel}.` };
        return prev;
      }
      const now = new Date().toISOString();
      const holdCutoffMs = Date.now() - (PAYOUT_HOLD_DAYS * 24 * 60 * 60 * 1000);
      const periodStartMs = new Date(monthRange.periodStartIso).getTime();
      const periodEndMs = new Date(monthRange.periodEndIso).getTime();
      const userByIdMap = Object.fromEntries((prev.users || []).map((user) => [user.id, user]));
      const paidSourceTxIds = new Set();
      (prev.payoutItems || []).forEach((item) => {
        if (item?.status !== 'sent') return;
        (item?.sourceTxIds || []).forEach((txId) => {
          if (txId) paidSourceTxIds.add(String(txId));
        });
      });
      const groupedByRecipient = {};
      (prev.walletTransactions || []).forEach((entry) => {
        const recipient = userByIdMap[entry.userId];
        if (!isEligiblePayoutWalletTransaction(entry, recipient)) return;
        if (paidSourceTxIds.has(String(entry.id))) return;
        const createdAtMs = new Date(entry.createdAt || 0).getTime();
        if (!Number.isFinite(createdAtMs) || createdAtMs < periodStartMs || createdAtMs > periodEndMs) return;
        if (createdAtMs > holdCutoffMs) return;
        if (!groupedByRecipient[entry.userId]) {
          groupedByRecipient[entry.userId] = {
            recipientUserId: entry.userId,
            recipientRole: recipient.role,
            sourceTxIds: [],
            grossEligible: 0,
          };
        }
        groupedByRecipient[entry.userId].sourceTxIds.push(String(entry.id));
        groupedByRecipient[entry.userId].grossEligible = Number(
          (groupedByRecipient[entry.userId].grossEligible + Number(entry.amount || 0)).toFixed(2)
        );
      });
      const runId = `payout_run_${Date.now()}`;
      const holdUntilMs = new Date(monthRange.periodEndIso).getTime() + (PAYOUT_HOLD_DAYS * 24 * 60 * 60 * 1000);
      const payoutItemsForRun = Object.values(groupedByRecipient).map((entry, index) => {
        const netPayable = Number((entry.grossEligible || 0).toFixed(2));
        const status = netPayable >= PAYOUT_MIN_THRESHOLD_THB ? 'ready' : 'skipped_below_threshold';
        return {
          id: `payout_item_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
          runId,
          recipientUserId: entry.recipientUserId,
          recipientRole: entry.recipientRole,
          currency: 'THB',
          grossEligible: netPayable,
          threshold: PAYOUT_MIN_THRESHOLD_THB,
          netPayable,
          status,
          method: 'bank_transfer',
          externalReference: '',
          paidAt: '',
          paidByUserId: '',
          notes: '',
          sourceTxIds: entry.sourceTxIds,
          createdAt: now,
        };
      });
      const payoutRun = {
        id: runId,
        schedule: PAYOUT_SCHEDULE,
        periodLabel: monthRange.periodLabel,
        periodStart: monthRange.periodStartIso,
        periodEnd: monthRange.periodEndIso,
        holdUntil: new Date(holdUntilMs).toISOString(),
        status: 'processing',
        createdByUserId: currentUser.id,
        createdAt: now,
        completedAt: '',
        notes: String(notes || '').trim(),
      };
      const payoutEventsForRun = payoutItemsForRun.map((item) => ({
        id: `payout_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        payoutItemId: item.id,
        eventType: 'created',
        actorUserId: currentUser.id,
        createdAt: now,
        payload: {
          runId,
          amount: item.netPayable,
          status: item.status,
          sourceTxCount: (item.sourceTxIds || []).length,
        },
      }));
      actionResult = {
        ok: true,
        runId,
        message: `Created ${monthRange.periodLabel} payout run with ${payoutItemsForRun.length} item(s).`,
      };
      return {
        ...prev,
        payoutRuns: [payoutRun, ...(prev.payoutRuns || [])],
        payoutItems: [...payoutItemsForRun, ...(prev.payoutItems || [])],
        payoutEvents: [...payoutEventsForRun, ...(prev.payoutEvents || [])],
      };
    });
    return actionResult;
  }

  async function markPayoutItemSent(payoutItemId, { method = 'bank_transfer', externalReference = '', notes = '' } = {}) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.PAYMENTS_MANAGE)) {
      return { ok: false, error: 'Admin access required.' };
    }
    const normalizedReference = String(externalReference || '').trim();
    const normalizedNotes = String(notes || '').trim();
    if (!normalizedReference) {
      return { ok: false, error: 'Transfer reference is required before marking sent.' };
    }
    if (normalizedNotes.length < 8) {
      return { ok: false, error: 'Add a short reason in notes (minimum 8 characters) before marking sent.' };
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      const { ok, payload } = await apiRequestJson(`/api/admin/payout-items/${encodeURIComponent(String(payoutItemId || ''))}/sent`, {
        method: 'POST',
        idempotencyScope: `payout_sent_${String(payoutItemId || '')}_${normalizedReference}`,
        body: {
          method,
          externalReference: normalizedReference,
          notes: normalizedNotes,
        },
      });
      if (!ok) {
        return { ok: false, error: String(payload?.error || 'Could not mark payout item as sent.') };
      }
      if (payload?.db) setDb(normalizeDbState(payload.db, appMode));
      return { ok: true, message: String(payload?.message || 'Marked payout sent.') };
    }
    let actionResult = { ok: false, error: 'Could not mark payout item as sent.' };
    setDb((prev) => {
      const idx = (prev.payoutItems || []).findIndex((item) => item.id === payoutItemId);
      if (idx < 0) {
        actionResult = { ok: false, error: 'Payout item not found.' };
        return prev;
      }
      const item = prev.payoutItems[idx];
      if (item?.status === 'sent') {
        actionResult = { ok: false, error: 'This payout item is already marked as sent.' };
        return prev;
      }
      const recipient = (prev.users || []).find((user) => user.id === item.recipientUserId);
      if (!recipient || !['seller', 'bar'].includes(recipient.role)) {
        actionResult = { ok: false, error: 'Recipient is invalid for payout.' };
        return prev;
      }
      const payoutRun = (prev.payoutRuns || []).find((run) => run.id === item.runId);
      const periodDate = new Date(payoutRun?.periodStart || item?.createdAt || Date.now());
      const periodLabel = payoutRun?.periodLabel
        || periodDate.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const now = new Date().toISOString();
      const normalizedMethod = normalizePayoutMethod(method);
      const methodLabel = normalizedMethod === 'promptpay'
        ? 'PromptPay'
        : normalizedMethod === 'other'
          ? 'Manual transfer'
          : 'Bank transfer';
      const updatedItem = {
        ...item,
        status: 'sent',
        method: normalizedMethod,
        externalReference: normalizedReference,
        notes: normalizedNotes,
        paidAt: now,
        paidByUserId: currentUser.id,
      };
      const nextPayoutItems = [...(prev.payoutItems || [])];
      nextPayoutItems[idx] = updatedItem;
      const runHasPendingReady = nextPayoutItems.some((row) => row.runId === item.runId && row.status === 'ready');
      const nextPayoutRuns = (prev.payoutRuns || []).map((run) => (
        run.id !== item.runId
          ? run
          : {
              ...run,
              status: runHasPendingReady ? 'processing' : 'completed',
              completedAt: runHasPendingReady ? (run.completedAt || '') : now,
            }
      ));
      const eventRow = {
        id: `payout_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        payoutItemId: updatedItem.id,
        eventType: 'marked_sent',
        actorUserId: currentUser.id,
        createdAt: now,
        payload: {
          method: normalizedMethod,
          reference: normalizedReference,
          notes: updatedItem.notes,
          amount: updatedItem.netPayable,
        },
      };
      const notificationText = `Payout sent: ${formatPriceTHB(updatedItem.netPayable)} for ${periodLabel}. Ref ${normalizedReference}.`;
      const withNotification = {
        ...prev,
        payoutRuns: nextPayoutRuns,
        payoutItems: nextPayoutItems,
        payoutEvents: [eventRow, ...(prev.payoutEvents || [])],
        notifications: [
          {
            id: `notif_payout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            userId: updatedItem.recipientUserId,
            type: 'engagement',
            text: notificationText,
            read: false,
            createdAt: now,
          },
          ...(prev.notifications || []),
        ],
      };
      const withEmail = appendTemplatedEmail(withNotification, {
        templateKey: 'payout_sent',
        userId: updatedItem.recipientUserId,
        vars: {
          amount: formatPriceTHB(updatedItem.netPayable),
          periodLabel,
          method: methodLabel,
          referenceId: normalizedReference,
          actionPath: '/account',
        },
        fallbackPath: '/account',
      });
      actionResult = { ok: true, message: `Marked payout sent to ${recipient.name || recipient.id}.` };
      return withEmail;
    });
    return actionResult;
  }

  async function markPayoutItemFailed(payoutItemId, reason = '') {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.PAYMENTS_MANAGE)) {
      return { ok: false, error: 'Admin access required.' };
    }
    const normalizedReason = String(reason || '').trim();
    if (normalizedReason.length < 8) {
      return { ok: false, error: 'Add a short failure reason (minimum 8 characters).' };
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      const { ok, payload } = await apiRequestJson(`/api/admin/payout-items/${encodeURIComponent(String(payoutItemId || ''))}/failed`, {
        method: 'POST',
        idempotencyScope: `payout_failed_${String(payoutItemId || '')}_${Date.now()}`,
        body: { reason: normalizedReason },
      });
      if (!ok) {
        return { ok: false, error: String(payload?.error || 'Could not mark payout item as failed.') };
      }
      if (payload?.db) setDb(normalizeDbState(payload.db, appMode));
      return { ok: true, message: String(payload?.message || 'Marked payout failed.') };
    }
    let actionResult = { ok: false, error: 'Could not mark payout item as failed.' };
    setDb((prev) => {
      const idx = (prev.payoutItems || []).findIndex((item) => item.id === payoutItemId);
      if (idx < 0) {
        actionResult = { ok: false, error: 'Payout item not found.' };
        return prev;
      }
      const item = prev.payoutItems[idx];
      if (item?.status === 'sent') {
        actionResult = { ok: false, error: 'Sent payout items cannot be marked failed.' };
        return prev;
      }
      const now = new Date().toISOString();
      const updatedItem = {
        ...item,
        status: 'failed',
        notes: normalizedReason,
      };
      const nextPayoutItems = [...(prev.payoutItems || [])];
      nextPayoutItems[idx] = updatedItem;
      const runHasPendingReady = nextPayoutItems.some((row) => row.runId === item.runId && row.status === 'ready');
      const nextPayoutRuns = (prev.payoutRuns || []).map((run) => (
        run.id !== item.runId
          ? run
          : {
              ...run,
              status: runHasPendingReady ? 'processing' : 'completed',
              completedAt: runHasPendingReady ? (run.completedAt || '') : now,
            }
      ));
      const eventRow = {
        id: `payout_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        payoutItemId: updatedItem.id,
        eventType: 'marked_failed',
        actorUserId: currentUser.id,
        createdAt: now,
        payload: {
          reason: updatedItem.notes,
          amount: updatedItem.netPayable,
        },
      };
      actionResult = { ok: true, message: 'Payout item marked as failed.' };
      return {
        ...prev,
        payoutRuns: nextPayoutRuns,
        payoutItems: nextPayoutItems,
        payoutEvents: [eventRow, ...(prev.payoutEvents || [])],
      };
    });
    return actionResult;
  }

  async function sendTestEmailTemplate(templateKey, templateDraft, scenarioKey = 'default') {
    if (!currentUser || currentUser.role !== 'admin' || !EMAIL_TEMPLATE_KEYS.has(templateKey)) {
      return { ok: false, error: 'Admin access required.' };
    }
    if (backendStatus !== 'connected') {
      return { ok: false, error: 'Backend is offline. Connect API to send test email.' };
    }
    const fallback = getDefaultEmailTemplateByKey(templateKey);
    if (!fallback) {
      return { ok: false, error: 'Template not found.' };
    }
    const mergedTemplate = {
      ...fallback,
      ...(templateDraft || {}),
      enabled: templateDraft?.enabled !== false,
      subject: String(templateDraft?.subject || fallback.subject || ''),
      body: String(templateDraft?.body || fallback.body || ''),
      ctaLabel: String(templateDraft?.ctaLabel || fallback.ctaLabel || ''),
      ctaPath: String(templateDraft?.ctaPath || fallback.ctaPath || '/account'),
    };
    const scenarioVarsByKey = {
      default: {
        senderName: 'Test Sender',
        conversationId: 'buyer-1__nina-b',
        buyerName: 'Alex T.',
        requestId: 'custom_request_test_001',
        requestStatus: 'reviewing',
        amount: formatPriceTHB(500),
        walletBalance: formatPriceTHB(240),
        actionPath: mergedTemplate.ctaPath || '/account',
      },
      buyer_message: {
        senderName: 'Nina B.',
        conversationId: 'buyer-1__nina-b',
        requestId: 'custom_request_test_001',
        requestStatus: 'reviewing',
        amount: formatPriceTHB(500),
        walletBalance: formatPriceTHB(240),
        actionPath: '/account',
      },
      seller_message: {
        senderName: 'Alex T.',
        conversationId: 'buyer-1__nina-b',
        requestId: 'custom_request_test_001',
        requestStatus: 'reviewing',
        amount: formatPriceTHB(500),
        walletBalance: formatPriceTHB(240),
        actionPath: '/account',
      },
      custom_request: {
        senderName: 'Alex T.',
        buyerName: 'Alex T.',
        requestId: 'custom_request_test_447',
        requestStatus: 'open',
        amount: formatPriceTHB(700),
        walletBalance: formatPriceTHB(560),
        actionPath: '/custom-requests',
      },
      custom_request_status: {
        senderName: 'Nina B.',
        buyerName: 'Alex T.',
        requestId: 'custom_request_test_447',
        requestStatus: 'fulfilled',
        amount: formatPriceTHB(700),
        walletBalance: formatPriceTHB(560),
        actionPath: '/custom-requests',
      },
      wallet_top_up: {
        senderName: 'Payment System',
        conversationId: 'buyer-1__nina-b',
        requestId: 'custom_request_test_001',
        requestStatus: 'reviewing',
        amount: formatPriceTHB(1200),
        walletBalance: formatPriceTHB(1580),
        actionPath: '/account',
      },
      wallet_low: {
        senderName: 'Payment System',
        conversationId: 'buyer-1__nina-b',
        requestId: 'custom_request_test_001',
        requestStatus: 'reviewing',
        amount: formatPriceTHB(120),
        walletBalance: formatPriceTHB(220),
        actionPath: '/account',
      },
      order_shipped: {
        senderName: 'Shipping Team',
        orderId: 'order_test_3091',
        trackingCarrier: 'Thailand Post / EMS',
        trackingNumber: 'TH1234567890',
        trackingUrl: 'https://www.17track.net/en/track?nums=TH1234567890',
        actionPath: '/account',
      },
      payout_sent: {
        amount: formatPriceTHB(3400),
        periodLabel: 'March 2026',
        method: 'Bank transfer',
        referenceId: 'PAYOUT-MAR-2026-001',
        actionPath: '/account',
      },
    };
    const scenarioVars = scenarioVarsByKey[scenarioKey] || scenarioVarsByKey.default;
    const vars = {
      recipientName: currentUser.name || 'Admin',
      ...scenarioVars,
      actionUrl: buildAbsoluteActionUrl(scenarioVars.actionPath || mergedTemplate.ctaPath || '/account'),
    };
    const subject = fillEmailTemplate(mergedTemplate.subject, vars);
    const text = fillEmailTemplate(mergedTemplate.body, vars);
    const toEmail = currentUser.email || 'admin@thailandpanties.com';
    const toName = currentUser.name || 'Admin';

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/platform-email`, {
        method: 'POST',
        headers: getApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          toEmail,
          toName,
          subject,
          text,
          templateKey,
          actionUrl: vars.actionUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, error: payload?.error || `Email test failed (${response.status})` };
      }
      const emailMeta = payload?.email || {};
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        emailDeliveryLog: [
          {
            id: `email_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            templateKey,
            userId: currentUser.id,
            toEmail,
            toName,
            subject,
            body: text,
            ctaLabel: mergedTemplate.ctaLabel || 'Open in app',
            actionPath: mergedTemplate.ctaPath || '/account',
            actionUrl: vars.actionUrl,
            testScenario: scenarioKey,
            status: emailMeta.delivered ? 'sent' : (emailMeta.mock ? 'mocked' : 'failed'),
            deliveryMode: emailMeta.mode || null,
            recipients: emailMeta.recipients || [toEmail],
            createdAt: now,
            dispatchedAt: now,
            lastError: emailMeta.delivered ? null : (emailMeta.reason || null),
            isTest: true,
          },
          ...((prev.emailDeliveryLog || []).slice(0, 199)),
        ],
      }));
      return {
        ok: true,
        message: emailMeta.delivered
          ? `Test email delivered to ${toEmail} (${scenarioKey}).`
          : `Test email queued in ${emailMeta.mode || 'mock'} mode (${emailMeta.reason || 'mocked'}) for scenario ${scenarioKey}.`,
      };
    } catch {
      return { ok: false, error: 'Network error while sending test email.' };
    }
  }

  async function runWalletTopUp(amount) {
    if (!currentUser || currentUser.accountStatus !== 'active' || currentUser.role === 'admin') return;
    const normalizedAmount = Number(amount || 0);
    if (!isValidWalletTopUpAmount(normalizedAmount)) {
      setWalletStatus('idle');
      return { ok: false, error: `Top-up amount must be at least ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.` };
    }
    setTopUpAmount(normalizedAmount);
    setWalletStatus('processing');
    if (backendStatus === 'connected' && apiAuthToken) {
      try {
        const { ok, payload } = await apiRequestJson('/api/wallet/create-top-up-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { amountThb: normalizedAmount },
        });
        if (ok && payload?.redirectUrl) {
          try { sessionStorage.setItem('pendingTopUpTxnId', payload.pendingTxnId); } catch {}
          window.location.href = payload.redirectUrl;
          return { ok: true, redirecting: true };
        }
        setWalletStatus('idle');
        return {
          ok: false,
          error: payload?.error || `Top-up failed (${payload?.status || 'unknown'}).`,
        };
      } catch {
        setWalletStatus('idle');
        return { ok: false, error: 'Could not connect to payment service. Please try again.' };
      }
    }
    setWalletStatus('idle');
    return { ok: false, error: 'Payment service is not available. Please try again later.' };
  }

  async function runWalletCheckout() {
    if (!currentUser || currentUser.role !== 'buyer' || currentUser.accountStatus !== 'active') return;
    const shippingCountry = String(checkoutForm.country || '').trim();
    const shippingAddress = String(checkoutForm.address || '').trim();
    const shippingCity = String(checkoutForm.city || '').trim();
    const shippingRegion = String(checkoutForm.region || '').trim();
    const shippingPostalCode = String(checkoutForm.postalCode || '').trim();
    const requiresRegion = ['US', 'CA'].includes(shippingCountry.toUpperCase());
    if (!shippingCountry) {
      setCheckoutError('Enter a destination country to calculate shipping.');
      return;
    }
    if (!shippingAddress) {
      setCheckoutError('Enter a street address for delivery.');
      return;
    }
    if (!shippingCity) {
      setCheckoutError('Enter a city for delivery.');
      return;
    }
    if (requiresRegion && !shippingRegion) {
      setCheckoutError('Enter a state/province for delivery.');
      return;
    }
    if (!shippingPostalCode) {
      setCheckoutError('Enter a ZIP/postal code for delivery.');
      return;
    }
    if (!shippingSupported) {
      setCheckoutError('Shipping is not available for this destination yet.');
      return;
    }
    if (currentWalletBalance < total) {
      const missingAmount = Number((total - currentWalletBalance).toFixed(2));
      const requiredTopUp = getRequiredTopUpAmount(missingAmount);
      setCheckoutError(`Short by ${formatPriceTHB(missingAmount)}. Top up required: ${formatPriceTHB(requiredTopUp)}. Minimum top-up is ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.`);
      return;
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      try {
        const requestItemIds = cartItems.map((item) => item.id);
        const idScope = `checkout_wallet_pay_${currentUser.id}_${requestItemIds.sort().join('_')}_${shippingFee}_${total}`;
        const { ok, payload } = await apiRequestJson('/api/checkout/wallet-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            itemIds: requestItemIds,
            buyerEmail: (buyerEmail || currentUser.email || '').trim(),
            shippingAddress,
            shippingCity,
            shippingRegion,
            shippingCountry,
            shippingPostalCode,
            shippingMethod: checkoutForm.shippingMethod,
            shippingFee,
            saveAddressToProfile: checkoutForm.saveAddressToProfile !== false,
          },
          idempotencyScope: idScope,
          stableIdempotency: true,
        });
        if (ok) {
          const apiOrderId = String(payload?.order?.id || payload?.orderId || '').trim();
          const resolvedOrderId = apiOrderId || `order_${Date.now()}`;
          if (payload?.db) {
            setDb((prev) => ensureOrderPlacedEmailQueued(
              normalizeDbState(payload.db, appMode),
              {
                userId: currentUser.id,
                orderId: resolvedOrderId,
                itemCount: requestItemIds.length,
                shippingFee,
                total,
              }
            ));
          }
          setCheckoutSuccessPopup({
            orderId: resolvedOrderId,
            receiptEmail: (buyerEmail || currentUser.email || '').trim(),
          });
          setCart([]);
          setCheckoutError('');
          navigate('/checkout/success');
          return;
        }
        const requiredTopUp = Number(payload?.requiredTopUp || 0);
        const shortfall = Number(payload?.shortfall || 0);
        if (requiredTopUp > 0 || shortfall > 0) {
          const computedRequiredTopUp = requiredTopUp > 0 ? requiredTopUp : getRequiredTopUpAmount(shortfall);
          setCheckoutError(`Short by ${formatPriceTHB(shortfall)}. Top up required: ${formatPriceTHB(computedRequiredTopUp)}. Minimum top-up is ${formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.`);
          return;
        }
        setCheckoutError(payload?.error || 'Could not complete checkout payment.');
        return;
      } catch {
        setCheckoutError('Could not connect to payment service. Please try again.');
        return;
      }
    }
    const orderId = `order_${Date.now()}`;
    const now = new Date().toISOString();
    const purchasedItemIds = cartItems.map((item) => item.id);
    setDb((prev) => {
      const beforeBalance = Number((prev.users || []).find((user) => user.id === currentUser.id)?.walletBalance || 0);
      const afterBalance = Number((beforeBalance - total).toFixed(2));
      const productsById = Object.fromEntries((prev.products || []).map((product) => [product.id, product]));
      const sellerGrossBySellerId = {};
      purchasedItemIds.forEach((productId) => {
        const product = productsById[productId];
        const sellerId = product?.sellerId;
        const productPrice = Number(product?.price || 0);
        if (!sellerId || !Number.isFinite(productPrice) || productPrice <= 0) return;
        sellerGrossBySellerId[sellerId] = Number(((sellerGrossBySellerId[sellerId] || 0) + productPrice).toFixed(2));
      });

      const sellerPayoutByUserId = {};
      const barPayoutByUserId = {};
      let adminPayoutTotal = 0;
      const payoutSummaryBySeller = [];
      const adminUser = (prev.users || []).find((user) => user.role === 'admin');

      Object.entries(sellerGrossBySellerId).forEach(([sellerId, sellerGross]) => {
        const seller = (prev.sellers || []).find((entry) => entry.id === sellerId);
        const sellerUser = (prev.users || []).find((user) => user.role === 'seller' && user.sellerId === sellerId);
        const affiliatedBarId = String(seller?.affiliatedBarId || '').trim();
        const barUser = affiliatedBarId
          ? (prev.users || []).find((user) => user.role === 'bar' && user.barId === affiliatedBarId)
          : null;
        const hasPayoutBar = Boolean(barUser?.id);

        const sellerPct = hasPayoutBar ? SALE_SPLIT.sellerWithBar : SALE_SPLIT.sellerWithoutBar;
        const barPct = hasPayoutBar ? SALE_SPLIT.bar : 0;
        const sellerAmount = Number((sellerGross * sellerPct).toFixed(2));
        const barAmount = Number((sellerGross * barPct).toFixed(2));
        let adminAmount = Number((sellerGross - sellerAmount - barAmount).toFixed(2));

        if (sellerUser?.id) {
          sellerPayoutByUserId[sellerUser.id] = Number(((sellerPayoutByUserId[sellerUser.id] || 0) + sellerAmount).toFixed(2));
        } else {
          adminAmount = Number((adminAmount + sellerAmount).toFixed(2));
        }
        if (barUser?.id) {
          barPayoutByUserId[barUser.id] = Number(((barPayoutByUserId[barUser.id] || 0) + barAmount).toFixed(2));
        } else {
          adminAmount = Number((adminAmount + barAmount).toFixed(2));
        }
        adminPayoutTotal = Number((adminPayoutTotal + adminAmount).toFixed(2));
        payoutSummaryBySeller.push({
          sellerId,
          sellerName: seller?.name || sellerId,
          gross: sellerGross,
          sellerAmount,
          barAmount,
          adminAmount,
          barId: hasPayoutBar ? affiliatedBarId : null,
        });
      });

      const barShippingReimbursement = Number(getBarShippingReimbursement(checkoutForm.country).toFixed(2));
      let shippingHandlerUserId = null;
      if (barShippingReimbursement > 0) {
        const shippingBarIds = new Set();
        for (const summary of payoutSummaryBySeller) {
          if (summary.barId) shippingBarIds.add(summary.barId);
        }
        if (shippingBarIds.size === 1) {
          const barId = [...shippingBarIds][0];
          const barUser = (prev.users || []).find((u) => u.role === 'bar' && u.barId === barId);
          if (barUser?.id) {
            shippingHandlerUserId = barUser.id;
            barPayoutByUserId[shippingHandlerUserId] = Number(((barPayoutByUserId[shippingHandlerUserId] || 0) + barShippingReimbursement).toFixed(2));
          }
        } else if (shippingBarIds.size === 0 && payoutSummaryBySeller.length > 0) {
          const firstSellerId = payoutSummaryBySeller[0].sellerId;
          const sellerUser = (prev.users || []).find((u) => u.role === 'seller' && u.sellerId === firstSellerId);
          if (sellerUser?.id) {
            shippingHandlerUserId = sellerUser.id;
            sellerPayoutByUserId[shippingHandlerUserId] = Number(((sellerPayoutByUserId[shippingHandlerUserId] || 0) + barShippingReimbursement).toFixed(2));
          }
        }
      }
      const shippingAdminAmount = Number((shippingFee - (shippingHandlerUserId ? barShippingReimbursement : 0)).toFixed(2));
      if (shippingAdminAmount > 0) {
        adminPayoutTotal = Number((adminPayoutTotal + shippingAdminAmount).toFixed(2));
      }

      const shouldSaveCheckoutAddress = checkoutForm.saveAddressToProfile !== false;
      const normalizedCheckoutAddress = String(checkoutForm.address || '').trim();
      const normalizedCheckoutCountry = String(checkoutForm.country || '').trim();
      const normalizedCheckoutCity = String(checkoutForm.city || '').trim();
      const normalizedCheckoutRegion = String(checkoutForm.region || '').trim();
      const normalizedCheckoutPostalCode = String(checkoutForm.postalCode || '').trim();
      const base = {
        ...prev,
        users: prev.users.map((user) =>
          user.id === currentUser.id
            ? {
              ...user,
              walletBalance: afterBalance,
              ...(shouldSaveCheckoutAddress ? {
                address: normalizedCheckoutAddress || user.address || '',
                country: normalizedCheckoutCountry || user.country || '',
                city: normalizedCheckoutCity || user.city || '',
                region: normalizedCheckoutRegion || user.region || '',
                postalCode: normalizedCheckoutPostalCode || user.postalCode || '',
              } : {}),
            }
            : sellerPayoutByUserId[user.id]
              ? { ...user, walletBalance: Number(((user.walletBalance || 0) + sellerPayoutByUserId[user.id]).toFixed(2)) }
              : barPayoutByUserId[user.id]
                ? { ...user, walletBalance: Number(((user.walletBalance || 0) + barPayoutByUserId[user.id]).toFixed(2)) }
                : (adminUser?.id === user.id && adminPayoutTotal > 0)
                  ? { ...user, walletBalance: Number(((user.walletBalance || 0) + adminPayoutTotal).toFixed(2)) }
            : user,
        ),
        products: removeBundlesContainingSoldItems(prev.products, purchasedItemIds).map((product) => (
          purchasedItemIds.includes(product.id)
            ? { ...product, status: 'Sold', soldAt: now }
            : product
        )),
        orders: [
          {
            id: orderId,
            items: purchasedItemIds,
            buyerEmail: (buyerEmail || currentUser.email || '').trim(),
            buyerUserId: currentUser.id,
            shippingAddress: normalizedCheckoutAddress,
            shippingCity: normalizedCheckoutCity,
            shippingRegion: normalizedCheckoutRegion,
            shippingCountry: checkoutForm.country.trim(),
            shippingPostalCode: normalizedCheckoutPostalCode,
            shippingMethod: checkoutForm.shippingMethod,
            shippingFee,
            total,
            stripeSessionId: 'wallet_payment',
            paymentStatus: 'paid',
            fulfillmentStatus: 'processing',
            trackingNumber: '',
            payoutSummary: {
              productSubtotal: Number(subtotal.toFixed(2)),
              shippingFee: Number(shippingFee.toFixed(2)),
              shippingBarReimbursement: shippingHandlerUserId ? barShippingReimbursement : 0,
              shippingAdminAmount,
              sellerTotal: Number(Object.values(sellerPayoutByUserId).reduce((sum, amount) => sum + amount, 0).toFixed(2)),
              barTotal: Number(Object.values(barPayoutByUserId).reduce((sum, amount) => sum + amount, 0).toFixed(2)),
              adminTotal: adminPayoutTotal,
              bySeller: payoutSummaryBySeller,
            },
            createdAt: now,
          },
          ...prev.orders,
        ],
        walletTransactions: [
          ...Object.entries(sellerPayoutByUserId).map(([userId, amount]) => ({
            id: `txn_${Date.now()}_seller_${userId}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            type: 'order_sale_earning',
            amount,
            description: `Seller payout for ${orderId}`,
            createdAt: now,
          })),
          ...Object.entries(barPayoutByUserId).map(([userId, amount]) => ({
            id: `txn_${Date.now()}_bar_${userId}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            type: 'order_bar_commission',
            amount,
            description: `Bar commission for ${orderId}`,
            createdAt: now,
          })),
          ...(adminUser?.id && adminPayoutTotal > 0 ? [{
            id: `txn_${Date.now()}_admin_${adminUser.id}`,
            userId: adminUser.id,
            type: 'order_platform_commission',
            amount: adminPayoutTotal,
            description: `Platform commission for ${orderId}`,
            createdAt: now,
          }] : []),
          {
            id: `txn_${Date.now()}`,
            userId: currentUser.id,
            type: 'order_payment',
            amount: -total,
            description: `Wallet purchase for ${orderId}`,
            createdAt: now,
          },
          ...(prev.walletTransactions || []),
        ],
      };
      const withOrderEmail = ensureOrderPlacedEmailQueued(base, {
        userId: currentUser.id,
        orderId,
        itemCount: purchasedItemIds.length,
        shippingFee,
        total,
      });
      return appendLowBalanceEmailIfNeeded(withOrderEmail, {
        userId: currentUser.id,
        beforeBalance,
        afterBalance,
      });
    });
    setCheckoutSuccessPopup({
      orderId,
      receiptEmail: (buyerEmail || currentUser.email || '').trim(),
    });
    setCart([]);
    setCheckoutError('');
    navigate('/checkout/success');
  }

  async function resendOrderReceipt(orderId) {
    if (!currentUser || currentUser.role !== 'buyer') {
      return { ok: false, error: 'Buyer login is required to resend receipts.' };
    }
    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) {
      return { ok: false, error: 'Order ID is required.' };
    }
    const order = (orders || []).find((entry) => (
      String(entry?.id || '') === normalizedOrderId
      && String(entry?.buyerUserId || entry?.buyerId || '') === String(currentUser.id || '')
    ));
    if (!order) {
      return { ok: false, error: 'Order not found for this account.' };
    }
    setDb((prev) => queueOrderPlacedEmail(prev, {
      userId: currentUser.id,
      orderId: normalizedOrderId,
      itemCount: Array.isArray(order.items) ? order.items.length : 0,
      shippingFee: Number(order.shippingFee || 0),
      total: Number(order.total || 0),
    }));
    return { ok: true };
  }

  function validateVideoFile(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) { reject('Video must be under 10 MB.'); return; }
      const video = document.createElement('video');
      video.preload = 'metadata';
      const objectUrl = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        if (video.duration > 8) { reject('Video must be 8 seconds or shorter.'); return; }
        resolve({ duration: video.duration });
      };
      video.onerror = () => { URL.revokeObjectURL(objectUrl); reject('Could not read that video file.'); };
      video.src = objectUrl;
    });
  }

  async function uploadMediaFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiAuthToken}` },
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
  }

  function handleUploadFile(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const MAX_IMAGES = 5;
    const currentCount = Array.isArray(uploadDraft.images) ? uploadDraft.images.length : 0;
    const allowed = files.slice(0, MAX_IMAGES - currentCount);
    if (!allowed.length) {
      setSellerProfileMessage(`Maximum ${MAX_IMAGES} images/videos per product.`);
      event.target.value = '';
      return;
    }
    allowed.forEach((file) => {
      if (file.type.startsWith('video/')) {
        validateVideoFile(file).then(() => uploadMediaFile(file)).then((result) => {
          const mediaUrl = result.url.startsWith('http') ? result.url : `${API_BASE_URL}${result.url}`;
          setUploadDraft((prev) => {
            const nextImages = [...(prev.images || []), { url: mediaUrl, name: file.name, type: 'video' }].slice(0, MAX_IMAGES);
            return { ...prev, images: nextImages, image: nextImages[0]?.url || '', imageName: nextImages[0]?.name || '' };
          });
        }).catch((err) => setSellerProfileMessage(typeof err === 'string' ? err : 'Video upload failed.'));
        return;
      }
      if (!file.type.startsWith('image/')) { setSellerProfileMessage('Only image and video files are accepted.'); return; }
      if (file.size > MAX_IMAGE_BYTES) { setSellerProfileMessage('Each image must be under 5 MB.'); return; }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
        setUploadDraft((prev) => {
          const nextImages = [...(prev.images || []), { url: dataUrl, name: file.name, type: 'image' }].slice(0, MAX_IMAGES);
          return {
            ...prev,
            images: nextImages,
            image: nextImages[0]?.url || '',
            imageName: nextImages[0]?.name || '',
          };
        });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        setSellerProfileMessage('Could not read that image. Please try a different file.');
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    });
    event.target.value = '';
  }

  function handleSellerPostImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    const MAX_DIMENSION = 1200;
    if (file.type.startsWith('video/')) {
      validateVideoFile(file).then(() => uploadMediaFile(file)).then((result) => {
        const mediaUrl = result.url.startsWith('http') ? result.url : `${API_BASE_URL}${result.url}`;
        setSellerPostDraft((prev) => ({ ...prev, image: mediaUrl, imageName: file.name, mediaType: 'video' }));
      }).catch((err) => setSellerProfileMessage(typeof err === 'string' ? err : 'Video upload failed.'));
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSellerProfileMessage('Image must be under 5 MB. Please choose a smaller file.');
      event.target.value = '';
      return;
    }
    if (!file.type.startsWith('image/')) {
      setSellerProfileMessage('Only image and video files are accepted.');
      event.target.value = '';
      return;
    }
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, img.width, img.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setSellerPostDraft((prev) => ({
        ...prev,
        image: dataUrl,
        imageName: file.name,
        mediaType: 'image',
      }));
      URL.revokeObjectURL(objectUrl);
      const el = document.getElementById('seller-post-image-input');
      if (el) el.value = '';
    };
    img.onerror = () => {
      setSellerProfileMessage('Could not read that image. Please try a different file.');
      URL.revokeObjectURL(objectUrl);
      const el = document.getElementById('seller-post-image-input');
      if (el) el.value = '';
    };
    img.src = objectUrl;
  }

  async function createSellerPost() {
    if (!isSeller) return;
    if (!sellerPostDraft.image) {
      setSellerProfileMessage(sellerStatus('uploadImageBeforePost'));
      return;
    }
    if (creatingSellerPost) return;

    const draftVisibility = sellerPostDraft.visibility === 'private' ? 'private' : 'public';
    if (draftVisibility === 'private' && (!Number.isFinite(Number(sellerPostDraft.accessPriceUsd)) || Number(sellerPostDraft.accessPriceUsd) < MIN_FEED_UNLOCK_PRICE_THB)) {
      setSellerProfileMessage(`Price must be at least ${MIN_FEED_UNLOCK_PRICE_THB} THB for private posts.`);
      return;
    }
    const effectiveVisibility = draftVisibility;
    const basePostPayload = {
      sellerId: currentSellerId,
      caption: sellerPostDraft.caption.trim().slice(0, 500),
      image: sellerPostDraft.image,
      imageName: sellerPostDraft.imageName,
      mediaType: sellerPostDraft.mediaType || 'image',
      visibility: effectiveVisibility,
      accessPriceUsd: Number.isFinite(Number(sellerPostDraft.accessPriceUsd)) && Number(sellerPostDraft.accessPriceUsd) >= MIN_FEED_UNLOCK_PRICE_THB
        ? Number(Number(sellerPostDraft.accessPriceUsd).toFixed(2))
        : MIN_FEED_UNLOCK_PRICE_THB,
    };
    setCreatingSellerPost(true);
    const captionI18n = await buildTextTranslations(basePostPayload.caption);
    const scheduledTimestamp = sellerPostDraft.scheduledFor ? new Date(sellerPostDraft.scheduledFor).getTime() : null;
    const hasScheduledTime = Number.isFinite(scheduledTimestamp) && scheduledTimestamp > Date.now();
    const scheduledForIso = hasScheduledTime ? new Date(scheduledTimestamp).toISOString() : '';
    const apiPostPayload = {
      caption: basePostPayload.caption,
      image: basePostPayload.image,
      imageName: basePostPayload.imageName,
      mediaType: basePostPayload.mediaType,
      visibility: basePostPayload.visibility,
      accessPriceUsd: basePostPayload.accessPriceUsd,
      captionI18n,
      ...(scheduledForIso ? { scheduledFor: scheduledForIso } : {}),
    };

    try {
      let createdPost = {
        id: `post-local-${Date.now()}`,
        ...basePostPayload,
        createdAt: hasScheduledTime ? scheduledForIso : new Date().toISOString(),
        scheduledFor: scheduledForIso,
      };
      let persistedToSeed = false;

      if (backendStatus === 'connected') {
        try {
          console.log('[createSellerPost] Calling POST /api/seller-posts, backendStatus:', backendStatus);
          const response = await fetch(`${API_BASE_URL}/api/seller-posts`, {
            method: 'POST',
            headers: getApiHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(apiPostPayload),
          });
          const payload = await response.json().catch(() => ({}));
          if (response.ok && payload?.post) {
            createdPost = payload.post;
            persistedToSeed = true;
          } else if (response.status === 404 && payload?.error === 'Seller not found.') {
            persistedToSeed = false;
          } else {
            persistedToSeed = false;
          }
        } catch (err) {
          console.warn('[createSellerPost] API sync failed:', err);
          persistedToSeed = false;
        }
      } else {
        console.warn('[createSellerPost] Skipping API call, backendStatus:', backendStatus);
      }

      const normalizedPost = {
        ...createdPost,
        captionI18n,
        visibility: createdPost?.visibility === 'private' ? 'private' : 'public',
        accessPriceUsd: Math.max(MIN_FEED_UNLOCK_PRICE_THB, Number(createdPost?.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB)),
        scheduledFor: createdPost?.scheduledFor || '',
      };
      setDb((prev) => ({
        ...prev,
        sellerPosts: [normalizedPost, ...(prev.sellerPosts || [])],
      }));
      setSellerPostDraft({
        caption: '',
        image: '',
        imageName: '',
        scheduledFor: '',
        visibility: draftVisibility,
        accessPriceUsd: MIN_FEED_UNLOCK_PRICE_THB,
      });
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('tlm-seller-post-drafts');
        let parsed = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          parsed = {};
        }
        if (parsed[currentSellerId]) {
          delete parsed[currentSellerId];
          window.localStorage.setItem('tlm-seller-post-drafts', JSON.stringify(parsed));
        }
      }
      setSellerProfileMessage(
        hasScheduledTime
          ? sellerStatus('postScheduled', { when: formatDateTimeNoSeconds(scheduledForIso) })
          : persistedToSeed
            ? sellerStatus('postPublished')
            : sellerStatus('postSavedLocal')
      );
    } catch (error) {
      const message = localizeSellerApiError(error?.message, 'publishPostFailed');
      setSellerProfileMessage(message);
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setCreatingSellerPost(false);
    }
  }

  function startEditProduct(productId) {
    const product = products.find((p) => p.id === productId && p.sellerId === currentSellerId);
    if (!product) return;
    const productImages = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : product.image ? [{ url: product.image, name: product.imageName }] : [];
    setUploadDraft({
      title: product.title || '',
      sellerId: currentSellerId,
      price: product.price ? String(product.price) : '',
      size: product.size || '',
      color: product.color || '',
      style: product.style || '',
      fabric: product.fabric || '',
      daysWorn: product.daysWorn || '',
      condition: product.condition || '',
      scentLevel: product.scentLevel || '',
      image: productImages[0]?.url || product.image || '',
      imageName: productImages[0]?.name || product.imageName || '',
      images: productImages,
      coverIndex: Math.min(Math.max(0, product.coverIndex || 0), Math.max(0, productImages.length - 1)),
    });
    setEditingProductId(productId);
    setSellerProfileMessage('');
  }

  function cancelEditProduct() {
    setEditingProductId('');
    setUploadDraft({
      title: '',
      sellerId: currentSellerId,
      price: '',
      size: '',
      color: '',
      style: '',
      fabric: '',
      daysWorn: '',
      condition: '',
      scentLevel: '',
      image: '',
      imageName: '',
      images: [],
      coverIndex: 0,
    });
    setSellerProfileMessage('');
  }

  async function createProductFromUpload() {
    if (creatingProduct) return;
    if (!uploadDraft.image) {
      setSellerProfileMessage('Please add at least one image before creating a listing.');
      return;
    }
    if (!uploadDraft.price) {
      setSellerProfileMessage('Please enter a price.');
      return;
    }
    const parsedUploadPrice = Number(uploadDraft.price);
    if (!Number.isFinite(parsedUploadPrice) || parsedUploadPrice < MIN_SELLER_PRICE_THB) {
      setSellerProfileMessage(`Minimum listing price is ${MIN_SELLER_PRICE_THB} THB. Please increase your price.`);
      return;
    }
    setCreatingProduct(true);
    try {
    const sellerName = sellerMap[currentSellerId]?.name || '';
    const autoTitle = [
      sellerName ? `${sellerName}'s` : '',
      uploadDraft.color && uploadDraft.color !== 'Not specified' ? uploadDraft.color : '',
      uploadDraft.fabric && uploadDraft.fabric !== 'Not specified' ? uploadDraft.fabric : '',
      uploadDraft.style && uploadDraft.style !== 'Not specified' ? uploadDraft.style : '',
      uploadDraft.daysWorn && uploadDraft.daysWorn !== 'Unworn' && uploadDraft.daysWorn !== 'Not specified' ? `- ${uploadDraft.daysWorn}` : '',
    ].filter(Boolean).join(' ');
    const finalTitle = uploadDraft.title.trim() || autoTitle || 'Untitled listing';
    const productId = editingProductId || `product-${Date.now()}`;
    const rawSlug = finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = rawSlug || productId;
    const titleI18n = await buildTextTranslations(finalTitle);
    const productImages = Array.isArray(uploadDraft.images) && uploadDraft.images.length > 0
      ? uploadDraft.images
      : [{ url: uploadDraft.image, name: uploadDraft.imageName }];
    const coverIdx = Math.min(uploadDraft.coverIndex || 0, productImages.length - 1);
    const orderedImages = coverIdx > 0
      ? [productImages[coverIdx], ...productImages.slice(0, coverIdx), ...productImages.slice(coverIdx + 1)]
      : productImages;
    const newProduct = {
      id: productId,
      title: finalTitle,
      titleI18n,
      slug,
      sellerId: currentSellerId,
      price: Number(parsedUploadPrice.toFixed(2)),
      size: uploadDraft.size,
      color: uploadDraft.color,
      style: uploadDraft.style,
      fabric: uploadDraft.fabric,
      daysWorn: normalizeProductDaysWornValue(uploadDraft.daysWorn),
      scentLevel: uploadDraft.scentLevel || '',
      shipping: 'Worldwide',
      condition: uploadDraft.condition || '',
      description: [
        uploadDraft.style ? `${uploadDraft.style} listing` : 'Listing',
        uploadDraft.fabric ? `with ${uploadDraft.fabric.toLowerCase()} fabric` : '',
        uploadDraft.scentLevel ? `and ${uploadDraft.scentLevel.toLowerCase()} scent level` : '',
      ].filter(Boolean).join(' ') + '.',
      features: [
        uploadDraft.style ? `${uploadDraft.style} style` : '',
        uploadDraft.fabric ? `${uploadDraft.fabric} fabric` : '',
        uploadDraft.scentLevel ? `${uploadDraft.scentLevel} scent level` : '',
      ].filter(Boolean),
      image: orderedImages[0]?.url || uploadDraft.image,
      imageName: orderedImages[0]?.name || uploadDraft.imageName,
      images: orderedImages,
      isBundle: false,
      bundleItemIds: [],
      status: 'Published',
      publishedAt: new Date().toISOString().slice(0, 10),
    };
    if (editingProductId) {
      setDb((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === editingProductId && p.sellerId === currentSellerId ? { ...p, ...newProduct } : p
        ),
      }));
    } else {
      setDb((prev) => ({ ...prev, products: [newProduct, ...prev.products] }));
    }
    if (backendStatus === 'connected' && apiAuthToken) {
      apiRequestJson(editingProductId ? `/api/products/${editingProductId}` : '/api/products', {
        method: editingProductId ? 'PUT' : 'POST',
        body: {
          id: newProduct.id,
          title: newProduct.title,
          description: newProduct.description,
          priceTHB: newProduct.price,
          image: newProduct.image,
          imageName: newProduct.imageName,
          images: newProduct.images,
          category: newProduct.style || 'panties',
          status: newProduct.status,
          wearDays: newProduct.daysWorn,
          extras: newProduct.features || [],
        },
        idempotencyScope: editingProductId ? `update_product_${editingProductId}` : 'create_product',
      }).catch((err) => console.warn('[createProductFromUpload] API sync failed:', err));
    }
    const wasEditing = !!editingProductId;
    setEditingProductId('');
    setUploadDraft({
      title: '',
      sellerId: currentSellerId,
      price: '',
      size: '',
      color: '',
      style: '',
      fabric: '',
      daysWorn: '',
      condition: '',
      scentLevel: '',
      image: '',
      imageName: '',
      images: [],
      coverIndex: 0,
    });
    setSellerProfileMessage(wasEditing ? 'Listing updated!' : 'Listing created!');
    } catch (err) {
      console.error('[createProductFromUpload] error:', err);
      setSellerProfileMessage('Something went wrong. Please try again.');
    } finally {
      setCreatingProduct(false);
    }
  }

  async function updateGiftCatalogItem(giftId, patch) {
    try {
      const res = await api.patch(`/gifts/catalog/${giftId}`, patch);
      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          setDb(prev => {
            const catalog = (prev.giftCatalog || []).map(g => g.id === giftId ? { ...g, ...data.item } : g);
            return { ...prev, giftCatalog: catalog };
          });
        }
      }
    } catch (e) {
      console.error("updateGiftCatalogItem error:", e);
    }
  }

  async function purchaseGift() {
    if (giftModal.sending) return;
    const gift = GIFT_CATALOG.find((g) => g.type === giftModal.giftType);
    if (!gift) return;
    const balance = Number(currentUser?.walletBalance || 0);
    if (balance < gift.price) {
      setGiftModal((prev) => ({ ...prev, error: `Insufficient balance. You need ${formatPriceTHB(gift.price)} but have ${formatPriceTHB(balance)}.` }));
      return;
    }
    setGiftModal((prev) => ({ ...prev, sending: true, error: '' }));
    try {
      if (backendStatus === 'connected' && apiAuthToken) {
        const { ok, payload } = await apiRequestJson('/api/gifts/purchase', {
          method: 'POST',
          body: {
            sellerId: giftModal.sellerId,
            giftType: giftModal.giftType,
            message: giftModal.message,
            isAnonymous: giftModal.isAnonymous,
          },
          idempotencyScope: 'gift_purchase',
        });
        if (ok && payload?.ok) {
          setDb((prev) => ({
            ...prev,
            users: (prev.users || []).map((u) =>
              u.id === currentUser.id ? { ...u, walletBalance: Number(((Number(u.walletBalance || 0) - gift.price)).toFixed(2)) } : u
            ),
            giftPurchases: [payload.purchase, ...(prev.giftPurchases || [])],
            giftFulfillmentTasks: [payload.fulfillmentTask, ...(prev.giftFulfillmentTasks || [])],
          }));
          setGiftModal((prev) => ({ ...prev, sending: false, success: `${gift.name} sent!`, error: '' }));
          setTimeout(() => setGiftModal({ open: false, sellerId: '', giftType: '', message: '', isAnonymous: false, sending: false, error: '', success: '' }), 2000);
          return;
        }
        setGiftModal((prev) => ({ ...prev, sending: false, error: String(payload?.error || 'Gift purchase failed.') }));
        return;
      }
      setDb((prev) => {
        const now = new Date().toISOString();
        const purchaseId = `gift_purchase_${Date.now()}`;
        return {
          ...prev,
          users: (prev.users || []).map((u) =>
            u.id === currentUser.id ? { ...u, walletBalance: Number(((Number(u.walletBalance || 0) - gift.price)).toFixed(2)) } : u
          ),
          walletTransactions: [
            { id: `wtxn_${Date.now()}_gift`, userId: currentUser.id, amount: -gift.price, type: 'gift_purchase', description: `Purchased ${gift.name}`, relatedId: purchaseId, createdAt: now },
            ...(prev.walletTransactions || []),
          ],
          giftPurchases: [
            { id: purchaseId, buyerId: currentUser.id, sellerId: giftModal.sellerId, giftType: gift.type, catalogId: gift.id, price: gift.price, message: giftModal.message, isAnonymous: giftModal.isAnonymous, status: 'pending', createdAt: now },
            ...(prev.giftPurchases || []),
          ],
        };
      });
      setGiftModal((prev) => ({ ...prev, sending: false, success: `${gift.name} sent!`, error: '' }));
      setTimeout(() => setGiftModal({ open: false, sellerId: '', giftType: '', message: '', isAnonymous: false, sending: false, error: '', success: '' }), 2000);
    } catch (err) {
      setGiftModal((prev) => ({ ...prev, sending: false, error: 'Something went wrong. Please try again.' }));
    }
  }

  function upsertBundleProduct(bundleDraft, onSuccess, onError) {
    if (!currentUser || currentUser.role !== 'seller' || !currentSellerId) return;
    const customTitle = String(bundleDraft?.title || '').trim();
    const customDescription = String(bundleDraft?.description || '').trim();
    const price = Number(bundleDraft?.price || 0);
    const selectedProductIds = Array.isArray(bundleDraft?.selectedProductIds)
      ? [...new Set(bundleDraft.selectedProductIds.filter(Boolean))]
      : [];
    const bundleId = String(bundleDraft?.bundleId || '').trim();
    if (!Number.isFinite(price) || price < MIN_SELLER_PRICE_THB) {
      onError?.(`Set price must be at least ${formatPriceTHB(MIN_SELLER_PRICE_THB)}.`);
      return;
    }
    if (selectedProductIds.length < 2) {
      onError?.('Select at least 2 products to create a set.');
      return;
    }
    const selectableProducts = products.filter((product) =>
      product.sellerId === currentSellerId &&
      !product.isBundle &&
      selectedProductIds.includes(product.id)
    );
    if (selectableProducts.length !== selectedProductIds.length) {
      onError?.('Some selected items are not available for bundling.');
      return;
    }
    const sName = String(bundleDraft?.sellerName || sellerMap[currentSellerId]?.name || '').trim();
    const autoTitle = sName
      ? `${sName}'s ${selectedProductIds.length}-Piece Set`
      : `${selectedProductIds.length}-Piece Set`;
    const title = customTitle || autoTitle;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const firstProduct = selectableProducts[0];
    const autoDescription = `Set including ${selectableProducts.map((item) => item.title).join(', ')}. Sold together at a combined price.`;
    const normalizedBundle = {
      id: bundleId || `product-set-${Date.now()}`,
      title,
      slug: slug || `set-${Date.now()}`,
      sellerId: currentSellerId,
      price: Number(price.toFixed(2)),
      size: firstProduct?.size || 'M',
      color: firstProduct?.color || 'Mixed',
      style: 'Custom Set',
      fabric: firstProduct?.fabric || 'Cotton',
      daysWorn: normalizeProductDaysWornValue(firstProduct?.daysWorn || DAYS_WORN_OPTIONS[0]),
      scentLevel: firstProduct?.scentLevel || SCENT_LEVEL_OPTIONS[0],
      shipping: 'Worldwide',
      condition: firstProduct?.condition || CONDITION_OPTIONS[0],
      description: customDescription || autoDescription,
      features: [
        `Includes ${selectedProductIds.length} items`,
        ...selectableProducts.slice(0, 3).map((item) => item.title),
      ],
      image: firstProduct?.image || '',
      imageName: firstProduct?.imageName || '',
      isBundle: true,
      bundleItemIds: selectedProductIds,
      status: 'Published',
      publishedAt: new Date().toISOString().slice(0, 10),
    };
    setDb((prev) => {
      const exists = prev.products.some((product) => product.id === normalizedBundle.id && product.sellerId === currentSellerId);
      return {
        ...prev,
        products: exists
          ? prev.products.map((product) =>
              product.id === normalizedBundle.id && product.sellerId === currentSellerId
                ? { ...product, ...normalizedBundle, status: product.status || normalizedBundle.status }
                : product
            )
          : [normalizedBundle, ...prev.products],
      };
    });
    onSuccess?.(bundleId ? 'Set updated successfully.' : 'Set created successfully.');
  }

  function publishProduct(productId) {
    const targetProduct = products.find((product) => product.id === productId);
    if (!targetProduct) return;
    if (soldProductIdSet.has(String(productId)) || String(targetProduct?.status || '').toLowerCase() === 'sold') {
      setDb((prev) => ({
        ...prev,
        products: prev.products.map((product) => (
          product.id === productId ? { ...product, status: 'Sold' } : product
        )),
      }));
      setSellerProfileMessage('This listing is sold and cannot be republished. Create a new product listing to sell again.');
      return;
    }
    const isPublished = String(targetProduct?.status || '').toLowerCase() === 'published';
    if (isPublished) {
      setDb((prev) => ({
        ...prev,
        products: prev.products.map((product) => (product.id === productId ? { ...product, status: 'Draft' } : product)),
      }));
      setSellerProfileMessage('Listing moved back to draft.');
      return;
    }
    if (sellerProfileChecklist.length > 0) {
      setSellerProfileMessage(sellerStatus('completeOnboarding', { items: sellerProfileChecklist.join(', ') }));
      return;
    }
    setDb((prev) => ({
      ...prev,
      products: prev.products.map((product) => (product.id === productId ? { ...product, status: 'Published' } : product)),
    }));
      setSellerProfileMessage(sellerStatus('listingPublished'));
  }

  async function deleteProduct(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.sellerId !== currentSellerId) return;
    if (deletingProductId === productId) return;

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(sellerStatus('deleteProductConfirm', { title: product.title }));
      if (!confirmed) return;
    }

    try {
      setDeletingProductId(productId);
      let deletedOnBackend = false;
      let deletedProductId = productId;
      let deletedProductTitle = (product.title || '').trim().toLowerCase();

      if (backendStatus === 'connected') {
        try {
          const response = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
            method: 'DELETE',
            headers: getApiHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ productTitle: product.title }),
          });
          const payload = await response.json().catch(() => ({}));
          if (response.ok) {
            deletedOnBackend = true;
            deletedProductId = payload?.deletedProductId || productId;
            deletedProductTitle = (payload?.deletedProductTitle || product.title || '').trim().toLowerCase();
          } else if (response.status !== 404) {
            throw new Error(localizeSellerApiError(payload?.error, 'deleteProductFailed'));
          }
        } catch (error) {
          throw error;
        }
      }

      setDb((prev) => ({
        ...prev,
        products: prev.products.filter((item) => {
          if (item.id === deletedProductId) return false;
          return true;
        }),
      }));
      setCart((prev) => prev.filter((id) => id !== deletedProductId));
      setSellerProfileMessage(
        deletedOnBackend
          ? sellerStatus('productDeleted')
          : sellerStatus('productDeletedLocal')
      );
    } catch (error) {
      const message = localizeSellerApiError(error?.message, 'deleteProductFailed');
      setSellerProfileMessage(message);
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setDeletingProductId(null);
    }
  }

  async function deleteSellerPost(postId) {
    const existingPost = sellerPosts.find((post) => post.id === postId);
    if (!existingPost) return;
    const isOwner = existingPost.sellerId === currentSellerId;
    const canDelete = currentUser?.role === 'admin' || isOwner;
    if (!canDelete || deletingSellerPostId === postId) return;

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(sellerStatus('deletePostConfirm'));
      if (!confirmed) return;
    }

    try {
      setDeletingSellerPostId(postId);
      let deletedOnBackend = false;

      if (backendStatus === 'connected' && !postId.startsWith('post-local-')) {
        const response = await fetch(`${API_BASE_URL}/api/seller-posts/${postId}`, {
          method: 'DELETE',
          headers: getApiHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({}),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          deletedOnBackend = true;
          if (payload.softDeleted) {
            setDb((prev) => ({
              ...prev,
              sellerPosts: (prev.sellerPosts || []).map((post) =>
                post.id === postId ? { ...post, deletedAt: new Date().toISOString() } : post
              ),
              adminActions: currentUser?.role === 'admin'
                ? [
                    ...(prev.adminActions || []),
                    { id: `admin_action_${Date.now()}`, type: 'delete_seller_post', targetPostId: postId, adminUserId: currentUser.id, createdAt: new Date().toISOString() },
                  ]
                : prev.adminActions,
            }));
            setSellerProfileMessage(sellerStatus('postDeleted'));
            return;
          }
        } else if (response.status !== 404) {
          throw new Error(localizeSellerApiError(payload?.error, 'deleteSellerPostFailed'));
        }
      }

      setDb((prev) => ({
        ...prev,
        sellerPosts: (prev.sellerPosts || []).filter((post) => post.id !== postId),
        adminActions: currentUser?.role === 'admin'
          ? [
              ...(prev.adminActions || []),
              {
                id: `admin_action_${Date.now()}`,
                type: 'delete_seller_post',
                targetPostId: postId,
                adminUserId: currentUser.id,
                createdAt: new Date().toISOString(),
              },
            ]
          : prev.adminActions,
      }));
      setSellerProfileMessage(
        deletedOnBackend
          ? sellerStatus('postDeleted')
          : sellerStatus('postDeletedLocal')
      );
    } catch (error) {
      const message = localizeSellerApiError(error?.message, 'deleteSellerPostFailed');
      setSellerProfileMessage(message);
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setDeletingSellerPostId(null);
    }
  }

  async function reportSellerPost(postId, providedReason) {
    if (!currentUser) {
      setSellerProfileMessage(sellerStatus('loginToReport'));
      return;
    }
    if (currentUser.accountStatus !== 'active') {
      setSellerProfileMessage(sellerStatus('accountActiveToReport'));
      return;
    }
    if (reportingSellerPostId === postId) return;

    const existingOpenReport = postReports.find(
      (report) => report.postId === postId && report.reporterUserId === currentUser.id && report.status !== 'resolved'
    );
    if (existingOpenReport) {
      setSellerProfileMessage(sellerStatus('alreadyReported'));
      return;
    }

    const trimmedReason = String(providedReason || '').trim();
    if (!trimmedReason) return;
    const targetPost = sellerPosts.find((post) => post.id === postId);
    const targetUserId = (users.find((entry) => entry.sellerId === targetPost?.sellerId) || {}).id || null;

    try {
      setReportingSellerPostId(postId);
      let createdReport = {
        id: `post_report_local_${Date.now()}`,
        postId,
        targetUserId,
        contentType: 'post',
        contentId: postId,
        reporterUserId: currentUser.id,
        reporterRole: currentUser.role,
        reason: trimmedReason.slice(0, 500),
        status: 'open',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedByUserId: null,
      };

      if (backendStatus === 'connected') {
        const response = await fetch(`${API_BASE_URL}/api/seller-posts/${postId}/report`, {
          method: 'POST',
          headers: getApiHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ reason: trimmedReason }),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.report) {
          createdReport = payload.report;
        } else if (response.status === 409) {
          setSellerProfileMessage(localizeSellerApiError(payload?.error, 'alreadyReported'));
          return;
        } else {
          throw new Error(localizeSellerApiError(payload?.error, 'submitReportFailed'));
        }
      }

      setDb((prev) => ({
        ...prev,
        postReports: [createdReport, ...(prev.postReports || [])],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'report_seller_post',
            targetPostId: postId,
            targetUserId,
            reporterUserId: currentUser.id,
            reporterRole: currentUser.role,
            reason: trimmedReason.slice(0, 500),
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      setSellerProfileMessage(sellerStatus('postReported'));
    } catch (error) {
      const message = localizeSellerApiError(error?.message, 'submitReportFailed');
      setSellerProfileMessage(message);
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setReportingSellerPostId(null);
    }
  }

  function reportSellerPostComment(commentId, providedReason) {
    if (!currentUser) {
      setSellerProfileMessage(loginText.loginToReportComments || 'Please login to report comments.');
      return;
    }
    if (currentUser.accountStatus !== 'active') {
      setSellerProfileMessage(sellerStatus('accountActiveToReport'));
      return;
    }
    if (reportingSellerPostCommentId === commentId) return;
    const targetComment = sellerPostComments.find((entry) => entry.id === commentId);
    if (!targetComment) return;
    if (targetComment.senderUserId === currentUser.id) {
      setSellerProfileMessage(sellerStatus('cannotReportOwnComment'));
      return;
    }
    const existingOpenReport = commentReports.find(
      (report) => report.commentId === commentId && report.reporterUserId === currentUser.id && report.status !== 'resolved'
    );
    if (existingOpenReport) {
      setSellerProfileMessage(sellerStatus('alreadyReportedComment'));
      return;
    }
    const trimmedReason = String(providedReason || '').trim();
    if (!trimmedReason) return;

    setReportingSellerPostCommentId(commentId);
    try {
      const createdAt = new Date().toISOString();
      const report = {
        id: `comment_report_local_${Date.now()}`,
        commentId,
        postId: targetComment.postId,
        targetUserId: targetComment.senderUserId,
        contentType: 'comment',
        contentId: commentId,
        reporterUserId: currentUser.id,
        reporterRole: currentUser.role,
        reason: trimmedReason.slice(0, 500),
        status: 'open',
        createdAt,
        resolvedAt: null,
        resolvedByUserId: null,
      };
      setDb((prev) => ({
        ...prev,
        commentReports: [report, ...(prev.commentReports || [])],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'report_seller_comment',
            targetCommentId: commentId,
            targetPostId: targetComment.postId,
            targetUserId: targetComment.senderUserId,
            reporterUserId: currentUser.id,
            reporterRole: currentUser.role,
            reason: trimmedReason.slice(0, 500),
            createdAt,
          },
        ],
      }));
      setSellerProfileMessage(sellerStatus('commentReported'));
    } finally {
      setReportingSellerPostCommentId(null);
    }
  }

  async function reportDirectMessage(messageId, reasonCategory, providedReasonText = '') {
    if (!currentUser) {
      setSellerProfileMessage(loginText.loginToReportMessages || 'Please login to report messages.');
      return false;
    }
    if (currentUser.accountStatus !== 'active') {
      setSellerProfileMessage(sellerStatus('accountActiveToReport'));
      return false;
    }
    if (currentUser.role !== 'buyer') {
      setSellerProfileMessage(sellerStatus('onlyBuyersReportDirectMessages'));
      return false;
    }
    if (reportingDirectMessageId === messageId) return false;
    const message = messages.find((entry) => entry.id === messageId);
    if (!message) return false;
    if (String(message.senderRole || '').toLowerCase() !== 'seller') {
      setSellerProfileMessage(sellerStatus('onlySellerMessagesReportable'));
      return false;
    }
    if ((message.senderId || message.senderUserId) === currentUser.id) {
      setSellerProfileMessage(sellerStatus('cannotReportOwnMessage'));
      return false;
    }
    const existingOpenReport = messageReports.find(
      (report) => report.messageId === messageId && report.reporterUserId === currentUser.id && report.status !== 'resolved' && report.status !== 'dismissed'
    );
    if (existingOpenReport) {
      setSellerProfileMessage(sellerStatus('alreadyReportedMessage'));
      return false;
    }

    const normalizedReasonCategory = [
      'direct_payment_request',
      'off_platform_contact',
      'harassment_abuse',
      'scam_fraud',
      'other',
    ].includes(String(reasonCategory || '').trim())
      ? String(reasonCategory || '').trim()
      : 'other';
    const trimmedReasonText = String(providedReasonText || '').trim();
    if (!trimmedReasonText) return false;
    const targetSellerUser = users.find(
      (entry) => entry.role === 'seller' && entry.sellerId === message.sellerId
    );
    const targetUserId = targetSellerUser?.id || message.senderId || message.senderUserId || null;
    const now = new Date().toISOString();
    const priority = ['direct_payment_request', 'off_platform_contact'].includes(normalizedReasonCategory)
      ? 'high'
      : 'medium';

    setReportingDirectMessageId(messageId);
    try {
      setDb((prev) => ({
        ...prev,
        messageReports: [
          {
            id: `message_report_local_${Date.now()}`,
            messageId,
            conversationId: message.conversationId || null,
            targetUserId,
            targetSellerId: message.sellerId || null,
            contentType: 'direct_message',
            contentId: messageId,
            reporterUserId: currentUser.id,
            reporterRole: currentUser.role,
            reasonCategory: normalizedReasonCategory,
            reason: trimmedReasonText.slice(0, 500),
            priority,
            status: 'open',
            createdAt: now,
            resolvedAt: null,
            resolvedByUserId: null,
          },
          ...(prev.messageReports || []),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'report_direct_message',
            targetMessageId: messageId,
            conversationId: message.conversationId || null,
            targetUserId,
            reporterUserId: currentUser.id,
            reporterRole: currentUser.role,
            reasonCategory: normalizedReasonCategory,
            reason: trimmedReasonText.slice(0, 500),
            createdAt: now,
          },
        ],
      }));
      setSellerProfileMessage(sellerStatus('messageReported'));
      return true;
    } finally {
      setReportingDirectMessageId(null);
    }
  }

  async function reportBarConversationMessage(messageId, reasonCategory, providedReasonText = '') {
    if (!currentUser) return false;
    if (currentUser.accountStatus !== 'active') return false;
    if (reportingDirectMessageId === messageId) return false;
    const message = messages.find((entry) => entry.id === messageId);
    if (!message) return false;
    const parsedConversation = parseBarConversationId(message.conversationId);
    if (!parsedConversation) return false;
    if ((message.senderId || message.senderUserId) === currentUser.id) return false;
    if (String(message.senderRole || '').toLowerCase() !== 'bar') return false;
    const existingOpenReport = messageReports.find(
      (report) => report.messageId === messageId && report.reporterUserId === currentUser.id && report.status !== 'resolved' && report.status !== 'dismissed'
    );
    if (existingOpenReport) return false;
    const normalizedReasonCategory = [
      'direct_payment_request',
      'off_platform_contact',
      'harassment_abuse',
      'scam_fraud',
      'other',
    ].includes(String(reasonCategory || '').trim())
      ? String(reasonCategory || '').trim()
      : 'other';
    const trimmedReasonText = String(providedReasonText || '').trim();
    if (!trimmedReasonText) return false;
    const targetBarUser = users.find(
      (entry) => entry.role === 'bar' && String(entry.barId || '').trim() === parsedConversation.barId
    );
    const targetUserId = targetBarUser?.id || message.senderId || message.senderUserId || null;
    const now = new Date().toISOString();
    const priority = ['direct_payment_request', 'off_platform_contact'].includes(normalizedReasonCategory)
      ? 'high'
      : 'medium';
    setReportingDirectMessageId(messageId);
    try {
      setDb((prev) => ({
        ...prev,
        messageReports: [
          {
            id: `message_report_local_${Date.now()}`,
            messageId,
            conversationId: message.conversationId || null,
            targetUserId,
            targetSellerId: null,
            targetBarId: parsedConversation.barId,
            contentType: 'direct_message',
            contentId: messageId,
            reporterUserId: currentUser.id,
            reporterRole: currentUser.role,
            reasonCategory: normalizedReasonCategory,
            reason: trimmedReasonText.slice(0, 500),
            priority,
            status: 'open',
            createdAt: now,
            resolvedAt: null,
            resolvedByUserId: null,
          },
          ...(prev.messageReports || []),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'report_direct_message',
            targetMessageId: messageId,
            conversationId: message.conversationId || null,
            targetUserId,
            targetBarId: parsedConversation.barId,
            reporterUserId: currentUser.id,
            reporterRole: currentUser.role,
            reasonCategory: normalizedReasonCategory,
            reason: trimmedReasonText.slice(0, 500),
            createdAt: now,
          },
        ],
      }));
      return true;
    } finally {
      setReportingDirectMessageId(null);
    }
  }

  async function resolvePostReport(reportId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (resolvingPostReportId === reportId) return;
    const targetReport = postReports.find((report) => report.id === reportId);
    if (!targetReport || targetReport.status === 'resolved') return;

    try {
      setResolvingPostReportId(reportId);
      let resolvedOnBackend = false;

      if (backendStatus === 'connected' && !reportId.startsWith('post_report_local_')) {
        const response = await fetch(`${API_BASE_URL}/api/seller-post-reports/${reportId}/resolve`, {
          method: 'POST',
          headers: getApiHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({}),
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          resolvedOnBackend = true;
        } else if (response.status !== 404) {
          throw new Error(localizeSellerApiError(payload?.error, 'resolveReportFailed'));
        }
      }

      const resolvedAt = new Date().toISOString();
      setDb((prev) => {
        const report = (prev.postReports || []).find((entry) => entry.id === reportId);
        if (!report || report.status === 'resolved') return prev;
        const resolvedBase = {
          ...prev,
          postReports: (prev.postReports || []).map((entry) => (
            entry.id === reportId
              ? { ...entry, status: 'resolved', resolvedAt, resolvedByUserId: currentUser.id }
              : entry
          )),
          adminActions: [
            ...(prev.adminActions || []),
            {
              id: `admin_action_${Date.now()}`,
              type: 'resolve_post_report',
              targetReportId: reportId,
              targetUserId: report.targetUserId || null,
              adminUserId: currentUser.id,
              createdAt: resolvedAt,
            },
          ],
        };
        return report.targetUserId
          ? applyStrikeAndAutoFreeze(resolvedBase, {
              targetUserId: report.targetUserId,
              reason: report.reason,
              sourceType: 'post',
              sourceId: report.postId,
              reportId,
              adminUserId: currentUser.id,
            })
          : resolvedBase;
      });
      setSellerProfileMessage(
        resolvedOnBackend
          ? sellerStatus('reportResolved')
          : sellerStatus('reportResolvedLocal')
      );
    } catch (error) {
      const message = localizeSellerApiError(error?.message, 'resolveReportFailed');
      setSellerProfileMessage(message);
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } finally {
      setResolvingPostReportId(null);
    }
  }

  async function resolveAllPostReports() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const openReports = postReports.filter((report) => report.status !== 'resolved');
    if (openReports.length === 0 || resolvingAllPostReports) return;
    if (typeof window !== 'undefined' && !window.confirm(sellerStatus('resolveAllReportsConfirm', { count: openReports.length }))) return;

    try {
      setResolvingAllPostReports(true);
      for (const report of openReports) {
        // eslint-disable-next-line no-await-in-loop
        await resolvePostReport(report.id);
      }
    } finally {
      setResolvingAllPostReports(false);
    }
  }

  function resolveCommentReport(reportId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (resolvingCommentReportId === reportId) return;
    const report = commentReports.find((entry) => entry.id === reportId);
    if (!report || report.status === 'resolved') return;
    setResolvingCommentReportId(reportId);
    try {
      const resolvedAt = new Date().toISOString();
      setDb((prev) => {
        const liveReport = (prev.commentReports || []).find((entry) => entry.id === reportId);
        if (!liveReport || liveReport.status === 'resolved') return prev;
        const resolvedBase = {
          ...prev,
          commentReports: (prev.commentReports || []).map((entry) => (
            entry.id === reportId
              ? { ...entry, status: 'resolved', resolvedAt, resolvedByUserId: currentUser.id }
              : entry
          )),
          adminActions: [
            ...(prev.adminActions || []),
            {
              id: `admin_action_${Date.now()}`,
              type: 'resolve_comment_report',
              targetReportId: reportId,
              targetCommentId: liveReport.commentId,
              targetUserId: liveReport.targetUserId || null,
              adminUserId: currentUser.id,
              createdAt: resolvedAt,
            },
          ],
        };
        return liveReport.targetUserId
          ? applyStrikeAndAutoFreeze(resolvedBase, {
              targetUserId: liveReport.targetUserId,
              reason: liveReport.reason,
              sourceType: 'comment',
              sourceId: liveReport.commentId,
              reportId,
              adminUserId: currentUser.id,
            })
          : resolvedBase;
      });
      setSellerProfileMessage(sellerStatus('commentReportResolved'));
    } finally {
      setResolvingCommentReportId(null);
    }
  }

  async function resolveAllCommentReports() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const openReports = commentReports.filter((report) => report.status !== 'resolved');
    if (openReports.length === 0 || resolvingAllCommentReports) return;
    if (typeof window !== 'undefined' && !window.confirm(`Resolve all ${openReports.length} open comment reports?`)) return;
    try {
      setResolvingAllCommentReports(true);
      for (const report of openReports) {
        // eslint-disable-next-line no-await-in-loop
        await resolveCommentReport(report.id);
      }
    } finally {
      setResolvingAllCommentReports(false);
    }
  }

  function resolveMessageReport(reportId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (resolvingMessageReportId === reportId) return;
    const report = messageReports.find((entry) => entry.id === reportId);
    if (!report || report.status === 'resolved') return;
    setResolvingMessageReportId(reportId);
    try {
      const resolvedAt = new Date().toISOString();
      setDb((prev) => {
        const liveReport = (prev.messageReports || []).find((entry) => entry.id === reportId);
        if (!liveReport || liveReport.status === 'resolved') return prev;
        const resolvedBase = {
          ...prev,
          messageReports: (prev.messageReports || []).map((entry) => (
            entry.id === reportId
              ? { ...entry, status: 'resolved', resolvedAt, resolvedByUserId: currentUser.id }
              : entry
          )),
          adminActions: [
            ...(prev.adminActions || []),
            {
              id: `admin_action_${Date.now()}`,
              type: 'resolve_message_report',
              targetReportId: reportId,
              targetMessageId: liveReport.messageId,
              conversationId: liveReport.conversationId || null,
              targetUserId: liveReport.targetUserId || null,
              adminUserId: currentUser.id,
              createdAt: resolvedAt,
            },
          ],
        };
        return liveReport.targetUserId
          ? applyStrikeAndAutoFreeze(resolvedBase, {
              targetUserId: liveReport.targetUserId,
              reason: liveReport.reason,
              sourceType: 'direct_message',
              sourceId: liveReport.messageId,
              reportId,
              adminUserId: currentUser.id,
            })
          : resolvedBase;
      });
      setSellerProfileMessage(sellerStatus('messageReportResolved'));
    } finally {
      setResolvingMessageReportId(null);
    }
  }

  function dismissMessageReport(reportId) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (dismissingMessageReportId === reportId) return;
    const report = messageReports.find((entry) => entry.id === reportId);
    if (!report || ['resolved', 'dismissed'].includes(report.status)) return;
    setDismissingMessageReportId(reportId);
    try {
      const dismissedAt = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        messageReports: (prev.messageReports || []).map((entry) => (
          entry.id === reportId
            ? { ...entry, status: 'dismissed', resolvedAt: dismissedAt, resolvedByUserId: currentUser.id }
            : entry
        )),
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'dismiss_message_report',
            targetReportId: reportId,
            targetMessageId: report.messageId,
            conversationId: report.conversationId || null,
            targetUserId: report.targetUserId || null,
            adminUserId: currentUser.id,
            createdAt: dismissedAt,
          },
        ],
      }));
      setSellerProfileMessage(sellerStatus('messageReportDismissed'));
    } finally {
      setDismissingMessageReportId(null);
    }
  }

  async function resolveAllMessageReports() {
    if (!currentUser || currentUser.role !== 'admin') return;
    const openReports = messageReports.filter((report) => report.status === 'open');
    if (openReports.length === 0 || resolvingAllMessageReports) return;
    if (typeof window !== 'undefined' && !window.confirm(`Resolve all ${openReports.length} open direct message reports?`)) return;
    try {
      setResolvingAllMessageReports(true);
      for (const report of openReports) {
        // eslint-disable-next-line no-await-in-loop
        await resolveMessageReport(report.id);
      }
    } finally {
      setResolvingAllMessageReports(false);
    }
  }

  function submitStrikeAppeal(message) {
    if (!currentUser) return false;
    const trimmed = String(message || '').trim();
    if (!trimmed) return false;
    if (submittingStrikeAppeal) return false;
    const activeStrikeCount = (userStrikes || []).filter((strike) => strike.userId === currentUser.id && strike.status === 'active').length;
    const canAppeal = currentUser.accountStatus === 'frozen' || activeStrikeCount > 0;
    if (!canAppeal) {
      setSellerProfileMessage(sellerStatus('appealsOnlyEligible'));
      return false;
    }
    setSubmittingStrikeAppeal(true);
    try {
      const now = new Date().toISOString();
      setDb((prev) => ({
        ...prev,
        userAppeals: [
          {
            id: `appeal_${Date.now()}`,
            userId: currentUser.id,
            userRole: currentUser.role || '',
            sellerId: currentUser.sellerId || '',
            barId: currentUser.barId || '',
            status: 'pending',
            message: trimmed.slice(0, 1000),
            strikeIds: (prev.userStrikes || []).filter((strike) => strike.userId === currentUser.id && strike.status === 'active').map((strike) => strike.id),
            createdAt: now,
            reviewedAt: null,
            reviewedByUserId: null,
            adminDecisionNote: '',
          },
          ...(prev.userAppeals || []),
        ],
        notifications: [
          ...(prev.notifications || []),
          {
            id: `notif_${Date.now()}_appeal`,
            userId: currentUser.id,
            type: 'engagement',
            text: 'Your appeal was submitted and is pending admin review.',
            read: false,
            createdAt: now,
          },
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}`,
            type: 'submit_user_appeal',
            targetUserId: currentUser.id,
            createdAt: now,
          },
        ],
      }));
      setSellerProfileMessage(sellerStatus('appealSubmitted'));
      return true;
    } finally {
      setSubmittingStrikeAppeal(false);
    }
  }

  function reviewUserAppeal(appealId, decision) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!['approved', 'denied'].includes(decision)) return;
    if (reviewingAppealId === appealId) return;
    setReviewingAppealId(appealId);
    try {
      const reviewedAt = new Date().toISOString();
      setDb((prev) => {
        const appeal = (prev.userAppeals || []).find((entry) => entry.id === appealId);
        if (!appeal || appeal.status !== 'pending') return prev;
        const isApproved = decision === 'approved';
        return {
          ...prev,
          userAppeals: (prev.userAppeals || []).map((entry) => (
            entry.id === appealId
              ? {
                  ...entry,
                  status: decision,
                  reviewedAt,
                  reviewedByUserId: currentUser.id,
                  adminDecisionNote: isApproved
                    ? 'Appeal approved. Account reactivated and strikes reset.'
                    : 'Appeal denied. Account remains frozen.',
                }
              : entry
          )),
          users: (prev.users || []).map((user) => {
            if (user.id !== appeal.userId) return user;
            if (!isApproved) return user;
            return {
              ...user,
              strikeCount: 0,
              accountStatus: user.accountStatus === 'frozen' ? 'active' : user.accountStatus,
              frozenAt: undefined,
              frozenReason: undefined,
            };
          }),
          userStrikes: (prev.userStrikes || []).map((strike) => {
            if (strike.userId !== appeal.userId || strike.status !== 'active') return strike;
            return isApproved
              ? { ...strike, status: 'appealed', resolvedAt: reviewedAt, resolvedByUserId: currentUser.id }
              : strike;
          }),
          notifications: [
            ...(prev.notifications || []),
            {
              id: `notif_${Date.now()}_appeal_review`,
              userId: appeal.userId,
              type: 'engagement',
              text: isApproved
                ? 'Your appeal was approved and your account is active again.'
                : 'Your appeal was denied. Your account remains frozen.',
              read: false,
              createdAt: reviewedAt,
            },
          ],
          adminActions: [
            ...(prev.adminActions || []),
            {
              id: `admin_action_${Date.now()}_appeal_review`,
              type: isApproved ? 'approve_user_appeal' : 'deny_user_appeal',
              targetUserId: appeal.userId,
              targetAppealId: appealId,
              adminUserId: currentUser.id,
              createdAt: reviewedAt,
            },
          ],
        };
      });
      setSellerProfileMessage(decision === 'approved' ? sellerStatus('appealApprovedRestored') : sellerStatus('appealDenied'));
    } finally {
      setReviewingAppealId(null);
    }
  }

  function updateOrderShipment(orderId, nextFulfillmentStatus, nextTrackingNumber, nextTrackingCarrier) {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'bar' && currentUser.role !== 'seller')) return;
    if (!orderId || !['processing', 'shipped', 'delivered'].includes(nextFulfillmentStatus)) return;
    if (updatingOrderId === orderId) return;
    setUpdatingOrderId(orderId);
    try {
      const targetOrderCurrent = (orders || []).find((entry) => entry.id === orderId);
      const buyerCurrent = targetOrderCurrent
        ? (users || []).find((user) => (
          (targetOrderCurrent.buyerUserId && user.id === targetOrderCurrent.buyerUserId)
          || (!targetOrderCurrent.buyerUserId && targetOrderCurrent.buyerEmail && user.email === targetOrderCurrent.buyerEmail)
        ))
        : null;
      const normalizedTrackingNumber = String(nextTrackingNumber || '').trim();
      const normalizedTrackingCarrier = String(nextTrackingCarrier || '').trim();
      const now = new Date().toISOString();
      setDb((prev) => {
        const targetOrder = (prev.orders || []).find((order) => order.id === orderId);
        if (!targetOrder) return prev;
        const buyer = (prev.users || []).find((user) =>
          (targetOrder.buyerUserId && user.id === targetOrder.buyerUserId)
          || (!targetOrder.buyerUserId && targetOrder.buyerEmail && user.email === targetOrder.buyerEmail),
        );
        const shouldNotifyShipment =
          nextFulfillmentStatus === 'shipped'
          && (
            targetOrder.fulfillmentStatus !== 'shipped'
            || String(targetOrder.trackingNumber || '').trim() !== normalizedTrackingNumber
            || String(targetOrder.trackingCarrier || '').trim() !== normalizedTrackingCarrier
          );
        const trackingUrl = normalizedTrackingNumber
          ? `https://www.17track.net/en/track?nums=${encodeURIComponent(normalizedTrackingNumber)}`
          : '';
        const base = {
          ...prev,
          orders: (prev.orders || []).map((order) => (
            order.id === orderId
              ? {
                  ...order,
                  fulfillmentStatus: nextFulfillmentStatus,
                  trackingNumber: normalizedTrackingNumber,
                  trackingCarrier: normalizedTrackingCarrier,
                  updatedAt: now,
                }
              : order
          )),
          adminActions: [
            ...(prev.adminActions || []),
            {
              id: `admin_action_${Date.now()}_order_ship`,
              type: 'update_order_shipment',
              targetOrderId: orderId,
              targetUserId: buyer?.id || null,
              adminUserId: currentUser.id,
              createdAt: now,
              status: nextFulfillmentStatus,
              trackingNumber: normalizedTrackingNumber,
              trackingCarrier: normalizedTrackingCarrier,
            },
          ],
        };
        if (!shouldNotifyShipment || !buyer?.id) return base;
        let withNotification = base;
        if (shouldSendNotificationForType(buyer, 'engagement')) {
          withNotification = {
            ...withNotification,
            notifications: [
              ...(withNotification.notifications || []),
              {
                id: `notif_${Date.now()}_order_shipped`,
                userId: buyer.id,
                type: 'engagement',
                text: normalizedTrackingNumber
                  ? `Your order ${orderId} shipped.${normalizedTrackingCarrier ? ` Carrier: ${normalizedTrackingCarrier}.` : ''} Tracking code: ${normalizedTrackingNumber}.`
                  : `Your order ${orderId} shipped.`,
                read: false,
                createdAt: now,
              },
            ],
          };
        }
        return appendTemplatedEmail(withNotification, {
          templateKey: 'order_shipped',
          userId: buyer.id,
          vars: {
            orderId,
            trackingCarrier: normalizedTrackingCarrier || 'Not specified',
            trackingNumber: normalizedTrackingNumber || 'Pending carrier assignment',
            trackingUrl: trackingUrl || buildAbsoluteActionUrl('/account'),
            actionPath: '/account',
          },
          fallbackPath: '/account',
        });
      });
      if (nextFulfillmentStatus === 'shipped' && buyerCurrent?.id) {
        Promise.resolve(dispatchManagedNotification({
          recipientUserIds: [buyerCurrent.id],
          preferenceType: 'engagement',
          route: '/account',
          titleByLang: {
            en: 'Order shipped',
            th: 'คำสั่งซื้อถูกจัดส่งแล้ว',
            my: 'Order ကို ပို့ဆောင်လိုက်ပြီ',
            ru: 'Заказ отправлен',
          },
          bodyByLang: {
            en: normalizedTrackingNumber
              ? `Your order ${orderId} has shipped. Tracking: ${normalizedTrackingNumber}.`
              : `Your order ${orderId} has shipped.`,
            th: normalizedTrackingNumber
              ? `คำสั่งซื้อ ${orderId} ของคุณถูกจัดส่งแล้ว ติดตาม: ${normalizedTrackingNumber}`
              : `คำสั่งซื้อ ${orderId} ของคุณถูกจัดส่งแล้ว`,
            my: normalizedTrackingNumber
              ? `သင့် order ${orderId} ကို ပို့ဆောင်ပြီးပါပြီ။ Tracking: ${normalizedTrackingNumber}`
              : `သင့် order ${orderId} ကို ပို့ဆောင်ပြီးပါပြီ။`,
            ru: normalizedTrackingNumber
              ? `Ваш заказ ${orderId} отправлен. Трек: ${normalizedTrackingNumber}.`
              : `Ваш заказ ${orderId} отправлен.`,
          },
          kind: 'buyer_order_shipped',
        })).catch((err) => console.warn('[updateOrderShipment] push notification failed:', err));
      }
      if (backendStatus === 'connected' && apiAuthToken && normalizedTrackingNumber) {
        apiRequestJson(`/api/orders/${orderId}/tracking`, {
          method: 'POST',
          body: { trackingNumber: normalizedTrackingNumber, slug: normalizedTrackingCarrier || undefined },
          idempotencyScope: `order-tracking-${orderId}`,
        }).catch((err) => console.warn('[updateOrderShipment] API sync failed:', err));
      }
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function fetchOrderTracking(orderId) {
    if (!orderId || backendStatus !== 'connected' || !apiAuthToken) {
      return { ok: false, error: 'Not connected' };
    }
    try {
      const { ok, payload } = await apiRequestJson(`/api/orders/${orderId}/tracking`);
      if (!ok) return { ok: false, error: payload?.error || 'Failed to fetch tracking' };
      return { ok: true, ...payload };
    } catch {
      return { ok: false, error: 'Network error' };
    }
  }

  function updateAdminInboxReview(itemKey, status) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!itemKey || !['new', 'reviewed', 'follow_up', 'resolved'].includes(status)) return;
    const updatedAt = new Date().toISOString();
    setDb((prev) => {
      const existing = (prev.adminInboxReviews || []).find((entry) => entry.itemKey === itemKey);
      const nextEntry = existing
        ? { ...existing, status, updatedAt, updatedByUserId: currentUser.id }
        : {
            id: `admin_inbox_review_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            itemKey,
            status,
            updatedAt,
            updatedByUserId: currentUser.id,
          };
      const remaining = (prev.adminInboxReviews || []).filter((entry) => entry.itemKey !== itemKey);
      return {
        ...prev,
        adminInboxReviews: [nextEntry, ...remaining].slice(0, 3000),
      };
    });
  }

  function updateRefundClaimDecision(claimId, decision, note = '', onSuccess, onError) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.DISPUTES_REVIEW)) {
      onError?.('Insufficient admin permissions.');
      return;
    }
    if (!claimId || !['approved', 'rejected'].includes(decision)) {
      onError?.('Invalid refund claim decision.');
      return;
    }
    const decisionNote = String(note || '').trim();
    let actionError = '';
    let actionResult = null;
    setDb((prev) => {
      const claim = (prev.refundClaims || []).find((entry) => entry.id === claimId);
      if (!claim) {
        actionError = 'Refund claim not found.';
        return prev;
      }
      if (['approved', 'rejected'].includes(claim.status || '')) {
        actionError = `Refund claim already ${claim.status}.`;
        return prev;
      }
      const now = new Date().toISOString();
      const buyer = (prev.users || []).find((user) => user.id === claim.buyerUserId);
      const matchingOrder = (prev.orders || []).find((order) => order.id === claim.orderId);
      const refundAmount = decision === 'approved' ? Number(Number(matchingOrder?.total || 0).toFixed(2)) : 0;
      if (decision === 'approved' && refundAmount <= 0) {
        actionError = 'Cannot approve refund: order total is missing or zero.';
        return prev;
      }
      actionResult = {
        claimId,
        decision,
        refundAmount,
        orderId: claim.orderId,
      };
      const base = {
        ...prev,
        users: (prev.users || []).map((user) => (
          decision === 'approved' && buyer?.id && user.id === buyer.id
            ? { ...user, walletBalance: Number(((user.walletBalance || 0) + refundAmount).toFixed(2)) }
            : user
        )),
        walletTransactions: [
          ...(decision === 'approved' && buyer?.id ? [
            {
              id: `txn_${Date.now()}_refund_claim`,
              userId: buyer.id,
              type: 'refund_claim_refund',
              amount: refundAmount,
              description: `Wrong-item refund approved for order ${claim.orderId}`,
              createdAt: now,
            },
          ] : []),
          ...(prev.walletTransactions || []),
        ],
        refundClaims: (prev.refundClaims || []).map((entry) => (
          entry.id === claimId
            ? {
                ...entry,
                status: decision,
                decisionNote,
                reviewedByUserId: currentUser.id,
                reviewedAt: now,
                refundAmount: decision === 'approved' ? refundAmount : 0,
                updatedAt: now,
              }
            : entry
        )),
        notifications: [
          ...(prev.notifications || []),
          ...(buyer?.id ? [{
            id: `notif_refund_claim_${Date.now()}_${decision}`,
            userId: buyer.id,
            type: 'engagement',
            text: decision === 'approved'
              ? `Your wrong-item refund claim for ${claim.orderId} was approved. ${formatPriceTHB(refundAmount)} was added to your wallet.`
              : `Your wrong-item refund claim for ${claim.orderId} was rejected.${decisionNote ? ` Note: ${decisionNote}` : ''}`,
            read: false,
            createdAt: now,
          }] : []),
        ],
        adminActions: [
          ...(prev.adminActions || []),
          {
            id: `admin_action_${Date.now()}_refund_claim_${decision}`,
            type: `refund_claim_${decision}`,
            targetUserId: claim.buyerUserId || null,
            targetOrderId: claim.orderId || null,
            targetRefundClaimId: claimId,
            adminUserId: currentUser.id,
            createdAt: now,
            metadata: {
              refundAmount,
              note: decisionNote,
            },
          },
        ],
      };
      if (!buyer?.id) return base;
      return appendTemplatedEmail(base, {
        templateKey: 'refund_claim_decision',
        userId: buyer.id,
        vars: {
          orderId: claim.orderId || 'unknown',
          decision,
          decisionSummary: decision === 'approved'
            ? `${formatPriceTHB(refundAmount)} has been added to your wallet.`
            : (decisionNote ? `Reason: ${decisionNote}` : 'No wallet refund was issued.'),
          actionPath: '/account',
        },
        fallbackPath: '/account',
      });
    });
    if (actionError) {
      onError?.(actionError);
      return;
    }
    onSuccess?.(actionResult || null);
  }

  function saveAdminInboxFilterPreset(presetDraft) {
    if (!currentUser || currentUser.role !== 'admin') return;
    const name = String(presetDraft?.name || '').trim();
    if (!name) return;
    const normalized = {
      id: String(presetDraft?.id || `inbox_preset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
      name: name.slice(0, 60),
      type: String(presetDraft?.type || 'all'),
      priority: String(presetDraft?.priority || 'all'),
      review: String(presetDraft?.review || 'all'),
      search: String(presetDraft?.search || '').slice(0, 120),
      updatedAt: new Date().toISOString(),
      updatedByUserId: currentUser.id,
    };
    setDb((prev) => {
      const rest = (prev.adminInboxFilterPresets || []).filter((entry) => entry.id !== normalized.id);
      return {
        ...prev,
        adminInboxFilterPresets: [normalized, ...rest].slice(0, 50),
      };
    });
  }

  function deleteAdminInboxFilterPreset(presetId) {
    if (!currentUser || currentUser.role !== 'admin' || !presetId) return;
    setDb((prev) => ({
      ...prev,
      adminInboxFilterPresets: (prev.adminInboxFilterPresets || []).filter((entry) => entry.id !== presetId),
    }));
  }

  function updateAdminNote(entityKey, body) {
    if (!currentUser || currentUser.role !== 'admin') return;
    if (!entityKey) return;
    const noteBody = String(body || '').trim();
    setDb((prev) => {
      const rest = (prev.adminNotes || []).filter((entry) => entry.entityKey !== entityKey);
      if (!noteBody) {
        return { ...prev, adminNotes: rest };
      }
      const entry = {
        id: `admin_note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entityKey,
        body: noteBody.slice(0, 2000),
        updatedAt: new Date().toISOString(),
        updatedByUserId: currentUser.id,
      };
      return {
        ...prev,
        adminNotes: [entry, ...rest].slice(0, 2000),
      };
    });
  }

  function updateAdminDisputeCase(caseKey, status, metadata = {}) {
    if (!currentUser || !hasAdminScopeAccess(currentUser, ADMIN_SCOPES.DISPUTES_REVIEW)) return;
    if (!caseKey || !['new', 'investigating', 'pending_refund', 'resolved', 'rejected'].includes(status)) return;
    const updatedAt = new Date().toISOString();
    const adminRecipients = (users || [])
      .filter((user) => hasAdminPanelAccess(user))
      .map((user) => user.id)
      .filter(Boolean);
    setDb((prev) => {
      const existing = (prev.adminDisputeCases || []).find((entry) => entry.caseKey === caseKey);
      const nextEntry = existing
        ? {
            ...existing,
            ...metadata,
            status,
            updatedAt,
            updatedByUserId: currentUser.id,
          }
        : {
            id: `admin_dispute_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            caseKey,
            status,
            updatedAt,
            updatedByUserId: currentUser.id,
            ...metadata,
          };
      const rest = (prev.adminDisputeCases || []).filter((entry) => entry.caseKey !== caseKey);
      return {
        ...prev,
        adminDisputeCases: [nextEntry, ...rest].slice(0, 1000),
      };
    });
    Promise.resolve(dispatchManagedNotification({
      recipientUserIds: adminRecipients,
      preferenceType: 'adminOps',
      route: '/admin?tab=disputes',
      titleByLang: {
        en: 'Dispute updated',
        th: 'อัปเดตข้อพิพาทแล้ว',
        my: 'Dispute ကို အပ်ဒိတ်လုပ်ပြီးပါပြီ',
        ru: 'Спор обновлен',
      },
      bodyByLang: {
        en: `Dispute case ${caseKey} moved to ${status}.`,
        th: `เคสข้อพิพาท ${caseKey} อัปเดตเป็น ${status}`,
        my: `Dispute case ${caseKey} ကို ${status} သို့ ပြောင်းခဲ့သည်။`,
        ru: `Статус спора ${caseKey} изменен на ${status}.`,
      },
      kind: 'dispute_updated',
    })).catch(() => {});
  }

  const currentAdminAccess = resolveAdminAccess(currentUser);
  const adminPermissions = buildAdminPermissions(currentUser);
  const isAdmin = hasAdminPanelAccess(currentUser);
  const isSuperAdmin = currentAdminAccess.level === 'super';
  const isSeller = currentUser?.role === 'seller' && currentUser?.accountStatus === 'active';
  const isBar = currentUser?.role === 'bar' && currentUser?.accountStatus === 'active';
  const isPendingSeller = currentUser?.role === 'seller' && currentUser?.accountStatus === 'pending';
  const isRejectedSeller = currentUser?.role === 'seller' && currentUser?.accountStatus === 'rejected';
  const primaryShellRoute = resolvePrimaryShellRoute(currentUser);
  const primaryShellNavLabel = (isAdmin || currentUser?.role === 'seller') ? navText.dashboard : navText.account;
  const messagesRoute = currentUser?.role === 'seller'
    ? '/seller-messages'
    : currentUser?.role === 'buyer'
      ? '/buyer-messages'
      : currentUser?.role === 'bar'
        ? '/bar-messages'
        : primaryShellRoute;
  const resolveMarketplaceConversationBody = (message) => {
    const original = String(message?.bodyOriginal || message?.body || '');
    const translations = message?.translations || {};
    const preferredLanguage = SUPPORTED_AUTH_LANGUAGES.includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : 'en';
    const translated = String(translations?.[preferredLanguage] || translations?.en || '');
    const isOwnMessage = message?.senderId === currentUser?.id;
    const showOriginal = Boolean(showOriginalMarketplaceMessageById[message?.id]);
    if (isOwnMessage || showOriginal) return original;
    return translated || original;
  };
  const canToggleMarketplaceConversationTranslation = (message) => {
    const original = String(message?.bodyOriginal || message?.body || '');
    const translations = message?.translations || {};
    const preferredLanguage = SUPPORTED_AUTH_LANGUAGES.includes(currentUser?.preferredLanguage)
      ? currentUser.preferredLanguage
      : 'en';
    const translated = String(translations?.[preferredLanguage] || translations?.en || '');
    const isOwnMessage = message?.senderId === currentUser?.id;
    return !isOwnMessage && Boolean(translated) && translated !== original;
  };
  const normalizedCurrentSellerId = String(currentSellerId || '').trim();
  const normalizedCurrentBarId = String(currentBarId || '').trim();
  const resolvedBarIdsForCurrentUser = (() => {
    const ids = new Set();
    if (normalizedCurrentBarId) ids.add(normalizedCurrentBarId);
    const explicitUserBarId = String(currentUser?.barId || '').trim();
    if (explicitUserBarId) ids.add(explicitUserBarId);
    if (currentUser?.role === 'bar') {
      const byName = (bars || [])
        .filter((bar) => namesLikelyMatch(currentUser?.name, bar?.name))
        .map((bar) => String(bar?.id || '').trim())
        .filter(Boolean);
      byName.forEach((id) => ids.add(id));
      if (ids.size === 0 && (bars || []).length === 1) {
        const soloBarId = String(bars?.[0]?.id || '').trim();
        if (soloBarId) ids.add(soloBarId);
      }
      if (ids.size === 0) {
        (barAffiliationRequests || []).forEach((request) => {
          if (request?.direction !== 'seller_to_bar') return;
          const targetIds = Array.isArray(request?.targetBarUserIds)
            ? request.targetBarUserIds.map((id) => String(id || '').trim()).filter(Boolean)
            : [];
          const targetsCurrentBarUser = targetIds.includes(String(currentUser?.id || '').trim());
          const requestBarId = String(request?.barId || '').trim();
          const requestBarName = barMap?.[requestBarId]?.name || '';
          const namesMatch = namesLikelyMatch(currentUser?.name, requestBarName);
          if (!targetsCurrentBarUser && !namesMatch) return;
          const barId = String(request?.barId || '').trim();
          if (barId) ids.add(barId);
        });
      }
    }
    return ids;
  })();
  const activeBarIdForDashboard = normalizedCurrentBarId || Array.from(resolvedBarIdsForCurrentUser)[0] || '';
  const sellerIncomingAffiliationRequests = (barAffiliationRequests || [])
    .filter((request) =>
      request.status === 'pending'
      && request.direction === 'bar_to_seller'
      && String(request.sellerId || '').trim() === normalizedCurrentSellerId
    );
  const sellerOutgoingAffiliationRequests = (barAffiliationRequests || [])
    .filter((request) =>
      request.status === 'pending'
      && request.direction === 'seller_to_bar'
      && String(request.sellerId || '').trim() === normalizedCurrentSellerId
    );
  const strictBarIncomingAffiliationRequests = (barAffiliationRequests || [])
    .filter((request) =>
      request.status === 'pending'
      && request.direction === 'seller_to_bar'
      && (() => {
        const requestTargetBarUserIds = Array.isArray(request?.targetBarUserIds)
          ? request.targetBarUserIds.map((id) => String(id || '').trim()).filter(Boolean)
          : [];
        if (currentUser?.id && requestTargetBarUserIds.includes(String(currentUser.id || '').trim())) return true;
        const requestBarId = String(request.barId || '').trim();
        if (resolvedBarIdsForCurrentUser.has(requestBarId)) return true;
        const requestBarName = barMap?.[requestBarId]?.name || '';
        if (namesLikelyMatch(currentUser?.name, requestBarName)) return true;
        return false;
      })()
    );
  const persistedBarDashboardNotifications = (notifications || [])
    .filter((notification) => currentUser?.role === 'bar' && (
      notification.userId === currentUser.id
      || (
        notification?.category === 'bar_affiliation'
        && (
          resolvedBarIdsForCurrentUser.has(String(notification?.barId || '').trim())
          || namesLikelyMatch(currentUser?.name, barMap?.[String(notification?.barId || '').trim()]?.name || '')
          || (
            Array.isArray(notification?.targetBarUserIds)
            && notification.targetBarUserIds.map((id) => String(id || '').trim()).includes(String(currentUser?.id || '').trim())
          )
        )
      )
      || (
        currentUser?.role === 'bar'
        && notification?.category === 'bar_affiliation'
      )
    ))
    .filter((notification) => (
      notification?.category === 'bar_affiliation'
      || Boolean(notification?.affiliationEvent)
      || resolvedBarIdsForCurrentUser.has(String(notification?.barId || '').trim())
      || namesLikelyMatch(currentUser?.name, barMap?.[String(notification?.barId || '').trim()]?.name || '')
      || /affiliat|bar|seller|join|request|invite|approved|declined|removed|cancelled|pending/i.test(String(notification.text || ''))
    ))
    .map((notification) => ({ ...notification, _source: 'persisted' }));
  const fallbackBarIncomingAffiliationRequests = (barAffiliationRequests || []).filter((request) => (
    request.status === 'pending'
    && request.direction === 'seller_to_bar'
    && (
      (Array.isArray(request?.targetBarUserIds) && request.targetBarUserIds.map((id) => String(id || '').trim()).includes(String(currentUser?.id || '').trim()))
      || currentUser?.role === 'bar'
    )
  ));
  const recoveredPendingAffiliationRequestsFromNotifications = persistedBarDashboardNotifications
    .filter((notification) => {
      const event = String(notification?.affiliationEvent || '').trim();
      const text = String(notification?.text || '').toLowerCase();
      return event === 'seller_requested_join' || /requested to join|join request|applied to join/.test(text);
    })
    .map((notification) => {
      const notificationText = String(notification?.text || '');
      const notificationRequestId = String(notification?.affiliationRequestId || notification?.id || '').trim();
      const directSellerId = String(notification?.sellerId || '').trim();
      const directBarId = String(notification?.barId || '').trim();
      const inferredSellerId = directSellerId || String(
        (sellers || []).find((seller) => (
          String(seller?.name || '').trim()
          && notificationText.toLowerCase().includes(String(seller?.name || '').trim().toLowerCase())
        ))?.id || ''
      ).trim();
      const inferredBarId = directBarId || String(
        (bars || []).find((bar) => (
          String(bar?.name || '').trim()
          && notificationText.toLowerCase().includes(String(bar?.name || '').trim().toLowerCase())
        ))?.id
          || currentBarId
          || currentUser?.barId
          || ''
      ).trim();
      const targetBarUserIds = Array.isArray(notification?.targetBarUserIds)
        ? notification.targetBarUserIds.map((id) => String(id || '').trim()).filter(Boolean)
        : [];
      return {
        id: notificationRequestId,
        direction: 'seller_to_bar',
        sellerId: inferredSellerId,
        barId: inferredBarId,
        targetBarUserIds,
        status: 'pending',
        createdAt: notification?.createdAt || Date.now(),
        sellerMessage: String(notification?.sellerMessage || ''),
        sellerImages: [],
        _source: 'recovered_notification',
      };
    })
    .filter((request) => request.id && request.sellerId)
    .filter((request) => {
      const normalizedSellerId = String(request?.sellerId || '').trim();
      const normalizedBarId = String(request?.barId || '').trim();
      const alreadyTracked = (barAffiliationRequests || []).some((entry) => {
        const sameId = String(entry?.id || '').trim() === String(request.id || '').trim();
        const samePendingPair = entry?.status === 'pending'
          && entry?.direction === 'seller_to_bar'
          && String(entry?.sellerId || '').trim() === normalizedSellerId
          && String(entry?.barId || '').trim() === normalizedBarId;
        return sameId || samePendingPair;
      });
      if (alreadyTracked) return false;
      const targetIds = Array.isArray(request?.targetBarUserIds)
        ? request.targetBarUserIds.map((id) => String(id || '').trim()).filter(Boolean)
        : [];
      return (
        targetIds.includes(String(currentUser?.id || '').trim())
        || resolvedBarIdsForCurrentUser.has(normalizedBarId)
        || currentUser?.role === 'bar'
      );
    });
  const baseBarIncomingAffiliationRequests = strictBarIncomingAffiliationRequests.length > 0
    ? strictBarIncomingAffiliationRequests
    : fallbackBarIncomingAffiliationRequests;
  const barIncomingAffiliationRequests = [...baseBarIncomingAffiliationRequests, ...recoveredPendingAffiliationRequestsFromNotifications]
    .filter((request, index, arr) => (
      arr.findIndex((entry) => String(entry?.id || '').trim() === String(request?.id || '').trim()) === index
    ));
  const approvedSellerIdsForCurrentBarUser = new Set(
    (barAffiliationRequests || [])
      .filter((request) => request?.status === 'approved' && request?.direction === 'seller_to_bar')
      .filter((request) => {
        const requestBarId = String(request?.barId || '').trim();
        const requestBarName = barMap?.[requestBarId]?.name || '';
        const targetIds = Array.isArray(request?.targetBarUserIds)
          ? request.targetBarUserIds.map((id) => String(id || '').trim())
          : [];
        return (
          targetIds.includes(String(currentUser?.id || '').trim())
          || resolvedBarIdsForCurrentUser.has(requestBarId)
          || namesLikelyMatch(currentUser?.name, requestBarName)
        );
      })
      .map((request) => String(request?.sellerId || '').trim())
      .filter(Boolean)
  );
  const approvedSellerIdsFromNotifications = new Set(
    persistedBarDashboardNotifications
      .filter((notification) => {
        const event = String(notification?.affiliationEvent || '').trim();
        const text = String(notification?.text || '').toLowerCase();
        return (
          event === 'seller_affiliation_approved'
          || event === 'seller_approved_join'
          || /is now affiliated with|affiliation approved|approved .* affiliation/.test(text)
        );
      })
      .map((notification) => {
        const directSellerId = String(notification?.sellerId || '').trim();
        if (directSellerId) return directSellerId;
        const text = String(notification?.text || '').toLowerCase();
        return String(
          (sellers || []).find((seller) => (
            String(seller?.name || '').trim()
            && text.includes(String(seller?.name || '').trim().toLowerCase())
          ))?.id || ''
        ).trim();
      })
      .filter(Boolean)
  );
  const approvedSellerIdsFromAdminActions = new Set(
    (adminActions || [])
      .filter((action) => String(action?.type || '').trim() === 'approve_bar_affiliation_request')
      .filter((action) => {
        const actionBarId = String(action?.targetBarId || '').trim();
        const actedByCurrentBarUser = String(action?.actorUserId || '').trim() === String(currentUser?.id || '').trim();
        if (actedByCurrentBarUser) return true;
        if (actionBarId && resolvedBarIdsForCurrentUser.has(actionBarId)) return true;
        return currentUser?.role === 'bar' && !actionBarId;
      })
      .map((action) => String(action?.targetSellerId || '').trim())
      .filter(Boolean)
  );
  const removedBarAffiliationSellerIdsForCurrentBar = new Set(
    (adminActions || [])
      .filter((action) => String(action?.type || '').trim() === 'bar_removed_seller_affiliation')
      .filter((action) => {
        const actionBarId = String(action?.targetBarId || '').trim();
        if (actionBarId && resolvedBarIdsForCurrentUser.has(actionBarId)) return true;
        return String(action?.actorUserId || '').trim() === String(currentUser?.id || '').trim();
      })
      .map((action) => String(action?.targetSellerId || '').trim())
      .filter(Boolean)
  );
  const currentBarAffiliatedSellers = (reconciledSellers || [])
    .filter((seller) => {
      const sellerId = String(seller?.id || '').trim();
      if (removedBarAffiliationSellerIdsForCurrentBar.has(sellerId)) return false;
      const affiliatedBarId = String(seller?.affiliatedBarId || '').trim();
      return (
        resolvedBarIdsForCurrentUser.has(affiliatedBarId)
        || approvedSellerIdsForCurrentBarUser.has(sellerId)
        || approvedSellerIdsFromNotifications.has(sellerId)
        || approvedSellerIdsFromAdminActions.has(sellerId)
      );
    })
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  const barAffiliateEarnings = useMemo(() => {
    if (!currentBarId || !currentUser || currentUser.role !== 'bar') {
      return {
        total: 0,
        ledger: [],
        bySource: { orders: 0, messages: 0, customRequests: 0, other: 0 },
        bySellerFromOrders: [],
      };
    }
    const barUserId = currentUser.id;
    const ledger = (walletTransactions || [])
      .filter((entry) => entry.userId === barUserId && Number(entry.amount || 0) > 0)
      .filter((entry) => (
        entry.type === 'order_bar_commission'
        || (entry.type === 'message_fee' && String(entry.description || '').toLowerCase().includes('bar commission'))
      ))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const bySource = ledger.reduce((acc, entry) => {
      const description = String(entry.description || '').toLowerCase();
      if (description.includes('custom request')) {
        acc.customRequests += Number(entry.amount || 0);
      } else if (description.includes('message')) {
        acc.messages += Number(entry.amount || 0);
      } else if (description.includes('order')) {
        acc.orders += Number(entry.amount || 0);
      } else {
        acc.other += Number(entry.amount || 0);
      }
      return acc;
    }, { orders: 0, messages: 0, customRequests: 0, other: 0 });
    const orderSellerAgg = {};
    (orders || []).forEach((order) => {
      const sellerRows = order?.payoutSummary?.bySeller || [];
      sellerRows.forEach((row) => {
        if (String(row?.barId || '') !== currentBarId) return;
        const sellerId = String(row?.sellerId || '').trim();
        if (!sellerId) return;
        if (!orderSellerAgg[sellerId]) {
          orderSellerAgg[sellerId] = {
            sellerId,
            sellerName: row?.sellerName || sellerId,
            amount: 0,
            orderCount: 0,
          };
        }
        orderSellerAgg[sellerId].amount += Number(row?.barAmount || 0);
        orderSellerAgg[sellerId].orderCount += 1;
      });
    });
    const bySellerFromOrders = Object.values(orderSellerAgg)
      .map((entry) => ({
        ...entry,
        amount: Number(entry.amount.toFixed(2)),
      }))
      .sort((a, b) => b.amount - a.amount);
    return {
      total: Number(ledger.reduce((sum, entry) => sum + Number(entry.amount || 0), 0).toFixed(2)),
      ledger,
      bySource: {
        orders: Number((bySource.orders || 0).toFixed(2)),
        messages: Number((bySource.messages || 0).toFixed(2)),
        customRequests: Number((bySource.customRequests || 0).toFixed(2)),
        other: Number((bySource.other || 0).toFixed(2)),
      },
      bySellerFromOrders,
    };
  }, [currentBarId, currentUser, walletTransactions, orders]);
  const pendingRequestNotifications = (barIncomingAffiliationRequests || []).map((request) => ({
    id: `pending_affiliation_${request.id}`,
    userId: currentUser?.id,
    type: 'engagement',
    text: `${sellerMap?.[request.sellerId]?.name || request.sellerId} requested to join ${currentBarProfile?.name || 'your bar'}.`,
    createdAt: request.createdAt || Date.now(),
    read: false,
    category: 'bar_affiliation',
    affiliationEvent: 'seller_requested_join',
    affiliationRequestId: request.id,
    sellerId: request.sellerId,
    barId: request.barId,
    _source: 'pending_request',
  }));
  const barDashboardNotifications = [...pendingRequestNotifications, ...persistedBarDashboardNotifications]
    .filter((notification, index, arr) => {
      const requestId = String(notification?.affiliationRequestId || '').trim();
      if (!requestId) return true;
      return arr.findIndex((entry) => String(entry?.affiliationRequestId || '').trim() === requestId) === index;
    })
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 8);
  const barPushPref = currentUser?.notificationPreferences?.push || {};
  const barInAppAllEnabled =
    currentUser?.notificationPreferences?.message !== false
    && currentUser?.notificationPreferences?.engagement !== false;
  const barPushAllEnabled = barPushPref.message === true && barPushPref.engagement === true;
  const getSellerAffiliationLabel = (seller) => {
    const barId = String(seller?.affiliatedBarId || '').trim();
    if (!barId) return 'Independent';
    return barMap[barId]?.name || 'Independent';
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-pink-50 text-slate-800">
      <header className={`sticky top-0 z-40 border-b ${appMode === 'test' ? 'border-amber-200 bg-amber-50' : 'border-rose-100 bg-white'}`}>
        {appMode === 'test' ? (
          <div className="border-b border-amber-200 bg-amber-100 px-4 py-2 text-center text-xs font-extrabold uppercase tracking-[0.14em] text-amber-900">
            Test Mode Active · Using Alex / Nina / Small World QA dataset
          </div>
        ) : null}
        {adminImpersonation ? (
          <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-1.5 text-center">
            <button onClick={returnToAdmin} className="text-xs font-bold text-indigo-700 underline underline-offset-2 hover:text-indigo-900">
              Return to Admin
            </button>
            <span className="ml-2 text-xs text-indigo-500">Currently viewing as {currentUser?.name || 'user'}</span>
          </div>
        ) : null}
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="shrink-0">
            <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left text-lg font-bold tracking-tight text-rose-700 lg:text-2xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-400 text-sm font-extrabold text-white shadow-lg shadow-rose-200">
                ThP
              </span>
              <span>Thailand Panties</span>
            </button>
            <div className="hidden text-xs text-slate-500 lg:block">Owned and operated by Siam Second Story LLC</div>
            {currentUser?.role === 'admin' ? (
              <div className="hidden text-xs lg:block">
                <span className={`inline-flex rounded-full px-2 py-1 font-semibold ${backendStatus === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  API: {backendStatus === 'connected' ? 'Connected' : 'Offline mode'}
                </span>
              </div>
            ) : null}
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-4 px-4 text-xs font-medium xl:flex 2xl:gap-5 2xl:text-sm">
            <button onClick={() => navigate('/')} className="whitespace-nowrap transition hover:text-rose-600">{navText.home}</button>
            <button onClick={() => navigate('/seller-portfolios')} className="whitespace-nowrap transition hover:text-rose-600">{navText.sellers}</button>
            <button onClick={() => navigate('/bars')} className="whitespace-nowrap transition hover:text-rose-600">{navText.bars}</button>
            <button onClick={() => navigate('/find')} className="whitespace-nowrap transition hover:text-rose-600">{navText.find}</button>
            <button onClick={() => navigate('/stories')} className="whitespace-nowrap transition hover:text-rose-600">{currentUser?.role === 'bar' ? barT.watchFeeds : navText.sellerFeed}</button>
            <button onClick={() => navigate('/custom-requests')} className="whitespace-nowrap transition hover:text-rose-600">{navText.customRequests}</button>
            <button onClick={() => navigate('/faq')} className="whitespace-nowrap transition hover:text-rose-600">{navText.faq}</button>
            <button onClick={() => navigate('/contact')} className="hidden whitespace-nowrap transition hover:text-rose-600 2xl:inline-flex">{navText.contact}</button>
            <button onClick={() => navigate(primaryShellRoute)} className="whitespace-nowrap transition hover:text-rose-600">{primaryShellNavLabel}</button>
            <button onClick={() => navigate(messagesRoute)} className="inline-flex items-center gap-2 whitespace-nowrap transition hover:text-rose-600">
              {navText.messages}
              {unreadMessageCount > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">{unreadMessageCount}</span> : null}
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <select
              value={uiLanguage}
              onChange={(event) => setAuthLanguage(normalizeAuthLanguage(event.target.value))}
              className="hidden rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-600 sm:block"
              aria-label="Language"
            >
              <option value="en">EN</option>
              <option value="th">TH</option>
              <option value="my">MY</option>
              <option value="ru">RU</option>
            </select>
            {currentUser?.role === 'admin' ? (
              <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 lg:flex">
                <button
                  type="button"
                  onClick={() => switchAppMode('live')}
                  disabled={appMode === 'live'}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold ${appMode === 'live' ? 'cursor-not-allowed bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => switchAppMode('test')}
                  disabled={appMode === 'test'}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold ${appMode === 'test' ? 'cursor-not-allowed bg-amber-600 text-white' : 'text-amber-700 hover:bg-amber-100'}`}
                >
                  Test
                </button>
              </div>
            ) : null}
            <div ref={accountMenuRef} className="relative hidden lg:block">
              <button
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                {currentUser
                  ? (currentUser.role === 'buyer'
                    ? `${currentUser.name} (${formatPriceTHB(currentWalletBalance)})`
                    : currentUser.name)
                  : navText.account}
                <ChevronDown className="h-4 w-4" />
              </button>
              {accountMenuOpen ? (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
                  {currentUser ? (
                    <>
                      <button onClick={() => navigate(primaryShellRoute)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-rose-50"><UserCog className="h-4 w-4" /> {primaryShellNavLabel}</button>
                      <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-rose-50"><LogOut className="h-4 w-4" /> {navText.logout}</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => navigate('/login')} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-rose-50"><LogIn className="h-4 w-4" /> {navText.login}</button>
                      <button onClick={() => navigate('/register')} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-rose-50"><Store className="h-4 w-4" /> {navText.register}</button>
                    </>
                  )}
                  {currentUser ? (
                    <div className="border-t border-rose-100 px-4 py-3 text-xs text-slate-500">
                      {`Signed in as ${currentUser.name} (${currentUser.role})${currentUser.role === 'buyer' ? ` · Wallet: ${formatPriceTHB(currentWalletBalance)}` : ''}`}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className={`relative rounded-2xl border border-rose-200 p-2 text-rose-700 transition-transform duration-150 ${cartPulse ? 'scale-110' : ''}`}
              aria-label="Open cart"
            >
              <ShoppingBag className={`h-5 w-5 ${cartPulse ? 'animate-pulse' : ''}`} />
              {cart.length > 0 ? <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white ${cartPulse ? 'animate-bounce' : ''}`}>{cart.length}</span> : null}
            </button>
            <button onClick={() => setMobileMenuOpen((prev) => !prev)} className="rounded-2xl border border-rose-200 p-2 text-rose-700 xl:hidden" aria-label="Toggle mobile menu">
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-rose-100 bg-white px-4 py-4 xl:hidden">
            {currentUser?.role === 'admin' ? (
              <div className="mb-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => switchAppMode('live')}
                  disabled={appMode === 'live'}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${appMode === 'live' ? 'cursor-not-allowed bg-slate-900 text-white' : 'border border-slate-200 text-slate-700'}`}
                >
                  Live mode
                </button>
                <button
                  type="button"
                  onClick={() => switchAppMode('test')}
                  disabled={appMode === 'test'}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${appMode === 'test' ? 'cursor-not-allowed bg-amber-600 text-white' : 'border border-amber-300 text-amber-700'}`}
                >
                  Test mode
                </button>
              </div>
            ) : null}
            <div className="flex flex-col gap-3 text-sm font-medium">
              <button onClick={() => navigate('/')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.home}</button>
              <button onClick={() => navigate('/seller-portfolios')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.sellers}</button>
              <button onClick={() => navigate('/bars')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.bars}</button>
              <button onClick={() => navigate('/find')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.find}</button>
              <button onClick={() => navigate('/stories')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{currentUser?.role === 'bar' ? barT.watchFeeds : navText.sellerFeed}</button>
              <button onClick={() => navigate('/custom-requests')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.customRequests}</button>
              <button onClick={() => navigate('/faq')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.faq}</button>
              <button onClick={() => navigate('/contact')} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.contact}</button>
              <button onClick={() => navigate(primaryShellRoute)} className="rounded-xl px-3 py-2 text-left hover:bg-rose-50">{primaryShellNavLabel}</button>
              <button onClick={() => navigate(messagesRoute)} className="flex items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-rose-50">
                <span>{navText.messages}</span>
                {unreadMessageCount > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">{unreadMessageCount}</span> : null}
              </button>
              <div className="mt-2 border-t border-rose-100 pt-3">
                <div className="mb-2 flex items-center gap-2 px-3">
                  <span className="text-xs font-semibold text-slate-500">Language</span>
                  <select
                    value={uiLanguage}
                    onChange={(event) => setAuthLanguage(normalizeAuthLanguage(event.target.value))}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600"
                    aria-label="Language"
                  >
                    <option value="en">{localizeOptionLabel("English", uiLanguage)}</option>
                    <option value="th">{localizeOptionLabel("Thai", uiLanguage)}</option>
                    <option value="my">{localizeOptionLabel("Burmese", uiLanguage)}</option>
                    <option value="ru">{localizeOptionLabel("Russian", uiLanguage)}</option>
                  </select>
                </div>
                {currentUser ? (
                  <>
                    <button onClick={() => navigate(primaryShellRoute)} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-rose-50">{primaryShellNavLabel}</button>
                    <button onClick={logout} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.logout}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate('/login')} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.login}</button>
                    <button onClick={() => navigate('/register')} className="block w-full rounded-xl px-3 py-2 text-left hover:bg-rose-50">{navText.register}</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      {cartNotice ? (
        <div className="pointer-events-none fixed right-4 top-20 z-50 rounded-xl bg-slate-900/90 px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {cartNotice}
        </div>
      ) : null}

      <main>
        <Suspense
          fallback={(
            <section className="mx-auto max-w-7xl px-6 py-16">
              <div className="rounded-3xl bg-white p-6 text-sm text-slate-600 shadow-md ring-1 ring-rose-100">
                Loading page...
              </div>
            </section>
          )}
        >
        {routeInfo.name === 'home' ? (
          <>
            <section className="mx-auto max-w-7xl px-6 pt-8 md:pt-10">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {loginText.language}
                </label>
                <select
                  value={authLanguage}
                  onChange={(event) => setAuthLanguage(normalizeAuthLanguage(event.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  aria-label={loginText.language}
                >
                  <option value="en">{localizeOptionLabel("English", uiLanguage)}</option>
                  <option value="th">{localizeOptionLabel("Thai", uiLanguage)}</option>
                  <option value="my">{localizeOptionLabel("Burmese", uiLanguage)}</option>
                  <option value="ru">{localizeOptionLabel("Russian", uiLanguage)}</option>
                </select>
              </div>
            </section>
            <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-8 md:grid-cols-[1.2fr_0.8fr] md:pb-24 md:pt-12">
              <div className="flex flex-col justify-center">
                <h1 className="max-w-xl text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
                  {publicText.heroTitle}
                </h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                  {publicText.heroSubtitle}
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  {!currentUser ? (
                    <button onClick={() => navigate('/register')} className="rounded-2xl bg-rose-600 px-6 py-3 font-semibold text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-700">
                      {navText.register}
                    </button>
                  ) : null}
                  <button onClick={() => navigate('/find')} className="rounded-2xl border border-rose-200 bg-white px-6 py-3 font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300">
                    {publicText.browseListings}
                  </button>
                  <button onClick={() => navigate('/seller-portfolios')} className="rounded-2xl border border-rose-200 bg-white px-6 py-3 font-semibold text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300">
                    {publicText.meetSellers}
                  </button>
                  {!currentUser ? (
                    <button onClick={() => navigate('/register')} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300">
                      Join as buyer, seller, or bar
                    </button>
                  ) : null}
                </div>
                <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100"><div className="text-2xl font-bold">{vettedMarketplaceCountLabel}</div><div className="text-sm text-slate-500">{publicText.vettedSellers}</div></div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100"><div className="text-2xl font-bold">Global</div><div className="text-sm text-slate-500">{publicText.discreetShipping}</div></div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100"><div className="text-2xl font-bold">Trusted</div><div className="text-sm text-slate-500">{publicText.buyerPrivacy}</div></div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => navigate('/seller-portfolios')}
                  className="rounded-3xl bg-white p-5 text-left shadow-xl ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <div className="mb-4 rounded-2xl bg-gradient-to-br from-rose-200 to-pink-100 p-5">
                    <div className="rounded-2xl border border-white/50 bg-white/50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">{publicText.featuredSellers}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {homeFeaturedSellers.slice(0, 4).map((seller) => (
                          <div key={seller.id} className="overflow-hidden rounded-xl bg-white">
                            <div className="aspect-[4/5] w-full">
                              <ProductImage
                                src={seller.profileImageResolved || seller.profileImage}
                                label={seller.profileImageNameResolved || seller.profileImageName || `${seller.name} profile`}
                                top
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{publicText.sellerPortfolioPages}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{publicText.sellerPortfolioCardDesc}</p>
                  <div className="mt-3 text-sm font-semibold text-rose-700">{publicText.exploreSellerPortfolios}</div>
                </button>
                <button
                  onClick={() => navigate('/find')}
                  className="rounded-3xl bg-white p-5 text-left shadow-xl ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 md:translate-y-10"
                >
                  <div className="mb-4 rounded-2xl bg-gradient-to-br from-fuchsia-200 to-rose-100 p-5">
                    <div className="rounded-2xl border border-white/50 bg-white/50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">{publicText.liveDiscoverySnapshot}</div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {homeProductPreview.slice(0, 4).map((product) => (
                          <div key={product.id} className="overflow-hidden rounded-xl bg-white">
                            <div className="h-20 w-full">
                              <ProductImage src={product.image} label={product.imageName || product.title} mediaType={product.images?.[0]?.type} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-semibold">{publicText.smartProductDiscovery}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{publicText.smartProductCardDesc}</p>
                  <div className="mt-3 text-sm font-semibold text-rose-700">{publicText.openSmartDiscovery}</div>
                </button>
              </div>
            </section>
            <section className="mx-auto max-w-7xl px-6 pb-2">
              <div className="rounded-3xl border border-rose-100 bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">How it works</div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  {[
                    { title: 'Browse', detail: 'Discover vetted sellers and listings that match your preferences.' },
                    { title: 'Message', detail: 'Confirm details directly with the seller before you buy.' },
                    { title: 'Checkout', detail: 'Pay securely — our support team is here if anything goes wrong.' },
                  ].map((step, index) => (
                    <div key={step.title} className="rounded-2xl bg-slate-50 px-4 py-3 text-slate-700">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Step {index + 1}</div>
                      <div className="mt-1 font-semibold text-slate-900">{step.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
              <SectionTitle eyebrow={publicText.marketplace} title={publicText.shopWithRealFilters} subtitle={`${filteredProducts.length} ${publicText.resultsFoundSuffix}`} />
              <div className="mb-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} placeholder={publicText.searchStylesSellersColors} className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-rose-300" />
                  </label>
                  {['size', 'color', 'style', 'fabric', 'daysWorn', 'condition', 'scentLevel', 'price'].map((key) => {
                    const fieldLabel = ({
                      size: 'Size',
                      color: 'Color',
                      style: 'Style',
                      fabric: 'Fabric',
                      daysWorn: 'Days worn',
                      condition: 'Condition',
                      scentLevel: 'Scent level',
                      price: 'Price',
                    }[key] || key);
                    return (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {fieldLabel}
                        </span>
                        <select value={filters[key]} onChange={(e) => updateFilter(key, e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-rose-300">
                          {filterOptions[key].map((option) => (
                            <option key={option} value={option}>
                              {localizeOptionLabel(option, uiLanguage)}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={resetFilters} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">{publicText.resetFilters}</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeFilterChips.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 px-3 py-1.5 text-xs text-slate-500">No filters selected</div>
                  ) : (
                    <>
                      {activeFilterChips.map((chip) => (
                        <button
                          key={`${chip.key}_${chip.label}`}
                          onClick={() => clearSingleFilter(chip.key)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                          title="Remove this filter"
                        >
                          {chip.label} ×
                        </button>
                      ))}
                      <button onClick={resetFilters} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                        Clear all
                      </button>
                    </>
                  )}
                </div>
              </div>

              {homeProductPreview.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">No products match your filters yet.</div>
                  <div className="mt-1 text-slate-600">Try broader options or reset filters to see more listings.</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={resetFilters} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">Reset filters</button>
                    <button onClick={() => navigate(currentUser ? '/seller-portfolios' : '/login')} className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700">Message a seller</button>
                    <button onClick={() => navigate('/seller-portfolios')} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700">Browse sellers</button>
                  </div>
                </div>
              ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {homeProductPreview.map((product) => {
                  return (
                  <article
                    key={product.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/product/${product.slug}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/product/${product.slug}`);
                      }
                    }}
                    className="cursor-pointer rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    <button onClick={() => navigate(`/product/${product.slug}`)} className="block aspect-[4/5] w-full text-left">
                      <ProductImage src={product.image} label={product.imageName || product.title} top mediaType={product.images?.[0]?.type} />
                    </button>
                    <div className="mt-4">
                      <button onClick={() => navigate(`/product/${product.slug}`)} className="text-left text-lg font-semibold hover:text-rose-700">{product.title}</button>
                      <div className="mt-1 text-sm text-slate-500">
                        {[sellerMap?.[product.sellerId]?.name || product.sellerId, product.style && product.style !== 'Not specified' ? product.style : null].filter(Boolean).join(' · ')}
                      </div>
                      {(product.size && product.size !== 'Not specified') || (product.color && product.color !== 'Not specified') ? <div className="mt-1 text-sm text-slate-500">{[product.size && product.size !== 'Not specified' ? product.size : null, product.color && product.color !== 'Not specified' ? product.color : null].filter(Boolean).join(' · ')}</div> : null}
                      <div className="mt-3 text-lg font-semibold text-rose-700">{formatPriceTHB(product.price)}</div>
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">Discreet shipping</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">Secure payments</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">Policy-first support</span>
                      </div>
                      <div className="mt-4 flex gap-3">
                        <button onClick={() => navigate(`/product/${product.slug}`)} className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 font-semibold text-white">{publicText.viewListing}</button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            addToCart(product.id);
                          }}
                          disabled={cart.includes(product.id)}
                          className={`rounded-2xl border px-4 py-3 font-semibold ${cart.includes(product.id) ? 'cursor-not-allowed border-slate-200 text-slate-500' : 'border-rose-200 text-rose-700'}`}
                        >
                          {cart.includes(product.id) ? publicText.inCartLabel : publicText.add}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleProductWatch(product.id);
                          }}
                          className={`rounded-2xl border px-4 py-3 font-semibold ${watchedProductIds.has(product.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                        >
                          {watchedProductIds.has(product.id) ? "Liked" : "Like"}
                        </button>
                      </div>
                    </div>
                  </article>
                )})}
              </div>
              )}
              {!currentUser ? (
                <div className="mt-8 mx-auto max-w-2xl rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">{loginText.homeCtaBuyerLine || 'Want to save favorites, message sellers, and checkout faster?'}</div>
                    <button onClick={() => navigate('/register')} className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
                      {loginText.homeCtaBuyerButton || 'Create your account'}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="mx-auto max-w-7xl px-6 py-8 md:py-12">
              <div className="mb-5 flex items-center justify-between gap-4">
                <SectionTitle
                  eyebrow={publicText.featuredSellers}
                  title={publicText.talkToRealGirls}
                  subtitle={publicText.talkToRealGirlsSubtitle}
                />
                <button onClick={() => navigate('/seller-portfolios')} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                  {publicText.viewSellerDirectory}
                </button>
              </div>
              {homeSellerPreview.length === 0 ? (
                <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-md ring-1 ring-rose-100">
                  {publicText.sellerFallback}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {homeSellerPreview.map((seller) => (
                    <article
                      key={seller.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/seller/${seller.id}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/seller/${seller.id}`);
                        }
                      }}
                      className="cursor-pointer rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <div className="aspect-[4/5]">
                        <ProductImage
                          src={seller.profileImageResolved || seller.profileImage}
                          label={seller.profileImageNameResolved || seller.profileImageName || `${seller.name} profile`}
                          top
                        />
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-4">
                        <div>
                          <button onClick={() => navigate(`/seller/${seller.id}`)} className="text-left text-xl font-semibold hover:text-rose-700">{seller.name}</button>
                          <p className="text-sm text-slate-500">{seller.location || localizeOptionLabel('Not specified', uiLanguage)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${seller.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {seller.isOnline ? localizeOptionLabel('Online', uiLanguage) : localizeOptionLabel('Offline', uiLanguage)}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{seller.bio || publicText.sellerFallback}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">{homeSellerInsightsById[seller.id]?.total || 0} {publicText.listingsLabel}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{homeSellerInsightsById[seller.id]?.types?.size || 0} {publicText.typesLabel}</span>
                      </div>
                      <button onClick={() => navigate(currentUser ? `/seller/${seller.id}#messages` : '/login')} className="mt-4 w-full rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
                        {publicText.messageSellerTitle}
                      </button>
                      <button onClick={() => navigate(`/seller/${seller.id}`)} className="mt-2 w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                        {publicText.viewSellerProfile}
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {!currentUser ? (
                <div className="mt-8 mx-auto max-w-2xl rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">{loginText.homeCtaSellerLine || 'Ready to sell? Create a seller account and build your profile.'}</div>
                    <button onClick={() => navigate('/register')} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                      {loginText.homeCtaSellerButton || 'Register now'}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="mx-auto max-w-7xl px-6 py-8 md:py-12">
              <div className="mb-5 flex items-center justify-between gap-4">
                <SectionTitle
                  eyebrow={publicText.allFeed}
                  title={publicText.latestFromSellersAndBars}
                  subtitle={publicText.recentLifestylePosts}
                />
                <button onClick={() => navigate('/stories')} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                  {publicText.viewFullFeed}
                </button>
              </div>
              {homeAllFeedPreviewPosts.length === 0 ? (
                <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-md ring-1 ring-rose-100">
                  {publicText.noRecentFeedPostsHome}
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {homeAllFeedPreviewPosts.map((post) => {
                    const isSellerFeedPost = post.feedType === 'seller';
                    const seller = isSellerFeedPost ? sellerMap[post.sellerId] : null;
                    const bar = !isSellerFeedPost ? (localizedBarMap[post.barId] || barMap[post.barId]) : null;
                    return (
                      <article key={`${post.feedType}_${post.id}`} className="rounded-3xl bg-white p-4 shadow-md ring-1 ring-rose-100">
                        <div className="flex items-center justify-between gap-2">
                          {isSellerFeedPost ? (
                            <button onClick={() => navigate(`/seller/${post.sellerId}`)} className="text-left text-sm font-semibold text-rose-700 hover:text-rose-800">
                              {seller?.name || post.sellerId}
                            </button>
                          ) : (
                            <button onClick={() => navigate(`/bar/${post.barId}`)} className="text-left text-sm font-semibold text-rose-700 hover:text-rose-800">
                              {bar?.name || post.barId}
                            </button>
                          )}
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                            {isSellerFeedPost ? publicText.sellerFeed : publicText.bars}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
                        <button onClick={() => navigate(isSellerFeedPost ? `/seller/${post.sellerId}` : `/bar/${post.barId}`)} className="relative mt-3 block aspect-[4/5] w-full">
                          <div className={isSellerFeedPost && !canViewSellerPost(post) ? 'blur-xl' : ''}>
                            <ProductImage src={post.image} label={post.imageName || (isSellerFeedPost ? 'Stories image' : 'Bar stories image')} top mediaType={post.mediaType} />
                          </div>
                          {isSellerFeedPost && !canViewSellerPost(post) && isSellerPostPrivate(post) ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="rounded-2xl bg-white/95 px-4 py-2 text-xs font-semibold text-rose-700 shadow">
                                {publicText.unlockFor} {formatPriceTHB(post.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB)}
                              </span>
                            </div>
                          ) : null}
                        </button>
                        {isSellerFeedPost && !canViewSellerPost(post) && <p className="mt-3 text-xs font-medium text-rose-600/70">{publicText.privatePostUnlock}</p>}
                        <p className={`${isSellerFeedPost && !canViewSellerPost(post) ? 'mt-1' : 'mt-3'} line-clamp-3 text-sm leading-6 text-slate-700`}>
                          {post.caption || publicText.noCaption}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mx-auto max-w-7xl px-6 py-8 md:py-12">
              <div className="mb-5 flex items-center justify-between gap-4">
                <SectionTitle
                  eyebrow={publicText.bars}
                  title={publicText.findABar}
                  subtitle={publicText.findABarSubtitle}
                />
                <button onClick={() => navigate('/bars')} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                  {publicText.viewAllBars}
                </button>
              </div>
              {(() => {
                const barsWithPostIds = new Set(homeBarsByRecentPost.map(({ bar }) => bar.id));
                const barsWithoutPosts = Object.values(localizedBarMap).filter((bar) => !barsWithPostIds.has(bar.id));
                const hasAnyBars = homeBarsByRecentPost.length > 0 || barsWithoutPosts.length > 0;
                if (!hasAnyBars) return (
                  <div className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-md ring-1 ring-rose-100">
                    {publicText.noRecentBarsHome}
                  </div>
                );
                return (
                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {homeBarsByRecentPost.map(({ bar, latestPost }) => (
                      <article
                        key={`home_bar_${bar.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/bar/${bar.id}`)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/bar/${bar.id}`); } }}
                        className="cursor-pointer rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        <div className="aspect-[4/5]">
                          <ProductImage src={bar.profileImage} label={`${bar.name} profile`} top />
                        </div>
                        <h3 className="mt-4 text-xl font-semibold">{bar.name}</h3>
                        <div className="mt-1 text-sm text-slate-500">{bar.location || (bar.mapEmbedUrl ? '' : publicText.locationComingSoon)}</div>
                        <div className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {sellerCountByBarId[bar.id] || 0} {publicText.affiliatedSellersSuffix}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{latestPost?.caption || bar.about || publicText.barProfileSoon}</p>
                        <div className="mt-2 text-xs text-slate-500">{formatDateTimeNoSeconds(latestPost?.createdAt)}</div>
                        <button onClick={() => navigate(`/bar/${bar.id}`)} className="mt-4 w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                          {publicText.viewBarProfile}
                        </button>
                      </article>
                    ))}
                    {barsWithoutPosts.map((bar) => (
                      <article
                        key={`home_bar_${bar.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/bar/${bar.id}`)}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/bar/${bar.id}`); } }}
                        className="cursor-pointer rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        <div className="aspect-[4/5]">
                          <ProductImage src={bar.profileImage} label={`${bar.name} profile`} top />
                        </div>
                        <h3 className="mt-4 text-xl font-semibold">{bar.name}</h3>
                        <div className="mt-1 text-sm text-slate-500">{bar.location || (bar.mapEmbedUrl ? '' : publicText.locationComingSoon)}</div>
                        <div className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {sellerCountByBarId[bar.id] || 0} {publicText.affiliatedSellersSuffix}
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{bar.about || publicText.barProfileSoon}</p>
                        <button onClick={() => navigate(`/bar/${bar.id}`)} className="mt-4 w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                          {publicText.viewBarProfile}
                        </button>
                      </article>
                    ))}
                  </div>
                );
              })()}
              {!currentUser ? (
                <div className="mt-8 mx-auto max-w-2xl rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-600">{loginText.homeCtaBarLine || 'Own a venue? Join as a bar account to post events and connect with sellers.'}</div>
                    <button onClick={() => navigate('/register')} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                      {loginText.homeCtaBarButton || 'Register a bar account'}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
            <section className="mx-auto max-w-7xl px-6 pb-12 md:pb-16">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {loginText.language}
                </label>
                <select
                  value={authLanguage}
                  onChange={(event) => setAuthLanguage(normalizeAuthLanguage(event.target.value))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  aria-label={loginText.language}
                >
                  <option value="en">{localizeOptionLabel("English", uiLanguage)}</option>
                  <option value="th">{localizeOptionLabel("Thai", uiLanguage)}</option>
                  <option value="my">{localizeOptionLabel("Burmese", uiLanguage)}</option>
                  <option value="ru">{localizeOptionLabel("Russian", uiLanguage)}</option>
                </select>
              </div>
            </section>
          </>
        ) : null}

        {routeInfo.name === 'stories' ? (
          <StoriesPage
            sellerPosts={sellerFeedPosts}
            barPosts={barFeedPosts}
            sellers={sellers}
            bars={bars}
            users={users}
            sellerMap={sellerMap}
            barMap={barMap}
            postReports={postReports}
            commentReports={commentReports}
            sellerPostLikes={sellerPostLikes}
            sellerPostComments={sellerPostComments}
            sellerFollows={sellerFollows}
            barFollows={barFollows}
            sellerFollowerCountById={sellerFollowerCountById}
            sellerSavedPosts={sellerSavedPosts}
            currentUser={currentUser}
            reportSellerPost={reportSellerPost}
            reportSellerPostComment={reportSellerPostComment}
            reportingSellerPostId={reportingSellerPostId}
            reportingSellerPostCommentId={reportingSellerPostCommentId}
            toggleSellerPostLike={toggleSellerPostLike}
            addSellerPostComment={addSellerPostComment}
            deleteSellerPostComment={deleteSellerPostComment}
            toggleSellerFollow={toggleSellerFollow}
            toggleBarFollow={toggleBarFollow}
            toggleSavedSellerPost={toggleSavedSellerPost}
            sellerLanguage={uiLanguage}
            canViewSellerPost={canViewSellerPost}
            isSellerPostPrivate={isSellerPostPrivate}
            unlockPrivatePost={unlockPrivatePost}
            navigate={navigate}
          />
        ) : null}

        {routeInfo.name === 'bars' ? (
          <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
            <SectionTitle eyebrow={publicText.bars} title={publicText.partnerBars} subtitle={publicText.barsSubtitle} />
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Object.values(localizedBarMap).map((bar) => (
                <article
                  key={bar.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/bar/${bar.id}`)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/bar/${bar.id}`); } }}
                  className="cursor-pointer rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100 transition hover:-translate-y-0.5 hover:ring-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  <div className="aspect-[4/5]">
                    <ProductImage src={bar.profileImage} label={bar.profileImageName || `${bar.name} cover`} top />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{bar.name}</h3>
                  <div className="mt-1 text-sm text-slate-500">{bar.location || (bar.mapEmbedUrl ? '' : publicText.locationComingSoon)}</div>
                  <div className="mt-2 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {sellerCountByBarId[bar.id] || 0} {publicText.affiliatedSellersSuffix}
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">{bar.about || publicText.barProfileSoon}</p>
                  <button onClick={() => navigate(`/bar/${bar.id}`)} className="mt-4 w-full rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                    {publicText.viewBarProfile}
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {selectedBar ? (
          <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
            <button onClick={() => navigate('/bars')} className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"><ChevronLeft className="h-4 w-4" /> {publicText.backToBars}</button>
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="aspect-[4/5]">
                  <ProductImage src={selectedBar.profileImage} label={selectedBar.profileImageName || `${selectedBar.name} image`} top />
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight">{selectedBar.name}</h2>
                <p className="mt-2 text-slate-500">{selectedBar.location || (selectedBar.mapEmbedUrl ? '' : publicText.locationComingSoon)}</p>
                <p className="mt-4 leading-7 text-slate-600">{selectedBar.about || publicText.barProfileSoon}</p>
                {(currentUser?.role === 'buyer' || (currentUser?.role === 'seller' && String(sellerMap[currentSellerId]?.affiliatedBarId || '').trim() === selectedBar.id)) ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => startConversationWithBar(selectedBar.id)}
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      {publicText.messageThisBar}
                    </button>
                  </div>
                ) : null}
                {selectedBar.specials ? (
                <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 via-fuchsia-50 to-amber-50 p-4 text-sm text-slate-700 ring-1 ring-rose-200/70">
                  <div className="flex items-center gap-2 font-semibold text-rose-700">
                    <span className="text-lg">✨</span>
                    <span>{publicText.currentSpecials}</span>
                  </div>
                  <div className="mt-2 leading-6">{selectedBar.specials}</div>
                </div>
                ) : null}
                <div className="mt-4">
                  <div className="mb-2 text-sm font-semibold text-slate-700">{publicText.affiliatedSellers} ({selectedBarAffiliatedSellers.length})</div>
                  {selectedBarAffiliatedSellers.length === 0 ? (
                    <span className="text-sm text-slate-500">{publicText.noAffiliatedSellersListed}</span>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedBarAffiliatedSellers.map((seller) => (
                        <button
                          key={seller.id}
                          onClick={() => navigate(`/seller/${seller.id}`)}
                          className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="h-16 w-16 overflow-hidden rounded-xl ring-1 ring-rose-100">
                            <ProductImage
                              src={seller.profileImageResolved || seller.profileImage}
                              label={seller.profileImageNameResolved || seller.profileImageName || `${seller.name} profile`}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold text-slate-800">{seller.name}</div>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">
                              {seller.bio || publicText.affiliatedSellerFallback}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <BarQrCard bar={selectedBar} t={barT} />
                <div>
                  <h3 className="text-xl font-semibold">{publicText.locationMap}</h3>
                  {selectedBar.mapEmbedUrl ? (
                    <iframe
                      title={`${selectedBar.name} map`}
                      src={selectedBar.mapEmbedUrl}
                      className="mt-3 h-72 w-full rounded-2xl border border-slate-200"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{publicText.mapNotSet}</div>
                  )}
                  {selectedBar.mapLink ? (
                    <a href={selectedBar.mapLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700">
                      {publicText.openMap}
                    </a>
                  ) : null}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{publicText.barPhotoFeed}</h3>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {(() => {
                      const affiliatedSellerIds = new Set(selectedBarAffiliatedSellers.map((s) => s.id));
                      const barOwnPosts = barFeedPosts.filter((post) => post.barId === selectedBar.id).map((p) => ({ ...p, _kind: 'bar' }));
                      const affiliatedSellerPosts = sellerFeedPosts
                        .filter((post) => affiliatedSellerIds.has(post.sellerId))
                        .map((p) => ({ ...p, _kind: 'seller' }));
                      const combined = [...barOwnPosts, ...affiliatedSellerPosts].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                      if (combined.length === 0) return <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{publicText.noBarPhotosYet}</div>;
                      return combined.map((post) => (
                        <article key={post.id} className="rounded-2xl border border-rose-100 p-4">
                          {post.image ? (
                            <div className="relative aspect-[4/5]">
                              <div className={post._kind === 'seller' && !canViewSellerPost(post) ? 'blur-xl h-full' : 'h-full'}>
                                <ProductImage src={post.image} label={post.imageName || 'Stories image'} top mediaType={post.mediaType} />
                              </div>
                              {post._kind === 'seller' && !canViewSellerPost(post) && isSellerPostPrivate(post) ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <button onClick={() => { if (!currentUser) { navigate('/login'); return; } unlockPrivatePost(post.id); }} className="rounded-2xl bg-white/95 px-4 py-2 text-xs font-semibold text-rose-700 shadow">
                                    {publicText.unlockFor} {formatPriceTHB(post.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB)}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="mt-2 text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
                          {post._kind === 'seller' && !canViewSellerPost(post) && <p className="mt-1 text-xs font-medium text-rose-600/70">{publicText.privatePostUnlock}</p>}
                          <p className="mt-1 text-sm text-slate-700">
                            {post.caption || publicText.noCaption}
                          </p>
                          {post._kind === 'seller' && sellerMap[post.sellerId] ? (
                            <button onClick={() => navigate(`/seller/${post.sellerId}`)} className="mt-2 text-xs font-semibold text-rose-600 hover:underline">
                              {sellerMap[post.sellerId].name}
                            </button>
                          ) : null}
                        </article>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {selectedSeller ? (
          <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
            <div className="mb-6 flex flex-wrap gap-2">
              {currentUser?.role === 'bar' ? (
                <button
                  type="button"
                  onClick={() => navigate('/bar-dashboard')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {barT.backToBarAccount}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
              >
                <ChevronLeft className="h-4 w-4" /> {publicText.backToSellers}
              </button>
              {currentUser ? (
                <button
                  type="button"
                  onClick={() => navigate(primaryShellRoute)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm"
                >
                  <User className="h-4 w-4" />
                  {publicText.myAccount}
                </button>
              ) : null}
            </div>
            <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-rose-100">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{publicText.sellerFallback}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{selectedSeller.name}</h1>
                <span className="text-base text-slate-500">- {selectedSeller.location || localizeOptionLabel('Not specified', uiLanguage)}</span>
              </div>
            </div>
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <div className="aspect-[4/5]">
                  <ProductImage
                    src={selectedSeller.profileImageResolved}
                    label={selectedSeller.profileImageNameResolved || `${selectedSeller.name} cover`}
                    top
                  />
                </div>
                <div className="mt-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">{selectedSeller.name}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-slate-500">{selectedSeller.location}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedSeller.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {selectedSeller.isOnline ? localizeOptionLabel('Online', uiLanguage) : localizeOptionLabel('Offline', uiLanguage)}
                      </span>
                    </div>
                    <div className="mt-2">
                      {selectedSeller.affiliatedBarId && barMap[selectedSeller.affiliatedBarId] ? (
                        <button
                          onClick={() => navigate(`/bar/${selectedSeller.affiliatedBarId}`)}
                          className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
                        >
                          {publicText.barPrefix} {barMap[selectedSeller.affiliatedBarId].name}
                        </button>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{localizeOptionLabel('Independent', uiLanguage)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {publicText.followersLabel}: {sellerFollowerCountById[selectedSeller.id] || 0}
                </div>
                <p className="mt-5 leading-7 text-slate-600">{selectedSeller.bio}</p>
                {(selectedSeller.height || selectedSeller.weight || selectedSeller.hairColor || selectedSeller.braSize || selectedSeller.pantySize) ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedSeller.height ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{publicText.heightLabel}: {formatHeight(selectedSeller.height, 'cm')} / {formatHeight(selectedSeller.height, 'in')}</span> : null}
                    {selectedSeller.weight ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{publicText.weightLabel}: {formatWeight(selectedSeller.weight, 'kg')} / {formatWeight(selectedSeller.weight, 'lbs')}</span> : null}
                    {selectedSeller.hairColor ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{publicText.hairColorLabel}: {localizeOptionLabel(selectedSeller.hairColor, uiLanguage)}</span> : null}
                    {selectedSeller.braSize ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{publicText.braSizeLabel}: {selectedSeller.braSize}</span> : null}
                    {selectedSeller.pantySize ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{publicText.pantySizeLabel}: {selectedSeller.pantySize}</span> : null}
                  </div>
                ) : null}

                {/* Gift section */}
                {(() => {
                  const sellerDisabled = Array.isArray(selectedSeller.disabledGiftTypes) ? selectedSeller.disabledGiftTypes : [];
                  const mergedCatalog = GIFT_CATALOG.map((def) => {
                    const server = (db.giftCatalog || []).find((s) => s.type === def.type);
                    return server ? { ...def, ...server } : def;
                  });
                  const visibleGifts = mergedCatalog.filter((g) =>
                    g.isActive !== false &&
                    !sellerDisabled.includes(g.type)
                  );
                  if (visibleGifts.length === 0) return null;
                  return (
                    <div className="mt-8">
                      <h3 className="text-xl font-semibold">Send a Gift</h3>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {visibleGifts.map((gift) => (
                          <button
                            key={gift.id}
                            onClick={() => setGiftModal({ open: true, sellerId: selectedSeller.id, giftType: gift.type, message: '', isAnonymous: false, sending: false, error: '', success: '' })}
                            className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 hover:shadow"
                          >
                            <span className="text-lg">{gift.emoji}</span>
                            <span>{gift.nameI18n?.[uiLanguage] || gift.name}</span>
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-600">{formatPriceTHB(gift.price)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Gift purchase modal */}
                {giftModal.open && (() => {
                  const giftDef = GIFT_CATALOG.find((g) => g.type === giftModal.giftType);
                  if (!giftDef) return null;
                  const serverGift = (db.giftCatalog || []).find((s) => s.type === giftDef.type);
                  const gift = serverGift ? { ...giftDef, ...serverGift } : giftDef;
                  const balance = Number(currentUser?.walletBalance || 0);
                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !giftModal.sending && setGiftModal((prev) => ({ ...prev, open: false }))}>
                      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{gift.emoji}</span>
                          <div>
                            <h3 className="text-xl font-bold">{gift.nameI18n?.[uiLanguage] || gift.name}</h3>
                            <p className="text-sm text-slate-500">{formatPriceTHB(gift.price)}</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-3">
                          {currentUser ? (
                            <>
                              <textarea
                                value={giftModal.message}
                                onChange={(e) => setGiftModal((prev) => ({ ...prev, message: e.target.value }))}
                                placeholder="Add a message (optional)"
                                className="w-full rounded-xl border border-slate-200 p-3 text-sm"
                                rows={3}
                                maxLength={500}
                              />
                              <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={giftModal.isAnonymous}
                                  onChange={(e) => setGiftModal((prev) => ({ ...prev, isAnonymous: e.target.checked }))}
                                  className="rounded border-slate-300"
                                />
                                Send anonymously
                              </label>
                              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                                Wallet balance: <span className="font-semibold">{formatPriceTHB(balance)}</span>
                                {balance < gift.price && <span className="ml-2 text-red-500 font-medium">(need {formatPriceTHB(gift.price - balance)} more)</span>}
                              </div>
                              {balance < gift.price && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGiftModal((prev) => ({ ...prev, open: false }));
                                    openSellerPageTopUp(gift.price - balance);
                                  }}
                                  className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
                                >
                                  Top up wallet
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600">
                              Log in to send a gift to this seller.
                            </div>
                          )}
                          {giftModal.error && <p className="text-sm font-medium text-red-600">{giftModal.error}</p>}
                          {giftModal.success && <p className="text-sm font-medium text-emerald-600">{giftModal.success}</p>}
                        </div>
                        <div className="mt-5 flex gap-3">
                          <button
                            onClick={() => setGiftModal((prev) => ({ ...prev, open: false }))}
                            disabled={giftModal.sending}
                            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                          >
                            Cancel
                          </button>
                          {currentUser ? (
                            <button
                              onClick={purchaseGift}
                              disabled={giftModal.sending || balance < gift.price}
                              className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              {giftModal.sending ? 'Sending...' : `Send ${gift.name} — ${formatPriceTHB(gift.price)}`}
                            </button>
                          ) : (
                            <button
                              onClick={() => { setGiftModal((prev) => ({ ...prev, open: false })); navigate('/login'); }}
                              className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                              Log in to send
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <h3 className="mt-8 text-xl font-semibold">{publicText.listingsByPrefix} {selectedSeller.name}</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {selectedSellerAllProducts.length > 0 && selectedSellerAvailableProducts.length === 0 ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 md:col-span-2">
                      <div className="text-sm font-semibold text-amber-900">{publicText.listingsReservedTitle}</div>
                      <div className="mt-1 text-sm text-amber-800">{publicText.listingsReservedSubtitle}</div>
                    </div>
                  ) : null}
                  {selectedSellerAvailableProducts.map((product) => {
                    const bundleOption = product.isBundle ? null : getPrimaryBundleForProduct(product.id);
                    const bundleCoveredInCart = !product.isBundle && cartBundleCoveredItemIds.has(String(product.id || ''));
                    return (
                    <div key={product.id} className="rounded-3xl border border-rose-100 p-4">
                      <button onClick={() => navigate(`/product/${product.slug}`)} className="aspect-[4/5] w-full"><ProductImage src={product.image} label={product.imageName || product.title} top mediaType={product.images?.[0]?.type} /></button>
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <button onClick={() => navigate(`/product/${product.slug}`)} className="text-left font-semibold hover:text-rose-700">{product.title}</button>
                          <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedSeller.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {selectedSeller.isOnline ? localizeOptionLabel('Online', uiLanguage) : localizeOptionLabel('Offline', uiLanguage)}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-rose-700">{formatPriceTHB(product.price)}</div>
                      </div>
                      {bundleOption ? (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                          <div className="text-xs font-semibold text-amber-900">{publicText.bundleAvailableBadge}</div>
                          <button
                            onClick={() => navigate(`/product/${bundleOption.slug}`)}
                            className="mt-1 text-xs font-semibold text-amber-800 hover:text-amber-900"
                          >
                            {publicText.viewBundleOption}
                          </button>
                        </div>
                      ) : null}
                      {bundleCoveredInCart ? (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
                          Included via bundle in cart
                        </div>
                      ) : null}
                      <button
                        onClick={() => addToCart(product.id)}
                        disabled={cart.includes(product.id) || bundleCoveredInCart}
                        className={`mt-4 w-full rounded-2xl px-4 py-3 font-semibold text-white ${(cart.includes(product.id) || bundleCoveredInCart) ? 'cursor-not-allowed bg-slate-400' : 'bg-rose-600'}`}
                      >
                        {cart.includes(product.id)
                          ? publicText.inCartLabel
                          : bundleCoveredInCart
                            ? 'Included in bundle'
                            : publicText.addToCart}
                      </button>
                      <button
                        onClick={() => toggleProductWatch(product.id)}
                        className={`mt-2 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold ${watchedProductIds.has(product.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                      >
                        {watchedProductIds.has(product.id) ? "Liked" : "Like"}
                      </button>
                    </div>
                  )})}
                </div>
              </div>
              <div className="space-y-6 rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                <SellerQrCard seller={selectedSeller} t={publicText} />
                <div id="messages" className="rounded-3xl border border-rose-100 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-semibold">{publicText.messageSellerTitle}</h3>
                      <p className="mt-1 text-sm text-slate-600">{publicText.buyerMessagesCostPrefix} {formatPriceTHB(MESSAGE_FEE_THB)} {publicText.buyerMessagesCostSuffix}</p>
                      {currentUser?.role === 'buyer' ? <p className="mt-1 text-xs text-slate-400">Messages refresh automatically every 2.5 seconds.</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-rose-100">{publicText.balanceLabel}: {formatPriceTHB(currentWalletBalance)}</div>
                    </div>
                  </div>
                  {!currentUser ? (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-rose-100">{publicText.loginBuyerToMessage}</div>
                      <button onClick={() => navigate('/login')} className="mt-3 rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">{publicText.messageSellerTitle} ({formatPriceTHB(MESSAGE_FEE_THB)})</button>
                    </div>
                  ) : null}
                  {currentUser?.role === 'seller' ? <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-rose-100">{publicText.sellerInboxReviewHint}</div> : null}
                  {currentUser?.role === 'buyer' ? (
                    <>
                      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-2xl bg-white p-4 ring-1 ring-rose-100">
                        {selectedConversationMessages.length === 0 ? <div className="text-sm text-slate-500">{publicText.noMessagesYetStart}</div> : selectedConversationMessages.map((message) => (
                          <div key={message.id} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${message.senderRole === 'buyer' ? 'ml-auto bg-rose-100 text-rose-900 ring-1 ring-rose-200' : 'bg-slate-100 text-slate-700'}`}>
                            {resolveMarketplaceConversationBody(message)}
                            {canToggleMarketplaceConversationTranslation(message) ? (
                              <button
                                type="button"
                                onClick={() => setShowOriginalMarketplaceMessageById((prev) => ({ ...prev, [message.id]: !prev[message.id] }))}
                                className={`mt-2 block text-[11px] font-semibold ${message.senderRole === 'buyer' ? 'text-rose-100' : 'text-slate-500'}`}
                              >
                                {showOriginalMarketplaceMessageById[message.id] ? publicText.showTranslation : publicText.showOriginal}
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4">
                        <textarea value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} className="min-h-[96px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" placeholder={`${publicText.sendMessageToPrefix} ${selectedSeller.name}`} />
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <button
                            onClick={sendBuyerMessageToSeller}
                            disabled={currentWalletBalance < MESSAGE_FEE_THB}
                            className={`rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white ${currentWalletBalance < MESSAGE_FEE_THB ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            {publicText.send} ({formatPriceTHB(MESSAGE_FEE_THB)})
                          </button>
                          {currentUser?.role === 'buyer' && currentWalletBalance < 100 ? (
                            <button
                              type="button"
                              onClick={() => openSellerPageTopUp(Math.max(0, MESSAGE_FEE_THB - currentWalletBalance))}
                              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                            >
                              Top up wallet
                            </button>
                          ) : null}
                        </div>
                        {currentWalletBalance < MESSAGE_FEE_THB ? <div className="mt-2 text-xs text-amber-700">{publicText.walletNeedsAtLeastPrefix} {formatPriceTHB(MESSAGE_FEE_THB)} {publicText.walletNeedsAtLeastSuffix}</div> : null}
                      </div>
                      {messageError ? <div className="mt-3 text-sm font-medium text-rose-600">{messageError}</div> : null}
                      <button onClick={() => markNotificationsReadForConversation(selectedConversationId)} className="mt-3 text-sm font-semibold text-rose-700">{publicText.markThreadRead}</button>
                    </>
                  ) : null}
                </div>
                <div>
                  <div className="rounded-3xl border border-rose-100 bg-rose-50/60 p-5">
                    <h3 className="text-xl font-semibold">{publicText.customRequestsTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {publicText.customRequestExplainPrefix} {selectedSeller.name}? {publicText.customRequestExplainBody} {formatPriceTHB(MESSAGE_FEE_THB)} {publicText.customRequestExplainBodyEnd}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 italic">
                      {publicText.customRequestExplainNote}
                    </p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <input
                        value={sellerCustomRequestDraft.name}
                        onChange={(event) => setSellerCustomRequestDraft((prev) => ({ ...prev, name: event.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder={publicText.yourName}
                      />
                      <input
                        value={sellerCustomRequestDraft.email}
                        onChange={(event) => setSellerCustomRequestDraft((prev) => ({ ...prev, email: event.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder={publicText.email}
                      />
                      <input
                        value={sellerCustomRequestDraft.preferredDetails}
                        onChange={(event) => setSellerCustomRequestDraft((prev) => ({ ...prev, preferredDetails: event.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder={publicText.customDetailsPlaceholder}
                      />
                      <input
                        value={sellerCustomRequestDraft.shippingCountry}
                        onChange={(event) => setSellerCustomRequestDraft((prev) => ({ ...prev, shippingCountry: event.target.value }))}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        placeholder={publicText.shippingCountry}
                      />
                    </div>
                    <textarea
                      value={sellerCustomRequestDraft.requestBody}
                      onChange={(event) => setSellerCustomRequestDraft((prev) => ({ ...prev, requestBody: event.target.value }))}
                      className="mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      placeholder={`${publicText.describeRequestForPrefix} ${selectedSeller.name}`}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => {
                          if (!currentUser) { navigate('/login'); return; }
                          submitCustomRequest(
                            {
                              sellerId: selectedSeller.id,
                              buyerName: sellerCustomRequestDraft.name,
                              buyerEmail: sellerCustomRequestDraft.email,
                              preferredDetails: sellerCustomRequestDraft.preferredDetails,
                              shippingCountry: sellerCustomRequestDraft.shippingCountry,
                              requestBody: sellerCustomRequestDraft.requestBody,
                            },
                            () => {
                              setSellerCustomRequestDraft((prev) => ({
                                ...prev,
                                preferredDetails: '',
                                shippingCountry: '',
                                requestBody: '',
                              }));
                              setSellerCustomRequestMessage(publicText.customRequestSubmitted);
                            },
                            (errorMessage) => setSellerCustomRequestMessage(errorMessage || ''),
                          );
                        }}
                        disabled={currentUser && currentWalletBalance < CUSTOM_REQUEST_FEE_THB}
                        className={`rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white ${currentUser && currentWalletBalance < CUSTOM_REQUEST_FEE_THB ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        {publicText.sendCustomRequest} ({formatPriceTHB(CUSTOM_REQUEST_FEE_THB)})
                      </button>
                      {currentUser?.role === 'buyer' && currentWalletBalance < 100 ? (
                        <button
                          type="button"
                          onClick={() => openSellerPageTopUp(Math.max(0, CUSTOM_REQUEST_FEE_THB - currentWalletBalance))}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                        >
                          Top up wallet
                        </button>
                      ) : null}
                    </div>
                    {currentUser && currentWalletBalance < CUSTOM_REQUEST_FEE_THB ? <div className="mt-2 text-xs text-amber-700">{publicText.walletNeedsAtLeastPrefix} {formatPriceTHB(CUSTOM_REQUEST_FEE_THB)} {publicText.walletNeedsAtLeastSuffix}</div> : null}
                    {sellerCustomRequestMessage ? <div className="mt-2 text-sm font-medium text-rose-700">{sellerCustomRequestMessage}</div> : null}
                  </div>
                  <h3 className="mt-8 text-xl font-semibold">{publicText.lifestylePostsByPrefix} {selectedSeller.name}</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {sellerFeedPosts.filter((post) => post.sellerId === selectedSeller.id).length === 0 ? (
                      <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-rose-100">{publicText.noLifestylePostsYet}</div>
                    ) : sellerFeedPosts.filter((post) => post.sellerId === selectedSeller.id).map((post) => (
                      <div key={post.id} className="rounded-3xl border border-rose-100 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedSeller.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {selectedSeller.isOnline ? localizeOptionLabel('Online', uiLanguage) : localizeOptionLabel('Offline', uiLanguage)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (isSellerPostPrivate(post) && !currentUser) {
                              navigate('/login');
                              return;
                            }
                            if (isSellerPostPrivate(post) && currentUser) {
                              unlockPrivatePost(post.id);
                            }
                          }}
                          className="relative mt-3 block aspect-[4/5] w-full text-left"
                        >
                          <div className={canViewSellerPost(post) ? '' : 'blur-xl'}>
                            <ProductImage src={post.image} label={post.imageName || 'Seller post'} top mediaType={post.mediaType} />
                          </div>
                          {!canViewSellerPost(post) && isSellerPostPrivate(post) ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <button onClick={(event) => { event.stopPropagation(); unlockPrivatePost(post.id); }} className="rounded-2xl bg-white/95 px-4 py-2 text-xs font-semibold text-rose-700 shadow">
                                {publicText.unlockFor} {formatPriceTHB(post.accessPriceUsd || MIN_FEED_UNLOCK_PRICE_THB)}
                              </button>
                            </div>
                          ) : null}
                        </button>
                        {!canViewSellerPost(post) && <div className="mt-3 text-xs font-medium text-rose-600/70">{publicText.privatePostUnlock}</div>}
                        {post.caption ? <div className={`${!canViewSellerPost(post) ? 'mt-1' : 'mt-2'} text-lg leading-7 text-slate-700`}>{post.caption}</div> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {selectedProduct ? (
          <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"><ChevronLeft className="h-4 w-4" /> {publicText.backToShop}</button>
              {currentUser ? (
                <button
                  onClick={() => navigate(primaryShellRoute)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to account
                </button>
              ) : null}
            </div>
            <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
              <div className="space-y-4">
                {(() => {
                  const allImages = Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0
                    ? selectedProduct.images
                    : [{ url: selectedProduct.image, name: selectedProduct.imageName || selectedProduct.title }];
                  const activeIdx = Math.min(selectedProductImageIndex, allImages.length - 1);
                  return (
                    <>
                      <div className="aspect-[4/5]"><ProductImage src={allImages[activeIdx]?.url} label={allImages[activeIdx]?.name || selectedProduct.title} top mediaType={allImages[activeIdx]?.type} /></div>
                      {allImages.length > 1 && (
                        <div className="grid grid-cols-5 gap-3">
                          {allImages.map((img, idx) => (
                            <button key={idx} onClick={() => setSelectedProductImageIndex(idx)} className={`aspect-square rounded-xl ring-2 overflow-hidden ${idx === activeIdx ? 'ring-rose-500' : 'ring-transparent hover:ring-rose-200'}`}>
                              <ProductImage src={img.url} label={img.name || `Image ${idx + 1}`} top mediaType={img.type} />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100 lg:sticky lg:top-24">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">{selectedProduct.title}</h2>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => navigate(`/seller/${selectedProduct.sellerId}`)} className="text-sm text-slate-500 hover:text-rose-600">{publicText.byPrefix} {sellerMap[selectedProduct.sellerId]?.name}</button>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sellerMap[selectedProduct.sellerId]?.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {sellerMap[selectedProduct.sellerId]?.isOnline ? localizeOptionLabel('Online', uiLanguage) : localizeOptionLabel('Offline', uiLanguage)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-full bg-rose-50 px-4 py-2 text-lg font-bold text-rose-700">{formatPriceTHB(selectedProduct.price)}</div>
                </div>
                <p className="mt-5 leading-7 text-slate-600">{selectedProduct.description}</p>
                <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-sm text-rose-900">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-600">Recommended flow</div>
                  <div className="mt-1">Message seller (optional) &rarr; Add to cart &rarr; Checkout.</div>
                  <div className="mt-2">
                    <button onClick={() => navigate(currentUser ? `/seller/${selectedProduct.sellerId}` : '/login')} className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700">
                      Message seller
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <div><span className="font-semibold">Price:</span> {formatPriceTHB(selectedProduct.price)}</div>
                  <div className="mt-1"><span className="font-semibold">Shipping:</span> Discreet shipping with tracked options at checkout.</div>
                  <div className="mt-1"><span className="font-semibold">Policy:</span> Refunds are reviewed case-by-case. Contact support with evidence if there's an issue.</div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  {selectedProduct.size ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.sizeField}:</span> {selectedProduct.size}</div> : null}
                  {selectedProduct.color ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.colorField}:</span> {selectedProduct.color}</div> : null}
                  {selectedProduct.style ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.styleField}:</span> {selectedProduct.style}</div> : null}
                  {selectedProduct.fabric ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.fabricField}:</span> {selectedProduct.fabric}</div> : null}
                  {selectedProduct.daysWorn && selectedProduct.daysWorn !== 'Not specified' ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.daysWornField}:</span> {selectedProduct.daysWorn}</div> : null}
                  {selectedProduct.waistRise && selectedProduct.waistRise !== 'Not specified' ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.waistRiseField}:</span> {selectedProduct.waistRise}</div> : null}
                  {selectedProduct.coverage && selectedProduct.coverage !== 'Not specified' ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.coverageField}:</span> {selectedProduct.coverage}</div> : null}
                  {selectedProduct.condition && selectedProduct.condition !== 'Not specified' ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.conditionField}:</span> {selectedProduct.condition}</div> : null}
                  {selectedProduct.scentLevel && selectedProduct.scentLevel !== 'Not specified' ? <div className="rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{publicText.scentLevelField}:</span> {selectedProduct.scentLevel}</div> : null}
                </div>
                {selectedProductPrimaryBundle ? (
                  <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Bundle option</div>
                    <div className="mt-1 text-lg font-semibold text-amber-900">{selectedProductPrimaryBundle.title}</div>
                    <div className="mt-1 text-sm text-amber-800">
                      Buy this item on its own, or get the full bundle for {formatPriceTHB(selectedProductPrimaryBundle.price)}.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/product/${selectedProductPrimaryBundle.slug}`)}
                        className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        View bundle details
                      </button>
                      <button
                        onClick={() => addBundleToCartFromSingleItem(selectedProductPrimaryBundle.id, selectedProduct.id)}
                        className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                      >
                        {cart.includes(selectedProductPrimaryBundle.id) ? 'Bundle in cart' : 'Add bundle to cart'}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="mt-8 flex flex-wrap gap-3">
                  {selectedProductIsSold ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-3 text-sm font-semibold text-emerald-800">
                      This listing is sold. Seller needs to create a new listing for the next sale.
                    </div>
                  ) : buyerHasProcessingOrderForSelectedProduct ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-800">
                      This order is being processed. You will receive it soon.
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(selectedProduct.id)}
                      disabled={cart.includes(selectedProduct.id) || selectedProductCoveredByBundleInCart}
                      className={`rounded-2xl px-6 py-3 font-semibold text-white ${(cart.includes(selectedProduct.id) || selectedProductCoveredByBundleInCart) ? 'cursor-not-allowed bg-slate-400' : 'bg-rose-600'}`}
                    >
                      {cart.includes(selectedProduct.id)
                        ? publicText.inCartLabel
                        : selectedProductCoveredByBundleInCart
                          ? 'Included in bundle'
                          : publicText.addToCart}
                    </button>
                  )}
                  <button onClick={() => navigate(`/seller/${selectedProduct.sellerId}`)} className="rounded-2xl border border-rose-200 px-6 py-3 font-semibold text-rose-700">{publicText.viewSellerProfile}</button>
                  <button
                    onClick={() => toggleProductWatch(selectedProduct.id)}
                    className={`rounded-2xl border px-6 py-3 font-semibold ${watchedProductIds.has(selectedProduct.id) ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-700"}`}
                  >
                    {watchedProductIds.has(selectedProduct.id) ? "Liked" : "Like"}
                  </button>
                </div>
                {(cart.includes(selectedProduct.id) || selectedProductCoveredByBundleInCart) && !selectedProductIsSold ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-sm font-semibold text-emerald-800">
                      {selectedProductCoveredByBundleInCart ? 'Included via bundle in cart. Ready to continue?' : 'Added to cart. Ready to continue?'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          if (currentUser?.role === 'buyer' && checkoutStepOneReadyForBuyer) setCheckoutStep(2);
                          else setCheckoutStep(1);
                          navigate('/checkout');
                        }}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Checkout now
                      </button>
                      <button onClick={() => navigate('/find')} className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-700">
                        Continue browsing
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}
        {routeInfo.name === 'product' && !selectedProduct ? (
          <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
            <div className="rounded-3xl bg-white p-8 text-center shadow-md ring-1 ring-rose-100">
              <h2 className="text-2xl font-bold">{publicText.productNotFoundTitle}</h2>
              <p className="mt-3 text-slate-600">{publicText.productNotFoundSubtitle}</p>
              <button onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')} className="mt-6 rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">{publicText.backToShop}</button>
            </div>
          </section>
        ) : null}

        {(routeInfo.name === 'bar-dashboard' || (routeInfo.name === 'account' && currentUser?.role === 'bar')) ? (
          <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
            {!isBar ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
                <Lock className="mx-auto h-10 w-10 text-rose-600" />
                <h2 className="mt-4 text-2xl font-bold">{loginText.barLoginRequiredTitle || 'Bar login required'}</h2>
                <p className="mt-2 text-slate-600">{loginText.barLoginProfileSubtitle || 'Please log in with a bar account to continue.'}</p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700"
                >
                  {loginText.verifyGoToLogin || 'Go to login'}
                </button>
              </div>
            ) : (
              <>
                <SectionTitle
                  eyebrow={barT.title}
                  title={barT.title}
                  subtitle={barT.subtitle}
                />
                {barIncomingAffiliationRequests.length > 0 ? (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-sm font-semibold text-amber-900">
                      {barT.pendingRequestsTopAlert}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-600 px-2.5 py-1 text-xs font-bold text-white">
                        {barT.pendingRequestsTopAlertCount}: {barIncomingAffiliationRequests.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const affiliationsSection = typeof document !== 'undefined' ? document.getElementById('bar-affiliations') : null;
                          affiliationsSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800"
                      >
                        {barT.reviewApplicationsNow}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto"
                  >
                    {barT.profileTitle}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/bar-feed-workspace')}
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
                  >
                    {barT.feedTitle}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/bar-messages')}
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
                  >
                    {navText.messages}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ordersSection = typeof document !== 'undefined' ? document.getElementById('bar-orders') : null;
                      if (ordersSection) ordersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
                  >
                    Orders ({barOrders.length})
                  </button>
                  <label className="col-span-2 mt-1 flex items-center justify-end gap-2 text-sm text-slate-600 sm:col-auto sm:ml-auto sm:mt-0">
                    {barT.language}
                    <select
                      value={SUPPORTED_AUTH_LANGUAGES.includes(currentUser?.preferredLanguage) ? currentUser.preferredLanguage : 'en'}
                      onChange={(event) => updateBarLanguage(event.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {DASHBOARD_LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{localizeOptionLabel(option.label, uiLanguage)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Bell className="h-4 w-4 text-rose-600" />
                    {barT.notifications}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = !barInAppAllEnabled;
                      updateNotificationPreference('message', nextEnabled);
                      updateNotificationPreference('engagement', nextEnabled);
                    }}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${barInAppAllEnabled ? 'bg-emerald-50 text-emerald-700' : 'border border-slate-200 text-slate-600'}`}
                  >
                    {barT.emailNotifications}: {barInAppAllEnabled ? barT.on : barT.off}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextEnabled = !barPushAllEnabled;
                      updatePushNotificationPreference('message', nextEnabled);
                      updatePushNotificationPreference('engagement', nextEnabled);
                    }}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold ${barPushAllEnabled ? 'bg-indigo-50 text-indigo-700' : 'border border-slate-200 text-slate-600'}`}
                  >
                    {barT.browserNotifications}: {barPushAllEnabled ? barT.on : barT.off}
                  </button>
                  {!pushSupport.notification ? (
                    <span className="text-xs text-amber-700">{barT.pushNotSupported}</span>
                  ) : null}
                  {pushSupport.notification && pushPermission === 'denied' ? (
                    <span className="text-xs text-amber-700">{barT.pushBlocked}</span>
                  ) : null}
                </div>
                {currentBarProfile ? (
                  <div className="mt-4 rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                    <BarQrCard bar={currentBarProfile} t={barT} />
                  </div>
                ) : null}
                <details id="bar-earnings" className="mt-6 overflow-hidden rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold">{barT.affiliateEarnings}</h3>
                      <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{barT.closeSectionLabel}</span>
                    </div>
                  </summary>
                  <p className="mt-1 text-sm text-slate-600">{barT.affiliateEarningsHelp}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{barT.totalEarned}</div>
                      <div className="mt-1 text-2xl font-bold text-emerald-800">{formatPriceTHB(barAffiliateEarnings.total)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{barT.orderCommissions}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">{formatPriceTHB(barAffiliateEarnings.bySource.orders)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{barT.messageCommissions}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">{formatPriceTHB(barAffiliateEarnings.bySource.messages)}</div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{barT.customRequestCommissions}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">{formatPriceTHB(barAffiliateEarnings.bySource.customRequests)}</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-2xl border border-rose-100 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-800">{barT.topAffiliatedSellers}</div>
                      <div className="mt-3 space-y-2">
                        {barAffiliateEarnings.bySellerFromOrders.length === 0 ? (
                          <div className="rounded-xl bg-white p-3 text-sm text-slate-500 ring-1 ring-rose-100">{barT.noOrderCommissions}</div>
                        ) : barAffiliateEarnings.bySellerFromOrders.slice(0, 6).map((row) => (
                          <div key={row.sellerId} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-rose-100">
                            <div>
                              <div className="text-sm font-semibold text-slate-800">{row.sellerName}</div>
                              <div className="text-xs text-slate-500">{barT.commissionEvents(row.orderCount)}</div>
                            </div>
                            <div className="text-sm font-semibold text-emerald-700">{formatPriceTHB(row.amount)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-800">{barT.recentLedger}</div>
                      <div className="mt-3 space-y-2">
                        {barAffiliateEarnings.ledger.length === 0 ? (
                          <div className="rounded-xl bg-white p-3 text-sm text-slate-500 ring-1 ring-rose-100">{barT.noCommissionTransactions}</div>
                        ) : barAffiliateEarnings.ledger.slice(0, 8).map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 ring-1 ring-rose-100">
                            <div>
                              <div className="text-xs text-slate-500">{formatDateTimeNoSeconds(entry.createdAt)}</div>
                              <div className="text-sm text-slate-700">{entry.description || barT.commissionCredit}</div>
                            </div>
                            <div className="text-sm font-semibold text-emerald-700">{formatPriceTHB(Number(entry.amount || 0))}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
                <details id="bar-orders" className="mt-6 overflow-hidden rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100" open>
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold">Order management</h3>
                      <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{barT.closeSectionLabel}</span>
                    </div>
                  </summary>
                  <p className="mt-1 text-sm text-slate-600">Orders from your affiliated sellers. Add tracking numbers and update fulfillment status here.</p>
                  <div className="mt-4 space-y-4">
                    {barOrders.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No orders for your affiliated sellers yet.</div>
                    ) : barOrders.map((order) => (
                      <div key={order.id} className="rounded-2xl border border-rose-100 p-5">
                        <div className="font-semibold">{order.id}</div>
                        <div className="mt-1 text-sm text-slate-600">{formatDateTimeNoSeconds(order.createdAt || Date.now())}</div>
                        <div className="mt-1 text-sm text-slate-600">{formatPriceTHB(order.total)} &middot; {order.paymentStatus} &middot; {order.fulfillmentStatus}</div>
                        <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <span className="font-medium">Ship to:</span>{' '}
                          {[order.shippingAddress, order.shippingPostalCode, order.shippingCountry].filter(Boolean).join(', ') || 'Not provided'}
                        </div>
                        {order.paymentStatus === 'paid' ? (
                          <div className="mt-4 grid gap-3 md:grid-cols-[0.8fr_1fr_0.95fr_auto] md:items-end">
                            <label className="text-sm text-slate-700">
                              Fulfillment status
                              <select
                                value={barOrderShipmentDrafts[order.id]?.fulfillmentStatus || order.fulfillmentStatus || 'processing'}
                                onChange={(event) => setBarOrderShipmentDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    fulfillmentStatus: event.target.value,
                                    trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? '',
                                    trackingCarrier: prev[order.id]?.trackingCarrier ?? order.trackingCarrier ?? '',
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
                                value={barOrderShipmentDrafts[order.id]?.trackingNumber ?? order.trackingNumber ?? ''}
                                onChange={(event) => setBarOrderShipmentDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    fulfillmentStatus: prev[order.id]?.fulfillmentStatus || order.fulfillmentStatus || 'processing',
                                    trackingNumber: event.target.value,
                                    trackingCarrier: prev[order.id]?.trackingCarrier ?? order.trackingCarrier ?? '',
                                  },
                                }))}
                                placeholder="e.g. TH1234567890"
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              />
                            </label>
                            <label className="text-sm text-slate-700">
                              Carrier
                              <select
                                value={barOrderShipmentDrafts[order.id]?.trackingCarrier ?? order.trackingCarrier ?? 'Not set'}
                                onChange={(event) => setBarOrderShipmentDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    fulfillmentStatus: prev[order.id]?.fulfillmentStatus || order.fulfillmentStatus || 'processing',
                                    trackingNumber: prev[order.id]?.trackingNumber ?? order.trackingNumber ?? '',
                                    trackingCarrier: event.target.value,
                                  },
                                }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                              >
                                {BAR_TRACKING_CARRIER_OPTIONS.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            </label>
                            <button
                              onClick={() => {
                                const draft = barOrderShipmentDrafts[order.id] || {};
                                const nextStatus = draft.fulfillmentStatus || order.fulfillmentStatus || 'processing';
                                const nextTracking = draft.trackingNumber ?? order.trackingNumber ?? '';
                                const nextCarrier = draft.trackingCarrier ?? order.trackingCarrier ?? '';
                                updateOrderShipment(order.id, nextStatus, nextTracking, nextCarrier);
                              }}
                              disabled={updatingOrderId === order.id}
                              className={`rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 ${updatingOrderId === order.id ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                              {updatingOrderId === order.id ? 'Saving...' : 'Save shipment'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-slate-500">Shipment controls become available after payment is marked as paid.</div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
                <div className="mt-6 space-y-8">
                  <details id="bar-profile" className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-rose-100" open>
                    <summary className="cursor-pointer list-none p-6">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xl font-semibold">{barT.profileTitle}</h3>
                        <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{barT.closeSectionLabel}</span>
                      </div>
                    </summary>
                    <div className="px-6 pb-2">
                      <details className="group rounded-2xl border border-slate-100 bg-slate-50" open>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-700">Cover Image</span>
                          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">&#9660;</span>
                        </summary>
                        <div className="px-4 pb-4">
                          {barProfileDraft.profileImage ? (
                          <div className="aspect-[4/5] max-w-xs">
                            <ProductImage
                              src={barProfileDraft.profileImage}
                              label={barProfileDraft.profileImageName || barT.profileImage}
                              top
                            />
                          </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <label className="inline-flex cursor-pointer items-center rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700">
                              <input type="file" accept="image/*" onChange={handleBarProfileImageUpload} className="hidden" />
                              {barT.chooseImage}
                            </label>
                            <span className="text-xs text-slate-500">
                              {barProfileDraft.profileImageName || barT.noFileSelected}
                            </span>
                          </div>
                          {barProfileDraft.profileImage ? (
                            <div className="mt-1 flex items-center gap-3">
                              <div className="text-[11px] text-slate-400">Image will be cropped to fit — center the important part</div>
                              <button
                                type="button"
                                onClick={() => setBarProfileDraft((prev) => ({ ...prev, profileImage: '', profileImageName: '' }))}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600"
                              >
                                Remove image
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </details>

                      <details className="group mt-3 rounded-2xl border border-slate-100 bg-slate-50" open>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-700">Location &amp; Map</span>
                          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">&#9660;</span>
                        </summary>
                        <div className="grid gap-3 px-4 pb-4">
                          <input value={barProfileDraft.location} onChange={(event) => updateBarProfileField('location', event.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={barT.locationPlaceholder} />
                          <div className="rounded-2xl border border-rose-100 bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{barT.mapLocationTitle}</div>
                            <p className="mt-2 text-xs text-slate-500">
                              {barT.mapLocationInstructions}
                            </p>
                            <input
                              value={barProfileDraft.mapLink || ''}
                              onChange={(event) => updateBarProfileField('mapLink', event.target.value)}
                              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                              placeholder="https://maps.google.com/..."
                            />
                            <button
                              type="button"
                              onClick={autofillBarMapFromLocation}
                              className="mt-2 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                            >
                              {barT.addLocationButton}
                            </button>
                            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-slate-500">
                              <li>{barT.mapStep1}</li>
                              <li>{barT.mapStep2}</li>
                              <li>{barT.mapStep3}</li>
                            </ol>
                            {barProfileDraft.mapEmbedUrl ? (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-emerald-700">✓ Map location set</div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBarProfileDraft((prev) => ({ ...prev, mapLink: '', mapEmbedUrl: '' }));
                                    if (currentBarId && backendStatus === 'connected' && apiAuthToken) {
                                      setDb((prev) => ({
                                        ...prev,
                                        bars: (prev.bars || []).map((bar) => bar.id === currentBarId ? { ...bar, mapLink: '', mapEmbedUrl: '' } : bar),
                                      }));
                                      apiRequestJson(`/api/bars/${encodeURIComponent(currentBarId)}`, { method: 'PUT', body: { mapEmbedUrl: '', mapLink: '' } }).catch((err) => console.warn('[removeBarLocation] API sync failed:', err));
                                    }
                                    setBarProfileMessage('');
                                  }}
                                  className="mt-1 text-xs font-semibold text-rose-600"
                                >
                                  Remove location
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </details>

                      <details className="group mt-3 rounded-2xl border border-slate-100 bg-slate-50" open>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-700">About</span>
                          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">&#9660;</span>
                        </summary>
                        <div className="grid gap-3 px-4 pb-4">
                          <textarea value={barProfileDraft.about} onChange={(event) => updateBarProfileField('about', event.target.value)} className="min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={barT.aboutPlaceholder} />
                          <div className="rounded-2xl border border-rose-100 bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{barT.aboutPresetsTitle}</div>
                            <p className="mt-1 text-xs text-slate-500">{barT.aboutPresetsHelp}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {BAR_PROFILE_TEXT_PRESET_OPTIONS.about.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => appendBarProfilePresetText('about', preset.text[uiLanguage] || preset.text.en)}
                                  className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                                >
                                  {preset.label[uiLanguage] || preset.label.en}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </details>

                      <details className="group mt-3 rounded-2xl border border-slate-100 bg-slate-50" open>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
                          <span className="text-sm font-semibold text-slate-700">Specials &amp; Amenities</span>
                          <span className="text-xs text-slate-400 transition-transform group-open:rotate-180">&#9660;</span>
                        </summary>
                        <div className="grid gap-3 px-4 pb-4">
                          <div className="rounded-2xl border border-rose-100 bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{barT.specialsPresetsTitle}</div>
                            <div className="mt-2 flex flex-nowrap gap-2 overflow-x-auto pb-1">
                              {BAR_PROFILE_TEXT_PRESET_OPTIONS.specials.map((preset) => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => appendBarProfilePresetText('specials', preset.text[uiLanguage] || preset.text.en)}
                                  className="shrink-0 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
                                >
                                  {preset.label[uiLanguage] || preset.label.en}
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea value={barProfileDraft.specials} onChange={(event) => updateBarProfileField('specials', event.target.value)} className="min-h-[90px] rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={barT.specialsPlaceholder} />
                          <div className="rounded-2xl border border-rose-100 bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-500">{barT.quickPicksTitle}</div>
                            <p className="mt-2 text-xs text-slate-500">{barT.quickPicksHelp}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {BAR_PROFILE_SPECIAL_PRESET_OPTIONS.map((option) => {
                                const isActive = barSpecialPresetSelections.includes(option.id);
                                const OptionIcon = option.Icon;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => toggleBarSpecialPreset(option.id)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isActive ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      <OptionIcon className="h-3.5 w-3.5" />
                                      {option.labels?.[uiLanguage] || option.labels?.en || option.id}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </details>
                    </div>
                    <div className="sticky bottom-0 z-10 border-t border-rose-100 bg-white/95 px-6 py-3 backdrop-blur">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={saveBarProfile}
                          disabled={savingBarProfile}
                          className={`rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 ${savingBarProfile ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {savingBarProfile ? barT.saving : barT.saveProfile}
                        </button>
                        {barProfileMessage ? (
                          <div className={`text-sm font-medium ${barProfileMessage === barT.profileSaved ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {barProfileMessage}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </details>
                </div>
                <div className="mt-8 space-y-6">
                  <details id="bar-affiliations" className="overflow-hidden rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100" open>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xl font-semibold">{barT.affiliationsTitle}</h3>
                        <span className="rounded-full border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-700">{barT.closeSectionLabel}</span>
                      </div>
                    </summary>
                    <p className="mt-1 text-sm text-slate-600">{barT.affiliationsSubtitle}</p>
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-800">{barT.pendingRequestsTitle}</div>
                      <div className="mt-3 space-y-2">
                        {barIncomingAffiliationRequests.length === 0 ? (
                          <div className="rounded-2xl bg-white p-3 text-sm text-slate-500 ring-1 ring-rose-100">{barT.noPendingRequests}</div>
                        ) : barIncomingAffiliationRequests.map((request) => {
                          const seller = sellerMap[request.sellerId];
                          return (
                            <div key={request.id} className="rounded-2xl bg-white p-3 ring-1 ring-rose-100">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">{seller?.name || request.sellerId}</div>
                                  <div className="text-xs text-slate-500">{barT.requestedPrefix} {formatDateTimeNoSeconds(request.createdAt || Date.now())}</div>
                                  {String(request?.sellerMessage || '').trim() ? (
                                    <div className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                                      {request.sellerMessage}
                                    </div>
                                  ) : null}
                                  {Array.isArray(request?.sellerImages) && request.sellerImages.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {request.sellerImages.slice(0, 4).map((image) => (
                                        <img
                                          key={image.id || image.image}
                                          src={image.image}
                                          alt={image.imageName || 'Application photo'}
                                          className="h-14 w-14 rounded-lg object-cover ring-1 ring-rose-100"
                                        />
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => navigate(`/seller/${request.sellerId}`)}
                                    className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                                  >
                                    {barT.viewProfile}
                                  </button>
                                  <button
                                    onClick={() => respondToBarAffiliationRequest(request.id, 'approved')}
                                    className="rounded-xl border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700"
                                  >
                                    {barT.approve}
                                  </button>
                                  <button
                                    onClick={() => respondToBarAffiliationRequest(request.id, 'rejected')}
                                    className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                                  >
                                    {barT.reject}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {barProfileMessage ? (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                          {barProfileMessage}
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 rounded-2xl border border-rose-100 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-800">{barT.affiliatedSellersTitle} ({currentBarAffiliatedSellers.length})</div>
                      <div className="mt-3 space-y-2">
                        {currentBarAffiliatedSellers.length === 0 ? (
                          <div className="rounded-2xl bg-white p-3 text-sm text-slate-500 ring-1 ring-rose-100">{barT.noAffiliatedSellers}</div>
                        ) : currentBarAffiliatedSellers.map((seller) => (
                          <div key={seller.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 ring-1 ring-rose-100">
                            <div className="text-sm font-semibold text-slate-800">{seller.name}</div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => navigate(`/seller/${seller.id}`)}
                                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                              >
                                {barT.viewProfile}
                              </button>
                              <button
                                onClick={() => removeSellerFromCurrentBarByBar(seller.id, activeBarIdForDashboard)}
                                className="rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                              >
                                {barT.removeFromBar}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              </>
            )}
          </section>
        ) : null}

        {routeInfo.name === 'account' && currentUser?.role === 'seller' ? (
          <>
            <SellerDashboardPage
            isSeller={isSeller}
            isPendingSeller={isPendingSeller}
            isRejectedSeller={isRejectedSeller}
            uploadDraft={uploadDraft}
            setUploadDraft={setUploadDraft}
            handleUploadFile={handleUploadFile}
            createProductFromUpload={createProductFromUpload}
            sellerMap={sellerMap}
            bars={bars}
            barMap={barMap}
            currentSellerId={currentSellerId}
            currentSellerProfile={currentSellerProfile}
            sellerProfileDraft={sellerProfileDraft}
            updateSellerProfileField={updateSellerProfileField}
            handleSellerProfileImageUpload={handleSellerProfileImageUpload}
            saveSellerProfile={saveSellerProfile}
            isSavingSellerProfile={isSavingSellerProfile}
            sellerProfileSaveSuccess={sellerProfileSaveSuccess}
            requestSellerBarAffiliation={requestSellerBarAffiliation}
            sellerAffiliationRequestDraft={sellerAffiliationRequestDraft}
            updateSellerAffiliationRequestDraftMessage={updateSellerAffiliationRequestDraftMessage}
            handleSellerAffiliationRequestImagesUpload={handleSellerAffiliationRequestImagesUpload}
            removeSellerAffiliationRequestDraftImage={removeSellerAffiliationRequestDraftImage}
            sellerIncomingAffiliationRequests={sellerIncomingAffiliationRequests}
            sellerOutgoingAffiliationRequests={sellerOutgoingAffiliationRequests}
            respondToBarAffiliationRequest={respondToBarAffiliationRequest}
            cancelBarAffiliationRequest={cancelBarAffiliationRequest}
            removeSellerFromCurrentBarBySeller={removeSellerFromCurrentBarBySeller}
            sellerProfileChecklist={sellerProfileChecklist}
            sellerProfileMessage={sellerProfileMessage}
            sellerInbox={sellerInbox}
            sellerMessageHistory={sellerMessageHistory}
            setSellerSelectedConversationId={setSellerSelectedConversationId}
            markNotificationsReadForConversation={markNotificationsReadForConversation}
            sellerActiveConversationId={sellerActiveConversationId}
            sellerActiveConversationMessages={sellerActiveConversationMessages}
            sellerReplyDraft={sellerReplyDraft}
            setSellerReplyDraft={setSellerReplyDraft}
            sendSellerReply={sendSellerReply}
            notifications={notifications}
            userStrikes={userStrikes}
            currentUser={currentUser}
            markAllNotificationsRead={markAllNotificationsRead}
            markNotificationRead={markNotificationRead}
            updateNotificationPreference={updateNotificationPreference}
            updatePushNotificationPreference={updatePushNotificationPreference}
            pushPermission={pushPermission}
            pushSupported={pushSupport.serviceWorker && pushSupport.notification && pushSupport.pushManager}
            sellerDashboardProducts={sellerDashboardProducts}
            soldProductIds={Array.from(soldProductIdSet)}
            sellerDashboardPosts={sellerDashboardPosts}
            publishProduct={publishProduct}
            upsertBundleProduct={upsertBundleProduct}
            deleteProduct={deleteProduct}
            deletingProductId={deletingProductId}
            sellerPostDraft={sellerPostDraft}
            sellerPostDraftSavedAt={sellerPostDraftSavedAt}
            setSellerPostDraft={setSellerPostDraft}
            handleSellerPostImageUpload={handleSellerPostImageUpload}
            createSellerPost={createSellerPost}
            creatingSellerPost={creatingSellerPost}
            deleteSellerPost={deleteSellerPost}
            deletingSellerPostId={deletingSellerPostId}
            sellerLanguage={currentUser?.preferredLanguage || 'en'}
            updateSellerLanguage={updateSellerLanguage}
            isSellerOnline={Boolean(currentSellerProfile?.isOnline)}
            toggleSellerOnlineStatus={toggleSellerOnlineStatus}
            updateSellerPostVisibility={updateSellerPostVisibility}
            updateSellerPostPrice={updateSellerPostPrice}
            updateAllPrivatePostPrices={updateAllPrivatePostPrices}
            unscheduleSellerPost={unscheduleSellerPost}
            publishSellerPostNow={publishSellerPostNow}
            sellerPostAnalytics={sellerPostAnalytics}
            sellerCustomRequests={sellerCustomRequests}
            customRequestMessagesByRequestId={customRequestMessagesByRequestId}
            updateCustomRequestStatus={updateCustomRequestStatus}
            proposeCustomRequestPrice={proposeCustomRequestPrice}
            respondToCustomRequestCounter={respondToCustomRequestCounter}
            toggleCustomRequestBuyerImageUpload={toggleCustomRequestBuyerImageUpload}
            sendCustomRequestMessage={sendCustomRequestMessage}
            accountCredentialForm={accountCredentialForm}
            setAccountCredentialForm={setAccountCredentialForm}
            submitAccountCredentialChanges={submitAccountCredentialChanges}
            accountCredentialSaving={accountCredentialSaving}
            accountCredentialMessage={accountCredentialMessage}
            accountCredentialTone={accountCredentialTone}
            navigate={navigate}
            giftCatalog={db.giftCatalog || []}
            giftPurchases={db.giftPurchases || []}
            giftFulfillmentTasks={db.giftFulfillmentTasks || []}
            startEditProduct={(productId) => { startEditProduct(productId); navigate('/seller-upload'); }}
            editingProductId={editingProductId}
            sellerOrders={sellerOrders}
            updateOrderShipment={updateOrderShipment}
            updatingOrderId={updatingOrderId}
          />
          </>
        ) : null}
        {routeInfo.name === 'seller-messages' ? (
          <SellerMessagesPage
            isSeller={isSeller}
            isPendingSeller={isPendingSeller}
            isRejectedSeller={isRejectedSeller}
            sellerInbox={sellerInbox}
            sellerMessageHistory={sellerMessageHistory}
            setSellerSelectedConversationId={setSellerSelectedConversationId}
            markNotificationsReadForConversation={markNotificationsReadForConversation}
            sellerActiveConversationId={sellerActiveConversationId}
            sellerActiveConversationMessages={sellerActiveConversationMessages}
            sellerReplyDraft={sellerReplyDraft}
            setSellerReplyDraft={setSellerReplyDraft}
            sendSellerReply={sendSellerReply}
            sendBarConversationMessage={sendSellerBarReply}
            sellerReplyMedia={sellerReplyMedia}
            setSellerReplyMedia={setSellerReplyMedia}
            uploadMediaFile={uploadMediaFile}
            validateVideoFile={validateVideoFile}
            barMap={barMap}
            sellerLanguage={currentUser?.preferredLanguage || 'en'}
            currentUser={currentUser}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'buyer-messages' ? (
          <BuyerMessagesPage
            currentUser={currentUser}
            sellerMap={sellerMap}
            barMap={barMap}
            buyerMessageSellerSearch={buyerMessageSellerSearch}
            setBuyerMessageSellerSearch={setBuyerMessageSellerSearch}
            buyerMessageSellerResults={buyerMessageSellerResults}
            buyerMessageProductFilters={buyerMessageProductFilters}
            buyerMessageFilterOptions={buyerMessageFilterOptions}
            updateBuyerMessageProductFilter={updateBuyerMessageProductFilter}
            buyerMessageProductResults={buyerMessageProductResults}
            buyerConversations={buyerConversations}
            buyerDashboardConversationId={buyerDashboardConversationId}
            setBuyerDashboardConversationId={setBuyerDashboardConversationId}
            buyerDashboardConversationMessages={buyerDashboardConversationMessages}
            buyerDashboardMessageDraft={buyerDashboardMessageDraft}
            setBuyerDashboardMessageDraft={setBuyerDashboardMessageDraft}
            sendBuyerDashboardMessage={sendBuyerDashboardMessage}
            buyerDashboardMessageError={buyerDashboardMessageError}
            messageReports={messageReports}
            reportDirectMessage={reportDirectMessage}
            reportingDirectMessageId={reportingDirectMessageId}
            startBuyerConversationWithSeller={startBuyerConversationWithSeller}
            currentWalletBalance={currentWalletBalance}
            uiLanguage={currentUser?.preferredLanguage || 'en'}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'bar-messages' ? (
          <BarMessagesPage
            currentUser={currentUser}
            barMap={barMap}
            barMessageInbox={barMessageInbox}
            barMessageEligibleContacts={barMessageEligibleContacts}
            barMessageActiveConversationId={barMessageActiveConversationId}
            setBarMessageActiveConversationId={setBarMessagesConversationId}
            barMessageActiveConversationMessages={barMessageActiveConversationMessages}
            barReplyDraft={barMessagesDraft}
            setBarReplyDraft={setBarMessagesDraft}
            sendBarConversationMessage={sendBarConversationMessage}
            barConversationMessageError={barMessagesError}
            messageReports={messageReports}
            reportBarConversationMessage={reportBarConversationMessage}
            reportingDirectMessageId={reportingDirectMessageId}
            markNotificationsReadForConversation={markNotificationsReadForConversation}
            uiLanguage={currentUser?.preferredLanguage || 'en'}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'stories-workspace' ? (
          <StoriesWorkspacePage
            isSeller={isSeller}
            isPendingSeller={isPendingSeller}
            isRejectedSeller={isRejectedSeller}
            sellerMap={sellerMap}
            currentSellerId={currentSellerId}
            currentSellerProfile={currentSellerProfile}
            sellerDashboardPosts={sellerDashboardPosts}
            sellerPostDraft={sellerPostDraft}
            sellerPostDraftSavedAt={sellerPostDraftSavedAt}
            setSellerPostDraft={setSellerPostDraft}
            handleSellerPostImageUpload={handleSellerPostImageUpload}
            createSellerPost={createSellerPost}
            creatingSellerPost={creatingSellerPost}
            deleteSellerPost={deleteSellerPost}
            deletingSellerPostId={deletingSellerPostId}
            sellerLanguage={currentUser?.preferredLanguage || 'en'}
            isSellerOnline={Boolean(currentSellerProfile?.isOnline)}
            updateSellerPostVisibility={updateSellerPostVisibility}
            updateSellerPostPrice={updateSellerPostPrice}
            updateAllPrivatePostPrices={updateAllPrivatePostPrices}
            unscheduleSellerPost={unscheduleSellerPost}
            publishSellerPostNow={publishSellerPostNow}
            sellerPostAnalytics={sellerPostAnalytics}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'seller-upload' ? (
          <SellerUploadPage
            isSeller={isSeller}
            isPendingSeller={isPendingSeller}
            isRejectedSeller={isRejectedSeller}
            uploadDraft={uploadDraft}
            setUploadDraft={setUploadDraft}
            handleUploadFile={handleUploadFile}
            createProductFromUpload={createProductFromUpload}
            editingProductId={editingProductId}
            startEditProduct={startEditProduct}
            cancelEditProduct={cancelEditProduct}
            creatingProduct={creatingProduct}
            sellerDashboardProducts={sellerDashboardProducts}
            upsertBundleProduct={upsertBundleProduct}
            publishProduct={publishProduct}
            deleteProduct={deleteProduct}
            deletingProductId={deletingProductId}
            soldProductIds={Array.from(soldProductIdSet)}
            isSellerOnline={Boolean(currentSellerProfile?.isOnline)}
            sellerLanguage={currentUser?.preferredLanguage || 'en'}
            sellerProfileMessage={sellerProfileMessage}
            sellerName={sellerMap[currentSellerId]?.name || ''}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'bar-feed-workspace' ? (
          <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:py-16">
            {!isBar ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-rose-100">
                <Lock className="mx-auto h-10 w-10 text-rose-600" />
                <h2 className="mt-4 text-2xl font-bold">{loginText.barLoginRequiredTitle || 'Bar login required'}</h2>
                <p className="mt-2 text-slate-600">{loginText.barLoginFeedSubtitle || 'Please log in with a bar account to continue.'}</p>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="mt-5 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-700"
                >
                  {loginText.verifyGoToLogin || 'Go to login'}
                </button>
              </div>
            ) : (
              <>
                <SectionTitle
                  eyebrow={barT.barDashboard}
                  title={barT.feedTitle}
                  subtitle={barT.feedSubtitle}
                />
                <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => navigate('/bar-dashboard')}
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
                  >
                    {barT.profileTitle}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white sm:w-auto"
                  >
                    {barT.feedTitle}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/bar-messages')}
                    className="w-full rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-rose-700 sm:w-auto"
                  >
                    {navText.messages}
                  </button>
                  <label className="col-span-2 mt-1 flex items-center justify-end gap-2 text-sm text-slate-600 sm:col-auto sm:ml-auto sm:mt-0">
                    {barT.language}
                    <select
                      value={SUPPORTED_AUTH_LANGUAGES.includes(currentUser?.preferredLanguage) ? currentUser.preferredLanguage : 'en'}
                      onChange={(event) => updateBarLanguage(event.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      {DASHBOARD_LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{localizeOptionLabel(option.label, uiLanguage)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
                  <h3 className="text-xl font-semibold">{barT.feedTitle}</h3>
                  <p className="mt-2 text-sm text-slate-600">{barT.feedSubtitle}</p>
                  <input id="bar-post-image-input" type="file" accept="image/*" onChange={handleBarPostImageUpload} className="sr-only" />
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label htmlFor="bar-post-image-input" className="cursor-pointer rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700">
                      {barT.chooseImage || 'Choose image'}
                    </label>
                    {barPostDraft.image ? (
                      <button type="button" onClick={() => setBarPostDraft((prev) => ({ ...prev, image: '', imageName: '' }))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600">
                        {barT.removeImage || 'Remove image'}
                      </button>
                    ) : null}
                    <span className="text-xs text-slate-500">{barPostDraft.imageName || barT.noFileSelected || 'No file selected'}</span>
                  </div>
                  {barPostDraft.image ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="mb-1 text-[11px] font-medium text-slate-500">Your image</div>
                        <div className="aspect-[4/5] max-w-xs"><ProductImage src={barPostDraft.image} label={barPostDraft.imageName || 'Bar draft image'} contain /></div>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-medium text-slate-500">What visitors will see</div>
                        <div className="aspect-[4/5] max-w-xs"><ProductImage src={barPostDraft.image} label={barPostDraft.imageName || 'Bar draft image'} top /></div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 aspect-[4/5] max-w-xs"><ProductImage label={barT.preview} /></div>
                  )}
                  <textarea value={barPostDraft.caption} onChange={(event) => setBarPostDraft((prev) => ({ ...prev, caption: event.target.value }))} className="mt-4 min-h-[100px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder={barT.feedPlaceholder} />
                  <button onClick={createBarPost} disabled={creatingBarPost} className="mt-3 inline-flex w-auto rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">
                    {creatingBarPost ? barT.posting : barT.postButton}
                  </button>
                  {barProfileMessage ? <div className="mt-3 text-sm font-medium text-rose-700">{barProfileMessage}</div> : null}
                  <div className="mt-5 space-y-3">
                    {barDashboardPosts.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">{barT.noPosts}</div>
                    ) : barDashboardPosts.map((post) => (
                      <article key={post.id} className="rounded-2xl border border-rose-100 p-3">
                        <div className="aspect-[4/5] max-w-xs">
                          <ProductImage src={post.image} label={post.imageName || 'Bar post'} top mediaType={post.mediaType} />
                        </div>
                        <div className="mt-2 text-xs text-slate-500">{formatDateTimeNoSeconds(post.createdAt)}</div>
                        <div className="mt-1 text-sm text-slate-700">{post.caption || barT.noCaption}</div>
                        <button onClick={() => deleteBarPost(post.id)} disabled={deletingBarPostId === post.id} className="mt-2 rounded-xl border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700">
                          {deletingBarPostId === post.id ? barT.deleting : barT.delete}
                        </button>
                      </article>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        ) : null}

        {routeInfo.name === 'admin' ? (
          <AdminPage
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            adminPermissions={adminPermissions}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            products={products}
            users={users}
            orders={orders}
            messages={messages}
            customRequests={customRequests}
            customRequestMessages={customRequestMessages}
            refundClaims={refundClaims}
            orderHelpRequests={orderHelpRequests}
            safetyReports={safetyReports}
            barAffiliationRequests={barAffiliationRequests}
            adminInboxReviews={adminInboxReviews}
            updateAdminInboxReview={updateAdminInboxReview}
            updateRefundClaimDecision={updateRefundClaimDecision}
            respondToBarAffiliationRequest={respondToBarAffiliationRequest}
            adminInboxFilterPresets={adminInboxFilterPresets}
            saveAdminInboxFilterPreset={saveAdminInboxFilterPreset}
            deleteAdminInboxFilterPreset={deleteAdminInboxFilterPreset}
            adminNotes={adminNotes}
            updateAdminNote={updateAdminNote}
            walletTransactions={walletTransactions}
            adminDisputeCases={adminDisputeCases}
            updateAdminDisputeCase={updateAdminDisputeCase}
            updateOrderHelpRequestStatus={updateOrderHelpRequestStatus}
            blocks={blocks}
            adminActions={adminActions}
            pendingSellerApprovals={pendingSellerApprovals}
            pendingSellerCount={pendingSellerApprovals.length}
            adminSellerReviewFilter={adminSellerReviewFilter}
            setAdminSellerReviewFilter={setAdminSellerReviewFilter}
            adminSellerReviewItems={adminSellerReviewItems}
            adminAuthActionMessage={adminAuthActionMessage}
            approveSellerAccount={approveSellerAccount}
            approveAllPendingSellers={approveAllPendingSellers}
            rejectSellerAccount={rejectSellerAccount}
            bars={bars}
            sellers={reconciledSellers}
            updateBarProfileByAdmin={updateBarProfileByAdmin}
            setSellerBarAffiliationByAdmin={setSellerBarAffiliationByAdmin}
            updateSellerNameByAdmin={updateSellerNameByAdmin}
            removeBarByAdmin={removeBarByAdmin}
            toggleAdminBlockUser={toggleAdminBlockUser}
            updateUserCredentialsByAdmin={updateUserCredentialsByAdmin}
            applyAdminWalletAdjustment={applyAdminWalletAdjustment}
            updateUserAdminAccessBySuperAdmin={updateUserAdminAccessBySuperAdmin}
            adminUserSearch={adminUserSearch}
            setAdminUserSearch={setAdminUserSearch}
            adminUserResults={adminUserResults}
            adminSelectedUser={adminSelectedUser}
            setAdminSelectedUserId={setAdminSelectedUserId}
            adminSelectedUserOrderHistory={adminSelectedUserOrderHistory}
            updateOrderShipment={updateOrderShipment}
            updatingOrderId={updatingOrderId}
            adminSelectedUserMessageHistory={adminSelectedUserMessageHistory}
            cancelCustomRequestByAdmin={cancelCustomRequestByAdmin}
            adminSalesSummary={adminSalesSummary}
            sellerSalesRows={sellerSalesRows}
            stripeEvents={stripeEvents}
            sellerPosts={sellerFeedPosts}
            postReports={postReports}
            commentReports={commentReports}
            messageReports={messageReports}
            sellerPostLikes={sellerPostLikes}
            sellerPostComments={sellerPostComments}
            sellerFollows={sellerFollows}
            deleteSellerPost={deleteSellerPost}
            deletingSellerPostId={deletingSellerPostId}
            resolvePostReport={resolvePostReport}
            resolvingPostReportId={resolvingPostReportId}
            resolveAllPostReports={resolveAllPostReports}
            resolvingAllPostReports={resolvingAllPostReports}
            resolveCommentReport={resolveCommentReport}
            resolvingCommentReportId={resolvingCommentReportId}
            resolveAllCommentReports={resolveAllCommentReports}
            resolvingAllCommentReports={resolvingAllCommentReports}
            resolveMessageReport={resolveMessageReport}
            resolvingMessageReportId={resolvingMessageReportId}
            dismissMessageReport={dismissMessageReport}
            dismissingMessageReportId={dismissingMessageReportId}
            resolveAllMessageReports={resolveAllMessageReports}
            resolvingAllMessageReports={resolvingAllMessageReports}
            userStrikes={userStrikes}
            userAppeals={userAppeals}
            reviewUserAppeal={reviewUserAppeal}
            reviewingAppealId={reviewingAppealId}
            emailTemplates={emailTemplates}
            updateEmailTemplate={updateEmailTemplate}
            resetEmailTemplate={resetEmailTemplate}
            sendTestEmailTemplate={sendTestEmailTemplate}
            emailDeliveryLog={emailDeliveryLog}
            adminEmailThreads={adminEmailThreads}
            adminEmailMessages={adminEmailMessages}
            refreshAdminEmailInbox={refreshAdminEmailInbox}
            fetchAdminEmailThreadMessages={fetchAdminEmailThreadMessages}
            sendAdminEmailThreadReply={sendAdminEmailThreadReply}
            sendAdminEmailInboxMessage={sendAdminEmailInboxMessage}
            updateAdminEmailThreadStatus={updateAdminEmailThreadStatus}
            deleteAdminEmailThread={deleteAdminEmailThread}
            getAdminEmailInboxHealth={getAdminEmailInboxHealth}
            listAdminEmailSuppressions={listAdminEmailSuppressions}
            addAdminEmailSuppression={addAdminEmailSuppression}
            removeAdminEmailSuppression={removeAdminEmailSuppression}
            downloadAdminEmailAttachment={downloadAdminEmailAttachment}
            sellerMap={sellerMap}
            currentUser={currentUser}
            sendTestBrowserNotification={sendTestBrowserNotification}
            navigate={navigate}
            CMS_SCHEMA={CMS_SCHEMA}
            NEXTJS_EXPORT_BLUEPRINT={NEXTJS_EXPORT_BLUEPRINT}
            SEO_CONFIG={SEO_CONFIG}
            promptPayReceiverMobile={promptPayReceiverMobile}
            updatePromptPayReceiverMobile={updatePromptPayReceiverMobile}
            payoutRuns={payoutRuns}
            payoutItems={payoutItems}
            payoutEvents={payoutEvents}
            createMonthlyPayoutRun={createMonthlyPayoutRun}
            markPayoutItemSent={markPayoutItemSent}
            markPayoutItemFailed={markPayoutItemFailed}
            appMode={appMode}
            switchAppMode={switchAppMode}
            onImpersonateUser={handleAdminImpersonate}
            giftCatalog={db.giftCatalog || []}
            giftPurchases={db.giftPurchases || []}
            giftFulfillmentTasks={db.giftFulfillmentTasks || []}
            updateGiftCatalogItem={updateGiftCatalogItem}
          />
        ) : null}

        {routeInfo.name === 'checkout' ? (
          <CheckoutPage
            setCheckoutAuthModalOpen={setCheckoutAuthModalOpen}
            currentUser={currentUser}
            checkoutStep={checkoutStep}
            setCheckoutStep={setCheckoutStep}
            buyerEmail={buyerEmail}
            setBuyerEmail={setBuyerEmail}
            checkoutForm={checkoutForm}
            shippingCountryOptions={ISO_COUNTRIES}
            updateCheckoutField={updateCheckoutField}
            currentWalletBalance={currentWalletBalance}
            runWalletCheckout={runWalletCheckout}
            checkoutError={checkoutError}
            cartItems={cartItems}
            sellerMap={sellerMap}
            removeFromCart={removeFromCart}
            onContinueShopping={() => navigate('/find')}
            checkoutBundleSuggestion={checkoutBundleSuggestion}
            onExploreBundle={(bundle) => {
              if (!bundle?.slug) return;
              navigate(`/product/${bundle.slug}`);
            }}
            onAddBundleFromCheckout={(bundle, selectedItem) => addBundleToCartFromSingleItem(bundle?.id, selectedItem?.id)}
            subtotal={subtotal}
            shippingRates={shippingRates}
            shippingZoneLabel={shippingBaseRates.zoneLabel}
            shippingSupported={shippingSupported}
            shippingFee={shippingFee}
            shippingStandardDays={shippingBaseRates.standardDays}
            shippingExpressDays={shippingBaseRates.expressDays}
            onMoreShipping={() => navigate('/faq')}
            total={total}
            checkoutAuthModalOpen={checkoutAuthModalOpen}
            onOpenLogin={() => navigate('/login')}
            onOpenRegister={() => navigate('/register')}
            onOpenWalletTopUp={openWalletTopUpFromCheckout}
            runWalletTopUp={runWalletTopUp}
            walletStatus={walletStatus}
            exchangeRate={exchangeRate}
          />
        ) : null}

        {routeInfo.name === 'checkout-success' ? (
          <section className="mx-auto max-w-4xl px-6 py-16">
            {checkoutSuccessPopup ? (
              <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4">
                <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-slate-800 shadow-2xl ring-1 ring-rose-100">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
                    <div className="flex-1">
                      <h3 className="text-xl font-bold tracking-tight">Payment successful</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Your order <span className="font-semibold text-slate-800">{checkoutSuccessPopup.orderId}</span> has been placed.
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Confirmation email: <span className="font-semibold text-slate-800">{checkoutSuccessPopup.receiptEmail || 'saved account email'}</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        We will notify you when your order ships, including your tracking number and carrier details.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutSuccessPopup(null);
                        navigate(primaryShellRoute);
                      }}
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      View account
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutSuccessPopup(null)}
                      className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="rounded-[2rem] bg-white p-10 text-center shadow-xl ring-1 ring-rose-100">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-5 text-3xl font-bold tracking-tight">Order placed</h2>
              <p className="mt-3 text-slate-600">Your checkout completed successfully and your order is now in processing.</p>
              <div className="mx-auto mt-5 max-w-2xl rounded-2xl bg-slate-50 p-4 text-left text-sm text-slate-700">
                <div className="font-semibold text-slate-900">What happens next</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Your order will be processed and shipped within 1-3 business days.</li>
                  <li>You will receive an email notification as soon as your order ships.</li>
                  <li>Your tracking number and carrier details will appear in your account order card.</li>
                </ul>
              </div>
              <button onClick={() => navigate(primaryShellRoute)} className="mt-6 rounded-2xl border border-rose-200 px-6 py-3 font-semibold text-rose-700">View account</button>
            </div>
          </section>
        ) : null}

        {routeInfo.name === 'wallet-top-up-complete' ? (
          <WalletTopUpReturnPage apiRequestJson={apiRequestJson} navigate={navigate} primaryShellRoute={primaryShellRoute} setDb={setDb} normalizeDbState={normalizeDbState} appMode={appMode} userId={session.userId} />
        ) : null}

        {routeInfo.name === 'wallet-top-up-cancelled' ? (
          <section className="mx-auto max-w-4xl px-6 py-16">
            <div className="rounded-[2rem] bg-white p-10 text-center shadow-xl ring-1 ring-rose-100">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-2xl font-bold">!</div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">Top-up cancelled</h2>
              <p className="mt-3 text-slate-600">You cancelled the payment. No charge has been made to your card.</p>
              <button onClick={() => navigate(primaryShellRoute)} className="mt-6 rounded-2xl border border-rose-200 px-6 py-3 font-semibold text-rose-700">Return to account</button>
            </div>
          </section>
        ) : null}

        {routeInfo.name === 'wallet-top-up-failed' ? (
          <section className="mx-auto max-w-4xl px-6 py-16">
            <div className="rounded-[2rem] bg-white p-10 text-center shadow-xl ring-1 ring-rose-100">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 text-2xl font-bold">&times;</div>
              <h2 className="mt-5 text-3xl font-bold tracking-tight">Top-up failed</h2>
              <p className="mt-3 text-slate-600">The payment could not be processed. Please try again or use a different payment method.</p>
              <button onClick={() => navigate(primaryShellRoute)} className="mt-6 rounded-2xl border border-rose-200 px-6 py-3 font-semibold text-rose-700">Return to account</button>
            </div>
          </section>
        ) : null}

        {routeInfo.name === 'login' ? (
          <PageShell title={loginText.title} subtitle={loginText.subtitle}>
            <form onSubmit={loginWithCredentials} className="mx-auto max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
              <label className="block text-sm font-medium text-slate-700">
                {loginText.language}
                <select
                  value={authLanguage}
                  onChange={(event) => setAuthLanguage(normalizeAuthLanguage(event.target.value))}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <option value="en">{localizeOptionLabel("English", authLanguage)}</option>
                  <option value="th">{localizeOptionLabel("Thai", authLanguage)}</option>
                  <option value="my">{localizeOptionLabel("Burmese", authLanguage)}</option>
                  <option value="ru">{localizeOptionLabel("Russian", authLanguage)}</option>
                </select>
              </label>
              <input
                value={loginForm.email}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
                type="email"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                placeholder={loginText.email}
              />
              <input
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                type={showLoginPassword ? "text" : "password"}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                placeholder={loginText.password}
              />
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="block text-sm font-semibold text-rose-700 hover:text-rose-800"
                  aria-label={showLoginPassword ? loginText.hidePassword : loginText.showPassword}
                >
                  {showLoginPassword ? loginText.hidePassword : loginText.showPassword}
                </button>
                <button
                  type="button"
                  onClick={resendVerificationEmailForLogin}
                  disabled={authResendVerificationSending}
                  className={`block text-left text-sm font-semibold text-rose-700 hover:text-rose-800 ${
                    authResendVerificationSending ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                >
                  {authResendVerificationSending
                    ? (loginText.resendSending || 'Sending verification email...')
                    : (loginText.resendButton || 'Resend verification email')}
                </button>
              </div>
              {authError ? <div key={authErrorRefreshKey} className="text-sm font-medium text-rose-700">{authError}</div> : null}
              {authSuccess ? <div className="text-sm font-medium text-emerald-700">{authSuccess}</div> : null}
              <button
                type="submit"
                disabled={authSubmitting}
                className={`w-full rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white ${authSubmitting ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                {authSubmitting ? `${loginText.submit}...` : loginText.submit}
              </button>
              <button type="button" onClick={() => navigate('/register')} className="w-full rounded-2xl border border-rose-200 px-5 py-3 font-semibold text-rose-700">{loginText.registerCta}</button>
            </form>
          </PageShell>
        ) : null}

        {routeInfo.name === 'verify-email' ? (
          <PageShell
            title={loginText.verifyTitle || 'Verify email'}
            subtitle={loginText.verifySubtitle || 'Confirm your account email to complete registration'}
          >
            <div className="mx-auto max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
              <div className={`rounded-2xl border px-4 py-3 text-sm ${
                emailVerificationStatus.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : emailVerificationStatus.tone === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}>
                {emailVerificationStatus.message || loginText.verifyPreparing || 'Preparing verification...'}
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                disabled={emailVerificationStatus.loading}
                className={`w-full rounded-2xl border border-rose-200 px-5 py-3 font-semibold text-rose-700 ${
                  emailVerificationStatus.loading ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                {loginText.verifyGoToLogin || 'Go to login'}
              </button>
              <button
                type="button"
                onClick={resendVerificationEmailForVerifyPage}
                disabled={authResendVerificationSending}
                className={`w-full rounded-2xl border border-rose-200 px-5 py-3 font-semibold text-rose-700 ${
                  authResendVerificationSending ? 'cursor-not-allowed opacity-60' : ''
                }`}
              >
                {authResendVerificationSending
                  ? (loginText.resendSending || 'Sending verification email...')
                  : (loginText.resendButton || 'Resend verification email')}
              </button>
            </div>
          </PageShell>
        ) : null}

        {routeInfo.name === 'register' ? (
          <PageShell title={registerText.title} subtitle={registerText.subtitle}>
            {registrationSuccessPopup ? (
              <div ref={registrationSuccessCardRef} className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100 space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-700">{registerText.successPopupTitle || 'Account created successfully!'}</div>
                  <div className="mt-2 text-sm text-slate-600">
                    {(registrationSuccessPopup.role === 'seller' || registrationSuccessPopup.role === 'bar')
                      ? (registerText.successPopupSaveCredentialsSignedIn || registerText.successPopupSaveCredentials || 'Save these credentials. You will need them to log in.')
                      : (registerText.successPopupSaveCredentials || 'Save these credentials. You will need them to log in.')}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    {registerText.successPopupEmail || 'Your email'}
                    <div className="mt-1 flex items-center gap-2">
                      <input readOnly value={registrationSuccessPopup.email} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm select-all" onClick={(e) => e.target.select()} />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(registrationSuccessPopup.email);
                          triggerRegistrationCopyFlash('email');
                        }}
                        className="inline-flex min-w-[5.5rem] shrink-0 justify-center rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                      >
                        {registrationCopyFlash.email ? (registerText.successPopupCopied || 'Copied!') : (registerText.successPopupCopy || 'Copy')}
                      </button>
                    </div>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    {registerText.successPopupPassword || 'Your password'}
                    <div className="mt-1 flex items-center gap-2">
                      <input readOnly value={registrationSuccessPopup.password} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm select-all" onClick={(e) => e.target.select()} />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(registrationSuccessPopup.password);
                          triggerRegistrationCopyFlash('password');
                        }}
                        className="inline-flex min-w-[5.5rem] shrink-0 justify-center rounded-xl bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                      >
                        {registrationCopyFlash.password ? (registerText.successPopupCopied || 'Copied!') : (registerText.successPopupCopy || 'Copy')}
                      </button>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `${registrationSuccessPopup.email}\n${registrationSuccessPopup.password}`;
                      navigator.clipboard.writeText(text);
                      triggerRegistrationCopyFlash('email');
                      triggerRegistrationCopyFlash('password');
                    }}
                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    {registerText.successPopupCopyBoth || 'Copy email & password'}
                  </button>
                </div>
                {registrationSuccessPopup.role !== 'seller' && registrationSuccessPopup.role !== 'bar' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="mr-1.5 inline-block text-base">✉️</span>
                    {registerText.successPopupVerifyEmail || 'We sent a verification email to your address. Please check your inbox (and spam folder) and click the link to verify before logging in.'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const savedEmail = registrationSuccessPopup.email;
                    const role = registrationSuccessPopup.role;
                    setRegistrationSuccessPopup(null);
                    setRegisterForm({ name: '', email: '', password: '', confirmPassword: '', role: '', city: '', country: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', hairColor: '', braSize: '', pantySize: '', acceptedRespectfulConduct: false, acceptedNoRefunds: false });
                    setRegisterStep(1);
                    setRegisterStepError('');
                    if (role === 'seller' || role === 'bar') {
                      navigate(role === 'seller' ? '/seller-dashboard' : '/bar-dashboard');
                    } else {
                      setLoginForm({ email: savedEmail, password: '' });
                      navigate('/login');
                    }
                    setTimeout(() => window.scrollTo(0, 0), 50);
                  }}
                  className="w-full rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white"
                >
                  {(registrationSuccessPopup.role === 'seller' || registrationSuccessPopup.role === 'bar')
                    ? (registerText.successPopupContinue || 'Continue')
                    : (registerText.successPopupGoToLoginVerified || registerText.successPopupGoToLogin || "I've verified — go to login")}
                </button>
              </div>
            ) : (
            <form onSubmit={registerAccount} noValidate className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-md ring-1 ring-rose-100">
              {/* Progress bar — only shown once role is chosen */}
              {registerForm.role ? (
                <div className="mb-5 flex items-center gap-1.5">
                  {Array.from({ length: registerTotalSteps }, (_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i + 1 <= registerStep ? 'bg-rose-500' : 'bg-slate-200'}`} />
                  ))}
                </div>
              ) : null}
              {/* Step counter + title */}
              <div className="mb-5">
                {registerForm.role ? (
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {registerStep} / {registerTotalSteps}
                  </div>
                ) : null}
                <div className="text-xl font-bold text-slate-800">
                  {(() => {
                    const t = registerText;
                    if (registerStep === 1) return t.accountTypePlaceholder || 'Account type';
                    if (registerStep === 2) return t.stepDetails || 'Your details';
                    if (registerStep === 3) return t.stepPassword || 'Create a password';
                    if (registerStep === 4) return registerForm.role === 'buyer' ? (t.stepTerms || 'Terms & agreement') : (t.stepLocation || 'Your location');
                    if (registerStep === 5) return registerForm.role === 'bar' ? (t.stepTerms || 'Terms & agreement') : (t.stepPantySize || 'Your panty size');
                    return t.stepTerms || 'Terms & agreement';
                  })()}
                </div>
              </div>

              {/* ── Step 1: Language + Role ── */}
              {registerStep === 1 ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-700">
                    {registerText.language}
                    <select
                      value={authLanguage}
                      onChange={(event) => setAuthLanguage(normalizeAuthLanguage(event.target.value))}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <option value="en">{localizeOptionLabel("English", authLanguage)}</option>
                      <option value="th">{localizeOptionLabel("Thai", authLanguage)}</option>
                      <option value="my">{localizeOptionLabel("Burmese", authLanguage)}</option>
                      <option value="ru">{localizeOptionLabel("Russian", authLanguage)}</option>
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    {registerText.accountTypePlaceholder || 'Account type'}
                    <select
                      value={registerForm.role}
                      onChange={(event) => {
                        setRegisterForm((prev) => ({ ...prev, role: event.target.value }));
                        setRegisterStep(1);
                        setRegisterStepError('');
                        setAuthError('');
                      }}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <option value="">{localizeOptionLabel("Select account type", authLanguage)}</option>
                      <option value="buyer">{localizeOptionLabel("I want to buy used panties", authLanguage)}</option>
                      <option value="seller">{localizeOptionLabel("I want to sell my used panties", authLanguage)}</option>
                      <option value="bar">{localizeOptionLabel("I'm a bar or venue", authLanguage)}</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {/* ── Step 2: Details (name + email) ── */}
              {registerStep === 2 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    {registerText.emailPrepText || 'You will need a working email address to create your account. If you do not have one, you can get a free email at'}{' '}
                    <a href="https://gmail.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">gmail.com</a>
                    {registerText.emailPrepTextSuffix || '. Please have your email address ready before continuing.'}
                  </div>
                  <label className="block text-sm font-medium text-slate-600">
                    {registerForm.role === 'bar' ? 'Bar name' : (registerText.fullName || 'Name')}
                    <input
                      value={registerForm.name}
                      onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                      placeholder={registerForm.role === 'seller' ? 'e.g. Nina R.' : registerForm.role === 'bar' ? 'e.g. Small World' : ''}
                      autoComplete="name"
                    />
                  </label>
                  {registerForm.role === 'seller' && registerText.sellerNameHint ? (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{registerText.sellerNameHint}</div>
                  ) : null}
                  {registerForm.role === 'bar' && registerText.barNameHint ? (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{registerText.barNameHint}</div>
                  ) : null}
                  <label className="block text-sm font-medium text-slate-600">
                    {registerText.email || 'Email'}
                    <input
                      value={registerForm.email}
                      onChange={(event) => setRegisterForm((prev) => ({ ...prev, email: event.target.value }))}
                      type="email"
                      autoComplete="email"
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                      placeholder={registerText.email}
                    />
                  </label>
                </div>
              ) : null}

              {/* ── Step 3: Password ── */}
              {registerStep === 3 ? (
                <div className="space-y-4">
                  {registerText.passwordStepIntro ? (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{registerText.passwordStepIntro}</div>
                  ) : null}
                  <label className="block text-sm font-medium text-slate-600">
                    {registerText.password || 'Password'}
                    <div className="relative mt-1">
                      <input
                        value={registerForm.password}
                        onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                        type={showRegisterPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-20"
                        placeholder={registerText.password}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        {showRegisterPassword ? (registerText.hidePassword || 'Hide') : (registerText.showPassword || 'Show')}
                      </button>
                    </div>
                  </label>
                  <label className="block text-sm font-medium text-slate-600">
                    {registerText.confirmPassword || 'Confirm password'}
                    <input
                      value={registerForm.confirmPassword}
                      onChange={(event) => setRegisterForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      type={showRegisterPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                      placeholder={registerText.confirmPassword || 'Confirm password'}
                    />
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      {registerText.passwordRequirementsHint || 'Use at least 8 characters with 1 number and 1 symbol.'}
                    </div>
                    <div className="mt-2 space-y-1.5 text-xs">
                      {registerPasswordChecks.map((check) => (
                        <div key={check.key} className={check.passed ? 'text-emerald-700' : 'text-rose-700'}>
                          {check.passed ? '✓' : '✕'} {check.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ── Step 4a: Location (seller / bar) ── */}
              {registerStep === 4 && (registerForm.role === 'seller' || registerForm.role === 'bar') ? (
                <div className="space-y-4">
                  {(() => {
                    const countryList = SELLER_BAR_REGISTRATION_COUNTRIES;
                    return (
                      <>
                        <label className="block text-sm font-medium text-slate-600">
                          {registerText.country || 'Country'}
                          <select
                            value={countryList.includes(registerForm.country) ? registerForm.country : (registerForm.country ? 'Other' : '')}
                            onChange={(event) => {
                              const val = event.target.value;
                              if (val === 'Other') {
                                setRegisterForm((prev) => ({ ...prev, country: '', city: '' }));
                              } else {
                                setRegisterForm((prev) => ({ ...prev, country: val, city: '' }));
                              }
                            }}
                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                          >
                            <option value="">{localizeOptionLabel("Select country", authLanguage)}</option>
                            {countryList.map((c) => <option key={c} value={c}>{localizeOptionLabel(c, authLanguage)}</option>)}
                          </select>
                        </label>
                        {!countryList.filter((c) => c !== 'Other').includes(registerForm.country) ? (
                          <input
                            value={registerForm.country === 'Other' ? '' : registerForm.country}
                            onChange={(event) => setRegisterForm((prev) => ({ ...prev, country: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                            placeholder={localizeOptionLabel("Type your country", authLanguage)}
                          />
                        ) : null}
                      </>
                    );
                  })()}
                  {(() => {
                    const cities = REGISTRATION_CITIES_BY_COUNTRY[registerForm.country] || [];
                    if (cities.length === 0) {
                      return (
                        <label className="block text-sm font-medium text-slate-600">
                          {registerText.city || 'City'}
                          <input
                            value={registerForm.city}
                            onChange={(event) => setRegisterForm((prev) => ({ ...prev, city: event.target.value }))}
                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                            placeholder={registerForm.country ? localizeOptionLabel("Type your city", authLanguage) : registerText.city}
                          />
                        </label>
                      );
                    }
                    return (
                      <>
                        <label className="block text-sm font-medium text-slate-600">
                          {registerText.city || 'City'}
                          <select
                            value={cities.includes(registerForm.city) ? registerForm.city : (registerForm.city ? 'Other' : '')}
                            onChange={(event) => {
                              const val = event.target.value;
                              setRegisterForm((prev) => ({ ...prev, city: val === 'Other' ? '' : val }));
                            }}
                            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3"
                          >
                            <option value="">{localizeOptionLabel("Select city", authLanguage)}</option>
                            {cities.map((city) => <option key={city} value={city}>{localizeOptionLabel(city, authLanguage)}</option>)}
                            <option value="Other">{localizeOptionLabel("Other", authLanguage)}</option>
                          </select>
                        </label>
                        {!cities.includes(registerForm.city) ? (
                          <input
                            value={registerForm.city}
                            onChange={(event) => setRegisterForm((prev) => ({ ...prev, city: event.target.value }))}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                            placeholder={localizeOptionLabel("Type your city", authLanguage)}
                          />
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              ) : null}

              {/* ── Step 4b: Terms (buyer) ── */}
              {registerStep === 4 && registerForm.role === 'buyer' ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
                  <div className="text-sm font-semibold text-rose-800">{registerText.buyerTermsTitle || 'Buyer terms acceptance'}</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate('/community-standards')} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">{registerText.viewCommunityStandards || 'View Community Standards'}</button>
                    <button type="button" onClick={() => navigate('/refund-policy')} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">{registerText.viewRefundPolicy || 'View Refund Policy'}</button>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(registerForm.acceptedRespectfulConduct)} onChange={(event) => setRegisterForm((prev) => ({ ...prev, acceptedRespectfulConduct: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-rose-600" />
                    <span>{registerText.buyerRespectfulCheckbox || 'I agree to be respectful in messages and interactions.'}</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(registerForm.acceptedNoRefunds)} onChange={(event) => setRegisterForm((prev) => ({ ...prev, acceptedNoRefunds: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-rose-600" />
                    <span>{registerText.buyerNoRefundCheckbox || 'I understand purchases are final, except wrong-item orders may be eligible for correction or refund review.'}</span>
                  </label>
                </div>
              ) : null}

              {/* ── Step 5a: Measurements (seller — panty size required, rest optional) ── */}
              {registerStep === 5 && registerForm.role === 'seller' ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    {registerText.sellerBodyInfoHint || 'Select your panty size to get started. You can add more details to your profile later.'}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div>
                      <label className="block text-sm text-slate-600">
                        <span className="font-medium">{registerText.pantySizeLabel || 'Panty size'} <span className="text-rose-500">*</span></span>
                        <select value={registerForm.pantySize} onChange={(event) => setRegisterForm((prev) => ({ ...prev, pantySize: event.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                          <option value="">{registerText.selectPantySize || 'Select panty size'}</option>
                          {PANTY_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </label>
                      <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{registerText.pantySizeHint || 'Thai panty sizes run one size larger than US/European. If you are M in Thailand, select S here.'}</div>
                    </div>
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-rose-600">Add more details (optional) <span className="text-xs text-slate-400 group-open:hidden">&#9654;</span><span className="text-xs text-slate-400 hidden group-open:inline">&#9660;</span></summary>
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="grid gap-1 text-sm text-slate-600">
                            <span className="font-medium">{registerText.heightLabel || 'Height'}</span>
                            <div className="flex gap-2">
                              <input value={registerForm.height} onChange={(event) => setRegisterForm((prev) => ({ ...prev, height: event.target.value }))} type="number" min="0" className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder={registerForm.heightUnit === 'cm' ? '165' : '65'} />
                              <select value={registerForm.heightUnit} onChange={(event) => setRegisterForm((prev) => ({ ...prev, heightUnit: event.target.value }))} className="rounded-2xl border border-slate-200 px-2 py-2 text-sm">
                                <option value="cm">cm</option>
                                <option value="in">in</option>
                              </select>
                            </div>
                          </label>
                          <label className="grid gap-1 text-sm text-slate-600">
                            <span className="font-medium">{registerText.weightLabel || 'Weight'}</span>
                            <div className="flex gap-2">
                              <input value={registerForm.weight} onChange={(event) => setRegisterForm((prev) => ({ ...prev, weight: event.target.value }))} type="number" min="0" className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder={registerForm.weightUnit === 'kg' ? '55' : '121'} />
                              <select value={registerForm.weightUnit} onChange={(event) => setRegisterForm((prev) => ({ ...prev, weightUnit: event.target.value }))} className="rounded-2xl border border-slate-200 px-2 py-2 text-sm">
                                <option value="kg">{localizeOptionLabel("kg", authLanguage)}</option>
                                <option value="lbs">{localizeOptionLabel("lbs", authLanguage)}</option>
                              </select>
                            </div>
                          </label>
                        </div>
                        <label className="block text-sm text-slate-600">
                          <span className="font-medium">{registerText.hairColorLabel || 'Hair color'}</span>
                          <select value={registerForm.hairColor} onChange={(event) => setRegisterForm((prev) => ({ ...prev, hairColor: event.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                            <option value="">{registerText.selectHairColor || 'Select hair color'}</option>
                            {HAIR_COLOR_OPTIONS.map((color) => <option key={color} value={color}>{localizeOptionLabel(color, authLanguage)}</option>)}
                          </select>
                        </label>
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-600">{registerText.braSizeLabel || 'Bra size'}</span>
                            <button type="button" onClick={() => { setUseBraThaiSizing(true); setRegisterForm((prev) => ({ ...prev, braSize: '' })); setThaiBraBand(''); setThaiBraCup(''); }} className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${useBraThaiSizing ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{registerText.thaiBraSizes || 'Thai sizes (cm)'}</button>
                            <button type="button" onClick={() => { setUseBraThaiSizing(false); setRegisterForm((prev) => ({ ...prev, braSize: '' })); setThaiBraBand(''); setThaiBraCup(''); }} className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${!useBraThaiSizing ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{registerText.usBraSizes || 'US sizes'}</button>
                          </div>
                          {useBraThaiSizing ? (
                            <div className="grid grid-cols-2 gap-2">
                              <select value={thaiBraBand} onChange={(event) => { const band = event.target.value; setThaiBraBand(band); if (band && thaiBraCup) { setRegisterForm((prev) => ({ ...prev, braSize: THAI_TO_US_BRA_SIZE_MAP[band + thaiBraCup] || '' })); } else { setRegisterForm((prev) => ({ ...prev, braSize: '' })); } }} className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm">
                                <option value="">{localizeOptionLabel("Select band size", authLanguage)}</option>
                                {THAI_BRA_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
                              </select>
                              <select value={thaiBraCup} onChange={(event) => { const cup = event.target.value; setThaiBraCup(cup); if (thaiBraBand && cup) { setRegisterForm((prev) => ({ ...prev, braSize: THAI_TO_US_BRA_SIZE_MAP[thaiBraBand + cup] || '' })); } else { setRegisterForm((prev) => ({ ...prev, braSize: '' })); } }} className="w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm">
                                <option value="">{localizeOptionLabel("Select cup", authLanguage)}</option>
                                {THAI_BRA_CUPS.map((cup) => { const span = THAI_BRA_CUP_CM_SPAN[cup]; return (<option key={cup} value={cup}>{cup}{span ? ` (${span})` : ''}</option>); })}
                              </select>
                            </div>
                          ) : null}
                          {useBraThaiSizing && registerText.thaiBraCupDifferenceHint ? (
                            <div className="mt-2 text-xs text-slate-500">{registerText.thaiBraCupDifferenceHint}</div>
                          ) : null}
                          {!useBraThaiSizing ? (
                            <select value={registerForm.braSize} onChange={(event) => setRegisterForm((prev) => ({ ...prev, braSize: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                              <option value="">{registerText.selectBraSize || 'Select bra size'}</option>
                              {BRA_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
                            </select>
                          ) : null}
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              ) : null}

              {/* ── Step 5b: Terms (bar) ── */}
              {registerStep === 5 && registerForm.role === 'bar' ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
                  <div className="text-sm font-semibold text-rose-800">{registerText.barTermsTitle || 'Bar terms acceptance'}</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate('/community-standards')} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">{registerText.viewCommunityStandards || 'View Community Standards'}</button>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(registerForm.acceptedRespectfulConduct)} onChange={(event) => setRegisterForm((prev) => ({ ...prev, acceptedRespectfulConduct: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-rose-600" />
                    <span>{registerText.barRespectfulCheckbox || 'I agree to be respectful in all communications and interactions.'}</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(registerForm.acceptedNoRefunds)} onChange={(event) => setRegisterForm((prev) => ({ ...prev, acceptedNoRefunds: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-rose-600" />
                    <span>{registerText.barServiceCheckbox || 'I understand that as a bar, I am responsible for fulfilling gift delivery orders in a timely manner.'}</span>
                  </label>
                </div>
              ) : null}

              {/* ── Step 6: Terms (seller) ── */}
              {registerStep === 6 && registerForm.role === 'seller' ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-3">
                  <div className="text-sm font-semibold text-rose-800">{registerText.sellerTermsTitle || 'Seller terms acceptance'}</div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate('/community-standards')} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">{registerText.viewCommunityStandards || 'View Community Standards'}</button>
                    <button type="button" onClick={() => navigate('/refund-policy')} className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50">{registerText.viewRefundPolicy || 'View Refund Policy'}</button>
                  </div>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(registerForm.acceptedRespectfulConduct)} onChange={(event) => setRegisterForm((prev) => ({ ...prev, acceptedRespectfulConduct: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-rose-600" />
                    <span>{registerText.sellerRespectfulCheckbox || 'I agree to be respectful in messages and interactions.'}</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={Boolean(registerForm.acceptedNoRefunds)} onChange={(event) => setRegisterForm((prev) => ({ ...prev, acceptedNoRefunds: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-rose-600" />
                    <span>{registerText.sellerWrongItemPolicyCheckbox || 'I understand that if I ship the wrong item, I must reship the correct item at my own expense, or the buyer may be refunded and my commission may be deducted.'}</span>
                  </label>
                </div>
              ) : null}

              {/* Error / success messages */}
              {registerStepError ? <div className="mt-3 text-sm font-medium text-rose-700">{registerStepError}</div> : null}
              {authError ? <div className="mt-2 text-sm font-medium text-rose-700">{authError}</div> : null}
              {authSuccess ? <div className="mt-2 text-sm font-medium text-emerald-700">{authSuccess}</div> : null}

              {/* Navigation: Back + Next / Create Account */}
              <div className="mt-5 flex gap-3">
                {registerStep > 1 ? (
                  <button type="button" onClick={goBackStep} className="flex-1 rounded-2xl border border-rose-200 px-5 py-3 font-semibold text-rose-700">
                    {registerText.back || 'Back'}
                  </button>
                ) : null}
                {isLastRegisterStep ? (
                  <button type="submit" disabled={isRegistering} className={`flex-1 rounded-2xl px-5 py-3 font-semibold text-white ${isRegistering ? 'bg-rose-300 cursor-not-allowed' : 'bg-rose-600'}`}>
                    {isRegistering ? '...' : registerText.createAccount}
                  </button>
                ) : (
                  <button type="button" onClick={goNextStep} className="flex-1 rounded-2xl bg-rose-600 px-5 py-3 font-semibold text-white">
                    {registerText.next || 'Next'}
                  </button>
                )}
              </div>


              <button type="button" onClick={() => navigate('/login')} className="mt-3 w-full rounded-2xl border border-rose-200 px-5 py-3 font-semibold text-rose-700">{registerText.haveAccount}</button>
            </form>
            )}
          </PageShell>
        ) : null}

        {routeInfo.name === 'account' && currentUser?.role !== 'seller' && currentUser?.role !== 'bar' ? (
          <>
            <AccountPage
            currentUser={currentUser}
            buyerOrders={buyerOrders}
            recentBuyerOrders={recentBuyerOrders}
            buyerCustomRequests={buyerCustomRequests}
            customRequestMessagesByRequestId={customRequestMessagesByRequestId}
            products={products}
            sellerMap={sellerMap}
            barMap={barMap}
            buyerConversations={buyerConversations}
            sellerFollows={sellerFollows}
            barFollows={barFollows}
            toggleSellerFollow={toggleSellerFollow}
            toggleBarFollow={toggleBarFollow}
            accountForm={accountForm}
            updateAccountField={updateAccountField}
            isoCountries={ISO_COUNTRIES}
            saveAccountDetails={saveAccountDetails}
            accountSaveMessage={accountSaveMessage}
            currentWalletBalance={currentWalletBalance}
            runWalletTopUp={runWalletTopUp}
            walletStatus={walletStatus}
            topUpAmount={topUpAmount}
            walletTopUpContext={walletTopUpContext}
            clearWalletTopUpContext={() => setWalletTopUpContext(null)}
            exchangeRate={exchangeRate}
            markAllNotificationsRead={markAllNotificationsRead}
            markNotificationRead={markNotificationRead}
            buyerLedger={buyerLedger}
            buyerSellerDirectory={buyerSellerDirectory}
            accountSearchQuery={accountSearchQuery}
            setAccountSearchQuery={setAccountSearchQuery}
            quickSellerResults={quickSellerResults}
            quickProductResults={quickProductResults}
            quickBarResults={quickBarResults}
            watchedProducts={watchedProducts}
            toggleProductWatch={toggleProductWatch}
            buyerMessageSellerSearch={buyerMessageSellerSearch}
            setBuyerMessageSellerSearch={setBuyerMessageSellerSearch}
            buyerMessageSellerResults={buyerMessageSellerResults}
            buyerMessageProductFilters={buyerMessageProductFilters}
            buyerMessageFilterOptions={buyerMessageFilterOptions}
            updateBuyerMessageProductFilter={updateBuyerMessageProductFilter}
            buyerMessageProductResults={buyerMessageProductResults}
            buyerDashboardConversationId={buyerDashboardConversationId}
            setBuyerDashboardConversationId={setBuyerDashboardConversationId}
            buyerDashboardConversationMessages={buyerDashboardConversationMessages}
            buyerDashboardMessageDraft={buyerDashboardMessageDraft}
            setBuyerDashboardMessageDraft={setBuyerDashboardMessageDraft}
            sendBuyerDashboardMessage={sendBuyerDashboardMessage}
            buyerDashboardMessageError={buyerDashboardMessageError}
            startBuyerConversationWithSeller={startBuyerConversationWithSeller}
            sendCustomRequestMessage={sendCustomRequestMessage}
            respondToCustomRequestPrice={respondToCustomRequestPrice}
            notifications={notifications}
            userStrikes={userStrikes}
            updateNotificationPreference={updateNotificationPreference}
            updatePushNotificationPreference={updatePushNotificationPreference}
            pushPermission={pushPermission}
            pushSupported={pushSupport.serviceWorker && pushSupport.notification && pushSupport.pushManager}
            promptPayReceiverMobile={promptPayReceiverMobile}
            accountCredentialForm={accountCredentialForm}
            setAccountCredentialForm={setAccountCredentialForm}
            submitAccountCredentialChanges={submitAccountCredentialChanges}
            accountCredentialSaving={accountCredentialSaving}
            accountCredentialMessage={accountCredentialMessage}
            accountCredentialTone={accountCredentialTone}
            resendOrderReceipt={resendOrderReceipt}
            fetchOrderTracking={fetchOrderTracking}
            uiLanguage={uiLanguage}
            navigate={navigate}
          />
          </>
        ) : null}
        {routeInfo.name === 'appeals' ? (
          <AppealsPage
            currentUser={currentUser}
            userStrikes={userStrikes}
            userAppeals={userAppeals}
            submitStrikeAppeal={submitStrikeAppeal}
            submittingStrikeAppeal={submittingStrikeAppeal}
            navigate={navigate}
            onOpenLogin={() => {
              setPostLoginRedirectPath('/appeals');
              navigate('/login');
            }}
          />
        ) : null}

        {routeInfo.name === 'privacy-policy' ? <PrivacyPolicyPage uiLanguage={uiLanguage} /> : null}
        {routeInfo.name === 'terms' ? <TermsPage uiLanguage={uiLanguage} navigate={navigate} /> : null}
        {routeInfo.name === 'shipping-policy' ? <ShippingPolicyPage uiLanguage={uiLanguage} navigate={navigate} /> : null}
        {routeInfo.name === 'refund-policy' ? <RefundPolicyPage /> : null}
        {routeInfo.name === 'refund-evidence' ? (
          <RefundEvidencePage
            currentUser={currentUser}
            submitRefundEvidence={submitRefundEvidence}
            navigate={navigate}
            uiLanguage={uiLanguage}
          />
        ) : null}
        {routeInfo.name === 'community-standards' ? <CommunityStandardsPage uiLanguage={uiLanguage} navigate={navigate} /> : null}
        {routeInfo.name === 'seller-standards' ? <SellerStandardsPage uiLanguage={uiLanguage} /> : null}
        {routeInfo.name === 'contact' ? <ContactPage uiLanguage={uiLanguage} /> : null}
        {routeInfo.name === 'faq' ? <FaqPage uiLanguage={uiLanguage} navigate={navigate} /> : null}
        {routeInfo.name === 'custom-requests' ? (
          <CustomRequestsPage
            currentUser={currentUser}
            sellers={Object.values(sellerMap)}
            buyerCustomRequests={buyerCustomRequests}
            sellerCustomRequests={sellerCustomRequests}
            customRequestMessagesByRequestId={customRequestMessagesByRequestId}
            submitCustomRequest={submitCustomRequest}
            sendCustomRequestMessage={sendCustomRequestMessage}
            respondToCustomRequestPrice={respondToCustomRequestPrice}
            openWalletTopUpForFlow={openSellerPageTopUp}
            uiLanguage={uiLanguage}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'find' ? <FindPage products={availableProducts} sellerMap={sellerMap} navigate={navigate} uiLanguage={uiLanguage} /> : null}
        {routeInfo.name === 'worldwide-shipping' ? <WorldwideShippingPage uiLanguage={uiLanguage} navigate={navigate} /> : null}
        {routeInfo.name === 'seller-portfolios' ? <SellerPortfoliosPage sellers={Object.values(sellerMap)} products={availableProducts} navigate={navigate} uiLanguage={uiLanguage} currentUser={currentUser} /> : null}
        {routeInfo.name === 'how-to-apply' ? <HowToApplyPage uiLanguage={uiLanguage} /> : null}
        {routeInfo.name === 'seller-appeals' ? <SellerAppealsPage uiLanguage={uiLanguage} navigate={navigate} /> : null}
        {routeInfo.name === 'seller-guidelines' ? <SellerGuidelinesPage uiLanguage={uiLanguage} /> : null}
        {routeInfo.name === 'portfolio-setup' ? <PortfolioSetupPage uiLanguage={uiLanguage} /> : null}
        {routeInfo.name === 'order-help' ? (
          <OrderHelpPage
            uiLanguage={uiLanguage}
            currentUser={currentUser}
            submitOrderHelpRequest={submitOrderHelpRequest}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'safety-report' ? (
          <SafetyReportPage
            uiLanguage={uiLanguage}
            currentUser={currentUser}
            submitSafetyReport={submitSafetyReport}
            navigate={navigate}
          />
        ) : null}
        {routeInfo.name === 'privacy-packaging' ? <PrivacyPackagingPage uiLanguage={uiLanguage} navigate={navigate} /> : null}
        </Suspense>
      </main>

      <footer className="border-t border-rose-100 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="text-lg font-semibold text-slate-900">{footerCopy.brandTitle}</div>
              <div className="mt-3 max-w-md text-sm leading-7 text-slate-500">{footerCopy.description}</div>
            </div>
            {footerCopy.groups.map((group) => (
              <div key={group.title}>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-500">{group.title}</div>
                <div className="mt-4 space-y-3 text-sm text-slate-500">
                  {group.links.map((link) => (
                    <button key={`${group.title}-${link.route}-${link.label}`} type="button" onClick={() => navigate(link.route)} className="block text-left hover:text-rose-600">
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-4 border-t border-rose-100 pt-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
            <div>{footerCopy.copyright}</div>
            <div className="flex flex-wrap gap-5">
              {footerCopy.legalLinks.map((link) => (
                <button key={link.route} type="button" onClick={() => navigate(link.route)} className="hover:text-rose-600">
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {sellerPageTopUpOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-slate-900">Top up wallet</h4>
                <p className="mt-1 text-sm text-slate-600">Confirm the amount, then proceed to our secure payment page.</p>
              </div>
              <button type="button" onClick={() => { if (walletStatus !== 'processing') setSellerPageTopUpOpen(false); }} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:text-slate-700" aria-label="Close top-up modal">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top-up amount (THB)</label>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-sm font-semibold text-slate-500">฿</span>
                <input type="number" min={MIN_WALLET_TOP_UP_THB} step="1" value={sellerPageTopUpDraft} onChange={(e) => { setSellerPageTopUpError(''); setSellerPageTopUpDraft(e.target.value); }} className="w-full rounded-2xl border border-slate-200 py-2 pl-8 pr-4 text-sm" />
              </div>
              <div className="mt-1 text-xs text-slate-500">Minimum top-up is {formatPriceTHB(MIN_WALLET_TOP_UP_THB)}.{sellerPageFormatUsd(Number(sellerPageTopUpDraft || 0)) ? <> Your card will be charged <span className="font-semibold">{sellerPageFormatUsd(Number(sellerPageTopUpDraft || 0))}</span>.</> : null}</div>
              {exchangeRate ? <div className="mt-1 text-[11px] text-slate-400">Card charges are processed in USD at the current exchange rate.</div> : null}
            </div>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              You will be redirected to a secure payment page to enter your card details. After payment, you will be returned here automatically.
            </div>
            {sellerPageTopUpError ? <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{sellerPageTopUpError}</div> : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => { if (walletStatus !== 'processing') setSellerPageTopUpOpen(false); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={submitSellerPageTopUp} disabled={walletStatus === 'processing'} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
                {walletStatus === 'processing' ? 'Processing...' : 'Continue to payment'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
