"use strict";

// =====================================================
// University Details — Premium information architecture
// لا يحتاج أي تعديل على قاعدة البيانات.
// يستخدم الجداول الحالية نفسها:
// universities, admission_tracks, colleges,
// v_admission_ratios_admin, university_resources,
// university_sections
// =====================================================

let currentUniData = null;

const state = {
    university: null,
    tracks: [],
    colleges: [],
    ratios: [],
    resources: [],
    sections: [],
    majorQuery: "",
    selectedCollege: "all",
    selectedDegree: "all",
    ratioQuery: "",
    ratioYear: "all",
    toastTimer: null
};

const ADMISSION_CRITERIA = [
    { key: "step_required", label: "STEP", type: "value" },
    { key: "ielts_required", label: "IELTS", type: "value" },
    { key: "toefl_required", label: "TOEFL", type: "value" },
    { key: "duolingo_required", label: "Duolingo", type: "value" },
    { key: "sat_min", label: "SAT", type: "value" },
    { key: "sat_required", label: "SAT", type: "value" },
    { key: "gpa_required", label: "المعدل المطلوب", type: "value" },
    { key: "english_required", label: "اللغة الإنجليزية", type: "value" },

    { key: "interview_required", label: "مقابلة شخصية", type: "flag" },
    { key: "portfolio_required", label: "ملف أعمال", type: "flag" },
    { key: "recommendation_required", label: "خطاب توصية", type: "flag" },
    { key: "personal_statement_required", label: "Personal Statement", type: "flag" },
    { key: "essay_required", label: "Essay", type: "flag" },
    { key: "olympiad_required", label: "أولمبياد", type: "flag" }
];

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

function meaningful(value) {
    const text = String(value ?? "").trim();
    return Boolean(
        text &&
        text !== "--" &&
        text !== "غير محدد" &&
        text !== "لا توجد بيانات"
    );
}

function normalizeArabic(value) {
    return String(value ?? "")
        .normalize("NFKD")
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .replace(/ة/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/ئ/g, "ي")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function getUniversityIdFromUrl() {
    return new URLSearchParams(window.location.search).get("id");
}

function getRequestedMajor() {
    const params = new URLSearchParams(window.location.search);

    return (
        params.get("major") ||
        params.get("q") ||
        ""
    ).trim();
}

function getStoredScores() {
    return {
        q: parseFloat(localStorage.getItem("qodrat")) || 0,
        t: parseFloat(localStorage.getItem("tahsili")) || 0,
        s: parseFloat(localStorage.getItem("school")) || 0
    };
}

function normalizeWeight(value) {
    if (isEmpty(value)) return 0;

    const number = Number(value);
    if (Number.isNaN(number)) return 0;

    return number > 1 ? number / 100 : number;
}

function formatWeight(value) {
    if (isEmpty(value)) return null;

    const number = Number(value);
    if (Number.isNaN(number)) return null;

    return `${Math.round(number <= 1 ? number * 100 : number)}%`;
}

function formatPercent(value) {
    if (isEmpty(value)) return "--";

    const number = Number(value);
    if (Number.isNaN(number)) return "--";

    return `${number.toFixed(2)}%`;
}

function formatDate(value) {
    if (!value) return "غير محدد";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "غير محدد";

    return new Intl.DateTimeFormat("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function genderLabel(value) {
    const normalized = normalizeArabic(value);

    if (!normalized) return "";
    if (["male", "بنين", "طلاب", "ذكر"].includes(normalized)) return "طلاب";
    if (["female", "بنات", "طالبات", "انثى"].includes(normalized)) return "طالبات";
    if (["both", "mixed", "general", "عام", "طلاب وطالبات"].includes(normalized)) {
        return "طلاب وطالبات";
    }

    return String(value);
}

function degreeLabel(value) {
    const normalized = normalizeArabic(value);

    if (!normalized) return "";
    if (normalized.includes("بكالور")) return "بكالوريوس";
    if (normalized.includes("دبلوم")) return "دبلوم";
    if (normalized.includes("ماجستير")) return "ماجستير";
    if (normalized.includes("دكتور")) return "دكتوراه";

    return String(value);
}

function weightsForTrack(track) {
    if (!track) return {};

    if (Array.isArray(track.university_weights)) {
        return track.university_weights[0] || {};
    }

    return track.university_weights || {};
}

function getDefaultTrack() {
    return (
        state.tracks.find(track => track.is_default === true) ||
        state.tracks.find(track => Object.keys(weightsForTrack(track)).length) ||
        state.tracks[0] ||
        null
    );
}

function calculateTrack(track) {
    const weights = weightsForTrack(track);
    const scores = getStoredScores();

    const qWeight = normalizeWeight(weights.qodrat_weight);
    const tWeight = normalizeWeight(weights.tahsili_weight);
    const sWeight = normalizeWeight(weights.school_weight);

    const missing = [];

    if (qWeight > 0 && scores.q <= 0) missing.push("القدرات");
    if (tWeight > 0 && scores.t <= 0) missing.push("التحصيلي");
    if (sWeight > 0 && scores.s <= 0) missing.push("الثانوية");

    const hasWeights = qWeight > 0 || tWeight > 0 || sWeight > 0;

    return {
        hasWeights,
        missing,
        result: hasWeights && !missing.length
            ? (scores.q * qWeight) + (scores.t * tWeight) + (scores.s * sWeight)
            : null,
        weights: {
            q: qWeight,
            t: tWeight,
            s: sWeight
        },
        rawWeights: weights
    };
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
                value: String(value)
            });
        }
    });

    return result;
}

