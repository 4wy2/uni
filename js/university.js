// =====================================================
// University Details Page
// details.html?id=kfupm
// يسحب بيانات الجامعة من Supabase
// =====================================================

let currentUniData = null;

function $(id) {
    return document.getElementById(id);
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

async function loadUniversityDetails() {
    const uniId = getUniversityIdFromUrl();

    if (!uniId) {
        window.location.href = "index.html";
        return;
    }

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

        // 2) مسار القبول الافتراضي + الوزن
        const { data: defaultTrack } = await supabaseClient
            .from("admission_tracks")
            .select(`
                id,
                name,
                description,
                university_weights (
                    qodrat_weight,
                    tahsili_weight,
                    school_weight,
                    note
                )
            `)
            .eq("university_id", uniId)
            .eq("is_default", true)
            .maybeSingle();

        // 3) الكليات
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

        // 5) الأقسام النصية
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
        renderColleges(colleges || []);
        renderRatios(ratios || []);
        renderSections(sections || []);

    } catch (error) {
        console.error("Error Loading University:", error);
        renderError();
    }
}

function renderUniversityBasic(data) {
    document.title = `${data.name_ar} | مُوجّه`;

    $("uniName").textContent = data.name_ar || "--";

    const locationElement = $("uniLocation");
    const locationSpan = locationElement?.querySelector("span");

    if (locationSpan) {
        locationSpan.textContent = data.location_text || data.city || "--";
    } else if (locationElement) {
        locationElement.textContent = data.location_text || data.city || "--";
    }

    $("statEmp").textContent = data.employment_rate_text || "--";
    $("statLocal").textContent = data.rank_local ? `#${data.rank_local}` : "--";
    $("statAccept").textContent = data.acceptance_difficulty || "--";
    $("uniCompetency").textContent = data.competitiveness || "--";
    $("uniAbout").textContent = data.about || "--";
}

function renderAutoCalculation(defaultTrack) {
    if (!defaultTrack || !defaultTrack.university_weights || !defaultTrack.university_weights.length) {
        return;
    }

    const weights = defaultTrack.university_weights[0];

    const q = parseFloat(localStorage.getItem("qodrat")) || 0;
    const t = parseFloat(localStorage.getItem("tahsili")) || 0;
    const s = parseFloat(localStorage.getItem("school")) || 0;

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
            ${needsQ ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">قدرات ${Math.round(qW * 100)}%</span>` : ""}
            ${needsT ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">تحصيلي ${Math.round(tW * 100)}%</span>` : ""}
            ${needsS ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">ثانوي ${Math.round(sW * 100)}%</span>` : ""}
        `;
    }

    if (resultSection) {
        resultSection.classList.remove("hidden");
    }
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
                    ${college.name}
                </h4>

                ${college.description ? `
                    <p class="text-[11px] text-gray-500 mb-4 leading-relaxed">
                        ${college.description}
                    </p>
                ` : ""}

                <div class="grid grid-cols-1 gap-2">
                    ${majors.length ? majors.map(major => `
                        <div class="text-xs text-gray-400 flex items-center justify-between gap-2 italic bg-white/[0.02] rounded-xl px-3 py-2">
                            <span class="flex items-center gap-2">
                                <span class="w-1 h-1 rounded-full bg-indigo-500/50"></span>
                                ${major.code ? `<b class="text-indigo-400 not-italic">${major.code}</b>` : ""}
                                ${major.name}
                            </span>
                            <span class="text-[9px] text-gray-600">${major.gender || ""}</span>
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
                        ${item.major_code ? item.major_code + " - " : ""}${item.major_name || "تخصص غير محدد"}
                    </span>
                    <p class="text-[10px] text-gray-600 mt-1">
                        ${item.college_name || ""} · ${item.year || ""}
                    </p>
                </div>

                <div class="text-left">
                    <p class="text-xs font-black ${item.has_data ? "text-indigo-400" : "text-gray-600"}">
                        ${ratioDisplay}
                    </p>
                    <p class="text-[8px] text-gray-500 mt-1">
                        ${item.note || item.ratio_type || ""}
                    </p>
                </div>
            </div>
        `;
    }).join("");
}

function renderSections(sections) {
    // إذا ما عندك مكان للأقسام في details.html، بننشئه تلقائياً بعد نسب القبول
    let sectionWrapper = $("extraSections");

    if (!sectionWrapper) {
        const main = document.querySelector("main");
        if (!main) return;

        sectionWrapper = document.createElement("section");
        sectionWrapper.id = "extraSections";
        sectionWrapper.className = "mb-10";

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
                        ${section.title}
                    </h4>
                    <p class="text-gray-400 text-sm leading-relaxed">
                        ${section.content || "--"}
                    </p>
                </div>
            `).join("")}
        </div>
    `;
}

function renderError() {
    if ($("uniName")) $("uniName").textContent = "تعذر تحميل بيانات الجامعة";
    if ($("uniLocation")) $("uniLocation").textContent = "--";
    if ($("uniAbout")) {
        $("uniAbout").textContent =
            "تأكد من أن رابط الجامعة صحيح، وأن بيانات Supabase مضبوطة، وأن الجامعة موجودة في جدول universities.";
    }
}

document.addEventListener("DOMContentLoaded", loadUniversityDetails);
