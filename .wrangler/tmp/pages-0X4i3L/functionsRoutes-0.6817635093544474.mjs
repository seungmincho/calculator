import { onRequestGet as __api_fetch_page_ts_onRequestGet } from "C:\\projects\\salary-calculator\\functions\\api\\fetch-page.ts"
import { onRequestGet as __api_fuel_prices_ts_onRequestGet } from "C:\\projects\\salary-calculator\\functions\\api\\fuel-prices.ts"
import { onRequestGet as __api_fuel_prices_collect_ts_onRequestGet } from "C:\\projects\\salary-calculator\\functions\\api\\fuel-prices-collect.ts"
import { onRequestGet as __api_proxy_image_ts_onRequestGet } from "C:\\projects\\salary-calculator\\functions\\api\\proxy-image.ts"

export const routes = [
    {
      routePath: "/api/fetch-page",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_fetch_page_ts_onRequestGet],
    },
  {
      routePath: "/api/fuel-prices",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_fuel_prices_ts_onRequestGet],
    },
  {
      routePath: "/api/fuel-prices-collect",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_fuel_prices_collect_ts_onRequestGet],
    },
  {
      routePath: "/api/proxy-image",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_proxy_image_ts_onRequestGet],
    },
  ]