// =====================================================
// University Details Page
// details.html?id=kfupm
// يسحب بيانات الجامعة من Supabase
// + يعرض كل مسارات القبول ومعاييرها
// + يعرض ملفات Google Drive من university_resources
// + يحاول عرض أي بيانات إضافية إذا أضفت أعمدة جديدة لاحقًا
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

function isEmptyValue(value) {
    return (
        value === null ||
        value === undefined ||
        value === "" ||
        value === "null" ||
        value === "undefined" ||
        (Array.isArray(value) && value.length === 0)
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
    if (value === null || value === undefined || value === "") return "--";
    return `${Number(value).toFixed(2)}%`;
}

function formatWeight(value) {
    if (value === null || value === undefined || value === "") return null;

    const n = Number(value);
    if (Number.isNaN(n)) return null;

    if (n <= 1) {
        return `${Math.round(n * 100)}%`;
    }

    return `${n}%`;
}

function formatValue(value) {
    if (isEmptyValue(value)) return "";

    if (typeof value === "boolean") {
        return value ? "نعم" : "لا";
    }

    if (typeof value === "number") {
        return String(value);
    }

    if (typeof value === "string") {
        if (value.startsWith("http://") || value.startsWith("https://")) {
            return `<a href="${esc(value)}" target="_blank" rel="noopener" class="inline-link">فتح الرابط</a>`;
        }

        return esc(value);
    }

    if (Array.isArray(value)) {
        return value.map(v => esc(v)).join("، ");
    }

    if (typeof value === "object") {
        return esc(JSON.stringify(value));
    }

    return esc(value);
}

function fieldLabel(key) {
    const labels = {
        id: "المعرّف",
        university_id: "الجامعة",
        track_id: "المسار",
        admission_track_id: "المسار",
        name: "الاسم",
        title: "العنوان",
        description: "الوصف",
        content: "المحتوى",
        note: "ملاحظة",
        notes: "ملاحظات",

        qodrat_weight: "القدرات",
        tahsili_weight: "التحصيلي",
        school_weight: "الثانوي",

        step_required: "STEP",
        ielts_required: "IELTS",
        toefl_required: "TOEFL",
        duolingo_required: "Duolingo",
        sat_min: "SAT",
        sat_required: "SAT",
        gpa_required: "المعدل المطلوب",
        interview_required: "مقابلة شخصية",
        portfolio_required: "ملف أعمال",
        recommendation_required: "خطاب توصية",
        personal_statement_required: "Personal Statement",
        essay_required: "مقال / Essay",
        olympiad_required: "أولمبياد",
        english_required: "شرط اللغة الإنجليزية",

        is_default: "المسار الافتراضي",
        is_active: "نشط",
        is_official: "رسمي",
        display_order: "الترتيب",
        created_at: "تاريخ الإضافة",
        updated_at: "آخر تحديث",

        resource_type: "نوع الملف",
        file_url: "رابط الملف",
        file_type: "نوع الملف",
        source_name: "المصدر",
        year: "السنة",

        code: "الرمز",
        degree: "الدرجة",
        gender: "الفئة",
        college_name: "الكلية",
        major_name: "التخصص",
        major_code: "رمز التخصص",
        general_ratio: "النسبة العامة",
        male_ratio: "نسبة البنين",
        female_ratio: "نسبة البنات",
        ratio_type: "نوع النسبة",
        has_data: "توجد بيانات"
    };

    if (labels[key]) return labels[key];

    return key
        .replaceAll("_", " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

function renderExtraFields(obj, ignoredKeys = []) {
    if (!obj || typeof obj !== "object") return "";

    const ignored = new Set(ignoredKeys);

    const fields = Object.entries(obj).filter(([key, value]) => {
        if (ignored.has(key)) return false;
        if (key.startsWith("_")) return false;
        if (isEmptyValue(value)) return false;
        if (Array.isArray(value)) return false;
        if (typeof value === "object") return false;
        return true;
    });

    if (!fields.length) return "";

    return `
        <div class="auto-extra-fields">
            ${fields.map(([key, value]) => `
                <div class="auto-extra-item">
                    <span>${esc(fieldLabel(key))}</span>
                    <b>${formatValue(value)}</b>
                </div>
            `).join("")}
        </div>
    `;
}

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

        .track-card{
            padding:20px;
            border-radius:24px;
            transition:.18s ease;
            overflow:hidden;
        }

        .track-card:hover{
            transform:translateY(-2px);
            border-color:var(--line-strong);
            box-shadow:var(--shadow-strong);
        }

        .track-card.default{
            border-color:color-mix(in srgb,var(--primary) 32%,transparent);
            background:
                radial-gradient(360px 180px at 80% -30%,color-mix(in srgb,var(--primary) 16%,transparent),transparent 70%),
                var(--card-glass);
        }

        .track-top{
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:12px;
            margin-bottom:12px;
        }

        .track-title{
            display:flex;
            align-items:center;
            gap:10px;
            min-width:0;
        }

        .track-icon{
            width:44px;
            height:44px;
            flex:none;
            border-radius:17px;
            display:grid;
            place-items:center;
            color:white;
            background:linear-gradient(135deg,var(--primary),var(--primary-3));
            box-shadow:0 18px 34px -24px var(--primary);
        }

        .track-title h3{
            color:var(--ink);
            font-size:15px;
            font-weight:900;
            line-height:1.45;
        }

        .track-title p{
            color:var(--muted);
            font-size:12px;
            line-height:1.8;
            margin-top:3px;
            font-weight:600;
        }

        .track-badge{
            display:inline-flex;
            align-items:center;
            gap:6px;
            white-space:nowrap;
            padding:6px 10px;
            border-radius:999px;
            color:var(--primary);
            background:color-mix(in srgb,var(--primary) 9%,transparent);
            border:1px solid color-mix(in srgb,var(--primary) 18%,transparent);
            font-size:10px;
            font-weight:900;
        }

        .weights-row{
            display:grid;
            grid-template-columns:repeat(3,1fr);
            gap:8px;
            margin-top:12px;
        }

        .weight-box{
            padding:11px 8px;
            border-radius:16px;
            text-align:center;
            background:var(--card-soft);
            border:1px solid var(--line);
        }

        .weight-box span{
            display:block;
            color:var(--faint);
            font-size:10px;
            font-weight:900;
            margin-bottom:3px;
        }

        .weight-box b{
            display:block;
            color:var(--primary);
            font-size:17px;
            font-weight:900;
        }

        .track-note{
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

        .track-note i{
            color:var(--primary);
            margin-inline-end:5px;
        }

        .criteria-grid{
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:8px;
            margin-top:12px;
        }

        .criteria-item{
            padding:9px 10px;
            border-radius:14px;
            background:var(--card-soft);
            border:1px solid var(--line);
            min-width:0;
        }

        .criteria-item span{
            display:block;
            color:var(--faint);
            font-size:10px;
            font-weight:900;
            margin-bottom:3px;
        }

        .criteria-item b{
            color:var(--ink);
            font-size:12px;
            line-height:1.6;
            font-weight:900;
            word-break:break-word;
        }

        .auto-extra-fields{
            display:grid;
            grid-template-columns:repeat(2,minmax(0,1fr));
            gap:8px;
            margin-top:12px;
        }

        .auto-extra-item{
            padding:9px 10px;
            border-radius:14px;
            background:var(--card-soft);
            border:1px solid var(--line);
            min-width:0;
        }

        .auto-extra-item span{
            display:block;
            color:var(--faint);
            font-size:10px;
            font-weight:900;
            margin-bottom:3px;
        }

        .auto-extra-item b{
            color:var(--ink);
            font-size:12px;
            line-height:1.6;
            font-weight:900;
            word-break:break-word;
        }

        .major-meta{
            display:flex;
            flex-wrap:wrap;
            gap:5px;
            margin-top:5px;
        }

        .major-meta span{
            font-size:9px;
            font-weight:800;
            color:var(--faint);
            background:var(--card-soft);
            border:1px solid var(--line);
            padding:3px 7px;
            border-radius:999px;
        }

        .inline-link{
            color:var(--primary);
            font-weight:900;
            text-decoration:underline;
        }

        @media(max-width:960px){
            .admission-tracks-grid{
                grid-template-columns:1fr;
            }

            .weights-row{
                grid-template-columns:repeat(3,1fr);
            }
        }

        @media(max-width:560px){
            .weights-row,
            .criteria-grid,
            .auto-extra-fields{
                grid-template-columns:1fr;
            }
        }
    `;

    document.head.appendChild(style);
}

function ensureQuickLink(targetId, label, iconClass) {
    const quickNav = document.querySelector(".quick-nav-inner");
    if (!quickNav) return;

    const exists = quickNav.querySelector(`a[href="#${targetId}"]`);
    if (exists) return;

    const ratiosLink = quickNav.querySelector('a[href="#ratiosSection"]');
    const link = document.createElement("a");

    link.href = `#${targetId}`;
    link.className = "quick-link";
    link.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        ${esc(label)}
    `;

    if (ratiosLink) {
        ratiosLink.insertAdjacentElement("beforebegin", link);
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

        // 2) كل مسارات القبول + كل المعايير والبيانات الموجودة داخل university_weights
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

        // 3) الكليات والتخصصات - نستخدم * عشان أي بيانات زيادة ما تنحذف
        const { data: colleges, error: collegesError } = await supabaseClient
            .from("colleges")
            .select(`
                *,
                majors (*)
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

        // 5) ملفات وروابط الجامعة: Google Drive أو روابط خارجية
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

    const qW = Number(weights.qodrat_weight || 0);
    const tW = Number(weights.tahsili_weight || 0);
    const sW = Number(weights.school_weight || 0);

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
            ${needsQ ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">قدرات ${formatWeight(qW)}</span>` : ""}
            ${needsT ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">تحصيلي ${formatWeight(tW)}</span>` : ""}
            ${needsS ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">ثانوي ${formatWeight(sW)}</span>` : ""}
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
                    كل مسار قبول قد يكون له أوزان أو شروط مختلفة. يعرض هذا القسم كل البيانات المسجلة في قاعدة البيانات.
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

    const trackIgnoredKeys = [
        "id",
        "university_id",
        "name",
        "description",
        "is_default",
        "is_active",
        "display_order",
        "created_at",
        "updated_at",
        "university_weights"
    ];

    return `
        <div class="track-card glass-card ${track.is_default ? "default" : ""}">
            <div class="track-top">
                <div class="track-title">
                    <div class="track-icon">
                        <i class="fa-solid ${track.is_default ? "fa-star" : "fa-route"}"></i>
                    </div>

                    <div>
                        <h3>${esc(track.name || "مسار قبول")}</h3>
                        ${track.description ? `<p>${esc(track.description)}</p>` : ""}
                    </div>
                </div>

                ${track.is_default ? `
                    <span class="track-badge">
                        <i class="fa-solid fa-check"></i>
                        افتراضي
                    </span>
                ` : ""}
            </div>

            ${(qW || tW || sW) ? `
                <div class="weights-row">
                    <div class="weight-box">
                        <span>قدرات</span>
                        <b>${qW || "—"}</b>
                    </div>

                    <div class="weight-box">
                        <span>تحصيلي</span>
                        <b>${tW || "—"}</b>
                    </div>

                    <div class="weight-box">
                        <span>ثانوي</span>
                        <b>${sW || "—"}</b>
                    </div>
                </div>
            ` : ""}

            ${weights.map(weight => renderWeightCriteria(weight)).join("")}

            ${renderExtraFields(track, trackIgnoredKeys)}
        </div>
    `;
}

function renderWeightCriteria(weight) {
    if (!weight) return "";

    const ignoredWeightKeys = [
        "id",
        "university_id",
        "track_id",
        "admission_track_id",
        "qodrat_weight",
        "tahsili_weight",
        "school_weight",
        "created_at",
        "updated_at"
    ];

    const note = weight.note;

    const fields = Object.entries(weight).filter(([key, value]) => {
        if (ignoredWeightKeys.includes(key)) return false;
        if (key === "note") return false;
        if (isEmptyValue(value)) return false;
        if (typeof value === "object") return false;
        return true;
    });

    return `
        ${note ? `
            <div class="track-note">
                <i class="fa-solid fa-circle-info"></i>
                ${esc(note)}
            </div>
        ` : ""}

        ${fields.length ? `
            <div class="criteria-grid">
                ${fields.map(([key, value]) => `
                    <div class="criteria-item">
                        <span>${esc(fieldLabel(key))}</span>
                        <b>${formatValue(value)}</b>
                    </div>
                `).join("")}
            </div>
        ` : ""}
    `;
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
            .filter(major => major.is_active !== false)
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
                    ${majors.length ? majors.map(major => renderMajorRow(major)).join("") : `
                        <div class="text-xs text-gray-600">لا توجد تخصصات مضافة بعد.</div>
                    `}
                </div>

                ${renderExtraFields(college, [
                    "id",
                    "university_id",
                    "name",
                    "description",
                    "display_order",
                    "is_active",
                    "created_at",
                    "updated_at",
                    "majors"
                ])}
            </div>
        `;
    }).join("");
}

function renderMajorRow(major) {
    const ignoredMajorKeys = [
        "id",
        "university_id",
        "college_id",
        "code",
        "name",
        "degree",
        "gender",
        "note",
        "display_order",
        "is_active",
        "created_at",
        "updated_at"
    ];

    const extraHtml = renderExtraFields(major, ignoredMajorKeys);

    return `
        <div class="text-xs text-gray-400 bg-white/[0.02] rounded-xl px-3 py-2">
            <div class="flex items-center justify-between gap-2 italic">
                <span class="flex items-center gap-2">
                    <span class="w-1 h-1 rounded-full bg-indigo-500/50"></span>
                    ${major.code ? `<b class="text-indigo-400 not-italic">${esc(major.code)}</b>` : ""}
                    ${esc(major.name)}
                </span>

                <span class="text-[9px] text-gray-600">${esc(major.gender || "")}</span>
            </div>

            <div class="major-meta">
                ${major.degree ? `<span>${esc(major.degree)}</span>` : ""}
                ${major.note ? `<span>${esc(major.note)}</span>` : ""}
            </div>

            ${extraHtml}
        </div>
    `;
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
            ${resources.map(file => renderResourceCard(file)).join("")}
        </div>
    `;
}

function renderResourceCard(file) {
    const ignoredResourceKeys = [
        "id",
        "university_id",
        "resource_type",
        "title",
        "description",
        "file_url",
        "file_type",
        "year",
        "source_name",
        "is_official",
        "is_active",
        "display_order",
        "created_at",
        "updated_at"
    ];

    return `
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

                ${renderExtraFields(file, ignoredResourceKeys)}
            </div>

            <div class="resource-open">
                <i class="fa-solid fa-arrow-up-left-from-square"></i>
            </div>
        </a>
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

                    ${renderExtraFields(section, [
                        "id",
                        "university_id",
                        "section_type",
                        "title",
                        "content",
                        "is_active",
                        "display_order",
                        "created_at",
                        "updated_at"
                    ])}
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
