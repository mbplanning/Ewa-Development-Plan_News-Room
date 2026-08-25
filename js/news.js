(function () {
  function params() {
    return new URLSearchParams(window.location.search);
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
            timeline: "",
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
      item.timeline,
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

  var selectedId = "";
  var newsMap = null;

  function renderList(data) {
    var root = document.getElementById("news-list");
    var items = visibleItems(data);
    if (!items.length) {
      var searchNode = document.getElementById("news-search");
      var query = searchNode ? searchNode.value : "";
      root.innerHTML = query.trim()
        ? '<li class="empty">No submitted news matches that search.</li>'
        : '<li class="empty">No news yet. Upload a PDF, Word, or text file to add an item.</li>';
      if (newsMap) newsMap.showItems([]);
      return;
    }
    root.innerHTML = items.map(function (item) {
      var place = item.place || "";
      if (locationLabel(item) && place) place = locationLabel(item) + " · " + place;
      else if (locationLabel(item)) place = locationLabel(item);
      var archived = item.archived ? '<span class="archived-tag">Archived</span>' : "";
      var onMap = item.geometry ? " is-on-map" : "";
      var open = item.id === selectedId ? " open" : "";
      return (
        '<li class="news-item' + (item.archived ? " is-archived" : "") + onMap + '" data-id="' + escapeHtml(item.id) + '">' +
          "<details" + open + ">" +
            "<summary>" +
              actionFlag(item) +
              "<span>" +
                '<span class="headline">' + escapeHtml(item.headline) + "</span>" +
                archived +
                "<time>" + escapeHtml(formatDate(item.date)) + "</time>" +
              "</span>" +
            "</summary>" +
            '<div class="body">' +
              '<dl class="item-fields">' +
                fieldRow("Summary", item.summary) +
                fieldRow("Location", place) +
                fieldRow("Source", item.source) +
                fieldRow("Timeline", item.timeline) +
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
    }).join("");
    if (newsMap) {
      newsMap.showItems(items);
      newsMap.invalidate();
      if (selectedId && !items.some(function (item) { return item.id === selectedId; })) {
        selectedId = "";
      }
    }
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
    document.querySelectorAll("#news-list .news-item").forEach(function (li) {
      var match = li.getAttribute("data-id") === selectedId;
      li.classList.toggle("is-selected", match);
      if (fromMap) {
        var details = li.querySelector("details");
        if (details) details.open = match;
      }
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
    document.getElementById("show-archived").addEventListener("change", function () {
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
        persist: saveItemGeometry,
        onSelect: function (id, fromMap) {
          openNewsItem(id, fromMap);
        }
      });
      window.addEventListener("resize", function () {
        if (newsMap) newsMap.invalidate();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    startTodayDate();
    bindUploads();
    loadAndRender();
    if (params().get("saved") === "1") {
      setStatus("Saved to the News Room.");
      history.replaceState({}, "", "index.html");
    }
  });
})();
