require: ./core/extentions/extentionsImport.sc
require: ./core/coreImport.sc
require: ./services/servicesImport.sc


    
require: ./services/es5/init.js
require: ./services/es5/utils.js
require: ./services/es5/bugReport.js

require: ./patterns/patterns.sc

#require: ./test/test.sc

require: ./dictionaries/markedNames.yaml
    var = $MarkedNames

require: ./dictionaries/commonPrompts.yaml
    var = $CommonPrompts

# INTEGRATIONS
require: ./integrations/bpm/bpmBasicRequirements.sc
require: ./integrations/bpm/sendCallStatus.js
    type = scriptEs6
    name = SendCallStatus
require: ./integrations/bpm/messageToUser.js
    type = scriptEs6
    name = MessageToUser
require: ./integrations/bugReport.js
    type = scriptEs6
    name = bugReport
    
