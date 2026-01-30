let currentUniData = null;

async function loadUniversityDetails() {
    const params = new URLSearchParams(window.location.search);
    const uniId = params.get('id');

    if (!uniId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`data/unis/${uniId}.json`);
        if (!response.ok) throw new Error('Data file not found');
        
        const data = await response.json();
        currentUniData = data;

        // 1. تعبئة البيانات الأساسية والنبذة
        document.title = `${data.name} | مُوجّه`;
        document.getElementById('uniName').textContent = data.name;
        document.getElementById('uniLocation').querySelector('span').textContent = data.location;
        document.getElementById('uniAbout').textContent = data.about || "لا توجد نبذة متوفرة حالياً.";
        
        // التنافسية
        document.getElementById('competencyBadge').innerHTML = `<i class="fa-solid fa-fire-flame-curved ml-1"></i> تنافسية: ${data.competitiveness || 'متوسطة'}`;

        // 2. الإحصائيات (التوظيف، التصنيف، الفروع)
        document.getElementById('statEmp').textContent = data.stats?.employment || "--";
        document.getElementById('statLocal').textContent = data.stats?.rank_local ? `#${data.stats.rank_local}` : "--";
        document.getElementById('statGlobal').textContent = data.stats?.rank_global ? `#${data.stats.rank_global}` : "--";
        document.getElementById('statCampuses').textContent = (data.campuses && data.campuses.length > 0) ? data.campuses.join(' • ') : "الفرع الرئيسي";

        // 3. الحساب التلقائي (الذكاء التلقائي)
        runAutoCalculation(data.weights);

        // 4. شروط القبول
        if (data.admission_terms) {
            document.getElementById('termsList').innerHTML = data.admission_terms.map(term => `
                <li class="feature-item p-3 rounded-xl border border-white/5 flex items-start gap-3 text-sm text-gray-300">
                    <i class="fa-solid fa-circle-check text-indigo-500 mt-1 text-[10px]"></i> ${term}
                </li>
            `).join('');
        }

        // 5. مسارات التقديم
        document.getElementById('pathsGrid').innerHTML = data.admission_paths.map(path => `
            <div class="glass-card p-5 rounded-2xl border border-indigo-500/10">
                <h4 class="font-bold text-indigo-400 mb-1 text-sm">${path.name}</h4>
                <p class="text-[10px] text-gray-400 mb-2">${path.formula}</p>
                <p class="text-[11px] text-gray-500 leading-relaxed">${path.note || ''}</p>
            </div>
        `).join('');

        // 6. الكليات والتخصصات
        document.getElementById('collegesGrid').innerHTML = data.colleges.map(item => `
            <div class="glass-card p-6 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all">
                <h4 class="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-graduation-cap"></i> ${item.college}
                </h4>
                <div class="grid grid-cols-1 gap-y-2">
                    ${item.majors.map(m => `
                        <div class="text-xs text-gray-400 flex items-center gap-2 hover:text-white transition-colors cursor-default">
                            <span class="w-1 h-1 rounded-full bg-indigo-500/50"></span> ${m}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // 7. البيئة الجامعية والمزايا
        if (data.features) {
            document.getElementById('featuresGrid').innerHTML = data.features.map(feat => `
                <div class="feature-item p-4 rounded-2xl border border-white/5 flex items-center gap-4">
                    <div class="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-[10px]">
                        <i class="fa-solid fa-star"></i>
                    </div>
                    <span class="text-xs text-gray-300 font-medium">${feat}</span>
                </div>
            `).join('');
        }

        // 8. عرض نسب القبول إذا وجدت
        if (data.major_ratios && data.major_ratios.length > 0) {
            document.getElementById('ratiosSection').classList.remove('hidden');
            renderRatiosTable(data.major_ratios);
        }

    } catch (error) {
        console.error("Error loading university data:", error);
    }
}

function runAutoCalculation(weights) {
    const q = parseFloat(localStorage.getItem('qodrat')) || 0;
    const t = parseFloat(localStorage.getItem('tahsili')) || 0;
    const s = parseFloat(localStorage.getItem('school')) || 0;

    if (q > 0 && t > 0 && s > 0 && weights) {
        const total = (q * weights.qodrat) + (t * weights.tahsili) + (s * weights.school);
        const resultSection = document.getElementById('autoResultSection');
        const finalResult = document.getElementById('finalResult');
        const weightLabels = document.getElementById('weightLabels');

        finalResult.innerText = total.toFixed(2) + "%";
        weightLabels.innerHTML = `
            <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">قدرات ${Math.round(weights.qodrat * 100)}%</span>
            <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">تحصيلي ${Math.round(weights.tahsili * 100)}%</span>
            <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">ثانوي ${Math.round(weights.school * 100)}%</span>
        `;

        resultSection.classList.remove('hidden');
    }
}

function renderRatiosTable(ratios) {
    const container = document.getElementById('ratiosContainer');
    container.innerHTML = ratios.map(section => `
        <div class="mb-10 last:mb-0">
            <h4 class="text-indigo-400 font-bold mb-5 text-sm flex items-center gap-2">
                <span class="w-2 h-2 bg-indigo-500 rounded-full"></span> ${section.category}
            </h4>
            <div class="overflow-hidden rounded-2xl border border-white/5">
                <table class="w-full text-right text-xs">
                    <thead>
                        <tr class="bg-white/5 text-gray-400">
                            <th class="py-4 px-4 font-bold tracking-wider">التخصص</th>
                            <th class="text-center font-bold tracking-wider">طلاب</th>
                            <th class="text-center font-bold tracking-wider">طالبات</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                        ${section.items.map(item => `
                            <tr class="hover:bg-indigo-500/5 transition-colors">
                                <td class="py-4 px-4 font-medium text-gray-300">${item.name}</td>
                                <td class="text-center text-indigo-400 font-black">${item.male || '--'}</td>
                                <td class="text-center text-pink-400 font-black">${item.female || '--'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadUniversityDetails);
