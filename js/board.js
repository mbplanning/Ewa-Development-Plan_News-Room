function renderBoard(projects, selectedId, expandedId) {
  const root = document.getElementById("board");
  const count = document.getElementById("result-count");
  count.textContent = projects.length === 1 ? "1 record" : projects.length + " records";
  if (!projects.length) {
    root.innerHTML = '<p class="empty">No projects match the current search and filters.</p>';
    return;
  }

  root.innerHTML = projects.map((project) => {
    const selected = project.id === selectedId ? " is-selected" : "";
    const expanded = project.id === expandedId ? " is-expanded" : "";
    const review = project.needsReview ? " needs-review" : "";
    const color = topicColor(primaryTopic(project));
    const topics = (project.topics || []).map((topic) =>
      '<span class="topic" style="background:' + topicColor(topic) + '">' + escapeHtml(TOPIC_META[topic] ? TOPIC_META[topic].short : topic) + "</span>"
    ).join("");
    const tags = (project.tags || []).map((tag) => '<span class="tag">' + escapeHtml(tag) + "</span>").join("");
    const latestSource = (project.sources || [])[0];
    return (
      '<article class="card' + selected + expanded + review + '" data-id="' + escapeHtml(project.id) + '" style="border-top: 3px solid ' + color + '">' +
        '<div class="card-top">' +
          "<div>" +
            "<h3>" + escapeHtml(project.name) + "</h3>" +
            '<p class="card-meta">' + escapeHtml(displayValue(project.location)) + "</p>" +
          "</div>" +
          '<span class="status-chip">' + escapeHtml(project.needsReview ? "Needs review" : displayValue(project.statusLabel || project.currentStatus)) + "</span>" +
        "</div>" +
        '<p class="whats-new"><strong>What’s new. </strong>' + escapeHtml(displayValue(project.whatsNew)) + "</p>" +
        '<p class="card-meta">Latest update: ' + escapeHtml(formatDisplayDate(project.latestUpdateDate)) +
          (latestSource ? " · " + escapeHtml(latestSource.organization || "") : "") +
        "</p>" +
        '<div class="topic-row">' + topics + tags + "</div>" +
        '<div class="card-actions">' +
          '<button type="button" class="toggle-details" data-id="' + escapeHtml(project.id) + '">' +
            (project.id === expandedId ? "Hide details" : "Show details") +
          "</button>" +
          '<button type="button" class="focus-map" data-id="' + escapeHtml(project.id) + '">Show on map</button>' +
        "</div>" +
        '<div class="details">' + renderDetails(project) + "</div>" +
      "</article>"
    );
  }).join("");
}

function renderDetails(project) {
  const expected = project.expectedCompletion || {};
  const expectedText = expected.label || formatDisplayDate(expected.date, expected.datePrecision);
  const expectedType = expected.dateType ? DATE_TYPE_META[expected.dateType] : null;
  const sourceList = (project.sources || []).map((source) => renderSource(source)).join("") || '<p class="muted">Not identified</p>';
  const updates = (project.updates || []).slice().sort((a, b) => (parseFlexibleDate(b.date) || 0) - (parseFlexibleDate(a.date) || 0));
  const history = (project.statusHistory || []).slice().sort((a, b) => (parseFlexibleDate(b.date) || 0) - (parseFlexibleDate(a.date) || 0));
  const milestones = (project.milestones || []).slice().sort((a, b) => (parseFlexibleDate(a.date) || 0) - (parseFlexibleDate(b.date) || 0));

  return (
    '<dl class="detail-grid">' +
      row("Issue / why it matters", project.issue) +
      row("Current status", project.currentStatus) +
      '<dt>Expected completion</dt><dd>' + escapeHtml(displayValue(expectedText)) +
        (expectedType ? ' <span class="precision">' + escapeHtml(expectedType.label) + "</span>" : "") +
        (expected.note ? '<div class="muted">' + escapeHtml(expected.note) + "</div>" : "") +
      "</dd>" +
      row("Involved agency / org", (project.agencies || []).join("; ")) +
      row("Project / issue type", project.type) +
      row("Notes", project.notes) +
    "</dl>" +
    '<p class="section-label">Updates and sources</p>' +
    (updates.map((item) => {
      const source = sourceById(project, item.sourceId);
      return (
        '<div class="update">' +
          '<div class="update-date">' + escapeHtml(formatDisplayDate(item.date, item.datePrecision)) + "</div>" +
          "<div>" + escapeHtml(item.summary) + "</div>" +
          (source ? '<div class="muted">Source: ' + escapeHtml(source.organization || displayValue(source.title)) + "</div>" : "") +
        "</div>"
      );
    }).join("") || '<p class="muted">Not identified</p>') +
    '<p class="section-label">Status / decision history</p>' +
    (history.map((item) => (
      '<div class="history">' +
        '<div class="history-date">' + escapeHtml(formatDisplayDate(item.date, item.datePrecision)) + "</div>" +
        "<div><strong>Then:</strong> " + escapeHtml(displayValue(item.previousStatus)) + "</div>" +
        "<div><strong>Changed to:</strong> " + escapeHtml(displayValue(item.newStatus)) + "</div>" +
        (item.explanation ? "<div>" + escapeHtml(item.explanation) + "</div>" : "") +
      "</div>"
    )).join("") || '<p class="muted">Not identified</p>') +
    '<p class="section-label">Milestones</p>' +
    (milestones.map((item) => {
      const meta = DATE_TYPE_META[item.dateType] || DATE_TYPE_META.actual;
      return (
        '<div class="history">' +
          '<div class="history-date">' + escapeHtml(formatDisplayDate(item.date, item.datePrecision)) +
            ' <span class="precision">' + escapeHtml(meta.label) + "</span></div>" +
          "<div>" + escapeHtml(item.event) + "</div>" +
          (item.note ? '<div class="muted">' + escapeHtml(item.note) + "</div>" : "") +
        "</div>"
      );
    }).join("") || '<p class="muted">Not identified</p>') +
    '<p class="section-label">Sources</p>' +
    sourceList
  );
}

function row(label, value) {
  return "<dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(displayValue(value)) + "</dd>";
}

function renderSource(source) {
  const title = source.url
    ? '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(displayValue(source.title)) + "</a>"
    : escapeHtml(displayValue(source.title));
  return (
    '<div class="source-block">' +
      "<div>" + title + "</div>" +
      '<div class="muted">' + escapeHtml(displayValue(source.organization)) +
        " · published " + escapeHtml(formatDisplayDate(source.published)) +
        " · added " + escapeHtml(formatDisplayDate(source.added)) +
      "</div>" +
      (source.note ? '<div class="muted">' + escapeHtml(source.note) + "</div>" : "") +
    "</div>"
  );
}

function bindBoard(onSelect, onToggle, onMap) {
  const root = document.getElementById("board");
  root.onclick = (event) => {
    const toggle = event.target.closest(".toggle-details");
    const mapBtn = event.target.closest(".focus-map");
    const card = event.target.closest(".card");
    if (toggle) {
      event.stopPropagation();
      onToggle(toggle.dataset.id);
      return;
    }
    if (mapBtn) {
      event.stopPropagation();
      onMap(mapBtn.dataset.id);
      return;
    }
    if (card) onSelect(card.dataset.id);
  };
}
