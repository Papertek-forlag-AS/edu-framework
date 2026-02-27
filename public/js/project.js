import { loadData, saveData } from './progress/index.js';

export function setupProjectPage() {
    const container = document.getElementById('projekt-del1-container');
    if (!container) return;

    const fields = {
        name: container.querySelector('#proj-name'),
        alter: container.querySelector('#proj-alter'),
        wohnort: container.querySelector('#proj-wohnort'),
        familie: container.querySelector('#proj-familie'),
        hobbyInput: container.querySelector('#proj-hobby-input'),
        addHobbyBtn: container.querySelector('#proj-add-hobby-btn'),
        hobbyList: container.querySelector('#proj-hobby-list')
    };

    let hobbies = [];

    const saveProjectData = () => {
        const dataToSave = {
            name: fields.name.value,
            alter: fields.alter.value,
            wohnort: fields.wohnort.value,
            familie: fields.familie.value,
            hobbies: hobbies
        };
        saveData('tysk-vg1-projekt-del1', dataToSave);
    };

    const loadProjectData = () => {
        const savedData = loadData('tysk-vg1-projekt-del1');
        if (savedData) {
            fields.name.value = savedData.name || '';
            fields.alter.value = savedData.alter || '';
            fields.wohnort.value = savedData.wohnort || '';
            fields.familie.value = savedData.familie || '';
            hobbies = savedData.hobbies || [];
            renderHobbies();
        }
    };

    const renderHobbies = () => {
        fields.hobbyList.innerHTML = '';
        hobbies.forEach((hobby, index) => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-neutral-100 p-2 rounded';
            li.textContent = hobby;
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Slett';
            deleteBtn.className = 'text-error-500 text-xs hover:underline font-semibold';
            deleteBtn.onclick = () => {
                hobbies.splice(index, 1);
                renderHobbies();
                saveProjectData();
            };
            li.appendChild(deleteBtn);
            fields.hobbyList.appendChild(li);
        });
    };

    const addHobby = () => {
        const newHobby = fields.hobbyInput.value.trim();
        if (newHobby) {
            hobbies.push(newHobby);
            fields.hobbyInput.value = '';
            renderHobbies();
            saveProjectData();
        }
    };

    fields.addHobbyBtn.addEventListener('click', addHobby);
    fields.hobbyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addHobby();
        }
    });

    Object.values(fields).forEach(field => {
        if (field && (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA')) {
            field.addEventListener('input', saveProjectData);
        }
    });

    loadProjectData();
}

export function setupProjectPageDel2() {
    const container = document.getElementById('projekt-del2-container');
    if (!container) return;

    const wocheField = container.querySelector('#proj-woche');
    const traumurlaubField = container.querySelector('#proj-traumurlaub');

    const saveProjectData = () => {
        const dataToSave = {
            woche: wocheField.value,
            traumurlaub: traumurlaubField.value
        };
        saveData('tysk-vg1-projekt-del2', dataToSave);
    };

    const loadProjectData = () => {
        const savedData = loadData('tysk-vg1-projekt-del2');
        if (savedData) {
            wocheField.value = savedData.woche || '';
            traumurlaubField.value = savedData.traumurlaub || '';
        }
    };

    wocheField.addEventListener('input', saveProjectData);
    traumurlaubField.addEventListener('input', saveProjectData);

    loadProjectData();
}

