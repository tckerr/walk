import {reduce} from "../utils/reduce";

describe('reduce', () => {
    it("properly accumulates a sum", () => {
        const obj: any = {
            'a': {
                'x': {
                    'y': 2
                }
            },
            'b': 1,
            'c': {
                'd': 1,
                'e': 3,
            },
        }

        const result: any = reduce(obj, 0, (acc, node) => {
            if (node.nodeType === "value" && typeof node.val === "number")
                return acc + node.val;
            return acc;
        })

        expect(result).toEqual(7);
    });
})