function showToast(message) {
    clearTimeout(state.toastTimer);

    $("toast").textContent = message;
    $("toast").classList.add("show");

    state.toastTimer = setTimeout(() => {
        $("toast").classList.remove("show");
    }, 1800);
}

function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";

    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    syncThemeIcon();
}

function syncThemeIcon() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";

    $("themeToggle").innerHTML = dark
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>';
}

async function shareUniversity() {
    const name = state.university?.name_ar || "الجامعة";

    try {
        if (navigator.share) {
            await navigator.share({
                title: `${name} | مُوجّه`,
                text: `اطلع على ملف ${name} في مُوجّه`,
                url: window.location.href
            });
            return;
        }

        await navigator.clipboard.writeText(window.location.href);
        showToast("تم نسخ رابط الجامعة");
    } catch (error) {
        if (error?.name !== "AbortError") {
            showToast("تعذر مشاركة الرابط");
        }
    }
}

function setSectionVisible(sectionId, visible, navKey = null) {
    const section = $(sectionId);
    if (section) section.hidden = !visible;

    if (navKey) {
        const link = document.querySelector(`[data-nav="${navKey}"]`);
        if (link) link.hidden = !visible;
    }
}

async function loadUniversityDetails() {
    const universityId = getUniversityIdFromUrl();

    if (!universityId) {
        window.location.href = "index.html";
        return;
    }

    renderLoading();

    try {
        const { data: university, error: universityError } = await supabaseClient
            .from("universities")
            .select("*")
            .eq("id", universityId)
            .single();

        if (universityError || !university) {
            throw new Error("لم يتم العثور على الجامعة");
        }

        currentUniData = university;
        state.university = university;

        const [
            tracksResponse,
            collegesResponse,
            ratiosResponse,
            resourcesResponse,
            sectionsResponse
        ] = await Promise.all([
            supabaseClient
                .from("admission_tracks")
                .select(`
                    *,
                    university_weights (*)
                `)
                .eq("university_id", universityId)
                .order("display_order", { ascending: true }),

            supabaseClient
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
                .eq("university_id", universityId)
                .eq("is_active", true)
                .order("display_order", { ascending: true }),

            supabaseClient
                .from("v_admission_ratios_admin")
                .select("*")
                .eq("university_id", universityId),

            supabaseClient
                .from("university_resources")
                .select("*")
                .eq("university_id", universityId)
                .eq("is_active", true)
                .order("display_order", { ascending: true }),

            supabaseClient
                .from("university_sections")
                .select("*")
                .eq("university_id", universityId)
                .eq("is_active", true)
                .order("display_order", { ascending: true })
        ]);

        if (tracksResponse.error) {
            console.warn("Admission tracks:", tracksResponse.error);
        }

        if (collegesResponse.error) {
            console.warn("Colleges:", collegesResponse.error);
        }

        if (ratiosResponse.error) {
            console.warn("Ratios:", ratiosResponse.error);
        }

        if (resourcesResponse.error) {
            console.warn("Resources:", resourcesResponse.error);
        }

        if (sectionsResponse.error) {
            console.warn("Sections:", sectionsResponse.error);
        }

        state.tracks = (tracksResponse.data || [])
            .filter(track => track.is_active !== false)
            .sort((a, b) => (a.display_order || 999) - (b.display_order || 999));

        state.colleges = (collegesResponse.data || [])
            .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
            .map(college => ({
                ...college,
                majors: (college.majors || [])
                    .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
            }));

        state.ratios = (ratiosResponse.data || [])
            .sort((a, b) => String(b.year || "").localeCompare(String(a.year || ""), "ar"));

        state.resources = resourcesResponse.data || [];
        state.sections = sectionsResponse.data || [];

        renderAll();
    } catch (error) {
        console.error("University details error:", error);
        renderError(error.message || "تعذر تحميل بيانات الجامعة");
    }
}

