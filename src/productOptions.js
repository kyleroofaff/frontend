export const STYLE_OPTIONS = [
  "Bikini",
  "Briefs",
  "Thong",
  "Boyshorts",
  "Hipster",
  "Lace Panties",
  "Cheeky",
  "G-String",
  "Brazilian",
  "Tanga",
  "Bra",
  "Bra and Panty Set",
  "Custom Set",
  "Pantyhose",
  "Thigh-High Pantyhose",
  "Knee-High Socks",
  "Ankle Socks",
  "Skirt",
  "Dress",
  "Top"
];

export const STYLE_FILTER_OPTIONS = ["All", ...STYLE_OPTIONS];

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "XXL+"];
const EXCLUDED_FILTER_SIZES = new Set(["34b", "34c", "36c", "38c", "one size"]);
export const SHARED_SIZE_OPTIONS = SIZE_OPTIONS.filter((size) => !EXCLUDED_FILTER_SIZES.has((size || "").trim().toLowerCase()));
export const SELLER_LANGUAGE_OPTIONS = ["English", "Thai", "Burmese", "Russian"];
export const PRIMARY_CURRENCY_CODE = "THB";
export const PRIMARY_CURRENCY_SYMBOL = "฿";
export const MIN_SELLER_PRICE_THB = 1000;
export const MIN_FEED_UNLOCK_PRICE_THB = 50;
export const MIN_CUSTOM_REQUEST_PURCHASE_THB = 1000;
export const MESSAGE_FEE_THB = 7;
export const CUSTOM_REQUEST_FEE_THB = 7;
export function formatPriceTHB(value) {
  const amount = Number(value || 0);
  const formatted = amount % 1 === 0 ? String(amount) : amount.toFixed(2);
  return `${PRIMARY_CURRENCY_SYMBOL}${formatted}`;
}
export const COLOR_OPTIONS = [
  "Red",
  "Pink",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "White",
  "Black",
  "Grey",
  "Brown",
  "Tan"
];
export const FABRIC_OPTIONS = ["Cotton", "Lace", "Satin", "Silk", "Mesh"];
export const DAYS_WORN_OPTIONS = [
  "Unworn",
  "Lightly worn (a few hours)",
  "1 day",
  "2 days",
  "3 days",
  "4-5 days",
  "6-7 days",
  "8+ days",
  "Regular use (washed)",
];
export const WAIST_RISE_OPTIONS = ["Low-rise", "Mid-rise", "High-rise"];
export const COVERAGE_OPTIONS = ["Minimal", "Moderate", "Full"];
export const CONDITION_OPTIONS = ["almost new", "worn several times", "old"];
export const SCENT_LEVEL_OPTIONS = ["Light", "Medium", "Strong"];
export const HAIR_COLOR_OPTIONS = ["Black", "Brown", "Blonde", "Red", "Auburn", "Grey", "White", "Other"];
export const BRA_SIZE_OPTIONS = ["30A", "30B", "32A", "32B", "32C", "32D", "34A", "34B", "34C", "34D", "34DD", "36A", "36B", "36C", "36D", "36DD", "38B", "38C", "38D", "38DD"];
export const THAI_BRA_SIZE_OPTIONS = ["65A", "65B", "70A", "70B", "70C", "70D", "75A", "75B", "75C", "75D", "75DD", "80A", "80B", "80C", "80D", "80DD", "85B", "85C", "85D", "85DD"];
export const THAI_BRA_BANDS = [65, 70, 75, 80, 85];
export const THAI_BRA_CUPS = ["A", "B", "C", "D", "DD"];
/** Approx. full-bust minus underbust (cm); guidance only — not medical sizing. */
export const THAI_BRA_CUP_CM_SPAN = {
  A: "12–15 cm",
  B: "15–18 cm",
  C: "18–21 cm",
  D: "21–24 cm",
  DD: "24–27 cm",
};
export const THAI_TO_US_BRA_SIZE_MAP = {
  "65A": "30A", "65B": "30B",
  "70A": "32A", "70B": "32B", "70C": "32C", "70D": "32D",
  "75A": "34A", "75B": "34B", "75C": "34C", "75D": "34D", "75DD": "34DD",
  "80A": "36A", "80B": "36B", "80C": "36C", "80D": "36D", "80DD": "36DD",
  "85B": "38B", "85C": "38C", "85D": "38D", "85DD": "38DD",
};
export const PANTY_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];

