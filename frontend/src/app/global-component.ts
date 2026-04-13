export const GlobalComponent = {
  // Api Calling
  API_URL: "https://dashboard.eye-fi.com/",
  headerToken: { Authorization: `Bearer ${localStorage.getItem("token")}` },

  // Auth Api
  AUTH_API: "https://dashboard.eye-fi.com/server/Api/",

  // Products Api
  product: "apps/product",
  productDelete: "apps/product/",

  // Orders Api
  order: "apps/order",
  orderId: "apps/order/",

  // Customers Api
  customer: "apps/customer",
};
