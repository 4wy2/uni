// =====================================================
// University Details Page
// details.html?id=kfupm
// يسحب بيانات الجامعة من Supabase
// + يعرض كل مسارات القبول ومعاييرها بشكل مرتب
// + يعرض التخصصات مثل أول: رمز التخصص + الاسم فقط
// + يعرض ملفات Google Drive من university_resources
// =====================================================

let currentUniData = null;

function $(id) {
    return document.getElementById(id);
}

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function isEmpty(value) {
    return (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "null" ||
        value === "undefined"
    );
}

function getUniversityIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function getStoredScores() {
    return {
        q: parseFloat(localStorage.getItem("qodrat")) || 0,
        t: parseFloat(localStorage.getItem("tahsili")) || 0,
        s: parseFloat(localStorage.getItem("school")) || 0
    };
}

function formatPercent(value) {
    if (isEmpty(value)) return "--";

    const n = Number(value);
    if (Number.isNaN(n)) return "--";

    return `${n.toFixed(2)}%`;
}

function normalizeWeight(value) {
    if (isEmpty(value)) return 0;

    const n = Number(value);
    if (Number.isNaN(n)) return 0;

    // يدعم الحالتين:
    // 0.50 = 50%
    // 50   = 50%
    return n > 1 ? n / 100 : n;
}

function formatWeight(value) {
    if (isEmpty(value)) return null;

    const n = Number(value);
    if (Number.isNaN(n)) return null;

    if (n <= 1) {
        return `${Math.round(n * 100)}%`;
    }

    return `${n}%`;
}

function formatCriteriaValue(value) {
    if (isEmpty(value)) return "";

    if (typeof value === "boolean") {
        return value ? "" : "";
    }

    return String(value);
}

// هنا نتحكم بالمعايير اللي تظهر فقط
// أي Boolean مثل interview_required ما يكتب "نعم"
// إذا true يطلع اسم الشرط فقط، وإذا false يختفي
const ADMISSION_CRITERIA = [
    { key: "step_required", label: "STEP", type: "value" },
    { key: "ielts_required", label: "IELTS", type: "value" },
    { key: "toefl_required", label: "TOEFL", type: "value" },
    { key: "duolingo_required", label: "Duolingo", type: "value" },
    { key: "sat_min", label: "SAT", type: "value" },
    { key: "sat_required", label: "SAT", type: "value" },
    { key: "gpa_required", label: "المعدل المطلوب", type: "value" },
    { key: "english_required", label: "شرط اللغة الإنجليزية", type: "value" },

    { key: "interview_required", label: "مقابلة شخصية", type: "flag" },
    { key: "portfolio_required", label: "ملف أعمال", type: "flag" },
    { key: "recommendation_required", label: "خطاب توصية", type: "flag" },
    { key: "personal_statement_required", label: "Personal Statement", type: "flag" },
    { key: "essay_required", label: "Essay", type: "flag" },
    { key: "olympiad_required", label: "أولمبياد", type: "flag" }
];

