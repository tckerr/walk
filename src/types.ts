export type Context = {
    config: Config
    nodes: any
    seenObjects: any[]
    callbacksByPosition: { [key: string]: Callback[] }
    report: Report
}

export type ContainerType = 'array' | 'object' | 'value';
export type DataStructureType = 'finiteTree' | 'tree' | 'graph' | 'infinite';
export type PositionType = 'preWalk' | 'postWalk'

export type Report = {
    startTime: Date
    callbackProcessingTime: number
    processed: {
        array: number
        object: number
        value: number
        classInstances: { [key: string]: number }
    }
}

export type Callback = {
    readonly callback: (node: WalkNode) => void,
    readonly priority?: number,
    readonly positionFilters?: PositionType[]
    readonly keyFilters?: string[],
    readonly containerFilters?: string[]
    hasRun?: boolean
}

export type Config = {
    readonly traversalMode: 'depth' | 'breadth'
    readonly callbacks: Callback[]
    readonly monitorPerformance: boolean
    readonly pathFormat: (key: string, isArr: boolean) => string
    readonly dataStructure: DataStructureType
    readonly enforceRootClass: boolean
    readonly strictClasses: boolean
    readonly rootObjectCallbacks: boolean
    readonly runCallbacks: boolean
}

export type WalkNode = {
    val: any
    isRoot: boolean
    path: string
    container: ContainerType,
    type: string,
    executedCallbacks: Callback[]
    meta: {
        children: WalkNode[],
        parents: WalkNode[]
    }

    keyInParent?: string
    parent?: WalkNode
}
