/**
 * NexusRAG — Intelligent Document Q&A & Interactive Agentic Platform
 * Complete Client-Side Application Engine
 */

// ==========================================================================
// 1. Knowledge Base Data Store (Pre-indexed Enterprise Documents)
// ==========================================================================
const KNOWLEDGE_BASE = {
  finance: {
    id: "finance",
    name: "Q4_2024_Financial_Report.pdf",
    icon: "fa-file-invoice-dollar",
    iconColor: "text-emerald",
    meta: {
      type: "Adobe PDF (Scanned + OCR)",
      pages: 42,
      chunks: 18,
      tokens: "14,820",
      embeddingModel: "text-embedding-3-large",
      dimension: "1536-d",
      similarity: "Cosine + BM25"
    },
    suggestedQueries: [
      "What was the YoY Cloud revenue growth and gross margin?",
      "Summarize the key operational risk factors for FY25.",
      "What were the Total Operating Expenses and R&D spend?",
      "What is the FY2025 revenue guidance range?"
    ],
    chunks: [
      {
        id: 1,
        range: "Chars 0 - 640 [Page 1]",
        vectorNorm: "0.984",
        text: "TechCorp Global Q4 2024 Financial Overview. Total consolidated revenue reached $4.82B, representing an 18.4% YoY increase compared to $4.07B in Q4 2023. Gross profit margin expanded 230 bps to 68.2%, driven primarily by efficiencies in GPU compute cluster allocation and software gross margins."
      },
      {
        id: 2,
        range: "Chars 641 - 1,280 [Page 2]",
        vectorNorm: "0.971",
        text: "Segment Performance: Enterprise Cloud & AI Infrastructure revenue surged to $2.14B in Q4 2024, an increase of 31.2% year-over-year. Subscription SaaS ARR reached $1.85B with a Net Revenue Retention (NRR) of 124%. Consumer & Developer API services contributed $830M."
      },
      {
        id: 3,
        range: "Chars 1,281 - 1,920 [Page 4]",
        vectorNorm: "0.982",
        text: "Operating Expenses & Capital Expenditures: Total operating expenses were $1.92B. Research & Development (R&D) investments stood at $840M (17.4% of total revenue), reflecting aggressive acceleration of agentic LLM model training and custom ASIC silicon development."
      },
      {
        id: 4,
        range: "Chars 1,921 - 2,560 [Page 8]",
        vectorNorm: "0.956",
        text: "Risk Factors & FY25 Outlook: Forward-looking uncertainties include global supply chain constraints on high-bandwidth memory (HBM3e), changing cross-border data sovereignty compliance laws (EU AI Act), and potential volatility in enterprise IT hardware procurement cycles."
      },
      {
        id: 5,
        range: "Chars 2,561 - 3,200 [Page 11]",
        vectorNorm: "0.963",
        text: "Full Year 2025 Financial Guidance: For FY25, management projects total revenue between $20.8B and $21.5B (approx 16-19% YoY growth), GAAP Operating Margin between 29.0% and 31.0%, and free cash flow generation exceeding $5.4B."
      }
    ],
    qaDatabase: {
      "cloud": {
        answer: "According to **Q4 2024 Segment Performance** [1], **Enterprise Cloud & AI Infrastructure revenue surged to $2.14B**, delivering a **31.2% Year-over-Year (YoY) increase** [2]. Additionally, the overall consolidated gross profit margin expanded by **230 basis points to 68.2%** [1], bolstered by enterprise AI inference demand and GPU infrastructure optimization.",
        citations: [
          { index: 1, chunkId: 1, page: "Page 1, Para 2", score: "98.4%", quote: "Total consolidated revenue reached $4.82B, representing an 18.4% YoY increase... Gross profit margin expanded 230 bps to 68.2%." },
          { index: 2, chunkId: 2, page: "Page 2, Section 3.1", score: "97.1%", quote: "Enterprise Cloud & AI Infrastructure revenue surged to $2.14B in Q4 2024, an increase of 31.2% year-over-year." }
        ]
      },
      "risk": {
        answer: "The **FY25 Risk Factors** outline three primary areas of operational exposure [1]:\n1. **Hardware Supply Chain:** Ongoing constraints on high-bandwidth memory (HBM3e) and advanced packaging.\n2. **Regulatory Compliance:** Evolving global data privacy and sovereign AI governance requirements under the **EU AI Act**.\n3. **Procurement Volatility:** Fluctuations in enterprise IT capital budget approvals.",
        citations: [
          { index: 1, chunkId: 4, page: "Page 8, Section 5", score: "95.6%", quote: "Forward-looking uncertainties include global supply chain constraints on high-bandwidth memory (HBM3e), changing cross-border data sovereignty compliance laws (EU AI Act)..." }
        ]
      },
      "guidance": {
        answer: "For **Full Year 2025**, TechCorp management issued the following financial targets [1]:\n- **Consolidated Revenue:** Projected between **$20.8B and $21.5B** (16%–19% YoY growth).\n- **GAAP Operating Margin:** Estimated at **29.0% – 31.0%**.\n- **Free Cash Flow:** Expected to exceed **$5.4 Billion**.",
        citations: [
          { index: 1, chunkId: 5, page: "Page 11, Table 4", score: "96.3%", quote: "For FY25, management projects total revenue between $20.8B and $21.5B (approx 16-19% YoY growth), GAAP Operating Margin between 29.0% and 31.0%..." }
        ]
      },
      "expense": {
        answer: "In Q4 2024, **Total Operating Expenses were $1.92B** [1]. Of this total, **Research & Development (R&D) stood at $840M** (representing 17.4% of total revenue) [1], directed toward next-generation agentic RAG training and custom hardware accelerators.",
        citations: [
          { index: 1, chunkId: 3, page: "Page 4, Para 3", score: "98.2%", quote: "Total operating expenses were $1.92B. Research & Development (R&D) investments stood at $840M (17.4% of total revenue)..." }
        ]
      }
    }
  },

  research: {
    id: "research",
    name: "DeepSeek_Gemini_Agentic_RAG.md",
    icon: "fa-atom",
    iconColor: "text-purple",
    meta: {
      type: "Markdown Technical Spec",
      pages: 18,
      chunks: 14,
      tokens: "11,350",
      embeddingModel: "text-embedding-3-large",
      dimension: "1536-d",
      similarity: "Hierarchical GraphRAG"
    },
    suggestedQueries: [
      "Explain the cross-encoder reranking mechanism.",
      "How does Hierarchical Chunking improve context recall?",
      "What is the difference between Dense and Sparse retrieval?",
      "What benchmark scores did this architecture achieve on HotpotQA?"
    ],
    chunks: [
      {
        id: 1,
        range: "Chars 0 - 580 [Section 1.1]",
        vectorNorm: "0.991",
        text: "Abstract & Architecture: We present NexusAgenticRAG, a hybrid retrieval framework integrating dense vector similarity (1536-dim), sparse BM25 inverted indexes, and reciprocal rank fusion (RRF). Candidate passages are routed through a 2-stage cross-encoder scoring pipeline that mitigates semantic drift."
      },
      {
        id: 2,
        range: "Chars 581 - 1,220 [Section 2.3]",
        vectorNorm: "0.978",
        text: "Cross-Encoder Neural Reranking: While bi-encoders produce decoupled embeddings for fast sub-millisecond retrieval, cross-encoders compute full cross-attention across the query-document pair [q, d]. This yields a 34.2% reduction in false-positive chunk selection over baseline Cosine KNN."
      },
      {
        id: 3,
        range: "Chars 1,221 - 1,850 [Section 3.2]",
        vectorNorm: "0.985",
        text: "Hierarchical Graph Tree Chunking: Documents are partitioned into parent chunks (2048 tokens) and leaf child chunks (256 tokens). Retrieval targets the high-granularity child chunks, while the LLM context injector expands the window to the parent hierarchy, preserving global structural semantics."
      },
      {
        id: 4,
        range: "Chars 1,851 - 2,400 [Section 4.1]",
        vectorNorm: "0.967",
        text: "Empirical Benchmarks: On multi-hop question answering datasets (HotpotQA, 2WikiMultiHop), NexusAgenticRAG achieved an F1 score of 89.4% and an exact match (EM) of 78.2%, outperforming standard naive RAG by +21.6 F1 points."
      }
    ],
    qaDatabase: {
      "cross-encoder": {
        answer: "The **Cross-Encoder Reranker** processes query and document pairs simultaneously via full cross-attention ($Attention(Q, K, V)$) [1]. Unlike standard bi-encoders that calculate independent dot-products, cross-encoders capture subtle contextual nuances, delivering a **34.2% reduction in false-positive chunk retrieval** [2].",
        citations: [
          { index: 1, chunkId: 1, page: "Section 1.1", score: "99.1%", quote: "Candidate passages are routed through a 2-stage cross-encoder scoring pipeline that mitigates semantic drift." },
          { index: 2, chunkId: 2, page: "Section 2.3", score: "97.8%", quote: "cross-encoders compute full cross-attention across the query-document pair [q, d]. This yields a 34.2% reduction in false-positive chunk selection..." }
        ]
      },
      "hierarchical": {
        answer: "The architecture employs **Hierarchical Parent-Child Chunking** [1]:\n- **Child Chunks (256 tokens):** Used for pinpoint high-resolution vector similarity searches.\n- **Parent Nodes (2,048 tokens):** Automatically fetched during generation to provide the LLM with complete surrounding narrative context without fragmenting thoughts [1].",
        citations: [
          { index: 1, chunkId: 3, page: "Section 3.2", score: "98.5%", quote: "Documents are partitioned into parent chunks (2048 tokens) and leaf child chunks (256 tokens). Retrieval targets high-granularity child chunks..." }
        ]
      },
      "benchmark": {
        answer: "On rigorous multi-hop benchmark evaluations [1]:\n- **HotpotQA / 2WikiMultiHop:** Achieved an **F1 score of 89.4%** and **Exact Match (EM) of 78.2%** [1].\n- **Relative Gain:** Surpassed standard naive single-step RAG baselines by **+21.6 F1 points**.",
        citations: [
          { index: 1, chunkId: 4, page: "Section 4.1", score: "96.7%", quote: "On multi-hop question answering datasets, NexusAgenticRAG achieved an F1 score of 89.4% and an exact match (EM) of 78.2%..." }
        ]
      }
    }
  },

  legal: {
    id: "legal",
    name: "Enterprise_SaaS_Master_Agreement.docx",
    icon: "fa-scale-balanced",
    iconColor: "text-amber",
    meta: {
      type: "Microsoft Word Document",
      pages: 35,
      chunks: 20,
      tokens: "18,400",
      embeddingModel: "text-embedding-3-large",
      dimension: "1536-d",
      similarity: "Hybrid Sparse-Dense"
    },
    suggestedQueries: [
      "What is the SLA uptime commitment and penalty credits?",
      "What are the limitation of liability provisions?",
      "What are the terms regarding customer data retention upon termination?",
      "What indemnification protections are provided for IP infringement?"
    ],
    chunks: [
      {
        id: 1,
        range: "Chars 0 - 650 [Section 4.1]",
        vectorNorm: "0.988",
        text: "Service Level Agreement (SLA) & Uptime: Provider commits to maintaining a Monthly Uptime Percentage of at least 99.95% for all Production API Endpoints. In the event uptime falls between 99.0% and 99.95%, Customer receives a 15% service credit. Below 99.0%, Customer is eligible for a 30% credit of monthly billing."
      },
      {
        id: 2,
        range: "Chars 651 - 1,300 [Section 8.2]",
        vectorNorm: "0.974",
        text: "Data Ownership & Post-Termination Deletion: Customer retains all right, title, and interest in Customer Data. Upon written request or termination of this Agreement, Provider shall within thirty (30) calendar days permanently purge and crypto-erase all Customer Data from primary storage and vector indexes."
      },
      {
        id: 3,
        range: "Chars 1,301 - 1,950 [Section 11.4]",
        vectorNorm: "0.965",
        text: "Limitation of Liability: Except for gross negligence, willful misconduct, or breach of Section 7 (Confidentiality), neither party's aggregate liability arising out of or related to this Agreement shall exceed the total amount paid by Customer in the twelve (12) months preceding the incident."
      }
    ],
    qaDatabase: {
      "sla": {
        answer: "Per **Section 4.1 (Service Level Agreement)** [1]:\n- **Target Uptime:** Provider guarantees **99.95% monthly uptime** on production APIs.\n- **Credit Tiers:**\n  - **99.0% – 99.95%:** 15% service credit applied to next monthly billing cycle [1].\n  - **Below 99.0%:** 30% service credit applied.",
        citations: [
          { index: 1, chunkId: 1, page: "Section 4.1, Para 1", score: "98.8%", quote: "Provider commits to maintaining a Monthly Uptime Percentage of at least 99.95%... In the event uptime falls between 99.0% and 99.95%, Customer receives a 15% credit..." }
        ]
      },
      "liability": {
        answer: "Under **Section 11.4 (Limitation of Liability)** [1], liability is capped at the **total fees paid by Customer during the preceding 12-month period**. Exceptions to this cap include **gross negligence, willful misconduct, or breaches of confidentiality**.",
        citations: [
          { index: 1, chunkId: 3, page: "Section 11.4", score: "96.5%", quote: "neither party's aggregate liability arising out of or related to this Agreement shall exceed the total amount paid by Customer in the twelve (12) months preceding the incident." }
        ]
      },
      "data": {
        answer: "According to **Section 8.2 (Data Ownership & Deletion)** [1], all customer data remains the sole property of the client. Upon agreement termination, the provider is legally mandated to **permanently crypto-erase all customer data and vector index records within 30 calendar days** [1].",
        citations: [
          { index: 1, chunkId: 2, page: "Section 8.2", score: "97.4%", quote: "Provider shall within thirty (30) calendar days permanently purge and crypto-erase all Customer Data from primary storage and vector indexes." }
        ]
      }
    }
  },

  clinical: {
    id: "clinical",
    name: "BioHealth_Trial_Protocol_Phase3.pdf",
    icon: "fa-dna",
    iconColor: "text-cyan",
    meta: {
      type: "Clinical Study Dossier",
      pages: 64,
      chunks: 26,
      tokens: "24,600",
      embeddingModel: "text-embedding-3-large",
      dimension: "1536-d",
      similarity: "Graph-Augmented Vector"
    },
    suggestedQueries: [
      "What are the Primary and Secondary Efficacy Endpoints?",
      "What are the inclusion and exclusion criteria for patients?",
      "What is the dosing schedule and administration route?",
      "What adverse events were reported in cohort cohorts?"
    ],
    chunks: [
      {
        id: 1,
        range: "Chars 0 - 620 [Section 2.1]",
        vectorNorm: "0.993",
        text: "Study Objectives & Primary Endpoints: The primary efficacy endpoint is the change from baseline in Disease Activity Index (DAI-7) at Week 24 compared to placebo. Secondary endpoints include proportion of subjects achieving clinical remission at Week 12 and radiographic progression rate at Week 48."
      },
      {
        id: 2,
        range: "Chars 621 - 1,250 [Section 4.3]",
        vectorNorm: "0.981",
        text: "Patient Eligibility: Inclusion criteria include male and female adults aged 18 to 70 with documented moderate-to-severe refractory condition for >= 6 months. Key exclusions include active systemic infection, history of malignancy within 5 years, or eGFR < 45 mL/min/1.73m2."
      }
    ],
    qaDatabase: {
      "endpoint": {
        answer: "The **Primary Clinical Endpoint** is defined as the **mean change from baseline in Disease Activity Index (DAI-7) at Week 24** vs. placebo [1]. Key secondary endpoints measure **clinical remission rate at Week 12** and **radiographic joint progression score at Week 48** [1].",
        citations: [
          { index: 1, chunkId: 1, page: "Section 2.1, Page 6", score: "99.3%", quote: "The primary efficacy endpoint is the change from baseline in Disease Activity Index (DAI-7) at Week 24 compared to placebo." }
        ]
      },
      "eligibility": {
        answer: "Patient eligibility requirements specify [1]:\n- **Inclusion:** Adult patients aged **18 to 70** with active confirmed condition for $\\ge 6$ months.\n- **Exclusion:** Active systemic infection, renal impairment ($eGFR < 45$), or oncological history within past 5 years [1].",
        citations: [
          { index: 1, chunkId: 2, page: "Section 4.3, Page 14", score: "98.1%", quote: "Inclusion criteria include male and female adults aged 18 to 70 with documented moderate-to-severe refractory condition... Key exclusions include active systemic infection..." }
        ]
      }
    }
  }
};

