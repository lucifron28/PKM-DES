"use client";
import { useActionState } from "react";
import { uploadMedicalDocumentAction } from "@/app/student/medical-documents/actions";
import { Button } from "@/components/ui/button";

export function MedicalDocumentUpload({ enrollmentId }: { enrollmentId: string }) {
  const [state, action, pending] = useActionState(uploadMedicalDocumentAction, {});
  return <form action={action} className="space-y-4">
    <input type="hidden" name="enrollment_id" value={enrollmentId} />
    <label className="block font-semibold" htmlFor="medical-document">Supporting medical paper</label>
    <input id="medical-document" name="document" type="file" accept="application/pdf,image/jpeg,image/png" required />
    <p className="text-sm">PDF, JPEG, or PNG, up to 1 MB. Submit each missing paper separately. Earlier papers remain on file.</p>
    {state.message ? <p role={state.success ? "status" : "alert"}>{state.message}</p> : null}
    <Button type="submit" disabled={pending}>{pending ? "Uploading..." : "Submit for Nurse Review"}</Button>
  </form>;
}
