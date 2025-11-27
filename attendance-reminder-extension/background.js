// background.js用の定数と関数（モジュールimportの代わりに直接定義）

const CLASS_START_TIMES = [
    { period: 1, hour: 8, minute: 50, label: '1限' },
    { period: 2, hour: 10, minute: 45, label: '2限' },
    { period: 3, hour: 13, minute: 15, label: '3限' },
    { period: 4, hour: 15, minute: 10, label: '4限' },
    { period: 5, hour: 17, minute: 5, label: '5限' }
];

const DEFAULT_MINUTES_BEFORE = 10;
const DEFAULT_MINUTES_AFTER = 20;

const DEFAULT_CLASS_SCHEDULE = {
    mon: [true, true, true, true, true],
    tue: [true, true, true, true, true],
    wed: [true, true, true, true, true],
    thu: [true, true, true, true, true],
    fri: [true, true, true, true, true]
};

const DAY_MAP = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DEFAULT_NOTIFICATION_ENABLED = true;

const STORAGE_KEYS = {
    MINUTES_BEFORE: 'minutesBefore',
    MINUTES_AFTER: 'minutesAfter',
    SHOW_MYPAGE_LINK: 'showMypageLink',
    SHOW_POPUP_ON_NEW_TAB: 'showPopupOnNewTab',
    AUTO_SAVE_ENABLED: 'autoSaveEnabled',
    CLASS_SCHEDULE: 'classSchedule',
    ATTENDANCE_COMPLETED: 'attendanceCompleted',
    NOTIFICATION_ENABLED: 'notificationEnabled'
};


function getDateKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getDayOfWeekKey() {
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return null;
    }
    return DAY_MAP[dayOfWeek];
}

function generateClassPeriods(minutesBefore, minutesAfter) {
    return CLASS_START_TIMES.map(classTime => {
        const startDate = new Date();
        startDate.setHours(classTime.hour, classTime.minute, 0, 0);
        const beforeDate = new Date(startDate.getTime() - minutesBefore * 60000);
        const afterDate = new Date(startDate.getTime() + minutesAfter * 60000);
        return {
            period: classTime.period,
            label: classTime.label,
            startHour: beforeDate.getHours(),
            startMinute: beforeDate.getMinutes(),
            endHour: afterDate.getHours(),
            endMinute: afterDate.getMinutes()
        };
    });
}

function getCurrentClassPeriod(minutesBefore, minutesAfter, classSchedule) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const dayKey = getDayOfWeekKey();
    if (!dayKey || !classSchedule || !classSchedule[dayKey]) {
        return null;
    }

    const classPeriods = generateClassPeriods(minutesBefore, minutesAfter);

    for (const period of classPeriods) {
        const startTime = period.startHour * 60 + period.startMinute;
        const endTime = period.endHour * 60 + period.endMinute;

        if (currentTime >= startTime && currentTime <= endTime) {
            const periodIndex = period.period - 1;
            if (classSchedule[dayKey][periodIndex]) {
                return period;
            } else {
                return null;
            }
        }
    }

    return null;
}

// Storage functions
function getSettings(defaults = {}) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get(defaults, (items) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, using defaults');
                    resolve(defaults);
                } else {
                    resolve(items);
                }
            });
        } catch (error) {
            console.log('Extension context invalidated:', error);
            resolve(defaults);
        }
    });
}

function isAttendanceCompleted(periodNumber) {
    return new Promise((resolve) => {
        const dateKey = getDateKey();

        try {
            chrome.storage.local.get({ [STORAGE_KEYS.ATTENDANCE_COMPLETED]: {} }, (result) => {
                if (chrome.runtime.lastError) {
                    console.log('Extension context invalidated, skipping attendance check');
                    resolve(false);
                    return;
                }

                const data = result[STORAGE_KEYS.ATTENDANCE_COMPLETED];
                const isCompleted = data[dateKey] && data[dateKey].includes(periodNumber);
                resolve(isCompleted);
            });
        } catch (error) {
            console.log('Extension context invalidated:', error);
            resolve(false);
        }
    });
}

