var getRedialSettings = (function() {
    function setAbsoluteDate(time, callDate) {
        var date = new Date(callDate.getTime());

        if (time.year) {
            date.setFullYear(time.year);
        }
        if (time.month) {
            date.setMonth(time.month - 1);
        }
        if (time.day) {
            date.setDate(time.day);
            if (time.day < date.getDate()) {
                date.setMonth(date.getDate() + 1);
            }
        } else {
            date.setDate(1);
        }
        return date;
    }

    function setRelativeDate(time, callDate) {
        var date = new Date(callDate.getTime());

        if (time.years) {
            date.setFullYear(date.getFullYear() + time.years);
        }
        if (time.months) {
            date.setMonth(date.getMonth() + time.months);
        }
        if (time.days) {
            date.setDate(date.getDate() + time.days);
        }
        return date;
    }

    function setAbsoluteTime(time, callDate, textDateTime) {
        var date = new Date(callDate.getTime());
        if (time.hour) {
            if (time.hour === 24) {
                time.hour = 23;
                time.minute = 59;
            } else if (!time.period
                && time.hour < 12
                && time.hour >= 0
                && callDate.getHours() >= time.hour
                && !$nlp.matchPatterns(textDateTime, ["TimeHoursModifier"])
                ) {
                time.hour += 12; // реплика "перезвони в 2" (понятно, что не ночи)
            }
            date.setHours(time.hour);
        }
        if (time.minute) {
            date.setMinutes(time.minute);
        } else {
            date.setMinutes(0);
        }
        return date;
    }

    function setRelativeTime(time, callDate) {
        var date = new Date(callDate.getTime());

        if (time.hours) {
            date.setHours(date.getHours() + time.hours);
        }
        if (time.minutes) {
            date.setMinutes(date.getMinutes() + time.minutes);
        }
        return date;
    }

    function formatTime(hours, minutes) {
        return (hours < 10 ? "0" + hours : hours) + ":" + (minutes < 10 ? "0" + minutes : minutes);
    }

    function getRedialSettings(timeObj, number, currentTime) {
        var timezone = "";
        if (testMode() || $.request.channelType !== "resterisk") {
            timezone = "+03:00";
        } else {
            timezone = $dialer.getAbonentTimezone();
        }
        var $session = $jsapi.context().session;

        var textDateTime = timeObj.text || timeObj[0].text;
        var time = timeObj[0] ? timeObj[0].DateTime[0].value : timeObj.DateTime[0].value;

        // нет запроса на конкретное время перезвона
        if (!time) {
            return null;
        }

        var timeNow = $session.testDate
            ? toMoment({value: _.clone($session.testDate)}).toDate()
            : new Date(currentTime);
        var callDate = $session.testDate
            ? toMoment({value: _.clone($session.testDate)}).toDate()
            : new Date(currentTime);
        var timeFrom;
        var timeTo;
        var callObj;
        var weekendsAllowed = true;
        var delay;
        var nightTimeTo = moment($global.redial.time.night.to).toDate();
        var morningTimeFrom = moment($global.redial.time.morning.from).toDate();
        var allowedTime = {};

        // обработка случаев "первого"/"второго"/"двадцать девятого", которые относились к hour, а не к day
        if (!time.day && time.hour) {
            var regExpDate = "(первого|второго|третьего|четв[её]ртого|пятого|шестого|седьмого|восьмого|девятого|десятого|двадцатого|тридцатого)";
            if (textDateTime.match(regExpDate) && !textDateTime.match("час")) {
                if (_.has(time, "hour") && !_.has(time, "minute")) {
                    time.day = time.hour;
                    delete time.hour;
                    time.month = timeNow.getMonth() + 1;
                }
                if (time.day < timeNow.getDate()) {
                    time.month = timeNow.getMonth() + 2; // в $DateTime январь - это 1, в Date январь - это 0
                }
            }
            if (time.hour && time.hour > 24) {
                return null;
            }
        }
        // проверяем валидность даты
        if (!toMoment({value: _.clone(time)}).isValid()) {
            return null;
        }
        // with date
        if (time.month || time.day || time.months || time.days || time.year || time.years) {
            // absolute date
            if (time.month || time.day || time.year) {
                callDate = setAbsoluteDate(time, callDate);
            // relative date
            } else {
                callDate = setRelativeDate(time, callDate);
            }
            // absolute time
            if (time.hour || time.minute) {
                // пятого июля в два часа, завтра в два часа
                timeFrom = setAbsoluteTime(time, callDate, textDateTime);
                // если клиент назвал время раньше времени для утра
                if ((timeFrom.getHours() < morningTimeFrom.getHours())
                    || ((timeFrom.getHours() === morningTimeFrom.getHours())
                        && (timeFrom.getMinutes() < morningTimeFrom.getMinutes()))) {
                    // если названа сегодняшняя дата, добавляем задержку от текущего момента
                    if (callDate.getDate() === timeNow.getDate()) {
                         callDate.setMinutes(timeNow.getMinutes() + 720);
                    // если другой день, то обнуляем часы и минуты
                    } else {
                        callDate.setHours(0);
                        callDate.setMinutes(0);
                    }
                    // ставим время перезвона на "утро"
                    callObj = {
                        startDateTime: new Date(callDate.toString()),
                        allowedTime: {
                            "default": [{
                                localTimeFrom: $global.redial.time.morning.from,
                                localTimeTo: $global.redial.time.morning.to
                            }]
                        },
                        retryIntervalInMinutes: (($global.redial.time[time] && $global.redial.time[time].retryInterval)
                            || $global.redial.time.default.retryInterval)
                    };
                // если клиент назвал время позже времени для ночи
                } else if ((timeFrom.getHours() > nightTimeTo.getHours())
                    || ((timeFrom.getHours() === nightTimeTo.getHours())
                        && (timeFrom.getMinutes() > nightTimeTo.getMinutes()))) {
                    // если названа сегодняшняя дата, добавляем задержку от текущего момента
                    if (callDate.getDate() === timeNow.getDate()) {
                        callDate.setMinutes(timeNow.getMinutes() + $global.redial.time.default.delay);
                    // если другой день, то обнуляем часы и минуты
                    } else {
                        callDate.setHours(0);
                        callDate.setMinutes(0);
                    }
                    // ставим время перезвона на "ночь"
                    callObj = {
                        startDateTime: new Date(callDate.toString()),
                        allowedTime: {
                            "default": [{
                                localTimeFrom: $global.redial.time.night.from,
                                localTimeTo: $global.redial.time.night.to
                            }]
                        },
                        retryIntervalInMinutes: (($global.redial.time[time] && $global.redial.time[time].retryInterval)
                            || $global.redial.time.default.retryInterval)
                    };
                } else {
                    timeTo = new Date(timeFrom.toString());
                    timeTo.setMinutes(timeFrom.getMinutes() + $global.redial.time.default.interval);
                    // если названа сегодняшняя дата, добавляем задержку от текущего момента
                    if (callDate.getDate() === timeNow.getDate()) {
                        delay = $global.redial.time[time]
                            ? $global.redial.time[time].delay
                            : $global.redial.time.default.delay;
                        callDate.setMinutes(timeNow.getMinutes() + delay);
                    // если другой день, то обнуляем часы и минуты
                    } else {
                        callDate.setHours(0);
                        callDate.setMinutes(0);
                    }
                    callObj = {
                        startDateTime: new Date(callDate.toString()),
                        allowedTime: {
                            "default": [{
                                localTimeFrom: formatTime(timeFrom.getHours(), timeFrom.getMinutes()),
                                localTimeTo: formatTime(timeTo.getHours(), timeTo.getMinutes())
                            }]
                        },
                        retryIntervalInMinutes: (($global.redial.time[time] && $global.redial.time[time].retryInterval)
                            || $global.redial.time.default.retryInterval)
                    };
                }
            // relative time
            } else if (time.hours || time.minutes) {
                // пятого июля через два часа
                callDate = setRelativeTime(time, callDate);
                // время уже добавлено к дате
                callObj = {
                    startDateTime: new Date(callDate.toString())
                    // интервал для звонка по локальному времени и интервал перезвона берутся из рассылки
                };
            // TimeSpecial
            } else if (time.from) {
                callDate.setHours(0);
                callDate.setMinutes(0);
                callObj = {
                    startDateTime: new Date(callDate.toString()),
                    allowedTime: {
                        "default": [{
                            localTimeFrom: time.from,
                            localTimeTo: time.to
                        }]
                    },
                    retryIntervalInMinutes: time.retryInterval,
                    maxAttempts: $global.redial.callAttempts
                    // разрешенные дни для звонка берутся из рассылки
                };
            // no time
            } else {
                // пятого июля, завтра
                callDate.setHours(0);
                callDate.setMinutes(0);
                callObj = {
                    startDateTime: new Date(callDate.toString())
                    // интервал для звонка по локальному времени и интервал перезвона берутся из рассылки
                };
            }
        // without date, only time
        // absolute time
        } else if (time.hour || time.minute) {
            // в два часа
            timeFrom = setAbsoluteTime(time, callDate, textDateTime);
            var timezoneHours = Number(timezone.slice(1, 3));
            timeNow.setHours(timeNow.getHours() + timezoneHours);
            // если клиент "указал время в прошлом" (берется текущая дата + названное время), добавляем еще день
            if (callDate < timeNow) {
                callDate.setMinutes(timeNow.getMinutes() + 1440);
            }
            if (timeFrom < timeNow) {
                timeFrom.setMinutes(timeFrom.getMinutes() + 1440);
            }
            // если клиент назвал время раньше времени для утра
            if ((timeFrom.getHours() < morningTimeFrom.getHours())
                || ((timeFrom.getHours() === morningTimeFrom.getHours())
                    && (timeFrom.getMinutes() < morningTimeFrom.getMinutes()))) {
                // добавляем задержку от текущего момента
                if (callDate.getDate() === timeNow.getDate()) {
                    callDate.setMinutes(timeNow.getMinutes() + 720);
                }
                if (timeFrom.getDate() === timeNow.getDate()) {
                    timeFrom.setMinutes(timeFrom.getMinutes() + 720);
                    timeFrom.setMinutes(timeFrom.getMinutes() + 60 * 24);
                }
                var timeFromForStartDateTime = timeFrom;
                callObj = {
                    startDateTime: new Date(timeFromForStartDateTime.toString() + timezone),
                    allowedTime: {
                        "default": [{
                            localTimeFrom: $global.redial.time.morning.from,
                            localTimeTo: $global.redial.time.morning.to
                        }]
                    },
                    retryIntervalInMinutes: (($global.redial.time[time] && $global.redial.time[time].retryInterval)
                        || $global.redial.time.default.retryInterval)
                };
            // если клиент назвал время позже времени для ночи
            } else if ((timeFrom.getHours() > nightTimeTo.getHours())
                || ((timeFrom.getHours() === nightTimeTo.getHours())
                    && (timeFrom.getMinutes() > nightTimeTo.getMinutes()))) {
                // добавляем задержку от текущего момента
                if (callDate.getDate() === timeNow.getDate()) {
                    callDate.setMinutes(timeNow.getMinutes() + $global.redial.time.default.delay);
                }
                if (timeFrom.getDate() === timeNow.getDate()) {
                    timeFrom.setMinutes(timeFrom.getMinutes() + 720);
                }
                var timeFromForStartDateTime = timeFrom;
                callObj = {
                    startDateTime: new Date(timeFromForStartDateTime.toString() + timezone),
                    allowedTime: {
                        "default": [{
                            localTimeFrom: $global.redial.time.night.from,
                            localTimeTo: $global.redial.time.night.to
                        }]
                    },
                    retryIntervalInMinutes: (($global.redial.time[time] && $global.redial.time[time].retryInterval)
                        || $global.redial.time.default.retryInterval)
                };
            } else {
                timeTo = new Date(timeFrom.toString());
                timeTo.setMinutes(timeFrom.getMinutes() + $global.redial.time.default.interval);
                // добавляем задержку от текущего момента
                if (callDate.getDate() === timeNow.getDate()) {
                    delay = $global.redial.time.minimalDelay;
                    callDate.setMinutes(timeNow.getMinutes() + delay);
                }
                var timeFromForStartDateTime = timeFrom;
                callObj = {
                    startDateTime: new Date(timeFromForStartDateTime.toString() + timezone),
                    allowedTime: {
                        "default": [{
                            localTimeFrom: formatTime(timeFrom.getHours(), timeFrom.getMinutes()),
                            localTimeTo: formatTime(timeTo.getHours(), timeTo.getMinutes())
                        }]
                    },
                    retryIntervalInMinutes: (($global.redial.time[time] && $global.redial.time[time].retryInterval)
                        || $global.redial.time.default.retryInterval)
                };
            }
        // relative time
        } else if (time.hours || time.minutes) {
            // через час
            callDate = setRelativeTime(time, callDate);
            // время уже добавлено к дате
            callObj = {
                startDateTime: new Date(callDate.toString())
                // интервал для звонка по локальному времени и интервал перезвона берутся из рассылки
            };
        // Time Special
        } else if (time.from) {
            callDate.setMinutes(timeNow.getMinutes() + time.delay);
            callObj = {
                startDateTime: new Date(callDate.toString()),
                allowedTime: {
                    "default": [{
                        localTimeFrom: time.from,
                        localTimeTo: time.to
                    }]
                },
                retryIntervalInMinutes: time.retryInterval,
                maxAttempts: $global.redial.callAttempts
                // разрешенные дни для звонка берутся из рассылки
            };
        }

        // Проверяем что дата не в прошлом)
        if (callDate <= timeNow) {
            return null;
        }

        // обработка случая "в выходные"
        var matchWeekend = $nlp.matchPatterns(textDateTime, ["* $Weekend *"]);

        // Проверяем, что дата не более, чем через кол-во дней по умолчанию от текущей
        log("PMI_LOG REDIAL INFO 1) " + toPrettyString(callDate) + " 2) " + timeNow.getDate() + " 3) " + $global.redial.time.maxTime + " " + timeNow);
        log("PMI_LOG REDIAL FINAL INFO " + new Date(timeNow.toString()).setDate(timeNow.getDate() + $global.redial.time.maxTime));
        if (callDate > (new Date(timeNow.toString()).setDate(timeNow.getDate() + $global.redial.time.maxTime))) {
            return "Call date is too far";
        }

        // Если клиент явно указал, что ему надо перезвонить в сб или вс (как абсолютное, так и относительное время),
        // разрешаем звонить в этот день
        if (weekendsAllowed && !matchWeekend
            && (callDate.getDay() === 6 || callDate.getDay() === 0)) {
            var allowedDays = ["mon", "tue", "wed", "thu", "fri"];

            if (callDate.getDay() === 6) {
                allowedDays.push("sat");
                allowedTime = _.extend(allowedTime, {
                    "sat": [{
                            localTimeFrom: $global.redial.time.weekend.from,
                            localTimeTo: $global.redial.time.weekend.to
                        }]
                    });
            }
            if (callDate.getDay() === 0) {
                allowedDays.push("sun");
                allowedTime = _.extend(allowedTime, {
                    "sun": [{
                            localTimeFrom: $global.redial.time.weekend.from,
                            localTimeTo: $global.redial.time.weekend.to
                        }]
                    });
            }
            callObj = _.extend(callObj, {allowedDays: allowedDays});

            allowedTime = _.extend(allowedTime, {
                "default": [{
                        localTimeFrom: $global.redial.time.default.from,
                        localTimeTo: $global.redial.time.default.to
                    }]
                });

            // чтобы не звонил в выходные слишком рано и слишком поздно
            if (!time.from && !time.hour && !time.hours && !time.minute && !time.minutes) {
                callObj = _.extend(callObj, {
                    allowedTime: allowedTime
                });
            }
        }

        // для запросов "в выходные"
        if (matchWeekend) {
            // если нет указания на конкретное время, ставим дефолтное ограничение
            if (!time.from && !time.hour && !time.hours && !time.minute && !time.minutes) {
                allowedTime = {
                    "default": [{
                            localTimeFrom: $global.redial.time.weekend.from,
                            localTimeTo: $global.redial.time.weekend.to
                        }]
                    };
                callObj = _.extend(callObj, {
                    allowedTime: allowedTime
                });
            }
            // меняем разрешенные дни для звонков
            callObj = _.extend(callObj, {
                retryIntervalInMinutes: $global.redial.time.weekend.retryInterval,
                allowedDays: ["sat", "sun"]
            });
        }

        callObj = _.extend(callObj, {maxAttempts: $global.redial.callAttempts});

        return callObj;
    }

    return getRedialSettings;
})();

