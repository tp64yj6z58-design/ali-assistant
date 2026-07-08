function searchMockProducts(query) {
  const label = query || "מוצר";
  return [
    {
      product_id: "demo-1",
      product_title: `${label} - דגם מומלץ עם דירוג גבוה`,
      product_main_image_url: "https://ae01.alicdn.com/kf/Splaceholder.jpg",
      promotion_link: "https://www.aliexpress.com/",
      target_sale_price: "29.90",
      target_sale_price_currency: "ILS",
      evaluate_rate: "4.8",
      lastest_volume: "1840",
      discount: "42",
      ship_to_days: "10"
    },
    {
      product_id: "demo-2",
      product_title: `${label} - בחירה משתלמת במיוחד`,
      product_main_image_url: "https://ae01.alicdn.com/kf/Splaceholder.jpg",
      promotion_link: "https://www.aliexpress.com/",
      target_sale_price: "18.50",
      target_sale_price_currency: "ILS",
      evaluate_rate: "4.6",
      lastest_volume: "4200",
      discount: "35",
      ship_to_days: "14"
    },
    {
      product_id: "demo-3",
      product_title: `${label} - פרימיום עם הרבה הזמנות`,
      product_main_image_url: "https://ae01.alicdn.com/kf/Splaceholder.jpg",
      promotion_link: "https://www.aliexpress.com/",
      target_sale_price: "44.00",
      target_sale_price_currency: "ILS",
      evaluate_rate: "4.9",
      lastest_volume: "980",
      discount: "28",
      ship_to_days: "9"
    },
    {
      product_id: "demo-4",
      product_title: `${label} - אופציה בסיסית`,
      product_main_image_url: "https://ae01.alicdn.com/kf/Splaceholder.jpg",
      promotion_link: "https://www.aliexpress.com/",
      target_sale_price: "12.00",
      target_sale_price_currency: "ILS",
      evaluate_rate: "4.1",
      lastest_volume: "220",
      discount: "15",
      ship_to_days: "21"
    }
  ];
}

module.exports = { searchMockProducts };
