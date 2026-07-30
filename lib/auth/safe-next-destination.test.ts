import assert from "node:assert/strict";
import test from "node:test";
import { getSafeNextDestination } from "./safe-next-destination";

test("accepts valid same-role student routes", () => {
  assert.equal(getSafeNextDestination("/student/cor", "student"), "/student/cor");
  assert.equal(getSafeNextDestination("/student/enrollment-status", "student"), "/student/enrollment-status");
  assert.equal(getSafeNextDestination("/student/dashboard", "student"), "/student/dashboard");
});

test("accepts valid same-role admin routes", () => {
  assert.equal(getSafeNextDestination("/admin/students", "admin"), "/admin/students");
  assert.equal(getSafeNextDestination("/admin/enrollments", "admin"), "/admin/enrollments");
});

test("rejects cross-role destinations and falls back to role dashboard", () => {
  assert.equal(getSafeNextDestination("/admin/students", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("/student/cor", "admin"), "/admin/dashboard");
});

test("rejects absolute, protocol-relative, and malformed URLs", () => {
  assert.equal(getSafeNextDestination("https://evil.com/phish", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("http://evil.com", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("//evil.com", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("\\evil.com", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("javascript:alert(1)", "student"), "/student/dashboard");
});

test("preserves valid query parameters on same-role internal routes", () => {
  assert.equal(getSafeNextDestination("/admin/students?q=Santos", "admin"), "/admin/students?q=Santos");
});
