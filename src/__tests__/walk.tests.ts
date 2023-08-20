import {walk} from "../walk";
import {Break} from "../index";
import {WalkNode} from "../node";

describe("walk", () => {
    it("README example", () => {
        const obj = {
            'a': 1,
            'b': [2, 3],
            'c': {'d': 4}
        }
        const results: any[] = [];
        walk(obj, {
            onVisit: [{
                callback: node => results.push(["obj" + node.getPath(), "=", node.val]),
                filters: node => node.val !== 1,
            }]
        })
        expect(results).toEqual([
            [`obj`, '=', {a: 1, b: [2, 3], c: {d: 4}},],
            [`obj["b"]`, '=', [2, 3],],
            [`obj["b"][0]`, '=', 2,],
            [`obj["b"][1]`, '=', 3,],
            [`obj["c"]`, '=', {d: 4},],
            [`obj["c"]["d"]`, '=', 4,],
        ])
    });

    it("works with undefined root", () => {
        let count = 0;
        walk(undefined, {
            onVisit: [{
                filters: n => typeof n.val === 'undefined',
                callback: () => ++count
            }
            ]
        })
        expect(count).toEqual(1);
    });

    it("works with NaN root", () => {
        let count = 0;
        walk(NaN, {
            onVisit: [{
                filters: n => isNaN(n.val),
                callback: () => ++count
            }
            ]
        })
        expect(count).toEqual(1);
    });

    it("works with null root", () => {
        let count = 0;
        walk(null, {
            onVisit: [{
                filters: n => n.val === null,
                callback: () => ++count
            }
            ]
        })
        expect(count).toEqual(1);
    });

    it("works with array root", () => {
        let count = 0;
        walk([0], {
            onVisit: {
                callback: (n) => count += n.nodeType === 'array' ? 1 : 0
            }
        })
        expect(count).toEqual(1);
    });

    it("ignores root callbacks", () => {
        const data = {}

        let count = 0;
        walk(data, {
            onVisit: [{callback: (n) => count++, filters: n => !n.isRoot}]
        })

        expect(count).toEqual(0);
    });

    it("ignores all callbacks", () => {
        const data = {person: {name: "Bob"}}

        let count = 0;
        walk(data, {
            onVisit: [{callback: (n) => count++, filters: () => false}]
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
            onVisit: [{
                filters: n => n.key === 'name',
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
            onVisit: [{
                callback: (n) => count += n.nodeType === 'array' ? 1 : 0
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
            onVisit: [{
                callback: (n) => count += n.nodeType === 'object' ? 1 : 0
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
            onVisit: [{
                callback: (n) => count += n.nodeType === 'value' ? 1 : 0
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
            onVisit: [{
                timing: 'both',
                filters: n => n.key === 'name',
                callback: () => count++
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
            onVisit: [
                {
                    filters: n => n.key === 'name',
                    executionOrder: 1,
                    callback: (n) => result.push('second')
                },
                {
                    filters: n => n.key === 'name',
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
    it("properly sets values on nested object", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        walk(data, {
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

    it("properly sets values on nested fields", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        walk(data, {
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

    it("properly sets values on nested arrays", () => {
        const data = {
            people: [
                'Bob'
            ]
        }

        walk(data, {
            onVisit: [{
                filters: [n => n.key === 'people'],
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


    it("properly sets values on nested array values", () => {
        const data = {
            people: [
                'Bob'
            ]
        }

        walk(data, {
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

    it("sets executedCallbacks", () => {
        const data = {
            name: 'Bob'
        }

        let count = 0;
        walk(data, {
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

    it("runs until Break() when running in infinite mode", () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        let count = 0;
        walk(a, {
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

    it("runs once per node when running in graph mode", () => {
        const a: any = {}
        const b: any = {}
        a.b = b;
        b.a = a;

        let count = 0;
        walk(a, {
            graphMode: "graph",
            onVisit: [{
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
            onVisit: [{
                callback: () => {
                }
            }]
        })

        expect(run).toThrowError()
    })

    it("executes in proper order when running depth first", () => {
        const data = {
            people: [
                {
                    name: 'Alice',
                    job: {
                        title: 'Developer',
                        salary: 100_000
                    },
                },
                {
                    name: 'Bob',
                    job: {
                        title: 'Product Manager',
                        salary: 100_000
                    },
                }
            ],
            pets: ['Fido'],
        }

        const preKeys: string[] = []
        const postKeys: string[] = []
        walk(data, {
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

        const preKeysExpected = [
            ``,
            `["people"]`,
            `["people"][0]`,
            `["people"][0]["name"]`,
            `["people"][0]["job"]`,
            `["people"][0]["job"]["title"]`,
            `["people"][0]["job"]["salary"]`,
            `["people"][1]`,
            `["people"][1]["name"]`,
            `["people"][1]["job"]`,
            `["people"][1]["job"]["title"]`,
            `["people"][1]["job"]["salary"]`,
            `["pets"]`,
            `["pets"][0]`,
        ]

        const postKeysExpected = [
            `["people"][0]["name"]`,
            `["people"][0]["job"]["title"]`,
            `["people"][0]["job"]["salary"]`,
            `["people"][0]["job"]`,
            `["people"][0]`,
            `["people"][1]["name"]`,
            `["people"][1]["job"]["title"]`,
            `["people"][1]["job"]["salary"]`,
            `["people"][1]["job"]`,
            `["people"][1]`,
            `["people"]`,
            `["pets"][0]`,
            `["pets"]`,
            ``,
        ]

        expect(preKeys).toEqual(preKeysExpected);
        expect(postKeys).toEqual(postKeysExpected);
    })

    it("executes in proper order when running breadth first", () => {
        const data = {
            people: [
                {
                    name: 'Alice',
                    job: {
                        title: 'Developer',
                        salary: 100_000
                    },
                },
                {
                    name: 'Bob',
                    job: {
                        title: 'Product Manager',
                        salary: 100_000
                    },
                }
            ],
            pets: ['Fido'],
        }

        const preKeys: string[] = []
        const postKeys: string[] = []
        walk(data, {
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

        const keys = [
            ``,
            `["people"]`,
            `["pets"]`,
            `["people"][0]`,
            `["people"][1]`,
            `["pets"][0]`,
            `["people"][0]["name"]`,
            `["people"][0]["job"]`,
            `["people"][1]["name"]`,
            `["people"][1]["job"]`,
            `["people"][0]["job"]["title"]`,
            `["people"][0]["job"]["salary"]`,
            `["people"][1]["job"]["title"]`,
            `["people"][1]["job"]["salary"]`,
        ];
        expect(preKeys).toEqual(keys)
        expect(postKeys).toEqual(keys)
    })

    it("only runs callbacks for filtered nodes", () => {

        const data = {
            people: ['Alice'],
            pets: ['Fido'],
        }

        let count = 0;
        walk(data, {
            onVisit: [{
                filters: n => n.val === 'Fido',
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
            onVisit: [{callback: () => ++count}]
        })

        expect(count).toEqual(7)
    })
})
