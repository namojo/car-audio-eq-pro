// Spectrum Analyzer Visualization
class SpectrumAnalyzer {
    constructor(canvas, analyser) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.analyser = analyser;
        this.animationId = null;
        this.mode = 'spectrum'; // 'spectrum' or 'rta'
        this.batterySaver = false;
        this.frameSkip = 0;
        
        // Set canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // RTA (Real-Time Analyzer) settings
        this.rtaBands = 31; // Match EQ bands
        this.rtaData = new Float32Array(this.rtaBands);
        this.rtaPeakData = new Float32Array(this.rtaBands);
        this.rtaPeakHoldTime = new Array(this.rtaBands).fill(0);
        
        // Spectrum settings
        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Float32Array(this.bufferLength);
        
        // Visual settings
        this.gradient = null;
        this.createGradient();
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.createGradient();
    }
    
    createGradient() {
        const height = this.canvas.height / window.devicePixelRatio;
        this.gradient = this.ctx.createLinearGradient(0, height, 0, 0);
        this.gradient.addColorStop(0, '#1db954');
        this.gradient.addColorStop(0.5, '#ffa116');
        this.gradient.addColorStop(1, '#e22134');
    }
    
    start() {
        if (!this.animationId) {
            this.draw();
        }
    }
    
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    setMode(mode) {
        this.mode = mode;
    }
    
    setBatterySaver(enabled) {
        this.batterySaver = enabled;
    }
    
    draw() {
        // Battery saver mode - skip frames
        if (this.batterySaver) {
            this.frameSkip++;
            if (this.frameSkip < 2) {
                this.animationId = requestAnimationFrame(() => this.draw());
                return;
            }
            this.frameSkip = 0;
        }
        
        if (this.mode === 'spectrum') {
            this.drawSpectrum();
        } else {
            this.drawRTA();
        }
        
        this.animationId = requestAnimationFrame(() => this.draw());
    }
    
    drawSpectrum() {
        this.analyser.getFloatFrequencyData(this.dataArray);
        
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, width, height);
        
        const barWidth = width / this.bufferLength * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            // Convert dB to height (range: -100dB to 0dB)
            const db = this.dataArray[i];
            const normalizedValue = (db + 100) / 100;
            barHeight = normalizedValue * height;
            
            // Apply gradient
            this.ctx.fillStyle = this.gradient;
            this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
            
            // Stop drawing when we run out of space
            if (x > width) break;
        }
    }
    
    drawRTA() {
        // Get frequency data
        this.analyser.getFloatFrequencyData(this.dataArray);
        
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        // Clear canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, width, height);
        
        // Calculate RTA bands (1/3 octave)
        const frequencies = this.get31BandFrequencies();
        const sampleRate = this.analyser.context.sampleRate;
        const nyquist = sampleRate / 2;
        
        // Update RTA data
        for (let i = 0; i < this.rtaBands; i++) {
            const freq = frequencies[i];
            const nextFreq = i < frequencies.length - 1 ? frequencies[i + 1] : nyquist;
            
            // Calculate frequency range for this band
            const startBin = Math.floor((freq * 0.891) / nyquist * this.bufferLength);
            const endBin = Math.ceil((nextFreq * 1.122) / nyquist * this.bufferLength);
            
            // Average the bins in this range
            let sum = 0;
            let count = 0;
            for (let bin = startBin; bin <= endBin && bin < this.bufferLength; bin++) {
                sum += this.dataArray[bin];
                count++;
            }
            
            const avgDb = count > 0 ? sum / count : -100;
            this.rtaData[i] = avgDb;
            
            // Update peak hold
            if (avgDb > this.rtaPeakData[i]) {
                this.rtaPeakData[i] = avgDb;
                this.rtaPeakHoldTime[i] = Date.now();
            } else if (Date.now() - this.rtaPeakHoldTime[i] > 2000) {
                // Decay peak after 2 seconds
                this.rtaPeakData[i] *= 0.95;
            }
        }
        
        // Draw RTA bars
        const barWidth = (width - (this.rtaBands + 1) * 2) / this.rtaBands;
        const maxDb = 0;
        const minDb = -60;
        const dbRange = maxDb - minDb;
        
        for (let i = 0; i < this.rtaBands; i++) {
            const x = i * (barWidth + 2) + 2;
            
            // Draw main bar
            const db = Math.max(this.rtaData[i], minDb);
            const normalizedValue = (db - minDb) / dbRange;
            const barHeight = normalizedValue * height;
            
            this.ctx.fillStyle = this.gradient;
            this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            // Draw peak hold line
            const peakDb = Math.max(this.rtaPeakData[i], minDb);
            const peakNormalized = (peakDb - minDb) / dbRange;
            const peakY = height - (peakNormalized * height);
            
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, peakY);
            this.ctx.lineTo(x + barWidth, peakY);
            this.ctx.stroke();
        }
        
        // Draw frequency labels
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
        this.ctx.textAlign = 'center';
        
        const labelFrequencies = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        for (const freq of labelFrequencies) {
            const index = frequencies.indexOf(freq);
            if (index !== -1) {
                const x = index * (barWidth + 2) + 2 + barWidth / 2;
                const label = freq >= 1000 ? `${freq / 1000}k` : freq.toString();
                this.ctx.fillText(label, x, height - 5);
            }
        }
    }
    
    get31BandFrequencies() {
        return [
            20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
            200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
            2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
        ];
    }
}