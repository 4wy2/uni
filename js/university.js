// =====================================================
// University Details Page
// details.html?id=kfupm
// يسحب بيانات الجامعة من Supabase
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
        const { data: defaultTrack, error: defaultTrackError } = await supabaseClient
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

        if (defaultTrackError) {
            console.error("Default track error:", defaultTrackError);
        }

        // 3) الكليات والتخصصات
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
                                ${esc(major.name)}
                            </span>
                            <span class="text-[9px] text-gray-600">${esc(major.gender || "")}</span>
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
