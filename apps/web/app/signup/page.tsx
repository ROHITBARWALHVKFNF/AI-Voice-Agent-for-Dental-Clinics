"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { COUNTRIES, getCountryConfig } from "@/lib/countries"

export default function SignupPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [clinicName, setClinicName] = useState("")
  const [country, setCountry] = useState("IN")
  const [description, setDescription] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedCountry = getCountryConfig(country)

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setError("")

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      )
      return
    }

    if (!selectedCountry) {
      setError("Please select a valid country.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            password,
            clinic_name: clinicName.trim(),
            country: selectedCountry.code,
            description:
              description.trim() || null,
          }),
        },
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Unable to create your account.",
        )
      }

      localStorage.setItem(
        "dental_ai_token",
        data.access_token,
      )

      localStorage.setItem(
        "dental_ai_organization_id",
        data.organization_id,
      )

      localStorage.setItem(
        "dental_ai_user_id",
        data.user_id,
      )

      router.push("/dashboard")
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">

        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">
            Dental AI Clinic OS
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Create your clinic account
          </h1>

          <p className="mt-2 text-gray-500">
            Set up your clinic once. Your country,
            currency, timezone and regional settings
            will be automatically configured.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl p-8 space-y-6"
        >

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your full name
            </label>

            <input
              type="text"
              required
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              placeholder="Rohit Barwal"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>

            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Clinic information
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              This information is saved to your clinic
              organization.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinic name
            </label>

            <input
              type="text"
              required
              value={clinicName}
              onChange={(event) =>
                setClinicName(event.target.value)
              }
              placeholder="Smile Dental Clinic"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinic country
            </label>

            <select
              value={country}
              onChange={(event) =>
                setCountry(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-white outline-none focus:border-blue-500"
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
              You only select this during account
              onboarding.
            </p>
          </div>

          {selectedCountry && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-5">

              <h3 className="font-semibold text-gray-900 mb-4">
                Automatic regional configuration
              </h3>

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
                    Phone
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinic description
              <span className="text-gray-400">
                {" "}optional
              </span>
            </label>

            <textarea
              rows={3}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Brief description of your clinic"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none resize-none focus:border-blue-500"
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
            className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? "Creating your clinic..."
              : "Create Clinic Account"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign in
            </a>
          </p>

        </form>
      </div>
    </main>
  )
}