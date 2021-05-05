import {WalkNode} from "./node";

export type Context<T> = {
    config: Config<T>
    nodes: any
    seenObjects: any[]
    callbacksByPosition: { [key: string]: BaseCallback[] }
}

export type NodeType = 'array' | 'object' | 'value';
export type DataStructureType = 'finiteTree' | 'tree' | 'graph' | 'infinite';
export type PositionType = 'preWalk' | 'postWalk'

export interface IOrderable {
    readonly executionOrder?: number
}

export type Cb = (node: WalkNode) => void;
export type AsyncCb = Cb | ((node: WalkNode) => Promise<void>);

export type BaseCallback = IOrderable & {
    readonly executionOrder?: number,
    readonly positionFilters?: PositionType[]
    readonly keyFilters?: string[],
    readonly nodeTypeFilters?: NodeType[]
}

export type Callback = BaseCallback & {
    readonly callback: Cb,
}

export type AsyncCallback = BaseCallback & {
    readonly callback: AsyncCb,
}

export type Config<T extends BaseCallback> = {
    readonly traversalMode: 'depth' | 'breadth'
    readonly callbacks: T[]
    readonly graphMode: DataStructureType
    readonly rootObjectCallbacks: boolean
    readonly runCallbacks: boolean
    readonly parallelizeAsyncCallbacks: boolean
}

export type PartialConfig<T extends BaseCallback> = {
    readonly traversalMode?: 'depth' | 'breadth'
    readonly callbacks?: T[]
    readonly graphMode?: DataStructureType
    readonly rootObjectCallbacks?: boolean
    readonly runCallbacks?: boolean
}

