'use strict';

function map2obj(m) {
    if (!m.entries) {
        return m;
    }
    var o = {};
    m.forEach(function (v, k) {
        o[k] = v;
    });
    return o;
}

function deltaCompression(oldStats, newStats) {     // 目的是去除重复且不变的状态，对状态对象进行精简。
    newStats = JSON.parse(JSON.stringify(newStats));    // 防止引用了外部对象，使用深拷贝来隔离。
    Object.keys(newStats).forEach(function (id) {
        if (!oldStats[id]) {
            return;
        }
        var report = newStats[id];
        Object.keys(report).forEach(function (name) {
            if (report[name] === oldStats[id][name]) {
                delete newStats[id][name];
            }
            delete report.timestamp;
            if (Object.keys(report).length === 0) {
                delete newStats[id];
            }
        });
    });
    // TODO: moving the timestamp to the top-level is not compression but...
    newStats.timestamp = new Date();
    return newStats;
}

function mangleChromeStats(pc, response) {
    var standardReport = {};
    var reports = response.result();
    reports.forEach(function (report) {
        var standardStats = {
            id: report.id,
            timestamp: report.timestamp.getTime(),
            type: report.type,
        };
        report.names().forEach(function (name) {
            standardStats[name] = report.stat(name);
        });
        // backfill mediaType -- until https://codereview.chromium.org/1307633007/ lands.
        if (report.type === 'ssrc' && !standardStats.mediaType && standardStats.googTrackId) {
            // look up track kind in local or remote streams.
            var streams = pc.getRemoteStreams().concat(pc.getLocalStreams());
            for (var i = 0; i < streams.length && !standardStats.mediaType; i++) {
                var tracks = streams[i].getTracks();
                for (var j = 0; j < tracks.length; j++) {
                    if (tracks[j].id === standardStats.googTrackId) {
                        standardStats.mediaType = tracks[j].kind;
                        report.mediaType = tracks[j].kind;
                    }
                }
            }
        }
        standardReport[standardStats.id] = standardStats;
    });
    return standardReport;
}

function dumpStream(stream) {
    return {
        id: stream.id,
        tracks: stream.getTracks().map(function (track) {
            return {
                id: track.id,                 // unique identifier (GUID) for the track
                kind: track.kind,             // `audio` or `video`
                label: track.label,           // identified the track source
                enabled: track.enabled,       // application can control it
                muted: track.muted,           // application cannot control it (read-only)
                readyState: track.readyState, // `live` or `ended`
            };
        }),
    };
}

