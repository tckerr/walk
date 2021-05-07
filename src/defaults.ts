import {CallbackFn, Config, Context, NodePathFormatter, PartialConfig} from "./types";

export const defaultPathFormatter: NodePathFormatter = (key: string, isArr: boolean) => isArr ? `[${key}]` : `["${key}"]`;

export function buildDefaultConfig<T extends CallbackFn>() : Config<T> {
    return {
        traversalMode: 'depth',
        rootObjectCallbacks: true,
        runCallbacks: true,
        graphMode: 'finiteTree',
        parallelizeAsyncCallbacks: false,
        callbacks: []
    }
}

export function buildDefaultContext<T extends CallbackFn>(config: PartialConfig<T>): Context<T> {
    return {
        config: {
            ...buildDefaultConfig<T>(),
            ...config,
        },
        seenObjects: new Set<any>(),
        callbacksByPosition: {
            "preWalk": [],
            "postWalk": []
        },
    }
}