function renderAll() {
    renderUniversityBasic();
    renderSummary();
    renderCollegeFilters();
    renderDegreeFilter();
    renderColleges();
    renderAdmission();
    renderRatios();
    renderResources();
    renderSections();
    renderAbout();
    bindDataDrivenUI();
    setupSectionSpy();

    const requestedMajor = getRequestedMajor();

    if (requestedMajor) {
        state.majorQuery = requestedMajor;
        $("majorSearch").value = requestedMajor;
        renderColleges();
    }
}

function renderUniversityBasic() {
    const data = state.university;

    document.title = `${data.name_ar || "جامعة"} | مُوجّه`;
    $("uniName").textContent = data.name_ar || "--";
    $("uniLocation").querySelector("span").textContent =
        data.location_text ||
        [data.city, data.region].filter(Boolean).join("، ") ||
        "--";

    if (data.logo_url) {
        $("uniLogo").src = data.logo_url;
        $("uniLogo").alt = `شعار ${data.name_ar || "الجامعة"}`;
        $("uniLogo").onerror = () => $("uniLogoWrap").classList.add("hidden");
        $("uniLogoWrap").classList.remove("hidden");
    }

    const badges = [];

    const type = data.university_type || data.type;
    const gender = genderLabel(data.gender);
    const region = data.region;

    if (type) {
        badges.push(`<span class="hero-badge"><i class="fa-solid fa-building-columns"></i>${esc(type)}</span>`);
    }

    if (gender) {
        badges.push(`<span class="hero-badge"><i class="fa-solid fa-users"></i>${esc(gender)}</span>`);
    }

    if (region) {
        badges.push(`<span class="hero-badge"><i class="fa-solid fa-map"></i>${esc(region)}</span>`);
    }

    $("uniBadges").innerHTML = badges.join("");

    const website =
        data.website_url ||
        data.official_url ||
        data.website ||
        data.url ||
        "";

    if (website) {
        $("officialWebsite").href = website;
        $("officialWebsite").hidden = false;
    }

    $("lastUpdated").textContent = formatDate(
        data.updated_at ||
        data.housing_updated_at ||
        data.created_at
    );
}

function renderSummary() {
    const majorsCount = state.colleges.reduce(
        (total, college) => total + (college.majors || []).length,
        0
    );

    $("summaryColleges").textContent = state.colleges.length;
    $("summaryMajors").textContent = majorsCount;
    $("summaryTracks").textContent = state.tracks.length;
    $("summaryResources").textContent = state.resources.length;
}

function renderCollegeFilters() {
    const filters = [
        `<button class="filter-pill ${state.selectedCollege === "all" ? "active" : ""}" data-college="all">كل الكليات</button>`,
        ...state.colleges.map(college => `
            <button
                class="filter-pill ${state.selectedCollege === String(college.id) ? "active" : ""}"
                data-college="${esc(college.id)}"
            >
                ${esc(college.name)}
            </button>
        `)
    ];

    $("collegeFilters").innerHTML = filters.join("");
}

function renderDegreeFilter() {
    const degrees = unique(
        state.colleges.flatMap(college =>
            (college.majors || []).map(major => degreeLabel(major.degree))
        )
    ).sort((a, b) => a.localeCompare(b, "ar"));

    $("degreeFilter").innerHTML = `
        <option value="all">كل الدرجات</option>
        ${degrees.map(degree => `
            <option value="${esc(normalizeArabic(degree))}">
                ${esc(degree)}
            </option>
        `).join("")}
    `;

    $("degreeFilter").value = state.selectedDegree;
}

