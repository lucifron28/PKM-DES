export function maskRecipientEmail(value: string) {
  const [localPart, domain] = value.trim().split("@");
  if (!localPart || !domain) return "masked-recipient";

  return `${localPart.slice(0, 1)}${"*".repeat(Math.max(1, localPart.length - 1))}@${domain}`;
}
