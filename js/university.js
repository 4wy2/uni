let currentUniData = null;

async function loadUniversityDetails() {
    const params = new URLSearchParams(window.location.search);
    const uniId = params.get('id');

    // العودة للرئيسية إذا لم يتم العثور على ID الجامعة
    if (!uniId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`data/unis/${uniId}.json`);
        if (!response.ok) throw new Error('بيانات الجامعة غير موجودة');
        
        const data = await response.json();
        currentUniData = data;

        // 1. تعبئة البيانات الأساسية والنبذة
        document.title = `${data.name} | مُوجّه`;
        document.getElementById('uniName').textContent = data.name;
        document.getElementById('uniLocation').textContent = data.location;
        document.getElementById('uniAbout').textContent = data.about || "لا توجد نبذة متوفرة حالياً لهذه الجامعة.";
        
        // التنافسية (Badge)
        document.getElementById('uniCompetency').textContent = data.competitiveness || "متوسطة";

        // 2. الإحصائيات (التوظيف، التصنيف، القبول)
        document.getElementById('statEmp').textContent = data.stats?.employment || "--";
        document.getElementById('statLocal').textContent = data.stats?.rank_local ? `#${data.stats.rank_local}` : "--";
        document.getElementById('statAccept').textContent = data.stats?.acceptance_rate || "--";

        // 3. الحساب التلقائي (الذكاء التلقائي للموزونة)
        runAutoCalculation(data.weights);

        // 4. الكليات والتخصصات (عرض متجاوب)
        const collegesGrid = document.getElementById('collegesGrid');
        if (data.colleges) {
            collegesGrid.innerHTML = data.colleges.map(item => `
                <div class="glass-card p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-all">
                    <h4 class="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-graduation-cap"></i> ${item.college}
                    </h4>
                    <div class="space-y-2">
                        ${item.majors.map(m => `
                            <div class="text-xs text-gray-400 flex items-center gap-2">
                                <span class="w-1 h-1 rounded-full bg-indigo-500/40"></span> ${m}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        // 5. عرض نسب القبول (نظام الكروت للجوال بدلاً من الجداول)
        if (data.major_ratios && data.major_ratios.length > 0) {
            document.getElementById('ratiosSection').classList.remove('hidden');
            renderRatiosTable(data.major_ratios);
        }

    } catch (error) {
        console.error("Error loading university data:", error);
        alert("عذراً، حدث خطأ أثناء تحميل بيانات الجامعة.");
    }
}

// دالة الحساب التلقائي للموزونة بناءً على مخزن المتصفح
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
        
        // عرض الأوزان المستخدمة في الحساب
        weightLabels.innerHTML = `
            <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">قدرات ${Math.round(weights.qodrat * 100)}%</span>
            <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">تحصيلي ${Math.round(weights.tahsili * 100)}%</span>
            <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">ثانوي ${Math.round(weights.school * 100)}%</span>
        `;

        resultSection.classList.remove('hidden');
    }
}

// تحويل الجداول إلى كروت مرنة سهلة القراءة في الجوال
function renderRatiosTable(ratios) {
    const container = document.getElementById('ratiosContainer');
    container.innerHTML = ratios.map(section => `
        <div class="mb-8">
            <h4 class="text-[10px] font-black text-gray-500 mb-4 px-2 tracking-[0.2em] uppercase flex items-center gap-2">
                <span class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> ${section.category}
            </h4>
            <div class="grid grid-cols-1 gap-3">
                ${section.items.map(item => `
                    <div class="glass-card p-4 rounded-2xl flex justify-between items-center hover:bg-white/[0.04] transition-all">
                        <span class="text-xs md:text-sm font-medium text-gray-300">${item.name}</span>
                        <div class="flex gap-4 border-r border-white/5 pr-4 mr-2">
                            <div class="text-center">
                                <p class="text-[8px] text-gray-500 mb-0.5 uppercase">طلاب</p>
                                <p class="text-sm font-black text-indigo-400">${item.male || '--'}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-[8px] text-gray-500 mb-0.5 uppercase">طالبات</p>
                                <p class="text-sm font-black text-pink-400">${item.female || '--'}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// بدء التشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', loadUniversityDetails);