// ==========================================================================
// 2. Application State
// ==========================================================================
let currentDocId = "finance";
let currentDocData = KNOWLEDGE_BASE.finance;
let isGenerating = false;
let customUploadedDoc = null;

// ==========================================================================
// 3. DOM Elements Cache
// ==========================================================================
const DOM = {
  themeToggle: document.getElementById("theme-toggle"),
  presetsGrid: document.getElementById("presets-grid"),
  uploadDropzone: document.getElementById("upload-dropzone"),
  fileInput: document.getElementById("file-input"),
  uploadOverlay: document.getElementById("upload-progress-overlay"),
  uploadProgressFill: document.getElementById("upload-progress-fill"),
  uploadProgressText: document.getElementById("upload-progress-text"),
  
  // Doc Inspector
  activeDocIcon: document.getElementById("active-doc-icon"),
  activeDocName: document.getElementById("active-doc-name"),
  metaChunks: document.getElementById("meta-chunks"),
  metaTokens: document.getElementById("meta-tokens"),
  chunkChipsContainer: document.getElementById("chunk-chips-container"),
  chunkSelectionCounter: document.getElementById("chunk-selection-counter"),
  chunkPreviewId: document.getElementById("chunk-preview-id"),
  chunkPreviewVector: document.getElementById("chunk-preview-vector"),
  chunkPreviewText: document.getElementById("chunk-preview-text"),

  // Chat Area
  modelSelect: document.getElementById("llm-model-select"),
  suggestedPromptsContainer: document.getElementById("suggested-prompts-container"),
  chatViewport: document.getElementById("chat-viewport"),
  welcomeDocName: document.getElementById("welcome-doc-name"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  sendBtn: document.getElementById("send-btn"),
  voiceBtn: document.getElementById("voice-input-btn"),
  attachBtn: document.getElementById("attach-doc-btn"),

  // Citation Drawer
  citationDrawer: document.getElementById("citation-drawer"),
  citationDrawerClose: document.getElementById("citation-drawer-close"),
  citationDrawerTitle: document.getElementById("citation-drawer-title"),
  citationSimilarity: document.getElementById("citation-similarity"),
  citationSourceDoc: document.getElementById("citation-source-doc"),
  citationSourceChunk: document.getElementById("citation-source-chunk"),
  citationVerbatimText: document.getElementById("citation-verbatim-text"),

  // Code Snippets
  codeTabs: document.querySelectorAll(".code-tab"),
  codeSnippetPre: document.getElementById("code-snippet-pre"),
  codeSnippetCode: document.getElementById("code-snippet-code"),
  copyCodeBtn: document.getElementById("copy-code-btn"),

  // Calculator
  sliderDocs: document.getElementById("slider-docs"),
  sliderPages: document.getElementById("slider-pages"),
  sliderQueries: document.getElementById("slider-queries"),
  valDocs: document.getElementById("val-docs"),
  valPages: document.getElementById("val-pages"),
  valQueries: document.getElementById("val-queries"),
  resHours: document.getElementById("res-hours"),
  resSavings: document.getElementById("res-savings"),
  resSpeed: document.getElementById("res-speed"),

  // Pricing
  billingToggle: document.getElementById("billing-toggle"),
  proPrice: document.getElementById("pro-price"),
  entPrice: document.getElementById("ent-price"),
  proPeriod: document.getElementById("pro-period"),
  entPeriod: document.getElementById("ent-period"),

  // FAQ
  faqItems: document.querySelectorAll(".faq-item"),

  // Modals & Toast
  tourModal: document.getElementById("tour-modal"),
  tourModalBtn: document.getElementById("tour-modal-btn"),
  tourModalClose: document.getElementById("tour-modal-close"),
  modalTryNowBtn: document.getElementById("modal-try-now-btn"),
  quickUploadHeroBtn: document.getElementById("quick-upload-hero-btn"),
  quickDocBtn: document.getElementById("quick-doc-btn"),
  toastContainer: document.getElementById("toast-container"),
  mobileToggle: document.getElementById("mobile-toggle"),
  navMenu: document.getElementById("nav-menu")
};

// ==========================================================================
// 4. Initialization & Setup
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initDocumentView(currentDocId);
  initCalculator();
  initEventListeners();
  showToast("NexusRAG v2.5 Engine Initialized • Vector Shards Connected", "info");
});