function ensureDynamicStyles() {
    if (document.getElementById("universityDynamicStyles")) return;

    const style = document.createElement("style");
    style.id = "universityDynamicStyles";

    style.textContent = `
        .admission-tracks-grid{
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:14px;
        }

        .track-card-clean{
            padding:20px;
            border-radius:24px;
            overflow:hidden;
            transition:.18s ease;
        }

        .track-card-clean:hover{
            transform:translateY(-2px);
            border-color:var(--line-strong);
            box-shadow:var(--shadow-strong);
        }

        .track-card-clean.default{
            border-color:color-mix(in srgb,var(--primary) 34%,transparent);
            background:
                radial-gradient(420px 190px at 85% -35%,color-mix(in srgb,var(--primary) 16%,transparent),transparent 72%),
                var(--card-glass);
        }

        .track-head-clean{
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
            margin-bottom:14px;
        }

        .track-name-clean{
            display:flex;
            align-items:flex-start;
            gap:11px;
            min-width:0;
        }

        .track-icon-clean{
            width:44px;
            height:44px;
            border-radius:17px;
            display:grid;
            place-items:center;
            color:white;
            flex:none;
            background:linear-gradient(135deg,var(--primary),var(--primary-3));
            box-shadow:0 18px 34px -24px var(--primary);
        }

        .track-name-clean h3{
            color:var(--ink);
            font-size:15px;
            line-height:1.5;
            font-weight:900;
        }

        .track-name-clean p{
            color:var(--muted);
            font-size:12px;
            line-height:1.85;
            font-weight:600;
            margin-top:3px;
        }

        .track-default-badge{
            white-space:nowrap;
            display:inline-flex;
            align-items:center;
            gap:6px;
            color:var(--primary);
            background:color-mix(in srgb,var(--primary) 9%,transparent);
            border:1px solid color-mix(in srgb,var(--primary) 18%,transparent);
            border-radius:999px;
            padding:6px 10px;
            font-size:10px;
            font-weight:900;
        }

        .track-weights-clean{
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:8px;
            margin-top:12px;
        }

        .track-weight-clean{
            text-align:center;
            padding:11px 8px;
            border-radius:16px;
            background:var(--card-soft);
            border:1px solid var(--line);
        }

        .track-weight-clean span{
            display:block;
            color:var(--faint);
            font-size:10px;
            font-weight:900;
            margin-bottom:3px;
        }

        .track-weight-clean b{
            display:block;
            color:var(--primary);
            font-size:17px;
            font-weight:900;
        }

        .track-criteria-clean{
            display:flex;
            flex-wrap:wrap;
            gap:7px;
            margin-top:13px;
        }

        .criteria-chip-clean{
            display:inline-flex;
            align-items:center;
            gap:6px;
            padding:7px 10px;
            border-radius:999px;
            font-size:11px;
            font-weight:900;
            color:var(--primary);
            background:color-mix(in srgb,var(--primary) 8%,transparent);
            border:1px solid color-mix(in srgb,var(--primary) 18%,transparent);
        }

        .criteria-chip-clean b{
            color:var(--ink);
            font-weight:900;
        }

        .track-note-clean{
            margin-top:12px;
            padding:11px 12px;
            border-radius:16px;
            color:var(--muted);
            background:color-mix(in srgb,var(--primary) 6%,transparent);
            border:1px solid var(--line);
            font-size:12px;
            line-height:1.85;
            font-weight:600;
        }

        .track-note-clean i{
            color:var(--primary);
            margin-inline-end:5px;
        }

        @media(max-width:960px){
            .admission-tracks-grid{
                grid-template-columns:1fr;
            }
        }

        @media(max-width:560px){
            .track-weights-clean{
                grid-template-columns:1fr;
            }
        }
    `;

    document.head.appendChild(style);
}

