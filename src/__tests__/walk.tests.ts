import {walk} from "../walk";
import {Break} from "../index";
import {WalkNode} from "../node";

describe("walk", () => {
    it("works with undefined root", () => {
        let count = 0;
        walk(undefined, {callbacks:[{
            filters: [n => typeof n.val === 'undefined'],
            callback: () => ++count}
        ]})
        expect(count).toEqual(1);
    });

    it("works with NaN root", () => {
        let count = 0;
        walk(NaN, {callbacks:[{
            filters: [n => isNaN(n.val)],
            callback: () => ++count}
        ]})
        expect(count).toEqual(1);
    });

    it("works with null root", () => {
        let count = 0;
        walk(null, {callbacks:[{
            filters: [n => n.val === null],
            callback: () => ++count}
        ]})
        expect(count).toEqual(1);
    });

    it("works with array root",  () => {
        let count = 0;
        walk([0], {callbacks:[{
            nodeTypeFilters: ['array'],
            callback: () => ++count}
        ]})
        expect(count).toEqual(1);
    });

    it("ignores root callbacks", () => {
        const data = {}

        let count = 0;
        walk(data, {
            rootObjectCallbacks: false,
            callbacks: [{callback: (n) => count++}]
        })

        expect(count).toEqual(0);
    });

    it("ignores all callbacks", () => {
        const data = {person:{name:"Bob"}}

        let count = 0;
        walk(data, {
            runCallbacks: false,
            callbacks: [{callback: (n) => count++}]
        })

        expect(count).toEqual(0);
    });

    it("runs once per node filtered by key", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        let count = 0;
        walk(data, {
            callbacks: [{
                keyFilters: ['name'],
                callback: () => count++
            }]
        })

        expect(count).toEqual(1);
    });

    it("runs once per node filtered by array", () => {
        const data = {
            person: {
                name: 'Bob',
                friends: []
            }
        }

        let count = 0;
        walk(data, {
            callbacks: [{
                nodeTypeFilters: ['array'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(1);
    });

    it("runs once per node filtered by object", () => {
        const data = {
            person: {
                name: 'Bob',
                friends: []
            }
        }

        let count = 0;
        walk(data, {
            callbacks: [{
                nodeTypeFilters: ['object'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(2);
    });

    it("runs once per node filtered by value", () => {
        const data = {
            person: {
                name: 'Bob',
                friends: ['Alice']
            }
        }

        let count = 0;
        walk(data, {
            callbacks: [{
                nodeTypeFilters: ['value'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(2);
    });


    it("runs once per node filtered by position", () => {
        const data = {
            person: {
                name: 'Bob',
            }
        }

        let count = 0;
        walk(data, {
            callbacks: [{
                positionFilter: 'both',
                keyFilters: ['name'],
                callback: (n) => count++
            }]
        })

        expect(count).toEqual(2);
    });


    it("runs callbacks in expected execution order", () => {
        const data = {
            person: {
                name: 'Bob',
            }
        }

        const result: string[] = [];
        walk(data, {
            callbacks: [
                {
                    keyFilters: ['name'],
                    executionOrder: 1,
                    callback: (n) => result.push('second')
                },
                {
                    keyFilters: ['name'],
                    executionOrder: 0,
                    callback: (n) => result.push('first')
                }
            ]
        })

        expect(result).toEqual(['first', 'second']);
    });

    it("properly sets values on root object", () => {
        const data = {}

        walk(data, {
            callbacks: [{
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
    it("properly sets values on nested object", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        walk(data, {
            callbacks: [{
                keyFilters: ['person'], callback: (n) => {
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

    it("properly sets values on nested fields", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        walk(data, {
            callbacks: [{
                keyFilters: ['name'], callback: (n) => {
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

    it("properly sets values on nested arrays", () => {
        const data = {
            people: [
                'Bob'
            ]
        }

        walk(data, {
            callbacks: [{
                keyFilters: ['people'], callback: (n) => {
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


    it("properly sets values on nested array values", () => {
        const data = {
            people: [
                'Bob'
            ]
        }

        walk(data, {
            callbacks: [
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

    it("sets executedCallbacks", () => {
        const data = {
            name: 'Bob'
        }

        let count = 0;
        walk(data, {
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

    it("runs until Break() when running in infinite mode", () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        let count = 0;
        walk(a, {
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

    it("runs once per node when running in graph mode", () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        let count = 0;
        walk(a, {
            graphMode: "graph",
            callbacks: [{
                callback: (n) => {
                    count++;
                }
            }]
        })

        expect(count).toEqual(2)
    })

    it("errors when circular refs are present in finiteTree mode", () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        const run = () => walk(a, {
            graphMode: "finiteTree",
            callbacks: [{
                callback: () => {
                }
            }]
        })

        expect(run).toThrowError()
    })

    it("executes in proper order when running depth first", () => {

        const data = {
            people: ['Alice'],
            pets: ['Fido'],
        }

        const preKeys: string[] = []
        const postKeys: string[] = []
        walk(data, {
            traversalMode: "depth",
            callbacks: [
                {
                    positionFilter: "preWalk",
                    callback: (n) => preKeys.push(n.getPath())
                },
                {
                    positionFilter: "postWalk",
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

    it("executes in proper order when running breadth first", () => {

        const data = {
            people: ['Alice'],
            pets: ['Fido'],
        }

        const preKeys: string[] = []
        const postKeys: string[] = []
        walk(data, {
            traversalMode: "breadth",
            callbacks: [{
                positionFilter: "preWalk",
                callback: (n) => preKeys.push(n.getPath())
            }, {
                positionFilter: "postWalk",
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

    it("only runs callbacks for filtered nodes", () => {

        const data = {
            people: ['Alice'],
            pets: ['Fido'],
        }

        let count = 0;
        walk(data, {
            callbacks: [{
                filters: [(n) => n.val === 'Fido'],
                callback: () => count++
            }]
        })

        expect(count).toEqual(1)
    })

    it("doesn't consider NaN, null, or undefined the same ref in finite tree mode", () => {

        const data = {
            a: null,
            b: null,
            c: NaN,
            d: NaN,
            e: undefined,
            f: undefined,
        }

        let count = 0;
        walk(data, {
            graphMode: 'finiteTree',
            callbacks:[{callback: () => ++count}]
        })

        expect(count).toEqual(7)
    })
})
