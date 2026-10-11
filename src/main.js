import { auth, signInAnonymously, loadData, registerRealtimeListeners } from "./modules/data.js";
import { initUI } from "./modules/ui.js";

// Bootstrap the app once the DOM is ready.
document.addEventListener("DOMContentLoaded", () => {
  signInAnonymously(auth)
    .then(() => {
      initUI();
      loadData();
      registerRealtimeListeners();
    })
    .catch((error) => {
      console.error("Firebase auth failed:", error);
    });
});