function ensureQuickLink(targetId, label, iconClass) {
    const quickNav = document.querySelector(".quick-nav-inner");
    if (!quickNav) return;

    if (quickNav.querySelector(`a[href="#${targetId}"]`)) return;

    const link = document.createElement("a");
    link.href = `#${targetId}`;
    link.className = "quick-link";
    link.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        ${esc(label)}
    `;

    const collegesLink = quickNav.querySelector('a[href="#collegesSection"]');

    if (collegesLink) {
        collegesLink.insertAdjacentElement("beforebegin", link);
    } else {
        quickNav.appendChild(link);
    }
}

function ensureSection(id, afterId) {
    let wrapper = $(id);
    if (wrapper) return wrapper;

    const main = document.querySelector("main");
    if (!main) return null;

    wrapper = document.createElement("section");
    wrapper.id = id;
    wrapper.className = "student-section";

    const after = $(afterId);

    if (after && after.parentNode) {
        after.insertAdjacentElement("afterend", wrapper);
    } else {
        main.appendChild(wrapper);
    }

    return wrapper;
}

async function loadUniversityDetails() {
    const uniId = getUniversityIdFromUrl();

    if (!uniId) {
        window.location.href = "index.html";
        return;
    }

    ensureDynamicStyles();
    ensureQuickLink("admissionTracksSection", "مسارات القبول", "fa-list-check");

    try {
        // 1) بيانات الجامعة الأساسية
        const { data: university, error: uniError } = await supabaseClient
            .from("universities")
            .select("*")
            .eq("id", uniId)
            .single();

        if (uniError || !university) {
            throw new Error("University not found");
        }

        currentUniData = university;

        // 2) كل مسارات القبول + الأوزان
        const { data: tracks, error: tracksError } = await supabaseClient
            .from("admission_tracks")
            .select(`
                *,
                university_weights (*)
            `)
            .eq("university_id", uniId)
            .order("display_order", { ascending: true });

        if (tracksError) {
            console.error("Admission tracks error:", tracksError);
        }

        const activeTracks = (tracks || [])
            .filter(track => track.is_active !== false)
            .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));

        const defaultTrack =
            activeTracks.find(track => track.is_default === true) ||
            activeTracks.find(track => track.university_weights && track.university_weights.length) ||
            activeTracks[0] ||
            null;

        // 3) الكليات والتخصصات - مثل النسخة القديمة
        const { data: colleges, error: collegesError } = await supabaseClient
            .from("colleges")
            .select(`
                id,
                name,
                description,
                display_order,
                majors (
                    id,
                    code,
                    name,
                    degree,
                    gender,
                    note,
                    display_order
                )
            `)
            .eq("university_id", uniId)
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (collegesError) {
            console.error("Colleges error:", collegesError);
        }

        // 4) نسب القبول
        const { data: ratios, error: ratiosError } = await supabaseClient
            .from("v_admission_ratios_admin")
            .select("*")
            .eq("university_id", uniId);

        if (ratiosError) {
            console.error("Ratios error:", ratiosError);
        }

        // 5) ملفات وروابط الجامعة
        const { data: resources, error: resourcesError } = await supabaseClient
            .from("university_resources")
            .select("*")
            .eq("university_id", uniId)
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (resourcesError) {
            console.error("Resources error:", resourcesError);
        }

        // 6) الأقسام النصية
        const { data: sections, error: sectionsError } = await supabaseClient
            .from("university_sections")
            .select("*")
            .eq("university_id", uniId)
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (sectionsError) {
            console.error("Sections error:", sectionsError);
        }

        renderUniversityBasic(university);
        renderAutoCalculation(defaultTrack);
        renderAdmissionTracks(activeTracks);
        renderColleges(colleges || []);
        renderRatios(ratios || []);
        renderResources(resources || []);
        renderSections(sections || []);

    } catch (error) {
        console.error("Error Loading University:", error);
        renderError();
    }
}

function renderUniversityBasic(data) {
    document.title = `${data.name_ar || "جامعة"} | مُوجّه`;

    if ($("uniName")) {
        $("uniName").textContent = data.name_ar || "--";
    }

    const locationElement = $("uniLocation");
    const locationSpan = locationElement?.querySelector("span");

    if (locationSpan) {
        locationSpan.textContent = data.location_text || data.city || "--";
    } else if (locationElement) {
        locationElement.textContent = data.location_text || data.city || "--";
    }

    if ($("statEmp")) {
        $("statEmp").textContent = data.employment_rate_text || "--";
    }

    if ($("statLocal")) {
        $("statLocal").textContent = data.rank_local ? `#${data.rank_local}` : "--";
    }

    if ($("statAccept")) {
        $("statAccept").textContent = data.acceptance_difficulty || "--";
    }

    if ($("uniCompetency")) {
        $("uniCompetency").textContent = data.competitiveness || "--";
    }

    if ($("uniAbout")) {
        $("uniAbout").textContent = data.about || "--";
    }

    renderUniversityLogo(data);
}

function renderUniversityLogo(data) {
    const logoWrap = $("uniLogoWrap");
    const logoImg = $("uniLogo");

    if (!logoWrap || !logoImg) return;

    if (!data.logo_url) {
        logoWrap.classList.add("hidden");
        return;
    }

    logoImg.src = data.logo_url;
    logoImg.alt = `شعار ${data.name_ar || "الجامعة"}`;

    logoImg.onerror = () => {
        logoWrap.classList.add("hidden");
    };

    logoWrap.classList.remove("hidden");
}

