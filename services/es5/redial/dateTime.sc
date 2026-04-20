require: moment.min.js
require: moment-business.js
require: dateTimeConverter.js
require: dateTime.js

patterns:

    $Season = ((~зима/~зимний): 0|(~весна/~весенний): 1|(~лето/~летний): 2|(~осень/осенний): 3)

    $Weekend = [и] [в] (выходн*|уикенд*|викенд*|уикэнд*|викэнд*|(нерабоч*|не [в] рабоч*|выходн*) ~день)

    $TimeHhMmSs = $regexp<((0)?\d|1\d|2(0|1|2|3|4))(:|\.|-)((0|1|2|3|4|5)\d)((:|\.|-)((0|1|2|3|4|5)\d))?> ||  converter = $converters.timeConverterHhMmSs

    $TimeHhMmWithoutSeparator = $regexp<((0)?\d|1\d|2(0|1|2|3|4))(0|1|2|3|4|5)\d> ||  converter = $converters.timeConverterHhMmWithoutSeparator

    $TimeHourDigit = $regexp<((0)?\d|1\d|2(0|1|2|3|4))> ||  converter = $converters.numberConverterDigit

    $NumberTwoDigitTime = (
        $NumberTwoDigit |
        (двадцат*|twenty):20 |
        (двадцат* ~один|twenty one):21 |
        (двадцат* ~два|twenty two):22 |
        (двадцат* ~три|twenty three):23) || converter = function(pt) {return pt.NumberTwoDigit ? pt.NumberTwoDigit[0].value : parseInt(pt.value);};
    $TimeHourNumber = ( $NumberDozen [$NumberOrdinalDigit | $NumberOneDigit] | $NumberOrdinalDigit | $NumberOneDigit | $NumberTwoDigitTime | $TimeHourDigit) ||  converter = $converters.numberConverterSum;

    $TimeMinuteDigit = $regexp<(0|1|2|3|4|5)?\d> ||  converter = $converters.numberConverterDigit

    $TimeMinuteNumber = ( $NumberDozen [$TimeMinuteDigit|$NumberOneDigit] | $TimeMinuteDigit | $NumberTwoDigit | ноль [$NumberOneDigit] ) ||  converter = $converters.numberConverterSum

    $DateDayDigit = $regexp<\d+(-(е|го|его|ого))?> ||  converter = $converters.numberConverterDigit

    $DateDayAndMonthDigit = $regexp<\d+((\.|\/|,|\\)((0)?(1|2|3|4|5|6|7|8|9)|1(0|1|2)))(\.|\/|,|\\)?((1|2)?\d?\d\d)?>[г] || converter = $converters.timeConverterDateMonth

    $DateDayNumber = ( $DateDayOrderNumber | $DateDayDigit | $NumberDigit ) ||  converter = $converters.numberConverterSum

    $DateDayOrderNumber = ( $DateDayOrderTwoDigit | [$NumberDozen] $DateDayOrderOneDigit ) ||  converter = $converters.numberConverterSum

    $DateDayOrderTwoDigit = (
        (десятое|десятого):10 |
        (одиннадцатое|одиннадцатого):11 |
        (двенадцатое|двенадцатого):12 |
        (тринадцатое|тринадцатого):13 |
        (четырнадцатое|четырнадцатого):14 |
        (пятнадцатое|пятнадцатого):15 |
        (шестнадцатое|шестнадцатого):16 |
        (семнадцатое|семнадцатого):17 |
        (восемнадцатое|восемнадцатого):18 |
        (девятнадцатое|девятнадцатого):19
        (двадцатое|двадцатого):20
        (тридцатое|тридцатого):30 ) ||  converter = $converters.numberConverterValue

    $DateDayOrderOneDigit = (
        (первое|первого):1 |
        (второе|второго):2 |
        (третье|третьего):3 |
        (четвертое|четвертого):4 |
        (пятое|пятого):5 |
        (шестое|шестого):6 |
        (седьмое|седьмого):7 |
        (восьмое|восьмого):8 |
        (девятое|девятого):9 ) || converter = $converters.numberConverterValue

    $TimeHhMm = $TimeHourNumber $TimeMinuteNumber ||  converter = $converters.timeConverterHhMm

    $TimeHoursModifier = (
        (утра|утро|утром|утречком): am |
        (дня|днем|вечера|вечер*|пополудни|после полудня): pm |
        (ночи|ночью): night) ||  converter = $converters.propagateConverter

    # TODO : add period modifier for час дня/час ночи
    $TimeHoursSpecial = (
        ~час: 1 |
        (полдень|полудн*): 12
        ) ||  converter = $converters.numberConverterValue

    $TimeSpecial = (([с|на] утр*/поутру/[в] {~утренний ~время}):am
        | ([в] ~первый ~половина дня):am
        | (до (обеда/~обеденный (~время/~перерыв))/[в] {(~дообеденный/до обеден*) ~время}):before_lunch
        | (днем/[в] {~дневной ~время}):afternoon
        | [пока $weight<-0.3>] ([в] обед/[во] время обеда/[в] {~обеденный (~время/~перерыв)}/{когда будет обед}):lunch
        | (после (обеда/~обеденный (~время/~перерыв))/{когда обед *кончится}/[в] {(~послеобеденный/после обеден*) ~время}):after_lunch
        | ([в] ~второй ~половина дня):pm
        | ([с|на] (вечер*/вечером)/[в] {~вечерний ~время}/после работы/(после/когда) {(оконч*/законч*) ({рабоч* ~день}/работа)}/от вас не работы):evening
        | ([с|на] (ночь*/ночи)/[в] {~ночной ~время}/ночью):night) || converter = $converters.timeSpecialConverter

    $NumberNumericTime = ($NumberOneDigit | $NumberTwoDigitTime) || converter = $converters.propagateConverter;
    $TimeHoursNumeric = (
        $TimeHoursModifier [в|на] ($NumberNumericTime::Number|$TimeHourDigit::Number) [час*] |
        {($NumberNumericTime::Number|$TimeHourDigit::Number) [в] ([час*] $TimeHoursModifier| (час|часа|часов|часиков) [$TimeHoursModifier])} |
        $TimeHoursSpecial [$TimeHoursModifier] |
        $TimeSpecial
        ) ||  converter = $converters.timeHoursConverter

    $TimeMinutesModifier = (
        без $Number [минут] |
        без четверти:15 |
        [в] четверть:45
        ) ||  converter = $converters.numberConverterSum

    $TimeRelativeHoursHalf = (
        $Number с половин* час* |
        $Number час* с половин* ) ||  converter = $converters.timeRelativeHoursConverter
    $TimeRelativeMinutesHalf = (
        $Number с половин* (минуты|минут|минуточек|минуточки) |
        $Number (минуты|минут|минуточек|минуточки) с половин* ) ||  converter = $converters.timeRelativeMinutesConverter

    $TimeRelativeHours = ( [один] (час|часик|часок) :1 | $Number час* ) ||  converter = $converters.numberConverterSum
    $TimeRelativeMinutes = (
        [одну] (минутy/минутку) :1 |
        [одна] ~минута:1 |
        четверт* часа:15 |
        (полчас*|пол (часа|часика)):30 |
        (полтора час*):90 |
        ($Number|$TimeMinuteDigit) (минуты|минут|минуточек|минуточки|минуту)
        ) ||  converter = $converters.numberConverterSum

    $TimeRelativeSeconds = (
        [одну] секунд* :1 |
        (полминут*|пол минут*):30 |
        $Number секунд*
        ) ||  converter = $converters.numberConverterSum

    $TimeRelative = (
        через $TimeRelativeHours [и] [$TimeRelativeMinutes] |
        (через|на) $TimeRelativeMinutes |
        через ($TimeHourNumber::TimeRelativeHours|$TimeRelativeHours) $TimeMinuteNumber::TimeRelativeMinutes |
        {час* через} $Number::TimeRelativeHours |
        {минут* через} $Number::TimeRelativeMinutes |
        $TimeRelativeHoursHalf |
        $TimeRelativeMinutesHalf
        ) ||  converter = $converters.relativeDateTimeConverter

    $TimeHalfAnHourSpecial = (
        (полпервого | (пол|половин*) (первого|1)): 1 |
        (полвторого | (пол|половин*) (второго|2)): 2 |
        (полтретьего | (пол|половин*) (третьего|3)): 3 |
        (полчетвёртого | (пол|половин*) (четвёртого|4)): 4 |
        (полпятого | (пол|половин*) (пятого|5)): 5 |
        (полшестого | (пол|половин*) (шестого|6)): 6 |
        (полседьмого | (пол|половин*) (седьмого|7)): 7 |
        (полвосьмого | (пол|половин*) (восьмого|8)): 8 |
        (полдевятого | (пол|половин*) (девятого|9)): 9 |
        (полдесятого | (пол|половин*) (десятого|10)): 10 |
        (полодинадцатого | (пол|половин*) (одинадцатого|11)): 11 |
        (полдвенадцатого | (пол|половин*) (двенадцатого|12)): 12
        ) ||  converter = $converters.timeHalfAnHourConverter

    $TimeMinutesAndHours = [в] ($NumberOneDigit|$TimeMinuteNumber) (мин|минут*) ||  converter = $converters.propagateConverter

    $TimeMinutesNumeric = ([в] $TimeMinuteNumber| и $NumberOneDigit) [мин|минут*] ||  converter = $converters.propagateConverter
    $TimeSecondsNumeric = $Number [сек|секунд*] ||  converter = $converters.propagateConverter
    $TimeAbsolute = [в/на] (
        $TimeHhMmSs::Time |
        (на|в) $TimeHhMmWithoutSeparator::Time [$TimeHoursModifier] |
        [на|в] $TimeHhMmWithoutSeparator::Time $TimeHoursModifier |
        $TimeHalfAnHourSpecial::Time [$TimeHoursModifier] |
        [на|в] ($TimeHourNumber::TimeHoursNumeric|$TimeHourDigit::TimeHoursNumeric) [$TimeHoursModifier|(раз/раза/день/дня/дней) $weight<-0.5>] |
        [на|в] $TimeHourNumber::TimeHoursNumeric [ноль|00] $TimeMinutesNumeric [$TimeHoursModifier] |
        $TimeMinutesModifier ($Number::TimeHoursNumeric | $TimeHoursNumeric) |
        $TimeHoursSpecial::TimeHoursNumeric [$TimeMinuteNumber::TimeMinutesNumeric] |
        [на|в] ($TimeHourNumber::TimeHoursNumeric [час*|часа|часов] [и] $TimeMinutesNumeric) [$TimeHoursModifier] |
        [[на] $TimeHoursModifier] [на|в] ($TimeHourNumber::TimeHoursNumeric [час*|часа|часов] [и] $TimeMinutesNumeric) |
        $TimeHoursNumeric |
        [на] $TimeMinutesAndHours ($Number::TimeHoursNumeric | $TimeHoursNumeric) |
        $TimeRelative
        ) ||  converter = $converters.absoluteTimeConverter

    # Converts any date representation into absolute Date value
    $DateMonth = (
        (~январь|январ*|янв|january|jan):1 |
        (~февраль|феврал*|фев|february|feb):2 |
        (~март|март*|мар|march|mar):3 |
        (~апрель|апрел*|апр|april|apr):4 |
        (~май|май|мая|мае|may):5 |
        (~июнь|июнь|июня|июне|июн|june|jun):6 |
        (~июль|июль|июля|июле|июл|july|jul):7 |
        (~август|август*|авг|august|aug):8 |
        (~сентябрь|сентябр*|сент|сен|september|sep):9 |
        (~октябрь|октябр*|окт|october|oct):10 |
        (~ноябрь|ноябр*|ноя|нояб|november|nov):11 |
        (~декабрь|декабр*|дек|december|dec):12 ) ||  converter = $converters.numberConverterValue

    $DateWeekday = (
        ~понедельник:1 | ~вторник:2 | ~среда:3 | ~четверг:4 | ~пятница:5 | (~суббота|субот*|$Weekend):6 | (~воскресенье|воскресение):7
        ) ||  converter = $converters.numberConverterValue

    $DateFuturePastModifier = (
        (в (этом|эту|текущем) | этого | сего | текущего|ближайш* ):0 |
        (следующ*) :1 |
        прошл* :-1 |
        позапрошл* :-2 |
        через (~один|$Number):1
        ) ||  converter = $converters.numberConverterMultiply

    $DateRelativeDay = (
        [$DateFuturePastModifier] [недел*] [в|во|на] $DateWeekday |
        [в|во] $DateWeekday [$DateFuturePastModifier] |
        $DateFuturePastModifier (дня|дней|днем|день|сутки|суток) |
        через [одни] сутки:1 |
        сегодн*:0 |
        (вчера*:-1|позавчера*:-2|(поза позавчера*|позапозавчера*):-3|завтра*:1|(послезавтра*|после завтра*):2|(послепослезавтра*|после послезавтра*|после после завтра*):3) |
        [$Number] (дня|дней|день) [тому] назад:-1
        ) ||  converter = $converters.relativeDayConverter

    $DateRelativeMonth = (
        $DateFuturePastModifier месяц* |
        [$Number] месяц* назад:-1
        ) ||  converter = $converters.relativeMonthConverter

    $DateRelativeYear = (
        $DateFuturePastModifier год* |
        [$Number] (год*|лет) назад:-1
        ) ||  converter = $converters.relativeMonthConverter
        # relativeMonthConverter

    $DateRelative = (
        [$DateRelativeYear] [$DateRelativeMonth] $DateRelativeDay |
        [$DateRelativeYear] $DateRelativeMonth |
        $DateRelativeYear |
        $DateRelativeDay $DateRelativeMonth |
        $DateRelativeDay
        ) ||  converter = $converters.relativeDateConverter

    $DateYearTwoNumber = $regexp<\d\d> ||  converter = $converters.numberConverterDigit
    $DateYearNumber = $regexp<(1|2)\d\d\d(г)?> ||  converter = $converters.numberConverterDigit
    $DateYearNumeric = $NumberThousands $NumberThreeDigit ||  converter = $converters.numberConverterSum

    $DateHoliday = (
        ({~рождество [христов*/православн*]}): 0 |
        ({католич* ~рождество}): 1 |
        (~новый ~год): 2 |
        (~хеллоуин|~хелоуин|~хэллоуин|~хэлоуин): 3 |
        (~день независимост* [сша/соединен* штат* [америк*]]): 4 |
        (~день (свят* валентин*/[~все] влюблен*)): 5 |
        (~день свят* патрик*): 6 |
        (~день защитник* отечеств*): 7 |
        ([международн*] женск* ~день): 8 |
        (~день ({весн* * [труд*]}/{труд* * [весн*]})): 9 |
        (~день ~победа): 10 |
        (~день (~россия/рф/российск* федераци*)): 11 |
        (~день народн* единств*): 12 |
        ({~день татьян*}/[международн*] ~день студент*): 13 |
        (~день (смех*/дурак*)): 14 |
        (~день космонавт*): 15 |
        (~день славянск* ({письм* * [культур*]}/{культур* * [письм*]})): 16 |
        ([международн*] ~день защит* дет*): 17 |
        (~день ~семья [{~любовь * [~верность]}/{~верность * [~любовь]}]): 18 |
        (~день [государствен*] флаг* [~россия/рф/российск* федераци*]): 19 |
        (~день ~знание): 20 |
        (~день учител*): 21 |
        (~день конституци*): 22 |
        (~старый ~новый ~год): 23 |
        (~день благодарени*): 24 |
        (~день матер*): 25 |
        (~день (медик*/медицинск* работник*)): 26 |
        (~день (пудинг*/пуддинг*)): 27) || converter = $converters.absoluteDateConverter

    $DateAbsolute =  (
        [$DateWeekday] ($DateDayNumber::DateDayNumeric|$DateDayOrderNumber::DateDayNumeric) [числа] [{($DateMonth) [месяц*]}] [ [в] $DateYearNumber::DateYearNumeric [год*]] |
        {($DateDayNumber::DateDayNumeric [числа] [в] $DateMonth [месяц*] [$DateYearTwoNumber::DateYearNumeric год*/($DateDayDigit)($DateMonth)/$DateYearNumber::DateYearNumeric [года]/$DateYearNumeric [год*]]) [[в|во] $DateWeekday]} |
        [в/во] $DateWeekday $DateDayNumber::DateDayNumeric [числа|число] |
        [[в/во] $DateWeekday] $DateDayNumber::DateDayNumeric (числа|число) |
        [[в/во] $DateWeekday] $DateDayOrderNumber::DateDayNumeric [числа|число] |
        [это* [день]] $DateDayNumber::DateDayNumeric [число] $DateMonth [месяц*] [ $DateYearNumber::DateYearNumeric [года] | $DateYearNumeric [год*] | $DateYearTwoNumber::DateYearNumeric год* ] |
        $DateWeekday $DateDayNumber::DateDayNumeric |
        $DateRelativeYear $DateDayNumber::DateDayNumeric [числа] $DateMonth [месяц*] |
        $DateDayNumber::DateDayNumeric [числа] $DateMonth [месяц*] [в] $DateRelativeYear |
        $DateDayNumber::DateDayNumeric [числа] $DateRelativeMonth [месяц*] |
        [на] $DateRelative |
        ($DateYearNumber::DateYearNumeric | $Number::DateYearNumeric) год* |
        $DateHoliday|$DateDayAndMonthDigit
        ) ||  converter = $converters.absoluteDateConverter

    $DateTimeSpecial = (
        $DateDayDigit::Day (в/на) $TimeAbsolute
        ) ||  converter = $converters.specialDateTimeConverter

    $DateWeekDaySpecial = [в|во] $DateWeekday ||  converter = $converters.weekDayConverter

    $DateTimeRelativeInterval = (
        (через|спустя) $DateTimeSimpleInterval :1 |
        $DateTimeSimpleInterval (назад):-1
        ) ||  converter = $converters.relativeDateTimeMultiplierConverter

    $DateTimeAbsolute = (
        $DateAbsolute |
        $TimeAbsolute |
        $TimeAbsolute [на|в|во] $DateAbsolute |
        $DateAbsolute [на|в|после|около] $TimeAbsolute [$DateWeekDaySpecial] |
        $DateTimeSpecial |
        {([на] $DateRelative|$DateTimeRelativeInterval) [$AnyWord] ([на|в|после|около] $TimeAbsolute) [$TimeHoursModifier]}) ||  converter = $converters.composeConverter

    $DateTimeRelativeYears = ( (один|через) (год|годик):1 | $Number (года|годика|лет) ) ||  converter = $converters.numberConverterSum
    $DateTimeRelativeMothes = ( (один|через) месяц:1 | $Number (месяца|месяцев) | [через] полгода:6 ) ||  converter = $converters.numberConverterSum
    $DateTimeRelativeWeeks = ($Number ~неделя :7 | ([одна|через] недел*):7 | (полтор* недел*):10) ||  converter = $converters.numberConverterMultiply
    $DateTimeRelativeSimpleDays = ( (один/одни) (день/денек/сутки):1 |через [один/одни] (день/денек/сутки):1 | [один/одни] (день/денек/сутки) назад:-1 | $Number суток | $Number (дня|дней))
    $DateTimeRelativeDays = ({$DateTimeRelativeSimpleDays [и] [$DateTimeRelativeWeeks]}|$DateTimeRelativeWeeks) ||  converter = $converters.numberConverterSum


    $DateTimeSimpleInterval = (
        $DateTimeRelativeYears [и] [$DateTimeRelativeMothes] [и] [$DateTimeRelativeDays] [и] [$TimeRelativeHours] [и] [$TimeRelativeMinutes] [и] [$TimeRelativeSeconds] |
        $DateTimeRelativeMothes [и] [$DateTimeRelativeDays] [и] [$TimeRelativeHours] [и] [$TimeRelativeMinutes] [и] [$TimeRelativeSeconds] |
        $DateTimeRelativeDays [и] [$TimeRelativeHours] [и] [$TimeRelativeMinutes] [и] [$TimeRelativeSeconds] |
        $TimeRelativeHours [и] [$TimeRelativeMinutes] [и] [$TimeRelativeSeconds] |
        $TimeRelativeMinutes [и] [$TimeRelativeSeconds] |
        $TimeRelativeSeconds |
        $TimeRelativeHoursHalf |
        $TimeRelativeMinutesHalf
        ) ||  converter = $converters.relativeDateTimeConverter

    $DateTimeRelativeSimple = (
        [через|спустя] $DateTimeSimpleInterval :1 |
        $DateTimeSimpleInterval (назад):-1
        ) ||  converter = $converters.relativeDateTimeMultiplierConverter

    $DateTimeNow = (сегодня|этот день) ||  converter = $converters.nowDateTimeConverter

    $DateTimeRelative = ($DateTimeRelativeSimple|$DateTimeNow) ||  converter = $converters.propagateConverter

    $DateTime = ($DateTimeAbsolute|$DateTimeRelative) ||  converter = $converters.normalizeDateTimeConverter
    #$DateTime = ($DateTimeAbsolute|$DateTimeRelative) ||  converter = $converters.absoluteDateTimeConverter

    $DatePeriod = (
        [с] $DateAbsolute::startDate (по/до) $DateAbsolute::endDate |
        [с] $Number::startDate (по/до) $Number::endDate [$DateMonth] [$DateYearNumber] |
        $DateAbsolute::startDate - $DateAbsolute::endDate |
        $regexp<\d+((\.|\/)\d\d)?((\.|\/)(1|2)?\d?\d\d)?\s?(-|−|–|—)\s?\d+((\.|\/)\d\d)?((\.|\/)(1|2)?\d?\d\d)?> [$DateMonth] [$DateYearNumber]) || converter = $converters.datePeriodConverter
theme: /