function setRedialTime() {
    var $parseTree = $jsapi.context().parseTree;
    var $session = $jsapi.context().session;
    $.response.replies = $.response.replies || [];

    var redialObj;
    var timeNowMoment = $session.testDate ? moment($session.testDate) : moment($jsapi.currentTime());

    $session.callback = $parseTree.text;
    var timeSettings = null;
    if ($parseTree.callbackDateTime
        && ($parseTree.callbackDateTime[0].DateTime
            || $parseTree.callbackDateTime[0].TimeSpecial)) {
        timeSettings = getRedialSettings($parseTree.callbackDateTime, $dialer.getCaller(), $jsapi.currentTime());
    }
    if ($parseTree.DateTime) {
        timeSettings = getRedialSettings($parseTree, $dialer.getCaller(), $jsapi.currentTime());
    }
    if (timeSettings === "Call date is too far") {
        if ($jsapi.context().testContext) {
            $.response.replies.push({
                "type": "raw",
                "call": "Call date is too far"
            });
        }
        return timeSettings;
    }
    if (timeSettings == null) {
        redialObj = {
            startDateTime: new Date(timeNowMoment.add($global.redial.time.recallTime, "minutes").toString())
        };
    } else {
        redialObj = timeSettings;
    }
    log("final redial settings" + toPrettyString(redialObj));
    return redialObj;
}

