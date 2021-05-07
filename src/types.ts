import {WalkNode} from "./node";

export type Context<T> = {
    config: Config<T>
    seenObjects: Set<any>
    callbacksByPosition: { [key: string]: BaseCallback[] }
}

export type NodeType = 'array' | 'object' | 'value';
export type GraphMode = 'finiteTree' | 'tree' | 'graph' | 'infinite';
export type PositionType = 'preWalk' | 'postWalk' | 'both'
export type TraversalMode = 'depth' | 'breadth';

export interface IOrderable {
    executionOrder?: number
}

export type NodePathFormatter = (node: string, isArr: boolean) => string;

export type Cb = (node: WalkNode) => void;
export type AsyncCb = Cb | ((node: WalkNode) => Promise<void>);
export type NodeFilterFn = (node: WalkNode) => boolean;

export type BaseCallback = IOrderable & {
    executionOrder?: number,
    positionFilter?: PositionType
    keyFilters?: string[],
    nodeTypeFilters?: NodeType[] | NodeType
    filters?: NodeFilterFn[] | NodeFilterFn
}

export type Callback = BaseCallback & {
    callback: Cb,
}

export type AsyncCallback = BaseCallback & {
    callback: AsyncCb,
}

export type Config<T extends BaseCallback> = {
    readonly traversalMode: TraversalMode
    readonly callbacks: T[]
    readonly graphMode: GraphMode
    readonly rootObjectCallbacks: boolean
    readonly runCallbacks: boolean
    readonly parallelizeAsyncCallbacks: boolean
}

export type PartialConfig<T extends BaseCallback> = {
    traversalMode?: TraversalMode
    callbacks?: T[]
    graphMode?: GraphMode
    rootObjectCallbacks?: boolean
    runCallbacks?: boolean
    parallelizeAsyncCallbacks?: boolean
}

