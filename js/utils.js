const TOPICS = [
  "Transportation / Mobility",
  "Housing / Development",
  "Infrastructure / One Water",
  "Parks / Open Space",
  "Environmental / Resilience",
  "Public Facilities",
  "Economic Development / Healthy Community",
  "Cultural / Historic Resources"
];

const TOPIC_META = {
  "Transportation / Mobility": { color: "#3d6b8a", short: "Transportation" },
  "Housing / Development": { color: "#c45c32", short: "Housing" },
  "Infrastructure / One Water": { color: "#0f6a64", short: "One Water" },
  "Parks / Open Space": { color: "#6b7c3a", short: "Parks" },
  "Environmental / Resilience": { color: "#2d6a4f", short: "Environment" },
  "Public Facilities": { color: "#6f5b85", short: "Public facilities" },
  "Economic Development / Healthy Community": { color: "#b07d1a", short: "Economy / health" },
  "Cultural / Historic Resources": { color: "#8a4b2f", short: "Cultural / historic" }
};

const DATE_TYPE_META = {
  actual: { label: "Occurred", className: "actual" },
  "confirmed-future": { label: "Confirmed date", className: "confirmed-future" },
  confirmed: { label: "Confirmed date", className: "confirmed" },
  estimated: { label: "Estimated / anticipated", className: "estimated" }
};

function displayValue(value) {
  if (value == null) return "Not identified";
  if (typeof value === "string" && value.trim() === "") return "Not identified";
  if (Array.isArray(value) && value.length === 0) return "Not identified";
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topicColor(topic) {
  return (TOPIC_META[topic] && TOPIC_META[topic].color) || "#5e574c";
}

function primaryTopic(project) {
  return (project.topics && project.topics[0]) || "";
}

function parseFlexibleDate(raw, precision) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (/^\d{4}$/.test(text)) return new Date(Number(text), precision === "season" ? 9 : 0, 1);
  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDisplayDate(raw, precision) {
  if (!raw) return "Not identified";
  const text = String(raw).trim();
  if (precision === "season" && /^\d{4}-\d{2}$/.test(text)) {
    const month = Number(text.slice(5, 7));
    const year = text.slice(0, 4);
    if (month >= 9 && month <= 11) return "Fall " + year;
    if (month <= 2 || month === 12) return "Winter " + year;
    if (month <= 5) return "Spring " + year;
    return "Summer " + year;
  }
  if (precision === "year" || /^\d{4}$/.test(text)) return text.slice(0, 4);
  if (precision === "month" || /^\d{4}-\d{2}$/.test(text)) {
    const date = parseFlexibleDate(text);
    return date
      ? date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : text;
  }
  const date = parseFlexibleDate(text);
  return date
    ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : text;
}

function yearFrom(raw, precision) {
  const date = parseFlexibleDate(raw, precision);
  return date ? date.getFullYear() : null;
}

function sourceById(project, sourceId) {
  return (project.sources || []).find((source) => source.id === sourceId) || null;
}

function collectYears(project) {
  const years = new Set();
  const add = (raw, precision) => {
    const year = yearFrom(raw, precision);
    if (year) years.add(year);
  };
  add(project.latestUpdateDate);
  add(project.expectedCompletion && project.expectedCompletion.date, project.expectedCompletion && project.expectedCompletion.datePrecision);
  (project.updates || []).forEach((item) => add(item.date, item.datePrecision));
  (project.statusHistory || []).forEach((item) => add(item.date, item.datePrecision));
  (project.milestones || []).forEach((item) => add(item.date, item.datePrecision));
  (project.sources || []).forEach((item) => add(item.published));
  return years;
}

function searchBlob(project) {
  const parts = [
    project.name,
    project.location,
    project.whatsNew,
    project.issue,
    project.currentStatus,
    project.statusLabel,
    project.notes,
    project.type,
    ...(project.communities || []),
    ...(project.agencies || []),
    ...(project.topics || []),
    ...(project.tags || [])
  ];
  (project.updates || []).forEach((item) => parts.push(item.summary));
  (project.sources || []).forEach((item) => parts.push(item.title, item.organization, item.url));
  (project.statusHistory || []).forEach((item) => parts.push(item.newStatus, item.explanation));
  (project.milestones || []).forEach((item) => parts.push(item.event));
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function uniqueSorted(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b)));
}

function filterOptions(projects) {
  const agencies = [];
  const sources = [];
  const tags = [];
  const communities = [];
  const statuses = [];
  const types = [];
  const years = [];
  projects.forEach((project) => {
    (project.agencies || []).forEach((item) => agencies.push(item));
    (project.sources || []).forEach((item) => sources.push(item.organization));
    (project.tags || []).forEach((item) => tags.push(item));
    (project.communities || []).forEach((item) => communities.push(item));
    statuses.push(project.statusLabel || project.currentStatus);
    types.push(project.type);
    collectYears(project).forEach((year) => years.push(year));
  });
  return {
    topics: TOPICS.filter((topic) => projects.some((project) => (project.topics || []).includes(topic))),
    communities: uniqueSorted(communities),
    statuses: uniqueSorted(statuses),
    years: uniqueSorted(years),
    agencies: uniqueSorted(agencies),
    sources: uniqueSorted(sources),
    types: uniqueSorted(types),
    tags: uniqueSorted(tags)
  };
}

function matchesFilters(project, query, filters) {
  if (query) {
    const blob = searchBlob(project);
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((term) => blob.includes(term))) return false;
  }
  const has = (selected, values) => !selected.length || selected.some((item) => values.includes(item));
  if (!has(filters.topics, project.topics || [])) return false;
  if (!has(filters.communities, project.communities || [])) return false;
  if (!has(filters.statuses, [project.statusLabel || project.currentStatus])) return false;
  if (!has(filters.types, [project.type])) return false;
  if (!has(filters.tags, project.tags || [])) return false;
  if (!has(filters.agencies, project.agencies || [])) return false;
  if (!has(filters.sources, (project.sources || []).map((item) => item.organization))) return false;
  if (filters.years.length) {
    const years = Array.from(collectYears(project)).map(String);
    if (!filters.years.some((year) => years.includes(String(year)))) return false;
  }
  return true;
}

function compareLatest(a, b) {
  const dateA = parseFlexibleDate(a.latestUpdateDate) || new Date(0);
  const dateB = parseFlexibleDate(b.latestUpdateDate) || new Date(0);
  return dateB - dateA;
}
