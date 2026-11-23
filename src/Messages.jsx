import React, { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, Shield } from "lucide-react";
import { api } from "./api";
import { useLanguage } from "./i18n";
import { ErrorBox, Modal } from "./components";
import SafetyNotice from "./SafetyNotice";

export function MessageRequest({ postId, onClose, onSent }) {
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <Modal title={t("Send a message request")} onClose={onClose}>
      <p className="muted">
        {t(
          "The recipient must accept before you can continue chatting. Your email is never shared.",
        )}
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await api("dm/conversations", "POST", {
              body,
              ...(postId ? { post_id: postId } : { contact_code: code.trim() }),
            });
            if (mounted.current) onSent(result.conversation.token);
          } catch (e) {
            if (mounted.current) setError(e.message);
          } finally {
            if (mounted.current) setBusy(false);
          }
        }}
      >
        {!postId && (
          <label>
            {t("Recipient DM code")}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              minLength={16}
              maxLength={16}
              required
              autoComplete="off"
              disabled={busy}
            />
          </label>
        )}
        <label>
          {t("First message")}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={2000}
            disabled={busy}
          />
        </label>
        <ErrorBox error={error} />
        <button className="primary" disabled={busy || !body.trim()}>
          <Send size={16} />
          {t("Send request")}
        </button>
      </form>
    </Modal>
  );
}

