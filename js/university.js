document.addEventListener('DOMContentLoaded', () => {
    console.log("السكريبت بدأ العمل");
    
    // تجربة حقن بيانات يدوياً للتأكد من أن الـ IDs صحيحة
    document.getElementById('uniName').innerText = "تم الاتصال بنجاح";
    document.getElementById('collegesGrid').innerHTML = `
        <div class="glass-card p-4 rounded-xl">تخصص تجريبي يعمل!</div>
    `;
    
    // تشغيل الجلب الحقيقي
    loadUniversityDetails();
});

async function loadUniversityDetails() {
    const params = new URLSearchParams(window.location.search);
    const uniId = params.get('id');
    console.log("جاري البحث عن جامعة بـ ID:", uniId);

    try {
        const response = await fetch(`data/unis/${uniId}.json`);
        if (!response.ok) throw new Error('الملف غير موجود في المسار المحدد');
        const data = await response.json();
        console.log("البيانات التي وصلت:", data);
        
        // حقن البيانات الحقيقية
        document.getElementById('uniName').innerText = data.name;
        document.getElementById('uniAbout').innerText = data.about;
        
        // عرض التخصصات
        document.getElementById('collegesGrid').innerHTML = data.colleges.map(c => `
            <div class="glass-card p-4 rounded-xl border border-white/5">
                <h4 class="text-indigo-500 font-bold">${c.college}</h4>
            </div>
        `).join('');

    } catch (e) {
        console.error("خطأ تقني:", e.message);
        document.body.innerHTML += `<div style="color:red; padding:20px;">خطأ: ${e.message}</div>`;
    }
}
