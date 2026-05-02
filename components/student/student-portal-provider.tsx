"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Profile, Student } from "@/types/database";

type StudentPortalContextValue = {
  profile: Profile;
  student: Student | null;
};

const StudentPortalContext = createContext<StudentPortalContextValue | null>(null);

export function StudentPortalProvider({
  value,
  children
}: {
  value: StudentPortalContextValue;
  children: ReactNode;
}) {
  return <StudentPortalContext.Provider value={value}>{children}</StudentPortalContext.Provider>;
}

export function useStudentPortal() {
  const context = useContext(StudentPortalContext);

  if (!context) {
    throw new Error("useStudentPortal must be used inside StudentPortalProvider.");
  }

  return context;
}