export const SELLER_BAR_REGISTRATION_COUNTRIES = [
  "Thailand", "Myanmar", "Russia", "Other",
];
export const BUYER_REGISTRATION_COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany", "France",
  "Japan", "South Korea", "Thailand", "Myanmar", "Russia", "Brazil", "Mexico",
  "India", "China", "Other",
];
export const REGISTRATION_COUNTRIES = BUYER_REGISTRATION_COUNTRIES;
export const REGISTRATION_CITIES_BY_COUNTRY = {
  Thailand: ["Bangkok", "Chiang Mai", "Pattaya", "Phuket", "Chiang Rai", "Udon Thani", "Khon Kaen", "Hat Yai", "Nakhon Ratchasima", "Surat Thani"],
  Myanmar: ["Yangon", "Mandalay", "Naypyidaw"],
  Laos: ["Vientiane", "Luang Prabang"],
  Cambodia: ["Phnom Penh", "Siem Reap"],
  Philippines: ["Manila", "Cebu", "Davao"],
  Vietnam: ["Ho Chi Minh City", "Hanoi", "Da Nang"],
  China: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen"],
  Malaysia: ["Kuala Lumpur", "Penang", "Johor Bahru"],
  Indonesia: ["Jakarta", "Bali", "Surabaya"],
  India: ["Mumbai", "Delhi", "Bangalore"],
  Russia: ["Moscow", "Saint Petersburg"],
};