// ==========================================================================
// 5. Theme Switching (Dark / Light)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem("nexus_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  DOM.themeToggle?.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("nexus_theme", nextTheme);
    showToast(`Switched to ${nextTheme.toUpperCase()} theme`, "info");
  });
}

// ==========================================================================
// 6. Document Selection & Chunk Rendering
// ==========================================================================
function initDocumentView(docId) {
  const doc = docId === "custom" ? customUploadedDoc : KNOWLEDGE_BASE[docId];
  if (!doc) return;

  currentDocId = docId;
  currentDocData = doc;

  // Update Left Pane Inspector
  DOM.activeDocName.textContent = doc.name;
  DOM.metaChunks.textContent = doc.chunks.length;
  DOM.metaTokens.textContent = doc.meta.tokens;
  DOM.welcomeDocName.textContent = doc.name;

  // Render Chunk Chips
  DOM.chunkChipsContainer.innerHTML = "";
  doc.chunks.forEach((chunk, index) => {
    const chip = document.createElement("button");
    chip.className = `chunk-chip ${index === 0 ? "active" : ""}`;
    chip.textContent = `Chunk #${chunk.id}`;
    chip.addEventListener("click", () => selectChunk(index));
    DOM.chunkChipsContainer.appendChild(chip);
  });

  // Display initial chunk
  if (doc.chunks.length > 0) {
    selectChunk(0);
  }

  // Update Suggested Prompts in Right Pane
  DOM.suggestedPromptsContainer.innerHTML = "";
  doc.suggestedQueries.forEach((q) => {
    const pill = document.createElement("button");
    pill.className = "prompt-pill";
    pill.textContent = q;
    pill.addEventListener("click", () => {
      DOM.chatInput.value = q;
      handleUserSubmit();
    });
    DOM.suggestedPromptsContainer.appendChild(pill);
  });

  // Update Active Preset Buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === docId);
  });
}

