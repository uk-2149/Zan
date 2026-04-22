import { Tray, Menu, app, BrowserWindow, nativeImage } from "electron";
import * as path from "path";
import { store } from "./store";
import { HeartbeatService } from "./heartbeat";
import { disconnectWebSocket } from "./ws-client";

let tray: Tray | null = null;

export function setupTray(win: BrowserWindow, heartbeat: HeartbeatService) {
  // Use fallback if icon not found
  let icon;
  try {
    icon = nativeImage.createFromPath(
      path.join(__dirname, "../../resources/icon.png"),
    );
    if (icon.isEmpty()) icon = nativeImage.createEmpty();
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip("Zan Provider Agent");

  const buildMenu = () => {
    const providerId = store.get("providerId");
    return Menu.buildFromTemplate([
      {
        label: providerId ? "● Running" : "○ Not registered",
        enabled: false,
      },
      { type: "separator" },
      {
        label: "Open Dashboard",
        click: () => {
          win.show();
          win.focus();
        },
      },
      { type: "separator" },
      {
        label: "Quit Zan Agent",
        click: () => {
          heartbeat.stop();
          disconnectWebSocket();
          tray?.destroy();
          app.exit(0);
        },
      },
    ]);
  };

  tray.setContextMenu(buildMenu());

  tray.on("click", () => {
    win.show();
    win.focus();
  });
  tray.on("double-click", () => {
    win.show();
    win.focus();
  });

  // Return updater so main can refresh menu after registration
  return {
    update: () => tray?.setContextMenu(buildMenu()),
  };
}
