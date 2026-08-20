const TimelineView = (function () {
  const YEAR_WIDTH = 160;
  const LANE_HEIGHT = 28;
  const TOP = 28;

  function rangeFor(projects) {
    let min = 2025;
    let max = 2029;
    projects.forEach((project) => {
      collectYears(project).forEach((year) => {
        if (year < min) min = year;
        if (year > max) max = year;
      });
    });
    return { min, max };
  }

  function eventsFor(projects) {
    const events = [];
    projects.forEach((project) => {
      (project.milestones || []).forEach((item) => {
        const date = parseFlexibleDate(item.date, item.datePrecision);
        if (!date) return;
        events.push({
          id: item.id,
          projectId: project.id,
          projectName: project.name,
          date: date,
          raw: item.date,
          precision: item.datePrecision,
          dateType: item.dateType || "actual",
          label: item.event,
          color: topicColor(primaryTopic(project)),
          note: item.note
        });
      });
    });
    return events.sort((a, b) => a.date - b.date);
  }

  function assignLanes(events, startMs, pxPerMs) {
    const lanes = [];
    events.forEach((event) => {
      const x = (event.date.getTime() - startMs) * pxPerMs;
      const width = 210;
      let lane = 0;
      while (lanes[lane] != null && x < lanes[lane]) lane += 1;
      lanes[lane] = x + width + 8;
      event.lane = lane;
      event.x = x;
    });
    return Math.max(lanes.length, 1);
  }

  function render(projects, selectedId, onSelect) {
    const track = document.getElementById("timeline-track");
    const label = document.getElementById("timeline-range");
    const { min, max } = rangeFor(projects);
    const yearCount = max - min + 1;
    const width = Math.max(yearCount * YEAR_WIDTH, track.parentElement.clientWidth || 800);
    const start = new Date(min, 0, 1);
    const end = new Date(max + 1, 0, 1);
    const startMs = start.getTime();
    const spanMs = end.getTime() - startMs;
    const pxPerMs = width / spanMs;
    const events = eventsFor(projects);
    const laneCount = assignLanes(events, startMs, pxPerMs);
    const height = Math.max(TOP + laneCount * LANE_HEIGHT + 18, track.parentElement.clientHeight || 140);

    track.style.width = width + "px";
    track.style.height = height + "px";
    label.textContent = min + "–" + max + " · expands automatically beyond 2025–2029 when dates require it";

    let html = "";
    const colWidth = width / yearCount;
    for (let year = min; year <= max; year += 1) {
      const left = ((new Date(year, 0, 1).getTime() - startMs) / spanMs) * width;
      const inFocus = year >= 2025 && year <= 2029 ? " in-focus" : "";
      html += '<div class="year-col' + inFocus + '" style="left:' + left + 'px;width:' + colWidth + 'px"><span>' + year + "</span></div>";
    }

    const today = new Date();
    if (today >= start && today <= end) {
      const left = ((today.getTime() - startMs) / spanMs) * width;
      html += '<div class="today-line" style="left:' + left + 'px" title="Today"></div>';
    }

    events.forEach((event) => {
      const selected = event.projectId === selectedId ? " is-selected" : "";
      const typeClass = DATE_TYPE_META[event.dateType] ? DATE_TYPE_META[event.dateType].className : "actual";
      const top = TOP + event.lane * LANE_HEIGHT;
      const title = event.projectName + " — " + event.label + " (" + DATE_TYPE_META[event.dateType].label + ")";
      html +=
        '<button type="button" class="tl-event ' + typeClass + selected + '" data-id="' + escapeHtml(event.projectId) +
        '" title="' + escapeHtml(title) + '" style="left:' + event.x + "px;top:" + top + "px;color:" + event.color + '">' +
          '<span class="tl-dot"></span>' +
          '<span>' + escapeHtml(formatDisplayDate(event.raw, event.precision)) + " · " + escapeHtml(event.label) + "</span>" +
        "</button>";
    });

    if (!events.length) {
      html += '<p class="empty">No timeline milestones match the current filters.</p>';
    }

    track.innerHTML = html;
    track.onclick = (event) => {
      const button = event.target.closest(".tl-event");
      if (button) onSelect(button.dataset.id);
    };

    if (selectedId) {
      const selected = track.querySelector('.tl-event[data-id="' + selectedId + '"]');
      if (selected) selected.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    } else {
      const start2025 = ((new Date(2025, 0, 1).getTime() - startMs) / spanMs) * width;
      track.parentElement.scrollLeft = Math.max(0, start2025 - 24);
    }
  }

  return { render, rangeFor };
})();
