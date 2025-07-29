// Main App Controller
class CarAudioEQApp {
    constructor() {
        this.audioProcessor = null;
        this.spectrumAnalyzer = null;
        this.calibration = null;
        this.isPlaying = false;
        
        this.initializeApp();
    }
    
    async initializeApp() {
        // Check for browser compatibility
        if (!window.AudioContext && !window.webkitAudioContext) {
            alert('Your browser does not support Web Audio API');
            return;
        }
        
        // Initialize components
        this.setupDOM();
        this.setupEventListeners();
        this.initializeAudioComponents();
        this.loadSettings();
        this.setupPWA();
    }
    
    setupDOM() {
        // Cache DOM elements
        this.elements = {
            fileInput: document.getElementById('fileInput'),
            chooseFileBtn: document.getElementById('chooseFileBtn'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            playIcon: document.getElementById('playIcon'),
            pauseIcon: document.getElementById('pauseIcon'),
            audioElement: document.getElementById('audioElement'),
            progressBar: document.getElementById('progressBar'),
            currentTime: document.getElementById('currentTime'),
            duration: document.getElementById('duration'),
            trackTitle: document.getElementById('trackTitle'),
            trackArtist: document.getElementById('trackArtist'),
            albumArt: document.getElementById('albumArt'),
            eqBands: document.getElementById('eqBands'),
            presetSelect: document.getElementById('presetSelect'),
            resetEqBtn: document.getElementById('resetEqBtn'),
            calibrateBtn: document.getElementById('calibrateBtn'),
            advancedCalBtn: document.getElementById('advancedCalBtn'),
            advancedOptions: document.getElementById('advancedOptions'),
            calibrationStatus: document.getElementById('calibrationStatus'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsModal: document.getElementById('settingsModal'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            spectrumCanvas: document.getElementById('spectrumCanvas'),
            analyzerModeBtn: document.getElementById('analyzerModeBtn'),
            rtaModeBtn: document.getElementById('rta-mode'),
            measureTime: document.getElementById('measureTime'),
            measureTimeValue: document.getElementById('measureTimeValue'),
            targetCurve: document.getElementById('targetCurve'),
            smoothing: document.getElementById('smoothing'),
            eqType: document.getElementById('eqType'),
            crossfadeEnabled: document.getElementById('crossfadeEnabled'),
            limiterEnabled: document.getElementById('limiterEnabled'),
            batterySaver: document.getElementById('batterySaver')
        };
    }
    
    setupEventListeners() {
        // File selection
        this.elements.chooseFileBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
        
        // Playback controls
        this.elements.playPauseBtn.addEventListener('click', () => {
            this.togglePlayback();
        });
        
        this.elements.audioElement.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.elements.audioElement.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });
        
        this.elements.audioElement.addEventListener('ended', () => {
            this.handleTrackEnd();
        });
        
        this.elements.progressBar.addEventListener('input', (e) => {
            this.seekTo(e.target.value);
        });
        
        // EQ controls
        this.elements.presetSelect.addEventListener('change', (e) => {
            this.loadPreset(e.target.value);
        });
        
        this.elements.resetEqBtn.addEventListener('click', () => {
            this.resetEQ();
        });
        
        // Calibration
        this.elements.calibrateBtn.addEventListener('click', () => {
            this.startCalibration();
        });
        
        this.elements.advancedCalBtn.addEventListener('click', () => {
            this.toggleAdvancedOptions();
        });
        
        this.elements.measureTime.addEventListener('input', (e) => {
            this.elements.measureTimeValue.textContent = `${e.target.value}s`;
        });
        
        // Settings
        this.elements.settingsBtn.addEventListener('click', () => {
            this.openSettings();
        });
        
        this.elements.closeSettingsBtn.addEventListener('click', () => {
            this.closeSettings();
        });
        
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.closeSettings();
            }
        });
        
        // Analyzer modes
        this.elements.analyzerModeBtn.addEventListener('click', () => {
            this.spectrumAnalyzer.setMode('spectrum');
        });
        
        this.elements.rtaModeBtn.addEventListener('click', () => {
            this.spectrumAnalyzer.setMode('rta');
        });
        
        // Settings changes
        this.elements.eqType.addEventListener('change', (e) => {
            this.changeEQType(e.target.value);
        });
        
        this.elements.limiterEnabled.addEventListener('change', (e) => {
            if (this.audioProcessor) {
                this.audioProcessor.setLimiter(e.target.checked);
            }
        });
        
        this.elements.batterySaver.addEventListener('change', (e) => {
            this.setBatterySaver(e.target.checked);
        });
    }
    
    async initializeAudioComponents() {
        try {
            // Initialize audio processor
            this.audioProcessor = new AudioProcessor(this.elements.audioElement);
            await this.audioProcessor.initialize();
            
            // Initialize spectrum analyzer
            this.spectrumAnalyzer = new SpectrumAnalyzer(
                this.elements.spectrumCanvas,
                this.audioProcessor.analyser
            );
            
            // Initialize calibration system
            this.calibration = new Calibration(
                this.audioProcessor,
                this.updateCalibrationStatus.bind(this)
            );
            
            // Create EQ UI
            this.createEQBands();
            
        } catch (error) {
            console.error('Failed to initialize audio components:', error);
            this.showError('Failed to initialize audio system');
        }
    }
    
    createEQBands() {
        const frequencies = this.audioProcessor.getFrequencies();
        this.elements.eqBands.innerHTML = '';
        
        frequencies.forEach((freq, index) => {
            const band = document.createElement('div');
            band.className = 'eq-band';
            
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.className = 'eq-slider';
            slider.min = '-12';
            slider.max = '12';
            slider.value = '0';
            slider.step = '0.5';
            slider.dataset.frequency = freq;
            slider.dataset.index = index;
            
            const label = document.createElement('div');
            label.className = 'eq-label';
            label.textContent = this.formatFrequency(freq);
            
            const value = document.createElement('div');
            value.className = 'eq-value';
            value.textContent = '0 dB';
            value.id = `eq-value-${index}`;
            
            slider.addEventListener('input', (e) => {
                const gain = parseFloat(e.target.value);
                this.audioProcessor.setFilterGain(index, gain);
                value.textContent = `${gain > 0 ? '+' : ''}${gain} dB`;
                this.elements.presetSelect.value = 'custom';
            });
            
            band.appendChild(value);
            band.appendChild(slider);
            band.appendChild(label);
            
            this.elements.eqBands.appendChild(band);
        });
    }
    
    formatFrequency(freq) {
        if (freq >= 1000) {
            return `${(freq / 1000).toFixed(freq % 1000 === 0 ? 0 : 1)}k`;
        }
        return `${freq}`;
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        this.elements.audioElement.src = url;
        
        // Update track info
        this.elements.trackTitle.textContent = file.name.replace(/\.[^/.]+$/, '');
        this.elements.trackArtist.textContent = 'Local File';
        
        // Enable play button
        this.elements.playPauseBtn.disabled = false;
        
        // Try to extract album art (if supported)
        this.extractAlbumArt(file);
    }
    
    async extractAlbumArt(file) {
        // This is a placeholder - in a real app, you'd use a library like jsmediatags
        // For now, just show the default music icon
        this.elements.albumArt.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
        `;
    }
    
    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        try {
            await this.elements.audioElement.play();
            this.isPlaying = true;
            this.elements.playIcon.style.display = 'none';
            this.elements.pauseIcon.style.display = 'block';
            this.spectrumAnalyzer.start();
        } catch (error) {
            console.error('Playback failed:', error);
            this.showError('Failed to play audio');
        }
    }
    
    pause() {
        this.elements.audioElement.pause();
        this.isPlaying = false;
        this.elements.playIcon.style.display = 'block';
        this.elements.pauseIcon.style.display = 'none';
        this.spectrumAnalyzer.stop();
    }
    
    updateProgress() {
        const current = this.elements.audioElement.currentTime;
        const duration = this.elements.audioElement.duration;
        
        if (duration) {
            const progress = (current / duration) * 100;
            this.elements.progressBar.value = progress;
            this.elements.currentTime.textContent = this.formatTime(current);
        }
    }
    
    updateDuration() {
        const duration = this.elements.audioElement.duration;
        if (duration) {
            this.elements.duration.textContent = this.formatTime(duration);
        }
    }
    
    seekTo(percentage) {
        const duration = this.elements.audioElement.duration;
        if (duration) {
            const time = (percentage / 100) * duration;
            this.elements.audioElement.currentTime = time;
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    handleTrackEnd() {
        this.isPlaying = false;
        this.elements.playIcon.style.display = 'block';
        this.elements.pauseIcon.style.display = 'none';
        this.elements.progressBar.value = 0;
        this.elements.currentTime.textContent = '0:00';
        this.spectrumAnalyzer.stop();
    }
    
    loadPreset(presetName) {
        const preset = this.audioProcessor.loadPreset(presetName);
        if (preset) {
            this.updateEQSliders(preset);
        }
    }
    
    updateEQSliders(gains) {
        const sliders = this.elements.eqBands.querySelectorAll('.eq-slider');
        sliders.forEach((slider, index) => {
            if (gains[index] !== undefined) {
                slider.value = gains[index];
                const value = document.getElementById(`eq-value-${index}`);
                value.textContent = `${gains[index] > 0 ? '+' : ''}${gains[index]} dB`;
                this.audioProcessor.setFilterGain(index, gains[index]);
            }
        });
    }
    
    resetEQ() {
        this.loadPreset('flat');
        this.elements.presetSelect.value = 'flat';
    }
    
    async startCalibration() {
        if (!this.isPlaying) {
            this.showError('Please play music before calibrating');
            return;
        }
        
        const measureTime = parseInt(this.elements.measureTime.value) * 1000;
        const targetCurve = this.elements.targetCurve.value;
        const smoothing = this.elements.smoothing.value;
        
        try {
            this.elements.calibrateBtn.disabled = true;
            this.elements.calibrateBtn.textContent = 'Calibrating...';
            
            const corrections = await this.calibration.calibrate({
                duration: measureTime,
                targetCurve: targetCurve,
                smoothing: smoothing
            });
            
            // Apply corrections
            this.updateEQSliders(corrections);
            this.elements.presetSelect.value = 'custom';
            
            this.showSuccess('Calibration completed successfully!');
            
        } catch (error) {
            console.error('Calibration failed:', error);
            this.showError('Calibration failed: ' + error.message);
        } finally {
            this.elements.calibrateBtn.disabled = false;
            this.elements.calibrateBtn.textContent = 'Start Calibration';
        }
    }
    
    toggleAdvancedOptions() {
        const isVisible = this.elements.advancedOptions.style.display === 'block';
        this.elements.advancedOptions.style.display = isVisible ? 'none' : 'block';
    }
    
    updateCalibrationStatus(status, type = 'info') {
        this.elements.calibrationStatus.className = `status-message ${type}`;
        this.elements.calibrationStatus.textContent = status;
        this.elements.calibrationStatus.style.display = 'block';
        
        if (type !== 'error') {
            setTimeout(() => {
                this.elements.calibrationStatus.style.display = 'none';
            }, 5000);
        }
    }
    
    showError(message) {
        this.updateCalibrationStatus(message, 'error');
    }
    
    showSuccess(message) {
        this.updateCalibrationStatus(message, 'info');
    }
    
    openSettings() {
        this.elements.settingsModal.style.display = 'flex';
    }
    
    closeSettings() {
        this.elements.settingsModal.style.display = 'none';
        this.saveSettings();
    }
    
    changeEQType(type) {
        // This would switch between graphic and parametric EQ
        // For now, we'll just show a message
        if (type === 'parametric') {
            this.showError('Parametric EQ coming soon!');
            this.elements.eqType.value = 'graphic';
        }
    }
    
    setBatterySaver(enabled) {
        if (this.spectrumAnalyzer) {
            this.spectrumAnalyzer.setBatterySaver(enabled);
        }
    }
    
    saveSettings() {
        const settings = {
            eqType: this.elements.eqType.value,
            crossfade: this.elements.crossfadeEnabled.checked,
            limiter: this.elements.limiterEnabled.checked,
            batterySaver: this.elements.batterySaver.checked,
            targetCurve: this.elements.targetCurve.value,
            smoothing: this.elements.smoothing.value
        };
        
        localStorage.setItem('carAudioEQSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const saved = localStorage.getItem('carAudioEQSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.elements.eqType.value = settings.eqType || 'graphic';
                this.elements.crossfadeEnabled.checked = settings.crossfade || false;
                this.elements.limiterEnabled.checked = settings.limiter !== false;
                this.elements.batterySaver.checked = settings.batterySaver || false;
                this.elements.targetCurve.value = settings.targetCurve || 'flat';
                this.elements.smoothing.value = settings.smoothing || '1/3';
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        }
    }
    
    setupPWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('Service worker registered'))
                    .catch(err => console.error('Service worker registration failed:', err));
            });
        }
        
        // Handle install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Show custom install UI
            const installPrompt = document.createElement('div');
            installPrompt.className = 'install-prompt';
            installPrompt.innerHTML = `
                <p>Install Car Audio EQ Pro for offline access</p>
                <div>
                    <button class="small-btn" onclick="this.parentElement.parentElement.remove()">Later</button>
                    <button class="primary-btn" id="installBtn">Install</button>
                </div>
            `;
            
            document.body.appendChild(installPrompt);
            
            document.getElementById('installBtn').addEventListener('click', async () => {
                installPrompt.remove();
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`User response: ${outcome}`);
                deferredPrompt = null;
            });
        });
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new CarAudioEQApp();
    });
} else {
    window.app = new CarAudioEQApp();
}