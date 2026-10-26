export type Theme = "dark" | "light";
export const currentTheme = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#0c0a17" : "#f5f6fc");
  try {
    localStorage.setItem("aurora.theme", theme);
  } catch {
    /* Theme remains usable when browser storage is unavailable. */
  }
  document
    .querySelectorAll<HTMLButtonElement>("[data-theme-choice]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeChoice === theme),
      ),
    );
}
