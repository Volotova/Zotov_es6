require: ./common.sc
require: number/numberConverter.js
    module = sys.zb-common

patterns:
    # паттерн из zb-common
    $DateDayOrderNumber = (
        #(в [самом] начале|в [самых] первых числах):1 |
        (десятое/десятого):10 | 
        (одиннадцатое/одиннадцатого):11 | 
        (двенадцатое/двенадцатого):12 | 
        (тринадцатое/тринадцатого):13 | 
        (четырнадцатое/четырнадцатого):14 |
        (в середине):15 | 
        (пятнадцатое/пятнадцатого):15 | 
        (шестнадцатое/шестнадцатого):16 | 
        (семнадцатое/семнадцатого):17 | 
        (восемнадцатое/восемнадцатого):18 | 
        (девятнадцатое/девятнадцатого):19 |
        (в конце):28 ) ||  converter = $converters.numberConverterValue

    # паттерн из zb-common
    $DateRelativeDay = (
        [$DateFuturePastModifier] [недел*] [в/во/на] $DateWeekday |
        [в/во] $DateWeekday [$DateFuturePastModifier] |
        $DateFuturePastModifier (дня/дней/днем/день/сутки/суток) |
        через [одни] сутки:1 |
        сегодн*:0 |
        (вчера*:-1/позавчера*:-2/(поза позавчера*/позапозавчера*):-3/завтра*:1/(послезавтра*/после завтра*):2/(послепослезавтра*/после послезавтра*/после после завтра*):3) |
        [$Number] (дня/дней/день) [тому] назад:-1
        ) ||  converter = $converters.relativeDayConverter

    # создан для правильного распознавания дат рождения
    $dateWithYear  =  (
        [$DateWeekday] ($DateDayNumber::DateDayNumeric/$DateDayOrderNumber::DateDayNumeric) [числа] {($DateMonth) [месяц*]} [в] $DateYearNumber::DateYearNumeric [год*] |
        {($DateDayNumber::DateDayNumeric [числа] $DateMonth [месяц*] ($DateYearTwoNumber::DateYearNumeric год* /($DateDayDigit)($DateMonth)/ $DateYearNumber::DateYearNumeric [года] / $DateYearNumeric [год*])) [[в/во] $DateWeekday]} |       
        [это* [день]] $DateDayNumber::DateDayNumeric [число] $DateMonth [месяц*] ($DateYearNumber::DateYearNumeric [года] / $DateYearNumeric [год*] / $DateYearTwoNumber::DateYearNumeric год*) | 
        $DateDayNumber::DateDayNumeric [числа] $DateMonth [месяц*] [в] $DateRelativeYear |
        $DateDigits
        ) ||  converter = $converters.absoluteDateConverterNew

    # паттерн из zb-common (нет в zfl-common)
    $DateDigits = $regexp<((0)? ?\d|\d+)((\.|\/|\s)((0)? ?[0-9]|1[0-2]))((\.|\/|\s)((1|2)\d\d\d|\d\d))>[г]

    # паттерн из zb-common
    $DateAbsolute =  (
        [$DateWeekday] ($DateDayNumber::DateDayNumeric/$DateDayOrderNumber::DateDayNumeric) [числа] {($DateMonth) [месяц*]} [ [в] $DateYearNumber::DateYearNumeric [год*]] |
        {($DateDayNumber::DateDayNumeric [числа] $DateMonth [месяц*] [ $DateYearTwoNumber::DateYearNumeric год* /($DateDayDigit)($DateMonth)/ $DateYearNumber::DateYearNumeric [года] / $DateYearNumeric [год*] ]) [[в/во] $DateWeekday]} |
        [в/во] $DateWeekday $DateDayNumber::DateDayNumeric [числа/число] |
        [[в/во] $DateWeekday] $DateDayNumber::DateDayNumeric (числа/число) |
        [[в/во] $DateWeekday] $DateDayOrderNumber::DateDayNumeric [числа/число] |        
        [это* [день]] $DateDayNumber::DateDayNumeric [число] $DateMonth [месяц*] [ $DateYearNumber::DateYearNumeric [года] / $DateYearNumeric [год*] / $DateYearTwoNumber::DateYearNumeric год* ] | 
        $DateWeekday $DateDayNumber::DateDayNumeric |
        $DateRelativeYear $DateDayNumber::DateDayNumeric [числа] $DateMonth [месяц*] |
        $DateDayNumber::DateDayNumeric [числа] $DateMonth [месяц*] [в] $DateRelativeYear |
        $DateDayNumber::DateDayNumeric [числа] $DateRelativeMonth [месяц*] |
        [на] $DateRelative |
        ($DateYearNumber::DateYearNumeric / $Number::DateYearNumeric) год* |
        $DateHoliday/$DateDayAndMonthDigit
        ) ||  converter = $converters.absoluteDateConverter

    # добавлен месяц цифрами
    $DateMonthLocal = (
        (~январь/январ*/янв/january/jan/[ноль] ~первый):1 |
        (~февраль/феврал*/фев/february/feb/[ноль] ~второй):2 |
        (~март/март*/march/mar/[ноль] ~третий):3 |
        (~апрель/апрел*/апр/april/apr/[ноль] ~четвертый):4 |
        (~май/май/мая/мае/may/[ноль] ~пятый):5 |
        (~июнь/июнь/июня/июне/june/jun/[ноль] ~шестой):6 |
        (~июль/июль/июля/июле/july/jul/[ноль] ~седьмой):7 |
        (~август/август*/august/aug/[ноль] ~восьмой):8 |
        (~сентябрь/сентябр*/сент/september/sep/[ноль] ~девятый):9 |
        (~октябрь/октябр*/окт/october/oct/~десятый):10 |
        (~ноябрь/ноябр*/november/nov/~одиннадцатый):11 |
        (~декабрь/декабр*/december/dec/~двенадцатый):12 ) ||  converter = $converters.numberConverterValue

    # переопределяем для четверт*|четвёрт*
    $NumberOneDigitLocal = (
        (нол*/нул*/zero):0 | 
        (~один/~одна/перв*/единиц*/единичк*/однерка/однёрка/one/first):1 | 
        (~два/дву*/две/втор*/пара/пару/парочк*/двое/~двойка/~двоечка/two/[a] couple of/second):2 | 
        (~три/трет*/трех/трое/three/~тройка/~троечка/~трешечка/third):3 | 
        (~четыре/четверт*/четвёрт*/четырех/четверо/~четверка/~четверочка/*four/fourth):4 | 
        (~пять/пята*/пято*/пятый/пятым*/пяти/пятер*/five/fifth):5 | 
        (~шесть/шест*/шестым*/шести/шестер*/six/sixth):6 | 
        (~семь/седьм*/семи/семер*/seven/seventh):7 | 
        (~восемь/восьм*/восем/eight*):8 | 
        (~девять/~девятка/девят*/~девятый/~девяточка/nine/ninth):9 )
            || converter = $converters.numberConverterValue
            
    $NumberOneForDayDigitLocal = (
        (~один/~одна/перв*/единиц*/единичк*/однерка/однёрка/one/first):1 | 
        (~два/дву*/две/втор*/пара/пару/двое/~двойка/~двоечка/two/[a] couple of/second):2 | 
        (~три/трет*/трех/трое/three/~тройка/~троечка/~трешечка/third):3 | 
        (~четыре/четверт*/четвёрт*/четырех/четверо/~четверка/~четверочка/*four/fourth):4 | 
        (~пять/пята*/пято*/пятый/пятым*/пяти/пятер*/five/fifth):5 | 
        (~шесть/шест*/шестым*/шести/шестер*/six/sixth):6 | 
        (~семь/седьм*/семи/семер*/seven/seventh):7 | 
        (~восемь/восьм*/восем/eight*):8 | 
        (~девять/~девятка/девят*/~девятый/~девяточка/nine/ninth):9 )
            || converter = $converters.numberConverterValue

    # переопределяем для семьдесят, восемьдесят
    $NumberDozenLocal = (
        (~двадцать/двадцатый/двадцатое/двадцат*/twenty/twentieth):20 | 
        (~тридцать/тридцатый/тридцатое/тридцат*/thirty/thirtieth):30 | 
        (~сорок/сороковой/сороковое/сорок*/forty/fortieth):40 | 
        (~пятьдесят/пятидесятый/пятидесятое/пятидесят*/fifty*/fiftieth):50 | 
        (~шестьдесят/шестидесятый/шестидесятое/шестидесят*/шисят/sixty/sixtieth):60 | 
        (семьдесят*/семидесятый/семидесятое/семидесят*/seventy/seventieth):70 | 
        (восемьдесят*/восьмидесятый/восьмидесят*/eighty/eightieth):80 | 
        (~девяносто/девяностый/девяностое/девяност*/ninety/ninetieth):90 ) || converter = $converters.numberConverterValue

    # все ниже - протягивание переопределения чисел
    $NumberThreeDigitLocal = (
        $NumberHundredComplex [and] [[[$AnyWord] $NumberDozenLocal] [[$AnyWord] $NumberSimpleLocal]| [$AnyWord] $NumberDozenWithDash] |
        $NumberHundred [and] [[[$AnyWord] $NumberTwoDigit]/[[$AnyWord] $NumberDozenLocal] [[$AnyWord] $NumberSimpleLocal]/$NumberDozenWithDash] |
        $NumberDozenLocal [$NumberSimpleLocal] |
        $NumberDozenWithDash |
        $NumberSimpleLocal 
        ) || converter = $converters.numberConverterSum

    $NumberLocal = (
        $NumberCommaSeparated |
        $NumberBillions [and/и] [$NumberMillions] [and/и] [$NumberThousands] [and/и] [$NumberThreeDigitLocal] |
        $NumberMillions [and/и] [$NumberThousands] [and/и] [$NumberThreeDigitLocal] |
        $NumberThousands [and/и] [$NumberThreeDigitLocal] |
        $NumberThreeDigitLocal |
        $NumberTwoDigit |
        $NumberThreeDigitLocal [and/и] $NumberTwoDigit |
        (полторы/полтора/полутора)
        ) || converter = $converters.numberConverterSum

    $NumberNumericLocal = ($NumberOneDigitLocal / $NumberTwoDigit) || converter = $converters.propagateConverter
    
    $NumberNumericForDayLocal = ($NumberOneForDayDigitLocal / $NumberTwoDigit) || converter = $converters.propagateConverter

    $NumberSimpleLocal = ($NumberDigit / $NumberOrdinalDigit | $NumberNumericLocal)

    $DateDayNumberLocal = ( $NumberDozenLocal [$NumberOrdinalDigit / $NumberNumericLocal] | ($NumberOrdinalDigit | $NumberNumericForDayLocal) | $DateDayDigit) ||  converter = $converters.numberConverterSum

    $DateLocal = {($DateDayNumberLocal::DateDayNumeric [числа] $DateMonthLocal::DateMonth [месяц*] [$DateYearTwoNumber::DateYearNumeric год*/($DateDayDigit)($DateMonthLocal::DateMonth)/$DateYearNumber::DateYearNumeric [года]/$DateYearNumericLocal::DateYearNumeric [год*] $weight<+0.2>]) [[в/во] $DateWeekday]} || converter = $converters.absoluteDateConverter

    $2NumberThousands = (двухтысяч*/дветыс*/(две/двух) тыс*):2000
    
    $YearThousandSimpleLocal = (
        ~один:1000 |
        ~два:2000 )
    
    $YearHundredSimpleLocal = (
        (нол*|нул*|zero):0 |
        (~один|~одна|перв*|единиц*|единичк*|однерка|однёрка|one|first):100 |
        (~два|дву*|две|втор*|пара|пару|двое|~двойка|~двоечка|two|[a] couple of|second):200 |
        (~три|трет*|трех|трое|three|~тройка|~троечка|~трешечка|third):300 |
        (~четыре|четверт*|четвёрт*|четырех|четверо|~четверка|~четверочка|*four|fourth):400 |
        (~пять|пята*|пято*|пятый|пятым*|пяти|пятер*|five|fifth):500 |
        (~шесть|шест*|шестым*|шести|шестер*|six|sixth):600 |
        (~семь|седьм*|семи|семер*|seven|seventh):700 |
        (~восемь|восьм*|восем|eight*):800 |
        (~девять|~девятка|девят*|девятый|~девяточка|nine|ninth):900 )
            || converter = $converters.numberConverterValue
            
    $YearDozenSimpleLocal = (
        (нол*|нул*|zero):0 |
        (~один|~одна|перв*|единиц*|единичк*|однерка|однёрка|one|first):10 |
        (~два|дву*|две|втор*|пара|пару|двое|~двойка|~двоечка|two|[a] couple of|second):20 |
        (~три|трет*|трех|трое|three|~тройка|~троечка|~трешечка|third):30 |
        (~четыре|четверт*|четвёрт*|четырех|четверо|~четверка|~четверочка|*four|fourth):40 |
        (~пять|пята*|пято*|пятый|пятым*|пяти|пятер*|five|fifth):50 |
        (~шесть|шест*|шестым*|шести|шестер*|six|sixth):60 |
        (~семь|седьм*|семи|семер*|seven|seventh):70 |
        (~восемь|восьм*|восем|eight*):80 |
        (~девять|~девятка|девят*|девятый|~девяточка|nine|ninth):90 )
            || converter = $converters.numberConverterValue
    
    $YearSimpleLocal = ($YearThousandSimpleLocal $YearHundredSimpleLocal $YearDozenSimpleLocal $NumberSimpleLocal) ||  converter = $converters.numberConverterSum

    $DateYearNumeric = ([($NumberThousands/$2NumberThousands) [$AnyWord]] $NumberThreeDigitLocal/$2NumberThousands/$YearSimpleLocal) ||  converter = $converters.numberConverterSum

    $1NumberThousand = [~один] (тысяч*/тыщ*/тыс/к/т/thousand*):1000 || converter = $converters.numberConverterMultiply
    
    $DateFutureLocal = {($DateDayNumberLocal::DateDayNumeric [числа] $DateMonthLocal::DateMonth [месяц*] [$DateYearTwoNumber::DateYearNumeric год*/($DateDayDigit)($DateMonthLocal::DateMonth)/$DateYearNumber::DateYearNumeric [года]/$DateYearNumericFutureLocal::DateYearNumeric [год*] $weight<+0.2>]) [[в/во] $DateWeekday]} || converter = $converters.absoluteDateConverter

    $DateYearNumericLocal = ([($1NumberThousand/$2NumberThousands) [$AnyWord]] $NumberThreeDigitLocal | $2NumberThousands) ||  converter = $converters.numberConverterSum
    
    $DateYearNumericFutureLocal = ([$3NumberThousands [$AnyWord]] $NumberThreeDigitLocal | $3NumberThousands) ||  converter = $converters.numberConverterSum

    $3NumberThousands = (трехтысяч*/тритысяч*/(три/трех) тыс*):3000

