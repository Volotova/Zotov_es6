/*
Checks that start date is before end date.
    Args:
        start (string): date in format DD.MM[.YY] (use dateToString() to convert
        from object {day: int, month: int, [year: int]})
        end (string): date in format DD.MM[.YY]
*/
function checkPeriod(start, end, noYearOptionStart, noYearOptionEnd) {
    noYearOptionStart = noYearOptionStart || "current";
    noYearOptionEnd = noYearOptionEnd || noYearOptionStart;
    var startDate = getFullDate(start, false, noYearOptionStart);
    var endDate = getFullDate(end, false, noYearOptionEnd);
    if (!moment(startDate, "DD.MM.YYYY").isValid() || !moment(endDate, "DD.MM.YYYY").isValid()) {
        throw new Error("Date not valid");
    }
    return moment(startDate, "DD.MM.YYYY").isSameOrBefore(moment(endDate, "DD.MM.YYYY"));
}

/*
Checks that date is in the past.
    Args:
        date (string): date in format DD.MM[.YY] (use dateToString() to convert
        from object {day: int, month: int, [year: int]})
        includeToday (boolean): if today should be included in past. false by default.
        noYearOption (string):  how to deal with dates without year. "current" by default:
            "current" - assign current year,
            "past" - assign this or previous year so that it is the closest to now in the past,
            "future" - assign this or next year so that it is the closest to now in future.
*/
function checkDateInPast(date, includeToday, noYearOption) {
    noYearOption = noYearOption || "current";
    includeToday = includeToday || false;
    var fullDate = getFullDate(date, includeToday, noYearOption);
    if (!moment(fullDate, "DD.MM.YYYY").isValid()) {
        throw new Error("Date not valid");
    }
    if (includeToday) {
        return moment(dayStart(currentDate())).isSameOrAfter(moment(fullDate, "DD.MM.YYYY"));
    }
    return moment(dayStart(currentDate())).isAfter(moment(fullDate, "DD.MM.YYYY"));
}

/*
Checks that date is in the future.
    Args:
        date (string): date in format DD.MM[.YY] (use dateToString() to convert
        from object {day: int, month: int, [year: int]})
        includeToday (boolean): if today should be included in future. false by default.
        noYearOption (string):  how to deal with dates without year. "current" by default:
            "current" - assign current year,
            "past" - assign this or previous year so that it is the closest to now in the past,
            "future" - assign this or next year so that it is the closest to now in future.
*/
function checkDateInFuture(date, includeToday, noYearOption) {
    noYearOption = noYearOption || "current";
    includeToday = includeToday || false;
    var fullDate = getFullDate(date, includeToday, noYearOption);
    if (!moment(fullDate, "DD.MM.YYYY").isValid()) {
        throw new Error("Date not valid");
    }
    if (includeToday) {
        return moment(dayStart(currentDate())).isSameOrBefore(moment(fullDate, "DD.MM.YYYY"));
    }
    return moment(dayStart(currentDate())).isBefore(moment(fullDate, "DD.MM.YYYY"));
}

/*
Checks that period is in the past.
    Args:
        start (string): date in format DD.MM[.YY] (use dateToString() to convert
        from object {day: int, month: int, [year: int]})
        end (string): date in format DD.MM[.YY]
        includeToday (boolean): if today should be included in past. false by default.
        noYearOptionStart (string):  how to deal with start date without year. "current" by default:
            "current" - assign current year,
            "past" - assign this or previous year so that it is the closest to now in the past,
            "future" - assign this or next year so that it is the closest to now in future.
        noYearOptionEnd (string):  how to deal with end date without year
*/
function checkPeriodInPast(start, end, includeToday, noYearOptionStart, noYearOptionEnd) {
    noYearOptionStart = noYearOptionStart || "current";
    noYearOptionEnd = noYearOptionEnd || noYearOptionStart;
    includeToday = includeToday || false;
    var startDate = getFullDate(start, includeToday, noYearOptionStart);
    var endDate = getFullDate(end, includeToday, noYearOptionEnd);
    if (!moment(startDate, "DD.MM.YYYY").isValid() || !moment(endDate, "DD.MM.YYYY").isValid()) {
        throw new Error("Date not valid");
    }
    if (includeToday) {
        return checkPeriod(startDate, endDate)
            && moment(dayStart(currentDate())).isSameOrAfter(moment(endDate, "DD.MM.YYYY"));
    }
    return checkPeriod(startDate, endDate) && moment(dayStart(currentDate())).isAfter(moment(endDate, "DD.MM.YYYY"));
}

