export const THEME_STORAGE_KEY = "app_theme";

export const getStoredTheme = () => {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === "dark" ? "dark" : "light";
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  const next = theme === "dark" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  localStorage.setItem(THEME_STORAGE_KEY, next);
  return next;
};

