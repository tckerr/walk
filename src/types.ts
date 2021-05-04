import {WalkNode} from "./node";

export type Context = {
    config: Config
    nodes: any
    seenObjects: any[]
    callbacksByPosition: { [key: string]: Callback[] }
}

export type NodeType = 'array' | 'object' | 'value';
export type DataStructureType = 'finiteTree' | 'tree' | 'graph' | 'infinite';
export type PositionType = 'preWalk' | 'postWalk'

export type Callback = {
    readonly callback: (node: WalkNode) => void,
    readonly executionOrder?: number,
    readonly positionFilters?: PositionType[]
    readonly keyFilters?: string[],
    readonly nodeTypeFilters?: NodeType[]
}

export type Config = {
    readonly traversalMode: 'depth' | 'breadth'
    readonly callbacks: Callback[]
    readonly graphMode: DataStructureType
    readonly rootObjectCallbacks: boolean
    readonly runCallbacks: boolean
}

export type PartialConfig = {
    readonly traversalMode?: 'depth' | 'breadth'
    readonly callbacks?: Callback[]
    readonly monitorPerformance?: boolean
    readonly graphMode?: DataStructureType
    readonly enforceRootClass?: boolean
    readonly strictClasses?: boolean
    readonly rootObjectCallbacks?: boolean
    readonly runCallbacks?: boolean
}

