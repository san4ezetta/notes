// DOM элементы
const noteInput = document.getElementById('note-input');
const addNoteBtn = document.getElementById('add-note-btn');
const notesList = document.getElementById('notes-list');
const statusIndicator = document.getElementById('status-indicator');
const noteModal = document.getElementById('note-modal');
const editNoteInput = document.getElementById('edit-note-input');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const closeModal = document.querySelector('.close-modal');

// Переменные
let notes = [];
let currentEditingNoteId = null;
let db;

// Инициализация IndexedDB
function initIndexedDB() {
    const request = indexedDB.open('NotesDB', 1);
    
    request.onerror = function(event) {
        console.error('Ошибка открытия IndexedDB:', event.target.error);
        // Если IndexedDB не доступен, используем localStorage
        useLocalStorage();
    };
    
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('notes', { keyPath: 'id' });
    };
    
    request.onsuccess = function(event) {
        db = event.target.result;
        loadNotes();
    };
}

// Использование localStorage, если IndexedDB недоступен
function useLocalStorage() {
    console.log('Использование localStorage вместо IndexedDB');
    // Загрузка заметок из localStorage
    const storedNotes = localStorage.getItem('notes');
    if (storedNotes) {
        notes = JSON.parse(storedNotes);
        renderNotes();
    }
}

// Загрузка заметок из IndexedDB
function loadNotes() {
    const transaction = db.transaction(['notes'], 'readonly');
    const objectStore = transaction.objectStore('notes');
    const request = objectStore.getAll();
    
    request.onsuccess = function(event) {
        notes = event.target.result;
        renderNotes();
    };
}

// Отображение заметок
function renderNotes() {
    notesList.innerHTML = '';
    
    if (notes.length === 0) {
        notesList.innerHTML = '<p class="empty-notes">У вас пока нет заметок</p>';
        return;
    }
    
    // Сортировка заметок по дате (новые вверху)
    notes.sort((a, b) => b.timestamp - a.timestamp);
    
    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'note-card';
        noteCard.dataset.id = note.id;
        
        const date = new Date(note.timestamp);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        
        // Ограничение длины текста заметки для предварительного просмотра
        const previewText = note.text.length > 150 ? note.text.substring(0, 150) + '...' : note.text;
        
        noteCard.innerHTML = `
            <div class="note-date">${formattedDate}</div>
            <div class="note-text">${previewText}</div>
            <div class="note-actions">
                <button class="edit-btn" data-id="${note.id}">Редактировать</button>
                <button class="delete-btn" data-id="${note.id}">Удалить</button>
            </div>
        `;
        
        notesList.appendChild(noteCard);
    });
    
    // Добавление обработчиков событий
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteNote);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEditNote);
    });
    
    document.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Открыть модальное окно для просмотра заметки только при клике на текст
            if (!e.target.classList.contains('delete-btn') && 
                !e.target.classList.contains('edit-btn')) {
                const noteId = this.dataset.id;
                openNoteModal(noteId);
            }
        });
    });
}

// Добавление новой заметки
function addNote() {
    const text = noteInput.value.trim();
    if (!text) return;
    
    const newNote = {
        id: Date.now().toString(),
        text: text,
        timestamp: Date.now()
    };
    
    if (db) {
        // Сохранение в IndexedDB
        const transaction = db.transaction(['notes'], 'readwrite');
        const objectStore = transaction.objectStore('notes');
        const request = objectStore.add(newNote);
        
        request.onsuccess = function() {
            notes.push(newNote);
            noteInput.value = '';
            renderNotes();
        };
    } else {
        // Сохранение в localStorage
        notes.push(newNote);
        localStorage.setItem('notes', JSON.stringify(notes));
        noteInput.value = '';
        renderNotes();
    }
}

// Обработчик удаления заметки
function handleDeleteNote(e) {
    e.stopPropagation();
    const noteId = e.target.getAttribute('data-id');
    
    if (confirm('Вы уверены, что хотите удалить эту заметку?')) {
        if (db) {
            // Удаление из IndexedDB
            const transaction = db.transaction(['notes'], 'readwrite');
            const objectStore = transaction.objectStore('notes');
            const request = objectStore.delete(noteId);
            
            request.onsuccess = function() {
                notes = notes.filter(note => note.id !== noteId);
                renderNotes();
            };
        } else {
            // Удаление из localStorage
            notes = notes.filter(note => note.id !== noteId);
            localStorage.setItem('notes', JSON.stringify(notes));
            renderNotes();
        }
    }
}

// Открытие модального окна для просмотра/редактирования заметки
function openNoteModal(noteId) {
    const note = notes.find(note => note.id === noteId);
    if (!note) return;
    
    currentEditingNoteId = noteId;
    editNoteInput.value = note.text;
    noteModal.style.display = 'block';
}

// Обработчик редактирования заметки
function handleEditNote(e) {
    e.stopPropagation();
    const noteId = e.target.getAttribute('data-id');
    openNoteModal(noteId);
}

// Сохранение отредактированной заметки
function saveEditedNote() {
    if (!currentEditingNoteId) return;
    
    const text = editNoteInput.value.trim();
    if (!text) return;
    
    const noteIndex = notes.findIndex(note => note.id === currentEditingNoteId);
    if (noteIndex === -1) return;
    
    notes[noteIndex].text = text;
    notes[noteIndex].timestamp = Date.now(); // Обновление времени редактирования
    
    if (db) {
        // Обновление в IndexedDB
        const transaction = db.transaction(['notes'], 'readwrite');
        const objectStore = transaction.objectStore('notes');
        const request = objectStore.put(notes[noteIndex]);
        
        request.onsuccess = function() {
            closeNoteModal();
            renderNotes();
        };
    } else {
        // Обновление в localStorage
        localStorage.setItem('notes', JSON.stringify(notes));
        closeNoteModal();
        renderNotes();
    }
}

// Закрытие модального окна
function closeNoteModal() {
    noteModal.style.display = 'none';
    currentEditingNoteId = null;
}

// Проверка статуса соединения
function updateOnlineStatus() {
    if (navigator.onLine) {
        statusIndicator.textContent = 'Онлайн';
        statusIndicator.className = 'online';
    } else {
        statusIndicator.textContent = 'Офлайн-режим';
        statusIndicator.className = 'offline';
    }
}

// Обработчики событий
addNoteBtn.addEventListener('click', addNote);
saveNoteBtn.addEventListener('click', saveEditedNote);
cancelEditBtn.addEventListener('click', closeNoteModal);
closeModal.addEventListener('click', closeNoteModal);

// Обработка клавиш Enter и Escape
noteInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addNote();
    }
});

editNoteInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey && e.ctrlKey) {
        e.preventDefault();
        saveEditedNote();
    } else if (e.key === 'Escape') {
        closeNoteModal();
    }
});

// Обработка кликов вне модального окна
window.addEventListener('click', function(e) {
    if (e.target === noteModal) {
        closeNoteModal();
    }
});

// Обработчики статуса соединения
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initIndexedDB();
    updateOnlineStatus();
});