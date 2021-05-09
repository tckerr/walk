import {WalkNode} from "./node";

export type NodeType = 'array' | 'object' | 'value';
export type GraphMode = 'finiteTree' | 'tree' | 'graph' | 'infinite';
export type PositionType = 'preWalk' | 'postWalk' | 'both'
export type TraversalMode = 'depth' | 'breadth';

export interface IOrderable {
    executionOrder?: number
}

export type NodePathSegmentFormatter = (node: WalkNode) => string;
export type CallbackFn = (node: WalkNode) => void;
export type AsyncCallbackFn = CallbackFn | ((node: WalkNode) => Promise<void>);
export type NodeFilterFn = (node: WalkNode) => boolean;

export type Context<T extends CallbackFn> = {
    config: Config<T>
    seenObjects: Set<any>
    callbacksByPosition: { [key: string]: _Callback<T>[] }
}

export type _Callback<T extends CallbackFn> = IOrderable & {
    executionOrder: number,
    positionFilter: PositionType
    keyFilters: string[],
    nodeTypeFilters: NodeType[]
    filters: NodeFilterFn[]
    callback: T
}

export type Config<T extends CallbackFn> = {
    readonly traversalMode: TraversalMode
    readonly callbacks: _Callback<T>[]
    readonly graphMode: GraphMode
    readonly rootObjectCallbacks: boolean
    readonly runCallbacks: boolean
    readonly parallelizeAsyncCallbacks: boolean
}

export type Callback<T extends CallbackFn> = Partial<_Callback<T>>
export type PartialConfig<T extends CallbackFn> = Partial<Config<T>>