init:
    $global.$converters.absoluteDateConverterNew = function(parseTree) {
        var date = {};
        date.day = safeValue(parseTree.DateDayNumeric);
        date.month = safeValue(parseTree.DateMonth);
        if (parseTree.DateYearNumeric) {
            date.year = safeValue(parseTree.DateYearNumeric);
        }
        if (parseTree.DateYearNumericOne) {
            date.year = safeValue(parseTree.DateYearNumericOne);
        }
        date.weekDay = safeValue(parseTree.DateWeekday);
        date.weekDayOrder = safeValue(parseTree.WeekDayOrder);
        date.years = safeValue(parseTree.DateRelativeYear);
        date.months = safeValue(parseTree.DateRelativeMonth);

        if (parseTree.DateWeekdayOrder) {
            date = parseTree.DateWeekdayOrder[0].value;
        }

        if (parseTree.DateRelativeNew) {
            date = parseTree.DateRelativeNew[0].value;
            if (parseTree.DateWeekday) {
                date.weekDay = parseTree.DateWeekday[0].value;
            }
        }

        if (parseTree.Date) {
            date = parseTree.Date[0].value;
        }

        if (parseTree.DateHoliday) {
            var month;
            var weekday;
            var order;
            switch (parseTree.DateHoliday[0].value) {
                case "1":
                    date = {
                        "day": 25,
                        "month": 12
                    };
                    break;
                case "2":
                    date = {
                        "day": 1,
                        "month": 1
                    };
                    break;
                case "3":
                    date = {
                        "day": 31,
                        "month": 10
                    };
                    break;
                case "4":
                    date = {
                        "day": 4,
                        "month": 7
                    };
                    break;
                case "5":
                    date = {
                        "day": 14,
                        "month": 2
                    };
                    break;
                case "6":
                    date = {
                        "day": 17,
                        "month": 3
                    };
                    break;
                case "7":
                    // calculate the last Thursday of November
                    weekday = 4;
                    order = 4;
                    month = 11;
                    break;
                case "8":
                    // calculate the 2nd Sunday of May
                    weekday = 7;
                    order = 2;
                    month = 5;
                    break;
                case "9":
                    // calculate the 3rd Sunday of June
                    weekday = 7;
                    order = 3;
                    month = 6;
                    break;
                case "10":
                    // calculate the 1st Sunday of February
                    weekday = 7;
                    order = 1;
                    month = 2;
                    break;
                default:
                    break;
            }

            if (parseTree.DateHoliday[0].value >= 7) {
                if (typeof parseTree.DateYearNumber !== "undefined") {
                    year = parseTree.DateYearNumber[0].value;
                } else if (typeof parseTree.DateRelativeYear !== "undefined") {
                    year = currentDate().add(parseTree.DateRelativeYear[0].value, "years").year();
                } else {
                    year = currentDate().year();
                }

                date = calculateDateWeekdayOrder(year, month, weekday, order);
                if (typeof parseTree.DateYearNumber === "undefined"
                    && typeof parseTree.DateRelativeYear === "undefined") {
                    date.calculated = {
                        year: year,
                        month: month,
                        weekday: weekday,
                        order: order
                    };
                }
            }
        }

        if (parseTree.DateWeekdayOrder) {
            date = parseTree.DateWeekdayOrder[0].value;
        }
        if (parseTree.DateDigits) {
            // date = parseTree.DateDayAndMonthDigit[0].value;
            var parts;

            var repl = parseTree.DateDigits[0].text.replace(/(0) ([1-9])/gmi, "$1$2");

            parts = repl.split(/[\.\/\s]/g);

            var d = parseInt(parts[0], 10);
            var m = parseInt(parts[1], 10);
            var y;
            if (parts.length === 3) {
                y = parts[2];
                if (y.length < 4) {
                    y = parseInt(y, 10);
                    y = (y >= 50) ? 1900 + y : 2000 + y;
                } else {
                    y = parseInt(y, 10);
                }
            }
            date = {
                year: y,
                month: m,
                day: d
            };
        }

        return date;
    };
