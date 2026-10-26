"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import { getUserRole } from "@/lib/api";

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    mobileOpen?: boolean;
    onMobileClose?: () => void;
}

type NavItem = {
    name: string;
    href: string;
    icon: string;
};

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function Icon({
    name,
    size = 20,
}: {
    name: string;
    size?: number;
}) {
    const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.8,
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        "aria-hidden": true as const,
        focusable: false as const,
    };

    switch (name) {
        case "dashboard":
            return (
                <svg {...common}>
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
            );

        case "appointments":
            return (
                <svg {...common}>
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path d="M8 3v4" />
                    <path d="M16 3v4" />
                    <path d="M4 8h16" />
                    <path d="m8 13 2 2 5-5" />
                </svg>
            );

        case "calendar":
            return (
                <svg {...common}>
                    <rect x="3" y="4.5" width="18" height="17" rx="2" />
                    <path d="M16 2.5v4" />
                    <path d="M8 2.5v4" />
                    <path d="M3 9h18" />
                    <path d="M8 13h.01" />
                    <path d="M12 13h.01" />
                    <path d="M16 13h.01" />
                    <path d="M8 17h.01" />
                    <path d="M12 17h.01" />
                </svg>
            );

        case "patients":
            return (
                <svg {...common}>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                    <circle cx="9.5" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            );

        case "doctors":
            return (
                <svg {...common}>
                    <path d="M12 3v18" />
                    <path d="M3 12h18" />
                    <rect x="5" y="5" width="14" height="14" rx="2" />
                </svg>
            );

        case "crm":
            return (
                <svg {...common}>
                    <path d="M4 19V5" />
                    <path d="M4 19h16" />
                    <path d="m7 15 3-4 3 2 4-6" />
                    <circle cx="7" cy="15" r=".8" fill="currentColor" />
                    <circle cx="10" cy="11" r=".8" fill="currentColor" />
                    <circle cx="13" cy="13" r=".8" fill="currentColor" />
                    <circle cx="17" cy="7" r=".8" fill="currentColor" />
                </svg>
            );

        case "followups":
            return (
                <svg {...common}>
                    <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.9-4.2A8.3 8.3 0 0 1 3 12.5 8.5 8.5 0 0 1 12 4a8.5 8.5 0 0 1 9 7.5Z" />
                    <path d="M8 12h.01" />
                    <path d="M12 12h.01" />
                    <path d="M16 12h.01" />
                </svg>
            );

        case "treatments":
            return (
                <svg {...common}>
                    <path d="M8 3v6" />
                    <path d="M16 3v6" />
                    <path d="M8 9c0 4-2 5-2 8a6 6 0 0 0 12 0c0-3-2-4-2-8" />
                    <path d="M6 6h12" />
                </svg>
            );

        case "finance":
            return (
                <svg {...common}>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 10h18" />
                    <path d="M7 15h3" />
                    <path d="M16 14v2" />
                </svg>
            );

        case "settings":
            return (
                <svg {...common}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V20h-2v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.4 15a1.7 1.7 0 0 0-1.55-1H7v-2h.85a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88L9 9.06l1.42-1.42.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V5h2v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1H21v2h-.09a1.7 1.7 0 0 0-1.51 1.4Z" />
                </svg>
            );

        case "logout":
            return (
                <svg {...common}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                </svg>
            );

        case "chevron":
            return (
                <svg {...common}>
                    <path d="m9 18 6-6-6-6" />
                </svg>
            );

        case "menu":
            return (
                <svg {...common}>
                    <path d="M4 6h16" />
                    <path d="M4 12h16" />
                    <path d="M4 18h16" />
                </svg>
            );

        case "close":
            return (
                <svg {...common}>
                    <path d="m6 6 12 12" />
                    <path d="m18 6-12 12" />
                </svg>
            );

        default:
            return null;
    }
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

const workspaceNavigation: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
    { name: "Appointments", href: "/appointments", icon: "appointments" },
    { name: "Calendar", href: "/calendar", icon: "calendar" },
];

const patientNavigation: NavItem[] = [
    { name: "Patients", href: "/patients", icon: "patients" },
    { name: "CRM Overview", href: "/crm", icon: "crm" },
    { name: "Follow-ups", href: "/crm/follow-ups", icon: "followups" },
    { name: "Treatments", href: "/crm/treatments", icon: "treatments" },
];

const operationsNavigation: NavItem[] = [
    { name: "Doctors", href: "/doctors", icon: "doctors" },
    { name: "Finance", href: "/finance", icon: "finance" },
    { name: "Revenue & Profit", href: "/crm/revenue", icon: "finance" },
];

const aiAutomationNavigation: NavItem[] = [
    { name: "Knowledge Base", href: "/knowledge-base", icon: "crm" },
    { name: "Call History", href: "/calls", icon: "appointments" },
    { name: "Conversations", href: "/conversations", icon: "followups" },
    { name: "WhatsApp Automation", href: "/whatsapp", icon: "followups" },
    { name: "Phone Settings", href: "/phone-settings", icon: "settings" },
    { name: "AI Testing", href: "/ai-testing", icon: "dashboard" },
];


