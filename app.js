const HORIZONS = [
  { id: "now", label: "Now" },
  { id: "1m", label: "1 month" },
  { id: "3m", label: "3 months" },
  { id: "6m", label: "6 months" },
  { id: "12m", label: "1 year" },
  { id: "18m", label: "18 months" },
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
    description: "Best for product or program roles in a large company with cross-functional alignment work.",
  },
  {
    id: "fortune100-pm",
    label: "Fortune 100 PM",
    description: "Adds stronger enterprise governance, executive alignment, and accountability modifiers.",
  },
];

const state = {
  data: null,
  search: "",
  family: "All",
  sortMode: "employment",
  horizon: "now",
  contextPreset: "fortune100-pm",
  selectedCode: null,
};

const qs = (selector) => document.querySelector(selector);

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
  if (normalized.includes("product manager") || normalized.includes("product management")) {
    terms.add("project management specialists");
  }
  return Array.from(terms);
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
      ? 14 + digitalRoleBoost + managerBoost + pmBoost
      : 10 + Math.round(digitalRoleBoost * 0.75) + Math.round(managerBoost * 0.5) + pmBoost;

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
    label: preset === "fortune100-pm" ? "Fortune 100 product manager overlay" : "Enterprise product manager overlay",
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

function buttonGroup(container, options, activeId, onClick) {
  container.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.label;
    if (option.id === activeId) button.classList.add("active");
    button.addEventListener("click", () => onClick(option.id));
    container.appendChild(button);
  });
}

function getDefaultSlice() {
  return state.data.occupations.filter((occupation) => occupation.defaultSliceRank !== null);
}

