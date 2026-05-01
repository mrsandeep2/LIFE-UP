// Curated daily Hindi motivational quotes.
// Rotation is deterministic (daysSinceEpoch % length) so the same quote
// shows for the entire local day — no flicker, no API call.

export type HindiQuote = {
  text: string;
  author: string;
};

export const HINDI_QUOTES: HindiQuote[] = [
  { text: "जो आज तुम कर सकते हो, उसे कल पर मत टालो।", author: "महात्मा गांधी" },
  { text: "खुद पर विश्वास रखो, तुम पहाड़ भी हिला सकते हो।", author: "स्वामी विवेकानन्द" },
  { text: "उठो, जागो और तब तक मत रुको जब तक लक्ष्य न मिल जाए।", author: "स्वामी विवेकानन्द" },
  { text: "सपने वो नहीं जो हम सोते हुए देखते हैं, सपने वो हैं जो हमें सोने नहीं देते।", author: "ए.पी.जे. अब्दुल कलाम" },
  { text: "असफलता एक चुनौती है, इसे स्वीकार करो।", author: "सोहन लाल द्विवेदी" },
  { text: "मन के हारे हार है, मन के जीते जीत।", author: "कबीर" },
  { text: "जहाँ चाह वहाँ राह।", author: "लोकोक्ति" },
  { text: "कर्म ही पूजा है।", author: "गीता" },
  { text: "सफलता उन्हें ही मिलती है जो कोशिश करना नहीं छोड़ते।", author: "अज्ञात" },
  { text: "बूँद-बूँद से सागर बनता है।", author: "लोकोक्ति" },
  { text: "अनुशासन सफलता की पहली सीढ़ी है।", author: "अज्ञात" },
  { text: "जीवन में आगे बढ़ने के लिए धैर्य जरूरी है।", author: "रवीन्द्रनाथ टैगोर" },
  { text: "अपने आप को कमजोर समझना सबसे बड़ा पाप है।", author: "स्वामी विवेकानन्द" },
  { text: "जो हुआ अच्छा हुआ, जो हो रहा है अच्छा हो रहा है।", author: "श्रीमद् भगवद्गीता" },
  { text: "कठिन समय में ही असली पहचान होती है।", author: "अज्ञात" },
  { text: "हर सुबह एक नया अवसर है।", author: "अज्ञात" },
  { text: "मेहनत का फल मीठा होता है।", author: "लोकोक्ति" },
  { text: "जो डर गया, वो मर गया।", author: "गब्बर" },
  { text: "विद्या ददाति विनयं।", author: "हितोपदेश" },
  { text: "सत्यमेव जयते।", author: "मुण्डक उपनिषद्" },
  { text: "अहिंसा परमो धर्मः।", author: "महाभारत" },
  { text: "जैसा बीज वैसा पेड़, जैसा कर्म वैसा फल।", author: "कबीर" },
  { text: "अपनी राह खुद बनाओ, भीड़ का हिस्सा मत बनो।", author: "अज्ञात" },
  { text: "धैर्य और मेहनत से हर सपना पूरा होता है।", author: "अज्ञात" },
  { text: "गलतियाँ ही हमें सिखाती हैं।", author: "अज्ञात" },
  { text: "छोटे कदम भी मंज़िल तक पहुँचाते हैं।", author: "अज्ञात" },
  { text: "हर अंत एक नई शुरुआत है।", author: "अज्ञात" },
  { text: "सकारात्मक सोच ही सबसे बड़ी ताकत है।", author: "अज्ञात" },
  { text: "जो लोग कोशिश करते हैं, वही जीतते हैं।", author: "अज्ञात" },
  { text: "ज्ञान वह खज़ाना है जो कभी कम नहीं होता।", author: "अज्ञात" },
  { text: "समय किसी का इंतज़ार नहीं करता।", author: "लोकोक्ति" },
  { text: "अपने सपनों को इतना बड़ा बनाओ कि वो डर पर भारी पड़ें।", author: "अज्ञात" },
  { text: "जो खुद पर भरोसा करता है, उसे दुनिया भी रोक नहीं सकती।", author: "अज्ञात" },
  { text: "हर दिन कुछ नया सीखो।", author: "अज्ञात" },
  { text: "बड़ी सोच ही बड़ी मंज़िल देती है।", author: "अज्ञात" },
  { text: "मेहनत कभी बेकार नहीं जाती।", author: "अज्ञात" },
  { text: "खुद से जीतना सबसे बड़ी जीत है।", author: "बुद्ध" },
  { text: "आज का दिन तुम्हारा है — इसे यूँ ही मत जाने दो।", author: "अज्ञात" },
  { text: "सादगी में ही असली सुंदरता है।", author: "महात्मा गांधी" },
  { text: "जो रुक गया, वो थक गया; जो चलता रहा, वो जीत गया।", author: "अज्ञात" },
];

const HINDI_WEEKDAYS = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
const HINDI_MONTHS = [
  "जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून",
  "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
];

const HINDI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
function toDevanagari(n: number): string {
  return String(n)
    .split("")
    .map((d) => (d >= "0" && d <= "9" ? HINDI_DIGITS[Number(d)] : d))
    .join("");
}

/** Returns today's Hindi quote (deterministic — same across the whole day). */
export function getDailyQuote(date: Date = new Date()): HindiQuote {
  const dayMs = 24 * 60 * 60 * 1000;
  // Use local-day index (epoch days), so quote rolls over at local midnight.
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayIndex = Math.floor(localMidnight / dayMs);
  const idx = ((dayIndex % HINDI_QUOTES.length) + HINDI_QUOTES.length) % HINDI_QUOTES.length;
  return HINDI_QUOTES[idx];
}

/** Formats a date in English: "Friday, 01-05-2026" */
export function formatHindiDate(date: Date = new Date()): string {
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekday = weekdays[date.getDay()];
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${weekday}, ${dd}-${mm}-${yyyy}`;
}
