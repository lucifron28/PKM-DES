export function maskDisplayName(firstName: string, lastName: string) {
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();

  return normalizedLastName ? `${normalizedFirstName} ${normalizedLastName.charAt(0)}.` : normalizedFirstName;
}

export function maskEmail(email: string) {
  const [localPart, domain = ""] = email.split("@");
  const visible = localPart.charAt(0) || "*";

  return `${visible}***@${domain}`;
}

export function maskStudentId(studentIdNumber: string) {
  const suffix = studentIdNumber.slice(-4);
  return `${"*".repeat(Math.max(4, studentIdNumber.length - suffix.length))}${suffix}`;
}
