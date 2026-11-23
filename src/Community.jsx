import { Bell } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useLanguage } from "./i18n";

function Failure({ message }) {
  const { t } = useLanguage();
  return message ? (
    <p className="error" role="alert">
      {t(message)}
    </p>
  ) : null;
}

export function RecoveryForm({ onBack }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return (
    <>
      <p>{t("Use the recovery code you saved from Settings.")}</p>
      {done ? (
        <p role="status">
          {t("Password reset. Sign in with your new password.")}
        </p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            setBusy(true);
            setError("");
            try {
              await api("session");
              await api("account/recover", "POST", data);
              setDone(true);
            } catch (error) {
              setError(error.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("Email address")}
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <label>
            {t("Recovery code")}
            <input
              name="recovery_code"
              autoComplete="off"
              required
              maxLength={100}
              spellCheck={false}
            />
          </label>
          <label>
            {t("New password")}
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
            />
          </label>
          <Failure message={error} />
          <button className="primary full" disabled={busy}>
            {t("Reset password")}
          </button>
        </form>
      )}
      <button className="text-button full auth-switch" onClick={onBack}>
        {t("Back to sign in")}
      </button>
    </>
  );
}

export function AccountControls({ onDeleted }) {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api("account/controls")
      .then((data) => {
        if (active) {
          setSettings(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  async function perform(action) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card account-controls">
      <h2>{t("Account & privacy")}</h2>
      <Failure message={error} />
      {!settings && (
        <button className="outline" onClick={() => setRetry(retry + 1)}>
          {t("Try again")}
        </button>
      )}
      {notice && <p role="status">{t(notice)}</p>}
      {settings && (
        <>
          <h3>{t("Notifications")}</h3>
          {[
            ["notify_replies", "Replies to my posts"],
            ["notify_messages", "Messages and requests"],
            ["notify_stories", "New story episodes"],
          ].map(([key, label]) => (
            <label className="toggle-row" key={key}>
              <span>{t(label)}</span>
              <input
                type="checkbox"
                role="switch"
                disabled={busy}
                checked={settings[key]}
                onChange={() =>
                  perform(async () => {
                    const next = { ...settings, [key]: !settings[key] };
                    await api("account/controls", "PUT", next);
                    setSettings(next);
                    setNotice("Notification preferences saved.");
                  })
                }
              />
              <span className="switch" />
            </label>
          ))}
          <h3>{t("Change password")}</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = Object.fromEntries(new FormData(form));
              perform(async () => {
                await api("account/password", "POST", data);
                form.reset();
                setNotice(
                  "Password changed. Other sessions have been signed out.",
                );
              });
            }}
          >
            <label>
              {t("Current password")}
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <label>
              {t("New password")}
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
              />
            </label>
            <button className="outline" disabled={busy}>
              {t("Change password")}
            </button>
          </form>
          <h3>{t("Account recovery")}</h3>
          <p className="muted">
            {t(
              "Save this code somewhere safe. It works once and replaces your previous code.",
            )}
          </p>
          <p>
            {t(
              settings.recovery_ready
                ? "A recovery code is set up."
                : "No recovery code yet.",
            )}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = Object.fromEntries(new FormData(form));
              perform(async () => {
                const result = await api("account/recovery-code", "POST", data);
                setCode(result.recovery_code);
                setSettings({ ...settings, recovery_ready: true });
                form.reset();
              });
            }}
          >
            <label>
              {t("Current password")}
              <input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </label>
            <button className="outline" disabled={busy}>
              {t("Generate recovery code")}
            </button>
          </form>
          {code && (
            <div className="recovery-code" role="status">
              <strong>
                {t("Save your recovery code now. It is only shown here.")}
              </strong>
              <code>{code}</code>
              <button className="text-button" onClick={() => setCode("")}>
                {t("I saved my code")}
              </button>
            </div>
          )}
        </>
      )}
      <h3>{t("Download my writing")}</h3>
      <p className="muted">
        {t("Download your posts, private journal and drafts as JSON.")}
      </p>
      <button
        className="outline"
        disabled={busy}
        onClick={() =>
          perform(async () => {
            const data = await api("account/export");
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              }),
            );
            const link = document.createElement("a");
            link.href = url;
            link.download = "unsaid-writing.json";
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          })
        }
      >
        {t("Download my writing")}
      </button>
      <h3>{t("Delete account")}</h3>
      <p className="muted">
        {t(
          "This permanently deletes your account, posts, journal, replies and conversations.",
        )}
      </p>
      {!deleting ? (
        <button className="outline danger" onClick={() => setDeleting(true)}>
          {t("Delete account")}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            perform(async () => {
              await api("account", "DELETE", data);
              await onDeleted();
            });
          }}
        >
          <label>
            {t("Current password")}
            <input
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          <label>
            {t("Type DELETE to confirm.")}
            <input
              name="confirmation"
              required
              pattern="DELETE"
              autoComplete="off"
            />
          </label>
          <div className="community-actions">
            <button
              className="outline"
              type="button"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              {t("Cancel")}
            </button>
            <button className="primary danger" disabled={busy}>
              {t("Permanently delete account")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function StoryFollow({ post, signedIn, onSignIn }) {
  const { t } = useLanguage();
  const [following, setFollowing] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const eligible =
    !post.is_owner &&
    post.visibility === "public" &&
    post.status === "published" &&
    !post.hidden;
  useEffect(() => {
    let active = true;
    setReady(false);
    setFollowing(false);
    setError("");
    if (signedIn && eligible)
      api(`posts/${post.id}/follow`)
        .then((data) => {
          if (active) {
            setFollowing(data.following);
            setReady(true);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [post.id, signedIn, eligible, retry]);
  if (!eligible) return null;
  return (
    <div className="story-follow">
      <button
        className="outline"
        aria-pressed={following}
        disabled={busy || (signedIn && !ready)}
        onClick={async () => {
          if (!signedIn) return onSignIn();
          setBusy(true);
          setError("");
          try {
            const result = await api(
              `posts/${post.id}/follow`,
              following ? "DELETE" : "POST",
            );
            setFollowing(result.following);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {t(following ? "Unfollow story" : "Follow story")}
      </button>
      <Failure message={error} />
      {error && (
        <button className="text-button" onClick={() => setRetry(retry + 1)}>
          {t("Try again")}
        </button>
      )}
    </div>
  );
}

export function NotificationLink({ page, user }) {
  const { t } = useLanguage();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    setCount(0);
    if (!user) return;
    const load = () =>
      api("notifications")
        .then((data) => {
          if (active) setCount(data.unread);
        })
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener("unsaid-notifications-read", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("unsaid-notifications-read", load);
    };
  }, [user, page]);
  return (
    <a
      className={page === "notifications" ? "active" : ""}
      href="#notifications"
      aria-current={page === "notifications" ? "page" : undefined}
      title={t("Notifications")}
    >
      <Bell size={23} aria-hidden="true" /><span className="notification-label">{t("Notifications")}</span>
      {count > 0 && <span className="notification-count">{count}</span>}
    </a>
  );
}

export function Notifications({ user, onSignIn, go }) {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    const load = async () => {
      const version = ++request.current;
      try {
        const result = await api("notifications");
        if (active && version === request.current) {
          setItems(result.notifications);
          setError("");
        }
      } catch (e) {
        if (active && version === request.current) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
      request.current++;
    };
  }, [user, retry]);
  const labels = {
    reply: "Someone replied to your thought.",
    story: "A story you follow has a new episode.",
    request: "You have a message request.",
    message: "You have a new message.",
  };
  return (
    <section className="settings-page notifications-page">
      <h1>{t("Notifications")}</h1>
      {!user ? (
        <button className="primary" onClick={onSignIn}>
          {t("Sign in")}
        </button>
      ) : (
        <>
          <Failure message={error} />
          {error && (
            <button className="outline" onClick={() => setRetry(retry + 1)}>
              {t("Try again")}
            </button>
          )}
          <div className="community-actions">
            <button
              className="outline"
              disabled={busy || !items.some((item) => item.unread)}
              onClick={async () => {
                setBusy(true);
                request.current++;
                try {
                  await api("notifications", "POST");
                  window.dispatchEvent(new Event("unsaid-notifications-read"));
                  setRetry((value) => value + 1);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Mark all as read")}
            </button>
            <a href="#settings">{t("Notification settings")}</a>
          </div>
          {loading ? (
            <p role="status">{t("Loading…")}</p>
          ) : !error && !items.length ? (
            <p>{t("No notifications yet.")}</p>
          ) : null}
          <ul className="notification-list">
            {items.map((item) => (
              <li key={item.key} className={item.unread ? "unread" : ""}>
                <button onClick={() => go(item.target)}>
                  <span>
                    {item.unread && (
                      <span
                        className="notification-dot"
                        aria-label={t("Unread")}
                      />
                    )}
                    {t(labels[item.kind])}
                  </span>
                  <time dateTime={item.created_at.replace(" ", "T") + "Z"}>
                    {new Date(
                      item.created_at.replace(" ", "T") + "Z",
                    ).toLocaleString()}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
