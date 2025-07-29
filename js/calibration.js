// Calibration System
class Calibration {
    constructor(audioProcessor, statusCallback) {
        this.audioProcessor = audioProcessor;
        this.statusCallback = statusCallback;
        this.isCalibrating = false;
        
        // Target curves
        this.targetCurves = {
            'flat': new Array(31).fill(0),
            'harman': this.generateHarmanCurve(),
            'b&k': this.generateBKCurve(),
            'custom': new Array(31).fill(0)
        };
        
        // Measurement settings
        this.measurementData = [];
        this.referenceLevel = -20; // dB
        this.noiseFloor = -80; // dB threshold for valid measurements
    }
    
    generateHarmanCurve() {
        // Harman target curve approximation
        const frequencies = this.audioProcessor.getFrequencies();
        return frequencies.map(freq => {
            if (freq < 100) return 6;
            if (freq < 200) return 3;
            if (freq < 1000) return 0;
            if (freq < 10000) return -2;
            return -4;
        });
    }
    
    generateBKCurve() {
        // B&K house curve approximation
        const frequencies = this.audioProcessor.getFrequencies();
        return frequencies.map(freq => {
            const logFreq = Math.log10(freq);
            return 10 - (logFreq - 1) * 3.33;
        });
    }
    
    async calibrate(options = {}) {
        if (this.isCalibrating) {
            throw new Error('Calibration already in progress');
        }
        
        const {
            duration = 10000,
            targetCurve = 'flat',
            smoothing = '1/3',
            useTestSignal = false
        } = options;
        
        this.isCalibrating = true;
        
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: this.audioProcessor.context.sampleRate
                }
            });
            
            this.statusCallback('Initializing microphone...', 'info');
            
            // Create microphone input
            const micSource = this.audioProcessor.context.createMediaStreamSource(stream);
            const micAnalyser = this.audioProcessor.context.createAnalyser();
            micAnalyser.fftSize = 8192;
            micAnalyser.smoothingTimeConstant = 0.0; // No smoothing for accuracy
            
            micSource.connect(micAnalyser);
            
            // Wait a moment for audio to stabilize
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (useTestSignal) {
                // Use pink noise for measurement
                await this.measureWithTestSignal(micAnalyser, duration);
            } else {
                // Use currently playing music
                await this.measureWithMusic(micAnalyser, duration);
            }
            
            // Stop microphone
            stream.getTracks().forEach(track => track.stop());
            
            // Process measurements
            this.statusCallback('Processing measurements...', 'info');
            const corrections = this.calculateCorrections(targetCurve, smoothing);
            
            this.statusCallback('Calibration complete!', 'info');
            
            return corrections;
            
        } catch (error) {
            if (error.name === 'NotAllowedError') {
                throw new Error('Microphone access denied');
            }
            throw error;
        } finally {
            this.isCalibrating = false;
        }
    }
    
    async measureWithTestSignal(micAnalyser, duration) {
        this.statusCallback('Generating test signal...', 'info');
        
        // Generate pink noise
        const noiseBuffer = await this.audioProcessor.generatePinkNoise(duration / 1000);
        
        // Clear previous measurements
        this.measurementData = [];
        
        this.statusCallback('Playing test signal - please stay quiet...', 'warning');
        
        // Start measurement
        const measurementPromise = this.collectMeasurements(micAnalyser, duration);
        
        // Play test signal
        await this.audioProcessor.playTestSignal(noiseBuffer);
        
        // Wait for measurements to complete
        await measurementPromise;
    }
    
    async measureWithMusic(micAnalyser, duration) {
        this.statusCallback('Measuring with current music...', 'info');
        
        // Clear previous measurements
        this.measurementData = [];
        
        // Collect measurements
        await this.collectMeasurements(micAnalyser, duration);
    }
    
    async collectMeasurements(analyser, duration) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        const sampleRate = analyser.context.sampleRate;
        const startTime = Date.now();
        
        // Discard first few measurements to let audio stabilize
        let discardCount = 10;
        
        return new Promise((resolve) => {
            const measure = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration * 100, 100);
                
                this.statusCallback(
                    `Measuring... ${progress.toFixed(0)}%`,
                    'info'
                );
                
                // Get frequency data
                analyser.getFloatFrequencyData(dataArray);
                
                // Only store valid measurements (above noise floor)
                if (discardCount > 0) {
                    discardCount--;
                } else {
                    const maxLevel = Math.max(...dataArray);
                    if (maxLevel > this.noiseFloor) {
                        this.measurementData.push(new Float32Array(dataArray));
                    }
                }
                
                if (elapsed < duration) {
                    requestAnimationFrame(measure);
                } else {
                    resolve();
                }
            };
            
            measure();
        });
    }
    
    calculateCorrections(targetCurveName, smoothing) {
        if (this.measurementData.length === 0) {
            throw new Error('No valid measurement data collected');
        }
        
        const targetCurve = this.targetCurves[targetCurveName];
        const frequencies = this.audioProcessor.getFrequencies();
        
        // Average all measurements
        const avgMeasurement = this.averageMeasurements();
        
        // Get response at each EQ frequency
        const measuredResponse = this.extractFrequencyResponse(
            avgMeasurement,
            frequencies
        );
        
        // Apply smoothing
        const smoothedResponse = this.applySmoothing(measuredResponse, smoothing);
        
        // Normalize to reference level
        const maxResponse = Math.max(...smoothedResponse);
        const normalizedResponse = smoothedResponse.map(v => v - maxResponse + this.referenceLevel);
        
        // Calculate corrections with conservative approach
        const corrections = [];
        for (let i = 0; i < frequencies.length; i++) {
            const target = targetCurve[i];
            const measured = normalizedResponse[i];
            
            // Calculate correction needed
            let correction = target - measured;
            
            // Apply conservative factor (don't overcorrect)
            correction *= 0.7;
            
            // Limit correction range
            correction = Math.max(-10, Math.min(10, correction));
            
            // Round to nearest 0.5 dB
            correction = Math.round(correction * 2) / 2;
            
            corrections.push(correction);
        }
        
        // Apply additional smoothing to prevent harsh transitions
        return this.smoothCorrections(corrections);
    }
    
    smoothCorrections(corrections) {
        const smoothed = [...corrections];
        
        // Apply 3-point moving average
        for (let i = 1; i < smoothed.length - 1; i++) {
            smoothed[i] = (corrections[i - 1] + corrections[i] + corrections[i + 1]) / 3;
            smoothed[i] = Math.round(smoothed[i] * 2) / 2; // Round to 0.5 dB
        }
        
        return smoothed;
    }
    
    averageMeasurements() {
        if (this.measurementData.length === 0) {
            throw new Error('No measurement data');
        }
        
        const length = this.measurementData[0].length;
        const averaged = new Float32Array(length);
        
        // Convert to linear scale, average, then back to dB
        for (let i = 0; i < length; i++) {
            let sum = 0;
            let count = 0;
            
            for (const measurement of this.measurementData) {
                // Skip invalid measurements
                if (measurement[i] > this.noiseFloor) {
                    // Convert dB to linear
                    const linear = Math.pow(10, measurement[i] / 20);
                    sum += linear * linear; // Power average
                    count++;
                }
            }
            
            if (count > 0) {
                const avgLinear = Math.sqrt(sum / count);
                averaged[i] = 20 * Math.log10(avgLinear);
            } else {
                averaged[i] = this.noiseFloor;
            }
        }
        
        return averaged;
    }
    
    extractFrequencyResponse(fftData, targetFrequencies) {
        const sampleRate = this.audioProcessor.context.sampleRate;
        const nyquist = sampleRate / 2;
        const binWidth = nyquist / fftData.length;
        const response = [];
        
        for (const freq of targetFrequencies) {
            // Average bins around target frequency for better accuracy
            const centerBin = freq / binWidth;
            const startBin = Math.floor(centerBin - 1);
            const endBin = Math.ceil(centerBin + 1);
            
            let sum = 0;
            let count = 0;
            
            for (let bin = startBin; bin <= endBin && bin < fftData.length; bin++) {
                if (bin >= 0 && fftData[bin] > this.noiseFloor) {
                    sum += fftData[bin];
                    count++;
                }
            }
            
            response.push(count > 0 ? sum / count : this.noiseFloor);
        }
        
        return response;
    }
    
    applySmoothing(data, smoothingType) {
        const smoothed = [...data];
        
        // Apply fractional octave smoothing
        const octaveFraction = {
            '1/3': 1/3,
            '1/6': 1/6,
            '1/12': 1/12
        }[smoothingType] || 1/3;
        
        const frequencies = this.audioProcessor.getFrequencies();
        
        for (let i = 0; i < smoothed.length; i++) {
            const centerFreq = frequencies[i];
            const lowerBound = centerFreq * Math.pow(2, -octaveFraction / 2);
            const upperBound = centerFreq * Math.pow(2, octaveFraction / 2);
            
            // Find indices within bounds
            let sum = 0;
            let count = 0;
            
            for (let j = 0; j < frequencies.length; j++) {
                if (frequencies[j] >= lowerBound && frequencies[j] <= upperBound) {
                    if (data[j] > this.noiseFloor) {
                        sum += data[j];
                        count++;
                    }
                }
            }
            
            if (count > 0) {
                smoothed[i] = sum / count;
            }
        }
        
        return smoothed;
    }
    
    // Save/Load calibration profiles
    saveProfile(name, corrections) {
        const profiles = JSON.parse(localStorage.getItem('calibrationProfiles') || '{}');
        profiles[name] = {
            corrections: corrections,
            date: new Date().toISOString(),
            targetCurve: 'custom'
        };
        localStorage.setItem('calibrationProfiles', JSON.stringify(profiles));
    }
    
    loadProfile(name) {
        const profiles = JSON.parse(localStorage.getItem('calibrationProfiles') || '{}');
        return profiles[name] || null;
    }
    
    getProfiles() {
        const profiles = JSON.parse(localStorage.getItem('calibrationProfiles') || '{}');
        return Object.keys(profiles);
    }
    
    deleteProfile(name) {
        const profiles = JSON.parse(localStorage.getItem('calibrationProfiles') || '{}');
        delete profiles[name];
        localStorage.setItem('calibrationProfiles', JSON.stringify(profiles));
    }
}