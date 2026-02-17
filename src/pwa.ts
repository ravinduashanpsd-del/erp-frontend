import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("✅ PWA is ready to work offline");
  },
  onNeedRefresh() {
    console.log("⬆️ New version available. Refresh to update.");
  },
});
