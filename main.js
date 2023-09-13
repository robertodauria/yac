const run = function (resultDiv) {
    // Spawn worker and send an empty message to start it.
    const w = new Worker("worker.js");

    w.postMessage({});

    const results = [];
    w.onmessage = function (e) {
        if (e.data.type == 'measurement') {
            if (e.data.src == 'server') {
                m = JSON.parse(e.data.data);
                results.push(m.TCPInfo.BytesReceived / m.TCPInfo.ElapsedTime * 8);
            }
        }
        if (e.data.type == 'close') {
            console.log(results);
        }
    };
}