// متغير لتخزين بيانات الجامعة الحالية
let currentUniData = null;

/**
 * 1. دالة جلب البيانات وعرضها
 */
async function loadUniversityDetails() {
    const params = new URLSearchParams(window.location.search);
    const uniId = params.get('id');

    if (!uniId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`data/unis/${uniId}.json`);
        if (!response.ok) throw new Error('University not found');
        
        const data = await response.json();
        currentUniData = data;

        // تحديث البيانات الأساسية
        document.title = `${data.name} | مُوجّه`;
        document.getElementById('uniName').textContent = data.name;
        document.getElementById('uniLocation').querySelector('span').textContent = data.location;
        document.getElementById('statEmp').textContent = data.stats.employment;
        document.getElementById('statLocal').textContent = data.stats.rank_local;
        document.getElementById('statGlobal').textContent = data.stats.rank_global;
        document.getElementById('statAccept').textContent = data.stats.acceptance_rate;

        // تعبئة المسارات
        const pathsGrid = document.getElementById('pathsGrid');
        pathsGrid.innerHTML = data.admission_paths.map(path => `
            <div class="glass-card p-6 rounded-3xl border border-white/5">
                <h4 class="font-bold text-indigo-400 mb-2">${path.name}</h4>
                <p class="text-sm text-white mb-2">${path.formula}</p>
                <p class="text-xs text-gray-500">${path.note}</p>
            </div>
        `).join('');

        // تعبئة الكليات
        const collegesGrid = document.getElementById('collegesGrid');
        collegesGrid.innerHTML = data.colleges.map(item => `
            <div class="glass-card p-6 rounded-3xl">
                <h4 class="text-lg font-bold text-gray-200 border-b border-white/5 pb-3 mb-4">${item.college}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${item.majors.map(major => `
                        <div class="flex items-center gap-2 text-gray-400 text-sm">
                            <i class="fa-solid fa-check text-indigo-500 text-[10px]"></i> ${major}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // ميزة "الذكاء التلقائي": جلب الدرجات من الذاكرة والحساب فوراً
        const savedQ = localStorage.getItem('qodrat');
        const savedT = localStorage.getItem('tahsili');
        const savedS = localStorage.getItem('school');

        if (savedQ || savedT || savedS) {
            document.getElementById('qodratInp').value = savedQ || '';
            document.getElementById('tahsiliInp').value = savedT || '';
            document.getElementById('schoolInp').value = savedS || '';
            
            // إذا كانت كل الدرجات موجودة، احسب الموزونة تلقائياً
            if (savedQ && savedT && savedS) {
                calculateRatio();
            }
        }

        // إظهار قسم النسب إذا توفرت
        const ratiosSection = document.getElementById('ratiosSection');
        if (data.major_ratios && data.major_ratios.length > 0) {
            ratiosSection.classList.remove('hidden');
            renderRatios(data.major_ratios);
        }

        // المميزات
        document.getElementById('featuresList').innerHTML = data.features.map(f => `
            <div class="glass-card p-4 rounded-2xl text-sm text-gray-300">
                <i class="fa-solid fa-circle-check text-indigo-500 ml-2"></i> ${f}
            </div>
        `).join('');

    } catch (error) {
        console.error("Error loading details:", error);
    }
}

/**
 * 2. دالة حساب النسبة الموزونة
 */
function calculateRatio() {
    const q = parseFloat(document.getElementById('qodratInp').value) || 0;
    const t = parseFloat(document.getElementById('tahsiliInp').value) || 0;
    const s = parseFloat(document.getElementById('schoolInp').value) || 0;

    // حفظ أي تعديل يجريه الطالب هنا ليتزامن مع بقية الجامعات
    localStorage.setItem('qodrat', q);
    localStorage.setItem('tahsili', t);
    localStorage.setItem('school', s);

    // الأوزان: الأولوية لما هو موجود في JSON الجامعة، وإلا نستخدم افتراضي
    let wQ = 0.30, wT = 0.40, wS = 0.30;
    if (currentUniData && currentUniData.weights) {
        wQ = currentUniData.weights.qodrat;
        wT = currentUniData.weights.tahsili;
        wS = currentUniData.weights.school;
    }

    const result = (q * wQ) + (t * wT) + (s * wS);

    const resultDiv = document.getElementById('calcResult');
    document.getElementById('finalResult').innerText = result.toFixed(2) + "%";
    resultDiv.classList.remove('hidden');
}

/**
 * 3. دالة رسم جداول النسب
 */
function renderRatios(ratios) {
    const container = document.getElementById('ratiosContainer');
    container.innerHTML = ratios.map(section => `
        <div class="mb-8 last:mb-0">
            <h4 class="text-indigo-400 font-bold mb-4 italic">${section.category}</h4>
            <div class="overflow-x-auto">
                <table class="w-full text-right">
                    <thead>
                        <tr class="text-xs text-gray-500 border-b border-white/5">
                            <th class="py-2">التخصص</th>
                            <th class="text-center">طلاب</th>
                            <th class="text-center">طالبات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${section.items.map(item => `
                            <tr class="border-b border-white/5">
                                <td class="py-3 text-sm">${item.name}</td>
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

// البدء عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', loadUniversityDetails);
