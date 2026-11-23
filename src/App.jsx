import NavigationIcon from "./NavigationIcon";
import Messages, { MessageRequest, DirectMessageReports } from "./Messages";
import {
  AccountControls,
  Notifications,
  NotificationLink,
  StoryFollow,
} from "./Community";
import SafetyNotice from "./SafetyNotice";
import { useLanguage, LanguageSelect } from "./i18n";
import TranslatedText from "./TranslatedText";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Leaf,
  Compass,
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
  ArrowLeft,
} from "lucide-react";

import { api, categories, signOut } from "./api";
import { moods, journalMarkdown, readJournal } from "./journal";
import {
  Botanical,
  Avatar,
  Modal,
  ErrorBox,
  timeAgo,
  Card,
  Auth,
  Composer,
  StoryEpisodes,
} from "./components";
export default function App() {
  const { t, language, setLanguage } = useLanguage();
  const requestVersion = useRef(0);
  const noticeTimer = useRef(null);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const [journalSearchText, setJournalSearchText] = useState("");
  const [journalSearch, setJournalSearch] = useState("");
  const [journalDate, setJournalDate] = useState("");
  const [journalMood, setJournalMood] = useState("");
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setJournalSearch(journalSearchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [journalSearchText]);
  function clearJournalFilters() {
    setJournalSearchText(""); setJournalSearch("");
    setJournalDate(""); setJournalMood(""); setCategory("");
  }
  async function downloadJournal() {
    setExporting(true);
    try {
      const entries = await readJournal(api);
      if (!entries.length) { announce("Your journal is empty."); return; }
      const url = URL.createObjectURL(new Blob([journalMarkdown(entries, t)], { type: "text/markdown;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `unsaid-journal-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      announce("Your journal download is ready.");
    } catch (error) { announce(error.message); }
    finally { setExporting(false); }
  }
  const [user, setUser] = useState(null),
    [sessionReady, setSessionReady] = useState(false),
    [page, setPage] = useState(location.hash.slice(1) || "explore"),
    [posts, setPosts] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("newest"),
    [hasMore, setHasMore] = useState(false),
    [preferences, setPreferences] = useState([1, 2, 3, 4, 5]),
    [account, setAccount] = useState(false),
    [modal, setModal] = useState(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [blocks, setBlocks] = useState([]),
    [reports, setReports] = useState([]);
  const [detail, setDetail] = useState(null),
    [comments, setComments] = useState([]),
    [reply, setReply] = useState(""),
    [detailError, setDetailError] = useState(""),
    [reason, setReason] = useState(""),
    [modalError, setModalError] = useState("");
  const announce = (msg, duration = 4500) => {
    clearTimeout(noticeTimer.current);
    setNotice(msg);
    noticeTimer.current = setTimeout(() => setNotice(""), duration);
  };
  const refreshSession = async () => {
    requestVersion.current++;
    setPosts([]);
    setDetail(null);
    setComments([]);
    const data = await api("session");
    setUser(data.user);
    if (data.user?.language) setLanguage(data.user.language);
    if (data.user) {
      const prefs = await api("preferences");
      setPreferences(prefs.categories);
    } else setPreferences([1, 2, 3, 4, 5]);
    setSessionReady(true);
    return data.user;
  };
  useEffect(() => {
    refreshSession().catch((e) => {
      setError(e.message);
      setLoading(false);
    });
  }, []);
  useEffect(() => {
    const handler = () => {
      setPage(location.hash.slice(1) || "explore");
      setAccount(false);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      setCategory("");
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const go = (p) => {
    setAccount(false);
    location.hash = p;
    if (page === p) setCategory("");
  };
  const requireUser = (action) => {
    if (!user) {
      setModal({ type: "auth" });
      return false;
    }
    action?.();
    return true;
  };
  const feedScope = ["explore", "journal", "mine", "saved"].includes(page)
    ? page
    : "explore";
  const load = useCallback(
    async (offset = 0) => {
      if (!sessionReady) return;
      const version = ++requestVersion.current;
      setLoading(true);
      setError("");
      try {
        if (page.startsWith("post/")) {
          const data = await api("posts/" + page.split("/")[1]);
          if (version !== requestVersion.current) return;
          setDetail(data.post);
          setReply("");
          setDetailError("");
          if (
            data.post.visibility === "public" &&
            data.post.status === "published" &&
            !data.post.hidden
          ) {
            const c = await api("posts/" + data.post.id + "/comments");
            if (version !== requestVersion.current) return;
            setComments(c.comments);
          } else setComments([]);
        } else if (
          page === "notifications" ||
          page === "messages" ||
          page.startsWith("messages/")
        ) {
          return;
        } else if (page === "settings") {
          if (user) {
            const b = await api("blocks");
            if (version !== requestVersion.current) return;
            setBlocks(b.blocks);
          }
        } else if (page === "admin") {
          const r = await api("admin/reports");
          if (version !== requestVersion.current) return;
          setReports(r.reports);
        } else if (page !== "explore" && !user) {
          setPosts([]);
          setHasMore(false);
        } else {
          const data = await api(
            `posts?scope=${feedScope}&sort=${sort}&category=${category}&offset=${offset}${page === "journal" ? `&q=${encodeURIComponent(journalSearch)}&date=${journalDate}&mood=${journalMood}` : ""}`,
          );
          if (version !== requestVersion.current) return;
          setPosts((p) => (offset ? [...p, ...data.posts] : data.posts));
          setHasMore(data.has_more);
        }
      } catch (e) {
        if (version === requestVersion.current) setError(e.message);
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    },
    [page, sort, category, user, sessionReady, journalSearch, journalDate, journalMood],
  );
  useEffect(() => {
    setPosts([]);
    setDetail(null);
    setComments([]);
    setHasMore(false);
    load();
    return () => {
      requestVersion.current++;
    };
  }, [load]);
  async function action(post, type, kind) {
    if (!requireUser()) return;
    setBusy(true);
    try {
      const data = await api(
        `posts/${post.id}/${type}`,
        "POST",
        kind ? { kind } : {},
      );
      if (type === "appeal") {
        announce("Your review request has been sent.");
        return;
      }
      setPosts((p) => p.map((x) => (x.id === post.id ? data.post : x)));
      if (detail?.id === post.id) setDetail(data.post);
      if (type === "bookmark")
        announce(
          data.post.saved
            ? "Saved for another quiet moment."
            : "Removed from your saved thoughts.",
        );
      if (page === "saved" && type === "bookmark") load();
      return true;
    } catch (e) {
      announce(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function savePreferences(ids) {
    if (!requireUser()) return;
    setBusy(true);
    try {
      await api("preferences", "PUT", { categories: ids });
      setPreferences(ids);
      announce("Your reading preferences are saved.");
      if (page === "explore") load();
    } catch (e) {
      announce(e.message);
    } finally {
      setBusy(false);
    }
  }
  const openReport = (kind, id) => {
    if (requireUser()) {
      setReason("");
      setModalError("");
      setModal({ type: "report", kind, id });
    }
  };
  const openBlock = (kind, id) => {
    if (requireUser()) {
      setModalError("");
      setModal({ type: "block", kind, id });
    }
  };
  const openDelete = (post) => {
    setModalError("");
    setModal({ type: "delete", post });
  };
  const openWrite = (privateEntry = false, initial = null, previous = null) =>
    requireUser(() =>
      setModal({ type: "compose", privateEntry, initial, previous }),
    );
  async function confirmModeration() {
    setBusy(true);
    setModalError("");
    try {
      if (modal.type === "delete") {
        await api("posts/" + modal.post.id, "DELETE");
        if (page.startsWith("post/")) go("explore");
        announce("Your thought has been deleted.");
      } else {
        await api(
          `${modal.kind}/${modal.id}/${modal.type}`,
          "POST",
          modal.type === "report" ? { reason } : {},
        );
        announce(
          modal.type === "report"
            ? "Thank you. Your report has been sent for review."
            : "This author is blocked. Their thoughts and replies are hidden.",
        );
        if (modal.type === "block" && page.startsWith("post/")) go("explore");
      }
      setModal(null);
      load();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submitReply(e) {
    e.preventDefault();
    if (!requireUser()) return;
    setBusy(true);
    setDetailError("");
    try {
      const result = await api("posts/" + detail.id + "/comments", "POST", {
        body: reply,
      });
      if (result.held_for_review)
        announce("Your reply is saved and waiting for moderation review.");
      setReply("");
      const c = await api("posts/" + detail.id + "/comments");
      setComments(c.comments);
    } catch (e) {
      setDetailError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteComment(id) {
    setBusy(true);
    try {
      await api("comments/" + id, "DELETE");
      setComments((c) => c.filter((x) => x.id !== id));
      announce("Your reply has been deleted.");
    } catch (e) {
      setDetailError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function changeLanguage(value) {
    setLanguage(value);
    if (user) {
      try {
        await api("language", "PUT", { language: value });
      } catch (e) {
        announce(e.message);
      }
    }
  }
  const openDM = async (postId) => {
    if (!requireUser()) return;
    if (!postId) {
      setModal({ type: "dm" });
      return;
    }
    const version = requestVersion.current;
    setBusy(true);
    try {
      const data = await api(`posts/${postId}/dm-conversation`);
      if (version !== requestVersion.current) return;
      if (data.conversation) go(`messages/${data.conversation.token}`);
      else setModal({ type: "dm", postId });
    } catch (e) {
      announce(e.message);
    } finally {
      setBusy(false);
    }
  };
  const cardProps = {
    onMessage: (post) => openDM(post.id),
    onMeToo: async (post) => {
      const version = requestVersion.current;
      const success = await action(post, "reactions", "me_too");
      if (success && !post.is_owner && version === requestVersion.current)
        await openDM(post.id);
    },
    requireUser,
    onDetail: (id) => go("post/" + id),
    onAction: action,
    onEdit: (p) => openWrite(false, p),
    onContinue: (p) => openWrite(p.visibility === "private", null, p),
    onDelete: openDelete,
    onReport: openReport,
    onBlock: openBlock,
    busy,
  };
  const info = {
    about: [
      t("A little room for the unsaid"),
      t(
        "Unsaid is a gentle space for regrets, unspoken feelings, and personal reflections. Share anonymously, listen with care, or keep your words in a journal that belongs only to you. There are no rankings or streaks here. Take your time.",
      ),
    ],
    guidelines: [
      t("Community Guidelines"),
      t(
        "Treat every thought with care. Respect the author’s response preference. Listen without judgment; offer advice only when it is welcome. Do not share identifying information about yourself or others. Harassment, threats, spam, and hateful content are not welcome. Use the report menu when something needs attention, and block authors you would prefer not to read.",
      ),
    ],
    privacy: [
      t("Your privacy matters"),
      t(
        "Public posts and replies are displayed anonymously. Your account email is never shown to readers. Private entries and drafts can only be read through your signed-in account and are excluded from the moderation dashboard. This installation stores accounts and content in its MySQL database and uses a session cookie for authentication. Private journals are access-controlled, but are not end-to-end encrypted. You can delete your posts and replies at any time.",
      ),
    ],
    contact: [
      t("Get in touch"),
      t(
        "For a concern about a public thought or reply, use its report menu. Reports go directly to this site’s administrators. For account or privacy questions, contact the operator of this installation. Their contact address should be published here before a public launch.",
      ),
    ],
  };
  return (
    <>
      <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>{t("Skip to content")}</a>
      <header className="site-header">
        <div className="nav-shell">
          <a href="#explore" className="logo">
            <Leaf strokeWidth={1.3} size={31} />
            <span>Unsaid</span>
          </a>
          <p className="brand-caption">{t("A little room for the unsaid")}</p>
          <nav aria-label={t("Main navigation")}>
            <a className={page === "explore" ? "active" : ""} aria-current={page === "explore" ? "page" : undefined} href="#explore" title={t("Home")} onClick={(event) => { event.preventDefault(); go("explore"); window.scrollTo({ top: 0, left: 0, behavior: "instant" }); announce("Home", 1800); }}> 
              <span className="nav-glyph"><NavigationIcon kind="home" /></span><span className="nav-label">{t("Explore")}</span>
            </a>
            <a className={page === "journal" ? "active" : ""} aria-current={page === "journal" ? "page" : undefined} href="#journal" title={t("My Journal")}>
              <span className="nav-glyph"><NavigationIcon kind="journal" /></span><span className="nav-label">{t("My Journal")}</span>
            </a>
            <a className={page === "messages" || page.startsWith("messages/") ? "active" : ""} aria-current={page === "messages" || page.startsWith("messages/") ? "page" : undefined} href="#messages" title={t("Messages")}>
              <span className="nav-glyph"><NavigationIcon kind="messages" /></span><span className="nav-label">{t("Messages")}</span>
            </a>
            <a className={page === "saved" ? "active" : ""} aria-current={page === "saved" ? "page" : undefined} href="#saved" title={t("Saved")}>
              <span className="nav-glyph"><NavigationIcon kind="saved" /></span><span className="nav-label">{t("Saved")}</span>
            </a>
            <button className="primary write-button" onClick={() => openWrite()} aria-label={t("Write a thought")} title={t("Write a thought")}>
              <NavigationIcon kind="write" /><span className="nav-label">{t("Write a thought")}</span>
            </button>
          </nav>
          <div className="nav-bottom-note"><Leaf size={18} aria-hidden="true" /><p>{t("Take your time. You can come back whenever you like.")}</p></div>
          <div className="nav-right">
            <NotificationLink page={page} user={user} />
            <LanguageSelect onChange={changeLanguage} />
            <div className="menu-wrap">
              <button
                className="account-button"
                aria-label={t("Account menu")}
                aria-expanded={account}
                onClick={() => setAccount(!account)}
              >
                <Avatar />
                <span className="account-label">{t(user ? "Your account" : "Sign in / Register")}</span>
                <ChevronDown size={15} aria-hidden="true" />
              </button>
              {account && (
                <>
                  <button
                    className="menu-dismiss"
                    aria-label={t("Close account menu")}
                    onClick={() => setAccount(false)}
                  />
                  <div className="dropdown account-menu">
                    {user ? (
                      <>
                        <p className="account-email">{user.email}</p>
                        <button onClick={() => go("mine")}>
                          <PenLine size={16} />
                          {t("My Posts")}
                        </button>
                        <button onClick={() => go("settings")}>
                          <Settings size={16} />
                          {t("Settings")}
                        </button>
                        {user.is_admin && (
                          <button onClick={() => go("admin")}>
                            <Shield size={16} />
                            {t("Moderation")}
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              await signOut();
                              await refreshSession();
                              go("explore");
                              setAccount(false);
                              announce("You have signed out.");
                            } catch (e) {
                              announce(e.message);
                            }
                          }}
                        >
                          <LogOut size={16} />
                          {t("Sign out")}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setAccount(false);
                          setModal({ type: "auth" });
                        }}
                      >
                        <UserRound size={16} />
                        {t("Sign in / Register")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}
        className={`main-shell ${["explore", "journal", "mine", "saved"].includes(page) ? "feed-shell" : ""}`}
      >
        {page === "notifications" && (
          <Notifications
            key={user?.email || "guest"}
            user={user}
            onSignIn={() => setModal({ type: "auth" })}
            go={go}
          />
        )}
        {page === "explore" && (
          <>
            <div className="page-topbar">
              <div><p className="eyebrow">{t("A little room for the unsaid")}</p><h1>{t("Explore")}</h1></div>
              <span className="privacy-note"><Shield size={16} aria-hidden="true" />{t("Share anonymously")}</span>
            </div>
            <section className="hero">
              <div className="hero-copy">
                <span className="hero-kicker"><Leaf size={13} aria-hidden="true" />{t("A space to be yourself")}</span>
                <h2>{t("Some things are")} {t("easier to write.")}</h2>
                <p>{t("A gentle place for the things you never said.")}</p>
                <div className="hero-buttons">
                  <button className="primary" onClick={() => openWrite()}><PenLine size={17} aria-hidden="true" />{t("Share a thought")}</button>
                  <button className="outline" onClick={() => openWrite(true)}><Lock size={16} aria-hidden="true" />{t("Keep it private")}</button>
                </div>
              </div>
              <div className="hero-symbol" aria-hidden="true"><MessageCircle size={64} strokeWidth={1.2} /><span><Heart size={23} /></span></div>
            </section>

          </>
        )}
        {["explore", "journal", "mine", "saved"].includes(page) && (
          <div className="content-layout">
            <section className="feed">
              <div className="section-heading">
                <h2>
                  {
                    {
                      explore: t("A little understanding goes a long way"),
                      journal: t("Your own quiet corner"),
                      mine: t("The thoughts you’ve shared"),
                      saved: t("Words to come back to"),
                    }[page]
                  }
                </h2>
                <label className="sort">
                  <span className="sr-only">{t("Sort thoughts")}</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="newest">{t("Latest")}</option>
                    <option value="oldest">{t("Oldest")}</option>
                  </select>
                </label>
              </div>
              {page === "explore" && (
            <div className="category-filters" aria-label={t("Filter thoughts")}>
              <button
                className={!category ? "filter all active" : "filter all"}
                onClick={() => setCategory("")}
                aria-pressed={!category}
              >
                {t("All thoughts")}
              </button>
              {categories.map((c, i) => (
                <button
                  key={t(c)}
                  className={`filter cat-${i + 1} ${Number(category) === i + 1 ? "active" : ""}`}
                  aria-pressed={Number(category) === i + 1}
                  onClick={() => setCategory(i + 1)}
                >
                  {t(c)}
                </button>
              ))}
            </div>
              )}
              {page !== "explore" && (
                <p className="page-intro">
                  {
                    {
                      journal: t(
                        "Your private reflections and unfinished thoughts. Only you can read them.",
                      ),
                      mine: t(
                        "Every public thought, shared anonymously. Revisit them whenever you need.",
                      ),
                      saved: t(
                        "A small collection of thoughts that made you feel understood.",
                      ),
                    }[page]
                  }
                </p>
              )}
              <ErrorBox error={error} />
              {page === "journal" && user && (
                <section className="journal-tools" aria-label={t("Find a journal entry")}>
                  <label className="journal-search">
                    {t("Search your journal")}
                    <input type="search" maxLength={200}
                      placeholder={t("Search titles and words…")}
                      value={journalSearchText} onChange={(e) => setJournalSearchText(e.target.value)} />
                  </label>
                  <div className="journal-filter-row">
                    <label>{t("Date (UTC)")}<input type="date" value={journalDate} onChange={(e) => setJournalDate(e.target.value)} /></label>
                    <label>{t("Mood")}<select value={journalMood} onChange={(e) => setJournalMood(e.target.value)}>
                      <option value="">{t("All moods")}</option>
                      {moods.map((item) => <option value={item.value} key={item.value}>{item.icon} {t(item.label)}</option>)}
                    </select></label>
                    <label>{t("Category")}<select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">{t("All categories")}</option>
                      {categories.map((item, index) => <option value={index + 1} key={item}>{t(item)}</option>)}
                    </select></label>
                  </div>
                  <div className="journal-tool-actions">
                    {(journalSearchText || journalDate || journalMood || category) && <button type="button" className="text-button" onClick={clearJournalFilters}>{t("Clear filters")}</button>}
                    <button type="button" className="outline" disabled={exporting} onClick={downloadJournal}>
                      {exporting && <LoaderCircle size={16} className="spin" />}
                      {t(exporting ? "Preparing download…" : "Download entire journal")}
                    </button>
                  </div>
                  <p className="help">{t("Downloads include private entries and drafts. Keep the file somewhere private.")}</p>
                </section>
              )}
              {(!sessionReady && !error) || (loading && !posts.length) ? (
                <div className="loading">
                  <LoaderCircle className="spin" />
                  {t("Making a little room…")}
                </div>
              ) : page !== "explore" && !user ? (
                <div className="empty">
                  <BookOpen size={32} />
                  <h3>{t("A space that belongs to you")}</h3>
                  <p>
                    {t("Sign in to open your")}{" "}
                    {page === "saved"
                      ? t("saved thoughts")
                      : page === "journal"
                        ? t("private journal")
                        : t("own thoughts")}
                    .
                  </p>
                  <button
                    className="primary"
                    onClick={() => setModal({ type: "auth" })}
                  >
                    {t("Sign in")}
                  </button>
                </div>
              ) : !posts.length && !error ? (
                <div className="empty">
                  <Leaf size={34} strokeWidth={1} />
                  <h3>
                    {page === "journal" && (journalSearch || journalDate || journalMood || category)
                      ? t("No entries match these filters")
                      : page === "explore"
                      ? t("A quiet moment")
                      : page === "journal"
                        ? t("Start with a few words")
                        : t("Nothing here just yet")}
                  </h3>
                  <p>
                    {page === "journal" && (journalSearch || journalDate || journalMood || category)
                      ? t("Try another word, date or mood, or clear the filters.")
                      : page === "explore"
                      ? t("No thoughts match your reading preferences yet.")
                      : page === "saved"
                        ? t(
                            "Save a thought from its options menu to find it here.",
                          )
                        : t(
                            "There’s no perfect beginning. Write what feels right.",
                          )}
                  </p>
                  <button
                    className="primary"
                    onClick={() =>
                      page === "saved"
                        ? go("explore")
                        : openWrite(page === "journal")
                    }
                  >
                    {page === "saved"
                      ? t("Explore thoughts")
                      : t("Write a thought")}
                  </button>
                </div>
              ) : (
                <div className="feed-grid">
                  {posts.map((p) => (
                    <Card key={p.id} post={p} {...cardProps} />
                  ))}
                </div>
              )}
              {error && (
                <button
                  className="outline retry"
                  onClick={() =>
                    sessionReady
                      ? load()
                      : refreshSession().catch((e) => setError(e.message))
                  }
                >
                  {t("Try again")}
                </button>
              )}
              {hasMore && (
                <button
                  className="outline load-more"
                  disabled={loading}
                  onClick={() => load(posts.length)}
                >
                  {loading ? "Loading…" : t("Load more thoughts")}
                  <ArrowRight size={17} />
                </button>
              )}
            </section>
            <aside className="sidebar" aria-label={t("Your space")}>
              <section className="journal-panel">
                <div className="journal-art">
                  <BookOpen size={24} strokeWidth={1.7} aria-hidden="true" />
                </div>
                <h2>{t("Your own quiet corner")}</h2>
                <p>{t("Not everything needs to be shared.")}</p>
                <button className="primary full" onClick={() => go("journal")}>
                  {t("Open my journal")}
                </button>
              </section>
              <section className="preferences-panel">
                <div className="panel-eyebrow"><Compass size={17} aria-hidden="true" />{t("Your feed, your choice")}</div>
                <h2>{t("Choose what you read")}</h2>
                <p>{t("Make this space feel like yours.")}</p>
                <div className="toggles">
                  {categories.map((c, i) => (
                    <label key={c} className="toggle-row">
                      <span>{t(c)}</span>
                      <input
                        type="checkbox"
                        role="switch"
                        aria-label={`${t("Read")} ? ${t(c)}`}
                        checked={preferences.includes(i + 1)}
                        disabled={busy}
                        onChange={() =>
                          savePreferences(
                            preferences.includes(i + 1)
                              ? preferences.filter((x) => x !== i + 1)
                              : [...preferences, i + 1],
                          )
                        }
                      />
                      <span className="switch" />
                    </label>
                  ))}
                </div>
                <button className="outline full" onClick={() => go("settings")}>
                  {t("Manage preferences")}
                </button>
              </section>
            </aside>
          </div>
        )}
        {(page === "messages" || page.startsWith("messages/")) &&
          (user ? (
            <Messages
              key={user.email}
              token={page.split("/")[1] || ""}
              go={go}
              onNew={() => openDM()}
            />
          ) : (
            <section className="empty">
              <h2>{t("Messages")}</h2>
              <p>{t("Sign in to send and receive private messages.")}</p>
              <button className="primary" onClick={() => requireUser()}>
                {t("Sign in")}
              </button>
            </section>
          ))}
        {page.startsWith("post/") && (
          <section className="detail-page">
            <button className="text-button back" onClick={() => go("explore")}>
              <ArrowLeft size={18} />
              {t("Back to thoughts")}
            </button>
            <ErrorBox error={error} />
            {loading ? (
              <div className="loading">
                <LoaderCircle className="spin" />
                {t("Opening this thought…")}
              </div>
            ) : (
              detail &&
              !error && (
                <>
                  <Card post={detail} {...cardProps} full />
                  {detail.writing_kind === "story" && (
                    <StoryFollow
                      key={`${detail.id}-${user?.email || "guest"}`}
                      post={detail}
                      signedIn={!!user}
                      onSignIn={() => setModal({ type: "auth" })}
                    />
                  )}
                  {detail.writing_kind === "story" && (
                    <StoryEpisodes
                      post={detail}
                      onOpen={(id) => go("post/" + id)}
                    />
                  )}
                  {detail.visibility === "public" &&
                    detail.status === "published" &&
                    !detail.hidden && (
                      <section className="replies">
                        <h2>{t("A little conversation")}</h2>
                        <p className="muted">
                          {detail.response === "Just listening"
                            ? t(
                                "This author just wants to be heard. Replies are closed; you can show understanding with a reaction.",
                              )
                            : detail.response === "Comments off"
                              ? t(
                                  "The author has chosen to keep replies closed.",
                                )
                              : t(
                                  "Kind words and thoughtful advice are welcome.",
                                )}
                        </p>
                        {comments.length ? (
                          comments.map((c) => (
                            <div key={c.id} className="comment">
                              <div className="comment-top">
                                <Avatar />
                                <strong>{t("Anonymous")}</strong>
                                <span>
                                  {t(timeAgo(c.created_at, language))}
                                </span>
                              </div>
                              <TranslatedText
                                body={c.body}
                                id={c.id}
                                kind="comments"
                                requireUser={requireUser}
                                enabled={!c.hidden}
                              />
                              <SafetyNotice signals={c.safety_signals} />
                              {c.hidden && (
                                <p className="hidden-label">
                                  {t("Hidden by moderation")}
                                </p>
                              )}
                              <div className="comment-actions">
                                {c.hidden && c.is_owner && (
                                  <button
                                    className="text-button"
                                    disabled={busy}
                                    onClick={async () => {
                                      setBusy(true);
                                      try {
                                        await api(
                                          `comments/${c.id}/appeal`,
                                          "POST",
                                        );
                                        announce(
                                          "Your review request has been sent.",
                                        );
                                      } catch (e) {
                                        announce(e.message);
                                      } finally {
                                        setBusy(false);
                                      }
                                    }}
                                  >
                                    {t("Request review")}
                                  </button>
                                )}
                                {c.is_owner ? (
                                  <button
                                    disabled={busy}
                                    className="text-button"
                                    onClick={() => deleteComment(c.id)}
                                  >
                                    {t("Delete reply")}
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="text-button"
                                      onClick={() =>
                                        openReport("comments", c.id)
                                      }
                                    >
                                      {t("Report")}
                                    </button>
                                    <button
                                      className="text-button"
                                      onClick={() =>
                                        openBlock("comments", c.id)
                                      }
                                    >
                                      {t("Block author")}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="empty-replies">
                            {detail.response === "Advice welcome"
                              ? t("A little understanding can start with you.")
                              : t("Replies are closed for this thought.")}
                          </p>
                        )}
                        <ErrorBox error={detailError} />
                        {detail.response === "Advice welcome" &&
                          (user ? (
                            <form onSubmit={submitReply}>
                              <label htmlFor="reply">
                                {t("Leave a gentle reply")}
                              </label>
                              <textarea
                                id="reply"
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                maxLength={2000}
                                required
                                placeholder={t("I hear you…")}
                              />
                              <button
                                className="primary"
                                disabled={busy || !reply.trim()}
                              >
                                <Send size={16} />
                                {t("Send reply")}
                              </button>
                            </form>
                          ) : (
                            <button
                              className="outline"
                              onClick={() => setModal({ type: "auth" })}
                            >
                              {t("Sign in to reply")}
                            </button>
                          ))}
                      </section>
                    )}
                </>
              )
            )}
          </section>
        )}
        {page === "settings" && (
          <section className="settings-page">
            <section className="settings-card language-settings">
              <h2>{t("App language")}</h2>
              <p>{t("Choose the language for menus and translations.")}</p>
              <LanguageSelect onChange={changeLanguage} />
            </section>
            <h1>{t("Make yourself at home.")}</h1>
            <p className="page-intro">
              {t("A few small choices to make this space feel like yours.")}
            </p>
            {!user ? (
              <div className="empty">
                <p>
                  {t(
                    "Sign in to manage your preferences and blocked accounts.",
                  )}
                </p>
                <button
                  className="primary"
                  onClick={() => setModal({ type: "auth" })}
                >
                  {t("Sign in")}
                </button>
              </div>
            ) : (
              <>
                <ErrorBox error={error} />
                <section className="settings-card">
                  <h2>{t("Your reading preferences")}</h2>
                  <p className="muted">
                    {t("Only selected categories appear in your Explore feed.")}
                  </p>
                  {categories.map((c, i) => (
                    <label key={c} className="toggle-row">
                      <span>{t(c)}</span>
                      <input
                        type="checkbox"
                        role="switch"
                        checked={preferences.includes(i + 1)}
                        disabled={busy}
                        onChange={() =>
                          savePreferences(
                            preferences.includes(i + 1)
                              ? preferences.filter((x) => x !== i + 1)
                              : [...preferences, i + 1],
                          )
                        }
                      />
                      <span className="switch" />
                    </label>
                  ))}
                </section>
                <AccountControls
                  key={user.email}
                  onDeleted={async () => {
                    await refreshSession();
                    go("explore");
                    announce("Account deleted.");
                  }}
                />
                <section className="settings-card">
                  <h2>{t("Blocked accounts")}</h2>
                  <p className="muted">
                    {t(
                      "Their identities stay private. Unblock an account to see its public content again.",
                    )}
                  </p>
                  {blocks.length ? (
                    blocks.map((b, i) => (
                      <div className="blocked-row" key={b.token}>
                        <span>
                          {t("Anonymous account")}
                          {i + 1}
                        </span>
                        <button
                          className="outline"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await api("blocks", "DELETE", { token: b.token });
                              load();
                              announce("Account unblocked.");
                            } catch (e) {
                              announce(e.message);
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {t("Unblock")}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p>{t("No blocked accounts.")}</p>
                  )}
                </section>
              </>
            )}
          </section>
        )}
        {page === "admin" && (
          <section className="admin-page">
            {user?.is_admin && <DirectMessageReports key={user.email} />}
            <h1>{t("Community care")}</h1>
            <p className="page-intro">
              {t(
                "Review reported public content. Private journals and drafts are excluded.",
              )}
            </p>
            <ErrorBox error={error} />
            {loading ? (
              <div className="loading">
                <LoaderCircle className="spin" />
                {t("Loading reports…")}
              </div>
            ) : (
              user?.is_admin &&
              !error && (
                <>
                  {!reports.length && (
                    <div className="empty">
                      <Shield />
                      <h3>{t("No reports to review")}</h3>
                    </div>
                  )}
                  {reports.map((r) => (
                    <section className="report-card" key={r.id}>
                      <div className="report-meta">
                        <span>
                          {t("Report #")}
                          {r.id}
                          {t("·")}
                          {r.comment_id ? t("Reply") : t("Thought")}
                        </span>
                        <span className="badge cat-5">{t(r.status)}</span>
                      </div>
                      <blockquote>
                        {r.comment_id ? r.comment_body : r.post_body}
                      </blockquote>
                      <p>
                        <strong>{t("Reason:")}</strong> {r.reason}
                      </p>
                      <p className="help">
                        {t("Content is")}{" "}
                        {(r.comment_id ? r.comment_hidden : r.post_hidden)
                          ? t("hidden")
                          : t("visible")}{" "}
                        {t("·")}
                        {t(timeAgo(r.created_at, language))}
                      </p>
                      <div className="report-buttons">
                        {["hide", "restore", "dismiss"].map((a) => (
                          <button
                            className="outline"
                            key={a}
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                await api("admin/reports/" + r.id, "POST", {
                                  action: a,
                                });
                                load();
                                announce("Moderation action recorded.");
                              } catch (e) {
                                announce(e.message);
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            {a === "hide"
                              ? t("Hide content")
                              : a === "restore"
                                ? t("Restore content")
                                : t("Dismiss report")}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )
            )}
          </section>
        )}
        {info[page] && (
          <section className="info-page">
            <Leaf size={35} strokeWidth={1} />
            <h1>{info[page][0]}</h1>
            <p>{info[page][1]}</p>
            {page === "privacy" && (
              <p>
                {t(
                  "Selected public text is sent to Google only when you request a translation. Private journals and drafts are never sent for translation.",
                )}
              </p>
            )}
            <a className="outline" href="#explore">
              {t("Back to Explore")}
              <ArrowRight size={16} />
            </a>
          </section>
        )}
        {![
          "explore",
          "journal",
          "mine",
          "saved",
          "settings",
          "messages",
          "notifications",
          "admin",
          ...Object.keys(info),
        ].includes(page) &&
          !page.startsWith("post/") &&
          !page.startsWith("messages/") && (
            <section className="empty">
              <h2>{t("This corner doesn’t exist yet.")}</h2>
              <a className="outline" href="#explore">
                {t("Back to Explore")}
              </a>
            </section>
          )}
      </main>
      <footer className="site-footer">
        <div className="footer-shell">
          <p>{t("Take your time. You can come back whenever you like.")}</p>
          <nav aria-label="Footer">
            <a href="#about">{t("About")}</a>
            <a href="#guidelines">{t("Community Guidelines")}</a>
            <a href="#privacy">{t("Privacy")}</a>
            <a href="#contact">{t("Contact")}</a>
          </nav>
        </div>
      </footer>
      {notice && (
        <div className={`toast ${notice === "Home" ? "navigation-toast" : ""}`} role="status" aria-atomic="true">
          {notice === "Home" ? <NavigationIcon kind="home" size={17} /> : <Check size={18} aria-hidden="true" />}
          {t(notice)}
        </div>
      )}
      {modal?.type === "auth" && (
        <Auth onClose={() => setModal(null)} onSuccess={refreshSession} />
      )}
      {modal?.type === "compose" && (
        <Composer
          key={
            modal.initial?.id ||
            (modal.previous ? `episode:${modal.previous.id}` : null) ||
            (modal.privateEntry ? "new-private" : "new-public")
          }
          initial={modal.initial}
          previous={modal.previous}
          privateEntry={modal.privateEntry}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            announce(msg);
            load();
          }}
        />
      )}
      {modal?.type === "dm" && user && (
        <MessageRequest
          key={user.email}
          postId={modal.postId}
          onClose={() => setModal(null)}
          onSent={(token) => {
            setModal(null);
            go(`messages/${token}`);
          }}
        />
      )}
      {["report", "block", "delete"].includes(modal?.type) && (
        <Modal
          title={
            modal.type === "report"
              ? t("Let us know what happened")
              : modal.type === "block"
                ? t("Create a little distance?")
                : t("Delete this thought?")
          }
          onClose={() => setModal(null)}
        >
          {modal.type === "report" ? (
            <>
              <p className="muted">
                {t(
                  "Your report is private and will be reviewed by an administrator.",
                )}
              </p>
              <button
                className="outline"
                onClick={() =>
                  setReason(t("Suspected scam or financial solicitation"))
                }
              >
                {t("Report a suspected scam")}
              </button>
              <label>
                {t("Reason")}
                <textarea
                  value={reason}
                  minLength={3}
                  maxLength={1000}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("Tell us what concerns you…")}
                />
              </label>
            </>
          ) : (
            <p className="muted">
              {modal.type === "block"
                ? t(
                    "This author’s public posts and replies will be hidden from you. You can unblock them in Settings.",
                  )
                : t(
                    "This will permanently remove your thought and its replies. This action cannot be undone.",
                  )}
            </p>
          )}
          <ErrorBox error={modalError} />
          <div className="dialog-actions">
            <button className="outline" onClick={() => setModal(null)}>
              {t("Cancel")}
            </button>
            <button
              className="primary"
              disabled={
                busy || (modal.type === "report" && reason.trim().length < 3)
              }
              onClick={confirmModeration}
            >
              {busy
                ? t("Please wait…")
                : modal.type === "report"
                  ? t("Send report")
                  : modal.type === "block"
                    ? t("Block author")
                    : t("Delete thought")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
