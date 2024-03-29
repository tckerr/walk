import {WalkNode} from "../node";
import {walkAsync} from "../walk";
import {Break} from "../break";

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("walkAsync", () => {

    it("works with undefined root", async () => {
        let count = 0;
        await walkAsync(undefined, {
            onVisit: [{
                filters: n => typeof n.val === 'undefined',
                callback: () => ++count
            }
            ]
        })
        expect(count).toEqual(1);
    });

    it("works with NaN root", async () => {
        let count = 0;
        await walkAsync(NaN, {
            onVisit: [{
                filters: n => isNaN(n.val),
                callback: () => ++count
            }
            ]
        })
        expect(count).toEqual(1);
    });

    it("works with null root", async () => {
        let count = 0;
        await walkAsync(null, {
            onVisit: [{
                filters: n => n.val === null,
                callback: () => ++count
            }]
        })
        expect(count).toEqual(1);
    });

    it("works with array root", async () => {
        let count = 0;
        await walkAsync([0], {
            onVisit: [{
                callback: (n) => count += n.nodeType === 'array' ? 1 : 0
            }]
        })
        expect(count).toEqual(1);
    })
    ;

    it("runs once per node filtered by key", async () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        let count = 0;
        await walkAsync(data, {
            onVisit: [{
                filters: n => n.key === 'name',
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
            onVisit: [{
                callback: (n) => count += n.nodeType === 'array' ? 1 : 0
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
            onVisit: [{
                callback: (n) => count += n.nodeType === 'object' ? 1 : 0
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
            onVisit: [{
                callback: (n) => count += n.nodeType === 'value' ? 1 : 0
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
            onVisit: [{
                timing: 'both',
                filters: n => n.key === 'name',
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
            onVisit: [
                {
                    filters: n => n.key === 'name',
                    executionOrder: 1,
                    callback: () => result.push('second')
                },
                {
                    filters: n => n.key === 'name',
                    executionOrder: 0,
                    callback: async () => {
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
            onVisit: [{
                callback: (n) => {
                    expect(n.key).toBeUndefined()
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
            onVisit: [{
                filters: n => n.key === 'person',
                callback: (n) => {
                    expect(n.key).toBe('person')
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
            onVisit: [{
                filters: n => n.key === 'name',
                callback: (n) => {
                    expect(n.key).toBe('name')
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
            onVisit: [{
                filters: n => n.key === 'people',
                callback: (n) => {
                    expect(n.key).toBe('people')
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
            onVisit: [
                {
                    callback: (n: WalkNode) => {
                        if (!n.isArrayMember) return;
                        expect(n.key).toBe(0)
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
            onVisit: [
                {
                    executionOrder: 0,
                    callback: (n) => count += n.nodeType === 'value' ? 1 : 0
                },
                {
                    executionOrder: 1,
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
            onVisit: [{
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
            onVisit: [{
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
                onVisit: [{
                    callback: () => {
                    }
                }]
            })
            expect(false).toBeTruthy()
        } catch (e) {
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
            onVisit: [
                {
                    timing: "preVisit",
                    callback: (n) => preKeys.push(n.getPath())
                },
                {
                    timing: "postVisit",
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
            onVisit: [{
                timing: "preVisit",
                callback: (n) => preKeys.push(n.getPath())
            }, {
                timing: "postVisit",
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

    it("only runs callbacks for filtered nodes", async () => {

        const data = {
            people: ['Alice'],
            pets: ['Fido'],
        }

        let count = 0;
        await walkAsync(data, {
            onVisit: [{
                filters: (n) => n.val === 'Fido',
                callback: () => count++
            }]
        })

        expect(count).toEqual(1)
    })

    it("doesn't consider null, NaN, or undefined the same ref in finite tree mode", async () => {

        const data = {
            a: null,
            b: null,
            c: NaN,
            d: NaN,
            e: undefined,
            f: undefined,
        }

        let count = 0;
        await walkAsync(data, {
            graphMode: 'finiteTree',
            onVisit: [{callback: () => ++count}]
        })

        expect(count).toEqual(7)
    })
})
