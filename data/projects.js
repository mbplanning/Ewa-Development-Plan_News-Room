/* Structured dataset for the ʻEwa Development Plan dashboard.
   Edit this file when adding projects, updates, sources, history, milestones, or map geometry.
   Do not invent facts. Leave unknown fields empty (the UI shows "Not identified"). */
window.EWA_DP_DATA = {
  schemaVersion: 1,
  meta: {
    title: "ʻEwa Development Plan",
    updated: "2026-08-19",
    note: "Starter records use cited public sources so the board, map, and timeline can be tested. Replace or expand them as new material is verified. Map geometries are approximate unless a source supports more precision."
  },
  planArea: {
    id: "geom-ewa-dp-area",
    type: "polygon",
    precision: "approximate",
    label: "Approximate ʻEwa Development Plan area (Kunia Road to Kahe Point, mauka toward Kaloʻi Gulch)",
    coordinates: [
      [21.353, -158.128],
      [21.375, -158.125],
      [21.392, -158.085],
      [21.395, -158.032],
      [21.372, -158.000],
      [21.325, -157.995],
      [21.304, -158.010],
      [21.297, -158.070],
      [21.297, -158.106],
      [21.353, -158.128]
    ]
  },
  projects: [
    {
      id: "proj-skyline-west-oahu",
      name: "Skyline — West Oʻahu / East Kapolei service",
      type: "Project",
      location: "East Kapolei, UH West Oʻahu, Hoʻopili / Honouliuli, and the elevated corridor east toward Hālawa",
      communities: ["East Kapolei", "Kapolei", "Makakilo", "Honouliuli", "ʻEwa"],
      whatsNew: "Segment 2 opened for passenger service on October 16, 2025, extending Skyline from Hālawa to Kahauiki (Kalihi Transit Center). Segment 1 (Kualakaʻi to Hālawa) has been in service since June 30, 2023. Remaining city-center extension has been described as scheduled for 2031.",
      issue: "Rail is a major transit spine for East Kapolei, UH West Oʻahu, and Hoʻopili. Opening dates for later segments have been revised more than once, so current service and later-phase expectations should be tracked separately.",
      statusLabel: "In service (Segments 1–2); later extension not open",
      currentStatus: "Segments 1 and 2 in passenger service. City-center extension under construction / not yet open; reported scheduled opening 2031.",
      latestUpdateDate: "2025-10-16",
      expectedCompletion: {
        label: "City-center extension reported as scheduled 2031",
        date: "2031",
        datePrecision: "year",
        dateType: "estimated",
        note: "Earlier remaining-segment dates (including a former late-2025 target) were revised. Treat 2031 as a reported schedule, not a demonstrated commitment."
      },
      agencies: [
        "Honolulu Authority for Rapid Transportation (HART)",
        "Department of Transportation Services (DTS)",
        "City and County of Honolulu"
      ],
      topics: ["Transportation / Mobility"],
      tags: ["skyline", "rail", "transit", "east-kapolei", "stations"],
      notes: "This record focuses on West Oʻahu / ʻEwa-relevant stations and on the public opening history. Do not treat the whole island alignment as an ʻEwa-only project boundary.",
      needsReview: false,
      sourceType: "Link",
      map: {
        features: [
          {
            id: "geom-skyline-ewa-line",
            type: "line",
            precision: "approximate",
            label: "Approximate Skyline alignment through East Kapolei stations",
            coordinates: [
              [21.345555, -158.051569],
              [21.357980, -158.051333],
              [21.367623, -158.044252]
            ]
          },
          {
            id: "geom-skyline-kualakai",
            type: "point",
            precision: "approximate",
            label: "Kualakaʻi (East Kapolei) station",
            coordinates: [21.345555, -158.051569]
          },
          {
            id: "geom-skyline-keoneae",
            type: "point",
            precision: "approximate",
            label: "Keoneʻae (UH West Oʻahu) station",
            coordinates: [21.357980, -158.051333]
          },
          {
            id: "geom-skyline-honouliuli",
            type: "point",
            precision: "approximate",
            label: "Honouliuli (Hoʻopili) station",
            coordinates: [21.367623, -158.044252]
          }
        ]
      },
      sources: [
        {
          id: "src-skyline-hart-construction",
          title: "Construction — Honolulu Authority for Rapid Transportation",
          organization: "Honolulu Authority for Rapid Transportation",
          published: "2025",
          url: "https://honolulutransit.org/construction/",
          added: "2026-08-19"
        },
        {
          id: "src-skyline-dts-seg2",
          title: "Skyline segment 2 begins passenger service tomorrow, October 16, 2025",
          organization: "Department of Transportation Services",
          published: "2025-10-15",
          url: "https://www.honolulu.gov/dts/skyline-segment-2-begins-passenger-service-tomorrow-october-16-2025/",
          added: "2026-08-19"
        },
        {
          id: "src-skyline-staradv-2023",
          title: "Honolulu’s Skyline is ready to roll",
          organization: "Honolulu Star-Advertiser",
          published: "2023-06-30",
          url: "https://www.staradvertiser.com/2023/06/30/hawaii-news/honolulus-skyline-is-ready-to-roll/",
          added: "2026-08-19"
        },
        {
          id: "src-skyline-wikipedia",
          title: "Skyline (Honolulu)",
          organization: "Wikipedia (compilation of cited public reports)",
          published: "2025",
          url: "https://en.wikipedia.org/wiki/Skyline_(Honolulu)",
          added: "2026-08-19",
          note: "Used for earlier schedule history that is not restated on the HART construction page. Treat compiled dates as reported, not independently re-verified here."
        }
      ],
      updates: [
        {
          id: "upd-skyline-2023-06-30",
          date: "2023-06-30",
          summary: "Segment 1 opened to the public: nine stations from Kualakaʻi (East Kapolei) to Hālawa (Aloha Stadium).",
          sourceId: "src-skyline-staradv-2023",
          tags: ["skyline", "rail", "opening", "east-kapolei"]
        },
        {
          id: "upd-skyline-2025-03-18",
          date: "2025-03-18",
          summary: "Segment 2 opening from Hālawa to Kahauiki announced for October 2025. Wikipedia compilation notes this was ahead of a previous 2031 remaining-segment estimate and behind an earlier planned date of May 14, 2024.",
          sourceId: "src-skyline-wikipedia",
          tags: ["skyline", "rail", "schedule"]
        },
        {
          id: "upd-skyline-2025-10-16",
          date: "2025-10-16",
          summary: "Segment 2 began passenger service, adding about five miles and four stations and extending service from East Kapolei to Middle Street / Kalihi Transit Center. HART describes Segments 1 and 2 as now open, with construction underway on the next phase toward Civic Center.",
          sourceId: "src-skyline-dts-seg2",
          tags: ["skyline", "rail", "opening"]
        }
      ],
      statusHistory: [
        {
          id: "st-skyline-2016-schedule",
          date: "2016",
          datePrecision: "year",
          previousStatus: "Not identified in this record",
          newStatus: "Reported 2016 schedule: western Segment 1 opening late 2020; remaining segments late 2025.",
          explanation: "Earlier public schedule later revised. Retained so later delays are traceable.",
          sourceId: "src-skyline-wikipedia"
        },
        {
          id: "st-skyline-2021-03",
          date: "2021-03",
          datePrecision: "month",
          previousStatus: "Remaining segments reported as late 2025.",
          newStatus: "Remaining (non-Segment 1) opening reported pushed to 2031.",
          explanation: "Schedule change for the unopened remainder of the line.",
          sourceId: "src-skyline-wikipedia"
        },
        {
          id: "st-skyline-2023-06-30",
          date: "2023-06-30",
          previousStatus: "Segment 1 not yet in passenger service.",
          newStatus: "Segment 1 in passenger service (Kualakaʻi to Hālawa).",
          explanation: "First operating segment opened.",
          sourceId: "src-skyline-staradv-2023"
        },
        {
          id: "st-skyline-2025-10-16",
          date: "2025-10-16",
          previousStatus: "Segment 1 in service; Segment 2 not yet open.",
          newStatus: "Segments 1 and 2 in passenger service. Further extension not yet open; 2031 remains the reported remaining-segment schedule in compiled sources.",
          explanation: "Segment 2 opened earlier than the 2031 remainder date that had been associated with later phases, and later than a previously reported May 2024 Segment 2 target.",
          sourceId: "src-skyline-dts-seg2"
        }
      ],
      milestones: [
        {
          id: "ms-skyline-seg1-open",
          date: "2023-06-30",
          event: "Segment 1 passenger service begins (Kualakaʻi–Hālawa)",
          dateType: "actual",
          sourceId: "src-skyline-staradv-2023"
        },
        {
          id: "ms-skyline-seg2-planned-2024",
          date: "2024-05-14",
          event: "Previously reported planned Segment 2 opening (did not occur on this date)",
          dateType: "estimated",
          sourceId: "src-skyline-wikipedia",
          note: "Kept as a historical estimate that was not met."
        },
        {
          id: "ms-skyline-seg2-open",
          date: "2025-10-16",
          event: "Segment 2 passenger service begins (Hālawa–Kahauiki)",
          dateType: "actual",
          sourceId: "src-skyline-dts-seg2"
        },
        {
          id: "ms-skyline-seg3-2031",
          date: "2031",
          datePrecision: "year",
          event: "Reported scheduled opening of remaining city-center segment",
          dateType: "estimated",
          sourceId: "src-skyline-wikipedia"
        }
      ]
    },
    {
      id: "proj-honouliuli-wwtp",
      name: "Honouliuli Wastewater Treatment Plant — secondary treatment and effluent improvements",
      type: "Project",
      location: "91-1000 Geiger Road, ʻEwa Beach",
      communities: ["ʻEwa Beach", "ʻEwa", "Kapolei", "Makakilo"],
      whatsNew: "A June 2026 final environmental assessment found no significant impact for proposed ultraviolet disinfection (with a peracetic acid alternative) at the plant. That work is separate from the full secondary treatment upgrade completed in 2024 under a 2010 federal consent decree.",
      issue: "The plant serves a wide West Oʻahu area. Secondary treatment was a consent-decree obligation. Later disinfection / outfall work is a new chapter, not a replacement of the 2024 completion.",
      statusLabel: "Secondary treatment complete; further improvements in environmental review",
      currentStatus: "Full secondary treatment in operation (completed January 31, 2024). Additional effluent disinfection / outfall improvements have a June 2026 FEA-FONSI; construction start is not identified in the sources used here.",
      latestUpdateDate: "2026-06-08",
      expectedCompletion: {
        label: "Secondary treatment complete (2024). Disinfection construction completion not identified.",
        date: "",
        datePrecision: "",
        dateType: "",
        note: "Do not treat the 2024 secondary-treatment completion as the end of all plant work."
      },
      agencies: [
        "Department of Environmental Services (ENV)",
        "U.S. Environmental Protection Agency",
        "Hawaiʻi Department of Health",
        "Wilson Okamoto Corporation",
        "Carollo Engineers"
      ],
      topics: ["Infrastructure / One Water", "Environmental / Resilience"],
      tags: ["wastewater", "one-water", "consent-decree", "honouliuli", "environmental-review"],
      notes: "Star-Advertiser reported the secondary upgrade cost as $536 million. Consent-decree deadline for this plant was June 1, 2024.",
      needsReview: false,
      sourceType: "Link",
      map: {
        features: [
          {
            id: "geom-wwtp-point",
            type: "point",
            precision: "approximate",
            label: "Honouliuli WWTP (approximate plant location)",
            coordinates: [21.3303, -158.0381]
          }
        ]
      },
      sources: [
        {
          id: "src-wwtp-staradv-2024",
          title: "Updated wastewater treatment plant unveiled in Ewa Beach",
          organization: "Honolulu Star-Advertiser",
          published: "2024-05-11",
          url: "https://www.staradvertiser.com/2024/05/11/hawaii-news/updated-wastewater-treatment-plant-unveiled/",
          added: "2026-08-19"
        },
        {
          id: "src-wwtp-hfp-2024",
          title: "14 Years Later: Honouliuli WWTP portion of Consent Decree completed",
          organization: "Hawaii Free Press",
          published: "2024-05",
          url: "https://www.hawaiifreepress.com/Articles-Main/ID/40974/14-Years-Later-Honouliuli-WWTP-portion-of-Consent-Decree-completed",
          added: "2026-08-19"
        },
        {
          id: "src-wwtp-fea-2026",
          title: "Honouliuli WWTP Effluent Treatment and Outfall Improvements — Final EA / FONSI",
          organization: "Department of Environmental Services / Office of Planning and Sustainable Development Environmental Review Program",
          published: "2026-06-08",
          url: "https://files.hawaii.gov/dbedt/erp/Doc_Library/2026-06-08-OA-FEA-Honouliuli-WWTP-Effluent-Treatment-and-Outfall-Improvements.pdf",
          added: "2026-08-19"
        }
      ],
      updates: [
        {
          id: "upd-wwtp-2010-decree",
          date: "2010-12-17",
          summary: "Federal consent decree filed, with a 25-year schedule. Honouliuli was required to be upgraded to full secondary treatment by 2024 (deadline later cited as June 1, 2024).",
          sourceId: "src-wwtp-hfp-2024",
          tags: ["wastewater", "consent-decree"]
        },
        {
          id: "upd-wwtp-2024-01-31",
          date: "2024-01-31",
          summary: "City officials stated the secondary treatment upgrades were completed on January 31, 2024, ahead of the June 1, 2024 deadline.",
          sourceId: "src-wwtp-staradv-2024",
          tags: ["wastewater", "completed"]
        },
        {
          id: "upd-wwtp-2024-05",
          date: "2024-05-10",
          summary: "City commemorated the $536 million full secondary treatment upgrade at an approximately 10-acre portion of the plant. The facility serves communities from Hālawa to Makakilo, including Barbers Point and Mililani.",
          sourceId: "src-wwtp-staradv-2024",
          tags: ["wastewater", "one-water"]
        },
        {
          id: "upd-wwtp-2026-06",
          date: "2026-06-08",
          summary: "Final EA and finding of no significant impact published for a new disinfection system (UV proposed; PAA evaluated as alternative) to meet NPDES enterococci requirements. Work would be inside the existing plant. Construction start date is not identified in the notice summary used here.",
          sourceId: "src-wwtp-fea-2026",
          tags: ["wastewater", "environmental-review", "disinfection"]
        }
      ],
      statusHistory: [
        {
          id: "st-wwtp-2010",
          date: "2010-12-17",
          previousStatus: "Primary / partial secondary treatment (plant history).",
          newStatus: "Consent decree in effect: full secondary treatment required by 2024.",
          explanation: "Legal obligation established; work not yet complete.",
          sourceId: "src-wwtp-hfp-2024"
        },
        {
          id: "st-wwtp-2024-complete",
          date: "2024-01-31",
          previousStatus: "Secondary upgrade underway under consent decree.",
          newStatus: "Honouliuli secondary treatment upgrade reported complete.",
          explanation: "Consent-decree plant milestone met before June 1, 2024.",
          sourceId: "src-wwtp-staradv-2024"
        },
        {
          id: "st-wwtp-2026-fonsi",
          date: "2026-06-08",
          previousStatus: "Secondary treatment in operation.",
          newStatus: "Secondary treatment in operation; additional effluent disinfection / outfall improvements have FEA-FONSI.",
          explanation: "New environmental-review chapter. Does not undo the 2024 completion.",
          sourceId: "src-wwtp-fea-2026"
        }
      ],
      milestones: [
        {
          id: "ms-wwtp-decree",
          date: "2010-12-17",
          event: "Consent decree filed (secondary treatment by 2024)",
          dateType: "actual",
          sourceId: "src-wwtp-hfp-2024"
        },
        {
          id: "ms-wwtp-deadline",
          date: "2024-06-01",
          event: "Consent-decree deadline for Honouliuli secondary treatment",
          dateType: "confirmed-future",
          sourceId: "src-wwtp-staradv-2024",
          note: "Deadline date; work was reported complete before this date."
        },
        {
          id: "ms-wwtp-complete",
          date: "2024-01-31",
          event: "Secondary treatment upgrades reported complete",
          dateType: "actual",
          sourceId: "src-wwtp-staradv-2024"
        },
        {
          id: "ms-wwtp-fonsi",
          date: "2026-06-08",
          event: "FEA-FONSI for effluent disinfection / outfall improvements",
          dateType: "actual",
          sourceId: "src-wwtp-fea-2026"
        }
      ]
    },
    {
      id: "proj-ewa-dp-update",
      name: "ʻEwa Development Plan comprehensive update",
      type: "Plan update",
      location: "ʻEwa Development Plan area: ʻEwa Beach, Kapolei, and Makakilo; Kunia Road to Kahe Point, mauka toward Kaloʻi Gulch",
      communities: ["ʻEwa Beach", "Kapolei", "Makakilo", "ʻEwa", "Kalaeloa", "Honouliuli"],
      whatsNew: "A comprehensive update kicked off in fall 2025. A public review draft is described as available in 2028. The plan now in effect is the 2013 plan as amended in 2020.",
      issue: "The Development Plan is the regional policy framework for growth, infrastructure, agricultural lands, and the secondary urban center. An update can change how later projects are evaluated.",
      statusLabel: "Plan update in progress",
      currentStatus: "Comprehensive update in progress (kickoff fall 2025). Public review draft anticipated 2028. 2013 plan as amended 2020 remains the adopted plan until replaced.",
      latestUpdateDate: "2025-10",
      expectedCompletion: {
        label: "Public review draft described as available in 2028",
        date: "2028",
        datePrecision: "year",
        dateType: "estimated",
        note: "Adoption date after the public review draft is not identified on the DPP page used here."
      },
      agencies: [
        "Department of Planning and Permitting (DPP)"
      ],
      topics: ["Public Facilities", "Housing / Development"],
      tags: ["development-plan", "plan-update", "regional-policy", "public-review"],
      notes: "Project website cited by DPP: https://ewadevelopmentplan.com/",
      needsReview: false,
      sourceType: "Link",
      map: {
        features: [
          {
            id: "geom-ewa-dp-update-area",
            type: "polygon",
            precision: "approximate",
            label: "Approximate ʻEwa DP area (not a surveyed boundary)",
            coordinates: [
              [21.353, -158.128],
              [21.375, -158.125],
              [21.392, -158.085],
              [21.395, -158.032],
              [21.372, -158.000],
              [21.325, -157.995],
              [21.304, -158.010],
              [21.297, -158.070],
              [21.297, -158.106],
              [21.353, -158.128]
            ]
          }
        ]
      },
      sources: [
        {
          id: "src-ewa-dpp-page",
          title: "ʻEwa Development Plan — Department of Planning and Permitting",
          organization: "Department of Planning and Permitting",
          published: "2025",
          url: "https://www.honolulu.gov/dpp/planning/applying-for-changes/dp-scp/ewa/",
          added: "2026-08-19"
        },
        {
          id: "src-ewa-dp-2013",
          title: "ʻEwa Development Plan (July 2013)",
          organization: "Department of Planning and Permitting",
          published: "2013-07-22",
          url: "https://www.honolulu.gov/dpp/wp-content/uploads/sites/56/2024/07/Ewa_DP_2013.pdf",
          added: "2026-08-19"
        }
      ],
      updates: [
        {
          id: "upd-ewa-dp-2013",
          date: "2013-07-22",
          summary: "Revised ʻEwa Development Plan adopted via Ordinance 13-26, replacing the 1997 plan.",
          sourceId: "src-ewa-dp-2013",
          tags: ["development-plan", "adoption"]
        },
        {
          id: "upd-ewa-dp-2020",
          date: "2020",
          datePrecision: "year",
          summary: "Amended ʻEwa Development Plan adopted in 2020. DPP states this amended plan is the version in effect.",
          sourceId: "src-ewa-dpp-page",
          tags: ["development-plan", "amendment"]
        },
        {
          id: "upd-ewa-dp-2025-kickoff",
          date: "2025-10",
          datePrecision: "season",
          summary: "Comprehensive update kicked off in fall 2025. DPP says the update will reassess regional vision, policies, and implementation, with outreach to agencies, organizations, residents, and other stakeholders. Public review draft described as available in 2028.",
          sourceId: "src-ewa-dpp-page",
          tags: ["development-plan", "plan-update", "public-review"]
        }
      ],
      statusHistory: [
        {
          id: "st-ewa-dp-2013",
          date: "2013-07-22",
          previousStatus: "1997 ʻEwa Development Plan in effect.",
          newStatus: "2013 ʻEwa Development Plan adopted (Ordinance 13-26).",
          explanation: "Plan replacement.",
          sourceId: "src-ewa-dp-2013"
        },
        {
          id: "st-ewa-dp-2020",
          date: "2020",
          datePrecision: "year",
          previousStatus: "2013 plan in effect.",
          newStatus: "2013 plan as amended in 2020 in effect.",
          explanation: "Amendment, not a full replacement of the 2013 plan document family.",
          sourceId: "src-ewa-dpp-page"
        },
        {
          id: "st-ewa-dp-2025",
          date: "2025-10",
          datePrecision: "season",
          previousStatus: "2013 plan as amended 2020 in effect; no comprehensive update underway in this record.",
          newStatus: "Comprehensive update underway; adopted 2013/2020 plan still in effect until replaced.",
          explanation: "Process start. Draft and adoption have not occurred.",
          sourceId: "src-ewa-dpp-page"
        }
      ],
      milestones: [
        {
          id: "ms-ewa-dp-2013",
          date: "2013-07-22",
          event: "2013 ʻEwa Development Plan adopted",
          dateType: "actual",
          sourceId: "src-ewa-dp-2013"
        },
        {
          id: "ms-ewa-dp-2020",
          date: "2020",
          datePrecision: "year",
          event: "Plan amended (2020)",
          dateType: "actual",
          sourceId: "src-ewa-dpp-page"
        },
        {
          id: "ms-ewa-dp-2025",
          date: "2025-10",
          datePrecision: "season",
          event: "Comprehensive update kickoff (fall 2025)",
          dateType: "actual",
          sourceId: "src-ewa-dpp-page"
        },
        {
          id: "ms-ewa-dp-2028-draft",
          date: "2028",
          datePrecision: "year",
          event: "Public review draft described as available",
          dateType: "estimated",
          sourceId: "src-ewa-dpp-page"
        }
      ]
    },
    {
      id: "proj-hoopili",
      name: "Hoʻopili master-planned community",
      type: "Project",
      location: "East Kapolei / ʻEwa, along the Kualakaʻi Parkway–Farrington Highway area, including Skyline stations at Keoneʻae and Honouliuli",
      communities: ["East Kapolei", "Honouliuli", "ʻEwa", "Kapolei"],
      whatsNew: "As of July 3, 2025, D.R. Horton Hawaii reported 3,209 dwelling units closed at Hoʻopili (including some third-party projects). Build-out continues. Civic-farm subdivision and covenants required by LUC conditions were still in progress as of the September 2025 supplemental letter.",
      issue: "Hoʻopili is a large housing and mixed-use project on former agricultural land, with LUC conditions on urban agriculture, schools, and transportation. Unit delivery, farm-land conditions, and related highway agreements all matter to the Development Plan.",
      statusLabel: "Construction and occupancy underway",
      currentStatus: "Construction and occupancy underway. 3,209 dwelling units closed as of July 3, 2025. Full build-out year not identified in the sources used here.",
      latestUpdateDate: "2025-09-19",
      expectedCompletion: {
        label: "Full build-out year not identified",
        date: "",
        datePrecision: "",
        dateType: "",
        note: "Some real-estate listings describe a roughly 20-year master plan; that completion year is not used here because it is not in the LUC letter cited for unit counts."
      },
      agencies: [
        "D.R. Horton Hawaii LLC",
        "Land Use Commission",
        "Department of Planning and Permitting (DPP)",
        "Hawaiʻi Department of Transportation (HDOT)",
        "Department of Education",
        "Aloun Farms"
      ],
      topics: ["Housing / Development", "Economic Development / Healthy Community"],
      tags: ["housing", "master-planned-community", "east-kapolei", "agriculture-conditions", "luc"],
      notes: "LUC Docket No. A06-771. Education Contribution Agreement dated November 5, 2009, identifies five school sites; DOE design status varies by parcel.",
      needsReview: false,
      sourceType: "PDF",
      map: {
        features: [
          {
            id: "geom-hoopili-area",
            type: "polygon",
            precision: "approximate",
            label: "Approximate Hoʻopili vicinity (not a property boundary)",
            coordinates: [
              [21.348, -158.058],
              [21.348, -158.040],
              [21.362, -158.032],
              [21.375, -158.038],
              [21.375, -158.055],
              [21.360, -158.062],
              [21.348, -158.058]
            ]
          }
        ]
      },
      sources: [
        {
          id: "src-hoopili-luc-2025",
          title: "Hoʻopili 2025 supplemental report to DPP (LUC Docket A06-771)",
          organization: "D.R. Horton Hawaii LLC",
          published: "2025-09-19",
          url: "https://files.hawaii.gov/luc/dockets/a06-771/annual-reports/2025-SUPP-00.pdf",
          added: "2026-08-19",
          sourceFile: "2025-SUPP-00.pdf"
        }
      ],
      updates: [
        {
          id: "upd-hoopili-2025-07-03",
          date: "2025-07-03",
          summary: "3,209 dwelling units closed, including Kulia (120) and The Element (318) by third parties, and excluding 25 commercial units at Kohina and Kaikea.",
          sourceId: "src-hoopili-luc-2025",
          tags: ["housing", "unit-count"]
        },
        {
          id: "upd-hoopili-2025-09-19",
          date: "2025-09-19",
          summary: "Supplemental LUC/DPP letter: civic-farm lots still being created as separate parcels; covenants not yet recorded. Aloun Farms received 180-day notices for phasing (Phase 16A & 42-inch water main notice October 17, 2024; Phase 16B notice May 9, 2025). Horton states it has not yet determined whether Phases 16A and 16B will include affordable housing.",
          sourceId: "src-hoopili-luc-2025",
          tags: ["housing", "agriculture-conditions", "affordable-housing"]
        }
      ],
      statusHistory: [
        {
          id: "st-hoopili-construction",
          date: "2025-07-03",
          previousStatus: "Master-planned community under construction (prior unit count not recorded in this starter set).",
          newStatus: "Occupancy and construction underway; 3,209 dwelling units closed.",
          explanation: "Latest unit-count snapshot from petitioner letter. Not a completion.",
          sourceId: "src-hoopili-luc-2025"
        }
      ],
      milestones: [
        {
          id: "ms-hoopili-units-2025",
          date: "2025-07-03",
          event: "3,209 dwelling units closed (snapshot)",
          dateType: "actual",
          sourceId: "src-hoopili-luc-2025"
        },
        {
          id: "ms-hoopili-aloun-16b",
          date: "2025-05-09",
          event: "Aloun Farms Phase 16B 180-day withdrawal notice emailed",
          dateType: "actual",
          sourceId: "src-hoopili-luc-2025"
        }
      ]
    },
    {
      id: "proj-farrington-widening",
      name: "Farrington Highway widening (Hoʻopili-related HDOT agreement)",
      type: "Project",
      location: "Farrington Highway corridor in the East Kapolei / Hoʻopili vicinity",
      communities: ["East Kapolei", "Honouliuli", "ʻEwa"],
      whatsNew: "On October 3, 2024, D.R. Horton Hawaii entered a memorandum of agreement with HDOT regarding the Farrington Widening Project, described in a 2025 letter as satisfying Horton’s LUC-related contribution obligations for Farrington Highway traffic and roadway improvements.",
      issue: "Farrington Highway is a primary regional corridor for ʻEwa and East Kapolei. Developer contribution agreements can change who pays and when work proceeds, but they are not the same as a published construction start or completion date.",
      statusLabel: "Agreement in place; construction not identified",
      currentStatus: "HDOT–Horton memorandum of agreement dated October 3, 2024. Construction status, scope details, and completion date are not identified in the letter used here.",
      latestUpdateDate: "2024-10-03",
      expectedCompletion: {
        label: "Not identified",
        date: "",
        datePrecision: "",
        dateType: "",
        note: ""
      },
      agencies: [
        "Hawaiʻi Department of Transportation (HDOT)",
        "D.R. Horton Hawaii LLC"
      ],
      topics: ["Transportation / Mobility"],
      tags: ["farrington-highway", "widening", "hdot", "developer-agreement"],
      notes: "Keep this as a corridor project with its own sources. Related Hoʻopili housing facts stay on the Hoʻopili record.",
      needsReview: false,
      sourceType: "PDF",
      map: {
        features: [
          {
            id: "geom-farrington-line",
            type: "line",
            precision: "approximate",
            label: "Approximate Farrington Highway corridor near Hoʻopili (not a surveyed centerline)",
            coordinates: [
              [21.3685, -158.055],
              [21.367623, -158.044252],
              [21.360, -158.025],
              [21.352, -158.012]
            ]
          }
        ]
      },
      sources: [
        {
          id: "src-farrington-luc-2025",
          title: "Hoʻopili 2025 supplemental report to DPP (LUC Docket A06-771) — Farrington MOA passage",
          organization: "D.R. Horton Hawaii LLC",
          published: "2025-09-19",
          url: "https://files.hawaii.gov/luc/dockets/a06-771/annual-reports/2025-SUPP-00.pdf",
          added: "2026-08-19",
          sourceFile: "2025-SUPP-00.pdf"
        }
      ],
      updates: [
        {
          id: "upd-farrington-2024-10-03",
          date: "2024-10-03",
          summary: "Memorandum of Agreement with HDOT on the Farrington Widening Project. Horton states this satisfies its LUC contribution obligations for Farrington Highway traffic and roadway improvements tied to specified conditions, and that an amendment related to those obligations was entered at the same time.",
          sourceId: "src-farrington-luc-2025",
          tags: ["farrington-highway", "widening", "developer-agreement"]
        }
      ],
      statusHistory: [
        {
          id: "st-farrington-moa",
          date: "2024-10-03",
          previousStatus: "LUC conditions required Horton contributions to Farrington Highway improvements; construction status not identified in this record.",
          newStatus: "Contribution obligation described as satisfied via October 3, 2024 HDOT MOA. Highway construction status still not identified.",
          explanation: "Funding/obligation change is recorded. Do not infer that widening construction has started or finished.",
          sourceId: "src-farrington-luc-2025"
        }
      ],
      milestones: [
        {
          id: "ms-farrington-moa",
          date: "2024-10-03",
          event: "HDOT–Horton Farrington Widening MOA",
          dateType: "actual",
          sourceId: "src-farrington-luc-2025"
        }
      ]
    },
    {
      id: "proj-kalaeloa-heritage",
      name: "Kalaeloa Heritage Park stewardship",
      type: "Issue",
      location: "Kalaeloa Heritage Park, 91-1940 Coral Sea Road, Kapolei (Kalaeloa community development district)",
      communities: ["Kalaeloa", "Kapolei"],
      whatsNew: "A five-year lease and stewardship agreement with the Kalaeloa Heritage and Legacy Foundation was executed on November 17, 2023, with an option to extend 20 years. This followed termination of an earlier 40-year lease in 2019 and a period of short-term right-of-entry permits.",
      issue: "The park holds archaeological, cultural, and natural resources on former Barbers Point Naval Air Station land now associated with HCDA. Lease terms changed who can steward the site and for how long.",
      statusLabel: "Lease / stewardship in effect",
      currentStatus: "Five-year lease and stewardship agreement in effect (executed November 17, 2023), with option to extend 20 years. 2019 termination remains part of the history.",
      latestUpdateDate: "2023-11-17",
      expectedCompletion: {
        label: "Current lease term begins 2023; expiration/extension outcome not identified beyond the stated option",
        date: "2028",
        datePrecision: "year",
        dateType: "estimated",
        note: "Five-year lease from November 17, 2023 implies a 2028 term end if not extended. Extension is an option, not a recorded decision here."
      },
      agencies: [
        "Hawaiʻi Community Development Authority (HCDA)",
        "Kalaeloa Heritage and Legacy Foundation",
        "Native Hawaiian Legal Corporation"
      ],
      topics: ["Cultural / Historic Resources", "Parks / Open Space"],
      tags: ["kalaeloa", "cultural-resources", "stewardship", "lease"],
      notes: "",
      needsReview: false,
      sourceType: "Link",
      map: {
        features: [
          {
            id: "geom-khp-point",
            type: "point",
            precision: "approximate",
            label: "Kalaeloa Heritage Park (approximate)",
            coordinates: [21.319, -158.082]
          }
        ]
      },
      sources: [
        {
          id: "src-khp-nhlc",
          title: "NHLC represents Kalaeloa Heritage and Legacy Foundation in successful negotiations to lease Kalaeloa Heritage Park",
          organization: "Native Hawaiian Legal Corporation",
          published: "2023",
          url: "https://nativehawaiianlegalcorp.org/nhlc-represents-kalaeloa-heritage-and-legacy-foundation-in-successful-negotiations-to-lease-kalaeloa-heritage-park/",
          added: "2026-08-19"
        }
      ],
      updates: [
        {
          id: "upd-khp-2019-termination",
          date: "2019",
          datePrecision: "year",
          summary: "HCDA terminated a prior 40-year lease that had included about 77 acres and a vision for a multipurpose cultural center, citing unresolved stockpiling issues. Short-term right-of-entry permits later allowed continued preservation work.",
          sourceId: "src-khp-nhlc",
          tags: ["kalaeloa", "lease"]
        },
        {
          id: "upd-khp-2023-lease",
          date: "2023-11-17",
          summary: "KHLF executed a 5-year lease including a stewardship agreement for management of historic properties and cultural/educational programs, with an option to extend another 20 years. The newer agreement focuses on preservation rather than constructing a multipurpose cultural center.",
          sourceId: "src-khp-nhlc",
          tags: ["kalaeloa", "stewardship", "lease"]
        }
      ],
      statusHistory: [
        {
          id: "st-khp-2019",
          date: "2019",
          datePrecision: "year",
          previousStatus: "40-year lease in effect (construction-oriented cultural center vision).",
          newStatus: "Prior lease terminated; stewardship continued under shorter-term access arrangements.",
          explanation: "Responsible-party / tenure change.",
          sourceId: "src-khp-nhlc"
        },
        {
          id: "st-khp-2023",
          date: "2023-11-17",
          previousStatus: "Short-term right-of-entry period after 2019 termination.",
          newStatus: "5-year lease and stewardship agreement in effect, with 20-year extension option.",
          explanation: "New tenure chapter. Does not erase the 2019 termination.",
          sourceId: "src-khp-nhlc"
        }
      ],
      milestones: [
        {
          id: "ms-khp-2019",
          date: "2019",
          datePrecision: "year",
          event: "Prior 40-year lease terminated",
          dateType: "actual",
          sourceId: "src-khp-nhlc"
        },
        {
          id: "ms-khp-2023",
          date: "2023-11-17",
          event: "5-year lease and stewardship agreement executed",
          dateType: "actual",
          sourceId: "src-khp-nhlc"
        },
        {
          id: "ms-khp-2028",
          date: "2028",
          datePrecision: "year",
          event: "Approximate end of the 5-year term if not extended",
          dateType: "estimated",
          sourceId: "src-khp-nhlc",
          note: "Derived from a 5-year term starting November 17, 2023. Not a stated expiration document in the source."
        }
      ]
    }
  ]
};