function isRouteActive(pathname: string, href: string) {
    if (href === "/dashboard" || href === "/crm") {
        return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                     */
/* -------------------------------------------------------------------------- */

export default function Sidebar({
    collapsed,
    onToggle,
    mobileOpen = false,
    onMobileClose,
}: SidebarProps) {
    const pathname = usePathname();

    const [crmOpen, setCrmOpen] = useState(
        pathname === "/crm" || pathname.startsWith("/crm/")
    );
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        setRole(getUserRole());
    }, []);

    useEffect(() => {
        if (pathname === "/crm" || pathname.startsWith("/crm/")) {
            setCrmOpen(true);
        }
    }, [pathname]);

    const handleNavigation = () => {
        onMobileClose?.();
    };

    const renderLink = (item: NavItem) => {
        const active = isRouteActive(pathname, item.href);

        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={handleNavigation}
                title={collapsed ? item.name : undefined}
                aria-current={active ? "page" : undefined}
                className={[
                    "group relative flex h-11 items-center rounded-xl transition-all",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    active
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
            >
                {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-white" />
                )}

                <span className="flex shrink-0 items-center justify-center">
                    <Icon name={item.icon} size={19} />
                </span>

                {!collapsed && (
                    <span className="text-[13px] font-medium">
                        {item.name}
                    </span>
                )}
            </Link>
        );
    };

    const renderSectionLabel = (label: string) => {
        if (collapsed) return null;

        return (
            <div className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </div>
        );
    };

    return (
        <>
            {/* Mobile backdrop */}
            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    onClick={onMobileClose}
                    className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
                />
            )}

            <aside
                className={[
                    "fixed left-0 top-0 z-50 flex h-screen flex-col",
                    "border-r border-slate-200 bg-white",
                    "transition-all duration-300 ease-in-out",
                    collapsed ? "w-[76px]" : "w-[260px]",
                    mobileOpen
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0",
                ].join(" ")}
            >
                {/* Brand */}
                <div
                    className={[
                        "flex h-16 shrink-0 items-center border-b border-slate-100",
                        collapsed ? "justify-center px-3" : "justify-between px-5",
                    ].join(" ")}
                >
                    <Link
                        href="/dashboard"
                        onClick={handleNavigation}
                        className="flex items-center gap-3"
                        aria-label="Dental AI Clinic OS home"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                            <span className="text-[17px] font-bold">D</span>
                        </div>

                        {!collapsed && (
                            <div className="min-w-0">
                                <div className="text-[15px] font-bold tracking-tight text-slate-900">
                                    Dental AI
                                </div>
                                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
                                    Clinic OS
                                </div>
                            </div>
                        )}
                    </Link>

                    {!collapsed && (
                        <button
                            type="button"
                            onClick={onToggle}
                            aria-label="Collapse sidebar"
                            className="hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:flex"
                        >
                            <Icon name="menu" size={18} />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onMobileClose}
                        aria-label="Close sidebar"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"
                    >
                        <Icon name="close" size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {renderSectionLabel("Clinic Workspace")}
                    <nav aria-label="Clinic workspace" className="space-y-1">
                        {workspaceNavigation.map(renderLink)}
                    </nav>

                    {renderSectionLabel("Patient Management")}

                    <nav aria-label="Patient management" className="space-y-1">
                        {patientNavigation.map(renderLink)}
                    </nav>
                    {renderSectionLabel("AI Reception & Automation")}
                    <nav aria-label="AI reception and automation" className="space-y-1">
                        {aiAutomationNavigation.map(renderLink)}
                    </nav>

                    {renderSectionLabel("Clinic Operations")}
                    <nav aria-label="Clinic operations" className="space-y-1">
                        {operationsNavigation.map(renderLink)}
                    </nav>
                </div>

                {/* Account and actions */}
                <div className="shrink-0 border-t border-slate-100 p-3">
                    {!collapsed && (
                        <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2.5">
                            <div className="truncate text-[12px] font-semibold text-slate-800">
                                Clinic Account
                            </div>
                            <div className="mt-0.5 text-[10px] font-medium capitalize text-slate-400">
                                {role || "User"}
                            </div>
                        </div>
                    )}

                    <Link
                        href="/settings"
                        onClick={handleNavigation}
                        title={collapsed ? "Settings" : undefined}
                        aria-current={
                            isRouteActive(pathname, "/settings") ? "page" : undefined
                        }
                        className={[
                            "mb-1 flex h-10 items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900",
                            collapsed ? "justify-center" : "gap-3 px-3",
                        ].join(" ")}
                    >
                        <Icon name="settings" size={18} />
                        {!collapsed && (
                            <span className="text-[13px] font-medium">Settings</span>
                        )}
                    </Link>

                    <button
                        type="button"
                        onClick={logout}
                        title={collapsed ? "Logout" : undefined}
                        className={[
                            "flex h-10 w-full items-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-600",
                            collapsed ? "justify-center" : "gap-3 px-3",
                        ].join(" ")}
                    >
                        <Icon name="logout" size={18} />
                        {!collapsed && (
                            <span className="text-[13px] font-medium">Logout</span>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}

