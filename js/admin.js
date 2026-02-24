/* ======================================================
   DRM Survey — Admin Dashboard Logic
   Authentication, data retrieval, export
   ====================================================== */

(function () {
    'use strict';

    // ──────────────── DOM ────────────────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const loginGate = $('#loginGate');
    const adminDashboard = $('#adminDashboard');
    const passwordInput = $('#adminPassword');
    const loginBtn = $('#loginBtn');
    const loginError = $('#loginError');
    const logoutBtn = $('#logoutBtn');
    const refreshBtn = $('#refreshBtn');
    const loadingIndicator = $('#loadingIndicator');
    const noEndpointWarning = $('#noEndpointWarning');
    const responseTableBody = $('#responseTableBody');
    const tableCount = $('#tableCount');
    const detailModal = $('#detailModal');
    const modalContent = $('#modalContent');
    const closeModalBtn = $('#closeModal');
    const toastEl = $('#toast');

    let allResponses = [];
    let currentPassword = '';

    // ──────────────── Toast ────────────────
    let toastTimer;
    function showToast(msg, type = 'success') {
        clearTimeout(toastTimer);
        toastEl.textContent = msg;
        toastEl.className = 'toast ' + type;
        requestAnimationFrame(() => toastEl.classList.add('show'));
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
    }

    // ──────────────── Auth ────────────────
    function login() {
        const pw = passwordInput.value.trim();
        if (!pw) {
            showLoginError('비밀번호를 입력해 주세요.');
            return;
        }

        // Check against config password
        if (pw !== DRM_CONFIG.ADMIN_PASSWORD) {
            showLoginError('비밀번호가 올바르지 않습니다.');
            return;
        }

        currentPassword = pw;
        loginGate.style.display = 'none';
        adminDashboard.style.display = 'block';

        // Check if endpoint is configured
        if (!DRM_CONFIG.GAS_ENDPOINT) {
            noEndpointWarning.style.display = 'block';
            loadLocalData();
        } else {
            fetchResponses();
        }
    }

    function logout() {
        currentPassword = '';
        allResponses = [];
        adminDashboard.style.display = 'none';
        loginGate.style.display = 'flex';
        passwordInput.value = '';
        loginError.style.display = 'none';
    }

    function showLoginError(msg) {
        loginError.textContent = msg;
        loginError.style.display = 'block';
        passwordInput.classList.add('shake');
        setTimeout(() => passwordInput.classList.remove('shake'), 400);
    }

    // ──────────────── Fetch Data ────────────────
    async function fetchResponses() {
        loadingIndicator.style.display = 'block';
        responseTableBody.innerHTML = '';

        try {
            const url = `${DRM_CONFIG.GAS_ENDPOINT}?password=${encodeURIComponent(currentPassword)}&action=list`;
            const response = await fetch(url);
            const result = await response.json();

            if (!result.success) {
                showToast(result.error || '데이터 조회 실패', 'error');
                loadingIndicator.style.display = 'none';
                return;
            }

            allResponses = result.data || [];
            renderDashboard();
            showToast(`${allResponses.length}건의 응답을 불러왔습니다.`);

        } catch (error) {
            showToast('서버 연결 실패: ' + error.message, 'error');
            // Fallback to local data
            loadLocalData();
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    // ──────────────── Local Data Fallback ────────────────
    function loadLocalData() {
        try {
            const saved = localStorage.getItem('drm_submitted_responses');
            if (saved) {
                allResponses = JSON.parse(saved);
                renderDashboard();
                showToast(`로컬 저장소에서 ${allResponses.length}건을 불러왔습니다.`, 'success');
            } else {
                renderDashboard();
            }
        } catch (e) {
            renderDashboard();
        }
    }

    // ──────────────── Render Dashboard ────────────────
    function renderDashboard() {
        // Stats
        const total = allResponses.length;
        const today = new Date().toISOString().slice(0, 10);
        const todayCount = allResponses.filter(r => {
            return r.timestamp && r.timestamp.slice(0, 10) === today;
        }).length;

        let barrierInfo = 0, barrierTime = 0, barrierOpp = 0;
        allResponses.forEach(r => {
            const b = r.barrier || '';
            if (b === 'info' || b === '정보의 결핍') barrierInfo++;
            else if (b === 'time' || b === '시간의 결핍') barrierTime++;
            else if (b === 'opportunity' || b === '기회의 결핍') barrierOpp++;
        });

        $('#statTotalResponses').textContent = total;
        $('#statTodayResponses').textContent = todayCount;
        $('#statBarrierInfo').textContent = barrierInfo;
        $('#statBarrierTime').textContent = barrierTime;
        $('#statBarrierOpp').textContent = barrierOpp;

        // Table
        tableCount.textContent = `총 ${total}건`;
        renderTable();
    }

    function renderTable() {
        responseTableBody.innerHTML = '';

        if (allResponses.length === 0) {
            responseTableBody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="no-data">
                            <div class="no-data__icon">📭</div>
                            <p>아직 수집된 응답이 없습니다.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        allResponses.forEach((resp, i) => {
            const episodes = Array.isArray(resp.episodes) ? resp.episodes : [];
            const diagnoses = Array.isArray(resp.diagnoses) ? resp.diagnoses : [];
            const ts = resp.timestamp ? formatTimestamp(resp.timestamp) : '-';
            const barrier = formatBarrier(resp.barrier);
            const msg = resp.schoolMessage || '-';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${ts}</td>
                <td>${episodes.length}</td>
                <td>${diagnoses.length}</td>
                <td>${barrier}</td>
                <td class="cell-truncate" title="${escHtml(msg)}">${escHtml(msg)}</td>
                <td><button class="btn btn-secondary btn-detail" data-idx="${i}">상세</button></td>
            `;
            responseTableBody.appendChild(tr);
        });

        // Detail buttons
        responseTableBody.querySelectorAll('.btn-detail').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                showDetail(allResponses[idx]);
            });
        });
    }

    // ──────────────── Detail Modal ────────────────
    function showDetail(resp) {
        const episodes = Array.isArray(resp.episodes) ? resp.episodes : [];
        const diagnoses = Array.isArray(resp.diagnoses) ? resp.diagnoses : [];

        let html = '';

        // Basic info
        html += `<h3>📋 기본 정보</h3>`;
        html += detailRow('응답 시각', resp.timestamp ? formatTimestamp(resp.timestamp) : '-');
        html += detailRow('응답자 ID', resp.respondentId || '-');
        html += detailRow('가장 큰 장벽', formatBarrier(resp.barrier));
        html += detailRow('학교에 바라는 한 마디', resp.schoolMessage || '-');

        // Episodes
        html += `<h3>📅 에피소드 목록 (${episodes.length}개)</h3>`;
        episodes.forEach((ep, i) => {
            html += `
                <div class="episode-detail-card">
                    <div class="episode-detail-card__title">에피소드 ${i + 1}: ${escHtml(ep.activity || '')}</div>
                    ${detailRow('시간', `${ep.startTime || '-'} ~ ${ep.endTime || '-'}`)}
                    ${detailRow('장소', ep.location || '-')}
                    ${detailRow('동행인', ep.companion || '-')}
                </div>
            `;
        });

        // Diagnoses
        html += `<h3>🔬 심층 진단 (${diagnoses.length}개)</h3>`;
        diagnoses.forEach((d, i) => {
            html += `
                <div class="episode-detail-card">
                    <div class="episode-detail-card__title">진단 ${i + 1}: ${escHtml(d.activity || '')}</div>
                    ${detailRow('정보', formatInfo(d.information))}
                    ${detailRow('정보원', d.informationSource || '-')}
                    ${detailRow('시간', formatTimePerception(d.time))}
                    ${detailRow('기회(선택)', d.opportunityChosen === 'yes' ? '나의 선택' : d.opportunityChosen === 'no' ? '어쩔 수 없이' : '-')}
                    ${detailRow('기회(유연)', d.opportunityFlexible === 'yes' ? '유연함' : d.opportunityFlexible === 'no' ? '장벽 존재' : '-')}
                    ${detailRow('😊 즐거움', d.wellbeing_joy ?? '-')}
                    ${detailRow('💪 자신감', d.wellbeing_confidence ?? '-')}
                    ${detailRow('😰 불안함', d.wellbeing_anxiety ?? '-')}
                    ${detailRow('😑 지루함', d.wellbeing_boredom ?? '-')}
                </div>
            `;
        });

        modalContent.innerHTML = html;
        detailModal.style.display = 'flex';
    }

    function detailRow(label, value) {
        return `<div class="detail-item"><span class="detail-item__label">${label}</span><span class="detail-item__value">${value}</span></div>`;
    }

    // ──────────────── Export ────────────────
    function exportAllJSON() {
        if (allResponses.length === 0) { showToast('내려받을 데이터가 없습니다.', 'error'); return; }
        const blob = new Blob([JSON.stringify(allResponses, null, 2)], { type: 'application/json' });
        downloadBlob(blob, `DRM_전체응답_${dateStr()}.json`);
        showToast('JSON 파일이 다운로드되었습니다!');
    }

    function exportAllCSV() {
        if (allResponses.length === 0) { showToast('내려받을 데이터가 없습니다.', 'error'); return; }

        let csv = '\uFEFFsep=,\n';
        csv += '번호,응답시각,응답자ID,에피소드수,진단수,가장큰장벽,학교에바라는한마디\n';
        allResponses.forEach((r, i) => {
            const episodes = Array.isArray(r.episodes) ? r.episodes : [];
            const diagnoses = Array.isArray(r.diagnoses) ? r.diagnoses : [];
            csv += `${i + 1},"${r.timestamp || ''}","${r.respondentId || ''}",${episodes.length},${diagnoses.length},"${r.barrier || ''}","${(r.schoolMessage || '').replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `DRM_전체응답_${dateStr()}.csv`);
        showToast('CSV 파일이 다운로드되었습니다!');
    }

    function exportEpisodeCSV() {
        if (allResponses.length === 0) { showToast('내려받을 데이터가 없습니다.', 'error'); return; }

        let csv = '\uFEFFsep=,\n';
        csv += '응답자ID,에피소드번호,시작시간,종료시간,활동내용,장소,동행인\n';
        allResponses.forEach(r => {
            const episodes = Array.isArray(r.episodes) ? r.episodes : [];
            episodes.forEach((ep, i) => {
                csv += `"${r.respondentId || ''}",${i + 1},"${ep.startTime || ''}","${ep.endTime || ''}","${(ep.activity || '').replace(/"/g, '""')}","${(ep.location || '').replace(/"/g, '""')}","${(ep.companion || '').replace(/"/g, '""')}"\n`;
            });
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `DRM_에피소드_${dateStr()}.csv`);
        showToast('에피소드 CSV가 다운로드되었습니다!');
    }

    function exportDiagnosisCsv() {
        if (allResponses.length === 0) { showToast('내려받을 데이터가 없습니다.', 'error'); return; }

        let csv = '\uFEFFsep=,\n';
        csv += '응답자ID,활동,정보,정보원,시간,기회_선택,기회_유연,즐거움,자신감,불안함,지루함\n';
        allResponses.forEach(r => {
            const diagnoses = Array.isArray(r.diagnoses) ? r.diagnoses : [];
            diagnoses.forEach(d => {
                csv += `"${r.respondentId || ''}","${(d.activity || '').replace(/"/g, '""')}","${d.information || ''}","${(d.informationSource || '').replace(/"/g, '""')}","${d.time || ''}","${d.opportunityChosen || ''}","${d.opportunityFlexible || ''}",${d.wellbeing_joy ?? ''},${d.wellbeing_confidence ?? ''},${d.wellbeing_anxiety ?? ''},${d.wellbeing_boredom ?? ''}\n`;
            });
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `DRM_진단_${dateStr()}.csv`);
        showToast('진단 CSV가 다운로드되었습니다!');
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    // ──────────────── Helpers ────────────────
    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function formatTimestamp(ts) {
        try {
            const d = new Date(ts);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (e) {
            return ts;
        }
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    function dateStr() {
        const d = new Date();
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
    }

    function formatBarrier(b) {
        if (!b) return '-';
        if (b === 'info' || b === '정보의 결핍') return '<span class="barrier-badge barrier-badge--info">📡 정보 결핍</span>';
        if (b === 'time' || b === '시간의 결핍') return '<span class="barrier-badge barrier-badge--time">⏳ 시간 결핍</span>';
        if (b === 'opportunity' || b === '기회의 결핍') return '<span class="barrier-badge barrier-badge--opp">🚪 기회 결핍</span>';
        return b;
    }

    function formatInfo(v) {
        if (v === 'none') return '전혀 없음';
        if (v === 'some') return '조금 있음';
        if (v === 'very') return '매우 유익함';
        return v || '-';
    }

    function formatTimePerception(v) {
        if (v === 'pressure') return '압박감 (경쟁, 독촉)';
        if (v === 'meaningless') return '무의미 (방치, 지루함)';
        if (v === 'flow') return '몰입 (성장)';
        return v || '-';
    }

    // ──────────────── Init ────────────────
    function init() {
        // Login
        loginBtn.addEventListener('click', login);
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') login();
        });

        // Logout
        logoutBtn.addEventListener('click', logout);

        // Refresh
        refreshBtn.addEventListener('click', () => {
            if (DRM_CONFIG.GAS_ENDPOINT) {
                fetchResponses();
            } else {
                loadLocalData();
            }
        });

        // Export buttons
        $('#exportAllJson').addEventListener('click', exportAllJSON);
        $('#exportAllCsv').addEventListener('click', exportAllCSV);
        $('#exportEpisodeCsv').addEventListener('click', exportEpisodeCSV);
        $('#exportDiagnosisCsv').addEventListener('click', exportDiagnosisCsv);

        // Modal close
        closeModalBtn.addEventListener('click', () => {
            detailModal.style.display = 'none';
        });
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) detailModal.style.display = 'none';
        });

        // Focus password input
        passwordInput.focus();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