export function setupProjectPageDel3() {
    const container = document.getElementById('projekt-del3-container');
    if (!container) return;

    const formatButtons = container.querySelectorAll('.format-btn');
    const previewArea = container.querySelector('#projekt-preview-area');
    const reflectionField = container.querySelector('#proj-reflection');
    const downloadBtn = container.querySelector('#proj-download-btn');

    const dataDel1 = loadData('tysk-vg1-projekt-del1') || {};
    const dataDel2 = loadData('tysk-vg1-projekt-del2') || {};
    let dataDel3 = loadData('tysk-vg1-projekt-del3') || { reflection: '' };

    reflectionField.value = dataDel3.reflection;

    const renderPreview = (format) => {
        downloadBtn.disabled = false;
        let html = '';
        const hobbiesList = dataDel1.hobbies && dataDel1.hobbies.length > 0
            ? '<ul>' + dataDel1.hobbies.map(h => `<li>${h}</li>`).join('') + '</ul>'
            : '<p><em>Keine Hobbys angegeben.</em></p>';

        switch(format) {
            case 'presentation':
                html = `
                    <div class="space-y-4">
                        <div class="border p-4 shadow-sm">
                            <h4 class="font-bold text-lg border-b pb-2 mb-2">Folie 1: Das bin ich</h4>
                            <p><strong>Name:</strong> ${dataDel1.name || '...'}</p>
                            <p><strong>Alter:</strong> ${dataDel1.alter || '...'}</p>
                            <p><strong>Wohnort:</strong> ${dataDel1.wohnort || '...'}</p>
                        </div>
                        <div class="border p-4 shadow-sm">
                            <h4 class="font-bold text-lg border-b pb-2 mb-2">Folie 2: Familie & Hobbys</h4>
                            <p><strong>Familie & Haustiere:</strong><br>${dataDel1.familie || '...'}</p>
                            <p class="mt-2"><strong>Hobbys:</strong></p>${hobbiesList}
                        </div>
                        <div class="border p-4 shadow-sm">
                            <h4 class="font-bold text-lg border-b pb-2 mb-2">Folie 3: Mein Alltag & Träume</h4>
                            <p><strong>Meine Woche:</strong><br>${dataDel2.woche || '...'}</p>
                            <p class="mt-2"><strong>Mein Traumurlaub:</strong><br>${dataDel2.traumurlaub || '...'}</p>
                        </div>
                    </div>`;
                break;
            case 'poster':
                html = `
                    <div class="border-4 border-neutral-800 p-4 bg-primary-50 h-full grid grid-cols-2 gap-4">
                        <div class="col-span-2 text-center pb-2"><h3 class="text-2xl font-bold underline">Mein Tyskår</h3></div>
                        <div class="border p-2"><strong>Name:</strong> ${dataDel1.name || '...'}</div>
                        <div class="border p-2"><strong>Alter:</strong> ${dataDel1.alter || '...'}</div>
                        <div class="col-span-2 border p-2"><strong>Familie & Haustiere:</strong><br>${dataDel1.familie || '...'}</div>
                        <div class="border p-2"><strong>Hobbys:</strong>${hobbiesList}</div>
                        <div class="border p-2"><strong>Meine Woche:</strong><br>${dataDel2.woche || '...'}</div>
                    </div>`;
                break;
            case 'script':
            case 'blog':
                const allText = `Mein Name ist ${dataDel1.name || '...'}. Ich bin ${dataDel1.alter || '...'} Jahre alt und wohne in ${dataDel1.wohnort || '...'}.\n\nÜber meine Familie und Haustiere:\n${dataDel1.familie || '...'}\n\nMeine Hobbys sind:\n${(dataDel1.hobbies || []).join(', ')}\n\nÜber meine Woche:\n${dataDel2.woche || '...'}\n\nMein Traumurlaub:\n${dataDel2.traumurlaub || '...'}`.trim();
                html = `<textarea class="w-full h-full p-2 border border-neutral-300 rounded-md shadow-sm" style="min-height: 400px;">${allText}</textarea>`;
                break;
        }
        previewArea.innerHTML = html;
    };

    formatButtons.forEach(button => {
        button.addEventListener('click', () => {
            formatButtons.forEach(btn => btn.classList.remove('bg-primary-400', 'text-white'));
            button.classList.add('bg-primary-400', 'text-white');
            renderPreview(button.dataset.format);
        });
    });

    reflectionField.addEventListener('input', () => {
        dataDel3.reflection = reflectionField.value;
        saveData('tysk-vg1-projekt-del3', dataDel3);
    });

    downloadBtn.addEventListener('click', () => {
        const title = `Tysk-Vg1-Projekt von ${dataDel1.name || 'Unbekannt'}`;
        const content = previewArea.innerHTML;
        const reflection = reflectionField.value;

        const htmlToPrint = `
            <html>
                <head>
                    <title>${title}</title>
                    <style> body { font-family: sans-serif; padding: 2rem; } .border { border: 1px solid #ccc; } .font-bold { font-weight: 700; } .text-3xl { font-size: 1.875rem; } .text-2xl { font-size: 1.5rem; } .mb-4 { margin-bottom: 1rem; } .mt-6 { margin-top: 1.5rem; } .mb-2 { margin-bottom: 0.5rem; } </style>
                </head>
                <body>
                    <h1 class="text-3xl font-bold mb-4">${title}</h1>
                    <h2 class="text-2xl font-bold mt-6 mb-2">Präsentation</h2>
                    ${content}
                    <h2 class="text-2xl font-bold mt-6 mb-2">Reflexion</h2>
                    <p>${reflection.replace(/\n/g, '<br>')}</p>
                </body>
            </html>`;

        const blob = new Blob([htmlToPrint], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mitt-tysk-vg1-prosjekt.html';
        a.click();
        URL.revokeObjectURL(url);
    });
}
