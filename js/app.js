const App = (function () {
  const FILTER_FIELDS = [
    { key: "topics", label: "Topic" },
    { key: "communities", label: "Location / Community" },
    { key: "statuses", label: "Current Status" },
    { key: "years", label: "Year" },
    { key: "agencies", label: "Involved Agency / Org" },
    { key: "sources", label: "Source" },
    { key: "types", label: "Project / Issue Type" },
    { key: "tags", label: "Project Tags" }
  ];

  const state = {
    data: null,
    query: "",
    filters: {
      topics: [],
      communities: [],
      statuses: [],
      years: [],
      agencies: [],
      sources: [],
      types: [],
      tags: []
    },
    selectedId: null,
    expandedId: null
  };

  function visibleProjects() {
    return state.data.projects
      .filter((project) => matchesFilters(project, state.query, state.filters))
      .sort(compareLatest);
  }

  function renderFilters() {
    const options = filterOptions(state.data.projects);
    const bar = document.getElementById("filter-bar");
    bar.innerHTML = FILTER_FIELDS.map((field) => {
      const selected = state.filters[field.key];
      const has = selected.length ? " has-value" : "";
      const count = selected.length ? " (" + selected.length + ")" : "";
      const items = (options[field.key] || []).map((value) => {
        const checked = selected.map(String).includes(String(value)) ? " checked" : "";
        return (
          "<label><input type=\"checkbox\" data-field=\"" + field.key + "\" value=\"" + escapeHtml(String(value)) + "\"" + checked + ">" +
          "<span>" + escapeHtml(String(value)) + "</span></label>"
        );
      }).join("");
      return (
        '<div class="filter" data-field="' + field.key + '">' +
          '<button type="button" class="' + has.trim() + '">' + escapeHtml(field.label) + count + "</button>" +
          '<div class="filter-menu">' + (items || '<p class="muted">No values yet</p>') + "</div>" +
        "</div>"
      );
    }).join("") + '<button type="button" class="clear-filters" id="clear-filters">Clear filters</button>';
  }

  function refresh(fitMap) {
    const projects = visibleProjects();
    if (state.selectedId && !projects.some((project) => project.id === state.selectedId)) {
      state.selectedId = null;
    }
    renderBoard(projects, state.selectedId, state.expandedId);
    MapView.render(projects, state.selectedId, state.data.planArea, selectProject, fitMap !== false);
    TimelineView.render(projects, state.selectedId, selectProject);
    document.getElementById("footnote").textContent = state.data.meta.note || "";
  }

  function selectProject(id, options) {
    const opts = options || {};
    state.selectedId = id;
    if (opts.expand !== false) state.expandedId = id;
    refresh(true);
    const card = document.querySelector('.card[data-id="' + id + '"]');
    if (card && opts.focusMap !== true) card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (opts.focusMap) {
      MapView.focus(id);
    }
    if (window.matchMedia("(max-width: 900px)").matches && opts.mobileView) {
      document.querySelector(".layout").dataset.view = opts.mobileView;
      document.querySelectorAll(".mobile-tabs button").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.view === opts.mobileView);
      });
    }
  }

  function bindFilters() {
    const bar = document.getElementById("filter-bar");
    bar.addEventListener("click", (event) => {
      const clear = event.target.closest("#clear-filters");
      if (clear) {
        FILTER_FIELDS.forEach((field) => { state.filters[field.key] = []; });
        document.querySelectorAll(".filter-menu input").forEach((input) => { input.checked = false; });
        updateFilterButtons();
        refresh();
        return;
      }
      const button = event.target.closest(".filter > button");
      if (button) {
        const filter = button.parentElement;
        const open = filter.classList.contains("open");
        bar.querySelectorAll(".filter").forEach((node) => node.classList.remove("open"));
        if (!open) filter.classList.add("open");
      }
    });
    bar.addEventListener("change", (event) => {
      const input = event.target;
      if (input.tagName !== "INPUT") return;
      const field = input.dataset.field;
      const value = input.value;
      const list = state.filters[field];
      if (input.checked) {
        if (!list.map(String).includes(value)) list.push(field === "years" ? Number(value) || value : value);
      } else {
        state.filters[field] = list.filter((item) => String(item) !== value);
      }
      updateFilterButtons();
      refresh();
    });
  }

  function updateFilterButtons() {
    FILTER_FIELDS.forEach((field) => {
      const button = document.querySelector('.filter[data-field="' + field.key + '"] > button');
      if (!button) return;
      const selected = state.filters[field.key];
      button.textContent = field.label + (selected.length ? " (" + selected.length + ")" : "");
      button.classList.toggle("has-value", selected.length > 0);
    });
  }

  function bindChrome() {
    document.getElementById("search").addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      refresh(false);
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".filter")) {
        document.querySelectorAll(".filter").forEach((node) => node.classList.remove("open"));
      }
    });
    document.querySelector(".mobile-tabs").addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      document.querySelectorAll(".mobile-tabs button").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      const pane = {
        board: "board-pane",
        map: "map-pane",
        timeline: "timeline-pane"
      }[button.dataset.view];
      const node = document.getElementById(pane);
      if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });
      if (button.dataset.view === "map") MapView.invalidate();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        state.selectedId = null;
        state.expandedId = null;
        refresh(false);
      }
    });
    bindBoard(
      (id) => selectProject(id),
      (id) => {
        state.expandedId = state.expandedId === id ? null : id;
        state.selectedId = id;
        refresh(true);
      },
      (id) => {
        selectProject(id, { focusMap: true, mobileView: "map" });
        if (!window.matchMedia("(max-width: 900px)").matches) MapView.focus(id);
      }
    );
  }

  function boot() {
    if (!window.EWA_DP_DATA || !Array.isArray(window.EWA_DP_DATA.projects)) {
      document.getElementById("board").innerHTML = '<p class="empty">Could not load project data.</p>';
      return;
    }
    state.data = window.EWA_DP_DATA;
    MapView.init();
    renderFilters();
    bindFilters();
    bindChrome();
    refresh();
    window.addEventListener("resize", () => {
      MapView.invalidate();
      TimelineView.render(visibleProjects(), state.selectedId, selectProject);
    });
  }

  return { boot };
})();

document.addEventListener("DOMContentLoaded", App.boot);
