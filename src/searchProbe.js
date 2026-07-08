const { recommendProducts } = require("./assistant");

const QUERIES = [
  "אייר פרייר",
  "מזרן יוגה",
  "אוהל קמפינג",
  "רצועה לכלב",
  "מזרקת מים לחתול",
  "עגלה לתינוק",
  "פנס לאופניים",
  "כפפות לאופנוע",
  "משקפי שמש",
  "מעמד למחשב נייד",
  "מפצל usb",
  "מכשיר אדים",
  "שואב רובוטי",
  "מייבש שיער",
  "בלנדר",
  "מטחנת קפה",
  "מלחם",
  "air fryer",
  "yoga mat",
  "camping tent",
  "dog leash",
  "cat water fountain",
  "baby stroller",
  "bicycle light",
  "motorcycle gloves",
  "sunglasses",
  "laptop stand",
  "usb hub",
  "humidifier",
  "robot vacuum",
  "hair dryer",
  "blender",
  "coffee grinder",
  "soldering iron"
];

async function runProbe() {
  for (const query of QUERIES) {
    const result = await recommendProducts(query);
    console.log(`\n${query} -> ${result.keywords} (${result.products.length})`);
    for (const product of result.products) {
      console.log(`- ${product.title}`);
    }
  }
}

if (require.main === module) {
  runProbe().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
