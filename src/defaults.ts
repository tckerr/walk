import {Config, Context} from "./types";

export const defaultCallbackPosition = 'postWalk'


const defaultReport = {
    startTime: new Date(),
    callbackProcessingTime: 0,
    processed: {
        array: 0,
        object: 0,
        value: 0,
        classInstances: {}
    }
};

export const defaultConfig: Config = {
    traversalMode: 'depth',
    enforceRootClass: false,
    strictClasses: false,
    rootObjectCallbacks: true,
    runCallbacks: true,
    monitorPerformance: false,
    dataStructure: 'finiteTree',
    pathFormat: function (key: string, isArr: boolean) {
        return isArr ? '[' + key + ']' : '["' + key + '"]';
    },
    callbacks: []
}

export const buildDefaultContext = (config: Config): Context => ({
    config: {
        ...defaultConfig,
        ...config,
    },
    nodes: {},
    seenObjects: [],
    callbacksByPosition: {},
    report: defaultReport
})
