import { createNavigation } from "./allgemein_navigation.js";

if (location.hostname.includes("aniworld.to")) {
  createNavigation({
    focusSelectors: [
      "a[href]",
      "span[data-action]",
      ".menuSearchButton",
      ".liveNewsFeedButton",
      ".primary-navigation li > strong",
      "[tabindex]",
      "button",
      "input",
      "select",
      "textarea",
    ],
    sections: [
      { name: "header", selector: "header.main-header" },
      { name: "body", selector: null },
      { name: "footer", selector: "#footer" },
    ],
    hoverToggles: [
      { toggle: ".primary-navigation li > strong", container: "li" },
      { toggle: ".dd > p > a", container: ".dd" },
    ],
    extraStyles: `
      .coverListItem:has(.tv-focus-ring) .seriesListHorizontalEffect {
        opacity: 1 !important;
      }
      .avatar:has(.tv-focus-ring) {
        overflow: visible !important;
        z-index: 10000 !important;
        position: relative !important;
      }
    `,
  });
}
