"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { COUNTRIES, getCountryConfig } from "@/lib/countries"

export default function OnboardingPage() {
  const router = useRouter()

  const [clinicName, setClinicName] = useState("")
  const [country, setCountry] = useState("IN")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedCountry = getCountryConfig(country)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    if (!clinicName.trim()) {
      setError("Please enter your clinic name.")
      return
    }

    if (!selectedCountry) {
      setError("Please select a valid country.")
      return
    }

    setLoading(true)

    try {
      /*
       * For now this is the organization creation endpoint.
       * We will connect this to authenticated onboarding
       * once the auth system is implemented.
       */

      const response = await fetch(
        "http://127.0.0.1:8000/organizations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: clinicName.trim(),
            country: selectedCountry.code,
            timezone: selectedCountry.timezone,
            currency: selectedCountry.currency,
            description: description.trim() || null,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to create organization."
        )
      }

      /*
       * Later this will go to:
       *
       * /dashboard
       *
       * after creating the admin user/session.
       */

      router.push("/dashboard")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

          <div className="mb-8">
            <p className="text-sm font-medium text-blue-600 mb-2">
              Clinic setup
            </p>

            <h1 className="text-3xl font-bold text-gray-900">
              Set up your dental clinic
            </h1>

            <p className="text-gray-500 mt-2">
              Tell us where your clinic operates. We will
              automatically configure currency, timezone,
              tax and language defaults.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            <div>
              <label
                htmlFor="clinicName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Clinic name
              </label>

              <input
                id="clinicName"
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="e.g. Smile Dental Clinic"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Clinic country
              </label>

              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {COUNTRIES.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.name}
                  </option>
                ))}
              </select>

              <p className="text-xs text-gray-500 mt-2">
                This is selected during onboarding and
                stored with your clinic.
              </p>
            </div>

            {selectedCountry && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Your default configuration
                </h2>

                <div className="grid grid-cols-2 gap-4">

                  <div>
                    <p className="text-xs text-gray-500">
                      Currency
                    </p>

                    <p className="font-medium text-gray-900">
                      {selectedCountry.currency}{" "}
                      ({selectedCountry.currencySymbol})
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Timezone
                    </p>

                    <p className="font-medium text-gray-900">
                      {selectedCountry.timezone}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Phone code
                    </p>

                    <p className="font-medium text-gray-900">
                      {selectedCountry.phoneCode}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Tax
                    </p>

                    <p className="font-medium text-gray-900">
                      {selectedCountry.taxName}
                      {selectedCountry.taxPercent > 0
                        ? ` (${selectedCountry.taxPercent}%)`
                        : ""}
                    </p>
                  </div>

                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Clinic description
                <span className="text-gray-400">
                  {" "}optional
                </span>
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell us a little about your clinic..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Creating clinic..."
                : "Continue"}
            </button>

          </form>
        </div>
      </div>
    </main>
  )
}