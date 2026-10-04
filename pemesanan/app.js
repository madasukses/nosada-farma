/* =====================================================
   KONFIGURASI
===================================================== */
const PASSWORD = 'kaliombo';

// State aplikasi
let dataObat = [];           // array hasil parse harga.csv
let dataPbf = [];            // array hasil parse pbf.csv
let kolomPbf = [];           // nama kolom PBF (dari header harga.csv)
let keranjang = {};          // { namaPbf: [ {nama, qty, harga} ] }
let modalPbfAktif = null;    // PBF yang sedang dibuka modalnya
let obatDipilih = null;      // {nama, harga} di modal step qty

/* =====================================================
   LOGIN
===================================================== */
function cekLogin() {
  const input = document.getElementById('password-input').value;
  if (input === PASSWORD) {
    sessionStorage.setItem('nosada_login', '1');
    tampilkanApp();
  } else {
    document.getElementById('login-error').textContent = 'Password salah';
  }
}

function logout() {
  sessionStorage.removeItem('nosada_login');
  location.reload();
}

function tampilkanApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app-page').style.display = 'block';
  renderPanelPbf();
  renderListObat();
}

// Auto-login kalau sudah login di sesi ini
window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('nosada_login') === '1') {
    tampilkanApp();
  }
  document.getElementById('password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') cekLogin();
  });
});

/* =====================================================
   UPLOAD CSV
===================================================== */
function handleUploadHarga(event) {
  const file = event.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      dataObat = result.data.filter(r => r['nama_obat'] || r['Nama Barang']);
      kolomPbf = Object.keys(result.data[0]).filter(k => {
        const key = k.trim().toLowerCase();
        return key !== 'nama_obat' && key !== 'nama barang' && key !== 'sisa' && key !== 'no';
      });
      updateHeaderInfo();
      renderListObat();
      renderPanelPbf();
    },
    error: (err) => alert('Gagal baca CSV: ' + err.message)
  });
  event.target.value = '';
}

function handleUploadPbf(event) {
  const file = event.target.files[0];
  if (!file) return;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      dataPbf = result.data
        .filter(r => r.nama && r.min_order)
        .map(r => ({
          nama: r.nama.trim(),
          min_order: parseInt(r.min_order) || 0
        }));
      dataPbf.forEach(p => {
        if (!keranjang[p.nama]) keranjang[p.nama] = [];
      });
      updateHeaderInfo();
      renderPanelPbf();
    },
    error: (err) => alert('Gagal baca CSV: ' + err.message)
  });
  event.target.value = '';
}

function updateHeaderInfo() {
  const info = document.getElementById('header-info');
  const nObat = dataObat.length;
  const nPbf = dataPbf.length;
  if (nObat === 0 && nPbf === 0) {
    info.textContent = 'Belum ada data · Silakan import CSV';
  } else {
    info.textContent = `${nObat} obat · ${nPbf} PBF · 4 Oktober 2026`;
  }
}

