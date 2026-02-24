/* ======================================================
   DRM Survey — Configuration
   Google Apps Script endpoint & admin settings
   ====================================================== */

const DRM_CONFIG = {
    // ★ Google Apps Script 배포 URL을 여기에 붙여넣으세요
    // 예: 'https://script.google.com/macros/s/AKfycb.../exec'
    GAS_ENDPOINT: '',

    // 관리자 비밀번호 (Google Apps Script의 ADMIN_PASSWORD와 동일하게 설정)
    ADMIN_PASSWORD: 'drm2026admin',

    // 응답 제출 설정
    SUBMIT_TIMEOUT_MS: 10000,  // 제출 타임아웃 (10초)
    RETRY_COUNT: 2,            // 재시도 횟수
};
