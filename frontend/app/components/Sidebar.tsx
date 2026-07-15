"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12l8.25-8.25L20.25 12M4.5 9.75V20.25a.75.75 0 00.75.75H9.5a.75.75 0 00.75-.75V15a.75.75 0 01.75-.75h2a.75.75 0 01.75.75v5.25a.75.75 0 00.75.75h4.25a.75.75 0 00.75-.75V9.75"
      />
    ),
  },
  {
    href: "/reviews",
    label: "Reviews",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12M8.25 17.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75V12zm0 5.25h.007v.008H3.75v-.008z"
      />
    ),
  },
  {
    href: "/compare",
    label: "Compare",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.5l3.75-4.5 3 3L15 6l6 6M3 13.5V18a.75.75 0 00.75.75h16.5A.75.75 0 0021 18v-4.5M3 13.5h18"
      />
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-slate-950 text-slate-300 min-h-screen">
      <div className="px-5 py-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo-mark.png" alt="Sentimo logo" width={34} height={34} />
          <span className="text-lg font-semibold text-white tracking-tight">Sentimo</span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="h-5 w-5 shrink-0"
              >
                {link.icon}
              </svg>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-5 py-6 text-xs text-slate-500">
        Powered by Gemini
      </div>
    </aside>
  );
}
