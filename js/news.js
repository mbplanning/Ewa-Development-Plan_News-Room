(function () {
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

  function newsItems(data) {
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
            source: source ? (source.organization || source.title || "") : ""
          });
        });
      });
    }
    items.sort(function (a, b) {
      return parseDate(b.date) - parseDate(a.date);
    });
    return items;
  }

  function renderList(data) {
    var root = document.getElementById("news-list");
    var items = newsItems(data);
    if (!items.length) {
      root.innerHTML = '<li class="empty">No news yet. Upload a PDF, Word, or text file to add an item.</li>';
      return;
    }
    root.innerHTML = items.map(function (item) {
      var meta = [item.place, item.source].filter(Boolean).join(" · ");
      return (
        '<li class="news-item">' +
          "<details>" +
            "<summary>" +
              "<span>" +
                '<span class="headline">' + escapeHtml(item.headline) + "</span>" +
                "<time>" + escapeHtml(formatDate(item.date)) + "</time>" +
              "</span>" +
            "</summary>" +
            '<div class="body">' +
              "<p>" + escapeHtml(item.summary) + "</p>" +
              (meta ? '<p class="meta">' + escapeHtml(meta) + "</p>" : "") +
              '<form class="item-upload" data-related="' + escapeHtml(item.headline) + '">' +
                '<input type="file" name="file" accept=".pdf,.docx,.txt,.md,.text" required>' +
                '<button type="submit">Upload</button>' +
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

  function postFile(form) {
    var fileInput = form.querySelector('input[type="file"]');
    if (!fileInput || !fileInput.files.length) {
      return Promise.reject(new Error("Choose a file first."));
    }
    var payload = new FormData();
    payload.append("file", fileInput.files[0]);
    var headline = form.querySelector('[name="headline"]');
    if (headline && headline.value.trim()) payload.append("headline", headline.value.trim());
    var related = form.getAttribute("data-related");
    if (related) payload.append("note", "Related to: " + related);
    return fetch("/api/news", { method: "POST", body: payload }).then(function (response) {
      return response.json().then(function (body) {
        if (!response.ok) throw new Error(body.error || "Upload failed.");
        return body;
      });
    });
  }

  function loadAndRender() {
    return fetch("data/news.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load news.");
        return response.json();
      })
      .then(renderList)
      .catch(function () {
        if (window.EWA_DP_DATA) {
          renderList(window.EWA_DP_DATA);
          setStatus("Upload needs the team link (the News Room server), not a saved HTML file.", true);
        } else {
          document.getElementById("news-list").innerHTML = '<li class="empty">Could not load news.</li>';
        }
      });
  }

  function bindUploads() {
    document.getElementById("upload-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      setStatus("Uploading…");
      postFile(form)
        .then(function () {
          form.reset();
          setStatus("Added. It appears at the top of the list.");
          return loadAndRender();
        })
        .catch(function (error) {
          setStatus(error.message || "Upload failed.", true);
        });
    });
    document.getElementById("news-list").addEventListener("submit", function (event) {
      var form = event.target.closest(".item-upload");
      if (!form) return;
      event.preventDefault();
      postFile(form)
        .then(function () {
          setStatus("Added a related item at the top of the list.");
          return loadAndRender();
        })
        .catch(function (error) {
          setStatus(error.message || "Upload failed.", true);
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindUploads();
    loadAndRender();
  });
})();