/* =====================================================
   LIST OBAT (termurah 1-3)
===================================================== */
function renderListObat() {
  const tbody = document.getElementById('list-obat-body');
  const keyword = (document.getElementById('search-obat')?.value || '').toLowerCase();
  tbody.innerHTML = '';

  if (dataObat.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Belum ada data. Silakan import CSV.</td></tr>';
    return;
  }

  const filtered = dataObat.filter(o => {
    const nama = (o['nama_obat'] || o['Nama Barang'] || '').toLowerCase();
    return nama.includes(keyword);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">Tidak ada obat cocok.</td></tr>';
    return;
  }

  filtered.forEach(obat => {
    const nama = obat['nama_obat'] || obat['Nama Barang'] || '-';
    const sisa = obat['sisa'] || '-';

    // Kumpulkan harga tiap PBF, buang yang kosong
    const hargaList = [];
    kolomPbf.forEach(pbf => {
      const val = parseFloat(obat[pbf]);
      if (!isNaN(val) && val > 0) {
        hargaList.push({ pbf: pbf, harga: val });
      }
    });

    // Urutkan termurah
    hargaList.sort((a, b) => a.harga - b.harga);
    const top3 = hargaList.slice(0, 3);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${nama}</td>
      <td>${sisa}</td>
      ${renderHargaCell(top3[0], 'harga-1')}
      ${renderHargaCell(top3[1], 'harga-2')}
      ${renderHargaCell(top3[2], 'harga-3')}
    `;
    tbody.appendChild(tr);
  });
}

function renderHargaCell(item, cls) {
  if (!item) return '<td>-</td>';
  const hrg = item.harga.toLocaleString('id-ID');
  return `<td class="${cls}">${hrg} <span class="pbf-tag">${item.pbf}</span></td>`;
}

/* =====================================================
   PANEL PBF
===================================================== */
function renderPanelPbf() {
  const container = document.getElementById('panel-pbf-container');
  container.innerHTML = '';

  if (dataPbf.length === 0) {
    container.innerHTML = '<div class="empty-panel-msg">Import PBF.csv untuk menampilkan panel.</div>';
    return;
  }

  dataPbf.forEach(pbf => {
    const items = keranjang[pbf.nama] || [];
    const total = items.reduce((sum, it) => sum + it.qty * it.harga, 0);
    const capaiMin = total >= pbf.min_order;

    const panel = document.createElement('div');
    panel.className = 'panel-pbf ' + (capaiMin ? 'min-ok' : 'min-warn');
    panel.innerHTML = `
      <div class="panel-head">
        <div class="left">
          <div class="nama">${pbf.nama}</div>
          <div class="min">Min: Rp${pbf.min_order.toLocaleString('id-ID')}</div>
        </div>
        <div class="right">
          <div class="total-label">Total</div>
          <div class="total ${capaiMin ? 'ok' : 'warn'}">Rp${total.toLocaleString('id-ID')}</div>
        </div>
      </div>
      <div class="panel-status ${capaiMin ? 'ok' : 'warn'}">
        ${capaiMin ? '✓ Capai minimum' : '✗ Belum capai minimum'}
      </div>
      <button class="panel-search-btn" onclick="openModal('${pbf.nama}')">+ Tambah Obat</button>
      <div class="panel-body">
        ${items.length === 0
          ? '<div class="empty">Belum ada obat dipilih</div>'
          : items.map((it, idx) => renderItemPesanan(pbf.nama, it, idx)).join('')
        }
      </div>
      <div class="panel-foot">
        <button class="btn-cetak" ${capaiMin ? '' : 'disabled'} onclick="cetakPdf('${pbf.nama}')">
          🖨 Cetak Surat Pesanan
        </button>
      </div>
    `;
    container.appendChild(panel);
  });
}

function renderItemPesanan(pbfNama, it, idx) {
  const subtotal = (it.qty * it.harga).toLocaleString('id-ID');
  const hrg = it.harga.toLocaleString('id-ID');
  return `
    <div class="item-pesanan">
      <div class="row-1">
        <div class="nama">${it.nama}</div>
        <div class="subtotal">${subtotal}</div>
      </div>
      <div class="row-2">
        <div class="qty">${it.qty} × ${hrg}</div>
        <div class="actions">
          <a onclick="editItem('${pbfNama}', ${idx})">edit</a>
          <a class="hapus" onclick="hapusItem('${pbfNama}', ${idx})">hapus</a>
        </div>
      </div>
    </div>
  `;
}

/* =====================================================
   MODAL TAMBAH OBAT
===================================================== */
function openModal(pbfNama) {
  modalPbfAktif = pbfNama;
  obatDipilih = null;
  document.getElementById('modal-pbf').textContent = pbfNama;
  document.getElementById('modal').classList.add('active');
  document.getElementById('step-search').style.display = 'block';
  document.getElementById('step-qty').style.display = 'none';
  document.getElementById('modal-search').value = '';
  document.getElementById('modal-search').focus();
  renderHasilCari();
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  modalPbfAktif = null;
  obatDipilih = null;
}

function renderHasilCari() {
  const list = document.getElementById('hasil-list');
  const keyword = (document.getElementById('modal-search').value || '').toLowerCase();
  list.innerHTML = '';

  if (dataObat.length === 0) {
    list.innerHTML = '<div class="empty">Belum ada data obat. Import harga.csv dulu.</div>';
    return;
  }

  const filtered = dataObat.filter(o => {
    const nama = (o['nama_obat'] || o['Nama Barang'] || '').toLowerCase();
    return nama.includes(keyword);
  }).slice(0, 30);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty">Tidak ada obat cocok.</div>';
    return;
  }

  filtered.forEach(o => {
    const nama = o['nama_obat'] || o['Nama Barang'] || '-';
    const harga = parseFloat(o[modalPbfAktif]) || 0;
    if (harga <= 0) return; // skip kalau PBF ini tidak punya harga

    const div = document.createElement('div');
    div.className = 'hasil-item';
    div.innerHTML = `
      <div><span class="nama">${nama}</span></div>
      <div><span class="harga">Rp${harga.toLocaleString('id-ID')}</span></div>
    `;
    div.onclick = () => pilihObat(nama, harga);
    list.appendChild(div);
  });

  if (list.innerHTML === '') {
    list.innerHTML = '<div class="empty">Tidak ada obat yang tersedia di PBF ini.</div>';
  }
}

function pilihObat(nama, harga) {
  obatDipilih = { nama, harga };
  document.getElementById('qty-nama').textContent = nama;
  document.getElementById('qty-harga').textContent = 'Rp' + harga.toLocaleString('id-ID');
  document.getElementById('qty-input').value = 1;
  hitungSubtotal();
  document.getElementById('step-search').style.display = 'none';
  document.getElementById('step-qty').style.display = 'block';
  document.getElementById('qty-input').focus();
}

function kembaliSearch() {
  document.getElementById('step-search').style.display = 'block';
  document.getElementById('step-qty').style.display = 'none';
}

function hitungSubtotal() {
  if (!obatDipilih) return;
  const qty = parseInt(document.getElementById('qty-input').value) || 0;
  const sub = qty * obatDipilih.harga;
  document.getElementById('qty-subtotal').textContent = 'Rp' + sub.toLocaleString('id-ID');
}

function konfirmasiTambah() {
  if (!obatDipilih || !modalPbfAktif) return;
  const qty = parseInt(document.getElementById('qty-input').value) || 0;
  if (qty < 1) { alert('Qty minimal 1'); return; }

  const items = keranjang[modalPbfAktif] || [];
  const existing = items.find(it => it.nama === obatDipilih.nama);
  if (existing) {
    existing.qty += qty;
  } else {
    items.push({ nama: obatDipilih.nama, harga: obatDipilih.harga, qty: qty });
  }
  keranjang[modalPbfAktif] = items;

  closeModal();
  renderPanelPbf();
}

/* =====================================================
   EDIT / HAPUS ITEM
===================================================== */
function editItem(pbfNama, idx) {
  const items = keranjang[pbfNama];
  const it = items[idx];
  const qtyBaru = prompt(`Edit qty untuk ${it.nama}:`, it.qty);
  if (qtyBaru === null) return;
  const q = parseInt(qtyBaru);
  if (isNaN(q) || q < 1) { alert('Qty tidak valid'); return; }
  it.qty = q;
  renderPanelPbf();
}

function hapusItem(pbfNama, idx) {
  if (!confirm('Hapus obat ini dari keranjang?')) return;
  keranjang[pbfNama].splice(idx, 1);
  renderPanelPbf();
}

/* =====================================================
   CETAK PDF
===================================================== */
function cetakPdf(pbfNama) {
  const items = keranjang[pbfNama] || [];
  if (items.length === 0) { alert('Keranjang kosong'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const total = items.reduce((sum, it) => sum + it.qty * it.harga, 0);

  // Header
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Nosada Farma', 14, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Surat Pesanan Obat', 14, 27);
  doc.text('Tanggal: ' + new Date().toLocaleDateString('id-ID'), 14, 33);

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Kepada: ' + pbfNama, 14, 45);

  // Tabel header
  let y = 58;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('No', 14, y);
  doc.text('Nama Obat', 24, y);
  doc.text('Qty', 120, y);
  doc.text('Harga', 140, y);
  doc.text('Subtotal', 170, y);

  doc.line(14, y + 2, 196, y + 2);
  y += 8;

  // Isi tabel
  doc.setFont(undefined, 'normal');
  items.forEach((it, i) => {
    const sub = it.qty * it.harga;
    doc.text(String(i + 1), 14, y);
    doc.text(it.nama.substring(0, 45), 24, y);
    doc.text(String(it.qty), 120, y);
    doc.text(it.harga.toLocaleString('id-ID'), 140, y);
    doc.text(sub.toLocaleString('id-ID'), 170, y);
    y += 7;
    if (y > 270) { doc.addPage(); y = 20; }
  });

  // Total
  doc.line(14, y, 196, y);
  y += 7;
  doc.setFont(undefined, 'bold');
  doc.text('TOTAL', 140, y);
  doc.text('Rp' + total.toLocaleString('id-ID'), 170, y);

  // Tanda tangan
  y += 25;
  doc.setFont(undefined, 'normal');
  doc.text('Hormat kami,', 14, y);
  doc.text('(____________________)', 14, y + 25);

  doc.save(`SuratPesanan_${pbfNama}_${new Date().toISOString().slice(0,10)}.pdf`);
}

/* =====================================================
   INISIALISASI
===================================================== */
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});