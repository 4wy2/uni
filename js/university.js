async function load() {
    const id = new URLSearchParams(window.location.search).get('id');
    if(!id) return location.href = 'index.html';

    try {
        const res = await fetch(`data/unis/${id}.json`);
        const data = await res.json();

        // تعبئة النصوص الأساسية
        document.getElementById('uniName').innerText = data.name;
        document.getElementById('uniLocation').querySelector('span').innerText = data.location;
        document.getElementById('statEmp').innerText = data.stats.employment;
        document.getElementById('statLocal').innerText = data.stats.rank_local;
        document.getElementById('statGlobal').innerText = data.stats.rank_global;
        document.getElementById('statAccept').innerText = data.stats.acceptance_rate;

        // تعبئة المسارات
        document.getElementById('pathsGrid').innerHTML = data.admission_paths.map(p => `
            <div class="glass-card p-6 rounded-3xl">
                <h4 class="font-bold text-indigo-400 mb-1">${p.name}</h4>
                <p class="text-sm mb-2">${p.formula}</p>
                <p class="text-xs text-gray-500">${p.note}</p>
            </div>
        `).join('');

        // تعبئة الكليات
        document.getElementById('collegesGrid').innerHTML = data.colleges.map(c => `
            <div class="glass-card p-6 rounded-3xl">
                <h4 class="font-bold text-lg mb-4 text-gray-200 border-b border-white/5 pb-2">${c.college}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${c.majors.map(m => `<div class="text-sm text-gray-400"><i class="fa-solid fa-check text-indigo-500 mr-2"></i>${m}</div>`).join('')}
                </div>
            </div>
        `).join('');

        // تعبئة المميزات
        document.getElementById('featuresList').innerHTML = data.features.map(f => `
            <div class="glass-card p-4 rounded-2xl text-sm text-gray-300">
                <i class="fa-solid fa-circle-check text-indigo-500 ml-2"></i> ${f}
            </div>
        `).join('');

    } catch (e) { console.error("University Not Found"); }
}
load();
