// DOM要素の取得
const beforeSlider = document.getElementById('before-slider');
const beforeNumber = document.getElementById('before-number');
const afterSlider = document.getElementById('after-slider');
const afterNumber = document.getElementById('after-number');
const saveBtn = document.getElementById('save-btn');
const message = document.getElementById('message');
const autoSaveToggle = document.getElementById('auto-save-toggle');

// デフォルト値
const DEFAULT_MINUTES_BEFORE = 10;
const DEFAULT_MINUTES_AFTER = 20;

// 自動保存のデバウンス用タイマー
let autoSaveTimeout = null;

/**
 * メッセージを表示する
 */
function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type} show`;

    // 3秒後に非表示
    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}

/**
 * 保存された設定を読み込む
 */
function loadSettings() {
    // デフォルトのスケジュール（全てtrue）
    const defaultSchedule = {
        mon: [true, true, true, true, true],
        tue: [true, true, true, true, true],
        wed: [true, true, true, true, true],
        thu: [true, true, true, true, true],
        fri: [true, true, true, true, true]
    };

    chrome.storage.sync.get({
        minutesBefore: DEFAULT_MINUTES_BEFORE,
        minutesAfter: DEFAULT_MINUTES_AFTER,
        showMypageLink: false,
        showPopupOnNewTab: false,
        autoSaveEnabled: false,
        classSchedule: defaultSchedule
    }, (items) => {
        beforeSlider.value = items.minutesBefore;
        beforeNumber.value = items.minutesBefore;
        afterSlider.value = items.minutesAfter;
        afterNumber.value = items.minutesAfter;
        document.getElementById('mypage-link-toggle').checked = items.showMypageLink;
        document.getElementById('new-tab-popup-toggle').checked = items.showPopupOnNewTab;
        autoSaveToggle.checked = items.autoSaveEnabled;

        // スケジュールカレンダーの読み込み
        loadScheduleCalendar(items.classSchedule);

        // 自動保存が有効な場合、保存ボタンを非表示にする
        updateSaveButtonVisibility(items.autoSaveEnabled);
    });
}

/**
 * スケジュールカレンダーを読み込む
 */
function loadScheduleCalendar(schedule) {
    const checkboxes = document.querySelectorAll('.schedule-checkbox');
    checkboxes.forEach(checkbox => {
        const day = checkbox.getAttribute('data-day');
        const period = parseInt(checkbox.getAttribute('data-period'), 10) - 1; // 0-indexed
        if (schedule[day] && schedule[day][period] !== undefined) {
            checkbox.checked = schedule[day][period];
        }
    });
}

/**
 * 設定を保存する
 */
function saveSettings(showSuccessMessage = true) {
    const minutesBefore = parseInt(beforeNumber.value, 10);
    const minutesAfter = parseInt(afterNumber.value, 10);
    const showMypageLink = document.getElementById('mypage-link-toggle').checked;
    const showPopupOnNewTab = document.getElementById('new-tab-popup-toggle').checked;
    const autoSaveEnabled = autoSaveToggle.checked;

    // スケジュールカレンダーからデータを収集
    const classSchedule = {
        mon: [false, false, false, false, false],
        tue: [false, false, false, false, false],
        wed: [false, false, false, false, false],
        thu: [false, false, false, false, false],
        fri: [false, false, false, false, false]
    };

    const checkboxes = document.querySelectorAll('.schedule-checkbox');
    checkboxes.forEach(checkbox => {
        const day = checkbox.getAttribute('data-day');
        const period = parseInt(checkbox.getAttribute('data-period'), 10) - 1; // 0-indexed
        classSchedule[day][period] = checkbox.checked;
    });

    // バリデーション
    if (isNaN(minutesBefore) || minutesBefore < 0 || minutesBefore > 60) {
        showMessage('開始前は0〜60分の範囲で入力してください', 'error');
        return;
    }

    if (isNaN(minutesAfter) || minutesAfter < 0 || minutesAfter > 60) {
        showMessage('終了後は0〜60分の範囲で入力してください', 'error');
        return;
    }

    // Chrome Storageに保存
    chrome.storage.sync.set({
        minutesBefore: minutesBefore,
        minutesAfter: minutesAfter,
        showMypageLink: showMypageLink,
        showPopupOnNewTab: showPopupOnNewTab,
        autoSaveEnabled: autoSaveEnabled,
        classSchedule: classSchedule
    }, () => {
        if (showSuccessMessage) {
            showMessage('設定を保存しました！', 'success');
        }
    });
}

/**
 * 自動保存を実行（デバウンス付き）
 */
function autoSave() {
    if (!autoSaveToggle.checked) {
        return;
    }

    // 既存のタイムアウトをクリア
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // 500ms後に保存（ユーザーが連続して変更している場合は待つ）
    autoSaveTimeout = setTimeout(() => {
        saveSettings(false); // メッセージを表示しない
    }, 500);
}

/**
 * 保存ボタンの表示/非表示を切り替え
 */
function updateSaveButtonVisibility(autoSaveEnabled) {
    if (autoSaveEnabled) {
        saveBtn.style.display = 'none';
    } else {
        saveBtn.style.display = 'block';
    }
}

/**
 * スライダーと数値入力を同期
 */
function syncInputs(slider, numberInput) {
    slider.addEventListener('input', () => {
        numberInput.value = slider.value;
        autoSave();
    });

    numberInput.addEventListener('input', () => {
        const value = parseInt(numberInput.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 60) {
            slider.value = value;
        }
        autoSave();
    });
}

// 初期化
loadSettings();
syncInputs(beforeSlider, beforeNumber);
syncInputs(afterSlider, afterNumber);

// 保存ボタンのイベントリスナー
saveBtn.addEventListener('click', saveSettings);

// 自動保存トグルの変更イベント
autoSaveToggle.addEventListener('change', () => {
    const enabled = autoSaveToggle.checked;
    updateSaveButtonVisibility(enabled);

    // 自動保存を有効化した際、現在の設定を保存
    if (enabled) {
        saveSettings(true);
    } else {
        // 自動保存を無効化したことを保存
        chrome.storage.sync.set({ autoSaveEnabled: false });
    }
});

// その他のトグルスイッチの変更イベント
document.getElementById('mypage-link-toggle').addEventListener('change', autoSave);
document.getElementById('new-tab-popup-toggle').addEventListener('change', autoSave);

// スケジュールチェックボックスの変更イベント
document.querySelectorAll('.schedule-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', autoSave);
});
