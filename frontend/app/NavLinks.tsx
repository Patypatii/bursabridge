"use client";

import { MouseEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Phone } from "lucide-react";

const links = [
  { href: "/", label: "Web Chat", Icon: MessageCircle },
  { href: "/ussd", label: "USSD *123#", Icon: Phone },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  const router = useRouter();

  function navigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    if (pathname !== href) {
      router.push(href);
    }
  }

  return (
    <nav className="flex items-center gap-2 text-sm font-medium">
      {links.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <a
            key={href}
            href={href}
            onClick={(event) => navigate(event, href)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 ${
              active
                ? "bg-[var(--ngcdf-green)] text-white"
                : "text-gray-700 hover:bg-[var(--ngcdf-green-soft)] hover:text-[var(--ngcdf-green-dark)]"
            }`}
          >
            <Icon size={16} /> {label}
          </a>
        );
      })}
    </nav>
  );
}