/*
Checks that period is in the future.
    Args:
        start (string): date in format DD.MM[.YY] (use dateToString() to convert
        from object {day: int, month: int, [year: int]})
        end (string): date in format DD.MM[.YY]
        includeToday (boolean): if today should be included in future. false by default.
        noYearOptionStart (string):  how to deal with start date without year. "current" by default:
            "current" - assign current year,
            "past" - assign this or previous year so that it is the closest to now in the past,
            "future" - assign this or next year so that it is the closest to now in future.
        noYearOptionEnd (string):  how to deal with end date without year
*/
function checkPeriodInFuture(start, end, includeToday, noYearOptionStart, noYearOptionEnd) {
    noYearOptionStart = noYearOptionStart || "current";
    noYearOptionEnd = noYearOptionEnd || noYearOptionStart;
    includeToday = includeToday || false;
    var startDate = getFullDate(start, includeToday, noYearOptionStart);
    var endDate = getFullDate(end, includeToday, noYearOptionEnd);
    if (!moment(startDate, "DD.MM.YYYY").isValid() || !moment(endDate, "DD.MM.YYYY").isValid()) {
        throw new Error("Date not valid");
    }
    if (includeToday) {
        return checkPeriod(startDate, endDate) && moment(dayStart(currentDate())).isSameOrBefore(moment(startDate, "DD.MM.YYYY"));
    }
    return checkPeriod(startDate, endDate) && moment(dayStart(currentDate())).isBefore(moment(startDate, "DD.MM.YYYY"));
}

/*
Checks that period is in progress (start is in the past, end is in the future).
    Args:
        start (string): date in format DD.MM[.YY] (use dateToString() to convert
        from object {day: int, month: int, [year: int]})
        end (string): date in format DD.MM[.YY]
        includeToday (boolean): if today should be included in past and future. false by default.
        noYearOptionStart (string):  how to deal with start date without year. "current" by default:
            "current" - assign current year,
            "past" - assign this or previous year so that it is the closest to now in the past,
            "future" - assign this or next year so that it is the closest to now in future.
        noYearOptionEnd (string):  how to deal with end date without year
*/
function checkPeriodInProgress(start, end, includeToday, noYearOptionStart, noYearOptionEnd) {
    noYearOptionStart = noYearOptionStart || "current";
    noYearOptionEnd = noYearOptionEnd || noYearOptionStart;
    includeToday = includeToday || false;
    var startDate = getFullDate(start, includeToday, noYearOptionStart);
    var endDate = getFullDate(end, includeToday, noYearOptionEnd);
    if (!moment(startDate, "DD.MM.YYYY").isValid() || !moment(endDate, "DD.MM.YYYY").isValid()) {
        throw new Error("Date not valid");
    }
    if (includeToday) {
        var endIsAfter = moment(dayStart(currentDate())).isSameOrBefore(moment(endDate, "DD.MM.YYYY"));
        var startIsBefore = moment(dayStart(currentDate())).isSameOrAfter(moment(startDate, "DD.MM.YYYY"));
    } else {
        var endIsAfter = moment(dayStart(currentDate())).isBefore(moment(endDate, "DD.MM.YYYY"));
        var startIsBefore = moment(dayStart(currentDate())).isAfter(moment(startDate, "DD.MM.YYYY"));
    }
    return startIsBefore && endIsAfter;
}