function getFilteredColleges() {
    const query = normalizeArabic(state.majorQuery);

    return state.colleges
        .filter(college =>
            state.selectedCollege === "all" ||
            String(college.id) === state.selectedCollege
        )
        .map(college => {
            const majors = (college.majors || []).filter(major => {
                const degree = normalizeArabic(degreeLabel(major.degree));

                const degreeMatches =
                    state.selectedDegree === "all" ||
                    degree === state.selectedDegree;

                const searchText = normalizeArabic([
                    major.code,
                    major.name,
                    major.degree,
                    major.gender,
                    major.note,
                    college.name
                ].filter(Boolean).join(" "));

                const queryMatches =
                    !query ||
                    searchText.includes(query);

                return degreeMatches && queryMatches;
            });

            return {
                ...college,
                filteredMajors: majors
            };
        })
        .filter(college =>
            !query && state.selectedDegree === "all"
                ? true
                : college.filteredMajors.length > 0
        );
}

function renderColleges() {
    const filteredColleges = getFilteredColleges();
    const query = normalizeArabic(state.majorQuery);

    const majorsCount = filteredColleges.reduce(
        (total, college) => total + college.filteredMajors.length,
        0
    );

    $("majorResultCount").textContent = `${majorsCount} تخصص`;

    if (!filteredColleges.length) {
        $("collegesGrid").innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <i class="fa-solid fa-magnifying-glass"></i>
                لم نجد تخصصًا مطابقًا. جرّب جزءًا أقصر من الاسم أو اختر كلية أخرى.
            </div>
        `;
        return;
    }

    $("collegesGrid").innerHTML = filteredColleges.map(college => `
        <article class="college-card">
            <header class="college-head">
                <div class="college-title">
                    <div class="college-icon">
                        <i class="fa-solid fa-building"></i>
                    </div>

                    <div>
                        <h3>${esc(college.name || "كلية")}</h3>
                        ${college.description ? `<p>${esc(college.description)}</p>` : ""}
                    </div>
                </div>

                <span class="college-count">
                    ${college.filteredMajors.length} تخصص
                </span>
            </header>

            <div class="major-list">
                ${college.filteredMajors.length
                    ? college.filteredMajors.map(major => {
                        const nameMatches = query &&
                            normalizeArabic([
                                major.code,
                                major.name,
                                major.note
                            ].filter(Boolean).join(" ")).includes(query);

                        const degree = degreeLabel(major.degree);
                        const gender = genderLabel(major.gender);

                        return `
                            <div class="major-row ${nameMatches ? "match" : ""}">
                                <span class="major-code">
                                    ${esc(major.code || "—")}
                                </span>

                                <div>
                                    <div class="major-name">
                                        ${esc(major.name || "تخصص غير محدد")}
                                    </div>

                                    ${(degree || gender) ? `
                                        <div class="major-meta">
                                            ${degree ? `
                                                <span class="meta-chip">
                                                    <i class="fa-solid fa-certificate"></i>
                                                    ${esc(degree)}
                                                </span>
                                            ` : ""}

                                            ${gender ? `
                                                <span class="meta-chip">
                                                    <i class="fa-solid fa-venus-mars"></i>
                                                    ${esc(gender)}
                                                </span>
                                            ` : ""}
                                        </div>
                                    ` : ""}

                                    ${major.note ? `
                                        <div class="major-note">
                                            ${esc(major.note)}
                                        </div>
                                    ` : ""}
                                </div>
                            </div>
                        `;
                    }).join("")
                    : `
                        <div class="empty-state">
                            لا توجد تخصصات مضافة في هذه الكلية.
                        </div>
                    `}
            </div>
        </article>
    `).join("");
}

function renderAdmission() {
    $("trackCount").textContent = `${state.tracks.length} مسار`;

    const defaultTrack = getDefaultTrack();

    renderDefaultScore(defaultTrack);

    if (!state.tracks.length) {
        $("admissionTracksGrid").innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <i class="fa-solid fa-route"></i>
                لم تتم إضافة مسارات القبول لهذه الجامعة.
            </div>
        `;
        return;
    }

    $("admissionTracksGrid").innerHTML = state.tracks
        .map(track => renderTrackCard(track))
        .join("");
}

