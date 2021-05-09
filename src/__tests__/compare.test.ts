import {compare} from "../utils/compare";

describe('compare', () => {
    it("executes a correct comparison", () => {
        const cartA = {
            fruit: {
                organic: true,
                bananas: 1,
                other: [
                    'apples',
                    'oranges'
                ]

            }
        }

        const cartB = {
            fruit: {
                local: false,
                bananas: 2,
                other: [
                    'grapes',
                ]
            },
            vegetables: {
                peas: 1
            }
        }

        const result = compare(cartA, cartB, true)
        expect(result[0]).toEqual({
            path: '.fruit.organic',
            hasDifference: true,
            difference: 'removed',
            a: true
        })
        expect(result[1]).toEqual({
            path: '.fruit.bananas',
            hasDifference: true,
            a: 1,
            b: 2,
            difference: {before: 1, after: 2}
        })
        expect(result[2]).toEqual({
            path: '.fruit.other[0]',
            hasDifference: true,
            a: 'apples',
            b: 'grapes',
            difference: {
                before: 'apples',
                after: 'grapes',
            }
        })
        expect(result[3]).toEqual({
            path: '.fruit.other[1]',
            hasDifference: true,
            difference: 'removed',
            a: 'oranges'
        })
        expect(result[4]).toEqual({
            path: '.fruit.local',
            hasDifference: true,
            difference: 'added',
            b: false
        })
        expect(result[5]).toEqual({
            path: '.vegetables.peas',
            hasDifference: true,
            difference: 'added', b: 1
        })
    });
})

