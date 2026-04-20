theme: /Test
    # TODO доработать
    state: StartWithPayload
        q!: *start *
        scriptEs6:
            $jsapi.startSession();
            $client = {};
            const payloadStr = $request.query.replace("/start", "").trim();
            Logger.info("StartWithPayload] payloadStr", payloadStr);
            $temp.testData ||= {};
            $temp.testData.payload = JSON.parse(payloadStr);
        go!: /Start
