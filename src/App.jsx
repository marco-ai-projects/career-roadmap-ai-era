import React, { useEffect, useRef, useState } from "react";

const HORIZONS = [
  { id: "now", label: "Now" },
  { id: "6m", label: "6 months" },
  { id: "12m", label: "1 year" },
  { id: "24m", label: "2 years" },
  { id: "36m", label: "3 years" },
  { id: "48m", label: "4 years" },
  { id: "60m", label: "5 years" },
];

const FAMILY_FILTERS = [
  "All",
  "Management",
  "Business & Finance",
  "Computer & Math",
  "Engineering",
  "Science",
  "Community & Social Service",
  "Legal",
  "Education",
  "Arts, Media & Design",
  "Healthcare Practitioners",
  "Healthcare Support",
  "Protective Service",
  "Food Service",
  "Cleaning & Grounds",
  "Personal Care & Service",
  "Sales",
  "Office & Admin Support",
  "Farming & Forestry",
  "Construction & Extraction",
  "Repair & Maintenance",
  "Production",
  "Transportation & Warehousing",
];

const SORT_OPTIONS = [
  { id: "employment", label: "Largest workforce" },
  { id: "risk-desc", label: "AI impact high-low" },
  { id: "risk-asc", label: "AI impact low-high" },
];

const CONTEXT_PRESETS = [
  {
    id: "baseline",
    label: "Baseline",
    description: "Generic occupation view with no enterprise role modifier.",
  },
  {
    id: "enterprise-pm",
    label: "Enterprise PM",
    description: "Models a large-company PM role where AI reshapes tasks faster than it replaces ownership.",
  },
  {
    id: "fortune100-pm",
    label: "Large Enterprise PM",
    description: "Adds governance, executive alignment, and accountability modifiers for scaled enterprises.",
  },
];

const SYNTHETIC_ROLE_DEFS = [
  {
    id: "product-manager",
    occupationName: "Product Manager",
    family: "Management",
    labels: ["Product Manager", "Product Management"],
    searchTerms: [
      "product manager",
      "product managers",
      "product management",
      "product management role",
      "technical product manager",
      "senior product manager",
    ],
    mappingCopy:
      "No single BLS occupation cleanly captures product management. This synthetic benchmark blends strategy, customer insight, technical analysis, lifecycle planning, and delivery coordination using the closest BLS/O*NET-aligned occupations. O*NET also treats titles such as Product Manager, Technical Product Manager, and Product Development Manager as adjacent labor-market signals rather than a standalone occupation family.",
    summary:
      "Product Manager is modeled as a synthetic benchmark that combines customer insight, strategy, technical analysis, and cross-functional delivery rather than treating product management as simple project scheduling.",
    anchorNote:
      "Anchored to market research, management analysis, systems analysis, project coordination, product-focused management, and operating management roles.",
    components: [
      { occupationName: "Market Research Analysts and Marketing Specialists", weight: 0.25 },
      { occupationName: "Management Analysts", weight: 0.22 },
      { occupationName: "Project Management Specialists", weight: 0.18 },
      { occupationName: "Computer Systems Analysts", weight: 0.15 },
      { occupationName: "Marketing Managers", weight: 0.1 },
      { occupationName: "General and Operations Managers", weight: 0.1 },
    ],
  },
  {
    id: "product-owner",
    occupationName: "Product Owner",
    family: "Business & Finance",
    labels: ["Product Owner"],
    searchTerms: [
      "product owner",
      "product owners",
      "agile product owner",
      "scrum product owner",
    ],
    mappingCopy:
      "Product Owner does not exist as a clean BLS occupation, so this synthetic benchmark leans more heavily toward delivery, requirements shaping, business analysis, and systems translation than the broader Product Manager model.",
    summary:
      "Product Owner is modeled as a synthetic benchmark focused on backlog ownership, requirements clarity, delivery alignment, and systems-level decision support.",
    anchorNote:
      "Anchored to business analysis, systems analysis, project coordination, market insight, and cross-functional execution roles.",
    components: [
      { occupationName: "Management Analysts", weight: 0.24 },
      { occupationName: "Project Management Specialists", weight: 0.24 },
      { occupationName: "Computer Systems Analysts", weight: 0.22 },
      { occupationName: "Market Research Analysts and Marketing Specialists", weight: 0.16 },
      { occupationName: "General and Operations Managers", weight: 0.14 },
    ],
  },
  {
    id: "program-manager",
    occupationName: "Program Manager",
    family: "Management",
    labels: ["Program Manager", "Program Management"],
    searchTerms: [
      "program manager",
      "program managers",
      "program management",
      "technical program manager",
      "tpm",
    ],
    mappingCopy:
      "Program Manager is modeled as a synthetic benchmark that emphasizes operating cadence, cross-team execution, dependency management, and delivery governance. O*NET explicitly treats Program Manager as an alternate title within operations management, while enterprise program work also borrows from project and systems management roles.",
    summary:
      "Program Manager is modeled as a synthetic benchmark for multi-stream coordination, delivery governance, executive reporting, and operational execution across teams.",
    anchorNote:
      "Anchored to operations management, project coordination, enterprise systems management, and management analysis.",
    components: [
      { occupationName: "General and Operations Managers", weight: 0.36 },
      { occupationName: "Project Management Specialists", weight: 0.3 },
      { occupationName: "Computer and Information Systems Managers", weight: 0.2 },
      { occupationName: "Management Analysts", weight: 0.14 },
    ],
  },
];