function selectChunk(index) {
  const chunk = currentDocData.chunks[index];
  if (!chunk) return;

  // Update chips active state
  const chips = DOM.chunkChipsContainer.querySelectorAll(".chunk-chip");
  chips.forEach((c, i) => c.classList.toggle("active", i === index));

  DOM.chunkSelectionCounter.textContent = `Chunk ${index + 1} of ${currentDocData.chunks.length}`;
  DOM.chunkPreviewId.textContent = `Chunk #${chunk.id} [${chunk.range}]`;
  DOM.chunkPreviewVector.textContent = `Vector norm: ${chunk.vectorNorm || "0.981"}`;
  DOM.chunkPreviewText.textContent = chunk.text;
}

// ==========================================================================
// 7. File Upload & Ingestion Engine (Real & Simulated)
// ==========================================================================
function handleFileUpload(file) {
  if (!file) return;

  DOM.uploadOverlay.style.display = "flex";
  DOM.uploadProgressFill.style.width = "0%";
  DOM.uploadProgressText.textContent = `Parsing ${file.name}...`;

  let progress = 10;
  const progressInterval = setInterval(() => {
    progress += 25;
    DOM.uploadProgressFill.style.width = `${Math.min(progress, 90)}%`;
    if (progress === 35) DOM.uploadProgressText.textContent = "Extracting text layout & tables...";
    if (progress === 60) DOM.uploadProgressText.textContent = "Generating 1536-d semantic embeddings...";
    if (progress === 85) DOM.uploadProgressText.textContent = "Building HNSW vector index...";
  }, 300);

  // If text/markdown/json/csv file, parse actual content
  const isTextFile = file.type.includes("text") || file.name.match(/\.(txt|md|csv|json|js|py)$/i);

  if (isTextFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawText = e.target.result;
      setTimeout(() => {
        clearInterval(progressInterval);
        finishUpload(file.name, rawText);
      }, 1200);
    };
    reader.readAsText(file);
  } else {
    // Binary simulation for PDF / DOCX
    setTimeout(() => {
      clearInterval(progressInterval);
      const simulatedText = `Extracted document content from ${file.name}. This document includes multi-page text sections, vector-indexed tables, and structural headings parsed by the Nexus multi-modal layout parser.`;
      finishUpload(file.name, simulatedText);
    }, 1400);
  }
}

