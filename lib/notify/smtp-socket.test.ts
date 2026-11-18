import { createServer, type Server } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const tlsConnect = vi.hoisted(() => vi.fn());
vi.mock("node:tls", () => ({ default: { connect: tlsConnect }, connect: tlsConnect }));

import { openSmtpSocket, smtpOptions } from "./email";

let server: Server;
let port = 0;
beforeAll(async () => {
  server = createServer((s) => s.end("220 ready\r\n"));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  port = (server.address() as { port: number }).port;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("openSmtpSocket", () => {
  it("connects to the host name (not a looked-up IP) with TLS on port 465", () => {
    tlsConnect.mockReturnValue({ once: vi.fn() });
    openSmtpSocket({ host: "smtp.zoho.in", port: 465, secure: true }, () => {});
    expect(tlsConnect).toHaveBeenCalledWith({ host: "smtp.zoho.in", port: 465, servername: "smtp.zoho.in" }, expect.any(Function));
  });

  it("hands back an open plain socket for STARTTLS servers", async () => {
    const result = await new Promise<{ secured: boolean; end: () => void }>((resolve, reject) =>
      openSmtpSocket({ host: "localhost", port, secure: false }, (err, r) => (err ? reject(err) : resolve({ secured: r!.secured, end: () => r!.connection.end() }))),
    );
    expect(result.secured).toBe(false);
    result.end();
  });

  it("reports a connection that fails", async () => {
    const err = await new Promise<Error | null>((resolve) => openSmtpSocket({ host: "127.0.0.1", port: 1, secure: false }, (e) => resolve(e)));
    expect(err).toBeInstanceOf(Error);
  });

  it("is what nodemailer uses to connect", () => {
    tlsConnect.mockClear().mockReturnValue({ once: vi.fn() });
    smtpOptions({ SMTP_HOST: "smtp.zoho.in", SMTP_PORT: "465" }).getSocket({}, () => {});
    expect(tlsConnect).toHaveBeenCalledWith(expect.objectContaining({ host: "smtp.zoho.in", port: 465 }), expect.any(Function));
  });
});
