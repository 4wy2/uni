document.addEventListener('DOMContentLoaded', () => {
    loadUniversityDetails();
});

async function loadUniversityDetails() {
    const params = new URLSearchParams(window.location.search);
    const uniId = params.get('id');

    // العودة للرئيسية إذا لم يتم العثور على ID
    if (!uniId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`data/unis/${uniId}.json`);
        if (!response.ok) throw new Error('الملف غير موجود');
        const data = await response.json();

        // 1. تحديث الهوية والنصوص
        document.title = `${data.name} | مُوجّه`;
        document.getElementById('uniName').innerText = data.name;
        document.getElementById('uniAbout').innerText = data.about || "لا توجد نبذة متوفرة.";
        document.getElementById('statEmp').innerText = data.stats?.employment || "--";
        document.getElementById('statLocal').innerText = data.stats?.rank_local ? `#${data.stats.rank_local}` : "--";
        document.getElementById('statAccept').innerText = data.stats?.acceptance_rate || "--";
        document.getElementById('uniCompetency').innerText = data.competitiveness || "--";
        document.getElementById('uniLocation').innerText = data.location;

        // 2. تشغيل حاسبة الموزونة التلقائية
        const userTotal = runAutoCalculation(data.weights);

        // 3. عرض الكليات والتخصصات
        renderColleges(data.colleges);

        // 4. عرض نسب القبول مع مقارنتها بموزونة الطالب
        if (data.major_ratios && data.major_ratios.length > 0) {
            renderRatios(data.major_ratios, userTotal);
        }

    } catch (e) {
        console.error("خطأ تقني:", e);
        // عرض رسالة خطأ للمستخدم في حال فشل الجلب
        document.getElementById('uniName').innerText = "خطأ في تحميل البيانات";
    }
}

// دالة حساب الموزونة
function runAutoCalculation(weights) {
    const q = parseFloat(localStorage.getItem('qodrat')) || 0;
    const t = parseFloat(localStorage.getItem('tahsili')) || 0;
    const s = parseFloat(localStorage.getItem('school')) || 0;

    if (q > 0 && t > 0 && weights) {
        const total = (q * weights.qodrat) + (t * weights.tahsili) + (s * (weights.school || 0));
        document.getElementById('finalResult').innerText = total.toFixed(2) + "%";
        document.getElementById('weightLabels').innerHTML = `
            <span class="bg-white/5 px-2 py-1 rounded">قدرات ${weights.qodrat * 100}%</span>
            <span class="bg-white/5 px-2 py-1 rounded">تحصيلي ${weights.tahsili * 100}%</span>
            ${weights.school > 0 ? `<span class="bg-white/5 px-2 py-1 rounded">ثانوي ${weights.school * 100}%</span>` : ''}
        `;
        document.getElementById('autoResultSection').classList.remove('hidden');
        return total; // نرجع الموزونة لنقارنها بالنسب
    }
    return 0;
}

// دالة عرض الكليات
function renderColleges(colleges) {
    const grid = document.getElementById('collegesGrid');
    if (!colleges) return;
    
    grid.innerHTML = colleges.map(c => `
        <div class="glass-card p-5 rounded-3xl border border-white/5 shadow-lg">
            <h4 class="text-indigo-400 font-black text-xs mb-4 uppercase flex items-center gap-2">
               <i class="fa-solid fa-graduation-cap"></i> ${c.college}
            </h4>
            <div class="grid grid-cols-1 gap-2">
                ${c.majors.map(m => `
                    <div class="text-[11px] text-gray-400 flex items-center gap-2">
                        <span class="w-1 h-1 bg-indigo-500/40 rounded-full"></span> ${m}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// دالة عرض نسب القبول مع نظام المقارنة الذكي
function renderRatios(ratios, userTotal) {
    const section = document.getElementById('ratiosSection');
    const container = document.getElementById('ratiosContainer');

    section.classList.remove('hidden');
    container.innerHTML = ratios.map(group => `
        <div class="mb-8">
            <h4 class="text-[10px] text-gray-500 font-bold mb-4 uppercase tracking-widest px-2 border-r-2 border-indigo-500 mr-1">
                ${group.category}
            </h4>
            <div class="grid grid-cols-1 gap-3">
                ${group.items.map(item => {
                    const ratioNum = parseFloat(item.male); // نأخذ نسبة البنين كمقياس
                    const isSafe = userTotal >= ratioNum && userTotal > 0;
                    
                    return `
                    <div class="glass-card p-4 rounded-2xl flex justify-between items-center transition-all ${isSafe ? 'border-r-4 border-green-500/50 bg-green-500/5' : ''}">
                        <div>
                            <span class="text-xs font-bold text-gray-200">${item.name}</span>
                            ${isSafe ? '<p class="text-[8px] text-green-400 font-bold mt-1 tracking-tighter italic">موزونتك أعلى من نسبة القبول ✓</p>' : ''}
                        </div>
                        <div class="flex gap-4 items-center bg-black/20 p-2 rounded-xl border border-white/5">
                            <div class="text-center">
                                <p class="text-[7px] text-gray-500 uppercase">بنين/بنات</p>
                                <p class="text-[12px] font-black ${isSafe ? 'text-green-400' : 'text-indigo-400'}">${item.male}%</p>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    `).join('');
}