function renderDefaultScore(track) {
    if (!track) {
        $("autoResultSection").hidden = true;
        $("scoreMessage").textContent = "لا يوجد مسار قبول افتراضي مسجل لهذه الجامعة.";
        return;
    }

    const calculation = calculateTrack(track);

    if (!calculation.hasWeights) {
        $("autoResultSection").hidden = true;
        $("scoreMessage").textContent = "لا توجد أوزان موزونة مسجلة للمسار الافتراضي.";
        return;
    }

    if (calculation.missing.length) {
        $("autoResultSection").hidden = true;
        $("scoreMessage").textContent =
            `أدخل درجات ${calculation.missing.join(" و")} في الأداة الرئيسية لإظهار موزونتك.`;
        return;
    }

    $("autoResultSection").hidden = false;
    $("finalResult").textContent = `${calculation.result.toFixed(2)}%`;

    const weights = calculation.rawWeights;

    $("weightLabels").innerHTML = `
        ${calculation.weights.q > 0 ? `<span>قدرات ${formatWeight(weights.qodrat_weight)}</span>` : ""}
        ${calculation.weights.t > 0 ? `<span>تحصيلي ${formatWeight(weights.tahsili_weight)}</span>` : ""}
        ${calculation.weights.s > 0 ? `<span>ثانوي ${formatWeight(weights.school_weight)}</span>` : ""}
    `;

    $("scoreMessage").textContent =
        `المسار الافتراضي المستخدم: ${track.name || "مسار القبول"}.`;
}

function renderTrackCard(track) {
    const calculation = calculateTrack(track);
    const weights = calculation.rawWeights;
    const criteria = buildCriteria(weights);

    const weightItems = [
        {
            label: "قدرات",
            value: formatWeight(weights.qodrat_weight),
            percent: calculation.weights.q * 100
        },
        {
            label: "تحصيلي",
            value: formatWeight(weights.tahsili_weight),
            percent: calculation.weights.t * 100
        },
        {
            label: "ثانوي",
            value: formatWeight(weights.school_weight),
            percent: calculation.weights.s * 100
        }
    ];

    return `
        <article class="track-card ${track.is_default ? "default" : ""}">
            <div class="track-head">
                <div class="track-name">
                    <div class="track-icon">
                        <i class="fa-solid ${track.is_default ? "fa-star" : "fa-route"}"></i>
                    </div>

                    <div>
                        <h3>${esc(track.name || "مسار قبول")}</h3>
                        ${track.description ? `<p>${esc(track.description)}</p>` : ""}
                    </div>
                </div>

                ${track.is_default ? `
                    <span class="default-badge">
                        <i class="fa-solid fa-check"></i>
                        افتراضي
                    </span>
                ` : ""}
            </div>

            ${calculation.hasWeights ? `
                <div class="weights-grid">
                    ${weightItems.map(item => `
                        <div class="weight-box">
                            <span>${item.label}</span>
                            <b>${item.value || "—"}</b>

                            <div class="weight-bar">
                                <span style="width:${Math.min(100, Math.max(0, item.percent))}%"></span>
                            </div>
                        </div>
                    `).join("")}
                </div>
            ` : ""}

            ${calculation.result !== null ? `
                <div class="track-result">
                    <span>موزونتك في هذا المسار</span>
                    <strong>${calculation.result.toFixed(2)}%</strong>
                </div>
            ` : calculation.missing.length ? `
                <div class="track-result">
                    <span>درجات مطلوبة للحساب</span>
                    <strong>${esc(calculation.missing.join("، "))}</strong>
                </div>
            ` : ""}

            ${criteria.length ? `
                <div class="criteria-list">
                    ${criteria.map(item => `
                        <span class="criteria-chip">
                            ${esc(item.label)}
                            ${item.value ? `<b>${esc(item.value)}</b>` : ""}
                        </span>
                    `).join("")}
                </div>
            ` : ""}

            ${weights.note ? `
                <div class="track-note">
                    <i class="fa-solid fa-circle-info"></i>
                    ${esc(weights.note)}
                </div>
            ` : ""}
        </article>
    `;
}

function renderRatios() {
    if (!state.ratios.length) {
        setSectionVisible("ratiosSection", false, "ratios");
        return;
    }

    setSectionVisible("ratiosSection", true, "ratios");

    const years = unique(
        state.ratios.map(item => String(item.year || "").trim())
    ).sort((a, b) => b.localeCompare(a, "ar"));

    $("ratioYearFilter").innerHTML = `
        <option value="all">كل السنوات</option>
        ${years.map(year => `
            <option value="${esc(year)}">${esc(year)}</option>
        `).join("")}
    `;

    $("ratioYearFilter").value = state.ratioYear;

    renderFilteredRatios();
}

