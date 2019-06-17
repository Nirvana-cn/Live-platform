import {createPeerConnection} from "./reducer/createPeerConnection";
import {getUserMedia} from "./reducer/getUserMedia";

export function reducer(state = 0, action) {
    let temp = null
    switch (action.type){
        case "CreatePeerConnection":
            createPeerConnection(action.target)
            temp = deepCopy(state)
            temp[action.target.name].init = true
            return temp
            break;
        case "GetUserMedia":
            getUserMedia()
            temp = deepCopy(state)
            temp['pc1'].getStream = action.status
            return temp
            break;
        case "GetUserMediaSuccess":
            action.target.addTrack(action.stream.getTracks()[0], action.stream)
            temp = deepCopy(state)
            temp['pc1'].getStream = action.status
            temp['pc1'].stream = true
            return temp
            break;
        case "GetUserMediaFailed":
            temp = deepCopy(state)
            temp['pc1'].getStream = action.status
            return temp
            break;
        case "CreateOffer":
            action.target.createOffer().then((offer) => {
                action.target.setLocalDescription(offer).then(() => {
                    store.dispatch({
                        type: 'CreateOfferSuccess',
                        target: pc1,
                        offer: offer
                    })
                })
            })
            temp = deepCopy(state)
            temp['pc1'].localSdp = 'Pending'
            return temp
            break;
        case "CreateOfferSuccess":
            pc2.setRemoteDescription(action.offer).then(function () {
                store.dispatch({
                    type: 'CreateAnswer',
                    target: pc2
                })
            })
            temp = deepCopy(state)
            temp['pc1'].localSdp = action.offer.sdp
            temp['pc2'].remoteSdp = action.offer.sdp
            return temp
            break;
        case "CreateAnswer":
            pc2.createAnswer().then((answer) => {
                pc2.setLocalDescription(answer).then(() => {
                    store.dispatch({
                        type: 'CreateAnswerSuccess',
                        target: pc2,
                        answer: answer
                    })
                })
            })
            temp = deepCopy(state)
            temp['pc2'].localSdp = 'Pending'
            return temp
            break;
        case "CreateAnswerSuccess":
            pc1.setRemoteDescription(action.answer).then(function () {
                console.log('Peer connection is ok.')
            })
            temp = deepCopy(state)
            temp['pc2'].localSdp = action.answer.sdp
            temp['pc1'].remoteSdp = action.answer.sdp
            return temp
            break;
        default:
            return state;
    }
}

function deepCopy(source, target = {}) {
    for (let key in source) {
        if (source.hasOwnProperty(key)) {
            if (typeof(source[key]) === "object") {
                target[key] = Array.isArray(source[key]) ? [] : {};
                deepCopy(source[key], target[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
    return target;
}