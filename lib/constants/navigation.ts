export type NavigationIcon =
  | "account"
  | "balances"
  | "dashboard"
  | "enrollment"
  | "grades"
  | "masterlist"
  | "pending"
  | "schedule"
  | "students"
  | "subjects";

export type NavigationItem = {
  label: string;
  href: string;
  icon: NavigationIcon;
};

export const publicNavigation = [
  { label: "Login", href: "/login" },
  { label: "About Us", href: "/about" }
];

export const studentNavigation: NavigationItem[] = [
  { label: "Student Dashboard", href: "/student/dashboard", icon: "dashboard" },
  { label: "Online Enrollment", href: "/student/enrollment", icon: "enrollment" },
  { label: "Subject List", href: "/student/subjects", icon: "subjects" },
  { label: "Grades", href: "/student/grades", icon: "grades" },
  { label: "Class Schedule", href: "/student/schedule", icon: "schedule" },
  { label: "Balances", href: "/student/balances", icon: "balances" },
  { label: "Account", href: "/student/account", icon: "account" }
];

export const adminNavigation: NavigationItem[] = [
  { label: "Admin Dashboard", href: "/admin/dashboard", icon: "dashboard" },
  { label: "Enrollment Masterlist", href: "/admin/masterlist", icon: "masterlist" },
  { label: "Pending Enrollments", href: "/admin/enrollments", icon: "pending" },
  { label: "Student Records", href: "/admin/students", icon: "students" }
];
