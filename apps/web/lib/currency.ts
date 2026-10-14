import { getCountryConfig } from "./countries";

export function formatCurrency(
  amount: number | string | null | undefined,
  countryCode: string
): string {
  // Handle empty values.
  if (
    amount === null ||
    amount === undefined ||
    (typeof amount === "string" && amount.trim() === "")
  ) {
    return "—";
  }

  // Convert the amount to a number.
  const value =
    typeof amount === "number"
      ? amount
      : Number(amount.trim());

  if (!Number.isFinite(value)) {
    return "—";
  }

  // Normalize the country code.
  const normalizedCountryCode = (countryCode || "IN")
    .trim()
    .toUpperCase();

  // Use the selected country, or fall back to India.
  const country =
    getCountryConfig(normalizedCountryCode) ??
    getCountryConfig("IN");

  // Safe fallback if the country configuration is unavailable.
  if (!country) {
    return `₹${value.toFixed(2)}`;
  }

  // Currency configuration independent of CountryConfig property names.
  const currencyByCountry: Record<
    string,
    { locale: string; code: string }
  > = {
    IN: { locale: "en-IN", code: "INR" },
    US: { locale: "en-US", code: "USD" },
    GB: { locale: "en-GB", code: "GBP" },
    CA: { locale: "en-CA", code: "CAD" },
    AU: { locale: "en-AU", code: "AUD" },
    AE: { locale: "en-AE", code: "AED" },
    SG: { locale: "en-SG", code: "SGD" },
    EU: { locale: "de-DE", code: "EUR" },
  };

  // Prefer the explicit mapping; use the country configuration
  // if this country is not in the mapping.
  const mappedCurrency = currencyByCountry[normalizedCountryCode];

  const currencyCode =
    mappedCurrency?.code ??
    ("currency" in country &&
    typeof country.currency === "object" &&
    country.currency !== null &&
    "code" in country.currency &&
    typeof country.currency.code === "string"
      ? country.currency.code
      : "INR");

  const locale =
    mappedCurrency?.locale ??
    ("currency" in country &&
    typeof country.currency === "object" &&
    country.currency !== null &&
    "locale" in country.currency &&
    typeof country.currency.locale === "string"
      ? country.currency.locale
      : "en-IN");

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}