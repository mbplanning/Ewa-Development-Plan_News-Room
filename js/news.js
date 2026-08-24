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

  function renderList(data) {
    var root = document.getElementById("news-list");
    var showArchived = document.getElementById("show-archived").checked;
    var items = newsItems(data, showArchived);
    if (!items.length) {
      root.innerHTML = '<li class="empty">No news yet. Upload a PDF, Word, or text file to add an item.</li>';
      return;
    }
    root.innerHTML = items.map(function (item) {
      var place = item.place || "";
      if (locationLabel(item) && place) place = locationLabel(item) + " · " + place;
      else if (locationLabel(item)) place = locationLabel(item);
      var archived = item.archived ? '<span class="archived-tag">Archived</span>' : "";
      return (
        '<li class="news-item' + (item.archived ? " is-archived" : "") + '">' +
          "<details>" +
            "<summary>" +
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
                fieldRow("Link", item.sourceUrl, true) +
              "</dl>" +
              '<div class="item-actions">' +
                '<a href="entry.html?id=' + encodeURIComponent(item.id) + '">Edit</a>' +
                '<button type="button" class="archive-btn" data-id="' + escapeHtml(item.id) + '" data-archived="' + (item.archived ? "0" : "1") + '">' +
                  (item.archived ? "Unarchive" : "Archive") +
                "</button>" +
              "</div>" +
              '<form class="item-upload" data-related="' + escapeHtml(item.headline) + '">' +
                '<input type="file" name="file" accept=".pdf,.docx,.txt,.md,.text" required>' +
                '<button type="submit">Upload related</button>' +
              "</form>" +
            "</div>" +
          "</details>" +
        "</li>"
      );
    }).join("");
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
    var related = form.getAttribute("data-related");
    if (related) payload.append("note", "Related to: " + related);
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

  function loadAndRender() {
    return fetch("data/news.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load news.");
        return response.json();
      })
      .then(function (data) {
        lastData = data;
        renderList(data);
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
    document.getElementById("news-list").addEventListener("submit", function (event) {
      var form = event.target.closest(".item-upload");
      if (!form) return;
      event.preventDefault();
      postDraft(form)
        .then(openDraft)
        .catch(function (error) {
          setStatus(error.message || "Upload failed.", true);
        });
    });
    document.getElementById("news-list").addEventListener("click", function (event) {
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
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindUploads();
    loadAndRender();
    if (params().get("saved") === "1") {
      setStatus("Saved to the News Room.");
      history.replaceState({}, "", "index.html");
    }
  });
})();
