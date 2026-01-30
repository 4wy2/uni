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

        // 1. تعبئة البيانات النصية الأساسية
        document.getElementById('uniName').textContent = data.name;
        
        // التأكد من وجود span داخل uniLocation لتجنب الخطأ
        const locationSpan = document.getElementById('uniLocation').querySelector('span');
        if (locationSpan) {
            locationSpan.textContent = data.location;
        } else {
            document.getElementById('uniLocation').textContent = data.location;
        }

        document.getElementById('statEmp').textContent = data.stats?.employment || "--";
        document.getElementById('statLocal').textContent = data.stats?.rank_local ? `#${data.stats.rank_local}` : "--";
        document.getElementById('statAccept').textContent = data.stats?.acceptance_rate || "--";
        document.getElementById('uniCompetency').textContent = data.competitiveness || "--";
        document.getElementById('uniAbout').textContent = data.about || "--";

        // 2. الحساب التلقائي للموزونة
        runAutoCalculation(data.weights);

        // 3. عرض الكليات والتخصصات (Colleges & Majors)
        const collegesGrid = document.getElementById('collegesGrid');
        if (data.colleges && data.colleges.length > 0) {
            collegesGrid.innerHTML = data.colleges.map(item => `
                <div class="glass-card p-6 rounded-3xl border border-white/5">
                    <h4 class="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-graduation-cap"></i> ${item.college}
                    </h4>
                    <div class="grid grid-cols-1 gap-2">
                        ${item.majors.map(m => `
                            <div class="text-xs text-gray-400 flex items-center gap-2 italic">
                                <span class="w-1 h-1 rounded-full bg-indigo-500/50"></span> ${m}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        // 4. عرض نسب القبول (Major Ratios) - نظام الكروت للجوال
        const ratiosSection = document.getElementById('ratiosSection');
        const ratiosContainer = document.getElementById('ratiosContainer');
        
        if (data.major_ratios && data.major_ratios.length > 0) {
            ratiosSection.classList.remove('hidden');
            ratiosContainer.innerHTML = data.major_ratios.map(section => `
                <div class="mb-6">
                    <h4 class="text-[10px] font-black text-gray-500 mb-4 px-2 tracking-widest uppercase flex items-center gap-2">
                        <span class="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span> 
                        ${section.category}
                    </h4>
                    <div class="grid grid-cols-1 gap-2">
                        ${section.items.map(item => `
                            <div class="glass-card p-4 rounded-2xl flex justify-between items-center hover:bg-white/5 transition-all border-l-2 border-transparent hover:border-indigo-500">
                                <span class="text-xs font-bold text-gray-300">${item.name}</span>
                                <div class="flex gap-4 items-center">
                                    <div class="text-center">
                                        <p class="text-[8px] text-gray-500 mb-0.5 font-bold">بنين</p>
                                        <p class="text-xs font-black text-indigo-400">${item.male || '--'}</p>
                                    </div>
                                    <div class="text-center">
                                        <p class="text-[8px] text-gray-500 mb-0.5 font-bold">بنات</p>
                                        <p class="text-xs font-black text-pink-400">${item.female || '--'}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error("Error Loading Data:", error);
    }
}

function runAutoCalculation(weights) {
    const q = parseFloat(localStorage.getItem('qodrat')) || 0;
    const t = parseFloat(localStorage.getItem('tahsili')) || 0;
    const s = parseFloat(localStorage.getItem('school')) || 0;

    // لجامعة الفهد، الثانوي 0، لذا نتحقق من وجود القدرات والتحصيلي فقط
    if (q > 0 && t > 0 && weights) {
        // حساب الموزونة بناءً على أوزان الجامعة (مثلاً 0.50 قدرات و 0.50 تحصيلي)
        const total = (q * (weights.qodrat || 0)) + (t * (weights.tahsili || 0)) + (s * (weights.school || 0));
        
        const resultSection = document.getElementById('autoResultSection');
        const finalResult = document.getElementById('finalResult');
        const weightLabels = document.getElementById('weightLabels');

        if (finalResult) finalResult.innerText = total.toFixed(2) + "%";
        
        if (weightLabels) {
            weightLabels.innerHTML = `
                <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">قدرات ${Math.round((weights.qodrat || 0) * 100)}%</span>
                <span class="bg-indigo-500/10 px-2 py-1 rounded-lg">تحصيلي ${Math.round((weights.tahsili || 0) * 100)}%</span>
                ${weights.school > 0 ? `<span class="bg-indigo-500/10 px-2 py-1 rounded-lg">ثانوي ${Math.round(weights.school * 100)}%</span>` : ''}
            `;
        }
        
        if (resultSection) resultSection.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', loadUniversityDetails);
