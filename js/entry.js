(function () {
  function params() {
    return new URLSearchParams(window.location.search);
  }

  function setStatus(message, isError) {
    var node = document.getElementById("entry-status");
    node.hidden = !message;
    node.textContent = message || "";
    node.classList.toggle("is-error", !!isError);
  }

  function fillForm(item, extra) {
    extra = extra || {};
    document.getElementById("field-draftId").value = extra.draftId || "";
    document.getElementById("field-id").value = item.id || "";
    document.getElementById("field-sourceType").value = item.sourceType || "";
    document.getElementById("field-sourceFile").value = item.sourceFile || "";
    document.getElementById("field-headline").value = item.headline || "";
    document.getElementById("field-source").value = item.source || "";
    document.getElementById("field-place").value = item.place || "";
    document.getElementById("field-locationType").value = item.locationType || "";
    document.getElementById("field-summary").value = item.summary || "";
    document.getElementById("field-timeline").value = item.timeline || "";
    document.getElementById("field-governmentParties").value = item.governmentParties || "";
    document.getElementById("field-otherParties").value = item.otherParties || "";
    document.getElementById("field-sourceUrl").value = item.sourceUrl || "";
    document.getElementById("field-date").value = item.date || "";
    document.getElementById("field-archived").checked = !!item.archived;
    document.getElementById("field-documentText").value = item.documentText || extra.excerpt || "";
    if (extra.heading) {
      document.getElementById("entry-heading").textContent = extra.heading;
    }
  }

  function readForm() {
    var form = document.getElementById("entry-form");
    return {
      draftId: form.draftId.value,
      id: form.id.value,
      sourceType: form.sourceType.value,
      sourceFile: form.sourceFile.value,
      headline: form.headline.value.trim(),
      source: form.source.value.trim(),
      place: form.place.value.trim(),
      locationType: form.locationType.value,
      summary: form.summary.value.trim(),
      timeline: form.timeline.value.trim(),
      governmentParties: form.governmentParties.value.trim(),
      otherParties: form.otherParties.value.trim(),
      sourceUrl: form.sourceUrl.value.trim(),
      date: form.date.value,
      archived: form.archived.checked,
      documentText: form.documentText.value
    };
  }

  function loadDraft(draftId) {
    return fetch("/api/draft?id=" + encodeURIComponent(draftId), { cache: "no-store" })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body.error || "Could not open that upload.");
          return body;
        });
      })
      .then(function (body) {
        fillForm(body.item || {}, {
          draftId: body.draftId,
          excerpt: body.excerpt,
          heading: "Review news entry"
        });
        setStatus("Fields were filled from the document. Please check them before saving.");
      });
  }

  function loadExisting(itemId) {
    return fetch("data/news.json", { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load news.");
        return response.json();
      })
      .then(function (data) {
        var item = (data.items || []).filter(function (entry) {
          return entry.id === itemId;
        })[0];
        if (!item) throw new Error("That news item was not found.");
        fillForm(item, { heading: "Edit news entry" });
      });
  }

  document.getElementById("entry-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var payload = readForm();
    if (!payload.headline) {
      setStatus("Add a document title before saving.", true);
      return;
    }
    setStatus("Saving…");
    fetch("/api/news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body.error || "Save failed.");
          return body;
        });
      })
      .then(function () {
        window.location.href = "index.html?saved=1";
      })
      .catch(function (error) {
        setStatus(error.message || "Save failed.", true);
      });
  });

  var query = params();
  var draftId = query.get("draft");
  var itemId = query.get("id");
  if (draftId) {
    loadDraft(draftId).catch(function (error) {
      setStatus(error.message || "Could not open that upload.", true);
    });
  } else if (itemId) {
    loadExisting(itemId).catch(function (error) {
      setStatus(error.message || "Could not open that item.", true);
    });
  } else {
    setStatus("Upload a document from the News Room to start an entry.", true);
  }
})();
