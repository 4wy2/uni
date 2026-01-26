// متغير عالمي لتخزين بيانات الجامعة الحالية لاستخدامه في الحاسبة
let currentUniData = null;

/**
 * دالة حاسبة النسبة الموزونة
 */
function calculateRatio() {
    const q = parseFloat(document.getElementById('qodratInp').value) || 0;
    const t = parseFloat(document.getElementById('tahsiliInp').value) || 0;
    const s = parseFloat(document.getElementById('schoolInp').value) || 0;

    if (q === 0 || t === 0 || s === 0) {
        alert("لطفاً أدخل جميع الدرجات (القدرات، التحصيلي، الثانوية)");
        return;
    }

    // الأوزان الافتراضية (مسار عام)
    let weightS = 0.30, weightQ = 0.30, weightT = 0.40;

    // تخصيص الأوزان بناءً على الجامعة (إذا كانت البيانات متوفرة في JSON)
    if (currentUniData && currentUniData.weights) {
        weightS = currentUniData.weights.school || 0;
        weightQ = currentUniData.weights.qodrat || 0;
        weightT = currentUniData.weights.tahsili || 0;
    } 
    // شرط خاص بجامعة الملك فهد (في حال لم تكن الأوزان في الـ JSON بعد)
    else if (window.location.href.includes('kfupm')) {
        weightS = 0; weightQ = 0.50; weightT = 0.50;
    }

    const result = (s * weightS) + (q * weightQ) + (t * weightT);

    const resultDiv = document.getElementById('calcResult');
    const resultText = document.getElementById('finalResult');
    
    resultText.innerText = result.toFixed(2) + "%";
    resultDiv.classList.remove('hidden');
    
    // التمرير للنتيجة بسلاسة
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * الدالة الرئيسية لجلب وعرض بيانات الجامعة
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
        if (!response.ok) throw new Error('University file not found');
        
        const data = await response.json();
        currentUniData = data; // تخزين البيانات للاستخدام في الحاسبة

        // 1. تحديث العنوان والبيانات الأساسية
        document.title = `${data.name} | مُوجّه`;
        document.getElementById('uniName').textContent = data.name;
        document.getElementById('uniLocation').querySelector('span').textContent = data.location;
        
        // 2. تعبئة الإحصائيات
        document.getElementById('statEmp').textContent = data.stats.employment;
        document.getElementById('statLocal').textContent = data.stats.rank_local;
        document.getElementById('statGlobal').textContent = data.stats.rank_global;
        document.getElementById('statAccept').textContent = data.stats.acceptance_rate;

        // 3. التعامل مع الصورة (إذا وجدت في الـ HTML)
        const uniImage = document.getElementById('uniImage');
        if (uniImage) {
            uniImage.src = data.image || 'assets/pic/default-bg.jpg';
        }

        // 4. تعبئة مسارات القبول
        const pathsGrid = document.getElementById('pathsGrid');
        pathsGrid.innerHTML = data.admission_paths.map(path => `
            <div class="glass-card p-6 rounded-3xl border border-white/5">
                <h4 class="font-bold text-indigo-400 mb-2">${path.name}</h4>
                <p class="text-sm text-white mb-2">${path.formula}</p>
                <p class="text-xs text-gray-500">${path.note}</p>
            </div>
        `).join('');

        // 5. تعبئة الكليات والتخصصات
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

        // 6. تعبئة نسب القبول (التحديث الذكي)
        const ratiosSection = document.getElementById('ratiosSection');
        const ratiosContainer = document.getElementById('ratiosContainer');

        if (data.major_ratios && data.major_ratios.length > 0) {
            ratiosSection.classList.remove('hidden');
            ratiosContainer.innerHTML = data.major_ratios.map(section => `
                <div class="mb-8 last:mb-0">
                    <h4 class="text-indigo-400 font-bold mb-4 flex items-center gap-2 italic">
                        <i class="fa-solid fa-caret-left"></i> ${section.category}
                    </h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right border-collapse">
                            <thead>
                                <tr class="text-gray-500 text-xs border-b border-white/5">
                                    <th class="py-3 px-4">التخصص / المسار</th>
                                    <th class="py-3 px-4 text-center">طلاب</th>
                                    <th class="py-3 px-4 text-center">طالبات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${section.items.map(item => `
                                    <tr class="border-b border-white/5 hover:bg-white/5 transition">
                                        <td class="py-4 px-4 text-gray-300 font-medium">${item.name}</td>
                                        <td class="py-4 px-4 text-center text-blue-400 font-bold">${item.male || '--'}</td>
                                        <td class="py-4 px-4 text-center text-pink-400 font-bold">${item.female || '--'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).join('');
        } else {
            ratiosSection.classList.add('hidden');
        }

        // 7. المميزات
        document.getElementById('featuresList').innerHTML = data.features.map(f => `
            <div class="glass-card p-4 rounded-2xl text-sm text-gray-300">
                <i class="fa-solid fa-circle-check text-indigo-500 ml-2"></i> ${f}
            </div>
        `).join('');

    } catch (error) {
        console.error("خطأ في معالجة البيانات:", error);
    }
}

// تشغيل الدالة عند تحميل الصفحة
loadUniversityDetails();
