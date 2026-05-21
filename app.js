document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const views = document.querySelectorAll('.view');
    const libraryView = document.getElementById('libraryView');
    const playerView = document.getElementById('playerView');
    const favoritesView = document.getElementById('favoritesView');
    const searchView = document.getElementById('searchView');
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    
    const bookGrid = document.getElementById('bookGrid');
    const favoritesGrid = document.getElementById('favoritesGrid');
    const searchGrid = document.getElementById('searchGrid');
    const emptyLibraryMsg = document.getElementById('emptyLibraryMsg');
    const emptyFavoritesMsg = document.getElementById('emptyFavoritesMsg');
    const emptySearchMsg = document.getElementById('emptySearchMsg');
    const searchInput = document.getElementById('searchInput');
    
    const navLibraryBtn = document.getElementById('navLibraryBtn');
    const navSearchBtn = document.getElementById('navSearchBtn');
    const navFavoritesBtn = document.getElementById('navFavoritesBtn');
    
    const openAddBookModalBtn = document.getElementById('openAddBookModalBtn');
    const closeAddBookModalBtn = document.getElementById('closeAddBookModalBtn');
    const addBookModal = document.getElementById('addBookModal');
    const addBookForm = document.getElementById('addBookForm');
    
    const bookCoverInput = document.getElementById('bookCoverInput');
    const bookAudioInput = document.getElementById('bookAudioInput');
    const coverFileName = document.getElementById('coverFileName');
    const audioFileName = document.getElementById('audioFileName');
    const saveBookBtn = document.getElementById('saveBookBtn');
    const savingMsg = document.getElementById('savingMsg');

    const backToLibraryBtn = document.getElementById('backToLibraryBtn');
    
    // Player Elements
    const audioPlayer = document.getElementById('audioPlayer');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playIcon = document.getElementById('playIcon');
    const progressBar = document.getElementById('progressBar');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const speedBtn = document.getElementById('speedBtn');
    
    const playerBookTitle = document.getElementById('playerBookTitle');
    const playerBookAuthor = document.getElementById('playerBookAuthor');
    const playerBookTitleSmall = document.getElementById('playerBookTitleSmall');
    const playerBookCover = document.getElementById('playerBookCover');
    
    // Speed Modal
    const speedModal = document.getElementById('speedModal');
    const closeSpeedModal = document.getElementById('closeSpeedModal');
    const speedOptions = document.querySelectorAll('.speed-option');

    // Notes Modals
    const openAddNoteModalBtn = document.getElementById('openAddNoteModalBtn');
    const addNoteModal = document.getElementById('addNoteModal');
    const closeAddNoteModalBtn = document.getElementById('closeAddNoteModalBtn');
    const noteTimestampDisplay = document.getElementById('noteTimestampDisplay');
    const addNoteForm = document.getElementById('addNoteForm');
    const noteTextInput = document.getElementById('noteTextInput');

    const openNotesListModalBtn = document.getElementById('openNotesListModalBtn');
    const notesListModal = document.getElementById('notesListModal');
    const closeNotesListModalBtn = document.getElementById('closeNotesListModalBtn');
    const notesListContainer = document.getElementById('notesListContainer');
    const emptyNotesMsg = document.getElementById('emptyNotesMsg');

    // ---- State ----
    let db;
    let books = [];
    let currentBookId = null;
    let isPlaying = false;
    let objectUrls = []; // To revoke memory leaks

    // ---- Database Initialization (IndexedDB) ----
    const request = indexedDB.open('AudiobookDB', 1);

    request.onerror = (event) => {
        console.error("Database error: ", event.target.errorCode);
    };

    request.onupgradeneeded = (event) => {
        db = event.target.result;
        const objectStore = db.createObjectStore('books', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('title', 'title', { unique: false });
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        loadBooksFromDB();
    };

    // ---- UI Navigation ----
    function switchView(viewId) {
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        // Update nav icons
        navItems.forEach(item => item.classList.remove('active'));
        
        if(viewId === 'libraryView') {
            navItems[0].classList.add('active'); // Ana Sayfa
            updateBookCardsUI();
        } else if(viewId === 'searchView') {
            navItems[1].classList.add('active'); // Ara
            searchInput.value = '';
            renderSearch('');
        } else if(viewId === 'favoritesView') {
            navItems[2].classList.add('active'); // Kitaplığım
            renderFavorites();
        }

        // Durdurma işlemi: Eğer playerView'dan çıkılıyorsa ve kitap çalıyorsa durdur
        if (viewId !== 'playerView' && isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
            playerBookCover.classList.remove('playing');
            updateBookCardsUI();
        }
    }

    backToLibraryBtn.addEventListener('click', () => switchView('libraryView'));
    navLibraryBtn.addEventListener('click', () => switchView('libraryView'));
    navSearchBtn.addEventListener('click', () => switchView('searchView'));
    navFavoritesBtn.addEventListener('click', () => switchView('favoritesView'));

    // ---- Search Logic ----
    searchInput.addEventListener('input', (e) => {
        renderSearch(e.target.value);
    });

    function renderSearch(query) {
        query = query.toLowerCase();
        let filteredBooks = books;
        if(query.trim() !== '') {
            filteredBooks = books.filter(b => b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query));
        }
        renderBookGrid(filteredBooks, searchGrid, emptySearchMsg);
    }

    // ---- File Input UI Updates ----
    bookCoverInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            coverFileName.textContent = e.target.files[0].name;
        } else {
            coverFileName.textContent = 'Resim Seç';
        }
    });

    bookAudioInput.addEventListener('change', (e) => {
        if(e.target.files.length > 0) {
            audioFileName.textContent = e.target.files[0].name;
        } else {
            audioFileName.textContent = 'Ses Seç';
        }
    });

    // ---- Add Book Logic ----
    openAddBookModalBtn.addEventListener('click', () => addBookModal.classList.add('active'));
    closeAddBookModalBtn.addEventListener('click', () => addBookModal.classList.remove('active'));

    addBookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if(!db) {
            alert('Veritabanı hazır değil, lütfen sayfayı yenileyip tekrar deneyin.');
            return;
        }

        const title = document.getElementById('bookTitleInput').value;
        const author = document.getElementById('bookAuthorInput').value;
        const coverFile = bookCoverInput.files[0];
        const audioFile = bookAudioInput.files[0];

        if(!audioFile) {
            alert('Lütfen bir ses dosyası seçin!');
            return;
        }

        saveBookBtn.classList.add('hidden');
        savingMsg.classList.remove('hidden');

        const newBook = {
            title: title,
            author: author,
            coverBlob: coverFile || null,
            audioBlob: audioFile,
            progress: 0,
            duration: 0,
            notes: [],
            isFavorite: false
        };

        try {
            const transaction = db.transaction(['books'], 'readwrite');
            const objectStore = transaction.objectStore('books');
            const request = objectStore.add(newBook);

            request.onsuccess = () => {
                addBookForm.reset();
                coverFileName.textContent = 'Resim Seç';
                audioFileName.textContent = 'Ses Seç';
                addBookModal.classList.remove('active');
                
                saveBookBtn.classList.remove('hidden');
                savingMsg.classList.add('hidden');
                
                loadBooksFromDB(); // Refresh library
            };

            request.onerror = (event) => {
                console.error('IndexedDB Error:', event.target.error);
                alert('Kitap kaydedilirken bir hata oluştu: ' + event.target.error.message);
                saveBookBtn.classList.remove('hidden');
                savingMsg.classList.add('hidden');
            };
        } catch (err) {
            console.error('Transaction Error:', err);
            alert('İşlem başlatılamadı: ' + err.message);
            saveBookBtn.classList.remove('hidden');
            savingMsg.classList.add('hidden');
        }
    });

    // ---- Load Books ----
    function loadBooksFromDB() {
        const transaction = db.transaction(['books'], 'readonly');
        const objectStore = transaction.objectStore('books');
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            books = event.target.result;
            renderLibrary();
        };
    }

    function deleteBook(id) {
        const transaction = db.transaction(['books'], 'readwrite');
        const objectStore = transaction.objectStore('books');
        const request = objectStore.delete(id);
        
        request.onsuccess = () => {
            // Stop playing if the deleted book was currently active
            if(currentBookId === id) {
                audioPlayer.pause();
                currentBookId = null;
                playerBookTitle.textContent = "Kitap Seçilmedi";
                playerBookTitleSmall.textContent = "Kitap Seçilmedi";
                playerBookAuthor.textContent = "-";
            }
            loadBooksFromDB(); // Refresh UI
        };
    }

    function renderLibrary() {
        renderBookGrid(books, bookGrid, emptyLibraryMsg);
    }

    function renderFavorites() {
        const favBooks = books.filter(b => b.isFavorite);
        renderBookGrid(favBooks, favoritesGrid, emptyFavoritesMsg);
    }

    function renderBookGrid(bookArray, gridElement, emptyMsgElement) {
        gridElement.innerHTML = '';
        
        if (bookArray.length === 0) {
            emptyMsgElement.style.display = 'flex';
            return;
        }
        
        emptyMsgElement.style.display = 'none';

        bookArray.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            
            // Generate temporary URL for cover
            let coverUrl = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400&h=400'; // default
            if(book.coverBlob) {
                coverUrl = URL.createObjectURL(book.coverBlob);
                objectUrls.push(coverUrl);
            }

            const favClass = book.isFavorite ? 'active' : '';

            const isCurrent = (book.id === currentBookId);
            const playingClass = (isCurrent && isPlaying) ? 'is-playing' : '';
            const activeClass = isCurrent ? 'active-card' : '';

            card.innerHTML = `
                <div class="book-card-image-wrapper ${activeClass} ${playingClass}">
                    <img src="${coverUrl}" alt="${book.title}" class="book-card-cover">
                    <div class="playing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                    <button class="favorite-book-btn ${favClass}" data-id="${book.id}" title="Favori"><i class="fas fa-heart"></i></button>
                    <button class="delete-book-btn" data-id="${book.id}" title="Kitabı Sil"><i class="fas fa-trash"></i></button>
                </div>
                <div class="book-card-info">
                    <h3>${book.title}</h3>
                    <p>${book.author}</p>
                </div>
            `;
            
            card.addEventListener('click', () => loadAndPlayBook(book, coverUrl));
            
            // Delete logic
            const deleteBtn = card.querySelector('.delete-book-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm(`"${book.title}" adlı kitabı kütüphanenizden silmek istediğinize emin misiniz?`)) {
                    deleteBook(book.id);
                }
            });

            // Favorite logic
            const favBtn = card.querySelector('.favorite-book-btn');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(book.id);
            });

            gridElement.appendChild(card);
        });
    }

    function toggleFavorite(id) {
        const transaction = db.transaction(['books'], 'readwrite');
        const objectStore = transaction.objectStore('books');
        const request = objectStore.get(id);
        
        request.onsuccess = (event) => {
            const book = event.target.result;
            if (book) {
                book.isFavorite = !book.isFavorite;
                objectStore.put(book).onsuccess = () => {
                    // Update memory array
                    const memoryBook = books.find(b => b.id === id);
                    if(memoryBook) memoryBook.isFavorite = book.isFavorite;
                    
                    // Re-render active view
                    if(document.getElementById('libraryView').classList.contains('active')) {
                        renderLibrary();
                    } else if(document.getElementById('favoritesView').classList.contains('active')) {
                        renderFavorites();
                    }
                };
            }
        };
    }

    // ---- Player Logic ----
    function loadAndPlayBook(book, coverUrl) {
        // If the book is already playing, just switch to player view
        if (currentBookId === book.id) {
            switchView('playerView');
            if (!isPlaying) {
                togglePlay(true);
            }
            return;
        }

        currentBookId = book.id;
        
        // Update UI
        playerBookTitle.textContent = book.title;
        playerBookTitleSmall.textContent = book.title;
        playerBookAuthor.textContent = book.author;
        playerBookCover.src = coverUrl;
        
        // Generate Audio URL
        const audioUrl = URL.createObjectURL(book.audioBlob);
        audioPlayer.src = audioUrl;
        
        // Apply saved progress
        audioPlayer.currentTime = book.progress || 0;
        
        // Switch to player view
        switchView('playerView');
        
        // Play
        togglePlay(true);
    }

    // Format time
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // Play/Pause
    function togglePlay(forcePlay = false) {
        if(!currentBookId) return;

        if (audioPlayer.paused || forcePlay) {
            audioPlayer.play().then(() => {
                isPlaying = true;
                playIcon.classList.remove('fa-play');
                playIcon.classList.add('fa-pause');
                playerBookCover.classList.add('playing');
            }).catch(e => console.error("Play prevented", e));
        } else {
            audioPlayer.pause();
            isPlaying = false;
            playIcon.classList.remove('fa-pause');
            playIcon.classList.add('fa-play');
            playerBookCover.classList.remove('playing');
        }
        
        // Update any active book cards in the grid
        updateBookCardsUI();
    }

    function updateBookCardsUI() {
        document.querySelectorAll('.book-card-image-wrapper').forEach(wrapper => {
            wrapper.classList.remove('is-playing');
        });
        
        if (isPlaying && currentBookId) {
            // Find the card for the current book and add playing class
            // We need to match by something... let's re-render or just search for the buttons with data-id
            const activeBtn = document.querySelector(`.favorite-book-btn[data-id="${currentBookId}"]`);
            if (activeBtn) {
                const wrapper = activeBtn.closest('.book-card-image-wrapper');
                if (wrapper) {
                    wrapper.classList.add('is-playing');
                    wrapper.classList.add('active-card');
                }
            }
        }
    }

    playPauseBtn.addEventListener('click', () => togglePlay());

    // Progress updates
    audioPlayer.addEventListener('timeupdate', () => {
        const { duration, currentTime } = audioPlayer;
        if (!isNaN(duration)) {
            const percent = (currentTime / duration) * 100;
            progressBar.value = currentTime;
            progressBar.max = duration;
            progressBar.style.setProperty('--progress-percent', `${percent}%`);
            
            currentTimeEl.textContent = formatTime(currentTime);
            totalTimeEl.textContent = formatTime(duration);

            // Save progress to DB every ~1 second (throttled by natural timeupdate frequency but let's just update memory then flush)
            updateBookProgressInDB(currentBookId, currentTime);
        }
    });

    audioPlayer.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
        progressBar.max = audioPlayer.duration;
    });

    audioPlayer.addEventListener('ended', () => {
        isPlaying = false;
        playIcon.classList.remove('fa-pause');
        playIcon.classList.add('fa-play');
        playerBookCover.classList.remove('playing');
        updateBookProgressInDB(currentBookId, 0); // reset
    });

    progressBar.addEventListener('input', (e) => {
        audioPlayer.currentTime = e.target.value;
    });

    function skipTime(seconds) {
        if(currentBookId) audioPlayer.currentTime += seconds;
    }

    rewindBtn.addEventListener('click', () => skipTime(-15));
    forwardBtn.addEventListener('click', () => skipTime(15));

    // Save progress to DB
    let saveTimeout;
    function updateBookProgressInDB(id, progress) {
        if(!db) return;
        // Debounce saving to avoid locking DB too often
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const transaction = db.transaction(['books'], 'readwrite');
            const objectStore = transaction.objectStore('books');
            const request = objectStore.get(id);
            
            request.onsuccess = (event) => {
                const book = event.target.result;
                if(book) {
                    book.progress = progress;
                    objectStore.put(book);
                }
            };
        }, 2000);
    }

    // ---- Speed Modal ----
    speedBtn.addEventListener('click', () => speedModal.classList.add('active'));
    closeSpeedModal.addEventListener('click', () => speedModal.classList.remove('active'));
    speedModal.addEventListener('click', (e) => {
        if (e.target === speedModal) speedModal.classList.remove('active');
    });

    document.querySelector('.speed-options').addEventListener('click', (e) => {
        if (!e.target.classList.contains('speed-option')) return;
        
        const newSpeed = e.target.getAttribute('data-speed');
        audioPlayer.playbackRate = parseFloat(newSpeed);
        
        speedBtn.textContent = newSpeed + 'x';
        speedOptions.forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-speed') === newSpeed.toString()) {
                opt.classList.add('active');
            }
        });
        speedModal.classList.remove('active');
    });

    // ---- Notes Logic ----
    let noteTimestampToSave = 0;

    openAddNoteModalBtn.addEventListener('click', () => {
        if (!currentBookId) return;
        // Pause audio while writing note
        if (isPlaying) togglePlay();
        
        noteTimestampToSave = audioPlayer.currentTime;
        noteTimestampDisplay.textContent = formatTime(noteTimestampToSave);
        addNoteModal.classList.add('active');
        noteTextInput.focus();
    });

    closeAddNoteModalBtn.addEventListener('click', () => {
        addNoteModal.classList.remove('active');
        addNoteForm.reset();
    });

    addNoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = noteTextInput.value.trim();
        if (!text || !currentBookId) return;

        const transaction = db.transaction(['books'], 'readwrite');
        const objectStore = transaction.objectStore('books');
        const request = objectStore.get(currentBookId);

        request.onsuccess = (event) => {
            const book = event.target.result;
            if (book) {
                if (!book.notes) book.notes = [];
                book.notes.push({
                    timestamp: noteTimestampToSave,
                    text: text
                });
                // Sort notes chronologically
                book.notes.sort((a, b) => a.timestamp - b.timestamp);
                
                const updateRequest = objectStore.put(book);
                updateRequest.onsuccess = () => {
                    addNoteForm.reset();
                    addNoteModal.classList.remove('active');
                    // Optionally resume playing
                    // togglePlay();
                };
            }
        };
    });

    openNotesListModalBtn.addEventListener('click', () => {
        if (!currentBookId) return;
        
        const transaction = db.transaction(['books'], 'readonly');
        const objectStore = transaction.objectStore('books');
        const request = objectStore.get(currentBookId);

        request.onsuccess = (event) => {
            const book = event.target.result;
            notesListContainer.innerHTML = '';
            
            if (!book || !book.notes || book.notes.length === 0) {
                emptyNotesMsg.style.display = 'block';
            } else {
                emptyNotesMsg.style.display = 'none';
                
                book.notes.forEach(note => {
                    const noteDiv = document.createElement('div');
                    noteDiv.className = 'note-item';
                    noteDiv.innerHTML = `
                        <span class="note-timestamp"><i class="fas fa-play-circle"></i> ${formatTime(note.timestamp)}</span>
                        <p class="note-text">${note.text}</p>
                    `;
                    
                    noteDiv.addEventListener('click', () => {
                        audioPlayer.currentTime = note.timestamp;
                        notesListModal.classList.remove('active');
                        if (!isPlaying) togglePlay();
                    });
                    
                    notesListContainer.appendChild(noteDiv);
                });
            }
            
            notesListModal.classList.add('active');
        };
    });

    closeNotesListModalBtn.addEventListener('click', () => {
        notesListModal.classList.remove('active');
    });

    // Close Modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target === addNoteModal) {
            addNoteModal.classList.remove('active');
        }
        if (e.target === notesListModal) {
            notesListModal.classList.remove('active');
        }
    });

    // ---- PWA Service Worker Registration ----
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('ServiceWorker başarıyla kaydedildi: ', registration.scope);
                })
                .catch((err) => {
                    console.log('ServiceWorker kayıt hatası: ', err);
                });
        });
    }

});
