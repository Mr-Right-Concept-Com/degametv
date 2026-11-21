import { countryCurrencyMatches } from "./country-currency.ts";

Deno.test("accepts the enabled currency assigned to a country", () => {
  if (!countryCurrencyMatches("NGN", "NGN")) {
    throw new Error("The registered country currency must be accepted.");
  }
});

Deno.test("normalizes ISO currency codes before comparison", () => {
  if (!countryCurrencyMatches("ngn", "NGN")) {
    throw new Error("Currency code comparison must be case insensitive.");
  }
});

Deno.test("rejects a globally supported currency not assigned to the country", () => {
  if (countryCurrencyMatches("NGN", "USD")) {
    throw new Error("A currency assigned to another country must be rejected.");
  }
});

Deno.test("rejects malformed currency codes", () => {
  if (countryCurrencyMatches("NG", "NGN") || countryCurrencyMatches("NGN", "NGN1")) {
    throw new Error("Malformed ISO currency codes must be rejected.");
  }
});
