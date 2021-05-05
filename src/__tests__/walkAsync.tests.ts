import {walkAsync} from "../walk";
import {Break} from "../utils";
import {WalkNode} from "../node";

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("walkAsync", () => {
    it("runs once per node filtered by key", async () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        let count = 0;
        await walkAsync(data, {
            callbacks: [{
                keyFilters: ['name'],
                callback: async (n) => {
                    await timeout(10);
                    count++
                }
            }]
        })

        expect(count).toEqual(1);
    });

    it("runs once per node filtered by array", async () => {
        const data = {
            person: {
                name: 'Bob',
                friends: []
            }
        }

        let count = 0;
        await walkAsync(data, {
            callbacks: [{
                nodeTypeFilters: ['array'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(1);
    });

    it("runs once per node filtered by object", async () => {
        const data = {
            person: {
                name: 'Bob',
                friends: []
            }
        }

        let count = 0;
        await walkAsync(data, {
            callbacks: [{
                nodeTypeFilters: ['object'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(2);
    });

    it("runs once per node filtered by value", async () => {
        const data = {
            person: {
                name: 'Bob',
                friends: ['Alice']
            }
        }

        let count = 0;
        await walkAsync(data, {
            callbacks: [{
                nodeTypeFilters: ['value'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(2);
    });


    it("runs once per node filtered by position", async () => {
        const data = {
            person: {
                name: 'Bob',
            }
        }

        let count = 0;
        await walkAsync(data, {
            callbacks: [{
                positionFilters: ['preWalk', 'postWalk'],
                keyFilters: ['name'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(2);
    });


    it("runs callbacks in expected execution order", async () => {
        const data = {
            person: {
                name: 'Bob',
            }
        }

        const result: string[] = [];
        await walkAsync(data, {
            callbacks: [
                {
                    keyFilters: ['name'],
                    executionOrder: 1,
                    callback: () => result.push('second')
                },
                {
                    keyFilters: ['name'],
                    executionOrder: 0,
                    callback: async () =>{
                        await timeout(10)
                        result.push('first')
                    }
                }
            ]
        })

        expect(result).toEqual(['first', 'second']);
    });

    it("properly sets values on root object", async () => {
        const data = {}

        await walkAsync(data, {
            callbacks: [{
                callback: (n) => {
                    expect(n.keyInParent).toBeUndefined()
                    expect(n.val).toEqual({})
                    expect(n.getPath()).toEqual('')
                    expect(n.isRoot).toEqual(true)
                    expect(n.nodeType).toEqual('object')
                    expect(n.parent).toBeUndefined()
                    expect(n.rawType).toEqual('object')
                }
            }]
        })
    });
    it("properly sets values on nested object", async () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        await walkAsync(data, {
            callbacks: [{
                keyFilters: ['person'], callback: (n) => {
                    expect(n.keyInParent).toBe('person')
                    expect(n.val).toEqual({name: 'Bob'})
                    expect(n.getPath()).toEqual('[\"person\"]')
                    expect(n.isRoot).toEqual(false)
                    expect(n.nodeType).toEqual('object')
                    expect(n.parent).toBeTruthy()
                    expect(n.parent!.val).toEqual(data)
                    expect(n.rawType).toEqual('object')
                }
            }]
        })
    });

    it("properly sets values on nested fields", async () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        await walkAsync(data, {
            callbacks: [{
                keyFilters: ['name'], callback: (n) => {
                    expect(n.keyInParent).toBe('name')
                    expect(n.val).toEqual('Bob')
                    expect(n.getPath()).toEqual('[\"person\"][\"name\"]')
                    expect(n.isRoot).toEqual(false)
                    expect(n.nodeType).toEqual('value')
                    expect(n.parent).toBeTruthy()
                    expect(n.parent!.val).toEqual(data.person)
                    expect(n.rawType).toEqual('string')
                }
            }]
        })
    });

    it("properly sets values on nested arrays", async () => {
        const data = {
            people: [
                'Bob'
            ]
        }

        await walkAsync(data, {
            callbacks: [{
                keyFilters: ['people'], callback: (n) => {
                    expect(n.keyInParent).toBe('people')
                    expect(n.val).toEqual(['Bob'])
                    expect(n.getPath()).toEqual('[\"people\"]')
                    expect(n.isRoot).toEqual(false)
                    expect(n.nodeType).toEqual('array')
                    expect(n.parent).toBeTruthy()
                    expect(n.parent!.val).toEqual(data)
                    expect(n.rawType).toEqual('object')
                }
            }]
        })
    })


    it("properly sets values on nested array values", async () => {
        const data = {
            people: [
                'Bob'
            ]
        }

        await walkAsync(data, {
            callbacks: [
                {
                    callback: (n: WalkNode) => {
                        if (!n.isArrayMember) return;
                        expect(n.keyInParent).toBe(0)
                        expect(n.val).toEqual('Bob')
                        expect(n.getPath()).toEqual('[\"people\"][0]')
                        expect(n.isRoot).toEqual(false)
                        expect(n.nodeType).toEqual('value')
                        expect(n.parent).toBeTruthy()
                        expect(n.parent!.val).toEqual(data.people)
                        expect(n.rawType).toEqual('string')
                    }
                }
            ]
        })
    })

    it("sets executedCallbacks", async () => {
        const data = {
            name: 'Bob'
        }

        let count = 0;
        await walkAsync(data, {
            callbacks: [
                {
                    executionOrder: 0,
                    nodeTypeFilters: ['value'],
                    callback: () => count++
                },
                {
                    executionOrder: 1,
                    nodeTypeFilters: ['value'],
                    callback: (n: WalkNode) => {
                        if (n.executedCallbacks.length > 0)
                            return;
                        count++
                    }
                },
            ]
        })

        expect(count).toEqual(1)
    })

    it("runs until Break() when running in infinite mode", async () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        let count = 0;
        await walkAsync(a, {
            graphMode: "infinite",
            callbacks: [{
                callback: (n) => {
                    count++;
                    if (count > 99)
                        throw new Break()
                }
            }]
        })

        expect(count).toEqual(100)
    })

    it("runs once per node when running in graph mode", async () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        let count = 0;
        await walkAsync(a, {
            graphMode: "graph",
            callbacks: [{
                callback: (n) => {
                    count++;
                }
            }]
        })

        expect(count).toEqual(2)
    })

    it("errors when circular refs are present in finiteTree mode", async () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        try {
            await walkAsync(a, {
                graphMode: "finiteTree",
                callbacks: [{
                    callback: () => {
                    }
                }]
            })
            expect(false).toBeTruthy()
        } catch (e){
            expect(e).toBeTruthy()

        }
    })

    it("executes in proper order when running depth first", async () => {

        const data = {
            people: ['Alice'],
            pets: ['Fido'],
        }

        const preKeys: string[] = []
        const postKeys: string[] = []
        await walkAsync(data, {
            traversalMode: "depth",
            callbacks: [
                {
                    positionFilters: ["preWalk"],
                    callback: (n) => preKeys.push(n.getPath())
                },
                {
                    positionFilters: ["postWalk"],
                    callback: (n) => postKeys.push(n.getPath())
                }
            ]
        })

        expect(preKeys).toEqual([
            "",
            "[\"people\"]",
            "[\"people\"][0]",
            "[\"pets\"]",
            "[\"pets\"][0]",
        ])
        expect(postKeys).toEqual([
            "[\"people\"][0]",
            "[\"people\"]",
            "[\"pets\"][0]",
            "[\"pets\"]",
            "",
        ])
    })

    it("executes in proper order when running breadth first", async () => {

        const data = {
            people: ['Alice'],
            pets: ['Fido'],
        }

        const preKeys: string[] = []
        const postKeys: string[] = []
        await walkAsync(data, {
            traversalMode: "breadth",
            callbacks: [{
                positionFilters: ["preWalk"],
                callback: (n) => preKeys.push(n.getPath())
            }, {
                positionFilters: ["postWalk"],
                callback: (n) => postKeys.push(n.getPath())
            },

            ]
        })

        expect(preKeys).toEqual([
            "",
            "[\"people\"]",
            "[\"pets\"]",
            "[\"people\"][0]",
            "[\"pets\"][0]",
        ])

        expect(postKeys).toEqual([
            "",
            "[\"people\"]",
            "[\"pets\"]",
            "[\"people\"][0]",
            "[\"pets\"][0]",
        ])
    })
})
