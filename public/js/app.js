// app.js - The nervous system connecting State to HTML

const builderZone = document.getElementById('builderZone');
const visualPreview = document.getElementById('visualPreview');
const addBlockBtn = document.getElementById('addBlockBtn');
const copyBtn = document.getElementById('copyBtn');

// Initialize SortableJS
new Sortable(builderZone, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onEnd: function (evt) {
        AppState.reorderBlocks(evt.oldIndex, evt.newIndex);
        updatePreview();
    }
});
// --- 1. System Initializations ---
// Tell marked.js to use KaTeX for math rendering
marked.use(markedKatex({ throwOnError: false }));
// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// --- 2. Slash Command Configuration ---
const commandPalette = document.getElementById('commandPalette');
let activeInput = null; // Tracks which textarea is typing
let slashIndex = -1;
let savedCursorPos = -1;    

const advancedCommands = [
    { id: 'h1', icon: 'heading-1', label: 'Heading 1', text: '# ' },
    { id: 'h2', icon: 'heading-2', label: 'Heading 2', text: '## ' },
    { id: 'quote', icon: 'text-quote', label: 'Blockquote', text: '> ' },
    { id: 'task', icon: 'check-square', label: 'Task List', text: '- [ ] Task 1\n- [x] Completed Task\n' },
    { id: 'code', icon: 'code', label: 'Code Block', text: '```javascript\n// Your code here\n```\n' },
    { id: 'math', icon: 'sigma', label: 'Math (LaTeX)', text: '$$\na^2 + b^2 = c^2\n$$\n' },
    { id: 'diagram', icon: 'git-merge', label: 'Mermaid Diagram', text: '```mermaid\ngraph TD;\n    A[Start] --> B{Is it working?};\n    B -- Yes --> C[Great!];\n    B -- No --> D[Debug];\n```\n' },
    { id: 'table', icon: 'table', label: 'Markdown Table', text: '| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n' },
    { id: 'badges', icon: 'shield', label: 'GitHub Badges Builder', text: 'TRIGGER_MODAL' } // Special trigger
];

// --- 3. Palette Logic ---
function showPalette(rect, query) {
    commandPalette.innerHTML = '';
    
    const filtered = advancedCommands.filter(cmd => 
        cmd.label.toLowerCase().includes(query.toLowerCase()) || 
        cmd.id.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
        commandPalette.classList.add('hidden');
        return;
    }

    filtered.forEach((cmd, index) => {
        const item = document.createElement('div');
        item.className = 'command-item px-4 py-2 flex items-center gap-3 text-sm text-slate-700 font-medium';
        item.innerHTML = `<i data-lucide="${cmd.icon}" class="w-4 h-4 text-slate-400"></i> ${cmd.label}`;
        
        item.addEventListener('click', () => applyCommand(cmd));
        commandPalette.appendChild(item);
    });

    // SMART POSITIONING (Collision Detection)
    // Check how much space is between the cursor and the bottom of the window
    const spaceBelow = window.innerHeight - rect.bottom;
    const paletteHeight = 280; // The max height of our menu
    
    if (spaceBelow < paletteHeight) {
        // Not enough space! Pop the menu UPWARDS instead.
        commandPalette.style.top = `${rect.top + window.scrollY - paletteHeight}px`;
    } else {
        // Plenty of space, pop it downwards normally.
        commandPalette.style.top = `${rect.bottom + window.scrollY + 5}px`;
    }

    commandPalette.style.left = `${rect.left + window.scrollX}px`;
    commandPalette.classList.remove('hidden');
    lucide.createIcons();
}

function hidePalette(resetVariables = true) {
    commandPalette.classList.add('hidden');
    if (resetVariables) {
        slashIndex = -1;
        activeInput = null;
        savedCursorPos = -1;
    }
}

