export type CountryConfig = {
  code: string
  name: string
  currency: string
  currencySymbol: string
  timezone: string
  phoneCode: string
  languages: string[]
  taxName: string
  taxPercent: number
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: "IN",
    name: "India",
    currency: "INR",
    currencySymbol: "₹",
    timezone: "Asia/Kolkata",
    phoneCode: "+91",
    languages: ["en-IN", "hi-IN", "mr-IN"],
    taxName: "GST",
    taxPercent: 18,
  },
  {
    code: "US",
    name: "United States",
    currency: "USD",
    currencySymbol: "$",
    timezone: "America/New_York",
    phoneCode: "+1",
    languages: ["en-US"],
    taxName: "Sales Tax",
    taxPercent: 0,
  },
  {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    timezone: "Europe/London",
    phoneCode: "+44",
    languages: ["en-GB"],
    taxName: "VAT",
    taxPercent: 20,
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "د.إ",
    timezone: "Asia/Dubai",
    phoneCode: "+971",
    languages: ["en-AE", "ar-AE"],
    taxName: "VAT",
    taxPercent: 5,
  },
]

export function getCountryConfig(
  code: string,
): CountryConfig | undefined {
  return COUNTRIES.find(
    (country) => country.code === code,
  )
}