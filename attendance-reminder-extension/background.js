// デフォルト設定値
const DEFAULT_MINUTES_BEFORE = 10;
const DEFAULT_MINUTES_AFTER = 20;

// 授業の実際の開始時刻
const CLASS_START_TIMES = [
    { period: 1, hour: 8, minute: 50, label: '1限' },
    { period: 2, hour: 10, minute: 45, label: '2限' },
    { period: 3, hour: 13, minute: 15, label: '3限' },
    { period: 4, hour: 15, minute: 10, label: '4限' },
    { period: 5, hour: 22, minute: 35, label: '5限' }
];

// 現在の授業時間帯を取得
function getCurrentClassPeriod(minutesBefore, minutesAfter, classSchedule) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    const dayOfWeek = now.getDay(); // 0=日曜, 1=月曜, ..., 6=土曜

    // 曜日を文字列に変換
    const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayKey = dayMap[dayOfWeek];

    // 土日または設定がない場合はnullを返す
    if (dayOfWeek === 0 || dayOfWeek === 6 || !classSchedule || !classSchedule[dayKey]) {
        return null;
    }

    for (const classTime of CLASS_START_TIMES) {
        const startDate = new Date();
        startDate.setHours(classTime.hour, classTime.minute, 0, 0);

        const beforeDate = new Date(startDate.getTime() - minutesBefore * 60000);
        const afterDate = new Date(startDate.getTime() + minutesAfter * 60000);

        const startTime = beforeDate.getHours() * 60 + beforeDate.getMinutes();
        const endTime = afterDate.getHours() * 60 + afterDate.getMinutes();

        if (currentTime >= startTime && currentTime <= endTime) {
            // この時限がスケジュールにチェックされているかを確認
            const periodIndex = classTime.period - 1; // 0-indexed
            if (classSchedule[dayKey][periodIndex]) {
                return classTime;
            } else {
                return null; // 時限はあるがスケジュールで無効化されている
            }
        }
    }

    return null;
}

// 出席登録済みかチェック
function isAttendanceCompleted(periodNumber, callback) {
    const today = new Date();
    const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    chrome.storage.local.get({ attendanceCompleted: {} }, (result) => {
        const data = result.attendanceCompleted;
        const isCompleted = data[dateKey] && data[dateKey].includes(periodNumber);
        callback(isCompleted);
    });
}

// 新しいタブが作成されたときのイベントリスナー
chrome.tabs.onCreated.addListener((tab) => {
    // デフォルトのスケジュール（全てtrue）
    const defaultSchedule = {
        mon: [true, true, true, true, true],
        tue: [true, true, true, true, true],
        wed: [true, true, true, true, true],
        thu: [true, true, true, true, true],
        fri: [true, true, true, true, true]
    };

    // 設定を読み込む
    chrome.storage.sync.get({
        showPopupOnNewTab: false,
        minutesBefore: DEFAULT_MINUTES_BEFORE,
        minutesAfter: DEFAULT_MINUTES_AFTER,
        classSchedule: defaultSchedule
    }, (items) => {
        // 設定がオフの場合は何もしない
        if (!items.showPopupOnNewTab) {
            return;
        }

        // タブのURLが既に設定されている場合（マイページへのナビゲーションなど）は何もしない
        // 空の新しいタブの場合のみリマインダーページを表示
        if (tab.url && tab.url !== 'chrome://newtab/' && !tab.pendingUrl) {
            return;
        }

        // 現在の授業時間帯を取得（classScheduleを渡す）
        const period = getCurrentClassPeriod(items.minutesBefore, items.minutesAfter, items.classSchedule);

        if (period) {
            // 出席登録済みかチェック
            isAttendanceCompleted(period.period, (isCompleted) => {
                if (!isCompleted) {
                    // 未登録の場合のみリマインダーページを表示
                    const reminderUrl = chrome.runtime.getURL(`reminder.html?period=${period.period}`);
                    setTimeout(() => {
                        // タブが既に閉じられているか、別のURLに移動していないかチェック
                        chrome.tabs.get(tab.id, (currentTab) => {
                            if (chrome.runtime.lastError) {
                                // タブが既に閉じられている
                                return;
                            }
                            // タブが空の新しいタブのままの場合のみ更新
                            if (!currentTab.url || currentTab.url === 'chrome://newtab/') {
                                chrome.tabs.update(tab.id, {
                                    url: reminderUrl
                                }).catch((error) => {
                                    console.log('Could not update tab:', error);
                                });
                            }
                        });
                    }, 100);
                }
            });
        }
    });
});

