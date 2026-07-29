import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const projectRoot = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(projectRoot, "dist");
const recorderPackage = resolve(
  projectRoot,
  "node_modules/@picovoice/pvrecorder-node"
);
const packagedRecorder = resolve(
  outputDirectory,
  "node_modules/@picovoice/pvrecorder-node"
);

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

await Promise.all([
  esbuild.build({
    bundle: true,
    entryPoints: [resolve(projectRoot, "src/extension.ts")],
    external: ["vscode", "@picovoice/pvrecorder-node"],
    format: "cjs",
    logLevel: "info",
    minify: false,
    outfile: resolve(outputDirectory, "extension.js"),
    platform: "node",
    sourcemap: true,
    target: "node20"
  }),
  esbuild.build({
    bundle: true,
    entryPoints: [resolve(projectRoot, "webview/main.ts")],
    format: "iife",
    logLevel: "info",
    minify: true,
    outfile: resolve(outputDirectory, "webview.js"),
    platform: "browser",
    sourcemap: true,
    target: "chrome120"
  }),
  copyFile(
    resolve(projectRoot, "media/styles.css"),
    resolve(outputDirectory, "styles.css")
  ),
  copyFile(
    resolve(projectRoot, "media/icon.svg"),
    resolve(outputDirectory, "icon.svg")
  ),
  cp(recorderPackage, packagedRecorder, {
    recursive: true
  })
]);