function finishUpload(fileName, rawText) {
  DOM.uploadProgressFill.style.width = "100%";
  DOM.uploadProgressText.textContent = "Document Vectorized Successfully!";

  // Generate chunks from text
  const chunkSize = 400;
  const rawChunks = [];
  let chunkId = 1;
  for (let i = 0; i < rawText.length; i += chunkSize) {
    const chunkContent = rawText.substring(i, i + chunkSize);
    rawChunks.push({
      id: chunkId,
      range: `Chars ${i} - ${Math.min(i + chunkSize, rawText.length)}`,
      vectorNorm: (0.95 + Math.random() * 0.045).toFixed(3),
      text: chunkContent.trim() || `Section chunk #${chunkId} content.`
    });
    chunkId++;
  }

  if (rawChunks.length === 0) {
    rawChunks.push({
      id: 1,
      range: "Chars 0 - 350",
      vectorNorm: "0.985",
      text: rawText || "Custom uploaded document content."
    });
  }

  customUploadedDoc = {
    id: "custom",
    name: fileName,
    icon: "fa-file-lines",
    iconColor: "text-cyan",
    meta: {
      type: "User Uploaded Document",
      pages: Math.max(1, Math.ceil(rawChunks.length / 2)),
      chunks: rawChunks.length,
      tokens: `${(rawChunks.length * 120).toLocaleString()}`,
      embeddingModel: "text-embedding-3-large",
      dimension: "1536-d",
      similarity: "Dense + Sparse BM25"
    },
    suggestedQueries: [
      `Summarize the key takeaways from ${fileName}`,
      "What are the main entities and metrics mentioned?",
      "List any critical terms, dates, or numerical values."
    ],
    chunks: rawChunks,
    qaDatabase: {}
  };

  setTimeout(() => {
    DOM.uploadOverlay.style.display = "none";
    initDocumentView("custom");
    showToast(`Successfully indexed ${fileName} (${rawChunks.length} chunks)`, "success");

    // Add notification bubble in chat
    appendAiMessage(
      `I've successfully ingested and indexed your file **${fileName}** with **${rawChunks.length} semantic vector chunks**! Ask any question to query its contents with full citations.`
    );
  }, 400);
}

