import { isCompleteStandardLoad } from "@/lib/enrollment/standard-load";
import type { CourseOffering, StandardLoadSet, StudentType } from "@/types/database";

const STANDARD_LOAD_TYPES: StudentType[] = [
  "Incoming 1st Year Student",
  "Old Student",
  "Continuing Student",
  "Regular Student"
];

export function requiresRegistrarAssignedLoad(
  studentType: StudentType,
  loadSet: Pick<StandardLoadSet, "status" | "expected_course_count" | "expected_total_units"> | null,
  offerings: Pick<CourseOffering, "units">[]
) {
  if (studentType === "Transferee" || studentType === "Irregular Student") {
    return true;
  }

  return STANDARD_LOAD_TYPES.includes(studentType)
    && !isCompleteStandardLoad(loadSet, offerings);
}
