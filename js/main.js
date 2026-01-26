// وظيفة جلب وعرض الجامعات
async function loadUniversities() {
    try {
        const response = await fetch('data/universities.json');
        const unis = await response.json();
        displayUnis(unis);

        // تفعيل البحث
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = unis.filter(u => 
                u.name.includes(term) || u.location.includes(term) || u.region.includes(term)
            );
            displayUnis(filtered);
        });
    } catch (error) {
        console.error("خطأ في تحميل البيانات:", error);
    }
}

function displayUnis(list) {
    const grid = document.getElementById('uniGrid');
    grid.innerHTML = list.map(u => `
        <a href="details.html?id=${u.id}" class="group block p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-indigo-500 transition-all hover:-translate-y-2">
            <div class="flex justify-between items-start mb-6">
                <div class="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                    <i class="fa-solid fa-university text-xl"></i>
                </div>
                <span class="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">${u.region}</span>
            </div>
            <h3 class="text-xl font-bold mb-2">${u.name}</h3>
            <p class="text-gray-500 text-sm"><i class="fa-solid fa-location-dot ml-2"></i>${u.location}</p>
        </a>
    `).join('');
}

loadUniversities();
