async function loadUniversityDetails() {
    // 1. استخراج الـ ID من الرابط (مثلاً: ?id=kfupm)
    const params = new URLSearchParams(window.location.search);
    const uniId = params.get('id');

    if (!uniId) {
        window.location.href = 'index.html'; // حماية: إذا لا يوجد ID ارجع للرئيسية
        return;
    }

    try {
        // 2. جلب ملف الـ JSON الخاص بالجامعة
        const response = await fetch(`data/unis/${uniId}.json`);
        if (!response.ok) throw new Error('University not found');
        const data = await response.json();

        // 3. تعبئة البيانات الأساسية
        document.title = `${data.name} | مُوجّه`;
        document.getElementById('uniName').textContent = data.name;
        document.getElementById('uniLocation').querySelector('span').textContent = data.location;
        document.getElementById('uniEmployment').textContent = data.stats.employment;

        // 4. تعبئة متطلبات القبول
        const admissionContainer = document.getElementById('admissionList');
        data.admission.forEach(item => {
            const div = document.createElement('div');
            div.className = "p-4 bg-white/5 rounded-2xl";
            div.innerHTML = `
                <p class="text-xs text-gray-500 mb-1">${item.type}</p>
                <p class="font-bold text-indigo-400">${item.value}</p>
            `;
            admissionContainer.appendChild(div);
        });

        // 5. تعبئة التخصصات
        const majorsGrid = document.getElementById('majorsGrid');
        data.majors.forEach(major => {
            majorsGrid.innerHTML += `
                <div class="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span class="text-gray-300">${major.name}</span>
                    <span class="font-bold text-indigo-400">${major.ratio}</span>
                </div>
            `;
        });

    } catch (error) {
        console.error("خطأ:", error);
        document.getElementById('uniName').textContent = "الجامعة غير موجودة";
    }
}

loadUniversityDetails();
