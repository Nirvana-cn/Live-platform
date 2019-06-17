import {createStore, applyMiddleware} from 'redux'
import {reducer} from './webrtc/main'
import logger from 'redux-logger'

let state = {
    pc1: {
        getStream: 'none',
        stream: false,
        init: false,
        localSdp: '',
        remoteSdp: ''
    },
    pc2: {
        getStream: 'none',
        stream: false,
        init: false,
        localSdp: '',
        remoteSdp: ''
    }
}
window.store = createStore(reducer, state, applyMiddleware(logger))
window.store.subscribe(function () {
    console.log(window.store.getState())
})
