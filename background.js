let tempo;

function atualizarContador() {
    chrome.storage.local.get(['valorRelogio'], function (result) {
        tempo = result.valorRelogio;
        tempo -= 1;
        if (tempo > 0) {
            chrome.runtime.sendMessage({ action: 'atualizarRelogio', tempo });
            chrome.storage.local.set({ 'valorRelogio': tempo })
        } else if (tempo <= 0) {
            chrome.alarms.clear("clock")
        }
    })
}

function startClock() {
    chrome.alarms.create("clock", {
        delayInMinutes: 1,
        periodInMinutes: 1
    });
}

function clearAllAalarms() {
    chrome.alarms.clear("alarme")
    chrome.alarms.clear("clock")
    chrome.alarms.clear("adiar")
};

function startAlarme() {
    clearAllAalarms();
    chrome.storage.local.set({ 'valorRelogio': 30 })
    chrome.alarms.create("alarme", {
        delayInMinutes: 30,
        periodInMinutes: 30
    });
};

function startAllAlarms() {
    startAlarme();
    startClock();
    tempo = 31;
    chrome.storage.local.set({ 'valorRelogio': tempo })
    atualizarContador();
}

chrome.runtime.onMessage.addListener(async function (message) {
    if (message.action === "stopTimer") {
        clearAllAalarms();
    };

    if (message.action === "startTimer") {
        startAllAlarms();
    };

    if (message.action === "resetarTimer") {
        clearAllAalarms();
        startAllAlarms();
    };
});

function setarRelogio(valor) {
    chrome.storage.local.set({ 'valorRelogio': valor })
    atualizarContador();
};

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "clock") {
        console.log("Clock foi ativado");
        atualizarContador();
    };
});


function adiarTimer() {
    clearAllAalarms();
    setarRelogio(11);
    startClock();
    chrome.alarms.create("adiar", {
        delayInMinutes: 10,
        periodInMinutes: 10
    });
};

function createAlarm() {
    clearAllAalarms();
    startClock();
    return new Promise((resolve) => {
        chrome.notifications.create({
            type: "basic",
            requireInteraction: true,
            iconUrl: chrome.runtime.getURL("icons/16.png"),
            title: "Hora de beber água!",
            message: "Lembre-se de se manter hidratado.",
            buttons: [
                { title: "Beber agora" },
                { title: "Adiar 10 minutos" }
            ],
        }, function (notificationId) {
            chrome.notifications.onButtonClicked.addListener(async function (clickedNotificationId, buttonIndex) {
                if (clickedNotificationId === notificationId) {
                    if (buttonIndex === 0) {
                        function diminuirUmCopo() {
                            return new Promise((resolve, reject) => {
                                setarRelogio(31);
                                chrome.storage.local.get(['copos', 'mlFaltam', 'mlTomados'], function (result) {
                                    if (chrome.runtime.lastError) {
                                        console.error(chrome.runtime.lastError);
                                        reject(chrome.runtime.lastError);
                                    } else {
                                        if (result.copos !== undefined && result.copos > 0) {
                                            const coposAtualizados = result.copos - 1;
                                            const mlFaltamUpd = result.mlFaltam - 250;
                                            const mlTomadosUpd = result.mlTomados + 250;
                                            chrome.storage.local.set({ 'copos': coposAtualizados, 'mlFaltam': mlFaltamUpd, 'mlTomados': mlTomadosUpd }, function () {
                                                if (chrome.runtime.lastError) {
                                                    console.error(chrome.runtime.lastError);
                                                    reject(chrome.runtime.lastError);
                                                } else {
                                                    resolve({
                                                        coposAtualizados: coposAtualizados,
                                                        mlFaltamUpd: mlFaltamUpd,
                                                        mlTomadosUpd: mlTomadosUpd
                                                    });
                                                }
                                            });
                                        } else {
                                            resolve(result.copos);
                                        }
                                    }
                                });
                            });
                        }
                        chrome.storage.local.get(['copos'], function (result) {
                            if ((result.copos - 1) <= 0) {
                                chrome.alarms.clear("alarme")
                            }
                        })
                        diminuirUmCopo().then((result) => {
                            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                                if (message === 'update-dom') {
                                    const response = {
                                        coposAtualizados: result.coposAtualizados,
                                        mlFaltamUpd: result.mlFaltamUpd,
                                        mlTomadosUpd: result.mlTomadosUpd
                                    }
                                    sendResponse(response);
                                }
                            });
                            chrome.notifications.clear(notificationId);
                        })
                        startAlarme();
                        startClock();
                    } else if (buttonIndex === 1) {
                        chrome.notifications.clear(notificationId);
                        clearAllAalarms();
                        adiarTimer();
                    };
                };
            });
            resolve(notificationId);
        });
    });
};

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name === "alarme") {
        createAlarm();
    };
    if (alarm.name === "adiar") {
        createAlarm();
    };
});

