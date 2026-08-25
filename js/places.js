(function (global) {
  function fold(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[ʻ‘’']/g, "'")
      .replace(/^(point \/ site|point|road|region)\s*[·•.\-]+\s*/, "")
      .replace(/[^a-z0-9'\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function point(lng, lat) {
    return { type: "Point", coordinates: [lng, lat], approximate: true };
  }

  function line(coords) {
    return { type: "LineString", coordinates: coords, approximate: true };
  }

  function shape(coords) {
    var ring = coords.slice();
    if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
      ring.push(ring[0]);
    }
    return { type: "Polygon", coordinates: [ring], approximate: true };
  }

  var PLACES = [
    {
      kind: "road",
      names: ["makakilo drive"],
      geometry: line([
        [-158.0874, 21.3367],
        [-158.0871, 21.3394],
        [-158.0868, 21.3426],
        [-158.0865, 21.3458],
        [-158.0859, 21.3488],
        [-158.0852, 21.3518],
        [-158.0844, 21.3548],
        [-158.0835, 21.3578],
        [-158.0826, 21.3608],
        [-158.0819, 21.3638],
        [-158.0824, 21.3664],
        [-158.0852, 21.3686],
        [-158.0888, 21.3702],
        [-158.0932, 21.3716]
      ])
    },
    {
      kind: "road",
      names: ["farrington highway"],
      geometry: line([
        [-158.1280, 21.3375],
        [-158.1060, 21.3370],
        [-158.0860, 21.3358],
        [-158.0620, 21.3375],
        [-158.0400, 21.3440],
        [-158.0220, 21.3540]
      ])
    },
    {
      kind: "road",
      names: ["fort weaver road"],
      geometry: line([
        [-158.0265, 21.3610],
        [-158.0260, 21.3485],
        [-158.0225, 21.3360],
        [-158.0180, 21.3245],
        [-158.0115, 21.3155]
      ])
    },
    {
      kind: "road",
      names: ["kalaeloa boulevard"],
      geometry: line([
        [-158.0885, 21.3370],
        [-158.0880, 21.3305],
        [-158.0865, 21.3240],
        [-158.0830, 21.3175]
      ])
    },
    {
      kind: "road",
      names: ["kapolei parkway"],
      geometry: line([
        [-158.1085, 21.3310],
        [-158.0930, 21.3325],
        [-158.0780, 21.3340],
        [-158.0620, 21.3355],
        [-158.0460, 21.3340]
      ])
    },
    {
      kind: "road",
      names: ["kualaka'i parkway", "kualakai parkway", "north-south road", "north south road"],
      geometry: line([
        [-158.0585, 21.3770],
        [-158.0580, 21.3620],
        [-158.0570, 21.3480],
        [-158.0555, 21.3365]
      ])
    },
    {
      kind: "road",
      names: ["waipana street"],
      geometry: line([
        [-158.0065, 21.3038],
        [-158.0038, 21.3055],
        [-158.0012, 21.3078]
      ])
    },
    {
      kind: "road",
      names: ["kamokila boulevard"],
      geometry: line([
        [-158.0815, 21.3408],
        [-158.0855, 21.3378],
        [-158.0895, 21.3345]
      ])
    },
    {
      kind: "region",
      names: ["ewa beach", "'ewa beach"],
      geometry: shape([
        [-158.032, 21.322],
        [-158.018, 21.308],
        [-158.002, 21.304],
        [-157.992, 21.314],
        [-157.996, 21.324],
        [-158.014, 21.327],
        [-158.032, 21.322]
      ])
    },
    {
      kind: "region",
      names: ["ocean pointe", "oceanpointe"],
      geometry: shape([
        [-158.012, 21.312],
        [-158.000, 21.304],
        [-157.992, 21.310],
        [-157.996, 21.318],
        [-158.008, 21.318]
      ])
    },
    {
      kind: "region",
      names: ["hoakalei"],
      geometry: shape([
        [-158.008, 21.308],
        [-157.998, 21.302],
        [-157.992, 21.308],
        [-157.998, 21.314]
      ])
    },
    {
      kind: "region",
      names: ["east kapolei"],
      geometry: shape([
        [-158.070, 21.358],
        [-158.048, 21.350],
        [-158.045, 21.335],
        [-158.068, 21.338]
      ])
    },
    {
      kind: "region",
      names: ["west kapolei"],
      geometry: shape([
        [-158.118, 21.342],
        [-158.092, 21.340],
        [-158.090, 21.325],
        [-158.116, 21.326]
      ])
    },
    {
      kind: "region",
      names: ["makakilo"],
      geometry: shape([
        [-158.098, 21.372],
        [-158.074, 21.368],
        [-158.076, 21.348],
        [-158.098, 21.350]
      ])
    },
    {
      kind: "region",
      names: ["kalaeloa"],
      geometry: shape([
        [-158.102, 21.330],
        [-158.072, 21.328],
        [-158.070, 21.312],
        [-158.100, 21.314]
      ])
    },
    {
      kind: "region",
      names: ["honouliuli"],
      geometry: shape([
        [-158.048, 21.355],
        [-158.028, 21.350],
        [-158.026, 21.338],
        [-158.046, 21.340]
      ])
    },
    {
      kind: "region",
      names: ["ko olina", "ko'olina"],
      geometry: shape([
        [-158.130, 21.342],
        [-158.112, 21.340],
        [-158.112, 21.326],
        [-158.130, 21.328]
      ])
    },
    {
      kind: "region",
      names: ["kapolei"],
      geometry: shape([
        [-158.110, 21.348],
        [-158.078, 21.346],
        [-158.078, 21.328],
        [-158.110, 21.330]
      ])
    },
    {
      kind: "region",
      names: ["kunia"],
      geometry: shape([
        [-158.070, 21.392],
        [-158.040, 21.388],
        [-158.042, 21.368],
        [-158.070, 21.372]
      ])
    },
    {
      kind: "region",
      names: ["waipahu"],
      geometry: shape([
        [-158.022, 21.396],
        [-157.990, 21.392],
        [-157.992, 21.372],
        [-158.022, 21.376]
      ])
    },
    {
      kind: "region",
      names: ["'ewa", "ewa"],
      geometry: shape([
        [-158.130, 21.380],
        [-157.990, 21.370],
        [-157.990, 21.300],
        [-158.130, 21.310]
      ])
    }
  ].sort(function (a, b) {
    var an = (a.names[0] || "").length;
    var bn = (b.names[0] || "").length;
    return bn - an;
  });

  function geometryFor(place, locationType) {
    var key = fold(place);
    if (!key) return null;
    var match = null;
    var matchLen = 0;
    PLACES.forEach(function (entry) {
      if (locationType && entry.kind !== locationType) return;
      entry.names.map(fold).forEach(function (name) {
        if (!name) return;
        var hit = key === name || key.indexOf(name) !== -1;
        if (!hit) return;
        if (name.length > matchLen) {
          match = entry;
          matchLen = name.length;
        }
      });
    });
    if (!match && locationType) return geometryFor(place, "");
    if (!match) return null;
    return {
      kind: match.kind,
      geometry: {
        type: match.geometry.type,
        coordinates: match.geometry.coordinates,
        approximate: true
      }
    };
  }

  function applyToItem(item) {
    if (!item) return item;
    var found = geometryFor(item.place, item.locationType);
    if (!found) return item;
    if (!item.locationType) item.locationType = found.kind;
    var saved = item.geometry;
    var keepManual = !!(saved && saved.manual && saved.type === found.geometry.type && saved.coordinates);
    if (!keepManual) {
      item.geometry = {
        type: found.geometry.type,
        coordinates: JSON.parse(JSON.stringify(found.geometry.coordinates)),
        approximate: true
      };
    }
    return item;
  }

  global.EwaPlaces = {
    geometryFor: geometryFor,
    applyToItem: applyToItem
  };
})(window);