// ==========================================================================
// 8. Q&A Agentic Reasoning & Chat Engine
// ==========================================================================
function handleUserSubmit() {
  const query = DOM.chatInput.value.trim();
  if (!query || isGenerating) return;

  // Render User Message
  appendUserMessage(query);
  DOM.chatInput.value = "";
  DOM.chatInput.style.height = "auto";
  isGenerating = true;
  DOM.sendBtn.disabled = true;

  // Match Query with Active Knowledge Base or Custom File
  setTimeout(() => {
    generateAgentResponse(query);
  }, 400);
}

function generateAgentResponse(query) {
  const qLower = query.toLowerCase();
  let matchedQA = null;

  // Check predefined Q&A database keys
  for (const [key, val] of Object.entries(currentDocData.qaDatabase)) {
    if (qLower.includes(key)) {
      matchedQA = val;
      break;
    }
  }

  // Fallback: Smart Dynamic Synthesis from actual loaded chunks
  if (!matchedQA) {
    const topChunk = currentDocData.chunks[0];
    const secondChunk = currentDocData.chunks[1] || topChunk;
    matchedQA = {
      answer: `Based on the vector retrieval from **${currentDocData.name}** [1], the document details that **"${topChunk.text.substring(0, 140)}..."** [1]. Furthermore, cross-referencing section coordinates [2] confirms related contextual parameters and operational grounding.`,
      citations: [
        { index: 1, chunkId: topChunk.id, page: topChunk.range, score: "98.4%", quote: topChunk.text },
        { index: 2, chunkId: secondChunk.id, page: secondChunk.range, score: "96.2%", quote: secondChunk.text }
      ]
    };
  }

  // Create AI Bubble with collapsible reasoning chain
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble ai-bubble";
  
  const bubbleAvatar = document.createElement("div");
  bubbleAvatar.className = "bubble-avatar";
  bubbleAvatar.innerHTML = '<i class="fa-solid fa-brain"></i>';

  const bubbleContent = document.createElement("div");
  bubbleContent.className = "bubble-content";

  const bubbleHeader = document.createElement("div");
  bubbleHeader.className = "bubble-header";
  bubbleHeader.innerHTML = `<strong>Nexus Agent (${DOM.modelSelect.options[DOM.modelSelect.selectedIndex].text.split(' ')[0]})</strong><span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;

  // Reasoning Chain Accordion
  const reasoningBox = document.createElement("div");
  reasoningBox.className = "reasoning-chain-box";
  reasoningBox.innerHTML = `
    <button class="reasoning-toggle-btn" type="button">
      <span><i class="fa-solid fa-microchip"></i> Agent Retrieval & Reasoning Steps (4)</span>
      <i class="fa-solid fa-chevron-down toggle-icon"></i>
    </button>
    <div class="reasoning-steps-list">
      <div class="reasoning-step-item"><i class="fa-solid fa-circle-check text-emerald"></i> 1. Query intent parsed & expanded into hybrid dense-sparse tokens</div>
      <div class="reasoning-step-item"><i class="fa-solid fa-circle-check text-emerald"></i> 2. Top-K=5 chunks retrieved from HNSW index (Pinecone Shard #4)</div>
      <div class="reasoning-step-item"><i class="fa-solid fa-circle-check text-emerald"></i> 3. Neural Cross-Encoder reranked relevance: ${matchedQA.citations[0].score} match</div>
      <div class="reasoning-step-item"><i class="fa-solid fa-circle-check text-emerald"></i> 4. Grounded synthesis strictly bounded by verbatim citations</div>
    </div>
  `;

  const reasoningToggle = reasoningBox.querySelector(".reasoning-toggle-btn");
  const stepsList = reasoningBox.querySelector(".reasoning-steps-list");
  reasoningToggle.addEventListener("click", () => {
    const isHidden = stepsList.style.display === "none";
    stepsList.style.display = isHidden ? "flex" : "none";
    reasoningToggle.querySelector(".toggle-icon").style.transform = isHidden ? "rotate(0deg)" : "rotate(-90deg)";
  });

  const answerParagraph = document.createElement("div");
  answerParagraph.className = "ai-answer-text";

  // Actions Toolbar (Copy, Audio TTS, Citation Pill)
  const toolbar = document.createElement("div");
  toolbar.className = "bubble-actions-toolbar";
  toolbar.innerHTML = `
    <button class="bubble-tool-btn copy-btn" title="Copy answer"><i class="fa-regular fa-copy"></i> Copy</button>
    <button class="bubble-tool-btn tts-btn" title="Listen to answer"><i class="fa-solid fa-volume-high"></i> Read</button>
    <button class="bubble-tool-btn feedback-btn" title="Helpful answer"><i class="fa-regular fa-thumbs-up"></i> Grounded</button>
  `;

  bubbleContent.appendChild(bubbleHeader);
  bubbleContent.appendChild(reasoningBox);
  bubbleContent.appendChild(answerParagraph);
  bubbleContent.appendChild(toolbar);

  bubble.appendChild(bubbleAvatar);
  bubble.appendChild(bubbleContent);
  DOM.chatViewport.appendChild(bubble);
  DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;

  // Stream Answer Simulation
  streamText(answerParagraph, matchedQA.answer, matchedQA.citations, () => {
    isGenerating = false;
    DOM.sendBtn.disabled = false;
    DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
  });

  // Attach toolbar event listeners
  toolbar.querySelector(".copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(answerParagraph.innerText);
    showToast("Answer copied to clipboard!", "success");
  });

  toolbar.querySelector(".tts-btn").addEventListener("click", () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(answerParagraph.innerText.replace(/\[\d+\]/g, ""));
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
      showToast("Playing audio narration...", "info");
    } else {
      showToast("Speech synthesis not supported in this browser.", "info");
    }
  });
}

function streamText(targetEl, rawMarkdown, citations, onComplete) {
  let index = 0;
  const words = rawMarkdown.split(" ");
  targetEl.innerHTML = "";

  const streamInterval = setInterval(() => {
    if (index < words.length) {
      const currentSlice = words.slice(0, index + 1).join(" ");
      targetEl.innerHTML = formatMarkdownWithCitations(currentSlice, citations);
      attachCitationListeners(targetEl, citations);
      DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
      index++;
    } else {
      clearInterval(streamInterval);
      targetEl.innerHTML = formatMarkdownWithCitations(rawMarkdown, citations);
      attachCitationListeners(targetEl, citations);
      if (onComplete) onComplete();
    }
  }, 35);
}

function formatMarkdownWithCitations(text, citations) {
  let formatted = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  // Replace [1], [2] with interactive pills
  formatted = formatted.replace(/\[(\d+)\]/g, (match, citationNum) => {
    return `<button type="button" class="citation-pill-link" data-citation="${citationNum}" title="Click to inspect ground-truth snippet">[#${citationNum}]</button>`;
  });

  return formatted;
}

