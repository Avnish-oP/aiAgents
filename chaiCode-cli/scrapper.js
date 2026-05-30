// scrapper.js - drop-in replacement
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import puppeteer from "puppeteer";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── helpers ─────────────────────────────────────────────────────────────────

function resolveUrl(base, relative) {
  if (!relative || relative.startsWith("data:") || relative.startsWith("blob:"))
    return null;
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

function sanitizePath(pathname) {
  return (
    pathname
      .replace(/^\/+/, "")
      .replace(/\.\.\//g, "")
      .replace(/[?#]/g, "_")
      .replace(/[<>:"|*]/g, "_") || // Windows-safe
    "index"
  );
}

function urlToLocalPath(assetUrl, assetsDir) {
  try {
    const u = new URL(assetUrl);
    let safePath = sanitizePath(u.pathname);

    // if no extension, try to guess from URL or default to .bin
    if (!path.extname(safePath)) {
      const ext = guessExtFromUrl(assetUrl);
      safePath += ext || ".bin";
    }

    // keep folder structure (e.g. _next/static/css/abc.css)
    return path.join(assetsDir, safePath);
  } catch {
    return null;
  }
}

function guessExtFromUrl(url) {
  const m = url.match(/\.(\w{2,5})(\?|$)/);
  return m ? "." + m[1] : "";
}

function extractCssUrls(css, cssFileUrl) {
  const urls = new Set();
  for (const m of css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g))
    urls.add(resolveUrl(cssFileUrl, m[1].trim()));
  for (const m of css.matchAll(/@import\s+['"]([^'"]+)['"]/g))
    urls.add(resolveUrl(cssFileUrl, m[1].trim()));
  return [...urls].filter(Boolean);
}

async function downloadAsset(assetUrl, assetsDir) {
  const localPath = urlToLocalPath(assetUrl, assetsDir);
  if (!localPath) return null;

  if (fs.existsSync(localPath)) return { assetUrl, localPath };

  try {
    const resp = await axios.get(assetUrl, {
      responseType: "arraybuffer",
      timeout: 20_000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
      maxContentLength: 80 * 1024 * 1024,
      validateStatus: (s) => s < 400,
    });

    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(resp.data));
    return { assetUrl, localPath };
  } catch {
    return null;
  }
}

// ─── asset collector + URL rewriter ──────────────────────────────────────────

function collectAndRewrite($, pageUrl, assetsDir, outputDir) {
  const assets = new Map(); // absUrl → localPath (filled after download)

  const track = (rawUrl) => {
    const abs = resolveUrl(pageUrl, rawUrl);
    if (abs && !assets.has(abs)) assets.set(abs, null);
    return abs;
  };

  // Images
  $("img").each((_, el) => {
    ["src", "data-src", "data-lazy-src", "data-original"].forEach((attr) => {
      const v = $(el).attr(attr);
      if (v) track(v);
    });

    const srcset = $(el).attr("srcset");
    if (srcset) {
      srcset.split(",").forEach((part) => {
        const u = part.trim().split(/\s+/)[0];
        if (u) track(u);
      });
    }
  });

  // CSS
  $("link[rel='stylesheet'], link[as='style']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) track(href);
  });

  // Favicons
  $("link[rel*='icon']").each((_, el) => {
    const href = $(el).attr("href");
    if (href) track(href);
  });

  // Scripts
  $("script[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) track(src);
  });

  // Video / audio
  $("video[src], audio[src]").each((_, el) => {
    track($(el).attr("src"));
  });
  $("video source, audio source").each((_, el) => {
    const src = $(el).attr("src");
    if (src) track(src);
  });

  // Inline style backgrounds
  $("[style]").each((_, el) => {
    const style = $(el).attr("style") || "";
    for (const m of style.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
      track(m[1].trim());
    }
  });

  // <style> blocks (inline CSS)
  $("style").each((_, el) => {
    const css = $(el).html() || "";
    for (const m of css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
      track(m[1].trim());
    }
  });

  // meta og:image, twitter:image
  $("meta[property='og:image'], meta[name='twitter:image']").each((_, el) => {
    const content = $(el).attr("content");
    if (content) track(content);
  });

  return assets;
}

function rewriteHtml($, pageUrl, urlToLocal) {
  const rw = (el, attr) => {
    const original = $(el).attr(attr);
    if (!original) return;
    const abs = resolveUrl(pageUrl, original);
    const local = abs && urlToLocal.get(abs);
    if (local) $(el).attr(attr, local);
  };

  $("img").each((_, el) => {
    rw(el, "src");
    ["data-src", "data-lazy-src", "data-original"].forEach((a) => rw(el, a));

    const srcset = $(el).attr("srcset");
    if (srcset) {
      const newSrcset = srcset
        .split(",")
        .map((part) => {
          const [u, ...rest] = part.trim().split(/\s+/);
          const abs = resolveUrl(pageUrl, u);
          const local = abs && urlToLocal.get(abs);
          return local ? [local, ...rest].join(" ") : part.trim();
        })
        .join(", ");
      $(el).attr("srcset", newSrcset);
    }
  });

  $("link").each((_, el) => rw(el, "href"));
  $("script[src]").each((_, el) => rw(el, "src"));
  $("video, audio").each((_, el) => rw(el, "src"));
  $("video source, audio source").each((_, el) => rw(el, "src"));

  // Rewrite inline style=""
  $("[style]").each((_, el) => {
    let style = $(el).attr("style") || "";
    style = style.replace(/url\(['"]?([^'")]+)['"]?\)/g, (_, u) => {
      const abs = resolveUrl(pageUrl, u.trim());
      const local = abs && urlToLocal.get(abs);
      return `url('${local || u}')`;
    });
    $(el).attr("style", style);
  });

  // Rewrite <style> blocks
  $("style").each((_, el) => {
    let css = $(el).html() || "";
    css = css.replace(/url\(['"]?([^'")]+)['"]?\)/g, (_, u) => {
      const abs = resolveUrl(pageUrl, u.trim());
      const local = abs && urlToLocal.get(abs);
      return `url('${local || u}')`;
    });
    $(el).html(css);
  });

  // REMOVE the <base> tag — it breaks local file loading
  $("base").remove();
}

// ─── core clone logic (shared by both paths) ─────────────────────────────────

async function processAndSave(html, pageUrl, outputDir) {
  const assetsDir = path.join(outputDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const $ = cheerio.load(html, { decodeEntities: false });
  const assets = collectAndRewrite($, pageUrl, assetsDir, outputDir);

  // Download all discovered assets
  const primaryJobs = [...assets.keys()].map((u) =>
    downloadAsset(u, assetsDir),
  );

  // Also parse CSS files for nested url() / @import
  const cssUrls = [...assets.keys()].filter((u) => /\.css(\?|$)/i.test(u));
  const cssNestedJobs = (
    await Promise.allSettled(
      cssUrls.map(async (cssUrl) => {
        try {
          const resp = await axios.get(cssUrl, {
            timeout: 10_000,
            responseType: "text",
          });
          return extractCssUrls(resp.data, cssUrl).map((n) =>
            downloadAsset(n, assetsDir),
          );
        } catch {
          return [];
        }
      }),
    )
  )
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  const allResults = await Promise.allSettled([
    ...primaryJobs,
    ...cssNestedJobs,
  ]);

  // Build abs URL → relative-to-outputDir map
  const urlToLocal = new Map();
  for (const r of allResults) {
    if (r.status === "fulfilled" && r.value?.assetUrl && r.value?.localPath) {
      const rel = path
        .relative(outputDir, r.value.localPath)
        .replace(/\\/g, "/");
      urlToLocal.set(r.value.assetUrl, rel);
    }
  }

  rewriteHtml($, pageUrl, urlToLocal);

  const finalHtml = $.html();
  const htmlPath = path.join(outputDir, "index.html");
  fs.writeFileSync(htmlPath, finalHtml, "utf-8");

  const downloaded = [...urlToLocal.values()];
  return {
    status: "success",
    outputDir,
    htmlPath,
    totalAssetsDiscovered: assets.size,
    totalAssetsDownloaded: downloaded.length,
    breakdown: {
      images: downloaded.filter((p) =>
        /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(p),
      ).length,
      css: downloaded.filter((p) => /\.css$/i.test(p)).length,
      js: downloaded.filter((p) => /\.js$/i.test(p)).length,
      video: downloaded.filter((p) => /\.(mp4|webm|mov|ogg)$/i.test(p)).length,
      fonts: downloaded.filter((p) => /\.(woff2?|ttf|otf|eot)$/i.test(p))
        .length,
    },
    message: `Site cloned to ${outputDir}. Open index.html in a browser.`,
  };
}

// ─── Path A: Static fetch (fast, works for server-rendered pages) ─────────────

async function cloneStatic(url, outputDir) {
  const resp = await axios.get(url, {
    timeout: 20_000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,*/*",
    },
    maxRedirects: 5,
  });
  return processAndSave(resp.data, url, outputDir);
}

// ─── Path B: Puppeteer fetch (for JS-heavy / SPA / Next.js sites) ────────────

async function clonePuppeteer(url, outputDir) {
  const assetsDir = path.join(outputDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Intercept every network request to capture asset URLs
  const interceptedAssets = new Set();
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const u = req.url();
    const type = req.resourceType();
    if (
      ["image", "stylesheet", "script", "font", "media", "other"].includes(type)
    ) {
      interceptedAssets.add(u);
    }
    req.continue();
  });

  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });

  // Scroll to trigger lazy-loaded images
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 300;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 80);
    });
  });

  // Wait a bit for any lazy assets triggered by scroll
  await new Promise((r) => setTimeout(r, 1500));

  // Get the fully rendered HTML
  const html = await page.content();
  await browser.close();

  // Add intercepted assets that Cheerio might miss (injected by JS)
  const $ = cheerio.load(html, { decodeEntities: false });
  for (const assetUrl of interceptedAssets) {
    if (!assetUrl.startsWith("data:") && !assetUrl.startsWith("blob:")) {
      // inject as a hidden tag so processAndSave picks them up
      const ext = guessExtFromUrl(assetUrl).toLowerCase();
      if ([".css", ".woff", ".woff2", ".ttf", ".otf"].includes(ext)) {
        $("head").append(`<link rel="stylesheet" href="${assetUrl}">`);
      } else if ([".js"].includes(ext)) {
        $("body").append(`<script src="${assetUrl}"></script>`);
      }
    }
  }

  return processAndSave($.html(), url, outputDir);
}

// ─── Auto-detect which path to use ───────────────────────────────────────────

const JS_HEAVY_PATTERNS = [
  /_next\//, // Next.js
  /\/__nuxt\//, // Nuxt
  /\/static\/js\//, // CRA
  /chunk\./, // Webpack chunks
];

async function detectNeedsJs(url) {
  try {
    const resp = await axios.get(url, {
      timeout: 10_000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = resp.data;
    // If body is nearly empty or dominated by JS bundle scripts → needs Puppeteer
    const $ = cheerio.load(html);
    const bodyText = $("body").text().trim();
    const hasJsBundles = JS_HEAVY_PATTERNS.some((p) => p.test(html));
    const bodyIsEmpty = bodyText.length < 200;

    return hasJsBundles || bodyIsEmpty;
  } catch {
    return false;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function cloneWebsite(url, outputDir = "./cloned-output") {
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n🔍 Detecting site type for ${url}...`);
  const needsJs = await detectNeedsJs(url);

  let result;
  if (needsJs) {
    console.log("⚙️  JS-heavy site detected → using Puppeteer (full render)");
    result = await clonePuppeteer(url, outputDir);
  } else {
    console.log("⚡ Static site detected → using fast static fetch");
    result = await cloneStatic(url, outputDir);
  }

  return JSON.stringify(result);
}
