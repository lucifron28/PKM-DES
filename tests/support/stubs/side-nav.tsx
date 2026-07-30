import React from "react";

interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

interface SideNavProps {
  items: NavItem[];
  label: string;
  onNavigate?: () => void;
}

export function SideNav({ items, label, onNavigate }: SideNavProps) {
  return React.createElement("nav", { "data-testid": "sidenav", "aria-label": label },
    ...items.map((item, i) =>
      React.createElement("a", {
        key: item.href,
        href: item.href,
        "data-testid": `nav-link-${i}`,
        tabIndex: 0,
        onClick: onNavigate,
      }, item.label)
    )
  );
}
