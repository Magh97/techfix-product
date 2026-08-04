import { afterEach, describe, expect, it, vi } from "vitest";
import { sendMail } from "./mailer";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("sendMail", () => {
  it("simula el envío y lo reporta cuando no hay SMTP configurado", async () => {
    vi.stubEnv("SMTP_HOST", "");
    const result = await sendMail({ to: "a@b.com", subject: "s", body: "b" });
    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
  });

  it("no falla si SMTP_HOST no está definido", async () => {
    vi.stubEnv("SMTP_HOST", undefined);
    const result = await sendMail({ to: "a@b.com", subject: "s", body: "b" });
    expect(result.ok).toBe(true);
  });
});