function getStatsInformation(trace, getStatsInterval, prefixesToWrap) {
    var peerconnectioncounter = 0;
    var isFirefox = !!window.mozRTCPeerConnection;
    var isEdge = !!window.RTCIceGatherer;
    var isSafari = !isFirefox && window.RTCPeerConnection && !window.navigator.webkitGetUserMedia;
    prefixesToWrap.forEach(function (prefix) {
        if (!window[prefix + 'RTCPeerConnection']) {
            return;
        }
        if (prefix === 'webkit' && isEdge) {
            // dont wrap webkitRTCPeerconnection in Edge.
            return;
        }
        var origPeerConnection = window[prefix + 'RTCPeerConnection'];
        var peerconnection = function (config, constraints) {
            var pc = new origPeerConnection(config, constraints);
            var id = 'PC_' + peerconnectioncounter++;
            pc.__rtcStatsId = id;

            if (!config) {
                config = {nullConfig: true};
            }

            config = JSON.parse(JSON.stringify(config)); // deepcopy
            // don't log credentials
            ((config && config.iceServers) || []).forEach(function (server) {
                delete server.credential;
            });

            if (isFirefox) {
                config.browserType = 'moz';
            } else if (isEdge) {
                config.browserType = 'edge';
            } else {
                config.browserType = 'webkit';
            }

            trace('create', id, config);
            // TODO: do we want to log constraints here? They are chrome-proprietary.
            // http://stackoverflow.com/questions/31003928/what-do-each-of-these-experimental-goog-rtcpeerconnectionconstraints-do
            if (constraints) {
                trace('constraints', id, constraints);
            }

            pc.addEventListener('icecandidate', function (e) {
                trace('onicecandidate', id, e.candidate);
            });
            pc.addEventListener('addstream', function (e) {
                trace('onaddstream', id, e.stream.id + ' ' + e.stream.getTracks().map(function (t) {
                    return t.kind + ':' + t.id;
                }));
            });
            pc.addEventListener('track', function (e) {
                trace('ontrack', id, e.track.kind + ':' + e.track.id + ' ' + e.streams.map(function (stream) {
                    return 'stream:' + stream.id;
                }));
            });
            pc.addEventListener('removestream', function (e) {
                trace('onremovestream', id, e.stream.id + ' ' + e.stream.getTracks().map(function (t) {
                    return t.kind + ':' + t.id;
                }));
            });
            pc.addEventListener('signalingstatechange', function () {
                trace('onsignalingstatechange', id, pc.signalingState);
            });
            pc.addEventListener('iceconnectionstatechange', function () {
                trace('oniceconnectionstatechange', id, pc.iceConnectionState);
            });
            pc.addEventListener('icegatheringstatechange', function () {
                trace('onicegatheringstatechange', id, pc.iceGatheringState);
            });
            pc.addEventListener('connectionstatechange', function () {
                trace('onconnectionstatechange', id, pc.connectionState);
            });
            pc.addEventListener('negotiationneeded', function () {
                trace('onnegotiationneeded', id);
            });
            pc.addEventListener('datachannel', function (event) {
                trace('ondatachannel', id, [event.channel.id, event.channel.label]);
            });

            // TODO: do we want one big interval and all peerconnections
            //    queried in that or one setInterval per PC?
            //    we have to collect results anyway so...
            if (!isEdge) {
                var prev = {};
                var interval = window.setInterval(function () {
                    if (pc.signalingState === 'closed') {
                        window.clearInterval(interval);
                        return;
                    }
                    if (isFirefox || isSafari) {
                        pc.getStats(null).then(function (res) {
                            var now = map2obj(res);
                            var base = JSON.parse(JSON.stringify(now)); // our new prev
                            trace('getstats', id, deltaCompression(prev, now));
                            prev = base;
                        });
                    } else {
                        pc.getStats(function (res) {
                            var now = mangleChromeStats(pc, res);
                            var base = JSON.parse(JSON.stringify(now)); // our new prev
                            trace('getstats', id, deltaCompression(prev, now));
                            prev = base;
                        }, function (err) {
                            console.log(err);
                        });
                    }
                }, getStatsInterval);
            }
            return pc;
        };

        ['createDataChannel', 'close'].forEach(function (method) {
            var nativeMethod = origPeerConnection.prototype[method];
            if (nativeMethod) {
                origPeerConnection.prototype[method] = function () {
                    trace(method, this.__rtcStatsId, arguments);
                    return nativeMethod.apply(this, arguments);
                };
            }
        });

        ['addStream', 'removeStream'].forEach(function (method) {
            var nativeMethod = origPeerConnection.prototype[method];
            if (nativeMethod) {
                origPeerConnection.prototype[method] = function () {
                    var stream = arguments[0];
                    var streamInfo = stream.getTracks().map(function (t) {
                        return t.kind + ':' + t.id;
                    });

                    trace(method, this.__rtcStatsId, stream.id + ' ' + streamInfo);
                    return nativeMethod.apply(this, arguments);
                };
            }
        });

        ['addTrack'].forEach(function (method) {
            var nativeMethod = origPeerConnection.prototype[method];
            if (nativeMethod) {
                origPeerConnection.prototype[method] = function () {
                    var track = arguments[0];
                    var streams = [].slice.call(arguments, 1);
                    trace(method, this.__rtcStatsId, track.kind + ':' + track.id + ' ' + (streams.map(function (s) {
                        return 'stream:' + s.id;
                    }).join(';') || '-'));
                    return nativeMethod.apply(this, arguments);
                };
            }
        });

        ['removeTrack'].forEach(function (method) {
            var nativeMethod = origPeerConnection.prototype[method];
            if (nativeMethod) {
                origPeerConnection.prototype[method] = function () {
                    var track = arguments[0].track;
                    trace(method, this.__rtcStatsId, track ? track.kind + ':' + track.id : 'null');
                    return nativeMethod.apply(this, arguments);
                };
            }
        });

        ['createOffer', 'createAnswer'].forEach(function (method) {
            var nativeMethod = origPeerConnection.prototype[method];
            if (nativeMethod) {
                origPeerConnection.prototype[method] = function () {
                    var rtcStatsId = this.__rtcStatsId;
                    var args = arguments;
                    var opts;
                    if (arguments.length === 1 && typeof arguments[0] === 'object') {
                        opts = arguments[0];
                    } else if (arguments.length === 3 && typeof arguments[2] === 'object') {
                        opts = arguments[2];
                    }
                    trace(method, this.__rtcStatsId, opts);
                    return nativeMethod.apply(this, opts ? [opts] : undefined)
                        .then(function (description) {
                            trace(method + 'OnSuccess', rtcStatsId, description);
                            if (args.length > 0 && typeof args[0] === 'function') {
                                args[0].apply(null, [description]);
                                return undefined;
                            }
                            return description;
                        }, function (err) {
                            trace(method + 'OnFailure', rtcStatsId, err.toString());
                            if (args.length > 1 && typeof args[1] === 'function') {
                                args[1].apply(null, [err]);
                                return;
                            }
                            throw err;
                        });
                };
            }
        });

        ['setLocalDescription', 'setRemoteDescription', 'addIceCandidate'].forEach(function (method) {
            var nativeMethod = origPeerConnection.prototype[method];
            if (nativeMethod) {
                origPeerConnection.prototype[method] = function () {
                    var rtcStatsId = this.__rtcStatsId;
                    var args = arguments;
                    trace(method, this.__rtcStatsId, args[0]);
                    return nativeMethod.apply(this, [args[0]])
                        .then(function () {
                            trace(method + 'OnSuccess', rtcStatsId);
                            if (args.length >= 2 && typeof args[1] === 'function') {
                                args[1].apply(null, []);
                                return undefined;
                            }
                            return undefined;
                        }, function (err) {
                            trace(method + 'OnFailure', rtcStatsId, err.toString());
                            if (args.length >= 3 && typeof args[2] === 'function') {
                                args[2].apply(null, [err]);
                                return undefined;
                            }
                            throw err;
                        });
                };
            }
        });

        // wrap static methods. Currently just generateCertificate.
        if (origPeerConnection.generateCertificate) {
            Object.defineProperty(peerconnection, 'generateCertificate', {
                get: function () {
                    return arguments.length ?
                        origPeerConnection.generateCertificate.apply(null, arguments)
                        : origPeerConnection.generateCertificate;
                },
            });
        }
        window[prefix + 'RTCPeerConnection'] = peerconnection;
        window[prefix + 'RTCPeerConnection'].prototype = origPeerConnection.prototype;
    });

    // getUserMedia wrappers
    prefixesToWrap.forEach(function (prefix) {
        var name = prefix + (prefix.length ? 'GetUserMedia' : 'getUserMedia');
        if (!navigator[name]) {
            return;
        }
        var origGetUserMedia = navigator[name].bind(navigator);
        var gum = function () {
            trace('getUserMedia', null, arguments[0]);
            var cb = arguments[1];
            var eb = arguments[2];
            origGetUserMedia(arguments[0],
                function (stream) {
                    // we log the stream id, track ids and tracks readystate since that is ended GUM fails
                    // to acquire the cam (in chrome)
                    trace('getUserMediaOnSuccess', null, dumpStream(stream));
                    if (cb) {
                        cb(stream);
                    }
                },
                function (err) {
                    trace('getUserMediaOnFailure', null, err.name);
                    if (eb) {
                        eb(err);
                    }
                }
            );
        };
        navigator[name] = gum.bind(navigator);
    });

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        var gum = function () {
            trace('navigator.mediaDevices.getUserMedia', null, arguments[0]);
            return origGetUserMedia.apply(navigator.mediaDevices, arguments)
                .then(function (stream) {
                    trace('navigator.mediaDevices.getUserMediaOnSuccess', null, dumpStream(stream));
                    return stream;
                }, function (err) {
                    trace('navigator.mediaDevices.getUserMediaOnFailure', null, err.name);
                    return Promise.reject(err);
                });
        };
        navigator.mediaDevices.getUserMedia = gum.bind(navigator.mediaDevices);
    }

    // getDisplayMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        var origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        var gdm = function () {
            trace('navigator.mediaDevices.getDisplayMedia', null, arguments[0]);
            return origGetDisplayMedia.apply(navigator.mediaDevices, arguments)
                .then(function (stream) {
                    trace('navigator.mediaDevices.getDisplayMediaOnSuccess', null, dumpStream(stream));
                    return stream;
                }, function (err) {
                    trace('navigator.mediaDevices.getDisplayMediaOnFailure', null, err.name);
                    return Promise.reject(err);
                });
        };
        navigator.mediaDevices.getDisplayMedia = gdm.bind(navigator.mediaDevices);
    }

};