function completeRedialObj(redialObj) {
    var result = redialObj || {};
    var timeNowMoment = $.session.testDate ? moment($.session.testDate) : moment($jsapi.currentTime());
    result.startDateTime = result.startDateTime
        || new Date(timeNowMoment.add($global.redial.time.recallTime, "minutes").toString());
    result.payload = result.payload || getUserField("payload");
    // В maxAttempts учитываем изначальное количество попыток и сколько уже было совершено
    log(toPrettyString("callsLimit--"));
    if ($.session.endedOnTechnicalError) {
        result.maxAttempts = getUserField("callsLimit") - getUserField("callAttempt") + 1;
    } else {
        result.maxAttempts = getUserField("callsLimit") - getUserField("callAttempt");
    }
    return result;
}

function standartRedial() {
    if (!$.session.tooLateToRedial) {
        var redialObj = _.clone(getUserFieldInit("dialSchedule"));
        redialObj.startDateTime = new Date(moment().add(getRedialInterval(), "minutes").toString());
        $dialer.redial(redialObj);
        if ($.session.endedOnTechnicalError || $.session.onScriptError) {
            var additionalAttempt = getUserField("callsLimit") + 1;
            updateUserField("callsLimit", additionalAttempt);
        }
    }
}

function getSimpleRedialInterval() {
    if (!testMode() && isResterisk() && !$.session.incoming) {
        var platformInterval = $dialer.getRetryIntervals();
        if (platformInterval) {
            return platformInterval.campaignRetryIntervalInMinutes;
        }
    }
    return $global.redial.time.recallTime;
}

