async function init() {
    try {
        const res = await fetch('data/universities.json');
        const unis = await res.json();
        render(unis);

        document.getElementById('searchInput').oninput = (e) => {
            const term = e.target.value.toLowerCase();
            render(unis.filter(u => u.name.includes(term) || u.location.includes(term)));
        };
    } catch (e) { console.error("Data Load Error"); }
}

function render(list) {
    document.getElementById('uniGrid').innerHTML = list.map(u => `
        <a href="details.html?id=${u.id}" class="glass p-8 rounded-[2.5rem] hover:border-indigo-500 transition-all hover:-translate-y-2 block">
            <div class="flex justify-between mb-6">
                <div class="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                    <i class="fa-solid fa-university"></i>
                </div>
                <span class="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-400">${u.region}</span>
            </div>
            <h3 class="text-xl font-bold mb-2">${u.name}</h3>
            <p class="text-gray-500 text-sm"><i class="fa-solid fa-location-dot ml-1"></i>${u.location}</p>
        </a>
    `).join('');
}
init();