function renderAutoCalculation(defaultTrack) {
    if (!defaultTrack || !defaultTrack.university_weights || !defaultTrack.university_weights.length) {
        return;
    }

    const weights = defaultTrack.university_weights[0];

    const { q, t, s } = getStoredScores();

    const qW = normalizeWeight(weights.qodrat_weight);
    const tW = normalizeWeight(weights.tahsili_weight);
    const sW = normalizeWeight(weights.school_weight);

    const needsQ = qW > 0;
    const needsT = tW > 0;
    const needsS = sW > 0;

    const hasRequiredScores =
        (!needsQ || q > 0) &&
        (!needsT || t > 0) &&
        (!needsS || s > 0);

    if (!hasRequiredScores) {
        return;
    }

    const total = (q * qW) + (t * tW) + (s * sW);

    const resultSection = $("autoResultSection");
    const finalResult = $("finalResult");
    const weightLabels = $("weightLabels");

    if (finalResult) {
        finalResult.textContent = `${total.toFixed(2)}%`;
    }

    if (weightLabels) {
        weightLabels.innerHTML = `
            ${needsQ ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">قدرات ${formatWeight(weights.qodrat_weight)}</span>` : ""}
            ${needsT ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">تحصيلي ${formatWeight(weights.tahsili_weight)}</span>` : ""}
            ${needsS ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">ثانوي ${formatWeight(weights.school_weight)}</span>` : ""}
        `;
    }

    if (resultSection) {
        resultSection.classList.remove("hidden");
    }
}

function renderAdmissionTracks(tracks) {
    const wrapper = ensureSection("admissionTracksSection", "scoreBlock");
    if (!wrapper) return;

    if (!tracks.length) {
        wrapper.innerHTML = "";
        return;
    }

    wrapper.innerHTML = `
        <div class="section-head">
            <div>
                <div class="section-kicker">
                    <i class="fa-solid fa-list-check"></i>
                    مهم قبل التقديم
                </div>

                <h2 class="section-title">
                    مسارات القبول ومعاييرها
                </h2>

                <p class="section-subtitle">
                    عرض مختصر وواضح للمسارات بدون تفاصيل مزعجة.
                </p>
            </div>

            <span class="section-chip">
                <i class="fa-solid fa-database"></i>
                ${tracks.length} مسار
            </span>
        </div>

        <div class="admission-tracks-grid">
            ${tracks.map(track => renderTrackCard(track)).join("")}
        </div>
    `;
}

function renderTrackCard(track) {
    const weights = Array.isArray(track.university_weights)
        ? track.university_weights
        : [];

    const firstWeight = weights[0] || {};

    const qW = formatWeight(firstWeight.qodrat_weight);
    const tW = formatWeight(firstWeight.tahsili_weight);
    const sW = formatWeight(firstWeight.school_weight);

    const criteria = buildCriteria(firstWeight);

    return `
        <div class="track-card-clean glass-card ${track.is_default ? "default" : ""}">
            <div class="track-head-clean">
                <div class="track-name-clean">
                    <div class="track-icon-clean">
                        <i class="fa-solid ${track.is_default ? "fa-star" : "fa-route"}"></i>
                    </div>

                    <div>
                        <h3>${esc(track.name || "مسار قبول")}</h3>
                        ${track.description ? `<p>${esc(track.description)}</p>` : ""}
                    </div>
                </div>

                ${track.is_default ? `
                    <span class="track-default-badge">
                        <i class="fa-solid fa-check"></i>
                        افتراضي
                    </span>
                ` : ""}
            </div>

            ${(qW || tW || sW) ? `
                <div class="track-weights-clean">
                    <div class="track-weight-clean">
                        <span>قدرات</span>
                        <b>${qW || "—"}</b>
                    </div>

                    <div class="track-weight-clean">
                        <span>تحصيلي</span>
                        <b>${tW || "—"}</b>
                    </div>

                    <div class="track-weight-clean">
                        <span>ثانوي</span>
                        <b>${sW || "—"}</b>
                    </div>
                </div>
            ` : ""}

            ${criteria.length ? `
                <div class="track-criteria-clean">
                    ${criteria.map(item => `
                        <span class="criteria-chip-clean">
                            ${esc(item.label)}
                            ${item.value ? `<b>${esc(item.value)}</b>` : ""}
                        </span>
                    `).join("")}
                </div>
            ` : ""}

            ${firstWeight.note ? `
                <div class="track-note-clean">
                    <i class="fa-solid fa-circle-info"></i>
                    ${esc(firstWeight.note)}
                </div>
            ` : ""}
        </div>
    `;
}

function buildCriteria(weight) {
    if (!weight) return [];

    const result = [];

    ADMISSION_CRITERIA.forEach(item => {
        const value = weight[item.key];

        if (item.type === "flag") {
            if (value === true) {
                result.push({
                    label: item.label,
                    value: ""
                });
            }
            return;
        }

        if (!isEmpty(value)) {
            result.push({
                label: item.label,
                value: formatCriteriaValue(value)
            });
        }
    });

    return result;
}

function renderColleges(colleges) {
    const collegesGrid = $("collegesGrid");
    if (!collegesGrid) return;

    if (!colleges.length) {
        collegesGrid.innerHTML = `
            <div class="glass-card p-6 rounded-3xl text-center text-gray-500 text-sm">
                لم يتم إضافة الكليات والتخصصات بعد.
            </div>
        `;
        return;
    }

    collegesGrid.innerHTML = colleges.map(college => {
        const majors = (college.majors || [])
            .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));

        return `
            <div class="glass-card p-6 rounded-3xl border border-white/5">
                <h4 class="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-graduation-cap"></i>
                    ${esc(college.name)}
                </h4>

                ${college.description ? `
                    <p class="text-[11px] text-gray-500 mb-4 leading-relaxed">
                        ${esc(college.description)}
                    </p>
                ` : ""}

                <div class="grid grid-cols-1 gap-2">
                    ${majors.length ? majors.map(major => `
                        <div class="text-xs text-gray-400 flex items-center justify-between gap-2 italic bg-white/[0.02] rounded-xl px-3 py-2">
                            <span class="flex items-center gap-2">
                                <span class="w-1 h-1 rounded-full bg-indigo-500/50"></span>
                                ${major.code ? `<b class="text-indigo-400 not-italic">${esc(major.code)}</b>` : ""}
                                ${esc(major.name || "تخصص غير محدد")}
                            </span>
                        </div>
                    `).join("") : `
                        <div class="text-xs text-gray-600">لا توجد تخصصات مضافة بعد.</div>
                    `}
                </div>
            </div>
        `;
    }).join("");
}

function renderRatios(ratios) {
    const ratiosSection = $("ratiosSection");
    const ratiosContainer = $("ratiosContainer");

    if (!ratiosSection || !ratiosContainer) return;

    if (!ratios.length) {
        ratiosSection.classList.add("hidden");
        return;
    }

    ratiosSection.classList.remove("hidden");

    ratiosContainer.innerHTML = ratios.map(item => {
        const ratioDisplay = item.has_data
            ? (
                item.general_ratio !== null
                    ? formatPercent(item.general_ratio)
                    : `بنين: ${formatPercent(item.male_ratio)} | بنات: ${formatPercent(item.female_ratio)}`
            )
            : "لا يوجد بيانات";

        return `
            <div class="glass-card p-4 rounded-2xl flex justify-between items-center hover:bg-white/5 transition-all border-l-2 border-transparent hover:border-indigo-500">
                <div>
                    <span class="text-xs font-bold text-gray-300">
                        ${item.major_code ? esc(item.major_code) + " - " : ""}${esc(item.major_name || "تخصص غير محدد")}
                    </span>
                    <p class="text-[10px] text-gray-600 mt-1">
                        ${esc(item.college_name || "")} · ${esc(item.year || "")}
                    </p>
                </div>

                <div class="text-left">
                    <p class="text-xs font-black ${item.has_data ? "text-indigo-400" : "text-gray-600"}">
                        ${esc(ratioDisplay)}
                    </p>
                    <p class="text-[8px] text-gray-500 mt-1">
                        ${esc(item.note || item.ratio_type || "")}
                    </p>
                </div>
            </div>
        `;
    }).join("");
}

function resourceIcon(type) {
    const icons = {
        admission: "fa-file-signature",
        conditions: "fa-list-check",
        housing: "fa-house-user",
        ratios: "fa-chart-simple",
        guide: "fa-book-open",
        calendar: "fa-calendar-days",
        scholarship: "fa-plane-departure",
        contact: "fa-address-book"
    };

    return icons[type] || "fa-file-pdf";
}

function resourceTypeLabel(type) {
    const labels = {
        admission: "القبول",
        conditions: "الشروط",
        housing: "السكن",
        ratios: "النسب",
        guide: "دليل",
        calendar: "تقويم",
        scholarship: "منح / ابتعاث",
        contact: "تواصل"
    };

    return labels[type] || "ملف";
}

function renderResources(resources) {
    let wrapper = $("resourcesSection");

    if (!wrapper) {
        const main = document.querySelector("main");
        const extraSections = $("extraSections");

        if (!main) return;

        wrapper = document.createElement("section");
        wrapper.id = "resourcesSection";
        wrapper.className = "student-section mb-10";

        if (extraSections && extraSections.parentNode) {
            extraSections.parentNode.insertBefore(wrapper, extraSections);
        } else {
            main.appendChild(wrapper);
        }
    }

    if (!resources.length) {
        wrapper.innerHTML = "";
        return;
    }

    wrapper.innerHTML = `
        <div class="section-head">
            <div>
                <div class="section-kicker">
                    <i class="fa-solid fa-folder-open"></i>
                    ملفات مهمة
                </div>

                <h2 class="section-title">
                    ملفات القبول والشروط
                </h2>

                <p class="section-subtitle">
                    روابط Google Drive مباشرة لملفات القبول أو السكن أو النسب.
                </p>
            </div>

            <span class="section-chip">
                <i class="fa-brands fa-google-drive"></i>
                Google Drive
            </span>
        </div>

        <div class="resources-grid">
            ${resources.map(file => `
                <a href="${esc(file.file_url)}" target="_blank" rel="noopener" class="resource-card glass-card">
                    <div class="resource-icon">
                        <i class="fa-solid ${resourceIcon(file.resource_type)}"></i>
                    </div>

                    <div class="resource-body">
                        <div class="resource-top">
                            <span>${esc(resourceTypeLabel(file.resource_type))}</span>
                            ${file.year ? `<b>${esc(file.year)}</b>` : ""}
                        </div>

                        <h3>${esc(file.title)}</h3>

                        ${file.description ? `
                            <p>${esc(file.description)}</p>
                        ` : ""}

                        <div class="resource-meta">
                            ${file.file_type ? `<span>${esc(file.file_type)}</span>` : ""}
                            ${file.is_official ? `<span>رسمي</span>` : `<span>غير رسمي</span>`}
                            ${file.source_name ? `<span>${esc(file.source_name)}</span>` : ""}
                        </div>
                    </div>

                    <div class="resource-open">
                        <i class="fa-solid fa-arrow-up-left-from-square"></i>
                    </div>
                </a>
            `).join("")}
        </div>
    `;
}

function renderSections(sections) {
    let sectionWrapper = $("extraSections");

    if (!sectionWrapper) {
        const main = document.querySelector("main");
        if (!main) return;

        sectionWrapper = document.createElement("section");
        sectionWrapper.id = "extraSections";
        sectionWrapper.className = "student-section mb-10";

        main.appendChild(sectionWrapper);
    }

    if (!sections.length) {
        sectionWrapper.innerHTML = "";
        return;
    }

    sectionWrapper.innerHTML = `
        <h3 class="text-lg font-black mb-6 flex items-center gap-2">
            <i class="fa-solid fa-circle-info text-indigo-500"></i>
            معلومات إضافية
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${sections.map(section => `
                <div class="glass-card p-6 rounded-3xl border border-white/5">
                    <h4 class="text-xs font-black text-indigo-500 uppercase tracking-widest mb-3">
                        ${esc(section.title)}
                    </h4>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        ${esc(section.content || "--")}
                    </p>
                </div>
            `).join("")}
        </div>
    `;
}

function renderError() {
    if ($("uniName")) {
        $("uniName").textContent = "تعذر تحميل بيانات الجامعة";
    }

    if ($("uniLocation")) {
        $("uniLocation").textContent = "--";
    }

    if ($("uniAbout")) {
        $("uniAbout").textContent =
            "تأكد من أن رابط الجامعة صحيح، وأن بيانات Supabase مضبوطة، وأن الجامعة موجودة في جدول universities.";
    }
}

document.addEventListener("DOMContentLoaded", loadUniversityDetails);
