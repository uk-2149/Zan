const GITHUB_REPO = "uk-2149/GNet";

type Platform = "windows" | "macos" | "linux" | "unknown";

type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator as any).userAgentData?.platform?.toLowerCase() ?? "";

  if (platform === "windows" || ua.includes("win")) return "windows";
  if (platform === "macos" || ua.includes("mac")) return "macos";
  if (platform === "linux" || ua.includes("linux")) return "linux";

  return "unknown";
}

export function getPlatformLabel(platform: Platform): string {
  switch (platform) {
    case "windows":
      return "Windows (.exe)";
    case "macos":
      return "macOS (.dmg or .zip)";
    case "linux":
      return "Linux (.AppImage)";
    default:
      return "your platform";
  }
}

function getPlatformExtensions(platform: Platform): string[] {
  switch (platform) {
    case "windows":
      return [".exe", ".msi"];
    case "macos":
      return [".dmg", ".zip", ".pkg"];
    case "linux":
      return [".appimage", ".deb", ".tar.gz"];
    default:
      return [];
  }
}

function findAssetDownloadUrl(
  assets: GitHubAsset[],
  platform: Platform,
): string | null {
  const extensions = getPlatformExtensions(platform);
  const normalized = assets.map((asset) => ({
    ...asset,
    name: asset.name.toLowerCase(),
  }));

  for (const ext of extensions) {
    const match = normalized.find((asset) => asset.name.endsWith(ext));
    if (match) return match.browser_download_url;
  }

  return null;
}

/**
 * Fetches the latest GitHub release and returns the download URL
 * for the detected platform.
 */
export async function getDownloadUrl(
  platform?: Platform,
): Promise<string | null> {
  const os = platform ?? detectPlatform();

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 300 }, // cache for 5 minutes
      },
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const assets: GitHubAsset[] = data.assets ?? [];
    return findAssetDownloadUrl(assets, os);
  } catch {
    return null;
  }
}

/**
 * Triggers the download for the user's detected OS.
 * Falls back to the GitHub releases page if detection fails.
 */
export async function downloadAgent(): Promise<boolean> {
  const url = await getDownloadUrl();
  if (url) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  }

  window.open(
    `https://github.com/${GITHUB_REPO}/releases/latest`,
    "_blank",
    "noopener,noreferrer",
  );
  return false;
}