function getVisibleRows() {
  const query = state.search.trim().toLowerCase();
  const queryTerms = expandSearchTerms(query);
  let rows = query.length >= 2 ? [...state.data.occupations] : [...getDefaultSlice()];

  if (state.family !== "All") {
    rows = rows.filter((occupation) => occupation.family === state.family);
  }

  if (query.length >= 2) {
    rows = rows.filter((occupation) => {
      const haystack = [
        occupation.occupationName,
        occupation.majorGroupName,
        occupation.family,
        occupation.path.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return queryTerms.some((term) => haystack.includes(term));
    });
  }

  rows.sort((left, right) => {
    if (state.sortMode === "risk-desc") {
      return (
        right.riskByHorizon[state.horizon] - left.riskByHorizon[state.horizon] ||
        right.employment - left.employment
      );
    }
    if (state.sortMode === "risk-asc") {
      return (
        left.riskByHorizon[state.horizon] - right.riskByHorizon[state.horizon] ||
        right.employment - left.employment
      );
    }
    return right.employment - left.employment;
  });

  return query.length >= 2 ? rows.slice(0, 60) : rows;
}

function getSelectedOccupation(visibleRows) {
  return (
    visibleRows.find((occupation) => occupation.occupationCode === state.selectedCode) ||
    state.data.occupations.find((occupation) => occupation.occupationCode === state.selectedCode) ||
    visibleRows[0] ||
    state.data.occupations[0]
  );
}

function setScorePill(element, score, label) {
  const tone = riskTone(score);
  element.textContent = `${score}% · ${label}`;
  element.style.background = tone.background;
  element.style.borderColor = tone.border;
}

function renderHero() {
  const { coverage, generatedAt } = state.data;
  const heroChips = [
    `Top ${coverage.defaultSliceCount} by workforce size`,
    `${coverage.occupationCount} occupations tracked`,
    `BLS release: ${coverage.releaseLabel}`,
    `Updated ${formatRefreshDate(generatedAt)}`,
  ];

  qs("#hero-chips").innerHTML = heroChips
    .map((text, index) => `<span class="chip ${index === 0 ? "chip-accent" : ""}">${text}</span>`)
    .join("");

  const snapshot = [
    ["Tracked workforce", `${formatNumber(Math.round(coverage.trackedEmployment / 1_000_000))}M workers`],
    ["High risk now", `${coverage.highRiskDefaultSliceCount} of ${coverage.defaultSliceCount}`],
    ["Safer now", `${coverage.saferDefaultSliceCount} of ${coverage.defaultSliceCount}`],
    ["Method", "BLS + ILO + OECD + Anthropic + WEF"],
  ];

  qs("#snapshot-list").innerHTML = snapshot
    .map(
      ([label, value]) => `<div class="snapshot-item"><span>${label}</span><span>${value}</span></div>`,
    )
    .join("");
}

function renderKpis() {
  const defaultSlice = getDefaultSlice();
  const buckets = defaultSlice.reduce((acc, occupation) => {
    acc[occupation.bucket] = (acc[occupation.bucket] || 0) + 1;
    return acc;
  }, {});

  const cards = [
    ["High risk now", buckets["High risk"] || 0, "Large occupations already in the red band."],
    ["Safer now", buckets["Safer"] || 0, "Roles with strong physical or trust barriers."],
    ["Selected horizon", HORIZONS.find((item) => item.id === state.horizon).label, "The list and spotlight react to this view."],
    ["Market signal", "Weekly", "Refresh command is ready for a weekly batch update."],
  ];

  qs("#kpi-grid").innerHTML = cards
    .map(
      ([label, value, copy]) => `
        <article class="kpi-card">
          <div class="mini-label">${label}</div>
          <div class="kpi-value">${value}</div>
          <div class="kpi-copy">${copy}</div>
        </article>
      `,
    )
    .join("");
}

function renderSpotlight(occupation) {
  const tone = riskTone(occupation.riskByHorizon[state.horizon]);
  qs("#spotlight-title").textContent = occupation.occupationName;
  setScorePill(qs("#spotlight-score"), occupation.riskByHorizon[state.horizon], HORIZONS.find((item) => item.id === state.horizon).label);
  qs("#spotlight-summary").textContent = occupation.summary;

  const stats = [
    [
      "Workforce",
      occupation.employmentDisplay,
      occupation.defaultSliceRank
        ? `Ranked #${occupation.defaultSliceRank} by current BLS national employment.`
        : `Tracked outside the top-${state.data.coverage.defaultSliceCount} default slice, but still searchable.`,
    ],
    ["Avg yearly salary", occupation.annualMeanWageDisplay, "Based on the BLS annual mean wage for this occupation."],
    ["Confidence", `${Math.round(occupation.confidence * 100)}%`, "Heuristic confidence rises when the role is clearly physical, clerical, or strategy-heavy."],
  ];

  qs("#spotlight-stats").innerHTML = stats
    .map(
      ([label, value, copy]) => `
        <div class="stat-card">
          <div class="mini-label">${label}</div>
          <div class="value">${value}</div>
          <div class="metric-subcopy">${copy}</div>
        </div>
      `,
    )
    .join("");

  qs("#exposure-drivers").innerHTML = occupation.exposureDrivers
    .map((item) => `<span class="chip chip-accent">${item}</span>`)
    .join("");
  qs("#resilience-drivers").innerHTML = occupation.resilienceDrivers
    .map((item) => `<span class="chip">${item}</span>`)
    .join("");

  const context = buildContextAssessment(occupation, state.contextPreset, state.horizon);
  setScorePill(qs("#context-score"), context.adjustedRisk, "Adjusted view");
  qs("#context-description").textContent = context.description;

  buttonGroup(qs("#context-preset-controls"), CONTEXT_PRESETS, state.contextPreset, (id) => {
    state.contextPreset = id;
    render();
  });

  const contextMetrics = [
    ["Generic occupation", context.baselineRisk, "Raw market baseline from the occupation model."],
    ["Task automation", context.taskAutomationRisk, "How much of the day-to-day work is likely to be AI-assisted or automated."],
    ["Full-role replacement", context.replacementRisk, "Likelihood the entire role is displaced rather than reshaped."],
    ["Context-adjusted", context.adjustedRisk, "Enterprise PM view after governance, ambiguity, and accountability modifiers."],
  ];

  qs("#context-metrics").innerHTML = contextMetrics
    .map(([label, value, copy]) => {
      const metricTone = riskTone(value);
      return `
        <div class="context-card" style="background:${metricTone.background};border-color:${metricTone.border}">
          <div class="mini-label">${label}</div>
          <div class="value">${value}%</div>
          <div class="metric-subcopy">${copy}</div>
        </div>
      `;
    })
    .join("");

  const contextNotes = [...context.notes];
  if (context.caution) contextNotes.push(context.caution);
  qs("#context-notes").innerHTML = contextNotes
    .map((note) => `<div class="note-card">${note}</div>`)
    .join("");
}

function renderStackList(elementId, occupations) {
  qs(elementId).innerHTML = occupations
    .map((occupation) => {
      const tone = riskTone(occupation.riskByHorizon[state.horizon]);
      return `
        <button class="stack-card" data-code="${occupation.occupationCode}" style="background:${tone.background};border-color:${tone.border}">
          <div class="stack-title">${occupation.occupationName}</div>
          <div class="stack-meta">${occupation.employmentDisplay} workers • ${occupation.annualMeanWageDisplay}</div>
          <div class="stack-meta">${occupation.riskByHorizon[state.horizon]}% • ${occupation.family}</div>
        </button>
      `;
    })
    .join("");

  qs(elementId)
    .querySelectorAll("[data-code]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedCode = button.dataset.code;
        render();
      });
    });
}

