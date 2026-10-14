import Link from "next/link";

const plans = [
  {
    name: "Starter",
    slug: "starter",
    description: "For solo dentists and small clinics.",
    doctors: "1 doctor",
    staff: "2 staff",
    voice: "300 voice minutes",
    whatsapp: "500 WhatsApp messages",
  },
  {
    name: "Growth",
    slug: "growth",
    description: "For growing multi-doctor clinics.",
    doctors: "3 doctors",
    staff: "5 staff",
    voice: "1,000 voice minutes",
    whatsapp: "2,000 WhatsApp messages",
    popular: true,
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For established dental clinics.",
    doctors: "10 doctors",
    staff: "15 staff",
    voice: "3,000 voice minutes",
    whatsapp: "5,000 WhatsApp messages",
  },
];

export default function StartPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link
            href="/"
            className="text-xl font-bold text-slate-900"
          >
            Dental AI OS
          </Link>

          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Already have an account? Log in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            3-day free trial
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Choose how your clinic wants to start.
          </h1>

          <p className="mt-5 text-lg text-slate-600">
            Choose a plan now. You can configure your clinic and
            experience the platform during your 3-day trial.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.slug}
              className={`relative rounded-3xl border bg-white p-7 shadow-sm ${
                plan.popular
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-slate-200"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-6 top-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                  Most popular
                </div>
              )}

              <h2 className="text-2xl font-bold text-slate-900">
                {plan.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {plan.description}
              </p>

              <div className="mt-8 space-y-3">
                <PlanFeature text={plan.doctors} />
                <PlanFeature text={plan.staff} />
                <PlanFeature text={plan.voice} />
                <PlanFeature text={plan.whatsapp} />
                <PlanFeature text="Patient CRM" />
                <PlanFeature text="Appointment management" />
                <PlanFeature text="3-day free trial" />
              </div>

              <Link
                href={`/signup?plan=${plan.slug}`}
                className={`mt-8 block rounded-xl px-5 py-3 text-center font-semibold ${
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                Start with {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span className="text-emerald-600">✓</span>
      {text}
    </div>
  );
}
