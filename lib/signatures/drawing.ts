export const MIN_SIGNATURE_PATH_DISTANCE = 8;

export type SignaturePoint = {
  x: number;
  y: number;
};

export function signatureSegmentDistance(from: SignaturePoint, to: SignaturePoint) {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function hasMeaningfulSignatureMotion(pathDistance: number) {
  return Number.isFinite(pathDistance) && pathDistance >= MIN_SIGNATURE_PATH_DISTANCE;
}
