import {Config, Context, PartialConfig} from "./types";

export const defaultCallbackPosition = 'preWalk'

export const defaultPathFormat = (key: string, isArr: boolean) => isArr ? `[${key}]` : `["${key}"]`;

export const defaultConfig: Config = {
    traversalMode: 'depth',
    rootObjectCallbacks: true,
    runCallbacks: true,
    graphMode: 'finiteTree',
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
})