// converts date object {day: int, [month: int, [year: int]]} into string day[.month[.year]]
// [] - optional part
function dateToString(dateObject) {
    if (typeof (dateObject) === "string") {
        return dateObject;
    }
    var dateString = String(dateObject.day);
    if (dateObject.month) {
        dateString += "." + dateObject.month;
        if (dateObject.year) {
            dateString += "." + dateObject.year;
        }
    }
    return dateString;
}

/*
Get year for a date without year.
Args:
    includeToday (boolean): if today should be included in past or future. false by default.
    noYearOption (string): defines how to assign year. "current" by default.
        "current" - assign current year,
        "past" - assign this or previous year so that it is the closest to now in the past,
        "future" - assign this or next year so that it is the closest to now in future.
*/
function getYear(date, includeToday, noYearOption) {
    includeToday = includeToday || false;
    noYearOption = noYearOption || "current";
    var thisYear = currentDate().year();
    if (noYearOption === "current") {
        return thisYear;
    }
    if (noYearOption === "past") {
        if (checkDateInPast(date + "." + thisYear, includeToday)) {
            return thisYear;
        }
        return thisYear - 1;
    }
    if (noYearOption === "future") {
        if (checkDateInFuture(date + "." + thisYear, includeToday)) {
            return thisYear;
        }
        return thisYear + 1;
    }
    throw new Error("noYearOption not valid: " + noYearOption);
}

/*
Get month and year for a day only date.
Args:
    includeToday (boolean): if today should be included in past or future. false by default.
    noMonthOption (string): defines how to assign month. "current" by default.
        "current" - assign current month,
        "past" - assign this or previous month so that it is the closest to now in the past,
        "future" - assign this or next month so that it is the closest to now in future.
*/
function getMonthAndYear(date, includeToday, noMonthOption) {
    includeToday = includeToday || false;
    noMonthOption = noMonthOption || "current";
    var newDate = moment({
        day: date,
        month: currentDate().month(),
        year: currentDate().year()
    });
    if (noMonthOption === "current") {
        return newDate.format("DD.MM.YYYY");
    }
    if (noMonthOption === "past") {
        if (checkDateInPast(newDate.format("DD.MM.YYYY"), includeToday)) {
            return newDate.format("DD.MM.YYYY");
        }
        return newDate.subtract(1, "months").format("DD.MM.YYYY");
    }
    if (noMonthOption === "future") {
        if (checkDateInFuture(newDate.format("DD.MM.YYYY"), includeToday)) {
            return newDate.format("DD.MM.YYYY");
        }
        return newDate.add(1, "months").format("DD.MM.YYYY");
    }
    throw new Error("noMonthOption not valid: " + noMonthOption);
}

/*
Check that the date is full (has day, month and year), and fill in missing slots if necessary.
Args:
    includeToday (boolean): if today should be included in past or future. false by default.
    noMonthOption (string): defines how to assign month. "current" by default.
        "current" - assign current month,
        "past" - assign this or previous month so that it is the closest to now in the past,
        "future" - assign this or next month so that it is the closest to now in future.
*/
function getFullDate(date, includeToday, noYearOption) {
    includeToday = includeToday || false;
    noYearOption = noYearOption || "current";
    if (date.split(".").length === 2) {
        return date + "." + getYear(date, includeToday, noYearOption);
    }
    if (date.split(".").length === 1) {
        return getMonthAndYear(date, includeToday, noYearOption);
    }
    return date;
}

// функции для работы с датами, общие в нескольких проектах

// установка тестовой даты
function setTestDate(parseTree) {
    var dateTime = parseTree.text.split(" ");
    $.session.testDate = moment(dateTime[1], "DD-MM-YYYY");
    $.session.testTime = dateTime[2].split(":")[0];
}