export default function Messages({ token, go, onNew }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [inboxMore, setInboxMore] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [older, setOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const current = useRef(token);
  const alive = useRef(true);
  const bottom = useRef(null);
  const inboxPages = useRef(1);
  current.current = token;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function refreshInbox() {
    const result = await fetchInbox();
    if (alive.current) {
      setInbox(result.conversations);
      setInboxMore(result.has_more);
    }
  }
  async function fetchInbox() {
    const pages = await Promise.all(
      Array.from({ length: inboxPages.current }, (_, index) =>
        api(`dm/conversations?offset=${index * 30}`),
      ),
    );
    return {
      conversations: [
        ...new Map(
          pages.flatMap((page) => page.conversations).map((c) => [c.token, c]),
        ).values(),
      ],
      has_more: pages.at(-1).has_more,
    };
  }
  useEffect(() => {
    let cancelled = false,
      timer;
    async function poll() {
      try {
        const [own, list] = await Promise.all([
          api("dm/profile"),
          fetchInbox(),
        ]);
        if (cancelled) return;
        setProfile(own.profile);
        setInbox(list.conversations);
        setInboxMore(list.has_more);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(poll, 5000);
        }
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    let cancelled = false,
      timer,
      last = 0,
      first = true;
    setConversation(null);
    setMessages([]);
    setDraft("");
    setReport(null);
    setError("");
    setNotice("");
    setOlder(false);
    if (!token) return;
    async function poll() {
      try {
        const result = await api(
          `dm/conversations/${token}/messages${last ? `?after=${last}` : ""}`,
        );
        if (cancelled) return;
        setConversation(result.conversation);
        if (first) {
          setMessages(result.messages);
          setOlder(result.has_more);
          first = false;
        } else
          setMessages((existing) => mergeMessages(existing, result.messages));
        if (result.messages.length) {
          last = result.messages.at(-1).id;
          if (document.visibilityState === "visible")
            await api(`dm/conversations/${token}/read`, "POST", {
              last_id: last,
            });
        } else if (
          last &&
          document.visibilityState === "visible" &&
          result.conversation.unread
        ) {
          await api(`dm/conversations/${token}/read`, "POST", {
            last_id: last,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) timer = setTimeout(poll, 3000);
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: "nearest" });
  }, [messages.at(-1)?.id]);
  async function mutate(action, data = {}) {
    const selected = token;
    setBusy(true);
    setError("");
    try {
      const result = await api(
        `dm/conversations/${selected}/${action}`,
        "POST",
        data,
      );
      if (!alive.current || current.current !== selected) return;
      if (result.conversation) setConversation(result.conversation);
      if (result.message) {
        setMessages((existing) => mergeMessages(existing, [result.message]));
        setDraft("");
      }
      await refreshInbox();
    } catch (e) {
      if (alive.current && current.current === selected) setError(e.message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  const canSend = conversation?.status === "accepted" && !conversation?.blocked;
  return (
    <section className="messages-page">
      <div className="section-heading">
        <h1>{t("Messages")}</h1>
        <button className="primary" onClick={onNew}>
          <MessageCircle size={17} />
          {t("New message")}
        </button>
      </div>
      <p className="dm-privacy">
        <Shield size={17} />
        {t(
          "Messages are private between accounts, but are not end-to-end encrypted. Only a message you report is shared with moderators.",
        )}
      </p>
      {profile && (
        <div className="dm-profile">
          <div>
            <span>{t("Your DM code")}</span>
            <code>{profile.contact_code}</code>
            <small>
              {t("Share this code only with people you want to hear from.")}
            </small>
          </div>
          <label className="toggle-row">
            <span>{t("Allow new message requests")}</span>
            <input
              type="checkbox"
              role="switch"
              checked={profile.requests_enabled}
              disabled={busy}
              onChange={async (event) => {
                const enabled = event.target.checked;
                setBusy(true);
                setError("");
                try {
                  const result = await api("dm/profile", "PUT", {
                    requests_enabled: enabled,
                  });
                  if (alive.current) setProfile(result.profile);
                } catch (e) {
                  if (alive.current) setError(e.message);
                } finally {
                  if (alive.current) setBusy(false);
                }
              }}
            />
            <span className="switch" />
          </label>
        </div>
      )}
      <ErrorBox error={error} />
      {notice && <p role="status">{t(notice)}</p>}
      <div className="dm-layout">
        <aside className="dm-inbox" aria-label={t("Conversations")}>
          {loading ? (
            <p>{t("Loading…")}</p>
          ) : (
            !inbox.length && <p>{t("No conversations yet.")}</p>
          )}
          {inbox.map((item) => (
            <button
              key={item.token}
              className={`dm-thread ${item.token === token ? "active" : ""}`}
              aria-current={item.token === token ? "page" : undefined}
              onClick={() => go(`messages/${item.token}`)}
            >
              <strong>
                {t("Anonymous")} · {item.token.slice(-6)}
              </strong>
              <span>
                {t(statusLabel(item))}
                {item.unread > 0 && ` · ${item.unread} ${t("Unread")}`}
              </span>
              <p>{item.preview}</p>
            </button>
          ))}
          {inboxMore && (
            <button
              className="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api(
                    `dm/conversations?offset=${inboxPages.current * 30}`,
                  );
                  if (alive.current) {
                    inboxPages.current += 1;
                    setInbox((items) => [
                      ...items,
                      ...result.conversations.filter(
                        (c) => !items.some((x) => x.token === c.token),
                      ),
                    ]);
                    setInboxMore(result.has_more);
                  }
                } catch (e) {
                  if (alive.current) setError(e.message);
                } finally {
                  if (alive.current) setBusy(false);
                }
              }}
            >
              {t("Load more conversations")}
            </button>
          )}
        </aside>
        <section className="dm-chat" aria-label={t("Private conversation")}>
          {!token ? (
            <div className="dm-empty">
              <MessageCircle size={34} />
              <p>{t("Choose a conversation or send a message request.")}</p>
            </div>
          ) : !conversation ? (
            <p>{t("Loading…")}</p>
          ) : (
            <>
              <div className="dm-chat-header">
                <div>
                  <h2>
                    {t("Anonymous")} · {token.slice(-6)}
                  </h2>
                  <p>{t(statusLabel(conversation))}</p>
                </div>
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() =>
                    mutate(conversation.blocked_by_me ? "unblock" : "block")
                  }
                >
                  {t(conversation.blocked_by_me ? "Unblock" : "Block author")}
                </button>
              </div>
              {conversation.status === "pending" && !conversation.blocked && (
                <div className="dm-request-banner">
                  <p>
                    {t(
                      conversation.incoming
                        ? "Accept this request only if you want to chat."
                        : "Waiting for the recipient to accept your request.",
                    )}
                  </p>
                  {conversation.incoming && (
                    <div>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => mutate("accept")}
                      >
                        {t("Accept request")}
                      </button>
                      <button
                        className="outline"
                        disabled={busy}
                        onClick={() => mutate("decline")}
                      >
                        {t("Decline request")}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="dm-history" aria-label={t("Message history")}>
                {older && (
                  <button
                    className="outline"
                    disabled={busy}
                    onClick={async () => {
                      const selected = token;
                      setBusy(true);
                      setError("");
                      try {
                        const result = await api(
                          `dm/conversations/${selected}/messages?before=${messages[0].id}`,
                        );
                        if (alive.current && current.current === selected) {
                          setMessages((items) =>
                            mergeMessages(result.messages, items),
                          );
                          setOlder(result.has_more);
                        }
                      } catch (e) {
                        if (alive.current && current.current === selected)
                          setError(e.message);
                      } finally {
                        if (alive.current) setBusy(false);
                      }
                    }}
                  >
                    {t("Load older messages")}
                  </button>
                )}
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`dm-message ${message.is_mine ? "mine" : "theirs"}`}
                  >
                    <span className="sr-only">
                      {t(message.is_mine ? "You" : "Anonymous")}
                    </span>
                    <p dir="auto">{message.body}</p>
                    <SafetyNotice signals={message.safety_signals} />
                    <div className="dm-message-meta">
                      <time
                        dateTime={message.created_at.replace(" ", "T") + "Z"}
                      >
                        {new Date(
                          message.created_at.replace(" ", "T") + "Z",
                        ).toLocaleString()}
                      </time>
                      {!message.is_mine && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setReport(message);
                            setReason("");
                            setError("");
                            setNotice("");
                          }}
                        >
                          {t("Report message")}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                <div ref={bottom} />
              </div>
              {report && (
                <form
                  className="dm-report-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const selected = token;
                    setBusy(true);
                    setError("");
                    try {
                      await api(`dm/messages/${report.id}/report`, "POST", {
                        reason,
                      });
                      if (alive.current && current.current === selected) {
                        setReport(null);
                        setNotice("Your report has been sent.");
                      }
                    } catch (e) {
                      if (alive.current && current.current === selected)
                        setError(e.message);
                    } finally {
                      if (alive.current) setBusy(false);
                    }
                  }}
                >
                  <p>
                    {t(
                      "Only this message and your reason will be shared with moderators.",
                    )}
                  </p>
                  <blockquote>{report.body}</blockquote>
                  <label>
                    {t("Reason")}
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      minLength={3}
                      maxLength={1000}
                      required
                      disabled={busy}
                    />
                  </label>
                  <button
                    className="primary"
                    disabled={busy || reason.trim().length < 3}
                  >
                    {t("Send report")}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setReport(null)}
                  >
                    {t("Cancel")}
                  </button>
                </form>
              )}
              <form
                className="dm-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (canSend && draft.trim() && !busy)
                    mutate("messages", { body: draft });
                }}
              >
                <label className="sr-only" htmlFor="dm-draft">
                  {t("Your message")}
                </label>
                <textarea
                  id="dm-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  required
                  disabled={!canSend || busy}
                  placeholder={t("Your message")}
                />
                <button
                  className="primary"
                  disabled={!canSend || busy || !draft.trim()}
                >
                  <Send size={17} />
                  {t("Send message")}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </section>
  );
}
function mergeMessages(a, b) {
  return [
    ...new Map([...a, ...b].map((message) => [message.id, message])).values(),
  ].sort((x, y) => x.id - y.id);
}
function statusLabel(conversation) {
  if (conversation.blocked) return "Conversation unavailable";
  if (conversation.status === "pending")
    return conversation.incoming ? "Message request" : "Request sent";
  return {
    accepted: "Connected",
    declined: "Request declined",
    closed: "Closed by moderation",
  }[conversation.status];
}

