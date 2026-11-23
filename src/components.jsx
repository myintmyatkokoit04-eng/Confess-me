import SafetyNotice from "./SafetyNotice";
import { RecoveryForm } from "./Community";
import EmailVerification from "./EmailVerification";
import useWritingDraft from "./useWritingDraft";
import { useLanguage } from "./i18n";
import TranslatedText from "./TranslatedText";
import { moods } from "./journal";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Leaf,
  Plus,
  UserRound,
  ChevronDown,
  Heart,
  UsersRound,
  MessageCircle,
  MoreHorizontal,
  BookOpen,
  Bookmark,
  X,
  ArrowRight,
  Check,
  Shield,
  LogOut,
  Settings,
  PenLine,
  Trash2,
  Flag,
  UserRoundMinus,
  LoaderCircle,
  Lock,
  Send,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";

import { api, authenticate, categories } from "./api";
export function Botanical({ small = false }) {
  return (
    <svg
      className={small ? "botanical small" : "botanical"}
      viewBox="0 0 520 330"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="265" cy="148" r="124" fill="#f7eade" opacity=".72" />
      <g
        stroke="#697960"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M461 303C365 281 302 230 236 144M381 270C403 216 429 155 453 65M317 225C260 212 199 197 143 141M260 174C251 126 261 81 267 44M363 260C330 268 261 267 211 253M428 132C407 111 391 76 390 40M183 183C147 186 87 203 52 242" />
        {[
          [453, 65, 25, -22],
          [429, 132, 35, 26],
          [405, 190, 27, -35],
          [381, 249, 40, 12],
          [390, 40, 20, -15],
          [267, 44, 17, -20],
          [259, 113, 24, 28],
          [236, 144, 26, -27],
          [193, 170, 33, 12],
          [143, 141, 25, -25],
          [104, 209, 26, -25],
          [52, 242, 23, 19],
          [211, 253, 29, 14],
          [281, 262, 22, -28],
          [334, 237, 17, -31],
        ].map(([x, y, w, a], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
            <path d={`M0 0C${-w} -12 ${-w} -44 0 -66C${w} -44 ${w} -12 0 0Z`} />
            <path d="M0 0V-63" />
            {[12, 22, 32, 42, 52].map((v, j) => (
              <path
                key={j}
                d={`M0 -${v}l${Math.min(w - 5, 13)} -12M0 -${v}l-${Math.min(w - 5, 13)} -12`}
                opacity=".45"
              />
            ))}
          </g>
        ))}
        <path d="M315 227C330 184 334 160 328 141M328 179l20 -22M328 166l-18 -20" />
        <ellipse cx="328" cy="136" rx="4" ry="7" />
        <ellipse
          cx="350"
          cy="152"
          rx="4"
          ry="7"
          transform="rotate(35 350 152)"
        />
        <ellipse
          cx="308"
          cy="141"
          rx="4"
          ry="7"
          transform="rotate(-25 308 141)"
        />
      </g>
    </svg>
  );
}
export function Avatar() {
  return (
    <span className="avatar">
      <UserRound size={22} />
    </span>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const { t, language } = useLanguage();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement;
    const handler = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = [
          ...document.querySelectorAll(
            ".modal button:not(:disabled), .modal input, .modal select, .modal textarea, .modal a",
          ),
        ];
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    document.querySelector(".modal button")?.focus();
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      before?.focus();
    };
  }, []);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label={t("Close dialog")}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function ErrorBox({ error }) {
  const { t, language } = useLanguage();
  return error ? (
    <div role="alert" className="error">
      {t(error)}
    </div>
  ) : null;
}
export function timeAgo(value, language = "en") {
  const date = new Date(value.replace(" ", "T") + "Z");
  const h = Math.max(0, Math.floor((Date.now() - date) / 3600000));
  return h === 0
    ? "Just now"
    : h === 1
      ? "1 hour ago"
      : h < 24
        ? `${h} hours ago`
        : h < 48
          ? "Yesterday"
          : date.toLocaleDateString(language, {
              month: "short",
              day: "numeric",
            });
}
export function Card({
  post,
  onDetail,
  onAction,
  onEdit,
  onContinue,
  onDelete,
  onReport,
  onBlock,
  onMessage,
  onMeToo,
  requireUser,
  busy,
  full = false,
}) {
  const { t, language } = useLanguage();
  const [menu, setMenu] = useState(false);
  return (
    <article className={`thought-card thought-category-${post.category_id}${full ? " thought-card-full" : ""}`}>
      <div className="card-top">
        <Avatar />
        <div className="author">
          <strong>{t("Anonymous")}</strong>
          <span className="post-timestamp">{t(timeAgo(post.created_at, language))}</span>
        </div>
        <span className={`badge cat-${post.category_id}`}>
          {t(post.category)}
        </span>
        <div className="menu-wrap">
          <button
            className="icon-button more"
            aria-label={t("Thought options")}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>
          {menu && (
            <>
              <button
                className="menu-dismiss"
                aria-label={t("Close options")}
                onClick={() => setMenu(false)}
              />
              <div className="dropdown card-menu">
                {post.visibility === "public" &&
                  post.status === "published" && (
                    <button
                      onClick={() => {
                        setMenu(false);
                        onAction(post, "bookmark");
                      }}
                    >
                      <Bookmark size={16} />
                      {post.saved ? t("Unsave thought") : t("Save thought")}
                    </button>
                  )}
                {post.is_owner ? (
                  <>
                    <button
                      onClick={() => {
                        setMenu(false);
                        onEdit(post);
                      }}
                    >
                      <PenLine size={16} />
                      {t("Edit thought")}
                    </button>
                    <button
                      onClick={() => {
                        setMenu(false);
                        onDelete(post);
                      }}
                    >
                      <Trash2 size={16} />
                      {t("Delete thought")}
                    </button>
                  </>
                ) : (
                  <>
                    {post.visibility === "public" &&
                      post.status === "published" &&
                      !post.hidden && (
                        <button
                          onClick={() => {
                            setMenu(false);
                            onMessage?.(post);
                          }}
                        >
                          <Send size={16} />
                          {t("Send a message request")}
                        </button>
                      )}
                    <button
                      onClick={() => {
                        setMenu(false);
                        onReport("posts", post.id);
                      }}
                    >
                      <Flag size={16} />
                      {t("Report thought")}
                    </button>
                    <button
                      onClick={() => {
                        setMenu(false);
                        onBlock("posts", post.id);
                      }}
                    >
                      <UserRoundMinus size={16} />
                      {t("Block this author")}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {post.title && <h3 className="story-title">{post.title}</h3>}
      {post.writing_kind === "story" && (
        <div className="episode-label">
          {t("My story")} · {t("Part")} {post.episode_no}
        </div>
      )}
      <TranslatedText
        body={post.body}
        id={post.id}
        onOpen={full ? undefined : () => onDetail(post.id)}
        requireUser={requireUser}
        enabled={
          post.visibility === "public" &&
          post.status === "published" &&
          !post.hidden
        }
      />
      {post.visibility === "public" && post.status === "published" && (
        <SafetyNotice signals={post.safety_signals} />
      )}
      <div className="response">
        {post.visibility === "private" || post.status === "draft" ? (
          <Lock size={14} aria-hidden="true" />
        ) : (
          <MessageCircle size={14} aria-hidden="true" />
        )}
        <span>{post.visibility === "private"
          ? t("Private journal")
          : post.status === "draft"
            ? t("Draft")
            : post.support_preference === "connect"
              ? t("I'd like to talk to someone who understands")
              : t(post.response)}</span>
        {post.hidden && (
          <span className="hidden-label">{t("Hidden by moderation")}</span>
        )}
      </div>
      {post.is_owner && post.mood && (
        <span className="mood-badge">
          {moods.find((item) => item.value === post.mood)?.icon}{" "}
          {t(moods.find((item) => item.value === post.mood)?.label || post.mood)}
          <span className="sr-only"> · {t("Only you can see this mood.")}</span>
        </span>
      )}
      {((!post.is_owner &&
          post.support_preference === "connect" &&
          post.visibility === "public" &&
          post.status === "published" &&
          !post.hidden &&
          onMessage) ||
          (post.is_owner && post.writing_kind === "story" && onContinue)) && (
        <div className="card-context-actions">
          {!post.is_owner && post.support_preference === "connect" && (
            <button className="text-button" onClick={() => onMessage(post)}>
              <Send size={16} aria-hidden="true" />
              {t("Offer to listen")}
            </button>
          )}
          {post.is_owner && post.writing_kind === "story" && onContinue && (
            <button className="text-button" onClick={() => onContinue(post)}>
              <Plus size={16} aria-hidden="true" />
              {t("Add next episode")}
            </button>
          )}
        </div>
      )}
      <div className="card-actions">
        {post.visibility === "public" &&
        post.status === "published" &&
        !post.hidden ? (
          <>
            <button
              disabled={busy}
              aria-pressed={post.reactions.includes("understand")}
              className={
                `card-reaction ${post.reactions.includes("understand") ? "selected" : ""}`
              }
              onClick={() => onAction(post, "reactions", "understand")}
            >
              <Heart size={21} aria-hidden="true" />
              <span>{t("I understand")}</span>
            </button>
            <button
              disabled={busy}
              aria-pressed={post.reactions.includes("me_too")}
              className={`card-reaction ${post.reactions.includes("me_too") ? "selected" : ""}`}
              onClick={() =>
                onMeToo ? onMeToo(post) : onAction(post, "reactions", "me_too")
              }
            >
              <UsersRound size={21} aria-hidden="true" />
              <span>{t("Me too")}</span>
            </button>
            <button onClick={() => onDetail(post.id)}>
              <MessageCircle size={21} aria-hidden="true" />
              <span>{post.response === "Advice welcome" ? t("Reply") : t("Read")}</span>
            </button>
            <button
              className={`card-save ${post.saved ? "selected" : ""}`}
              disabled={busy}
              aria-label={t(post.saved ? "Remove from saved" : "Save for later")}
              title={t(post.saved ? "Remove from saved" : "Save for later")}
              aria-pressed={!!post.saved}
              onClick={() => onAction(post, "bookmark")}
            >
              <Bookmark size={21} aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            <span className="private-note">
              <Lock size={15} />
              {post.hidden
                ? t("Hidden by moderation")
                : t("Only you can read this")}
            </span>
            {post.hidden && post.is_owner && (
              <button disabled={busy} onClick={() => onAction(post, "appeal")}>
                {t("Request review")}
              </button>
            )}
            <button onClick={() => onEdit(post)}>
              <PenLine size={17} />
              {t("Edit")}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
export function Auth({ onClose, onSuccess }) {
  const { t, language } = useLanguage();
  const [recovering, setRecovering] = useState(false);
  const [pending, setPending] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (register && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await authenticate(register ? "register" : "login", {
        email,
        password,
        language,
      });
      if (result.verification_required) {
        setPending(result);
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmation(false);
        return;
      }
      await onSuccess();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (pending)
    return (
      <Modal title={t("Confirm your email")} onClose={onClose}>
        <EmailVerification
          pending={pending}
          onVerified={async () => {
            await onSuccess();
            onClose();
          }}
          onChangeEmail={() => {
            setPending(null);
            setError("");
          }}
        />
      </Modal>
    );
  if (recovering)
    return (
      <Modal title={t("Reset password")} onClose={onClose}>
        <RecoveryForm
          onBack={() => {
            setRecovering(false);
            setError("");
          }}
        />
      </Modal>
    );
  return (
    <Modal
      title={register ? t("A space of your own") : t("Welcome back")}
      onClose={onClose}
    >
      <p className="muted">
        {t(
          "Your account stays private. Your public thoughts are always anonymous.",
        )}
      </p>
      <form onSubmit={submit}>
        <label>
          {t("Email address")}
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label htmlFor="auth-password">{t("Password")}</label>
        <div className="auth-password-field">
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            required
            minLength={10}
            maxLength={128}
            autoComplete={register ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="auth-password-toggle"
            aria-label={t(showPassword ? "Hide password" : "Show password")}
            aria-pressed={showPassword} aria-controls="auth-password"
            onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        </div>
        <p className="help">{t("Use at least 10 characters.")}</p>
        {register && (
          <>
            <label htmlFor="auth-confirm-password">{t("Confirm password")}</label>
            <div className="auth-password-field">
              <input id="auth-confirm-password"
                type={showConfirmation ? "text" : "password"}
                required minLength={10} maxLength={128} autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }} />
              <button type="button" className="auth-password-toggle"
                aria-label={t(showConfirmation ? "Hide confirmation password" : "Show confirmation password")}
                aria-pressed={showConfirmation} aria-controls="auth-confirm-password"
                onClick={() => setShowConfirmation(!showConfirmation)}>
                {showConfirmation ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
              </button>
            </div>
          </>
        )}
        <ErrorBox error={error} />
        <button className="primary full" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : null}
          {register ? t("Create account") : t("Sign in")}
        </button>
      </form>
      {!register && (
        <button
          className="text-button full auth-switch"
          disabled={busy}
          onClick={() => setRecovering(true)}
        >
          {t("Forgot password?")}
        </button>
      )}
      <button
        className="text-button full auth-switch"
        disabled={busy}
        onClick={() => {
          setRegister(!register);
          setConfirmPassword("");
          setShowPassword(false);
          setShowConfirmation(false);
          setError("");
        }}
      >
        {register
          ? t("Already have an account? Sign in")
          : t("New to Unsaid? Create an account")}
      </button>
    </Modal>
  );
}
export function StoryEpisodes({ post, onOpen }) {
  const { t } = useLanguage();
  const [episodes, setEpisodes] = useState([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setEpisodes([]);
    setError("");
    api(`posts/${post.id}/episodes`)
      .then((result) => {
        if (active) setEpisodes(result.episodes);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [post.id, retry]);
  return (
    <nav className="story-episodes" aria-label={t("Story episodes")}>
      <h3>{t("Story episodes")}</h3>
      {error && (
        <>
          <ErrorBox error={error} />
          <button className="text-button" onClick={() => setRetry(retry + 1)}>
            {t("Try again")}
          </button>
        </>
      )}
      {episodes.map((episode) => (
        <button
          key={episode.id}
          className="outline"
          aria-current={episode.id === post.id ? "page" : undefined}
          onClick={() => onOpen(episode.id)}
        >
          {t("Part")} {episode.episode_no}
          {episode.title ? ` · ${episode.title}` : ""}
          {episode.status === "draft" ? ` · ${t("Draft")}` : ""}
          {episode.visibility === "private" ? ` · ${t("Private journal")}` : ""}
        </button>
      ))}
    </nav>
  );
}
export function Composer({
  initial,
  previous,
  privateEntry,
  onClose,
  onSaved,
}) {
  const { t, language } = useLanguage();
  const [body, setBody] = useState(initial?.body || ""),
    [title, setTitle] = useState(initial?.title || ""),
    [showTitle, setShowTitle] = useState(Boolean(initial?.title)),
    [showPrompts, setShowPrompts] = useState(!initial && !previous),
    [activePrompt, setActivePrompt] = useState(""),
    [category, setCategory] = useState(
      initial?.category_id || previous?.category_id || 1,
    ),
    [visibility, setVisibility] = useState(
      initial?.visibility || (privateEntry ? "private" : "public"),
    ),
    [response, setResponse] = useState(initial?.response || "Just listening"),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [mood, setMood] = useState(initial?.mood || "");
  const [writingKind, setWritingKind] = useState(
    previous ? "story" : initial?.writing_kind || "short",
  );
  const [support, setSupport] = useState(
    initial?.support_preference ||
      { "Advice welcome": "advice", "Comments off": "off" }[
        initial?.response
      ] ||
      "listen",
  );
  const draftKey = initial
    ? `edit-${initial.id}`
    : previous
      ? `episode-${previous.id}`
      : privateEntry
        ? "new-private"
        : "new-public";
  const payload = {
    body,
    mood,
    title,
    category_id: Number(category),
    visibility,
    response,
    writing_kind: writingKind,
    support_preference: support,
    ...(previous ? { next_part_of: previous.id } : {}),
  };
  const draft = useWritingDraft(draftKey, payload, (saved) => {
    setBody(saved.body || "");
    setMood(saved.mood || "");
    setTitle(saved.title || "");
    setShowTitle(Boolean(saved.title));
    setCategory(saved.category_id || 1);
    setVisibility(saved.visibility || "public");
    setResponse(saved.response || "Just listening");
    setWritingKind(saved.writing_kind || "short");
    setSupport(saved.support_preference || "listen");
  });
  async function closeWriting() {
    setBusy(true);
    try {
      await draft.flush();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  async function save(status) {
    setBusy(true);
    setError("");
    try {
      if (!draft.ready)
        throw new Error(
          "Autosave is unavailable. Reopen this editor before publishing.",
        );
      if (draft.recovered)
        throw new Error("Restore or discard your saved writing first.");
      await draft.beforePublish();
      const result = await api(
        initial ? "posts/" + initial.id : "posts",
        initial ? "PATCH" : "POST",
        {
          body,
          title,
          category_id: Number(category),
          visibility,
          response,
          status,
          writing_kind: writingKind,
          support_preference: support,
          mood,
          draft_key: draftKey,
          ...(previous ? { next_part_of: previous.id } : {}),
        },
      );
      onSaved(
        result.post?.hidden && status === "published" && visibility === "public"
          ? "Your thought is saved and waiting for moderation review."
          : status === "draft"
            ? "Your draft is safely saved."
            : visibility === "private"
              ? "Saved to your private journal."
              : "Your thought has been shared.",
      );
      onClose();
    } catch (e) {
      draft.resume();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? t("Revisit your thought") : t("What’s on your mind?")}
      onClose={() => {
        if (!busy) void closeWriting();
      }}
      wide
    >
      <p className="muted">
        {t("There’s no perfect way to say it. Start wherever you are.")}
      </p>
      {previous && (
        <p className="episode-label">
          {t("Continuing your story")}: {previous.title || t("Untitled story")}
        </p>
      )}
      <p className="muted" role="status">
        {t(draft.status)}
      </p>
      {draft.recovered && (
        <div className="draft-recovery">
          <p>
            {t(
              "You have unfinished writing. Restore it or discard the saved copy to continue.",
            )}
          </p>
          <button className="outline" onClick={() => draft.restore()}>
            {t("Restore writing")}
          </button>
          <button
            className="text-button"
            onClick={() => draft.discard().catch((e) => setError(e.message))}
          >
            {t("Discard saved copy")}
          </button>
        </div>
      )}
      {preview ? (
        <div className="preview">
          <span className={`badge cat-${category}`}>
            {t(categories[category - 1])}
          </span>
          {title.trim() && <h3 className="story-title">{title.trim()}</h3>}
          {mood && <p className="mood-badge">{t("Mood")}: {t(moods.find((item) => item.value === mood)?.label)} · {t("Only you can see this mood.")}</p>}
          <p style={{ whiteSpace: "pre-wrap" }}>{body}</p>
          <span className="response">
            {visibility === "private"
              ? t("Private · only you")
              : `${t("Anonymous")} · ${t(support === "connect" ? "I'd like to talk to someone who understands" : response)}`}
          </span>
        </div>
      ) : (
        <fieldset
          className="writing-fields"
          disabled={busy || Boolean(draft.recovered) || !draft.ready}
        >
          <label>
            {t("How are you feeling?")}
            <select value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="">{t("Choose a mood (optional)")}</option>
              {moods.map((item) => <option key={item.value} value={item.value}>{item.icon} {t(item.label)}</option>)}
            </select>
          </label>
          <p className="help">{t("Only you can see this mood.")}</p>
          <label>
            {t("What would you like to write?")}
            <select
              value={writingKind}
              disabled={Boolean(
                previous ||
                (initial?.writing_kind === "story" && initial?.series_id),
              )}
              onChange={(e) => setWritingKind(e.target.value)}
            >
              <option value="short">{t("A short confession")}</option>
              <option value="story">{t("My story")}</option>
            </select>
          </label>
          {(writingKind === "story" ||
            showTitle ||
            [...body].length >= 280) && (
            <label className="story-title-field">
              {t("Title (optional)")}
              <input
                value={title}
                maxLength={120}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}
          <label className="sr-only" htmlFor="thought">
            {t("Your thought")}
          </label>
          <textarea
            id="thought"
            className="compose-text"
            placeholder={t("The things I never said…")}
            value={body}
            aria-describedby="writing-count writing-prompt"
            onChange={(e) => {
              if ([...e.target.value].length <= 20000) setBody(e.target.value);
              else
                setError(
                  t("Please keep each episode within 20,000 characters."),
                );
            }}
          />
          <div className="character-count" id="writing-count">
            {[...body].length.toLocaleString()} / 20,000 {t("characters")}
          </div>
          <p className="muted">
            {t("A few words or a whole story. Both belong here.")}
          </p>
          <div className="writing-tools">
            {!showTitle && [...body].length < 280 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setShowTitle(true)}
              >
                {t("Add a title")}
              </button>
            )}
            <button
              type="button"
              className="text-button"
              aria-expanded={showPrompts}
              onClick={() => setShowPrompts(!showPrompts)}
            >
              {t("Need a place to start?")}
            </button>
          </div>
          <div id="writing-prompt" className="writing-prompt">
            {showPrompts && (
              <div className="writing-prompts">
                {[
                  "What do you miss most?",
                  "What happened that day?",
                  "What did you never get to say?",
                  "Who do you wish you could say this to?",
                  "If they were here now, what would you tell them?",
                  "What felt a little easier today?",
                  "What would you say to yourself with kindness?",
                ].map((prompt) => (
                  <button
                    type="button"
                    className="outline"
                    key={prompt}
                    aria-pressed={activePrompt === t(prompt)}
                    onClick={() => setActivePrompt(t(prompt))}
                  >
                    {t(prompt)}
                  </button>
                ))}
              </div>
            )}
            {activePrompt && (
              <p className="muted">
                {activePrompt}{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setActivePrompt("")}
                >
                  {t("Clear prompt")}
                </button>
              </p>
            )}
          </div>
          <div className="form-row">
            <label>
              {t("Category")}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c, i) => (
                  <option key={c} value={i + 1}>
                    {t(c)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Where it belongs")}
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
              >
                <option value="public">{t("Public · anonymous")}</option>
                <option value="private">
                  {t("Private journal · only you")}
                </option>
              </select>
            </label>
          </div>
          {visibility === "public" && (
            <label>
              {t("What would feel helpful?")}
              <select
                value={support}
                onChange={(e) => {
                  setSupport(e.target.value);
                  setResponse(
                    {
                      listen: "Just listening",
                      advice: "Advice welcome",
                      connect: "Just listening",
                      off: "Comments off",
                    }[e.target.value],
                  );
                }}
              >
                <option value="listen">{t("Just listening")}</option>
                <option value="advice">{t("Advice welcome")}</option>
                <option value="connect">
                  {t("I'd like to talk to someone who understands")}
                </option>
                <option value="off">{t("Comments off")}</option>
              </select>
            </label>
          )}
        </fieldset>
      )}
      <ErrorBox error={error} />
      <div className="compose-actions">
        <button
          className="text-button"
          disabled={
            busy || !draft.ready || Boolean(draft.recovered) || !body.trim()
          }
          onClick={() => save("draft")}
        >
          {t("Save draft")}
        </button>
        <button
          className="outline"
          disabled={
            busy || !draft.ready || Boolean(draft.recovered) || !body.trim()
          }
          onClick={() => setPreview(!preview)}
        >
          <Eye size={16} />
          {preview ? t("Back to writing") : t("Preview")}
        </button>
        <button
          className="primary"
          disabled={
            busy ||
            !draft.ready ||
            Boolean(draft.recovered) ||
            !body.trim() ||
            !preview
          }
          onClick={() => save("published")}
        >
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Send size={16} />
          )}{" "}
          {visibility === "private"
            ? t("Save privately")
            : initial
              ? t("Save changes")
              : t("Share thought")}
        </button>
      </div>
      <p className="help">
        {t(
          "Preview your thought before publishing. You can edit or delete it anytime.",
        )}
      </p>
    </Modal>
  );
}
