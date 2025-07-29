# Car Audio EQ Pro

Advanced car audio equalizer with professional-grade calibration capabilities. This Progressive Web App (PWA) provides a 31-band graphic equalizer, real-time spectrum analysis, and automatic room correction using sophisticated audio measurement techniques.

## 🎯 Key Features

### Professional Audio Processing
- **31-Band Graphic EQ**: ISO standard 1/3 octave bands from 20Hz to 20kHz
- **High-Quality Filters**: Biquad filters with proper Q values for minimal phase distortion
- **Built-in Limiter**: Prevents clipping with transparent dynamics processing
- **Real-time Processing**: Zero-latency EQ adjustments

### Advanced Calibration System
- **Pink Noise Generator**: Professional-grade test signal generation
- **Sweep Signal Support**: Exponential sine sweep for impulse response measurement
- **Target Curves**: Multiple reference curves including:
  - Flat response
  - Harman target curve
  - B&K house curve
  - Custom curves
- **Measurement Averaging**: Multiple measurement passes for accuracy
- **Fractional Octave Smoothing**: 1/3, 1/6, and 1/12 octave smoothing options

### Visualization
- **Spectrum Analyzer**: High-resolution FFT display
- **RTA Mode**: Real-Time Analyzer with peak hold
- **Battery Saver Mode**: Reduced frame rate for mobile devices

### User Experience
- **PWA Support**: Install as native app on iOS/Android
- **Offline Functionality**: Works without internet connection
- **Responsive Design**: Optimized for mobile and desktop
- **Dark Theme**: Easy on the eyes in car environments

## 🚀 Quick Start

### Live Demo
Visit: https://namojo.github.io/car-audio-eq-pro/

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/namojo/car-audio-eq-pro.git
   cd car-audio-eq-pro
   ```

2. **Serve locally** (requires a web server for PWA features)
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server -p 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

## 📱 Usage Guide

### Basic Operation
1. **Select Audio File**: Click "Choose File" to load a music file
2. **Play Music**: Press the play button to start playback
3. **Adjust EQ**: Use the sliders to adjust frequency bands
4. **Save Settings**: Your EQ settings are automatically saved

### Calibration Process
1. **Connect to Car Audio**:
   - Bluetooth: Pair your phone with car stereo
   - AUX Cable: Direct connection recommended
   - CarPlay/Android Auto: Supported

2. **Position Phone**:
   - Place at ear level in driver's seat
   - Point microphone toward center of car
   - Minimize background noise

3. **Run Calibration**:
   - Click "Start Calibration"
   - Select target curve
   - Wait for measurement (10-30 seconds)
   - Review and apply corrections

### Advanced Features

#### Custom Target Curves
Create your own target response curve for specific preferences or acoustic environments.

#### Measurement Time
Longer measurements provide more accurate results but require stable conditions.

#### Smoothing Options
- **1/3 Octave**: Standard for most applications
- **1/6 Octave**: More detail for critical listening
- **1/12 Octave**: Maximum resolution

## 🔧 Technical Details

### Browser Requirements
- Chrome 66+ (recommended)
- Safari 14.1+ (iOS)
- Firefox 76+
- Edge 79+

### Web APIs Used
- Web Audio API
- MediaDevices API (microphone access)
- Service Worker API (PWA)
- Cache API (offline support)

### Audio Processing Chain
```
Audio Source → 31-Band EQ → Spectrum Analyzer → Limiter → Output
                    ↑
            Calibration System
```

## 🎚️ EQ Presets

### Music Genres
- **Rock**: Enhanced bass and treble
- **Jazz**: Warm midrange focus
- **Classical**: Natural, balanced response
- **Vocal**: Midrange presence boost

### Car-Specific
- **Sedan**: Compensates for typical sedan acoustics
- **SUV**: Addresses larger cabin characteristics
- **Truck**: Heavy bass compensation

## 🔒 Privacy & Security

- **No Data Collection**: All processing happens locally
- **No Server Communication**: Completely offline capable
- **Microphone Access**: Only when calibrating, never recorded
- **Local Storage Only**: Settings saved on your device

## 🐛 Troubleshooting

### Common Issues

**No Sound Output**
- Check browser permissions for audio
- Ensure file format is supported (MP3, AAC, WAV)
- Verify volume settings

**Calibration Fails**
- Grant microphone permissions
- Reduce background noise
- Increase measurement time

**Distorted Sound**
- Lower individual EQ bands
- Enable limiter in settings
- Reduce master volume

## 🔄 Updates & Roadmap

### Current Version: 1.0.0
- Initial release with core features

### Planned Features
- Parametric EQ mode
- A/B comparison
- Cloud backup for settings
- Multi-point measurement
- Impulse response export
- Integration with car APIs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
```bash
# Clone repository
git clone https://github.com/namojo/car-audio-eq-pro.git

# Install development dependencies (if any)
# Currently no build process required

# Run local server
python -m http.server 8000
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by professional tools like HouseCurve and REW
- Uses Web Audio API for processing
- UI design influenced by Spotify and Apple Music

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This is a demo application for showcasing advanced web audio capabilities. For professional audio calibration, consider dedicated hardware solutions.