// выбираем тип перезвона - обычный или кастомный
function getRedialInterval() {
    return $.injector.redialType === "custom" ? getCustomRedialInterval() : getSimpleRedialInterval();
}

// при кастомном перезвоне выбираем одно из значений в массиве согласно выбранной стратегии
function getCustomRedialInterval() {
    // если не указан массив интервалов, возвращем стандартное значение
    if (!$.injector.customRedial) {
        return getSimpleRedialInterval();
    }

    var redialIntervals = getUserField("redialIntervals") || $.injector.customRedial.interval;
    // если интервалы указаны не верно или отсутствуют, возвращаем стандартное значение
    if (!Array.isArray(redialIntervals) || !redialIntervals || redialIntervals.length === 0) {
        return getSimpleRedialInterval();
    }
    if (redialIntervals.length === 1) {
        return redialIntervals[0];
    }
    var currentInterval = redialIntervals.shift();
    var callAttempt = getUserField("callAttempt");
    if (!(($.injector.customRedial.strategy === "firstCustom" && callAttempt === 1)
        || callAttempt === CALL_ATTEMPT_LIMIT || $.injector.customRedial.strategy === "lastLoop")) {
        redialIntervals.push(currentInterval);
    }
    updateUserField("redialIntervals", redialIntervals);
    return currentInterval;
}
