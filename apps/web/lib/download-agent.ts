const GITHUB_REPO = "uk-2149/GNet";

type Platform = "windows" | "macos" | "linux" | "unknown";

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
      return "macOS (.dmg)";
    case "linux":
      return "Linux (.AppImage)";
    default:
      return "your platform";
  }
}

/**
 * Fetches the latest GitHub release and returns the download URL
 * for the detected platform.
 */
export async function getDownloadUrl(
  platform?: Platform
): Promise<string | null> {
  const os = platform ?? detectPlatform();

  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 300 }, // cache for 5 minutes
      }
    );

    if (!res.ok) {
      // Fallback to the releases page
      return `https://github.com/${GITHUB_REPO}/releases/latest`;
    }

    const data = await res.json();
    const assets: { name: string; browser_download_url: string }[] =
      data.assets ?? [];

    const match = assets.find((a) => {
      const name = a.name.toLowerCase();
      switch (os) {
        case "windows":
          return name.endsWith(".exe");
        case "macos":
          return name.endsWith(".dmg");
        case "linux":
          return name.endsWith(".appimage");
        default:
          return false;
      }
    });

    return (
      match?.browser_download_url ??
      `https://github.com/${GITHUB_REPO}/releases/latest`
    );
  } catch {
    return `https://github.com/${GITHUB_REPO}/releases/latest`;
  }
}

/**
 * Triggers the download for the user's detected OS.
 * Falls back to the GitHub releases page if detection fails.
 */
export async function downloadAgent(): Promise<void> {
  const url = await getDownloadUrl();
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