export function cmToInches(cm) { return Number((Number(cm) / 2.54).toFixed(1)); }
export function inchesToCm(inches) { return Number((Number(inches) * 2.54).toFixed(1)); }
export function kgToLbs(kg) { return Number((Number(kg) * 2.20462).toFixed(1)); }
export function lbsToKg(lbs) { return Number((Number(lbs) / 2.20462).toFixed(1)); }
export function formatHeight(valueCm, displayUnit = 'cm') {
  const n = Number(valueCm);
  if (!n || n <= 0) return '';
  if (displayUnit === 'in') {
    const totalInches = Math.round(n / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    return `${feet}'${inches}"`;
  }
  return `${Math.round(n)} cm`;
}
export function formatWeight(valueKg, displayUnit = 'kg') {
  const n = Number(valueKg);
  if (!n || n <= 0) return '';
  if (displayUnit === 'lbs') return `${Math.round(n * 2.20462)} lbs`;
  return `${Math.round(n)} kg`;
}

export const OPTION_LABEL_I18N = {
  All: { th: "ทั้งหมด", my: "အားလုံး", ru: "Все" },
  "All sellers": { th: "ผู้ขายทั้งหมด", my: "ရောင်းသူအားလုံး", ru: "Все продавцы" },
  Under: { th: "ต่ำกว่า", my: "အောက်", ru: "До" },
  "Not specified": { th: "ไม่ระบุ", my: "မသတ်မှတ်", ru: "Не указано" },
  Online: { th: "ออนไลน์", my: "အွန်လိုင်း", ru: "Онлайн" },
  Offline: { th: "ออฟไลน์", my: "အော့ဖ်လိုင်း", ru: "Оффлайн" },
  Independent: { th: "อิสระ", my: "လွတ်လပ်", ru: "Независимый" },
  "Select seller...": { th: "เลือกผู้ขาย...", my: "ရောင်းသူရွေးပါ...", ru: "Выберите продавца..." },
  "Select account type": { th: "เลือกประเภทบัญชี", my: "အကောင့်အမျိုးအစားရွေးပါ", ru: "Выберите тип аккаунта" },
  "Buyer account": { th: "บัญชีผู้ซื้อ", my: "ဝယ်သူအကောင့်", ru: "Аккаунт покупателя" },
  "Seller account": { th: "บัญชีผู้ขาย", my: "ရောင်းသူအကောင့်", ru: "Аккаунт продавца" },
  "Bar account": { th: "บัญชีบาร์", my: "ဘားအကောင့်", ru: "Аккаунт бара" },
  "I want to buy used panties":     { th: "ต้องการซื้อกางเกงในมือสอง",   my: "ဝတ်ပြီးသောဝတ်ဆင် ဝယ်လိုသည်",                    ru: "Хочу купить ношеные трусики"      },
  "I want to sell my used panties": { th: "ต้องการขายกางเกงในมือสอง",    my: "ကျွန်ုပ်၏ ဝတ်ပြီးသောဝတ်ဆင် ရောင်းလိုသည်",      ru: "Хочу продать мои ношеные трусики" },
  "I'm a bar or venue":             { th: "เป็นบาร์หรือสถานบันเทิง",     my: "ကျွန်ုပ်သည် ဘား သို့မဟုတ် နေရာတစ်ခု ဖြစ်သည်",  ru: "Я бар или заведение"             },
  "kg":  { th: "กก.",   my: "ကီလိုဂရမ်", ru: "кг"   },
  "lbs": { th: "ปอนด์", my: "ပေါင်",     ru: "фунт" },
  "Assign to bar...": { th: "กำหนดบาร์...", my: "ဘားသို့ သတ်မှတ်...", ru: "Назначить бар..." },
  "Select country": { th: "เลือกประเทศ", my: "နိုင်ငံရွေးပါ", ru: "Выберите страну" },
  processing: { th: "กำลังดำเนินการ", my: "ဆောင်ရွက်နေသည်", ru: "В обработке" },
  shipped: { th: "จัดส่งแล้ว", my: "ပို့ပြီး", ru: "Отправлено" },
  delivered: { th: "จัดส่งสำเร็จ", my: "လက်ခံပြီး", ru: "Доставлено" },
  open: { th: "เปิด", my: "ဖွင့်ထား", ru: "Открыт" },
  reviewing: { th: "กำลังตรวจสอบ", my: "စစ်ဆေးနေ", ru: "На проверке" },
  fulfilled: { th: "เสร็จสิ้น", my: "ပြီးစီး", ru: "Выполнен" },
  closed: { th: "ปิด", my: "ပိတ်ထား", ru: "Закрыт" },
  Public: { th: "สาธารณะ", my: "အများသုံး", ru: "Публичный" },
  Private: { th: "ส่วนตัว", my: "သီးသန့်", ru: "Приватный" },
  "Private (paid)": { th: "ส่วนตัว (มีค่าใช้จ่าย)", my: "သီးသန့် (အခပေး)", ru: "Приватный (платно)" },
  English: { th: "อังกฤษ", my: "အင်္ဂလိပ်", ru: "Английский" },
  Thai: { th: "ไทย", my: "ထိုင်း", ru: "Тайский" },
  Burmese: { th: "พม่า", my: "မြန်မာ", ru: "Бирманский" },
  Russian: { th: "รัสเซีย", my: "ရုရှား", ru: "Русский" },
  "every day": { th: "ทุกวัน", my: "နေ့စဉ်", ru: "На каждый день" },
  sport: { th: "สปอร์ต", my: "အားကစား", ru: "Спорт" },
  lace: { th: "ลูกไม้", my: "လေ့စ်", ru: "Кружево" },
  "risqué": { th: "ยั่วยวน", my: "စွဲဆောင်မှုရှိ", ru: "Провокационный" },
  satin: { th: "ซาติน", my: "ဆာတင်", ru: "Сатин" },
  silk: { th: "ไหม", my: "ပိုး", ru: "Шелк" },
  Red: { th: "แดง", my: "အနီ", ru: "Красный" },
  Pink: { th: "ชมพู", my: "ပန်းရောင်", ru: "Розовый" },
  Orange: { th: "ส้ม", my: "လိမ္မော်", ru: "Оранжевый" },
  Yellow: { th: "เหลือง", my: "အဝါ", ru: "Желтый" },
  Green: { th: "เขียว", my: "အစိမ်း", ru: "Зеленый" },
  Blue: { th: "น้ำเงิน", my: "အပြာ", ru: "Синий" },
  White: { th: "ขาว", my: "အဖြူ", ru: "Белый" },
  Black: { th: "ดำ", my: "အနက်", ru: "Черный" },
  Grey: { th: "เทา", my: "မီးခိုး", ru: "Серый" },
  Brown: { th: "น้ำตาล", my: "အညို", ru: "Коричневый" },
  Tan: { th: "เนื้อ", my: "အသားရောင်", ru: "Бежевый" },
  Cotton: { th: "คอตตอน", my: "ကော့တန်", ru: "Хлопок" },
  Lace: { th: "ลูกไม้", my: "လေ့စ်", ru: "Кружево" },
  Satin: { th: "ซาติน", my: "ဆာတင်", ru: "Сатин" },
  Silk: { th: "ไหม", my: "ပိုး", ru: "Шелк" },
  Mesh: { th: "ตาข่าย", my: "ကွန်ယက်", ru: "Сетка" },
  "almost new": { th: "สภาพเกือบใหม่", my: "အသစ်နီးပါး", ru: "Почти новое" },
  "worn several times": { th: "สวมใส่มาหลายครั้ง", my: "ဝတ်ထားပြီး အကြိမ်များ", ru: "Ношено несколько раз" },
  old: { th: "เก่า", my: "ဟောင်း", ru: "Старое" },
  Light: { th: "เบา", my: "ပေါ့", ru: "Легкий" },
  Medium: { th: "กลาง", my: "အလယ်အလတ်", ru: "Средний" },
  Strong: { th: "แรง", my: "ပြင်း", ru: "Сильный" },
  Unworn: { th: "ไม่เคยใส่", my: "မဝတ်ထား", ru: "Не ношено" },
  "Lightly worn (a few hours)": { th: "ใส่เล็กน้อย (ไม่กี่ชั่วโมง)", my: "အနည်းငယ်ဝတ် (နာရီအနည်းငယ်)", ru: "Слегка ношено (несколько часов)" },
  "1 day": { th: "1 วัน", my: "၁ ရက်", ru: "1 день" },
  "2 days": { th: "2 วัน", my: "၂ ရက်", ru: "2 дня" },
  "3 days": { th: "3 วัน", my: "၃ ရက်", ru: "3 дня" },
  "4-5 days": { th: "4-5 วัน", my: "၄-၅ ရက်", ru: "4-5 дней" },
  "6-7 days": { th: "6-7 วัน", my: "၆-၇ ရက်", ru: "6-7 дней" },
  "8+ days": { th: "8+ วัน", my: "၈+ ရက်", ru: "8+ дней" },
  "Regular use (washed)": { th: "ใช้งานปกติ (ซักแล้ว)", my: "ပုံမှန်အသုံးပြု (လျှော်ပြီး)", ru: "Обычное использование (постирано)" },
  Bikini: { th: "บิกินี", my: "ဘီကီနီ", ru: "Бикини" },
  Briefs: { th: "กางเกงในทรงคลาสสิก", my: "briefs", ru: "Трусы" },
  Thong: { th: "จีสตริง", my: "သောင်", ru: "Тонг" },
  Boyshorts: { th: "บอยชอร์ต", my: "ဘွိုင်းရှော့", ru: "Шортики" },
  Hipster: { th: "ฮิปสเตอร์", my: "ဟစ်ပ်စတာ", ru: "Хипстер" },
  "Lace Panties": { th: "กางเกงในลูกไม้", my: "လေ့စ်ပန်တီ", ru: "Кружевные трусики" },
  Cheeky: { th: "เชีกี้", my: "ချီကီ", ru: "Чики" },
  "G-String": { th: "จีสตริง", my: "G-String", ru: "G-стринг" },
  Brazilian: { th: "บราซิลเลียน", my: "ဘရာဇီးလ်", ru: "Бразилиана" },
  Tanga: { th: "แทงก้า", my: "တန်ဂါ", ru: "Танга" },
  Bra: { th: "บรา", my: "ဘရာ", ru: "Бюстгальтер" },
  "Bra and Panty Set": { th: "ชุดบราและกางเกงใน", my: "ဘရာနှင့်ပန်တီစက်", ru: "Комплект бюстгальтер и трусики" },
  "Custom Set": { th: "ชุดสั่งทำ", my: "စိတ်ကြိုက်စက်", ru: "Индивидуальный набор" },
  Pantyhose: { th: "ถุงน่องเต็มตัว", my: "pantyhose", ru: "Колготки" },
  "Thigh-High Pantyhose": { th: "ถุงน่องเหนือเข่า", my: "thigh-high pantyhose", ru: "Чулки до бедра" },
  "Knee-High Socks": { th: "ถุงเท้ายาวถึงเข่า", my: "ဒူးအထိဆော့", ru: "Гольфы" },
  "Ankle Socks": { th: "ถุงเท้าข้อสั้น", my: "ခြေချင်းဆော့", ru: "Носки до щиколотки" },
  Skirt: { th: "กระโปรง", my: "စကတ်", ru: "Юбка" },
  Dress: { th: "เดรส", my: "ဒရက်စ်", ru: "Платье" },
  Top: { th: "เสื้อ", my: "အပေါ်ဝတ်", ru: "Топ" },
  "12-hour": { th: "12 ชั่วโมง", my: "၁၂ နာရီ", ru: "12-часовой" },
  "24-hour": { th: "24 ชั่วโมง", my: "၂၄ နာရီ", ru: "24-часовой" },
  Blonde: { th: "บลอนด์", my: "ရွှေရောင်", ru: "Блонд" },
  Auburn: { th: "น้ำตาลแดง", my: "လိမ္မော်ညို", ru: "Каштановый" },
  Other: { th: "อื่น ๆ", my: "အခြား", ru: "Другой" },
  Thailand: { th: "ไทย", my: "ထိုင်း", ru: "Таиланд" },
  Myanmar: { th: "เมียนมาร์", my: "မြန်မာ", ru: "Мьянма" },
  Laos: { th: "ลาว", my: "လာအို", ru: "Лаос" },
  Cambodia: { th: "กัมพูชา", my: "ကမ္ဘောဒီးယား", ru: "Камбоджа" },
  Philippines: { th: "ฟิลิปปินส์", my: "ဖိလစ်ပိုင်", ru: "Филиппины" },
  Vietnam: { th: "เวียดนาม", my: "ဗီယက်နမ်", ru: "Вьетнам" },
  China: { th: "จีน", my: "တရုတ်", ru: "Китай" },
  Malaysia: { th: "มาเลเซีย", my: "မလေးရှား", ru: "Малайзия" },
  Indonesia: { th: "อินโดนีเซีย", my: "အင်ဒိုနီးရှား", ru: "Индонезия" },
  India: { th: "อินเดีย", my: "အိန္ဒိယ", ru: "Индия" },
  Russia: { th: "รัสเซีย", my: "ရုရှား", ru: "Россия" },
  "United States": { th: "สหรัฐอเมริกา", my: "အမေရိကန်", ru: "США" },
  "United Kingdom": { th: "สหราชอาณาจักร", my: "ယူနိုက်တက်ကင်းဒမ်း", ru: "Великобритания" },
  Canada: { th: "แคนาดา", my: "ကနေဒါ", ru: "Канада" },
  Australia: { th: "ออสเตรเลีย", my: "ဩစတြေးလျ", ru: "Австралия" },
  Germany: { th: "เยอรมนี", my: "ဂျာမနီ", ru: "Германия" },
  France: { th: "ฝรั่งเศส", my: "ပြင်သစ်", ru: "Франция" },
  Japan: { th: "ญี่ปุ่น", my: "ဂျပန်", ru: "Япония" },
  "South Korea": { th: "เกาหลีใต้", my: "တောင်ကိုရီးယား", ru: "Южная Корея" },
  Brazil: { th: "บราซิล", my: "ဘရာဇီး", ru: "Бразилия" },
  Mexico: { th: "เม็กซิโก", my: "မက္ကဆီကို", ru: "Мексика" },
  "Select band size": { th: "เลือกขนาดรอบอก", my: "ရင်ဘတ်အရွယ်အစားရွေးပါ", ru: "Выберите размер обхвата" },
  "Select cup": { th: "เลือกคัพ", my: "ခွက်ရွေးပါ", ru: "Выберите чашку" },
  Bangkok: { th: "กรุงเทพ", my: "ဘန်ကောက်", ru: "Бангкок" },
  "Chiang Mai": { th: "เชียงใหม่", my: "ချင်းမိုင်", ru: "Чиангмай" },
  Pattaya: { th: "พัทยา", my: "ပတ္တယား", ru: "Паттайя" },
  Phuket: { th: "ภูเก็ต", my: "ဖူးခက်", ru: "Пхукет" },
  "Chiang Rai": { th: "เชียงราย", my: "ချင်းရိုင်", ru: "Чианграй" },
  "Udon Thani": { th: "อุดรธานี", my: "ဥဒုန်သာနီ", ru: "Удонтхани" },
  "Khon Kaen": { th: "ขอนแก่น", my: "ခွန်ကဲန်", ru: "Кхонкэн" },
  "Hat Yai": { th: "หาดใหญ่", my: "ဟတ်ယိုင်", ru: "Хатъяй" },
  "Nakhon Ratchasima": { th: "นครราชสีมา", my: "နခွန်ရာချဆီးမား", ru: "Накхонратчасима" },
  "Surat Thani": { th: "สุราษฎร์ธานี", my: "ဆူရတ်သာနီ", ru: "Суратхани" },
  Yangon: { th: "ย่างกุ้ง", my: "ရန်ကုန်", ru: "Янгон" },
  Mandalay: { th: "มัณฑะเลย์", my: "မန္တလေး", ru: "Мандалай" },
  Naypyidaw: { th: "เนปิดอว์", my: "နေပြည်တော်", ru: "Нейпьидо" },
  Vientiane: { th: "เวียงจันทน์", my: "ဗီယင်ကျန်း", ru: "Вьентьян" },
  "Luang Prabang": { th: "หลวงพระบาง", my: "လွမ်ပရဘန်", ru: "Луангпхабанг" },
  "Phnom Penh": { th: "พนมเปญ", my: "ဖနွမ်ပင်", ru: "Пномпень" },
  "Siem Reap": { th: "เสียมราฐ", my: "ဆီအမ်ရိပ်", ru: "Сиемреап" },
  Manila: { th: "มะนิลา", my: "မနီလာ", ru: "Манила" },
  Cebu: { th: "เซบู", my: "ဆီဘူး", ru: "Себу" },
  Davao: { th: "ดาเวา", my: "ဒါဗာအို", ru: "Давао" },
  "Ho Chi Minh City": { th: "โฮจิมินห์", my: "ဟိုချီမင်းစီးတီး", ru: "Хошимин" },
  Hanoi: { th: "ฮานอย", my: "ဟနွိုင်", ru: "Ханой" },
  "Da Nang": { th: "ดานัง", my: "ဒါနန်", ru: "Дананг" },
  Beijing: { th: "ปักกิ่ง", my: "ပေကျင်း", ru: "Пекин" },
  Shanghai: { th: "เซี่ยงไฮ้", my: "ရှန်ဟိုင်း", ru: "Шанхай" },
  Guangzhou: { th: "กวางโจว", my: "ဂွမ်ကျိုး", ru: "Гуанчжоу" },
  Shenzhen: { th: "เซินเจิ้น", my: "ရှင်ကျန်", ru: "Шэньчжэнь" },
  "Kuala Lumpur": { th: "กัวลาลัมเปอร์", my: "ကွာလာလမ်ပူ", ru: "Куала-Лумпур" },
  Penang: { th: "ปีนัง", my: "ပီနန်", ru: "Пенанг" },
  "Johor Bahru": { th: "ยะโฮร์บาห์รู", my: "ဂျိုဟိုဘာရူး", ru: "Джохор-Бару" },
  Jakarta: { th: "จาการ์ตา", my: "ဂျကာတာ", ru: "Джакарта" },
  Bali: { th: "บาหลี", my: "ဘာလီ", ru: "Бали" },
  Surabaya: { th: "สุราบายา", my: "ဆူရာဘာယာ", ru: "Сурабая" },
  Mumbai: { th: "มุมไบ", my: "မွမ်ဘိုင်း", ru: "Мумбаи" },
  Delhi: { th: "เดลี", my: "ဒေလီ", ru: "Дели" },
  Bangalore: { th: "บังกาลอร์", my: "ဘင်္ဂလို", ru: "Бангалор" },
  Moscow: { th: "มอสโก", my: "မော်စကို", ru: "Москва" },
  "Saint Petersburg": { th: "เซนต์ปีเตอร์สเบิร์ก", my: "စိန့်ပီတာစဘတ်", ru: "Санкт-Петербург" },
  "Select city": { th: "เลือกเมือง", my: "မြို့ရွေးပါ", ru: "Выберите город" },
  "Type your city": { th: "พิมพ์ชื่อเมือง", my: "မြို့အမည်ရိုက်ပါ", ru: "Введите город" },
  "Type your country": { th: "พิมพ์ชื่อประเทศ", my: "နိုင်ငံအမည်ရိုက်ပါ", ru: "Введите страну" },
};

export function formatBilingualLabel(englishLabel, uiLanguage, translatedLabel) {
  const base = String(englishLabel || "");
  if (uiLanguage === "en") return base;
  const translated = String(translatedLabel || base).trim();
  return `${base} (${translated || base})`;
}

export function localizeOptionLabel(optionKeyOrLabel, uiLanguage, optionDict = OPTION_LABEL_I18N) {
  const englishLabel = String(optionKeyOrLabel || "");
  if (!englishLabel) return "";
  const row = optionDict?.[englishLabel] || optionDict?.[englishLabel.trim()] || optionDict?.[englishLabel.toLowerCase()];
  const translated = row && typeof row === "object" ? row[uiLanguage] : "";
  return formatBilingualLabel(englishLabel, uiLanguage, translated || englishLabel);
}
