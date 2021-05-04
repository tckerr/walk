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

export type BaseCallback = IOrderable & {
    readonly executionOrder?: number,
    readonly positionFilters?: PositionType[]
    readonly keyFilters?: string[],
    readonly nodeTypeFilters?: NodeType[]
}

export type Callback = BaseCallback & {
    readonly callback: (node: WalkNode) => void,
}

export type AsyncCallback = BaseCallback & {
    readonly callback: ((node: WalkNode) => Promise<void>) | ((node: WalkNode) => void),
}

export type Config<T extends BaseCallback> = {
    readonly traversalMode: 'depth' | 'breadth'
    readonly callbacks: T[]
    readonly graphMode: DataStructureType
    readonly rootObjectCallbacks: boolean
    readonly runCallbacks: boolean
}

export type PartialConfig<T extends BaseCallback> = {
    readonly traversalMode?: 'depth' | 'breadth'
    readonly callbacks?: T[]
    readonly graphMode?: DataStructureType
    readonly rootObjectCallbacks?: boolean
    readonly runCallbacks?: boolean
}

