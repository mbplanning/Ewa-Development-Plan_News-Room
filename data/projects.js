/* Structured dataset for the ʻEwa Development Plan News Room.
   Edit this file when adding news from a PDF, Word file, text, or link.
   Do not invent facts. Leave unknown fields empty. */
window.EWA_DP_DATA = {
  schemaVersion: 1,
  meta: {
    title: "ʻEwa Development Plan News Room",
    updated: "2026-08-24",
    note: "Working news log. Not an official publication."
  },
  projects: [
    {
      id: "proj-hoakalei-west-lagoon-luau",
      name: "Hoakalei West Lagoon Lūʻau",
      type: "Project",
      location: "Ocean Pointe / Hoakalei, Waipana Street, TMK 9-1-134:081",
      communities: ["Ocean Pointe / Hoakalei", "ʻEwa Beach"],
      whatsNew: "Haseko (‘Ewa) Inc. seeks a Conditional Use Permit–Major for a permanent outdoor lūʻau (1,200 guests plus 200 staff). A temporary ~500-guest lūʻau at the Special Events Lawn was already approved. Decision due August 27, 2026. Completion scheduled for second quarter of 2030.",
      issue: "Noise, traffic, and incomplete public connections around Hoakalei while a large entertainment use scales up.",
      statusLabel: "Needs review",
      currentStatus: "Needs review",
      latestUpdateDate: "2026-08-07",
      expectedCompletion: {
        label: "Second quarter of 2030",
        date: "2030-06",
        datePrecision: "month",
        dateType: "estimated"
      },
      agencies: ["DPP", "HDOT", "DPP Traffic Review Branch", "Neighborhood Board", "Navy", "Haseko (‘Ewa) Inc.", "R.M. Towill Corporation"],
      topics: ["Economic Development / Healthy Community", "Transportation / Mobility"],
      tags: ["hoakalei", "cup", "ewa-beach", "traffic", "noise"],
      needsReview: true,
      sourceType: "PDF",
      sources: [
        {
          id: "src-hoakalei-drm-2026-08-07",
          title: "DPP Director’s Review Meeting packet, LUPD (Gerald Toyomura)",
          organization: "Department of Planning and Permitting",
          published: "2026-08-07",
          url: "",
          sourceFile: "P:\\PolicyDocuments\\DPSCP\\Ewa\\2nd Five Year Review 2024\\Development Updates\\Hoakalei WestLagoonLuauHaseko 8.7.26.pdf",
          added: "2026-08-19"
        }
      ],
      updates: [
        {
          id: "upd-hoakalei-2026-08-07",
          date: "2026-08-07",
          headline: "DPP reviewing major CUP for Hoakalei West Lagoon lūʻau (1,200 guests)",
          summary: "Haseko seeks CUP-Major 2026-CUP-36 for a permanent West Lagoon lūʻau. Staff recommendation is approval with TIAR/TMP and noise conditions. Decision due August 27, 2026; completion scheduled Q2 2030. Neighborhood Board asked for a public Tripoli–Keoneʻula connection; some access points remain blocked.",
          sourceId: "src-hoakalei-drm-2026-08-07",
          tags: ["hoakalei", "cup", "traffic"]
        }
      ]
    },
    {
      id: "proj-a99-728-hhfdc-lands",
      name: "A99-728 / HHFDC East Kapolei lands",
      type: "Project",
      location: "East Kapolei (TMKs (1) 9-1-016:008, 9-1-017:096–099, and (1) 9-1-018:008, 014–015)",
      communities: ["East Kapolei"],
      whatsNew: "HHFDC wrote the Land Use Commission that DLNR still owns the listed parcels and a land swap with D.R. Horton has not occurred. An MOU for incremental transfer to HHFDC is being drafted. Kooloaula (308 units, 2017) and Keahumoa Place (320 units, 2020) are built and in operation.",
      issue: "Who controls remaining A99-728 lands, whether a D.R. Horton swap proceeds, and how housing pipeline and DBA conditions get implemented.",
      statusLabel: "Needs review",
      currentStatus: "Needs review",
      latestUpdateDate: "2026-08-05",
      agencies: ["HHFDC", "DLNR", "LUC", "OPSD", "DPP", "State Legislature", "D.R. Horton"],
      topics: ["Housing / Development"],
      tags: ["hhfdc", "luc", "east-kapolei", "housing"],
      needsReview: true,
      sourceType: "PDF",
      sources: [
        {
          id: "src-hhfdc-luc-2026-08-05",
          title: "HHFDC letter to LUC (Dean Minakami to Daniel Orodenker)",
          organization: "Hawaii Housing Finance and Development Corporation",
          published: "2026-08-05",
          url: "",
          sourceFile: "P:\\PolicyDocuments\\DPSCP\\Ewa\\2nd Five Year Review 2024\\Development Updates\\Status_Response to LUC letter_08052026_final (part 1) - signed.pdf",
          added: "2026-08-19"
        }
      ],
      updates: [
        {
          id: "upd-hhfdc-2026-08-05",
          date: "2026-08-05",
          headline: "HHFDC: DLNR still owns A99-728 parcels; D.R. Horton land swap has not occurred",
          summary: "As of August 5, 2026, DLNR remains fee owner of the listed 9-1 parcels. After HCR 85 HD1 urged transfer to HHFDC, an as-needed land-transfer MOU is being drafted. HHFDC has not yet determined whether District Boundary Amendment changes are needed.",
          sourceId: "src-hhfdc-luc-2026-08-05",
          tags: ["hhfdc", "luc", "east-kapolei"]
        }
      ]
    },
    {
      id: "proj-makakilo-emergency-access",
      name: "Makakilo emergency access route",
      type: "Project",
      location: "Makakilo",
      communities: ["Makakilo"],
      whatsNew: "The Department of Emergency Management announced an emergency-only access route for Makakilo, created through an MOU with private landowners if Makakilo Drive is blocked. It is not for everyday public use.",
      issue: "Single-egress / emergency evacuation for Makakilo if Makakilo Drive is unusable.",
      statusLabel: "Needs review",
      currentStatus: "Needs review",
      latestUpdateDate: "2026-07-09",
      agencies: ["Department of Emergency Management", "City and County of Honolulu", "Private landowners (unnamed in release)"],
      topics: ["Public Facilities", "Transportation / Mobility"],
      tags: ["makakilo", "emergency-access", "public-safety"],
      needsReview: true,
      sourceType: "PDF",
      sources: [
        {
          id: "src-makakilo-ein-2026-07-09",
          title: "City and County of Honolulu establishes emergency access route for Makakilo",
          organization: "EIN Presswire / City press release",
          published: "2026-07-09",
          url: "https://www.einnews.com/pr_news/925390064/city-and-county-of-honolulu-establishes-emergency-access-route-for-makakilo",
          sourceFile: "P:\\PolicyDocuments\\DPSCP\\Ewa\\2nd Five Year Review 2024\\Development Updates\\emergency access route for Makakilo - EIN Presswire.pdf",
          added: "2026-08-19"
        }
      ],
      updates: [
        {
          id: "upd-makakilo-2026-07-09",
          date: "2026-07-09",
          headline: "City establishes emergency access route for Makakilo",
          summary: "DEM announced an emergency-only route via an MOU with unnamed private landowners so first responders can open access between existing private roads if Makakilo Drive is blocked. Residents may use it only when officials activate it.",
          sourceId: "src-makakilo-ein-2026-07-09",
          tags: ["makakilo", "emergency-access"]
        }
      ]
    },
    {
      id: "proj-childcare-shortage",
      name: "Licensed childcare supply in ʻEwa Beach",
      type: "Issue",
      location: "ʻEwa Beach (statewide shortage; ʻEwa Beach cited)",
      communities: ["ʻEwa Beach"],
      whatsNew: "Civil Beat reports Center for American Progress findings that 96% of Hawaiʻi children live in licensed-childcare deserts. An ʻEwa Beach parent is named as living in a community with scarce licensed supply. The saved Word file does not print a publication date.",
      issue: "Licensed childcare and preschool capacity not keeping up with family demand in already-thin West Oʻahu supply.",
      statusLabel: "Needs review",
      currentStatus: "Needs review",
      latestUpdateDate: "",
      agencies: ["Department of Human Services", "Executive Office on Early Learning", "Center for American Progress", "Hawaiʻi Children’s Action Network", "Seagull Schools"],
      topics: ["Public Facilities", "Housing / Development"],
      tags: ["childcare", "ewa-beach", "preschool"],
      needsReview: true,
      sourceType: "Word",
      sources: [
        {
          id: "src-civilbeat-childcare",
          title: "Hawaiʻi’s Childcare Shortage Is One Of The Nation’s Worst",
          organization: "Civil Beat",
          published: "",
          url: "",
          sourceFile: "P:\\PolicyDocuments\\DPSCP\\Ewa\\2nd Five Year Review 2024\\Development Updates\\Hawaiʻi’s Childcare Shortage Is One Of The Nation’s Worst.docx",
          added: "2026-08-19"
        }
      ],
      updates: [
        {
          id: "upd-childcare-civilbeat",
          date: "",
          headline: "Civil Beat: Hawaiʻi childcare deserts among nation’s worst; ʻEwa Beach cited",
          summary: "Statewide licensed-childcare deserts are reported as among the nation’s worst. Public preschool seats have expanded since 2022 while private provider capacity fell. The article flags ʻEwa Beach as a scarce-supply community. Publication date was not on the saved file.",
          sourceId: "src-civilbeat-childcare",
          tags: ["childcare", "ewa-beach"]
        }
      ]
    }
  ]
};
