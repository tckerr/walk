import {Config, Context, PartialConfig} from "./types";

export const defaultCallbackPosition = 'preWalk'

export const defaultPathFormat = (key: string, isArr: boolean) => isArr ? `[${key}]` : `["${key}"]`;

export function buildDefaultConfig<T>() : Config<T> {
    return {
        traversalMode: 'depth',
        rootObjectCallbacks: true,
        runCallbacks: true,
        graphMode: 'finiteTree',
        parallelizeAsyncCallbacks: false,
        callbacks: []
    }
}

export function buildDefaultContext<T>(config: PartialConfig<T>): Context<T> {
    return {
        config: {
            ...buildDefaultConfig<T>(),
            ...config,
        },
        nodes: {},
        seenObjects: [],
        callbacksByPosition: {},
    }
}
