export const moods = [
  { value: "calm", label: "Calm", icon: "🌿" },
  { value: "happy", label: "Happy", icon: "☀️" },
  { value: "sad", label: "Sad", icon: "🌧️" },
  { value: "anxious", label: "Anxious", icon: "🌊" },
  { value: "hopeful", label: "Hopeful", icon: "🌱" },
  { value: "overwhelmed", label: "Overwhelmed", icon: "☁️" },
];

export function journalMarkdown(posts, t = (value) => value) {
  return `# ${t("My journal")}\n\n${posts.map((post) => {
    const mood = moods.find((item) => item.value === post.mood);
    return [
      `## ${(post.title || t("Untitled entry")).replace(/[\r\n]/g, " ")}`,
      `${post.created_at} UTC · ${t(post.category)} · ${t(post.status === "draft" ? "Draft" : "Private journal")}`,
      ...(mood ? [`${t("Mood")}: ${t(mood.label)}`] : []),
      post.body,
    ].join("\n\n");
  }).join("\n\n---\n\n")}\n`;
}

// Read every page; exporting never changes or publishes an entry.
export async function readJournal(api) {
  const entries = new Map();
  let offset = 0;
  while (offset <= 100000) {
    const page = await api(`posts?scope=journal&sort=oldest&offset=${offset}`);
    for (const post of page.posts) entries.set(post.id, post);
    if (!page.has_more) return [...entries.values()];
    if (!page.posts.length) throw new Error("Journal download could not finish. Please try again.");
    offset += page.posts.length;
  }
  throw new Error("Journal download could not finish. Please try again.");
}