function renderHeatmapRows(rows) {
  qs("#heatmap-title").textContent =
    state.search.trim().length >= 2
      ? "Search results across all tracked occupations"
      : `Top ${state.data.coverage.defaultSliceCount} U.S. occupations by employment`;
  qs("#heatmap-meta").textContent = `${rows.length} visible role${rows.length === 1 ? "" : "s"} • ${
    SORT_OPTIONS.find((item) => item.id === state.sortMode).label
  }`;

  const selected = getSelectedOccupation(rows);
  qs("#row-list").innerHTML = rows
    .map((occupation) => {
      const selectedTone = riskTone(occupation.riskByHorizon[state.horizon]);
      return `
        <article class="row ${selected && selected.occupationCode === occupation.occupationCode ? "is-selected" : ""}" data-code="${occupation.occupationCode}">
          <div class="row-top">
            <div><span class="rank-pill">${occupation.defaultSliceRank ? `#${occupation.defaultSliceRank}` : "Search"}</span></div>
            <div>
              <div class="occupation-title">${occupation.occupationName}</div>
              <div class="occupation-subtitle">${occupation.majorGroupName}</div>
              <div class="row-copy">${occupation.summary}</div>
            </div>
            <div>
              <div class="mini-label">U.S. workforce</div>
              <div class="metric-value">${occupation.employmentDisplay}</div>
            </div>
            <div>
              <div class="mini-label">Avg salary</div>
              <div class="metric-value">${occupation.annualMeanWageDisplay}</div>
              <div class="metric-subcopy">Yearly mean wage</div>
            </div>
            <div>
              <div class="mini-label">Family</div>
              <div class="family-tags">
                <span class="chip">${occupation.family}</span>
                <span class="chip" style="background:${selectedTone.background};border-color:${selectedTone.border}">${occupation.bucket}</span>
              </div>
            </div>
            <div>
              <div class="heatmap-head">
                <span class="mini-label">Heat map</span>
                <span class="mini-label">Now to 5 years</span>
              </div>
              <div class="heatmap-grid">
                ${HORIZONS.map((horizon) => {
                  const tone = riskTone(occupation.riskByHorizon[horizon.id]);
                  return `<div class="heat-cell ${state.horizon === horizon.id ? "active" : ""}" style="background:${tone.background};border-color:${tone.border}">${occupation.riskByHorizon[horizon.id]}%</div>`;
                }).join("")}
              </div>
            </div>
            <div>
              <div class="mini-label">${HORIZONS.find((item) => item.id === state.horizon).label}</div>
              <div class="selected-score" style="background:${selectedTone.background};border-color:${selectedTone.border}">
                <div class="value">${occupation.riskByHorizon[state.horizon]}%</div>
                <div class="metric-subcopy">${horizonDeltaLabel(occupation)}</div>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  qs("#row-list")
    .querySelectorAll("[data-code]")
    .forEach((row) => {
      row.addEventListener("click", () => {
        state.selectedCode = row.dataset.code;
        render();
      });
    });
}

function renderMethodology() {
  qs("#method-summary").textContent = state.data.methodology.summary;
  qs("#method-weights").innerHTML = state.data.methodology.weights
    .map((item) => `<span class="chip">${item.label}: ${item.value > 0 ? "+" : ""}${item.value}</span>`)
    .join("");
  qs("#market-signals").innerHTML = state.data.marketSignals
    .map(
      (signal) => `
        <div class="signal-card">
          <div class="source-title">${signal.title}</div>
          <p>${signal.detail}</p>
        </div>
      `,
    )
    .join("");
  qs("#sources").innerHTML = state.data.methodology.sources
    .map(
      (source) => `
        <a class="source-card" href="${source.url}" target="_blank" rel="noreferrer">
          <div>
            <div class="source-title">${source.label}</div>
            <div class="source-published">${source.published}</div>
          </div>
          <div>Open</div>
        </a>
      `,
    )
    .join("");
  qs("#refresh-note").textContent = `Refresh path: ${state.data.methodology.refreshCommand}`;
}

function renderControls() {
  const familySelect = qs("#family-filter");
  familySelect.innerHTML = FAMILY_FILTERS.map((family) => `<option value="${family}">${family}</option>`).join("");
  familySelect.value = state.family;

  buttonGroup(qs("#sort-controls"), SORT_OPTIONS, state.sortMode, (id) => {
    state.sortMode = id;
    render();
  });
  qs("#sort-note").textContent = `Current mode: ${SORT_OPTIONS.find((item) => item.id === state.sortMode).label}`;

  buttonGroup(qs("#horizon-controls"), HORIZONS, state.horizon, (id) => {
    state.horizon = id;
    render();
  });
}

function render() {
  renderHero();
  renderKpis();
  renderControls();
  renderMethodology();

  const defaultSlice = getDefaultSlice();
  const visibleRows = getVisibleRows();
  const selectedOccupation = getSelectedOccupation(visibleRows);
  if (selectedOccupation) {
    state.selectedCode = selectedOccupation.occupationCode;
    renderSpotlight(selectedOccupation);
  }

  const highestRiskLargeRoles = [...defaultSlice]
    .sort(
      (left, right) =>
        right.riskByHorizon[state.horizon] - left.riskByHorizon[state.horizon] ||
        right.employment - left.employment,
    )
    .slice(0, 5);

  const saferLargeRoles = [...defaultSlice]
    .sort(
      (left, right) =>
        left.riskByHorizon[state.horizon] - right.riskByHorizon[state.horizon] ||
        right.employment - left.employment,
    )
    .slice(0, 5);

  renderStackList("#watchlist", highestRiskLargeRoles);
  renderStackList("#safer-list", saferLargeRoles);
  renderHeatmapRows(visibleRows);
}

async function init() {
  const response = await fetch("./data/career-heatmap.json");
  state.data = await response.json();
  state.selectedCode = state.data.occupations[0]?.occupationCode || null;

  qs("#search-input").addEventListener("input", (event) => {
    state.search = event.target.value;
    render();
  });

  qs("#family-filter").addEventListener("change", (event) => {
    state.family = event.target.value;
    render();
  });

  render();
}

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `<div style="padding:32px;color:white;font-family:Inter,sans-serif">Failed to load Career Heatmap data.</div>`;
});