const THEME_OPTIONS = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

function getInitialTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  const forcedTheme = new URLSearchParams(window.location.search).get("theme");
  if (forcedTheme === "light" || forcedTheme === "dark") {
    return forcedTheme;
  }

  const savedTheme = window.localStorage.getItem("career-heatmap-theme");
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return "light";
}

function formatRefreshDate(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function clampScore(value) {
  return Math.max(5, Math.min(95, Math.round(value)));
}

function riskTone(score) {
  if (score >= 70) {
    return {
      label: "High risk",
      background: "linear-gradient(135deg, rgba(203, 36, 49, 0.22), rgba(245, 101, 101, 0.16))",
      border: "rgba(239, 68, 68, 0.45)",
    };
  }
  if (score >= 50) {
    return {
      label: "Exposed",
      background: "linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(251, 191, 36, 0.16))",
      border: "rgba(245, 158, 11, 0.40)",
    };
  }
  if (score >= 25) {
    return {
      label: "Watch",
      background: "linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(59, 130, 246, 0.14))",
      border: "rgba(59, 130, 246, 0.32)",
    };
  }
  return {
    label: "Safer",
    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(74, 222, 128, 0.14))",
    border: "rgba(16, 185, 129, 0.32)",
  };
}

function horizonDeltaLabel(occupation) {
  const change = occupation.riskByHorizon["60m"] - occupation.riskByHorizon.now;
  if (change >= 20) return "strong 5-year upward pressure";
  if (change >= 10) return "meaningful 5-year upward pressure";
  return "slower movement";
}

function expandSearchTerms(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const terms = new Set([normalized]);

  SYNTHETIC_ROLE_DEFS.forEach((role) => {
    if (role.searchTerms.some((term) => normalized.includes(term))) {
      terms.add(role.occupationName.toLowerCase());
      role.searchTerms.forEach((term) => terms.add(term));
      role.labels.forEach((label) => terms.add(label.toLowerCase()));
    }
  });

  return Array.from(terms);
}

function getSyntheticRoleMeta(occupation) {
  if (!occupation) {
    return null;
  }

  return (
    SYNTHETIC_ROLE_DEFS.find((role) => role.id === occupation.syntheticRoleId) || null
  );
}

