import Link from "next/link";

const features = [
  {
    title: "AI Voice Receptionist",
    description:
      "Answer calls, handle common questions, check availability and book appointments automatically.",
  },
  {
    title: "WhatsApp Automation",
    description:
      "Turn WhatsApp into an automated patient communication channel for enquiries, reminders and follow-ups.",
  },
  {
    title: "Smart Appointment Booking",
    description:
      "One scheduling engine for your doctors, working hours, availability, capacity and appointments.",
  },
  {
    title: "Patient CRM",
    description:
      "Track every patient from first enquiry to treatment, follow-up, recall and reactivation.",
  },
  {
    title: "Treatment Follow-ups",
    description:
      "Automatically keep patients engaged after consultations, procedures and unfinished treatments.",
  },
  {
    title: "Patient Reactivation",
    description:
      "Identify inactive patients and bring them back with intelligent WhatsApp and voice campaigns.",
  },
];

const workflow = [
  "Patient enquiry",
  "AI conversation",
  "Appointment booking",
  "Visit",
  "Treatment",
  "Follow-up",
  "Recall",
  "Reactivation",
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              D
            </div>

            <div>
              <p className="text-lg font-bold tracking-tight">
                Dental AI OS
              </p>

              <p className="hidden text-xs text-slate-500 sm:block">
                AI operating system for dental clinics
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Features
            </Link>

            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              How it works
            </Link>

            <Link
              href="#pricing"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Pricing
            </Link>

            <Link
              href="#contact"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 sm:block"
            >
              Log in
            </Link>

            <Link
              href="/start"
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.12),_transparent_35%),radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_30%)]" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Built for modern dental clinics
            </div>

            <h1 className="max-w-4xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Your dental clinic,
              <span className="block text-blue-600">
                powered by AI.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Dental AI OS handles the repetitive front-desk work across
              phone, WhatsApp, website and your clinic team — from the
              first patient enquiry to booking, follow-ups, recalls and
              reactivation.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/start"
                className="rounded-xl bg-slate-950 px-6 py-3.5 text-center font-semibold text-white shadow-lg shadow-slate-200 hover:bg-slate-800"
              >
                Start 3-day free trial
              </Link>

              <Link
                href="#how-it-works"
                className="rounded-xl border border-slate-300 px-6 py-3.5 text-center font-semibold text-slate-700 hover:bg-slate-50"
              >
                See how it works
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-500">
              <span>✓ No long-term commitment</span>
              <span>✓ Multi-doctor clinics</span>
              <span>✓ Human receptionist control</span>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/70">
              <div className="rounded-2xl bg-slate-950 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400">
                      DENTAL AI OS
                    </p>

                    <p className="mt-1 text-lg font-semibold text-white">
                      Clinic overview
                    </p>
                  </div>

                  <div className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                    AI Active
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <PreviewCard
                    label="Appointments"
                    value="24"
                    detail="+18% this week"
                  />

                  <PreviewCard
                    label="New patients"
                    value="12"
                    detail="This month"
                  />

                  <PreviewCard
                    label="AI conversations"
                    value="186"
                    detail="This month"
                  />

                  <PreviewCard
                    label="Follow-ups"
                    value="31"
                    detail="Pending"
                  />
                </div>

                <div className="mt-3 rounded-xl bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      Patient journey
                    </p>

                    <p className="text-xs text-slate-500">
                      Automated
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 overflow-hidden">
                    {["Enquiry", "Booking", "Visit", "Treatment"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className="flex min-w-0 flex-1 items-center gap-2"
                        >
                          <div className="flex-1 rounded-lg bg-blue-500/15 px-2 py-2 text-center text-[11px] font-medium text-blue-300">
                            {item}
                          </div>

                          {index < 3 && (
                            <span className="text-slate-600">
                              →
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:block">
              <p className="text-xs text-slate-500">
                AI receptionist
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                Appointment booked
              </p>

              <p className="mt-1 text-xs text-emerald-600">
                Automatically handled
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-500">
            One platform for your entire patient journey
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[
              "Phone",
              "WhatsApp",
              "Website",
              "Reception",
              "CRM",
              "Appointments",
              "Follow-ups",
              "Recalls",
            ].map((item) => (
              <div
                key={item}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              Everything in one system
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              More than an AI receptionist.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              Dental AI OS connects your clinic&apos;s operations and AI
              automation into one platform.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                number={String(index + 1).padStart(2, "0")}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="bg-slate-950 py-24 text-white"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-400">
              Patient journey
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              From enquiry to reactivation.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              Every patient interaction becomes part of one connected
              workflow.
            </p>
          </div>

          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="text-sm font-bold text-blue-400">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <p className="mt-8 text-lg font-semibold">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-3xl bg-blue-600 px-8 py-14 text-center text-white shadow-xl sm:px-14">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-100">
              Start today
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Give your clinic an AI operating system.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">
              Start with a 3-day free trial and experience how much of
              your repetitive front-desk workflow can be automated.
            </p>

            <div className="mt-8">
              <Link
                href="/start"
                className="inline-flex rounded-xl bg-white px-7 py-3.5 font-semibold text-blue-700 shadow-lg hover:bg-blue-50"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="border-t border-slate-200 bg-slate-50"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-slate-900">
              Dental AI OS
            </p>

            <p className="mt-1 text-sm text-slate-500">
              AI-native operating system for dental clinics.
            </p>
          </div>

          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-900">
              Login
            </Link>

            <Link href="/start" className="hover:text-slate-900">
              Start trial
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function PreviewCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <p className="text-xs text-slate-400">{label}</p>

      <p className="mt-2 text-2xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-emerald-400">
        {detail}
      </p>
    </div>
  );
}

function FeatureCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-blue-600">
          {number}
        </span>

        <div className="h-2 w-2 rounded-full bg-blue-600" />
      </div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}