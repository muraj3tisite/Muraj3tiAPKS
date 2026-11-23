/* node build-quran-data.js mainDataQuran.json  →  data/quran-text.json
   mainDataQuran.json من https://github.com/rn0x/Quran-Data (مجلد data) */
const fs = require("fs"), src = process.argv[2];
if (!src) { console.error("usage: node build-quran-data.js mainDataQuran.json"); process.exit(1); }
const out = {};
JSON.parse(fs.readFileSync(src, "utf8")).forEach(s => s.verses.forEach(v => { out[s.number + ":" + v.number] = v.text.ar; }));
const n = Object.keys(out).length;
if (n !== 6236) { console.error("عدد الآيات " + n + " بدل 6236، تحقق من الملف"); process.exit(1); }
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/quran-text.json", JSON.stringify(out));
console.log("OK", n, "ayat");
