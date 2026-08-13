"use client";

import { useActionState, useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { SignatureActionState } from "@/lib/signatures/action-state";
import type { SignatureClearanceType, SignerRole } from "@/types/database";

type SignatureAction = (
  previousState: SignatureActionState,
  formData: FormData
) => Promise<SignatureActionState>;

export type SignatureEvidenceView = {
  signerName: string;
  signedAt: string;
  signedUrl?: string | null;
  isCurrent: boolean;
  inputType?: "DRAWN";
};

function setCanvasStyle(context: CanvasRenderingContext2D) {
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = "#111827";
  context.lineWidth = 2.4;
}

export function ESignatureInput({
  action,
  enrollmentId,
  signerRole,
  clearanceType,
  signerLabel,
  signerName,
  title,
  description,
  signedSignature,
  applyLabel = "Apply E-Signature"
}: {
  action: SignatureAction;
  enrollmentId: string;
  signerRole: SignerRole;
  clearanceType: SignatureClearanceType;
  signerLabel: string;
  signerName: string;
  title?: string;
  description?: string;
  signedSignature?: SignatureEvidenceView | null;
  applyLabel?: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {} as SignatureActionState);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hiddenSignatureRef = useRef<HTMLInputElement | null>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const keyboardPenDownRef = useRef(false);
  const keyboardPositionRef = useRef({ x: 24, y: 72 });
  const [hasInk, setHasInk] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    setCanvasStyle(context);
    hasInkRef.current = false;
    keyboardPenDownRef.current = false;
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
    keyboardPositionRef.current = { x: Math.min(24, rect.width / 2), y: Math.min(72, rect.height / 2) };
    hasInkRef.current = false;
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

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

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
    hasInkRef.current = true;
    setHasInk(true);
    setLocalError(null);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointFromEvent(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyboardDraw(event: ReactKeyboardEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (event.key === " ") {
      event.preventDefault();
      keyboardPenDownRef.current = !keyboardPenDownRef.current;
      if (keyboardPenDownRef.current) {
        context.beginPath();
        context.moveTo(keyboardPositionRef.current.x, keyboardPositionRef.current.y);
      }
      return;
    }

    const movement: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -8, y: 0 },
      ArrowRight: { x: 8, y: 0 },
      ArrowUp: { x: 0, y: -8 },
      ArrowDown: { x: 0, y: 8 }
    };
    const delta = movement[event.key];
    if (!delta) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const next = {
      x: Math.max(2, Math.min(rect.width - 2, keyboardPositionRef.current.x + delta.x)),
      y: Math.max(2, Math.min(rect.height - 2, keyboardPositionRef.current.y + delta.y))
    };
    if (keyboardPenDownRef.current) {
      context.lineTo(next.x, next.y);
      context.stroke();
      hasInkRef.current = true;
      setHasInk(true);
      setLocalError(null);
    }
    keyboardPositionRef.current = next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hasInkRef.current) {
      event.preventDefault();
      setLocalError("Draw a signature before applying it.");
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

  if (signedSignature?.isCurrent) {
    return (
      <section className="rounded-lg border border-slateui-border bg-slateui-surface p-4" aria-label={`${signerLabel} signature status`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slateui-text">{title ?? `${signerLabel} E-Signature`}</h3>
            <p className="mt-1 text-sm text-slateui-muted">
              {signedSignature.isCurrent ? "Electronically signed and bound to the current clearance data." : "This signature is invalidated because the signed clearance data changed."}
            </p>
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${signedSignature.isCurrent ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
            {signedSignature.isCurrent ? "SIGNED" : "INVALIDATED"}
          </span>
        </div>
        {signedSignature.isCurrent && signedSignature.signedUrl ? (
          <div className="mt-4 rounded-md border border-dashed border-slateui-border bg-white p-3">
            <img src={signedSignature.signedUrl} alt={`${signerLabel} electronic signature`} className="h-24 w-full object-contain object-left" />
          </div>
        ) : null}
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="font-semibold text-slateui-muted">Signer</dt><dd className="text-slateui-text">{signedSignature.signerName}</dd></div>
          <div><dt className="font-semibold text-slateui-muted">Signed</dt><dd className="text-slateui-text">{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(signedSignature.signedAt))}</dd></div>
        </dl>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slateui-border bg-white p-4 shadow-sm" aria-label={`${signerLabel} signature input`}>
      <div>
        <h3 className="font-bold text-slateui-text">{title ?? `${signerLabel} E-Signature`}</h3>
        <p className="mt-1 text-sm leading-6 text-slateui-secondary">
          {description ?? `Draw your own signature for the ${clearanceType.replaceAll("_", " ").toLowerCase()} section. It is stored privately and cannot be overwritten.`}
        </p>
        <p className="mt-2 text-xs font-semibold text-slateui-muted">Authenticated signer: {signerName}</p>
        <p id={`${enrollmentId}-${clearanceType}-instructions`} className="mt-2 text-xs leading-5 text-slateui-muted">
          Use a mouse, touch screen, or stylus. Keyboard users can focus the pad, press Space to raise/lower the pen, and use the arrow keys to draw.
        </p>
      </div>

      {signedSignature && !signedSignature.isCurrent ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          The previous {signerLabel} signature is invalidated because the signed data changed. Draw a new signature to create a new immutable record.
        </p>
      ) : null}

      <form action={formAction} onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        <input type="hidden" name="official_role" value={signerRole} />
        <input type="hidden" name="clearance_type" value={clearanceType} />
        <input ref={hiddenSignatureRef} type="hidden" name="signature_data" />
        <div className="overflow-hidden rounded-md border border-slateui-border bg-slateui-surfaceAlt">
          <canvas
            ref={canvasRef}
            width={640}
            height={180}
            tabIndex={0}
            role="img"
            aria-label={`Draw ${signerLabel} signature`}
            aria-describedby={`${enrollmentId}-${clearanceType}-instructions`}
            className="block h-44 w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-inset"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyboardDraw}
          />
        </div>
        {localError ? <p role="alert" className="text-sm font-semibold text-red-700">{localError}</p> : null}
        {state.message ? <p role={state.success ? "status" : "alert"} className={state.success ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-700"}>{state.message}</p> : null}
        <label className="flex items-start gap-2 text-sm leading-6 text-slateui-secondary">
          <input type="checkbox" name="signature_confirmation" required className="mt-1 h-4 w-4 rounded border-slateui-border text-primary-800 focus:ring-primary-700" />
          <span>I confirm that this drawn mark is my own electronic signature and that I am the authenticated {signerLabel}.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={resetCanvas} disabled={pending || !hasInk}>Clear</Button>
          <Button type="submit" disabled={pending || !hasInk}>{pending ? "Saving..." : applyLabel}</Button>
        </div>
      </form>
    </section>
  );
}
