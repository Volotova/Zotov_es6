# Подключаем основные паттерны и функции из zb-common

require: patterns.sc
    module = sys.zb-common
require: ./dateTime.sc

require: common.js
    module = sys.zb-common
require: ./redial.js
require: ./paramsDefault.yaml
    var = $ParamsDefault

init:
    $global.params = $ParamsDefault;
    $global.redial = {};
    $global.redial.time = ($injector.redial && $injector.redial.time)
        ? _.extend(_.clone($global.params.redial.time), $injector.redial.time)
        : $global.params.redial.time;
    $global.redial.localTimeFrom = $global.params.redial.localTimeFrom;
    $global.redial.localTimeTo = $global.params.redial.localTimeTo;
    $global.redial.timeZone = ($injector.redial && $injector.redial.timeZone) || $global.params.redial.timeZone;