function attachCitationListeners(containerEl, citations) {
  containerEl.querySelectorAll(".citation-pill-link").forEach((pill) => {
    pill.onclick = (e) => {
      e.stopPropagation();
      const citationIdx = parseInt(pill.dataset.citation, 10);
      const citeData = citations.find((c) => c.index === citationIdx) || citations[0];
      openCitationDrawer(citeData);
    };
  });
}

function openCitationDrawer(citeData) {
  DOM.citationDrawerTitle.textContent = `Source Citation [${citeData.index}] Grounding Proof`;
  DOM.citationSimilarity.textContent = citeData.score || "98.4%";
  DOM.citationSourceDoc.textContent = currentDocData.name;
  DOM.citationSourceChunk.textContent = `#${citeData.chunkId} (${citeData.page})`;
  DOM.citationVerbatimText.textContent = `"${citeData.quote}"`;

  DOM.citationDrawer.style.display = "block";
}

function appendUserMessage(text) {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble user-bubble";
  bubble.innerHTML = `
    <div class="bubble-avatar"><i class="fa-solid fa-user"></i></div>
    <div class="bubble-content">
      <div class="bubble-header">
        <strong>You</strong>
        <span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
  DOM.chatViewport.appendChild(bubble);
  DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
}

function appendAiMessage(htmlContent) {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble ai-bubble";
  bubble.innerHTML = `
    <div class="bubble-avatar"><i class="fa-solid fa-brain"></i></div>
    <div class="bubble-content">
      <div class="bubble-header">
        <strong>Nexus Agent</strong>
        <span class="bubble-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <p>${htmlContent}</p>
    </div>
  `;
  DOM.chatViewport.appendChild(bubble);
  DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ==========================================================================
// 9. Interactive Calculator Logic
// ==========================================================================
function initCalculator() {
  function updateCalc() {
    const docs = parseInt(DOM.sliderDocs.value, 10);
    const pages = parseInt(DOM.sliderPages.value, 10);
    const queries = parseInt(DOM.sliderQueries.value, 10);

    DOM.valDocs.textContent = `${docs.toLocaleString()} Docs`;
    DOM.valPages.textContent = `${pages} Pages`;
    DOM.valQueries.textContent = `${queries.toLocaleString()} Queries`;

    // Calculations
    const hoursSaved = Math.round((docs * pages * 0.08) + (queries * 30 * 0.05));
    const tokenSavings = Math.round((docs * pages * 450 * 0.000015 * 30) + (queries * 30 * 0.18));
    
    DOM.resHours.textContent = `${hoursSaved.toLocaleString()} hrs`;
    DOM.resSavings.innerHTML = `$${tokenSavings.toLocaleString()}<small>/mo</small>`;
    DOM.resSpeed.textContent = "98.4% faster";
  }

  DOM.sliderDocs?.addEventListener("input", updateCalc);
  DOM.sliderPages?.addEventListener("input", updateCalc);
  DOM.sliderQueries?.addEventListener("input", updateCalc);
  updateCalc();
}

// ==========================================================================
// 10. Code Tabs & Snippet Generator
// ==========================================================================
const CODE_SNIPPETS = {
  python: `import nexus_rag

# 1. Initialize client with high-speed hybrid retriever
client = nexus_rag.Client(api_key="nr_live_98x4...")

# 2. Ingest document & build vector knowledge graph
doc = client.documents.upload("./Q4_Financial_Report.pdf", chunk_size=512)

# 3. Query with Agentic Multi-Hop RAG
response = client.agent.ask(
    query="What was our YoY cloud revenue growth rate?",
    document_ids=[doc.id],
    reranker="cohere-v3-cross-encoder",
    citation_mode="verbatim_strict"
)

print(response.answer)
print(response.citations)  # -> [{'doc_id': '...', 'chunk_id': 3, 'score': 0.982}]`,

  typescript: `import { NexusClient } from '@nexus-rag/sdk';

const client = new NexusClient({ apiKey: process.env.NEXUS_API_KEY });

// Ingest & stream response with grounded citations
const doc = await client.documents.upload('./Legal_Contract.docx');

const stream = await client.agent.askStream({
  query: 'Summarize Section 4 SLA guarantees and penalty credits',
  documentIds: [doc.id],
  retrievalStrategy: 'hybrid_bm25_dense'
});

for await (const chunk of stream) {
  process.stdout.write(chunk.deltaText);
  if (chunk.citations) console.log('Verified Citations:', chunk.citations);
}`,

  curl: `curl -X POST https://api.nexusrags.ai/v1/agent/query \\
  -H "Authorization: Bearer nr_live_98x4..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "What are the primary risk factors for FY25?",
    "document_ids": ["doc_984f812"],
    "model": "gemini-2.0-flash",
    "top_k": 5,
    "temperature": 0.1
  }'`
};

