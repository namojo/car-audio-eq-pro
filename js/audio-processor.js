// Audio Processing Module
class AudioProcessor {
    constructor(audioElement) {
        this.audioElement = audioElement;
        this.context = null;
        this.source = null;
        this.filters = [];
        this.analyser = null;
        this.limiter = null;
        this.masterGain = null;
        
        // 31-band EQ frequencies (ISO standard)
        this.frequencies = [
            20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
            200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
            2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
        ];
        
        this.presets = {
            'flat': new Array(31).fill(0),
            'bass-boost': [6, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            'vocal': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 5, 5, 5, 4, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            'rock': [5, 4, 3, 2, 1, 0, 0, -1, -2, -1, 0, 1, 2, 3, 4, 4, 4, 3, 2, 1, 0, 0, 1, 2, 3, 4, 5, 5, 4, 3, 2],
            'jazz': [0, 0, 0, 0, 0, 0, 0, 2, 3, 4, 4, 3, 2, 0, -1, -2, -2, -1, 0, 2, 3, 4, 4, 3, 2, 0, 0, 0, 0, 0, 0],
            'classical': [-3, -3, -3, -2, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, -2, -3, -3, -3, -2, -1, 0, 0, 1, 2, 3, 3, 3, 2],
            'car-sedan': [4, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0, -1, -2, -3],
            'car-suv': [5, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 4, 3, 2, 1, 0, -1, -2],
            'car-truck': [6, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0, -1]
        };
    }
    
    async initialize() {
        try {
            // Create audio context
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create source from audio element
            this.source = this.context.createMediaElementSource(this.audioElement);
            
            // Create analyser for spectrum visualization
            this.analyser = this.context.createAnalyser();
            this.analyser.fftSize = 4096;
            this.analyser.smoothingTimeConstant = 0.8;
            
            // Create filters
            this.createFilters();
            
            // Create limiter (compressor with high ratio)
            this.limiter = this.context.createDynamicsCompressor();
            this.limiter.threshold.value = -3;
            this.limiter.knee.value = 0;
            this.limiter.ratio.value = 20;
            this.limiter.attack.value = 0.003;
            this.limiter.release.value = 0.1;
            
            // Create master gain
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = 0.95; // Slight headroom
            
            // Connect audio graph
            this.connectAudioGraph();
            
        } catch (error) {
            console.error('Failed to initialize audio processor:', error);
            throw error;
        }
    }
    
    createFilters() {
        this.filters = this.frequencies.map((freq, index) => {
            const filter = this.context.createBiquadFilter();
            
            if (index === 0) {
                // First band - lowshelf
                filter.type = 'lowshelf';
                filter.frequency.value = freq;
            } else if (index === this.frequencies.length - 1) {
                // Last band - highshelf
                filter.type = 'highshelf';
                filter.frequency.value = freq;
            } else {
                // Middle bands - peaking
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = this.calculateQ(freq, index);
            }
            
            filter.gain.value = 0;
            return filter;
        });
    }
    
    calculateQ(frequency, index) {
        // Calculate Q value for 1/3 octave bands
        const octaveWidth = 1/3;
        return Math.sqrt(Math.pow(2, octaveWidth)) / (Math.pow(2, octaveWidth) - 1);
    }
    
    connectAudioGraph() {
        // Connect source to first filter
        let previousNode = this.source;
        
        // Chain all filters
        for (const filter of this.filters) {
            previousNode.connect(filter);
            previousNode = filter;
        }
        
        // Connect to analyser
        previousNode.connect(this.analyser);
        
        // Connect to limiter
        this.analyser.connect(this.limiter);
        
        // Connect to master gain
        this.limiter.connect(this.masterGain);
        
        // Connect to destination
        this.masterGain.connect(this.context.destination);
    }
    
    setFilterGain(index, gain) {
        if (this.filters[index]) {
            this.filters[index].gain.setValueAtTime(gain, this.context.currentTime);
        }
    }
    
    getAllGains() {
        return this.filters.map(filter => filter.gain.value);
    }
    
    setAllGains(gains) {
        gains.forEach((gain, index) => {
            this.setFilterGain(index, gain);
        });
    }
    
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (preset) {
            this.setAllGains(preset);
            return preset;
        }
        return null;
    }
    
    getFrequencies() {
        return this.frequencies;
    }
    
    setLimiter(enabled) {
        if (enabled) {
            this.limiter.ratio.value = 20;
        } else {
            this.limiter.ratio.value = 1;
        }
    }
    
    getAnalyserData() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.analyser.getFloatFrequencyData(dataArray);
        return dataArray;
    }
    
    getFrequencyResponse(targetFrequencies) {
        const data = this.getAnalyserData();
        const sampleRate = this.context.sampleRate;
        const nyquist = sampleRate / 2;
        const responses = [];
        
        for (const freq of targetFrequencies) {
            const bin = Math.round((freq / nyquist) * data.length);
            if (bin < data.length) {
                responses.push(data[bin]);
            } else {
                responses.push(-100); // Below noise floor
            }
        }
        
        return responses;
    }
    
    // Generate test signals for calibration
    async generateSweep(duration = 10) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Exponential sweep from 20Hz to 20kHz
        const startFreq = 20;
        const endFreq = 20000;
        const k = Math.pow(endFreq / startFreq, 1 / duration);
        
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const freq = startFreq * Math.pow(k, t);
            const phase = 2 * Math.PI * startFreq * (Math.pow(k, t) - 1) / Math.log(k);
            data[i] = 0.5 * Math.sin(phase);
        }
        
        // Apply fade in/out
        const fadeTime = 0.1;
        const fadeSamples = fadeTime * sampleRate;
        for (let i = 0; i < fadeSamples; i++) {
            const fade = i / fadeSamples;
            data[i] *= fade;
            data[length - 1 - i] *= fade;
        }
        
        return buffer;
    }
    
    async generatePinkNoise(duration = 10) {
        const sampleRate = this.context.sampleRate;
        const length = sampleRate * duration;
        const buffer = this.context.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Pink noise generation using Voss-McCartney algorithm
        const numRows = 16;
        const rows = new Array(numRows).fill(0);
        let runningSum = 0;
        
        for (let i = 0; i < length; i++) {
            let idx = i;
            for (let row = 0; row < numRows; row++) {
                if (idx & 1) {
                    runningSum -= rows[row];
                    rows[row] = Math.random() * 2 - 1;
                    runningSum += rows[row];
                }
                idx >>= 1;
            }
            data[i] = runningSum * 0.1; // Scale down
        }
        
        return buffer;
    }
    
    // Play test signal
    async playTestSignal(buffer) {
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        
        // Disconnect normal audio path temporarily
        this.source.disconnect();
        
        // Connect test signal through filters
        let previousNode = source;
        for (const filter of this.filters) {
            previousNode.connect(filter);
            previousNode = filter;
        }
        previousNode.connect(this.analyser);
        this.analyser.connect(this.context.destination);
        
        source.start();
        
        return new Promise((resolve) => {
            source.onended = () => {
                // Reconnect normal audio path
                this.connectAudioGraph();
                resolve();
            };
        });
    }
}