// Tab creation handler for new tab reminder
chrome.tabs.onCreated.addListener(async (tab) => {
    try {
        const settings = await getSettings({
            showPopupOnNewTab: false,
            minutesBefore: DEFAULT_MINUTES_BEFORE,
            minutesAfter: DEFAULT_MINUTES_AFTER,
            classSchedule: DEFAULT_CLASS_SCHEDULE
        });
        if (!settings.showPopupOnNewTab) {
            return;
        }
        if (tab.url && tab.url !== 'chrome://newtab/' && !tab.pendingUrl) {
            return;
        }
        const period = getCurrentClassPeriod(
            settings.minutesBefore,
            settings.minutesAfter,
            settings.classSchedule
        );

        if (period) {
            const isCompleted = await isAttendanceCompleted(period.period);

            if (!isCompleted) {
                const reminderUrl = chrome.runtime.getURL(`reminder.html?period=${period.period}`);

                setTimeout(() => {
                    chrome.tabs.get(tab.id, (currentTab) => {
                        if (chrome.runtime.lastError) {
                            return;
                        }

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
        }
    } catch (error) {
        console.log('Error in tab creation handler:', error);
    }
});

async function setupAlarms() {
    try {
        const settings = await getSettings({
            notificationEnabled: true,
            minutesBefore: DEFAULT_MINUTES_BEFORE,
            classSchedule: DEFAULT_CLASS_SCHEDULE
        });

        if (!settings.notificationEnabled) {
            await chrome.alarms.clearAll();
            console.log('通知が無効のため、すべてのアラームをクリアしました');
            return;
        }

        await chrome.alarms.clearAll();

        for (const classTime of CLASS_START_TIMES) {
            for (let dayIndex = 1; dayIndex <= 5; dayIndex++) {
                const dayKey = DAY_MAP[dayIndex];
                const periodIndex = classTime.period - 1;


                if (settings.classSchedule[dayKey] && settings.classSchedule[dayKey][periodIndex]) {

                    const alarmName = `period-${classTime.period}-${dayKey}`;


                    const notificationTime = new Date();
                    notificationTime.setHours(classTime.hour, classTime.minute - settings.minutesBefore, 0, 0);

                    const now = new Date();
                    let delay = notificationTime.getTime() - now.getTime();


                    if (delay < 0) {
                        const currentDay = now.getDay();
                        let daysUntilTarget = dayIndex - currentDay;
                        if (daysUntilTarget <= 0) {
                            daysUntilTarget += 7;
                        }
                        notificationTime.setDate(notificationTime.getDate() + daysUntilTarget);
                        delay = notificationTime.getTime() - now.getTime();
                    } else {

                        const currentDay = now.getDay();
                        if (currentDay !== dayIndex) {
                            let daysUntilTarget = dayIndex - currentDay;
                            if (daysUntilTarget < 0) {
                                daysUntilTarget += 7;
                            }
                            notificationTime.setDate(notificationTime.getDate() + daysUntilTarget);
                            delay = notificationTime.getTime() - now.getTime();
                        }
                    }


                    await chrome.alarms.create(alarmName, {
                        when: Date.now() + delay,
                        periodInMinutes: 7 * 24 * 60 // 1週間ごと
                    });

                    console.log(`アラーム設定: ${alarmName} - ${notificationTime.toLocaleString('ja-JP')}`);
                }
            }
        }

        console.log('すべてのアラームを設定しました');
    } catch (error) {
        console.error('アラーム設定エラー:', error);
    }
}


chrome.alarms.onAlarm.addListener(async (alarm) => {
    try {
        console.log('アラーム発火:', alarm.name);

        const match = alarm.name.match(/^period-(\d+)-(\w+)$/);
        if (!match) {
            console.log('無効なアラーム名:', alarm.name);
            return;
        }

        const period = parseInt(match[1], 10);
        const dayKey = match[2];

        const now = new Date();
        const currentDayKey = DAY_MAP[now.getDay()];
        if (currentDayKey !== dayKey) {
            console.log(`曜日が一致しません: ${currentDayKey} !== ${dayKey}`);
            return;
        }

        const isCompleted = await isAttendanceCompleted(period);
        if (isCompleted) {
            console.log(`${period}限は出席登録済みです`);
            return;
        }

        const settings = await getSettings({
            notificationEnabled: true
        });

        if (!settings.notificationEnabled) {
            console.log('通知が無効化されています');
            return;
        }


        const classTime = CLASS_START_TIMES.find(c => c.period === period);
        if (classTime) {
            await chrome.notifications.create(`attendance-${period}`, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: '📚 出席登録のお知らせ',
                message: `${classTime.label}（${classTime.hour}:${String(classTime.minute).padStart(2, '0')}）の出席登録を忘れずに！`,
                priority: 2,
                requireInteraction: true
            });

            console.log(`通知を表示しました: ${classTime.label}`);
        }
    } catch (error) {
        console.error('アラーム処理エラー:', error);
    }
});


chrome.notifications.onClicked.addListener(async (notificationId) => {
    try {

        const match = notificationId.match(/^attendance-(\d+)$/);
        if (match) {
            const period = parseInt(match[1], 10);


            await chrome.tabs.create({
                url: 'https://service.cloud.teu.ac.jp/portal/home/'
            });


            await chrome.notifications.clear(notificationId);
        }
    } catch (error) {
        console.error('通知クリック処理エラー:', error);
    }
});

chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('拡張機能がインストール/更新されました:', details.reason);
    await setupAlarms();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_CHANGED') {
        console.log('設定が変更されたため、アラームを再設定します');
        setupAlarms().then(() => {
            sendResponse({ success: true });
        }).catch((error) => {
            console.error('アラーム再設定エラー:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});

setupAlarms();