function buildSearchHaystack(occupation) {
  const syntheticMeta = getSyntheticRoleMeta(occupation);
  const roleTerms = syntheticMeta ? [...syntheticMeta.searchTerms, ...syntheticMeta.labels] : [];
  const componentTerms = occupation.componentRoles
    ? occupation.componentRoles.map((component) => component.occupationName)
    : [];

  return [
    occupation.occupationName,
    occupation.majorGroupName,
    occupation.family,
    occupation.path.join(" "),
    roleTerms.join(" "),
    componentTerms.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function isStrategicRole(occupation) {
  const title = occupation.occupationName.toLowerCase();
  return (
    title.includes("manager") ||
    title.includes("project management") ||
    title.includes("analyst") ||
    occupation.family === "Management" ||
    occupation.family === "Business & Finance" ||
    occupation.family === "Computer & Math"
  );
}

function isProductLikeRole(occupation) {
  const title = occupation.occupationName.toLowerCase();
  return (
    title.includes("project management") ||
    title.includes("manager") ||
    title.includes("program") ||
    title.includes("product") ||
    occupation.family === "Management" ||
    occupation.family === "Business & Finance"
  );
}

function buildContextAssessment(occupation, preset, horizon) {
  const baselineRisk = occupation.riskByHorizon[horizon];
  const title = occupation.occupationName.toLowerCase();
  const strategicRole = isStrategicRole(occupation);
  const productLikeRole = isProductLikeRole(occupation);
  const digitalRoleBoost =
    occupation.family === "Business & Finance" || occupation.family === "Computer & Math" ? 4 : 0;
  const managerBoost = title.includes("manager") ? 4 : 0;
  const pmBoost = title.includes("project management") ? 5 : 0;
  const productBoost = title.includes("product") ? 4 : 0;
  const ownerBoost = title.includes("owner") ? 3 : 0;

  if (preset === "baseline") {
    return {
      label: "Generic occupation baseline",
      description: "The raw occupation score from the labor-market model.",
      baselineRisk,
      taskAutomationRisk: clampScore(baselineRisk + 2),
      replacementRisk: clampScore(baselineRisk - 3),
      adjustedRisk: baselineRisk,
      notes: [
        "Uses the generic occupation score without company-context modifiers.",
        "Best for broad market comparisons across all occupations.",
      ],
      caution: "",
    };
  }

  const automationBoost =
    preset === "fortune100-pm"
      ? 14 + digitalRoleBoost + managerBoost + pmBoost + productBoost + ownerBoost
      : 10 +
        Math.round(digitalRoleBoost * 0.75) +
        Math.round(managerBoost * 0.5) +
        pmBoost +
        productBoost +
        ownerBoost;

  const replacementReduction =
    preset === "fortune100-pm"
      ? 24 + managerBoost + (strategicRole ? 4 : 0) + (productLikeRole ? 4 : 0)
      : 18 + Math.round(managerBoost * 0.75) + (strategicRole ? 4 : 0);

  const taskAutomationRisk = clampScore(baselineRisk + automationBoost);
  const replacementRisk = clampScore(
    baselineRisk - replacementReduction - (preset === "fortune100-pm" ? 2 : 0),
  );
  const adjustedBase =
    preset === "fortune100-pm"
      ? Math.round((taskAutomationRisk + replacementRisk) / 2 - 10)
      : Math.round((taskAutomationRisk + replacementRisk) / 2 - 6);
  const adjustedRisk = clampScore(strategicRole ? Math.max(adjustedBase, 24) : adjustedBase);

  return {
    label: preset === "fortune100-pm" ? "Fortune 100 PM overlay" : "Enterprise product manager overlay",
    description:
      preset === "fortune100-pm"
        ? "Models a strategic PM inside a scaled enterprise with stronger governance, executive review, and accountability."
        : "Models a large-company PM role where AI reshapes tasks faster than it replaces ownership.",
    baselineRisk,
    taskAutomationRisk,
    replacementRisk,
    adjustedRisk,
    notes: [
      "Task automation risk rises because PM work includes synthesis, reviews, research, decks, notes, and structured planning.",
      "Full-role replacement risk falls because enterprise PMs absorb ambiguity, alignment, tradeoffs, and accountability.",
      preset === "fortune100-pm"
        ? "Fortune 100 scale lowers replacement risk further because governance, cross-org coordination, and executive trust remain human bottlenecks."
        : "Large-company context lowers replacement risk because stakeholder alignment and cross-functional influence remain human-heavy.",
    ],
    caution: productLikeRole
      ? ""
      : "This overlay is most realistic for product, program, or strategy-heavy roles rather than field, clerical, or hands-on service roles.",
  };
}

function buildAdjustedRank(occupations, targetOccupation, preset, horizon) {
  if (!targetOccupation) {
    return null;
  }

  const scored = occupations
    .map((occupation) => ({
      occupation,
      adjustedRisk: buildContextAssessment(occupation, preset, horizon).adjustedRisk,
    }))
    .sort(
      (left, right) =>
        right.adjustedRisk - left.adjustedRisk || right.occupation.employment - left.occupation.employment,
    );

  const index = scored.findIndex(
    (item) => item.occupation.occupationCode === targetOccupation.occupationCode,
  );

  if (index === -1) {
    return null;
  }

  return {
    rank: index + 1,
    total: scored.length,
    adjustedRisk: scored[index].adjustedRisk,
  };
}

function buildSyntheticRole(roleDef, occupationLookup) {
  const resolvedComponents = roleDef.components
    .map((component) => {
      const occupation = occupationLookup.get(component.occupationName);
      if (!occupation) {
        return null;
      }

      return {
        ...component,
        occupation,
      };
    })
    .filter(Boolean);

  if (!resolvedComponents.length) {
    return null;
  }

  const weightedAverage = (accessor) =>
    resolvedComponents.reduce((sum, component) => sum + accessor(component) * component.weight, 0);

  const riskByHorizon = Object.fromEntries(
    HORIZONS.map((horizon) => [
      horizon.id,
      clampScore(weightedAverage((component) => component.occupation.riskByHorizon[horizon.id])),
    ]),
  );

  const collectDrivers = (key) => {
    const tallies = new Map();

    resolvedComponents.forEach((component) => {
      component.occupation[key].forEach((driver) => {
        tallies.set(driver, (tallies.get(driver) || 0) + component.weight);
      });
    });

    return [...tallies.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([driver]) => driver);
  };

  const employment = Math.round(weightedAverage((component) => component.occupation.employment));
  const annualMeanWage = Math.round(
    weightedAverage((component) => component.occupation.annualMeanWage),
  );
  const confidence = Math.min(
    0.92,
    weightedAverage((component) => component.occupation.confidence) * 0.93,
  );
  const currentRisk = riskByHorizon.now;

  return {
    occupationCode: `synthetic:${roleDef.id}`,
    occupationName: roleDef.occupationName,
    employment,
    employmentDisplay: formatNumber(employment),
    annualMeanWage,
    annualMeanWageDisplay: `$${formatNumber(annualMeanWage)}`,
    defaultSliceRank: null,
    majorGroupName: "Synthetic role benchmark",
    family: roleDef.family,
    path: [roleDef.occupationName, "Synthetic role benchmark"],
    currentRisk,
    riskByHorizon,
    lift24m: riskByHorizon["24m"] - currentRisk,
    confidence,
    bucket: riskTone(currentRisk).label,
    exposureDrivers: collectDrivers("exposureDrivers"),
    resilienceDrivers: collectDrivers("resilienceDrivers"),
    summary: roleDef.summary,
    synthetic: true,
    syntheticRoleId: roleDef.id,
    mappingCopy: roleDef.mappingCopy,
    anchorNote: roleDef.anchorNote,
    componentRoles: resolvedComponents.map((component) => ({
      occupationName: component.occupationName,
      weight: component.weight,
      annualMeanWageDisplay: component.occupation.annualMeanWageDisplay,
      family: component.occupation.family,
    })),
  };
}

function ButtonGroup({ options, activeId, onClick, className = "segmented" }) {
  return (
    <div className={className}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === activeId ? "active" : undefined}
          onClick={() => onClick(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ScorePill({ score, label }) {
  const tone = riskTone(score);
  return (
    <div className="score-pill" style={{ background: tone.background, borderColor: tone.border }}>
      {score}% · {label}
    </div>
  );
}

function StackList({ occupations, horizon, onSelect }) {
  return (
    <div className="stack-list">
      {occupations.map((occupation) => {
        const tone = riskTone(occupation.riskByHorizon[horizon]);
        return (
          <button
            key={occupation.occupationCode}
            type="button"
            className="stack-card"
            style={{ background: tone.background, borderColor: tone.border }}
            onClick={() => onSelect(occupation.occupationCode)}
          >
            <div className="stack-title">{occupation.occupationName}</div>
            <div className="stack-meta">
              {occupation.employmentDisplay} workers • {occupation.annualMeanWageDisplay}
            </div>
            <div className="stack-meta">
              {occupation.riskByHorizon[horizon]}% • {occupation.family}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [careerHeatmapData, setCareerHeatmapData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [theme, setTheme] = useState(getInitialTheme);
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("All");
  const [sortMode, setSortMode] = useState("employment");
  const [horizon, setHorizon] = useState("now");
  const [contextPreset, setContextPreset] = useState("fortune100-pm");
  const [selectedCode, setSelectedCode] = useState(null);
  const [riskBucketFilter, setRiskBucketFilter] = useState("All");
  const [controlsPinned, setControlsPinned] = useState(false);
  const controlsRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("career-heatmap-theme", theme);
  }, [theme]);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      try {
        const response = await fetch("/data/career-heatmap.json");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data = await response.json();
        if (!isActive) {
          return;
        }
        setCareerHeatmapData(data);
        setSelectedCode(data.occupations[0]?.occupationCode ?? null);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : "Unable to load data.");
      }
    }

    loadData();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const node = controlsRef.current;
    if (!node || typeof window === "undefined") {
      return undefined;
    }

    const root = document.documentElement;
    const updateStickyMetrics = () => {
      const stickyTop = Number.parseFloat(window.getComputedStyle(node).top || "14") || 14;
      const rect = node.getBoundingClientRect();
      root.style.setProperty("--sticky-controls-top", `${Math.ceil(stickyTop)}px`);
      root.style.setProperty(
        "--sticky-controls-height",
        `${Math.ceil(rect.height)}px`,
      );
      setControlsPinned(rect.top <= stickyTop + 1);
    };

    updateStickyMetrics();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateStickyMetrics) : null;
    resizeObserver?.observe(node);
    window.addEventListener("resize", updateStickyMetrics);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateStickyMetrics);
      root.style.removeProperty("--sticky-controls-top");
      root.style.removeProperty("--sticky-controls-height");
      setControlsPinned(false);
    };
  }, []);

  if (loadError) {
    return (
      <div className="page-shell">
        <main className="page">
          <section className="panel error-panel">
            <div className="mini-label">Load issue</div>
            <h1>Career Heatmap data did not load.</h1>
            <p className="body-copy">{loadError}</p>
          </section>
        </main>
      </div>
    );
  }

  if (!careerHeatmapData) {
    return (
      <div className="page-shell">
        <main className="page">
          <section className="panel loading-panel">
            <div className="mini-label">Loading</div>
            <h1>Career Heatmap</h1>
            <p className="body-copy">Pulling the latest occupation forecast data into the standalone app.</p>
          </section>
        </main>
      </div>
    );
  }

  const occupationLookup = new Map(
    careerHeatmapData.occupations.map((occupation) => [occupation.occupationName, occupation]),
  );
  const syntheticRoles = SYNTHETIC_ROLE_DEFS.map((roleDef) =>
    buildSyntheticRole(roleDef, occupationLookup),
  ).filter(Boolean);
  const roleCatalog = [...syntheticRoles, ...careerHeatmapData.occupations];
  const defaultSlice = careerHeatmapData.occupations.filter(
    (occupation) => occupation.defaultSliceRank !== null,
  );

  const query = search.trim().toLowerCase();
  const queryTerms = expandSearchTerms(query);
  let visibleRows = query.length >= 2 ? [...roleCatalog] : [...defaultSlice];

  if (family !== "All") {
    visibleRows = visibleRows.filter((occupation) => occupation.family === family);
  }

  if (riskBucketFilter !== "All") {
    visibleRows = visibleRows.filter((occupation) => occupation.bucket === riskBucketFilter);
  }

  if (query.length >= 2) {
    visibleRows = visibleRows.filter((occupation) => {
      const haystack = buildSearchHaystack(occupation);
      return queryTerms.some((term) => haystack.includes(term));
    });
  }

  visibleRows.sort((left, right) => {
    if (sortMode === "risk-desc") {
      return (
        right.riskByHorizon[horizon] - left.riskByHorizon[horizon] ||
        right.employment - left.employment
      );
    }
    if (sortMode === "risk-asc") {
      return (
        left.riskByHorizon[horizon] - right.riskByHorizon[horizon] ||
        right.employment - left.employment
      );
    }
    return right.employment - left.employment;
  });

  const limitedVisibleRows = query.length >= 2 ? visibleRows.slice(0, 60) : visibleRows;

  const selectedOccupation =
    limitedVisibleRows.find((occupation) => occupation.occupationCode === selectedCode) ||
    roleCatalog.find((occupation) => occupation.occupationCode === selectedCode) ||
    limitedVisibleRows[0] ||
    roleCatalog[0];

  const activeSelectedCode = selectedOccupation?.occupationCode ?? null;
  const context = selectedOccupation
    ? buildContextAssessment(selectedOccupation, contextPreset, horizon)
    : null;
  const fortune100AdjustedRank = buildAdjustedRank(
    [...defaultSlice, ...syntheticRoles],
    selectedOccupation,
    "fortune100-pm",
    horizon,
  );

  const highestRiskLargeRoles = [...defaultSlice]
    .sort(
      (left, right) =>
        right.riskByHorizon[horizon] - left.riskByHorizon[horizon] || right.employment - left.employment,
    )
    .slice(0, 5);

  const saferLargeRoles = [...defaultSlice]
    .sort(
      (left, right) =>
        left.riskByHorizon[horizon] - right.riskByHorizon[horizon] || right.employment - left.employment,
    )
    .slice(0, 5);

  const { coverage, generatedAt, methodology, marketSignals } = careerHeatmapData;
  const heroChips = [
    `Top ${coverage.defaultSliceCount} by workforce size`,
    `${coverage.occupationCount} occupations tracked`,
    `BLS release: ${coverage.releaseLabel}`,
    `Updated ${formatRefreshDate(generatedAt)}`,
  ];

  const snapshot = [
    ["Tracked workforce", `${formatNumber(Math.round(coverage.trackedEmployment / 1_000_000))}M workers`],
    ["High risk now", `${coverage.highRiskDefaultSliceCount} of ${coverage.defaultSliceCount}`],
    ["Safer now", `${coverage.saferDefaultSliceCount} of ${coverage.defaultSliceCount}`],
    ["Method", "BLS + ILO + OECD + Anthropic + WEF"],
  ];

  const buckets = defaultSlice.reduce((accumulator, occupation) => {
    accumulator[occupation.bucket] = (accumulator[occupation.bucket] || 0) + 1;
    return accumulator;
  }, {});

  const kpiCards = [
    ["High risk", buckets["High risk"] || 0, "Roles with 70%+ displacement pressure — primarily clerical and data-entry work."],
    ["Exposed", buckets.Exposed || 0, "Roles at 50-69% — significant task automation underway but not full replacement."],
    ["Watch", buckets.Watch || 0, "Roles at 25-49% — AI is reshaping the work but job growth often continues."],
    ["Safer", buckets.Safer || 0, "Below 25% — strong physical, trust, or regulatory barriers protect these roles."],
  ];

  return (
    <div className="page-shell">
      <main className={`page ${controlsPinned ? "page-controls-pinned" : ""}`}>
        <header className="topbar">
          <div className="topbar-brand">
            <div className="eyebrow">AI Workforce Intelligence</div>
            <div className="topbar-title">Career Heatmap</div>
            <div className="topbar-copy">
              Mapping AI displacement pressure across U.S. occupations — built for strategic workforce planning.
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-tag">March 2026</div>
            <div className="theme-switch" role="group" aria-label="Theme">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={theme === option.id ? "active" : undefined}
                  onClick={() => setTheme(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">Career Roadmap in the AI Era</div>
            <h1>Where AI Pressure Is Heading</h1>
            <p>
              A research-backed view of how AI is reshaping U.S. occupations — from current displacement
              pressure through 5-year scenario forecasts, calibrated against BLS, ILO, OECD, and Anthropic data.
            </p>
            <div className="hero-note">
              Search any role, compare exposure across time horizons, and apply enterprise PM overlays
              to see how context shifts the picture.
            </div>
            <div className="chip-row">
              {heroChips.map((chip, index) => (
                <span key={chip} className={`chip ${index === 0 ? "chip-accent" : ""}`}>
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <aside className="snapshot-card">
            <div className="mini-label">Snapshot</div>
            <div className="snapshot-list">
              {snapshot.map(([label, value]) => (
                <div key={label} className="snapshot-item">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <div className="snapshot-note">
              Scores reflect displacement pressure, not guaranteed elimination. High task exposure
              often leads to role transformation rather than job loss.
            </div>
          </aside>
        </section>

        <section className="kpi-grid">
          {kpiCards.map(([label, value, copy]) => {
            const tone = riskTone(
              label === "High risk" ? 80 : label === "Exposed" ? 60 : label === "Watch" ? 35 : 15
            );
            return (
              <article
                key={label}
                className="kpi-card"
                style={{ borderTopColor: tone.border, borderTopWidth: "3px" }}
              >
                <div className="mini-label">{label}</div>
                <div className="kpi-value">{value}</div>
                <div className="kpi-copy">{copy}</div>
              </article>
            );
          })}
        </section>

        <section className="top-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="mini-label">Large-Role Watchlist</div>
                <h2>Most exposed by selected horizon</h2>
              </div>
            </div>
            <StackList occupations={highestRiskLargeRoles} horizon={horizon} onSelect={setSelectedCode} />
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="mini-label">Safer Examples</div>
                <h2>Large roles with stronger natural barriers</h2>
              </div>
            </div>
            <StackList occupations={saferLargeRoles} horizon={horizon} onSelect={setSelectedCode} />
          </article>
        </section>

        <section
          ref={controlsRef}
          className={`panel panel-sticky-controls ${controlsPinned ? "is-pinned" : ""}`}
        >
          <div className="panel-head">
            <div>
              <div className="mini-label">Controls</div>
              <h2>Search, filter, and change the forecast window</h2>
            </div>
          </div>

          <div className="controls-grid">
            <label className="control">
              <span className="mini-label">Occupation search</span>
              <input
                type="search"
                placeholder="Try product manager, plumber, accountant..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="control">
              <span className="mini-label">Family filter</span>
              <select value={family} onChange={(event) => setFamily(event.target.value)}>
                {FAMILY_FILTERS.map((familyOption) => (
                  <option key={familyOption} value={familyOption}>
                    {familyOption}
                  </option>
                ))}
              </select>
            </label>

            <div className="control">
              <span className="mini-label">Order list by</span>
              <ButtonGroup options={SORT_OPTIONS} activeId={sortMode} onClick={setSortMode} />
            </div>
          </div>

          <ButtonGroup
            options={HORIZONS}
            activeId={horizon}
            onClick={setHorizon}
            className="segmented horizon-wrap"
          />
        </section>

        <section className="explore-grid">
          <section className="panel panel-heatmap">
            <div className="panel-head">
              <div>
                <div className="mini-label">
                  Occupation Explorer · {HORIZONS.find((item) => item.id === horizon)?.label ?? "Now"} view
                </div>
                <h2>
                  {query.length >= 2
                    ? "Search results across all tracked occupations"
                    : `Top ${careerHeatmapData.coverage.defaultSliceCount} U.S. occupations by employment`}
                </h2>
              </div>
              <div className="chip subtle">
                {limitedVisibleRows.length} visible role{limitedVisibleRows.length === 1 ? "" : "s"} •{" "}
                {SORT_OPTIONS.find((item) => item.id === sortMode)?.label}
              </div>
            </div>

            <div className={`risk-legend ${riskBucketFilter !== "All" ? "has-active-filter" : ""}`} role="group" aria-label="Risk level color key">
              {[
                { label: "Safer", desc: "< 25%", score: 15 },
                { label: "Watch", desc: "25-49%", score: 35 },
                { label: "Exposed", desc: "50-69%", score: 60 },
                { label: "High risk", desc: "70%+", score: 80 },
              ].map((item) => {
                const t = riskTone(item.score);
                const isActive = riskBucketFilter === item.label;
                return (
                  <button 
                    key={item.label} 
                    type="button"
                    className={`risk-legend-item ${isActive ? "active" : ""}`} 
                    style={{ background: isActive ? t.background : 'transparent', borderColor: t.border, color: isActive ? 'var(--text)' : 'var(--text-soft)' }}
                    onClick={() => setRiskBucketFilter(isActive ? "All" : item.label)}
                    aria-pressed={isActive}
                  >
                    <span className="risk-legend-label" style={{ fontWeight: 600 }}>{item.label}</span>
                    <span className="risk-legend-range">{item.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="row-list">
              {limitedVisibleRows.map((occupation) => {
                const tone = riskTone(occupation.riskByHorizon[horizon]);
                const rowSyntheticMeta = getSyntheticRoleMeta(occupation);
                return (
                  <article
                    key={occupation.occupationCode}
                    className={`row ${activeSelectedCode === occupation.occupationCode ? "is-selected" : ""}`}
                    onClick={() => setSelectedCode(occupation.occupationCode)}
                  >
                    <div className="row-top">
                      <div>
                        <span className="rank-pill">
                          {occupation.defaultSliceRank ? `#${occupation.defaultSliceRank}` : "⌕"}
                        </span>
                      </div>
                      <div>
                        <div className="occupation-title">{occupation.occupationName}</div>
                        <div className="occupation-subtitle">{occupation.majorGroupName}</div>
                        {occupation.synthetic ? (
                          <div className="occupation-alias">
                            {rowSyntheticMeta.labels.join(" / ")}
                          </div>
                        ) : null}
                      </div>
                      <div className="row-stats-group">
                        <div>
                          <div className="mini-label">Workforce</div>
                          <div className="metric-value">{occupation.employmentDisplay}</div>
                        </div>
                        <div className="row-stats-divider" />
                        <div>
                          <div className="mini-label">Avg salary</div>
                          <div className="metric-value">{occupation.annualMeanWageDisplay}</div>
                        </div>
                      </div>
                      <div>
                        <div className="family-tags">
                          <span className="chip">{occupation.family}</span>
                          <span
                            className="chip"
                            style={{ background: tone.background, borderColor: tone.border }}
                          >
                            {occupation.bucket}
                          </span>
                          {occupation.synthetic ? <span className="chip chip-accent">Synthetic</span> : null}
                        </div>
                      </div>
                      <div className="row-risk-bar">
                        <div className="risk-bar-header">
                          <span className="risk-bar-label">Now {occupation.riskByHorizon.now}%</span>
                          <span className="risk-bar-label">5yr {occupation.riskByHorizon["60m"]}%</span>
                        </div>
                        <div className="risk-bar-track">
                          <div
                            className="risk-bar-fill"
                            style={{
                              width: `${occupation.riskByHorizon[horizon]}%`,
                              background: `linear-gradient(90deg, ${tone.border}44, ${tone.border}88)`,
                            }}
                          />
                          <div
                            className="risk-bar-marker risk-bar-marker-now"
                            style={{ left: `${occupation.riskByHorizon.now}%` }}
                          />
                          <div
                            className="risk-bar-marker risk-bar-marker-5yr"
                            style={{ left: `${Math.min(occupation.riskByHorizon["60m"], 98)}%` }}
                          />
                        </div>
                        <div
                          className="risk-bar-score"
                          style={{ background: tone.background, borderColor: tone.border }}
                        >
                          {occupation.riskByHorizon[horizon]}%
                        </div>
                      </div>
                    </div>
                    <div className="row-summary">
                      <div className="row-copy">{occupation.summary}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="panel panel-selection">
            <div className="panel-head">
              <div>
                <div className="mini-label">Selected role</div>
                <h2>{selectedOccupation?.occupationName || "No role selected"}</h2>
                {selectedOccupation?.synthetic ? (
                  <div className="role-alias-line">
                    <span className="chip chip-accent">Synthetic role benchmark</span>
                    <span>
                      Anchored to {selectedOccupation.componentRoles.length} underlying occupations
                    </span>
                  </div>
                ) : (
                  <div className="selection-hint">
                    Click any role on the left to drill into its risk profile, drivers, and timeline.
                  </div>
                )}
              </div>
              {selectedOccupation ? (
                <ScorePill
                  score={selectedOccupation.riskByHorizon[horizon]}
                  label={HORIZONS.find((item) => item.id === horizon)?.label ?? "Now"}
                />
              ) : null}
            </div>

            {selectedOccupation ? (
              <>
                <div className="selection-summary-card">
                  <div className="mini-label">Role summary</div>
                  <p className="selection-summary">{selectedOccupation.summary}</p>
                </div>

                <div className="selection-heatmap-card">
                  <div className="heatmap-head">
                    <span className="mini-label">AI pressure timeline</span>
                    <span className="mini-label">Now → 5yr</span>
                  </div>
                  <div className="heatmap-grid selection-heatmap-grid">
                    {HORIZONS.map((item) => {
                      const horizonTone = riskTone(selectedOccupation.riskByHorizon[item.id]);
                      return (
                        <div
                          key={item.id}
                          className={`heat-cell ${horizon === item.id ? "active" : ""}`}
                          style={{
                            background: horizonTone.background,
                            borderColor: horizonTone.border,
                          }}
                        >
                          <div className="heat-cell-value">{selectedOccupation.riskByHorizon[item.id]}%</div>
                          <div className="heat-cell-label">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedOccupation.synthetic ? (
                  <div className="role-mapping-banner">
                    <div className="mini-label">How this benchmark is modeled</div>
                    <div className="role-model-note">{selectedOccupation.anchorNote}</div>
                    <details className="role-model-details">
                      <summary>View underlying occupation mix</summary>
                      <div className="role-mapping-copy">{selectedOccupation.mappingCopy}</div>
                      <div className="chip-row compact role-model-chip-row">
                        {selectedOccupation.componentRoles.map((component) => (
                          <span key={component.occupationName} className="chip">
                            {component.occupationName} · {Math.round(component.weight * 100)}%
                          </span>
                        ))}
                      </div>
                    </details>
                  </div>
                ) : null}

                <div className="spotlight-stats selection-stats">
                  {selectedOccupation.synthetic ? (
                    <>
                      <div className="stat-card">
                        <div className="mini-label">Role model</div>
                        <div className="value">{selectedOccupation.componentRoles.length} anchors</div>
                        <div className="metric-subcopy">
                          Synthetic benchmark built from BLS/O*NET-aligned occupations.
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="mini-label">Reference labor pool</div>
                        <div className="value">{selectedOccupation.employmentDisplay}</div>
                        <div className="metric-subcopy">
                          Weighted benchmark, not a literal single occupation headcount.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="stat-card">
                        <div className="mini-label">Workforce rank</div>
                        <div className="value">#{selectedOccupation.defaultSliceRank ?? "Search"}</div>
                        <div className="metric-subcopy">
                          {selectedOccupation.defaultSliceRank
                            ? `${selectedOccupation.employmentDisplay} workers in the current BLS national view.`
                            : `Tracked outside the top-${careerHeatmapData.coverage.defaultSliceCount} default slice, but still searchable.`}
                        </div>
                      </div>
                      <div className="stat-card">
                        <div className="mini-label">U.S. workforce</div>
                        <div className="value">{selectedOccupation.employmentDisplay}</div>
                        <div className="metric-subcopy">Current national employment for this occupation.</div>
                      </div>
                    </>
                  )}
                  <div className="stat-card">
                    <div className="mini-label">
                      {selectedOccupation.synthetic ? "Salary anchor" : "Avg yearly salary"}
                    </div>
                    <div className="value">{selectedOccupation.annualMeanWageDisplay}</div>
                    <div className="metric-subcopy">
                      {selectedOccupation.synthetic
                        ? "Weighted from the underlying benchmark occupations."
                        : "Based on the BLS annual mean wage for this occupation."}
                    </div>
                  </div>
                  {fortune100AdjustedRank ? (
                    <div className="stat-card stat-card-emphasis">
                      <div className="mini-label">Fortune 100 PM adjusted rank</div>
                      <div className="value">#{fortune100AdjustedRank.rank}</div>
                      <div className="metric-subcopy">
                        Rank out of {fortune100AdjustedRank.total} benchmark roles using the Fortune 100 PM
                        overlay for the selected horizon.
                      </div>
                    </div>
                  ) : null}
                  <div className="stat-card">
                    <div className="mini-label">Confidence</div>
                    <div className="value">{Math.round(selectedOccupation.confidence * 100)}%</div>
                    <div className="metric-subcopy">
                      Heuristic confidence rises when the role is clearly physical, clerical, or strategy-heavy.
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <div className="mini-label">What is pushing the score</div>
                  <div className="driver-grid selection-driver-grid">
                    <div>
                      <div className="mini-label">Exposure drivers</div>
                      <div className="chip-row compact">
                        {selectedOccupation.exposureDrivers.map((driver) => (
                          <span key={driver} className="chip chip-accent">
                            {driver}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="mini-label">Resilience drivers</div>
                      <div className="chip-row compact">
                        {selectedOccupation.resilienceDrivers.map((driver) => (
                          <span key={driver} className="chip">
                            {driver}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </aside>
        </section>

        {context ? (
          <section className="panel panel-context-band">
            <div className="panel-head compact">
              <div>
                <div className="mini-label">Role Context Overlay</div>
                <h3>Task automation vs full-role replacement</h3>
              </div>
              <ScorePill score={context.adjustedRisk} label="Adjusted view" />
            </div>

            <div className="context-band-layout">
              <div className="context-band-copy">
                <p className="body-copy">{context.description}</p>
                <ButtonGroup
                  options={CONTEXT_PRESETS}
                  activeId={contextPreset}
                  onClick={setContextPreset}
                />
              </div>

              <div className="context-metric-grid">
                {[
                  ["Generic occupation", context.baselineRisk, "Raw market baseline from the occupation model."],
                  ["Task automation", context.taskAutomationRisk, "How much of the day-to-day work is likely to be AI-assisted or automated."],
                  ["Full-role replacement", context.replacementRisk, "Likelihood the entire role is displaced rather than reshaped."],
                  ["Context-adjusted", context.adjustedRisk, contextPreset === "baseline" ? "Raw score without enterprise context modifiers." : "After governance, ambiguity, and accountability modifiers for the selected context."],
                ].map(([label, value, copy]) => {
                  const tone = riskTone(value);
                  return (
                    <div
                      key={label}
                      className="context-card"
                      style={{ background: tone.background, borderColor: tone.border }}
                    >
                      <div className="mini-label">{label}</div>
                      <div className="value">{value}%</div>
                      <div className="metric-subcopy">{copy}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="context-notes">
              {context.notes.map((note) => (
                <div key={note} className="note-card">
                  {note}
                </div>
              ))}
              {context.caution ? <div className="note-card">{context.caution}</div> : null}
            </div>
          </section>
        ) : null}

        <section className="bottom-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="mini-label">Market Signals</div>
                <h2>What is moving the model right now</h2>
              </div>
            </div>
            <div className="signal-list">
              {marketSignals.map((signal) => (
                <div key={signal.title} className="signal-card">
                  <div className="source-title">{signal.title}</div>
                  <p>{signal.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <div className="mini-label">Methodology</div>
                <h2>How to read the heat map</h2>
              </div>
            </div>
            <p className="body-copy">{methodology.summary}</p>
            <div className="chip-row compact">
              {methodology.weights.map((item) => (
                <span key={item.label} className="chip">
                  {item.label}: {item.value > 0 ? "+" : ""}
                  {item.value}
                </span>
              ))}
            </div>
            <div className="source-list">
              {methodology.sources.map((source) => (
                <a
                  key={source.label}
                  className="source-card"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div>
                    <div className="source-title">{source.label}</div>
                    <div className="source-published">{source.published}</div>
                  </div>
                  <div>Open</div>
                </a>
              ))}
            </div>
            <div className="refresh-note">
              Data calibrated against BLS, ILO, OECD, Anthropic, and WEF research published through March 2026.
              Scores reflect displacement pressure — not guaranteed job elimination.
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
