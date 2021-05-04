import {Config, Context, PartialConfig} from "./types";

export const defaultCallbackPosition = 'preWalk'


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
    graphMode: 'finiteTree',
    pathFormat: function (key: string, isArr: boolean) {
        return isArr ? '[' + key + ']' : '["' + key + '"]';
    },
    callbacks: []
}

export const buildDefaultContext = (config: PartialConfig): Context => ({
    config: {
        ...defaultConfig,
        ...config,
    },
    nodes: {},
    seenObjects: [],
    callbacksByPosition: {},
    report: defaultReport
})