function applyCommand(cmd) {
    if (!activeInput) return;
    
    // Save the current cursor position before we lose focus to the modal
    savedCursorPos = activeInput.selectionStart;

    if (cmd.text === 'TRIGGER_MODAL') {
        hidePalette(false); // <--- PASS FALSE (Don't reset variables yet!)
        document.getElementById('badgeModal').classList.remove('hidden');
        return; 
    }

    const text = activeInput.value;
    const blockId = activeInput.getAttribute('data-block-id');
    const beforeSlash = text.substring(0, slashIndex);
    const afterCursor = text.substring(savedCursorPos);
    
    const needsNewline = beforeSlash.length > 0 && !beforeSlash.endsWith('\n');
    const prefix = needsNewline ? '\n\n' : '';
    const newText = beforeSlash + prefix + cmd.text + afterCursor;

    activeInput.value = newText;
    AppState.updateBlock(blockId, newText);
    updatePreview();
    hidePalette(true); // Reset everything for normal commands
    
    activeInput.style.height = 'auto';
    activeInput.style.height = (activeInput.scrollHeight) + 'px';
    activeInput.focus();
}
// Render the Left Pane
function renderBuilder() {
    builderZone.innerHTML = ''; 

    AppState.blocks.forEach(block => {
        const blockEl = document.createElement('div');
        blockEl.className = 'bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex gap-3 relative group transition-all';
        
        const types = ['header', 'description', 'installation'];
        const optionsHtml = types.map(t => 
            `<option value="${t}" ${block.type === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`
        ).join('');

        // Notice the new Formatting Toolbar added above the textarea!
        blockEl.innerHTML = `
            <div class="cursor-grab drag-handle flex items-start pt-2 justify-center text-slate-300 hover:text-indigo-500 transition-colors">
                <i data-lucide="grip-vertical" class="w-5 h-5"></i>
            </div>
            <div class="flex-1 space-y-2">
                <div class="flex justify-between items-center">
                    <select class="block-type-select text-xs font-semibold text-indigo-600 bg-indigo-50 border border-transparent rounded px-2 py-1 outline-none focus:border-indigo-300 transition-colors cursor-pointer">
                        ${optionsHtml}
                    </select>
                    
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="format-btn p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" data-wrap="\`" title="Inline Code (Pill)">
                            <i data-lucide="code" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                        <button class="format-btn p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" data-wrap="**" title="Bold">
                            <i data-lucide="bold" class="w-4 h-4 pointer-events-none"></i>
                        </button>
                    </div>

                    <button class="delete-btn text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50" title="Delete Block">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                <textarea data-block-id="${block.id}" class="block-content-input w-full p-2 text-sm text-slate-700 bg-transparent border border-transparent hover:border-slate-100 focus:border-slate-200 focus:bg-slate-50 rounded-lg outline-none resize-none transition-all custom-scrollbar min-h-[60px]" placeholder="Type your content or '/' for commands...">${block.content}</textarea>
            </div>
        `;

        const selectEl = blockEl.querySelector('.block-type-select');
        const inputEl = blockEl.querySelector('.block-content-input');
        const deleteBtn = blockEl.querySelector('.delete-btn');
        const formatBtns = blockEl.querySelectorAll('.format-btn');

        selectEl.addEventListener('change', (e) => {
            block.type = e.target.value;
            updatePreview();
        });

        inputEl.addEventListener('input', (e) => {
            AppState.updateBlock(block.id, e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = (e.target.scrollHeight) + 'px';
            updatePreview();
        });
        inputEl.addEventListener('keyup', (e) => {
            const val = e.target.value;
            const cursor = e.target.selectionStart;

            // Look backward from cursor to find a '/'
            const textBeforeCursor = val.substring(0, cursor);
            const lastSlash = textBeforeCursor.lastIndexOf('/');

            if (lastSlash !== -1 && !textBeforeCursor.substring(lastSlash).includes(' ')) {
                // Found a slash, show palette!
                slashIndex = lastSlash;
                activeInput = e.target;
                const query = val.substring(slashIndex + 1, cursor);
                const rect = e.target.getBoundingClientRect();
                showPalette(rect, query);
                
                if (e.key === 'Enter') {
                    e.preventDefault();
                    // Auto-select the first item if they hit enter
                    const firstItem = advancedCommands.find(cmd => 
                        cmd.label.toLowerCase().includes(query.toLowerCase()) || 
                        cmd.id.toLowerCase().includes(query.toLowerCase())
                    );
                    if (firstItem) applyCommand(firstItem);
                }
            } else {
                hidePalette();
            }
        });

        deleteBtn.addEventListener('click', () => {
            AppState.blocks = AppState.blocks.filter(b => b.id !== block.id);
            renderBuilder(); 
            updatePreview();
        });

        // NEW: Formatting Logic
        formatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const wrapChar = btn.getAttribute('data-wrap');
                const start = inputEl.selectionStart;
                const end = inputEl.selectionEnd;
                const text = inputEl.value;

                // Wrap the selected text, or insert empty markdown if nothing is selected
                const selectedText = text.substring(start, end);
                const newText = text.substring(0, start) + wrapChar + selectedText + wrapChar + text.substring(end);
                
                inputEl.value = newText;
                AppState.updateBlock(block.id, newText);
                updatePreview();

                // Refocus and put cursor in the middle
                inputEl.focus();
                inputEl.setSelectionRange(start + wrapChar.length, end + wrapChar.length);
            });
        });

        builderZone.appendChild(blockEl);
    });

    lucide.createIcons();
}

