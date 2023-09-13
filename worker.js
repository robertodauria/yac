const workerMain = function (ev) {
    const sock = new WebSocket("ws://localhost/ndt/v7/upload", 'net.measurementlab.ndt.v7');
    let now = () => performance.now();

    uploadTest(sock, now)
};

const uploadTest = function (sock, now) {
    const initialMessageSize = 8192; // 8kB
    const maxMessageSize = 1<<23; /* = (1<<23) = 8MB */
    const clientMeasurementInterval = 250; // ms
    const duration = 10000; // 10s

    let total, start, end;
    let closed = false;

    sock.onclose = function () {
        if (!closed) {
            closed = true;
            postMessage({
                type: 'close',
            });
        }
    };

    sock.onerror = function (ev) {
        postMessage({
            type: 'error',
        });
    };

    sock.onmessage = function (ev) {
        if (typeof ev.data !== 'undefined') {
            postMessage({
                type: 'measurement',
                src: 'server',
                data: ev.data,
            });
        }
    };

    sock.onopen = function () {
        start = now();
        end = start + duration;
        total = 0;

        let data = new Uint8Array(initialMessageSize);

        // Record a client-side measurement every clientMeasurementInterval and
        // post it to the main thread.
        setInterval(() => {
            postMessage({
                type: 'measurement',
                src: 'client',
                data: {
                    elapsed: (now() - start) / 1000,
                    bytes: total - sock.bufferedAmount,
                },
            });
        }, clientMeasurementInterval);

        setInterval(() => {
            const t = now();
            if (t > end) {
                sock.close();
                postMessage({
                    type: 'measurement',
                    src: 'client',
                    data: {
                        elapsed: (t - start) / 1000,
                        bytes: total - sock.bufferedAmount,
                    },
                });
                return;
            }
        }, 100);

        setInterval(() => {
            const nextSizeIncrement =
                (data.length >= maxMessageSize) ? Infinity : 16 * data.length;

            if (total >= nextSizeIncrement) {
                data = new Uint8Array(data.length * 2);
            }

            // We keep 7 messages in the send buffer, so there is always some more
            // data to send. The maximum buffer size is 7 * 8MB - 1 byte ~= 56M
            const desiredBuffer = 7 * data.length;
            while (sock.bufferedAmount + data.length <= desiredBuffer) {
                sock.send(data);
                total += data.length;
            }
        }, 0);
    }
};

onmessage = workerMain;