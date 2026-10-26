"use client";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
export function WorkspacePage({title,description,children}:{title:string;description:string;children:ReactNode}) {
 return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8"><header><p className="text-sm font-medium text-blue-600">Dental AI Clinic OS</p><h1 className="mt-1 text-2xl font-semibold text-slate-950">{title}</h1><p className="mt-2 text-sm text-slate-600">{description}</p></header><div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><Info className="h-4 w-4 shrink-0"/><p>Prototype screen. Demo data is not saved to the clinic database.</p></div>{children}</main>;
}
export function Panel({title,children}:{title:string;children:ReactNode}) { return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><h2 className="mb-4 font-semibold text-slate-900">{title}</h2>{children}</section>; }
export function Stat({label,value}:{label:string;value:string}) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></div>; }
export function Pill({children}:{children:ReactNode}) { return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{children}</span>; }
