"use client";

import AppShell from "@/components/layout/AppShell";
import { useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Clock3,
  Headphones,
  Search,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import {
  Panel,
  Pill,
  Stat,
  WorkspacePage,
} from "@/components/ai-os/WorkspacePage";

type CallStatus = "Answered" | "Missed" | "Needs review";

type CallRecord = {
  id: string;
  caller: string;
  date: string;
  duration: string;
  language: string;
  status: CallStatus;
  summary: string;
  transcript: { speaker: string; message: string }[];
};

export default function CallsPage() {
  // No real call-history API exists yet. Keep this page honest and empty.
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  const calls: CallRecord[] = [];

  const filteredCalls = useMemo(() => {
    const query = search.trim().toLowerCase();

    return calls.filter((call) => {
      const matchesSearch =
        !query ||
        `${call.id} ${call.caller} ${call.language} ${call.summary}`
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" || call.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  return (
    <AppShell>
      <WorkspacePage
        title="Call History & Transcripts"
        description="Review receptionist calls, transcripts, summaries, outcomes, and follow-up requirements."
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total calls" value="—" />
          <Stat label="Answered calls" value="—" />
          <Stat label="Missed calls" value="—" />
          <Stat label="Needs review" value="—" />
        </div>

        <Panel title="Call records">
          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search caller, call ID, or language..."
                aria-label="Search call records"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter calls by status"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="All">All statuses</option>
              <option value="Answered">Answered</option>
              <option value="Missed">Missed</option>
              <option value="Needs review">Needs review</option>
            </select>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Recent calls
                </h3>
                <Pill>{filteredCalls.length} records</Pill>
              </div>

              {filteredCalls.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
                  <Headphones className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <h4 className="text-sm font-semibold text-slate-900">
                    No call records yet
                  </h4>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                    {search || statusFilter !== "All"
                      ? "No calls match your search or selected filter."
                      : "Real calls will appear here after telephony integration and backend call logging are implemented."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCalls.map((call) => (
                    <button
                      key={call.id}
                      onClick={() => setSelectedCall(call)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedCall?.id === call.id
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">
                            {call.caller}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {call.id}
                          </p>
                        </div>
                        <Pill>{call.status}</Pill>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        {call.date} · {call.duration} · {call.language}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              {selectedCall ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {selectedCall.caller}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedCall.id}
                      </p>
                    </div>
                    <Pill>{selectedCall.status}</Pill>
                  </div>

                  <div className="my-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3">
                      <Clock3 className="mb-2 h-4 w-4 text-slate-500" />
                      <p className="text-xs text-slate-500">Duration</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedCall.duration}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <CalendarDays className="mb-2 h-4 w-4 text-slate-500" />
                      <p className="text-xs text-slate-500">Call date</p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedCall.date}
                      </p>
                    </div>
                  </div>

                  <h4 className="mb-2 text-sm font-semibold text-slate-900">
                    Call summary
                  </h4>
                  <p className="mb-5 text-sm leading-6 text-slate-600">
                    {selectedCall.summary}
                  </p>

                  <h4 className="mb-3 text-sm font-semibold text-slate-900">
                    Transcript
                  </h4>
                  <div className="space-y-3">
                    {selectedCall.transcript.map((turn, index) => (
                      <div
                        key={`${selectedCall.id}-${index}`}
                        className={`rounded-xl p-3 ${
                          turn.speaker === "AI receptionist"
                            ? "bg-blue-50"
                            : "bg-slate-100"
                        }`}
                      >
                        <p className="mb-1 text-xs font-semibold text-slate-500">
                          {turn.speaker}
                        </p>
                        <p className="text-sm leading-6 text-slate-800">
                          {turn.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center text-center">
                  <UserRound className="mb-3 h-8 w-8 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Call details
                  </h3>
                  <p className="mt-2 max-w-xs text-sm text-slate-500">
                    Select a call to inspect its details and transcript once
                    call records are available.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Call history is not connected to real telephony yet. The totals
              and records will be populated after we implement call logging
              in the backend.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Activity className="h-4 w-4" />
            <span>Current state: awaiting backend integration</span>
          </div>
        </Panel>
      </WorkspacePage>
    </AppShell>
  );
}
