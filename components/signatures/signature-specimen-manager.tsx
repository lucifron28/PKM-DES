"use client";

import { useActionState, useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@/components/ui/button";
import type { SignatureActionState } from "@/lib/signatures/action-state";
import { hasMeaningfulSignatureMotion, signatureSegmentDistance, type SignaturePoint } from "@/lib/signatures/drawing";
import type { SignatureSpecimenView } from "@/lib/signatures/specimens";

type SpecimenAction = (
  previousState: SignatureActionState,
  formData: FormData
) => Promise<SignatureActionState>;

function setCanvasStyle(context: CanvasRenderingContext2D) {
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#111827";
  context.lineWidth = 2.4;
}

export function SignatureSpecimenManager({
  specimen,
  roleLabels,
  saveAction,
  deleteAction
}: {
  specimen: SignatureSpecimenView | null;
  roleLabels: string[];
  saveAction: SpecimenAction;
  deleteAction: SpecimenAction;
}) {
  const [saveState, saveFormAction, savePending] = useActionState(saveAction, {} as SignatureActionState);
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteAction, {} as SignatureActionState);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenSignatureRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<SignaturePoint | null>(null);
  const pathDistanceRef = useRef(0);
  const [hasInk, setHasInk] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    setCanvasStyle(context);
    drawingRef.current = false;
    lastPointRef.current = null;
    pathDistanceRef.current = 0;
    setHasInk(false);
    setLocalError(null);
    if (hiddenSignatureRef.current) hiddenSignatureRef.current.value = "";
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    setCanvasStyle(context);
    drawingRef.current = false;
    lastPointRef.current = null;
    pathDistanceRef.current = 0;
    setHasInk(false);
  }, []);

  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [resizeCanvas]);

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawingRef.current = true;
    lastPointRef.current = point;
    setLocalError(null);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    if (lastPointRef.current) pathDistanceRef.current += signatureSegmentDistance(lastPointRef.current, point);
    lastPointRef.current = point;
    context.lineTo(point.x, point.y);
    context.stroke();
    if (hasMeaningfulSignatureMotion(pathDistanceRef.current)) setHasInk(true);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hasInk || !hasMeaningfulSignatureMotion(pathDistanceRef.current)) {
      event.preventDefault();
      setLocalError("Draw a real signature before saving it. A blank mark or tiny dot is not accepted.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas || !hiddenSignatureRef.current) {
      event.preventDefault();
      setLocalError("The signature pad is not ready. Please refresh and try again.");
      return;
    }
    hiddenSignatureRef.current.value = canvas.toDataURL("image/png");
  }

  const roleSummary = roleLabels.length ? roleLabels.join(", ") : "your authenticated account";

  return (
    <section className="rounded-lg border border-primary-200 bg-white p-5 shadow-panel sm:p-6" aria-labelledby="signature-specimen-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-800">Private account setting</p>
          <h2 id="signature-specimen-title" className="mt-1 text-xl font-bold text-slateui-text">Saved Signature Specimen</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slateui-muted">
            Save one private signature for {roleSummary}. Choosing it during a signing step still requires a separate confirmation.
          </p>
        </div>
        <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-900">
          {specimen ? "Ready to use" : "Not saved"}
        </span>
      </div>

      {specimen ? (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-md border border-slateui-border bg-slateui-surfaceAlt p-4">
          {specimen.signedUrl ? <img src={specimen.signedUrl} alt="Current saved signature specimen" className="h-16 max-w-[18rem] object-contain object-left" /> : null}
          <div className="text-sm">
            <p className="font-bold text-slateui-text">Current specimen</p>
            <p className="mt-1 text-slateui-muted">Created {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(specimen.createdAt))}.</p>
            <p className="mt-1 text-xs text-slateui-muted">Replacing or removing this specimen does not change any already signed enrollment record.</p>
          </div>
        </div>
      ) : null}

      <form action={saveFormAction} onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input ref={hiddenSignatureRef} type="hidden" name="signature_data" />
        <div className="overflow-hidden rounded-md border border-slateui-border bg-slateui-surfaceAlt">
          <canvas
            ref={canvasRef}
            width={640}
            height={180}
            tabIndex={0}
            role="img"
            aria-label="Draw saved signature specimen"
            className="block h-44 w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
        <p className="text-xs leading-5 text-slateui-muted">Use a mouse, touch screen, or stylus. A click, one-pixel dot, or empty canvas cannot be saved.</p>
        {localError ? <p role="alert" className="text-sm font-semibold text-red-700">{localError}</p> : null}
        {saveState.message ? <p role={saveState.success ? "status" : "alert"} className={saveState.success ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-700"}>{saveState.message}</p> : null}
        {deleteState.message ? <p role={deleteState.success ? "status" : "alert"} className={deleteState.success ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-700"}>{deleteState.message}</p> : null}
        <label className="flex items-start gap-2 text-sm leading-6 text-slateui-secondary">
          <input type="checkbox" name="specimen_confirmation" required className="mt-1 h-4 w-4 rounded border-slateui-border text-primary-800 focus:ring-primary-700" />
          <span>I confirm this is my own electronic signature and I want to keep it as a private saved specimen.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={resetCanvas} disabled={savePending || !hasInk}>Clear</Button>
          <Button type="submit" disabled={savePending || !hasInk}>{savePending ? "Saving..." : specimen ? "Replace Saved Signature" : "Save Signature Specimen"}</Button>
        </div>
      </form>

      {specimen ? (
        <form action={deleteFormAction} className="mt-4 border-t border-slateui-border pt-4" onSubmit={(event) => {
          if (!window.confirm("Remove the saved specimen? Existing signed records will remain unchanged.")) event.preventDefault();
        }}>
          <input type="hidden" name="signature_specimen_id" value={specimen.id} />
          <Button type="submit" variant="danger" disabled={deletePending}>{deletePending ? "Removing..." : "Remove Saved Specimen"}</Button>
        </form>
      ) : null}
    </section>
  );
}
