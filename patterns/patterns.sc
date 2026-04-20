# TODO разобраться, что нужно, что нет

require: patterns.sc
    module = sys.zb-common
require: dateTime/dateTime.sc
    module = sys.zb-common
require: ./common.sc
require: ./global.sc
require: ./numberAndDate.sc
require: ./redialAndCalls.sc
require: ./smokeAndDevices.sc
require: ./reasons.sc
require: ./rate.sc

require: ./nlu.js
    type = scriptEs6
    name = NLU
