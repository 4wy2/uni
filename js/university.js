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

        // 1. تعبئة البيانات النصية
        document.getElementById('uniName').textContent = data.name;
        document.getElementById('uniLocation').querySelector('span').textContent = data.location;
        document.getElementById('statEmp').textContent = data.stats.employment;
        document.getElementById('statLocal').textContent = data.stats.rank_local;
        document.getElementById('statGlobal').textContent = data.stats.rank_global;
        document.getElementById('statAccept').textContent = data.stats.acceptance_rate;

        // 2. الحساب التلقائي (الذكاء التلقائي)
        runAutoCalculation(data.weights);

        // 3. عرض المسارات
        document.getElementById('pathsGrid').innerHTML = data.admission_paths.map(path => `
            <div class="glass-card p-6 rounded-3xl border border-white/5">
                <h4 class="font-bold text-indigo-400 mb-1">${path.name}</h4>
                <p class="text-xs text-white opacity-80">${path.formula}</p>
            </div>
        `).join('');

        // 4. عرض الكليات
        document.getElementById('collegesGrid').innerHTML = data.colleges.map(item => `
            <div class="glass-card p-6 rounded-3xl">
                <h4 class="text-sm font-bold text-gray-400 border-b border-white/5 pb-3 mb-4">${item.college}</h4>
                <div class="grid grid-cols-2 gap-2">
                    ${item.majors.map(m => `<div class="text-xs text-gray-300 flex items-center gap-2"><i class="fa-solid fa-check text-indigo-500 text-[8px]"></i> ${m}</div>`).join('')}
                </div>
            </div>
        `).join('');

        // 5. عرض نسب القبول إذا وجدت
        if (data.major_ratios && data.major_ratios.length > 0) {
            document.getElementById('ratiosSection').classList.remove('hidden');
            renderRatiosTable(data.major_ratios);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

// دالة الحساب بدون تدخل المستخدم
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
        
        // عرض المعايير المستخدمة أسفل الرقم
        weightLabels.innerHTML = `
            <span>قدرات ${weights.qodrat * 100}%</span> • 
            <span>تحصيلي ${weights.tahsili * 100}%</span> • 
            <span>ثانوي ${weights.school * 100}%</span>
        `;

        resultSection.classList.remove('hidden');
        resultSection.classList.add('animate-pulse'); // تأثير بصري بسيط
        setTimeout(() => resultSection.classList.remove('animate-pulse'), 2000);
    }
}

function renderRatiosTable(ratios) {
    const container = document.getElementById('ratiosContainer');
    container.innerHTML = ratios.map(section => `
        <div class="mb-8 last:mb-0">
            <h4 class="text-indigo-400 font-bold mb-4 text-sm"><i class="fa-solid fa-caret-left ml-1"></i> ${section.category}</h4>
            <div class="overflow-x-auto">
                <table class="w-full text-right text-xs">
                    <thead>
                        <tr class="text-gray-500 border-b border-white/5">
                            <th class="py-2">التخصص</th>
                            <th class="text-center">طلاب</th>
                            <th class="text-center">طالبات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${section.items.map(item => `
                            <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td class="py-3 font-medium text-gray-300">${item.name}</td>
                                <td class="text-center text-blue-400 font-bold">${item.male || '--'}</td>
                                <td class="text-center text-pink-400 font-bold">${item.female || '--'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadUniversityDetails);
