import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("combina clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores falsy", () => {
    const falso = false;
    expect(cn("text-primary", falso && "text-danger", undefined, "bg-surface")).toBe("text-primary bg-surface");
  });
});
