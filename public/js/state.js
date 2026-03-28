// state.js - Pure Markdown Engine with Local Storage Auto-Save

const defaultBlocks = [
    { id: 'b1', content: '# My Awesome Project' },
    { id: 'b2', content: 'A robust, open-source tool built for developers.' },
    { id: 'b3', content: '## Installation\n\n```bash\nnpm install my-project\n```' }
];

const AppState = {
    // Load from local storage, or use defaults if empty
    blocks: JSON.parse(localStorage.getItem('md-studio-save')) || defaultBlocks,

    save() {
        localStorage.setItem('md-studio-save', JSON.stringify(this.blocks));
    },

    addBlock() {
        const newId = 'b' + Date.now();
        this.blocks.push({ id: newId, content: '' });
        this.save();
        return newId;
    },

    updateBlock(id, newContent) {
        const block = this.blocks.find(b => b.id === id);
        if (block) {
            block.content = newContent;
            this.save();
        }
    },

    reorderBlocks(oldIndex, newIndex) {
        const movedItem = this.blocks.splice(oldIndex, 1)[0];
        this.blocks.splice(newIndex, 0, movedItem);
        this.save();
    },

    deleteBlock(id) {
        this.blocks = this.blocks.filter(b => b.id !== id);
        this.save();
    },

    compileToMarkdown() {
        return this.blocks.map(block => block.content).join('\n\n');
    }
};