function getFilteredRatios() {
    const query = normalizeArabic(state.ratioQuery);

    return state.ratios.filter(item => {
        const yearMatches =
            state.ratioYear === "all" ||
            String(item.year || "") === state.ratioYear;

        const searchText = normalizeArabic([
            item.major_code,
            item.major_name,
            item.college_name,
            item.ratio_type,
            item.note,
            item.year
        ].filter(Boolean).join(" "));

        const queryMatches =
            !query ||
            searchText.includes(query);

        return yearMatches && queryMatches;
    });
}

function renderFilteredRatios() {
    const ratios = getFilteredRatios();
    $("ratioCount").textContent = `${ratios.length} سجل`;

    if (!ratios.length) {
        $("ratiosContainer").innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-chart-simple"></i>
                لا توجد نسب مطابقة للبحث أو السنة المختارة.
            </div>
        `;
        return;
    }

    $("ratiosContainer").innerHTML = `
        <div class="ratio-head">
            <span>التخصص</span>
            <span>السنة</span>
            <span>النوع</span>
            <span>النسبة</span>
        </div>

        ${ratios.map(item => {
            const values = [];

            if (item.general_ratio !== null && item.general_ratio !== undefined) {
                values.push(`<span class="ratio-value">عام ${formatPercent(item.general_ratio)}</span>`);
            }

            if (item.male_ratio !== null && item.male_ratio !== undefined) {
                values.push(`<span class="ratio-value">طلاب ${formatPercent(item.male_ratio)}</span>`);
            }

            if (item.female_ratio !== null && item.female_ratio !== undefined) {
                values.push(`<span class="ratio-value">طالبات ${formatPercent(item.female_ratio)}</span>`);
            }

            if (!values.length || item.has_data === false) {
                values.push(`<span class="ratio-value">لا توجد بيانات</span>`);
            }

            return `
                <article class="ratio-row">
                    <div class="ratio-major">
                        <strong>
                            ${item.major_code ? `${esc(item.major_code)} — ` : ""}
                            ${esc(item.major_name || "تخصص غير محدد")}
                        </strong>

                        <span>${esc(item.college_name || "")}</span>

                        ${item.note ? `
                            <div class="ratio-note">${esc(item.note)}</div>
                        ` : ""}
                    </div>

                    <div class="ratio-year">
                        ${esc(item.year || "غير محدد")}
                    </div>

                    <div class="ratio-type">
                        ${esc(item.ratio_type || "نسبة قبول")}
                    </div>

                    <div class="ratio-values">
                        ${values.join("")}
                    </div>
                </article>
            `;
        }).join("")}
    `;
}

function resourceTypeLabel(type) {
    const labels = {
        admission: "القبول",
        conditions: "الشروط",
        housing: "السكن",
        ratios: "النسب",
        guide: "الأدلة",
        calendar: "التقويم",
        scholarship: "المنح والابتعاث",
        contact: "التواصل"
    };

    return labels[type] || "ملفات أخرى";
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

    return icons[type] || "fa-file";
}

function renderResources() {
    if (!state.resources.length) {
        setSectionVisible("resourcesSection", false, "resources");
        return;
    }

    setSectionVisible("resourcesSection", true, "resources");
    $("resourceCount").textContent = `${state.resources.length} ملف`;

    const groups = new Map();

    state.resources.forEach(resource => {
        const key = resource.resource_type || "other";

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(resource);
    });

    $("resourcesContainer").innerHTML = [...groups.entries()]
        .map(([type, files]) => `
            <section class="resource-group">
                <div class="resource-group-title">
                    <div>
                        <i class="fa-solid ${resourceIcon(type)}" style="color:var(--primary);margin-inline-end:6px"></i>
                        ${esc(resourceTypeLabel(type))}
                    </div>

                    <span>${files.length} ملف</span>
                </div>

                <div class="resources-grid">
                    ${files.map(file => `
                        <a
                            class="resource-card"
                            href="${esc(file.file_url || "#")}"
                            target="_blank"
                            rel="noopener"
                        >
                            <div class="resource-icon">
                                <i class="fa-solid ${resourceIcon(file.resource_type)}"></i>
                            </div>

                            <div>
                                <h3>${esc(file.title || "ملف الجامعة")}</h3>

                                ${file.description ? `
                                    <p>${esc(file.description)}</p>
                                ` : ""}

                                <div class="resource-meta">
                                    ${file.year ? `<span>${esc(file.year)}</span>` : ""}
                                    ${file.file_type ? `<span>${esc(file.file_type)}</span>` : ""}
                                    ${file.source_name ? `<span>${esc(file.source_name)}</span>` : ""}
                                    <span class="${file.is_official ? "official" : ""}">
                                        ${file.is_official ? "رسمي" : "غير رسمي"}
                                    </span>
                                </div>
                            </div>

                            <div class="resource-open">
                                <i class="fa-solid fa-arrow-up-left-from-square"></i>
                            </div>
                        </a>
                    `).join("")}
                </div>
            </section>
        `)
        .join("");
}

function renderSections() {
    if (!state.sections.length) {
        setSectionVisible("extraSections", false, "sections");
        return;
    }

    setSectionVisible("extraSections", true, "sections");
    $("sectionCount").textContent = `${state.sections.length} قسم`;

    $("sectionsContainer").innerHTML = state.sections.map((section, index) => `
        <details class="extra-card" ${index === 0 ? "open" : ""}>
            <summary>
                <span>${esc(section.title || "معلومة إضافية")}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </summary>

            <div class="extra-content">
                ${esc(section.content || "--")}
            </div>
        </details>
    `).join("");
}

function renderAbout() {
    const data = state.university;

    $("uniAbout").textContent = data.about || "--";
    $("statEmp").textContent = data.employment_rate_text || "--";
    $("statLocal").textContent = data.rank_local ? `#${data.rank_local}` : "--";
    $("statAccept").textContent = data.acceptance_difficulty || "--";
    $("uniCompetency").textContent = data.competitiveness || "--";

    const metricCards = [
        ["employment", data.employment_rate_text],
        ["rank", data.rank_local],
        ["acceptance", data.acceptance_difficulty],
        ["competition", data.competitiveness]
    ];

    metricCards.forEach(([key, value]) => {
        const card = document.querySelector(`[data-metric="${key}"]`);
        if (card) card.hidden = !meaningful(value);
    });

    const hasMetrics = metricCards.some(([, value]) => meaningful(value));
    const hasAbout = meaningful(data.about);

    setSectionVisible("aboutBlock", hasAbout || hasMetrics, "about");
    $("statsBlock").hidden = !hasMetrics;
    document.querySelector(".about-card").hidden = !hasAbout;
}

function renderLoading() {
    $("collegesGrid").innerHTML = `
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    `;

    $("admissionTracksGrid").innerHTML = `
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    `;
}

function renderError(message) {
    $("uniName").textContent = "تعذر تحميل بيانات الجامعة";

    document.querySelector(".content-column").innerHTML = `
        <div class="error-box">
            <i class="fa-solid fa-triangle-exclamation" style="display:block;font-size:28px;margin-bottom:10px"></i>
            ${esc(message)}
            <br>
            تأكد من رابط الجامعة وصلاحيات القراءة في Supabase.
        </div>
    `;
}

function bindDataDrivenUI() {
    $("majorSearch").addEventListener("input", event => {
        state.majorQuery = event.target.value.trim();
        renderColleges();
    });

    $("degreeFilter").addEventListener("change", event => {
        state.selectedDegree = event.target.value;
        renderColleges();
    });

    $("collegeFilters").addEventListener("click", event => {
        const button = event.target.closest("[data-college]");
        if (!button) return;

        state.selectedCollege = button.dataset.college;
        renderCollegeFilters();
        renderColleges();
    });

    $("ratioSearch").addEventListener("input", event => {
        state.ratioQuery = event.target.value.trim();
        renderFilteredRatios();
    });

    $("ratioYearFilter").addEventListener("change", event => {
        state.ratioYear = event.target.value;
        renderFilteredRatios();
    });
}

function setupSectionSpy() {
    const links = [...document.querySelectorAll(".side-link:not([hidden])")];
    const sections = links
        .map(link => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    const observer = new IntersectionObserver(entries => {
        const visible = entries
            .filter(entry => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        links.forEach(link => {
            link.classList.toggle(
                "active",
                link.getAttribute("href") === `#${visible.target.id}`
            );
        });
    }, {
        rootMargin: "-24% 0px -62% 0px",
        threshold: [0, .1, .3]
    });

    sections.forEach(section => observer.observe(section));
}

document.addEventListener("DOMContentLoaded", () => {
    syncThemeIcon();

    $("themeToggle").addEventListener("click", toggleTheme);
    $("shareUniversity").addEventListener("click", shareUniversity);

    loadUniversityDetails();
});