async function updatePreview() {
    // 1. Get raw markdown and parse it to standard HTML
    const rawMarkdown = AppState.compileToMarkdown();
    visualPreview.innerHTML = marked.parse(rawMarkdown);
    
    // 2. Find all Mermaid code blocks generated by marked.js
    const mermaidBlocks = visualPreview.querySelectorAll('code.language-mermaid');
    
    // 3. Loop through them and render the diagrams
    mermaidBlocks.forEach(async (block, index) => {
        const source = block.textContent;
        const container = document.createElement('div');
        container.className = 'flex justify-center py-4 w-full overflow-x-auto';
        
        // Replace the default <pre><code> block with our new empty container
        block.parentElement.replaceWith(container);
        
        try {
            // Give each chart a unique ID so Mermaid doesn't get confused
            const id = `mermaid-chart-${Date.now()}-${index}`;
            
            // Tell Mermaid to render the SVG
            const { svg } = await mermaid.render(id, source);
            container.innerHTML = svg;
        } catch (err) {
            // If the user is halfway through typing, don't crash the app! 
            // Show a soft error state until they finish the syntax.
            container.innerHTML = `
                <div class="text-slate-500 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center gap-2">
                    <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Rendering diagram...
                </div>
            `;
            lucide.createIcons();
        }
    });
}

addBlockBtn.addEventListener('click', () => {
    AppState.addBlock('description'); 
    renderBuilder();
    updatePreview();
    builderZone.scrollTop = builderZone.scrollHeight;
});

