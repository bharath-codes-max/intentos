/**
 * Resolves a stable, portable project/repository identity from a working directory,
 * so the same repo cloned to different paths by different employees maps to the same
 * identity in Intentos. Pure inspection — never mutates the repo, never runs a network call
 * (no fetch/pull), only reads already-configured local git metadata.
 *
 * Precedence: git remote "origin" > git repo root (no remote) > raw cwd (not a git repo at all).
 * Every field is best-effort: a step that fails (not a git repo, no origin configured, git not
 * on PATH) leaves the corresponding field undefined rather than throwing, since project identity
 * must never be the reason a governance check fails closed.
 */

import { execFileSync } from "node:child_process";

function run(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Normalizes any of the common git remote URL shapes to "host/owner/repo":
 *   https://github.com/acme/payment-platform.git  -> github.com/acme/payment-platform
 *   git@github.com:acme/payment-platform.git      -> github.com/acme/payment-platform
 *   ssh://git@github.com/acme/payment-platform     -> github.com/acme/payment-platform
 * This is the piece that makes two employees' different local clone paths resolve to the
 * same project identity, as long as both point at the same remote.
 */
export function normalizeRemoteUrl(remoteUrl) {
  if (!remoteUrl) return undefined;
  let s = remoteUrl.trim();
  s = s.replace(/\.git$/, "");
  const scpMatch = s.match(/^(?:[\w.-]+@)?([\w.-]+):(.+)$/);
  if (scpMatch && !s.startsWith("http") && !s.startsWith("ssh://")) {
    return `${scpMatch[1]}/${scpMatch[2].replace(/^\/+/, "")}`;
  }
  try {
    const url = new URL(s);
    return `${url.hostname}${url.pathname}`.replace(/^\/+/, "");
  } catch {
    return s;
  }
}

export function resolveProjectIdentity(cwd) {
  if (!cwd) return {};
  const repoRoot = run(["rev-parse", "--show-toplevel"], cwd);
  if (!repoRoot) {
    // Not inside a git repo at all — Phase 6's documented fallback. The cwd itself is the
    // only identity available; the caller (Intentos) is responsible for treating this as a
    // distinct, lower-confidence identity rather than inventing a fake repo name for it.
    return { cwd };
  }
  const remoteUrl = run(["remote", "get-url", "origin"], repoRoot);
  const branch = run(["rev-parse", "--abbrev-ref", "HEAD"], repoRoot);
  const normalizedRepo = normalizeRemoteUrl(remoteUrl);

  return {
    cwd,
    repo_root: repoRoot,
    ...(remoteUrl ? { remote_url: remoteUrl } : {}),
    ...(normalizedRepo ? { normalized_repo: normalizedRepo } : {}),
    ...(branch ? { branch } : {}),
  };
}
