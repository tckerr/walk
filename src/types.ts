import {WalkNode} from "./node";

export type NodeType = 'array' | 'object' | 'value';
export type GraphMode = 'finiteTree' | 'tree' | 'graph' | 'infinite';
export type CallbackTiming = 'preVisit' | 'postVisit' | 'both'
export type TraversalMode = 'depth' | 'breadth';

export type OneOrMany<T> = T | T[];
export type NodePathSegmentFormatter = (node: WalkNode) => string;
export type CallbackFn = (node: WalkNode) => void;
export type AsyncCallbackFn = CallbackFn | ((node: WalkNode) => Promise<void>);
export type NodeFilterFn = (node: WalkNode) => boolean;
export type NodeVisitationRegister = {
    registerObjectVisit: (node: WalkNode) => void;
    objectHasBeenSeen: (node: WalkNode) => boolean;
};

export const isMany = <T>(p: OneOrMany<T>): p is T[] => Array.isArray(p)
export const asMany = <T>(p: OneOrMany<T>): T[] => isMany(p) ? p : [p]

export type Context<T extends CallbackFn> = {
    config: Config<T>
    seenObjects: Set<any>
    callbacksByPosition: { [key: string]: Callback<T>[] }
}

export type Callback<T extends CallbackFn> = {
    executionOrder: number,
    timing: CallbackTiming
    filters: OneOrMany<NodeFilterFn>
    callback: T
}

export type Config<T extends CallbackFn> = {
    traversalMode: TraversalMode
    onVisit: OneOrMany<Callback<T>>
    graphMode: GraphMode
    parallelizeAsyncCallbacks: boolean
    visitationRegister: NodeVisitationRegister;
    trackExecutedCallbacks: boolean;
}

export type PartialConfig<T extends CallbackFn> = Partial<Omit<Config<T>, 'onVisit'>> & {
    onVisit?: OneOrMany<Partial<Callback<T>>>
};