// получение даты из паттерна
function getDate($parseTree) {
    $.session.timezone = $.session.timezone || "Europe/Moscow";
    var dateValue;
    var currentDate = moment($jsapi.dateForZone($.session.timezone, "yyyy-MM-dd"));
    if ($parseTree._dateUnknown) {
        return "unavailable";
    }
    if ($parseTree["duckling.time"]
        && $parseTree["duckling.time"][0]
        && $parseTree["duckling.time"][0].value
        && $parseTree["duckling.time"][0].value.value) {
            dateValue = moment($parseTree["duckling.time"][0].value.value);
        // duckling определяет время по UTC, поэтому для "сегодня" нужна отдельная проверка дня
        if ($parseTree.text.indexOf("сегодня") > -1 && !dateValue.isSame(currentDate, "day")) {
            dateValue = dateValue.add(1, "days");
        }
    } else if ($parseTree._DateDayNumberLocal) {
        dateValue = moment({
            day: $parseTree._DateDayNumberLocal,
            // месяц минус один, потому что месяца индексируются с нуля
            month: parseInt($jsapi.dateForZone($.session.timezone, "MM"), 10) - 1,
            year: parseInt($jsapi.dateForZone($.session.timezone, "yyyy"), 10)
        });
        if ($parseTree._DateDayNumberLocal < parseInt($jsapi.dateForZone($.session.timezone, "dd"), 10)) {
            dateValue = dateValue.add(1, "months");
        }
    }
    return dateValue;
}

function getTimezoneInHours() {
    $.session.timezone = $.session.timezone || "Europe/Moscow";
    try {
        return parseInt($jsapi.dateForZone($.session.timezone, "Z").slice(0, 3));
    } catch (e) {
        log("NO TIMEZONE");
        // возвращаем тамйзону Москвы
        return 3;
    }
}

// проверка на возможность самовывоза сегодня
function todayIsOkay() {
    $.session.timezone = $.session.timezone || "Europe/Moscow";
    var currentTime = $jsapi.dateForZone($.session.timezone, "HH");
    if ($.request.channelType === "chatwidget" && $.session.testDate && $.session.testTime) {
        currentTime = $.session.testTime;
    }
    return currentTime < $.injector.storeTodayHour;
}

// проверка даты самовывоза на соответствие периоду самовывоза
function storeDateInRange(date, days) {
    $.session.timezone = $.session.timezone || "Europe/Moscow";
    var currentDate = moment($jsapi.dateForZone($.session.timezone, "yyyy-MM-dd"));
    if ($.request.channelType === "chatwidget" && $.session.testDate) {
        currentDate = moment($.session.testDate);
    }
    if (todayIsOkay()) {
        return date.diff(currentDate, "days") < days;
    }
    return date.diff(currentDate, "days") < days + 1;
}

function tommorowIsWeekday() {
    $.session.timezone = $.session.timezone || "Europe/Moscow";
    var currentDate = $jsapi.dateForZone($.session.timezone, "yyyy-MM-dd");
    if ($.request.channelType === "chatwidget" && $.session.testDate) {
        currentDate = $.session.testDate;
    }
    var tomorrow = moment(currentDate).add(1, "days");
    return (tomorrow.isoWeekday() !== 6 && tomorrow.isoWeekday() !== 7);
}

function checkDateDeadline(dateValue) {
    var dateValidation = "";
    var deadline = $session.currentCampaign.data.expirationDate || "31.12.2025";
    var announcedDate = moment(dateValue).format("DD.MM.YYYY");
    if (announcedDate !== "Invalid date" && !checkDateInPast(announcedDate)) {
        if (moment(announcedDate, "DD.MM.YYYY").isSameOrBefore(moment(deadline, "DD.MM.YYYY"))) {
            dateValidation = "valid";
        } else {
            dateValidation = "late";
        }
    } else {
        dateValidation = "invalid";
    }
    return dateValidation;
}
