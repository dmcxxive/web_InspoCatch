import Link from "next/link";
import { Sparkles, Backpack, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "探索", icon: Sparkles },
  { href: "/backpack", label: "灵感背包", icon: Backpack },
  { href: "/settings", label: "设置", icon: Settings },
];

export function AppHeader() {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <Sparkles className="h-6 w-6" aria-hidden />
        灵感捕手
        <span className="text-muted-foreground text-sm font-normal">
          InspoCatch
        </span>
      </Link>
      <nav className="flex flex-wrap gap-2">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