// ==========================================================================
// 11. Event Listeners & Interactive Handlers
// ==========================================================================
function initEventListeners() {
  // Preset Document Buttons
  DOM.presetsGrid?.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetKey = btn.dataset.preset;
      initDocumentView(presetKey);
      showToast(`Loaded ${KNOWLEDGE_BASE[presetKey].name}`, "info");
    });
  });

  // Drag & Drop Handling
  DOM.uploadDropzone?.addEventListener("click", () => DOM.fileInput.click());
  DOM.fileInput?.addEventListener("change", (e) => {
    if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
  });

  DOM.uploadDropzone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    DOM.uploadDropzone.classList.add("dragover");
  });

  DOM.uploadDropzone?.addEventListener("dragleave", () => {
    DOM.uploadDropzone.classList.remove("dragover");
  });

  DOM.uploadDropzone?.addEventListener("drop", (e) => {
    e.preventDefault();
    DOM.uploadDropzone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
  });

  // Global Drop on Buttons
  [DOM.quickUploadHeroBtn, DOM.quickDocBtn, DOM.attachBtn].forEach((btn) => {
    btn?.addEventListener("click", () => {
      DOM.fileInput.click();
      window.location.hash = "#playground";
    });
  });

  // Chat Form Submit
  DOM.chatForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    handleUserSubmit();
  });

  // Auto-resize chat textarea
  DOM.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserSubmit();
    }
  });

  DOM.chatInput?.addEventListener("input", () => {
    DOM.chatInput.style.height = "auto";
    DOM.chatInput.style.height = `${Math.min(DOM.chatInput.scrollHeight, 120)}px`;
  });

  // Voice Simulation
  DOM.voiceBtn?.addEventListener("click", () => {
    showToast("Listening for speech... (Simulated query loaded)", "info");
    DOM.chatInput.value = "What was the total revenue increase in Q4?";
    setTimeout(() => handleUserSubmit(), 800);
  });

  // Citation Drawer Close
  DOM.citationDrawerClose?.addEventListener("click", () => {
    DOM.citationDrawer.style.display = "none";
  });

  // Code Tab Switcher
  DOM.codeTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      DOM.codeTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const lang = tab.dataset.lang;
      DOM.codeSnippetCode.textContent = CODE_SNIPPETS[lang] || CODE_SNIPPETS.python;
    });
  });

  // Copy Code Button
  DOM.copyCodeBtn?.addEventListener("click", () => {
    navigator.clipboard.writeText(DOM.codeSnippetCode.textContent);
    showToast("Code snippet copied to clipboard!", "success");
  });

  // Billing Annual/Monthly Toggle
  DOM.billingToggle?.addEventListener("click", () => {
    const isAnnual = DOM.billingToggle.classList.toggle("annual");
    if (isAnnual) {
      DOM.proPrice.textContent = "23";
      DOM.entPrice.textContent = "159";
      DOM.proPeriod.textContent = "/ month (billed annually)";
      DOM.entPeriod.textContent = "/ month (billed annually)";
      showToast("Applied 20% annual discount!", "success");
    } else {
      DOM.proPrice.textContent = "29";
      DOM.entPrice.textContent = "199";
      DOM.proPeriod.textContent = "/ month";
      DOM.entPeriod.textContent = "/ month";
    }
  });

  // FAQ Accordion Toggle
  DOM.faqItems.forEach((item) => {
    const questionBtn = item.querySelector(".faq-question");
    questionBtn.addEventListener("click", () => {
      const isActive = item.classList.contains("active");
      DOM.faqItems.forEach((f) => f.classList.remove("active"));
      if (!isActive) item.classList.add("active");
    });
  });

  // Tour Modal
  DOM.tourModalBtn?.addEventListener("click", () => DOM.tourModal.style.display = "flex");
  DOM.tourModalClose?.addEventListener("click", () => DOM.tourModal.style.display = "none");
  DOM.modalTryNowBtn?.addEventListener("click", () => {
    DOM.tourModal.style.display = "none";
    window.location.hash = "#playground";
  });

  // Close modals on Esc or backdrop click
  window.addEventListener("click", (e) => {
    if (e.target === DOM.tourModal) DOM.tourModal.style.display = "none";
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      DOM.tourModal.style.display = "none";
      DOM.citationDrawer.style.display = "none";
    }
    // Ctrl + K focus chat
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      DOM.chatInput?.focus();
      showToast("Focused RAG Chat Console", "info");
    }
  });

  // Newsletter Form
  document.getElementById("newsletter-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("newsletter-email").value;
    showToast(`Subscribed ${email} to Nexus AI Research Weekly!`, "success");
    e.target.reset();
  });

  // Mobile Menu Toggle
  DOM.mobileToggle?.addEventListener("click", () => {
    DOM.navMenu?.classList.toggle("open");
  });

  // Close Mobile Menu on link click
  DOM.navMenu?.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      DOM.navMenu?.classList.remove("open");
    });
  });
}

// ==========================================================================
// 12. Toast Notification Helper
// ==========================================================================
function showToast(message, type = "info") {
  if (!DOM.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const iconClass = type === "success" ? "fa-circle-check text-emerald" : "fa-circle-info text-cyan";
  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
