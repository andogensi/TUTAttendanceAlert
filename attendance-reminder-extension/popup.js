// デフォルト設定を取得する関数
function getDefaultSettings() {
    return {
        [STORAGE_KEYS.MINUTES_BEFORE]: DEFAULT_MINUTES_BEFORE,
        [STORAGE_KEYS.MINUTES_AFTER]: DEFAULT_MINUTES_AFTER,
        [STORAGE_KEYS.SHOW_MYPAGE_LINK]: true,
        [STORAGE_KEYS.SHOW_POPUP_ON_NEW_TAB]: true,
        [STORAGE_KEYS.AUTO_SAVE_ENABLED]: false,
        [STORAGE_KEYS.CLASS_SCHEDULE]: DEFAULT_CLASS_SCHEDULE,
        [STORAGE_KEYS.NOTIFICATION_ENABLED]: DEFAULT_NOTIFICATION_ENABLED
    };
}

const beforeSlider = document.getElementById('before-slider');
const beforeNumber = document.getElementById('before-number');
const afterSlider = document.getElementById('after-slider');
const afterNumber = document.getElementById('after-number');
const saveBtn = document.getElementById('save-btn');
const message = document.getElementById('message');
const autoSaveToggle = document.getElementById('auto-save-toggle');
const notificationToggle = document.getElementById('notification-toggle');

let autoSaveTimeout = null;

function showMessage(text, type = 'success') {
    message.textContent = text;
    message.className = `message ${type} show`;

    setTimeout(() => {
        message.classList.remove('show');
    }, 3000);
}


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

async function loadSettingsFromStorage() {
    const settings = await getSettings(getDefaultSettings());

    beforeSlider.value = settings[STORAGE_KEYS.MINUTES_BEFORE];
    beforeNumber.value = settings[STORAGE_KEYS.MINUTES_BEFORE];
    afterSlider.value = settings[STORAGE_KEYS.MINUTES_AFTER];
    afterNumber.value = settings[STORAGE_KEYS.MINUTES_AFTER];
    document.getElementById('mypage-link-toggle').checked = settings[STORAGE_KEYS.SHOW_MYPAGE_LINK];
    document.getElementById('new-tab-popup-toggle').checked = settings[STORAGE_KEYS.SHOW_POPUP_ON_NEW_TAB];
    autoSaveToggle.checked = settings[STORAGE_KEYS.AUTO_SAVE_ENABLED];
    notificationToggle.checked = settings[STORAGE_KEYS.NOTIFICATION_ENABLED];

    loadScheduleCalendar(settings[STORAGE_KEYS.CLASS_SCHEDULE]);

    updateSaveButtonVisibility(settings[STORAGE_KEYS.AUTO_SAVE_ENABLED]);
}


async function saveSettingsToStorage(showSuccessMessage = true) {
    const minutesBefore = parseInt(beforeNumber.value, 10);
    const minutesAfter = parseInt(afterNumber.value, 10);
    const showMypageLink = document.getElementById('mypage-link-toggle').checked;
    const showPopupOnNewTab = document.getElementById('new-tab-popup-toggle').checked;
    const autoSaveEnabled = autoSaveToggle.checked;
    const notificationEnabled = notificationToggle.checked;

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


    if (isNaN(minutesBefore) || minutesBefore < 0 || minutesBefore > 60) {
        showMessage('開始前は0〜60分の範囲で入力してください', 'error');
        return;
    }

    if (isNaN(minutesAfter) || minutesAfter < 0 || minutesAfter > 60) {
        showMessage('終了後は0〜60分の範囲で入力してください', 'error');
        return;
    }

    try {
        await saveSettings({
            [STORAGE_KEYS.MINUTES_BEFORE]: minutesBefore,
            [STORAGE_KEYS.MINUTES_AFTER]: minutesAfter,
            [STORAGE_KEYS.SHOW_MYPAGE_LINK]: showMypageLink,
            [STORAGE_KEYS.SHOW_POPUP_ON_NEW_TAB]: showPopupOnNewTab,
            [STORAGE_KEYS.AUTO_SAVE_ENABLED]: autoSaveEnabled,
            [STORAGE_KEYS.CLASS_SCHEDULE]: classSchedule,
            [STORAGE_KEYS.NOTIFICATION_ENABLED]: notificationEnabled
        });

        chrome.runtime.sendMessage(
            { type: 'SETTINGS_CHANGED' },
            (response) => {
                if (chrome.runtime.lastError) {
                    console.log('Background script への通知に失敗:', chrome.runtime.lastError);
                }
            }
        );

        if (showSuccessMessage) {
            showMessage('設定を保存しました！', 'success');
        }
    } catch (error) {
        showMessage('設定の保存に失敗しました', 'error');
    }
}

function performAutoSave() {
    if (!autoSaveToggle.checked) {
        return;
    }

    // 既存のタイムアウトをクリア
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // 500ms後に保存（ユーザーが連続して変更している場合は待つ）
    autoSaveTimeout = setTimeout(() => {
        saveSettingsToStorage(false); // メッセージを表示しない
    }, 500);
}


function updateSaveButtonVisibility(autoSaveEnabled) {
    if (autoSaveEnabled) {
        saveBtn.style.display = 'none';
    } else {
        saveBtn.style.display = 'block';
    }
}

function syncInputs(slider, numberInput) {
    slider.addEventListener('input', () => {
        numberInput.value = slider.value;
        performAutoSave();
    });

    numberInput.addEventListener('input', () => {
        const value = parseInt(numberInput.value, 10);
        if (!isNaN(value) && value >= 0 && value <= 60) {
            slider.value = value;
        }
        performAutoSave();
    });
}

loadSettingsFromStorage();
syncInputs(beforeSlider, beforeNumber);
syncInputs(afterSlider, afterNumber);
saveBtn.addEventListener('click', () => saveSettingsToStorage(true));

autoSaveToggle.addEventListener('change', async () => {
    const enabled = autoSaveToggle.checked;
    updateSaveButtonVisibility(enabled);
    if (enabled) {
        await saveSettingsToStorage(true);
    } else {

        await saveSettings({ [STORAGE_KEYS.AUTO_SAVE_ENABLED]: false });
    }
});

document.getElementById('mypage-link-toggle').addEventListener('change', performAutoSave);
document.getElementById('new-tab-popup-toggle').addEventListener('change', performAutoSave);
notificationToggle.addEventListener('change', performAutoSave);

document.querySelectorAll('.schedule-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', performAutoSave);
});
