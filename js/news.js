(function () {
  function params() {
    return new URLSearchParams(window.location.search);
  }

  function isHostedView() {
    return /\.github\.io$/i.test(window.location.hostname);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseDate(raw) {
    if (!raw) return 0;
    var text = String(raw).trim();
    if (/^\d{4}$/.test(text)) return Date.parse(text + "-01-01") || 0;
    if (/^\d{4}-\d{2}$/.test(text)) return Date.parse(text + "-01") || 0;
    return Date.parse(text) || 0;
  }

  function formatDate(raw) {
    if (!raw) return "Date not identified";
    var text = String(raw).trim();
    if (/^\d{4}$/.test(text)) return text;
    if (/^\d{4}-\d{2}$/.test(text)) {
      var monthOnly = new Date(Number(text.slice(0, 4)), Number(text.slice(5, 7)) - 1, 1);
      return monthOnly.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    var date = new Date(text + "T00:00:00");
    if (isNaN(date.getTime())) return text;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function monthYearLabel(value) {
    var text = String(value || "").trim();
    if (!text) return "";
    return formatDate(text);
  }

  function display(value) {
    var text = String(value || "").trim();
    return text || "Not identified";
  }

  function locationLabel(item) {
    var kind = item.locationType;
    if (kind === "point") return "Point / site";
    if (kind === "road") return "Road";
    if (kind === "region") return "Region";
    return "";
  }

  function parties(item) {
    return [item.governmentParties, item.otherParties].filter(Boolean).join("; ");
  }

  function newsItems(data, includeArchived) {
    var items = [];
    if (data && Array.isArray(data.items)) {
      items = data.items.slice();
    } else {
      (data.projects || []).forEach(function (project) {
        (project.updates || []).forEach(function (update) {
          var source = (project.sources || []).filter(function (entry) {
            return entry.id === update.sourceId;
          })[0] || (project.sources || [])[0];
          items.push({
            id: update.id,
            date: update.date || "",
            headline: update.headline || project.name,
            summary: update.summary || project.whatsNew || "",
            place: project.location || "",
            source: source ? (source.organization || source.title || "") : "",
            beginDate: "",
            endDate: "",
            governmentParties: "",
            otherParties: "",
            actionItem: "",
            sourceUrl: source ? (source.url || "") : "",
            archived: false
          });
        });
      });
    }
    if (!includeArchived) {
      items = items.filter(function (item) {
        return !item.archived;
      });
    }
    items.sort(function (a, b) {
      return parseDate(b.date) - parseDate(a.date);
    });
    return items;
  }

  function actionFlag(item) {
    var text = String(item.actionItem || "").trim();
    if (!text) return "";
    return (
      '<span class="action-flag" tabindex="0" aria-label="Action item">' +
        '<span class="action-flag-mark" aria-hidden="true"></span>' +
        '<span class="action-flag-tip">' +
          '<span class="action-flag-text">' + escapeHtml(text) + "</span>" +
          '<label class="action-done-label" data-id="' + escapeHtml(item.id) + '">' +
            '<input type="checkbox" class="action-done" data-id="' + escapeHtml(item.id) + '" aria-label="Mark action item done">' +
          "</label>" +
        "</span>" +
      "</span>"
    );
  }

  function fieldRow(label, value, isLink) {
    if (isLink && value) {
      return (
        '<div class="field">' +
          "<dt>" + escapeHtml(label) + "</dt>" +
          '<dd><a href="' + escapeHtml(value) + '" target="_blank" rel="noopener">' + escapeHtml(value) + "</a></dd>" +
        "</div>"
      );
    }
    return (
      '<div class="field">' +
        "<dt>" + escapeHtml(label) + "</dt>" +
        "<dd>" + escapeHtml(display(value)) + "</dd>" +
      "</div>"
    );
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .replace(/-\s*\n\s*/g, "")
      .toLowerCase()
      .replace(/[\u2018\u2019\u201c\u201d]/g, "")
      .replace(/[^a-z0-9āēīōūʻ\s]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function searchHaystack(item) {
    return normalizeSearchText([
      item.headline,
      item.summary,
      item.source,
      item.place,
      item.beginDate,
      item.endDate,
      item.governmentParties,
      item.otherParties,
      item.actionItem,
      item.date,
      item.documentText
    ].join(" "));
  }

  function matchesSearch(item, query) {
    var words = normalizeSearchText(query).split(" ").filter(Boolean);
    if (!words.length) return true;
    var hay = searchHaystack(item);
    return words.every(function (word) {
      return hay.indexOf(word) !== -1;
    });
  }

  function locateItem(item) {
    if (window.EwaPlaces && EwaPlaces.applyToItem) EwaPlaces.applyToItem(item);
    return item;
  }

  function visibleItems(data) {
    var showArchived = document.getElementById("show-archived").checked;
    var searchNode = document.getElementById("news-search");
    var query = searchNode ? searchNode.value : "";
    return newsItems(data, showArchived).filter(function (item) {
      return matchesSearch(item, query);
    }).map(locateItem);
  }

  function toYearMonth(value) {
    var text = String(value || "").trim();
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) return text;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.slice(0, 7);
    return "";
  }

  function monthIndex(value) {
    var ym = toYearMonth(value);
    if (!ym) return null;
    return Number(ym.slice(0, 4)) * 12 + (Number(ym.slice(5, 7)) - 1);
  }

  function monthFromIndex(index) {
    var year = Math.floor(index / 12);
    var month = (index % 12) + 1;
    return year + "-" + (month < 10 ? "0" : "") + month;
  }

  function itemTimeMark(item) {
    var begin = toYearMonth(item.beginDate);
    var end = toYearMonth(item.endDate);
    var stamp = toYearMonth(item.date);
    if (begin && end) {
      if (monthIndex(end) < monthIndex(begin)) {
        var swap = begin;
        begin = end;
        end = swap;
      }
      return {
        id: item.id,
        headline: item.headline || "Untitled",
        kind: begin === end ? "point" : "span",
        start: begin,
        end: end
      };
    }
    if (begin) return { id: item.id, headline: item.headline || "Untitled", kind: "point", start: begin, end: begin };
    if (end) return { id: item.id, headline: item.headline || "Untitled", kind: "point", start: end, end: end };
    if (stamp) return { id: item.id, headline: item.headline || "Untitled", kind: "point", start: stamp, end: stamp };
    return null;
  }

  function assignLanes(marks) {
    var lanes = [];
    marks.sort(function (a, b) {
      return monthIndex(a.start) - monthIndex(b.start) || monthIndex(a.end) - monthIndex(b.end);
    });
    marks.forEach(function (mark) {
      var start = monthIndex(mark.start);
      var end = monthIndex(mark.end);
      var lane = 0;
      for (; lane < lanes.length; lane += 1) {
        if (lanes[lane] < start) break;
      }
      if (lane === lanes.length) lanes.push(end);
      else lanes[lane] = end;
      mark.lane = lane;
    });
    return marks;
  }

  function timelineTicks(minIndex, maxIndex) {
    var span = maxIndex - minIndex;
    var step = 1;
    if (span > 48) step = 12;
    else if (span > 24) step = 6;
    else if (span > 12) step = 3;
    var ticks = [];
    var index = minIndex;
    while (index <= maxIndex) {
      var atStart = (index - minIndex) % step === 0;
      if (atStart || index === minIndex || index === maxIndex) {
        var date = new Date(Math.floor(index / 12), index % 12, 1);
        var label = step >= 12
          ? (index % 12 === 0 || index === minIndex || index === maxIndex
            ? String(date.getFullYear())
            : "")
          : date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        ticks.push({ index: index, label: label });
      }
      index += 1;
    }
    return ticks;
  }

  function renderTimeline(items) {
    var root = document.getElementById("news-timeline");
    var rangeNode = document.getElementById("timeline-range");
    if (!root) return;
    var marks = assignLanes((items || []).map(itemTimeMark).filter(Boolean));
    if (!marks.length) {
      root.innerHTML = '<p class="timeline-empty">No month/year dates to plot yet. Add a begin date, end date, or article date.</p>';
      if (rangeNode) {
        rangeNode.textContent = "Articles with a month/year appear here. The range grows as news is added.";
      }
      return;
    }
    var dataMin = marks.reduce(function (min, mark) {
      return Math.min(min, monthIndex(mark.start));
    }, monthIndex(marks[0].start));
    var dataMax = marks.reduce(function (max, mark) {
      return Math.max(max, monthIndex(mark.end));
    }, monthIndex(marks[0].end));
    var minIndex = dataMin;
    var maxIndex = dataMax;
    if (minIndex === maxIndex) {
      minIndex -= 6;
      maxIndex += 6;
    } else {
      minIndex -= 1;
      maxIndex += 1;
    }
    var span = maxIndex - minIndex || 1;
    var laneCount = marks.reduce(function (max, mark) {
      return Math.max(max, mark.lane + 1);
    }, 1);
    if (rangeNode) {
      rangeNode.textContent = dataMin === dataMax
        ? formatDate(monthFromIndex(dataMin))
        : formatDate(monthFromIndex(dataMin)) + " – " + formatDate(monthFromIndex(dataMax));
    }
    function leftPct(index) {
      return ((index - minIndex) / span) * 100;
    }
    var ticks = timelineTicks(minIndex, maxIndex).map(function (tick) {
      if (!tick.label) return "";
      return (
        '<span class="timeline-tick" style="left:' + leftPct(tick.index).toFixed(2) + '%">' +
          escapeHtml(tick.label) +
        "</span>"
      );
    }).join("");
    var laneHtml = marks.map(function (mark) {
      var start = monthIndex(mark.start);
      var end = monthIndex(mark.end);
      var left = leftPct(start);
      var width = mark.kind === "point" ? 0 : Math.max(leftPct(end) - left, 1.2);
      var top = mark.lane * 1.35;
      var selected = mark.id === selectedId ? " is-selected" : "";
      var label = mark.kind === "span"
        ? monthYearLabel(mark.start) + " – " + monthYearLabel(mark.end)
        : monthYearLabel(mark.start);
      var inner = mark.kind === "span"
        ? '<span class="timeline-bar"></span><span class="timeline-dot is-start"></span><span class="timeline-dot is-end"></span>'
        : '<span class="timeline-dot"></span>';
      return (
        '<button type="button" class="timeline-mark is-' + mark.kind + selected + '" data-id="' + escapeHtml(mark.id) + '"' +
          ' style="left:' + left.toFixed(2) + "%;width:" + (mark.kind === "point" ? "0.72rem" : width.toFixed(2) + "%") + ";top:" + top + 'rem"' +
          ' aria-label="' + escapeHtml(mark.headline) + '">' +
          inner +
          '<span class="timeline-tip">' + escapeHtml(mark.headline) + "<br>" + escapeHtml(label) + "</span>" +
        "</button>"
      );
    }).join("");
    root.innerHTML =
      '<div class="timeline-lanes" style="height:' + (laneCount * 1.35 + 0.2) + 'rem">' + laneHtml + "</div>" +
      '<div class="timeline-axis">' + ticks + "</div>";
  }

  var selectedId = "";
  var newsMap = null;
  var pageStart = 0;
  var pageCount = 0;
  var resizeTimer = 0;

  function itemMarkup(item, forceClosed) {
    var place = item.place || "";
    if (locationLabel(item) && place) place = locationLabel(item) + " · " + place;
    else if (locationLabel(item)) place = locationLabel(item);
    var archived = item.archived ? '<span class="archived-tag">Archived</span>' : "";
    var onMap = item.geometry ? " is-on-map" : "";
    var hasDates = String(item.beginDate || "").trim() || String(item.endDate || "").trim();
    var dateDot = hasDates ? '<span class="date-dot" title="Has a begin or end date"></span>' : "";
    var open = !forceClosed && item.id === selectedId ? " open" : "";
    return (
      '<li class="news-item' + (item.archived ? " is-archived" : "") + onMap + (hasDates ? " has-dates" : "") + '" data-id="' + escapeHtml(item.id) + '">' +
        "<details" + open + ">" +
          "<summary>" +
            actionFlag(item) +
            "<span>" +
              '<span class="headline">' + escapeHtml(item.headline) + "</span>" +
              dateDot +
              archived +
              "<time>" + escapeHtml(formatDate(item.date)) + "</time>" +
            "</span>" +
          "</summary>" +
          '<div class="body">' +
            '<dl class="item-fields">' +
              fieldRow("Summary", item.summary) +
              fieldRow("Location", place) +
              fieldRow("Source", item.source) +
              fieldRow("Begin date", monthYearLabel(item.beginDate)) +
              fieldRow("End date", monthYearLabel(item.endDate)) +
              fieldRow("Parties", parties(item)) +
              fieldRow("Action item", item.actionItem) +
              (item.documentText
                ? '<div class="field document-field"><dt>From this document</dt><dd><pre class="saved-document">' + escapeHtml(item.documentText) + "</pre></dd></div>"
                : "") +
            "</dl>" +
            '<div class="item-actions">' +
              '<a href="entry.html?id=' + encodeURIComponent(item.id) + '">Edit</a>' +
              '<button type="button" class="archive-btn" data-id="' + escapeHtml(item.id) + '" data-archived="' + (item.archived ? "0" : "1") + '">' +
                (item.archived ? "Unarchive" : "Archive") +
              "</button>" +
              '<button type="button" class="delete-btn" data-id="' + escapeHtml(item.id) + '">Delete this post</button>' +
            "</div>" +
          "</div>" +
        "</details>" +
      "</li>"
    );
  }

  function pagerMarkup(hasPrev, hasNext) {
    return (
      '<li class="news-pager">' +
        '<button type="button" class="page-prev"' + (hasPrev ? "" : " disabled") + ">Previous page</button>" +
        '<button type="button" class="page-next"' + (hasNext ? "" : " disabled") + ">Next page</button>" +
      "</li>"
    );
  }

  function listBudget() {
    var map = document.getElementById("news-map");
    var list = document.getElementById("news-list");
    if (!map || !list) return 320;
    var mapBox = map.getBoundingClientRect();
    var listBox = list.getBoundingClientRect();
    var sideBySide = mapBox.top < listBox.top + 80 && mapBox.bottom > listBox.top + 80;
    if (sideBySide) return Math.max(140, Math.floor(mapBox.bottom - listBox.top));
    return Math.max(220, Math.min(Math.floor(window.innerHeight * 0.42), 420));
  }

  function countFit(items, start, budget) {
    var remaining = items.length - start;
    if (remaining <= 0) return 0;
    var list = document.getElementById("news-list");
    var probe = document.createElement("ul");
    probe.className = "news-list-probe";
    probe.style.cssText = "position:absolute;visibility:hidden;left:-9999px;top:0;list-style:none;margin:0;padding:0;width:" +
      Math.max(list ? list.clientWidth : 320, 200) + "px";
    document.body.appendChild(probe);
    function heightFor(n) {
      probe.innerHTML = items.slice(start, start + n).map(function (item) {
        return itemMarkup(item, true);
      }).join("") + pagerMarkup(false, false);
      return probe.offsetHeight;
    }
    var lo = 1;
    var hi = remaining;
    var best = 1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (heightFor(mid) <= budget) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    probe.remove();
    return best;
  }

  function pageSlice(items, start) {
    var rest = items.length - start;
    if (rest <= 0) return { start: start, count: 0, hasPrev: start > 0, hasNext: false };
    var budget = listBudget();
    var n = countFit(items, start, budget);
    if (n < 1) n = 1;
    if (start + n > items.length) n = rest;
    return { start: start, count: n, hasPrev: start > 0, hasNext: start + n < items.length };
  }

  function jumpToItemPage(items, id) {
    var index = -1;
    items.forEach(function (item, i) {
      if (item.id === id) index = i;
    });
    if (index < 0) return;
    if (index >= pageStart && index < pageStart + Math.max(pageCount, 1)) return;
    var start = 0;
    while (start < items.length) {
      var slice = pageSlice(items, start);
      var n = slice.count || 1;
      if (index < start + n) {
        pageStart = start;
        return;
      }
      start += n;
    }
    pageStart = index;
  }

  function previousPageStart(items, currentStart) {
    if (currentStart <= 0) return 0;
    var start = 0;
    var prev = 0;
    while (start < currentStart) {
      var n = pageSlice(items, start).count || 1;
      if (start + n >= currentStart) return start;
      prev = start;
      start += n;
    }
    return prev;
  }

  function renderList(data) {
    var root = document.getElementById("news-list");
    var items = visibleItems(data);
    if (!items.length) {
      var searchNode = document.getElementById("news-search");
      var query = searchNode ? searchNode.value : "";
      pageStart = 0;
      pageCount = 0;
      root.innerHTML = (query.trim()
        ? '<li class="empty">No submitted news matches that search.</li>'
        : '<li class="empty">No news yet. Upload a PDF, Word, or text file to add an item.</li>') +
        pagerMarkup(false, false);
      if (newsMap) newsMap.showItems([]);
      renderTimeline([]);
      return;
    }
    if (pageStart >= items.length) pageStart = 0;
    var slice = pageSlice(items, pageStart);
    pageCount = slice.count;
    var pageItems = items.slice(slice.start, slice.start + slice.count);
    root.innerHTML = pageItems.map(itemMarkup).join("") + pagerMarkup(slice.hasPrev, slice.hasNext);
    if (newsMap) {
      newsMap.showItems(items);
      newsMap.invalidate();
      if (selectedId && !items.some(function (item) { return item.id === selectedId; })) {
        selectedId = "";
      }
    }
    renderTimeline(items);
  }

  function setStatus(message, isError) {
    var node = document.getElementById("upload-status");
    node.hidden = !message;
    node.textContent = message || "";
    node.classList.toggle("is-error", !!isError);
  }

  function postDraft(form) {
    var fileInput = form.querySelector('input[type="file"]');
    var payload = new FormData();
    if (fileInput && fileInput.files.length) {
      payload.append("file", fileInput.files[0]);
    }
    var link = form.querySelector('[name="sourceUrl"]');
    if (link && link.value.trim()) payload.append("sourceUrl", link.value.trim());
    if (!payload.has("file") && !payload.has("sourceUrl")) {
      return Promise.reject(new Error("Choose a file first."));
    }
    return fetch("/api/draft", { method: "POST", body: payload }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.error || "Upload failed.");
        return body;
      });
    });
  }

  var lastData = { items: [] };

  function completeActionItem(itemId) {
    var match = (lastData.items || []).filter(function (entry) {
      return entry.id === itemId;
    })[0];
    if (match) match.actionItem = "";
    return fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId, actionItem: "" })
    }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.error || "Could not mark that action item done.");
        if (body.item) {
          (lastData.items || []).forEach(function (entry, index) {
            if (entry.id === body.item.id) lastData.items[index] = body.item;
          });
        }
        return body;
      });
    });
  }

  function saveItemGeometry(itemId, geometry, locationType) {
    var match = (lastData.items || []).filter(function (entry) {
      return entry.id === itemId;
    })[0];
    if (match) {
      match.geometry = geometry;
      match.locationType = locationType;
    }
    return fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: itemId,
        geometry: geometry,
        locationType: locationType
      })
    }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.error || "Could not save that location.");
        if (body.item) {
          (lastData.items || []).forEach(function (entry, index) {
            if (entry.id === body.item.id) lastData.items[index] = body.item;
          });
          var li = document.querySelector('.news-item[data-id="' + itemId + '"]');
          if (li) li.classList.toggle("is-on-map", !!body.item.geometry);
        }
        refreshUndoButton();
        return body;
      });
    });
  }

  function openNewsItem(id, fromMap) {
    selectedId = id || "";
    if (fromMap && lastData) {
      var before = pageStart;
      jumpToItemPage(visibleItems(lastData), selectedId);
      if (pageStart !== before) renderList(lastData);
    }
    document.querySelectorAll("#news-list .news-item").forEach(function (li) {
      var match = li.getAttribute("data-id") === selectedId;
      li.classList.toggle("is-selected", match);
      if (fromMap) {
        var details = li.querySelector("details");
        if (details) details.open = match;
      }
    });
    document.querySelectorAll(".timeline-mark").forEach(function (mark) {
      mark.classList.toggle("is-selected", mark.getAttribute("data-id") === selectedId);
    });
    if (fromMap && selectedId) {
      var node = document.querySelector('.news-item[data-id="' + selectedId + '"]');
      if (node) node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function loadAndRender() {
    return fetch("data/news.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load news.");
        return response.json();
      })
      .then(function (data) {
        lastData = data;
        renderList(data);
        return refreshUndoButton();
      })
      .catch(function () {
        if (window.EWA_DP_DATA) {
          lastData = window.EWA_DP_DATA;
          renderList(window.EWA_DP_DATA);
          setStatus("Upload needs the team link (the News Room server), not a saved HTML file.", true);
        } else {
          document.getElementById("news-list").innerHTML = '<li class="empty">Could not load news.</li>';
        }
      });
  }

  function openDraft(body) {
    if (!body || !body.draftId) throw new Error("Upload did not return a review page.");
    window.location.href = "entry.html?draft=" + encodeURIComponent(body.draftId);
  }

  function formatToday() {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  function startTodayDate() {
    var node = document.getElementById("today-date");
    if (!node) return;
    function tick() {
      node.textContent = formatToday();
    }
    tick();
    window.setInterval(tick, 30000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) tick();
    });
  }

  function setUndoRemaining(count) {
    var button = document.getElementById("undo-board");
    if (!button) return;
    var remaining = Number(count) || 0;
    button.disabled = remaining < 1;
    button.setAttribute("data-remaining", String(remaining));
  }

  function refreshUndoButton() {
    if (isHostedView()) return Promise.resolve();
    return fetch("/api/undo-status", { cache: "no-store" })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body.error || "Could not check undo history.");
          setUndoRemaining(body.remaining);
          return body;
        });
      })
      .catch(function () {
        setUndoRemaining(0);
      });
  }

  function bindUploads() {
    document.getElementById("upload-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      setStatus("Reading document…");
      postDraft(form)
        .then(openDraft)
        .catch(function (error) {
          setStatus(error.message || "Upload failed.", true);
        });
    });
    document.getElementById("news-list").addEventListener("mousedown", function (event) {
      if (event.target.closest(".action-done-label, .action-done, .action-flag-tip")) {
        event.preventDefault();
      }
    });
    document.getElementById("news-list").addEventListener("click", function (event) {
      var doneBox = event.target.closest(".action-done-label");
      if (doneBox) {
        event.preventDefault();
        event.stopPropagation();
        var itemId = doneBox.getAttribute("data-id") || "";
        if (!itemId) return;
        completeActionItem(itemId)
          .then(function () {
            setStatus("Action item marked done.");
            return loadAndRender();
          })
          .catch(function (error) {
            setStatus(error.message || "Could not mark that action item done.", true);
          });
        return;
      }
      var nextPage = event.target.closest(".page-next");
      if (nextPage) {
        event.preventDefault();
        if (nextPage.disabled) return;
        pageStart = pageStart + Math.max(pageCount, 1);
        renderList(lastData);
        return;
      }
      var prevPage = event.target.closest(".page-prev");
      if (prevPage) {
        event.preventDefault();
        if (prevPage.disabled) return;
        pageStart = previousPageStart(visibleItems(lastData), pageStart);
        renderList(lastData);
        return;
      }
      var deleteBtn = event.target.closest(".delete-btn");
      if (deleteBtn) {
        if (!window.confirm("Delete this post? This cannot be undone.")) return;
        fetch("/api/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: deleteBtn.getAttribute("data-id") })
        })
          .then(function (response) {
            return response.json().then(function (body) {
              if (!response.ok) throw new Error(body.error || "Could not delete that post.");
              return body;
            });
          })
          .then(function () {
            setStatus("Post deleted.");
            return loadAndRender();
          })
          .catch(function (error) {
            setStatus(error.message || "Could not delete that post.", true);
          });
        return;
      }
      var button = event.target.closest(".archive-btn");
      if (!button) return;
      fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: button.getAttribute("data-id"),
          archived: button.getAttribute("data-archived") === "1"
        })
      })
        .then(function (response) {
          return response.json().then(function (body) {
            if (!response.ok) throw new Error(body.error || "Could not update archive.");
            return body;
          });
        })
        .then(function () {
          return loadAndRender();
        })
        .catch(function (error) {
          setStatus(error.message || "Could not update archive.", true);
        });
    });
    var timelineRoot = document.getElementById("news-timeline");
    if (timelineRoot) {
      timelineRoot.addEventListener("click", function (event) {
        var mark = event.target.closest(".timeline-mark");
        if (!mark) return;
        var itemId = mark.getAttribute("data-id") || "";
        if (!itemId) return;
        openNewsItem(itemId, true);
        if (newsMap) newsMap.select(itemId, true);
      });
    }
    document.getElementById("show-archived").addEventListener("change", function () {
      pageStart = 0;
      renderList(lastData);
    });
    var saveBoard = document.getElementById("save-board");
    if (saveBoard) {
      saveBoard.addEventListener("click", function () {
        saveBoard.disabled = true;
        fetch("/api/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lastData)
        })
          .then(function (response) {
            return response.json().then(function (body) {
              if (!response.ok) throw new Error(body.error || "Could not save.");
              return body;
            });
          })
          .then(function (body) {
            setUndoRemaining(body.remaining);
            setStatus("Saved.");
          })
          .catch(function (error) {
            setStatus(error.message || "Could not save.", true);
          })
          .then(function () {
            saveBoard.disabled = false;
          });
      });
    }
    var undoBoard = document.getElementById("undo-board");
    if (undoBoard) {
      undoBoard.addEventListener("click", function () {
        if (undoBoard.disabled) return;
        undoBoard.disabled = true;
        fetch("/api/undo", { method: "POST" })
          .then(function (response) {
            return response.json().then(function (body) {
              if (!response.ok) throw new Error(body.error || "Could not reverse that step.");
              return body;
            });
          })
          .then(function (body) {
            setUndoRemaining(body.remaining);
            setStatus("Reversed the last step.");
            return loadAndRender();
          })
          .catch(function (error) {
            setStatus(error.message || "Could not reverse that step.", true);
            return refreshUndoButton();
          });
      });
    }
    var searchBox = document.getElementById("news-search");
    if (searchBox) {
      searchBox.addEventListener("input", function () {
        pageStart = 0;
        renderList(lastData);
      });
    }
    document.getElementById("news-list").addEventListener("toggle", function (event) {
      var details = event.target;
      if (!details || details.tagName !== "DETAILS" || !details.open) return;
      var li = details.closest(".news-item");
      if (!li) return;
      selectedId = li.getAttribute("data-id") || "";
      openNewsItem(selectedId, false);
      if (newsMap) newsMap.select(selectedId, false);
    }, true);
    if (globalThis.EwaNewsMap) {
      newsMap = EwaNewsMap.mount({
        container: "news-map",
        hint: "map-hint",
        redraw: "map-redraw",
        edit: "map-edit",
        done: "map-done",
        addPoint: "map-add-point",
        removePoint: "map-remove-point",
        finish: "map-finish",
        save: "map-save",
        typeSelect: "map-location-type",
        persist: isHostedView() ? undefined : saveItemGeometry,
        onSelect: function (id, fromMap) {
          openNewsItem(id, fromMap);
        }
      });
      window.addEventListener("resize", function () {
        if (newsMap) newsMap.invalidate();
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
          renderList(lastData);
        }, 150);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (isHostedView()) document.body.classList.add("is-hosted-view");
    startTodayDate();
    bindUploads();
    loadAndRender().then(function () {
      window.setTimeout(function () {
        renderList(lastData);
      }, 120);
    });
    if (params().get("saved") === "1") {
      setStatus("Saved to the News Room.");
      history.replaceState({}, "", "index.html");
    }
  });
})();