export function DirectMessageReports() {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]),
    [error, setError] = useState(""),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false);
  async function load(offset = 0) {
    const result = await api(`admin/dm-reports?offset=${offset}`);
    setReports((items) =>
      offset ? [...items, ...result.reports] : result.reports,
    );
    setMore(result.has_more);
  }
  useEffect(() => {
    let alive = true;
    api("admin/dm-reports")
      .then((result) => {
        if (alive) {
          setReports(result.reports);
          setMore(result.has_more);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <section className="dm-moderation">
      <h2>{t("Reported direct messages")}</h2>
      <p className="muted">
        {t(
          "Only explicitly reported messages are shown. Other messages remain private.",
        )}
      </p>
      <ErrorBox error={error} />
      {reports.map((report) => (
        <article className="report-card" key={report.id}>
          <span>{t(report.status)}</span>
          <blockquote>{report.body}</blockquote>
          <p>{report.reason}</p>
          {report.status === "open" && (
            <div className="report-buttons">
              {["dismiss", "close"].map((action) => (
                <button
                  className="outline"
                  key={action}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      await api(`admin/dm-reports/${report.id}`, "POST", {
                        action,
                      });
                      await load();
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t(
                    action === "close"
                      ? "Close conversation"
                      : "Dismiss report",
                  )}
                </button>
              ))}
            </div>
          )}
        </article>
      ))}
      {more && (
        <button
          className="outline"
          disabled={busy}
          onClick={() => load(reports.length).catch((e) => setError(e.message))}
        >
          {t("Load more reports")}
        </button>
      )}
    </section>
  );
}
