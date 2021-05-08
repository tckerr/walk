import {deepCopy} from "../index";

describe('deepCopy', () => {
    it("executes a proper deep copy", () => {
        const obj: any = {
            a: 1,
            b: ['bar', {'baz': null}],
            c: {
                d: 1,
                e: 'test',
                undef: undefined,
                nan: NaN,
            }
        }

        const copy: any = deepCopy(obj)

        expect(copy).toEqual(obj);
        expect(copy.a).toEqual(obj.a);
        expect(copy.b).toEqual(obj.b);
        expect(copy.b[0]).toEqual(obj.b[0]);
        expect(copy.b[1]).toEqual(obj.b[1]);
        expect(copy.b[1].baz).toEqual(obj.b[1].baz);
        expect(copy.c).toEqual(obj.c);
        expect(copy.c.d).toEqual(obj.c.d);
        expect(copy.c.e).toEqual(obj.c.e);
        expect(copy.c.undef).toEqual(obj.c.undef);
        expect(copy.c.nan).toEqual(obj.c.nan);
        expect(Object.is(obj.b, copy.b)).toBeFalsy()
        expect(Object.is(obj.b[1], copy.b[1])).toBeFalsy()
        expect(Object.is(obj.c, copy.c)).toBeFalsy()
    });
})

