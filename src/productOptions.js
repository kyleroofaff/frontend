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
export const SELLER_SPECIALTY_OPTIONS = ["every day", "sport", "lace", "risqué", "satin", "silk"];
export const SELLER_LANGUAGE_OPTIONS = ["English", "Thai", "Burmese", "Russian"];
export const PRIMARY_CURRENCY_CODE = "THB";
export const PRIMARY_CURRENCY_SYMBOL = "฿";
export const MIN_SELLER_PRICE_THB = 1000;
export const MIN_FEED_UNLOCK_PRICE_THB = 50;
export const MIN_CUSTOM_REQUEST_PURCHASE_THB = 1000;
export const EXCHANGE_ESTIMATE_RATES = {
  USD: 0.028,
  EUR: 0.026,
  GBP: 0.022,
};
export const MESSAGE_FEE_THB = 7;
export const CUSTOM_REQUEST_FEE_THB = 7;
export function formatPriceTHB(value) {
  const amount = Number(value || 0);
  return `${PRIMARY_CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}
export function formatExchangeEstimates(valueThb) {
  const amount = Number(valueThb || 0);
  const usd = (amount * EXCHANGE_ESTIMATE_RATES.USD).toFixed(2);
  const eur = (amount * EXCHANGE_ESTIMATE_RATES.EUR).toFixed(2);
  const gbp = (amount * EXCHANGE_ESTIMATE_RATES.GBP).toFixed(2);
  return `Approx: $${usd} USD / EUR ${eur} / GBP ${gbp} (estimate only)`;
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
