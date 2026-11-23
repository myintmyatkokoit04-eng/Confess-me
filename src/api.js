import { translateUI } from "./translations.js";

export const categories = [
  "Family",
  "Relationships",
  "Friendship",
  "Career",
  "Moving forward",
];
let csrf = "";
// Authentication can start after an expired session or an earlier database outage.
// Refresh the session before submitting credentials; keep CSRF checks on the server.
export async function authenticate(mode, credentials) {
  const first = await api("session");
  const current = await api("session");
  if (first.csrf !== current.csrf) {
    throw new Error(
      "Your browser is not keeping this site's session cookie. Allow cookies for this site and try again.",
    );
  }
  return api(mode, "POST", credentials, current.csrf);
}
export async function signOut() {
  return api("logout", "POST", {});
}
export async function api(path, method = "GET", body, token = csrf) {
  const res = await fetch("/api/" + path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
      ...(path === "logout" && method === "POST" ? { "X-Unsaid-Logout": "1" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("The server could not be reached. Check your PHP server.");
  }
  if (data.csrf) csrf = data.csrf;
  if (!res.ok) {
    if (data.code === "review_wording" && body?.acknowledge_abuse !== true) {
      const language = document.documentElement.lang || "en";
      const t = (value) => translateUI(value, language);
      const message = [
        t("This wording may hurt someone. Please review it before sharing."),
        ...(data.matches || []).map((value) => `“${value}”`),
        t("Choose Cancel to edit your text, or OK to continue."),
      ].join("\n\n");
      if (window.confirm(message))
        return api(path, method, { ...body, acknowledge_abuse: true }, token);
      throw new Error(
        t("Your text is still here. You can edit it before sharing."),
      );
    }
    throw new Error(data.error || "Please try again.");
  }
  return data;
}
