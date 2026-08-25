(function (global) {
  var EWA_CENTER = [21.337, -158.035];
  var EWA_ZOOM = 13;
  var NAVY = "#2b3990";
  var PEACH = "#f5a26f";

  function bounds() {
    return L.latLngBounds([21.25, -158.18], [21.41, -157.95]);
  }

  function typeForGeometry(geometry) {
    var kind = geometry && geometry.type;
    if (kind === "Point") return "point";
    if (kind === "LineString") return "road";
    if (kind === "Polygon") return "region";
    return "";
  }

  function geometryTypeFor(locationType) {
    if (locationType === "point") return "Point";
    if (locationType === "road") return "LineString";
    if (locationType === "region") return "Polygon";
    return "";
  }

  function latlngsFromGeometry(geometry) {
    if (!geometry || !geometry.coordinates) return [];
    if (geometry.type === "Point") {
      var point = geometry.coordinates;
      return [L.latLng(point[1], point[0])];
    }
    if (geometry.type === "LineString") {
      return geometry.coordinates.map(function (pair) {
        return L.latLng(pair[1], pair[0]);
      });
    }
    if (geometry.type === "Polygon") {
      var ring = geometry.coordinates[0] || [];
      var latlngs = ring.map(function (pair) {
        return L.latLng(pair[1], pair[0]);
      });
      if (latlngs.length > 1) {
        var first = latlngs[0];
        var last = latlngs[latlngs.length - 1];
        if (first.equals(last)) latlngs.pop();
      }
      return latlngs;
    }
    return [];
  }

  function geometryFromLatLngs(locationType, latlngs) {
    if (!latlngs.length) return null;
    if (locationType === "point") {
      return {
        type: "Point",
        coordinates: [latlngs[0].lng, latlngs[0].lat],
        approximate: false,
        manual: true
      };
    }
    if (locationType === "road") {
      if (latlngs.length < 2) return null;
      return {
        type: "LineString",
        coordinates: latlngs.map(function (ll) { return [ll.lng, ll.lat]; }),
        approximate: false,
        manual: true
      };
    }
    if (locationType === "region") {
      if (latlngs.length < 3) return null;
      var ring = latlngs.map(function (ll) { return [ll.lng, ll.lat]; });
      ring.push(ring[0]);
      return {
        type: "Polygon",
        coordinates: [ring],
        approximate: false,
        manual: true
      };
    }
    return null;
  }

  function dotIcon(active) {
    return L.divIcon({
      className: "map-dot" + (active ? " is-active" : ""),
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
  }

  function vertexIcon() {
    return L.divIcon({
      className: "map-vertex",
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }

  function midIcon() {
    return L.divIcon({
      className: "map-midpoint",
      iconSize: [9, 9],
      iconAnchor: [5, 5]
    });
  }

  function pathStyle(kind, active) {
    if (kind === "road") {
      return { color: active ? PEACH : NAVY, weight: active ? 7 : 5, opacity: 0.95, lineCap: "round", lineJoin: "round" };
    }
    return {
      color: active ? PEACH : NAVY,
      weight: 2,
      fillColor: active ? PEACH : NAVY,
      fillOpacity: active ? 0.28 : 0.16
    };
  }

  function el(id) {
    return id ? document.getElementById(id) : null;
  }

  function mount(options) {
    options = options || {};
    if (!global.L || !el(options.container)) {
      return {
        showItems: function () {},
        select: function () {},
        selectedId: function () { return ""; },
        getGeometry: function () { return null; },
        setItem: function () {},
        invalidate: function () {}
      };
    }
    var map = L.map(options.container, {
      center: EWA_CENTER,
      zoom: EWA_ZOOM,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: bounds().pad(0.2),
      maxBoundsViscosity: 0.75
    });
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles © Esri",
      maxZoom: 18
    }).addTo(map);

    var featureGroup = L.layerGroup().addTo(map);
    var vertexGroup = L.layerGroup().addTo(map);
    var itemsById = {};
    var selectedId = "";
    var drawing = false;
    var editing = false;
    var draftLatLngs = [];
    var draftLayer = null;
    var persistTimer = 0;
    var vertexMode = "";

    function hint(message) {
      var node = el(options.hint);
      if (node) node.textContent = message || "";
    }

    function selectedItem() {
      return itemsById[selectedId] || null;
    }

    function locationType() {
      var select = el(options.typeSelect);
      if (select && select.value) return select.value;
      var item = selectedItem();
      return item ? (item.locationType || typeForGeometry(item.geometry) || "") : "";
    }

    function setTypeSelect(value) {
      var select = el(options.typeSelect);
      if (select && select.value !== value) select.value = value || "";
    }

    function updateButtons() {
      var item = selectedItem();
      var kind = locationType();
      var hasMark = !!(item && item.geometry && latlngsFromGeometry(item.geometry).length);
      var canPoints = hasMark && kind !== "point";
      var redraw = el(options.redraw);
      var finish = el(options.finish);
      var save = el(options.save);
      var edit = el(options.edit);
      var done = el(options.done);
      var addBtn = el(options.addPoint);
      var removeBtn = el(options.removePoint);
      if (redraw) redraw.disabled = !item || !kind;
      if (finish) {
        finish.hidden = false;
        finish.disabled = !drawing || kind === "point";
        finish.classList.toggle("is-editing", drawing && kind !== "point");
      }
      if (save) save.disabled = !item;
      if (done) {
        done.disabled = (!editing && !drawing) || (drawing && kind === "point");
        done.classList.toggle("is-editing", false);
      }
      if (edit) {
        edit.disabled = !hasMark || drawing;
        edit.classList.toggle("is-editing", editing && vertexMode === "edit");
      }
      if (addBtn) {
        addBtn.disabled = !canPoints || drawing;
        addBtn.hidden = false;
        addBtn.classList.toggle("is-editing", vertexMode === "add");
      }
      if (removeBtn) {
        removeBtn.disabled = !canPoints || drawing;
        removeBtn.hidden = false;
        removeBtn.classList.toggle("is-editing", vertexMode === "remove");
      }
    }

    function bindSelect(layer, item) {
      layer.on("click", function (event) {
        L.DomEvent.stop(event);
        if (drawing) {
          draftLatLngs.push(event.latlng);
          if (locationType() === "point") {
            drawing = false;
            map.doubleClickZoom.enable();
            saveLatLngs(draftLatLngs, true);
          } else {
            refreshDraftPreview(draftLatLngs, false);
            updateButtons();
          }
          return;
        }
        if (editing && vertexMode === "add" && item.id === selectedId) {
          addAnchor(event.latlng);
          return;
        }
        if (item.id === selectedId) return;
        select(item.id, true);
      });
      if (item.headline || item.place) {
        layer.bindTooltip(item.headline || item.place, { sticky: true, direction: "top", opacity: 0.95 });
      }
    }

    function resolvedItem(item) {
      if (global.EwaPlaces && EwaPlaces.applyToItem) EwaPlaces.applyToItem(item);
      return item;
    }

    function featureLayer(item, active) {
      var latlngs = latlngsFromGeometry(item.geometry);
      if (!latlngs.length) return null;
      var kind = item.locationType || typeForGeometry(item.geometry);
      var layer;
      if (kind === "point") {
        layer = L.marker(latlngs[0], { icon: dotIcon(active), draggable: !!(active && editing && vertexMode === "edit"), keyboard: true });
        bindSelect(layer, item);
        if (active) {
          layer.on("dragend", function () {
            saveLatLngs([layer.getLatLng()], true);
          });
        }
        return layer;
      }
      if (kind === "road") {
        var line = L.polyline(latlngs, pathStyle("road", active));
        var hit = L.polyline(latlngs, {
          color: "#000000",
          weight: 18,
          opacity: 0,
          interactive: true,
          bubblingMouseEvents: false
        });
        bindSelect(line, item);
        bindSelect(hit, item);
        layer = L.layerGroup([hit, line]);
        layer.newsId = item.id;
        return layer;
      }
      layer = L.polygon(latlngs, pathStyle("region", active));
      bindSelect(layer, item);
      layer.newsId = item.id;
      return layer;
    }

    function clearVertices() {
      vertexGroup.clearLayers();
    }

    function currentLatLngs() {
      var item = selectedItem();
      return item ? latlngsFromGeometry(item.geometry).slice() : [];
    }

    function minAnchors(kind) {
      return kind === "region" ? 3 : 2;
    }

    function insertOnNearest(latlngs, latlng, closed) {
      if (!latlngs.length) {
        latlngs.push(latlng);
        return latlngs;
      }
      var mapPoint = map.latLngToLayerPoint(latlng);
      var bestI = 0;
      var bestDist = Infinity;
      var bestPt = latlng;
      var n = latlngs.length;
      var segs = closed ? n : Math.max(n - 1, 0);
      if (!segs) {
        latlngs.push(latlng);
        return latlngs;
      }
      for (var i = 0; i < segs; i++) {
        var a = map.latLngToLayerPoint(latlngs[i]);
        var b = map.latLngToLayerPoint(latlngs[(i + 1) % n]);
        var dist = L.LineUtil.pointToSegmentDistance(mapPoint, a, b);
        if (dist < bestDist) {
          bestDist = dist;
          bestI = i;
          bestPt = map.layerPointToLatLng(L.LineUtil.closestPointOnSegment(mapPoint, a, b));
        }
      }
      latlngs.splice(bestI + 1, 0, bestPt);
      return latlngs;
    }

    function addAnchor(latlng) {
      var kind = locationType();
      if (kind === "point") return;
      var latlngs = insertOnNearest(currentLatLngs(), latlng, kind === "region");
      saveLatLngs(latlngs, true);
      hint("Anchor added. Drag it to adjust, or click Add point to place another.");
    }

    function removeAnchor(index) {
      var kind = locationType();
      var latlngs = currentLatLngs();
      var min = minAnchors(kind);
      if (latlngs.length <= min) {
        hint("Keep at least " + min + " anchors for this mark.");
        return;
      }
      latlngs.splice(index, 1);
      saveLatLngs(latlngs, true);
      hint("Anchor removed. Click another to remove it, or click Remove point to turn that off.");
    }

    function setVertexMode(mode) {
      if (mode && !editing) {
        enterEdit(mode);
        return;
      }
      vertexMode = vertexMode === mode ? "edit" : mode;
      if (!vertexMode) vertexMode = "edit";
      redrawFeatures();
      updateButtons();
      if (vertexMode === "add") hint("Click the line or shape to add an anchor.");
      else if (vertexMode === "remove") hint("Click an orange anchor to remove it.");
      else hint("Drag orange anchors to move them. Click Done when finished.");
    }

    function enterEdit(mode) {
      var item = selectedItem();
      if (!item || !item.geometry || !latlngsFromGeometry(item.geometry).length) {
        hint("Place a mark first, then click Edit point to adjust it.");
        return;
      }
      drawing = false;
      editing = true;
      vertexMode = mode || "edit";
      map.doubleClickZoom.enable();
      redrawFeatures();
      updateButtons();
      if (locationType() === "point") hint("Drag the dot, then click Done.");
      else if (vertexMode === "add") hint("Click the line or shape to add an anchor.");
      else if (vertexMode === "remove") hint("Click an orange anchor to remove it.");
      else hint("Drag orange anchors to move them. Click Done when finished.");
    }

    function finishEdit() {
      var item = selectedItem();
      if (!editing) return;
      editing = false;
      vertexMode = "";
      redrawFeatures();
      updateButtons();
      if (item && item.geometry && typeof options.persist === "function") {
        saveGeometry(item.geometry, locationType(), "now");
      } else {
        hint("Edits are kept with this article.");
      }
    }

    function bindVertices(latlngs) {
      clearVertices();
      if (drawing) return;
      var kind = locationType();
      if (kind === "point") return;
      var closed = kind === "region";
      latlngs.forEach(function (ll, index) {
        var marker = L.marker(ll, { icon: vertexIcon(), draggable: vertexMode === "edit", zIndexOffset: 600 });
        marker.on("click", function (event) {
          L.DomEvent.stop(event);
          if (vertexMode === "remove") removeAnchor(index);
        });
        marker.on("dblclick", function (event) {
          L.DomEvent.stop(event);
          removeAnchor(index);
        });
        marker.on("drag", function () {
          latlngs[index] = marker.getLatLng();
          refreshDraftPreview(latlngs, false);
        });
        marker.on("dragend", function () {
          latlngs[index] = marker.getLatLng();
          saveLatLngs(latlngs, true);
        });
        vertexGroup.addLayer(marker);
      });
      var n = latlngs.length;
      if (vertexMode !== "add") return;
      var segs = closed ? n : n - 1;
      for (var i = 0; i < segs; i++) {
        (function (index) {
          var a = latlngs[index];
          var b = latlngs[(index + 1) % n];
          var mid = L.latLng((a.lat + b.lat) / 2, (a.lng + b.lng) / 2);
          var handle = L.marker(mid, { icon: midIcon(), draggable: true, zIndexOffset: 500 });
          handle.on("click", function (event) {
            L.DomEvent.stop(event);
            if (vertexMode === "remove") return;
            var next = currentLatLngs();
            next.splice(index + 1, 0, handle.getLatLng());
            saveLatLngs(next, true);
            hint("Anchor added. Drag it to adjust.");
          });
          handle.on("dragend", function () {
            var next = currentLatLngs();
            next.splice(index + 1, 0, handle.getLatLng());
            saveLatLngs(next, true);
          });
          vertexGroup.addLayer(handle);
        })(i);
      }
    }

    function refreshDraftPreview(latlngs, keepVertices) {
      if (draftLayer) {
        featureGroup.removeLayer(draftLayer);
        draftLayer = null;
      }
      var fake = {
        id: selectedId,
        locationType: locationType(),
        geometry: geometryFromLatLngs(locationType(), latlngs)
      };
      if (!fake.geometry) return;
      draftLayer = featureLayer(fake, true);
      if (draftLayer) featureGroup.addLayer(draftLayer);
      if (keepVertices) bindVertices(latlngs.slice());
    }

    function showItems(items, keepSelected) {
      itemsById = {};
      (items || []).forEach(function (item) {
        if (!item || !item.id) return;
        itemsById[item.id] = resolvedItem(item);
      });
      if (selectedId && !itemsById[selectedId]) {
        selectedId = "";
        drawing = false;
        editing = false;
        vertexMode = "";
        draftLatLngs = [];
      }
      redrawFeatures();
      updateButtons();
    }

    function redrawFeatures() {
      featureGroup.clearLayers();
      draftLayer = null;
      Object.keys(itemsById).forEach(function (id) {
        if (drawing && id === selectedId) return;
        var layer = featureLayer(itemsById[id], id === selectedId);
        if (layer) featureGroup.addLayer(layer);
      });
      if (drawing) {
        refreshDraftPreview(draftLatLngs, false);
      } else {
        var item = selectedItem();
        if (editing && item && item.geometry) {
          bindVertices(latlngsFromGeometry(item.geometry));
        } else {
          clearVertices();
        }
      }
    }

    function focusItem(item) {
      var latlngs = latlngsFromGeometry(item && item.geometry);
      if (!latlngs.length) return;
      if (latlngs.length === 1) {
        map.panTo(latlngs[0], { animate: true });
        return;
      }
      map.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], maxZoom: 15, animate: true });
    }

    function select(id, fromMap) {
      if (id !== selectedId) {
        editing = false;
        vertexMode = "";
        if (drawing) cancelDraw();
      }
      selectedId = id || "";
      var item = selectedItem();
      setTypeSelect(item ? (item.locationType || typeForGeometry(item.geometry) || "") : "");
      redrawFeatures();
      updateButtons();
      if (item) {
        focusItem(item);
        if (item.geometry) {
          hint((item.geometry.approximate ? "Approximate mark from the Location field. " : "") +
            "Use Edit point to move anchors, Add point or Remove point to change them, then Done.");
        } else if (locationType()) {
          hint("This article is not on the map yet. Click Redraw, then click the map.");
        } else {
          hint("Choose a location type, then click Redraw to place it on the map.");
        }
      } else {
        hint("Open a news item to move or redraw its location.");
      }
      if (typeof options.onSelect === "function") options.onSelect(selectedId, fromMap);
    }

    function cancelDraw() {
      drawing = false;
      draftLatLngs = [];
      map.doubleClickZoom.enable();
      redrawFeatures();
      updateButtons();
    }

    function startRedraw() {
      var item = selectedItem();
      var kind = locationType();
      if (!item || !kind) {
        hint("Choose whether this location is a dot, line, or shape before drawing.");
        return;
      }
      drawing = true;
      editing = false;
      vertexMode = "";
      draftLatLngs = [];
      map.doubleClickZoom.disable();
      clearVertices();
      redrawFeatures();
      updateButtons();
      if (kind === "point") hint("Click the map to place the dot.");
      else if (kind === "road") hint("Click to add points along the road. Click Finish when the line is done.");
      else hint("Click to outline the area. Click Finish when the shape is done.");
    }

    function drawnPoints() {
      var pts = draftLatLngs.slice();
      if (!pts.length && draftLayer) {
        if (draftLayer.eachLayer) {
          draftLayer.eachLayer(function (child) {
            if (pts.length) return;
            if (child.getLatLngs) {
              var raw = child.getLatLngs();
              pts = Array.isArray(raw[0]) ? raw[0].slice() : raw.slice();
            } else if (child.getLatLng) {
              pts = [child.getLatLng()];
            }
          });
        } else if (draftLayer.getLatLngs) {
          var raw = draftLayer.getLatLngs();
          pts = Array.isArray(raw[0]) ? raw[0].slice() : raw.slice();
        }
      }
      if (pts.length >= 2) {
        var last = pts[pts.length - 1];
        var prev = pts[pts.length - 2];
        if (last && prev && last.equals && last.equals(prev)) pts.pop();
      }
      return pts;
    }

    function finishDraw() {
      var kind = locationType();
      if (kind === "point") {
        hint("Click the map to place the dot.");
        return;
      }
      var pts = drawnPoints();
      var geom = geometryFromLatLngs(kind, pts);
      if (!geom) {
        hint(kind === "road" ? "Add at least two points, then click Finish." : "Add at least three points, then click Finish.");
        return;
      }
      drawing = false;
      map.doubleClickZoom.enable();
      saveGeometry(geom, kind, "now");
    }

    function finishCurrent(event) {
      if (event) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
      }
      if (drawing) finishDraw();
      else if (editing) finishEdit();
    }

    function saveLatLngs(latlngs, persistNow) {
      var kind = locationType();
      var geom = geometryFromLatLngs(kind, latlngs);
      if (!geom) return;
      saveGeometry(geom, kind, persistNow);
    }

    function applyGeometry(geometry, kind) {
      var item = selectedItem();
      if (!item) return;
      item.geometry = geometry;
      item.locationType = kind;
      setTypeSelect(kind);
      drawing = false;
      draftLatLngs = [];
      redrawFeatures();
      updateButtons();
    }

    function saveGeometry(geometry, kind, persistNow) {
      applyGeometry(geometry, kind);
      hint("Location linked to this article.");
      if (!persistNow || typeof options.persist !== "function") return;
      window.clearTimeout(persistTimer);
      persistTimer = window.setTimeout(function () {
        Promise.resolve(options.persist(selectedId, geometry, kind)).then(function () {
          hint("Location saved with this article.");
        }).catch(function (error) {
          hint(error.message || "Could not save that location.");
        });
      }, persistNow === "now" ? 0 : 200);
    }

    map.on("click", function (event) {
      if (editing) {
        if (vertexMode === "add" && locationType() !== "point") addAnchor(event.latlng);
        return;
      }
      if (!drawing) {
        var item = selectedItem();
        if (!(item && locationType() && !(item.geometry && latlngsFromGeometry(item.geometry).length))) {
          return;
        }
        startRedraw();
      }
      var kind = locationType();
      draftLatLngs.push(event.latlng);
      if (kind === "point") {
        drawing = false;
        map.doubleClickZoom.enable();
        saveLatLngs(draftLatLngs, true);
        return;
      }
      refreshDraftPreview(draftLatLngs, false);
      updateButtons();
    });

    map.on("dblclick", function (event) {
      if (!drawing) return;
      L.DomEvent.stop(event);
      finishDraw();
    });

    var toolbar = (el(options.finish) || el(options.redraw) || el(options.done));
    if (toolbar) {
      toolbar = toolbar.closest(".map-toolbar") || toolbar.parentNode;
      if (toolbar && L.DomEvent.disableClickPropagation) {
        L.DomEvent.disableClickPropagation(toolbar);
        L.DomEvent.disableScrollPropagation(toolbar);
      }
    }
    var redrawBtn = el(options.redraw);
    if (redrawBtn) {
      redrawBtn.addEventListener("click", function () {
        startRedraw();
      });
    }
    var doneBtn = el(options.done);
    if (doneBtn) {
      doneBtn.addEventListener("click", finishCurrent);
    }
    var finishBtn = el(options.finish);
    if (finishBtn) {
      finishBtn.addEventListener("click", finishCurrent);
    }
    var editBtn = el(options.edit);
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        if (editing) setVertexMode("edit");
        else enterEdit("edit");
      });
    }
    var addBtn = el(options.addPoint);
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        setVertexMode("add");
      });
    }
    var removeBtn = el(options.removePoint);
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        setVertexMode("remove");
      });
    }
    var saveBtn = el(options.save);
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var item = selectedItem();
        if (!item || !item.geometry) {
          hint("Draw a location before saving.");
          return;
        }
        saveGeometry(item.geometry, locationType(), "now");
      });
    }
    var typeSelect = el(options.typeSelect);
    if (typeSelect) {
      typeSelect.addEventListener("change", function () {
        var item = selectedItem();
        if (!item) return;
        var kind = typeSelect.value;
        var current = typeForGeometry(item.geometry);
        if (kind && current && kind !== current) {
          item.geometry = null;
          item.locationType = kind;
          startRedraw();
          return;
        }
        item.locationType = kind;
        updateButtons();
        if (!kind) hint("Choose a location type, then click Redraw.");
      });
    }

    window.setTimeout(function () {
      map.invalidateSize();
      map.setView(EWA_CENTER, EWA_ZOOM);
    }, 80);

    hint("Open a news item to move or redraw its location.");
    updateButtons();

    return {
      showItems: showItems,
      select: select,
      selectedId: function () { return selectedId; },
      getGeometry: function () {
        var item = selectedItem();
        return item ? item.geometry || null : null;
      },
      setItem: function (item) {
        if (!item || !item.id) return;
        showItems([item], true);
        select(item.id, false);
      },
      invalidate: function () {
        map.invalidateSize();
      }
    };
  }

  global.EwaNewsMap = {
    mount: mount,
    typeForGeometry: typeForGeometry
  };
})(window);