// NEW: Bulletproof Copy Logic
copyBtn.addEventListener('click', () => {
    const rawMarkdown = AppState.compileToMarkdown();
    const toast = document.getElementById('toast');
    const copyText = document.getElementById('copyText');
    const copyIcon = document.getElementById('copyIcon');

    navigator.clipboard.writeText(rawMarkdown).then(() => {
        // 1. Button Feedback
        copyText.innerText = 'Copied!';
        copyIcon.setAttribute('data-lucide', 'check');
        copyBtn.classList.replace('bg-slate-900', 'bg-green-600');     // Turn button green
        copyBtn.classList.replace('border-slate-900', 'border-green-600');
        lucide.createIcons();

        // 2. Slide in Toast
        toast.classList.remove('translate-y-24', 'opacity-0');

        // 3. Reset after 2 seconds
        setTimeout(() => {
            copyText.innerText = 'Copy Raw MD';
            copyIcon.setAttribute('data-lucide', 'copy');
            copyBtn.classList.replace('bg-green-600', 'bg-slate-900'); // Revert to black
            copyBtn.classList.replace('border-green-600', 'border-slate-900');
            lucide.createIcons();
        }, 2000);
        }).catch(err => {   
        console.error("Clipboard write failed:", err);
        alert("Oops! Your browser blocked clipboard access. You can still highlight the raw markdown to copy it.");
    });
});
// NEW: The "Silver Bullet" PDF Export Logic
const pdfBtn = document.getElementById('pdfBtn');
pdfBtn.addEventListener('click', () => {
    if (typeof html2pdf === 'undefined') {
        alert("The PDF engine is still loading. Please wait a moment.");
        return;
    }

    const element = document.getElementById('visualPreview');
    
    // 1. Loading UI
    const originalText = pdfBtn.innerHTML;
    pdfBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-indigo-600"></i> Generating...';
    lucide.createIcons();

    // 2. The Configuration with the OnClone Magic
    const opt = {
        margin:       0.5,
        filename:     'MD_Studio_Export.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true,
            // THE SILVER BULLET: Modifying the invisible clone before the camera snaps
            onclone: function (clonedDoc) {
                // A. Strip the straitjacket off the cloned Body
                clonedDoc.body.classList.remove('h-screen', 'overflow-hidden');
                clonedDoc.body.style.height = 'max-content';
                clonedDoc.body.style.overflow = 'visible';

                // B. Find our preview inside the clone
                const clonedPreview = clonedDoc.getElementById('visualPreview');
                
                // C. Walk up the HTML tree and violently remove all scrollbars and height limits
                let parent = clonedPreview.parentElement;
                while (parent && parent.tagName !== 'BODY') {
                    parent.classList.remove('overflow-y-auto', 'overflow-hidden', 'flex-1', 'h-screen');
                    parent.style.height = 'max-content';
                    parent.style.overflow = 'visible';
                    parent = parent.parentElement;
                }
            }
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // 3. Generate and Reset
    html2pdf().set(opt).from(element).save().then(() => {
        pdfBtn.innerHTML = originalText;
        lucide.createIcons();
    }).catch(err => {
        console.error("PDF Engine Crash:", err);
        alert("Failed to generate PDF. Check the console.");
        pdfBtn.innerHTML = originalText;
        lucide.createIcons();
    });
});
// Boot it up!
renderBuilder();
updatePreview();
// NEW: Badge Modal Logic
const badgeModal = document.getElementById('badgeModal');
const insertBadgeBtn = document.getElementById('insertBadgeBtn');
const cancelBadgeBtn = document.getElementById('cancelBadgeBtn');

cancelBadgeBtn.addEventListener('click', () => {
    badgeModal.classList.add('hidden');
    if (activeInput) activeInput.focus();
});

insertBadgeBtn.addEventListener('click', () => {
    if (!activeInput || slashIndex === -1) {
        console.error("Lost track of the input block.");
        return;
    }

    let generatedBadges = "";
    if (document.getElementById('badgeLicense').checked) generatedBadges += "![License](https://img.shields.io/badge/license-MIT-blue.svg) ";
    if (document.getElementById('badgeNpm').checked) generatedBadges += "![NPM](https://img.shields.io/badge/npm-v1.0.0-green.svg) ";
    if (document.getElementById('badgeBuild').checked) generatedBadges += "![Build](https://img.shields.io/badge/build-passing-brightgreen.svg) ";

    const text = activeInput.value;
    const blockId = activeInput.getAttribute('data-block-id');
    
    // Use the saved positions to swap the '/badges' text with actual images
    const beforeSlash = text.substring(0, slashIndex);
    const afterCursor = text.substring(savedCursorPos);
    const newText = beforeSlash + generatedBadges + afterCursor;

    activeInput.value = newText;
    AppState.updateBlock(blockId, newText);
    updatePreview();
    
    badgeModal.classList.add('hidden');
    hidePalette(true); // Now we safely reset the variables
    
    activeInput.style.height = 'auto';
    activeInput.style.height = (activeInput.scrollHeight) + 'px';
    activeInput.focus();
});

cancelBadgeBtn.addEventListener('click', () => {
    badgeModal.classList.add('hidden');
    hidePalette(true); // Reset on cancel too
});