function wsServer(wsURL) {
    window._behaviour=[];
    window._allStats=[];
    var isFirefox = !!window.mozRTCPeerConnection;
    var buffer = [];
    // var connection = new WebSocket(wsURL);
    var connection = new WebSocket(wsURL + window.location.pathname, '1.0');
    connection.onerror = function (e) {
        console.log('WS ERROR', e);
    };

    connection.onopen = function () {
        while (buffer.length) {
            connection.send(JSON.stringify(buffer.shift()));
        }
    };

    function trace() {
        var args = Array.prototype.slice.call(arguments);
        args.push(new Date().getTime());
        if (connection.readyState === 1) {
            if(args[0]==='getstats'){
                if(isFirefox){

                }else{
                    let keyArr=Object.keys(args[2]);
                    let index=keyArr.find(item=>item.includes('ssrc'));
                    args[2][index].count=args[1].split('_')[1];
                    if(args[2][index].count>=app.currentStats.length){
                        app.currentStats.push(args[2][index]);
                    }else{
                        Vue.set(app.currentStats,args[2][index].count,args[2][index])
                    }
                    window._allStats.push(args[2][index]);
                }
            }else{
                args.push(app.userName);
                app.behaviourContent=args[2];
                window._behaviour.unshift(args);
            }
            connection.send(JSON.stringify(args));
        } else if (args[0] !== 'getstats') {
            buffer.push(args);
        }
    }

    return trace;
}

var trace = wsServer('ws://127.0.0.1:3001')
getStatsInformation(trace, 2000, ['', 'webkit', 'moz'])

