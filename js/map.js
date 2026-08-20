const MapView = (function () {
  let map;
  let layerGroup;
  let featureIndex = {};

  function init() {
    const holder = document.getElementById("map");
    if (typeof L === "undefined") {
      holder.innerHTML = '<p class="empty">Map library did not load. Refresh the page or open index.html from this folder.</p>';
      return;
    }
    map = L.map(holder, {
      scrollWheelZoom: true,
      zoomControl: true
    }).setView([21.35, -158.05], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }).addTo(map);
    layerGroup = L.layerGroup().addTo(map);
    renderLegend();
    invalidate();
  }

  function renderLegend() {
    const legend = document.getElementById("map-legend");
    legend.innerHTML =
      "<details>" +
        "<summary>Legend</summary>" +
        '<div class="legend-body">' +
          TOPICS.map((topic) =>
            '<div class="legend-row"><span class="swatch" style="background:' + topicColor(topic) + '"></span>' +
            escapeHtml(TOPIC_META[topic].short) + "</div>"
          ).join("") +
          '<div class="legend-row"><span class="swatch line" style="background:#3d6b8a"></span>Corridor / line</div>' +
          '<div class="legend-row"><span class="swatch area" style="background:#0f6a64"></span>Area (approximate)</div>' +
          '<p class="muted legend-note">Locations are approximate unless a source supports more precision. The dashed outline is the approximate ʻEwa DP area.</p>' +
        "</div>" +
      "</details>";
    if (typeof L !== "undefined" && L.DomEvent) {
      L.DomEvent.disableClickPropagation(legend);
      L.DomEvent.disableScrollPropagation(legend);
    }
  }

  function markerHtml(color, selected) {
    const size = selected ? 18 : 14;
    return L.divIcon({
      className: "map-pin",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: '<div style="width:' + size + "px;height:" + size + "px;border-radius:50%;background:" + color +
        ";border:2px solid white;box-shadow:0 0 0 " + (selected ? "3px " + color : "1px rgba(0,0,0,.25)") + '"></div>'
    });
  }

  function addPlanArea(planArea) {
    if (!planArea || !planArea.coordinates) return;
    L.polygon(planArea.coordinates, {
      color: "#0f6a64",
      weight: 2,
      dashArray: "6 6",
      fillColor: "#0f6a64",
      fillOpacity: 0.05,
      interactive: false
    }).addTo(layerGroup);
  }

  function invalidate() {
    if (map) setTimeout(function () { map.invalidateSize(); }, 80);
  }

  function render(projects, selectedId, planArea, onSelect, shouldFit) {
    if (!map || !layerGroup) return;
    layerGroup.clearLayers();
    featureIndex = {};
    addPlanArea(planArea);
    const bounds = [];

    projects.forEach((project) => {
      const color = topicColor(primaryTopic(project));
      const selected = project.id === selectedId;
      (project.map && project.map.features || []).forEach((feature) => {
        let layer;
        const title = (feature.label || project.name) + (feature.precision === "approximate" ? " · Approximate" : "");
        if (feature.type === "point") {
          layer = L.marker(feature.coordinates, { icon: markerHtml(color, selected), riseOnHover: true });
          bounds.push(feature.coordinates);
        } else if (feature.type === "line") {
          layer = L.polyline(feature.coordinates, {
            color: color,
            weight: selected ? 6 : 4,
            opacity: 0.9
          });
          feature.coordinates.forEach((coord) => bounds.push(coord));
        } else if (feature.type === "polygon") {
          layer = L.polygon(feature.coordinates, {
            color: color,
            weight: selected ? 3 : 2,
            fillColor: color,
            fillOpacity: selected ? 0.28 : 0.16
          });
          feature.coordinates.forEach((coord) => bounds.push(coord));
        }
        if (!layer) return;
        layer.bindTooltip(title);
        layer.on("click", () => onSelect(project.id));
        layer.addTo(layerGroup);
        if (!featureIndex[project.id]) featureIndex[project.id] = [];
        featureIndex[project.id].push(layer);
      });
    });

    if (shouldFit !== false && selectedId && featureIndex[selectedId]) {
      map.fitBounds(L.featureGroup(featureIndex[selectedId]).getBounds().pad(0.45));
    } else if (shouldFit !== false && bounds.length) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.12));
    } else if (!bounds.length) {
      map.setView([21.35, -158.05], 12);
    }
    invalidate();
  }

  function focus(projectId) {
    const layers = featureIndex[projectId];
    if (!layers || !layers.length) return false;
    map.fitBounds(L.featureGroup(layers).getBounds().pad(0.45));
    return true;
  }

  return { init, render, focus, invalidate };
})();
