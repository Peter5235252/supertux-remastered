import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(process.argv[2] ?? "build");
const require = createRequire(path.join(root, "node", "package.json"));
const { chromium } = require("playwright-core");
const timeoutMs = Number(process.env.SUPERTUX_WASM_SMOKE_TIMEOUT_MS ?? 180000);
const output = [];
let lastPhase = "(C++ startup has not reported a phase)";
let browser;

function log(message) {
  const line = String(message);
  output.push(line);
  console.log(line);
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".map": "application/json",
  ".png": "image/png",
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "supertux2.html" : pathname.replace(/^\/+/, "");
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const details = await stat(filename);
    if (!details.isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(filename)] ?? "application/octet-stream",
      "Content-Length": details.size,
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    });
    createReadStream(filename).pipe(res);
  } catch {
    res.writeHead(404).end();
  }
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/supertux2.html`;

try {
  browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-unsafe-webgpu",
      "--enable-features=Vulkan",
      "--use-angle=vulkan",
      "--ignore-gpu-blocklist",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  let finish;
  const verdict = new Promise(resolve => { finish = resolve; });
  let finished = false;
  const settle = result => {
    if (!finished) {
      finished = true;
      finish(result);
    }
  };

  page.on("console", message => {
    const text = message.text();
    log(`[browser:${message.type()}] ${text}`);
    const phase = text.match(/^\[superTux\]\[phase\] (.+)$/);
    if (phase) {
      lastPhase = phase[1];
      if (lastPhase === "FIRST_FRAME_RENDERED") {
        settle({ ok: true, reason: "SuperTux rendered its first frame." });
      }
    }
    if (/Unhandled startup rejection|RuntimeError:|WebGPU preflight failed|GPU initialization failed/i.test(text)) {
      settle({ ok: false, reason: text });
    }
  });

  page.on("pageerror", error => {
    log(`[pageerror] ${error.stack ?? error.message}`);
    settle({ ok: false, reason: error.message });
  });

  page.on("requestfailed", request => {
    log(`[requestfailed] ${request.url()} — ${request.failure()?.errorText ?? "unknown error"}`);
  });

  log(`Opening ${url}`);
  log(`Timeout: ${timeoutMs} ms`);
  const navigation = page.goto(url, { waitUntil: "domcontentloaded" }).catch(error => {
    settle({ ok: false, reason: `Navigation failed: ${error.message}` });
  });
  const timeout = new Promise(resolve => setTimeout(() => {
    resolve({ ok: false, reason: `Timed out after ${timeoutMs} ms; last startup phase: ${lastPhase}` });
  }, timeoutMs));

  const result = await Promise.race([verdict, timeout]);
  log(`RESULT: ${result.ok ? "PASS" : "FAIL"} — ${result.reason}`);
  if (!result.ok) {
    log(`LAST STARTUP PHASE: ${lastPhase}`);
  }

  await navigation;
  try {
    await page.screenshot({ path: path.join(root, "browser-smoke.png"), fullPage: true });
  } catch (error) {
    log(`Screenshot failed: ${error.message}`);
  }

  await writeFile(path.join(root, "browser-smoke.log"), output.join("\n") + "\n");
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  process.exit(result.ok ? 0 : 1);
} catch (error) {
  log(`Harness error: ${error.stack ?? error.message}`);
  await writeFile(path.join(root, "browser-smoke.log"), output.join("\n") + "\n").catch(() => {});
  if (browser) await browser.close().catch(() => {});
  await new Promise(resolve => server.close(resolve));
  process.exit(1);
}
