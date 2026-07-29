export type NavigationIcon =
  | "account"
  | "balances"
  | "dashboard"
  | "enrollment"
  | "grades"
  | "masterlist"
  | "pending"
  | "reports"
  | "schedule"
  | "students"
  | "subjects";

export type NavigationItem = {
  label: string;
  href: string;
  icon: NavigationIcon;
  section?: "Workflow" | "Reference" | "Account";
  isStub?: boolean;
};

export const publicNavigation = [
  { label: "Login", href: "/login" },
  { label: "About Us", href: "/about" }
];

export const ENABLE_STUB_PAGES = process.env.NEXT_PUBLIC_ENABLE_STUB_PAGES === "true";

export const studentNavigation: NavigationItem[] = [
  { label: "Student Dashboard", href: "/student/dashboard", icon: "dashboard", section: "Workflow" },
  { label: "Online Enrollment", href: "/student/enrollment", icon: "enrollment", section: "Workflow" },
  { label: "Subject List", href: "/student/subjects", icon: "subjects", section: "Reference" },
  ...(ENABLE_STUB_PAGES
    ? [
        { label: "Grades", href: "/student/grades", icon: "grades", section: "Reference", isStub: true } as NavigationItem,
        { label: "Class Schedule", href: "/student/schedule", icon: "schedule", section: "Reference", isStub: true } as NavigationItem,
        { label: "Balances", href: "/student/balances", icon: "balances", section: "Reference", isStub: true } as NavigationItem
      ]
    : []),
  { label: "Account", href: "/student/account", icon: "account", section: "Account" }
];

export const adminNavigation: NavigationItem[] = [
  { label: "Admin Dashboard", href: "/admin/dashboard", icon: "dashboard", section: "Workflow" },
  { label: "Pending Enrollments", href: "/admin/enrollments", icon: "pending", section: "Workflow" },
  { label: "Student Records", href: "/admin/students", icon: "students", section: "Workflow" },
  { label: "Enrollment Masterlist", href: "/admin/masterlist", icon: "masterlist", section: "Reference" },
  { label: "Enrollment Reports", href: "/admin/reports", icon: "reports", section: "Reference" },
  { label: "Account", href: "/admin/account", icon: "account", section: "Account" }
];
