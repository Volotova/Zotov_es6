require: requirements.sc
require: dictsExamples/dictsImport.sc
require: ./services/redial/customRedial.sc
require: ./services/repeat.sc


theme: /
    state: Start
        q!: $regex</start>
        scriptEs6:
            // Инициализация сессии
            if (!Utils.isResterisk()) $jsapi.startSession();
            await Init.initSession();
            
            Analytics.setStage("Start");
            Analytics.setCallStatus("Start");
            Analytics.saveValue("Test field", "Test value");
            Answer.say();

    state: SetHttpTest
        q!: http
        scriptEs6:
            let handlerTest = function() {$reactions.answer(400)}
            let handlerTest2 = function() {$reactions.answer("500")}
            let handlerTest3 = function() {$reactions.answer("5string")}
            let handlerTest4 = function() {$reactions.answer("ANY")}
            let handlerTest5 = function() {$reactions.answer("ANY_FINAL")}
            $session.testHttp = new HttpClient().init(
                {
                    baseURL: "https://bot.jaicp.com/chatapi",
                    data: {"clientId":"testqwerty"},
                    method: "post",
                    headers: {
                        "Content-Type": "application/json"  
                    }
                }, 
                "test"
            ).addErrorHandler([400], handlerTest)
            .addErrorHandler(["500"], handlerTest2)
            .addErrorHandler(["5**"], handlerTest3)
            .addErrorHandler(["Any"], handlerTest4)
            .addErrorHandler(["Any"], handlerTest5, true)
            # .installMask("headers")
            # .installMask(["clientId"]);
    
        state: TestHttp
            q: test http
            scriptEs6:
                try {
                    let testHttp = (await session()).testHttp;
                    
                    // $client.mockTestCases = ["caSuccessCall"];
                    // Вариант с вызовом через execute
                    const chatApiToken = Utils.getSecret("CHATAPI")?.token;
                    let result1 = await testHttp.execute({
                        url: `/${chatApiToken}`,
                        data: {
                            "query":"привет, брат"
                        }
                    }, 2);
                    
                    // Вариант с вызовом через post
                    // let result1 = await testHttp.post(`/${$secrets.get("CHATAPI_TOKEN")}`, {"query":"привет, брат"}, {});
                    $reactions.answer(result1?.data?.data?.replies[0].text);
                } catch (e) {
                    Logger.info("error", e);
                }
            a: TestHttp
        
        state: TestHttpError
            q: test http error
            scriptEs6:
                # $client.mockTestCases = ["caSuccessCall"];
                Analytics.setEndReason("TestEndReason");
                try {
                    let testHttp = (await session()).testHttp;
                    
                    const chatApiToken = Utils.getSecret("CHATAPI")?.token;
                    // Вариант с вызовом через execute
                    let result1 = await testHttp.execute({
                        url: `/${chatApiToken}`,
                    }, 2);
                    $reactions.answer(result1.data.data.replies[0].text);
                } catch (e) {
                    Logger.info("error", e);
                }
            a: TestHttpError
    
    state: TestLLM
        q!: test llm
        scriptEs6:
            const jsonToPut = {somefield: "something here"}
            const promptContext = {
                "jsonToPut": toPrettyString(jsonToPut)
            };
            const prompt = LLM.renderTemplate($Prompts.TestParsing, promptContext);
            const llmConfig = {
                url: "https://caila.io/api/mlpgate/account/just-ai/model/openai-proxy/predict",
                body: {model: "gpt-4o"}
            }
            const res = await LLM.simpleCall(prompt, 3, true, r => r.somefield, llmConfig);
            $reactions.answer(`Получен JSON: ${toPrettyString(res)}`);
            $reactions.answer(`DONE`);
    
    state: TestCounter || noContext = true
        q!: test counter
        if: counter() > 2
            a: OverLimit es5
        else:
            a: Not over limit es5
        scriptEs6:
            if (Utils.counter() > 2) {
                $reactions.answer("OverLimit es6");
            } else {
                $reactions.answer("Not OverLimit es6");
            }

    state: TaskManager
        q!: task manager
        scriptEs6:
            let simpleTask = async function() {
                setTimeout(() => {
                    Logger.info("Delayed for 5 seconds.");
                }, "5000");
                return "ASSSSSSSSSAAAA";
            };
            $session.taskId = await TaskManager.startTask(
                simpleTask,
                "simple"
            );
            $reactions.answer(`Задача определения категории запущена, ID: ${$session.taskId}`);

        state: Check 
            q: check
            scriptEs6:
                const result = await TaskManager.waitForTask($session.taskId, 5, 1000);
                $reactions.answer(toPrettyString(result));

    state: TestAnswer || noContext = true
        q!: test answer
        scriptEs6:
            Answer.say("AdultSmoker");
            Answer.say("AdultSmokerCatchAll");
            Answer.say("AdultSmokerCatchAll");
            $session.currentCampaign.data.brand = "IQOS";
            Answer.say("BrandAnswer");

    state: CatchAll
        event!: noMatch
        a: You said: {{$request.query}}

    state: Reset
        q!: *reset
        scriptEs6:
            $client = {};
            $jsapi.stopSession();
            
    state: Bye
        q: * пока *
        scriptEs6:
            HangUp.noRedialHangUp();
            
    state: TestBPM
        q!: test bpm
        scriptEs6:
            $session.currentCampaign.data.phone = "79990438860";
            await SendCallStatus.sendCallStatus("Автоответчик");
            await MessageToUser.sendMessage("Какой-то текст", "Данила");
        a: test bpm

    state: testbugreport
        q!: testbugreport
        scriptEs6:
            throw new Error("error!");
            
    state: integrationBugTest
        q!: integrationBugTest
        scriptEs6:
            const httpClient = new HttpClient().init()
            const result = await httpClient.get("svvdfvd")

