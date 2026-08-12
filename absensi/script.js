// ============================================
// ABSENSI NOSADA - Frontend JavaScript
// ============================================

// ⚠️ GANTI INI SETELAH DEPLOY GAS - DI BARIS INI:
// Setelah deploy GAS, copy Deployment ID, lalu ganti YOUR_DEPLOYMENT_ID
const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbzpa38w_f7r1wTi3IpWjZDfI8wFLySLP_BoE1WRcTFZeatvhSjR-9q1jM6M0w5UN6oa8Q/usercallback";
// State
let state = {
    photoBase64: null,
    currentUsername: null,
    latitude: null,
    longitude: null,
    stream: null
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
});

// ============================================
// CLOCK & TIME
// ============================================

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const dateStr = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('clock').textContent = timeStr;
    document.getElementById('date').textContent = dateStr;
}

// ============================================
// LOGIN
// ============================================

function handleLogin() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showAlert('Username dan password harus diisi', 'error');
        return;
    }

    // Simpan state
    state.currentUsername = username;

    // Pindah ke form absensi
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('absensiForm').classList.remove('hidden');
    document.getElementById('loggedUser').textContent = username;

    // Ambil lokasi
    getLocation();

    showAlert(`Selamat datang, ${username}! 👋`, 'success');
}

function handleLogout() {
    // Reset state
    state.photoBase64 = null;
    state.currentUsername = null;
    state.latitude = null;
    state.longitude = null;

    // Reset form login
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    // Reset form absensi
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    document.getElementById('preview').classList.add('hidden');
    document.getElementById('retakeBtn').classList.add('hidden');
    document.getElementById('submitBtn').disabled = true;

    // Tutup kamera
    stopCamera();

    // Pindah ke form login
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('absensiForm').classList.add('hidden');

    showAlert('Logout berhasil', 'success');
}

// ============================================
// GEOLOCATION
// ============================================

function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                state.latitude = lat;
                state.longitude = lon;

                document.getElementById('latitude').value = lat;
                document.getElementById('longitude').value = lon;

                updateLocationUI('success');
                
                // Optional: Reverse geocoding untuk nama alamat
                // reverseGeocode(lat, lon);
            },
            (error) => {
                updateLocationUI('error', error.message);
                showAlert('Error lokasi: ' + error.message, 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        showAlert('Geolocation tidak didukung browser Anda', 'error');
        updateLocationUI('error', 'Browser tidak support');
    }
}

function updateLocationUI(status, message = null) {
    const dot = document.getElementById('locationStatus');
    const text = document.getElementById('locationStatusText');
    const address = document.getElementById('addressDisplay');

    if (status === 'success') {
        dot.className = 'status-dot success';
        text.textContent = 'Lokasi terdeteksi ✓';
        address.textContent = `${state.latitude.toFixed(6)}, ${state.longitude.toFixed(6)}`;
    } else if (status === 'error') {
        dot.className = 'status-dot error';
        text.textContent = 'Error: ' + message;
        address.textContent = '-';
    } else {
        dot.className = 'status-dot';
        text.textContent = 'Mengambil lokasi...';
        address.textContent = '-';
    }
}

// ============================================
// CAMERA
// ============================================

async function startCamera() {
    try {
        state.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        const video = document.getElementById('video');
        video.srcObject = state.stream;

        document.getElementById('cameraContainer').classList.remove('hidden');
        document.getElementById('startCameraBtn').classList.add('hidden');
        document.getElementById('stopCameraBtn').classList.remove('hidden');
        document.getElementById('captureBtn').classList.remove('hidden');

        showAlert('Kamera siap - Arahkan ke wajah Anda', 'info');
    } catch (error) {
        showAlert('Error kamera: ' + error.message, 'error');
    }
}

function stopCamera() {
    if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
        state.stream = null;
    }

    document.getElementById('cameraContainer').classList.add('hidden');
    document.getElementById('startCameraBtn').classList.remove('hidden');
    document.getElementById('stopCameraBtn').classList.add('hidden');
    document.getElementById('captureBtn').classList.add('hidden');
}

function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    state.photoBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    const preview = document.getElementById('preview');
    preview.src = `data:image/jpeg;base64,${state.photoBase64}`;
    preview.classList.remove('hidden');

    document.getElementById('cameraContainer').classList.add('hidden');
    document.getElementById('startCameraBtn').classList.remove('hidden');
    document.getElementById('stopCameraBtn').classList.add('hidden');
    document.getElementById('captureBtn').classList.add('hidden');
    document.getElementById('retakeBtn').classList.remove('hidden');

    document.getElementById('submitBtn').disabled = false;

    showAlert('Foto berhasil diambil ✓', 'success');
}

function retakePhoto() {
    state.photoBase64 = null;
    document.getElementById('preview').classList.add('hidden');
    document.getElementById('retakeBtn').classList.add('hidden');
    document.getElementById('submitBtn').disabled = true;
    startCamera();
}

// ============================================
// SUBMIT ABSENSI
// ============================================

async function submitAbsensi() {
    // Validasi
    if (!state.photoBase64) {
        showAlert('Foto harus diambil', 'error');
        return;
    }

    if (!state.currentUsername) {
        showAlert('Username tidak ditemukan', 'error');
        return;
    }

    if (!state.latitude || !state.longitude) {
        showAlert('Lokasi belum terdeteksi', 'error');
        return;
    }

    // UI loading
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span>Mengirim...';

    try {
        const payload = {
            username: state.currentUsername,
            password: document.getElementById('password').value, // From login form
            latitude: state.latitude,
            longitude: state.longitude,
            alamat: document.getElementById('addressDisplay').textContent,
            photoBase64: state.photoBase64
        };

        const response = await fetch(GAS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✓ Absensi berhasil! ' + result.data.timestamp, 'success');

            // Reset state
            state.photoBase64 = null;
            document.getElementById('preview').classList.add('hidden');
            document.getElementById('retakeBtn').classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '✓ Kirim Absensi';

            // Logout otomatis after 2 seconds
            setTimeout(() => {
                handleLogout();
            }, 2000);
        } else {
            showAlert('Error: ' + result.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '✓ Kirim Absensi';
        }
    } catch (error) {
        showAlert('Error mengirim: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '✓ Kirim Absensi';
    }
}

// ============================================
// ALERT
// ============================================

function showAlert(message, type) {
    const box = document.getElementById('alertBox');
    box.textContent = message;
    box.className = `alert ${type}`;

    if (type !== 'error') {
        setTimeout(() => {
            box.className = 'alert';
        }, 4000);
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Optional: Reverse Geocoding (needs Google Maps API)
// Uncomment jika mau alamat lengkap
/*
function reverseGeocode(lat, lon) {
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}&language=id`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.results && data.results.length > 0) {
                const address = data.results[0].formatted_address;
                document.getElementById('addressDisplay').textContent = address;
            }
        })
        .catch(error => console.log('Geocoding error:', error));
}
*/
